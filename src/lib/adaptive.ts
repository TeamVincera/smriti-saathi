import { dbGet, dbSet } from './db'
import { PerformanceTracker } from './adaptive/PerformanceTracker'
import { AdaptiveQuestionEngine } from './adaptive/AdaptiveQuestionEngine'
import { BanditPolicy } from './adaptive/BanditPolicy'
import { registerAbilityCacheReset } from './adaptive/abilityCacheReset'
import type { CognitiveDomain, DifficultyLevel } from './adaptive/types'

export const MAX_LEVEL = 4

// Simplified 1-parameter logistic item-response model, tuned for Errorless
// Learning: the engine aims to keep the patient near a high success rate while
// still stretching ability one small step at a time. All state is a single
// number per cognitive domain, so updates are O(1) and persist offline.
const SLOPE = 1.15
const TARGET_SUCCESS = 0.75
const LOGIT_TARGET = Math.log(TARGET_SUCCESS / (1 - TARGET_SUCCESS))
const THETA_MIN = -0.5
const THETA_MAX = MAX_LEVEL + 0.5

export interface AbilityRec {
  theta: number
  n: number
}

type AbilityMap = Record<string, AbilityRec>

let cache: AbilityMap | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null

export function defaultAbility(): AbilityRec {
  return { theta: 0.8, n: 0 }
}

function clampTheta(v: number): number {
  return Math.min(THETA_MAX, Math.max(THETA_MIN, v))
}

export function pCorrect(theta: number, level: number): number {
  return 1 / (1 + Math.exp(-SLOPE * (theta - level)))
}

export async function ensureAbilities(): Promise<void> {
  await Promise.all([PerformanceTracker.load(), BanditPolicy.ready()])
  if (cache) return
  try {
    cache = (await dbGet<AbilityMap>('kv', 'abilities')) ?? {}
  } catch {
    cache = {}
  }
}

function persistSoon() {
  if (!cache) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    void dbSet('kv', cache ?? {}, 'abilities').catch(() => {})
  }, 400)
}

registerAbilityCacheReset(() => {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = null
  cache = null
  return dbSet('kv', {}, 'abilities').then(() => undefined).catch(() => {})
})

export function getAbility(domain: string): AbilityRec {
  return cache?.[domain] ?? defaultAbility()
}

// The level the AI should try next for this domain: the difficulty at which the
// model predicts ~75% success, nudged half a step upward so every question
// gently stretches ability without risking a failure spiral.
export function nextLevel(domain: string): number {
  const { theta } = getAbility(domain)
  const ideal = theta - LOGIT_TARGET / SLOPE + 0.5
  const clamped = Math.min(MAX_LEVEL, Math.max(0, ideal))
  return Math.round(clamped)
}

export function updateAbility(
  rec: AbilityRec,
  level: number,
  correct: boolean
): AbilityRec {
  const p = pCorrect(rec.theta, level)
  const outcome = correct ? 1 : 0
  // Learning rate decays as evidence accumulates; misses pull down instantly.
  const k = Math.max(0.18, 1.1 / Math.sqrt(rec.n + 1))
  const theta = clampTheta(rec.theta + k * (outcome - p))
  return { theta, n: rec.n + 1 }
}

// Maps legacy domain names to canonical CognitiveDomain
const CANONICAL_DOMAIN_MAP: Record<string, CognitiveDomain> = {
  episodic: 'memory',
  auditory: 'auditory_recognition',
  visuospatial: 'visual_recognition',
  sequencing: 'sequencing',
  pattern: 'problem_solving',
  categorization: 'recognition',
  rhythm: 'attention',
  visualsearch: 'visual_recognition',
  workingmemory: 'memory',
  verbal: 'recall',
  numeracy: 'problem_solving',
  reminiscence: 'memory',
  relaxation: 'attention',
  recognition: 'recognition',
  recall: 'recall',
  memory: 'memory',
  attention: 'attention',
}

export function recordAnswer(domain: string, level: number, correct: boolean): void {
  if (!cache) cache = {}
  const prev = cache[domain] ?? defaultAbility()
  cache[domain] = updateAbility(prev, level, correct)
  persistSoon()

  // Also bridge to the new AdaptiveQuestionEngine & PerformanceTracker
  const mappedDomain = CANONICAL_DOMAIN_MAP[domain] || 'recognition'
  const diffLevel = (Math.min(5, Math.max(1, level + 1))) as DifficultyLevel

  AdaptiveQuestionEngine.recordAnswer({
    questionId: `legacy_${domain}_${Date.now()}`,
    gameId: domain,
    domain: mappedDomain,
    difficulty: diffLevel,
    correct,
    latencyMs: 3500,
    hintsUsed: correct ? 0 : 1,
    timestamp: Date.now(),
  })
}

export function abilitiesSnapshot(): AbilityMap {
  return { ...(cache ?? {}) }
}

// Cognitive domains shared across games
export const DOMAIN_BY_GAME: Record<string, string> = {
  faces: 'episodic',
  melodies: 'auditory',
  sounds: 'auditory',
  teawalk: 'visuospatial',
  sequence: 'sequencing',
  bridge: 'sequencing',
  loom: 'pattern',
  bamboo: 'categorization',
  oddone: 'categorization',
  cheraw: 'rhythm',
  safari: 'visualsearch',
  spot: 'visualsearch',
  pairs: 'workingmemory',
  word: 'verbal',
  market: 'numeracy',
  tales: 'reminiscence',
  garden: 'relaxation',
}

export const DOMAIN_LABELS: Record<string, string> = {
  episodic: 'Face & event memory',
  auditory: 'Sound recognition',
  visuospatial: 'Visuospatial navigation',
  sequencing: 'Ordering & steps',
  pattern: 'Pattern completion',
  categorization: 'Sorting & categories',
  rhythm: 'Rhythm & timing',
  visualsearch: 'Visual search',
  workingmemory: 'Working memory',
  verbal: 'Word finding',
  numeracy: 'Everyday numbers',
}

export function domainForGame(gameId: string): string | null {
  return DOMAIN_BY_GAME[gameId] ?? null
}

export * from './adaptive/index'
