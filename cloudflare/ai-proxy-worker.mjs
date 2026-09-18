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
const AZURE_LANGUAGES = new Set(['as', 'bn', 'hi', 'en'])

const rateBuckets = new Map()
let groqReadinessCache = null
let groqReadinessProbe = null

export function resetWorkerStateForTests() {
  rateBuckets.clear()
  groqReadinessCache = null
  groqReadinessProbe = null
}

function allowedOrigins(env) {
  return new Set(String(env.AI_PROXY_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,capacitor://localhost,http://localhost,https://localhost')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean))
}

function corsHeaders(request, env) {
  const origin = request.headers.get('origin')
  if (!origin) return {}
  if (!allowedOrigins(env).has(origin)) return null
  return { 'access-control-allow-origin': origin, vary: 'Origin', 'access-control-allow-credentials': 'false' }
}

function securityHeaders(request, env, extra = {}) {
  return {
    ...corsHeaders(request, env),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    ...extra,
  }
}

function jsonResponse(request, env, status, payload, extra = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: securityHeaders(request, env, { 'content-type': 'application/json; charset=utf-8', ...extra }),
  })
}

function rejectOrigin(request, env) {
  return corsHeaders(request, env) === null
}

function clientIp(request) {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

function rateLimited(request) {
  const now = Date.now()
  const key = clientIp(request)
  const current = rateBuckets.get(key)
  if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
    if (rateBuckets.size > 10_000) {
      for (const [staleKey, bucket] of rateBuckets) {
        if (now - bucket.startedAt >= RATE_WINDOW_MS) rateBuckets.delete(staleKey)
      }
    }
    rateBuckets.set(key, { startedAt: now, count: 1 })
    return false
  }
  current.count += 1
  return current.count > RATE_LIMIT
}

function requireKey(env, name) {
  const value = env[name]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function validateChat(input) {
  if (!input || !Array.isArray(input.messages) || input.messages.length < 1 || input.messages.length > 8) return false
  return input.messages.every((message) => message && CHAT_ROLES.has(message.role) && typeof message.content === 'string' && message.content.length > 0 && message.content.length <= 6000)
}

async function readBody(request, maxBytes) {
  const body = await request.arrayBuffer()
  if (body.byteLength > maxBytes) {
    const error = new Error('request too large')
    error.code = 'BODY_TOO_LARGE'
    throw error
  }
  return body
}

function jsonBody(body) {
  try {
    return JSON.parse(new TextDecoder().decode(body))
  } catch {
    return null
  }
}

function resolveSarvamProfile(env) {
  const configuredSpeaker = String(env.SARVAM_SPEAKER || '').trim().toLowerCase()
  const speaker = SARVAM_SPEAKERS.has(configuredSpeaker) ? configuredSpeaker : DEFAULT_SARVAM_SPEAKER
  const configuredPace = Number(env.SARVAM_PACE)
  const pace = Number.isFinite(configuredPace) && configuredPace >= 0.5 && configuredPace <= 2 ? Number(configuredPace.toFixed(2)) : DEFAULT_SARVAM_PACE
  return { model: 'bulbul:v3', speaker, pace }
}

function decodeBase64(value) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

async function forward(url, init) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect: 'manual' })
  } finally {
    clearTimeout(timeout)
  }
}

function upstreamFailure(request, env, status = 502) {
  const message = status === 429 ? 'AI service is busy. Please try again shortly.' : 'AI service is temporarily unavailable.'
  return jsonResponse(request, env, status, { error: { message } })
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
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        method: 'GET',
        headers: { authorization: `Bearer ${key}`, accept: 'application/json' },
        signal: controller.signal,
        // Keep redirects manual so Authorization can never be forwarded to a
        // different hostname if an upstream responds with a redirect.
        redirect: 'manual',
      })
      ready = response.status >= 200 && response.status < 300
      if (!ready) console.error(`[ai-proxy-worker] Groq readiness returned ${response.status}`)
    } catch (error) {
      console.error(`[ai-proxy-worker] Groq readiness failed: ${error instanceof Error ? `${error.name}: ${error.message}` : 'unknown error'}`)
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

async function groqIsReady(env) {
  const key = requireKey(env, 'GROQ_API_KEY')
  if (!key) {
    groqReadinessCache = null
    return false
  }
  return probeGroqReadiness(key)
}

async function handleChat(request, env, body) {
  const key = requireKey(env, 'GROQ_API_KEY')
  if (!key) return jsonResponse(request, env, 503, { error: { message: 'AI service is not configured.' } })
  const input = jsonBody(body)
  if (!validateChat(input)) return jsonResponse(request, env, 400, { error: { message: 'Invalid chat request.' } })
  const model = CHAT_MODELS.has(input.model) ? input.model : 'groq/compound-mini'
  let upstream
  try {
    upstream = await forward('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: input.messages,
        temperature: typeof input.temperature === 'number' ? Math.max(0, Math.min(input.temperature, 1)) : 0.5,
        max_tokens: typeof input.maxTokens === 'number' ? Math.min(Math.max(input.maxTokens, 1), 700) : 300,
        ...(input.responseFormat === 'json_object' ? { response_format: { type: 'json_object' } } : {}),
      }),
    })
  } catch {
    return upstreamFailure(request, env)
  }
  if (!upstream.ok) {
    console.error(`[ai-proxy-worker] Groq chat returned ${upstream.status}`)
    return upstreamFailure(request, env, upstream.status === 429 ? 429 : 502)
  }
  return new Response(upstream.body, { status: 200, headers: securityHeaders(request, env, { 'content-type': 'application/json' }) })
}

