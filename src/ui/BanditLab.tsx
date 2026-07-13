import { useState } from 'react'
import {
  BANDIT_ARMS,
  BANDIT_STRATEGIES,
  BANDIT_PULLS,
  REGRET_BUDGET,
  simulateBandit,
  type BanditStrategy,
  type BanditResult,
} from '../data/course'
import { useProgress } from '../state/progress'
import { ExperimentBrief } from './ExperimentBrief'

/**
 * Bandit Lab — the World-04 lab. Pick an exploration STRATEGY and run 300 impressions against four
 * arms whose true click-rates are hidden. Greedy locks onto whatever looked best early and piles up
 * REGRET; ε-greedy and UCB explore enough to find the best arm and keep regret low. Get regret under
 * the budget to forge the Policy Controller.
 */
export function BanditLab() {
  const completeNode = useProgress((s) => s.completeNode)
  const closeNode = useProgress((s) => s.closeNode)
  const alreadyDone = useProgress((s) => s.completed['bandit-lab'])

  const [strategy, setStrategy] = useState<BanditStrategy>('greedy')
  const [result, setResult] = useState<BanditResult | null>(null)
  const [cleared, setCleared] = useState(false)

  const run = () => {
    const r = simulateBandit(strategy)
    setResult(r)
    if (r.regret < REGRET_BUDGET) setCleared(true)
  }
  const pick = (s: BanditStrategy) => {
    setStrategy(s)
    setResult(null)
  }

  const maxPulls = result ? Math.max(...result.pulls) : 1
  const passed = cleared
  const submit = () => {
    completeNode('bandit-lab')
    closeNode()
  }

  return (
    <div className="overlay" onClick={closeNode}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="btn ghost close-x" onClick={closeNode}>✕ Esc</button>
        <div className="kicker">Practice · Guided experiment</div>
        <h1>What pure exploitation fails to discover</h1>
        <p className="lead">
          Four content sources have hidden click rates. Each strategy sees the same deterministic
          {BANDIT_PULLS}-impression environment, so differences come from the decision rule.
        </p>

        <ExperimentBrief
          question="Can a policy that always chooses its current winner reliably find the best source?"
          hypothesis="Greedy will over-trust an early lucky arm. Uncertainty-aware exploration should spend some traffic learning, then concentrate on the true winner with lower regret."
          action="Run Greedy as the baseline, then compare ε-greedy and UCB on the same horizon."
          observe={`Read pull allocation, realized reward and regret. Complete the experiment when regret falls below ${REGRET_BUDGET}.`}
        />

        <div className="bandit-strats">
          {BANDIT_STRATEGIES.map((s) => (
            <button
              key={s.id}
              className={`bandit-strat ${strategy === s.id ? 'on' : ''}`}
              onClick={() => pick(s.id)}
            >
              <b>{s.label}</b>
              <span>{s.blurb}</span>
            </button>
          ))}
        </div>

        <div className="modal-actions" style={{ justifyContent: 'flex-start', margin: '4px 0 2px' }}>
          <button className="btn primary" onClick={run}>Run controlled horizon ▶</button>
        </div>

        {result && (
          <div className="bandit-result">
            <div className="bandit-arms">
              {BANDIT_ARMS.map((arm, i) => (
                <div key={arm.id} className={`bandit-arm ${i === result.best ? 'best' : ''}`}>
                  <span className="ba-name">{arm.label}{i === result.best ? ' ★' : ''}</span>
                  <div className="ba-bar">
                    <i style={{ width: `${(result.pulls[i] / maxPulls) * 100}%` }} />
                  </div>
                  <span className="ba-n">{result.pulls[i]} pulls</span>
                </div>
              ))}
            </div>
            <div className="bandit-stats">
              <div className="bs-cell">
                <span>Reward</span>
                <b>{result.reward}</b>
              </div>
              <div className="bs-cell">
                <span>Traffic to best arm</span>
                <b>{result.optimalPct.toFixed(0)}%</b>
              </div>
              <div className="bs-cell">
                <span>Regret</span>
                <b style={{ color: result.regret < REGRET_BUDGET ? 'var(--good)' : '#ff7a7a' }}>
                  {result.regret.toFixed(1)}
                </b>
              </div>
            </div>
          </div>
        )}

        <p className={`hint ${passed ? 'ok' : ''}`}>
          {passed
            ? 'Observed: targeted exploration paid a short learning cost, then allocated most traffic to the strongest arm and kept cumulative regret under budget.'
            : result && strategy === 'greedy'
            ? 'Observed: Greedy converted an early random advantage into a permanent choice. It has no mechanism for checking what it may have missed.'
            : result
            ? 'Observed: this policy learned, but still spent too much of the horizon on weaker arms. Compare its allocation with UCB.'
            : 'Begin with Greedy, record its regret, then repeat with an exploring policy.'}
        </p>

        <div className="modal-actions">
          <button className="btn primary" disabled={!passed} onClick={submit} style={{ opacity: passed ? 1 : 0.5 }}>
            {alreadyDone ? 'Save result and close' : 'Complete experiment →'}
          </button>
        </div>
      </div>
    </div>
  )
}
