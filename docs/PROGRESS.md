# Progress

Read the client brief at [`BRIEF.md`](./BRIEF.md), then this file,
[`DECISIONS.md`](./DECISIONS.md) and [`STATE.md`](./STATE.md).

## Status

Scaffold complete, plus pure world logic for grid coordinates, the buildable zone,
tile cells, column levels, item footprints, placement validation, occupancy,
connection masks and undoable world commands. The typed config catalog exists and a
full-window orthographic R3F canvas renders the day background. Logic is not wired to
stores, rendering or UI yet.

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

## UI build notes

Handle these when the store and UI call the world commands:

- **Keep `setLevel` out of drag strokes.** `validate` throws when `setLevel` targets a
  cell under an item (D029), and `executeBatch` does not catch it, so one covered cell
  aborts the whole stroke instead of being skipped. BRIEF §5.3 only makes paint and dig
  up drag tools, and height uses a slider. Use `setLevelItem` for covered cells.
- **Some commands record an undo step that changes nothing.** Digging an empty cell and
  painting a tile its current type both succeed and add a history entry, so undo appears
  to do nothing. This also applies to those commands inside a drag stroke. See D034.

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
3. All world mutations go through commands (`place`, `move`, `rotate`,
   `paint`, `setLevel`, `digUp`, `sell`, `store`) so undo/redo is uniform.
4. Never store absolute Y. Derive it as `level * world.tileThickness`.
5. Autosave to localStorage, debounced with `ui.autosaveDebounceMs`, including
   `saveSchemaVersion`. Every key must go through `storageKey()` in
   `src/logic/save.ts`, which prefixes `ui.storagePrefix` (`evergrow:`) because
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
npm test         # 261 tests (config, catalog, assets, UI, redirect, grid, cells, footprint, placement, connect, commands, save, purity, import guard)
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

- `Cell { x, z, type, level }`, `CellMap = ReadonlyMap<string, Cell>`,
  and `CellResult = { ok: true; cells: CellMap } | { ok: false; reason: InvalidReason }`.
- `setCell(cells, cell)` and `setLevel(cells, x, z, level)` return `CellResult`.
  A level must be an integer in `CONFIG.world.minStack..maxStack`: above → `maxStack`,
  `+Infinity` → `maxStack`, and below `CONFIG.world.minStack`, `−Infinity`, NaN or a
  non-integer → `minStack` (new reason, "Minimum height reached").
  Rejected edits store nothing and leave the input untouched.
- `setType(cells, x, z, type)` returns `CellResult`. `setLevel`/`setType` on an
  empty cell return `{ ok: true, cells }` with the **same map** unchanged.
- `paint(cells, x, z, type)`: invalid or out-of-world coordinates → `outsideWorld`
  before any lookup; existing cell → change type, keep level; empty cell →
  `outsideBuildableZone` if not buildable, otherwise a new level-1 cell (§5.3).
- `digUp(cells, x, z)`: invalid or out-of-world coordinates → `outsideWorld` before
  any lookup; level > 1 → level − 1; level 1 → remove; empty in-world cell →
  unchanged (`{ ok: true, cells }`).
- Nothing is clamped and no input map is ever mutated.

### `src/logic/footprint.ts`

- Uses `Rotation = 0 | 1 | 2 | 3` from the config; each step is 90° clockwise seen
  from above (+X east, +Z south, D017).
- Anchor convention: `(x, z)` is the footprint's min-x/min-z corner after rotation
  (D024). `getFootprintCells` covers `x..x+w'-1`, `z..z+d'-1`.
- `rotatedSize(item, rot)` → `[w, d]`; a `w×d` footprint becomes `d×w` at rot 1 and 3.
- `getFootprintCells(item, x, z, rot)` → `GridPoint[]` in row order (z, then x).

### `src/logic/placement.ts`

- `PlacedItem { uid, id, x, z, rot }` (§6.1),
  `PlacedItems = ReadonlyMap<uid, PlacedItem>` (D027),
  `Occupancy = ReadonlyMap<cellKey, uid>`, `PlacementState = { cells, occupancy }`,
  `PlacementResult = { ok: true; autoTiles: Cell[] } | { ok: false; reason }`,
  and `LevelRange = { min, max }`.
