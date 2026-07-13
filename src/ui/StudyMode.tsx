import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Check, Compass, Lightbulb, X } from 'lucide-react'
import { WEEK01_LESSON, WEEK02_LESSON, WEEK03_LESSON, WEEK04_LESSON, WEEK05_LESSON, CAPSTONE_LESSON, type LessonSection } from '../data/course'
import { useProgress, type NodeId } from '../state/progress'

type Card = LessonSection & { intro?: boolean }

/** Per-lesson content, keyed by the lesson node the player interacted with. */
const LESSONS: Record<
  string,
  { nodeId: NodeId; kicker: string; cards: Card[] }
> = {
  'week01-station': {
    nodeId: 'week01-station',
    kicker: 'World 01 · Recommender Foundations',
    cards: [
      {
        heading: WEEK01_LESSON.title,
        body: WEEK01_LESSON.intro,
        narration: 'Start with the decision, the evidence and the stages. Every later model fits into this map.',
        icon: 'goal',
        intro: true,
        terms: [
          { term: 'Decision', definition: 'Choose a small ordered slate for this user and moment.' },
          { term: 'Evidence', definition: 'Interpret logged behavior without mistaking it for ground truth.' },
          { term: 'Pipeline', definition: 'Narrow, score, constrain and serve candidates in stages.' },
          { term: 'Evaluation', definition: 'Measure ranking quality offline and product value online.' },
        ],
      },
      ...WEEK01_LESSON.sections,
    ],
  },
  'two-tower-lesson': {
    nodeId: 'two-tower-lesson',
    kicker: 'World 02 · Retrieval Systems',
    cards: [
      {
        heading: WEEK02_LESSON.title,
        body: WEEK02_LESSON.intro,
        narration: 'Preserve useful options under a strict latency budget; ranking can only work with what retrieval keeps.',
        icon: 'twotower',
        intro: true,
        terms: [
          { term: 'Candidate generation', definition: 'Fast narrowing from the full catalogue to a rankable shortlist.' },
          { term: 'Embedding', definition: 'A vector representation used to compare users and items geometrically.' },
          { term: 'ANN index', definition: 'A data structure for fast approximate vector search.' },
          { term: 'Retrieval recall', definition: 'The share of relevant items preserved for downstream ranking.' },
        ],
      },
      ...WEEK02_LESSON.sections,
    ],
  },
  'transformer-lesson': {
    nodeId: 'transformer-lesson',
    kicker: 'World 03 · Sequential Models',
    cards: [
      {
        heading: WEEK03_LESSON.title,
        body: WEEK03_LESSON.intro,
        narration: 'Order turns a bag of preferences into a changing intent. Attention learns which earlier events matter now.',
        icon: 'attention',
        intro: true,
        terms: [
          { term: 'Sequence', definition: 'An ordered history whose transitions and recency carry meaning.' },
          { term: 'Self-attention', definition: 'A mechanism that lets each position gather context from other positions.' },
          { term: 'Causal mask', definition: 'A boundary preventing future events from leaking into a prediction.' },
          { term: 'Session state', definition: 'A representation of the user’s current short-term intent.' },
        ],
      },
      ...WEEK03_LESSON.sections,
    ],
  },
  'policy-lesson': {
    nodeId: 'policy-lesson',
    kicker: 'World 04 · Decisions and Policies',
    cards: [
      {
        heading: WEEK04_LESSON.title,
        body: WEEK04_LESSON.intro,
        narration: 'A model estimates; a policy acts. Exploration is the price of learning what the current policy cannot yet know.',
        icon: 'policy',
        intro: true,
        terms: [
          { term: 'Policy', definition: 'A rule or probability distribution for choosing an action in a state.' },
          { term: 'Exploration', definition: 'Allocating decisions to uncertain actions in order to learn.' },
          { term: 'Regret', definition: 'Accumulated reward lost relative to the best available action.' },
          { term: 'Return', definition: 'Immediate and future reward attributed to a sequence of decisions.' },
        ],
      },
      ...WEEK04_LESSON.sections,
    ],
  },
  'ecosystem-lesson': {
    nodeId: 'ecosystem-lesson',
    kicker: 'World 05 · Feedback Ecosystems',
    cards: [
      {
        heading: WEEK05_LESSON.title,
        body: WEEK05_LESSON.intro,
        narration: 'The policy allocates attention and then learns from that allocation. Ecosystem quality must be designed, not assumed.',
        icon: 'diversity',
        intro: true,
        terms: [
          { term: 'Exposure', definition: 'The opportunity an item received to be seen and acted on.' },
          { term: 'Propensity', definition: 'The logging policy’s probability of choosing an observed action.' },
          { term: 'Slate diversity', definition: 'The breadth of information or intent represented within one response.' },
          { term: 'Catalogue health', definition: 'Sustainable breadth, freshness and supply across the item ecosystem.' },
        ],
      },
      ...WEEK05_LESSON.sections,
    ],
  },
  'capstone-lesson': {
    nodeId: 'capstone-lesson',
    kicker: 'World 06 · System Synthesis',
    cards: [
      {
        heading: CAPSTONE_LESSON.title,
        body: CAPSTONE_LESSON.intro,
        narration: 'A production design is a chain of explicit contracts, measurements and failure plans, not a pile of models.',
        icon: 'capstone',
        intro: true,
        terms: [
          { term: 'Decision contract', definition: 'The request, objective, eligible catalogue, constraints and budget.' },
          { term: 'Stage contract', definition: 'The input, output, metric and latency responsibility of a pipeline stage.' },
          { term: 'Lineage', definition: 'The trace from source evidence to every recommendation decision.' },
          { term: 'Operational readiness', definition: 'Monitoring, fallback, rollback and ownership prepared before launch.' },
        ],
      },
      ...CAPSTONE_LESSON.sections,
    ],
  },
}

