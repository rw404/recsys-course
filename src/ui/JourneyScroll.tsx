import { useEffect, useLayoutEffect, useMemo, useRef, type CSSProperties } from 'react'
import { ArrowRight, Check, ChevronDown, Network } from 'lucide-react'
import { COURSE_WORLDS, type CourseWorldDefinition } from '../data/worlds'
import { NODES, useProgress, type WorldId } from '../state/progress'

const WORLD_TOPICS: Record<WorldId, [string, string, string]> = {
  'foundations-camp': ['Behavior signals', 'Baselines', 'Ranking metrics'],
  'retrieval-valley': ['Embeddings', 'Two-tower models', 'ANN search'],
  'sequential-city': ['Session intent', 'Attention', 'Transformers'],
  'policy-tower': ['Scoring', 'Exploration', 'Long-term reward'],
  'ecosystem-garden': ['Diversity', 'Feedback loops', 'Healthy ecosystems'],
  'final-arena': ['System design', 'Evaluation', 'Production trade-offs'],
}

export function JourneyScroll({ onOpenBuilder }: { onOpenBuilder: () => void }) {
  const scroller = useRef<HTMLDivElement>(null)
  const raf = useRef(0)
  const leavingJourney = useRef(false)
  const currentWorld = useProgress((state) => state.currentWorld)
  const reducedMotion = useProgress((state) => state.reducedMotion)
  const completed = useProgress((state) => state.completed)
  const enterWorld = useProgress((state) => state.enterWorld)
  const travelTo = useProgress((state) => state.travelTo)

  const worldProgress = useMemo(() => Object.fromEntries(
    COURSE_WORLDS.map((world) => {
      const nodes = Object.values(NODES).filter((node) => node.worldId === world.id && node.kind !== 'npc')
      const done = nodes.filter((node) => completed[node.id]).length
      return [world.id, Math.round((done / Math.max(nodes.length, 1)) * 100)]
    }),
  ) as Record<WorldId, number>, [completed])

  const countedNodes = useMemo(() => Object.values(NODES).filter((node) => node.kind !== 'npc'), [])
  const courseDone = countedNodes.filter((node) => completed[node.id]).length
  const courseProgress = Math.round((courseDone / Math.max(1, countedNodes.length)) * 100)
  const activeIndex = COURSE_WORLDS.findIndex((world) => world.id === currentWorld)

  useLayoutEffect(() => {
    const element = scroller.current
    if (!element) return
    const index = COURSE_WORLDS.findIndex((world) => world.id === useProgress.getState().currentWorld)
    if (index > 0) {
      element.scrollTop = index * element.clientHeight
    }
  }, [])

  useEffect(() => {
    const element = scroller.current
    if (!element) return

    const updateActiveWorld = () => {
      raf.current = 0
      if (leavingJourney.current) return
      const viewport = Math.max(1, element.clientHeight)
      const index = Math.max(0, Math.min(
        COURSE_WORLDS.length - 1,
        Math.round(element.scrollTop / viewport),
      ))
      const world = COURSE_WORLDS[index]
      if (useProgress.getState().currentWorld !== world.id) enterWorld(world.id)
    }

    const onScroll = () => {
      if (!raf.current) raf.current = window.requestAnimationFrame(updateActiveWorld)
    }

    element.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      element.removeEventListener('scroll', onScroll)
      if (raf.current) window.cancelAnimationFrame(raf.current)
    }
  }, [enterWorld])

  const scrollToWorld = (world: CourseWorldDefinition) => {
    const index = COURSE_WORLDS.findIndex((candidate) => candidate.id === world.id)
    enterWorld(world.id)
    scroller.current?.scrollTo({
      top: index * scroller.current.clientHeight,
      behavior: reducedMotion ? 'auto' : 'smooth',
    })
  }

  const openWorld = (world: CourseWorldDefinition) => {
    leavingJourney.current = true
    if (raf.current) {
      window.cancelAnimationFrame(raf.current)
      raf.current = 0
    }
    travelTo(world.id)
  }

  return (
    <div className="journey-shell" style={{ '--journey-progress': `${courseProgress}%` } as CSSProperties}>
      <div
        ref={scroller}
        className="journey-scroller"
        aria-label="Recommender systems journey"
        data-active-index={activeIndex}
      >
        {COURSE_WORLDS.map((world, index) => (
          <section
            key={world.id}
            className={`journey-stop${currentWorld === world.id ? ' is-active' : ''}${index === 0 ? ' is-intro' : ''}`}
            style={{ '--world-accent': world.accent, '--world-surface': world.surface } as CSSProperties}
            aria-labelledby={`journey-title-${world.id}`}
          >
            <div className="journey-copy">
              <span className="journey-kicker">
                {index === 0 ? 'Interactive 3D course' : `World ${world.number} · ${world.eyebrow}`}
              </span>
              {index === 0 ? (
                <h1 id={`journey-title-${world.id}`}>Follow a recommendation from signal to system</h1>
              ) : (
                <h2 id={`journey-title-${world.id}`}>{world.name}</h2>
              )}
              <p>{index === 0
                ? 'Explore each stage of a recommender, then assemble and test your own.'
                : world.summary}</p>
              <div className="journey-topics" aria-label="Topics in this world">
                {WORLD_TOPICS[world.id].map((topic) => <span key={topic}>{topic}</span>)}
              </div>
              <button type="button" className="journey-enter" onClick={() => openWorld(world)}>
                <span>{index === 0 ? 'Begin the journey' : 'Enter this world'}</span>
                <ArrowRight size={17} />
              </button>
            </div>

            <div className="journey-stage-mark" aria-hidden="true">
              <strong>{world.number}</strong>
              <span>{world.short}</span>
            </div>
          </section>
        ))}
      </div>

      <aside className="journey-route" aria-label="Journey map">
        <header>
          <span>Journey map</span>
          <strong>{courseProgress}%</strong>
        </header>
        <i className="journey-route-progress"><b /></i>
        <ol>
          {COURSE_WORLDS.map((world) => {
            const active = currentWorld === world.id
            const complete = worldProgress[world.id] === 100
            return (
              <li key={world.id}>
                <button
                  type="button"
                  className={`${active ? 'is-current' : ''}${complete ? ' is-complete' : ''}`}
                  style={{ '--world-accent': world.accent } as CSSProperties}
                  onClick={() => scrollToWorld(world)}
                  aria-current={active ? 'step' : undefined}
                  aria-label={`Go to ${world.name}`}
                >
                  <span>{complete ? <Check size={11} /> : world.number}</span>
                  <strong>{world.short}</strong>
                  <em>{worldProgress[world.id]}%</em>
                </button>
              </li>
            )
          })}
        </ol>
        <button type="button" className="journey-foundry-link" onClick={onOpenBuilder}>
          <Network size={16} />
          <span>System Foundry</span>
          <ArrowRight size={14} />
        </button>
      </aside>

      <button
        type="button"
        className="journey-next"
        onClick={() => scrollToWorld(COURSE_WORLDS[Math.min(COURSE_WORLDS.length - 1, activeIndex + 1)])}
        aria-label="Go to next world"
        disabled={activeIndex === COURSE_WORLDS.length - 1}
      >
        <ChevronDown size={20} />
      </button>
    </div>
  )
}
