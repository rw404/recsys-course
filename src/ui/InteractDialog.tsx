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
          'The gate blooms open — you can build a policy that decides and learns. Beyond lies the Ecosystem Garden, the final region, where recommenders shape the very world they observe. Step through.',
        primary: 'Enter the Ecosystem Garden →',
      }
    case 'astra-garden-guide':
      return {
        who: 'Guide Astra',
        avatar: '🧭',
        text:
          'Welcome to the Ecosystem Garden — the last region. A recommender is not a passive observer: what it shows changes what people do, and that becomes its next lesson. Keep the garden alive with diversity, debiasing and long-term balance. Study it with me, then grow variety in the Diversity Lab.',
        primary: 'Got it — set my objective',
        showObjective: true,
      }
    case 'graduation':
      return {
        who: 'Final Arena Gate',
        avatar: '⛩️',
        text:
          'You have crossed every region — metrics, retrieval, attention, policies and a living ecosystem. Five artifacts forged, the whole pipeline walked. One trial remains: the Final Arena, where you prove your mastery before the Hall of Champions. Step through.',
        primary: 'Enter the Final Arena →',
      }
    case 'astra-arena-guide':
      return {
        who: 'Guide Astra',
        avatar: '🧭',
        text:
          'This is it — the Final Arena. No new theory, only proof. The Capstone draws one question from every region you have walked. Study my closing recap, then step into the arena and climb the Hall of Mastery. Make it count, Champion.',
        primary: 'Got it — set my objective',
        showObjective: true,
      }
    case 'champion':
      return {
        who: 'Hall of Champions',
        avatar: '🏆',
        text:
          'You did it. Metrics, retrieval, attention, policies, ecosystems — and a capstone to prove it all. The whole recommender pipeline, walked and mastered. Your name belongs in the Hall of Champions now. The course is complete. Congratulations, porter.',
        primary: '★ Complete the course',
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
