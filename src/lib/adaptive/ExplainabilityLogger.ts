import type { SelectionExplanation } from './types'
import { dbGet, dbSet } from '../db'

const MAX_EXPLAINABILITY_LOGS = 50

/**
 * Explainability Logger
 * Stores internal, clinical rationale for each question selection decision
 * for caregiver reviews and developer debugging.
 */
class ExplainabilityLoggerClass {
  private logs: SelectionExplanation[] = []
  private isLoaded = false
  private loading: Promise<void>
  private pendingLogs: SelectionExplanation[] = []
  private clearPending = false
  private persistQueue: Promise<void> = Promise.resolve()

  constructor() {
    this.loading = this.hydrate()
  }

  public async load(): Promise<void> {
    await this.loading
  }

  private async hydrate(): Promise<void> {
    let shouldPersist = false
    try {
      const stored = await dbGet<SelectionExplanation[]>('kv', 'adaptive_explainability_logs')
      const pending = this.pendingLogs
      const clear = this.clearPending
      shouldPersist = clear || pending.length > 0
      this.pendingLogs = []
      this.clearPending = false
      this.logs = clear ? [] : stored && Array.isArray(stored) ? stored.slice(-MAX_EXPLAINABILITY_LOGS) : []
      this.logs.push(...pending)
    } catch {
      const pending = this.pendingLogs
      const clear = this.clearPending
      this.pendingLogs = []
      this.clearPending = false
      shouldPersist = clear || pending.length > 0
      // logDecision applies synchronously before hydration; rebuild from a
      // clean in-memory snapshot before replaying pending entries.
      this.logs = []
      this.logs.push(...pending)
    }
    this.isLoaded = true
    if (shouldPersist) await this.enqueuePersist()
  }

  private enqueuePersist(): Promise<void> {
    const snapshot = this.logs.slice(-MAX_EXPLAINABILITY_LOGS)
    this.persistQueue = this.persistQueue.then(async () => {
      try {
        await dbSet('kv', snapshot, 'adaptive_explainability_logs')
      } catch {}
    })
    return this.persistQueue
  }

  public logDecision(explanation: SelectionExplanation): void {
    this.logs.push(explanation)
    if (!this.isLoaded) this.pendingLogs.push(explanation)
    if (this.logs.length > MAX_EXPLAINABILITY_LOGS) {
      this.logs = this.logs.slice(-MAX_EXPLAINABILITY_LOGS)
    }
    if (this.isLoaded) void this.enqueuePersist()
  }

  public getRecentLogs(limit = 10): SelectionExplanation[] {
    return [...this.logs].reverse().slice(0, limit)
  }

  public clear(): Promise<void> {
    this.logs = []
    this.pendingLogs = []
    if (!this.isLoaded) {
      this.clearPending = true
      return this.loading
    }
    return this.enqueuePersist()
  }
}

export const ExplainabilityLogger = new ExplainabilityLoggerClass()
