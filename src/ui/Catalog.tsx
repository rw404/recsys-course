import { NODE_ORDER, NODES, useProgress, type NodeId, type ProgressNodeState } from '../state/progress'

/**
 * Accessibility / no-3D fallback: a flat, keyboard-navigable list of every course node,
 * its state, and a way to jump straight into any available action.
 */
export function Catalog({ onClose }: { onClose: () => void }) {
  const getNodeState = useProgress((s) => s.getNodeState)
  const openNode = useProgress((s) => s.openNode)
  const next = useProgress((s) => s.nextRequiredAction())

  const enter = (id: NodeId) => {
    openNode(id)
    onClose()
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="btn ghost close-x" onClick={onClose}>✕ Close</button>
        <div className="kicker">Catalog · No-3D fallback</div>
        <h1>Course Catalog — All Regions</h1>
        <p className="lead">
          Every station across all five regions maps to a real course action. Next up: <b>{next.label}</b>.
          You can enter any available station here without walking.
        </p>

        <div className="catalog-list">
          {NODE_ORDER.map((id) => {
            const node = NODES[id]
            const st = getNodeState(id)
            const canEnter = st !== 'locked_for_credit' && st !== 'completed'
            return (
              <div className="cat-row" key={id}>
                <div>
                  <div style={{ fontWeight: 600 }}>{node.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {node.subtitle} · {node.kind}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span className={`state badge-${st}`}>{stateLabel(st)}</span>
                  <button
                    className="btn"
                    disabled={!canEnter}
                    style={{ opacity: canEnter ? 1 : 0.4 }}
                    onClick={() => canEnter && enter(id)}
                  >
                    {st === 'completed' ? 'Done' : node.kind === 'npc' ? 'Talk' : 'Enter'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function stateLabel(st: ProgressNodeState): string {
  switch (st) {
    case 'completed': return 'Completed'
    case 'next_required': return 'Next required'
    case 'locked_for_credit': return 'Locked'
    case 'in_progress': return 'In progress'
    default: return 'Available'
  }
}
