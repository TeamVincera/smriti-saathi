import type { DifficultyLevel, PatientPerformanceProfile, QuestionMetadata } from './types'

export interface SafetyCheckResult {
  allowed: boolean
  adjustedQuestion?: QuestionMetadata
  overrideReason?: string
}

/**
 * Clinical Rule-Based Safety Layer
 * Enforces guardrails around ML recommendations to prevent patient frustration,
 * protect against failure spirals, and avoid rapid difficulty volatility.
 */
class SafetyGuardClass {
  /**
   * Evaluates a candidate question against patient safety rules.
   */
  public evaluate(
    candidate: QuestionMetadata,
    profile: PatientPerformanceProfile,
    allCandidates: QuestionMetadata[]
  ): SafetyCheckResult {
    const domain = candidate.cognitiveDomain
    const domainScore = profile.domainScores[domain]
    const consecutiveDomainErrors = domainScore ? domainScore.consecutiveIncorrect : profile.consecutiveIncorrect
    const recentLatency = profile.recentResponseTimeMs

    // Rule 1: Anti-Repetition Guard
    const last3Questions = profile.recentQuestions.slice(-3)
    if (last3Questions.includes(candidate.questionId)) {
      const nonRecentCandidates = allCandidates.filter((q) => !last3Questions.includes(q.questionId))
      if (nonRecentCandidates.length > 0) {
        return {
          allowed: false,
          adjustedQuestion: nonRecentCandidates[0],
          overrideReason: 'Anti-Repetition: Question was shown in the last 3 turns; selecting novel alternative.',
        }
      }
    }

    // Rule 2: Repeated Failure Protection (Severe: 3+ errors)
    if (consecutiveDomainErrors >= 3 || profile.consecutiveIncorrect >= 3) {
      if (candidate.difficulty > 2) {
        // Force easier difficulty 1 or 2
        const easier = allCandidates.find(
          (q) => q.cognitiveDomain === domain && q.difficulty <= 2 && !last3Questions.includes(q.questionId)
        ) || allCandidates.find((q) => q.difficulty === 1)

        if (easier && easier.questionId !== candidate.questionId) {
          return {
            allowed: false,
            adjustedQuestion: easier,
            overrideReason: `Failure Protection: ${consecutiveDomainErrors} consecutive mistakes detected in ${domain}; stepped down to ${easier.difficulty} (${easier.category}) to restore confidence.`,
          }
        }
      }
    }

    // Rule 3: Repeated Failure Warning (2 errors)
    if (consecutiveDomainErrors >= 2 && candidate.difficulty >= 4) {
      const moderate = allCandidates.find(
        (q) => q.cognitiveDomain === domain && q.difficulty <= 3 && !last3Questions.includes(q.questionId)
      )
      if (moderate && moderate.questionId !== candidate.questionId) {
        return {
          allowed: false,
          adjustedQuestion: moderate,
          overrideReason: `Failure Warning: 2 consecutive mistakes in ${domain}; blocked high-difficulty arm.`,
        }
      }
    }

    // Rule 4: Fatigue / Cognitive Slowing Guard
    if (recentLatency > 10000 && candidate.difficulty > 2) {
      const gentle = allCandidates.find((q) => q.difficulty <= 2 && !last3Questions.includes(q.questionId))
      if (gentle && gentle.questionId !== candidate.questionId) {
        return {
          allowed: false,
          adjustedQuestion: gentle,
          overrideReason: `Fatigue Guard: Elevated response latency (${Math.round(recentLatency)}ms) indicates cognitive fatigue; switching to gentle activity.`,
        }
      }
    }

    // Rule 5: Gradual Difficulty Progression Guard
    const currentDomainDiff = domainScore ? domainScore.currentDifficulty : 2
    if (candidate.difficulty > currentDomainDiff + 1) {
      const boundedCandidate = allCandidates.find(
        (q) => q.cognitiveDomain === domain && q.difficulty === Math.min(5, currentDomainDiff + 1) && !last3Questions.includes(q.questionId)
      )
      if (boundedCandidate && boundedCandidate.questionId !== candidate.questionId) {
        return {
          allowed: false,
          adjustedQuestion: boundedCandidate,
          overrideReason: `Progression Guard: Prevented jumping difficulty from ${currentDomainDiff} to ${candidate.difficulty}; capped next step to ${boundedCandidate.difficulty}.`,
        }
      }
    }

    return { allowed: true }
  }

  /**
   * Filters and sorts an entire pool of candidates through safety criteria
   */
  public filterSafeCandidates(
    candidates: QuestionMetadata[],
    profile: PatientPerformanceProfile
  ): QuestionMetadata[] {
    const recent = profile.recentQuestions.slice(-5)
    let filtered = candidates.filter((c) => !recent.includes(c.questionId))
    if (filtered.length === 0) filtered = candidates

    // If struggling, remove difficulty 4 and 5
    if (profile.consecutiveIncorrect >= 2) {
      const easyPool = filtered.filter((c) => c.difficulty <= 3)
      if (easyPool.length > 0) return easyPool
    }

    return filtered
  }
}

export const SafetyGuard = new SafetyGuardClass()
