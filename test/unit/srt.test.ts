import { describe, it, expect } from 'vitest'
import { bumpSuccess, bumpMiss, gapFor, scheduleRound } from '../../src/lib/srt'
import type { SrtItem } from '../../src/lib/types'

describe('Spaced Retrieval Therapy (SRT) Engine', () => {
  it('bumps level on success and updates lastSeenTs', () => {
    const item: SrtItem = { id: 'item-1', level: 0, lastSeenTs: 0 }
    const updated = bumpSuccess(item)
    expect(updated.level).toBe(1)
    expect(updated.lastSeenTs).toBeGreaterThan(0)

    bumpSuccess(item) // level 2
    bumpSuccess(item) // level 3 (capped at GAPS.length - 1)
    bumpSuccess(item) // remains 3
    expect(item.level).toBe(3)
  })

  it('bumps level down on miss without going below 0', () => {
    const item: SrtItem = { id: 'item-1', level: 2, lastSeenTs: 0 }
    const updated = bumpMiss(item)
    expect(updated.level).toBe(1)

    bumpMiss(item) // level 0
    bumpMiss(item) // level 0
    expect(item.level).toBe(0)
  })

  it('calculates spacing gap correctly for each tier level', () => {
    expect(gapFor({ id: '1', level: 0, lastSeenTs: 0 })).toBe(1)
    expect(gapFor({ id: '2', level: 1, lastSeenTs: 0 })).toBe(2)
    expect(gapFor({ id: '3', level: 2, lastSeenTs: 0 })).toBe(4)
    expect(gapFor({ id: '4', level: 3, lastSeenTs: 0 })).toBe(8)
  })

  it('schedules items in rounds according to spacing intervals', () => {
    const items = ['Sarala', 'Rahul', 'Runima']
    const round = scheduleRound(items, () => 1)
    expect(round.length).toBeGreaterThanOrEqual(items.length)
    expect(round).toContain('Sarala')
    expect(round).toContain('Rahul')
    expect(round).toContain('Runima')
  })
})
