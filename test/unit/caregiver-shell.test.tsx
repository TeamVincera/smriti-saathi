import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CaregiverShell } from '../../src/components/caregiver/CaregiverShell'

vi.mock('../../src/state', () => ({
  useApp: () => ({
    t: (key: string) => key,
  }),
}))

describe('CaregiverShell', () => {
  it('exposes the dashboard navigation as an accessible tablist', () => {
    render(
      <CaregiverShell tab="overview" onTabChange={() => undefined}>
        <p>Overview content</p>
      </CaregiverShell>
    )

    expect(screen.getByRole('tablist', { name: 'nav_hub' })).toBeInTheDocument()
    const overviewTab = screen.getByRole('tab', { name: /hub_digest/i })
    expect(overviewTab).toHaveAttribute('aria-selected', 'true')
    expect(overviewTab).toHaveAttribute('aria-controls', 'caregiver-panel-overview')
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'caregiver-tab-overview')
    expect(screen.getAllByRole('tab')).toHaveLength(5)
  })

  it('supports roving keyboard navigation across dashboard tabs', () => {
    const onTabChange = vi.fn()
    render(
      <CaregiverShell tab="overview" onTabChange={onTabChange}>
        <p>Overview content</p>
      </CaregiverShell>
    )

    fireEvent.keyDown(screen.getByRole('tab', { name: /hub_digest/i }), { key: 'ArrowRight' })
    expect(onTabChange).toHaveBeenCalledWith('family')
  })
})
