/** Course content for the Foundations Camp slice. Kept separate from world geometry. */

export interface SandboxItem {
  id: string
  title: string
  category: string
  /** graded relevance 0..3 (ground truth) */
  rel: number
  /** the model's predicted score (what a naive ranker would sort by) */
  score: number
}

/**
 * Candidate pool for the Ranking Sandbox.
 * The teaching point: sorting by model score is NOT the same as maximizing NDCG,
 * and a good slate must balance relevance with category coverage (diversity).
 */
export const SANDBOX_ITEMS: SandboxItem[] = [
  { id: 'a', title: 'Live Jazz Session', category: 'Music', rel: 3, score: 0.71 },
  { id: 'b', title: 'Espresso Basics', category: 'Food', rel: 2, score: 0.82 },
  { id: 'c', title: 'Indie Puzzle Game', category: 'Games', rel: 3, score: 0.55 },
  { id: 'd', title: 'Ad: Get Rich Quick', category: 'Ads', rel: 0, score: 0.9 },
  { id: 'e', title: 'City Hiking Trails', category: 'Travel', rel: 2, score: 0.48 },
  { id: 'f', title: 'Lo-fi Beats Mix', category: 'Music', rel: 1, score: 0.77 },
  { id: 'g', title: 'Ramen Deep Dive', category: 'Food', rel: 1, score: 0.61 },
  { id: 'h', title: 'Ad: Free Gift Card', category: 'Ads', rel: 0, score: 0.86 },
]

export const SLATE_SIZE = 4

export interface LessonSection {
  heading: string
  body: string
  formula?: string
  /** short line the narrator NPC says for this card */
  narration?: string
  /** optional manim/explainer clip (mp4) shown in the holographic display */
  video?: string
  /** icon key for the holographic card header */
  icon?: 'order' | 'ndcg' | 'recall' | 'coverage'
}

export const WEEK01_LESSON: { title: string; intro: string; sections: LessonSection[] } = {
  title: 'Week 01 · Ranking & Metrics',
  intro:
    'Recommendation is not about picking good items — it is about putting the right items in the right order. This week you meet the metrics that judge an ordering.',
  sections: [
    {
      heading: 'Why order matters',
      icon: 'order',
      narration: 'See how users read top-down? Position is everything.',
      body:
        'Users read top-down and stop early. A relevant item at position 1 is worth far more than the same item at position 8. Metrics that ignore position (like plain accuracy) miss the whole point of ranking.',
    },
    {
      heading: 'NDCG — position-aware quality',
      icon: 'ndcg',
      narration: 'NDCG rewards good items — but discounts them the lower they sit.',
      body:
        'Discounted Cumulative Gain rewards relevant items but discounts them by how far down they sit. Normalizing by the ideal ordering (IDCG) gives NDCG ∈ [0, 1], where 1 is a perfect ranking.',
      formula: 'DCG@k = Σ  relᵢ / log₂(i + 1)      NDCG@k = DCG@k / IDCG@k',
    },
    {
      heading: 'Recall@k — did we retrieve the good stuff?',
      icon: 'recall',
      narration: 'Recall asks: did the best items even make it into the slate?',
      body:
        'Of all truly relevant items, how many made it into the top-k slate? Recall cares about presence, not order. A great ranker still fails if the best items never enter the slate.',
      formula: 'Recall@k = |relevant ∩ top-k| / |relevant|',
    },
    {
      heading: 'Coverage — do not collapse to one theme',
      icon: 'coverage',
      narration: 'And do not show four of the same thing — coverage keeps it fresh.',
      body:
        'A slate of four near-identical items can score high on relevance yet feel repetitive. Coverage tracks how many distinct categories the slate spans — an early taste of diversity, which returns in later worlds.',
    },
  ],
}

export interface QuizQuestion {
  id: string
  prompt: string
  options: string[]
  answer: number
  explain: string
}

export const METRICS_QUIZ: QuizQuestion[] = [
  {
    id: 'q1',
    prompt: 'You move a highly-relevant item from position 5 to position 1. What happens to NDCG@5?',
    options: ['It decreases', 'It stays exactly the same', 'It increases', 'It becomes undefined'],
    answer: 2,
    explain: 'NDCG discounts by position, so lifting a relevant item to the top increases the gain.',
  },
  {
    id: 'q2',
    prompt: 'A relevant item is never placed in the top-k slate. Which metric is directly hurt?',
    options: ['Recall@k', 'Latency', 'Vocabulary size', 'Learning rate'],
    answer: 0,
    explain: 'Recall@k measures how many relevant items made it into the top-k — a missing one lowers it.',
  },
  {
    id: 'q3',
    prompt: 'Four items in your slate are all from the "Music" category. Which signal flags this?',
    options: ['IDCG', 'Coverage / diversity', 'Tokenization', 'Gradient norm'],
    answer: 1,
    explain: 'Coverage counts distinct categories; a single-category slate has low coverage.',
  },
]

// --- metric math (shared by the lab UI) ---

export function dcg(rels: number[]): number {
  return rels.reduce((sum, rel, i) => sum + rel / Math.log2(i + 2), 0)
}

export function ndcg(slateRels: number[], allRels: number[]): number {
  const ideal = [...allRels].sort((a, b) => b - a).slice(0, slateRels.length)
  const idcg = dcg(ideal)
  if (idcg === 0) return 0
  return dcg(slateRels) / idcg
}

export function recallAtK(slate: SandboxItem[], pool: SandboxItem[]): number {
  const relevantTotal = pool.filter((it) => it.rel > 0).length
  if (relevantTotal === 0) return 0
  const inSlate = slate.filter((it) => it.rel > 0).length
  return inSlate / relevantTotal
}

export function coverage(slate: SandboxItem[], pool: SandboxItem[]): number {
  const totalCats = new Set(pool.map((it) => it.category)).size
  const slateCats = new Set(slate.map((it) => it.category)).size
  if (totalCats === 0) return 0
  return slateCats / totalCats
}
