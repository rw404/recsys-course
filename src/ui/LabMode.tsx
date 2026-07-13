import { useMemo, useState } from 'react'
import {
  SANDBOX_ITEMS,
  SLATE_SIZE,
  coverage,
  ndcg,
  recallAtK,
  type SandboxItem,
} from '../data/course'
import { useProgress } from '../state/progress'
import { ExperimentBrief } from './ExperimentBrief'

const PASS_NDCG = 0.85

export function LabMode() {
  const completeNode = useProgress((s) => s.completeNode)
  const closeNode = useProgress((s) => s.closeNode)
  const alreadyDone = useProgress((s) => s.completed['ranking-sandbox'])

  const [slateIds, setSlateIds] = useState<string[]>([])

  const byId = useMemo(() => new Map(SANDBOX_ITEMS.map((i) => [i.id, i])), [])
  const slate = slateIds.map((id) => byId.get(id)!).filter(Boolean)
  const pool = SANDBOX_ITEMS.filter((i) => !slateIds.includes(i.id))

  const allRels = SANDBOX_ITEMS.map((i) => i.rel)
  const nd = slate.length ? ndcg(slate.map((i) => i.rel), allRels) : 0
  const rc = recallAtK(slate, SANDBOX_ITEMS)
  const cov = coverage(slate, SANDBOX_ITEMS)

  const full = slate.length === SLATE_SIZE
  const passed = full && nd >= PASS_NDCG

  const add = (it: SandboxItem) => {
    if (slateIds.length >= SLATE_SIZE || slateIds.includes(it.id)) return
    setSlateIds((s) => [...s, it.id])
  }
  const remove = (id: string) => setSlateIds((s) => s.filter((x) => x !== id))

  const submit = () => {
    completeNode('ranking-sandbox')
    closeNode()
  }

  return (
    <div className="overlay" onClick={closeNode}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="btn ghost close-x" onClick={closeNode}>✕ Esc</button>
        <div className="kicker">Practice · Guided experiment</div>
        <h1>When a high score makes a poor ranking</h1>
        <p className="lead">
          Work with one deliberately imperfect candidate set. The predicted score is what the model
          believes; graded relevance is the held-out outcome used here to evaluate the ordering.
        </p>

        <ExperimentBrief
          question="Can sorting by model score produce a visibly bad top-k?"
          hypothesis="High-scoring zero-relevance ads will damage position-aware quality. Moving truly relevant items upward should improve NDCG even when their predicted score is lower."
          action={`Build an ordered slate of ${SLATE_SIZE}. Select items to add them, then remove and re-add them to change the order.`}
          observe="Compare NDCG with Recall and Coverage. NDCG reacts to position; Recall only checks survival; Coverage checks breadth."
        />

        <div className="lab-grid">
          <div className="pool">
            <h4>Evidence pool · select an item</h4>
            {pool.map((it) => (
              <div className="item" key={it.id} onClick={() => add(it)}>
                <div className="meta">
                  <span className="name">{it.title}</span>
                  <span className="cat">{it.category} · model score {it.score.toFixed(2)}</span>
                </div>
                <span className={`rel r${it.rel}`}>rel {it.rel}</span>
              </div>
            ))}
            {pool.length === 0 && <p className="hint">All items placed.</p>}
          </div>

          <div className="slate">
            <h4>Decision slate · highest exposure first</h4>
            {slate.map((it, i) => (
              <div className="item" key={it.id} onClick={() => remove(it.id)}>
                <span className="slot-idx">{i + 1}</span>
                <div className="meta">
                  <span className="name">{it.title}</span>
                  <span className="cat">{it.category}</span>
                </div>
                <span className={`rel r${it.rel}`}>rel {it.rel}</span>
              </div>
            ))}
            {slate.length === 0 && <p className="hint">Select candidates to create the top-to-bottom recommendation order.</p>}
          </div>
        </div>

        <div className="metrics">
          <Metric k={`NDCG@${SLATE_SIZE}`} v={nd} target={PASS_NDCG} />
          <Metric k="Recall@k" v={rc} />
          <Metric k="Coverage" v={cov} />
        </div>

        <p className={`hint ${passed ? 'ok' : ''}`}>
          {!full
            ? `Next step: add ${SLATE_SIZE - slate.length} more item(s), then compare all three metrics.`
            : passed
            ? 'Observed: relevant items near the top create strong discounted gain. Recall and coverage add context, but they do not replace ordering quality.'
            : `Observed: NDCG@${SLATE_SIZE} is ${nd.toFixed(2)}, below ${PASS_NDCG}. A high predicted score is not ground truth; move graded relevance upward and remove zero-value exposures.`}
        </p>

        <div className="modal-actions">
          <button className="btn ghost" onClick={() => setSlateIds([])}>Reset</button>
          <button className="btn primary" disabled={!passed} onClick={submit} style={{ opacity: passed ? 1 : 0.5 }}>
            {alreadyDone ? 'Save result and close' : 'Complete experiment →'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Metric({ k, v, target }: { k: string; v: number; target?: number }) {
  const pct = Math.round(v * 100)
  const hit = target !== undefined && v >= target
  return (
    <div className="metric" style={target !== undefined ? { borderColor: hit ? 'var(--good)' : undefined } : undefined}>
      <div className="k">{k}</div>
      <div className="v" style={{ color: hit ? 'var(--good)' : undefined }}>{v.toFixed(2)}</div>
      <div className="bar"><i style={{ width: `${pct}%` }} /></div>
    </div>
  )
}
