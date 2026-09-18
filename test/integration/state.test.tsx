import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { AppProvider, useApp } from '../../src/state'
import { getMeds, loadConfig, loadProfile, wipeAll } from '../../src/lib/db'
import * as alarmService from '../../src/lib/alarmService'
import { AdaptiveQuestionEngine } from '../../src/lib/adaptive'
import type { Profile, Med } from '../../src/lib/types'

describe('App State Context Integration', () => {
  beforeEach(async () => {
    await wipeAll()
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
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

  it('clears the profile ref on reset so post-reset updates cannot resurrect old data', async () => {
    const { result } = renderHook(() => useApp(), { wrapper: AppProvider })
    await waitFor(() => expect(result.current.ready).toBe(true))

    await act(async () => {
      await result.current.setProfile({
        language: 'en',
        patient: { name: 'Reset Me' },
        clinical: { stage: 'mild' },
        cultural: {},
        routine: {},
        caregiver: {},
        onboarded: true,
        createdAt: Date.now(),
      })
      await result.current.resetAllData()
    })

    expect(result.current.profile).toBeNull()
    await expect(result.current.updateProfile({ patient: { name: 'Should not return' } })).rejects.toThrow('before it is loaded')
    expect(await loadProfile()).toBeNull()
    expect(AdaptiveQuestionEngine.getProfile().totalAttempts).toBe(0)
  })

  it('serializes config read-modify-write updates so theme and daily limit are preserved', async () => {
    const { result } = renderHook(() => useApp(), { wrapper: AppProvider })
    await waitFor(() => expect(result.current.ready).toBe(true))

    await act(async () => {
      await Promise.all([
        result.current.setTheme('dark'),
        result.current.updateDailyGameLimit(7),
      ])
    })

    const config = await loadConfig()
    expect(config.theme).toBe('dark')
    expect(config.maxSessionsPerDay).toBe(7)
  })

  it('waits for an older native sync before reset cancels alarms', async () => {
    const order: string[] = []
    let resolveSync!: (count: number) => void
    const syncFinished = new Promise<number>((resolve) => { resolveSync = resolve })
    const syncSpy = vi.spyOn(alarmService, 'syncAllAlarmsToNative').mockImplementation(async () => {
      order.push('sync-start')
      const count = await syncFinished
      order.push('sync-end')
      return count
    })
    const cancelSpy = vi.spyOn(alarmService, 'cancelAllAlarmsToNative').mockImplementation(async () => {
      order.push('cancel')
    })
    const { result } = renderHook(() => useApp(), { wrapper: AppProvider })
    await waitFor(() => expect(result.current.ready).toBe(true))

    let upsertPromise!: Promise<void>
    await act(async () => {
      upsertPromise = result.current.upsertMed({
        id: 'queued-med', name: 'Queued tablet', dosage: '1', form: 'tablet', times: ['08:00'], active: true,
      })
      await Promise.resolve()
    })
    await waitFor(() => expect(syncSpy).toHaveBeenCalledTimes(1))

    let resetPromise!: Promise<void>
    await act(async () => {
      resetPromise = result.current.resetAllData()
      await Promise.resolve()
    })
    expect(cancelSpy).not.toHaveBeenCalled()

    resolveSync(1)
    await upsertPromise
    await resetPromise

    expect(order.indexOf('sync-end')).toBeGreaterThanOrEqual(0)
    expect(order.indexOf('sync-end')).toBeLessThan(order.indexOf('cancel'))
    expect(await getMeds()).toEqual([])
  })
})
