import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { useProgress } from './state/progress'
import './styles.css'

// Expose the progress store + runtime for headless flows (e.g. ?capture=1) so overlays can be
// driven and the player position asserted in tests. No effect on normal play; only in audit modes.
if (typeof window !== 'undefined' && ['capture', 'perf'].some((key) => new URLSearchParams(window.location.search).has(key))) {
  ;(window as unknown as { __progress: typeof useProgress }).__progress = useProgress
  void import('./game/shared').then(({ runtime }) => {
    type Runtime = typeof import('./game/shared')['runtime']
    ;(window as unknown as { __runtime: Runtime }).__runtime = runtime
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
