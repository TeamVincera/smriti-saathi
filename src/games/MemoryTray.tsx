import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameProps } from './GameHost'
import { RoundHeader } from './shared'
import { sessionRng } from '../lib/rng'
import { genMemoryTrayRound } from '../lib/content'
import { nextLevel, recordAnswer } from '../lib/adaptive'
import { playChime, playSoftCue } from '../lib/audio'
import { useApp } from '../state'
import type { TrayItem } from '../lib/questionBanks/memoryTray'

const TOTAL_ROUNDS = 4
const DOMAIN = 'working_memory'
const VIEW_DURATION_SEC = 10

export function MemoryTray({ difficulty, logAction, complete }: GameProps) {
  const { lang } = useApp()
  const rng = useRef(sessionRng('tray')).current
  const [roundIdx, setRoundIdx] = useState(0)
  const [level, setLevel] = useState(() => Math.max(difficulty, nextLevel(DOMAIN)))

  const round = useMemo(() => genMemoryTrayRound(rng, level), [rng, level, roundIdx])

  const [phase, setPhase] = useState<'viewing' | 'recall'>('viewing')
  const [timeLeft, setTimeLeft] = useState(VIEW_DURATION_SEC)
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [glowId, setGlowId] = useState<string | null>(null)
  const unprompted = useRef(0)

  // Countdown timer for viewing phase
  useEffect(() => {
    setPhase('viewing')
    setTimeLeft(VIEW_DURATION_SEC)

    const iv = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(iv)
          setPhase('recall')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(iv)
  }, [roundIdx, lang])

  function finishViewingEarly() {
    setTimeLeft(0)
    setPhase('recall')
  }

  function pick(item: TrayItem) {
    if (pickedId) return
    setPickedId(item.id)
    const isCorrect = item.id === round.missingItem.id
    recordAnswer(DOMAIN, level, isCorrect)

    if (isCorrect) {
      unprompted.current++
      logAction('unprompted')
      void playChime()
    } else {
      logAction('cued')
      setGlowId(round.missingItem.id)
      playSoftCue()
    }

    setTimeout(() => {
      setPickedId(null)
      setGlowId(null)
      if (roundIdx + 1 >= TOTAL_ROUNDS) {
        complete({ itemsTotal: TOTAL_ROUNDS, itemsUnprompted: unprompted.current, completion: 1 })
      } else {
        setLevel(nextLevel(DOMAIN))
        setRoundIdx((i) => i + 1)
      }
    }, 1600)
  }

  const themeTitle = lang === 'hi' ? round.scenario.themeNameHi : round.scenario.themeName

  return (
    <div className="center-col" style={{ width: '100%', maxWidth: 880, margin: '0 auto' }}>
      <RoundHeader now={roundIdx + 1} total={TOTAL_ROUNDS} unit="round" label={themeTitle} />

      {phase === 'viewing' ? (
        <div className="center-col enter-anim" style={{ width: '100%' }}>
          <div className="card card-dark row-between" style={{ width: '100%', padding: 'var(--s-md) var(--s-lg)', alignItems: 'center', marginBottom: 'var(--s-lg)' }}>
            <div>
              <span className="caption" style={{ color: 'var(--muga-gold-light)' }}>👀 Visual Memory Tray · Remember these items</span>
              <h2 className="display-md" style={{ color: '#fff', margin: '4px 0 0 0' }}>
                {lang === 'hi' ? 'थाली की चीज़ों को ध्यान से देखिए' : 'Observe everything on the tray'}
              </h2>
            </div>
            <button className="btn btn-primary" onClick={finishViewingEarly} style={{ minHeight: 48, padding: '0 18px', borderRadius: 'var(--r-pill)' }}>
              I have seen them (Ready)
            </button>
          </div>

          {/* Bamboo Woven Tray Display */}
          <div
            className="bamboo-tray-container"
            style={{
              width: '100%',
              minHeight: 260,
              borderRadius: 'var(--r-xl)',
              background: 'radial-gradient(ellipse at center, #F5EBDA 0%, #DEC29E 100%)',
              border: '6px solid #a67c48',
              boxShadow: 'inset 0 4px 14px rgba(70,40,10,0.18), 0 8px 24px rgba(70,40,10,0.12)',
              padding: 'var(--s-xl)',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 'var(--s-lg)',
            }}
          >
            {round.displayedItems.map((item) => {
              const label = lang === 'hi' && item.nameHi ? item.nameHi : item.name
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    background: '#fff',
                    padding: 'var(--s-md) var(--s-lg)',
                    borderRadius: 'var(--r-lg)',
                    boxShadow: 'var(--shadow-sm)',
                    border: '1.5px solid rgba(166,124,72,0.3)',
                    minWidth: 130,
                  }}
                >
                  <span style={{ fontSize: 68, lineHeight: 1.1 }}>{item.emoji}</span>
                  <strong style={{ fontSize: 'var(--fs-body)', color: 'var(--ink)', marginTop: 6 }}>{label}</strong>
                </div>
              )
            })}
          </div>

          {/* Progress timer bar */}
          <div style={{ width: '100%', maxWidth: 400, marginTop: 'var(--s-lg)', textAlign: 'center' }}>
            <span className="caption" style={{ color: 'var(--ink-muted-48)' }}>
              Hiding tray in {timeLeft} seconds…
            </span>
            <div style={{ width: '100%', height: 8, background: 'var(--parchment)', borderRadius: 4, overflow: 'hidden', marginTop: 6 }}>
              <div
                style={{
                  width: `${(timeLeft / VIEW_DURATION_SEC) * 100}%`,
                  height: '100%',
                  background: 'var(--primary)',
                  transition: 'width 1s linear',
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="center-col enter-anim" style={{ width: '100%' }}>
          <div className="card card-dark enter-anim" style={{ width: '100%', padding: 'var(--s-md) var(--s-lg)', marginBottom: 'var(--s-lg)' }}>
            <span className="caption" style={{ color: 'var(--muga-gold-light)' }}>❓ Memory Challenge</span>
            <h2 className="display-md" style={{ color: '#fff', margin: '4px 0 0 0' }}>
              {lang === 'hi' ? 'थाली में से कौन सी वस्तु यहाँ है?' : 'Which of these items was on the tray?'}
            </h2>
          </div>

          {/* Recall Choices Grid */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--s-md)', width: '100%' }}>
            {round.options.map((item) => {
              const isCorrect = item.id === round.missingItem.id
              const isSelected = pickedId === item.id
              const isGlow = glowId === item.id
              const label = lang === 'hi' && item.nameHi ? item.nameHi : item.name

              return (
                <button
                  key={item.id}
                  className={`choice-card-big ${isSelected ? (isCorrect ? 'correct' : 'wrong') : ''} ${isGlow ? 'glow' : ''}`}
                  onClick={() => pick(item)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    padding: 'var(--s-lg)',
                    borderRadius: 'var(--r-lg)',
                    background: isSelected ? (isCorrect ? 'var(--success-soft)' : 'var(--error-soft)') : 'var(--card)',
                    border: isSelected ? (isCorrect ? '3px solid var(--success)' : '3px solid var(--error)') : isGlow ? '3px solid var(--primary)' : '2px solid var(--border)',
                    boxShadow: 'var(--shadow-sm)',
                    minHeight: 200,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{ fontSize: 78, lineHeight: 1.1, marginBottom: 8 }}>{item.emoji}</span>
                  <strong style={{ fontSize: 'var(--fs-body)', color: isSelected && !isCorrect ? 'var(--pastel-pink-text)' : 'var(--ink)' }}>{label}</strong>
                </button>
              )
            })}
          </div>

          <p className="caption mt-lg" style={{ textAlign: 'center', color: 'var(--ink-muted-48)' }}>
            Tap the item you remember seeing on the bamboo tray.
          </p>
        </div>
      )}
    </div>
  )
}
