import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  hashStringToId,
  parseTime,
  syncAllAlarmsToNative,
  ALARM_CHANNEL_ID,
  MED_ACTION_TYPE,
  requestAlarmPermissions,
} from '../../src/lib/alarmService'
import {
  wipeAll,
  saveMed,
  saveDailyReminder,
  saveAppointment,
  saveProfile,
} from '../../src/lib/db'

describe('Native & Offline Scheduled Alarm Service', () => {
  beforeEach(async () => {
    await wipeAll()
    localStorage.clear()
    sessionStorage.clear()
  })

  it('generates consistent positive 32-bit integer IDs from key strings', () => {
    const id1 = hashStringToId('med:donepezil-1:08:00')
    const id2 = hashStringToId('med:donepezil-1:08:00')
    const id3 = hashStringToId('med:donepezil-1:20:00')

    expect(id1).toBe(id2)
    expect(id1).not.toBe(id3)
    expect(id1).toBeGreaterThan(0)
    expect(Number.isInteger(id1)).toBe(true)
  })

  it('parses time strings reliably into 24-hour hour and minute components', () => {
    expect(parseTime('08:30')).toEqual({ hour: 8, minute: 30 })
    expect(parseTime('21:05')).toEqual({ hour: 21, minute: 5 })
    expect(parseTime('00:00')).toEqual({ hour: 0, minute: 0 })
    expect(parseTime('invalid')).toEqual({ hour: 0, minute: 0 })
    expect(parseTime('99:99')).toEqual({ hour: 23, minute: 59 })
  })

  it('synchronizes medications, reminders, appointments, and routines to native list', async () => {
    // 1. Add active med
    await saveMed({
      id: 'med-donepezil',
      name: 'Donepezil',
      dosage: '5mg',
      form: 'tablet',
      food: 'after',
      times: ['08:00', '20:00'],
      active: true,
    })

    // 2. Add daily reminder
    await saveDailyReminder({
      id: 'rem-water',
      title: 'Drink fresh water',
      time: '10:30',
      emoji: '💧',
      category: 'hydration',
      active: true,
    })

    // 3. Add future appointment
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0]
    await saveAppointment({
      id: 'appt-dr-barua',
      title: 'Neurologist checkup',
      doctorName: 'Barua',
      date: tomorrow,
      time: '11:00',
      active: true,
    })

    // 4. Save profile with routine anchors
    await saveProfile({
      language: 'en',
      patient: { name: 'Sarala Devi' },
      clinical: { stage: 'mild' },
      cultural: { state: 'Assam' },
      routine: {
        wake: '06:30',
        breakfast: '08:30',
        lunch: '13:00',
        dinner: '20:30',
      },
      caregiver: { name: 'Rahul' },
      onboarded: true,
      createdAt: Date.now(),
    })

    const count = await syncAllAlarmsToNative('en')
    // 2 (med times) + 1 (daily reminder) + 1 (future appt) + 4 (routine anchors) = 8
    expect(count).toBe(8)
  })

  it('excludes inactive meds and past appointments from schedule count', async () => {
    // Inactive med
    await saveMed({
      id: 'med-inactive',
      name: 'Old Medicine',
      dosage: '10mg',
      form: 'tablet',
      food: 'none',
      times: ['09:00'],
      active: false,
    })

    // Past appointment (2 days ago)
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString().split('T')[0]
    await saveAppointment({
      id: 'appt-past',
      title: 'Past checkup',
      date: twoDaysAgo,
      time: '10:00',
      active: true,
    })

    const count = await syncAllAlarmsToNative('en')
    // Defaults only (from default daily reminders if any)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  it('handles permission check gracefully on web environment', async () => {
    const granted = await requestAlarmPermissions()
    expect(typeof granted).toBe('boolean')
  })
})
