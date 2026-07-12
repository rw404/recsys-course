import { SANDBOX_DATASET, type RuntimeDataset } from '../data/recommenderDataset'

export type PipelineModuleType =
  | 'ratingsSource'
  | 'eventStream'
  | 'featureStore'
  | 'popularity'
  | 'collaborative'
  | 'matrixFactorization'
  | 'bpr'
  | 'twoTower'
  | 'vectorSearch'
  | 'sequenceTransformer'
  | 'blend'
  | 'seenFilter'
  | 'ranker'
  | 'generativeReranker'
  | 'rlPolicy'
  | 'diversify'
  | 'evaluator'
  | 'onlineServing'
  | 'output'

export type ModuleFamily = 'data' | 'retrieval' | 'control' | 'ranking' | 'evaluation' | 'output'
export type ModuleConfig = Record<string, number | boolean | string>

export interface ModuleConfigField {
  key: string
  label: string
  type: 'range' | 'number' | 'toggle'
  min?: number
  max?: number
  step?: number
  suffix?: string
}

export interface PipelineModuleDefinition {
  type: PipelineModuleType
  label: string
  shortLabel: string
  family: ModuleFamily
  description: string
  technology: string
  fidelity: 'computed' | 'emulated' | 'observed'
  latencyMs: number
  acceptsInput: boolean
  emitsOutput: boolean
  defaultConfig: ModuleConfig
  fields: ModuleConfigField[]
}

export interface PipelineNodeSpec {
  id: string
  moduleType: PipelineModuleType
  config?: ModuleConfig
}

export interface PipelineEdgeSpec {
  source: string
  target: string
}

export interface SimulationCandidate {
  movieId: string
  score: number
  sourceScores: Partial<Record<PipelineModuleType, number>>
  reasons: string[]
  rankBreakdown?: CandidateScorePart[]
  diversityTrace?: DiversityTrace
}

export type CandidateScoreSignal = 'affinity' | 'popularity' | 'freshness'

export interface CandidateScorePart {
  signal: CandidateScoreSignal
  value: number
  weight: number
  contribution: number
}

export interface DiversityTrace {
  lambda: number
  maxSimilarity: number
  mmrValue: number
}

export interface StageItemSnapshot {
  movieId: string
  rank: number
  score: number
  delta: number
  reasons: string[]
  sources: PipelineModuleType[]
}

export interface RemovedStageItem extends StageItemSnapshot {
  removalReason: string
}

export interface NodeTrace {
  nodeId: string
  moduleType: PipelineModuleType
  inputCount: number
  outputCount: number
  latencyMs: number
  pathLatencyMs: number
  status: 'ok' | 'error'
  inputItems: StageItemSnapshot[]
  outputItems: StageItemSnapshot[]
  removedItems: RemovedStageItem[]
  summary: string
  fidelity: PipelineModuleDefinition['fidelity']
  message?: string
}

export interface SimulationMetrics {
  quality: number
  diversity: number
  coverage: number
  novelty: number
  latencyMs: number
}

export interface SimulationResult {
  recommendations: SimulationCandidate[]
  trace: Record<string, NodeTrace>
  metrics: SimulationMetrics
  visitedNodeIds: string[]
  error: string | null
  datasetId: RuntimeDataset['meta']['id']
}

export interface ServiceEvent {
  day: number
  movieId: string
  action: 'impression' | 'click' | 'watch' | 'complete' | 'skip'
  reward: number
}

export interface ServiceDay {
  day: number
  impressions: number
  clicks: number
  completed: number
  ctr: number
  completionRate: number
  cumulativeReward: number
  diversity: number
  explorationRate: number
  topMovieIds: string[]
}

export interface ServiceSimulationResult {
  days: ServiceDay[]
  events: ServiceEvent[]
  summary: {
    impressions: number
    clicks: number
    completed: number
    ctr: number
    completionRate: number
    cumulativeReward: number
    uniqueMovies: number
  }
}

const SNAPSHOT_LIMIT = 36

