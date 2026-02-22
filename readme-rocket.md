# 🚀 Checklist Rocket — How It Works

A multiplayer morning-checklist game built with [Phaser 3](https://phaser.io/) and the Web Audio API. Players tick off items on their checklist to assemble a robot piece by piece, then blast it off into space.

---

## File Structure

| File | Purpose |
|---|---|
| [`checklist-rocket.html`](checklist-rocket.html) | HTML shell, CSS styles, `CONFIG` object, and DOM layout |
| [`checklist-rocket-game.js`](checklist-rocket-game.js) | All game logic: audio, UI, Phaser scene, robot drawing |

---

## Configuration

At the top of [`checklist-rocket.html`](checklist-rocket.html) there is a `CONFIG` block you can edit to customise the game:

```js
const CONFIG = {
  title: '☀️ Morning Checklist',
  items: [
    { name: 'Breakfast',     emoji: '🍳' },
    { name: 'Brush Teeth',   emoji: '🦷' },
    // … add or remove items here
  ],
};
```

Each `items` entry needs a `name` (displayed in the checklist) and an `emoji` (shown as an icon).

---

## Architecture Overview

```
checklist-rocket.html
│
├── CONFIG            ← editable checklist items & title
├── #setup            ← player-count picker screen
├── #game             ← game screen (title bar + canvas + overlay)
│   ├── #pc           ← Phaser canvas container
│   └── #ov           ← HTML checklist overlay (sits on top of canvas)
└── #wb               ← "BLAST OFF!" win banner
```

---

## Screens & Flow

### 1. Setup Screen (`#setup`)
- Animated starfield background (120 CSS `div` stars with a `tw` keyframe twinkle).
- `−` / `+` buttons adjust player count (1–6), stored in `numP`.
- **LAUNCH GAME** calls [`startGame()`](checklist-rocket-game.js:92).

### 2. Game Screen
[`startGame()`](checklist-rocket-game.js:92) does three things:
1. Hides `#setup`, shows `#game`.
2. Builds the **game state** object `GS` — one entry per player with their colour, checked-item array, and build progress.
3. Calls [`buildUI()`](checklist-rocket-game.js:113) and [`initPhaser()`](checklist-rocket-game.js:153).

### 3. Win / Blast-Off
When a player's rocket flies off the top of the screen, [`checkWin()`](checklist-rocket-game.js:557) fires: the `#wb` banner appears, fireworks spawn, and a win jingle plays.

---

## Checklist UI (`buildUI` / `onTick`)

[`buildUI()`](checklist-rocket-game.js:113) dynamically creates the HTML overlay:
- One column (`.pcol`) per player, coloured with that player's accent colour.
- Each checklist item is a `.ci` row containing a checkbox div (`.cb`), emoji, and name.
- Clicking a row calls [`onTick(pi, ii)`](checklist-rocket-game.js:133) where `pi` = player index, `ii` = item index.

[`onTick()`](checklist-rocket-game.js:133):
1. Marks the item checked (one-way — items cannot be unchecked).
2. Plays the `tick` sound.
3. Adds the `.ck` class to the row (strikethrough + green checkbox glow).
4. Maps the item index to one of the **9 robot parts** using:
   ```js
   partIdx = Math.min(Math.floor(itemIdx * 9 / total), 8)
   ```
   This spreads checklist items evenly across the 9 parts regardless of how many items there are.
5. Emits `addPart` to the Phaser scene.
6. If all items are checked, emits `launch` after a 700 ms delay.

---

## Robot Parts

The robot is assembled from 9 named parts in order:

| Index | Name | Label |
|---|---|---|
| 0 | `lFoot` | Left Foot |
| 1 | `rFoot` | Right Foot |
| 2 | `lLeg` | Left Leg |
| 3 | `rLeg` | Right Leg |
| 4 | `torso` | Torso |
| 5 | `lArm` | Left Arm |
| 6 | `rArm` | Right Arm |
| 7 | `head` | Head |
| 8 | `pack` | Rocket Pack! |

Each part is drawn procedurally in [`drawRobot()`](checklist-rocket-game.js:332) using Phaser's `Graphics` API. The robot scales to fit its column width and the canvas height via:

```js
const sc = Math.min(1.0, colW / 200, (height * 0.55) / 220);
```

When the rocket pack is present and the robot is launching, the torso LEDs, visor eyes, and antenna light flash on a 200 ms timer (`flashOn` toggle).

---

## Phaser Scene (`GameScene`)

Defined in [`checklist-rocket-game.js`](checklist-rocket-game.js:170) as a single Phaser 3 scene.

### Graphics layers (by depth)

| Depth | Object | Content |
|---|---|---|
| 0 | `bgG` | Starfield + moon + nebula clouds |
| 2 | `gndG` | Ground strip with grid lines |
| 3 | `padG` | Per-player launch pads |
| 9 | `rob.exGfx` | Exhaust flames (per robot) |
| 10 | `rob.gfx` | Robot body (per robot) |
| 25 | firework `Graphics` | Firework particles |
| 30 | float labels | "+ Left Foot" floating text |
| 40 | countdown / liftoff text | "3 2 1 LIFTOFF!" |

### `create()`
- Generates 200 star objects with random positions, radii, phases, and speeds.
- Creates all graphics layers and robot state objects.
- Listens for `addPart` and `launch` events from the HTML layer.
- Registers a `resize` handler to redraw everything when the window resizes.

### `update(t, dt)`
Each frame (delta-time normalised to 16 ms):
- Redraws the background every 120 ms (star twinkle animation).
- Advances and fades floating part-label text.
- Applies camera shake (decays each frame).
- For each launching robot: applies upward acceleration (`vy -= 0.45`), updates `offsetY`, redraws the robot and exhaust, and marks it `gone` once it clears the top 65% of the screen.

### Launch sequence (`doLaunch`)
[`doLaunch(pi)`](checklist-rocket-game.js:524):
1. Counts down 3 → 2 → 1 with large yellow text (950 ms intervals, tween-faded).
2. On zero: plays the `launch` sound, sets `rob.launching = true`, triggers a large camera shake, and shows "LIFTOFF!" text.

### Exhaust flames (`drawExhaust`)
[`drawExhaust(pi)`](checklist-rocket-game.js:484) draws three layered triangles per nozzle (outer orange → mid yellow → white core) with sinusoidal flicker. A ground-blast ellipse fades out as the rocket rises.

### Fireworks (`spawnFireworks`)
[`spawnFireworks()`](checklist-rocket-game.js:571) spawns up to 12 burst events. Each burst creates 16–28 particles that spread outward, slow down, fall under simulated gravity, and fade over 50 frames (~800 ms). Particles leave short trails.

---

## Audio Engine (`SFX`)

A self-contained IIFE in [`checklist-rocket-game.js`](checklist-rocket-game.js:4) using the Web Audio API. The `AudioContext` is created lazily on first use (required by browser autoplay policy).

| Method | Sound | Used when |
|---|---|---|
| `SFX.tick()` | Two-tone sine blip | Item checked / game started |
| `SFX.part()` | Three-note square chord | Robot part added |
| `SFX.complete()` | Four-note ascending sine arpeggio | All items checked |
| `SFX.launch()` | White noise + descending sawtooth rumble (3 s) | Rocket lifts off |
| `SFX.win()` | Seven-note sine fanfare | Rocket leaves screen |

Helper functions inside `SFX`:
- **`T(freq, type, duration, volume, delay)`** — schedules a single oscillator tone with a fast attack and exponential decay.
- **`N(duration, volume, delay)`** — generates a white-noise buffer for the rocket rumble.

---

## Colours

Up to 6 players are supported, each assigned a colour from [`COLS`](checklist-rocket-game.js:56):

| Player | Hex | CSS |
|---|---|---|
| 1 | `0x4488ff` | `#4488ff` (blue) |
| 2 | `0xff4466` | `#ff4466` (pink) |
| 3 | `0x44ff88` | `#44ff88` (green) |
| 4 | `0xffaa22` | `#ffaa22` (orange) |
| 5 | `0xcc44ff` | `#cc44ff` (purple) |
| 6 | `0x22ddff` | `#22ddff` (cyan) |

Each colour is used for the player's checklist panel border, robot body, launch pad stripe, and floating labels.

---

## Customisation Tips

- **Change checklist items** — edit the `CONFIG.items` array in [`checklist-rocket.html`](checklist-rocket.html). Any number of items will be spread evenly across the 9 robot parts.
- **Change the title** — edit `CONFIG.title`.
- **Add more players** — increase the upper bound in [`checklist-rocket-game.js:84`](checklist-rocket-game.js:84) (`if(numP<6)`) and add more entries to `COLS`.
- **Adjust robot scale** — the `sc` calculation in [`drawRobot()`](checklist-rocket-game.js:344) controls how large the robot is relative to its column.