async function handleTranscribe(request, env, body) {
  const key = requireKey(env, 'GROQ_API_KEY')
  if (!key) return jsonResponse(request, env, 503, { error: { message: 'Voice service is not configured.' } })
  const contentType = request.headers.get('content-type') || ''
  if (!contentType.toLowerCase().startsWith('multipart/form-data;') || !contentType.toLowerCase().includes('boundary=')) {
    return jsonResponse(request, env, 415, { error: { message: 'Audio upload must be multipart form data.' } })
  }
  let upstream
  try {
    upstream = await forward('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': contentType },
      body,
    })
  } catch {
    return upstreamFailure(request, env)
  }
  if (!upstream.ok) return upstreamFailure(request, env, upstream.status === 429 ? 429 : 502)
  return new Response(upstream.body, { status: 200, headers: securityHeaders(request, env, { 'content-type': 'application/json' }) })
}

async function handleTts(request, env, body) {
  const input = jsonBody(body)
  const validVoiceProfile = input?.voiceProfile === undefined || (typeof input.voiceProfile === 'string' && input.voiceProfile.length >= 1 && input.voiceProfile.length <= 80 && /^[a-z0-9._:-]+$/i.test(input.voiceProfile))
  if (!input || !['sarvam', 'azure'].includes(input.provider) || typeof input.text !== 'string' || input.text.length < 1 || input.text.length > 2000 || typeof input.lang !== 'string' || input.lang.length > 8 || !validVoiceProfile) {
    return jsonResponse(request, env, 400, { error: { message: 'Invalid speech request.' } })
  }
  if (input.provider === 'azure' && !AZURE_LANGUAGES.has(input.lang.toLowerCase())) {
    return jsonResponse(request, env, 400, { error: { message: 'Unsupported speech language.' } })
  }
  if (input.provider === 'azure') {
    // Azure remains available through the original proxy; this Worker keeps the
    // documented on-device/browser fallback when no Azure binding is configured.
    return jsonResponse(request, env, 503, { error: { message: 'Speech service is not configured on this worker.' } })
  }

  const key = requireKey(env, 'SARVAM_API_KEY')
  if (!key) return jsonResponse(request, env, 503, { error: { message: 'Speech service is not configured.' } })
  const targetLanguage = ({ hi: 'hi-IN', bn: 'bn-IN', en: 'en-IN' })[input.lang.toLowerCase()]
  if (!targetLanguage) return jsonResponse(request, env, 400, { error: { message: 'Unsupported speech language.' } })

  const profile = resolveSarvamProfile(env)
  let upstream
  try {
    upstream = await forward('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: { 'api-subscription-key': key, 'content-type': 'application/json' },
      body: JSON.stringify({ inputs: [input.text], target_language_code: targetLanguage, speaker: profile.speaker, pace: profile.pace, model: profile.model }),
    })
  } catch {
    return upstreamFailure(request, env)
  }
  if (!upstream.ok) return upstreamFailure(request, env, upstream.status === 429 ? 429 : 502)

  try {
    const encodedAudio = (await upstream.json())?.audios?.[0]
    if (typeof encodedAudio !== 'string' || !encodedAudio) return upstreamFailure(request, env)
    return new Response(decodeBase64(encodedAudio), { status: 200, headers: securityHeaders(request, env, { 'content-type': 'audio/wav' }) })
  } catch {
    return upstreamFailure(request, env)
  }
}

export default {
  async fetch(request, env) {
    if (rejectOrigin(request, env)) return jsonResponse(request, env, 403, { error: { message: 'Origin not allowed.' } })
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: securityHeaders(request, env, { 'access-control-allow-methods': 'POST,GET,OPTIONS', 'access-control-allow-headers': 'content-type' }),
      })
    }
    const pathname = new URL(request.url).pathname
    if (request.method === 'GET' && pathname === '/api/ai/status') {
      const ready = await groqIsReady(env)
      return jsonResponse(request, env, 200, { available: ready, ready })
    }
    if (request.method !== 'POST' || !['/api/ai/chat', '/api/ai/transcribe', '/api/ai/tts'].includes(pathname)) {
      return jsonResponse(request, env, 404, { error: { message: 'Not found.' } })
    }
    // Availability is checked every few seconds by the native app, so health
    // probes must not consume the user's request allowance. Rate-limit only
    // AI operations that call a billable provider endpoint.
    if (rateLimited(request)) return jsonResponse(request, env, 429, { error: { message: 'Too many requests. Please try again shortly.' } }, { 'retry-after': '60' })

    try {
      if (pathname === '/api/ai/tts') {
        const body = await readBody(request, MAX_TTS_BYTES)
        return await handleTts(request, env, body)
      }
      const maxBytes = pathname === '/api/ai/chat' ? MAX_CHAT_BYTES : MAX_STT_BYTES
      const body = await readBody(request, maxBytes)
      if (pathname === '/api/ai/chat') return await handleChat(request, env, body)
      return await handleTranscribe(request, env, body)
    } catch (error) {
      if (error?.code === 'BODY_TOO_LARGE') return jsonResponse(request, env, 413, { error: { message: 'Request body is too large.' } })
      return upstreamFailure(request, env)
    }
  },
}
