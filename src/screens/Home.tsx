import { useEffect, useState } from 'react'
import { useApp } from '../state'
import { navigate } from '../router'
import { GAMES, unlockedGames } from '../lib/games'
import { recommendNextGame } from '../lib/ai'
import { loadConfig } from '../lib/db'
import { Icon } from '../components/Icons'
import { SpeakerButton } from '../components/SpeakerButton'

export function Home() {
  const { t, profile, sessionsToday, say, sessions } = useApp()
  const [pick, setPick] = useState<{ gameId: string; difficulty: number; exploration: boolean } | null>(null)
  const [cap, setCap] = useState(3)

  useEffect(() => {
    void recommendNextGame().then(setPick)
    void loadConfig().then((c) => setCap(c.maxSessionsPerDay))
    const timer = setTimeout(() => say('welcome', { name: profile?.patient.name ?? '' }), 600)
    return () => clearTimeout(timer)
  }, [])

  const completed = sessions.length
  const unlocked = unlockedGames(completed)
  const today = pick ? GAMES.find((g) => g.id === pick.gameId) : null
  const capReached = sessionsToday >= cap
  const greeting = greetingByHour()

  return (
    <div className="page enter-anim">
      <section className="tile-section" style={{ padding: 'var(--s-xl) var(--s-lg)', borderRadius: 'var(--r-lg)', background: 'var(--parchment)' }}>
        <div className="tile-inner">
          <p className="lead">{greeting}, <strong>{profile?.patient.name}</strong></p>
          <h1 className="hero-title">{t('today_game')}</h1>
          {today ? (
            <>
              <button
                className={`game-card ${!capReached ? 'cue-target' : ''}`}
                style={{ maxWidth: 460, width: '100%', minHeight: 300 }}
                onClick={() => !capReached && navigate(`/game/${today.id}?d=${pick!.difficulty}`)}
              >
                <span className="glyph" style={{ fontSize: 84 }}>{today.glyph}</span>
                <span className="display-md">{profile?.language === 'hi' && today.nameHi ? today.nameHi : today.name}</span>
                <span className="lead">{today.domain}</span>
                <span className="chip phase-chip">Phase {today.phase} · {today.principle}</span>
              </button>
              {capReached ? (
                <p className="lead">{t('rest_now')}</p>
              ) : (
                <button className="btn btn-primary btn-big" data-testid="start-game-btn" onClick={() => navigate(`/game/${today.id}?d=${pick!.difficulty}`)}>
                  ▶ {t('start')}
                </button>
              )}
              <div className="row">
                <span className="chip">{t('sessions_today', { n: Math.min(sessionsToday, cap), max: cap })}</span>
              </div>
            </>
          ) : (
            <p className="lead">…</p>
          )}
        </div>
      </section>

      <section className="mt-xxl">
        <div className="row-between" style={{ marginBottom: 'var(--s-md)' }}>
          <h2 className="display-md">{t('more_games')}</h2>
          <SpeakerButton text={t('more_games')} lang={profile?.language ?? 'en'} />
        </div>
        <div className="grid grid-games">
          {GAMES.map((g) => {
            const isUnlocked = unlocked.some((u) => u.id === g.id)
            return (
              <button
                key={g.id}
                className={`game-card`}
                style={!isUnlocked ? { opacity: 0.55 } : undefined}
                onClick={() => isUnlocked && !capReached && navigate(`/game/${g.id}?d=0`)}
              >
                <span className="glyph">{isUnlocked ? g.glyph : '🔒'}</span>
                <span className="title">{profile?.language === 'hi' && g.nameHi ? g.nameHi : g.name}</span>
                <span className="caption">{g.cultural}</span>
                <span className="chip phase-chip">Phase {g.phase}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="mt-xxl grid" style={{ maxWidth: 900 }}>
        <QuickCard icon="garden" title={t('nav_garden')} body="Watch your orchids grow with every session and medicine." to="/garden" />
        <QuickCard icon="pill" title={t('nav_meds')} body="See today's medicines and confirm doses." to="/meds" />
      </section>
    </div>
  )
}

function QuickCard({ icon, title, body, to }: { icon: string; title: string; body: string; to: string }) {
  return (
    <button className="card row-between" style={{ textAlign: 'left', alignItems: 'flex-start' }} onClick={() => navigate(to)}>
      <div>
        <h3 className="title"><Icon name={icon} size={22} /> {title}</h3>
        <p className="caption" style={{ marginTop: 6 }}>{body}</p>
      </div>
      <span className="muted" aria-hidden>→</span>
    </button>
  )
}

function greetingByHour(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Suprabhat'
  if (h < 17) return 'Shubho din'
  return 'Shubho shondhya'
}
