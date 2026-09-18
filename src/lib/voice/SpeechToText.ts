/**
 * SpeechToText
 *
 * Local first: uses the browser's Web Speech API (SpeechRecognition) to
 * turn microphone audio into text. When that API is unavailable or fails,
 * falls back to the secure transcription proxy (when configured) by recording
 * a short clip with MediaRecorder and transcribing it server-side.
 *
 * The raw transcript is cleaned before it reaches the chat so Whisper's
 * word-repetition hallucinations ("Test Test Test…") do not flood the UI.
 */

import { requestAiTranscription } from '../ai/proxyClient'
import { isAIAvailable } from '../ai/availability'

export type SttStatus = 'idle' | 'listening' | 'transcribing' | 'unsupported' | 'mic-denied' | 'no-speech' | 'network' | 'error'

export interface GroqSttCallbacks {
  onTranscript: (text: string) => void
  onStatus: (status: SttStatus) => void
  onError: (message: string) => void
}

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
  private discardCurrentRecording = false
  private recordingGeneration = 0
  private transcriptionController: AbortController | null = null
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
    if (!isAIAvailable()) {
      callbacks.onStatus('network')
      callbacks.onError('Voice typing is unavailable while the secure AI service is offline. You can type your question instead.')
      return
    }
    this.starting = true
    this.stopRequested = false
    this.discardCurrentRecording = false
    const generation = ++this.recordingGeneration
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
      // getUserMedia can resolve after cancel() and a new start() have begun.
      // Only the generation that still owns the request may attach a recorder;
      // stale streams must be closed immediately to release the microphone.
      if (generation !== this.recordingGeneration || this.stopRequested || !this.starting) {
        if (generation === this.recordingGeneration) this.stopRequested = false
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
        if (generation === this.recordingGeneration && this.recorder === recorder && e.data && e.data.size > 0) {
          this.chunks.push(e.data)
        }
      }

      recorder.onstop = () => {
        const discard = this.discardCurrentRecording || generation !== this.recordingGeneration
        const ownsRecorder = generation === this.recordingGeneration && this.recorder === recorder
        if (ownsRecorder) {
          this.active = false
          this.finalizing = false
          this.stopRequested = false
          this.discardCurrentRecording = false
        }
        if (this.recorder === recorder) this.recorder = null
        this.releaseStream(stream)
        if (!ownsRecorder || discard) {
          if (ownsRecorder) this.chunks = []
          return
        }
        const blob = new Blob(this.chunks, { type: recorder.mimeType || this.pickMimeType() || 'audio/webm' })
        this.chunks = []
        if (blob.size < 800) {
          callbacks.onStatus('no-speech')
          return
        }
        callbacks.onStatus('transcribing')
        void this.transcribe(blob, callbacks, generation)
      }

      try {
        recorder.start(250)
      } catch {
        this.releaseStream(stream)
        this.recorder = null
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
      if (generation === this.recordingGeneration) this.starting = false
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
      this.discardCurrentRecording = true
      this.recordingGeneration += 1
      this.starting = false
      return
    }
    this.discardCurrentRecording = true
    this.recordingGeneration += 1
    this.transcriptionController?.abort()
    this.transcriptionController = null
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
    if (!stream || this.stream === stream) this.stream = null
  }

  private async transcribe(blob: Blob, callbacks: GroqSttCallbacks, generation: number): Promise<void> {
    if (generation !== this.recordingGeneration || this.discardCurrentRecording) return
    // WKWebView can expose a stale navigator.onLine value. The proxy health
    // monitor is authoritative for whether cloud transcription is reachable.
    if (!isAIAvailable()) {
      callbacks.onStatus('network')
      callbacks.onError('Voice typing is unavailable while the secure AI service is offline. You can type your question instead.')
      return
    }

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
    this.transcriptionController = controller
    const timeoutId = controller ? setTimeout(() => controller.abort(), 15000) : null

    try {
      const fd = new FormData()
      fd.append('file', blob, this.filenameForType(blob.type))
      fd.append('model', 'whisper-large-v3')
      fd.append('response_format', 'json')
      if (this.language) fd.append('language', this.language)

      const raw = await requestAiTranscription(fd, controller?.signal)
      if (generation !== this.recordingGeneration) return
      const text = sanitizeTranscript(raw || '')
      if (text) {
        callbacks.onTranscript(text)
      } else {
        callbacks.onStatus('no-speech')
      }
    } catch (err) {
      if (generation !== this.recordingGeneration) return
      console.warn('[SpeechToText] Groq transcription failed:', err)
      callbacks.onStatus('network')
      callbacks.onError('Voice typing failed. Please try again or type your question.')
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
      if (this.transcriptionController === controller) this.transcriptionController = null
    }
  }
}

export const GroqSpeechToText = new GroqSpeechToTextClass()

export function getSpeechRecognitionLanguage(lang: string): string {
  switch (lang) {
    case 'hi':
      return 'hi-IN'
    case 'as':
      return 'as-IN'
    case 'bn':
      return 'bn-IN'
    case 'brx':
      // Bodo uses Devanagari script; hi-IN provides closest phonetic match
      return 'hi-IN'
    case 'mni':
      // Manipuri in Eastern Nagari / Meetei; bn-IN provides closest acoustic match
      return 'bn-IN'
    case 'en':
    default:
      return 'en-IN'
  }
}

export function whisperLanguage(lang: string): string {
  if (lang === 'hi' || lang === 'brx') return 'hi'
  if (lang === 'bn' || lang === 'as' || lang === 'mni') return 'bn'
  if (lang === 'en') return 'en'
  return '' // auto-detect
}

export function sanitizeTranscript(text: string): string {
  return (text || '').trim()
}
