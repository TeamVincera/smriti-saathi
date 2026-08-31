import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameProps } from './GameHost'
import { RoundHeader } from './shared'
import { sessionRng } from '../lib/rng'
import { genMelodyRound } from '../lib/content'
import { nextLevel, recordAnswer } from '../lib/adaptive'
import { playControlledInstrument, stopAllAudio, isAudioPlaying, playSoftCue } from '../lib/audio'
import { useApp } from '../state'
import type { InstrumentItem } from '../lib/questionBanks/instruments'

const TOTAL_ROUNDS = 5
const DOMAIN = 'auditory'

export function MorningMelodies({ difficulty, logAction, complete }: GameProps) {
  const { lang, profile } = useApp()
  const rng = useRef(sessionRng('melodies')).current
  const [roundIdx, setRoundIdx] = useState(0)
  const [level, setLevel] = useState(() => Math.max(difficulty, nextLevel(DOMAIN)))

  const statePreference = profile?.cultural.state || 'All'
  const round = useMemo(() => genMelodyRound(rng, level, statePreference), [rng, level, roundIdx, statePreference])

  const [pickedId, setPickedId] = useState<string | null>(null)
  const [glowId, setGlowId] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const unprompted = useRef(0)

  function play() {
    if (playing || isAudioPlaying()) return
    setPlaying(true)
    playControlledInstrument(round.target.soundPreset, () => {
      setPlaying(false)
    })
  }

  useEffect(() => {
    stopAllAudio()
    setPlaying(false)

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
      stopAllAudio()
      setPlaying(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx])

  function pick(inst: InstrumentItem) {
    if (pickedId) return
    stopAllAudio()
    setPlaying(false)
    setPickedId(inst.id)
    const isCorrect = inst.id === round.target.id
    recordAnswer(DOMAIN, level, isCorrect)

    if (isCorrect) {
      unprompted.current++
      logAction('unprompted')
    } else {
      logAction('cued')
      playSoftCue()
      setGlowId(round.target.id)
    }

    setTimeout(() => {
      setPickedId(null)
      setGlowId(null)
      if (roundIdx + 1 >= TOTAL_ROUNDS) {
        complete({ itemsTotal: TOTAL_ROUNDS, itemsUnprompted: unprompted.current, completion: 1 })
      } else {
        setLevel(nextLevel(DOMAIN))
        setRoundIdx((i) => i + 1)
      }
    }, 1500)
  }

  const promptTitle =
    lang === 'hi'
      ? 'आपने कौन सा पारंपरिक वाद्य सुना?'
      : lang === 'as'
      ? 'আপুনি কোনটো বাদ্যৰ শব্দ শুনিলে?'
      : lang === 'mni'
      ? 'নহাক্না করম্বা বাদ্যগী খোঞ্জেল তারিবগে?'
      : 'Which traditional instrument made this sound?'

  return (
    <div className="center-col" style={{ width: '100%', maxWidth: 880, margin: '0 auto' }}>
      <RoundHeader now={roundIdx + 1} total={TOTAL_ROUNDS} unit="question" />

      {/* Music player card with animated waveform */}
      <div className={`music-player-card ${playing ? 'playing' : ''}`} style={{ width: '100%', padding: 'var(--s-xl) var(--s-lg)', textAlign: 'center' }}>
        <div className="music-waveform" aria-hidden="true" style={{ justifyContent: 'center', marginBottom: 12 }}>
          <span className="wave-bar" />
          <span className="wave-bar" />
          <span className="wave-bar" />
          <span className="wave-bar" />
          <span className="wave-bar" />
        </div>
        <h2 className="display-md" style={{ margin: '6px 0', color: '#fff' }}>
          {playing ? (lang === 'hi' ? '🎵 धुन बज रही है... ध्यान से सुनिए' : '🎵 Playing melody... Listen closely') : promptTitle}
        </h2>
        <div className="row" style={{ justifyContent: 'center', gap: 'var(--s-md)', marginTop: 'var(--s-md)' }}>
          <button
            className={`btn ${playing ? 'btn-pearl' : 'btn-primary'} btn-big`}
            onClick={play}
            disabled={playing}
            style={{ minWidth: 220, fontSize: 'var(--fs-title)' }}
            aria-label={lang === 'hi' ? 'फिर से सुनें' : 'Listen again'}
          >
            {playing ? '🔊 Playing…' : '▶ Play sound again'}
          </button>
        </div>
      </div>

      {/* Instrument Choices Grid */}
      <div className="grid mt-xl" style={{ gridTemplateColumns: round.options.length === 4 ? 'repeat(auto-fit, minmax(180px, 1fr))' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--s-md)', width: '100%' }}>
        {round.options.map((inst) => {
          const isCorrect = inst.id === round.target.id
          const isSelected = pickedId === inst.id
          const isGlow = glowId === inst.id
          const label = lang === 'hi' && inst.nameHi ? inst.nameHi : lang === 'as' && inst.nameAs ? inst.nameAs : lang === 'mni' && inst.nameMni ? inst.nameMni : inst.name

          return (
            <button
              key={inst.id}
              className={`choice-card-big ${isSelected ? (isCorrect ? 'correct' : 'wrong') : ''} ${isGlow ? 'glow' : ''}`}
              onClick={() => pick(inst)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: 'var(--s-lg)',
                borderRadius: 'var(--r-lg)',
                background: isSelected ? (isCorrect ? 'var(--success-soft)' : 'var(--error-soft)') : 'var(--card)',
                border: isSelected ? (isCorrect ? '3px solid var(--success)' : '3px solid var(--error)') : isGlow ? '3px solid var(--primary)' : '2px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
                minHeight: 200,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ fontSize: 72, lineHeight: 1.1, marginBottom: 8 }}>{inst.emoji}</span>
              <strong style={{ fontSize: 'var(--fs-body)', color: isSelected && !isCorrect ? 'var(--pastel-pink-text)' : 'var(--ink)' }}>{label}</strong>
              <span className="chip mt-xs" style={{ background: 'var(--surface-muted)', color: 'var(--primary)', fontWeight: 600, fontSize: 12 }}>
                📍 {inst.state}
              </span>
              <span className="caption" style={{ color: 'var(--ink-muted)', fontSize: 13, marginTop: 4 }}>
                {inst.region}
              </span>
            </button>
          )
        })}
      </div>

      <p className="caption mt-lg" style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>
        Tap the instrument that produced the melody. Take all the time you need.
      </p>
    </div>
  )
}

