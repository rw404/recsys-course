import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const cacheDir = join(root, '.cache', 'movietweetings')
const outputDir = join(root, 'public', 'data', 'generated')
const ratingsPath = join(cacheDir, 'ratings.dat')
const moviesPath = join(cacheDir, 'movies.dat')
const sourceRoot = 'https://raw.githubusercontent.com/sidooms/MovieTweetings/master/latest'
const targetRatings = 100_000
const targetUsers = 943
const targetMovies = 1_682
const palette = [
  '#5c87d8', '#ec6c57', '#ed9f42', '#64a879', '#64b6aa', '#e6b648', '#635e96', '#6196a5',
  '#c66d83', '#8870c9', '#586b91', '#a55464', '#ce8f4f', '#536ccf', '#d56f9e', '#39a2c0',
]

mkdirSync(cacheDir, { recursive: true })
mkdirSync(outputDir, { recursive: true })
download('ratings.dat', ratingsPath)
download('movies.dat', moviesPath)

const movieSource = new Map(readFileSync(moviesPath, 'utf8').trim().split('\n').map((row) => {
  const [rawId, rawTitle = '', rawGenres = ''] = row.replace(/\r$/, '').split('::')
  const year = Number(rawTitle.match(/\((\d{4})\)\s*$/)?.[1]) || 0
  const title = rawTitle.replace(/\s*\(\d{4}\)\s*$/, '')
  const genres = rawGenres.split('|').map((genre) => genre.trim()).filter(Boolean)
  return [normalizeId(rawId), { rawId: normalizeId(rawId), title, year, genres }]
}))

const rawRatings = readFileSync(ratingsPath, 'utf8').trim().split('\n').flatMap((row) => {
  const [rawUserId, rawMovieId, rawRating, rawTimestamp] = row.replace(/\r$/, '').split('::')
  const movieId = normalizeId(rawMovieId)
  if (!movieSource.has(movieId)) return []
  return [{
    userId: Number(rawUserId),
    movieId,
    rating: Math.max(0.5, Math.min(5, Number(rawRating) / 2)),
    timestamp: Number(rawTimestamp),
  }]
})

const userCounts = countBy(rawRatings, (rating) => rating.userId)
const selectedUserIds = [...userCounts.entries()]
  .sort((a, b) => b[1] - a[1] || a[0] - b[0])
  .slice(0, targetUsers)
  .map(([userId]) => userId)
const selectedUserSet = new Set(selectedUserIds)
const userCandidateRatings = rawRatings.filter((rating) => selectedUserSet.has(rating.userId))

const movieCounts = countBy(userCandidateRatings, (rating) => rating.movieId)
const selectedMovieIds = [...movieCounts.entries()]
  .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
  .slice(0, targetMovies)
  .map(([movieId]) => movieId)
const selectedMovieSet = new Set(selectedMovieIds)
const eligibleRatings = userCandidateRatings.filter((rating) => selectedMovieSet.has(rating.movieId))

if (eligibleRatings.length < targetRatings) {
  throw new Error(`MovieTweetings sample has only ${eligibleRatings.length.toLocaleString()} eligible ratings`)
}

const ratingsByUser = new Map(selectedUserIds.map((userId) => [userId, []]))
for (const rating of eligibleRatings) ratingsByUser.get(rating.userId)?.push(rating)
for (const ratings of ratingsByUser.values()) ratings.sort((a, b) => b.timestamp - a.timestamp || a.movieId.localeCompare(b.movieId))

const sampledRatings = []
let offset = 0
while (sampledRatings.length < targetRatings) {
  let added = 0
  for (const userId of selectedUserIds) {
    const rating = ratingsByUser.get(userId)?.[offset]
    if (!rating) continue
    sampledRatings.push(rating)
    added += 1
    if (sampledRatings.length === targetRatings) break
  }
  if (!added) break
  offset += 1
}
if (sampledRatings.length !== targetRatings) throw new Error(`Unable to sample ${targetRatings.toLocaleString()} ratings`)

const usedMovieIds = [...new Set(sampledRatings.map((rating) => rating.movieId))]
  .sort((a, b) => (movieCounts.get(b) ?? 0) - (movieCounts.get(a) ?? 0) || a.localeCompare(b))
const userIdMap = new Map(selectedUserIds.map((userId, index) => [userId, index + 1]))
const movieIdMap = new Map(usedMovieIds.map((movieId, index) => [movieId, index + 1]))
const genreNames = ['Unknown', ...new Set(usedMovieIds.flatMap((movieId) => movieSource.get(movieId)?.genres ?? []))]
const genreIndex = new Map(genreNames.map((genre, index) => [genre, index]))

