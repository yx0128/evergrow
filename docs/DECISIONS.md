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
| D019 | 2026-11-17 | Accepted | Keys and coordinates throw; levels are rejected with a Result | `key` throws on non-integer coordinates and `parseKey` throws an Error naming a malformed key, so corrupted save data cannot be silently misread. Level edits return `CellResult` instead of clamping, making rejection explicit for the HUD. `setLevel`/`setType` on an empty cell return `{ ok: true, cells }` with the same map unchanged. |
| D020 | 2026-11-17 | Accepted | Add the `minStack` invalid reason ("Minimum height reached") | A level below 1, NaN or a non-integer is outside §5.2's 1..`maxStack` range and needs a distinct message; reusing `maxStack` would tell the user the opposite. Levels above `maxStack` still return `maxStack`. |

## Template

```md
| D0XX | YYYY-MM-DD | Open/Accepted/Superseded | Short decision | Why. Leave empty if no reason. |
```
