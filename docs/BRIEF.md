# Evergrow — Project Brief

## 1. Project
**Name:** Evergrow
A to-do list meets cozy world-building.
**Platform:** Desktop browser web app (no mobile, no touch for the demo).
**Type:** Demo. Single player. Local-only data.

**Vision**
Evergrow turns your progress into a cozy little world. Every task you complete earns coins for plants, buildings and decorations — even tiny tasks count. Little by little, your world grows, and so do you.
Big goals take a long time. When learning something new, building something from scratch or working toward a dream, it's easy to feel like you're standing still. Each task finished, big or small, adds something new. Day by day, the world fills in — a reminder that you've been growing all along.
**Principle:** growth happens little by little, one small step at a time. Your world grows as you do.

### Design tone
- Cozy, warm, calm, minimal.

### References
Inspired by cozy 3D sandbox builders.

---

## 2. Tech stack
Vite
React + TypeScript
Zustand
Three.js
React Three Fiber (R3F)
@react-three/drei
Vitest
Blender + Python for asset creation (see §11)
localStorage

### Fonts
Use the font files in `public/assets/fonts/` (title, heading and body fonts are set in config, §14).

### Setup
```bash
npm create vite@latest evergrow -- --template react-ts
cd evergrow
npm install zustand three @react-three/fiber @react-three/drei
npm install -D @types/three vitest
npm run dev
```

### Architecture rules
1. **Logic is separate from rendering.** All world rules (grid, cells, stacking, footprints, validation, economy) live in pure TypeScript modules with no Three.js or React imports. Rendering reads state and draws it.
2. **All configurable values live in one file:** `src/config/evergrow.config.ts` (see §14). No hard-coded numbers elsewhere.
3. **All world mutations go through a command system** (`place`, `move`, `rotate`, `remove`, `paint`, `setLevel`, `digUp`) so undo/redo works uniformly.
4. **Never store absolute Y positions.** Y is always derived: `level × tileThickness`.
5. **Pure logic has unit tests** (Vitest) before it is wired to rendering.

### Suggested folder structure
```
src/
  config/evergrow.config.ts      # every tunable value + item & tile catalog
  logic/                         # pure TS, fully tested
    grid.ts                      # coords, keys "x,z", bounds, buildable zone
    cells.ts                     # tile columns, levels, water rules
    footprint.ts                 # footprint + rotation math
    placement.ts                 # validation, invalid reasons
    connect.ts                   # fence/path neighbour linking
    economy.ts                   # rewards, prices, refunds
    focus.ts                     # timer state machines
    commands.ts                  # command pattern + undo/redo
    save.ts                      # serialize / deserialize / schema version
  store/                         # Zustand slices
    tasks.ts  economy.ts  world.ts  inventory.ts  focus.ts  ui.ts
  scene/                         # R3F components
    World.tsx  Ground.tsx  TileChunks.tsx  Items.tsx  Ghost.tsx
    GridOverlay.tsx  CameraRig.tsx  Lighting.tsx  DayNight.tsx
  ui/                            # React DOM UI
    TopBar  TaskPanel  TaskDetail  FocusOverlay  ShopDrawer
    InventoryTray  PlacementHUD  ItemPopover  TilePopover
    SettingsModal  HelpSheet  Tutorial  Toasts  ConfirmDialog  StartScreen
  assets/                        # loaders, thumbnail cache
public/
  assets/
    models/*.glb
    thumbs/*.png
    fonts/
assets-src/
  blender/*.py                   # one bpy script per asset + export_all.py
```

---

## 3. Core loop

1. User creates tasks (optionally with subtasks).
2. User completes tasks / subtasks or finishes focus sessions → earns coins.
3. User buys items from the shop with coins → items go to inventory.
4. User drags items from shop or inventory into the 3D world → hidden grid appears, ghost preview snaps to cells → release places the item.
5. Repeat.

**Starting state:** empty world (one-colour background), 0 coins, empty task list, **1 starter item** in inventory.


---


## 4. Features

