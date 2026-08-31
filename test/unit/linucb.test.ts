import { describe, it, expect } from 'vitest'
import { newArm, shermanMorrisonUpdate, expectedReward, ucbBonus, pickArm, computeReward, CONTEXT_DIM } from '../../src/lib/linucb'

describe('LinUCB Contextual Bandit Engine', () => {
  it('initializes a new arm with identity matrix of dimension CONTEXT_DIM', () => {
    const arm = newArm()
    expect(arm.Ainv.length).toBe(CONTEXT_DIM)
    expect(arm.Ainv[0].length).toBe(CONTEXT_DIM)
    expect(arm.Ainv[0][0]).toBe(1)
    expect(arm.Ainv[0][1]).toBe(0)
    expect(arm.b.length).toBe(CONTEXT_DIM)
    expect(arm.n).toBe(0)
  })

  it('updates arm parameters via Sherman-Morrison matrix update', () => {
    const arm = newArm()
    const x = new Float64Array(CONTEXT_DIM).fill(0)
    x[0] = 1.0
    x[1] = 0.5

    shermanMorrisonUpdate(arm, x, 0.9)
    expect(arm.n).toBe(1)
    expect(arm.b[0]).toBeCloseTo(0.9)
    expect(arm.b[1]).toBeCloseTo(0.45)

    const expR = expectedReward(arm, x)
    expect(expR).toBeGreaterThan(0)
  })

  it('computes UCB bonus based on alpha and feature variance', () => {
    const arm = newArm()
    const x = new Float64Array(CONTEXT_DIM).fill(0.5)
    const bonus = ucbBonus(arm, x, 1.2)
    expect(bonus).toBeGreaterThan(0)
  })

  it('picks the best arm from candidate set', () => {
    const arm1 = newArm()
    const arm2 = newArm()
    const x = new Float64Array(CONTEXT_DIM).fill(0.2)
    x[0] = 1.0

    // Reward arm 1 positively
    shermanMorrisonUpdate(arm1, x, 1.0)
    // Reward arm 2 negatively
    shermanMorrisonUpdate(arm2, x, -0.5)

    const arms = { game1: arm1, game2: arm2 }
    const res = pickArm(arms, ['game1', 'game2'], x, 0.1, 0.0)
    expect(res).not.toBeNull()
    expect(res?.armId).toBe('game1')
  })

  it('computes composite multi-objective reward correctly', () => {
    const weights = { completion: 0.4, accuracy: 0.4, hesitation: 0.1, frustration: 0.1 }
    const perfectReward = computeReward(1.0, 1.0, 0.0, 0.0, weights)
    expect(perfectReward).toBeCloseTo(0.8)

    const poorReward = computeReward(0.5, 0.5, 0.8, 0.5, weights)
    expect(poorReward).toBeLessThan(perfectReward)
  })
})
