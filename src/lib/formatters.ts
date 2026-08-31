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
  if (!dobVal) return null
  const birthDate = new Date(dobVal)
  if (isNaN(birthDate.getTime())) return null

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
