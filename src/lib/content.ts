// Scalable content engine. Every round of every game is generated fresh from
// rich, culturally-rooted dynamic question banks (PRD FR-4.5 & SIH specifications).
// Generators are pure functions of (rng, level) for deterministic testing.

import { pick, pickN, shuffleWith, intBetween } from './rng'
import type { Rng } from './rng'
import { playAmbient, playInstrument } from './audio'
import type { AmbientSound, Instrument } from './audio'

import { INSTRUMENT_BANK } from './questionBanks/instruments'
import type { InstrumentItem } from './questionBanks/instruments'
import { FAMILIAR_OBJECTS_BANK } from './questionBanks/familiarObjects'
import type { FamiliarObjectItem } from './questionBanks/familiarObjects'
import { MEMORY_TRAY_BANK } from './questionBanks/memoryTray'
import type { MemoryTrayScenario, TrayItem } from './questionBanks/memoryTray'
import { SEQUENCE_BANK } from './questionBanks/dailySequences'
import type { SequenceStory, SequenceStep } from './questionBanks/dailySequences'
import { TRADITIONAL_FOODS_BANK } from './questionBanks/traditionalFoods'
import type { TraditionalFoodItem } from './questionBanks/traditionalFoods'
import { LANDMARKS_BANK } from './questionBanks/northeastPlaces'
import type { LandmarkItem } from './questionBanks/northeastPlaces'
import { PICTURE_MEMORY_BANK } from './questionBanks/pictureMemory'
import type { PictureMemoryScene, SceneDetailQuestion } from './questionBanks/pictureMemory'
import { VILLAGE_SOUNDS_BANK } from './questionBanks/villageSounds'
import type { SoundQuestionItem } from './questionBanks/villageSounds'
import { FAMILIAR_PHRASES_BANK } from './questionBanks/familiarPhrases'
import type { FamiliarPhraseItem } from './questionBanks/familiarPhrases'

// 1. SEQUENCE ROUND
export interface StepItem {
  emoji: string
  label: string
  labelHi?: string
}

export interface SeqRound {
  name: string
  nameHi?: string
  steps: StepItem[]
}

export function genSequenceRound(rng: Rng, level: number): SeqRound {
  const story = pick(rng, SEQUENCE_BANK)
  const maxSteps = Math.min(story.steps.length, 3 + Math.floor(level / 2))
  const stepCount = Math.min(story.steps.length, Math.max(3, maxSteps))
  const selectedSteps = story.steps.slice(0, stepCount).map((s) => ({
    emoji: s.emoji,
    label: s.label,
    labelHi: s.labelHi,
  }))
  return {
    name: story.title,
    nameHi: story.titleHi,
    steps: selectedSteps,
  }
}

// 2. MUSICAL INSTRUMENT MELODY ROUND
export interface MelodyRound {
  target: InstrumentItem
  options: InstrumentItem[]
}

export function genMelodyRound(rng: Rng, level: number, stateFilter?: string): MelodyRound {
  let pool = INSTRUMENT_BANK
  if (stateFilter && stateFilter !== 'All') {
    const regional = INSTRUMENT_BANK.filter((i) => i.state.toLowerCase() === stateFilter.toLowerCase())
    if (regional.length >= 3) {
      pool = regional
    }
  }
  const target = pick(rng, pool)
  const optionCount = Math.min(pool.length, level >= 2 ? 4 : level >= 1 ? 3 : 3)
  const others = pickN(
    rng,
    INSTRUMENT_BANK.filter((i) => i.id !== target.id),
    optionCount - 1
  )
  return {
    target,
    options: shuffleWith(rng, [target, ...others]),
  }
}

// 3. FAMILIAR OBJECT RECOGNITION ROUND
export interface FamiliarObjectRound {
  target: FamiliarObjectItem
  options: FamiliarObjectItem[]
}

