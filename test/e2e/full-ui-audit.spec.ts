import { test, expect, type Page, type TestInfo } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { seedOnboardedState } from './helpers'

const ARTIFACT_DIR = resolve(process.cwd(), 'artifacts/ui-audit')
mkdirSync(ARTIFACT_DIR, { recursive: true })

type Diagnostics = {
  consoleErrors: string[]
  pageErrors: string[]
  requestFailures: string[]
  httpErrors: string[]
  harnessErrors: string[]
}

function projectSlug(testInfo: TestInfo): string {
  return testInfo.project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

async function capture(page: Page, testInfo: TestInfo, name: string): Promise<string> {
  const path = resolve(ARTIFACT_DIR, `${projectSlug(testInfo)}-${name}.png`)
  // Capture settled UI instead of the first frame of entrance/reward fades.
  // The stars' infinite float animation is a child and is intentionally not
  // selected, so the evidence remains stable without adding an arbitrary delay.
  await page.evaluate(() => {
    document.querySelectorAll<HTMLElement>('.enter-anim, .praise-overlay').forEach((element) => {
      element.getAnimations().forEach((animation) => animation.finish())
    })
  })
  await page.screenshot({ path, fullPage: true })
  return path
}

function collectDiagnostics(page: Page): Diagnostics {
  const diagnostics: Diagnostics = { consoleErrors: [], pageErrors: [], requestFailures: [], httpErrors: [], harnessErrors: [] }
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('ws://localhost:4400/reticle')) diagnostics.consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => {
    const stack = error.stack || error.message
    // WebKit's injected inspector bootstrap runs while a document is being
    // replaced and can outlive documentElement. It is test-host noise, not app JS.
    if (stack.includes('web-inspector://bootstrap.js') || stack.includes('/sw.js due to access control checks')) diagnostics.harnessErrors.push(stack)
    else diagnostics.pageErrors.push(stack)
  })
  page.on('requestfailed', (request) => {
    // AI requests are deliberately blocked/offline in parts of this audit;
    // their failures are tracked separately by the test and are not app errors.
    if (!request.url().includes('/api/ai')) diagnostics.requestFailures.push(`${request.method()} ${request.url()}`)
  })
  page.on('response', (response) => {
    if (response.status() >= 400) {
      diagnostics.httpErrors.push(`${response.status()} ${response.url()}`)
    }
  })
  return diagnostics
}

async function attachDiagnostics(testInfo: TestInfo, diagnostics: Diagnostics, extra: Record<string, unknown> = {}) {
  await testInfo.attach('ui-audit-diagnostics.json', {
    body: Buffer.from(JSON.stringify({ ...diagnostics, ...extra }, null, 2)),
    contentType: 'application/json',
  })
  if (diagnostics.consoleErrors.length || diagnostics.pageErrors.length || diagnostics.requestFailures.length || diagnostics.httpErrors.length || diagnostics.harnessErrors.length) {
    console.log(`UI_AUDIT_DIAGNOSTICS ${JSON.stringify(diagnostics)}`)
  }
  expect(diagnostics.consoleErrors, 'unexpected console errors').toEqual([])
  expect(diagnostics.pageErrors, 'unexpected page errors').toEqual([])
  expect(diagnostics.requestFailures, 'unexpected failed app requests').toEqual([])
  expect(diagnostics.httpErrors, 'unexpected app HTTP errors').toEqual([])
}

async function stubExternalFonts(page: Page) {
  await page.route('**/fonts.googleapis.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/css', body: '' }))
  await page.route('**/fonts.gstatic.com/**', (route) => route.fulfill({ status: 204, body: '' }))
}

