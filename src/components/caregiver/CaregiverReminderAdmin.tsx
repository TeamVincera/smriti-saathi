import { useState } from 'react'
import { useApp } from '../../state'
import type { DailyReminder, AppointmentReminder } from '../../lib/types'

export function RemindersAdmin({
  dailyReminders,
  appointments,
  onSaveReminder,
  onDeleteReminder,
  onSaveAppointment,
  onDeleteAppointment,
}: {
  dailyReminders: DailyReminder[]
  appointments: AppointmentReminder[]
  onSaveReminder: (r: DailyReminder) => void
  onDeleteReminder: (id: string) => void
  onSaveAppointment: (a: AppointmentReminder) => void
  onDeleteAppointment: (id: string) => void
}) {
  const { t } = useApp()
  const [subSection, setSubSection] = useState<'daily' | 'appointments'>('daily')
  const [editingReminder, setEditingReminder] = useState<Partial<DailyReminder> | null>(null)
  const [editingAppt, setEditingAppt] = useState<Partial<AppointmentReminder> | null>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Sub Tabs */}
      <div className="caregiver-subtabs" role="tablist" aria-label="Caregiver reminders" style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          role="tab"
          aria-selected={subSection === 'daily'}
          aria-controls="caregiver-daily-panel"
          onClick={() => setSubSection('daily')}
          style={{
            flex: 1,
            background: subSection === 'daily' ? 'var(--primary)' : 'var(--surface-muted)',
            color: subSection === 'daily' ? 'var(--ink-on-primary)' : 'var(--ink)',
            borderRadius: 14,
            minHeight: 48,
            fontSize: 13,
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          💧 {t('hub_rem_daily_tab')} ({dailyReminders.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subSection === 'appointments'}
          aria-controls="caregiver-appointments-panel"
          onClick={() => setSubSection('appointments')}
          style={{
            flex: 1,
            background: subSection === 'appointments' ? 'var(--primary)' : 'var(--surface-muted)',
            color: subSection === 'appointments' ? 'var(--ink-on-primary)' : 'var(--ink)',
            borderRadius: 14,
            minHeight: 48,
            fontSize: 13,
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          🩺 {t('hub_rem_appts_tab')} ({appointments.length})
        </button>
      </div>

      {/* DAILY REMINDERS SUBSECTION */}
      {subSection === 'daily' && (
        <div id="caregiver-daily-panel" role="tabpanel" aria-label={t('hub_rem_daily_tab')} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {editingReminder ? (
            <div className="card caregiver-admin-card caregiver-reminder-form" role="region" aria-labelledby="caregiver-reminder-form-title" style={{ borderRadius: 20, padding: 20 }}>
              <h3 id="caregiver-reminder-form-title" style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 14 }}>
                {editingReminder.title ? `${t('hub_rem_edit_daily')} - ${editingReminder.title}` : t('hub_rem_add_daily')}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label htmlFor="caregiver-reminder-title" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                    {t('hub_rem_title')}
                  </label>
                  <input
                    id="caregiver-reminder-title"
                    className="input"
                    placeholder={t('hub_rem_title')}
                    value={editingReminder.title ?? ''}
                    onChange={(e) => setEditingReminder({ ...editingReminder, title: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="caregiver-reminder-title-hi" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                    {t('hub_rem_title_hi')}
                  </label>
                  <input
                    id="caregiver-reminder-title-hi"
                    className="input"
                    placeholder={t('hub_rem_title_hi')}
                    value={editingReminder.titleHi ?? ''}
                    onChange={(e) => setEditingReminder({ ...editingReminder, titleHi: e.target.value })}
                  />
                </div>

                <div className="caregiver-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label htmlFor="caregiver-reminder-time" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                      {t('hub_rem_time')}
                    </label>
                    <input
                      id="caregiver-reminder-time"
                      type="time"
                      className="input"
                      value={editingReminder.time ?? '09:00'}
                      onChange={(e) => setEditingReminder({ ...editingReminder, time: e.target.value })}
                    />
                  </div>

                  <div>
                    <label htmlFor="caregiver-reminder-category" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                      {t('hub_rem_category')}
                    </label>
                    <select
                      id="caregiver-reminder-category"
                      className="input"
                      value={editingReminder.category ?? 'Hydration'}
                      onChange={(e) => setEditingReminder({ ...editingReminder, category: e.target.value })}
                    >
                      <option value="Hydration">Hydration 💧</option>
                      <option value="Meals">Meals 🥣</option>
                      <option value="Activity">Activity / Walk 🚶</option>
                      <option value="Rest">Rest / Sleep 😴</option>
                      <option value="Social">Call Family 📞</option>
                      <option value="Other">Other 🔔</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div id="caregiver-reminder-emoji-label" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
                    {t('hub_rem_emoji')}
                  </div>
                  <div role="group" aria-labelledby="caregiver-reminder-emoji-label" style={{ display: 'flex', gap: 8 }}>
                    {['💧', '🥣', '🚶', '😴', '📞', '🪴', '🍎', '🍵', '🔔'].map((em) => (
                      <button
                        key={em}
                        type="button"
                        aria-label={`Use ${em} reminder icon`}
                        aria-pressed={editingReminder.emoji === em}
                        onClick={() => setEditingReminder({ ...editingReminder, emoji: em })}
                        style={{
                          fontSize: 20,
                          padding: '6px 10px',
                          borderRadius: 10,
                          background: editingReminder.emoji === em ? 'var(--primary)' : 'var(--surface-muted)',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-block"
                    onClick={() => setEditingReminder(null)}
                    style={{ borderRadius: 12 }}
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-cta btn-block"
                    disabled={!editingReminder.title?.trim() || !editingReminder.time}
                    onClick={() => {
                      onSaveReminder({
                        id: editingReminder.id || `dr-${Date.now()}`,
                        title: editingReminder.title || '',
                        titleHi: editingReminder.titleHi,
                        category: editingReminder.category || 'Hydration',
                        time: editingReminder.time || '09:00',
                        emoji: editingReminder.emoji || '💧',
                        active: editingReminder.active ?? true,
                      })
                      setEditingReminder(null)
                    }}
                    style={{ borderRadius: 12 }}
                  >
                    {t('hub_rem_save_reminder')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-cta btn-block"
                onClick={() =>
                  setEditingReminder({
                    id: `dr-${Date.now()}`,
                    title: '',
                    category: 'Hydration',
                    time: '10:00',
                    emoji: '💧',
                    active: true,
                  })
                }
                style={{ borderRadius: 14, minHeight: 48 }}
              >
                {t('hub_rem_add_daily')}
              </button>

              <div className="caregiver-record-list" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {dailyReminders.map((r) => (
                  <div
                    key={r.id}
                    className="card caregiver-record-card"
                    style={{
                      borderRadius: 16,
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      opacity: r.active ? 1 : 0.6,
                    }}
                  >
                    <div className="caregiver-record-main" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 24 }}>{r.emoji || '💧'}</span>
                      <div>
                        <strong style={{ fontSize: 15, color: 'var(--ink)', display: 'block' }}>{r.title}</strong>
                        <span className="caption" style={{ color: 'var(--ink-muted)' }}>
                          ⏰ {r.time} · {r.category}
                        </span>
                      </div>
                    </div>

                    <div className="caregiver-record-actions" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        type="button"
                        className="btn btn-pearl"
                        onClick={() => onSaveReminder({ ...r, active: !r.active })}
                        style={{ fontSize: 12, fontWeight: 700, color: r.active ? 'var(--success)' : 'var(--ink-muted)' }}
                      >
                        {r.active ? t('hub_active') : t('hub_off')}
                      </button>
                      <button type="button" className="btn btn-pearl" onClick={() => setEditingReminder(r)}>
                        {t('hub_med_edit')}
                      </button>
                      <button
                        type="button"
                        className="btn btn-pearl btn-danger"
                        aria-label={`Delete ${r.title}`}
                        onClick={() => onDeleteReminder(r.id)}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* DOCTOR APPOINTMENTS SUBSECTION */}
      {subSection === 'appointments' && (
        <div id="caregiver-appointments-panel" role="tabpanel" aria-label={t('hub_rem_appts_tab')} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {editingAppt ? (
            <div className="card caregiver-admin-card caregiver-appointment-form" role="region" aria-labelledby="caregiver-appointment-form-title" style={{ borderRadius: 20, padding: 20 }}>
              <h3 id="caregiver-appointment-form-title" style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 14 }}>
                {editingAppt.title ? `${t('hub_rem_appt_edit')} - ${editingAppt.title}` : t('hub_rem_appt_title')}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label htmlFor="caregiver-appointment-title" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                    {t('hub_rem_appt_reason')}
                  </label>
                  <input
                    id="caregiver-appointment-title"
                    className="input"
                    placeholder={t('hub_rem_appt_reason')}
                    value={editingAppt.title ?? ''}
                    onChange={(e) => setEditingAppt({ ...editingAppt, title: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="caregiver-appointment-doctor" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                    {t('hub_rem_doctor')}
                  </label>
                  <input
                    id="caregiver-appointment-doctor"
                    className="input"
                    placeholder={t('hub_rem_doctor')}
                    value={editingAppt.doctorName ?? ''}
                    onChange={(e) => setEditingAppt({ ...editingAppt, doctorName: e.target.value })}
                  />
                </div>

                <div className="caregiver-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label htmlFor="caregiver-appointment-date" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                      {t('hub_rem_date')}
                    </label>
                      <input
                      id="caregiver-appointment-date"
                      type="date"
                      className="input"
                      value={editingAppt.date ?? new Date().toISOString().split('T')[0]}
                      onChange={(e) => setEditingAppt({ ...editingAppt, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="caregiver-appointment-time" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                      {t('hub_rem_time')}
                    </label>
                    <input
                      id="caregiver-appointment-time"
                      type="time"
                      className="input"
                      value={editingAppt.time ?? '10:30'}
                      onChange={(e) => setEditingAppt({ ...editingAppt, time: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="caregiver-appointment-location" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                    {t('hub_rem_location')}
                  </label>
                  <input
                    id="caregiver-appointment-location"
                    className="input"
                    placeholder={t('hub_rem_location')}
                    value={editingAppt.location ?? ''}
                    onChange={(e) => setEditingAppt({ ...editingAppt, location: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="caregiver-appointment-notes" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                    {t('hub_rem_notes')}
                  </label>
                  <input
                    id="caregiver-appointment-notes"
                    className="input"
                    placeholder={t('hub_rem_notes')}
                    value={editingAppt.notes ?? ''}
                    onChange={(e) => setEditingAppt({ ...editingAppt, notes: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-block"
                    onClick={() => setEditingAppt(null)}
                    style={{ borderRadius: 12 }}
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-cta btn-block"
                    disabled={!editingAppt.title?.trim() || !editingAppt.doctorName?.trim() || !editingAppt.date || !editingAppt.time}
                    onClick={() => {
                      onSaveAppointment({
                        id: editingAppt.id || `appt-${Date.now()}`,
                        title: editingAppt.title || '',
                        doctorName: editingAppt.doctorName || '',
                        date: editingAppt.date || new Date().toISOString().split('T')[0],
                        time: editingAppt.time || '10:30',
                        location: editingAppt.location,
                        notes: editingAppt.notes,
                        active: editingAppt.active ?? true,
                      })
                      setEditingAppt(null)
                    }}
                    style={{ borderRadius: 12 }}
                  >
                    {t('hub_rem_save_appt')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-cta btn-block"
                onClick={() =>
                  setEditingAppt({
                    id: `appt-${Date.now()}`,
                    title: '',
                    doctorName: '',
                    date: new Date().toISOString().split('T')[0],
                    time: '10:30',
                    active: true,
                  })
                }
                style={{ borderRadius: 14, minHeight: 48 }}
              >
                {t('hub_rem_add_appt')}
              </button>

              {appointments.length === 0 ? (
                <div
                  className="card caregiver-empty-state"
                  role="status"
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
                  <span style={{ fontSize: 36, marginBottom: 8 }}>🩺</span>
                  <strong style={{ fontSize: 16, color: 'var(--ink)', marginBottom: 4 }}>{t('hub_rem_no_appts_title')}</strong>
                  <span style={{ fontSize: 13, color: 'var(--ink-muted)', maxWidth: 280 }}>
                    {t('hub_rem_no_appts_desc')}
                  </span>
                </div>
              ) : (
                <div className="caregiver-record-list" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {appointments.map((a) => (
                    <div
                      key={a.id}
                      className="card caregiver-record-card"
                      style={{
                        borderRadius: 16,
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: 15, color: 'var(--ink)', display: 'block' }}>{a.title}</strong>
                        <span className="caption" style={{ color: 'var(--ink-muted)' }}>
                          📅 {a.date} at {a.time} · 👨‍⚕️ {a.doctorName}
                        </span>
                      </div>

                      <div className="caregiver-record-actions" style={{ display: 'flex', gap: 6 }}>
                        <button type="button" className="btn btn-pearl" onClick={() => setEditingAppt(a)}>
                          {t('hub_med_edit')}
                        </button>
                        <button
                          type="button"
                          className="btn btn-pearl btn-danger"
                          aria-label={`Delete ${a.title}`}
                          onClick={() => onDeleteAppointment(a.id)}
                        >
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
      )}
    </div>
  )
}
