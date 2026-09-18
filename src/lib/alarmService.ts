import { Capacitor } from '@capacitor/core'
import type { PermissionState } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import type { ActionPerformed, LocalNotificationSchema } from '@capacitor/local-notifications'
import { getMeds, loadDailyReminders, loadAppointments, loadProfile, addMedLog, addEvent } from './db'
import type { Language } from './types'
import { triggerAlarmFromExternal, type ActiveAlarm } from './reminders'

export const ALARM_CHANNEL_ID = 'reminders_alarm'
export const MED_ACTION_TYPE = 'MED_ALARM_ACTIONS'
export const NOTIFICATION_SOURCE = 'smriti-sathi'

export type AlarmPlatform = 'web' | 'ios' | 'android' | 'unknown'
export type AlarmDisplayPermission = PermissionState | 'unavailable' | 'unknown'
export type AlarmExactPermission = PermissionState | 'not-applicable' | 'unavailable' | 'unknown'

export interface AlarmPermissionStatus {
  platform: AlarmPlatform
  display: AlarmDisplayPermission
  exactAlarm: AlarmExactPermission
  canRequestDisplay: boolean
  canOpenExactSettings: boolean
}

let isInitialized = false

// Native notification APIs are stateful and replace the entire pending set on
// every sync. Serialize operations so an older database snapshot can never
// finish after a newer sync and put stale notifications back on the device.
let alarmOperationTail: Promise<void> = Promise.resolve()

function enqueueAlarmOperation<T>(operation: () => Promise<T>): Promise<T> {
  const run = alarmOperationTail.then(operation, operation)
  alarmOperationTail = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

/**
 * Generate a stable positive 32-bit integer ID from any string key
 */
export function hashStringToId(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0 // Convert to 32bit integer
  }
  // Mask the sign bit instead of using Math.abs: Math.abs(-2147483648)
  // remains negative. Keep zero out of the notification ID space as well.
  const positive = hash & 0x7fffffff
  return positive === 0 ? 1 : positive
}

/**
 * Parse "HH:MM" into hour and minute numbers
 */
export function parseTime(timeStr: string): { hour: number; minute: number } {
  const parts = timeStr.split(':')
  const hour = parseInt(parts[0] || '0', 10)
  const minute = parseInt(parts[1] || '0', 10)
  return {
    hour: isNaN(hour) ? 0 : Math.max(0, Math.min(23, hour)),
    minute: isNaN(minute) ? 0 : Math.max(0, Math.min(59, minute)),
  }
}

function isSmritiSathiNotification(notification: { extra?: unknown }): boolean {
  const extra = notification.extra as Record<string, unknown> | undefined
  if (extra?.source === NOTIFICATION_SOURCE) return true

  // Recognize notifications created by versions before the source marker was
  // added, while leaving unrelated pending notifications untouched.
  const key = typeof extra?.key === 'string' ? extra.key : ''
  return /^(med|daily|appt|routine):/.test(key)
}

function normalizePermissionState(value: unknown, fallback: AlarmDisplayPermission): AlarmDisplayPermission {
  if (value === 'default') return 'prompt'
  if (value === 'prompt' || value === 'prompt-with-rationale' || value === 'granted' || value === 'denied') {
    return value
  }
  return fallback
}

function normalizeExactPermission(value: unknown, fallback: AlarmExactPermission): AlarmExactPermission {
  if (value === 'prompt' || value === 'prompt-with-rationale' || value === 'granted' || value === 'denied') {
    return value
  }
  return fallback
}

export function getAlarmPlatform(): AlarmPlatform {
  const platform = Capacitor.getPlatform()
  if (platform === 'web' || platform === 'ios' || platform === 'android') return platform
  return Capacitor.isNativePlatform() ? 'unknown' : 'web'
}

/**
 * Read notification and Android exact-alarm state without opening a prompt or
 * settings screen. This is safe to call during app startup and route changes.
 */
