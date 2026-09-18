import { describe, it, expect, vi } from 'vitest'
import { playChime, playSoftCue, playTap, playInstrument, playMelody, stopAllAudio, unlockAudio } from '../../src/lib/audio'

describe('Web Audio Synthesizer Engine', () => {
  it('unlocks audio context without error', () => {
    expect(() => unlockAudio()).not.toThrow()
  })

  it('plays chimes, cues, and taps', () => {
    expect(() => playChime()).not.toThrow()
    expect(() => playSoftCue()).not.toThrow()
    expect(() => playTap()).not.toThrow()
  })

  it('plays each indigenous North East instrument and returns expected duration', () => {
    const dholDur = playInstrument('dhol')
    expect(dholDur).toBe(3600)

    const fluteDur = playInstrument('flute')
    expect(fluteDur).toBe(4200)

    const wangalaDur = playInstrument('wangala')
    expect(wangalaDur).toBe(3700)

    const bellDur = playInstrument('bell')
    expect(bellDur).toBe(4200)

    const pepaDur = playInstrument('pepa')
    expect(pepaDur).toBe(4000)
  })

  it('cancels delayed melody notes when audio is stopped', () => {
    vi.useFakeTimers()
    try {
      stopAllAudio()
      const before = vi.getTimerCount()
      playMelody(['dhol', 'flute'], 1)
      expect(vi.getTimerCount()).toBeGreaterThan(before)
      stopAllAudio()
      expect(vi.getTimerCount()).toBe(before)
    } finally {
      vi.useRealTimers()
    }
  })
})
