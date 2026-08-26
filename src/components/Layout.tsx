import type { ReactNode } from 'react'
import { useApp } from '../state'
import { navigate } from '../router'
import { BrandMark, Icon } from './Icons'

export function Layout({ children, hideNav = false }: { children: ReactNode; hideNav?: boolean }) {
  const { t } = useApp()
  const path = window.location.hash.replace(/^#/, '').split('?')[0] || '/'

  const tabs: { to: string; icon: string; label: string; testid: string }[] = [
    { to: '/', icon: 'home', label: t('nav_home'), testid: 'nav-home' },
    { to: '/garden', icon: 'garden', label: t('nav_garden'), testid: 'nav-garden' },
    { to: '/meds', icon: 'pill', label: t('nav_meds'), testid: 'nav-meds' },
    { to: '/hub', icon: 'people', label: t('nav_hub'), testid: 'nav-hub' },
  ]

  return (
    <div className="app">
      {!hideNav && (
        <header className="nav-global" style={{ paddingInline: 'max(var(--s-lg), env(safe-area-inset-left))' }}>
          <button className="nav-brand" onClick={() => navigate('/')} aria-label={t('brand')}>
            <BrandMark />
            <span>{t('brand')}</span>
          </button>
          <div className="nav-actions">
            <span className="caption" style={{ color: '#ccc' }}>{t('tagline')}</span>
          </div>
        </header>
      )}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</main>
      {!hideNav && (
        <nav className="tabbar" aria-label="Primary">
          {tabs.map((tab) => (
            <button
              key={tab.to}
              data-testid={tab.testid}
              className={`tab-item ${path === tab.to ? 'active' : ''}`}
              onClick={() => navigate(tab.to)}
              aria-current={path === tab.to ? 'page' : undefined}
            >
              <Icon name={tab.icon} />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}