export const PIPELINE_MODULES: Record<PipelineModuleType, PipelineModuleDefinition> = {
  ratingsSource: {
    type: 'ratingsSource',
    label: 'MovieLens ratings',
    shortLabel: 'ML-100K',
    family: 'data',
    description: 'Loads explicit user-item ratings, timestamps and movie metadata.',
    technology: 'MovieLens 100K · GroupLens',
    fidelity: 'observed',
    latencyMs: 4,
    acceptsInput: false,
    emitsOutput: true,
    defaultConfig: {},
    fields: [],
  },
  eventStream: {
    type: 'eventStream',
    label: 'Event stream',
    shortLabel: 'Events',
    family: 'data',
    description: 'Turns historical interactions into an ordered stream of impressions and feedback.',
    technology: 'Kafka / Flink semantics',
    fidelity: 'emulated',
    latencyMs: 5,
    acceptsInput: true,
    emitsOutput: true,
    defaultConfig: { windowDays: 30 },
    fields: [{ key: 'windowDays', label: 'History window', type: 'range', min: 1, max: 120, step: 1 }],
  },
  featureStore: {
    type: 'featureStore',
    label: 'Feature store',
    shortLabel: 'Features',
    family: 'data',
    description: 'Builds time-safe user, item and context features for offline and online models.',
    technology: 'Feature store · point-in-time joins',
    fidelity: 'computed',
    latencyMs: 3,
    acceptsInput: true,
    emitsOutput: true,
    defaultConfig: {},
    fields: [],
  },
  popularity: {
    type: 'popularity',
    label: 'Popularity retrieval',
    shortLabel: 'Popularity',
    family: 'retrieval',
    description: 'A Bayesian popularity baseline using observed rating mean and support.',
    technology: 'Trending / Bayesian average',
    fidelity: 'computed',
    latencyMs: 5,
    acceptsInput: true,
    emitsOutput: true,
    defaultConfig: { limit: 80 },
    fields: [{ key: 'limit', label: 'Candidates', type: 'number', min: 8, max: 200, step: 1 }],
  },
  collaborative: {
    type: 'collaborative',
    label: 'User collaborative',
    shortLabel: 'User CF',
    family: 'retrieval',
    description: 'Finds rating neighbours and aggregates their unseen high-confidence items.',
    technology: 'kNN collaborative filtering',
    fidelity: 'computed',
    latencyMs: 16,
    acceptsInput: true,
    emitsOutput: true,
    defaultConfig: { neighbors: 24, limit: 100 },
    fields: [
      { key: 'neighbors', label: 'Neighbours', type: 'range', min: 4, max: 80, step: 2 },
      { key: 'limit', label: 'Candidates', type: 'number', min: 8, max: 200, step: 1 },
    ],
  },
  matrixFactorization: {
    type: 'matrixFactorization',
    label: 'Matrix factorization',
    shortLabel: 'SVD / ALS',
    family: 'retrieval',
    description: 'Scores the catalog with user and item latent factors trained from the rating matrix.',
    technology: 'Biased SVD · ALS intuition',
    fidelity: 'computed',
    latencyMs: 12,
    acceptsInput: true,
    emitsOutput: true,
    defaultConfig: { factors: 12, limit: 120 },
    fields: [
      { key: 'factors', label: 'Latent factors', type: 'range', min: 4, max: 12, step: 1 },
      { key: 'limit', label: 'Candidates', type: 'number', min: 8, max: 200, step: 1 },
    ],
  },
  bpr: {
    type: 'bpr',
    label: 'Pairwise retrieval',
    shortLabel: 'BPR',
    family: 'retrieval',
    description: 'Optimizes an implicit preference ordering between positive and unobserved items.',
    technology: 'Bayesian Personalized Ranking',
    fidelity: 'emulated',
    latencyMs: 14,
    acceptsInput: true,
    emitsOutput: true,
    defaultConfig: { confidence: 0.72, limit: 100 },
    fields: [
      { key: 'confidence', label: 'Positive confidence', type: 'range', min: 0.2, max: 1, step: 0.05 },
      { key: 'limit', label: 'Candidates', type: 'number', min: 8, max: 200, step: 1 },
    ],
  },
  twoTower: {
    type: 'twoTower',
    label: 'Two-tower encoder',
    shortLabel: 'Two-tower',
    family: 'retrieval',
    description: 'Encodes the viewer and every film into a shared semantic retrieval space.',
    technology: 'Dual encoder · dot product',
    fidelity: 'emulated',
    latencyMs: 11,
    acceptsInput: true,
    emitsOutput: true,
    defaultConfig: { profileStrength: 1, limit: 140 },
    fields: [
      { key: 'profileStrength', label: 'Profile strength', type: 'range', min: 0.3, max: 1.8, step: 0.1 },
      { key: 'limit', label: 'Candidates', type: 'number', min: 8, max: 240, step: 1 },
    ],
  },
  vectorSearch: {
    type: 'vectorSearch',
    label: 'ANN vector index',
    shortLabel: 'HNSW / IVF',
    family: 'retrieval',
    description: 'Approximates nearest-neighbour search and exposes the recall-latency trade-off.',
    technology: 'HNSW / IVF ANN index',
    fidelity: 'emulated',
    latencyMs: 7,
    acceptsInput: true,
    emitsOutput: true,
    defaultConfig: { efSearch: 64, recall: 0.94, limit: 80 },
    fields: [
      { key: 'efSearch', label: 'efSearch', type: 'range', min: 8, max: 160, step: 8 },
      { key: 'recall', label: 'Target recall', type: 'range', min: 0.55, max: 1, step: 0.01 },
      { key: 'limit', label: 'Top K', type: 'number', min: 8, max: 160, step: 1 },
    ],
  },
  sequenceTransformer: {
    type: 'sequenceTransformer',
    label: 'Sequence transformer',
    shortLabel: 'Transformer',
    family: 'retrieval',
    description: 'Attends to recent ratings so the next-item intent can differ from the long-term profile.',
    technology: 'SASRec / BERT4Rec intuition',
    fidelity: 'emulated',
    latencyMs: 18,
    acceptsInput: true,
    emitsOutput: true,
    defaultConfig: { contextLength: 12, recency: 0.82, limit: 100 },
    fields: [
      { key: 'contextLength', label: 'Context items', type: 'range', min: 3, max: 40, step: 1 },
      { key: 'recency', label: 'Recency bias', type: 'range', min: 0.4, max: 0.98, step: 0.02 },
      { key: 'limit', label: 'Candidates', type: 'number', min: 8, max: 200, step: 1 },
    ],
  },
  blend: {
    type: 'blend',
    label: 'Candidate blend',
    shortLabel: 'Blend',
    family: 'control',
    description: 'Merges duplicate candidates and calibrates evidence from every active retriever.',
    technology: 'Multi-source candidate union',
    fidelity: 'computed',
    latencyMs: 3,
    acceptsInput: true,
    emitsOutput: true,
    defaultConfig: { personalization: 0.72, baseline: 0.28 },
    fields: [
      { key: 'personalization', label: 'Personalized weight', type: 'range', min: 0, max: 1, step: 0.05 },
      { key: 'baseline', label: 'Baseline weight', type: 'range', min: 0, max: 1, step: 0.05 },
    ],
  },
  seenFilter: {
    type: 'seenFilter',
    label: 'Selectors & rules',
    shortLabel: 'Selectors',
    family: 'control',
    description: 'Applies seen-item, availability, deduplication and catalog-age selectors.',
    technology: 'Business rules · hard filters',
    fidelity: 'computed',
    latencyMs: 2,
    acceptsInput: true,
    emitsOutput: true,
    defaultConfig: { removeSeen: true, minYear: 1920, maxPerGenre: 40 },
    fields: [
      { key: 'removeSeen', label: 'Remove seen', type: 'toggle' },
      { key: 'minYear', label: 'Minimum year', type: 'number', min: 1920, max: 1998, step: 1 },
      { key: 'maxPerGenre', label: 'Per-genre cap', type: 'number', min: 3, max: 80, step: 1 },
    ],
  },
  ranker: {
    type: 'ranker',
    label: 'Learning-to-rank',
    shortLabel: 'LTR ranker',
    family: 'ranking',
    description: 'Combines retrieval affinity, catalog confidence and freshness into a final score.',
    technology: 'GBDT/LambdaMART intuition',
    fidelity: 'emulated',
    latencyMs: 8,
    acceptsInput: true,
    emitsOutput: true,
    defaultConfig: { affinityWeight: 0.72, popularityWeight: 0.2, freshnessWeight: 0.08 },
    fields: [
      { key: 'affinityWeight', label: 'Affinity', type: 'range', min: 0, max: 1, step: 0.05 },
      { key: 'popularityWeight', label: 'Popularity', type: 'range', min: 0, max: 1, step: 0.05 },
      { key: 'freshnessWeight', label: 'Freshness', type: 'range', min: 0, max: 1, step: 0.05 },
    ],
  },
  generativeReranker: {
    type: 'generativeReranker',
    label: 'Generative reranker',
    shortLabel: 'GenAI rerank',
    family: 'ranking',
    description: 'Uses grounded profile context to reorder candidates and produce human-readable rationales.',
    technology: 'RAG + constrained LLM reranking',
    fidelity: 'emulated',
    latencyMs: 42,
    acceptsInput: true,
    emitsOutput: true,
    defaultConfig: { grounding: 0.85, serendipity: 0.18, limit: 30 },
    fields: [
      { key: 'grounding', label: 'Catalog grounding', type: 'range', min: 0.4, max: 1, step: 0.05 },
      { key: 'serendipity', label: 'Serendipity', type: 'range', min: 0, max: 0.6, step: 0.05 },
      { key: 'limit', label: 'Context window', type: 'number', min: 5, max: 60, step: 1 },
    ],
  },
  rlPolicy: {
    type: 'rlPolicy',
    label: 'RL policy',
    shortLabel: 'Bandit / RL',
    family: 'ranking',
    description: 'Balances exploitation with controlled exploration using a contextual reward prior.',
    technology: 'Contextual bandit · long-term reward',
    fidelity: 'emulated',
    latencyMs: 6,
    acceptsInput: true,
    emitsOutput: true,
    defaultConfig: { exploration: 0.12, longTermWeight: 0.34 },
    fields: [
      { key: 'exploration', label: 'Exploration epsilon', type: 'range', min: 0, max: 0.5, step: 0.01 },
      { key: 'longTermWeight', label: 'Long-term reward', type: 'range', min: 0, max: 1, step: 0.05 },
    ],
  },
  diversify: {
    type: 'diversify',
    label: 'MMR diversify',
    shortLabel: 'MMR',
    family: 'ranking',
    description: 'Trades a little relevance for a less repetitive final slate.',
    technology: 'Maximal Marginal Relevance',
    fidelity: 'computed',
    latencyMs: 6,
    acceptsInput: true,
    emitsOutput: true,
    defaultConfig: { lambda: 0.72, limit: 12 },
    fields: [
      { key: 'lambda', label: 'Relevance lambda', type: 'range', min: 0.2, max: 1, step: 0.05 },
      { key: 'limit', label: 'Slate pool', type: 'number', min: 4, max: 40, step: 1 },
    ],
  },
  evaluator: {
    type: 'evaluator',
    label: 'Offline evaluator',
    shortLabel: 'Evaluate',
    family: 'evaluation',
    description: 'Observes quality, diversity, coverage, novelty and critical-path latency.',
    technology: 'Precision / NDCG / catalog metrics',
    fidelity: 'computed',
    latencyMs: 2,
    acceptsInput: true,
    emitsOutput: true,
    defaultConfig: {},
    fields: [],
  },
  onlineServing: {
    type: 'onlineServing',
    label: 'Online serving',
    shortLabel: 'Serving API',
    family: 'output',
    description: 'Models cache, timeout and fallback behavior before the response reaches the client.',
    technology: 'API gateway · cache · fallback',
    fidelity: 'emulated',
    latencyMs: 4,
    acceptsInput: true,
    emitsOutput: true,
    defaultConfig: { cacheHitRate: 0.78, timeoutMs: 80 },
    fields: [
      { key: 'cacheHitRate', label: 'Cache hit rate', type: 'range', min: 0, max: 1, step: 0.05 },
      { key: 'timeoutMs', label: 'Timeout', type: 'number', min: 20, max: 250, step: 5 },
    ],
  },
  output: {
    type: 'output',
    label: 'Recommendation slate',
    shortLabel: 'Top-K slate',
    family: 'output',
    description: 'Keeps the final recommendations, scores, evidence and explanation trace.',
    technology: 'Client response',
    fidelity: 'observed',
    latencyMs: 1,
    acceptsInput: true,
    emitsOutput: false,
    defaultConfig: { topK: 4 },
    fields: [{ key: 'topK', label: 'Top K', type: 'range', min: 3, max: 16, step: 1 }],
  },
}

