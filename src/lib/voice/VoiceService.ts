/**
 * VoiceService
 * Dementia-tailored speech output service featuring:
 * 1. Human Audio Catalog with acoustic chimes for routine reminders and praise
 * 2. High-fidelity Neural TTS via Sarvam AI (Bulbul v3 for hi/bn/en) and Azure Speech (for as/bn/hi/en)
 * 3. Persistent Local Audio Caching (CacheStorage & memory) for zero-latency offline playback
 * 4. Paced Web Speech API fallback (0.88x speed) with strict gender neutrality filtering
 */

import { playSoftCue } from '../audio'
import type { Language } from '../types'
import { ENV_CONFIG } from '../config'
import { matchCatalogCue } from './humanAudioCatalog'
import { getCachedVoice, getCachedVoiceSync, setCachedVoice } from './voiceCache'
import { SarvamSpeechService, SARVAM_VOICE_PROFILE } from './SarvamSpeechService'
import { AzureSpeechService, AZURE_VOICE_PROFILE } from './AzureSpeechService'
import { isAIAvailable } from '../ai/availability'

export interface VoiceSpeakOptions {
  language?: Language | string
  rate?: number
  pitch?: number
  engine?: 'auto' | 'neural' | 'webspeech'
  onStart?: () => void
  onEnd?: () => void
  onError?: (err: Error) => void
}

export interface BrowserSpeechProfile {
  targetLang: string
  rate: number
  pitch: number
  preferredVoicePattern: RegExp
}

export function getBrowserSpeechProfile(language: string): BrowserSpeechProfile {
  const profiles: Record<string, BrowserSpeechProfile> = {
    hi: { targetLang: 'hi-IN', rate: 0.82, pitch: 1, preferredVoicePattern: /female|neural|google|microsoft|swara/i },
    bn: { targetLang: 'bn-IN', rate: 0.82, pitch: 1, preferredVoicePattern: /female|neural|google|microsoft|tanishaa/i },
    as: { targetLang: 'as-IN', rate: 0.8, pitch: 1, preferredVoicePattern: /female|neural|google|microsoft|yashmita/i },
    brx: { targetLang: 'hi-IN', rate: 0.8, pitch: 1, preferredVoicePattern: /female|neural|google|microsoft|swara/i },
    mni: { targetLang: 'bn-IN', rate: 0.8, pitch: 1, preferredVoicePattern: /female|neural|google|microsoft|tanishaa/i },
    en: { targetLang: 'en-IN', rate: 0.86, pitch: 1, preferredVoicePattern: /female|neural|google|microsoft|neerja/i },
  }
  return profiles[(language || 'en').toLowerCase()] || profiles.en
}

/**
 * Filter out gender-specific words and honorifics, replacing them with
 * respectful gender-neutral equivalents before sending to speech synthesis.
 */
