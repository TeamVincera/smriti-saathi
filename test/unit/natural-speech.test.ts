import { EventEmitter } from 'node:events'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildAzureSsml, handleAiProxy, resolveSarvamProfile } from '../../server/ai-proxy.mjs'
import { getCachedVoice, setCachedVoice, voiceCacheProfile } from '../../src/lib/voice/voiceCache'
import { AzureSpeechService } from '../../src/lib/voice/AzureSpeechService'

function request({ url = '/api/ai/tts', body = '', ip = `speech-${Math.random()}` } = {}) {
  const req = new EventEmitter() as EventEmitter & { method: string; url: string; headers: Record<string, string>; socket: { remoteAddress: string } }
  req.method = 'POST'
  req.url = url
  req.headers = { 'content-type': 'application/json' }
  req.socket = { remoteAddress: ip }
  const response = { status: 0, headers: {}, body: '', writeHead(status: number, headers: Record<string, string>) { this.status = status; this.headers = headers }, end(payload = '') { this.body += payload } }
  queueMicrotask(() => { req.emit('data', Buffer.from(body)); req.emit('end') })
  return { req, response }
}

describe('natural speech profiles', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.SARVAM_API_KEY
    delete process.env.SARVAM_SPEAKER
    delete process.env.SARVAM_PACE
    delete process.env.AZURE_SPEECH_KEY
    delete process.env.AZURE_SPEECH_REGION
  })

  it('builds escaped Azure SSML with calm prosody and sentence/paragraph pauses', () => {
    const ssml = buildAzureSsml('One. Two & <three>.\n\nFour?', 'hi')
    expect(ssml).toContain("name='hi-IN-SwaraNeural'")
    expect(ssml).toContain("rate='-10%'")
    expect(ssml).toContain("pitch='+0.5st'")
    expect(ssml).toContain("volume='-1dB'")
    expect(ssml).toContain('Two &amp; &lt;three&gt;')
    expect(ssml).toContain("<break time='280ms'/>")
    expect(ssml).toContain("<break time='520ms'/>")
  })

  it('rejects unsupported Azure languages instead of falling back to English', async () => {
    expect(buildAzureSsml('hello', 'brx')).toBeNull()
    expect(AzureSpeechService.supportsLang('brx')).toBe(false)
    expect(AzureSpeechService.supportsLang('mni')).toBe(false)
    process.env.AZURE_SPEECH_KEY = 'server-test-secret'
    const upstream = vi.fn()
    vi.stubGlobal('fetch', upstream)
    const { req, response } = request({ body: JSON.stringify({ provider: 'azure', text: 'hello', lang: 'mni' }) })
    await handleAiProxy(req, response as never)
    expect(response.status).toBe(400)
    expect(upstream).not.toHaveBeenCalled()
  })

  it('uses only allowlisted Sarvam profile values with calm defaults', () => {
    expect(resolveSarvamProfile()).toEqual({ model: 'bulbul:v3', speaker: 'shreya', pace: 0.9 })
    process.env.SARVAM_SPEAKER = 'kavya'
    process.env.SARVAM_PACE = '0.75'
    expect(resolveSarvamProfile()).toEqual({ model: 'bulbul:v3', speaker: 'kavya', pace: 0.75 })
    process.env.SARVAM_SPEAKER = 'unsupported-voice'
    process.env.SARVAM_PACE = '4'
    expect(resolveSarvamProfile()).toEqual({ model: 'bulbul:v3', speaker: 'shreya', pace: 0.9 })
  })

  it('forwards server-owned Sarvam profile parameters and never logs patient text', async () => {
    process.env.SARVAM_API_KEY = 'server-test-secret'
    process.env.SARVAM_SPEAKER = 'kavya'
    process.env.SARVAM_PACE = '0.8'
    const patientText = 'private phrase should never be logged'
    const upstream = vi.fn().mockResolvedValue(new Response(JSON.stringify({ audios: ['AA=='] }), { status: 200 }))
    vi.stubGlobal('fetch', upstream)
    const logSpy = vi.spyOn(console, 'log')
    const errorSpy = vi.spyOn(console, 'error')
    const { req, response } = request({ body: JSON.stringify({ provider: 'sarvam', text: patientText, lang: 'hi', voiceProfile: 'sarvam-bulbul-v3-shreya-0.9' }) })
    await handleAiProxy(req, response as never)
    expect(response.status).toBe(200)
    const payload = JSON.parse(upstream.mock.calls[0][1].body)
    expect(payload).toMatchObject({ inputs: [patientText], target_language_code: 'hi-IN', model: 'bulbul:v3', speaker: 'kavya', pace: 0.8 })
    expect(logSpy.mock.calls.flat().join(' ')).not.toContain(patientText)
    expect(errorSpy.mock.calls.flat().join(' ')).not.toContain(patientText)
  })

  it('forwards sentence-aware Azure SSML without logging patient text', async () => {
    process.env.AZURE_SPEECH_KEY = 'server-test-secret'
    process.env.AZURE_SPEECH_REGION = 'eastus'
    const patientText = 'Private sentence. Next sentence.'
    const upstream = vi.fn().mockResolvedValue(new Response('audio-bytes', { status: 200, headers: { 'content-type': 'audio/mpeg' } }))
    vi.stubGlobal('fetch', upstream)
    const logSpy = vi.spyOn(console, 'log')
    const errorSpy = vi.spyOn(console, 'error')
    const { req, response } = request({ body: JSON.stringify({ provider: 'azure', text: patientText, lang: 'en', voiceProfile: 'azure-neural-gentle-v2' }) })
    await handleAiProxy(req, response as never)
    expect(response.status).toBe(200)
    const ssml = upstream.mock.calls[0][1].body
    expect(ssml).toContain("<break time='280ms'/>")
    expect(ssml).toContain("rate='-10%'")
    expect(ssml).toContain("volume='-1dB'")
    expect(logSpy.mock.calls.flat().join(' ')).not.toContain(patientText)
    expect(errorSpy.mock.calls.flat().join(' ')).not.toContain(patientText)
  })

  it('separates cache entries when audible profiles differ', async () => {
    const text = `profile cache ${Date.now()}`
    const first = new Blob(['first'], { type: 'audio/wav' })
    const second = new Blob(['second'], { type: 'audio/wav' })
    await setCachedVoice(text, 'en', first, 'sarvam-bulbul-v3-shreya-0.9')
    expect(await getCachedVoice(text, 'en', 'sarvam-bulbul-v3-shreya-0.9')).toBe(first)
    expect(await getCachedVoice(text, 'en', 'azure-neural-gentle-v2')).toBeNull()
    expect(voiceCacheProfile('as')).toBe('azure-neural-gentle-v2')
    await setCachedVoice(text, 'en', second, 'azure-neural-gentle-v2')
    expect(await getCachedVoice(text, 'en', 'azure-neural-gentle-v2')).toBe(second)
  })
})
