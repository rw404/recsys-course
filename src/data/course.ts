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
    | 'attention'
    | 'multihead'
    | 'transformer'
    | 'flash'
    | 'explore'
    | 'bandit'
    | 'policy'
    | 'beam'
    | 'feedback'
    | 'diversity'
    | 'debias'
    | 'churn'
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

export const WEEK03_LESSON: { title: string; intro: string; sections: LessonSection[] } = {
  title: 'Week 03 · Attention & Transformers',
  intro:
    'A two-tower model scores a user against items independently. But a sequence — a sentence, a session, a playlist — needs every element to look at every other. That is attention, and stacking it makes a Transformer.',
  sections: [
    {
      heading: 'Attention: Query, Key, Value',
      icon: 'attention',
      narration: 'Every token asks a question and reads the answers from all the others.',
      body:
        'Each token emits a Query (what it is looking for), a Key (what it offers) and a Value (its content). The match between a query and every key becomes a weight; the output is the weighted sum of the values. So each position gathers context from the whole sequence at once.',
      formula: 'Attention(Q,K,V) = softmax( Q·Kᵀ / √dₖ ) · V',
    },
    {
      heading: 'Multi-Head Attention',
      icon: 'multihead',
      narration: 'Several heads, each watching a different kind of relationship.',
      body:
        'One attention pattern is limiting. Multi-Head Attention runs several attentions in parallel, each with its own projections, so one head can track syntax while another tracks long-range references. Their outputs are concatenated and projected back.',
      formula: 'MHA = Concat(head₁ … headₕ) · Wᴼ',
    },
    {
      heading: 'The Transformer block',
      icon: 'transformer',
      narration: 'Embed, attend, normalise, feed-forward — then stack it N times.',
      body:
        'A Transformer layer is: Multi-Head Attention → Add & Norm (a residual connection + LayerNorm) → a position-wise Feed-Forward network → Add & Norm again. Stack N of these on top of token + positional embeddings and you have the backbone behind modern language and sequence models.',
    },
    {
      heading: 'Flash Attention',
      icon: 'flash',
      narration: 'Same maths, tiled in fast memory — much faster, far less memory.',
      body:
        'Standard attention materialises the full N×N score matrix, so memory grows with N². Flash Attention streams the computation in tiles kept in on-chip SRAM, never writing the big matrix to slow memory. The result is bit-for-bit the SAME attention — just faster and O(N) memory instead of O(N²).',
      formula: 'peak memory:  standard O(N²)   →   flash O(N)',
    },
  ],
}

/** One option in the Flash-Attention lab: a sequence length to run. */
export interface AttnRun {
  id: string
  label: string
  /** sequence length (tokens) */
  n: number
}

/**
 * Flash-Attention lab pool. The teaching point (World-03 namesake): standard attention keeps the
 * whole N×N score matrix, so peak memory is O(N²) and long sequences blow the on-chip budget;
 * Flash Attention tiles the same computation, so memory is ~O(N) and the SAME (exact) output fits.
 */
export const ATTN_RUNS: AttnRun[] = [
  { id: 'a', label: '512 tokens', n: 512 },
  { id: 'b', label: '2K tokens', n: 2048 },
  { id: 'c', label: '8K tokens', n: 8192 },
  { id: 'd', label: '32K tokens', n: 32768 },
]

/** on-chip memory budget for the lab, in MB */
export const ATTN_BUDGET_MB = 24
export const ATTN_HEADS = 8
const BYTES_PER = 2 // fp16 scores

/** peak memory (MB) for a run under a method. standard keeps the N×N×heads scores; flash tiles it. */
export function attnMemoryMB(n: number, flash: boolean): number {
  if (flash) {
    // ~O(N): a few Q/K/V tiles + running softmax stats, independent of N²
    return (n * 64 * 3 * BYTES_PER) / 1e6 + 0.5
  }
  // ~O(N²): the full score matrix per head
  return (n * n * ATTN_HEADS * BYTES_PER) / 1e6
}

