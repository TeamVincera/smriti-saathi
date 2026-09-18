import type {
  Profile, Med, MedLogEntry, SessionRecord, LedgerEvent,
  ArmState, SrtItem, ClinicalConfig, AppAlert,
  DailyReminder, AppointmentReminder,
} from './types'
import { DEFAULT_CONFIG } from './types'

const DB_NAME = 'smriti-sathi'
const DB_VERSION = 2

let dbPromise: Promise<IDBDatabase> | null = null

export const DEFAULT_DAILY_REMINDERS: DailyReminder[] = [
  { id: 'rem-water', title: 'Drink water', titleHi: 'ताज़ा पानी पिएं', description: 'Stay hydrated with a fresh glass of water', time: '09:00', enabled: true, active: true, emoji: '💧', category: 'hydration' },
  { id: 'rem-breakfast', title: 'Eat breakfast', titleHi: 'सुबह का नाश्ता करें', description: 'Enjoy a nourishing morning meal', time: '08:00', enabled: true, active: true, emoji: '🥣', category: 'meal' },
  { id: 'rem-walk', title: 'Go for a walk', titleHi: 'हल्की सैर पर जाएं', description: 'A gentle walk in the fresh air', time: '10:30', enabled: true, active: true, emoji: '🚶', category: 'activity' },
  { id: 'rem-rest', title: 'Take a rest', titleHi: 'दोपहर का विश्राम करें', description: 'Relax quietly and rest your mind and body', time: '14:00', enabled: true, active: true, emoji: '🛏️', category: 'rest' },
  { id: 'rem-family', title: 'Call family', titleHi: 'परिवार से बात करें', description: 'Spend a moment connecting with loved ones', time: '17:30', enabled: true, active: true, emoji: '📞', category: 'general' },
]

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  let cached: Promise<IDBDatabase>
  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv')
      if (!db.objectStoreNames.contains('events')) {
        const s = db.createObjectStore('events', { autoIncrement: true })
        s.createIndex('ts', 'ts')
        s.createIndex('kind', 'kind')
      }
      if (!db.objectStoreNames.contains('sessions')) db.createObjectStore('sessions', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('meds')) db.createObjectStore('meds', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('medlog')) {
        const s = db.createObjectStore('medlog', { autoIncrement: true })
        s.createIndex('ts', 'ts')
        s.createIndex('medId', 'medId')
      }
      if (!db.objectStoreNames.contains('daily_reminders')) db.createObjectStore('daily_reminders', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('appointments')) db.createObjectStore('appointments', { keyPath: 'id' })
    }
    req.onsuccess = () => {
      const db = req.result
      // A version change or an externally closed connection must not leave a
      // permanently-resolved, unusable handle in the module cache. The next
      // operation can safely open a fresh connection.
      db.onversionchange = () => {
        db.close()
        if (dbPromise === cached) dbPromise = null
      }
      db.onclose = () => {
        if (dbPromise === cached) dbPromise = null
      }
      resolve(db)
    }
    req.onerror = () => reject(req.error)
  })
  cached = opening.catch((error) => {
    if (dbPromise === cached) dbPromise = null
    throw error
  })
  dbPromise = cached
  return dbPromise
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        let result: T
        let requestFailed = false
        let settled = false
        const fail = (error: unknown, phase: string) => {
          if (settled) return
          settled = true
          const e = error as Error | null | undefined
          reject(new Error(`[db ${store} ${phase}] ${e?.name ?? 'Error'}: ${e?.message ?? 'unknown'}`))
        }

        try {
          const t = db.transaction(store, mode)
          const req = fn(t.objectStore(store))
          // IndexedDB request success only means that the request completed. A
          // later request in the same transaction can still abort the write,
          // so don't resolve callers until the transaction itself commits.
          req.onsuccess = () => {
            result = req.result
          }
          req.onerror = () => {
            requestFailed = true
            fail(req.error, mode)
          }
          t.oncomplete = () => {
            if (!settled && !requestFailed) {
              settled = true
              resolve(result)
            }
          }
          t.onerror = () => fail(t.error, 'transaction')
          t.onabort = () => fail(t.error, 'aborted')
        } catch (err) {
          fail(err, mode)
        }
      })
  )
}

export const dbGet = <T>(store: string, key: IDBValidKey) => tx<T>(store, 'readonly', (s) => s.get(key) as IDBRequest<T>)
export const dbSet = (store: string, value: unknown, key?: IDBValidKey) =>
  tx(store, 'readwrite', (s) => {
    if (s.keyPath === null && key !== undefined) return s.put(value, key) as IDBRequest<IDBValidKey>
    return s.put(value) as IDBRequest<IDBValidKey>
  })
