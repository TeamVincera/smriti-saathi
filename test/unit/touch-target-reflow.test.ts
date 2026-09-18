import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8')

describe('touch targets and narrow-layout reflow guards', () => {
  it('keeps shared and component-owned icon controls at a true 48px target', () => {
    const css = root('src/styles/app.css')
    const gameHost = root('src/games/GameHost.tsx')
    const caregiverHub = root('src/screens/CaregiverHub.tsx')
    const chatbot = root('src/components/AIChatbot.tsx')

    expect(css).toMatch(/\.icon-btn\s*\{[^}]*width:\s*48px;[^}]*height:\s*48px;[^}]*min-width:\s*48px;[^}]*min-height:\s*48px/s)
    expect(gameHost).toContain('className="icon-btn"')
    expect(gameHost).not.toMatch(/width:\s*44|height:\s*44/)
    expect(caregiverHub).toContain('className="icon-btn"')
    expect(caregiverHub).not.toMatch(/width:\s*42|height:\s*42/)
    expect(chatbot).not.toMatch(/width:\s*36|height:\s*36/)
    expect(chatbot).toMatch(/width:\s*48,[\s\S]*height:\s*48,/)
  })

  it('keeps flexible content shrinkable and wraps translated text instead of clipping', () => {
    const css = root('src/styles/app.css')

    expect(css).toMatch(/\.card\s*\{[^}]*min-width:\s*0;[^}]*overflow-wrap:\s*anywhere;/s)
    expect(css).toMatch(/\.chip\s*\{[^}]*min-width:\s*0;[^}]*overflow-wrap:\s*anywhere;/s)
    expect(css).toMatch(/\.question-banner-meta\s*\{[^}]*min-width:\s*0;[^}]*flex-wrap:\s*wrap;/s)
    expect(css).toMatch(/\.question-chip\s*\{[^}]*max-width:\s*100%;[^}]*white-space:\s*normal;[^}]*overflow-wrap:\s*anywhere;/s)
    expect(css).toMatch(/\.status-text\s*\{[^}]*min-width:\s*0;[^}]*white-space:\s*normal;[^}]*overflow-wrap:\s*anywhere;/s)
  })
})
