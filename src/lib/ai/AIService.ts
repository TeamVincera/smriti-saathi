/**
 * AIService
 * Central Groq API integration for online AI intelligence with complete offline fault isolation.
 * Handles Chatbot, Adaptive Game Selection, Caretaker Summaries, and Question Assistance.
 */

import { ENV_CONFIG } from '../config'
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

class AIServiceClass {
  private primaryModel = 'openai/gpt-oss-120b'
  private fastModel = 'openai/gpt-oss-20b'
  private fallbackModel = 'qwen/qwen3.6-27b'

  /**
   * Dementia-Friendly AI Chatbot
   */
  public async chat(
    messages: { role: 'user' | 'assistant'; content: string }[],
    context?: MinimalPatientContext
  ): Promise<string> {
    const lang = context?.language || 'en'

    if (!ENV_CONFIG.isGroqConfigured || !ENV_CONFIG.isOnline) {
      return this.getLocalChatFallback(lang, context?.name)
    }

    const systemPrompt = context
      ? PatientContextBuilder.toSystemPrompt(context)
      : `You are Sathi, a warm, caring dementia cognitive companion in North-Eastern India. Speak gently, keep sentences short and positive.`

    const fullMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-6), // Send last 6 messages for context window efficiency
    ]

    try {
      const response = await this.callGroq(fullMessages, { model: this.fastModel, temperature: 0.6, maxTokens: 180 })
      return response || this.getLocalChatFallback(lang, context?.name)
    } catch {
      return this.getLocalChatFallback(lang, context?.name)
    }
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

    if (!ENV_CONFIG.isGroqConfigured || !ENV_CONFIG.isOnline) {
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
    adherencePct: number
    medCount: number
    context?: MinimalPatientContext
  }): Promise<CaretakerSummaryResponse> {
    const { sessions, adherencePct, medCount, context } = params

    // Local fallback if offline or Groq fails
    const localDigest = buildDigest(sessions, adherencePct)
    const localFallback: CaretakerSummaryResponse = {
      headline: sessions.length > 0 ? 'Steady Cognitive Engagement This Week' : 'Beginning Gentle Routine',
      strengths: localDigest.map((d) => d.text).slice(0, 3),
      observations: [
        `Medicine schedule adherence is currently at ${Math.round(adherencePct)}%.`,
        `Completed ${sessions.length} cognitive activity sessions to date.`,
      ],
      routineAdherenceNote: `Caregiver tracking ${medCount} active medicines and scheduled reminders.`,
      suggestedFocus: 'Continue daily morning sessions with gentle encouragement.',
      isOnlineAI: false,
    }

    if (!ENV_CONFIG.isGroqConfigured || !ENV_CONFIG.isOnline) {
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
- Medication adherence rate: ${Math.round(adherencePct)}%
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

      if (parsed && typeof parsed.headline === 'string' && Array.isArray(parsed.strengths)) {
        return {
          headline: parsed.headline,
          strengths: parsed.strengths.slice(0, 4),
          observations: Array.isArray(parsed.observations) ? parsed.observations.slice(0, 4) : localFallback.observations,
          routineAdherenceNote: parsed.routineAdherenceNote || localFallback.routineAdherenceNote,
          suggestedFocus: parsed.suggestedFocus || localFallback.suggestedFocus,
          isOnlineAI: true,
        }
      }
      return localFallback
    } catch {
      return localFallback
    }
  }

  /**
   * Low-level Groq API caller with timeout & fault isolation
   */
  private async callGroq(
    messages: ChatMessage[],
    opts: { model?: string; temperature?: number; maxTokens?: number; responseFormat?: 'json_object' } = {}
  ): Promise<string | null> {
    const apiKey = ENV_CONFIG.groqApiKey
    if (!apiKey) return null

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
    const timeoutId = controller ? setTimeout(() => controller.abort(), 8500) : null

    try {
      const bodyPayload: any = {
        model: opts.model || this.fastModel,
        messages: messages,
        temperature: opts.temperature ?? 0.5,
        max_tokens: opts.maxTokens ?? 300,
      }

      if (opts.responseFormat === 'json_object') {
        bodyPayload.response_format = { type: 'json_object' }
      }

      let res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyPayload),
        signal: controller?.signal,
      })

      // Fallback model retry if primary model 404s or fails
      if (!res.ok && bodyPayload.model !== this.fallbackModel) {
        bodyPayload.model = this.fallbackModel
        res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bodyPayload),
          signal: controller?.signal,
        })
      }

      if (timeoutId) clearTimeout(timeoutId)

      if (!res.ok) {
        throw new Error(`Groq API error HTTP ${res.status}`)
      }

      const data = await res.json()
      const text = data?.choices?.[0]?.message?.content
      return typeof text === 'string' ? text.trim() : null
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }

  /**
   * Safe dementia-friendly local chat fallback
   */
  private getLocalChatFallback(lang: string, name?: string): string {
    const displayName = name ? `${name} ji` : ''
    if (lang === 'hi') {
      return `नमस्ते ${displayName}! मैं आपके साथ हूँ। आज का खेल खेलने के लिए तैयार हैं?`
    }
    if (lang === 'as') {
      return `নমস্কাৰ ${displayName}! মই আপোনাৰ লগত আছোঁ। আহক আজিৰ খেল খেলি অলপ আনন্দ কৰোঁ!`
    }
    if (lang === 'bn') {
      return `নমস্কার ${displayName}! আমি আপনার সাথে আছি। আজকের খেলাটি খেলতে প্রস্তুত?`
    }
    if (lang === 'mni') {
      return `ꯈꯨꯔꯨꯝꯖꯔꯤ! ꯑꯩꯍꯥꯛ ꯅꯈꯣꯏꯒ ꯂꯣꯏꯅꯅ ꯂꯩꯔꯤ। ꯉꯁꯤꯒꯤ ꯁꯥꯟꯅꯄꯣꯠ ꯁꯥꯟꯅꯔꯁꯤ!`
    }
    return `Hello ${displayName || 'there'}! I am right here with you. Would you like to play today's game or check your schedule?`
  }
}

export const AIService = new AIServiceClass()
