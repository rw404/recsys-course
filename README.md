# RecSys Odyssey

An interactive 3D course about recommender systems. The main experience is a
scroll-driven journey through connected worlds; each world also supports direct
character exploration. The Foundry turns the course concepts into a buildable,
traceable recommendation pipeline.

## Run

```bash
npm install
npm run data:movielens
npm run dev
```

The app is available at [http://localhost:5173](http://localhost:5173).

`npm run data:movielens` downloads MovieLens 100K from GroupLens, parses all
100,000 ratings, 1,682 movies and 943 users, and trains compact 12-dimensional
matrix-factorization features for the browser simulator.

The local MovieLens payload lives at `public/data/generated/ml-100k.compact.json`
and is intentionally ignored by Git because GroupLens does not allow public
redistribution without separate permission.

Production uses the bundled `MovieTweetings 100K` corpus: 100,000 real public
movie ratings, 943 anonymized profiles and 1,682 films. It is generated with
`npm run data:movietweetings`, distributed under the upstream MIT license, and
keeps the deployed Foundry functional without substituting synthetic data.

Production build:

```bash
npm test
npm run build
npm run preview
```

## Course Journey

The home experience follows one recommendation signal through a vertical world:

1. Signal city
2. Infrastructure channel
3. Candidate retrieval
4. Sequences and context
5. Ranking tower
6. Selector gates
7. Online serving
8. Feedback ecosystem
9. System synthesis

Scroll moves between chapters, click opens a world, and optional WASD controls
the rigged explorer. Character navigation uses landmark colliders and a
visibility-graph route planner, so click-to-move and manual movement avoid world
geometry.

## RecSys Foundry

Foundry includes 19 composable modules:

- MovieLens ratings, event streaming and feature store
- Popularity, user CF, SVD/ALS, BPR, two-tower retrieval
- HNSW/IVF-style ANN and sequence-transformer retrieval
- Candidate blending and business selectors
- Learning-to-rank, grounded GenAI reranking, contextual bandit/RL and MMR
- Offline evaluation, online serving and final Top-K delivery

Every completed run records item-level lineage for every node:

- input candidates
- output candidates
- dropped candidates and the removal reason
- score, rank, evidence sources and latency

Graph edits and viewer changes are drafts. They never change recommendations
until `Run pipeline` finishes its visible trace.

The service lab can emulate one feedback step or 2-30 days in service. It shows
daily CTR, completion, cumulative reward, exploration rate and the evolving
policy slate. This is a deterministic educational emulator, not a production
benchmark or a real online experiment.

## Validation

```bash
npm test
npm run typecheck
npm run build

# Requires local Chromium shared libraries.
node scripts/foundry-audit.mjs
node scripts/foundry-advanced-audit.mjs
```

The Playwright audits cover desktop and mobile layouts, diagram/isometric
switching, graph assembly, frozen results before Run, item lineage, advanced
templates, service feedback and WebGL asset loading.

## Stack

React, TypeScript, Vite, Three.js, React Three Fiber, Drei, Rapier, Zustand and
React Flow.
