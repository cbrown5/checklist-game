# Plan: Checklist Robot — Tractor Beam Game

## Context
A new standalone checklist game where robot parts float in space. Each part has a checklist item label attached. Players aim a draggable reticle and fire a tractor beam to suck parts down to assemble a robot. At the end, the robot launches like in the rocket game.

Reuses patterns from `checklist-rocket.html` / `checklist-rocket-game.js` but is a fully self-contained Phaser 3 HTML file with no external JS files.

---

## New File
`checklist-robot.html`

---

## Source Files to Reference (do not modify)
- `checklist-rocket-game.js` — SFX engine, drawRobot (9-part blocks), drawExhaust, doLaunch, checkWin, spawnFireworks, COLS, star system
- `checklist-rocket.html` — CONFIG.items structure, CSS patterns, single-file HTML template

---

## Key Design Decisions
- **1 or 2 players** (selected at setup, max 2)
- **Floating parts**: slow drift + bounce off zone walls
- **Configurable checklist**: same CONFIG.items structure, same default morning routine
- **No HTML overlay**: entirely in Phaser canvas (SetupScene + GameScene)
- **Interaction**: drag reticle with pointer/touch → fire tractor beam → part flies to robot base

---

## Scene Structure

### SetupScene
- Animated starfield background
- Title: "🤖 Checklist Robot: Tractor Beam"
- `−` / `+` buttons to select 1 or 2 players
- `🤖 START GAME` button → builds GS object → `this.scene.start('GameScene')`

### GameScene
Everything in-canvas (no DOM overlay). Full flow:
1. Floating parts drift in zone space
2. Player drags reticle with touch/mouse
3. Press FIRE zone → beam charges (300ms) → locks nearest part within 80px → part arcs to base
4. Robot assembles; when all items collected, LAUNCH button appears
5. Same countdown → liftoff → fireworks as rocket game

---

## Layout

**1 player:** Full canvas. Robot base centered at bottom.

**2 players:** Canvas split vertically (left half = P1, right half = P2). Each half is independent — own parts, reticle, robot, FIRE zone. Thin divider line at center.

**Zone anatomy (per player):**
```
[ floating robot parts zone  ]  ← parts drift here (top 75%)
[  robot assembly base area  ]  ← robot builds here (bottom 25%)
[      FIRE BEAM button       ]
```

---

## State Objects

### GS (global game state)
```js
{
  N: 1|2,
  items: CONFIG.items,
  players: [{
    id, color, checked[], built, done, launched
  }]
}
```

### this.robs[pi]
Identical to rocket game fields + additions:
- `baseX`: center X of assembly area for this player
- `zone`: `{ x, w }` — player's canvas zone bounds

### this.floatingParts[pi]
Array of 9 part objects (one per robot part):
```js
{ partIdx, partName, label, itemIndices[],
  x, y, vx, vy, collected, attracting,
  attractT, attractSX, attractSY, glow }
```
Parts mapped same as rocket: `partIdx = Math.min(Math.floor(ii * 9 / total), 8)`

### this.beams[pi]
```js
{ state: 'idle'|'charging'|'firing'|'attracting'|'cooldown',
  reticleX, reticleY, pulseT, targetPart,
  chargeT, cooldownT, firePressed, launchReady }
```

---

## Beam State Machine

```
IDLE → [FIRE pressed + part nearby] → CHARGING (300ms)
CHARGING → [charge complete] → FIRING
FIRING → [part found in snap radius] → ATTRACTING
FIRING → [no part in range] → COOLDOWN
ATTRACTING → [part reaches base] → collectPart() → COOLDOWN
COOLDOWN (500ms) → IDLE
```

**Beam visual:**
- `idle`: nothing
- `charging`: faint line + gathering particle rings at base
- `firing/attracting`: 3 overlapping lines (8px/4px/2px) in blue→cyan→white, pulsing

**Part arc animation** (Bezier, 800ms):
```js
cpX = (attractSX + baseX) / 2
cpY = min(attractSY, baseY - 200) - 100  // arc upward
part.x = quadratic bezier using t
part.y = quadratic bezier using t
```

---

## Reticle Visual
- Outer ring: 28px radius, cyan, lineWidth 2
- Inner ring: 18px radius, cyan, lighter
- Crosshair: 4 line segments with 6px gap from center
- Center dot: 2.5px white filled circle
- When near a part: diamond highlight around target + snap indicator

---

