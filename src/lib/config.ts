/** Client runtime state only. Provider credentials belong to server/ai-proxy.mjs. */
export const ENV_CONFIG = {
  get isOnline(): boolean {
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      return navigator.onLine
    }
    return true
  },
}
