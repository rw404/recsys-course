import type { WorldId } from '../state/progress'

/**
 * Per-world theme — a single source of truth for each region's identity so shared components
 * (stations, ground dressing, decor) can be authored ONCE and tinted per world instead of the
 * scene scaffold being copy-pasted six times. `accent` recolours shared station models; `ground`
 * drives the textured GroundDressing (pattern + palette + tint).
 */
export type GroundPattern = 'tile' | 'speckle' | 'panel'

export interface WorldTheme {
  accent: string
  glow: string
  /** textured ground: a small palette + a pattern style + an overall tint, blended over the island */
  ground: {
    pattern: GroundPattern
    palette: [string, string, string]
    tint: string
  }
}

export const WORLD_THEMES: Record<WorldId, WorldTheme> = {
  'foundations-camp': {
    accent: '#a86bff', glow: '#a86bff',
    ground: { pattern: 'tile', palette: ['#5a4a2e', '#4a3a24', '#6b5233'], tint: '#c8a878' },
  },
  'retrieval-valley': {
    accent: '#6bd0ff', glow: '#6bd0ff',
    ground: { pattern: 'speckle', palette: ['#3f6058', '#33504a', '#4c7266'], tint: '#9ac2b6' },
  },
  'sequential-city': {
    accent: '#ff5fd0', glow: '#ff5fd0',
    ground: { pattern: 'panel', palette: ['#40376e', '#4c4088', '#352c5c'], tint: '#b6a6de' },
  },
  'policy-tower': {
    accent: '#ffb04f', glow: '#ffb04f',
    ground: { pattern: 'panel', palette: ['#4e4560', '#5a4e70', '#403748'], tint: '#cbb49c' },
  },
  'ecosystem-garden': {
    accent: '#8affc9', glow: '#8affc9',
    ground: { pattern: 'speckle', palette: ['#3f624c', '#345240', '#4c7258'], tint: '#94c4a6' },
  },
  'final-arena': {
    accent: '#e6b85a', glow: '#e6b85a',
    ground: { pattern: 'tile', palette: ['#4c4480', '#585094', '#403a6e'], tint: '#c4b4e8' },
  },
}

export function worldTheme(id: WorldId): WorldTheme {
  return WORLD_THEMES[id] ?? WORLD_THEMES['foundations-camp']
}
