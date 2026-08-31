import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameProps } from './GameHost'
import { RoundHeader } from './shared'
import { sessionRng } from '../lib/rng'
import { genWordRound } from '../lib/content'
import { nextLevel, recordAnswer } from '../lib/adaptive'
import { playChime, playSoftCue } from '../lib/audio'

// Category word-association ("name things that belong") mirrors the CST word
// game; computerized training on verbal/semantic tasks shows the largest
// effects in MCI meta-analyses (verbal memory SMD ≈ 0.55).
const DOMAIN = 'verbal'
const TOTAL_ROUNDS = 3

export function WordHarvest({ logAction, complete }: GameProps) {
  const rng = useRef(sessionRng('word')).current
  const [roundIdx, setRoundIdx] = useState(0)
  const [level, setLevel] = useState(() => nextLevel(DOMAIN))
  const round = useMemo(() => genWordRound(rng, level), [rng, level, roundIdx])
  const [foundLabels, setFoundLabels] = useState<string[]>([])
  const [wrongFlash, setWrongFlash] = useState<string | null>(null)
  const missesThisRound = useRef(0)
  const totalWords = useRef(0)
  const unpromptedWords = useRef(0)

  useEffect(() => {
    totalWords.current += round.correct.length
  }, [round])

  function tap(label: string) {
    if (foundLabels.includes(label)) return
    if (round.correct.some((c) => c.label === label)) {
      const next = [...foundLabels, label]
      setFoundLabels(next)
      unpromptedWords.current++
      void playChime()
      logAction('unprompted')
      if (next.length >= round.correct.length) {
        recordAnswer(DOMAIN, level, missesThisRound.current <= 1)
        setTimeout(() => {
          if (roundIdx + 1 < TOTAL_ROUNDS) {
            setLevel(nextLevel(DOMAIN))
            setRoundIdx((r) => r + 1)
            setFoundLabels([])
            missesThisRound.current = 0
          } else {
            const total = Math.max(totalWords.current, 1)
            complete({
              itemsTotal: total,
              itemsUnprompted: Math.min(unpromptedWords.current, total),
              completion: 1,
            })
          }
        }, 900)
      }
    } else {
      missesThisRound.current++
      logAction('cued')
      setWrongFlash(label)
      playSoftCue()
      setTimeout(() => setWrongFlash(null), 600)
    }
  }

  return (
    <div className="center-col" style={{ width: '100%' }}>
      <RoundHeader now={roundIdx + 1} total={TOTAL_ROUNDS} label={`🌾 ${foundLabels.length} / ${round.correct.length} found`} />
      <p className="lead display-md" style={{ textAlign: 'center', maxWidth: 640 }}>{round.prompt}</p>
      <div className="row mt-md" style={{ justifyContent: 'center', gap: 'var(--s-md)', flexWrap: 'wrap' }}>
        {round.options.map((o) => {
          const isFound = foundLabels.includes(o.label)
          const isWrongFlash = wrongFlash === o.label
          return (
            <button
              key={o.label}
              className={`choice-btn ${isFound ? 'correct' : ''} ${isWrongFlash ? 'wrong' : ''}`}
              style={{ minWidth: 130, opacity: isFound ? 1 : undefined }}
              onClick={() => tap(o.label)}
            >
              <span className="big">{o.emoji}</span>
              <span className="caption">{o.label}</span>
              {isFound && <span aria-hidden>✅</span>}
            </button>
          )
        })}
      </div>
      <p className="caption">Tap everything that belongs. Nothing here can break.</p>
    </div>
  )
}
