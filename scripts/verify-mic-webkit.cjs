/**
 * verify-mic-webkit.cjs
 *
 * Voice typing end-to-end on the REAL WebKit engine — the same engine family
 * as the iOS Simulator's WKWebView — using the Mac's actual microphone while
 * the sample sentence plays through the speakers.
 */

const { webkit } = require('@playwright/test')
const { exec } = require('child_process')

const seed = async (page) => {
  await page.addInitScript(() => {
    try { delete window.SpeechRecognition; delete window.webkitSpeechRecognition } catch {}
    try {
      const style = document.createElement('style')
      style.innerHTML = '[data-reticle-overlay], .reticle-tb-wrap, [data-reticle-min] { display: none !important; }'
      if (document.documentElement) document.documentElement.appendChild(style)
    } catch {}
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
  await page.waitForTimeout(700)
}

const playSample = () =>
  new Promise((resolve) => {
    const p = exec('afplay -v 2 /tmp/ss-speech-en.wav', { timeout: 15000 })
    p.on('exit', () => resolve())
    setTimeout(resolve, 6000)
  })

;(async () => {
  const browser = await webkit.launch()
  const ctx = await browser.newContext({
    baseURL: 'http://localhost:5173',
    permissions: ['microphone'],
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  })
  const page = await ctx.newPage()
  let transcript = ''
  page.on('response', async (r) => {
    if (r.url().includes('api.groq.com') && r.url().includes('transcriptions')) {
      if (r.ok()) {
        try {
          const j = await r.json()
          transcript = (j && j.text ? j.text : '').trim()
        } catch {}
      }
      console.log(`[webkit-mic] groq transcriptions -> HTTP ${r.status()}`)
    }
  })
  await seed(page)
  await page.click('[data-testid="ai-chat-btn"]')
  await page.waitForSelector('[aria-label="Sathi AI Companion"]', { timeout: 10000 })

  const mic = 'button[title="Speak to Sathi"]'
  await page.click(mic)
  let sawListening = false
  try {
    await page.waitForSelector('text=Listening…', { timeout: 8000 })
    sawListening = true
    console.log('[webkit-mic] mic ON (Listening) — playing sample audio into the real microphone…')
  } catch {
    console.log('[webkit-mic] never reached Listening')
  }
  await playSample() // real audio through speakers -> real Mac mic
  await page.waitForTimeout(500)
  await page.click(mic) // stop & transcribe

  const t0 = Date.now()
  while (!transcript && Date.now() - t0 < 45000) await page.waitForTimeout(400)
  let inChat = false
  const t1 = Date.now()
  while (Date.now() - t1 < 25000) {
    const txt = await page.evaluate(() => {
      const dlg = document.querySelector('[aria-label="Sathi AI Companion"]')
      return dlg ? dlg.textContent.replace(/\s+/g, ' ') : ''
    })
    if (transcript && txt.includes(transcript.slice(0, 25))) { inChat = true; break }
    await page.waitForTimeout(400)
  }
  const chatTail = await page.evaluate(() => {
    const dlg = document.querySelector('[aria-label="Sathi AI Companion"]')
    return dlg ? dlg.textContent.replace(/\s+/g, ' ').trim().slice(-200) : ''
  })
  console.log(`[webkit-mic] sawListening=${sawListening} transcript=${JSON.stringify(transcript.slice(0, 80))} inChat=${inChat}`)
  console.log(`[webkit-mic] chatTail=${JSON.stringify(chatTail)}`)
  const ok = sawListening && transcript.length > 2 && inChat
  console.log(`[webkit-mic] PASS=${ok}`)
  await browser.close()
  process.exit(ok ? 0 : 1)
})().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
