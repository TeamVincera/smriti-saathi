import { waitFor, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const startAIAvailability = vi.hoisted(() => vi.fn())

vi.mock('../../src/lib/ai/availability', () => ({
  startAIAvailability,
  isAIAvailable: () => true,
  useAIAvailable: () => true,
}))

vi.mock('../../src/state', () => ({
  AppProvider: ({ children }: { children: unknown }) => children,
  useApp: () => ({
    ready: true,
    profile: null,
    lang: 'en',
    setProfile: vi.fn(),
  }),
}))

vi.mock('../../src/lib/reminders', () => ({ startReminderEngine: vi.fn() }))
vi.mock('../../src/lib/alarmService', () => ({ initAlarmService: vi.fn() }))

describe('startup AI availability monitoring', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>'
    window.location.hash = ''
    startAIAvailability.mockClear()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('starts monitoring before onboarding and keeps the AI button hidden', async () => {
    await import('../../src/main')

    expect(startAIAvailability).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Choose your language' })).toBeInTheDocument())
    expect(screen.queryByTestId('ai-chat-btn')).not.toBeInTheDocument()
  })
})
