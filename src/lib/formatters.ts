/**
 * Shared formatting and sanitization utilities across Smriti Sathi.
 */

/**
 * Sanitizes input names, allowing Unicode letters & combining vowel marks
 * for regional Indic scripts, spaces, dots, apostrophes, and hyphens.
 */
export function sanitizePersonName(val: string): string {
  return val.replace(/[^\p{L}\p{M}\s.'-]/gu, '')
}

/**
 * Calculates current age in years given a date of birth string (YYYY-MM-DD).
 * Returns null if the date is invalid or in the future.
 */
export function calculateAgeFromDob(dobVal: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dobVal)) return null
  const [year, month, day] = dobVal.split('-').map(Number)
  // Parse date-only input as a local civil date. `new Date('YYYY-MM-DD')`
  // parses at UTC midnight and can shift the birthday across a local day.
  const birthDate = new Date(year, month - 1, day)
  if (!Number.isFinite(birthDate.getTime())
    || birthDate.getFullYear() !== year
    || birthDate.getMonth() !== month - 1
    || birthDate.getDate() !== day) return null

  const now = new Date()
  let ageYears = now.getFullYear() - birthDate.getFullYear()
  const m = now.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) {
    ageYears--
  }

  if (ageYears >= 0 && ageYears <= 125) {
    return ageYears
  }
  return null
}

/**
 * Returns a friendly emoji icon for medicine dosage forms.
 */
export function formEmoji(form: string): string {
  switch (form) {
    case 'capsule':
    case 'tablet':
      return '💊'
    case 'syrup':
      return '🧴'
    case 'injection':
      return '💉'
    default:
      return '💊'
  }
}
