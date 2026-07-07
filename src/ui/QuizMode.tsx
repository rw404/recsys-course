import { useMemo, useState } from 'react'
import { METRICS_QUIZ, NEGATIVES_QUIZ, type QuizQuestion } from '../data/course'
import { useProgress, type NodeId } from '../state/progress'

const QUIZZES: Record<string, { nodeId: NodeId; kicker: string; title: string; lead: string; questions: QuizQuestion[] }> = {
  'quiz-gate': {
    nodeId: 'quiz-gate',
    kicker: 'Quiz Gate · Checkpoint',
    title: 'Metrics Quiz',
    lead: 'Answer all three correctly to light the bridge to Retrieval Valley.',
    questions: METRICS_QUIZ,
  },
  'negatives-quiz': {
    nodeId: 'negatives-quiz',
    kicker: 'Two-Tower Gate · Checkpoint',
    title: 'Retrieval & Negatives Quiz',
    lead: 'Answer all three correctly to open the Two-Tower Gate onward.',
    questions: NEGATIVES_QUIZ,
  },
}

export function QuizMode() {
  const completeNode = useProgress((s) => s.completeNode)
  const closeNode = useProgress((s) => s.closeNode)
  const activeNodeId = useProgress((s) => s.activeNodeId)
  const quiz = useMemo(() => QUIZZES[activeNodeId ?? 'quiz-gate'] ?? QUIZZES['quiz-gate'], [activeNodeId])
  const QS = quiz.questions

  const [answers, setAnswers] = useState<Record<string, number>>({})

  const answeredAll = QS.every((q) => answers[q.id] !== undefined)
  const allCorrect = QS.every((q) => answers[q.id] === q.answer)
  const passed = answeredAll && allCorrect

  const choose = (qid: string, idx: number) => {
    setAnswers((a) => ({ ...a, [qid]: idx }))
  }

  const submit = () => {
    completeNode(quiz.nodeId)
    closeNode()
  }

  return (
    <div className="overlay" onClick={closeNode}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="btn ghost close-x" onClick={closeNode}>✕ Esc</button>
        <div className="kicker">{quiz.kicker}</div>
        <h1>{quiz.title}</h1>
        <p className="lead">{quiz.lead}</p>

        {QS.map((q) => {
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
            {passed
              ? quiz.nodeId === 'negatives-quiz'
                ? 'Open the gate →'
                : 'Light the bridge →'
              : answeredAll
              ? 'Fix the wrong answers'
              : 'Answer all to continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
