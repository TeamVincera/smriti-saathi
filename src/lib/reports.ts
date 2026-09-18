import type { SessionRecord } from './types'
import {
  COGNITIVE_DOMAINS,
  DOMAIN_DISPLAY_LABELS,
  type CognitiveDomain,
  type DifficultyLevel,
  type PatientPerformanceProfile,
  type PerformanceObservation,
} from './adaptive/types'

export type ReportPeriod = 'today' | 'week' | 'month' | 'all'

export interface PeriodMetrics {
  questionsAttempted: number
  questionsCorrect: number
  accuracyPct: number | null
  avgLatencySec: number | null
  totalDurationMinutes: number
  sessionCount: number
  currentDifficulty: DifficultyLevel
}

export interface DomainBarItem {
  domain: CognitiveDomain
  label: string
  score: number
  attempts: number
  accuracyPct: number
  difficulty: DifficultyLevel
}

export interface SessionTrendPoint {
  sessionId: string
  sessionLabel: string
  dateLabel: string
  accuracyPct: number
  avgLatencySec: number
  difficulty: number
  gameName: string
  timestamp: number
}

export interface PersonalizedInsight {
  id: string
  type: 'positive' | 'gentle' | 'neutral' | 'adaptive'
  icon: string
  title: string
  text: string
}

export interface SessionSummaryData {
  sessionId: string
  gameName: string
  questionsCompleted: number
  accuracyPct: number
  avgLatencySec: number
  durationMin: number
  domainScores: { domain: CognitiveDomain; label: string; score: number }[]
  difficultyChange?: { from: number; to: number; reason: string }
}

