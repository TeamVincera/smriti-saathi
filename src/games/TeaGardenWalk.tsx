import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameProps } from './GameHost'
import { RoundHeader } from './shared'
import { sessionRng } from '../lib/rng'
import type { Rng } from '../lib/rng'
import { nextLevel, recordAnswer } from '../lib/adaptive'
import { playChime, playTap, playSoftCue } from '../lib/audio'

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
  const rng = useRef(sessionRng('teawalk')).current
  const [walkIdx, setWalkIdx] = useState(0)
  const [level, setLevel] = useState(() => nextLevel(DOMAIN))
  const n = useMemo(() => Math.min(5, 3 + Math.floor(level / 2)), [level])
  const path = useMemo(() => makePath(rng, n), [rng, n, walkIdx])
  const [step, setStep] = useState(0)
  const [glowCell, setGlowCell] = useState<Cell | null>(null)
  const leavesTotal = Math.max(1, Math.floor((path.length - 1) / 2))
  const leafCells = useMemo(() => new Set(path.slice(1).map((c) => `${c.r}-${c.c}`).slice(0, leavesTotal)), [path, leavesTotal])
  const collected = useRef(0)
  const unpromptedSteps = useRef(0)
  const totalSteps = useRef(0)
  const doneRef = useRef(false)

  const nextCell = path[Math.min(step + 1, path.length - 1)]

  useEffect(() => {
    totalSteps.current += Math.max(path.length - 1, 1)
  }, [path])

  useEffect(() => {
    const t = setTimeout(() => setGlowCell(nextCell), 4500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  function tap(r: number, c: number) {
    if (doneRef.current) return
    if (r === nextCell.r && c === nextCell.c) {
      unpromptedSteps.current++
      const isLeaf = leafCells.has(`${r}-${c}`)
      if (isLeaf) {
        collected.current++
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
    <div className="center-col" style={{ width: '100%' }}>
      <RoundHeader now={walkIdx + 1} total={TOTAL_WALKS} unit="round" label={`🍃 ${collected.current} / ${leavesTotal} leaves`} />
      <p className="lead">Walk the tea garden path — tap the next tile.</p>
      <div className="search-scene" style={{ gridTemplateColumns: `repeat(${n}, minmax(64px, 92px))`, maxWidth: n * 110 }}>
        {Array.from({ length: n * n }, (_, i) => {
          const r = Math.floor(i / n)
          const c = i % n
          const key = `${r}-${c}`
          const onPath = path.some((p) => p.r === r && p.c === c)
          const worker = workerPos.r === r && workerPos.c === c
          const isLeaf = leafCells.has(key)
          const glow = glowCell && glowCell.r === r && glowCell.c === c
          return (
            <button key={key} className={`scene-cell ${worker ? 'found' : ''}`} style={glow ? { animation: 'pulseGentle 1.2s infinite', borderColor: 'var(--primary-focus)' } : undefined} onClick={() => tap(r, c)} aria-label={`tile ${r + 1},${c + 1}`}>
              {worker ? '👩‍🌾' : isLeaf ? '🍃' : ''}
              {!worker && !isLeaf ? (onPath ? '🌱' : ['🌳', '🌿', '🪨'][i % 3]) : ''}
            </button>
          )
        })}
      </div>
      <p className="caption">Collect every tea leaf 🍃</p>
    </div>
  )
}
