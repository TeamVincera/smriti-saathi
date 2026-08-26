import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameProps } from './GameHost'
import { shuffle, RoundHeader } from './shared'
import { playChime, playSoftCue } from '../lib/audio'

interface Item { emoji: string; label: string; cat: 0 | 1 }

const CATEGORIES = [
  { name: 'Fruit basket', emoji: '🧺' },
  { name: 'Tool basket', emoji: '🪣' },
]

const ITEMS: Item[] = [
  { emoji: '🍎', label: 'Apple', cat: 0 },
  { emoji: '🍌', label: 'Banana', cat: 0 },
  { emoji: '🍊', label: 'Orange', cat: 0 },
  { emoji: '🍇', label: 'Grapes', cat: 0 },
  { emoji: '🔨', label: 'Hammer', cat: 1 },
  { emoji: '🪓', label: 'Axe', cat: 1 },
  { emoji: '🔧', label: 'Wrench', cat: 1 },
  { emoji: '⛏️', label: 'Pickaxe', cat: 1 },
  { emoji: '🍍', label: 'Pineapple', cat: 0 },
  { emoji: '🪚', label: 'Saw', cat: 1 },
]

const TOTAL = 5

export function BambooCrafting({ difficulty, logAction, complete }: GameProps) {
  const [idx, setIdx] = useState(0)
  const [placed, setPlaced] = useState(false)
  const [glowCat, setGlowCat] = useState<0 | 1 | null>(null)
  const unprompted = useRef(0)

  const queue = useMemo(() => shuffle(ITEMS).slice(0, TOTAL), [])
  const item = queue[idx]

  useEffect(() => {
    const t = setTimeout(() => setGlowCat(item.cat), 4500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx])

  if (!item) return null

  function place(cat: 0 | 1) {
    if (placed) return
    setPlaced(true)
    if (cat === item.cat) {
      unprompted.current++
      logAction('unprompted')
      void playChime()
    } else {
      logAction('cued')
      playSoftCue()
      setGlowCat(item.cat)
    }
    setTimeout(() => {
      setPlaced(false)
      setGlowCat(null)
      if (idx + 1 >= TOTAL) {
        complete({ itemsTotal: TOTAL, itemsUnprompted: unprompted.current, completion: 1 })
      } else setIdx((i) => i + 1)
    }, 1000)
  }

  return (
    <div className="center-col" style={{ width: '100%' }}>
      <RoundHeader now={idx + 1} total={TOTAL} />
      <p className="lead">Where does this belong?</p>
      <button className={`choice-btn ${placed ? 'correct' : ''}`} style={{ minWidth: 180 }}>
        <span className="big">{item.emoji}</span>
        <span className="caption">{item.label}</span>
      </button>
      <div className="row" style={{ justifyContent: 'center', gap: 'var(--s-lg)', marginTop: 'var(--s-md)' }}>
        {CATEGORIES.map((c, ci) => (
          <button
            key={c.name}
            className={`choice-btn ${glowCat === ci ? 'glow' : ''}`}
            style={{ minWidth: 170 }}
            onClick={() => place(ci as 0 | 1)}
          >
            <span className="big">{c.emoji}</span>
            <span className="title" style={{ fontSize: 'var(--fs-body)' }}>{c.name}</span>
          </button>
        ))}
      </div>
      <p className="caption">The right basket will glow softly to help you.</p>
    </div>
  )
}
