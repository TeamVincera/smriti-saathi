import { FEATURE_DIMENSION } from './FeatureExtractor'
import { dbGet, dbSet } from '../db'

export interface BanditArm {
  Ainv: number[][]
  b: number[]
  n: number
}

export type BanditArms = Record<string, BanditArm>

function createIdentityMatrix(dim: number): number[][] {
  const m: number[][] = []
  for (let i = 0; i < dim; i++) {
    const row = new Array(dim).fill(0)
    row[i] = 1.0
    m.push(row)
  }
  return m
}

export function newBanditArm(dim: number = FEATURE_DIMENSION): BanditArm {
  return {
    Ainv: createIdentityMatrix(dim),
    b: new Array(dim).fill(0),
    n: 0,
  }
}

function matVec(A: number[][], x: number[]): number[] {
  const len = A.length
  const out = new Array(len).fill(0)
  for (let i = 0; i < len; i++) {
    let s = 0
    const row = A[i]
    for (let j = 0; j < row.length; j++) {
      s += row[j] * x[j]
    }
    out[i] = s
  }
  return out
}

function dot(a: number[], b: number[]): number {
  let s = 0
  for (let i = 0; i < a.length; i++) {
    s += a[i] * b[i]
  }
  return s
}

/**
 * Contextual Multi-Armed Bandit Policy (LinUCB)
 * Pure offline ridge-regression updates using Sherman-Morrison rank-1 formula.
 */
class BanditPolicyClass {
  private arms: BanditArms = {}
  private isLoaded = false
  private alpha = 0.8 // Exploration coefficient

  constructor() {
    void this.load()
  }

  public async load(): Promise<void> {
    if (this.isLoaded) return
    try {
      const stored = await dbGet<BanditArms>('kv', 'adaptive_bandit_arms')
      if (stored && typeof stored === 'object') {
        this.arms = stored
      }
    } catch {
      // In-memory fallback
    }
    this.isLoaded = true
  }

  private async persist(): Promise<void> {
    try {
      await dbSet('kv', this.arms, 'adaptive_bandit_arms')
    } catch {}
  }

  public getArm(armId: string): BanditArm {
    if (!this.arms[armId]) {
      this.arms[armId] = newBanditArm(FEATURE_DIMENSION)
    }
    return this.arms[armId]
  }

  /**
   * Evaluates candidate arms with LinUCB expected reward + confidence bonus
   */
  public scoreArm(armId: string, x: number[], explorationBudget = 1.0): { mean: number; bonus: number; total: number; isExploration: boolean } {
    const arm = this.getArm(armId)
    const Ax = matVec(arm.Ainv, x)
    const theta = matVec(arm.Ainv, arm.b)
    const mean = dot(theta, x)

    const variance = Math.max(1e-6, dot(x, Ax))
    const bonus = this.alpha * explorationBudget * Math.sqrt(variance)
    const total = mean + bonus

    const isExploration = bonus > 0.4 || arm.n < 3
    return { mean, bonus, total, isExploration }
  }

  /**
   * Sherman-Morrison rank-1 update on arm inverse matrix
   */
  public updateArm(armId: string, x: number[], reward: number): void {
    const arm = this.getArm(armId)
    const Ax = matVec(arm.Ainv, x)
    const denom = 1 + dot(x, Ax)

    // Ainv_new = Ainv - (Ax * Ax^T) / denom
    for (let i = 0; i < arm.Ainv.length; i++) {
      for (let j = 0; j < arm.Ainv[i].length; j++) {
        arm.Ainv[i][j] -= (Ax[i] * Ax[j]) / denom
      }
    }

    for (let i = 0; i < arm.b.length; i++) {
      arm.b[i] += x[i] * reward
    }

    arm.n += 1
    void this.persist()
  }

  public reset(): void {
    this.arms = {}
    void this.persist()
  }
}

export const BanditPolicy = new BanditPolicyClass()
