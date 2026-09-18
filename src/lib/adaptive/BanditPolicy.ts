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

function normalizeArm(raw: unknown): BanditArm | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const source = raw as { Ainv?: unknown; b?: unknown; n?: unknown }
  if (!Array.isArray(source.Ainv) || source.Ainv.length !== FEATURE_DIMENSION
    || !Array.isArray(source.b) || source.b.length !== FEATURE_DIMENSION) return null
  const matrix = source.Ainv.map((row) => Array.isArray(row) ? row.map(Number) : [])
  const vector = source.b.map(Number)
  if (matrix.some((row) => row.length !== FEATURE_DIMENSION || row.some((value) => !Number.isFinite(value)))
    || vector.some((value) => !Number.isFinite(value))) return null
  const n = Number(source.n)
  if (!Number.isFinite(n) || n < 0) return null
  return { Ainv: matrix, b: vector, n: Math.floor(n) }
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
  private loading: Promise<void>
  private pendingOperations: Array<{ type: 'reset' } | { type: 'update'; armId: string; x: number[]; reward: number }> = []
  private persistQueue: Promise<void> = Promise.resolve()

  constructor() {
    this.loading = this.hydrate()
  }

  public async load(): Promise<void> {
    await this.loading
  }

  /**
   * Wait until persisted state has been hydrated before making a decision.
   * The synchronous scoring API remains available for callers that already
   * await app readiness; new async callers should use this barrier first.
   */
  public async ready(): Promise<void> {
    await this.loading
  }

  public isReady(): boolean {
    return this.isLoaded
  }

  private async hydrate(): Promise<void> {
    let stored: BanditArms | null = null
    try {
      stored = await dbGet<BanditArms>('kv', 'adaptive_bandit_arms')
    } catch {
      // In-memory fallback
    }

    // Apply mutations made while IndexedDB was being read on top of the
    // persisted snapshot, preserving both old learning and new input.
    this.arms = {}
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
      for (const [armId, rawArm] of Object.entries(stored)) {
        const arm = normalizeArm(rawArm)
        if (arm) this.arms[armId] = arm
      }
    }
    const pending = this.pendingOperations
    this.pendingOperations = []
    for (const operation of pending) {
      if (operation.type === 'reset') {
        this.arms = {}
      } else {
        this.applyUpdate(operation.armId, operation.x, operation.reward)
      }
    }
    this.isLoaded = true

    if (pending.length > 0) {
      await this.enqueuePersist()
    }
  }

  private cloneArms(): BanditArms {
    return Object.fromEntries(
      Object.entries(this.arms).map(([id, arm]) => [id, {
        Ainv: arm.Ainv.map((row) => [...row]),
        b: [...arm.b],
        n: arm.n,
      }])
    )
  }

  private enqueuePersist(): Promise<void> {
    const snapshot = this.cloneArms()
    this.persistQueue = this.persistQueue.then(async () => {
      try {
        await dbSet('kv', snapshot, 'adaptive_bandit_arms')
      } catch {}
    })
    return this.persistQueue
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
    if (!this.isLoaded) {
      this.pendingOperations.push({ type: 'update', armId, x: [...x], reward })
    }
    this.applyUpdate(armId, x, reward)
    if (this.isLoaded) void this.enqueuePersist()
  }

  private applyUpdate(armId: string, x: number[], reward: number): void {
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
  }

  public reset(): Promise<void> {
    if (!this.isLoaded) this.pendingOperations.push({ type: 'reset' })
    this.arms = {}
    if (this.isLoaded) return this.enqueuePersist()
    return this.loading
  }
}

export const BanditPolicy = new BanditPolicyClass()
