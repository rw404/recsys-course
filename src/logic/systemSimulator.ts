import {
  SANDBOX_MOVIES,
  SANDBOX_MOVIE_BY_ID,
  SANDBOX_RATINGS,
  SANDBOX_VIEWER_BY_ID,
  SANDBOX_VIEWERS,
  type MovieGenre,
} from '../data/movielensSandbox'

export type PipelineModuleType =
  | 'ratingsSource'
  | 'featureStore'
  | 'popularity'
  | 'collaborative'
  | 'vectorSearch'
  | 'blend'
  | 'seenFilter'
  | 'ranker'
  | 'diversify'
  | 'evaluator'
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

export interface NodeTrace {
  nodeId: string
  inputCount: number
  outputCount: number
  latencyMs: number
  pathLatencyMs: number
  status: 'ok' | 'error'
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
}

export const PIPELINE_MODULES: Record<PipelineModuleType, PipelineModuleDefinition> = {
  ratingsSource: {
    type: 'ratingsSource',
    label: 'Ratings source',
    shortLabel: 'Ratings',
    family: 'data',
    description: 'Explicit viewer-film events from the local MovieLens-style table.',
    latencyMs: 4,
    acceptsInput: false,
    emitsOutput: true,
    defaultConfig: {},
    fields: [],
  },
  featureStore: {
    type: 'featureStore',
    label: 'Feature store',
    shortLabel: 'Features',
    family: 'data',
    description: 'Builds a viewer genre profile and exposes film metadata.',
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
    description: 'A strong cold-start baseline using rating mean and support.',
    latencyMs: 5,
    acceptsInput: true,
    emitsOutput: true,
    defaultConfig: { limit: 12 },
    fields: [{ key: 'limit', label: 'Candidates', type: 'number', min: 4, max: 18, step: 1 }],
  },
  collaborative: {
    type: 'collaborative',
    label: 'User collaborative',
    shortLabel: 'User CF',
    family: 'retrieval',
    description: 'Scores unseen films from the nearest rating-neighbourhood.',
    latencyMs: 16,
    acceptsInput: true,
    emitsOutput: true,
    defaultConfig: { neighbors: 4, limit: 12 },
    fields: [
      { key: 'neighbors', label: 'Neighbours', type: 'range', min: 2, max: 7, step: 1 },
      { key: 'limit', label: 'Candidates', type: 'number', min: 4, max: 18, step: 1 },
    ],
  },
  vectorSearch: {
    type: 'vectorSearch',
    label: 'Vector retrieval',
    shortLabel: 'Vector ANN',
    family: 'retrieval',
    description: 'Matches the viewer genre embedding against film vectors.',
    latencyMs: 9,
    acceptsInput: true,
    emitsOutput: true,
    defaultConfig: { profileStrength: 1, limit: 12 },
    fields: [
      { key: 'profileStrength', label: 'Profile strength', type: 'range', min: 0.4, max: 1.6, step: 0.1 },
      { key: 'limit', label: 'Candidates', type: 'number', min: 4, max: 18, step: 1 },
    ],
  },
  blend: {
    type: 'blend',
    label: 'Candidate blend',
    shortLabel: 'Blend',
    family: 'control',
    description: 'Merges duplicate candidates while preserving retrieval evidence.',
    latencyMs: 3,
    acceptsInput: true,
    emitsOutput: true,
    defaultConfig: { cfWeight: 0.45, vectorWeight: 0.35, popularityWeight: 0.2 },
    fields: [
      { key: 'cfWeight', label: 'CF weight', type: 'range', min: 0, max: 1, step: 0.05 },
      { key: 'vectorWeight', label: 'Vector weight', type: 'range', min: 0, max: 1, step: 0.05 },
      { key: 'popularityWeight', label: 'Popularity weight', type: 'range', min: 0, max: 1, step: 0.05 },
    ],
  },
  seenFilter: {
    type: 'seenFilter',
    label: 'Policy filters',
    shortLabel: 'Filters',
    family: 'control',
    description: 'Removes seen films and applies a minimum release year.',
    latencyMs: 2,
    acceptsInput: true,
    emitsOutput: true,
    defaultConfig: { removeSeen: true, minYear: 1994 },
    fields: [
      { key: 'removeSeen', label: 'Remove seen', type: 'toggle' },
      { key: 'minYear', label: 'Minimum year', type: 'number', min: 1994, max: 2001, step: 1 },
    ],
  },
  ranker: {
    type: 'ranker',
    label: 'Weighted ranker',
    shortLabel: 'Ranker',
    family: 'ranking',
    description: 'Combines retrieval affinity, popularity and freshness.',
    latencyMs: 8,
    acceptsInput: true,
    emitsOutput: true,
    defaultConfig: { affinityWeight: 0.7, popularityWeight: 0.2, freshnessWeight: 0.1 },
    fields: [
      { key: 'affinityWeight', label: 'Affinity', type: 'range', min: 0, max: 1, step: 0.05 },
      { key: 'popularityWeight', label: 'Popularity', type: 'range', min: 0, max: 1, step: 0.05 },
      { key: 'freshnessWeight', label: 'Freshness', type: 'range', min: 0, max: 1, step: 0.05 },
    ],
  },
  diversify: {
    type: 'diversify',
    label: 'MMR diversify',
    shortLabel: 'MMR',
    family: 'ranking',
    description: 'Trades a little relevance for a less repetitive slate.',
    latencyMs: 6,
    acceptsInput: true,
    emitsOutput: true,
    defaultConfig: { lambda: 0.72, limit: 8 },
    fields: [
      { key: 'lambda', label: 'Relevance lambda', type: 'range', min: 0.2, max: 1, step: 0.05 },
      { key: 'limit', label: 'Slate pool', type: 'number', min: 4, max: 12, step: 1 },
    ],
  },
  evaluator: {
    type: 'evaluator',
    label: 'Metric probe',
    shortLabel: 'Evaluate',
    family: 'evaluation',
    description: 'Observes quality, diversity, coverage, novelty and latency.',
    latencyMs: 2,
    acceptsInput: true,
    emitsOutput: true,
    defaultConfig: {},
    fields: [],
  },
  output: {
    type: 'output',
    label: 'Recommendation slate',
    shortLabel: 'Slate',
    family: 'output',
    description: 'Keeps the final top-k recommendations and their explanations.',
    latencyMs: 1,
    acceptsInput: true,
    emitsOutput: false,
    defaultConfig: { topK: 4 },
    fields: [{ key: 'topK', label: 'Top K', type: 'range', min: 3, max: 8, step: 1 }],
  },
}

