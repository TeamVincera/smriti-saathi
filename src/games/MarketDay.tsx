import { useMemo, useRef, useState } from 'react'
import type { GameProps } from './GameHost'
import { shuffle, RoundHeader } from './shared'
import { playChime, playSoftCue } from '../lib/audio'

interface Good { emoji: string; name: string; price: number }

const GOODS: Good[] = [
  { emoji: '🍅', name: 'Tomatoes', price: 20 },
  { emoji: '🥔', name: 'Potatoes', price: 15 },
  { emoji: '🍌', name: 'Bananas', price: 10 },
  { emoji: '🫑', name: 'Capsicum', price: 25 },
  { emoji: '🥬', name: 'Greens', price: 10 },
  { emoji: '🐟', name: 'Fish', price: 40 },
  { emoji: '🥚', name: 'Eggs', price: 12 },
  { emoji: '🍯', name: 'Honey', price: 35 },
]

export function MarketDay({ difficulty, logAction, complete }: GameProps) {
  const budget0 = difficulty >= 1 ? 60 : 45
  const goods = useMemo(() => shuffle(GOODS).slice(0, 5), [])
  const [cart, setCart] = useState<Record<string, number>>({})
  const [budget, setBudget] = useState(budget0)
  const [note, setNote] = useState<string | null>(null)
  const unprompted = useRef(0)
  const checkedOut = useRef(false)

  const itemCount = Object.values(cart).reduce((a, b) => a + b, 0)
  const targetItems = 3
  const spent = Object.entries(cart).reduce((sum, [name, n]) => sum + (goods.find((g) => g.name === name)?.price ?? 0) * n, 0)
  const remaining = budget - spent

  function add(g: Good) {
    if (checkedOut.current) return
    const nextCart = { ...cart, [g.name]: (cart[g.name] ?? 0) + 1 }
    const nextSpent = Object.entries(nextCart).reduce((s, [n, q]) => s + (goods.find((x) => x.name === n)?.price ?? 0) * q, 0)
    if (nextSpent > budget) {
      playSoftCue()
      setBudget((b) => b + 15)
      setNote(`The purse grew a little — ₹${budget + 15} to spend. No worry!`)
      return
    }
    setCart(nextCart)
    unprompted.current++
    logAction('unprompted')
    void playChime()
    setNote(null)
  }

  function remove(name: string) {
    setCart(({ [name]: _, ...rest }) => rest)
  }

  return (
    <div className="center-col story-panel">
      <RoundHeader now={Math.min(itemCount, targetItems)} total={targetItems} unit="step" label={`🛒 ${itemCount} items in basket · ₹${spent}/₹${budget}`} />
      <p className="lead mt-xs">The Monday bazaar — choose items to put in your basket.</p>
      <div className="row mt-xs" style={{ justifyContent: 'center' }}>
        <span className="money">₹{spent}</span>
        <span className="muted">spent of ₹{budget}</span>
        <span className="chip chip-blue">Remaining: ₹{Math.max(remaining, 0)}</span>
      </div>

      <div className="grid mt-sm" style={{ width: '100%', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        {goods.map((g) => (
          <button key={g.name} className="choice-btn" onClick={() => add(g)}>
            <span className="big">{g.emoji}</span>
            <strong>{g.name}</strong>
            <span className="caption">₹{g.price}</span>
            {cart[g.name] ? <span className="chip chip-blue">×{cart[g.name]}</span> : null}
          </button>
        ))}
      </div>

      {Object.keys(cart).length > 0 && (
        <div className="card card-parchment mt-md" style={{ width: '100%' }}>
          {Object.entries(cart).map(([name, n]) => (
            <div key={name} className="market-row">
              <span>{goods.find((g) => g.name === name)?.emoji}</span>
              <strong>{name}</strong>
              <span className="caption">×{n}</span>
              <span style={{ marginLeft: 'auto' }}>₹{(goods.find((g) => g.name === name)?.price ?? 0) * n}</span>
              <button className="btn btn-pearl" style={{ minHeight: 40 }} onClick={() => remove(name)}>—</button>
            </div>
          ))}
        </div>
      )}

      {note && <p className="chip mt-sm">{note}</p>}

      <button
        className="btn btn-primary btn-big mt-md"
        onClick={() => {
          checkedOut.current = true
          void playChime()
          complete({ itemsTotal: Math.max(itemCount, 1), itemsUnprompted: Math.max(unprompted.current, 1), completion: 1 })
        }}
      >
        🧺 Finish shopping
      </button>
      <p className="caption">The budget always adjusts — shopping should stay joyful.</p>
    </div>
  )
}
