# Real ratings data

Run `npm run data:movielens` to download MovieLens 100K from GroupLens and build
`public/data/generated/ml-100k.compact.json` for the Foundry simulator.

The generated file is intentionally ignored by Git. MovieLens 100K may not be
redistributed without separate permission from GroupLens, and its license does
not permit commercial or revenue-bearing use. Read the current terms at:

https://grouplens.org/datasets/movielens/100k/

The deployed app uses `public/data/generated/movietweetings-100k.compact.json`
instead. It contains a deterministic 100,000-rating sample from the real public
MovieTweetings corpus and is tracked in Git under the upstream MIT license:

https://github.com/sidooms/MovieTweetings

Regenerate it with `npm run data:movietweetings`. The original MIT notice is in
`public/data/MOVIETWEETINGS-LICENSE.txt`.

The UI always names the active source. If neither real payload can be loaded,
Foundry blocks execution and offers a retry instead of presenting synthetic
recommendations as real data.

The browser models are educational emulators; their scores are not GroupLens or
MovieTweetings benchmarks.
