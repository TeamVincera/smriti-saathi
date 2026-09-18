import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/state', () => ({
  useApp: vi.fn(),
}))

vi.mock('../../src/router', () => ({
  navigate: vi.fn(),
}))

vi.mock('../../src/lib/ai', () => ({
  recommendNextGame: vi.fn(async () => ({ gameId: 'faces', difficulty: 0, exploration: false })),
  seedBaselineForColdStart: vi.fn(() => 1),
}))

vi.mock('../../src/lib/db', () => ({
  loadConfig: vi.fn(async () => ({})),
}))

import { useApp } from '../../src/state'
import { Home } from '../../src/screens/Home'
import { Onboarding } from '../../src/screens/Onboarding'

const mockedUseApp = vi.mocked(useApp)

function appState(overrides: Record<string, unknown> = {}) {
  return {
    profile: { patient: { name: 'Sarala Devi', avatar: '👵' } },
    sessionsToday: 3,
    dailyGameLimit: 3,
    sessions: [],
    lang: 'en',
    t: (key: string) => ({
      today_game: "Today's Recommended Game",
      more_games: 'Explore All Cognitive Games',
      start: 'Start',
      done: 'Done',
      praise_title: 'You did wonderfully!',
      rest_now: 'You have done wonderfully today. Rest now — your garden is blooming.',
      cat_all: 'All Games',
      cat_memory: 'Memory',
      cat_attention: 'Attention & Patterns',
      cat_language: 'Language & Stories',
      cat_auditory: 'Music & Sounds',
      cat_sequencing: 'Sequencing',
      aria_today_game: "Today's Game",
      home_tagline: "Let's start the day with a gentle mind exercise.",
      sessions_today: '3 of 3 sessions done today',
      home_daily_limit_reached: 'Daily limit reached',
      aria_filter_games: 'Filter games by activity',
      home_recommended: 'RECOMMENDED',
      home_default_game_description: 'Identify your loved ones in a calm setting.',
      game_locked: 'Locked',
      plan_title: "Today's gentle plan",
      plan_subtitle: 'A simple view of what is coming up.',
      plan_privacy: 'Made on this device. Your plan stays here.',
      plan_empty: 'Nothing is scheduled today. A quiet day is okay.',
    }[key] ?? key),
    setProfile: vi.fn(async () => {}),
    ...overrides,
  } as never
}

describe('Home and onboarding accessibility', () => {
  beforeEach(() => {
    mockedUseApp.mockReturnValue(appState())
  })

  afterEach(() => {
    window.history.replaceState({}, '', '/')
    vi.clearAllMocks()
  })

  it('exposes the recommended game as one keyboard-operable control', () => {
    render(<Home />)

    const card = screen.getByTestId('start-game-btn')
    expect(card.tagName).toBe('BUTTON')
    expect(within(card).queryAllByRole('button')).toHaveLength(0)
    expect(card).toHaveAccessibleName("Today's Game")
  })

  it('marks the active category, labels the limit dialog, and restores focus after Escape', async () => {
    render(<Home />)

    const allGames = screen.getByRole('button', { name: 'All Games' })
    const memory = screen.getByRole('button', { name: 'Memory' })
    expect(allGames).toHaveAttribute('aria-pressed', 'true')
    expect(memory).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(memory)
    expect(allGames).toHaveAttribute('aria-pressed', 'false')
    expect(memory).toHaveAttribute('aria-pressed', 'true')

    const card = screen.getByTestId('start-game-btn')
    card.focus()
    fireEvent.click(card)

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAttribute('aria-labelledby', 'daily-limit-dialog-title')
    expect(dialog).toHaveAttribute('aria-describedby', 'daily-limit-dialog-description')
    const done = screen.getByRole('button', { name: 'Done' })
    await waitFor(() => expect(document.activeElement).toBe(done))

    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(done)
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(done)

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(document.activeElement).toBe(card))
  })

  it('provides a labeled semantic photo picker on the patient details step', () => {
    window.history.replaceState({}, '', '/?step=1')
    render(<Onboarding />)

    const picker = screen.getByTestId('patient-photo-picker')
    expect(picker.tagName).toBe('BUTTON')
    expect(picker).toHaveAttribute('type', 'button')
    expect(picker).toHaveAccessibleName('Select Photo')
    picker.focus()
    expect(document.activeElement).toBe(picker)
  })
})
