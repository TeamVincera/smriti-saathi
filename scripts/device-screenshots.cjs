/**
 * Device glitch-hunt: walk the app on 4 device classes (iPhone, Android phone,
 * iPad, Android tablet) and capture screenshots of every major screen so
 * layout/overflow/rendering problems can be inspected visually.
 */
const { chromium, devices } = require('@playwright/test')
const fs = require('fs')
const path = require('path')

const OUT = path.join(__dirname, '..', '.agent', 'device-shots')
fs.mkdirSync(OUT, { recursive: true })

// Seed a fully onboarded profile via IndexedDB (same shape as e2e helper)
const seedScript = async (page, custom = {}) => {
  await page.addInitScript(() => {
    const style = document.createElement('style')
    style.innerHTML = '[data-reticle-overlay], .reticle-tb-wrap, [data-reticle-min] { display: none !important; }'
    document.documentElement.appendChild(style)
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(async (overrides) => {
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
      pin: '1234', onboarded: true, createdAt: Date.now(), ...overrides,
    }
    const meds = [
      { id: 'med-1', name: 'Donepezil', dosage: '5mg', form: 'tablet', times: ['08:00', '20:00'], foodRelation: 'after', active: true },
      { id: 'med-2', name: 'Vitamin B12', dosage: '1000mcg', form: 'syrup', times: ['09:00'], foodRelation: 'after', active: true },
    ]
    const dailyReminders = [
      { id: 'rem-water', title: 'Drink water', description: 'Stay hydrated with a fresh glass of water', time: '09:00', enabled: true, active: true, emoji: '💧', category: 'hydration' },
      { id: 'rem-breakfast', title: 'Eat breakfast', description: 'Enjoy a nourishing morning meal', time: '08:00', enabled: true, active: true, emoji: '🥣', category: 'meal' },
    ]
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
        const tx = db.transaction(['kv', 'meds', 'daily_reminders'], 'readwrite')
        tx.objectStore('kv').put(profile, 'profile')
        const medStore = tx.objectStore('meds')
        meds.forEach((m) => medStore.put(m))
        const remStore = tx.objectStore('daily_reminders')
        dailyReminders.forEach((r) => remStore.put(r))
        tx.oncomplete = () => { db.close(); resolve() }
        tx.onerror = () => { db.close(); reject(tx.error) }
      }
      req.onerror = () => reject(req.error)
    })
  }, custom)
  await page.reload({ waitUntil: 'domcontentloaded' })
}

// Custom Android tablet config (Playwright has no built-in Android tablet device)
const androidTablet = {
  viewport: { width: 800, height: 1280 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (Linux; Android 13; SM-X910) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
}

const devicesToTest = [
  { name: 'iphone', cfg: { ...devices['iPhone 14'] } },
  { name: 'android-phone', cfg: { ...devices['Pixel 7'] } },
  { name: 'ipad', cfg: { ...devices['iPad Pro 11'] } },
  { name: 'android-tablet', cfg: androidTablet },
]

const screens = [
  { name: 'home', url: '/#/' },
  { name: 'chat', url: '/#/', clickFab: true },
  { name: 'reminders', url: '/#/reminders' },
  { name: 'meds', url: '/#/meds' },
  { name: 'caregiver', url: '/#/hub' },
  { name: 'game-faces', url: '/#/game/faces' },
  { name: 'game-tray', url: '/#/game/tray' },
]

async function main() {
  const baseURL = process.env.BASE_URL || 'http://localhost:5173'
  const browser = await chromium.launch()
  const report = []
  for (const dev of devicesToTest) {
    const context = await browser.newContext({ baseURL, ...dev.cfg })
    const page = await context.newPage()
    // Collect console errors + page overflow data
    const consoleErrors = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message))

    await seedScript(page)
    for (const s of screens) {
      await page.goto(s.url, { waitUntil: 'networkidle' }).catch(() => {})
      await page.waitForTimeout(900)
      if (s.clickFab) {
        // Chat is a floating FAB, not a route — open it by clicking
        const fab = page.locator('button[aria-label="Open Sathi AI Assistant"], button:has-text("Open Sathi AI Assistant")').first()
        await fab.click({ timeout: 5000 }).catch(() => {})
        await page.waitForTimeout(700)
      }
      const shotPath = path.join(OUT, `${dev.name}-${s.name}.png`)
      await page.screenshot({ path: shotPath, fullPage: false })
      // Detect horizontal overflow (a classic mobile glitch)
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement
        const body = document.body
        return {
          docScrollW: doc.scrollWidth,
          winW: window.innerWidth,
          bodyScrollW: body ? body.scrollWidth : 0,
        }
      })
      report.push({
        device: dev.name, screen: s.name,
        overflow: overflow.docScrollW > overflow.winW || overflow.bodyScrollW > overflow.winW,
        docW: overflow.docScrollW, winW: overflow.winW, bodyW: overflow.bodyScrollW,
        file: shotPath,
      })
    }
    report.push({ device: dev.name, screen: 'CONSOLE_ERRORS', errors: consoleErrors.slice(0, 12) })
    await context.close()
  }
  await browser.close()

  // Write machine-readable summary
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(report, null, 2))
  console.log('=== DEVICE REPORT ===')
  for (const r of report) {
    if (r.errors) {
      console.log(`\n[${r.device}] ${r.screen}: ${r.errors.length ? r.errors.join(' | ') : 'none'}`)
    } else {
      const flag = r.overflow ? ' <-- H-OVERFLOW' : ''
      console.log(`[${r.device}] ${r.screen}: docW=${r.docW} winW=${r.winW}${flag}`)
    }
  }
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})