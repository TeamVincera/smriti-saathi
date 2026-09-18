/**
 * Browser-side AI transport. Credentials never cross this boundary.
 * The relative default works for a web deployment; Capacitor can provide a
 * server origin with `window.__SMRITI_AI_PROXY_URL__` at startup.
 */

declare global {
  interface Window {
    __SMRITI_AI_PROXY_URL__?: string
    __SMRITI_AI_PROXY_URLS__?: string | string[]
  }
}

import { Capacitor } from '@capacitor/core'
import { markAIUnavailable } from './availability'

export interface ProxyMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type SpeechProvider = 'sarvam' | 'azure'

type AIProxyOperation = 'chat' | 'transcribe' | 'tts' | 'status'

let selectedProxyBase: string | null = null

function normalizeProxyBase(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

function appendConfiguredValues(target: string[], value: unknown) {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : []
  for (const candidate of values) {
    const normalized = normalizeProxyBase(candidate)
    if (normalized && !target.includes(normalized)) target.push(normalized)
  }
}

function nativeProxyBase(): string | null {
  if (typeof window === 'undefined') return null
  const isCapacitor = Capacitor.isNativePlatform() || window.location.protocol === 'capacitor:' || window.location.protocol === 'ionic:'
  if (!isCapacitor) return null
  return Capacitor.getPlatform() === 'android'
    ? 'http://10.0.2.2:8787/api/ai'
    : 'http://127.0.0.1:8787/api/ai'
}

/** Configured endpoints are public routing information only; provider credentials stay server-side. */
export function aiProxyBases(): string[] {
  const bases: string[] = []
  if (typeof window !== 'undefined') {
    appendConfiguredValues(bases, window.__SMRITI_AI_PROXY_URLS__)
    appendConfiguredValues(bases, window.__SMRITI_AI_PROXY_URL__)
  }
  appendConfiguredValues(bases, import.meta.env?.VITE_AI_PROXY_URLS)
  appendConfiguredValues(bases, import.meta.env?.VITE_AI_PROXY_URL)

  const nativeBase = nativeProxyBase()
  if (nativeBase) appendConfiguredValues(bases, nativeBase)
  if (bases.length === 0) bases.push('/api/ai')
  return bases
}

export function aiProxyUrlForBase(base: string, operation: AIProxyOperation): string {
  return `${normalizeProxyBase(base)}/${operation}`
}

export function setSelectedAIProxyBase(base: string) {
  selectedProxyBase = normalizeProxyBase(base)
}

export function clearSelectedAIProxyBase(base?: string) {
  if (!base || selectedProxyBase === normalizeProxyBase(base)) selectedProxyBase = null
}

export function resetAIProxySelectionForTests() {
  selectedProxyBase = null
}

function proxyCandidates(): string[] {
  const bases = aiProxyBases()
  if (!selectedProxyBase || !bases.includes(selectedProxyBase)) return bases
  return [selectedProxyBase, ...bases.filter((base) => base !== selectedProxyBase)]
}

function shouldMarkUnavailable(signal: AbortSignal | undefined): boolean {
  return !signal?.aborted
}

export function aiProxyUrl(operation: AIProxyOperation): string {
  const bases = aiProxyBases()
  const base = selectedProxyBase && bases.includes(selectedProxyBase) ? selectedProxyBase : bases[0]
  return aiProxyUrlForBase(base, operation)
}

async function fetchWithProxyFailover(operation: Exclude<AIProxyOperation, 'status'>, init: RequestInit, signal?: AbortSignal): Promise<Response | null> {
  for (const base of proxyCandidates()) {
    try {
      const response = await fetch(aiProxyUrlForBase(base, operation), { ...init, signal })
      if (response.ok) {
        setSelectedAIProxyBase(base)
        return response
      }
      clearSelectedAIProxyBase(base)
    } catch {
      if (signal?.aborted) return null
      clearSelectedAIProxyBase(base)
    }
  }
  clearSelectedAIProxyBase()
  return null
}

export async function requestAiChat(payload: {
  messages: ProxyMessage[]
  model?: string
  temperature?: number
  maxTokens?: number
  responseFormat?: 'json_object'
  signal?: AbortSignal
}): Promise<string | null> {
  const { signal, ...requestPayload } = payload
  try {
    const response = await fetchWithProxyFailover('chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestPayload) }, signal)
    if (!response) {
      if (shouldMarkUnavailable(signal)) markAIUnavailable()
      return null
    }
    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content
    return typeof content === 'string' && content.trim() ? content.trim() : null
  } catch {
    if (shouldMarkUnavailable(signal)) markAIUnavailable()
    return null
  }
}

export async function requestAiTranscription(body: FormData, signal?: AbortSignal): Promise<string | null> {
  try {
    const response = await fetchWithProxyFailover('transcribe', { method: 'POST', body }, signal)
    if (!response) return null
    const data = await response.json()
    return typeof data?.text === 'string' && data.text.trim() ? data.text.trim() : null
  } catch {
    return null
  }
}

export async function requestAiSpeech(payload: { provider: SpeechProvider; text: string; lang: string; voiceProfile?: string }, signal?: AbortSignal): Promise<Blob | null> {
  try {
    const response = await fetchWithProxyFailover('tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }, signal)
    if (!response) return null
    const blob = await response.blob()
    // A successful but empty TTS response is not playable. Treat it as an
    // unavailable voice result so VoiceService can use browser speech without
    // creating an object URL that WebKit reports as a failed blob resource.
    return blob.size > 0 ? blob : null
  } catch {
    return null
  }
}
