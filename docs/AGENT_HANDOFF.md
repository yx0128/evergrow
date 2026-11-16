# Agent handoff

Read this file first, then [`SPEC.md`](./SPEC.md) and [`../STATE.md`](../STATE.md).
The original client brief (`brief.txt`) is intentionally gitignored. Do not add it
to the repository.

## Status

Scaffold complete. Vite + React + TypeScript is installed, the typed config catalog
exists, and a full-window R3F canvas renders the day background. No game features yet.

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
docs/                           # spec + this handoff
```

## Architecture rules (non-negotiable)

1. World rules (grid, cells, stacking, footprints, validation, economy) are pure TS
   in `src/logic/` with no Three.js or React imports. Unit-test before wiring UI.
2. All tunables live in `src/config/evergrow.config.ts`. No magic numbers elsewhere.
3. All world mutations go through commands (`place`, `move`, `rotate`, `remove`,
   `paint`, `setLevel`, `digUp`, `sell`, `store`) so undo/redo is uniform.
4. Never store absolute Y. Derive it as `level * world.tileThickness`.
5. Autosave to localStorage, debounced with `ui.autosaveDebounceMs`, including
   `saveSchemaVersion`.

## Current decisions / assumptions

- `world.startZone = 10` is even, so the starter grid is centred by offsetting
  half a zone (`-startZone/2 .. startZone/2-1`), not by an odd centre cell.
- One placeholder starter item, `sprout`, exists in the catalog. Its `.glb` and
  `.png` are not created yet; shop cards should use placeholders until then.
- The day background from `palette.background.day` is used until day/night exists.
- Zoom limits assume an orthographic camera. Confirm the projection before building
  `CameraRig`.
- Fonts are configured by family name only. Font files must be added to
  `public/assets/fonts/`.
- The config uses an explicit `: EvergrowConfig` annotation, so assigning a value of
  the wrong type is a compile error.

## Verification

```bash
npm test         # 12 config tests
npm run build    # tsc -b + vite build
npm run lint     # oxlint
npm run dev      # full-window canvas in the day background colour
```

## Git / auth notes

- `credential.helper = store` is configured globally; pushing should not prompt for
  Keychain repeatedly. Batch git operations and push once per task.
- Repository: https://github.com/yx0128/evergrow
- Default branch: `main`.
