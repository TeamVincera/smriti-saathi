import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameProps } from './GameHost'
import { RoundHeader } from './shared'
import { sessionRng } from '../lib/rng'
import type { Rng } from '../lib/rng'
import { nextLevel, recordAnswer } from '../lib/adaptive'
import { playChime, playTap, playSoftCue } from '../lib/audio'
import { useApp } from '../state'

interface Cell { r: number; c: number }

function makePath(rng: Rng, n: number): Cell[] {
  const path: Cell[] = [{ r: 0, c: 0 }]
  let r = 0
  let c = 0
  while (r < n - 1 || c < n - 1) {
    const canDown = r < n - 1
    const canRight = c < n - 1
    if (canDown && canRight) {
      if (rng() < 0.5) r++
      else c++
    } else if (canDown) r++
    else c++
    path.push({ r, c })
  }
  return path
}

const DOMAIN = 'visuospatial'
const TOTAL_WALKS = 2


export function TeaGardenWalk({ logAction, complete }: GameProps) {
  const { lang, t } = useApp()
  const rng = useRef(sessionRng('teawalk')).current
  const [walkIdx, setWalkIdx] = useState(0)
  const [level, setLevel] = useState(() => nextLevel(DOMAIN))
  const n = useMemo(() => Math.min(5, 3 + Math.floor(level / 2)), [level])
  const path = useMemo(() => makePath(rng, n), [rng, n, walkIdx])
  const [step, setStep] = useState(0)
  const [glowCell, setGlowCell] = useState<Cell | null>(null)
  const leavesTotal = Math.max(1, Math.floor((path.length - 1) / 2))
  const leafCells = useMemo(() => new Set(path.slice(1).map((c) => `${c.r}-${c.c}`).slice(0, leavesTotal)), [path, leavesTotal])
  const [leavesCollected, setLeavesCollected] = useState(0)
  const unpromptedSteps = useRef(0)
  const totalSteps = useRef(0)
  const doneRef = useRef(false)

  const nextCell = path[Math.min(step + 1, path.length - 1)]

  useEffect(() => {
    totalSteps.current += Math.max(path.length - 1, 1)
  }, [path])

  useEffect(() => {
    const t = setTimeout(() => setGlowCell(nextCell), 4000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  function tap(r: number, c: number) {
    if (doneRef.current) return
    if (r === nextCell.r && c === nextCell.c) {
      unpromptedSteps.current++
      const isLeaf = leafCells.has(`${r}-${c}`)
      if (isLeaf) {
        setLeavesCollected((c) => c + 1)
        void playChime()
      } else {
        playTap()
      }
      logAction('unprompted')
      const nextStep = step + 1
      setStep(nextStep)
      setGlowCell(null)
      if (nextStep >= path.length - 1) {
        recordAnswer(DOMAIN, level, true)
        setTimeout(() => {
          if (walkIdx + 1 < TOTAL_WALKS) {
            setLevel(nextLevel(DOMAIN))
            setWalkIdx((w) => w + 1)
            setStep(0)
            setLeavesCollected(0)
            doneRef.current = false
          } else {
            doneRef.current = true
            const total = Math.max(totalSteps.current, 1)
            complete({
              itemsTotal: total,
              itemsUnprompted: Math.min(unpromptedSteps.current, total),
              completion: 1,
            })
          }
        }, 800)
      }
    } else {
      playSoftCue()
      logAction('cued')
    }
  }

  const workerPos = path[Math.min(step, path.length - 1)]

  return (
    <div className="center-col" style={{ width: '100%', maxWidth: 460, margin: '0 auto' }}>
      <RoundHeader now={walkIdx + 1} total={TOTAL_WALKS} unit="round" label={`🍃 ${leavesCollected} / ${leavesTotal}`} />
      <p className="lead" style={{ textAlign: 'center', marginBottom: 12 }}>
        {t('g_teawalk_intro')}
      </p>
      <div
        className="search-scene"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
          gap: 6,
          width: '100%',
          maxWidth: 400,
          aspectRatio: '1/1',
        }}
      >
        {Array.from({ length: n * n }, (_, i) => {
          const r = Math.floor(i / n)
          const c = i % n
          const key = `${r}-${c}`
          const onPath = path.some((p) => p.r === r && p.c === c)
          const worker = workerPos.r === r && workerPos.c === c
          const isLeaf = leafCells.has(key)
          const glow = glowCell && glowCell.r === r && glowCell.c === c
          return (
            <button
              key={key}
              className={`scene-cell ${worker ? 'found' : ''}`}
              style={{
                width: '100%',
                height: '100%',
                minHeight: 48,
                fontSize: 'clamp(18px, 5vw, 28px)',
                ...(glow ? { animation: 'pulseGentle 1.2s infinite', borderColor: 'var(--primary-focus)' } : {}),
              }}
              onClick={() => tap(r, c)}
              aria-label={`tile ${r + 1},${c + 1}`}
            >
              {worker ? '👩‍🌾' : isLeaf ? '🍃' : ''}
              {!worker && !isLeaf ? (onPath ? '🌱' : ['🌳', '🌿', '🪨'][i % 3]) : ''}
            </button>
          )
        })}
      </div>
      <p className="caption" style={{ marginTop: 12, color: 'var(--ink-muted)' }}>
        🍃 {lang === 'hi' ? 'सारी चाय की पत्तियां इकट्ठा करें' : 'Collect every tea leaf'}
      </p>
    </div>
  )
}
