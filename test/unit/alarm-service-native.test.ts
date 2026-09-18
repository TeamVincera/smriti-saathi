import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const nativeMocks = vi.hoisted(() => {
  const platform = { value: 'ios' as 'ios' | 'android' | 'web' }

  return {
    platform,
    capacitor: {
      getPlatform: vi.fn(() => platform.value),
      isNativePlatform: vi.fn(() => platform.value !== 'web'),
    },
    localNotifications: {
      createChannel: vi.fn(),
      registerActionTypes: vi.fn(),
    },
  }
})

vi.mock('@capacitor/core', () => ({ Capacitor: nativeMocks.capacitor }))
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: nativeMocks.localNotifications }))

import {
  ALARM_CHANNEL_ID,
  MED_ACTION_TYPE,
  setupNativeChannelsAndActions,
} from '../../src/lib/alarmService'

const expectedActions = {
  types: [
    {
      id: MED_ACTION_TYPE,
      actions: [
        { id: 'taken', title: '✓ Taken' },
        { id: 'snooze', title: '⏰ Snooze 10m' },
      ],
    },
  ],
}

describe('Native notification platform setup', () => {
  beforeEach(() => {
    nativeMocks.platform.value = 'ios'
    nativeMocks.localNotifications.createChannel.mockReset().mockResolvedValue(undefined)
    nativeMocks.localNotifications.registerActionTypes.mockReset().mockResolvedValue(undefined)
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('registers iOS actions without calling the Android-only channel API', async () => {
    await expect(setupNativeChannelsAndActions()).resolves.toBeUndefined()

    expect(nativeMocks.localNotifications.createChannel).not.toHaveBeenCalled()
    expect(nativeMocks.localNotifications.registerActionTypes).toHaveBeenCalledTimes(1)
    expect(nativeMocks.localNotifications.registerActionTypes).toHaveBeenCalledWith(expectedActions)
  })

  it('registers both the Android channel and actions', async () => {
    nativeMocks.platform.value = 'android'

    await expect(setupNativeChannelsAndActions()).resolves.toBeUndefined()

    expect(nativeMocks.localNotifications.createChannel).toHaveBeenCalledWith({
      id: ALARM_CHANNEL_ID,
      name: 'Medicine & Routine Alarms',
      description: 'Heads-up alarms for medications, hydration, and doctor appointments',
      importance: 5,
      visibility: 1,
      sound: 'alarm.wav',
      vibration: true,
      lights: true,
      lightColor: '#15803D',
    })
    expect(nativeMocks.localNotifications.registerActionTypes).toHaveBeenCalledWith(expectedActions)
  })

  it('still registers Android actions when channel creation fails', async () => {
    nativeMocks.platform.value = 'android'
    nativeMocks.localNotifications.createChannel.mockRejectedValueOnce(new Error('channel unavailable'))

    await expect(setupNativeChannelsAndActions()).resolves.toBeUndefined()

    expect(nativeMocks.localNotifications.createChannel).toHaveBeenCalledTimes(1)
    expect(nativeMocks.localNotifications.registerActionTypes).toHaveBeenCalledWith(expectedActions)
  })

  it('contains action registration failures without rejecting initialization', async () => {
    nativeMocks.localNotifications.registerActionTypes.mockRejectedValueOnce(new Error('actions unavailable'))

    await expect(setupNativeChannelsAndActions()).resolves.toBeUndefined()
    expect(nativeMocks.localNotifications.createChannel).not.toHaveBeenCalled()
  })
})
