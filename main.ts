// Crown & Dagger — hand-in program for the make.fun best-card-game bounty.
//
// The game itself is the static site in game/ (plain HTML, CSS and ES modules,
// no build step and no network). This program copies game/ and screenshots/
// into the output directory and writes dossier.json there with buildDossier
// from the vendored make.fun library, so the judge reads exactly the files a
// browser would open.
//
// Run it the way the grader does, or locally with an output override:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The gate's caps, named once: buildDossier refuses anything past them, so
// a hand-in that would fail the sealed scorer fails here first, loudly.
const GATE_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The two halves of an entry must exist before anything is copied: the
// playable game (game/index.html) and at least the cover screenshot.
if (!existsSync(join(repoDir, 'game', 'index.html'))) {
  throw new Error('game/index.html is missing: there is no game to hand in');
}
const shotsDir = join(repoDir, 'screenshots');
const shots = existsSync(shotsDir)
  ? readdirSync(shotsDir).filter((name) => !name.startsWith('.'))
  : [];
if (shots.length < 3 || shots.length > GATE_CAPS.screenshots.max) {
  throw new Error(`screenshots/ must hold 3 or 4 images, found ${shots.length}`);
}

mkdirSync(outDir, { recursive: true });
cpSync(join(repoDir, 'game'), join(outDir, 'game'), { recursive: true });
cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, GATE_CAPS));
console.log(`handed in: game/ + ${shots.length} screenshots -> ${outDir}`);