export function simulatePipeline(
  viewerId: string,
  nodes: PipelineNodeSpec[],
  edges: PipelineEdgeSpec[],
): SimulationResult {
  const viewer = SANDBOX_VIEWER_BY_ID[viewerId]
  if (!viewer) return emptyResult(`Unknown viewer: ${viewerId}`)
  if (nodes.length === 0) return emptyResult('Add at least one module to the pipeline.')

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
  if (order.length !== nodes.length) return emptyResult('The graph contains a cycle. Remove one of the returning edges.')

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
        inputCount: 0,
        outputCount: 0,
        latencyMs: definition.latencyMs,
        pathLatencyMs: definition.latencyMs,
        status: 'error',
        message: 'Connect an upstream module.',
      }
      continue
    }

    const output = processModule(node.moduleType, viewerId, inputCandidates, config)
    const latencyMs = estimateLatency(definition, inputCandidates.length, output.length, config)
    const nodePathLatency = parentLatency + latencyMs
    outputs.set(nodeId, output)
    pathLatency.set(nodeId, nodePathLatency)
    trace[nodeId] = {
      nodeId,
      inputCount: node.moduleType === 'ratingsSource' ? SANDBOX_RATINGS.length : inputCandidates.length,
      outputCount: output.length,
      latencyMs,
      pathLatencyMs: nodePathLatency,
      status: 'ok',
    }
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
    }
  }

  const finalNode = outputNodes.find((node) => (outputs.get(node.id) ?? []).length > 0) ?? outputNodes[0]
  const recommendations = outputs.get(finalNode.id) ?? []
  const latencyMs = pathLatency.get(finalNode.id) ?? 0
  const reachable = trace[finalNode.id]?.status === 'ok' && recommendations.length > 0

  return {
    recommendations,
    trace,
    metrics: calculateMetrics(viewerId, recommendations, latencyMs),
    visitedNodeIds,
    error: reachable ? null : 'The output has no candidates. Check the highlighted module path.',
  }
}

