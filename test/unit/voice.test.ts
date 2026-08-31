import { describe, it, expect, beforeEach, vi } from 'vitest'
import { VoiceHealthManager } from '../../src/lib/voice/VoiceHealthManager'
import { VoiceCache } from '../../src/lib/voice/VoiceCache'
import { VoiceQualityAgent } from '../../src/lib/voice/VoiceQualityAgent'
import { VoiceService } from '../../src/lib/voice/VoiceService'

describe('Voice Architecture & Health Manager', () => {
  beforeEach(() => {
    VoiceHealthManager.resetHealth()
  })

  it('initializes in healthy state', () => {
    const state = VoiceHealthManager.getState()
    expect(state.voiceStatus).toBe('healthy')
    expect(state.consecutiveFailures).toBe(0)
    expect(VoiceHealthManager.isVoiceAvailable()).toBe(true)
  })

  it('enters unavailable state on 401/403 auth failure with backoff', () => {
    VoiceHealthManager.recordFailure('Unauthorized API key', 401)
    const state = VoiceHealthManager.getState()
    expect(state.voiceStatus).toBe('unavailable')
    expect(state.statusCode).toBe(401)
    expect(state.backoffUntil).toBeGreaterThan(Date.now())
    expect(VoiceHealthManager.isVoiceAvailable()).toBe(false)
  })

  it('enters unavailable state on 429 quota exhaustion without spamming retries', () => {
    VoiceHealthManager.recordFailure('Quota exceeded', 429)
    const state = VoiceHealthManager.getState()
    expect(state.voiceStatus).toBe('unavailable')
    expect(state.statusCode).toBe(429)
    expect(state.backoffUntil).toBeGreaterThan(Date.now())
  })

  it('recovers to healthy on successful request', () => {
    VoiceHealthManager.recordFailure('Server timeout', 504)
    expect(VoiceHealthManager.getState().voiceStatus).toBe('degraded')

    VoiceHealthManager.recordSuccess()
    const recovered = VoiceHealthManager.getState()
    expect(recovered.voiceStatus).toBe('healthy')
    expect(recovered.consecutiveFailures).toBe(0)
  })
})

describe('VoiceCache', () => {
  it('generates consistent normalized cache keys', () => {
    const key1 = VoiceCache.generateKey('hi-IN', 'meera', '  सुप्रभात  ')
    const key2 = VoiceCache.generateKey('hi-IN', 'meera', 'सुप्रभात')
    expect(key1).toBe(key2)
  })

  it('stores and retrieves in-memory cached base64 audio', async () => {
    const key = VoiceCache.generateKey('en-IN', 'meera', 'Good morning')
    const mockAudio = 'UklGRi4AAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='
    await VoiceCache.set(key, mockAudio)

    const retrieved = await VoiceCache.get(key)
    expect(retrieved).toBe(mockAudio)
  })
})

describe('VoiceQualityAgent', () => {
  it('rejects empty audio payloads', async () => {
    const res = await VoiceQualityAgent.analyzeAudio('', 'Hello')
    expect(res.valid).toBe(false)
    expect(res.issues).toContain('Empty or missing audio base64 payload')
  })

  it('analyzes valid audio payload metrics', async () => {
    // 1000 bytes fake audio
    const fakeAudio = btoa('A'.repeat(1200))
    const res = await VoiceQualityAgent.analyzeAudio(fakeAudio, 'Good morning, how are you feeling today?')
    expect(res.metrics.charLength).toBeGreaterThan(10)
    expect(res.metrics.byteLength).toBeGreaterThan(500)
    expect(res.pacingScore).toBeGreaterThan(0)
  })
})

describe('VoiceService', () => {
  it('handles speak calls gracefully without crashing in test environment', async () => {
    const res = await VoiceService.speak('Test message for dementia patient')
    expect(typeof res).toBe('boolean')
  })

  it('handles stop cleanly', () => {
    expect(() => VoiceService.stop()).not.toThrow()
  })
})
