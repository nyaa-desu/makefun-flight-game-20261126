// Skyhook Run v2 — the loop: title, flight, pause, end. One flight
// object, one radio, one input set; the renderers draw whatever state
// the flight is in. ?shot=<name> renders a single staged frame instead
// of playing — that is how the screenshots are taken.

import { MISSIONS, TUNE } from './config.js';
import { newFlight, startFlight, stepFlight } from './flight.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRadio } from './radio.js';
import { drawChase } from './render.js';
import { drawCockpit } from './cockpit.js';
import {
  drawTopBar,
  drawSidePanel,
  drawBottomBar,
  drawFeedback,
  drawTitle,
  drawEnd,
  drawPause,
} from './hud.js';
import { stagedShot } from './shots.js';
import { valueNoise } from './random.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// ---- crosswind: a mission base wind plus gusts that breathe ----

function windAt(missionIndex, elapsed) {
  const m = MISSIONS[missionIndex];
  const gust = (valueNoise(elapsed * 0.5, 0, 3, 5) - 0.5) * m.gust;
  const sway = Math.sin(elapsed * 0.7) * m.baseWind * 0.4;
  return m.baseWind + sway + gust;
}

// ---- the game ----

const input = createInput(canvas);
const audio = createAudio();
const radio = createRadio();

let flight = newFlight(0);
let cameraMode = 'chase'; // chase | cockpit
let muted = false;
let lastHandledEvent = null;
let rafId = 0;
let lastTs = 0;

function handleEvent(ev) {
  if (!ev || ev === lastHandledEvent) return;
  lastHandledEvent = ev;
  radio.say(ev.kind, ev);
  if (ev.kind === 'ring' || ev.kind === 'finalRing') audio.ring(flight.combo);
  if (ev.kind === 'landed' || ev.kind === 'crash') audio.thud();
}

function render(timeSeconds, nowMs) {
  const W = canvas.width;
  const H = canvas.height;
  const storm = flight.mission === 2;
  if (cameraMode === 'cockpit') {
    drawCockpit(ctx, flight, W, H, timeSeconds, storm);
  } else {
    drawChase(ctx, flight, W, H, timeSeconds, storm);
  }
  if (flight.status === 'ready') {
    drawTitle(ctx, flight, W, H, timeSeconds);
    return;
  }
  drawTopBar(ctx, flight, W, H);
  if (cameraMode === 'chase') drawSidePanel(ctx, flight, W, H, radio);
  drawBottomBar(ctx, flight, W, H, muted);
  drawFeedback(ctx, flight, W, H, nowMs);
  if (flight.status === 'paused') drawPause(ctx, W, H);
  if (flight.status === 'landed' || flight.status === 'crashed' || flight.status === 'outoffuel') {
    drawEnd(ctx, flight, W, H);
  }
}

function tick(ts) {
  const dt = Math.min(0.05, Math.max(0, (ts - lastTs) / 1000 || 0.016));
  lastTs = ts;
  const nowMs = performance.now();
  const timeSeconds = flight.elapsed;

  // One-shot keys.
  if (input.wasPressed('Enter')) {
    audio.unlock();
    if (flight.status === 'ready') startFlight(flight);
  }
  if (input.wasPressed('KeyR')) {
    flight = newFlight(flight.mission);
    lastHandledEvent = null;
    radio.log.length = 0;
    if (flight.status === 'ready') startFlight(flight);
  }
  if (input.wasPressed('KeyP') && flight.status === 'flying') flight.status = 'paused';
  else if (input.wasPressed('KeyP') && flight.status === 'paused') flight.status = 'flying';
  if (input.wasPressed('KeyC')) cameraMode = cameraMode === 'chase' ? 'cockpit' : 'chase';
  if (input.wasPressed('KeyM')) muted = audio.toggleMute();
  if (input.wasPressed('Digit1') || input.wasPressed('Numpad1')) flight = newFlight(0);
  if (input.wasPressed('Digit2') || input.wasPressed('Numpad2')) flight = newFlight(1);
  if (input.wasPressed('Digit3') || input.wasPressed('Numpad3')) flight = newFlight(2);
  input.clearPressed();

  // Flaps toggle on F.
  if (input.keys.has('KeyF') && !tick.flapHeld) {
    flight.flaps = !flight.flaps;
    tick.flapHeld = true;
  }
  if (!input.keys.has('KeyF')) tick.flapHeld = false;

  // Step the flight.
  if (flight.status === 'flying') {
    const axes = input.axes();
    const wind = windAt(flight.mission, flight.elapsed);
    stepFlight(flight, axes, wind, dt);
    handleEvent(flight.lastEvent);
    audio.update(flight.throttle, flight.speed, true);
  } else {
    audio.update(0, 0, false);
  }

  render(timeSeconds, nowMs);
  rafId = requestAnimationFrame(tick);
}

// ---- shot mode: one staged frame, no loop ----

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
if (shotName) {
  const staged = stagedShot(shotName);
  if (staged) {
    flight = staged.flight;
    cameraMode = staged.camera;
    // Seed Mara's line for this moment so the radio log is alive.
    radio.say(flight.lastEvent?.kind, flight.lastEvent);
    const W = canvas.width;
    const H = canvas.height;
    const storm = staged.storm;
    if (cameraMode === 'cockpit') {
      drawCockpit(ctx, flight, W, H, staged.time, storm);
    } else {
      drawChase(ctx, flight, W, H, staged.time, storm);
    }
    if (flight.status === 'landed') {
      drawEnd(ctx, flight, W, H);
    } else {
      drawTopBar(ctx, flight, W, H);
      if (cameraMode === 'chase') drawSidePanel(ctx, flight, W, H, radio);
      drawBottomBar(ctx, flight, W, H, false);
      drawFeedback(ctx, flight, W, H, staged.nowMs);
    }
    document.title = `Skyhook Run — ${shotName}`;
  }
} else {
  rafId = requestAnimationFrame(tick);
}
