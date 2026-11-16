# Evergrow specification

Condensed working spec derived from the client brief. The client brief itself is
kept out of the repository; this document is the source of truth for implementers.

## Vision

Evergrow is a desktop-browser demo: a to-do list that grows a cozy 3D world. Every
completed task, subtask or focus block earns coins. Coins buy plants, buildings and
decorations that are placed on a grid. Single player, local data only.

Principle: growth happens little by little. The world is proof of accumulated effort.

Tone: cozy, warm, calm, minimal. No bounce, pop, shake, particles, confetti,
sparkles or pulsing glow. Motion is short, soft and purposeful.

## Stack

Vite, React + TypeScript, Zustand, Three.js, React Three Fiber, drei, Vitest,
localStorage, Blender + Python for assets.

## Architecture

- Pure logic in `src/logic/` (no React/Three imports), unit-tested.
- Every tunable in `src/config/evergrow.config.ts`.
- World mutations only through commands (undo/redo).
- Y is derived, never stored: `level * tileThickness`.
- Save with `schemaVersion` and migrations. Autosave debounced ~500 ms.

## Core loop

Add tasks → complete tasks/subtasks or focus sessions → earn coins → buy items →
drag items into the 3D world → repeat. Start with an empty world, 0 coins, no tasks,
and 1 starter item.

## Tasks

- Quick-add with Enter; edit; delete with confirm; complete.
- Size tag Tiny/Small/Medium/Big sets reward from config.
- Optional notes and subtasks (add, complete, reorder, delete).
- Subtask share: `parentReward * subtaskShare / subtaskCount`, rounded.
- All subtasks complete prompts "Complete task?" and the parent pays the remainder.
- Ticking the parent auto-ticks remaining subtasks and pays exactly the full reward,
  in any order.
- Undo subtask completion reverses that share. Undo parent unticks the parent and the
  subtasks it auto-ticked; manually ticked subtasks stay ticked.
- Filters: Today / All / Completed. Coins never negative.

## Focus

- Free session: timer with optional target; `coinsPerBlock` per completed block
  (default 5 min); minimum session length to earn (default 5 min).
- Pomodoro: focus/break cycles (25/5, long 15 every 4), all configurable.
- Optional task link; show linked task and subtasks under the timer.
- Pause, resume, end; skip break. Early end pays completed blocks only.
- Completion screen: minutes, coins, "Mark task done?" if linked.
- Can minimise to a top-bar chip. Timer derives from timestamps so background tabs
  stay accurate.

## Economy

- Coins always visible; count up/down over `coinCountUpMs` (~400 ms).
- Tiles are free. Selling refunds 100% of price. Storing returns to inventory with
  no coin change.

## Shop and inventory

- Bottom collapsible drawer, categories.
- Card: thumbnail, name, price, footprint (e.g. 2×2).
- Unaffordable cards visible, greyed out, disabled, "Need N more".
- Purchase goes to inventory; drag from a card buys on successful drop only.
- Inventory tray shows owned unplaced items with counts; drag to place.

## World and tiles

- Flat single-colour background, no ground art.
- Hidden grid appears only during drag or tile tool, fades in/out.
- Buildable zone: start 10×10 at origin, plus a 6-cell ring around all tiles.
- Max world 256×256. Camera clamped to land bounds + margin.
- Tile types: grass, land, water. Sparse cells keyed `"x,z"`.
- `Cell { x, z, type, level }`; max stack 8; all tiles in a column share a type.
- Top surface Y = `level * tileThickness`.
- Paint: click/drag empty cell → level 1; existing cell → change type. Dig up removes
  one level; blocked under an item unless the new type is allowed.
- Tile popover: change type (disallowed disabled), height slider within dynamic
  range, dig up.
- Water rule: each of a water cell's sides must be ground at level ≥ L, water at
  L−1/L/L+1 (`waterMaxStep`), or empty when L = 1.
- Slider range:
  - Ground: max `maxStack`, min `max(1, highest adjacent water level)`.
  - Water: max `min(maxStack, lowest adjacent ground, lowest adjacent water + 1)`
    (1 if any side is empty), min `max(1, highest adjacent water − 1)`.

## Items and placement

- `ItemDef`: id, name, category, price, footprint, defaultTile, allowedTiles,
  connectable, rotatable, model, thumb, emissive, optional capped point light.
- Drag flow: pointer down on card/inventory → edit mode on → raycast to cell →
  grid fades in → ghost snaps and faces camera → footprint highlight valid/invalid
  with colour **and** icon plus HUD reason → `R` rotates, `Tab` cycles auto tile,
  `Esc` cancels → release places or cancels.
- On bare ground show the item plus its auto tile (`defaultTile`, level 1).
- Placement validation: inside zone/world cap, unoccupied, tile allowed or empty,
  all footprint cells same level (empty = level 1), auto tile cannot break water.
- Item popover: move, rotate (not for connectables), change tile, height slider,
  store, sell with confirm.
- Connectables (fences, paths, hedges): post + arm meshes; arm points to each
  same-id neighbour; recompute self and 4 neighbours; rotation disabled. Logic in
  `logic/connect.ts`.

## Camera

- 360° orbit; polar 20°–80°; zoom clamped; target clamped to land + margin.
- Orbit: right-drag, Q/E snap 90°, PageUp/PageDown tilt.
- Pan: middle-drag or Shift+right-drag, WASD/arrows.
- Zoom: wheel, +/-. Home: button or H. Left click reserved for select/place/paint.
- Snaps/Home 300 ms ease-in-out. `R` rotates item clockwise from above.

## Day/night

- Local time by default, manual override in settings.
- Four keyframes (dawn/day/dusk/night) blended continuously.
- Materials prefixed `EMIT_` become emissive at night. Optional point lights capped
  at 8 nearest to camera. Optional subtle bloom, off on low quality.

## Motion

Drop/dig/tile fades 120 ms; wallet 400 ms; grid 150 ms; ghost instant or ≤60 ms;
panels 150–200 ms; camera 300 ms; day/night continuous. Respect
`prefers-reduced-motion` (all transitions removed except instant camera moves).

## Feedback and accessibility

- Invalid: red ghost/footprint + icon + HUD reason.
- Disabled options greyed out with reasons where useful.
- Colour is never the only signal. Visible focus states. Keyboard shortcuts.
- Placement errors go to the HUD, not toasts.

## Assets

- Blender via Python, one script per asset, `export_all.py`, `render_thumbs.py`.
- 1 unit = 1 cell; origin at footprint centre at ground level; front faces −Y.
- Apply transforms; soft/bevelled low-poly; shared palette; emissive materials
  prefixed `EMIT_`.
- Tiles export separate `top` and `side` meshes (1 × thickness × 1); render only
  exposed sides, instanced per type/part in 16×16 chunks. Water is transparent,
  `depthWrite: false`, drawn after opaque.
- Dev-only asset review gallery.

## Misc

- Confirm dialogs: sell, delete task, reset world.
- Floating music player: ambience/music, on/off default on and low, volume.
- Settings: graphics quality, focus/Pomodoro defaults, time-of-day override, reset.
- Help sheet with shortcuts; tutorial on demand only (never auto-start), five steps.
- Save shows Continue when present; reset world in settings.

## Shortcuts

`N` focus quick-add · `R` rotate item · `Tab` cycle tile · `Esc` cancel ·
`1` paint · `2` dig · `Q`/`E` camera 90° · PageUp/PageDown tilt · WASD/arrows pan ·
`+`/`−` zoom · `H` home · Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y undo/redo · `?` help.

## Out of scope

Accounts/cloud sync, mobile/touch, pre-filled tasks.
