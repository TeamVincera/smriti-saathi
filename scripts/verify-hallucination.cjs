/**
 * verify-hallucination.cjs
 *
 * Replicates the EXACT screenshot scenario: the mic captures "test" plus ~10s
 * of trailing silence, and Groq Whisper hallucinates "Test Test Test Test…"
 * repeated dozens of times. The chat used to be flooded with the giant text
 * and the input box was stuffed with it too.
 *
 * The Groq transcription response is mocked to return that hallucination; the
 * app must collapse it to a single word and send exactly one clean message.
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

  // Mock Groq Whisper to return the pathological hallucination
  await page.route('**/api.groq.com/**/transcriptions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ text: 'Test '.repeat(120).trim() }),
    })
  })
  // Let the real chat/AI completions pass through untouched
  await page.unroute('**/api.groq.com/openai/v1/chat/completions').catch(() => {})
  await seed(page)

  await page.click('[data-testid="ai-chat-btn"]')
  await page.waitForSelector('[aria-label="Sathi AI Companion"]', { timeout: 10000 })

  const mic = 'button[title="Speak to Sathi"]'
  await page.click(mic)
  let sawListening = false
  try {
    await page.waitForSelector('text=Listening…', { timeout: 8000 })
    sawListening = true
  } catch {}
  await page.waitForTimeout(2500)
  await page.click(mic) // stop → "transcribes" the hallucination

  // Wait for the sanitized single-word message bubble to appear
  const t0 = Date.now()
  let exactBubble = false
  let finalText = ''
  while (Date.now() - t0 < 25000) {
    const probe = await page.evaluate(() => {
      const dlg = document.querySelector('[aria-label="Sathi AI Companion"]')
      if (!dlg) return { text: '', bubble: false }
      const divs = Array.from(dlg.querySelectorAll('div'))
      return {
        text: dlg.textContent.replace(/\s+/g, ' ').trim(),
        bubble: divs.some((d) => d.textContent && d.textContent.trim() === 'Test'),
      }
    })
    finalText = probe.text
    exactBubble = probe.bubble
    if (exactBubble) break
    await page.waitForTimeout(400)
  }
  const inputVal = await page.evaluate(() => {
    const inp = document.querySelector('[aria-label="Sathi AI Companion"] input, [aria-label="Sathi AI Companion"] textarea')
    return inp ? inp.value : ''
  })
  // The hallmark of the bug: "Test Test Test Test…" repetition anywhere
  const repetition = /Test(\s+Test){3,}/.test(finalText)
  console.log(`[halluc] sawListening=${sawListening}`)
  console.log(`[halluc] exactSingleTestBubble=${exactBubble} giantRepetitionPresent=${repetition}`)
  console.log(`[halluc] inputLen=${inputVal.length} input=${JSON.stringify(inputVal.slice(0, 60))}`)
  console.log(`[halluc] chatTail=${JSON.stringify(finalText.slice(-180))}`)

  const ok = sawListening && exactBubble && !repetition && inputVal.length === 0
  console.log(`[halluc] PASS=${ok}  (hallucinated 120x repeat → one clean "Test", empty input, no flood)`)
  await browser.close()
  process.exit(ok ? 0 : 1)
})().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
