import { test, expect } from '@playwright/test'
import { seedOnboardedState } from './helpers'

test.describe('Cognitive Game Engines E2E Suite', () => {
  test.beforeEach(async ({ page }) => {
    await seedOnboardedState(page)
  })

  test('plays Faces of Home game through spaced retrieval rounds', async ({ page }) => {
    await page.goto('/#/game/faces?d=0')
    await expect(page.getByText(/Faces of Home|Question|Round|Look at the face/i).first()).toBeVisible()

    // Answer questions
    for (let i = 0; i < 4; i++) {
      const choiceBtn = page.locator('.choice-btn').first()
      if (await choiceBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await choiceBtn.click()
        await page.waitForTimeout(600)
      } else {
        break
      }
    }

    // Check completion or return home button
    const homeBtn = page.getByRole('button', { name: /Done|Finish|Home/i }).first()
    if (await homeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await homeBtn.click()
    }
  })

  test('plays Morning Melodies instrument recognition game', async ({ page }) => {
    await page.goto('/#/game/melodies?d=0')
    await expect(page.getByText(/Morning Melodies|Listen/i).first()).toBeVisible()

    // Click listen button
    const listenBtn = page.getByRole('button', { name: /Listen/i }).first()
    if (await listenBtn.isVisible()) {
      await listenBtn.click()
    }

    // Select instrument choice
    const choice = page.locator('.choice-btn').first()
    if (await choice.isVisible({ timeout: 2000 }).catch(() => false)) {
      await choice.click()
    }
  })

  test('plays Daily Life Sequence game ordering steps', async ({ page }) => {
    await page.goto('/#/game/sequence?d=0')
    await expect(page.getByText(/Daily Life Sequence|Tap the steps/i).first()).toBeVisible()

    // Click sequence tiles
    const tiles = page.locator('.item-tile')
    const count = await tiles.count()
    for (let i = 0; i < count; i++) {
      const firstAvailable = page.locator('.item-tile').first()
      if (await firstAvailable.isVisible({ timeout: 1500 }).catch(() => false)) {
        await firstAvailable.click({ force: true }).catch(() => {})
        await page.waitForTimeout(200)
      }
    }
  })
})
