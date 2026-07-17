import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { RuntimeDataset } from '../data/recommenderDataset'
import type { SystemTemplateId } from '../data/systemTemplates'
import type {
  ModuleConfig,
  PipelineEdgeSpec,
  PipelineModuleType,
  PipelineNodeSpec,
  SimulationMetrics,
  SimulationResult,
} from '../logic/systemSimulator'
import { getBrowserStorage } from './browserStorage'

export const EXPERIMENT_JOURNAL_STORAGE_KEY = 'recsys-odyssey-experiment-journal'
export const EXPERIMENT_JOURNAL_VERSION = 1
export const MAX_EXPERIMENT_RUNS = 24

export interface ExperimentRecommendationSnapshot {
  movieId: string
  score: number
  reasons: string[]
}

export interface ExperimentModuleSnapshot {
  id: string
  moduleType: PipelineModuleType
  config: ModuleConfig
}

export interface ExperimentRun {
  id: string
  createdAt: string
  title: string
  hypothesis: string
  templateId: SystemTemplateId
  viewerId: string
  datasetId: string
  datasetLabel: string
  modules: ExperimentModuleSnapshot[]
  edges: PipelineEdgeSpec[]
  metrics: SimulationMetrics
  recommendations: ExperimentRecommendationSnapshot[]
}

export interface ExperimentComparison {
  metricDeltas: SimulationMetrics
  slateOverlap: number
  sharedMovieIds: string[]
  addedModules: PipelineModuleType[]
  removedModules: PipelineModuleType[]
  changedModules: PipelineModuleType[]
}

export interface CreateExperimentRunInput {
  title: string
  hypothesis: string
  templateId: SystemTemplateId
  viewerId: string
  dataset: RuntimeDataset
  nodes: PipelineNodeSpec[]
  edges: PipelineEdgeSpec[]
  result: SimulationResult
  now?: string
  id?: string
}

interface ExperimentJournalState {
  runs: ExperimentRun[]
  saveRun: (input: CreateExperimentRunInput) => string
  updateRun: (id: string, patch: Pick<ExperimentRun, 'title' | 'hypothesis'>) => void
  removeRun: (id: string) => void
  clearRuns: () => void
}

export function createExperimentRun(input: CreateExperimentRunInput): ExperimentRun {
  return {
    id: input.id ?? createRunId(),
    createdAt: input.now ?? new Date().toISOString(),
    title: cleanText(input.title, 'Untitled experiment'),
    hypothesis: cleanText(input.hypothesis, 'No hypothesis recorded.'),
    templateId: input.templateId,
    viewerId: input.viewerId,
    datasetId: input.dataset.meta.id,
    datasetLabel: input.dataset.meta.label,
    modules: input.nodes.map((node) => ({
      id: node.id,
      moduleType: node.moduleType,
      config: { ...(node.config ?? {}) },
    })),
    edges: input.edges.map((edge) => ({ source: edge.source, target: edge.target })),
    metrics: { ...input.result.metrics },
    recommendations: input.result.recommendations.slice(0, 16).map((candidate) => ({
      movieId: candidate.movieId,
      score: candidate.score,
      reasons: candidate.reasons.slice(0, 3),
    })),
  }
}

export function compareExperimentRuns(left: ExperimentRun, right: ExperimentRun): ExperimentComparison {
  const leftIds = new Set(left.recommendations.map((item) => item.movieId))
  const rightIds = new Set(right.recommendations.map((item) => item.movieId))
  const sharedMovieIds = [...leftIds].filter((movieId) => rightIds.has(movieId))
  const unionSize = new Set([...leftIds, ...rightIds]).size
  const leftModules = moduleGroups(left.modules)
  const rightModules = moduleGroups(right.modules)
  const moduleTypes = new Set([...leftModules.keys(), ...rightModules.keys()])
  const addedModules: PipelineModuleType[] = []
  const removedModules: PipelineModuleType[] = []
  const changedModules: PipelineModuleType[] = []

  for (const moduleType of moduleTypes) {
    const before = leftModules.get(moduleType) ?? []
    const after = rightModules.get(moduleType) ?? []
    if (!before.length && after.length) addedModules.push(moduleType)
    else if (before.length && !after.length) removedModules.push(moduleType)
    else if (stableValue(before) !== stableValue(after)) changedModules.push(moduleType)
  }

  return {
    metricDeltas: {
      quality: right.metrics.quality - left.metrics.quality,
      diversity: right.metrics.diversity - left.metrics.diversity,
      coverage: right.metrics.coverage - left.metrics.coverage,
      novelty: right.metrics.novelty - left.metrics.novelty,
      latencyMs: right.metrics.latencyMs - left.metrics.latencyMs,
    },
    slateOverlap: unionSize ? sharedMovieIds.length / unionSize : 1,
    sharedMovieIds,
    addedModules,
    removedModules,
    changedModules,
  }
}

