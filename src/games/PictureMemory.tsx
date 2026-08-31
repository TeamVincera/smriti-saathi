import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameProps } from './GameHost'
import { RoundHeader } from './shared'
import { sessionRng } from '../lib/rng'
import { genPictureMemoryRound } from '../lib/content'
import { nextLevel, recordAnswer } from '../lib/adaptive'
import { playChime, playSoftCue } from '../lib/audio'
import { useApp } from '../state'
import { shuffle } from './shared'

const TOTAL_ROUNDS = 4
const DOMAIN = 'visual_memory'
const VIEW_DURATION_SEC = 10

export function PictureMemory({ difficulty, logAction, complete }: GameProps) {
  const { lang } = useApp()
  const rng = useRef(sessionRng('picture')).current
  const [roundIdx, setRoundIdx] = useState(0)
  const [level, setLevel] = useState(() => Math.max(difficulty, nextLevel(DOMAIN)))

  const round = useMemo(() => genPictureMemoryRound(rng, level), [rng, level, roundIdx])

  const [phase, setPhase] = useState<'viewing' | 'recall'>('viewing')
  const [timeLeft, setTimeLeft] = useState(VIEW_DURATION_SEC)
  const [pickedText, setPickedText] = useState<string | null>(null)
  const [glowText, setGlowText] = useState<string | null>(null)
  const unprompted = useRef(0)

  // Options list for active question
  const options = useMemo(() => {
    const correctOpt = {
      text: round.activeQuestion.correctAnswer,
      textHi: round.activeQuestion.correctAnswerHi,
      isCorrect: true,
    }
    const wrongOpts = round.activeQuestion.distractors.map((d) => ({
      text: d.text,
      textHi: d.textHi,
      isCorrect: false,
    }))
    return shuffle([correctOpt, ...wrongOpts])
  }, [round])

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
  }, [roundIdx, lang, round.scene])

  function finishViewingEarly() {
    setTimeLeft(0)
    setPhase('recall')
  }

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
      setGlowText(round.activeQuestion.correctAnswer)
      playSoftCue()
    }

    setTimeout(() => {
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

  const sceneTitle = lang === 'hi' ? round.scene.titleHi : round.scene.title
  const questionText = lang === 'hi' ? round.activeQuestion.questionHi : round.activeQuestion.question

  return (
    <div className="center-col" style={{ width: '100%', maxWidth: 880, margin: '0 auto' }}>
      <RoundHeader now={roundIdx + 1} total={TOTAL_ROUNDS} unit="round" label={sceneTitle} />

      {phase === 'viewing' ? (
        <div className="center-col enter-anim" style={{ width: '100%' }}>
          <div className="card card-dark row-between" style={{ width: '100%', padding: 'var(--s-md) var(--s-lg)', alignItems: 'center', marginBottom: 'var(--s-lg)' }}>
            <div>
              <span className="caption" style={{ color: 'var(--muga-gold-light)' }}>🖼️ Scene Memory · Observe carefully</span>
              <h2 className="display-md" style={{ color: '#fff', margin: '4px 0 0 0' }}>
                {sceneTitle}
              </h2>
            </div>
            <button className="btn btn-primary" onClick={finishViewingEarly} style={{ minHeight: 48, padding: '0 18px', borderRadius: 'var(--r-pill)' }}>
              I have seen it (Ready)
            </button>
          </div>

          {/* Scene Visual Stage */}
          <div
            style={{
              width: '100%',
              minHeight: 280,
              borderRadius: 'var(--r-xl)',
              background: 'radial-gradient(ellipse at top, #F7EFE3 0%, #E8D8C2 100%)',
              border: '3px solid var(--primary)',
              boxShadow: 'var(--shadow-card)',
              padding: 'var(--s-xl)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 44, marginBottom: 8 }}>{round.scene.sceneEmoji}</span>
            <p className="lead" style={{ textAlign: 'center', maxWidth: 640, color: 'var(--ink)', fontWeight: 500, lineHeight: 1.4, marginBottom: 'var(--s-lg)' }}>
              {lang === 'hi' ? round.scene.elementsDescriptionHi : round.scene.elementsDescription}
            </p>

            <div className="row" style={{ justifyContent: 'center', gap: 'var(--s-md)', flexWrap: 'wrap' }}>
              {round.scene.items.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    background: '#fff',
                    padding: 'var(--s-sm) var(--s-md)',
                    borderRadius: 'var(--r-md)',
                    border: '1.5px solid rgba(158, 34, 36, 0.15)',
                    minWidth: 120,
                  }}
                >
                  <span style={{ fontSize: 48 }}>{item.emoji}</span>
                  <strong style={{ fontSize: 13, color: 'var(--ink)', marginTop: 4 }}>
                    {lang === 'hi' ? item.nameHi : item.name}
                  </strong>
                  <span className="caption" style={{ fontSize: 11, color: 'var(--ink-muted-48)' }}>
                    {item.position}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Timer Bar */}
          <div style={{ width: '100%', maxWidth: 400, marginTop: 'var(--s-lg)', textAlign: 'center' }}>
            <span className="caption" style={{ color: 'var(--ink-muted-48)' }}>
              Questions starting in {timeLeft} seconds…
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
            <span className="caption" style={{ color: 'var(--muga-gold-light)' }}>❓ Question about the Scene</span>
            <h2 className="display-md" style={{ color: '#fff', margin: '4px 0 0 0' }}>
              {questionText}
            </h2>
          </div>

          {/* Options Grid */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--s-md)', width: '100%' }}>
            {options.map((opt, i) => {
              const isSelected = pickedText === opt.text
              const isGlow = glowText === opt.text
              const label = lang === 'hi' && opt.textHi ? opt.textHi : opt.text

              return (
                <button
                  key={i}
                  className={`choice-card-big ${isSelected ? (opt.isCorrect ? 'correct' : 'wrong') : ''} ${isGlow ? 'glow' : ''}`}
                  onClick={() => pick(opt)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: 'var(--s-lg)',
                    borderRadius: 'var(--r-lg)',
                    background: isSelected ? (opt.isCorrect ? 'var(--success-soft)' : 'var(--error-soft)') : 'var(--card)',
                    border: isSelected ? (opt.isCorrect ? '3px solid var(--success)' : '3px solid var(--error)') : isGlow ? '3px solid var(--primary)' : '2px solid var(--border)',
                    boxShadow: 'var(--shadow-sm)',
                    minHeight: 140,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <strong style={{ fontSize: 'var(--fs-body)', color: isSelected && !opt.isCorrect ? 'var(--pastel-pink-text)' : 'var(--ink)' }}>{label}</strong>
                </button>
              )
            })}
          </div>

          <p className="caption mt-lg" style={{ textAlign: 'center', color: 'var(--ink-muted-48)' }}>
            Tap the answer that matches what was in the scene.
          </p>
        </div>
      )}
    </div>
  )
}
