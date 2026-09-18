import type { AppointmentReminder, DailyReminder, Med, MedLogEntry } from './types'

export type DailyPlanKind = 'medicine' | 'reminder' | 'appointment'

export interface DailyPlanItem {
  id: string
  kind: DailyPlanKind
  title: string
  time: string
  date: string
  emoji: string
  completed: boolean
}

export interface DailyPlanInput {
  meds: readonly Med[]
  dailyReminders: readonly DailyReminder[]
  appointments: readonly AppointmentReminder[]
  medlog: readonly MedLogEntry[]
  now?: Date
  maxItems?: number
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function minutesOf(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return Number.MAX_SAFE_INTEGER
  return hours * 60 + minutes
}

function activeFlag(item: { active?: boolean; enabled?: boolean }): boolean {
  return item.active ?? item.enabled ?? true
}

function withinNextWeek(date: string, today: string): boolean {
  const civilDay = (value: string): number | null => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
    if (!match) return null
    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    const candidate = new Date(year, month - 1, day)
    if (candidate.getFullYear() !== year || candidate.getMonth() !== month - 1 || candidate.getDate() !== day) return null
    return Date.UTC(year, month - 1, day) / 86_400_000
  }
  const start = civilDay(today)
  const candidate = civilDay(date)
  if (start === null || candidate === null) return false
  const days = candidate - start
  return days >= 0 && days <= 7
}

function medicineWasTaken(med: Med, time: string, today: string, medlog: readonly MedLogEntry[]): boolean {
  return medlog.some((entry) => {
    if (entry.medId !== med.id || entry.status !== 'taken') return false
    if (dateKey(new Date(entry.ts)) !== today) return false
    return entry.scheduledFor === time || entry.scheduledFor.endsWith(`|${time}`)
  })
}

/**
 * Builds a small, deterministic orientation list from data already on-device.
 * This module deliberately has no network or AI dependency; a future secure
 * enhancement can add an optional note in the card without changing the plan
 * source or exposing these records to a new service.
 */
export function buildDailyPlan({
  meds,
  dailyReminders,
  appointments,
  medlog,
  now = new Date(),
  maxItems = 6,
}: DailyPlanInput): DailyPlanItem[] {
  const today = dateKey(now)
  const weekday = now.getDay()
  const items: DailyPlanItem[] = []

  for (const med of meds) {
    if (!med.active) continue
    for (const time of med.times) {
      items.push({
        id: `med:${med.id}:${today}:${time}`,
        kind: 'medicine',
        title: med.name,
        time,
        date: today,
        emoji: med.photo ? '💊' : '🫶',
        completed: medicineWasTaken(med, time, today, medlog),
      })
    }
  }

  for (const reminder of dailyReminders) {
    if (!activeFlag(reminder)) continue
    if (reminder.days && reminder.days.length > 0 && !reminder.days.includes(weekday)) continue
    items.push({
      id: `reminder:${reminder.id}:${today}`,
      kind: 'reminder',
      title: reminder.title,
      time: reminder.time,
      date: today,
      emoji: reminder.emoji || '🔔',
      completed: false,
    })
  }

  const upcomingAppointment = appointments
    .filter((appointment) => activeFlag(appointment) && withinNextWeek(appointment.date, today))
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0]

  if (upcomingAppointment) {
    items.push({
      id: `appointment:${upcomingAppointment.id}:${upcomingAppointment.date}`,
      kind: 'appointment',
      title: upcomingAppointment.title,
      time: upcomingAppointment.time,
      date: upcomingAppointment.date,
      emoji: '🩺',
      completed: false,
    })
  }

  return items
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
    .slice(0, Math.max(0, maxItems))
}
