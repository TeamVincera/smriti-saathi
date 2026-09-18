import { test, expect } from '@playwright/test'

test.describe('Enhanced Onboarding & Cultural AI Features Suite', () => {
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

  test('verifies DOB calculation, name sanitization, education brackets, custom festivals, and phone digit limits', async ({ page }) => {
    // Step 0: Language selection
    // Select English
    await page.getByRole('button', { name: /English/i }).click()
    await page.getByTestId('lang-next-btn').click()

    // Step 1: Patient info & name validation (No underscores / special chars)
    await expect(page.getByRole('heading', { name: 'About the patient' })).toBeVisible()
    const nameInput = page.getByTestId('patient-name-input')
    await nameInput.fill('Sarala_Borah@123!')
    // Should be sanitized to SaralaBorah
    await expect(nameInput).toHaveValue('SaralaBorah')

    // Test DOB input & calculated age
    const dobInput = page.getByTestId('patient-dob-input')
    await dobInput.fill('1954-06-15')
    const ageInput = page.getByTestId('patient-age-input')
    const ageVal = await ageInput.inputValue()
    expect(parseInt(ageVal, 10)).toBeGreaterThanOrEqual(68)

    // Verify education options have class descriptions in brackets
    const eduSelect = page.locator('select').filter({ hasText: /Education Level/i })
    const eduOptions = await eduSelect.textContent()
    expect(eduOptions).toContain('Primary school (Class 1–5)')
    expect(eduOptions).toContain('Secondary school (Class 10th / Matric)')
    expect(eduOptions).toContain('Higher secondary (Class 12th / HS)')
    await eduSelect.selectOption({ label: 'Secondary school (Class 10th / Matric)' })

    // Step 2: Next -> Clinical
    await page.getByTestId('step-next-btn').click()
    await expect(page.getByRole('heading', { name: 'Clinical context' })).toBeVisible()
    await page.getByTestId('step-next-btn').click()

    // Step 3: Home & regional culture -> Custom festival & Custom hobby
    await expect(page.getByRole('heading', { name: /Home & regional culture/i })).toBeVisible()
    const customFestInput = page.getByPlaceholder(/Any other festival/i)
    await customFestInput.fill('Ali-Aye-Ligang')
    await page.getByRole('button', { name: '+ Add' }).first().click()
    // Verify custom festival tile appears selected
    await expect(page.getByRole('button', { name: /Ali-Aye-Ligang/i })).toBeVisible()

    const customHobbyInput = page.getByPlaceholder(/Any other hobby/i)
    await customHobbyInput.fill('Bamboo Crafting')
    await page.getByRole('button', { name: '+ Add' }).nth(1).click()
    await expect(page.getByRole('button', { name: /Bamboo Crafting/i })).toBeVisible()

    await page.getByTestId('step-next-btn').click()

    // Step 4: Faces of Home (without photos)
    await expect(page.getByRole('heading', { name: /Faces of Home/i })).toBeVisible()
    const memberNameInput = page.getByPlaceholder(/e\.g\. Sarala, Rahul, Runima/i).first()
    await memberNameInput.fill('Deben_Son@456')
    await expect(memberNameInput).toHaveValue('DebenSon')
    await page.getByTestId('step-next-btn').click()

    // Step 5: Routine
    await expect(page.getByRole('heading', { name: 'Daily routine' })).toBeVisible()
    await page.getByTestId('step-next-btn').click()

    // Step 6: Caregiver details (Name sanitization, Country code, Digits customization)
    await expect(page.getByRole('heading', { name: 'Caregiver details' })).toBeVisible()
    const caregiverNameInput = page.getByPlaceholder('Caregiver Name')
    await caregiverNameInput.fill('Rahul_Caregiver#99')
    await expect(caregiverNameInput).toHaveValue('RahulCaregiver')

    // Test caregiver phone digit limits (exactly 10 digits)
    const caregiverPhoneInput = page.getByTestId('caregiver-phone-input')
    await caregiverPhoneInput.fill('987654321099999')
    await expect(caregiverPhoneInput).toHaveValue('9876543210')

    // Test ASHA worker name sanitization and 10 digits
    const ashaNameInput = page.getByTestId('asha-name-input')
    await ashaNameInput.fill('Asha_Didi!123')
    await expect(ashaNameInput).toHaveValue('AshaDidi')

    const ashaPhoneInput = page.getByTestId('asha-phone-input')
    await ashaPhoneInput.fill('9876543211999')
    await expect(ashaPhoneInput).toHaveValue('9876543211')

    await page.getByTestId('step-next-btn').click()

    // Step 7: PIN
    await expect(page.getByRole('heading', { name: /Create a 4-digit caregiver PIN/i })).toBeVisible()
    const pins = page.getByPlaceholder('••••')
    await pins.nth(0).fill('1234')
    await pins.nth(1).fill('1234')
    await page.getByTestId('step-next-btn').click()

    // Step 8: Baseline assessment (Since NO family photos were uploaded, faces question must be omitted)
    const introBar = page.locator('.instruction-bar')
    await expect(introBar).toBeVisible()
    // It should immediately start with Melodies or Sequence, NEVER "Look at the face"
    const introText = await introBar.textContent()
    expect(introText).not.toContain('Look at the face and choose the right name')

    // Finish baseline assessment
    for (let i = 0; i < 12; i++) {
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

    // Verify user is successfully onboarded and on Dashboard
    await expect(page.locator('.tabbar')).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('start-game-btn')).toBeVisible({ timeout: 15000 })
  })
})
