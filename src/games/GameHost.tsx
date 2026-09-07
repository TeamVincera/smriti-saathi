import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../state'
import { navigate } from '../router'
import { gameById } from '../lib/games'
import { recordSessionResult } from '../lib/ai'
import { loadConfig } from '../lib/db'
import { computeFrustrationIndex } from '../lib/sathi'
import { ensureAbilities } from '../lib/adaptive'
import { playSoftCue, playChime, unlockAudio, stopAllAudio } from '../lib/audio'
import { VoiceService } from '../lib/voice'
import { Icon } from '../components/Icons'

import { FacesOfHome } from './FacesOfHome'
import { MorningMelodies } from './MorningMelodies'
import { FamiliarObjects } from './FamiliarObjects'
import { MemoryTray } from './MemoryTray'
import { DailyLifeSequence } from './DailyLifeSequence'
import { TraditionalFoods } from './TraditionalFoods'
import { VillageSounds } from './VillageSounds'
import { LandmarkRecognition } from './LandmarkRecognition'
import { WeaversLoom } from './WeaversLoom'
import { PictureMemory } from './PictureMemory'
import { BambooCrafting } from './BambooCrafting'
import { FamiliarPhrases } from './FamiliarPhrases'
import { TeaGardenWalk } from './TeaGardenWalk'
import { CherawSteps } from './CherawSteps'
import { WildlifeSafari } from './WildlifeSafari'
import { FestivalTales } from './FestivalTales'
import { MarketDay } from './MarketDay'
import { MemoryGardenGame } from './MemoryGardenGame'
import { OrchidPairs } from './OrchidPairs'
import { OddOneOut } from './OddOneOut'
import { SpotDifference } from './SpotDifference'
import { NumberBridge } from './NumberBridge'
import { WordHarvest } from './WordHarvest'

export interface GameOutcome {
  itemsTotal: number
  itemsUnprompted: number
  completion: number
}

export interface GameProps {
  difficulty: number
  logAction: (kind: 'unprompted' | 'cued') => void
  complete: (outcome: GameOutcome) => void
}

const GAME_COMPONENTS: Record<string, (p: GameProps) => JSX.Element | null> = {
  faces: FacesOfHome,
  melodies: MorningMelodies,
  objects: FamiliarObjects,
  tray: MemoryTray,
  sequence: DailyLifeSequence,
  foods: TraditionalFoods,
  sounds: VillageSounds,
  places: LandmarkRecognition,
  loom: WeaversLoom,
  picture: PictureMemory,
  bamboo: BambooCrafting,
  phrases: FamiliarPhrases,
  teawalk: TeaGardenWalk,
  cheraw: CherawSteps,
  safari: WildlifeSafari,
  tales: FestivalTales,
  market: MarketDay,
  garden: MemoryGardenGame,
  pairs: OrchidPairs,
  oddone: OddOneOut,
  spot: SpotDifference,
  bridge: NumberBridge,
  word: WordHarvest,
}