export const dbDel = (store: string, key: IDBValidKey) => tx(store, 'readwrite', (s) => s.delete(key))
export const dbAll = <T>(store: string) => tx<T[]>(store, 'readonly', (s) => s.getAll() as IDBRequest<T[]>)
export const dbAdd = (store: string, value: unknown) =>
  tx(store, 'readwrite', (s) => s.add(value) as unknown as IDBRequest<IDBValidKey>)

export async function loadProfile(): Promise<Profile | null> {
  try {
    const p = await dbGet<Profile>('kv', 'profile')
    if (!p || typeof p.patient?.name !== 'string' || !p.patient.name.trim()
      || !['as', 'bn', 'brx', 'mni', 'hi', 'en'].includes(p.language)) return null
    if (!p.onboarded) return p
    return p
  } catch {
    return null
  }
}

export const saveProfile = (p: Profile) => dbSet('kv', p, 'profile')

function asFiniteNumber(value: unknown, fallback: number, predicate?: (value: number) => boolean): number {
  const candidate = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() !== ''
      ? Number(value)
      : NaN
  return Number.isFinite(candidate) && (!predicate || predicate(candidate)) ? candidate : fallback
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Reconcile config values stored by older app versions or by a partial
 * settings write. IndexedDB has no schema migration for values in `kv`, so a
 * typed return value alone is not enough: runtime data can still omit nested
 * fields such as `weights`.
 */
export function normalizeClinicalConfig(raw: unknown): ClinicalConfig {
  const source = isRecord(raw) ? raw : {}
  const sourceWeights = isRecord(source.weights) ? source.weights : {}

  return {
    // Keep unknown future settings while guaranteeing every current setting
    // has a valid value. The nested merge is intentional: spreading a partial
    // `weights` object over DEFAULT_CONFIG would otherwise erase its siblings.
    ...source,
    weights: {
      completion: asFiniteNumber(sourceWeights.completion, DEFAULT_CONFIG.weights.completion, (value) => value >= 0),
      accuracy: asFiniteNumber(sourceWeights.accuracy, DEFAULT_CONFIG.weights.accuracy, (value) => value >= 0),
      hesitation: asFiniteNumber(sourceWeights.hesitation, DEFAULT_CONFIG.weights.hesitation, (value) => value >= 0),
      frustration: asFiniteNumber(sourceWeights.frustration, DEFAULT_CONFIG.weights.frustration, (value) => value >= 0),
    },
    alpha: asFiniteNumber(source.alpha, DEFAULT_CONFIG.alpha, (value) => value >= 0),
    maxSessionsPerDay: Math.max(1, Math.floor(asFiniteNumber(source.maxSessionsPerDay, DEFAULT_CONFIG.maxSessionsPerDay, (value) => value > 0))),
    gracePeriodMin: asFiniteNumber(source.gracePeriodMin, DEFAULT_CONFIG.gracePeriodMin, (value) => value >= 0),
    theme: source.theme === 'dark' || source.theme === 'light' ? source.theme : DEFAULT_CONFIG.theme,
  } as ClinicalConfig
}

function isClockTime(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) return false
  const [hour, minute] = value.split(':').map(Number)
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59
}

function isCivilDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

function normalizeMed(raw: unknown): Med | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || !raw.id
    || typeof raw.name !== 'string' || !raw.name.trim()
    || typeof raw.dosage !== 'string' || !Array.isArray(raw.times)) return null
  const form = ['tablet', 'capsule', 'syrup', 'drops', 'injection', 'ointment', 'other'].includes(String(raw.form))
    ? raw.form as Med['form']
    : 'other'
  const times = raw.times.filter(isClockTime)
  if (times.length === 0) return null
  return {
    id: raw.id,
    name: raw.name,
    photo: typeof raw.photo === 'string' ? raw.photo : undefined,
    form,
    dosage: raw.dosage,
    times,
    food: raw.food === 'before' || raw.food === 'after' ? raw.food : 'none',
    instructions: typeof raw.instructions === 'string' ? raw.instructions : undefined,
    durationDays: Number.isFinite(Number(raw.durationDays)) ? Number(raw.durationDays) : undefined,
    stock: Number.isFinite(Number(raw.stock)) ? Number(raw.stock) : undefined,
    active: typeof raw.active === 'boolean' ? raw.active : true,
  }
}

