import {
  COGNITIVE_DOMAINS,
  DOMAIN_DISPLAY_LABELS,
  type CognitiveDomain,
  type DifficultyLevel,
  type DomainPerformanceScore,
  type PatientPerformanceProfile,
  type PerformanceObservation,
} from './types'
import { dbGet, dbSet } from '../db'

const MAX_RECENT_QUESTIONS = 20
const DEFAULT_LATENCY_MS = 4500

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function finiteOr(value: unknown, fallback: number, min = -Infinity, max = Infinity): number {
  const candidate = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(candidate) ? Math.min(max, Math.max(min, candidate)) : fallback
}

function normalizeObservation(raw: unknown): PerformanceObservation | null {
  if (!isRecord(raw)) return null
  const questionId = typeof raw.questionId === 'string' ? raw.questionId.trim() : ''
  const gameId = typeof raw.gameId === 'string' ? raw.gameId.trim() : ''
  const domain = raw.domain
  const difficulty = finiteOr(raw.difficulty, 0)
  if (!questionId || !gameId || !COGNITIVE_DOMAINS.includes(domain as CognitiveDomain)
    || !Number.isInteger(difficulty) || difficulty < 1 || difficulty > 5
    || typeof raw.correct !== 'boolean') return null
  return {
    questionId,
    gameId,
    domain: domain as CognitiveDomain,
    difficulty: difficulty as DifficultyLevel,
    correct: raw.correct,
    latencyMs: finiteOr(raw.latencyMs, DEFAULT_LATENCY_MS, 0, 120_000),
    hintsUsed: finiteOr(raw.hintsUsed, 0, 0, 100),
    timestamp: finiteOr(raw.timestamp, Date.now(), 0),
  }
}

/**
 * Performance Tracker
 * Tracks offline patient performance, running accuracy, latencies, streaks,
 * and maintains domain-specific Task Performance Scores (0-100).
 */
class PerformanceTrackerClass {
  private observations: PerformanceObservation[] = []
  private profile: PatientPerformanceProfile
  private isLoaded = false
  private loading: Promise<void>
  private pendingObservations: PerformanceObservation[] = []
  private resetPending = false
  private persistQueue: Promise<void> = Promise.resolve()

  constructor() {
    this.profile = this.createInitialProfile()
    this.loading = this.hydrate()
  }

  private createInitialProfile(): PatientPerformanceProfile {
    const domainScores: Record<CognitiveDomain, DomainPerformanceScore> = {} as any
    const now = Date.now()

    COGNITIVE_DOMAINS.forEach((domain) => {
      domainScores[domain] = {
        domain,
        label: DOMAIN_DISPLAY_LABELS[domain],
        score: 50, // Cold-start baseline task performance score
        attempts: 0,
        accuracy: 0.5,
        avgLatencyMs: DEFAULT_LATENCY_MS,
        consecutiveCorrect: 0,
        consecutiveIncorrect: 0,
        currentDifficulty: 2, // Start at Easy / Moderate
        lastUpdated: now,
      }
    })

    return {
      overallAccuracy: 0.5,
      totalAttempts: 0,
      recentAccuracy3: 0.5,
      recentAccuracy5: 0.5,
      recentAccuracy10: 0.5,
      avgResponseTimeMs: DEFAULT_LATENCY_MS,
      recentResponseTimeMs: DEFAULT_LATENCY_MS,
      hintsUsedTotal: 0,
      consecutiveCorrect: 0,
      consecutiveIncorrect: 0,
      domainScores,
      recentQuestions: [],
      questionAttemptCounts: {},
      lastActiveTs: now,
    }
  }

  public async load(): Promise<void> {
    await this.loading
  }

