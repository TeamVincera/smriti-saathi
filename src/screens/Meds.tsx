import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../state'
import { getMedLog } from '../lib/db'
import { confirmAlarm } from '../lib/reminders'
import type { MedLogEntry, Med } from '../lib/types'
import { playChime } from '../lib/audio'
import { Icon } from '../components/Icons'
import { navigate } from '../router'

export function Meds() {
  const { meds: stateMeds, t } = useApp()
  const [log, setLog] = useState<MedLogEntry[]>([])
  const [takenSlots, setTakenSlots] = useState<Record<string, string>>({})

  useEffect(() => {
    void getMedLog().then((entries) => {
      setLog(entries)
      const todayStr = new Date().toDateString()
      const todaySlots: Record<string, string> = {}
      for (const entry of entries) {
        if (entry.status === 'taken' && new Date(entry.ts).toDateString() === todayStr) {
          const formatted = new Date(entry.ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
          todaySlots[`${entry.medId}-${entry.scheduledFor}`] = formatted
        }
      }
      setTakenSlots(todaySlots)
    })
  }, [])

  const medsToDisplay = useMemo(() => stateMeds.filter((m) => m.active), [stateMeds])

  const today = new Date()
  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Mon ...
  const weekDays = [
    { label: 'M', dayIndex: 1 },
    { label: 'T', dayIndex: 2 },
    { label: 'W', dayIndex: 3 },
    { label: 'T', dayIndex: 4 },
    { label: 'F', dayIndex: 5 },
    { label: 'S', dayIndex: 6 },
    { label: 'S', dayIndex: 0 },
  ]

  const handleTake = async (medId: string, timeStr: string) => {
    const key = `${medId}-${timeStr}`
    const timeNow = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
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

  // Categorize meds by time
  const morningMeds = medsToDisplay.filter((m) => m.times.some((t) => parseInt(t.split(':')[0], 10) < 12))
  const afternoonMeds = medsToDisplay.filter((m) => m.times.some((t) => {
    const h = parseInt(t.split(':')[0], 10)
    return h >= 12 && h < 18
  }))
  const nightMeds = medsToDisplay.filter((m) => m.times.some((t) => parseInt(t.split(':')[0], 10) >= 18))

  return (
    <div className="page enter-anim">
      {/* Title + Date */}
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: '#162436', marginBottom: 4 }}>
        Today's Medicines
      </h1>
      <p style={{ fontSize: 16, color: '#4A5568', marginBottom: 20 }}>
        {formattedDate}
      </p>

      {/* Weekly Progress Card */}
      <section
        className="card"
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
            color: '#6B7280',
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            marginBottom: 16,
          }}
        >
          WEEKLY PROGRESS
        </span>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {weekDays.map((d, i) => {
            const isPast = (dayOfWeek === 0 ? 7 : dayOfWeek) > (d.dayIndex === 0 ? 7 : d.dayIndex)
            const isToday = (dayOfWeek === 0 ? 7 : dayOfWeek) === (d.dayIndex === 0 ? 7 : d.dayIndex)

            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: isToday ? '#162436' : '#9CA3AF' }}>
                  {d.label}
                </span>

                {isPast ? (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: '#1F6B42',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    ✓
                  </div>
                ) : isToday ? (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      border: '2px solid #162436',
                      background: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#162436' }} />
                  </div>
                ) : (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: '#E5E7EB',
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </section>

      {medsToDisplay.length === 0 ? (
        /* Empty-state UI when no medications are added */
        <div
          className="card"
          style={{
            borderRadius: 24,
            padding: '40px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: '#FFFFFF',
            border: '1.5px dashed #D1D5DB',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: '#F0F4F8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 30,
              marginBottom: 16,
            }}
          >
            💊
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: '#162436', marginBottom: 8 }}>
            {t('meds_empty')}
          </h2>
          <p style={{ fontSize: 14, color: '#6B7280', maxWidth: 300, marginBottom: 24, lineHeight: 1.5 }}>
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
            <Icon name="plus" size={18} /> Add Medication
          </button>
        </div>
      ) : (
        <>
          {/* Morning Section */}
          {morningMeds.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 18 }}>☀️</span>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: '#162436' }}>
                  Morning
                </h2>
              </div>

              {morningMeds.map((med) => {
                const time = med.times.find((t) => parseInt(t.split(':')[0], 10) < 12) || med.times[0]
                const isTaken = !!takenSlots[`${med.id}-${time}`]
                const takenAt = takenSlots[`${med.id}-${time}`] || time

                return (
                  <div
                    key={med.id}
                    className="card"
                    style={{
                      borderRadius: 24,
                      padding: '20px',
                      marginBottom: 12,
                      background: isTaken ? '#EAF6EC' : '#FFFFFF',
                      border: isTaken ? '1.5px solid #A4DCA9' : '1.5px solid var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 16,
                          background: isTaken ? '#C4E8CD' : '#DDE7F2',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#2D7A4F',
                        }}
                      >
                        <Icon name="pill" size={26} color="#2D7A4F" />
                      </div>
                      <div>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, color: '#162436', marginBottom: 2 }}>
                          {med.name}
                        </h3>
                        <p style={{ fontSize: 14, color: '#4A5568' }}>
                          {med.dosage}
                        </p>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: isTaken ? '#1B5E3A' : '#6B7280', marginTop: 4 }}>
                          {isTaken ? `✓ Taken at ${takenAt}` : `Scheduled for ${time}`}
                        </span>
                      </div>
                    </div>

                    {isTaken ? (
                      <button
                        type="button"
                        className="btn btn-block"
                        disabled
                        style={{
                          background: '#DDD5C7',
                          color: '#4A4A4A',
                          borderRadius: 14,
                          minHeight: 44,
                          fontSize: 15,
                          fontWeight: 600,
                        }}
                      >
                        Taken
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-block"
                        onClick={() => handleTake(med.id, time)}
                        style={{
                          background: 'var(--secondary)',
                          color: '#fff',
                          borderRadius: 14,
                          minHeight: 48,
                          fontSize: 15,
                          fontWeight: 600,
                        }}
                      >
                        Mark as Taken
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Afternoon Section */}
          {afternoonMeds.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 18 }}>☀️</span>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: '#162436' }}>
                  Afternoon
                </h2>
              </div>

              {afternoonMeds.map((med) => {
                const time = med.times.find((t) => {
                  const h = parseInt(t.split(':')[0], 10)
                  return h >= 12 && h < 18
                }) || med.times[0]
                const isTaken = !!takenSlots[`${med.id}-${time}`]
                const takenAt = takenSlots[`${med.id}-${time}`]

                return (
                  <div
                    key={med.id}
                    className="card"
                    style={{
                      borderRadius: 24,
                      padding: '20px',
                      marginBottom: 12,
                      position: 'relative',
                      overflow: 'hidden',
                      background: isTaken ? '#EAF6EC' : '#FFFFFF',
                      border: isTaken ? '1.5px solid #A4DCA9' : '1.5px solid var(--border)',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 5,
                        background: '#D97706',
                        borderRadius: '24px 0 0 24px',
                      }}
                    />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 16,
                          background: isTaken ? '#C4E8CD' : '#CCE5FB',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 13,
                          fontWeight: 800,
                          color: '#0284C7',
                        }}
                      >
                        <Icon name="pill" size={26} color="#0284C7" />
                      </div>
                      <div>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, color: '#162436', marginBottom: 2 }}>
                          {med.name}
                        </h3>
                        <p style={{ fontSize: 14, color: '#4A5568' }}>
                          {med.dosage}
                        </p>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: '#B45309', marginTop: 4 }}>
                          🕒 {isTaken ? `Taken at ${takenAt}` : `Scheduled for ${time}`}
                        </span>
                      </div>
                    </div>

                    {isTaken ? (
                      <button
                        type="button"
                        className="btn btn-block"
                        disabled
                        style={{
                          background: '#DDD5C7',
                          color: '#4A4A4A',
                          borderRadius: 14,
                          minHeight: 44,
                          fontSize: 15,
                          fontWeight: 600,
                        }}
                      >
                        Taken
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-block"
                        onClick={() => handleTake(med.id, time)}
                        style={{
                          background: 'var(--secondary)',
                          color: '#fff',
                          borderRadius: 14,
                          minHeight: 48,
                          fontSize: 15,
                          fontWeight: 600,
                        }}
                      >
                        Mark as Taken
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Night Section */}
          {nightMeds.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 18 }}>🌙</span>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: '#162436' }}>
                  Night
                </h2>
              </div>

              {nightMeds.map((med) => {
                const time = med.times.find((t) => parseInt(t.split(':')[0], 10) >= 18) || med.times[0]
                const isTaken = !!takenSlots[`${med.id}-${time}`]
                const takenAt = takenSlots[`${med.id}-${time}`]

                return (
                  <div
                    key={med.id}
                    className="card"
                    style={{
                      borderRadius: 24,
                      padding: '20px',
                      marginBottom: 12,
                      background: isTaken ? '#EAF6EC' : '#FFFFFF',
                      border: isTaken ? '1.5px solid #A4DCA9' : '1.5px solid var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 16,
                          background: isTaken ? '#C4E8CD' : '#DED2F4',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 22,
                        }}
                      >
                        💊
                      </div>
                      <div>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, color: '#162436', marginBottom: 2 }}>
                          {med.name}
                        </h3>
                        <p style={{ fontSize: 14, color: '#4A5568' }}>
                          {med.dosage}
                        </p>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: '#4B5563', marginTop: 4 }}>
                          🕒 {isTaken ? `Taken at ${takenAt}` : `Scheduled for ${time}`}
                        </span>
                      </div>
                    </div>

                    {isTaken ? (
                      <button
                        type="button"
                        className="btn btn-block"
                        disabled
                        style={{
                          background: '#DDD5C7',
                          color: '#4A4A4A',
                          borderRadius: 14,
                          minHeight: 44,
                          fontSize: 15,
                          fontWeight: 600,
                        }}
                      >
                        Taken
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-block"
                        onClick={() => handleTake(med.id, time)}
                        style={{
                          background: 'var(--secondary)',
                          color: '#fff',
                          borderRadius: 14,
                          minHeight: 48,
                          fontSize: 15,
                          fontWeight: 600,
                        }}
                      >
                        Mark as Taken
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
