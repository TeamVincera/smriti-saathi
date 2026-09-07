/**
 * verify-mic-stt.cjs
 *
 * End-to-end test of the exact code path the iPhone takes when the mic is tapped:
 *   - iOS WKWebView has NO Web Speech API, so the app goes straight to the
 *     Groq Whisper fallback (MediaRecorder -> Groq -> transcript -> auto-send).
 *   - We delete window.SpeechRecognition/webkitSpeechRecognition to force that
 *     same path, and feed REAL spoken audio (macOS `say`) through Chromium's
 *     fake audio capture device.
 *
 * Two runs: English speech and Hindi speech, proving Groq auto-detects any
 * language (no forced language hint).
 */

const { chromium } = require('@playwright/test')

const seed = async (page) => {
  await page.addInitScript(() => {
    window.__initRan = (window.__initRan || 0) + 1
    // Hide dev-only overlays
    const style = document.createElement('style')
    style.innerHTML = '[data-reticle-overlay], .reticle-tb-wrap, [data-reticle-min] { display: none !important; }'
    if (document.documentElement) document.documentElement.appendChild(style)
    // iOS has no Web Speech API — force the Groq fallback exactly like the simulator
    try { delete window.SpeechRecognition; delete window.webkitSpeechRecognition } catch {}
    // Instrument Blob so we can report what the mic actually captured
    try {
      const OrigBlob = window.Blob
      window.__recStats = { bytes: 0, type: '' }
      window.Blob = function (...args) {
        const b = new OrigBlob(...args)
        const opts = args[1] || {}
        if (/audio/.test(opts.type || '')) window.__recStats = { bytes: b.size, type: opts.type }
        return b
      }
      window.Blob.prototype = OrigBlob.prototype
    } catch {}
  })
  await page.goto('/#/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(async () => {
    const profile = {
      language: 'en',
      patient: { name: 'Sarala Devi', age: 72, avatar: '👵', languagesSpoken: ['en', 'as'], education: 'Secondary school' },
      clinical: { stage: 'mild', diagnosisDate: '2024-01-15' },
      cultural: {
        state: 'Assam', community: 'Ahom', festivals: ['Bihu', 'Durga Puja'], occupation: 'Weaver',
        hobbies: ['Gardening', 'Weaving', 'Singing'],
        familyMembers: [
          { name: 'Runima', relation: 'Daughter', emoji: '👩' },
          { name: 'Rahul', relation: 'Son', emoji: '👨' },
        ],
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

async function runMicTest(label, wavPath, devanagari) {
  const browser = await chromium.launch({
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-audio-capture=${wavPath}`,
      '--autoplay-policy=no-user-gesture-required',
    ],
  })
  let transcript = ''
  let transcriptStatus = 'no-request'
  try {
    const ctx = await browser.newContext({
      baseURL: 'http://localhost:5173',
      permissions: ['microphone'],
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    })
    const page = await ctx.newPage()
    page.on('response', async (r) => {
      const url = r.url()
      if (url.includes('api.groq.com') && url.includes('transcriptions')) {
        transcriptStatus = `HTTP ${r.status()}`
        if (r.ok()) {
          try {
            const j = await r.json()
            transcript = (j && j.text ? j.text : '').trim()
          } catch {}
        } else {
          transcript = ''
        }
        console.log(`[${label}] groq transcriptions -> HTTP ${r.status()} text=${JSON.stringify(transcript.slice(0, 80))}`)
      }
    })
    await seed(page)

    await page.click('[data-testid="ai-chat-btn"]')
    await page.waitForSelector('[aria-label="Sathi AI Companion"]', { timeout: 10000 })

    // 1st mic tap = start recording (the tap that previously "never turned on")
    await page.click('button[title="Speak to Sathi"]')
    let sawListening = false
    try {
      await page.waitForSelector('text=Listening…', { timeout: 8000 })
      sawListening = true
      console.log(`[${label}] ✅ mic turned ON (status=Listening)`)
    } catch {}
    await page.waitForTimeout(3800) // let the spoken sentence play out

    // 2nd mic tap = stop & transcribe (the app's documented flow)
    await page.click('button[title="Speak to Sathi"]')

    // Wait for the Groq transcription response (up to 45s)
    const t0 = Date.now()
    while (!transcript && transcriptStatus === 'no-request' && Date.now() - t0 < 45000) {
      await page.waitForTimeout(500)
    }
    while (!transcript && Date.now() - t0 < 45000) {
      await page.waitForTimeout(500)
    }

    // Wait for the transcript to land in the chat as a user bubble + an assistant reply
    let inChat = false
    let reply = ''
    const t1 = Date.now()
    while (Date.now() - t1 < 40000) {
      const txt = await page.evaluate(() => {
        const dlg = document.querySelector('[aria-label="Sathi AI Companion"]')
        return dlg ? dlg.textContent.replace(/\s+/g, ' ').trim() : ''
      })
      if (transcript && txt.includes(transcript.slice(0, 30))) inChat = true
      if (inChat) {
        // Assistant reply = content after the user transcript bubble
        const idx = txt.indexOf(transcript.slice(0, 30))
        if (idx >= 0) {
          const after = txt.slice(idx + transcript.slice(0, 30).length)
          // strip quick-prompt pills & controls to find a real sentence reply
          const cleaned = after
            .replace(/💬.*?medicine[s]?\?/g, '')
            .replace(/💬.*?game[s]?\?/g, '')
            .replace(/💬.*?schedule today\?/g, '')
            .replace(/✨Sathi is thinking gently\.\.\./g, '')
            .replace(/Listen/g, '')
          const sentences = cleaned.split('  ').map((s) => s.trim()).filter((s) => s.length > 25)
          if (sentences.length > 0) { reply = sentences[0]; break }
        }
      }
      await page.waitForTimeout(400)
    }

    const stats = await page.evaluate(() => window.__recStats || null)
    const dialogProbe = await page.evaluate(() => {
      const dlg = document.querySelector('[aria-label="Sathi AI Companion"]')
      return dlg ? dlg.textContent.replace(/\s+/g, ' ').slice(-400) : ''
    })
    const hasDev = devanagari ? /[\u0900-\u097F]/.test(transcript) : true
    const ok = sawListening && transcriptStatus === 'HTTP 200' && transcript.length > 2 && hasDev && inChat && reply.length > 0
    console.log(`[${label}] captured=${JSON.stringify(stats)} transcriptStatus=${transcriptStatus}`)
    console.log(`[${label}] inChat=${inChat} reply=${JSON.stringify(reply.slice(0, 100))}`)
    console.log(`[${label}] chatTail=${JSON.stringify(dialogProbe)}`)
    console.log(`[${label}] PASS=${ok}`)
    await ctx.close()
    return ok
  } finally {
    await browser.close()
  }
}

;(async () => {
  const enOk = await runMicTest('EN', '/tmp/ss-speech-en.wav', false)
  const hiOk = await runMicTest('HI', '/tmp/ss-speech-hi.wav', true)
  console.log(`\n=== OVERALL en=${enOk} hi=${hiOk} => ${enOk && hiOk ? 'ALL PASS ✅' : 'CHECK FAILURES ⚠️'}`)
  process.exit(enOk && hiOk ? 0 : 1)
})().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
