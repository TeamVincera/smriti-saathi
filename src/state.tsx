import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Language, Profile, Med, DailyReminder, AppointmentReminder, SessionRecord, ClinicalConfig } from './lib/types'
import {
  loadProfile, saveProfile as dbSaveProfile, getMeds, saveMed as dbSaveMed,
  deleteMed as dbDeleteMed, loadDailyReminders, saveDailyReminder, deleteDailyReminder,
  loadAppointments, saveAppointment, deleteAppointment, loadConfig, saveConfig,
  getSessions, addEvent, wipeAll, DEFAULT_DAILY_REMINDERS,
} from './lib/db'
import { ensureAbilities } from './lib/adaptive'
import { translate } from './i18n'
import { useReticleStore } from '@reticlehq/react/store'

interface AppState {
  ready: boolean
  profile: Profile | null
  meds: Med[]
  dailyReminders: DailyReminder[]
  appointments: AppointmentReminder[]
  dailyGameLimit: number
  sessions: SessionRecord[]
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
  resetAllData: () => Promise<void>
  sessionsToday: number
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => Promise<void>
}

const Ctx = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [profile, setProfileState] = useState<Profile | null>(null)
  const [meds, setMeds] = useState<Med[]>([])
  const [dailyReminders, setDailyReminders] = useState<DailyReminder[]>([])
  const [appointments, setAppointments] = useState<AppointmentReminder[]>([])
  const [dailyGameLimit, setDailyGameLimitState] = useState(3)
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const [theme, setThemeState] = useState<'light' | 'dark'>('light')

  // Apply the active theme to <html> and the browser chrome color
  const applyTheme = useCallback((t: 'light' | 'dark') => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', t)
      const meta = document.querySelector('meta[name="theme-color"]')
      if (meta) meta.setAttribute('content', t === 'dark' ? '#10161F' : '#FBF8F2')
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      const [p, m, r, a, cfg, s] = await Promise.all([
        loadProfile(),
        getMeds(),
        loadDailyReminders(),
        loadAppointments(),
        loadConfig(),
        getSessions(),
      ])
      if (p) setProfileState(p)
      setMeds(m.sort((x, y) => x.name.localeCompare(y.name)))
      setDailyReminders(r)
      setAppointments(a)
      setDailyGameLimitState(cfg.maxSessionsPerDay ?? 3)
      const savedTheme: 'light' | 'dark' = cfg.theme === 'dark' ? 'dark' : 'light'
      setThemeState(savedTheme)
      applyTheme(savedTheme)
      setSessions(s.sort((x, y) => x.startedAt - y.startedAt))
      await ensureAbilities()
      setReady(true)
      void addEvent({ kind: 'app_open' })
    })()
  }, [applyTheme])

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(profile?.language ?? 'en', key, vars),
    [profile?.language]
  )

  const setProfile = useCallback(async (p: Profile) => {
    await dbSaveProfile(p)
    setProfileState(p)
  }, [])

  const updateProfile = useCallback(async (patch: Partial<Profile>) => {
    setProfileState((prev) => {
      if (!prev) return prev
      const next: Profile = {
        ...prev,
        ...patch,
        patient: { ...prev.patient, ...(patch.patient || {}) },
        clinical: { ...prev.clinical, ...(patch.clinical || {}) },
        cultural: { ...prev.cultural, ...(patch.cultural || {}) },
        routine: { ...prev.routine, ...(patch.routine || {}) },
        caregiver: { ...prev.caregiver, ...(patch.caregiver || {}) },
      }
      void dbSaveProfile(next)
      return next
    })
  }, [])

  const upsertMed = useCallback(async (m: Med) => {
    await dbSaveMed(m)
    setMeds((prev) => [...prev.filter((x) => x.id !== m.id), m].sort((a, b) => a.name.localeCompare(b.name)))
  }, [])

  const removeMed = useCallback(async (id: string) => {
    await dbDeleteMed(id)
    setMeds((prev) => prev.filter((m) => m.id !== id))
  }, [])

  const upsertDailyReminder = useCallback(async (r: DailyReminder) => {
    await saveDailyReminder(r)
    setDailyReminders((prev) => {
      const filtered = prev.filter((x) => x.id !== r.id)
      return [...filtered, r].sort((a, b) => a.time.localeCompare(b.time))
    })
  }, [])

  const removeDailyReminder = useCallback(async (id: string) => {
    await deleteDailyReminder(id)
    setDailyReminders((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const upsertAppointment = useCallback(async (a: AppointmentReminder) => {
    await saveAppointment(a)
    setAppointments((prev) => {
      const filtered = prev.filter((x) => x.id !== a.id)
      return [...filtered, a].sort((x, y) => `${x.date} ${x.time}`.localeCompare(`${y.date} ${y.time}`))
    })
  }, [])

  const removeAppointment = useCallback(async (id: string) => {
    await deleteAppointment(id)
    setAppointments((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const setDailyGameLimit = useCallback(async (limit: number) => {
    const clamped = Math.max(1, Math.min(10, limit))
    setDailyGameLimitState(clamped)
    const cfg = await loadConfig()
    await saveConfig({ ...cfg, maxSessionsPerDay: clamped })
  }, [])

  const refreshSessions = useCallback(async () => {
    const s = await getSessions()
    setSessions(s.sort((a, b) => a.startedAt - b.startedAt))
  }, [])

  const setTheme = useCallback(
    async (t: 'light' | 'dark') => {
      setThemeState(t)
      applyTheme(t)
      try {
        localStorage.setItem('smriti-theme', t)
      } catch {}
      const cfg = await loadConfig()
      await saveConfig({ ...cfg, theme: t })
    },
    [applyTheme]
  )

  const resetAllData = useCallback(async () => {
    try {
      localStorage.clear()
    } catch {}
    try {
      sessionStorage.clear()
    } catch {}
    await wipeAll()
    setProfileState(null)
    setMeds([])
    setDailyReminders(DEFAULT_DAILY_REMINDERS)
    setAppointments([])
    setDailyGameLimitState(3)
    setSessions([])
    window.location.hash = ''
  }, [])

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
  })

  const value: AppState = {
    ready, profile, meds, dailyReminders, appointments, dailyGameLimit, sessions, t, lang: profile?.language ?? 'en',
    setProfile, updateProfile, upsertMed, removeMed, upsertDailyReminder, removeDailyReminder,
    upsertAppointment, removeAppointment, setDailyGameLimit, updateDailyGameLimit: setDailyGameLimit, refreshSessions, resetAllData, sessionsToday,
    theme, setTheme,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp(): AppState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp outside provider')
  return v
}

