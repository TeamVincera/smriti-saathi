import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Language, Profile, Med, DailyReminder, AppointmentReminder, SessionRecord, ClinicalConfig, MedLogEntry } from './lib/types'
import {
  loadProfile, saveProfile as dbSaveProfile, getMeds, saveMed as dbSaveMed,
  deleteMed as dbDeleteMed, loadDailyReminders, saveDailyReminder, deleteDailyReminder,
  loadAppointments, saveAppointment, deleteAppointment, loadConfig, saveConfig,
  getSessions, addEvent, wipeAll, DEFAULT_DAILY_REMINDERS, getMedLog,
} from './lib/db'
import { AdaptiveQuestionEngine, ensureAbilities } from './lib/adaptive'
import { translate } from './i18n'
import { cancelAllAlarmsToNative, syncAllAlarmsToNative } from './lib/alarmService'
import { useReticleStore } from '@reticlehq/react/store'

interface AppState {
  ready: boolean
  profile: Profile | null
  meds: Med[]
  dailyReminders: DailyReminder[]
  appointments: AppointmentReminder[]
  dailyGameLimit: number
  sessions: SessionRecord[]
  medlog: MedLogEntry[]
  t: (key: string, vars?: Record<string, string | number>) => string
  lang: Language
  setProfile: (p: Profile) => Promise<void>
  updateProfile: (patch: Partial<Profile>) => Promise<void>
  upsertMed: (m: Med) => Promise<void>
  removeMed: (id: string) => Promise<void>
  upsertDailyReminder: (r: DailyReminder) => Promise<void>
  removeDailyReminder: (id: string) => Promise<void>
  upsertAppointment: (a: AppointmentReminder) => Promise<void>
  removeAppointment: (id: string) => Promise<void>
  setDailyGameLimit: (limit: number) => Promise<void>
  updateDailyGameLimit: (limit: number) => Promise<void>
  refreshSessions: () => Promise<void>
  refreshMedLog: () => Promise<void>
  resetAllData: () => Promise<void>
  sessionsToday: number
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => Promise<void>
}

const Ctx = createContext<AppState | null>(null)

