import { describe, it, expect } from 'vitest'
import {
  filterSessionsByPeriod,
  computePeriodMetrics,
  computeDomainBars,
  computeSessionTrends,
  generatePersonalizedInsights,
  buildLatestSessionSummary,
} from '../../src/lib/reports'
import { COGNITIVE_DOMAINS } from '../../src/lib/adaptive/types'
import type { SessionRecord } from '../../src/lib/types'
import type { PatientPerformanceProfile, PerformanceObservation } from '../../src/lib/adaptive/types'

describe('Reports & Cognitive Dashboard Computations', () => {
  const now = Date.now()
  const mockSessions: SessionRecord[] = [
    {
      id: 'sess-1',
      startedAt: now - 3 * 24 * 60 * 60 * 1000,
      endedAt: now - 3 * 24 * 60 * 60 * 1000 + 180000,
      gameId: 'melodies',
      gameName: 'Morning Melodies',
      difficulty: 0,
      accuracy: 0.6,
      completion: 1.0,
      avgLatencyMs: 4500,
      hesitations: 1,
      cuesUsed: 0,
      frustrationIndex: 0.1,
      reward: 0.5,
    },
    {
      id: 'sess-2',
      startedAt: now - 2 * 24 * 60 * 60 * 1000,
      endedAt: now - 2 * 24 * 60 * 60 * 1000 + 240000,
      gameId: 'objects',
      gameName: 'Familiar Objects',
      difficulty: 1,
      accuracy: 0.8,
      completion: 1.0,
      avgLatencyMs: 3200,
      hesitations: 0,
      cuesUsed: 0,
      frustrationIndex: 0.05,
      reward: 0.8,
    },
    {
      id: 'sess-3',
      startedAt: now - 1 * 60 * 60 * 1000,
      endedAt: now - 1 * 60 * 60 * 1000 + 300000,
      gameId: 'tray',
      gameName: 'Memory Tray',
      difficulty: 2,
      accuracy: 0.9,
      completion: 1.0,
      avgLatencyMs: 2800,
      hesitations: 0,
      cuesUsed: 0,
      frustrationIndex: 0.02,
      reward: 0.9,
    },
  ]

  const mockObservations: PerformanceObservation[] = [
    {
      questionId: 'q1',
      gameId: 'melodies',
      domain: 'auditory_recognition',
      difficulty: 1,
      correct: true,
      latencyMs: 3000,
      hintsUsed: 0,
      timestamp: now - 100000,
    },
    {
      questionId: 'q2',
      gameId: 'tray',
      domain: 'memory',
      difficulty: 2,
      correct: true,
      latencyMs: 2500,
      hintsUsed: 0,
      timestamp: now - 50000,
    },
  ]

  const mockProfile: PatientPerformanceProfile = {
    overallAccuracy: 0.77,
    totalAttempts: 15,
    recentAccuracy3: 0.85,
    recentAccuracy5: 0.8,
    recentAccuracy10: 0.75,
    avgResponseTimeMs: 3500,
    recentResponseTimeMs: 2800,
    hintsUsedTotal: 1,
    consecutiveCorrect: 4,
    consecutiveIncorrect: 0,
    domainScores: {
      memory: { domain: 'memory', label: 'Memory Task Performance', score: 72, attempts: 5, accuracy: 0.8, avgLatencyMs: 3200, consecutiveCorrect: 3, consecutiveIncorrect: 0, currentDifficulty: 3, lastUpdated: now },
      attention: { domain: 'attention', label: 'Attention Task Performance', score: 65, attempts: 3, accuracy: 0.7, avgLatencyMs: 3800, consecutiveCorrect: 1, consecutiveIncorrect: 0, currentDifficulty: 2, lastUpdated: now },
      recognition: { domain: 'recognition', label: 'Recognition Task Performance', score: 88, attempts: 4, accuracy: 0.9, avgLatencyMs: 2400, consecutiveCorrect: 4, consecutiveIncorrect: 0, currentDifficulty: 3, lastUpdated: now },
      recall: { domain: 'recall', label: 'Recall Task Performance', score: 55, attempts: 3, accuracy: 0.6, avgLatencyMs: 4200, consecutiveCorrect: 1, consecutiveIncorrect: 0, currentDifficulty: 2, lastUpdated: now },
      sequencing: { domain: 'sequencing', label: 'Sequencing Task Performance', score: 60, attempts: 0, accuracy: 0.5, avgLatencyMs: 4500, consecutiveCorrect: 0, consecutiveIncorrect: 0, currentDifficulty: 2, lastUpdated: now },
      visual_recognition: { domain: 'visual_recognition', label: 'Visual Recognition Task Performance', score: 70, attempts: 0, accuracy: 0.5, avgLatencyMs: 4500, consecutiveCorrect: 0, consecutiveIncorrect: 0, currentDifficulty: 2, lastUpdated: now },
      auditory_recognition: { domain: 'auditory_recognition', label: 'Auditory Recognition Task Performance', score: 75, attempts: 0, accuracy: 0.5, avgLatencyMs: 4500, consecutiveCorrect: 0, consecutiveIncorrect: 0, currentDifficulty: 2, lastUpdated: now },
      problem_solving: { domain: 'problem_solving', label: 'Problem Solving Task Performance', score: 60, attempts: 0, accuracy: 0.5, avgLatencyMs: 4500, consecutiveCorrect: 0, consecutiveIncorrect: 0, currentDifficulty: 2, lastUpdated: now },
    },
    recentQuestions: ['q1', 'q2'],
    questionAttemptCounts: { q1: 1, q2: 1 },
    lastActiveTs: now,
  }

  it('filters sessions by today, week, month, and all', () => {
    expect(filterSessionsByPeriod(mockSessions, 'today').length).toBe(1)
    expect(filterSessionsByPeriod(mockSessions, 'week').length).toBe(3)
    expect(filterSessionsByPeriod(mockSessions, 'month').length).toBe(3)
    expect(filterSessionsByPeriod(mockSessions, 'all').length).toBe(3)
  })

  it('computes period metrics accurately', () => {
    const metrics = computePeriodMetrics(mockSessions, mockObservations, 'week')
    expect(metrics.sessionCount).toBe(3)
    expect(metrics.accuracyPct).toBe(100) // from observations
    expect(metrics.avgLatencySec).toBe(2.8)
    expect(metrics.totalDurationMinutes).toBeGreaterThan(0)
  })

  it('generates domain task performance bar items for all 8 domains', () => {
    const bars = computeDomainBars(mockProfile)
    expect(bars.length).toBe(8)
    expect(bars.map((b) => b.domain)).toEqual(COGNITIVE_DOMAINS)

    const recBar = bars.find((b) => b.domain === 'recognition')
    expect(recBar?.score).toBe(88)
    expect(recBar?.label).toContain('Recognition')
  })

  it('transforms session records into trend points for charts', () => {
    const trends = computeSessionTrends(mockSessions)
    expect(trends.length).toBe(3)
    expect(trends[0].sessionLabel).toBe('S1')
    expect(trends[0].accuracyPct).toBe(60)
    expect(trends[0].difficulty).toBe(1)
    expect(trends[2].sessionLabel).toBe('S3')
    expect(trends[2].accuracyPct).toBe(90)
    expect(trends[2].difficulty).toBe(3)
  })

  it('generates respectful data-driven personalized insights without diagnostic claims', () => {
    const insights = generatePersonalizedInsights(mockSessions, mockProfile)
    expect(insights.length).toBeGreaterThan(0)

    insights.forEach((ins) => {
      // Must not contain medical diagnostic words
      expect(ins.text.toLowerCase()).not.toContain('dementia')
      expect(ins.text.toLowerCase()).not.toContain('alzheimer')
      expect(ins.text.toLowerCase()).not.toContain('deteriorat')
      expect(ins.title.length).toBeGreaterThan(0)
      expect(ins.text.length).toBeGreaterThan(0)
    })
  })

  it('builds a structured summary for the latest completed session', () => {
    const summary = buildLatestSessionSummary(mockSessions, mockProfile)
    expect(summary).not.toBeNull()
    expect(summary?.gameName).toBe('Memory Tray')
    expect(summary?.accuracyPct).toBe(90)
    expect(summary?.difficultyChange?.from).toBe(2)
    expect(summary?.difficultyChange?.to).toBe(3)
  })

  it('handles empty state cleanly when zero sessions exist', () => {
    const emptyMetrics = computePeriodMetrics([], [], 'week')
    expect(emptyMetrics.sessionCount).toBe(0)
    expect(emptyMetrics.questionsAttempted).toBe(0)
    expect(emptyMetrics.accuracyPct).toBeNull()
    expect(emptyMetrics.avgLatencySec).toBeNull()

    const emptyTrends = computeSessionTrends([])
    expect(emptyTrends.length).toBe(0)

    const emptySummary = buildLatestSessionSummary([], mockProfile)
    expect(emptySummary).toBeNull()

    const emptyInsights = generatePersonalizedInsights([], mockProfile)
    expect(emptyInsights.length).toBe(1)
    expect(emptyInsights[0].title).toBe('Awaiting Initial Activity')
  })
})
