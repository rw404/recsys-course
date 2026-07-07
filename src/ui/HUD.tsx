import { NODES, useProgress, type NodeId } from '../state/progress'

/**
 * The world map of the whole course. The vertical slice plays inside World 01 (Foundations Camp);
 * later worlds are shown locked so the HUD reads like the reference concept art.
 */
const WORLDS: { n: string; name: string; state: 'active' | 'locked' | 'done' }[] = [
  { n: '01', name: 'Foundations Camp', state: 'active' },
  { n: '02', name: 'Flash Attention Lab', state: 'locked' },
  { n: '03', name: 'Retrieval Bridge', state: 'locked' },
  { n: '04', name: 'Policy Tower', state: 'locked' },
  { n: '05', name: 'Ecosystem Garden', state: 'locked' },
]

// Reference shows the full-course artifact goal, not just this slice's four.
const COURSE_ARTIFACTS = 24

export function HUD({ onOpenCatalog }: { onOpenCatalog: () => void }) {
  const next = useProgress((s) => s.nextRequiredAction())
  const nearbyId = useProgress((s) => s.nearbyNodeId)
  const mode = useProgress((s) => s.mode)
  const collected = useProgress((s) => s.collectedArtifacts())
  const reduced = useProgress((s) => s.reducedMotion)
  const setReduced = useProgress((s) => s.setReducedMotion)

  const showPressE = mode === 'explore' && nearbyId !== null

  return (
    <div className="hud">
      <div className="objective panel">
        <div className="gem" />
        <div>
          <div className="label">Next objective</div>
          <div className="value">{next.label}</div>
        </div>
      </div>

      <div className="progress-track panel">
        <span className="title">Course Progress</span>
        {WORLDS.map((w, i) => (
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
          <div className="wb-kicker">World 01</div>
          <div className="wb-name">Foundations Camp</div>
        </div>
        <div className="wb-emblem" />
      </div>

      <div className="hud-buttons">
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
        </div>
      </div>

      <div className="controls panel">
        <span className="grp"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move</span>
        <span className="grp"><kbd>Shift</kbd> Run</span>
        <span className="grp"><kbd>E</kbd> Interact</span>
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
    case 'unlock_bridge': return `Cross to Retrieval Valley`
    default: return 'Interact'
  }
}
