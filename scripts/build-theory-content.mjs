import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..')

export const THEORY_SOURCE_ROOT = path.join(REPO_ROOT, 'content', 'theory')
export const THEORY_OUTPUT_ROOT = path.join(REPO_ROOT, 'public', 'theory-content')

const CONCEPT_DIR = /^(\d{2})-([a-z0-9][a-z0-9-]*)$/
const VIDEO_FORMATS = ['webm', 'mp4']
const POSTER_FORMATS = ['webp', 'png', 'jpg', 'jpeg']
const FIGURE_FORMATS = new Set(['.svg', '.png', '.webp', '.jpg', '.jpeg'])

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'))
}

function publicUrl(...segments) {
  return '/' + ['theory-content', ...segments].map((segment) => encodeURIComponent(segment)).join('/')
}

function firstExisting(directory, basenames, extensions) {
  for (const basename of basenames) {
    for (const extension of extensions) {
      const filename = path.join(directory, `${basename}.${extension}`)
      if (fs.existsSync(filename)) return { filename, extension }
    }
  }
  return null
}

function conceptManifest(worldFolder, entry) {
  const match = CONCEPT_DIR.exec(entry.name)
  if (!match || !entry.isDirectory()) return null

  const directory = path.join(THEORY_SOURCE_ROOT, worldFolder, entry.name)
  const metadataFile = path.join(directory, 'concept.json')
  const metadata = fs.existsSync(metadataFile) ? readJson(metadataFile) : {}
  const notesTex = path.join(directory, 'notes.tex')
  const notesMarkdown = path.join(directory, 'notes.md')
  const video = {}

  for (const extension of VIDEO_FORMATS) {
    const candidate = firstExisting(directory, ['screen', metadata.videoBasename].filter(Boolean), [extension])
    if (candidate) video[extension] = publicUrl(worldFolder, entry.name, path.basename(candidate.filename))
  }

  const poster = firstExisting(directory, ['poster'], POSTER_FORMATS)
  const figuresDirectory = path.join(directory, 'figures')
  const figures = []
  const warnings = []

  if (fs.existsSync(figuresDirectory)) {
    const figureEntries = fs.readdirSync(figuresDirectory, { withFileTypes: true })
    for (const figure of figureEntries) {
      if (!figure.isFile() || !FIGURE_FORMATS.has(path.extname(figure.name).toLowerCase())) continue
      const sourceName = figure.name.replace(/\.(svg|png|webp|jpe?g)$/i, '.tikz.tex')
      figures.push({
        id: path.basename(figure.name, path.extname(figure.name)),
        src: publicUrl(worldFolder, entry.name, 'figures', figure.name),
        source: fs.existsSync(path.join(figuresDirectory, sourceName))
          ? publicUrl(worldFolder, entry.name, 'figures', sourceName)
          : null,
        sourceRepositoryPath: fs.existsSync(path.join(figuresDirectory, sourceName))
          ? path.posix.join('content', 'theory', worldFolder, entry.name, 'figures', sourceName)
          : null,
      })
    }

    for (const figure of figureEntries) {
      if (!figure.isFile() || !figure.name.endsWith('.tikz.tex')) continue
      const expectedSvg = figure.name.replace(/\.tikz\.tex$/, '.svg')
      if (!fs.existsSync(path.join(figuresDirectory, expectedSvg))) {
        warnings.push(`${worldFolder}/${entry.name}/figures/${figure.name} has no compiled ${expectedSvg}`)
      }
    }
  }

  return {
    concept: {
      index: Number(match[1]),
      slug: match[2],
      title: metadata.title ?? match[2].replaceAll('-', ' '),
      summary: metadata.summary ?? '',
      icon: metadata.icon ?? null,
      duration: metadata.duration ?? null,
      repositoryPath: path.posix.join('content', 'theory', worldFolder, entry.name),
      notes: fs.existsSync(notesTex)
        ? publicUrl(worldFolder, entry.name, 'notes.tex')
        : fs.existsSync(notesMarkdown)
        ? publicUrl(worldFolder, entry.name, 'notes.md')
        : null,
      notesFormat: fs.existsSync(notesTex) ? 'tex' : fs.existsSync(notesMarkdown) ? 'markdown' : null,
      video: Object.keys(video).length > 0 ? video : null,
      poster: poster ? publicUrl(worldFolder, entry.name, path.basename(poster.filename)) : null,
      figures,
    },
    warnings,
  }
}

export function buildTheoryContent({ log = true } = {}) {
  if (!fs.existsSync(THEORY_SOURCE_ROOT)) {
    fs.mkdirSync(THEORY_SOURCE_ROOT, { recursive: true })
  }

  fs.mkdirSync(THEORY_OUTPUT_ROOT, { recursive: true })
  fs.cpSync(THEORY_SOURCE_ROOT, THEORY_OUTPUT_ROOT, { recursive: true, force: true })

  const worlds = {}
  const warnings = []
  const worldEntries = fs.readdirSync(THEORY_SOURCE_ROOT, { withFileTypes: true })

  for (const worldEntry of worldEntries) {
    if (!worldEntry.isDirectory() || !/^world\d{2}$/.test(worldEntry.name)) continue
    const worldDirectory = path.join(THEORY_SOURCE_ROOT, worldEntry.name)
    const metadataFile = path.join(worldDirectory, 'world.json')
    if (!fs.existsSync(metadataFile)) {
      warnings.push(`${worldEntry.name} is missing world.json`)
      continue
    }

    const metadata = readJson(metadataFile)
    if (!metadata.worldId) throw new Error(`${metadataFile} must define worldId`)
    const concepts = fs.readdirSync(worldDirectory, { withFileTypes: true })
      .map((entry) => conceptManifest(worldEntry.name, entry))
      .filter(Boolean)
    concepts.forEach((result) => warnings.push(...result.warnings))

    worlds[metadata.worldId] = {
      worldId: metadata.worldId,
      folder: worldEntry.name,
      title: metadata.title ?? metadata.worldId,
      kicker: metadata.kicker ?? metadata.title ?? metadata.worldId,
      lessonNodeId: metadata.lessonNodeId ?? null,
      screenPlacement: metadata.screenPlacement === 'left' ? 'left' : 'center',
      concepts: concepts.map((result) => result.concept).sort((a, b) => a.index - b.index),
    }
  }

  const manifest = {
    version: 1,
    repository: 'https://github.com/rw404/recsys-course',
    generatedAt: new Date().toISOString(),
    worlds,
  }
  fs.writeFileSync(
    path.join(THEORY_OUTPUT_ROOT, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  )

  if (log) {
    const conceptCount = Object.values(worlds).reduce((sum, world) => sum + world.concepts.length, 0)
    console.log(`Theory content: ${Object.keys(worlds).length} worlds, ${conceptCount} concepts`)
    warnings.forEach((warning) => console.warn(`Theory content warning: ${warning}`))
  }

  return { manifest, warnings }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildTheoryContent()
}
