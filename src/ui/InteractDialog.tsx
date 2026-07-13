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
        who: 'Signal City',
        avatar: '◇',
        text:
          'Start with the foundations: define the recommendation decision, identify users, items and context, then follow signals through retrieval, ranking and serving. The Ranking Sandbox turns those concepts into your first measurable slate.',
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
        who: 'Retrieval Foundry',
        avatar: '◇',
        text:
          'Retrieval Valley maps users and items into the same space. The ANN lesson explains how a live system searches millions of items in milliseconds; the sandbox then exposes the candidates that survive.',
        primary: 'Got it — set my objective',
        showObjective: true,
      }
    case 'world3-gate':
      return {
        who: 'Two-Tower Gate',
        avatar: '⛩️',
        text:
          'The Retrieval Systems checkpoint is complete. Sequential Models is now available: follow ordered behavior into attention, context and next-item prediction.',
        primary: 'Enter Sequential City →',
      }
    case 'astra-city-guide':
      return {
        who: 'Sequence Transit',
        avatar: '◇',
        text:
          'Retrieval found the candidates; this world explains how attention reads a sequence as context. Study the Transformer Tower, then inspect Flash Attention in the lab.',
        primary: 'Got it — set my objective',
        showObjective: true,
      }
    case 'world4-gate':
      return {
        who: 'Policy Bridge',
        avatar: '🌉',
        text:
          'The Sequential Models checkpoint is complete. Decisions and Policies is now available: move from predicted scores to exploration, reward and constrained slates.',
        primary: 'Cross into the Policy Tower →',
      }
    case 'astra-tower-guide':
      return {
        who: 'Decision Tower',
        avatar: '◇',
        text:
          'Ranking gives an order, but a live system must decide, observe reward and adapt. Study policies and bandits at the tower, then build one in the Bandit Lab.',
        primary: 'Got it — set my objective',
        showObjective: true,
      }
    case 'world5-gate':
      return {
        who: 'Garden Gate',
        avatar: '⛩️',
        text:
          'The gate blooms open — you can build a policy that decides and learns. Beyond lies the Ecosystem Garden, the final region, where recommenders shape the very world they observe. Step through.',
        primary: 'Enter the Ecosystem Garden →',
      }
    case 'astra-garden-guide':
      return {
        who: 'Feedback Garden',
        avatar: '◇',
        text:
          'A recommender is not a passive observer: what it shows changes what people do, and that becomes its next training data. Study diversity, debiasing and long-term balance, then grow a healthier slate in the lab.',
        primary: 'Got it — set my objective',
        showObjective: true,
      }
    case 'graduation':
      return {
        who: 'System Synthesis',
        avatar: '◇',
        text:
          'You have studied measurement, retrieval, sequences, policies and feedback as separate decisions. The final region connects them into one production design with explicit stage contracts, lineage, guardrails and failure plans.',
        primary: 'Enter System Synthesis →',
      }
    case 'astra-arena-guide':
      return {
        who: 'Production Review',
        avatar: '◇',
        text:
          'Start with the system synthesis lesson, then review five connected production scenarios. The goal is not to recall isolated terms, but to explain which stage failed, what evidence is missing and which trade-off the decision protects.',
        primary: 'Set the review objective',
        showObjective: true,
      }
    case 'champion':
      return {
        who: 'Course complete',
        avatar: '✓',
        text:
          'You can now describe a recommender as an observable decision system: define its objective, preserve candidates, model intent, choose a policy, evaluate causally and protect long-term ecosystem health. The final review is complete.',
        primary: 'Close course review',
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
              <p style={{ color: 'var(--accent)', marginTop: 10 }}>Current objective: {next.label}</p>
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
