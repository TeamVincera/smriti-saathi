import { describe, expect, it } from 'vitest'
import { calculateAgeFromDob } from '../../src/lib/formatters'

describe('local civil-date formatting', () => {
  it('rejects malformed and overflow dates instead of normalising them', () => {
    expect(calculateAgeFromDob('2000-02-30')).toBeNull()
    expect(calculateAgeFromDob('2000-2-3')).toBeNull()
  })

  it('accepts a strict date-only value', () => {
    expect(calculateAgeFromDob('2000-01-01')).toBeGreaterThanOrEqual(25)
  })
})
