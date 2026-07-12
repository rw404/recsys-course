import type { ModuleConfig, PipelineModuleType } from '../logic/systemSimulator'

export type SystemTemplateId = 'hybrid' | 'personalized' | 'fast' | 'deep' | 'generative' | 'adaptive' | 'blank'

export interface SystemTemplateNode {
  id: string
  moduleType: PipelineModuleType
  position: { x: number; y: number }
  config?: ModuleConfig
}

export interface SystemTemplateEdge {
  id: string
  source: string
  target: string
}

export interface SystemTemplate {
  id: SystemTemplateId
  name: string
  description: string
  nodes: SystemTemplateNode[]
  edges: SystemTemplateEdge[]
}

function edge(source: string, target: string): SystemTemplateEdge {
  return { id: `${source}-${target}`, source, target }
}

export const SYSTEM_TEMPLATES: Record<SystemTemplateId, SystemTemplate> = {
  hybrid: {
    id: 'hybrid',
    name: 'Hybrid production',
    description: 'Three retrieval paths, a weighted blend, policy filters and MMR.',
    nodes: [
      { id: 'ratings', moduleType: 'ratingsSource', position: { x: 0, y: 180 } },
      { id: 'features', moduleType: 'featureStore', position: { x: 210, y: 10 } },
      { id: 'collaborative', moduleType: 'collaborative', position: { x: 250, y: 150 } },
      { id: 'popularity', moduleType: 'popularity', position: { x: 250, y: 300 } },
      { id: 'vector', moduleType: 'vectorSearch', position: { x: 470, y: 10 } },
      { id: 'blend', moduleType: 'blend', position: { x: 510, y: 180 } },
      { id: 'filters', moduleType: 'seenFilter', position: { x: 740, y: 180 } },
      { id: 'ranker', moduleType: 'ranker', position: { x: 960, y: 180 } },
      { id: 'diversify', moduleType: 'diversify', position: { x: 1180, y: 180 } },
      { id: 'evaluate', moduleType: 'evaluator', position: { x: 1400, y: 180 } },
      { id: 'slate', moduleType: 'output', position: { x: 1620, y: 180 } },
    ],
    edges: [
      edge('ratings', 'features'),
      edge('ratings', 'collaborative'),
      edge('ratings', 'popularity'),
      edge('features', 'vector'),
      edge('collaborative', 'blend'),
      edge('popularity', 'blend'),
      edge('vector', 'blend'),
      edge('blend', 'filters'),
      edge('filters', 'ranker'),
      edge('ranker', 'diversify'),
      edge('diversify', 'evaluate'),
      edge('evaluate', 'slate'),
    ],
  },
  personalized: {
    id: 'personalized',
    name: 'Personalized retrieval',
    description: 'Collaborative and vector candidates with a relevance-first ranker.',
    nodes: [
      { id: 'ratings', moduleType: 'ratingsSource', position: { x: 0, y: 130 } },
      { id: 'features', moduleType: 'featureStore', position: { x: 220, y: 10 } },
      { id: 'collaborative', moduleType: 'collaborative', position: { x: 250, y: 210 } },
      { id: 'vector', moduleType: 'vectorSearch', position: { x: 480, y: 10 } },
      { id: 'blend', moduleType: 'blend', position: { x: 520, y: 150 }, config: { cfWeight: 0.58, vectorWeight: 0.42, popularityWeight: 0 } },
      { id: 'filters', moduleType: 'seenFilter', position: { x: 750, y: 150 } },
      { id: 'ranker', moduleType: 'ranker', position: { x: 980, y: 150 }, config: { affinityWeight: 0.82, popularityWeight: 0.08, freshnessWeight: 0.1 } },
      { id: 'diversify', moduleType: 'diversify', position: { x: 1210, y: 150 }, config: { lambda: 0.78, limit: 8 } },
      { id: 'evaluate', moduleType: 'evaluator', position: { x: 1440, y: 150 } },
      { id: 'slate', moduleType: 'output', position: { x: 1670, y: 150 } },
    ],
    edges: [
      edge('ratings', 'features'),
      edge('ratings', 'collaborative'),
      edge('features', 'vector'),
      edge('collaborative', 'blend'),
      edge('vector', 'blend'),
      edge('blend', 'filters'),
      edge('filters', 'ranker'),
      edge('ranker', 'diversify'),
      edge('diversify', 'evaluate'),
      edge('evaluate', 'slate'),
    ],
  },
  fast: {
    id: 'fast',
    name: 'Fast baseline',
    description: 'Popularity retrieval and a compact rank path for cold-start traffic.',
    nodes: [
      { id: 'ratings', moduleType: 'ratingsSource', position: { x: 0, y: 90 } },
      { id: 'popularity', moduleType: 'popularity', position: { x: 240, y: 90 } },
      { id: 'filters', moduleType: 'seenFilter', position: { x: 480, y: 90 } },
      { id: 'ranker', moduleType: 'ranker', position: { x: 720, y: 90 }, config: { affinityWeight: 0.45, popularityWeight: 0.45, freshnessWeight: 0.1 } },
      { id: 'evaluate', moduleType: 'evaluator', position: { x: 960, y: 90 } },
      { id: 'slate', moduleType: 'output', position: { x: 1200, y: 90 } },
    ],
    edges: [
      edge('ratings', 'popularity'),
      edge('popularity', 'filters'),
      edge('filters', 'ranker'),
      edge('ranker', 'evaluate'),
      edge('evaluate', 'slate'),
    ],
  },
  deep: {
    id: 'deep',
    name: 'Deep hybrid stack',
    description: 'Matrix, two-tower, ANN and sequence retrieval with LTR, selectors and serving.',
    nodes: [
      { id: 'ratings', moduleType: 'ratingsSource', position: { x: 0, y: 180 } },
      { id: 'events', moduleType: 'eventStream', position: { x: 210, y: 180 } },
      { id: 'features', moduleType: 'featureStore', position: { x: 420, y: 180 } },
      { id: 'mf', moduleType: 'matrixFactorization', position: { x: 640, y: 10 } },
      { id: 'tower', moduleType: 'twoTower', position: { x: 640, y: 160 } },
      { id: 'sequence', moduleType: 'sequenceTransformer', position: { x: 640, y: 310 } },
      { id: 'ann', moduleType: 'vectorSearch', position: { x: 870, y: 160 } },
      { id: 'blend', moduleType: 'blend', position: { x: 1100, y: 180 } },
      { id: 'filters', moduleType: 'seenFilter', position: { x: 1320, y: 180 } },
      { id: 'ranker', moduleType: 'ranker', position: { x: 1540, y: 180 } },
      { id: 'diversify', moduleType: 'diversify', position: { x: 1760, y: 180 } },
      { id: 'evaluate', moduleType: 'evaluator', position: { x: 1980, y: 180 } },
      { id: 'serving', moduleType: 'onlineServing', position: { x: 2200, y: 180 } },
      { id: 'slate', moduleType: 'output', position: { x: 2420, y: 180 }, config: { topK: 8 } },
    ],
    edges: [
      edge('ratings', 'events'),
      edge('events', 'features'),
      edge('features', 'mf'),
      edge('features', 'tower'),
      edge('features', 'sequence'),
      edge('tower', 'ann'),
      edge('mf', 'blend'),
      edge('ann', 'blend'),
      edge('sequence', 'blend'),
      edge('blend', 'filters'),
      edge('filters', 'ranker'),
      edge('ranker', 'diversify'),
      edge('diversify', 'evaluate'),
      edge('evaluate', 'serving'),
      edge('serving', 'slate'),
    ],
  },
  generative: {
    id: 'generative',
    name: 'Generative discovery',
    description: 'Two-tower and sequence retrieval with a grounded generative reranker.',
    nodes: [
      { id: 'ratings', moduleType: 'ratingsSource', position: { x: 0, y: 130 } },
      { id: 'features', moduleType: 'featureStore', position: { x: 220, y: 130 } },
      { id: 'tower', moduleType: 'twoTower', position: { x: 440, y: 30 } },
      { id: 'sequence', moduleType: 'sequenceTransformer', position: { x: 440, y: 230 } },
      { id: 'ann', moduleType: 'vectorSearch', position: { x: 670, y: 30 } },
      { id: 'blend', moduleType: 'blend', position: { x: 900, y: 130 } },
      { id: 'filters', moduleType: 'seenFilter', position: { x: 1120, y: 130 } },
      { id: 'ranker', moduleType: 'ranker', position: { x: 1340, y: 130 } },
      { id: 'genai', moduleType: 'generativeReranker', position: { x: 1560, y: 130 } },
      { id: 'diversify', moduleType: 'diversify', position: { x: 1780, y: 130 } },
      { id: 'serving', moduleType: 'onlineServing', position: { x: 2000, y: 130 } },
      { id: 'slate', moduleType: 'output', position: { x: 2220, y: 130 }, config: { topK: 8 } },
    ],
    edges: [
      edge('ratings', 'features'),
      edge('features', 'tower'),
      edge('features', 'sequence'),
      edge('tower', 'ann'),
      edge('ann', 'blend'),
      edge('sequence', 'blend'),
      edge('blend', 'filters'),
      edge('filters', 'ranker'),
      edge('ranker', 'genai'),
      edge('genai', 'diversify'),
      edge('diversify', 'serving'),
      edge('serving', 'slate'),
    ],
  },
  adaptive: {
    id: 'adaptive',
    name: 'Adaptive RL service',
    description: 'BPR retrieval with contextual exploration and a feedback-aware serving policy.',
    nodes: [
      { id: 'ratings', moduleType: 'ratingsSource', position: { x: 0, y: 120 } },
      { id: 'events', moduleType: 'eventStream', position: { x: 220, y: 120 } },
      { id: 'features', moduleType: 'featureStore', position: { x: 440, y: 120 } },
      { id: 'bpr', moduleType: 'bpr', position: { x: 660, y: 120 } },
      { id: 'filters', moduleType: 'seenFilter', position: { x: 880, y: 120 } },
      { id: 'ranker', moduleType: 'ranker', position: { x: 1100, y: 120 } },
      { id: 'policy', moduleType: 'rlPolicy', position: { x: 1320, y: 120 } },
      { id: 'diversify', moduleType: 'diversify', position: { x: 1540, y: 120 } },
      { id: 'evaluate', moduleType: 'evaluator', position: { x: 1760, y: 120 } },
      { id: 'serving', moduleType: 'onlineServing', position: { x: 1980, y: 120 } },
      { id: 'slate', moduleType: 'output', position: { x: 2200, y: 120 }, config: { topK: 8 } },
    ],
    edges: [
      edge('ratings', 'events'),
      edge('events', 'features'),
      edge('features', 'bpr'),
      edge('bpr', 'filters'),
      edge('filters', 'ranker'),
      edge('ranker', 'policy'),
      edge('policy', 'diversify'),
      edge('diversify', 'evaluate'),
      edge('evaluate', 'serving'),
      edge('serving', 'slate'),
    ],
  },
  blank: {
    id: 'blank',
    name: 'Blank canvas',
    description: 'A source and an output with the middle left for you to assemble.',
    nodes: [
      { id: 'ratings', moduleType: 'ratingsSource', position: { x: 0, y: 120 } },
      { id: 'slate', moduleType: 'output', position: { x: 900, y: 120 } },
    ],
    edges: [],
  },
}
