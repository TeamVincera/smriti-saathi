import { useCallback, useEffect, useRef } from 'react'
import { useApp } from '../state'
import { translate } from '../i18n'
import type { Language } from '../lib/types'

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

/** Schedule a game UI timer that is always canceled when the game unmounts. */
export function useGameTimeout() {
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())

  useEffect(() => {
    return () => {
      for (const timer of timersRef.current) clearTimeout(timer)
      timersRef.current.clear()
    }
  }, [])

  return useCallback((callback: () => void, ms: number) => {
    const timer = setTimeout(() => {
      timersRef.current.delete(timer)
      callback()
    }, ms)
    timersRef.current.add(timer)
    return timer
  }, [])
}

export interface RoundHeaderProps {
  now: number
  total: number
  unit?: 'question' | 'round' | 'step' | 'part' | 'page'
  label?: string
  sub?: string
  lang?: Language
}

function useGameCopy(langOverride?: Language) {
  let appCopy: ((key: string, vars?: Record<string, string | number>) => string) | null = null

  // Games normally render below AppProvider. Keeping a small English fallback
  // makes shared feedback safe to render in isolated unit tests and storybooks.
  try {
    appCopy = useApp().t
  } catch {
    // No provider is present; retain the deterministic English fallback.
  }

  return langOverride
    ? (key: string, vars?: Record<string, string | number>) => translate(langOverride, key, vars)
    : appCopy ?? ((key: string, vars?: Record<string, string | number>) => translate('en', key, vars))
}

export function RoundHeader({ now, total, unit = 'question', label, sub, lang }: RoundHeaderProps) {
  const t = useGameCopy(lang)
  const clampedNow = Math.min(Math.max(now, 0), Math.max(total, 1))
  const pct = Math.min(100, Math.max(0, (clampedNow / Math.max(total, 1)) * 100))
  const remaining = Math.max(0, total - clampedNow)

  const prefix = t(`round_unit_${unit}`)

  return (
    <div className="question-banner enter-anim">
      <div className="question-banner-inner">
        <div className="question-badge">
          <span className="question-badge-dot" />
          <span className="question-badge-text">
            {t('round_count', { unit: prefix, n: clampedNow, total })}
          </span>
        </div>
        <div className="question-banner-meta">
          {label ? (
            <span className="question-chip">{label}</span>
          ) : (
            <span className="question-chip muted-chip">
              {sub ?? (remaining > 0 ? t('round_more_to_go', { n: remaining }) : t('round_final_question'))}
            </span>
          )}
        </div>
      </div>
      <div
        className="question-progress-track"
        role="progressbar"
        aria-label={t('round_progress', { unit: prefix })}
        aria-valuenow={clampedNow}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div className="question-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export interface AnswerFeedbackProps {
  state: 'idle' | 'success' | 'guidance'
  successText?: string
  guidanceText?: string
  lang?: Language
}

/** Calm, non-punitive feedback shared by choice games. */
export function AnswerFeedback({ state, successText, guidanceText, lang }: AnswerFeedbackProps) {
  const t = useGameCopy(lang)
  return (
    <p className={`answer-feedback answer-feedback-${state}`} role="status" aria-live="polite" aria-atomic="true">
      {state === 'success' ? (successText ?? t('feedback_success')) : state === 'guidance' ? (guidanceText ?? t('feedback_guidance')) : ''}
    </p>
  )
}

export { RoundHeader as QuestionBanner }
