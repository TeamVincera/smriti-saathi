import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RouteErrorBoundary } from '../../src/components/RouteErrorBoundary'

function BrokenScreen(): JSX.Element {
  throw new Error('chunk failed')
}

describe('RouteErrorBoundary', () => {
  it('keeps the app shell usable when a lazy route fails', () => {
    render(
      <RouteErrorBoundary routeKey="/game/test" lang="en">
        <BrokenScreen />
      </RouteErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(/saved information is safe/i)
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })
})
