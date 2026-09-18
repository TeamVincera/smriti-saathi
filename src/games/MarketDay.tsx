import { useMemo, useRef, useState } from 'react'
import type { GameProps } from './GameHost'
import { RoundHeader } from './shared'
import { sessionRng } from '../lib/rng'
import { genMarketStall } from '../lib/content'
import { nextLevel, recordAnswer } from '../lib/adaptive'
import { playChime, playSoftCue } from '../lib/audio'

const DOMAIN = 'numeracy'

export function MarketDay({ logAction, complete }: GameProps) {
  const rng = useRef(sessionRng('market')).current
  const [level] = useState(() => nextLevel(DOMAIN))
  const stall = useMemo(() => genMarketStall(rng, level), [rng, level])
  const [cart, setCart] = useState<Record<string, number>>({})
  const [budget, setBudget] = useState(stall.budget)
  const [note, setNote] = useState<string | null>(null)
  const unprompted = useRef(0)
  const overdraws = useRef(0)
  const finishedRef = useRef(false)

  const itemCount = Object.values(cart).reduce((a, b) => a + b, 0)
  const targetItems = stall.targetItems
  const spent = Object.entries(cart).reduce((sum, [name, n]) => sum + (stall.goods.find((g) => g.name === name)?.price ?? 0) * n, 0)
  const remaining = budget - spent

  function add(g: { emoji: string; name: string; price: number }) {
    if (itemCount >= targetItems && !cart[g.name]) {
      playSoftCue()
      setNote(`The basket holds ${targetItems} items — tap Finish when ready.`)
      return
    }
    const nextCart = { ...cart, [g.name]: (cart[g.name] ?? 0) + 1 }
    const nextSpent = Object.entries(nextCart).reduce((s, [n, q]) => s + (stall.goods.find((x) => x.name === n)?.price ?? 0) * q, 0)
    if (nextSpent > budget) {
      overdraws.current++
      // The purse grows instead of the patient failing — no math anxiety.
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

  function finish() {
    if (finishedRef.current) return
    if (itemCount === 0) {
      playSoftCue()
      setNote('Choose an item for your basket first — there is no rush.')
      return
    }

    finishedRef.current = true
    recordAnswer(DOMAIN, level, overdraws.current <= 1)
    void playChime()
    complete({ itemsTotal: Math.max(unprompted.current, 1), itemsUnprompted: Math.max(unprompted.current - overdraws.current, 1), completion: 1 })
  }

  return (
    <div className="center-col story-panel">
      <RoundHeader now={Math.min(itemCount, targetItems)} total={targetItems} unit="step" label={`🛒 ${stall.stallName} · ₹${spent}/₹${budget}`} />
      <p className="lead mt-xs">The weekly bazaar — choose items to put in your basket.</p>
      <div className="row mt-xs" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
        <span className="money">₹{spent}</span>
        <span className="muted">spent of ₹{budget}</span>
        <span className="chip chip-blue">Remaining: ₹{Math.max(remaining, 0)}</span>
      </div>

      <div className="grid mt-sm" style={{ width: '100%', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        {stall.goods.map((g) => (
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
              <span>{stall.goods.find((g) => g.name === name)?.emoji}</span>
              <strong>{name}</strong>
              <span className="caption">×{n}</span>
              <span style={{ marginLeft: 'auto' }}>₹{(stall.goods.find((g) => g.name === name)?.price ?? 0) * n}</span>
              <button
                className="btn btn-pearl"
                style={{ minHeight: 48, minWidth: 48 }}
                aria-label={`Remove ${name}`}
                onClick={() => remove(name)}
              >
                —
              </button>
            </div>
          ))}
        </div>
      )}

      {note && <p className="chip mt-sm" role="status" aria-live="polite">{note}</p>}

      <button className="btn btn-primary btn-big mt-md" onClick={finish}>
        🧺 Finish shopping
      </button>
      <p className="caption">The budget always adjusts — shopping should stay joyful.</p>
    </div>
  )
}
