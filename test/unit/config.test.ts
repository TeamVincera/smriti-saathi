import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ENV_CONFIG } from '../../src/lib/config'

const configSource = readFileSync(resolve(process.cwd(), 'src/lib/config.ts'), 'utf8')
const chatbotSource = readFileSync(resolve(process.cwd(), 'src/components/AIChatbot.tsx'), 'utf8')
const caregiverHubSource = readFileSync(resolve(process.cwd(), 'src/screens/CaregiverHub.tsx'), 'utf8')

describe('client credential configuration', () => {
  it('does not contain long-lived provider credentials in shipped source', () => {
    const providerKeyPattern = /(?:gsk_|sk_)[A-Za-z0-9_-]{20,}/

    expect(configSource).not.toMatch(providerKeyPattern)
    expect(configSource).not.toMatch(/VITE_(GROQ|SARVAM|AZURE_SPEECH)_/)
    expect(chatbotSource).not.toMatch(providerKeyPattern)
    expect(caregiverHubSource).not.toMatch(providerKeyPattern)
  })

  it('exposes only client connectivity state', () => {
    expect(ENV_CONFIG).not.toHaveProperty('groqApiKey')
    expect(ENV_CONFIG).not.toHaveProperty('sarvamApiKey')
    expect(ENV_CONFIG).not.toHaveProperty('azureSpeechKey')
  })
})
