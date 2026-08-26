import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameProps } from './GameHost'
import { RoundHeader } from './shared'
import { playChime, playTap } from '../lib/audio'

interface Cell { r: number; c: number }

function makePath(n: number): Cell[] {
  const path: Cell[] = [{ r: 0, c: 0 }]
  let r = 0
  let c = 0
  while (r < n - 1 || c < n - 1) {
    const canDown = r < n - 1
    const canRight = c < n - 1
    if (canDown && canRight) {
      if (Math.random() < 0.5) r++
      else c++
    } else if (canDown) r++
    else c++
    path.push({ r, c })
  }
  return path
}

export function TeaGardenWalk({ difficulty, logAction, complete }: GameProps) {
  const n = difficulty >= 1 ? 4 : 3
  const path = useMemo(() => makePath(n), [n])
  const [step, setStep] = useState(0)
  const [glowCell, setGlowCell] = useState<Cell | null>(null)
  const leavesTotal = Math.max(1, Math.floor((path.length - 1) / 2))
  const leafCells = useMemo(() => new Set(path.slice(1).map((c) => `${c.r}-${c.c}`).slice(0, leavesTotal)), [path])
  const collected = useRef(0)
  const unprompted = useRef(0)
  const doneRef = useRef(false)

  const nextCell = path[Math.min(step + 1, path.length - 1)]

  useEffect(() => {
    const t = setTimeout(() => setGlowCell(nextCell), 4500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  function tap(r: number, c: number) {
    if (doneRef.current) return
    if (r === nextCell.r && c === nextCell.c) {
      const isLeaf = leafCells.has(`${r}-${c}`)
      if (isLeaf) {
        collected.current++
        void playChime()
      } else {
        playTap()
      }
      if (step >= 1) unprompted.current++
      if (step >= 1) logAction('unprompted')
      const nextStep = step + 1
      setStep(nextStep)
      setGlowCell(null)
      if (nextStep >= path.length - 1) {
        doneRef.current = true
        setTimeout(() => {
          complete({
            itemsTotal: path.length - 1,
            itemsUnprompted: unprompted.current,
            completion: 1,
          })
        }, 800)
      }
    }
  }

  const workerPos = path[Math.min(step, path.length - 1)]

  return (
    <div className="center-col" style={{ width: '100%' }}>
      <RoundHeader now={Math.min(step + 1, path.length)} total={path.length} unit="step" label={`🍃 ${collected.current} / ${leavesTotal} leaves`} />
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
