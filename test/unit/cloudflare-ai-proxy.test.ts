import { afterEach, describe, expect, it, vi } from 'vitest'
import worker, { resetWorkerStateForTests } from '../../cloudflare/ai-proxy-worker.mjs'

const env = (overrides: Record<string, string> = {}) => ({
  AI_PROXY_ORIGINS: 'capacitor://localhost,http://localhost,https://localhost,https://app.example',
  ...overrides,
})

function request(path: string, init: RequestInit = {}) {
  return new Request(`https://worker.example${path}`, init)
}

describe('Cloudflare AI proxy worker', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    resetWorkerStateForTests()
  })

  it('returns the unavailable status shape without a provider secret', async () => {
    const upstream = vi.fn()
    vi.stubGlobal('fetch', upstream)

    const response = await worker.fetch(request('/api/ai/status', { headers: { origin: 'capacitor://localhost' } }), env())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ available: false, ready: false })
    expect(upstream).not.toHaveBeenCalled()
  })

  it('probes Groq for status without exposing the secret in the response', async () => {
    const upstream = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', upstream)

    const response = await worker.fetch(request('/api/ai/status', { headers: { origin: 'capacitor://localhost' } }), env({ GROQ_API_KEY: 'worker-test-secret' }))

    expect(response.status).toBe(200)
    const body = await response.text()
    expect(JSON.parse(body)).toEqual({ available: true, ready: true })
    expect(body).not.toContain('worker-test-secret')
    expect(upstream).toHaveBeenCalledWith('https://api.groq.com/openai/v1/models', expect.objectContaining({ headers: expect.objectContaining({ authorization: 'Bearer worker-test-secret' }) }))
  })

  it('forwards a validated chat request and preserves the Groq response contract', async () => {
    const upstreamResponse = { choices: [{ message: { content: 'A calm mocked reply.' } }] }
    const upstream = vi.fn().mockResolvedValue(new Response(JSON.stringify(upstreamResponse), { status: 200, headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', upstream)

    const response = await worker.fetch(request('/api/ai/chat', {
      method: 'POST',
      headers: { origin: 'https://app.example', 'content-type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] }),
    }), env({ GROQ_API_KEY: 'worker-test-secret' }))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(upstreamResponse)
    expect(response.headers.get('access-control-allow-origin')).toBe('https://app.example')
    expect(upstream).toHaveBeenCalledOnce()
    expect(upstream.mock.calls[0][0]).toBe('https://api.groq.com/openai/v1/chat/completions')
  })

  it('forwards multipart transcription uploads to Groq', async () => {
    const upstream = vi.fn().mockResolvedValue(new Response(JSON.stringify({ text: 'hello' }), { status: 200, headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', upstream)
    const multipart = '--boundary\r\nContent-Disposition: form-data; name="file"; filename="audio.wav"\r\nContent-Type: audio/wav\r\n\r\naudio\r\n--boundary--\r\n'

    const response = await worker.fetch(request('/api/ai/transcribe', {
      method: 'POST',
      headers: { origin: 'capacitor://localhost', 'content-type': 'multipart/form-data; boundary=boundary' },
      body: multipart,
    }), env({ GROQ_API_KEY: 'worker-test-secret' }))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ text: 'hello' })
    expect(upstream).toHaveBeenCalledOnce()
    expect(upstream.mock.calls[0][0]).toBe('https://api.groq.com/openai/v1/audio/transcriptions')
    expect(upstream.mock.calls[0][1].headers['content-type']).toContain('multipart/form-data; boundary=boundary')
  })

  it('forwards Sarvam TTS and decodes its base64 WAV payload', async () => {
    const audio = Uint8Array.from([0, 1, 2, 255])
    const encoded = btoa(String.fromCharCode(...audio))
    const upstream = vi.fn().mockImplementation(() => new Response(JSON.stringify({ audios: [encoded] }), { status: 200 }))
    vi.stubGlobal('fetch', upstream)

    const response = await worker.fetch(request('/api/ai/tts', {
      method: 'POST',
      headers: { origin: 'http://localhost', 'content-type': 'application/json' },
      body: JSON.stringify({ provider: 'sarvam', text: 'नमस्ते', lang: 'hi' }),
    }), env({ SARVAM_API_KEY: 'worker-test-secret', SARVAM_SPEAKER: 'shreya', SARVAM_PACE: '0.85' }))

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('audio/wav')
    expect(Array.from(new Uint8Array(await response.arrayBuffer()))).toEqual([0, 1, 2, 255])
    expect(upstream).toHaveBeenCalledWith('https://api.sarvam.ai/text-to-speech', expect.objectContaining({
      headers: expect.objectContaining({ 'api-subscription-key': 'worker-test-secret' }),
    }))
    const forwarded = JSON.parse(upstream.mock.calls[0][1].body)
    expect(forwarded).toMatchObject({ inputs: ['नमस्ते'], target_language_code: 'hi-IN', speaker: 'shreya', pace: 0.85, model: 'bulbul:v3' })

    const fallbackProfile = await worker.fetch(request('/api/ai/tts', {
      method: 'POST',
      headers: { origin: 'http://localhost', 'content-type': 'application/json' },
      body: JSON.stringify({ provider: 'sarvam', text: 'hello', lang: 'en' }),
    }), env({ SARVAM_API_KEY: 'worker-test-secret', SARVAM_SPEAKER: 'not-allowlisted', SARVAM_PACE: '9' }))
    expect(fallbackProfile.status).toBe(200)
    expect(JSON.parse(upstream.mock.calls[1][1].body)).toMatchObject({ speaker: 'shreya', pace: 0.9 })
  })

  it('rejects unsupported Sarvam languages and disallowed origins', async () => {
    const denied = await worker.fetch(request('/api/ai/status', { headers: { origin: 'https://evil.example' } }), env())
    expect(denied.status).toBe(403)

    const speech = await worker.fetch(request('/api/ai/tts', {
      method: 'POST',
      headers: { origin: 'https://localhost', 'content-type': 'application/json' },
      body: JSON.stringify({ provider: 'sarvam', text: 'hello', lang: 'as' }),
    }), env({ SARVAM_API_KEY: 'worker-test-secret' }))
    expect(speech.status).toBe(400)
    expect(await speech.json()).toEqual({ error: { message: 'Unsupported speech language.' } })

    const fallback = await worker.fetch(request('/api/ai/tts', {
      method: 'POST',
      headers: { origin: 'capacitor://localhost', 'content-type': 'application/json' },
      body: JSON.stringify({ provider: 'sarvam', text: 'hello', lang: 'hi' }),
    }), env())
    expect(fallback.status).toBe(503)
    expect(await fallback.json()).toEqual({ error: { message: 'Speech service is not configured.' } })
  })

  it('does not spend the billable request allowance on frequent status checks', async () => {
    const upstream = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', upstream)

    for (let check = 0; check < 35; check += 1) {
      const response = await worker.fetch(request('/api/ai/status', {
        headers: { origin: 'capacitor://localhost', 'CF-Connecting-IP': '203.0.113.10' },
      }), env({ GROQ_API_KEY: 'worker-test-secret' }))
      expect(response.status).toBe(200)
    }
  })
})
