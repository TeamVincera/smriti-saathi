import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('caregiver cloud-summary gating', () => {
  it('keeps offline/unknown mode local and clears stale cloud summaries', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/screens/CaregiverHub.tsx'), 'utf8')
    expect(source).toContain('const aiAvailable = useAIAvailable()')
    expect(source).toContain('if (!aiAvailable)')
    expect(source).toContain('setAiSummary(null)')
    expect(source).toContain('adherencePct,')
    expect(source).not.toContain('adherencePct ?? 80')
    expect(source).toContain('setAiSummary(res.isOnlineAI ? res : null)')
    expect(source).toContain('Offline mode · saved activity only')
    expect(source).toContain('Cloud summary is unavailable while offline')
  })
})