  private normalizeProfile(raw: unknown): PatientPerformanceProfile {
    const base = this.createInitialProfile()
    if (!isRecord(raw)) return base
    const sourceScores = isRecord(raw.domainScores) ? raw.domainScores : {}
    const domainScores = { ...base.domainScores }
    for (const domain of COGNITIVE_DOMAINS) {
      const stored = isRecord(sourceScores[domain]) ? sourceScores[domain] : {}
      const current = base.domainScores[domain]
      const difficulty = finiteOr(stored.currentDifficulty, current.currentDifficulty)
      domainScores[domain] = {
        ...current,
        domain,
        label: typeof stored.label === 'string' && stored.label ? stored.label : current.label,
        score: finiteOr(stored.score, current.score, 0, 100),
        attempts: Math.floor(finiteOr(stored.attempts, current.attempts, 0)),
        accuracy: finiteOr(stored.accuracy, current.accuracy, 0, 1),
        avgLatencyMs: finiteOr(stored.avgLatencyMs, current.avgLatencyMs, 0, 120_000),
        consecutiveCorrect: Math.floor(finiteOr(stored.consecutiveCorrect, current.consecutiveCorrect, 0)),
        consecutiveIncorrect: Math.floor(finiteOr(stored.consecutiveIncorrect, current.consecutiveIncorrect, 0)),
        currentDifficulty: (Number.isInteger(difficulty) && difficulty >= 1 && difficulty <= 5
          ? difficulty
          : current.currentDifficulty) as DifficultyLevel,
        lastUpdated: finiteOr(stored.lastUpdated, current.lastUpdated, 0),
      }
    }
    const recentQuestions = Array.isArray(raw.recentQuestions)
      ? raw.recentQuestions.filter((item): item is string => typeof item === 'string').slice(-MAX_RECENT_QUESTIONS)
      : []
    const questionAttemptCounts: Record<string, number> = {}
    if (isRecord(raw.questionAttemptCounts)) {
      for (const [id, count] of Object.entries(raw.questionAttemptCounts)) {
        if (id && Number.isFinite(Number(count)) && Number(count) >= 0) questionAttemptCounts[id] = Math.floor(Number(count))
      }
    }
    return {
      overallAccuracy: finiteOr(raw.overallAccuracy, base.overallAccuracy, 0, 1),
      totalAttempts: Math.floor(finiteOr(raw.totalAttempts, base.totalAttempts, 0)),
      recentAccuracy3: finiteOr(raw.recentAccuracy3, base.recentAccuracy3, 0, 1),
      recentAccuracy5: finiteOr(raw.recentAccuracy5, base.recentAccuracy5, 0, 1),
      recentAccuracy10: finiteOr(raw.recentAccuracy10, base.recentAccuracy10, 0, 1),
      avgResponseTimeMs: finiteOr(raw.avgResponseTimeMs, base.avgResponseTimeMs, 0, 120_000),
      recentResponseTimeMs: finiteOr(raw.recentResponseTimeMs, base.recentResponseTimeMs, 0, 120_000),
      hintsUsedTotal: Math.floor(finiteOr(raw.hintsUsedTotal, base.hintsUsedTotal, 0)),
      consecutiveCorrect: Math.floor(finiteOr(raw.consecutiveCorrect, base.consecutiveCorrect, 0)),
      consecutiveIncorrect: Math.floor(finiteOr(raw.consecutiveIncorrect, base.consecutiveIncorrect, 0)),
      domainScores,
      recentQuestions,
      questionAttemptCounts,
      lastActiveTs: finiteOr(raw.lastActiveTs, base.lastActiveTs, 0),
    }
  }

  private async hydrate(): Promise<void> {
    try {
      const [storedObs, storedProf] = await Promise.all([
        dbGet<unknown>('kv', 'perf_observations'),
        dbGet<unknown>('kv', 'perf_profile'),
      ])
      const persistedObservations = Array.isArray(storedObs)
        ? storedObs.map(normalizeObservation).filter((item): item is PerformanceObservation => item !== null).slice(-500)
        : []
      const pending = this.pendingObservations
      const reset = this.resetPending
      const hasProfileSnapshot = isRecord(storedProf)
        && isRecord(storedProf.domainScores)
        && Number.isFinite(Number(storedProf.totalAttempts))
      this.pendingObservations = []
      this.resetPending = false

      this.observations = reset ? [] : persistedObservations
      this.profile = reset
        ? this.createInitialProfile()
        : hasProfileSnapshot
          ? this.normalizeProfile(storedProf)
          : this.createInitialProfile()
      if (!reset && !hasProfileSnapshot && persistedObservations.length > 0) this.recalculateProfile()
      for (const observation of pending) this.applyObservation(observation)
    } catch {
      // Offline fallback: keep in-memory profile
      const pending = this.pendingObservations
      this.pendingObservations = []
      // `recordObservation` applies immediately for synchronous callers, so
      // rebuild from a clean baseline before replaying its pending queue.
      this.observations = []
      this.profile = this.createInitialProfile()
      this.resetPending = false
      for (const observation of pending) this.applyObservation(observation)
    }
    this.isLoaded = true
    if (this.pendingObservations.length > 0 || this.resetPending) {
      this.pendingObservations = []
      this.resetPending = false
    }
    // Persist the reconciled snapshot even when it was only a partial/corrupt
    // record. This makes recovery idempotent for the next app launch.
    await this.enqueuePersist()
  }

  private cloneProfile(): PatientPerformanceProfile {
    return {
      ...this.profile,
      domainScores: Object.fromEntries(
        Object.entries(this.profile.domainScores).map(([domain, score]) => [domain, { ...score }])
      ) as Record<CognitiveDomain, DomainPerformanceScore>,
      recentQuestions: [...this.profile.recentQuestions],
      questionAttemptCounts: { ...this.profile.questionAttemptCounts },
    }
  }

  private enqueuePersist(): Promise<void> {
    const observations = this.observations.slice(-200)
    const profile = this.cloneProfile()
    this.persistQueue = this.persistQueue.then(async () => {
      try {
        await Promise.all([
          dbSet('kv', observations, 'perf_observations'),
          dbSet('kv', profile, 'perf_profile'),
        ])
      } catch {
        // In-memory continues safely
      }
    })
    return this.persistQueue
  }

