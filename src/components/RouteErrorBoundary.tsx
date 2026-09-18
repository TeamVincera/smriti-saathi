import { Component, type ErrorInfo, type ReactNode } from 'react'
import type { Language } from '../lib/types'
import { translate } from '../i18n'

interface RouteErrorBoundaryProps {
  children: ReactNode
  routeKey: string
  lang: Language
}

interface RouteErrorBoundaryState {
  error: Error | null
}

/** Keeps a failed lazy chunk from taking down the whole offline app shell. */
export class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return { error }
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // The UI intentionally avoids logging route content or patient data.
  }

  componentDidUpdate(previousProps: RouteErrorBoundaryProps) {
    if (previousProps.routeKey !== this.props.routeKey && this.state.error) {
      this.setState({ error: null })
    }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="page center-col" role="alert" aria-live="assertive" style={{ textAlign: 'center', padding: 'var(--s-2xl)' }}>
        <h1 className="title">{translate(this.props.lang, 'route_error_title')}</h1>
        <p className="lead" style={{ maxWidth: 460, marginTop: 'var(--s-md)' }}>
          {translate(this.props.lang, 'route_error_body')}
        </p>
        <button className="btn btn-primary mt-lg" type="button" onClick={() => window.location.reload()}>
          {translate(this.props.lang, 'route_error_retry')}
        </button>
      </div>
    )
  }
}
