import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameProps } from './GameHost'
import { shuffle, RoundHeader } from './shared'
import { playInstrument } from '../lib/audio'
import type { Instrument } from '../lib/audio'
import { speak } from '../lib/speech'
import { useApp } from '../state'

const INSTRUMENTS: { id: Instrument; emoji: string; label: string; labelHi?: string }[] = [
  { id: 'dhol', emoji: '🪘', label: 'Bihu Dhol', labelHi: 'बीहू ढोल' },
  { id: 'flute', emoji: '🪈', label: 'Bahi Flute', labelHi: 'बांसुरी' },
  { id: 'wangala', emoji: '🥁', label: 'Wangala Drum', labelHi: 'वांगला ढोल' },
  { id: 'bell', emoji: '🔔', label: 'Temple Bell', labelHi: 'मंदिर की घंटी' },
  { id: 'pepa', emoji: '📯', label: 'Pepa Horn', labelHi: 'पेपा बाजा' },
]

const TOTAL = 5

export function MorningMelodies({ difficulty, logAction, complete }: GameProps) {
  const { lang } = useApp()
  const [roundIdx, setRoundIdx] = useState(0)
  const [pickedId, setPickedId] = useState<Instrument | null>(null)
  const [glowId, setGlowId] = useState<Instrument | null>(null)
  const [playing, setPlaying] = useState(false)
  const unprompted = useRef(0)
  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pool = useMemo(() => (difficulty >= 1 ? INSTRUMENTS : INSTRUMENTS.slice(0, 3)), [difficulty])
  const rounds = useMemo(() => {
    return Array.from({ length: TOTAL }, () => {
      const target = shuffle(pool)[0]
      const others = shuffle(pool.filter((p) => p.id !== target.id)).slice(0, difficulty >= 1 ? 3 : 2)
      return { target, options: shuffle([target, ...others]) }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const round = rounds[roundIdx]

  function play() {
    if (!round) return
    setPlaying(true)
    const durMs = playInstrument(round.target.id)
    if (playTimerRef.current) clearTimeout(playTimerRef.current)
    playTimerRef.current = setTimeout(() => {
      setPlaying(false)
    }, durMs + 200)
  }

  useEffect(() => {
    if (!round) return
    // Auto-play when question changes
    const autoTimer = setTimeout(() => {
      play()
    }, 450)

    const glowTimer = setTimeout(() => {
      if (!pickedId && !glowId) {
        setGlowId(round.target.id)
      }
    }, 8500)

    return () => {
      clearTimeout(autoTimer)
      clearTimeout(glowTimer)
      if (playTimerRef.current) clearTimeout(playTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx])

  if (!round) return null

  function pick(id: Instrument) {
    if (pickedId) return
    setPickedId(id)
    const targetLabel = lang === 'hi' && round.target.labelHi ? round.target.labelHi : round.target.label
    if (id === round.target.id) {
      unprompted.current++
      logAction('unprompted')
      void speak(lang === 'hi' ? 'बिल्कुल सही सुना आपने!' : 'You heard it right! Beautiful!', lang)
    } else {
      logAction('cued')
      setGlowId(round.target.id)
      void speak(lang === 'hi' ? `यह ${targetLabel} था।` : `That was the ${targetLabel}.`, lang)
    }
    setTimeout(() => {
      setPickedId(null)
      setGlowId(null)
      if (roundIdx + 1 >= TOTAL) {
        complete({ itemsTotal: TOTAL, itemsUnprompted: unprompted.current, completion: 1 })
      } else {
        setRoundIdx((i) => i + 1)
      }
    }, 1500)
  }

  return (
    <div className="center-col" style={{ width: '100%' }}>
      <RoundHeader now={roundIdx + 1} total={TOTAL} />

      <div className={`music-player-card ${playing ? 'playing' : ''}`}>
        <div className="music-waveform" aria-hidden="true">
          <span className="wave-bar" />
          <span className="wave-bar" />
          <span className="wave-bar" />
          <span className="wave-bar" />
          <span className="wave-bar" />
        </div>
        <p className="lead" style={{ margin: '8px 0', fontWeight: 600 }}>
          {playing ? (lang === 'hi' ? '🎵 धुन बज रही है... सुनिए' : '🎵 Playing melody... Listen closely') : (lang === 'hi' ? 'आपने कौन सा वाद्य सुना?' : 'Which instrument made this sound?')}
        </p>
        <button
          className={`btn ${playing ? 'btn-pearl' : 'btn-primary'} btn-big`}
          onClick={play}
          style={{ minWidth: 220 }}
          aria-label={lang === 'hi' ? 'फिर से सुनें' : 'Listen again'}
        >
          {playing ? '🔊 Playing…' : '▶ Listen again'}
        </button>
      </div>

      <div className="row mt-lg" style={{ justifyContent: 'center', gap: 'var(--s-md)' }}>
        {round.options.map((o) => {
          const isCorrect = o.id === round.target.id
          const label = lang === 'hi' && o.labelHi ? o.labelHi : o.label
          return (
            <button
              key={o.id}
              className={`choice-btn ${pickedId === o.id && isCorrect ? 'correct' : ''} ${glowId === o.id ? 'glow' : ''}`}
              onClick={() => pick(o.id)}
              style={{ minWidth: 140 }}
            >
              <span className="big">{o.emoji}</span>
              <strong style={{ fontSize: 'var(--fs-body)' }}>{label}</strong>
            </button>
          )
        })}
      </div>
    </div>
  )
}
