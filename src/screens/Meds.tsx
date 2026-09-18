import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../state'
import { getMedLog } from '../lib/db'
import { confirmAlarm } from '../lib/reminders'
import type { MedLogEntry, Med } from '../lib/types'
import { playChime } from '../lib/audio'
import { Icon } from '../components/Icons'
import { navigate } from '../router'
import { localeForLanguage } from '../i18n'

const DAY_KEYS = [
  'med_day_sunday',
  'med_day_monday',
  'med_day_tuesday',
  'med_day_wednesday',
  'med_day_thursday',
  'med_day_friday',
  'med_day_saturday',
] as const

export function Meds() {
  const { meds: stateMeds, lang, t } = useApp()
  const [log, setLog] = useState<MedLogEntry[]>([])
  const [takenSlots, setTakenSlots] = useState<Record<string, string>>({})

  useEffect(() => {
    void getMedLog().then((entries) => {
      setLog(entries)
      const todayStr = new Date().toDateString()
      const todaySlots: Record<string, string> = {}
      for (const entry of entries) {
        if (entry.status === 'taken' && new Date(entry.ts).toDateString() === todayStr) {
          const formatted = new Date(entry.ts).toLocaleTimeString(localeForLanguage(lang), { hour: 'numeric', minute: '2-digit', hour12: true })
          todaySlots[`${entry.medId}-${entry.scheduledFor}`] = formatted
        }
      }
      setTakenSlots(todaySlots)
    })
  }, [lang])

  const medsToDisplay = useMemo(() => stateMeds.filter((m) => m.active), [stateMeds])

  const today = new Date()
  const formattedDate = today.toLocaleDateString(localeForLanguage(lang), {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Mon ...
  const weekDays = useMemo(() => {
    const monday = new Date(today)
    const mondayOffset = (today.getDay() + 6) % 7
    monday.setDate(today.getDate() - mondayOffset)
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      return {
        label: new Intl.DateTimeFormat(localeForLanguage(lang), { weekday: 'short' }).format(date),
        dayIndex: date.getDay(),
      }
    })
  }, [lang, today.toDateString()])

  // Map each day of current week to date string and check if meds were taken in log
  const weekDayAdherence = useMemo(() => {
    const map: Record<number, boolean> = {}
    const now = new Date()
    const currentMonOffset = (now.getDay() + 6) % 7 // 0 for Mon, 6 for Sun
    const monday = new Date(now)
    monday.setDate(now.getDate() - currentMonOffset)
    monday.setHours(0, 0, 0, 0)

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      const dayStr = d.toDateString()
      const dayIdx = (i + 1) % 7 // 1=Mon, ..., 0=Sun
      const hasTaken = log.some((e) => e.status === 'taken' && new Date(e.ts).toDateString() === dayStr)
      map[dayIdx] = hasTaken
    }
    return map
  }, [log])

  const handleTake = async (medId: string, timeStr: string) => {
    const key = `${medId}-${timeStr}`
    const timeNow = new Date().toLocaleTimeString(localeForLanguage(lang), { hour: 'numeric', minute: '2-digit', hour12: true })
    setTakenSlots((prev) => ({ ...prev, [key]: timeNow }))

    const med = medsToDisplay.find((m) => m.id === medId)
    if (med) {
      await confirmAlarm({
        id: med.id,
        key: `med:${med.id}|${Date.now()}`,
        type: 'med',
        title: med.name,
        emoji: '💊',
        time: timeStr,
        details: { medId: med.id, dosage: med.dosage, food: med.food },
      }, 'tap')
    }
    playChime()
  }

  // Categorize med dose slots by time period
  const morningSlots = useMemo(() => {
    const slots: Array<{ med: Med; time: string }> = []
    for (const med of medsToDisplay) {
      for (const time of med.times) {
        const h = parseInt(time.split(':')[0], 10)
        if (h < 12) slots.push({ med, time })
      }
    }
    return slots.sort((a, b) => a.time.localeCompare(b.time))
  }, [medsToDisplay])

  const afternoonSlots = useMemo(() => {
    const slots: Array<{ med: Med; time: string }> = []
    for (const med of medsToDisplay) {
      for (const time of med.times) {
        const h = parseInt(time.split(':')[0], 10)
        if (h >= 12 && h < 18) slots.push({ med, time })
      }
    }
    return slots.sort((a, b) => a.time.localeCompare(b.time))
  }, [medsToDisplay])

  const nightSlots = useMemo(() => {
    const slots: Array<{ med: Med; time: string }> = []
    for (const med of medsToDisplay) {
      for (const time of med.times) {
        const h = parseInt(time.split(':')[0], 10)
        if (h >= 18) slots.push({ med, time })
      }
    }
    return slots.sort((a, b) => a.time.localeCompare(b.time))
  }, [medsToDisplay])

  return (
    <div className="page patient-page meds-page enter-anim" style={{ maxWidth: 'var(--max-w)', margin: '0 auto', paddingBottom: 'calc(140px + env(safe-area-inset-bottom, 0px))' }}>
      {/* Title + Date */}
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
        {t('nav_meds')}
      </h1>
      <p style={{ fontSize: 16, color: 'var(--ink-secondary)', marginBottom: 20 }}>
        {formattedDate}
      </p>

      {/* Weekly Progress Card */}
      <section
        className="card"
        aria-labelledby="weekly-adherence-title"
        style={{
          borderRadius: 24,
          padding: '20px',
          marginBottom: 24,
        }}
      >
        <span
          style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--ink-muted)',
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            marginBottom: 16,
          }}
        >
          <span id="weekly-adherence-title">{t('adherence_week')}</span>
        </span>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {weekDays.map((d, i) => {
            const currentMonOffset = (dayOfWeek + 6) % 7
            const dayMonOffset = (d.dayIndex + 6) % 7
            const isPast = dayMonOffset < currentMonOffset
            const isToday = dayMonOffset === currentMonOffset
            const hadTaken = weekDayAdherence[d.dayIndex]

            return (
              <div key={i} className="adherence-day" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <span
                  aria-label={isToday
                    ? t('med_day_today', { day: fullDayName(d.dayIndex, t), today: t('med_today') })
                    : fullDayName(d.dayIndex, t)}
                  style={{ fontSize: 12, fontWeight: 600, color: isToday ? 'var(--ink)' : 'var(--ink-muted)' }}
                >
                  {d.label}
                </span>

                {isPast ? (
                  hadTaken ? (
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: 'var(--success)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                      title={t('med_taken')}
                      aria-label={t('med_day_taken', { day: fullDayName(d.dayIndex, t), status: t('med_taken') })}
                    >
                      ✓
                    </div>
                  ) : (
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: 'var(--surface-muted)',
                        color: 'var(--ink-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                      }}
                      title={t('med_no_dose')}
                      aria-label={t('med_day_no_dose', { day: fullDayName(d.dayIndex, t), status: t('med_no_dose') })}
                    >
                      –
                    </div>
                  )
                ) : isToday ? (
                  <div
                    role="img"
                    aria-label={hadTaken
                      ? t('med_day_dose_taken_today', { day: fullDayName(d.dayIndex, t), status: t('med_dose_taken_today') })
                      : t('med_day_dose_not_taken', { day: fullDayName(d.dayIndex, t), status: t('med_dose_not_taken') })}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      border: '2px solid var(--primary)',
                      background: 'var(--card)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: hadTaken ? 'var(--success)' : 'var(--primary)' }} />
                  </div>
                ) : (
                  <div
                    role="img"
                    aria-label={t('med_day_upcoming', { day: fullDayName(d.dayIndex, t), status: t('med_upcoming') })}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'var(--border)',
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </section>

      {morningSlots.length === 0 && afternoonSlots.length === 0 && nightSlots.length === 0 ? (
        /* Empty-state UI when no medications are added */
        <div
          className="card empty-state meds-empty-state"
          style={{
            borderRadius: 24,
            padding: '40px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'var(--card)',
            border: '1.5px dashed var(--border)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'var(--surface-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 30,
              marginBottom: 16,
            }}
          >
            💊
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
            {t('meds_empty')}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--ink-muted)', maxWidth: 300, marginBottom: 24, lineHeight: 1.5 }}>
            {t('meds_empty_sub')}
          </p>
          <button
            type="button"
            className="btn btn-cta"
            onClick={() => navigate('/hub')}
            style={{
              borderRadius: 14,
              minHeight: 48,
              padding: '12px 28px',
              fontSize: 15,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Icon name="plus" size={18} /> {t('add_med')}
          </button>
        </div>
      ) : (
        <>
          {/* Morning Section */}
          {morningSlots.length > 0 && (
            <div className="med-period" style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 18 }}>☀️</span>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
                  {t('med_morning')}
                </h2>
              </div>

              {morningSlots.map(({ med, time }) => {
                const slotKey = `${med.id}-${time}`
                const isTaken = !!takenSlots[slotKey]
                const takenAt = takenSlots[slotKey] || time

                return (
                  <div
                    key={slotKey}
                    className="card med-slot-card"
                    style={{
                      borderRadius: 24,
                      padding: '20px',
                      marginBottom: 12,
                      background: isTaken ? 'var(--success-soft)' : 'var(--card)',
                      border: isTaken ? '1.5px solid var(--pastel-green-border)' : '1.5px solid var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 16,
                          background: isTaken ? 'var(--success-soft)' : 'var(--info-soft)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--success)',
                        }}
                      >
                        <Icon name="pill" size={26} color="var(--success)" />
                      </div>
                      <div>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>
                          {med.name}
                        </h3>
                        <p style={{ fontSize: 14, color: 'var(--ink-secondary)' }}>
                          {med.dosage}
                        </p>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: isTaken ? 'var(--success-text)' : 'var(--ink-muted)', marginTop: 4 }}>
                          {isTaken ? `✓ ${t('med_taken_at', { time: takenAt })}` : t('med_scheduled_for', { time })}
                        </span>
                      </div>
                    </div>

                    {isTaken ? (
                      <button
                        type="button"
                        className="btn btn-block"
                        disabled
                        aria-label={`${med.name}, ${time}: ${t('taken_btn')}`}
                        style={{
                          background: 'var(--border)',
                          color: 'var(--ink-secondary)',
                          borderRadius: 14,
                          minHeight: 44,
                          fontSize: 15,
                          fontWeight: 600,
                        }}
                      >
                        ✓ {t('taken_btn')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-block"
                        onClick={() => handleTake(med.id, time)}
                        aria-label={`${med.name}, ${time}: ${t('taken_btn')}`}
                        style={{
                          background: '#15803D',
                          color: '#fff',
                          borderRadius: 14,
                          minHeight: 48,
                          fontSize: 15,
                          fontWeight: 600,
                        }}
                      >
                        {t('taken_btn')}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Afternoon Section */}
          {afternoonSlots.length > 0 && (
            <div className="med-period" style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 18 }}>☀️</span>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
                  {t('med_afternoon')}
                </h2>
              </div>

              {afternoonSlots.map(({ med, time }) => {
                const slotKey = `${med.id}-${time}`
                const isTaken = !!takenSlots[slotKey]
                const takenAt = takenSlots[slotKey]

                return (
                  <div
                    key={slotKey}
                    className="card med-slot-card"
                    style={{
                      borderRadius: 24,
                      padding: '20px',
                      marginBottom: 12,
                      position: 'relative',
                      overflow: 'hidden',
                      background: isTaken ? 'var(--success-soft)' : 'var(--card)',
                      border: isTaken ? '1.5px solid var(--pastel-green-border)' : '1.5px solid var(--border)',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 5,
                        background: 'var(--warn)',
                        borderRadius: '24px 0 0 24px',
                      }}
                    />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 16,
                          background: isTaken ? 'var(--success-soft)' : 'var(--info-soft)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 13,
                          fontWeight: 800,
                          color: 'var(--info)',
                        }}
                      >
                        <Icon name="pill" size={26} color="var(--info)" />
                      </div>
                      <div>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>
                          {med.name}
                        </h3>
                        <p style={{ fontSize: 14, color: 'var(--ink-secondary)' }}>
                          {med.dosage}
                        </p>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: 'var(--warn)', marginTop: 4 }}>
                          🕒 {isTaken ? t('med_taken_at', { time: takenAt }) : t('med_scheduled_for', { time })}
                        </span>
                      </div>
                    </div>

                    {isTaken ? (
                      <button
                        type="button"
                        className="btn btn-block"
                        disabled
                        aria-label={`${med.name}, ${time}: ${t('taken_btn')}`}
                        style={{
                          background: 'var(--border)',
                          color: 'var(--ink-secondary)',
                          borderRadius: 14,
                          minHeight: 44,
                          fontSize: 15,
                          fontWeight: 600,
                        }}
                      >
                        ✓ {t('taken_btn')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-block"
                        onClick={() => handleTake(med.id, time)}
                        aria-label={`${med.name}, ${time}: ${t('taken_btn')}`}
                        style={{
                          background: '#15803D',
                          color: '#fff',
                          borderRadius: 14,
                          minHeight: 48,
                          fontSize: 15,
                          fontWeight: 600,
                        }}
                      >
                        {t('taken_btn')}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Night Section */}
          {nightSlots.length > 0 && (
            <div className="med-period" style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 18 }}>🌙</span>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
                  {t('med_night')}
                </h2>
              </div>

              {nightSlots.map(({ med, time }) => {
                const slotKey = `${med.id}-${time}`
                const isTaken = !!takenSlots[slotKey]
                const takenAt = takenSlots[slotKey]

                return (
                  <div
                    key={slotKey}
                    className="card med-slot-card"
                    style={{
                      borderRadius: 24,
                      padding: '20px',
                      marginBottom: 12,
                      background: isTaken ? 'var(--success-soft)' : 'var(--card)',
                      border: isTaken ? '1.5px solid var(--pastel-green-border)' : '1.5px solid var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 16,
                          background: isTaken ? 'var(--success-soft)' : 'var(--pastel-purple)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 22,
                        }}
                      >
                        💊
                      </div>
                      <div>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>
                          {med.name}
                        </h3>
                        <p style={{ fontSize: 14, color: 'var(--ink-secondary)' }}>
                          {med.dosage}
                        </p>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: 'var(--ink-secondary)', marginTop: 4 }}>
                          🕒 {isTaken ? t('med_taken_at', { time: takenAt }) : t('med_scheduled_for', { time })}
                        </span>
                      </div>
                    </div>

                    {isTaken ? (
                      <button
                        type="button"
                        className="btn btn-block"
                        disabled
                        aria-label={`${med.name}, ${time}: ${t('taken_btn')}`}
                        style={{
                          background: 'var(--border)',
                          color: 'var(--ink-secondary)',
                          borderRadius: 14,
                          minHeight: 44,
                          fontSize: 15,
                          fontWeight: 600,
                        }}
                      >
                        ✓ {t('taken_btn')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-block"
                        onClick={() => handleTake(med.id, time)}
                        aria-label={`${med.name}, ${time}: ${t('taken_btn')}`}
                        style={{
                          background: '#15803D',
                          color: '#fff',
                          borderRadius: 14,
                          minHeight: 48,
                          fontSize: 15,
                          fontWeight: 600,
                        }}
                      >
                        {t('taken_btn')}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function fullDayName(dayIndex: number, t: (key: string) => string): string {
  return t(DAY_KEYS[dayIndex] ?? 'med_day_sunday')
}
