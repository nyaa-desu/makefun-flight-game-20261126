// The ring course for each mission: a line of gold rings down the
// valley, ending at the final ring just short of Runway 27. Ring
// positions come from the mission seed, so every run of a mission
// flies the same course.

import { MISSIONS, riverX } from './config.js';
import { mulberry32 } from './random.js';

// Build the rings for mission `mi`: [{x, y, z, r, final}].
export function buildCourse(mi) {
  const m = MISSIONS[mi];
  const rng = mulberry32(m.seed * 1000 + 5);
  const rings = [];
  const z0 = 350;
  const z1 = 2280;
  for (let i = 0; i < m.rings; i++) {
    const t = i / Math.max(1, m.rings - 1);
    const z = z0 + (z1 - z0) * t;
    let x;
    let y;
    if (mi === 1) {
      // River Run follows the Alder: rings hang over the water.
      x = riverX(z) + (rng() - 0.5) * 70;
      y = 185 + 55 * Math.sin(i * 1.4 + 0.8) + t * 40;
    } else if (mi === 2) {
      // Storm Dash swings wide and high through the gusts.
      x = 210 * Math.sin(i * 1.9 + 0.4) + (rng() - 0.5) * 60;
      y = 210 + 110 * Math.sin(i * 1.1 + 2.0) + t * 30;
    } else {
      // Ring Rally weaves across the whole valley.
      x = 150 * Math.sin(i * 1.7) + 60 * Math.sin(i * 0.9 + 1.2);
      y = 195 + 70 * Math.sin(i * 1.3) + t * 45;
    }
    rings.push({
      x: Math.round(x),
      y: Math.round(y),
      z: Math.round(z),
      r: 16,
      final: i === m.rings - 1,
    });
  }
  return rings;
}
