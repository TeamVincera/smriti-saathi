import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AnswerFeedback } from '../../src/games/shared'

const choiceGames = [
  'BambooCrafting',
  'DailyLifeSequence',
  'TeaGardenWalk',
  'FamiliarObjects',
  'FamiliarPhrases',
  'LandmarkRecognition',
  'TraditionalFoods',
  'OrchidPairs',
  'NumberBridge',
  'OddOneOut',
  'SpotDifference',
  'WordHarvest',
  'WeaversLoom',
  'FacesOfHome',
  'WildlifeSafari',
]

const responsiveGridGames = ['BambooCrafting', 'DailyLifeSequence', 'FamiliarObjects', 'FamiliarPhrases', 'LandmarkRecognition', 'TraditionalFoods']

describe('shared game answer feedback', () => {
  it('announces calm success and guidance states without failure language', () => {
    const { rerender } = render(<AnswerFeedback state="success" />)
    expect(screen.getByRole('status')).toHaveTextContent('Nice work')

    rerender(<AnswerFeedback state="guidance" />)
    expect(screen.getByRole('status')).toHaveTextContent('Take your time')
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByRole('status')).not.toHaveTextContent(/wrong|failed|incorrect/i)
  })

  it('keeps audited choice games out of punitive wrong/error styling', () => {
    for (const game of choiceGames) {
      const source = readFileSync(resolve(process.cwd(), 'src/games', `${game}.tsx`), 'utf8')
      expect(source, game).toContain('AnswerFeedback')
      expect(source, game).toContain('aria-pressed')
      expect(source, game).not.toMatch(/className=.*\bwrong\b/)
      expect(source, game).not.toContain('var(--error-soft)')
      expect(source, game).not.toContain("'var(--error)'")
    }
  })

  it('keeps audited grids safe for narrow and translated layouts', () => {
    for (const game of responsiveGridGames) {
      const source = readFileSync(resolve(process.cwd(), 'src/games', `${game}.tsx`), 'utf8')
      expect(source, game).not.toMatch(/minmax\((?:180|200|220)px\s*,/)
      expect(source, game).toContain('minmax(min(')
    }

    const css = readFileSync(resolve(process.cwd(), 'src/styles/app.css'), 'utf8')
    expect(css).not.toMatch(/\.choice-btn\.wrong|\.choice-card-big\.wrong|\.item-tile\.wrong|\.scene-cell\.wrong/)
  })
})
