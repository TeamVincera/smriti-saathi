import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Language, Profile, Med, GardenState, SessionRecord } from './lib/types'
import {
  loadProfile, saveProfile as dbSaveProfile, getMeds, saveMed as dbSaveMed,
  deleteMed as dbDeleteMed, loadGarden, saveGarden as dbSaveGarden, getSessions,
  addEvent, wipeAll,
} from './lib/db'
import { translate } from './i18n'
import { speak, stopSpeaking } from './lib/speech'
import { unlockAudio } from './lib/audio'
import { useReticleStore } from '@reticlehq/react/store'

interface AppState {
  ready: boolean
  profile: Profile | null
  meds: Med[]
  garden: GardenState
  sessions: SessionRecord[]
  t: (key: string, vars?: Record<string, string | number>) => string
  lang: Language
  say: (key: string, vars?: Record<string, string | number>) => void
  setProfile: (p: Profile) => Promise<void>
  updateProfile: (patch: Partial<Profile>) => Promise<void>
  upsertMed: (m: Med) => Promise<void>
  removeMed: (id: string) => Promise<void>
  addGardenPoints: (points: number, reason: string) => Promise<void>
  refreshSessions: () => Promise<void>
  resetAllData: () => Promise<void>
  sessionsToday: number
}

const Ctx = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [profile, setProfileState] = useState<Profile | null>(null)
  const [meds, setMeds] = useState<Med[]>([])
  const [garden, setGarden] = useState<GardenState>({ points: 0, plantedFlowers: 0, wateredDates: [], history: [] })
  const [sessions, setSessions] = useState<SessionRecord[]>([])

  useEffect(() => {
    ;(async () => {
      const [p, m, g, s] = await Promise.all([loadProfile(), getMeds(), loadGarden(), getSessions()])
      if (p) setProfileState(p)
      setMeds(m.sort((a, b) => a.name.localeCompare(b.name)))
      setGarden(g)
      setSessions(s.sort((a, b) => a.startedAt - b.startedAt))
      setReady(true)
      void addEvent({ kind: 'app_open' })
    })()
  }, [])

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(profile?.language ?? 'en', key, vars),
    [profile?.language]
  )

  const say = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      unlockAudio()
      void speak(t(key, vars), profile?.language ?? 'en')
    },
    [t, profile?.language]
  )

  const setProfile = useCallback(async (p: Profile) => {
    await dbSaveProfile(p)
    setProfileState(p)
  }, [])

  const updateProfile = useCallback(async (patch: Partial<Profile>) => {
    setProfileState((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
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

  const addGardenPoints = useCallback(async (points: number, reason: string) => {
    setGarden((prev) => {
      const next = {
        ...prev,
        points: prev.points + points,
        wateredDates:
          reason === 'med' && !prev.wateredDates.includes(new Date().toDateString())
            ? [...prev.wateredDates, new Date().toDateString()]
            : prev.wateredDates,
        history: [...prev.history.slice(-99), { ts: Date.now(), reason, points }],
      }
      void dbSaveGarden(next)
      return next
    })
  }, [])

  const refreshSessions = useCallback(async () => {
    const s = await getSessions()
    setSessions(s.sort((a, b) => a.startedAt - b.startedAt))
  }, [])

  const resetAllData = useCallback(async () => {
    stopSpeaking()
    try {
      localStorage.clear()
    } catch {}
    try {
      sessionStorage.clear()
    } catch {}
    await wipeAll()
    setProfileState(null)
    setMeds([])
    setGarden({ points: 0, plantedFlowers: 0, wateredDates: [], history: [] })
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
    garden,
    sessionsToday,
    sessionCount: sessions.length,
  })

  const value: AppState = {
    ready, profile, meds, garden, sessions, t, lang: profile?.language ?? 'en',
    say, setProfile, updateProfile, upsertMed, removeMed, addGardenPoints, refreshSessions, resetAllData, sessionsToday,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp(): AppState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp outside provider')
  return v
}

export { stopSpeaking }