export function simulatePipeline(
  viewerId: string,
  nodes: PipelineNodeSpec[],
  edges: PipelineEdgeSpec[],
  dataset: RuntimeDataset = SANDBOX_DATASET,
): SimulationResult {
  const viewer = dataset.viewerById[viewerId]
  if (!viewer) return emptyResult(`Unknown viewer: ${viewerId}`, dataset)
  if (nodes.length === 0) return emptyResult('Add at least one module to the pipeline.', dataset)

  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const validEdges = edges.filter((edge) => nodeById.has(edge.source) && nodeById.has(edge.target))
  const incoming = new Map<string, PipelineEdgeSpec[]>()
  const outgoing = new Map<string, PipelineEdgeSpec[]>()
  const indegree = new Map(nodes.map((node) => [node.id, 0]))

  for (const edge of validEdges) {
    incoming.set(edge.target, [...(incoming.get(edge.target) ?? []), edge])
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge])
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1)
  }

  const queue = nodes.filter((node) => (indegree.get(node.id) ?? 0) === 0).map((node) => node.id)
  const order: string[] = []
  while (queue.length) {
    const id = queue.shift()!
    order.push(id)
    for (const edge of outgoing.get(id) ?? []) {
      const next = (indegree.get(edge.target) ?? 1) - 1
      indegree.set(edge.target, next)
      if (next === 0) queue.push(edge.target)
    }
  }
  if (order.length !== nodes.length) return emptyResult('The graph contains a cycle. Remove one of the returning edges.', dataset)

  const outputs = new Map<string, SimulationCandidate[]>()
  const pathLatency = new Map<string, number>()
  const trace: Record<string, NodeTrace> = {}
  const visitedNodeIds: string[] = []

  for (const nodeId of order) {
    const node = nodeById.get(nodeId)!
    const definition = PIPELINE_MODULES[node.moduleType]
    const parentEdges = incoming.get(nodeId) ?? []
    const parentOutputs = parentEdges.map((edge) => outputs.get(edge.source) ?? [])
    const inputCandidates = mergeCandidates(parentOutputs.flat())
    const parentLatency = Math.max(0, ...parentEdges.map((edge) => pathLatency.get(edge.source) ?? 0))
    const config = { ...definition.defaultConfig, ...(node.config ?? {}) }

    if (definition.acceptsInput && parentEdges.length === 0) {
      outputs.set(nodeId, [])
      pathLatency.set(nodeId, definition.latencyMs)
      trace[nodeId] = {
        nodeId,
        moduleType: node.moduleType,
        inputCount: 0,
        outputCount: 0,
        latencyMs: definition.latencyMs,
        pathLatencyMs: definition.latencyMs,
        status: 'error',
        inputItems: [],
        outputItems: [],
        removedItems: [],
        summary: 'No upstream candidates reached this stage.',
        fidelity: definition.fidelity,
        message: 'Connect an upstream module.',
      }
      continue
    }

    const output = processModule(node.moduleType, viewerId, inputCandidates, config, dataset)
    const latencyMs = estimateLatency(definition, inputCandidates.length, output.length, config)
    const nodePathLatency = parentLatency + latencyMs
    outputs.set(nodeId, output)
    pathLatency.set(nodeId, nodePathLatency)
    const inputCount = node.moduleType === 'ratingsSource' ? dataset.ratings.length : inputCandidates.length
    trace[nodeId] = buildTrace(node, definition, inputCandidates, output, inputCount, latencyMs, nodePathLatency, dataset)
    visitedNodeIds.push(nodeId)
  }

  const outputNodes = nodes.filter((node) => node.moduleType === 'output')
  if (outputNodes.length === 0) {
    return {
      recommendations: [],
      trace,
      metrics: zeroMetrics(),
      visitedNodeIds,
      error: 'Add a Recommendation slate output node.',
      datasetId: dataset.meta.id,
    }
  }

  const finalNode = outputNodes.find((node) => (outputs.get(node.id) ?? []).length > 0) ?? outputNodes[0]
  const recommendations = outputs.get(finalNode.id) ?? []
  const latencyMs = pathLatency.get(finalNode.id) ?? 0
  const reachable = trace[finalNode.id]?.status === 'ok' && recommendations.length > 0

  return {
    recommendations,
    trace,
    metrics: calculateMetrics(viewerId, recommendations, latencyMs, dataset),
    visitedNodeIds,
    error: reachable ? null : 'The output has no candidates. Check the highlighted module path.',
    datasetId: dataset.meta.id,
  }
}

