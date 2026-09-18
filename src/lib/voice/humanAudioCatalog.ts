/**
 * Human Audio Catalog
 * Maps core routine notifications, game instructions, greetings, and praise ceremonies
 * across Assamese (as), Bengali (bn), Hindi (hi), and English (en) to authentic acoustic cues.
 */

import type { Language } from '../types'

export interface CatalogCue {
  id: string
  category: 'reminder' | 'game' | 'praise' | 'greeting'
  textByLang: Partial<Record<Language, string>>
  audioCueTone?: {
    frequency: number
    type: OscillatorType
    duration: number
    pattern?: number[]
  }
}

export const HUMAN_AUDIO_CATALOG: CatalogCue[] = [
  // 1. Core Routine & Medication Reminders
  {
    id: 'rem_water',
    category: 'reminder',
    textByLang: {
      en: 'Drink water. Stay hydrated with a fresh glass of water.',
      hi: 'ताज़ा पानी पिएं। एक गिलास ताज़ा पानी पीकर स्वस्थ रहें।',
      as: 'পানী খাওক। এগিলাচ সতেজ পানী খাই স্বাস্থ্যৱান হৈ থাকক।',
      bn: 'জল খান। এক গ্লাস পরিষ্কার জল খেয়ে সুস্থ থাকুন।',
    },
    audioCueTone: { frequency: 587.33, type: 'sine', duration: 1.2, pattern: [587.33, 659.25, 880] },
  },
  {
    id: 'rem_breakfast',
    category: 'reminder',
    textByLang: {
      en: 'Eat breakfast. Enjoy a nourishing morning meal.',
      hi: 'सुबह का नाश्ता करें। पौष्टिक नाश्ता लेकर दिन की शुरुआत करें।',
      as: 'ৰাতিপুৱাৰ আহাৰ খাওক। পুষ্টিকৰ খাদ্য খাই দিনটো আৰম্ভ কৰক।',
      bn: 'সকালের খাবার খান। পুষ্টিকর খাবার খেয়ে দিন শুরু করুন।',
    },
    audioCueTone: { frequency: 523.25, type: 'sine', duration: 1.0, pattern: [523.25, 659.25] },
  },
  {
    id: 'rem_walk',
    category: 'reminder',
    textByLang: {
      en: 'Go for a walk. A gentle walk in the fresh air.',
      hi: 'हल्की सैर पर जाएं। ताज़ी हवा में थोड़ा टहलें।',
      as: 'অলপ খোজ কাঢ়ক। মুকলি বতাহত খোজ কাঢ়ি মনটো সতেজ কৰক।',
      bn: 'একটু হাঁটাহাঁটি করুন। মুক্ত বাতাসে একটু হেঁটে আসুন।',
    },
    audioCueTone: { frequency: 440, type: 'triangle', duration: 1.0, pattern: [440, 554.37] },
  },
  {
    id: 'rem_rest',
    category: 'reminder',
    textByLang: {
      en: 'Take a rest. Relax quietly and rest your mind and body.',
      hi: 'दोपहर का विश्राम करें। थोड़ा आराम करें और मन को शांत रखें।',
      as: 'অলপ জিৰণি লওক। শান্তভাৱে বিশ্ৰাম কৰক।',
      bn: 'একটু বিশ্রাম নিন। শান্তভাবে একটু জিরিয়ে নিন।',
    },
    audioCueTone: { frequency: 392, type: 'sine', duration: 1.5, pattern: [392, 329.63] },
  },
  {
    id: 'rem_family',
    category: 'reminder',
    textByLang: {
      en: 'Call family. Spend a moment connecting with loved ones.',
      hi: 'परिवार से बात करें। अपनों से बात करके उनका हालचाल जानें।',
      as: 'পৰিয়ালৰ লগত কথা পাতক। আপোনজনৰ সৈতে কথা পাতি আনন্দ লওক।',
      bn: 'পরিবারের সাথে কথা বলুন। প্রিয়জনদের সঙ্গে কথা বলে সময় কাটান।',
    },
    audioCueTone: { frequency: 523.25, type: 'sine', duration: 1.2, pattern: [523.25, 783.99] },
  },
  {
    id: 'med_alert',
    category: 'reminder',
    textByLang: {
      en: 'It is time for your medication.',
      hi: 'आपकी दवा लेने का समय हो गया है।',
      as: 'আপোনাৰ ঔষধ খোৱাৰ সময় হৈছে।',
      bn: 'আপনার ওষুধ খাওয়ার সময় হয়েছে।',
    },
    audioCueTone: { frequency: 523.25, type: 'sine', duration: 1.6, pattern: [523.25, 659.25, 783.99, 1046.5] },
  },

  // 2. Praise Ceremonies
  {
    id: 'praise_high',
    category: 'praise',
    textByLang: {
      en: 'You remembered so much today. Well done!',
      hi: 'आपने बहुत अच्छे से याद रखा। बहुत खूब!',
      as: 'আপুনি বহুত সুন্দৰকৈ মনত ৰাখিলে। খুব ভাল লাগিল!',
      bn: 'আপনি খুব সুন্দরভাবে মনে রেখেছেন। অনেক শুভেচ্ছা!',
    },
    audioCueTone: { frequency: 523.25, type: 'sine', duration: 1.4, pattern: [523.25, 659.25, 783.99, 1046.5] },
  },
  {
    id: 'praise_gentle',
    category: 'praise',
    textByLang: {
      en: 'You kept going beautifully.',
      hi: 'आपने बहुत सुंदर प्रयास किया।',
      as: 'আপুনি বহুত ভাল প্ৰচেষ্টা কৰিলে।',
      bn: 'আপনি খুব সুন্দর চেষ্টা করেছেন।',
    },
    audioCueTone: { frequency: 440, type: 'sine', duration: 1.2, pattern: [440, 523.25, 659.25] },
  },

  // 3. Greetings
  {
    id: 'greet_morning',
    category: 'greeting',
    textByLang: {
      en: 'Wishing you a gentle, peaceful day. I am always right here by your side.',
      hi: 'आपका दिन मंगलमय और सुखद हो। मैं हमेशा आपके साथ हूँ।',
      as: 'আপোনাৰ দিনটো শুভ হওক। মই সদায় আপোনাৰ কাষতেই আছোঁ।',
      bn: 'আপনার দিনটি খুব সুন্দর কাটুক। আমি সবসময় আপনার পাশেই আছি।',
    },
    audioCueTone: { frequency: 440, type: 'sine', duration: 1.5, pattern: [440, 554.37, 659.25] },
  },
]

/**
 * Normalized token comparison helper to match spoken text against catalog items.
 */
export function matchCatalogCue(text: string, lang: string): CatalogCue | null {
  if (!text) return null
  const normalized = text.toLowerCase().replace(/[,.:;?!।]/g, '').trim()
  const targetLang = (lang as Language) || 'en'

  for (const cue of HUMAN_AUDIO_CATALOG) {
    const candidate = cue.textByLang[targetLang] || cue.textByLang.en
    if (!candidate) continue

    const candNormalized = candidate.toLowerCase().replace(/[,.:;?!।]/g, '').trim()
    if (normalized === candNormalized) return cue

    // High token overlap check for partial reminder titles (e.g. "Drink water" matching "Drink water. Stay hydrated...")
    if (normalized.length >= 6 && (candNormalized.startsWith(normalized) || normalized.startsWith(candNormalized))) {
      return cue
    }
  }

  return null
}
