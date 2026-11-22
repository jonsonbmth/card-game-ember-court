[![make.fun](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/c/best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/jonsonbmth/card-game-ember-court/rank.svg)](https://make.fun/c/best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/jonsonbmth/card-game-ember-court/reward.svg)](https://make.fun/c/best-card-game-20261122-1826)

# Ember Court — a 3D card duel

A complete, original 3D card game for the make.fun "Make the best card game" bounty. You are the Challenger in a bright golden casino hall; across the felt table sits **Mara, the Ember Duchess**, with Odo the dealer keeping the game honest.

## The game

- **30 life each**, mana that grows by 1 every turn (max 10) and refills.
- **Four suits, told apart by colour and shape:** Flame (red) hits hard, Tide (blue) shields, Leaf (green) heals and draws, Storm (violet) tricks.
- **Combos:** play two cards of one suit in a turn to trigger its bonus — Flame +3 damage, Tide +5 shield, Leaf heal 4, Storm +2 damage and draw 1.
- **A readable opponent:** Mara announces her plan each turn — STRIKE, GUARD or SCHEME — drawn from the hand she actually holds, so you can answer it.
- **Real 3D:** a perspective view down the felt table, a dealer and a rival with faces, chip stacks, candles, chandeliers and blue sky through tall windows. Cards slide, flip and snap across the table; a win lands with a golden burst.
- **Title screen, live duel, win screen and loss screen**, all reachable in play.

## Controls

- Click a card, or press **1–5**, to play it (costs mana).
- **Space** (or the END TURN button) ends your turn; Mara then plays hers, card by card.
- **M** toggles sound. **R** restarts from an end screen.

## How to run

Serve `game/` with any static server and open `game/index.html` in desktop Chrome. It plays fully offline — every script, texture and sound is generated or vendored under `game/` (three.js r186 as `game/vendor/three.min.js`).

```sh
node serve.ts   # serves game/ at http://localhost:8080
```

Screenshots are staged deterministically with `?shot=title|play|win|loss&seed=7` (see `shots.json`).

## Layout

- `game/index.html` — page shell and HUD overlay
- `game/src/main.js` — bootstrap, animation loop, turn driver
- `game/src/game.js` — the rules (pure logic, no DOM)
- `game/src/deck.js` — the 12-card catalogue and four suits
- `game/src/ai.js` — Mara's intent and greedy play
- `game/src/render3d.js` — the three.js hall, table, characters and cards
- `game/src/cards.js` — card faces and backs, drawn to canvas at runtime
- `game/src/hud.js` — life/mana bars, intent panel, banners, end screens
- `game/src/input.js` — mouse and keyboard
- `game/src/audio.js` — procedural WebAudio effects
- `game/src/shots.js` — staged screenshots and scripted self-tests
- `main.ts` — the hand-in program (copies `game/` + `screenshots/` and writes `dossier.json`)

## Known limits

- Single-player duel against the AI only; no multiplayer.
- Sound is synthesized; there is no music track.
- The game is built for a desktop browser window (1280×720 and up).
