export const CONTEXT_DIM = 10

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
  w: { completion: number; accuracy: number; hesitation: number; frustration: number }
): number {
  return (
    w.completion * Math.min(Math.max(completion, 0), 1) +
    w.accuracy * Math.min(Math.max(accuracy, 0), 1) -
    w.hesitation * Math.min(hesitationNorm, 1) -
    w.frustration * Math.min(frustrationIndex, 1)
  )
}