export function genFamiliarObjectRound(rng: Rng, level: number): FamiliarObjectRound {
  const target = pick(rng, FAMILIAR_OBJECTS_BANK)
  const optionCount = Math.min(FAMILIAR_OBJECTS_BANK.length, level >= 2 ? 4 : 3)
  const others = pickN(
    rng,
    FAMILIAR_OBJECTS_BANK.filter((o) => o.id !== target.id),
    optionCount - 1
  )
  return {
    target,
    options: shuffleWith(rng, [target, ...others]),
  }
}

// 4. MEMORY TRAY ROUND
export interface MemoryTrayRound {
  scenario: MemoryTrayScenario
  displayedItems: TrayItem[]
  missingItem: TrayItem
  options: TrayItem[]
  mode: 'missing' | 'recall'
}

export function genMemoryTrayRound(rng: Rng, level: number): MemoryTrayRound {
  const scenario = pick(rng, MEMORY_TRAY_BANK)
  const itemCount = Math.min(scenario.items.length, 3 + Math.min(level, 2))
  const displayedItems = pickN(rng, scenario.items, itemCount)
  const missingItem = pick(rng, displayedItems)
  const distractorCount = level >= 2 ? 3 : 2
  const distractors = pickN(rng, scenario.distractors, distractorCount)
  const options = shuffleWith(rng, [missingItem, ...distractors])

  return {
    scenario,
    displayedItems,
    missingItem,
    options,
    mode: 'missing',
  }
}

// 5. TRADITIONAL FOOD ROUND
export interface TraditionalFoodRound {
  target: TraditionalFoodItem
  options: TraditionalFoodItem[]
}

export function genTraditionalFoodRound(rng: Rng, level: number, stateFilter?: string): TraditionalFoodRound {
  let pool = TRADITIONAL_FOODS_BANK
  if (stateFilter && stateFilter !== 'All') {
    const regional = TRADITIONAL_FOODS_BANK.filter((f) => f.state.toLowerCase() === stateFilter.toLowerCase())
    if (regional.length >= 3) {
      pool = regional
    }
  }
  const target = pick(rng, pool)
  const optionCount = Math.min(pool.length, level >= 2 ? 4 : 3)
  const others = pickN(
    rng,
    TRADITIONAL_FOODS_BANK.filter((f) => f.id !== target.id),
    optionCount - 1
  )
  return {
    target,
    options: shuffleWith(rng, [target, ...others]),
  }
}

// 6. NORTHEAST LANDMARK ROUND
export interface LandmarkRound {
  target: LandmarkItem
  options: LandmarkItem[]
}

export function genLandmarkRound(rng: Rng, level: number, stateFilter?: string): LandmarkRound {
  let pool = LANDMARKS_BANK
  if (stateFilter && stateFilter !== 'All') {
    const regional = LANDMARKS_BANK.filter((l) => l.state.toLowerCase() === stateFilter.toLowerCase())
    if (regional.length >= 3) {
      pool = regional
    }
  }
  const target = pick(rng, pool)
  const optionCount = Math.min(pool.length, level >= 2 ? 4 : 3)
  const others = pickN(
    rng,
    LANDMARKS_BANK.filter((l) => l.id !== target.id),
    optionCount - 1
  )
  return {
    target,
    options: shuffleWith(rng, [target, ...others]),
  }
}

// 7. PICTURE MEMORY SCENE ROUND
export interface PictureMemoryRound {
  scene: PictureMemoryScene
  activeQuestion: SceneDetailQuestion
}

export function genPictureMemoryRound(rng: Rng, _level: number): PictureMemoryRound {
  const scene = pick(rng, PICTURE_MEMORY_BANK)
  const activeQuestion = pick(rng, scene.questions)
  return {
    scene,
    activeQuestion,
  }
}

// 8. FAMILIAR PROVERBS & PHRASES ROUND
export interface FamiliarPhraseRound {
  phrase: FamiliarPhraseItem
  options: { text: string; textHi: string; isCorrect: boolean }[]
}

