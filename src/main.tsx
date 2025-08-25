import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);

// Auto-update PWA clients: claim and refresh once new SW is ready
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        // Listen for updates to the service worker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New content available, activate it immediately
                newWorker.postMessage({ type: 'SKIP_WAITING' })
              }
            }
          })
        })

        // When the new SW takes control, reload to get latest assets
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload()
        })
      }
    } catch {}
  })
}
