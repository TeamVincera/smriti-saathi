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
  { id: 'rem-water', title: 'Drink water', description: 'Stay hydrated with a fresh glass of water', time: '09:00', enabled: true, category: 'hydration' },
  { id: 'rem-breakfast', title: 'Eat breakfast', description: 'Enjoy a nourishing morning meal', time: '08:00', enabled: true, category: 'meal' },
  { id: 'rem-walk', title: 'Go for a walk', description: 'A gentle walk in the fresh air', time: '10:30', enabled: true, category: 'activity' },
  { id: 'rem-rest', title: 'Take a rest', description: 'Relax quietly and rest your mind and body', time: '14:00', enabled: true, category: 'rest' },
  { id: 'rem-family', title: 'Call family', description: 'Spend a moment connecting with loved ones', time: '17:30', enabled: true, category: 'general' },
]

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
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
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        try {
          const t = db.transaction(store, mode)
          const req = fn(t.objectStore(store))
          req.onsuccess = () => resolve(req.result)
          req.onerror = () => {
            const e = req.error
            reject(new Error(`[db ${store} ${mode}] ${e?.name ?? 'Error'}: ${e?.message ?? 'unknown'}`))
          }
          t.onabort = () => {
            const e = t.error
            reject(new Error(`[db ${store} aborted] ${e?.name ?? 'Error'}: ${e?.message ?? 'unknown'}`))
          }
        } catch (err) {
          const e = err as Error
          reject(new Error(`[db ${store} ${mode}] ${e?.name ?? 'Error'}: ${e?.message ?? 'failed'}`))
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
    if (!p || !p.patient?.name || !p.language) return null
    if (!p.onboarded) return p
    return p
  } catch {
    return null
  }
}

export const saveProfile = (p: Profile) => dbSet('kv', p, 'profile')

export async function loadConfig(): Promise<ClinicalConfig> {
  try {
    const c = await dbGet<ClinicalConfig>('kv', 'config')
    return c ?? DEFAULT_CONFIG
  } catch {
    return DEFAULT_CONFIG
  }
}
export const saveConfig = (c: ClinicalConfig) => dbSet('kv', c, 'config')

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
    const list = await dbAll<DailyReminder>('daily_reminders')
    if (list && list.length > 0) return list
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
    return (await dbAll<AppointmentReminder>('appointments')) ?? []
  } catch {
    return []
  }
}
export const saveAppointment = (a: AppointmentReminder) => dbSet('appointments', a, a.id)
export const deleteAppointment = (id: string) => dbDel('appointments', id)

export const addEvent = (e: Omit<LedgerEvent, 'ts'> & { ts?: number }) =>
  dbAdd('events', { ts: e.ts ?? Date.now(), kind: e.kind, gameId: e.gameId, data: e.data }).catch(() => {})

export const addSession = (s: SessionRecord) => dbSet('sessions', s, s.id)
export const getSessions = () => dbAll<SessionRecord>('sessions')

export const saveMed = (m: Med) => dbSet('meds', m, m.id)
export const deleteMed = (id: string) => dbDel('meds', id)
export const getMeds = () => dbAll<Med>('meds')

export const addMedLog = (e: Omit<MedLogEntry, 'ts'> & { ts?: number }) =>
  dbAdd('medlog', { ts: e.ts ?? Date.now(), ...e })
export const getMedLog = () => dbAll<MedLogEntry>('medlog')

export const addAlert = (a: AppAlert) => dbSet('kv', a, `alert:${a.id}`)
export const getAlerts = (): Promise<AppAlert[]> =>
  openDb().then(
    (db) =>
      new Promise<AppAlert[]>((resolve, reject) => {
        const t = db.transaction('kv', 'readonly')
        const req = t.objectStore('kv').getAll()
        req.onsuccess = () => resolve((req.result as AppAlert[]).filter((v) => v && typeof v === 'object' && 'severity' in v && 'titleKey' in v))
        req.onerror = () => reject(req.error)
      })
  )

export const wipeAll = () =>
  openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const names = ['kv', 'events', 'sessions', 'meds', 'medlog', 'daily_reminders', 'appointments']
        const t = db.transaction(names, 'readwrite')
        names.forEach((n) => t.objectStore(n).clear())
        t.oncomplete = () => resolve()
        t.onerror = () => reject(t.error)
      })
  )

