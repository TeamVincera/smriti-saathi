import type { SessionRecord, ClinicalConfig } from './types'
import { GAMES, unlockedGames, PHASE_UNLOCK_SESSIONS, gameById } from './games'
import { buildContext } from './sathi'
import { computeReward, newArm, pickArm, shermanMorrisonUpdate } from './linucb'
import { loadBandit, saveBandit, getSessions, loadConfig, addEvent, addSession, loadProfile } from './db'
import { DOMAIN_BY_GAME, MAX_LEVEL, getAbility } from './adaptive'
import { AIService } from './ai/AIService'
import { PatientContextBuilder } from './ai/PatientContextBuilder'

export { AIService, PatientContextBuilder }
export * from './ai/AIService'
export * from './ai/PatientContextBuilder'

const DIFFICULTIES = [0, 1]

// Session-level starting difficulty informed by the per-domain ability model:
// a patient whose answers have pushed their abilities up begins sessions on
// the harder arm instead of re-learning from zero.
export function startingLevelFor(gameId: string): number {
  const domain = DOMAIN_BY_GAME[gameId]
  if (!domain) return 0
  const { theta, n } = getAbility(domain)
  if (n < 4) return 0
  return theta >= MAX_LEVEL - 1 ? 1 : 0
}

function armCandidates(completed: number): { id: string; gameId: string; difficulty: number; phase: number }[] {
  const games = unlockedGames(completed)
  const out: { id: string; gameId: string; difficulty: number; phase: number }[] = []
  for (const g of games) {
    for (const d of DIFFICULTIES) out.push({ id: `${g.id}:${d}`, gameId: g.id, difficulty: d, phase: g.phase })
  }
  return out
}

export async function adherenceRate(): Promise<number> {
  try {
    const raw = localStorage.getItem('ss_adherence7d')
    if (raw) return Math.min(1, Math.max(0, parseFloat(raw)))
  } catch {}
  return 0.8
}

export async function setAdherenceRate(v: number) {
  try {
    localStorage.setItem('ss_adherence7d', String(Math.min(1, Math.max(0, v))))
  } catch {}
}

export async function recommendNextGame(): Promise<{ gameId: string; difficulty: number; exploration: boolean } | null> {
  const [sessions, bandit, config, profile] = await Promise.all([getSessions(), loadBandit(), loadConfig(), loadProfile()])
  const completed = sessions.length
  let candidates = armCandidates(completed)
  if (candidates.length === 0) return null

  // 1. Try Online AI Recommendation via Groq if available
  try {
    const context = PatientContextBuilder.build({ profile, sessions })
    const unlocked = unlockedGames(completed)
    const onlineRecommendation = await AIService.recommendAdaptiveGame(sessions, unlocked, context)
    if (onlineRecommendation) {
      void addEvent({
        kind: 'session_start',
        gameId: onlineRecommendation.gameId,
        data: { difficulty: onlineRecommendation.difficulty, source: 'groq_ai', reason: onlineRecommendation.reason },
      })
      return {
        gameId: onlineRecommendation.gameId,
        difficulty: onlineRecommendation.difficulty,
        exploration: false,
      }
    }
  } catch {}

  // 2. Offline / Fallback LinUCB Contextual Bandit Engine
  if (completed === 0) {
    try {
      const raw = localStorage.getItem('ss_baseline')
      if (raw) {
        const level = JSON.parse(raw)?.level
        if (typeof level === 'number') {
          candidates = candidates.filter((c) => c.difficulty === level)
          if (candidates.length === 0) candidates = armCandidates(completed)
        }
      }
    } catch {}
  }

  const phaseLevel = completed >= PHASE_UNLOCK_SESSIONS[3] ? 3 : completed >= PHASE_UNLOCK_SESSIONS[2] ? 2 : 1
  const ctx = buildContext(sessions, await adherenceRate(), phaseLevel)
  const recent = sessions.slice(-10)
  const novelShare = recent.length ? recent.filter((s) => s.exploration).length / recent.length : 0
  const pick = pickArm(bandit, candidates.map((c) => c.id), ctx.x, config.alpha, novelShare)
  if (!pick) return null
  let chosen = candidates.find((c) => c.id === pick.armId)!
  if (completed === 0 && chosen.difficulty === 0) {
    // Warm-start: if baseline abilities are already high, open on the richer arm.
    const stronger = candidates.find((c) => c.gameId === chosen.gameId && c.difficulty === 1 && startingLevelFor(chosen.gameId) === 1)
    if (stronger) chosen = stronger
  }
  void addEvent({ kind: 'session_start', gameId: chosen.gameId, data: { difficulty: chosen.difficulty, exploration: pick.exploration, bucket: ctx.hourBucket, source: 'local_bandit' } })
  return { gameId: chosen.gameId, difficulty: chosen.difficulty, exploration: pick.exploration }
}

export async function recordSessionResult(params: {
  gameId: string
  difficulty: number
  startedAt: number
  completion: number
  accuracy: number
  avgLatencyMs: number
  hesitations: number
  cuesUsed: number
  frustrationIndex: number
  exploration: boolean
}): Promise<SessionRecord> {
  const [config, bandit] = await Promise.all([loadConfig(), loadBandit()])
  const sessions = await getSessions()
  const completed = sessions.length
  const phaseLevel = completed >= PHASE_UNLOCK_SESSIONS[3] ? 3 : completed >= PHASE_UNLOCK_SESSIONS[2] ? 2 : 1
  const ctx = buildContext(sessions, await adherenceRate(), phaseLevel)
  const reward = computeReward(
    params.completion,
    params.accuracy,
    params.hesitations / 6,
    params.frustrationIndex,
    config.weights
  )
  const armId = `${params.gameId}:${params.difficulty}`
  const arm = bandit[armId] ?? newArm()
  shermanMorrisonUpdate(arm, ctx.x, reward)
  bandit[armId] = arm
  await saveBandit(bandit)

  const game = gameById(params.gameId)
  const rec: SessionRecord = {
    id: `s-${params.startedAt}`,
    gameId: params.gameId,
    gameName: game?.name ?? params.gameId,
    difficulty: params.difficulty,
    startedAt: params.startedAt,
    endedAt: Date.now(),
    completion: params.completion,
    accuracy: params.accuracy,
    avgLatencyMs: params.avgLatencyMs,
    hesitations: params.hesitations,
    cuesUsed: params.cuesUsed,
    frustrationIndex: params.frustrationIndex,
    reward,
    exploration: params.exploration,
  }
  await addSession(rec)
  void addEvent({ kind: 'session_end', gameId: params.gameId, data: { reward, accuracy: params.accuracy, fi: params.frustrationIndex } })
  return rec
}

export function seedBaselineForColdStart(results: { accuracy: number; latencyMs: number }) {
  const level = results.accuracy >= 0.75 && results.latencyMs < 6000 ? 1 : results.accuracy >= 0.4 ? 1 : 0
  return level
}

export function sessionCapReached(count: number, cfg: ClinicalConfig): boolean {
  return count >= cfg.maxSessionsPerDay
}

export { GAMES }
