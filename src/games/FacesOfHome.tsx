import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameProps } from './GameHost'
import { AnswerFeedback, shuffle, useGameTimeout } from './shared'
import { loadSrt, saveSrt } from '../lib/db'
import { bumpSuccess, bumpMiss } from '../lib/srt'
import { useApp } from '../state'
import type { SrtItem } from '../lib/types'
import { playChime, playSoftCue } from '../lib/audio'
import { Icon } from '../components/Icons'
import { navigate } from '../router'

interface Face {
  id: string
  name: string
  relation: string
  photo?: string
  emoji?: string
}

const TOTAL_ROUNDS = 5

const FALLBACK_FACES: Face[] = [
  { id: 'fb-1', name: 'Aarav', relation: 'Grandson / पोता', photo: '', emoji: '👦' },
  { id: 'fb-2', name: 'Meera', relation: 'Daughter / बेटी', photo: '', emoji: '👩' },
  { id: 'fb-3', name: 'Rajesh', relation: 'Son / बेटा', photo: '', emoji: '👨' },
  { id: 'fb-4', name: 'Pooja', relation: 'Granddaughter / पोती', photo: '', emoji: '👧' },
]

function getFaceEmoji(face: Face): string {
  if (face.emoji) return face.emoji
  const r = (face.relation || '').toLowerCase()
  if (r.includes('son') || r.includes('बेटा') || r.includes('grandson') || r.includes('पोता') || r.includes('husband') || r.includes('brother') || r.includes('भाई') || r.includes('father')) return '👨'
  if (r.includes('granddaughter') || r.includes('पोती')) return '👧'
  return '👩'
}

