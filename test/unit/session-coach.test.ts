import { describe, expect, it } from 'vitest'
import { deriveSessionCoach } from '../../src/lib/sessionCoach'

describe('offline session coach', () => {
  it('celebrates a completed session with steady, accurate play', () => {
    expect(deriveSessionCoach({ completion: 1, accuracy: 0.9, attempts: 5 })).toEqual({
      action: 'celebrate',
      hasEnoughData: true,
      source: 'local',
    })
  })

  it('suggests a gentler activity when extra support was needed', () => {
    expect(deriveSessionCoach({ completion: 1, accuracy: 0.4, attempts: 6, cueCount: 3 })).toMatchObject({
      action: 'gentler',
      hasEnoughData: true,
    })
  })

  it('suggests rest when a session is long without exposing a score', () => {
    expect(deriveSessionCoach({ completion: 1, accuracy: 0.65, attempts: 6, durationMs: 8 * 60 * 1000 })).toMatchObject({
      action: 'rest',
      hasEnoughData: true,
    })
  })

  it('keeps the next step gentle when the session signals are incomplete', () => {
    expect(deriveSessionCoach({ completion: 1, accuracy: undefined, attempts: 0 })).toEqual({
      action: 'repeat',
      hasEnoughData: false,
      source: 'local',
    })
  })
})
