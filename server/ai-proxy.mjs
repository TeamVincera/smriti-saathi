import http from 'node:http'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { existsSync, readFileSync } from 'node:fs'

if (!process.env.GROQ_API_KEY && existsSync('.env')) {
  if (typeof process.loadEnvFile === 'function') {
    try { process.loadEnvFile('.env') } catch {}
  } else {
    try {
      const parsed = readFileSync('.env', 'utf8')
      for (const rawLine of parsed.split(/\r?\n/)) {
        const line = rawLine.trim()
        if (!line || line.startsWith('#')) continue
        const separator = line.indexOf('=')
        if (separator <= 0) continue
        const name = line.slice(0, separator).trim()
        if (!process.env[name]) {
          process.env[name] = line.slice(separator + 1).trim().replace(/^("|')|("|')$/g, '')
        }
      }
    } catch {}
  }
}

const PORT = Number(process.env.PORT || 8787)
const HOST = process.env.HOST || '0.0.0.0'
const MAX_CHAT_BYTES = 96 * 1024
const MAX_STT_BYTES = 8 * 1024 * 1024
const MAX_TTS_BYTES = 16 * 1024
const UPSTREAM_TIMEOUT_MS = 15_000
const STATUS_PROBE_TIMEOUT_MS = 3_000
const STATUS_SUCCESS_TTL_MS = 4_000
const STATUS_FAILURE_TTL_MS = 3_000
const RATE_WINDOW_MS = 60_000
const RATE_LIMIT = 30
const CHAT_MODELS = new Set(['groq/compound-mini', 'groq/compound', 'qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'])
const CHAT_ROLES = new Set(['system', 'user', 'assistant'])
const SARVAM_SPEAKERS = new Set(['aditya', 'ritu', 'priya', 'neha', 'rahul', 'pooja', 'rohan', 'simran', 'kavya', 'amit', 'dev', 'ishita', 'shreya', 'ratan', 'varun', 'manan', 'sumit', 'roopa', 'kabir', 'aayan', 'shubh', 'ashutosh', 'advait', 'anand', 'tanya', 'tarun', 'sunny', 'mani', 'gokul', 'vijay', 'shruti', 'suhani', 'mohit', 'kavitha', 'rehan', 'soham', 'rupali'])
const DEFAULT_SARVAM_SPEAKER = 'shreya'
const DEFAULT_SARVAM_PACE = 0.9
const rateBuckets = new Map()
let groqReadinessCache = null
let groqReadinessProbe = null

function allowedOrigins() {
  return new Set((process.env.AI_PROXY_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,capacitor://localhost,http://localhost,https://localhost').split(',').map((origin) => origin.trim()).filter(Boolean))
}

function clientIp(req) {
  const forwarded = process.env.TRUST_PROXY === '1' ? req.headers['x-forwarded-for'] : null
  return String(forwarded || req.socket?.remoteAddress || 'unknown').split(',')[0].trim()
}

function corsHeaders(req) {
  const origin = req.headers.origin
  if (!origin) return {}
  if (!allowedOrigins().has(origin)) return null
  return { 'access-control-allow-origin': origin, vary: 'Origin', 'access-control-allow-credentials': 'false' }
}

function securityHeaders(req, extra = {}) {
  return { ...corsHeaders(req), 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', ...extra }
}

function sendJson(req, res, status, payload, extra = {}) {
  const body = JSON.stringify(payload)
  res.writeHead(status, { ...securityHeaders(req), 'content-type': 'application/json; charset=utf-8', ...extra })
  res.end(body)
}

function rejectOrigin(req, res) {
  if (corsHeaders(req) !== null) return false
  sendJson(req, res, 403, { error: { message: 'Origin not allowed.' } })
  return true
}

function rateLimited(req) {
  const now = Date.now()
  const key = clientIp(req)
  const current = rateBuckets.get(key)
  if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
    if (rateBuckets.size > 10_000) {
      for (const [staleKey, bucket] of rateBuckets) if (now - bucket.startedAt >= RATE_WINDOW_MS) rateBuckets.delete(staleKey)
    }
    rateBuckets.set(key, { startedAt: now, count: 1 })
    return false
  }
  current.count += 1
  return current.count > RATE_LIMIT
}

function readBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > maxBytes) {
        reject(Object.assign(new Error('request too large'), { code: 'BODY_TOO_LARGE' }))
        if (typeof req.destroy === 'function') req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function jsonBody(buffer) {
  try { return JSON.parse(buffer.toString('utf8')) } catch { return null }
}

function requireKey(name) {
  const value = process.env[name]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function resolveSarvamProfile() {
  const configuredSpeaker = String(process.env.SARVAM_SPEAKER || '').trim().toLowerCase()
  const speaker = SARVAM_SPEAKERS.has(configuredSpeaker) ? configuredSpeaker : DEFAULT_SARVAM_SPEAKER
  const configuredPace = Number(process.env.SARVAM_PACE)
  const pace = Number.isFinite(configuredPace) && configuredPace >= 0.5 && configuredPace <= 2 ? Number(configuredPace.toFixed(2)) : DEFAULT_SARVAM_PACE
  return { model: 'bulbul:v3', speaker, pace }
}

const AZURE_VOICES = { as: ['as-IN', 'as-IN-YashmitaNeural'], bn: ['bn-IN', 'bn-IN-TanishaaNeural'], hi: ['hi-IN', 'hi-IN-SwaraNeural'], en: ['en-IN', 'en-IN-NeerjaNeural'] }
const AZURE_PROSODY = {
  as: { rate: '-12%', pitch: '+1st', volume: '-1dB' },
  bn: { rate: '-10%', pitch: '+0.5st', volume: '-1dB' },
  hi: { rate: '-10%', pitch: '+0.5st', volume: '-1dB' },
  en: { rate: '-10%', pitch: '0st', volume: '-1dB' },
}

function escapeXml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function sentenceAwareAzureMarkup(text) {
  const paragraphs = text.replace(/\r\n?/g, '\n').trim().split(/\n{2,}/).filter(Boolean)
  return paragraphs.map((paragraph) => {
    const sentences = paragraph.trim().split(/(?<=[.!?।॥])\s+/u).filter(Boolean)
    return sentences.map((sentence, index) => `${escapeXml(sentence)}${index < sentences.length - 1 ? "<break time='280ms'/>" : ''}`).join(' ')
  }).join("<break time='520ms'/>")
}

export function buildAzureSsml(text, lang) {
  const language = lang.toLowerCase()
  if (!AZURE_VOICES[language]) return null
  const [xmlLang, voice] = AZURE_VOICES[language]
  const prosody = AZURE_PROSODY[language]
  return `<speak version='1.0' xml:lang='${xmlLang}'>\n  <voice xml:lang='${xmlLang}' name='${voice}'>\n    <prosody rate='${prosody.rate}' pitch='${prosody.pitch}' volume='${prosody.volume}'>${sentenceAwareAzureMarkup(text)}</prosody>\n  </voice>\n</speak>`
}

export function resetGroqReadinessCache() {
  groqReadinessCache = null
  groqReadinessProbe = null
}

async function probeGroqReadiness(key) {
  const now = Date.now()
  if (groqReadinessCache && now - groqReadinessCache.checkedAt < groqReadinessCache.ttl) return groqReadinessCache.ready
  if (groqReadinessProbe) return groqReadinessProbe

  groqReadinessProbe = (async () => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), STATUS_PROBE_TIMEOUT_MS)
    let ready = false
    try {
      const response = await fetch('https://api.groq.com/openai/v1/models', { method: 'GET', headers: { authorization: `Bearer ${key}`, accept: 'application/json' }, signal: controller.signal, redirect: 'error' })
      ready = response.status >= 200 && response.status < 300
    } catch {
      ready = false
    } finally {
      clearTimeout(timeout)
      groqReadinessCache = { ready, checkedAt: Date.now(), ttl: ready ? STATUS_SUCCESS_TTL_MS : STATUS_FAILURE_TTL_MS }
      groqReadinessProbe = null
    }
    return ready
  })()
  return groqReadinessProbe
}

async function groqIsReady() {
  const key = requireKey('GROQ_API_KEY')
  if (!key) {
    groqReadinessCache = null
    return false
  }
  return probeGroqReadiness(key)
}

function validateChat(input) {
  if (!input || !Array.isArray(input.messages) || input.messages.length < 1 || input.messages.length > 8) return false
  return input.messages.every((message) => message && CHAT_ROLES.has(message.role) && typeof message.content === 'string' && message.content.length > 0 && message.content.length <= 6000)
}

async function forward(url, init) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, redirect: 'error' })
    return { status: response.status, headers: response.headers, body: Buffer.from(await response.arrayBuffer()) }
  } finally {
    clearTimeout(timeout)
  }
}

