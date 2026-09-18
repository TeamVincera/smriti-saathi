import { describe, expect, it } from 'vitest'
import { buildDailyPlan } from '../../src/lib/dailyPlan'

const now = new Date(2026, 8, 10, 9, 0)

describe('buildDailyPlan', () => {
  it('assembles today’s active medicines and reminders plus the nearest upcoming appointment', () => {
    const items = buildDailyPlan({
      now,
      meds: [
        { id: 'med-1', name: 'Morning tablet', form: 'tablet', dosage: '1', times: ['08:00', '20:00'], food: 'after', active: true },
        { id: 'med-off', name: 'Inactive tablet', form: 'tablet', dosage: '1', times: ['09:00'], food: 'none', active: false },
      ],
      medlog: [{ medId: 'med-1', medName: 'Morning tablet', scheduledFor: '08:00', ts: new Date(2026, 8, 10, 8, 1).getTime(), status: 'taken' }],
      dailyReminders: [
        { id: 'water', title: 'Drink water', time: '10:00', days: [4], category: 'hydration', active: true },
        { id: 'sunday', title: 'Sunday only', time: '11:00', days: [0], active: true },
      ],
      appointments: [
        { id: 'later', title: 'Later clinic visit', doctorName: 'Dr. Later', date: '2026-09-16', time: '10:00', active: true },
        { id: 'nearest', title: 'Nearest clinic visit', doctorName: 'Dr. Near', date: '2026-09-12', time: '11:30', active: true },
      ],
    })

    expect(items.map((item) => `${item.kind}:${item.title}`)).toEqual([
      'medicine:Morning tablet',
      'reminder:Drink water',
      'medicine:Morning tablet',
      'appointment:Nearest clinic visit',
    ])
    expect(items[0].completed).toBe(true)
    expect(items[2].completed).toBe(false)
    expect(items[3].date).toBe('2026-09-12')
  })

  it('limits the orientation list without changing the source records', () => {
    const items = buildDailyPlan({
      now,
      maxItems: 2,
      meds: [{ id: 'med-1', name: 'Tablet', form: 'tablet', dosage: '1', times: ['07:00', '08:00', '09:00'], food: 'none', active: true }],
      medlog: [],
      dailyReminders: [],
      appointments: [],
    })

    expect(items).toHaveLength(2)
    expect(items.map((item) => item.time)).toEqual(['07:00', '08:00'])
  })

  it('does not treat invalid civil dates as upcoming appointments', () => {
    const items = buildDailyPlan({
      now,
      meds: [],
      medlog: [],
      dailyReminders: [],
      appointments: [{ id: 'broken', title: 'Broken date', doctorName: 'Dr. Unknown', date: '2026-02-31', time: '10:00', active: true }],
    })
    expect(items).toEqual([])
  })
})
