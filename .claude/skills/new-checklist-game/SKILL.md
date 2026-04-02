---
name: new-checklist-game
description: "Create a new checklist game in this repo. Use when asked to make, build, or add a new checklist game, task list, or morning routine game."
---

You are helping the user create a new checklist game in this repo. There are three templates to choose from — pick the right one based on the user's needs, then build the game by editing the CONFIG and customising the theme.

## Choose a Template

**Option A: Basic Checklist** (`basic-checklist.html` as template)
- Best for: 2 people tracking shared tasks (e.g. morning routine, chores)
- Features: table grid with one column per person, particle rewards, progress chips, localStorage persistence
- ~1000 lines, single HTML file, no external dependencies

**Option B: Rocket Game** (`checklist-rocket.html` + `checklist-rocket-game.js` as template)
- Best for: 1–6 players, competitive or collaborative task tracking
- Features: Phaser scene, robot assembly, rocket launch sequence, multi-player setup screen
- Split into HTML + one JS file

**Option C: Space Robot / Custom Phaser Game** (`space-robot.html` as template)
- Best for: a unique gameplay mechanic layered over a checklist
- Features: single large HTML file, full Phaser scene, custom interactions
- Use when the user wants something beyond a table layout

If the user hasn't specified, ask which template fits their vision before proceeding.

## Step 1 — Gather CONFIG Details

You need:
```js
CONFIG = {
  title: "Game title with emoji",
  items: [
    { name: "Task name", emoji: "🎯" },
    // 5–15 items is typical
  ],
  // Basic checklist only:
  people: ["Name1", "Name2"],
  peopleColors: ["#hexcolor1", "#hexcolor2"],
}
```

If the user hasn't provided items, ask or propose sensible defaults based on their described use case (morning routine, bedtime, chores, etc.).

## Step 2 — Create the New File

Copy the chosen template to a new filename. Use a descriptive slug, e.g.:
- `bedtime-checklist.html`
- `chores-rocket.html`
- `homework-robot.html`

Read the full template file first, then write the new file with:
1. Updated `CONFIG` at the top
2. Updated page `<title>` tag
3. Optional: adjusted color scheme (see patterns below)

## Step 3 — Add to index.html

Read `index.html`, then add a new card to the game grid:

```html
<a href="your-new-file.html" class="game-card">
  <div class="game-emoji">🚀</div>
  <div class="game-title">Your Game Title</div>
  <div class="game-desc">Short description of who it's for</div>
</a>
```

Insert it alongside the existing cards inside `<div class="game-grid">`.

## Color Schemes

**Warm/daytime theme** (like basic-checklist):
```css
background: linear-gradient(160deg, #fff9ef 0%, #eff8ff 100%);
/* Header accent: #ff9a3c → #ff6b35 */
```

**Space/dark theme** (like rocket & space-robot):
```css
background: linear-gradient(160deg, #0a0a2e 0%, #1a1a4e 60%, #0d0d2b 100%);
/* Glow text: text-shadow: 0 0 30px #6af, 0 0 60px #48f */
```

**Custom:** Ask the user for a mood/palette and derive hex values accordingly.

## Key Patterns to Preserve

- Keep `CONFIG` at the very top of the `<script>` block, clearly commented
- All sounds via Web Audio API — no external audio files
- All CSS inline in `<style>` — no external stylesheets
- Use `clamp()` for font sizes to stay responsive
- Custom-styled checkboxes (circle with ✓), never plain `<input type="checkbox">`
- localStorage keyed by date for daily-reset persistence (basic template pattern)

## Checklist After Building

- [ ] CONFIG has correct title, items, people/colors
- [ ] Page `<title>` updated
- [ ] Card added to `index.html`
- [ ] Color scheme matches the mood
- [ ] Open in browser and verify checkboxes work
- [ ] Verify rewards fire (sounds + visuals) on check
- [ ] Verify completion celebration triggers when all done
