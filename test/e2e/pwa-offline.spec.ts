import { test, expect } from '@playwright/test'
import { seedOnboardedState } from './helpers'

test('fresh install opens an unvisited lazy game route while offline', async ({ page, context }) => {
  await seedOnboardedState(page)
  await expect(page.locator('.tabbar')).toBeVisible()

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
  // The Home route above is visited online; the Memory Garden game chunk is not.
  await context.setOffline(true)
  await page.goto('/#/game/garden?d=0', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText(/Memory Garden|Gentle Breathing|Breathe in gently/i).first()).toBeVisible({ timeout: 15000 })
})