export function genFamiliarPhraseRound(rng: Rng, _level: number): FamiliarPhraseRound {
  const phrase = pick(rng, FAMILIAR_PHRASES_BANK)
  const correctOpt = { text: phrase.correctCompletion, textHi: phrase.correctCompletionHi, isCorrect: true }
  const wrongOpts = phrase.distractors.map((d) => ({ text: d.text, textHi: d.textHi, isCorrect: false }))
  const options = shuffleWith(rng, [correctOpt, ...wrongOpts])
  return {
    phrase,
    options,
  }
}

// 9. VILLAGE & NATURE SOUND ROUND
export interface SoundRound {
  target: SoundQuestionItem
  options: SoundQuestionItem[]
}

export function genSoundRound(rng: Rng, level: number): SoundRound {
  const target = pick(rng, VILLAGE_SOUNDS_BANK)
  const optionCount = Math.min(VILLAGE_SOUNDS_BANK.length, level >= 2 ? 4 : 3)
  const others = pickN(
    rng,
    VILLAGE_SOUNDS_BANK.filter((s) => s.id !== target.id),
    optionCount - 1
  )
  return {
    target,
    options: shuffleWith(rng, [target, ...others]),
  }
}

export function playSound(soundKey: string): number {
  return playAmbient(soundKey)
}

// 10. WEAVER'S LOOM ROUND
export interface LoomRound {
  pattern: string[]
  missing: string
  missingIdx: number
  options: string[]
}

const MOTIF_SETS: string[][] = [
  ['🔺', '🔴', '🟡'], // Gamosa red-on-raw-silk
  ['🔺', '🟥', '🟡', '🟢'],
  ['⬛', '🔴', '⭐'], // Naga shawl bands
  ['🟢', '🟥', '🟡', '⬛'], // Mizo Puan stripes
  ['🔺', '🟥', '🟡', '🟢', '⭐'],
  ['🔶', '🔸', '🔷', '⭐', '🟥', '🟢'],
]

export function genLoomRound(rng: Rng, level: number): LoomRound {
  const motifs = MOTIF_SETS[Math.min(MOTIF_SETS.length - 1, level)]
  const repeatLen = level >= 3 ? 3 : 2
  const unit: string[] = []
  for (let i = 0; i < repeatLen; i++) {
    let m = pick(rng, motifs)
    while (unit.includes(m)) m = pick(rng, motifs)
    unit.push(m)
  }
  const repeats = level >= 2 ? 2 : 1
  const pattern: string[] = []
  for (let r = 0; r < repeats; r++) pattern.push(...unit)
  if (pattern.length % 2 === 1 && repeatLen === 2) pattern.push(unit[0])
  const missingIdx = intBetween(rng, 0, pattern.length - 1)
  const missing = pattern[missingIdx]
  const distractorCount = level >= 2 ? 2 : 1
  const others = shuffleWith(rng, motifs.filter((m) => m !== missing)).slice(0, distractorCount)
  return { pattern, missing, missingIdx, options: shuffleWith(rng, [missing, ...others]) }
}

// 11. CATEGORY SORTING ROUND
export interface SortRound {
  item: { emoji: string; label: string; labelHi?: string }
  cats: { name: string; nameHi: string; emoji: string }[]
  correctCatIdx: number
}

export interface OddOneRound {
  categoryName: string
  baseItems: { emoji: string; label: string }[]
  intruder: { emoji: string; label: string }
  options: { emoji: string; label: string }[]
}

