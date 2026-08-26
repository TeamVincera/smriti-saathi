import type { Med } from './types'
import { getMeds, getMedLog, addMedLog, addEvent } from './db'
import { speak, listenOnce } from './speech'
import { playInstrument } from './audio'
import type { Language } from './types'

export interface DueDose {
  med: Med
  time: string
  key: string
}

type Listener = (dose: DueDose | null) => void

const GRACE_MS = 30 * 60 * 1000
const SNOOZE_MS = 10 * 60 * 1000

const listeners = new Set<Listener>()
let current: DueDose | null = null
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

function emit(dose: DueDose | null) {
  current = dose
  listeners.forEach((l) => l(dose))
}

async function loggedSince(): Promise<Set<string>> {
  const entries = await getMedLog()
  const now = Date.now()
  const set = new Set<string>()
  for (const e of entries) {
    if (now - e.ts < 48 * 3600 * 1000) set.add(`${e.medId}|${e.scheduledFor}`)
  }
  return set
}

async function logDose(med: Med, scheduledFor: string, status: 'taken' | 'missed' | 'skipped', method?: 'tap' | 'voice') {
  await addMedLog({ medId: med.id, medName: med.name, scheduledFor, ts: Date.now(), status, method })
}

export async function confirmTaken(med: Med, scheduledFor: string, method: 'tap' | 'voice') {
  await logDose(med, scheduledFor, 'taken', method)
  void addEvent({ kind: 'med_taken', data: { medId: med.id, method } })
  emit(null)
}

export async function snoozeDose(dose: DueDose) {
  try {
    sessionStorage.setItem(`snooze:${dose.key}`, String(Date.now() + SNOOZE_MS))
  } catch {}
  emit(null)
}

async function markMissedIfNeeded(meds: Med[], dateStr: string): Promise<void> {
  const done = await loggedSince()
  const now = Date.now()
  for (const med of meds) {
    for (const time of med.times) {
      const ts = schedTs(dateStr, time)
      if (now > ts + GRACE_MS && now < ts + GRACE_MS * 8) {
        const key = `${med.id}|${ts}`
        if (!done.has(key)) {
          await logDose(med, String(ts), 'missed')
          void addEvent({ kind: 'med_logged', data: { medId: med.id, status: 'missed' } })
          void addEvent({ kind: 'alert_raised', data: { type: 'missed_dose', med: med.name, time } })
        }
      }
    }
  }
}

let hydrationLast = 0

async function hydrationReminder(now: number) {
  if (!localStorage.getItem('ss_hydration')) return
  if (now - hydrationLast < 3 * 3600 * 1000) return
  const hour = new Date(now).getHours()
  if (hour < 7 || hour > 20) return
  hydrationLast = now
  void addEvent({ kind: 'reminder_fired', data: { kind: 'hydration' } })
  playInstrument('bell')
  void speak('It is a good moment to drink some water.', langGetter())
}

export function startReminderEngine(getLang: () => Language) {
  langGetter = getLang
  if (timer) clearInterval(timer)
  const tick = async () => {
    try {
      if (current) return
      const meds = (await getMeds()).filter((m) => m.active)
      const now = Date.now()
      const dstr = dateStrOf(new Date(now))

      for (const med of meds) {
        for (const time of med.times) {
          const ts = schedTs(dstr, time)
          const key = `${med.id}|${ts}`
          if (now >= ts && now < ts + GRACE_MS) {
            const done = await loggedSince()
            if (!done.has(key)) {
              let snoozedUntil = 0
              try {
                snoozedUntil = parseInt(sessionStorage.getItem(`snooze:${key}`) ?? '0', 10)
              } catch {}
              if (now >= snoozedUntil) {
                emit({ med, time, key })
                playInstrument('bell')
                const text =
                  langGetter() === 'hi'
                    ? `आपकी ${med.name} लेने का समय हो गया।`
                    : `Time for your ${med.name}.`
                void speak(text, langGetter())
                notifyOS(med.name, text)
                return
              }
            }
          }
        }
      }

      await markMissedIfNeeded(meds, dstr)
      await hydrationReminder(now)
    } catch {}
  }
  void tick()
  timer = setInterval(() => void tick(), 20000)
}

export function notifyOS(title: string, body: string) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`${title}`, { body, tag: 'smriti-reminder' })
    }
  } catch {}
}

export async function voiceConfirmYes(lang: Language): Promise<boolean> {
  const heard = await listenOnce(lang)
  if (!heard) return false
  const h = heard.toLowerCase()
  const yesWords = ['yes', 'haan', 'han', 'hoi', 'hu', 'oi', 'हाँ', 'हां', 'য়েছ', 'হই']
  return yesWords.some((w) => h.includes(w))
}