async function assertViewportSafety(page: Page, testInfo: TestInfo) {
  const metrics = await page.evaluate(() => {
    const width = document.documentElement.clientWidth
    const height = document.documentElement.clientHeight
    const fixedOverflow = Array.from(document.querySelectorAll<HTMLElement>('*'))
      .filter((element) => {
        const style = getComputedStyle(element)
        return style.position === 'fixed' && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
      })
      .map((element) => ({
        selector: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${element.className && typeof element.className === 'string' ? `.${element.className.split(/\s+/).filter(Boolean).slice(0, 2).join('.')}` : ''}`,
        rect: element.getBoundingClientRect().toJSON(),
      }))
      .filter(({ rect }) => rect.left < -1 || rect.top < -1 || rect.right > width + 1 || rect.bottom > height + 1)
    const undersized = Array.from(document.querySelectorAll<HTMLElement>('button, [role="button"]'))
      .filter((element) => {
        const rect = element.getBoundingClientRect()
        const style = getComputedStyle(element)
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && (rect.width < 48 || rect.height < 48)
      })
      .map((element) => ({
        id: element.id,
        testid: element.getAttribute('data-testid'),
        className: typeof element.className === 'string' ? element.className.split(/\s+/).slice(0, 2).join(' ') : '',
        width: Math.round(element.getBoundingClientRect().width),
        height: Math.round(element.getBoundingClientRect().height),
      }))
      .slice(0, 100)
    return {
      clientWidth: width,
      scrollWidth: document.documentElement.scrollWidth,
      clientHeight: height,
      fixedOverflow,
      undersized,
    }
  })
  await testInfo.attach('viewport-safety.json', {
    body: Buffer.from(JSON.stringify(metrics, null, 2)),
    contentType: 'application/json',
  })
  expect(metrics.scrollWidth, 'horizontal page overflow').toBeLessThanOrEqual(metrics.clientWidth + 1)
  expect(metrics.fixedOverflow, 'fixed controls clipped by viewport').toEqual([])
  return metrics.undersized
}

async function setDailyLimitForAudit(page: Page) {
  await page.evaluate(async () => {
    const request = indexedDB.open('smriti-sathi', 2)
    await new Promise<void>((resolve, reject) => {
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const db = request.result
        const tx = db.transaction('kv', 'readwrite')
        const read = tx.objectStore('kv').get('config')
        read.onsuccess = () => tx.objectStore('kv').put({ ...(read.result || {}), maxSessionsPerDay: 10 }, 'config')
        tx.oncomplete = () => {
          db.close()
          resolve()
        }
        tx.onerror = () => reject(tx.error)
      }
    })
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
}

async function installAiMock(page: Page) {
  const counts = { status: 0, chat: 0 }
  await page.route('**/api/ai/status', async (route) => {
    counts.status++
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ available: true, ready: true }),
    })
  })
  await page.route('**/api/ai/chat', async (route) => {
    counts.chat++
    let payload: { responseFormat?: string; messages?: Array<{ content?: string }> } = {}
    try {
      payload = route.request().postDataJSON() as typeof payload
    } catch {}
    const latest = payload.messages?.at(-1)?.content ?? ''
    const content = payload.responseFormat === 'json_object'
      ? latest.includes('Generate a non-diagnostic')
        ? JSON.stringify({
            headline: 'QA Online Caregiver Summary',
            strengths: ['A calm routine is visible.'],
            observations: ['This is a local QA response.'],
            routineAdherenceNote: 'Keep the familiar routine nearby.',
            suggestedFocus: 'Choose one gentle activity together.',
          })
        : JSON.stringify({ gameId: 'faces', difficulty: 0, domain: 'Family', reason: 'QA mock recommendation' })
      : 'QA_UNIQUE_ONLINE_CHAT_RESPONSE_2026'
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ choices: [{ message: { content } }] }),
    })
  })
  // The chat journey validates the text assistant. Return an explicitly empty
  // successful TTS result so the client exercises its browser-speech fallback;
  // WebKit cannot reliably load synthetic blob audio in headless preview.
  await page.route('**/api/ai/tts', (route) => route.fulfill({ status: 204 }))
  return counts
}

async function completeFaces(page: Page) {
  await page.goto('/#/game/faces?d=0')
  // Faces of Home uses pressed answer buttons without the generic choice-btn
  // class; the Skip action remains the stable user-facing completion control.
  await expect(page.locator('button[aria-pressed]').first()).toBeVisible()
  for (let round = 0; round < 5; round++) await page.getByRole('button', { name: 'Skip' }).click()
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 })
}

async function completeSpotBoard(page: Page) {
  await page.goto('/#/game/spot?d=0')
  await expect(page.locator('.search-scene').nth(1)).toBeVisible()
  const progress = page.getByRole('progressbar').first()
  for (let board = 0; board < 3; board++) {
    const before = Number(await progress.getAttribute('aria-valuenow'))
    const tiles = page.locator('.search-scene').nth(1).locator('button')
    for (let i = 0; i < await tiles.count(); i++) {
      const tile = tiles.nth(i)
      if (await tile.isEnabled()) await tile.click()
    }
    await expect.poll(async () => {
      if (await page.getByRole('dialog').count()) return 99
      return Number(await progress.getAttribute('aria-valuenow'))
    }, { timeout: 5000 }).toBeGreaterThan(before)
    if (await page.getByRole('dialog').count()) break
  }
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 })
}

async function completeSafariGrid(page: Page) {
  await page.goto('/#/game/safari?d=0')
  await expect(page.locator('.search-scene').first()).toBeVisible()
  const progress = page.getByRole('progressbar').first()
  for (let scene = 0; scene < 2; scene++) {
    const before = Number(await progress.getAttribute('aria-valuenow'))
    const tiles = page.locator('.search-scene').first().locator('button')
    for (let i = 0; i < await tiles.count(); i++) {
      const tile = tiles.nth(i)
      if (await tile.isEnabled()) await tile.click()
    }
    await expect.poll(async () => {
      if (await page.getByRole('dialog').count()) return 99
      return Number(await progress.getAttribute('aria-valuenow'))
    }, { timeout: 5000 }).toBeGreaterThan(before)
    if (await page.getByRole('dialog').count()) break
  }
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 })
}

async function completeAudioGame(page: Page) {
  await page.goto('/#/game/melodies?d=0')
  await expect(page.locator('.choice-card-big').first()).toBeVisible()
  const progress = page.getByRole('progressbar').first()
  for (let round = 0; round < 5; round++) {
    const before = Number(await progress.getAttribute('aria-valuenow'))
    await page.locator('.choice-card-big').first().click()
    await expect.poll(async () => {
      if (await page.getByRole('dialog').count()) return 'done'
      if (await page.locator('.choice-card-big.glow').count()) return 'glow'
      const now = Number(await progress.getAttribute('aria-valuenow'))
      return now > before ? 'advanced' : 'waiting'
    }, { timeout: 5000 }).toMatch(/done|glow|advanced/)
    if (await page.locator('.choice-card-big.glow').count()) {
      // The glow animation deliberately pulses; force the already-visible
      // answer activation without waiting for a moving box to be stable.
      await page.locator('.choice-card-big.glow').first().click({ force: true })
      await expect.poll(async () => {
        if (await page.getByRole('dialog').count()) return 99
        return Number(await progress.getAttribute('aria-valuenow'))
      }, { timeout: 5000 }).toBeGreaterThan(before)
    }
    if (await page.getByRole('dialog').count()) break
  }
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 })
}

async function completeFestivalTales(page: Page) {
  await page.goto('/#/game/tales?d=0')
  await expect(page.getByRole('button', { name: /Continue|Tell us how you feel/i }).first()).toBeVisible()
  while (await page.getByRole('button', { name: /^Continue/i }).count()) {
    await page.getByRole('button', { name: /^Continue/i }).click()
  }
  // The visible label is shortened for the patient UI, while the accessible
  // name is the more descriptive action label.
  await page.getByRole('button', { name: /Share how the story makes you feel|Tell us how you feel/i }).click()
  const progress = page.getByRole('progressbar').first()
  for (let prompt = 0; prompt < 5; prompt++) {
    if (await page.getByRole('dialog').count()) break
    const before = Number(await progress.getAttribute('aria-valuenow'))
    await page.locator('.choice-btn').first().click()
    await expect.poll(async () => {
      if (await page.getByRole('dialog').count()) return 99
      return Number(await progress.getAttribute('aria-valuenow'))
    }, { timeout: 5000 }).toBeGreaterThan(before)
  }
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 })
}

async function unlockCaregiver(page: Page, offline = false) {
  if (offline) await page.evaluate(() => { window.location.hash = '/hub' })
  else await page.goto('/#/hub')
  await expect(page.getByRole('heading', { name: /Enter caregiver PIN/i })).toBeVisible()
  for (const digit of ['1', '2', '3', '4']) await page.getByRole('button', { name: digit, exact: true }).click()
  await expect(page.getByRole('tab', { name: /Weekly Digest/i })).toBeVisible({ timeout: 10000 })
}

async function assertPrimaryRoutesAndCaregiverTabs(page: Page) {
  await page.goto('/#/reminders')
  await expect(page.getByRole('heading', { name: /Reminders/i })).toBeVisible()
  await page.getByRole('tab', { name: /Appointments/i }).click()
  await expect(page.getByRole('tabpanel', { name: /Appointments/i })).toBeVisible()
  await page.getByRole('tab', { name: /Daily Reminders/i }).click()
  const reminderToggle = page.locator('.reminder-card button').first()
  if (await reminderToggle.count()) await reminderToggle.click()

  await page.goto('/#/meds')
  await expect(page.getByRole('heading', { name: 'Medicines' })).toBeVisible()
  const dose = page.getByRole('button', { name: /Donepezil.*Taken/i }).first()
  if (await dose.count()) await dose.click()

  await unlockCaregiver(page)
  const tabs = ['Weekly Digest', 'Family & Faces', 'Medicines', 'Reminders', 'Settings']
  for (const label of tabs) {
    await page.getByRole('tab', { name: new RegExp(label, 'i') }).click()
    await expect(page.locator('main.caregiver-hub-panel[role="tabpanel"]')).toBeVisible()
  }
  await page.getByRole('tab', { name: /Weekly Digest/i }).click()
}

test.describe('full UI audit journey', () => {
  test.setTimeout(120_000)

  test('traverses patient, caregiver, games, offline boundary, and online chat', async ({ page, context }, testInfo) => {
    const diagnostics = collectDiagnostics(page)
    await stubExternalFonts(page)
    const ai = await installAiMock(page)
    await seedOnboardedState(page)
    await setDailyLimitForAudit(page)
    await expect(page.locator('.home-page')).toBeVisible()
    await expect(page.getByTestId('daily-plan-card')).toBeVisible()
    const showMore = page.getByRole('button', { name: /Show more/i })
    if (await showMore.count()) {
      await showMore.click()
      await expect(page.getByRole('button', { name: /Show less/i })).toHaveAttribute('aria-expanded', 'true')
    }
    await page.getByRole('button', { name: 'Memory', exact: true }).click()
    await assertViewportSafety(page, testInfo)

    await assertPrimaryRoutesAndCaregiverTabs(page)
    await assertViewportSafety(page, testInfo)
    await capture(page, testInfo, 'caregiver-hub')

    await completeSpotBoard(page)
    await capture(page, testInfo, 'game')
    await completeSafariGrid(page)
    await completeAudioGame(page)
    await completeFestivalTales(page)
    await completeFaces(page)
    await expect(page.getByRole('heading', { name: /A lovely session|A gentle next step|Keep this for later|Time for a little rest/i })).toBeVisible()
    await capture(page, testInfo, 'post-game-recap')
    await expect(page.getByRole('dialog')).toHaveCount(1)
    await page.getByRole('button', { name: 'Home' }).click()
    await expect(page.locator('.home-page')).toBeVisible()

    // The app is fully warmed above, so the offline check covers both the
    // patient shell and the caregiver route without downloading new chunks.
    const requestsBeforeOffline = ai.chat
    await context.setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    await expect(page.getByTestId('ai-chat-btn')).toHaveCount(0)
    await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(false)
    expect(ai.chat).toBe(requestsBeforeOffline)
    await capture(page, testInfo, 'offline-home')

    await unlockCaregiver(page, true)
    await expect(page.getByText(/Cloud AI via secure server/i)).toHaveCount(0)
    await expect(page.getByText(/QA Online Caregiver Summary/i)).toHaveCount(0)
    expect(ai.chat).toBe(requestsBeforeOffline)
    await assertViewportSafety(page, testInfo)

    await attachDiagnostics(testInfo, diagnostics, {
      aiRequestsBeforeOffline: requestsBeforeOffline,
      aiRequestsAfterOffline: ai.chat,
    })
  })

  test('shows a healthy online assistant with a unique mocked response', async ({ page }, testInfo) => {
    const diagnostics = collectDiagnostics(page)
    await stubExternalFonts(page)
    const ai = await installAiMock(page)
    await seedOnboardedState(page)
    await expect(page.getByTestId('ai-chat-btn')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('ai-chat-btn').click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText(/Hello Sarala Devi/i)).toBeVisible()
    const chatInput = page.locator('input[placeholder*="Type or speak"]')
    await expect(chatInput).toBeVisible()
    await chatInput.fill('Tell me one gentle plan for today')
    await expect(chatInput).toBeFocused()
    await dialog.getByTestId('send-chat-btn').click()
    await expect(dialog.getByText('QA_UNIQUE_ONLINE_CHAT_RESPONSE_2026')).toBeVisible({ timeout: 10000 })
    await expect(dialog.getByText(/Your medication schedule is saved|I am right here/i)).toHaveCount(0)
    await capture(page, testInfo, 'online-chat')
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(page.getByTestId('ai-chat-btn')).toBeFocused()
    expect(ai.status).toBeGreaterThan(0)
    expect(ai.chat).toBeGreaterThan(0)
    await assertViewportSafety(page, testInfo)
    await attachDiagnostics(testInfo, diagnostics, { aiStatusRequests: ai.status, aiChatRequests: ai.chat })
  })
})

test.describe('full UI audit reflow checks', () => {
  test.describe('320x568 portrait', () => {
    test.use({ viewport: { width: 320, height: 568 } })

    test('keeps patient shell, reminders, dialog, and game controls inside the viewport', async ({ page }, testInfo) => {
      const diagnostics = collectDiagnostics(page)
      await stubExternalFonts(page)
      await installAiMock(page)
      await seedOnboardedState(page)
      await page.goto('/')
      await expect(page.locator('.home-page')).toBeVisible()
      await assertViewportSafety(page, testInfo)
      await page.goto('/#/reminders')
      await expect(page.getByRole('heading', { name: /Reminders/i })).toBeVisible()
      await assertViewportSafety(page, testInfo)
      await page.goto('/#/game/tales?d=0')
      await expect(page.locator('.story-panel')).toBeVisible()
      const title = page.getByRole('heading', { name: 'Festival Tales & Folklore', exact: true })
      await expect(title).toBeVisible()
      await expect(title).toHaveText('Festival Tales & Folklore')
      const titleGeometry = await page.evaluate(() => {
        const heading = document.querySelector('.instruction-bar h2')
        const back = document.querySelector('.instruction-bar button[aria-label="Back"]')
        const listen = document.querySelector('.instruction-bar button[aria-label="Listen"]')
        if (!(heading instanceof HTMLElement) || !(back instanceof HTMLElement) || !(listen instanceof HTMLElement)) return null
        const headingRect = heading.getBoundingClientRect()
        const backRect = back.getBoundingClientRect()
        const listenRect = listen.getBoundingClientRect()
        const overlaps = (a: DOMRect, b: DOMRect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
        const style = getComputedStyle(heading)
        return {
          heading: { left: headingRect.left, right: headingRect.right, top: headingRect.top, bottom: headingRect.bottom, height: headingRect.height },
          back: { left: backRect.left, right: backRect.right, top: backRect.top, bottom: backRect.bottom, width: backRect.width, height: backRect.height },
          listen: { left: listenRect.left, right: listenRect.right, top: listenRect.top, bottom: listenRect.bottom, width: listenRect.width, height: listenRect.height },
          headingStyle: { whiteSpace: style.whiteSpace, textOverflow: style.textOverflow, overflowWrap: style.overflowWrap },
          overlapsBack: overlaps(headingRect, backRect),
          overlapsListen: overlaps(headingRect, listenRect),
        }
      })
      expect(titleGeometry).not.toBeNull()
      expect(titleGeometry?.headingStyle.whiteSpace).toBe('normal')
      expect(titleGeometry?.headingStyle.textOverflow).not.toBe('ellipsis')
      expect(titleGeometry?.overlapsBack).toBe(false)
      expect(titleGeometry?.overlapsListen).toBe(false)
      expect(titleGeometry?.back.width).toBeGreaterThanOrEqual(48)
      expect(titleGeometry?.back.height).toBeGreaterThanOrEqual(48)
      expect(titleGeometry?.listen.width).toBeGreaterThanOrEqual(48)
      expect(titleGeometry?.listen.height).toBeGreaterThanOrEqual(48)
      await assertViewportSafety(page, testInfo)
      await capture(page, testInfo, 'portrait-320')
      await attachDiagnostics(testInfo, diagnostics)
    })
  })

  test.describe('844x390 short landscape', () => {
    test.use({ viewport: { width: 844, height: 390 } })

    test('reflows fixed navigation and game content without clipping', async ({ page }, testInfo) => {
      const diagnostics = collectDiagnostics(page)
      await stubExternalFonts(page)
      await installAiMock(page)
      await seedOnboardedState(page)
      await page.goto('/')
      await expect(page.locator('.home-page')).toBeVisible()
      await assertViewportSafety(page, testInfo)
      await page.goto('/#/game/spot?d=0')
      await expect(page.locator('.instruction-bar')).toBeVisible()
      await assertViewportSafety(page, testInfo)
      await capture(page, testInfo, 'landscape-844')
      await attachDiagnostics(testInfo, diagnostics)
    })
  })

  test('captures the iPad layout evidence', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'Tablet Safari (iPad Pro 11)', 'The base journey captures this only on the tablet project.')
    const diagnostics = collectDiagnostics(page)
    await stubExternalFonts(page)
    await installAiMock(page)
    await seedOnboardedState(page)
    await page.goto('/')
    await expect(page.locator('.home-page')).toBeVisible()
    await assertViewportSafety(page, testInfo)
    await capture(page, testInfo, 'tablet-layout')
    await attachDiagnostics(testInfo, diagnostics)
  })

  test('keeps daily-plan names visible at 200% text scale', async ({ page }, testInfo) => {
    const diagnostics = collectDiagnostics(page)
    await stubExternalFonts(page)
    await installAiMock(page)
    await seedOnboardedState(page)
    await page.goto('/')
    await expect(page.getByTestId('daily-plan-card')).toBeVisible()
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%' })
    await expect(page.getByText('Donepezil')).toBeVisible()
    const titleStyles = await page.getByText('Donepezil').evaluate((element) => {
      const style = getComputedStyle(element)
      return { whiteSpace: style.whiteSpace, overflowWrap: style.overflowWrap, wordBreak: style.wordBreak }
    })
    expect(titleStyles.whiteSpace).toBe('normal')
    expect(['anywhere', 'break-word']).toContain(titleStyles.overflowWrap)
    expect(['break-word', 'normal']).toContain(titleStyles.wordBreak)
    await assertViewportSafety(page, testInfo)
    await capture(page, testInfo, 'text-zoom-200')
    await attachDiagnostics(testInfo, diagnostics)
  })
})
