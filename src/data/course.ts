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
  icon?:
    | 'order'
    | 'ndcg'
    | 'recall'
    | 'coverage'
    | 'twotower'
    | 'ann'
    | 'negatives'
    | 'inbatch'
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

export const WEEK02_LESSON: { title: string; intro: string; sections: LessonSection[] } = {
  title: 'Week 02 · Two-Tower Retrieval',
  intro:
    'A catalogue has millions of items — you cannot score them all for every user. Retrieval narrows millions down to hundreds using embeddings and approximate search, so the ranker only ever sees a shortlist.',
  sections: [
    {
      heading: 'Two towers, one space',
      icon: 'twotower',
      narration: 'A user tower and an item tower, meeting in the same embedding space.',
      body:
        'A user tower encodes the user, an item tower encodes each item — both into the SAME vector space. Relevance becomes a dot product. Because items are user-independent, every item vector can be computed once, offline, and stored.',
      formula: 'score(u, i) = ⟨ f_user(u),  f_item(i) ⟩',
    },
    {
      heading: 'ANN — search without scoring everything',
      icon: 'ann',
      narration: 'You cannot dot-product millions of items live — so you approximate.',
      body:
        'At serving time you need the nearest item vectors to the user vector — fast. Approximate Nearest Neighbour indexes (HNSW, IVF) find them in sub-linear time, trading a sliver of recall for orders-of-magnitude speed. Exact top-k over the whole catalogue is simply too slow.',
      formula: 'top-k  ≈  ANN_index.query(f_user(u), k)',
    },
    {
      heading: 'Negative sampling',
      icon: 'negatives',
      narration: 'Show the model what NOT to retrieve, or it learns nothing.',
      body:
        'The model learns by contrast: pull the user toward items they engaged (positives) and push away from items they did not (negatives). With no negatives the space collapses — everything looks relevant. Sampling good negatives is half the battle.',
      formula: 'L = −log  e^{s⁺} / ( e^{s⁺} + Σⱼ e^{s⁻ⱼ} )',
    },
    {
      heading: 'In-batch negatives',
      icon: 'inbatch',
      narration: 'Every other user’s positive is a free negative for you.',
      body:
        'Sampling negatives from the whole catalogue is expensive. In-batch negatives reuse the OTHER positives already in the mini-batch as negatives — nearly free, and they scale with batch size. A popularity correction keeps frequent items from being over-penalised.',
    },
  ],
}

/** A candidate item in the Retrieval Sandbox, with its similarity to the chosen query user. */
export interface RetrievalItem {
  id: string
  title: string
  category: string
  /** cosine similarity of this item's embedding to the query user (0..1) */
  sim: number
  /** ground-truth: is this item actually relevant to the user? */
  relevant: boolean
}

/**
 * Retrieval Sandbox pool. Teaching point: the two-tower model retrieves by embedding
 * SIMILARITY, but similarity is not relevance. Popular items (ads, trending) sit close to
 * everyone (high sim, not relevant — "hard negatives"), while some genuinely relevant items
 * sit a little further out. A good retrieval set trades raw similarity for recall of the
 * truly relevant items.
 */
export const RETRIEVAL_ITEMS: RetrievalItem[] = [
  { id: 'r1', title: 'Ambient Synth Playlist', category: 'Music', sim: 0.94, relevant: true },
  { id: 'r2', title: 'Trending: Viral Dance', category: 'Trending', sim: 0.91, relevant: false },
  { id: 'r3', title: 'Modular Synth Deep-Dive', category: 'Music', sim: 0.79, relevant: true },
  { id: 'r4', title: 'Ad: Crypto Signals', category: 'Ads', sim: 0.88, relevant: false },
  { id: 'r5', title: 'Field Recording Basics', category: 'Audio', sim: 0.71, relevant: true },
  { id: 'r6', title: 'Top-40 Pop Hits', category: 'Trending', sim: 0.83, relevant: false },
  { id: 'r7', title: 'DIY Eurorack Build', category: 'Music', sim: 0.68, relevant: true },
  { id: 'r8', title: 'Ad: Free Ringtones', category: 'Ads', sim: 0.76, relevant: false },
]

export const RETRIEVAL_K = 4

/** recall@k over the truly-relevant items in the retrieval pool. */
export function retrievalRecall(retrieved: RetrievalItem[], pool: RetrievalItem[]): number {
  const totalRelevant = pool.filter((it) => it.relevant).length
  if (totalRelevant === 0) return 0
  const hit = retrieved.filter((it) => it.relevant).length
  return hit / totalRelevant
}

/** mean similarity of the retrieved set — what a naive ANN-by-similarity policy maximises. */
export function meanSimilarity(retrieved: RetrievalItem[]): number {
  if (retrieved.length === 0) return 0
  return retrieved.reduce((s, it) => s + it.sim, 0) / retrieved.length
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

export const NEGATIVES_QUIZ: QuizQuestion[] = [
  {
    id: 'n1',
    prompt: 'Why use an Approximate Nearest Neighbour index instead of scoring every item exactly?',
    options: [
      'ANN is always more accurate',
      'Exact scoring over millions of items is too slow at serving time',
      'ANN needs no item embeddings',
      'It removes the need for a ranker',
    ],
    answer: 1,
    explain: 'ANN trades a little recall for sub-linear search — exact top-k over the whole catalogue is too slow live.',
  },
  {
    id: 'n2',
    prompt: 'You train the two-tower model with positives only, no negatives. What happens?',
    options: [
      'It generalises better',
      'Recall@k goes to 1.0',
      'The embedding space collapses — everything scores as relevant',
      'Latency drops',
    ],
    answer: 2,
    explain: 'Without negatives there is no contrast to push irrelevant items away, so the space collapses.',
  },
  {
    id: 'n3',
    prompt: 'What are "in-batch negatives"?',
    options: [
      'Random items from the whole catalogue',
      'The other users’ positives already in the mini-batch, reused as negatives',
      'Items the user reported',
      'A type of ANN index',
    ],
    answer: 1,
    explain: 'In-batch negatives reuse the other positives in the batch as cheap negatives — nearly free and they scale with batch size.',
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
