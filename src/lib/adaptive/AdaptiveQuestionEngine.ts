import {
  type CognitiveDomain,
  type DifficultyLevel,
  type PatientPerformanceProfile,
  type PerformanceObservation,
  type QuestionMetadata,
  type SelectionExplanation,
  type SelectionResult,
  COGNITIVE_DOMAINS,
} from './types'
import { QuestionRepository } from './QuestionRepository'
import { PerformanceTracker } from './PerformanceTracker'
import { extractFeatures } from './FeatureExtractor'
import { MLInferenceEngine } from './MLInferenceEngine'
import { BanditPolicy } from './BanditPolicy'
import { SafetyGuard } from './SafetyGuard'
import { ExplainabilityLogger } from './ExplainabilityLogger'
import type { Profile } from '../types'

export interface SelectNextQuestionOptions {
  gameId?: string
  targetDomain?: CognitiveDomain
  candidateQuestions?: QuestionMetadata[]
  patientCulturalProfile?: Profile
  explorationBudget?: number
}

/**
 * Adaptive Question Engine
 * Integrates Performance Tracking, Feature Extraction, On-Device MLP Neural Scoring,
 * Contextual Multi-Armed Bandit (LinUCB), Safety Guardrails, and Explainability.
 */
class AdaptiveQuestionEngineClass {
  /**
   * Selects the most appropriate next question for the patient.
   */
  public selectNextQuestion(options: SelectNextQuestionOptions = {}): SelectionResult {
    let pool = options.candidateQuestions || []
    if (pool.length === 0) {
      if (options.gameId) {
        pool = QuestionRepository.getQuestionsByGame(options.gameId)
      } else if (options.targetDomain) {
        pool = QuestionRepository.getQuestionsByDomain(options.targetDomain)
      } else {
        pool = QuestionRepository.getAllQuestions()
      }
    }

    // If pool is still empty, fetch all questions as safety fallback
    if (pool.length === 0) {
      pool = QuestionRepository.getAllQuestions()
    }

    const profile = PerformanceTracker.getProfile()
    const safePool = SafetyGuard.filterSafeCandidates(pool, profile)
    const activePool = safePool.length > 0 ? safePool : pool

    // Cold-start strategy: For a new patient with no history
    if (profile.totalAttempts === 0) {
      const coldStartQuestion = this.selectColdStartQuestion(activePool, options.patientCulturalProfile)
      const explanation: SelectionExplanation = {
        timestamp: Date.now(),
        questionId: coldStartQuestion.questionId,
        gameId: coldStartQuestion.gameId,
        domain: coldStartQuestion.cognitiveDomain,
        difficulty: coldStartQuestion.difficulty,
        score: 0.9,
        reason: 'Cold Start: Selected culturally familiar entry activity at gentle baseline difficulty.',
        safetyOverrideApplied: false,
        featuresSummary: {
          overallAcc: 0.5,
          recentAcc: 0.5,
          domainScore: 50,
          regionalRelevance: coldStartQuestion.regionalRelevance,
          repetitionPenalty: 0,
        },
      }
      ExplainabilityLogger.logDecision(explanation)
      return {
        question: coldStartQuestion,
        score: 0.9,
        explanation,
        isExploration: false,
      }
    }

    // Score all candidate questions with MLP + Bandit
    let bestCandidate = activePool[0]
    let bestScore = -Infinity
    let bestIsExploration = false
    let bestFeatures: number[] = []

    for (const candidate of activePool) {
      const features = extractFeatures(candidate, profile, options.patientCulturalProfile)

      // 1. MLP forward pass score
      const mlpScore = MLInferenceEngine.predict(features)

      // 2. Bandit policy LinUCB score
      const armId = `${candidate.cognitiveDomain}:${candidate.difficulty}`
      const banditResult = BanditPolicy.scoreArm(armId, features, options.explorationBudget ?? 1.0)

      // Combined Hybrid Score: 60% Bandit (online personalization) + 40% MLP (feature synthesis)
      const combinedScore = 0.6 * banditResult.total + 0.4 * mlpScore

      if (combinedScore > bestScore) {
        bestScore = combinedScore
        bestCandidate = candidate
        bestIsExploration = banditResult.isExploration
        bestFeatures = features
      }
    }

    // Apply Rule-Based Clinical Safety Guard
    const safetyCheck = SafetyGuard.evaluate(bestCandidate, profile, activePool)
    let selectedQuestion = bestCandidate
    let safetyOverride = false
    let reason = `Selected ${bestCandidate.cognitiveDomain} (Difficulty ${bestCandidate.difficulty}) with combined appropriateness score of ${bestScore.toFixed(2)}.`

    if (!safetyCheck.allowed && safetyCheck.adjustedQuestion) {
      selectedQuestion = safetyCheck.adjustedQuestion
      safetyOverride = true
      reason = safetyCheck.overrideReason || reason
    }

    const domainScore = profile.domainScores[selectedQuestion.cognitiveDomain]?.score || 50
    const explanation: SelectionExplanation = {
      timestamp: Date.now(),
      questionId: selectedQuestion.questionId,
      gameId: selectedQuestion.gameId,
      domain: selectedQuestion.cognitiveDomain,
      difficulty: selectedQuestion.difficulty,
      score: bestScore,
      reason,
      safetyOverrideApplied: safetyOverride,
      featuresSummary: {
        overallAcc: profile.overallAccuracy,
        recentAcc: profile.recentAccuracy5,
        domainScore,
        regionalRelevance: selectedQuestion.regionalRelevance,
        repetitionPenalty: bestFeatures[21] || 0,
      },
    }

    ExplainabilityLogger.logDecision(explanation)

    return {
      question: selectedQuestion,
      score: bestScore,
      explanation,
      isExploration: bestIsExploration,
    }
  }

