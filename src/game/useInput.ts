import type { MutableRefObject } from 'react'

export interface InputState {
  forward: number
  strafe: number
  run: boolean
  interactPressed: boolean
  jumpPressed: boolean
  mapToggled: boolean
}

type InputRegistry = {
  state: MutableRefObject<InputState>
  keys: Record<string, boolean>
  installed: boolean
}

const createRegistry = (): InputRegistry => ({
  state: {
    current: {
      forward: 0,
      strafe: 0,
      run: false,
      interactPressed: false,
      jumpPressed: false,
      mapToggled: false,
    },
  },
  keys: {},
  installed: false,
})

const browserWindow = typeof window !== 'undefined'
  ? window as typeof window & { __recsysInputRegistry?: InputRegistry }
  : null

const registry = browserWindow
  ? (browserWindow.__recsysInputRegistry ??= createRegistry())
  : createRegistry()

function installListeners() {
  if (!browserWindow || registry.installed) return
  registry.installed = true

  const moveCodes = new Set([
    'KeyW', 'KeyA', 'KeyS', 'KeyD',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
  ])

  const isTypingTarget = (target: EventTarget | null) => {
    const element = target as HTMLElement | null
    if (!element) return false
    return element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.isContentEditable
  }

  const recompute = () => {
    const keys = registry.keys
    registry.state.current.forward =
      (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0)
    registry.state.current.strafe =
      (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0)
    registry.state.current.run = Boolean(keys.ShiftLeft || keys.ShiftRight)
  }

  browserWindow.addEventListener('keydown', (event) => {
    if (isTypingTarget(event.target)) return
    const code = event.code
    if (code === 'KeyE' && !registry.keys.KeyE) registry.state.current.interactPressed = true
    if (code === 'KeyM' && !registry.keys.KeyM) registry.state.current.mapToggled = true
    if (code === 'Space' && !registry.keys.Space) registry.state.current.jumpPressed = true
    registry.keys[code] = true
    if (moveCodes.has(code)) event.preventDefault()
    recompute()
  })

  browserWindow.addEventListener('keyup', (event) => {
    registry.keys[event.code] = false
    recompute()
  })

  browserWindow.addEventListener('blur', () => {
    registry.keys = {}
    recompute()
  })
}

installListeners()

/** Shared keyboard state for the player and the interaction system. */
export function useInput() {
  installListeners()
  return registry.state
}
