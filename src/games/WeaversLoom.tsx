import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameProps } from './GameHost'
import { shuffle, RoundHeader } from './shared'
import { playChime, playSoftCue } from '../lib/audio'

const EASY_MOTIFS = ['🔺', '🟥', '🟡']
const HARD_MOTIFS = ['🔺', '🟥', '🟡', '🟢', '⭐']
const TOTAL = 5

export function WeaversLoom({ difficulty, logAction, complete }: GameProps) {
  const motifs = difficulty >= 1 ? HARD_MOTIFS : EASY_MOTIFS
  const [roundIdx, setRoundIdx] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [glow, setGlow] = useState<string | null>(null)
  const unprompted = useRef(0)

  const rounds = useMemo(
    () =>
      Array.from({ length: TOTAL }, () => {
        const a = shuffle(motifs)[0]
        let b = shuffle(motifs)[0]
        if (b === a) b = motifs[(motifs.indexOf(a) + 1) % motifs.length]
        const pattern = [a, b, a, b]
        const missingIdx = Math.floor(Math.random() * pattern.length)
        return {
          pattern,
          missing: pattern[missingIdx],
          missingIdx,
          options: shuffle([pattern[missingIdx], ...shuffle(motifs.filter((m) => m !== pattern[missingIdx])).slice(0, 2)]),
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const round = rounds[roundIdx]

  useEffect(() => {
    const t = setTimeout(() => setGlow(round.missing), 5500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx])

  if (!round) return null

  function pick(m: string) {
    if (picked) return
    setPicked(m)
    if (m === round.missing) {
      unprompted.current++
      logAction('unprompted')
      void playChime()
    } else {
      logAction('cued')
      playSoftCue()
      setGlow(round.missing)
    }
    setTimeout(() => {
      setPicked(null)
      setGlow(null)
      if (roundIdx + 1 >= TOTAL) {
        complete({ itemsTotal: TOTAL, itemsUnprompted: unprompted.current, completion: 1 })
      } else setRoundIdx((i) => i + 1)
    }, 1200)
  }

  return (
    <div className="center-col" style={{ width: '100%' }}>
      <RoundHeader now={roundIdx + 1} total={TOTAL} />
      <p className="lead">Complete the gamosa weave.</p>
      <div className="row" style={{ gap: 10 }}>
        {round.pattern.map((m, i) =>
          i === round.missingIdx ? (
            <div
              key={i}
              className={`scene-cell ${picked ? (m === picked ? 'found' : '') : ''}`}
              style={{ width: 76, height: 76, fontSize: 40, background: picked ? undefined : 'var(--parchment)', color: 'var(--ink-muted-48)' }}
            >
              {picked ? m : '?'}
            </div>
          ) : (
            <div key={i} className="scene-cell" style={{ width: 76, height: 76, fontSize: 40 }}>
              {m}
            </div>
          )
        )}
      </div>
      <p className="caption">A gamosa of the loom — find the missing motif.</p>
      <div className="row" style={{ justifyContent: 'center', gap: 'var(--s-md)' }}>
        {round.options.map((o) => (
          <button key={o} className={`choice-btn ${picked && o === round.missing ? 'correct' : ''} ${glow === o ? 'glow' : ''}`} onClick={() => pick(o)}>
            <span className="big">{o}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
