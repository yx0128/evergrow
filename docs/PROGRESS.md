# Progress

Read the client brief at [`BRIEF.md`](./BRIEF.md), then this file,
[`DECISIONS.md`](./DECISIONS.md) and [`STATE.md`](./STATE.md).

## Status

Scaffold complete. Vite + React + TypeScript is installed, the typed config catalog
exists, and a full-window R3F canvas renders the day background. No game features yet.

## Log

### 2026-11-17

Done:

- Scaffolded Vite + React + TypeScript with strict mode, npm scripts and folder layout.
- Added the fully typed config catalog, 15 tests, lint and build.
- Rendered a full-window orthographic canvas using the day background `#d7e0e9`.
- Set the starter item and item catalog to pending (`items: []`).
- Initialized the GitHub repo and automatic GitHub Pages deployment.
- Added base-aware `assetUrl()` and namespaced `storageKey()` helpers plus `404.html`.
- Added release/community docs: LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY,
  CHANGELOG, ARCHITECTURE, RELEASING, DECISIONS, STATE, and this progress log.
- Made `BRIEF.md` tracked and reorganised docs.

Known issues / not done:

- No game features: tasks, economy, focus, shop, inventory, world, tiles, placement,
  camera, day/night, audio, tutorial and save system are unimplemented.
- Item catalog, starter item, fonts and 3D assets are undecided/missing.
- Build reports a non-fatal chunk-size warning from Three.js.
- GitHub Actions runs Node 20, which is deprecated on runners.
- `404.html` derives the project root from the first URL segment; custom domains
  would need a different redirect.
- README screenshot and several community/legal placeholders still need filling.
- `npm run dev` is the only verified runtime; no browser automation or visual tests.

## Reproduce from scratch

```bash
npm create vite@latest evergrow -- --template react-ts
cd evergrow
npm install zustand three @react-three/fiber @react-three/drei
npm install -D @types/three vitest
```

Then:

1. Set `"strict": true` in `tsconfig.app.json` and `tsconfig.node.json`.
2. Set `package.json` scripts: `dev`, `build` (`tsc -b && vite build`), `preview`,
   `lint`, `typecheck` (`tsc -b`), `test` (`vitest run`), `test:watch` (`vitest`).
3. Create the folders listed below with `.gitkeep` files where empty.
4. Create `src/config/evergrow.config.ts` using the `EvergrowConfig` type.
5. Replace the Vite demo with `src/App.tsx` rendering a full-window `<Canvas>`.
6. Add `src/config/evergrow.config.test.ts` (12 sanity tests).
7. Run `npm test`, `npm run build`, and `npm run lint`.

## Toolchain (verified)

| Tool | Version |
|---|---|
| Node | 26.13.1 |
| npm | 11.20.0 |
| TypeScript | 7.0.2 |
| Vite | 8.3.8 |
| React | 19.3.1 |
| three | 0.187.0 |
| @react-three/fiber | 9.8.2 |
| @react-three/drei | 10.7.9 |
| zustand | 5.1.0 |
| vitest | 5.1.0 |
| oxlint | 1.90.0 |

The current Vite template uses **oxlint** (not ESLint). Keep it unless there is a
reason to migrate.

## Folder structure

```
src/
  config/evergrow.config.ts     # every tunable value + catalogs (single source of truth)
  logic/                        # pure TS modules, no React/Three imports
  store/                        # Zustand slices
  scene/                        # R3F components
  ui/                           # React DOM UI
  assets/                       # loaders, thumbnail cache
public/assets/{models,thumbs,fonts}/
assets-src/blender/             # one bpy script per asset + export_all.py
docs/                           # progress, decisions, architecture, release docs, state
```

## Architecture rules (non-negotiable)

1. World rules (grid, cells, stacking, footprints, validation, economy) are pure TS
   in `src/logic/` with no Three.js or React imports. Unit-test before wiring UI.
2. All tunables live in `src/config/evergrow.config.ts`. No magic numbers elsewhere.
3. All world mutations go through commands (`place`, `move`, `rotate`, `remove`,
   `paint`, `setLevel`, `digUp`, `sell`, `store`) so undo/redo is uniform.
4. Never store absolute Y. Derive it as `level * world.tileThickness`.
5. Autosave to localStorage, debounced with `ui.autosaveDebounceMs`, including
   `saveSchemaVersion`. Every key must go through `storageKey()` in
   `src/assets/assetUrl.ts`, which prefixes `ui.storagePrefix` (`evergrow:`) because
   all `*.github.io` project sites share one origin.
6. Never hard-code a leading-slash public URL. Build model, thumbnail, audio and font
   URLs with `assetUrl()` from `src/assets/assetUrl.ts`, and keep catalog paths
   relative (`assets/models/...`).

## Decisions

Resolved and open choices are logged in [`DECISIONS.md`](./DECISIONS.md). Add an
entry there before changing a decision that affects architecture, data format,
deployment or the product rules.

## Deployment

GitHub Pages, deployed by `.github/workflows/deploy.yml` on every push to `main`
(or manually via `workflow_dispatch`).

- Builds use `base: "/<repo>/"` (derived from `GITHUB_REPOSITORY`, overridable with
  `VITE_BASE_PATH`). Local dev always uses `/`.
- Order: checkout → Node 20 → `npm ci` → `npm test` → `npm run build` → upload
  `dist/` → deploy. A test failure stops the deploy.
- `public/404.html` redirects unknown paths back to the project root while preserving
  the query string and hash for future SPA routes.
- Live URL: https://yx0128.github.io/evergrow/

## Verification

```bash
npm test         # 15 tests (config + asset/storage helpers)
npm run build    # tsc -b + vite build (base "/evergrow/")
npm run lint     # oxlint
npm run dev      # full-window canvas in the day background colour at "/"
VITE_BASE_PATH=/evergrow/ npm run build   # override the Pages base if needed
```

## Release and community docs

- `LICENSE` (MIT, copyright holder placeholder)
- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`
- `CHANGELOG.md` (Keep a Changelog), `docs/RELEASING.md`
- `docs/DECISIONS.md`, `docs/STATE.md`, `docs/ARCHITECTURE.md`
- `.github/ISSUE_TEMPLATE/`, `PULL_REQUEST_TEMPLATE.md`, `dependabot.yml`
- `.editorconfig`, `.nvmrc` (Node 20, matches CI)

## Git / auth notes

- `credential.helper = store` is configured globally; pushing should not prompt for
  Keychain repeatedly. Batch git operations and push once per task.
- Repository: https://github.com/yx0128/evergrow
- Live demo: https://yx0128.github.io/evergrow/ (GitHub Pages, deployed by `.github/workflows/deploy.yml`)
- Default branch: `main`.
