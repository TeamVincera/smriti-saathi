import { useEffect, useRef } from 'react'

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function useCountdown(active: boolean, ms: number, onFire: () => void) {
  const firedRef = useRef(false)
  useEffect(() => {
    if (!active) {
      firedRef.current = false
      return
    }
    const t = setTimeout(() => {
      if (!firedRef.current) {
        firedRef.current = true
        onFire()
      }
    }, ms)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, ms])
}

export interface RoundHeaderProps {
  now: number
  total: number
  unit?: 'question' | 'round' | 'step' | 'part'
  label?: string
  sub?: string
}

export function RoundHeader({ now, total, unit = 'question', label, sub }: RoundHeaderProps) {
  const clampedNow = Math.min(Math.max(now, 1), Math.max(total, 1))
  const pct = Math.min(100, Math.max(0, (clampedNow / Math.max(total, 1)) * 100))
  const remaining = Math.max(0, total - clampedNow)

  const prefix = unit === 'step' ? 'Step' : unit === 'round' ? 'Round' : 'Question'

  return (
    <div className="question-banner enter-anim">
      <div className="question-banner-inner">
        <div className="question-badge">
          <span className="question-badge-dot" />
          <span className="question-badge-text">
            {prefix} <strong>{clampedNow}</strong> of <strong>{total}</strong>
          </span>
        </div>
        <div className="question-banner-meta">
          {label ? (
            <span className="question-chip">{label}</span>
          ) : (
            <span className="question-chip muted-chip">
              {sub ?? (remaining > 0 ? `${remaining} more to go` : 'Final question! 🎉')}
            </span>
          )}
        </div>
      </div>
      <div className="question-progress-track" role="progressbar" aria-valuenow={clampedNow} aria-valuemin={1} aria-valuemax={total}>
        <div className="question-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export { RoundHeader as QuestionBanner }
