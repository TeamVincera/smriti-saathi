import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VoiceService } from '../../src/lib/voice/VoiceService'

vi.mock('../../src/lib/config', () => ({
  ENV_CONFIG: {
    get isOnline() {
      return true
    },
    get groqApiKey() {
      return 'gsk-test-key'
    },
    get isGroqConfigured() {
      return true
    },
  },
}))

// ── Mocks ──────────────────────────────────────────────
let spokenTexts: string[] = []
let cancelCalls = 0

const flush = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => {
  spokenTexts = []
  cancelCalls = 0
  VoiceService.stop()

  const synth: any = {
    speak: (u: any) => {
      spokenTexts.push(u.text)
      setTimeout(() => u.onend?.(), 0)
    },
    cancel: () => {
      cancelCalls += 1
    },
    getVoices: () => [],
  }
  ;(window as any).speechSynthesis = synth
  ;(window as any).SpeechSynthesisUtterance = class {
    text: string
    constructor(text: string) {
      this.text = text
    }
  }
})

// ── Tests ──────────────────────────────────────────────
describe('VoiceService (offline speech synthesis)', () => {
  it('speaks a message and replays it after the previous utterance finished', async () => {
    const p1 = VoiceService.speak('Hello ji')
    expect(spokenTexts).toHaveLength(1)

    // Wait for the first utterance to finish (onend fires)
    await flush()
    expect(spokenTexts).toHaveLength(1)

    // After the utterance finishes, replaying the same text is allowed
    const p2 = VoiceService.speak('Hello ji')
    expect(spokenTexts).toHaveLength(2)

    // Wait for the second utterance to finish
    await flush()
    expect(spokenTexts).toHaveLength(2)
  })

  it('does not interrupt a finished utterance', async () => {
    const p1 = VoiceService.speak('First')
    await p1

    const p2 = VoiceService.speak('Second')
    expect(await p2).toBe(true)
    expect(spokenTexts).toContain('Second')
  })

  it('does not replay the same text while it is still speaking', async () => {
    const p1 = VoiceService.speak('Busy')
    const p2 = VoiceService.speak('Busy')
    expect(await p2).toBe(false)
    expect(spokenTexts).toHaveLength(1)
    expect(await p1).toBe(true)
  })

  it('replaces the old utterance when a DIFFERENT text is requested', async () => {
    VoiceService.speak('First message')
    await flush()

    const pB = VoiceService.speak('Second message')
    await flush()

    expect(await pB).toBe(true)
    expect(spokenTexts).toContain('Second message')
  })

  it('discards an in-flight utterance when stop() is called', async () => {
    VoiceService.speak('This will be cancelled')
    await flush()

    VoiceService.stop()
    expect(VoiceService.isSpeaking()).toBe(false)
    expect(cancelCalls).toBeGreaterThan(0)
  })

  it('allows replaying the same text after the previous utterance finished (alternate)', async () => {
    const p1 = VoiceService.speak('Replay me')
    await flush()
    expect(await p1).toBe(true)
    expect(VoiceService.isSpeaking()).toBe(false)

    const p2 = VoiceService.speak('Replay me') // tap again works after finish
    await flush()
    expect(await p2).toBe(true)
  })

  it('falls back to browser speech and cancels it on stop()', async () => {
    const p = VoiceService.speak('Gentle fallback message with a longer tail that gets split into chunks for safety.')
    await flush()
    expect(spokenTexts.length).toBeGreaterThan(0) // fallback engaged
    expect(await p).toBe(true) // chunked speech completes

    VoiceService.stop()
    expect(cancelCalls).toBeGreaterThan(0)
    expect(VoiceService.isSpeaking()).toBe(false)
  })
})
