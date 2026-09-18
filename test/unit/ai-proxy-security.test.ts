import { EventEmitter } from 'node:events'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { handleAiProxy, resetGroqReadinessCache } from '../../server/ai-proxy.mjs'

const clientFiles = ['src/components/AIChatbot.tsx', 'src/screens/CaregiverHub.tsx', 'src/lib/ai/AIService.ts', 'src/lib/voice/SpeechToText.ts', 'src/lib/voice/SarvamSpeechService.ts', 'src/lib/voice/AzureSpeechService.ts']
const clientSource = clientFiles.map((file) => readFileSync(resolve(process.cwd(), file), 'utf8')).join('\n')

function request({ method = 'GET', url = '/api/ai/status', headers = {}, body = '', ip = `test-${Math.random()}` } = {}) {
  const req = new EventEmitter() as EventEmitter & { method: string; url: string; headers: Record<string, string>; socket: { remoteAddress: string } }
  req.method = method
  req.url = url
  req.headers = headers
  req.socket = { remoteAddress: ip }
  const response = { status: 0, headers: {}, body: '', writeHead(status: number, nextHeaders: Record<string, string>) { this.status = status; this.headers = nextHeaders }, end(payload = '') { this.body += payload } }
  queueMicrotask(() => { if (body) req.emit('data', Buffer.from(body)); req.emit('end') })
  return { req, response }
}

