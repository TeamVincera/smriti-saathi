import { useMemo, useRef, useState } from 'react'
import type { GameProps } from './GameHost'
import { AnswerFeedback, RoundHeader, useGameTimeout } from './shared'
import { sessionRng } from '../lib/rng'
import { genSpotBoard } from '../lib/content'
import { nextLevel, recordAnswer } from '../lib/adaptive'
import { playChime, playSoftCue } from '../lib/audio'
import { useApp } from '../state'

// Stimulus-discrimination ("spot the difference") trains selective visual
// attention — one of the exercises with consistent practice gains in adaptive
// memory-game studies with older adults.
const DOMAIN = 'visualsearch'
const TOTAL_BOARDS = 3

export function SpotDifference({ logAction, complete }: GameProps) {
  const { lang } = useApp()
  const rng = useRef(sessionRng('spot')).current
  const strays = useRef(0)
  const [boardIdx, setBoardIdx] = useState(0)
  const [level, setLevel] = useState(() => nextLevel(DOMAIN))
  const board = useMemo(() => genSpotBoard(rng, level), [rng, level, boardIdx])
  const [solved, setSolved] = useState(false)
  const [wrongIdx, setWrongIdx] = useState<number | null>(null)
  const scheduleTimeout = useGameTimeout()

  function tap(i: number) {
    if (solved) return
    if (i === board.changedIdx) {
      setSolved(true)
      void playChime()
      logAction('unprompted')
      recordAnswer(DOMAIN, level, strays.current <= 1)
      scheduleTimeout(() => {
        if (boardIdx + 1 < TOTAL_BOARDS) {
          setLevel(nextLevel(DOMAIN))
          setBoardIdx((b) => b + 1)
          setSolved(false)
          strays.current = 0
        } else {
          complete({ itemsTotal: TOTAL_BOARDS, itemsUnprompted: Math.max(TOTAL_BOARDS - strays.current, 1), completion: 1 })
        }
      }, 1200)
    } else {
      strays.current++
      logAction('cued')
      playSoftCue()
      setWrongIdx(i)
      scheduleTimeout(() => setWrongIdx(null), 550)
    }
  }

  const cellStyle = (isChange: boolean) =>
    solved && isChange ? { borderColor: 'var(--primary-focus)' } : undefined

  return (
    <div className="center-col" style={{ width: '100%', maxWidth: 720, margin: '0 auto' }}>
      <RoundHeader now={boardIdx + 1} total={TOTAL_BOARDS} unit="round" label={`🔍 ${board.sceneName}`} />
      <p className="lead">{lang === 'hi' ? 'दूसरी तस्वीर में एक चीज़ बदली है। बदली हुई चीज़ पहचानिए!' : 'The second picture changed one thing. Tap what is different!'}</p>
      <div className="row mt-sm" style={{ gap: 'var(--s-md)', justifyContent: 'center', flexWrap: 'wrap' }}>
        {[board.cellsA, board.cellsB].map((cells, bi) => (
          <div key={bi} style={{ textAlign: 'center' }}>
            <span className="caption" style={{ fontWeight: 700, color: 'var(--ink)' }}>
              {bi === 0 ? (lang === 'hi' ? 'तस्वीर 1' : 'Picture 1') : (lang === 'hi' ? 'तस्वीर 2 (बदली हुई)' : 'Picture 2 (Changed)')}
            </span>
            <div className="search-scene mt-xs" style={{ gridTemplateColumns: `repeat(${board.cols}, minmax(48px, 76px))` }}>
              {cells.map((v, i) => (
                <button
                  key={i}
                  className={`scene-cell ${bi === 1 && solved && i === board.changedIdx ? 'answer-correct' : ''} ${bi === 1 && wrongIdx === i ? 'answer-guidance' : ''}`}
                  style={bi === 1 ? cellStyle(i === board.changedIdx) : undefined}
                  onClick={() => bi === 1 && tap(i)}
                  disabled={bi === 0 || solved}
                  aria-pressed={bi === 1 && solved && i === board.changedIdx}
                  data-answer-state={bi === 1 && solved && i === board.changedIdx ? 'correct' : bi === 1 && wrongIdx === i ? 'guidance' : 'idle'}
                  aria-label={`${bi === 0 ? 'first' : 'second'} picture tile ${i + 1}${bi === 1 && solved && i === board.changedIdx ? ', changed item' : ''}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <AnswerFeedback state={solved ? 'success' : wrongIdx !== null ? 'guidance' : 'idle'} />
      <p className="caption">{lang === 'hi' ? 'केवल दूसरी तस्वीर पर टैप करें।' : 'Tap the changed item in the second picture.'}</p>
    </div>
  )
}
