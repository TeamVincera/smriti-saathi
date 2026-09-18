import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const permissionMocks = vi.hoisted(() => {
  const platform = { value: 'web' as 'web' | 'ios' | 'android' }
  return {
    platform,
    capacitor: {
      getPlatform: vi.fn(() => platform.value),
      isNativePlatform: vi.fn(() => platform.value !== 'web'),
    },
    localNotifications: {
      checkPermissions: vi.fn(),
      requestPermissions: vi.fn(),
      checkExactNotificationSetting: vi.fn(),
      changeExactNotificationSetting: vi.fn(),
      createChannel: vi.fn(),
      registerActionTypes: vi.fn(),
      addListener: vi.fn(),
      getPending: vi.fn(),
      cancel: vi.fn(),
      schedule: vi.fn(),
    },
  }
})

vi.mock('@capacitor/core', () => ({ Capacitor: permissionMocks.capacitor }))
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: permissionMocks.localNotifications }))

import {
  checkAlarmPermissions,
  initAlarmService,
  openExactAlarmSettings,
  requestAlarmPermissionStatus,
} from '../../src/lib/alarmService'

describe('alarm permission recovery', () => {
  beforeEach(() => {
    permissionMocks.platform.value = 'web'
    permissionMocks.localNotifications.checkPermissions.mockReset().mockResolvedValue({ display: 'prompt' })
    permissionMocks.localNotifications.requestPermissions.mockReset().mockResolvedValue({ display: 'granted' })
    permissionMocks.localNotifications.checkExactNotificationSetting = vi.fn().mockResolvedValue({ exact_alarm: 'granted' })
    permissionMocks.localNotifications.changeExactNotificationSetting = vi.fn().mockResolvedValue({ exact_alarm: 'granted' })
    permissionMocks.localNotifications.createChannel.mockReset().mockResolvedValue(undefined)
    permissionMocks.localNotifications.registerActionTypes.mockReset().mockResolvedValue(undefined)
    permissionMocks.localNotifications.addListener.mockReset().mockResolvedValue({ remove: vi.fn() })
    permissionMocks.localNotifications.getPending.mockReset().mockResolvedValue({ notifications: [] })
    permissionMocks.localNotifications.cancel.mockReset().mockResolvedValue(undefined)
    permissionMocks.localNotifications.schedule.mockReset().mockResolvedValue({ notifications: [] })
    vi.stubGlobal('Notification', {
      permission: 'default',
      requestPermission: vi.fn().mockImplementation(async () => {
        ;(globalThis.Notification as { permission: string }).permission = 'granted'
        return 'granted'
      }),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads web default state without requesting permission', async () => {
    const status = await checkAlarmPermissions()

    expect(status).toMatchObject({
      platform: 'web',
      display: 'prompt',
      exactAlarm: 'not-applicable',
      canRequestDisplay: true,
    })
    expect(Notification.requestPermission).not.toHaveBeenCalled()
  })

  it('requests web permission only when the explicit request helper is called', async () => {
    const status = await requestAlarmPermissionStatus()

    expect(Notification.requestPermission).toHaveBeenCalledTimes(1)
    expect(status.display).toBe('granted')
  })

  it('does not repeatedly prompt after native denial', async () => {
    permissionMocks.platform.value = 'ios'
    permissionMocks.localNotifications.checkPermissions.mockResolvedValue({ display: 'denied' })

    const status = await requestAlarmPermissionStatus()

    expect(status).toMatchObject({ platform: 'ios', display: 'denied', canRequestDisplay: false })
    expect(permissionMocks.localNotifications.requestPermissions).not.toHaveBeenCalled()
  })

  it('opens Android exact-alarm settings only through the explicit helper and re-checks', async () => {
    permissionMocks.platform.value = 'android'
    permissionMocks.localNotifications.checkPermissions.mockResolvedValue({ display: 'granted' })
    permissionMocks.localNotifications.checkExactNotificationSetting
      .mockResolvedValueOnce({ exact_alarm: 'denied' })
      .mockResolvedValueOnce({ exact_alarm: 'granted' })

    const before = await checkAlarmPermissions()
    expect(before).toMatchObject({ platform: 'android', display: 'granted', exactAlarm: 'denied', canOpenExactSettings: true })

    const after = await openExactAlarmSettings()
    expect(permissionMocks.localNotifications.changeExactNotificationSetting).toHaveBeenCalledTimes(1)
    expect(after.exactAlarm).toBe('granted')
  })

  it('surfaces unavailable exact-alarm APIs instead of assuming Android support', async () => {
    permissionMocks.platform.value = 'android'
    permissionMocks.localNotifications.checkPermissions.mockResolvedValue({ display: 'granted' })
    permissionMocks.localNotifications.checkExactNotificationSetting = undefined
    permissionMocks.localNotifications.changeExactNotificationSetting = undefined

    const status = await checkAlarmPermissions()

    expect(status).toMatchObject({
      platform: 'android',
      display: 'granted',
      exactAlarm: 'unavailable',
      canOpenExactSettings: false,
    })
  })

  it('does not offer exact settings when the capability check fails', async () => {
    permissionMocks.platform.value = 'android'
    permissionMocks.localNotifications.checkPermissions.mockResolvedValue({ display: 'granted' })
    permissionMocks.localNotifications.checkExactNotificationSetting.mockRejectedValue(new Error('unimplemented'))

    const status = await checkAlarmPermissions()

    expect(status).toMatchObject({
      platform: 'android',
      exactAlarm: 'unavailable',
      canOpenExactSettings: false,
    })
  })

  it('requests native permission during initialization so closed-app alarms can be scheduled', async () => {
    permissionMocks.platform.value = 'ios'
    permissionMocks.localNotifications.checkPermissions.mockResolvedValue({ display: 'prompt' })

    await initAlarmService('en')

    expect(permissionMocks.localNotifications.requestPermissions).toHaveBeenCalledTimes(1)
    expect(permissionMocks.localNotifications.schedule).not.toHaveBeenCalled()
  })
})
