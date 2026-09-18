import { useMemo, useRef, useState } from 'react'
import type { GameProps } from './GameHost'
import { AnswerFeedback, RoundHeader, useGameTimeout } from './shared'
import { sessionRng } from '../lib/rng'
import { genOddOneRound } from '../lib/content'
import { nextLevel, recordAnswer } from '../lib/adaptive'
import { playChime, playSoftCue } from '../lib/audio'

// "Odd one out" is a core Cognitive Stimulation Therapy activity (categorization
// & semantic organisation) — the skill also trained by Bamboo Crafting, so both
// share the categorization ability model.
const DOMAIN = 'categorization'
const TOTAL = 5

export function OddOneOut({ logAction, complete }: GameProps) {
  const rng = useRef(sessionRng('oddone')).current
  const [roundIdx, setRoundIdx] = useState(0)
  const [level, setLevel] = useState(() => nextLevel(DOMAIN))
  const round = useMemo(() => genOddOneRound(rng, level), [rng, level, roundIdx])
  const [picked, setPicked] = useState<string | null>(null)
  const [glow, setGlow] = useState<string | null>(null)
  const scheduleTimeout = useGameTimeout()
  const unprompted = useRef(0)

  function pick(emoji: string) {
    if (picked) return
    setPicked(emoji)
    const correct = emoji === round.intruder.emoji
    recordAnswer(DOMAIN, level, correct)
    if (correct) {
      unprompted.current++
      logAction('unprompted')
      void playChime()
    } else {
      logAction('cued')
      playSoftCue()
      setGlow(round.intruder.emoji)
    }
    scheduleTimeout(() => {
      setPicked(null)
      setGlow(null)
      if (roundIdx + 1 >= TOTAL) {
        complete({ itemsTotal: TOTAL, itemsUnprompted: unprompted.current, completion: 1 })
      } else {
        setLevel(nextLevel(DOMAIN))
        setRoundIdx((i) => i + 1)
      }
    }, 1200)
  }

  return (
    <div className="center-col" style={{ width: '100%' }}>
      <RoundHeader now={roundIdx + 1} total={TOTAL} />
      <p className="lead">Three friends from the {round.categoryName.toLowerCase()} family — and one visitor.</p>
      <p className="display-md">Who does not belong?</p>
      <div className="row mt-md" style={{ justifyContent: 'center', gap: 'var(--s-md)', flexWrap: 'wrap' }}>
        {round.options.map((o) => (
          <button
            key={o.label}
            className={`choice-btn ${picked === o.emoji ? (o.emoji === round.intruder.emoji ? 'answer-correct' : 'answer-guidance') : ''} ${glow === o.emoji ? 'glow' : ''}`}
            aria-pressed={picked === o.emoji}
            data-answer-state={picked === o.emoji ? (o.emoji === round.intruder.emoji ? 'correct' : 'guidance') : 'idle'}
            style={{ minWidth: 130 }}
            onClick={() => pick(o.emoji)}
          >
            <span className="big">{o.emoji}</span>
            <span className="caption">{o.label}</span>
          </button>
        ))}
      </div>
      <AnswerFeedback state={picked === null ? 'idle' : picked === round.intruder.emoji ? 'success' : 'guidance'} />
      <p className="caption">The visitor will glow gently if you wait.</p>
    </div>
  )
}
