import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('../../src/lib/ai/availability', () => ({ isAIAvailable: () => true }))
import {
  VoiceService,
  neutralizeGenderWords,
  matchCatalogCue,
  HUMAN_AUDIO_CATALOG,
  AzureSpeechService,
  SarvamSpeechService,
  getCachedVoice,
  setCachedVoice,
} from '../../src/lib/voice'
import { getBrowserSpeechProfile } from '../../src/lib/voice/VoiceService'

describe('VoiceService & Human Voice Architecture', () => {
  beforeEach(() => {
    VoiceService.stop()
  })

  describe('Gender Neutralization Filter', () => {
    it('neutralizes gendered pronouns and words in English', () => {
      expect(neutralizeGenderWords('He went to see his mother')).toBe('They went to see their parent')
      expect(neutralizeGenderWords('She loves her grandfather')).toBe('They loves their elder')
      expect(neutralizeGenderWords('Hello sir, please take your tablet')).toBe('Hello, please take your tablet')
    })

    it('neutralizes gendered terms in Hindi', () => {
      expect(neutralizeGenderWords('नमस्ते दादी जी, दवा ले लीजिए')).toBe('नमस्ते स्वजन जी, दवा ले लीजिए')
      expect(neutralizeGenderWords('माता और पिता का आशीर्वाद')).toBe('अभिभावक और अभिभावक का आशीर्वाद')
      expect(neutralizeGenderWords('बेटा बहुत अच्छा प्रयास किया')).toBe('बच्चा बहुत अच्छा प्रयास किया')
    })
  })

  describe('Human Audio Catalog', () => {
    it('contains essential daily routine reminders in North-Eastern & Indic languages', () => {
      const waterCue = HUMAN_AUDIO_CATALOG.find((c) => c.id === 'rem_water')
      expect(waterCue).toBeDefined()
      expect(waterCue?.textByLang.en).toContain('Drink water')
      expect(waterCue?.textByLang.hi).toContain('ताज़ा पानी पिएं')
      expect(waterCue?.textByLang.as).toContain('পানী খাওক')
      expect(waterCue?.textByLang.bn).toContain('জল খান')
    })

    it('matches exact and partial reminder spoken text', () => {
      const matchEn = matchCatalogCue('Drink water. Stay hydrated with a fresh glass of water.', 'en')
      expect(matchEn?.id).toBe('rem_water')

      const matchHi = matchCatalogCue('ताज़ा पानी पिएं', 'hi')
      expect(matchHi?.id).toBe('rem_water')

      const matchAs = matchCatalogCue('পানী খাওক', 'as')
      expect(matchAs?.id).toBe('rem_water')

      const matchBn = matchCatalogCue('জল খান', 'bn')
      expect(matchBn?.id).toBe('rem_water')
    })

    it('matches praise and celebration ceremony text', () => {
      const praiseMatch = matchCatalogCue('You remembered so much today. Well done!', 'en')
      expect(praiseMatch?.id).toBe('praise_high')
    })
  })

  describe('Azure Speech Service', () => {
    it('selects native neural voices for Assamese, Bengali, Hindi, and English', () => {
      expect(AzureSpeechService.getVoiceForLang('as').voice).toBe('as-IN-YashmitaNeural')
      expect(AzureSpeechService.getVoiceForLang('bn').voice).toBe('bn-IN-TanishaaNeural')
      expect(AzureSpeechService.getVoiceForLang('hi').voice).toBe('hi-IN-SwaraNeural')
      expect(AzureSpeechService.getVoiceForLang('en').voice).toBe('en-IN-NeerjaNeural')
    })

    it('generates valid SSML with dementia-friendly slower prosody rate', () => {
      const ssml = AzureSpeechService.buildSSML('Hello friend', 'en')
      expect(ssml).toContain("<speak version='1.0'")
      expect(ssml).toContain("name='en-IN-NeerjaNeural'")
      expect(ssml).toContain("rate='-10%'")
      expect(ssml).toContain('Hello friend')
    })

    it('escapes special XML characters in SSML', () => {
      const ssml = AzureSpeechService.buildSSML('Salt & Pepper <warm> "care"', 'en')
      expect(ssml).toContain('Salt &amp; Pepper &lt;warm&gt; &quot;care&quot;')
    })
  })

  describe('Sarvam Speech Service', () => {
    it('supports Hindi, Bengali, and Indian English with Bulbul v3', () => {
      expect(SarvamSpeechService.supportsLang('hi')).toBe(true)
      expect(SarvamSpeechService.supportsLang('bn')).toBe(true)
      expect(SarvamSpeechService.supportsLang('en')).toBe(true)
      expect(SarvamSpeechService.supportsLang('fr')).toBe(false)
    })
  })

  describe('Voice Cache', () => {
    it('caches audio Blobs in memory and returns them accurately', async () => {
      const dummyBlob = new Blob(['dummy audio content'], { type: 'audio/wav' })
      await setCachedVoice('Test voice phrase', 'en', dummyBlob)

      const retrieved = await getCachedVoice('Test voice phrase', 'en')
      expect(retrieved).not.toBeNull()
      expect(retrieved?.size).toBe(dummyBlob.size)
    })
  })

  describe('VoiceService Orchestration', () => {
    it('returns false for empty or whitespace text', async () => {
      const res = await VoiceService.speak('   ')
      expect(res).toBe(false)
    })

    it('tracks active speech and handles stop() cleanly', async () => {
      expect(VoiceService.isSpeaking()).toBe(false)
      VoiceService.stop()
      expect(VoiceService.isSpeaking()).toBe(false)
    })

    it('aborts blob playback before revoking its object URL', async () => {
      const previousAudio = (globalThis as any).Audio
      const previousCreate = URL.createObjectURL
      const previousRevoke = URL.revokeObjectURL
      const revoke = vi.fn()
      class MockAudio {
        public onended: (() => void) | null = null
        public onerror: (() => void) | null = null
        public removed = false
        public loaded = false
        public play = vi.fn(() => Promise.resolve())
        public pause = vi.fn()
        public currentTime = 0
        constructor(public src: string) {}
        removeAttribute(name: string) { if (name === 'src') this.removed = true }
        load() { this.loaded = true }
      }

      vi.stubGlobal('Audio', MockAudio)
      URL.createObjectURL = vi.fn(() => 'blob:stop-order')
      URL.revokeObjectURL = revoke
      await setCachedVoice('Stop order check', 'en', new Blob(['audio'], { type: 'audio/wav' }))
      VoiceService.speak('Stop order check', { language: 'en', engine: 'neural' })
      const audio = (VoiceService as any).currentAudio as MockAudio
      VoiceService.stop()

      expect(audio.removed).toBe(true)
      expect(audio.loaded).toBe(true)
      expect(revoke).toHaveBeenCalledWith('blob:stop-order')
      URL.createObjectURL = previousCreate
      URL.revokeObjectURL = previousRevoke
      vi.stubGlobal('Audio', previousAudio)
    })

    it('falls back to Web Speech when cached audio emits a playback error', async () => {
      const phrase = 'Cached playback fallback check'
      const speech = vi.fn()
      const cancel = vi.fn()
      const previousSpeechSynthesis = window.speechSynthesis
      const previousUtterance = (globalThis as any).SpeechSynthesisUtterance
      const previousAudio = (globalThis as any).Audio

      class FailingAudio {
        public onended: (() => void) | null = null
        public onerror: (() => void) | null = null
        public play = vi.fn(() => Promise.resolve())
        public pause = vi.fn()
        public currentTime = 0
        constructor(public readonly src: string) {}
      }
      class MockUtterance {
        public rate = 0
        public pitch = 0
        public lang = ''
        public voice: SpeechSynthesisVoice | null = null
        public onend: (() => void) | null = null
        public onerror: (() => void) | null = null
        constructor(public readonly text: string) {}
      }

      vi.stubGlobal('Audio', FailingAudio)
      vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance)
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        value: { cancel, getVoices: () => [], speak: speech },
      })
      URL.createObjectURL = vi.fn(() => 'blob:voice-fallback')
      URL.revokeObjectURL = vi.fn()

      await setCachedVoice(phrase, 'en', new Blob(['audio']))
      const playback = VoiceService.speak(phrase, { language: 'en', engine: 'neural' })
      const audio = (VoiceService as any).currentAudio as FailingAudio
      audio.onerror?.()
      await new Promise((resolve) => setTimeout(resolve, 220))
      const utterance = speech.mock.calls[0]?.[0]
      utterance?.onend?.()

      await expect(playback).resolves.toBe(true)
      expect(speech).toHaveBeenCalledTimes(1)
      expect(speech.mock.calls[0][0].text).toBe(phrase)

      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: previousSpeechSynthesis })
      vi.stubGlobal('SpeechSynthesisUtterance', previousUtterance)
      vi.stubGlobal('Audio', previousAudio)
    })

    it('uses slower language profiles and resolves only after the final browser utterance', async () => {
      const utterances: any[] = []
      const listeners = new Map<string, EventListener>()
      const previousUtterance = (globalThis as any).SpeechSynthesisUtterance
      const previousSpeechSynthesis = window.speechSynthesis
      class MockUtterance {
        public rate = 0
        public pitch = 0
        public lang = ''
        public voice: SpeechSynthesisVoice | null = null
        public onend: (() => void) | null = null
        public onerror: ((event: any) => void) | null = null
        constructor(public readonly text: string) {}
      }
      const speechSynthesis = {
        cancel: vi.fn(),
        getVoices: () => [{ lang: 'hi-IN', name: 'Hindi Neural' }],
        addEventListener: (type: string, listener: EventListener) => listeners.set(type, listener),
        speak: vi.fn((utterance: MockUtterance) => utterances.push(utterance)),
      }
      vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance)
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: speechSynthesis })

      expect(getBrowserSpeechProfile('hi').rate).toBeLessThan(getBrowserSpeechProfile('en').rate)
      const playback = VoiceService.speak('पहला वाक्य। '.repeat(30), { language: 'hi', engine: 'webspeech' })
      await new Promise((resolve) => setTimeout(resolve, 220))
      expect(utterances).toHaveLength(1)
      expect(utterances[0].lang).toBe('hi-IN')
      expect(utterances[0].rate).toBe(0.82)
      expect(await Promise.race([playback.then(() => 'done'), Promise.resolve('pending')])).toBe('pending')

      utterances[0].onend?.()
      expect(utterances).toHaveLength(2)
      utterances[1].onend?.()
      await expect(playback).resolves.toBe(true)
      expect(listeners.has('voiceschanged')).toBe(true)

      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: previousSpeechSynthesis })
      vi.stubGlobal('SpeechSynthesisUtterance', previousUtterance)
    })

    it('resolves an interrupted browser utterance as false and does not continue old chunks', async () => {
      const utterances: any[] = []
      const previousUtterance = (globalThis as any).SpeechSynthesisUtterance
      const previousSpeechSynthesis = window.speechSynthesis
      class MockUtterance {
        public rate = 0
        public pitch = 0
        public lang = ''
        public voice: SpeechSynthesisVoice | null = null
        public onend: (() => void) | null = null
        public onerror: ((event: any) => void) | null = null
        constructor(public readonly text: string) {}
      }
      const speechSynthesis = {
        cancel: vi.fn(),
        getVoices: () => [],
        addEventListener: vi.fn(),
        speak: vi.fn((utterance: MockUtterance) => utterances.push(utterance)),
      }
      vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance)
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: speechSynthesis })

      const first = VoiceService.speak('First message.', { language: 'en', engine: 'webspeech' })
      const second = VoiceService.speak('Second message.', { language: 'en', engine: 'webspeech' })
      await expect(first).resolves.toBe(false)
      await new Promise((resolve) => setTimeout(resolve, 220))
      expect(utterances).toHaveLength(1)
      utterances[0].onend?.()
      await expect(second).resolves.toBe(true)

      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: previousSpeechSynthesis })
      vi.stubGlobal('SpeechSynthesisUtterance', previousUtterance)
    })
  })
})
