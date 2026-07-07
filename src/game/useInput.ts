import { useEffect, useRef } from 'react'

export interface InputState {
  forward: number // -1..1 (W/S)
  strafe: number // -1..1 (A/D)
  run: boolean
  interactPressed: boolean // edge-triggered, consumed by reader
  jumpPressed: boolean // edge-triggered, consumed by reader
  mapToggled: boolean
}

/**
 * Keyboard input as a ref (no re-renders in the render loop).
 * `interactPressed` and `mapToggled` are edge flags — consume them each frame.
 */
export function useInput() {
  const state = useRef<InputState>({
    forward: 0,
    strafe: 0,
    run: false,
    interactPressed: false,
    jumpPressed: false,
    mapToggled: false,
  })
  const keys = useRef<Record<string, boolean>>({})

  useEffect(() => {
    const isTypingTarget = (el: EventTarget | null) => {
      const t = el as HTMLElement | null
      if (!t) return false
      const tag = t.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA' || t.isContentEditable
    }

    // Key off e.code (physical key position), NOT e.key. e.key is layout-dependent: with a
    // Cyrillic (or other non-Latin) layout active, the WASD keys emit 'ц/ф/ы/в', so 'w'/'a'
    // checks silently fail while Space (layout-independent) still works. e.code is the same
    // regardless of layout.
    const MOVE_CODES = [
      'KeyW', 'KeyA', 'KeyS', 'KeyD',
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
    ]

    const recompute = () => {
      const k = keys.current
      const fwd = (k['KeyW'] || k['ArrowUp'] ? 1 : 0) - (k['KeyS'] || k['ArrowDown'] ? 1 : 0)
      const str = (k['KeyD'] || k['ArrowRight'] ? 1 : 0) - (k['KeyA'] || k['ArrowLeft'] ? 1 : 0)
      state.current.forward = fwd
      state.current.strafe = str
      state.current.run = !!(k['ShiftLeft'] || k['ShiftRight'])
    }

    const down = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return
      const code = e.code
      if (code === 'KeyE' && !keys.current['KeyE']) state.current.interactPressed = true
      if (code === 'KeyM' && !keys.current['KeyM']) state.current.mapToggled = true
      if (code === 'Space' && !keys.current['Space']) state.current.jumpPressed = true
      keys.current[code] = true
      if (MOVE_CODES.includes(code)) e.preventDefault()
      recompute()
    }
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false
      recompute()
    }
    const blur = () => {
      keys.current = {}
      recompute()
    }

    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [])

  return state
}
