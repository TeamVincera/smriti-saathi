import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import type { Language, Profile } from '../lib/types'
import { LANGUAGES } from '../lib/types'
import { translate } from '../i18n'
import { speak, stopSpeaking, listenOnce } from '../lib/speech'
import { playChime, playInstrument } from '../lib/audio'
import { useApp } from '../state'
import { seedBaselineForColdStart } from '../lib/ai'
import { SpeakerButton } from '../components/SpeakerButton'
import { Icon } from '../components/Icons'
import { RoundHeader } from '../games/shared'
import { navigate } from '../router'

const AVATARS = ['👵', '👴', '🧓', '👩‍🌾', '👨‍🌾', '🧕', '👩‍🏫', '👨‍🍳']
const STATES = ['Assam', 'Meghalaya', 'Tripura', 'Arunachal Pradesh', 'Nagaland', 'Mizoram', 'Manipur', 'Sikkim']
const FESTIVALS = ['Bihu', 'Wangala', 'Hornbill Festival', 'Durga Puja', 'Bwisagu', 'Ningol Chakouba', 'Losar', 'Chapchar Kut']
const HOBBIES = ['Gardening', 'Cooking', 'Singing', 'Weaving', 'Fishing', 'Temple/Church visits', 'Storytelling']

function useT(lang: Language | null) {
  return useMemo(
    () => (key: string, vars?: Record<string, string | number>) => translate(lang ?? 'en', key, vars),
    [lang]
  )
}

