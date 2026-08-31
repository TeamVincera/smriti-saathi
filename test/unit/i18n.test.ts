import { describe, it, expect } from 'vitest'
import { translate } from '../../src/i18n'

describe('i18n Localization Engine', () => {
  it('translates basic keys in English', () => {
    expect(translate('en', 'brand')).toBe('Smriti Sathi')
    expect(translate('en', 'nav_home')).toBe('Home')
    expect(translate('en', 'nav_garden')).toBe('Garden')
    expect(translate('en', 'nav_meds')).toBe('Medicines')
  })

  it('translates keys in Hindi, Assamese, Bengali, Bodo, Manipuri', () => {
    expect(translate('hi', 'nav_home')).toBe('होम')
    expect(translate('as', 'nav_home')).toBe('ঘৰ')
    expect(translate('bn', 'nav_home')).toBe('হোম')
    expect(translate('brx', 'nav_home')).toBe('गोज़ों')
    expect(translate('mni', 'nav_home')).toBe('ꯌꯨꯝ')
  })

  it('interpolates template variables correctly', () => {
    const welcome = translate('en', 'welcome', { name: 'Sarala' })
    expect(welcome).toBe('Hello Sarala, ready for today?')

    const sessionMsg = translate('en', 'sessions_today', { n: 2, max: 3 })
    expect(sessionMsg).toBe('2 of 3 sessions done today')
  })

  it('translates regional language taglines', () => {
    const text = translate('as', 'tagline')
    expect(text).toBe('আপোনাৰ স্মৃতিৰ বন্ধু')
  })

  it('returns key string itself if not found in any dictionary', () => {
    const nonexistent = translate('en', 'non_existent_key_xyz')
    expect(nonexistent).toBe('non_existent_key_xyz')
  })
})
