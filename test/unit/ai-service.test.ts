import { describe, it, expect, vi } from 'vitest'
import { AIService } from '../../src/lib/ai/AIService'
import { PatientContextBuilder } from '../../src/lib/ai/PatientContextBuilder'
import type { Profile, SessionRecord } from '../../src/lib/types'

describe('PatientContextBuilder', () => {
  it('builds minimal context without leaking unnecessary data', () => {
    const mockProfile: Profile = {
      language: 'hi',
      patient: { name: 'Devi Sharma', age: 72 },
      clinical: { stage: 'mild' },
      cultural: { state: 'Assam' },
      routine: { wake: '06:00' },
      caregiver: { name: 'Anita', relationship: 'Daughter' },
      onboarded: true,
      createdAt: Date.now(),
    }

    const ctx = PatientContextBuilder.build({
      profile: mockProfile,
      meds: [{ id: 'm1', name: 'Donepezil', form: 'tablet', dosage: '5mg', times: ['08:00'], food: 'after', active: true }],
      sessions: [{
        id: 's-1',
        gameId: 'faces',
        gameName: 'Faces of Home',
        difficulty: 0,
        startedAt: Date.now() - 3600000,
        endedAt: Date.now() - 3400000,
        completion: 1,
        accuracy: 0.85,
        avgLatencyMs: 3200,
        hesitations: 1,
        cuesUsed: 0,
        frustrationIndex: 0.1,
        reward: 0.8,
        exploration: false,
      }],
    })

    expect(ctx.name).toBe('Devi Sharma')
    expect(ctx.language).toBe('hi')
    expect(ctx.todayMeds).toHaveLength(1)
    expect(ctx.todayMeds[0].name).toBe('Donepezil')
    expect(ctx.recentGames[0].accuracyPct).toBe(85)
  })

  it('generates system prompt containing medical safety rules', () => {
    const ctx = PatientContextBuilder.build({ profile: null })
    const prompt = PatientContextBuilder.toSystemPrompt(ctx)

    expect(prompt).toContain('NEVER diagnose illnesses')
    expect(prompt).toContain('NEVER advise changing, stopping, or taking medication dosages')
    expect(prompt).toContain('STRICT MEDICAL SAFETY')
  })
})

describe('AIService', () => {
  it('returns graceful local chat fallback when offline', async () => {
    const res = await AIService.chat([{ role: 'user', content: 'What medicine do I have?' }], {
      name: 'Ramesh',
      language: 'hi',
      todayMeds: [{ name: 'Aspirin', time: '09:00', food: 'after food' }],
      todayReminders: [],
      recentGames: [],
    })

    expect(res).toBeTruthy()
    expect(typeof res).toBe('string')
    expect(res.length).toBeGreaterThan(5)
  })

  it('generates structured caretaker summary fallback safely', async () => {
    const mockSessions: SessionRecord[] = [
      {
        id: 's-1',
        gameId: 'faces',
        gameName: 'Faces of Home',
        difficulty: 0,
        startedAt: Date.now() - 3600000,
        endedAt: Date.now() - 3400000,
        completion: 1,
        accuracy: 0.9,
        avgLatencyMs: 2500,
        hesitations: 0,
        cuesUsed: 0,
        frustrationIndex: 0.05,
        reward: 0.9,
        exploration: false,
      },
    ]

    const summary = await AIService.generateCaretakerSummary({
      sessions: mockSessions,
      adherencePct: 85,
      medCount: 2,
    })

    expect(summary).toBeDefined()
    expect(summary.headline).toBeTruthy()
    expect(Array.isArray(summary.strengths)).toBe(true)
    expect(Array.isArray(summary.observations)).toBe(true)
    expect(summary.observations.length).toBeGreaterThan(0)
    expect(typeof summary.suggestedFocus).toBe('string')
  })
})
