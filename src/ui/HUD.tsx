import {
  Accessibility,
  ArrowRight,
  BookOpen,
  Check,
  Compass,
  Diamond,
  Map,
  MousePointer2,
  Network,
} from 'lucide-react'
import type { CSSProperties } from 'react'
import { COURSE_WORLDS, COURSE_WORLD_BY_ID } from '../data/worlds'
import { NODES, useProgress, type NodeId, type WorldId } from '../state/progress'
import { chapterActionNode } from '../game/theoryStageLayout'

export function HUD({
  onOpenCatalog,
  onOpenBuilder,
}: {
  onOpenCatalog: () => void
  onOpenBuilder: () => void
}) {
  const next = useProgress((state) => state.nextRequiredAction())
  const nearbyId = useProgress((state) => state.nearbyNodeId)
  const mode = useProgress((state) => state.mode)
  const collected = useProgress((state) => state.collectedArtifacts())
  const totalArtifacts = useProgress((state) => state.totalArtifacts)
  const reduced = useProgress((state) => state.reducedMotion)
  const setReduced = useProgress((state) => state.setReducedMotion)
  const currentWorld = useProgress((state) => state.currentWorld)
  const completed = useProgress((state) => state.completed)
  const atlasOpen = useProgress((state) => state.atlasOpen)
  const toggleAtlas = useProgress((state) => state.toggleAtlas)
  const travelTo = useProgress((state) => state.travelTo)
  const openNode = useProgress((state) => state.openNode)

  const worldProgress = Object.fromEntries(
    COURSE_WORLDS.map((world) => {
      const nodes = Object.values(NODES).filter((node) => node.worldId === world.id && node.kind !== 'npc')
      const done = nodes.filter((node) => completed[node.id]).length
      return [world.id, Math.round((done / Math.max(nodes.length, 1)) * 100)]
    }),
  ) as Record<WorldId, number>

  const countedNodes = Object.values(NODES).filter((node) => node.kind !== 'npc')
  const courseDone = countedNodes.filter((node) => completed[node.id]).length
  const courseProgress = Math.round((courseDone / countedNodes.length) * 100)
  const nearbyNode = nearbyId ? NODES[nearbyId] : null
  const activeWorld = COURSE_WORLD_BY_ID[currentWorld]
  const activeIndex = COURSE_WORLDS.findIndex((world) => world.id === currentWorld)
  const primaryNodeId = chapterActionNode(currentWorld, next.nodeId)
  const primaryNode = NODES[primaryNodeId]
  const primaryNodeState = useProgress((state) => state.getNodeState(primaryNodeId))
  const followsGlobalRoute = primaryNodeId === next.nodeId

  const continueCourse = () => {
    openNode(primaryNodeId)
  }

  const continueLabel = followsGlobalRoute
    ? 'Open next field note'
    : primaryNodeState === 'locked_for_credit'
    ? `Preview ${activeWorld.short} theory`
    : primaryNodeState === 'completed'
    ? `Review ${activeWorld.short} theory`
    : `Open ${activeWorld.short} theory`

  return (
    <div className={`cloud-hud${atlasOpen ? ' is-overview' : ' is-focused'}${mode !== 'explore' ? ' is-learning' : ''}`}>
      <header className="cloud-topbar">
        <button
          type="button"
          className="cloud-brand"
          onClick={() => { if (!atlasOpen) toggleAtlas() }}
          aria-label="Open course world map"
        >
          <span className="cloud-brand-mark"><Compass size={20} /></span>
          <span><strong>RecSys Odyssey</strong><small>Interactive course</small></span>
        </button>

        <div className="cloud-course-progress" aria-label={`${courseProgress}% course complete`}>
          <span><strong>{courseProgress}%</strong><small>Course progress</small></span>
          <i style={{ '--course-progress': `${courseProgress}%` } as CSSProperties}><b /></i>
        </div>

        <div className="cloud-tools">
          <span className="cloud-artifacts" title="Artifacts collected">
            <Diamond size={15} /><strong>{collected}</strong><small>/ {totalArtifacts}</small>
          </span>
          <button
            type="button"
            className={`cloud-icon-button${atlasOpen ? ' is-active' : ''}`}
            onClick={() => { if (!atlasOpen) toggleAtlas() }}
            aria-label="Course world map"
            data-tooltip="World map"
          >
            <Map size={18} />
          </button>
          <button type="button" className="cloud-icon-button" onClick={onOpenCatalog} aria-label="Course index" data-tooltip="Course index">
            <BookOpen size={18} />
          </button>
          <button type="button" className="cloud-icon-button" onClick={onOpenBuilder} aria-label="Open system Foundry" data-tooltip="System Foundry">
            <Network size={18} />
          </button>
          <button
            type="button"
            className={`cloud-icon-button${reduced ? ' is-active' : ''}`}
            onClick={() => setReduced(!reduced)}
            aria-label="Toggle reduced motion"
            data-tooltip={reduced ? 'Reduced motion' : 'Full motion'}
          >
            <Accessibility size={18} />
          </button>
        </div>
      </header>

      {!atlasOpen && (
      <nav className="cloud-chapter-nav" aria-label="Course chapters">
        {COURSE_WORLDS.map((world) => {
          const progress = worldProgress[world.id]
          const active = !atlasOpen && currentWorld === world.id
          return (
            <button
              type="button"
              key={world.id}
              className={`${active ? 'is-current' : ''}${progress === 100 ? ' is-complete' : ''}`}
              style={{ '--world-accent': world.accent, '--world-progress': `${progress}%` } as CSSProperties}
              onClick={() => travelTo(world.id)}
              aria-label={`Open ${world.name}`}
            >
              <span>{progress === 100 ? <Check size={13} /> : world.number}</span>
              <strong>{world.short}</strong>
            </button>
          )
        })}
      </nav>
      )}

      {!atlasOpen && (
        <section className="cloud-chapter-brief" style={{ '--world-accent': activeWorld.accent } as CSSProperties}>
          <div className="cloud-brief-meta">
            <span>Chapter {activeWorld.number} / {COURSE_WORLDS.length.toString().padStart(2, '0')}</span>
            <strong>{worldProgress[currentWorld]}% complete</strong>
          </div>
          <span className="cloud-kicker">{activeWorld.eyebrow}</span>
          <h1>{activeWorld.name}</h1>
          <p>{activeWorld.question}</p>
          <button
            type="button"
            className="cloud-primary-action"
            onClick={continueCourse}
            aria-label={`${continueLabel}: ${primaryNode.title}`}
          >
            {continueLabel}<ArrowRight size={17} />
          </button>
        </section>
      )}

      {!atlasOpen && nearbyNode && mode === 'explore' && (
        <section className="cloud-context-action" aria-label="Nearby field note">
          <span className="cloud-context-icon"><MousePointer2 size={17} /></span>
          <div><small>{nearbyNode.subtitle}</small><strong>{nearbyNode.title}</strong></div>
          <button type="button" onClick={() => openNode(nearbyNode.id)}>
            {promptFor(nearbyNode.id)}<ArrowRight size={15} />
          </button>
        </section>
      )}

      {!atlasOpen && (
        <div className="cloud-world-counter" aria-hidden="true">
          <span>{(activeIndex + 1).toString().padStart(2, '0')}</span>
          <i />
          <span>{COURSE_WORLDS.length.toString().padStart(2, '0')}</span>
        </div>
      )}
    </div>
  )
}

function promptFor(id: NodeId): string {
  const node = NODES[id]
  switch (node.action) {
    case 'talk': return 'Talk'
    case 'open_lesson': return 'Open lesson'
    case 'open_lab': return 'Open experiment'
    case 'open_quiz': return 'Open checkpoint'
    case 'unlock_bridge': return id === 'champion' ? 'Complete course' : 'Continue'
    default: return 'Open'
  }
}
