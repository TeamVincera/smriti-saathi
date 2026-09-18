import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/state', () => ({
  useApp: vi.fn(),
}))

vi.mock('../../src/lib/adaptive', () => ({
  nextLevel: vi.fn(() => 0),
  recordAnswer: vi.fn(),
}))

vi.mock('../../src/lib/audio', () => ({
  isAudioPlaying: vi.fn(() => false),
  playChime: vi.fn(async () => {}),
  playSoftCue: vi.fn(),
  playControlledInstrument: vi.fn((_key: string, onFinish?: () => void) => {
    onFinish?.()
    return 100
  }),
  playControlledAmbient: vi.fn((_key: string, onFinish?: () => void) => {
    onFinish?.()
    return 100
  }),
  stopAllAudio: vi.fn(),
}))

import { useApp } from '../../src/state'
import { MorningMelodies } from '../../src/games/MorningMelodies'
import { VillageSounds } from '../../src/games/VillageSounds'
import { MemoryTray } from '../../src/games/MemoryTray'
import { PictureMemory } from '../../src/games/PictureMemory'

const mockedUseApp = vi.mocked(useApp)
const gameProps = {
  difficulty: 0,
  logAction: vi.fn(),
  complete: vi.fn(),
}

describe('auditory and timed game accessibility', () => {
  beforeEach(() => {
    mockedUseApp.mockReturnValue({ lang: 'en', profile: { cultural: { state: 'Assam' } } } as never)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('announces melody playback and exposes a replay label', () => {
    render(<MorningMelodies {...gameProps} />)

    expect(screen.getByRole('status')).toHaveTextContent(/melody is ready/i)
    expect(screen.getByRole('button', { name: 'Listen to the melody again' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('announces village sound playback and labels the replay control', () => {
    render(<VillageSounds {...gameProps} />)

    expect(screen.getByRole('status')).toHaveTextContent(/sound is ready/i)
    expect(screen.getByRole('button', { name: 'Listen to the sound again' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('announces the memory tray countdown and the recall-ready state', () => {
    render(<MemoryTray {...gameProps} />)

    expect(screen.getByRole('status')).toHaveTextContent(/tray will hide in 10 seconds/i)
    fireEvent.click(screen.getByRole('button', { name: 'I have seen them; start recall' }))
    expect(screen.getByRole('status')).toHaveTextContent(/recall is ready/i)
  })

  it('announces the picture countdown and the recall-ready state', () => {
    render(<PictureMemory {...gameProps} />)

    expect(screen.getByRole('status')).toHaveTextContent(/question starts in 10 seconds/i)
    fireEvent.click(screen.getByRole('button', { name: 'I have seen it; start the question' }))
    expect(screen.getByRole('status')).toHaveTextContent(/recall is ready/i)
  })
})