export function Onboarding() {
  const { setProfile } = useApp()
  const [step, setStep] = useState(0)
  const [lang, setLang] = useState<Language | null>(null)
  const t = useT(lang)

  const [patient, setPatient] = useState({ name: '', age: '', photo: '', avatar: '' })
  const [education, setEducation] = useState('')
  const [stage, setStage] = useState<'mild' | 'moderate'>('mild')
  const [diagnosisDate, setDiagnosisDate] = useState('')
  const [doctorContact, setDoctorContact] = useState('')
  const [state_, setState_] = useState('')
  const [community, setCommunity] = useState('')
  const [festivals, setFestivals] = useState<string[]>([])
  const [occupation, setOccupation] = useState('')
  const [hobbies, setHobbies] = useState<string[]>([])
  const [familyMembers, setFamilyMembers] = useState<{ name: string; relation: string; emoji: string; photo?: string }[]>([
    { name: '', relation: '', emoji: '👩' },
  ])
  const [routine, setRoutine] = useState({ wake: '06:00', breakfast: '08:00', lunch: '13:00', dinner: '20:00', sleep: '21:30' })
  const [caregiver, setCaregiver] = useState({ name: '', phone: '', relationship: '' })
  const [asha, setAsha] = useState({ name: '', phone: '' })
  const [pin, setPin] = useState('')

  const fileRef = useRef<HTMLInputElement>(null)
  const famFileRefs = useRef<(HTMLInputElement | null)[]>([])

  const totalSteps = 9

  async function finishBaseline(results: { accuracy: number; latencyMs: number }) {
    await setProfile(buildProfile())
    try {
      const level = seedBaselineForColdStart(results)
      localStorage.setItem('ss_baseline', JSON.stringify({ ...results, level, ts: Date.now() }))
    } catch {}
    navigate('/')
  }

  function buildProfile(): Profile {
    return {
      language: lang ?? 'en',
      patient: {
        name: patient.name.trim() || 'Friend',
        age: patient.age ? parseInt(patient.age, 10) : undefined,
        photo: patient.photo || undefined,
        avatar: patient.avatar || '👵',
        languagesSpoken: lang ? [lang] : [],
        education: education || undefined,
      },
      clinical: { stage, diagnosisDate: diagnosisDate || undefined, doctorContact: doctorContact || undefined },
      cultural: {
        state: state_ || undefined,
        community: community || undefined,
        festivals,
        occupation: occupation || undefined,
        hobbies,
        familyMembers: familyMembers
          .filter((f) => f && f.name && f.name.trim().length > 0)
          .map((f) => ({ name: f.name.trim(), relation: f.relation || 'Family', emoji: f.emoji, photo: f.photo })),
      },
      routine,
      caregiver: { ...caregiver, ashaName: asha.name || undefined, ashaPhone: asha.phone || undefined },
      pin: pin || undefined,
      onboarded: true,
      createdAt: Date.now(),
    }
  }

  function toggle<T>(arr: T[], v: T, set: (a: T[]) => void) {
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
  }

  function onPhoto(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    void import('../lib/image').then((m) => m.resizeImageFile(f)).then((small) => setPatient((p) => ({ ...p, photo: small }))).catch(() => {})
  }

  function onFamilyPhoto(i: number, e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    void import('../lib/image')
      .then((m) => m.resizeImageFile(f))
      .then((small) => setFamilyMembers((arr) => arr.map((x, j) => (j === i ? { ...x, photo: small } : x))))
      .catch(() => {})
  }

  function speakStep(text: string) {
    if (!lang) return
    void speak(text, lang)
  }

  return (
    <div className="app" style={{ background: 'var(--parchment)' }}>
      <header className="nav-global" style={{ paddingInline: 'max(var(--s-lg), env(safe-area-inset-left))' }}>
        <div className="row" style={{ gap: 12 }}>
          <span className="title" style={{ color: '#fff' }}>{t('brand')}</span>
        </div>
        <span className="caption" style={{ color: '#ccc' }}>
          {lang ? `Step ${Math.min(step + 1, totalSteps)} of ${totalSteps}` : ''}
        </span>
      </header>

      <div style={{ padding: 'var(--s-md) var(--s-lg)' }}>
        <div className="progress-track" aria-hidden="true">
          <div className="progress-fill" style={{ width: `${((step + 1) / totalSteps) * 100}%` }} />
        </div>
      </div>

      <main className="page enter-anim" key={step} style={{ paddingTop: 'var(--s-sm)', paddingBottom: '24px' }}>
        {step === 0 && (
          <section className="center-col">
            <h1 className="hero-title">{t('onb_lang_title')}</h1>
            <p className="lead">{t('onb_lang_sub')}</p>
            <div className="option-grid mt-lg" style={{ width: '100%', maxWidth: 780 }}>
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  data-testid={`lang-option-${l.code}`}
                  className={`option-tile ${lang === l.code ? 'selected' : ''}`}
                  onClick={() => {
                    setLang(l.code)
                    void playChime()
                    void speak(t('onb_lang_sub'), l.code)
                  }}
                >
                  <span style={{ fontSize: 28 }}>{lang === l.code ? '🔵' : '⚪'}</span>
                  <span>
                    <strong>{l.native}</strong>
                    <br />
                    <span className="caption">{l.label}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="sticky-cta" style={{ width: '100%' }}>
              <button className="btn btn-primary btn-big btn-block" data-testid="lang-next-btn" disabled={!lang} onClick={() => { stopSpeaking(); setStep(1) }}>
                {t('next')} →
              </button>
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="stack" style={{ maxWidth: 720, margin: '0 auto' }}>
            <div className="row-between">
              <h1 className="display-lg">{t('onb_patient')}</h1>
              <SpeakerButton text={t('onb_name')} lang={lang ?? 'en'} />
            </div>
            <p className="lead">{t('onb_name')} *</p>
            <input
              data-testid="patient-name-input"
              className="input"
              value={patient.name}
              onChange={(e) => setPatient((p) => ({ ...p, name: e.target.value }))}
              placeholder={t('onb_name')}
              autoFocus
            />
            <div className="field">
              <label className="label">{t('onb_age')}</label>
              <input data-testid="patient-age-input" className="input" inputMode="numeric" value={patient.age} onChange={(e) => setPatient((p) => ({ ...p, age: e.target.value.replace(/\D/g, '').slice(0, 3) }))} />
            </div>
            <label className="label">{t('onb_photo')}</label>
            <div className="row">
              <button className="btn btn-pearl" onClick={() => fileRef.current?.click()}>
                <Icon name="camera" /> Photo
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} />
              {patient.photo && <img src={patient.photo} alt="" className="photo-preview" />}
            </div>
            <div className="avatar-row">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  className={`avatar-pick ${(patient.avatar === a && !patient.photo) ? 'selected' : ''}`}
                  onClick={() => {
                    setPatient((p) => ({ ...p, avatar: a, photo: '' }))
                    void playInstrument('bell')
                  }}
                >
                  {a}
                </button>
              ))}
            </div>
            <div className="field mt-lg">
              <label className="label">Education</label>
              <select className="input" value={education} onChange={(e) => setEducation(e.target.value)}>
                <option value="">—</option>
                <option>No formal schooling</option>
                <option>Primary school</option>
                <option>Secondary school</option>
                <option>Higher secondary</option>
                <option>Graduate</option>
              </select>
            </div>
            <NavRow t={t} onBack={() => setStep(0)} onNext={() => setStep(2)} nextEnabled={patient.name.trim().length > 0} onSpeak={() => speakStep(`${t('onb_name')}.`)} />
          </section>
        )}

        {step === 2 && (
          <section className="stack" style={{ maxWidth: 720, margin: '0 auto' }}>
            <h1 className="display-lg">{t('onb_clinical')}</h1>
            <label className="label">Stage</label>
            <div className="row">
              {(['mild', 'moderate'] as const).map((s) => (
                <button key={s} className={`chip chip-selected ${stage === s ? 'chip-blue' : ''}`} style={{ minHeight: 56, fontSize: 'var(--fs-body)' }} onClick={() => setStage(s)}>
                  {s === 'mild' ? t('onb_stage_mild') : t('onb_stage_moderate')}
                </button>
              ))}
            </div>
            <div className="field">
              <label className="label">Diagnosis date (optional)</label>
              <input className="input" type="date" value={diagnosisDate} onChange={(e) => setDiagnosisDate(e.target.value)} />
            </div>
            <div className="field">
              <label className="label">Doctor / PHC contact (optional)</label>
              <input className="input" value={doctorContact} onChange={(e) => setDoctorContact(e.target.value)} placeholder="Name or phone" />
            </div>
            <p className="caption">Medicines can be added later in the Caregiver section.</p>
            <NavRow t={t} onBack={() => setStep(1)} onNext={() => setStep(3)} nextEnabled onSpeak={() => speakStep(t('onb_clinical'))} />
          </section>
        )}

        {step === 3 && (
          <section className="stack" style={{ maxWidth: 760, margin: '0 auto' }}>
            <h1 className="display-lg">{t('onb_cultural')}</h1>
            <div className="field">
              <label className="label">State</label>
              <select className="input" value={state_} onChange={(e) => setState_(e.target.value)}>
                <option value="">—</option>
                {STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="label">Community / tribe (optional)</label>
              <input className="input" value={community} onChange={(e) => setCommunity(e.target.value)} />
            </div>
            <label className="label">Familiar festivals</label>
            <div className="option-grid">
              {FESTIVALS.map((f) => (
                <button key={f} className={`option-tile ${festivals.includes(f) ? 'selected' : ''}`} onClick={() => toggle(festivals, f, setFestivals)}>
                  <span>{festivals.includes(f) ? '✅' : '⚪'}</span> {f}
                </button>
              ))}
            </div>
            <div className="field mt-lg">
              <label className="label">Occupation history (optional)</label>
              <input className="input" value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder="Farmer, teacher, weaver…" />
            </div>
            <label className="label">Hobbies</label>
            <div className="row">
              {HOBBIES.map((h) => (
                <button key={h} className={`chip ${hobbies.includes(h) ? 'chip-selected chip-blue' : ''}`} onClick={() => toggle(hobbies, h, setHobbies)}>
                  {h}
                </button>
              ))}
            </div>
            <NavRow t={t} onBack={() => setStep(2)} onNext={() => setStep(4)} nextEnabled onSpeak={() => speakStep(t('onb_cultural'))} />
          </section>
        )}

        {step === 4 && (
          <section className="stack" style={{ maxWidth: 680, margin: '0 auto' }}>
            <div className="row-between">
              <h1 className="display-lg">👨‍👩‍👧 Faces of Home (Family Members)</h1>
              <SpeakerButton text="Add family members with their names and photos. Their faces will appear in the memory game." lang={lang ?? 'en'} />
            </div>
            <p className="lead">
              Add family members, their relations, and photos. These photos will appear directly in the <strong>Faces of Home</strong> memory game.
            </p>

            <div className="stack" style={{ gap: 'var(--s-md)' }}>
              {familyMembers.map((fm, i) => (
                <div key={i} className="card card-parchment" style={{ padding: 'var(--s-md)', border: '1.5px solid var(--hairline)' }}>
                  <div className="row" style={{ gap: 14, alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <button
                        className="avatar-pick"
                        style={{ width: 84, height: 84, fontSize: 36, overflow: 'hidden', flexShrink: 0, position: 'relative' }}
                        onClick={() => famFileRefs.current[i]?.click()}
                        aria-label="Upload photo"
                      >
                        {fm.photo ? (
                          <img src={fm.photo} alt={fm.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          fm.emoji || '👩'
                        )}
                      </button>
                      <button
                        className="btn btn-pearl"
                        style={{ minHeight: 36, padding: '4px 10px', fontSize: 13 }}
                        onClick={() => famFileRefs.current[i]?.click()}
                      >
                        <Icon name="camera" size={16} /> {fm.photo ? 'Change' : '+ Photo'}
                      </button>
                      <input
                        ref={(el) => {
                          famFileRefs.current[i] = el
                        }}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => onFamilyPhoto(i, e)}
                      />
                    </div>

                    <div className="stack" style={{ flex: 1, gap: 10, minWidth: 0 }}>
                      <div>
                        <label className="label">Name *</label>
                        <input
                          className="input"
                          style={{ minHeight: 48 }}
                          placeholder="e.g. Sarala, Rahul, Runima"
                          value={fm.name}
                          onChange={(e) => setFamilyMembers((arr) => arr.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                        />
                      </div>
                      <div className="row" style={{ gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <label className="label">Relation</label>
                          <input
                            className="input"
                            style={{ minHeight: 48 }}
                            placeholder="Daughter, Son, Spouse…"
                            value={fm.relation}
                            onChange={(e) => setFamilyMembers((arr) => arr.map((x, j) => (j === i ? { ...x, relation: e.target.value } : x)))}
                          />
                        </div>
                        <div style={{ width: 80 }}>
                          <label className="label">Avatar</label>
                          <select
                            className="input"
                            style={{ minHeight: 48, padding: '8px' }}
                            value={fm.emoji}
                            onChange={(e) => setFamilyMembers((arr) => arr.map((x, j) => (j === i ? { ...x, emoji: e.target.value } : x)))}
                          >
                            {['👩', '👨', '👧', '👦', '🧑', '👶', '🧓', '👵', '👴', '🧕'].map((em) => <option key={em}>{em}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="row-between mt-sm" style={{ borderTop: '1px solid var(--hairline)', paddingTop: 8 }}>
                    <span className="caption">
                      {fm.photo ? '✅ Photo uploaded' : '📷 Tap photo icon to upload real picture'}
                    </span>
                    {familyMembers.length > 1 && (
                      <button className="btn btn-pearl" style={{ minHeight: 36, color: '#c0392b' }} onClick={() => setFamilyMembers((arr) => arr.filter((_, j) => j !== i))}>
                        🗑 Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              className="btn btn-pearl mt-sm"
              style={{ alignSelf: 'flex-start' }}
              onClick={() => setFamilyMembers((a) => [...a, { name: '', relation: '', emoji: '👨' }])}
            >
              <Icon name="plus" /> Add another family member
            </button>

            <NavRow t={t} onBack={() => setStep(3)} onNext={() => setStep(5)} nextEnabled onSpeak={() => speakStep('Add your family members with their names and photos.')} />
          </section>
        )}

        {step === 5 && (
          <section className="stack" style={{ maxWidth: 640, margin: '0 auto' }}>
            <h1 className="display-lg">{t('onb_routine')}</h1>
            {(Object.keys(routine) as (keyof typeof routine)[]).map((k) => (
              <div className="field" key={k}>
                <label className="label" style={{ textTransform: 'capitalize' }}>{k} time</label>
                <input className="input" type="time" value={routine[k]} onChange={(e) => setRoutine((r) => ({ ...r, [k]: e.target.value }))} />
              </div>
            ))}
            <NavRow t={t} onBack={() => setStep(4)} onNext={() => setStep(6)} nextEnabled onSpeak={() => speakStep(t('onb_routine'))} />
          </section>
        )}

        {step === 6 && (
          <section className="stack" style={{ maxWidth: 640, margin: '0 auto' }}>
            <h1 className="display-lg">{t('onb_caregiver')}</h1>
            <div className="field">
              <label className="label">Caregiver name</label>
              <input className="input" value={caregiver.name} onChange={(e) => setCaregiver((c) => ({ ...c, name: e.target.value }))} />
            </div>
            <div className="field">
              <label className="label">Phone</label>
              <input className="input" inputMode="tel" value={caregiver.phone} onChange={(e) => setCaregiver((c) => ({ ...c, phone: e.target.value }))} />
            </div>
            <div className="field">
              <label className="label">Relationship</label>
              <select className="input" value={caregiver.relationship} onChange={(e) => setCaregiver((c) => ({ ...c, relationship: e.target.value }))}>
                <option value="">—</option>
                {['Son', 'Daughter', 'Spouse', 'Grandchild', 'Neighbour', 'Other'].map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <hr className="divider" />
            <div className="field">
              <label className="label">ASHA worker (optional)</label>
              <input className="input" placeholder="Name" value={asha.name} onChange={(e) => setAsha((a) => ({ ...a, name: e.target.value }))} />
            </div>
            <div className="field">
              <label className="label">ASHA phone</label>
              <input className="input" inputMode="tel" value={asha.phone} onChange={(e) => setAsha((a) => ({ ...a, phone: e.target.value }))} />
            </div>
            <NavRow t={t} onBack={() => setStep(5)} onNext={() => setStep(7)} nextEnabled onSpeak={() => speakStep(t('onb_caregiver'))} />
          </section>
        )}

        {step === 7 && (
          <section className="stack" style={{ maxWidth: 520, margin: '0 auto', alignItems: 'center', textAlign: 'center' }}>
            <Icon name="lock" size={54} />
            <h1 className="display-lg">{t('pin_setup')}</h1>
            <input
              className="input"
              inputMode="numeric"
              style={{ textAlign: 'center', fontSize: 34, letterSpacing: 14, maxWidth: 260 }}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder='••••'
            />
            <p className="caption">Settings and Caregiver Hub are protected by this PIN. You can also skip and add it later.</p>
            <NavRow t={t} onBack={() => setStep(6)} onNext={() => setStep(8)} nextEnabled={pin.length === 4 || pin.length === 0} hideSkip onSpeak={() => speakStep(t('pin_setup'))} />
          </section>
        )}

        {step === 8 && (
          <BaselineAssessment
            t={t}
            lang={lang ?? 'en'}
            familyMembers={familyMembers.filter((f) => f && f.name && f.name.trim().length > 0)}
            onFinish={(r) => void finishBaseline(r)}
            onBack={() => setStep(7)}
          />
        )}
      </main>
    </div>
  )
}

function NavRow({
  t, onBack, onNext, nextEnabled = true, onSpeak, hideSkip = false,
}: {
  t: (k: string) => string
  onBack: () => void
  onNext: () => void
  nextEnabled?: boolean
  onSpeak: () => void
  hideSkip?: boolean
}) {
  return (
    <div className="sticky-cta">
      <div className="row-between" style={{ width: '100%' }}>
        <div className="row">
          <button className="btn btn-secondary" onClick={onBack}>← {t('back')}</button>
          <button className="icon-btn" aria-label={t('listen')} onClick={onSpeak}>
            <Icon name="speaker" />
          </button>
        </div>
        <div className="row">
          {!hideSkip && (
            <button className="btn btn-pearl" onClick={() => { stopSpeaking(); onNext() }}>
              {t('skip')}
            </button>
          )}
          <button className="btn btn-primary" data-testid="step-next-btn" disabled={!nextEnabled} onClick={() => { stopSpeaking(); onNext() }}>
            {t('next')} →
          </button>
        </div>
      </div>
    </div>
  )
}

function BaselineAssessment({
  t, lang, familyMembers, onFinish, onBack,
}: {
  t: (k: string) => string
  lang: Language
  familyMembers: { name: string; relation: string; emoji: string; photo?: string }[]
  onFinish: (r: { accuracy: number; latencyMs: number }) => void
  onBack: () => void
}) {
  const [round, setRound] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [latencies, setLatencies] = useState<number[]>([])
  const startTs = useRef(Date.now())

  useEffect(() => {
    startTs.current = Date.now()
    void speak(t('onb_baseline_sub'), lang)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Use patient's actual family members if provided!
  const faces = useMemo(() => {
    if (familyMembers.length > 0) {
      return familyMembers.slice(0, 2).map((fm) => ({
        emoji: fm.emoji || '👩',
        photo: fm.photo,
        relation: fm.relation,
        names: [fm.name, 'Kavita', 'Sunil'],
        correctIdx: 0,
      }))
    }
    return [
      { emoji: '👩', photo: undefined, relation: 'Daughter', names: ['Runima', 'Sarala', 'Bhanu'], correctIdx: 1 },
      { emoji: '👴', photo: undefined, relation: 'Son', names: ['Deben', 'Pradip', 'Kamal'], correctIdx: 0 },
    ]
  }, [familyMembers])

  const melodiesRounds = useMemo(() => [
    { inst: 'dhol' as const, options: [{ label: '🪘 Bihu Dhol', isRight: true }, { label: '🔔 Temple Bell', isRight: false }, { label: '📯 Pepa Horn', isRight: false }] },
    { inst: 'flute' as const, options: [{ label: '🪘 Bihu Dhol', isRight: false }, { label: '🪈 Bahi Flute', isRight: true }, { label: '🥁 Wangala Drum', isRight: false }] },
  ], [])

  const seqRounds = useMemo(() => [
    { items: ['🍵', '🫖', '🔥'], correctOrder: [2, 1, 0], labels: ['Tea', 'Kettle', 'Stove'] },
  ], [])

  const roundsTotal = faces.length + melodiesRounds.length + seqRounds.length

  function record(isCorrect: boolean) {
    setLatencies((l) => [...l, Date.now() - startTs.current])
    if (isCorrect) setCorrect((c) => c + 1)
    void playChime()
    setTimeout(() => {
      startTs.current = Date.now()
      setRound((r) => r + 1)
    }, 900)
  }

  if (round >= roundsTotal) {
    const accuracy = correct / roundsTotal
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / Math.max(latencies.length, 1)
    return (
      <section className="center-col" style={{ maxWidth: 620, margin: '0 auto' }}>
        <div className="praise-stars">🌟</div>
        <h1 className="display-lg">{t('praise_title')}</h1>
        <p className="lead">Smriti Sathi has learned a comfortable starting level for you.</p>
        <button className="btn btn-primary btn-big mt-lg" onClick={() => onFinish({ accuracy, latencyMs: avgLatency })}>
          {t('done')} 🌺
        </button>
      </section>
    )
  }

  if (round < faces.length) {
    const r = faces[round]
    return (
      <div className="center-col" style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>
        <RoundHeader now={round + 1} total={roundsTotal} />
        <InstructionBarLite text={t('g_faces_intro')} t={t} lang={lang} />
        <div className="card card-dark center-col" style={{ padding: 'var(--s-lg)', width: 220, height: 220, borderRadius: 'var(--r-xl)', justifyContent: 'center' }}>
          {r.photo ? (
            <img src={r.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--r-lg)' }} />
          ) : (
            <span style={{ fontSize: 96 }}>{r.emoji}</span>
          )}
          {r.relation && <span className="caption" style={{ color: '#ccc', marginTop: 6 }}>{r.relation}</span>}
        </div>
        <div className="row mt-lg" style={{ justifyContent: 'center', gap: 'var(--s-md)' }}>
          {r.names.map((n, i) => (
            <button key={n} className="choice-btn" onClick={() => record(i === r.correctIdx)} style={{ minWidth: 150 }}>
              <span style={{ fontSize: 'var(--fs-body-lg)' }}>{n}</span>
            </button>
          ))}
        </div>
        <button className="btn btn-pearl mt-lg" onClick={onBack}>← {t('back')}</button>
      </div>
    )
  }

  if (round < faces.length + melodiesRounds.length) {
    const r = melodiesRounds[round - faces.length]
    return (
      <div className="center-col" style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>
        <RoundHeader now={round + 1} total={roundsTotal} />
        <InstructionBarLite text={t('g_melodies_intro')} t={t} lang={lang} />
        <button className="btn btn-primary btn-big mt-md" onClick={() => playInstrument(r.inst)}>
          ▶ {t('listen')}
        </button>
        <div className="row mt-lg" style={{ justifyContent: 'center', gap: 'var(--s-md)' }}>
          {r.options.map((opt, i) => (
            <button key={i} className="choice-btn" onClick={() => record(opt.isRight)} style={{ minWidth: 160 }}>
              <span style={{ fontSize: 'var(--fs-body-lg)' }}>{opt.label}</span>
            </button>
          ))}
        </div>
        <button className="btn btn-pearl mt-lg" onClick={onBack}>← {t('back')}</button>
      </div>
    )
  }

  const sr = seqRounds[0]
  return (
    <SequenceBaseline
      now={round + 1}
      total={roundsTotal}
      prompt={t('g_sequence_intro')}
      items={sr.items}
      labels={sr.labels}
      correctOrder={sr.correctOrder}
      onDone={(okCount) => record(okCount === sr.items.length)}
      t={t}
      onBack={onBack}
      lang={lang}
    />
  )
}

function SequenceBaseline({
  now, total, prompt, items, labels, correctOrder, onDone, t, onBack, lang,
}: {
  now: number
  total: number
  prompt: string
  items: string[]
  labels: string[]
  correctOrder: number[]
  onDone: (okCount: number) => void
  t: (k: string) => string
  onBack: () => void
  lang: Language
}) {
  const [placed, setPlaced] = useState<number[]>([])
  return (
    <section className="center-col" style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>
      <RoundHeader now={now} total={total} />
      <InstructionBarLite text={prompt} t={t} lang={lang} />
      <div className="row mt-md" style={{ justifyContent: 'center' }}>
        {items.map((it, i) => (
          <div key={i} className={`slot ${placed[i] !== undefined ? 'filled' : ''}`}>
            {placed[i] !== undefined ? `${items[placed[i]]} ${labels[placed[i]]}` : `Step ${i + 1}`}
          </div>
        ))}
      </div>
      <div className="row mt-md" style={{ justifyContent: 'center' }}>
        {items.map((it, itemIdx) =>
          placed.includes(itemIdx) ? null : (
            <button
              key={itemIdx}
              className="item-tile"
              onClick={() => {
                const next = [...placed, itemIdx]
                setPlaced(next)
                if (next.length === items.length) {
                  const oks = next.filter((ii, slot) => correctOrder[slot] === ii).length
                  setTimeout(() => onDone(oks), 800)
                }
              }}
            >
              <span className="big">{it}</span>
              <span>{labels[itemIdx]}</span>
            </button>
          )
        )}
      </div>
      <button className="btn btn-pearl mt-lg" onClick={onBack}>← {t('back')}</button>
    </section>
  )
}

export function InstructionBarLite({ text, t, lang }: { text: string; t: (k: string) => string; lang: Language }) {
  return (
    <div className="instruction-bar" style={{ borderRadius: 'var(--r-pill)', border: '1px solid var(--hairline)', position: 'static', width: '100%', maxWidth: 640 }}>
      <p>{text}</p>
      <SpeakerButton text={text} lang={lang} />
    </div>
  )
}