const ODD_ONE_FAMILIES = [
  {
    name: 'Bazaar Fruits',
    items: [
      { emoji: '🍌', label: 'Banana' },
      { emoji: '🍊', label: 'Mandarin' },
      { emoji: '🍎', label: 'Apple' },
      { emoji: '🍍', label: 'Pineapple' },
    ],
    intruders: [
      { emoji: '🔨', label: 'Hammer' },
      { emoji: '🪘', label: 'Drum' },
      { emoji: '👞', label: 'Shoe' },
    ],
  },
  {
    name: 'Forest Animals',
    items: [
      { emoji: '🦏', label: 'Rhino' },
      { emoji: '🐘', label: 'Elephant' },
      { emoji: '🦌', label: 'Deer' },
      { emoji: '🐅', label: 'Tiger' },
    ],
    intruders: [
      { emoji: '🍵', label: 'Tea cup' },
      { emoji: '🧵', label: 'Shuttle' },
      { emoji: '🪔', label: 'Diya' },
    ],
  },
  {
    name: 'Traditional Musical Instruments',
    items: [
      { emoji: '🪘', label: 'Dhol' },
      { emoji: '📯', label: 'Pepa horn' },
      { emoji: '🪈', label: 'Flute' },
      { emoji: '🔔', label: 'Prayer bell' },
    ],
    intruders: [
      { emoji: '🥦', label: 'Cabbage' },
      { emoji: '🧹', label: 'Broom' },
      { emoji: '🪨', label: 'Stone' },
    ],
  },
]

export function genOddOneRound(rng: Rng, _level: number): OddOneRound {
  const family = pick(rng, ODD_ONE_FAMILIES)
  const baseItems = pickN(rng, family.items, 3)
  const intruder = pick(rng, family.intruders)
  const options = shuffleWith(rng, [...baseItems, intruder])
  return {
    categoryName: family.name,
    baseItems,
    intruder,
    options,
  }
}


const SORT_CATEGORIES: { name: string; nameHi: string; emoji: string; items: { emoji: string; label: string; labelHi: string }[] }[] = [
  {
    name: 'Fresh Fruits',
    nameHi: 'ताज़े फल',
    emoji: '🍎',
    items: [
      { emoji: '🍎', label: 'Sweet Apple', labelHi: 'सेब' },
      { emoji: '🍌', label: 'Malbhog Banana', labelHi: 'केला' },
      { emoji: '🍊', label: 'Khasi Mandarin', labelHi: 'संतरा' },
      { emoji: '🍍', label: 'Queen Pineapple', labelHi: 'अनानास' },
      { emoji: '🍈', label: 'Sweet Jackfruit', labelHi: 'कटहल' },
    ],
  },
  {
    name: 'Village & Farm Tools',
    nameHi: 'औज़ार और बर्तन',
    emoji: '🔨',
    items: [
      { emoji: '✂️', label: 'Tamol Cutter', labelHi: 'सरोता' },
      { emoji: '🌾', label: 'Harvest Sickle', labelHi: 'हँसिया' },
      { emoji: '🧵', label: 'Loom Shuttle', labelHi: 'माकू' },
      { emoji: '🔨', label: 'Iron Hammer', labelHi: 'हथौड़ा' },
      { emoji: '🧹', label: 'Bamboo Broom', labelHi: 'झाड़ू' },
    ],
  },
  {
    name: 'Forest Animals',
    nameHi: 'जंगल के पशु',
    emoji: '🦏',
    items: [
      { emoji: '🦏', label: 'One-Horned Rhino', labelHi: 'एक सींग वाला गैंडा' },
      { emoji: '🐘', label: 'Asian Elephant', labelHi: 'हाथी' },
      { emoji: '🦌', label: 'Dancing Sangai Deer', labelHi: 'शंघाई हिरण' },
      { emoji: '🐃', label: 'Mithun / Wild Buffalo', labelHi: 'मिथुन / भैंसा' },
      { emoji: '🐅', label: 'Royal Bengal Tiger', labelHi: 'बाघ' },
    ],
  },
  {
    name: 'Native Flowers & Orchids',
    nameHi: 'फूल और ऑर्किड',
    emoji: '🌺',
    items: [
      { emoji: '🌺', label: 'Red Hibiscus', labelHi: 'गुड़हल' },
      { emoji: '🌸', label: 'Kopou Phool (Orchid)', labelHi: 'कपौ फूल' },
      { emoji: '🪷', label: 'Pond Lotus', labelHi: 'कमल' },
      { emoji: '🌻', label: 'Golden Sunflower', labelHi: 'सूरजमुखी' },
      { emoji: '🌼', label: 'Yellow Marigold', labelHi: 'गेंदा' },
    ],
  },
  {
    name: 'Musical Instruments',
    nameHi: 'पारंपरिक वाद्य',
    emoji: '🪘',
    items: [
      { emoji: '🪘', label: 'Bihu Dhol', labelHi: 'ढोल' },
      { emoji: '📯', label: 'Buffalo Horn Pepa', labelHi: 'पेपा' },
      { emoji: '🪈', label: 'Bamboo Flute', labelHi: 'बांसुरी' },
      { emoji: '🔔', label: 'Prayer Bell', labelHi: 'घंटी' },
      { emoji: '🎻', label: 'Pena Fiddle', labelHi: 'पेना सारंगी' },
    ],
  },
]

