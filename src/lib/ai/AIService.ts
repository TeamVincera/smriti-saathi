/**
 * AIService
 * Central Groq API integration for online AI intelligence with complete offline fault isolation.
 * Handles Chatbot, Adaptive Game Selection, Caretaker Summaries, and Question Assistance.
 */

import { requestAiChat } from './proxyClient'
import { isAIAvailable } from './availability'
import { PatientContextBuilder, type MinimalPatientContext } from './PatientContextBuilder'
import type { SessionRecord } from '../types'
import type { GameDef } from '../games'
import { buildDigest } from '../sathi'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AdaptiveGameRecommendation {
  gameId: string
  difficulty: number
  reason: string
  domain: string
  isOnlineAI: boolean
}

export interface CaretakerSummaryResponse {
  headline: string
  strengths: string[]
  observations: string[]
  routineAdherenceNote: string
  suggestedFocus: string
  isOnlineAI: boolean
}

export interface DynamicQuestionResponse {
  questionId: string
  prompt: string
  options?: string[]
  correctAnswer: string | number
  feedback: string
  culturalNote?: string
}

const MAX_SUMMARY_TEXT_LENGTH = 280
const UNSAFE_SUMMARY_CONTENT = /(?:ignore\s+(?:all\s+)?previous|system\s+prompt|<script|diagnos(?:e|is|ed)|(?:start|stop|change|increase|decrease|double|skip|take)\b.{0,80}\b(?:medicine|medication|tablet|dose|drug)|\b(?:medicine|medication|tablet|dose|drug)\b.{0,80}\b(?:start|stop|change|increase|decrease|double|skip|take)\b|\b(?:treat|cure|prescribe)\b.{0,80}\b(?:disease|condition|symptom|illness)\b)/i

function sanitizeSummaryText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_SUMMARY_TEXT_LENGTH)
  if (!normalized || UNSAFE_SUMMARY_CONTENT.test(normalized)) return null
  return normalized
}

function sanitizeSummaryList(value: unknown, fallback: string[]): { value: string[]; usedFallback: boolean } {
  if (!Array.isArray(value)) return { value: fallback, usedFallback: true }
  const sanitized = value
    .map((item) => sanitizeSummaryText(item))
    .filter((item): item is string => Boolean(item))
    .slice(0, 4)
  return sanitized.length > 0
    ? { value: sanitized, usedFallback: sanitized.length !== value.length }
    : { value: fallback, usedFallback: true }
}

class AIServiceClass {
  private primaryModel = 'groq/compound-mini'
  private fastModel = 'groq/compound-mini'
  private fallbackModel = 'openai/gpt-oss-120b'
  private recentFallbackResponses: string[] = []

