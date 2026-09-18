/**
 * Sarvam Speech Service
 * High-fidelity Indic conversational TTS using Sarvam Bulbul V3 for Hindi, Bengali, and English.
 */

import { ENV_CONFIG } from '../config'
import { requestAiSpeech } from '../ai/proxyClient'
import { isAIAvailable } from '../ai/availability'

const SARVAM_LANG_MAP: Record<string, string> = {
  hi: 'hi-IN',
  bn: 'bn-IN',
  en: 'en-IN',
}

export const SARVAM_VOICE_PROFILE = 'sarvam-bulbul-v3-shreya-0.9'

export class SarvamSpeechServiceClass {
  public isConfigured(): boolean {
    return true
  }

  public supportsLang(lang: string): boolean {
    return Boolean(SARVAM_LANG_MAP[lang.toLowerCase()])
  }

  public async synthesize(text: string, lang: string): Promise<Blob | null> {
    if (!this.isConfigured() || !ENV_CONFIG.isOnline || !isAIAvailable()) {
      return null
    }

    const targetLangCode = SARVAM_LANG_MAP[lang.toLowerCase()]
    if (!targetLangCode) {
      return null
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
      timeoutId = controller ? setTimeout(() => controller.abort(), 6000) : null

      return await requestAiSpeech({ provider: 'sarvam', text, lang, voiceProfile: SARVAM_VOICE_PROFILE }, controller?.signal)
    } catch {
      return null
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }
}

export const SarvamSpeechService = new SarvamSpeechServiceClass()
