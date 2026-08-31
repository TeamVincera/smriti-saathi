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

  constructor() {
    void this.load()
  }

  public async load(): Promise<void> {
    if (this.isLoaded) return
    try {
      const stored = await dbGet<SelectionExplanation[]>('kv', 'adaptive_explainability_logs')
      if (stored && Array.isArray(stored)) {
        this.logs = stored
      }
    } catch {}
    this.isLoaded = true
  }

  private async persist(): Promise<void> {
    try {
      await dbSet('kv', this.logs.slice(-MAX_EXPLAINABILITY_LOGS), 'adaptive_explainability_logs')
    } catch {}
  }

  public logDecision(explanation: SelectionExplanation): void {
    this.logs.push(explanation)
    if (this.logs.length > MAX_EXPLAINABILITY_LOGS) {
      this.logs = this.logs.slice(-MAX_EXPLAINABILITY_LOGS)
    }
    void this.persist()
  }

  public getRecentLogs(limit = 10): SelectionExplanation[] {
    return [...this.logs].reverse().slice(0, limit)
  }

  public clear(): void {
    this.logs = []
    void this.persist()
  }
}

export const ExplainabilityLogger = new ExplainabilityLoggerClass()
