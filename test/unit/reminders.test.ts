import { describe, it, expect, beforeEach } from 'vitest'
import { confirmAlarm, snoozeAlarm, subscribeReminders, type ActiveAlarm } from '../../src/lib/reminders'
import { wipeAll, getMedLog, dbAll } from '../../src/lib/db'

describe('Medication and Hydration Reminders Engine', () => {
  beforeEach(async () => {
    await wipeAll()
    localStorage.clear()
    sessionStorage.clear()
  })

  it('subscribes and receives reminder state changes', () => {
    let received: unknown = 'initial'
    const unsubscribe = subscribeReminders((alarm) => {
      received = alarm
    })
    expect(received).toBeNull()
    unsubscribe()
  })

  it('confirms taken medicine and logs into database', async () => {
    const alarm: ActiveAlarm = {
      id: 'med-123',
      key: 'med:med-123|1720000000000',
      type: 'med',
      title: 'Donepezil',
      subtitle: '5mg • After food',
      emoji: '💊',
      time: '08:00',
      details: {
        medId: 'med-123',
        dosage: '5mg',
        food: 'after',
      },
    }

    await confirmAlarm(alarm, 'slide')
    const logs = await getMedLog()
    expect(logs.length).toBe(1)
    expect(logs[0].medId).toBe('med-123')
    expect(logs[0].status).toBe('taken')
    expect(logs[0].method).toBe('slide')
  })

  it('does not duplicate a medication occurrence when native and in-app confirmations race', async () => {
    const alarm: ActiveAlarm = {
      id: 'med-123',
      key: 'med:med-123|today',
      type: 'med',
      title: 'Donepezil',
      emoji: '💊',
      time: '08:00',
      details: { medId: 'med-123' },
    }

    await Promise.all([confirmAlarm(alarm, 'tap'), confirmAlarm(alarm, 'slide')])

    const logs = await getMedLog()
    expect(logs).toHaveLength(1)
    expect(logs[0].medId).toBe('med-123')
    expect(logs[0].status).toBe('taken')
  })

  it('does not duplicate completion events when a daily reminder is confirmed twice', async () => {
    const alarm: ActiveAlarm = {
      id: 'water',
      key: 'daily:water|today',
      type: 'daily',
      title: 'Drink water',
      emoji: '💧',
      time: '09:00',
    }

    await Promise.all([confirmAlarm(alarm, 'tap'), confirmAlarm(alarm, 'slide')])

    const events = await dbAll<{ kind: string }>('events')
    expect(events.filter((event) => event.kind === 'reminder_completed')).toHaveLength(1)
  })
})
