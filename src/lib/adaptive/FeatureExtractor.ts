import type { PatientPerformanceProfile, QuestionMetadata } from './types'
import type { Profile } from '../types'

export const FEATURE_DIMENSION = 25

/**
 * Feature Extractor
 * Creates a normalized 25-dimensional feature vector [0.0, 1.0] for every question-selection decision.
 */
export function extractFeatures(
  question: QuestionMetadata,
  profile: PatientPerformanceProfile,
  patientCulturalProfile?: Profile
): number[] {
  const clamp01 = (v: number) => Math.min(1, Math.max(0, isNaN(v) ? 0 : v))

  // 1. Overall Accuracy
  const overallAcc = clamp01(profile.overallAccuracy)

  // 2. Recent Accuracy (Last 3)
  const recentAcc3 = clamp01(profile.recentAccuracy3)

  // 3. Recent Accuracy (Last 5)
  const recentAcc5 = clamp01(profile.recentAccuracy5)

  // 4. Recent Accuracy (Last 10)
  const recentAcc10 = clamp01(profile.recentAccuracy10)

  // 5. Average Response Time
  const avgLatency = clamp01(profile.avgResponseTimeMs / 15000)

  // 6. Recent Response Time
  const recentLatency = clamp01(profile.recentResponseTimeMs / 15000)

  // 7. Hints Used
  const hintsNorm = clamp01(profile.hintsUsedTotal / 10)

  // 8. Consecutive Correct Answers
  const streakCorrect = clamp01(profile.consecutiveCorrect / 5)

  // 9. Consecutive Incorrect Answers
  const streakIncorrect = clamp01(profile.consecutiveIncorrect / 3)

  // 10. Target Question Difficulty
  const targetDiff = clamp01(question.difficulty / 5)

  // 11. Previous Question Difficulty
  const prevDiff = clamp01(
    (profile.domainScores[question.cognitiveDomain]?.currentDifficulty || 2) / 5
  )

  // 12. Target Domain Score
  const targetDomainScore = clamp01(
    (profile.domainScores[question.cognitiveDomain]?.score || 50) / 100
  )

  // 13-20. Specific Cognitive Domain Task Performance Scores
  const memScore = clamp01((profile.domainScores['memory']?.score || 50) / 100)
  const attScore = clamp01((profile.domainScores['attention']?.score || 50) / 100)
  const recScore = clamp01((profile.domainScores['recognition']?.score || 50) / 100)
  const recallScore = clamp01((profile.domainScores['recall']?.score || 50) / 100)
  const seqScore = clamp01((profile.domainScores['sequencing']?.score || 50) / 100)
  const visScore = clamp01((profile.domainScores['visual_recognition']?.score || 50) / 100)
  const audScore = clamp01((profile.domainScores['auditory_recognition']?.score || 50) / 100)
  const psScore = clamp01((profile.domainScores['problem_solving']?.score || 50) / 100)

  // 21. Question Attempt Count
  const attemptCount = profile.questionAttemptCounts[question.questionId] || 0
  const attemptsNorm = clamp01(attemptCount / 5)

  // 22. Recency Penalty (1.0 if shown very recently, decaying to 0.0)
  const recentIdx = profile.recentQuestions.lastIndexOf(question.questionId)
  let recencyPenalty = 0
  if (recentIdx !== -1) {
    const distFromEnd = profile.recentQuestions.length - 1 - recentIdx
    if (distFromEnd === 0) recencyPenalty = 1.0
    else if (distFromEnd <= 2) recencyPenalty = 0.8
    else if (distFromEnd <= 5) recencyPenalty = 0.5
    else if (distFromEnd <= 10) recencyPenalty = 0.2
  }

  // 23. Repetition Frequency Penalty
  const recentWindow = profile.recentQuestions.slice(-10)
  const timesInWindow = recentWindow.filter((id) => id === question.questionId).length
  const repetitionFreq = clamp01(timesInWindow / 3)

  // 24. Personalized Regional Relevance Score
  let regRelevance = question.regionalRelevance || 0.8
  if (patientCulturalProfile?.cultural) {
    const patientState = patientCulturalProfile.cultural.state?.toLowerCase()
    const patientFestivals = (patientCulturalProfile.cultural.festivals || []).map((f) => f.toLowerCase())
    const patientHobbies = (patientCulturalProfile.cultural.hobbies || []).map((h) => h.toLowerCase())

    if (question.culturalTags && question.culturalTags.length > 0) {
      const match = question.culturalTags.some((tag) => {
        const t = tag.toLowerCase()
        return (
          (patientState && t.includes(patientState)) ||
          patientFestivals.some((f) => t.includes(f)) ||
          patientHobbies.some((h) => t.includes(h))
        )
      })
      if (match) {
        regRelevance = Math.min(1.0, regRelevance + 0.15)
      }
    }
  }
  const regionalScore = clamp01(regRelevance)

  // 25. Bias Term
  const bias = 1.0

  return [
    overallAcc,
    recentAcc3,
    recentAcc5,
    recentAcc10,
    avgLatency,
    recentLatency,
    hintsNorm,
    streakCorrect,
    streakIncorrect,
    targetDiff,
    prevDiff,
    targetDomainScore,
    memScore,
    attScore,
    recScore,
    recallScore,
    seqScore,
    visScore,
    audScore,
    psScore,
    attemptsNorm,
    recencyPenalty,
    repetitionFreq,
    regionalScore,
    bias,
  ]
}