describe('AI proxy security boundary', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    resetGroqReadinessCache()
    delete process.env.GROQ_API_KEY
    delete process.env.AI_PROXY_ORIGINS
  })

  it('keeps provider calls and credential storage out of client code', () => {
    expect(clientSource).not.toMatch(/https:\/\/api\.(groq|sarvam)\.ai/)
    expect(clientSource).not.toMatch(/Authorization\s*:/i)
    expect(clientSource).not.toContain('ss_groq_api_key')
    expect(clientSource).not.toMatch(/VITE_(GROQ|SARVAM|AZURE_SPEECH)_API?_?KEY/)
  })

  it('returns CORS and security headers for allowed status requests', async () => {
    process.env.AI_PROXY_ORIGINS = 'https://app.example'
    const { req, response } = request({ headers: { origin: 'https://app.example' } })
    await handleAiProxy(req, response as never)
    expect(response.status).toBe(200)
    expect(response.headers['access-control-allow-origin']).toBe('https://app.example')
    expect(response.headers['x-content-type-options']).toBe('nosniff')
  })

  it('reports a deterministic health state without exposing configuration details', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })))
    delete process.env.GROQ_API_KEY
    const unavailable = request()
    await handleAiProxy(unavailable.req, unavailable.response as never)
    expect(unavailable.response.status).toBe(200)
    expect(JSON.parse(unavailable.response.body)).toEqual({ available: false, ready: false })

    process.env.GROQ_API_KEY = 'server-test-secret'
    const ready = request()
    await handleAiProxy(ready.req, ready.response as never)
    expect(ready.response.status).toBe(200)
    expect(JSON.parse(ready.response.body)).toEqual({ available: true, ready: true })
    expect(ready.response.body).not.toContain(process.env.GROQ_API_KEY)
  })

  it('uses a bounded authenticated readiness probe and caches success', async () => {
    process.env.GROQ_API_KEY = 'server-test-secret'
    vi.useFakeTimers()
    const upstream = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', upstream)
    const first = request()
    const second = request()
    await handleAiProxy(first.req, first.response as never)
    await handleAiProxy(second.req, second.response as never)
    expect(first.response.body).toBe('{"available":true,"ready":true}')
    expect(second.response.body).toBe('{"available":true,"ready":true}')
    expect(upstream).toHaveBeenCalledOnce()
    expect(upstream.mock.calls[0][0]).toBe('https://api.groq.com/openai/v1/models')
    expect(upstream.mock.calls[0][1].headers.authorization).toBe('Bearer server-test-secret')
    await vi.advanceTimersByTimeAsync(30_001)
    const expired = request()
    await handleAiProxy(expired.req, expired.response as never)
    expect(upstream).toHaveBeenCalledTimes(2)
  })

  it.each([401, 429])('normalizes readiness probe HTTP %s as unavailable', async (status) => {
    process.env.GROQ_API_KEY = 'server-test-secret'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status })))
    const { req, response } = request()
    await handleAiProxy(req, response as never)
    expect(response.status).toBe(200)
    expect(JSON.parse(response.body)).toEqual({ available: false, ready: false })
  })

  it('normalizes readiness probe timeout as unavailable and caches the failure briefly', async () => {
    process.env.GROQ_API_KEY = 'server-test-secret'
    vi.useFakeTimers()
    const upstream = vi.fn((_url: string, init: { signal: AbortSignal }) => new Promise<never>((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new Error('timeout')))
    }))
    vi.stubGlobal('fetch', upstream)
    const first = request()
    const second = request()
    const firstProbe = handleAiProxy(first.req, first.response as never)
    await vi.advanceTimersByTimeAsync(3_001)
    await firstProbe
    await handleAiProxy(second.req, second.response as never)
    expect(JSON.parse(first.response.body)).toEqual({ available: false, ready: false })
    expect(JSON.parse(second.response.body)).toEqual({ available: false, ready: false })
    expect(upstream).toHaveBeenCalledOnce()
    vi.useRealTimers()
  })

  it('forwards a valid chat request to a mocked upstream and preserves the response contract', async () => {
    process.env.GROQ_API_KEY = 'server-test-secret'
    const upstreamResponse = { choices: [{ message: { content: 'A calm mocked reply.' } }] }
    const upstream = vi.fn().mockResolvedValue(new Response(JSON.stringify(upstreamResponse), { status: 200, headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', upstream)
    const { req, response } = request({ method: 'POST', url: '/api/ai/chat', headers: { origin: 'http://localhost:5173', 'content-type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] }) })
    await handleAiProxy(req, response as never)
    expect(response.status).toBe(200)
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173')
    expect(JSON.parse(response.body)).toEqual(upstreamResponse)
    expect(upstream).toHaveBeenCalledOnce()
    expect(upstream.mock.calls[0][0]).toBe('https://api.groq.com/openai/v1/chat/completions')
    expect(upstream.mock.calls[0][1].headers.authorization).toBe('Bearer server-test-secret')
  })

  it('normalizes provider 429 responses without forwarding provider bodies', async () => {
    process.env.GROQ_API_KEY = 'server-test-secret'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: 'provider secret detail' } }), { status: 429, headers: { 'content-type': 'application/json' } })))
    const { req, response } = request({ method: 'POST', url: '/api/ai/chat', body: JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] }) })
    await handleAiProxy(req, response as never)
    expect(response.status).toBe(429)
    expect(response.body).not.toContain('provider secret detail')
    expect(response.body).toContain('AI service is busy')
  })

  it('normalizes upstream timeouts/network failures', async () => {
    process.env.GROQ_API_KEY = 'server-test-secret'
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')))
    const { req, response } = request({ method: 'POST', url: '/api/ai/chat', body: JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] }) })
    await handleAiProxy(req, response as never)
    expect(response.status).toBe(502)
    expect(response.body).toContain('temporarily unavailable')
    expect(response.body).not.toContain('timeout')
  })

  it('rejects oversized or malformed operation input before upstream calls', async () => {
    process.env.GROQ_API_KEY = 'server-test-secret'
    const upstream = vi.fn()
    vi.stubGlobal('fetch', upstream)
    const chat = request({ method: 'POST', url: '/api/ai/chat', body: JSON.stringify({ messages: [{ role: 'user', content: 'x'.repeat(6001) }] }) })
    await handleAiProxy(chat.req, chat.response as never)
    expect(chat.response.status).toBe(400)
    const stt = request({ method: 'POST', url: '/api/ai/transcribe', headers: { 'content-type': 'application/octet-stream' }, body: 'audio' })
    await handleAiProxy(stt.req, stt.response as never)
    expect(stt.response.status).toBe(415)
    const tts = request({ method: 'POST', url: '/api/ai/tts', body: 'x'.repeat(17 * 1024) })
    await handleAiProxy(tts.req, tts.response as never)
    expect(tts.response.status).toBe(413)
    expect(upstream).not.toHaveBeenCalled()
  })

  it('rejects unlisted origins and rate limits repeated requests', async () => {
    process.env.AI_PROXY_ORIGINS = 'https://allowed.example'
    const denied = request({ headers: { origin: 'https://evil.example' } })
    await handleAiProxy(denied.req, denied.response as never)
    expect(denied.response.status).toBe(403)
    let status = 200
    for (let index = 0; index < 31; index += 1) {
      const next = request({ ip: 'rate-test' })
      await handleAiProxy(next.req, next.response as never)
      status = next.response.status
    }
    expect(status).toBe(429)
  })
})
