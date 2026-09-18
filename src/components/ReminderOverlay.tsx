import { useEffect, useRef, useState } from 'react'
import { useApp } from '../state'
import { subscribeReminders, confirmAlarm, snoozeAlarm, type ActiveAlarm } from '../lib/reminders'
import { VoiceService } from '../lib/voice'
import { Icon } from '../components/Icons'

export function ReminderOverlay() {
  const { lang, profile, t } = useApp()
  const [alarm, setAlarm] = useState<ActiveAlarm | null>(null)
  const confirmButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    return subscribeReminders((newAlarm) => {
      setAlarm(newAlarm)
      if (newAlarm) {
        const spoken = `${newAlarm.title}. ${newAlarm.subtitle || ''}`
        void VoiceService.speak(spoken, { language: lang })
      }
    })
  }, [lang])

  useEffect(() => {
    if (!alarm) return
    const frame = window.requestAnimationFrame(() => confirmButtonRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [alarm])

  if (!alarm) return null

  const typeLabels: Record<string, { label: string; color: string }> = {
    med: { label: t('reminder_time'), color: '#FF5F56' },
    daily: { label: t('nav_reminders'), color: 'var(--success)' },
    appointment: { label: t('reminder_badge_appointment'), color: 'var(--info)' },
    routine: { label: t('reminder_badge_routine'), color: 'var(--warn)' },
  }

  const typeBadge = typeLabels[alarm.type] ?? typeLabels.daily

  return (
    <div
      className="reminder-overlay patient-reminder-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="reminder-overlay-title"
      aria-describedby={alarm.subtitle ? 'reminder-overlay-subtitle' : undefined}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'linear-gradient(180deg, #162436 0%, #0B131F 100%)',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'max(24px, var(--safe-top)) max(20px, var(--safe-right)) max(32px, var(--safe-bottom)) max(20px, var(--safe-left))',
        boxSizing: 'border-box',
        textAlign: 'center',
      }}
    >
      {/* Top Header Badge */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <span
          className="chip"
          style={{
            background: 'rgba(255, 255, 255, 0.12)',
            color: '#fff',
            border: `1px solid ${typeBadge.color}`,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1.2,
            padding: '6px 16px',
            borderRadius: 20,
          }}
        >
          🔔 {typeBadge.label}
        </span>
        <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--muga-gold-light)', marginTop: 4 }}>
          {alarm.time}
        </span>
      </div>

      {/* Center Alarm Focus Card */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: 420,
          width: '100%',
          margin: 'auto 0',
        }}
      >
        {/* Pulsing Visual Container */}
        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255, 95, 86, 0.25) 0%, rgba(22, 36, 54, 0) 70%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
            boxShadow: '0 0 32px rgba(255, 95, 86, 0.35)',
            animation: 'pulseGentle 1.8s infinite',
          }}
        >
          {alarm.details?.photo ? (
            <img
              src={alarm.details.photo}
              alt={alarm.title}
              style={{ width: 110, height: 110, borderRadius: '50%', objectFit: 'cover', border: '3px solid #fff' }}
            />
          ) : (
            <span style={{ fontSize: 72 }}>{alarm.emoji}</span>
          )}
        </div>

        <h1
          id="reminder-overlay-title"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(26px, 6vw, 36px)',
            fontWeight: 700,
            color: '#fff',
            margin: '0 0 8px 0',
            lineHeight: 1.25,
          }}
        >
          {alarm.title}
        </h1>

        {alarm.subtitle && (
          <p
            id="reminder-overlay-subtitle"
            style={{
              fontSize: 'var(--fs-body-lg)',
              color: 'rgba(255, 255, 255, 0.85)',
              margin: '0 0 16px 0',
              lineHeight: 1.4,
            }}
          >
            {alarm.subtitle}
          </p>
        )}

        {profile?.patient.name && (
          <div
            className="chip"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--ink-muted)',
              fontSize: 14,
              fontWeight: 500,
              padding: '6px 14px',
            }}
          >
            {profile.patient.avatar ?? '👵'} {profile.patient.name}
          </div>
        )}
      </div>

      {/* Bottom Tremor-Friendly Controls: 96px Round Button + Snooze */}
      <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
        {/* Large 96px Green Action Target */}
        <button
          type="button"
          ref={confirmButtonRef}
          onClick={() => void confirmAlarm(alarm, 'tap')}
          style={{
            width: 96,
            height: 96,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2D7A4F 0%, #1E5637 100%)',
            boxShadow: '0 6px 24px rgba(45, 122, 79, 0.45)',
            border: '3px solid rgba(255,255,255,0.3)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'transform 0.15s ease',
          }}
          aria-label={t('taken_btn')}
        >
          <Icon name="check" size={36} color="#FFFFFF" />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', marginTop: 2 }}>
            {t('taken_btn')}
          </span>
        </button>

        {/* Generous Snooze Button */}
        <button
          type="button"
          className="btn btn-block"
          onClick={() => void snoozeAlarm(alarm)}
          style={{
            minHeight: 52,
            borderRadius: 16,
            fontSize: 15,
            fontWeight: 600,
            background: 'rgba(255, 255, 255, 0.12)',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.25)',
          }}
        >
          ⏰ {t('snooze_btn')}
        </button>
      </div>
    </div>
  )
}
