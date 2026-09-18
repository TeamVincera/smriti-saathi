import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  useApp: vi.fn(),
  confirmAlarm: vi.fn(),
  checkAlarmPermissions: vi.fn(),
  requestAlarmPermissionStatus: vi.fn(),
  openExactAlarmSettings: vi.fn(),
  syncAllAlarmsToNative: vi.fn(),
}))

vi.mock('../../src/state', () => ({ useApp: mocks.useApp }))
vi.mock('../../src/lib/reminders', () => ({ confirmAlarm: mocks.confirmAlarm }))
vi.mock('../../src/lib/alarmService', () => ({
  checkAlarmPermissions: mocks.checkAlarmPermissions,
  requestAlarmPermissionStatus: mocks.requestAlarmPermissionStatus,
  openExactAlarmSettings: mocks.openExactAlarmSettings,
  syncAllAlarmsToNative: mocks.syncAllAlarmsToNative,
}))

import { Reminders } from '../../src/screens/Reminders'

const profile = {
  language: 'en',
  patient: { name: 'Sarala Devi' },
}

const appState = {
  dailyReminders: [{ id: 'water', title: 'Drink water', time: '10:30', emoji: '💧', category: 'hydration', active: true }],
    appointments: [],
    profile,
    t: (key: string) => ({
      nav_reminders: 'Reminders',
      hydration_reminder: 'Gentle reminders for a steady day.',
      appointments: 'Appointments',
      meds_empty_sub: 'Add a reminder when you are ready.',
      no_appointments: 'No upcoming doctor appointments scheduled.',
      reminder_alerts_title: 'Reminder alerts',
      reminder_alerts_on: 'Reminder alerts are on.',
      reminder_alerts_prompt: 'Allow notification alerts so medicine reminders can reach you.',
      reminder_alerts_denied_web: 'Notifications are blocked in this browser.',
      reminder_alerts_denied_native: 'Notifications are blocked for Smriti Sathi.',
      reminder_alerts_unavailable_web: 'This browser cannot provide notification alerts right now.',
      reminder_alerts_unavailable_native: 'We could not check notification access on this device.',
      reminder_exact_off_settings: 'Exact timing is off.',
      reminder_exact_unavailable: 'Exact timing is unavailable.',
      reminder_exact_unknown: 'We could not confirm Android exact timing.',
      reminder_exact_on: 'Exact timing is on for Android reminders.',
      reminder_permission_checking: 'Checking…',
      reminder_allow_notifications: 'Allow notification alerts',
      reminder_check_notifications: 'Check notification access',
      reminder_allow_exact: 'Allow exact timing',
      reminder_daily_tab: 'Daily reminders',
      reminder_appointments_tab: 'Appointments',
      reminder_no_daily: 'No daily reminders yet',
      reminder_category_hydration: 'hydration',
      reminder_category_meal: 'meal',
      reminder_category_activity: 'activity',
      reminder_category_rest: 'rest',
      reminder_category_routine: 'routine',
      reminder_category_general: 'general',
      reminder_category_unknown: 'reminder',
      reminder_done: 'Completed',
      reminder_mark_done: '{{title}}: mark as done',
      reminder_completed: '{{title}}: completed',
      reminder_today: 'TODAY',
      reminder_today_date: '{{today}} · {{date}}',
    }[key] ?? key),
}

describe('Reminders notification permission card', () => {
  beforeEach(() => {
    mocks.useApp.mockReturnValue(appState)
    mocks.confirmAlarm.mockReset()
    mocks.checkAlarmPermissions.mockReset()
    mocks.syncAllAlarmsToNative.mockReset().mockResolvedValue(1)
    mocks.requestAlarmPermissionStatus.mockReset()
    mocks.openExactAlarmSettings.mockReset()
  })

  it('does not request browser permission on mount and offers an explicit opt-in', async () => {
    const promptStatus = {
      platform: 'web',
      display: 'prompt',
      exactAlarm: 'not-applicable',
      canRequestDisplay: true,
      canOpenExactSettings: false,
    } as const
    const grantedStatus = { ...promptStatus, display: 'granted', canRequestDisplay: false } as const
    mocks.checkAlarmPermissions.mockResolvedValue(promptStatus)
    mocks.requestAlarmPermissionStatus.mockResolvedValue(grantedStatus)

    render(<Reminders />)

    expect(mocks.requestAlarmPermissionStatus).not.toHaveBeenCalled()
    const allow = await screen.findByRole('button', { name: 'Allow notification alerts' })
    expect(screen.getByRole('heading', { name: /Reminder alerts/i })).toBeInTheDocument()

    fireEvent.click(allow)

    await waitFor(() => expect(mocks.requestAlarmPermissionStatus).toHaveBeenCalledTimes(1))
    expect(mocks.syncAllAlarmsToNative).toHaveBeenCalledWith('en')
  })

  it('shows browser settings guidance after denial without hiding reminders', async () => {
    const deniedStatus = {
      platform: 'web',
      display: 'denied',
      exactAlarm: 'not-applicable',
      canRequestDisplay: false,
      canOpenExactSettings: false,
    } as const
    mocks.checkAlarmPermissions.mockResolvedValue(deniedStatus)

    render(<Reminders />)

    expect(await screen.findByText(/blocked in this browser/i)).toBeInTheDocument()
    expect(screen.getByText('Drink water')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Check notification access' }))
    await waitFor(() => expect(mocks.checkAlarmPermissions).toHaveBeenCalledTimes(2))
  })

  it('shows device settings guidance after native denial without blocking reminders', async () => {
    const deniedStatus = {
      platform: 'ios',
      display: 'denied',
      exactAlarm: 'not-applicable',
      canRequestDisplay: false,
      canOpenExactSettings: false,
    } as const
    mocks.checkAlarmPermissions.mockResolvedValue(deniedStatus)

    render(<Reminders />)

    expect(await screen.findByText(/blocked for Smriti Sathi/i)).toBeInTheDocument()
    expect(screen.getByText('Drink water')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Check notification access' }))
    await waitFor(() => expect(mocks.checkAlarmPermissions).toHaveBeenCalledTimes(2))
  })

  it('offers Android exact timing settings and resyncs after they are granted', async () => {
    const deniedExact = {
      platform: 'android',
      display: 'granted',
      exactAlarm: 'denied',
      canRequestDisplay: false,
      canOpenExactSettings: true,
    } as const
    const grantedExact = { ...deniedExact, exactAlarm: 'granted' } as const
    mocks.checkAlarmPermissions.mockResolvedValue(deniedExact)
    mocks.openExactAlarmSettings.mockResolvedValue(grantedExact)

    render(<Reminders />)

    expect(await screen.findByText(/exact timing is off/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Allow exact timing' }))

    await waitFor(() => expect(mocks.openExactAlarmSettings).toHaveBeenCalledTimes(1))
    expect(mocks.syncAllAlarmsToNative).toHaveBeenCalledWith('en')
  })
})
