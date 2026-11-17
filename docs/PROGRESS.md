# Progress

Read the client brief at [`BRIEF.md`](./BRIEF.md), then this file,
[`DECISIONS.md`](./DECISIONS.md) and [`STATE.md`](./STATE.md).

## Status

Scaffold complete. Vite + React + TypeScript is installed, the typed config catalog
exists, and a full-window orthographic R3F canvas renders the day background. No game features yet.

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
- `404.html` derives the project root from the first URL segment; custom domains
  would need a different redirect.
- README screenshot and several community/legal placeholders still need filling.
- No browser automation or visual tests; UI tests are jsdom-only.

### 2026-11-17 — review fixes

Done:

- Renamed the config export to readonly `CONFIG` using readonly config interfaces.
- Made the canvas orthographic and added a WebGL error boundary/fallback.
- Tightened tests to the brief's fixed values and added a production-base asset test.
- Moved app name and theme colour out of `index.html` into config at build time.
- Stopped applying missing font families; set Node 22 in `.nvmrc` and CI.
- Ignored `session.json` and removed machine-specific session details from STATE.
- Re-review fixes: readonly typed `CONFIG`, config-driven camera/strings, catalog
  validator, UI tests, 404 title, and Node 22. Tests now total 25.

Known issues: item catalog, fonts and game systems are still pending; the build still
reports a chunk-size warning; no browser or visual tests yet.

### 2026-11-17 — scaffold review

Reviewed 668549a, then the fixes in f7d69e2..3beca47 and 8f6c0e8..303a29b.
Verdict: **ready for the next step.** The scaffold acceptance criteria are met:
full-window canvas in the day colour, build with no type errors, 25/25 tests, and a
fully typed, readonly `CONFIG`. Each fix commit passes tests, typecheck and lint.

Done in the final round:

- WebGL fallback now fills the window.
- App test checks the drawn `<color>` background, not just the canvas style.
- Config type test no longer depends on the `quality` value.
- Empty-catalog length checks removed; `validateCatalog` still checks `CONFIG`.
- Original progress entry and 404 link text restored.

Carried forward:

- `src/App.test.tsx` assumes the canvas has a single child (`<color>`).
  **Do:** find the `color` element among the canvas children instead of casting the
  only child. **When:** in the first step that adds anything inside `<Canvas>`
  (lights, world, camera rig).
- Console shows a `THREE.Clock` deprecation warning from `@react-three/fiber`, not
  from project code. **Do:** nothing in project code; check that it's gone after
  upgrading `@react-three/fiber`. **When:** at the next dependency update.

### 2026-11-17 — Pages review fixes

Done:

- Added a base-aware SVG favicon, removing the `/favicon.ico` 404.
- Set Pages concurrency to let running deploys finish and recorded Node 22 in DECISIONS.
- Added a guard test against direct `localStorage` access and a tested 404 redirect helper.
- Added the deploy badge, deployment section and updated README prerequisites/commands.

Tests now total 29.

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
6. Add config, catalog and UI tests (jsdom).
7. Run `npm test`, `npm run build`, and `npm run lint`.
8. Keep `CONFIG` deeply readonly via readonly interfaces and add a WebGL error
   boundary around the canvas.

## Toolchain (verified)

| Tool | Version |
|---|---|
| Node | 22 (CI and .nvmrc); 26.13.1 locally |
| npm | 11.20.0 |
| TypeScript | 7.0.2 |
| Vite | 8.3.8 |
| React | 19.3.1 |
| three | 0.187.0 |
| @react-three/fiber | 9.8.2 |
| @react-three/drei | 10.7.9 |
| zustand | 5.1.0 |
| vitest | 5.1.0 |
| jsdom / Testing Library | installed for App tests |
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
- Order: checkout → Node 22 → `npm ci` → `npm test` → `npm run build` → upload
  `dist/` → deploy. A test failure stops the deploy.
- `public/404.html` redirects unknown paths back to the project root while preserving
  the query string and hash for future SPA routes.
- Live URL: https://yx0128.github.io/evergrow/

## Verification

```bash
npm test         # 33 tests (config, catalog, assets, UI, redirect)
npm run build    # tsc -b + vite build (base "/evergrow/")
npm run lint     # oxlint
npm run dev      # full-window orthographic canvas in the day background colour at "/"
VITE_BASE_PATH=/evergrow/ npm run build   # override the Pages base if needed
```

## Release and community docs

- `LICENSE` (MIT, copyright holder placeholder)
- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`
- `CHANGELOG.md` (Keep a Changelog), `docs/RELEASING.md`
- `docs/DECISIONS.md`, `docs/STATE.md`, `docs/ARCHITECTURE.md`
- `.github/ISSUE_TEMPLATE/`, `PULL_REQUEST_TEMPLATE.md`, `dependabot.yml`
- `.editorconfig`, `.nvmrc` (Node 22, matches CI)

## Git / auth notes

- `credential.helper = store` is configured globally; pushing should not prompt for
  Keychain repeatedly. Batch git operations and push once per task.
- Repository: https://github.com/yx0128/evergrow
- Live demo: https://yx0128.github.io/evergrow/ (GitHub Pages, deployed by `.github/workflows/deploy.yml`)
- Default branch: `main`.

### 2026-11-17 — storage, redirect and favicon review

- Storage guard now matches local/session storage, including bracket access, with
  matcher tests.
- The inline 404 script is tested against `redirectTarget` for repo paths and root.
- Favicon is generated from `CONFIG` colours in dev and build; the static file is gone.
- The planned-features note now sits above Features and Usage.

Tests now total 31.

### 2026-11-17 — water and refund config cleanup

- Removed the water height-step setting, the water invalid reason and the refund
  setting. Water is a tile style with no neighbour rules; selling always refunds the
  item price.
- Updated the README water description.
- Decisions D013/D014 record the refund and tile rules.

Tests remain 31.

### 2026-11-17 — favicon, storage and preview review

- Dev favicon is served under the configured base (`/evergrow/favicon.svg` with
  `VITE_BASE_PATH=/evergrow/`); plain dev still serves `/favicon.svg`.
- Storage guard strips line and block comments before matching, with matcher tests.
- README documents the preview URL `http://localhost:4173/evergrow/`.

Tests now total 32.

### 2026-11-17 — storage guard URL fix

- Line comments are only stripped when `//` starts a line or follows whitespace, so
  URLs no longer hide storage access later on the same line.

Tests now total 33.

### 2026-11-17 — v0.1.0 release prep

- Finalised `CHANGELOG.md` for v0.1.0 and confirmed `package.json` at 0.1.0.
- No push, tag or deploy performed.

Tests remain 33.
