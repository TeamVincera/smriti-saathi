import type { Language } from '../lib/types'
import { translate } from '../i18n'

/**
 * A deliberately quiet loading state for route-level chunks. It keeps the
 * loading announcement available to assistive technology without adding
 * another dependency to the initial bundle.
 */
export function ScreenLoadingFallback({ lang }: { lang: Language }) {
  return (
    <div className="page center-col" role="status" aria-live="polite" aria-busy="true">
      <span aria-hidden="true" style={{ fontSize: 40, marginBottom: 'var(--s-md)' }}>🌿</span>
      <p className="lead" style={{ textAlign: 'center' }}>
        {translate(lang, 'loading_wait')}
      </p>
    </div>
  )
}