export function GameScreen() {
  const { t, profile, refreshSessions, sessionsToday, dailyGameLimit, lang } = useApp()
  const [, gameIdRaw] = window.location.hash.replace(/^#/, '').split('?')[0].split('/game/')
  const gameId = decodeURIComponent(gameIdRaw ?? '')
  const query = new URLSearchParams(window.location.hash.split('?')[1] ?? '')
  const difficulty = parseInt(query.get('d') ?? '0', 10) || 0

  const game = gameById(gameId)
  const startedAt = useRef(Date.now())
  const [actions, setActions] = useState<{ kind: string; latency: number }[]>([])
  const [cueCount, setCueCount] = useState(0)
  const [finished, setFinished] = useState<null | { outcome: GameOutcome; reward: number }>(null)
  const [glow, setGlow] = useState(false)
  const lastActionTs = useRef(Date.now())
  const tapTimes = useRef<number[]>([])
  const explorationRef = useRef(false)
  const outcomeRef = useRef<GameOutcome | null>(null)

  const isOverCap = sessionsToday >= dailyGameLimit

  useEffect(() => {
    void ensureAbilities()
    return () => {
      stopAllAudio()
    }
  }, [])

  useEffect(() => {
    unlockAudio()
    try {
      const raw = sessionStorage.getItem('ss_exploration')
      explorationRef.current = raw === '1'
    } catch {}
  }, [gameId])

  useEffect(() => {
    if (finished) return
    const iv = setInterval(() => {
      if (Date.now() - lastActionTs.current > 4000) {
        playSoftCue()
        setGlow(true)
        setCueCount((c) => c + 1)
        lastActionTs.current = Date.now()
        setTimeout(() => setGlow(false), 1600)
      }
    }, 1200)
    return () => {
      clearInterval(iv)
      stopAllAudio()
    }
  }, [finished])

  const logAction = useCallback((kind: 'unprompted' | 'cued') => {
    const latency = Date.now() - lastActionTs.current
    lastActionTs.current = Date.now()
    setActions((a) => [...a, { kind, latency }])
    playChime()
  }, [])

  const complete = useCallback(
    async (outcome: GameOutcome) => {
      outcomeRef.current = outcome
      const duration = Date.now() - startedAt.current
      const avgLatency = actions.length ? duration / actions.length : 5000
      const fi = computeFrustrationIndex(tapTimes.current, cueCount, Math.max(actions.length, 1), duration)
      const accuracy = outcome.itemsTotal > 0 ? outcome.itemsUnprompted / outcome.itemsTotal : 0
      let reward = 0
      try {
        const rec = await recordSessionResult({
          gameId,
          difficulty,
          startedAt: startedAt.current,
          completion: outcome.completion,
          accuracy,
          avgLatencyMs: avgLatency,
          hesitations: cueCount,
          cuesUsed: cueCount,
          frustrationIndex: fi,
          exploration: explorationRef.current,
        })
        reward = rec.reward
        await refreshSessions()
      } catch (err) {
        console.error('Failed to save session', err)
      }
      setFinished({ outcome, reward })
    },
    [actions, cueCount, gameId, difficulty, refreshSessions]
  )

  const onTap = useCallback(() => {
    tapTimes.current.push(Date.now())
  }, [])

  if (!game) {
    return (
      <div className="page center-col">
        <p className="lead">Game not found.</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>{t('nav_home')}</button>
      </div>
    )
  }

  if (isOverCap) {
    return (
      <div className="page center-col" style={{ textAlign: 'center', padding: 'var(--s-xl)' }}>
        <span style={{ fontSize: 64, marginBottom: 16 }}>🌺</span>
        <h2 className="display-md" style={{ color: 'var(--ink)', marginBottom: 8 }}>
          {lang === 'hi'
            ? 'आज के खेलों की सीमा पूरी हो गई है।'
            : 'Today’s game limit has been reached.'}
        </h2>
        <p className="lead" style={{ textAlign: 'center', maxWidth: 480, color: 'var(--ink-muted)', marginBottom: 24 }}>
          {lang === 'hi'
            ? 'कृपया कल फिर आइए और नए खेलों का आनंद लीजिए।'
            : 'Please come back tomorrow.'}
        </p>
        <button className="btn btn-primary btn-big" onClick={() => navigate('/')}>{t('nav_home')}</button>
      </div>
    )
  }

  const instruction = t(game.instructionKey)
  const GameComponent = GAME_COMPONENTS[gameId]

  const speakInstruction = useCallback(() => {
    if (!instruction) return
    void VoiceService.speak(instruction, { language: lang })
  }, [instruction, lang])

  useEffect(() => {
    speakInstruction()
  }, [speakInstruction])

  return (
    <div className="page page-full" onPointerDown={onTap}>
      <div className="instruction-bar row-between" style={{ borderRadius: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-sm)', flex: 1, minWidth: 0 }}>
          <button className="icon-btn" aria-label={t('back')} onClick={() => {
            stopAllAudio()
            navigate('/')
          }}>
            <Icon name="back" />
          </button>
          <h2 style={{ fontFamily: 'var(--font-display)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 700, fontSize: 18, color: 'var(--ink)' }}>
            {game ? (lang === 'hi' && game.nameHi ? game.nameHi : game.name) : instruction}
          </h2>
        </div>

        {/* Speak Instruction Button */}
        <button
          type="button"
          className="icon-btn"
          aria-label={t('listen')}
          onClick={speakInstruction}
          style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <Icon name="volume" size={22} color="var(--primary)" />
        </button>
      </div>

      <div
        className={`board-wrap mt-lg ${glow ? 'cue-target' : ''}`}
        style={{
          minHeight: '60vh',
          justifyContent: 'center',
          maxWidth: 'var(--max-w)',
          margin: '0 auto',
          paddingInline: 'max(var(--s-lg), var(--safe-left))',
          boxSizing: 'border-box',
        }}
      >
        {GameComponent && (
          <GameComponent
            difficulty={difficulty}
            logAction={logAction}
            complete={(o) => void complete(o)}
          />
        )}
      </div>

      {finished && (
        <PraiseCeremony
          gameName={profile?.language === 'hi' && game.nameHi ? game.nameHi : game.name}
          reward={finished.reward}
          accuracy={finished.outcome.itemsTotal > 0 ? finished.outcome.itemsUnprompted / finished.outcome.itemsTotal : 1}
          t={t}
          patientName={profile?.patient.name ?? ''}
        />
      )}
    </div>
  )
}

function PraiseCeremony({
  gameName,
  reward,
  accuracy,
  t,
  patientName,
}: {
  gameName: string
  reward: number
  accuracy: number
  t: (k: string, v?: Record<string, string | number>) => string
  patientName: string
}) {
  const { lang } = useApp()
  const didWell = useMemo(() => {
    if (lang === 'hi') {
      return accuracy >= 0.7 ? 'आपने बहुत अच्छे से याद रखा। बहुत खूब!' : 'आपने बहुत सुंदर प्रयास किया।'
    } else if (lang === 'as') {
      return accuracy >= 0.7 ? 'আপুনি বহুত সুন্দৰকৈ মনত ৰাখিলে।' : 'আপুনি বহুত ভাল প্ৰচেষ্টা কৰিলে।'
    }
    return accuracy >= 0.7 ? 'You remembered so much today. Well done!' : 'You kept going beautifully.'
  }, [accuracy, lang])

  useEffect(() => {
    const praiseText = `${t('praise_title')}. ${didWell}`
    void VoiceService.speak(praiseText, { language: lang })
    return () => {
      VoiceService.stop()
    }
  }, [didWell, lang, t])

  return (
    <div className="praise-overlay" role="dialog" aria-label={t('praise_title')}>
      <div className="praise-stars">🌟🌺🌟</div>
      <h2 className="display-lg" style={{ color: '#fff' }}>{t('praise_title')}</h2>
      <p className="lead" style={{ color: 'var(--ink-muted)', maxWidth: 560 }}>{t('praise_body')}</p>
      <p className="lead" style={{ color: '#fff' }}>{didWell}</p>
      <div className="row" style={{ gap: 'var(--s-md)', marginTop: 'var(--s-lg)' }}>
        <button
          className="btn btn-primary btn-big"          onClick={() => {
            stopAllAudio()
            navigate('/')
          }}>
          {t('nav_home')}
        </button>
      </div>
      <p className="caption" style={{ color: 'var(--ink-muted)', marginTop: 'var(--s-xl)' }}>
        {patientName} · {gameName}
      </p>
    </div>
  )
}
