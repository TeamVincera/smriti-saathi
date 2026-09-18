import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from '../../src/components/ConfirmDialog'

describe('ConfirmDialog', () => {
  it('has a labelled modal, focuses the safe action, traps Tab, and closes on Escape', () => {
    const onCancel = vi.fn()
    render(
      <ConfirmDialog
        open
        title="Reset app data?"
        body="Your saved information will be removed."
        cancelLabel="Cancel"
        confirmLabel="Reset"
        onCancel={onCancel}
        onConfirm={() => undefined}
        destructive
      />,
    )

    const dialog = screen.getByRole('dialog', { name: 'Reset app data?' })
    const cancel = screen.getByRole('button', { name: 'Cancel' })
    const confirm = screen.getByRole('button', { name: 'Reset' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(cancel).toHaveFocus()

    confirm.focus()
    fireEvent.keyDown(dialog, { key: 'Tab' })
    expect(cancel).toHaveFocus()
    cancel.focus()
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true })
    expect(confirm).toHaveFocus()
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('restores opener focus and does not refocus Cancel on parent rerenders', () => {
    const opener = document.createElement('button')
    opener.type = 'button'
    opener.textContent = 'Open'
    document.body.appendChild(opener)
    opener.focus()

    const { rerender } = render(
      <ConfirmDialog
        open
        title="Remove member?"
        body="Please confirm."
        cancelLabel="Cancel"
        confirmLabel="Remove"
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />,
    )
    const confirm = screen.getByRole('button', { name: 'Remove' })
    confirm.focus()

    rerender(
      <ConfirmDialog
        open
        title="Remove member?"
        body="Please confirm."
        cancelLabel="Cancel"
        confirmLabel="Remove"
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />,
    )
    expect(confirm).toHaveFocus()

    rerender(
      <ConfirmDialog
        open={false}
        title="Remove member?"
        body="Please confirm."
        cancelLabel="Cancel"
        confirmLabel="Remove"
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />,
    )
    expect(opener).toHaveFocus()
    opener.remove()
  })
})
