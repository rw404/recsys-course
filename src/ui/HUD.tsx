import { NODES, NODE_ORDER, useProgress, type NodeId } from '../state/progress'

const STEP_NODES: NodeId[] = ['week01-station', 'ranking-sandbox', 'quiz-gate', 'retrieval-bridge']

export function HUD({ onOpenCatalog }: { onOpenCatalog: () => void }) {
  const next = useProgress((s) => s.nextRequiredAction())
  const nearbyId = useProgress((s) => s.nearbyNodeId)
  const mode = useProgress((s) => s.mode)
  const collected = useProgress((s) => s.collectedArtifacts())
  const total = useProgress((s) => s.totalArtifacts)
  const reduced = useProgress((s) => s.reducedMotion)
  const setReduced = useProgress((s) => s.setReducedMotion)
  const getNodeState = useProgress((s) => s.getNodeState)

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
        {STEP_NODES.map((id, i) => {
          const st = getNodeState(id)
          return (
            <div key={id} style={{ display: 'flex', alignItems: 'center' }}>
              {i > 0 && <div className={`step-link ${getNodeState(STEP_NODES[i - 1]) === 'completed' ? 'done' : ''}`} />}
              <div className={`step ${st}`}>
                <div className="dot">{st === 'completed' ? '✓' : i + 1}</div>
                <div className="cap">{shortTitle(id)}</div>
              </div>
            </div>
          )
        })}
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
            {collected} <span style={{ fontSize: 13, color: 'var(--muted)' }}>/ {total}</span>
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

function shortTitle(id: NodeId): string {
  switch (id) {
    case 'week01-station': return 'Week 01'
    case 'ranking-sandbox': return 'Ranking Sandbox'
    case 'quiz-gate': return 'Quiz Gate'
    case 'retrieval-bridge': return 'Retrieval Bridge'
    default: return NODES[id].title
  }
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