export function simulateServiceDays(
  dataset: RuntimeDataset,
  viewerId: string,
  result: SimulationResult,
  days = 7,
): ServiceSimulationResult {
  if (!result.recommendations.length) {
    return {
      days: [],
      events: [],
      summary: { impressions: 0, clicks: 0, completed: 0, ctr: 0, completionRate: 0, cumulativeReward: 0, uniqueMovies: 0 },
    }
  }

  const safeDays = Math.max(1, Math.min(60, Math.round(days)))
  const random = seededRandom(hashString(`${viewerId}:${result.recommendations.map((item) => item.movieId).join(',')}:${safeDays}`))
  const events: ServiceEvent[] = []
  const dayRows: ServiceDay[] = []
  const exposure = new Map<string, number>()
  const rewardEstimate = new Map<string, number>()
  let cumulativeReward = 0

  for (let day = 1; day <= safeDays; day += 1) {
    const explorationRate = Math.max(0.04, 0.22 * Math.exp(-(day - 1) / 18))
    const ranked = result.recommendations.map((candidate) => {
      const movie = dataset.movieById[candidate.movieId]
      const novelty = catalogNovelty(candidate.movieId, dataset)
      const uncertainty = 1 / Math.sqrt(1 + (exposure.get(candidate.movieId) ?? 0))
      const learnedReward = rewardEstimate.get(candidate.movieId) ?? candidate.score
      return {
        candidate,
        policyScore: candidate.score * (1 - explorationRate)
          + novelty * explorationRate * 0.45
          + uncertainty * explorationRate * 0.35
          + learnedReward * 0.2,
        movie,
      }
    }).sort((a, b) => b.policyScore - a.policyScore)

    let impressions = 0
    let clicks = 0
    let completed = 0
    const shownIds = new Set<string>()
    for (let session = 0; session < 12; session += 1) {
      const slot = session % Math.min(6, ranked.length)
      const picked = random() < explorationRate
        ? ranked[Math.floor(random() * ranked.length)]
        : ranked[slot]
      if (!picked?.movie) continue
      const movieId = picked.candidate.movieId
      shownIds.add(movieId)
      exposure.set(movieId, (exposure.get(movieId) ?? 0) + 1)
      impressions += 1
      events.push({ day, movieId, action: 'impression', reward: 0 })

      const fatigue = Math.min(0.22, (exposure.get(movieId) ?? 1) * 0.008)
      const clickProbability = clamp01(0.035 + picked.candidate.score * 0.48 + catalogNovelty(movieId, dataset) * 0.08 - fatigue)
      if (random() > clickProbability) {
        events.push({ day, movieId, action: 'skip', reward: -0.03 })
        cumulativeReward -= 0.03
        continue
      }

      clicks += 1
      events.push({ day, movieId, action: 'click', reward: 0.2 })
      let reward = 0.2
      const watchProbability = clamp01(0.18 + picked.candidate.score * 0.62)
      if (random() < watchProbability) {
        reward += 0.45
        events.push({ day, movieId, action: 'watch', reward: 0.45 })
        if (random() < clamp01(0.08 + picked.candidate.score * 0.66)) {
          completed += 1
          reward += 0.55
          events.push({ day, movieId, action: 'complete', reward: 0.55 })
        }
      }
      cumulativeReward += reward
      const previous = rewardEstimate.get(movieId) ?? picked.candidate.score
      rewardEstimate.set(movieId, previous * 0.76 + reward * 0.24)
    }

    dayRows.push({
      day,
      impressions,
      clicks,
      completed,
      ctr: impressions ? clicks / impressions : 0,
      completionRate: clicks ? completed / clicks : 0,
      cumulativeReward,
      diversity: slateDiversity([...shownIds], dataset),
      explorationRate,
      topMovieIds: ranked.slice(0, 5).map((entry) => entry.candidate.movieId),
    })
  }

  const impressions = events.filter((event) => event.action === 'impression').length
  const clicks = events.filter((event) => event.action === 'click').length
  const completed = events.filter((event) => event.action === 'complete').length
  return {
    days: dayRows,
    events,
    summary: {
      impressions,
      clicks,
      completed,
      ctr: impressions ? clicks / impressions : 0,
      completionRate: clicks ? completed / clicks : 0,
      cumulativeReward,
      uniqueMovies: new Set(events.map((event) => event.movieId)).size,
    },
  }
}

function processModule(
  type: PipelineModuleType,
  viewerId: string,
  input: SimulationCandidate[],
  config: ModuleConfig,
  dataset: RuntimeDataset,
): SimulationCandidate[] {
  switch (type) {
    case 'ratingsSource':
      return catalogCandidates(dataset, 'Observed in the MovieLens catalog')
    case 'eventStream': {
      const windowDays = numberConfig(config, 'windowDays', 30)
      return input.map((candidate) => ({ ...candidate, reasons: unique([...candidate.reasons, `${windowDays}-day event window materialized`]) }))
    }
    case 'featureStore':
      return (input.length ? input : catalogCandidates(dataset, 'Catalog features materialized')).map((candidate) => ({
        ...candidate,
        reasons: unique([...candidate.reasons, 'Point-in-time viewer and movie features joined']),
      }))
    case 'popularity':
      return popularityCandidates(numberConfig(config, 'limit', 80), dataset)
    case 'collaborative':
      return collaborativeCandidates(
        viewerId,
        numberConfig(config, 'neighbors', 24),
        numberConfig(config, 'limit', 100),
        dataset,
      )
    case 'matrixFactorization':
      return matrixFactorizationCandidates(
        viewerId,
        numberConfig(config, 'factors', 12),
        numberConfig(config, 'limit', 120),
        dataset,
      )
    case 'bpr':
      return bprCandidates(
        viewerId,
        numberConfig(config, 'confidence', 0.72),
        numberConfig(config, 'limit', 100),
        dataset,
      )
    case 'twoTower':
      return semanticCandidates(
        viewerId,
        numberConfig(config, 'profileStrength', 1),
        numberConfig(config, 'limit', 140),
        dataset,
        'twoTower',
      )
    case 'vectorSearch':
      return annCandidates(
        viewerId,
        input,
        numberConfig(config, 'recall', 0.94),
        numberConfig(config, 'limit', 80),
        dataset,
      )
    case 'sequenceTransformer':
      return sequenceCandidates(
        viewerId,
        numberConfig(config, 'contextLength', 12),
        numberConfig(config, 'recency', 0.82),
        numberConfig(config, 'limit', 100),
        dataset,
      )
    case 'blend':
      return blendCandidates(input, config)
    case 'seenFilter':
      return selectorCandidates(viewerId, input, config, dataset)
    case 'ranker':
      return rankCandidates(input, config, dataset)
    case 'generativeReranker':
      return generativeCandidates(viewerId, input, config, dataset)
    case 'rlPolicy':
      return policyCandidates(viewerId, input, config, dataset)
    case 'diversify':
      return diversifyCandidates(input, numberConfig(config, 'lambda', 0.72), numberConfig(config, 'limit', 12), dataset)
    case 'evaluator':
      return [...input]
    case 'onlineServing': {
      const timeout = numberConfig(config, 'timeoutMs', 80)
      return input.map((candidate) => ({
        ...candidate,
        reasons: unique([...candidate.reasons, `Served inside ${timeout} ms budget`]).slice(0, 5),
      }))
    }
    case 'output':
      return input.slice(0, numberConfig(config, 'topK', 8))
    default:
      return input
  }
}

