# Architecture

Evergrow is a static desktop-browser game. There is no backend; all state is local.

## Layers

```
React UI (src/ui)  ─┐
R3F scene (src/scene)├─ read ──► Zustand stores (src/store)
Command system      ─┘                 │
                                      ▼
                           Pure logic (src/logic)
                                      │
                                      ▼
                    Config (src/config/evergrow.config.ts)
```

- **Config** is the single source of truth for tunables, catalogs and strings.
- **Logic** is framework-free TypeScript and unit-tested. It must not import React,
  Three.js, R3F or the browser DOM.
- **Stores** hold session state and dispatch commands. Persistence goes through
  `src/logic/save.ts`.
- **Scene** reads state and renders it. It never mutates world rules directly.
- **UI** dispatches commands and reads store selectors.

## World model

- Cells are sparse, keyed `"x,z"`, with `type` and `level`.
- Y is always derived: `level * world.tileThickness`.
- Placed items reference an item id, position and rotation.
- All world changes go through commands so undo/redo is uniform.

## Assets

- Source scripts live in `assets-src/blender/`; exports land in
  `public/assets/{models,thumbs,fonts}/`.
- Catalog paths are relative (`assets/models/...`). Render with `assetUrl()`.
- 1 Blender unit = 1 grid cell; front faces −Y; transforms applied.

## Deployment

Static build deployed to GitHub Pages by `.github/workflows/deploy.yml`. The build
base is `/<repo>/`; local dev runs at `/`. Tests gate deployment.

## Constraints

- Desktop only, no touch.
- No cloud sync or accounts.
- Respect `prefers-reduced-motion`.
- No cheap effects: no bounce, pop, shake, particles, sparkle or pulsing glow.

See [`BRIEF.md`](BRIEF.md) for requirements, [`DECISIONS.md`](DECISIONS.md) for choices, and [`PROGRESS.md`](PROGRESS.md)
for onboarding.
