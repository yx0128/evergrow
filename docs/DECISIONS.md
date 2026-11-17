# Decisions

Log of product and technical choices. Add an entry when a decision is made or
reversed. Status values: **Accepted**, **Open**, **Superseded**.

| ID | Status | Decision | Notes |
|---|---|---|---|
| D001 | Accepted | Orthographic camera | `minZoom`/`maxZoom` operate on orthographic zoom. |
| D002 | Accepted | Start zone is 10×10 | Even size, centred by half-offset (`-5..4`). |
| D003 | Open | Item catalog and starter item | `items: []`, `starter.items: []` until the list is chosen. Tutorial skips the drag step. |
| D004 | Accepted | Relative asset paths | Catalog stores `assets/...`; render via `assetUrl()`. |
| D005 | Accepted | Namespaced storage | Every localStorage key uses `storageKey()` → `evergrow:`. |
| D006 | Accepted | GitHub Pages deployment | Auto-deploy on `main`; base `/<repo>/`; tests gate deploy. |
| D007 | Open | Font families and files | Config names are placeholders; add files to `public/assets/fonts/`. |
| D008 | Accepted | Day background | Solid `#d7e0e9`, same saturation/lightness as the original warm tone. |
| D009 | Accepted | Requirements live in `docs/BRIEF.md` | Tracked in the repo; `docs/SPEC.md` was removed. |
| D010 | Open | Default focus and Pomodoro lengths | Current values are brief defaults; confirm before shipping. |

## Template

```md
| D0XX | Open/Accepted/Superseded | Short decision | Why, constraints, links. |
```
