// Skyhook Run v2 — the hand-in program (Node 22, standard library only).
// It gathers the entry — the game under game/, the screenshots under
// screenshots/ — into the output directory and writes dossier.json, the
// summary the judge reads, using the vendored make.fun library.
// Run it with an output directory of your own outside the grader:
//   MAKEFUN_OUTPUT_DIR=out node main.ts
// Run it twice into two directories: the two outputs must be identical.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Start from an empty output directory so a second run can never inherit
// a stale file from the first — the two runs must agree byte for byte.
if (existsSync(out)) rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// The game: plain static files, loaded offline by a desktop browser.
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });

// The screenshots: real renders of the game, first by name is the cover.
const shotsDir = join(here, 'screenshots');
if (!existsSync(shotsDir)) throw new Error('screenshots/ is missing — render the four shots first');
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The judge's caps for this competition: four screenshots at most, each
// under 256 KiB; the game under 993 files and 48 MiB in all; no game
// path over 1000 bytes; the dossier's text budget is 160 KiB.
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);

const shots = readdirSync(join(out, 'screenshots')).sort();
console.log(`Skyhook Run v2 -> ${out}`);
console.log(`screenshots: ${shots.join(', ')}`);
console.log(`dossier.json: ${dossier.byteLength} bytes`);
