import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameProps } from './GameHost'
import { AnswerFeedback, RoundHeader, useGameTimeout } from './shared'
import { sessionRng } from '../lib/rng'
import { genSortRound } from '../lib/content'
import { nextLevel, recordAnswer } from '../lib/adaptive'
import { playChime, playSoftCue } from '../lib/audio'
import { useApp } from '../state'

const TOTAL_ROUNDS = 5
const DOMAIN = 'categorization'

export function BambooCrafting({ difficulty, logAction, complete }: GameProps) {
  const { lang } = useApp()
  const rng = useRef(sessionRng('bamboo')).current
  const [roundIdx, setRoundIdx] = useState(0)
  const [level, setLevel] = useState(() => Math.max(difficulty, nextLevel(DOMAIN)))

  const round = useMemo(() => genSortRound(rng, level), [rng, level, roundIdx])

  const [pickedCatIdx, setPickedCatIdx] = useState<number | null>(null)
  const [glowCatIdx, setGlowCatIdx] = useState<number | null>(null)
  const scheduleTimeout = useGameTimeout()
  const unprompted = useRef(0)

  const itemLabel = lang === 'hi' && round.item.labelHi ? round.item.labelHi : round.item.label
  const promptText =
    lang === 'hi'
      ? `${itemLabel} को किस टोकरी में रखना चाहिए?`
      : `Which basket does the ${itemLabel} belong to?`

  useEffect(() => {
    const glowTimer = scheduleTimeout(() => {
      if (pickedCatIdx === null && glowCatIdx === null) {
        setGlowCatIdx(round.correctCatIdx)
        playSoftCue()
      }
    }, 4000)

    return () => {
      clearTimeout(glowTimer)
    }
  }, [roundIdx, promptText, lang, round.correctCatIdx, pickedCatIdx, glowCatIdx])

  function pick(catIdx: number) {
    if (pickedCatIdx !== null) return
    setPickedCatIdx(catIdx)
    const isCorrect = catIdx === round.correctCatIdx
    recordAnswer(DOMAIN, level, isCorrect)

    if (isCorrect) {
      unprompted.current++
      logAction('unprompted')
      void playChime()
    } else {
      logAction('cued')
      setGlowCatIdx(round.correctCatIdx)
    }

    scheduleTimeout(() => {
      setPickedCatIdx(null)
      setGlowCatIdx(null)
      if (roundIdx + 1 >= TOTAL_ROUNDS) {
        complete({ itemsTotal: TOTAL_ROUNDS, itemsUnprompted: unprompted.current, completion: 1 })
      } else {
        setLevel(nextLevel(DOMAIN))
        setRoundIdx((i) => i + 1)
      }
    }, 1600)
  }

  const feedbackState = pickedCatIdx === null ? 'idle' : pickedCatIdx === round.correctCatIdx ? 'success' : 'guidance'

  return (
    <div className="center-col" style={{ width: '100%', maxWidth: 880, margin: '0 auto' }}>
      <RoundHeader now={roundIdx + 1} total={TOTAL_ROUNDS} unit="question" />

      {/* Target Item Card */}
      <div
        className="card card-dark center-col enter-anim"
        style={{
          width: '100%',
          maxWidth: 440,
          padding: 'var(--s-xl)',
          textAlign: 'center',
          borderRadius: 'var(--r-xl)',
          background: 'linear-gradient(180deg, #213247 0%, #162436 100%)',
          border: '2px solid rgba(201, 142, 52, 0.35)',
          boxShadow: 'var(--shadow-card)',
          marginBottom: 'var(--s-lg)',
        }}
      >
        <span style={{ fontSize: 96, lineHeight: 1, marginBottom: 8 }}>{round.item.emoji}</span>
        <h2 className="display-md" style={{ color: '#fff', margin: '4px 0' }}>
          {itemLabel}
        </h2>
        <span className="caption" style={{ color: 'var(--muga-gold-light)' }}>
          {promptText}
        </span>
      </div>

      <p className="lead" style={{ margin: 'var(--s-sm) 0 var(--s-md) 0', fontWeight: 600, color: 'var(--ink)' }}>
        {lang === 'hi' ? 'सही टोकरी पर टैप कीजिए:' : 'Tap the matching bamboo basket:'}
      </p>

      {/* Large Basket Choice Cards */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: 'var(--s-md)', width: '100%' }}>
        {round.cats.map((cat, i) => {
          const isCorrect = i === round.correctCatIdx
          const isSelected = pickedCatIdx === i
          const isGlow = glowCatIdx === i
          const catName = lang === 'hi' && cat.nameHi ? cat.nameHi : cat.name

          return (
            <button
              key={i}
              className={`choice-card-big ${isSelected ? (isCorrect ? 'answer-correct' : 'answer-guidance') : ''} ${isGlow ? 'glow' : ''}`}
              aria-pressed={isSelected}
              data-answer-state={isSelected ? (isCorrect ? 'correct' : 'guidance') : 'idle'}
              onClick={() => pick(i)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: 'var(--s-xl) var(--s-lg)',
                borderRadius: 'var(--r-xl)',
                background: isSelected ? (isCorrect ? 'var(--success-soft)' : 'var(--surface-muted)') : 'radial-gradient(ellipse at top, #F7EFE3 0%, #E8D8C2 100%)',
                border: isSelected ? (isCorrect ? '3px solid var(--success)' : '3px solid var(--primary)') : isGlow ? '3px solid var(--primary)' : '2px solid rgba(166, 124, 72, 0.35)',
                boxShadow: 'var(--shadow-card)',
                minHeight: 200,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ fontSize: 72, lineHeight: 1.1, marginBottom: 8 }}>🧺</span>
              <strong style={{ fontSize: 'var(--fs-title)', color: 'var(--ink)' }}>{catName}</strong>
              <span className="caption mt-xs" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                {cat.emoji} {lang === 'hi' ? 'टोकरी' : 'Basket'}
              </span>
            </button>
          )
        })}
      </div>

      <AnswerFeedback state={feedbackState} />

      <p className="caption mt-lg" style={{ textAlign: 'center', color: 'var(--ink-muted-48)' }}>
        {lang === 'hi' ? 'वस्तु को उसकी टोकरी में रखें।' : 'Put the item into the basket it belongs to.'}
      </p>
    </div>
  )
}