export async function checkAlarmPermissions(): Promise<AlarmPermissionStatus> {
  const platform = getAlarmPlatform()

  if (!Capacitor.isNativePlatform()) {
    if (typeof Notification === 'undefined') {
      return {
        platform: 'web',
        display: 'unavailable',
        exactAlarm: 'not-applicable',
        canRequestDisplay: false,
        canOpenExactSettings: false,
      }
    }

    const display = normalizePermissionState(Notification.permission, 'unknown')
    return {
      platform: 'web',
      display,
      exactAlarm: 'not-applicable',
      canRequestDisplay: display === 'prompt' || display === 'prompt-with-rationale',
      canOpenExactSettings: false,
    }
  }

  let display: AlarmDisplayPermission = 'unknown'
  try {
    const status = await LocalNotifications.checkPermissions()
    display = normalizePermissionState(status.display, 'unknown')
  } catch (err) {
    console.warn('[AlarmService] Notification permission check warning:', err)
    display = 'unavailable'
  }

  let exactAlarm: AlarmExactPermission = 'not-applicable'
  let canOpenExactSettings = false
  if (platform === 'android') {
    const checkExact = LocalNotifications.checkExactNotificationSetting
    const changeExact = LocalNotifications.changeExactNotificationSetting
    const hasExactSettingsApi = typeof checkExact === 'function' && typeof changeExact === 'function'
    canOpenExactSettings = hasExactSettingsApi

    if (!hasExactSettingsApi) {
      exactAlarm = 'unavailable'
    } else {
      try {
        const exactStatus = await checkExact()
        exactAlarm = normalizeExactPermission(exactStatus.exact_alarm, 'unknown')
      } catch (err) {
        console.warn('[AlarmService] Exact-alarm permission check warning:', err)
        exactAlarm = 'unavailable'
        canOpenExactSettings = false
      }
    }
  }

  return {
    platform,
    display,
    exactAlarm,
    canRequestDisplay: display === 'prompt' || display === 'prompt-with-rationale',
    canOpenExactSettings,
  }
}

/** Request display permission after an explicit user gesture, then re-check state. */
export async function requestAlarmPermissionStatus(): Promise<AlarmPermissionStatus> {
  const before = await checkAlarmPermissions()
  if (!before.canRequestDisplay) return before

  try {
    if (before.platform === 'web') {
      if (typeof Notification !== 'undefined') await Notification.requestPermission()
    } else if (Capacitor.isNativePlatform()) {
      await LocalNotifications.requestPermissions()
    }
  } catch (err) {
    console.warn('[AlarmService] Permission request warning:', err)
  }

  return checkAlarmPermissions()
}

/**
 * Request notification permissions from OS (Android 13+, iOS, and Web)
 */
export async function requestAlarmPermissions(): Promise<boolean> {
  const status = await requestAlarmPermissionStatus()
  return status.display === 'granted'
}

/** Open Android's exact-alarm settings only after an explicit user gesture. */
export async function openExactAlarmSettings(): Promise<AlarmPermissionStatus> {
  const before = await checkAlarmPermissions()
  if (before.platform !== 'android' || !before.canOpenExactSettings) return before

  try {
    await LocalNotifications.changeExactNotificationSetting()
  } catch (err) {
    console.warn('[AlarmService] Exact-alarm settings warning:', err)
  }

  return checkAlarmPermissions()
}

/**
 * Configure high-priority notification channel for Android and action buttons
 */
export async function setupNativeChannelsAndActions(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  // Notification channels are an Android-only API. iOS has no channel
  // equivalent, and the Capacitor iOS implementation rejects this call.
  if (Capacitor.getPlatform() === 'android') {
    try {
      await LocalNotifications.createChannel({
        id: ALARM_CHANNEL_ID,
        name: 'Medicine & Routine Alarms',
        description: 'Heads-up alarms for medications, hydration, and doctor appointments',
        importance: 5, // MAX / High: heads-up notification with sound & screen wake
        visibility: 1, // Public: displays on lock screen
        sound: 'alarm.wav',
        vibration: true,
        lights: true,
        lightColor: '#15803D',
      })
    } catch (err) {
      // Action registration is independent and should still run if Android
      // channel setup is unavailable or fails.
      console.warn('[AlarmService] Channel registration warning:', err)
    }
  }

  try {
    // Register Interactive Action Buttons (Taken / Snooze) on both iOS and Android.
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: MED_ACTION_TYPE,
          actions: [
            {
              id: 'taken',
              title: '✓ Taken',
            },
            {
              id: 'snooze',
              title: '⏰ Snooze 10m',
            },
          ],
        },
      ],
    })
  } catch (err) {
    console.warn('[AlarmService] Action registration warning:', err)
  }
}

