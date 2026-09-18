import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/state', () => ({
  useApp: vi.fn(),
}))

vi.mock('../../src/lib/audio', () => ({
  playChime: vi.fn(async () => {}),
}))

import { useApp } from '../../src/state'
import { FestivalTales } from '../../src/games/FestivalTales'
import { MemoryGardenGame } from '../../src/games/MemoryGardenGame'

const mockedUseApp = vi.mocked(useApp)
const profile = {
  cultural: {
    festivals: ['Bihu'],
    hobbies: ['Singing'],
    community: 'Ahom',
  },
  caregiver: { name: 'Rahul' },
}

const gameProps = {
  difficulty: 0,
  logAction: vi.fn(),
  complete: vi.fn(),
}

describe('reminiscence and calm-animation accessibility', () => {
  beforeEach(() => {
    mockedUseApp.mockReturnValue({
      lang: 'en',
      profile,
      t: (key: string) => key,
      sessionsToday: 0,
    } as never)
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('presents Festival Tales in short pages with gentle navigation', () => {
    render(<FestivalTales {...gameProps} />)

    expect(screen.getByText('Story page 1 of 2')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Continue to the next story page' }))

    expect(screen.getByText('Story page 2 of 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Share how the story makes you feel' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Go back to the previous story page' }))
    expect(screen.getByText('Story page 1 of 2')).toBeInTheDocument()
  })

  it('keeps Festival Tales reflective and free of right-or-wrong framing', () => {
    render(<FestivalTales {...gameProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'Continue to the next story page' }))
    fireEvent.click(screen.getByRole('button', { name: 'Share how the story makes you feel' }))

    expect(screen.getByText('There are no right or wrong answers here.')).toBeInTheDocument()
  })

  it('announces garden breathing and growth as flowers are watered', () => {
    vi.useFakeTimers()
    render(<MemoryGardenGame {...gameProps} />)

    expect(screen.getByRole('status')).toHaveTextContent('Breathe in gently.')
    act(() => {
      vi.advanceTimersByTime(16000)
    })

    expect(screen.getByRole('status')).toHaveTextContent(/orchid/i)
    const orchids = screen.getAllByRole('button', { name: /Water orchid/i })
    orchids.forEach((orchid) => fireEvent.click(orchid))

    expect(screen.getByRole('status')).toHaveTextContent('Wonderful. Your garden is blooming.')
  })

  it('gates the breathing transform when reduced motion is requested', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })))

    render(<MemoryGardenGame {...gameProps} />)

    expect(document.querySelector('.rhythm-pad')).toHaveStyle({ transform: 'none', transition: 'none' })
  })
})
