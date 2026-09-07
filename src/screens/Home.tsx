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
  const { profile, sessionsToday, dailyGameLimit, sessions, lang, t } = useApp()
  const [pick, setPick] = useState<{ gameId: string; difficulty: number; exploration: boolean } | null>(null)
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all')
  const [capNotice, setCapNotice] = useState(false)

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
      title: lang === 'hi' ? 'घर के अपने चेहरे' : 'Faces of Home',
      subtitle: lang === 'hi' ? 'शांत वातावरण में अपने प्रियजनों को पहचानें' : 'Identify your loved ones in a calm setting',
      bg: 'var(--pastel-blue)',
      border: '1.5px solid var(--pastel-blue-border)',
      iconBg: 'var(--card)',
      iconColor: 'var(--pastel-blue-text)',
      glyph: '👨‍👩‍👧',
    },
    {
      id: 'tray',
      title: lang === 'hi' ? 'याददाश्त ट्रे' : 'Memory Tray',
      subtitle: lang === 'hi' ? 'पारंपरिक घरेलू वस्तुएं याद करें' : 'Recall traditional household items',
      bg: 'var(--pastel-green)',
      border: '1.5px solid var(--pastel-green-border)',
      iconBg: 'var(--card)',
      iconColor: 'var(--pastel-green-text)',
      glyph: '🪞',
    },
    {
      id: 'melodies',
      title: lang === 'hi' ? 'सुबह के सुर' : 'Morning Melodies',
      subtitle: lang === 'hi' ? 'सुनें और धुन याद करें' : 'Listen and recall the tune',
      bg: 'var(--pastel-purple)',
      border: '1.5px solid var(--pastel-purple-border)',
      iconBg: 'var(--card)',
      iconColor: 'var(--pastel-purple-text)',
      glyph: '🎵',
    },
    {
      id: 'pairs',
      title: lang === 'hi' ? 'परिवार एल्बम' : 'Family Album',
      subtitle: lang === 'hi' ? 'फूलों के जोड़े मिलाएं' : 'Match the floral pairs',
      bg: 'var(--pastel-blue)',
      border: '1.5px solid var(--pastel-blue-border)',
      iconBg: 'var(--card)',
      iconColor: 'var(--pastel-blue-text)',
      glyph: '🖼️',
    },
    {
      id: 'foods',
      title: lang === 'hi' ? 'पारंपरिक खाना' : 'Traditional Foods',
      subtitle: lang === 'hi' ? 'कदम-दर-कदम रेसिपी और व्यंजन' : 'Step by step recipes and dishes',
      bg: 'var(--pastel-peach)',
      border: '1.5px solid var(--pastel-peach-border)',
      iconBg: 'var(--card)',
      iconColor: 'var(--pastel-peach-text)',
      glyph: '🍲',
    },
  ]

  const launchGame = (gameId: string, diff = 0) => {
    if (capReached) {
      setCapNotice(true)
      return
    }
    navigate(`/game/${gameId}?d=${diff}`)
  }

  return (
    <div className="page enter-anim" style={{ maxWidth: 'var(--max-w)', margin: '0 auto', paddingBottom: 'calc(140px + env(safe-area-inset-bottom, 0px))' }}>
      {/* 1. Hero Greeting Banner */}
      <section
        style={{
          background: 'var(--pastel-blue)',
          borderRadius: 24,
          padding: '24px 20px',
          marginBottom: 16,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: '1.5px solid var(--pastel-blue-border)',
        }}
      >
        <div style={{ zIndex: 2, flex: 1, minWidth: 0, paddingRight: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', margin: 0, wordBreak: 'break-word' }}>
              {patientName ? `${greeting}, ${patientName}` : `${greeting}!`}
            </h2>
          </div>
          <p style={{ fontSize: 14, color: 'var(--pastel-blue-text)', lineHeight: 1.4, margin: '0 0 10px 0', fontWeight: 500 }}>
            {lang === 'hi' ? 'आज की शुरुआत एक हल्के मानसिक व्यायाम के साथ करें।' : 'Let\'s start the day with a gentle mind exercise.'}
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

        {/* Patient Avatar or Photo */}
        <div style={{ zIndex: 1, marginRight: -4, flexShrink: 0 }}>
          {profile?.patient.photo ? (
            <img
              src={profile.patient.photo}
              alt={profile.patient.name}
              style={{
                width: 76,
                height: 76,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid #ffffff',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
            />
          ) : (
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 42,
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                border: '2px solid rgba(255, 255, 255, 0.9)',
              }}
            >
              {profile?.patient.avatar || '👵'}
            </div>
          )}
        </div>
      </section>

      {/* 2. Recommended Game Card with Prominent PLAY CTA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-muted)', letterSpacing: 0.5, textTransform: 'uppercase', margin: 0 }}>
          {t('today_game')}
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
          background: 'var(--card)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
        }}
        onClick={() => launchGame(today.id, pick?.difficulty ?? 0)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span
            style={{
              background: 'var(--warn-soft)',
              color: 'var(--pastel-yellow-text)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.5,
              padding: '4px 10px',
              borderRadius: 8,
              textTransform: 'uppercase',
              border: '1px solid var(--pastel-yellow-border)',
            }}
          >
            {lang === 'hi' ? 'अनुशंसित' : 'RECOMMENDED'}
          </span>
          <span style={{ fontSize: 24 }}>{today.glyph}</span>
        </div>

        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
          {lang === 'hi' && today.nameHi ? today.nameHi : today.name}
        </h3>
        <p style={{ fontSize: 14, color: 'var(--ink-secondary)', marginBottom: 18, maxWidth: 300, lineHeight: 1.4 }}>
          {today.cultural || 'Identify your loved ones in a calm setting.'}
        </p>

        {/* Prominent Red PLAY Action Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: 'var(--ink-secondary)', fontWeight: 600 }}>
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
              background: capReached ? 'var(--ink-muted)' : '#9E2224',
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
            <span>{t('start')}</span>
          </button>
        </div>
      </section>

      {/* 3. Category Filter Chips */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {[
          { key: 'all', label: t('cat_all') },
          { key: 'memory', label: t('cat_memory') },
          { key: 'focus', label: t('cat_attention') },
        ].map((cat) => {
          const isActive = activeCategory === cat.key
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key as CategoryFilter)}
              style={{
                background: isActive ? 'var(--primary)' : 'var(--surface-muted)',
                color: isActive ? 'var(--ink-on-primary)' : 'var(--ink)',
                border: isActive ? 'none' : '1px solid #D8CFBF',
                borderRadius: 22,
                minHeight: 44,
                padding: '10px 20px',
                fontSize: 14,
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
      <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-muted)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 }}>
        {t('more_games')}
      </h2>
      <div className="tile-section responsive-games-grid" style={{ gap: 14 }}>
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
                  <strong style={{ display: 'block', fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>
                    {act.title}
                  </strong>
                  <span style={{ fontSize: 13, color: 'var(--ink-secondary)' }}>
                    {act.subtitle}
                  </span>
                </div>
              </button>
            ))
          : filteredGames.map((g) => {
              const isUnlocked = unlocked.some((u) => u.id === g.id)
              const gameName = lang === 'hi' && g.nameHi ? g.nameHi : g.name
              const gameCultural = lang === 'hi' && g.culturalHi ? g.culturalHi : g.cultural
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
                        background: 'var(--surface-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                      }}
                    >
                      {g.glyph}
                    </div>
                    <div>
                      <strong style={{ display: 'block', fontSize: 16, color: 'var(--ink)', marginBottom: 2 }}>{gameName}</strong>
                      <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>{gameCultural || (lang === 'hi' ? `चरण ${g.phase}` : `Phase ${g.phase}`)}</span>
                    </div>
                  </div>
                  {!isUnlocked && (
                    <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>🔒</span>
                  )}
                </button>
              )
            })}
      </div>

      {/* Gentle Limit Reached Modal */}
      {capNotice && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            zIndex: 1000,
          }}
          onClick={() => setCapNotice(false)}
        >
          <div
            className="card enter-anim"
            style={{
              maxWidth: 380,
              width: '100%',
              borderRadius: 24,
              padding: '28px 24px',
              textAlign: 'center',
              background: 'var(--card)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 44, marginBottom: 12 }}>🌸</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
              {t('praise_title')}
            </h3>
            <p style={{ fontSize: 15, color: 'var(--ink-secondary)', lineHeight: 1.5, marginBottom: 24 }}>
              {t('rest_now')}
            </p>
            <button
              type="button"
              className="btn btn-cta btn-block"
              onClick={() => setCapNotice(false)}
              style={{ minHeight: 48, borderRadius: 14, fontSize: 16, fontWeight: 700 }}
            >
              {t('done')}
            </button>
          </div>
        </div>
      )}
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
  if (lang === 'bn') {
    if (h < 12) return 'সুপ্রভাত'
    if (h < 17) return 'শুভ দুপুর'
    return 'শুভ সন্ধ্যা'
  }
  if (lang === 'brx') {
    if (h < 12) return 'फुंनि गोजोननाय'
    if (h < 17) return 'सानसुनि गोजोननाय'
    return 'बेलासिनि गोजोननाय'
  }
  if (lang === 'mni') {
    if (h < 12) return 'ꯑꯌꯨꯛꯀꯤ ꯈꯨꯔꯨꯝꯖꯔꯤ'
    if (h < 17) return 'ꯅꯨꯡꯊꯤꯜꯒꯤ ꯈꯨꯔꯨꯝꯖꯔꯤ'
    return 'ꯅꯨꯃꯤꯗꯥꯡꯒꯤ ꯈꯨꯔꯨꯝꯖꯔꯤ'
  }
  if (h < 12) return 'Good Morning'
  if (h < 17) return 'Good Afternoon'
  return 'Good Evening'
}