function processModule(
  type: PipelineModuleType,
  viewerId: string,
  input: SimulationCandidate[],
  config: ModuleConfig,
): SimulationCandidate[] {
  switch (type) {
    case 'ratingsSource':
    case 'featureStore':
      return SANDBOX_MOVIES.map((movie) => ({ movieId: movie.id, score: 0, sourceScores: {}, reasons: [] }))
    case 'popularity':
      return popularityCandidates(numberConfig(config, 'limit', 12))
    case 'collaborative':
      return collaborativeCandidates(
        viewerId,
        numberConfig(config, 'neighbors', 4),
        numberConfig(config, 'limit', 12),
      )
    case 'vectorSearch':
      return vectorCandidates(
        viewerId,
        numberConfig(config, 'profileStrength', 1),
        numberConfig(config, 'limit', 12),
      )
    case 'blend':
      return blendCandidates(input, config)
    case 'seenFilter': {
      const seen = new Set(SANDBOX_RATINGS.filter((rating) => rating.viewerId === viewerId).map((rating) => rating.movieId))
      const removeSeen = booleanConfig(config, 'removeSeen', true)
      const minYear = numberConfig(config, 'minYear', 1994)
      return input.filter((candidate) => {
        const movie = SANDBOX_MOVIE_BY_ID[candidate.movieId]
        return movie && movie.year >= minYear && (!removeSeen || !seen.has(movie.id))
      })
    }
    case 'ranker':
      return rankCandidates(input, config)
    case 'diversify':
      return diversifyCandidates(input, numberConfig(config, 'lambda', 0.72), numberConfig(config, 'limit', 8))
    case 'evaluator':
      return [...input]
    case 'output':
      return input.slice(0, numberConfig(config, 'topK', 4))
    default:
      return input
  }
}

function popularityCandidates(limit: number): SimulationCandidate[] {
  const stats = movieStats()
  const maxCount = Math.max(...Object.values(stats).map((stat) => stat.count), 1)
  return SANDBOX_MOVIES.map((movie) => {
    const stat = stats[movie.id]
    const score = (stat.average / 5) * 0.76 + (Math.log1p(stat.count) / Math.log1p(maxCount)) * 0.24
    return {
      movieId: movie.id,
      score,
      sourceScores: { popularity: score },
      reasons: [`${stat.average.toFixed(1)} average from ${stat.count} viewers`],
    }
  }).sort((a, b) => b.score - a.score).slice(0, limit)
}

function collaborativeCandidates(viewerId: string, neighborLimit: number, limit: number): SimulationCandidate[] {
  const targetRatings = ratingsForViewer(viewerId)
  const neighbours = SANDBOX_VIEWERS.filter((viewer) => viewer.id !== viewerId)
    .map((viewer) => ({ viewer, similarity: ratingSimilarity(targetRatings, ratingsForViewer(viewer.id)) }))
    .filter((entry) => entry.similarity > 0.01)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, neighborLimit)

  const candidates: SimulationCandidate[] = []
  for (const movie of SANDBOX_MOVIES) {
    if (targetRatings.has(movie.id)) continue
    let weighted = 0
    let weight = 0
    const supporters: string[] = []
    for (const neighbour of neighbours) {
      const rating = ratingsForViewer(neighbour.viewer.id).get(movie.id)
      if (rating === undefined) continue
      weighted += neighbour.similarity * (rating / 5)
      weight += Math.abs(neighbour.similarity)
      if (rating >= 4) supporters.push(neighbour.viewer.name)
    }
    if (weight <= 0) continue
    const score = clamp01(weighted / weight)
    candidates.push({
      movieId: movie.id,
      score,
      sourceScores: { collaborative: score },
      reasons: [supporters.length ? `Liked by ${supporters.slice(0, 2).join(' and ')}` : 'Similar-viewer signal'],
    })
  }
  return candidates.sort((a, b) => b.score - a.score).slice(0, limit)
}

