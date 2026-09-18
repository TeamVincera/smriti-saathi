import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react'
import { AppProvider } from '../../src/state'
import { wipeAll, saveProfile } from '../../src/lib/db'
import type { Profile } from '../../src/lib/types'

// Import all 23 cognitive game components
import { FacesOfHome } from '../../src/games/FacesOfHome'
import { MorningMelodies } from '../../src/games/MorningMelodies'
import { FamiliarObjects } from '../../src/games/FamiliarObjects'
import { MemoryTray } from '../../src/games/MemoryTray'
import { DailyLifeSequence } from '../../src/games/DailyLifeSequence'
import { TraditionalFoods } from '../../src/games/TraditionalFoods'
import { OrchidPairs } from '../../src/games/OrchidPairs'
import { VillageSounds } from '../../src/games/VillageSounds'
import { LandmarkRecognition } from '../../src/games/LandmarkRecognition'
import { WeaversLoom } from '../../src/games/WeaversLoom'
import { PictureMemory } from '../../src/games/PictureMemory'
import { BambooCrafting } from '../../src/games/BambooCrafting'
import { FamiliarPhrases } from '../../src/games/FamiliarPhrases'
import { WildlifeSafari } from '../../src/games/WildlifeSafari'
import { CherawSteps } from '../../src/games/CherawSteps'
import { SpotDifference } from '../../src/games/SpotDifference'
import { MarketDay } from '../../src/games/MarketDay'
import { TeaGardenWalk } from '../../src/games/TeaGardenWalk'
import { FestivalTales } from '../../src/games/FestivalTales'
import { MemoryGardenGame } from '../../src/games/MemoryGardenGame'
import { NumberBridge } from '../../src/games/NumberBridge'
import { OddOneOut } from '../../src/games/OddOneOut'
import { WordHarvest } from '../../src/games/WordHarvest'

const MOCK_PROFILE: Profile = {
  language: 'en',
  patient: {
    name: 'Sarala Devi',
    age: 72,
    avatar: '👵',
    languagesSpoken: ['en', 'as'],
    education: 'Secondary school',
  },
  clinical: { stage: 'mild' },
  cultural: {
    state: 'Assam',
    community: 'Ahom',
    festivals: ['Bihu', 'Durga Puja'],
    hobbies: ['Gardening', 'Weaving', 'Singing'],
    familyMembers: [
      { name: 'Runima', relation: 'Daughter', emoji: '👩' },
      { name: 'Rahul', relation: 'Son', emoji: '👨' },
    ],
  },
  routine: { wake: '06:00', breakfast: '08:00', lunch: '13:00', dinner: '20:00', sleep: '21:30' },
  caregiver: { name: 'Rahul', phone: '9876543210' },
  pin: '1234',
  onboarded: true,
  createdAt: Date.now(),
}

describe('Full Cognitive Games Battery Test Suite (All 23 Games)', () => {
  beforeEach(async () => {
    cleanup()
    await wipeAll()
    localStorage.clear()
    sessionStorage.clear()
    await saveProfile(MOCK_PROFILE)
  })

  const games = [
    { id: 'faces', name: 'Faces of Home', component: FacesOfHome },
    { id: 'melodies', name: 'Morning Melodies', component: MorningMelodies },
    { id: 'objects', name: 'Familiar Objects', component: FamiliarObjects },
    { id: 'tray', name: 'Memory Tray', component: MemoryTray },
    { id: 'sequence', name: 'Daily Life Sequence', component: DailyLifeSequence },
    { id: 'foods', name: 'Traditional Foods', component: TraditionalFoods },
    { id: 'pairs', name: 'Orchid Pairs', component: OrchidPairs },
    { id: 'sounds', name: 'Village Sounds', component: VillageSounds },
    { id: 'places', name: 'Landmark Recognition', component: LandmarkRecognition },
    { id: 'loom', name: 'Weavers Loom', component: WeaversLoom },
    { id: 'picture', name: 'Picture Memory', component: PictureMemory },
    { id: 'bamboo', name: 'Bamboo Crafting', component: BambooCrafting },
    { id: 'phrases', name: 'Familiar Phrases', component: FamiliarPhrases },
    { id: 'safari', name: 'Wildlife Safari', component: WildlifeSafari },
    { id: 'cheraw', name: 'Cheraw Steps', component: CherawSteps },
    { id: 'spot', name: 'Spot Difference', component: SpotDifference },
    { id: 'market', name: 'Market Day', component: MarketDay },
    { id: 'teawalk', name: 'Tea Garden Walk', component: TeaGardenWalk },
    { id: 'tales', name: 'Festival Tales', component: FestivalTales },
    { id: 'garden', name: 'Memory Garden', component: MemoryGardenGame },
    { id: 'bridge', name: 'Number Bridge', component: NumberBridge },
    { id: 'oddone', name: 'Odd One Out', component: OddOneOut },
    { id: 'word', name: 'Word Harvest', component: WordHarvest },
  ]

  for (const g of games) {
    it(`renders game: ${g.name} (${g.id}) cleanly without crashing`, async () => {
      const logAction = vi.fn()
      const complete = vi.fn()
      const GameComponent = g.component

      const { container } = render(
        <AppProvider>
          <GameComponent difficulty={0} logAction={logAction} complete={complete} />
        </AppProvider>
      )

      expect(container).toBeDefined()
      expect(container.firstChild).not.toBeNull()
    })

    it(`accepts interaction: ${g.name} (${g.id}) without runtime errors`, async () => {
      const logAction = vi.fn()
      const complete = vi.fn()
      const GameComponent = g.component

      const { container } = render(
        <AppProvider>
          <GameComponent difficulty={0} logAction={logAction} complete={complete} />
        </AppProvider>
      )

      const buttons = container.querySelectorAll('button')
      if (buttons.length > 0) {
        act(() => {
          buttons[0].click()
        })
      }
      expect(container).toBeDefined()
    })
  }

  it('saves Festival Tales once when the final feeling is tapped repeatedly', () => {
    vi.useFakeTimers()
    try {
      const complete = vi.fn()
      const logAction = vi.fn()
      render(
        <AppProvider>
          <FestivalTales difficulty={0} logAction={logAction} complete={complete} />
        </AppProvider>
      )

      fireEvent.click(screen.getByRole('button', { name: /Continue to the next story page/i }))
      fireEvent.click(screen.getByRole('button', { name: /Share how the story makes you feel/i }))

      const choice = () => document.querySelector('.choice-btn') as HTMLButtonElement
      fireEvent.click(choice())
      fireEvent.click(choice())
      fireEvent.click(choice())
      fireEvent.click(choice())

      act(() => {
        vi.advanceTimersByTime(700)
      })

      expect(complete).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })
})
