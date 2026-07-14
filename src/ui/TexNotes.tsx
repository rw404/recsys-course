import { useMemo, type ReactNode } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import type { TheoryConceptContent, TheoryFigure } from '../content/theoryContent'

type TexBlock =
  | { kind: 'heading'; level: 1 | 2 | 3; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'math'; source: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'figure'; figure: TheoryFigure | null; src: string | null; caption: string }
  | { kind: 'tikz-missing'; source: string }

const BLOCK_PATTERN = /\\(section|subsection|subsubsection)\*?\{([^{}]*)\}|\\begin\{(equation\*?|align\*?|gather\*?|multline\*?)\}([\s\S]*?)\\end\{\3\}|\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$|\\begin\{(itemize|enumerate)\}([\s\S]*?)\\end\{\7\}|\\coursefigure\{([^{}]+)\}\{([^{}]*)\}|\\begin\{tikzpicture\}([\s\S]*?)\\end\{tikzpicture\}/g

function stripPreamble(source: string) {
  return source
    .replace(/\r\n?/g, '\n')
    .replace(/(^|[^\\])%.*$/gm, '$1')
    .replace(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/g, '\\subsection*{Overview}\n$1')
    .replace(/^\\(?:documentclass|usepackage|title|author|date)(?:\[[^\]]*\])?\{[^\n]*\}\s*$/gm, '')
    .replace(/\\(?:begin|end)\{document\}|\\maketitle/g, '')
    .trim()
}

function addTextBlocks(blocks: TexBlock[], source: string) {
  source.split(/\n\s*\n/).forEach((paragraph) => {
    const text = paragraph.replace(/\s*\n\s*/g, ' ').trim()
    if (text) blocks.push({ kind: 'paragraph', text })
  })
}

function resolveFigure(concept: TheoryConceptContent, filename: string) {
  const id = filename.split('/').pop()?.replace(/\.[^.]+$/, '') ?? filename
  const figure = concept.figures.find((item) => item.id === id) ?? null
  if (figure) return { figure, src: figure.src }
  if (!concept.notes || typeof window === 'undefined') return { figure: null, src: null }
  return {
    figure: null,
    src: new URL(filename, new URL(concept.notes, window.location.origin)).toString(),
  }
}

function parseTex(source: string, concept: TheoryConceptContent): TexBlock[] {
  const clean = stripPreamble(source)
  const blocks: TexBlock[] = []
  const tikzFigures = concept.figures.filter((figure) => figure.source)
  let tikzIndex = 0
  let cursor = 0
  let match: RegExpExecArray | null
  BLOCK_PATTERN.lastIndex = 0

  while ((match = BLOCK_PATTERN.exec(clean))) {
    addTextBlocks(blocks, clean.slice(cursor, match.index))
    cursor = BLOCK_PATTERN.lastIndex

    if (match[1]) {
      const level = match[1] === 'section' ? 1 : match[1] === 'subsection' ? 2 : 3
      blocks.push({ kind: 'heading', level, text: match[2].trim() })
      continue
    }
    if (match[3]) {
      blocks.push({ kind: 'math', source: match[4].trim() })
      continue
    }
    if (match[5] || match[6]) {
      blocks.push({ kind: 'math', source: (match[5] ?? match[6]).trim() })
      continue
    }
    if (match[7]) {
      const items = match[8].split(/\\item\s+/).slice(1).map((item) => item.trim()).filter(Boolean)
      blocks.push({ kind: 'list', ordered: match[7] === 'enumerate', items })
      continue
    }
    if (match[9]) {
      const resolved = resolveFigure(concept, match[9].trim())
      blocks.push({ kind: 'figure', ...resolved, caption: match[10].trim() })
      continue
    }
    if (match[11] !== undefined) {
      const figure = tikzFigures[tikzIndex++] ?? null
      blocks.push(figure
        ? { kind: 'figure', figure, src: figure.src, caption: `TikZ figure ${tikzIndex}` }
        : { kind: 'tikz-missing', source: match[11].trim() })
    }
  }

  addTextBlocks(blocks, clean.slice(cursor))
  return blocks
}

