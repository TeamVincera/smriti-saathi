/**
 * Secure Environment Configuration
 * Centralizes access to Groq keys without leaking them in logs, UI, or traces.
 */

function getEnvVar(key: string, fallback = ''): string {
  try {
    const metaEnv = typeof import.meta !== 'undefined' && import.meta.env ? (import.meta.env as Record<string, string | undefined>) : {}
    const val = metaEnv[key] || metaEnv[`VITE_${key}`]
    if (val && typeof val === 'string' && val.trim().length > 0) {
      return val.trim()
    }
  } catch {}

  // Fallback check for Node.js test environment if needed
  try {
    if (typeof process !== 'undefined' && process.env) {
      const val = process.env[key] || process.env[`VITE_${key}`]
      if (val && typeof val === 'string' && val.trim().length > 0) {
        return val.trim()
      }
    }
  } catch {}

  return fallback
}

export const ENV_CONFIG = {
  get groqApiKey(): string {
    return getEnvVar('VITE_GROQ_API_KEY') || getEnvVar('GROQ_API_KEY')
  },
  get isGroqConfigured(): boolean {
    const key = this.groqApiKey
    return Boolean(key && key.startsWith('gsk_') && key.length > 20)
  },
  get isOnline(): boolean {
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      return navigator.onLine
    }
    return true
  },
}
