import { describe, it, expect } from 'vitest'
import { checkCaregiverPhone, getMaskedPhone } from '../../src/screens/CaregiverHub'

describe('Caregiver Forgot PIN Security Helpers', () => {
  describe('checkCaregiverPhone', () => {
    const registered = '9876543210'

    it('matches exact 10-digit phone', () => {
      expect(checkCaregiverPhone('9876543210', registered)).toBe(true)
    })

    it('matches phone with spaces and dashes', () => {
      expect(checkCaregiverPhone('98765 43210', registered)).toBe(true)
      expect(checkCaregiverPhone('98765-43210', registered)).toBe(true)
    })

    it('matches phone with +91 country prefix', () => {
      expect(checkCaregiverPhone('+91 9876543210', registered)).toBe(true)
      expect(checkCaregiverPhone('+919876543210', registered)).toBe(true)
    })

    it('matches phone when registered has +91 and input is 10 digits', () => {
      expect(checkCaregiverPhone('9876543210', '+91 9876543210')).toBe(true)
    })

    it('rejects non-matching phone numbers', () => {
      expect(checkCaregiverPhone('9123456780', registered)).toBe(false)
      expect(checkCaregiverPhone('1234567890', registered)).toBe(false)
    })

    it('returns false when registered or input phone is missing or empty', () => {
      expect(checkCaregiverPhone('', registered)).toBe(false)
      expect(checkCaregiverPhone('9876543210', undefined)).toBe(false)
      expect(checkCaregiverPhone('9876543210', '')).toBe(false)
    })
  })

  describe('getMaskedPhone', () => {
    it('masks 10-digit phone to show only last 4 digits', () => {
      expect(getMaskedPhone('9876543210')).toBe('•••••• 3210')
    })

    it('masks phone with international formatting', () => {
      expect(getMaskedPhone('+91 98765 43210')).toBe('•••••• 3210')
    })

    it('handles short or empty phone gracefully', () => {
      expect(getMaskedPhone('')).toBe('')
      expect(getMaskedPhone(undefined)).toBe('')
      expect(getMaskedPhone('1234')).toBe('•••• 1234')
    })
  })
})
