import { useEffect, useRef, useState } from 'react'
import { playChime } from '../../lib/audio'

type BaselineAssessmentProps = {
  t: (key: string, vars?: Record<string, string | number>) => string
  onFinish: (result: { accuracy: number; latencyMs: number }) => void
  onBack: () => void
}

export function BaselineAssessment({ t, onFinish, onBack }: BaselineAssessmentProps) {
  const [round, setRound] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [latencies, setLatencies] = useState<number[]>([])
  const [done, setDone] = useState(false)
  const startTs = useRef(Date.now())

  useEffect(() => {
    startTs.current = Date.now()
  }, [round])

  const questions = [
    { promptKey: 'onb_baseline_p1', instructionKey: 'onb_baseline_instr1', options: ['🌙', '☀️', '⭐'], answer: 1 },
    { promptKey: 'onb_baseline_p2', instructionKey: 'onb_baseline_instr2', options: ['🍃', '🍎', '🐟'], answer: 0 },
    { promptKey: 'onb_baseline_p3', instructionKey: 'onb_baseline_instr3', options: ['🚗', '🌸', '🏠'], answer: 1 },
  ]

  const q = questions[round] ?? questions[0]

  const handlePick = (idx: number) => {
    const lat = Date.now() - startTs.current
    const isCorrect = idx === q.answer
    playChime()
    const nextCorrect = correct + (isCorrect ? 1 : 0)
    const nextLatencies = [...latencies, lat]

    if (round < questions.length - 1) {
      setCorrect(nextCorrect)
      setLatencies(nextLatencies)
      setRound((r) => r + 1)
    } else {
      setDone(true)
      setCorrect(nextCorrect)
      setLatencies(nextLatencies)
    }
  }

  const handleComplete = () => {
    const avgLat = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 800
    const acc = correct / questions.length
    onFinish({ accuracy: acc, latencyMs: avgLat })
  }

  return (
    <section className="onboarding-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
        {t('onb_baseline_title')}
      </h1>

      <div
        className="instruction-bar"
        style={{
          background: 'var(--success-soft)',
          color: 'var(--success-text)',
          fontSize: 13,
          fontWeight: 600,
          padding: '8px 16px',
          borderRadius: 12,
          marginBottom: 16,
          display: 'inline-block',
          border: '1px solid #9FD4B4',
        }}
      >
        {t(q.instructionKey)}
      </div>

      <p style={{ fontSize: 14, color: 'var(--ink-secondary)', marginBottom: 24 }}>
        {t('round_counter', { n: round + 1, total: questions.length })}
      </p>

      <div className="card" style={{ width: '100%', borderRadius: 24, padding: 32, marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink)', marginBottom: 28 }}>
          {t(q.promptKey)}
        </h2>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: done ? 24 : 0 }}>
          {q.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              className="btn btn-secondary choice-btn item-tile"
              onClick={() => handlePick(i)}
              aria-label={opt}
              style={{
                width: 80,
                height: 80,
                fontSize: 36,
                borderRadius: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                cursor: 'pointer',
              }}
            >
              {opt}
            </button>
          ))}
        </div>

        {done && (
          <button
            type="button"
            className="btn btn-cta btn-block"
            onClick={handleComplete}
            style={{ borderRadius: 14, minHeight: 48, marginTop: 12 }}
          >
            {t('onb_done')}
          </button>
        )}
      </div>

      <button type="button" className="btn btn-secondary btn-block" onClick={onBack} style={{ borderRadius: 14, minHeight: 44 }}>
        {t('back')}
      </button>
    </section>
  )
}
