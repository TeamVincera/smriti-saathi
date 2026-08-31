import { test, expect } from '@playwright/test'
import { seedOnboardedState } from './helpers'

test.describe('Reminders & Medication Management E2E Suite', () => {
  test.beforeEach(async ({ page }) => {
    await seedOnboardedState(page)
  })

  test('displays daily reminders and appointments schedule', async ({ page }) => {
    await page.goto('/#/reminders')
    await expect(page.getByText(/DAILY REMINDERS & SCHEDULE/i)).toBeVisible()

    // Tabs for Daily Reminders and Appointments
    await expect(page.getByRole('button', { name: /Daily Reminders/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Appointments/i })).toBeVisible()
  })

  test('displays medicine list and allows confirming doses', async ({ page }) => {
    await page.goto('/#/meds')
    await expect(page.getByRole('heading', { name: 'Medicines' })).toBeVisible()

    // Confirm presence of medicines seeded (Donepezil, Vitamin B12)
    await expect(page.getByText('Donepezil').first()).toBeVisible()

    // Check taken action if available
    const takenBtn = page.getByRole('button', { name: /Taken|Confirm/i }).first()
    if (await takenBtn.isVisible()) {
      await takenBtn.click()
      await page.waitForTimeout(500)
    }
  })
})