## Input Handling (multi-touch 2-player)
```js
this.input.addPointer(1);  // enable 2-touch

pointerdown → assign to zone (left = P1, right = P2)
pointermove → update reticle for that zone's player
pointerup   → release, reset firePressed

// In update(), for each player:
const ptr = this.playerPointers[pi];
if (ptr?.isDown) {
  beam.reticleX = clamp(ptr.x, zone bounds);
  beam.reticleY = clamp(ptr.y, above base);
  beam.firePressed = true;
}
```

FIRE zone is the bottom strip of each player's zone (y > gY - BASE_HEIGHT - 20). Pointer down in this region triggers beam charge; pointer moved above it steers reticle.

---

## Graphics Layers (depth)

| Depth | Object |
|---|---|
| 0 | Background (stars, moon, nebula) |
| 2 | Ground |
| 3 | Base pads |
| 5 | Floating part silhouettes |
| 8 | Floating part label Text objects |
| 9 | Robot exhaust |
| 10 | Robot body |
| 15 | Tractor beam |
| 20 | Reticle |
| 22 | Zone divider |
| 25 | HUD backgrounds |
| 28 | HUD text (player name, count, buttons) |
| 30 | "✓ Part" floating labels |
| 40 | Countdown text |
| 50 | Liftoff flash |
| 60 | Win banner |

---

## Floating Part Rendering
Each of the 9 parts is drawn each frame using extracted `drawPartSilhouette(g, partName, cx, cy, col, dark, s)` functions — individual if-blocks copied from `drawRobot()` in the rocket game, adapted to accept explicit position params.

Scale: `PART_FLOAT_SCALE = 0.45` relative to base robot scale.

Glow halo: filled circle at player color, alpha = `0.12 + 0.08 * sin(part.glow)`.

Label: `partLabelTexts[pi][partIdx]` — pre-created Phaser Text, repositioned each frame below the part. Shows `"🍳 Breakfast"` for uncollected, `"✓ Left Foot"` (green) after collection.

---

## collectPart(pi, part)
1. Mark `p.checked[ii] = true` for each `ii` in `part.itemIndices`
2. Push `part.partName` onto `rob.parts[]`
3. Play `SFX.part()`
4. If all items done: `p.done = true`, play `SFX.complete()`, show LAUNCH button
5. Spawn floating "✓ [label]" text rising from base
6. Redraw robot

---

## New Audio: SFX.beam()
Sci-fi tractor beam sound (added to existing SFX engine):
- Carrier sine oscillator: 200 → 380Hz sweep over 0.5s
- LFO vibrato: 8Hz modulation ±40Hz on carrier
- Second harmonic layer (quieter, one octave up)
- Envelope: fast attack (40ms), sustain, fast decay
- Called at IDLE → CHARGING transition

---

## Robot Drawing
`drawRobot(pi)` copied from `checklist-rocket-game.js` with one change:
- `colCX(pi)` → `this.robs[pi].baseX`

`drawExhaust(pi)` copied verbatim.

`doLaunch(pi)` copied verbatim with same `colCX → baseX` substitution.

---

## Launch Sequence
Identical to rocket game:
- Rumble (5.2s) → countdown 5→1 (countBeep each) → liftoff flash → ascent → `checkWin()`

LAUNCH button: in-canvas Phaser Text at depth 28, hidden until `p.done`. Pulsing alpha tween while visible.

Win banner: Phaser Text at depth 60, `'🚀 BLAST OFF! 🚀'`, pulsing scale tween, destroys after 7s.

Fireworks: `spawnFireworks()` copied verbatim from rocket game.

---

## Key Constants
```js
FLOAT_SPEED      = 1.2   // px/frame at 60fps
PART_RADIUS      = 40    // bounce hitbox
SNAP_RADIUS      = 80    // beam acquisition range (px)
CHARGE_DURATION  = 300   // ms to hold fire
ATTRACT_DURATION = 800   // ms for part arc to base
COOLDOWN_DURATION= 500   // ms between shots
BASE_HEIGHT      = 160   // height of base area (parts stay above)
PART_FLOAT_SCALE = 0.45  // silhouette scale factor
```

---

## Verification Checklist
1. Open `checklist-robot.html` in browser
2. Setup: select 1 player, click START GAME
3. Drag reticle over a floating part — snap indicator appears
4. Hold in FIRE zone — beam charges and fires, part arcs to base, robot assembles
5. Complete all 11 items — LAUNCH button appears
6. Click LAUNCH — countdown, liftoff, fireworks
7. Test 2-player: two people can simultaneously drag and fire in their zones
8. Test on mobile/tablet touch
9. Test resize (rotate tablet) — parts clamp to new zone bounds
