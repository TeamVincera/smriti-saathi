import { useState, useEffect, useRef, type ChangeEvent } from 'react'
import { useApp } from '../state'
import { LANGUAGES, type Language } from '../lib/types'
import type { Profile } from '../lib/types'
export { sanitizePersonName } from '../lib/formatters'
import { sanitizePersonName, calculateAgeFromDob } from '../lib/formatters'
import { translate } from '../i18n'
import { playChime, playTap } from '../lib/audio'
import { Icon } from '../components/Icons'
import { navigate } from '../router'
import { seedBaselineForColdStart } from '../lib/ai'

export const FESTIVALS = ['Bihu', 'Durga Puja', 'Ali-Aye-Ligang', 'Baishagu', 'Me-Dam-Me-Phi', 'Diwali', 'Chhath']
export const HOBBIES = ['Gardening', 'Weaving', 'Singing', 'Cooking', 'Tea making', 'Storytelling', 'Folk songs']
export const STATES = ['Assam', 'Meghalaya', 'Manipur', 'Nagaland', 'Mizoram', 'Tripura', 'Arunachal Pradesh', 'Sikkim', 'Other']

export const COUNTRY_CODES = [
  { code: 'IN', dial: '+91', label: 'India (+91)', digits: 10 },
  { code: 'AE', dial: '+971', label: 'UAE (+971)', digits: 9 },
  { code: 'US', dial: '+1', label: 'USA (+1)', digits: 10 },
  { code: 'GB', dial: '+44', label: 'UK (+44)', digits: 10 },
  { code: 'BD', dial: '+880', label: 'Bangladesh (+880)', digits: 10 },
  { code: 'NP', dial: '+977', label: 'Nepal (+977)', digits: 10 },
]

