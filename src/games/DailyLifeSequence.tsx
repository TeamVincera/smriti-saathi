import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameProps } from './GameHost'
import { shuffle, RoundHeader } from './shared'
import { playChime, playSoftCue } from '../lib/audio'

interface Step { emoji: string; label: string }

const SEQUENCES: { name: string; steps: Step[] }[] = [
  {
    name: 'Making tea (चाय बनाना)',
    steps: [
      { emoji: '🔥', label: 'Light the stove' },
      { emoji: '🫖', label: 'Boil water' },
      { emoji: '🍃', label: 'Add tea leaves' },
      { emoji: '🥛', label: 'Add milk' },
      { emoji: '🍵', label: 'Pour the tea' },
    ],
  },
  {
    name: 'Preparing tamol (तामोल तैयार करना)',
    steps: [
      { emoji: '🌰', label: 'Take betel nut' },
      { emoji: '🔪', label: 'Cut the nut' },
      { emoji: '🍃', label: 'Wrap in leaf' },
      { emoji: '🤍', label: 'Add lime' },
    ],
  },
]

export function DailyLifeSequence({ difficulty, logAction, complete }: GameProps) {
  const seqs = useMemo(() => (difficulty >= 1 ? SEQUENCES : SEQUENCES.slice(0, 1)), [difficulty])
  const [seqIdx, setSeqIdx] = useState(0)
  const [placed, setPlaced] = useState<number[]>([])
  const [glowItem, setGlowItem] = useState<number | null>(null)
  const unprompted = useRef(0)
  const assisted = useRef(0)

  const seq = seqs[seqIdx]
  const shuffledItems = useMemo(() => shuffle(seq.steps.map((_, i) => i)), [seq])
  const nextSlot = placed.length

  useEffect(() => {
    const t = setTimeout(() => setGlowItem(seq.steps.length ? correctNext() : null), 5000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed])

  function correctNext(): number | null {
    for (const item of shuffledItems) {
      if (!placed.includes(item) && item === placed.length) return item
    }
    return null
  }

  function tapItem(itemIdx: number) {
    if (placed.includes(itemIdx)) return
    const isCorrect = itemIdx === nextSlot
    if (isCorrect) {
      unprompted.current++
      logAction('unprompted')
      void playChime()
    } else {
      assisted.current++
      logAction('cued')
      playSoftCue()
    }
    const next = [...placed, itemIdx]
    setPlaced(next)
    setGlowItem(null)
    if (next.length >= seq.steps.length) {
      setTimeout(() => {
        if (seqIdx + 1 < seqs.length) {
          setSeqIdx((i) => i + 1)
          setPlaced([])
        } else {
          complete({
            itemsTotal: seqs.reduce((s, q) => s + q.steps.length, 0),
            itemsUnprompted: unprompted.current,
            completion: 1,
          })
        }
      }, 1000)
    }
  }

  const remaining = shuffledItems.filter((i) => !placed.includes(i))

  return (
    <div className="center-col" style={{ width: '100%' }}>
      <RoundHeader now={seqIdx + 1} total={seqs.length} unit="round" label={seq.name} />
      <div className="row" style={{ justifyContent: 'center' }}>
        {seq.steps.map((s, slot) => (
          <div key={slot} className={`slot ${slot < placed.length ? 'filled' : ''}`}>
            {slot < placed.length ? (
              <span>{seq.steps[placed[slot]].emoji} {s.label}</span>
            ) : (
              `Step ${slot + 1}`
            )}
          </div>
        ))}
      </div>
      <p className="lead mt-sm">Tap the step that comes next.</p>
      <div className="row" style={{ justifyContent: 'center', gap: 'var(--s-md)' }}>
        {remaining.map((itemIdx) => (
          <button
            key={itemIdx}
            className={`item-tile ${glowItem === itemIdx && glowItem !== null ? 'glow' : ''}`}
            onClick={() => tapItem(itemIdx)}
          >
            <span className="big">{seq.steps[itemIdx].emoji}</span>
            <span className="caption">{seq.steps[itemIdx].label}</span>
          </button>
        ))}
      </div>
      <p className="caption">Pieces snap gently into their right place.</p>
    </div>
  )
}
