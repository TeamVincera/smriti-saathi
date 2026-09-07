const { chromium, devices } = require('@playwright/test')

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
          { name: 'Anjali', relation: 'Spouse', emoji: '👩' },
          { name: 'Deepak', relation: 'Brother', emoji: '👨' },
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

;(async () => {
  const browser = await chromium.launch()

  // TEST 1: chat closes on navigation (iPhone viewport)
  {
    const ctx = await browser.newContext({ baseURL: 'http://localhost:5173', ...devices['iPhone 14'] })
    const page = await ctx.newPage()
    await seed(page)
    await page.click('[data-testid="ai-chat-btn"]')
    await page.waitForTimeout(500)
    const chatOpen = await page.isVisible('[aria-label="Sathi AI Companion"]')
    // Navigate by changing the hash (e.g. a deep link / back gesture / home shortcut)
    await page.evaluate(() => { window.location.hash = '/reminders' })
    await page.waitForTimeout(700)
    const chatAfterNav = await page.isVisible('[aria-label="Sathi AI Companion"]')
    const remindersShown = await page.isVisible('text=Reminders')
    console.log(`[TEST1 chat-nav] opens=${chatOpen} closes-on-nav=${!chatAfterNav} reminders-shown=${remindersShown}`)
    await ctx.close()
  }

  // TEST 2: Faces of Home — target always among options + no relation badges
  for (const dev of [['iPhone 14'], ['iPad Pro 11']]) {
    const cfg = dev[0] === 'iPhone 14' ? devices['iPhone 14'] : devices['iPad Pro 11']
    const ctx = await browser.newContext({ baseURL: 'http://localhost:5173', ...cfg })
    const page = await ctx.newPage()
    await seed(page)
    await page.goto('/#/game/faces', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1200)
    const heading = await page.textContent('h1')
    const optionText = await page.locator('button:has(strong)').allTextContents().catch(() => [])
    const hasRelationWords = optionText.some((t) => /daughter|son|spouse|brother|sister|grandchild|niece|nephew|friend/i.test(t))
    // Count how many option cards render
    const cardCount = optionText.length
    console.log(`[TEST2 ${dev[0]}] heading="${heading}" options=${cardCount} relation-leak=${hasRelationWords}`)
    await ctx.close()
  }

  await browser.close()
  console.log('DONE')
})().catch((e) => { console.error('FATAL', e.message); process.exit(1) })