export function genSortRound(rng: Rng, level: number): SortRound {
  const catA = pick(rng, SORT_CATEGORIES)
  let catB = pick(rng, SORT_CATEGORIES)
  let guard = 0
  while (catB.name === catA.name && guard++ < 12) {
    catB = pick(rng, SORT_CATEGORIES)
  }
  const itemIsA = rng() < 0.5
  const item = pick(rng, itemIsA ? catA.items : catB.items)
  const correctCatIdx = itemIsA ? 0 : 1

  return {
    item,
    cats: [
      { name: catA.name, nameHi: catA.nameHi, emoji: catA.emoji },
      { name: catB.name, nameHi: catB.nameHi, emoji: catB.emoji },
    ],
    correctCatIdx,
  }
}

// 12. SAFARI SCENE ROUND
export interface SafariScene {
  cells: { v: string; i: number }[]
  targets: string[]
  cols: number
  sceneName: string
}

const SAFARI_THEMES = [
  { name: 'Kaziranga Grassland', fillers: ['🌾', '🌿', '🪨', '🌳'] },
  { name: 'Brahmaputra Riverbank', fillers: ['🌊', '🪷', '🌾', '🪨'] },
  { name: 'Deep Tropical Forest', fillers: ['🌲', '🌿', '🍄', '🍃'] },
  { name: 'Bamboo Grove', fillers: ['🎋', '🌿', '🍃', '🌾'] },
]

const SAFARI_ANIMALS = ['🦏', '🐘', '🐅', '🦌', '🦚', '🐃', '🦜', '🐒']

export function genSafariScene(rng: Rng, level: number): SafariScene {
  const theme = pick(rng, SAFARI_THEMES)
  const targetCount = Math.min(5, 3 + (level >= 3 ? 2 : level >= 1 ? 1 : 0))
  const size = level >= 3 ? 20 : level >= 1 ? 16 : 12
  const animals = pickN(rng, SAFARI_ANIMALS, targetCount)
  const arr: string[] = [...animals]
  while (arr.length < size) arr.push(pick(rng, theme.fillers))
  return {
    cells: shuffleWith(rng, arr.map((v, i) => ({ v, i }))),
    targets: animals,
    cols: size > 12 ? 5 : 4,
    sceneName: theme.name,
  }
}

// 13. MARKET STALL ROUND
export interface MarketStall {
  stallName: string
  goods: { emoji: string; name: string; price: number }[]
  budget: number
  targetItems: number
}

