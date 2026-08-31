import { describe, it, expect } from 'vitest'
import { INSTRUMENT_BANK } from '../../src/lib/questionBanks/instruments'
import { FAMILIAR_OBJECTS_BANK } from '../../src/lib/questionBanks/familiarObjects'
import { MEMORY_TRAY_BANK } from '../../src/lib/questionBanks/memoryTray'
import { SEQUENCE_BANK } from '../../src/lib/questionBanks/dailySequences'
import { TRADITIONAL_FOODS_BANK } from '../../src/lib/questionBanks/traditionalFoods'
import { LANDMARKS_BANK } from '../../src/lib/questionBanks/northeastPlaces'
import { PICTURE_MEMORY_BANK } from '../../src/lib/questionBanks/pictureMemory'
import { VILLAGE_SOUNDS_BANK } from '../../src/lib/questionBanks/villageSounds'
import { FAMILIAR_PHRASES_BANK } from '../../src/lib/questionBanks/familiarPhrases'

describe('Northeast India Question Banks & Localization', () => {
  describe('INSTRUMENT_BANK', () => {
    it('has 40+ authentic instruments with state metadata', () => {
      expect(INSTRUMENT_BANK.length).toBeGreaterThanOrEqual(40)
      const states = new Set(INSTRUMENT_BANK.map((i) => i.state))
      expect(states.has('Assam')).toBe(true)
      expect(states.has('Meghalaya')).toBe(true)
      expect(states.has('Manipur')).toBe(true)
      expect(states.has('Mizoram')).toBe(true)
      expect(states.has('Nagaland')).toBe(true)
      expect(states.has('Tripura')).toBe(true)
      expect(states.has('Arunachal Pradesh')).toBe(true)
      expect(states.has('Sikkim')).toBe(true)
    })

    it('all instruments have non-empty names, soundPresets, and descriptions', () => {
      for (const inst of INSTRUMENT_BANK) {
        expect(inst.id).toBeTruthy()
        expect(inst.name).toBeTruthy()
        expect(inst.soundPreset).toBeTruthy()
        expect(inst.emoji).toBeTruthy()
        expect(inst.region).toBeTruthy()
      }
    })
  })

  describe('FAMILIAR_OBJECTS_BANK', () => {
    it('contains 35+ traditional & household objects', () => {
      expect(FAMILIAR_OBJECTS_BANK.length).toBeGreaterThanOrEqual(35)
    })

    it('each object has cue question and cultural note', () => {
      for (const obj of FAMILIAR_OBJECTS_BANK) {
        expect(obj.id).toBeTruthy()
        expect(obj.name).toBeTruthy()
        expect(obj.cueQuestion).toBeTruthy()
        expect(obj.culturalNote).toBeTruthy()
      }
    })
  })

  describe('MEMORY_TRAY_BANK', () => {
    it('contains multiple rich scenarios with items and distractors', () => {
      expect(MEMORY_TRAY_BANK.length).toBeGreaterThanOrEqual(8)
      for (const scenario of MEMORY_TRAY_BANK) {
        expect(scenario.items.length).toBeGreaterThanOrEqual(4)
        expect(scenario.distractors.length).toBeGreaterThanOrEqual(3)
      }
    })
  })

  describe('SEQUENCE_BANK', () => {
    it('contains 12+ daily and cultural routines with sequential steps', () => {
      expect(SEQUENCE_BANK.length).toBeGreaterThanOrEqual(12)
      for (const seq of SEQUENCE_BANK) {
        expect(seq.steps.length).toBeGreaterThanOrEqual(3)
        for (const step of seq.steps) {
          expect(step.label).toBeTruthy()
          expect(step.emoji).toBeTruthy()
        }
      }
    })
  })

  describe('TRADITIONAL_FOODS_BANK', () => {
    it('contains 20+ regional dishes across Northeast states', () => {
      expect(TRADITIONAL_FOODS_BANK.length).toBeGreaterThanOrEqual(20)
      for (const food of TRADITIONAL_FOODS_BANK) {
        expect(food.name).toBeTruthy()
        expect(food.question).toBeTruthy()
        expect(food.state).toBeTruthy()
      }
    })
  })

  describe('LANDMARKS_BANK', () => {
    it('contains 20+ iconic landmarks and landscapes', () => {
      expect(LANDMARKS_BANK.length).toBeGreaterThanOrEqual(20)
      for (const place of LANDMARKS_BANK) {
        expect(place.name).toBeTruthy()
        expect(place.cueQuestion).toBeTruthy()
        expect(place.clue).toBeTruthy()
      }
    })
  })

  describe('PICTURE_MEMORY_BANK', () => {
    it('contains scenes with observation items and detail questions', () => {
      expect(PICTURE_MEMORY_BANK.length).toBeGreaterThanOrEqual(6)
      for (const scene of PICTURE_MEMORY_BANK) {
        expect(scene.items.length).toBeGreaterThanOrEqual(3)
        expect(scene.questions.length).toBeGreaterThanOrEqual(2)
        for (const q of scene.questions) {
          expect(q.correctAnswer).toBeTruthy()
          expect(q.distractors.length).toBeGreaterThanOrEqual(2)
        }
      }
    })
  })

  describe('VILLAGE_SOUNDS_BANK', () => {
    it('contains nature and village audio questions', () => {
      expect(VILLAGE_SOUNDS_BANK.length).toBeGreaterThanOrEqual(12)
      for (const s of VILLAGE_SOUNDS_BANK) {
        expect(s.soundKey).toBeTruthy()
        expect(s.name).toBeTruthy()
      }
    })
  })

  describe('FAMILIAR_PHRASES_BANK', () => {
    it('contains proverbs and sayings with correct completions', () => {
      expect(FAMILIAR_PHRASES_BANK.length).toBeGreaterThanOrEqual(12)
      for (const p of FAMILIAR_PHRASES_BANK) {
        expect(p.prompt).toBeTruthy()
        expect(p.correctCompletion).toBeTruthy()
        expect(p.distractors.length).toBeGreaterThanOrEqual(2)
      }
    })
  })
})
