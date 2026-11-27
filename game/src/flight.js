// The flight model: throttle, banked turns, lift and stall, fuel,
// wind gusts, ring scoring and landing. Small and honest — a slow,
// steep plane sinks, a fast level one on the strip lands.

import { MISSIONS, TUNE } from './config.js';
import { buildCourse } from './course.js';
import { groundHeight, groundKind } from './terrain.js';

export function newFlight(missionIndex) {
  const m = MISSIONS[missionIndex];
  return {
    mission: missionIndex,
    rings: buildCourse(missionIndex),
    ringsHit: 0,
    combo: 0,
    bestCombo: 0,
    score: 0,
    // The Kestrel starts on the old grass strip at the north end of the
    // valley (z = 120) and flies +z down the valley: rings ahead, the
    // Alder River below, Milltown mid-course, Runway 27 at the far end.
    x: 0,
    y: 60,
    z: 120,
    heading: 0, // 0 means +z, down the valley toward the runway
    pitch: 0,
    roll: 0,
    speed: 0,
    throttle: 0,
    fuel: 100,
    flaps: false,
    timeLeft: m.time,
    status: 'ready', // ready | flying | paused | landed | crashed | outoffuel
    stall: false,
    windNow: 0,
    elapsed: 0,
    lastEvent: null, // {kind, at} for the radio + feedback
    landedKind: null, // 'perfect' | 'rough' | null
    descent: 0,
  };
}

// Line up on the grass strip and go: wheels on the ground, engine idling.
export function startFlight(f) {
  f.heading = 0;
  f.x = 0;
  f.z = 120;
  f.y = groundHeight(0, 120) + 2;
  f.speed = 0;
  f.throttle = 0;
  f.status = 'flying';
  f.elapsed = 0;
  f.lastEvent = { kind: 'takeoff', at: 0 };
}

