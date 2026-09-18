import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MarketDay } from '../../src/games/MarketDay'

describe('Market Day completion', () => {
  beforeEach(() => {
    cleanup()
  })

  it('gives gentle guidance instead of completing with an empty basket', () => {
    const complete = vi.fn()
    const logAction = vi.fn()
    render(<MarketDay complete={complete} logAction={logAction} difficulty={0} />)

    fireEvent.click(screen.getByRole('button', { name: /Finish shopping/i }))

    expect(complete).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent(/choose an item for your basket first/i)
  })

  it('completes after at least one item is placed in the basket', () => {
    const complete = vi.fn()
    const logAction = vi.fn()
    render(<MarketDay complete={complete} logAction={logAction} difficulty={0} />)

    fireEvent.click(document.querySelector('.choice-btn') as HTMLButtonElement)
    fireEvent.click(screen.getByRole('button', { name: /Finish shopping/i }))

    expect(complete).toHaveBeenCalledWith(expect.objectContaining({ completion: 1 }))
    expect(logAction).toHaveBeenCalledWith('unprompted')
  })

  it('does not save a second session when Finish is activated repeatedly', () => {
    const complete = vi.fn()
    const logAction = vi.fn()
    render(<MarketDay complete={complete} logAction={logAction} difficulty={0} />)

    fireEvent.click(document.querySelector('.choice-btn') as HTMLButtonElement)
    const finish = screen.getByRole('button', { name: /Finish shopping/i })
    fireEvent.click(finish)
    fireEvent.click(finish)

    expect(complete).toHaveBeenCalledTimes(1)
  })

  it('gives cart removal a named 48px touch target', () => {
    const complete = vi.fn()
    const logAction = vi.fn()
    render(<MarketDay complete={complete} logAction={logAction} difficulty={0} />)

    fireEvent.click(document.querySelector('.choice-btn') as HTMLButtonElement)
    const remove = screen.getByRole('button', { name: /Remove /i })

    expect(remove).toHaveAttribute('aria-label')
    expect(remove.style.minHeight).toBe('48px')
    expect(remove.style.minWidth).toBe('48px')
  })
})
