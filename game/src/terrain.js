// Skyhook Run — the valley: one height function, the river that cuts it,
// the town and the runway that sit on its floor, and the colours the
// renderer paints each patch of ground with.

import { WORLD, RUNWAY, SKY } from './config.js';
import { fbm, valueNoise, cellJitter } from './random.js';

// The river winds down the valley from the northern mountains to the sea.
export function riverX(z) {
  return 620 * Math.sin(z * 0.00042 + 0.6) + 260 * Math.sin(z * 0.0011 + 2.0);
}

// Distance from the runway centreline, along the strip.
function runwayDistance(x, z) {
  const dz = z - RUNWAY.centreZ;
  const along = Math.abs(dz);
  const across = Math.abs(x - RUNWAY.centreX);
  if (along > RUNWAY.length / 2) return Math.hypot(across, along - RUNWAY.length / 2);
  return across;
}

/** Ground height in metres at world (x, z). */
export function heightAt(x, z) {
  const seed = WORLD.seed;
  let h = WORLD.fieldHeight + fbm(x, z, seed) * 55;
  // The river carves a channel down the valley.
  const river = Math.abs(x - riverX(z));
  const carve = Math.max(0, 1 - river / 130);
  h -= carve * carve * 46;
  // The sea takes over east of the coast.
  const sea = Math.max(0, (x - WORLD.coastX) / 500);
  h = h * (1 - Math.min(1, sea)) + -14 * Math.min(1, sea);
  // Mountains rise to the west and far north.
  const west = Math.max(0, (WORLD.mountainX - x) / 700);
  const north = Math.max(0, (WORLD.mountainZ - z) / 700);
  const rise = Math.max(west, north);
  h += rise * rise * 620 + valueNoise(x, z, 260, seed + 31) * 90 * rise;
  // The runway apron is flat, blended in over 260 m.
  const flat = Math.max(0, 1 - runwayDistance(x, z) / 260);
  h = h * (1 - flat) + WORLD.fieldHeight * flat;
  return h;
}

/** True when (x, z) is on the runway strip itself. */
export function onRunway(x, z) {
  const dz = z - RUNWAY.centreZ;
  return Math.abs(dz) <= RUNWAY.length / 2 && Math.abs(x - RUNWAY.centreX) <= RUNWAY.width / 2;
}

/** True when (x, z) is paved apron around the runway. */
export function onApron(x, z) {
  return runwayDistance(x, z) < RUNWAY.width / 2 + 60;
}

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * f)));
  const g = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * f)));
  const b = Math.min(255, Math.max(0, Math.round((n & 255) * f)));
  return `rgb(${r},${g},${b})`;
}

/**
 * The colour of a ground patch centred at (x, z) with height h and a
 * sun-facing slope factor. Fields get a patchwork by cell so the valley
 * reads as farmland from the air.
 */
export function groundColour(x, z, h, slope) {
  const light = 0.82 + Math.min(0.35, Math.max(-0.25, slope * 0.5));
  if (h < WORLD.waterLevel + 1.5) return shade(h < -4 ? SKY.waterDeep : SKY.waterShallow, light);
  const river = Math.abs(x - riverX(z));
  if (river < 26 && h < WORLD.fieldHeight - 8) return shade(SKY.sand, light);
  if (onApron(x, z)) return shade(SKY.runway, 0.9);
  if (h > 320) return shade(SKY.snow, light);
  if (h > 180) return shade(SKY.rock, light);
  const cell = Math.floor(x / 170) + Math.floor(z / 170) * 7;
  const j = cellJitter(cell, 3, WORLD.seed);
  // A little brightness jitter per field cell, so the patchwork reads as
  // farmland rather than a flat checkerboard.
  const jl = 0.94 + cellJitter(cell, 4, WORLD.seed) * 0.12;
  if (j < 0.22) return shade(SKY.forest, light * jl);
  if (j < 0.55) return shade(SKY.fieldA, light * jl);
  if (j < 0.8) return shade(SKY.fieldB, light * jl);
  return shade(SKY.fieldC, light * jl);
}

// A small town beside the runway: a dozen low blocks with lit windows.
export function townBuildings() {
  const list = [];
  const rngX = [ -260, -190, -140, -90, 150, 210, 280, -220, 120, 330, -320, 60 ];
  const rngZ = [ 760, 820, 900, 990, 780, 860, 950, 1080, 1060, 1120, 1180, 1240 ];
  for (let i = 0; i < rngX.length; i += 1) {
    const w = 22 + (i % 3) * 8;
    const d = 18 + ((i * 5) % 3) * 7;
    const h = 14 + ((i * 11) % 4) * 9;
    list.push({ x: rngX[i], z: rngZ[i], w, d, h, warm: i % 2 === 0 });
  }
  return list;
}

// Trees scattered on the valley floor, kept clear of the runway and river.
export function treeSpots() {
  const spots = [];
  for (let gx = -28; gx <= 28; gx += 1) {
    for (let gz = -58; gz <= 30; gz += 1) {
      const x = gx * 100 + 37;
      const z = gz * 100 + 61;
      const j = cellJitter(gx, gz, WORLD.seed + 5);
      if (j < 0.72) continue;
      if (runwayDistance(x, z) < 190) continue;
      if (Math.abs(x - riverX(z)) < 60) continue;
      const h = heightAt(x, z);
      if (h < 6 || h > 150) continue;
      spots.push({ x, z, s: 9 + j * 14 });
    }
  }
  return spots;
}

// Puffy clouds that drift slowly over the valley.
export function cloudPuffs() {
  const puffs = [];
  for (let i = 0; i < 26; i += 1) {
    const j = cellJitter(i, 11, WORLD.seed + 9);
    puffs.push({
      x: -2800 + j * 5600,
      y: 420 + cellJitter(i, 12, WORLD.seed + 9) * 260,
      z: -5600 + cellJitter(i, 13, WORLD.seed + 9) * 8200,
      r: 90 + cellJitter(i, 14, WORLD.seed + 9) * 160,
    });
  }
  return puffs;
}
