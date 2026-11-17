# Progress

Read the client brief at [`BRIEF.md`](./BRIEF.md), then this file,
[`DECISIONS.md`](./DECISIONS.md) and [`STATE.md`](./STATE.md).

## Status

Scaffold complete, plus pure world logic for grid coordinates, the buildable zone,
tile cells, column levels, item footprints, placement validation, occupancy and
connection masks. The typed config catalog exists and a full-window orthographic R3F
canvas renders the day background. Logic is not wired to stores, rendering or
commands yet.

## Workflow rules

- Work on a branch, never directly on main: step/<short-name> for a build step, fix/<short-name> for review fixes, docs/<short-name> for docs-only work.
- Commit messages are a subject only: imperative, sentence case, no prefix, no body, no trailers (no Co-Authored-By). Record the what, why and verification in this file's log entry instead.
- npm test, npm run build and npm run lint must pass before every commit.
- Review sessions run npm run coverage and check src/logic for untested lines and branches. There is no coverage threshold.
- Merge into main only after a review says READY, as one squash commit: git switch main && git merge --squash <branch> && git commit -m "<subject>", then git branch -D <branch> (-D because Git doesn't treat squash-merged branches as merged).
- Don't rewrite commits already pushed to origin/main. Fix forward with a new commit.
- Push main once per task, after the merge. GitHub Pages deploys every push to main.
- Record build, fix and docs sessions in docs/STATE.md. Don't record review sessions.
- Each session prompt names its type (BUILD, FIX, DOCS or REVIEW). Review sessions report only and change no code or docs.
- Dependabot PRs: batch them into one fix/ branch instead of merging each one.

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
- Order: checkout → Node 26 (`.nvmrc`) → `npm ci` → `npm run lint` → `npm test` →
  `npm run build` → upload `dist/` → deploy. A lint or test failure stops the deploy.
- Pull requests run lint, tests and build through `.github/workflows/ci.yml`.
- `public/404.html` redirects unknown paths back to the project root while preserving
  the query string and hash for future SPA routes.
- Live URL: https://yx0128.github.io/evergrow/

## Verification

```bash
npm test         # 138 tests (config, catalog, assets, UI, redirect, grid, cells, footprint, placement, connect, purity, import guard)
npm run build    # tsc -b + vite build (base "/evergrow/")
npm run lint     # oxlint
npm run coverage   # line/branch coverage; HTML report in coverage/index.html
npm run dev      # full-window orthographic canvas in the day background colour at "/"
VITE_BASE_PATH=/evergrow/ npm run build   # override the Pages base if needed
```

CI runs `npm run lint`, `npm test` and `npm run build` on every pull request
(`.github/workflows/ci.yml`) and again before every Pages deploy.

## World logic (grid & cells)

Pure modules, no React/Three/DOM imports. They import `CONFIG` only.

### `src/logic/catalog.ts`

- `validateCatalog(items, starterItems)` returns human-readable errors (empty = valid).
- `itemDefinition(catalog, id)` returns the `ItemDef` and throws
  `Unknown item id: <id>` for a missing entry. Placement, connection and level logic
  all use this lookup; `cells.ts` does not define or re-export it.

### `src/logic/grid.ts`

- `key(x, z)` → `"x,z"`; **throws** on non-integer coordinates.
- `parseKey(s)` → `{x,z}`; **throws** an Error naming malformed keys (never returns null).
- `DIRECTIONS` / `neighbour(x,z,dir)` / `neighbours(x,z)` (N, E, S, W order).
  Axes: **+X east, +Z south, north = −Z**.
- `boundsForSize(size)` uses `min = -floor(size/2)`, so 10 → −5..4 and 256 → −128..127.
- `worldBounds()`, `startZoneBounds()`, `insideBounds()`, `isInWorld()`,
  `isWithinStartZone()`. The checks return false for non-integer/NaN/Infinity input.
- `chebyshevDistance(a, b)`.
- `isBuildable(x, z, cells)`: inside the world cap **and** (inside the start zone
  **or** within `buildableRing` Chebyshev cells of any existing tile). Returns false
  for non-integer coordinates. §4.6.
- `landBounds(cells)` → `{minX,maxX,minZ,maxZ}` or `null` for an empty world
  (for camera bounds later).
- `GridCells = ReadonlyMap<string, {x,z}>`, so `CellMap` is accepted structurally.

### `src/logic/cells.ts`

- `Cell { x, z, type, level }`, `CellMap = ReadonlyMap<string, Cell>`, `LevelRange`,
  `MIN_LEVEL = 1` (§5.2), and
  `CellResult = { ok: true; cells: CellMap } | { ok: false; reason: InvalidReason }`.
- `setCell(cells, cell)` and `setLevel(cells, x, z, level)` return `CellResult`.
  A level must be an integer in `MIN_LEVEL..maxStack`: above → `maxStack`,
  `+Infinity` → `maxStack`, and below 1, `−Infinity`, NaN or a non-integer →
  `minStack` (new reason, "Minimum height reached").
  Rejected edits store nothing and leave the input untouched.
- `removeCell(cells, x, z)` returns a new `CellMap`. `setType(cells, x, z, type)`
  returns `CellResult`. `setLevel`/`setType` on an empty cell return
  `{ ok: true, cells }` with the **same map** unchanged.
- `paint(cells, x, z, type)`: invalid or out-of-world coordinates → `outsideWorld`
  before any lookup; existing cell → change type, keep level; empty cell →
  `outsideBuildableZone` if not buildable, otherwise a new level-1 cell (§5.3).
- `digUp(cells, x, z)`: invalid or out-of-world coordinates → `outsideWorld` before
  any lookup; level > 1 → level − 1; level 1 → remove; empty in-world cell →
  unchanged (`{ ok: true, cells }`).
- `getLevelRange(x, z, world, catalog)` → `LevelRange | null`, where
  `world = { cells, occupancy, items }` and all parameters are required. It returns
  `{ min: MIN_LEVEL, max: CONFIG.world.maxStack }` for bare tiles and 1×1 items, and
  `null` under a multi-cell item (slider disabled, edit from the item, D026). An
  occupancy uid with no item, or an item id missing from the catalog, throws.
- Nothing is clamped and no input map is ever mutated.

### `src/logic/footprint.ts`

- Re-exports `Rotation = 0 | 1 | 2 | 3`; each step is 90° clockwise seen from above
  (+X east, +Z south, D017).
- Anchor convention: `(x, z)` is the footprint's min-x/min-z corner after rotation
  (D024). `getFootprintCells` covers `x..x+w'-1`, `z..z+d'-1`.
- `rotatedSize(item, rot)` → `[w, d]`; a `w×d` footprint becomes `d×w` at rot 1 and 3.
- `getFootprintCells(item, x, z, rot)` → `GridPoint[]` in row order (z, then x).

### `src/logic/placement.ts`

- `PlacedItem { uid, id, x, z, rot }` (§6.1),
  `PlacedItems = ReadonlyMap<uid, PlacedItem>` (D027),
  `Occupancy = ReadonlyMap<cellKey, uid>`, `PlacementState = { cells, occupancy }`,
  and `PlacementResult = { ok: true; autoTiles: Cell[] } | { ok: false; reason }`.
- `buildOccupancy(items, catalog)` maps every rotated footprint cell to its uid and
  throws on an item id missing from the catalog. `itemAt(x, z, occupancy, items)`
  returns the covering item or `undefined`. Both read the item map directly by uid.
- `validatePlacement(item, x, z, rot, autoTile, state, ignoreUid?)` checks §6.3 in
  order: `outsideWorld`, `outsideBuildableZone`, `occupied`, `wrongTile`,
  `unevenGround`; the first failure wins. Empty cells count as level 1. `ignoreUid`
  accepts a moving item's own cells. On success `autoTiles` has one level-1 cell of
  `autoTile` for each empty footprint cell, in footprint order.

### `src/logic/connect.ts`

- Connectable items are 1×1 (D025); placement validation is unchanged.
- `getConnectionMask(uid, items, occupancy, catalog)` returns 0 for a missing or
  non-connectable item and otherwise 4 bits: N=1, E=2, S=4, W=8. A bit is set when the
  orthogonal neighbour holds an item with the same id. A missing catalog entry throws.
- `affectedByChange(x, z)` returns the cell itself then N, E, S, W (§6.5).

### `src/logic/importGuard.test.ts`

Vitest-only guard. It reads every non-test `src/logic/**/*.ts` file raw and fails on
any import or export-from of React, React DOM, `three`, `@react-three/*`, `zustand`,
or anything under `store/` or `scene/`. Config and sibling logic imports stay allowed.
It was verified by temporarily adding a `three` import and watching the test fail.

### `src/logic/purity.test.ts`

Calls every exported map function and pure helper (`setCell`, `removeCell`,
`setLevel`, `setType`, `paint`, `digUp`, `isBuildable`, `landBounds`, `getLevelRange`,
`rotatedSize`, `getFootprintCells`, `buildOccupancy`, `itemAt`, `validatePlacement`,
`getConnectionMask`), snapshotting inputs with `structuredClone` and asserting they
are deep-equal afterwards.

### Reproduce this step

1. Create `src/logic/grid.ts` and `src/logic/cells.ts` as above.
2. Add `grid.test.ts`, `cells.test.ts`, `purity.test.ts` and `importGuard.test.ts`.
3. Covered cases: key/parse round trip and throwing; N/E/S/W neighbours; start-zone
   and world edges derived from `CONFIG`; 6 cells from a tile buildable and 7 not;
   outside `maxSize` rejected even inside the ring; single-cell `landBounds`;
   level 1/`maxStack` accepted and 0/`maxStack+1`/NaN/2.5/±Infinity rejected with the
   input unchanged; paint create/type-change/outside-zone/outside-world and invalid
   coordinates; digUp 3→2, 1→removed, empty unchanged and invalid coordinates; level
   range; input purity; no rendering/store imports.
4. `npm test` (88), `npm run build`, `npm run lint`.

Still to do next: item checks for tile tools (dig up under an item, `allowedTiles`),
commands, world store and rendering. Footprints, placement validation and connection
masks are now in `src/logic`; commands, stores and rendering remain out of scope.

## Release and community docs

- `LICENSE` (MIT, copyright holder placeholder)
- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`
- `CHANGELOG.md` (Keep a Changelog), `docs/RELEASING.md`
- `docs/DECISIONS.md`, `docs/STATE.md`, `docs/ARCHITECTURE.md`
- `.github/ISSUE_TEMPLATE/`, `PULL_REQUEST_TEMPLATE.md`, `dependabot.yml`
- `.editorconfig`, `.nvmrc` (Node 26, matches CI)

## Git / auth notes

- `credential.helper = store` is configured globally; pushing should not prompt for
  Keychain repeatedly. Batch git operations and push once per task.
- Repository: https://github.com/yx0128/evergrow
- Live demo: https://yx0128.github.io/evergrow/ (GitHub Pages, deployed by `.github/workflows/deploy.yml`)
- Default branch: `main`.
- Branch and commit rules: see Workflow rules above (D021).

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

### 2026-11-17 — v0.1.0 released

- Tagged v0.1.0 and pushed; GitHub Pages deployed it.
- Next milestone: 0.2.0 (world logic).

### 2026-11-17 — world logic: grid and cells

- Added `src/logic/grid.ts`: `key`/`parseKey`, N/E/S/W neighbours, world and start-zone
  bounds (even sizes half a cell off the origin), Chebyshev distance, `isBuildable`,
  and `landBounds`.
- Added `src/logic/cells.ts`: `Cell`/`CellMap` types, pure `setCell`, `removeCell`,
  `setLevel`, `setType` (always return new maps), level clamping and `getLevelRange`.
- Added `grid.test.ts` (14 tests) and `cells.test.ts` (11 tests), including the brief's
  buildable-zone cases: start zone, 6 cells from a tile true, 7 false, outside
  `maxSize` false.
- Added `imports.test.ts` (3 tests): a layering guard that fails if anything in
  `src/logic` imports React, Three/R3F, Zustand, `store/` or `scene/`.
- Decisions D017 (axes), D018 (bounds offset) and D019 (invalid-input handling).
- Out of scope and still pending: items, footprints, placement, commands, stores,
  rendering.
- `npm test` 61/61, `npm run build` OK (existing chunk-size warning), `npm run lint` OK.

### 2026-11-17 — fix: Result-based cell edits, paint and dig up

- `key`/`parseKey` now throw on malformed input instead of silently returning.
- `setCell`/`setLevel` reject out-of-range and non-integer levels with `CellResult`
  reasons (`maxStack`, new `minStack`) instead of clamping; config strings gained
  "Minimum height reached".
- `CellMap` is `ReadonlyMap`; `setCell` takes a `Cell` object; `isWithinWorld` became
  `isInWorld`; empty-cell `setLevel`/`setType` return ok with the same map.
- Added `paint` and `digUp` (§5.3), `MIN_LEVEL`, and single-source level validation.
- Added `purity.test.ts` (13 tests) and renamed the guard to `importGuard.test.ts`
  (3 tests); confirmed it fails with a temporary `three` import.
- Tests: 61 → 86. `npm test`, `npm run build` (existing chunk warning) and
  `npm run lint` pass.
- Out of scope here: item checks (`allowedTiles`, dig up under an item), stores,
  commands and rendering.

### 2026-11-17 — fix: tile tools handle invalid coordinates

- `paint` and `digUp` now return `outsideWorld` for out-of-world, non-integer or NaN
  coordinates before touching `key`, so a bad pointer raycast cannot throw. The
  low-level helpers still throw (D019).
- `levelReason` maps `+Infinity` to `maxStack` and `−Infinity` to `minStack`; NaN and
  non-integers stay `minStack` (D020). Rejection tests cover both infinities.
- The import guard glob now scans `.{ts,tsx}` under `src/logic` and skips `.test.ts`
  and `.test.tsx`.
- Tests: 86 → 88. `npm test`, `npm run build` (existing chunk warning) and
  `npm run lint` pass.

### 2026-11-18 — docs: branch and commit workflow

- Added "Workflow rules" after Status: branch naming, subject-only commits, required
  checks, squash merge after READY, no rewriting pushed history, and one push per task.
- Added D021 and pointed the Git/auth notes at the rules.
- Updated CONTRIBUTING's commit guidance to keep what/why/verification in PROGRESS.
- Code unchanged. `npm test` (88), `npm run build` and `npm run lint` pass.

### 2026-11-18 — fix: coverage tooling

- Added `npm run coverage` (`vitest run --coverage`) with the already-installed
  `@vitest/coverage-v8@5.1.0`, matching vitest 5.1.0.
- Configured v8 coverage in `vite.config.ts`: all `src/**/*.{ts,tsx}`, excluding
  test files, with text and HTML reporters and no thresholds. `coverage/` was
  already ignored.
- src/logic is at 100% statements, branches, functions and lines
  (`catalog.ts`, `cells.ts`, `grid.ts`). Overall: 100% statements/lines,
  98.95% branches; the only uncovered branch is `src/assets/redirect.ts` line 3.
- No game code changed; 88 tests still pass.

### 2026-11-18 — fix: GitHub Actions and Node 26

Replaces the six Dependabot PRs.

- actions/checkout v4 → v7. v7 is ESM; it restricts unsafe fork checkouts for
  `pull_request_target`/`workflow_run`. This repo uses only `push` and
  `pull_request`, so no config change was needed.
- actions/setup-node v4 → v7. ESM and new cache outputs; `node-version-file` and
  `cache: npm` still work unchanged.
- actions/configure-pages v5 → v6. Runtime moved to Node 24; no inputs changed.
- actions/upload-pages-artifact v3 → v5. Bumps its internal upload-artifact to v7
  and adds `include-hidden-files` (dotfiles stay excluded by default). `path: dist`
  is unchanged; `dist/` has no required dotfiles.
- actions/deploy-pages v4 → v5. Runtime moved to Node 24. It still consumes the
  `github-pages` artifact, which upload-pages-artifact v5 still produces under the
  same name and format, so the pair is compatible with no config changes.
- Node 26 everywhere: `.nvmrc` is now the single source (`node-version-file`),
  CI moved off Node 22, and `@types/node` went from 24.19.2 to 26.6.6.
- Added `.github/workflows/ci.yml` (pull_request: checkout, setup-node, `npm ci`,
  lint, test, build; `contents: read`). Deploy now runs lint too.
- `npm ci`, `npm run lint`, `npm test` (88) and `npm run build` pass locally on
  Node v26.13.1 (build still shows the existing chunk-size warning).

### 2026-11-18 — build: item footprints, placement and connections

Done:

- Added `footprint.ts` with the clockwise `Rotation` steps, the min-corner anchor
  (D024), `rotatedSize` and row-ordered `getFootprintCells`.
- Added `placement.ts`: `PlacedItem`, `Occupancy`, `buildOccupancy`, `itemAt` and
  `validatePlacement` with the five §6.3 reasons in order, `ignoreUid` and level-1
  auto tiles.
- Added `connect.ts` connection masks (N=1, E=2, S=4, W=8, D025) and
  `affectedByChange`.
- Extended `cells.getLevelRange` to return `null` under multi-cell items (D026).
- Added `src/main.tsx` to the coverage exclude list.
- Added `footprint.test.ts`, `placement.test.ts` and `connect.test.ts`, extended
  `cells.test.ts` and `purity.test.ts`.

Verification:

- `npm test` 88 → 131 tests, `npm run build` and `npm run lint` pass (existing
  chunk-size warning only).
- `npm run coverage`: `src/logic` is 100% statements, branches, functions and lines;
  no coverage exclusions. Overall branches are 99.31% (only
  `src/assets/redirect.ts` line 3 uncovered).

Not done: commands, undo/redo, coins, inventory, stores, rendering and the starting
rotation (a UI concern).

### 2026-11-18 — fix: item map, level range and connectable checks

Done:

- Added `PlacedItems = ReadonlyMap<uid, PlacedItem>` (D027). `buildOccupancy`,
  `itemAt`, `getConnectionMask` and `getLevelRange` now take the map and look up by
  uid instead of scanning an array.
- `getLevelRange(x, z, { cells, occupancy, items }, catalog)` takes all inputs as
  required parameters and throws on an unknown occupancy uid or missing catalog entry.
- Extracted the shared `itemDefinition` catalog lookup in `catalog.ts`; placement,
  connection and level logic import it from there.
- `getConnectionMask` now takes `catalog` and returns 0 for non-connectable items.
- Added tests for insertion-order-independent occupancy, `occupied` before
  `wrongTile`, adjacent same-id non-connectables, and the new `getLevelRange` and
  `getConnectionMask` error cases.
- Moved the lookup to `catalog.ts` and added direct `itemDefinition` tests; no
  behaviour change (138 tests).

Verification:

- `npm test` 131 → 138 tests, `npm run build` and `npm run lint` pass (existing
  chunk-size warning only).
- `npm run coverage`: `src/logic` stays at 100% statements, branches, functions and
  lines; no coverage exclusions.
