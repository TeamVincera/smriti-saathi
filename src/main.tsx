import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AppProvider } from './state'
import './styles/app.css'
import { startAIAvailability } from './lib/ai/availability'

startAIAvailability()


if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  if (import.meta.env.DEV) {
    // A production PWA worker must never control Vite source modules: its
    // cache-first strategy can otherwise mix old and new exports after HMR.
    void navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .catch(() => {})
    if ('caches' in window) {
      void caches.keys()
        .then((keys) => Promise.all(keys.filter((key) => key.startsWith('smriti-sathi-offline-')).map((key) => caches.delete(key))))
        .catch(() => {})
    }
  } else {
    // Refresh the production worker so each release activates its versioned
    // offline cache without interrupting the current app session.
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) registration.update().catch(() => {})
    }).catch(() => {})

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {})
    })
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>
)
