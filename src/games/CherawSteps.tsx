import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameProps } from './GameHost'
import { RoundHeader } from './shared'
import { sessionRng } from '../lib/rng'
import type { Rng } from '../lib/rng'
import { nextLevel, recordAnswer } from '../lib/adaptive'
import { playTap, playChime, playSoftCue } from '../lib/audio'

type Side = 0 | 1

interface Beat {
  side: Side
  gapMs: number
}

function makePattern(rng: Rng, beats: number): Beat[] {
  const baseGap = 700 - Math.min(200, (beats - 4) * 60)
  const out: Beat[] = []
  let side: Side = rng() < 0.5 ? 0 : 1
  for (let i = 0; i < beats; i++) {
    out.push({ side, gapMs: baseGap + ((i * 37) % 2) * 150 })
    if (rng() < 0.7) side = (1 - side) as Side
  }
  return out
}

const DOMAIN = 'rhythm'
const TOTAL_PATTERNS = 3

export function CherawSteps({ logAction, complete }: GameProps) {
  const rng = useRef(sessionRng('cheraw')).current
  const [patternIdx, setPatternIdx] = useState(0)
  const [level, setLevel] = useState(() => nextLevel(DOMAIN))
  const beatCount = useMemo(() => 4 + level, [level])
  const pattern = useMemo(() => makePattern(rng, beatCount), [rng, beatCount, patternIdx])
  const [phase, setPhase] = useState<'listen' | 'play'>('listen')
  const [litSide, setLitSide] = useState<Side | null>(null)
  const [beatIdx, setBeatIdx] = useState(0)
  const [hits, setHits] = useState(0)
  const [missFlash, setMissFlash] = useState(false)
  const patternMisses = useRef(0)
  const cumulativeHits = useRef(0)
  const totalBeats = useRef(0)
  const doneRef = useRef(false)

  useEffect(() => {
    totalBeats.current += pattern.length
  }, [pattern])

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
  }, [phase, pattern])

  function finishPattern() {
    doneRef.current = true
    void playChime()
    recordAnswer(DOMAIN, level, patternMisses.current <= beatCount / 4)
    patternMisses.current = 0
    setTimeout(() => {
      if (patternIdx + 1 < TOTAL_PATTERNS) {
        setLevel(nextLevel(DOMAIN))
        setPatternIdx((p) => p + 1)
        setBeatIdx(0)
        setHits(0)
        setPhase('listen')
        doneRef.current = false
      } else {
        const total = Math.max(totalBeats.current, 1)
        complete({
          itemsTotal: total,
          itemsUnprompted: Math.min(cumulativeHits.current, total),
          completion: 1,
        })
      }
    }, 900)
  }

  useEffect(() => {
    if (phase !== 'play') return
    if (beatIdx >= pattern.length) finishPattern()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beatIdx, phase])

  function tap(side: Side) {
    if (phase !== 'play' || doneRef.current || beatIdx >= pattern.length) return
    if (side === pattern[beatIdx].side) {
      setHits((h) => h + 1)
      cumulativeHits.current++
      playChime()
      logAction('unprompted')
      setBeatIdx((i) => i + 1)
    } else {
      patternMisses.current++
      playSoftCue()
      logAction('cued')
      setMissFlash(true)
      setTimeout(() => setMissFlash(false), 600)
    }
  }

  return (
    <div className="center-col" style={{ width: '100%' }}>
      <RoundHeader now={patternIdx + 1} total={TOTAL_PATTERNS} unit="round" label={`🎵 Rhythm ${hits} / ${pattern.length}`} />
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