function normalizeDailyReminder(raw: unknown): DailyReminder | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || !raw.id
    || typeof raw.title !== 'string' || !raw.title.trim() || !isClockTime(raw.time)) return null
  return {
    id: raw.id,
    title: raw.title,
    titleHi: typeof raw.titleHi === 'string' ? raw.titleHi : undefined,
    description: typeof raw.description === 'string' ? raw.description : undefined,
    time: raw.time,
    emoji: typeof raw.emoji === 'string' ? raw.emoji : undefined,
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : undefined,
    active: typeof raw.active === 'boolean' ? raw.active : typeof raw.enabled === 'boolean' ? raw.enabled : true,
    days: Array.isArray(raw.days) ? raw.days.filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6) : undefined,
    category: typeof raw.category === 'string' ? raw.category : undefined,
  }
}

function normalizeAppointment(raw: unknown): AppointmentReminder | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || !raw.id
    || typeof raw.title !== 'string' || !raw.title.trim()
    || !isCivilDate(raw.date) || !isClockTime(raw.time)) return null
  return {
    id: raw.id,
    title: raw.title,
    doctorName: typeof raw.doctorName === 'string' ? raw.doctorName : undefined,
    date: raw.date,
    time: raw.time,
    location: typeof raw.location === 'string' ? raw.location : undefined,
    notes: typeof raw.notes === 'string' ? raw.notes : undefined,
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : undefined,
    active: typeof raw.active === 'boolean' ? raw.active : typeof raw.enabled === 'boolean' ? raw.enabled : true,
  }
}

function isNormalizedClinicalConfig(raw: unknown, normalized: ClinicalConfig): boolean {
  if (!isRecord(raw) || !isRecord(raw.weights)) return false
  return raw.alpha === normalized.alpha
    && raw.maxSessionsPerDay === normalized.maxSessionsPerDay
    && raw.gracePeriodMin === normalized.gracePeriodMin
    && raw.theme === normalized.theme
    && raw.weights.completion === normalized.weights.completion
    && raw.weights.accuracy === normalized.weights.accuracy
    && raw.weights.hesitation === normalized.weights.hesitation
    && raw.weights.frustration === normalized.weights.frustration
}

export async function loadConfig(): Promise<ClinicalConfig> {
  try {
    const raw = await dbGet<unknown>('kv', 'config')
    const normalized = normalizeClinicalConfig(raw)
    if (!isNormalizedClinicalConfig(raw, normalized)) {
      // A failed repair should not prevent the caller from using the safe
      // in-memory defaults; the next load can retry the idempotent repair.
      await dbSet('kv', normalized, 'config').catch(() => {})
    }
    return normalized
  } catch {
    return normalizeClinicalConfig(DEFAULT_CONFIG)
  }
}
export const saveConfig = (c: ClinicalConfig) => dbSet('kv', normalizeClinicalConfig(c), 'config')

export async function loadBandit(): Promise<Record<string, ArmState>> {
  try {
    return (await dbGet<Record<string, ArmState>>('kv', 'bandit')) ?? {}
  } catch {
    return {}
  }
}
export const saveBandit = (b: Record<string, ArmState>) => dbSet('kv', b, 'bandit')

export async function loadSrt(): Promise<Record<string, SrtItem>> {
  try {
    return (await dbGet<Record<string, SrtItem>>('kv', 'srt')) ?? {}
  } catch {
    return {}
  }
}
export const saveSrt = (s: Record<string, SrtItem>) => dbSet('kv', s, 'srt')

export async function loadDailyReminders(): Promise<DailyReminder[]> {
  try {
    const list = await dbAll<unknown>('daily_reminders')
    const valid = list.map(normalizeDailyReminder).filter((item): item is DailyReminder => item !== null)
    if (valid.length > 0) {
      return valid
    }
    // Initialize defaults if empty
    for (const item of DEFAULT_DAILY_REMINDERS) {
      await dbSet('daily_reminders', item, item.id)
    }
    return DEFAULT_DAILY_REMINDERS
  } catch {
    return DEFAULT_DAILY_REMINDERS
  }
}
export const saveDailyReminder = (r: DailyReminder) => dbSet('daily_reminders', r, r.id)
export const deleteDailyReminder = (id: string) => dbDel('daily_reminders', id)

export async function loadAppointments(): Promise<AppointmentReminder[]> {
  try {
    const list = await dbAll<unknown>('appointments')
    return list.map(normalizeAppointment).filter((item): item is AppointmentReminder => item !== null)
  } catch {
    return []
  }
}
export const saveAppointment = (a: AppointmentReminder) => dbSet('appointments', a, a.id)
export const deleteAppointment = (id: string) => dbDel('appointments', id)

export const addEvent = (e: Omit<LedgerEvent, 'ts'> & { ts?: number }) =>
  dbAdd('events', { ts: e.ts ?? Date.now(), kind: e.kind, gameId: e.gameId, data: e.data }).catch(() => {})

