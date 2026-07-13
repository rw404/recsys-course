import type { WorldId } from '../state/progress'

export interface CourseWorldDefinition {
  id: WorldId
  number: string
  short: string
  name: string
  eyebrow: string
  summary: string
  question: string
  accent: string
  accentDark: string
  surface: string
  position: [number, number, number]
}

export const COURSE_WORLDS: CourseWorldDefinition[] = [
  {
    id: 'foundations-camp',
    number: '01',
    short: 'Signals',
    name: 'Signal City',
    eyebrow: 'Behavior and baselines',
    summary: 'Every watch, skip and rating becomes evidence the system can learn from.',
    question: 'What does the system actually know about a user?',
    accent: '#42b978',
    accentDark: '#24784f',
    surface: '#e9f8ef',
    position: [-2.4, 0, 30],
  },
  {
    id: 'retrieval-valley',
    number: '02',
    short: 'Retrieval',
    name: 'Retrieval Foundry',
    eyebrow: 'Candidates at scale',
    summary: 'Train embeddings, build an index and search millions of items within a serving budget.',
    question: 'How do we search millions in milliseconds?',
    accent: '#438cf3',
    accentDark: '#245daf',
    surface: '#eaf3ff',
    position: [2.2, 0, 18],
  },
  {
    id: 'sequential-city',
    number: '03',
    short: 'Sequences',
    name: 'Sequence Transit',
    eyebrow: 'Context through time',
    summary: 'Ride the event timeline and see how attention changes the meaning of a session.',
    question: 'What did the user mean across the sequence?',
    accent: '#8b67e8',
    accentDark: '#5a3caf',
    surface: '#f1edff',
    position: [-1.8, 0, 6],
  },
  {
    id: 'policy-tower',
    number: '04',
    short: 'Decisions',
    name: 'Decision Tower',
    eyebrow: 'Ranking and policy',
    summary: 'Score candidates, balance exploration and decide what reaches the top of the slate.',
    question: 'Why does one item rise above another?',
    accent: '#f09a3e',
    accentDark: '#a75b16',
    surface: '#fff2e3',
    position: [2.1, 0, -6],
  },
  {
    id: 'ecosystem-garden',
    number: '05',
    short: 'Feedback',
    name: 'Feedback Garden',
    eyebrow: 'People and ecosystems',
    summary: 'Watch diversity, bias and repeated recommendations reshape a living ecosystem.',
    question: 'What changes after a recommendation repeats?',
    accent: '#3db889',
    accentDark: '#21785b',
    surface: '#e8f8f0',
    position: [-1.8, 0, -18],
  },
  {
    id: 'final-arena',
    number: '06',
    short: 'Synthesis',
    name: 'Synthesis Lab',
    eyebrow: 'Production system',
    summary: 'Join retrieval, ranking, policy and evaluation into one working recommender.',
    question: 'Can you design the whole recommender?',
    accent: '#655be8',
    accentDark: '#3930a8',
    surface: '#eeecff',
    position: [1.5, 0, -30],
  },
]

export const COURSE_WORLD_BY_ID = Object.fromEntries(
  COURSE_WORLDS.map((world) => [world.id, world]),
) as Record<WorldId, CourseWorldDefinition>