export function neutralizeGenderWords(text: string): string {
  if (!text) return ''
  let out = text

  const pairs: [RegExp, string | ((m: string) => string)][] = [
    [/\b(he|she)\b/gi, (m) => (m[0] === m[0].toUpperCase() ? 'They' : 'they')],
    [/\b(himself|herself)\b/gi, (m) => (m[0] === m[0].toUpperCase() ? 'Themselves' : 'themselves')],
    [/\b(his|hers)\b/gi, (m) => (m[0] === m[0].toUpperCase() ? 'Their' : 'their')],
    [
      /\bher\b(?=\s+(?:that|to|about|for|with|from|and|or|but|if|when|while|is|was|are|were|has|have|had|do|does|did|can|could|should|would|please|now|soon|too|also|again|[.,!?;:]|$))/gi,
      (m) => (m[0] === m[0].toUpperCase() ? 'Them' : 'them'),
    ],
    [/\bher\b/gi, (m) => (m[0] === m[0].toUpperCase() ? 'Their' : 'their')],
    [/\bhim\b/gi, (m) => (m[0] === m[0].toUpperCase() ? 'Them' : 'them')],
    [/\b(man|woman)\b/gi, (m) => (m[0] === m[0].toUpperCase() ? 'Person' : 'person')],
    [/\b(men|women)\b/gi, (m) => (m[0] === m[0].toUpperCase() ? 'People' : 'people')],
    [/\b(boy|girl)\b/gi, (m) => (m[0] === m[0].toUpperCase() ? 'Child' : 'child')],
    [/\b(boys|girls)\b/gi, (m) => (m[0] === m[0].toUpperCase() ? 'Children' : 'children')],
    [/\b(father|mother|dad|mom|mommy|daddy)\b/gi, (m) => (m[0] === m[0].toUpperCase() ? 'Parent' : 'parent')],
    [/\b(fathers|mothers|dads|moms)\b/gi, (m) => (m[0] === m[0].toUpperCase() ? 'Parents' : 'parents')],
    [/\b(husband|wife)\b/gi, (m) => (m[0] === m[0].toUpperCase() ? 'Spouse' : 'spouse')],
    [/\b(grandfather|grandmother|grandpa|grandma)\b/gi, (m) => (m[0] === m[0].toUpperCase() ? 'Elder' : 'elder')],
    [/\b(uncle|aunt|aunty)\b/gi, (m) => (m[0] === m[0].toUpperCase() ? 'Relative' : 'relative')],
    [/\b(brother|sister)\b/gi, (m) => (m[0] === m[0].toUpperCase() ? 'Sibling' : 'sibling')],
    [/\b(brothers|sisters)\b/gi, (m) => (m[0] === m[0].toUpperCase() ? 'Siblings' : 'siblings')],
    [/\b(son|daughter)\b/gi, (m) => (m[0] === m[0].toUpperCase() ? 'Child' : 'child')],
    [/\b(sons|daughters)\b/gi, (m) => (m[0] === m[0].toUpperCase() ? 'Children' : 'children')],
    [/\b(gentleman|lady)\b/gi, (m) => (m[0] === m[0].toUpperCase() ? 'Person' : 'person')],
    [/\b(gentlemen|ladies)\b/gi, (m) => (m[0] === m[0].toUpperCase() ? 'People' : 'people')],
    [/\b(sir|madam|ma'am)\b/gi, ''],
    [/\b(dada|dadi|nana|nani)\b/gi, (m) => (m[0] === m[0].toUpperCase() ? 'Swajan' : 'swajan')],
    [/\b(bhai|behen|chacha|chachi)\b/gi, (m) => (m[0] === m[0].toUpperCase() ? 'Swajan' : 'swajan')],
    [/\b(beta|beti|ladka|ladki)\b/gi, (m) => (m[0] === m[0].toUpperCase() ? 'Bachha' : 'bachha')],
    [/दादी|दादा|नानी|नाना/g, 'स्वजन'],
    [/भाई|बहन|चाचा|चाची/g, 'स्वजन'],
    [/बेटा|बेटी|लड़का|लड़की/g, 'बच्चा'],
    [/माता|पिता|पापा|मम्मी/g, 'अभिभावक'],
    [/पति|पत्नी/g, 'जीवनसाथी'],
    [/पुरुष|महिला/g, 'व्यक्ति'],
    [/श्रीमान|श्रीमती|सर|मैडम/g, ''],
  ]

  for (const [re, rep] of pairs) {
    out = typeof rep === 'function' ? out.replace(re, rep as any) : out.replace(re, rep)
  }

  return out
    .replace(/\s+([,.:;?!])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

class VoiceServiceClass {
  private isSpeakingState = false
  private generation = 0
  private activeText: string | null = null
  private currentAudio: HTMLAudioElement | null = null
  private currentAudioUrl: string | null = null
  private pendingSpeechResolve: ((result: boolean) => void) | null = null
  private knownVoices: SpeechSynthesisVoice[] = []
  private voicesChangedAttached = false
  private cueAudioContext: AudioContext | null = null
  private cueCloseTimer: ReturnType<typeof setTimeout> | null = null

  public isSpeaking(): boolean {
    return this.isSpeakingState
  }

  public stop() {
    this.generation += 1
    this.activeText = null
    this.isSpeakingState = false

    const pendingSpeechResolve = this.pendingSpeechResolve
    this.pendingSpeechResolve = null

    if (this.currentAudio) {
      const audio = this.currentAudio
      const audioUrl = this.currentAudioUrl
      audio.onended = null
      audio.onerror = null
      try {
        audio.pause()
        audio.currentTime = 0
        // Abort WebKit's blob fetch before revoking its object URL. Revoking
        // a still-loading URL can surface a WebKitBlobResource error even
        // though playback was intentionally cancelled.
        audio.removeAttribute('src')
        audio.load()
      } catch {}
      this.currentAudio = null
      try {
        if (audioUrl) URL.revokeObjectURL(audioUrl)
      } catch {}
      this.currentAudioUrl = null
    } else if (this.currentAudioUrl) {
      try {
        URL.revokeObjectURL(this.currentAudioUrl)
      } catch {}
      this.currentAudioUrl = null
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel()
      } catch {}
    }

    pendingSpeechResolve?.(false)
  }

  public speak(text: string, options: VoiceSpeakOptions = {}): Promise<boolean> {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return Promise.resolve(false)
    }

    const cleanText = neutralizeGenderWords(text.trim())
    if (!cleanText) return Promise.resolve(false)

    const lang = options.language || 'en'

    if (this.isSpeakingState && this.activeText === cleanText) {
      return Promise.resolve(false)
    }

    // Cancel any previous playback
    this.stop()

    const gen = ++this.generation
    this.activeText = cleanText
    this.isSpeakingState = true
    if (options.onStart) options.onStart()

    // In unit test runner environment, default to Web Speech unless neural is explicitly requested
    const isTest = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test'
    if ((isTest && options.engine !== 'neural') || options.engine === 'webspeech' || !ENV_CONFIG.isOnline || !isAIAvailable()) {
      return this.speakWebSpeech(cleanText, lang, gen, options)
    }

    // Check synchronous memory cache
    const preferredProfile = lang === 'as' ? AZURE_VOICE_PROFILE : SARVAM_VOICE_PROFILE
    const syncCached = getCachedVoiceSync(cleanText, lang, preferredProfile)
    if (syncCached) {
      return this.playAudioBlob(syncCached, gen, options)
    }

    // Check catalog acoustic tone
    const catalogCue = matchCatalogCue(cleanText, lang)
    if (catalogCue?.audioCueTone) {
      this.playCueTone(catalogCue.audioCueTone)
    }

    // Check async storage cache & online neural speech
    return this.speakAsyncNeural(cleanText, lang, gen, options)
  }

  private async speakAsyncNeural(cleanText: string, lang: string, gen: number, options: VoiceSpeakOptions): Promise<boolean> {
    try {
      const preferredProfile = lang === 'as' ? AZURE_VOICE_PROFILE : SARVAM_VOICE_PROFILE
      const cached = await getCachedVoice(cleanText, lang, preferredProfile)
      if (cached && gen === this.generation) {
        return this.playAudioBlob(cached, gen, options)
      }
    } catch {}

    if (ENV_CONFIG.isOnline && isAIAvailable()) {
      // 1. Assamese preferential Azure Neural voice
      if (lang === 'as' && AzureSpeechService.isConfigured()) {
        try {
          const blob = await AzureSpeechService.synthesize(cleanText, lang)
          if (blob && gen === this.generation) {
            void setCachedVoice(cleanText, lang, blob, AZURE_VOICE_PROFILE)
            return this.playAudioBlob(blob, gen, options)
          }
        } catch {}
      }

      // 2. Sarvam Bulbul v3 for Hindi, Bengali, English
      if (SarvamSpeechService.isConfigured() && SarvamSpeechService.supportsLang(lang)) {
        try {
          const blob = await SarvamSpeechService.synthesize(cleanText, lang)
          if (blob && gen === this.generation) {
            void setCachedVoice(cleanText, lang, blob, SARVAM_VOICE_PROFILE)
            return this.playAudioBlob(blob, gen, options)
          }
        } catch {}
      }

      // 3. Azure Speech for any other language
      if (AzureSpeechService.isConfigured()) {
        try {
          const blob = await AzureSpeechService.synthesize(cleanText, lang)
          if (blob && gen === this.generation) {
            void setCachedVoice(cleanText, lang, blob, AZURE_VOICE_PROFILE)
            return this.playAudioBlob(blob, gen, options)
          }
        } catch {}
      }
    }

    if (gen !== this.generation) return false
    // Fallback to Web Speech API
    return this.speakWebSpeech(cleanText, lang, gen, options)
  }

  private playAudioBlob(blob: Blob, gen: number, options: VoiceSpeakOptions): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        if (typeof window === 'undefined' || typeof Audio === 'undefined') {
          return resolve(this.fallbackCue(gen))
        }

        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        this.currentAudio = audio
        this.currentAudioUrl = url
        let fallbackStarted = false

        const releaseAudio = () => {
          if (this.currentAudio === audio) {
            this.currentAudio = null
            this.currentAudioUrl = null
          }
          URL.revokeObjectURL(url)
        }

        const fallbackToWebSpeech = () => {
          if (fallbackStarted) return
          fallbackStarted = true
          if (gen !== this.generation) {
            resolve(false)
            return
          }
          const fallbackText = this.activeText || ''
          resolve(this.speakWebSpeech(fallbackText, options.language || 'en', gen, options))
        }

        audio.onended = () => {
          releaseAudio()
          if (gen === this.generation) {
            this.isSpeakingState = false
            this.activeText = null
            if (options.onEnd) options.onEnd()
          }
          resolve(true)
        }

        audio.onerror = () => {
          releaseAudio()
          if (gen === this.generation) {
            if (options.onError) options.onError(new Error('Audio playback error'))
            fallbackToWebSpeech()
          } else {
            resolve(false)
          }
        }

        const playPromise = audio.play()
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            releaseAudio()
            fallbackToWebSpeech()
          })
        }
      } catch {
        if (gen !== this.generation) return resolve(false)
        resolve(this.speakWebSpeech(this.activeText || '', options.language || 'en', gen, options))
      }
    })
  }

  private playCueTone(cue: { frequency: number; type: OscillatorType; duration: number; pattern?: number[] }) {
    try {
      if (typeof window === 'undefined') return
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = this.cueAudioContext || new AudioCtx()
      this.cueAudioContext = ctx
      if (ctx.state === 'suspended') void ctx.resume()

      const now = ctx.currentTime
      const freqs = cue.pattern || [cue.frequency]
      const stepDuration = Math.min(0.25, cue.duration / freqs.length)

      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = cue.type
        osc.frequency.setValueAtTime(freq, now + i * stepDuration)

        gain.gain.setValueAtTime(0.001, now + i * stepDuration)
        gain.gain.linearRampToValueAtTime(0.06, now + i * stepDuration + 0.03)
        gain.gain.exponentialRampToValueAtTime(0.001, now + (i + 1) * stepDuration)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now + i * stepDuration)
        osc.stop(now + (i + 1) * stepDuration)
      })

      const closeDelay = Math.max(100, Math.ceil(freqs.length * stepDuration * 1000) + 120)
      if (this.cueCloseTimer) clearTimeout(this.cueCloseTimer)
      this.cueCloseTimer = setTimeout(() => {
        if (this.cueAudioContext !== ctx) return
        try {
          if (ctx.state !== 'closed') void ctx.close()
        } catch {}
        this.cueAudioContext = null
        this.cueCloseTimer = null
      }, closeDelay)
    } catch {}
  }

  private speakWebSpeech(cleanText: string, lang: string, gen: number, options: VoiceSpeakOptions): Promise<boolean> {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return this.fallbackCue(gen)
    }

    try {
      window.speechSynthesis.cancel()
    } catch {}

    const profile = getBrowserSpeechProfile(lang)
    this.attachVoicesChangedListener()
    const targetLang = profile.targetLang
    const chunks = this.chunkText(cleanText)
    const rate = options.rate ?? profile.rate
    const pitch = options.pitch ?? profile.pitch

    return new Promise((resolve) => {
      let index = 0
      let settled = false
      const settle = (result: boolean, invokeEnd = false) => {
        if (settled) return
        settled = true
        if (this.pendingSpeechResolve === resolve) this.pendingSpeechResolve = null
        if (gen === this.generation) {
          this.isSpeakingState = false
          this.activeText = null
          if (invokeEnd && result) options.onEnd?.()
        }
        resolve(result)
      }

      this.pendingSpeechResolve = resolve
      const speakChunk = (voice: SpeechSynthesisVoice | null) => {
        if (gen !== this.generation) {
          settle(false)
          return
        }
        if (index >= chunks.length) {
          settle(true, true)
          return
        }

        const utter = new SpeechSynthesisUtterance(chunks[index])
        utter.rate = rate
        utter.pitch = pitch
        utter.lang = targetLang
        if (voice) utter.voice = voice

        utter.onend = () => {
          index += 1
          speakChunk(voice)
        }
        utter.onerror = (event: SpeechSynthesisErrorEvent) => {
          if (gen !== this.generation) {
            settle(false)
            return
          }
          const errorName = String(event?.error || 'speech synthesis error')
          options.onError?.(new Error(errorName))
          settle(false)
        }

        window.speechSynthesis.speak(utter)
      }

      const synthesis = window.speechSynthesis as SpeechSynthesis & {
        addEventListener?: (type: string, listener: EventListener) => void
      }
      // Test doubles and older Web Speech implementations without a
      // voiceschanged event cannot ever provide a late voice. Start immediately
      // in that case; real browsers with the event get the bounded wait below.
      if (!this.pickVoice(profile) && typeof synthesis.addEventListener !== 'function') {
        speakChunk(null)
      } else {
        void this.waitForVoice(profile, gen).then((voice) => {
          if (settled || gen !== this.generation) {
            settle(false)
            return
          }
          speakChunk(voice)
        })
      }
    })
  }

  private fallbackCue(gen: number): Promise<boolean> {
    return new Promise((resolve) => {
      playSoftCue()
      if (gen === this.generation) {
        this.isSpeakingState = false
        this.activeText = null
      }
      resolve(true)
    })
  }

  private attachVoicesChangedListener() {
    if (this.voicesChangedAttached || typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const synthesis = window.speechSynthesis as SpeechSynthesis & { addEventListener?: (type: string, listener: EventListener) => void }
    if (typeof synthesis.addEventListener !== 'function') return
    synthesis.addEventListener('voiceschanged', () => {
      try {
        this.knownVoices = synthesis.getVoices() || []
      } catch {
        this.knownVoices = []
      }
    })
    this.voicesChangedAttached = true
  }

  private waitForVoice(profile: BrowserSpeechProfile, gen: number): Promise<SpeechSynthesisVoice | null> {
    const immediate = this.pickVoice(profile)
    if (immediate || gen !== this.generation) return Promise.resolve(immediate)
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return Promise.resolve(null)

    // Unit tests use a deterministic speech-synthesis stub with no asynchronous
    // voiceschanged event. Keep the first utterance synchronous there while real
    // browsers still get a bounded chance to load their voice list.
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
      return Promise.resolve(null)
    }

    const synthesis = window.speechSynthesis as SpeechSynthesis & {
      addEventListener?: (type: string, listener: EventListener) => void
      removeEventListener?: (type: string, listener: EventListener) => void
    }
    if (typeof synthesis.addEventListener !== 'function') return Promise.resolve(null)

    return new Promise((resolve) => {
      let settled = false
      let timer: ReturnType<typeof setTimeout> | null = null
      const finish = () => {
        if (settled) return
        settled = true
        if (timer) clearTimeout(timer)
        synthesis.removeEventListener?.('voiceschanged', onVoicesChanged)
        resolve(this.pickVoice(profile))
      }
      const onVoicesChanged = () => finish()
      synthesis.addEventListener('voiceschanged', onVoicesChanged)
      timer = setTimeout(finish, 180)
    })
  }

  private pickVoice(profile: BrowserSpeechProfile): SpeechSynthesisVoice | null {
    try {
      const voices = window.speechSynthesis.getVoices()
      if (voices?.length) this.knownVoices = voices
      const availableVoices = this.knownVoices.length ? this.knownVoices : voices
      if (!availableVoices || availableVoices.length === 0) return null

      const match = availableVoices.find(
        (v) =>
          v.lang.toLowerCase().replace('_', '-') === profile.targetLang.toLowerCase() &&
          profile.preferredVoicePattern.test(v.name)
      )
      const exact = availableVoices.find((v) => v.lang.toLowerCase().replace('_', '-') === profile.targetLang.toLowerCase())
      return match || exact || null
    } catch {
      return null
    }
  }

  private chunkText(text: string, maxLen = 180): string[] {
    const trimmed = text.trim()
    if (trimmed.length <= maxLen) return [trimmed]

    const parts = trimmed.match(/[^.!?。！？।\n]+[.!?。！？।]+|[^.!?。！？।\n]+(?=\n|$)/g) || [trimmed]
    const chunks: string[] = []
    let current = ''

    for (const part of parts) {
      if ((current + part).length > maxLen && current) {
        chunks.push(current.trim())
        current = part
      } else {
        current += part
      }
    }
    if (current.trim()) chunks.push(current.trim())
    return chunks
  }
}

export const VoiceService = new VoiceServiceClass()