- `buildOccupancy(items, catalog)` maps every rotated footprint cell to its uid and
  throws on an item id missing from the catalog. `itemAt(x, z, occupancy, items)`
  returns the covering item or `undefined`. Both read the item map directly by uid.
- `validatePlacement(item, x, z, rot, autoTile, state, ignoreUid?)` checks §6.3 in
  order: `outsideWorld`, `outsideBuildableZone`, `occupied`, `wrongTile`,
  `unevenGround`; the first failure wins. Empty cells count as level 1. `ignoreUid`
  accepts a moving item's own cells. On success `autoTiles` has one level-1 cell of
  `autoTile` for each empty footprint cell, in footprint order.
- `getLevelRange(x, z, world, catalog)` → `LevelRange | null`, where
  `world = { cells, occupancy, items }` and all parameters are required. It returns
  `{ min: CONFIG.world.minStack, max: CONFIG.world.maxStack }` for bare tiles and
  `null` under any item (tile settings come from the item, D029). An occupancy uid
  with no item, or an item id missing from the catalog, throws.

### `src/logic/connect.ts`

- Connectable items are 1×1 (D025); placement validation is unchanged.
- `getConnectionMask(uid, items, occupancy, catalog)` returns 0 for a missing or
  non-connectable item and otherwise 4 bits: N=1, E=2, S=4, W=8. A bit is set when the
  orthogonal neighbour holds an item with the same id. A missing catalog entry throws.
- `affectedByChange(x, z)` returns the cell itself then N, E, S, W (§6.5).

### `src/logic/commands.ts`

- `WorldState { cells, items, occupancy, inventory, coins }`. After every apply,
  undo and redo, `occupancy` equals `buildOccupancy(items, catalog)`. Inventory
  entries are deleted when their count reaches 0.
- `Command` is plain data: `place`, `move`, `rotate`, `store`, `sell`, `paint`,
  `changeItemTile`, `setLevel`, `setLevelItem` and `digUp`.
- `validate(command, state, catalog)` returns `{ ok: true }` or
  `{ ok: false, reason }`. Player rule failures are reasons; missing uids, duplicate
  uids and unknown catalog ids throw. Coins never go negative. `paint` and `digUp`
  return `outsideWorld` for non-integer or NaN coordinates before any lookup.
- `apply(command, state, catalog)` returns `{ state, inverse }`. Cells and items are
  restored exactly by the inverse; coins and inventory change by deltas (D030).
  `place` and `move` create their auto tiles through `validatePlacement`, and `place`
  undo removes only the tiles it created. A uid already in `items` throws, including
  inside a batch: callers supply uids (D031), so a duplicate is a caller bug.
- `History { past, future }` is immutable. `execute` validates, applies, pushes onto
  `past` and clears `future`; failures leave both unchanged. `undo` and `redo`
  re-validate first and return the failure reason unchanged (D030).
  `canUndo` / `canRedo` inspect the stacks.
- `execute` and `redo` keep at most `CONFIG.history.limit` past entries, dropping the
  oldest (D032). `future` only receives entries from `past`, so it cannot exceed the
  limit.
- `executeBatch(history, state, commands, catalog)` runs one drag stroke as one
  history entry. Sub-commands run in order and are skipped on failure; the result
  reports `{ index, reason }` in `skipped`. Only applied commands are recorded, and
  the batch inverse restores the pre-batch cells/items and sums the coin and
  inventory deltas. If nothing applies it returns the first reason unchanged.
  Nested or empty batches throw. Batch redo re-validates every sub-command and is
  all-or-nothing, validating and applying each sub-command once. `validate`, `apply`
  and `execute` throw if given a `batch`; batches must go through `executeBatch`.
- Callers supply uids; there is no randomness or clock in `src/logic` (D031).
- `place` from inventory spends one item (`notInInventory`) or from the shop spends
  `price` (`unaffordable`) and goes straight into the world. `store` adds one item;
  `sell` refunds the full price (D013). `rotate` increments `rot` for any existing
  item (D033); place and move accept rot 0–3.
