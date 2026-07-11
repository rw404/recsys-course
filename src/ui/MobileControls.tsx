import { useEffect, useRef, useState } from 'react'
import { MousePointer2 } from 'lucide-react'
import { NODES, useProgress } from '../state/progress'
import { touchControls, resetTouchMove } from '../game/controls'

/** True on touch/coarse-pointer devices OR narrow viewports. */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() => matchMobile())
  useEffect(() => {
    const on = () => setMobile(matchMobile())
    window.addEventListener('resize', on)
    const mq = window.matchMedia('(pointer: coarse)')
    mq.addEventListener?.('change', on)
    return () => {
      window.removeEventListener('resize', on)
      mq.removeEventListener?.('change', on)
    }
  }, [])
  return mobile
}

function matchMobile(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(pointer: coarse)').matches ||
    'ontouchstart' in window ||
    window.innerWidth <= 820
  )
}

const R = 52 // joystick travel radius (px)

export function MobileControls() {
  const isMobile = useIsMobile()
  const mode = useProgress((s) => s.mode)
  const nearbyId = useProgress((s) => s.nearbyNodeId)
  const atlasOpen = useProgress((s) => s.atlasOpen)

  const baseRef = useRef<HTMLDivElement>(null)
  const [thumb, setThumb] = useState({ x: 0, y: 0 })
  const activePointer = useRef<number | null>(null)

  // release joystick if we leave explore mode mid-drag
  useEffect(() => {
    if (mode !== 'explore') {
      activePointer.current = null
      resetTouchMove()
      setThumb({ x: 0, y: 0 })
    }
  }, [mode])

  if (!isMobile || mode !== 'explore' || atlasOpen) return null

  const start = (e: React.PointerEvent) => {
    activePointer.current = e.pointerId
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    move(e)
  }
  const move = (e: React.PointerEvent) => {
    if (activePointer.current !== e.pointerId) return
    const base = baseRef.current
    if (!base) return
    const r = base.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    let dx = e.clientX - cx
    let dy = e.clientY - cy
    const len = Math.hypot(dx, dy)
    if (len > R) {
      dx = (dx / len) * R
      dy = (dy / len) * R
    }
    setThumb({ x: dx, y: dy })
    touchControls.moveX = dx / R
    touchControls.moveY = -dy / R // screen-down is world-backward
  }
  const end = (e: React.PointerEvent) => {
    if (activePointer.current !== e.pointerId) return
    activePointer.current = null
    resetTouchMove()
    setThumb({ x: 0, y: 0 })
  }

  const prompt = nearbyId ? promptFor(nearbyId) : null

  return (
    <div className="mobile-controls">
      <div
        ref={baseRef}
        className="joystick"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <div className="joystick-thumb" style={{ transform: `translate(${thumb.x}px, ${thumb.y}px)` }} />
        <span className="joystick-hint">MOVE</span>
      </div>

      <button
        className={`interact-btn ${prompt ? 'active' : ''}`}
        aria-label={prompt ?? 'No nearby station'}
        title={prompt ?? 'No nearby station'}
        onPointerDown={(e) => {
          e.preventDefault()
          if (prompt) touchControls.interactEdge = true
        }}
      >
        <MousePointer2 size={22} />
      </button>
    </div>
  )
}

function promptFor(id: keyof typeof NODES): string {
  const node = NODES[id]
  switch (node.action) {
    case 'talk': return 'Talk'
    case 'open_lesson': return 'Open lesson'
    case 'open_lab': return 'Enter lab'
    case 'open_quiz': return 'Take quiz'
    case 'unlock_bridge': return 'Cross bridge'
    default: return 'Interact'
  }
}
