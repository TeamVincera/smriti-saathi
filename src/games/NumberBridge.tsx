import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../state'
import type { GameProps } from './GameHost'
import { AnswerFeedback, RoundHeader, useGameTimeout } from './shared'
import { sessionRng } from '../lib/rng'
import { genBridgePath } from '../lib/content'
import { nextLevel, recordAnswer } from '../lib/adaptive'
import { playChime, playSoftCue } from '../lib/audio'

export const INDIC_DIGITS: Record<string, string[]> = {
  as: ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'],
  bn: ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'],
  hi: ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'],
  brx: ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'],
}

export function formatNumeral(n: number, lang?: string): string {
  const digits = lang && INDIC_DIGITS[lang] ? INDIC_DIGITS[lang] : null
  if (!digits) return String(n)
  return String(n)
    .split('')
    .map((char) => {
      const idx = parseInt(char, 10)
      return !isNaN(idx) ? digits[idx] : char
    })
    .join('')
}

// Number-ordering bridges everyday numeracy and sequencing (the "serial
// order" skill that declines earliest in dementia). The bridge grows plank by
// plank — errorless: a wrong plank simply waits.
const DOMAIN = 'sequencing'
const TOTAL_PATHS = 2

export function NumberBridge({ logAction, complete }: GameProps) {
  const { lang } = useApp()
  const rng = useRef(sessionRng('bridge')).current
  const [pathIdx, setPathIdx] = useState(0)
  const [level, setLevel] = useState(() => nextLevel(DOMAIN))
  const path = useMemo(() => genBridgePath(rng, level), [rng, level, pathIdx])
  const [nextNumber, setNextNumber] = useState(1)
  const wrongTapsThisRound = useRef(0)
  const totalPlanks = useRef(0)
  const unpromptedPlanks = useRef(0)
  const transitionRef = useRef(false)

  useEffect(() => {
    totalPlanks.current += path.total
  }, [path])

  const [wrongNum, setWrongNum] = useState<number | null>(null)
  const scheduleTimeout = useGameTimeout()

  function tap(n: number) {
    if (transitionRef.current) return
    if (n < nextNumber) return
    if (n === nextNumber) {
      unpromptedPlanks.current++
      void playChime()
      logAction('unprompted')
      if (n >= path.total) {
        transitionRef.current = true
        recordAnswer(DOMAIN, level, wrongTapsThisRound.current <= 1)
        scheduleTimeout(() => {
          if (pathIdx + 1 < TOTAL_PATHS) {
            setLevel(nextLevel(DOMAIN))
            setPathIdx((p) => p + 1)
            setNextNumber(1)
            wrongTapsThisRound.current = 0
            transitionRef.current = false
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
      scheduleTimeout(() => setWrongNum(null), 550)
    }
  }

  return (
    <div className="center-col" style={{ width: '100%' }}>
      <RoundHeader
        now={pathIdx + 1}
        total={TOTAL_PATHS}
        unit="round"
        label={`🌉 Next plank: ${formatNumeral(Math.min(nextNumber, path.total), lang)} of ${formatNumeral(path.total, lang)}`}
      />
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
          const formatted = formatNumeral(n, lang)
          const isRegional = formatted !== String(n)
          return (
            <button
              key={n}
              className={`choice-btn ${placed ? 'answer-correct' : ''} ${isWrong ? 'answer-guidance' : ''}`}
              aria-pressed={placed}
              data-answer-state={placed ? 'correct' : isWrong ? 'guidance' : 'idle'}
              style={{ minWidth: 84, minHeight: 72, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => tap(n)}
            >
              <span className="big">{formatted}</span>
              {isRegional && (
                <span style={{ fontSize: 13, color: 'var(--ink-secondary)', opacity: 0.8, marginTop: 2, fontWeight: 600 }}>
                  ({n})
                </span>
              )}
            </button>
          )
        })}
      </div>
      <AnswerFeedback state={wrongNum !== null ? 'guidance' : nextNumber > 1 ? 'success' : 'idle'} />
      <p className="caption">Numbers wait patiently — tap them one by one.</p>
    </div>
  )
}