- Tile settings under an item go through the item: `paint` requires an allowed type;
  `digUp` returns `underItem`; single-cell `setLevel` throws and points at
  `setLevelItem` (D029).

### `src/logic/save.ts`

- `storageKey(key)` prefixes `CONFIG.ui.storagePrefix` (`evergrow:`) so localStorage
  keys are namespaced for the shared `*.github.io` origin (D005). There is no save or
  load behaviour yet.

### `src/logic/importGuard.test.ts`

Vitest-only guard. It reads every non-test `src/logic/**/*.ts` file raw and fails on
any import or export-from of React, React DOM, `three`, `@react-three/*`, `zustand`,
or anything under `store/` or `scene/`. Config and sibling logic imports stay allowed.
It was verified by temporarily adding a `three` import and watching the test fail.

### `src/logic/purity.test.ts`

Calls every exported map function and pure helper (`setCell`,
`setLevel`, `setType`, `paint`, `digUp`, `isBuildable`, `landBounds`, `getLevelRange`,
`rotatedSize`, `getFootprintCells`, `buildOccupancy`, `itemAt`, `validatePlacement`,
`getConnectionMask`), snapshotting inputs with `structuredClone` and asserting they
are deep-equal afterwards.

### Reproduce this step

1. Create `src/logic/grid.ts` and `src/logic/cells.ts` as above.
2. Add `grid.test.ts`, `cells.test.ts`, `purity.test.ts` and `importGuard.test.ts`.
3. Covered cases: key formatting and throwing; N/E/S/W neighbours; start-zone
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
- Extended `cells.getLevelRange` to return `null` under items (D026, superseded by D029).
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

### 2026-11-18 — fix: square footprints and tile settings under items

Done:

- `validateCatalog` now rejects a footprint whose width and depth differ with
  `non-square footprint: <id>` (D028).
- `getLevelRange` returns `null` under any item, 1×1 included; it still throws on an
  unknown uid or missing catalog entry. Single-cell height edits under an item are a
  programming error (D029).
- Replaced valid non-square fixtures with a 2×2 cottage across the logic tests.
  `footprint.ts` is unchanged; its tests keep one generic non-square `rotatedSize`
  case and add the 2×2 same-cells test for rot 0–3.

Verification:

- `npm test` 138 → 137 tests, `npm run build` and `npm run lint` pass (existing
  chunk-size warning only).
- `npm run coverage`: `src/logic` stays at 100% statements, branches, functions and
  lines; no coverage exclusions.

### 2026-11-18 — build: world commands with undo and redo

Done:

- Added `commands.ts` with `WorldState`, the ten world commands, `validate`,
  `apply`, immutable `History`, `execute`, `undo`, `redo`, `canUndo` and `canRedo`.
- Commands reuse placement, footprint, catalog and cell logic. `place` and `move`
  create their auto tiles through `validatePlacement`; item tile and height edits use
  the item paths (D029).
- Inverse operations restore cells and items exactly and change coins and inventory
  by deltas (D030). Undo and redo re-validate before applying.
- Uids come from callers; `src/logic` has no randomness or clock (D031). History has
  no size limit yet (D032).
- Added `notInInventory` and `notRotatable` to `InvalidReason` and
  `CONFIG.strings.invalid`.
- Added `commands.test.ts` (success, invalid and round trips for every command) and
  command/history purity tests.

Verification:

- `npm test` 137 → 185 tests, `npm run build` and `npm run lint` pass (existing
  chunk-size warning only).
- `npm run coverage`: `src/logic` is 100% statements, branches, functions and lines;
  no coverage exclusions.

### 2026-11-18 — fix: tile commands on bad coordinates and universal rotation

Done:

- `validate` for `paint` and `digUp` now returns `outsideWorld` for non-integer or NaN
  coordinates before any item or occupancy lookup.
- Removed `rotatable` from `ItemDef`, `notRotatable` from `InvalidReason` and
  `CONFIG.strings.invalid`, and the connectable/rotatable catalog check. Every
  existing item can rotate (D033); unknown uids still throw.
