import { useState } from 'react'
import { METRICS_QUIZ } from '../data/course'
import { useProgress } from '../state/progress'

export function QuizMode() {
  const completeNode = useProgress((s) => s.completeNode)
  const closeNode = useProgress((s) => s.closeNode)

  const [answers, setAnswers] = useState<Record<string, number>>({})

  const answeredAll = METRICS_QUIZ.every((q) => answers[q.id] !== undefined)
  const allCorrect = METRICS_QUIZ.every((q) => answers[q.id] === q.answer)
  const passed = answeredAll && allCorrect

  const choose = (qid: string, idx: number) => {
    setAnswers((a) => ({ ...a, [qid]: idx }))
  }

  const submit = () => {
    completeNode('quiz-gate')
    closeNode()
  }

  return (
    <div className="overlay" onClick={closeNode}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="btn ghost close-x" onClick={closeNode}>✕ Esc</button>
        <div className="kicker">Quiz Gate · Checkpoint</div>
        <h1>Metrics Quiz</h1>
        <p className="lead">Answer all three correctly to light the bridge to Retrieval Valley.</p>

        {METRICS_QUIZ.map((q) => {
          const picked = answers[q.id]
          return (
            <div className="q" key={q.id}>
              <div className="prompt">{q.prompt}</div>
              <div className="opts">
                {q.options.map((opt, idx) => {
                  let cls = 'opt'
                  if (picked !== undefined) {
                    if (idx === q.answer) cls += ' correct'
                    else if (idx === picked) cls += ' wrong'
                  }
                  return (
                    <button key={idx} className={cls} onClick={() => choose(q.id, idx)}>
                      {opt}
                    </button>
                  )
                })}
              </div>
              {picked !== undefined && <div className="explain">{q.explain}</div>}
            </div>
          )
        })}

        <div className="modal-actions">
          <button className="btn ghost" onClick={() => setAnswers({})}>Clear</button>
          <button className="btn primary" disabled={!passed} onClick={submit} style={{ opacity: passed ? 1 : 0.5 }}>
            {passed ? 'Light the bridge →' : answeredAll ? 'Fix the wrong answers' : 'Answer all to continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