export const addSession = (s: SessionRecord) => dbSet('sessions', s, s.id)
export const getSessions = async (): Promise<SessionRecord[]> => {
  try {
    const list = await dbAll<unknown>('sessions')
    return list.filter((raw): raw is SessionRecord => {
      if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.gameId !== 'string' || typeof raw.gameName !== 'string') return false
      return [raw.startedAt, raw.endedAt, raw.completion, raw.accuracy, raw.avgLatencyMs, raw.hesitations, raw.cuesUsed, raw.frustrationIndex, raw.reward]
        .every((value) => typeof value === 'number' && Number.isFinite(value))
    })
  } catch {
    return []
  }
}

export const saveMed = (m: Med) => dbSet('meds', m, m.id)
export const deleteMed = (id: string) => dbDel('meds', id)
export const getMeds = async (): Promise<Med[]> => {
  try {
    const list = await dbAll<unknown>('meds')
    return list.map(normalizeMed).filter((item): item is Med => item !== null)
  } catch {
    return []
  }
}

function localDateKey(ts: number): string {
  const date = new Date(ts)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/**
 * Add a medication log once per local calendar date and scheduled occurrence.
 *
 * The read and write happen in one readwrite transaction, so a native
 * notification action racing an in-app confirmation cannot create two logs.
 * `undefined` means the occurrence was already logged.
 */
export const addMedLog = (e: Omit<MedLogEntry, 'ts'> & { ts?: number }): Promise<IDBValidKey | undefined> => {
  const entry = { ...e, ts: e.ts ?? Date.now() }
  return openDb().then(
    (db) =>
      new Promise<IDBValidKey | undefined>((resolve, reject) => {
        let settled = false
        let existing = false
        const fail = (error: unknown, phase: string) => {
          if (settled) return
          settled = true
          const err = error as Error | null | undefined
          reject(new Error(`[db medlog ${phase}] ${err?.name ?? 'Error'}: ${err?.message ?? 'unknown'}`))
        }

        try {
          const t = db.transaction('medlog', 'readwrite')
          const store = t.objectStore('medlog')
          const request = store.index('medId').getAll(entry.medId)
          let key: IDBValidKey | undefined

          request.onsuccess = () => {
            const date = localDateKey(entry.ts)
            const match = (request.result as MedLogEntry[]).find(
              (log) => log.status === 'taken'
                && localDateKey(log.ts) === date
                && log.scheduledFor === entry.scheduledFor
            )
            if (match) {
              existing = true
              return
            }

            const addRequest = store.add(entry)
            addRequest.onsuccess = () => {
              key = addRequest.result
            }
            addRequest.onerror = () => fail(addRequest.error, 'write')
          }
          request.onerror = () => fail(request.error, 'read')
          t.oncomplete = () => {
            if (settled) return
            settled = true
            resolve(existing ? undefined : key)
          }
          t.onerror = () => fail(t.error, 'transaction')
          t.onabort = () => fail(t.error, 'aborted')
        } catch (err) {
          fail(err, 'write')
        }
      })
  )
}
export const getMedLog = async (): Promise<MedLogEntry[]> => {
  try {
    const list = await dbAll<unknown>('medlog')
    return list.filter((raw): raw is MedLogEntry => {
      if (!isRecord(raw) || typeof raw.medId !== 'string' || typeof raw.medName !== 'string'
        || typeof raw.scheduledFor !== 'string' || typeof raw.ts !== 'number' || !Number.isFinite(raw.ts)) return false
      return raw.status === 'taken' || raw.status === 'missed' || raw.status === 'skipped'
    })
  } catch {
    return []
  }
}

export const addAlert = (a: AppAlert) => dbSet('kv', a, `alert:${a.id}`)
export const getAlerts = async (): Promise<AppAlert[]> => {
  try {
    const values = await dbAll<unknown>('kv')
    return values.filter((v): v is AppAlert =>
      isRecord(v)
      && typeof v.id === 'string'
      && Number.isFinite(v.ts)
      && (v.severity === 'info' || v.severity === 'watch' || v.severity === 'urgent')
      && typeof v.titleKey === 'string'
      && typeof v.detail === 'string'
    )
  } catch {
    return []
  }
}

export const wipeAll = () =>
  openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const names = ['kv', 'events', 'sessions', 'meds', 'medlog', 'daily_reminders', 'appointments']
        const t = db.transaction(names, 'readwrite')
        names.forEach((n) => t.objectStore(n).clear())
        t.oncomplete = () => resolve()
        t.onerror = () => reject(t.error)
        t.onabort = () => reject(t.error ?? new Error('IndexedDB wipe transaction aborted'))
      })
  )
