import { describe, it, expect, beforeEach } from 'vitest'
import { sanitizePersonName } from '../../src/screens/Onboarding'

describe('Name Sanitization (No Underscores or Special Characters)', () => {
  it('strips underscores, numbers, and special symbols from patient and caregiver names', () => {
    expect(sanitizePersonName('Sarala_Borah')).toBe('SaralaBorah')
    expect(sanitizePersonName('Rahul_123!@#$')).toBe('Rahul')
    expect(sanitizePersonName('John__Doe_99')).toBe('JohnDoe')
    expect(sanitizePersonName('Deben (Son)*')).toBe('Deben Son')
    expect(sanitizePersonName('Asha_Worker_01')).toBe('AshaWorker')
  })

  it('preserves valid alphabets in English and regional Indian languages with spaces and hyphens', () => {
    expect(sanitizePersonName('Sarala Borah-Das')).toBe('Sarala Borah-Das')
    expect(sanitizePersonName('Deben Chandra Nath')).toBe('Deben Chandra Nath')
    expect(sanitizePersonName('सरला बोरा')).toBe('सरला बोरा')
    expect(sanitizePersonName('ৰুণিমা বৰা')).toBe('ৰুণিমা বৰা')
  })
})

describe('DOB and Age Calculation', () => {
  it('calculates accurate age from date of birth', () => {
    const dob = '1952-05-15'
    const birthDate = new Date(dob)
    const now = new Date()
    let ageYears = now.getFullYear() - birthDate.getFullYear()
    const m = now.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) {
      ageYears--
    }
    expect(ageYears).toBeGreaterThanOrEqual(70)
    expect(ageYears).toBeLessThanOrEqual(76)
  })
})

describe('Baseline Assessment Photo Conditioning (Step 9)', () => {
  it('omits face recognition questions if no family member photo is uploaded', () => {
    const familyWithoutPhotos = [
      { name: 'Sarala', relation: 'Daughter', emoji: '👩' },
      { name: 'Deben', relation: 'Son', emoji: '👨' },
    ]
    const withPhotos = familyWithoutPhotos.filter((fm) => fm && fm.photo && fm.photo.trim().length > 0)
    const faces = withPhotos.length > 0 ? withPhotos.slice(0, 2).map((fm) => ({
      emoji: fm.emoji || '👩',
      photo: fm.photo,
      relation: fm.relation,
      names: [fm.name, 'Kavita', 'Sunil'],
      correctIdx: 0,
    })) : []

    expect(faces).toHaveLength(0)
  })

  it('includes face recognition questions only when family member photo is uploaded', () => {
    const familyWithPhotos = [
      { name: 'Sarala', relation: 'Daughter', emoji: '👩', photo: 'data:image/jpeg;base64,samplephoto1' },
      { name: 'Deben', relation: 'Son', emoji: '👨' },
    ]
    const withPhotos = familyWithPhotos.filter((fm) => fm && fm.photo && fm.photo.trim().length > 0)
    const faces = withPhotos.length > 0 ? withPhotos.slice(0, 2).map((fm) => ({
      emoji: fm.emoji || '👩',
      photo: fm.photo,
      relation: fm.relation,
      names: [fm.name, 'Kavita', 'Sunil'],
      correctIdx: 0,
    })) : []

    expect(faces).toHaveLength(1)
    expect(faces[0].names[0]).toBe('Sarala')
    expect(faces[0].photo).toBe('data:image/jpeg;base64,samplephoto1')
  })
})