export function FacesOfHome({ difficulty, logAction, complete }: GameProps) {
  const { profile, t, lang } = useApp()
  const [srt, setSrt] = useState<Record<string, SrtItem>>({})
  const [stageIdx, setStageIdx] = useState(1)
  const [pickedId, setPickedId] = useState<string | null>(null)
  const scheduleTimeout = useGameTimeout()
  const unprompted = useRef(0)
  const cued = useRef(0)
  const completedRef = useRef(false)

  useEffect(() => {
    void loadSrt().then(setSrt)
  }, [])

  // Build faces list from user's real family members, or fallback community faces
  const facesList: Face[] = useMemo(() => {
    const custom = (profile?.cultural.familyMembers ?? [])
      .filter((f) => f && f.name && f.name.trim().length > 0)
      .map((f, i) => ({
        id: `fam-${i}`,
        name: f.name.trim(),
        relation: f.relation || 'Family',
        photo: f.photo,
        emoji: f.emoji,
      }))
    return custom.length > 0 ? custom : FALLBACK_FACES
  }, [profile?.cultural.familyMembers])

  const targetFace = facesList[(stageIdx - 1) % facesList.length] ?? facesList[0]

  // Always show the target plus 2 distractors, so the correct answer is
  // guaranteed to be among the options even with 4+ family members.
  const choices = useMemo(() => {
    const distractors = facesList.filter((f) => f.id !== targetFace.id)
    const pool = shuffle(distractors).slice(0, 2)
    return shuffle([targetFace, ...pool])
  }, [facesList, targetFace])

  const question = lang === 'hi'
    ? `${targetFace.relation} कौन हैं?`
    : `Who is your ${targetFace.relation}?`

  function pick(face: Face) {
    if (pickedId) return
    setPickedId(face.id)
    const isCorrect = face.id === targetFace.id

    // Update SRT spacing interval
    const itemKey = targetFace.name
    const curItem: SrtItem = srt[itemKey] ?? { id: itemKey, level: 0, lastSeenTs: Date.now() }
    const nextItem = isCorrect ? bumpSuccess(curItem) : bumpMiss(curItem)
    const updatedSrt = { ...srt, [itemKey]: nextItem }
    setSrt(updatedSrt)
    void saveSrt(updatedSrt)

    if (isCorrect) {
      unprompted.current++
      logAction('unprompted')
      playChime()
    } else {
      cued.current++
      logAction('cued')
      playSoftCue()
    }

    if (stageIdx >= TOTAL_ROUNDS) completedRef.current = true
    scheduleTimeout(() => {
      setPickedId(null)
      if (stageIdx >= TOTAL_ROUNDS) {
        complete({
          itemsTotal: TOTAL_ROUNDS,
          itemsUnprompted: unprompted.current,
          completion: 1,
        })
      } else {
        setStageIdx((s) => s + 1)
      }
    }, 1200)
  }

  function handleSkip() {
    if (completedRef.current) return
    if (stageIdx >= TOTAL_ROUNDS) {
      completedRef.current = true
      complete({
        itemsTotal: TOTAL_ROUNDS,
        itemsUnprompted: unprompted.current,
        completion: 1,
      })
    } else {
      setStageIdx((s) => s + 1)
    }
  }

  const feedbackState = pickedId === null ? 'idle' : pickedId === targetFace.id ? 'success' : 'guidance'

  return (
    <div className="enter-anim" style={{ width: '100%', maxWidth: 480, margin: '0 auto' }}>
      {/* Stage Progress Bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-muted)' }}>
            {t('round_counter', { n: stageIdx, total: TOTAL_ROUNDS })}
          </span>
        </div>

        {/* Progress Bar */}
        <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
          <div
            style={{
              width: `${(stageIdx / TOTAL_ROUNDS) * 100}%`,
              height: '100%',
              background: 'var(--primary)',
              borderRadius: 3,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Large Heading */}
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 32,
          fontWeight: 800,
          color: 'var(--ink)',
          textAlign: 'center',
          marginBottom: 20,
          lineHeight: 1.2,
        }}
      >
        {question}
      </h1>

      {/* Avatar Silhouette Circle */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <div
          style={{
            width: 110,
            height: 110,
            borderRadius: '50%',
            border: '4px solid #C89B3C',
            background: 'var(--surface-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ink-secondary)',
            boxShadow: '0 4px 12px rgba(200, 155, 60, 0.2)',
          }}
        >
          <Icon name="user" size={48} color="var(--ink-secondary)" />
        </div>
      </div>

      {/* Option Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
        {choices.map((face) => {
          const isTarget = face.id === targetFace.id
          const isSelected = pickedId === face.id

          return (
            <button
              key={face.id}
              type="button"
              onClick={() => pick(face)}
              aria-pressed={isSelected}
              data-answer-state={isSelected ? (isTarget ? 'correct' : 'guidance') : 'idle'}
              style={{
                background: isSelected ? (isTarget ? 'var(--success-soft)' : 'var(--surface-muted)') : 'var(--card)',
                border: isSelected ? (isTarget ? '2.5px solid var(--success)' : '2.5px solid var(--primary)') : '1.5px solid var(--border)',
                borderRadius: 24,
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Circular Photo */}
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  marginBottom: 8,
                  background: 'var(--surface-muted)',
                }}
              >
                {face.photo ? (
                  <img src={face.photo} alt={face.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ fontSize: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    {getFaceEmoji(face)}
                  </div>
                )}
              </div>

              {/* Name */}
              <strong style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                {face.name}
              </strong>

              {/* Removed the relation pill: it revealed the answer to
                  "Who is your Son?" by labeling each option with the
                  relation, turning a recognition task into a text match. */}
            </button>
          )
        })}
      </div>

      <AnswerFeedback state={feedbackState} />

      {/* Skip Question Button */}
      <button
        type="button"
        onClick={handleSkip}
        className="btn btn-block"
        style={{
          background: 'var(--surface-muted)',
          color: 'var(--ink-secondary)',
          borderRadius: 16,
          minHeight: 52,
          fontSize: 16,
          fontWeight: 600,
        }}
      >
        {t('skip')}
      </button>
    </div>
  )
}
