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
        <div className="kicker">Lab Mode · Interactive</div>
        <h1>Bandit Lab</h1>
        <p className="lead">
          Four content sources, {BANDIT_PULLS} impressions, and hidden click-rates. Every pull you must
          {' '}<b>exploit</b> the current best or <b>explore</b> a less-tried arm. Pick a policy and run it —
          then read the <b>regret</b>, the gap to always showing the best arm. Get regret under {REGRET_BUDGET}.
        </p>

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
          <button className="btn primary" onClick={run}>Run {BANDIT_PULLS} impressions ▶</button>
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
                <span>Best arm found</span>
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
            ? '✓ Regret under budget — your policy explored enough to lock onto the best arm. The Policy Controller is ready.'
            : result && strategy === 'greedy'
            ? 'Greedy stalled on an early favourite and never checked the rest — huge regret. Try an exploring policy (ε-greedy or UCB).'
            : result
            ? 'Closer — but still over budget. UCB explores by uncertainty and finds the best arm fastest.'
            : 'Pick a strategy and run the impressions. Watch which arm it settles on.'}
        </p>

        <div className="modal-actions">
          <button className="btn primary" disabled={!passed} onClick={submit} style={{ opacity: passed ? 1 : 0.5 }}>
            {alreadyDone ? 'Save — close' : 'Forge Policy Controller →'}
          </button>
        </div>
      </div>
    </div>
  )
}
