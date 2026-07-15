import { RefreshCw, Sparkles, Sprout } from 'lucide-react'
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
import { launchFoundry } from '../state/foundryLaunch'
import { useProgress } from '../state/progress'
import { ExperimentBrief } from './ExperimentBrief'
import { LearningLabFooter, LearningLabShell } from './LearningLabShell'

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
  const openNode = useProgress((s) => s.openNode)
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

  const openCheckpoint = () => {
    completeNode('diversity-lab')
    openNode('ecosystem-quiz')
  }
  const openFoundry = () => {
    completeNode('diversity-lab')
    closeNode()
    launchFoundry('hybrid')
  }

  return (
    <LearningLabShell
      dialogId="diversity-lab-title"
      world="World 05"
      kicker="Ecosystem experiment"
      title="When relevance collapses into repetition"
      lead="The candidate pool is intentionally concentrated: the strongest individual scores belong to one category. Build a slate-level decision rather than sorting items independently."
      badge="Controlled candidate pool"
      badgeNote={`${DIVERSITY_ITEMS.length} items · ${DIVERSITY_K}-item slate`}
      badgeIcon={<Sprout size={18} aria-hidden />}
      onClose={closeNode}
      footer={(
        <LearningLabFooter
          ready={passed}
          alreadyDone={alreadyDone}
          pendingLabel="Clear both relevance and diversity quality floors"
          readyLabel="Slate health and interpretation complete"
          foundryLabel="Open diversified stack in Foundry"
          checkpointLabel="Continue to checkpoint"
          onFoundry={openFoundry}
          onCheckpoint={openCheckpoint}
        />
      )}
      className="diversity-learning-lab"
    >
        <ExperimentBrief
          question="Can the most relevant individual items form an unhealthy feed?"
          hypothesis="Pure relevance will create a News-heavy bubble. A balanced slate should give up a little average relevance while crossing both quality floors."
          action="Run the pure-relevance baseline, then compare MMR at λ=0.6. Edit the five-item feed to test your own balance."
          observe={`Read Relevance and Diversity separately. Ecosystem health only becomes meaningful when both clear their floors: ${REL_FLOOR} and ${DIV_FLOOR}.`}
        />

        <div className="lab-grid">
          <div className="pool">
            <h4>Candidate evidence · sorted by relevance</h4>
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
            <h4>Slate decision · pick {DIVERSITY_K}</h4>
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
            {chosen.length === 0 && <p className="hint">Select items to assemble the feed, then compare both quality axes.</p>}
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
            ? `Next step: add ${DIVERSITY_K - chosen.length} more item(s), then inspect the two floors.`
            : passed
            ? 'Observed: the slate keeps strong anchors while adding enough distinct intent to avoid a one-category loop. Balance, not maximum variety, creates the healthy result.'
            : div < DIV_FLOOR
            ? `Observed: Diversity is ${div.toFixed(2)}, below ${DIV_FLOOR}. Individual relevance produced redundant exposures; replace some News items with distinct categories.`
            : `Observed: Relevance is ${rel.toFixed(2)}, below ${REL_FLOOR}. Novelty without user value becomes filler; restore a few strong anchors.`}
        </p>

        <div className="learning-lab-controls">
          <button className="btn ghost" onClick={takeTopRel} title="What a pure-relevance ranker returns — a filter bubble">
            <RefreshCw size={16} aria-hidden />Run relevance baseline
          </button>
          <button className="btn ghost" onClick={autoBalance} title="What MMR (λ=0.6) picks — a balanced slate">
            <Sparkles size={16} aria-hidden />Run MMR · λ 0.6
          </button>
          <button className="btn ghost" onClick={() => setChosenIds([])}>
            <RefreshCw size={16} aria-hidden />Reset selection
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
