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
    short: 'Foundations',
    name: 'Ranking Foundations',
    eyebrow: 'Signals and metrics',
    summary: 'Popularity, ordering, NDCG, recall and the first useful baseline.',
    question: 'What deserves the first position?',
    accent: '#ff765d',
    accentDark: '#c84b3b',
    surface: '#fff1e9',
    position: [-13, 0, 7],
  },
  {
    id: 'retrieval-valley',
    number: '02',
    short: 'Retrieval',
    name: 'Vector Retrieval',
    eyebrow: 'Candidates at scale',
    summary: 'Two towers, embeddings, negative sampling and approximate search.',
    question: 'How do we search millions in milliseconds?',
    accent: '#24b8aa',
    accentDark: '#147d76',
    surface: '#e5faf5',
    position: [0, 0, 8],
  },
  {
    id: 'sequential-city',
    number: '03',
    short: 'Sequences',
    name: 'Sequence City',
    eyebrow: 'Context and intent',
    summary: 'Attention, transformers and the changing meaning of a session.',
    question: 'What did the user mean across the sequence?',
    accent: '#f2ad24',
    accentDark: '#ad6e05',
    surface: '#fff7da',
    position: [13, 0, 7],
  },
  {
    id: 'policy-tower',
    number: '04',
    short: 'Decisions',
    name: 'Decision Tower',
    eyebrow: 'Learning by acting',
    summary: 'Bandits, policies, exploration and long-term reward.',
    question: 'When should the system explore?',
    accent: '#ef6591',
    accentDark: '#b83b69',
    surface: '#ffeaf1',
    position: [-13, 0, -7],
  },
  {
    id: 'ecosystem-garden',
    number: '05',
    short: 'Ecosystem',
    name: 'Ecosystem Garden',
    eyebrow: 'People and feedback',
    summary: 'Diversity, bias, churn and the loops created by recommendations.',
    question: 'What changes after a recommendation repeats?',
    accent: '#53b86b',
    accentDark: '#2d7d42',
    surface: '#eaf8e8',
    position: [0, 0, -8],
  },
  {
    id: 'final-arena',
    number: '06',
    short: 'Synthesis',
    name: 'System Synthesis',
    eyebrow: 'Capstone world',
    summary: 'Join retrieval, ranking, policy and evaluation into one system.',
    question: 'Can you design the whole recommender?',
    accent: '#6d62d8',
    accentDark: '#443aa0',
    surface: '#efedff',
    position: [13, 0, -7],
  },
]

export const COURSE_WORLD_BY_ID = Object.fromEntries(
  COURSE_WORLDS.map((world) => [world.id, world]),
) as Record<WorldId, CourseWorldDefinition>