export function sanitizeExperimentRuns(value: unknown): ExperimentRun[] {
  if (!Array.isArray(value)) return []
  return value
    .filter(isExperimentRun)
    .slice(0, MAX_EXPERIMENT_RUNS)
    .map((run) => ({
      ...run,
      title: cleanText(run.title, 'Untitled experiment'),
      hypothesis: cleanText(run.hypothesis, 'No hypothesis recorded.'),
      modules: run.modules.map((module) => ({ ...module, config: { ...module.config } })),
      edges: run.edges.map((edge) => ({ ...edge })),
      metrics: { ...run.metrics },
      recommendations: run.recommendations.map((item) => ({
        ...item,
        reasons: item.reasons.slice(0, 3),
      })),
    }))
}

export const useExperimentJournal = create<ExperimentJournalState>()(
  persist(
    (set) => ({
      runs: [],
      saveRun: (input) => {
        const run = createExperimentRun(input)
        set((state) => ({ runs: [run, ...state.runs.filter((item) => item.id !== run.id)].slice(0, MAX_EXPERIMENT_RUNS) }))
        return run.id
      },
      updateRun: (id, patch) => set((state) => ({
        runs: state.runs.map((run) => run.id === id
          ? {
            ...run,
            title: cleanText(patch.title, 'Untitled experiment'),
            hypothesis: cleanText(patch.hypothesis, 'No hypothesis recorded.'),
          }
          : run),
      })),
      removeRun: (id) => set((state) => ({ runs: state.runs.filter((run) => run.id !== id) })),
      clearRuns: () => set({ runs: [] }),
    }),
    {
      name: EXPERIMENT_JOURNAL_STORAGE_KEY,
      version: EXPERIMENT_JOURNAL_VERSION,
      storage: createJSONStorage(getBrowserStorage),
      partialize: (state) => ({ runs: state.runs }),
      merge: (persisted, current) => {
        const source = persisted && typeof persisted === 'object' && 'runs' in persisted
          ? (persisted as { runs?: unknown }).runs
          : []
        return { ...current, runs: sanitizeExperimentRuns(source) }
      },
    },
  ),
)

function moduleGroups(modules: ExperimentModuleSnapshot[]) {
  const groups = new Map<PipelineModuleType, Array<{ id: string; config: ModuleConfig }>>()
  for (const module of modules) {
    groups.set(module.moduleType, [...(groups.get(module.moduleType) ?? []), { id: module.id, config: module.config }])
  }
  for (const [moduleType, entries] of groups) {
    groups.set(moduleType, entries.sort((left, right) => left.id.localeCompare(right.id)))
  }
  return groups
}

function stableValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableValue).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${key}:${stableValue(entry)}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

function isExperimentRun(value: unknown): value is ExperimentRun {
  if (!value || typeof value !== 'object') return false
  const run = value as Partial<ExperimentRun>
  return typeof run.id === 'string'
    && typeof run.createdAt === 'string'
    && typeof run.title === 'string'
    && typeof run.hypothesis === 'string'
    && typeof run.templateId === 'string'
    && typeof run.viewerId === 'string'
    && typeof run.datasetId === 'string'
    && typeof run.datasetLabel === 'string'
    && Array.isArray(run.modules)
    && run.modules.every((module) => Boolean(module)
      && typeof module.id === 'string'
      && typeof module.moduleType === 'string'
      && Boolean(module.config)
      && typeof module.config === 'object')
    && Array.isArray(run.edges)
    && run.edges.every((edge) => Boolean(edge) && typeof edge.source === 'string' && typeof edge.target === 'string')
    && isMetrics(run.metrics)
    && Array.isArray(run.recommendations)
    && run.recommendations.every((item) => Boolean(item)
      && typeof item.movieId === 'string'
      && typeof item.score === 'number'
      && Array.isArray(item.reasons)
      && item.reasons.every((reason) => typeof reason === 'string'))
}

function isMetrics(value: unknown): value is SimulationMetrics {
  if (!value || typeof value !== 'object') return false
  const metrics = value as Partial<SimulationMetrics>
  return typeof metrics.quality === 'number'
    && typeof metrics.diversity === 'number'
    && typeof metrics.coverage === 'number'
    && typeof metrics.novelty === 'number'
    && typeof metrics.latencyMs === 'number'
}

function cleanText(value: string, fallback: string): string {
  const text = value.trim().replace(/\s+/g, ' ')
  return text.slice(0, 280) || fallback
}

function createRunId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
