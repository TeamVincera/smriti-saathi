import { describe, it, expect } from 'vitest'
import {
  pCorrect, updateAbility, nextLevel, recordAnswer, getAbility,
  MAX_LEVEL, DOMAIN_BY_GAME,
} from '../../src/lib/adaptive'

// The ability engine keeps its state in a module cache that is seeded from
// IndexedDB at app boot; these unit tests exercise the pure update + selection
// logic directly, using unique domains per test to stay isolated.
describe('adaptive ability engine', () => {
  it('pCorrect rises with ability and falls with level', () => {
    expect(pCorrect(2, 0)).toBeGreaterThan(pCorrect(1, 0))
    expect(pCorrect(2, 4)).toBeLessThan(pCorrect(2, 0))
  })

  it('correct answers raise theta, wrong answers lower it', () => {
    let rec = { theta: 0.8, n: 0 }
    const afterRight = updateAbility(rec, 0, true)
    expect(afterRight.theta).toBeGreaterThan(rec.theta)
    rec = afterRight
    const afterWrong = updateAbility(rec, 0, false)
    expect(afterWrong.theta).toBeLessThan(rec.theta)
  })

  it('learning rate decays as evidence accumulates', () => {
    const early = updateAbility({ theta: 1, n: 0 }, 1, true)
    const late = updateAbility({ theta: 1, n: 40 }, 1, true)
    expect(early.theta - 1).toBeGreaterThan(late.theta - 1)
  })

  it('theta never escapes its bounds', () => {
    let rec = { theta: 0.8, n: 0 }
    for (let i = 0; i < 200; i++) rec = updateAbility(rec, 0, true)
    expect(rec.theta).toBeLessThanOrEqual(MAX_LEVEL + 0.5)
    let down = { theta: 0.8, n: 100 }
    for (let i = 0; i < 200; i++) down = updateAbility(down, 4, false)
    expect(down.theta).toBeGreaterThanOrEqual(-0.5)
  })

  it('nextLevel stays within level bounds even at extremes', () => {
    for (const domain of ['t_nextlevel_a', 't_nextlevel_b']) {
      recordAnswer(domain, 4, true)
      const lvl = nextLevel(domain)
      expect(lvl).toBeGreaterThanOrEqual(0)
      expect(lvl).toBeLessThanOrEqual(MAX_LEVEL)
    }
  })

  it('recordAnswer accumulates evidence and raises ability on success', () => {
    const domain = 't_record'
    recordAnswer(domain, 0, true)
    recordAnswer(domain, 0, true)
    const rec = getAbility(domain)
    expect(rec.n).toBe(2)
    expect(rec.theta).toBeGreaterThan(0.8)
  })

  it('domains are shared across related games', () => {
    expect(DOMAIN_BY_GAME['bamboo']).toBe(DOMAIN_BY_GAME['oddone'])
    expect(DOMAIN_BY_GAME['melodies']).toBe(DOMAIN_BY_GAME['sounds'])
    expect(DOMAIN_BY_GAME['sequence']).toBe(DOMAIN_BY_GAME['bridge'])
  })
})