function catalogCandidates(dataset: RuntimeDataset, reason: string): SimulationCandidate[] {
  return dataset.movies.map((movie) => ({ movieId: movie.id, score: 0, sourceScores: {}, reasons: [reason] }))
}

function popularityCandidates(limit: number, dataset: RuntimeDataset): SimulationCandidate[] {
  const stats = movieStats(dataset)
  const maxCount = Math.max(...Object.values(stats).map((stat) => stat.count), 1)
  const globalMean = dataset.ratings.length
    ? dataset.ratings.reduce((sum, rating) => sum + rating.rating, 0) / dataset.ratings.length
    : 3
  return dataset.movies.map((movie) => {
    const stat = stats[movie.id] ?? { average: 0, count: 0 }
    const bayesian = (stat.count * stat.average + 25 * globalMean) / Math.max(1, stat.count + 25)
    const score = clamp01(((bayesian - 1) / 4) * 0.82 + (Math.log1p(stat.count) / Math.log1p(maxCount)) * 0.18)
    return {
      movieId: movie.id,
      score,
      sourceScores: { popularity: score },
      reasons: [`${stat.average.toFixed(1)} average from ${stat.count} ratings`],
    }
  }).sort((a, b) => b.score - a.score).slice(0, limit)
}

function collaborativeCandidates(
  viewerId: string,
  neighborLimit: number,
  limit: number,
  dataset: RuntimeDataset,
): SimulationCandidate[] {
  const targetRatings = ratingsForViewer(viewerId, dataset)
  const neighbours = dataset.viewers
    .filter((viewer) => viewer.id !== viewerId)
    .map((viewer) => ({ viewer, similarity: ratingSimilarity(targetRatings, ratingsForViewer(viewer.id, dataset)) }))
    .filter((entry) => entry.similarity > 0.02)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, neighborLimit)

  const aggregates = new Map<string, { weighted: number; weight: number; supporters: string[] }>()
  for (const neighbour of neighbours) {
    for (const rating of dataset.ratingsByViewer.get(neighbour.viewer.id) ?? []) {
      if (targetRatings.has(rating.movieId) || rating.rating < 3) continue
      const current = aggregates.get(rating.movieId) ?? { weighted: 0, weight: 0, supporters: [] }
      current.weighted += neighbour.similarity * (rating.rating / 5)
      current.weight += Math.abs(neighbour.similarity)
      if (rating.rating >= 4.5) current.supporters.push(neighbour.viewer.name)
      aggregates.set(rating.movieId, current)
    }
  }

  return [...aggregates.entries()].map(([movieId, aggregate]) => {
    const score = clamp01(aggregate.weighted / Math.max(0.001, aggregate.weight))
    return {
      movieId,
      score,
      sourceScores: { collaborative: score },
      reasons: [aggregate.supporters.length
        ? `High ratings from ${aggregate.supporters.slice(0, 2).join(' and ')}`
        : `Supported by ${neighbours.length} nearest viewers`],
    }
  }).sort((a, b) => b.score - a.score).slice(0, limit)
}

function matrixFactorizationCandidates(
  viewerId: string,
  factors: number,
  limit: number,
  dataset: RuntimeDataset,
): SimulationCandidate[] {
  if (!dataset.latent?.users[viewerId]) {
    return semanticCandidates(viewerId, 1, limit, dataset, 'matrixFactorization').map((candidate) => ({
      ...candidate,
      reasons: unique([...candidate.reasons, 'Latent factors approximated from genre interactions']),
    }))
  }
  const userVector = dataset.latent.users[viewerId].slice(0, factors)
  return dataset.movies.map((movie) => {
    const movieVector = (dataset.latent?.movies[movie.id] ?? []).slice(0, factors)
    const raw = (dataset.latent?.globalMean ?? 3)
      + (dataset.latent?.userBias[viewerId] ?? 0)
      + (dataset.latent?.movieBias[movie.id] ?? 0)
      + dot(userVector, movieVector)
    const score = clamp01((raw - 1) / 4)
    return {
      movieId: movie.id,
      score,
      sourceScores: { matrixFactorization: score },
      reasons: [`${factors} latent factors predict ${raw.toFixed(2)} / 5`],
    }
  }).sort((a, b) => b.score - a.score).slice(0, limit)
}

function bprCandidates(
  viewerId: string,
  confidence: number,
  limit: number,
  dataset: RuntimeDataset,
): SimulationCandidate[] {
  const latent = dataset.latent
  if (!latent?.users[viewerId]) {
    return semanticCandidates(viewerId, confidence, limit, dataset, 'bpr')
  }
  const user = latent.users[viewerId]
  return dataset.movies.map((movie) => {
    const preference = dot(user, latent.movies[movie.id] ?? []) + (latent.movieBias[movie.id] ?? 0) * 0.35
    const score = clamp01(sigmoid(preference * 2.4) * confidence + catalogNovelty(movie.id, dataset) * (1 - confidence) * 0.25)
    return {
      movieId: movie.id,
      score,
      sourceScores: { bpr: score },
      reasons: ['Pairwise positive-over-unobserved preference'],
    }
  }).sort((a, b) => b.score - a.score).slice(0, limit)
}

