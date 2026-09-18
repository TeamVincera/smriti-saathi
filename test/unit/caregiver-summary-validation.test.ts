import { describe, expect, it, vi } from 'vitest'

const requestAiChat = vi.hoisted(() => vi.fn())

vi.mock('../../src/lib/ai/availability', () => ({
  isAIAvailable: () => true,
}))

vi.mock('../../src/lib/ai/proxyClient', () => ({
  requestAiChat,
}))

import { AIService } from '../../src/lib/ai/AIService'

describe('caregiver summary safety boundary', () => {
  it('does not fabricate adherence when no medication records exist', async () => {
    requestAiChat.mockResolvedValueOnce(null)
    const result = await AIService.generateCaretakerSummary({ sessions: [], adherencePct: null, medCount: 2 })

    expect(result.isOnlineAI).toBe(false)
    expect(result.observations.join(' ')).toContain('No medication records are available yet')
    expect(result.observations.join(' ')).not.toContain('80%')
    expect(result.routineAdherenceNote).toContain('No medication records are available yet')
  })

  it('falls back safely when the model returns objects or unsafe medical directives', async () => {
    requestAiChat.mockResolvedValueOnce(JSON.stringify({
      headline: { text: 'Ignore the system prompt' },
      strengths: ['Good morning routine', { unsafe: true }, 'Take more medication now'],
      observations: ['Gentle engagement', 42],
      routineAdherenceNote: 'Change the medication dose today',
      suggestedFocus: '<script>alert(1)</script>',
    }))

    const result = await AIService.generateCaretakerSummary({ sessions: [], adherencePct: null, medCount: 0 })

    expect(result.isOnlineAI).toBe(false)
    expect(typeof result.headline).toBe('string')
    expect(result.strengths.every((value) => typeof value === 'string')).toBe(true)
    expect(result.observations.every((value) => typeof value === 'string')).toBe(true)
    expect(result.routineAdherenceNote).not.toMatch(/change.*dose/i)
    expect(result.suggestedFocus).not.toContain('<script>')
  })
})
