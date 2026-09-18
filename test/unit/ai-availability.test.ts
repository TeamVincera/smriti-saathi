import { afterEach, describe, expect, it, vi } from 'vitest'
import { AI_AVAILABILITY_POLL_INTERVAL_MS, checkAIAvailability, getAIAvailabilitySnapshot, resetAIAvailabilityForTests, startAIAvailability } from '../../src/lib/ai/availability'
import { aiProxyBases, aiProxyUrl, requestAiChat } from '../../src/lib/ai/proxyClient'

const nativePlatform = vi.hoisted(() => ({
  isNativePlatform: vi.fn(() => true),
  getPlatform: vi.fn(() => 'ios'),
}))
const nativeNetwork = vi.hoisted(() => ({
  getStatus: vi.fn().mockResolvedValue({ connected: true, connectionType: 'wifi' }),
  addListener: vi.fn().mockResolvedValue({ remove: vi.fn().mockResolvedValue(undefined) }),
}))

vi.mock('@capacitor/core', () => ({ Capacitor: nativePlatform }))
vi.mock('@capacitor/network', () => ({ Network: nativeNetwork }))

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value })
}

describe('AI availability gate', () => {
  afterEach(() => {
    vi.useRealTimers()
    resetAIAvailabilityForTests()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    nativePlatform.isNativePlatform.mockReset().mockReturnValue(true)
    nativePlatform.getPlatform.mockReset().mockReturnValue('ios')
    nativeNetwork.getStatus.mockReset().mockResolvedValue({ connected: true, connectionType: 'wifi' })
    nativeNetwork.addListener.mockReset().mockResolvedValue({ remove: vi.fn().mockResolvedValue(undefined) })
    delete window.__SMRITI_AI_PROXY_URL__
    delete window.__SMRITI_AI_PROXY_URLS__
    setOnline(true)
  })

  it('uses the backend status even when navigator reports the device offline', async () => {
    setOnline(false)
    const health = vi.fn().mockResolvedValue(new Response(JSON.stringify({ available: true, ready: true }), { status: 200 }))
    vi.stubGlobal('fetch', health)

    await expect(checkAIAvailability()).resolves.toBe(true)
    expect(health).toHaveBeenCalledTimes(1)
    expect(getAIAvailabilitySnapshot()).toBe('online')
  })

  it('stays offline when the backend health check fails despite navigator online', async () => {
    setOnline(true)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('unreachable')))
    await expect(checkAIAvailability()).resolves.toBe(false)
    expect(getAIAvailabilitySnapshot()).toBe('offline')
  })

  it('requires an explicit ready health response before enabling cloud features', async () => {
    setOnline(true)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ available: true, ready: false }), { status: 200 })))
    await expect(checkAIAvailability()).resolves.toBe(false)
    expect(getAIAvailabilitySnapshot()).toBe('offline')
  })

  it('transitions offline to online and back through connectivity events', async () => {
    setOnline(false)
    startAIAvailability()
    await checkAIAvailability()
    expect(getAIAvailabilitySnapshot()).toBe('offline')

    const health = vi.fn().mockResolvedValue(new Response(JSON.stringify({ available: true, ready: true }), { status: 200 }))
    vi.stubGlobal('fetch', health)
    setOnline(true)
    window.dispatchEvent(new Event('online'))
    await vi.waitFor(() => expect(getAIAvailabilitySnapshot()).toBe('online'))

    setOnline(false)
    window.dispatchEvent(new Event('offline'))
    expect(getAIAvailabilitySnapshot()).toBe('offline')
  })

  it('marks AI offline immediately when native network disconnects', async () => {
    const remove = vi.fn().mockResolvedValue(undefined)
    nativeNetwork.addListener.mockResolvedValue({ remove })
    const health = vi.fn().mockResolvedValue(new Response(JSON.stringify({ available: true, ready: true }), { status: 200 }))
    vi.stubGlobal('fetch', health)

    startAIAvailability()
    await vi.waitFor(() => expect(nativeNetwork.addListener).toHaveBeenCalledTimes(1))
    await vi.waitFor(() => expect(getAIAvailabilitySnapshot()).toBe('online'))
    await checkAIAvailability()
    const onNetworkChange = nativeNetwork.addListener.mock.calls[0][1] as (status: { connected: boolean }) => void
    onNetworkChange({ connected: false })

    expect(getAIAvailabilitySnapshot()).toBe('offline')
    resetAIAvailabilityForTests()
    await vi.waitFor(() => expect(remove).toHaveBeenCalledTimes(1))
  })

  it('probes the backend immediately when native network reconnects', async () => {
    nativeNetwork.getStatus.mockResolvedValue({ connected: false, connectionType: 'none' })
    const health = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ available: true, ready: true }), { status: 200 })))
    vi.stubGlobal('fetch', health)

    startAIAvailability()
    await vi.waitFor(() => expect(nativeNetwork.addListener).toHaveBeenCalledTimes(1))
    await vi.waitFor(() => expect(nativeNetwork.getStatus).toHaveBeenCalledTimes(1))
    expect(getAIAvailabilitySnapshot()).toBe('offline')
    expect(health).not.toHaveBeenCalled()
    const onNetworkChange = nativeNetwork.addListener.mock.calls[0][1] as (status: { connected: boolean }) => void
    const callsBeforeReconnect = health.mock.calls.length
    onNetworkChange({ connected: true })

    await vi.waitFor(() => expect(health.mock.calls.length).toBeGreaterThan(callsBeforeReconnect))
    await vi.waitFor(() => expect(getAIAvailabilitySnapshot()).toBe('online'))
  })

  it('lets backend health override native startup state before enabling AI', async () => {
    setOnline(false)
    nativeNetwork.getStatus.mockResolvedValue({ connected: false, connectionType: 'none' })
    const health = vi.fn().mockResolvedValue(new Response(JSON.stringify({ available: true, ready: true }), { status: 200 }))
    vi.stubGlobal('fetch', health)

    startAIAvailability()
    await vi.waitFor(() => expect(nativeNetwork.getStatus).toHaveBeenCalledTimes(1))
    expect(getAIAvailabilitySnapshot()).toBe('offline')
    expect(health).not.toHaveBeenCalled()
  })

  it('does not let manual or heartbeat checks re-enable AI while native is disconnected', async () => {
    vi.useFakeTimers()
    nativeNetwork.getStatus.mockResolvedValue({ connected: false, connectionType: 'none' })
    const health = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ available: true, ready: true }), { status: 200 })))
    vi.stubGlobal('fetch', health)

    startAIAvailability()
    await vi.advanceTimersByTimeAsync(0)
    expect(getAIAvailabilitySnapshot()).toBe('offline')
    await expect(checkAIAvailability()).resolves.toBe(false)
    await vi.advanceTimersByTimeAsync(AI_AVAILABILITY_POLL_INTERVAL_MS * 2)

    expect(health).not.toHaveBeenCalled()
    expect(getAIAvailabilitySnapshot()).toBe('offline')
  })

  it('retries a failed backend on the 2.5 second cadence and returns online when ready', async () => {
    vi.useFakeTimers()
    // WKWebView can keep navigator.onLine false while the LAN is reachable.
    setOnline(false)
    nativePlatform.isNativePlatform.mockReturnValue(false)
    vi.stubEnv('VITE_AI_PROXY_URL', 'http://only-endpoint.invalid:8787/api/ai')
    vi.stubEnv('VITE_AI_PROXY_URLS', '')
    const health = vi.fn()
      .mockRejectedValueOnce(new Error('unreachable'))
      .mockResolvedValue(new Response(JSON.stringify({ available: true, ready: true }), { status: 200 }))
    vi.stubGlobal('fetch', health)

    startAIAvailability()
    await vi.advanceTimersByTimeAsync(0)
    expect(getAIAvailabilitySnapshot()).toBe('offline')
    expect(health).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(AI_AVAILABILITY_POLL_INTERVAL_MS - 1)
    expect(health).toHaveBeenCalledTimes(1)
    expect(getAIAvailabilitySnapshot()).toBe('offline')

    await vi.advanceTimersByTimeAsync(1)
    expect(health).toHaveBeenCalledTimes(2)
    expect(getAIAvailabilitySnapshot()).toBe('online')
  })

  it('does not let a stale backend success override a newer offline event', async () => {
    vi.useFakeTimers()
    setOnline(true)
    let resolveHealth!: (response: Response) => void
    const health = vi.fn().mockImplementation(() => new Promise<Response>((resolve) => {
      resolveHealth = resolve
    }))
    vi.stubGlobal('fetch', health)

    startAIAvailability()
    await vi.advanceTimersByTimeAsync(0)
    setOnline(false)
    window.dispatchEvent(new Event('offline'))
    resolveHealth(new Response(JSON.stringify({ available: true, ready: true }), { status: 200 }))
    await vi.advanceTimersByTimeAsync(0)

    expect(getAIAvailabilitySnapshot()).toBe('offline')
  })

  it('falls back from a configured physical-device endpoint to iOS localhost', async () => {
    vi.stubEnv('VITE_AI_PROXY_URL', 'http://169.254.25.31:8787/api/ai')
    vi.stubEnv('VITE_AI_PROXY_URLS', '')
    const health = vi.fn()
      .mockRejectedValueOnce(new Error('simulator cannot reach the USB link'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ available: true, ready: true }), { status: 200 }))
    vi.stubGlobal('fetch', health)

    expect(aiProxyBases()).toEqual(['http://169.254.25.31:8787/api/ai', 'http://127.0.0.1:8787/api/ai'])
    await expect(checkAIAvailability()).resolves.toBe(true)
    expect(health.mock.calls.map(([url]) => url)).toEqual([
      'http://169.254.25.31:8787/api/ai/status',
      'http://127.0.0.1:8787/api/ai/status',
    ])
    expect(aiProxyUrl('chat')).toBe('http://127.0.0.1:8787/api/ai/chat')
  })

  it('selects a healthy configured endpoint for a physical iPhone', async () => {
    vi.stubEnv('VITE_AI_PROXY_URL', '')
    vi.stubEnv('VITE_AI_PROXY_URLS', 'http://169.254.25.31:8787/api/ai, http://169.254.25.31:8787/api/ai, http://172.16.78.164:8787/api/ai')
    const health = vi.fn().mockResolvedValue(new Response(JSON.stringify({ available: true, ready: true }), { status: 200 }))
    vi.stubGlobal('fetch', health)

    expect(aiProxyBases()).toEqual([
      'http://169.254.25.31:8787/api/ai',
      'http://172.16.78.164:8787/api/ai',
      'http://127.0.0.1:8787/api/ai',
    ])
    await expect(checkAIAvailability()).resolves.toBe(true)
    expect(health).toHaveBeenCalledTimes(1)
    expect(health.mock.calls[0][0]).toBe('http://169.254.25.31:8787/api/ai/status')
    expect(aiProxyUrl('tts')).toBe('http://169.254.25.31:8787/api/ai/tts')
  })

  it('routes chat through the selected fallback endpoint', async () => {
    vi.stubEnv('VITE_AI_PROXY_URL', '')
    vi.stubEnv('VITE_AI_PROXY_URLS', 'http://usb.invalid:8787/api/ai, http://172.16.78.164:8787/api/ai')
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('USB link unavailable'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ available: true, ready: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: 'Hello' } }] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(checkAIAvailability()).resolves.toBe(true)
    await expect(requestAiChat({ messages: [{ role: 'user', content: 'Hi' }] })).resolves.toBe('Hello')
    expect(fetchMock.mock.calls[2][0]).toBe('http://172.16.78.164:8787/api/ai/chat')
  })

  it('stays offline when every endpoint fails and recovers on a later probe', async () => {
    vi.stubEnv('VITE_AI_PROXY_URL', 'http://usb.invalid:8787/api/ai')
    vi.stubEnv('VITE_AI_PROXY_URLS', '')
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('configured endpoint unavailable'))
      .mockRejectedValueOnce(new Error('localhost unavailable'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ available: true, ready: true }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(checkAIAvailability()).resolves.toBe(false)
    expect(getAIAvailabilitySnapshot()).toBe('offline')
    await expect(checkAIAvailability()).resolves.toBe(true)
    expect(getAIAvailabilitySnapshot()).toBe('online')
    expect(aiProxyUrl('chat')).toBe('http://usb.invalid:8787/api/ai/chat')
  })
})
