import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { AppProvider, useApp } from '../../src/state'
import { wipeAll } from '../../src/lib/db'
import type { Profile, Med } from '../../src/lib/types'

describe('App State Context Integration', () => {
  beforeEach(async () => {
    await wipeAll()
    localStorage.clear()
    sessionStorage.clear()
  })

  it('initializes state and provides translations', async () => {
    const { result } = renderHook(() => useApp(), {
      wrapper: AppProvider,
    })

    await waitFor(() => expect(result.current.ready).toBe(true))

    expect(result.current.profile).toBeNull()
    expect(result.current.t('brand')).toBe('Smriti Sathi')
  })

  it('updates profile and reflects language dynamically', async () => {
    const { result } = renderHook(() => useApp(), {
      wrapper: AppProvider,
    })

    await waitFor(() => expect(result.current.ready).toBe(true))

    const mockProfile: Profile = {
      language: 'hi',
      patient: { name: 'Sunil', age: 68 },
      clinical: { stage: 'mild' },
      cultural: {},
      routine: { wake: '06:00', breakfast: '08:00', lunch: '13:00', dinner: '20:00', sleep: '21:30' },
      caregiver: { name: 'Anjali' },
      onboarded: true,
      createdAt: Date.now(),
    }

    await act(async () => {
      await result.current.setProfile(mockProfile)
    })

    expect(result.current.profile?.patient.name).toBe('Sunil')
    expect(result.current.lang).toBe('hi')
    expect(result.current.t('nav_home')).toBe('होम')
  })

  it('manages medication state lifecycle', async () => {
    const { result } = renderHook(() => useApp(), {
      wrapper: AppProvider,
    })

    await waitFor(() => expect(result.current.ready).toBe(true))

    const med: Med = {
      id: 'm1',
      name: 'Galantamine',
      dosage: '4mg',
      form: 'tablet',
      times: ['09:00'],
      active: true,
    }

    await act(async () => {
      await result.current.upsertMed(med)
    })

    expect(result.current.meds.length).toBe(1)
    expect(result.current.meds[0].name).toBe('Galantamine')

    await act(async () => {
      await result.current.removeMed('m1')
    })

    expect(result.current.meds.length).toBe(0)
  })

  it('manages daily reminders and daily game limit lifecycle', async () => {
    const { result } = renderHook(() => useApp(), {
      wrapper: AppProvider,
    })

    await waitFor(() => expect(result.current.ready).toBe(true))

    expect(result.current.dailyReminders.length).toBeGreaterThan(0)
    expect(result.current.dailyGameLimit).toBe(3)

    await act(async () => {
      await result.current.updateDailyGameLimit(5)
    })

    expect(result.current.dailyGameLimit).toBe(5)

    await act(async () => {
      await result.current.upsertDailyReminder({
        id: 'dr-custom',
        title: 'Walk in the morning',
        category: 'Activity',
        time: '07:00',
        emoji: '🚶',
        active: true,
      })
    })

    expect(result.current.dailyReminders.some((r) => r.id === 'dr-custom')).toBe(true)
  })

  it('stores and updates custom festivals and hobbies from Others option', async () => {
    const { result } = renderHook(() => useApp(), {
      wrapper: AppProvider,
    })

    await waitFor(() => expect(result.current.ready).toBe(true))

    const profileWithCultural: Profile = {
      language: 'en',
      patient: { name: 'Priya', age: 72 },
      clinical: { stage: 'mild' },
      cultural: {
        state: 'Assam',
        festivals: ['Bihu', 'Rongker', 'Diwali'],
        hobbies: ['Gardening', 'Painting', 'Birdwatching'],
      },
      routine: { wake: '06:00', breakfast: '08:00', lunch: '13:00', dinner: '20:00', sleep: '21:30' },
      caregiver: { name: 'Rahul' },
      onboarded: true,
      createdAt: Date.now(),
    }

    await act(async () => {
      await result.current.setProfile(profileWithCultural)
    })

    expect(result.current.profile?.cultural.festivals).toContain('Rongker')
    expect(result.current.profile?.cultural.festivals).toContain('Diwali')
    expect(result.current.profile?.cultural.hobbies).toContain('Painting')
    expect(result.current.profile?.cultural.hobbies).toContain('Birdwatching')
  })
})
