import { describe, it, expect } from 'vitest'
import { mulberry32, hashStr, pick, pickN, shuffleWith, intBetween, sessionRng } from '../../src/lib/rng'

describe('rng', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    const seqA = Array.from({ length: 10 }, () => a())
    const seqB = Array.from({ length: 10 }, () => b())
    expect(seqA).toEqual(seqB)
  })

  it('differs across seeds', () => {
    const a = mulberry32(1)
    const b = mulberry32(2)
    expect(Array.from({ length: 8 }, () => a())).not.toEqual(Array.from({ length: 8 }, () => b()))
  })

  it('hashStr is stable', () => {
    expect(hashStr('loom')).toBe(hashStr('loom'))
    expect(hashStr('loom')).not.toBe(hashStr('safari'))
  })

  it('pick stays inside array', () => {
    const rng = mulberry32(7)
    const arr = ['a', 'b', 'c']
    for (let i = 0; i < 50; i++) expect(arr).toContain(pick(rng, arr))
  })

  it('pickN returns n unique items without exceeding source', () => {
    const rng = mulberry32(9)
    const out = pickN(rng, [1, 2, 3, 4, 5], 3)
    expect(out).toHaveLength(3)
    expect(new Set(out).size).toBe(3)
  })

  it('shuffleWith keeps all elements', () => {
    const rng = mulberry32(11)
    const out = shuffleWith(rng, [1, 2, 3, 4, 5, 6])
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('intBetween respects bounds', () => {
    const rng = mulberry32(13)
    for (let i = 0; i < 100; i++) {
      const v = intBetween(rng, 2, 5)
      expect(v).toBeGreaterThanOrEqual(2)
      expect(v).toBeLessThanOrEqual(5)
    }
  })

  it('sessionRng yields fresh streams per call', () => {
    const a = sessionRng('pairs')
    const b = sessionRng('pairs')
    // Astronomically unlikely to match across the first draws
    expect(Array.from({ length: 5 }, () => a())).not.toEqual(Array.from({ length: 5 }, () => b()))
  })
})
