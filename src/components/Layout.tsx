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
          <div className="nav-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {profile?.patient.photo ? (
                <img
                  src={profile.patient.photo}
                  alt={profile.patient.name}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '1.5px solid var(--border)',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'var(--surface-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                  }}
                >
                  {profile?.patient.avatar || '👵'}
                </div>
              )}
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 20,
                  color: 'var(--ink)',
                  letterSpacing: -0.2,
                }}
              >
                {translate(lang, 'brand')}
              </span>
            </div>

            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-chatbot'))}
              aria-label="Open Voice Assistant"
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'var(--surface-muted)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Icon name="mic" size={20} color="var(--primary)" />
            </button>
          </div>
        </header>
      )}

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</main>

      {!hideNav && (
        <nav className="tabbar" aria-label="Primary">
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
