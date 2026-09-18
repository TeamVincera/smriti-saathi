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

  it('translates no_appointments and cat_language across all 6 languages', () => {
    const langs = ['en', 'hi', 'as', 'bn', 'brx', 'mni'] as const
    for (const lang of langs) {
      const noAppt = translate(lang, 'no_appointments')
      expect(noAppt).not.toBe('no_appointments')
      expect(noAppt.length).toBeGreaterThan(0)

      const catLang = translate(lang, 'cat_language')
      expect(catLang).not.toBe('cat_language')
      expect(catLang.length).toBeGreaterThan(0)
    }
  })

  it('keeps the offline daily plan copy available in all 6 languages', () => {
    const langs = ['en', 'hi', 'as', 'bn', 'brx', 'mni'] as const
    const keys = [
      'plan_title',
      'plan_subtitle',
      'plan_privacy',
      'plan_empty',
      'plan_kind_medicine',
      'plan_kind_reminder',
      'plan_kind_appointment',
      'plan_done',
      'plan_today',
      'plan_item_aria',
      'plan_show_more',
      'plan_show_less',
    ]
    for (const lang of langs) {
      for (const key of keys) expect(translate(lang, key, { kind: 'Reminder', title: 'Water', date: 'Today', time: '10:00' })).not.toBe(key)
    }
    expect(translate('bn', 'plan_title')).not.toBe(translate('as', 'plan_title'))
  })

  it('keeps the offline session coach visible and actionable in all 6 languages', () => {
    const langs = ['en', 'hi', 'as', 'bn', 'brx', 'mni'] as const
    const keys = [
      'coach_celebrate_title',
      'coach_celebrate_body',
      'coach_celebrate_action',
      'coach_gentler_title',
      'coach_gentler_body',
      'coach_gentler_action',
      'coach_repeat_title',
      'coach_repeat_body',
      'coach_repeat_action',
      'coach_rest_title',
      'coach_rest_body',
      'coach_rest_action',
      'coach_privacy',
    ]
    for (const lang of langs) {
      for (const key of keys) expect(translate(lang, key)).not.toBe(key)
    }
    expect(translate('bn', 'coach_gentler_title')).not.toBe(translate('as', 'coach_gentler_title'))
  })

  it('keeps shell errors and destructive confirmations localized in all 6 languages', () => {
    const langs = ['en', 'hi', 'as', 'bn', 'brx', 'mni'] as const
    const keys = [
      'route_error_title',
      'route_error_body',
      'route_error_retry',
      'confirm_remove_title',
      'confirm_remove_body',
      'confirm_remove_confirm',
      'confirm_reset_title',
      'confirm_reset_body',
      'confirm_reset_confirm',
      'hub_tts_label',
      'hub_tts_ready',
      'hub_cloud_ai_label',
      'hub_cloud_ai_available',
      'hub_ai_privacy_note',
    ]
    for (const lang of langs) {
      for (const key of keys) expect(translate(lang, key, { name: 'Asha' })).not.toBe(key)
    }
  })
})
