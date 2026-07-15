import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { World } from './game/World'
import { HUD } from './ui/HUD'
import { MobileControls } from './ui/MobileControls'
import { JourneyScroll } from './ui/JourneyScroll'
import { useProgress } from './state/progress'
import { OPEN_FOUNDRY_EVENT, isFoundryLaunchEvent } from './state/foundryLaunch'
import type { SystemTemplateId } from './data/systemTemplates'
import { runtime } from './game/shared'

const SystemBuilder = lazy(() => import('./ui/SystemBuilder').then((module) => ({ default: module.SystemBuilder })))
const StudyMode = lazy(() => import('./ui/StudyMode').then((module) => ({ default: module.StudyMode })))
const FoundationsLab = lazy(() => import('./ui/FoundationsLab').then((module) => ({ default: module.FoundationsLab })))
const RetrievalLab = lazy(() => import('./ui/RetrievalLab').then((module) => ({ default: module.RetrievalLab })))
const AttentionLab = lazy(() => import('./ui/AttentionLab').then((module) => ({ default: module.AttentionLab })))
const BanditLab = lazy(() => import('./ui/BanditLab').then((module) => ({ default: module.BanditLab })))
const DiversityLab = lazy(() => import('./ui/DiversityLab').then((module) => ({ default: module.DiversityLab })))
const CapstoneArena = lazy(() => import('./ui/CapstoneArena').then((module) => ({ default: module.CapstoneArena })))
const QuizMode = lazy(() => import('./ui/QuizMode').then((module) => ({ default: module.QuizMode })))
const InteractDialog = lazy(() => import('./ui/InteractDialog').then((module) => ({ default: module.InteractDialog })))
const Catalog = lazy(() => import('./ui/Catalog').then((module) => ({ default: module.Catalog })))
const CharacterViewer = lazy(() => import('./game/CharacterViewer').then((module) => ({ default: module.CharacterViewer })))
const GlbViewer = lazy(() => import('./game/GlbViewer').then((module) => ({ default: module.GlbViewer })))
const VSmithViewer = lazy(() => import('./game/VSmithViewer').then((module) => ({ default: module.VSmithViewer })))

const FoundryAssetViewer = lazy(() => import('./game/FoundryAssetViewer'))

const VIEW = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('view') : null

const ARTIFACT_NAMES: Record<string, string> = {
  'metric-compass': 'Ranking evaluation note',
  'vector-core': 'Retrieval diagnostics',
  'attention-lens': 'Attention memory profile',
  'policy-controller': 'Policy experiment report',
  'diversity-seed': 'Slate health report',
}

// Completing a region's checkpoint quiz lights the gate onward — toast it (all five regions).
const GATE_TOAST: Record<string, string> = {
  'quiz-gate': 'Retrieval Systems is now available',
  'negatives-quiz': 'Sequential Models is now available',
  'attention-quiz': 'Decisions and Policies is now available',
  'policy-quiz': 'Feedback Ecosystems is now available',
  'ecosystem-quiz': 'System Synthesis is now available',
}
// Claiming the champion finale completes the course — a special celebratory toast.
const CHAMPION_TOAST = 'Course complete — production readiness review passed'

export function App() {
  return (
    <Suspense fallback={<div className="foundry-loading" aria-label="Loading experience"><span /></div>}>
      <AppRoute />
    </Suspense>
  )
}

function AppRoute() {
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
  if (VIEW === 'foundry-asset') {
    return (
      <Suspense fallback={null}>
        <FoundryAssetViewer />
      </Suspense>
    )
  }
  return <Game />
}

