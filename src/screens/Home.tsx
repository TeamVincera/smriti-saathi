import { useEffect, useRef, useState, useMemo } from 'react'
import { useApp } from '../state'
import { navigate } from '../router'
import { GAMES, unlockedGames } from '../lib/games'
import { recommendNextGame } from '../lib/ai'
import { buildDailyPlan } from '../lib/dailyPlan'
import { DailyPlanCard } from '../components/DailyPlanCard'

type CategoryFilter = 'all' | 'memory' | 'focus' | 'language' | 'auditory' | 'sequencing'

export function Home() {
  const { profile, sessionsToday, dailyGameLimit, sessions, meds, dailyReminders, appointments, medlog, lang, t } = useApp()
  // Keep the first paint stable while the offline recommendation loads.
  const [pick, setPick] = useState<{ gameId: string; difficulty: number; exploration: boolean }>({
    gameId: GAMES[0].id,
    difficulty: 0,
    exploration: false,
  })
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all')
  const [capNotice, setCapNotice] = useState(false)
  const capDialogRef = useRef<HTMLDivElement>(null)
  const capCloseButtonRef = useRef<HTMLButtonElement>(null)
  const capTriggerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    void recommendNextGame().then((next) => {
      if (!next) return
      setPick((current) => (
        current.gameId === next.gameId && current.difficulty === next.difficulty && current.exploration === next.exploration
          ? current
          : next
      ))
    })
  }, [])

  const completed = sessions.length
  const unlocked = unlockedGames(completed)
  const today = pick ? GAMES.find((g) => g.id === pick.gameId) || GAMES[0] : GAMES[0]
  const capReached = sessionsToday >= dailyGameLimit
  const greeting = greetingByHour(lang)

  const patientName = profile?.patient.name?.trim() || ''

  const dailyPlan = useMemo(() => buildDailyPlan({
    meds: meds ?? [],
    dailyReminders: dailyReminders ?? [],
    appointments: appointments ?? [],
    medlog: medlog ?? [],
  }), [appointments, dailyReminders, medlog, meds])

  const filteredGames = useMemo(() => {
    if (activeCategory === 'all') return GAMES
    if (activeCategory === 'memory') {
      return GAMES.filter((g) => ['faces', 'tray', 'picture', 'pairs', 'places', 'foods', 'market', 'objects'].includes(g.id))
    }
    if (activeCategory === 'focus') {
      return GAMES.filter((g) => ['loom', 'bamboo', 'spot', 'oddone', 'safari'].includes(g.id))
    }
    if (activeCategory === 'language') {
      return GAMES.filter((g) => ['word', 'phrases', 'tales'].includes(g.id))
    }
    if (activeCategory === 'auditory') {
      return GAMES.filter((g) => ['melodies', 'sounds'].includes(g.id))
    }
    if (activeCategory === 'sequencing') {
      return GAMES.filter((g) => ['sequence', 'teawalk', 'bridge', 'cheraw', 'garden'].includes(g.id))
    }
    return GAMES
  }, [activeCategory])

  const showCapNotice = (trigger?: HTMLElement) => {
    capTriggerRef.current = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    setCapNotice(true)
  }

  const launchGame = (gameId: string, diff = 0, trigger?: HTMLElement) => {
    if (capReached) {
      showCapNotice(trigger)
      return
    }
    navigate(`/game/${gameId}?d=${diff}`)
  }

  useEffect(() => {
    if (!capNotice) {
      const trigger = capTriggerRef.current
      if (trigger) {
        const frame = window.requestAnimationFrame(() => {
          if (document.contains(trigger)) trigger.focus()
          capTriggerRef.current = null
        })
        return () => window.cancelAnimationFrame(frame)
      }
      return
    }

    const frame = window.requestAnimationFrame(() => capCloseButtonRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [capNotice])

  useEffect(() => {
    if (!capNotice) return

    const handleDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setCapNotice(false)
        return
      }
      if (event.key !== 'Tab') return

      const dialog = capDialogRef.current
      if (!dialog) return
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(
        (element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true'
      )
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleDialogKeyDown)
    return () => document.removeEventListener('keydown', handleDialogKeyDown)
  }, [capNotice])

  return (
    <div className="page patient-page home-page enter-anim" style={{ maxWidth: 'var(--max-w)', margin: '0 auto', paddingBottom: 'calc(140px + env(safe-area-inset-bottom, 0px))' }}>
      {/* 1. Hero Greeting Banner */}
      <section
        aria-labelledby="home-greeting-title"
        className="home-hero"
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
            <h2 id="home-greeting-title" style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', margin: 0, wordBreak: 'break-word' }}>
              {patientName ? `${greeting}, ${patientName}` : `${greeting}!`}
            </h2>
          </div>
          <p style={{ fontSize: 14, color: 'var(--pastel-blue-text)', lineHeight: 1.4, margin: '0 0 10px 0', fontWeight: 500 }}>
            {t('home_tagline')}
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
            🎯 {t('sessions_today', { n: sessionsToday, max: dailyGameLimit })}
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

      <DailyPlanCard items={dailyPlan} lang={lang} t={t} />

      {/* 2. Recommended Game Card with Prominent PLAY CTA */}
      <div className="home-section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-muted)', letterSpacing: 0.5, textTransform: 'uppercase', margin: 0 }}>
          {t('today_game')}
        </h2>
        {capReached && (
          <span className="caption" style={{ color: 'var(--error)', fontWeight: 600 }}>
            {t('home_daily_limit_reached')}
          </span>
        )}
      </div>

      <button
        type="button"
        className="card home-recommended-card"
        data-testid="start-game-btn"
        aria-label={t('aria_today_game')}
        aria-describedby="today-game-description"
        data-surface="recommended-game"
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
          width: '100%',
          fontFamily: 'inherit',
          textAlign: 'left',
        }}
        onClick={(event) => launchGame(today.id, pick?.difficulty ?? 0, event.currentTarget)}
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
            {t('home_recommended')}
          </span>
          <span style={{ fontSize: 24 }}>{today.glyph}</span>
        </div>

        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
          {lang === 'hi' && today.nameHi
            ? today.nameHi
            : (lang === 'as' || lang === 'bn') && today.nameAs
            ? today.nameAs
            : lang === 'mni' && today.nameMni
            ? today.nameMni
            : today.name}
        </h3>
        <p id="today-game-description" style={{ fontSize: 14, color: 'var(--ink-secondary)', marginBottom: 18, maxWidth: 300, lineHeight: 1.4 }}>
          {today.cultural || t('home_default_game_description')}
        </p>

        {/* Prominent Red PLAY Action Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: 'var(--ink-secondary)', fontWeight: 600 }}>
            {today.domain}
          </span>

          <span
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
          >
            <span>▶</span>
            <span>{t('start')}</span>
          </span>
        </div>
      </button>

      {/* 3. Category Filter Chips */}
      <div className="game-filter" role="group" aria-label={t('aria_filter_games')} style={{ display: 'flex', gap: 10, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {[
          { key: 'all' as const, label: t('cat_all') },
          { key: 'memory' as const, label: t('cat_memory') },
          { key: 'focus' as const, label: t('cat_attention') },
          { key: 'language' as const, label: t('cat_language') },
          { key: 'auditory' as const, label: t('cat_auditory') },
          { key: 'sequencing' as const, label: t('cat_sequencing') },
        ].map((cat) => {
          const isActive = activeCategory === cat.key
          return (
            <button
              key={cat.key}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActiveCategory(cat.key)}
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
      <h2 id="more-games-title" className="home-section-title" style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-muted)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 }}>
        {t('more_games')}
      </h2>
      <div className="tile-section responsive-games-grid game-list" aria-labelledby="more-games-title" style={{ gap: 14 }}>
        {filteredGames.map((g) => {
          const isUnlocked = unlocked.some((u) => u.id === g.id)
          const gameName =
            lang === 'hi' && g.nameHi
              ? g.nameHi
              : (lang === 'as' || lang === 'bn') && g.nameAs
              ? g.nameAs
              : lang === 'mni' && g.nameMni
              ? g.nameMni
              : g.name
          const gameCultural = lang === 'hi' && g.culturalHi ? g.culturalHi : g.cultural
          return (
            <button
              key={g.id}
              type="button"
              className="card btn-block game-tile"
              onClick={(event) => {
                if (capReached) {
                  showCapNotice(event.currentTarget)
                  return
                }
                if (isUnlocked) {
                  launchGame(g.id, 0, event.currentTarget)
                }
              }}
              aria-label={`${gameName}${!isUnlocked ? ` (${t('game_locked')})` : ''}`}
              style={{
                borderRadius: 20,
                padding: '16px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: isUnlocked ? (capReached ? 'default' : 'pointer') : 'default',
                opacity: isUnlocked ? (capReached ? 0.75 : 1) : 0.6,
                border: '1.5px solid var(--border)',
                background: 'var(--card)',
                textAlign: 'left',
                transition: 'transform 0.12s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: 'var(--surface-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    flexShrink: 0,
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
                  }}
                >
                  {g.glyph}
                </div>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block', fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {gameName}
                  </strong>
                  <span style={{ fontSize: 13, color: 'var(--ink-secondary)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {gameCultural || g.domain}
                  </span>
                </div>
              </div>
              <div style={{ flexShrink: 0, marginLeft: 12 }}>
                {!isUnlocked ? (
                  <span style={{ fontSize: 12, color: 'var(--ink-muted)', background: 'var(--surface-muted)', padding: '4px 8px', borderRadius: 8, fontWeight: 600 }}>
                    🔒
                  </span>
                ) : (
                  <span style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 700 }}>
                    ▶
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Gentle Limit Reached Modal */}
      {capNotice && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="daily-limit-dialog-title"
          aria-describedby="daily-limit-dialog-description"
          ref={capDialogRef}
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
            <h3 id="daily-limit-dialog-title" style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>
              {t('praise_title')}
            </h3>
            <p id="daily-limit-dialog-description" style={{ fontSize: 15, color: 'var(--ink-secondary)', lineHeight: 1.5, marginBottom: 24 }}>
              {t('rest_now')}
            </p>
            <button
              type="button"
              ref={capCloseButtonRef}
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