function vectorCandidates(viewerId: string, profileStrength: number, limit: number): SimulationCandidate[] {
  const viewer = SANDBOX_VIEWER_BY_ID[viewerId]
  const profile = new Map<MovieGenre, number>()
  for (const genre of viewer.favoriteGenres) profile.set(genre, (profile.get(genre) ?? 0) + 1.5 * profileStrength)
  for (const rating of SANDBOX_RATINGS.filter((item) => item.viewerId === viewerId && item.rating >= 3.5)) {
    const movie = SANDBOX_MOVIE_BY_ID[rating.movieId]
    for (const genre of movie.genres) {
      profile.set(genre, (profile.get(genre) ?? 0) + (rating.rating - 2.5) * profileStrength)
    }
  }
  const profileNorm = Math.sqrt([...profile.values()].reduce((sum, value) => sum + value * value, 0)) || 1
  return SANDBOX_MOVIES.map((movie) => {
    const dot = movie.genres.reduce((sum, genre) => sum + (profile.get(genre) ?? 0), 0)
    const score = clamp01(dot / (profileNorm * Math.sqrt(movie.genres.length)))
    const matches = movie.genres.filter((genre) => (profile.get(genre) ?? 0) > 0)
    return {
      movieId: movie.id,
      score,
      sourceScores: { vectorSearch: score },
      reasons: [matches.length ? `Matches ${matches.join(' + ')}` : 'Exploratory vector match'],
    }
  }).filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

function blendCandidates(input: SimulationCandidate[], config: ModuleConfig): SimulationCandidate[] {
  const merged = mergeCandidates(input)
  const weights: Partial<Record<PipelineModuleType, number>> = {
    collaborative: numberConfig(config, 'cfWeight', 0.45),
    vectorSearch: numberConfig(config, 'vectorWeight', 0.35),
    popularity: numberConfig(config, 'popularityWeight', 0.2),
  }
  const activeSources = new Set(input.flatMap((candidate) => Object.keys(candidate.sourceScores)))
  const configuredWeight = Math.max(0.001, Object.entries(weights).reduce(
    (sum, [source, value]) => activeSources.has(source) ? sum + (value ?? 0) : sum,
    0,
  ))
  return merged.map((candidate) => {
    let weighted = 0
    for (const [source, score] of Object.entries(candidate.sourceScores)) {
      const sourceWeight = weights[source as PipelineModuleType] ?? 0.1
      weighted += (score ?? 0) * sourceWeight
    }
    const signalCount = Object.keys(candidate.sourceScores).length
    return {
      ...candidate,
      score: weighted / configuredWeight,
      reasons: unique([...candidate.reasons, `${signalCount} retrieval signal${signalCount === 1 ? '' : 's'} blended`]).slice(0, 3),
    }
  }).sort((a, b) => b.score - a.score)
}

function rankCandidates(input: SimulationCandidate[], config: ModuleConfig): SimulationCandidate[] {
  const affinityWeight = numberConfig(config, 'affinityWeight', 0.7)
  const popularityWeight = numberConfig(config, 'popularityWeight', 0.2)
  const freshnessWeight = numberConfig(config, 'freshnessWeight', 0.1)
  const totalWeight = Math.max(0.001, affinityWeight + popularityWeight + freshnessWeight)
  const stats = movieStats()
  const maxCount = Math.max(...Object.values(stats).map((stat) => stat.count), 1)
  return input.map((candidate) => {
    const movie = SANDBOX_MOVIE_BY_ID[candidate.movieId]
    const popularity = ((stats[movie.id]?.average ?? 0) / 5) * 0.7 + ((stats[movie.id]?.count ?? 0) / maxCount) * 0.3
    const freshness = clamp01((movie.year - 1994) / 7)
    const normalizedAffinityWeight = affinityWeight / totalWeight
    const normalizedPopularityWeight = popularityWeight / totalWeight
    const normalizedFreshnessWeight = freshnessWeight / totalWeight
    const score = clamp01(
      (candidate.score * affinityWeight + popularity * popularityWeight + freshness * freshnessWeight) / totalWeight,
    )
    const rankBreakdown: CandidateScorePart[] = [
      {
        signal: 'affinity',
        value: candidate.score,
        weight: normalizedAffinityWeight,
        contribution: candidate.score * normalizedAffinityWeight,
      },
      {
        signal: 'popularity',
        value: popularity,
        weight: normalizedPopularityWeight,
        contribution: popularity * normalizedPopularityWeight,
      },
      {
        signal: 'freshness',
        value: freshness,
        weight: normalizedFreshnessWeight,
        contribution: freshness * normalizedFreshnessWeight,
      },
    ]
    return {
      ...candidate,
      score,
      rankBreakdown,
      reasons: unique([...candidate.reasons, 'Affinity, popularity and freshness reranked']).slice(0, 4),
    }
  }).sort((a, b) => b.score - a.score)
}

function diversifyCandidates(input: SimulationCandidate[], lambda: number, limit: number): SimulationCandidate[] {
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
        ? Math.max(...selected.map((item) => genreSimilarity(candidate.movieId, item.movieId)))
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
      score: clamp01(next.score * 0.92 + (1 - bestValue) * 0.02),
      diversityTrace: {
        lambda: safeLambda,
        maxSimilarity: bestSimilarity,
        mmrValue: bestValue,
      },
      reasons: unique([
        ...next.reasons,
        bestSimilarity > 0
          ? `Diversity guard avoided ${Math.round(bestSimilarity * 100)}% overlap`
          : 'Diversity guard kept a distinct genre',
      ]).slice(0, 4),
    })
  }
  return selected
}

