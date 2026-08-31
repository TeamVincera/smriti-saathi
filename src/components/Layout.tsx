import type { ReactNode } from 'react'
import { useApp } from '../state'
import { navigate } from '../router'
import { Icon } from './Icons'

export function Layout({ children, hideNav = false }: { children: ReactNode; hideNav?: boolean }) {
  const { profile } = useApp()
  const path = window.location.hash.replace(/^#/, '').split('?')[0] || '/'

  const tabs: { to: string; icon: string; label: string; testid: string }[] = [
    { to: '/', icon: 'home', label: 'Home', testid: 'nav-home' },
    { to: '/reminders', icon: 'bell', label: 'Reminders', testid: 'nav-reminders' },
    { to: '/meds', icon: 'pill', label: 'Medicines', testid: 'nav-meds' },
    { to: '/hub', icon: 'people', label: 'Caregiver', testid: 'nav-hub' },
  ]

  return (
    <div className="app">
      {!hideNav && (
        <header className="nav-global">
          <div className="nav-inner">
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
                    background: '#ECECF0',
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
                Smriti Sathi
              </span>
            </div>
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
