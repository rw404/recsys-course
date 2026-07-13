import { useMemo, useState } from 'react'
import { METRICS_QUIZ, NEGATIVES_QUIZ, ATTENTION_QUIZ, POLICY_QUIZ, ECOSYSTEM_QUIZ, type QuizQuestion } from '../data/course'
import { useProgress, type NodeId } from '../state/progress'

const QUIZZES: Record<string, { nodeId: NodeId; kicker: string; title: string; lead: string; questions: QuizQuestion[] }> = {
  'quiz-gate': {
    nodeId: 'quiz-gate',
    kicker: 'Signal City · Foundations Checkpoint',
    title: 'Recommender Foundations Quiz',
    lead: 'Connect the core entities, signals, pipeline and metrics to light the bridge to Retrieval Valley.',
    questions: METRICS_QUIZ,
  },
  'negatives-quiz': {
    nodeId: 'negatives-quiz',
    kicker: 'World 02 · Applied Checkpoint',
    title: 'Retrieval Systems Checkpoint',
    lead: 'Resolve six training and serving scenarios. Each answer explains the stage contract or trade-off behind the decision.',
    questions: NEGATIVES_QUIZ,
  },
  'attention-quiz': {
    nodeId: 'attention-quiz',
    kicker: 'World 03 · Applied Checkpoint',
    title: 'Sequential Models Checkpoint',
    lead: 'Diagnose six sequence-model scenarios, from input leakage and attention semantics to long-context execution.',
    questions: ATTENTION_QUIZ,
  },
  'policy-quiz': {
    nodeId: 'policy-quiz',
    kicker: 'World 04 · Applied Checkpoint',
    title: 'Decisions & Policies Checkpoint',
    lead: 'Choose the right policy reasoning in six cases involving uncertainty, regret, logged propensities and slates.',
    questions: POLICY_QUIZ,
  },
  'ecosystem-quiz': {
    nodeId: 'ecosystem-quiz',
    kicker: 'World 05 · Applied Checkpoint',
    title: 'Feedback Ecosystems Checkpoint',
    lead: 'Trace six ecosystem failures through exposure, bias, counterfactual evaluation, diversity and long-term guardrails.',
    questions: ECOSYSTEM_QUIZ,
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
          <button className="btn ghost" onClick={() => setAnswers({})}>Reset answers</button>
          <button className="btn primary" disabled={!passed} onClick={submit} style={{ opacity: passed ? 1 : 0.5 }}>
            {passed
              ? quiz.nodeId === 'ecosystem-quiz'
                ? 'Continue to system synthesis →'
                : 'Complete checkpoint →'
              : answeredAll
              ? 'Review the highlighted reasoning'
              : 'Answer every scenario to continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
