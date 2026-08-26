import type { SessionRecord, ClinicalConfig } from './types'

export function computeFrustrationIndex(
  tapTimes: number[],
  cuesUsed: number,
  actionsTotal: number,
  durationMs: number
): number {
  if (durationMs <= 0) return 0
  let burstiness = 0
  const sorted = [...tapTimes].sort((a, b) => a - b)
  let bursts = 0
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i] - sorted[i - 1]
    if (gap < 180) bursts++
  }
  burstiness = Math.min(bursts / Math.max(actionsTotal, 1), 1)
  const cueRatio = Math.min(cuesUsed / Math.max(actionsTotal, 1), 1)
  const stall = Math.min(Math.max(durationMs / (1000 * 60 * 14), 0), 1)
  return Math.min(0.45 * burstiness + 0.4 * cueRatio + 0.15 * stall, 1)
}

const HOUR_BUCKETS = ['early', 'morning', 'afternoon', 'evening'] as const
export type HourBucket = (typeof HOUR_BUCKETS)[number]

export function bucketOfHour(h: number): HourBucket {
  if (h < 5) return 'early'
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v))
}

export interface AiContext {
  x: number[]
  hourBucket: HourBucket
}

export function buildContext(
  sessions: SessionRecord[],
  adherenceRate: number,
  phaseLevel: number
): AiContext {
  const now = new Date()
  const h = now.getHours()
  const bucket = bucketOfHour(h)
  const last3 = sessions.slice(-3)
  const acc3 = last3.length ? last3.reduce((s, r) => s + r.accuracy, 0) / last3.length : 0.5
  const lat3 = last3.length ? last3.reduce((s, r) => s + r.avgLatencyMs, 0) / last3.length : 4000
  const hes3 = last3.length ? last3.reduce((s, r) => s + r.hesitations, 0) / last3.length : 2
  const fi = sessions.length ? sessions[sessions.length - 1].frustrationIndex : 0.2
  const x = [
    bucket === 'morning' ? 1 : 0,
    bucket === 'afternoon' ? 1 : 0,
    bucket === 'evening' || bucket === 'early' ? 1 : 0,
    clamp01(acc3),
    clamp01(lat3 / 12000),
    clamp01(hes3 / 8),
    clamp01(fi),
    clamp01(adherenceRate),
    clamp01(phaseLevel / 3),
    1,
  ]
  return { x, hourBucket: bucket }
}

export function cognitiveStabilityIndex(rewards: number[]): { state: string; trend: number } {
  if (rewards.length === 0) return { state: 'steady', trend: 0 }
  const recent = rewards.slice(-4)
  const prior = rewards.slice(-8, -4)
  const avgR = recent.reduce((a, b) => a + b, 0) / recent.length
  const avgP = prior.length ? prior.reduce((a, b) => a + b, 0) / prior.length : avgR
  const trend = avgR - avgP
  if (avgR >= 0.62 && trend >= -0.03) return { state: 'flourishing', trend }
  if (trend <= -0.08 || avgR < 0.35) return { state: 'drooping' , trend }
  return { state: 'steady', trend }
}

export interface DigestNote {
  icon: string
  text: string
}

export function buildDigest(sessions: SessionRecord[], adherencePct: number): DigestNote[] {
  const notes: DigestNote[] = []
  if (sessions.length === 0) {
    return [{ icon: '🌱', text: 'No sessions yet this week — a gentle start is still a start.' }]
  }
  const byBucket: Record<string, { sum: number; n: number }> = {}
  for (const s of sessions) {
    const b = bucketOfHour(new Date(s.startedAt).getHours())
    byBucket[b] ??= { sum: 0, n: 0 }
    byBucket[b].sum += s.accuracy
    byBucket[b].n++
  }
  let bestBucket = ''
  let bestVal = -1
  for (const [b, v] of Object.entries(byBucket)) {
    const val = v.sum / v.n
    if (val > bestVal) {
      bestVal = val
      bestBucket = b
    }
  }
  if (bestBucket === 'morning') notes.push({ icon: '🌅', text: 'Attention was brightest in the mornings (roughly 9–11 AM).' })
  else if (bestBucket === 'afternoon') notes.push({ icon: '☀️', text: 'Attention peaked in the early afternoon.' })
  else if (bestBucket === 'evening') notes.push({ icon: '🌇', text: 'Evenings brought the sharpest focus.' })

  const byGame: Record<string, { sum: number; n: number; name: string }> = {}
  for (const s of sessions) {
    byGame[s.gameId] ??= { sum: 0, n: 0, name: s.gameName }
    byGame[s.gameId].sum += s.accuracy
    byGame[s.gameId].n++
  }
  const fav = Object.values(byGame).sort((a, b) => b.sum / b.n - a.sum / a.n)[0]
  if (fav) notes.push({ icon: '💛', text: `${fav.name} seems to bring the most joy and success.` })

  notes.push({
    icon: adherencePct >= 80 ? '✅' : adherencePct >= 50 ? '🟡' : '⚠️',
    text:
      adherencePct >= 80
        ? `Medicines were taken on time ${Math.round(adherencePct)}% of the time — wonderful consistency.`
        : `Medicine confirmation is at ${Math.round(adherencePct)}% this week.`,
  })
  const csi = cognitiveStabilityIndex(sessions.map((s) => s.reward))
  if (csi.state === 'flourishing') notes.push({ icon: '🌳', text: 'The stability tree is flourishing — cognition looks steady or improving.' })
  else if (csi.state === 'drooping') notes.push({ icon: '🍂', text: 'The stability tree drooped slightly — consider earlier sessions or lighter game mixes.' })
  else notes.push({ icon: '🌳', text: 'The stability tree stands steady.' })
  return notes
}

export function detectAlerts(sessions: SessionRecord[]): AppAlertCandidate[] {
  const out: AppAlertCandidate[] = []
  const last5 = sessions.slice(-5)
  const fiSpikes = last5.filter((s) => s.frustrationIndex > 0.65).length
  if (fiSpikes >= 2) {
    out.push({
      id: `fi-${Date.now()}`,
      severity: 'watch',
      titleKey: 'alert_frustration',
      detail: `${fiSpikes} recent sessions showed high frustration signals. Consider checking sleep, pain, or hydration before the next session.`,
    })
  }
  const seqFails = last5.filter((s) => s.gameId === 'sequence' && s.accuracy < 0.4).length
  if (seqFails >= 2) {
    out.push({
      id: `seq-${Date.now()}`,
      severity: 'urgent',
      titleKey: 'alert_sequence',
      detail: 'Daily Life Sequence became noticeably harder across recent plays. This can precede infections or fatigue — a check-up may help.',
    })
  }
  return out
}

export interface AppAlertCandidate {
  id: string
  severity: 'info' | 'watch' | 'urgent'
  titleKey: string
  detail: string
}

export function suggestPlan(completedSessions: number, cfg: ClinicalConfig): { perWeek: number; mix: string } {
  void cfg
  const base = completedSessions < 10 ? 4 : 5
  return { perWeek: base, mix: completedSessions < 6 ? 'Phase 1 familiarization games' : completedSessions < 12 ? 'Phase 1–2 training mix' : 'Balanced all-phase mix with reminiscence' }
}
