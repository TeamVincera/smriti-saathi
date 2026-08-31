import { useState } from 'react'
import { useApp } from '../state'
import { Icon } from '../components/Icons'
import { confirmAlarm } from '../lib/reminders'
import type { DailyReminder, AppointmentReminder } from '../lib/types'

export function Reminders() {
  const { dailyReminders, appointments, profile, lang } = useApp()
  const [activeTab, setActiveTab] = useState<'daily' | 'appointments'>('daily')
  const [completedIds, setCompletedIds] = useState<string[]>([])

  const todayStr = new Date().toISOString().split('T')[0]
  const todayAppointments = appointments.filter((a) => a.active && a.date === todayStr)
  const upcomingAppointments = appointments.filter((a) => a.active && a.date >= todayStr)

  async function toggleDone(reminder: DailyReminder) {
    if (completedIds.includes(reminder.id)) {
      setCompletedIds((prev) => prev.filter((id) => id !== reminder.id))
    } else {
      setCompletedIds((prev) => [...prev, reminder.id])
      void confirmAlarm({
        id: reminder.id,
        key: `manual:${reminder.id}`,
        type: 'daily',
        title: reminder.title,
        emoji: reminder.emoji || '💧',
        time: reminder.time,
      }, 'tap')
    }
  }

  return (
    <div className="page enter-anim" style={{ maxWidth: 'var(--max-w)', margin: '0 auto', paddingBottom: 90 }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #162436 0%, #213247 100%)',
          borderRadius: 24,
          padding: '24px 20px',
          color: '#fff',
          marginBottom: 20,
          boxShadow: '0 4px 16px rgba(22, 36, 54, 0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span className="chip" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 12, fontWeight: 700 }}>
            🔔 {lang === 'hi' ? 'दैनिक सूचनाएं और अपॉइंटमेंट' : 'DAILY REMINDERS & SCHEDULE'}
          </span>
          <span style={{ fontSize: 13, color: 'var(--muga-gold-light)', fontWeight: 600 }}>
            {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, margin: '0 0 6px 0' }}>
          {profile?.patient.name ? `${profile.patient.name}'s Schedule` : 'Daily Schedule'}
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', margin: 0 }}>
          {lang === 'hi'
            ? 'समय पर पानी पीना, भोजन और डॉक्टर से मिलना।'
            : 'Gentle prompts for hydration, healthy meals, and doctor visits.'}
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => setActiveTab('daily')}
          style={{
            flex: 1,
            background: activeTab === 'daily' ? '#0B131F' : '#E8E1D5',
            color: activeTab === 'daily' ? '#fff' : '#162436',
            border: 'none',
            borderRadius: 16,
            minHeight: 44,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          💧 {lang === 'hi' ? 'दैनिक यादें' : 'Daily Reminders'} ({dailyReminders.filter((r) => r.active).length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('appointments')}
          style={{
            flex: 1,
            background: activeTab === 'appointments' ? '#0B131F' : '#E8E1D5',
            color: activeTab === 'appointments' ? '#fff' : '#162436',
            border: 'none',
            borderRadius: 16,
            minHeight: 44,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          🩺 {lang === 'hi' ? 'डॉक्टर अपॉइंटमेंट' : 'Appointments'} ({upcomingAppointments.length})
        </button>
      </div>

      {/* Tab 1: Daily Reminders */}
      {activeTab === 'daily' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {dailyReminders.length === 0 ? (
            <div className="card" style={{ padding: 24, textAlign: 'center', borderRadius: 20 }}>
              <span style={{ fontSize: 44, display: 'block', marginBottom: 8 }}>💧</span>
              <p style={{ color: 'var(--ink-muted)', fontSize: 15 }}>
                {lang === 'hi' ? 'कोई दैनिक रिमाइंडर सेट नहीं है।' : 'No daily reminders set.'}
              </p>
            </div>
          ) : (
            dailyReminders
              .filter((r) => r.active)
              .map((r) => {
                const isDone = completedIds.includes(r.id)
                const title = lang === 'hi' && r.titleHi ? r.titleHi : r.title

                return (
                  <div
                    key={r.id}
                    className="card"
                    style={{
                      borderRadius: 20,
                      padding: '16px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      border: isDone ? '1.5px solid var(--success)' : '1.5px solid var(--border)',
                      background: isDone ? 'var(--success-soft)' : 'var(--card)',
                      boxShadow: 'var(--shadow-xs)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          background: isDone ? '#D0EBD8' : 'var(--surface-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 24,
                        }}
                      >
                        {r.emoji || '💧'}
                      </div>
                      <div>
                        <strong style={{ fontSize: 16, color: 'var(--ink)', display: 'block', textDecoration: isDone ? 'line-through' : 'none' }}>
                          {title}
                        </strong>
                        <span className="caption" style={{ color: 'var(--ink-muted)' }}>
                          ⏰ {r.time} · {r.category}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void toggleDone(r)}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        border: isDone ? '2px solid var(--success)' : '2px solid var(--border)',
                        background: isDone ? 'var(--success)' : '#fff',
                        color: isDone ? '#fff' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      aria-label="Mark completed"
                    >
                      <Icon name="check" size={20} color={isDone ? '#fff' : '#ccc'} />
                    </button>
                  </div>
                )
              })
          )}
        </div>
      )}

      {/* Tab 2: Doctor Appointments */}
      {activeTab === 'appointments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {upcomingAppointments.length === 0 ? (
            <div className="card" style={{ padding: 24, textAlign: 'center', borderRadius: 20 }}>
              <span style={{ fontSize: 44, display: 'block', marginBottom: 8 }}>🩺</span>
              <p style={{ color: 'var(--ink-muted)', fontSize: 15 }}>
                {lang === 'hi' ? 'कोई आगामी अपॉइंटमेंट नहीं है।' : 'No upcoming doctor appointments scheduled.'}
              </p>
            </div>
          ) : (
            upcomingAppointments.map((a) => {
              const isToday = a.date === todayStr
              return (
                <div
                  key={a.id}
                  className="card"
                  style={{
                    borderRadius: 20,
                    padding: '18px 20px',
                    border: isToday ? '2px solid var(--primary)' : '1.5px solid var(--border)',
                    boxShadow: 'var(--shadow-sm)',
                    background: 'var(--card)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span
                      className="chip"
                      style={{
                        background: isToday ? '#FF5F56' : 'var(--surface-muted)',
                        color: isToday ? '#fff' : 'var(--ink)',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {isToday ? 'TODAY' : a.date}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)' }}>
                      🕒 {a.time}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', margin: '0 0 4px 0' }}>
                    {a.title}
                  </h3>
                  <p style={{ fontSize: 14, color: 'var(--ink-secondary)', margin: '0 0 6px 0', fontWeight: 600 }}>
                    👨‍⚕️ {a.doctorName}
                  </p>
                  {a.location && (
                    <p className="caption" style={{ color: 'var(--ink-muted)', margin: 0 }}>
                      📍 {a.location}
                    </p>
                  )}
                  {a.notes && (
                    <p className="caption" style={{ color: 'var(--ink-muted)', marginTop: 6, fontStyle: 'italic' }}>
                      📝 {a.notes}
                    </p>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