export function Onboarding() {
  const { setProfile, t } = useApp()
  const [lang, setLang] = useState<Language>('en')
  const [step, setStep] = useState(() => {
    if (typeof window !== 'undefined') {
      const s = new URLSearchParams(window.location.search).get('step')
      if (s !== null && !isNaN(Number(s))) return Number(s)
    }
    return 0
  })
  const onbT = (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars)

  // Step 1: Patient details
  const [patient, setPatient] = useState({
    name: '',
    dob: '',
    age: '',
    avatar: '👵',
    photo: '',
  })
  const [education, setEducation] = useState('Secondary school')

  // Step 2: Clinical
  const [stage, setStage] = useState<'mild' | 'moderate'>('mild')
  const [diagnosisDate, setDiagnosisDate] = useState('')
  const [doctorContact, setDoctorContact] = useState('')

  // Step 3: Culture
  const [state_, setState_] = useState('Assam')
  const [community, setCommunity] = useState('')
  const [occupation, setOccupation] = useState('')
  const [festivals, setFestivals] = useState<string[]>(['Bihu'])
  const [customFestival, setCustomFestival] = useState('')
  const [showOtherFestival, setShowOtherFestival] = useState(false)
  const [hobbies, setHobbies] = useState<string[]>(['Gardening'])
  const [customHobby, setCustomHobby] = useState('')
  const [showOtherHobby, setShowOtherHobby] = useState(false)

  // Step 4: Family members (starts with clean empty input slot)
  const [familyMembers, setFamilyMembers] = useState<{ name: string; relation: string; emoji: string; photo?: string }[]>([
    { name: '', relation: 'Daughter', emoji: '👩' },
  ])

  // Step 5: Routine
  const [routine, setRoutine] = useState({
    wake: '06:00',
    breakfast: '08:00',
    lunch: '13:00',
    dinner: '20:00',
    sleep: '21:30',
  })

  // Step 6: Caregiver
  const [caregiver, setCaregiver] = useState({ name: '', phone: '', relationship: 'Son' })
  const [caregiverCountry, setCaregiverCountry] = useState('+91')
  const [customRelation, setCustomRelation] = useState('')
  const [asha, setAsha] = useState({ name: '', phone: '' })
  const [ashaCountry, setAshaCountry] = useState('+91')

  // Step 7: PIN
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [activePinField, setActivePinField] = useState<'pin' | 'confirm'>('pin')

  const pinInputRef = useRef<HTMLInputElement>(null)
  const confirmInputRef = useRef<HTMLInputElement>(null)

  function handlePinDigit(digit: string) {
    if (activePinField === 'pin') {
      if (pin.length < 4) {
        const next = (pin + digit).slice(0, 4)
        setPin(next)
        if (next.length === 4) {
          setTimeout(() => {
            setActivePinField('confirm')
            confirmInputRef.current?.focus()
          }, 180)
        }
      }
    } else {
      if (confirmPin.length < 4) {
        const next = (confirmPin + digit).slice(0, 4)
        setConfirmPin(next)
      }
    }
  }

  function handlePinBackspace() {
    if (activePinField === 'pin') {
      setPin((p) => p.slice(0, -1))
    } else {
      if (confirmPin.length > 0) {
        setConfirmPin((p) => p.slice(0, -1))
      } else {
        setActivePinField('pin')
        setTimeout(() => pinInputRef.current?.focus(), 50)
      }
    }
  }

  const fileRef = useRef<HTMLInputElement>(null)
  const famFileRefs = useRef<(HTMLInputElement | null)[]>([])

  const selectedCaregiverCountry = COUNTRY_CODES.find((c) => c.dial === caregiverCountry) ?? COUNTRY_CODES[0]
  const selectedAshaCountry = COUNTRY_CODES.find((c) => c.dial === ashaCountry) ?? COUNTRY_CODES[0]

  function onDobChange(dobVal: string) {
    const computedAge = calculateAgeFromDob(dobVal)
    setPatient((p) => ({ ...p, dob: dobVal, age: computedAge !== null ? String(computedAge) : p.age }))
  }

  function addCustomFestival() {
    const f = customFestival.trim()
    if (!f) return
    if (!festivals.includes(f)) {
      setFestivals((prev) => [...prev, f])
    }
    setCustomFestival('')
  }

  function addCustomHobby() {
    const h = customHobby.trim()
    if (!h) return
    if (!hobbies.includes(h)) {
      setHobbies((prev) => [...prev, h])
    }
    setCustomHobby('')
  }

  async function finishBaseline(results: { accuracy: number; latencyMs: number }) {
    await setProfile(buildProfile())
    try {
      const level = seedBaselineForColdStart(results)
      localStorage.setItem('ss_baseline', JSON.stringify({ ...results, level, ts: Date.now() }))
    } catch {}
    navigate('/')
  }

  function buildProfile(): Profile {
    const finalCaregiverPhone = caregiver.phone ? `${caregiverCountry} ${caregiver.phone}` : ''
    const finalAshaPhone = asha.phone ? `${ashaCountry} ${asha.phone}` : ''
    const finalRelation = caregiver.relationship === 'Other' && customRelation.trim() ? customRelation.trim() : caregiver.relationship
    return {
      language: lang ?? 'en',
      patient: {
        name: patient.name.trim() || 'Friend',
        dob: patient.dob || undefined,
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
          .map((f) => ({
            name: f.name.trim(),
            relation: f.relation || 'Family',
            emoji: f.emoji || '👩',
            photo: f.photo,
          })),
      },
      routine,
      caregiver: {
        name: caregiver.name.trim() || 'Caregiver',
        phone: finalCaregiverPhone || '9876543210',
        relationship: finalRelation || 'Family',
        ashaName: asha.name ? asha.name.trim() : undefined,
        ashaPhone: finalAshaPhone || undefined,
      },
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

  return (
    <div className="app">
      <main className="page-standalone enter-anim" key={step}>
        {/* Step 0: Choose Your Language */}
        {step === 0 && (
          <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>
              Choose your language
            </h1>
            <p style={{ fontSize: 16, color: 'var(--ink-secondary)', lineHeight: 1.5, marginBottom: 36, maxWidth: 360 }}>
              {onbT('onb_lang_sub2')}
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 16,
                width: '100%',
                marginBottom: 48,
              }}
            >
              {LANGUAGES.map((l) => {
                const isSelected = lang === l.code
                return (
                  <button
                    key={l.code}
                    type="button"
                    aria-label={`Select language: ${l.native}`}
                    data-testid={`lang-option-${l.code}`}
                    onClick={() => setLang(l.code)}
                    style={{
                      background: 'var(--card)',
                      border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                      borderRadius: 12,
                      padding: '24px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: 90,
                      gap: 6,
                      boxShadow: isSelected ? '0 4px 12px rgba(22, 36, 54, 0.08)' : '0 1px 3px rgba(0, 0, 0, 0.02)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.2 }}>
                      {l.native}
                    </span>
                    {l.code !== 'en' && (
                      <span style={{ fontSize: 14, color: 'var(--ink-muted)' }}>
                        {l.label}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <button
              className="btn btn-block"
              data-testid="lang-next-btn"
              disabled={!lang}
              onClick={() => setStep(1)}
              style={{
                background: 'var(--secondary)',
                color: '#fff',
                borderRadius: 28,
                minHeight: 56,
                fontSize: 18,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {onbT('onb_continue')}
            </button>
          </section>
        )}

        {/* Step 1: Patient Details */}
        {step === 1 && (
          <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--ink)', textAlign: 'center', marginBottom: 10 }}>
              {onbT('onb_patient')}
            </h1>
            <p style={{ fontSize: 15, color: 'var(--ink-secondary)', textAlign: 'center', lineHeight: 1.5, marginBottom: 24, maxWidth: 360 }}>
              {onbT('onb_patient_sub')}
            </p>

            <div className="card" style={{ width: '100%', padding: '24px 20px', borderRadius: 24, marginBottom: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 20 }}>
                {onbT('onb_photo_title')}
              </h3>

              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  width: 110,
                  height: 110,
                  borderRadius: '50%',
                  background: 'var(--pastel-blue)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  marginBottom: 16,
                  color: 'var(--pastel-blue-text)',
                  border: '2px solid #92CCE8',
                }}
              >
                {patient.photo ? (
                  <img src={patient.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Icon name="cameraPlus" size={44} color="var(--ink-muted)" />
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} />

              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                {['👵', '👴', '🧕', '🧑'].map((av) => (
                  <button
                    key={av}
                    type="button"
                    className={`btn ${patient.avatar === av ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setPatient((p) => ({ ...p, avatar: av }))}
                    style={{ fontSize: 22, padding: '6px 14px', borderRadius: 12 }}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            <div className="card" style={{ width: '100%', padding: '24px 20px', borderRadius: 24, marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 20 }}>
                {onbT('onb_personal_details')}
              </h3>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                  {onbT('onb_full_name')}
                </label>
                <input
                  data-testid="patient-name-input"
                  className="input"
                  value={patient.name}
                  onChange={(e) => setPatient((p) => ({ ...p, name: sanitizePersonName(e.target.value) }))}
                  placeholder="e.g. Anjali Sharma"
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                  {onbT('onb_dob')}
                </label>
                <input
                  data-testid="patient-dob-input"
                  className="input"
                  type="date"
                  value={patient.dob}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => onDobChange(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                  {onbT('onb_age')}
                </label>
                <input
                  data-testid="patient-age-input"
                  className="input"
                  value={patient.age}
                  onChange={(e) => setPatient((p) => ({ ...p, age: e.target.value.replace(/\D/g, '') }))}
                  placeholder="e.g. 74"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                  {onbT('onb_education')}
                </label>
                <select
                  className="input"
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                >
                  <option value="">{onbT('onb_edu_select')}</option>
                  <option value="Primary school">{onbT('onb_edu_primary')}</option>
                  <option value="Middle school">{onbT('onb_edu_middle')}</option>
                  <option value="Secondary school">{onbT('onb_edu_secondary')}</option>
                  <option value="Higher secondary">{onbT('onb_edu_higher')}</option>
                  <option value="Graduate / Professional">{onbT('onb_edu_graduate')}</option>
                  <option value="Informal / Self-taught">{onbT('onb_edu_informal')}</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
              <button type="button" className="btn btn-secondary btn-block" onClick={() => setStep(0)} style={{ borderRadius: 14, minHeight: 44 }}>
                {onbT('back')}
              </button>
              <button
                type="button"
                className="btn btn-cta btn-block"
                data-testid="step-next-btn"
                disabled={patient.name.trim().length === 0}
                onClick={() => setStep(2)}
                style={{ borderRadius: 14, minHeight: 44 }}
              >
                {onbT('next')}
              </button>
            </div>
          </section>
        )}

        {/* Step 2: Clinical Context */}
        {step === 2 && (
          <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--ink)', textAlign: 'center', marginBottom: 8 }}>
              {onbT('onb_clinical')}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--ink-secondary)', textAlign: 'center', marginBottom: 24 }}>
              {onbT('onb_clinical_sub')}
            </p>

            <div className="card" style={{ width: '100%', borderRadius: 24, padding: 24, marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>
                {onbT('onb_dementia_stage')}
              </label>
              <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                {(['mild', 'moderate'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`btn ${stage === s ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, minHeight: 48, borderRadius: 12 }}
                    onClick={() => setStage(s)}
                  >
                    {s === 'mild' ? onbT('onb_mild_stage') : onbT('onb_moderate_stage')}
                  </button>
                ))}
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                  {onbT('onb_diagnosis_date')}
                </label>
                <input
                  className="input"
                  type="date"
                  value={diagnosisDate}
                  onChange={(e) => setDiagnosisDate(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                  {onbT('onb_doctor_contact')}
                </label>
                <input
                  className="input"
                  value={doctorContact}
                  onChange={(e) => setDoctorContact(e.target.value)}
                  placeholder="Doctor Name or Phone"
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
              <button type="button" className="btn btn-secondary btn-block" onClick={() => setStep(1)} style={{ borderRadius: 14, minHeight: 44 }}>
                {onbT('back')}
              </button>
              <button type="button" className="btn btn-cta btn-block" data-testid="step-next-btn" onClick={() => setStep(3)} style={{ borderRadius: 14, minHeight: 44 }}>
                {onbT('next')}
              </button>
            </div>
          </section>
        )}

        {/* Step 3: Home & Culture */}
        {step === 3 && (
          <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--ink)', textAlign: 'center', marginBottom: 8 }}>
              {onbT('onb_cultural')}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--ink-secondary)', textAlign: 'center', marginBottom: 24 }}>
              {onbT('onb_cultural_sub')}
            </p>

            <div className="card" style={{ width: '100%', borderRadius: 24, padding: 24, marginBottom: 24 }}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                  {onbT('onb_state_region')}
                </label>
                <select className="input" value={state_} onChange={(e) => setState_(e.target.value)}>
                  <option value="">{onbT('onb_select_state')}</option>
                  {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                  {onbT('onb_festivals')}
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {festivals.concat(FESTIVALS.filter((f) => !festivals.includes(f))).map((f) => {
                    const isSel = festivals.includes(f)
                    return (
                      <button
                        key={f}
                        type="button"
                        className={`chip ${isSel ? 'chip-blue' : ''}`}
                        onClick={() => toggle(festivals, f, setFestivals)}
                        style={{ cursor: 'pointer' }}
                      >
                        {isSel ? '✓ ' : '+ '} {f}
                      </button>
                    )
                  })}
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <input
                    className="input"
                    style={{ flex: 1, minHeight: 44, fontSize: 14 }}
                    placeholder={onbT('onb_festival_placeholder')}
                    value={customFestival}
                    onChange={(e) => setCustomFestival(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customFestival.trim()) {
                        e.preventDefault()
                        addCustomFestival()
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ minHeight: 44, padding: '0 16px', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}
                    disabled={!customFestival.trim()}
                    onClick={addCustomFestival}
                  >
                    {onbT('onb_add')}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                  {onbT('onb_hobbies')}
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {hobbies.concat(HOBBIES.filter((h) => !hobbies.includes(h))).map((h) => {
                    const isSel = hobbies.includes(h)
                    return (
                      <button
                        key={h}
                        type="button"
                        className={`chip ${isSel ? 'chip-blue' : ''}`}
                        onClick={() => toggle(hobbies, h, setHobbies)}
                        style={{ cursor: 'pointer' }}
                      >
                        {isSel ? '✓ ' : '+ '} {h}
                      </button>
                    )
                  })}
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <input
                    className="input"
                    style={{ flex: 1, minHeight: 44, fontSize: 14 }}
                    placeholder={onbT('onb_hobby_placeholder')}
                    value={customHobby}
                    onChange={(e) => setCustomHobby(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customHobby.trim()) {
                        e.preventDefault()
                        addCustomHobby()
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ minHeight: 44, padding: '0 16px', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}
                    disabled={!customHobby.trim()}
                    onClick={addCustomHobby}
                  >
                    {onbT('onb_add')}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
              <button type="button" className="btn btn-secondary btn-block" onClick={() => setStep(2)} style={{ borderRadius: 14, minHeight: 44 }}>
                {onbT('back')}
              </button>
              <button type="button" className="btn btn-cta btn-block" data-testid="step-next-btn" onClick={() => setStep(4)} style={{ borderRadius: 14, minHeight: 44 }}>
                {onbT('next')}
              </button>
            </div>
          </section>
        )}

        {/* Step 4: Faces of Home */}
        {step === 4 && (
          <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--ink)', textAlign: 'center', marginBottom: 8 }}>
              {onbT('onb_faces_title')}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--ink-secondary)', textAlign: 'center', marginBottom: 24 }}>
              {onbT('onb_faces_sub')}
            </p>

            <div className="card" style={{ width: '100%', borderRadius: 24, padding: 24, marginBottom: 24 }}>
              {familyMembers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px 8px' }}>
                  <p style={{ fontSize: 14, color: 'var(--ink-secondary)', marginBottom: 16 }}>
                    No family members added yet. You can add family members now or configure them later in the Caregiver Hub.
                  </p>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setFamilyMembers([{ name: '', relation: 'Daughter', emoji: '👩' }])}
                    style={{ borderRadius: 12, padding: '10px 24px', fontWeight: 600 }}
                  >                     {onbT('onb_add_member_btn')}
                  </button>
                </div>
              ) : (
                <>
                  {familyMembers.map((fm, i) => (
                    <div key={i} style={{ marginBottom: 24, paddingBottom: 16, borderBottom: i < familyMembers.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase' }}>
                          {onbT('onb_member_num')} {i + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => setFamilyMembers((arr) => arr.filter((_, j) => j !== i))}
                          style={{ background: 'none', border: 'none', color: 'var(--error)', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
                        >
                          {onbT('onb_remove')}
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 20 }}>
                        <div
                          onClick={() => famFileRefs.current[i]?.click()}
                          style={{
                            width: 100,
                            height: 100,
                            borderRadius: '50%',
                            border: '2px dashed var(--ink)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            overflow: 'hidden',
                            marginBottom: 12,
                            background: 'var(--surface-muted)',
                          }}
                        >
                          {fm.photo ? (
                            <img src={fm.photo} alt={fm.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <Icon name="cameraPlus" size={36} color="var(--ink)" />
                          )}
                        </div>
                        <input
                          ref={(el) => {
                            famFileRefs.current[i] = el
                          }}
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={(e) => onFamilyPhoto(i, e)}
                        />
                        <strong style={{ fontSize: 16, color: 'var(--ink)', marginBottom: 4 }}>{onbT('onb_member_photo')}</strong>
                        <span style={{ fontSize: 13, color: 'var(--ink-secondary)', maxWidth: 260, marginBottom: 12 }}>
                          {onbT('onb_photo_hint')}
                        </span>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => famFileRefs.current[i]?.click()}
                          style={{
                            background: 'var(--surface-muted)',
                            border: 'none',
                            borderRadius: 12,
                            padding: '6px 20px',
                            fontSize: 14,
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <Icon name="upload" size={16} /> {onbT('onb_select_photo')}
                        </button>
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                          {onbT('onb_full_name_label')}
                        </label>
                        <input
                          className="input"
                          value={fm.name}
                          onChange={(e) => setFamilyMembers((arr) => arr.map((x, j) => (j === i ? { ...x, name: sanitizePersonName(e.target.value) } : x)))}
                          placeholder="e.g. Sarala, Rahul, Runima"
                          style={{ borderRadius: 10, border: '1.5px solid var(--ink)' }}
                        />
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                          {onbT('onb_relationship_label')}
                        </label>
                        <select
                          className="input"
                          value={fm.relation}
                          onChange={(e) => setFamilyMembers((arr) => arr.map((x, j) => (j === i ? { ...x, relation: e.target.value } : x)))}
                          style={{ borderRadius: 10, border: '1.5px solid var(--ink)' }}
                        >
                          <option value="">{onbT('onb_select_relation')}</option>
                          <option value="Daughter">Daughter</option>
                          <option value="Son">Son</option>
                          <option value="Spouse">Spouse</option>
                          <option value="Sister">Sister</option>
                          <option value="Brother">Brother</option>
                          <option value="Grandchild">Grandchild</option>
                          <option value="Niece">Niece</option>
                          <option value="Nephew">Nephew</option>
                          <option value="Friend">Friend</option>
                        </select>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="btn btn-secondary btn-block"
                    onClick={() => setFamilyMembers((a) => [...a, { name: '', relation: 'Daughter', emoji: '👩' }])}
                    style={{ borderRadius: 12 }}
                  >                     {onbT('onb_add_member')}
                  </button>
                </>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
              <button type="button" className="btn btn-secondary btn-block" onClick={() => setStep(3)} style={{ borderRadius: 14, minHeight: 44 }}>
                {onbT('back')}
              </button>
              <button type="button" className="btn btn-cta btn-block" data-testid="step-next-btn" onClick={() => setStep(5)} style={{ borderRadius: 14, minHeight: 44 }}>
                {onbT('next')}
              </button>
            </div>
          </section>
        )}

        {/* Step 5: Daily Routine */}
        {step === 5 && (
          <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--ink)', textAlign: 'center', marginBottom: 8 }}>
              {onbT('onb_routine')}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--ink-secondary)', textAlign: 'center', marginBottom: 24 }}>
              {onbT('onb_routine_sub')}
            </p>

            <div className="card" style={{ width: '100%', borderRadius: 24, padding: 24, marginBottom: 24 }}>
              {([
                { labelKey: 'onb_wake', key: 'wake' },
                { labelKey: 'onb_breakfast', key: 'breakfast' },
                { labelKey: 'onb_lunch', key: 'lunch' },
                { labelKey: 'onb_dinner', key: 'dinner' },
                { labelKey: 'onb_bedtime', key: 'sleep' },
              ] as const).map((item) => (
                <div key={item.key} style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', textTransform: 'uppercase', marginBottom: 6 }}>
                    {onbT(item.labelKey)}
                  </label>
                  <input
                    className="input"
                    type="time"
                    value={routine[item.key as keyof typeof routine]}
                    onChange={(e) => setRoutine({ ...routine, [item.key]: e.target.value })}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
              <button type="button" className="btn btn-secondary btn-block" onClick={() => setStep(4)} style={{ borderRadius: 14, minHeight: 44 }}>
                {onbT('back')}
              </button>
              <button type="button" className="btn btn-cta btn-block" data-testid="step-next-btn" onClick={() => setStep(6)} style={{ borderRadius: 14, minHeight: 44 }}>
                {onbT('next')}
              </button>
            </div>
          </section>
        )}

        {/* Step 6: Caregiver Details */}
        {step === 6 && (
          <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--ink)', textAlign: 'center', marginBottom: 8 }}>
              {onbT('onb_caregiver')}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--ink-secondary)', textAlign: 'center', marginBottom: 24 }}>
              {onbT('onb_caregiver_sub')}
            </p>

            <div className="card" style={{ width: '100%', borderRadius: 24, padding: 24, marginBottom: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', textTransform: 'uppercase', marginBottom: 6 }}>
                  {onbT('onb_cg_name')}
                </label>
                <input
                  className="input"
                  value={caregiver.name}
                  onChange={(e) => setCaregiver((c) => ({ ...c, name: sanitizePersonName(e.target.value) }))}
                  placeholder={onbT('onb_cg_name')}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', textTransform: 'uppercase', marginBottom: 6 }}>
                  {onbT('onb_cg_phone')}
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select
                    data-testid="caregiver-country-select"
                    className="input"
                    style={{ width: 110, flexShrink: 0 }}
                    value={caregiverCountry}
                    onChange={(e) => setCaregiverCountry(e.target.value)}
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.dial}>{c.dial}</option>
                    ))}
                  </select>
                  <input
                    data-testid="caregiver-phone-input"
                    className="input"
                    type="tel"
                    maxLength={10}
                    value={caregiver.phone}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                      setCaregiver((c) => ({ ...c, phone: digits }))
                    }}
                    placeholder="10-digit mobile number"
                  />
                </div>
                {caregiver.phone.length > 0 && caregiver.phone.length < 10 && (
                  <p className="caption" style={{ color: 'var(--error)', marginTop: 6, fontWeight: 600, textAlign: 'left' }}>
                    {onbT('onb_phone_invalid')}
                  </p>
                )}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', textTransform: 'uppercase', marginBottom: 6 }}>
                  {onbT('onb_cg_relation')}
                </label>
                <select
                  className="input"
                  value={caregiver.relationship}
                  onChange={(e) => setCaregiver((c) => ({ ...c, relationship: e.target.value }))}
                >
                  <option value="">{onbT('onb_select_relation')}</option>
                  <option value="Son">Son</option>
                  <option value="Daughter">Daughter</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Grandchild">Grandchild</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--border)' }} />

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', textTransform: 'uppercase', marginBottom: 6 }}>
                  {onbT('onb_asha_name')}
                </label>
                <input
                  data-testid="asha-name-input"
                  className="input"
                  value={asha.name}
                  onChange={(e) => setAsha((a) => ({ ...a, name: sanitizePersonName(e.target.value) }))}
                  placeholder="ASHA worker name"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', textTransform: 'uppercase', marginBottom: 6 }}>
                  {onbT('onb_asha_phone')}
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select
                    data-testid="asha-country-select"
                    className="input"
                    style={{ width: 110, flexShrink: 0 }}
                    value={ashaCountry}
                    onChange={(e) => setAshaCountry(e.target.value)}
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.dial}>{c.dial}</option>
                    ))}
                  </select>
                  <input
                    data-testid="asha-phone-input"
                    className="input"
                    type="tel"
                    maxLength={10}
                    value={asha.phone}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                      setAsha((a) => ({ ...a, phone: digits }))
                    }}
                    placeholder="10-digit phone number"
                  />
                </div>
                {asha.phone.length > 0 && asha.phone.length < 10 && (
                  <p className="caption" style={{ color: 'var(--error)', marginTop: 6, fontWeight: 600, textAlign: 'left' }}>
                    {onbT('onb_phone_invalid')}
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
              <button type="button" className="btn btn-secondary btn-block" onClick={() => setStep(5)} style={{ borderRadius: 14, minHeight: 44 }}>
                {onbT('back')}
              </button>
              <button
                type="button"
                className="btn btn-cta btn-block"
                data-testid="step-next-btn"
                disabled={
                  caregiver.name.trim().length === 0 ||
                  caregiver.phone.length !== 10 ||
                  (asha.phone.length > 0 && asha.phone.length !== 10) ||
                  !caregiver.relationship
                }
                onClick={() => setStep(7)}
                style={{ borderRadius: 14, minHeight: 44 }}
              >
                {onbT('next')}
              </button>
            </div>
          </section>
        )}

        {/* Step 7: PIN Setup */}
        {step === 7 && (
          <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'var(--primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Icon name="shield" size={28} color="var(--ink-on-dark)" />
            </div>

            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--ink)', textAlign: 'center', marginBottom: 8 }}>
              {onbT('pin_setup')}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--ink-secondary)', textAlign: 'center', marginBottom: 20 }}>
              {onbT('onb_pin_sub')}
            </p>

            {/* Step indicators in a row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => {
                  setActivePinField('pin')
                  setTimeout(() => pinInputRef.current?.focus(), 50)
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  background: activePinField === 'pin' ? 'var(--primary)' : 'var(--surface-muted)',
                  color: activePinField === 'pin' ? '#ffffff' : 'var(--ink)',
                  border: activePinField === 'pin' ? '2px solid var(--primary)' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <span>{pin.length === 4 ? '✓' : '1'}</span>
                <span>{onbT('onb_pin_label')}</span>
              </button>

              <span style={{ color: 'var(--ink-secondary)', fontSize: 14, fontWeight: 700 }}>➔</span>

              <button
                type="button"
                disabled={pin.length < 4}
                onClick={() => {
                  if (pin.length === 4) {
                    setActivePinField('confirm')
                    setTimeout(() => confirmInputRef.current?.focus(), 50)
                  }
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  background: activePinField === 'confirm' ? 'var(--primary)' : 'var(--surface-muted)',
                  color: activePinField === 'confirm' ? '#ffffff' : 'var(--ink)',
                  border: activePinField === 'confirm' ? '2px solid var(--primary)' : '2px solid transparent',
                  cursor: pin.length === 4 ? 'pointer' : 'not-allowed',
                  opacity: pin.length === 4 ? 1 : 0.6,
                  transition: 'all 0.2s ease',
                }}
              >
                <span>{pin.length === 4 && confirmPin === pin ? '✓' : '2'}</span>
                <span>{onbT('onb_confirm_pin')}</span>
              </button>
            </div>

            <div className="card" style={{ width: '100%', borderRadius: 24, padding: '24px 20px', marginBottom: 24, textAlign: 'center', overflow: 'hidden' }}>
              {/* Sliding row panels */}
              <div style={{ width: '100%', overflow: 'hidden' }}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    width: '100%',
                  }}
                >
                  {/* Panel 1: Set PIN */}
                  <div
                    style={{
                      minWidth: '100%',
                      width: '100%',
                      flexShrink: 0,
                      boxSizing: 'border-box',
                      transform: activePinField === 'pin' ? 'translateX(0%)' : 'translateX(-100%)',
                      transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink)', textTransform: 'uppercase', marginBottom: 4 }}>
                      {onbT('onb_pin_label')} (4 Digits)
                    </label>
                    <p style={{ fontSize: 13, color: 'var(--ink-secondary)', marginBottom: 12 }}>
                      Enter a 4-digit security code
                    </p>

                    <div style={{ position: 'relative', width: '100%', maxWidth: 280, margin: '0 auto 16px' }}>
                      {/* 4 Digit Boxes in a Row */}
                      <div
                        onClick={() => pinInputRef.current?.focus()}
                        style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', gap: 12 }}
                      >
                        {[0, 1, 2, 3].map((idx) => {
                          const isFilled = idx < pin.length
                          const isCurrent = activePinField === 'pin' && idx === pin.length
                          return (
                            <div
                              key={idx}
                              style={{
                                width: 54,
                                height: 60,
                                borderRadius: 14,
                                border: isCurrent
                                  ? '2px solid var(--primary)'
                                  : isFilled
                                  ? '2px solid var(--primary)'
                                  : '2px solid var(--border)',
                                background: isFilled ? 'var(--surface-muted)' : 'var(--surface)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 28,
                                fontWeight: 700,
                                color: 'var(--ink)',
                                boxShadow: isCurrent ? '0 0 0 4px rgba(13, 148, 136, 0.15)' : 'none',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                              }}
                            >
                              {isFilled ? '●' : ''}
                            </div>
                          )
                        })}
                      </div>

                      {/* Hidden Accessible Input for Keyboard & E2E */}
                      <input
                        ref={pinInputRef}
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        className="input"
                        placeholder="••••"
                        value={pin}
                        onFocus={() => setActivePinField('pin')}
                        onChange={(e) => {
                          const next = e.target.value.replace(/\D/g, '').slice(0, 4)
                          setPin(next)
                          if (next.length === 4) {
                            setTimeout(() => {
                              setActivePinField('confirm')
                              confirmInputRef.current?.focus()
                            }, 180)
                          }
                        }}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          opacity: 0.01,
                          cursor: 'pointer',
                        }}
                      />
                    </div>

                    <p className="caption" style={{ color: 'var(--ink-secondary)', minHeight: 20 }}>
                      {pin.length === 4 ? '✓ 4 digits entered — auto-advancing...' : 'Tap digits below or type on keyboard'}
                    </p>
                  </div>

                  {/* Panel 2: Confirm PIN */}
                  <div
                    style={{
                      minWidth: '100%',
                      width: '100%',
                      flexShrink: 0,
                      boxSizing: 'border-box',
                      transform: activePinField === 'pin' ? 'translateX(0%)' : 'translateX(-100%)',
                      transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setActivePinField('pin')
                          setTimeout(() => pinInputRef.current?.focus(), 50)
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary)',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 6px',
                        }}
                      >
                        ← Edit PIN
                      </button>
                      <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', textTransform: 'uppercase' }}>
                        {onbT('onb_confirm_pin')}
                      </label>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--ink-secondary)', marginBottom: 12 }}>
                      Re-enter your 4-digit code to confirm
                    </p>

                    <div style={{ position: 'relative', width: '100%', maxWidth: 280, margin: '0 auto 16px' }}>
                      {/* 4 Digit Boxes in a Row */}
                      <div
                        onClick={() => confirmInputRef.current?.focus()}
                        style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', gap: 12 }}
                      >
                        {[0, 1, 2, 3].map((idx) => {
                          const isFilled = idx < confirmPin.length
                          const isCurrent = activePinField === 'confirm' && idx === confirmPin.length
                          const isMatch = pin.length === 4 && confirmPin.length === 4 && pin === confirmPin
                          const isMismatch = confirmPin.length === 4 && pin !== confirmPin
                          return (
                            <div
                              key={idx}
                              style={{
                                width: 54,
                                height: 60,
                                borderRadius: 14,
                                border: isMatch
                                  ? '2px solid var(--success, #15803D)'
                                  : isMismatch
                                  ? '2px solid var(--error, #dc2626)'
                                  : isCurrent
                                  ? '2px solid var(--primary)'
                                  : isFilled
                                  ? '2px solid var(--primary)'
                                  : '2px solid var(--border)',
                                background: isMatch
                                  ? 'rgba(21, 128, 61, 0.08)'
                                  : isFilled
                                  ? 'var(--surface-muted)'
                                  : 'var(--surface)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 28,
                                fontWeight: 700,
                                color: isMatch ? 'var(--success, #15803D)' : 'var(--ink)',
                                boxShadow: isCurrent ? '0 0 0 4px rgba(13, 148, 136, 0.15)' : 'none',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                              }}
                            >
                              {isFilled ? '●' : ''}
                            </div>
                          )
                        })}
                      </div>

                      {/* Hidden Accessible Input for Keyboard & E2E */}
                      <input
                        ref={confirmInputRef}
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        className="input"
                        placeholder="••••"
                        value={confirmPin}
                        onFocus={() => setActivePinField('confirm')}
                        onChange={(e) => {
                          const next = e.target.value.replace(/\D/g, '').slice(0, 4)
                          setConfirmPin(next)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && confirmPin.length === 0) {
                            setActivePinField('pin')
                            setTimeout(() => pinInputRef.current?.focus(), 50)
                          }
                        }}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          opacity: 0.01,
                          cursor: 'pointer',
                        }}
                      />
                    </div>

                    <div style={{ minHeight: 24, marginBottom: 4 }}>
                      {pin.length === 4 && confirmPin.length === 4 && pin === confirmPin && (
                        <p className="caption" style={{ color: 'var(--success, #15803D)', fontWeight: 700 }}>
                          ✓ PIN confirmed successfully!
                        </p>
                      )}
                      {pin.length === 4 && confirmPin.length === 4 && pin !== confirmPin && (
                        <p className="caption" style={{ color: 'var(--error)', fontWeight: 600 }}>
                          {onbT('onb_pin_mismatch')}
                        </p>
                      )}
                      {confirmPin.length < 4 && (
                        <p className="caption" style={{ color: 'var(--ink-secondary)' }}>
                          Enter the matching 4 digits
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Numpad */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, maxWidth: 280, margin: '12px auto 0' }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className="btn"
                    onClick={() => handlePinDigit(String(n))}
                    style={{
                      background: 'var(--surface-muted)',
                      borderRadius: 14,
                      minHeight: 54,
                      fontSize: 22,
                      fontWeight: 600,
                      color: 'var(--ink)',
                    }}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    if (activePinField === 'confirm') {
                      setConfirmPin('')
                      setActivePinField('pin')
                      setTimeout(() => pinInputRef.current?.focus(), 50)
                    } else {
                      setPin('')
                    }
                  }}
                  style={{
                    background: 'var(--surface-muted)',
                    borderRadius: 14,
                    minHeight: 54,
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--ink-secondary)',
                  }}
                >
                  {activePinField === 'confirm' ? '← Back' : 'Clear'}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => handlePinDigit('0')}
                  style={{
                    background: 'var(--surface-muted)',
                    borderRadius: 14,
                    minHeight: 54,
                    fontSize: 22,
                    fontWeight: 600,
                    color: 'var(--ink)',
                  }}
                >
                  0
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={handlePinBackspace}
                  style={{
                    background: 'var(--surface-muted)',
                    borderRadius: 14,
                    minHeight: 54,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="backspace" size={22} color="var(--ink)" />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
              <button type="button" className="btn btn-secondary btn-block" onClick={() => setStep(6)} style={{ borderRadius: 14, minHeight: 44 }}>
                {onbT('back')}
              </button>
              <button
                type="button"
                className="btn btn-cta btn-block"
                data-testid="step-next-btn"
                disabled={pin.length > 0 && (pin.length < 4 || confirmPin !== pin)}
                onClick={() => setStep(8)}
                style={{ borderRadius: 14, minHeight: 44 }}
              >
                {pin.length === 4 && confirmPin === pin ? onbT('next') : onbT('skip') + ' & ' + onbT('done')}
              </button>
            </div>
          </section>
        )}

        {/* Step 8: Baseline Assessment */}
        {step === 8 && (
          <BaselineAssessment
            t={(k: string) => translate(lang, k)}
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

function BaselineAssessment({
  t,
  lang,
  familyMembers,
  onFinish,
  onBack,
}: {
  t: (k: string, vars?: Record<string, string | number>) => string
  lang: Language
  familyMembers: { name: string; relation: string; emoji: string; photo?: string }[]
  onFinish: (r: { accuracy: number; latencyMs: number }) => void
  onBack: () => void
}) {
  const [round, setRound] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [latencies, setLatencies] = useState<number[]>([])
  const [done, setDone] = useState(false)
  const startTs = useRef(Date.now())

  useEffect(() => {
    startTs.current = Date.now()
  }, [round])

  const questions = [
    { promptKey: 'onb_baseline_p1', instructionKey: 'onb_baseline_instr1', options: ['🌙', '☀️', '⭐'], answer: 1 },
    { promptKey: 'onb_baseline_p2', instructionKey: 'onb_baseline_instr2', options: ['🍃', '🍎', '🐟'], answer: 0 },
    { promptKey: 'onb_baseline_p3', instructionKey: 'onb_baseline_instr3', options: ['🚗', '🌸', '🏠'], answer: 1 },
  ]

  const q = questions[round] ?? questions[0]

  const handlePick = (idx: number) => {
    const lat = Date.now() - startTs.current
    const isCorrect = idx === q.answer
    playChime()
    const nextCorrect = correct + (isCorrect ? 1 : 0)
    const nextLatencies = [...latencies, lat]

    if (round < questions.length - 1) {
      setCorrect(nextCorrect)
      setLatencies(nextLatencies)
      setRound((r) => r + 1)
    } else {
      setDone(true)
      const avgLat = nextLatencies.reduce((a, b) => a + b, 0) / nextLatencies.length
      const acc = nextCorrect / questions.length
      setCorrect(nextCorrect)
      setLatencies(nextLatencies)
    }
  }

  const handleComplete = () => {
    const avgLat = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 800
    const acc = correct / questions.length
    onFinish({ accuracy: acc, latencyMs: avgLat })
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
        {t('onb_baseline_title')}
      </h1>

      <div
        className="instruction-bar"
        style={{
          background: 'var(--success-soft)',
          color: 'var(--success-text)',
          fontSize: 13,
          fontWeight: 600,
          padding: '8px 16px',
          borderRadius: 12,
          marginBottom: 16,
          display: 'inline-block',
          border: '1px solid #9FD4B4',
        }}
      >
        {t(q.instructionKey)}
      </div>

      <p style={{ fontSize: 14, color: 'var(--ink-secondary)', marginBottom: 24 }}>
        {t('round_counter', { n: round + 1, total: questions.length })}
      </p>

      <div className="card" style={{ width: '100%', borderRadius: 24, padding: 32, marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink)', marginBottom: 28 }}>
          {t(q.promptKey)}
        </h2>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: done ? 24 : 0 }}>
          {q.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              className="btn btn-secondary choice-btn item-tile"
              onClick={() => handlePick(i)}
              style={{
                width: 80,
                height: 80,
                fontSize: 36,
                borderRadius: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                cursor: 'pointer',
              }}
            >
              {opt}
            </button>
          ))}
        </div>

        {done && (
          <button
            type="button"
            className="btn btn-cta btn-block"
            onClick={handleComplete}
            style={{ borderRadius: 14, minHeight: 48, marginTop: 12 }}
          >
            Done
          </button>
        )}
      </div>

      <button type="button" className="btn btn-secondary btn-block" onClick={onBack} style={{ borderRadius: 14, minHeight: 44 }}>
        {t('back')}
      </button>
    </section>
  )
}
