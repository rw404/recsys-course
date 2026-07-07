import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { useProgress } from './state/progress'
import { runtime } from './game/shared'
import './styles.css'

// Expose the progress store + runtime for headless flows (e.g. ?capture=1) so overlays can be
// driven and the player position asserted in tests. No effect on normal play; only when ?capture.
if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('capture')) {
  ;(window as unknown as { __progress: typeof useProgress }).__progress = useProgress
  ;(window as unknown as { __runtime: typeof runtime }).__runtime = runtime
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
