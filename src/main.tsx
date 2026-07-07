import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { useProgress } from './state/progress'
import './styles.css'

// Expose the progress store for headless screenshot flows (e.g. ?capture=1) so overlays can be
// driven directly. No effect on normal play; the handle is only attached when ?capture is present.
if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('capture')) {
  ;(window as unknown as { __progress: typeof useProgress }).__progress = useProgress
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
