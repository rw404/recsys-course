import { useState } from 'react'
import { ATTN_RUNS, ATTN_BUDGET_MB, attnMemoryMB, type AttnRun } from '../data/course'
import { useProgress } from '../state/progress'

/**
 * Flash Attention Lab — the World-03 lab. Run attention over growing sequence lengths with either
 * STANDARD attention (materialises the N×N score matrix → O(N²) memory) or FLASH attention (tiles
 * it → O(N) memory). The teaching payoff: the long 32K sequence only fits the on-chip budget with
 * Flash — and the output is bit-for-bit the SAME (exact), so it's pure win. Clear the 32K run to
 * forge the Attention Lens.
 */
export function AttentionLab() {
  const completeNode = useProgress((s) => s.completeNode)
  const closeNode = useProgress((s) => s.closeNode)
  const alreadyDone = useProgress((s) => s.completed['attention-lab'])

  const [flash, setFlash] = useState(false)
  const [run, setRun] = useState<AttnRun | null>(null)
  const [clearedLong, setClearedLong] = useState(false)

  const mem = run ? attnMemoryMB(run.n, flash) : 0
  const fits = mem <= ATTN_BUDGET_MB
  const pct = Math.min(100, (mem / ATTN_BUDGET_MB) * 100)

  const execute = (r: AttnRun) => {
    setRun(r)
    if (r.n >= 32768 && attnMemoryMB(r.n, flash) <= ATTN_BUDGET_MB) setClearedLong(true)
  }

  const passed = clearedLong
  const submit = () => {
    completeNode('attention-lab')
    closeNode()
  }

  return (
    <div className="overlay" onClick={closeNode}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="btn ghost close-x" onClick={closeNode}>✕ Esc</button>
        <div className="kicker">Lab Mode · Interactive</div>
        <h1>Flash Attention Lab</h1>
        <p className="lead">
          Attention over a sequence needs every token to look at every other. <b>Standard</b>
          attention stores the whole N×N score matrix, so memory grows with N². <b>Flash</b> attention
          tiles the exact same computation in on-chip memory. Run the longest sequence within the
          {' '}{ATTN_BUDGET_MB} MB budget — the output is identical either way.
        </p>

        <div className="attn-method">
          <button className={`btn ${flash ? 'ghost' : 'primary'}`} onClick={() => { setFlash(false); setRun(null) }}>
            Standard attention
          </button>
          <button className={`btn ${flash ? 'primary' : 'ghost'}`} onClick={() => { setFlash(true); setRun(null) }}>
            Flash attention
          </button>
        </div>

        <div className="attn-runs">
          {ATTN_RUNS.map((r) => (
            <button key={r.id} className={`attn-run ${run?.id === r.id ? 'on' : ''}`} onClick={() => execute(r)}>
              {r.label}
            </button>
          ))}
        </div>

        {run && (
          <div className="attn-result">
            <div className="attn-memrow">
              <span>Peak memory</span>
              <b style={{ color: fits ? 'var(--good)' : '#ff7a7a' }}>
                {mem >= 1000 ? `${(mem / 1000).toFixed(1)} GB` : `${mem.toFixed(1)} MB`}
              </b>
              <span className="attn-budget">/ {ATTN_BUDGET_MB} MB budget</span>
            </div>
            <div className="attn-membar">
              <i style={{ width: `${pct}%`, background: fits ? 'var(--good)' : '#ff7a7a' }} />
            </div>
            <div className="attn-flags">
              <span className={fits ? 'ok' : 'bad'}>{fits ? '✓ fits on-chip' : '✗ out of memory'}</span>
              <span className="ok">✓ output exact — 100% accuracy</span>
              <span>{flash ? 'Flash · O(N)' : 'Standard · O(N²)'}</span>
            </div>
          </div>
        )}

        <p className={`hint ${passed ? 'ok' : ''}`}>
          {passed
            ? '✓ 32K tokens ran on-chip with Flash — same result, a fraction of the memory. The Attention Lens is ready.'
            : run && run.n >= 32768 && !fits
            ? 'The 32K run blows the budget with standard attention. Switch to Flash attention and run it again.'
            : 'Pick a method and run each sequence length. Get the 32K run to fit within the budget.'}
        </p>

        <div className="modal-actions">
          <button className="btn primary" disabled={!passed} onClick={submit} style={{ opacity: passed ? 1 : 0.5 }}>
            {alreadyDone ? 'Save — close' : 'Forge Attention Lens →'}
          </button>
        </div>
      </div>
    </div>
  )
}
