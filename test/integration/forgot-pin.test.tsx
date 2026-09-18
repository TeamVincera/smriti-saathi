import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { AppProvider } from '../../src/state'
import { ForgotPinModal } from '../../src/screens/CaregiverHub'
import { wipeAll, saveProfile } from '../../src/lib/db'
import * as db from '../../src/lib/db'
import type { Profile } from '../../src/lib/types'

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <AppProvider>{children}</AppProvider>
}

describe('ForgotPinModal Integration Flow', () => {
  const mockProfile: Profile = {
    language: 'en',
    patient: { name: 'Sarala Devi', age: 72 },
    clinical: { stage: 'mild', doctorContact: '9876500000' },
    cultural: {},
    routine: {},
    caregiver: { name: 'Rahul', phone: '9876543210', ashaName: 'Minoti', ashaPhone: '9876511111' },
    pin: '1234',
    onboarded: true,
    createdAt: Date.now(),
  }

  beforeEach(async () => {
    await wipeAll()
    localStorage.clear()
    sessionStorage.clear()
    vi.useRealTimers()
    await saveProfile(mockProfile)
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.restoreAllMocks()
    sessionStorage.clear()
  })

  it('renders phone verification with masked phone and emergency links', async () => {
    const onClose = vi.fn()
    const onSuccess = vi.fn()

    render(
      <TestWrapper>
        <ForgotPinModal onClose={onClose} onSuccess={onSuccess} />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Verify Caregiver Identity/i })).toBeInTheDocument()
      expect(screen.getByText('•••••• 3210')).toBeInTheDocument()
    })
    // Emergency contact link
    expect(screen.getByText(/Call Emergency \/ ASHA Worker \(9876511111\)/i)).toBeInTheDocument()
  })

  it('handles incorrect phone entries, shows countdown, and locks out on 3 attempts', async () => {
    const onClose = vi.fn()
    const onSuccess = vi.fn()

    render(
      <TestWrapper initialProfile={mockProfile}>
        <ForgotPinModal onClose={onClose} onSuccess={onSuccess} />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Verify Caregiver Identity/i })).toBeInTheDocument()
      expect(screen.getByText('•••••• 3210')).toBeInTheDocument()
    })

    const phoneInput = screen.getByLabelText(/Registered Phone Number/i)
    const verifyBtn = screen.getByRole('button', { name: /Verify Caregiver/i })

    // Attempt 1: wrong phone
    fireEvent.change(phoneInput, { target: { value: '1111111111' } })
    fireEvent.click(verifyBtn)
    expect(screen.getByRole('alert')).toHaveTextContent(/2 attempts remaining/i)

    // Attempt 2: wrong phone
    fireEvent.change(phoneInput, { target: { value: '2222222222' } })
    fireEvent.click(verifyBtn)
    expect(screen.getByRole('alert')).toHaveTextContent(/1 attempts remaining/i)

    // Attempt 3: triggers lockout
    fireEvent.change(phoneInput, { target: { value: '3333333333' } })
    fireEvent.click(verifyBtn)
    expect(screen.getByText(/Security lockout: Too many failed attempts/i)).toBeInTheDocument()
    expect(phoneInput).toBeDisabled()
  })

  it('verifies phone, resets PIN via automated 2-stage flow, and saves new PIN', async () => {
    const onClose = vi.fn()
    const onSuccess = vi.fn()

    render(
      <TestWrapper>
        <ForgotPinModal onClose={onClose} onSuccess={onSuccess} />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Verify Caregiver Identity/i })).toBeInTheDocument()
      expect(screen.getByText('•••••• 3210')).toBeInTheDocument()
    })

    const phoneInput = screen.getByLabelText(/Registered Phone Number/i)
    const verifyBtn = screen.getByRole('button', { name: /Verify Caregiver/i })

    // Enter correct phone with spaces
    fireEvent.change(phoneInput, { target: { value: '98765 43210' } })
    fireEvent.click(verifyBtn)

    // Should transition to Stage 2: Set New PIN
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Set New Caregiver PIN/i })).toBeInTheDocument()
    })

    // Enter new PIN (5, 6, 7, 8) using numpad
    fireEvent.click(screen.getByRole('button', { name: '5', exact: true }))
    fireEvent.click(screen.getByRole('button', { name: '6', exact: true }))
    fireEvent.click(screen.getByRole('button', { name: '7', exact: true }))
    fireEvent.click(screen.getByRole('button', { name: '8', exact: true }))

    // Confirm step should be active
    await waitFor(() => {
      const confirmPill = screen.getByRole('button', { name: /2.*confirm/i })
      expect(confirmPill).toHaveStyle({ background: 'var(--primary)' })
    })

    // Enter matching PIN (5, 6, 7, 8) in confirm step
    fireEvent.click(screen.getByRole('button', { name: '5', exact: true }))
    fireEvent.click(screen.getByRole('button', { name: '6', exact: true }))
    fireEvent.click(screen.getByRole('button', { name: '7', exact: true }))
    fireEvent.click(screen.getByRole('button', { name: '8', exact: true }))

    const saveButton = screen.getByRole('button', { name: /Save new PIN/i })
    expect(saveButton).toBeEnabled()
    fireEvent.click(saveButton)

    // Success screen
    await waitFor(() => {
      expect(screen.getByText(/New PIN set successfully!/i)).toBeInTheDocument()
    })

    // onSuccess callback triggered
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    }, { timeout: 2000 })
  })

  it('keeps saving disabled until the confirmation PIN is complete and matches', async () => {
    render(
      <TestWrapper>
        <ForgotPinModal onClose={vi.fn()} onSuccess={vi.fn()} />
      </TestWrapper>
    )

    await waitFor(() => expect(screen.getByText('•••••• 3210')).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText(/Registered Phone Number/i), { target: { value: '9876543210' } })
    fireEvent.click(screen.getByRole('button', { name: /Verify Caregiver/i }))
    await waitFor(() => expect(screen.getByRole('heading', { name: /Set New Caregiver PIN/i })).toBeInTheDocument())

    for (const digit of ['5', '6', '7', '8']) fireEvent.click(screen.getByRole('button', { name: digit, exact: true }))
    const saveButton = screen.getByRole('button', { name: /Save new PIN/i })
    expect(saveButton).toBeDisabled()

    for (const digit of ['5', '6', '7', '9']) fireEvent.click(screen.getByRole('button', { name: digit, exact: true }))
    expect(saveButton).toBeDisabled()
    expect(screen.getByText(/PINs do not match/i)).toBeInTheDocument()
  })

  it('does not allow recovery without a registered caregiver phone', async () => {
    await saveProfile({ ...mockProfile, caregiver: { name: 'Rahul' } })
    render(
      <TestWrapper>
        <ForgotPinModal onClose={vi.fn()} onSuccess={vi.fn()} />
      </TestWrapper>
    )

    await waitFor(() => expect(screen.getByRole('heading', { name: /Verify Caregiver Identity/i })).toBeInTheDocument())
    expect(screen.getByRole('alert')).toHaveTextContent(/registered caregiver phone number is required/i)
    expect(screen.getByLabelText(/Registered Phone Number/i)).toBeDisabled()
    expect(screen.getByRole('button', { name: /Verify Caregiver/i })).toBeDisabled()
  })

  it('persists failed-attempt lockout across modal close and reopen', async () => {
    const first = render(
      <TestWrapper>
        <ForgotPinModal onClose={vi.fn()} onSuccess={vi.fn()} />
      </TestWrapper>
    )
    await waitFor(() => expect(screen.getByText('•••••• 3210')).toBeInTheDocument())
    const input = screen.getByLabelText(/Registered Phone Number/i)
    const verify = screen.getByRole('button', { name: /Verify Caregiver/i })

    fireEvent.change(input, { target: { value: '1111111111' } })
    fireEvent.click(verify)
    expect(screen.getByRole('alert')).toHaveTextContent(/2 attempts remaining/i)
    first.unmount()

    render(
      <TestWrapper>
        <ForgotPinModal onClose={vi.fn()} onSuccess={vi.fn()} />
      </TestWrapper>
    )
    await waitFor(() => expect(screen.getByText('•••••• 3210')).toBeInTheDocument())
    const reopenedInput = screen.getByLabelText(/Registered Phone Number/i)
    const reopenedVerify = screen.getByRole('button', { name: /Verify Caregiver/i })
    fireEvent.change(reopenedInput, { target: { value: '2222222222' } })
    fireEvent.click(reopenedVerify)
    fireEvent.change(reopenedInput, { target: { value: '3333333333' } })
    fireEvent.click(reopenedVerify)
    expect(screen.getByText(/Security lockout: Too many failed attempts/i)).toBeInTheDocument()
  })

  it('keeps the dialog accessible and restores focus after Escape', async () => {
    const opener = document.createElement('button')
    opener.textContent = 'Open forgot PIN'
    document.body.appendChild(opener)
    opener.focus()

    let unmount = () => {}
    const rendered = render(
      <TestWrapper>
        <ForgotPinModal onClose={() => unmount()} onSuccess={vi.fn()} />
      </TestWrapper>
    )
    unmount = rendered.unmount

    await waitFor(() => expect(screen.getByText('•••••• 3210')).toBeInTheDocument())
    const input = screen.getByLabelText(/Registered Phone Number/i)
    expect(document.activeElement).toBe(input)

    const dialog = screen.getByRole('dialog')
    const focusable = dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href]')
    focusable[focusable.length - 1].focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(focusable[0])

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(document.activeElement).toBe(opener)
    opener.remove()
  })

  it('does not show success or unlock when PIN persistence fails', async () => {
    vi.spyOn(db, 'saveProfile').mockRejectedValue(new Error('storage unavailable'))
    const onSuccess = vi.fn()
    render(
      <TestWrapper>
        <ForgotPinModal onClose={vi.fn()} onSuccess={onSuccess} />
      </TestWrapper>
    )

    await waitFor(() => expect(screen.getByText('•••••• 3210')).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText(/Registered Phone Number/i), { target: { value: '98765 43210' } })
    fireEvent.click(screen.getByRole('button', { name: /Verify Caregiver/i }))
    await waitFor(() => expect(screen.getByRole('heading', { name: /Set New Caregiver PIN/i })).toBeInTheDocument())

    for (const digit of ['5', '6', '7', '8']) fireEvent.click(screen.getByRole('button', { name: digit, exact: true }))
    for (const digit of ['5', '6', '7', '8']) fireEvent.click(screen.getByRole('button', { name: digit, exact: true }))

    fireEvent.click(screen.getByRole('button', { name: /Save new PIN/i }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/Unable to save the new PIN/i))
    expect(screen.queryByText(/New PIN set successfully!/i)).not.toBeInTheDocument()
    expect(onSuccess).not.toHaveBeenCalled()
  })
})
