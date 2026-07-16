# Repository-backed theory

The browser builds every IMAX chapter from this directory. Course authors can add a concept,
lecture note, animation, or figure without editing React code.

## Folder contract

```text
content/theory/
  world01/
    world.json
    00-recommender-foundations/
      concept.json
      notes.tex
      screen.webm
      screen.mp4
      poster.webp
      figures/
        decision-loop.tikz.tex
        decision-loop.svg
```

Concept directories are ordered by their two-digit prefix. A newly committed `11-topic-name`
directory becomes the next chapter automatically. Every world currently has a complete set of
`concept.json`, `notes.tex`, `screen.mp4`, and `screen.webm` files. The Three.js screen is an
authoring and network fallback, while `npm run test:theory` requires both browser video formats before release.

### `world.json`

```json
{
  "worldId": "foundations-camp",
  "lessonNodeId": "week01-station",
  "title": "Recommender Foundations",
  "kicker": "World 01 · Recommender Foundations",
  "screenPlacement": "center"
}
```

`screenPlacement` is kept in the manifest so individual worlds can evolve independently.
The current course uses a centered, front-facing IMAX screen in every theory world.

`journey` describes the learning contract around the theory rather than React routing. It can
declare learning outcomes and an ordered mix of `theory`, `experiment`, `foundry`, and
`checkpoint` activities. Activities may point to a course `nodeId` or a Foundry `templateId`.
The browser uses this metadata for the handoff between IMAX, practice, and assessment.

```json
{
  "journey": {
    "estimatedMinutes": 45,
    "outcomes": ["Explain why NDCG and recall answer different questions."],
    "activities": [
      {
        "id": "ranking-evidence-lab",
        "kind": "experiment",
        "nodeId": "ranking-sandbox",
        "title": "Test a ranking on real ratings",
        "summary": "Reorder a slate and explain the metric change.",
        "required": true
      }
    ]
  }
}
```

### `concept.json`

```json
{
  "title": "Recommender Foundations",
  "summary": "Start with the decision, evidence, and stage contracts.",
  "icon": "goal",
  "duration": 8
}
```

## TeX lecture notes

`notes.tex` is the canonical lecture source. The browser renders a deliberately small,
predictable subset:

- `\section`, `\subsection`, and `\subsubsection`;
- inline math with `$...$` or `\(...\)`;
- `equation`, `align`, `gather`, and display-math blocks;
- `itemize` and `enumerate`;
- `\textbf`, `\emph`, and `\texttt`;
- `\coursefigure{figures/name.svg}{Caption}`.

KaTeX renders formulas in the side panel. The panel can switch between the rendered lecture and
the exact repository source, and links back to the file on GitHub.

TikZ runs at authoring time, not in the learner's browser. Keep the editable
`name.tikz.tex` and compiled `name.svg` beside each other, then reference the SVG with
`\coursefigure`. Compile all figures with:

```bash
npm run content:tikz
```

This command needs `latexmk` (or `pdflatex`) and one of `dvisvgm`, `pdf2svg`, or
`pdftocairo`. The resulting SVG is committed, so deployment has no TeX dependency.

## Manim clips

Add `screen.webm` and `screen.mp4` to a concept folder. The clip plays once and holds its final
teaching frame; the in-world replay console starts it again. If no clip is present, the same
concept uses its themed real-time Three.js visualization.

Recommended master:

- 1920x888 at 30 fps;
- 5-9 seconds, no audio, no baked controls;
- no baked loop or fade to black;
- one teaching claim and no more than five primary objects;
- keep labels inside a 6% horizontal safe area.

World 01 Manim source is rendered with:

```bash
./scripts/render-world01-manim.sh
```

The script maps each `W01_NN_*.mp4` scene to the matching `NN-*` concept folder, produces both
browser formats, and rebuilds the manifest.

Worlds 02-06 share a parameterized, world-specific Manim scene:

```bash
npm run content:manim -- world02
npm run content:manim -- world03
npm run content:manim -- --force world04
```

Without a world argument the command renders every missing clip in Worlds 02-06. Retrieval,
sequence/attention, policy/RL, ecosystem, and synthesis chapters each use their own visual
grammar. `--force` replaces existing clips; otherwise author-provided videos are preserved.
Run `npm run test:theory` after rendering to verify every concept has notes and both video formats.

## Development and deployment

```bash
npm run content:theory
npm run dev
```

Vite watches `content/theory`, rebuilds `public/theory-content/manifest.json`, and reloads the
browser. `npm run build` performs the same generation automatically. The generated directory is
ignored; authors commit only the source tree.
