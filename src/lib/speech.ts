import type { Language } from './types'

export const BCP: Record<Language, string> = {
  as: 'as-IN',
  bn: 'bn-IN',
  brx: 'brx-IN',
  mni: 'mni-IN',
  hi: 'hi-IN',
  en: 'en-IN',
}

const FALLBACK: Record<Language, string[]> = {
  as: ['bn-IN', 'hi-IN', 'en-IN'],
  bn: ['as-IN', 'hi-IN', 'en-IN'],
  brx: ['hi-IN', 'bn-IN', 'en-IN'],
  mni: ['bn-IN', 'hi-IN', 'en-IN'],
  hi: ['hi-IN', 'bn-IN', 'en-IN'],
  en: ['en-IN', 'en-GB', 'en-US', 'en-AU', 'en'],
}

// Preferred high-quality natural/neural voice keywords (sorted by quality)
const NATURAL_VOICE_KEYWORDS = [
  'enhanced',
  'premium',
  'natural',
  'neural',
  'siri',
  'google',
  'online (natural)',
  'samantha',
  'rishi',
  'neerja',
  'swara',
  'lekha',
  'veena',
  'ava',
  'serena',
  'karen',
  'daniel',
  'moira',
  'zira',
  'jenny',
  'guy',
]

// Penalty keywords for robotic legacy synthesizers
const ROBOTIC_VOICE_KEYWORDS = [
  'compact',
  'espeak',
  'klatt',
  'whisper',
  'bad',
  'speech-dispatcher',
  'robotic',
]

let voicesCache: SpeechSynthesisVoice[] = []
let voicesLoaded = false

function refreshVoices(): SpeechSynthesisVoice[] {
  if (typeof speechSynthesis === 'undefined') return []
  voicesCache = speechSynthesis.getVoices()
  if (voicesCache.length > 0) voicesLoaded = true
  return voicesCache
}

if (typeof speechSynthesis !== 'undefined') {
  refreshVoices()
  speechSynthesis.onvoiceschanged = () => {
    refreshVoices()
  }
}

export function ttsSupported(): boolean {
  return typeof speechSynthesis !== 'undefined'
}

export interface VoiceOption {
  name: string
  lang: string
  voiceURI: string
  isNatural: boolean
  score: number
  voice: SpeechSynthesisVoice
}

export function scoreVoice(v: SpeechSynthesisVoice, targetLang: Language): number {
  let score = 0
  const nameLower = v.name.toLowerCase()
  const vLang = v.lang.replace('_', '-')
  const targetCode = BCP[targetLang]
  const targetBase = targetCode.split('-')[0]

  // Language match scoring
  if (vLang === targetCode) score += 100
  else if (vLang.startsWith(targetBase)) score += 80
  else if (FALLBACK[targetLang].some((code) => vLang === code)) score += 40
  else if (FALLBACK[targetLang].some((code) => vLang.startsWith(code.split('-')[0]))) score += 20
  else score -= 150

  // Natural / Neural human quality heuristics
  for (const kw of NATURAL_VOICE_KEYWORDS) {
    if (nameLower.includes(kw)) {
      score += 40
      if (kw === 'enhanced' || kw === 'neural' || kw === 'natural') score += 50
    }
  }

  // Demote robotic voices
  for (const kw of ROBOTIC_VOICE_KEYWORDS) {
    if (nameLower.includes(kw)) score -= 80
  }

  // Local vs remote service quality
  if (v.localService) score += 10

  return score
}

export function getAvailableVoices(lang: Language): VoiceOption[] {
  const all = voicesCache.length > 0 ? voicesCache : refreshVoices()
  const scored = all.map((v) => {
    const s = scoreVoice(v, lang)
    const nameLower = v.name.toLowerCase()
    const isNatural = NATURAL_VOICE_KEYWORDS.some((kw) => nameLower.includes(kw))
    return { name: v.name, lang: v.lang, voiceURI: v.voiceURI, isNatural, score: s, voice: v }
  })
  return scored.sort((a, b) => b.score - a.score)
}

export function getPreferredVoiceURI(): string | null {
  try {
    return localStorage.getItem('ss_pref_voice_uri')
  } catch {
    return null
  }
}

export function setPreferredVoiceURI(uri: string | null) {
  try {
    if (uri) localStorage.setItem('ss_pref_voice_uri', uri)
    else localStorage.removeItem('ss_pref_voice_uri')
  } catch {}
}

export function getVoiceSpeed(): number {
  try {
    const raw = localStorage.getItem('ss_voice_speed')
    if (raw) return Math.min(1.2, Math.max(0.7, parseFloat(raw)))
  } catch {}
  return 0.9 // Soothing, clear, human pace suited for dementia patients
}

