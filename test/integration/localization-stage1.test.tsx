import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  useApp: vi.fn(),
}))

vi.mock('../../src/state', () => ({ useApp: mocks.useApp }))
vi.mock('../../src/router', () => ({ navigate: vi.fn() }))

import { Layout } from '../../src/components/Layout'
import { OnboardingProgress } from '../../src/components/onboarding/OnboardingProgress'
import { AnswerFeedback, RoundHeader } from '../../src/games/shared'
import { translate } from '../../src/i18n'
import type { Language } from '../../src/lib/types'

const languages: Language[] = ['en', 'hi', 'as', 'bn', 'brx', 'mni']

describe('stage 1 localization visible and ARIA matrix', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it.each(languages)('keeps shell and shared game semantics localized for %s', (lang) => {
    const t = (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars)
    mocks.useApp.mockReturnValue({ profile: null, lang, t } as never)

    render(
      <Layout>
        <OnboardingProgress
          step={1}
          total={9}
          label={t('onb_patient')}
          caregiverHint={t('onb_progress_label')}
          lang={lang}
        />
        <RoundHeader now={2} total={4} unit="round" lang={lang} />
        <AnswerFeedback state="success" lang={lang} />
      </Layout>
    )

    expect(screen.getByRole('button', { name: t('aria_voice_assistant') })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: t('aria_primary_navigation') })).toBeInTheDocument()

    const onboardingProgress = screen.getByRole('region', { name: t('onb_progress_label') })
    expect(onboardingProgress).toHaveTextContent(t('onb_step_counter', { current: 2, total: 9 }))
    expect(screen.getByRole('progressbar', { name: t('round_progress', { unit: t('round_unit_round') }) })).toHaveAttribute(
      'aria-valuenow',
      '2'
    )
    expect(screen.getByRole('status')).toHaveTextContent(t('feedback_success'))
    expect(screen.queryByText('aria_primary_navigation')).not.toBeInTheDocument()
    expect(screen.queryByText('round_progress')).not.toBeInTheDocument()
  })
})
