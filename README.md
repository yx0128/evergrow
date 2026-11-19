<div align="center">

# Evergrow

**To-do list meets cozy world-building.**

[![Deploy](https://github.com/yx0128/evergrow/actions/workflows/deploy.yml/badge.svg)](https://github.com/yx0128/evergrow/actions/workflows/deploy.yml) · [Live demo](https://yx0128.github.io/evergrow/) · [Report a bug](https://github.com/yx0128/evergrow/issues) · [Request a feature](https://github.com/yx0128/evergrow/issues)

<!-- Screenshot: add once the world renders -->

</div>

> **Project docs:** [brief](docs/BRIEF.md) · [progress](docs/PROGRESS.md) · [decisions](docs/DECISIONS.md) · [architecture](docs/ARCHITECTURE.md) · [build state](docs/STATE.md)


---

## Table of contents

- [About](#about)
- [How it works](#how-it-works)
- [Features](#features)
- [Who it's for](#who-its-for)
- [Mission](#mission)
- [Built with](#built-with)
- [Getting started](#getting-started)
- [Deployment](#deployment)
- [Usage](#usage)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgements](#acknowledgements)

## About

Whether you're chasing a big dream or just trying to get through the day, some days it can feel like you're standing still.

Evergrow turns your progress into a cozy little world. Every task you complete earns coins to build with. Bit by bit, your world grows, and before you know it, you've gotten a lot done and come a step closer to where you want to be.

## How it works

1. **Add your tasks.** Big, small or tiny, they all count.
2. **Check them off.** Every completed task earns you coins.
3. **Grow your world.** Spend your coins on plants, buildings and decorations.
4. **Look back.** Your world becomes a reminder of everything you've done.

> **Note:** The features below are planned. The current build shows a full-window canvas.
> The world rules exist as tested logic but are not playable yet.

## Features

### Tasks
- Add tasks in seconds with the quick-add bar.
- Tag each task as Tiny, Small, Medium or Big. Bigger tasks earn more coins.
- Break tasks into subtasks. Each subtask earns its share as you go.

### Focus sessions
- **Focus session:** an open timer that earns coins for every block of focused time.
- **Pomodoro:** focus and break cycles with adjustable lengths.

### Your world
- Start with an empty space and build it any way you like.
- Place items from the shop or your inventory into the world.
- Your buildable space grows as you build outwards.
- Shape your land with grass, land and water tiles. Water is a styled block, not liquid.
- Changed your mind? Store items back in your inventory or sell them for a full refund.
- Orbit the world 360°, tilt, zoom and pan with the mouse or keyboard.
- Lighting follows your local time, from warm mornings to quiet nights.

### Cozy by design
- Calm and minimal.
- Ambient sounds and music, with a floating player.
- Keyboard shortcuts for everything, and support for reduced-motion settings.

## Who it's for

Anyone who finds plain to-do lists hard to stick with and wants something warmer to come back to.

## Mission

Growth happens little by little, one small step at a time. Evergrow's goal is to make that growth visible, so that on days when it feels like nothing is changing, you can look at your world and see how far you've come.


## Built with

- [Vite](https://vitejs.dev/)
- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Zustand](https://zustand-demo.pmnd.rs/)
- [Three.js](https://threejs.org/)
- [React Three Fiber](https://r3f.docs.pmnd.rs/) + [drei](https://drei.docs.pmnd.rs/)
- [Vitest](https://vitest.dev/)
- [Blender](https://www.blender.org/) (Python-scripted 3D assets)

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 26 (see `.nvmrc`), and npm
- A desktop browser with WebGL support (Chrome, Edge, Firefox or Safari)
- [Blender](https://www.blender.org/download/) 5.3 (only needed if you want to regenerate the 3D assets)

### Installation

1. Clone the repo:
   ```bash
   git clone https://github.com/yx0128/evergrow.git
   cd evergrow
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Open the local address shown in the terminal (usually `http://localhost:5173`).

### Other commands

| Command | What it does |
|---|---|
| `npm run build` | Builds the app for production into `dist/` |
| `npm run preview` | Serves the production build at http://localhost:4173/evergrow/ |
| `npm test` | Runs the test suite once |
| `npm run test:watch` | Runs tests in watch mode |
| `npm run coverage` | Reports test coverage |
| `npm run lint` | Runs oxlint |
| `npm run typecheck` | Checks TypeScript types |

### Configuration

Every tunable value is in one file: `src/config/evergrow.config.ts`. That includes coin rewards, prices, focus lengths, world size, camera limits, animation timings, colours and the item list.

## Deployment

- `.github/workflows/deploy.yml` runs on every push to `main` and on manual dispatch: `npm ci` → `npm run lint` → `npm test` → `npm run build` → deploy. A lint or test failure stops the deploy.
- Production builds use `base: "/<repo>/"` derived from `GITHUB_REPOSITORY`. `VITE_BASE_PATH` overrides the base everywhere; otherwise local dev uses `/`.
- Build every public asset URL with `assetUrl()` and keep catalog paths relative.
- Every localStorage key goes through `storageKey()`.
- `public/404.html` redirects unknown paths to the project root while keeping the query and hash.
- See [D004–D006](docs/DECISIONS.md).

## Usage

1. **Place your first item.** Open the inventory, drag your starter item into the world, and let go when the preview snaps into place.
2. **Add a task.** Press `N`, type a task, pick its size and press Enter. Add subtasks if it's a bigger one.
3. **Earn coins.** Tick off subtasks or the whole task, or start a focus session. Your coins count up in the top bar.
4. **Visit the shop.** Buy items. Items you can't afford yet are greyed out.
5. **Build.** Drag items into the world. Press `R` to rotate and `Tab` to change the tile underneath. A red preview means that spot isn't available, and the reason shows at the bottom of the screen.
6. **Shape the land.** Add tiles or dig them up. Click any tile to change its type or use the height slider to stack it higher.
7. **Look around.** Right-drag to orbit, scroll to zoom, and press `H` to return home.

Press `?` at any time for all shortcuts, or start the tutorial from the help sheet.

## Roadmap

- [ ] Core task, coin and shop loop
- [ ] 3D world building with grid snapping
- [ ] Tile painting and stacking
- [ ] Focus session and Pomodoro modes
- [ ] Day/night lighting
- [ ] Full item collection
- [ ] Streaks and recurring tasks
- [ ] Weather
- [ ] Progress stats
- [ ] Growth time-lapse
- [ ] Accounts and cloud sync
- [ ] Mobile and touch support

See the [open issues](https://github.com/yx0128/evergrow/issues) for the full list of planned features and known issues.

## Contributing

Ideas, feedback and contributions are welcome!

1. Fork the repo
2. Create a branch (`git checkout -b fix/your-change`)
3. Commit your changes (`git commit -m "Add your feature"`)
4. Push to the branch (`git push origin fix/your-change`)
5. Open a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch and commit rules.

## License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for details.

## Acknowledgements

- Inspired by cozy 3D sandbox builders.
- [pmndrs](https://github.com/pmndrs) for React Three Fiber, drei and Zustand.
- [Three.js](https://threejs.org/) and [Blender](https://www.blender.org/) communities.
<!-- Audio and font credits: add when the files are supplied -->
