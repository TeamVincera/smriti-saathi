import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useApp } from '../state'
import { subscribeReminders, confirmAlarm, snoozeAlarm, type ActiveAlarm } from '../lib/reminders'
import { VoiceService } from '../lib/voice'
import { Icon } from '../components/Icons'

export function ReminderOverlay() {
  const { lang, profile } = useApp()
  const [alarm, setAlarm] = useState<ActiveAlarm | null>(null)
  const [slideX, setSlideX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const sliderTrackRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef(0)

  useEffect(() => {
    return subscribeReminders((newAlarm) => {
      setAlarm(newAlarm)
      if (newAlarm) {
        // Speak announcement aloud gently
        const prompt =
          newAlarm.type === 'med'
            ? lang === 'hi'
              ? `दवा का समय हो गया है। ${newAlarm.title}`
              : `It is time to take your medicine, ${newAlarm.title}.`
            : newAlarm.type === 'appointment'
            ? lang === 'hi'
              ? `डॉक्टर की अपॉइंटमेंट का समय है। ${newAlarm.title}`
              : `Your doctor appointment is coming up, ${newAlarm.title}.`
            : lang === 'hi'
            ? `दैनिक याद। ${newAlarm.title}`
            : `Here is your reminder, ${newAlarm.title}.`

        void VoiceService.speak(prompt, { language: lang })
      } else {
        VoiceService.stop()
      }
    })
  }, [lang])

  if (!alarm) return null

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    setIsDragging(true)
    startXRef.current = e.clientX
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging || !sliderTrackRef.current) return
    const trackWidth = sliderTrackRef.current.clientWidth - 68
    const delta = Math.max(0, Math.min(trackWidth, e.clientX - startXRef.current))
    setSlideX(delta)

    if (trackWidth > 0 && delta >= trackWidth * 0.82) {
      setIsDragging(false)
      setSlideX(0)
      void confirmAlarm(alarm, 'slide')
    }
  }

  const handlePointerUp = () => {
    if (!isDragging) return
    setIsDragging(false)
    setSlideX(0)
  }

  const typeLabels: Record<string, { en: string; hi: string; color: string }> = {
    med: { en: 'MEDICINE REMINDER', hi: 'दवा का समय', color: '#FF5F56' },
    daily: { en: 'DAILY REMINDER', hi: 'दैनिक याद', color: '#2D7A4F' },
    appointment: { en: 'DOCTOR APPOINTMENT', hi: 'डॉक्टर की अपॉइंटमेंट', color: '#1B6CA8' },
    routine: { en: 'DAILY ROUTINE', hi: 'दैनिक दिनचर्या', color: '#8A5D2C' },
  }

  const typeBadge = typeLabels[alarm.type] ?? typeLabels.daily

  return (
    <div
      className="reminder-overlay"
      role="alertdialog"
      aria-label={alarm.title}
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
          🔔 {lang === 'hi' ? typeBadge.hi : typeBadge.en}
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
              color: '#CCD4E0',
              fontSize: 14,
              fontWeight: 500,
              padding: '6px 14px',
            }}
          >
            {profile.patient.avatar ?? '👵'} {profile.patient.name}
          </div>
        )}
      </div>

      {/* Bottom Controls: Slide to Stop & Snooze */}
      <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
        {/* Slide To Stop Track */}
        <div
          ref={sliderTrackRef}
          style={{
            width: '100%',
            height: 68,
            borderRadius: 34,
            background: 'rgba(255, 255, 255, 0.12)',
            border: '2px solid rgba(255, 255, 255, 0.25)',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            userSelect: 'none',
            touchAction: 'none',
          }}
        >
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: 0.5,
              color: 'rgba(255, 255, 255, 0.75)',
              pointerEvents: 'none',
              paddingLeft: 36,
            }}
          >
            {lang === 'hi' ? 'रोकने के लिए सरकाएं →' : 'Slide to Stop →'}
          </span>

          {/* Draggable Slider Thumb */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              position: 'absolute',
              left: 4,
              transform: `translateX(${slideX}px)`,
              width: 58,
              height: 58,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2D7A4F 0%, #1E5637 100%)',
              boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'grab',
              transition: isDragging ? 'none' : 'transform 0.25s ease',
            }}
          >
            <Icon name="check" size={28} color="#fff" />
          </div>
        </div>

        {/* Buttons Row: Tap to Complete & Snooze */}
        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={() => void snoozeAlarm(alarm)}
            style={{
              flex: 1,
              minHeight: 48,
              borderRadius: 16,
              fontSize: 14,
              fontWeight: 600,
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            ⏰ {lang === 'hi' ? '10 मिनट बाद (स्नूज़)' : 'Snooze 10m'}
          </button>

          <button
            type="button"
            className="btn btn-block"
            onClick={() => void confirmAlarm(alarm, 'tap')}
            style={{
              flex: 1,
              minHeight: 48,
              borderRadius: 16,
              fontSize: 14,
              fontWeight: 600,
              background: 'var(--success)',
              color: '#fff',
              border: 'none',
            }}
          >
            ✓ {lang === 'hi' ? 'पूर्ण हुआ' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  )
}