### 4.1 Tasks
- **CRUD:** quick-add bar (Enter to add), edit, delete (confirm), complete.
- **Size tag:** Tiny / Small / Medium / Big → sets coin reward (config).
- **Notes** field (optional).
- **Subtasks:**
  - Add, complete, reorder, delete.
  - Each completed subtask pays a share: `parentReward × subtaskShare ÷ subtaskCount` (rounded, config).
  - Completing all subtasks prompts "Complete task?" → parent pays the remainder.
  - **Ticking the parent auto-ticks all remaining subtasks and pays the full amount:** total earned for the task always equals `parentReward`, whichever order things are ticked (already-paid subtask shares + everything still unpaid).
- **Undo complete:**
  - Subtask undo: reverses that subtask's share.
  - Parent undo: unticks the parent **and the subtasks it auto-ticked** (subtasks ticked manually before stay ticked); reverses exactly the coins that parent tick paid.
- **Filters:** Today / All / Completed.
- Coins can't go negative.

### 4.2 Focus sessions
User picks between two modes:
- Focus session: Timer, optional target time. `coinsPerBlock` per completed block (default 5 min). Minimum session length to earn (default 5 min).
- Pomodoro: Focus/break cycles. Default 25 / 5, long break 15 every 4 cycles. All adjustable. `coinsPerBlock` per completed focus block.

- Optional link to a task. If linked to a task, show the task and its subtasks and checkboxes below the timer.
- Controls: Pause, Resume, End. Pomodoro: Skip break.
- Ending early pays only for completed blocks.
- Session complete screen: minutes focused, coins earned, "Mark task done?" if linked.
- Running session can be minimised to a chip or small time in the top bar.
- Timer must be accurate when the tab is in the background (compute from timestamps, not interval counts).

### 4.3 Economy
- Coins always visible in top bar.
- Coin change animation: count up/down over `coinCountUpMs` (≈400ms).
- Tiles cost 0 coins.
- Sell item: refund 100% of item price.
- Store: item returns to inventory, no coin change.

### 4.4 Shop
- Bottom drawer, collapsible.
- Categories: one for tiles (ground and water), others to be decided after deciding the item list.
- Item card: thumbnail, name, price, footprint icon (e.g. 2×2).
- Unaffordable items: visible, greyed out, disabled. show "Need N more".
- Bought item added to inventory. Can drag directly from shop card (buys on successful drop; cancelled drop = no charge).
- Use placeholder shop cards until the item list is decided.

### 4.5 Inventory
- Tray showing owned, unplaced items with counts.
- Drag into the world to place.

### 4.6 World
- **Background:** one flat colour. No ground plane art.
- **Hidden grid:** only visible while dragging an item or using a tile (ground & water tool). Fades in/out.
- **Buildable zone:** start zone 10×10 centred at origin, plus a ring of **6 cells** around all existing tiles. Placing at the edge extends the zone.
- `world.maxSize`: 256×256 cells.
- **Camera bounds:** bounding box of land + margin. User cannot pan away and get lost.

### 4.7 Edit mode
- View mode: camera only, hover over items/tiles does nothing.
- Edit mode turned on through toggle in top bar (View/Edit) or through clicking on items.
- Click opens popovers

### 4.8 Undo / redo
- `Ctrl+Z` / `Ctrl+Shift+Z` (and `Ctrl+Y`).
- Covers world commands only (place, move, rotate, remove, paint, setLevel, digUp, sell, store).
- Task completion has "Undo complete" (§4.1).

### 4.9 Save
- Autosave to localStorage after every change (debounced ~500ms).
- Save includes: tasks, subtasks, coins, inventory, cells, placed items, settings, focus defaults.
- Save has `schemaVersion`; loader migrates older versions.
- Compact format (arrays, short keys). If save exceeds ~2MB, log a warning (future: IndexedDB).
- Start screen shows **Continue** if a save exists.
- Settings → Reset world (confirm).

---

## 5. Tiles

### 5.1 Tile types
`grass`, `land`, `water`

### 5.2 Cell data
Each cell is one tile type stacked to a level. All tiles in a column share the same type.
```ts
type TileType = "grass" | "land" | "water";
interface Cell { x: number; z: number; type: TileType; level: number } // level 1..maxStack
```
- Stored sparsely, keyed `"x,z"`.
- **Max stack:** `world.maxStack` = 8.
- Top surface Y = `level × tileThickness`.

