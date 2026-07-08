import { useEffect, useRef, useState } from 'react'
import { World } from './game/World'
import { HUD } from './ui/HUD'
import { StudyMode } from './ui/StudyMode'
import { LabMode } from './ui/LabMode'
import { RetrievalLab } from './ui/RetrievalLab'
import { AttentionLab } from './ui/AttentionLab'
import { BanditLab } from './ui/BanditLab'
import { QuizMode } from './ui/QuizMode'
import { InteractDialog } from './ui/InteractDialog'
import { Catalog } from './ui/Catalog'
import { MobileControls } from './ui/MobileControls'
import { useProgress } from './state/progress'
import { runtime } from './game/shared'
import { CharacterViewer } from './game/CharacterViewer'
import { GlbViewer } from './game/GlbViewer'
import { VSmithViewer } from './game/VSmithViewer'

const VIEW = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('view') : null

const ARTIFACT_NAMES: Record<string, string> = {
  'metric-compass': 'Metric Compass',
  'vector-core': 'Vector Core',
  'attention-lens': 'Attention Lens',
  'policy-controller': 'Policy Controller',
}

export function App() {
  if (VIEW === 'character') {
    return (
      <div className="canvas-wrap">
        <CharacterViewer />
      </div>
    )
  }
  if (VIEW === 'glb') {
    return (
      <div className="canvas-wrap">
        <GlbViewer />
      </div>
    )
  }
  if (VIEW === 'vsmith') {
    return (
      <div className="canvas-wrap">
        <VSmithViewer />
      </div>
    )
  }
  return <Game />
}

function Game() {
  const mode = useProgress((s) => s.mode)
  const activeNodeId = useProgress((s) => s.activeNodeId)
  const closeNode = useProgress((s) => s.closeNode)
  const artifacts = useProgress((s) => s.artifacts)
  const bridgeUnlocked = useProgress((s) => s.completed['quiz-gate'])

  const [catalogOpen, setCatalogOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // toast when a new artifact is forged or the bridge lights up
  const prevArtifacts = useRef(artifacts)
  const prevBridge = useRef(bridgeUnlocked)
  useEffect(() => {
    for (const [key, on] of Object.entries(artifacts)) {
      if (on && !prevArtifacts.current[key as keyof typeof artifacts]) {
        showToast(`★ Artifact forged: ${ARTIFACT_NAMES[key] ?? key} — check your backpack`)
      }
    }
    prevArtifacts.current = artifacts
  }, [artifacts])
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
      {activeNodeId && mode === 'lab' && (
        activeNodeId === 'retrieval-sandbox' ? <RetrievalLab />
        : activeNodeId === 'attention-lab' ? <AttentionLab />
        : activeNodeId === 'bandit-lab' ? <BanditLab />
        : <LabMode />
      )}
      {activeNodeId && mode === 'quiz' && <QuizMode />}
      {activeNodeId && mode === 'interact' && <InteractDialog nodeId={activeNodeId} />}

      {catalogOpen && <Catalog onClose={() => setCatalogOpen(false)} />}
    </>
  )
}
