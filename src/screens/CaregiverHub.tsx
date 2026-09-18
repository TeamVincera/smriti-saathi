import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useApp } from '../state'
import { getMedLog, loadConfig, saveConfig, dbAll } from '../lib/db'
import type { MedLogEntry, Profile } from '../lib/types'
import { buildDigest } from '../lib/sathi'
import { sanitizePersonName, calculateAgeFromDob } from '../lib/formatters'
import { Icon } from '../components/Icons'
import { playChime, playTap } from '../lib/audio'
import { CaregiverAnalytics } from '../components/caregiver/CaregiverAnalytics'
import { CaregiverShell, type CaregiverTab } from '../components/caregiver/CaregiverShell'
import { MedsAdmin } from '../components/caregiver/CaregiverMedicationAdmin'
import { RemindersAdmin } from '../components/caregiver/CaregiverReminderAdmin'
import { navigate } from '../router'
import { FESTIVALS, HOBBIES } from './Onboarding'
import { LANGUAGES, type Language } from '../lib/types'
import { PerformanceTracker } from '../lib/adaptive/PerformanceTracker'
import { ExplainabilityLogger } from '../lib/adaptive/ExplainabilityLogger'
import { COGNITIVE_DOMAINS, DOMAIN_DISPLAY_LABELS, DIFFICULTY_LABELS } from '../lib/adaptive/types'
import { type ReportPeriod, computePeriodMetrics, computeDomainBars, computeSessionTrends, generatePersonalizedInsights, buildLatestSessionSummary } from '../lib/reports'
import { AIService, PatientContextBuilder, type CaretakerSummaryResponse } from '../lib/ai'
import { useAIAvailable } from '../lib/ai/availability'
import { downloadReportImage } from '../lib/reportExport'
import { ConfirmDialog } from '../components/ConfirmDialog'

export function CaregiverHub() {
  const { profile } = useApp()
  const [unlocked, setUnlocked] = useState(false)

  if (!profile?.pin || unlocked) return <HubInner />
  return <PinGate pin={profile.pin} onUnlock={() => setUnlocked(true)} />
}

