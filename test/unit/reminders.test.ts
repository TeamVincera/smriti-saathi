import { describe, it, expect, beforeEach } from 'vitest'
import { confirmAlarm, snoozeAlarm, subscribeReminders, type ActiveAlarm } from '../../src/lib/reminders'
import { wipeAll, getMedLog } from '../../src/lib/db'

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
})

