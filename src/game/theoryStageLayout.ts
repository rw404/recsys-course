import type { NodeId, WorldId } from '../state/progress'
import type { NavigationObstacle } from './courseNavigation'
import {
  SIGNAL_REPLAY_CONSOLE_OBSTACLE,
  SIGNAL_STAGE_OBSTACLES,
} from './signalStageLayout'

export const THEORY_LESSON_BY_WORLD: Record<WorldId, NodeId> = {
  'foundations-camp': 'week01-station',
  'retrieval-valley': 'two-tower-lesson',
  'sequential-city': 'transformer-lesson',
  'policy-tower': 'policy-lesson',
  'ecosystem-garden': 'ecosystem-lesson',
  'final-arena': 'capstone-lesson',
}

export function isTheoryLesson(nodeId: NodeId | null): boolean {
  return nodeId !== null && Object.values(THEORY_LESSON_BY_WORLD).includes(nodeId)
}

const SCREEN_OBSTACLES: readonly NavigationObstacle[] = [
  { id: 'theory-screen-left-edge', x: -3.6, z: -2.88, radius: 0.64 },
  { id: 'theory-screen-left', x: -1.8, z: -2.88, radius: 0.64 },
  { id: 'theory-screen-center', x: 0, z: -2.88, radius: 0.64 },
  { id: 'theory-screen-right', x: 1.8, z: -2.88, radius: 0.64 },
  { id: 'theory-screen-right-edge', x: 3.6, z: -2.88, radius: 0.64 },
]

export const THEORY_EXHIBIT_OBSTACLES: Record<WorldId, readonly NavigationObstacle[]> = {
  'foundations-camp': SIGNAL_STAGE_OBSTACLES,
  'retrieval-valley': [
    { id: 'retrieval-query-tower', x: -3.05, z: -0.1, radius: 0.72 },
    { id: 'retrieval-ann-index', x: 0.1, z: -0.08, radius: 0.68 },
    { id: 'retrieval-catalogue-tower', x: 3.05, z: -0.35, radius: 0.72 },
  ],
  'sequential-city': [
    { id: 'sequence-token-1', x: -3.08, z: -0.04, radius: 0.34 },
    { id: 'sequence-token-2', x: -1.54, z: -0.2, radius: 0.34 },
    { id: 'sequence-token-3', x: 0, z: -0.08, radius: 0.34 },
    { id: 'sequence-token-4', x: 1.54, z: -0.2, radius: 0.34 },
    { id: 'sequence-token-5', x: 3.08, z: -0.04, radius: 0.34 },
  ],
  'policy-tower': [
    { id: 'policy-decision-hub', x: -3, z: -0.1, radius: 0.72 },
    { id: 'policy-bandit-ring', x: 0.08, z: -0.08, radius: 0.7 },
    { id: 'policy-slate-gates', x: 3.02, z: -0.34, radius: 0.74 },
  ],
  'ecosystem-garden': [
    { id: 'ecosystem-exposure-loop', x: -3.02, z: -0.08, radius: 0.72 },
    { id: 'ecosystem-diversity-basin', x: 0.08, z: -0.1, radius: 0.7 },
    { id: 'ecosystem-catalogue-tree', x: 3.02, z: -0.36, radius: 0.78 },
  ],
  'final-arena': [
    { id: 'synthesis-stage-1', x: -3.08, z: -0.08, radius: 0.36 },
    { id: 'synthesis-stage-2', x: -1.54, z: -0.2, radius: 0.36 },
    { id: 'synthesis-stage-3', x: 0, z: -0.08, radius: 0.36 },
    { id: 'synthesis-stage-4', x: 1.54, z: -0.2, radius: 0.36 },
    { id: 'synthesis-stage-5', x: 3.08, z: -0.08, radius: 0.36 },
  ],
}

export function theoryStageObstacles(worldId: WorldId): readonly NavigationObstacle[] {
  if (worldId === 'foundations-camp') return SIGNAL_STAGE_OBSTACLES
  return [...SCREEN_OBSTACLES, ...THEORY_EXHIBIT_OBSTACLES[worldId]]
}

export const THEORY_REPLAY_CONSOLE_OBSTACLE = SIGNAL_REPLAY_CONSOLE_OBSTACLE
