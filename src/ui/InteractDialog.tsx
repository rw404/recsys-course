import { NODES, useProgress, type NodeId } from '../state/progress'

interface DialogSpec {
  who: string
  avatar: string
  text: string
  primary: string
  /** node to complete when the primary button is pressed (defaults to the dialog's node) */
  completes?: NodeId
  showObjective?: boolean
}

function specFor(nodeId: NodeId): DialogSpec {
  switch (nodeId) {
    case 'npc-guide':
      return {
        who: 'Metric Keeper',
        avatar: '🧭',
        text:
          'Welcome to Foundations Camp, porter. Ranking is not about picking good items — it is about the order you place them in. Head to the Week 01 station to learn the metrics that judge a slate, then prove it in the Ranking Sandbox.',
        primary: 'Got it — set my objective',
        showObjective: true,
      }
    case 'retrieval-bridge':
      return {
        who: 'Retrieval Bridge',
        avatar: '🌉',
        text:
          'The planks are lit. Beyond lies Retrieval Valley — two-tower models, ANN search and negative sampling. Step across and the valley opens before you.',
        primary: 'Cross into Retrieval Valley →',
      }
    case 'ann-guide':
      return {
        who: 'Vector Smith',
        avatar: '🥽',
        text:
          'You made it across! This is Retrieval Valley. See the two glowing clouds? Users on the left, items on the right — both embedded into the SAME space. My ANN Lab teaches how we search millions of items in milliseconds. Study the lesson, then prove it in the Retrieval Sandbox.',
        primary: 'Got it — set my objective',
        showObjective: true,
      }
    case 'world3-gate':
      return {
        who: 'Two-Tower Gate',
        avatar: '⛩️',
        text:
          'The gate hums open — you have mastered retrieval. Ahead the path climbs toward the Flash Attention Lab, where sequences and attention await. That region unlocks in the next build. For now, Retrieval Valley is complete.',
        primary: 'Look toward the next region',
      }
    default:
      return { who: NODES[nodeId].title, avatar: '•', text: '', primary: 'Close' }
  }
}

export function InteractDialog({ nodeId }: { nodeId: NodeId }) {
  const completeNode = useProgress((s) => s.completeNode)
  const closeNode = useProgress((s) => s.closeNode)
  const next = useProgress((s) => s.nextRequiredAction())
  const spec = specFor(nodeId)

  const onPrimary = () => {
    completeNode(spec.completes ?? nodeId)
    closeNode()
  }

  return (
    <div className="overlay" onClick={closeNode}>
      <div className="modal narrow" onClick={(e) => e.stopPropagation()}>
        <button className="btn ghost close-x" onClick={closeNode}>✕ Esc</button>
        <div className="dialog">
          <div className="avatar">{spec.avatar}</div>
          <div>
            <div className="who">{spec.who}</div>
            <p>{spec.text}</p>
            {spec.showObjective && (
              <p style={{ color: 'var(--accent)', marginTop: 10 }}>Objective: {next.label}</p>
            )}
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn primary" onClick={onPrimary}>{spec.primary}</button>
        </div>
      </div>
    </div>
  )
}