function calculateMetrics(viewerId: string, recommendations: SimulationCandidate[], latencyMs: number): SimulationMetrics {
  if (!recommendations.length) return { ...zeroMetrics(), latencyMs }
  const viewer = SANDBOX_VIEWER_BY_ID[viewerId]
  const quality = average(recommendations.map((candidate) => candidate.score))
  const pairDistances: number[] = []
  for (let i = 0; i < recommendations.length; i += 1) {
    for (let j = i + 1; j < recommendations.length; j += 1) {
      pairDistances.push(1 - genreSimilarity(recommendations[i].movieId, recommendations[j].movieId))
    }
  }
  const diversity = pairDistances.length ? average(pairDistances) : 1
  const genreCoverage = new Set(recommendations.flatMap((candidate) => SANDBOX_MOVIE_BY_ID[candidate.movieId].genres)).size
  const allGenres = new Set(SANDBOX_MOVIES.flatMap((movie) => movie.genres)).size
  const stats = movieStats()
  const maxCount = Math.max(...Object.values(stats).map((stat) => stat.count), 1)
  const novelty = average(recommendations.map((candidate) => 1 - (stats[candidate.movieId]?.count ?? 0) / maxCount))
  const profileHit = average(recommendations.map((candidate) => {
    const movie = SANDBOX_MOVIE_BY_ID[candidate.movieId]
    return movie.genres.some((genre) => viewer.favoriteGenres.includes(genre)) ? 1 : 0.45
  }))
  return {
    quality: clamp01(quality * 0.84 + profileHit * 0.16),
    diversity: clamp01(diversity),
    coverage: clamp01(genreCoverage / allGenres),
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

function ratingsForViewer(viewerId: string): Map<string, number> {
  return new Map(
    SANDBOX_RATINGS.filter((rating) => rating.viewerId === viewerId)
      .map((rating) => [rating.movieId, rating.rating]),
  )
}

function ratingSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  const shared = [...a.keys()].filter((movieId) => b.has(movieId))
  if (shared.length < 2) return 0
  let dot = 0
  let normA = 0
  let normB = 0
  for (const movieId of shared) {
    const av = (a.get(movieId) ?? 3) - 3
    const bv = (b.get(movieId) ?? 3) - 3
    dot += av * bv
    normA += av * av
    normB += bv * bv
  }
  return normA && normB ? dot / Math.sqrt(normA * normB) : 0
}

function movieStats(): Record<string, { count: number; average: number }> {
  const stats: Record<string, { count: number; average: number }> = {}
  for (const movie of SANDBOX_MOVIES) {
    const ratings = SANDBOX_RATINGS.filter((rating) => rating.movieId === movie.id)
    stats[movie.id] = { count: ratings.length, average: ratings.length ? average(ratings.map((rating) => rating.rating)) : 0 }
  }
  return stats
}

function genreSimilarity(aId: string, bId: string): number {
  const a = new Set(SANDBOX_MOVIE_BY_ID[aId]?.genres ?? [])
  const b = new Set(SANDBOX_MOVIE_BY_ID[bId]?.genres ?? [])
  const union = new Set([...a, ...b])
  if (!union.size) return 0
  const intersection = [...a].filter((genre) => b.has(genre)).length
  return intersection / union.size
}

function estimateLatency(
  definition: PipelineModuleDefinition,
  inputCount: number,
  outputCount: number,
  config: ModuleConfig,
): number {
  const complexity = Math.min(7, Math.round(inputCount * 0.12 + outputCount * 0.06))
  const neighbourCost = definition.type === 'collaborative' ? numberConfig(config, 'neighbors', 4) : 0
  return definition.latencyMs + complexity + neighbourCost
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

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function zeroMetrics(): SimulationMetrics {
  return { quality: 0, diversity: 0, coverage: 0, novelty: 0, latencyMs: 0 }
}

function emptyResult(error: string): SimulationResult {
  return { recommendations: [], trace: {}, metrics: zeroMetrics(), visitedNodeIds: [], error }
}
