export const CONTEXT_DIM = 10

const DEFAULT_REWARD_WEIGHTS = { completion: 0.4, accuracy: 0.4, hesitation: 0.1, frustration: 0.1 }

export interface ContextVector extends Float64Array {}

function identity(d: number): number[][] {
  const m: number[][] = []
  for (let i = 0; i < d; i++) {
    m.push(new Array(d).fill(0))
    m[i][i] = 1
  }
  return m
}

export function newArm(): { Ainv: number[][]; b: number[]; n: number } {
  return { Ainv: identity(CONTEXT_DIM), b: new Array(CONTEXT_DIM).fill(0), n: 0 }
}

function matVec(A: number[][], x: ArrayLike<number>): number[] {
  const out = new Array(A.length).fill(0)
  for (let i = 0; i < A.length; i++) {
    let s = 0
    const row = A[i]
    for (let j = 0; j < row.length; j++) s += row[j] * x[j]
    out[i] = s
  }
  return out
}

function dot(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}

export function shermanMorrisonUpdate(arm: { Ainv: number[][]; b: number[]; n: number }, x: ArrayLike<number>, r: number): void {
  const Ax = matVec(arm.Ainv, x)
  const denom = 1 + dot(x, Ax)
  for (let i = 0; i < arm.Ainv.length; i++) {
    for (let j = 0; j < arm.Ainv[i].length; j++) {
      arm.Ainv[i][j] -= (Ax[i] * Ax[j]) / denom
    }
  }
  for (let i = 0; i < arm.b.length; i++) arm.b[i] += x[i] * r
  arm.n += 1
}

export function expectedReward(arm: { Ainv: number[][]; b: number[] }, x: ArrayLike<number>): number {
  return dot(matVec(arm.Ainv, arm.b), x)
}

export function ucbBonus(arm: { Ainv: number[][] }, x: ArrayLike<number>, alpha: number): number {
  const Ax = matVec(arm.Ainv, x)
  const variance = dot(x, Ax)
  return alpha * Math.sqrt(Math.max(variance, 1e-9))
}

export interface PickResult {
  armId: string
  exploration: boolean
  score: number
}

export function pickArm(
  arms: Record<string, { Ainv: number[][]; b: number[]; n: number }>,
  candidates: string[],
  x: ArrayLike<number>,
  alphaBase: number,
  recentNovelShare: number
): PickResult | null {
  if (candidates.length === 0) return null
  const alpha = recentNovelShare > 0.3 ? alphaBase * 0.5 : alphaBase
  let bestUcbId = candidates[0]
  let bestUcb = -Infinity
  let bestMeanId = candidates[0]
  let bestMean = -Infinity
  for (const id of candidates) {
    const arm = arms[id] ?? newArm()
    const mean = expectedReward(arm, x)
    const bonus = ucbBonus(arm, x, alpha)
    const score = mean + bonus
    if (score > bestUcb) {
      bestUcb = score
      bestUcbId = id
    }
    if ((arm.n === 0 ? mean + 10 : mean) > bestMean) {
      bestMean = arm.n === 0 ? mean + 10 : mean
      bestMeanId = id
    }
  }
  const exploration = bestUcbId !== bestMeanId
  return { armId: bestUcbId, exploration, score: bestUcb }
}

export function computeReward(
  completion: number,
  accuracy: number,
  hesitationNorm: number,
  frustrationIndex: number,
  w?: Partial<typeof DEFAULT_REWARD_WEIGHTS>
): number {
  const weights = {
    completion: Number.isFinite(w?.completion) && (w?.completion ?? 0) >= 0 ? w!.completion! : DEFAULT_REWARD_WEIGHTS.completion,
    accuracy: Number.isFinite(w?.accuracy) && (w?.accuracy ?? 0) >= 0 ? w!.accuracy! : DEFAULT_REWARD_WEIGHTS.accuracy,
    hesitation: Number.isFinite(w?.hesitation) && (w?.hesitation ?? 0) >= 0 ? w!.hesitation! : DEFAULT_REWARD_WEIGHTS.hesitation,
    frustration: Number.isFinite(w?.frustration) && (w?.frustration ?? 0) >= 0 ? w!.frustration! : DEFAULT_REWARD_WEIGHTS.frustration,
  }
  return (
    weights.completion * Math.min(Math.max(completion, 0), 1) +
    weights.accuracy * Math.min(Math.max(accuracy, 0), 1) -
    weights.hesitation * Math.min(hesitationNorm, 1) -
    weights.frustration * Math.min(frustrationIndex, 1)
  )
}
