import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../state'
import { navigate } from '../router'
import { gameById, localizedGameName } from '../lib/games'
import { recordSessionResult } from '../lib/ai'
import { loadConfig } from '../lib/db'
import { computeFrustrationIndex } from '../lib/sathi'
import { ensureAbilities } from '../lib/adaptive'
import { playSoftCue, playChime, unlockAudio, stopAllAudio } from '../lib/audio'
import { VoiceService } from '../lib/voice'
import { deriveSessionCoach, type SessionCoachResult } from '../lib/sessionCoach'
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
  const [finished, setFinished] = useState<null | { outcome: GameOutcome; reward: number; coach: SessionCoachResult }>(null)
  const [glow, setGlow] = useState(false)
  const lastActionTs = useRef(Date.now())
  const tapTimes = useRef<number[]>([])
  const explorationRef = useRef(false)
  const outcomeRef = useRef<GameOutcome | null>(null)
  const mountedRef = useRef(true)
  const completionStartedRef = useRef(false)
  const cueTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())

  const isOverCap = sessionsToday >= dailyGameLimit

  useEffect(() => {
    // App keeps GameScreen mounted while switching between game hash routes.
    // Start each game with a fresh completion gate and session metrics.
    completionStartedRef.current = false
    outcomeRef.current = null
    startedAt.current = Date.now()
    lastActionTs.current = Date.now()
    tapTimes.current = []
    setActions([])
    setCueCount(0)
    setFinished(null)
  }, [gameId])

  useEffect(() => {
    mountedRef.current = true
    void ensureAbilities()
    return () => {
      mountedRef.current = false
      for (const timer of cueTimersRef.current) clearTimeout(timer)
      cueTimersRef.current.clear()
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
        const glowTimer = setTimeout(() => {
          cueTimersRef.current.delete(glowTimer)
          if (mountedRef.current) setGlow(false)
        }, 1600)
        cueTimersRef.current.add(glowTimer)
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
      if (!mountedRef.current || completionStartedRef.current) return
      const currentRoute = window.location.hash.replace(/^#/, '').split('?')[0].split('/game/')[1]
      if (currentRoute === undefined || decodeURIComponent(currentRoute) !== gameId) return
      completionStartedRef.current = true
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
        if (mountedRef.current) await refreshSessions()
      } catch (err) {
        console.error('Failed to save session', err)
      }
      if (!mountedRef.current) return
      const routeAfterSave = window.location.hash.replace(/^#/, '').split('?')[0].split('/game/')[1]
      if (routeAfterSave === undefined || decodeURIComponent(routeAfterSave) !== gameId) return
      const coach = deriveSessionCoach({
        completion: outcome.completion,
        accuracy,
        attempts: actions.length,
        durationMs: duration,
        cueCount,
      })
      setFinished({ outcome, reward, coach })
    },
    [actions, cueCount, gameId, difficulty, refreshSessions]
  )

  const onTap = useCallback(() => {
    tapTimes.current.push(Date.now())
  }, [])

  if (!game) {
    return (
      <div className="page center-col">
        <p className="lead">{t('game_not_found')}</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>{t('nav_home')}</button>
      </div>
    )
  }

  if (isOverCap) {
    return (
      <div className="page center-col" style={{ textAlign: 'center', padding: 'var(--s-xl)' }}>
        <span style={{ fontSize: 64, marginBottom: 16 }}>🌺</span>
        <h2 className="display-md" style={{ color: 'var(--ink)', marginBottom: 8 }}>
          {t('game_daily_limit_title')}
        </h2>
        <p className="lead" style={{ textAlign: 'center', maxWidth: 480, color: 'var(--ink-muted)', marginBottom: 24 }}>
          {t('game_daily_limit_body')}
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
          }} style={{ flexShrink: 0 }}>
            <Icon name="back" />
          </button>
          <h2 style={{
            flex: '1 1 auto',
            minWidth: 0,
            fontFamily: 'var(--font-display)',
            margin: 0,
            fontWeight: 700,
            fontSize: 18,
            lineHeight: 1.2,
            color: 'var(--ink)',
            whiteSpace: 'normal',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
          }}>
            {game ? localizedGameName(game, lang) : instruction}
          </h2>
        </div>

        {/* Speak Instruction Button */}
        <button
          type="button"
          className="icon-btn"
          aria-label={t('listen')}
          onClick={speakInstruction}
          style={{ cursor: 'pointer', flexShrink: 0 }}
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
          gameName={localizedGameName(game, lang)}
          reward={finished.reward}
          accuracy={finished.outcome.itemsTotal > 0 ? finished.outcome.itemsUnprompted / finished.outcome.itemsTotal : 1}
          coach={finished.coach}
          t={t}
          patientName={profile?.patient.name ?? ''}
        />
      )}
    </div>
  )
}

