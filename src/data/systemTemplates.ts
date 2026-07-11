import type { ModuleConfig, PipelineModuleType } from '../logic/systemSimulator'

export type SystemTemplateId = 'hybrid' | 'personalized' | 'fast' | 'blank'

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
