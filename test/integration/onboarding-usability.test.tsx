import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/state', () => ({
  useApp: vi.fn(),
}))

vi.mock('../../src/router', () => ({
  navigate: vi.fn(),
}))

vi.mock('../../src/lib/ai', () => ({
  seedBaselineForColdStart: vi.fn(() => 1),
}))

import { useApp } from '../../src/state'
import { Onboarding } from '../../src/screens/Onboarding'

const mockedUseApp = vi.mocked(useApp)

describe('onboarding hierarchy and validation', () => {
  beforeEach(() => {
    mockedUseApp.mockReturnValue({
      lang: 'en',
      t: (key: string) => key,
      setProfile: vi.fn(async () => {}),
    } as never)
    window.history.replaceState({}, '', '/?step=1')
  })

  afterEach(() => {
    cleanup()
    window.history.replaceState({}, '', '/')
    vi.clearAllMocks()
  })

  it('shows calm step progress and explains why the required next action is unavailable', () => {
    render(<Onboarding />)

    const progress = screen.getByRole('progressbar')
    expect(progress).toHaveAttribute('aria-valuenow', '2')
    expect(progress).toHaveAttribute('aria-valuemax', '9')
    expect(screen.getByText('Step 2 of 9')).toBeInTheDocument()

    const next = screen.getByTestId('step-next-btn')
    expect(next).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('Enter the patient name to continue.')

    fireEvent.change(screen.getByTestId('patient-name-input'), { target: { value: 'Sarala' } })
    expect(next).toBeEnabled()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('keeps the inactive PIN panel fully outside the viewport at narrow widths', () => {
    window.history.replaceState({}, '', '/?step=7')
    render(<Onboarding />)

    const track = screen.getByTestId('pin-panel-track')
    const setPanel = screen.getByTestId('pin-panel-set')
    const confirmPanel = screen.getByTestId('pin-panel-confirm')
    expect(track).toHaveStyle({ width: '200%', transform: 'translateX(0)' })
    expect(setPanel).toHaveStyle({ width: '50%' })
    expect(confirmPanel).toHaveStyle({ width: '50%' })

    fireEvent.change(screen.getAllByPlaceholderText('••••')[0], { target: { value: '1234' } })
    fireEvent.click(screen.getByRole('button', { name: /confirm pin/i }))

    expect(track).toHaveStyle({ transform: 'translateX(-50%)' })
  })
})