- Added tests for invalid paint/digUp coordinates, fence rotation and round trips,
  four rotations returning to rot 0, and placing the fence at rot 1.
- Cleanups: getLevelRange comment, simpler digUp validation, DECISIONS spacing.

Verification:

- `npm test` 185 → 187 tests, `npm run build` and `npm run lint` pass (existing
  chunk-size warning only).
- `npm run coverage`: `src/logic` is 100% statements, branches, functions and lines;
  no coverage exclusions.

### 2026-11-18 — fix: undo history limit and grouped drag strokes

Done:

- Added `CONFIG.history.limit` (50) and a config test that it is an integer ≥ 1.
- `execute`, `executeBatch` and `redo` cap `past` at the configured limit by
  dropping the oldest entry (D032).
- Added the `batch` command and `executeBatch`. One drag stroke is one undo step;
  failing sub-commands are skipped and reported by index and reason, and only
  applied commands are recorded. The inverse restores the pre-batch state and sums
  coin and inventory deltas. Redo re-validates every sub-command and is
  all-or-nothing.
- Added tests for the limit, batch apply/undo/redo, skipped and all-failed batches,
  all-or-nothing redo, nested/empty batch throws, summed deltas and purity.

Verification:

- `npm test` 187 → 198 tests, `npm run build` and `npm run lint` pass (existing
  chunk-size warning only).
- `npm run coverage`: `src/logic` is 100% statements, branches, functions and lines;
  no coverage exclusions.

### 2026-11-18 — fix: undo history test gaps and single-pass batch

Done:

- `executeBatch` now validates and applies each sub-command once, collecting the
  summed coin and inventory deltas in the same loop. The inverse still snapshots the
  pre-batch cells and items, and the delta code is shared with the redo path.
- Reworked the limit test to generate distinct buildable coordinates from
  `CONFIG.world` bounds and to fail clearly when the world cannot supply enough.
- Added batch tests for capping at the limit, summed coin deltas, blocked batch undo,
  future clearing, dependent sub-commands, same-cell paints, order-sensitive skips,
  place-then-store inventory, external coin deltas, duplicate uids and single-command
  batches.
- The skip test now covers undo and redo of the applied commands.
- Documented the `batch` guard on `validate`, `apply` and `execute`.

Verification:

- `npm test` 198 → 209 tests, `npm run build` and `npm run lint` pass (existing
  chunk-size warning only).
- `npm run coverage`: `src/logic` stays at 100% statements, branches, functions and
  lines; no coverage exclusions. Each new targeted test was checked against a
  temporary code break and failed as expected before restore.

### 2026-11-18 — fix: duplicate uid throws and single-pass batch redo

Done:

- Restored the duplicate-uid check to run before `validatePlacement`, so a duplicate
  uid throws again, including inside `executeBatch` (D031). Placement occupancy
  reasons are unaffected for distinct uids.
- Batch redo now validates and applies each sub-command once, accumulating deltas
  with the shared helpers. `validateAll` and `applyAll` were removed. Redo remains
  all-or-nothing and its inverse snapshots the pre-redo cells and items.
- Replaced the duplicate-uid skip test with a throw test and added an occupied-cell
  skip test. Removed literal coin expectations from the new batch tests and explained
  the `worldCoords` path.
- Added an undo-after-redo assertion so the batch-redo inverse is covered.

Verification:

- `npm test` 209 → 210 tests, `npm run build` and `npm run lint` pass (existing
  chunk-size warning only).
- `npm run coverage`: `src/logic` stays at 100% statements, branches, functions and
  lines; no coverage exclusions.

### 2026-11-18 — fix: mutation-review test gaps for grid, cells and water rules

Done:

- Added nine `grid.test.ts` tests for odd-size bounds, explicit `worldBounds` and
  `startZoneBounds` sizes, custom world/start-zone checks, the `z` upper bound, and
  `landBounds` insertion order and water cells. Also covered water tiles extending
  the buildable ring.
