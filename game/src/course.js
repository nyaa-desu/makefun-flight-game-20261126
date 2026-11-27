// Skyhook Run — the ring course: a seeded chain of rings over the valley
// for each mission, plus the landing leg home to Runway 27.

import { MISSIONS, RING, RUNWAY, WORLD } from './config.js';
import { mulberry32 } from './random.js';
import { heightAt, riverX } from './terrain.js';

export function missionById(id) {
  return MISSIONS.find((m) => m.id === id) ?? MISSIONS[0];
}

/**
 * Build the course for a mission. Rings weave across the valley and climb
 * from the runway into the foothills, then turn for home: the last ring
 * sits on the runway's final approach so the landing reads as the finish.
 */
export function buildCourse(mission) {
  const rng = mulberry32(WORLD.seed + mission.rings * 101 + mission.timeLimit);
  const rings = [];
  const count = mission.rings;
  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0 : i / (count - 1);
    // Out along the valley, then a turn back toward the runway.
    const out = t < 0.72;
    const along = out ? -5200 * (t / 0.72) : -5200 + (t - 0.72) / 0.28 * 5600;
    const sway = Math.sin(t * Math.PI * 2.2) * 620 + (rng() - 0.5) * 320;
    const x = Math.max(-1500, Math.min(1500, sway + (out ? 0 : 0)));
    const z = Math.max(WORLD.north + 300, Math.min(WORLD.south - 300, along));
    const ground = heightAt(x, z);
    const alt = ground + 110 + Math.sin(t * Math.PI * 1.6) * 90 + rng() * 60;
    rings.push({
      index: i,
      x,
      y: Math.max(ground + 70, alt),
      z,
      radius: RING.radius * (mission.id === 'storm' ? 0.85 : 1),
      passed: false,
      missed: false,
    });
  }
  // The final ring hangs over the runway threshold on final approach.
  const last = rings[rings.length - 1];
  last.x = RUNWAY.centreX;
  last.y = WORLD.fieldHeight + 95;
  last.z = RUNWAY.centreZ - RUNWAY.length / 2 - 420;
  return { rings, riverHint: riverX(-2600) };
}

/** The next ring the pilot has to fly through, or null when done. */
export function nextRing(course) {
  for (let i = 0; i < course.rings.length; i += 1) {
    if (!course.rings[i].passed && !course.rings[i].missed) return course.rings[i];
  }
  return null;
}

export function ringsDone(course) {
  return course.rings.filter((r) => r.passed).length;
}

export function ringsMissed(course) {
  return course.rings.filter((r) => r.missed).length;
}
