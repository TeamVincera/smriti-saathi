import { useState } from 'react'
import { useApp } from '../../state'
import type { Med, MedForm } from '../../lib/types'
import { formEmoji } from '../../lib/formatters'

export function MedsAdmin({ meds, onSave, onDelete }: { meds: Med[]; onSave: (m: Med) => void; onDelete: (id: string) => void }) {
  const { t } = useApp()
  const [draft, setDraft] = useState<Partial<Med> | null>(null)
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1)
  const [customTime, setCustomTime] = useState('')

  const startNewMed = () => {
    setDraft({
      id: `m-${Date.now()}`,
      name: '',
      dosage: '1 tablet (5mg)',
      form: 'tablet',
      food: 'after',
      instructions: 'Take with warm water',
      times: ['08:30'],
      active: true,
    })
    setWizardStep(1)
  }

  const startEditMed = (m: Med) => {
    setDraft({ ...m })
    setWizardStep(1)
  }

  const toggleTime = (tStr: string) => {
    if (!draft) return
    const cur = draft.times || []
    const next = cur.includes(tStr) ? cur.filter((x) => x !== tStr) : [...cur, tStr].sort()
    setDraft({ ...draft, times: next })
  }

  const addCustomTime = () => {
    if (!draft || !customTime.trim()) return
    const cur = draft.times || []
    if (!cur.includes(customTime.trim())) {
      setDraft({ ...draft, times: [...cur, customTime.trim()].sort() })
    }
    setCustomTime('')
  }

  const removeTime = (tStr: string) => {
    if (!draft) return
    setDraft({ ...draft, times: (draft.times || []).filter((x) => x !== tStr) })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {draft ? (
        <div className="card caregiver-admin-card caregiver-med-form" role="region" aria-labelledby="caregiver-med-form-title" style={{ borderRadius: 24, padding: 24 }}>
          {/* Step Indicator Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <span className="chip" style={{ background: 'rgba(22,36,54,0.08)', color: 'var(--ink)', fontWeight: 700, fontSize: 11 }}>
                {t('hub_med_step', { step: wizardStep })}
              </span>
              <h3 id="caregiver-med-form-title" style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginTop: 4, margin: 0 }}>
                {wizardStep === 1 ? t('hub_med_step1_title') : wizardStep === 2 ? t('hub_med_step2_title') : t('hub_med_step3_title')}
              </h3>
            </div>
            <button
              type="button"
              className="btn btn-pearl"
              onClick={() => {
                setDraft(null)
                setWizardStep(1)
              }}
              style={{ fontSize: 13 }}
            >
              {t('cancel')}
            </button>
          </div>

          {/* STEP 1: Details */}
          {wizardStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label htmlFor="caregiver-med-name" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                  {t('hub_med_name_label')}
                </label>
                <input
                  id="caregiver-med-name"
                  className="input"
                  placeholder={t('hub_med_name_label')}
                  value={draft.name ?? ''}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label htmlFor="caregiver-med-dosage" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                    {t('hub_med_dosage_label')}
                  </label>
                  <input
                    id="caregiver-med-dosage"
                    className="input"
                    placeholder={t('hub_med_dosage_label')}
                    value={draft.dosage ?? ''}
                    onChange={(e) => setDraft({ ...draft, dosage: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="caregiver-med-form" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                    {t('hub_med_form_label')}
                  </label>
                  <select
                    id="caregiver-med-form"
                    className="input"
                    value={draft.form ?? 'tablet'}
                    onChange={(e) => setDraft({ ...draft, form: e.target.value as MedForm })}
                  >
                    <option value="tablet">💊 Tablet</option>
                    <option value="capsule">💊 Capsule</option>
                    <option value="syrup">🧴 Syrup</option>
                    <option value="drops">💧 Drops</option>
                    <option value="injection">💉 Injection</option>
                    <option value="other">📦 Other</option>
                  </select>
                </div>
              </div>

              <div>
                <div id="caregiver-med-food-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                  {t('hub_med_food_label')}
                </div>
                <div className="caregiver-choice-group" role="group" aria-labelledby="caregiver-med-food-label" style={{ display: 'flex', gap: 8 }}>
                  {[
                    { key: 'after', label: `💊 → 🍽️ ${t('hub_med_food_after')}` },
                    { key: 'before', label: `🍽️ → 💊 ${t('hub_med_food_before')}` },
                    { key: 'none', label: `🕒 ${t('hub_med_food_anytime')}` },
                  ].map((f) => {
                    const isSel = draft.food === f.key
                    return (
                      <button
                        key={f.key}
                        type="button"
                        aria-pressed={isSel}
                        onClick={() => setDraft({ ...draft, food: f.key as any })}
                        style={{
                          flex: 1,
                          background: isSel ? 'var(--primary)' : 'var(--surface-muted)',
                          color: isSel ? 'var(--ink-on-primary)' : 'var(--ink)',
                          borderRadius: 12,
                          padding: '10px 8px',
                          fontSize: 12,
                          fontWeight: 600,
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {f.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="caregiver-med-instructions" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                  {t('hub_med_instructions_label')}
                </label>
                <input
                  id="caregiver-med-instructions"
                  className="input"
                  placeholder={t('hub_med_instructions_label')}
                  value={draft.instructions ?? ''}
                  onChange={(e) => setDraft({ ...draft, instructions: e.target.value })}
                />
              </div>

              <button
                type="button"
                className="btn btn-cta btn-block"
                disabled={!draft.name?.trim()}
                onClick={() => setWizardStep(2)}
                style={{ borderRadius: 14, minHeight: 46, marginTop: 8 }}
              >
                {t('next')} →
              </button>
            </div>
          )}

          {/* STEP 2: Timing Selection */}
          {wizardStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label id="caregiver-med-preset-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
                  Quick Timing Presets
                </label>
                <div className="caregiver-choice-grid" role="group" aria-labelledby="caregiver-med-preset-label" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  {[
                    { time: '08:00', label: '🌅 Morning (08:00)' },
                    { time: '13:00', label: '☀️ Afternoon (13:00)' },
                    { time: '17:00', label: '☕ Evening (17:00)' },
                    { time: '21:00', label: '🌙 Night (21:00)' },
                  ].map((p) => {
                    const isSel = (draft.times || []).includes(p.time)
                    return (
                      <button
                        key={p.time}
                        type="button"
                        aria-pressed={isSel}
                        onClick={() => toggleTime(p.time)}
                        style={{
                          background: isSel ? 'var(--primary)' : 'var(--surface-muted)',
                          color: isSel ? 'var(--ink-on-primary)' : 'var(--ink)',
                          borderRadius: 14,
                          padding: '12px 14px',
                          fontSize: 13,
                          fontWeight: 600,
                          border: isSel ? '2px solid #162436' : '1px solid #E5E7EB',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        {isSel ? '✓ ' : '+ '} {p.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="caregiver-med-custom-time" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                  Custom Dose Time (HH:MM)
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="time"
                    id="caregiver-med-custom-time"
                    className="input"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={addCustomTime}
                    disabled={!customTime}
                    style={{ borderRadius: 12, padding: '0 16px', fontWeight: 600 }}
                  >
                    + Add Time
                  </button>
                </div>
              </div>

              {/* Active Scheduled Times */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                  {t('hub_med_alarms_label')} ({(draft.times || []).length})
                </label>
                {(draft.times || []).length === 0 ? (
                  <p className="caption" role="status" style={{ color: 'var(--ink-muted)', margin: 0 }}>
                    {t('hub_med_no_alarms')}
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {(draft.times || []).map((tVal) => (
                      <span
                        key={tVal}
                        className="chip"
                        style={{
                          background: 'var(--primary)',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: 13,
                          padding: '6px 12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        ⏰ {tVal}
                        <button
                          type="button"
                          aria-label={`Remove dose time ${tVal}`}
                          onClick={() => removeTime(tVal)}
                          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, fontWeight: 700 }}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-block"
                  onClick={() => setWizardStep(1)}
                  style={{ borderRadius: 14 }}
                >
                  ← {t('back')}
                </button>
                <button
                  type="button"
                  className="btn btn-cta btn-block"
                  disabled={(draft.times || []).length === 0}
                  onClick={() => setWizardStep(3)}
                  style={{ borderRadius: 14 }}
                >
                  {t('next')} →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Confirm & Save */}
          {wizardStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div
                aria-label={t('hub_med_step3_title')}
                style={{
                  background: 'var(--surface-muted)',
                  borderRadius: 16,
                  padding: '18px 20px',
                  border: '1.5px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: 32 }}>{formEmoji(draft.form || 'tablet')}</span>
                  <div>
                    <strong style={{ fontSize: 18, color: 'var(--ink)', display: 'block' }}>{draft.name}</strong>
                    <span className="caption" style={{ color: 'var(--ink-muted)' }}>
                      {draft.dosage} · {draft.food === 'before' ? t('hub_med_food_before') : draft.food === 'after' ? t('hub_med_food_after') : t('hub_med_food_anytime')}
                    </span>
                  </div>
                </div>

                {draft.instructions && (
                  <p style={{ fontSize: 13, color: 'var(--ink-secondary)', margin: '0 0 10px 0' }}>
                    📝 {draft.instructions}
                  </p>
                )}

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', display: 'block', marginBottom: 6 }}>
                    {t('hub_med_alarms_label')}:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(draft.times || []).map((tVal) => (
                      <span key={tVal} className="chip" style={{ background: 'var(--primary)', color: '#fff', fontSize: 12, fontWeight: 700 }}>
                        🔔 {tVal}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-block"
                  onClick={() => setWizardStep(2)}
                  style={{ borderRadius: 14 }}
                >
                  ← {t('back')}
                </button>
                <button
                  type="button"
                  className="btn btn-cta btn-block"
                  onClick={() => {
                    onSave({
                      id: draft.id || `m-${Date.now()}`,
                      name: draft.name || '',
                      dosage: draft.dosage || '1 tablet',
                      form: (draft.form as MedForm) || 'tablet',
                      food: draft.food || 'after',
                      instructions: draft.instructions,
                      times: draft.times || ['08:30'],
                      active: true,
                    })
                    setDraft(null)
                    setWizardStep(1)
                  }}
                  style={{ borderRadius: 14 }}
                >
                  {t('hub_med_save_btn')}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <button
            type="button"
            className="btn btn-cta btn-block"
            onClick={startNewMed}
            style={{ borderRadius: 14, minHeight: 48 }}
          >
            {t('hub_add_med_btn')}
          </button>

          {meds.length === 0 ? (
            <div
              className="card caregiver-empty-state"
              style={{
                borderRadius: 20,
                padding: '32px 20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                border: '1.5px dashed var(--border)',
                background: 'var(--card)',
              }}
            >
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--surface-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 12 }}>
                💊
              </div>
              <strong style={{ fontSize: 16, color: 'var(--ink)', marginBottom: 4 }}>{t('hub_med_empty_title')}</strong>
              <span style={{ fontSize: 13, color: 'var(--ink-muted)', maxWidth: 280 }}>
                {t('hub_med_empty_desc')}
              </span>
            </div>
          ) : (
            <div className="caregiver-record-list" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {meds.map((m) => (
                <div key={m.id} className="card caregiver-record-card" style={{ borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="caregiver-record-main" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 26 }}>{formEmoji(m.form)}</span>
                    <div>
                      <strong style={{ display: 'block', fontSize: 16, color: 'var(--ink)' }}>{m.name}</strong>
                      <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
                        {m.dosage} · {m.times.join(', ')}
                      </span>
                    </div>
                  </div>
                  <div className="caregiver-record-actions" style={{ display: 'flex', gap: 6 }}>
                    <button type="button" className="btn btn-pearl" onClick={() => startEditMed(m)}>
                      {t('hub_med_edit')}
                    </button>
                    <button type="button" className="btn btn-pearl btn-danger" aria-label={`Delete ${m.name}`} onClick={() => onDelete(m.id)}>
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// 6. REMINDERS & APPOINTMENTS ADMIN
// ─────────────────────────────────────────────