const MARKET_STALLS = [
  {
    name: 'Vegetable Haat Stall',
    goods: [
      { emoji: '🍅', name: 'Tomatoes', price: 20 },
      { emoji: '🥔', name: 'Potatoes', price: 15 },
      { emoji: '🫑', name: 'Capsicum', price: 25 },
      { emoji: '🥬', name: 'Fresh Greens', price: 10 },
      { emoji: '🎃', name: 'Pumpkin', price: 30 },
      { emoji: '🍆', name: 'Brinjal', price: 18 },
    ],
  },
  {
    name: 'Fish & River Stall',
    goods: [
      { emoji: '🐟', name: 'Rohu River Fish', price: 40 },
      { emoji: '🦐', name: 'Fresh Prawns', price: 45 },
      { emoji: '🐠', name: 'Small Fish', price: 25 },
      { emoji: '🥚', name: 'Country Eggs', price: 12 },
    ],
  },
  {
    name: 'Hill Fruit Cart',
    goods: [
      { emoji: '🍌', name: 'Sweet Bananas', price: 10 },
      { emoji: '🍎', name: 'Apples', price: 22 },
      { emoji: '🍊', name: 'Mandarin Oranges', price: 16 },
      { emoji: '🍈', name: 'Melon', price: 28 },
      { emoji: '🍍', name: 'Pineapple', price: 24 },
    ],
  },
  {
    name: 'Cane Crafts & Wild Honey',
    goods: [
      { emoji: '🍯', name: 'Forest Honey', price: 35 },
      { emoji: '🧺', name: 'Small Wicker Basket', price: 30 },
      { emoji: '🏺', name: 'Clay Pot', price: 26 },
      { emoji: '🕯️', name: 'Beeswax Candles', price: 14 },
    ],
  },
]

export function genMarketStall(rng: Rng, level: number): MarketStall {
  const stall = pick(rng, MARKET_STALLS)
  const goods = pickN(rng, stall.goods, Math.min(stall.goods.length, 4 + (level >= 2 ? 1 : 0)))
  const budget = 45 + level * 15 + intBetween(rng, 0, 9)
  return {
    stallName: stall.name,
    goods: shuffleWith(rng, goods),
    budget,
    targetItems: 3,
  }
}

// 14. ORCHID PAIRS BOARD
export interface PairsBoard {
  cards: { v: string; i: number }[]
  pairCount: number
  themeName: string
}

const PAIRS_THEMES = [
  { name: 'Native Orchids & Flowers', items: ['🌺', '🌸', '🌼', '🌷', '🌻', '🌹'] },
  { name: 'Bazaar Fruits', items: ['🍅', '🍌', '🥔', '🍊', '🍆', '🥬'] },
  { name: 'Traditional Instruments', items: ['🪘', '🪈', '🥁', '🔔', '📯'] },
  { name: 'Courtyard Light & Lamps', items: ['🏮', '🪔', '🎊', '🎁', '🕯️'] },
  { name: 'Friends of Kaziranga', items: ['🦏', '🐘', '🦌', '🐅', '🦚'] },
]

export function genPairsBoard(rng: Rng, level: number): PairsBoard {
  const theme = pick(rng, PAIRS_THEMES)
  const pairCount = Math.min(theme.items.length, 2 + Math.floor(level / 1.5))
  const chosen = pickN(rng, theme.items, pairCount)
  const deck = shuffleWith(rng, [...chosen, ...chosen])
  return { cards: deck.map((v, i) => ({ v, i })), pairCount, themeName: theme.name }
}

// 15. SPOT THE DIFFERENCE
export interface SpotBoard {
  cellsA: string[]
  cellsB: string[]
  changedIdx: number
  cols: number
  sceneName: string
}

const SPOT_SCENES: { name: string; fillers: string[]; swaps: Record<string, string[]> }[] = [
  {
    name: 'Tea Estate Morning',
    fillers: ['🍃', '🌳', '🌾', '🧺', '👩‍🌾', '☁️'],
    swaps: {
      '🍃': ['🌿', '🌱'],
      '🌳': ['🌲', '🌴'],
      '🌾': ['🌿', '🍃'],
      '🧺': ['🏺', '🪣'],
      '👩‍🌾': ['🧑‍🌾', '👨‍🌾'],
      '☁️': ['🌤️', '🌥️'],
    },
  },
  {
    name: 'Bihu Courtyard Festival',
    fillers: ['🏮', '🪘', '🌴', '🪔', '🏡', '🌟'],
    swaps: {
      '🏮': ['🎊', '🎀'],
      '🪘': ['🥁', '🔔'],
      '🌴': ['🌳', '🌲'],
      '🪔': ['🕯️', '🔆'],
      '🏡': ['🏘️', '⛺'],
      '🌟': ['✨', '💫'],
    },
  },
  {
    name: 'Brahmaputra River Landing',
    fillers: ['🛶', '🐟', '🌊', '🪷', '🐦', '⛵'],
    swaps: {
      '🛶': ['⛵', '🚣'],
      '🐟': ['🐠', '🦐'],
      '🌊': ['💦', '🏞️'],
      '🪷': ['🌸', '🌼'],
      '🐦': ['🦆', '🦜'],
      '⛵': ['🛶', '🚤'],
    },
  },
]

