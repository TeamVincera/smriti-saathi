import type { ReactNode } from 'react'
import { useApp } from '../state'
import { navigate } from '../router'
import { Icon } from './Icons'
import { translate } from '../i18n'

export function Layout({ children, hideNav = false }: { children: ReactNode; hideNav?: boolean }) {
  const { profile, lang } = useApp()
  const path = window.location.hash.replace(/^#/, '').split('?')[0] || '/'
  const tabs: { to: string; icon: string; label: string; testid: string }[] = [
    { to: '/', icon: 'home', label: translate(lang, 'nav_home'), testid: 'nav-home' },
    { to: '/reminders', icon: 'bell', label: translate(lang, 'nav_reminders'), testid: 'nav-reminders' },
    { to: '/meds', icon: 'pill', label: translate(lang, 'nav_meds'), testid: 'nav-meds' },
    { to: '/hub', icon: 'people', label: translate(lang, 'nav_hub'), testid: 'nav-hub' },
  ]

  return (
    <div className="app">
      {!hideNav && (
        <header className="nav-global">
          <div className="nav-inner">
            <div className="nav-brand">
              {profile?.patient.photo ? (
                <img
                  src={profile.patient.photo}
                  alt={profile.patient.name}
                  className="nav-avatar"
                />
              ) : (
                <div className="nav-avatar nav-avatar-fallback" aria-hidden="true">
                  {profile?.patient.avatar || '👵'}
                </div>
              )}
              <span className="nav-brand-name">
                {translate(lang, 'brand')}
              </span>
            </div>

            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-chatbot'))}
              aria-label={translate(lang, 'aria_voice_assistant')}
              className="nav-audio-btn"
            >
              <Icon name="mic" size={20} color="var(--primary)" />
            </button>
          </div>
        </header>
      )}

      <main className="app-main">{children}</main>

      {!hideNav && (
        <nav className="tabbar" aria-label={translate(lang, 'aria_primary_navigation')}>
          <div className="tabbar-inner">
            {tabs.map((tab) => {
              const isActive = path === tab.to
              return (
                <button
                  key={tab.to}
                  data-testid={tab.testid}
                  className={`tab-item ${isActive ? 'active' : ''}`}
                  onClick={() => navigate(tab.to)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon name={tab.icon} size={20} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}
