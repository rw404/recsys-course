import { useEffect, useMemo, useState } from 'react'
import { WEEK01_LESSON, WEEK02_LESSON, WEEK03_LESSON, type LessonSection } from '../data/course'
import { useProgress, type NodeId } from '../state/progress'

type Card = LessonSection & { intro?: boolean }

/** Per-lesson content, keyed by the lesson node the player interacted with. */
const LESSONS: Record<
  string,
  { nodeId: NodeId; kicker: string; narrator: string; cards: Card[] }
> = {
  'week01-station': {
    nodeId: 'week01-station',
    kicker: 'Theory Module · Metrics Plaza',
    narrator: 'Guide Astra',
    cards: [
      {
        heading: WEEK01_LESSON.title,
        body: WEEK01_LESSON.intro,
        narration: "Metrics are your compass. Let's learn to measure what matters — step by step.",
        icon: 'order',
        intro: true,
      },
      ...WEEK01_LESSON.sections,
    ],
  },
  'two-tower-lesson': {
    nodeId: 'two-tower-lesson',
    kicker: 'Theory Module · ANN Lab',
    narrator: 'Vector Smith',
    cards: [
      {
        heading: WEEK02_LESSON.title,
        body: WEEK02_LESSON.intro,
        narration: 'Millions of items, milliseconds to answer. Retrieval is how we cope.',
        icon: 'twotower',
        intro: true,
      },
      ...WEEK02_LESSON.sections,
    ],
  },
  'transformer-lesson': {
    nodeId: 'transformer-lesson',
    kicker: 'Theory Module · Transformer Tower',
    narrator: 'Guide Astra',
    cards: [
      {
        heading: WEEK03_LESSON.title,
        body: WEEK03_LESSON.intro,
        narration: 'Transformers process sequences with attention. Let’s step inside.',
        icon: 'attention',
        intro: true,
      },
      ...WEEK03_LESSON.sections,
    ],
  },
}

/**
 * Cinematic lesson: the camera zooms to the narrator (3D, on the right) while this holographic
 * theory panel takes the left of the screen. The right side is transparent so the narrator shows
 * through, with their speech bubble floating over them. Content is chosen by the active lesson node.
 */
export function StudyMode() {
  const completeNode = useProgress((s) => s.completeNode)
  const closeNode = useProgress((s) => s.closeNode)
  const setLessonPage = useProgress((s) => s.setLessonPage)
  const activeNodeId = useProgress((s) => s.activeNodeId)

  const lesson = useMemo(
    () => LESSONS[activeNodeId ?? 'week01-station'] ?? LESSONS['week01-station'],
    [activeNodeId]
  )
  const CARDS = lesson.cards
  const done = useProgress((s) => s.completed[lesson.nodeId])

  const [i, setI] = useState(0)
  const card = CARDS[i]
  const last = i === CARDS.length - 1

  // publish the active slide so the 3D narrator can play a per-page gesture
  useEffect(() => {
    setLessonPage(i)
  }, [i, setLessonPage])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setI((v) => Math.min(CARDS.length - 1, v + 1))
      if (e.key === 'ArrowLeft') setI((v) => Math.max(0, v - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const finish = () => {
    completeNode(lesson.nodeId)
    closeNode()
  }
  const primary = () => (last ? finish() : setI((v) => v + 1))

  return (
    <div className="study-cinematic">
      {/* LEFT — holographic theory module */}
      <div className="holo-panel">
        <div className="holo-frame" aria-hidden>
          <i /><i /><i /><i />
        </div>
        <div className="holo-head">
          <span className="holo-kicker">{lesson.kicker}</span>
          <button className="btn ghost" onClick={closeNode}>✕ Esc</button>
        </div>

        <h1 className="holo-title">{card.heading}</h1>

        <div className="holo-display">
          {card.video ? (
            <video className="holo-video" src={card.video} autoPlay loop muted playsInline />
          ) : (
            <HoloVisual icon={card.icon} intro={card.intro} />
          )}
          <span className="holo-scan" aria-hidden />
        </div>

        <div className="holo-body">
          <p>{card.body}</p>
          {card.formula && <div className="holo-formula">{card.formula}</div>}
        </div>

        <div className="holo-nav">
          <button className="btn ghost" disabled={i === 0} onClick={() => setI(i - 1)} style={{ opacity: i === 0 ? 0.4 : 1 }}>
            ‹ Back
          </button>
          <div className="holo-dots">
            {CARDS.map((_, k) => (
              <span key={k} className={`dot ${k === i ? 'on' : ''} ${k < i ? 'seen' : ''}`} onClick={() => setI(k)} />
            ))}
          </div>
          <span className="holo-count">
            {last ? 'final' : `scroll for next ›`} &nbsp; {i + 1}/{CARDS.length}
          </span>
        </div>
      </div>

      {/* RIGHT — floats over the 3D narrator (Astra shows through the transparent area) */}
      <div className="study-right">
        <div className="narrator-float">
          <div className="narrator-name">{lesson.narrator}</div>
          <div className="narrator-bubble">{card.narration ?? card.body}</div>
        </div>
        <div className="narrator-actions">
          <button className="btn primary big" onClick={primary}>
            {last ? (done ? 'Reviewed — close' : 'Complete checkpoint →') : 'Next ›'}
          </button>
          {!last && (
            <button className="btn ghost" onClick={finish}>
              Skip to lab
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/** Animated holographic "explainer" per concept (stands in for a manim clip). */
function HoloVisual({ icon, intro }: { icon?: string; intro?: boolean }) {
  if (intro || icon === 'order') {
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
  return (
    <div className="hv hv-cov">
      {['#ff6bd0', '#7ad0ff', '#ffd36b', '#a855ff', '#8affc9'].map((c, k) => (
        <span key={k} className="hv-flower" style={{ background: c, animationDelay: `${k * 0.14}s` }} />
      ))}
      <div className="hv-caption">span distinct categories</div>
    </div>
  )
}