function Game() {
  const mode = useProgress((s) => s.mode)
  const activeNodeId = useProgress((s) => s.activeNodeId)
  const closeNode = useProgress((s) => s.closeNode)
  const artifacts = useProgress((s) => s.artifacts)
  const completed = useProgress((s) => s.completed)
  const atlasOpen = useProgress((s) => s.atlasOpen)

  const [catalogOpen, setCatalogOpen] = useState(false)
  const [builderOpen, setBuilderOpen] = useState(false)
  const [builderTemplateId, setBuilderTemplateId] = useState<SystemTemplateId>('hybrid')
  const openBuilder = useCallback((templateId: SystemTemplateId = 'hybrid') => {
    setBuilderTemplateId(templateId)
    setBuilderOpen(true)
  }, [])
  const [toast, setToast] = useState<string | null>(null)

  // Toast when a new experiment record is saved or the next region becomes available.
  const prevArtifacts = useRef(artifacts)
  const prevCompleted = useRef(completed)
  useEffect(() => {
    for (const [key, on] of Object.entries(artifacts)) {
      if (on && !prevArtifacts.current[key as keyof typeof artifacts]) {
        showToast(`Experiment complete: ${ARTIFACT_NAMES[key] ?? key} saved`)
      }
    }
    prevArtifacts.current = artifacts
  }, [artifacts])
  useEffect(() => {
    for (const key of Object.keys(GATE_TOAST)) {
      const k = key as keyof typeof completed
      if (completed[k] && !prevCompleted.current[k]) showToast(GATE_TOAST[key])
    }
    if (completed['champion'] && !prevCompleted.current['champion']) showToast(CHAMPION_TOAST)
    prevCompleted.current = completed
  }, [completed])

  const toastTimer = useRef<number | undefined>(undefined)
  const showToast = (msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3800)
  }

  useEffect(() => {
    const handleFoundryLaunch = (event: Event) => {
      if (!isFoundryLaunchEvent(event)) return
      openBuilder(event.detail.templateId)
    }
    window.addEventListener(OPEN_FOUNDRY_EVENT, handleFoundryLaunch)
    return () => window.removeEventListener(OPEN_FOUNDRY_EVENT, handleFoundryLaunch)
  }, [openBuilder])

  // global keys: Esc closes overlays, C toggles catalog (skips cinematic on close)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      if (e.key === 'Escape') {
        if (builderOpen) setBuilderOpen(false)
        else if (activeNodeId) {
          runtime.cameraSkip = true
          closeNode()
        } else if (catalogOpen) setCatalogOpen(false)
      }
      if (e.key.toLowerCase() === 'c' && !activeNodeId) setCatalogOpen((v) => !v)
      if (e.key.toLowerCase() === 'b' && !activeNodeId && !catalogOpen) {
        if (builderOpen) setBuilderOpen(false)
        else openBuilder()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeNodeId, builderOpen, catalogOpen, closeNode, openBuilder])

  return (
    <div className={`course-app mode-${mode}`}>
      {!builderOpen && (
        <div className="canvas-wrap">
          <World />
        </div>
      )}

      {atlasOpen && !catalogOpen && !builderOpen && (
        <JourneyScroll onOpenBuilder={() => openBuilder()} />
      )}

      {!catalogOpen && !builderOpen && (
        <HUD onOpenCatalog={() => setCatalogOpen(true)} onOpenBuilder={() => openBuilder()} />
      )}
      {!atlasOpen && !catalogOpen && !builderOpen && <MobileControls />}

      {toast && <div className="toast panel">{toast}</div>}

      <Suspense fallback={<div className="foundry-loading" aria-label="Loading learning activity"><span /></div>}>
        {activeNodeId && mode === 'study' && <StudyMode />}
        {activeNodeId && mode === 'lab' && (
          activeNodeId === 'retrieval-sandbox' ? <RetrievalLab />
          : activeNodeId === 'attention-lab' ? <AttentionLab />
          : activeNodeId === 'bandit-lab' ? <BanditLab />
          : activeNodeId === 'diversity-lab' ? <DiversityLab />
          : activeNodeId === 'capstone-arena' ? <CapstoneArena />
          : <FoundationsLab />
        )}
        {activeNodeId && mode === 'quiz' && <QuizMode />}
        {activeNodeId && mode === 'interact' && <InteractDialog nodeId={activeNodeId} />}
        {catalogOpen && <Catalog onClose={() => setCatalogOpen(false)} />}
      </Suspense>
      {builderOpen && (
        <Suspense fallback={<div className="foundry-loading" aria-label="Loading system Foundry"><span /></div>}>
          <SystemBuilder initialTemplateId={builderTemplateId} onClose={() => setBuilderOpen(false)} />
        </Suspense>
      )}
    </div>
  )
}
