import { useMemo, useState } from 'react'
import {
  DIVERSITY_ITEMS,
  DIVERSITY_K,
  REL_FLOOR,
  DIV_FLOOR,
  mmrSelect,
  slateRelevance,
  slateDiversity,
  ecosystemHealth,
  diversityPass,
  type DiversityItem,
} from '../data/course'
import { useProgress } from '../state/progress'

const CAT_COLOR: Record<string, string> = {
  News: '#ff6bd0',
  Music: '#6bd0ff',
  Sports: '#ffd36b',
  Art: '#8affc9',
  Food: '#c08bff',
}

/**
 * Diversity Lab — the World-05 lab. Build a feed of {DIVERSITY_K} items. The high-relevance items
 * are all "News", so grabbing the most relevant items makes a filter bubble (low diversity); grabbing
 * one of every category tanks relevance. Only a BALANCED slate clears both the relevance and the
 * diversity floor — the teaching point: variety and relevance together keep the ecosystem healthy.
 * Clear both floors to forge the Diversity Seed.
 */
export function DiversityLab() {
  const completeNode = useProgress((s) => s.completeNode)
  const closeNode = useProgress((s) => s.closeNode)
  const alreadyDone = useProgress((s) => s.completed['diversity-lab'])

  const [chosenIds, setChosenIds] = useState<string[]>([])
  const byId = useMemo(() => new Map(DIVERSITY_ITEMS.map((i) => [i.id, i])), [])
  const pool = useMemo(() => [...DIVERSITY_ITEMS].sort((a, b) => b.relevance - a.relevance), [])
  const chosen = chosenIds.map((id) => byId.get(id)!).filter(Boolean)

  const rel = chosen.length ? slateRelevance(chosen) : 0
  const div = chosen.length ? slateDiversity(chosen) : 0
  const health = chosen.length ? ecosystemHealth(chosen) : 0
  const full = chosen.length === DIVERSITY_K
  const passed = full && diversityPass(chosen)

  const toggle = (it: DiversityItem) => {
    setChosenIds((s) => {
      if (s.includes(it.id)) return s.filter((x) => x !== it.id)
      if (s.length >= DIVERSITY_K) return s
      return [...s, it.id]
    })
  }
  const takeTopRel = () => setChosenIds(pool.slice(0, DIVERSITY_K).map((i) => i.id))
  const autoBalance = () => setChosenIds(mmrSelect(0.6).map((i) => i.id))

  const submit = () => {
    completeNode('diversity-lab')
    closeNode()
  }

  return (
    <div className="overlay" onClick={closeNode}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="btn ghost close-x" onClick={closeNode}>✕ Esc</button>
        <div className="kicker">Lab Mode · Interactive</div>
        <h1>Diversity Lab</h1>
        <p className="lead">
          Build a feed of {DIVERSITY_K}. The most <b>relevant</b> items are all “News” — pick only those
          and you get a filter bubble; pick one of everything and relevance collapses. Clear <b>both</b>
          {' '}the relevance and the diversity floor — balance keeps the ecosystem healthy.
        </p>

        <div className="lab-grid">
          <div className="pool">
            <h4>Candidate items — click to add / remove</h4>
            {pool.map((it) => {
              const on = chosenIds.includes(it.id)
              return (
                <div className={`item ${on ? 'picked' : ''}`} key={it.id} onClick={() => toggle(it)}>
                  <div className="meta">
                    <span className="name">{it.label}</span>
                    <span className="cat">
                      <i className="cat-dot" style={{ background: CAT_COLOR[it.category] }} /> {it.category} · rel {it.relevance.toFixed(2)}
                    </span>
                  </div>
                  <span className="rel r3" style={{ opacity: 0.35 + it.relevance * 0.65 }}>
                    {Math.round(it.relevance * 100)}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="slate">
            <h4>Your feed (pick {DIVERSITY_K})</h4>
            {chosen.map((it, i) => (
              <div className="item" key={it.id} onClick={() => toggle(it)}>
                <span className="slot-idx">{i + 1}</span>
                <div className="meta">
                  <span className="name">{it.label}</span>
                  <span className="cat">
                    <i className="cat-dot" style={{ background: CAT_COLOR[it.category] }} /> {it.category}
                  </span>
                </div>
                <span className="rel r3">{Math.round(it.relevance * 100)}</span>
              </div>
            ))}
            {chosen.length === 0 && <p className="hint">Click candidates on the left to add them.</p>}
          </div>
        </div>

        <div className="metrics">
          <Metric k="Relevance" v={rel} target={REL_FLOOR} />
          <Metric k="Diversity" v={div} target={DIV_FLOOR} />
          <div className="metric" style={{ borderColor: passed ? 'var(--good)' : undefined }}>
            <div className="k">Ecosystem health</div>
            <div className="v" style={{ color: passed ? 'var(--good)' : undefined }}>{health}</div>
            <div className="bar"><i style={{ width: `${health}%` }} /></div>
          </div>
        </div>

        <p className={`hint ${passed ? 'ok' : ''}`}>
          {!full
            ? `Add ${DIVERSITY_K - chosen.length} more item(s) to complete the feed.`
            : passed
            ? '✓ Relevant AND diverse — a healthy feed that will not collapse into a bubble. The Diversity Seed is ready.'
            : div < DIV_FLOOR
            ? `Diversity ${div.toFixed(2)} is below ${DIV_FLOOR} — this is a filter bubble. Swap some “News” for other categories.`
            : `Relevance ${rel.toFixed(2)} is below ${REL_FLOOR} — too much low-value filler. Keep a couple of strong items in the mix.`}
        </p>

        <div className="modal-actions">
          <button className="btn ghost" onClick={takeTopRel} title="What a pure-relevance ranker returns — a filter bubble">
            Take top-{DIVERSITY_K} by relevance
          </button>
          <button className="btn ghost" onClick={autoBalance} title="What MMR (λ=0.6) picks — a balanced slate">
            MMR auto-balance
          </button>
          <button className="btn ghost" onClick={() => setChosenIds([])}>Reset</button>
          <button className="btn primary" disabled={!passed} onClick={submit} style={{ opacity: passed ? 1 : 0.5 }}>
            {alreadyDone ? 'Save feed — close' : 'Forge Diversity Seed →'}
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