/**
 * Focused theory reader. The world remains visible as context, while the lesson itself owns the
 * interaction surface; the only character left in the scene is the player's explorer.
 */
export function StudyMode() {
  const completeNode = useProgress((s) => s.completeNode)
  const closeNode = useProgress((s) => s.closeNode)
  const activeNodeId = useProgress((s) => s.activeNodeId)
  const setLessonPage = useProgress((s) => s.setLessonPage)

  const lesson = useMemo(
    () => LESSONS[activeNodeId ?? 'week01-station'] ?? LESSONS['week01-station'],
    [activeNodeId],
  )
  const cards = lesson.cards
  const done = useProgress((s) => s.completed[lesson.nodeId])

  const [index, setIndex] = useState(() => Math.min(useProgress.getState().lessonPage, cards.length - 1))
  const card = cards[index]
  const last = index === cards.length - 1
  const progress = ((index + 1) / cards.length) * 100


  useEffect(() => {
    setIndex(Math.min(useProgress.getState().lessonPage, cards.length - 1))
  }, [cards.length, lesson.nodeId])

  useEffect(() => {
    setLessonPage(index)
  }, [index, setLessonPage])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        setIndex((value) => Math.min(cards.length - 1, value + 1))
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setIndex((value) => Math.max(0, value - 1))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cards.length])

  const finish = () => {
    completeNode(lesson.nodeId)
    closeNode()
  }

  if (LESSONS[lesson.nodeId]) {
    return (
      <ImaxLesson
        kicker={lesson.kicker}
        cards={cards}
        card={card}
        index={index}
        progress={progress}
        done={done}
        onSelect={setIndex}
        onClose={closeNode}
        onFinish={finish}
      />
    )
  }

  return (
    <div className="study-cinematic">
      <article className="holo-panel lesson-panel" role="dialog" aria-modal="true" aria-labelledby="lesson-title">
        <div className="holo-head">
          <div className="lesson-heading-meta">
            <span className="holo-kicker">{lesson.kicker}</span>
            <span className="lesson-progress-label">Concept {index + 1} of {cards.length}</span>
          </div>
          <button type="button" className="lesson-close" onClick={closeNode} aria-label="Close lesson" title="Close lesson">
            <X size={19} aria-hidden />
          </button>
        </div>

        <div className="lesson-progress" aria-hidden>
          <i style={{ width: `${progress}%` }} />
        </div>

        <section className="lesson-grid" key={`${lesson.nodeId}-${index}`}>
          <div className="lesson-visual-column">
            <div className="holo-display">
              {card.video ? (
                <video className="holo-video" src={card.video} autoPlay loop muted playsInline />
              ) : (
                <HoloVisual icon={card.icon} intro={card.intro} />
              )}
            </div>
            {card.narration && (
              <div className="holo-insight">
                <Lightbulb size={18} aria-hidden />
                <p>{card.narration}</p>
              </div>
            )}
          </div>

          <div className="lesson-copy-column">
            <h1 className="holo-title" id="lesson-title">{card.heading}</h1>
            <div className="holo-body">
              <p>{card.body}</p>
              {card.formula && <div className="holo-formula">{card.formula}</div>}
              {card.terms && card.terms.length > 0 && (
                <div className="lesson-glossary">
                  <h2>Key terms</h2>
                  <dl className="holo-terms">
                    {card.terms.map(({ term, definition }) => (
                      <div key={term}>
                        <dt>{term}</dt>
                        <dd>{definition}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          </div>
        </section>

        <footer className="holo-nav">
          <button
            type="button"
            className="btn ghost lesson-nav-button"
            disabled={index === 0}
            onClick={() => setIndex((value) => Math.max(0, value - 1))}
          >
            <ArrowLeft size={17} aria-hidden />
            Back
          </button>

          <div className="lesson-page-index">
            <div className="holo-dots" aria-label="Lesson concepts">
              {cards.map((item, itemIndex) => (
                <button
                  type="button"
                  key={item.heading}
                  className={`dot ${itemIndex === index ? 'on' : ''} ${itemIndex < index ? 'seen' : ''}`}
                  onClick={() => setIndex(itemIndex)}
                  aria-label={`Open concept ${itemIndex + 1}: ${item.heading}`}
                  aria-current={itemIndex === index ? 'step' : undefined}
                />
              ))}
            </div>
            <span className="holo-count">{index + 1} / {cards.length}</span>
          </div>

          <button
            type="button"
            className="btn primary lesson-nav-button lesson-next"
            onClick={last ? finish : () => setIndex((value) => value + 1)}
          >
            {last ? (
              <>
                <Check size={17} aria-hidden />
                {done ? 'Close review' : 'Complete theory'}
              </>
            ) : (
              <>
                Next
                <ArrowRight size={17} aria-hidden />
              </>
            )}
          </button>
        </footer>
      </article>
    </div>
  )
}
function ImaxLesson({
  kicker,
  cards,
  card,
  index,
  progress,
  done,
  onSelect,
  onClose,
  onFinish,
}: {
  kicker: string
  cards: Card[]
  card: Card
  index: number
  progress: number
  done: boolean
  onSelect: (index: number) => void
  onClose: () => void
  onFinish: () => void
}) {
  const [notesOpen, setNotesOpen] = useState(false)
  const last = index === cards.length - 1

  useEffect(() => {
    setNotesOpen(false)
  }, [index])

  return (
    <div
      className={'imax-study ' + (notesOpen ? 'notes-open' : '')}
      role="dialog"
      aria-modal="true"
      aria-labelledby="imax-concept-title"
    >
      <header className="imax-topbar">
        <div className="imax-brand">
          <span>IMAX THEORY</span>
          <strong>{kicker}</strong>
        </div>
        <div className="imax-top-progress" aria-label={'Concept ' + (index + 1) + ' of ' + cards.length}>
          <span>{String(index + 1).padStart(2, '0')}</span>
          <i aria-hidden><b style={{ width: String(progress) + '%' }} /></i>
          <small>{cards.length}</small>
        </div>
        <button type="button" className="imax-icon-button" onClick={onClose} aria-label="Close IMAX lesson" title="Close">
          <X size={19} aria-hidden />
        </button>
      </header>

      <section className="imax-caption" aria-label="Current concept">
        <span>CONCEPT {String(index + 1).padStart(2, '0')}</span>
        <h1 id="imax-concept-title">{card.heading}</h1>
        <p>{card.narration ?? card.body}</p>
        <button type="button" className="imax-explore-button" onClick={onClose} aria-label="Explore exhibits">
          <Compass size={17} aria-hidden />
          <span>Explore exhibits</span>
        </button>
      </section>

      <button
        type="button"
        className={'imax-notes-toggle ' + (notesOpen ? 'is-open' : '')}
        onClick={() => setNotesOpen((value) => !value)}
        aria-expanded={notesOpen}
        aria-controls="imax-theory-notes"
      >
        <BookOpen size={17} aria-hidden />
        Theory notes
      </button>

      <aside className="imax-notes" id="imax-theory-notes" aria-hidden={!notesOpen}>
        <header>
          <span>DETAILED THEORY</span>
          <button type="button" className="imax-icon-button" onClick={() => setNotesOpen(false)} aria-label="Close theory notes">
            <X size={18} aria-hidden />
          </button>
        </header>
        <div className="imax-notes-scroll">
          <h2>{card.heading}</h2>
          <p>{card.body}</p>
          {card.formula && <div className="imax-notes-formula">{card.formula}</div>}
          {card.terms && card.terms.length > 0 && (
            <div className="imax-notes-terms">
              <h3>Key terms</h3>
              <dl>
                {card.terms.map(({ term, definition }) => (
                  <div key={term}>
                    <dt>{term}</dt>
                    <dd>{definition}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </aside>

      <footer className="imax-controls">
        <button
          type="button"
          className="imax-control-button"
          disabled={index === 0}
          onClick={() => onSelect(Math.max(0, index - 1))}
          aria-label="Previous concept"
        >
          <ArrowLeft size={18} aria-hidden />
        </button>

        <div className="imax-chapters" aria-label="Theory chapters">
          {cards.map((item, itemIndex) => (
            <button
              type="button"
              key={item.heading}
              className={(itemIndex === index ? 'is-active ' : '') + (itemIndex < index ? 'is-seen' : '')}
              onClick={() => onSelect(itemIndex)}
              aria-label={'Open concept ' + (itemIndex + 1) + ': ' + item.heading}
              aria-current={itemIndex === index ? 'step' : undefined}
            >
              {String(itemIndex + 1).padStart(2, '0')}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={'imax-next-button ' + (last ? 'is-complete' : '')}
          onClick={last ? onFinish : () => onSelect(index + 1)}
          aria-label={last ? (done ? 'Return to world' : 'Complete & explore') : 'Next concept'}
        >
          {last ? (
            <>
              <Check size={18} aria-hidden />
              <span>{done ? 'Return to world' : 'Complete & explore'}</span>
            </>
          ) : (
            <>
              <span>Next concept</span>
              <ArrowRight size={18} aria-hidden />
            </>
          )}
        </button>
      </footer>
    </div>
  )
}


/** Lightweight fallback visual used by worlds that do not have rendered Manim films yet. */
function HoloVisual({ icon, intro }: { icon?: string; intro?: boolean }) {
  if (icon === 'goal') {
    return (
      <div className="hv hv-goal">
        <div className="goal-sources">
          <span className="goal-user">U</span>
          <div className="goal-catalog">
            {Array.from({ length: 9 }).map((_, item) => <i key={item} />)}
          </div>
        </div>
        <span className="goal-arrow">→</span>
        <div className="goal-slate">
          {[0.96, 0.83, 0.71].map((score, rank) => (
            <span key={score} style={{ animationDelay: `${rank * 0.12}s` }}>
              <b>{rank + 1}</b>
              <i />
              <em>{score}</em>
            </span>
          ))}
        </div>
        <div className="hv-caption">user + context + catalogue → ordered slate</div>
      </div>
    )
  }
  if (icon === 'entities') {
    return (
      <div className="hv hv-entities">
        <div className="entity-map">
          <span className="entity user">user</span>
          <span className="entity context">context</span>
          <span className="entity interaction">interaction</span>
          <span className="entity item">item</span>
          <span className="entity catalogue">catalogue</span>
          <i className="entity-link one" />
          <i className="entity-link two" />
          <i className="entity-link three" />
          <i className="entity-link four" />
        </div>
        <div className="hv-caption">name the entities before choosing the model</div>
      </div>
    )
  }
  if (icon === 'signals') {
    return (
      <div className="hv hv-signals">
        {[
          ['impression', 'exposure'],
          ['click', 'implicit'],
          ['watch 82%', 'implicit'],
          ['rating 5★', 'explicit'],
        ].map(([event, kind], item) => (
          <div className={`signal-event signal-${kind}`} key={event} style={{ animationDelay: `${item * 0.1}s` }}>
            <i />
            <strong>{event}</strong>
            <span>{kind}</span>
          </div>
        ))}
        <div className="hv-caption">behavior becomes evidence only with exposure and context</div>
      </div>
    )
  }
  if (icon === 'pipeline') {
    return (
      <div className="hv hv-pipeline">
        {[
          ['01', 'retrieve', '1M → 1k'],
          ['02', 'rank', '1k → 100'],
          ['03', 'select', '100 → 20'],
          ['04', 'serve', '20 items'],
        ].map(([number, label, volume], item) => (
          <div className="pipeline-stage" key={label} style={{ animationDelay: `${item * 0.12}s` }}>
            <span>{number}</span>
            <strong>{label}</strong>
            <small>{volume}</small>
          </div>
        ))}
        <div className="hv-caption">each stage narrows, scores or constrains the response</div>
      </div>
    )
  }
  if (icon === 'scores') {
    return (
      <div className="hv hv-scores">
        {[
          ['Film A', 92, 'clicked'],
          ['Film B', 74, 'not clicked'],
          ['Film C', 61, 'unseen'],
        ].map(([label, score, outcome], item) => (
          <div className="score-row" key={String(label)} style={{ animationDelay: `${item * 0.12}s` }}>
            <strong>{label}</strong>
            <div><i style={{ width: `${score}%` }} /></div>
            <span>{outcome}</span>
          </div>
        ))}
        <div className="hv-caption">a score estimates a label; it is not ground truth</div>
      </div>
    )
  }
  if (icon === 'coldstart') {
    return (
      <div className="hv hv-coldstart">
        <div className="cold-profile">
          <span>new user</span>
          <div>{Array.from({ length: 5 }).map((_, item) => <i key={item} />)}</div>
          <small>no history</small>
        </div>
        <span className="cold-plus">+</span>
        <div className="cold-bridge">
          <span>context</span>
          <span>metadata</span>
          <span>popular now</span>
        </div>
        <span className="cold-arrow">→</span>
        <div className="cold-first">first slate</div>
        <div className="hv-caption">start simple, explore, then personalize as evidence arrives</div>
      </div>
    )
  }
  if (icon === 'order' || (intro && !icon)) {
    return (
      <div className="hv">
        {[1, 0.66, 0.44, 0.28, 0.18].map((w, k) => (
          <div key={k} className="hv-row" style={{ animationDelay: `${k * 0.15}s` }}>
            <span className="hv-rank">{k + 1}</span>
            <div className="hv-bar" style={{ width: `${w * 100}%`, opacity: 0.4 + w * 0.6 }} />
          </div>
        ))}
        <div className="hv-caption">read top-down · weight drops with position</div>
      </div>
    )
  }
  if (icon === 'ndcg') {
    return (
      <div className="hv hv-bars">
        {[0.9, 0.35, 0.7, 0.5, 0.85, 0.3].map((h, k) => (
          <div key={k} className="hv-col" style={{ height: `${h * 100}%`, animationDelay: `${k * 0.12}s` }} />
        ))}
        <div className="hv-caption">discounted gain by position</div>
      </div>
    )
  }
  if (icon === 'recall') {
    return (
      <div className="hv hv-recall">
        <div className="hv-ring" />
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <span key={k} className={`hv-dot ${k < 4 ? 'in' : 'out'}`} style={{ transform: `rotate(${k * 60}deg) translateX(78px)`, animationDelay: `${k * 0.1}s` }} />
        ))}
        <div className="hv-caption">how many relevant made the slate</div>
      </div>
    )
  }
  if (icon === 'twotower') {
    return (
      <div className="hv hv-twotower">
        <div className="tw-col tw-user">
          <span className="tw-cap">user</span>
          {[0, 1, 2].map((k) => <div key={k} className="tw-layer" style={{ animationDelay: `${k * 0.12}s` }} />)}
        </div>
        <div className="tw-space"><span className="tw-vec u" /><span className="tw-vec i" /></div>
        <div className="tw-col tw-item">
          <span className="tw-cap">item</span>
          {[0, 1, 2].map((k) => <div key={k} className="tw-layer" style={{ animationDelay: `${0.3 + k * 0.12}s` }} />)}
        </div>
        <div className="hv-caption">two towers → one shared space</div>
      </div>
    )
  }
  if (icon === 'ann') {
    return (
      <div className="hv hv-ann">
        <span className="ann-q" />
        {Array.from({ length: 14 }).map((_, k) => {
          const a = (k / 14) * Math.PI * 2
          const r = 40 + (k % 3) * 22
          const near = r < 55
          return (
            <span
              key={k}
              className={`ann-pt ${near ? 'near' : ''}`}
              style={{ left: `calc(50% + ${Math.cos(a) * r}px)`, top: `calc(50% + ${Math.sin(a) * r}px)`, animationDelay: `${k * 0.05}s` }}
            />
          )
        })}
        <div className="ann-ring" />
        <div className="hv-caption">approximate nearest neighbours</div>
      </div>
    )
  }
  if (icon === 'negatives') {
    return (
      <div className="hv hv-neg">
        <span className="neg-anchor" />
        <span className="neg-pos" />
        {[0, 1, 2, 3].map((k) => (
          <span key={k} className="neg-neg" style={{ transform: `rotate(${k * 90 + 45}deg) translateX(72px)`, animationDelay: `${k * 0.12}s` }} />
        ))}
        <div className="hv-caption">pull positives in · push negatives out</div>
      </div>
    )
  }
  if (icon === 'inbatch') {
    return (
      <div className="hv hv-inbatch">
        {Array.from({ length: 16 }).map((_, k) => {
          const diag = k % 5 === 0
          return <span key={k} className={`ib-cell ${diag ? 'pos' : 'neg'}`} style={{ animationDelay: `${k * 0.04}s` }} />
        })}
        <div className="hv-caption">diagonal = positives · rest = free negatives</div>
      </div>
    )
  }
  if (icon === 'attention') {
    return (
      <div className="hv hv-attn">
        <span className="attn-q">Q</span>
        <div className="attn-keys">
          {[0.9, 0.4, 0.65, 0.25].map((w, k) => (
            <div key={k} className="attn-key" style={{ animationDelay: `${k * 0.12}s` }}>
              <span className="attn-k">K</span>
              <div className="attn-bar" style={{ width: `${w * 100}%` }} />
            </div>
          ))}
        </div>
        <div className="hv-caption">query weights every key · softmax</div>
      </div>
    )
  }
  if (icon === 'multihead') {
    return (
      <div className="hv hv-mh">
        {['#ff6bd0', '#b06bff', '#6bd0ff', '#8affc9'].map((c, k) => (
          <div key={k} className="mh-head" style={{ animationDelay: `${k * 0.12}s` }}>
            {Array.from({ length: 9 }).map((_, j) => (
              <span key={j} style={{ background: c, opacity: 0.25 + ((j * 7 + k * 3) % 5) * 0.18 }} />
            ))}
          </div>
        ))}
        <div className="hv-caption">heads in parallel · different relations</div>
      </div>
    )
  }
  if (icon === 'transformer') {
    return (
      <div className="hv hv-tf">
        {['Embed', 'Multi-Head Attention', 'Add & Norm', 'Feed Forward', 'Layer Norm'].map((l, k) => (
          <div key={l} className={`tf-row ${l.includes('Norm') ? 'norm' : ''}`} style={{ animationDelay: `${k * 0.12}s` }}>{l}</div>
        ))}
        <div className="hv-caption">one block · stacked ×N</div>
      </div>
    )
  }
  if (icon === 'flash') {
    return (
      <div className="hv hv-flash">
        <div className="flash-col">
          <div className="flash-big" />
          <span>standard · O(N²)</span>
        </div>
        <div className="flash-col">
          <div className="flash-tiles">{Array.from({ length: 4 }).map((_, k) => <i key={k} style={{ animationDelay: `${k * 0.15}s` }} />)}</div>
          <span>flash · O(N)</span>
        </div>
        <div className="hv-caption">same result · tiled in fast memory</div>
      </div>
    )
  }
  if (icon === 'explore') {
    return (
      <div className="hv hv-explore">
        {[0.35, 0.9, 0.5, 0.62].map((h, k) => (
          <div key={k} className={`ex-arm ${k === 1 ? 'best' : ''}`} style={{ animationDelay: `${k * 0.12}s` }}>
            <div className="ex-fill" style={{ height: `${h * 100}%` }} />
            <span>{k === 1 ? '?' : ''}</span>
          </div>
        ))}
        <div className="hv-caption">exploit the winner · explore the unknown</div>
      </div>
    )
  }
  if (icon === 'bandit') {
    return (
      <div className="hv hv-ucb">
        {[0.9, 0.55, 0.7, 0.4].map((m, k) => (
          <div key={k} className="ucb-arm" style={{ animationDelay: `${k * 0.12}s` }}>
            <div className="ucb-mean" style={{ height: `${m * 100}%` }} />
            <div className="ucb-bonus" style={{ height: `${(1 - m) * 60}%` }} />
          </div>
        ))}
        <div className="hv-caption">mean + confidence bonus = optimism</div>
      </div>
    )
  }
  if (icon === 'policy') {
    return (
      <div className="hv hv-policy">
        <span className="pol-node state">state</span>
        <span className="pol-arrow">→</span>
        <span className="pol-node pi">π</span>
        <span className="pol-arrow">→</span>
        <span className="pol-node act">action</span>
        <span className="pol-reward">↩ reward</span>
        <div className="hv-caption">map context to action · learn from reward</div>
      </div>
    )
  }
  if (icon === 'beam') {
    return (
      <div className="hv hv-beam">
        {[[50], [28, 72], [16, 40, 60, 84]].map((row, r) => (
          <div key={r} className="beam-row">
            {row.map((x, c) => (
              <span
                key={c}
                className={`beam-node ${r === 2 && (c === 0 || c === 2) ? 'keep' : ''}`}
                style={{ left: `${x}%`, animationDelay: `${(r * 4 + c) * 0.08}s` }}
              />
            ))}
          </div>
        ))}
        <div className="hv-caption">keep top-B partial slates · extend · prune</div>
      </div>
    )
  }
  if (icon === 'feedback') {
    return (
      <div className="hv hv-feedback">
        {['shown', 'clicked', 'logged', 'trained'].map((l, k) => (
          <span key={l} className="fb-node" style={{ animationDelay: `${k * 0.2}s` }}>{l}</span>
        ))}
        <div className="fb-loop" />
        <div className="hv-caption">the model shapes its own next data</div>
      </div>
    )
  }
  if (icon === 'diversity') {
    return (
      <div className="hv hv-diversity">
        <div className="dv-bubble">
          {[0, 1, 2, 3, 4].map((k) => <span key={k} style={{ background: '#ff6bd0' }} />)}
          <b>λ=1 · bubble</b>
        </div>
        <div className="dv-mix">
          {['#ff6bd0', '#6bd0ff', '#ffd36b', '#8affc9', '#c08bff'].map((c, k) => <span key={k} style={{ background: c }} />)}
          <b>balanced</b>
        </div>
        <div className="hv-caption">relevance − similarity, tuned by λ</div>
      </div>
    )
  }
  if (icon === 'debias') {
    return (
      <div className="hv hv-debias">
        {[0.95, 0.55, 0.32, 0.18].map((raw, k) => (
          <div key={k} className="db-row" style={{ animationDelay: `${k * 0.14}s` }}>
            <span className="db-slot">#{k + 1}</span>
            <div className="db-bar raw" style={{ width: `${raw * 100}%` }} />
            <div className="db-bar corr" style={{ width: `${Math.min(100, raw * (1 + k * 0.55) * 100)}%` }} />
          </div>
        ))}
        <div className="hv-caption">reweight by 1 / P(shown)</div>
      </div>
    )
  }
  if (icon === 'churn') {
    return (
      <div className="hv hv-churn">
        <div className="ch-line ctr" />
        <div className="ch-line ret" />
        <span className="ch-lab ctr">CTR chase → churn</span>
        <span className="ch-lab ret">balance → growth</span>
        <div className="hv-caption">optimise for who is still here next month</div>
      </div>
    )
  }
  return (
    <div className="hv hv-cov">
      {['#ff6bd0', '#7ad0ff', '#ffd36b', '#a855ff', '#8affc9'].map((c, k) => (
        <span key={k} className="hv-flower" style={{ background: c, animationDelay: `${k * 0.14}s` }} />
      ))}
      <div className="hv-caption">span distinct categories</div>
    </div>
  )
}