- Added 26 `cells.test.ts` tests: coordinate throwing in `getCell`, `setCell`,
  `removeCell`, `setLevel` and `setType`; `x,z` key order and empty-cell behaviour;
  dig-up edge cases; level-range lookup, empty-string uids, neighbour heights and
  every tile type. Added a `no water or neighbour rules (D014)` describe covering
  water at any height and beside any neighbour, paint in the ring, and water dig-up.
- Production code is unchanged. `src/logic/cells.ts:36` (`-Infinity`) is redundant
  because `Number.isInteger(-Infinity)` is already false, so no test can distinguish
  it.

Why: a mutation review found rules that could break without any test failing.

Verification:

- `npm test` 210 → 245 tests (all pass); `npm run build` and `npm run lint` pass
  (existing chunk-size warning only).
- `npm run coverage`: `src/logic` stays at 100% statements, branches, functions and
  lines. Overall branches are 99.59%; only `src/assets/redirect.ts` line 3 is
  uncovered.
- Each of the 35 new tests was checked against its named temporary bug (37 bug runs
  including two each for tests 7 and 23); every targeted test failed as expected, and
  `git diff` for `src/logic/grid.ts` and `src/logic/cells.ts` is empty afterwards.

### 2026-11-18 — fix: D014 test matrix for neighbours and tile types

Done:

- Added a table-driven `cells.test.ts` test covering every combination of tile type,
  orthogonal neighbour type, direction and level for `setCell`, `setLevel`, `paint`,
  `digUp` and `getLevelRange` (D014).
- Added `grid.test.ts` coverage that grass, land and water all extend the buildable
  ring, and a `setLevel` test that every invalid level is ignored on an empty cell.
- Production code is unchanged.

Why: review found the remaining D014 gaps only covered some tile and neighbour
combinations.

Verification:

- `npm test` 245 → 248 tests (all pass); `npm run build` and `npm run lint` pass
  (existing chunk-size warning only).
- `npm run coverage`: `src/logic` stays at 100% statements, branches, functions and
  lines. Overall branches are 99.59%; only `src/assets/redirect.ts` line 3 is
  uncovered.
- All 12 named temporary bugs made the targeted test fail; each was applied and
  restored on its own. `git diff main -- src/logic/grid.ts src/logic/cells.ts` is empty.

### 2026-11-18 — fix: check the level left after digging beside neighbours

Done:

- Strengthened the `digUp` assertion in the D014 neighbour matrix test: it now checks
  the resulting level is `height - 1`, or that the cell is gone at `MIN_LEVEL`,
  instead of only checking that `digUp` succeeds.
- Production code is unchanged.

Why: the previous assertion still passed when a raised column beside water was deleted
outright.

Verification:

- `npm test` remains 248 tests (all pass); `npm run build` and `npm run lint` pass
  (existing chunk-size warning only).
- `npm run coverage`: `src/logic` stays at 100% statements, branches, functions and
  lines. Overall branches are 99.59%; only `src/assets/redirect.ts` line 3 is
  uncovered.
- The named temporary bug (deleting a raised column beside water) made the strengthened
  test fail as expected, then the code was restored. `git diff main -- src/logic/cells.ts`
  is empty.

### 2026-11-18 — fix: check the auto tile only when a cell needs one

Done:

- `validatePlacement` now requires `autoTile` in `item.allowedTiles` only when at least
  one footprint cell is empty; when every footprint cell already has allowed ground the
  auto tile is ignored (§6.3, D015). The check order and every other rule are unchanged.
- Added `placement.test.ts` tests for a disallowed auto tile over fully covered ground
  (accepted, no auto tiles) and a partly empty footprint (rejected with `wrongTile`).

Why: a disallowed `autoTile` was rejected even when no auto tile would be created, so a
valid placement could fail with `wrongTile`.

Verification:

- `npm test` 248 → 250 tests (all pass); `npm run build` and `npm run lint` pass
  (existing chunk-size warning only).
- Both temporary mutations were applied and restored on their own: `some` → `every`
  failed the partial-footprint test, and `needsAutoTile &&` → `false &&` failed the
  auto-tile and partial-footprint tests.

### 2026-11-18 — fix: close mutation test gaps in footprints, placement and commands

