import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameProps } from './GameHost'
import { RoundHeader, useGameTimeout } from './shared'
import { sessionRng } from '../lib/rng'
import { genSoundRound } from '../lib/content'
import { nextLevel, recordAnswer } from '../lib/adaptive'
import { playSoftCue, playControlledAmbient, stopAllAudio, isAudioPlaying } from '../lib/audio'
import { useApp } from '../state'
import type { SoundQuestionItem } from '../lib/questionBanks/villageSounds'

const TOTAL_ROUNDS = 5
const DOMAIN = 'auditory'

export function VillageSounds({ difficulty, logAction, complete }: GameProps) {
  const { lang } = useApp()
  const rng = useRef(sessionRng('sounds')).current
  const [roundIdx, setRoundIdx] = useState(0)
  const [level, setLevel] = useState(() => Math.max(difficulty, nextLevel(DOMAIN)))

  const round = useMemo(() => genSoundRound(rng, level), [rng, level, roundIdx])

  const [pickedId, setPickedId] = useState<string | null>(null)
  const [glowId, setGlowId] = useState<string | null>(null)
  const scheduleTimeout = useGameTimeout()
  const [playing, setPlaying] = useState(false)
  const hasAutoPlayed = useRef(false)
  const unprompted = useRef(0)

  function play() {
    if (playing || isAudioPlaying()) return
    setPlaying(true)
    playControlledAmbient(round.target.soundKey, () => {
      setPlaying(false)
    })
  }

  useEffect(() => {
    stopAllAudio()
    setPlaying(false)

    const autoTimer = roundIdx === 0 && !hasAutoPlayed.current
      ? scheduleTimeout(() => {
          hasAutoPlayed.current = true
          play()
        }, 450)
      : null

    const glowTimer = scheduleTimeout(() => {
      if (!pickedId && !glowId) {
        setGlowId(round.target.id)
        playSoftCue()
      }
    }, 4000)

    return () => {
      if (autoTimer) clearTimeout(autoTimer)
      clearTimeout(glowTimer)
      stopAllAudio()
      setPlaying(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx])

  function pick(item: SoundQuestionItem) {
    if (pickedId) return
    stopAllAudio()
    setPlaying(false)
    setPickedId(item.id)
    const isCorrect = item.id === round.target.id
    recordAnswer(DOMAIN, level, isCorrect)

    if (isCorrect) {
      unprompted.current++
      logAction('unprompted')
    } else {
      logAction('cued')
      playSoftCue()
      setGlowId(round.target.id)
    }

    scheduleTimeout(() => {
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
      ? 'आपने कौन सी आवाज़ सुनी?'
      : lang === 'as'
      ? 'আপুনি কিহৰ শব্দ শুনিলে?'
      : 'What did you hear?'

  const audioStatus = playing
    ? lang === 'hi'
      ? 'आवाज़ चल रही है। ध्यान से सुनिए।'
      : 'The sound is playing. Listen closely.'
    : lang === 'hi'
    ? 'आवाज़ तैयार है। फिर से सुनने के लिए बटन दबाएं।'
    : 'The sound is ready. Press the button to listen again.'
  const playLabel = playing
    ? lang === 'hi'
      ? 'आवाज़ चल रही है'
      : 'Sound is playing'
    : lang === 'hi'
    ? 'आवाज़ फिर से सुनें'
    : 'Listen to the sound again'

  return (
    <div className="center-col" style={{ width: '100%', maxWidth: 880, margin: '0 auto' }}>
      <RoundHeader now={roundIdx + 1} total={TOTAL_ROUNDS} unit="question" />

      {/* Sound player card */}
      <div className={`music-player-card ${playing ? 'playing' : ''}`} style={{ width: '100%', padding: 'var(--s-xl) var(--s-lg)', textAlign: 'center' }}>
        <div className="music-waveform" aria-hidden="true" style={{ justifyContent: 'center', marginBottom: 12 }}>
          <span className="wave-bar" />
          <span className="wave-bar" />
          <span className="wave-bar" />
          <span className="wave-bar" />
          <span className="wave-bar" />
        </div>
        <h2 className="display-md" style={{ margin: '6px 0', color: '#fff' }}>
          {playing ? (lang === 'hi' ? '🎧 आवाज़ आ रही है... सुनिए' : '🎧 Playing sound... Listen closely') : promptTitle}
        </h2>
        <p role="status" aria-live="polite" aria-atomic="true" style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.82)', fontSize: 14 }}>
          {audioStatus}
        </p>
        <div className="row" style={{ justifyContent: 'center', gap: 'var(--s-md)', marginTop: 'var(--s-md)' }}>
          <button
            className={`btn ${playing ? 'btn-pearl' : 'btn-primary'} btn-big`}
            onClick={play}
            disabled={playing}
            style={{ minWidth: 220, fontSize: 'var(--fs-title)' }}
            aria-label={playLabel}
            aria-pressed={playing}
          >
            {playing
              ? (lang === 'hi' ? '🔊 आवाज़ चल रही है…' : '🔊 Playing…')
              : (lang === 'hi' ? '▶ आवाज़ फिर से सुनें' : '▶ Play sound again')}
          </button>
        </div>
      </div>

      {/* Options Grid */}
      <div className="grid mt-xl" style={{ gridTemplateColumns: round.options.length === 4 ? 'repeat(auto-fit, minmax(180px, 1fr))' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--s-md)', width: '100%' }}>
        {round.options.map((item) => {
          const isCorrect = item.id === round.target.id
          const isSelected = pickedId === item.id
          const isGlow = glowId === item.id
          const label = lang === 'hi' && item.nameHi ? item.nameHi : item.name

          return (
            <button
              key={item.id}
              className={`choice-card-big ${isSelected && isCorrect ? 'correct' : ''} ${isGlow ? 'glow' : ''}`}
              onClick={() => pick(item)}
              aria-label={label}
              aria-pressed={isSelected}
              aria-describedby={pickedId ? 'sound-feedback' : undefined}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: 'var(--s-lg)',
                borderRadius: 'var(--r-lg)',
                background: isSelected ? (isCorrect ? 'var(--success-soft)' : 'var(--surface-muted)') : 'var(--card)',
                border: isSelected ? (isCorrect ? '3px solid var(--success)' : '3px solid var(--primary)') : isGlow ? '3px solid var(--primary)' : '2px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
                minHeight: 200,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ fontSize: 78, lineHeight: 1.1, marginBottom: 8 }}>{item.emoji}</span>
              <strong style={{ fontSize: 'var(--fs-body)', color: 'var(--ink)' }}>{label}</strong>
              <span className="caption" style={{ color: 'var(--ink-muted)', fontSize: 13, marginTop: 6 }}>
                {lang === 'hi' ? item.descriptionHi : item.description}
              </span>
            </button>
          )
        })}
      </div>

      {pickedId && (
        <p id="sound-feedback" role="status" aria-live="polite" aria-atomic="true" className="caption mt-md" style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>
          {pickedId === round.target.id
            ? (lang === 'hi' ? 'बहुत अच्छा! सही आवाज़ चुनी।' : 'Well done. That is the sound you heard.')
            : (lang === 'hi' ? 'यह आवाज़ नहीं थी। चमकते संकेत को देखकर फिर कोशिश करें।' : 'That was not the sound. Follow the highlighted hint and try again.')}
        </p>
      )}

      <p className="caption mt-lg" style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>
        Tap the picture that matches the sound you heard.
      </p>
    </div>
  )
}
