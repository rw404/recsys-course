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
 * Capstone Arena — the World-06 final challenge. One synthesis question from each of the five
 * regions; each correct answer is worth CAPSTONE_PER_Q. A perfect run scores 100,000 and takes the
 * #1 seat in the Hall of Mastery. Clearing CAPSTONE_PASS (3 of 5) completes the course; you can
 * re-enter to beat your best.
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
        <div className="kicker">Capstone · Final Challenge</div>
        <h1>Capstone Arena</h1>
        <p className="lead">
          One question from every region — measure, retrieve, attend, decide, sustain. Each correct
          answer is worth {CAPSTONE_PER_Q.toLocaleString()}. Score {CAPSTONE_PASS.toLocaleString()}+
          to complete the course; a perfect run tops the <b>Hall of Mastery</b>.
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
            <div className="hall-title">♛ Hall of Mastery</div>
            {board.map((e, i) => (
              <div className={`hall-row ${e.you ? 'you' : ''} ${i === 0 ? 'top' : ''}`} key={`${e.name}-${i}`}>
                <span className="hall-rank">{i + 1}</span>
                <span className="hall-name">{e.name}</span>
                <span className="hall-score">{e.score.toLocaleString()}</span>
              </div>
            ))}
            <div className="hall-best">
              Your best: <b>{best > 0 ? best.toLocaleString() : '—'}</b>
            </div>
          </aside>
        </div>

        {submitted && (
          <p className={`hint ${passed ? 'ok' : ''}`}>
            {passed
              ? `★ ${correct}/5 correct — you scored ${score.toLocaleString()}. Best: ${shownBest.toLocaleString()} (rank #${rank}). The course is complete!`
              : `${correct}/5 correct — ${score.toLocaleString()} points, below ${CAPSTONE_PASS.toLocaleString()}. Review the explanations and try again.`}
          </p>
        )}

        <div className="modal-actions">
          {!submitted ? (
            <button className="btn primary" disabled={!answeredAll} onClick={submit} style={{ opacity: answeredAll ? 1 : 0.5 }}>
              {answeredAll ? 'Submit challenge ▶' : 'Answer all five to submit'}
            </button>
          ) : passed ? (
            <button className="btn primary" onClick={finish}>Claim your victory →</button>
          ) : (
            <button className="btn primary" onClick={retry}>Try again ↻</button>
          )}
        </div>
      </div>
    </div>
  )
}