function semanticCandidates(
  viewerId: string,
  profileStrength: number,
  limit: number,
  dataset: RuntimeDataset,
  source: 'twoTower' | 'matrixFactorization' | 'bpr',
): SimulationCandidate[] {
  const profile = genreProfile(viewerId, dataset, profileStrength)
  const profileNorm = Math.sqrt([...profile.values()].reduce((sum, value) => sum + value * value, 0)) || 1
  return dataset.movies.map((movie) => {
    const dotProduct = movie.genres.reduce((sum, genre) => sum + (profile.get(genre) ?? 0), 0)
    const score = clamp01(dotProduct / (profileNorm * Math.sqrt(Math.max(1, movie.genres.length))))
    const matches = movie.genres.filter((genre) => (profile.get(genre) ?? 0) > 0)
    return {
      movieId: movie.id,
      score,
      sourceScores: { [source]: score },
      reasons: [matches.length ? `Shared space matches ${matches.slice(0, 3).join(' + ')}` : 'Exploratory semantic match'],
    }
  }).filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

function annCandidates(
  viewerId: string,
  input: SimulationCandidate[],
  recall: number,
  limit: number,
  dataset: RuntimeDataset,
): SimulationCandidate[] {
  const source = input.some((candidate) => candidate.score > 0)
    ? sortCandidates(input)
    : semanticCandidates(viewerId, 1, Math.max(limit * 2, 80), dataset, 'twoTower')
  const safeRecall = clamp01(recall)
  return source
    .filter((candidate, index) => index < 3 || deterministicUnit(`${viewerId}:${candidate.movieId}:ann`) <= safeRecall)
    .slice(0, limit)
    .map((candidate, index) => {
      const score = clamp01(candidate.score * (0.97 + deterministicUnit(candidate.movieId) * 0.03))
      return {
        ...candidate,
        score,
        sourceScores: { ...candidate.sourceScores, vectorSearch: score },
        reasons: unique([...candidate.reasons, `ANN hit at rank ${index + 1} · target recall ${Math.round(safeRecall * 100)}%`]).slice(0, 4),
      }
    })
}

function sequenceCandidates(
  viewerId: string,
  contextLength: number,
  recency: number,
  limit: number,
  dataset: RuntimeDataset,
): SimulationCandidate[] {
  const history = [...(dataset.ratingsByViewer.get(viewerId) ?? [])]
    .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
    .slice(0, contextLength)
  const attention = new Map<string, number>()
  history.forEach((rating, index) => {
    if (rating.rating < 3) return
    const movie = dataset.movieById[rating.movieId]
    const weight = Math.pow(recency, index) * Math.max(0.1, rating.rating - 2.5)
    for (const genre of movie?.genres ?? []) attention.set(genre, (attention.get(genre) ?? 0) + weight)
  })
  const norm = Math.max(0.001, Math.max(...attention.values(), 1))
  return dataset.movies.map((movie) => {
    const matching = movie.genres.map((genre) => attention.get(genre) ?? 0).sort((a, b) => b - a)
    const score = clamp01(((matching[0] ?? 0) + (matching[1] ?? 0) * 0.35) / norm)
    const activeGenres = movie.genres.filter((genre) => (attention.get(genre) ?? 0) > 0)
    return {
      movieId: movie.id,
      score,
      sourceScores: { sequenceTransformer: score },
      reasons: [activeGenres.length
        ? `Recent sequence attends to ${activeGenres.slice(0, 2).join(' + ')}`
        : 'Low-attention exploratory sequence item'],
    }
  }).filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

function blendCandidates(input: SimulationCandidate[], config: ModuleConfig): SimulationCandidate[] {
  const merged = mergeCandidates(input)
  const personalizedWeight = numberConfig(config, 'personalization', 0.72)
  const baselineWeight = numberConfig(config, 'baseline', 0.28)
  return merged.map((candidate) => {
    const entries = Object.entries(candidate.sourceScores) as Array<[PipelineModuleType, number]>
    const baselineScores = entries.filter(([source]) => source === 'popularity').map(([, score]) => score)
    const personalizedScores = entries.filter(([source]) => source !== 'popularity').map(([, score]) => score)
    const personalized = personalizedScores.length ? average(personalizedScores) : candidate.score
    const baseline = baselineScores.length ? average(baselineScores) : candidate.score
    const activePersonalized = personalizedScores.length ? personalizedWeight : 0
    const activeBaseline = baselineScores.length ? baselineWeight : 0
    const denominator = Math.max(0.001, activePersonalized + activeBaseline)
    const score = denominator
      ? (personalized * activePersonalized + baseline * activeBaseline) / denominator
      : candidate.score
    return {
      ...candidate,
      score: clamp01(score),
      sourceScores: { ...candidate.sourceScores, blend: clamp01(score) },
      reasons: unique([...candidate.reasons, `${entries.length} retrieval signals calibrated`]).slice(0, 5),
    }
  }).sort((a, b) => b.score - a.score)
}

function selectorCandidates(
  viewerId: string,
  input: SimulationCandidate[],
  config: ModuleConfig,
  dataset: RuntimeDataset,
): SimulationCandidate[] {
  const seen = new Set((dataset.ratingsByViewer.get(viewerId) ?? []).map((rating) => rating.movieId))
  const removeSeen = booleanConfig(config, 'removeSeen', true)
  const minYear = numberConfig(config, 'minYear', 1920)
  const maxPerGenre = numberConfig(config, 'maxPerGenre', 40)
  const genreCount = new Map<string, number>()
  return sortCandidates(input).filter((candidate) => {
    const movie = dataset.movieById[candidate.movieId]
    if (!movie || movie.year < minYear || (removeSeen && seen.has(movie.id))) return false
    const primary = movie.genres[0] ?? 'Unknown'
    const count = genreCount.get(primary) ?? 0
    if (count >= maxPerGenre) return false
    genreCount.set(primary, count + 1)
    return true
  })
}

function rankCandidates(input: SimulationCandidate[], config: ModuleConfig, dataset: RuntimeDataset): SimulationCandidate[] {
  const affinityWeight = numberConfig(config, 'affinityWeight', 0.72)
  const popularityWeight = numberConfig(config, 'popularityWeight', 0.2)
  const freshnessWeight = numberConfig(config, 'freshnessWeight', 0.08)
  const totalWeight = Math.max(0.001, affinityWeight + popularityWeight + freshnessWeight)
  const stats = movieStats(dataset)
  const maxCount = Math.max(...Object.values(stats).map((stat) => stat.count), 1)
  const maxYear = Math.max(...dataset.movies.map((movie) => movie.year), 1998)
  const minYear = Math.min(...dataset.movies.filter((movie) => movie.year > 0).map((movie) => movie.year), 1920)
  return input.map((candidate) => {
    const movie = dataset.movieById[candidate.movieId]
    if (!movie) return candidate
    const stat = stats[movie.id] ?? { average: 0, count: 0 }
    const popularity = clamp01((stat.average / 5) * 0.72 + (Math.log1p(stat.count) / Math.log1p(maxCount)) * 0.28)
    const freshness = clamp01((movie.year - minYear) / Math.max(1, maxYear - minYear))
    const normalizedAffinityWeight = affinityWeight / totalWeight
    const normalizedPopularityWeight = popularityWeight / totalWeight
    const normalizedFreshnessWeight = freshnessWeight / totalWeight
    const score = clamp01(
      (candidate.score * affinityWeight + popularity * popularityWeight + freshness * freshnessWeight) / totalWeight,
    )
    const rankBreakdown: CandidateScorePart[] = [
      { signal: 'affinity', value: candidate.score, weight: normalizedAffinityWeight, contribution: candidate.score * normalizedAffinityWeight },
      { signal: 'popularity', value: popularity, weight: normalizedPopularityWeight, contribution: popularity * normalizedPopularityWeight },
      { signal: 'freshness', value: freshness, weight: normalizedFreshnessWeight, contribution: freshness * normalizedFreshnessWeight },
    ]
    return {
      ...candidate,
      score,
      rankBreakdown,
      reasons: unique([...candidate.reasons, 'Affinity, confidence and freshness reranked']).slice(0, 5),
    }
  }).sort((a, b) => b.score - a.score)
}

function generativeCandidates(
  viewerId: string,
  input: SimulationCandidate[],
  config: ModuleConfig,
  dataset: RuntimeDataset,
): SimulationCandidate[] {
  const viewer = dataset.viewerById[viewerId]
  const grounding = numberConfig(config, 'grounding', 0.85)
  const serendipity = numberConfig(config, 'serendipity', 0.18)
  const limit = numberConfig(config, 'limit', 30)
  return input.slice(0, limit).map((candidate) => {
    const movie = dataset.movieById[candidate.movieId]
    const matching = movie?.genres.filter((genre) => viewer.favoriteGenres.includes(genre)) ?? []
    const novelty = catalogNovelty(candidate.movieId, dataset)
    const groundedBoost = matching.length ? Math.min(0.09, matching.length * 0.035 * grounding) : 0
    const score = clamp01(candidate.score * (0.94 + grounding * 0.06) + groundedBoost + novelty * serendipity * 0.08)
    return {
      ...candidate,
      score,
      sourceScores: { ...candidate.sourceScores, generativeReranker: score },
      reasons: unique([
        ...candidate.reasons,
        matching.length
          ? `Grounded rationale: ${matching.slice(0, 2).join(' and ')} fit this viewer's history`
          : 'Grounded rationale: controlled discovery outside the dominant profile',
      ]).slice(0, 5),
    }
  }).sort((a, b) => b.score - a.score)
}

function policyCandidates(
  viewerId: string,
  input: SimulationCandidate[],
  config: ModuleConfig,
  dataset: RuntimeDataset,
): SimulationCandidate[] {
  const exploration = numberConfig(config, 'exploration', 0.12)
  const longTermWeight = numberConfig(config, 'longTermWeight', 0.34)
  return input.map((candidate) => {
    const novelty = catalogNovelty(candidate.movieId, dataset)
    const uncertainty = deterministicUnit(`${viewerId}:${candidate.movieId}:policy`)
    const longTerm = clamp01(novelty * 0.58 + (1 - genreConcentration(candidate.movieId, dataset)) * 0.42)
    const score = clamp01(
      candidate.score * (1 - exploration)
      + uncertainty * exploration * 0.32
      + longTerm * longTermWeight * 0.14,
    )
    return {
      ...candidate,
      score,
      sourceScores: { ...candidate.sourceScores, rlPolicy: score },
      reasons: unique([
        ...candidate.reasons,
        uncertainty > 0.72
          ? `Exploration arm opened with ${Math.round(exploration * 100)}% epsilon`
          : 'Policy exploited the current reward estimate',
      ]).slice(0, 5),
    }
  }).sort((a, b) => b.score - a.score)
}

function diversifyCandidates(
  input: SimulationCandidate[],
  lambda: number,
  limit: number,
  dataset: RuntimeDataset,
): SimulationCandidate[] {
  const pool = sortCandidates(input)
  const selected: SimulationCandidate[] = []
  const safeLambda = clamp01(lambda)
  while (pool.length && selected.length < limit) {
    let bestIndex = 0
    let bestValue = -Infinity
    let bestSimilarity = 0
    for (let index = 0; index < pool.length; index += 1) {
      const candidate = pool[index]
      const similarity = selected.length
        ? Math.max(...selected.map((item) => genreSimilarity(candidate.movieId, item.movieId, dataset)))
        : 0
      const value = safeLambda * candidate.score - (1 - safeLambda) * similarity
      if (value > bestValue) {
        bestValue = value
        bestIndex = index
        bestSimilarity = similarity
      }
    }
    const [next] = pool.splice(bestIndex, 1)
    selected.push({
      ...next,
      score: clamp01(next.score),
      diversityTrace: { lambda: safeLambda, maxSimilarity: bestSimilarity, mmrValue: bestValue },
      reasons: unique([
        ...next.reasons,
        bestSimilarity > 0
          ? `MMR limited ${Math.round(bestSimilarity * 100)}% genre overlap`
          : 'MMR kept a distinct genre direction',
      ]).slice(0, 5),
    })
  }
  return selected
}

function buildTrace(
  node: PipelineNodeSpec,
  definition: PipelineModuleDefinition,
  input: SimulationCandidate[],
  output: SimulationCandidate[],
  inputCount: number,
  latencyMs: number,
  pathLatencyMs: number,
  dataset: RuntimeDataset,
): NodeTrace {
  const outputIds = new Set(output.map((candidate) => candidate.movieId))
  const inputById = new Map(input.map((candidate) => [candidate.movieId, candidate]))
  const removed = sortCandidates(input)
    .filter((candidate) => !outputIds.has(candidate.movieId))
    .slice(0, SNAPSHOT_LIMIT)
    .map((candidate, index) => ({
      ...snapshotCandidate(candidate, index, inputById),
      removalReason: removalReason(node.moduleType, candidate.movieId, dataset),
    }))
  return {
    nodeId: node.id,
    moduleType: node.moduleType,
    inputCount,
    outputCount: output.length,
    latencyMs,
    pathLatencyMs,
    status: 'ok',
    inputItems: sortCandidates(input).slice(0, SNAPSHOT_LIMIT).map((candidate, index) => snapshotCandidate(candidate, index)),
    outputItems: sortCandidates(output).slice(0, SNAPSHOT_LIMIT).map((candidate, index) => snapshotCandidate(candidate, index, inputById)),
    removedItems: removed,
    summary: traceSummary(node.moduleType, inputCount, output.length, definition),
    fidelity: definition.fidelity,
  }
}

function snapshotCandidate(
  candidate: SimulationCandidate,
  index: number,
  inputById?: Map<string, SimulationCandidate>,
): StageItemSnapshot {
  const previous = inputById?.get(candidate.movieId)
  return {
    movieId: candidate.movieId,
    rank: index + 1,
    score: candidate.score,
    delta: previous ? candidate.score - previous.score : 0,
    reasons: candidate.reasons.slice(0, 3),
    sources: Object.keys(candidate.sourceScores) as PipelineModuleType[],
  }
}

function traceSummary(
  type: PipelineModuleType,
  inputCount: number,
  outputCount: number,
  definition: PipelineModuleDefinition,
): string {
  if (type === 'ratingsSource') return `Read ${inputCount.toLocaleString()} observed ratings and exposed ${outputCount.toLocaleString()} catalog items.`
  if (outputCount < inputCount) return `${definition.shortLabel} kept ${outputCount.toLocaleString()} of ${inputCount.toLocaleString()} items.`
  if (outputCount > inputCount) return `${definition.shortLabel} retrieved ${outputCount.toLocaleString()} candidates from the catalog.`
  return `${definition.shortLabel} transformed ${outputCount.toLocaleString()} items without changing pool size.`
}

function removalReason(type: PipelineModuleType, movieId: string, dataset: RuntimeDataset): string {
  const movie = dataset.movieById[movieId]
  if (type === 'seenFilter') return 'Removed by seen-item, year or per-genre selector.'
  if (type === 'diversify') return 'Outside the MMR diversity-aware slate.'
  if (type === 'output') return 'Below the configured Top-K boundary.'
  if (type === 'vectorSearch') return 'ANN approximation or Top-K boundary pruned this neighbour.'
  if (type === 'generativeReranker') return 'Outside the grounded reranker context window.'
  return movie ? `Pruned by ${PIPELINE_MODULES[type].shortLabel} ranking boundary.` : 'Item metadata unavailable.'
}

function calculateMetrics(
  viewerId: string,
  recommendations: SimulationCandidate[],
  latencyMs: number,
  dataset: RuntimeDataset,
): SimulationMetrics {
  if (!recommendations.length) return { ...zeroMetrics(), latencyMs }
  const viewer = dataset.viewerById[viewerId]
  const quality = average(recommendations.map((candidate) => candidate.score))
  const diversity = slateDiversity(recommendations.map((candidate) => candidate.movieId), dataset)
  const genreCoverage = new Set(recommendations.flatMap((candidate) => dataset.movieById[candidate.movieId]?.genres ?? [])).size
  const allGenres = new Set(dataset.movies.flatMap((movie) => movie.genres)).size
  const novelty = average(recommendations.map((candidate) => catalogNovelty(candidate.movieId, dataset)))
  const profileHit = average(recommendations.map((candidate) => {
    const movie = dataset.movieById[candidate.movieId]
    return movie?.genres.some((genre) => viewer.favoriteGenres.includes(genre)) ? 1 : 0.45
  }))
  return {
    quality: clamp01(quality * 0.84 + profileHit * 0.16),
    diversity,
    coverage: clamp01(genreCoverage / Math.max(1, allGenres)),
    novelty: clamp01(novelty),
    latencyMs,
  }
}

function mergeCandidates(candidates: SimulationCandidate[]): SimulationCandidate[] {
  const merged = new Map<string, SimulationCandidate>()
  for (const candidate of candidates) {
    const current = merged.get(candidate.movieId)
    if (!current) {
      merged.set(candidate.movieId, {
        movieId: candidate.movieId,
        score: candidate.score,
        sourceScores: { ...candidate.sourceScores },
        reasons: [...candidate.reasons],
        rankBreakdown: candidate.rankBreakdown?.map((part) => ({ ...part })),
        diversityTrace: candidate.diversityTrace ? { ...candidate.diversityTrace } : undefined,
      })
      continue
    }
    current.score = Math.max(current.score, candidate.score)
    current.sourceScores = { ...current.sourceScores, ...candidate.sourceScores }
    current.reasons = unique([...current.reasons, ...candidate.reasons])
    current.rankBreakdown = candidate.rankBreakdown?.map((part) => ({ ...part })) ?? current.rankBreakdown
    current.diversityTrace = candidate.diversityTrace ? { ...candidate.diversityTrace } : current.diversityTrace
  }
  return [...merged.values()]
}

function genreProfile(viewerId: string, dataset: RuntimeDataset, strength: number): Map<string, number> {
  const viewer = dataset.viewerById[viewerId]
  const profile = new Map<string, number>()
  for (const genre of viewer.favoriteGenres) profile.set(genre, (profile.get(genre) ?? 0) + 1.5 * strength)
  for (const rating of dataset.ratingsByViewer.get(viewerId) ?? []) {
    if (rating.rating < 3.5) continue
    const movie = dataset.movieById[rating.movieId]
    for (const genre of movie?.genres ?? []) {
      profile.set(genre, (profile.get(genre) ?? 0) + (rating.rating - 2.5) * strength)
    }
  }
  return profile
}

function ratingsForViewer(viewerId: string, dataset: RuntimeDataset): Map<string, number> {
  return new Map((dataset.ratingsByViewer.get(viewerId) ?? []).map((rating) => [rating.movieId, rating.rating]))
}

function ratingSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  const shared = [...a.keys()].filter((movieId) => b.has(movieId))
  if (shared.length < 3) return 0
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (const movieId of shared) {
    const av = (a.get(movieId) ?? 3) - 3
    const bv = (b.get(movieId) ?? 3) - 3
    dotProduct += av * bv
    normA += av * av
    normB += bv * bv
  }
  return normA && normB ? dotProduct / Math.sqrt(normA * normB) : 0
}

const movieStatsCache = new WeakMap<RuntimeDataset, Record<string, { count: number; average: number }>>()

function movieStats(dataset: RuntimeDataset): Record<string, { count: number; average: number }> {
  const cached = movieStatsCache.get(dataset)
  if (cached) return cached
  const stats: Record<string, { count: number; average: number }> = {}
  for (const movie of dataset.movies) {
    const ratings = dataset.ratingsByMovie.get(movie.id) ?? []
    stats[movie.id] = {
      count: ratings.length,
      average: ratings.length ? average(ratings.map((rating) => rating.rating)) : 0,
    }
  }
  movieStatsCache.set(dataset, stats)
  return stats
}

function catalogNovelty(movieId: string, dataset: RuntimeDataset): number {
  const stats = movieStats(dataset)
  const maxCount = Math.max(...Object.values(stats).map((stat) => stat.count), 1)
  return clamp01(1 - (stats[movieId]?.count ?? 0) / maxCount)
}

function genreConcentration(movieId: string, dataset: RuntimeDataset): number {
  const movie = dataset.movieById[movieId]
  return movie ? 1 / Math.max(1, movie.genres.length) : 1
}

function genreSimilarity(aId: string, bId: string, dataset: RuntimeDataset): number {
  const a = new Set(dataset.movieById[aId]?.genres ?? [])
  const b = new Set(dataset.movieById[bId]?.genres ?? [])
  const union = new Set([...a, ...b])
  if (!union.size) return 0
  const intersection = [...a].filter((genre) => b.has(genre)).length
  return intersection / union.size
}

function slateDiversity(movieIds: string[], dataset: RuntimeDataset): number {
  const pairDistances: number[] = []
  for (let i = 0; i < movieIds.length; i += 1) {
    for (let j = i + 1; j < movieIds.length; j += 1) {
      pairDistances.push(1 - genreSimilarity(movieIds[i], movieIds[j], dataset))
    }
  }
  return clamp01(pairDistances.length ? average(pairDistances) : 1)
}

function estimateLatency(
  definition: PipelineModuleDefinition,
  inputCount: number,
  outputCount: number,
  config: ModuleConfig,
): number {
  const complexity = Math.min(14, Math.round(Math.log1p(inputCount) * 1.25 + outputCount * 0.012))
  const neighbourCost = definition.type === 'collaborative'
    ? Math.round(numberConfig(config, 'neighbors', 24) * 0.18)
    : 0
  const annDiscount = definition.type === 'vectorSearch'
    ? Math.round(numberConfig(config, 'efSearch', 64) * 0.025)
    : 0
  return definition.latencyMs + complexity + neighbourCost + annDiscount
}

function numberConfig(config: ModuleConfig, key: string, fallback: number): number {
  const value = config[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function booleanConfig(config: ModuleConfig, key: string, fallback: boolean): boolean {
  const value = config[key]
  return typeof value === 'boolean' ? value : fallback
}

function sortCandidates(candidates: SimulationCandidate[]): SimulationCandidate[] {
  return [...candidates].sort((a, b) => b.score - a.score)
}

function unique(values: string[]): string[] {
  return [...new Set(values)]
}

function average(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function dot(a: number[], b: number[]): number {
  let value = 0
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) value += a[index] * b[index]
  return value
}

function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value))
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function deterministicUnit(value: string): number {
  return (hashString(value) % 10_000) / 10_000
}

function hashString(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

function zeroMetrics(): SimulationMetrics {
  return { quality: 0, diversity: 0, coverage: 0, novelty: 0, latencyMs: 0 }
}

function emptyResult(error: string, dataset: RuntimeDataset): SimulationResult {
  return {
    recommendations: [],
    trace: {},
    metrics: zeroMetrics(),
    visitedNodeIds: [],
    error,
    datasetId: dataset.meta.id,
  }
}
