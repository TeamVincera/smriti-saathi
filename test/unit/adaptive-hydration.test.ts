import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dbGet, dbSet, wipeAll } from '../../src/lib/db'

const DIMENSION = 25

function persistedArm(n: number, firstWeight: number) {
  const Ainv = Array.from({ length: DIMENSION }, (_, row) =>
    Array.from({ length: DIMENSION }, (_, column) => (row === column ? 1 : 0))
  )
  const b = new Array(DIMENSION).fill(0)
  b[0] = firstWeight
  return { Ainv, b, n }
}

describe('offline adaptive state hydration', () => {
  beforeEach(async () => {
    await wipeAll()
    vi.resetModules()
    vi.stubGlobal('fetch', vi.fn(() => {
      throw new Error('network must not be used by adaptive state')
    }))
  })

  it('uses persisted arm state before the first adaptive selection', async () => {
    await dbSet('kv', { 'memory:1': persistedArm(7, 2) }, 'adaptive_bandit_arms')
    await dbSet('kv', {
      totalAttempts: 1,
      overallAccuracy: 1,
      recentAccuracy3: 1,
      recentAccuracy5: 1,
      recentAccuracy10: 1,
      avgResponseTimeMs: 1000,
      recentResponseTimeMs: 1000,
      hintsUsedTotal: 0,
      consecutiveCorrect: 1,
      consecutiveIncorrect: 0,
      domainScores: { memory: { score: 50, currentDifficulty: 1, consecutiveIncorrect: 0 } },
      recentQuestions: [],
      questionAttemptCounts: {},
      lastActiveTs: Date.now(),
    }, 'perf_profile')

    const { AdaptiveQuestionEngine } = await import('../../src/lib/adaptive/AdaptiveQuestionEngine')
    const { BanditPolicy } = await import('../../src/lib/adaptive/BanditPolicy')
    const result = await AdaptiveQuestionEngine.selectNextQuestionAsync({
      candidateQuestions: [{
        questionId: 'persisted-memory-question',
        gameId: 'memory',
        category: 'Memory',
        cognitiveDomain: 'memory',
        difficulty: 1,
        language: 'en',
        regionalRelevance: 0.9,
        estimatedTimeSec: 10,
        questionType: 'multiple_choice',
        prompt: 'Choose the familiar object.',
        correctAnswer: 'cup',
      }],
    })

    expect(result.question.questionId).toBe('persisted-memory-question')
    expect(BanditPolicy.getArm('memory:1').n).toBe(7)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('merges an immediate update into persisted state instead of losing it to late hydration', async () => {
    await dbSet('kv', { 'memory:1': persistedArm(7, 2) }, 'adaptive_bandit_arms')
    const { BanditPolicy } = await import('../../src/lib/adaptive/BanditPolicy')

    BanditPolicy.updateArm('memory:1', [1, ...new Array(DIMENSION - 1).fill(0)], 0.5)
    await BanditPolicy.ready()

    expect(BanditPolicy.getArm('memory:1').n).toBe(8)
    await new Promise((resolve) => setTimeout(resolve, 0))
    const saved = await dbGet<Record<string, { n: number }>>('kv', 'adaptive_bandit_arms')
    expect(saved?.['memory:1'].n).toBe(8)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rebuilds a profile from persisted observations without growing the source array', async () => {
    await dbSet('kv', [
      {
        questionId: 'q-1', gameId: 'memory', domain: 'memory', difficulty: 1,
        correct: true, latencyMs: 1200, hintsUsed: 0, timestamp: Date.now(),
      },
      {
        questionId: 'q-2', gameId: 'memory', domain: 'memory', difficulty: 1,
        correct: false, latencyMs: 1800, hintsUsed: 1, timestamp: Date.now() + 1,
      },
    ], 'perf_observations')

    const { PerformanceTracker } = await import('../../src/lib/adaptive/PerformanceTracker')
    await PerformanceTracker.load()

    expect(PerformanceTracker.getObservations()).toHaveLength(2)
    expect(PerformanceTracker.getProfile().totalAttempts).toBe(2)
    expect(PerformanceTracker.getProfile().domainScores.memory.attempts).toBe(2)
  })
})
