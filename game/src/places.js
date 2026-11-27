// Named places of Kestrel Valley. The game puts their names on the
// ground where they belong and in the side panel with live distances,
// so the valley reads as a place, not a patchwork of fields.

import { PLACES, riverX } from './config.js';

// Every named place with its ground position. The river and the bridge
// follow the river's centreline, so their x moves with z.
export function placePositions() {
  return PLACES.map((p) => {
    let x = p.x;
    if (p.name === 'Alder River' || p.name === 'Alder Bridge') {
      x = riverX(p.z);
    }
    return { name: p.name, blurb: p.blurb, x, z: p.z };
  });
}

// The nearest places to the plane, closest first, with distances in metres.
export function nearestPlaces(px, pz, count = 4) {
  const all = placePositions().map((p) => {
    const dx = p.x - px;
    const dz = p.z - pz;
    return { ...p, dist: Math.round(Math.hypot(dx, dz)) };
  });
  all.sort((a, b) => a.dist - b.dist);
  return all.slice(0, count);
}

// A short label for the ground under the plane: river, town, runway or field.
export function groundLabel(x, z) {
  if (z >= 2500 && z <= 2920 && Math.abs(x) < 30) return 'Runway 27';
  if (Math.abs(x - riverX(z)) < 26) return 'Alder River';
  if (z >= 1950 && z <= 2300 && x >= -270 && x <= -60) return 'Milltown';
  if (z >= 560 && z <= 700 && Math.abs(x - 130) < 90) return 'Heron Marsh';
  return 'Kestrel Valley';
}
