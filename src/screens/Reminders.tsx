import { useEffect, useState } from 'react'
import { useApp } from '../state'
import { Icon } from '../components/Icons'
import { confirmAlarm } from '../lib/reminders'
import type { DailyReminder, AppointmentReminder } from '../lib/types'
import { localeForLanguage } from '../i18n'
import {
  checkAlarmPermissions,
  openExactAlarmSettings,
  requestAlarmPermissionStatus,
  syncAllAlarmsToNative,
  type AlarmPermissionStatus,
} from '../lib/alarmService'

type Translate = (key: string, vars?: Record<string, string | number>) => string

const REMINDER_CATEGORY_KEYS: Record<string, string> = {
  hydration: 'reminder_category_hydration',
  meal: 'reminder_category_meal',
  activity: 'reminder_category_activity',
  rest: 'reminder_category_rest',
  routine: 'reminder_category_routine',
  general: 'reminder_category_general',
}

function displayPermissionMessage(status: AlarmPermissionStatus, t: Translate): string {
  if (status.display === 'granted') {
    return t('reminder_alerts_on')
  }
  if (status.display === 'prompt' || status.display === 'prompt-with-rationale') {
    return t('reminder_alerts_prompt')
  }
  if (status.display === 'denied') {
    return status.platform === 'web'
      ? t('reminder_alerts_denied_web')
      : t('reminder_alerts_denied_native')
  }
  return status.platform === 'web'
    ? t('reminder_alerts_unavailable_web')
    : t('reminder_alerts_unavailable_native')
}

function exactAlarmMessage(status: AlarmPermissionStatus, t: Translate): string | null {
  if (status.platform !== 'android' || status.exactAlarm === 'granted') return null
  if (status.exactAlarm === 'denied') {
    return status.canOpenExactSettings
      ? t('reminder_exact_off_settings')
      : t('reminder_exact_unavailable')
  }
  return t('reminder_exact_unknown')
}

function localizeReminderCategory(category: string | undefined, t: Translate): string {
  const key = category ? REMINDER_CATEGORY_KEYS[category] : undefined
  return t(key ?? 'reminder_category_unknown')
}

