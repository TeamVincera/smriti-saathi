/**
 * VoiceCache
 * Persistent IndexedDB and in-memory cache for synthesized voice audio.
 * Prevents redundant Sarvam API calls, reduces latency, and saves quotas.
 */

const DB_NAME = 'smriti_sathi_voice_cache'
const DB_VERSION = 1
const STORE_NAME = 'audio_cache'

export class VoiceCacheClass {
  private memCache = new Map<string, string>()
  private dbPromise: Promise<IDBDatabase | null> | null = null

  private getDB(): Promise<IDBDatabase | null> {
    if (this.dbPromise) return this.dbPromise
    if (typeof indexedDB === 'undefined') {
      this.dbPromise = Promise.resolve(null)
      return this.dbPromise
    }

    this.dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION)
        req.onupgradeneeded = () => {
          const db = req.result
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'key' })
          }
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => resolve(null)
      } catch {
        resolve(null)
      }
    })

    return this.dbPromise
  }

  public generateKey(language: string, voice: string, text: string, pace = 0.9): string {
    const cleanText = text.trim().toLowerCase().replace(/\s+/g, ' ')
    return `${language}:${voice}:${pace}:${cleanText}`
  }

  public async get(key: string): Promise<string | null> {
    // 1. Check in-memory fast cache
    if (this.memCache.has(key)) {
      return this.memCache.get(key)!
    }

    // 2. Check IndexedDB persistent cache
    try {
      const db = await this.getDB()
      if (!db) return null

      return new Promise<string | null>((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readonly')
          const store = tx.objectStore(STORE_NAME)
          const req = store.get(key)
          req.onsuccess = () => {
            if (req.result && typeof req.result.audio === 'string') {
              this.memCache.set(key, req.result.audio)
              resolve(req.result.audio)
            } else {
              resolve(null)
            }
          }
          req.onerror = () => resolve(null)
        } catch {
          resolve(null)
        }
      })
    } catch {
      return null
    }
  }

  public async set(key: string, audioBase64: string): Promise<void> {
    this.memCache.set(key, audioBase64)

    // Limit memory cache size to 100 recent entries
    if (this.memCache.size > 100) {
      const firstKey = this.memCache.keys().next().value
      if (firstKey) this.memCache.delete(firstKey)
    }

    try {
      const db = await this.getDB()
      if (!db) return

      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite')
          const store = tx.objectStore(STORE_NAME)
          store.put({ key, audio: audioBase64, createdAt: Date.now() })
          tx.oncomplete = () => resolve()
          tx.onerror = () => resolve()
        } catch {
          resolve()
        }
      })
    } catch {}
  }

  public async clear(): Promise<void> {
    this.memCache.clear()
    try {
      const db = await this.getDB()
      if (!db) return
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).clear()
    } catch {}
  }
}

export const VoiceCache = new VoiceCacheClass()
