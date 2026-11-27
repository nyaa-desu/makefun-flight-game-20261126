// Skyhook Run — deterministic screenshot poses: each one flies the real
// rules forward from a seeded state with a small autopilot, then freezes
// the clock, so a capture shows the game itself rendering a real flight.

import { MISSIONS } from './config.js';
import { buildCourse, missionById, nextRing } from './course.js';
import { freshPlane, stepPlane } from './flight.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_OVER } from './render.js';

const STEP = 1 / 60;

/** Steer toward the next ring: bank into the bearing, pitch to its height. */
function autopilot(game) {
  const plane = game.plane;
  const ring = nextRing(game.course);
  if (!ring) return { pitch: 0, roll: 0, throttleDelta: 0 };
  const dx = ring.x - plane.x;
  const dz = ring.z - plane.z;
  const bearing = Math.atan2(dx, -dz);
  let rel = bearing - plane.heading;
  while (rel > Math.PI) rel -= Math.PI * 2;
  while (rel < -Math.PI) rel += Math.PI * 2;
  const roll = Math.max(-1, Math.min(1, rel * 1.6));
  const dy = ring.y - plane.y;
  const pitch = Math.max(-0.6, Math.min(0.6, dy / 220));
  return { pitch, roll, throttleDelta: plane.speed < 58 ? 1 : 0 };
}

/** Run the real flight model forward for `seconds`, steered by autopilot. */
function flyForward(game, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const stick = autopilot(game);
    const event = stepPlane(game.plane, stick, stick.throttleDelta, 0, game.course, STEP);
    if (event === 'ring') {
      game.combo += 1;
      game.bestCombo = Math.max(game.bestCombo, game.combo);
      game.score += 100 * game.mission.scoreMult * game.combo;
    } else if (event === 'crash' || event === 'landed' || event === 'fuel') {
      break;
    }
    game.flown += STEP;
  }
}

function setUpMission(game, missionId) {
  const mission = missionById(missionId);
  game.mission = mission;
  game.course = buildCourse(mission);
  game.plane = freshPlane();
  game.score = 0;
  game.combo = 0;
  game.timeLeft = mission.timeLimit;
  game.flown = 0;
  game.mode = SCREEN_PLAY;
}

// The cover: mid-course, chase view, a gold ring dead ahead over the
// river valley, three rings already banked.
export function shotCover(game) {
  setUpMission(game, 'rally');
  const plane = game.plane;
  plane.throttle = 0.85;
  plane.speed = 58;
  plane.y = 210;
  // Fly forward until the plane is closing on ring 4.
  flyForward(game, 55);
  game.timeLeft = Math.max(60, missionTime(game) - game.flown);
  game.camera = 'chase';
  game.message = '';
  game.messageT = 0;
}

function missionTime(game) {
  return game.mission.timeLimit;
}

// The title screen over the dawn valley.
export function shotTitle(game) {
  setUpMission(game, 'rally');
  const plane = game.plane;
  plane.x = 0;
  plane.y = 320;
  plane.z = 1500;
  plane.heading = 0.12;
  plane.pitch = -0.06;
  game.mode = SCREEN_TITLE;
  game.camera = 'chase';
}

// Cockpit view: instruments lit, the next ring framed by the panel.
export function shotCockpit(game) {
  setUpMission(game, 'storm');
  const plane = game.plane;
  plane.throttle = 0.9;
  plane.speed = 62;
  plane.y = 240;
  flyForward(game, 45);
  game.timeLeft = Math.max(60, game.mission.timeLimit - game.flown);
  game.camera = 'cockpit';
  game.message = '';
  game.messageT = 0;
}

// The end screen: wheels down on Runway 27 after a full course.
export function shotEnd(game) {
  setUpMission(game, 'rally');
  const plane = game.plane;
  plane.throttle = 0.6;
  plane.speed = 40;
  plane.y = 200;
  flyForward(game, 95);
  // Bring her home: park on the strip, score the landing by hand so the
  // frame shows the end screen, not a mid-air pause.
  // Park just short of the threshold, so the strip, its dashes and the
  // big 27 all read ahead of the plane in the frame.
  game.plane.x = 0;
  game.plane.y = 42;
  game.plane.z = 120;
  game.plane.heading = 0;
  game.plane.roll = 0;
  game.plane.pitch = 0;
  game.plane.speed = 12;
  game.plane.fuel = 0.31;
  game.plane.airborne = false;
  game.plane.onGround = true;
  const done = game.course.rings.filter((r) => r.passed).length;
  game.score += 500 + Math.round(game.plane.fuel * 200);
  game.mode = SCREEN_OVER;
  game.endKind = 'landed';
  game.endLine = `${done} rings flown — and a landing the tower would applaud.`;
  if (game.score > game.best) game.best = game.score;
  game.camera = 'chase';
}

export function applyShot(game, name) {
  if (name === 'cover') shotCover(game);
  else if (name === 'title') shotTitle(game);
  else if (name === 'cockpit') shotCockpit(game);
  else if (name === 'end') shotEnd(game);
  else return false;
  game.frozen = true;
  return true;
}
