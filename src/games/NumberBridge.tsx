import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameProps } from './GameHost'
import { RoundHeader } from './shared'
import { sessionRng } from '../lib/rng'
import { genBridgePath } from '../lib/content'
import { nextLevel, recordAnswer } from '../lib/adaptive'
import { playChime, playSoftCue } from '../lib/audio'

// Number-ordering bridges everyday numeracy and sequencing (the "serial
// order" skill that declines earliest in dementia). The bridge grows plank by
// plank — errorless: a wrong plank simply waits.
const DOMAIN = 'sequencing'
const TOTAL_PATHS = 2

export function NumberBridge({ logAction, complete }: GameProps) {
  const rng = useRef(sessionRng('bridge')).current
  const [pathIdx, setPathIdx] = useState(0)
  const [level, setLevel] = useState(() => nextLevel(DOMAIN))
  const path = useMemo(() => genBridgePath(rng, level), [rng, level, pathIdx])
  const [nextNumber, setNextNumber] = useState(1)
  const wrongTapsThisRound = useRef(0)
  const totalPlanks = useRef(0)
  const unpromptedPlanks = useRef(0)

  useEffect(() => {
    totalPlanks.current += path.total
  }, [path])

  const [wrongNum, setWrongNum] = useState<number | null>(null)

  function tap(n: number) {
    if (n < nextNumber) return
    if (n === nextNumber) {
      unpromptedPlanks.current++
      void playChime()
      logAction('unprompted')
      if (n >= path.total) {
        recordAnswer(DOMAIN, level, wrongTapsThisRound.current <= 1)
        setTimeout(() => {
          if (pathIdx + 1 < TOTAL_PATHS) {
            setLevel(nextLevel(DOMAIN))
            setPathIdx((p) => p + 1)
            setNextNumber(1)
            wrongTapsThisRound.current = 0
          } else {
            const total = Math.max(totalPlanks.current, 1)
            complete({
              itemsTotal: total,
              itemsUnprompted: Math.min(unpromptedPlanks.current, total),
              completion: 1,
            })
          }
        }, 700)
      } else {
        setNextNumber((x) => x + 1)
      }
    } else {
      wrongTapsThisRound.current++
      logAction('cued')
      playSoftCue()
      setWrongNum(n)
      setTimeout(() => setWrongNum(null), 550)
    }
  }

  return (
    <div className="center-col" style={{ width: '100%' }}>
      <RoundHeader now={pathIdx + 1} total={TOTAL_PATHS} unit="round" label={`🌉 Next plank: ${Math.min(nextNumber, path.total)} of ${path.total}`} />
      <p className="lead">Tap the planks in order — build the bamboo bridge across the paddy field!</p>
      <div className="row mt-sm" style={{ justifyContent: 'center', marginBottom: 'var(--s-sm)' }} aria-hidden>
        {Array.from({ length: path.total }, (_, i) => (
          <span key={i} style={{ fontSize: i < nextNumber - 1 ? 34 : 26, opacity: i < nextNumber ? 1 : 0.35 }}>
            {i < nextNumber - 1 ? '🪵' : '⬜'}
          </span>
        ))}
        <span style={{ fontSize: 30 }}>{nextNumber > path.total ? '🏡' : '🌾'}</span>
      </div>
      <div className="row mt-md" style={{ justifyContent: 'center', gap: 'var(--s-md)', flexWrap: 'wrap' }}>
        {path.numbers.map(({ n }) => {
          const placed = n < nextNumber
          const isWrong = wrongNum === n
          return (
            <button
              key={n}
              className={`choice-btn ${placed ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`}
              style={{ minWidth: 84 }}
              onClick={() => tap(n)}
            >
              <span className="big">{n}</span>
            </button>
          )
        })}
      </div>
      <p className="caption">Numbers wait patiently — tap them one by one.</p>
    </div>
  )
}
