#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildTheoryContent, THEORY_SOURCE_ROOT } from './build-theory-content.mjs'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..')
const MANIM_SOURCE = path.join(SCRIPT_DIR, 'manim', 'repository_worlds.py')
const conceptPattern = /^(\d{2})-[a-z0-9][a-z0-9-]*$/
const requestedWorld = process.argv.find((argument) => /^world\d{2}$/.test(argument))
const force = process.argv.includes('--force')
const manim = process.env.MANIM_BIN ?? 'manim'
const ffmpeg = process.env.FFMPEG_BIN ?? 'ffmpeg'

function available(command) {
  return spawnSync(command, ['--version'], { stdio: 'ignore' }).status === 0
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options })
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status}`)
}

function findRenderedVideo(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      const nested = findRenderedVideo(filename)
      if (nested) return nested
    } else if (entry.name === 'RepositoryConceptScene.mp4') {
      return filename
    }
  }
  return null
}

if (!available(manim)) {
  console.error('Manim is not installed. Install Manim Community, then run: npm run content:manim -- world02')
  process.exit(1)
}
if (!available(ffmpeg)) {
  console.error('ffmpeg is required to create the WebM browser fallback.')
  process.exit(1)
}

const worlds = fs.readdirSync(THEORY_SOURCE_ROOT, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^world\d{2}$/.test(entry.name))
  .map((entry) => entry.name)
  .filter((world) => requestedWorld ? world === requestedWorld : world !== 'world01')
  .sort()

if (requestedWorld && worlds.length === 0) {
  throw new Error(`Unknown theory world: ${requestedWorld}`)
}

let rendered = 0
let skipped = 0
for (const world of worlds) {
  const worldDirectory = path.join(THEORY_SOURCE_ROOT, world)
  const concepts = fs.readdirSync(worldDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && conceptPattern.test(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name))

  for (const concept of concepts) {
    const conceptDirectory = path.join(worldDirectory, concept.name)
    const outputMp4 = path.join(conceptDirectory, 'screen.mp4')
    const outputWebm = path.join(conceptDirectory, 'screen.webm')
    if (!force && fs.existsSync(outputMp4) && fs.existsSync(outputWebm)) {
      skipped += 1
      continue
    }

    const metadata = JSON.parse(fs.readFileSync(path.join(conceptDirectory, 'concept.json'), 'utf8'))
    const temporaryMedia = fs.mkdtempSync(path.join(os.tmpdir(), `recsys-manim-${world}-`))
    try {
      run(manim, [
        '--resolution', '1920,888',
        '--fps', '30',
        '--format', 'mp4',
        '--media_dir', temporaryMedia,
        '--disable_caching',
        MANIM_SOURCE,
        'RepositoryConceptScene',
      ], {
        cwd: REPO_ROOT,
        env: {
          ...process.env,
          THEORY_WORLD: world,
          THEORY_INDEX: concept.name.slice(0, 2),
          THEORY_TITLE: metadata.title ?? concept.name,
          THEORY_SUMMARY: metadata.summary ?? '',
        },
      })

      const renderedVideo = findRenderedVideo(temporaryMedia)
      if (!renderedVideo) throw new Error(`Manim produced no RepositoryConceptScene.mp4 for ${world}/${concept.name}`)
      fs.copyFileSync(renderedVideo, outputMp4)
      run(ffmpeg, [
        '-loglevel', 'error',
        '-y',
        '-i', outputMp4,
        '-an',
        '-c:v', 'libvpx-vp9',
        '-crf', '27',
        '-b:v', '0',
        '-deadline', 'good',
        '-cpu-used', '2',
        '-row-mt', '1',
        outputWebm,
      ], { cwd: REPO_ROOT })
      rendered += 1
      console.log(`Rendered ${world}/${concept.name}`)
    } finally {
      fs.rmSync(temporaryMedia, { recursive: true, force: true })
    }
  }
}

buildTheoryContent()
console.log(`Manim theory: ${rendered} rendered, ${skipped} already present`)
