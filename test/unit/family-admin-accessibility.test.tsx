import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FamilyAdmin } from '../../src/screens/CaregiverHub'

vi.mock('../../src/state', () => ({
  useApp: () => ({
    t: (key: string) => key,
  }),
}))

describe('FamilyAdmin accessibility', () => {
  it('exposes photo selection as a named button and associates form fields', () => {
    const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => undefined)
    render(
      <FamilyAdmin
        profile={{ cultural: { familyMembers: [] } } as never}
        onSave={async () => undefined}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /add_family_member/i }))
    const photoButtons = screen.getAllByRole('button', { name: 'family_photo' })
    expect(photoButtons.length).toBeGreaterThanOrEqual(1)
    fireEvent.click(photoButtons[0])
    expect(click).toHaveBeenCalled()
    expect(screen.getByLabelText('onb_name')).toBeInTheDocument()
    expect(screen.getByLabelText('hub_cg_relation')).toBeInTheDocument()
    click.mockRestore()
  })
})
