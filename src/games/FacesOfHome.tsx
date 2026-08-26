import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { GameProps } from './GameHost'
import { shuffle, RoundHeader } from './shared'
import { loadSrt, saveSrt } from '../lib/db'
import { useApp } from '../state'
import type { SrtItem } from '../lib/types'
import { bumpSuccess, bumpMiss } from '../lib/srt'
import { speak } from '../lib/speech'
import { playChime, playSoftCue } from '../lib/audio'

interface Face {
  id: string
  name: string
  relation: string
  emoji?: string
  photo?: string
  isUserFamily?: boolean
}

interface MemberDraft {
  name: string
  relation: string
  emoji: string
  photo?: string
}

const DEFAULT_FACES: Face[] = [
  { id: 'f1', name: 'Sarala', relation: 'Daughter', emoji: '👩' },
  { id: 'f2', name: 'Deben', relation: 'Son', emoji: '👨' },
  { id: 'f3', name: 'Asha Didi', relation: 'Health Guide', emoji: '🧕' },
  { id: 'f4', name: 'Nayan', relation: 'Grandson', emoji: '👦' },
]

export function FacesOfHome({ difficulty, logAction, complete }: GameProps) {
  const { profile, lang, updateProfile } = useApp()
  const [srt, setSrt] = useState<Record<string, SrtItem>>({})
  const [setup, setSetup] = useState<MemberDraft[] | null>(null)
  const [setupDone, setSetupDone] = useState(false)
  const setupPhotoRefs = useRef<(HTMLInputElement | null)[]>([])
  const [roundIdx, setRoundIdx] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [glowName, setGlowName] = useState<string | null>(null)
  const unprompted = useRef(0)
  const cued = useRef(0)

  useEffect(() => {
    void loadSrt().then(setSrt)
  }, [])

  useEffect(() => {
    const fam = (profile?.cultural.familyMembers ?? []).filter((f) => f && f.name && f.name.trim().length > 0)
    if (fam.length < 2 && !setupDone) {
      setSetup([
        { name: '', relation: '', emoji: '👩' },
        { name: '', relation: '', emoji: '👨' },
      ])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const faceList: Face[] = useMemo(() => {
    const rawFam = profile?.cultural.familyMembers ?? []
    const userFam: Face[] = rawFam
      .filter((f) => f && f.name && f.name.trim().length > 0)
      .map((f, i) => ({
        id: `fam-${i}-${f.name}`,
        name: f.name.trim(),
        relation: f.relation || 'Family',
        emoji: f.emoji || '👩',
        photo: f.photo,
        isUserFamily: true,
      }))

    if (userFam.length >= 3) {
      return userFam
    } else if (userFam.length > 0) {
      // Complement with non-conflicting default companions for multiple choice distractor options
      const companions = DEFAULT_FACES.filter((df) => !userFam.some((uf) => uf.name.toLowerCase() === df.name.toLowerCase()))
      return [...userFam, ...companions]
    }
    return DEFAULT_FACES
  }, [profile?.cultural.familyMembers])

  const rounds = useMemo(() => {
    // Pick target members, prioritizing patient's actual family
    const userMembers = faceList.filter((f) => f.isUserFamily)
    const targets = userMembers.length > 0 ? userMembers : faceList.slice(0, difficulty >= 1 ? 4 : 3)

    const list: { m: Face; pass: number }[] = []
    // If only 1 or 2 family members, repeat them at spaced intervals
    if (targets.length === 1) {
      list.push({ m: targets[0], pass: 1 }, { m: targets[0], pass: 2 }, { m: targets[0], pass: 3 })
    } else if (targets.length === 2) {
      list.push({ m: targets[0], pass: 1 }, { m: targets[1], pass: 1 }, { m: targets[0], pass: 2 }, { m: targets[1], pass: 2 })
    } else {
      const firstPass = shuffle(targets.slice(0, difficulty >= 1 ? 4 : 3).map((m) => ({ m, pass: 1 })))
      list.push(...firstPass)
      // Add SRT review for first 2
      if (firstPass.length >= 2) {
        list.push({ m: firstPass[0].m, pass: 2 }, { m: firstPass[1].m, pass: 2 })
      }
    }
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faceList, difficulty])

  const round = rounds[roundIdx]

  const choices = useMemo(() => {
    if (!round) return []
    const others = shuffle(faceList.filter((f) => f.name !== round.m.name)).slice(0, difficulty >= 1 ? 2 : 1)
    return shuffle([round.m, ...others])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, faceList])

  useEffect(() => {
    if (!round || setup) return
    const timer = setTimeout(() => {
      if (!picked) {
        setGlowName(round.m.name)
        playSoftCue()
      }
    }, 7000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx, setup])

  function patchMember(i: number, patch: Partial<MemberDraft>) {
    setSetup((s) => (s ?? []).map((m, j) => (j === i ? { ...m, ...patch } : m)))
  }

  async function onSetupPhoto(i: number, e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      const mod = await import('../lib/image')
      const small = await mod.resizeImageFile(f)
      patchMember(i, { photo: small })
    } catch {}
  }

  async function saveSetup() {
    const members = (setup ?? [])
      .filter((m) => m.name.trim())
      .map((m) => ({ name: m.name.trim(), relation: m.relation.trim() || 'Family', emoji: m.emoji, photo: m.photo }))
    if (members.length < 2) return
    await updateProfile({ cultural: { ...(profile?.cultural ?? {}), familyMembers: members } })
    setSetup(null)
    setSetupDone(true)
  }

  if (setup) {
    const valid = setup.filter((m) => m.name.trim()).length >= 2
    return (
      <div className="center-col" style={{ width: '100%' }}>
        <h2 className="display-md">First — who are the people at home?</h2>
        <p className="lead" style={{ textAlign: 'center', maxWidth: 560 }}>
          Add family members with their names and photos. I will ask about them in the game. Two people is enough.
        </p>
        <div className="stack" style={{ width: 'min(600px, 100%)' }}>
          {setup.map((m, i) => (
            <div key={i} className="card row" style={{ gap: 10, flexWrap: 'nowrap', padding: 'var(--s-sm)' }}>
              <button
                className="avatar-pick"
                style={{ width: 64, height: 64, fontSize: 26, overflow: 'hidden', flexShrink: 0 }}
                onClick={() => setupPhotoRefs.current[i]?.click()}
                aria-label="Add photo"
              >
                {m.photo ? <img src={m.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : m.emoji}
              </button>
              <input
                ref={(el) => {
                  setupPhotoRefs.current[i] = el
                }}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => void onSetupPhoto(i, e)}
              />
              <div className="stack" style={{ flex: 1, gap: 8, minWidth: 0 }}>
                <input
                  className="input"
                  style={{ minHeight: 46 }}
                  placeholder="Name *"
                  value={m.name}
                  onChange={(e) => patchMember(i, { name: e.target.value })}
                />
                <input
                  className="input"
                  style={{ minHeight: 46 }}
                  placeholder="Relation (Daughter, Son…)"
                  value={m.relation}
                  onChange={(e) => patchMember(i, { relation: e.target.value })}
                />
              </div>
              <select
                className="input"
                style={{ width: 70, minHeight: 46, flexShrink: 0 }}
                value={m.emoji}
                onChange={(e) => patchMember(i, { emoji: e.target.value })}
              >
                {['👩', '👨', '👧', '👦', '🧑', '👶', '🧓'].map((em) => (
                  <option key={em}>{em}</option>
                ))}
              </select>
              {setup.length > 2 && (
                <button className="btn btn-pearl" style={{ minHeight: 40, flexShrink: 0 }} onClick={() => setSetup((s) => (s ?? []).filter((_, j) => j !== i))}>
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="row" style={{ marginTop: 'var(--s-md)' }}>
          <button className="btn btn-pearl" onClick={() => setSetup((s) => [...(s ?? []), { name: '', relation: '', emoji: '👩' }])}>
            + Add person
          </button>
        </div>
        <div className="row" style={{ marginTop: 'var(--s-md)' }}>
          <button className="btn btn-primary btn-big" disabled={!valid} onClick={() => void saveSetup()}>
            ✅ Start game
          </button>
          <button className="btn btn-pearl" onClick={() => { setSetup(null); setSetupDone(true) }}>
            Use sample faces instead
          </button>
        </div>
      </div>
    )
  }

  if (!round) return null

  function pick(name: string) {
    if (picked) return
    setPicked(name)
    const isCorrect = name === round.m.name
    const item = srt[round.m.id] ?? { key: `faces:${round.m.id}`, level: 0 }
    const updated = isCorrect ? bumpSuccess(item) : bumpMiss(item)
    const nextSrt = { ...srt, [round.m.id]: updated }
    setSrt(nextSrt)
    void saveSrt(nextSrt)

    if (isCorrect) {
      unprompted.current++
      logAction('unprompted')
      void playChime()
      const praise =
        lang === 'hi'
          ? `हाँ! यह ${round.m.name} हैं (${round.m.relation})। बहुत सुंदर!`
          : `Yes! ${round.m.name}, your ${round.m.relation}. Wonderful!`
      void speak(praise, lang)
    } else {
      cued.current++
      logAction('cued')
      setGlowName(round.m.name)
      const assist =
        lang === 'hi'
          ? `यह ${round.m.name} हैं (${round.m.relation})।`
          : `This is ${round.m.name}, your ${round.m.relation}.`
      void speak(assist, lang)
    }

    setTimeout(() => {
      setPicked(null)
      setGlowName(null)
      if (roundIdx + 1 >= rounds.length) {
        complete({
          itemsTotal: rounds.length,
          itemsUnprompted: unprompted.current,
          completion: 1,
        })
      } else {
        setRoundIdx((i) => i + 1)
      }
    }, 1600)
  }

  return (
    <div className="center-col" style={{ width: '100%' }}>
      <RoundHeader now={roundIdx + 1} total={rounds.length} />

      <div className="card card-dark center-col" style={{ padding: 'var(--s-xl)', minWidth: 240, maxWidth: 360, width: '100%' }}>
        {round.m.photo ? (
          <div style={{ width: 180, height: 180, borderRadius: 'var(--r-xl)', overflow: 'hidden', border: '3px solid rgba(255,255,255,0.2)', background: '#fff' }}>
            <img src={round.m.photo} alt={round.m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : (
          <div style={{ fontSize: 104, lineHeight: 1 }}>{round.m.emoji ?? '👩'}</div>
        )}
        <span className="caption mt-sm" style={{ color: '#ddd' }}>
          {round.m.relation}
        </span>
      </div>

      <p className="display-md" style={{ marginTop: 'var(--s-md)' }}>
        {lang === 'hi' ? 'यह कौन हैं?' : 'Who is this?'}
      </p>

      <div className="row" style={{ justifyContent: 'center', gap: 'var(--s-md)', marginTop: 'var(--s-xs)' }}>
        {choices.map((c) => {
          const isTarget = c.name === round.m.name
          return (
            <button
              key={c.id}
              className={`choice-btn ${picked && isTarget ? 'correct' : ''} ${glowName === c.name ? 'glow' : ''}`}
              onClick={() => pick(c.name)}
              style={{ minWidth: 160 }}
            >
              <strong style={{ fontSize: 'var(--fs-body-lg)' }}>{c.name}</strong>
              <span className="caption">{c.relation}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
