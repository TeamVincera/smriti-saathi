import { useEffect, useMemo, useState } from 'react'
import type { GameProps } from './GameHost'
import { shuffle, RoundHeader } from './shared'
import { playChime, playSoftCue } from '../lib/audio'

const ANIMALS = ['🦏', '🐘', '🦚', '🦌', '🐅']
const FOREST = ['🌳', '🌿', '🍃', '🪨', '🌾']

export function WildlifeSafari({ difficulty, logAction, complete }: GameProps) {
  const size = difficulty >= 1 ? 20 : 12
  const targetCount = difficulty >= 1 ? 4 : 3

  const cells = useMemo(() => {
    const animals = shuffle(ANIMALS).slice(0, targetCount)
    const arr: string[] = []
    for (let i = 0; i < targetCount; i++) arr.push(animals[i])
    while (arr.length < size) arr.push(FOREST[Math.floor(Math.random() * FOREST.length)])
    return shuffle(arr.map((v, i) => ({ v, i })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [found, setFound] = useState<string[]>([])
  const [glowCell, setGlowCell] = useState<number | null>(null)

  useEffect(() => {
    if (found.length >= targetCount) return
    const remaining = cells.filter((c) => ANIMALS.includes(c.v) && !found.includes(c.v))
    if (remaining.length === 0) return
    const t = setTimeout(() => setGlowCell(remaining[0].i), 7000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [found])

  function tap(v: string, i: number) {
    if (!ANIMALS.includes(v)) {
      playSoftCue()
      return
    }
    if (found.includes(v)) return
    const next = [...found, v]
    setFound(next)
    setGlowCell(null)
    void playChime()
    logAction('unprompted')
    if (next.length >= targetCount) {
      setTimeout(() => complete({ itemsTotal: targetCount, itemsUnprompted: targetCount, completion: 1 }), 800)
    }
  }

  const cols = size > 12 ? 5 : 4

  return (
    <div className="center-col" style={{ width: '100%' }}>
      <RoundHeader now={found.length} total={targetCount} unit="step" label={`🦏 ${found.length} / ${targetCount} animals found`} />
      <div className="row" style={{ marginTop: 'var(--s-xs)' }}>
        {ANIMALS.slice(0, targetCount).map((a) => (
          <span key={a} className="chip chip-selected" style={{ fontSize: 24 }}>
            {found.includes(a) ? `${a} ✅` : a}
          </span>
        ))}
      </div>
      <p className="lead mt-xs">Find all hidden animals in Kaziranga forest!</p>
      <div className="search-scene mt-sm" style={{ gridTemplateColumns: `repeat(${cols}, minmax(64px, 96px))` }}>
        {cells.map((c) => (
          <button key={c.i} className={`scene-cell ${found.includes(c.v) ? 'found' : ''}`} style={glowCell === c.i ? { animation: 'pulseGentle 1.2s infinite' } : undefined} onClick={() => tap(c.v, c.i)}>
            {c.v}
          </button>
        ))}
      </div>
    </div>
  )
}
