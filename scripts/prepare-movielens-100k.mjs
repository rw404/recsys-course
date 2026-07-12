import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const cacheDir = join(root, '.cache', 'movielens-100k')
const outputDir = join(root, 'public', 'data', 'generated')
const archivePath = join(cacheDir, 'ml-100k.zip')
const extractedDir = join(cacheDir, 'ml-100k')
const sourceUrl = 'https://files.grouplens.org/datasets/movielens/ml-100k.zip'
const genreNames = [
  'Unknown', 'Action', 'Adventure', 'Animation', 'Children', 'Comedy', 'Crime', 'Documentary', 'Drama',
  'Fantasy', 'Film-Noir', 'Horror', 'Musical', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'War', 'Western',
]
const palette = [
  '#5c87d8', '#ec6c57', '#ed9f42', '#64a879', '#64b6aa', '#e6b648', '#635e96', '#6196a5', '#c66d83',
  '#8870c9', '#586b91', '#a55464', '#ce8f4f', '#536ccf', '#d56f9e', '#39a2c0', '#54798c', '#8a7359', '#76a45f',
]

mkdirSync(cacheDir, { recursive: true })
mkdirSync(outputDir, { recursive: true })

if (!existsSync(archivePath)) {
  console.log(`Downloading ${sourceUrl}`)
  execFileSync('curl', ['-L', sourceUrl, '-o', archivePath], { stdio: 'inherit' })
}
if (!existsSync(extractedDir)) {
  console.log(`Extracting ${basename(archivePath)}`)
  execFileSync('unzip', ['-o', archivePath, '-d', cacheDir], { stdio: 'inherit' })
}

const movieRows = readFileSync(join(extractedDir, 'u.item')).toString('latin1').trim().split('\n')
const userRows = readFileSync(join(extractedDir, 'u.user'), 'utf8').trim().split('\n')
const ratingRows = readFileSync(join(extractedDir, 'u.data'), 'utf8').trim().split('\n')

const movies = movieRows.map((row) => {
  const columns = row.split('|')
  const id = Number(columns[0])
  const title = columns[1].replace(/\s*\(\d{4}\)\s*$/, '')
  const year = Number(columns[2]?.slice(-4)) || Number(columns[1].match(/\((\d{4})\)\s*$/)?.[1]) || 0
  const imdbUrl = columns[4] ?? ''
  const genreIndexes = columns.slice(5, 24).map(Number).flatMap((flag, index) => flag ? [index] : [])
  const primaryGenre = genreIndexes.find((index) => index > 0) ?? 0
  return [id, title, year, genreIndexes, imdbUrl, palette[primaryGenre]]
})
const users = userRows.map((row) => {
  const [id, age, gender, occupation, zip] = row.split('|')
  return [Number(id), Number(age), gender, occupation, zip]
})
const ratings = ratingRows.map((row) => row.trim().split(/\s+/).map(Number))

const factors = trainMatrixFactorization(users, movies, ratings, 12, 14)
const payload = {
  meta: {
    generatedAt: new Date().toISOString(),
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
const outputPath = join(outputDir, 'ml-100k.compact.json')
writeFileSync(outputPath, JSON.stringify(payload))
console.log(`Prepared ${ratings.length.toLocaleString()} ratings, ${movies.length.toLocaleString()} movies and ${users.length.toLocaleString()} users`)
console.log(`Wrote ${outputPath}`)

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
