import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  useApp: vi.fn(),
  listener: null as ((alarm: unknown) => void) | null,
  speak: vi.fn().mockResolvedValue(true),
  stop: vi.fn(),
}))

vi.mock('../../src/state', () => ({ useApp: mocks.useApp }))
vi.mock('../../src/lib/voice', () => ({
  VoiceService: {
    speak: mocks.speak,
    stop: mocks.stop,
  },
}))
vi.mock('../../src/lib/reminders', () => ({
  subscribeReminders: (listener: (alarm: unknown) => void) => {
    mocks.listener = listener
    listener(null)
    return () => {
      if (mocks.listener === listener) mocks.listener = null
    }
  },
  confirmAlarm: vi.fn().mockResolvedValue(undefined),
  snoozeAlarm: vi.fn().mockResolvedValue(undefined),
}))

import { ReminderOverlay } from '../../src/components/ReminderOverlay'
import { translate } from '../../src/i18n'
import type { Language } from '../../src/lib/types'

const languages: Language[] = ['en', 'hi', 'as', 'bn', 'brx', 'mni']

describe('ReminderOverlay localized badges', () => {
  afterEach(() => {
    cleanup()
    mocks.listener = null
    vi.clearAllMocks()
  })

  it.each(languages)('renders appointment semantics in %s', async (lang) => {
    const t = (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars)
    mocks.useApp.mockReturnValue({
      lang,
      profile: { patient: { name: 'Sarala Devi', avatar: '👵' } },
      t,
    } as never)

    render(<ReminderOverlay />)
    await act(async () => {
      mocks.listener?.({
        id: 'appointment-1',
        key: 'appointment-1',
        type: 'appointment',
        title: 'Doctor visit',
        subtitle: 'Clinic',
        emoji: '🩺',
        time: '10:00',
      })
    })

    expect(screen.getByRole('alertdialog')).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('alertdialog')).toHaveTextContent(t('reminder_badge_appointment'))
    expect(screen.getByRole('button', { name: t('taken_btn') })).toBeInTheDocument()
  })
})
