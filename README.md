[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/soedirman566-stack/best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/soedirman566-stack/best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

# Crown & Dagger — a duel of cards

An original tactical card-duel game built for the make.fun **best-card-game-20261122-1826** bounty. No libraries, no network, no assets on disk: every card, portrait and sound is drawn or synthesised by the game's own code.

Three rivals wait at the tavern table, each more dangerous than the last: **Tomas the Squire**, **Odile the Duchess**, and **Aldric, the Crownless King**. Beat all three to take the crown.

## How to play

You and your rival each hold **30 Health**. Every turn you receive **3 Energy** and draw up to a hand of 5 cards. Click a card (or press its number key, 1–5) to play it, then press the **END TURN** button (or Space) to let the rival act.

Above the rival's portrait hangs their **Intent** — exactly what they mean to do next ("Will strike for 7", "Brewing venom", "Raising a guard"). Reading the intent and answering it is the whole skill of the game: block the big hit, mirror it back, or race them down first.

The eight cards:

| Card | Cost | Effect |
| --- | --- | --- |
| **Strike** | 1 | Deal 6 damage. |
| **Guard** | 1 | Gain 8 Block. Block soaks damage before Health. |
| **Venom** | 1 | Poison the rival: 3 damage at the start of their next 3 turns. |
| **Feast** | 2 | Restore 7 Health. |
| **Mirror** | 1 | Reflect the rival's next attack back at them in full. |
| **Gambit** | 1 | Draw 2 cards, but take 2 damage yourself. |
| **Snare** | 1 | Weaken the rival's next intent — their planned blow lands softer. |
| **Royal Decree** | 3 | Spend all your Energy to deal 14 damage. |

Win a duel to advance. Your score is the Health you keep, plus a speed bonus for quick wins, plus a **style bonus** when the killing blow comes off a Mirror reflection or a Gambit turn. Lose, and the rival sends you back to try the duel again.

## Running it

Serve the `game/` folder with any static file server and open `index.html` in a desktop browser — for example `node serve.ts` from a make.fun kit, or `python3 -m http.server` inside `game/`. The hand-in program at the repository root copies the game and its screenshots to the output directory and writes the dossier the judges read:

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Layout

- `game/src/cards.js` — the eight card definitions and both deck builders.
- `game/src/rival.js` — the three rivals, their portraits' palettes and their intent AI.
- `game/src/duel.js` — the turn engine: energy, block, venom, mirror, snare, scoring.
- `game/src/render.js` — the tavern table, fanned hands, cards, portraits and HUD.
- `game/src/audio.js` — WebAudio sound effects, synthesised, no files.
- `game/src/main.js` — input, the game loop and the screenshot hook.
