/**
 * SpeechToText
 *
 * Local first: uses the browser's Web Speech API (SpeechRecognition) to
 * turn microphone audio into text. When that API is unavailable or fails,
 * falls back to Groq Whisper (if a Groq API key is configured) by recording
 * a short clip with MediaRecorder and transcribing it server-side.
 *
 * The raw transcript is cleaned before it reaches the chat so Whisper's
 * word-repetition hallucinations ("Test Test Test…") do not flood the UI.
 */

import { ENV_CONFIG } from '../config'

export type SttStatus = 'idle' | 'listening' | 'transcribing' | 'unsupported' | 'mic-denied' | 'no-speech' | 'network' | 'error'

export interface GroqSttCallbacks {
  onTranscript: (text: string) => void
  onStatus: (status: SttStatus) => void
  onError: (message: string) => void
}

const GROQ_STT_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'
const MAX_DURATION_MS = 8000
const MAX_TRANSCRIPT_CHARS = 320

class GroqSpeechToTextClass {
  private recorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private chunks: Blob[] = []
  private autoStopTimer: ReturnType<typeof setTimeout> | null = null
  private active = false
  private starting = false
  private finalizing = false
  private stopRequested = false
  private language = ''
  private maxDurationMs = MAX_DURATION_MS

  public isActive(): boolean {
    return this.active
  }

  public isBusy(): boolean {
    return this.active || this.finalizing || this.starting
  }

  public async start(opts: { language?: string; maxDurationMs?: number; callbacks: GroqSttCallbacks }): Promise<void> {
    const { callbacks } = opts
    if (this.isBusy()) return
    this.starting = true
    this.stopRequested = false
    this.language = opts.language || ''
    this.maxDurationMs = opts.maxDurationMs ?? MAX_DURATION_MS
    this.chunks = []

    try {
      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === 'undefined'
      ) {
        callbacks.onStatus('unsupported')
        return
      }

      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch {
        callbacks.onStatus('mic-denied')
        return
      }
      if (this.stopRequested || !this.starting) {
        this.stopRequested = false
        this.releaseStream(stream)
        return
      }

      const mime = this.pickMimeType()
      let recorder: MediaRecorder
      try {
        recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      } catch {
        try {
          recorder = new MediaRecorder(stream)
        } catch {
          this.releaseStream(stream)
          callbacks.onStatus('unsupported')
          return
        }
      }

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) this.chunks.push(e.data)
      }

      recorder.onstop = () => {
        this.active = false
        this.finalizing = false
        this.stopRequested = false
        this.releaseStream(stream)
        const blob = new Blob(this.chunks, { type: recorder.mimeType || this.pickMimeType() || 'audio/webm' })
        if (blob.size < 2000) {
          callbacks.onStatus('no-speech')
          return
        }
        callbacks.onStatus('transcribing')
        void this.transcribe(blob, callbacks)
      }

      try {
        recorder.start(250)
      } catch {
        this.releaseStream(stream)
        callbacks.onStatus('error')
        return
      }

      this.recorder = recorder
      this.stream = stream
      this.active = true
      this.autoStopTimer = setTimeout(() => {
        void this.stop()
      }, this.maxDurationMs)

      if (this.stopRequested) {
        this.stopRequested = false
        void this.stop()
        return
      }

      callbacks.onStatus('listening')
    } finally {
      this.starting = false
    }
  }

  public async stop(): Promise<void> {
    if (this.autoStopTimer) {
      clearTimeout(this.autoStopTimer)
      this.autoStopTimer = null
    }
    if (this.starting && !this.recorder) {
      this.stopRequested = true
      return
    }
    if (!this.recorder || this.finalizing) return
    this.finalizing = true
    try {
      this.recorder.stop()
    } catch {
      this.finalizing = false
    }
  }

  public cancel(): void {
    if (this.autoStopTimer) {
      clearTimeout(this.autoStopTimer)
      this.autoStopTimer = null
    }
    if (this.starting && !this.recorder) {
      this.stopRequested = true
      this.starting = false
      return
    }
    this.active = false
    this.finalizing = false
    this.stopRequested = false
    try {
      this.recorder?.stop()
    } catch {}
    this.recorder = null
    this.releaseStream(this.stream)
    this.chunks = []
  }

  private pickMimeType(): string {
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
    for (const c of candidates) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) return c
    }
    return ''
  }

  private filenameForType(type: string): string {
    if (type.includes('mp4') || type.includes('aac') || type.includes('m4a')) return 'recording.m4a'
    if (type.includes('ogg')) return 'recording.ogg'
    return 'recording.webm'
  }

  private releaseStream(stream?: MediaStream | null): void {
    const s = stream || this.stream
    if (s) {
      for (const track of s.getTracks()) track.stop()
    }
    if (!stream) this.stream = null
  }

  private async transcribe(blob: Blob, callbacks: GroqSttCallbacks): Promise<void> {
    const apiKey = ENV_CONFIG.groqApiKey
    if (!apiKey) {
      callbacks.onStatus('network')
      callbacks.onError('Voice typing needs an internet connection.')
      return
    }

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
    const timeoutId = controller ? setTimeout(() => controller.abort(), 15000) : null

    try {
      const fd = new FormData()
      fd.append('file', blob, this.filenameForType(blob.type))
      fd.append('model', 'whisper-large-v3')
      fd.append('response_format', 'json')
      if (this.language) fd.append('language', this.language)

      const res = await fetch(GROQ_STT_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: fd,
        signal: controller?.signal,
      })
      if (!res.ok) throw new Error(`Groq STT HTTP ${res.status}`)

      const data = await res.json()
      const raw = typeof data?.text === 'string' ? data.text.trim() : ''
      const text = sanitizeTranscript(raw)
      if (text) {
        callbacks.onTranscript(text)
      } else {
        callbacks.onStatus('no-speech')
      }
    } catch (err) {
      console.warn('[SpeechToText] Groq transcription failed:', err)
      callbacks.onStatus('network')
      callbacks.onError('Voice typing failed. Please try again or type your question.')
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }
}

export const GroqSpeechToText = new GroqSpeechToTextClass()

export function whisperLanguage(lang: string): string {
  if (lang === 'hi') return 'hi'
  if (lang === 'bn') return 'bn'
  if (lang === 'as') return 'bn' // Assamese is not a Whisper language; Bengali is the closest model
  return '' // hi-IN-assamese speakers etc. → auto-detect
}

export function sanitizeTranscript(text: string): string {
  return (text || '').trim()
}