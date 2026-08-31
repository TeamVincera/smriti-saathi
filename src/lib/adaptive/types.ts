/**
 * Cognitive Domains and Types for Offline Adaptive Question Engine
 * Designed for low-end devices and localized for North-Eastern India.
 * Non-diagnostic: Measures task-specific performance only.
 */

export type CognitiveDomain =
  | 'memory'
  | 'attention'
  | 'recognition'
  | 'recall'
  | 'sequencing'
  | 'visual_recognition'
  | 'auditory_recognition'
  | 'problem_solving'

export const COGNITIVE_DOMAINS: CognitiveDomain[] = [
  'memory',
  'attention',
  'recognition',
  'recall',
  'sequencing',
  'visual_recognition',
  'auditory_recognition',
  'problem_solving',
]

export const DOMAIN_DISPLAY_LABELS: Record<CognitiveDomain, string> = {
  memory: 'Memory Task Performance',
  attention: 'Attention Task Performance',
  recognition: 'Recognition Task Performance',
  recall: 'Recall Task Performance',
  sequencing: 'Sequencing Task Performance',
  visual_recognition: 'Visual Recognition Task Performance',
  auditory_recognition: 'Auditory Recognition Task Performance',
  problem_solving: 'Problem Solving Task Performance',
}

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  1: 'Very Easy',
  2: 'Easy',
  3: 'Moderate',
  4: 'Difficult',
  5: 'Very Difficult',
}

export type QuestionType =
  | 'multiple_choice'
  | 'sequence'
  | 'match'
  | 'audio_id'
  | 'visual_search'
  | 'reminiscence'
  | 'association'

export interface QuestionMetadata {
  questionId: string
  gameId: string
  category: string
  cognitiveDomain: CognitiveDomain
  difficulty: DifficultyLevel
  language: string
  /**
   * Regional cultural relevance to North-Eastern India (0.0 to 1.0)
   * 1.0 = Highly specific local cultural reference (e.g. Bihu Dhol, Tokari, Mizo Cheraw)
   * 0.5 = General Indian / ubiquitous item
   * 0.0 = Universal neutral item
   */
  regionalRelevance: number
  estimatedTimeSec: number
  questionType: QuestionType
  prompt: string
  promptHi?: string
  promptAs?: string
  options?: any[]
  correctAnswer: any
  media?: {
    type: 'audio' | 'image' | 'icon'
    src: string
    prompt?: string
  }
  culturalTags?: string[]
}

export interface PerformanceObservation {
  questionId: string
  gameId: string
  domain: CognitiveDomain
  difficulty: DifficultyLevel
  correct: boolean
  latencyMs: number
  hintsUsed: number
  timestamp: number
}

export interface DomainPerformanceScore {
  domain: CognitiveDomain
  label: string
  /** Score from 0 to 100 representing task proficiency */
  score: number
  attempts: number
  accuracy: number
  avgLatencyMs: number
  consecutiveCorrect: number
  consecutiveIncorrect: number
  currentDifficulty: DifficultyLevel
  lastUpdated: number
}

export interface PatientPerformanceProfile {
  overallAccuracy: number
  totalAttempts: number
  recentAccuracy3: number
  recentAccuracy5: number
  recentAccuracy10: number
  avgResponseTimeMs: number
  recentResponseTimeMs: number
  hintsUsedTotal: number
  consecutiveCorrect: number
  consecutiveIncorrect: number
  domainScores: Record<CognitiveDomain, DomainPerformanceScore>
  recentQuestions: string[]
  questionAttemptCounts: Record<string, number>
  lastActiveTs: number
}

export interface SelectionExplanation {
  timestamp: number
  questionId: string
  gameId: string
  domain: CognitiveDomain
  difficulty: DifficultyLevel
  score: number
  reason: string
  safetyOverrideApplied: boolean
  featuresSummary: {
    overallAcc: number
    recentAcc: number
    domainScore: number
    regionalRelevance: number
    repetitionPenalty: number
  }
}

export interface SelectionResult {
  question: QuestionMetadata
  score: number
  explanation: SelectionExplanation
  isExploration: boolean
}
