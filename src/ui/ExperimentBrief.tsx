import { Eye, FlaskConical, Lightbulb, MousePointerClick } from 'lucide-react'

interface ExperimentBriefProps {
  question: string
  hypothesis: string
  action: string
  observe: string
}

const STEPS = [
  { key: 'hypothesis', label: 'Hypothesis', icon: Lightbulb },
  { key: 'action', label: 'Your move', icon: MousePointerClick },
  { key: 'observe', label: 'Readout', icon: Eye },
] as const

export function ExperimentBrief({ question, hypothesis, action, observe }: ExperimentBriefProps) {
  const copy = { hypothesis, action, observe }

  return (
    <section className="experiment-brief" aria-label="Experiment brief">
      <header>
        <span className="experiment-label">
          <FlaskConical size={16} aria-hidden />
          Experiment
        </span>
        <h2>{question}</h2>
      </header>

      <div className="experiment-steps">
        {STEPS.map(({ key, label, icon: Icon }, index) => (
          <article key={key}>
            <span className="experiment-step-index">{String(index + 1).padStart(2, '0')}</span>
            <div>
              <h3><Icon size={15} aria-hidden />{label}</h3>
              <p>{copy[key]}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
