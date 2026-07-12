import {
  SANDBOX_MOVIES,
  SANDBOX_RATINGS,
  SANDBOX_VIEWERS,
  type SandboxMovie,
  type SandboxRating,
  type SandboxViewer,
} from './movielensSandbox'

export interface DatasetMeta {
  id: 'movielens-100k' | 'movietweetings-100k' | 'sandbox'
  label: string
  source: string
  ratingsCount: number
  moviesCount: number
  viewersCount: number
  isOfficial: boolean
  notice: string
}

export interface LatentFactors {
  dimension: number
  globalMean: number
  userBias: Record<string, number>
  movieBias: Record<string, number>
  users: Record<string, number[]>
  movies: Record<string, number[]>
}

export interface RuntimeDataset {
  meta: DatasetMeta
  movies: SandboxMovie[]
  viewers: SandboxViewer[]
  ratings: SandboxRating[]
  movieById: Record<string, SandboxMovie>
  viewerById: Record<string, SandboxViewer>
  ratingsByViewer: Map<string, SandboxRating[]>
  ratingsByMovie: Map<string, SandboxRating[]>
  latent?: LatentFactors
}

interface CompactRatingsPayload {
  meta: {
    id?: 'movielens-100k' | 'movietweetings-100k'
    label?: string
    source?: string
    notice?: string
    generatedAt: string
    ratingsCount: number
    moviesCount: number
    viewersCount: number
    dimension: number
    globalMean: number
  }
  genres: string[]
  movies: Array<[number, string, number, number[], string, string]>
  users: Array<[number, number, string, string, string]>
  ratings: Array<[number, number, number, number]>
  factors: {
    userBias: number[]
    movieBias: number[]
    users: number[][]
    movies: number[][]
  }
}

const MOVIELENS_DATA_URL = '/data/generated/ml-100k.compact.json'
const MOVIETWEETINGS_DATA_URL = '/data/generated/movietweetings-100k.compact.json'
const IS_PRODUCTION_BUILD = typeof import.meta.env !== 'undefined' && import.meta.env.PROD
const DATASET_URLS = IS_PRODUCTION_BUILD
  ? [MOVIETWEETINGS_DATA_URL]
  : [MOVIELENS_DATA_URL, MOVIETWEETINGS_DATA_URL]

export const SANDBOX_DATASET = createRuntimeDataset({
  meta: {
    id: 'sandbox',
    label: 'Curated offline sample',
    source: 'Built-in educational fixture',
    ratingsCount: SANDBOX_RATINGS.length,
    moviesCount: SANDBOX_MOVIES.length,
    viewersCount: SANDBOX_VIEWERS.length,
    isOfficial: false,
    notice: 'The real ratings payload could not be loaded.',
  },
  movies: SANDBOX_MOVIES,
  viewers: SANDBOX_VIEWERS,
  ratings: SANDBOX_RATINGS,
})

let datasetPromise: Promise<RuntimeDataset> | null = null

export function loadRecommendationDataset(force = false): Promise<RuntimeDataset> {
  if (force) datasetPromise = null
  if (!datasetPromise) datasetPromise = loadRealRatingsDataset()
  return datasetPromise
}

export function createRuntimeDataset({
  meta,
  movies,
  viewers,
  ratings,
  latent,
}: {
  meta: DatasetMeta
  movies: SandboxMovie[]
  viewers: SandboxViewer[]
  ratings: SandboxRating[]
  latent?: LatentFactors
}): RuntimeDataset {
  const ratingsByViewer = new Map<string, SandboxRating[]>()
  const ratingsByMovie = new Map<string, SandboxRating[]>()
  for (const rating of ratings) {
    ratingsByViewer.set(rating.viewerId, [...(ratingsByViewer.get(rating.viewerId) ?? []), rating])
    ratingsByMovie.set(rating.movieId, [...(ratingsByMovie.get(rating.movieId) ?? []), rating])
  }
  return {
    meta,
    movies,
    viewers,
    ratings,
    movieById: Object.fromEntries(movies.map((movie) => [movie.id, movie])),
    viewerById: Object.fromEntries(viewers.map((viewer) => [viewer.id, viewer])),
    ratingsByViewer,
    ratingsByMovie,
    latent,
  }
}

