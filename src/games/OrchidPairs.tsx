import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameProps } from './GameHost'
import { RoundHeader } from './shared'
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
  const missesThisBoard = useRef(0)
  const totalPairs = useRef(0)
  const cumulativeMatched = useRef(0)

  useEffect(() => {
    totalPairs.current += board.pairCount
  }, [board])

  function tap(i: number, v: string) {
    if (flipped.includes(i) || matched.includes(v) || mismatched.length > 0) return
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
          setTimeout(() => {
            if (boardIdx + 1 < TOTAL_BOARDS) {
              setLevel(nextLevel(DOMAIN))
              setBoardIdx((b) => b + 1)
              setMatched([])
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
      // Gentle mismatch: both cards visibly turn soft red and close again after a breath.
      missesThisBoard.current++
      logAction('cued')
      playSoftCue()
      setFlipped([first, i])
      setMismatched([first, i])
      setTimeout(() => {
        setFlipped([])
        setMismatched([])
      }, 950)
      return
    }
    setFlipped([i])
  }

  const cols = board.cards.length <= 4 ? 2 : board.cards.length <= 6 ? 3 : 4

  return (
    <div className="center-col" style={{ width: '100%' }}>
      <RoundHeader now={boardIdx + 1} total={TOTAL_BOARDS} unit="round" label={`🌸 ${matched.length} / ${board.pairCount} pairs · ${board.themeName}`} />
      <p className="lead">Turn over two cards. Find the matching pairs.</p>
      <div className="search-scene mt-sm" style={{ gridTemplateColumns: `repeat(${cols}, minmax(72px, 104px))` }}>
        {board.cards.map((c) => {
          const isMatched = matched.includes(c.v)
          const isOpen = flipped.includes(c.i) || isMatched
          const isWrong = mismatched.includes(c.i)
          return (
            <button
              key={c.i}
              className={`scene-cell ${isMatched ? 'found' : ''} ${isWrong ? 'wrong' : ''}`}
              style={{
                height: 88,
                fontSize: isOpen ? 40 : 28,
                background: isMatched ? 'var(--success-soft)' : isWrong ? 'var(--error-soft)' : isOpen ? 'var(--card)' : 'var(--surface-muted)',
                borderColor: isMatched ? 'var(--success)' : isWrong ? 'var(--error)' : 'var(--border)',
                transition: 'all 0.2s ease',
              }}
              onClick={() => tap(c.i, c.v)}
              aria-label={`card ${c.i + 1}`}
            >
              {isOpen ? c.v : '🌱'}
            </button>
          )
        })}
      </div>
      <p className="caption">No hurry — every flower opens in its own time.</p>
    </div>
  )
}