// One step of the model. `input` is {pitch, roll, throttleUp, throttleDown,
// flaps} with pitch/roll in [-1, 1]. `wind` is the crosswind in m/s (positive
// pushes the plane toward +x). Returns nothing; mutates f.
export function stepFlight(f, input, wind, dt) {
  if (f.status !== 'flying') return;
  const m = MISSIONS[f.mission];
  f.elapsed += dt;
  f.timeLeft -= dt;

  // Throttle.
  if (input.throttleUp) f.throttle = Math.min(1, f.throttle + TUNE.throttleRate * dt);
  if (input.throttleDown) f.throttle = Math.max(0, f.throttle - TUNE.throttleRate * dt);

  // Speed chases the throttle setting; flaps cost speed.
  const flapDrag = f.flaps ? 12 : 0;
  const targetSpeed = TUNE.baseSpeed + f.throttle * TUNE.speedPerThrottle - flapDrag;
  f.speed += (targetSpeed - f.speed) * Math.min(1, 0.9 * dt);

  // Bank and pitch ease toward the pilot's input.
  const rollTarget = input.roll * TUNE.maxBank;
  const pitchTarget = input.pitch * TUNE.maxPitch;
  f.roll += (rollTarget - f.roll) * Math.min(1, TUNE.rollRate * dt);
  f.pitch += (pitchTarget - f.pitch) * Math.min(1, TUNE.pitchRate * dt);

  // A banked turn changes heading; faster flight turns slower.
  f.heading += -f.roll * TUNE.turnFactor * dt * (42 / Math.max(28, f.speed));

  // Climb from pitch, sink when the wing quits.
  const stallSpeed = f.flaps ? TUNE.stallSpeedFlaps : TUNE.stallSpeed;
  f.stall = f.speed < stallSpeed && f.pitch > 0.05;
  let climb = Math.sin(f.pitch) * f.speed * TUNE.climbFactor;
  if (f.stall) climb -= (stallSpeed - f.speed) * 0.9 + TUNE.sinkRate * 0.35;
  if (f.speed < stallSpeed * 0.8) climb -= TUNE.sinkRate * 0.4;
  f.descent = -climb;
  f.y += climb * dt;

  // Forward motion, plus the crosswind shoving the plane sideways.
  f.windNow = wind;
  f.x += Math.sin(f.heading) * f.speed * dt + wind * dt * 0.45;
  f.z += Math.cos(f.heading) * f.speed * dt;
  f.x = Math.max(-400, Math.min(400, f.x));

  // Fuel burns with throttle; a ring tops the tanks up.
  f.fuel -= (TUNE.fuelBurnIdle + f.throttle * TUNE.fuelBurnThrottle) * dt;
  if (f.fuel <= 0) {
    f.fuel = 0;
    f.throttle = 0;
    if (f.y <= groundHeight(f.x, f.z) + 2) {
      f.status = 'outoffuel';
      f.lastEvent = { kind: 'outoffuel', at: f.elapsed };
      return;
    }
  }

  // Rings: score the next one, miss it once flown past.
  const next = f.rings[f.ringsHit];
  if (next) {
    const dx = f.x - next.x;
    const dy = f.y - next.y;
    const dz = f.z - next.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist < TUNE.ringHitDistance && Math.abs(dz) < 18) {
      f.ringsHit++;
      f.combo++;
      f.bestCombo = Math.max(f.bestCombo, f.combo);
      const gain = Math.round(TUNE.ringScore * m.multiplier * (1 + 0.1 * (f.combo - 1)));
      f.score += gain;
      f.fuel = Math.min(100, f.fuel + TUNE.fuelPerRing);
      f.lastEvent = {
        kind: next.final ? 'finalRing' : 'ring',
        at: f.elapsed,
        gain,
        ring: f.ringsHit,
      };
    } else if (f.z > next.z + 14) {
      // Flown past the ring: combo lost, ring skipped.
      f.ringsHit++;
      f.combo = 0;
      f.lastEvent = { kind: 'missed', at: f.elapsed, ring: f.ringsHit };
    }
  }

  // Low fuel warning.
  if (f.fuel < 20 && f.fuel > 0 && (f.lastEvent?.kind !== 'lowFuel' || f.elapsed - f.lastEvent.at > 12)) {
    f.lastEvent = { kind: 'lowFuel', at: f.elapsed };
  }

  // Time out: the flight ends where the plane is.
  if (f.timeLeft <= 0) {
    f.timeLeft = 0;
    if (tryLand(f)) return;
    f.status = 'crashed';
    f.lastEvent = { kind: 'timeout', at: f.elapsed };
    return;
  }

  // The ground: a touchdown on the strip is a landing, anywhere else a crash.
  const ground = groundHeight(f.x, f.z);
  if (f.y <= ground + 2) {
    f.y = ground + 2;
    if (groundKind(f.x, f.z) === 'runway' && tryLand(f)) return;
    f.status = 'crashed';
    f.lastEvent = { kind: 'crash', at: f.elapsed };
  }
}

// A landing attempt: slow, level and gentle on the strip. Returns true
// when the plane is down safely and settles the score.
function tryLand(f) {
  const m = MISSIONS[f.mission];
  const gentle = f.descent < TUNE.maxLandingDescent;
  const level = Math.abs(f.pitch) < 0.16 && Math.abs(f.roll) < 0.28;
  const slow = f.speed < TUNE.maxLandingSpeed;
  if (!gentle || !level || !slow) return false;
  f.status = 'landed';
  f.landedKind = f.descent < 2 && slow ? 'perfect' : 'rough';
  const fuelBonus = Math.round(f.fuel * 2);
  const timeBonus = Math.round(f.timeLeft * 0.5);
  const comboBonus = f.bestCombo * 50;
  f.score += TUNE.landingBonus + fuelBonus + timeBonus + comboBonus;
  f.lastEvent = {
    kind: 'landed',
    at: f.elapsed,
    fuelBonus,
    timeBonus,
    comboBonus,
  };
  return true;
}
