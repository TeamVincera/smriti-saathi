import type { Med, DailyReminder, AppointmentReminder, Language } from './types'
import {
  getMeds, getMedLog, addMedLog, addEvent, loadDailyReminders, loadAppointments, loadProfile,
} from './db'
import { startAlarmSound, stopAlarmSound } from './audio'

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

function dateStrOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function schedTs(dateStr: string, time: string): number {
  const [y, mo, dd] = dateStr.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  return new Date(y, mo - 1, dd, h, mi, 0, 0).getTime()
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

async function loggedSince(): Promise<Set<string>> {
  const entries = await getMedLog()
  const now = Date.now()
  const set = new Set<string>()
  for (const e of entries) {
    if (now - e.ts < 24 * 3600 * 1000) set.add(`${e.medId}|${e.scheduledFor}`)
  }
  return set
}

export async function confirmTaken(med: Med, scheduledFor: string, method: 'tap' | 'slide' = 'tap') {
  await addMedLog({
    medId: med.id,
    medName: med.name,
    scheduledFor,
    ts: Date.now(),
    status: 'taken',
    method,
  })
  void addEvent({ kind: 'med_taken', data: { medId: med.id, method } })
}

export async function confirmAlarm(alarm: ActiveAlarm, method: 'slide' | 'tap' = 'slide') {
  stopAlarmSound()
  if (alarm.type === 'med' && alarm.details?.medId) {
    await addMedLog({
      medId: alarm.details.medId,
      medName: alarm.title,
      scheduledFor: alarm.time,
      ts: Date.now(),
      status: 'taken',
      method,
    })
    void addEvent({ kind: 'med_taken', data: { medId: alarm.details.medId, method } })
  } else {
    void addEvent({ kind: 'reminder_completed', data: { reminderId: alarm.id, type: alarm.type, method } })
  }
  try {
    sessionStorage.setItem(`done:${alarm.key}`, String(Date.now()))
  } catch {}
  emit(null)
}

export async function snoozeAlarm(alarm: ActiveAlarm) {
  stopAlarmSound()
  try {
    sessionStorage.setItem(`snooze:${alarm.key}`, String(Date.now() + SNOOZE_MS))
  } catch {}
  void addEvent({ kind: 'reminder_dismissed', data: { reminderId: alarm.id, reason: 'snooze' } })
  emit(null)
}

export async function dismissAlarm() {
  stopAlarmSound()
  emit(null)
}

export function startReminderEngine(getLang: () => Language) {
  langGetter = getLang
  if (timer) clearInterval(timer)

  const tick = async () => {
    try {
      if (current) return
      const now = Date.now()
      const nowObj = new Date(now)
      const dstr = dateStrOf(nowObj)
      const curHour = String(nowObj.getHours()).padStart(2, '0')
      const curMin = String(nowObj.getMinutes()).padStart(2, '0')
      const curTime = `${curHour}:${curMin}`

      // 1. Check Active Medicines
      const meds = (await getMeds()).filter((m) => m.active)
      const doneMeds = await loggedSince()
      for (const med of meds) {
        for (const time of med.times) {
          const ts = schedTs(dstr, time)
          const key = `med:${med.id}|${ts}`
          if (now >= ts && now < ts + GRACE_MS) {
            const isLogged = doneMeds.has(`${med.id}|${time}`) || doneMeds.has(`${med.id}|${ts}`)
            if (!isLogged) {
              let snoozedUntil = 0
              let isDone = false
              try {
                snoozedUntil = parseInt(sessionStorage.getItem(`snooze:${key}`) ?? '0', 10)
                isDone = !!sessionStorage.getItem(`done:${key}`)
              } catch {}
              if (!isDone && now >= snoozedUntil) {
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
      const dailyReminders = (await loadDailyReminders()).filter((r) => r.active)
      for (const reminder of dailyReminders) {
        const ts = schedTs(dstr, reminder.time)
        const key = `daily:${reminder.id}|${ts}`
        if (now >= ts && now < ts + GRACE_MS) {
          let snoozedUntil = 0
          let isDone = false
          try {
            snoozedUntil = parseInt(sessionStorage.getItem(`snooze:${key}`) ?? '0', 10)
            isDone = !!sessionStorage.getItem(`done:${key}`)
          } catch {}
          if (!isDone && now >= snoozedUntil) {
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
      const appointments = (await loadAppointments()).filter((a) => a.active && a.date === dstr)
      for (const appt of appointments) {
        const ts = schedTs(dstr, appt.time)
        const key = `appt:${appt.id}|${ts}`
        if (now >= ts && now < ts + GRACE_MS) {
          let snoozedUntil = 0
          let isDone = false
          try {
            snoozedUntil = parseInt(sessionStorage.getItem(`snooze:${key}`) ?? '0', 10)
            isDone = !!sessionStorage.getItem(`done:${key}`)
          } catch {}
          if (!isDone && now >= snoozedUntil) {
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
                snoozedUntil = parseInt(sessionStorage.getItem(`snooze:${key}`) ?? '0', 10)
                isDone = !!sessionStorage.getItem(`done:${key}`)
              } catch {}
              if (!isDone && now >= snoozedUntil) {
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
    } catch {}
  }

  void tick()
  timer = setInterval(() => void tick(), 15000)
}

export function notifyOS(title: string, body: string) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`${title}`, { body, tag: 'smriti-reminder' })
    }
  } catch {}
}