export const WEEK04_LESSON: { title: string; intro: string; sections: LessonSection[] } = {
  title: 'Week 04 · Bandits, Policies & Slates',
  intro:
    'Ranking gives an order — but a live recommender must DECIDE what to show and learn from what happens next. With unknown item payoffs and limited screen slots, that is a sequential decision problem: a bandit, then a policy.',
  sections: [
    {
      heading: 'Explore vs. Exploit',
      icon: 'explore',
      narration: 'Show the safe winner, or gamble on the unknown that might be better?',
      body:
        'Every impression is a choice: EXPLOIT the arm you believe is best, or EXPLORE a less-tried one that could be better. Pure exploit locks onto whatever looked good early — even if it was luck. ε-greedy fixes this crudely: exploit most of the time, but with probability ε pick a random arm to keep learning.',
      formula: 'aₜ = argmaxₐ Q̂(a)   with prob 1−ε ,   random   with prob ε',
    },
    {
      heading: 'UCB & Thompson Sampling',
      icon: 'bandit',
      narration: 'Be optimistic about what you have not tried enough.',
      body:
        'Smarter bandits explore by UNCERTAINTY, not coin-flips. UCB adds a confidence bonus to rarely-pulled arms, so it tries them until it is sure they are worse. Thompson Sampling draws from each arm’s posterior and plays the winner. Both drive REGRET — the gap to always playing the best arm — down fast.',
      formula: 'UCB(a) = Q̂(a) + √( 2·ln t / N(a) )',
    },
    {
      heading: 'From bandits to policies',
      icon: 'policy',
      narration: 'A policy maps the whole context to an action, and learns from reward.',
      body:
        'Real recommendation is CONTEXTUAL: the best action depends on the user, time and session (the state). A policy π(a | s) maps state to an action and is trained to maximise long-term reward — clicks, watch-time, retention — not just the next tap. That is the bridge from bandits to full reinforcement learning.',
      formula: 'maximise  𝔼[ Σₜ γᵗ · rₜ ]   over policy π(a | s)',
    },
    {
      heading: 'Slate generation & Beam Search',
      icon: 'beam',
      narration: 'You do not pick one item — you build a whole page, and order matters.',
      body:
        'A feed is a SLATE of K items whose value is not the sum of parts: items compete, complement and cannibalise. Enumerating every slate is combinatorial, so we build them greedily with BEAM SEARCH — keep the top-B partial slates at each step, extend, prune — to assemble a strong, diverse page under the policy.',
      formula: 'keep top-B partial slates → extend by 1 → re-score → prune',
    },
  ],
}

/** One selectable arm in the Bandit Lab. `rate` is the hidden true click-through rate. */
export interface BanditArm {
  id: string
  label: string
  rate: number
}

/**
 * Bandit Lab pool. Arm B ("Personalized") is the best (0.78) but the player can't see the rates —
 * only a strategy learns them by pulling. The teaching point (World-04 namesake): a pure-greedy
 * policy locks onto whatever looked good first and piles up regret; an uncertainty-aware policy
 * (UCB) explores just enough to find the best arm, so regret stays low.
 */
export const BANDIT_ARMS: BanditArm[] = [
  { id: 'a', label: 'Trending', rate: 0.30 },
  { id: 'b', label: 'Personalized', rate: 0.78 },
  { id: 'c', label: 'Fresh', rate: 0.45 },
  { id: 'd', label: 'Popular', rate: 0.58 },
]

export const BANDIT_PULLS = 300
/** expected regret must be BELOW this to forge the Policy Controller (only a smart policy clears it) */
export const REGRET_BUDGET = 35

export type BanditStrategy = 'greedy' | 'epsilon' | 'ucb'
export const BANDIT_STRATEGIES: { id: BanditStrategy; label: string; blurb: string }[] = [
  { id: 'greedy', label: 'Greedy (exploit)', blurb: 'Always play the current best. Never explores — gets stuck.' },
  { id: 'epsilon', label: 'ε-greedy', blurb: 'Exploit, but explore at random 10% of the time.' },
  { id: 'ucb', label: 'UCB (uncertainty)', blurb: 'Optimistic about rarely-tried arms — explores by confidence.' },
]

export interface BanditResult {
  reward: number
  /** expected (pseudo) regret vs always playing the best arm — deterministic given pull counts */
  regret: number
  /** % of pulls that landed on the true best arm */
  optimalPct: number
  /** per-arm pull counts */
  pulls: number[]
  best: number
}

