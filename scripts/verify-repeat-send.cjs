/**
 * verify-repeat-send.cjs
 *
 * Mirrors the user's screenshot scenario: they tap the mic, say "test", it is
 * sent and answered; then they tap again and say "test" a second time. That
 * second legitimate repeat used to be swallowed by an over-aggressive
 * duplicate guard ("That was already sent just now."). Both must now send.
 *
 * Groq transcription is mocked to return "Test" (deterministic), the AI
 * completions call is real. The second utterance typically arrives while
 * Sathi is still answering the first → exercises the queue path too.
 */

const { chromium } = require('@playwright/test')

const seed = async (page) => {
  await page.addInitScript(() => {
    try {
      const style = document.createElement('style')
      style.innerHTML = '[data-reticle-overlay], .reticle-tb-wrap, [data-reticle-min] { display: none !important; }'
      if (document.documentElement) document.documentElement.appendChild(style)
    } catch {}
    try { delete window.SpeechRecognition; delete window.webkitSpeechRecognition } catch {}
  })
  await page.goto('/#/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(async () => {
    const profile = {
      language: 'en',
      patient: { name: 'Sarala Devi', age: 72, avatar: '👵', languagesSpoken: ['en'], education: 'Secondary school' },
      clinical: { stage: 'mild', diagnosisDate: '2024-01-15' },
      cultural: {
        state: 'Assam', community: 'Ahom', festivals: ['Bihu'], occupation: 'Weaver', hobbies: ['Gardening'],
        familyMembers: [{ name: 'Rahul', relation: 'Son', emoji: '👨' }],
      },
      routine: { wake: '06:00', breakfast: '08:00', lunch: '13:00', dinner: '20:00', sleep: '21:30' },
      caregiver: { name: 'Rahul', phone: '9876543210', relationship: 'Son' },
      pin: '1234', onboarded: true, createdAt: Date.now(),
    }
    const req = indexedDB.open('smriti-sathi', 2)
    await new Promise((resolve, reject) => {
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv')
        if (!db.objectStoreNames.contains('events')) db.createObjectStore('events', { autoIncrement: true })
        if (!db.objectStoreNames.contains('sessions')) db.createObjectStore('sessions', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('meds')) db.createObjectStore('meds', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('medlog')) db.createObjectStore('medlog', { autoIncrement: true })
        if (!db.objectStoreNames.contains('daily_reminders')) db.createObjectStore('daily_reminders', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('appointments')) db.createObjectStore('appointments', { keyPath: 'id' })
      }
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('kv', 'readwrite')
        tx.objectStore('kv').put(profile, 'profile')
        tx.oncomplete = () => { db.close(); resolve() }
        tx.onerror = () => { db.close(); reject(tx.error) }
      }
      req.onerror = () => reject(req.error)
    })
  }, {})
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(600)
}

// Count ONLY leaf bubbles whose entire text is "Test" (a sent user message).
// Outer wrappers also read "Test" but contain nested divs, so require none.
const countTestTokens = (page) =>
  page.evaluate(() => {
    const dlg = document.querySelector('[aria-label="Sathi AI Companion"]')
    if (!dlg) return 0
    return Array.from(dlg.querySelectorAll('div')).filter((d) => {
      if (!d.textContent || d.textContent.trim() !== 'Test') return false
      if (d.querySelectorAll('div').length > 0) return false
      return true
    }).length
  })

async function oneSession(page) {
  const mic = 'button[title="Speak to Sathi"]'
  await page.click(mic)
  try {
    await page.waitForSelector('text=Listening…', { timeout: 8000 })
  } catch {}
  await page.waitForTimeout(1500) // “speaking”
  await page.click(mic) // stop & transcribe
}

;(async () => {
  const browser = await chromium.launch({
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--use-file-for-fake-audio-capture=/tmp/ss-speech-en.wav',
      '--autoplay-policy=no-user-gesture-required',
    ],
  })
  const ctx = await browser.newContext({
    baseURL: 'http://localhost:5173',
    permissions: ['microphone'],
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  })
  const page = await ctx.newPage()
  await page.route('**/api/ai/transcribe', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ text: 'Test' }) })
  )
  await seed(page)

  await page.click('[data-testid="ai-chat-btn"]')
  await page.waitForSelector('[aria-label="Sathi AI Companion"]', { timeout: 10000 })

  // ── First utterance ──
  await oneSession(page)
  const t0 = Date.now()
  while ((await countTestTokens(page)) < 1 && Date.now() - t0 < 25000) await page.waitForTimeout(300)
  console.log(`[repeat] after #1: testTokens=${await countTestTokens(page)}`)

  // ── Second utterance — SAME word, ~1.5s later (user's screenshot scenario) ──
  await page.waitForTimeout(1500)
  await oneSession(page)
  const t1 = Date.now()
  while ((await countTestTokens(page)) < 2 && Date.now() - t1 < 30000) await page.waitForTimeout(300)

  const bubbles = await countTestTokens(page)
  const notice = await page.evaluate(() => {
    const dlg = document.querySelector('[aria-label="Sathi AI Companion"]')
    return dlg ? dlg.textContent : ''
  })
  const blockedNotice = notice.includes('already sent') || notice.includes('पहले ही भेजा')
  const inputVal = await page.evaluate(() => {
    const inp = document.querySelector('[aria-label="Sathi AI Companion"] input, [aria-label="Sathi AI Companion"] textarea')
    return inp ? inp.value : ''
  })
  console.log(`[repeat] after #2: bubbles=${bubbles} blockedNotice=${blockedNotice} input=${JSON.stringify(inputVal)}`)
  const chatTail = await page.evaluate(() => {
    const dlg = document.querySelector('[aria-label="Sathi AI Companion"]')
    return dlg ? dlg.textContent.replace(/\s+/g, ' ').trim().slice(-240) : ''
  })
  console.log(`[repeat] chatTail=${JSON.stringify(chatTail)}`)

  const ok = bubbles === 2 && !blockedNotice && inputVal.length === 0
  console.log(`[repeat] PASS=${ok}  (two same-word mic taps → both sent, no \"already sent\" block)`)
  await browser.close()
  process.exit(ok ? 0 : 1)
})().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
