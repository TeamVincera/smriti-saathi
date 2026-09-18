import { test, expect } from '@playwright/test'

test.use({
  viewport: { width: 320, height: 568 },
  isMobile: true,
  hasTouch: true,
})

test.describe('Onboarding PIN narrow-screen layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?step=7')
    await page.evaluate(async () => {
      localStorage.clear()
      sessionStorage.clear()
      try {
        const request = indexedDB.deleteDatabase('smriti-sathi')
        await new Promise<void>((resolve) => {
          request.onsuccess = () => resolve()
          request.onerror = () => resolve()
          request.onblocked = () => resolve()
        })
      } catch {}
    })
    await page.reload({ waitUntil: 'domcontentloaded' })
  })

  test('keeps the confirm PIN panel aligned and the set panel off-screen', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Create a 4-digit caregiver PIN/i })).toBeVisible()

    await page.getByPlaceholder('••••').nth(0).fill('1234')
    await page.getByRole('button', { name: /Confirm PIN/i }).click()

    await expect(page.getByTestId('pin-panel-track')).toHaveAttribute('style', /translateX\(-50%\)/)
    await page.waitForTimeout(400)
    const geometry = await page.evaluate(() => {
      const viewport = document.querySelector('[data-testid="pin-panel-track"]')?.parentElement?.getBoundingClientRect()
      const setPanel = document.querySelector('[data-testid="pin-panel-set"]')?.getBoundingClientRect()
      const confirmPanel = document.querySelector('[data-testid="pin-panel-confirm"]')?.getBoundingClientRect()
      return {
        viewportLeft: viewport?.left ?? 0,
        setRight: setPanel?.right ?? 0,
        confirmLeft: confirmPanel?.left ?? 0,
        confirmWidth: confirmPanel?.width ?? 0,
      }
    })

    expect(geometry.setRight).toBeLessThanOrEqual(geometry.viewportLeft + 1)
    expect(geometry.confirmLeft).toBeGreaterThanOrEqual(geometry.viewportLeft - 1)
    expect(geometry.confirmWidth).toBeGreaterThan(240)
  })
})
