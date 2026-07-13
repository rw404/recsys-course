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
  /** concise takeaway shown as an editorial callout */
  narration?: string
  /** compact glossary attached to the concept */
  terms?: { term: string; definition: string }[]
  /** optional manim/explainer clip (mp4) shown in the holographic display */
  video?: string
  /** icon key for the holographic card header */
  icon?:
    | 'goal'
    | 'entities'
    | 'signals'
    | 'pipeline'
    | 'scores'
    | 'coldstart'
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
    | 'capstone'
}

export const WEEK01_LESSON: { title: string; intro: string; sections: LessonSection[] } = {
  title: 'World 01 · Recommender Foundations',
  intro:
    'A recommender is a decision system for limited attention. It turns evidence about a person, a catalogue and the current context into an ordered slate of items — then learns from what happens after those items are shown. This module builds the vocabulary used throughout the course.',
  sections: [
    {
      heading: 'The job: choose a useful slate',
      icon: 'goal',
      narration: 'A recommender does not predict taste in the abstract. It chooses what to show next.',
      body:
        'The input is a large catalogue and an incomplete view of the user. The output is a small ordered slate: a home-page row, feed, playlist or set of notifications. “Best” means expected user value under product constraints — not simply the items with the highest click probability. Long-term satisfaction, safety, freshness, availability and business rules can all shape the objective.',
      formula: 'slate* = arg max  E[user value | user, context, slate]  subject to constraints',
      terms: [
        { term: 'Objective', definition: 'The measurable outcome the system is designed to improve.' },
        { term: 'Slate', definition: 'The ordered set of items shown together.' },
        { term: 'Utility', definition: 'The value an outcome creates for the user or product.' },
      ],
    },
    {
      heading: 'The five core entities',
      icon: 'entities',
      narration: 'Every recommender starts with users, items, interactions, context and a catalogue.',
      body:
        'A user may be a person, household, device or anonymous session. An item can be a film, song, post, product or action. Interactions connect users and items over time. Context describes the moment — device, location, time, page and recent session. The catalogue defines what is eligible to recommend. Keeping these entities distinct prevents vague models and leaky features.',
      terms: [
        { term: 'User', definition: 'The decision subject, known by an account, device or session.' },
        { term: 'Item', definition: 'A candidate object or action the system may recommend.' },
        { term: 'Interaction', definition: 'An observed event connecting a user with an item.' },
        { term: 'Context', definition: 'Information about the current recommendation moment.' },
      ],
    },
    {
      heading: 'Signals are evidence, not truth',
      icon: 'signals',
      narration: 'A click is evidence of interest, but it is also shaped by what was exposed and where.',
      body:
        'Explicit feedback is deliberately supplied: ratings, likes, dislikes or survey answers. Implicit feedback is inferred from behavior: impressions, clicks, watch time, skips, purchases and returns. Stronger events are not automatically cleaner. A purchase can reflect price or availability; a long watch can reflect autoplay. Always log the impression as well as the response, otherwise “not clicked” is confused with “never shown.”',
      formula: 'interaction = (user, item, event, timestamp, context, exposure)',
      terms: [
        { term: 'Explicit feedback', definition: 'A preference the user intentionally reports.' },
        { term: 'Implicit feedback', definition: 'A preference inferred from observed behavior.' },
        { term: 'Exposure', definition: 'Evidence that an item was actually shown and could be acted on.' },
      ],
    },
    {
      heading: 'From millions to one ordered response',
      icon: 'pipeline',
      narration: 'Production systems narrow the problem in stages because no single model can do everything.',
      body:
        'Candidate generation retrieves hundreds or thousands of plausible items from a huge catalogue. A ranker predicts richer per-item utility and orders that shortlist. Re-ranking and selectors enforce diversity, safety, availability and product rules. Serving assembles features, respects latency budgets and returns the final slate. Each stage has its own inputs, failure modes and evaluation.',
      formula: 'catalogue → candidates → scores → re-ranked slate → served response',
      terms: [
        { term: 'Retrieval', definition: 'Fast narrowing from the full catalogue to candidates.' },
        { term: 'Ranking', definition: 'Scoring and ordering candidates for this request.' },
        { term: 'Re-ranking', definition: 'Adjusting the order to satisfy slate-level goals and constraints.' },
        { term: 'Serving', definition: 'Producing the response online within a latency budget.' },
      ],
    },
    {
      heading: 'Labels, features and scores',
      icon: 'scores',
      narration: 'The model learns a target from the past; its score is an estimate, not a fact.',
      body:
        'A label is the historical outcome chosen for learning: click, completion, rating or future retention. Features describe the user, item and context without using information unavailable at decision time. The model outputs a score such as a probability or expected value. Offline metrics test predictions on held-out logs; online experiments test whether the changed policy actually improves people’s outcomes.',
      formula: 'score(u, i, c) ≈ P(label = 1 | user u, item i, context c)',
      terms: [
        { term: 'Label', definition: 'The outcome used as the learning target.' },
        { term: 'Feature', definition: 'An input signal available when the decision is made.' },
        { term: 'Score', definition: 'A model estimate used to compare candidates.' },
        { term: 'Online test', definition: 'A controlled experiment that measures causal product impact.' },
      ],
    },
    {
      heading: 'The system changes its own data',
      icon: 'feedback',
      narration: 'Recommendations create exposures; exposures create the next training set.',
      body:
        'Logged behavior is not a neutral sample of preference. The previous policy chose what users could see, top positions received more attention, and popular items accumulated more evidence. Training directly on those logs can amplify the same choices into a feedback loop. Exploration, randomized experiments and debiasing methods help estimate what would have happened under another policy.',
      formula: 'policyₜ → exposureₜ → behaviorₜ → training dataₜ₊₁ → policyₜ₊₁',
      terms: [
        { term: 'Position bias', definition: 'Items receive different attention because of where they appear.' },
        { term: 'Selection bias', definition: 'Observed data over-represents choices made by the current policy.' },
        { term: 'Counterfactual', definition: 'The unobserved outcome under a different recommendation.' },
      ],
    },
    {
      heading: 'Cold start needs honest baselines',
      icon: 'coldstart',
      narration: 'When history is missing, simple context and popularity are often the strongest first system.',
      body:
        'New users have little behavioral history; new items have few interactions. This is the cold-start problem. Onboarding preferences, item metadata, contextual popularity and exploration provide a bridge until collaborative evidence arrives. A popularity baseline is not embarrassing — it is fast, robust and essential for measuring whether a complex model creates real incremental value.',
      terms: [
        { term: 'User cold start', definition: 'Making decisions before a user history exists.' },
        { term: 'Item cold start', definition: 'Estimating relevance before an item has interactions.' },
        { term: 'Baseline', definition: 'A simple reference policy a new method must beat.' },
      ],
    },
    {
      heading: 'Why order matters',
      icon: 'order',
      narration: 'Users scan from the top and often stop early, so position changes value.',
      body:
        'Recommendation is a ranking problem, not ordinary classification. A relevant item at position 1 is usually worth more than the same item at position 20. Precision or accuracy that ignores position can report the same result for two slates that feel completely different. Ranking metrics therefore evaluate the top-k prefix and discount lower positions.',
      terms: [
        { term: 'Top-k', definition: 'The first k positions of an ordered recommendation list.' },
        { term: 'Relevance', definition: 'How useful an item is for the user and objective being evaluated.' },
      ],
    },
    {
      heading: 'NDCG@k — position-aware quality',
      icon: 'ndcg',
      narration: 'NDCG rewards relevant items most when they appear near the top.',
      body:
        'Discounted Cumulative Gain adds graded relevance while reducing the contribution of lower ranks. IDCG is the gain of the ideal ordering for the same items. Dividing by IDCG makes NDCG comparable across users: 1 means the available relevant items are ordered ideally, while 0 means no gain was captured in the evaluated prefix.',
      formula: 'DCG@k = Σᵢ₌₁ᵏ (2ʳᵉˡⁱ − 1) / log₂(i + 1)      NDCG@k = DCG@k / IDCG@k',
      terms: [
        { term: 'Gain', definition: 'The value assigned to an item’s graded relevance.' },
        { term: 'Discount', definition: 'The decreasing weight applied at lower positions.' },
        { term: 'IDCG', definition: 'The maximum possible DCG for the same evaluation case.' },
      ],
    },
    {
      heading: 'Recall and coverage answer different questions',
      icon: 'recall',
      narration: 'Recall checks whether good items survived; coverage checks whether the system has breadth.',
      body:
        'Recall@k asks what fraction of known relevant items reached the top-k. It is especially important for candidate generation: a ranker cannot rescue an item that retrieval dropped. Coverage measures how much of the catalogue, categories or user population receives recommendations. Neither guarantees a satisfying slate, so teams read them beside NDCG, diversity, latency and online outcomes.',
      formula: 'Recall@k = |relevant ∩ top-k| / |relevant|      item coverage = |recommended items| / |catalogue|',
      terms: [
        { term: 'Recall@k', definition: 'The fraction of relevant items present in the first k results.' },
        { term: 'Coverage', definition: 'The breadth of items, categories or users reached by a policy.' },
        { term: 'Diversity', definition: 'How different the items within one slate are from each other.' },
      ],
    },
  ],
}

