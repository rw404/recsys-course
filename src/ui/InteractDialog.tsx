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
          'The gate hums open — you have mastered retrieval. Beyond lies Sequential City, where attention and Transformers await. Step through.',
        primary: 'Enter Sequential City →',
      }
    case 'astra-city-guide':
      return {
        who: 'Guide Astra',
        avatar: '🧭',
        text:
          'Welcome to Sequential City! Retrieval found the candidates — now we must understand a whole sequence at once. That is attention. Study it at the Transformer Tower, then see Flash Attention run for real in the lab. Meet me at the tower.',
        primary: 'Got it — set my objective',
        showObjective: true,
      }
    case 'world4-gate':
      return {
        who: 'Policy Bridge',
        avatar: '🌉',
        text:
          'The bridge is lit — you have mastered attention and the Transformer. Beyond lies the Policy Tower, where recommendation becomes sequential decision-making: bandits, policies and slates. Step across.',
        primary: 'Cross into the Policy Tower →',
      }
    case 'astra-tower-guide':
      return {
        who: 'Guide Astra',
        avatar: '🧭',
        text:
          'Welcome to the Policy Tower! Ranking gave us an order — but a live system must DECIDE what to show and learn from what happens. That is a policy. Study bandits at the tower, then build one yourself in the Bandit Lab. Meet me at the tower.',
        primary: 'Got it — set my objective',
        showObjective: true,
      }
    case 'world5-gate':
      return {
        who: 'Garden Gate',
        avatar: '⛩️',
        text:
          'The gate blooms open — you can build a policy that decides and learns. Beyond lies the Ecosystem Garden, where recommenders shape the very world they observe. That region unlocks in the next build. For now, the Policy Tower is complete.',
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
