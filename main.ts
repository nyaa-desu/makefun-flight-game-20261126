// Skyhook Run v4 — the hand-in program (Node 22, standard library only).
// It gathers the entry — the game under game/, the screenshots under
// screenshots/ — into the output directory and writes dossier.json, the
// summary the judge reads, using the vendored make.fun library.
// Run it with an output directory of your own outside the grader:
//   MAKEFUN_OUTPUT_DIR=out node main.ts
// Run it twice into two directories: the two outputs must be identical.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Every write below the output directory is best-effort with verification
// (v4). In the grader the output path is a mounted volume the scoring user
// cannot delete, and an earlier grading phase under another user may have
// left stale files there that this user cannot remove or overwrite. The
// stale files are this entry's own outputs, byte-identical to what this
// run would write, so a write that fails is only fatal when the file on
// disk is missing or holds different bytes. The run exits 0 only when
// every required output exists with exactly the bytes it would have
// written; it exits 1 only when a required output is missing or wrong.

// sameFile(path, bytes): true iff the file at path exists and its bytes
// equal bytes.
function sameFile(path: string, bytes: string | Uint8Array): boolean {
  try {
    const actual = readFileSync(path);
    const expected = typeof bytes === 'string' ? Buffer.from(bytes, 'utf8') : Buffer.from(bytes);
    return actual.equals(expected);
  } catch {
    return false;
  }
}

// copyTreeBestEffort(src, dest): try a full recursive copy; on any error,
// walk src and verify every file already exists under dest with identical
// bytes. Returns true iff every source file is present and identical in
// dest. Extra files in dest are left alone.
function copyTreeBestEffort(src: string, dest: string): boolean {
  try {
    cpSync(src, dest, { recursive: true });
    return true;
  } catch {
    // Fall through to verification of what is already on disk.
  }
  try {
    const stack: Array<[string, string]> = [[src, dest]];
    while (stack.length > 0) {
      const [s, d] = stack.pop()!;
      for (const name of readdirSync(s)) {
        const sp = join(s, name);
        const dp = join(d, name);
        if (statSync(sp).isDirectory()) {
          stack.push([sp, dp]);
        } else if (!sameFile(dp, readFileSync(sp))) {
          return false;
        }
      }
    }
    return true;
  } catch {
    return false;
  }
}

// writeFileBestEffort(path, bytes): try to write; on error, succeed iff
// the file already holds exactly those bytes.
function writeFileBestEffort(path: string, bytes: string | Uint8Array): boolean {
  try {
    writeFileSync(path, bytes);
    return true;
  } catch {
    return sameFile(path, bytes);
  }
}

// Start from an empty output directory so a second run can never inherit
// a stale file from the first — the two runs must agree byte for byte.
// Clear only the directory's CONTENTS, never the directory itself: in the
// grader the output path is a mounted volume the scoring user cannot delete.
// Skip any entry the scoring user cannot delete instead of crashing: a
// stale file left by an earlier grading phase under another user must not
// fail the whole run (v3: try/catch around each removal).
if (existsSync(out)) {
  for (const name of readdirSync(out)) {
    try {
      rmSync(join(out, name), { recursive: true, force: true });
    } catch {
      continue;
    }
  }
}
try {
  mkdirSync(out, { recursive: true });
} catch {
  // Continue: the steps below fail honestly if the directory truly does
  // not exist.
}

// The game: plain static files, loaded offline by a desktop browser.
if (!copyTreeBestEffort(join(here, 'game'), join(out, 'game'))) {
  throw new Error('game/ could not be written to the output directory');
}

// The screenshots: real renders of the game, first by name is the cover.
const shotsDir = join(here, 'screenshots');
if (!existsSync(shotsDir)) throw new Error('screenshots/ is missing — render the four shots first');
try {
  mkdirSync(join(out, 'screenshots'), { recursive: true });
} catch {
  // Continue: the copy below verifies what is on disk.
}
if (!copyTreeBestEffort(shotsDir, join(out, 'screenshots'))) {
  throw new Error('screenshots/ could not be written to the output directory');
}

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
if (!writeFileBestEffort(join(out, 'dossier.json'), dossier)) {
  throw new Error('dossier.json could not be written to the output directory');
}

const shots = readdirSync(join(out, 'screenshots')).sort();
console.log(`Skyhook Run v4 -> ${out}`);
console.log(`screenshots: ${shots.join(', ')}`);
console.log(`dossier.json: ${dossier.byteLength} bytes`);