  private applyObservation(obs: PerformanceObservation): void {
    this.observations.push(obs)
    if (this.observations.length > 500) {
      this.observations = this.observations.slice(-500)
    }

    const p = this.profile
    p.totalAttempts += 1
    p.hintsUsedTotal += obs.hintsUsed || 0
    p.lastActiveTs = obs.timestamp || Date.now()

    // Streaks
    if (obs.correct) {
      p.consecutiveCorrect += 1
      p.consecutiveIncorrect = 0
    } else {
      p.consecutiveIncorrect += 1
      p.consecutiveCorrect = 0
    }

    // Recent question list & attempts
    p.recentQuestions.push(obs.questionId)
    if (p.recentQuestions.length > MAX_RECENT_QUESTIONS) {
      p.recentQuestions = p.recentQuestions.slice(-MAX_RECENT_QUESTIONS)
    }
    p.questionAttemptCounts[obs.questionId] = (p.questionAttemptCounts[obs.questionId] || 0) + 1

    // Update overall & recent accuracy
    const allCorrect = this.observations.filter((o) => o.correct).length
    p.overallAccuracy = allCorrect / this.observations.length

    const last3 = this.observations.slice(-3)
    p.recentAccuracy3 = last3.filter((o) => o.correct).length / last3.length

    const last5 = this.observations.slice(-5)
    p.recentAccuracy5 = last5.filter((o) => o.correct).length / last5.length

    const last10 = this.observations.slice(-10)
    p.recentAccuracy10 = last10.filter((o) => o.correct).length / last10.length

    // Latency averages
    const totalLat = this.observations.reduce((acc, o) => acc + o.latencyMs, 0)
    p.avgResponseTimeMs = totalLat / this.observations.length

    const recentLat = last5.reduce((acc, o) => acc + o.latencyMs, 0)
    p.recentResponseTimeMs = recentLat / last5.length

    // Update Domain-specific score
    const d = obs.domain
    if (p.domainScores[d]) {
      const ds = p.domainScores[d]
      ds.attempts += 1
      if (obs.correct) {
        ds.consecutiveCorrect += 1
        ds.consecutiveIncorrect = 0
      } else {
        ds.consecutiveIncorrect += 1
        ds.consecutiveCorrect = 0
      }

      const domainObs = this.observations.filter((o) => o.domain === d)
      const domainCorrect = domainObs.filter((o) => o.correct).length
      ds.accuracy = domainCorrect / domainObs.length

      const domainLat = domainObs.reduce((acc, o) => acc + o.latencyMs, 0)
      ds.avgLatencyMs = domainLat / domainObs.length

      // Dynamic Task Performance Score (0 to 100)
      // Weighted combination of accuracy, response speed, difficulty mastery, and low hint reliance
      const accScore = ds.accuracy * 50
      const latencyFactor = Math.max(0, 1 - ds.avgLatencyMs / 12000) * 20
      const streakBonus = Math.min(10, ds.consecutiveCorrect * 2)
      const difficultyMastery = (ds.currentDifficulty / 5) * 20
      const hintPenalty = Math.min(10, (obs.hintsUsed || 0) * 3)

      ds.score = Math.min(100, Math.max(5, Math.round(accScore + latencyFactor + streakBonus + difficultyMastery - hintPenalty)))
      ds.lastUpdated = Date.now()

      // Adapt domain difficulty
      if (ds.consecutiveCorrect >= 3 && ds.currentDifficulty < 5) {
        ds.currentDifficulty = (ds.currentDifficulty + 1) as DifficultyLevel
      } else if (ds.consecutiveIncorrect >= 2 && ds.currentDifficulty > 1) {
        ds.currentDifficulty = (ds.currentDifficulty - 1) as DifficultyLevel
      }
    }

  }

  public recordObservation(obs: PerformanceObservation): PatientPerformanceProfile {
    const normalized = normalizeObservation(obs)
    if (!normalized) return this.cloneProfile()
    if (!this.isLoaded) this.pendingObservations.push(normalized)
    this.applyObservation(normalized)
    if (this.isLoaded) void this.enqueuePersist()
    return this.cloneProfile()
  }

  private recalculateProfile(): void {
    const snapshot = [...this.observations]
    this.observations = []
    this.profile = this.createInitialProfile()
    for (const obs of snapshot) this.applyObservation(obs)
  }

  public getProfile(): PatientPerformanceProfile {
    return this.cloneProfile()
  }

  public getObservations(): PerformanceObservation[] {
    return [...this.observations]
  }

  public getDomainScore(domain: CognitiveDomain): DomainPerformanceScore {
    return (
      this.profile.domainScores[domain] || {
        domain,
        label: DOMAIN_DISPLAY_LABELS[domain],
        score: 50,
        attempts: 0,
        accuracy: 0.5,
        avgLatencyMs: DEFAULT_LATENCY_MS,
        consecutiveCorrect: 0,
        consecutiveIncorrect: 0,
        currentDifficulty: 2,
        lastUpdated: Date.now(),
      }
    )
  }

  public reset(): Promise<void> {
    this.observations = []
    this.profile = this.createInitialProfile()
    this.pendingObservations = []
    if (!this.isLoaded) {
      this.resetPending = true
      return this.loading
    }
    return this.enqueuePersist()
  }
}

export const PerformanceTracker = new PerformanceTrackerClass()
