import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameProps } from './GameHost'
import { RoundHeader } from './shared'
import { sessionRng } from '../lib/rng'
import { genLoomRound } from '../lib/content'
import { nextLevel, recordAnswer } from '../lib/adaptive'
import { playChime, playSoftCue } from '../lib/audio'
import { useApp } from '../state'

const TOTAL = 5
const DOMAIN = 'pattern'

export function WeaversLoom({ logAction, complete }: GameProps) {
  const { lang } = useApp()
  const rng = useRef(sessionRng('loom')).current
  const [roundIdx, setRoundIdx] = useState(0)
  const [level, setLevel] = useState(() => nextLevel(DOMAIN))
  const round = useMemo(() => genLoomRound(rng, level), [rng, level, roundIdx])
  const [picked, setPicked] = useState<string | null>(null)
  const [glow, setGlow] = useState<string | null>(null)
  const unprompted = useRef(0)

  useEffect(() => {
    const t = setTimeout(() => setGlow(round.missing), 4000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx])

  function pick(m: string) {
    if (picked) return
    setPicked(m)
    const correct = m === round.missing
    recordAnswer(DOMAIN, level, correct)
    if (correct) {
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
      } else {
        setLevel(nextLevel(DOMAIN))
        setRoundIdx((i) => i + 1)
      }
    }, 1200)
  }

  return (
    <div className="center-col" style={{ width: '100%' }}>
      <RoundHeader now={roundIdx + 1} total={TOTAL} />
      <p className="lead">{lang === 'hi' ? 'बुनाई पूरी करें।' : 'Complete the weave.'}</p>
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
      <p className="caption">{lang === 'hi' ? 'एक बुनाई नमूना — गायब नमूना खोजें।' : 'A loom pattern — find the missing motif.'}</p>
      <div className="row" style={{ justifyContent: 'center', gap: 'var(--s-md)' }}>
        {round.options.map((o) => (
          <button
            key={o}
            className={`choice-btn ${picked === o ? (o === round.missing ? 'correct' : 'wrong') : ''} ${glow === o ? 'glow' : ''}`}
            onClick={() => pick(o)}
          >
            <span className="big">{o}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
