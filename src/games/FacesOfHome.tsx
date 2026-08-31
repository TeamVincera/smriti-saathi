import { useEffect, useMemo, useRef, useState } from 'react'
import type { GameProps } from './GameHost'
import { shuffle } from './shared'
import { loadSrt } from '../lib/db'
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
  badgeBg: string
  badgeColor: string
}

const TOTAL_ROUNDS = 5

export function FacesOfHome({ difficulty, logAction, complete }: GameProps) {
  const { profile } = useApp()
  const [srt, setSrt] = useState<Record<string, SrtItem>>({})
  const [stageIdx, setStageIdx] = useState(1)
  const [pickedId, setPickedId] = useState<string | null>(null)
  const unprompted = useRef(0)
  const cued = useRef(0)

  useEffect(() => {
    void loadSrt().then(setSrt)
  }, [])

  // Build faces list strictly from user's real family members
  const facesList: Face[] = useMemo(() => {
    return (profile?.cultural.familyMembers ?? [])
      .filter((f) => f && f.name && f.name.trim().length > 0)
      .map((f, i) => ({
        id: `fam-${i}`,
        name: f.name.trim(),
        relation: f.relation || 'Family',
        photo: f.photo,
        badgeBg: i % 3 === 0 ? '#CDE8F6' : i % 3 === 1 ? '#DED2F4' : '#D0EBD8',
        badgeColor: i % 3 === 0 ? '#0B4A72' : i % 3 === 1 ? '#3D2372' : '#175B28',
      }))
  }, [profile?.cultural.familyMembers])

  if (facesList.length === 0) {
    return (
      <div className="page-standalone enter-anim">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'none', border: 'none' }}
          >
            <Icon name="back" size={22} color="#162436" />
          </button>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#162436', letterSpacing: 0.8, textTransform: 'uppercase' }}>
            FACES OF HOME
          </span>
          <div style={{ width: 36 }} />
        </div>

        <div
          className="card"
          style={{
            borderRadius: 24,
            padding: '40px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
            border: '1.5px solid var(--border)',
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: '#DED2F4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              marginBottom: 16,
            }}
          >
            👨‍👩‍👧
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: '#162436', marginBottom: 8 }}>
            No family members added yet.
          </h2>
          <p style={{ fontSize: 14, color: '#6B7280', maxWidth: 300, marginBottom: 28, lineHeight: 1.5 }}>
            Please add family members and photos in the Caregiver Hub so personalized faces appear in this memory game.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 280 }}>
            <button
              type="button"
              className="btn btn-cta btn-block"
              onClick={() => navigate('/hub')}
              style={{
                borderRadius: 14,
                minHeight: 48,
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              Go to Caregiver Hub
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-block"
              onClick={() => navigate('/')}
              style={{
                borderRadius: 14,
                minHeight: 44,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  const targetFace = facesList[stageIdx % facesList.length] ?? facesList[0]

  const choices = useMemo(() => {
    return shuffle(facesList.slice(0, Math.min(3, facesList.length)))
  }, [facesList, stageIdx])

  const question = `Who is your ${targetFace.relation}?`

  function pick(face: Face) {
    if (pickedId) return
    setPickedId(face.id)
    const isCorrect = face.id === targetFace.id

    if (isCorrect) {
      unprompted.current++
      logAction('unprompted')
      playChime()
    } else {
      cued.current++
      logAction('cued')
      playSoftCue()
    }

    setTimeout(() => {
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
    if (stageIdx >= TOTAL_ROUNDS) {
      complete({
        itemsTotal: TOTAL_ROUNDS,
        itemsUnprompted: unprompted.current,
        completion: 1,
      })
    } else {
      setStageIdx((s) => s + 1)
    }
  }

  return (
    <div className="page-standalone enter-anim">
      {/* Top Header & Stage Progress Bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'none', border: 'none' }}
          >
            <Icon name="back" size={22} color="#162436" />
          </button>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#162436', letterSpacing: 0.8, textTransform: 'uppercase' }}>
            FACES OF HOME
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#162436' }}>
            Stage {stageIdx}/{TOTAL_ROUNDS}
          </span>
          <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="help" size={20} color="#162436" />
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ height: 4, borderRadius: 2, background: '#E5E7EB', overflow: 'hidden' }}>
          <div
            style={{
              width: `${(stageIdx / TOTAL_ROUNDS) * 100}%`,
              height: '100%',
              background: '#162436',
              borderRadius: 2,
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
          color: '#162436',
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
            background: '#E2E2E6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#4A5568',
            boxShadow: '0 4px 12px rgba(200, 155, 60, 0.2)',
          }}
        >
          <Icon name="user" size={48} color="#4A5568" />
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
              style={{
                background: isSelected ? (isTarget ? 'var(--success-soft)' : 'var(--error-soft)') : '#FFFFFF',
                border: isSelected ? (isTarget ? '2.5px solid var(--success)' : '2.5px solid var(--error)') : '1.5px solid var(--border)',
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
                  background: '#ECECF0',
                }}
              >
                {face.photo ? (
                  <img src={face.photo} alt={face.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ fontSize: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    👩
                  </div>
                )}
              </div>

              {/* Name */}
              <strong style={{ fontSize: 18, fontWeight: 700, color: isSelected && !isTarget ? 'var(--pastel-pink-text)' : '#162436', marginBottom: 4 }}>
                {face.name}
              </strong>

              {/* Pill Badge */}
              <span
                style={{
                  background: face.badgeBg,
                  color: face.badgeColor,
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '3px 12px',
                  borderRadius: 12,
                }}
              >
                {face.relation}
              </span>
            </button>
          )
        })}
      </div>

      {/* Skip Question Button */}
      <button
        type="button"
        onClick={handleSkip}
        className="btn btn-block"
        style={{
          background: '#FF5F56',
          color: '#fff',
          borderRadius: 16,
          minHeight: 52,
          fontSize: 16,
          fontWeight: 600,
        }}
      >
        Skip Question
      </button>
    </div>
  )
}