  /**
   * Cold start selector: Prefers difficulty 1 or 2 with high regional relevance
   */
  private selectColdStartQuestion(pool: QuestionMetadata[], patientCulturalProfile?: Profile): QuestionMetadata {
    const easyCandidates = pool.filter((q) => q.difficulty <= 2)
    const list = easyCandidates.length > 0 ? easyCandidates : pool

    // Prefer matching patient's state / culture if provided
    if (patientCulturalProfile?.cultural?.state) {
      const state = patientCulturalProfile.cultural.state.toLowerCase()
      const regionalMatch = list.find((q) => q.culturalTags?.some((t) => t.toLowerCase().includes(state)))
      if (regionalMatch) return regionalMatch
    }

    // Otherwise choose highest regional relevance
    return [...list].sort((a, b) => b.regionalRelevance - a.regionalRelevance)[0] || list[0]
  }

  /**
   * Records a completed question result and updates model state
   */
  public recordAnswer(observation: PerformanceObservation): PatientPerformanceProfile {
    // 1. Update Performance Tracker
    const updatedProfile = PerformanceTracker.recordObservation(observation)

    // 2. Extract features for model update
    const dummyMeta: QuestionMetadata = {
      questionId: observation.questionId,
      gameId: observation.gameId,
      category: observation.domain,
      cognitiveDomain: observation.domain,
      difficulty: observation.difficulty,
      language: 'en',
      regionalRelevance: 0.9,
      estimatedTimeSec: 15,
      questionType: 'multiple_choice',
      prompt: '',
      correctAnswer: '',
    }
    const features = extractFeatures(dummyMeta, updatedProfile)

    // 3. Compute reward: accuracy (0.5), latency speed (0.3), low hints (0.2)
    const latencyFactor = Math.max(0, 1 - observation.latencyMs / 12000)
    const hintFactor = Math.max(0, 1 - (observation.hintsUsed || 0) / 2)
    const reward = (observation.correct ? 0.6 : -0.3) + 0.25 * latencyFactor + 0.15 * hintFactor

    // 4. Update Contextual Bandit Arm
    const armId = `${observation.domain}:${observation.difficulty}`
    BanditPolicy.updateArm(armId, features, reward)

    return updatedProfile
  }

  public getProfile(): PatientPerformanceProfile {
    return PerformanceTracker.getProfile()
  }

  public getRecentExplanations(limit = 10): SelectionExplanation[] {
    return ExplainabilityLogger.getRecentLogs(limit)
  }

  public resetAll(): void {
    PerformanceTracker.reset()
    BanditPolicy.reset()
    ExplainabilityLogger.clear()
  }
}

export const AdaptiveQuestionEngine = new AdaptiveQuestionEngineClass()