export function setVoiceSpeed(val: number) {
  try {
    localStorage.setItem('ss_voice_speed', String(val))
  } catch {}
}

export function getVoicePitch(): number {
  try {
    const raw = localStorage.getItem('ss_voice_pitch')
    if (raw) return Math.min(1.3, Math.max(0.8, parseFloat(raw)))
  } catch {}
  return 1.02 // Warm, natural human pitch
}

export function setVoicePitch(val: number) {
  try {
    localStorage.setItem('ss_voice_pitch', String(val))
  } catch {}
}

export function pickBestVoice(lang: Language): SpeechSynthesisVoice | null {
  if (!ttsSupported()) return null
  if (!voicesLoaded || voicesCache.length === 0) refreshVoices()

  const prefUri = getPreferredVoiceURI()
  if (prefUri) {
    const chosen = voicesCache.find((v) => v.voiceURI === prefUri)
    if (chosen) return chosen
  }

  const options = getAvailableVoices(lang)
  if (options.length > 0 && options[0].score > -50) {
    return options[0].voice
  }

  const wanted = BCP[lang]
  const chain = [wanted, ...FALLBACK[lang]]
  for (const code of chain) {
    const base = code.split('-')[0]
    const v =
      voicesCache.find((v) => v.lang.replace('_', '-') === code) ??
      voicesCache.find((v) => v.lang.startsWith(base))
    if (v) return v
  }

  return voicesCache[0] ?? null
}

/**
 * Normalizes text to make TTS pronunciation sound natural and human-like
 */
export function normalizeTextForSpeech(text: string, lang: Language): string {
  if (!text) return ''
  let t = text

  // Expand currency symbols
  if (lang === 'hi') {
    t = t.replace(/₹\s*(\d+)/g, '$1 रुपये')
  } else {
    t = t.replace(/₹\s*(\d+)/g, '$1 rupees')
  }

  // Expand medicine food abbreviations
  t = t.replace(/🍽️\s*→\s*💊/g, lang === 'hi' ? 'खाने से पहले' : 'before meals')
  t = t.replace(/💊\s*→\s*🍽️/g, lang === 'hi' ? 'खाने के बाद' : 'after meals')

  // Remove excessive decorative emoji symbols before speaking
  t = t.replace(/[\u{1F300}-\u{1FAFF}]/gu, '')

  // Clean double spaces
  t = t.replace(/\s+/g, ' ').trim()

  return t
}

export function speak(text: string, lang: Language = 'en'): Promise<void> {
  return new Promise((resolve) => {
    if (!ttsSupported() || !text) return resolve()

    const cleanText = normalizeTextForSpeech(text, lang)
    if (!cleanText) return resolve()

    speechSynthesis.cancel()

    const u = new SpeechSynthesisUtterance(cleanText)
    u.lang = BCP[lang]

    const voice = pickBestVoice(lang)
    if (voice) {
      u.voice = voice
    }

    u.rate = getVoiceSpeed()
    u.pitch = getVoicePitch()
    u.volume = 1

    u.onend = () => resolve()
    u.onerror = () => resolve()

    // Safety timeout in case browser TTS gets stuck
    const safeDuration = Math.min(14000, 2800 + cleanText.length * 100)
    const timeout = setTimeout(() => resolve(), safeDuration)

    u.onend = () => {
      clearTimeout(timeout)
      resolve()
    }

    speechSynthesis.speak(u)
  })
}

export function stopSpeaking() {
  if (ttsSupported()) speechSynthesis.cancel()
}

type SRWindow = Window & { SpeechRecognition?: any; webkitSpeechRecognition?: any }

export function asrSupported(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as SRWindow
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition)
}

export function listenOnce(lang: Language = 'en', timeoutMs = 6000): Promise<string | null> {
  return new Promise((resolve) => {
    const w = window as SRWindow
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!Ctor) return resolve(null)
    const rec = new Ctor()
    rec.lang = BCP[lang]
    rec.maxAlternatives = 1
    rec.interimResults = false
    let settled = false
    const done = (val: string | null) => {
      if (settled) return
      settled = true
      try {
        rec.stop()
      } catch {}
      resolve(val)
    }
    rec.onresult = (e: any) => done(e.results?.[0]?.[0]?.transcript ?? null)
    rec.onerror = () => done(null)
    rec.onend = () => done(null)
    try {
      rec.start()
    } catch {
      done(null)
    }
    setTimeout(() => done(null), timeoutMs)
  })
}
