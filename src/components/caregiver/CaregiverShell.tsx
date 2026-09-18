import type { ReactNode } from 'react'
import { useApp } from '../../state'

export type CaregiverTab = 'overview' | 'family' | 'meds' | 'reminders' | 'settings'

interface CaregiverShellProps {
  tab: CaregiverTab
  onTabChange: (tab: CaregiverTab) => void
  children: ReactNode
}

const TAB_KEYS: Array<{ key: CaregiverTab; icon: string; labelKey: string }> = [
  { key: 'overview', icon: '📊', labelKey: 'hub_digest' },
  { key: 'family', icon: '👨‍👩‍👧', labelKey: 'hub_family' },
  { key: 'meds', icon: '💊', labelKey: 'hub_medicines' },
  { key: 'reminders', icon: '🔔', labelKey: 'nav_reminders' },
  { key: 'settings', icon: '⚙️', labelKey: 'hub_settings' },
]

export function CaregiverShell({ tab, onTabChange, children }: CaregiverShellProps) {
  const { t } = useApp()

  const moveTab = (current: CaregiverTab, direction: -1 | 1 | 'first' | 'last') => {
    const index = TAB_KEYS.findIndex(({ key }) => key === current)
    const nextIndex = direction === 'first'
      ? 0
      : direction === 'last'
        ? TAB_KEYS.length - 1
        : (index + direction + TAB_KEYS.length) % TAB_KEYS.length
    const nextTab = TAB_KEYS[nextIndex].key
    onTabChange(nextTab)
    requestAnimationFrame(() => document.getElementById(`caregiver-tab-${nextTab}`)?.focus())
  }

  return (
    <div className="page caregiver-hub-page enter-anim">
      <header className="caregiver-hub-header">
        <h1>{t('nav_hub')}</h1>
        <p>{t('hub_subtitle')}</p>
      </header>

      <nav className="caregiver-hub-tabs" aria-label={t('nav_hub')} role="tablist">
        {TAB_KEYS.map(({ key, icon, labelKey }) => {
          const active = tab === key
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`caregiver-panel-${key}`}
              id={`caregiver-tab-${key}`}
              tabIndex={active ? 0 : -1}
              className={`caregiver-hub-tab${active ? ' is-active' : ''}`}
              onClick={() => onTabChange(key)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                  event.preventDefault()
                  moveTab(key, 1)
                } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                  event.preventDefault()
                  moveTab(key, -1)
                } else if (event.key === 'Home') {
                  event.preventDefault()
                  moveTab(key, 'first')
                } else if (event.key === 'End') {
                  event.preventDefault()
                  moveTab(key, 'last')
                }
              }}
            >
              {icon} {t(labelKey)}
            </button>
          )
        })}
      </nav>

      <main id={`caregiver-panel-${tab}`} role="tabpanel" aria-labelledby={`caregiver-tab-${tab}`} className="caregiver-hub-panel">
        {children}
      </main>
    </div>
  )
}
