# Architecture

Evergrow is a static desktop-browser game. There is no backend; all state is local.

## Layers

```
React UI (src/ui) ──────┐
                        ├─► Zustand stores (src/store) ─► Pure logic (src/logic)
R3F scene (src/scene) ──┘                                        │
                                                                 ▼
                                       Config (src/config/evergrow.config.ts)
```

**Status:** config, pure logic, the world store and a 3D scene exist. The scene has
the camera rig, lighting and instanced tile columns with fades. Item rendering,
placement, game UI and save/load are planned.

- **Config** is the single source of truth for tunables, catalogs and strings.
- **Logic** is framework-free TypeScript and unit-tested, including the world commands
  and undo history. It must not import React, Three.js, R3F, Zustand, stores, the scene
  or the browser DOM.
- **Stores** hold session state and run commands. `world.ts` wraps the command history;
  `ui.ts` holds mode, selection, drag and tool state. Persistence will go through
  `src/logic/save.ts`, which currently provides only `storageKey()`.
- **Scene** reads state and renders it (camera rig, lighting, instanced tile chunks).
  It never changes world rules directly.
- **UI** will read store selectors and call store actions.

## World model

- Cells are sparse, keyed `"x,z"`, with `type` and `level`.
- Y is always derived: `level * world.tileThickness`.
- Placed items reference an item id, position and rotation.
- All world changes go through commands so undo/redo is uniform.

## Assets

- Source scripts live in `assets-src/blender/`; models and thumbnails export to
  `public/assets/{models,thumbs}/`. Font files are supplied separately in
  `public/assets/fonts/`.
- Catalog paths are relative (`assets/models/...`). Render with `assetUrl()`.
- 1 Blender unit = 1 grid cell; front faces −Y; transforms applied.

## Deployment

Static build deployed to GitHub Pages by `.github/workflows/deploy.yml`. The build
base is `/<repo>/`; local dev runs at `/` unless `VITE_BASE_PATH` is set. Lint and
tests gate deployment.

## Constraints

- Desktop only, no touch.
- No cloud sync or accounts.
- Respect `prefers-reduced-motion`.
- No cheap effects: no bounce, pop, shake, particles, sparkle or pulsing glow.

See [`BRIEF.md`](BRIEF.md) for requirements, [`DECISIONS.md`](DECISIONS.md) for choices, and [`PROGRESS.md`](PROGRESS.md)
for onboarding.
