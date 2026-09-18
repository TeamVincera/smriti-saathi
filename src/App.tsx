import { lazy, Suspense, useEffect } from 'react'
import { useApp } from './state'
import { useHashRoute, navigate } from './router'
import { Layout } from './components/Layout'
import { ReminderOverlay } from './components/ReminderOverlay'
import { ScreenLoadingFallback } from './components/ScreenLoadingFallback'
import { RouteErrorBoundary } from './components/RouteErrorBoundary'
import { AIChatbot } from './components/AIChatbot'
import { startReminderEngine } from './lib/reminders'
import { initAlarmService, syncAllAlarmsToNative } from './lib/alarmService'

// Keep the app shell (navigation, reminder service, and state) in the initial
// bundle while loading each route's heavier screen only when it is needed.
const Onboarding = lazy(() => import('./screens/Onboarding').then(({ Onboarding }) => ({ default: Onboarding })))
const Home = lazy(() => import('./screens/Home').then(({ Home }) => ({ default: Home })))
const GameScreen = lazy(() => import('./games/GameHost').then(({ GameScreen }) => ({ default: GameScreen })))
const Reminders = lazy(() => import('./screens/Reminders').then(({ Reminders }) => ({ default: Reminders })))
const Meds = lazy(() => import('./screens/Meds').then(({ Meds }) => ({ default: Meds })))
const CaregiverHub = lazy(() => import('./screens/CaregiverHub').then(({ CaregiverHub }) => ({ default: CaregiverHub })))

export default function App() {
  const { ready, profile, lang } = useApp()
  const { path } = useHashRoute()

  useEffect(() => {
    if (ready && profile?.onboarded) {
      startReminderEngine(() => lang)
      void initAlarmService(lang)
    }
    return () => {}
  }, [ready, profile?.onboarded, lang])

  useEffect(() => {
    if (!ready || !profile?.onboarded) return

    // Rebuild the OS-owned schedule whenever the app returns to the foreground.
    // This repairs reminders after a permission or clock/time-zone change.
    const resyncWhenVisible = () => {
      if (document.visibilityState === 'visible') void syncAllAlarmsToNative(lang)
    }
    document.addEventListener('visibilitychange', resyncWhenVisible)
    window.addEventListener('focus', resyncWhenVisible)
    return () => {
      document.removeEventListener('visibilitychange', resyncWhenVisible)
      window.removeEventListener('focus', resyncWhenVisible)
    }
  }, [ready, profile?.onboarded, lang])

  useEffect(() => {
    if (!ready || !profile?.onboarded) return
    const known =
      path === '/' || path === '/reminders' || path === '/meds' || path === '/hub' || path.startsWith('/game/')
    if (!known) navigate('/', true)
  }, [ready, profile?.onboarded, path])

  if (!ready) {
    return (
      <div className="app center-col" style={{ justifyContent: 'center' }}>
        <h1 className="title muted">Smriti Sathi…</h1>
      </div>
    )
  }

  if (!profile?.onboarded) {
    return (
      <RouteErrorBoundary routeKey="/onboarding" lang={lang}>
        <Suspense fallback={<ScreenLoadingFallback lang={lang} />}>
          <Onboarding />
        </Suspense>
      </RouteErrorBoundary>
    )
  }

  const isGame = path.startsWith('/game/')
  let screen = <Home />
  if (path === '/reminders') screen = <Reminders />
  else if (path === '/meds') screen = <Meds />
  else if (path === '/hub') screen = <CaregiverHub />
  else if (isGame) screen = <GameScreen />

  return (
    <Layout hideNav={isGame}>
      <RouteErrorBoundary routeKey={path} lang={lang}>
        <Suspense fallback={<ScreenLoadingFallback lang={lang} />}>
          {screen}
          {!isGame && <AIChatbot />}
        </Suspense>
      </RouteErrorBoundary>
      <ReminderOverlay />
    </Layout>
  )
}
