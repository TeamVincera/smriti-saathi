import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../state'
import { navigate } from '../router'
import { gameById } from '../lib/games'
import { recordSessionResult } from '../lib/ai'
import { loadConfig } from '../lib/db'
import { computeFrustrationIndex } from '../lib/sathi'
import { playSoftCue, playChime, unlockAudio } from '../lib/audio'
import { speak } from '../lib/speech'
import { SpeakerButton } from '../components/SpeakerButton'
import { Icon } from '../components/Icons'

import { FacesOfHome } from './FacesOfHome'
import { MorningMelodies } from './MorningMelodies'
import { TeaGardenWalk } from './TeaGardenWalk'
import { DailyLifeSequence } from './DailyLifeSequence'
import { WeaversLoom } from './WeaversLoom'
import { BambooCrafting } from './BambooCrafting'
import { CherawSteps } from './CherawSteps'
import { WildlifeSafari } from './WildlifeSafari'
import { FestivalTales } from './FestivalTales'
import { MarketDay } from './MarketDay'
import { MemoryGardenGame } from './MemoryGardenGame'

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
  teawalk: TeaGardenWalk,
  sequence: DailyLifeSequence,
  loom: WeaversLoom,
  bamboo: BambooCrafting,
  cheraw: CherawSteps,
  safari: WildlifeSafari,
  tales: FestivalTales,
  market: MarketDay,
  garden: MemoryGardenGame,
}

export function GameScreen() {
  const { t, lang, addGardenPoints, profile, refreshSessions, sessionsToday } = useApp()
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
  const [overCap, setOverCap] = useState(false)
  const lastActionTs = useRef(Date.now())
  const tapTimes = useRef<number[]>([])
  const explorationRef = useRef(false)
  const outcomeRef = useRef<GameOutcome | null>(null)

  useEffect(() => {
    void loadConfig().then((c) => setOverCap(sessionsToday >= c.maxSessionsPerDay))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    unlockAudio()
    try {
      const raw = sessionStorage.getItem('ss_exploration')
      explorationRef.current = raw === '1'
    } catch {}
    if (game) {
      const intro = t(game.instructionKey)
      const timer = setTimeout(() => void speak(intro, lang), 350)
      return () => clearTimeout(timer)
    }
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
    return () => clearInterval(iv)
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
      const avgLatency = actions.length ? (duration / actions.length) : 5000
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
        await addGardenPoints(3, 'session')
        await refreshSessions()
      } catch (err) {
        console.error('Failed to save session', err)
      }
      setFinished({ outcome, reward })
      const wellDone = t('praise_title')
      await speak(wellDone, lang)
    },
    [actions, cueCount, gameId, difficulty, addGardenPoints, refreshSessions, t, lang]
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

  if (overCap) {
    return (
      <div className="page center-col">
        <span style={{ fontSize: 64 }}>🌺</span>
        <p className="lead" style={{ textAlign: 'center', maxWidth: 480 }}>{t('rest_now')}</p>
        <button className="btn btn-primary btn-big" onClick={() => navigate('/')}>{t('nav_home')}</button>
      </div>
    )
  }

  const instruction = t(game.instructionKey)
  const GameComponent = GAME_COMPONENTS[gameId]

  return (
    <div className="page page-full" onPointerDown={onTap} style={{ paddingInline: 'max(var(--s-md), env(safe-area-inset-left))' }}>
      <div className="instruction-bar" style={{ borderRadius: 0 }}>
        <button className="icon-btn" aria-label={t('back')} onClick={() => navigate('/')}>
          <Icon name="back" />
        </button>
        <p>{instruction}</p>
        <SpeakerButton text={instruction} lang={lang} />
      </div>

      <div className={`board-wrap mt-lg ${glow ? 'cue-target' : ''}`} style={{ minHeight: '60vh', justifyContent: 'center' }}>
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
          lang={lang}
          patientName={profile?.patient.name ?? ''}
        />
      )}
    </div>
  )
}

function PraiseCeremony({
  gameName, reward, accuracy, t, lang, patientName,
}: {
  gameName: string
  reward: number
  accuracy: number
  t: (k: string, v?: Record<string, string | number>) => string
  lang: string
  patientName: string
}) {
  const didWell = useMemo(
    () => (accuracy >= 0.7 ? `You remembered so much today.` : `You kept going beautifully.`),
    [accuracy]
  )
  const practice = accuracy >= 0.9 ? `Next time we will try a slightly bigger challenge.` : `We will keep practising gently at your pace.`
  const nextLine = reward >= 0.5 ? `Tomorrow we will sing with the dhol again!` : `Tomorrow we will listen to a story together.`

  useEffect(() => {
    const script = `${didWell} ${practice} ${nextLine}`
    const timer = setTimeout(() => void speak(script, lang as never), 900)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="praise-overlay" role="dialog" aria-label={t('praise_title')}>
      <div className="praise-stars">🌟🌺🌟</div>
      <h2 className="display-lg" style={{ color: '#fff' }}>{t('praise_title')}</h2>
      <p className="lead" style={{ color: '#ccc', maxWidth: 560 }}>{t('praise_body')}</p>
      <p className="lead" style={{ color: '#fff' }}>{didWell}</p>
      <div className="row" style={{ gap: 'var(--s-md)', marginTop: 'var(--s-lg)' }}>
        <button className="btn btn-primary btn-big" onClick={() => navigate('/')}>
          {t('nav_home')}
        </button>
        <SpeakerButton text={`${didWell} ${practice} ${nextLine}`} lang={lang} dark />
      </div>
      <p className="caption" style={{ color: '#aaa', marginTop: 'var(--s-xl)' }}>
        {patientName} · {gameName}
      </p>
    </div>
  )
}