export function genSpotBoard(rng: Rng, level: number): SpotBoard {
  const scene = pick(rng, SPOT_SCENES)
  const size = level >= 3 ? 12 : level >= 1 ? 9 : 6
  const cellsA: string[] = []
  for (let i = 0; i < size; i++) cellsA.push(pick(rng, scene.fillers))
  const changedIdx = intBetween(rng, 0, size - 1)
  const swaps = scene.swaps[cellsA[changedIdx]] ?? Object.values(scene.swaps)[0]
  const cellsB = [...cellsA]
  cellsB[changedIdx] = pick(rng, swaps)
  return { cellsA, cellsB, changedIdx, cols: size >= 12 ? 4 : 3, sceneName: scene.name }
}

// 16. NUMBER BRIDGE
export interface BridgePath {
  numbers: { n: number; pos: number }[]
  total: number
}

export function genBridgePath(rng: Rng, level: number): BridgePath {
  const total = Math.min(8, 4 + level)
  const nums = Array.from({ length: total }, (_, i) => i + 1)
  const order = shuffleWith(rng, nums)
  return { numbers: order.map((n, pos) => ({ n, pos })), total }
}

// 17. WORD HARVEST
export interface WordRound {
  prompt: string
  correct: { emoji: string; label: string }[]
  wrong: { emoji: string; label: string }[]
  options: { emoji: string; label: string }[]
}

const WORD_CATEGORIES = [
  {
    prompt: 'Tap everything found at the Bihu festival',
    correct: [
      { emoji: '🪘', label: 'Dhol drum' },
      { emoji: '📯', label: 'Pepa horn' },
      { emoji: '🏮', label: 'Festival lamps' },
      { emoji: '🎊', label: 'Celebration' },
    ],
    wrong: [
      { emoji: '⛄', label: 'Snowman' },
      { emoji: '🛁', label: 'Bathtub' },
    ],
  },
  {
    prompt: 'Tap everything found in the tea garden',
    correct: [
      { emoji: '🍃', label: 'Tea leaves' },
      { emoji: '🧺', label: 'Wicker basket' },
      { emoji: '👩‍🌾', label: 'Tea plucker' },
    ],
    wrong: [
      { emoji: '🐟', label: 'Fish' },
      { emoji: '📺', label: 'Television' },
    ],
  },
  {
    prompt: 'Tap everything used for cooking meals',
    correct: [
      { emoji: '🍲', label: 'Cooking pot' },
      { emoji: '🥄', label: 'Spoon' },
      { emoji: '🍽️', label: 'Thali plate' },
    ],
    wrong: [
      { emoji: '🦏', label: 'Rhino' },
      { emoji: '☂️', label: 'Umbrella' },
    ],
  },
]

export function genWordRound(rng: Rng, level: number): WordRound {
  const cat = pick(rng, WORD_CATEGORIES)
  const correct = pickN(rng, cat.correct, Math.min(cat.correct.length, level >= 2 ? 3 : 2))
  const wrong = pickN(rng, cat.wrong, level >= 2 ? 2 : 1)
  return { prompt: cat.prompt, correct, wrong, options: shuffleWith(rng, [...correct, ...wrong]) }
}
