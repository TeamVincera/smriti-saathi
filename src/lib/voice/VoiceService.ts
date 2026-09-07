/**
 * VoiceService
 * Speech output service with a fault-isolated browser speech fallback.
 *
 * Concurrency model: every speak() call bumps a generation token, so a
 * newer utterance (or stop()) invalidates older in-flight requests.
 * Repeating the SAME text while it is already speaking is ignored.
 */

import { playSoftCue } from '../audio'
import type { Language } from '../types'

export interface VoiceSpeakOptions {
  language?: Language | string
  rate?: number
  pitch?: number
  onStart?: () => void
  onEnd?: () => void
  onError?: (err: Error) => void
}

class VoiceServiceClass {
  private isSpeakingState = false
  private generation = 0
  private activeText: string | null = null

  public isSpeaking(): boolean {
    return this.isSpeakingState
  }

  public stop() {
    this.generation += 1
    this.activeText = null
    this.isSpeakingState = false
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel()
      } catch {}
    }
  }

  public async speak(text: string, options: VoiceSpeakOptions = {}): Promise<boolean> {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return false
    }

    const cleanText = text.trim()
    const lang = options.language || 'en'
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void lang

    if (this.isSpeakingState && this.activeText === cleanText) {
      return false
    }

    const gen = ++this.generation
    this.activeText = cleanText
    this.isSpeakingState = true
    if (options.onStart) options.onStart()

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return this.fallbackCue(gen)
    }

    try {
      window.speechSynthesis.cancel()
    } catch {}

    const targetLang =
      lang === 'hi'
        ? 'hi-IN'
        : lang === 'bn' || lang === 'as'
        ? 'bn-IN'
        : lang === 'brx'
        ? 'hi-IN'
        : lang === 'mni'
        ? 'bn-IN'
        : 'en-IN'
    const voice = this.pickVoice(targetLang)

    const chunks = this.chunkText(cleanText)
    let index = 0
    const finish = () => {
      if (gen === this.generation) {
        this.isSpeakingState = false
        this.activeText = null
        if (options.onEnd) options.onEnd()
      }
    }

    const speakChunk = () => {
      if (gen !== this.generation) {
        finish()
        return
      }
      if (index >= chunks.length) {
        finish()
        return
      }

      const utter = new SpeechSynthesisUtterance(chunks[index])
      utter.rate = options.rate ?? 0.9
      utter.pitch = options.pitch ?? 1.0
      utter.lang = targetLang
      if (voice) utter.voice = voice

      utter.onend = () => {
        index += 1
        speakChunk()
      }
      utter.onerror = () => {
        index += 1
        speakChunk()
      }

      window.speechSynthesis.speak(utter)
    }

    speakChunk()
    return true
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

  private pickVoice(targetLang: string): SpeechSynthesisVoice | null {
    try {
      const voices = window.speechSynthesis.getVoices()
      if (!voices || voices.length === 0) return null

      const match = voices.find(
        (v) =>
          v.lang.toLowerCase().replace('_', '-') === targetLang.toLowerCase() &&
          /female|neural|google|microsoft/i.test(v.name)
      )
      const exact = voices.find((v) => v.lang.toLowerCase().replace('_', '-') === targetLang.toLowerCase())
      return match || exact || null
    } catch {
      return null
    }
  }

  private chunkText(text: string, maxLen = 180): string[] {
    const trimmed = text.trim()
    if (trimmed.length <= maxLen) return [trimmed]

    const parts = trimmed.match(/[^.!?。！？]+[.!?。！？]*/g) || [trimmed]
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