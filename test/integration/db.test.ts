import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveProfile, loadProfile, saveMed, getMeds, deleteMed,
  saveDailyReminder, loadDailyReminders, saveAppointment, loadAppointments, addSession, getSessions,
  addMedLog, getMedLog, saveConfig, loadConfig, wipeAll
} from '../../src/lib/db'
import type { Profile, Med, DailyReminder, AppointmentReminder, SessionRecord } from '../../src/lib/types'

describe('IndexedDB Integration Suite', () => {
  beforeEach(async () => {
    await wipeAll()
  })

  it('persists and loads patient profile', async () => {
    const profile: Profile = {
      language: 'en',
      patient: { name: 'Sarala Devi', age: 72, avatar: '👵' },
      clinical: { stage: 'mild' },
      cultural: { state: 'Assam', community: 'Ahom', hobbies: ['Gardening', 'Weaving'] },
      routine: { wake: '06:00', breakfast: '08:00', lunch: '13:00', dinner: '20:00', sleep: '21:30' },
      caregiver: { name: 'Rahul', phone: '9876543210', relationship: 'Son' },
      pin: '1234',
      onboarded: true,
      createdAt: Date.now(),
    }

    await saveProfile(profile)
    const loaded = await loadProfile()
    expect(loaded).not.toBeNull()
    expect(loaded?.patient.name).toBe('Sarala Devi')
    expect(loaded?.pin).toBe('1234')
  })

  it('handles medication CRUD operations', async () => {
    const med1: Med = { id: 'm1', name: 'Donepezil', dosage: '5mg', form: 'tablet', times: ['08:00'], active: true }
    const med2: Med = { id: 'm2', name: 'Memantine', dosage: '10mg', form: 'tablet', times: ['20:00'], active: true }

    await saveMed(med1)
    await saveMed(med2)

    let meds = await getMeds()
    expect(meds.length).toBe(2)

    await deleteMed('m1')
    meds = await getMeds()
    expect(meds.length).toBe(1)
    expect(meds[0].id).toBe('m2')
  })

  it('persists and handles daily reminders and appointments', async () => {
    const initialReminders = await loadDailyReminders()
    expect(initialReminders.length).toBeGreaterThan(0)

    const newReminder: DailyReminder = {
      id: 'dr-test',
      title: 'Afternoon Tea',
      category: 'Meals',
      time: '16:00',
      emoji: '🍵',
      active: true,
    }
    await saveDailyReminder(newReminder)
    const reminders = await loadDailyReminders()
    expect(reminders.some((r) => r.id === 'dr-test')).toBe(true)

    const appt: AppointmentReminder = {
      id: 'ap-test',
      title: 'Neurology Checkup',
      doctorName: 'Dr. Sarma',
      date: '2026-09-01',
      time: '10:00',
      active: true,
    }
    await saveAppointment(appt)
    const appointments = await loadAppointments()
    expect(appointments.some((a) => a.id === 'ap-test')).toBe(true)
  })

  it('records cognitive game sessions and medication logs', async () => {
    const session: SessionRecord = {
      id: 's1',
      gameId: 'faces_of_home',
      gameName: 'Faces of Home',
      difficulty: 0,
      startedAt: Date.now() - 180000,
      endedAt: Date.now(),
      completion: 1.0,
      accuracy: 1.0,
      avgLatencyMs: 1800,
      hesitations: 0,
      cuesUsed: 0,
      frustrationIndex: 0.0,
      reward: 0.8,
      exploration: false,
    }

    await addSession(session)
    const sessions = await getSessions()
    expect(sessions.length).toBe(1)
    expect(sessions[0].gameId).toBe('faces_of_home')

    await addMedLog({ medId: 'm1', medName: 'Donepezil', scheduledFor: '08:00', status: 'taken', method: 'tap' })
    const logs = await getMedLog()
    expect(logs.length).toBe(1)
    expect(logs[0].status).toBe('taken')
  })

  it('wipes all stores cleanly', async () => {
    await saveProfile({
      language: 'en',
      patient: { name: 'Temp' },
      clinical: { stage: 'mild' },
      cultural: {},
      routine: { wake: '06:00', breakfast: '08:00', lunch: '13:00', dinner: '20:00', sleep: '21:30' },
      caregiver: { name: 'Temp' },
      onboarded: true,
      createdAt: Date.now(),
    })
    await wipeAll()
    const p = await loadProfile()
    expect(p).toBeNull()
  })
})
