# Contributing to Evergrow

Thanks for helping. Keep changes small, calm and consistent with the project's tone.

## Before you start

- Read [`docs/PROGRESS.md`](docs/PROGRESS.md) for architecture and setup.
- Read [`docs/BRIEF.md`](docs/BRIEF.md) for the product rules and [`docs/DECISIONS.md`](docs/DECISIONS.md) for resolved choices.
- Open an issue for anything larger than a small fix.

## Local workflow

```bash
npm install
npm run dev
npm test
npm run lint
npm run typecheck
npm run build
```

## Guidelines

- Pure game logic lives in `src/logic/` with no React or Three.js imports.
- Every tunable value belongs in `src/config/evergrow.config.ts`.
- Add tests for logic changes before wiring them to the scene or UI.
- Do not hard-code public asset paths; use `assetUrl()`.
- Prefix localStorage keys with `storageKey()`.
- Keep motion and visuals within the brief: no bounce, pop, shake, particles or glow.
- Do not commit secrets, tokens or local save data.

## Commits and pull requests

- Use a short imperative commit subject.
- Describe what changed, why, and how it was verified.
- Include screenshots or recordings for visual changes.
- Ensure `npm test`, `npm run lint` and `npm run build` pass.

## Code of conduct

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## Questions

Open a discussion or issue. For security reports, follow [`SECURITY.md`](SECURITY.md).
