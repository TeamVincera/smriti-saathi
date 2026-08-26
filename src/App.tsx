import { useEffect } from 'react'
import { useApp } from './state'
import { useHashRoute, navigate } from './router'
import { Layout } from './components/Layout'
import { ReminderOverlay } from './components/ReminderOverlay'
import { startReminderEngine } from './lib/reminders'
import { Onboarding } from './screens/Onboarding'
import { Home } from './screens/Home'
import { GameScreen } from './games/GameHost'
import { Garden } from './screens/Garden'
import { Meds } from './screens/Meds'
import { CaregiverHub } from './screens/CaregiverHub'

export default function App() {
  const { ready, profile, lang, sessionsToday, refreshSessions } = useApp()
  const { path } = useHashRoute()

  useEffect(() => {
    if (ready && profile?.onboarded) {
      startReminderEngine(() => lang)
    }
    return () => {}
  }, [ready, profile?.onboarded, lang])

  useEffect(() => {
    if (!ready || !profile?.onboarded) return
    const known =
      path === '/' || path === '/garden' || path === '/meds' || path === '/hub' || path.startsWith('/game/')
    if (!known) navigate('/')
  }, [ready, profile?.onboarded, path])

  useEffect(() => {
    if (!path.startsWith('/game/') && !path.includes('session')) {
      void refreshSessions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionsToday])

  if (!ready) {
    return (
      <div className="app center-col" style={{ justifyContent: 'center' }}>
        <h1 className="title muted">Smriti Sathi…</h1>
      </div>
    )
  }

  if (!profile?.onboarded) return <Onboarding />

  const isGame = path.startsWith('/game/')
  let screen = <Home />
  if (path === '/garden') screen = <Garden />
  else if (path === '/meds') screen = <Meds />
  else if (path === '/hub') screen = <CaregiverHub />
  else if (isGame) screen = <GameScreen />

  return (
    <Layout hideNav={isGame}>
      {screen}
      <ReminderOverlay />
    </Layout>
  )
}
