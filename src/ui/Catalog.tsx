import { ArrowRight, Check, LockKeyhole, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { NODE_ORDER, NODES, useProgress, type NodeId, type ProgressNodeState, type WorldId } from '../state/progress'

const WORLDS: { id: WorldId; n: string; name: string }[] = [
  { id: 'foundations-camp', n: '01', name: 'Foundations' },
  { id: 'retrieval-valley', n: '02', name: 'Retrieval' },
  { id: 'sequential-city', n: '03', name: 'Sequences' },
  { id: 'policy-tower', n: '04', name: 'Policy' },
  { id: 'ecosystem-garden', n: '05', name: 'Ecosystem' },
  { id: 'final-arena', n: '06', name: 'Final' },
]

export function Catalog({ onClose }: { onClose: () => void }) {
  const getNodeState = useProgress((s) => s.getNodeState)
  const openNode = useProgress((s) => s.openNode)
  const currentWorld = useProgress((s) => s.currentWorld)
  const completed = useProgress((s) => s.completed)
  const next = useProgress((s) => s.nextRequiredAction())
  const [selectedWorld, setSelectedWorld] = useState<WorldId>(() => next.nodeId ? NODES[next.nodeId].worldId : currentWorld)

  const nodes = useMemo(
    () => NODE_ORDER.filter((id) => NODES[id].worldId === selectedWorld),
    [selectedWorld],
  )
  const completedCount = nodes.filter((id) => completed[id]).length
  const progress = Math.round((completedCount / Math.max(nodes.length, 1)) * 100)

  const enter = (id: NodeId) => {
    openNode(id)
    onClose()
  }

  return (
    <div className="overlay catalog-overlay" onClick={onClose}>
      <section className="modal catalog-modal" onClick={(event) => event.stopPropagation()} aria-labelledby="catalog-title">
        <header className="catalog-header">
          <div>
            <span className="kicker">Course index</span>
            <h1 id="catalog-title">Recommendation systems</h1>
            <p className="lead">Lessons, experiments and checkpoints in one direct route.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close course index"><X size={18} /></button>
        </header>

        <nav className="catalog-tabs" aria-label="Course worlds">
          {WORLDS.map((world) => (
            <button
              type="button"
              key={world.id}
              className={selectedWorld === world.id ? 'is-active' : ''}
              onClick={() => setSelectedWorld(world.id)}
            >
              <span>{world.n}</span><strong>{world.name}</strong>
            </button>
          ))}
        </nav>

        <div className="catalog-summary">
          <span>{WORLDS.find((world) => world.id === selectedWorld)?.name}</span>
          <div><i style={{ width: `${progress}%` }} /><small>{completedCount} / {nodes.length} complete</small></div>
        </div>

        <div className="catalog-list">
          {nodes.map((id, index) => {
            const node = NODES[id]
            const state = getNodeState(id)
            const canEnter = state !== 'locked_for_credit'
            return (
              <article className={`cat-row state-${state}`} key={id}>
                <span className="catalog-node-index">{String(index + 1).padStart(2, '0')}</span>
                <div className="catalog-node-copy">
                  <strong>{node.title}</strong>
                  <small>{node.subtitle} · {node.kind}</small>
                </div>
                <span className={`catalog-state badge-${state}`}>
                  {state === 'completed' && <Check size={13} />}
                  {state === 'locked_for_credit' && <LockKeyhole size={12} />}
                  {stateLabel(state)}
                </span>
                <button
                  type="button"
                  className="catalog-enter"
                  disabled={!canEnter}
                  onClick={() => canEnter && enter(id)}
                  aria-label={`${state === 'completed' ? 'Review' : 'Open'} ${node.title}`}
                >
                  <span>{state === 'completed' ? 'Review' : 'Open'}</span><ArrowRight size={15} />
                </button>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function stateLabel(state: ProgressNodeState): string {
  switch (state) {
    case 'completed': return 'Complete'
    case 'next_required': return 'Next'
    case 'locked_for_credit': return 'Locked'
    case 'in_progress': return 'In progress'
    default: return 'Available'
  }
}
