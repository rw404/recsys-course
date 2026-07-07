import { useEffect, useState } from 'react'
import { WEEK01_LESSON, type LessonSection } from '../data/course'
import { useProgress } from '../state/progress'

type Card = LessonSection & { intro?: boolean }

const CARDS: Card[] = [
  {
    heading: WEEK01_LESSON.title,
    body: WEEK01_LESSON.intro,
    narration: "Metrics are your compass. Let's learn to measure what matters — step by step.",
    icon: 'order',
    intro: true,
  },
  ...WEEK01_LESSON.sections,
]

/**
 * Cinematic lesson: the camera zooms to Guide Astra (3D, on the right) while this holographic
 * theory panel takes the left of the screen. The right side is transparent so Astra shows
 * through, with her speech bubble floating over her.
 */
export function StudyMode() {
  const completeNode = useProgress((s) => s.completeNode)
  const closeNode = useProgress((s) => s.closeNode)
  const setLessonPage = useProgress((s) => s.setLessonPage)
  const done = useProgress((s) => s.completed['week01-station'])

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
    completeNode('week01-station')
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
          <span className="holo-kicker">Theory Module · Metrics Plaza</span>
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
          <div className="narrator-name">Guide Astra</div>
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
  return (
    <div className="hv hv-cov">
      {['#ff6bd0', '#7ad0ff', '#ffd36b', '#a855ff', '#8affc9'].map((c, k) => (
        <span key={k} className="hv-flower" style={{ background: c, animationDelay: `${k * 0.14}s` }} />
      ))}
      <div className="hv-caption">span distinct categories</div>
    </div>
  )
}
