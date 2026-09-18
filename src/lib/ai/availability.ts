import { useSyncExternalStore } from 'react'
import { Capacitor, type PluginListenerHandle } from '@capacitor/core'
import { Network } from '@capacitor/network'
import { aiProxyBases, aiProxyUrlForBase, clearSelectedAIProxyBase, resetAIProxySelectionForTests, setSelectedAIProxyBase } from './proxyClient'

export type AIAvailability = 'unknown' | 'offline' | 'online'

let state: AIAvailability = 'unknown'
let started = false
let checking: Promise<boolean> | null = null
let retryTimer: ReturnType<typeof setTimeout> | null = null
let probeGeneration = 0
const listeners = new Set<() => void>()
let onlineHandler: (() => void) | null = null
let offlineHandler: (() => void) | null = null
let visibilityHandler: (() => void) | null = null
let focusHandler: (() => void) | null = null
let heartbeatTimer: ReturnType<typeof setInterval> | null = null
let nativeNetworkListener: PluginListenerHandle | null = null
let nativeNetworkSetupGeneration = 0
let nativeConnected: boolean | null = null

// Keep cloud availability responsive when a physical device moves between
// networks, without creating a request on every render or user interaction.
export const AI_AVAILABILITY_POLL_INTERVAL_MS = 2_500

function notify() {
  listeners.forEach((listener) => listener())
}

function setState(next: AIAvailability) {
  if (state === next) return
  state = next
  notify()
}

function scheduleRetry() {
  // The heartbeat is the retry loop once availability monitoring has
  // started. A second timer here would race it at the same cadence and can
  // issue duplicate probes when the backend recovers.
  if (retryTimer || heartbeatTimer || typeof window === 'undefined') return
  retryTimer = setTimeout(() => {
    retryTimer = null
    void checkAIAvailability()
  }, AI_AVAILABILITY_POLL_INTERVAL_MS)
}

export function markAIUnavailable() {
  probeGeneration += 1
  setState('offline')
  scheduleRetry()
}

export async function checkAIAvailability(): Promise<boolean> {
  if (nativeConnected === false) {
    setState('offline')
    return false
  }
  if (checking) return checking
  const generation = ++probeGeneration
  const probe = (async () => {
    for (const base of aiProxyBases()) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 4000)
      try {
        const response = await fetch(aiProxyUrlForBase(base, 'status'), { cache: 'no-store', signal: controller.signal })
        const payload = response.ok ? await response.json().catch(() => null) : null
        const available = response.ok && payload?.available === true && payload?.ready === true
        if (generation !== probeGeneration) return available && isAIAvailable()
        if (available) {
          setSelectedAIProxyBase(base)
          setState('online')
          return true
        }
        clearSelectedAIProxyBase(base)
      } catch {
        if (generation !== probeGeneration) return false
        clearSelectedAIProxyBase(base)
      } finally {
        clearTimeout(timeout)
      }
    }
    if (generation === probeGeneration) {
      clearSelectedAIProxyBase()
      markAIUnavailable()
    }
    return false
  })()
  checking = probe.finally(() => {
    checking = null
  })
  return checking
}

export function startAIAvailability() {
  if (started || typeof window === 'undefined') return
  started = true
  onlineHandler = () => {
    if (checking) {
      void checking.finally(() => { if (navigator.onLine) void checkAIAvailability() })
    } else {
      void checkAIAvailability()
    }
  }
  offlineHandler = markAIUnavailable
  visibilityHandler = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      void checkAIAvailability()
    }
  }
  focusHandler = () => {
    void checkAIAvailability()
  }
  window.addEventListener('online', onlineHandler)
  window.addEventListener('offline', offlineHandler)
  document.addEventListener('visibilitychange', visibilityHandler)
  window.addEventListener('focus', focusHandler)
  heartbeatTimer = setInterval(() => {
    void checkAIAvailability()
  }, AI_AVAILABILITY_POLL_INTERVAL_MS)
  void startNativeNetworkMonitoring()
}

export function subscribeAIAvailability(listener: () => void) {
  startAIAvailability()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getAIAvailabilitySnapshot(): AIAvailability {
  startAIAvailability()
  return state
}

export function isAIAvailable(): boolean {
  return state === 'online'
}

async function startNativeNetworkMonitoring() {
  if (!Capacitor.isNativePlatform() || typeof window === 'undefined') {
    void checkAIAvailability()
    return
  }

  const setupGeneration = ++nativeNetworkSetupGeneration
  try {
    const listener = await Network.addListener('networkStatusChange', ({ connected }) => {
      if (!connected) {
        nativeConnected = false
        markAIUnavailable()
      } else {
        nativeConnected = true
        if (checking) {
          void checking.finally(() => { if (started) void checkAIAvailability() })
        } else {
          void checkAIAvailability()
        }
      }
    })
    if (!started || setupGeneration !== nativeNetworkSetupGeneration) {
      await listener.remove()
      return
    }
    nativeNetworkListener = listener

    const status = await Network.getStatus()
    if (!started || setupGeneration !== nativeNetworkSetupGeneration) return
    nativeConnected = status.connected
    if (!status.connected) {
      markAIUnavailable()
      return
    }

    // A native disconnect gates all probes; when connected, backend health
    // remains authoritative before cloud AI is enabled.
    void checkAIAvailability()
  } catch {
    if (started && setupGeneration === nativeNetworkSetupGeneration) {
      nativeConnected = null
      void checkAIAvailability()
    }
  }
}

export function useAIAvailable(): boolean {
  return useSyncExternalStore(subscribeAIAvailability, isAIAvailable, () => false)
}

export function resetAIAvailabilityForTests() {
  if (retryTimer) clearTimeout(retryTimer)
  if (heartbeatTimer) clearInterval(heartbeatTimer)
  if (typeof window !== 'undefined') {
    if (onlineHandler) window.removeEventListener('online', onlineHandler)
    if (offlineHandler) window.removeEventListener('offline', offlineHandler)
    if (focusHandler) window.removeEventListener('focus', focusHandler)
  }
  if (typeof document !== 'undefined' && visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler)
  }
  nativeNetworkSetupGeneration += 1
  nativeConnected = null
  if (nativeNetworkListener) {
    void nativeNetworkListener.remove().catch(() => {})
  }
  nativeNetworkListener = null
  retryTimer = null
  heartbeatTimer = null
  checking = null
  started = false
  probeGeneration = 0
  resetAIProxySelectionForTests()
  onlineHandler = null
  offlineHandler = null
  visibilityHandler = null
  focusHandler = null
  state = 'unknown'
  listeners.clear()
}
