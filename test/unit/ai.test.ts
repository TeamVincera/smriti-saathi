import { describe, it, expect, beforeEach } from 'vitest'
import { seedBaselineForColdStart, sessionCapReached, adherenceRate, setAdherenceRate, recommendNextGame, recordSessionResult } from '../../src/lib/ai'
import { wipeAll } from '../../src/lib/db'

describe('AI Recommendation & Adaptation Engine', () => {
  beforeEach(async () => {
    await wipeAll()
    localStorage.clear()
  })

  it('seeds baseline level from cognitive assessment performance', () => {
    // High accuracy, low latency -> level 1
    expect(seedBaselineForColdStart({ accuracy: 0.85, latencyMs: 3200 })).toBe(1)
    // Moderate accuracy -> level 1
    expect(seedBaselineForColdStart({ accuracy: 0.5, latencyMs: 7000 })).toBe(1)
    // Low accuracy -> level 0
    expect(seedBaselineForColdStart({ accuracy: 0.2, latencyMs: 9000 })).toBe(0)
  })

  it('detects when session cap is reached', () => {
    const config = {
      alpha: 1.2,
      maxSessionsPerDay: 3,
      weights: { completion: 0.4, accuracy: 0.4, hesitation: 0.1, frustration: 0.1 },
      phaseRequirementSessions: { 2: 12, 3: 36 },
      remindersPerDay: 2,
    }
    expect(sessionCapReached(2, config)).toBe(false)
    expect(sessionCapReached(3, config)).toBe(true)
    expect(sessionCapReached(4, config)).toBe(true)
  })

  it('persists and retrieves adherence rate', async () => {
    expect(await adherenceRate()).toBe(0.8) // default
    await setAdherenceRate(0.95)
    expect(await adherenceRate()).toBe(0.95)
  })

  it('recommends next game and adapts on session recording', async () => {
    const recommendation = await recommendNextGame()
    expect(recommendation).not.toBeNull()
    expect(recommendation?.gameId).toBeDefined()
    expect([0, 1]).toContain(recommendation?.difficulty)

    // Record a session
    const record = await recordSessionResult({
      gameId: recommendation!.gameId,
      difficulty: recommendation!.difficulty,
      startedAt: Date.now() - 120000,
      completion: 1.0,
      accuracy: 0.9,
      avgLatencyMs: 2500,
      hesitations: 1,
      cuesUsed: 0,
      frustrationIndex: 0.05,
      exploration: recommendation!.exploration,
    })

    expect(record.id).toBeDefined()
    expect(record.accuracy).toBe(0.9)
    expect(record.reward).toBeGreaterThan(0)
  })
})
