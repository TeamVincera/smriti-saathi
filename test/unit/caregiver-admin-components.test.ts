import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8')

describe('caregiver medication and reminder component boundaries', () => {
  it('keeps CRUD state in focused components while the hub owns composition', () => {
    const hub = source('src/screens/CaregiverHub.tsx')
    expect(hub).toContain("from '../components/caregiver/CaregiverMedicationAdmin'")
    expect(hub).toContain("from '../components/caregiver/CaregiverReminderAdmin'")
    expect(hub).not.toContain('function MedsAdmin(')
    expect(hub).not.toContain('function RemindersAdmin(')
  })

  it('preserves keyboard and non-colour semantics for management controls', () => {
    const meds = source('src/components/caregiver/CaregiverMedicationAdmin.tsx')
    const reminders = source('src/components/caregiver/CaregiverReminderAdmin.tsx')

    expect(reminders).toContain('role="tablist"')
    expect(reminders).toContain('aria-selected={subSection ===')
    expect(reminders).toContain('role="tabpanel"')
    expect(reminders).toContain('className="btn btn-pearl btn-danger"')
    expect(reminders).toContain('aria-label={`Delete ${r.title}`}')
    expect(meds).toContain('aria-pressed={isSel}')
    expect(meds).toContain('aria-label={`Remove dose time ${tVal}`}')
    expect(meds).toContain('role="status"')
    expect(meds).not.toContain('minHeight: 42')
    expect(reminders).not.toContain('minHeight: 42')
  })

  it('uses keyboard-operable photo selection and associated family fields', () => {
    const hub = source('src/screens/CaregiverHub.tsx')
    expect(hub).toContain('export function FamilyAdmin(')
    expect(hub).toContain('aria-label={t(\'family_photo\')}')
    expect(hub).toContain('htmlFor="family-member-name"')
    expect(hub).toContain('id="family-member-name"')
    expect(hub).toContain('htmlFor="family-member-relation"')
    expect(hub).toContain('id="family-member-relation"')
    expect(hub).not.toContain('window.confirm(')
  })
})
