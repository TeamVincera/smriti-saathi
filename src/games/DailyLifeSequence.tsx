import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameProps } from './GameHost'
import { shuffle, RoundHeader } from './shared'
import { sessionRng } from '../lib/rng'
import { genSequenceRound } from '../lib/content'
import { nextLevel, recordAnswer } from '../lib/adaptive'
import { playChime, playSoftCue } from '../lib/audio'
import { useApp } from '../state'

const TOTAL_ROUNDS = 3
const DOMAIN = 'sequencing'

export function DailyLifeSequence({ difficulty, logAction, complete }: GameProps) {
  const { lang } = useApp()
  const rng = useRef(sessionRng('sequence')).current
  const [seqIdx, setSeqIdx] = useState(0)
  const [level, setLevel] = useState(() => Math.max(difficulty, nextLevel(DOMAIN)))

  const seq = useMemo(() => genSequenceRound(rng, level), [rng, level, seqIdx])
  const shuffledIndices = useMemo(() => shuffle(seq.steps.map((_, i) => i)), [seq])
  const [placed, setPlaced] = useState<number[]>([])
  const [glowItem, setGlowItem] = useState<number | null>(null)
  const unprompted = useRef(0)
  const cuedThisRound = useRef(0)
  const totalSteps = useRef(0)

  const nextSlot = placed.length

  useEffect(() => {
    totalSteps.current += seq.steps.length
  }, [seq])

  useEffect(() => {
    const t = setTimeout(() => setGlowItem(correctNext()), 6500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed])

  function correctNext(): number | null {
    for (const item of shuffledIndices) {
      if (!placed.includes(item) && item === placed.length) return item
    }
    return null
  }

  const [wrongItemIdx, setWrongItemIdx] = useState<number | null>(null)

  function tapItem(itemIdx: number) {
    if (placed.includes(itemIdx)) return
    const isCorrect = itemIdx === nextSlot
    if (isCorrect) {
      unprompted.current++
      logAction('unprompted')
      void playChime()
    } else {
      // Errorless Learning: the piece gently flashes red and waits
      logAction('cued')
      cuedThisRound.current++
      playSoftCue()
      setWrongItemIdx(itemIdx)
      setTimeout(() => setWrongItemIdx(null), 550)
    }
    setGlowItem(null)
    if (isCorrect) {
      const next = [...placed, itemIdx]
      setPlaced(next)
      if (next.length >= seq.steps.length) {
        recordAnswer(DOMAIN, level, cuedThisRound.current <= 1)
        setTimeout(() => {
          if (seqIdx + 1 < TOTAL_ROUNDS) {
            setLevel(nextLevel(DOMAIN))
            setSeqIdx((i) => i + 1)
            setPlaced([])
            cuedThisRound.current = 0
          } else {
            const total = Math.max(totalSteps.current, 1)
            complete({
              itemsTotal: total,
              itemsUnprompted: Math.min(unprompted.current, total),
              completion: 1,
            })
          }
        }, 1200)
      }
    }
  }

  const remaining = shuffledIndices.filter((i) => !placed.includes(i))
  const seqName = lang === 'hi' && seq.nameHi ? seq.nameHi : seq.name

  return (
    <div className="center-col" style={{ width: '100%', maxWidth: 880, margin: '0 auto' }}>
      <RoundHeader now={seqIdx + 1} total={TOTAL_ROUNDS} unit="round" label={seqName} />

      {/* Sequence Banner */}
      <div className="card card-dark enter-anim" style={{ width: '100%', padding: 'var(--s-md) var(--s-lg)', marginBottom: 'var(--s-lg)' }}>
        <span className="caption" style={{ color: 'var(--muga-gold-light)' }}>🗓️ Step-by-Step Daily Sequence</span>
        <h2 className="display-md" style={{ color: '#fff', margin: '4px 0 0 0' }}>
          {seqName}
        </h2>
      </div>

      {/* Slots Progress Row */}
      <div className="row" style={{ justifyContent: 'center', gap: 'var(--s-sm)', flexWrap: 'wrap', width: '100%', marginBottom: 'var(--s-lg)' }}>
        {seq.steps.map((s, slot) => {
          const isFilled = slot < placed.length
          const filledItem = isFilled ? seq.steps[placed[slot]] : null
          const filledLabel = filledItem ? (lang === 'hi' && filledItem.labelHi ? filledItem.labelHi : filledItem.label) : ''

          return (
            <div
              key={slot}
              className={`slot ${isFilled ? 'filled' : ''}`}
              style={{
                minWidth: 150,
                minHeight: 80,
                padding: 'var(--s-sm) var(--s-md)',
                borderRadius: 'var(--r-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isFilled ? 'var(--success-soft)' : 'var(--parchment)',
                border: isFilled ? '2px solid var(--success)' : '2px dashed var(--border)',
                color: isFilled ? 'var(--success-text)' : 'var(--ink-muted)',
                fontWeight: 600,
                transition: 'all 0.2s ease',
              }}
            >
              {isFilled ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }}>
                  <span style={{ fontSize: 32 }}>{filledItem?.emoji}</span>
                  <span style={{ fontSize: 'var(--fs-caption)', lineHeight: 1.2 }}>{filledLabel}</span>
                </div>
              ) : (
                <span style={{ fontSize: 'var(--fs-caption)' }}>Step {slot + 1} ⏳</span>
              )}
            </div>
          )
        })}
      </div>

      <p className="lead" style={{ margin: 'var(--s-sm) 0', fontWeight: 600, color: 'var(--ink)' }}>
        {lang === 'hi' ? 'अब कौन सा कदम आएगा? नीचे से चुनिए' : 'Tap the step that comes next'}
      </p>

      {/* Selectable Step Tiles Grid */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--s-md)', width: '100%' }}>
        {remaining.map((itemIdx) => {
          const step = seq.steps[itemIdx]
          const label = lang === 'hi' && step.labelHi ? step.labelHi : step.label
          const isGlow = glowItem === itemIdx
          const isWrong = wrongItemIdx === itemIdx

          return (
            <button
              key={itemIdx}
              className={`item-tile ${isGlow ? 'glow' : ''} ${isWrong ? 'wrong' : ''}`}
              onClick={() => tapItem(itemIdx)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: 'var(--s-lg)',
                borderRadius: 'var(--r-lg)',
                background: isWrong ? 'var(--error-soft)' : 'var(--card)',
                border: isWrong ? '3px solid var(--error)' : isGlow ? '3px solid var(--primary)' : '2px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
                minHeight: 160,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ fontSize: 54, lineHeight: 1.1, marginBottom: 8 }}>{step.emoji}</span>
              <strong style={{ fontSize: 'var(--fs-body)', color: isWrong ? 'var(--pastel-pink-text)' : 'var(--ink)' }}>{label}</strong>
            </button>
          )
        })}
      </div>

      <p className="caption mt-lg" style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>
        Pieces snap gently into their right place.
      </p>
    </div>
  )
}
