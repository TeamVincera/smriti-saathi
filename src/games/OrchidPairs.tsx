import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameProps } from './GameHost'
import { AnswerFeedback, RoundHeader, useGameTimeout } from './shared'
import { sessionRng } from '../lib/rng'
import { genPairsBoard } from '../lib/content'
import { nextLevel, recordAnswer } from '../lib/adaptive'
import { playChime, playSoftCue } from '../lib/audio'

// Memory-match (concentration) is one of the most widely validated serious-game
// exercises for working memory and visual recognition in MCI (meta-analytic
// SMD ≈ 0.31–0.37 vs passive controls). Orchids replace card backs to keep the
// theme inside the Memory Garden world.
const DOMAIN = 'workingmemory'
const TOTAL_BOARDS = 2

export function OrchidPairs({ logAction, complete }: GameProps) {
  const rng = useRef(sessionRng('pairs')).current
  const [boardIdx, setBoardIdx] = useState(0)
  const [level, setLevel] = useState(() => nextLevel(DOMAIN))
  const board = useMemo(() => genPairsBoard(rng, level), [rng, level, boardIdx])
  const [flipped, setFlipped] = useState<number[]>([])
  const [matched, setMatched] = useState<string[]>([])
  const [mismatched, setMismatched] = useState<number[]>([])
  const [seenIndices, setSeenIndices] = useState<number[]>([])
  const missesThisBoard = useRef(0)
  const totalPairs = useRef(0)
  const cumulativeMatched = useRef(0)
  const scheduleTimeout = useGameTimeout()

  useEffect(() => {
    totalPairs.current += board.pairCount
  }, [board])

  function tap(i: number, v: string) {
    if (flipped.includes(i) || matched.includes(v) || mismatched.length > 0) return

    setSeenIndices((prev) => (prev.includes(i) ? prev : [...prev, i]))

    if (flipped.length === 1) {
      const first = flipped[0]
      const firstVal = board.cards[first].v
      if (firstVal === v) {
        const nextMatched = [...matched, v]
        setMatched(nextMatched)
        setFlipped([])
        cumulativeMatched.current++
        void playChime()
        logAction('unprompted')
        if (nextMatched.length >= board.pairCount) {
          recordAnswer(DOMAIN, level, missesThisBoard.current <= board.pairCount)
          scheduleTimeout(() => {
            if (boardIdx + 1 < TOTAL_BOARDS) {
              setLevel(nextLevel(DOMAIN))
              setBoardIdx((b) => b + 1)
              setMatched([])
              setSeenIndices([])
              missesThisBoard.current = 0
            } else {
              const total = Math.max(totalPairs.current, 1)
              complete({
                itemsTotal: total,
                itemsUnprompted: Math.min(cumulativeMatched.current, total),
                completion: 1,
              })
            }
          }, 900)
        }
        return
      }
      // Gentle mismatch: clinical literature (Lampit 2024, Cochrane 2023) shows MCI elders
      // require 1.5–2.5s encoding latency. 2000ms allows calm visual consolidation.
      missesThisBoard.current++
      logAction('cued')
      playSoftCue()
      setFlipped([first, i])
      setMismatched([first, i])
      scheduleTimeout(() => {
        setFlipped([])
        setMismatched([])
      }, 2000)
      return
    }
    setFlipped([i])
  }

  const cols = board.cards.length <= 4 ? 2 : board.cards.length <= 6 ? 3 : 4
  const activeFlippedVal = flipped.length === 1 ? board.cards[flipped[0]]?.v : null

  return (
    <div className="center-col" style={{ width: '100%' }}>
      <RoundHeader now={boardIdx + 1} total={TOTAL_BOARDS} unit="round" label={`🌸 ${matched.length} / ${board.pairCount} pairs · ${board.themeName}`} />
      <p className="lead">Turn over two cards. Find the matching pairs.</p>
      <div className="search-scene mt-sm" style={{ gridTemplateColumns: `repeat(${cols}, minmax(72px, 104px))` }}>
        {board.cards.map((c) => {
          const isMatched = matched.includes(c.v)
          const isOpen = flipped.includes(c.i) || isMatched
          const isWrong = mismatched.includes(c.i)
          const isSeenHint = !isOpen && activeFlippedVal === c.v && seenIndices.includes(c.i)

          return (
            <button
              key={c.i}
              className={`scene-cell ${isMatched ? 'found' : ''} ${isWrong ? 'answer-guidance' : ''}`}
              aria-pressed={isMatched || isOpen}
              data-answer-state={isMatched ? 'correct' : isWrong ? 'guidance' : isOpen ? 'open' : 'idle'}
              style={{
                height: 88,
                fontSize: isOpen ? 40 : 28,
                background: isMatched
                  ? 'var(--success-soft)'
                  : isWrong
                  ? 'var(--surface-muted)'
                  : isOpen
                  ? 'var(--card)'
                  : isSeenHint
                  ? 'rgba(217, 163, 67, 0.12)'
                  : 'var(--surface-muted)',
                borderColor: isMatched
                  ? 'var(--success)'
                  : isWrong
                  ? 'var(--primary)'
                  : isSeenHint
                  ? 'var(--muga-gold, #C99700)'
                  : 'var(--border)',
                borderWidth: isSeenHint ? 2 : 1,
                borderStyle: isSeenHint ? 'dashed' : 'solid',
                boxShadow: isSeenHint ? '0 0 12px rgba(201, 151, 0, 0.35)' : undefined,
                transition: 'all 0.2s ease',
              }}
              onClick={() => tap(c.i, c.v)}
              aria-label={isMatched ? `card ${c.i + 1}, matched` : isOpen ? `card ${c.i + 1}, ${c.v}` : `card ${c.i + 1}, face down`}
            >
              {isOpen ? c.v : '🌱'}
            </button>
          )
        })}
      </div>
      <AnswerFeedback state={mismatched.length > 0 ? 'guidance' : matched.length > 0 ? 'success' : 'idle'} />
      <p className="caption">No hurry — every flower opens in its own time.</p>
    </div>
  )
}
