# MovieLens 100K local data

Run `npm run data:movielens` to download MovieLens 100K from GroupLens and build
`public/data/generated/ml-100k.compact.json` for the Foundry simulator.

The generated file is intentionally ignored by Git. MovieLens 100K may not be
redistributed without separate permission from GroupLens, and its license does
not permit commercial or revenue-bearing use. Read the current terms at:

https://grouplens.org/datasets/movielens/100k/

When the local payload is absent, the app explicitly switches to its small
built-in educational fixture instead of claiming that synthetic data is the
official corpus.

The browser models are educational emulators; their scores are not GroupLens
benchmarks.
