// Skyhook Run — the game: states, the loop, scoring and the screenshot
// hook. One canvas, one requestAnimationFrame, no network anywhere.

import { MISSIONS, RING, RUNWAY, WORLD } from './config.js';
import { buildCourse, missionById, nextRing, ringsDone, ringsMissed } from './course.js';
import { freshPlane, stepPlane } from './flight.js';
import { createInput, readStick, wasPressed, takeClick } from './input.js';
import { createAudio } from './audio.js';
import { drawGame, SCREEN_TITLE, SCREEN_PLAY, SCREEN_OVER, SCREEN_PAUSE } from './render.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function fitCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(canvas.clientWidth * dpr);
  canvas.height = Math.floor(canvas.clientHeight * dpr);
}

export function createGame() {
  const mission = MISSIONS[0];
  const game = {
    mode: SCREEN_TITLE,
    missions: MISSIONS,
    mission,
    course: buildCourse(mission),
    plane: freshPlane(),
    camera: 'chase',
    score: 0,
    combo: 0,
    bestCombo: 0,
    timeLeft: mission.timeLimit,
    flown: 0,
    best: 0,
    message: '',
    messageT: 0,
    endKind: '',
    endLine: '',
    frozen: false,
    hover: null,
    missionBoxes: [],
    audio: createAudio(),
    warnT: 0,
  };
  return game;
}

function startMission(game, mission) {
  game.mission = mission;
  game.course = buildCourse(mission);
  game.plane = freshPlane();
  game.score = 0;
  game.combo = 0;
  game.bestCombo = 0;
  game.timeLeft = mission.timeLimit;
  game.flown = 0;
  game.message = '';
  game.messageT = 0;
  game.endKind = '';
  game.mode = SCREEN_PLAY;
  game.audio.startEngine();
}

function endFlight(game, kind) {
  game.mode = SCREEN_OVER;
  game.endKind = kind;
  const done = ringsDone(game.course);
  const missed = ringsMissed(game.course);
  const fuelBonus = Math.round(game.plane.fuel * 200);
  if (kind === 'landed') {
    game.score += 500 + fuelBonus + Math.max(0, Math.round(game.timeLeft)) * 2;
    game.endLine = `All ${done} rings flown, ${missed} missed — and a landing the tower would applaud.`;
  } else if (kind === 'fuel') {
    game.endLine = 'The tanks ran dry over the valley. The Kestrel glided down where she could.';
  } else if (kind === 'time') {
    game.endLine = 'The clock ran out with the runway still ahead. Next time, fly the direct line.';
  } else {
    game.endLine = `The valley wins this one — ${done} rings banked before the ground arrived.`;
  }
  if (game.score > game.best) game.best = game.score;
  try {
    localStorage.setItem('skyhook-best', String(game.best));
  } catch { /* storage may be off; the best score is a bonus, not a need */ }
  if (kind === 'landed') game.audio.land();
  else game.audio.crash();
  game.audio.stopEngine();
}

function scoreRing(game, ring) {
  game.combo += 1;
  game.bestCombo = Math.max(game.bestCombo, game.combo);
  const points = RING.points * game.mission.scoreMult * game.combo;
  game.score += points;
  game.plane.fuel = Math.min(1, game.plane.fuel + game.mission.ringFuel);
  game.message = `RING ${ring.index + 1}  +${points}`;
  game.messageT = 1.6;
  game.audio.ring();
}