/**
 * Handle notification interaction (tap or action button clicked)
 */
async function handleActionPerformed(event: ActionPerformed): Promise<void> {
  const extra = event.notification.extra as Record<string, unknown> | undefined
  if (!extra) return

  const actionId = event.actionId

  if (actionId === 'taken' && extra.type === 'med' && typeof extra.medId === 'string') {
    const time = typeof extra.time === 'string' ? extra.time : ''
    const name = typeof extra.name === 'string' ? extra.name : 'Medication'
    const logKey = await addMedLog({
      medId: extra.medId,
      medName: name,
      scheduledFor: time,
      ts: Date.now(),
      status: 'taken',
      method: 'tap',
    })
    if (logKey !== undefined) {
      void addEvent({ kind: 'med_taken', data: { medId: extra.medId, method: 'notification_action' } })
    }
    return
  }

  if (actionId === 'snooze') {
    const key = String(extra.key || extra.medId || event.notification.id)
    try {
      localStorage.setItem(`snooze:${key}`, String(Date.now() + 10 * 60 * 1000))
    } catch {}
    void addEvent({ kind: 'reminder_dismissed', data: { reminderId: String(event.notification.id), reason: 'notification_snooze' } })
    return
  }

  // Tapped the notification banner -> open in-app ReminderOverlay
  const alarm: ActiveAlarm = {
    id: String(extra.id || extra.medId || event.notification.id),
    key: String(extra.key || `${extra.type}:${extra.id || extra.medId}|${Date.now()}`),
    type: (extra.type as ActiveAlarm['type']) || 'daily',
    title: event.notification.title || 'Reminder',
    subtitle: event.notification.body || undefined,
    emoji: (extra.emoji as string) || (extra.type === 'med' ? '💊' : '🔔'),
    time: (extra.time as string) || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    details: {
      medId: extra.medId as string | undefined,
      dosage: extra.dosage as string | undefined,
      food: extra.food as string | undefined,
      doctorName: extra.doctorName as string | undefined,
      routineKey: extra.routineKey as string | undefined,
    },
  }

  triggerAlarmFromExternal(alarm)
}

/**
 * Synchronize all medications, daily reminders, routine anchors, and appointments to native OS notifications
 */
