import type { WorldId } from '../state/progress'

/**
 * Per-world theme — a single source of truth for each region's identity so shared components
 * (stations, ground, decor) can be tinted per world instead of looking identical everywhere.
 * `accent` recolours the shared station models toward the region's palette; `glow` drives ambient
 * accents. Extend this as the shared IslandBase / GroundDressing land.
 */
export interface WorldTheme {
  accent: string
  glow: string
}

export const WORLD_THEMES: Record<WorldId, WorldTheme> = {
  'foundations-camp': { accent: '#a86bff', glow: '#a86bff' },
  'retrieval-valley': { accent: '#6bd0ff', glow: '#6bd0ff' },
  'sequential-city': { accent: '#ff5fd0', glow: '#ff5fd0' },
  'policy-tower': { accent: '#ffb04f', glow: '#ffb04f' },
  'ecosystem-garden': { accent: '#8affc9', glow: '#8affc9' },
  'final-arena': { accent: '#e6b85a', glow: '#e6b85a' },
}

export function worldTheme(id: WorldId): WorldTheme {
  return WORLD_THEMES[id] ?? WORLD_THEMES['foundations-camp']
}
