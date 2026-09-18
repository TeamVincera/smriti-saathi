/**
 * Azure Speech Service
 * High-fidelity neural voice synthesis client for Assamese, Bengali, Hindi, and Indian English.
 */

import { ENV_CONFIG } from '../config'
import { requestAiSpeech } from '../ai/proxyClient'
import { isAIAvailable } from '../ai/availability'

const AZURE_VOICE_MAP: Record<string, { voice: string; lang: string }> = {
  as: { voice: 'as-IN-YashmitaNeural', lang: 'as-IN' },
  bn: { voice: 'bn-IN-TanishaaNeural', lang: 'bn-IN' },
  hi: { voice: 'hi-IN-SwaraNeural', lang: 'hi-IN' },
  en: { voice: 'en-IN-NeerjaNeural', lang: 'en-IN' },
}

export const AZURE_VOICE_PROFILE = 'azure-neural-gentle-v2'

const AZURE_PROSODY: Record<string, { rate: string; pitch: string; volume: string }> = {
  as: { rate: '-12%', pitch: '+1st', volume: '-1dB' },
  bn: { rate: '-10%', pitch: '+0.5st', volume: '-1dB' },
  hi: { rate: '-10%', pitch: '+0.5st', volume: '-1dB' },
  en: { rate: '-10%', pitch: '0st', volume: '-1dB' },
}

export class AzureSpeechServiceClass {
  public isConfigured(): boolean {
    return true
  }

  public getVoiceForLang(lang: string): { voice: string; lang: string } {
    return AZURE_VOICE_MAP[lang.toLowerCase()] || AZURE_VOICE_MAP.en
  }

  public supportsLang(lang: string): boolean {
    return Boolean(AZURE_VOICE_MAP[lang.toLowerCase()])
  }

  public buildSSML(text: string, lang: string): string | null {
    if (!this.supportsLang(lang)) return null
    const { voice, lang: xmlLang } = this.getVoiceForLang(lang)
    const language = AZURE_PROSODY[lang.toLowerCase()] ? lang.toLowerCase() : 'en'
    const prosody = AZURE_PROSODY[language]
    const paragraphs = text.replace(/\r\n?/g, '\n').trim().split(/\n{2,}/).filter(Boolean)
    const markup = paragraphs.map((paragraph) => {
      const sentences = paragraph.trim().split(/(?<=[.!?।॥])\s+/u).filter(Boolean)
      return sentences.map((sentence, index) => `${sentence.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')}${index < sentences.length - 1 ? "<break time='280ms'/>" : ''}`).join(' ')
    }).join("<break time='520ms'/>")

    return `<speak version='1.0' xml:lang='${xmlLang}'>
  <voice xml:lang='${xmlLang}' name='${voice}'>
    <prosody rate='${prosody.rate}' pitch='${prosody.pitch}' volume='${prosody.volume}'>${markup}</prosody>
  </voice>
</speak>`
  }

  public async synthesize(text: string, lang: string): Promise<Blob | null> {
    if (!this.isConfigured() || !this.supportsLang(lang) || !ENV_CONFIG.isOnline || !isAIAvailable()) {
      return null
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
      timeoutId = controller ? setTimeout(() => controller.abort(), 6000) : null

      return await requestAiSpeech({ provider: 'azure', text, lang, voiceProfile: AZURE_VOICE_PROFILE }, controller?.signal)
    } catch {
      return null
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }
}

export const AzureSpeechService = new AzureSpeechServiceClass()