/** tiny deterministic PRNG so the lab (and its tests) are reproducible */
function lcg(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}
function argmax(xs: number[]): number {
  let bi = 0
  for (let i = 1; i < xs.length; i++) if (xs[i] > xs[bi]) bi = i
  return bi
}

/**
 * Simulate a multi-armed bandit under a strategy. Returns realised reward plus the deterministic
 * expected regret Σ N(a)·(r* − r(a)). Greedy stalls on an early-lucky arm → high regret; UCB
 * finds arm B and keeps regret well under the budget.
 */
export function simulateBandit(strategy: BanditStrategy, pulls = BANDIT_PULLS, seed = 2024): BanditResult {
  const rng = lcg(seed)
  const n = BANDIT_ARMS.length
  const counts = new Array(n).fill(0)
  const sums = new Array(n).fill(0)
  const bestRate = Math.max(...BANDIT_ARMS.map((a) => a.rate))
  const best = BANDIT_ARMS.findIndex((a) => a.rate === bestRate)
  let reward = 0

  const pull = (arm: number) => {
    const r = rng() < BANDIT_ARMS[arm].rate ? 1 : 0
    counts[arm]++
    sums[arm] += r
    reward += r
  }
  // seed one pull per arm so every mean is defined
  for (let i = 0; i < n; i++) pull(i)

  for (let t = n; t < pulls; t++) {
    const means = sums.map((s, i) => s / counts[i])
    let arm: number
    if (strategy === 'greedy') {
      arm = argmax(means)
    } else if (strategy === 'epsilon') {
      arm = rng() < 0.1 ? Math.floor(rng() * n) : argmax(means)
    } else {
      // UCB1 confidence bonus (exploration constant tuned to the lab's short horizon)
      arm = argmax(means.map((m, i) => m + Math.sqrt(Math.log(t) / counts[i])))
    }
    pull(arm)
  }

  let regret = 0
  for (let i = 0; i < n; i++) regret += counts[i] * (bestRate - BANDIT_ARMS[i].rate)
  return { reward, regret, optimalPct: (counts[best] / pulls) * 100, pulls: counts, best }
}

export const WEEK05_LESSON: { title: string; intro: string; sections: LessonSection[] } = {
  title: 'Week 05 · Ecosystems, Diversity & Feedback',
  intro:
    'A recommender is not a passive observer — what it shows changes what people do, which becomes its next training data. That feedback loop can quietly collapse a healthy catalogue into a filter bubble. This final region is about keeping the ecosystem alive: diversity, debiasing, and long-term growth.',
  sections: [
    {
      heading: 'Feedback loops',
      icon: 'feedback',
      narration: 'The model shapes the very data it will learn from next.',
      body:
        'Recommendations decide what gets seen, clicks decide what gets logged, and logs train the next model. So a small early bias compounds: popular items get shown more, get more clicks, look even better. Left unchecked the loop is rich-get-richer — the catalogue narrows and the model mistakes exposure for quality.',
      formula: 'shown → clicked → logged → trained → shown …',
    },
    {
      heading: 'Diversity & serendipity',
      icon: 'diversity',
      narration: 'Accuracy alone builds a filter bubble. Variety keeps it alive.',
      body:
        'The most "relevant" slate is often five near-duplicates. Users need coverage and the occasional surprise. Maximal Marginal Relevance (MMR) trades relevance against novelty: each pick is scored by its relevance minus its similarity to what is already chosen, tuned by a knob λ.',
      formula: 'MMR = argmaxᵢ [ λ·rel(i) − (1−λ)·maxⱼ sim(i, j) ]',
    },
    {
      heading: 'Debiasing exposure',
      icon: 'debias',
      narration: 'Position and popularity bias distort what a click really means.',
      body:
        'A click on the top slot is not the same as a click on slot ten — the top just gets seen more. Position, popularity and exposure biases mean logged feedback is not ground truth. Inverse-Propensity-Scoring reweights each observation by 1/P(shown) so rarely-exposed items are not unfairly buried.',
      formula: 'r̂(i) = rᵢ / P(i shown)',
    },
    {
      heading: 'Churn & long-term value',
      icon: 'churn',
      narration: 'Optimise for the ecosystem that is still there next month.',
      body:
        'Chasing the next click can burn long-term trust: clickbait lifts today and churns users tomorrow. Healthy systems balance immediate reward against retention, creator supply and catalogue health — growing the whole ecosystem rather than strip-mining it. Balance in, grow out.',
      formula: 'maximise retention + catalogue health, not just CTR',
    },
  ],
}

