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

/**
 * Performance Tracker
 * Tracks offline patient performance, running accuracy, latencies, streaks,
 * and maintains domain-specific Task Performance Scores (0-100).
 */
class PerformanceTrackerClass {
  private observations: PerformanceObservation[] = []
  private profile: PatientPerformanceProfile
  private isLoaded = false

  constructor() {
    this.profile = this.createInitialProfile()
    void this.load()
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
    if (this.isLoaded) return
    try {
      const storedObs = await dbGet<PerformanceObservation[]>('kv', 'perf_observations')
      if (storedObs && Array.isArray(storedObs)) {
        this.observations = storedObs
      }
      const storedProf = await dbGet<PatientPerformanceProfile>('kv', 'perf_profile')
      if (storedProf && storedProf.domainScores) {
        this.profile = storedProf
      } else if (this.observations.length > 0) {
        this.recalculateProfile()
      }
    } catch {
      // Offline fallback: keep in-memory profile
    }
    this.isLoaded = true
  }

  private async persist(): Promise<void> {
    try {
      await Promise.all([
        dbSet('kv', this.observations.slice(-200), 'perf_observations'),
        dbSet('kv', this.profile, 'perf_profile'),
      ])
    } catch {
      // In-memory continues safely
    }
  }

  public recordObservation(obs: PerformanceObservation): PatientPerformanceProfile {
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

    void this.persist()
    return { ...this.profile }
  }

  private recalculateProfile(): void {
    this.profile = this.createInitialProfile()
    for (const obs of this.observations) {
      this.recordObservation(obs)
    }
  }

  public getProfile(): PatientPerformanceProfile {
    return { ...this.profile }
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

  public reset(): void {
    this.observations = []
    this.profile = this.createInitialProfile()
    void this.persist()
  }
}

export const PerformanceTracker = new PerformanceTrackerClass()
