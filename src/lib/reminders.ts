import type { Med, DailyReminder, AppointmentReminder, Language } from './types'
import {
  getMeds, getMedLog, addMedLog, addEvent, loadDailyReminders, loadAppointments, loadProfile,
} from './db'
import { startAlarmSound, stopAlarmSound } from './audio'
import { syncAllAlarmsToNative } from './alarmService'

export type ReminderType = 'med' | 'daily' | 'appointment' | 'routine'

export interface ActiveAlarm {
  id: string
  key: string
  type: ReminderType
  title: string
  subtitle?: string
  emoji: string
  time: string
  details?: {
    medId?: string
    dosage?: string
    instructions?: string
    doctorName?: string
    location?: string
    routineKey?: string
    photo?: string
    food?: string
  }
}

type Listener = (alarm: ActiveAlarm | null) => void

const GRACE_MS = 25 * 60 * 1000
const SNOOZE_MS = 10 * 60 * 1000

const listeners = new Set<Listener>()
let current: ActiveAlarm | null = null
let timer: ReturnType<typeof setInterval> | null = null
let langGetter: () => Language = () => 'en'
let engineGeneration = 0
let tickInFlight = false
const completedAlarmKeys = new Set<string>()

function dateStrOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function schedTs(dateStr: string, time: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !/^\d{2}:\d{2}$/.test(time)) return Number.NaN
  const [y, mo, dd] = dateStr.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  if (mo < 1 || mo > 12 || dd < 1 || dd > 31 || h < 0 || h > 23 || mi < 0 || mi > 59) return Number.NaN
  const result = new Date(y, mo - 1, dd, h, mi, 0, 0)
  // Date() normalises invalid civil times (including DST gaps). Skipping such
  // a record is safer than firing a reminder at a different time or date.
  if (result.getFullYear() !== y || result.getMonth() !== mo - 1 || result.getDate() !== dd
    || result.getHours() !== h || result.getMinutes() !== mi) return Number.NaN
  return result.getTime()
}

export function subscribeReminders(fn: Listener): () => void {
  listeners.add(fn)
  fn(current)
  return () => {
    listeners.delete(fn)
  }
}

function emit(alarm: ActiveAlarm | null) {
  current = alarm
  if (alarm) {
    startAlarmSound()
  } else {
    stopAlarmSound()
  }
  listeners.forEach((l) => l(alarm))
}

export function triggerAlarmFromExternal(alarm: ActiveAlarm) {
  emit(alarm)
}

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function loggedForDate(dateStr: string): Promise<Set<string>> {
  const entries = await getMedLog()
  const set = new Set<string>()
  for (const e of entries) {
    // Medication occurrences are local-calendar based. A dose logged within
    // the previous rolling 24 hours must not suppress today's dose at the
    // same scheduled time.
    if (e.status === 'taken' && localDateKey(new Date(e.ts)) === dateStr) {
      set.add(`${e.medId}|${dateStr}|${e.scheduledFor}`)
    }
  }
  return set
}

export async function confirmTaken(med: Med, scheduledFor: string, method: 'tap' | 'slide' = 'tap') {
  const logKey = await addMedLog({
    medId: med.id,
    medName: med.name,
    scheduledFor,
    ts: Date.now(),
    status: 'taken',
    method,
  })
  if (logKey !== undefined) {
    void addEvent({ kind: 'med_taken', data: { medId: med.id, method } })
  }
}

export async function confirmAlarm(alarm: ActiveAlarm, method: 'slide' | 'tap' = 'slide') {
  if (completedAlarmKeys.has(alarm.key) || getStorageVal(`done:${alarm.key}`)) {
    emit(null)
    return
  }
  completedAlarmKeys.add(alarm.key)
  stopAlarmSound()
  try {
    if (alarm.type === 'med' && alarm.details?.medId) {
      const logKey = await addMedLog({
        medId: alarm.details.medId,
        medName: alarm.title,
        scheduledFor: alarm.time,
        ts: Date.now(),
        status: 'taken',
        method,
      })
      if (logKey !== undefined) {
        void addEvent({ kind: 'med_taken', data: { medId: alarm.details.medId, method } })
      }
    } else {
      void addEvent({ kind: 'reminder_completed', data: { reminderId: alarm.id, type: alarm.type, method } })
    }
    try {
      localStorage.setItem(`done:${alarm.key}`, String(Date.now()))
      sessionStorage.setItem(`done:${alarm.key}`, String(Date.now()))
    } catch (err) {
      console.error(`[Reminders] Failed to set storage done:${alarm.key}`, err)
    }
    void syncAllAlarmsToNative(langGetter())
    emit(null)
  } catch (error) {
    // A failed IndexedDB write must remain retryable rather than permanently
    // suppressing the occurrence in this tab.
    completedAlarmKeys.delete(alarm.key)
    throw error
  }
}

