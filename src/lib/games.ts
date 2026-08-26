export type Phase = 1 | 2 | 3

export interface GameDef {
  id: string
  name: string
  nameHi?: string
  phase: Phase
  domain: string
  cultural: string
  principle: string
  glyph: string
  instructionKey: string
  minDifficulty: number
}

export const GAMES: GameDef[] = [
  {
    id: 'faces', name: 'Faces of Home', nameHi: 'घर के चेहरे', phase: 1,
    domain: 'Episodic memory & recognition', cultural: 'Family photos & ASHA profiles',
    principle: 'Spaced Retrieval Therapy', glyph: '👪',
    instructionKey: 'g_faces_intro', minDifficulty: 0,
  },
  {
    id: 'melodies', name: 'Morning Melodies', nameHi: 'सुबह की धुनें', phase: 1,
    domain: 'Auditory memory & attention', cultural: 'Bihu dhol, Wangala, Mising flute',
    principle: 'Errorless Learning', glyph: '🪘',
    instructionKey: 'g_melodies_intro', minDifficulty: 0,
  },
  {
    id: 'teawalk', name: 'Tea Garden Walk', nameHi: 'चाय बागान की सैर', phase: 1,
    domain: 'Visuospatial navigation', cultural: 'Assam tea estates',
    principle: 'Cognitive Stimulation — trace & collect', glyph: '🍃',
    instructionKey: 'g_teawalk_intro', minDifficulty: 0,
  },
  {
    id: 'sequence', name: 'Daily Life Sequence', nameHi: 'रोज़मर्रा का क्रम', phase: 1,
    domain: 'Executive function (sequencing)', cultural: 'Tamol & tea preparation steps',
    principle: 'Errorless Learning — items snap to correct slot', glyph: '🫖',
    instructionKey: 'g_sequence_intro', minDifficulty: 0,
  },
  {
    id: 'loom', name: "Weaver's Loom", nameHi: 'बुनकर की खड़िया', phase: 2,
    domain: 'Pattern recognition', cultural: 'Gamosa, Naga shawl, Mizo Puan motifs',
    principle: 'Cognitive Stimulation — find missing segment', glyph: '🧶',
    instructionKey: 'g_loom_intro', minDifficulty: 0,
  },
  {
    id: 'bamboo', name: 'Bamboo Crafting', nameHi: 'बांस का काम', phase: 2,
    domain: 'Object recognition & sorting', cultural: 'Baskets & sieves of the hills',
    principle: 'Errorless Learning — guided highlighting', glyph: '🧺',
    instructionKey: 'g_bamboo_intro', minDifficulty: 0,
  },
  {
    id: 'cheraw', name: 'Cheraw Steps', nameHi: 'छेराव के कदम', phase: 2,
    domain: 'Rhythmic attention & timing', cultural: 'Mizo Cheraw bamboo dance',
    principle: 'Sustained attention — tap with rhythm', glyph: '🥢',
    instructionKey: 'g_cheraw_intro', minDifficulty: 0,
  },
  {
    id: 'safari', name: 'Wildlife Safari', nameHi: 'वन्यजीव सैर', phase: 2,
    domain: 'Visual search & concentration', cultural: 'Rhino, Mithun, Hornbill',
    principle: 'Visual discrimination in forest scenes', glyph: '🦏',
    instructionKey: 'g_safari_intro', minDifficulty: 0,
  },
  {
    id: 'tales', name: 'Festival Tales', nameHi: 'त्योहारों की कहानियाँ', phase: 3,
    domain: 'Verbal memory & reminiscence', cultural: 'Bodo/Khasi/Garo/Bhutia folklore',
    principle: 'Reminiscence — no right or wrong', glyph: '🏮',
    instructionKey: 'g_tales_intro', minDifficulty: 0,
  },
  {
    id: 'market', name: 'Market Day', nameHi: 'बाज़ार का दिन', phase: 3,
    domain: 'Calculation & working memory', cultural: 'Virtual local bazaar',
    principle: 'Executive function — anxiety-free budgeting', glyph: '🛒',
    instructionKey: 'g_market_intro', minDifficulty: 0,
  },
  {
    id: 'garden', name: 'Memory Garden', nameHi: 'स्मृति उद्यान', phase: 3,
    domain: 'Emotional regulation', cultural: 'Native orchid garden',
    principle: 'Positive reinforcement loop', glyph: '🌺',
    instructionKey: 'g_garden_intro', minDifficulty: 0,
  },
]

export const gameById = (id: string): GameDef | undefined => GAMES.find((g) => g.id === id)

export const PHASE_UNLOCK_SESSIONS: Record<Phase, number> = { 1: 0, 2: 6, 3: 12 }

export function unlockedGames(completedSessions: number): GameDef[] {
  return GAMES.filter((g) => completedSessions >= PHASE_UNLOCK_SESSIONS[g.phase])
}
