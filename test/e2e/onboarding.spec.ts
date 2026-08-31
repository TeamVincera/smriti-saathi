import { test, expect } from '@playwright/test'

test.describe('Onboarding & Baseline Cognitive Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const style = document.createElement('style')
      style.id = 'e2e-disable-overlay'
      style.innerHTML = '[data-reticle-overlay], .reticle-tb-wrap, [data-reticle-min] { pointer-events: none !important; opacity: 0 !important; visibility: hidden !important; }'
      document.documentElement.appendChild(style)
    })
    await page.goto('/')
    await page.evaluate(async () => {
      localStorage.clear()
      sessionStorage.clear()
      try {
        const req = indexedDB.deleteDatabase('smriti-sathi')
        await new Promise<void>((resolve) => {
          req.onsuccess = () => resolve()
          req.onerror = () => resolve()
          req.onblocked = () => resolve()
        })
      } catch {}
    })
    await page.reload({ waitUntil: 'domcontentloaded' })
  })

  test('completes full onboarding journey from language selection to baseline test', async ({ page }) => {
    // Step 0: Language selection
    await expect(page.getByRole('heading', { name: /Choose your language/i })).toBeVisible({ timeout: 15000 })

    // Select English
    const englishBtn = page.getByRole('button', { name: /English/i })
    await expect(englishBtn).toBeVisible()
    await englishBtn.click()

    const langNextBtn = page.getByTestId('lang-next-btn')
    await expect(langNextBtn).toBeEnabled()
    await langNextBtn.click()

    // Step 1: Patient info
    await expect(page.getByRole('heading', { name: 'About the patient' })).toBeVisible()
    const nameInput = page.getByTestId('patient-name-input')
    await nameInput.fill('Sarala Borah')

    const ageInput = page.getByTestId('patient-age-input')
    await ageInput.fill('74')

    // Pick avatar
    await page.getByRole('button', { name: '👵' }).click()

    // Next step
    await page.getByTestId('step-next-btn').click()

    // Step 2: Clinical context
    await expect(page.getByRole('heading', { name: 'Clinical context' })).toBeVisible()
    await page.getByRole('button', { name: /Mild/i }).first().click()
    await page.getByTestId('step-next-btn').click()

    // Step 3: Home & culture
    await expect(page.getByRole('heading', { name: /Home & culture/i })).toBeVisible()
    const bihuBtn = page.getByRole('button', { name: /Bihu/i })
    if (await bihuBtn.isVisible()) {
      await bihuBtn.click()
    }
    await page.getByTestId('step-next-btn').click()

    // Step 4: Faces of home (Family members)
    await expect(page.getByRole('heading', { name: /Faces of Home/i })).toBeVisible()
    const familyInputs = page.getByPlaceholder(/e\.g\. Sarala, Rahul, Runima/i)
    if ((await familyInputs.count()) > 0) {
      await familyInputs.first().fill('Runima')
    }
    await page.getByTestId('step-next-btn').click()

    // Step 5: Daily routine
    await expect(page.getByRole('heading', { name: 'Daily routine' })).toBeVisible()
    await page.getByTestId('step-next-btn').click()

    // Step 6: Caregiver details
    await expect(page.getByRole('heading', { name: 'Caregiver details' })).toBeVisible()
    await page.getByPlaceholder('Caregiver Name').fill('Rahul')
    await page.getByTestId('caregiver-phone-input').fill('9876543210')
    await page.getByTestId('step-next-btn').click()

    // Step 7: PIN setup
    await expect(page.getByRole('heading', { name: /Create a 4-digit caregiver PIN/i })).toBeVisible()
    const pinInputs = page.getByPlaceholder('••••')
    await pinInputs.nth(0).fill('1234')
    await pinInputs.nth(1).fill('1234')
    await page.getByTestId('step-next-btn').click()

    // Step 8: Baseline assessment
    await expect(page.getByText(/Question|Round|Look at the face|Listen/i).first()).toBeVisible()

    // Play/answer the baseline rounds until Done button appears
    for (let i = 0; i < 15; i++) {
      const doneBtn = page.getByRole('button', { name: /Done/i })
      if (await doneBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await doneBtn.click()
        break
      }
      const choiceOrTile = page.locator('.choice-btn, .item-tile').first()
      if (await choiceOrTile.isVisible({ timeout: 1500 }).catch(() => false)) {
        await choiceOrTile.click({ timeout: 2000 }).catch(() => {})
        await page.waitForTimeout(450)
      } else {
        await expect(doneBtn).toBeVisible({ timeout: 5000 })
        await doneBtn.click()
        break
      }
    }

    // Verify user lands on home dashboard
    await expect(page.locator('.tabbar')).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('start-game-btn')).toBeVisible({ timeout: 15000 })
  })
})