async function loadRealRatingsDataset(): Promise<RuntimeDataset> {
  const failures: string[] = []
  for (const url of DATASET_URLS) {
    try {
      const response = await fetch(url, { cache: 'no-cache' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const payload = await response.json() as CompactRatingsPayload
      if (!payload.ratings?.length || !payload.movies?.length || !payload.users?.length) {
        throw new Error('payload is incomplete')
      }
      return compactPayloadToDataset(payload)
    } catch (error) {
      failures.push(`${url}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  console.error('[Foundry] No real ratings payload could be loaded.', failures)
  return SANDBOX_DATASET
}

function posterUrlFromImdbUrl(imdbUrl: string): string | undefined {
  const imdbId = imdbUrl.match(/tt\d{7,10}/i)?.[0]
  return imdbId
    ? `https://images.metahub.space/poster/medium/${imdbId.toLowerCase()}/img`
    : undefined
}

function compactPayloadToDataset(payload: CompactRatingsPayload): RuntimeDataset {
  const datasetId = payload.meta.id ?? 'movielens-100k'
  const isMovieLens = datasetId === 'movielens-100k'
  const movies: SandboxMovie[] = payload.movies.map(([id, title, year, genreIndexes, imdbUrl, tone]) => ({
    id: `m${id}`,
    title,
    year,
    genres: genreIndexes.map((genreIndex) => payload.genres[genreIndex]).filter(Boolean),
    tone,
    mark: title.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase(),
    imdbUrl,
    posterUrl: posterUrlFromImdbUrl(imdbUrl),
  }))
  const ratings: SandboxRating[] = payload.ratings.map(([viewerId, movieId, rating, timestamp]) => ({
    viewerId: `u${viewerId}`,
    movieId: `m${movieId}`,
    rating,
    timestamp,
  }))
  const movieById = Object.fromEntries(movies.map((movie) => [movie.id, movie])) as Record<string, SandboxMovie>
  const ratingsByViewer = new Map<string, SandboxRating[]>()
  for (const rating of ratings) {
    ratingsByViewer.set(rating.viewerId, [...(ratingsByViewer.get(rating.viewerId) ?? []), rating])
  }
  const viewers: SandboxViewer[] = payload.users.map(([id, age, gender, occupation, zip]) => {
    const viewerId = `u${id}`
    const viewerRatings = ratingsByViewer.get(viewerId) ?? []
    const favoriteGenres = inferFavoriteGenres(viewerRatings, movieById)
    const hasDemographics = age > 0 && Boolean(gender)
    return {
      id: viewerId,
      name: `Viewer ${id}`,
      cohort: hasDemographics ? `${occupation} · age ${age}` : `${occupation || 'public rating profile'} · ${viewerRatings.length} ratings`,
      favoriteGenres,
      note: hasDemographics
        ? `${gender === 'F' ? 'Female' : 'Male'} viewer from the official ML-100K panel (${zip}).`
        : 'An anonymized real rating profile from the public MovieTweetings corpus.',
      age: hasDemographics ? age : undefined,
      gender: hasDemographics ? gender : undefined,
      occupation: occupation || undefined,
    }
  })
  const latent: LatentFactors = {
    dimension: payload.meta.dimension,
    globalMean: payload.meta.globalMean,
    userBias: Object.fromEntries(payload.users.map(([id], index) => [`u${id}`, payload.factors.userBias[index] ?? 0])),
    movieBias: Object.fromEntries(payload.movies.map(([id], index) => [`m${id}`, payload.factors.movieBias[index] ?? 0])),
    users: Object.fromEntries(payload.users.map(([id], index) => [`u${id}`, payload.factors.users[index] ?? []])),
    movies: Object.fromEntries(payload.movies.map(([id], index) => [`m${id}`, payload.factors.movies[index] ?? []])),
  }
  return createRuntimeDataset({
    meta: {
      id: datasetId,
      label: payload.meta.label ?? 'MovieLens 100K',
      source: payload.meta.source ?? 'GroupLens Research · September 1997-April 1998',
      ratingsCount: payload.meta.ratingsCount,
      moviesCount: payload.meta.moviesCount,
      viewersCount: payload.meta.viewersCount,
      isOfficial: true,
      notice: payload.meta.notice ?? 'Official MovieLens 100K ratings. Model behavior in this browser is an educational emulator.',
    },
    movies,
    viewers,
    ratings,
    latent,
  })
}

function inferFavoriteGenres(
  ratings: SandboxRating[],
  movieById: Record<string, SandboxMovie>,
): string[] {
  const scores = new Map<string, number>()
  for (const rating of ratings) {
    const movie = movieById[rating.movieId]
    if (!movie) continue
    const preference = Math.max(0, rating.rating - 2.5)
    for (const genre of movie.genres) scores.set(genre, (scores.get(genre) ?? 0) + preference)
  }
  return [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([genre]) => genre)
}