export function PraiseCeremony({
  gameName,
  reward,
  accuracy,
  coach,
  t,
  patientName,
}: {
  gameName: string
  reward: number
  accuracy: number
  coach?: SessionCoachResult
  t: (k: string, v?: Record<string, string | number>) => string
  patientName: string
}) {
  const { lang } = useApp()
  const sessionCoach = coach ?? deriveSessionCoach({ completion: 1, accuracy, attempts: 1 })
  const dialogRef = useRef<HTMLDivElement>(null)
  const homeButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const navigatingHomeRef = useRef(false)
  const didWell = useMemo(
    () => t(accuracy >= 0.7 ? 'game_praise_good' : 'game_praise_trying'),
    [accuracy, t]
  )

  useEffect(() => {
    const praiseText = `${t('praise_title')}. ${didWell}`
    void VoiceService.speak(praiseText, { language: lang })
    return () => {
      VoiceService.stop()
    }
  }, [didWell, lang, t])

  useEffect(() => {
    if (typeof document === 'undefined') return

    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    homeButtonRef.current?.focus({ preventScroll: true })

    const handleDialogKeyDown = (event: KeyboardEvent) => {
      const dialog = dialogRef.current
      if (!dialog) return

      // Completion is already recorded by the time this praise ceremony is
      // shown. Keep Escape from dismissing the ceremony and obscuring that
      // completed state; move focus to the safe next action instead.
      if (event.key === 'Escape') {
        event.preventDefault()
        homeButtonRef.current?.focus({ preventScroll: true })
        return
      }

      if (event.key !== 'Tab') return

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      ).filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true')

      if (focusable.length === 0) {
        event.preventDefault()
        dialog.focus({ preventScroll: true })
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const activeElement = document.activeElement
      const activeIsFocusable = activeElement instanceof HTMLElement && focusable.includes(activeElement)
      if (event.shiftKey && (!activeIsFocusable || activeElement === first)) {
        event.preventDefault()
        last.focus({ preventScroll: true })
      } else if (!event.shiftKey && (!activeIsFocusable || activeElement === last)) {
        event.preventDefault()
        first.focus({ preventScroll: true })
      }
    }

    document.addEventListener('keydown', handleDialogKeyDown)
    return () => {
      document.removeEventListener('keydown', handleDialogKeyDown)
      const previouslyFocused = previouslyFocusedRef.current
      if (!navigatingHomeRef.current && previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus({ preventScroll: true })
      }
    }
  }, [])

  return (
    <div
      ref={dialogRef}
      className="praise-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t('praise_title')}
      aria-labelledby="game-completion-title"
      aria-describedby="game-completion-description"
      tabIndex={-1}
    >
      <div className="praise-stars">🌟🌺🌟</div>
      <h2 id="game-completion-title" className="display-lg" style={{ color: '#fff' }}>{t('praise_title')}</h2>
      <p id="game-completion-description" className="lead" style={{ color: 'var(--ink-muted)', maxWidth: 560 }}>{t('praise_body')}</p>
      <p className="lead" style={{ color: '#fff' }}>{didWell}</p>
      <section
        className="session-coach-card"
        aria-labelledby="session-coach-title"
        style={{
          width: '100%',
          maxWidth: 560,
          boxSizing: 'border-box',
          padding: 'var(--s-md)',
          borderRadius: 'var(--r-md)',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          textAlign: 'left',
        }}
      >
        <h3 id="session-coach-title" style={{ color: '#fff', margin: 0, fontSize: 'var(--fs-subtitle)' }}>
          {t(`coach_${sessionCoach.action}_title`)}
        </h3>
        <p style={{ color: 'var(--ink-on-dark)', margin: 'var(--s-xs) 0 0', lineHeight: 1.5 }}>
          {t(`coach_${sessionCoach.action}_body`)}
        </p>
        <p className="caption" style={{ color: 'var(--ink-muted)', margin: 'var(--s-sm) 0 0' }}>
          {t('coach_privacy')}
        </p>
      </section>
      <div
        className="row"
        style={{
          width: '100%',
          maxWidth: 420,
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 'var(--s-sm)',
          marginTop: 'var(--s-lg)',
        }}
      >
        <button
          ref={homeButtonRef}
          className="btn btn-primary btn-big"
          style={{ width: '100%', minHeight: 56, overflowWrap: 'anywhere' }}
          onClick={() => {
            navigatingHomeRef.current = true
            stopAllAudio()
            navigate('/')
          }}>
          {t('nav_home')}
        </button>
        <button
          className="btn btn-pearl btn-big"
          style={{ width: '100%', minHeight: 56, overflowWrap: 'anywhere' }}
          onClick={() => {
            navigatingHomeRef.current = true
            stopAllAudio()
            navigate('/')
          }}
        >
          {t(`coach_${sessionCoach.action}_action`)}
        </button>
      </div>
      <p className="caption" style={{ color: 'var(--ink-muted)', marginTop: 'var(--s-xl)' }}>
        {patientName} · {gameName}
      </p>
    </div>
  )
}