  /**
   * Dementia-Friendly AI Chatbot
   */
  public async chat(
    messages: { role: 'user' | 'assistant'; content: string }[],
    context?: MinimalPatientContext
  ): Promise<string> {
    const lang = context?.language || 'en'
    const latestUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content || ''
    const systemPrompt = context
      ? PatientContextBuilder.toSystemPrompt(context, latestUserMsg)
      : `You are Sathi, a warm, patient, and culturally respectful companion for an older adult.

Answer the user's actual question first. For ordinary everyday questions, give one practical, concrete answer and one optional next step. Use gender-neutral wording and keep spoken answers to 2–4 short sentences. If information is missing, say you are not sure and ask one clear follow-up question. Never invent facts.

Do not diagnose, interpret symptoms as a condition, or recommend treatment. Do not advise starting, stopping, or changing a medicine or dose; suggest a clinician or pharmacist. For emergency symptoms or immediate danger, tell the user to call local emergency services now and alert a caregiver. You may provide general education, comfort, and routine suggestions.`

    const fullMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-6),
    ]

    try {
      // Availability is authoritative here. WKWebView can report
      // navigator.onLine=false while the configured LAN/cloud proxy is
      // reachable, which would otherwise force every chat into canned text.
      if (isAIAvailable()) {
        const response = await this.callGroq(fullMessages, { model: this.fastModel, temperature: 0.6, maxTokens: 250 })
        if (response) return response
      }
    } catch (error) {
      console.error('[AIService] chat API failed:', error)
    }
    return this.getLocalChatFallback(lang, context?.name, latestUserMsg, context)
  }

  public isChatOnline(): boolean {
    return isAIAvailable()
  }

  public getModelName(): string {
    return this.isChatOnline() ? this.fastModel : 'local-fallback'
  }

  /**
   * Online Adaptive Game Selection using Groq
   * Validates structured output schema and falls back if output is malformed.
   */
  public async recommendAdaptiveGame(
    sessions: SessionRecord[],
    candidateGames: GameDef[],
    context?: MinimalPatientContext
  ): Promise<AdaptiveGameRecommendation | null> {
    if (!candidateGames.length) return null

    if (!isAIAvailable()) {
      return null // Signal to use offline LinUCB engine
    }

    const candidateIds = candidateGames.map((g) => ({ id: g.id, name: g.name, domain: g.domain }))
    const recentScores = sessions.slice(-5).map((s) => ({
      gameId: s.gameId,
      accuracy: Math.round(s.accuracy * 100),
      hesitations: s.hesitations,
      frustration: Math.round(s.frustrationIndex * 100),
    }))

    const prompt = `You are an adaptive cognitive training engine for elderly individuals.
Choose the best next activity for the patient from the AVAILABLE GAMES list based on their recent performance.

AVAILABLE GAMES:
${JSON.stringify(candidateIds)}

RECENT SESSIONS HISTORY:
${JSON.stringify(recentScores)}

PATIENT CONTEXT:
- Stage: ${context?.dementiaStage || 'mild'}
- Preferred Language: ${context?.language || 'en'}

RULES:
1. Choose ONE gameId from AVAILABLE GAMES only.
2. Select difficulty 0 (gentle) or 1 (moderate).
3. If recent frustration > 40%, choose a gentle reminiscence or familiar game.
4. Output STRICT JSON format matching:
{
  "gameId": "string",
  "difficulty": 0 or 1,
  "domain": "string",
  "reason": "short explanation (under 15 words)"
}`

    try {
      const res = await this.callGroq(
        [
          { role: 'system', content: 'You output valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        { model: this.fastModel, temperature: 0.3, maxTokens: 200, responseFormat: 'json_object' }
      )

      if (!res) return null
      const parsed = JSON.parse(res)

      if (parsed && typeof parsed.gameId === 'string' && candidateGames.some((g) => g.id === parsed.gameId)) {
        return {
          gameId: parsed.gameId,
          difficulty: parsed.difficulty === 1 ? 1 : 0,
          domain: parsed.domain || 'Cognitive Engagement',
          reason: parsed.reason || 'Personalized adaptive choice',
          isOnlineAI: true,
        }
      }
      return null
    } catch {
      return null
    }
  }

  /**
   * Caretaker Summary Generation
   */
  public async generateCaretakerSummary(params: {
    sessions: SessionRecord[]
    adherencePct: number | null
    medCount: number
    context?: MinimalPatientContext
  }): Promise<CaretakerSummaryResponse> {
    const { sessions, adherencePct, medCount, context } = params

    // Local fallback if offline or Groq fails
    const localDigest = buildDigest(sessions, adherencePct ?? 0).filter((note) => adherencePct !== null || !/medicin|medicine/i.test(note.text))
    const adherenceObservation = adherencePct === null
      ? 'No medication records are available yet.'
      : `Medicine schedule adherence is currently at ${Math.round(adherencePct)}%.`
    const localFallback: CaretakerSummaryResponse = {
      headline: sessions.length > 0 ? 'Steady Cognitive Engagement This Week' : 'Beginning Gentle Routine',
      strengths: localDigest.map((d) => d.text).slice(0, 3),
      observations: [
        adherenceObservation,
        `Completed ${sessions.length} cognitive activity sessions to date.`,
      ],
      routineAdherenceNote: adherencePct === null
        ? `No medication records are available yet. Caregiver tracking ${medCount} active medicines and scheduled reminders.`
        : `Caregiver tracking ${medCount} active medicines and scheduled reminders.`,
      suggestedFocus: 'Continue daily morning sessions with gentle encouragement.',
      isOnlineAI: false,
    }

    if (!isAIAvailable()) {
      return localFallback
    }

    const sessionSummary = sessions.slice(-10).map((s) => ({
      game: s.gameName,
      accuracy: Math.round(s.accuracy * 100),
      latencySec: Math.round(s.avgLatencyMs / 1000),
      hesitations: s.hesitations,
      frustrationScore: Math.round(s.frustrationIndex * 100),
    }))

    const prompt = `Generate a non-diagnostic, respectful summary for a family caregiver of an elderly relative with mild memory impairment in North-Eastern India.

PERFORMANCE DATA:
- Total sessions: ${sessions.length}
- Recent sessions: ${JSON.stringify(sessionSummary)}
- Medication adherence rate: ${adherencePct === null ? 'No medication records are available yet.' : `${Math.round(adherencePct)}%`}
- Patient name: ${context?.name || 'Patient'}

STRICT RULES:
1. DO NOT diagnose or claim to treat dementia or medical conditions.
2. Use cautious, uplifting, and clear language.
3. Respond in STRICT JSON matching:
{
  "headline": "string (e.g. Bright Focus in Morning Activities)",
  "strengths": ["string", "string"],
  "observations": ["string", "string"],
  "routineAdherenceNote": "string",
  "suggestedFocus": "string"
}`

    try {
      const res = await this.callGroq(
        [
          { role: 'system', content: 'You output valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        { model: this.primaryModel, temperature: 0.4, maxTokens: 450, responseFormat: 'json_object' }
      )

      if (!res) return localFallback
      const parsed = JSON.parse(res)

      if (parsed && typeof parsed === 'object') {
        const headline = sanitizeSummaryText(parsed.headline)
        const strengths = sanitizeSummaryList(parsed.strengths, localFallback.strengths)
        const observations = sanitizeSummaryList(parsed.observations, localFallback.observations)
        const routineAdherenceNote = sanitizeSummaryText(parsed.routineAdherenceNote)
        const suggestedFocus = sanitizeSummaryText(parsed.suggestedFocus)
        if (!headline || !routineAdherenceNote || !suggestedFocus || strengths.usedFallback || observations.usedFallback) {
          return localFallback
        }
        return {
          headline,
          strengths: strengths.value,
          observations: observations.value,
          routineAdherenceNote,
          suggestedFocus,
          isOnlineAI: true,
        }
      }
      return localFallback
    } catch {
      return localFallback
    }
  }

  /**
   * Low-level AI proxy caller with a bounded timeout and fault isolation.
   */
  private async callGroq(
    messages: ChatMessage[],
    opts: { model?: string; temperature?: number; maxTokens?: number; responseFormat?: 'json_object' } = {}
  ): Promise<string | null> {
    const model = opts.model || (opts.responseFormat === 'json_object' ? this.primaryModel : this.fastModel)
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
    const timeoutId = controller ? setTimeout(() => controller.abort(), 8000) : null
    try {
      const text = await requestAiChat({
        messages,
        model,
        temperature: opts.temperature ?? 0.5,
        maxTokens: opts.maxTokens ?? 300,
        ...(opts.responseFormat === 'json_object' ? { responseFormat: 'json_object' as const } : {}),
        signal: controller?.signal,
      })
      return text?.trim() || null
    } catch (err) {
      console.warn('[AIService] AI proxy call failed:', err)
      return null
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }

  /**
   * Safe, dementia-friendly and intent-aware local chat fallback
   */
  public getLocalChatFallback(
    lang: string,
    name?: string,
    latestUserMessage?: string,
    context?: MinimalPatientContext
  ): string {
    const displayName = name ? `${name} ji` : ''
    const msg = (latestUserMessage || '').toLowerCase()

    // Safety routing must run before ordinary medication or appointment keywords.
    if (this.isEmergencyRequest(msg)) {
      return this.localizeSafetyResponse(lang, 'emergency')
    }
    if (this.isMedicationChangeRequest(msg)) {
      return this.localizeSafetyResponse(lang, 'medication')
    }
    if (this.isDiagnosisRequest(msg)) {
      return this.localizeSafetyResponse(lang, 'diagnosis')
    }

    // 1. Doctor & clinic appointments
    if (
      msg.includes('appointment') ||
      msg.includes('doctor') ||
      msg.includes('hospital') ||
      msg.includes('clinic') ||
      msg.includes('checkup') ||
      msg.includes('visit') ||
      msg.includes('अपॉइंटमेंट') ||
      msg.includes('डॉक्टर') ||
      msg.includes('अस्पताल') ||
      msg.includes('सাক্ষাৎ') ||
      msg.includes('ডাক্তাৰ') ||
      msg.includes('ডাক্তার')
    ) {
      if (context?.upcomingAppointments && context.upcomingAppointments.length > 0) {
        const nextAppt = context.upcomingAppointments[0]
        const docText = nextAppt.doctorName ? ` with ${nextAppt.doctorName}` : ''
        const docTextHi = nextAppt.doctorName ? ` (${nextAppt.doctorName})` : ''
        if (lang === 'hi') {
          return `आपका अगला अपॉइंटमेंट: ${nextAppt.title}, ${nextAppt.date} को ${nextAppt.time} बजे${docTextHi}। 🩺`
        }
        if (lang === 'as') {
          return `আপোনাৰ পৰৱৰ্তী সাক্ষাৎ: ${nextAppt.title}, ${nextAppt.date} তাৰিখে ${nextAppt.time} বজাত${docTextHi}। 🩺`
        }
        if (lang === 'bn') {
          return `আপনার পরবর্তী অ্যাপয়েন্টমেন্ট: ${nextAppt.title}, ${nextAppt.date} তারিখে ${nextAppt.time} সময়ে${docTextHi}। 🩺`
        }
        return `Your upcoming appointment: ${nextAppt.title} on ${nextAppt.date} at ${nextAppt.time}${docText}. 🩺`
      }

      if (lang === 'hi') {
        return `फिलहाल आपका कोई नया डॉक्टर अपॉइंटमेंट नहीं है। आप आराम से विश्राम कर सकते हैं। 🩺`
      }
      if (lang === 'as') {
        return `বৰ্তমান কোনো ডাক্তৰৰ সাক্ষাৎৰ সময় নাই। 🩺`
      }
      if (lang === 'bn') {
        return `বর্তমানে কোনো ডাক্তারের অ্যাপয়েন্টমেন্ট নেই। 🩺`
      }
      return `You have no upcoming doctor appointments scheduled at this time. 🩺`
    }

    // 2. Recommendations & game history
    if (
      msg.includes('recommend') ||
      msg.includes('history') ||
      msg.includes('score') ||
      msg.includes('progress') ||
      msg.includes('performance') ||
      msg.includes('सिफारिश') ||
      msg.includes('सिफ़ारिश') ||
      msg.includes('इतिहास') ||
      msg.includes('प्रगति') ||
      msg.includes('পৰামৰ্শ') ||
      msg.includes('ইতিহাস') ||
      msg.includes('সুপারিশ')
    ) {
      if (context?.recommendationHistory && context.recommendationHistory.length > 0) {
        const recList = context.recommendationHistory
          .slice(0, 3)
          .map((r) => `${r.gameName} (${r.accuracyPct}% score)`)
          .join(', ')
        const recListHi = context.recommendationHistory
          .slice(0, 3)
          .map((r) => `${r.gameName} (${r.accuracyPct}% स्कोर)`)
          .join(', ')

        if (lang === 'hi') {
          return `आपकी हाल की खेल गतिविधियों का इतिहास: ${recListHi}। आप बहुत अच्छा कर रहे हैं! 🧩`
        }
        if (lang === 'as') {
          return `আপোনাৰ শেহতীয়া খেলসমূহৰ ইতিহাস: ${recList}। আপুনি খুব ভাল প্ৰদৰ্শন কৰিছে! 🧩`
        }
        if (lang === 'bn') {
          return `আপনার সাম্প্রতিক খেলাগুলির ইতিহাস: ${recList}। আপনার খেলা খুব সুন্দর হচ্ছে! 🧩`
        }
        return `Your recent recommendation history includes: ${recList}. You are doing wonderful practice! 🧩`
      }
    }

    // 3. Medication & Log inquiries
    if (
      msg.includes('dawai') ||
      msg.includes('dawa') ||
      msg.includes('medicine') ||
      msg.includes('tablet') ||
      msg.includes('dose') ||
      msg.includes('log') ||
      msg.includes('take') ||
      msg.includes('took') ||
      msg.includes('दवा') ||
      msg.includes('दवाई') ||
      msg.includes('औषध') ||
      msg.includes('दर्ज') ||
      msg.includes('ली') ||
      msg.includes('দৱা') ||
      msg.includes('ঔষধ') ||
      msg.includes('দৰব') ||
      msg.includes('লৈছে') ||
      msg.includes('খেয়ে')
    ) {
      if (context?.loggedMedsToday && context.loggedMedsToday.length > 0) {
        const loggedNames = context.loggedMedsToday.map((m) => `${m.medName} (${m.loggedAt})`).join(', ')
        if (lang === 'hi') {
          return `आज आपके दवा रिकॉर्ड में ये प्रविष्टियां दर्ज हैं: ${loggedNames}। किसी बदलाव के लिए डॉक्टर या फार्मासिस्ट से पूछें। 🌿`
        }
        if (lang === 'as') {
          return `আজি আপোনাৰ ঔষধৰ ৰেকৰ্ডত এই প্ৰৱেশসমূহ সংৰক্ষিত আছে: ${loggedNames}। কোনো পৰিৱৰ্তনৰ বাবে চিকিৎসক বা ফাৰ্মাচিষ্টক সুধিব। 🌿`
        }
        if (lang === 'bn') {
          return `আজ আপনার ওষুধের রেকর্ডে এই তথ্যগুলি নথিভুক্ত আছে: ${loggedNames}। কোনো পরিবর্তনের আগে চিকিৎসক বা ফার্মাসিস্টকে জিজ্ঞেস করুন। 🌿`
        }
        return `Your medicine record has these entries: ${loggedNames}. Ask a clinician or pharmacist before making any change. 🌿`
      }

      if (context?.todayMeds && context.todayMeds.length > 0) {
        const sched = context.todayMeds.map((m) => `${m.name} at ${m.time}`).join(', ')
        if (lang === 'hi') {
          return `आज अभी तक कोई दवा दर्ज नहीं हुई है। आज की निर्धारित दवाएं हैं: ${sched}। 🌿`
        }
        if (lang === 'as') {
          return `আজিৰ বাবে এতিয়ালৈকে কোনো ঔষধ লোৱা বুলি নথিভুক্ত হোৱা নাই। আজিৰ ঔষধৰ সময়: ${sched}। 🌿`
        }
        if (lang === 'bn') {
          return `আজকের জন্য এখনো কোনো ওষুধ রেকর্ড করা হয়নি। আজকের নির্ধারিত ওষুধ: ${sched}। 🌿`
        }
        return `No medicine activity has been recorded yet today. Today's schedule shows: ${sched}. Please ask a clinician or pharmacist about any change. 🌿`
      }

      if (lang === 'hi') {
        return `आपकी दवाओं का समय आपकी दवा सूची में सुरक्षित है। क्या आप चाहते हैं कि हम आज की दवाएं देखें? 🌿`
      }
      if (lang === 'as') {
        return `আপোনাৰ ঔষধৰ তালিকা সংৰক্ষিত আছে। আহক আমি আজিৰ ঔষধৰ সময় পৰীক্ষা কৰোঁ। 🌿`
      }
      if (lang === 'bn') {
        return `আপনার ওষুধের সময়সূচী সংরক্ষিত আছে। আসুন আমরা আজকের ওষুধগুলি দেখি। 🌿`
      }
      return `Your medication schedule is saved right here in your reminders. Would you like to check your medicine tab together? 🌿`
    }

    // 4. Games and mental activity inquiries
    if (
      msg.includes('khel') ||
      msg.includes('game') ||
      msg.includes('play') ||
      msg.includes('puzzle') ||
      msg.includes('खेल') ||
      msg.includes('खेळ') ||
      msg.includes('খেলা') ||
      msg.includes('খেল')
    ) {
      if (lang === 'hi') {
        return `आज के लिए हमारे पास कई सुंदर खेल तैयार हैं! चलिए एक सुखद और हल्का खेल खेलते हैं। 🧩`
      }
      if (lang === 'as') {
        return `আজিৰ বাবে আনন্দদায়ক খেল সাজু আছে! আহক অলপ সময় মনটো সতেজ কৰিবলৈ খেলো। 🧩`
      }
      if (lang === 'bn') {
        return `আজকের জন্য সুন্দর সব খেলা প্রস্তুত আছে! আসুন একসঙ্গে একটি খেলা শুরু করি। 🧩`
      }
      return `We have delightful cognitive games ready for you today! Would you like to play today's game together? 🧩`
    }

    // 5. Time, schedule and routine inquiries
    if (
      msg.includes('samay') ||
      msg.includes('time') ||
      msg.includes('schedule') ||
      msg.includes('aaj') ||
      msg.includes('today') ||
      msg.includes('routine') ||
      msg.includes('समय') ||
      msg.includes('आज') ||
      msg.includes('दिनचर्या') ||
      msg.includes('समय') ||
      msg.includes('সময়') ||
      msg.includes('দিন') ||
      msg.includes('সময়সূচী')
    ) {
      if (context?.schedule) {
        const routineItems = [
          context.schedule.wake ? `Wake: ${context.schedule.wake}` : '',
          context.schedule.breakfast ? `Breakfast: ${context.schedule.breakfast}` : '',
          context.schedule.lunch ? `Lunch: ${context.schedule.lunch}` : '',
          context.schedule.dinner ? `Dinner: ${context.schedule.dinner}` : '',
        ].filter(Boolean)

        const routineItemsHi = [
          context.schedule.wake ? `जागना: ${context.schedule.wake}` : '',
          context.schedule.breakfast ? `नाश्ता: ${context.schedule.breakfast}` : '',
          context.schedule.lunch ? `दोपहर का भोजन: ${context.schedule.lunch}` : '',
          context.schedule.dinner ? `रात का खाना: ${context.schedule.dinner}` : '',
        ].filter(Boolean)

        if (routineItems.length > 0) {
          if (lang === 'hi') {
            return `आज की आपकी दिनचर्या: ${routineItemsHi.join(', ')}। आराम से अपना दिन बिताएं। ☀️`
          }
          if (lang === 'as') {
            return `আজি আপোনাৰ দিনচৰ্যা: ${routineItems.join(', ')}। শান্তভাৱে দিনটো উপভোগ কৰক। ☀️`
          }
          if (lang === 'bn') {
            return `আজকের আপনার দিনলিপি: ${routineItems.join(', ')}। শান্তিতে সারাদিন কাটান। ☀️`
          }
          return `Here is your schedule for today: ${routineItems.join(', ')}. Take your time throughout the day. ☀️`
        }
      }

      if (lang === 'hi') {
        return `आज का दिन बहुत शांत और सुखद है। आप अपने दिनचर्या के कार्य और समय यहाँ देख सकते हैं। ☀️`
      }
      if (lang === 'as') {
        return `আজিৰ দিনটো অতি শান্ত আৰু শুভ। আপোনাৰ দৈনন্দিন কামৰ সময় ইয়াত উপলব্ধ। ☀️`
      }
      if (lang === 'bn') {
        return `আজকের দিনটি খুব শান্ত ও মনোরম। আপনার সারাদিনের সময়সূচী এখানে রয়েছে। ☀️`
      }
      return `Today is a calm and pleasant day. You can view your schedule and daily routines anytime right here. ☀️`
    }

    // 6. Greetings
    if (
      /(?:^|\s)(?:namaste|hello|hi|morning|pranam)(?:\s|$)/.test(msg) ||
      msg.includes('नमस्ते') ||
      msg.includes('प्रणाम') ||
      msg.includes('নমস্কাৰ') ||
      msg.includes('নমস্কার')
    ) {
      if (lang === 'hi') {
        return `नमस्ते ${displayName || ''}! आपका दिन मंगलमय और सुखद हो। मैं हमेशा आपके साथ हूँ। 🌸`
      }
      if (lang === 'as') {
        return `নমস্কাৰ ${displayName || ''}! আপোনাৰ দিনটো শুভ হওক। মই সদায় আপোনাৰ কাষতেই আছোঁ। 🌸`
      }
      if (lang === 'bn') {
        return `নমস্কার ${displayName || ''}! আপনার দিনটি খুব সুন্দর কাটুক। আমি সবসময় আপনার পাশেই আছি। 🌸`
      }
      return `Hello ${displayName || 'there'}! Wishing you a gentle, peaceful day. I am always right here by your side. 🌸`
    }

    // 7. Practical everyday guidance that remains useful without a network.
    if (/(cook|cooking|recipe|food|meal|খাবাৰ|রান্না|खाना|पकवान)/.test(msg)) {
      return this.rememberFallback(lang === 'hi'
        ? 'एक सरल भोजन चुनें: दाल, चावल या खिचड़ी के साथ पानी रखें। धीरे-धीरे पकाएं और जरूरत हो तो किसी भरोसेमंद व्यक्ति से मदद लें।'
        : lang === 'bn'
        ? 'একটি সহজ খাবার বেছে নিন—ডাল, ভাত বা খিচুড়ি। পাশে জল রাখুন, ধীরে রান্না করুন, আর দরকার হলে বিশ্বাসের কাউকে সাহায্য করতে বলুন।'
        : lang === 'as'
        ? 'এটা এটা সহজ আহাৰ বাছক—দাইল, ভাত বা খিচিৰি। কাষত পানী ৰাখক, লাহে লাহে ৰান্ধক, আৰু প্ৰয়োজন হলে বিশ্বাসৰ মানুহৰ সহায় লওক।'
        : 'Choose a simple meal such as rice, dal, or khichdi. Keep water nearby, cook slowly, and ask a trusted person for help if needed.', name)
    }
    if (/(weather|rain|temperature|বতৰ|আবহাওয়া|मौसम)/.test(msg)) {
      return this.rememberFallback(lang === 'hi'
        ? 'मेरे पास अभी लाइव मौसम की जानकारी नहीं है। बाहर जाने से पहले स्थानीय मौसम सेवा या किसी भरोसेमंद व्यक्ति से पूछ लें।'
        : lang === 'bn'
        ? 'আমার কাছে এখন লাইভ আবহাওয়ার তথ্য নেই। বাইরে যাওয়ার আগে স্থানীয় আবহাওয়া সেবা বা বিশ্বাসের কাউকে জিজ্ঞেস করুন।'
        : lang === 'as'
        ? 'মোৰ ওচৰত এতিয়া লাইভ বতৰৰ তথ্য নাই। বাহিৰলৈ যোৱাৰ আগতে স্থানীয় বতৰ সেৱা বা বিশ্বাসৰ মানুহক সুধক।'
        : 'I do not have live weather information right now. Before going out, check a local weather service or ask someone you trust.', name)
    }
    if (/(lonely|sad|worried|anxious|tired|মন খাৰাপ|একাকী|उदास|चिंता)/.test(msg)) {
      return this.rememberFallback(lang === 'hi'
        ? 'आप अकेले नहीं हैं। धीरे सांस लें, किसी भरोसेमंद व्यक्ति को फोन करें, और आज का एक छोटा आरामदायक काम चुनें।'
        : lang === 'bn'
        ? 'আপনি একা নন। ধীরে শ্বাস নিন, বিশ্বাসের কাউকে ফোন করুন, আর আজ একটি ছোট আরামদায়ক কাজ বেছে নিন।'
        : lang === 'as'
        ? 'আপুনি অকলশৰীয়া নহয়। লাহে লাহে উশাহ লওক, বিশ্বাসৰ মানুহক ফোন কৰক, আৰু আজি এটা সৰু আৰামদায়ক কাম বাছক।'
        : 'You are not alone. Take a slow breath, call someone you trust, and choose one small, comforting activity for today.', name)
    }

    // 8. Varied non-repetitive dementia-friendly responses
    const responsesEn = [
      `Hello ${displayName || 'there'}! I am right here with you. Would you like to play today's game, view your schedule, or check your medicines?`,
      `I am listening, ${displayName || 'friend'}. We can take our time and do something relaxing together today.`,
      `You are doing wonderfully today. Take a gentle breath, and let me know how I can help you right now.`,
    ]
    const responsesHi = [
      `नमस्ते ${displayName || ''}! मैं आपके साथ हूँ। आज का खेल खेलने या दिनचर्या देखने के लिए तैयार हैं?`,
      `मैं आपकी बात सुन रहा हूँ। चलिए आराम से आज का दिन बिताते हैं और कोई सुंदर काम करते हैं।`,
      `आप बहुत अच्छा कर रहे हैं। थोड़ा विश्राम करें, मैं हमेशा आपके साथ हूँ।`,
    ]
    const responsesAs = [
      `নমস্কাৰ ${displayName || ''}! মই আপোনাৰ লগত আছোঁ। আহক আজিৰ খেল খেলি বা দিনৰ কাম চাই আনন্দ কৰোঁ!`,
      `মই আপোনাৰ কথা শুনি আছোঁ। আহক শান্তভাৱে আজিৰ দিনটো অতিবাহিত কৰোঁ।`,
    ]
    const responsesBn = [
      `নমস্কার ${displayName || ''}! আমি আপনার সাথে আছি। আজকের খেলাটি খেলতে বা সময়সূচী দেখতে চান?`,
      `আমি আপনার কথা শুনছি। আসুন শান্তভাবে আজকের দিনটি উপভোগ করি।`,
    ]
    const responsesMni = [
      `ꯈꯨꯔꯨꯝꯖꯔꯤ! ꯑꯩꯍꯥꯛ ꯅꯈꯣꯏꯒ ꯂꯣꯏꯅꯅ ꯂꯩꯔꯤ। ꯉꯁꯤꯒꯤ ꯁꯥꯟꯅꯄꯣꯠ ꯁꯥꯟꯅꯔꯁꯤ!`,
    ]

    const pool =
      lang === 'hi'
        ? responsesHi
        : lang === 'as'
        ? responsesAs
        : lang === 'bn'
        ? responsesBn
        : lang === 'mni'
        ? responsesMni
        : responsesEn
    return this.rememberFallback(pool[0], name, pool)
  }

  private rememberFallback(response: string, name?: string, alternatives: string[] = [response]): string {
    const available = alternatives.filter((candidate) => !this.recentFallbackResponses.includes(candidate))
    const selected = available[0] || alternatives[0] || response
    this.recentFallbackResponses = [...this.recentFallbackResponses.slice(-2), selected]
    return selected
  }

  private isEmergencyRequest(message: string): boolean {
    return /(chest pain|can't breathe|cannot breathe|trouble breathing|severe bleeding|severe confusion|serious fall|bad fall|unconscious|overdose|poison|stroke|suicide|kill myself|hurt myself|self harm|self-harm|आत्महत्या|जहर|सांस नहीं|छाती में दर्द|বুকৰ বিষ|বিষ খোৱা|শ্বাস ল’ব নোৱাৰি)/i.test(message)
  }

  private isMedicationChangeRequest(message: string): boolean {
    return /(can i take|should i take|is it safe to take|(change|stop|stopping|start|increase|decrease|skip|double|extra|adjust).{0,30}(medicine|medication|tablet|dose|dawai|dawa)|\b(?:stop|change|increase|decrease|skip|double)\s+(?:my\s+)?(?:medicine|medication|tablet|dose)|दवा.*(बंद|बदल|बढ़ा|घटा)|औषध.*(বন্ধ|বদল|বঢ়া|কম))/i.test(message)
  }

  private isDiagnosisRequest(message: string): boolean {
    return /(do i have|am i having|what disease|what condition|diagnos|is this (dementia|a stroke|an infection|serious)|symptom.{0,20}(mean|disease|condition)|क्या मुझे.*(बीमारी|रोग)|कौन सी बीमारी|লক্ষণ.*মানে|কি ৰোগ)/i.test(message)
  }

  private localizeSafetyResponse(lang: string, kind: 'emergency' | 'medication' | 'diagnosis'): string {
    if (lang === 'hi') {
      if (kind === 'emergency') return 'यह आपात स्थिति हो सकती है। अभी स्थानीय आपातकालीन सेवा को फोन करें और किसी देखभाल करने वाले को बताएं। मैं यहां इसकी जांच या समस्या का समाधान नहीं कर सकता।'
      if (kind === 'medication') return 'मैं दवा शुरू करने, रोकने या मात्रा बदलने की सलाह नहीं दे सकता। कृपया डॉक्टर या फार्मासिस्ट से बात करें।'
      return 'मैं बीमारी का निदान नहीं कर सकता। कृपया अपने लक्षण डॉक्टर को बताएं; मैं आपके लिए सवाल तैयार करने में मदद कर सकता हूँ।'
    }
    if (lang === 'bn') {
      if (kind === 'emergency') return 'এটি জরুরি অবস্থা হতে পারে। এখনই স্থানীয় জরুরি পরিষেবায় ফোন করুন এবং একজন পরিচর্যাকারীকে জানান। আমি এখানে এটি পরীক্ষা বা সমাধান করতে পারি না।'
      if (kind === 'medication') return 'আমি ওষুধ শুরু, বন্ধ বা মাত্রা বদলানোর পরামর্শ দিতে পারি না। অনুগ্রহ করে চিকিৎসক বা ফার্মাসিস্টের সঙ্গে কথা বলুন।'
      return 'আমি রোগ নির্ণয় করতে পারি না। আপনার লক্ষণ চিকিৎসককে বলুন; চাইলে আমি প্রশ্ন প্রস্তুত করতে সাহায্য করতে পারি।'
    }
    if (lang === 'as') {
      if (kind === 'emergency') return 'এইটো জৰুৰী অৱস্থা হ’ব পাৰে। এতিয়াই স্থানীয় জৰুৰী সেৱালৈ ফোন কৰক আৰু এজন যত্ন লোৱা মানুহক জনাওক। মই ইয়াত পৰীক্ষা বা সমাধান কৰিব নোৱাৰোঁ।'
      if (kind === 'medication') return 'মই ঔষধ আৰম্ভ, বন্ধ বা মাত্ৰা সলনি কৰাৰ পৰামৰ্শ দিব নোৱাৰোঁ। অনুগ্ৰহ কৰি চিকিৎসক বা ফাৰ্মাচিষ্টৰ সৈতে কথা পাতক।'
      return 'মই ৰোগ নিৰ্ণয় কৰিব নোৱাৰোঁ। আপোনাৰ লক্ষণ চিকিৎসকক কওক; মই প্ৰশ্ন সাজু কৰাত সহায় কৰিব পাৰোঁ।'
    }
    if (kind === 'emergency') return 'This may be an emergency. Call local emergency services now and alert a caregiver. I cannot assess or troubleshoot this here.'
    if (kind === 'medication') return 'I cannot advise starting, stopping, or changing a medicine or dose. Please speak with a clinician or pharmacist.'
    return 'I cannot diagnose an illness. Please tell a clinician about your symptoms; I can help you prepare questions.'
  }
}

export const AIService = new AIServiceClass()
