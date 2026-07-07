import { useEffect, useRef, useState } from 'react'
import { World } from './game/World'
import { HUD } from './ui/HUD'
import { StudyMode } from './ui/StudyMode'
import { LabMode } from './ui/LabMode'
import { QuizMode } from './ui/QuizMode'
import { InteractDialog } from './ui/InteractDialog'
import { Catalog } from './ui/Catalog'
import { MobileControls } from './ui/MobileControls'
import { useProgress } from './state/progress'
import { runtime } from './game/shared'
import { CharacterViewer } from './game/CharacterViewer'

const VIEW = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('view') : null

export function App() {
  if (VIEW === 'character') {
    return (
      <div className="canvas-wrap">
        <CharacterViewer />
      </div>
    )
  }
  return <Game />
}

function Game() {
  const mode = useProgress((s) => s.mode)
  const activeNodeId = useProgress((s) => s.activeNodeId)
  const closeNode = useProgress((s) => s.closeNode)
  const collected = useProgress((s) => s.collectedArtifacts())
  const bridgeUnlocked = useProgress((s) => s.completed['quiz-gate'])

  const [catalogOpen, setCatalogOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // toast when a new artifact is forged or the bridge lights up
  const prevCollected = useRef(collected)
  const prevBridge = useRef(bridgeUnlocked)
  useEffect(() => {
    if (collected > prevCollected.current) {
      showToast('★ Artifact forged: Metric Compass — check your backpack')
    }
    prevCollected.current = collected
  }, [collected])
  useEffect(() => {
    if (bridgeUnlocked && !prevBridge.current) {
      showToast('🌉 The Retrieval Bridge is now lit')
    }
    prevBridge.current = bridgeUnlocked
  }, [bridgeUnlocked])

  const toastTimer = useRef<number | undefined>(undefined)
  const showToast = (msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3800)
  }

  // global keys: Esc closes overlays, C toggles catalog (skips cinematic on close)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      if (e.key === 'Escape') {
        if (activeNodeId) {
          runtime.cameraSkip = true
          closeNode()
        } else if (catalogOpen) setCatalogOpen(false)
      }
      if (e.key.toLowerCase() === 'c' && !activeNodeId) setCatalogOpen((v) => !v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeNodeId, catalogOpen, closeNode])

  return (
    <>
      <div className="canvas-wrap">
        <World />
      </div>

      <HUD onOpenCatalog={() => setCatalogOpen(true)} />
      <MobileControls />

      {toast && <div className="toast panel">{toast}</div>}

      {activeNodeId && mode === 'study' && <StudyMode />}
      {activeNodeId && mode === 'lab' && <LabMode />}
      {activeNodeId && mode === 'quiz' && <QuizMode />}
      {activeNodeId && mode === 'interact' && <InteractDialog nodeId={activeNodeId} />}

      {catalogOpen && <Catalog onClose={() => setCatalogOpen(false)} />}
    </>
  )
}
