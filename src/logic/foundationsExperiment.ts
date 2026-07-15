import type { SandboxMovie, SandboxViewer } from '../data/movielensSandbox'
import type { RuntimeDataset } from '../data/recommenderDataset'

export interface FoundationsCandidate {
  id: string
  title: string
  category: string
  rel: number
  score: number
  movie: SandboxMovie
  observedRating: number
  catalogAverage: number
  ratingCount: number
}

export interface FoundationsExperimentData {
  viewer: SandboxViewer
  candidates: FoundationsCandidate[]
  baselineIds: string[]
}

interface CandidateDraft extends FoundationsCandidate {
  disagreement: number
}

const CANDIDATE_COUNT = 9
const BASELINE_SIZE = 4

export function buildFoundationsExperiment(
  dataset: RuntimeDataset,
  preferredViewerId = 'u104',
): FoundationsExperimentData | null {
  const viewers = preferredViewerFirst(dataset.viewers, preferredViewerId)
  for (const viewer of viewers) {
    const candidates = buildViewerCandidates(dataset, viewer.id)
    if (candidates.length < 8) continue
    if (candidates.filter((candidate) => candidate.rel >= 2).length < 3) continue
    if (candidates.filter((candidate) => candidate.rel === 0).length < 2) continue
    return {
      viewer,
      candidates,
      baselineIds: [...candidates]
        .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
        .slice(0, BASELINE_SIZE)
        .map((candidate) => candidate.id),
    }
  }
  return null
}

function preferredViewerFirst(viewers: SandboxViewer[], preferredViewerId: string): SandboxViewer[] {
  return [...viewers].sort((left, right) => {
    if (left.id === preferredViewerId) return -1
    if (right.id === preferredViewerId) return 1
    return left.id.localeCompare(right.id, undefined, { numeric: true })
  })
}

function buildViewerCandidates(dataset: RuntimeDataset, viewerId: string): FoundationsCandidate[] {
  const viewerRatings = dataset.ratingsByViewer.get(viewerId) ?? []
  const ratedMovies = viewerRatings.flatMap((rating) => {
    const movie = dataset.movieById[rating.movieId]
    if (!movie) return []
    const catalogRatings = dataset.ratingsByMovie.get(movie.id) ?? []
    if (catalogRatings.length === 0) return []
    const catalogAverage = catalogRatings.reduce((sum, value) => sum + value.rating, 0) / catalogRatings.length
    return [{ movie, rating, catalogAverage, ratingCount: catalogRatings.length }]
  })
  if (ratedMovies.length < 8) return []

  const maxRatingCount = Math.max(1, ...ratedMovies.map((item) => item.ratingCount))
  const drafts: CandidateDraft[] = ratedMovies.map(({ movie, rating, catalogAverage, ratingCount }) => {
    const popularity = Math.log1p(ratingCount) / Math.log1p(maxRatingCount)
    const score = clamp((catalogAverage / 5) * 0.76 + popularity * 0.24, 0, 1)
    const rel = relevanceFromRating(rating.rating)
    return {
      id: movie.id,
      title: movie.title,
      category: movie.genres[0] ?? 'Other',
      rel,
      score,
      movie,
      observedRating: rating.rating,
      catalogAverage,
      ratingCount,
      disagreement: Math.abs(score - rating.rating / 5),
    }
  })

  const high = drafts
    .filter((item) => item.observedRating >= 4)
    .sort((left, right) => left.score - right.score || right.observedRating - left.observedRating)
  const medium = drafts
    .filter((item) => item.observedRating >= 2.5 && item.observedRating < 4)
    .sort((left, right) => right.disagreement - left.disagreement)
  const low = drafts
    .filter((item) => item.observedRating < 2.5)
    .sort((left, right) => right.score - left.score || left.observedRating - right.observedRating)

  const selected = uniqueCandidates([
    ...low.slice(0, 3),
    ...high.slice(0, 4),
    ...medium.slice(0, 2),
  ])

  if (selected.length < CANDIDATE_COUNT) {
    selected.push(...uniqueCandidates(
      drafts
        .filter((item) => !selected.some((selectedItem) => selectedItem.id === item.id))
        .sort((left, right) => right.disagreement - left.disagreement),
    ).slice(0, CANDIDATE_COUNT - selected.length))
  }

  return selected
    .slice(0, CANDIDATE_COUNT)
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
    .map(({ disagreement: _disagreement, ...candidate }) => candidate)
}

export function relevanceFromRating(rating: number): number {
  if (rating >= 4.5) return 3
  if (rating >= 4) return 2
  if (rating >= 2.5) return 1
  return 0
}

function uniqueCandidates(candidates: CandidateDraft[]): CandidateDraft[] {
  const seen = new Set<string>()
  return candidates.filter((candidate) => {
    if (seen.has(candidate.id)) return false
    seen.add(candidate.id)
    return true
  })
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