### 5.3 Placing and editing tiles
**Tile tab tools:**
- Paint: Click/drag on empty cell. New tile at level 1. On existing cell, user can change the column's tile type.
- Dig up: Click/drag to remove one level. At level 1 cell removed.
- Keys: `1` Paint, `2` Dig up, `Esc` exit tool.
- Tiles are free.
- Dig up is blocked under an item ask user to store or move the item first
- Paint for tile type change under an item is allowed only if the new type is in the item's `allowedTiles`.

**Tile popover**:
- **Change type:** all 3 types shown; disallowed ones greyed out and disabled.
- **Height slider:** dragging up adds tiles of the same type; dragging down removes them. Range is dynamic (§5.5).
- **Dig up** button.

### 5.4 Water rules
- For a water cell at level `L`, **each of its 3 adjacent sides** must be one of:
  - ground (any non-water type) at level ≥ `L`
  - water at level `L − 1`, `L`, or `L + 1` (`world.waterMaxStep` = 1)
  - empty (no cell) — only if `L = 1`
- Any ground change that would break a neighbour's water rule is blocked or range-limited.

### 5.5 Height slider range (dynamic)
Computed per cell from rules, never hard-coded:

- **Ground cell:**
  - max = `maxStack`
  - min = max(1, highest adjacent water level)
- **Water cell:**
  - max = min(`maxStack`, lowest adjacent ground level, lowest adjacent water level + 1); if any side is empty, max = 1
  - min = max(1, highest adjacent water level − 1)

---

## 6. Items and placement

### 6.1 Item metadata (in config catalog)
```ts
interface ItemDef {
  id: string;
  name: string;
  category: string;            
  price: number;
  footprint: [w: number, d: number];
  defaultTile: TileType;
  allowedTiles: TileType[];
  connectable: boolean;       // fences, paths, hedges
  rotatable: boolean;         // false for connectable items
  model: string;               // "assets/models/cottage.glb" (relative, no leading slash)
  thumb: string;               // "assets/thumbs/cottage.png" (relative, no leading slash)
  emissive: boolean;          // has EMIT_ materials
  pointLight?: { color: string; intensity: number; distance: number }; // optional, capped
}
interface PlacedItem { uid: string; id: string; x: number; z: number; rot: 0|1|2|3 }
```

### 6.2 Drag-to-place flow
1. Pointer down on a shop card or inventory item → `dragState` set in Zustand; Edit mode on.
2. Pointer moves over the canvas → raycast from cursor against tile chunk meshes (or level plane for empty cells) → derive cell `(x, z)`.
3. **Grid lines fade in** around the cursor area.
4. **Ghost preview** (semi-transparent model) appears at the snapped cell, **spawned facing the camera**.
   - Ghost moves cell-to-cell instantly (or ≤60ms lerp). No wobble.
5. **Footprint highlight** under ghost:
   - Valid → neutral/green tint.
   - Invalid → **red ghost + red footprint** + reason in Placement HUD.
   - Colour plus an icon (not colour alone).
6. On bare ground the ghost shows the item **plus its auto tile** (`defaultTile`, level 1).
7. While dragging: `R` rotates 90° clockwise; `Tab` cycles the auto tile through `allowedTiles`; `Esc` cancels.
8. Pointer up:
   - Valid → item placed; ghost fades to solid over 120ms. Auto tile created if needed. Coins charged if dragged from shop.
   - Invalid → nothing happens; drag ends.
9. Grid lines fade out.

### 6.3 Placement validation
All must pass:
- Every footprint cell is within the buildable zone and world cap.
- No footprint cell is occupied by another item.
- Every footprint cell is either empty (auto tile will be created) or has a top tile in `allowedTiles`.
- All footprint cells are at the **same level** ("Uneven ground"). Empty cells count as level 1 (auto tile).
- Auto tile creation must not violate water rules.

