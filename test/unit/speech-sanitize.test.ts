import { describe, it, expect } from 'vitest'
import { sanitizeTranscript } from '../../src/lib/voice/SpeechToText'

describe('sanitizeTranscript (STT removal stub)', () => {
  it('returns trimmed text unchanged (STT removed)', () => {
    expect(sanitizeTranscript('  Hello  ')).toBe('Hello')
    expect(sanitizeTranscript('Test Test Test Test Test Test')).toBe('Test Test Test Test Test Test')
    expect(sanitizeTranscript('ठीक है ठीक है')).toBe('ठीक है ठीक है')
  })

  it('returns empty for empty/whitespace input', () => {
    expect(sanitizeTranscript('')).toBe('')
    expect(sanitizeTranscript('   ')).toBe('')
    expect(sanitizeTranscript(undefined as unknown as string)).toBe('')
  })
})
