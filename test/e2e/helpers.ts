import type { Page } from '@playwright/test'

export async function seedOnboardedState(page: Page, overrides = {}) {
  await page.addInitScript(() => {
    const style = document.createElement('style')
    style.id = 'e2e-disable-overlay'
    style.innerHTML = '[data-reticle-overlay], .reticle-tb-wrap, [data-reticle-min] { pointer-events: none !important; opacity: 0 !important; visibility: hidden !important; }'
    document.documentElement.appendChild(style)
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(async (custom) => {
    const profile = {
      language: 'en',
      patient: {
        name: 'Sarala Devi',
        age: 72,
        avatar: '👵',
        languagesSpoken: ['en', 'as'],
        education: 'Secondary school',
      },
      clinical: { stage: 'mild', diagnosisDate: '2024-01-15' },
      cultural: {
        state: 'Assam',
        community: 'Ahom',
        festivals: ['Bihu', 'Durga Puja'],
        occupation: 'Weaver',
        hobbies: ['Gardening', 'Weaving', 'Singing'],
        familyMembers: [
          { name: 'Runima', relation: 'Daughter', emoji: '👩' },
          { name: 'Rahul', relation: 'Son', emoji: '👨' },
        ],
      },
      routine: { wake: '06:00', breakfast: '08:00', lunch: '13:00', dinner: '20:00', sleep: '21:30' },
      caregiver: { name: 'Rahul', phone: '9876543210', relationship: 'Son' },
      pin: '1234',
      onboarded: true,
      createdAt: Date.now(),
      ...custom,
    }

    const meds = [
      { id: 'med-1', name: 'Donepezil', dosage: '5mg', form: 'tablet', times: ['08:00', '20:00'], foodRelation: 'after', active: true },
      { id: 'med-2', name: 'Vitamin B12', dosage: '1000mcg', form: 'syrup', times: ['09:00'], foodRelation: 'after', active: true },
    ]

    const dailyReminders = [
      { id: 'rem-water', title: 'Drink water', description: 'Stay hydrated with a fresh glass of water', time: '09:00', enabled: true, active: true, emoji: '💧', category: 'hydration' },
      { id: 'rem-breakfast', title: 'Eat breakfast', description: 'Enjoy a nourishing morning meal', time: '08:00', enabled: true, active: true, emoji: '🥣', category: 'meal' },
    ]

    // Write into IndexedDB
    const req = indexedDB.open('smriti-sathi', 2)
    await new Promise<void>((resolve, reject) => {
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
        tx.oncomplete = () => {
          db.close()
          resolve()
        }
        tx.onerror = () => {
          db.close()
          reject(tx.error)
        }
      }
      req.onerror = () => reject(req.error)
    })
  }, overrides)
  await page.reload({ waitUntil: 'domcontentloaded' })
}
