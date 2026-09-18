import { test, expect } from '@playwright/test'
import { seedOnboardedState } from './helpers'

test.describe('Caregiver Hub Security & Analytics E2E Suite', () => {
  test.beforeEach(async ({ page }) => {
    await seedOnboardedState(page)
  })

  test('unlocks caregiver hub with PIN keypad and shows health watch analytics', async ({ page }) => {
    await page.goto('/#/hub')
    await expect(page.getByRole('heading', { name: /Enter caregiver PIN/i })).toBeVisible()

    const back = page.locator('.page button.icon-btn').first()
    const backBox = await back.boundingBox()
    expect(backBox).not.toBeNull()
    if (backBox) {
      // WebKit can report a 48px CSS box as 47.999992 due to device-pixel rounding.
      expect(Math.round(backBox.width)).toBeGreaterThanOrEqual(48)
      expect(Math.round(backBox.height)).toBeGreaterThanOrEqual(48)
    }

    // Enter incorrect PIN (9999)
    await page.getByRole('button', { name: '9', exact: true }).click()
    await page.getByRole('button', { name: '9', exact: true }).click()
    await page.getByRole('button', { name: '9', exact: true }).click()
    await page.getByRole('button', { name: '9', exact: true }).click()
    await expect(page.getByText(/Wrong PIN — try again/i)).toBeVisible()
    await page.waitForTimeout(750)

    // Clear with 'C' to ensure clean state
    await page.getByRole('button', { name: 'C', exact: true }).click()

    // Enter correct PIN (1234)
    await page.getByRole('button', { name: '1', exact: true }).click()
    await page.getByRole('button', { name: '2', exact: true }).click()
    await page.getByRole('button', { name: '3', exact: true }).click()
    await page.getByRole('button', { name: '4', exact: true }).click()

    // Verify unlocked dashboard
    await expect(page.getByText(/Overview|Caregiver mode|Weekly Digest/i).first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('tab', { name: /Weekly Digest/i })).toBeVisible()
  })

  test('securely recovers caregiver access via phone verification and explicit PIN reset', async ({ page }) => {
    await page.goto('/#/hub')
    await expect(page.getByRole('heading', { name: /Enter caregiver PIN/i })).toBeVisible()

    const reminderOverlay = page.getByRole('alertdialog')
    if (await reminderOverlay.isVisible()) {
      await reminderOverlay.getByRole('button', { name: /Taken|Dismiss/i }).first().click()
    }

    // 1. Open Forgot PIN modal
    await page.getByRole('button', { name: /Forgot PIN\?/i }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('heading', { name: /Verify Caregiver Identity/i })).toBeVisible()
    await expect(dialog.getByText(/•••••• 3210/)).toBeVisible()

    // 2. Try incorrect phone number
    const phoneInput = dialog.locator('#caregiver-phone-input')
    await phoneInput.fill('9999999999')
    await dialog.getByRole('button', { name: /Verify Caregiver/i }).click()
    await expect(dialog.getByRole('alert')).toContainText(/Phone number does not match/i)
    await expect(dialog.getByRole('alert')).toContainText(/2 attempts remaining/i)

    // 3. Enter correct registered phone number
    await phoneInput.fill('9876543210')
    await dialog.getByRole('button', { name: /Verify Caregiver/i }).click()

    // 4. Modal advances to Set New PIN stage
    await expect(dialog.getByRole('heading', { name: /Set New Caregiver PIN/i })).toBeVisible()

    // 5. Enter new PIN (5678) using dialog numpad
    await dialog.getByRole('button', { name: '5', exact: true }).click()
    await dialog.getByRole('button', { name: '6', exact: true }).click()
    await dialog.getByRole('button', { name: '7', exact: true }).click()
    await dialog.getByRole('button', { name: '8', exact: true }).click()

    // 6. Verify auto-advances to Confirm PIN stage
    await expect(dialog.getByText(/Re-enter to confirm|Confirm PIN/i).first()).toBeVisible()

    // 7. Enter matching PIN (5678)
    await dialog.getByRole('button', { name: '5', exact: true }).click()
    await dialog.getByRole('button', { name: '6', exact: true }).click()
    await dialog.getByRole('button', { name: '7', exact: true }).click()
    await dialog.getByRole('button', { name: '8', exact: true }).click()

    // Saving is explicit after both PIN entries match.
    await expect(dialog.getByRole('button', { name: /Save new PIN/i })).toBeEnabled()
    await dialog.getByRole('button', { name: /Save new PIN/i }).click()

    // 8. Verify success screen and automatic unlock into Caregiver Hub
    await expect(dialog.getByText(/New PIN set successfully/i)).toBeVisible()
    await expect(page.getByText(/Overview|Caregiver mode|Weekly Digest/i).first()).toBeVisible({ timeout: 10000 })

    // 9. Revisit hub to verify old PIN is invalidated and new PIN (5678) works
    await page.goto('/')
    await page.goto('/#/hub')
    await expect(page.getByRole('heading', { name: /Enter caregiver PIN/i })).toBeVisible()

    // Old PIN (1234) should fail
    await page.getByRole('button', { name: '1', exact: true }).click()
    await page.getByRole('button', { name: '2', exact: true }).click()
    await page.getByRole('button', { name: '3', exact: true }).click()
    await page.getByRole('button', { name: '4', exact: true }).click()
    await expect(page.getByText(/Wrong PIN — try again/i)).toBeVisible()
    await page.waitForTimeout(700)

    // Clear and enter new PIN (5678)
    await page.getByRole('button', { name: 'C', exact: true }).click()
    await page.getByRole('button', { name: '5', exact: true }).click()
    await page.getByRole('button', { name: '6', exact: true }).click()
    await page.getByRole('button', { name: '7', exact: true }).click()
    await page.getByRole('button', { name: '8', exact: true }).click()

    await expect(page.getByText(/Overview|Caregiver mode|Weekly Digest/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('manages medication and reminder records with keyboard-readable controls', async ({ page }) => {
    await page.goto('/#/hub')
    await expect(page.getByRole('heading', { name: /Enter caregiver PIN/i })).toBeVisible()
    for (const digit of ['1', '2', '3', '4']) {
      await page.getByRole('button', { name: digit, exact: true }).click()
    }
    await expect(page.getByRole('tab', { name: /Medicines/i })).toBeVisible()

    await page.getByRole('tab', { name: /Medicines/i }).click()
    await page.getByRole('button', { name: /Add Medicine/i }).click()
    await page.getByLabel(/Medicine Name/i).fill('Evening Vitamin')
    await page.getByRole('button', { name: /Next/i }).click()
    await page.getByRole('button', { name: /Next/i }).click()
    await page.getByRole('button', { name: /Save & Activate/i }).click()
    await expect(page.getByText('Evening Vitamin')).toBeVisible()

    await page.getByRole('tab', { name: /Reminders/i }).click()
    await expect(page.getByRole('tab', { name: /Daily Reminders/i })).toHaveAttribute('aria-selected', 'true')
    await page.getByRole('tab', { name: /Doctor Appointments/i }).click()
    await expect(page.getByRole('tabpanel', { name: /Doctor Appointments/i })).toBeVisible()
    await page.getByRole('button', { name: /Schedule Appointment/i }).click()
    await expect(page.getByRole('heading', { name: /Schedule Doctor Appointment/i })).toBeVisible()
    await expect(page.getByLabel(/Appointment Reason/i)).toBeVisible()
  })
})
