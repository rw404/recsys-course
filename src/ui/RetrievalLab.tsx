import { Radar, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  RETRIEVAL_ITEMS,
  RETRIEVAL_K,
  meanSimilarity,
  retrievalRecall,
  type RetrievalItem,
} from '../data/course'
import { launchFoundry } from '../state/foundryLaunch'
import { useProgress } from '../state/progress'
import { ExperimentBrief } from './ExperimentBrief'
import { LearningLabFooter, LearningLabShell } from './LearningLabShell'

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
  const openNode = useProgress((s) => s.openNode)
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

  const openCheckpoint = () => {
    completeNode('retrieval-sandbox')
    openNode('negatives-quiz')
  }
  const openFoundry = () => {
    completeNode('retrieval-sandbox')
    closeNode()
    launchFoundry('personalized')
  }

  return (
    <LearningLabShell
      dialogId="retrieval-lab-title"
      world="World 02"
      kicker="Retrieval experiment"
      title="Similarity is a retrieval signal, not the answer"
      lead="These candidates came from one query vector. Similarity is observable at serving time; relevance is held-out evidence shown here so you can diagnose the retriever."
      badge="Controlled ANN fixture"
      badgeNote={`${RETRIEVAL_ITEMS.length} candidates · top-${RETRIEVAL_K} contract`}
      badgeIcon={<Radar size={18} aria-hidden />}
      onClose={closeNode}
      footer={(
        <LearningLabFooter
          ready={passed}
          alreadyDone={alreadyDone}
          pendingLabel={`Preserve at least 3 of 4 relevant items in top-${RETRIEVAL_K}`}
          readyLabel="Retrieval contract and diagnosis complete"
          foundryLabel="Open retriever in Foundry"
          checkpointLabel="Continue to checkpoint"
          onFoundry={openFoundry}
          onCheckpoint={openCheckpoint}
        />
      )}
      className="retrieval-learning-lab"
    >
        <ExperimentBrief
          question="Will the nearest vectors also preserve the most relevant items?"
          hypothesis="Popular decoys sit close to many users. Replacing them with slightly more distant true positives should raise Recall even if Mean similarity falls."
          action={`First run the naive similarity baseline. Then edit the top-${RETRIEVAL_K} set until at least three of four relevant items survive.`}
          observe="Treat Recall as the stage objective and Mean similarity as a model signal. A lower similarity average can represent a better candidate set."
        />

        <div className="lab-grid">
          <div className="pool">
            <h4>ANN evidence · sorted by similarity</h4>
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
            <h4>Candidate contract · top-{RETRIEVAL_K}</h4>
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
            {chosen.length === 0 && <p className="hint">Select candidates to define what the ranker will be allowed to see.</p>}
          </div>
        </div>

        <div className="metrics">
          <Metric k={`Recall@${RETRIEVAL_K}`} v={recall} target={PASS_RECALL} />
          <Metric k="Mean similarity" v={meanSim} />
        </div>

        <p className={`hint ${passed ? 'ok' : ''}`}>
          {!full
            ? `Next step: add ${RETRIEVAL_K - chosen.length} more item(s), then inspect both readouts.`
            : passed
            ? 'Observed: the better retrieval set preserves relevant options for ranking even though it does not maximize raw similarity.'
            : `Observed: Recall@${RETRIEVAL_K} is ${recall.toFixed(2)}, below ${PASS_RECALL}. The nearest set contains popular hard negatives; replace decoys with relevant candidates before ranking.`}
        </p>

        <div className="learning-lab-controls">
          <button className="btn ghost" onClick={takeTopSim} title="What a naive ANN-by-similarity policy would return">
            <Radar size={16} aria-hidden />Run similarity baseline
          </button>
          <button className="btn ghost" onClick={() => setChosenIds([])}>
            <RotateCcw size={16} aria-hidden />Reset selection
          </button>
        </div>
    </LearningLabShell>
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
