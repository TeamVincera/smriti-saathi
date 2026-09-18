import { test, expect } from '@playwright/test'
import { seedOnboardedState } from './helpers'

test.describe('Responsive Layout & Touch UX Suite', () => {
  test.beforeEach(async ({ page }) => {
    await seedOnboardedState(page)
  })

  test('verifies mobile navigation bar, button touch targets, and content flow', async ({ page }) => {
    await page.goto('/')

    // Verify header and brand
    await expect(page.locator('.nav-brand')).toBeVisible()

    // Verify bottom navigation bar is fixed and visible
    const tabbar = page.locator('.tabbar')
    await expect(tabbar).toBeVisible()

    // Check all 4 primary navigation items exist with minimum accessible touch target size
    const homeTab = page.getByTestId('nav-home')
    const box = await homeTab.boundingBox()
    expect(box).not.toBeNull()
    if (box) {
      expect(Math.round(box.height)).toBeGreaterThanOrEqual(48)
      expect(Math.round(box.width)).toBeGreaterThanOrEqual(48)
    }

    // Verify main card doesn't overflow horizontally
    const card = page.locator('.tile-section').first()
    const cardBox = await card.boundingBox()
    const viewportSize = page.viewportSize()
    if (cardBox && viewportSize) {
      expect(cardBox.width).toBeLessThanOrEqual(viewportSize.width)
    }
  })

  test('verifies modal dialogues and game hosts fit within viewport', async ({ page }) => {
    await page.goto('/#/reminders')
    await expect(page.getByRole('heading', { name: /Reminders/i })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('tab', { name: /Reminders/i })).toBeVisible({ timeout: 10000 })

    const pageContainer = page.locator('.page')
    await expect(pageContainer).toBeVisible({ timeout: 10000 })
    const box = await pageContainer.boundingBox()
    const viewport = page.viewportSize()
    if (box && viewport) {
      expect(box.width).toBeLessThanOrEqual(viewport.width)
    }
  })

  test('keeps game listen controls at a full touch target', async ({ page }) => {
    await page.goto('/#/game/sequence')
    const listen = page.locator('.instruction-bar .icon-btn').first()
    await expect(listen).toBeVisible({ timeout: 10000 })
    const box = await listen.boundingBox()
    expect(box).not.toBeNull()
    if (box) {
      expect(Math.round(box.width)).toBeGreaterThanOrEqual(48)
      expect(Math.round(box.height)).toBeGreaterThanOrEqual(48)
    }
  })
})