async function syncAlarmsSafely(language: Language): Promise<void> {
  try {
    await syncAllAlarmsToNative(language)
  } catch (error) {
    // Local IndexedDB state remains authoritative when native plugins are not
    // available (web, denied permission, or a transient bridge failure).
    console.warn('[App] Native reminder sync unavailable', error)
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [profile, setProfileState] = useState<Profile | null>(null)
  const profileRef = useRef<Profile | null>(null)
  // All local writes share one tail. This makes reset a real barrier: a
  // write already in flight cannot repopulate IndexedDB after a clear.
  const mutationTail = useRef<Promise<void>>(Promise.resolve())
  const [meds, setMeds] = useState<Med[]>([])
  const [dailyReminders, setDailyReminders] = useState<DailyReminder[]>([])
  const [appointments, setAppointments] = useState<AppointmentReminder[]>([])
  const [dailyGameLimit, setDailyGameLimitState] = useState(3)
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const [medlog, setMedlog] = useState<MedLogEntry[]>([])
  const [theme, setThemeState] = useState<'light' | 'dark'>('light')

  // Apply the active theme to <html> and the browser chrome color
  const applyTheme = useCallback((t: 'light' | 'dark') => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', t)
      const meta = document.querySelector('meta[name="theme-color"]')
      if (meta) meta.setAttribute('content', t === 'dark' ? '#10161F' : '#FBF8F2')
    }
  }, [])

  const enqueueMutation = useCallback(<T,>(operation: () => Promise<T>): Promise<T> => {
    const run = mutationTail.current.then(operation)
    mutationTail.current = run.then(() => undefined, () => undefined)
    return run
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const results = await Promise.allSettled([
        loadProfile(),
        getMeds(),
        loadDailyReminders(),
        loadAppointments(),
        loadConfig(),
        getSessions(),
        getMedLog(),
      ])
      const valueOr = <T,>(result: PromiseSettledResult<T>, fallback: T): T =>
        result.status === 'fulfilled' ? result.value : fallback
      const [pResult, medsResult, remindersResult, appointmentsResult, configResult, sessionsResult, medlogResult] = results
      const p = valueOr(pResult, null)
      const m = valueOr(medsResult, [])
      const r = valueOr(remindersResult, DEFAULT_DAILY_REMINDERS)
      const a = valueOr(appointmentsResult, [])
      const cfg = valueOr(configResult, { maxSessionsPerDay: 3, theme: 'light' } as ClinicalConfig)
      const s = valueOr(sessionsResult, [])
      const ml = valueOr(medlogResult, [])
      if (!mounted) return
      if (p) {
        profileRef.current = p
        setProfileState(p)
      }
      setMeds([...m].sort((x, y) => x.name.localeCompare(y.name)))
      setDailyReminders(r)
      setAppointments(a)
      setDailyGameLimitState(cfg.maxSessionsPerDay ?? 3)
      const savedTheme: 'light' | 'dark' = cfg.theme === 'dark' ? 'dark' : 'light'
      setThemeState(savedTheme)
      applyTheme(savedTheme)
      setSessions([...s].sort((x, y) => x.startedAt - y.startedAt))
      setMedlog(ml || [])
      try {
        await ensureAbilities()
      } catch (error) {
        // Adaptive state is optional; corrupt or unavailable learning data
        // must not strand the whole app on its loading screen.
        console.warn('[App] Adaptive state unavailable; using safe defaults', error)
      }
      if (mounted) {
        setReady(true)
        void addEvent({ kind: 'app_open' })
      }
    })().catch((error) => {
      // Keep the readiness guarantee if a browser API throws outside a loader.
      console.error('[App] State initialization failed', error)
      if (mounted) setReady(true)
    }).finally(() => {
      if (mounted) setReady(true)
    })
    return () => {
      mounted = false
    }
  }, [applyTheme])

  const lang: Language = profile?.language ?? 'en'

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars),
    [lang]
  )

  const setProfile = useCallback((p: Profile) => enqueueMutation(async () => {
    await dbSaveProfile(p)
    profileRef.current = p
    setProfileState(p)
    await syncAlarmsSafely(p.language || lang)
  }), [enqueueMutation, lang])

  const updateProfile = useCallback((patch: Partial<Profile>) => enqueueMutation(async () => {
      const current = profileRef.current
      if (!current) throw new Error('Cannot update profile before it is loaded')
      const next: Profile = {
        ...current,
        ...patch,
        patient: { ...current.patient, ...(patch.patient || {}) },
        clinical: { ...current.clinical, ...(patch.clinical || {}) },
        cultural: { ...current.cultural, ...(patch.cultural || {}) },
        routine: { ...current.routine, ...(patch.routine || {}) },
        caregiver: { ...current.caregiver, ...(patch.caregiver || {}) },
      }
      await dbSaveProfile(next)
      profileRef.current = next
      setProfileState(next)
      await syncAlarmsSafely(next.language || lang)
  }), [enqueueMutation, lang])

  const upsertMed = useCallback((m: Med) => enqueueMutation(async () => {
    await dbSaveMed(m)
    setMeds((prev) => [...prev.filter((x) => x.id !== m.id), m].sort((a, b) => a.name.localeCompare(b.name)))
    await syncAlarmsSafely(lang)
  }), [enqueueMutation, lang])

  const removeMed = useCallback((id: string) => enqueueMutation(async () => {
    await dbDeleteMed(id)
    setMeds((prev) => prev.filter((m) => m.id !== id))
    await syncAlarmsSafely(lang)
  }), [enqueueMutation, lang])

  const upsertDailyReminder = useCallback((r: DailyReminder) => enqueueMutation(async () => {
    await saveDailyReminder(r)
    setDailyReminders((prev) => {
      const filtered = prev.filter((x) => x.id !== r.id)
      return [...filtered, r].sort((a, b) => a.time.localeCompare(b.time))
    })
    await syncAlarmsSafely(lang)
  }), [enqueueMutation, lang])

  const removeDailyReminder = useCallback((id: string) => enqueueMutation(async () => {
    await deleteDailyReminder(id)
    setDailyReminders((prev) => prev.filter((x) => x.id !== id))
    await syncAlarmsSafely(lang)
  }), [enqueueMutation, lang])

  const upsertAppointment = useCallback((a: AppointmentReminder) => enqueueMutation(async () => {
    await saveAppointment(a)
    setAppointments((prev) => {
      const filtered = prev.filter((x) => x.id !== a.id)
      return [...filtered, a].sort((x, y) => `${x.date} ${x.time}`.localeCompare(`${y.date} ${y.time}`))
    })
    await syncAlarmsSafely(lang)
  }), [enqueueMutation, lang])

  const removeAppointment = useCallback((id: string) => enqueueMutation(async () => {
    await deleteAppointment(id)
    setAppointments((prev) => prev.filter((x) => x.id !== id))
    await syncAlarmsSafely(lang)
  }), [enqueueMutation, lang])

  const setDailyGameLimit = useCallback((limit: number) => enqueueMutation(async () => {
    const clamped = Math.max(1, Math.min(10, limit))
    const cfg = await loadConfig()
    await saveConfig({ ...cfg, maxSessionsPerDay: clamped })
    setDailyGameLimitState(clamped)
  }), [enqueueMutation])

  const refreshSessions = useCallback(() => enqueueMutation(async () => {
    const s = await getSessions()
    setSessions([...s].sort((a, b) => a.startedAt - b.startedAt))
  }), [enqueueMutation])

  const refreshMedLog = useCallback(() => enqueueMutation(async () => {
    const ml = await getMedLog()
    setMedlog(ml || [])
  }), [enqueueMutation])

  const setTheme = useCallback(
    (t: 'light' | 'dark') => enqueueMutation(async () => {
      const cfg = await loadConfig()
      await saveConfig({ ...cfg, theme: t })
      setThemeState(t)
      applyTheme(t)
      try {
        localStorage.setItem('smriti-theme', t)
      } catch {}
    }),
    [applyTheme, enqueueMutation]
  )

  const resetAllData = useCallback(() => enqueueMutation(async () => {
    // Remove OS-level reminders before clearing local data. Queuing this
    // operation behind every other local write makes reset a true barrier.
    await cancelAllAlarmsToNative()
    try {
      localStorage.clear()
    } catch {}
    try {
      sessionStorage.clear()
    } catch {}
    await wipeAll()
    // IndexedDB is not the only adaptive state: the engine keeps a live
    // in-memory profile and debounced legacy ability cache for the session.
    // Clear those too so a reset cannot leak old learning into a new patient.
    await AdaptiveQuestionEngine.resetAllAsync()
    profileRef.current = null
    setProfileState(null)
    setMeds([])
    setDailyReminders(DEFAULT_DAILY_REMINDERS.map((item) => ({ ...item })))
    setAppointments([])
    setDailyGameLimitState(3)
    setSessions([])
    setMedlog([])
    if (typeof window !== 'undefined') window.location.hash = ''
  }), [enqueueMutation])

  const sessionsToday = useMemo(() => {
    const today = new Date().toDateString()
    return sessions.filter((s) => new Date(s.startedAt).toDateString() === today).length
  }, [sessions])

  useReticleStore('app', {
    ready,
    profile,
    meds,
    dailyRemindersCount: dailyReminders.length,
    appointmentsCount: appointments.length,
    dailyGameLimit,
    sessionsToday,
    sessionCount: sessions.length,
    medlogCount: medlog.length,
  })

  const value: AppState = {
    ready, profile, meds, dailyReminders, appointments, dailyGameLimit, sessions, medlog, t, lang: profile?.language ?? 'en',
    setProfile, updateProfile, upsertMed, removeMed, upsertDailyReminder, removeDailyReminder,
    upsertAppointment, removeAppointment, setDailyGameLimit, updateDailyGameLimit: setDailyGameLimit, refreshSessions, refreshMedLog, resetAllData, sessionsToday,
    theme, setTheme,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp(): AppState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp outside provider')
  return v
}