/** One item in the Diversity Lab pool: a relevance score and a content category. */
export interface DiversityItem {
  id: string
  label: string
  category: string
  relevance: number
}

/**
 * Diversity Lab pool. The high-relevance items are clustered in a couple of categories (the popular
 * "News" bubble), so a pure-relevance slate is near-duplicates while a pure-diversity slate grabs
 * low-relevance filler. Only a balanced λ clears BOTH the relevance and the diversity floor — the
 * World-05 teaching point: variety and relevance together keep the ecosystem healthy.
 */
export const DIVERSITY_ITEMS: DiversityItem[] = [
  { id: 'n1', label: 'Headline', category: 'News', relevance: 0.95 },
  { id: 'n2', label: 'Breaking', category: 'News', relevance: 0.92 },
  { id: 'n3', label: 'Analysis', category: 'News', relevance: 0.88 },
  { id: 'n4', label: 'Op-Ed', category: 'News', relevance: 0.84 },
  { id: 'm1', label: 'New Album', category: 'Music', relevance: 0.60 },
  { id: 'm2', label: 'Live Set', category: 'Music', relevance: 0.45 },
  { id: 's1', label: 'Match Recap', category: 'Sports', relevance: 0.50 },
  { id: 's2', label: 'Transfer', category: 'Sports', relevance: 0.35 },
  { id: 'a1', label: 'Gallery', category: 'Art', relevance: 0.40 },
  { id: 'f1', label: 'Recipe', category: 'Food', relevance: 0.30 },
]

export const DIVERSITY_K = 5
export const REL_FLOOR = 0.62
export const DIV_FLOOR = 0.75
const SIM_SAME = 1.0
const SIM_DIFF = 0.15

function itemSim(a: DiversityItem, b: DiversityItem): number {
  return a.category === b.category ? SIM_SAME : SIM_DIFF
}

/**
 * Maximal Marginal Relevance selection. Seeds with the most relevant item, then greedily adds the
 * item maximising λ·rel − (1−λ)·maxSim-to-selected. λ=1 → pure relevance (a filter bubble); λ=0 →
 * pure novelty (irrelevant filler); a mid λ balances both.
 */
export function mmrSelect(lambda: number, k = DIVERSITY_K): DiversityItem[] {
  const pool = [...DIVERSITY_ITEMS].sort((a, b) => b.relevance - a.relevance)
  const selected: DiversityItem[] = [pool.shift()!]
  while (selected.length < k && pool.length) {
    let best: DiversityItem | null = null
    let bestScore = -Infinity
    for (const it of pool) {
      const maxSim = Math.max(...selected.map((s) => itemSim(it, s)))
      const score = lambda * it.relevance - (1 - lambda) * maxSim
      if (score > bestScore) {
        bestScore = score
        best = it
      }
    }
    selected.push(best!)
    pool.splice(pool.indexOf(best!), 1)
  }
  return selected
}

