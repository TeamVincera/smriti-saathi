import type { CognitiveDomain, DifficultyLevel, QuestionMetadata } from './types'
import { INSTRUMENT_BANK } from '../questionBanks/instruments'
import { FAMILIAR_OBJECTS_BANK } from '../questionBanks/familiarObjects'
import { SEQUENCE_BANK } from '../questionBanks/dailySequences'
import { MEMORY_TRAY_BANK } from '../questionBanks/memoryTray'
import { TRADITIONAL_FOODS_BANK } from '../questionBanks/traditionalFoods'
import { LANDMARKS_BANK } from '../questionBanks/northeastPlaces'
import { PICTURE_MEMORY_BANK } from '../questionBanks/pictureMemory'
import { VILLAGE_SOUNDS_BANK } from '../questionBanks/villageSounds'
import { FAMILIAR_PHRASES_BANK } from '../questionBanks/familiarPhrases'

/**
 * Question Repository
 * Indexes all cognitive activities with difficulty ratings (1 to 5),
 * cognitive domains, and North-East regional relevance scores (0.0 to 1.0).
 */
class QuestionRepositoryClass {
  private questions: QuestionMetadata[] = []
  private indexed = false

  constructor() {
    this.buildCatalog()
  }

  private buildCatalog(): void {
    if (this.indexed) return
    const list: QuestionMetadata[] = []

    // 1. Musical Instruments (Auditory Recognition & Cultural Reminiscence)
    INSTRUMENT_BANK.forEach((inst, idx) => {
      const isVeryCommon = ['dhol', 'flute', 'bell', 'harmonium', 'tabla'].includes(inst.id)
      const isModerate = ['tokari', 'gogona', 'khol', 'pung', 'khuang', 'dranyen'].includes(inst.id)
      const diff: DifficultyLevel = isVeryCommon ? 1 : isModerate ? 2 : idx % 2 === 0 ? 3 : 4

      list.push({
        questionId: `inst_${inst.id}`,
        gameId: 'melodies',
        category: 'Instruments',
        cognitiveDomain: 'auditory_recognition',
        difficulty: diff,
        language: 'en',
        regionalRelevance: inst.state === 'Classic' ? 0.6 : 0.95,
        estimatedTimeSec: 15,
        questionType: 'audio_id',
        prompt: `Identify the sound of ${inst.name}`,
        promptHi: `${inst.nameHi || inst.name} की ध्वनि पहचानें`,
        promptAs: `${inst.nameAs || inst.name}ৰ ধ্বনি চিনাক্ত কৰক`,
        options: [inst.id],
        correctAnswer: inst.id,
        media: { type: 'audio', src: inst.id, prompt: inst.name },
        culturalTags: [inst.state, inst.name, 'Music', 'Tradition'],
      })
    })

    // 2. Familiar Household & Cultural Objects (Recognition & Visual Recognition)
    FAMILIAR_OBJECTS_BANK.forEach((obj, idx) => {
      const diff: DifficultyLevel = idx < 6 ? 1 : idx < 12 ? 2 : idx < 18 ? 3 : 4
      list.push({
        questionId: `obj_${obj.id}`,
        gameId: 'objects',
        category: obj.category,
        cognitiveDomain: 'recognition',
        difficulty: diff,
        language: 'en',
        regionalRelevance: 0.9,
        estimatedTimeSec: 12,
        questionType: 'multiple_choice',
        prompt: obj.cueQuestion,
        promptHi: obj.cueQuestionHi,
        promptAs: obj.cueQuestionAs || obj.cueQuestion,
        options: [obj.id],
        correctAnswer: obj.id,
        media: { type: 'icon', src: obj.emoji || '🏺', prompt: obj.name },
        culturalTags: [obj.category, obj.name, 'Household', 'Culture'],
      })
    })

    // 3. Daily Life Sequences (Sequencing & Problem Solving)
    SEQUENCE_BANK.forEach((seq, idx) => {
      const diff: DifficultyLevel = (Math.min(5, Math.max(1, Math.floor(idx / 3) + 1))) as DifficultyLevel
      list.push({
        questionId: `seq_${idx}`,
        gameId: 'sequence',
        category: 'Daily Routine',
        cognitiveDomain: 'sequencing',
        difficulty: diff,
        language: 'en',
        regionalRelevance: 0.85,
        estimatedTimeSec: 25,
        questionType: 'sequence',
        prompt: `Arrange the steps for: ${seq.title}`,
        promptHi: `सही क्रम में लगाएं: ${seq.titleHi}`,
        options: seq.steps.map((s) => s.label),
        correctAnswer: seq.steps.map((s) => s.label),
        culturalTags: ['Routine', 'Sequence', 'Daily Living'],
      })
    })

    // 4. Memory Tray (Memory & Recall)
    MEMORY_TRAY_BANK.forEach((tray, idx) => {
      const itemCount = tray.items.length
      const diff: DifficultyLevel = (Math.min(5, Math.max(1, itemCount - 1))) as DifficultyLevel
      list.push({
        questionId: `tray_${idx}`,
        gameId: 'tray',
        category: 'Visual Recall',
        cognitiveDomain: 'memory',
        difficulty: diff,
        language: 'en',
        regionalRelevance: 0.9,
        estimatedTimeSec: 30,
        questionType: 'reminiscence',
        prompt: `Remember the items in the ${tray.themeName}: ${tray.items.map((i) => i.name).join(', ')}`,
        promptHi: `${tray.themeNameHi} की वस्तुएं याद रखें`,
        options: tray.items.map((i) => i.name),
        correctAnswer: tray.items.map((i) => i.name),
        culturalTags: [tray.themeName, 'Memory', 'Visual Recall'],
      })
    })

    // 5. Traditional Foods (Recognition & Recall)
    TRADITIONAL_FOODS_BANK.forEach((food, idx) => {
      const diff: DifficultyLevel = (Math.min(5, (idx % 4) + 1)) as DifficultyLevel
      list.push({
        questionId: `food_${food.id}`,
        gameId: 'foods',
        category: 'Culinary Traditions',
        cognitiveDomain: 'recall',
        difficulty: diff,
        language: 'en',
        regionalRelevance: 0.95,
        estimatedTimeSec: 15,
        questionType: 'multiple_choice',
        prompt: food.question,
        promptHi: food.questionHi,
        options: [food.name],
        correctAnswer: food.name,
        media: { type: 'icon', src: food.emoji || '🍲' },
        culturalTags: [food.state, food.name, 'Cuisine', 'Reminiscence'],
      })
    })

    // 6. Regional Landmarks & Geography (Visual Recognition & Attention)
    LANDMARKS_BANK.forEach((place, idx) => {
      const diff: DifficultyLevel = (Math.min(5, (idx % 5) + 1)) as DifficultyLevel
      list.push({
        questionId: `place_${place.id}`,
        gameId: 'places',
        category: 'Landmarks',
        cognitiveDomain: 'visual_recognition',
        difficulty: diff,
        language: 'en',
        regionalRelevance: 0.95,
        estimatedTimeSec: 20,
        questionType: 'multiple_choice',
        prompt: `Where is the famous landmark ${place.name} located?`,
        promptHi: `${place.name} कहाँ स्थित है?`,
        options: [place.state],
        correctAnswer: place.state,
        media: { type: 'icon', src: place.emoji || '🏞️' },
        culturalTags: [place.state, place.name, 'Geography', 'Landmarks'],
      })
    })

    // 7. Village & Nature Sounds (Auditory Recognition & Attention)
    VILLAGE_SOUNDS_BANK.forEach((snd, idx) => {
      const diff: DifficultyLevel = (Math.min(5, (idx % 3) + 1)) as DifficultyLevel
      list.push({
        questionId: `sound_${snd.id}`,
        gameId: 'sounds',
        category: 'Nature & Village',
        cognitiveDomain: 'attention',
        difficulty: diff,
        language: 'en',
        regionalRelevance: 0.85,
        estimatedTimeSec: 15,
        questionType: 'audio_id',
        prompt: `Listen and identify the sound of: ${snd.name}`,
        promptHi: `${snd.nameHi || snd.name} की आवाज पहचानें`,
        options: [snd.id],
        correctAnswer: snd.id,
        media: { type: 'audio', src: snd.id },
        culturalTags: ['Nature', 'Village', snd.name],
      })
    })

    // 8. Picture Memory Scenes (Memory & Attention)
    PICTURE_MEMORY_BANK.forEach((scene, idx) => {
      const diff: DifficultyLevel = (Math.min(5, (idx % 4) + 2)) as DifficultyLevel
      list.push({
        questionId: `pic_${scene.id}`,
        gameId: 'picture',
        category: 'Scene Memory',
        cognitiveDomain: 'memory',
        difficulty: diff,
        language: 'en',
        regionalRelevance: 0.9,
        estimatedTimeSec: 35,
        questionType: 'visual_search',
        prompt: `Observe the scene "${scene.title}" and recall details`,
        promptHi: `${scene.titleHi} दृश्य को ध्यान से देखें`,
        options: scene.questions?.map((q) => q.question) || [],
        correctAnswer: scene.questions?.[0]?.correctAnswer || '',
        culturalTags: [scene.title, 'Visual Memory', 'Scene Recall'],
      })
    })

    // 9. Familiar Phrases & Sayings (Recall & Problem Solving)
    FAMILIAR_PHRASES_BANK.forEach((phrase, idx) => {
      const diff: DifficultyLevel = (Math.min(5, (idx % 4) + 1)) as DifficultyLevel
      list.push({
        questionId: `phrase_${phrase.id}`,
        gameId: 'phrases',
        category: 'Proverbs & Sayings',
        cognitiveDomain: 'problem_solving',
        difficulty: diff,
        language: 'en',
        regionalRelevance: 0.95,
        estimatedTimeSec: 20,
        questionType: 'multiple_choice',
        prompt: phrase.prompt,
        promptHi: phrase.promptHi,
        options: [phrase.correctCompletion, ...phrase.distractors.map((d) => d.text)],
        correctAnswer: phrase.correctCompletion,
        culturalTags: [phrase.origin, 'Proverbs', 'Language'],
      })
    })

    this.questions = list
    this.indexed = true
  }

  public getAllQuestions(): QuestionMetadata[] {
    return [...this.questions]
  }

  public getQuestionById(id: string): QuestionMetadata | undefined {
    return this.questions.find((q) => q.questionId === id)
  }

  public getQuestionsByDomain(domain: CognitiveDomain): QuestionMetadata[] {
    return this.questions.filter((q) => q.cognitiveDomain === domain)
  }

  public getQuestionsByGame(gameId: string): QuestionMetadata[] {
    return this.questions.filter((q) => q.gameId === gameId)
  }

  public getQuestionsByDifficulty(diff: DifficultyLevel): QuestionMetadata[] {
    return this.questions.filter((q) => q.difficulty === diff)
  }

  public count(): number {
    return this.questions.length
  }
}

export const QuestionRepository = new QuestionRepositoryClass()