function decodeTexText(source: string) {
  return source
    .replace(/\\textbackslash\{\}/g, '\\')
    .replace(/\\([%&#_{}])/g, '$1')
    .replace(/~/g, ' ')
    .replace(/``|''/g, '"')
}

function RichText({ source, token }: { source: string; token: string }): ReactNode {
  const nodes: ReactNode[] = []
  const commandPattern = /\\(textbf|emph|texttt)\{([^{}]*)\}/g
  let cursor = 0
  let command: RegExpExecArray | null
  while ((command = commandPattern.exec(source))) {
    if (command.index > cursor) nodes.push(decodeTexText(source.slice(cursor, command.index)))
    const content = decodeTexText(command[2])
    if (command[1] === 'textbf') nodes.push(<strong key={`${token}-${command.index}`}>{content}</strong>)
    else if (command[1] === 'emph') nodes.push(<em key={`${token}-${command.index}`}>{content}</em>)
    else nodes.push(<code key={`${token}-${command.index}`}>{content}</code>)
    cursor = commandPattern.lastIndex
  }
  if (cursor < source.length) nodes.push(decodeTexText(source.slice(cursor)))
  return <>{nodes}</>
}

function InlineTex({ source, token }: { source: string; token: string }) {
  const nodes: ReactNode[] = []
  const inlineMath = /\$([^$\n]+)\$|\\\((.*?)\\\)/g
  let cursor = 0
  let match: RegExpExecArray | null
  while ((match = inlineMath.exec(source))) {
    if (match.index > cursor) {
      nodes.push(<RichText key={`${token}-text-${cursor}`} source={source.slice(cursor, match.index)} token={`${token}-${cursor}`} />)
    }
    nodes.push(<MathTex key={`${token}-math-${match.index}`} source={(match[1] ?? match[2]).trim()} display={false} />)
    cursor = inlineMath.lastIndex
  }
  if (cursor < source.length) {
    nodes.push(<RichText key={`${token}-text-${cursor}`} source={source.slice(cursor)} token={`${token}-${cursor}`} />)
  }
  return <>{nodes}</>
}

function MathTex({ source, display }: { source: string; display: boolean }) {
  const html = useMemo(() => katex.renderToString(source, {
    displayMode: display,
    throwOnError: false,
    strict: 'ignore',
    trust: false,
    output: 'htmlAndMathml',
  }), [display, source])
  return <span className={display ? 'repo-tex-math is-display' : 'repo-tex-math'} dangerouslySetInnerHTML={{ __html: html }} />
}

function RenderedTex({
  source,
  concept,
  repository,
}: {
  source: string
  concept: TheoryConceptContent
  repository: string | null
}) {
  const blocks = useMemo(() => parseTex(source, concept), [concept, source])
  return (
    <article className="repo-tex-rendered">
      {blocks.map((block, index) => {
        const key = `${block.kind}-${index}`
        if (block.kind === 'heading') {
          if (block.level === 1) return <h2 key={key}><InlineTex source={block.text} token={key} /></h2>
          if (block.level === 2) return <h3 key={key}><InlineTex source={block.text} token={key} /></h3>
          return <h4 key={key}><InlineTex source={block.text} token={key} /></h4>
        }
        if (block.kind === 'paragraph') return <p key={key}><InlineTex source={block.text} token={key} /></p>
        if (block.kind === 'math') return <MathTex key={key} source={block.source} display />
        if (block.kind === 'list') {
          const List = block.ordered ? 'ol' : 'ul'
          return (
            <List key={key}>
              {block.items.map((item, itemIndex) => (
                <li key={`${key}-${itemIndex}`}><InlineTex source={item} token={`${key}-${itemIndex}`} /></li>
              ))}
            </List>
          )
        }
        if (block.kind === 'figure') {
          const sourceUrl = repository && block.figure?.sourceRepositoryPath
            ? `${repository}/blob/main/${block.figure.sourceRepositoryPath}`
            : block.figure?.source
          return (
            <figure key={key} className="repo-tex-figure">
              {block.src ? <img src={block.src} alt={block.caption} /> : <div className="repo-tex-figure-missing">Figure asset is missing</div>}
              <figcaption>
                <span>{block.caption}</span>
                {sourceUrl && <a href={sourceUrl} target="_blank" rel="noreferrer">TikZ source</a>}
              </figcaption>
            </figure>
          )
        }
        return (
          <div key={key} className="repo-tex-tikz-missing">
            <strong>TikZ source found</strong>
            <span>Add the compiled SVG beside the source to render it here.</span>
            <pre><code>{block.source}</code></pre>
          </div>
        )
      })}
    </article>
  )
}

export function RepositoryTheoryNotes({
  source,
  concept,
  repository,
  sourceView,
}: {
  source: string
  concept: TheoryConceptContent
  repository: string | null
  sourceView: boolean
}) {
  if (sourceView) {
    return (
      <pre className="repo-tex-source" aria-label="TeX source"><code>{source}</code></pre>
    )
  }
  return <RenderedTex source={source} concept={concept} repository={repository} />
}
