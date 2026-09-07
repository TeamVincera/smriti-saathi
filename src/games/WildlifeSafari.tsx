import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameProps } from './GameHost'
import { RoundHeader } from './shared'
import { sessionRng } from '../lib/rng'
import { genSafariScene } from '../lib/content'
import { nextLevel, recordAnswer } from '../lib/adaptive'
import { playChime, playSoftCue } from '../lib/audio'

const DOMAIN = 'visualsearch'
const TOTAL_SCENES = 2

export function WildlifeSafari({ logAction, complete }: GameProps) {
  const rng = useRef(sessionRng('safari')).current
  const [sceneIdx, setSceneIdx] = useState(0)
  const [level, setLevel] = useState(() => nextLevel(DOMAIN))
  const scene = useMemo(() => genSafariScene(rng, level), [rng, level, sceneIdx])
  const [found, setFound] = useState<string[]>([])
  const [glowCell, setGlowCell] = useState<number | null>(null)
  const strayTapsThisScene = useRef(0)
  const unpromptedTotal = useRef(0)
  const totalTargets = useRef(0)

  const targetCount = scene.targets.length

  useEffect(() => {
    totalTargets.current += scene.targets.length
  }, [scene])

  useEffect(() => {
    if (found.length >= targetCount) return
    const remaining = scene.cells.filter((c) => scene.targets.includes(c.v) && !found.includes(c.v))
    if (remaining.length === 0) return
    const t = setTimeout(() => setGlowCell(remaining[0].i), 4000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [found])

  const [wrongCell, setWrongCell] = useState<number | null>(null)

  function tap(v: string, i: number) {
    if (!scene.targets.includes(v)) {
      strayTapsThisScene.current++
      logAction('cued')
      playSoftCue()
      setWrongCell(i)
      setTimeout(() => setWrongCell(null), 550)
      return
    }
    if (found.includes(v)) return
    const next = [...found, v]
    setFound(next)
    setGlowCell(null)
    void playChime()
    logAction('unprompted')
    unpromptedTotal.current++
    if (next.length >= targetCount) {
      recordAnswer(DOMAIN, level, strayTapsThisScene.current <= 1)
      setTimeout(() => {
        if (sceneIdx + 1 < TOTAL_SCENES) {
          setLevel(nextLevel(DOMAIN))
          setSceneIdx((s) => s + 1)
          setFound([])
          strayTapsThisScene.current = 0
        } else {
          const total = Math.max(totalTargets.current, 1)
          complete({
            itemsTotal: total,
            itemsUnprompted: Math.min(unpromptedTotal.current, total),
            completion: 1,
          })
        }
      }, 800)
    }
  }

  return (
    <div className="center-col" style={{ width: '100%' }}>
      <RoundHeader now={sceneIdx + 1} total={TOTAL_SCENES} unit="round" label={`🌿 ${scene.sceneName}`} />
      <div className="row mt-xs" style={{ gap: 8 }}>
        {scene.targets.map((t) => (
          <span key={t} className={`chip ${found.includes(t) ? 'chip-found' : ''}`} style={{ fontSize: 24, padding: '4px 12px' }}>
            {t}
          </span>
        ))}
      </div>
      <p className="lead mt-xs">Find all hidden animals in the {scene.sceneName.toLowerCase()}!</p>
      <div className="search-scene mt-sm" style={{ gridTemplateColumns: `repeat(${scene.cols}, minmax(64px, 96px))` }}>
        {scene.cells.map((c) => (
          <button
            key={c.i}
            className={`scene-cell ${found.includes(c.v) ? 'found' : ''} ${wrongCell === c.i ? 'wrong' : ''}`}
            style={glowCell === c.i ? { animation: 'pulseGentle 1.2s infinite' } : undefined}
            onClick={() => tap(c.v, c.i)}
          >
            {c.v}
          </button>
        ))}
      </div>
    </div>
  )
}
