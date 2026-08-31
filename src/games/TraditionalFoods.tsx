import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameProps } from './GameHost'
import { RoundHeader } from './shared'
import { sessionRng } from '../lib/rng'
import { genTraditionalFoodRound } from '../lib/content'
import { nextLevel, recordAnswer } from '../lib/adaptive'
import { playChime, playSoftCue } from '../lib/audio'
import { useApp } from '../state'
import type { TraditionalFoodItem } from '../lib/questionBanks/traditionalFoods'

const TOTAL_ROUNDS = 5
const DOMAIN = 'recognition'

export function TraditionalFoods({ difficulty, logAction, complete }: GameProps) {
  const { lang, profile } = useApp()
  const rng = useRef(sessionRng('foods')).current
  const [roundIdx, setRoundIdx] = useState(0)
  const [level, setLevel] = useState(() => Math.max(difficulty, nextLevel(DOMAIN)))

  const statePreference = profile?.cultural.state || 'All'
  const round = useMemo(() => genTraditionalFoodRound(rng, level, statePreference), [rng, level, roundIdx, statePreference])

  const [pickedId, setPickedId] = useState<string | null>(null)
  const [glowId, setGlowId] = useState<string | null>(null)
  const unprompted = useRef(0)

  const questionText = lang === 'hi' ? round.target.questionHi : round.target.question

  useEffect(() => {
    const glowTimer = setTimeout(() => {
      if (!pickedId && !glowId) {
        setGlowId(round.target.id)
        playSoftCue()
      }
    }, 7000)

    return () => {
      clearTimeout(glowTimer)
    }
  }, [roundIdx, questionText, lang, round.target.id, pickedId, glowId])

  function pick(item: TraditionalFoodItem) {
    if (pickedId) return
    setPickedId(item.id)
    const isCorrect = item.id === round.target.id
    recordAnswer(DOMAIN, level, isCorrect)

    if (isCorrect) {
      unprompted.current++
      logAction('unprompted')
      void playChime()
    } else {
      logAction('cued')
      setGlowId(round.target.id)
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

  return (
    <div className="center-col" style={{ width: '100%', maxWidth: 880, margin: '0 auto' }}>
      <RoundHeader now={roundIdx + 1} total={TOTAL_ROUNDS} unit="question" />

      {/* Question Banner */}
      <div className="card card-dark enter-anim" style={{ width: '100%', padding: 'var(--s-md) var(--s-lg)', marginBottom: 'var(--s-lg)' }}>
        <span className="caption" style={{ color: 'var(--muga-gold-light)', display: 'block', marginBottom: 4 }}>
          🍲 Traditional Foods & Harvest Delicacies
        </span>
        <h2 className="display-md" style={{ color: '#fff', margin: 0, lineHeight: 1.3 }}>
          {questionText}
        </h2>
      </div>

      {/* Options Grid */}
      <div className="grid" style={{ gridTemplateColumns: round.options.length === 4 ? 'repeat(auto-fit, minmax(180px, 1fr))' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--s-md)', width: '100%' }}>
        {round.options.map((item) => {
          const isCorrect = item.id === round.target.id
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
                minHeight: 210,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ fontSize: 78, lineHeight: 1.1, marginBottom: 8 }}>{item.emoji}</span>
              <strong style={{ fontSize: 'var(--fs-body)', color: isSelected && !isCorrect ? 'var(--pastel-pink-text)' : 'var(--ink)' }}>{label}</strong>
              <span className="chip mt-xs" style={{ background: 'var(--surface-muted)', color: 'var(--primary)', fontWeight: 600, fontSize: 12 }}>
                📍 {item.state}
              </span>
              <span className="caption" style={{ color: 'var(--ink-muted)', fontSize: 13, marginTop: 4 }}>
                {item.culturalNote}
              </span>
            </button>
          )
        })}
      </div>

      <p className="caption mt-lg" style={{ textAlign: 'center', color: 'var(--ink-muted-48)' }}>
        Tap the food or delicacy that matches the description.
      </p>
    </div>
  )
}