Done:

- Added 23 tests: non-square footprint rotation and occupancy, a zero-depth catalog
  footprint, per-cell placement checks for the world edge, buildable zone, occupancy,
  tile type, level and auto tile type, and command pricing, inventory, move, batch and
  history-order behaviour.
- Production code is unchanged.

Why: a mutation review found 31 deliberate bugs that `npm test` did not catch.

Verification:

- `npm test` 250 → 273 tests (all pass); `npm run build` and `npm run lint` pass
  (existing chunk-size warning only).
- All 31 mutations were applied one at a time and each made at least one test fail;
  every production file was restored. `git diff` for `footprint.ts`, `catalog.ts`,
  `placement.ts` and `commands.ts` is empty.
- The three behaviour-neutral history-cap mutations were excluded as instructed.

### 2026-11-18 — docs: command edge cases for the UI build

- Added UI build notes for keeping `setLevel` out of drag strokes and for no-op paint
  and dig up commands creating an undo step.
- Added D034 for the open question about no-op commands creating undo steps.
- No code or tests changed. `npm test` (273), `npm run build` and `npm run lint` pass.

### 2026-11-18 — fix: settle economy, remove and minimum level rules

Done:

- Removed the unused `tileCost` and `allowNegativeCoins` settings from `EconomyConfig`,
  `CONFIG.economy` and their config assertions (D035).
- Recorded that there is no `remove` command: `store` and `sell` replace it in
  BRIEF §2, §4.8 and §9, the PROGRESS architecture rule and D036.
- Moved the minimum level into config: added `CONFIG.world.minStack` (1) next to
  `maxStack`, removed the exported `MIN_LEVEL` from `src/logic/cells.ts`, and used
  `CONFIG.world.minStack` in `cells.ts`, `placement.ts` and `cells.test.ts`.
- Renamed the leftover `minLevel` test title and rewrapped the `getLevelRange` notes.

Why: a code-health review found two economy settings nothing read, an undefined
`remove` command in the brief, and a hard-coded minimum level that broke §2's
config-only rule.

Verification:

- `git grep -nE 'tileCost|allowNegativeCoins|MIN_LEVEL' -- src` and
  `git grep -n "kind: 'remove'" -- src` return nothing.
- `npm test` remains 273/273 tests; `npm run build` and `npm run lint` pass (existing
  chunk-size warning only).
- `npm run coverage`: `src/logic` stays at 100% statements, branches, functions and
  lines.

### 2026-11-18 — fix: remove dead code and relocate helpers

Done:

- Removed `getCell`, `removeCell`, `parseKey`, `KEY_PATTERN`, the `−Infinity`
  `levelReason` branch and the unused `Rotation` re-export. `worldBounds`,
  `startZoneBounds`, `isInWorld` and `isWithinStartZone` now always read `CONFIG`.
- Simplified the `paint` apply branch in `commands.ts`; `validate` is unchanged.
- Moved `getLevelRange` and `LevelRange` to `placement.ts` with the same signature and
  behaviour, and moved their tests to `placement.test.ts`.
- Deleted `src/assets/redirect.ts` and tested `public/404.html` directly. Inlined the
  storage guard into its test, deleted both source files, and moved `storageKey` to
  `src/logic/save.ts` with its test.
- Updated the current PROGRESS reference sections and test count.
- Tidied the `cells.ts` file ending, a `key` test title and the related notes.

Why: a code-health review found dead exports, misplaced helpers and a test-only module.
Behaviour is unchanged.

Verification:

- `git grep -nwE 'removeCell|parseKey|redirectTarget' -- src public` returns nothing;
  `getCell` only appears as the local cells test helper, and `cells.ts` no longer
  imports from `placement`.
- `npm test` 273 → 261 tests. The 12 deleted tests covered removed code: `getCell` (1),
  `removeCell` (5, including purity), `parseKey` (1), explicit grid sizes (4) and the
  404 sync check against `redirectTarget` (1). `npm run build` and `npm run lint` pass
  (existing chunk-size warning only).
- `npm run coverage`: every file at 100% statements, branches, functions and lines.
