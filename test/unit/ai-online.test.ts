import { beforeEach, describe, expect, it, vi } from 'vitest'

const requestAiChat = vi.hoisted(() => vi.fn())

vi.mock('../../src/lib/ai/availability', () => ({
  isAIAvailable: () => true,
}))

vi.mock('../../src/lib/ai/proxyClient', () => ({
  requestAiChat,
}))

import { AIService } from '../../src/lib/ai/AIService'

describe('AIService online conversational path', () => {
  beforeEach(() => {
    requestAiChat.mockReset()
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
  })

  it('sends the actual broad user question to the backend with the empathy prompt', async () => {
    requestAiChat.mockResolvedValueOnce('A practical answer from the backend.')

    const result = await AIService.chat([
      { role: 'user', content: 'How can I make a simple breakfast today?' },
    ])

    expect(result).toBe('A practical answer from the backend.')
    expect(requestAiChat).toHaveBeenCalledTimes(1)
    const payload = requestAiChat.mock.calls[0][0]
    expect(payload.messages[0].role).toBe('system')
    expect(payload.messages[0].content).toContain("Answer the user's actual question first")
    expect(payload.messages.at(-1)).toEqual({ role: 'user', content: 'How can I make a simple breakfast today?' })
  })

  it('still uses the authoritative backend when WKWebView reports offline', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })
    requestAiChat.mockResolvedValueOnce('A live answer while the browser flag is stale.')

    const result = await AIService.chat([{ role: 'user', content: 'What is on my schedule?' }])

    expect(result).toBe('A live answer while the browser flag is stale.')
    expect(requestAiChat).toHaveBeenCalledOnce()
  })
})
