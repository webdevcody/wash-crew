# Wash Crew

A first-person pressure washing game. Walk around a gray-box arena, blast the
stains off the walls and floor with your pressure washer, and win once every
stain is gone.

Built with [Three.js](https://threejs.org/) and [Vite](https://vitejs.dev/).

## Run it

```bash
npm install
npm run dev
```

Open the URL Vite prints and click **Click to play**.

## Controls

| Input | Action |
| ----- | ------ |
| W A S D / arrows | Move |
| Mouse | Look |
| Hold left click | Spray |
| Space | Jump |
| Shift | Sprint |
| Esc | Pause |

## How it works

- `src/level.js` builds the gray-box room, its colliders, and the stain spots.
- `src/stains.js` paints each stain procedurally on a canvas. Spraying erases
  dirt from the canvas and a 32x32 grid tracks how much is left, so a stain
  counts as clean once less than 6% of its dirt remains.
- `src/washer.js` is the held pressure washer and its water particles.
- `src/player.js` handles WASD movement, gravity, jumping and collisions.
- `src/main.js` wires it together: raycasts the jet into the scene each frame,
  scrubs any stain it hits, updates the HUD and shows the win screen.
- `src/audio.js` makes the spray hiss and chimes with Web Audio, no assets.

`window.__washCrew` exposes game state for debugging in the console.

## Performance check

`scripts/perf.cjs` is the headless benchmark used for the metrics table in PRs
(see the create-pull-request skill). Run `npm run build && npm run preview`,
then `node scripts/perf.cjs`.
