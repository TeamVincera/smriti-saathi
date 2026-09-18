import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/state', () => ({
  useApp: vi.fn(),
}))

vi.mock('../../src/router', () => ({
  navigate: vi.fn(),
}))

vi.mock('../../src/lib/ai', () => ({
  seedBaselineForColdStart: vi.fn(() => 1),
}))

import { useApp } from '../../src/state'
import { Onboarding } from '../../src/screens/Onboarding'
import { localizedGameCultural, localizedGameName, GAMES } from '../../src/lib/games'
import { LANGUAGES, type Language } from '../../src/lib/types'
import { translate } from '../../src/i18n'

const mockedUseApp = vi.mocked(useApp)
const languages: Language[] = ['en', 'hi', 'as', 'bn', 'brx', 'mni']

describe('stage 2 localization', () => {
  beforeEach(() => {
    mockedUseApp.mockReturnValue({
      lang: 'en',
      t: (key: string) => key,
      setProfile: vi.fn(async () => {}),
    } as never)
    window.history.replaceState({}, '', '/?step=0')
  })

  afterEach(() => {
    cleanup()
    window.history.replaceState({}, '', '/')
    vi.clearAllMocks()
  })

  it.each(languages)('updates onboarding titles, progress, and language ARIA copy for %s', (lang) => {
    render(<Onboarding />)

    fireEvent.click(screen.getByTestId(`lang-option-${lang}`))

    const selectedLanguage = LANGUAGES.find((item) => item.code === lang)
    expect(selectedLanguage).toBeDefined()
    expect(screen.getByRole('heading', { name: translate(lang, 'onb_lang_title') })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: translate(lang, 'onb_progress_label') })).toHaveTextContent(
      translate(lang, 'onb_caregiver_hint')
    )
    expect(screen.getByRole('button', {
      name: translate(lang, 'onb_select_language_aria', { language: selectedLanguage?.native ?? '' }),
    })).toBeInTheDocument()
  })

  it('provides distinct Bengali and Bodo game names instead of reusing Assamese', () => {
    const faces = GAMES.find((game) => game.id === 'faces')
    expect(faces).toBeDefined()
    expect(localizedGameName(faces!, 'bn')).toBe(faces?.nameBn)
    expect(localizedGameName(faces!, 'brx')).toBe(faces?.nameBrx)
    expect(faces?.nameBn).not.toBe(faces?.nameAs)
    expect(faces?.nameBrx).not.toBe(faces?.nameAs)
    expect(localizedGameCultural(faces!, 'bn')).toBe(faces?.culturalBn)
    expect(localizedGameCultural(faces!, 'brx')).toBe(faces?.culturalBrx)
    expect(faces?.culturalBn).not.toBe(faces?.cultural)
    expect(faces?.culturalBrx).not.toBe(faces?.cultural)
  })
})
