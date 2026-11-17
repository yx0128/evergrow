# Decisions

Log of product and technical choices. Add an entry when a decision is made or
reversed. Status values: **Accepted**, **Open**, **Superseded**. Leave Reason empty
when there is none.

| ID | Date | Status | Decision | Reason |
|---|---|---|---|---|
| D001 | 2026-11-17 | Accepted | Orthographic camera | |
| D002 | 2026-11-17 | Accepted | Start zone is 10×10 | Brief specifies a 10×10 zone centred at the origin; an even size is offset by half a cell. |
| D003 | 2026-11-17 | Open | Item catalog and starter item | Items are still undecided, so the catalog and starter inventory stay empty; the tutorial skips the drag step. |
| D004 | 2026-11-17 | Accepted | Relative asset paths | GitHub Pages serves the app from a subpath, so absolute `/assets` URLs would break. |
| D005 | 2026-11-17 | Accepted | Namespaced storage | All `*.github.io` project sites share one origin, so keys need a project prefix. |
| D006 | 2026-11-17 | Accepted | GitHub Pages deployment | Static hosting is free and sufficient for a local-only demo; tests gate deploys. |
| D007 | 2026-11-17 | Open | Font families and files | Font files are not present; configured names are placeholders. |
| D008 | 2026-11-17 | Accepted | Day background | Requested blue matching the saturation and lightness of the original warm tone. |
| D009 | 2026-11-17 | Accepted | Requirements live in `docs/BRIEF.md` | The brief had been gitignored; it is now tracked and replaces the removed SPEC. |
| D010 | 2026-11-17 | Accepted | Default focus and Pomodoro lengths | Brief sets 25/5/15 minutes, a long break every 4 cycles and 5-minute focus blocks. |
| D011 | 2026-11-17 | Accepted | UI tests use jsdom + Testing Library | The project had no DOM test stack; this verifies the canvas background and WebGL fallback without a real browser. |
| D012 | 2026-11-17 | Accepted | Node 22 in CI and `.nvmrc` | Node 20 is deprecated on GitHub Actions runners; 22 is supported and satisfies Vite's requirement. |
| D013 | 2026-11-17 | Accepted | Selling always refunds 100%; no refund setting | A full refund is fixed design, so a config value adds nothing. |
| D014 | 2026-11-17 | Accepted | No water/neighbour tile rules; every cell's height range is 1 to `maxStack` | Removes the fiddliest logic and blocked states for the demo; opaque water sides make raised water look intentional. Can be added later without breaking saves. |
| D015 | 2026-11-17 | Accepted | Keep `allowedTiles` per item | Cheap check that prevents odd placements (e.g. a campfire on water) and drives `Tab` cycling and greyed-out tile options. |
| D016 | 2026-11-17 | Accepted | Brief names no specific games as references | A generic "cozy 3D sandbox builders" description keeps the style direction without tying it to particular titles. |
| D017 | 2026-11-17 | Accepted | Grid axes: +X is east, +Z is south, north is −Z | Matches the brief's `arm` pointing +Z and standard top-down x/z grids; keeps rotation and neighbour code unambiguous. |
| D018 | 2026-11-17 | Accepted | Bounds use `min = -floor(size / 2)` | Consistent with D002: a 10×10 start zone covers −5..4 and a 256×256 world covers −128..127, all centred on the origin. |
| D019 | 2026-11-17 | Accepted | Tile tools return Result; low-level helpers throw | `paint`/`digUp` return `{ ok: false, reason: 'outsideWorld' }` for out-of-world, non-integer or NaN coordinates instead of throwing. `key`, `getCell`, `setCell`, `setLevel`, `setType` and `removeCell` still throw through `key` on bad coordinates so programming errors fail loudly. Level edits return `CellResult` instead of clamping, and `setLevel`/`setType` on an empty cell return `{ ok: true, cells }` with the same map unchanged. |
| D020 | 2026-11-17 | Accepted | Add the `minStack` invalid reason ("Minimum height reached") | A level below 1, NaN or a non-integer is outside §5.2's 1..`maxStack` range and needs a distinct message; reusing `maxStack` would tell the user the opposite. Levels above `maxStack` return `maxStack`; `+Infinity` is treated as above max, `−Infinity` as below min, and NaN/non-integers return `minStack`. |
| D021 | 2026-11-18 | Accepted | Work on step/fix/docs branches and squash-merge into main after review | Keeps main reviewed and deployable (Pages deploys every push to main). Broken intermediate commits stay on the branch. No history rewriting on main. Rules live in PROGRESS.md "Workflow rules". |
| D022 | 2026-11-18 | Accepted | Use @vitest/coverage-v8 as a review aid, with no threshold yet | Shows untested branches in pure logic; a threshold now would reward tests written to hit a number. Consider a src/logic-only threshold later. |
| D023 | 2026-11-18 | Accepted | Node 26 (LTS) for local, CI and @types/node; .nvmrc is the single source | Local was already on 26 and CI on 22; one version avoids type and runtime mismatches. Node 26 entered LTS in October 2026. |
| D024 | 2026-11-18 | Accepted | Item rotation steps are 90° clockwise viewed from above; the anchor is the footprint's min-x/min-z corner after rotation | Matches the brief's R key and the +X east / +Z south axes (D017). Using the same min corner for every rotation keeps footprint cells easy to enumerate and occupancy stable. |
| D025 | 2026-11-18 | Accepted | Connectable items are always 1×1; connection mask bits are N=1, E=2, S=4, W=8 | The brief models fences, paths and hedges as a post plus combination arms; 1×1 keeps placement unchanged and bit values map directly to the N/E/S/W order used elsewhere. |
| D026 | 2026-11-18 | Superseded (D029) | `getLevelRange` returns `null` under a multi-cell item | §6.4 adjusts a whole footprint from the item popover, so a per-cell slider is disabled rather than clamping some cells independently. |
| D027 | 2026-11-18 | Accepted | Placed items are stored as a `ReadonlyMap` keyed by uid | Undo can restore items without depending on order (deep-equal compares maps by key), and lookups by uid are direct. |
| D028 | 2026-11-18 | Accepted | Item footprints are square (1×1, 2×2, …) | Rotation never changes the covered cells, so rotate needs no auto tiles or re-validation; `validateCatalog` enforces it. |
| D029 | 2026-11-18 | Accepted | Clicking an item or any tile under it opens the item popover; the tile popover only opens for uncovered tiles | Tile type and height under an item are set from the item (§6.4). `getLevelRange` returns null under any item, and single-cell height edits under an item are a programming error. |

| D030 | 2026-11-18 | Accepted | Coins and inventory change by deltas; undo/redo re-validate | Deltas keep external coin or inventory changes visible instead of snapping back to a stored value. Re-validating an inverse catches cases like selling undo after the refund was spent (`unaffordable`). |
| D031 | 2026-11-18 | Accepted | Callers supply uids; `src/logic` has no randomness or clock | Commands stay pure and deterministic for tests and replay; the store or UI creates uids outside the logic layer. |
| D032 | 2026-11-18 | Open | History size limit | Undo history is currently unbounded. A cap and its memory trade-off are deferred until save and long sessions are implemented. |
| D033 | 2026-11-18 | Accepted | Every item can rotate; there is no `rotatable` flag | Player choice; square footprints (D028) mean rotation never changes the covered cells. Connectable arms follow same-item neighbours in world directions (D025), so rotating a connectable item turns only its post. Overrides BRIEF §6.1, §6.4 and §6.5. |

## Template

```md
| D0XX | YYYY-MM-DD | Open/Accepted/Superseded | Short decision | Why. Leave empty if no reason. |
```
