import { useEffect, useState, useMemo } from 'react'
import { useApp } from '../state'
import { navigate } from '../router'
import { GAMES, unlockedGames } from '../lib/games'
import type { GameDef } from '../lib/games'
import { recommendNextGame } from '../lib/ai'
import { loadConfig } from '../lib/db'
import { Icon } from '../components/Icons'

type CategoryFilter = 'all' | 'memory' | 'focus' | 'language'

export function Home() {
  const { profile, sessionsToday, dailyGameLimit, sessions, lang } = useApp()
  const [pick, setPick] = useState<{ gameId: string; difficulty: number; exploration: boolean } | null>(null)
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all')

  useEffect(() => {
    void recommendNextGame().then(setPick)
  }, [])

  const completed = sessions.length
  const unlocked = unlockedGames(completed)
  const today = pick ? GAMES.find((g) => g.id === pick.gameId) || GAMES[0] : GAMES[0]
  const capReached = sessionsToday >= dailyGameLimit
  const greeting = greetingByHour(lang)

  const patientName = profile?.patient.name?.trim() || ''

  const filteredGames = useMemo(() => {
    if (activeCategory === 'all') return GAMES
    if (activeCategory === 'memory') {
      return GAMES.filter((g) => g.id === 'faces' || g.id === 'tray' || g.id === 'picture' || g.id === 'pairs' || g.id === 'market')
    }
    if (activeCategory === 'focus') {
      return GAMES.filter((g) => g.id === 'loom' || g.id === 'bamboo' || g.id === 'spot' || g.id === 'cheraw')
    }
    if (activeCategory === 'language') {
      return GAMES.filter((g) => g.id === 'word' || g.id === 'phrases' || g.id === 'tales')
    }
    return GAMES
  }, [activeCategory])

  const activityList = [
    {
      id: 'faces',
      title: 'Faces of Home',
      subtitle: 'Identify your loved ones in a calm setting',
      bg: '#CDE8F6',
      border: '1.5px solid #A4D5EE',
      iconBg: '#FFFFFF',
      iconColor: '#006064',
      glyph: '👨‍👩‍👧',
    },
    {
      id: 'tray',
      title: 'Memory Tray',
      subtitle: 'Recall traditional household items',
      bg: '#D2ECD5',
      border: '1.5px solid #A4DCA9',
      iconBg: '#FFFFFF',
      iconColor: '#2E7D32',
      glyph: '🪞',
    },
    {
      id: 'melodies',
      title: 'Morning Melodies',
      subtitle: 'Listen and recall the tune',
      bg: '#DED2F4',
      border: '1.5px solid #BEACEC',
      iconBg: '#FFFFFF',
      iconColor: '#1A237E',
      glyph: '🎵',
    },
    {
      id: 'pairs',
      title: 'Family Album',
      subtitle: 'Match the floral pairs',
      bg: '#CDE8F6',
      border: '1.5px solid #A4D5EE',
      iconBg: '#FFFFFF',
      iconColor: '#006064',
      glyph: '🖼️',
    },
    {
      id: 'foods',
      title: 'Traditional Foods',
      subtitle: 'Step by step recipes and dishes',
      bg: '#FCD9CB',
      border: '1.5px solid #F8B59E',
      iconBg: '#FFFFFF',
      iconColor: '#C62828',
      glyph: '🍲',
    },
  ]

  const launchGame = (gameId: string, diff = 0) => {
    if (capReached) {
      alert(lang === 'hi' ? 'आज के खेलों की सीमा पूरी हो गई है। कृपया कल फिर आइए।' : "Today's game limit has been reached. Please come back tomorrow.")
      return
    }
    navigate(`/game/${gameId}?d=${diff}`)
  }

  return (
    <div className="page enter-anim">
      {/* 1. Hero Greeting Banner */}
      <section
        style={{
          background: '#C7E7F4',
          borderRadius: 24,
          padding: '24px 20px',
          marginBottom: 16,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: '1.5px solid #99D1E8',
        }}
      >
        <div style={{ zIndex: 2, flex: 1, minWidth: 0, paddingRight: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: '#162436', margin: 0, wordBreak: 'break-word' }}>
              {patientName ? `${greeting}, ${patientName}` : `${greeting}!`}
            </h2>
          </div>
          <p style={{ fontSize: 14, color: '#334E68', lineHeight: 1.4, margin: '0 0 10px 0', fontWeight: 500 }}>
            Let's start the day with a gentle mind exercise.
          </p>
          <span
            className="chip"
            style={{
              background: capReached ? 'rgba(211, 47, 47, 0.15)' : 'rgba(22, 36, 54, 0.08)',
              color: capReached ? 'var(--error)' : 'var(--ink)',
              fontWeight: 700,
              fontSize: 12,
              padding: '4px 10px',
              borderRadius: 12,
            }}
          >
            🎯 {sessionsToday}/{dailyGameLimit} games
          </span>
        </div>

        {/* Meditation silhouette illustration */}
        <div style={{ zIndex: 1, opacity: 0.28, marginRight: -10 }}>
          <svg width="120" height="120" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="22" r="12" fill="#162436" />
            <path
              d="M50 38c-12 0-22 8-22 18 0 8 5 16 12 20-10 2-20 8-20 14 0 4 8 6 30 6s30-2 30-6c0-6-10-12-20-14 7-4 12-12 12-20 0-10-10-18-22-18z"
              fill="#162436"
            />
            <path
              d="M20 78c4-8 16-14 30-14s26 6 30 14c-6 4-18 6-30 6s-24-2-30-6z"
              fill="#162436"
            />
          </svg>
        </div>
      </section>

      {/* 2. Recommended Game Card with Prominent PLAY CTA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: '#6B7280', letterSpacing: 0.5, textTransform: 'uppercase', margin: 0 }}>
          {lang === 'hi' ? 'आज का अनुशंसित खेल' : "Today's Recommended Game"}
        </h2>
        {capReached && (
          <span className="caption" style={{ color: 'var(--error)', fontWeight: 600 }}>
            {lang === 'hi' ? 'दैनिक सीमा पूरी' : 'Daily limit reached'}
          </span>
        )}
      </div>

      <section
        className="card"
        data-testid="start-game-btn"
        aria-label="Today's Game"
        style={{
          borderRadius: 24,
          padding: '24px 20px',
          marginBottom: 20,
          position: 'relative',
          cursor: capReached ? 'default' : 'pointer',
          opacity: capReached ? 0.75 : 1,
          border: '1.5px solid var(--border)',
          background: '#FFFFFF',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
        }}
        onClick={() => launchGame(today.id, pick?.difficulty ?? 0)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span
            style={{
              background: '#EADBCA',
              color: '#5C3E14',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.5,
              padding: '4px 10px',
              borderRadius: 8,
              textTransform: 'uppercase',
              border: '1px solid #D6C2A6',
            }}
          >
            {lang === 'hi' ? 'अनुशंसित' : 'RECOMMENDED'}
          </span>
          <span style={{ fontSize: 24 }}>{today.glyph}</span>
        </div>

        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: '#162436', marginBottom: 6 }}>
          {lang === 'hi' && today.nameHi ? today.nameHi : today.name}
        </h3>
        <p style={{ fontSize: 14, color: 'var(--ink-secondary)', marginBottom: 18, maxWidth: 300, lineHeight: 1.4 }}>
          {today.cultural || 'Identify your loved ones in a calm setting.'}
        </p>

        {/* Prominent Red PLAY Action Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: '#5A6A80', fontWeight: 600 }}>
            {today.domain}
          </span>

          <button
            type="button"
            className="btn btn-secondary"
            style={{
              borderRadius: 24,
              padding: '10px 24px',
              fontSize: 15,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: capReached ? '#8C9AA8' : '#9E2224',
              color: '#FFFFFF',
              boxShadow: '0 4px 12px rgba(158, 34, 36, 0.25)',
              border: 'none',
              cursor: capReached ? 'default' : 'pointer',
            }}
            onClick={(e) => {
              e.stopPropagation()
              launchGame(today.id, pick?.difficulty ?? 0)
            }}
          >
            <span>▶</span>
            <span>{lang === 'hi' ? 'शुरू करें (PLAY)' : 'PLAY'}</span>
          </button>
        </div>
      </section>

      {/* 3. Category Filter Chips */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {[
          { key: 'all', label: 'All Activities' },
          { key: 'memory', label: 'Memory' },
          { key: 'focus', label: 'Focus' },
        ].map((cat) => {
          const isActive = activeCategory === cat.key
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key as CategoryFilter)}
              style={{
                background: isActive ? '#0B131F' : '#E8E1D5',
                color: isActive ? '#fff' : '#162436',
                border: isActive ? 'none' : '1px solid #D8CFBF',
                borderRadius: 20,
                padding: '8px 18px',
                fontSize: 13,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* 4. Activity List */}
      <h2 style={{ fontSize: 13, fontWeight: 700, color: '#6B7280', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 }}>
        More Games
      </h2>
      <div className="tile-section" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {activeCategory === 'all'
          ? activityList.map((act) => (
              <button
                key={act.id}
                type="button"
                className="btn-block"
                onClick={() => launchGame(act.id, 0)}
                style={{
                  background: act.bg,
                  borderRadius: 20,
                  padding: '16px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  cursor: capReached ? 'default' : 'pointer',
                  opacity: capReached ? 0.75 : 1,
                  border: act.border || '1.5px solid var(--border)',
                  textAlign: 'left',
                  transition: 'transform 0.12s ease',
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: act.iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 26,
                    flexShrink: 0,
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
                  }}
                >
                  {act.glyph}
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: 16, fontWeight: 700, color: '#162436', marginBottom: 2 }}>
                    {act.title}
                  </strong>
                  <span style={{ fontSize: 13, color: '#5A6A80' }}>
                    {act.subtitle}
                  </span>
                </div>
              </button>
            ))
          : filteredGames.map((g) => {
              const isUnlocked = unlocked.some((u) => u.id === g.id)
              return (
                <button
                  key={g.id}
                  type="button"
                  className="card btn-block"
                  onClick={() => isUnlocked && !capReached && navigate(`/game/${g.id}?d=0`)}
                  style={{
                    borderRadius: 20,
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: isUnlocked ? 'pointer' : 'default',
                    border: 'none',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: '#ECECF0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                      }}
                    >
                      {g.glyph}
                    </div>
                    <div>
                      <strong style={{ display: 'block', fontSize: 16, color: '#162436', marginBottom: 2 }}>{g.name}</strong>
                      <span style={{ fontSize: 13, color: '#6B7280' }}>{g.cultural || `Phase ${g.phase}`}</span>
                    </div>
                  </div>
                  {!isUnlocked && (
                    <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>🔒</span>
                  )}
                </button>
              )
            })}
      </div>
    </div>
  )
}

function greetingByHour(lang: string): string {
  const h = new Date().getHours()
  if (lang === 'hi') {
    if (h < 12) return 'सुप्रभात'
    if (h < 17) return 'शुभ दोपहर'
    return 'शुभ संध्या'
  }
  if (lang === 'as') {
    if (h < 12) return 'সুপ্ৰভাত'
    if (h < 17) return 'শুভ দিন'
    return 'শুভ গধূলি'
  }
  if (h < 12) return 'Good Morning'
  if (h < 17) return 'Good Afternoon'
  return 'Good Evening'
}
