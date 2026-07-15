import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  Database,
  RefreshCw,
  Star,
  Trash2,
  Workflow,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { coverage, ndcg, recallAtK } from '../data/course'
import type { SandboxMovie } from '../data/movielensSandbox'
import { loadRecommendationDataset, type RuntimeDataset } from '../data/recommenderDataset'
import {
  buildFoundationsExperiment,
  type FoundationsCandidate,
  type FoundationsExperimentData,
} from '../logic/foundationsExperiment'
import { launchFoundry } from '../state/foundryLaunch'
import { useProgress } from '../state/progress'
import { ExperimentBrief } from './ExperimentBrief'

const SLATE_SIZE = 4
const PASS_NDCG = 0.85
const CORRECT_REFLECTION = 'position'

const REFLECTIONS = [
  {
    id: CORRECT_REFLECTION,
    label: 'Relevant films moved into earlier positions, where discounted gain is largest.',
  },
  {
    id: 'popularity',
    label: 'The catalogue average increased, so the user rating no longer matters.',
  },
  {
    id: 'coverage',
    label: 'Coverage alone guarantees that every selected film is relevant.',
  },
]

export function FoundationsLab() {
  const completeNode = useProgress((state) => state.completeNode)
  const openNode = useProgress((state) => state.openNode)
  const closeNode = useProgress((state) => state.closeNode)
  const alreadyDone = useProgress((state) => state.completed['ranking-sandbox'])
  const [dataset, setDataset] = useState<RuntimeDataset | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [slateIds, setSlateIds] = useState<string[]>([])
  const [reflection, setReflection] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError(null)
    void loadRecommendationDataset().then((loaded) => {
      if (!active) return
      if (!loaded.meta.isOfficial) {
        setLoadError('The real ratings payload is unavailable. Reload the dataset before starting this credited experiment.')
      }
      setDataset(loaded)
      setLoading(false)
    }, (error: unknown) => {
      if (!active) return
      setLoadError(error instanceof Error ? error.message : String(error))
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  const experiment = useMemo(
    () => dataset?.meta.isOfficial ? buildFoundationsExperiment(dataset) : null,
    [dataset],
  )

  useEffect(() => {
    setSlateIds(experiment?.baselineIds ?? [])
    setReflection(null)
  }, [experiment])

  if (loading) {
    return (
      <div className="overlay foundations-lab-overlay">
        <div className="foundation-lab-status" role="status">
          <span className="foundation-loader" />
          <strong>Loading observed ratings</strong>
          <p>Preparing a real viewer history and catalogue evidence.</p>
        </div>
      </div>
    )
  }

  if (!dataset || !experiment || loadError) {
    return (
      <div className="overlay foundations-lab-overlay">
        <div className="foundation-lab-status is-error" role="alert">
          <Database size={30} aria-hidden />
          <strong>Real ratings are required</strong>
          <p>{loadError ?? 'No viewer has enough observed ratings for this experiment.'}</p>
          <div>
            <button type="button" className="btn ghost" onClick={closeNode}>Return to world</button>
            <button type="button" className="btn primary" onClick={() => window.location.reload()}>
              <RefreshCw size={15} aria-hidden />Retry dataset
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <FoundationsExperiment
      dataset={dataset}
      experiment={experiment}
      slateIds={slateIds}
      reflection={reflection}
      alreadyDone={alreadyDone}
      onSlateChange={setSlateIds}
      onReflection={setReflection}
      onClose={closeNode}
      onCheckpoint={() => {
        completeNode('ranking-sandbox')
        openNode('quiz-gate')
      }}
      onFoundry={() => {
        completeNode('ranking-sandbox')
        closeNode()
        launchFoundry('fast')
      }}
    />
  )
}

function FoundationsExperiment({
  dataset,
  experiment,
  slateIds,
  reflection,
  alreadyDone,
  onSlateChange,
  onReflection,
  onClose,
  onCheckpoint,
  onFoundry,
}: {
  dataset: RuntimeDataset
  experiment: FoundationsExperimentData
  slateIds: string[]
  reflection: string | null
  alreadyDone: boolean
  onSlateChange: (ids: string[]) => void
  onReflection: (id: string | null) => void
  onClose: () => void
  onCheckpoint: () => void
  onFoundry: () => void
}) {
  const byId = useMemo(
    () => new Map(experiment.candidates.map((candidate) => [candidate.id, candidate])),
    [experiment.candidates],
  )
  const slate = slateIds.map((id) => byId.get(id)).filter((candidate): candidate is FoundationsCandidate => Boolean(candidate))
  const allRels = experiment.candidates.map((candidate) => candidate.rel)
  const currentNdcg = slate.length ? ndcg(slate.map((candidate) => candidate.rel), allRels) : 0
  const baselineSlate = experiment.baselineIds.map((id) => byId.get(id)).filter((candidate): candidate is FoundationsCandidate => Boolean(candidate))
  const baselineNdcg = ndcg(baselineSlate.map((candidate) => candidate.rel), allRels)
  const recall = recallAtK(slate, experiment.candidates)
  const catalogCoverage = coverage(slate, experiment.candidates)
  const rankingPassed = slate.length === SLATE_SIZE && currentNdcg >= PASS_NDCG
  const reflectionCorrect = reflection === CORRECT_REFLECTION
  const completed = rankingPassed && reflectionCorrect

  const addCandidate = (candidateId: string) => {
    if (slateIds.includes(candidateId) || slateIds.length >= SLATE_SIZE) return
    onSlateChange([...slateIds, candidateId])
    onReflection(null)
  }
  const removeCandidate = (candidateId: string) => {
    onSlateChange(slateIds.filter((id) => id !== candidateId))
    onReflection(null)
  }
  const moveCandidate = (candidateId: string, offset: -1 | 1) => {
    const index = slateIds.indexOf(candidateId)
    const destination = index + offset
    if (index < 0 || destination < 0 || destination >= slateIds.length) return
    const next = [...slateIds]
    ;[next[index], next[destination]] = [next[destination], next[index]]
    onSlateChange(next)
    onReflection(null)
  }
  const resetBaseline = () => {
    onSlateChange(experiment.baselineIds)
    onReflection(null)
  }

  return (
    <div className="overlay foundations-lab-overlay" onClick={onClose}>
      <main className="foundations-lab" role="dialog" aria-modal="true" aria-labelledby="foundations-lab-title" onClick={(event) => event.stopPropagation()}>
        <header className="foundations-lab-header">
          <div>
            <span className="foundation-kicker">World 01 · Evidence experiment</span>
            <h1 id="foundations-lab-title">Make a ranking, then defend it</h1>
            <p>Compare a simple catalogue baseline with one viewer’s held-out ratings. The baseline never sees that viewer outcome.</p>
          </div>
          <div className="foundation-dataset-badge">
            <Database size={17} aria-hidden />
            <span><b>{dataset.meta.label}</b><small>{dataset.meta.ratingsCount.toLocaleString()} observed ratings</small></span>
          </div>
          <button type="button" className="foundation-icon-button" onClick={onClose} aria-label="Close experiment" title="Close">
            <X size={20} aria-hidden />
          </button>
        </header>

        <div className="foundation-lab-scroll">
          <ExperimentBrief
            question="Does the catalogue baseline put this viewer’s most relevant films first?"
            hypothesis="A globally strong film can still be a poor personal decision. Reordering by observed relevance should improve position-aware quality."
            action={`Build an ordered slate of ${SLATE_SIZE} films. Remove, replace, and move films until NDCG clears ${PASS_NDCG.toFixed(2)}.`}
            observe="Read NDCG beside recall and genre coverage, then explain which part of the decision changed."
          />

          <section className="foundation-profile-band" aria-label="Observed viewer evidence">
            <span className="foundation-step">01</span>
            <div><small>Observed profile</small><strong>{experiment.viewer.name}</strong></div>
            <p>{experiment.viewer.cohort} · {experiment.viewer.favoriteGenres.slice(0, 3).join(', ') || 'mixed catalogue history'}</p>
            <span className="foundation-evidence-note">Ratings are held-out evidence, not model inputs</span>
          </section>

          <div className="foundation-lab-workspace">
            <section className="foundation-candidate-bank">
              <header>
                <div><span className="foundation-step">02</span><h2>Candidate evidence</h2></div>
                <p>Baseline score combines catalogue average and support. Viewer rating is the observed outcome.</p>
              </header>
              <div className="foundation-candidate-grid">
                {experiment.candidates.map((candidate) => {
                  const selected = slateIds.includes(candidate.id)
                  const full = slateIds.length >= SLATE_SIZE
                  return (
                    <button
                      type="button"
                      className={`foundation-candidate${selected ? ' is-selected' : ''}`}
                      key={candidate.id}
                      disabled={!selected && full}
                      onClick={() => selected ? removeCandidate(candidate.id) : addCandidate(candidate.id)}
                      aria-pressed={selected}
                    >
                      <FoundationPoster movie={candidate.movie} />
                      <span className="foundation-candidate-copy">
                        <strong>{candidate.title}</strong>
                        <small>{candidate.movie.year} · {candidate.movie.genres.slice(0, 2).join(' / ')}</small>
                        <span><b>Baseline {candidate.score.toFixed(2)}</b><em><Star size={11} fill="currentColor" aria-hidden />{candidate.observedRating.toFixed(1)}</em></span>
                      </span>
                      <i>{selected ? <Check size={15} aria-hidden /> : '+'}</i>
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="foundation-decision-slate">
              <header>
                <div><span className="foundation-step">03</span><h2>Ordered slate</h2></div>
                <button type="button" className="foundation-reset" onClick={resetBaseline}>
                  <RefreshCw size={14} aria-hidden />Baseline
                </button>
              </header>
              <p className="foundation-slate-help">Position 1 receives the most attention. Use arrows to change exposure without changing the set.</p>
              <div className="foundation-slots">
                {Array.from({ length: SLATE_SIZE }, (_, index) => {
                  const candidate = slate[index]
                  if (!candidate) return <div className="foundation-slot is-empty" key={`empty-${index}`}><b>{index + 1}</b><span>Select a film</span></div>
                  return (
                    <article className="foundation-slot" key={candidate.id}>
                      <b>{index + 1}</b>
                      <FoundationPoster movie={candidate.movie} compact />
                      <span><strong>{candidate.title}</strong><small>rel {candidate.rel} · rating {candidate.observedRating.toFixed(1)}</small></span>
                      <div>
                        <button type="button" disabled={index === 0} onClick={() => moveCandidate(candidate.id, -1)} aria-label={`Move ${candidate.title} up`}><ArrowUp size={14} /></button>
                        <button type="button" disabled={index === slate.length - 1} onClick={() => moveCandidate(candidate.id, 1)} aria-label={`Move ${candidate.title} down`}><ArrowDown size={14} /></button>
                        <button type="button" onClick={() => removeCandidate(candidate.id)} aria-label={`Remove ${candidate.title}`}><Trash2 size={14} /></button>
                      </div>
                    </article>
                  )
                })}
              </div>

              <div className="foundation-metrics" aria-label="Ranking metrics">
                <FoundationMetric label={`NDCG@${SLATE_SIZE}`} value={currentNdcg} note={`baseline ${baselineNdcg.toFixed(2)}`} passed={rankingPassed} />
                <FoundationMetric label="Recall@k" value={recall} note="relevant items kept" />
                <FoundationMetric label="Genre coverage" value={catalogCoverage} note="candidate genres" />
              </div>
            </section>
          </div>

          <section className={`foundation-reflection${rankingPassed ? ' is-ready' : ''}`} aria-live="polite">
            <header><span className="foundation-step">04</span><div><h2>Explain the result</h2><p>{rankingPassed ? 'Your slate clears the quality target. Which statement is supported by this run?' : `Reach NDCG ${PASS_NDCG.toFixed(2)} to unlock the interpretation.`}</p></div></header>
            {rankingPassed && (
              <div className="foundation-reflection-options">
                {REFLECTIONS.map((option) => (
                  <button
                    type="button"
                    key={option.id}
                    className={`${reflection === option.id ? 'is-selected ' : ''}${reflection && option.id === CORRECT_REFLECTION ? 'is-correct' : reflection === option.id ? 'is-wrong' : ''}`}
                    onClick={() => onReflection(option.id)}
                  >
                    <span>{option.id === CORRECT_REFLECTION ? 'A' : option.id === 'popularity' ? 'B' : 'C'}</span>
                    {option.label}
                  </button>
                ))}
              </div>
            )}
            {reflection && (
              <p className={reflectionCorrect ? 'foundation-answer is-correct' : 'foundation-answer is-wrong'}>
                {reflectionCorrect
                  ? 'Correct. The item set and catalogue statistics are not enough: ordering changes discounted user value.'
                  : 'Not supported by this run. Compare the same films’ positions and held-out relevance, then try again.'}
              </p>
            )}
          </section>
        </div>

        <footer className="foundations-lab-actions">
          <span>{completed ? <><Check size={16} />Evidence and explanation complete</> : 'Complete the slate and interpretation to continue'}</span>
          <button type="button" className="btn ghost" disabled={!completed} onClick={onFoundry}>
            <Workflow size={16} aria-hidden />Open baseline in Foundry
          </button>
          <button type="button" className="btn primary" disabled={!completed} onClick={onCheckpoint}>
            <span>{alreadyDone ? 'Review checkpoint' : 'Continue to checkpoint'}</span><ArrowRight size={16} aria-hidden />
          </button>
        </footer>
      </main>
    </div>
  )
}

function FoundationMetric({ label, value, note, passed = false }: { label: string; value: number; note: string; passed?: boolean }) {
  return (
    <div className={passed ? 'is-passed' : ''}>
      <span>{label}<small>{note}</small></span>
      <strong>{value.toFixed(2)}</strong>
      <i><b style={{ width: `${Math.round(value * 100)}%` }} /></i>
    </div>
  )
}

function FoundationPoster({ movie, compact = false }: { movie: SandboxMovie; compact?: boolean }) {
  const [source, setSource] = useState(movie.posterUrl)
  const phase = hashPhase(movie.id)
  const style = {
    '--movie-tone': movie.tone,
    '--poster-shift': `${Math.round(phase * 24 - 12)}deg`,
    backgroundImage: `linear-gradient(180deg, transparent, rgba(8, 17, 43, .7)), radial-gradient(circle at ${30 + phase * 40}% 24%, #e8f7ef 0 8%, transparent 9%), conic-gradient(from ${120 + phase * 70}deg, ${movie.tone}, #18284f, #d9f7ef, ${movie.tone})`,
    backgroundSize: 'cover',
  } as CSSProperties
  return (
    <span className={`movie-poster-art foundation-poster${compact ? ' is-compact' : ''}${source ? ' has-real-poster' : ''}`} style={style} data-mark={source ? undefined : movie.mark} data-year={movie.year} role="img" aria-label={`${movie.title} cover`}>
      {source && <img src={source} alt="" loading="eager" decoding="async" referrerPolicy="no-referrer" onError={() => setSource(undefined)} />}
    </span>
  )
}

function hashPhase(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) / 4294967295
}