function stepGame(game, dt, input) {
  if (game.mode !== SCREEN_PLAY) return;
  const stick = readStick(input);
  // Wind: a steady push plus gusts that breathe with the clock.
  const t = game.flown;
  const gust = game.mission.gust * Math.sin(t * 0.9) * Math.sin(t * 0.37 + 1.7);
  const wind = game.mission.wind + gust;
  const event = stepPlane(game.plane, stick, stick.throttleDelta, wind, game.course, dt);
  game.flown += dt;
  game.timeLeft -= dt;
  if (game.messageT > 0) game.messageT -= dt;
  game.audio.setFlight(game.plane.throttle, game.plane.speed);
  if (game.plane.fuel < 0.2 && game.warnT <= 0) {
    game.audio.warn();
    game.warnT = 1.2;
  }
  if (game.warnT > 0) game.warnT -= dt;
  if (event === 'takeoff') {
    game.message = 'AIRBORNE — FLY THE RINGS';
    game.messageT = 2;
  } else if (event === 'ring') {
    // The last ring the course marked passed is the one just flown.
    const last = [...game.course.rings].reverse().find((r) => r.passed);
    if (last) scoreRing(game, last);
  } else if (event === 'miss') {
    game.combo = 0;
    game.message = 'RING MISSED — COMBO LOST';
    game.messageT = 1.6;
    game.audio.miss();
  } else if (event === 'crash') {
    endFlight(game, 'crash');
    return;
  } else if (event === 'landed') {
    endFlight(game, 'landed');
    return;
  } else if (event === 'fuel') {
    endFlight(game, 'fuel');
    return;
  }
  if (game.timeLeft <= 0) {
    game.timeLeft = 0;
    endFlight(game, game.plane.airborne ? 'time' : 'fuel');
  }
  // The next ring is always ahead: if the course is done, point home.
  if (!nextRing(game.course) && game.plane.airborne) {
    const d = Math.hypot(game.plane.x - RUNWAY.centreX, game.plane.z - (RUNWAY.centreZ - RUNWAY.length / 2));
    if (d < 900 && game.messageT <= 0) {
      game.message = 'COURSE CLEAR — LAND ON RUNWAY 27';
      game.messageT = 2;
    }
  }
}

function handleKeys(game, input) {
  if (wasPressed(input, 'KeyM')) game.audio.toggleMute();
  if (game.mode === SCREEN_TITLE) {
    for (const m of game.missions) {
      if (wasPressed(input, `Digit${m.key}`) || wasPressed(input, `Numpad${m.key}`)) {
        game.audio.click();
        startMission(game, m);
        return;
      }
    }
    if (wasPressed(input, 'Enter') || wasPressed(input, 'Space')) {
      game.audio.click();
      startMission(game, game.mission);
    }
    return;
  }
  if (game.mode === SCREEN_PLAY) {
    if (wasPressed(input, 'KeyP') || wasPressed(input, 'Escape')) {
      game.mode = SCREEN_PAUSE;
      return;
    }
    if (wasPressed(input, 'KeyC')) {
      game.camera = game.camera === 'cockpit' ? 'chase' : 'cockpit';
      game.audio.click();
    }
    if (wasPressed(input, 'KeyF')) {
      game.plane.flaps = !game.plane.flaps;
      game.audio.click();
    }
  } else if (game.mode === SCREEN_PAUSE) {
    if (wasPressed(input, 'KeyP') || wasPressed(input, 'Escape')) game.mode = SCREEN_PLAY;
    if (wasPressed(input, 'KeyR')) startMission(game, game.mission);
  } else if (game.mode === SCREEN_OVER) {
    if (wasPressed(input, 'KeyR') || wasPressed(input, 'Enter') || wasPressed(input, 'Space')) {
      startMission(game, game.mission);
    }
  }
  if (wasPressed(input, 'KeyR') && game.mode === SCREEN_PLAY) startMission(game, game.mission);
}

function handleClick(game, input) {
  const click = takeClick(input);
  if (!click) return;
  game.audio.startEngine();
  if (game.mode === SCREEN_TITLE) {
    for (const box of game.missionBoxes) {
      if (click.x >= box.x && click.x <= box.x + box.w && click.y >= box.y && click.y <= box.y + box.h) {
        game.audio.click();
        startMission(game, box.mission);
        return;
      }
    }
    return;
  }
  if (game.mode === SCREEN_OVER) startMission(game, game.mission);
}

export function boot() {
  fitCanvas();
  window.addEventListener('resize', fitCanvas);
  const game = createGame();
  try {
    const saved = Number(localStorage.getItem('skyhook-best'));
    if (Number.isFinite(saved) && saved > 0) game.best = saved;
  } catch { /* no storage, no best score */ }
  const input = createInput(canvas);
  window.__game = game;
  // Deterministic screenshot poses: ?shot=cover|title|cockpit|end
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot) {
    if (applyShot(game, shot)) {
      fitCanvas();
      drawGame(ctx, game);
      return game;
    }
  }
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    game.hover = input.mouseActive ? { x: input.mousePx, y: input.mousePy } : null;
    handleKeys(game, input);
    handleClick(game, input);
    if (!game.frozen) stepGame(game, dt, input);
    drawGame(ctx, game);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return game;
}

boot();
