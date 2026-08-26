import { useEffect, useState } from 'react'
import { useApp } from '../state'
import { loadGarden } from '../lib/db'
import type { GardenState as G } from '../lib/types'

const TIERS = [
  { at: 0, label: 'Bare soil — every journey starts here', scene: ['🟫', '🟫', '🟫'] },
  { at: 3, label: 'First sprouts appear!', scene: ['🌱', '🟫', '🟫'] },
  { at: 8, label: 'Saplings sway gently', scene: ['🌿', '🌱', '🌿'] },
  { at: 15, label: 'Buds are forming', scene: ['🌷', '🌿', '🌱'] },
  { at: 25, label: 'Orchids begin to bloom', scene: ['🌸', '🌷', '🌺'] },
  { at: 40, label: 'A riot of orchids!', scene: ['🌺', '🌸', '🪷'] },
  { at: 60, label: 'Your garden sings with birds', scene: ['🌺', '🐦', '🪷'] },
]

export function Garden() {
  const { t, sessionsToday } = useApp()
  const [g, setG] = useState<G>({ points: 0, plantedFlowers: 0, wateredDates: [], history: [] })

  useEffect(() => {
    void loadGarden().then(setG)
    const iv = setInterval(() => void loadGarden().then(setG), 4000)
    return () => clearInterval(iv)
  }, [])

  const tier = [...TIERS].reverse().find((tr) => g.points >= tr.at) ?? TIERS[0]
  const nextTier = TIERS.find((tr) => tr.at > g.points)
  const pct = nextTier ? Math.min(100, ((g.points - tier.at) / (nextTier.at - tier.at)) * 100) : 100
  const today = new Date().toDateString()
  const wateredToday = g.wateredDates.includes(today)

  return (
    <div className="page enter-anim">
      <section className="tile-section" style={{ padding: 'var(--s-xl)', borderRadius: 'var(--r-lg)', background: 'var(--parchment)' }}>
        <div className="tile-inner">
          <h1 className="hero-title">{t('nav_garden')}</h1>
          <p className="lead">Every finished game and every medicine waters this garden.</p>
          <div className="garden-canvas card" style={{ padding: 'var(--s-xxl) var(--s-lg)', background: 'linear-gradient(180deg, #eaf4ff 0%, #f6fbf2 55%, #e7f3dd 100%)' }}>
            <div className="row" style={{ justifyContent: 'center', gap: 'clamp(24px, 7vw, 90px)', fontSize: 'clamp(56px, 11vw, 110px)' }}>
              {tier.scene.map((s, i) => (
                <span key={i} style={{ animation: `sway ${3 + i}s ease-in-out infinite`, display: 'inline-block' }}>{s}</span>
              ))}
            </div>
            <p className="lead mt-lg" style={{ textAlign: 'center' }}>{tier.label}</p>
          </div>
          <div className="progress-track" style={{ width: 'min(420px, 80vw)' }}>
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="caption">
            🌟 {g.points} garden points{nextTier ? ` · ${nextTier.at - g.points} to ${nextTier.label.toLowerCase()}` : ' · fully bloomed!'}
          </span>
        </div>
      </section>

      <section className="grid mt-xl" style={{ maxWidth: 900, marginInline: 'auto' }}>
        <div className="card center-col">
          <span style={{ fontSize: 44 }}>{wateredToday ? '💧✅' : '💧'}</span>
          <strong>Medicine watering</strong>
          <p className="caption">{wateredToday ? "Today's doses have been taken — flowers watered!" : 'Take your medicines to water the flowers.'}</p>
        </div>
        <div className="card center-col">
          <span style={{ fontSize: 44 }}>🎮</span>
          <strong>Sessions today</strong>
          <p className="caption">{sessionsToday === 0 ? 'No sessions yet today.' : `${sessionsToday} session${sessionsToday > 1 ? 's' : ''} completed — wonderful.`}</p>
        </div>
      </section>

      {g.history.length > 0 && (
        <section className="mt-xl" style={{ maxWidth: 900, marginInline: 'auto' }}>
          <h2 className="display-md">Recent growth</h2>
          <div className="stack mt-md">
            {[...g.history].reverse().slice(0, 6).map((h, i) => (
              <div key={i} className="card row-between">
                <span>{h.reason === 'med' ? '💊 Medicine taken' : h.reason === 'session' ? '🎮 Game completed' : '💧 Watering'}</span>
                <span className="caption">
                  {new Date(h.ts).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })} · +{h.points}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
