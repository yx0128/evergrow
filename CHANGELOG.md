# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-11-19

World logic release: the rules are implemented and tested, but not yet playable.

### Added

- Pure world logic in `src/logic/`: grid coordinates and the buildable zone
  (D017, D018), tile cells and levels with paint and dig up (D019, D020), square
  footprints and rotation (D024, D028), placement validation with auto tiles,
  occupancy, connection masks for connectable 1×1 items (D025) and undoable world
  commands with a history limit and grouped drag strokes (D027, D030–D032).
- Catalog validation for square footprints (D028) and 1×1 connectable items (D025).
- Config values `world.minStack`, `history.limit` and `ui.fallback`.
- World commands use the existing "Store or move the item first" and "Not enough
  coins" messages, plus the new "Minimum height reached" and "Not in your inventory"
  reasons.
- Pull request CI workflow and `npm run coverage`.
- An import guard keeping `src/logic` free of React, Three.js, Zustand, store and
  scene code.

### Changed

- Node 26 for local, CI and `@types/node` (D023).
- GitHub Actions updated to their current majors.
- Deployment now runs lint as well as tests.
- `storageKey()` moved to `src/logic/save.ts`.
- Docs synced with the code.

### Removed

- The `rotatable` item flag; every item can rotate (D033).
- The `tileCost` and `allowNegativeCoins` settings (D035).
- The separate 404 redirect helper; the 404 page is now tested directly.

## [0.1.0] - 2026-11-17

First public demo release.

### Added

- Vite + React + TypeScript scaffold with strict mode.
- Readonly, fully typed `CONFIG` catalog in `src/config/evergrow.config.ts`.
- Catalog validation with valid and invalid fixture tests.
- Full-window orthographic canvas with a configurable background colour.
- WebGL fallback with an error boundary.
- GitHub Pages deployment gated by tests.
- Base-aware `assetUrl()` and namespaced `storageKey()` helpers.
- Storage guard test against direct web storage access.
- Tested 404 redirect helper for future SPA routes.
- Favicon generated from config colours.
- Deploy status badge and README deployment section.
- Release and community documentation, with requirements in
  [`docs/BRIEF.md`](docs/BRIEF.md).

### Changed

- Node 22 in CI and `.nvmrc` (D012).
- Pages deploys are no longer cancelled halfway.
- Preview serves the production build under the Pages base.
- Day background is a soft blue derived from the original warm tone.

### Removed

- Water rule settings (D014).
- The `sellRefund` setting; selling always refunds the full price (D013).

[Unreleased]: https://github.com/yx0128/evergrow/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/yx0128/evergrow/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/yx0128/evergrow/releases/tag/v0.1.0
