import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  useApp: vi.fn(() => ({ lang: 'en' })),
  speak: vi.fn().mockResolvedValue(true),
  stop: vi.fn(),
}))

vi.mock('../../src/state', () => ({ useApp: mocks.useApp }))
vi.mock('../../src/lib/voice', () => ({
  VoiceService: {
    speak: mocks.speak,
    stop: mocks.stop,
  },
}))

import { PraiseCeremony } from '../../src/games/GameHost'

const translate = (key: string) => ({
  praise_title: 'You did wonderfully!',
  praise_body: 'Every step makes your memory garden grow.',
  game_praise_good: 'You remembered so much today. Well done!',
  game_praise_trying: 'You kept going beautifully.',
  nav_home: 'Home',
  coach_celebrate_title: 'A lovely session',
  coach_celebrate_body: 'You stayed with the activity today.',
  coach_celebrate_action: 'Choose another activity',
  coach_gentler_title: 'A gentle next step',
  coach_gentler_body: 'A simpler activity may feel better next.',
  coach_gentler_action: 'Choose a gentler activity',
  coach_repeat_title: 'Keep this for later',
  coach_repeat_body: 'You can try the same activity another time.',
  coach_repeat_action: 'Try again later',
  coach_rest_title: 'Time for a little rest',
  coach_rest_body: 'Resting is a good next step.',
  coach_rest_action: 'Rest now',
  coach_privacy: 'This reflection is made on this device from this session only.',
}[key] ?? key)

function praise() {
  return (
    <PraiseCeremony
      gameName="Faces of Home"
      reward={0.8}
      accuracy={1}
      t={translate}
      patientName="Sarala Devi"
    />
  )
}

describe('game completion praise ceremony', () => {
  beforeEach(() => {
    cleanup()
    window.location.hash = '#/game/faces'
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    mocks.speak.mockClear()
    mocks.stop.mockClear()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    window.location.hash = ''
  })

  it('labels the modal, focuses Home, traps Tab, and preserves completion on Escape', () => {
    const trigger = document.createElement('button')
    trigger.textContent = 'Last answer'
    document.body.append(trigger)
    trigger.focus()

    render(praise())

    const dialog = screen.getByRole('dialog')
    const home = screen.getByRole('button', { name: 'Home' })
    const nextAction = screen.getByRole('button', { name: 'Choose another activity' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'game-completion-title')
    expect(dialog).toHaveAttribute('aria-describedby', 'game-completion-description')
    expect(home).toHaveFocus()
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByRole('heading', { name: 'A lovely session' })).toBeInTheDocument()

    trigger.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(home).toHaveFocus()
    nextAction.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(home).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(nextAction).toHaveFocus()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(dialog).toBeInTheDocument()
    expect(home).toHaveFocus()
  })

  it('shows a gentler next step in the same completion dialog without numeric scoring', () => {
    render(
      <PraiseCeremony
        gameName="Faces of Home"
        reward={0.2}
        accuracy={0.4}
        coach={{ action: 'gentler', hasEnoughData: true, source: 'local' }}
        t={translate}
        patientName="Sarala Devi"
      />,
    )

    expect(screen.getByRole('heading', { name: 'A gentle next step' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Choose a gentler activity' })).toBeInTheDocument()
    expect(screen.queryByText(/0\.4|40%|score/i)).not.toBeInTheDocument()
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
  })

  it('restores the invoking focus when the ceremony closes in place', () => {
    function Harness({ show }: { show: boolean }) {
      return (
        <>
          <button data-testid="source">Last answer</button>
          {show ? praise() : null}
        </>
      )
    }

    const { rerender } = render(<Harness show={false} />)
    const source = screen.getByTestId('source')
    source.focus()

    rerender(<Harness show />)
    expect(screen.getByRole('button', { name: 'Home' })).toHaveFocus()

    rerender(<Harness show={false} />)
    expect(source).toHaveFocus()
  })

  it('navigates home through the explicit completed-state action', () => {
    render(praise())

    fireEvent.click(screen.getByRole('button', { name: 'Home' }))

    expect(window.location.hash).toBe('#/')
  })
})
