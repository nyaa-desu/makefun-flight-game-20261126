// The valley floor: rolling dusk hills, a river carved low, a flat
// strip for Runway 27 and a shelf for Milltown. One function, so the
// renderer, the flight model and the landing check all agree on the ground.

import { valueNoise } from './random.js';
import { riverX, VALLEY } from './config.js';

const SEED = 7;

// Ground height in metres above sea level at (x, z).
export function groundHeight(x, z) {
  // Rolling hills, two octaves of value noise.
  let h = 42 + 58 * valueNoise(x, z, 260, SEED) + 26 * valueNoise(x, z, 90, SEED + 3);
  // The valley floor sinks toward the river.
  const riverDist = Math.abs(x - riverX(z));
  const riverDip = Math.max(0, 1 - riverDist / 130);
  h = h * (1 - riverDip * 0.82) + 6 * riverDip;
  // Milltown sits on a shelf above the west bank.
  if (z >= VALLEY.townZ0 && z <= VALLEY.townZ1 && x >= VALLEY.townX0 && x <= VALLEY.townX1) {
    h = h * 0.35 + 16 * 0.65;
  }
  // The runway is graded flat.
  if (z >= VALLEY.runwayStart && z <= VALLEY.runwayEnd && Math.abs(x) < 70) {
    const flat = Math.max(0, 1 - Math.abs(x) / 70);
    h = h * (1 - flat) + 5 * flat;
  }
  return h;
}

// What the ground is at (x, z): river, runway, town, marsh, forest or field.
// The renderer colours each band by this; the flight model crashes on it.
export function groundKind(x, z) {
  if (z >= VALLEY.runwayStart && z <= VALLEY.runwayEnd && Math.abs(x) < VALLEY.runwayHalfWidth) {
    return 'runway';
  }
  if (Math.abs(x - riverX(z)) < 26) return 'river';
  if (z >= VALLEY.townZ0 && z <= VALLEY.townZ1 && x >= VALLEY.townX0 && x <= VALLEY.townX1) {
    return 'town';
  }
  if (z >= 560 && z <= 700 && Math.abs(x - 130) < 90) return 'marsh';
  const forest = valueNoise(x, z, 170, SEED + 11);
  if (forest > 0.62) return 'forest';
  const amber = valueNoise(x, z, 210, SEED + 23);
  return amber > 0.55 ? 'fieldAmber' : 'field';
}
