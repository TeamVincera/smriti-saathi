const { webkit, devices } = require('@playwright/test')
const fs = require('fs')
const path = require('path')

const OUT = path.join(__dirname, '..', '.agent', 'webkit-shots')
fs.mkdirSync(OUT, { recursive: true })

const seed = async (page) => {
  await page.addInitScript(() => {
    const style = document.createElement('style')
    style.innerHTML = '[data-reticle-overlay], .reticle-tb-wrap, [data-reticle-min] { display: none !important; }'
    document.documentElement.appendChild(style)
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
  await page.waitForTimeout(600)
}

const screens = [
  { name: 'home', url: '/#/' },
  { name: 'chat', url: '/#/', clickFab: true },
  { name: 'reminders', url: '/#/reminders' },
  { name: 'meds', url: '/#/meds' },
  { name: 'caregiver', url: '/#/hub' },
  { name: 'game-faces', url: '/#/game/faces' },
  { name: 'game-tray', url: '/#/game/tray' },
]

const viewports = [
  { name: 'iphone-14', cfg: { ...devices['iPhone 14'] } },
  { name: 'ipad-pro-11', cfg: { ...devices['iPad Pro 11'] } },
  { name: 'iphone-se', cfg: { ...devices['iPhone SE'] } },
]

;(async () => {
  const browser = await webkit.launch()
  const report = []
  for (const vp of viewports) {
    const ctx = await browser.newContext({ baseURL: 'http://localhost:5173', ...vp.cfg })
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
    page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()) })

    await seed(page)
    for (const s of screens) {
      await page.goto(s.url, { waitUntil: 'domcontentloaded' }).catch(() => {})
      await page.waitForTimeout(1000)
      if (s.clickFab) {
        await page.click('[data-testid="ai-chat-btn"]', { timeout: 5000 }).catch(() => {})
        await page.waitForTimeout(800)
      }
      const shot = path.join(OUT, `${vp.name}-${s.name}.png`)
      await page.screenshot({ path: shot })
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement
        const body = document.body
        return {
          docW: doc.scrollWidth, winW: window.innerWidth,
          bodyW: body ? body.scrollWidth : 0,
          docH: doc.scrollHeight, winH: window.innerHeight,
        }
      })
      report.push({
        device: vp.name, screen: s.name,
        hOverflow: overflow.docW > overflow.winW || overflow.bodyW > overflow.winW,
        w: `${overflow.docW}/${overflow.winW}`,
        h: `${overflow.docH}/${overflow.winH}`,
      })
    }
    report.push({ device: vp.name, screen: 'ERRORS', errors: errors.slice(0, 8) })
    await ctx.close()
  }
  await browser.close()
  console.log('=== WEBKIT (iOS Safari engine) DEVICE REPORT ===')
  for (const r of report) {
    if (r.errors) console.log(`\n[${r.device}] ERRORS: ${r.errors.length ? r.errors.join(' | ') : 'none'}`)
    else console.log(`[${r.device}] ${r.screen}: W=${r.w} H=${r.h}${r.hOverflow ? ' <-- H-OVERFLOW' : ''}`)
  }
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1) })