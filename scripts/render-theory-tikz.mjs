#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildTheoryContent, THEORY_SOURCE_ROOT } from './build-theory-content.mjs'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..')

function available(command) {
  return spawnSync(command, ['--version'], { stdio: 'ignore' }).status === 0
}

function findSources(directory) {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name)
    if (entry.isDirectory()) return findSources(filename)
    return entry.isFile() && entry.name.endsWith('.tikz.tex') ? [filename] : []
  })
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' })
  if (result.status !== 0) {
    throw new Error(`${command} failed for ${args.at(-1)}`)
  }
}

const latex = available('latexmk') ? 'latexmk' : available('pdflatex') ? 'pdflatex' : null
const converter = available('dvisvgm')
  ? 'dvisvgm'
  : available('pdf2svg')
  ? 'pdf2svg'
  : available('pdftocairo')
  ? 'pdftocairo'
  : null

if (!latex || !converter) {
  console.error([
    'TikZ rendering needs a LaTeX engine and a PDF-to-SVG converter.',
    'Install latexmk (or pdflatex) plus dvisvgm, pdf2svg, or pdftocairo.',
    'Compiled SVG files are committed beside their .tikz.tex sources, so production does not need TeX.',
  ].join('\n'))
  process.exit(1)
}

const sources = findSources(THEORY_SOURCE_ROOT)
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'recsys-tikz-'))

try {
  for (const source of sources) {
    const workDirectory = path.join(temporaryRoot, path.basename(source, '.tex'))
    fs.mkdirSync(workDirectory, { recursive: true })
    if (latex === 'latexmk') {
      run(latex, ['-pdf', '-interaction=nonstopmode', '-halt-on-error', `-outdir=${workDirectory}`, source], REPO_ROOT)
    } else {
      run(latex, ['-interaction=nonstopmode', '-halt-on-error', `-output-directory=${workDirectory}`, source], REPO_ROOT)
    }

    const pdf = path.join(workDirectory, `${path.basename(source, '.tex')}.pdf`)
    const svg = source.replace(/\.tikz\.tex$/, '.svg')
    if (converter === 'dvisvgm') {
      run(converter, ['--pdf', '--exact', '--bbox=min', `--output=${svg}`, pdf], REPO_ROOT)
    } else if (converter === 'pdf2svg') {
      run(converter, [pdf, svg], REPO_ROOT)
    } else {
      run(converter, ['-svg', pdf, svg], REPO_ROOT)
    }
    console.log(`Rendered ${path.relative(REPO_ROOT, svg)}`)
  }
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true })
}

buildTheoryContent()
console.log(`Rendered ${sources.length} TikZ figure${sources.length === 1 ? '' : 's'}`)
