import { useEffect, useState } from 'react'
import type { WorldId } from '../state/progress'

export type TheoryFigure = {
  id: string
  src: string
  source: string | null
  sourceRepositoryPath: string | null
}

export type TheoryConceptContent = {
  index: number
  slug: string
  title: string
  summary: string
  icon: string | null
  duration: number | null
  repositoryPath: string
  notes: string | null
  notesFormat: 'tex' | 'markdown' | null
  video: { webm?: string; mp4?: string } | null
  poster: string | null
  figures: TheoryFigure[]
}

export type TheoryJourneyActivity = {
  id: string
  kind: 'theory' | 'experiment' | 'foundry' | 'checkpoint'
  title: string
  summary: string
  nodeId: string | null
  templateId: string | null
  required: boolean
}

export type TheoryJourney = {
  estimatedMinutes: number | null
  outcomes: string[]
  activities: TheoryJourneyActivity[]
}

export type TheoryWorldContent = {
  worldId: WorldId
  folder: string
  title: string
  kicker: string
  lessonNodeId: string | null
  screenPlacement: 'left' | 'center'
  journey: TheoryJourney | null
  concepts: TheoryConceptContent[]
}

export type TheoryManifest = {
  version: number
  repository: string
  generatedAt: string
  worlds: Partial<Record<WorldId, TheoryWorldContent>>
}

type ManifestState = {
  manifest: TheoryManifest | null
  loading: boolean
  error: string | null
}

type SourceState = {
  source: string | null
  loading: boolean
  error: string | null
}

const MANIFEST_URL = `${import.meta.env.BASE_URL}theory-content/manifest.json`
let manifestValue: TheoryManifest | null = null
let manifestPromise: Promise<TheoryManifest> | null = null
const sourceValues = new Map<string, string>()
const sourcePromises = new Map<string, Promise<string>>()

function fetchManifest(): Promise<TheoryManifest> {
  if (manifestValue) return Promise.resolve(manifestValue)
  if (!manifestPromise) {
    manifestPromise = fetch(MANIFEST_URL, { cache: import.meta.env.DEV ? 'no-store' : 'default' })
      .then((response) => {
        if (!response.ok) throw new Error(`Theory manifest returned ${response.status}`)
        return response.json() as Promise<TheoryManifest>
      })
      .then((manifest) => {
        manifestValue = manifest
        return manifest
      })
      .finally(() => {
        manifestPromise = null
      })
  }
  return manifestPromise
}

function fetchSource(url: string): Promise<string> {
  const cached = sourceValues.get(url)
  if (cached !== undefined) return Promise.resolve(cached)
  const pending = sourcePromises.get(url)
  if (pending) return pending

  const request = fetch(url, { cache: import.meta.env.DEV ? 'no-store' : 'default' })
    .then((response) => {
      if (!response.ok) throw new Error(`Theory source returned ${response.status}`)
      return response.text()
    })
    .then((source) => {
      sourceValues.set(url, source)
      return source
    })
    .finally(() => sourcePromises.delete(url))
  sourcePromises.set(url, request)
  return request
}

export function useTheoryManifest(): ManifestState {
  const [state, setState] = useState<ManifestState>(() => ({
    manifest: manifestValue,
    loading: manifestValue === null,
    error: null,
  }))

  useEffect(() => {
    let active = true
    if (manifestValue) {
      setState({ manifest: manifestValue, loading: false, error: null })
      return () => { active = false }
    }
    setState((value) => ({ ...value, loading: true, error: null }))
    void fetchManifest().then(
      (manifest) => active && setState({ manifest, loading: false, error: null }),
      (error: unknown) => active && setState({
        manifest: null,
        loading: false,
        error: error instanceof Error ? error.message : String(error),
      }),
    )
    return () => { active = false }
  }, [])

  return state
}

export function useTheoryWorld(worldId: WorldId): ManifestState & { world: TheoryWorldContent | null } {
  const state = useTheoryManifest()
  return { ...state, world: state.manifest?.worlds[worldId] ?? null }
}

export function useTheoryConcept(worldId: WorldId, index: number) {
  const state = useTheoryWorld(worldId)
  return {
    ...state,
    concept: state.world?.concepts.find((concept) => concept.index === index)
      ?? state.world?.concepts[index]
      ?? null,
  }
}

export function useTheorySource(url: string | null | undefined): SourceState {
  const [state, setState] = useState<SourceState>(() => ({
    source: url ? sourceValues.get(url) ?? null : null,
    loading: Boolean(url && !sourceValues.has(url)),
    error: null,
  }))

  useEffect(() => {
    let active = true
    if (!url) {
      setState({ source: null, loading: false, error: null })
      return () => { active = false }
    }
    const cached = sourceValues.get(url)
    if (cached !== undefined) {
      setState({ source: cached, loading: false, error: null })
      return () => { active = false }
    }
    setState({ source: null, loading: true, error: null })
    void fetchSource(url).then(
      (source) => active && setState({ source, loading: false, error: null }),
      (error: unknown) => active && setState({
        source: null,
        loading: false,
        error: error instanceof Error ? error.message : String(error),
      }),
    )
    return () => { active = false }
  }, [url])

  return state
}