function localDayStart(timestamp: number): number {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

function periodStart(period: ReportPeriod, now = Date.now()): number | null {
  if (period === 'all') return null
  if (period === 'today') return localDayStart(now)
  const date = new Date(now)
  date.setHours(0, 0, 0, 0)
  // Calendar windows avoid a 23/25-hour DST day changing which sessions a
  // person sees in a “week” or “month” report.
  date.setDate(date.getDate() - (period === 'week' ? 6 : 29))
  return date.getTime()
}

/**
 * Filters session records by the selected time period
 */
export function filterSessionsByPeriod(sessions: SessionRecord[], period: ReportPeriod): SessionRecord[] {
  if (!sessions || sessions.length === 0) return []
  const now = Date.now()
  const start = periodStart(period, now)
  return start === null ? [...sessions] : sessions.filter((s) => s.startedAt >= start && s.startedAt <= now)
}

/**
 * Computes high-level activity metrics for a period
 */
export function computePeriodMetrics(
  sessions: SessionRecord[],
  observations: PerformanceObservation[],
  period: ReportPeriod
): PeriodMetrics {
  const filteredSessions = filterSessionsByPeriod(sessions, period)
  const sessionCount = filteredSessions.length

  // Filter observations matching the time window
  const now = Date.now()
  const start = periodStart(period, now)
  const filteredObs = start === null
    ? observations
    : observations.filter((o) => o.timestamp >= start && o.timestamp <= now)

  const questionsAttempted = filteredObs.length > 0 ? filteredObs.length : filteredSessions.length * 5
  const questionsCorrect =
    filteredObs.length > 0
      ? filteredObs.filter((o) => o.correct).length
      : Math.round(
          filteredSessions.reduce((sum, s) => sum + (s.accuracy || 0) * 5, 0)
        )

  let accuracyPct: number | null = null
  if (filteredObs.length > 0) {
    accuracyPct = Math.round((questionsCorrect / filteredObs.length) * 100)
  } else if (filteredSessions.length > 0) {
    const avgAcc = filteredSessions.reduce((sum, s) => sum + (s.accuracy || 0), 0) / filteredSessions.length
    accuracyPct = Math.round(avgAcc * 100)
  }

  let avgLatencySec: number | null = null
  if (filteredObs.length > 0) {
    const totalLat = filteredObs.reduce((sum, o) => sum + o.latencyMs, 0)
    avgLatencySec = Math.round((totalLat / filteredObs.length / 1000) * 10) / 10
  } else if (filteredSessions.length > 0) {
    const totalLat = filteredSessions.reduce((sum, s) => sum + (s.avgLatencyMs || 4000), 0)
    avgLatencySec = Math.round((totalLat / filteredSessions.length / 1000) * 10) / 10
  }

  let totalDurationMinutes = 0
  for (const s of filteredSessions) {
    const durMs = (s.endedAt || s.startedAt + 180000) - s.startedAt
    totalDurationMinutes += Math.max(1, Math.round(durMs / 60000))
  }

  const latestSession = filteredSessions[filteredSessions.length - 1]
  const currentDifficulty: DifficultyLevel = (
    latestSession ? Math.min(5, Math.max(1, (latestSession.difficulty || 0) + 1)) : 2
  ) as DifficultyLevel

  return {
    questionsAttempted,
    questionsCorrect,
    accuracyPct,
    avgLatencySec,
    totalDurationMinutes,
    sessionCount,
    currentDifficulty,
  }
}

/**
 * Computes domain task performance bars from the patient profile
 */
export function computeDomainBars(profile: PatientPerformanceProfile): DomainBarItem[] {
  return COGNITIVE_DOMAINS.map((domain) => {
    const dScore = profile.domainScores[domain]
    return {
      domain,
      label: DOMAIN_DISPLAY_LABELS[domain] || domain,
      score: dScore ? dScore.score : 50,
      attempts: dScore ? dScore.attempts : 0,
      accuracyPct: dScore ? Math.round(dScore.accuracy * 100) : 50,
      difficulty: dScore ? dScore.currentDifficulty : 2,
    }
  })
}

/**
 * Transforms session records into historical trend points for line charts
 */
export function computeSessionTrends(sessions: SessionRecord[]): SessionTrendPoint[] {
  if (!sessions || sessions.length === 0) return []

  return sessions.map((s, idx) => {
    const d = new Date(s.startedAt)
    const dateLabel = `${d.getMonth() + 1}/${d.getDate()}`
    const sessionLabel = `S${idx + 1}`
    const accuracyPct = Math.round((s.accuracy || 0) * 100)
    const avgLatencySec = Math.round(((s.avgLatencyMs || 4000) / 1000) * 10) / 10
    const difficulty = (s.difficulty ?? 0) + 1

    return {
      sessionId: s.id || `s-${idx}`,
      sessionLabel,
      dateLabel,
      accuracyPct,
      avgLatencySec,
      difficulty,
      gameName: s.gameName || 'Activity',
      timestamp: s.startedAt,
    }
  })
}

/**
 * Generates respectful, data-driven, non-medical caregiver insights
 */
export function generatePersonalizedInsights(
  sessions: SessionRecord[],
  profile: PatientPerformanceProfile
): PersonalizedInsight[] {
  const insights: PersonalizedInsight[] = []

  if (!sessions || sessions.length === 0) {
    return [
      {
        id: 'ins_welcome',
        type: 'neutral',
        icon: '🌱',
        title: 'Awaiting Initial Activity',
        text: 'Complete your first interactive activity to generate personalized performance observations.',
      },
    ]
  }

  // 1. Overall Trend Observation
  if (sessions.length >= 3) {
    const recent3 = sessions.slice(-3)
    const prior = sessions.slice(0, -3)
    const recentAvg = recent3.reduce((acc, s) => acc + (s.accuracy || 0), 0) / recent3.length
    const priorAvg = prior.length > 0 ? prior.reduce((acc, s) => acc + (s.accuracy || 0), 0) / prior.length : recentAvg

    if (recentAvg >= priorAvg + 0.08) {
      insights.push({
        id: 'ins_improving',
        type: 'positive',
        icon: '📈',
        title: 'Task Accuracy Progression',
        text: 'Accuracy across recent activities has shown steady progress compared with earlier sessions.',
      })
    } else if (recentAvg >= 0.7) {
      insights.push({
        id: 'ins_steady_high',
        type: 'positive',
        icon: '✨',
        title: 'Consistent Engagement',
        text: 'Task completion consistency remains strong and steady across recent sessions.',
      })
    } else if (recentAvg < priorAvg - 0.15) {
      insights.push({
        id: 'ins_dip',
        type: 'gentle',
        icon: '🛋️',
        title: 'Recent Activity Fluctuations',
        text: 'Performance in recent activities was slightly lower than previous sessions. Ensure the patient is rested and comfortable.',
      })
    }
  }

  // 2. Domain-Specific Findings
  const activeDomains = COGNITIVE_DOMAINS.map((d) => profile.domainScores[d]).filter((ds) => ds && ds.attempts > 0)
  if (activeDomains.length > 0) {
    const highest = [...activeDomains].sort((a, b) => b.score - a.score)[0]
    const lowest = [...activeDomains].sort((a, b) => a.score - b.score)[0]

    if (highest && highest.attempts >= 2) {
      insights.push({
        id: 'ins_domain_best',
        type: 'positive',
        icon: '🌟',
        title: 'Strong Domain Proficiency',
        text: `Performance is highest in ${highest.label.toLowerCase().replace('task performance', 'activities')}, demonstrating familiar comfort with these items.`,
      })
    }

    if (lowest && lowest.attempts >= 2 && lowest.score < 50 && lowest.domain !== highest.domain) {
      insights.push({
        id: 'ins_domain_challenge',
        type: 'gentle',
        icon: '💡',
        title: 'Adaptive Support Active',
        text: `${lowest.label.replace('Task Performance', 'tasks')} have experienced more pauses recently; the adaptive engine is providing gentle difficulty adjustments.`,
      })
    }
  }

  // 3. Response Latency Insight
  if (profile.recentResponseTimeMs > 0 && profile.avgResponseTimeMs > 0 && sessions.length >= 2) {
    if (profile.recentResponseTimeMs < profile.avgResponseTimeMs - 1000) {
      insights.push({
        id: 'ins_speed_up',
        type: 'positive',
        icon: '⏱️',
        title: 'Response Rhythm',
        text: 'Average response time was lower during the latest session, reflecting familiarity with the exercises.',
      })
    } else if (profile.recentResponseTimeMs > 10000) {
      insights.push({
        id: 'ins_speed_slow',
        type: 'neutral',
        icon: '🌿',
        title: 'Relaxed Pacing',
        text: 'Activities are being completed with measured, unhurried pacing.',
      })
    }
  }

  // 4. Adaptive Difficulty Progression
  if (profile.consecutiveCorrect >= 3) {
    insights.push({
      id: 'ins_adaptive_up',
      type: 'adaptive',
      icon: '🎯',
      title: 'Adaptive Difficulty Progression',
      text: 'Consistent unprompted accuracy has allowed the system to gradually present richer cognitive items.',
    })
  } else if (profile.consecutiveIncorrect >= 2) {
    insights.push({
      id: 'ins_adaptive_down',
      type: 'adaptive',
      icon: '🛡️',
      title: 'Adaptive Confidence Protection',
      text: 'The system has stepped down activity difficulty to maintain confidence and prevent frustration.',
    })
  }

  return insights.slice(0, 4)
}

/**
 * Builds a structured session summary for the latest completed session
 */
export function buildLatestSessionSummary(
  sessions: SessionRecord[],
  profile: PatientPerformanceProfile
): SessionSummaryData | null {
  if (!sessions || sessions.length === 0) return null

  const latest = sessions[sessions.length - 1]
  const durMs = (latest.endedAt || latest.startedAt + 180000) - latest.startedAt
  const durationMin = Math.max(1, Math.round(durMs / 60000))
  const avgLatencySec = Math.round(((latest.avgLatencyMs || 4000) / 1000) * 10) / 10

  const activeDomainScores = COGNITIVE_DOMAINS.map((d) => {
    const ds = profile.domainScores[d]
    return {
      domain: d,
      label: DOMAIN_DISPLAY_LABELS[d] || d,
      score: ds ? ds.score : 50,
    }
  }).slice(0, 3)

  let diffChange: { from: number; to: number; reason: string } | undefined
  if (sessions.length >= 2) {
    const prev = sessions[sessions.length - 2]
    const prevDiff = (prev.difficulty || 0) + 1
    const currDiff = (latest.difficulty || 0) + 1
    if (currDiff > prevDiff) {
      diffChange = {
        from: prevDiff,
        to: currDiff,
        reason: 'Consistent accuracy prompted an adaptive step up in task difficulty.',
      }
    } else if (currDiff < prevDiff) {
      diffChange = {
        from: prevDiff,
        to: currDiff,
        reason: 'Repeated challenges prompted an adaptive adjustment to an easier activity.',
      }
    }
  }

  return {
    sessionId: latest.id,
    gameName: latest.gameName || 'Cognitive Activity',
    questionsCompleted: 5,
    accuracyPct: Math.round((latest.accuracy || 0) * 100),
    avgLatencySec,
    durationMin,
    domainScores: activeDomainScores,
    difficultyChange: diffChange,
  }
}