export const WEEK02_LESSON: { title: string; intro: string; sections: LessonSection[] } = {
  title: 'World 02 · Retrieval Systems',
  intro:
    'Retrieval is the first modelled decision in a production recommender. It must reduce a catalogue of millions to a few hundred plausible candidates in milliseconds, while preserving enough variety and recall for later stages to work. This module explains the contract, the representation model and the index that make that possible.',
  sections: [
    {
      heading: 'The retrieval contract',
      icon: 'goal',
      narration: 'Retrieval must be fast and generous: shortlist plausible options without trying to finish the ranking.',
      body:
        'A rich ranker cannot evaluate every item in a large catalogue for every request. Candidate retrieval performs a cheaper first pass and returns a bounded set for downstream scoring. Its primary failure is omission: once a relevant item is dropped, no later model can recover it. That is why retrieval is usually tuned for recall and latency rather than perfect ordering. Eligibility filters, freshness and source quotas also belong in the contract.',
      formula: 'catalogue |I| ≫ 10⁶  →  retrieve C(u, c), |C| ≈ 10²–10³  →  rank top-k',
      terms: [
        { term: 'Candidate set', definition: 'The bounded shortlist handed from retrieval to ranking.' },
        { term: 'Retrieval recall', definition: 'The fraction of relevant items that survive candidate generation.' },
        { term: 'Latency budget', definition: 'The maximum online time available to produce candidates.' },
      ],
    },
    {
      heading: 'Represent users and items',
      icon: 'twotower',
      narration: 'Two encoders translate different evidence into vectors that can be compared.',
      body:
        'The user tower combines history, profile and current context. The item tower combines identity, metadata and content. Both emit vectors in one embedding space, where nearby vectors represent a high learned compatibility. Item embeddings are independent of the current request, so they can be computed offline and indexed. The user embedding is produced online and becomes the query. This separation is what makes large-scale retrieval practical.',
      formula: 'qᵤ = f_user(history, profile, context)      vᵢ = f_item(id, metadata, content)',
      terms: [
        { term: 'Embedding', definition: 'A dense vector that represents learned properties and relationships.' },
        { term: 'User tower', definition: 'The encoder that turns request-time user evidence into a query vector.' },
        { term: 'Item tower', definition: 'The encoder that creates indexable vectors for catalogue items.' },
      ],
    },
    {
      heading: 'Compatibility becomes a score',
      icon: 'scores',
      narration: 'A cheap geometric score lets one user vector compare against many item vectors.',
      body:
        'The two towers are trained so positive user–item pairs have a larger dot product or cosine similarity than unrelated pairs. Dot product also carries vector magnitude; cosine similarity compares direction only. Temperature controls how sharply the contrastive objective separates candidates. The score is useful for retrieval, but it is not a calibrated probability and does not include every business or slate-level consideration.',
      formula: 's(u, i) = qᵤᵀvᵢ      or      cos(qᵤ, vᵢ) = qᵤᵀvᵢ / (‖qᵤ‖‖vᵢ‖)',
      terms: [
        { term: 'Dot product', definition: 'A fast compatibility score between two vectors.' },
        { term: 'Cosine similarity', definition: 'Similarity based on vector direction after normalization.' },
        { term: 'Temperature', definition: 'A scale that controls how sharp contrastive probabilities become.' },
      ],
    },
    {
      heading: 'Learn by contrasting examples',
      icon: 'negatives',
      narration: 'Positive events say what should be close; negatives give the space its shape.',
      body:
        'Training examples pair a user state with an engaged item. The loss raises that positive score relative to sampled negatives. With positives alone, the model can assign high scores everywhere and learn no useful boundary. Random negatives teach broad separation, while difficult negatives expose fine distinctions. A missing interaction is not automatically a dislike, so negative sampling is a modelling assumption that must respect exposure.',
      formula: 'Lᵤ = −log [ exp(s⁺/τ) / (exp(s⁺/τ) + Σⱼ exp(s⁻ⱼ/τ)) ]',
      terms: [
        { term: 'Positive pair', definition: 'A user state and item connected by the target interaction.' },
        { term: 'Negative sample', definition: 'An item treated as a contrasting non-target during training.' },
        { term: 'False negative', definition: 'A sampled negative the user might actually value.' },
      ],
    },
    {
      heading: 'In-batch and hard negatives',
      icon: 'inbatch',
      narration: 'Efficient negatives make training scalable; informative negatives make it discriminative.',
      body:
        'In-batch training reuses every other item in a mini-batch as a negative, producing many comparisons with no extra item encoding. Large batches make this powerful but over-represent popular items. Hard negatives come from a previous model or ANN index: they look plausible yet were not chosen, so they teach the boundary near the decision. They also increase false-negative risk, which is why exposure checks, popularity correction and a mixture of easy and hard samples matter.',
      formula: 'batch of B positives  →  B × (B−1) in-batch comparisons',
      terms: [
        { term: 'In-batch negative', definition: 'Another example’s positive item reused as a negative.' },
        { term: 'Hard negative', definition: 'A highly scored but non-target item that challenges the model.' },
        { term: 'Popularity correction', definition: 'Reweighting that reduces bias from frequently sampled items.' },
      ],
    },
    {
      heading: 'Approximate nearest-neighbour search',
      icon: 'ann',
      narration: 'The index avoids scanning every vector by organizing the space for fast search.',
      body:
        'Exact search computes a score against every item and becomes too expensive at catalogue scale. ANN indexes visit only a promising fraction of the space. HNSW navigates a layered proximity graph; IVF first chooses nearby coarse clusters and searches inside them. Both expose accuracy–speed controls. The index is an additional system component with build time, memory cost, refresh cadence and possible staleness.',
      formula: 'top-k ≈ ANN.query(qᵤ, k)      search cost ≪ O(|I|·d)',
      terms: [
        { term: 'HNSW', definition: 'A graph index that navigates layered nearest-neighbour links.' },
        { term: 'IVF', definition: 'An index that searches selected coarse vector clusters.' },
        { term: 'Index freshness', definition: 'How quickly new or changed item vectors become searchable.' },
      ],
    },
    {
      heading: 'Tune recall against latency',
      icon: 'recall',
      narration: 'Faster search visits less of the index; deeper search recovers more relevant items.',
      body:
        'ANN is approximate, so serving parameters determine how much work each query performs. Increasing HNSW efSearch or the number of IVF probes usually improves recall but costs CPU and latency. Increasing candidate count gives the ranker more opportunities but also raises feature and scoring cost. Teams evaluate retrieval recall on held-out positives, measure tail latency under realistic load and choose an operating point that protects both.',
      formula: 'operating point = arg max recall@C   subject to p95 latency ≤ budget',
      terms: [
        { term: 'efSearch', definition: 'The HNSW search breadth used for one query.' },
        { term: 'nprobe', definition: 'The number of IVF clusters searched for one query.' },
        { term: 'Tail latency', definition: 'Slow-request latency such as p95 or p99, not only the average.' },
      ],
    },
    {
      heading: 'Blend sources and inspect misses',
      icon: 'pipeline',
      narration: 'One retriever rarely covers every intent, item age and failure mode.',
      body:
        'Production candidate sets often merge several sources: two-tower similarity, item-to-item neighbors, recent popularity, subscriptions, editorial pools and exploration. Source quotas prevent one retriever from crowding out all others; deduplication and eligibility checks create a clean union. Debugging should trace each final item back to its source and inspect relevant items that were missed. Retrieval is complete only when its outputs are observable and refreshable.',
      formula: 'C = dedupe(C_two-tower ∪ C_item-item ∪ C_popular ∪ C_fresh ∪ C_explore)',
      terms: [
        { term: 'Candidate source', definition: 'One retrieval strategy contributing items to the merged shortlist.' },
        { term: 'Source quota', definition: 'A limit or reservation controlling each source’s contribution.' },
        { term: 'Lineage', definition: 'A trace of where an item entered and how it moved through the pipeline.' },
      ],
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
  title: 'World 03 · Sequential Models',
  intro:
    'A long-term profile says what a user tends to like; a sequence says what they are doing now. Order, recency and transitions reveal intent that static averages erase. This module follows a session from event tokens through self-attention to a next-item representation that can retrieve or rank recommendations.',
  sections: [
    {
      heading: 'Why sequence order matters',
      icon: 'goal',
      narration: 'The same events in a different order can describe a different intent.',
      body:
        'A user who watches a trailer after browsing family films may want a film tonight; the reverse order may describe idle exploration. Sequential recommenders preserve event order and model transitions, recency and session boundaries. They complement rather than replace long-term preference: a useful state combines stable taste with the current task. The learning target is often the next item or next meaningful action.',
      formula: 'stateₜ = f(long-term profile, i₁, i₂, …, iₜ, contextₜ)',
      terms: [
        { term: 'Session', definition: 'A contiguous sequence of interactions representing one short-term intent.' },
        { term: 'Next-item prediction', definition: 'Predicting the item likely to follow the observed prefix.' },
        { term: 'Recency', definition: 'The principle that recent events often carry more current intent.' },
      ],
    },
    {
      heading: 'Turn events into tokens',
      icon: 'transformer',
      narration: 'Identity, action, position and time become the input sequence.',
      body:
        'Each interaction is encoded as an item embedding plus information about event type, position, time gap and context. Positional encodings distinguish “A then B” from “B then A”. Padding makes variable-length sessions batchable, while an attention mask prevents padded or future positions from leaking information. Long histories are usually truncated, sampled or summarized to fit a serving window.',
      formula: 'xₜ = item(iₜ) + event(eₜ) + position(t) + time-gap(Δt)',
      terms: [
        { term: 'Token', definition: 'One encoded event or item position in the model input.' },
        { term: 'Positional encoding', definition: 'Information that lets attention distinguish sequence order.' },
        { term: 'Causal mask', definition: 'A mask that prevents a position from reading future events.' },
      ],
    },
    {
      heading: 'Attention: Query, Key, Value',
      icon: 'attention',
      narration: 'Each position asks which earlier events are useful for interpreting the current one.',
      body:
        'Linear projections turn every token into a Query, Key and Value. A query compares with all permitted keys, softmax converts those scores into weights, and the weighted values form a context-aware representation. In a recommendation session, the current position can emphasize a recent genre switch, a repeated creator or a complementary item. Attention weights describe computation, not guaranteed causal explanation.',
      formula: 'Attention(Q,K,V) = softmax(QKᵀ / √dₖ + mask) · V',
      terms: [
        { term: 'Query', definition: 'The representation of what a position is looking for.' },
        { term: 'Key', definition: 'The representation used to decide whether another position is relevant.' },
        { term: 'Value', definition: 'The information aggregated after attention weights are computed.' },
      ],
    },
    {
      heading: 'Multi-head attention',
      icon: 'multihead',
      narration: 'Several attention subspaces can represent different transition patterns at once.',
      body:
        'One attention map must compress every relationship into one pattern. Multi-head attention gives each head separate projections, allowing different heads to specialize in recency, repetition, category transitions or long-range dependencies. Their outputs are concatenated and mixed. More heads do not automatically mean more quality: model width, data, regularization and latency must support the added capacity.',
      formula: 'MHA(X) = Concat(head₁, …, headₕ)Wᴼ',
      terms: [
        { term: 'Head', definition: 'One independently projected attention computation.' },
        { term: 'Projection', definition: 'A learned linear transformation into a head-specific subspace.' },
        { term: 'Model width', definition: 'The dimensional capacity shared across the Transformer representation.' },
      ],
    },
    {
      heading: 'The Transformer block',
      icon: 'transformer',
      narration: 'Attention mixes positions; the feed-forward network transforms each position.',
      body:
        'A Transformer block combines multi-head attention with a position-wise feed-forward network. Residual connections preserve information and stabilize gradients; normalization keeps activations well behaved. Stacking blocks expands the depth of interaction the model can express. The final representation of the last token, a special token or a pooled sequence becomes the user state used for retrieval or ranking.',
      formula: 'H′ = Norm(H + MHA(H))      H″ = Norm(H′ + FFN(H′))',
      terms: [
        { term: 'Residual connection', definition: 'A skip path that adds a block’s input to its output.' },
        { term: 'Feed-forward network', definition: 'A per-position nonlinear transformation after attention.' },
        { term: 'Layer normalization', definition: 'Feature-wise normalization that stabilizes optimization.' },
      ],
    },
    {
      heading: 'Choose the learning objective',
      icon: 'scores',
      narration: 'The target determines what information the sequence representation learns to preserve.',
      body:
        'Autoregressive objectives predict the next event from the past and match online serving naturally. Masked-item objectives hide events and reconstruct them using both sides, which is useful for representation learning but requires care when deployed causally. Losses may contrast the true next item against sampled negatives or classify over a smaller vocabulary. Time gaps, event values and multiple behaviors can become auxiliary targets.',
      formula: 'L_next = −log P(iₜ₊₁ | i₁:ₜ, contextₜ)',
      terms: [
        { term: 'Autoregressive', definition: 'Predicting future tokens using only the observed prefix.' },
        { term: 'Masked modelling', definition: 'Reconstructing hidden tokens from their surrounding context.' },
        { term: 'Auxiliary task', definition: 'An additional target used to improve the learned representation.' },
      ],
    },
    {
      heading: 'Serve the sequence model',
      icon: 'pipeline',
      narration: 'The online state must reproduce training semantics without rebuilding an unlimited history.',
      body:
        'At request time the service fetches a bounded recent history, applies the same tokenization and mask, and computes a sequence embedding. That vector can query an ANN index, feed a ranker or blend with a long-term user embedding. Caching helps stable prefixes, while incremental state avoids recomputing the whole session after every event. Monitor sequence length, truncation rate, feature freshness and p95 latency by device.',
      formula: 'recent events → tokenize → Transformer → session vector → retrieve / rank',
      terms: [
        { term: 'Context window', definition: 'The maximum sequence prefix processed for one request.' },
        { term: 'Truncation', definition: 'Dropping older events when history exceeds the context window.' },
        { term: 'Incremental inference', definition: 'Reusing cached state when new sequence events arrive.' },
      ],
    },
    {
      heading: 'Flash Attention changes the memory path',
      icon: 'flash',
      narration: 'Tiling avoids storing the full score matrix while preserving the attention calculation.',
      body:
        'Standard implementations materialize an N×N attention matrix and repeatedly move it through slower memory. Flash Attention tiles queries, keys and values through fast on-chip memory and combines partial softmax statistics without storing that full matrix. It computes mathematically equivalent attention up to normal floating-point differences, with far lower memory traffic. Compute remains quadratic in sequence length; peak auxiliary memory becomes linear.',
      formula: 'compute O(N²d), auxiliary memory O(N²)  →  O(N) with tiled exact attention',
      terms: [
        { term: 'Tiling', definition: 'Processing a large operation as blocks that fit in fast memory.' },
        { term: 'Memory traffic', definition: 'Data movement between fast on-chip and slower accelerator memory.' },
        { term: 'Numerical equivalence', definition: 'The same mathematical result within floating-point precision.' },
      ],
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
  title: 'World 04 · Decisions, Bandits & Policies',
  intro:
    'A score predicts an outcome; a policy chooses an action and accepts that the choice changes what can be learned next. Recommendation therefore becomes a repeated decision under uncertainty. This module moves from exploration in a multi-armed bandit to contextual policies, delayed reward and constrained slate generation.',
  sections: [
    {
      heading: 'From prediction to intervention',
      icon: 'goal',
      narration: 'The system does not only estimate behavior — it chooses the exposure that can cause it.',
      body:
        'A ranker may estimate click or watch probability for each item, but serving one item consumes a scarce position and hides alternatives. The action changes the user’s experience and determines the feedback observed. A policy turns model estimates, uncertainty and constraints into a distribution over actions. Separating prediction from decision makes exploration, risk and product objectives explicit.',
      formula: 'scores + uncertainty + constraints  →  policy π(a | s)  →  exposure',
      terms: [
        { term: 'Action', definition: 'The item or slate the system chooses to expose.' },
        { term: 'Policy', definition: 'A rule or distribution mapping a state to an action.' },
        { term: 'Intervention', definition: 'A choice that changes what the user can experience and do.' },
      ],
    },
    {
      heading: 'Explore versus exploit',
      icon: 'explore',
      narration: 'Use the current winner, or spend an impression learning whether another option is better.',
      body:
        'Exploitation chooses the action with the highest estimated reward. Exploration gathers evidence about uncertain actions and protects new items from permanent invisibility. Pure greed can lock onto an early lucky winner; uncontrolled exploration can waste user attention. ε-greedy is a simple baseline: choose the current best most of the time and a random action with probability ε.',
      formula: 'aₜ = argmaxₐ Q̂ₜ(a) with 1−ε; otherwise sample an exploratory action',
      terms: [
        { term: 'Exploitation', definition: 'Choosing the action currently estimated to be best.' },
        { term: 'Exploration', definition: 'Choosing uncertain actions to learn their value.' },
        { term: 'ε-greedy', definition: 'A policy that explores randomly with probability epsilon.' },
      ],
    },
    {
      heading: 'Regret measures the learning cost',
      icon: 'bandit',
      narration: 'Every suboptimal action has an opportunity cost relative to the unknown best action.',
      body:
        'A bandit observes only the reward of the chosen arm, not the outcomes of unshown alternatives. Cumulative regret adds the reward gap between each chosen action and the optimal action. Low regret means the policy learned efficiently over its horizon. The metric is useful in simulation and theory; production systems must also account for guardrails, non-stationarity and rewards that cannot be observed immediately.',
      formula: 'R_T = Σₜ₌₁ᵀ [ μ(a*) − μ(aₜ) ]',
      terms: [
        { term: 'Bandit feedback', definition: 'Only the reward for the selected action is observed.' },
        { term: 'Regret', definition: 'Cumulative opportunity cost relative to the best action.' },
        { term: 'Horizon', definition: 'The number of decisions over which a policy is evaluated.' },
      ],
    },
    {
      heading: 'Explore by uncertainty',
      icon: 'bandit',
      narration: 'UCB and Thompson Sampling focus exploration where the answer is still uncertain.',
      body:
        'Upper Confidence Bound adds an optimism bonus that is largest for rarely selected arms. As evidence accumulates, the bonus shrinks and the policy concentrates on strong actions. Thompson Sampling maintains a posterior for each action, samples a plausible reward from each and chooses the winner. Both direct exploration using uncertainty instead of spending a fixed random fraction everywhere.',
      formula: 'UCBₜ(a) = Q̂ₜ(a) + c √(ln t / Nₜ(a))',
      terms: [
        { term: 'Confidence bound', definition: 'A range expressing uncertainty around an estimated reward.' },
        { term: 'Posterior', definition: 'A probability distribution over an unknown quantity after observing data.' },
        { term: 'Thompson Sampling', definition: 'Choosing actions by sampling from their reward posteriors.' },
      ],
    },
    {
      heading: 'Contextual bandits personalize actions',
      icon: 'policy',
      narration: 'The best action depends on the user and moment, not only on a global arm average.',
      body:
        'A contextual bandit observes features of the user, item and request before choosing. It estimates reward for each action in that state, then explores around personalized uncertainty. Logged training data must include the action probability, or propensity, assigned by the behavior policy. Without it, offline comparisons confuse policy selection with action quality.',
      formula: 'xₜ → π(a | xₜ) → choose aₜ → observe rₜ(aₜ)',
      terms: [
        { term: 'Contextual bandit', definition: 'A bandit whose action values depend on observed request features.' },
        { term: 'Behavior policy', definition: 'The policy that generated the logged actions and rewards.' },
        { term: 'Propensity', definition: 'The probability that the logging policy assigned to the chosen action.' },
      ],
    },
    {
      heading: 'Delayed reward leads toward RL',
      icon: 'policy',
      narration: 'A click is immediate; trust, retention and habit unfold across many decisions.',
      body:
        'When one recommendation changes future states and rewards arrive later, independent bandit rounds are no longer enough. A Markov Decision Process models states, actions, transitions and rewards. Reinforcement learning seeks a policy with high discounted return, balancing immediate response against future value. Reward design is critical: an easy proxy such as watch time can create behavior the product never intended.',
      formula: 'Gₜ = rₜ + γrₜ₊₁ + γ²rₜ₊₂ + …',
      terms: [
        { term: 'State', definition: 'The information used to summarize the decision situation.' },
        { term: 'Return', definition: 'The discounted sum of present and future rewards.' },
        { term: 'Reward shaping', definition: 'Designing reward signals to guide desired policy behavior.' },
      ],
    },
    {
      heading: 'Evaluate policies without reckless rollout',
      icon: 'debias',
      narration: 'Historical logs came from another policy, so offline policy value requires correction.',
      body:
        'A new policy cannot be judged by averaging rewards from actions selected by the old policy. Inverse propensity scoring reweights matching logged actions by the ratio between target and behavior probabilities. Doubly robust estimators combine that correction with a reward model. High-variance weights, poor overlap and unlogged propensities make estimates unreliable, so small guarded online experiments remain the final test.',
      formula: 'V̂_IPS(π) = (1/N) Σₜ [ π(aₜ|xₜ) / μ(aₜ|xₜ) ] rₜ',
      terms: [
        { term: 'Off-policy evaluation', definition: 'Estimating one policy using data generated by another.' },
        { term: 'Overlap', definition: 'Whether logged data includes actions the target policy might choose.' },
        { term: 'Doubly robust', definition: 'An estimator combining propensity weighting with a reward model.' },
      ],
    },
    {
      heading: 'Build a constrained slate',
      icon: 'beam',
      narration: 'The best page is not simply the individually highest-scoring items.',
      body:
        'Items interact within a slate: duplicates cannibalize attention, diversity can improve discovery and some placements have hard eligibility rules. Exhaustive search over ordered slates is combinatorial. Greedy re-ranking, Maximal Marginal Relevance and beam search construct strong candidates incrementally while enforcing constraints. The policy should log both item-level scores and the final slate transformation so decisions remain explainable.',
      formula: 'keep top-B partial slates → extend → apply constraints → score slate → prune',
      terms: [
        { term: 'Slate', definition: 'An ordered group of items selected as one action.' },
        { term: 'Beam search', definition: 'Search that retains a limited set of best partial solutions.' },
        { term: 'Cannibalization', definition: 'Items reducing one another’s value when shown together.' },
      ],
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
  title: 'World 05 · Feedback Ecosystems',
  intro:
    'A recommender is part of the environment it measures. Every exposure allocates attention, changes future behavior and creates the next training set. This module treats recommendation as an ecosystem problem: identify the loop, separate preference from exposure, balance a slate and protect long-term user and catalogue health.',
  sections: [
    {
      heading: 'Recommendation is an intervention',
      icon: 'goal',
      narration: 'A recommendation does not reveal a fixed preference; it changes the choice set.',
      body:
        'Showing an item makes interaction possible and hides alternatives behind limited screen space. The observed response therefore combines user preference, presentation, position, timing and the policy that selected the item. A healthy analysis starts from impressions and eligible alternatives, not clicks alone. This distinction turns “what did users choose?” into the more honest question “what did users choose among what the system allowed them to see?”',
      formula: 'observed response = preference × exposure × presentation × context',
      terms: [
        { term: 'Choice set', definition: 'The alternatives available to a user at the moment of decision.' },
        { term: 'Impression', definition: 'A logged exposure of an item in a known position and context.' },
        { term: 'Intervention', definition: 'A system action that changes the user’s available experience.' },
      ],
    },
    {
      heading: 'Feedback loops compound policy choices',
      icon: 'feedback',
      narration: 'Today’s ranking becomes tomorrow’s evidence, so small advantages can grow automatically.',
      body:
        'The policy determines exposure, exposed items collect interactions, and those interactions train the next model. Popular items therefore receive more evidence and can appear better even when initial exposure caused the difference. New and niche items remain data-poor. Monitoring only aggregate CTR can hide this concentration because the policy gets better at harvesting its own familiar audience while the reachable catalogue shrinks.',
      formula: 'policyₜ → exposureₜ → behaviorₜ → logsₜ → modelₜ₊₁ → policyₜ₊₁',
      terms: [
        { term: 'Feedback loop', definition: 'A cycle in which model decisions shape future training data.' },
        { term: 'Popularity bias', definition: 'Systematic advantage given to already popular items.' },
        { term: 'Concentration', definition: 'Attention accumulating on a small share of the catalogue.' },
      ],
    },
    {
      heading: 'Position and exposure bias',
      icon: 'debias',
      narration: 'Higher positions receive more attention even when item quality is unchanged.',
      body:
        'A click at rank one and a non-click at rank ten are not comparable observations. The first item was easy to notice; the second may never have been examined. Presentation style, device and scroll depth create similar examination effects. Randomized swaps or interleaving experiments can estimate examination propensities. At minimum, logs must preserve rank, page, surface and impression visibility so the bias can be studied.',
      formula: 'P(click | item, position) ≈ P(examined | position) · P(relevant | examined, item)',
      terms: [
        { term: 'Position bias', definition: 'Unequal interaction caused by where an item is displayed.' },
        { term: 'Examination', definition: 'The latent event that a user actually notices an exposure.' },
        { term: 'Interleaving', definition: 'An online comparison that mixes results from competing rankers.' },
      ],
    },
    {
      heading: 'Estimate counterfactual value',
      icon: 'debias',
      narration: 'Propensity weighting asks how outcomes would look under a different exposure policy.',
      body:
        'Inverse Propensity Scoring weights an observed reward by the inverse probability that the logging policy chose that action. Rarely shown actions then carry more information. Self-normalized and clipped variants control variance; doubly robust estimators add a reward model. None can repair missing overlap: if the old policy never exposed an action, the log contains no evidence about its outcome.',
      formula: 'r̂_IPS = [π_target(a|x) / π_log(a|x)] · r',
      terms: [
        { term: 'Propensity', definition: 'The logging policy’s probability of selecting an observed action.' },
        { term: 'Counterfactual', definition: 'The unobserved outcome under another possible action or policy.' },
        { term: 'Weight clipping', definition: 'Limiting extreme propensity weights to reduce estimator variance.' },
      ],
    },
    {
      heading: 'Quality has more than one axis',
      icon: 'diversity',
      narration: 'A relevant slate can still be repetitive, narrow or unsurprising.',
      body:
        'Intra-list diversity measures difference among items shown together. Coverage measures how much catalogue or category breadth a policy reaches across requests. Novelty rewards items unfamiliar to the user, while serendipity asks for useful surprise rather than obscurity for its own sake. These metrics should be read beside relevance: maximizing any one alone creates either a filter bubble or low-value filler.',
      formula: 'slate quality = relevance + diversity + novelty + constraints',
      terms: [
        { term: 'Intra-list diversity', definition: 'How dissimilar items within one slate are from each other.' },
        { term: 'Novelty', definition: 'How unfamiliar a recommended item is to the user.' },
        { term: 'Serendipity', definition: 'A relevant recommendation that is also meaningfully unexpected.' },
      ],
    },
    {
      heading: 'MMR balances relevance and redundancy',
      icon: 'diversity',
      narration: 'Each next item should be useful and add something the slate does not already contain.',
      body:
        'Maximal Marginal Relevance greedily selects the next item using its relevance minus its maximum similarity to already selected items. The parameter λ controls the trade-off: λ near one behaves like pure relevance; smaller λ penalizes redundancy more strongly. Similarity may use genre, creator, embeddings or calibrated business groups. MMR is transparent and practical, but it cannot fix poor candidates that retrieval never supplied.',
      formula: 'MMR(i) = λ·rel(i) − (1−λ)·maxⱼ∈S sim(i, j)',
      terms: [
        { term: 'Redundancy', definition: 'Repeated information or intent within the same slate.' },
        { term: 'λ (lambda)', definition: 'The control balancing relevance against diversity in MMR.' },
        { term: 'Greedy re-ranking', definition: 'Building a slate one locally best item at a time.' },
      ],
    },
    {
      heading: 'Optimize for long-term value',
      icon: 'churn',
      narration: 'A policy can win the next click while quietly losing trust, retention or creator supply.',
      body:
        'Immediate engagement is easy to observe and therefore easy to over-optimize. Clickbait, excessive notifications or repetitive autoplay can lift a short metric while increasing fatigue and churn. Long-term objectives combine retention, satisfaction, successful task completion and healthy content supply. Delayed outcomes are noisy, so teams use leading indicators, holdouts and cohort analysis rather than pretending one scalar reward captures everything.',
      formula: 'long-term value ≈ immediate utility + γ · future user and ecosystem value',
      terms: [
        { term: 'Churn', definition: 'A user becoming inactive or leaving the product.' },
        { term: 'Guardrail metric', definition: 'A metric that must not degrade while optimizing a primary objective.' },
        { term: 'Cohort', definition: 'A group tracked over time from a shared start or treatment.' },
      ],
    },
    {
      heading: 'Protect the whole ecosystem',
      icon: 'coverage',
      narration: 'Healthy systems create value for users without silently starving parts of the catalogue.',
      body:
        'Ecosystem monitoring segments outcomes by user group, item age, creator size and catalogue region. It tracks exposure concentration, supplier coverage, satisfaction and safety beside core engagement. Constraints can reserve exploration, cap repetition and protect eligibility, while human review handles value judgments metrics cannot settle. Fairness is not one universal number: teams must state who is affected, what allocation is being compared and which harms are unacceptable.',
      formula: 'launch only if primary value ↑ and user, safety, fairness, catalogue guardrails hold',
      terms: [
        { term: 'Exposure parity', definition: 'A declared comparison of how attention is allocated across groups.' },
        { term: 'Catalogue health', definition: 'The breadth, freshness and sustainable supply of recommendable items.' },
        { term: 'Guardrail', definition: 'A hard or monitored boundary protecting against unwanted side effects.' },
      ],
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
    prompt: 'What is the direct output of a recommender for one request?',
    options: [
      'A complete copy of the catalogue',
      'An ordered slate of eligible items',
      'A single universal user label',
      'Only an embedding vector',
    ],
    answer: 1,
    explain: 'The system turns a large catalogue into a small ordered slate for a user and context.',
  },
  {
    id: 'q2',
    prompt: 'An item has no click and no logged impression. What can you safely conclude?',
    options: [
      'The user disliked it',
      'The item is irrelevant',
      'Nothing about preference — it may never have been shown',
      'The ranker scored it as zero',
    ],
    answer: 2,
    explain: 'Without an impression there was no exposure, so absence of a click is not negative feedback.',
  },
  {
    id: 'q3',
    prompt: 'Which stage first narrows millions of catalogue items to a manageable candidate set?',
    options: ['Candidate retrieval', 'Re-ranking', 'Online experimentation', 'Metric normalization'],
    answer: 0,
    explain: 'Retrieval is the fast first pass; richer ranking operates on the shortlist it produces.',
  },
  {
    id: 'q4',
    prompt: 'Why are historical recommendation logs a biased view of user preference?',
    options: [
      'Every user rates every item',
      'The previous policy controlled what could be seen and where',
      'All items receive equal exposure',
      'Offline metrics remove every bias automatically',
    ],
    answer: 1,
    explain: 'Exposure and position came from the old policy, so the observed interactions are selected rather than neutral.',
  },
  {
    id: 'q5',
    prompt: 'You move a highly relevant item from position 5 to position 1. Which metric should increase?',
    options: ['NDCG@5', 'Serving latency', 'Catalogue size', 'Item cold start'],
    answer: 0,
    explain: 'NDCG discounts lower positions, so moving relevant gain toward the top improves the score.',
  },
  {
    id: 'q6',
    prompt: 'Relevant items are missing before ranking, and the slate repeats one narrow category. Which pair reveals both failures?',
    options: [
      'Latency and batch size',
      'Recall@k and coverage',
      'NDCG and learning rate',
      'IDCG and feature count',
    ],
    answer: 1,
    explain: 'Recall exposes lost relevant candidates; coverage exposes a policy that reaches too little breadth.',
  },
]

export const NEGATIVES_QUIZ: QuizQuestion[] = [
  {
    id: 'n1',
    prompt: 'A ranker is excellent, but relevant items never appear in its input. Which stage and metric should you inspect first?',
    options: [
      'Serving cache and CTR',
      'Candidate retrieval and Recall@C',
      'Re-ranking and catalogue size',
      'Feature normalization and NDCG only',
    ],
    answer: 1,
    explain: 'Ranking cannot recover an omitted item. Candidate Recall@C measures whether retrieval preserved the relevant options before scoring.',
  },
  {
    id: 'n2',
    prompt: 'Why use an ANN index instead of scoring all 50 million item vectors for every request?',
    options: [
      'ANN always returns the exact top-k',
      'ANN searches a small promising part of the space within the latency budget',
      'ANN removes the need for item embeddings',
      'ANN calibrates scores into probabilities',
    ],
    answer: 1,
    explain: 'Approximate search trades a controlled amount of recall for much less work than a full catalogue scan.',
  },
  {
    id: 'n3',
    prompt: 'A two-tower model is trained only on engaged user–item pairs. What failure should you expect?',
    options: [
      'The space can collapse because nothing teaches irrelevant pairs to separate',
      'Every item vector becomes perfectly calibrated',
      'The ANN index automatically supplies a loss',
      'Serving latency becomes quadratic',
    ],
    answer: 0,
    explain: 'Positive pairs say what should be close; negatives are required to create a useful boundary around that compatibility.',
  },
  {
    id: 'n4',
    prompt: 'What does an in-batch negative strategy reuse?',
    options: [
      'Future events from the same user',
      'Other examples’ positive items already encoded in the mini-batch',
      'Only items explicitly disliked by every user',
      'ANN graph edges from serving',
    ],
    answer: 1,
    explain: 'A batch of B positive pairs provides many cross-pair comparisons without running the item encoder again.',
  },
  {
    id: 'n5',
    prompt: 'You mine very similar unclicked items as hard negatives. What is the main modelling risk?',
    options: [
      'The model will have no difficult examples',
      'Some unclicked items may be relevant but unexposed, creating false negatives',
      'Cosine similarity becomes a probability',
      'The catalogue becomes smaller',
    ],
    answer: 1,
    explain: 'Non-interaction is not proof of dislike. Exposure checks and a mixture of negative sources reduce false-negative damage.',
  },
  {
    id: 'n6',
    prompt: 'Increasing HNSW efSearch raises retrieval recall but breaches p95 latency. What is the correct conclusion?',
    options: [
      'Recall is the only valid objective, so keep increasing it',
      'Choose an operating point under the latency constraint and test candidate count too',
      'Replace retrieval with the full ranker over all items',
      'Reduce the logging horizon',
    ],
    answer: 1,
    explain: 'ANN tuning is a constrained trade-off. The useful setting protects candidate recall while staying inside serving and downstream scoring budgets.',
  },
]

export const ATTENTION_QUIZ: QuizQuestion[] = [
  {
    id: 't1',
    prompt: 'Two sessions contain the same items in opposite orders and imply different intent. What input is missing if the model treats them identically?',
    options: [
      'More catalogue items',
      'Positional or temporal information',
      'A larger ANN index',
      'Propensity weights',
    ],
    answer: 1,
    explain: 'Item identity alone forms a bag. Position and time encode the order and recency that distinguish the two session states.',
  },
  {
    id: 't2',
    prompt: 'During next-item training, a token can attend to events that occur after it. What is wrong?',
    options: [
      'The model uses cosine similarity',
      'The causal mask is missing, so future information leaks into the target',
      'The batch has too many negatives',
      'The context window is too short',
    ],
    answer: 1,
    explain: 'A deployed model only knows the observed prefix. Causal masking keeps training information consistent with that serving boundary.',
  },
  {
    id: 't3',
    prompt: 'What does softmax(QKᵀ/√dₖ + mask) produce?',
    options: [
      'Context weights describing how strongly each permitted key contributes to a query',
      'The final catalogue ranking',
      'The positional encodings',
      'The feed-forward activations',
    ],
    answer: 0,
    explain: 'Query–key scores become normalized weights; those weights are then used to aggregate the Values.',
  },
  {
    id: 't4',
    prompt: 'Why can multi-head attention represent more than one head with the same total width?',
    options: [
      'Each head learns separate projections and can capture different relationships',
      'It removes the need for sequence order',
      'It guarantees causal explanations',
      'It makes sequence length constant',
    ],
    answer: 0,
    explain: 'Separate subspaces let heads encode different transition patterns, though extra heads only help when data and capacity support them.',
  },
  {
    id: 't5',
    prompt: 'A masked-item model reads both past and future events during pretraining. What must change for causal online recommendation?',
    options: [
      'Nothing; future events are available at serving time',
      'Use a causal objective or adapt the representation so inference only uses the observed prefix',
      'Replace attention with popularity',
      'Remove item embeddings',
    ],
    answer: 1,
    explain: 'Training and serving semantics must agree. Online next-item prediction cannot depend on events that have not happened.',
  },
  {
    id: 't6',
    prompt: 'Which statement about Flash Attention is correct?',
    options: [
      'It approximates attention by dropping low weights',
      'It tiles mathematically equivalent attention to reduce memory traffic; compute remains quadratic',
      'It makes attention linear-time in sequence length',
      'It changes the model objective',
    ],
    answer: 1,
    explain: 'Flash Attention avoids materializing the full score matrix. It reduces auxiliary memory and traffic, not the quadratic pairwise computation itself.',
  },
]

export const POLICY_QUIZ: QuizQuestion[] = [
  {
    id: 'p1',
    prompt: 'A model predicts click probability, but the product must reserve exploration and enforce safety. What component owns the final choice?',
    options: [
      'The embedding dimension',
      'The serving policy',
      'The label join',
      'The ANN distance metric',
    ],
    answer: 1,
    explain: 'Scores estimate outcomes. The policy combines those estimates with uncertainty, constraints and exploration to choose exposure.',
  },
  {
    id: 'p2',
    prompt: 'A greedy policy commits to the first arm with a lucky click and never tests the others. What grows over time?',
    options: [
      'Only catalogue coverage',
      'Cumulative regret relative to the unknown best arm',
      'The causal context window',
      'Propensity overlap',
    ],
    answer: 1,
    explain: 'Without exploration the policy cannot correct its early belief, so every weaker choice adds opportunity cost.',
  },
  {
    id: 'p3',
    prompt: 'Why does UCB add a confidence bonus to the estimated reward?',
    options: [
      'To make frequently selected arms look more uncertain',
      'To make under-observed arms temporarily optimistic and gather evidence',
      'To remove the mean reward estimate',
      'To guarantee random traffic forever',
    ],
    answer: 1,
    explain: 'The bonus is largest when an arm has little evidence and shrinks after it is explored.',
  },
  {
    id: 'p4',
    prompt: 'The best content source differs by user and time of day. Which formulation is appropriate?',
    options: [
      'A context-free global popularity arm only',
      'A contextual bandit π(a|x) using request features',
      'An item-only ANN index with no policy',
      'A static random shuffle',
    ],
    answer: 1,
    explain: 'Contextual bandits estimate action value conditional on the current state, allowing personalized exploration and exploitation.',
  },
  {
    id: 'p5',
    prompt: 'You want to evaluate a new policy from old logs. Which field is essential in addition to action and reward?',
    options: [
      'The logging policy’s action propensity',
      'Only the final item title',
      'The number of Transformer heads',
      'The current catalogue size',
    ],
    answer: 0,
    explain: 'Off-policy estimators need the probability assigned by the behavior policy to correct for how logged actions were selected.',
  },
  {
    id: 'p6',
    prompt: 'Why can selecting the top-K item scores independently produce a poor page?',
    options: [
      'Item scores are never useful',
      'Items interact through repetition, competition and constraints at slate level',
      'A slate has no order',
      'Beam search calibrates click probabilities',
    ],
    answer: 1,
    explain: 'Slate value is not generally additive. Re-ranking or constrained search accounts for interactions among items shown together.',
  },
]

export const CAPSTONE_LESSON: { title: string; intro: string; sections: LessonSection[] } = {
  title: 'World 06 · System Synthesis',
  intro:
    'A production recommender is not a collection of fashionable models. It is a chain of decisions with an explicit objective, observable data lineage, latency and safety constraints, and a learning loop. This final module gives you a design-review framework for assembling the pieces and explaining why each one exists.',
  sections: [
    {
      heading: 'Begin with the decision contract',
      icon: 'goal',
      narration: 'Name the user, moment, eligible catalogue, slate and value before choosing a model.',
      body:
        'Write the recommendation request as a product decision: who receives it, on which surface, from what eligible items, under which constraints and latency budget. Define the primary user value and the guardrails that must not deteriorate. This contract prevents an offline metric from becoming the objective by accident and gives every later stage a clear responsibility.',
      formula: 'request = (user, context, eligible items, slate size, constraints, latency budget)',
      terms: [
        { term: 'Decision contract', definition: 'A precise statement of what the recommender must choose and under which limits.' },
        { term: 'Eligibility', definition: 'The rules determining which items may be considered for a request.' },
        { term: 'Guardrail', definition: 'A protected outcome that constrains optimization and launch decisions.' },
      ],
    },
    {
      heading: 'Design evidence before features',
      icon: 'signals',
      narration: 'Reliable impressions, outcomes and timestamps matter more than a long feature list.',
      body:
        'Specify impression logging, user responses, delayed outcomes and catalogue snapshots before training. Define labels with observation windows and avoid features that use future information. Join logic must reproduce the state that existed when the decision was made. Version datasets and transformations so an item can be traced from raw event to score and final slate.',
      formula: 'event time + point-in-time joins + label window  →  reproducible training example',
      terms: [
        { term: 'Point-in-time join', definition: 'A feature join that uses only information available at decision time.' },
        { term: 'Label window', definition: 'The period after exposure in which an outcome is attributed.' },
        { term: 'Data lineage', definition: 'The trace from source events through transformations to model inputs.' },
      ],
    },
    {
      heading: 'Retrieve for recall, rank for precision',
      icon: 'pipeline',
      narration: 'Use different models for different scales instead of forcing one stage to do every job.',
      body:
        'Blend fast candidate sources to preserve relevant and fresh items, then apply richer ranking features to the merged shortlist. Re-ranking handles diversity, constraints and slate interactions. Measure each boundary independently: candidate recall before ranking, ranking quality before selectors, and final outcomes after serving. Stage traces make it possible to explain where a valuable item was lost.',
      formula: 'catalogue → multi-source retrieval → ranker → re-ranker/selectors → response',
      terms: [
        { term: 'Stage contract', definition: 'The input, output, metric and latency responsibility of one pipeline stage.' },
        { term: 'Candidate recall', definition: 'How many relevant items survive retrieval into the ranker.' },
        { term: 'Stage trace', definition: 'A record of items entering, leaving and being dropped at every stage.' },
      ],
    },
    {
      heading: 'Represent both stable taste and current intent',
      icon: 'transformer',
      narration: 'Long-term embeddings and recent sequences answer different recommendation questions.',
      body:
        'Collaborative or two-tower embeddings capture broad affinity and scale well for retrieval. Sequential models capture intent shifts, transitions and recency. A practical design often combines them rather than choosing one ideology: retrieve with stable and session vectors, then let the ranker use both alongside item and context features. Cold-start fallbacks cover the period before either representation is reliable.',
      formula: 'user state = long-term preference ⊕ short-term session intent ⊕ current context',
      terms: [
        { term: 'Long-term profile', definition: 'A representation of stable preference across many interactions.' },
        { term: 'Session intent', definition: 'The short-term goal inferred from recent ordered behavior.' },
        { term: 'Fallback', definition: 'A simpler policy used when features, models or services are unavailable.' },
      ],
    },
    {
      heading: 'Separate prediction from policy',
      icon: 'policy',
      narration: 'Scores estimate outcomes; the policy decides exposure, exploration and constraints.',
      body:
        'The serving policy combines predicted utility with uncertainty, exploration, business rules and slate goals. Log action propensities whenever policy learning or counterfactual evaluation is planned. Keep exploration bounded by safety and user experience. For delayed outcomes, state the reward horizon and inspect whether optimizing the proxy produces the intended behavior.',
      formula: 'model scores + uncertainty + constraints → π(slate | state) → logged propensity',
      terms: [
        { term: 'Scoring model', definition: 'A predictor estimating an outcome for a user–item pair.' },
        { term: 'Serving policy', definition: 'The decision rule that converts evidence into an exposed slate.' },
        { term: 'Reward horizon', definition: 'How far into the future policy value is measured.' },
      ],
    },
    {
      heading: 'Evaluate the whole learning loop',
      icon: 'feedback',
      narration: 'Offline replay diagnoses models; controlled online experiments test causal product value.',
      body:
        'Offline evaluation should use temporal splits, strong baselines and metrics matched to each stage. Segment results by user activity, item age and surface rather than trusting one average. Online tests measure causal effects on the primary outcome and guardrails. Long-term holdouts and catalogue-health metrics reveal feedback loops that short experiments miss. A launch is a monitored hypothesis, not the end of evaluation.',
      formula: 'offline quality + load tests + online lift + guardrails + long-term monitoring',
      terms: [
        { term: 'Temporal split', definition: 'Training on earlier data and evaluating on later data.' },
        { term: 'A/B test', definition: 'Randomized comparison that estimates causal policy impact.' },
        { term: 'Long-term holdout', definition: 'A stable control group used to measure accumulated policy effects.' },
      ],
    },
    {
      heading: 'Operate for failure and change',
      icon: 'capstone',
      narration: 'A good design explains refresh, observability, degradation and rollback before launch.',
      body:
        'Document model and index refresh cadence, feature freshness limits, cache behavior and fallbacks. Monitor latency, errors, score drift, candidate-source mix, concentration and outcome shifts. Canary releases and rollback paths reduce blast radius. Ownership matters as much as architecture: alerts need thresholds, runbooks and a team able to act. Production quality is the ability to remain understandable while data and behavior change.',
      formula: 'observe → detect → degrade safely → diagnose lineage → rollback or repair',
      terms: [
        { term: 'Canary', definition: 'A limited rollout used to detect failures before broad release.' },
        { term: 'Drift', definition: 'A change in data, scores or outcomes relative to the expected distribution.' },
        { term: 'Runbook', definition: 'An operational procedure for diagnosing and responding to an alert.' },
      ],
    },
  ],
}

/** A single fictional entry on the Final Arena leaderboard. */
export interface HallEntry {
  name: string
  score: number
}
export const HALL_OF_MASTERY: HallEntry[] = [
  { name: 'SignalScholar', score: 98450 },
  { name: 'MindSeeker', score: 95280 },
  { name: 'FocusForge', score: 92110 },
  { name: 'InsightfulOne', score: 89320 },
  { name: 'ThinkBright', score: 86770 },
]

/** points per correct capstone answer (5 × 20 000 = a perfect 100 000, which tops the Hall) */
export const CAPSTONE_PER_Q = 20000
/** minimum score (3 of 5) to clear the capstone and complete the course */
export const CAPSTONE_PASS = 60000

/** 1-based rank if `score` were inserted into the Hall of Mastery */
export function capstoneRank(score: number): number {
  let rank = 1
  for (const e of HALL_OF_MASTERY) if (e.score > score) rank++
  return rank
}

/**
 * The capstone challenge: one synthesis question drawing on each of the five regions. Scoring is
 * CAPSTONE_PER_Q per correct answer; a perfect run scores 100 000 and takes the #1 seat in the Hall
 * of Mastery. Clearing CAPSTONE_PASS completes the course.
 */
export const CAPSTONE_QUESTIONS: QuizQuestion[] = [
  {
    id: 'c1',
    prompt: 'Measure — candidate Recall@100 is high, but users rarely see relevant items near the top. Which diagnosis fits?',
    options: [
      'Retrieval is dropping every relevant item',
      'Candidates survive, but ranking order is poor; inspect NDCG and score breakdowns',
      'Catalogue coverage is necessarily perfect',
      'The ANN index must be exact',
    ],
    answer: 1,
    explain: 'High retrieval recall says the options reached ranking. Position-aware quality and score traces reveal why the ranker ordered them poorly.',
  },
  {
    id: 'c2',
    prompt: 'Retrieve — a request must find candidates from 50 million items within a few milliseconds. What architecture fits?',
    options: [
      'Run the full feature-rich ranker over every item',
      'Query an ANN index over precomputed item embeddings, then rank the shortlist',
      'Train only on positives and sort by item ID',
      'Generate every possible slate',
    ],
    answer: 1,
    explain: 'Precomputed item vectors and approximate search reduce the online search space; richer models then work on hundreds rather than millions.',
  },
  {
    id: 'c3',
    prompt: 'Sequence — offline next-item accuracy is excellent, but live quality collapses. Training attention could read later events. What failed?',
    options: [
      'The causal serving boundary was violated by future leakage',
      'The model used too few catalogue items',
      'MMR lambda was too high',
      'The policy logged propensities',
    ],
    answer: 0,
    explain: 'A next-item model deployed on an observed prefix cannot use future events. A causal mask and point-in-time features align training with inference.',
  },
  {
    id: 'c4',
    prompt: 'Decide — you want to estimate a new contextual policy from old interaction logs before rollout. What evidence is essential?',
    options: [
      'Only the reward for the old action',
      'The behavior policy’s probability for each logged action, plus overlap with target actions',
      'A larger embedding dimension',
      'The final slate title only',
    ],
    answer: 1,
    explain: 'Off-policy evaluation corrects selection using logged propensities, and it cannot identify actions the behavior policy never exposed.',
  },
  {
    id: 'c5',
    prompt: 'Sustain — a launch raises CTR, while 30-day retention and catalogue coverage decline. What is the responsible decision?',
    options: [
      'Ship broadly because immediate CTR is the only objective',
      'Treat the long-term and catalogue metrics as guardrail failures; investigate or roll back',
      'Remove impression logging',
      'Increase popularity weight until coverage recovers automatically',
    ],
    answer: 1,
    explain: 'A recommendation policy allocates attention over time. Short-term lift does not justify harming retention or catalogue health.',
  },
]

export const ECOSYSTEM_QUIZ: QuizQuestion[] = [
  {
    id: 'e1',
    prompt: 'An item has no click and no impression record. What does the log tell you about preference?',
    options: [
      'The user disliked it',
      'Nothing reliable; the item may never have been exposed',
      'Its relevance is exactly zero',
      'The user saw it below rank ten',
    ],
    answer: 1,
    explain: 'A response is interpretable only after an opportunity to respond. Impression logging separates non-click from non-exposure.',
  },
  {
    id: 'e2',
    prompt: 'Why can retraining on clicks from the current policy amplify popularity bias?',
    options: [
      'Exposure creates interactions, which are then mistaken for independent evidence of quality',
      'Popular items receive fewer impressions',
      'Clicks are always randomized',
      'Retraining removes selection bias automatically',
    ],
    answer: 0,
    explain: 'Policy → exposure → behavior → training data. Existing exposure advantages become stronger evidence in the next model.',
  },
  {
    id: 'e3',
    prompt: 'Rank one receives far more clicks than rank ten for equally relevant items. What is the likely confounder?',
    options: [
      'Embedding collapse',
      'Position-dependent examination probability',
      'A missing causal mask',
      'An ANN refresh',
    ],
    answer: 1,
    explain: 'Higher positions are more likely to be noticed, so raw click differences combine relevance with examination.',
  },
  {
    id: 'e4',
    prompt: 'When does inverse propensity scoring fail to identify a target policy’s value?',
    options: [
      'When every logged action has a known non-zero propensity',
      'When the logging policy never exposed actions the target policy would choose',
      'When weights are clipped',
      'When the reward is binary',
    ],
    answer: 1,
    explain: 'No estimator can recover outcomes for actions absent from the data. Off-policy evaluation requires overlap.',
  },
  {
    id: 'e5',
    prompt: 'In MMR, what happens as λ approaches 1?',
    options: [
      'Redundancy receives more penalty',
      'The rule approaches pure relevance and may select near-duplicates',
      'Every item receives equal score',
      'Propensity weighting becomes exact',
    ],
    answer: 1,
    explain: 'MMR = λ·relevance − (1−λ)·similarity. At λ=1 the diversity penalty disappears.',
  },
  {
    id: 'e6',
    prompt: 'CTR rises after a launch, but 30-day retention and supplier coverage fall. What should the team conclude?',
    options: [
      'The launch is successful because the primary short-term metric rose',
      'The policy may be harvesting short-term attention while harming long-term ecosystem value',
      'Coverage cannot be a guardrail',
      'Retention is unrelated to recommendation',
    ],
    answer: 1,
    explain: 'A healthy policy must satisfy long-term user and catalogue guardrails; immediate engagement alone is not the product objective.',
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
