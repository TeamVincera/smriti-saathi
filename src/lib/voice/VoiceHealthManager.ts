/**
 * VoiceHealthManager
 * Monitors Sarvam Voice API connectivity, authentication, quotas, rate limits, and errors.
 * Ensures strict fault isolation so voice failures never crash or disrupt the core app.
 */

export type VoiceStatus = 'healthy' | 'degraded' | 'unavailable'

export interface VoiceHealthState {
  voiceStatus: VoiceStatus
  lastSuccessfulRequest: number | null
  lastFailure: number | null
  failureReason: string | null
  statusCode: number | null
  retryCount: number
  consecutiveFailures: number
  backoffUntil: number
  totalRequests: number
  totalFailures: number
  cacheHitCount: number
}

type HealthListener = (state: VoiceHealthState) => void

class VoiceHealthManagerClass {
  private state: VoiceHealthState = {
    voiceStatus: 'healthy',
    lastSuccessfulRequest: null,
    lastFailure: null,
    failureReason: null,
    statusCode: null,
    retryCount: 0,
    consecutiveFailures: 0,
    backoffUntil: 0,
    totalRequests: 0,
    totalFailures: 0,
    cacheHitCount: 0,
  }

  private listeners = new Set<HealthListener>()

  constructor() {
    // Restore health snapshot if stored
    try {
      const saved = sessionStorage.getItem('ss_voice_health')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && typeof parsed === 'object') {
          this.state = { ...this.state, ...parsed }
          // If backoff period expired, reset to healthy check
          if (this.state.backoffUntil && Date.now() > this.state.backoffUntil) {
            this.state.voiceStatus = 'healthy'
            this.state.backoffUntil = 0
            this.state.consecutiveFailures = 0
          }
        }
      }
    } catch {}
  }

  public getState(): Readonly<VoiceHealthState> {
    return { ...this.state }
  }

  public subscribe(fn: HealthListener): () => void {
    this.listeners.add(fn)
    fn(this.getState())
    return () => {
      this.listeners.delete(fn)
    }
  }

  private emit() {
    try {
      sessionStorage.setItem('ss_voice_health', JSON.stringify(this.state))
    } catch {}
    this.listeners.forEach((l) => {
      try {
        l(this.getState())
      } catch {}
    })
  }

  public isVoiceAvailable(): boolean {
    if (this.state.voiceStatus === 'unavailable') {
      // Check if backoff window has ended
      if (this.state.backoffUntil > 0 && Date.now() < this.state.backoffUntil) {
        return false
      }
      // Backoff expired, allow trial request
      return true
    }
    return true
  }

  public recordRequestStart() {
    this.state.totalRequests++
  }

  public recordCacheHit() {
    this.state.cacheHitCount++
  }

  public recordSuccess() {
    this.state.voiceStatus = 'healthy'
    this.state.lastSuccessfulRequest = Date.now()
    this.state.failureReason = null
    this.state.statusCode = 200
    this.state.consecutiveFailures = 0
    this.state.backoffUntil = 0
    this.state.retryCount = 0
    this.emit()
  }

  public recordFailure(reason: string, statusCode?: number) {
    const now = Date.now()
    this.state.lastFailure = now
    this.state.failureReason = reason
    this.state.statusCode = statusCode ?? null
    this.state.totalFailures++
    this.state.consecutiveFailures++

    // Determine backoff & status based on error type
    if (statusCode === 401 || statusCode === 403) {
      // Authentication / Invalid key: do not spam, disable voice for 30 minutes
      this.state.voiceStatus = 'unavailable'
      this.state.backoffUntil = now + 30 * 60 * 1000
    } else if (statusCode === 429 || reason.toLowerCase().includes('quota') || reason.toLowerCase().includes('credit')) {
      // Quota Exceeded / Rate Limit: Exponential backoff to avoid wasting credits
      this.state.voiceStatus = 'unavailable'
      const backoffMinutes = Math.min(60, Math.pow(2, Math.min(this.state.consecutiveFailures, 6)) * 2) // 4m, 8m, 16m, 32m, 60m
      this.state.backoffUntil = now + backoffMinutes * 60 * 1000
    } else if (statusCode && statusCode >= 500) {
      // Server error: degrade with short backoff
      this.state.voiceStatus = 'degraded'
      this.state.backoffUntil = now + Math.min(60000, 5000 * this.state.consecutiveFailures)
    } else {
      // Network timeout or other non-fatal
      if (this.state.consecutiveFailures >= 3) {
        this.state.voiceStatus = 'degraded'
        this.state.backoffUntil = now + 15000
      }
    }

    this.emit()
  }

  public resetHealth() {
    this.state.voiceStatus = 'healthy'
    this.state.consecutiveFailures = 0
    this.state.backoffUntil = 0
    this.state.failureReason = null
    this.state.statusCode = null
    this.emit()
  }
}

export const VoiceHealthManager = new VoiceHealthManagerClass()
