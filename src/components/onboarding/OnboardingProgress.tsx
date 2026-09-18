import type { Language } from '../../lib/types'
import { translate } from '../../i18n'

type OnboardingProgressProps = {
  step: number
  total: number
  label: string
  caregiverHint: string
  lang?: Language
}

export function OnboardingProgress({ step, total, label, caregiverHint, lang = 'en' }: OnboardingProgressProps) {
  const current = Math.min(Math.max(step + 1, 1), total)
  const percent = (current / total) * 100
  const t = (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars)

  return (
    <section className="onboarding-progress" aria-label={t('onb_progress_label')}>
      <div className="onboarding-progress-heading">
        <span className="onboarding-progress-count">{t('onb_step_counter', { current, total })}</span>
        <strong>{label}</strong>
      </div>
      <div
        className="onboarding-progress-track"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        aria-valuetext={t('onb_progress_value', { label, current, total })}
      >
        <span className="onboarding-progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="onboarding-caregiver-hint">{caregiverHint}</p>
    </section>
  )
}