/** average relevance of a slate (0..1) */
export function slateRelevance(slate: DiversityItem[]): number {
  return slate.reduce((s, i) => s + i.relevance, 0) / slate.length
}
/** fraction of distinct categories in a slate (0..1) */
export function slateDiversity(slate: DiversityItem[]): number {
  return new Set(slate.map((i) => i.category)).size / slate.length
}
/** flavour "ecosystem health" 0..100 — rewards high AND balanced relevance+diversity */
export function ecosystemHealth(slate: DiversityItem[]): number {
  const r = slateRelevance(slate)
  const d = slateDiversity(slate)
  const balance = 1 - Math.abs(r - d)
  return Math.round(100 * ((r + d) / 2) * (0.6 + 0.4 * balance))
}
/** the lab passes when the slate clears BOTH floors — only a balanced λ does */
export function diversityPass(slate: DiversityItem[]): boolean {
  return slateRelevance(slate) >= REL_FLOOR && slateDiversity(slate) >= DIV_FLOOR
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

export const ATTENTION_QUIZ: QuizQuestion[] = [
  {
    id: 't1',
    prompt: 'In attention, what does the softmax(Q·Kᵀ/√dₖ) term produce?',
    options: [
      'The final output vectors',
      'A set of weights saying how much each token attends to every other',
      'The positional encoding',
      'The feed-forward activations',
    ],
    answer: 1,
    explain: 'Q·Kᵀ scores every query against every key; softmax turns them into attention weights used to average the Values.',
  },
  {
    id: 't2',
    prompt: 'Why use Multi-Head Attention instead of a single attention?',
    options: [
      'It is required for the residual connection',
      'Each head can attend to a different kind of relationship in parallel',
      'It removes the need for LayerNorm',
      'It makes the sequence shorter',
    ],
    answer: 1,
    explain: 'Multiple heads with separate projections capture different relations (syntax, long-range, etc.) at once.',
  },
  {
    id: 't3',
    prompt: 'How does Flash Attention differ from standard attention?',
    options: [
      'It approximates attention, trading accuracy for speed',
      'It computes the same result by tiling in on-chip memory — faster and O(N) memory',
      'It replaces attention with a feed-forward net',
      'It only works for short sequences',
    ],
    answer: 1,
    explain: 'Flash Attention is exact — same output — but tiles the computation so it never materialises the O(N²) score matrix.',
  },
]

export const POLICY_QUIZ: QuizQuestion[] = [
  {
    id: 'p1',
    prompt: 'A recommender always shows the item with the best historical click-rate and never tries others. What is the risk?',
    options: [
      'It explores too much and wastes impressions',
      'It can stay stuck on an early winner and miss a genuinely better item',
      'Its regret is guaranteed to be zero',
      'It needs no reward signal',
    ],
    answer: 1,
    explain: 'Pure exploitation (greedy) locks onto whatever looked best early — often from luck — and never discovers a better arm. That is unbounded regret.',
  },
  {
    id: 'p2',
    prompt: 'What does the UCB confidence bonus √(2·ln t / N(a)) do?',
    options: [
      'Penalises arms that have been pulled a lot',
      'Adds optimism to rarely-tried arms so they get explored',
      'Removes the need to estimate the mean',
      'Makes the policy fully greedy',
    ],
    answer: 1,
    explain: 'The bonus is large when N(a) is small, so under-explored arms look attractive until enough data proves them worse — exploration by uncertainty.',
  },
  {
    id: 'p3',
    prompt: 'Why build a K-item feed with beam search instead of picking the top-K items independently?',
    options: [
      'Beam search is always faster than sorting',
      'Because slate value is not additive — items interact, so the best page is not just the K best items',
      'It removes the need for a policy',
      'To avoid computing any scores',
    ],
    answer: 1,
    explain: 'Items in a slate complement and cannibalise each other, so the best whole page differs from the K individually-best items. Beam search assembles it under those interactions.',
  },
]

export const ECOSYSTEM_QUIZ: QuizQuestion[] = [
  {
    id: 'e1',
    prompt: 'Why is a recommender’s feedback loop dangerous if left unchecked?',
    options: [
      'It makes training slower',
      'What it shows changes future data, so early biases compound into a filter bubble',
      'It always increases diversity over time',
      'It removes the need for negatives',
    ],
    answer: 1,
    explain: 'Shown → clicked → logged → trained → shown. Popular items get more exposure, more clicks, and look even better — the catalogue narrows.',
  },
  {
    id: 'e2',
    prompt: 'In MMR, what happens as λ → 1?',
    options: [
      'The slate becomes maximally diverse',
      'The slate ignores relevance entirely',
      'The slate becomes pure relevance — often near-duplicates',
      'Every item is reweighted by propensity',
    ],
    answer: 2,
    explain: 'MMR = λ·rel − (1−λ)·sim. At λ=1 the novelty term vanishes, so it picks the most relevant items even if they are near-identical.',
  },
  {
    id: 'e3',
    prompt: 'A click in the top slot is worth more logged attention than a click in slot ten. What corrects for this?',
    options: [
      'Increasing the learning rate',
      'Inverse-Propensity-Scoring — reweight each observation by 1/P(shown)',
      'Adding more attention heads',
      'Using a bigger beam width',
    ],
    answer: 1,
    explain: 'Position/exposure bias means logged feedback is not ground truth; IPS divides by the probability of exposure so rarely-shown items are not unfairly buried.',
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
