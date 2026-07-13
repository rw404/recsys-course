import { useMemo, useState } from 'react'
import {
  CAPSTONE_QUESTIONS,
  CAPSTONE_PER_Q,
  CAPSTONE_PASS,
  HALL_OF_MASTERY,
  capstoneRank,
} from '../data/course'
import { useProgress } from '../state/progress'

/**
 * Production Readiness Review — the World-06 capstone. One integrated scenario from each system
 * layer; each correct diagnosis is worth CAPSTONE_PER_Q. Clearing CAPSTONE_PASS (3 of 5) completes
 * the course, and learners can re-enter to improve their best result.
 */
export function CapstoneArena() {
  const completeNode = useProgress((s) => s.completeNode)
  const closeNode = useProgress((s) => s.closeNode)
  const setCapstoneScore = useProgress((s) => s.setCapstoneScore)
  const best = useProgress((s) => s.capstoneScore)

  const QS = CAPSTONE_QUESTIONS
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [submitted, setSubmitted] = useState(false)

  const answeredAll = QS.every((q) => answers[q.id] !== undefined)
  const correct = QS.filter((q) => answers[q.id] === q.answer).length
  const score = correct * CAPSTONE_PER_Q
  const passed = score >= CAPSTONE_PASS

  const choose = (qid: string, idx: number) => {
    if (submitted) return
    setAnswers((a) => ({ ...a, [qid]: idx }))
  }

  const submit = () => {
    setSubmitted(true)
    setCapstoneScore(score)
    if (score >= CAPSTONE_PASS) completeNode('capstone-arena')
  }
  const retry = () => {
    setAnswers({})
    setSubmitted(false)
  }
  const finish = () => closeNode()

  // the board and the hint both rank the SAME value (the player's best-so-far), so they never disagree
  const shownBest = Math.max(best, submitted ? score : 0)
  const board = useMemo(() => {
    const rows = HALL_OF_MASTERY.map((e) => ({ name: e.name, score: e.score, you: false }))
    if (shownBest > 0) rows.push({ name: 'You', score: shownBest, you: true })
    rows.sort((a, b) => b.score - a.score)
    return rows
  }, [shownBest])
  const rank = shownBest > 0 ? capstoneRank(shownBest) : null

  return (
    <div className="overlay" onClick={closeNode}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="btn ghost close-x" onClick={closeNode}>✕ Esc</button>
        <div className="kicker">Capstone · Production review</div>
        <h1>Production Readiness Review</h1>
        <p className="lead">
          Review five connected production decisions: measurement, retrieval, sequence modelling,
          policy and ecosystem health. Each correct diagnosis is worth {CAPSTONE_PER_Q.toLocaleString()}.
          Score {CAPSTONE_PASS.toLocaleString()}+ to complete the course; explanations remain visible after evaluation.
        </p>

        <div className="arena-grid">
          <div className="arena-questions">
            {QS.map((q, qi) => {
              const picked = answers[q.id]
              return (
                <div className="q" key={q.id}>
                  <div className="prompt"><span className="cap-qnum">{qi + 1}</span> {q.prompt}</div>
                  <div className="opts">
                    {q.options.map((opt, idx) => {
                      let cls = 'opt'
                      if (submitted) {
                        if (idx === q.answer) cls += ' correct'
                        else if (idx === picked) cls += ' wrong'
                      } else if (idx === picked) cls += ' picked'
                      return (
                        <button key={idx} className={cls} onClick={() => choose(q.id, idx)}>
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                  {submitted && <div className="explain">{q.explain}</div>}
                </div>
              )
            })}
          </div>

          <aside className="hall">
            <div className="hall-title">Reference scores</div>
            {board.map((e, i) => (
              <div className={`hall-row ${e.you ? 'you' : ''} ${i === 0 ? 'top' : ''}`} key={`${e.name}-${i}`}>
                <span className="hall-rank">{i + 1}</span>
                <span className="hall-name">{e.name}</span>
                <span className="hall-score">{e.score.toLocaleString()}</span>
              </div>
            ))}
            <div className="hall-best">
              Your best review: <b>{best > 0 ? best.toLocaleString() : '—'}</b>
            </div>
          </aside>
        </div>

        {submitted && (
          <p className={`hint ${passed ? 'ok' : ''}`}>
            {passed
              ? `Review passed: ${correct}/5 decisions correct, ${score.toLocaleString()} points. Best: ${shownBest.toLocaleString()} (reference rank #${rank}). The course is complete.`
              : `Review incomplete: ${correct}/5 decisions correct, ${score.toLocaleString()} points. Read each diagnosis, then run the review again.`}
          </p>
        )}

        <div className="modal-actions">
          {!submitted ? (
            <button className="btn primary" disabled={!answeredAll} onClick={submit} style={{ opacity: answeredAll ? 1 : 0.5 }}>
              {answeredAll ? 'Evaluate design →' : 'Resolve all five scenarios'}
            </button>
          ) : passed ? (
            <button className="btn primary" onClick={finish}>Complete course →</button>
          ) : (
            <button className="btn primary" onClick={retry}>Run review again ↻</button>
          )}
        </div>
      </div>
    </div>
  )
}
