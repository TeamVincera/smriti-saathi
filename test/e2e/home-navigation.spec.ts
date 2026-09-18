import { test, expect } from '@playwright/test'
import { seedOnboardedState } from './helpers'

test.describe('Home Dashboard & Navigation E2E Suite', () => {
  test.beforeEach(async ({ page }) => {
    await seedOnboardedState(page)
  })

  test('renders home screen with greeting, daily recommended game, and game grid', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Today's (Recommended )?Game/i })).toBeVisible()
    await expect(page.getByTestId('start-game-btn')).toBeVisible()
    const plan = page.getByTestId('daily-plan-card')
    await expect(plan).toBeVisible()
    await expect(page.getByRole('heading', { name: /Today's gentle plan/i })).toBeVisible()
    await expect(plan).toContainText('Donepezil')

    // Navigation bar tabs
    await expect(page.getByTestId('nav-home')).toBeVisible()
    await expect(page.getByTestId('nav-reminders')).toBeVisible()
    await expect(page.getByTestId('nav-meds')).toBeVisible()
    await expect(page.getByTestId('nav-hub')).toBeVisible()

    // More games section
    await expect(page.getByRole('heading', { name: /Explore All Cognitive Games/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Faces of Home/i }).first()).toBeVisible()
  })

  test('navigates across primary tabs (Home -> Reminders -> Meds -> Caregiver Hub)', async ({ page }) => {
    // Navigate to Reminders
    await page.getByTestId('nav-reminders').click()
    await expect(page.getByRole('heading', { name: /Reminders/i })).toBeVisible()
    expect(page.url()).toContain('#/reminders')

    // Navigate to Meds
    await page.getByTestId('nav-meds').click()
    await expect(page.getByRole('heading', { name: 'Medicines' })).toBeVisible()
    expect(page.url()).toContain('#/meds')

    // Navigate to Caregiver Hub (PIN gated)
    await page.getByTestId('nav-hub').click()
    await expect(page.getByRole('heading', { name: /Enter caregiver PIN/i })).toBeVisible()
    expect(page.url()).toContain('#/hub')

    // Navigate back to Home
    await page.getByTestId('nav-home').click()
    await expect(page.getByRole('heading', { name: /Today's (Recommended )?Game/i })).toBeVisible()
    expect(page.url()).toContain('#/')
  })
})
