import { useEffect, useRef, useState } from 'react'
import type { GameProps } from './GameHost'
import { RoundHeader, useGameTimeout } from './shared'
import { useApp } from '../state'
import { playChime } from '../lib/audio'

const FLOWERS = ['🌺', '🌸', '🏵️', '🌼', '🪷']

export function MemoryGardenGame({ logAction, complete }: GameProps) {
  const { lang, t, sessionsToday } = useApp()
  const [phase, setPhase] = useState<'breathe' | 'water'>('breathe')
  const [breathCount, setBreathCount] = useState(0)
  const [breathState, setBreathState] = useState<'in' | 'out'>('in')
  const [watered, setWatered] = useState<number[]>([])
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => (
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  ))
  const scheduleTimeout = useGameTimeout()
  const doneRef = useRef(false)
  const flowers = FLOWERS.slice(0, 3)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches)
    updatePreference()
    mediaQuery.addEventListener?.('change', updatePreference)
    return () => mediaQuery.removeEventListener?.('change', updatePreference)
  }, [])

  useEffect(() => {
    if (phase !== 'breathe') return
    const iv = setInterval(() => {
      setBreathState((s) => (s === 'in' ? 'out' : 'in'))
      setBreathCount((c) => c + 1)
    }, 4000)
    return () => clearInterval(iv)
  }, [phase])

  useEffect(() => {
    if (phase === 'breathe' && breathCount >= 4) {
      setPhase('water')
    }
  }, [phase, breathCount])

  useEffect(() => {
    if (!doneRef.current && phase === 'water' && watered.length >= flowers.length) {
      doneRef.current = true
      playChime()
      scheduleTimeout(() => complete({ itemsTotal: flowers.length, itemsUnprompted: flowers.length, completion: 1 }), 1000)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watered])

  const gardenStatus = phase === 'breathe'
    ? (breathState === 'in'
      ? (lang === 'hi' ? 'धीरे से सांस अंदर लें।' : 'Breathe in gently.')
      : (lang === 'hi' ? 'धीरे से सांस छोड़ें।' : 'Breathe out slowly.'))
    : watered.length === flowers.length
    ? (lang === 'hi' ? 'बहुत अच्छा! आपका बगीचा खिल रहा है।' : 'Wonderful. Your garden is blooming.')
    : watered.length === 0
    ? (lang === 'hi' ? 'तैयार होने पर किसी ऑर्किड को पानी दें।' : 'When you are ready, choose an orchid to water.')
    : (lang === 'hi'
      ? `${watered.length} में से ${flowers.length} ऑर्किड खिल रहे हैं।`
      : `${watered.length} of ${flowers.length} orchids are blooming.`)

  return (
    <div className="center-col" style={{ width: '100%', maxWidth: 640, margin: '0 auto' }}>
      {phase === 'breathe' ? (
        <RoundHeader now={Math.min(breathCount + 1, 4)} total={4} unit="step" label={lang === 'hi' ? '🌬️ सौम्य प्राणायाम' : '🌬️ Gentle Breathing'} />
      ) : (
        <RoundHeader now={watered.length} total={flowers.length} unit="step" label={`💧 ${watered.length} / ${flowers.length} orchids watered`} />
      )}
      {phase === 'breathe' ? (
        <>
          <p className="display-md mt-sm">
            {breathState === 'in'
              ? (lang === 'hi' ? 'धीरे से सांस अंदर लें… 🌬️' : 'Breathe in gently… 🌬️')
              : (lang === 'hi' ? '…और धीरे से सांस छोड़ें 😌' : '…and breathe out slowly 😌')}
          </p>
          <div
            className="rhythm-pad mt-md"
            style={{
              transform: prefersReducedMotion ? 'none' : breathState === 'in' ? 'scale(1.08)' : 'scale(0.9)',
              transition: prefersReducedMotion ? 'none' : 'transform 3.6s ease-in-out',
              background: breathState === 'in' ? 'var(--info)' : 'var(--ink)',
            }}
          >
            🫁
          </div>
          <p role="status" aria-live="polite" aria-atomic="true" className="caption mt-sm">
            {gardenStatus}
          </p>
          <p className="caption mt-sm">
            {lang === 'hi' ? 'घेरे के साथ चलें — चार गिनते हुए अंदर, चार गिनते हुए बाहर।' : 'Follow the circle — in for four, out for four.'}
          </p>
        </>
      ) : (
        <>
          <p className="lead mt-sm">
            {lang === 'hi' ? 'प्रत्येक ऑर्किड को सींचने के लिए टैप करें।' : 'Tap each orchid to give it water.'}
          </p>
          <div className="row mt-md" style={{ justifyContent: 'center', gap: 'var(--s-lg)', flexWrap: 'wrap' }}>
            {flowers.map((f, i) => (
              <button
                key={i}
                className={`choice-btn ${watered.includes(i) ? 'correct' : ''}`}
                style={{ fontSize: 72, minWidth: 150 }}
                aria-label={watered.includes(i)
                  ? (lang === 'hi' ? `ऑर्किड ${i + 1} खिल रहा है` : `Orchid ${i + 1} is blooming`)
                  : (lang === 'hi' ? `ऑर्किड ${i + 1} को पानी दें` : `Water orchid ${i + 1}`)}
                aria-pressed={watered.includes(i)}
                onClick={() => {
                  if (watered.includes(i)) return
                  logAction('unprompted')
                  setWatered((w) => [...w, i])
                }}
              >
                <span className={watered.includes(i) ? '' : 'cue-target'} style={{ display: 'inline-block', filter: watered.includes(i) ? 'none' : 'grayscale(0.5) saturate(0.7)' }}>
                  {f}
                </span>
                <span className="caption">
                  {watered.includes(i) ? (lang === 'hi' ? 'खिल उठा! 🌸' : 'Blooming!') : (lang === 'hi' ? 'पानी चाहिए 💧' : 'Needs water')}
                </span>
              </button>
            ))}
          </div>
          <p role="status" aria-live="polite" aria-atomic="true" className="caption mt-md" style={{ textAlign: 'center' }}>
            {gardenStatus}
          </p>
        </>
      )}
      <p className="caption mt-lg" style={{ color: 'var(--ink-muted)' }}>
        {t('praise_body')}
      </p>
    </div>
  )
}