const movies = usedMovieIds.map((rawMovieId, index) => {
  const movie = movieSource.get(rawMovieId)
  const genreIndexes = movie.genres.map((genre) => genreIndex.get(genre)).filter((value) => value !== undefined)
  const primaryGenre = genreIndexes[0] ?? 0
  return [
    index + 1,
    movie.title,
    movie.year,
    genreIndexes,
    `https://www.imdb.com/title/tt${rawMovieId.padStart(7, '0')}/`,
    palette[primaryGenre % palette.length],
  ]
})
const users = selectedUserIds.map((_, index) => [index + 1, 0, '', 'public rating profile', ''])
const ratings = sampledRatings.map((rating) => [
  userIdMap.get(rating.userId),
  movieIdMap.get(rating.movieId),
  rating.rating,
  rating.timestamp,
])
const factors = trainMatrixFactorization(users, movies, ratings, 12, 12)
const payload = {
  meta: {
    id: 'movietweetings-100k',
    label: 'MovieTweetings 100K',
    source: 'MovieTweetings · real public ratings collected from Twitter',
    notice: 'Real MovieTweetings ratings distributed under the repository MIT license. Model behavior is an educational emulator.',
    generatedAt: new Date(ratings.reduce((latest, row) => Math.max(latest, row[3]), 0) * 1000).toISOString(),
    ratingsCount: ratings.length,
    moviesCount: movies.length,
    viewersCount: users.length,
    dimension: factors.dimension,
    globalMean: factors.globalMean,
  },
  genres: genreNames,
  movies,
  users,
  ratings,
  factors: {
    userBias: factors.userBias,
    movieBias: factors.movieBias,
    users: factors.users,
    movies: factors.movies,
  },
}
const outputPath = join(outputDir, 'movietweetings-100k.compact.json')
writeFileSync(outputPath, JSON.stringify(payload))
console.log(`Prepared ${ratings.length.toLocaleString()} real ratings, ${movies.length.toLocaleString()} movies and ${users.length.toLocaleString()} viewers`)
console.log(`Wrote ${outputPath}`)

function download(name, outputPath) {
  if (existsSync(outputPath)) return
  const url = `${sourceRoot}/${name}`
  console.log(`Downloading ${url}`)
  execFileSync('curl', ['-fL', '--retry', '3', '--retry-delay', '2', url, '-o', outputPath], { stdio: 'inherit' })
}

function normalizeId(value) {
  return String(value).trim().replace(/^tt/i, '').replace(/^0+(?=\d)/, '')
}

function countBy(values, selectKey) {
  const counts = new Map()
  for (const value of values) {
    const key = selectKey(value)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

function trainMatrixFactorization(users, movies, ratings, dimension, epochs) {
  const random = seededRandom(100_943_1682)
  const userFactors = users.map(() => Array.from({ length: dimension }, () => (random() - 0.5) * 0.08))
  const movieFactors = movies.map(() => Array.from({ length: dimension }, () => (random() - 0.5) * 0.08))
  const userBias = users.map(() => 0)
  const movieBias = movies.map(() => 0)
  const userIndex = new Map(users.map((user, index) => [user[0], index]))
  const movieIndex = new Map(movies.map((movie, index) => [movie[0], index]))
  const globalMean = ratings.reduce((sum, row) => sum + row[2], 0) / ratings.length
  const order = ratings.map((_, index) => index)

  for (let epoch = 0; epoch < epochs; epoch += 1) {
    shuffle(order, random)
    const learningRate = 0.018 * (1 - epoch / (epochs * 1.35))
    for (const ratingIndex of order) {
      const [rawUserId, rawMovieId, rating] = ratings[ratingIndex]
      const u = userIndex.get(rawUserId)
      const m = movieIndex.get(rawMovieId)
      const userVector = userFactors[u]
      const movieVector = movieFactors[m]
      let prediction = globalMean + userBias[u] + movieBias[m]
      for (let k = 0; k < dimension; k += 1) prediction += userVector[k] * movieVector[k]
      const error = rating - prediction
      userBias[u] += learningRate * (error - 0.035 * userBias[u])
      movieBias[m] += learningRate * (error - 0.035 * movieBias[m])
      for (let k = 0; k < dimension; k += 1) {
        const previousUserValue = userVector[k]
        userVector[k] += learningRate * (error * movieVector[k] - 0.045 * userVector[k])
        movieVector[k] += learningRate * (error * previousUserValue - 0.045 * movieVector[k])
      }
    }
  }
  return {
    dimension,
    globalMean: round(globalMean),
    userBias: userBias.map(round),
    movieBias: movieBias.map(round),
    users: userFactors.map((values) => values.map(round)),
    movies: movieFactors.map((values) => values.map(round)),
  }
}

function seededRandom(seed) {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

function shuffle(values, random) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const next = Math.floor(random() * (index + 1))
    const value = values[index]
    values[index] = values[next]
    values[next] = value
  }
}

function round(value) {
  return Math.round(value * 10_000) / 10_000
}
