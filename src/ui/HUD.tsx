import { NODES, useProgress, type NodeId, type WorldId } from '../state/progress'

/** Static course map; live state (done/active/locked) is derived from progress below. */
const WORLD_MAP: { n: string; id: WorldId | null; name: string }[] = [
  { n: '01', id: 'foundations-camp', name: 'Foundations Camp' },
  { n: '02', id: 'retrieval-valley', name: 'Retrieval Valley' },
  { n: '03', id: 'sequential-city', name: 'Sequential City' },
  { n: '04', id: 'policy-tower', name: 'Policy Tower' },
  { n: '05', id: 'ecosystem-garden', name: 'Ecosystem Garden' },
  { n: '06', id: 'final-arena', name: 'Final Arena' },
]

const WORLD_BADGE: Record<WorldId, { kicker: string; name: string }> = {
  'foundations-camp': { kicker: 'World 01', name: 'Foundations Camp' },
  'retrieval-valley': { kicker: 'World 02', name: 'Retrieval Valley' },
  'sequential-city': { kicker: 'World 03', name: 'Sequential City' },
  'policy-tower': { kicker: 'World 04', name: 'Policy Tower' },
  'ecosystem-garden': { kicker: 'World 05', name: 'Ecosystem Garden' },
  'final-arena': { kicker: 'World 06', name: 'Final Arena' },
}

// Reference shows the full-course artifact goal, not just this slice's four.
const COURSE_ARTIFACTS = 24

export function HUD({ onOpenCatalog }: { onOpenCatalog: () => void }) {
  const next = useProgress((s) => s.nextRequiredAction())
  const nearbyId = useProgress((s) => s.nearbyNodeId)
  const mode = useProgress((s) => s.mode)
  const collected = useProgress((s) => s.collectedArtifacts())
  const reduced = useProgress((s) => s.reducedMotion)
  const setReduced = useProgress((s) => s.setReducedMotion)
  const currentWorld = useProgress((s) => s.currentWorld)
  const campDone = useProgress((s) => s.completed['retrieval-bridge'])
  const valleyDone = useProgress((s) => s.completed['world3-gate'])
  const cityDone = useProgress((s) => s.completed['world4-gate'])
  const towerDone = useProgress((s) => s.completed['world5-gate'])
  const gardenDone = useProgress((s) => s.completed['graduation'])
  const courseDone = useProgress((s) => s.completed['champion'])
  const atlasOpen = useProgress((s) => s.atlasOpen)
  const toggleAtlas = useProgress((s) => s.toggleAtlas)

  const worlds = WORLD_MAP.map((w) => {
    let state: 'active' | 'locked' | 'done' = 'locked'
    if (w.id === 'foundations-camp') state = campDone ? 'done' : 'active'
    else if (w.id === 'retrieval-valley') {
      state = valleyDone ? 'done' : currentWorld === 'retrieval-valley' ? 'active' : campDone ? 'active' : 'locked'
    } else if (w.id === 'sequential-city') {
      state = cityDone ? 'done' : currentWorld === 'sequential-city' ? 'active' : valleyDone ? 'active' : 'locked'
    } else if (w.id === 'policy-tower') {
      state = towerDone ? 'done' : currentWorld === 'policy-tower' ? 'active' : cityDone ? 'active' : 'locked'
    } else if (w.id === 'ecosystem-garden') {
      state = gardenDone ? 'done' : currentWorld === 'ecosystem-garden' ? 'active' : towerDone ? 'active' : 'locked'
    } else if (w.id === 'final-arena') {
      state = courseDone ? 'done' : currentWorld === 'final-arena' ? 'active' : gardenDone ? 'active' : 'locked'
    }
    return { ...w, state }
  })
  const badge = atlasOpen ? { kicker: 'Overview', name: 'Course Atlas' } : WORLD_BADGE[currentWorld]

  const showPressE = mode === 'explore' && nearbyId !== null

  return (
    <div className="hud">
      <div className="objective panel">
        <div className="gem" />
        <div>
          <div className="label">{atlasOpen ? 'Overview' : 'Next objective'}</div>
          <div className="value">{atlasOpen ? 'Course Atlas — all six regions' : next.label}</div>
        </div>
      </div>

      <div className="progress-track panel">
        <span className="title">Course Progress</span>
        {worlds.map((w, i) => (
          <div key={w.n} style={{ display: 'flex', alignItems: 'center' }}>
            {i > 0 && <div className={`step-link ${w.state === 'done' ? 'done' : ''}`} />}
            <div className={`wstep ${w.state}`}>
              <div className="wdot" />
              <div className="wcap">
                <span className="wnum">{w.n}</span> {w.name}
              </div>
            </div>
          </div>
        ))}
        <div className="crown" title="Course mastery">♛</div>
      </div>

      <div className="world-badge panel">
        <div className="wb-text">
          <div className="wb-kicker">{badge.kicker}</div>
          <div className="wb-name">{badge.name}</div>
        </div>
        <div className="wb-emblem" />
      </div>

      <div className="hud-buttons">
        <button className={`btn ${atlasOpen ? 'primary' : 'ghost'}`} onClick={toggleAtlas} title="Toggle the combined overview map of all six regions">
          {atlasOpen ? '✕ Exit Atlas' : '🗺 Atlas'}
        </button>
        <button className="btn ghost" onClick={() => setReduced(!reduced)} title="Toggle cinematic camera motion">
          {reduced ? 'Motion: reduced' : 'Motion: on'}
        </button>
        <button className="btn ghost" onClick={onOpenCatalog}>
          Catalog
        </button>
      </div>

      <div className="artifacts panel">
        <div className="gem" />
        <div>
          <div className="n">
            {collected} <span style={{ fontSize: 13, color: 'var(--muted)' }}>/ {COURSE_ARTIFACTS}</span>
          </div>
          <div className="sub">Artifacts Collected</div>
          {courseDone && <div className="course-complete">Course Completed! ✓</div>}
        </div>
      </div>

      <div className="controls panel">
        <span className="grp"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move</span>
        <span className="grp"><kbd>🖱</kbd> Click to move</span>
        <span className="grp"><kbd>Shift</kbd> Run</span>
        {!atlasOpen && <span className="grp"><kbd>Space</kbd> Jump</span>}
        {!atlasOpen && <span className="grp"><kbd>E</kbd> Interact</span>}
        <span className="grp"><kbd>C</kbd> Catalog</span>
      </div>

      {showPressE && nearbyId && (
        <div className="press-e panel">
          <kbd>E</kbd>
          <span>{promptFor(nearbyId)}</span>
        </div>
      )}
    </div>
  )
}

function promptFor(id: NodeId): string {
  const node = NODES[id]
  switch (node.action) {
    case 'talk': return `Talk to ${node.title}`
    case 'open_lesson': return `Open lesson · ${node.title}`
    case 'open_lab': return `Enter lab · ${node.title}`
    case 'open_quiz': return `Attempt · ${node.title}`
    case 'unlock_bridge':
      return id === 'champion'
        ? 'Claim the champion’s crown'
        : id === 'graduation'
        ? 'Enter the Final Arena'
        : id === 'world5-gate'
        ? 'Pass the Garden Gate'
        : id === 'world4-gate'
        ? 'Cross the Policy Bridge'
        : id === 'world3-gate'
        ? 'Pass the Two-Tower Gate'
        : 'Cross to Retrieval Valley'
    default: return 'Interact'
  }
}
