import { test, expect } from '@playwright/test'
import { seedOnboardedState } from './helpers'

test.describe('Caregiver Hub Security & Analytics E2E Suite', () => {
  test.beforeEach(async ({ page }) => {
    await seedOnboardedState(page)
  })

  test('unlocks caregiver hub with PIN keypad and shows health watch analytics', async ({ page }) => {
    await page.goto('/#/hub')
    await expect(page.getByRole('heading', { name: /Enter caregiver PIN/i })).toBeVisible()

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
    await expect(page.getByRole('button', { name: /Logout|Overview/i }).first()).toBeVisible()
  })
})
