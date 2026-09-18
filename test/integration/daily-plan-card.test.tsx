import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { DailyPlanCard } from '../../src/components/DailyPlanCard'
import { translate } from '../../src/i18n'
import type { Language } from '../../src/lib/types'

const languages: Language[] = ['en', 'hi', 'as', 'bn', 'brx', 'mni']

describe('DailyPlanCard', () => {
  afterEach(() => cleanup())

  it.each(languages)('keeps the plan region and privacy wording localized for %s', (lang) => {
    const t = (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars)
    render(
      <DailyPlanCard
        lang={lang}
        t={t}
        now={new Date(2026, 8, 10, 9, 0)}
        items={[
          { id: 'water', kind: 'reminder', title: 'Drink water', time: '10:00', date: '2026-09-10', emoji: '💧', completed: false },
          { id: 'visit', kind: 'appointment', title: 'Clinic visit', time: '11:30', date: '2026-09-12', emoji: '🩺', completed: false },
          { id: 'med', kind: 'medicine', title: 'Morning tablet', time: '08:00', date: '2026-09-10', emoji: '💊', completed: true },
          { id: 'walk', kind: 'reminder', title: 'Gentle walk', time: '17:00', date: '2026-09-10', emoji: '🌿', completed: false },
        ]}
      />
    )

    expect(screen.getByRole('region', { name: t('plan_title') })).toHaveTextContent(t('plan_privacy'))
    expect(screen.getByRole('list')).toHaveAccessibleName(t('plan_title'))
    expect(screen.getByRole('button', { name: t('plan_show_more') })).toBeInTheDocument()
  })

  it('offers a calm empty state without inventing a task', () => {
    const t = (key: string, vars?: Record<string, string | number>) => translate('en', key, vars)
    render(<DailyPlanCard lang="en" t={t} items={[]} />)

    expect(screen.getByRole('status')).toHaveTextContent(t('plan_empty'))
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('wraps long medicine and appointment names instead of hiding them', () => {
    const t = (key: string, vars?: Record<string, string | number>) => translate('en', key, vars)
    render(
      <DailyPlanCard
        lang="en"
        t={t}
        now={new Date(2026, 8, 10, 9, 0)}
        items={[
          {
            id: 'long-medicine',
            kind: 'medicine',
            title: 'Donepezil after breakfast with the blue glass of water',
            time: '08:00',
            date: '2026-09-10',
            emoji: '💊',
            completed: false,
          },
        ]}
      />,
    )

    const title = screen.getByText('Donepezil after breakfast with the blue glass of water')
    expect(title).toHaveStyle({
      whiteSpace: 'normal',
      overflowWrap: 'anywhere',
      wordBreak: 'break-word',
    })
  })
})
