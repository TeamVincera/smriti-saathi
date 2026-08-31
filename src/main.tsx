import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AppProvider } from './state'
import './styles/app.css'


if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  // Purge any older cached service workers so outdated bundles never run
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const r of registrations) {
      r.update().catch(() => {})
    }
  }).catch(() => {})

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>
)