async function performSyncAllAlarmsToNative(lang: Language): Promise<number> {
  try {
    const [meds, dailyReminders, appointments, profile] = await Promise.all([
      getMeds(),
      loadDailyReminders(),
      loadAppointments(),
      loadProfile(),
    ])

    const notifications: LocalNotificationSchema[] = []

    // 1. Schedule Active Medications (repeating daily at each prescribed time)
    const activeMeds = meds.filter((m) => m.active)
    for (const med of activeMeds) {
      for (const time of med.times) {
        const { hour, minute } = parseTime(time)
        const id = hashStringToId(`med:${med.id}:${time}`)
        const foodInstruction =
          med.food === 'before'
            ? (lang === 'hi' ? 'भोजन से पहले' : 'Before food')
            : med.food === 'after'
            ? (lang === 'hi' ? 'भोजन के बाद' : 'After food')
            : ''

        const body = [med.dosage, foodInstruction].filter(Boolean).join(' · ') || (lang === 'hi' ? 'दवा का समय' : 'Time for medicine')

        notifications.push({
          id,
          title: `💊 ${med.name}`,
          body,
          foreground: true,
          schedule: {
            on: {
              hour,
              minute,
            },
            allowWhileIdle: true,
          },
          sound: 'alarm.wav',
          channelId: ALARM_CHANNEL_ID,
          actionTypeId: MED_ACTION_TYPE,
          extra: {
            source: NOTIFICATION_SOURCE,
            type: 'med',
            medId: med.id,
            name: med.name,
            dosage: med.dosage,
            food: med.food,
            time,
            key: `med:${med.id}|${time}`,
          },
        })
      }
    }

    // 2. Schedule Daily Reminders (hydration, walks, rest)
    const activeReminders = dailyReminders.filter((r) => r.active ?? r.enabled ?? true)
    for (const r of activeReminders) {
      const { hour, minute } = parseTime(r.time)
      const id = hashStringToId(`daily:${r.id}:${r.time}`)
      const title = lang === 'hi' && r.titleHi ? r.titleHi : r.title

      notifications.push({
        id,
        title: `${r.emoji || '🔔'} ${title}`,
        body: r.description || (lang === 'hi' ? 'दैनिक अनुस्मारक' : 'Daily reminder'),
        foreground: true,
        schedule: {
          on: {
            hour,
            minute,
          },
          allowWhileIdle: true,
        },
        sound: 'alarm.wav',
        channelId: ALARM_CHANNEL_ID,
        extra: {
          source: NOTIFICATION_SOURCE,
          type: 'daily',
          id: r.id,
          title,
          time: r.time,
          emoji: r.emoji || '🔔',
          key: `daily:${r.id}|${r.time}`,
        },
      })
    }

    // 3. Schedule Doctor Appointments (scheduled at exact date and time)
    const nowTs = Date.now()
    const activeAppointments = appointments.filter((a) => (a.active ?? a.enabled ?? true))
    for (const a of activeAppointments) {
      const [year, month, day] = a.date.split('-').map(Number)
      const { hour, minute } = parseTime(a.time)
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        const apptDate = new Date(year, month - 1, day, hour, minute, 0, 0)
        if (apptDate.getTime() > nowTs - 10 * 60 * 1000) {
          // Future or current appointment
          const id = hashStringToId(`appt:${a.id}:${a.date}:${a.time}`)
          const body = a.doctorName
            ? (lang === 'hi' ? `डॉ. ${a.doctorName} के साथ अपॉइंटमेंट` : `Appointment with Dr. ${a.doctorName}`)
            : (lang === 'hi' ? 'डॉक्टर अपॉइंटमेंट' : 'Doctor appointment')

          notifications.push({
            id,
            title: `🩺 ${a.title}`,
            body,
            foreground: true,
            schedule: {
              at: apptDate,
              allowWhileIdle: true,
            },
            sound: 'alarm.wav',
            channelId: ALARM_CHANNEL_ID,
            extra: {
              source: NOTIFICATION_SOURCE,
              type: 'appointment',
              id: a.id,
              title: a.title,
              doctorName: a.doctorName,
              date: a.date,
              time: a.time,
              key: `appt:${a.id}|${a.date}|${a.time}`,
            },
          })
        }
      }
    }

    // 4. Schedule Routine Anchors from Patient Profile (Wake, Breakfast, Lunch, Dinner)
    if (profile?.routine) {
      const routineItems: Array<{ key: string; time?: string; title: string; titleHi: string; emoji: string }> = [
        { key: 'wake', time: profile.routine.wake, title: 'Good Morning — Time to Wake Up', titleHi: 'सुप्रभात — जागने का समय', emoji: '☀️' },
        { key: 'breakfast', time: profile.routine.breakfast, title: 'Time for Warm Breakfast', titleHi: 'नाश्ते का समय', emoji: '🥣' },
        { key: 'lunch', time: profile.routine.lunch, title: 'Time for Nutritious Lunch', titleHi: 'दोपहर के भोजन का समय', emoji: '🍛' },
        { key: 'dinner', time: profile.routine.dinner, title: 'Time for Light Dinner', titleHi: 'रात के भोजन का समय', emoji: '🍲' },
      ]

      for (const item of routineItems) {
        if (item.time) {
          const { hour, minute } = parseTime(item.time)
          const id = hashStringToId(`routine:${item.key}:${item.time}`)
          const title = lang === 'hi' ? item.titleHi : item.title

          notifications.push({
            id,
            title: `${item.emoji} ${title}`,
            body: lang === 'hi' ? 'दैनिक दिनचर्या' : 'Daily routine anchor',
            foreground: true,
            schedule: {
              on: {
                hour,
                minute,
              },
              allowWhileIdle: true,
            },
            sound: 'alarm.wav',
            channelId: ALARM_CHANNEL_ID,
            extra: {
              source: NOTIFICATION_SOURCE,
              type: 'routine',
              id: `routine-${item.key}`,
              routineKey: item.key,
              title,
              time: item.time,
              emoji: item.emoji,
              key: `routine:${item.key}|${item.time}`,
            },
          })
        }
      }
    }

    // If native Capacitor platform: cancel old pending and schedule fresh set
    if (Capacitor.isNativePlatform()) {
      const permissionStatus = await checkAlarmPermissions()
      if (permissionStatus.display !== 'granted') {
        // Do not call the plugin's schedule() while display permission is
        // prompt/denied: recent Capacitor versions may request permission
        // implicitly from schedule(). In-app reminders continue independently.
        return notifications.length
      }

      const nativeNotifications =
        permissionStatus.platform === 'android' && permissionStatus.exactAlarm !== 'granted'
          ? notifications.map((notification) => ({ ...notification, isExactNotification: false }))
          : notifications
      const pending = await LocalNotifications.getPending()
      const ownPending = pending.notifications.filter(isSmritiSathiNotification)
      if (ownPending.length > 0) {
        await LocalNotifications.cancel({ notifications: ownPending })
      }

      if (nativeNotifications.length > 0) {
        // When exact-alarm capability is denied/unavailable, retain reminder
        // delivery with inexact alarms instead of allowing schedule() to open
        // Android settings during startup or background state sync.
        await LocalNotifications.schedule({ notifications: nativeNotifications })
      }
    }

    return notifications.length
  } catch (err) {
    console.error('[AlarmService] Failed to sync alarms to native:', err)
    return 0
  }
}

