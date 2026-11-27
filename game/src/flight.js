// Skyhook Run — the flight model: an arcade plane with pitch, roll,
// throttle, lift, stall, wind and ground contact. All angles in radians,
// all distances in metres, all speeds in metres per second.

import { PLANE, RUNWAY, WORLD } from './config.js';
import { heightAt, onRunway } from './terrain.js';
import { nextRing, ringsDone } from './course.js';

export const TAKEOFF_SPEED = 36;

/** A fresh plane sitting on the runway, engine idling, facing north. */
export function freshPlane() {
  return {
    x: RUNWAY.centreX,
    y: WORLD.fieldHeight + 2,
    z: RUNWAY.centreZ + 260,
    heading: 0,
    pitch: 0,
    roll: 0,
    speed: 0,
    throttle: 0,
    fuel: 1,
    flaps: false,
    airborne: false,
    verticalSpeed: 0,
    // Input targets the stick is asking for this frame.
    wantPitch: 0,
    wantRoll: 0,
    stalled: false,
    onGround: true,
  };
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function angleLerp(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

/**
 * Step the plane one frame. `stick` is { pitch, roll } in -1..1 from the
 * keyboard and mouse, `throttleDelta` is -1, 0 or 1, and `wind` is the
 * mission's crosswind push this frame. Returns an event string or null:
 * 'takeoff', 'stall', 'ring', 'miss', 'crash', 'landed', 'fuel'.
 */
export function stepPlane(plane, stick, throttleDelta, wind, course, dt) {
  const p = plane;
  p.throttle = clamp(p.throttle + throttleDelta * dt * 0.7, 0, 1);
  // The stick asks; the airframe answers at a limited rate.
  const targetPitch = clamp(stick.pitch, -1, 1) * PLANE.maxPitch;
  const targetRoll = clamp(stick.roll, -1, 1) * PLANE.maxRoll;
  const authority = p.speed < PLANE.stallSpeed ? 0.35 + (p.speed / PLANE.stallSpeed) * 0.65 : 1;
  p.pitch = angleLerp(p.pitch, targetPitch, Math.min(1, PLANE.pitchRate * authority * dt * 2.2));
  p.roll = angleLerp(p.roll, targetRoll, Math.min(1, PLANE.rollRate * dt * 2.2));
  p.stalled = p.airborne && p.speed < PLANE.stallSpeed;

  // Speed chases the throttle; flaps trade speed for lift on approach.
  const top = PLANE.minSpeed + p.throttle * (PLANE.maxSpeed - PLANE.minSpeed);
  const flapDrag = p.flaps ? 8 : 0;
  p.speed += clamp(top - flapDrag - p.speed, -26 * dt, 18 * dt);
  if (p.stalled) p.pitch = angleLerp(p.pitch, -0.15, Math.min(1, 1.2 * dt));

  // A banked turn: the nose follows the roll. Banking left (roll < 0)
  // turns the heading toward the west, banking right toward the east.
  const turnRate = Math.sin(p.roll) * (p.speed / 55) * 0.55;
  p.heading += turnRate * dt;
  // The wind pushes the whole plane sideways.
  const windX = wind * 14 * dt;
  const fx = Math.sin(p.heading);
  const fz = -Math.cos(p.heading);
  const climb = Math.sin(p.pitch) * p.speed;
  const lift = p.airborne ? 1 : 0;
  p.verticalSpeed = lift * clamp(climb, -PLANE.maxClimb - 6, PLANE.maxClimb);
  if (p.stalled) p.verticalSpeed = Math.min(p.verticalSpeed, -7);
  p.x += fx * p.speed * dt + windX;
  p.z += fz * p.speed * dt;
  p.y += p.verticalSpeed * dt;

  // Fuel burns with throttle; empty tanks end the flight.
  p.fuel -= dt * (0.35 + p.throttle * 0.65) / PLANE.fuelSeconds;
  if (p.fuel <= 0) {
    p.fuel = 0;
    return 'fuel';
  }

  const ground = heightAt(p.x, p.z);
  const wasAirborne = p.airborne;
  if (!p.airborne && p.speed >= TAKEOFF_SPEED && p.pitch > -0.05) {
    p.airborne = true;
    p.onGround = false;
    return 'takeoff';
  }
  if (p.airborne && p.y <= ground + 2) {
    const gentle = Math.abs(p.roll) < PLANE.landMaxRoll && p.verticalSpeed > -PLANE.landMaxSink && p.speed < PLANE.landMaxSpeed;
    if (onRunway(p.x, p.z) && gentle) {
      p.y = ground + 2;
      p.onGround = true;
      p.airborne = false;
      return 'landed';
    }
    return 'crash';
  }
  if (!p.airborne) {
    p.y = ground + 2;
    p.onGround = true;
  } else if (wasAirborne && p.stalled && p.verticalSpeed < -8) {
    return 'stall';
  }

  // Rings: pass through the centre, or fly past and lose it.
  const ring = nextRing(course);
  if (ring) {
    const dx = p.x - ring.x;
    const dy = p.y - ring.y;
    const dz = p.z - ring.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < RING_PASS_RADIUS(ring)) {
      ring.passed = true;
      return 'ring';
    }
    // Past the ring's plane and well beyond it: missed.
    const ahead = (p.x - ring.x) * fx + (p.z - ring.z) * fz;
    if (ahead > 0 && dist > 170) {
      ring.missed = true;
      return 'miss';
    }
  }
  return null;
}

function RING_PASS_RADIUS(ring) {
  return ring.radius * 0.85;
}

/** Knots for the HUD, from metres per second. */
export function knots(speed) {
  return Math.round(speed * 1.94384);
}

/** Heading in degrees, 0 = north, clockwise. */
export function headingDegrees(heading) {
  let d = (-heading * 180) / Math.PI;
  d = ((d % 360) + 360) % 360;
  return Math.round(d);
}

/** How far the plane is from the next ring, for the HUD arrow. */
export function distanceToRing(plane, ring) {
  if (!ring) return 0;
  const dx = ring.x - plane.x;
  const dy = ring.y - plane.y;
  const dz = ring.z - plane.z;
  return Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz));
}

export function ringsScored(course) {
  return ringsDone(course);
}
