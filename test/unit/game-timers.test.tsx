import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { useEffect } from 'react'
import { useGameTimeout } from '../../src/games/shared'

function TimerHarness({ onFire }: { onFire: () => void }) {
  const scheduleTimeout = useGameTimeout()

  useEffect(() => {
    scheduleTimeout(onFire, 1000)
  }, [onFire, scheduleTimeout])

  return null
}

describe('game timer lifecycle', () => {
  it('cancels delayed callbacks when a game unmounts', () => {
    vi.useFakeTimers()
    const onFire = vi.fn()
    const { unmount } = render(<TimerHarness onFire={onFire} />)

    unmount()
    vi.advanceTimersByTime(1000)

    expect(onFire).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})
