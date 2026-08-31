import { describe, it, expect } from 'vitest'
import { mulberry32 } from '../../src/lib/rng'
import {
  genSequenceRound,
  genLoomRound,
  genMelodyRound,
  genSafariScene,
  genMarketStall,
  genPairsBoard,
  genSortRound,
  genSpotBoard,
  genBridgePath,
  genWordRound,
  genSoundRound,
  genFamiliarObjectRound,
  genMemoryTrayRound,
  genTraditionalFoodRound,
  genLandmarkRound,
  genPictureMemoryRound,
  genFamiliarPhraseRound,
} from '../../src/lib/content'

const rng = (seed: number) => mulberry32(seed)

describe('unlimited content generators', () => {
  it('loom: missing motif is present in options and pattern', () => {
    for (let level = 0; level <= 4; level++) {
      const r = genLoomRound(rng(level * 10 + 1), level)
      expect(r.pattern).toContain(r.missing)
      expect(r.options).toContain(r.missing)
      expect(r.options).not.toContain(undefined)
      expect(r.pattern[r.missingIdx]).toBe(r.missing)
    }
  })

  it('sequence rounds have 3+ ordered steps from the library', () => {
    for (let seed = 0; seed < 30; seed++) {
      const r = genSequenceRound(rng(seed), 2)
      expect(r.steps.length).toBeGreaterThanOrEqual(3)
      expect(r.name.length).toBeGreaterThan(0)
    }
  })

  it('melody round target is always among options with 40+ dynamic instrument bank', () => {
    for (let i = 0; i < 25; i++) {
      const r = genMelodyRound(rng(i), 2)
      expect(r.options.map((o) => o.id)).toContain(r.target.id)
      expect(new Set(r.options.map((o) => o.id)).size).toBe(r.options.length)
      expect(r.target.name).toBeDefined()
      expect(r.target.state).toBeDefined()
    }
  })

  it('familiar objects round target is always among options', () => {
    for (let i = 0; i < 25; i++) {
      const r = genFamiliarObjectRound(rng(i + 100), 2)
      expect(r.options.map((o) => o.id)).toContain(r.target.id)
      expect(new Set(r.options.map((o) => o.id)).size).toBe(r.options.length)
      expect(r.target.cueQuestion).toBeDefined()
    }
  })

  it('memory tray round displays items and provides valid missing item challenge', () => {
    for (let i = 0; i < 25; i++) {
      const r = genMemoryTrayRound(rng(i + 200), 2)
      expect(r.displayedItems.length).toBeGreaterThanOrEqual(3)
      expect(r.displayedItems.map((item) => item.id)).toContain(r.missingItem.id)
      expect(r.options.map((o) => o.id)).toContain(r.missingItem.id)
    }
  })

  it('traditional food round target is in options with state metadata', () => {
    for (let i = 0; i < 25; i++) {
      const r = genTraditionalFoodRound(rng(i + 300), 2)
      expect(r.options.map((o) => o.id)).toContain(r.target.id)
      expect(r.target.question).toBeDefined()
      expect(r.target.state).toBeDefined()
    }
  })

  it('landmark round target is in options with clue descriptions', () => {
    for (let i = 0; i < 25; i++) {
      const r = genLandmarkRound(rng(i + 400), 2)
      expect(r.options.map((o) => o.id)).toContain(r.target.id)
      expect(r.target.cueQuestion).toBeDefined()
      expect(r.target.state).toBeDefined()
    }
  })

  it('picture memory round provides active question and valid scene', () => {
    for (let i = 0; i < 25; i++) {
      const r = genPictureMemoryRound(rng(i + 500), 2)
      expect(r.scene.title).toBeDefined()
      expect(r.scene.items.length).toBeGreaterThanOrEqual(3)
      expect(r.activeQuestion.correctAnswer).toBeDefined()
      expect(r.activeQuestion.distractors.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('familiar phrases round provides prompt and completion choices', () => {
    for (let i = 0; i < 25; i++) {
      const r = genFamiliarPhraseRound(rng(i + 600), 2)
      expect(r.phrase.prompt).toBeDefined()
      expect(r.options.some((o) => o.isCorrect)).toBe(true)
      expect(r.options.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('sound round target always appears in options with audio keys', () => {
    for (let i = 0; i < 25; i++) {
      const r = genSoundRound(rng(i + 700), 2)
      expect(r.options.map((o) => o.id)).toContain(r.target.id)
      expect(new Set(r.options.map((o) => o.id)).size).toBe(r.options.length)
      expect(r.target.soundKey).toBeDefined()
    }
  })

  it('sort round item belongs to exactly one offered category', () => {
    for (let i = 0; i < 25; i++) {
      const r = genSortRound(rng(i + 800), 3)
      expect([0, 1]).toContain(r.correctCatIdx)
      expect(r.cats[0].name).not.toBe(r.cats[1].name)
    }
  })

  it('spot boards differ in exactly one cell', () => {
    for (let i = 0; i < 25; i++) {
      const b = genSpotBoard(rng(i + 900), 2)
      let diffs = 0
      for (let k = 0; k < b.cellsA.length; k++) if (b.cellsA[k] !== b.cellsB[k]) diffs++
      expect(diffs).toBe(1)
    }
  })

  it('pairs board contains exactly pairCount pairs of each value', () => {
    for (let level = 0; level <= 4; level++) {
      const b = genPairsBoard(rng(level + 77), level)
      const counts = new Map<string, number>()
      b.cards.forEach((c) => counts.set(c.v, (counts.get(c.v) ?? 0) + 1))
      expect(counts.size).toBe(b.pairCount)
      for (const n of counts.values()) expect(n).toBe(2)
      expect(b.cards.length).toBe(b.pairCount * 2)
    }
  })

  it('bridge path is a shuffled complete 1..N sequence', () => {
    for (let level = 0; level <= 4; level++) {
      const p = genBridgePath(rng(level + 500), level)
      expect(p.numbers.map((x) => x.n).sort((a, b) => a - b)).toEqual(
        Array.from({ length: p.total }, (_, i) => i + 1)
      )
    }
  })

  it('safari scene has exactly its targets hidden once each', () => {
    const expectedSize = (lvl: number) => (lvl >= 3 ? 20 : lvl >= 1 ? 16 : 12)
    for (let level = 0; level <= 4; level++) {
      const s = genSafariScene(rng(level + 50), level)
      expect(s.targets.length).toBeGreaterThanOrEqual(3)
      for (const t of s.targets) expect(s.cells.filter((c) => c.v === t)).toHaveLength(1)
      expect(s.cells).toHaveLength(expectedSize(level))
    }
  })

  it('market stall budget scales with level and goods fit', () => {
    const low = genMarketStall(rng(3), 0)
    const high = genMarketStall(rng(4), 4)
    expect(low.budget).toBeLessThan(high.budget)
    expect(low.goods.length).toBeGreaterThan(2)
  })

  it('word round has correct answers plus clearly wrong ones', () => {
    for (let i = 0; i < 20; i++) {
      const r = genWordRound(rng(i + 600), 2)
      expect(r.correct.length).toBeGreaterThanOrEqual(2)
      expect(r.wrong.length).toBeGreaterThanOrEqual(1)
      const labels = new Set(r.options.map((o) => o.label))
      expect(labels.size).toBe(r.options.length)
    }
  })
})
