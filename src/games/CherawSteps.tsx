import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameProps } from './GameHost'
import { RoundHeader } from './shared'
import { playTap, playChime, playSoftCue } from '../lib/audio'

type Side = 0 | 1

interface Beat {
  side: Side
  gapMs: number
}

function makePattern(beats: number): Beat[] {
  const out: Beat[] = []
  let side: Side = Math.random() < 0.5 ? 0 : 1
  for (let i = 0; i < beats; i++) {
    out.push({ side, gapMs: 700 + (i % 2) * 150 })
    if (Math.random() < 0.7) side = (1 - side) as Side
  }
  return out
}

export function CherawSteps({ difficulty, logAction, complete }: GameProps) {
  const beatCount = difficulty >= 1 ? 6 : 4
  const pattern = useMemo(() => makePattern(beatCount), [beatCount])
  const [phase, setPhase] = useState<'listen' | 'play'>('listen')
  const [litSide, setLitSide] = useState<Side | null>(null)
  const [beatIdx, setBeatIdx] = useState(0)
  const [hits, setHits] = useState(0)
  const [missFlash, setMissFlash] = useState(false)
  const unprompted = useRef(0)
  const doneRef = useRef(false)

  useEffect(() => {
    if (phase !== 'listen') return
    let cancelled = false
    let t: ReturnType<typeof setTimeout>
    const run = (i: number) => {
      if (cancelled || i >= pattern.length) {
        if (!cancelled) setTimeout(() => setPhase('play'), 500)
        return
      }
      setLitSide(pattern[i].side)
      playTap()
      t = setTimeout(() => {
        setLitSide(null)
        t = setTimeout(() => run(i + 1), pattern[i].gapMs - 350)
      }, 320)
    }
    run(0)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  useEffect(() => {
    if (phase !== 'play') return
    if (beatIdx >= pattern.length) {
      doneRef.current = true
      void playChime()
      setTimeout(() => complete({ itemsTotal: pattern.length, itemsUnprompted: Math.max(hits, unprompted.current), completion: 1 }), 900)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beatIdx, phase])

  function tap(side: Side) {
    if (phase !== 'play' || doneRef.current || beatIdx >= pattern.length) return
    if (side === pattern[beatIdx].side) {
      unprompted.current++
      setHits((h) => h + 1)
      playChime()
      logAction('unprompted')
      setBeatIdx((i) => i + 1)
    } else {
      playSoftCue()
      logAction('cued')
      setMissFlash(true)
      setTimeout(() => setMissFlash(false), 600)
    }
  }

  return (
    <div className="center-col" style={{ width: '100%' }}>
      <RoundHeader now={Math.min(beatIdx + 1, pattern.length)} total={pattern.length} unit="round" label={`🎵 Rhythm ${hits} / ${pattern.length}`} />
      <p className="lead">{phase === 'listen' ? 'Listen to the bamboo clapping…' : 'Now tap the same side as the bamboo!'}</p>
      <div className="row" style={{ gap: 'var(--s-xl)', justifyContent: 'center' }}>
        {[0, 1].map((s) => (
          <button
            key={s}
            className={`rhythm-pad ${litSide === s ? 'lit' : ''} ${missFlash && s === 1 - pattern[Math.min(beatIdx, pattern.length - 1)].side ? 'hit' : ''}`}
            onClick={() => tap(s as Side)}
            aria-label={s === 0 ? 'Left bamboo' : 'Right bamboo'}
          >
            {litSide === s ? '👏' : '🎋'}
            <br />
            {s === 0 ? 'LEFT' : 'RIGHT'}
          </button>
        ))}
      </div>
      <p className="caption">The Cheraw dance of Mizoram — no wrong step can stop the music.</p>
    </div>
  )
}
