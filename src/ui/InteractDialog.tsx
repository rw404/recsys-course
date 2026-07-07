import { NODES, useProgress, type NodeId } from '../state/progress'

export function InteractDialog({ nodeId }: { nodeId: NodeId }) {
  const node = NODES[nodeId]
  const completeNode = useProgress((s) => s.completeNode)
  const closeNode = useProgress((s) => s.closeNode)
  const next = useProgress((s) => s.nextRequiredAction())

  const isBridge = nodeId === 'retrieval-bridge'

  const lines = isBridge
    ? {
        who: 'Retrieval Bridge',
        avatar: '🌉',
        text:
          'The planks are lit. Beyond this bridge lies Retrieval Valley — two-tower models, ANN search and negative sampling. That region unlocks in the next build. For now, Foundations Camp is complete: you have learned to judge an ordering.',
      }
    : {
        who: node.title,
        avatar: '🧭',
        text:
          'Welcome to Foundations Camp, porter. Ranking is not about picking good items — it is about the order you place them in. Head to the Week 01 station to learn the metrics that judge a slate, then prove it in the Ranking Sandbox.',
      }

  const primaryLabel = isBridge ? 'Look toward the valley' : 'Got it — set my objective'

  const onPrimary = () => {
    if (!isBridge) completeNode('npc-guide')
    else completeNode('retrieval-bridge')
    closeNode()
  }

  return (
    <div className="overlay" onClick={closeNode}>
      <div className="modal narrow" onClick={(e) => e.stopPropagation()}>
        <button className="btn ghost close-x" onClick={closeNode}>✕ Esc</button>
        <div className="dialog">
          <div className="avatar">{lines.avatar}</div>
          <div>
            <div className="who">{lines.who}</div>
            <p>{lines.text}</p>
            {!isBridge && (
              <p style={{ color: 'var(--accent)', marginTop: 10 }}>
                Objective: {next.label}
              </p>
            )}
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn primary" onClick={onPrimary}>{primaryLabel}</button>
        </div>
      </div>
    </div>
  )
}
