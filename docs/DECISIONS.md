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

## Template

```md
| D0XX | YYYY-MM-DD | Open/Accepted/Superseded | Short decision | Why. Leave empty if no reason. |
```