export function Reminders() {
  const { dailyReminders, appointments, profile, lang, t } = useApp()
  const [activeTab, setActiveTab] = useState<'daily' | 'appointments'>('daily')
  const [completedIds, setCompletedIds] = useState<string[]>([])
  const [alarmPermissions, setAlarmPermissions] = useState<AlarmPermissionStatus | null>(null)
  const [permissionAction, setPermissionAction] = useState<'display' | 'exact' | null>(null)
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void checkAlarmPermissions().then((status) => {
      if (active) setAlarmPermissions(status)
    })
    return () => {
      active = false
    }
  }, [])

  const todayStr = new Date().toISOString().split('T')[0]
  const upcomingAppointments = appointments.filter((a) => (a.active ?? true) && a.date >= todayStr)

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

  async function refreshAfterPermission(status: AlarmPermissionStatus) {
    setAlarmPermissions(status)
    if (status.display === 'granted') {
      await syncAllAlarmsToNative(profile?.language ?? 'en')
    }
  }

  async function handleDisplayPermission() {
    if (!alarmPermissions) return
    setPermissionAction('display')
    setPermissionMessage(null)
    try {
      const next = alarmPermissions.canRequestDisplay
        ? await requestAlarmPermissionStatus()
        : await checkAlarmPermissions()
      await refreshAfterPermission(next)
      setPermissionMessage(displayPermissionMessage(next, t))
    } finally {
      setPermissionAction(null)
    }
  }

  async function handleExactPermission() {
    if (!alarmPermissions || alarmPermissions.platform !== 'android') return
    setPermissionAction('exact')
    setPermissionMessage(null)
    try {
      const next = await openExactAlarmSettings()
      await refreshAfterPermission(next)
      setPermissionMessage(exactAlarmMessage(next, t) ?? t('reminder_exact_on'))
    } finally {
      setPermissionAction(null)
    }
  }

  return (
    <div className="page patient-page reminders-page enter-anim" style={{ maxWidth: 'var(--max-w)', margin: '0 auto', paddingBottom: 'calc(140px + env(safe-area-inset-bottom, 0px))' }}>
      {/* Header Banner */}
      <div
        className="reminders-hero"
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
            🔔 {t('nav_reminders')}
          </span>
          <span style={{ fontSize: 13, color: 'var(--muga-gold-light)', fontWeight: 600 }}>
            {new Date().toLocaleDateString(localeForLanguage(lang), { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, margin: '0 0 6px 0', color: '#ffffff' }}>
          {profile?.patient.name ? `${profile.patient.name} · ${t('nav_reminders')}` : t('nav_reminders')}
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', margin: 0 }}>
          {t('hydration_reminder')}
        </p>
      </div>

      {alarmPermissions && (
        <section
          className="card"
          aria-labelledby="reminder-alerts-title"
          style={{
            borderRadius: 20,
            padding: '18px 20px',
            marginBottom: 20,
            border: alarmPermissions.display === 'granted' && (alarmPermissions.platform !== 'android' || alarmPermissions.exactAlarm === 'granted')
              ? '1.5px solid var(--success)'
              : '1.5px solid var(--border)',
            background: 'var(--card)',
          }}
        >
          <h2 id="reminder-alerts-title" style={{ fontSize: 18, margin: '0 0 6px', color: 'var(--ink)' }}>
            🔔 {t('reminder_alerts_title')}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--ink-secondary)', lineHeight: 1.5, margin: '0 0 12px' }}>
            {displayPermissionMessage(alarmPermissions, t)}
          </p>
          {exactAlarmMessage(alarmPermissions, t) && (
            <p style={{ fontSize: 14, color: 'var(--ink-secondary)', lineHeight: 1.5, margin: '0 0 12px' }}>
              {exactAlarmMessage(alarmPermissions, t)}
            </p>
          )}
          {permissionMessage && (
            <p role="status" aria-live="polite" style={{ fontSize: 14, color: 'var(--ink-secondary)', lineHeight: 1.5, margin: '0 0 12px' }}>
              {permissionMessage}
            </p>
          )}
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            {alarmPermissions.display !== 'granted' && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void handleDisplayPermission()}
                disabled={permissionAction !== null}
              >
                {permissionAction === 'display'
                  ? t('reminder_permission_checking')
                  : alarmPermissions.canRequestDisplay
                  ? t('reminder_allow_notifications')
                  : t('reminder_check_notifications')}
              </button>
            )}
            {alarmPermissions.platform === 'android' && alarmPermissions.exactAlarm !== 'granted' && alarmPermissions.canOpenExactSettings && (
              <button
                type="button"
                className="btn btn-pearl"
                onClick={() => void handleExactPermission()}
                disabled={permissionAction !== null}
              >
                {permissionAction === 'exact' ? t('reminder_permission_checking') : t('reminder_allow_exact')}
              </button>
            )}
          </div>
        </section>
      )}

      {/* Tabs */}
      <div className="reminder-tabs" role="tablist" aria-label={t('nav_reminders')} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button
          type="button"
          role="tab"
          id="daily-reminders-tab"
          aria-selected={activeTab === 'daily'}
          aria-controls="daily-reminders-panel"
          onClick={() => setActiveTab('daily')}
          style={{
            flex: 1,
            background: activeTab === 'daily' ? 'var(--primary)' : 'var(--surface-muted)',
            color: activeTab === 'daily' ? 'var(--ink-on-primary)' : 'var(--ink)',
            border: 'none',
            borderRadius: 16,
            minHeight: 48,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          💧 {t('reminder_daily_tab')} ({dailyReminders.filter((r) => r.active ?? r.enabled ?? true).length})
        </button>
        <button
          type="button"
          role="tab"
          id="appointments-tab"
          aria-selected={activeTab === 'appointments'}
          aria-controls="appointments-panel"
          onClick={() => setActiveTab('appointments')}
          style={{
            flex: 1,
            background: activeTab === 'appointments' ? 'var(--primary)' : 'var(--surface-muted)',
            color: activeTab === 'appointments' ? 'var(--ink-on-primary)' : 'var(--ink)',
            border: 'none',
            borderRadius: 16,
            minHeight: 48,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          🩺 {t('reminder_appointments_tab')} ({upcomingAppointments.length})
        </button>
      </div>

      {/* Tab 1: Daily Reminders */}
      {activeTab === 'daily' && (
        <div id="daily-reminders-panel" role="tabpanel" aria-labelledby="daily-reminders-tab" className="reminder-list" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {dailyReminders.length === 0 ? (
            <div className="card empty-state" style={{ padding: 24, textAlign: 'center', borderRadius: 20 }}>
              <span style={{ fontSize: 44, display: 'block', marginBottom: 8 }}>💧</span>
              <h2 style={{ fontSize: 20, marginBottom: 8 }}>{t('reminder_no_daily')}</h2>
              <p style={{ color: 'var(--ink-muted)', fontSize: 15 }}>
                {t('meds_empty_sub')}
              </p>
            </div>
          ) : (
            dailyReminders
              .filter((r) => r.active ?? r.enabled ?? true)
              .map((r) => {
                const isDone = completedIds.includes(r.id)
                const title = lang === 'hi' && r.titleHi ? r.titleHi : r.title
                const category = localizeReminderCategory(r.category, t)

                return (
                  <div
                    key={r.id}
                    className="card reminder-card"
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
                    <div className="reminder-card-copy" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          background: isDone ? 'var(--success-soft)' : 'var(--surface-muted)',
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
                          ⏰ {r.time} · {category}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void toggleDone(r)}
                      style={{
                        width: 48,
                        height: 48,
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
                      aria-label={isDone ? t('reminder_completed', { title }) : t('reminder_mark_done', { title })}
                      aria-pressed={isDone}
                    >
                      <Icon name="check" size={24} color={isDone ? 'var(--ink-on-primary)' : 'var(--ink-faint)'} />
                    </button>
                    {isDone && <span className="status-text status-text-success">{t('reminder_done')}</span>}
                  </div>
                )
              })
          )}
        </div>
      )}

      {/* Tab 2: Doctor Appointments */}
      {activeTab === 'appointments' && (
        <div id="appointments-panel" role="tabpanel" aria-labelledby="appointments-tab" className="reminder-list" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {upcomingAppointments.length === 0 ? (
            <div className="card empty-state" style={{ padding: 24, textAlign: 'center', borderRadius: 20 }}>
              <span style={{ fontSize: 44, display: 'block', marginBottom: 8 }}>🩺</span>
              <h2 style={{ fontSize: 20, marginBottom: 8 }}>{t('no_appointments')}</h2>
              <p style={{ color: 'var(--ink-muted)', fontSize: 15 }}>
                {t('no_appointments')}
              </p>
            </div>
          ) : (
            upcomingAppointments.map((a) => {
              const isToday = a.date === todayStr
              return (
                <div
                  key={a.id}
                  className="card appointment-card"
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
                      {isToday ? t('reminder_today_date', { today: t('reminder_today'), date: a.date }) : a.date}
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
