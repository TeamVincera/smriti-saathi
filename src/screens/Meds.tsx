import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../state'
import { getMedLog } from '../lib/db'
import { confirmTaken } from '../lib/reminders'
import type { MedLogEntry } from '../lib/types'
import { formEmoji } from '../components/ReminderOverlay'
import { playChime } from '../lib/audio'
import { navigate } from '../router'

interface DoseSlot {
  medId: string
  name: string
  time: string
  status: 'taken' | 'pending' | 'missed' | 'future'
  photo?: string
  form: string
  dosage: string
}

function hhmmNow(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function dateStrOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function schedTs(dateStr: string, time: string): number {
  const [y, mo, dd] = dateStr.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  return new Date(y, mo - 1, dd, h, mi, 0, 0).getTime()
}

export function Meds() {
  const { t, meds, addGardenPoints } = useApp()
  const [log, setLog] = useState<MedLogEntry[]>([])
  const [hydration, setHydration] = useState(false)

  useEffect(() => {
    void getMedLog().then(setLog)
    setHydration(!!localStorage.getItem('ss_hydration'))
  }, [])

  const todaySlots: DoseSlot[] = useMemo(() => {
    const now = hhmmNow()
    const dstr = dateStrOf(new Date())
    const todaysLog = log.filter((e) => new Date(e.ts).toDateString() === new Date().toDateString())
    const out: DoseSlot[] = []
    for (const m of meds.filter((x) => x.active)) {
      const times = [...m.times].sort()
      const takenCount = todaysLog.filter((e) => e.medId === m.id && e.status === 'taken').length
      times.forEach((time, i) => {
        const missedHere = todaysLog.some(
          (e) => e.medId === m.id && e.status === 'missed' && Number(e.scheduledFor) === schedTs(dstr, time)
        )
        let status: DoseSlot['status']
        if (i < takenCount) status = 'taken'
        else if (missedHere) status = 'missed'
        else status = time <= now ? 'pending' : 'future'
        out.push({ medId: m.id, name: m.name, time, status, photo: m.photo, form: m.form, dosage: m.dosage })
      })
    }
    return out.sort((a, b) => a.time.localeCompare(b.time))
  }, [meds, log])

  async function quickTake(medId: string) {
    const med = meds.find((m) => m.id === medId)
    if (!med) return
    await confirmTaken(med, String(Date.now()), 'tap')
    await addGardenPoints(2, 'med')
    void playChime()
    void getMedLog().then(setLog)
  }
  function toggleHydration(v: boolean) {
    setHydration(v)
    try {
      if (v) localStorage.setItem('ss_hydration', '1')
      else localStorage.removeItem('ss_hydration')
    } catch {}
  }

  return (
    <div className="page enter-anim">
      <div className="row-between">
        <h1 className="display-lg">{t('nav_meds')}</h1>
        <button className="btn btn-pearl" onClick={() => toggleHydration(!hydration)}>
          💧 Hydration reminders {hydration ? 'ON' : 'OFF'}
        </button>
      </div>

      {meds.length === 0 ? (
        <div className="card card-parchment center-col mt-lg" style={{ padding: 'var(--s-xl)' }}>
          <span style={{ fontSize: 64 }}>💊</span>
          <p className="lead">No medicines added yet. A caregiver can add them in the Caregiver section.</p>
          <button className="btn btn-primary mt-lg" onClick={() => navigate('/hub')}>
            {t('nav_hub')} →
          </button>
        </div>
      ) : (
        <>
          <h2 className="title mt-xl">{t('adherence_week')} · Today</h2>
          <div className="stack mt-md">
            {todaySlots.map((s) => (
              <div key={`${s.medId}-${s.time}`} className="card row-between">
                <div className="row">
                  <div style={{ width: 84, height: 84, borderRadius: 'var(--r-md)', border: '2px solid var(--hairline)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, overflow: 'hidden' }}>
                    {s.photo ? <img src={s.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : formEmoji(s.form)}
                  </div>
                  <div>
                    <strong style={{ fontSize: 'var(--fs-body-lg)' }}>{s.name}</strong>
                    <p className="caption">{s.dosage} · 🕒 {s.time}</p>
                  </div>
                </div>
                {s.status === 'taken' ? (
                  <span className="chip chip-blue">✅ {t('taken_btn')}</span>
                ) : s.status === 'missed' ? (
                  <button className="btn btn-primary" onClick={() => void quickTake(s.medId)}>
                    Take now
                  </button>
                ) : s.status === 'pending' ? (
                  <button className="btn btn-primary btn-big cue-target" onClick={() => void quickTake(s.medId)} style={{ background: 'var(--success)', minHeight: 88 }}>
                    ✅ {t('taken_btn')}
                  </button>
                ) : (
                  <span className="chip">{s.time}</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <p className="caption mt-xl">
        Every confirmed dose waters a flower in your {t('nav_garden')}. 🌷
      </p>
    </div>
  )
}
