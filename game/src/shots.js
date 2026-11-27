// The four staged screenshot states: real game states, frozen at the
// moment that shows the most. Each one is a genuine flight object with
// rings, fuel, combo and score filled in — the renderers draw them
// exactly as they would draw live play, so the screenshots are honest
// renders of the game running.

import { newFlight, startFlight } from './flight.js';
import { groundHeight } from './terrain.js';

// Place the plane just behind a ring, slightly below it, on course.
function approachRing(f, ringIndex, back = 55, below = 14, side = -18) {
  const ring = f.rings[ringIndex];
  f.x = ring.x + side;
  f.z = ring.z - back;
  f.y = ring.y - below;
  f.heading = 0;
  f.pitch = 0.06;
  f.roll = -0.12;
  f.speed = 62;
  f.throttle = 0.72;
  f.status = 'flying';
  return ring;
}

export function stagedShot(name) {
  if (name === 'cover') {
    // The climactic state: the final ring ahead, the runway beyond it,
    // fuel low, combo high, the FINAL RING banner on screen. The plane
    // sits 150 m back so the river, the runway and Milltown's lamps are
    // all in frame ahead of it — the ring stays big, the valley reads.
    const f = newFlight(0);
    f.ringsHit = 11;
    f.combo = 6;
    f.bestCombo = 6;
    f.score = 2450;
    f.fuel = 18;
    f.timeLeft = 42;
    f.elapsed = 218;
    approachRing(f, 11, 150, 30, -18);
    f.lastEvent = { kind: 'finalRing', at: 0, gain: 330, ring: 12 };
    return { flight: f, camera: 'chase', storm: false, nowMs: 600, time: 0 };
  }
  if (name === 'storm') {
    // Storm Dash mid-flight: rain, gusts, the next ring in the murk.
    const f = newFlight(2);
    f.ringsHit = 3;
    f.combo = 2;
    f.bestCombo = 3;
    f.score = 760;
    f.fuel = 55;
    f.timeLeft = 150;
    f.elapsed = 60;
    f.windNow = 12;
    approachRing(f, 3, 90, 10, 24);
    f.pitch = 0.1;
    f.roll = 0.22;
    f.lastEvent = { kind: 'ring', at: 0, gain: 200, ring: 3 };
    return { flight: f, camera: 'chase', storm: true, nowMs: 900, time: 0 };
  }
  if (name === 'cockpit') {
    // River Run from the cockpit: the Alder below, the next ring ahead,
    // the panel lit warm.
    const f = newFlight(1);
    f.ringsHit = 5;
    f.combo = 4;
    f.bestCombo = 4;
    f.score = 1180;
    f.fuel = 64;
    f.timeLeft = 210;
    f.elapsed = 120;
    approachRing(f, 5, 70, 8, 0);
    f.pitch = 0.04;
    f.roll = 0.08;
    f.lastEvent = { kind: 'ring', at: 0, gain: 168, ring: 5 };
    return { flight: f, camera: 'cockpit', storm: false, nowMs: 700, time: 0 };
  }
  if (name === 'end') {
    // Down safe on Runway 27: the full breakdown on screen.
    const f = newFlight(0);
    f.ringsHit = 12;
    f.combo = 7;
    f.bestCombo = 7;
    f.score = 3240;
    f.fuel = 31;
    f.timeLeft = 38;
    f.elapsed = 262;
    f.status = 'landed';
    f.landedKind = 'perfect';
    f.x = 0;
    f.z = 2710;
    f.y = groundHeight(0, 2710) + 2;
    f.heading = 0;
    f.speed = 0;
    f.throttle = 0;
    f.lastEvent = { kind: 'landed', at: 0, fuelBonus: 62, timeBonus: 19, comboBonus: 350 };
    return { flight: f, camera: 'chase', storm: false, nowMs: 0, time: 0 };
  }
  return null;
}