export async function snoozeAlarm(alarm: ActiveAlarm) {
  stopAlarmSound()
  try {
    localStorage.setItem(`snooze:${alarm.key}`, String(Date.now() + SNOOZE_MS))
    sessionStorage.setItem(`snooze:${alarm.key}`, String(Date.now() + SNOOZE_MS))
  } catch (err) {
    console.error(`[Reminders] Failed to set storage snooze:${alarm.key}`, err)
  }
  void addEvent({ kind: 'reminder_dismissed', data: { reminderId: alarm.id, reason: 'snooze' } })
  void syncAllAlarmsToNative(langGetter())
  emit(null)
}

export async function dismissAlarm() {
  stopAlarmSound()
  emit(null)
}

function getStorageVal(key: string): string | null {
  try {
    return localStorage.getItem(key) || sessionStorage.getItem(key)
  } catch {
    return null
  }
}

export function startReminderEngine(getLang: () => Language) {
  langGetter = getLang
  if (timer) clearInterval(timer)
  const generation = ++engineGeneration
  completedAlarmKeys.clear()
  void syncAllAlarmsToNative(getLang())

  const tick = async () => {
    if (generation !== engineGeneration || tickInFlight) return
    tickInFlight = true
    try {
      if (current) return
      const now = Date.now()
      const nowObj = new Date(now)
      const dstr = dateStrOf(nowObj)
      const curHour = String(nowObj.getHours()).padStart(2, '0')
      const curMin = String(nowObj.getMinutes()).padStart(2, '0')

      // 1. Check Active Medicines
      const meds = (await getMeds()).filter((m) => m.active)
      if (generation !== engineGeneration) return
      const doneMeds = await loggedForDate(dstr)
      if (generation !== engineGeneration) return
      for (const med of meds) {
        for (const time of med.times) {
          const ts = schedTs(dstr, time)
          const key = `med:${med.id}|${ts}`
          if (now >= ts && now < ts + GRACE_MS) {
            const isLogged = doneMeds.has(`${med.id}|${dstr}|${time}`) || doneMeds.has(`${med.id}|${dstr}|${ts}`)
            if (!isLogged) {
              let snoozedUntil = 0
              let isDone = false
              try {
                snoozedUntil = parseInt(getStorageVal(`snooze:${key}`) ?? '0', 10)
                isDone = !!getStorageVal(`done:${key}`)
              } catch (err) {
                console.warn(`[Reminders] Failed to read storage for ${key}`, err)
              }
              if (!isDone && now >= snoozedUntil) {
                if (generation !== engineGeneration) return
                emit({
                  id: med.id,
                  key,
                  type: 'med',
                  title: med.name,
                  subtitle: `${med.dosage} · ${med.food === 'before' ? 'Before food' : med.food === 'after' ? 'After food' : 'Anytime'}`,
                  emoji: med.photo ? '💊' : '💊',
                  time,
                  details: {
                    medId: med.id,
                    dosage: med.dosage,
                    instructions: med.instructions,
                    photo: med.photo,
                    food: med.food,
                  },
                })
                return
              }
            }
          }
        }
      }

      // 2. Check Daily Reminders
      const dailyReminders = (await loadDailyReminders()).filter((r) => r.active ?? r.enabled ?? true)
      if (generation !== engineGeneration) return
      for (const reminder of dailyReminders) {
        const ts = schedTs(dstr, reminder.time)
        const key = `daily:${reminder.id}|${ts}`
        if (now >= ts && now < ts + GRACE_MS) {
          let snoozedUntil = 0
          let isDone = false
          try {
            snoozedUntil = parseInt(getStorageVal(`snooze:${key}`) ?? '0', 10)
            isDone = !!getStorageVal(`done:${key}`)
          } catch (err) {
            console.warn(`[Reminders] Failed to read storage for ${key}`, err)
          }
          if (!isDone && now >= snoozedUntil) {
            if (generation !== engineGeneration) return
            emit({
              id: reminder.id,
              key,
              type: 'daily',
              title: langGetter() === 'hi' && reminder.titleHi ? reminder.titleHi : reminder.title,
              subtitle: reminder.category,
              emoji: reminder.emoji || '💧',
              time: reminder.time,
            })
            return
          }
        }
      }

      // 3. Check Appointments
      const appointments = (await loadAppointments()).filter((a) => (a.active ?? a.enabled ?? true) && a.date === dstr)
      if (generation !== engineGeneration) return
      for (const appt of appointments) {
        const ts = schedTs(dstr, appt.time)
        const key = `appt:${appt.id}|${ts}`
        if (now >= ts && now < ts + GRACE_MS) {
          let snoozedUntil = 0
          let isDone = false
          try {
            snoozedUntil = parseInt(getStorageVal(`snooze:${key}`) ?? '0', 10)
            isDone = !!getStorageVal(`done:${key}`)
          } catch (err) {
            console.warn(`[Reminders] Failed to read storage for ${key}`, err)
          }
          if (!isDone && now >= snoozedUntil) {
            if (generation !== engineGeneration) return
            emit({
              id: appt.id,
              key,
              type: 'appointment',
              title: appt.title,
              subtitle: `${appt.doctorName}${appt.location ? ` · ${appt.location}` : ''}`,
              emoji: '🩺',
              time: appt.time,
              details: {
                doctorName: appt.doctorName,
                location: appt.location,
              },
            })
            return
          }
        }
      }

      // 4. Check Routine Events
      const prof = await loadProfile()
      if (generation !== engineGeneration) return
      if (prof?.routine) {
        const routineItems: { key: string; time: string; title: string; titleHi: string; emoji: string }[] = [
          { key: 'wake', time: prof.routine.wake || '06:00', title: 'Wake Up & Morning Care', titleHi: 'सुबह उठने और ताजगी का समय', emoji: '🌅' },
          { key: 'breakfast', time: prof.routine.breakfast || '08:00', title: 'Breakfast Time', titleHi: 'सुबह के नाश्ते का समय', emoji: '🥣' },
          { key: 'lunch', time: prof.routine.lunch || '13:00', title: 'Lunch Time', titleHi: 'दोपहर के भोजन का समय', emoji: '🍲' },
          { key: 'dinner', time: prof.routine.dinner || '20:00', title: 'Dinner Time', titleHi: 'रात के भोजन का समय', emoji: '🍽️' },
          { key: 'sleep', time: prof.routine.sleep || '21:30', title: 'Bedtime & Night Rest', titleHi: 'सोने और विश्राम का समय', emoji: '🌙' },
        ]

        for (const item of routineItems) {
          if (item.time) {
            const ts = schedTs(dstr, item.time)
            const key = `routine:${item.key}|${ts}`
            if (now >= ts && now < ts + GRACE_MS) {
              let snoozedUntil = 0
              let isDone = false
              try {
                snoozedUntil = parseInt(getStorageVal(`snooze:${key}`) ?? '0', 10)
                isDone = !!getStorageVal(`done:${key}`)
              } catch (err) {
                console.warn(`[Reminders] Failed to read storage for ${key}`, err)
              }
              if (!isDone && now >= snoozedUntil) {
                if (generation !== engineGeneration) return
                emit({
                  id: `routine-${item.key}`,
                  key,
                  type: 'routine',
                  title: langGetter() === 'hi' ? item.titleHi : item.title,
                  subtitle: 'Daily Routine',
                  emoji: item.emoji,
                  time: item.time,
                  details: { routineKey: item.key },
                })
                return
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('[Reminders] Engine tick failed uncaught error:', err)
    } finally {
      tickInFlight = false
    }
  }

  void tick()
  timer = setInterval(() => void tick(), 15000)
}

export function notifyOS(title: string, body: string) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`${title}`, { body, tag: 'smriti-reminder' })
    }
  } catch (err) {
    console.warn('[Reminders] Failed to send OS Notification', err)
  }
}
