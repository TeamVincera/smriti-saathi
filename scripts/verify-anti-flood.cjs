/**
 * verify-anti-flood.cjs
 *
 * Reproduces the reported flood: rapid/ghost taps on the voice button used to
 * start multiple recorders, each transcribing the same speech and sending the
 * same message repeatedly ("test, test, test…").
 *
 * Drives a storm of 3 taps within ~250ms + a legit stop tap, then asserts the
 * chat received EXACTLY ONE copy of the spoken text.
 */

const { chromium } = require('@playwright/test')

const seed = async (page) => {
  await page.addInitScript(() => {
    try {
      const style = document.createElement('style')
      style.innerHTML = '[data-reticle-overlay], .reticle-tb-wrap, [data-reticle-min] { display: none !important; }'
      if (document.documentElement) document.documentElement.appendChild(style)
    } catch {}
    // Force the Groq fallback path (same as iOS WKWebView — no Web Speech API)
    try { delete window.SpeechRecognition; delete window.webkitSpeechRecognition } catch {}
  })
  await page.goto('/#/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(async () => {
    const profile = {
      language: 'en',
      patient: { name: 'Sarala Devi', age: 72, avatar: '👵', languagesSpoken: ['en', 'as'], education: 'Secondary school' },
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
  let transcript = ''
  let transcriptions = 0
  const ctx = await browser.newContext({
    baseURL: 'http://localhost:5173',
    permissions: ['microphone'],
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  })
  const page = await ctx.newPage()
  page.on('response', async (r) => {
    if (r.url().includes('api.groq.com') && r.url().includes('transcriptions')) {
      transcriptions += 1
      if (r.ok()) {
        try {
          const j = await r.json()
          transcript = (j && j.text ? j.text : '').trim()
        } catch {}
      }
      console.log(`[flood] transcription #${transcriptions} HTTP ${r.status()} text=${JSON.stringify(transcript.slice(0, 60))}`)
    }
  })
  await seed(page)

  await page.click('[data-testid="ai-chat-btn"]')
  await page.waitForSelector('[aria-label="Sathi AI Companion"]', { timeout: 10000 })

  // ── GHOST TAP STORM: 3 taps in ~250ms (what used to start 2-3 recorders) ──
  const mic = 'button[title="Speak to Sathi"]'
  await page.click(mic)
  await page.waitForTimeout(80)
  await page.click(mic)
  await page.waitForTimeout(80)
  await page.click(mic)
  console.log('[flood] ghost storm: 3 taps sent')

  // The session must have started exactly once (Listening visible)
  let sawListening = false
  try {
    await page.waitForSelector('text=Listening…', { timeout: 8000 })
    sawListening = true
  } catch {}
  console.log(`[flood] sawListening=${sawListening}`)

  // Give the spoken sentence time, then ONE legit stop tap (session >400ms old)
  await page.waitForTimeout(3500)
  await page.click(mic)
  console.log('[flood] legit stop tap sent')

  // Wait for transcription + reply
  const t0 = Date.now()
  while (!transcript && Date.now() - t0 < 45000) await page.waitForTimeout(400)
  let occurrences = 0
  const t1 = Date.now()
  while (Date.now() - t1 < 25000) {
    const txt = await page.evaluate(() => {
      const dlg = document.querySelector('[aria-label="Sathi AI Companion"]')
      return dlg ? dlg.textContent.replace(/\s+/g, ' ') : ''
    })
    if (transcript) {
      occurrences = txt.split(transcript.slice(0, 25)).length - 1
      if (occurrences >= 1) break
    }
    await page.waitForTimeout(400)
  }
  const finalText = await page.evaluate(() => {
    const dlg = document.querySelector('[aria-label="Sathi AI Companion"]')
    return dlg ? dlg.textContent.replace(/\s+/g, ' ').trim() : ''
  })
  console.log(`[flood] transcript=${JSON.stringify(transcript.slice(0, 60))} occurrencesInChat=${occurrences} transcriptions=${transcriptions}`)
  console.log(`[flood] chatTail=${JSON.stringify(finalText.slice(-260))}`)

  const ok = sawListening && transcriptions === 1 && occurrences === 1
  console.log(`[flood] PASS=${ok}  (one tap-storm => one message, no flood)`)
  await browser.close()
  process.exit(ok ? 0 : 1)
})().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