// ─────────────────────────────────────────────
// 1. PIN GATE (Matches Screenshot 7)
// ─────────────────────────────────────────────
function PinGate({ pin, onUnlock }: { pin: string; onUnlock: () => void }) {
  const { t } = useApp()
  const [entry, setEntry] = useState('')
  const [shake, setShake] = useState(false)
  const [showForgotModal, setShowForgotModal] = useState(false)

  useEffect(() => {
    if (entry.length === 4) {
      if (entry === pin || (!pin && entry === '1234')) {
        onUnlock()
      } else {
        setShake(true)
        setTimeout(() => {
          setShake(false)
          setEntry('')
        }, 500)
      }
    }
  }, [entry, pin, onUnlock])

  const handleDigit = (digit: string) => {
    playTap()
    setEntry((e) => (e.length < 4 ? e + digit : e))
  }

  const handleBackspace = () => {
    playTap()
    setEntry((e) => e.slice(0, -1))
  }

  return (
    <div className="page enter-anim" style={{ maxWidth: 'var(--max-w)', margin: '0 auto' }}>
      {/* Header bar (Matches Screenshot 7) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <button
          type="button"
          className="icon-btn"
          onClick={() => navigate('/')}
        >
          <Icon name="back" size={24} color="var(--ink)" />
        </button>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
          {t('nav_hub')}
        </h2>
        <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="lock" size={22} color="var(--ink)" />
        </div>
      </div>

      {/* Main Verification Card (Matches Screenshot 7) */}
      <div
        className="card"
        style={{
          borderRadius: 24,
          padding: '36px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'var(--primary)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <Icon name="shield" size={32} color="var(--ink-on-dark)" />
        </div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
          {t('hub_pin_gate')}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ink-muted)', marginBottom: 32 }}>
          {t('hub_pin_sub')}
        </p>

        {/* 4 PIN circles */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 36 }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                border: '2px solid var(--primary)',
                background: i < entry.length ? 'var(--primary)' : 'transparent',
                transition: 'all 0.15s ease',
              }}
            />
          ))}
        </div>

        {shake && (
          <p role="alert" aria-live="assertive" style={{ color: 'var(--error)', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
            {t('hub_wrong_pin')}
          </p>
        )}

        {/* Numpad 3x4 (Matches Screenshot 7) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, width: '100%', maxWidth: 280, marginBottom: 28 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => handleDigit(String(n))}
              style={{
                background: 'var(--surface-muted)',
                borderRadius: 16,
                minHeight: 56,
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--ink)',
                cursor: 'pointer',
              }}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setEntry('')}
            style={{
              background: 'var(--surface-muted)',
              borderRadius: 16,
              minHeight: 56,
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--ink)',
              cursor: 'pointer',
            }}
          >
            C
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            style={{
              background: 'var(--surface-muted)',
              borderRadius: 16,
              minHeight: 56,
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--ink)',
              cursor: 'pointer',
            }}
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            style={{
              background: 'var(--surface-muted)',
              borderRadius: 16,
              minHeight: 56,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Icon name="backspace" size={22} color="var(--ink)" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowForgotModal(true)}
          style={{ fontSize: 13, color: 'var(--ink)', textDecoration: 'underline', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {t('hub_forgot_pin')}
        </button>
      </div>

      {/* Secure Forgot PIN Modal */}
      {showForgotModal && (
        <ForgotPinModal
          onClose={() => setShowForgotModal(false)}
          onSuccess={() => {
            setShowForgotModal(false)
            onUnlock()
          }}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// 1.5. FORGOT PIN RECOVERY COMPONENT
// ─────────────────────────────────────────────
export function checkCaregiverPhone(inputPhone: string, registeredPhone?: string): boolean {
  if (!registeredPhone) return false
  const cleanInput = inputPhone.replace(/\D/g, '')
  const cleanReg = registeredPhone.replace(/\D/g, '')
  if (!cleanInput || !cleanReg) return false
  if (cleanInput === cleanReg) return true
  if (cleanInput.length >= 10 && cleanReg.length >= 10) {
    return cleanInput.slice(-10) === cleanReg.slice(-10)
  }
  return false
}

export function getMaskedPhone(phone?: string): string {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length <= 4) return '•••• ' + digits
  return `•••••• ${digits.slice(-4)}`
}

const FORGOT_PIN_LOCKOUT_KEY = 'smriti-sathi:forgot-pin-lockout'

function readForgotPinLockout(): { failedAttempts: number; lockoutUntil: number } {
  try {
    const raw = sessionStorage.getItem(FORGOT_PIN_LOCKOUT_KEY)
    if (!raw) return { failedAttempts: 0, lockoutUntil: 0 }
    const parsed = JSON.parse(raw) as { failedAttempts?: unknown; lockoutUntil?: unknown }
    const failedAttempts = typeof parsed.failedAttempts === 'number' && Number.isInteger(parsed.failedAttempts)
      ? Math.max(0, Math.min(3, parsed.failedAttempts))
      : 0
    const lockoutUntil = typeof parsed.lockoutUntil === 'number' && Number.isFinite(parsed.lockoutUntil)
      ? Math.max(0, parsed.lockoutUntil)
      : 0
    if (lockoutUntil <= Date.now() && failedAttempts >= 3) {
      sessionStorage.removeItem(FORGOT_PIN_LOCKOUT_KEY)
      return { failedAttempts: 0, lockoutUntil: 0 }
    }
    return { failedAttempts, lockoutUntil }
  } catch {
    return { failedAttempts: 0, lockoutUntil: 0 }
  }
}

function saveForgotPinLockout(failedAttempts: number, lockoutUntil: number): void {
  try {
    sessionStorage.setItem(FORGOT_PIN_LOCKOUT_KEY, JSON.stringify({ failedAttempts, lockoutUntil }))
  } catch {}
}

function clearForgotPinLockout(): void {
  try {
    sessionStorage.removeItem(FORGOT_PIN_LOCKOUT_KEY)
  } catch {}
}

interface ForgotPinModalProps {
  onClose: () => void
  onSuccess: () => void
}

export function ForgotPinModal({ onClose, onSuccess }: ForgotPinModalProps) {
  const { profile, updateProfile, t } = useApp()
  const [step, setStep] = useState<'verify' | 'reset' | 'success'>('verify')

  const dialogRef = useRef<HTMLDivElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  // Phone verification state
  const [phoneInput, setPhoneInput] = useState('')
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const initialLockout = useRef(readForgotPinLockout()).current
  const [failedAttempts, setFailedAttempts] = useState(initialLockout.failedAttempts)
  const [lockoutSeconds, setLockoutSeconds] = useState(() =>
    initialLockout.lockoutUntil > Date.now() ? Math.ceil((initialLockout.lockoutUntil - Date.now()) / 1000) : 0
  )

  // PIN reset state
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [activePinField, setActivePinField] = useState<'pin' | 'confirm'>('pin')
  const [pinMismatch, setPinMismatch] = useState(false)
  const [pinSaveError, setPinSaveError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const phoneInputRef = useRef<HTMLInputElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const pinInputRef = useRef<HTMLInputElement>(null)
  const confirmInputRef = useRef<HTMLInputElement>(null)

  const newPinRef = useRef('')
  newPinRef.current = newPin
  const activePinFieldRef = useRef<'pin' | 'confirm'>('pin')
  activePinFieldRef.current = activePinField

  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const isSavingRef = useRef(isSaving)
  isSavingRef.current = isSaving

  // Keep keyboard focus inside the modal and restore it to the triggering
  // control when the dialog closes.
  useEffect(() => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const handleKeyDown = (event: KeyboardEvent) => {
      const dialog = dialogRef.current
      if (!dialog) return
      if (event.key === 'Escape') {
        if (!isSavingRef.current) onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        )
      )
      if (focusable.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!dialog.contains(document.activeElement)) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (openerRef.current?.isConnected) openerRef.current.focus()
    }
  }, [])

  // Auto focus phone input on modal open
  useEffect(() => {
    if (step === 'verify') {
      if (!profile?.caregiver?.phone) dialogRef.current?.focus()
      else if (lockoutSeconds > 0) cancelButtonRef.current?.focus()
      else phoneInputRef.current?.focus()
    } else if (step === 'reset') {
      // Focus only after the reset view has committed. A delayed focus here
      // can steal the keypad back to the PIN field during rapid entry.
      pinInputRef.current?.focus()
    }
  }, [lockoutSeconds, profile?.caregiver?.phone, step])

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) {
      if (failedAttempts >= 3) {
        setFailedAttempts(0)
        setPhoneError(null)
        clearForgotPinLockout()
      }
      return
    }
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [lockoutSeconds, failedAttempts])

  const handleVerifyPhone = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (lockoutSeconds > 0 || isSaving) return

    const registeredPhone = profile?.caregiver?.phone
    if (!registeredPhone) {
      setPhoneError('A registered caregiver phone number is required to reset the PIN.')
      return
    }
    const isPhoneValid = checkCaregiverPhone(phoneInput, registeredPhone)

    if (isPhoneValid) {
      playChime()
      setPhoneError(null)
      clearForgotPinLockout()
      setFailedAttempts(0)
      setPinSaveError(null)
      setStep('reset')
      setActivePinField('pin')
      activePinFieldRef.current = 'pin'
    } else {
      playTap()
      const nextAttempts = failedAttempts + 1
      setFailedAttempts(nextAttempts)
      if (nextAttempts >= 3) {
        const lockoutUntil = Date.now() + 60_000
        setLockoutSeconds(Math.ceil((lockoutUntil - Date.now()) / 1000))
        saveForgotPinLockout(nextAttempts, lockoutUntil)
        setPhoneError(null)
      } else {
        saveForgotPinLockout(nextAttempts, 0)
        const remaining = 3 - nextAttempts
        setPhoneError(
          `${t('forgot_pin_wrong_phone')} ${t('forgot_pin_attempts_left').replace('{n}', String(remaining))}`
        )
      }
    }
  }

  const handleSaveNewPin = async (pinToSave: string) => {
    if (isSaving || pinToSave.length !== 4 || confirmPin.length !== 4 || pinToSave !== confirmPin) {
      setPinMismatch(pinToSave.length === 4 && confirmPin.length === 4 && pinToSave !== confirmPin)
      return
    }
    setIsSaving(true)
    try {
      await updateProfile({ pin: pinToSave })
      playChime()
      setPinSaveError(null)
      setStep('success')
      setTimeout(() => {
        onSuccess()
      }, 850)
    } catch (err) {
      console.error('Failed to update caregiver PIN', err)
      setIsSaving(false)
      setPinSaveError('Unable to save the new PIN. Please try again.')
    }
  }

  const handleResetDigit = (digit: string) => {
    playTap()
    if (activePinFieldRef.current === 'pin') {
      if (newPin.length >= 4) return
      const next = (newPin + digit).slice(0, 4)
      setNewPin(next)
      if (next.length === 4) {
        // Advance the keypad state synchronously so a rapid final PIN entry
        // cannot send the first confirmation digit to the completed PIN field.
        setActivePinField('confirm')
        activePinFieldRef.current = 'confirm'
        setTimeout(() => {
          confirmInputRef.current?.focus()
        }, 180)
      }
    } else {
      if (confirmPin.length >= 4) return
      const next = (confirmPin + digit).slice(0, 4)
      setConfirmPin(next)
      if (next.length === 4) {
        if (next === newPinRef.current) {
          setPinMismatch(false)
        } else {
          setPinMismatch(true)
        }
      } else {
        setPinMismatch(false)
      }
    }
  }

  const handleResetBackspace = () => {
    playTap()
    if (activePinFieldRef.current === 'pin') {
      setNewPin((p) => p.slice(0, -1))
    } else {
      if (confirmPin.length > 0) {
        setConfirmPin((p) => p.slice(0, -1))
        setPinMismatch(false)
      } else {
        setActivePinField('pin')
        activePinFieldRef.current = 'pin'
        setTimeout(() => pinInputRef.current?.focus(), 50)
      }
    }
  }

  const handleResetClear = () => {
    playTap()
    if (activePinFieldRef.current === 'pin') {
      setNewPin('')
    } else {
      setConfirmPin('')
      setPinMismatch(false)
    }
  }

  const emergencyPhone = profile?.caregiver?.ashaPhone || profile?.clinical?.doctorContact || '112'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-pin-title"
      ref={dialogRef}
      tabIndex={-1}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex: 1000,
      }}
      onClick={() => !isSaving && onClose()}
    >
      <div
        className="card enter-anim"
        style={{
          maxWidth: 420,
          width: '100%',
          borderRadius: 24,
          padding: '28px 22px',
          textAlign: 'center',
          background: 'var(--card)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          position: 'relative',
          maxHeight: '92vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* PHASE 1: IDENTITY VERIFICATION */}
        {step === 'verify' && (
          <div>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'var(--surface-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px',
                fontSize: 28,
              }}
            >
              🛡️
            </div>

            <h3
              id="forgot-pin-title"
              style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}
            >
              {t('forgot_pin_title')}
            </h3>

            <p style={{ fontSize: 13, color: 'var(--ink-secondary)', lineHeight: 1.45, marginBottom: 18 }}>
              {profile?.caregiver?.name ? `Caregiver Verification for ${profile.caregiver.name}. ` : ''}
              {t('forgot_pin_sub')}
            </p>

            {!profile?.caregiver?.phone && (
              <div role="alert" style={{ color: 'var(--error, #dc2626)', fontSize: 12, fontWeight: 600, marginBottom: 14 }}>
                A registered caregiver phone number is required to reset the PIN.
              </div>
            )}

            {/* Masked hint if phone registered */}
            {profile?.caregiver?.phone && (
              <div
                style={{
                  background: 'var(--surface-muted)',
                  border: '1px solid var(--border)',
                  borderRadius: 14,
                  padding: '10px 14px',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 13,
                }}
              >
                <span style={{ color: 'var(--ink-muted)' }}>{t('forgot_pin_phone_label')}</span>
                <strong style={{ letterSpacing: 1.5, color: 'var(--ink)' }}>
                  {getMaskedPhone(profile.caregiver.phone)}
                </strong>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleVerifyPhone} style={{ textAlign: 'left', marginBottom: 14 }}>
              <label
                htmlFor="caregiver-phone-input"
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--ink)',
                  marginBottom: 6,
                  textTransform: 'uppercase',
                }}
              >
                {t('forgot_pin_phone_label')}
              </label>
              <input
                id="caregiver-phone-input"
                ref={phoneInputRef}
                type="tel"
                inputMode="numeric"
                disabled={lockoutSeconds > 0 || isSaving || !profile?.caregiver?.phone}
                placeholder={t('forgot_pin_phone_hint')}
                value={phoneInput}
                onChange={(e) => {
                  setPhoneInput(e.target.value)
                  if (phoneError && lockoutSeconds <= 0) setPhoneError(null)
                }}
                className="input"
                style={{
                  width: '100%',
                  fontSize: 16,
                  fontWeight: 600,
                  padding: '12px 14px',
                  borderRadius: 14,
                  border: phoneError ? '2px solid var(--error, #dc2626)' : '1px solid var(--border)',
                  background: lockoutSeconds > 0 ? 'var(--surface-muted)' : 'var(--surface)',
                }}
              />

              {phoneError && (
                <div
                  role="alert"
                  style={{
                    color: 'var(--error, #dc2626)',
                    fontSize: 12,
                    fontWeight: 600,
                    marginTop: 8,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 6,
                    lineHeight: 1.4,
                  }}
                >
                  <span style={{ fontSize: 14 }}>⚠️</span>
                  <span>{phoneError}</span>
                </div>
              )}

              {lockoutSeconds > 0 && (
                <div
                  style={{
                    marginTop: 10,
                    padding: '10px 12px',
                    borderRadius: 12,
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: 'var(--error, #dc2626)',
                    fontSize: 13,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <span>⏳</span>
                  <span>{t('forgot_pin_lockout').replace('{s}', String(lockoutSeconds))}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
                <button
                  type="button"
                  ref={cancelButtonRef}
                  className="btn btn-secondary btn-block"
                  onClick={onClose}
                  disabled={isSaving}
                  style={{ minHeight: 46, borderRadius: 14, fontSize: 14, fontWeight: 600 }}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-cta btn-block"
                  disabled={lockoutSeconds > 0 || !phoneInput.trim() || isSaving || !profile?.caregiver?.phone}
                  style={{ minHeight: 46, borderRadius: 14, fontSize: 14, fontWeight: 700 }}
                >
                  {t('forgot_pin_verify_btn')}
                </button>
              </div>
            </form>

            {/* Emergency link */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
              <a
                href={`tel:${emergencyPhone.replace(/\s+/g, '')}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--ink-secondary)',
                  textDecoration: 'none',
                }}
              >
                <span>📞</span>
                <span>
                  {profile?.caregiver?.ashaPhone
                    ? `${t('contact_emergency')} (${profile.caregiver.ashaPhone})`
                    : profile?.clinical?.doctorContact
                    ? `${t('contact_emergency')} (${profile.clinical.doctorContact})`
                    : t('contact_emergency')}
                </span>
              </a>
            </div>
          </div>
        )}

        {/* PHASE 2: AUTOMATED 2-STAGE ROW PIN RESET */}
        {step === 'reset' && (
          <div>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'rgba(13, 148, 136, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 10px',
                fontSize: 26,
              }}
            >
              🔑
            </div>

            <h3
              id="forgot-pin-title"
              style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}
            >
              {t('forgot_pin_reset_title')}
            </h3>

            <p style={{ fontSize: 13, color: 'var(--ink-secondary)', marginBottom: 16 }}>
              {t('forgot_pin_reset_sub')}
            </p>

            {/* Step indicators in a row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 14 }}>
              <button
                type="button"
                onClick={() => {
                  setActivePinField('pin')
                  setTimeout(() => pinInputRef.current?.focus(), 50)
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  background: activePinField === 'pin' ? 'var(--primary)' : 'var(--surface-muted)',
                  color: activePinField === 'pin' ? '#ffffff' : 'var(--ink)',
                  border: activePinField === 'pin' ? '2px solid var(--primary)' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <span>{newPin.length === 4 ? '✓' : '1'}</span>
                <span>{t('onb_pin_label')}</span>
              </button>

              <span style={{ color: 'var(--ink-secondary)', fontSize: 13, fontWeight: 700 }}>➔</span>

              <button
                type="button"
                disabled={newPin.length < 4}
                onClick={() => {
                  if (newPin.length === 4) {
                    setActivePinField('confirm')
                    setTimeout(() => confirmInputRef.current?.focus(), 50)
                  }
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  background: activePinField === 'confirm' ? 'var(--primary)' : 'var(--surface-muted)',
                  color: activePinField === 'confirm' ? '#ffffff' : 'var(--ink)',
                  border: activePinField === 'confirm' ? '2px solid var(--primary)' : '2px solid transparent',
                  cursor: newPin.length === 4 ? 'pointer' : 'not-allowed',
                  opacity: newPin.length === 4 ? 1 : 0.6,
                  transition: 'all 0.2s ease',
                }}
              >
                <span>{newPin.length === 4 && confirmPin === newPin ? '✓' : '2'}</span>
                <span>{t('onb_confirm_pin')}</span>
              </button>
            </div>

            {/* Sliding row panels */}
            <div style={{ width: '100%', overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
                {/* Panel 1: Set New PIN */}
                <div
                  style={{
                    minWidth: '100%',
                    width: '100%',
                    flexShrink: 0,
                    boxSizing: 'border-box',
                    transform: activePinField === 'pin' ? 'translateX(0%)' : 'translateX(-100%)',
                    transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--ink)',
                      textTransform: 'uppercase',
                      marginBottom: 4,
                    }}
                  >
                    {t('forgot_pin_new_label')} (4 Digits)
                  </label>

                  <div style={{ position: 'relative', width: '100%', maxWidth: 260, margin: '0 auto 10px' }}>
                    <div
                      onClick={() => pinInputRef.current?.focus()}
                      style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', gap: 10 }}
                    >
                      {[0, 1, 2, 3].map((idx) => {
                        const isFilled = idx < newPin.length
                        const isCurrent = activePinField === 'pin' && idx === newPin.length
                        return (
                          <div
                            key={idx}
                            style={{
                              width: 46,
                              height: 52,
                              borderRadius: 12,
                              border: isCurrent
                                ? '2px solid var(--primary)'
                                : isFilled
                                ? '2px solid var(--primary)'
                                : '2px solid var(--border)',
                              background: isFilled ? 'var(--surface-muted)' : 'var(--surface)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 22,
                              fontWeight: 700,
                              color: 'var(--ink)',
                              boxShadow: isCurrent ? '0 0 0 3px rgba(13, 148, 136, 0.15)' : 'none',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {isFilled ? '●' : ''}
                          </div>
                        )
                      })}
                    </div>

                    <input
                      ref={pinInputRef}
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={newPin}
                      onFocus={() => setActivePinField('pin')}
                      onChange={(e) => {
                        const next = e.target.value.replace(/\D/g, '').slice(0, 4)
                        setNewPin(next)
                        if (next.length === 4) {
                          setTimeout(() => {
                            setActivePinField('confirm')
                            confirmInputRef.current?.focus()
                          }, 180)
                        }
                      }}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0.01,
                        cursor: 'pointer',
                      }}
                    />
                  </div>

                  <p style={{ fontSize: 12, color: 'var(--ink-secondary)', minHeight: 16 }}>
                    {newPin.length === 4 ? '✓ 4 digits entered — auto-advancing...' : 'Enter 4 digits'}
                  </p>
                </div>

                {/* Panel 2: Confirm New PIN */}
                <div
                  style={{
                    minWidth: '100%',
                    width: '100%',
                    flexShrink: 0,
                    boxSizing: 'border-box',
                    transform: activePinField === 'pin' ? 'translateX(0%)' : 'translateX(-100%)',
                    transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setActivePinField('pin')
                        setTimeout(() => pinInputRef.current?.focus(), 50)
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 2,
                        padding: '2px 4px',
                      }}
                    >
                      ← Edit
                    </button>
                    <label
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: 'var(--ink)',
                        textTransform: 'uppercase',
                      }}
                    >
                      {t('forgot_pin_confirm_label')}
                    </label>
                  </div>

                  <div style={{ position: 'relative', width: '100%', maxWidth: 260, margin: '0 auto 10px' }}>
                    <div
                      onClick={() => confirmInputRef.current?.focus()}
                      style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', gap: 10 }}
                    >
                      {[0, 1, 2, 3].map((idx) => {
                        const isFilled = idx < confirmPin.length
                        const isCurrent = activePinField === 'confirm' && idx === confirmPin.length
                        const isMatch = newPin.length === 4 && confirmPin.length === 4 && newPin === confirmPin
                        const isMismatch = confirmPin.length === 4 && newPin !== confirmPin
                        return (
                          <div
                            key={idx}
                            style={{
                              width: 46,
                              height: 52,
                              borderRadius: 12,
                              border: isMatch
                                ? '2px solid var(--success, #15803D)'
                                : isMismatch
                                ? '2px solid var(--error, #dc2626)'
                                : isCurrent
                                ? '2px solid var(--primary)'
                                : isFilled
                                ? '2px solid var(--primary)'
                                : '2px solid var(--border)',
                              background: isMatch
                                ? 'rgba(21, 128, 61, 0.1)'
                                : isMismatch
                                ? 'rgba(220, 38, 38, 0.1)'
                                : isFilled
                                ? 'var(--surface-muted)'
                                : 'var(--surface)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 22,
                              fontWeight: 700,
                              color: isMatch
                                ? 'var(--success, #15803D)'
                                : isMismatch
                                ? 'var(--error, #dc2626)'
                                : 'var(--ink)',
                              boxShadow: isCurrent ? '0 0 0 3px rgba(13, 148, 136, 0.15)' : 'none',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {isFilled ? '●' : ''}
                          </div>
                        )
                      })}
                    </div>

                    <input
                      ref={confirmInputRef}
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={confirmPin}
                      onFocus={() => setActivePinField('confirm')}
                      onChange={(e) => {
                        const next = e.target.value.replace(/\D/g, '').slice(0, 4)
                        setConfirmPin(next)
                        if (next.length === 4) {
                          if (next === newPin) {
                            setPinMismatch(false)
                          } else {
                            setPinMismatch(true)
                          }
                        } else {
                          setPinMismatch(false)
                        }
                      }}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0.01,
                        cursor: 'pointer',
                      }}
                    />
                  </div>

                  <p
                    style={{
                      fontSize: 12,
                      minHeight: 16,
                      color: pinMismatch ? 'var(--error, #dc2626)' : 'var(--ink-secondary)',
                      fontWeight: pinMismatch ? 600 : 400,
                    }}
                  >
              {pinMismatch
                      ? t('forgot_pin_mismatch')
                      : confirmPin.length === 4 && confirmPin === newPin
                      ? t('hub_pin_match')
                      : t('onb_pin_matching')}
                  </p>
                  {pinSaveError && (
                    <p role="alert" style={{ color: 'var(--error, #dc2626)', fontSize: 12, fontWeight: 600, minHeight: 16 }}>
                      {pinSaveError}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-block"
              aria-label={t('forgot_pin_save_btn')}
              disabled={isSaving || newPin.length !== 4 || confirmPin.length !== 4 || newPin !== confirmPin}
              onClick={() => void handleSaveNewPin(newPin)}
              style={{ minHeight: 46, borderRadius: 12, fontSize: 14, fontWeight: 700, marginBottom: 10 }}
            >
              {isSaving ? t('save') : t('forgot_pin_save_btn')}
            </button>

            {/* Custom keypad */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
                width: '100%',
                maxWidth: 260,
                margin: '0 auto 14px',
              }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleResetDigit(String(n))}
                  style={{
                    background: 'var(--surface-muted)',
                    borderRadius: 12,
                    minHeight: 44,
                    fontSize: 19,
                    fontWeight: 700,
                    color: 'var(--ink)',
                    cursor: 'pointer',
                  }}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={handleResetClear}
                style={{
                  background: 'var(--surface-muted)',
                  borderRadius: 12,
                  minHeight: 44,
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--ink)',
                  cursor: 'pointer',
                }}
              >
                C
              </button>
              <button
                type="button"
                onClick={() => handleResetDigit('0')}
                style={{
                  background: 'var(--surface-muted)',
                  borderRadius: 12,
                  minHeight: 44,
                  fontSize: 19,
                  fontWeight: 700,
                  color: 'var(--ink)',
                  cursor: 'pointer',
                }}
              >
                0
              </button>
              <button
                type="button"
                onClick={handleResetBackspace}
                style={{
                  background: 'var(--surface-muted)',
                  borderRadius: 12,
                  minHeight: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <Icon name="backspace" size={18} color="var(--ink)" />
              </button>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-block"
              onClick={onClose}
              disabled={isSaving}
              style={{ minHeight: 42, borderRadius: 12, fontSize: 13, fontWeight: 600 }}
            >
              {t('cancel')}
            </button>
          </div>
        )}

        {/* PHASE 3: SUCCESS CONFIRMATION */}
        {step === 'success' && (
          <div style={{ padding: '24px 8px' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🎉</div>
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--ink)',
                marginBottom: 8,
              }}
            >
              {t('forgot_pin_success')}
            </h3>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
              <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 2. MAIN HUB TABS (Overview, Family, Meds, Reminders, Settings)
// ─────────────────────────────────────────────
function HubInner() {
  const {
    profile,
    updateProfile,
    meds,
    upsertMed,
    removeMed,
    dailyReminders,
    upsertDailyReminder,
    removeDailyReminder,
    appointments,
    upsertAppointment,
    removeAppointment,
    dailyGameLimit,
    updateDailyGameLimit,
    resetAllData,
    sessions,
    theme,
    setTheme,
  } = useApp()
  const [tab, setTab] = useState<CaregiverTab>('overview')
  const [medlog, setMedlog] = useState<MedLogEntry[]>([])

  useEffect(() => {
    void getMedLog().then(setMedlog)
  }, [])

  return (
    <CaregiverShell tab={tab} onTabChange={setTab}>
      {tab === 'overview' && <OverviewSection medlog={medlog} sessions={sessions} onNavigateToSettings={() => setTab('settings')} />}
      {tab === 'family' && (
        <FamilyAdmin
          profile={profile}
          onSave={async (members) => {
            await updateProfile({
              cultural: {
                ...(profile?.cultural ?? {}),
                familyMembers: members,
              },
            })
          }}
        />
      )}
      {tab === 'meds' && <MedsAdmin meds={meds} onSave={(m) => void upsertMed(m)} onDelete={(id) => void removeMed(id)} />}
      {tab === 'reminders' && (
        <RemindersAdmin
          dailyReminders={dailyReminders}
          appointments={appointments}
          onSaveReminder={(r) => void upsertDailyReminder(r)}
          onDeleteReminder={(id) => void removeDailyReminder(id)}
          onSaveAppointment={(a) => void upsertAppointment(a)}
          onDeleteAppointment={(id) => void removeAppointment(id)}
        />
      )}
      {tab === 'settings' && (
        <SettingsSection
          profile={profile}
          updateProfile={updateProfile}
          dailyGameLimit={dailyGameLimit}
          updateDailyGameLimit={updateDailyGameLimit}
          resetAllData={resetAllData}
          theme={theme}
          setTheme={setTheme}
        />
      )}
    </CaregiverShell>
  )
}

// ─────────────────────────────────────────────
// 3. OVERVIEW / REPORTS SECTION
// ─────────────────────────────────────────────
function OverviewSection({
  medlog,
  sessions,
  onNavigateToSettings,
}: {
  medlog: MedLogEntry[]
  sessions: any[]
  onNavigateToSettings?: () => void
}) {
  const { profile: appProfile, meds, t } = useApp()
  const [period, setPeriod] = useState<ReportPeriod>('week')
  const [showMlDetails, setShowMlDetails] = useState(false)
  const [aiSummary, setAiSummary] = useState<CaretakerSummaryResponse | null>(null)
  const [isLoadingSummary, setIsLoadingSummary] = useState(false)
  const [summaryError, setSummaryError] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<string | null>(null)
  const aiAvailable = useAIAvailable()

  const profile = PerformanceTracker.getProfile()
  const observations = PerformanceTracker.getObservations()

  const metrics = useMemo(
    () => computePeriodMetrics(sessions, observations, period),
    [sessions, observations, period]
  )
  const domainBars = useMemo(() => computeDomainBars(profile), [profile])
  const trends = useMemo(() => computeSessionTrends(sessions), [sessions])
  const insights = useMemo(() => generatePersonalizedInsights(sessions, profile), [sessions, profile])
  const latestSummary = useMemo(() => buildLatestSessionSummary(sessions, profile), [sessions, profile])
  const recentLogs = ExplainabilityLogger.getRecentLogs(5)

  const hasSessions = sessions.length > 0
  const stabilityScore = hasSessions
    ? Math.round(
        (sessions.slice(-14).reduce((acc, s) => acc + (s.accuracy ?? 0.8), 0) /
          Math.max(sessions.slice(-14).length, 1)) *
          100
      )
    : null

  const takenLogs = medlog.filter((m) => m.status === 'taken').length
  const totalMedLogs = medlog.length
  const adherencePct = totalMedLogs > 0 ? Math.round((takenLogs / totalMedLogs) * 100) : null

  // Fetch Groq AI Summary for Caregiver
  useEffect(() => {
    let active = true
    setAiSummary(null)
    setSummaryError(false)
    if (!aiAvailable) {
      setIsLoadingSummary(false)
      return () => {
        active = false
      }
    }

    setIsLoadingSummary(true)
    const context = PatientContextBuilder.build({ profile: appProfile, meds, sessions })

    void AIService.generateCaretakerSummary({
      sessions,
      adherencePct,
      medCount: meds.length,
      context,
    }).then((res) => {
      if (active) {
        setAiSummary(res.isOnlineAI ? res : null)
        setSummaryError(!res.isOnlineAI)
        setIsLoadingSummary(false)
      }
    }).catch(() => {
      if (active) {
        setIsLoadingSummary(false)
        setSummaryError(true)
      }
    })

    return () => {
      active = false
    }
  }, [aiAvailable, sessions, adherencePct, meds.length, appProfile, period])

  const handleExportReport = async () => {
    playTap()
    setIsExporting(true)
    setExportStatus(null)
    try {
      await downloadReportImage({
        patientName: appProfile?.patient.name || 'Patient',
        age: appProfile?.patient.age,
        stage: appProfile?.clinical.stage || 'Mild',
        caregiverName: appProfile?.caregiver.name || 'Caregiver',
        dateStr: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
        period,
        metrics,
        domainBars,
        adherencePct,
        aiHeadline: aiSummary?.headline,
        aiObservations: aiSummary?.observations,
      })
      setExportStatus(t('hub_report_ready'))
    } catch (error) {
      console.error('Failed to save report', error)
      setExportStatus(t('hub_report_failed'))
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Period Filter & Export Report Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
          {[
            { key: 'today', label: t('hub_period_today') },
            { key: 'week', label: t('hub_period_week') },
            { key: 'month', label: t('hub_period_month') },
            { key: 'all', label: t('hub_period_all') },
          ].map((p) => {
            const isActive = period === p.key
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriod(p.key as ReportPeriod)}
                style={{
                  background: isActive ? 'var(--primary)' : 'var(--surface-muted)',
                  color: isActive ? 'var(--ink-on-primary)' : 'var(--ink)',
                  border: isActive ? 'none' : '1px solid #D8CFBF',
                  borderRadius: 16,
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {p.label}
              </button>
            )
          })}
        </div>

        {/* Save Report Image Button */}
        <button
          type="button"
          data-testid="save-report-btn"
          onClick={() => void handleExportReport()}
          disabled={isExporting}
          style={{
            background: 'var(--primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 16,
            padding: '8px 16px',
            fontSize: 12,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: isExporting ? 'wait' : 'pointer',
            opacity: isExporting ? 0.7 : 1,
            boxShadow: '0 2px 8px rgba(22, 36, 54, 0.2)',
          }}
        >
          <span>📥</span>
          <span>{isExporting ? t('hub_saving_report') : t('hub_save_report')}</span>
        </button>
        {exportStatus && <span role="status" style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{exportStatus}</span>}
      </div>

      {/* AI Caregiver Summary Card */}
      {aiAvailable && (
      <div
        className="card"
        aria-busy={isLoadingSummary}
        style={{
          borderRadius: 22,
          padding: '20px 22px',
          background: 'linear-gradient(135deg, #162436 0%, #253950 100%)',
          color: '#fff',
          boxShadow: '0 4px 16px rgba(22, 36, 54, 0.12)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>✨</span>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--muga-gold-light)' }}>
              {t('hub_ai_summary')}
            </span>
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>{aiAvailable ? 'Cloud AI via secure server' : 'Offline mode · saved activity only'}</span>
        </div>

        {!aiAvailable ? (
          <p role="status" aria-live="polite" style={{ fontSize: 14, color: 'rgba(255,255,255,0.82)', margin: 0 }}>
            Cloud summary is unavailable while offline. Your saved activity below is still available.
          </p>
        ) : isLoadingSummary && !aiSummary ? (
          <p role="status" aria-live="polite" style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', margin: 0 }}>
            Analyzing recent cognitive activity and adherence patterns...
          </p>
        ) : summaryError && !aiSummary ? (
          <p role="alert" style={{ fontSize: 14, color: 'rgba(255,255,255,0.82)', margin: 0 }}>
            The summary is temporarily unavailable. Your saved activity below is still available.
          </p>
        ) : (
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 8px 0' }}>
              {aiSummary?.headline || 'Steady Cognitive Engagement'}
            </h3>

            {/* Strengths & Observations */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              {aiSummary?.observations.map((obs, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ color: 'var(--muga-gold-light)', fontSize: 14 }}>•</span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 1.4 }}>{obs}</span>
                </div>
              ))}
            </div>

            {/* Suggested Focus */}
            {aiSummary?.suggestedFocus && (
              <div
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  padding: '8px 12px',
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.85)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>💡</span>
                <span><strong>Recommended Focus:</strong> {aiSummary.suggestedFocus}</span>
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>
            Non-diagnostic observation summary intended solely for caregiver reassurance and routine tracking.
          </span>
        </div>
      </div>
      )}

      {/* Top 4-Metric Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {/* Metric 1: Questions */}
        <div className="card" style={{ padding: '16px', borderRadius: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {t('hub_metric_questions')}
            </span>
            <span style={{ fontSize: 16 }}>📝</span>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: 'var(--ink)', lineHeight: 1.1 }}>
            {metrics.questionsAttempted > 0 ? metrics.questionsAttempted : '0'}
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-muted)', margin: '4px 0 0 0' }}>
            {t('hub_questions_correct', { n: metrics.questionsCorrect })}
          </p>
        </div>

        {/* Metric 2: Accuracy */}
        <div className="card" style={{ padding: '16px', borderRadius: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {t('hub_metric_accuracy')}
            </span>
            <span style={{ fontSize: 16 }}>🎯</span>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: metrics.accuracyPct !== null ? 'var(--success)' : 'var(--ink)', lineHeight: 1.1 }}>
            {metrics.accuracyPct !== null ? `${metrics.accuracyPct}%` : '—'}
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-muted)', margin: '4px 0 0 0' }}>
            {hasSessions ? t('hub_task_accuracy') : t('hub_no_activity')}
          </p>
        </div>

        {/* Metric 3: Avg. Response Time */}
        <div className="card" style={{ padding: '16px', borderRadius: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {t('hub_metric_avg_response')}
            </span>
            <span style={{ fontSize: 16 }}>⏱️</span>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: 'var(--ink)', lineHeight: 1.1 }}>
            {metrics.avgLatencySec !== null ? `${metrics.avgLatencySec}s` : '—'}
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-muted)', margin: '4px 0 0 0' }}>
            {metrics.avgLatencySec !== null ? t('hub_per_question') : t('hub_awaiting_sessions')}
          </p>
        </div>

        {/* Metric 4: Session Time */}
        <div className="card" style={{ padding: '16px', borderRadius: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {t('hub_metric_session_time')}
            </span>
            <span style={{ fontSize: 16 }}>⌛</span>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: 'var(--ink)', lineHeight: 1.1 }}>
            {metrics.totalDurationMinutes > 0 ? `${metrics.totalDurationMinutes}m` : '0m'}
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-muted)', margin: '4px 0 0 0' }}>
            {t('hub_session_count', { n: metrics.sessionCount })}
          </p>
        </div>
      </div>

      <CaregiverAnalytics
        domainBars={domainBars}
        trends={trends}
        insights={insights}
        latestSummary={latestSummary}
        profile={profile}
        recentLogs={recentLogs}
        sessions={sessions}
        adherencePct={adherencePct}
        showMlDetails={showMlDetails}
        onToggleMlDetails={() => setShowMlDetails((value) => !value)}
        t={t}
      />

    </div>
  )
}

// ─────────────────────────────────────────────
// 4. FAMILY ADMIN
// ─────────────────────────────────────────────
export function FamilyAdmin({
  profile,
  onSave,
}: {
  profile: Profile | null
  onSave: (members: { name: string; relation: string; emoji?: string; photo?: string }[]) => Promise<void>
}) {
  const { t } = useApp()
  const [list, setList] = useState(profile?.cultural.familyMembers ?? [])
  const [draft, setDraft] = useState<{ idx: number | null; name: string; relation: string; photo?: string } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setList(profile?.cultural.familyMembers ?? [])
  }, [profile?.cultural.familyMembers])

  async function onPhoto(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f || !draft) return
    try {
      const m = await import('../lib/image')
      const small = await m.resizeImageFile(f)
      setDraft((d) => ({ ...(d ?? { idx: null, name: '', relation: '' }), photo: small }))
    } catch {}
  }

  function saveMember() {
    if (!draft || !draft.name.trim()) return
    let updated: typeof list
    if (draft.idx !== null && draft.idx >= 0 && draft.idx < list.length) {
      updated = list.map((item, i) =>
        i === draft.idx
          ? { name: draft.name.trim(), relation: draft.relation || 'Family', emoji: '👩', photo: draft.photo }
          : item
      )
    } else {
      updated = [...list, { name: draft.name.trim(), relation: draft.relation || 'Family', emoji: '👩', photo: draft.photo }]
    }
    setList(updated)
    void onSave(updated)
    setDraft(null)
  }

  function deleteMember(i: number) {
    const updated = list.filter((_, idx) => idx !== i)
    setList(updated)
    void onSave(updated)
    setPendingDelete(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {draft ? (
        /* Form Card */
        <div className="card" style={{ borderRadius: 24, padding: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', textAlign: 'center', marginBottom: 6 }}>
            {draft.idx !== null ? t('edit_family_member') : t('add_family_member')}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--ink-muted)', textAlign: 'center', marginBottom: 24 }}>
            {t('hub_family_sub')}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 20 }}>
            <button
              type="button"
              aria-label={t('family_photo')}
              onClick={() => fileRef.current?.click()}
              style={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                border: '2px dashed var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                overflow: 'hidden',
                marginBottom: 12,
                background: 'var(--surface-muted)',
              }}
            >
              {draft.photo ? (
                <img src={draft.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Icon name="cameraPlus" size={36} color="var(--ink)" />
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => void onPhoto(e)} />

            <strong style={{ fontSize: 16, color: 'var(--ink)', marginBottom: 4 }}>{t('family_photo')}</strong>
            <span style={{ fontSize: 13, color: 'var(--ink-muted)', maxWidth: 260, marginBottom: 12 }}>
              {t('hub_family_sub')}
            </span>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => fileRef.current?.click()}
              style={{
                background: 'var(--surface-muted)',
                border: 'none',
                borderRadius: 12,
                padding: '6px 20px',
                fontSize: 14,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Icon name="upload" size={16} /> {t('family_photo')}
            </button>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '16px 0 20px' }} />

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="family-member-name" style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              {t('onb_name')}
            </label>
            <input
              className="input"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: sanitizePersonName(e.target.value) })}
              id="family-member-name"
              placeholder={t('onb_member_placeholder')}
              style={{ borderRadius: 10, border: '1.5px solid var(--primary)' }}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="family-member-relation" style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              {t('hub_cg_relation')}
            </label>
            <select
              className="input"
              id="family-member-relation"
              value={draft.relation}
              onChange={(e) => setDraft({ ...draft, relation: e.target.value })}
              style={{ borderRadius: 10, border: '1.5px solid var(--primary)' }}
            >
              <option value="">{t('onb_select_relation')}</option>
              <option value="Daughter">{t('onb_relation_daughter')}</option>
              <option value="Son">{t('onb_relation_son')}</option>
              <option value="Spouse">{t('onb_relation_spouse')}</option>
              <option value="Sister">{t('onb_relation_sister')}</option>
              <option value="Brother">{t('onb_relation_brother')}</option>
              <option value="Grandchild">{t('onb_relation_grandchild')}</option>
              <option value="Niece">{t('onb_relation_niece')}</option>
              <option value="Nephew">{t('onb_relation_nephew')}</option>
              <option value="Friend">{t('onb_relation_friend')}</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button type="button" className="btn btn-secondary btn-block" onClick={() => setDraft(null)} style={{ borderRadius: 14 }}>
              {t('cancel')}
            </button>
            <button
              type="button"
              className="btn btn-cta btn-block"
              disabled={!draft.name.trim()}
              onClick={saveMember}
              style={{ borderRadius: 14 }}
            >
              {t('save')}
            </button>
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            className="btn btn-cta btn-block"
            onClick={() => setDraft({ idx: null, name: '', relation: 'Daughter', photo: undefined })}
            style={{ borderRadius: 14, minHeight: 48 }}
          >
            + {t('add_family_member')}
          </button>

          {list.length === 0 ? (
            <div
              className="card"
              style={{
                borderRadius: 20,
                padding: '32px 20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                border: '1.5px dashed var(--border)',
                background: 'var(--card)',
              }}
            >
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--surface-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 12 }}>
                👨‍👩‍👧
              </div>
              <strong style={{ fontSize: 16, color: 'var(--ink)', marginBottom: 4 }}>{t('family_empty')}</strong>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {list.map((m, i) => (
                <div
                  key={i}
                  className="card"
                  style={{
                    borderRadius: 20,
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        background: 'var(--surface-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 24,
                      }}
                    >
                      {m.photo ? <img src={m.photo} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👩'}
                    </div>
                    <div>
                      <strong style={{ display: 'block', fontSize: 16, color: 'var(--ink)' }}>{m.name}</strong>
                      <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>{m.relation}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className="btn btn-pearl"
                      onClick={() => setDraft({ idx: i, name: m.name, relation: m.relation, photo: m.photo })}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-pearl"
                      style={{ color: 'var(--error)' }}
                      aria-label={`${t('confirm_remove_confirm')}: ${m.name}`}
                      onClick={() => setPendingDelete(i)}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      <ConfirmDialog
        open={pendingDelete !== null}
        title={t('confirm_remove_title')}
        body={t('confirm_remove_body', { name: pendingDelete === null ? '' : list[pendingDelete]?.name ?? '' })}
        cancelLabel={t('cancel')}
        confirmLabel={t('confirm_remove_confirm')}
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete !== null) deleteMember(pendingDelete)
        }}
      />
    </div>
  )
}



// ─────────────────────────────────────────────
// 7. SETTINGS SECTION (Daily Game Limit & Dual PIN Confirmation)
// ─────────────────────────────────────────────
function SettingsSection({
  profile,
  updateProfile,
  dailyGameLimit,
  updateDailyGameLimit,
  resetAllData,
  theme,
  setTheme,
}: {
  profile: Profile | null
  updateProfile: (p: Partial<Profile>) => Promise<void>
  dailyGameLimit: number
  updateDailyGameLimit: (n: number) => Promise<void>
  resetAllData: () => Promise<void>
  theme: 'light' | 'dark'
  setTheme: (t: 'light' | 'dark') => Promise<void>
}) {
  const { t, lang } = useApp()

  // Caregiver Profile & Phone Settings
  const [cgName, setCgName] = useState(profile?.caregiver.name || '')
  const [cgPhone, setCgPhone] = useState(() => {
    const raw = profile?.caregiver.phone || ''
    return raw.replace(/\D/g, '').slice(-10)
  })
  const [cgRelation, setCgRelation] = useState(profile?.caregiver.relationship || 'Son')
  const [cgAshaName, setCgAshaName] = useState(profile?.caregiver.ashaName || '')
  const [cgAshaPhone, setCgAshaPhone] = useState(() => {
    const raw = profile?.caregiver.ashaPhone || ''
    return raw.replace(/\D/g, '').slice(-10)
  })
  const [cgSavedMsg, setCgSavedMsg] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const handleSaveCaregiver = async () => {
    if (!profile) return
    await updateProfile({
      caregiver: {
        ...profile.caregiver,
        name: cgName.trim() || 'Caregiver',
        phone: cgPhone.trim(),
        relationship: cgRelation.trim() || 'Family',
        ashaName: cgAshaName.trim() || undefined,
        ashaPhone: cgAshaPhone.trim() || undefined,
      },
    })
    setCgSavedMsg(true)
    setTimeout(() => setCgSavedMsg(false), 3000)
  }

  const [newPin, setNewPin] = useState(profile?.pin || '')
  const [confirmPin, setConfirmPin] = useState(profile?.pin || '')
  const [pinSavedMsg, setPinSavedMsg] = useState(false)
  const confirmPinInputRef = useRef<HTMLInputElement>(null)
  const [festivals, setFestivals] = useState<string[]>(profile?.cultural.festivals || [])
  const [customFestival, setCustomFestival] = useState('')
  const [showOtherFestival, setShowOtherFestival] = useState(false)
  const [hobbies, setHobbies] = useState<string[]>(profile?.cultural.hobbies || [])
  const [customHobby, setCustomHobby] = useState('')
  const [showOtherHobby, setShowOtherHobby] = useState(false)
  const [savedCulturalMsg, setSavedCulturalMsg] = useState(false)

  const toggleFestival = (item: string) => {
    const next = festivals.includes(item) ? festivals.filter((f) => f !== item) : [...festivals, item]
    setFestivals(next)
  }

  const addCustomFestival = () => {
    const f = customFestival.trim()
    if (!f) return
    if (!festivals.includes(f)) {
      setFestivals((prev) => [...prev, f])
    }
    setCustomFestival('')
  }

  const toggleHobby = (item: string) => {
    const next = hobbies.includes(item) ? hobbies.filter((h) => h !== item) : [...hobbies, item]
    setHobbies(next)
  }

  const addCustomHobby = () => {
    const h = customHobby.trim()
    if (!h) return
    if (!hobbies.includes(h)) {
      setHobbies((prev) => [...prev, h])
    }
    setCustomHobby('')
  }

  const handleSaveCultural = async () => {
    if (!profile) return
    await updateProfile({
      cultural: {
        ...profile.cultural,
        festivals,
        hobbies,
      },
    })
    setSavedCulturalMsg(true)
    setTimeout(() => setSavedCulturalMsg(false), 3000)
  }

  const handleSavePin = async () => {
    if (newPin.length !== 4 || newPin !== confirmPin) return
    await updateProfile({ pin: newPin })
    setPinSavedMsg(true)
    setTimeout(() => setPinSavedMsg(false), 3000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 0. Caregiver Settings (Phone number and contacts) */}
      <div className="card" style={{ borderRadius: 24, padding: 24 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
          👤 {t('hub_cg_title')}
        </h3>
        <p style={{ fontSize: 13, color: 'var(--ink-muted)', margin: '0 0 18px 0', lineHeight: 1.4 }}>
          {t('hub_cg_sub')}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label htmlFor="caregiver-settings-name" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
              {t('hub_cg_name')}
            </label>
            <input
              id="caregiver-settings-name"
              type="text"
              className="input"
              value={cgName}
              onChange={(e) => setCgName(sanitizePersonName(e.target.value))}
              placeholder={t('hub_cg_name')}
            />
          </div>

          <div>
            <label htmlFor="caregiver-settings-phone" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
              {t('hub_cg_phone')}
            </label>
            <input
              id="caregiver-settings-phone"
              type="tel"
              className="input"
              maxLength={10}
              value={cgPhone}
              onChange={(e) => setCgPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder={t('forgot_pin_phone_hint')}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label htmlFor="caregiver-settings-relation" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
              {t('hub_cg_relation')}
            </label>
            <select
              id="caregiver-settings-relation"
              className="input"
              value={cgRelation}
              onChange={(e) => setCgRelation(e.target.value)}
            >
              <option value="Son">{t('onb_relation_son')}</option>
              <option value="Daughter">{t('onb_relation_daughter')}</option>
              <option value="Spouse">{t('onb_relation_spouse')}</option>
              <option value="Grandchild">{t('onb_relation_grandchild')}</option>
              <option value="Sibling">{t('onb_relation_brother')}</option>
              <option value="Other">{t('onb_relation_other')}</option>
            </select>
          </div>

          <div>
            <label htmlFor="caregiver-settings-asha-phone" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
              {t('hub_cg_asha_phone')}
            </label>
            <input
              id="caregiver-settings-asha-phone"
              type="tel"
              className="input"
              maxLength={10}
              value={cgAshaPhone}
              onChange={(e) => setCgAshaPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder={t('hub_cg_asha_phone')}
            />
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void handleSaveCaregiver()}
          disabled={!cgPhone || cgPhone.length !== 10}
          style={{ borderRadius: 12, minHeight: 44 }}
        >
          {t('hub_cg_save')}
        </button>

        {cgSavedMsg && (
          <p role="status" aria-live="polite" style={{ color: 'var(--success)', fontSize: 13, fontWeight: 600, textAlign: 'center', marginTop: 10, margin: 0 }}>
            {t('hub_cg_saved')}
          </p>
        )}
      </div>

      {/* 1. Language Preference Card */}
      <div className="card" style={{ borderRadius: 24, padding: 24 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
          🌐 {t('hub_lang_title')}
        </h3>
        <p style={{ fontSize: 13, color: 'var(--ink-muted)', margin: '0 0 18px 0', lineHeight: 1.4 }}>
          {t('hub_lang_sub')}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
          {LANGUAGES.map((l) => {
            const isSel = lang === l.code
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => void updateProfile({ language: l.code })}
                style={{
                  background: isSel ? 'var(--primary)' : 'var(--surface-muted)',
                  color: isSel ? 'var(--ink-on-primary)' : 'var(--ink)',
                  border: isSel ? '2px solid var(--primary)' : '1px solid var(--border)',
                  borderRadius: 14,
                  padding: '12px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontSize: 16 }}>{l.native}</span>
                <span style={{ fontSize: 12, opacity: 0.85 }}>{l.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 2. Appearance (Light / Dark Mode) Card */}
      <div className="card" style={{ borderRadius: 24, padding: 24 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
          {t('hub_theme_title')}
        </h3>
        <p style={{ fontSize: 13, color: 'var(--ink-muted)', margin: '0 0 18px 0', lineHeight: 1.4 }}>
          {t('hub_theme_sub')}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <button
            type="button"
            data-testid="theme-light-btn"
            onClick={() => void setTheme('light')}
            style={{
              background: theme === 'light' ? 'var(--primary)' : 'var(--surface-muted)',
              color: theme === 'light' ? 'var(--ink-on-primary)' : 'var(--ink)',
              border: theme === 'light' ? 'none' : '1.5px solid var(--border)',
              borderRadius: 16,
              padding: '14px 12px',
              fontSize: 14,
              fontWeight: 700,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{ fontSize: 22 }}>☀️</span>
            <span>{t('hub_theme_light')}</span>
          </button>

          <button
            type="button"
            data-testid="theme-dark-btn"
            onClick={() => void setTheme('dark')}
            style={{
              background: theme === 'dark' ? 'var(--primary)' : 'var(--surface-muted)',
              color: theme === 'dark' ? 'var(--ink-on-primary)' : 'var(--ink)',
              border: theme === 'dark' ? 'none' : '1.5px solid var(--border)',
              borderRadius: 16,
              padding: '14px 12px',
              fontSize: 14,
              fontWeight: 700,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{ fontSize: 22 }}>🌙</span>
            <span>{t('hub_theme_dark')}</span>
          </button>
        </div>
      </div>

      {/* 3. Daily Game Limit Stepper Card */}
      <div className="card" style={{ borderRadius: 24, padding: 24 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
          {t('hub_limit_title')}
        </h3>
        <p style={{ fontSize: 13, color: 'var(--ink-muted)', margin: '0 0 18px 0', lineHeight: 1.4 }}>
          {t('hub_limit_sub')}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-muted)', borderRadius: 18, padding: '12px 18px' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>
            {t('hub_limit_title')}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              className="btn btn-pearl"
              disabled={dailyGameLimit <= 1}
              onClick={() => void updateDailyGameLimit(Math.max(1, dailyGameLimit - 1))}
              style={{ width: 48, height: 48, minWidth: 48, minHeight: 48, borderRadius: 12, fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              −
            </button>

            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', minWidth: 32, textAlign: 'center' }}>
              {dailyGameLimit}
            </span>

            <button
              type="button"
              className="btn btn-pearl"
              disabled={dailyGameLimit >= 10}
              onClick={() => void updateDailyGameLimit(Math.min(10, dailyGameLimit + 1))}
              style={{ width: 48, height: 48, minWidth: 48, minHeight: 48, borderRadius: 12, fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* 4. Cultural Interests & Reminiscence Card */}
      <div className="card" style={{ borderRadius: 24, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
          {t('hub_cultural_title')}
        </h3>
        <p style={{ fontSize: 13, color: 'var(--ink-muted)', margin: 0 }}>
          {t('hub_cultural_sub')}
        </p>

        {/* Familiar Festivals */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
            {t('hub_festivals')}
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {festivals.concat(FESTIVALS.filter((f) => !festivals.includes(f))).map((f) => {
              const isSel = festivals.includes(f)
              return (
                <button
                  key={f}
                  type="button"
                  className={`chip ${isSel ? 'chip-blue' : ''}`}
                  onClick={() => toggleFestival(f)}
                  style={{ cursor: 'pointer' }}
                >
                  {isSel ? '✓ ' : '+ '} {f}
                </button>
              )
            })}
            <button
              type="button"
              className={`chip ${showOtherFestival ? 'chip-blue' : ''}`}
              onClick={() => setShowOtherFestival((v) => !v)}
              style={{ cursor: 'pointer', borderStyle: showOtherFestival ? 'solid' : 'dashed' }}
            >
              {showOtherFestival ? '✓ Others' : '+ Others'}
            </button>
          </div>

          {showOtherFestival && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input
                className="input"
                style={{ flex: 1, minHeight: 40, fontSize: 14 }}
                placeholder={t('onb_festival_placeholder')}
                value={customFestival}
                onChange={(e) => setCustomFestival(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customFestival.trim()) {
                    e.preventDefault()
                    addCustomFestival()
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                style={{ minHeight: 40, padding: '0 14px', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}
                disabled={!customFestival.trim()}
                onClick={addCustomFestival}
              >
                {t('onb_add')}
              </button>
            </div>
          )}
        </div>

        {/* Hobbies & Pastimes */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
            {t('hub_hobbies')}
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {hobbies.concat(HOBBIES.filter((h) => !hobbies.includes(h))).map((h) => {
              const isSel = hobbies.includes(h)
              return (
                <button
                  key={h}
                  type="button"
                  className={`chip ${isSel ? 'chip-blue' : ''}`}
                  onClick={() => toggleHobby(h)}
                  style={{ cursor: 'pointer' }}
                >
                  {isSel ? '✓ ' : '+ '} {h}
                </button>
              )
            })}
            <button
              type="button"
              className={`chip ${showOtherHobby ? 'chip-blue' : ''}`}
              onClick={() => setShowOtherHobby((v) => !v)}
              style={{ cursor: 'pointer', borderStyle: showOtherHobby ? 'solid' : 'dashed' }}
            >
              {showOtherHobby ? '✓ Others' : '+ Others'}
            </button>
          </div>

          {showOtherHobby && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input
                className="input"
                style={{ flex: 1, minHeight: 40, fontSize: 14 }}
                placeholder={t('onb_hobby_placeholder')}
                value={customHobby}
                onChange={(e) => setCustomHobby(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customHobby.trim()) {
                    e.preventDefault()
                    addCustomHobby()
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                style={{ minHeight: 40, padding: '0 14px', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}
                disabled={!customHobby.trim()}
                onClick={addCustomHobby}
              >
                {t('onb_add')}
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void handleSaveCultural()}
          style={{ borderRadius: 12, minHeight: 44 }}
        >
          {t('hub_save_prefs')}
        </button>
        {savedCulturalMsg && (
          <p role="status" aria-live="polite" style={{ color: 'var(--success)', fontSize: 13, fontWeight: 600, textAlign: 'center', margin: 0 }}>
            {t('hub_prefs_saved')}
          </p>
        )}
      </div>

      {/* 5. Security & PIN Settings */}
      <div className="card" style={{ borderRadius: 24, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
          {t('hub_pin_title')}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label htmlFor="caregiver-new-pin" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
              {t('hub_pin_new')}
            </label>
            <input
              id="caregiver-new-pin"
              type="password"
              className="input"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              value={newPin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 4)
                setNewPin(val)
                if (val.length === 4) {
                  setTimeout(() => confirmPinInputRef.current?.focus(), 150)
                }
              }}
            />
          </div>

          <div>
            <label htmlFor="caregiver-confirm-pin" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
              {t('hub_pin_confirm')}
            </label>
            <input
              ref={confirmPinInputRef}
              id="caregiver-confirm-pin"
              type="password"
              className="input"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            />
          </div>
        </div>

        {newPin.length === 4 && confirmPin.length === 4 && newPin === confirmPin && (
          <p className="caption" style={{ color: 'var(--success, #15803D)', fontWeight: 600, margin: 0 }}>
            {t('hub_pin_match')}
          </p>
        )}

        {newPin.length === 4 && confirmPin.length === 4 && newPin !== confirmPin && (
          <p className="caption" style={{ color: 'var(--error)', fontWeight: 600, margin: 0 }}>
            {t('hub_pin_mismatch')}
          </p>
        )}

        <button
          type="button"
          className="btn btn-secondary"
          disabled={newPin.length !== 4 || newPin !== confirmPin}
          onClick={() => void handleSavePin()}
          style={{ borderRadius: 12, minHeight: 42 }}
        >
          {t('hub_pin_update')}
        </button>

        {pinSavedMsg && (
          <p role="status" aria-live="polite" style={{ color: 'var(--success)', fontSize: 13, fontWeight: 600, textAlign: 'center', margin: 0 }}>
            {t('hub_pin_updated')}
          </p>
        )}

        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />

        <div>
          <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--error)', marginBottom: 8 }}>{t('hub_danger_title')}</h4>
          <button
            type="button"
            className="btn btn-block"
            onClick={() => setConfirmReset(true)}
            style={{ background: 'var(--error-soft)', color: 'var(--error)', borderRadius: 14, minHeight: 44 }}
          >
            {t('hub_reset_data')}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title={t('confirm_reset_title')}
        body={t('confirm_reset_body')}
        cancelLabel={t('cancel')}
        confirmLabel={t('confirm_reset_confirm')}
        destructive
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false)
          void resetAllData()
        }}
      />

      {/* 6. AI Companion & Voice (Text-to-Speech) Settings */}
      <div className="card" style={{ borderRadius: 24, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
            🤖 {t('hub_voice_title')}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--ink-muted)', margin: 0, lineHeight: 1.4 }}>
            {t('hub_voice_sub')}
          </p>
        </div>

        {/* Engine Diagnostics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ padding: '12px 14px', borderRadius: 14, background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
              {t('hub_tts_label')}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--success, #15803D)' }}>
              ✓ {t('hub_tts_ready')}
            </span>
          </div>

          <div style={{ padding: '12px 14px', borderRadius: 14, background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
              {t('hub_cloud_ai_label')}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-muted)' }}>
              {t('hub_cloud_ai_available')}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span className="caption" style={{ display: 'block', color: 'var(--ink-muted)', fontSize: 12, lineHeight: 1.4 }}>
            {t('hub_ai_privacy_note')}
          </span>
        </div>
      </div>
    </div>
  )
}
