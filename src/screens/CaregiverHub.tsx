import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useApp } from '../state'
import { getMedLog, getSessions, loadConfig, saveConfig, dbAll } from '../lib/db'
import type { MedLogEntry, MedForm, Med, SessionRecord, Profile } from '../lib/types'
import { buildDigest, cognitiveStabilityIndex, detectAlerts, suggestPlan } from '../lib/sathi'
import { formEmoji } from '../components/ReminderOverlay'
import { Icon } from '../components/Icons'
import { playTap } from '../lib/audio'
import { navigate } from '../router'
import {
  getAvailableVoices,
  getPreferredVoiceURI,
  setPreferredVoiceURI,
  getVoiceSpeed,
  setVoiceSpeed,
  getVoicePitch,
  setVoicePitch,
  speak,
} from '../lib/speech'
import type { VoiceOption } from '../lib/speech'

export function CaregiverHub() {
  const { t, profile } = useApp()
  const [unlocked, setUnlocked] = useState(false)

  if (!profile?.pin || unlocked) return <HubInner />
  return <PinGate pin={profile.pin} t={t} onUnlock={() => setUnlocked(true)} />
}

function PinGate({ pin, t, onUnlock }: { pin: string; t: (k: string) => string; onUnlock: () => void }) {
  const [entry, setEntry] = useState('')
  const [shake, setShake] = useState(false)

  useEffect(() => {
    if (entry.length === 4) {
      if (entry === pin) onUnlock()
      else {
        setShake(true)
        setTimeout(() => {
          setShake(false)
          setEntry('')
        }, 600)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry])

  return (
    <div className="page center-col enter-anim" style={{ maxWidth: 480, margin: '0 auto' }}>
      <Icon name="lock" size={54} />
      <h1 className="display-md">{t('hub_pin_gate')}</h1>
      <div style={{ fontSize: 44, letterSpacing: 16, minHeight: 64 }}>{'•'.repeat(entry.length)}</div>
      {shake && <p className="caption" style={{ color: '#c0392b' }}>Wrong PIN — try again.</p>}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(72px, 96px))', gap: 'var(--s-sm)' }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button key={n} className="btn btn-secondary" style={{ minHeight: 68 }} onClick={() => { playTap(); setEntry((e) => (e.length < 4 ? e + n : e)) }}>
            {n}
          </button>
        ))}
        <button className="btn btn-pearl" style={{ minHeight: 68 }} onClick={() => setEntry('')}>C</button>
        <button className="btn btn-secondary" style={{ minHeight: 68 }} onClick={() => { playTap(); setEntry((e) => (e.length < 4 ? e + '0' : e)) }}>0</button>
      </div>
      <p className="caption mt-lg">This gate protects patient data. Ask the caregiver to unlock.</p>
    </div>
  )
}