### 6.4 Item popover (click item in Edit mode)
- **Move** (re-enters drag with this item)
- **Rotate** (90° clockwise; hidden for connectable items)
- **Change tile** (types not in `allowedTiles` greyed out and disabled)
- **Height** slider (moves the whole footprint's cells together)
- **Store** (to inventory)
- **Sell** (shows refund amount, confirm dialog)

### 6.5 Connectable items (fences, paths, hedges)
- Model as **2 meshes:** `post` (centre) and `arm` (half-cell rail pointing +Z).
- Each connectable cell checks its 4 neighbours (N/E/S/W). For each neighbour of the **same item id**, show an arm rotated toward it.
- Placing/removing a connectable item recomputes itself and its 4 neighbours.
- Rotation disabled (`rotatable: false`).
- Logic lives in `logic/connect.ts`, tested.

---

## 7. Camera

- 360° orbit around a target point.
- **Vertical angle clamped** 20°–80° (`camera.minPolarDeg` / `maxPolarDeg`). Never below ground, never flipped.
- Zoom clamped (`camera.minZoom` / `maxZoom`).
- Target clamped to land bounds + margin.

Actions
- Orbit: Right-drag, `Q` / `E` (snap 90°), `PageUp` / `PageDown` (tilt) keys
- Pan: Middle-drag or Shift + right-drag, WASD / arrow keys
- Zoom: Wheel, `+` / `−` key
- Home (recentre + reset angle & zoom): Home button, `H` key

- Left click is reserved for select / place / paint.
- Camera snaps and Home transition: 300ms ease-in-out.
- `R` always rotates the item 90° clockwise (viewed from above); camera-relative rotation is not needed.

---

## 8. Day / night

- Follows the user's local time by default. Settings has a manual override (slider or presets) for demos.
- **4 keyframes** (dawn, day, dusk, night — hours in config), blended continuously
- **Emissive parts:** materials named with prefix `EMIT_` (e.g. `EMIT_window`, `EMIT_flame`). At load, collect them; set `emissiveIntensity` = night factor (0 day → 1 night). One asset, not two versions.
- Optional real point lights on a few items (lamp post, campfire), capped at `rendering.maxPointLights` = 8 (nearest to camera win).
- Optional subtle bloom (`@react-three/postprocessing`) — only if it stays subtle; off on low quality.

---

## 9. Motion rules
- Item drop: 120ms fade from ghost opacity to solid
- Dig up (item or tile): 120ms fade from solid to transparent, then removed
- Coin wallet: Count up/down over ~400ms.
- Grid lines: 150ms fade in/out
- Ghost: Instant cell-to-cell or ≤60ms lerp
- Tile added via slider: 120ms fade in
- Panels, drawers, popovers: 150–200ms fade/slide, ease-out
- Camera snap / Home: 300ms ease-in-out
- Day/night: Continuous slow blend

No bounce, scale pop, shake, particles, confetti, sparkle, pulse, coin bursts, flying coins.
Respect `prefers-reduced-motion`. Remove all transitions except camera moves (which become instant).

---

## 10. Invalid / disabled feedback
- Placing items or tiles: Red ghost + red footprint + reason in Placement HUD
- Menu options, tile types: Greyed out, disabled
- Sliders: Range limited to allowed values
- Unaffordable shop items: Greyed out, disabled, "Need N more"
- Blocked actions (e.g. undo complete): Disabled + reason

---

## 11. Assets

### 11.1 Pipeline
- Create assets in Blender via Python (`bpy`) scripts.
- One script per asset in `assets-src/blender/`
- `export_all.py` builds every asset and exports `.glb` to `public/assets/models/`.
- `render_thumbs.py` renders shop thumbnails to `public/assets/thumbs/` (fixed camera, fixed lighting, transparent background, consistent framing).

### 11.2 Conventions
- 1 Blender unit = 1 grid cell.
- Origin at the centre of the footprint, at ground level (bottom of the model).
- Front faces −Y in Blender (exports to +Z in three.js).
- Apply all transforms before export.
- Flat or soft shading, rounded/bevelled edges, soft proportions.
- Use shared palette/material library for every asset.
- Glowing parts use materials prefixed `EMIT_`.
- Build an **asset review gallery** page (dev only) showing every asset side by side for style consistency checks.

### 11.3 Tile assets
- Each tile type is exported as **separate meshes**: `top` and `side`, sized 1 × tileThickness × 1.
- Renderer builds columns: top mesh at the top level only, side meshes only on **exposed** sides per level.
- Use `InstancedMesh` per (tile type × part), grouped in 16×16 chunks.
- Water: semi-transparent material, `depthWrite: false`, rendered after opaque geometry.

### 11.4 Item list (26 items)
Items and allowed tile types to be decided.
Price tiers (guide): small plants 5–15 · larger plants/props 20–40 · buildings 60–200 · decor 50-100. All prices live in config.

---

## 12. Others
1. **Confirm dialogs** — sell item, delete task, reset world.
2. Floating music player: ambience (default) or music, sound on/off (default on, low volume), volume
3. **Settings modal**: graphics quality, default focus & Pomodoro lengths, time-of-day (local time / manual override), reset world.
4. **Help / shortcuts sheet**: camera, placement, task shortcuts; **Tutorial** button.
5. **Tutorial overlay** (on demand only — never auto-starts)
   1. "Drag your item into the world" (item to be decided, if set as empty in config file do this step after step 5 "visit the shop")
   2. "Add a task"
   3. "Complete it to earn coins"
   4. "Try a focus session"
   5. "Visit the shop"
   - Each step advances when the user actually performs it. Exit anytime.
6. Placement errors go in the HUD, not toasts.

### Accessibility
- Invalid states use colour + icon/text, never colour alone.
- Keyboard shortcuts for camera and placement.
- Respect `prefers-reduced-motion`.
- Visible focus states on all UI controls.

---

## 13. Keyboard shortcuts (summary)

| Key | Action |
|---|---|
| `N` | Focus quick-add task bar |
| `R` | Rotate item 90° clockwise (while dragging) |
| `Tab` | Cycle auto tile type (while dragging) |
| `Esc` | Cancel drag / exit tool / close popover |
| `1` / `2` | Paint / Dig up tool |
| `Q` / `E` | Rotate camera 90° |
| `PageUp` / `PageDown` | Tilt camera |
| WASD / arrows | Pan |
| `+` / `−` | Zoom |
| `H` | Home (recentre + reset view) |
| `Ctrl+Z` / `Ctrl+Shift+Z` / `Ctrl+Y` | Undo / redo |
| `?` | Help sheet |

---

## 14. Config file

All tunable values live in `src/config/evergrow.config.ts`. This is the list of settings it holds; the exact names and values are defined in the code.

- **fonts:** title (app name only), heading, body
- **economy:** taskReward, subtaskShare, tileCost, allowNegativeCoins
- **focus**
  - free: coinsPerBlock, blockMinutes, minMinutes
  - pomodoro: focusMin, shortBreakMin, longBreakMin, cyclesBeforeLong, coinsPerBlock
- **world:** maxSize, startZone, buildableRing, maxStack, tileThickness (fixed), waterMaxStep, chunkSize, cameraBoundsMargin
- **camera:** minPolarDeg, maxPolarDeg, minZoom, maxZoom, snapRotateDeg, transitionMs, panSpeed, rotateSpeed, zoomSpeed
- **motion:** dropFadeMs, digUpFadeMs, tileAddFadeMs, coinCountUpMs, gridFadeMs, panelMs, ghostLerpMs, ghostOpacity
- **dayNight:** useLocalTime, keyframes (dawn, day, dusk, night)
- **rendering:** shadowMapSize, maxPointLights, pixelRatioCap, quality (high or low), bloom
- **variation:** scale, hue
- **ui:** toastMs, autosaveDebounceMs
- **starter:** coins, items
- **palette:** shared colours (background per time of day, valid/invalid tint, UI)
- **tiles:** grass ("Grass"), land ("Land"), water ("Water", transparent)
- **items:** the item catalog (name, category, footprint, allowedTiles, price; see §6.1)
- **strings:** invalid-reason messages
- **saveSchemaVersion:** 1

---

## Out of scope

Accounts / cloud sync · mobile / touch · pre-filled tasks.