import { Cpu } from 'lucide-react'
import { useState } from 'react'
import { ATTN_RUNS, ATTN_BUDGET_MB, attnMemoryMB, type AttnRun } from '../data/course'
import { launchFoundry } from '../state/foundryLaunch'
import { useProgress } from '../state/progress'
import { ExperimentBrief } from './ExperimentBrief'
import { LearningLabFooter, LearningLabShell } from './LearningLabShell'

/**
 * Flash Attention Lab — the World-03 lab. Run attention over growing sequence lengths with either
 * STANDARD attention (materialises the N×N score matrix → O(N²) memory) or FLASH attention (tiles
 * it → O(N) auxiliary memory). The teaching payoff: the long 32K sequence only fits the budget
 * with Flash while preserving mathematically equivalent attention up to floating-point precision.
 * Clear the 32K run to complete the experiment.
 */
export function AttentionLab() {
  const completeNode = useProgress((s) => s.completeNode)
  const closeNode = useProgress((s) => s.closeNode)
  const openNode = useProgress((s) => s.openNode)
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
  const openCheckpoint = () => {
    completeNode('attention-lab')
    openNode('attention-quiz')
  }
  const openFoundry = () => {
    completeNode('attention-lab')
    closeNode()
    launchFoundry('deep')
  }

  return (
    <LearningLabShell
      dialogId="attention-lab-title"
      world="World 03"
      kicker="Sequence experiment"
      title="Why long context runs out of memory"
      lead={`Keep the attention rule fixed and change only its memory implementation. The simulated budget is ${ATTN_BUDGET_MB} MB, so the growth pattern becomes visible before the browser is put at risk.`}
      badge="Deterministic memory model"
      badgeNote="Same attention rule · controlled execution"
      badgeIcon={<Cpu size={18} aria-hidden />}
      onClose={closeNode}
      footer={(
        <LearningLabFooter
          ready={passed}
          alreadyDone={alreadyDone}
          pendingLabel="Make the 32K sequence fit without changing attention semantics"
          readyLabel="Long-context execution contract verified"
          foundryLabel="Open deep stack in Foundry"
          checkpointLabel="Continue to checkpoint"
          onFoundry={openFoundry}
          onCheckpoint={openCheckpoint}
        />
      )}
      className="attention-learning-lab"
    >
        <ExperimentBrief
          question="Can the same attention computation fit a 32K sequence without storing an N×N matrix?"
          hypothesis="Standard attention will cross the budget quadratically. Flash Attention should keep auxiliary memory near-linear while preserving the mathematical result."
          action="Run several lengths with Standard first. Repeat the 32K case with Flash Attention."
          observe="Compare peak memory and complexity labels. The quality statement stays constant; only the execution path changes."
        />

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
              <span className="ok">✓ equivalent attention · same quality target</span>
              <span>{flash ? 'Flash · O(N)' : 'Standard · O(N²)'}</span>
            </div>
          </div>
        )}

        <p className={`hint ${passed ? 'ok' : ''}`}>
          {passed
            ? 'Observed: tiling lets the 32K sequence fit without materializing the full score matrix. Compute is still quadratic; auxiliary memory is not.'
            : run && run.n >= 32768 && !fits
            ? 'Observed: Standard attention exceeds the budget because the score matrix grows with N². Keep the sequence fixed and switch the implementation.'
            : 'Next step: run increasing lengths with both methods, then make the 32K case fit.'}
        </p>

    </LearningLabShell>
  )
}
