/**
 * VoiceService
 * Central speech synthesis service powered by Sarvam AI TTS.
 * Designed with strict fault isolation, quota management, and dementia-friendly voice tuning.
 */

import { ENV_CONFIG } from '../config'
import { VoiceHealthManager } from './VoiceHealthManager'
import { VoiceCache } from './VoiceCache'
import { playSoftCue } from '../audio'
import type { Language } from '../types'

export interface VoiceSpeakOptions {
  language?: Language | string
  rate?: number // 0.8 to 1.1 (default 0.9 for dementia friendliness)
  pitch?: number
  speaker?: string
  priority?: 'high' | 'normal' | 'low'
  onStart?: () => void
  onEnd?: () => void
  onError?: (err: Error) => void
}

export interface SarvamLanguageConfig {
  code: string
  defaultSpeaker: string
  fallbackCode?: string
}

// Sarvam supported language mapping for bulbul:v3
export const SARVAM_LANGUAGES: Record<string, SarvamLanguageConfig> = {
  hi: { code: 'hi-IN', defaultSpeaker: 'priya' },
  en: { code: 'en-IN', defaultSpeaker: 'priya' },
  bn: { code: 'bn-IN', defaultSpeaker: 'priya' },
  as: { code: 'bn-IN', defaultSpeaker: 'priya', fallbackCode: 'hi-IN' }, // Assamese phonetics closely match Bengali in Bulbul v3
  od: { code: 'od-IN', defaultSpeaker: 'priya' },
  mni: { code: 'hi-IN', defaultSpeaker: 'priya', fallbackCode: 'en-IN' },
  brx: { code: 'hi-IN', defaultSpeaker: 'priya', fallbackCode: 'en-IN' },
}

class VoiceServiceClass {
  private currentAudio: HTMLAudioElement | null = null
  private isSpeakingState = false

  public isSpeaking(): boolean {
    return this.isSpeakingState
  }

  public stop() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause()
        this.currentAudio.currentTime = 0
      } catch {}
      this.currentAudio = null
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel()
      } catch {}
    }

    this.isSpeakingState = false
  }

  /**
   * Main speech output method.
   * Every UI element needing speech calls VoiceService.speak(...)
   */
  public async speak(text: string, options: VoiceSpeakOptions = {}): Promise<boolean> {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return false
    }

    const cleanText = text.trim()
    const lang = options.language || 'en'
    const langConfig = SARVAM_LANGUAGES[lang] || SARVAM_LANGUAGES.en
    const speaker = options.speaker || langConfig.defaultSpeaker
    const pace = options.rate ?? 0.9 // Moderate, gentle pace for elderly users

    this.stop()
    this.isSpeakingState = true
    if (options.onStart) options.onStart()

    // 1. Check VoiceCache for cached audio
    const cacheKey = VoiceCache.generateKey(langConfig.code, speaker, cleanText, pace)
    try {
      const cachedBase64 = await VoiceCache.get(cacheKey)
      if (cachedBase64) {
        VoiceHealthManager.recordCacheHit()
        return await this.playBase64Audio(cachedBase64, options)
      }
    } catch {}

    // 2. If Sarvam is configured, healthy, and online, call Sarvam TTS API
    if (ENV_CONFIG.isSarvamConfigured && VoiceHealthManager.isVoiceAvailable() && ENV_CONFIG.isOnline) {
      try {
        VoiceHealthManager.recordRequestStart()
        const audioBase64 = await this.fetchSarvamAudio(cleanText, langConfig.code, speaker, pace)

        if (audioBase64) {
          VoiceHealthManager.recordSuccess()
          // Save to cache in background
          void VoiceCache.set(cacheKey, audioBase64)
          return await this.playBase64Audio(audioBase64, options)
        }
      } catch (err: any) {
        const errorMsg = err?.message || String(err)
        const statusCode = err?.status || (err?.statusCode as number | undefined)
        VoiceHealthManager.recordFailure(errorMsg, statusCode)

        if (options.onError) {
          options.onError(err instanceof Error ? err : new Error(errorMsg))
        }
      }
    }

    // 3. Fallback: Browser Native SpeechSynthesis or Gentle Chime (Fault-isolated)
    return this.fallbackSpeech(cleanText, lang, options)
  }

  /**
   * Fetches synthesized audio base64 from Sarvam API
   */
  private async fetchSarvamAudio(text: string, langCode: string, speaker: string, pace: number): Promise<string | null> {
    const apiKey = ENV_CONFIG.sarvamApiKey
    if (!apiKey) return null

    // Trim text to safe chunk size (Sarvam max characters ~500)
    const truncatedText = text.slice(0, 480)

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
    const timeoutId = controller ? setTimeout(() => controller.abort(), 7000) : null

    try {
      const res = await fetch('https://api.sarvam.ai/text-to-speech', {
        method: 'POST',
        headers: {
          'api-subscription-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: [truncatedText],
          target_language_code: langCode,
          speaker: speaker,
          pitch: 0,
          pace: pace,
          loudness: 1.5,
          speech_sample_rate: 22050,
          enable_preprocessing: true,
          model: 'bulbul:v3',
        }),
        signal: controller?.signal,
      })

      if (timeoutId) clearTimeout(timeoutId)

      if (!res.ok) {
        const errObj: any = new Error(`Sarvam TTS error HTTP ${res.status}`)
        errObj.status = res.status
        throw errObj
      }

      const data = await res.json()
      if (data && Array.isArray(data.audios) && data.audios.length > 0 && typeof data.audios[0] === 'string') {
        return data.audios[0]
      }

      throw new Error('Malformed Sarvam response')
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }

  /**
   * Plays a base64 audio string via HTML5 Audio
   */
  private playBase64Audio(base64: string, options: VoiceSpeakOptions): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const audioSrc = base64.startsWith('data:') ? base64 : `data:audio/wav;base64,${base64}`
        const audio = new Audio(audioSrc)
        this.currentAudio = audio

        audio.onended = () => {
          this.isSpeakingState = false
          this.currentAudio = null
          if (options.onEnd) options.onEnd()
          resolve(true)
        }

        audio.onerror = () => {
          this.isSpeakingState = false
          this.currentAudio = null
          if (options.onError) options.onError(new Error('Audio playback failed'))
          resolve(false)
        }

        const playPromise = audio.play()
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            this.isSpeakingState = false
            this.currentAudio = null
            resolve(false)
          })
        }
      } catch {
        this.isSpeakingState = false
        this.currentAudio = null
        resolve(false)
      }
    })
  }

  /**
   * Safe graceful fallback using browser Web Speech API
   */
  private fallbackSpeech(text: string, lang: string, options: VoiceSpeakOptions): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel()
          const utter = new SpeechSynthesisUtterance(text)
          utter.rate = options.rate ?? 0.88
          utter.pitch = 1.0

          if (lang === 'hi') utter.lang = 'hi-IN'
          else if (lang === 'bn' || lang === 'as') utter.lang = 'bn-IN'
          else utter.lang = 'en-IN'

          utter.onend = () => {
            this.isSpeakingState = false
            if (options.onEnd) options.onEnd()
            resolve(true)
          }

          utter.onerror = () => {
            this.isSpeakingState = false
            resolve(false)
          }

          window.speechSynthesis.speak(utter)
          return
        } catch {}
      }

      // If speech synthesis also unavailable, play gentle audio cue
      playSoftCue()
      this.isSpeakingState = false
      if (options.onEnd) options.onEnd()
      resolve(true)
    })
  }
}

export const VoiceService = new VoiceServiceClass()
