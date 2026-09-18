import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameProps } from './GameHost'
import { AnswerFeedback, RoundHeader, useGameTimeout } from './shared'
import { sessionRng } from '../lib/rng'
import { genFamiliarPhraseRound } from '../lib/content'
import { nextLevel, recordAnswer } from '../lib/adaptive'
import { playChime, playSoftCue } from '../lib/audio'
import { useApp } from '../state'

const TOTAL_ROUNDS = 4
const DOMAIN = 'verbal'

export function FamiliarPhrases({ difficulty, logAction, complete }: GameProps) {
  const { lang } = useApp()
  const rng = useRef(sessionRng('phrases')).current
  const [roundIdx, setRoundIdx] = useState(0)
  const [level, setLevel] = useState(() => Math.max(difficulty, nextLevel(DOMAIN)))

  const round = useMemo(() => genFamiliarPhraseRound(rng, level), [rng, level, roundIdx])

  const [pickedText, setPickedText] = useState<string | null>(null)
  const [glowText, setGlowText] = useState<string | null>(null)
  const scheduleTimeout = useGameTimeout()
  const unprompted = useRef(0)

  const promptText = lang === 'hi' ? round.phrase.promptHi : round.phrase.prompt

  useEffect(() => {
    const glowTimer = scheduleTimeout(() => {
      if (!pickedText && !glowText) {
        setGlowText(round.phrase.correctCompletion)
        playSoftCue()
      }
    }, 4000)

    return () => {
      clearTimeout(glowTimer)
    }
  }, [roundIdx, promptText, lang, round.phrase.correctCompletion, pickedText, glowText])

  function pick(opt: { text: string; textHi: string; isCorrect: boolean }) {
    if (pickedText) return
    setPickedText(opt.text)
    const isCorrect = opt.isCorrect
    recordAnswer(DOMAIN, level, isCorrect)

    if (isCorrect) {
      unprompted.current++
      logAction('unprompted')
      void playChime()
    } else {
      logAction('cued')
      setGlowText(round.phrase.correctCompletion)
    }

    scheduleTimeout(() => {
      setPickedText(null)
      setGlowText(null)
      if (roundIdx + 1 >= TOTAL_ROUNDS) {
        complete({ itemsTotal: TOTAL_ROUNDS, itemsUnprompted: unprompted.current, completion: 1 })
      } else {
        setLevel(nextLevel(DOMAIN))
        setRoundIdx((i) => i + 1)
      }
    }, 1600)
  }

  const selectedOption = round.options.find((opt) => opt.text === pickedText)
  const feedbackState = !selectedOption ? 'idle' : selectedOption.isCorrect ? 'success' : 'guidance'

  return (
    <div className="center-col" style={{ width: '100%', maxWidth: 880, margin: '0 auto' }}>
      <RoundHeader now={roundIdx + 1} total={TOTAL_ROUNDS} unit="question" />

      {/* Prompt Banner */}
      <div className="card card-dark enter-anim" style={{ width: '100%', padding: 'var(--s-md) var(--s-lg)', marginBottom: 'var(--s-lg)' }}>
        <span className="caption" style={{ color: 'var(--muga-gold-light)', display: 'block', marginBottom: 4 }}>
          📜 Complete the Familiar Saying · {round.phrase.origin}
        </span>
        <h2 className="display-md" style={{ color: '#fff', margin: 0, lineHeight: 1.35 }}>
          {promptText}
        </h2>
      </div>

      {/* Completion Options Grid */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: 'var(--s-md)', width: '100%' }}>
        {round.options.map((opt, i) => {
          const isSelected = pickedText === opt.text
          const isGlow = glowText === opt.text
          const label = lang === 'hi' && opt.textHi ? opt.textHi : opt.text

          return (
            <button
              key={i}
              className={`choice-card-big ${isSelected ? (opt.isCorrect ? 'answer-correct' : 'answer-guidance') : ''} ${isGlow ? 'glow' : ''}`}
              aria-pressed={isSelected}
              data-answer-state={isSelected ? (opt.isCorrect ? 'correct' : 'guidance') : 'idle'}
              onClick={() => pick(opt)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: 'var(--s-lg)',
                borderRadius: 'var(--r-lg)',
                background: isSelected ? (opt.isCorrect ? 'var(--success-soft)' : 'var(--surface-muted)') : 'var(--card)',
                border: isSelected ? (opt.isCorrect ? '3px solid var(--success)' : '3px solid var(--primary)') : isGlow ? '3px solid var(--primary)' : '2px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
                minHeight: 140,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <strong style={{ fontSize: 'var(--fs-body)', color: 'var(--ink)', lineHeight: 1.3 }}>{label}</strong>
            </button>
          )
        })}
      </div>

      <AnswerFeedback state={feedbackState} />

      <p className="caption mt-lg" style={{ textAlign: 'center', color: 'var(--ink-muted-48)' }}>
        Tap the words that finish the saying naturally.
      </p>
    </div>
  )
}