function HubInner() {
  const app = useApp()
  const { t, meds, upsertMed, removeMed, profile, updateProfile, resetAllData } = app
  const [tab, setTab] = useState<'overview' | 'family' | 'meds' | 'settings'>('overview')
  const [medlog, setMedlog] = useState<MedLogEntry[]>([])
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const sessions = useSessions()
  const [config, setConfigState] = useState<{ alpha: number; maxSessionsPerDay: number } | null>(null)

  useEffect(() => {
    void getMedLog().then(setMedlog)
    void loadConfig().then((c) => setConfigState(c))
  }, [])

  const weekData = useMemo(() => computeWeek(medlog), [medlog])
  const familyCount = profile?.cultural.familyMembers?.length ?? 0

  return (
    <div className="page enter-anim">
      <div className="row-between" style={{ alignItems: 'center' }}>
        <div>
          <h1 className="display-lg">{t('nav_hub')}</h1>
          <span className="caption">🔐 Caregiver mode · {profile?.patient.name}</span>
        </div>
        <button
          className="btn btn-pearl"
          style={{ borderColor: '#e74c3c', color: '#c0392b', minHeight: 44, padding: '6px 14px', fontSize: 'var(--fs-caption)' }}
          onClick={() => setShowLogoutModal(true)}
        >
          🚪 {t('hub_logout')}
        </button>
      </div>

      <div className="row mt-md" style={{ gap: 8 }}>
        {(['overview', 'family', 'meds', 'settings'] as const).map((tb) => (
          <button
            key={tb}
            className={`chip chip-selected ${tab === tb ? 'chip-blue' : ''}`}
            style={{ minHeight: 52, paddingInline: 18, fontSize: 'var(--fs-caption)' }}
            onClick={() => setTab(tb)}
          >
            {tb === 'overview'
              ? '📊 Overview'
              : tb === 'family'
              ? `👨‍👩‍👧 ${t('hub_family')} (${familyCount})`
              : tb === 'meds'
              ? `💊 ${t('hub_medicines')} (${meds.length})`
              : `⚙️ ${t('hub_settings')}`}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewSection medlog={medlog} sessions={sessions} week={weekData} />}

      {tab === 'family' && (
        <FamilyAdmin
          profile={profile}
          onSave={async (members) => {
            await updateProfile({
              cultural: {
                ...(profile?.cultural ?? {}),
                familyMembers: members,
              },
            })
          }}
        />
      )}

      {tab === 'meds' && <MedsAdmin meds={meds} onSave={(m) => void upsertMed(m)} onDelete={(id) => void removeMed(id)} />}

      {tab === 'settings' && (
        <SettingsSection
          profile={profile}
          updateProfile={updateProfile}
          config={config}
          onTriggerLogout={() => setShowLogoutModal(true)}
          saveAiConfig={async (alpha, maxSess) => {
            const c = await loadConfig()
            c.alpha = alpha
            c.maxSessionsPerDay = maxSess
            await saveConfig(c)
          }}
          onExport={async () => {
            const [events, log] = await Promise.all([dbAll<Record<string, unknown>>('events'), getMedLog()])
            downloadJson(`smriti-export-${Date.now()}.json`, {
              profile: { ...(profile ?? {}), pin: undefined },
              sessions,
              medlog: log,
              events: events.slice(-500),
            })
          }}
        />
      )}

      {showLogoutModal && (
        <LogoutModal
          t={t}
          onCancel={() => setShowLogoutModal(false)}
          onConfirm={async () => {
            setShowLogoutModal(false)
            await resetAllData()
            window.location.hash = ''
          }}
        />
      )}
    </div>
  )
}

function useSessions(): SessionRecord[] {
  const [s, setS] = useState<SessionRecord[]>([])
  useEffect(() => {
    void getSessions().then((r) => setS(r.sort((a, b) => a.startedAt - b.startedAt)))
  }, [])
  return s
}

function OverviewSection({ medlog, sessions, week }: { medlog: MedLogEntry[]; sessions: SessionRecord[]; week: { taken: number; missed: number; skipped: number; total: number } }) {
  const { t } = useApp()
  const adherencePct = medlog.length > 0 ? Math.round((week.taken / Math.max(week.taken + week.missed, 1)) * 100) : 100
  const digest = buildDigest(sessions.slice(-12), adherencePct)
  const csi = cognitiveStabilityIndex(sessions.map((s) => s.reward))
  const alerts = [...detectAlerts(sessions)]
  const missedWeek = medlog.filter((e) => e.status === 'missed' && Date.now() - e.ts < 7 * 864e5).length
  if (missedWeek >= 3) {
    alerts.push({
      id: `adherence-${Date.now()}`,
      severity: 'watch',
      titleKey: 'alert_frustration',
      detail: `${missedWeek} doses were missed in the last 7 days. Consider simplifying the schedule or checking in more often.`,
    })
  }
  const plan = suggestPlan(sessions.length, {
    weights: { completion: 0, accuracy: 0, hesitation: 0, frustration: 0 },
    alpha: 0.65,
    maxSessionsPerDay: 3,
    gracePeriodMin: 30,
  })

  return (
    <section className="stack mt-lg">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <div className="card center-col">
          <span style={{ fontSize: 64 }}>{csi.state === 'flourishing' ? '🌳' : csi.state === 'steady' ? '🌲' : '🥀'}</span>
          <h3 className="title">{t('csi_title')}</h3>
          <span className={`chip ${csi.trend >= 0 ? 'chip-blue' : ''}`}>
            {csi.trend >= 0.02 ? 'Improving ↗' : csi.trend <= -0.02 ? 'Needs care ↘' : 'Steady →'}
          </span>
        </div>
        <div className="card center-col">
          <span className="money">{adherencePct}%</span>
          <h3 className="title">7-day adherence</h3>
          <span className="caption">{week.taken} taken · {week.missed} missed</span>
        </div>
        <div className="card center-col">
          <span className="money">{sessions.length}</span>
          <h3 className="title">Total sessions</h3>
          <span className="caption">Plan: {plan.perWeek}/week · {plan.mix}</span>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="stack">
          <h2 className="display-md">{t('hub_alerts')}</h2>
          {alerts.map((a) => (
            <div key={a.id} className="alert-item">
              <span style={{ fontSize: 28 }}>{a.severity === 'urgent' ? '🚨' : '⚠️'}</span>
              <div>
                <strong>{a.titleKey === 'alert_sequence' ? t('alert_sequence') : t('alert_frustration')}</strong>
                <p className="caption">{a.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="display-md">{t('hub_digest')}</h2>
      <div className="stack">
        {digest.map((d, i) => (
          <div key={i} className="card row" style={{ alignItems: 'center' }}>
            <span style={{ fontSize: 30 }}>{d.icon}</span>
            <p>{d.text}</p>
          </div>
        ))}
      </div>

      <h2 className="display-md">{t('hub_adherence')}</h2>
      <AdherenceCalendar medlog={medlog} />
    </section>
  )
}

function FamilyAdmin({
  profile,
  onSave,
}: {
  profile: Profile | null
  onSave: (members: { name: string; relation: string; emoji?: string; photo?: string }[]) => Promise<void>
}) {
  const { t } = useApp()
  const [list, setList] = useState(profile?.cultural.familyMembers ?? [])
  const [draft, setDraft] = useState<{ idx: number | null; name: string; relation: string; emoji: string; photo?: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setList(profile?.cultural.familyMembers ?? [])
  }, [profile?.cultural.familyMembers])

  async function onPhoto(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f || !draft) return
    try {
      const m = await import('../lib/image')
      const small = await m.resizeImageFile(f)
      setDraft((d) => ({ ...(d ?? { idx: null, name: '', relation: '', emoji: '👩' }), photo: small }))
    } catch {}
  }

  function saveMember() {
    if (!draft || !draft.name.trim()) return
    let updated: typeof list
    if (draft.idx !== null && draft.idx >= 0 && draft.idx < list.length) {
      updated = list.map((item, i) =>
        i === draft.idx
          ? { name: draft.name.trim(), relation: draft.relation || 'Family', emoji: draft.emoji, photo: draft.photo }
          : item
      )
    } else {
      updated = [...list, { name: draft.name.trim(), relation: draft.relation || 'Family', emoji: draft.emoji, photo: draft.photo }]
    }
    setList(updated)
    void onSave(updated)
    setDraft(null)
  }

  function deleteMember(i: number) {
    if (window.confirm(`Remove ${list[i].name}?`)) {
      const updated = list.filter((_, idx) => idx !== i)
      setList(updated)
      void onSave(updated)
    }
  }

  return (
    <section className="stack mt-lg">
      <div className="row-between">
        <div>
          <h2 className="display-md">👨‍👩‍👧 {t('hub_family')}</h2>
          <p className="caption">Photos and names configured here appear in the <strong>Faces of Home</strong> memory game.</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setDraft({ idx: null, name: '', relation: 'Daughter', emoji: '👩', photo: undefined })}
        >
          <Icon name="plus" /> {t('add_family_member')}
        </button>
      </div>

      <div className="grid mt-md" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {list.map((m, i) => (
          <div key={i} className="card row-between" style={{ alignItems: 'center' }}>
            <div className="row" style={{ gap: 12 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 'var(--r-md)',
                  border: '1.5px solid var(--hairline)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#fff',
                  fontSize: 32,
                }}
              >
                {m.photo ? <img src={m.photo} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : m.emoji || '👩'}
              </div>
              <div>
                <strong style={{ fontSize: 'var(--fs-body-lg)' }}>{m.name}</strong>
                <p className="caption">{m.relation}</p>
                {m.photo ? <span className="caption" style={{ color: 'var(--success)' }}>📷 Photo attached</span> : <span className="caption">No photo</span>}
              </div>
            </div>
            <div className="row" style={{ gap: 4 }}>
              <button
                className="btn btn-pearl"
                style={{ minHeight: 40, padding: '4px 10px' }}
                onClick={() => setDraft({ idx: i, name: m.name, relation: m.relation, emoji: m.emoji || '👩', photo: m.photo })}
              >
                Edit
              </button>
              <button
                className="btn btn-pearl"
                style={{ minHeight: 40, padding: '4px 8px', color: '#c0392b' }}
                onClick={() => deleteMember(i)}
                aria-label="Delete"
              >
                🗑
              </button>
            </div>
          </div>
        ))}
      </div>

      {list.length === 0 && (
        <div className="card card-parchment center-col" style={{ padding: 'var(--s-xl)' }}>
          <span style={{ fontSize: 48 }}>👪</span>
          <p className="lead" style={{ textAlign: 'center' }}>{t('family_empty')}</p>
          <button
            className="btn btn-primary mt-md"
            onClick={() => setDraft({ idx: null, name: '', relation: '', emoji: '👩' })}
          >
            <Icon name="plus" /> {t('add_family_member')}
          </button>
        </div>
      )}

      {draft && (
        <div className="card card-parchment stack mt-lg" style={{ maxWidth: 640 }}>
          <h3 className="title">{draft.idx !== null ? t('edit_family_member') : t('add_family_member')}</h3>
          <div className="row" style={{ gap: 14, alignItems: 'center' }}>
            <div
              className="avatar-pick"
              style={{ width: 88, height: 88, fontSize: 40, overflow: 'hidden', flexShrink: 0 }}
              onClick={() => fileRef.current?.click()}
            >
              {draft.photo ? <img src={draft.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : draft.emoji}
            </div>
            <button className="btn btn-pearl" onClick={() => fileRef.current?.click()}>
              <Icon name="camera" /> {draft.photo ? 'Change photo' : 'Upload photo'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => void onPhoto(e)} />
          </div>

          <label className="label">Name *</label>
          <input
            className="input"
            placeholder="e.g. Sarala, Deben, Nayan"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            autoFocus
          />

          <div className="row" style={{ gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label className="label">Relationship</label>
              <input
                className="input"
                placeholder="e.g. Daughter, Son, Spouse"
                value={draft.relation}
                onChange={(e) => setDraft({ ...draft, relation: e.target.value })}
              />
            </div>
            <div style={{ width: 100 }}>
              <label className="label">Avatar</label>
              <select
                className="input"
                value={draft.emoji}
                onChange={(e) => setDraft({ ...draft, emoji: e.target.value })}
              >
                {['👩', '👨', '👧', '👦', '🧑', '👶', '🧓', '👵', '👴', '🧕'].map((em) => <option key={em}>{em}</option>)}
              </select>
            </div>
          </div>

          <div className="row mt-sm" style={{ gap: 10 }}>
            <button className="btn btn-primary" disabled={!draft.name.trim()} onClick={saveMember}>
              ✅ {t('save')}
            </button>
            <button className="btn btn-pearl" onClick={() => setDraft(null)}>
              {t('cancel')}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

function AdherenceCalendar({ medlog }: { medlog: MedLogEntry[] }) {
  const days = useMemo(() => {
    const out: { dateStr: string; label: string }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 864e5)
      out.push({ dateStr: d.toDateString(), label: d.toLocaleDateString(undefined, { weekday: 'short' }) })
    }
    return out
  }, [])
  const meds = useApp().meds
  return (
    <div className="stack">
      {meds.filter((m) => m.active).map((m) => (
        <div key={m.id} className="card row-between">
          <strong className="row">{formEmoji(m.form)} {m.name}</strong>
          <div className="row">
            {days.map((d) => {
              const entries = medlog.filter((e) => e.medId === m.id && new Date(e.ts).toDateString() === d.dateStr)
              const taken = entries.some((e) => e.status === 'taken')
              const missed = entries.some((e) => e.status === 'missed')
              const cls = taken ? 'taken' : missed ? 'missed' : ''
              const glyph = taken ? '✔' : missed ? '✘' : '·'
              return (
                <div key={d.dateStr} className={`cal-day ${cls}`} style={{ minWidth: 60 }}>
                  <span>{glyph}</span>
                  <span className="caption">{d.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
      {meds.filter((m) => m.active).length === 0 && <p className="lead">No medicines yet — add one in the Medicines tab.</p>}
    </div>
  )
}

function MedsAdmin({ meds, onSave, onDelete }: { meds: Med[]; onSave: (m: Med) => void; onDelete: (id: string) => void }) {
  const { t } = useApp()
  const [draft, setDraft] = useState<Partial<Med> | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function startNew() {
    setDraft({ id: `m-${Date.now()}`, name: '', form: 'tablet', dosage: '1 tablet', times: ['08:00'], food: 'after', active: true })
  }

  async function onPhoto(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f || !draft) return
    try {
      const m = await import('../lib/image')
      const small = await m.resizeImageFile(f)
      setDraft((d) => ({ ...(d ?? {}), photo: small }))
    } catch {}
  }

  const TIME_PRESETS = [
    { label: 'Morning ☀️', v: '08:00' },
    { label: 'Afternoon 🌤', v: '13:00' },
    { label: 'Evening 🌆', v: '18:00' },
    { label: 'Night 🌙', v: '21:00' },
  ]

  return (
    <section className="stack mt-lg">
      <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={startNew}>
        <Icon name="plus" /> {t('add_med')}
      </button>

      {meds.map((m) => (
        <div key={m.id} className="card row-between">
          <div className="row">
            <MedPhoto m={m} />
            <div>
              <strong style={{ fontSize: 'var(--fs-body-lg)' }}>{m.name || '(unnamed)'}</strong>
              <p className="caption">
                {m.dosage} · {m.times.join(', ')} ·{' '}
                {m.food === 'none' ? t('food_none') : m.food === 'before' ? t('reminder_food_before') : t('reminder_food_after')}
                {typeof m.stock === 'number' && m.stock !== undefined ? ` · stock ${m.stock}` : ''}
              </p>
            </div>
          </div>
          <div className="row">
            {!m.active && <span className="chip">paused</span>}
            <button className="btn btn-pearl" onClick={() => setDraft(m)}>Edit</button>
            <button
              className="btn btn-pearl"
              onClick={() => {
                if (window.confirm(`Remove ${m.name}?`)) onDelete(m.id)
              }}
            >
              🗑
            </button>
          </div>
        </div>
      ))}
      {meds.length === 0 && <p className="lead">No medicines yet — add the first one above.</p>}

      {draft && (
        <div className="card card-parchment stack">
          <h3 className="title">{draft.name ? `Edit ${draft.name}` : t('add_med')}</h3>
          <div className="row">
            <button className="btn btn-pearl" onClick={() => fileRef.current?.click()}>
              <Icon name="camera" /> Photo of strip/bottle
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => void onPhoto(e)} />
            {draft.photo && <img src={draft.photo} alt="" className="photo-preview" />}
          </div>
          <input className="input" placeholder={t('med_name')} value={draft.name ?? ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <div className="field">
            <label className="label">{t('med_form')}</label>
            <select className="input" value={draft.form} onChange={(e) => setDraft({ ...draft, form: e.target.value as MedForm })}>
              <option value="tablet">Tablet</option>
              <option value="capsule">Capsule</option>
              <option value="syrup">Syrup</option>
              <option value="injection">Injection</option>
            </select>
          </div>
          <input className="input" placeholder={`${t('med_dose')} — e.g. 1 tablet`} value={draft.dosage ?? ''} onChange={(e) => setDraft({ ...draft, dosage: e.target.value })} />
          <label className="label">{t('med_times')}</label>
          <div className="row">
            {TIME_PRESETS.map((p) => (
              <button
                key={p.v}
                className={`chip chip-selected ${(draft.times ?? []).includes(p.v) ? 'chip-blue' : ''}`}
                style={{ minHeight: 52 }}
                onClick={() =>
                  setDraft({
                    ...draft,
                    times: (draft.times ?? []).includes(p.v)
                      ? (draft.times ?? []).filter((x) => x !== p.v)
                      : [...(draft.times ?? []), p.v].sort(),
                  })
                }
              >
                {p.label}
              </button>
            ))}
          </div>
          <input
            type="time"
            className="input"
            style={{ maxWidth: 170 }}
            onChange={(e) => e.target.value && setDraft({ ...draft, times: [...new Set([...(draft.times ?? []), e.target.value])].sort() })}
            aria-label="custom time"
          />
          <label className="label">Food instruction</label>
          <div className="row">
            {(['before', 'after', 'none'] as const).map((f) => (
              <button key={f} className={`chip chip-selected ${draft.food === f ? 'chip-blue' : ''}`} style={{ minHeight: 52 }} onClick={() => setDraft({ ...draft, food: f })}>
                {f === 'before' ? `🍽️→💊 ${t('reminder_food_before')}` : f === 'after' ? `💊→🍽️ ${t('reminder_food_after')}` : `🕒 ${t('food_none')}`}
              </button>
            ))}
          </div>
          <div className="row">
            <input
              className="input"
              inputMode="numeric"
              style={{ maxWidth: 160 }}
              placeholder="Stock (doses)"
              value={draft.stock ?? ''}
              onChange={(e) => setDraft({ ...draft, stock: e.target.value === '' ? undefined : parseInt(e.target.value.replace(/\D/g, ''), 10) })}
            />
            <input
              className="input"
              inputMode="numeric"
              style={{ maxWidth: 140 }}
              placeholder="Days"
              value={draft.durationDays ?? ''}
              onChange={(e) => setDraft({ ...draft, durationDays: e.target.value === '' ? undefined : parseInt(e.target.value.replace(/\D/g, ''), 10) })}
            />
          </div>

          <hr className="divider" />
          <p className="caption">
            Review before saving: <strong>{draft.name || '?'}</strong>, {draft.dosage}, at {(draft.times ?? []).join(', ') || '—'}, food:{draft.food}.
          </p>
          <div className="row">
            <button
              className="btn btn-primary"
              disabled={!draft.name || (draft.times ?? []).length === 0}
              onClick={() => {
                onSave(draft as Med)
                setDraft(null)
              }}
            >
              ✅ {t('save')}
            </button>
            <button className="btn btn-pearl" onClick={() => setDraft(null)}>Cancel</button>
          </div>
        </div>
      )}
    </section>
  )
}

function MedPhoto({ m }: { m: Med }) {
  return (
    <div
      style={{
        width: 64,
        height: 64,
        borderRadius: 'var(--r-sm)',
        border: '1px solid var(--hairline)',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 30,
        overflow: 'hidden',
      }}
    >
      {m.photo ? <img src={m.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : formEmoji(m.form)}
    </div>
  )
}

function SettingsSection({
  onExport,
  onTriggerLogout,
  profile,
  updateProfile,
  config,
  saveAiConfig,
}: {
  onExport: () => void
  onTriggerLogout: () => void
  profile: Profile | null
  updateProfile: (patch: Partial<Profile>) => Promise<void>
  config: { alpha: number; maxSessionsPerDay: number } | null
  saveAiConfig: (alpha: number, maxSessions: number) => Promise<void>
}) {
  const { t } = useApp()
  const [name, setName] = useState(profile?.patient.name ?? '')
  const [stage, setStageLocal] = useState(profile?.clinical.stage ?? 'mild')
  const [newPin, setNewPin] = useState('')
  const [alpha, setAlpha] = useState(config?.alpha ?? 0.65)
  const [maxSess, setMaxSess] = useState(config?.maxSessionsPerDay ?? 3)

  return (
    <section className="stack mt-lg" style={{ maxWidth: 640 }}>
      <div className="card stack">
        <h3 className="title">Patient</h3>
        <label className="label">{t('onb_name')}</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        <label className="label">Stage</label>
        <div className="row">
          {(['mild', 'moderate'] as const).map((s) => (
            <button key={s} className={`chip chip-selected ${stage === s ? 'chip-blue' : ''}`} style={{ minHeight: 52 }} onClick={() => setStageLocal(s)}>
              {s === 'mild' ? t('onb_stage_mild') : t('onb_stage_moderate')}
            </button>
          ))}
        </div>
        <button
          className="btn btn-primary"
          onClick={async () => {
            await updateProfile({
              patient: { ...(profile?.patient ?? {}), name },
              clinical: { ...(profile?.clinical ?? { stage }), stage },
            })
            window.alert('Saved')
          }}
        >
          {t('save')}
        </button>
      </div>

      <div className="card stack">
        <h3 className="title">AI therapy settings</h3>
        <label className="label">Exploration α ({alpha.toFixed(2)}) — higher tries more variety</label>
        <input type="range" min={0.2} max={1.2} step={0.05} value={alpha} onChange={(e) => setAlpha(parseFloat(e.target.value))} />
        <label className="label">Max sessions per day ({maxSess})</label>
        <input type="range" min={1} max={5} step={1} value={maxSess} onChange={(e) => setMaxSess(parseInt(e.target.value, 10))} />
        <button className="btn btn-primary" onClick={async () => { await saveAiConfig(alpha, maxSess); window.alert('Saved') }}>
          {t('save')}
        </button>
      </div>

      <div className="card stack">
        <h3 className="title">Security</h3>
        <label className="label">Change caregiver PIN</label>
        <input
          className="input"
          inputMode="numeric"
          maxLength={4}
          value={newPin}
          onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="••••"
          style={{ maxWidth: 180, letterSpacing: 8 }}
        />
        <button
          className="btn btn-primary"
          disabled={newPin.length !== 4}
          onClick={async () => {
            await updateProfile({ pin: newPin })
            setNewPin('')
            window.alert('PIN updated')
          }}
        >
          Update PIN
        </button>
      </div>

      <VoiceSettingsCard />

      <div className="card stack">
        <h3 className="title">Data Management & Logout</h3>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn btn-secondary" onClick={onExport}>⬇ Export JSON backup</button>
          <button
            className="btn btn-pearl"
            style={{ color: '#c0392b', borderColor: '#e74c3c' }}
            onClick={onTriggerLogout}
          >
            🚪 Log Out & Delete Patient
          </button>
        </div>
        <button className="btn btn-pearl" onClick={() => navigate('/')}>← {t('nav_home')}</button>
      </div>
    </section>
  )
}

function VoiceSettingsCard() {
  const { lang } = useApp()
  const [voices, setVoices] = useState<VoiceOption[]>([])
  const [selectedURI, setSelectedURI] = useState<string>(getPreferredVoiceURI() ?? '')
  const [speed, setSpeed] = useState(getVoiceSpeed())
  const [pitch, setPitch] = useState(getVoicePitch())
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    const list = getAvailableVoices(lang)
    setVoices(list)
    if (!selectedURI && list.length > 0) {
      setSelectedURI(list[0].voiceURI)
    }
  }, [lang])

  function onSelectVoice(uri: string) {
    setSelectedURI(uri)
    setPreferredVoiceURI(uri || null)
  }

  function onChangeSpeed(val: number) {
    setSpeed(val)
    setVoiceSpeed(val)
  }

  function onChangePitch(val: number) {
    setPitch(val)
    setVoicePitch(val)
  }

  function testVoice() {
    setTesting(true)
    const testText =
      lang === 'hi'
        ? 'नमस्ते! मैं आपकी स्मृति साथी हूँ। आज आप कैसा महसूस कर रहे हैं?'
        : 'Hello! I am your Smriti Sathi companion. How are you feeling today?'
    void speak(testText, lang).then(() => setTesting(false))
  }

  return (
    <div className="card stack">
      <h3 className="title">🎙 Voice Companion (Human Voice Tuning)</h3>
      <p className="caption">
        Customize the AI voice to sound warm, soothing, and natural for the patient.
      </p>

      <label className="label">Active Voice Model</label>
      <select
        className="input"
        value={selectedURI}
        onChange={(e) => onSelectVoice(e.target.value)}
      >
        <option value="">Auto-select Best Natural Voice (Recommended)</option>
        {voices.map((v) => (
          <option key={v.voiceURI} value={v.voiceURI}>
            {v.name} {v.isNatural ? '✨ (Natural/Neural)' : ''} ({v.lang})
          </option>
        ))}
      </select>

      <div className="field">
        <label className="label">Speaking Pace: {speed === 0.9 ? '0.90x (Calm & Gentle - Recommended)' : `${speed.toFixed(2)}x`}</label>
        <input
          type="range"
          min={0.75}
          max={1.15}
          step={0.05}
          value={speed}
          onChange={(e) => onChangeSpeed(parseFloat(e.target.value))}
        />
      </div>

      <div className="field">
        <label className="label">Voice Tone & Warmth: {pitch === 1.02 ? 'Warm (Default)' : `${pitch.toFixed(2)}x`}</label>
        <input
          type="range"
          min={0.85}
          max={1.2}
          step={0.05}
          value={pitch}
          onChange={(e) => onChangePitch(parseFloat(e.target.value))}
        />
      </div>

      <button
        className={`btn ${testing ? 'btn-pearl' : 'btn-primary'}`}
        onClick={testVoice}
        disabled={testing}
        style={{ alignSelf: 'flex-start' }}
      >
        {testing ? '🔊 Speaking...' : '🔊 Test Voice Preview'}
      </button>
    </div>
  )
}

function LogoutModal({
  t,
  onCancel,
  onConfirm,
}: {
  t: (k: string) => string
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="praise-overlay" style={{ zIndex: 100, background: 'rgba(0,0,0,0.85)' }} role="alertdialog" aria-modal="true">
      <div className="card center-col" style={{ maxWidth: 460, width: '90%', padding: 'var(--s-xl)', background: '#fff', color: 'var(--ink)', borderRadius: 'var(--r-xl)' }}>
        <span style={{ fontSize: 56 }}>⚠️</span>
        <h2 className="title" style={{ fontSize: 'var(--fs-title)', color: '#c0392b' }}>
          {t('logout_modal_title')}
        </h2>
        <p className="lead" style={{ fontSize: 'var(--fs-body)', color: 'var(--ink-muted-80)', marginTop: 8, lineHeight: 1.45 }}>
          {t('logout_modal_body')}
        </p>
        <div className="stack mt-lg" style={{ width: '100%', gap: 10 }}>
          <button
            className="btn btn-primary btn-block"
            style={{ background: '#c0392b', minHeight: 56, fontWeight: 600 }}
            onClick={onConfirm}
          >
            🗑 {t('logout_confirm_btn')}
          </button>
          <button
            className="btn btn-pearl btn-block"
            style={{ minHeight: 52 }}
            onClick={onCancel}
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}

function computeWeek(medlog: MedLogEntry[]) {
  const cutoff = Date.now() - 7 * 864e5
  const recent = medlog.filter((e) => e.ts >= cutoff)
  return {
    taken: recent.filter((e) => e.status === 'taken').length,
    missed: recent.filter((e) => e.status === 'missed').length,
    skipped: recent.filter((e) => e.status === 'skipped').length,
    total: Math.max(recent.length, 1),
  }
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
