import { useMemo, useState } from 'react'
import {
  RETRIEVAL_ITEMS,
  RETRIEVAL_K,
  meanSimilarity,
  retrievalRecall,
  type RetrievalItem,
} from '../data/course'
import { useProgress } from '../state/progress'

const PASS_RECALL = 0.75 // retrieve 3 of the 4 truly-relevant items

/**
 * Retrieval Sandbox — the Week 02 lab. The two-tower model hands you 8 candidates ranked by
 * embedding SIMILARITY to the query user. The trap: similarity is not relevance. Popular /
 * trending items and ads sit close to everyone (high sim, not relevant — hard negatives), while
 * some genuinely relevant items sit a little further out. Assemble a retrieval set of K that
 * maximises recall of the truly-relevant items, not raw similarity.
 */
export function RetrievalLab() {
  const completeNode = useProgress((s) => s.completeNode)
  const closeNode = useProgress((s) => s.closeNode)
  const alreadyDone = useProgress((s) => s.completed['retrieval-sandbox'])

  const [chosenIds, setChosenIds] = useState<string[]>([])

  const byId = useMemo(() => new Map(RETRIEVAL_ITEMS.map((i) => [i.id, i])), [])
  // candidates come pre-sorted by descending similarity, like an ANN index would return them
  const candidates = useMemo(
    () => [...RETRIEVAL_ITEMS].sort((a, b) => b.sim - a.sim),
    []
  )
  const chosen = chosenIds.map((id) => byId.get(id)!).filter(Boolean)

  const recall = retrievalRecall(chosen, RETRIEVAL_ITEMS)
  const meanSim = meanSimilarity(chosen)

  const full = chosen.length === RETRIEVAL_K
  const passed = full && recall >= PASS_RECALL

  const toggle = (it: RetrievalItem) => {
    setChosenIds((s) => {
      if (s.includes(it.id)) return s.filter((x) => x !== it.id)
      if (s.length >= RETRIEVAL_K) return s
      return [...s, it.id]
    })
  }

  const takeTopSim = () =>
    setChosenIds(candidates.slice(0, RETRIEVAL_K).map((i) => i.id))

  const submit = () => {
    completeNode('retrieval-sandbox')
    closeNode()
  }

  return (
    <div className="overlay" onClick={closeNode}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="btn ghost close-x" onClick={closeNode}>✕ Esc</button>
        <div className="kicker">Lab Mode · Interactive</div>
        <h1>Retrieval Sandbox</h1>
        <p className="lead">
          The two-tower model returns these {RETRIEVAL_ITEMS.length} candidates, sorted by embedding
          similarity to the query user. But similarity is not relevance — trending items and ads
          crowd the top (hard negatives). Pick the {RETRIEVAL_K} that maximise <b>recall</b> of the
          truly-relevant items.
        </p>

        <div className="lab-grid">
          <div className="pool">
            <h4>ANN candidates — click to add / remove (sorted by similarity)</h4>
            {candidates.map((it) => {
              const on = chosenIds.includes(it.id)
              return (
                <div className={`item ${on ? 'picked' : ''}`} key={it.id} onClick={() => toggle(it)}>
                  <div className="meta">
                    <span className="name">{it.title}</span>
                    <span className="cat">{it.category} · sim {it.sim.toFixed(2)}</span>
                  </div>
                  <span className={`rel ${it.relevant ? 'r3' : 'r0'}`}>
                    {it.relevant ? 'relevant' : 'not rel.'}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="slate">
            <h4>Retrieval set (top-{RETRIEVAL_K})</h4>
            {chosen.map((it, i) => (
              <div className="item" key={it.id} onClick={() => toggle(it)}>
                <span className="slot-idx">{i + 1}</span>
                <div className="meta">
                  <span className="name">{it.title}</span>
                  <span className="cat">{it.category} · sim {it.sim.toFixed(2)}</span>
                </div>
                <span className={`rel ${it.relevant ? 'r3' : 'r0'}`}>
                  {it.relevant ? 'relevant' : 'not rel.'}
                </span>
              </div>
            ))}
            {chosen.length === 0 && <p className="hint">Click candidates on the left to retrieve them.</p>}
          </div>
        </div>

        <div className="metrics">
          <Metric k={`Recall@${RETRIEVAL_K}`} v={recall} target={PASS_RECALL} />
          <Metric k="Mean similarity" v={meanSim} />
        </div>

        <p className={`hint ${passed ? 'ok' : ''}`}>
          {!full
            ? `Add ${RETRIEVAL_K - chosen.length} more item(s) to complete the retrieval set.`
            : passed
            ? '✓ You retrieved the relevant items over the popular decoys. The Vector Core is ready.'
            : `Recall@${RETRIEVAL_K} is ${recall.toFixed(2)} — below ${PASS_RECALL}. The highest-similarity items include ads and trending decoys; swap them for the genuinely relevant ones.`}
        </p>

        <div className="modal-actions">
          <button className="btn ghost" onClick={takeTopSim} title="What a naive ANN-by-similarity policy would return">
            Take top-{RETRIEVAL_K} by similarity
          </button>
          <button className="btn ghost" onClick={() => setChosenIds([])}>Reset</button>
          <button className="btn primary" disabled={!passed} onClick={submit} style={{ opacity: passed ? 1 : 0.5 }}>
            {alreadyDone ? 'Save set — close' : 'Forge Vector Core →'}
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
