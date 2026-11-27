// Skyhook Run — deterministic randomness: one seeded generator and the
// smooth value noise the valley is built from. Same seed, same valley,
// same rings, every run, so the screenshots are reproducible.

// Mulberry32: small, fast, good enough for a game.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(ix, iz, seed) {
  let h = (ix * 374761393 + iz * 668265263 + seed * 974634211) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

/** Smooth value noise in [-1, 1] at world position (x, z), cell size `cell`. */
export function valueNoise(x, z, cell, seed) {
  const gx = x / cell;
  const gz = z / cell;
  const ix = Math.floor(gx);
  const iz = Math.floor(gz);
  const fx = smooth(gx - ix);
  const fz = smooth(gz - iz);
  const a = hash2(ix, iz, seed) * 2 - 1;
  const b = hash2(ix + 1, iz, seed) * 2 - 1;
  const c = hash2(ix, iz + 1, seed) * 2 - 1;
  const d = hash2(ix + 1, iz + 1, seed) * 2 - 1;
  const top = a + (b - a) * fx;
  const bottom = c + (d - c) * fx;
  return top + (bottom - top) * fz;
}

/** Three octaves of value noise, still in [-1, 1]. */
export function fbm(x, z, seed) {
  return (
    valueNoise(x, z, 900, seed) * 0.55 +
    valueNoise(x, z, 320, seed + 7) * 0.3 +
    valueNoise(x, z, 110, seed + 13) * 0.15
  );
}

/** A 0..1 jitter that is stable per integer cell (for fields and trees). */
export function cellJitter(cx, cz, seed) {
  return hash2(cx, cz, seed);
}
