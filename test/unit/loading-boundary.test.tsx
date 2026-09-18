import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ScreenLoadingFallback } from '../../src/components/ScreenLoadingFallback'

describe('ScreenLoadingFallback', () => {
  it('announces a calm English loading state to assistive technology', () => {
    render(<ScreenLoadingFallback lang="en" />)

    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toHaveAttribute('aria-busy', 'true')
    expect(status).toHaveTextContent('Just a moment…')
  })

  it('uses the Hindi loading copy when Hindi is active', () => {
    render(<ScreenLoadingFallback lang="hi" />)

    expect(screen.getByRole('status')).toHaveTextContent('थोड़ा इंतज़ार करें…')
  })
})
