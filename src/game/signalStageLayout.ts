import type { NavigationObstacle } from './courseNavigation'

export const SIGNAL_CONTENT_GROUP_POSITION = [2.78, 2.15] as const
export const SIGNAL_CONTENT_GROUP_ROTATION_Y = -0.28
export const SIGNAL_CONTENT_PEDESTALS = [
  { x: -0.72, z: 0.08 },
  { x: 0, z: -0.12 },
  { x: 0.72, z: 0.08 },
] as const

export const SIGNAL_REPLAY_CONSOLE_POSITION = [-1.2, -0.95] as const
export const SIGNAL_SCREEN_POSITION = [-1.75, -2.15] as const
export const SIGNAL_SCREEN_ROTATION_Y = 0.28
export const SIGNAL_SCREEN_SCALE = 0.8

function contentStagePosition(localX: number, localZ: number): { x: number; z: number } {
  const cosine = Math.cos(SIGNAL_CONTENT_GROUP_ROTATION_Y)
  const sine = Math.sin(SIGNAL_CONTENT_GROUP_ROTATION_Y)
  return {
    x: SIGNAL_CONTENT_GROUP_POSITION[0] + localX * cosine + localZ * sine,
    z: SIGNAL_CONTENT_GROUP_POSITION[1] - localX * sine + localZ * cosine,
  }
}

const contentPedestalObstacles: NavigationObstacle[] = SIGNAL_CONTENT_PEDESTALS.map(
  ({ x, z }, index) => ({
    id: `signal-content-${index + 1}`,
    ...contentStagePosition(x, z),
    radius: 0.46,
  }),
)

const screenObstacles: NavigationObstacle[] = [-3.6, -1.8, 0, 1.8, 3.6].map((localX, index) => {
  const scaledX = localX * SIGNAL_SCREEN_SCALE
  return {
    id: `signal-screen-${index + 1}`,
    x: SIGNAL_SCREEN_POSITION[0] + scaledX * Math.cos(SIGNAL_SCREEN_ROTATION_Y),
    z: SIGNAL_SCREEN_POSITION[1] - scaledX * Math.sin(SIGNAL_SCREEN_ROTATION_Y),
    radius: 0.58,
  }
})

export const SIGNAL_STAGE_OBSTACLES: readonly NavigationObstacle[] = [
  ...screenObstacles,
  { id: 'signal-beacons', x: -3.18, z: -0.15, radius: 0.78 },
  { id: 'signal-stream-left', x: -0.45, z: -0.25, radius: 0.42 },
  { id: 'signal-stream-right', x: 0.95, z: -0.25, radius: 0.42 },
  { id: 'signal-profile', x: 3.02, z: -0.45, radius: 0.66 },
  ...contentPedestalObstacles,
]

export const SIGNAL_REPLAY_CONSOLE_OBSTACLE: NavigationObstacle = {
  id: 'signal-replay-console',
  x: SIGNAL_REPLAY_CONSOLE_POSITION[0],
  z: SIGNAL_REPLAY_CONSOLE_POSITION[1],
  radius: 0.5,
}
