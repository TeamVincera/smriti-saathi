import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
vi.mock('../../src/lib/ai/availability', () => ({ isAIAvailable: () => true }))
import {
  getSpeechRecognitionLanguage,
  whisperLanguage,
  sanitizeTranscript,
  GroqSpeechToText,
} from '../../src/lib/voice/SpeechToText'

describe('SpeechToText Language Mapping & Phonetic Scaffolding', () => {
  it('maps all 6 supported Indic and English languages to accurate Web Speech API codes', () => {
    expect(getSpeechRecognitionLanguage('en')).toBe('en-IN')
    expect(getSpeechRecognitionLanguage('hi')).toBe('hi-IN')
    expect(getSpeechRecognitionLanguage('as')).toBe('as-IN')
    expect(getSpeechRecognitionLanguage('bn')).toBe('bn-IN')
    expect(getSpeechRecognitionLanguage('brx')).toBe('hi-IN') // Devanagari script acoustic model
    expect(getSpeechRecognitionLanguage('mni')).toBe('bn-IN') // Eastern Nagari script acoustic model
  })

  it('falls back gracefully to en-IN for unknown language codes', () => {
    expect(getSpeechRecognitionLanguage('fr')).toBe('en-IN')
    expect(getSpeechRecognitionLanguage('')).toBe('en-IN')
  })

  it('resolves Whisper language models appropriately for regional dialects', () => {
    expect(whisperLanguage('hi')).toBe('hi')
    expect(whisperLanguage('brx')).toBe('hi')
    expect(whisperLanguage('bn')).toBe('bn')
    expect(whisperLanguage('as')).toBe('bn')
    expect(whisperLanguage('mni')).toBe('bn')
    expect(whisperLanguage('en')).toBe('en')
    expect(whisperLanguage('unknown')).toBe('')
  })

  it('sanitizes transcripts cleanly without truncating user speech', () => {
    expect(sanitizeTranscript('  Dawai kab leni hai?  ')).toBe('Dawai kab leni hai?')
    expect(sanitizeTranscript('')).toBe('')
    expect(sanitizeTranscript('   ')).toBe('')
  })
})

describe('GroqSpeechToText Lifecycle & State Management', () => {
  afterEach(() => {
    GroqSpeechToText.cancel()
  })

  it('reports idle state initially', () => {
    expect(GroqSpeechToText.isActive()).toBe(false)
    expect(GroqSpeechToText.isBusy()).toBe(false)
  })

  it('cleanly cancels and resets any active recording session', () => {
    GroqSpeechToText.cancel()
    expect(GroqSpeechToText.isActive()).toBe(false)
    expect(GroqSpeechToText.isBusy()).toBe(false)
  })

  it('does not upload audio when cancellation stops an active recorder', async () => {
    const tracks = [{ stop: vi.fn() }]
    const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => tracks })
    class MockRecorder {
      static isTypeSupported = () => true
      mimeType = 'audio/webm'
      ondataavailable: ((event: BlobEvent) => void) | null = null
      onstop: (() => void) | null = null
      start = vi.fn()
      stop = vi.fn(() => {
        this.ondataavailable?.({ data: new Blob(['recorded audio']) } as BlobEvent)
        this.onstop?.()
      })
      constructor(_stream: MediaStream, _options?: MediaRecorderOptions) {}
    }

    vi.stubGlobal('MediaRecorder', MockRecorder)
    vi.stubGlobal('fetch', vi.fn())
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })
    await GroqSpeechToText.start({
      callbacks: { onTranscript: vi.fn(), onStatus: vi.fn(), onError: vi.fn() },
    })
    GroqSpeechToText.cancel()

    expect(fetch).not.toHaveBeenCalled()
    expect(tracks[0].stop).toHaveBeenCalled()
    expect(GroqSpeechToText.isActive()).toBe(false)
    expect(GroqSpeechToText.isBusy()).toBe(false)
    vi.unstubAllGlobals()
  })

  it('closes a stale getUserMedia stream when a new recording owns the generation', async () => {
    let resolveFirst!: (stream: MediaStream) => void
    let resolveSecond!: (stream: MediaStream) => void
    const firstTrack = { stop: vi.fn() }
    const secondTrack = { stop: vi.fn() }
    const firstStream = { getTracks: () => [firstTrack] }
    const secondStream = { getTracks: () => [secondTrack] }
    const getUserMedia = vi
      .fn()
      .mockImplementationOnce(() => new Promise<MediaStream>((resolve) => { resolveFirst = resolve }))
      .mockImplementationOnce(() => new Promise<MediaStream>((resolve) => { resolveSecond = resolve }))

    class MockRecorder {
      static isTypeSupported = () => true
      mimeType = 'audio/webm'
      ondataavailable: ((event: BlobEvent) => void) | null = null
      onstop: (() => void) | null = null
      start = vi.fn()
      stop = vi.fn()
      constructor(_stream: MediaStream, _options?: MediaRecorderOptions) {}
    }

    vi.stubGlobal('MediaRecorder', MockRecorder)
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })
    const callbacks = { onTranscript: vi.fn(), onStatus: vi.fn(), onError: vi.fn() }

    const firstStart = GroqSpeechToText.start({ callbacks })
    await Promise.resolve()
    GroqSpeechToText.cancel()
    const secondStart = GroqSpeechToText.start({ callbacks })

    resolveFirst(firstStream as unknown as MediaStream)
    await firstStart
    expect(firstTrack.stop).toHaveBeenCalledTimes(1)

    resolveSecond(secondStream as unknown as MediaStream)
    await secondStart
    expect(GroqSpeechToText.isActive()).toBe(true)
    expect(secondTrack.stop).not.toHaveBeenCalled()
    GroqSpeechToText.cancel()
    vi.unstubAllGlobals()
  })
})