/**
 * Cancel all notifications owned by Smriti Sathi without touching unrelated
 * notifications created by another app or an older integration.
 */
async function performCancelAllAlarmsToNative(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  try {
    const pending = await LocalNotifications.getPending()
    const ownPending = pending.notifications.filter(isSmritiSathiNotification)
    if (ownPending.length > 0) {
      await LocalNotifications.cancel({ notifications: ownPending })
    }
  } catch (err) {
    // Resetting local data must still complete if the OS notification bridge
    // is unavailable; the next native sync can retry cancellation.
    console.warn('[AlarmService] Failed to cancel native alarms:', err)
  }
}

/**
 * Synchronize alarms through the shared native-operation queue. Calls may be
 * triggered by several independent state mutations in quick succession; the
 * queue guarantees that the final operation observes the latest DB snapshot.
 */
export function syncAllAlarmsToNative(lang: Language = 'en'): Promise<number> {
  return enqueueAlarmOperation(() => performSyncAllAlarmsToNative(lang))
}

/** Cancel this app's pending native alarms, serialized with alarm syncs. */
export function cancelAllAlarmsToNative(): Promise<void> {
  return enqueueAlarmOperation(performCancelAllAlarmsToNative)
}

/**
 * Initialize native alarm listeners and channel registration
 */
export async function initAlarmService(lang: Language = 'en'): Promise<void> {
  if (isInitialized) return
  isInitialized = true

  try {
    await setupNativeChannelsAndActions()

    if (Capacitor.isNativePlatform()) {
      // Reminders are a core app feature. Ask once on the first native launch
      // after onboarding so the OS can deliver alarms while the app is closed.
      // A denied permission remains respected and can be changed in Settings.
      const permission = await checkAlarmPermissions()
      if (permission.canRequestDisplay) {
        await requestAlarmPermissionStatus()
      }

      LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
        void handleActionPerformed(event)
      })

      LocalNotifications.addListener('localNotificationReceived', (notification) => {
        const extra = notification.extra as Record<string, unknown> | undefined
        if (extra) {
          const alarm: ActiveAlarm = {
            id: String(extra.id || extra.medId || notification.id),
            key: String(extra.key || `${extra.type}:${extra.id || extra.medId}|${Date.now()}`),
            type: (extra.type as ActiveAlarm['type']) || 'daily',
            title: notification.title || 'Reminder',
            subtitle: notification.body || undefined,
            emoji: (extra.emoji as string) || (extra.type === 'med' ? '💊' : '🔔'),
            time: (extra.time as string) || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            details: {
              medId: extra.medId as string | undefined,
              dosage: extra.dosage as string | undefined,
              food: extra.food as string | undefined,
              doctorName: extra.doctorName as string | undefined,
              routineKey: extra.routineKey as string | undefined,
            },
          }
          triggerAlarmFromExternal(alarm)
        }
      })
    }

    await syncAllAlarmsToNative(lang)
  } catch (err) {
    console.warn('[AlarmService] Initialization failed gracefully:', err)
  }
}
