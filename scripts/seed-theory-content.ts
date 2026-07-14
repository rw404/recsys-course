import fs from 'node:fs'
import path from 'node:path'
import {
  CAPSTONE_LESSON,
  WEEK01_LESSON,
  WEEK02_LESSON,
  WEEK03_LESSON,
  WEEK04_LESSON,
  WEEK05_LESSON,
  type LessonSection,
} from '../src/data/course'

const ROOT = path.resolve('content/theory')
const force = process.argv.includes('--force')

type Lesson = { title: string; intro: string; sections: LessonSection[] }
type WorldSeed = {
  folder: string
  worldId: string
  lessonNodeId: string
  title: string
  kicker: string
  screenPlacement: 'left' | 'center'
  introNarration: string
  lesson: Lesson
}

const WORLDS: WorldSeed[] = [
  {
    folder: 'world01',
    worldId: 'foundations-camp',
    lessonNodeId: 'week01-station',
    title: 'Recommender Foundations',
    kicker: 'World 01 · Recommender Foundations',
    screenPlacement: 'left',
    introNarration: 'Start with the decision, the evidence and the stages. Every later model fits into this map.',
    lesson: WEEK01_LESSON,
  },
  {
    folder: 'world02',
    worldId: 'retrieval-valley',
    lessonNodeId: 'two-tower-lesson',
    title: 'Retrieval Systems',
    kicker: 'World 02 · Retrieval Systems',
    screenPlacement: 'center',
    introNarration: 'Preserve useful options under a strict latency budget; ranking can only work with what retrieval keeps.',
    lesson: WEEK02_LESSON,
  },
  {
    folder: 'world03',
    worldId: 'sequential-city',
    lessonNodeId: 'transformer-lesson',
    title: 'Sequential Models',
    kicker: 'World 03 · Sequential Models',
    screenPlacement: 'center',
    introNarration: 'Order turns a bag of preferences into a changing intent. Attention learns which earlier events matter now.',
    lesson: WEEK03_LESSON,
  },
  {
    folder: 'world04',
    worldId: 'policy-tower',
    lessonNodeId: 'policy-lesson',
    title: 'Decisions and Policies',
    kicker: 'World 04 · Decisions and Policies',
    screenPlacement: 'center',
    introNarration: 'A model estimates; a policy acts. Exploration is the price of learning what the current policy cannot yet know.',
    lesson: WEEK04_LESSON,
  },
  {
    folder: 'world05',
    worldId: 'ecosystem-garden',
    lessonNodeId: 'ecosystem-lesson',
    title: 'Feedback Ecosystems',
    kicker: 'World 05 · Feedback Ecosystems',
    screenPlacement: 'center',
    introNarration: 'The policy allocates attention and then learns from that allocation. Ecosystem quality must be designed, not assumed.',
    lesson: WEEK05_LESSON,
  },
  {
    folder: 'world06',
    worldId: 'final-arena',
    lessonNodeId: 'capstone-lesson',
    title: 'System Synthesis',
    kicker: 'World 06 · System Synthesis',
    screenPlacement: 'center',
    introNarration: 'A production design is a chain of explicit contracts, measurements and failure plans, not a pile of models.',
    lesson: CAPSTONE_LESSON,
  },
]

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function texText(value: string) {
  const replacements: Record<string, string> = {
    '\\': '\\textbackslash{}',
    '&': '\\&',
    '%': '\\%',
    '#': '\\#',
    '_': '\\_',
    '{': '\\{',
    '}': '\\}',
  }
  return value.replace(/[\\&%#_{}]/g, (character) => replacements[character])
}

function formulaText(value: string) {
  return value
    .replaceAll('%', '\\%')
    .replaceAll('#', '\\#')
    .replaceAll('→', '\\rightarrow')
    .replaceAll('≫', '\\gg')
    .replaceAll('≈', '\\approx')
    .replaceAll('≤', '\\le')
    .replaceAll('≥', '\\ge')
    .replaceAll('∪', '\\cup')
    .replaceAll('Σ', '\\sum')
    .replaceAll('·', '\\cdot')
    .replaceAll('−', '-')
    .replaceAll('ᵀ', '^{\\mathsf T}')
    .replaceAll('ᵤ', '_u')
    .replaceAll('ᵢ', '_i')
    .replaceAll('ⱼ', '_j')
    .replaceAll('⁺', '^{+}')
    .replaceAll('⁻', '^{-}')
}

function writeUnlessPresent(filename: string, content: string) {
  if (!force && fs.existsSync(filename)) return
  fs.writeFileSync(filename, content)
}

function notesFor(title: string, summary: string, card: LessonSection | null, intro: string) {
  const body = card?.body ?? intro
  const formula = card?.formula
  const terms = card?.terms ?? []
  const termList = terms.length > 0
    ? `\n\\subsection{Key terms}\n\\begin{itemize}\n${terms.map(({ term, definition }) => (
      `\\item \\textbf{${texText(term)}.} ${texText(definition)}`
    )).join('\n')}\n\\end{itemize}\n`
    : ''

  return `% RecSys Odyssey repository-backed lecture note.\n% Add figures with: \\coursefigure{figures/name.svg}{Caption}\n\\section{${texText(title)}}\n\n\\begin{abstract}\n${texText(summary)}\n\\end{abstract}\n\n\\subsection{Concept}\n${texText(body)}\n${formula ? `\n\\begin{equation*}\n${formulaText(formula)}\n\\end{equation*}\n` : ''}${termList}`
}

fs.mkdirSync(ROOT, { recursive: true })

for (const world of WORLDS) {
  const worldDirectory = path.join(ROOT, world.folder)
  fs.mkdirSync(worldDirectory, { recursive: true })
  writeUnlessPresent(path.join(worldDirectory, 'world.json'), JSON.stringify({
    worldId: world.worldId,
    lessonNodeId: world.lessonNodeId,
    title: world.title,
    kicker: world.kicker,
    screenPlacement: world.screenPlacement,
  }, null, 2) + '\n')

  const cards: Array<{ heading: string; narration: string; icon: string | null; section: LessonSection | null }> = [
    {
      heading: world.lesson.title,
      narration: world.introNarration,
      icon: 'goal',
      section: null,
    },
    ...world.lesson.sections.map((section) => ({
      heading: section.heading,
      narration: section.narration ?? section.body,
      icon: section.icon ?? null,
      section,
    })),
  ]

  cards.forEach((card, index) => {
    const directoryName = `${String(index).padStart(2, '0')}-${slugify(card.heading.replace(/^World \d+ · /, ''))}`
    const conceptDirectory = path.join(worldDirectory, directoryName)
    fs.mkdirSync(conceptDirectory, { recursive: true })
    writeUnlessPresent(path.join(conceptDirectory, 'concept.json'), JSON.stringify({
      title: card.heading,
      summary: card.narration,
      icon: card.icon,
    }, null, 2) + '\n')
    writeUnlessPresent(
      path.join(conceptDirectory, 'notes.tex'),
      notesFor(card.heading, card.narration, card.section, world.lesson.intro),
    )
  })
}

console.log(`Seeded repository theory content in ${ROOT}`)
