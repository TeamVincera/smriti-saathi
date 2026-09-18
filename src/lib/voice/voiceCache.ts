/**
 * Voice Audio Cache
 * Persists synthesized human voice Blobs in the browser CacheStorage or Memory.
 * Enables 0ms offline audio playback for previously synthesized or common phrases.
 */

const CACHE_NAME = 'smriti-sathi-voice-v1'
const memoryCache = new Map<string, Blob>()
const DEFAULT_PROFILE_BY_LANG: Record<string, string> = {
  as: 'azure-neural-gentle-v2',
  bn: 'sarvam-bulbul-v3-shreya-0.9',
  en: 'sarvam-bulbul-v3-shreya-0.9',
  hi: 'sarvam-bulbul-v3-shreya-0.9',
}

export function voiceCacheProfile(lang: string, profile?: string): string {
  return profile?.trim() || DEFAULT_PROFILE_BY_LANG[lang.toLowerCase()] || 'neural-gentle-v2'
}

function hashKey(text: string, lang: string, profile?: string): string {
  let h = 0
  const combined = `${voiceCacheProfile(lang, profile)}:${lang.toLowerCase()}:${text.trim().toLowerCase()}`
  for (let i = 0; i < combined.length; i++) {
    h = (Math.imul(31, h) + combined.charCodeAt(i)) | 0
  }
  return `voice_${Math.abs(h)}_${lang}`
}

export function getCachedVoiceSync(text: string, lang: string, profile?: string): Blob | null {
  const key = hashKey(text, lang, profile)
  return memoryCache.get(key) || null
}

export async function getCachedVoice(text: string, lang: string, profile?: string): Promise<Blob | null> {
  const key = hashKey(text, lang, profile)

  // 1. Check in-memory cache
  if (memoryCache.has(key)) {
    return memoryCache.get(key) || null
  }

  // 2. Check browser CacheStorage
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cache = await caches.open(CACHE_NAME)
      const fakeUrl = `https://smriti.local/voice/${key}.mp3`
      const res = await cache.match(fakeUrl)
      if (res) {
        const blob = await res.blob()
        memoryCache.set(key, blob)
        return blob
      }
    } catch {
      // Ignore cache storage errors (e.g. private browsing limits)
    }
  }

  return null
}

export async function setCachedVoice(text: string, lang: string, blob: Blob, profile?: string): Promise<void> {
  const key = hashKey(text, lang, profile)
  memoryCache.set(key, blob)

  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cache = await caches.open(CACHE_NAME)
      const fakeUrl = `https://smriti.local/voice/${key}.mp3`
      const res = new Response(blob, {
        headers: {
          'Content-Type': blob.type || 'audio/mpeg',
          'Content-Length': String(blob.size),
        },
      })
      await cache.put(fakeUrl, res)
    } catch {
      // Ignore write failures gracefully
    }
  }
}
