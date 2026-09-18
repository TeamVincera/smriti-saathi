import { describe, expect, it, vi } from 'vitest'

const { markUnavailable } = vi.hoisted(() => ({ markUnavailable: vi.fn() }))
vi.mock('../../src/lib/ai/availability', () => ({ markAIUnavailable: markUnavailable }))

import { requestAiSpeech } from '../../src/lib/ai/proxyClient'

describe('speech proxy cancellation', () => {
  it('does not mark AI offline when an intentional speech request is aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' })))
    await expect(requestAiSpeech({ provider: 'sarvam', text: 'hello', lang: 'en', voiceProfile: 'sarvam-bulbul-v3-shreya-0.9' }, controller.signal)).resolves.toBeNull()
    expect(markUnavailable).not.toHaveBeenCalled()
  })

  it('includes the non-secret voice profile in the request payload', async () => {
    const response = new Response('audio', { status: 200, headers: { 'content-type': 'audio/wav' } })
    const fetchMock = vi.fn().mockResolvedValue(response)
    vi.stubGlobal('fetch', fetchMock)
    const result = await requestAiSpeech({ provider: 'azure', text: 'hello', lang: 'en', voiceProfile: 'azure-neural-gentle-v2' })
    expect(result).not.toBeNull()
    expect(result?.type).toBe('audio/wav')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ provider: 'azure', text: 'hello', lang: 'en', voiceProfile: 'azure-neural-gentle-v2' })
  })

  it('does not mark healthy chat offline when TTS is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 503 })))
    await expect(requestAiSpeech({ provider: 'sarvam', text: 'hello', lang: 'en', voiceProfile: 'sarvam-bulbul-v3-shreya-0.9' })).resolves.toBeNull()
    expect(markUnavailable).not.toHaveBeenCalled()
  })

  it('falls back cleanly when a successful TTS response has no audio bytes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))
    await expect(requestAiSpeech({ provider: 'sarvam', text: 'hello', lang: 'en' })).resolves.toBeNull()
  })
})