function upstreamFailure(req, res, status = 502) {
  const normalized = status === 429 ? 'AI service is busy. Please try again shortly.' : 'AI service is temporarily unavailable.'
  return sendJson(req, res, status, { error: { message: normalized } })
}

async function handleChat(req, res, body) {
  const key = requireKey('GROQ_API_KEY')
  if (!key) return sendJson(req, res, 503, { error: { message: 'AI service is not configured.' } })
  const input = jsonBody(body)
  if (!validateChat(input)) return sendJson(req, res, 400, { error: { message: 'Invalid chat request.' } })
  const model = CHAT_MODELS.has(input.model) ? input.model : 'groq/compound-mini'
  let upstream
  try {
    upstream = await forward('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: JSON.stringify({ model, messages: input.messages, temperature: typeof input.temperature === 'number' ? Math.max(0, Math.min(input.temperature, 1)) : 0.5, max_tokens: typeof input.maxTokens === 'number' ? Math.min(Math.max(input.maxTokens, 1), 700) : 300, ...(input.responseFormat === 'json_object' ? { response_format: { type: 'json_object' } } : {}) }) })
  } catch { return upstreamFailure(req, res) }
  if (upstream.status < 200 || upstream.status >= 300) return upstreamFailure(req, res, upstream.status === 429 ? 429 : 502)
  res.writeHead(200, securityHeaders(req, { 'content-type': 'application/json' }))
  res.end(upstream.body)
}

async function handleTranscribe(req, res, body) {
  const key = requireKey('GROQ_API_KEY')
  if (!key) return sendJson(req, res, 503, { error: { message: 'Voice service is not configured.' } })
  const contentType = String(req.headers['content-type'] || '')
  if (!contentType.toLowerCase().startsWith('multipart/form-data;') || !contentType.toLowerCase().includes('boundary=')) return sendJson(req, res, 415, { error: { message: 'Audio upload must be multipart form data.' } })
  let upstream
  try {
    upstream = await forward('https://api.groq.com/openai/v1/audio/transcriptions', { method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': contentType }, body })
  } catch { return upstreamFailure(req, res) }
  if (upstream.status < 200 || upstream.status >= 300) return upstreamFailure(req, res, upstream.status === 429 ? 429 : 502)
  res.writeHead(200, securityHeaders(req, { 'content-type': 'application/json' }))
  res.end(upstream.body)
}

async function handleTts(req, res, body) {
  const input = jsonBody(body)
  if (!input || !['sarvam', 'azure'].includes(input.provider) || typeof input.text !== 'string' || input.text.length < 1 || input.text.length > 2000 || typeof input.lang !== 'string' || input.lang.length > 8 || (input.voiceProfile !== undefined && (typeof input.voiceProfile !== 'string' || input.voiceProfile.length < 1 || input.voiceProfile.length > 80 || !/^[a-z0-9._:-]+$/i.test(input.voiceProfile)))) return sendJson(req, res, 400, { error: { message: 'Invalid speech request.' } })
  if (input.provider === 'azure' && !AZURE_VOICES[input.lang.toLowerCase()]) return sendJson(req, res, 400, { error: { message: 'Unsupported speech language.' } })
  let upstream
  try {
    if (input.provider === 'sarvam') {
      const key = requireKey('SARVAM_API_KEY')
      if (!key) return sendJson(req, res, 503, { error: { message: 'Speech service is not configured.' } })
      const lang = ({ hi: 'hi-IN', bn: 'bn-IN', en: 'en-IN' })[input.lang.toLowerCase()]
      if (!lang) return sendJson(req, res, 400, { error: { message: 'Unsupported speech language.' } })
      const profile = resolveSarvamProfile()
      upstream = await forward('https://api.sarvam.ai/text-to-speech', { method: 'POST', headers: { 'api-subscription-key': key, 'content-type': 'application/json' }, body: JSON.stringify({ inputs: [input.text], target_language_code: lang, speaker: profile.speaker, pace: profile.pace, model: profile.model }) })
      if (upstream.status >= 200 && upstream.status < 300) {
        let parsed
        try { parsed = JSON.parse(upstream.body.toString('utf8')) } catch { return upstreamFailure(req, res) }
        const encoded = parsed?.audios?.[0]
        if (!encoded) return upstreamFailure(req, res)
        res.writeHead(200, securityHeaders(req, { 'content-type': 'audio/wav' }))
        res.end(Buffer.from(encoded, 'base64'))
        return
      }
    } else {
      const key = requireKey('AZURE_SPEECH_KEY')
      if (!key) return sendJson(req, res, 503, { error: { message: 'Speech service is not configured.' } })
      const region = process.env.AZURE_SPEECH_REGION || 'eastus'
      upstream = await forward(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, { method: 'POST', headers: { 'ocp-apim-subscription-key': key, 'content-type': 'application/ssml+xml', 'x-microsoft-outputformat': 'audio-16khz-32kbitrate-mono-mp3' }, body: buildAzureSsml(input.text, input.lang) })
      if (upstream.status >= 200 && upstream.status < 300) { res.writeHead(200, securityHeaders(req, { 'content-type': 'audio/mpeg' })); res.end(upstream.body); return }
    }
  } catch { return upstreamFailure(req, res) }
  return upstreamFailure(req, res, upstream?.status === 429 ? 429 : 502)
}

export async function handleAiProxy(req, res) {
  if (rejectOrigin(req, res)) return
  if (req.method === 'OPTIONS') { res.writeHead(204, securityHeaders(req, { 'access-control-allow-methods': 'POST,GET,OPTIONS', 'access-control-allow-headers': 'content-type' })); return res.end() }
  if (rateLimited(req)) return sendJson(req, res, 429, { error: { message: 'Too many requests. Please try again shortly.' } }, { 'retry-after': '60' })
  const pathname = new URL(req.url || '/', 'http://localhost').pathname
  if (req.method === 'GET' && pathname === '/api/ai/status') {
    const ready = await groqIsReady()
    return sendJson(req, res, 200, { available: ready, ready })
  }
  if (req.method !== 'POST' || !['/api/ai/chat', '/api/ai/transcribe', '/api/ai/tts'].includes(pathname)) return sendJson(req, res, 404, { error: { message: 'Not found.' } })
  const maxBytes = pathname.endsWith('/chat') ? MAX_CHAT_BYTES : pathname.endsWith('/transcribe') ? MAX_STT_BYTES : MAX_TTS_BYTES
  try {
    const body = await readBody(req, maxBytes)
    if (pathname.endsWith('/chat')) return await handleChat(req, res, body)
    if (pathname.endsWith('/transcribe')) return await handleTranscribe(req, res, body)
    return await handleTts(req, res, body)
  } catch (error) {
    if (error?.code === 'BODY_TOO_LARGE') return sendJson(req, res, 413, { error: { message: 'Request body is too large.' } })
    console.error('[ai-proxy] request failed', error instanceof Error ? error.message : error)
    return upstreamFailure(req, res)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  http.createServer((req, res) => handleAiProxy(req, res)).listen(PORT, HOST, () => console.log(`AI proxy listening on http://${HOST}:${PORT}/api/ai`))
}
