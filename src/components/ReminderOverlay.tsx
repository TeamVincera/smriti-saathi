import { useEffect, useState } from 'react'
import { useApp } from '../state'
import { subscribeReminders, confirmTaken, snoozeDose, voiceConfirmYes } from '../lib/reminders'
import type { DueDose } from '../lib/reminders'
import { Icon } from '../components/Icons'

const FOOD_ICONS: Record<string, string> = { before: '🍽️ → 💊', after: '💊 → 🍽️', none: '🕒' }

export function ReminderOverlay() {
  const { t, lang, profile, addGardenPoints } = useApp()
  const [dose, setDose] = useState<DueDose | null>(null)
  const [listening, setListening] = useState(false)

  useEffect(() => subscribeReminders(setDose), [])

  if (!dose) return null

  async function take(method: 'tap' | 'voice') {
    await confirmTaken(dose!.med, dose!.key.split('|')[1], method)
    await addGardenPoints(2, 'med')
    setDose(null)
  }

  return (
    <div className="reminder-overlay" role="alertdialog" aria-label={t('reminder_time')}>
      <p className="display-md">{t('reminder_time')}</p>
      <div
        style={{
          width: 'min(64vw, 220px)',
          height: 'min(64vw, 220px)',
          borderRadius: 'var(--r-lg)',
          border: '3px solid var(--hairline)',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 'clamp(80px, 18vw, 140px)',
          overflow: 'hidden',
        }}
      >
        {dose.med.photo ? (
          <img src={dose.med.photo} alt={dose.med.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          formEmoji(dose.med.form)
        )}
      </div>
      <h2 className="display-lg">{dose.med.name}</h2>
      <div className="row" style={{ justifyContent: 'center' }}>
        <span className="chip chip-selected" style={{ fontSize: 'var(--fs-body)' }}>
          {FOOD_ICONS[dose.med.food]}{' '}
          {dose.med.food === 'before' ? t('reminder_food_before') : dose.med.food === 'after' ? t('reminder_food_after') : ''}
        </span>
        <span className="chip chip-selected" style={{ fontSize: 'var(--fs-body)' }}>
          {dose.med.dosage} · {dose.time}
        </span>
      </div>
      {profile?.patient.name && (
        <p className="lead">
          {profile.patient.avatar ?? '👵'} {profile.patient.name}
        </p>
      )}
      <button
        className="btn btn-primary"
        style={{ minHeight: 104, minWidth: 260, fontSize: 'clamp(24px, 3vw, 30px)', background: 'var(--success)' }}
        onClick={() => void take('tap')}
      >
        <Icon name="check" size={34} /> {t('taken_btn')}
      </button>
      <div className="row">
        <button className="btn btn-pearl" style={{ minHeight: 72 }} onClick={() => void snoozeDose(dose)}>
          ⏰ {t('snooze_btn')}
        </button>
        <button
          className={`btn btn-secondary ${listening ? 'cue-target' : ''}`}
          style={{ minHeight: 72 }}
          onClick={async () => {
            setListening(true)
            const yes = await voiceConfirmYes(lang)
            setListening(false)
            if (yes) void take('voice')
          }}
        >
          🎙 {t('yes')}?
        </button>
      </div>
    </div>
  )
}

export function formEmoji(form: string): string {
  return form === 'tablet' ? '💊' : form === 'capsule' ? '💊' : form === 'syrup' ? '🧴' : '💉'
}
