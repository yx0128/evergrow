# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/yx0128/evergrow/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/yx0128/evergrow/releases/tag/v0.1.0
