// Skyhook Run — the renderer, part one: a small 3D projector and the
// world it draws — sky, valley, runway, town, clouds and rings.
// Everything is drawn with the Canvas 2D API; there are no images.

import { VIEW, SKY, RUNWAY, WORLD } from './config.js';
import { heightAt, groundColour, onRunway, townBuildings, treeSpots, cloudPuffs, riverX } from './terrain.js';
import { valueNoise } from './random.js';
import { nextRing } from './course.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';
export const SCREEN_PAUSE = 'pause';

// ---- projection -------------------------------------------------------

function rotatePoint(px, py, pz, sin, cos) {
  return { x: px * cos - pz * sin, y: py, z: px * sin + pz * cos };
}

/**
 * Build a camera from the plane: chase view sits behind and above the
 * Kestrel, cockpit view sits in her nose. Returns the projector.
 */
export function makeCamera(plane, mode, width, height) {
  const focal = (height / 2) / Math.tan(VIEW.fov / 2);
  const fx = Math.sin(plane.heading);
  const fz = -Math.cos(plane.heading);
  let cx;
  let cy;
  let cz;
  let lookX;
  let lookY;
  let lookZ;
  if (mode === 'cockpit') {
    cx = plane.x + fx * 1.2;
    cy = plane.y + VIEW.cockpitUp;
    cz = plane.z + fz * 1.2;
    lookX = plane.x + fx * 60;
    lookY = plane.y + Math.sin(plane.pitch) * 60;
    lookZ = plane.z + fz * 60;
  } else {
    cx = plane.x - fx * VIEW.chaseBack + Math.sin(plane.heading + Math.PI / 2) * Math.sin(plane.roll) * 3;
    cy = plane.y + VIEW.chaseUp;
    cz = plane.z - fz * VIEW.chaseBack;
    lookX = plane.x + fx * 40;
    lookY = plane.y - 2 + Math.sin(plane.pitch) * 30;
    lookZ = plane.z + fz * 40;
  }
  // Yaw from the look direction, pitch from its slope, roll from the bank.
  const dx = lookX - cx;
  const dy = lookY - cy;
  const dz = lookZ - cz;
  const yaw = Math.atan2(dx, -dz);
  const pitch = Math.atan2(dy, Math.hypot(dx, dz));
  const roll = mode === 'cockpit' ? plane.roll : plane.roll * 0.35;
  const cyaw = Math.cos(-yaw);
  const syaw = Math.sin(-yaw);
  const cpitch = Math.cos(-pitch);
  const spitch = Math.sin(-pitch);
  const croll = Math.cos(-roll);
  const sroll = Math.sin(-roll);

  function project(x, y, z) {
    let px = x - cx;
    let py = y - cy;
    let pz = z - cz;
    let r = rotatePoint(px, py, pz, syaw, cyaw);
    px = r.x; py = r.y; pz = r.z;
    // Pitch around the camera's x axis.
    const py2 = py * cpitch - pz * spitch;
    const pz2 = py * spitch + pz * cpitch;
    py = py2; pz = pz2;
    // Roll around the view axis.
    const px2 = px * croll - py * sroll;
    const py3 = px * sroll + py * croll;
    px = px2; py = py3;
    const depth = -pz;
    if (depth < 0.5) return null;
    const s = focal / depth;
    return { x: width / 2 + px * s, y: height / 2 - py * s, s, depth };
  }
  return { project, pitch, focal, width, height };
}

// ---- sky ---------------------------------------------------------------

function drawSky(ctx, camera, plane, mission, time) {
  const { width, height } = camera;
  const g = ctx.createLinearGradient(0, 0, 0, height);
  const storm = mission.id === 'storm' ? 0.55 : 0;
  g.addColorStop(0, mixColour(SKY.horizonTop, '#3a3a4a', storm));
  g.addColorStop(0.45, mixColour(SKY.horizonMid, '#8a7a72', storm));
  g.addColorStop(0.62, SKY.horizonLow);
  g.addColorStop(1, '#c8b490');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
  // The sun sits low ahead of the runway, where the course runs.
  const sun = camera.project(plane.x + Math.sin(plane.heading) * 4000, 900, plane.z - Math.cos(plane.heading) * 4000);
  if (sun) {
    ctx.fillStyle = SKY.sun;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function mixColour(a, b, t) {
  const na = parseInt(a.slice(1), 16);
  const nb = parseInt(b.slice(1), 16);
  const r = Math.round(((na >> 16) & 255) * (1 - t) + ((nb >> 16) & 255) * t);
  const gg = Math.round(((na >> 8) & 255) * (1 - t) + ((nb >> 8) & 255) * t);
  const bb = Math.round((na & 255) * (1 - t) + (nb & 255) * t);
  return `rgb(${r},${gg},${bb})`;
}

// ---- distant mountains ----------------------------------------------------

/**
 * A hazy mountain ridge at the horizon, drawn in screen space from the
 * camera's pitch and heading, so it pans as the pilot looks around. It
 * hides the hard edge where the near terrain grid runs out and gives the
 * valley a far wall on every side.
 */
function drawFarRidge(ctx, camera, plane) {
  const { width, height } = camera;
  const horizonY = height / 2 - Math.tan(camera.pitch) * camera.focal;
  if (horizonY < -260 || horizonY > height + 260) return;
  const layers = [
    { colour: 'rgba(125,138,168,0.55)', scale: 1.5, base: 46 },
    { colour: 'rgba(85,100,138,0.8)', scale: 1, base: 26 },
  ];
  for (const layer of layers) {
    ctx.fillStyle = layer.colour;
    ctx.beginPath();
    ctx.moveTo(-40, horizonY + 30);
    for (let sx = -40; sx <= width + 40; sx += 24) {
      const angle = plane.heading + (sx - width / 2) / camera.focal;
      const n = valueNoise(angle * 6, 3, 220, WORLD.seed + 41);
      const n2 = valueNoise(angle * 17, 9, 90, WORLD.seed + 43);
      const peak = layer.base + (n * 0.5 + 0.5) * 88 * layer.scale + (n2 * 0.5 + 0.5) * 30;
      ctx.lineTo(sx, horizonY - peak);
    }
    ctx.lineTo(width + 40, horizonY + 30);
    ctx.closePath();
    ctx.fill();
  }
}

// ---- terrain -----------------------------------------------------------

function drawTerrain(ctx, camera, plane) {
  const step = 90;
  const range = 1500;
  const half = 900;
  const fx = Math.sin(plane.heading);
  const fz = -Math.cos(plane.heading);
  const rx = Math.cos(plane.heading);
  const rz = Math.sin(plane.heading);
  const cells = [];
  for (let a = 40; a <= range; a += step) {
    for (let b = -half; b <= half; b += step) {
      const x = plane.x + fx * a + rx * b;
      const z = plane.z + fz * a + rz * b;
      if (x < -WORLD.halfWidth - 200 || x > WORLD.halfWidth + 200) continue;
      if (z < WORLD.north - 200 || z > WORLD.south + 200) continue;
      cells.push({ x, z, a, b });
    }
  }
  // Far first, near last: the painter's order.
  cells.sort((m, n) => n.a - m.a);
  for (const cell of cells) {
    const { x, z } = cell;
    const h00 = heightAt(x, z);
    const h10 = heightAt(x + step, z);
    const h01 = heightAt(x, z + step);
    const h11 = heightAt(x + step, z + step);
    const flat = h00 < 4 && h10 < 4 && h01 < 4 && h11 < 4;
    const y00 = flat ? WORLD.waterLevel : h00;
    const y10 = flat ? WORLD.waterLevel : h10;
    const y01 = flat ? WORLD.waterLevel : h01;
    const y11 = flat ? WORLD.waterLevel : h11;
    const p00 = camera.project(x, y00, z);
    const p10 = camera.project(x + step, y10, z);
    const p01 = camera.project(x, y01, z + step);
    const p11 = camera.project(x + step, y11, z + step);
    if (!p00 || !p10 || !p01 || !p11) continue;
    const slope = (h10 + h01 - h00 - h11) / step;
    ctx.fillStyle = groundColour(x + step / 2, z + step / 2, (h00 + h10 + h01 + h11) / 4, slope);
    ctx.beginPath();
    ctx.moveTo(p00.x, p00.y);
    ctx.lineTo(p10.x, p10.y);
    ctx.lineTo(p11.x, p11.y);
    ctx.lineTo(p01.x, p01.y);
    ctx.closePath();
    ctx.fill();
  }
  drawRunway(ctx, camera);
  drawTown(ctx, camera);
  drawTrees(ctx, camera, plane);
  drawClouds(ctx, camera, plane);
}

function drawRunway(ctx, camera) {
  const half = RUNWAY.width / 2;
  const z0 = RUNWAY.centreZ - RUNWAY.length / 2;
  const z1 = RUNWAY.centreZ + RUNWAY.length / 2;
  const y = WORLD.fieldHeight + 0.6;
  const corners = [
    camera.project(RUNWAY.centreX - half, y, z0),
    camera.project(RUNWAY.centreX + half, y, z0),
    camera.project(RUNWAY.centreX + half, y, z1),
    camera.project(RUNWAY.centreX - half, y, z1),
  ];
  if (corners.some((p) => !p)) return;
  ctx.fillStyle = SKY.runway;
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  corners.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.closePath();
  ctx.fill();
  // Centreline dashes and the big 27 at the threshold.
  ctx.strokeStyle = SKY.runwayMark;
  ctx.lineWidth = 2;
  for (let z = z0 + 40; z < z1 - 20; z += 90) {
    const a = camera.project(RUNWAY.centreX, y + 0.2, z);
    const b = camera.project(RUNWAY.centreX, y + 0.2, z + 44);
    if (!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  const num = camera.project(RUNWAY.centreX, y + 0.2, z0 + 60);
  if (num && num.s > 0.4) {
    ctx.fillStyle = SKY.runwayMark;
    ctx.font = `bold ${Math.max(10, num.s * 26)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('27', num.x, num.y);
  }
}

const TOWN = townBuildings();
const TREES = treeSpots();
const CLOUDS = cloudPuffs();

function drawTown(ctx, camera) {
  for (const b of TOWN) {
    const y0 = heightAt(b.x, b.z);
    const y1 = y0 + b.h;
    const c = [
      camera.project(b.x - b.w / 2, y0, b.z - b.d / 2),
      camera.project(b.x + b.w / 2, y0, b.z - b.d / 2),
      camera.project(b.x + b.w / 2, y1, b.z - b.d / 2),
      camera.project(b.x - b.w / 2, y1, b.z - b.d / 2),
      camera.project(b.x + b.w / 2, y0, b.z + b.d / 2),
      camera.project(b.x + b.w / 2, y1, b.z + b.d / 2),
    ];
    if (c.some((p) => !p)) continue;
    ctx.fillStyle = b.warm ? '#8a6f5c' : '#6f7d8a';
    ctx.beginPath();
    ctx.moveTo(c[0].x, c[0].y);
    ctx.lineTo(c[1].x, c[1].y);
    ctx.lineTo(c[2].x, c[2].y);
    ctx.lineTo(c[3].x, c[3].y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5a5148';
    ctx.beginPath();
    ctx.moveTo(c[1].x, c[1].y);
    ctx.lineTo(c[4].x, c[4].y);
    ctx.lineTo(c[5].x, c[5].y);
    ctx.lineTo(c[2].x, c[2].y);
    ctx.closePath();
    ctx.fill();
    // Lit windows: warm squares on the front face.
    if (b.warm) {
      ctx.fillStyle = '#ffd98a';
      const wx = (c[0].x + c[1].x) / 2;
      const wy = (c[0].y + c[2].y) / 2;
      const ws = Math.max(2, c[2].s * 2.5);
      ctx.fillRect(wx - ws / 2, wy - ws / 2, ws, ws);
    }
  }
}

function drawTrees(ctx, camera, plane) {
  ctx.fillStyle = SKY.forest;
  for (const t of TREES) {
    const dx = t.x - plane.x;
    const dz = t.z - plane.z;
    if (dx * dx + dz * dz > 900 * 900) continue;
    const y = heightAt(t.x, t.z);
    const base = camera.project(t.x, y, t.z);
    const top = camera.project(t.x, y + t.s, t.z);
    if (!base || !top) continue;
    const w = Math.max(2, base.s * t.s * 0.45);
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(base.x - w, base.y);
    ctx.lineTo(base.x + w, base.y);
    ctx.closePath();
    ctx.fill();
  }
}

function drawClouds(ctx, camera, plane) {
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (const c of CLOUDS) {
    const p = camera.project(c.x, c.y, c.z);
    if (!p) continue;
    const r = Math.max(4, p.s * c.r * 0.5);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r, r * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---- rings ---------------------------------------------------------------

function drawRingShape(ctx, camera, ring, colour, width) {
  const points = [];
  const steps = 28;
  for (let i = 0; i <= steps; i += 1) {
    const a = (i / steps) * Math.PI * 2;
    // Rings stand vertical, facing the course direction.
    const px = ring.x + Math.cos(a) * ring.radius;
    const py = ring.y + Math.sin(a) * ring.radius;
    const p = camera.project(px, py, ring.z);
    if (p) points.push(p);
  }
  if (points.length < 4) return;
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
  ctx.stroke();
}

export function drawRings(ctx, camera, course) {
  const target = nextRing(course);
  for (const ring of course.rings) {
    if (ring.passed) continue;
    const centre = camera.project(ring.x, ring.y, ring.z);
    if (!centre) continue;
    if (ring.missed) {
      drawRingShape(ctx, camera, ring, 'rgba(200,80,60,0.35)', 2);
      continue;
    }
    if (ring === target) {
      drawRingShape(ctx, camera, ring, 'rgba(255,190,80,0.9)', Math.max(3, centre.s * 3));
      drawRingShape(ctx, camera, { ...ring, radius: ring.radius * 0.72 }, 'rgba(255,220,140,0.55)', 2);
      ctx.fillStyle = '#ffe9b0';
      ctx.font = `bold ${Math.max(12, centre.s * 16)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`RING ${ring.index + 1}`, centre.x, centre.y - centre.s * ring.radius - 12);
    } else {
      drawRingShape(ctx, camera, ring, 'rgba(140,200,255,0.5)', 2);
    }
  }
}

// ---- the aircraft ---------------------------------------------------------

export function drawPlaneChase(ctx, camera, plane) {
  const { width, height } = camera;
  const cx = width / 2;
  const cy = height * 0.62;
  const s = Math.min(width, height) / 560;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(plane.roll * 0.9);
  ctx.scale(s, s);
  // Propeller disc, blurred by speed.
  ctx.fillStyle = 'rgba(220,230,240,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, -6, 34, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  // Fuselage: a bush plane in cream and teal, with a lit cockpit.
  ctx.fillStyle = '#e8ddc4';
  ctx.beginPath();
  ctx.moveTo(0, -52);
  ctx.quadraticCurveTo(14, -30, 12, 6);
  ctx.quadraticCurveTo(10, 34, 0, 44);
  ctx.quadraticCurveTo(-10, 34, -12, 6);
  ctx.quadraticCurveTo(-14, -30, 0, -52);
  ctx.fill();
  ctx.fillStyle = '#2e7d7a';
  ctx.fillRect(-12, -8, 24, 10);
  // Wings and tail, banking with the roll.
  ctx.fillStyle = '#2e7d7a';
  ctx.beginPath();
  ctx.moveTo(-118, 2);
  ctx.lineTo(-10, -4);
  ctx.lineTo(-10, 14);
  ctx.lineTo(-118, 18);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(118, 2);
  ctx.lineTo(10, -4);
  ctx.lineTo(10, 14);
  ctx.lineTo(118, 18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c65a3a';
  ctx.beginPath();
  ctx.moveTo(-34, 34);
  ctx.lineTo(0, 26);
  ctx.lineTo(34, 34);
  ctx.lineTo(28, 46);
  ctx.lineTo(-28, 46);
  ctx.closePath();
  ctx.fill();
  // Cockpit glass, glowing warm.
  ctx.fillStyle = '#ffd98a';
  ctx.beginPath();
  ctx.ellipse(0, -26, 8, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  // Navigation lights.
  ctx.fillStyle = '#ff5a4a';
  ctx.beginPath();
  ctx.arc(-118, 10, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4aff7a';
  ctx.beginPath();
  ctx.arc(118, 10, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---- cockpit -------------------------------------------------------------

function drawCockpit(ctx, camera, plane) {
  const { width, height } = camera;
  // The nose and the panel frame the view.
  const g = ctx.createLinearGradient(0, height * 0.62, 0, height);
  g.addColorStop(0, 'rgba(40,44,54,0)');
  g.addColorStop(0.25, '#2b2f3a');
  g.addColorStop(1, '#1e2129');
  ctx.fillStyle = g;
  ctx.fillRect(0, height * 0.62, width, height * 0.38);
  // Nose cowling: a low dark shape, so it reads as the Kestrel's nose
  // and not as a hill on the horizon.
  ctx.fillStyle = '#1f4d4a';
  ctx.beginPath();
  ctx.moveTo(width / 2 - 44, height * 0.68);
  ctx.quadraticCurveTo(width / 2, height * 0.63, width / 2 + 44, height * 0.68);
  ctx.lineTo(width / 2 + 34, height * 0.7);
  ctx.lineTo(width / 2 - 34, height * 0.7);
  ctx.closePath();
  ctx.fill();
  drawGauge(ctx, width * 0.5, height * 0.86, 52, 'ATT', plane, 'attitude');
  drawGauge(ctx, width * 0.34, height * 0.86, 40, 'ALT', plane, 'alt');
  drawGauge(ctx, width * 0.66, height * 0.86, 40, 'SPD', plane, 'speed');
  drawGauge(ctx, width * 0.2, height * 0.88, 30, 'FUEL', plane, 'fuel');
  drawGauge(ctx, width * 0.8, height * 0.88, 30, 'THR', plane, 'throttle');
  // Compass strip across the panel top.
  ctx.fillStyle = '#14161c';
  ctx.fillRect(width * 0.32, height * 0.68, width * 0.36, 22);
  ctx.fillStyle = '#ffd98a';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  const hdg = Math.round(((-plane.heading * 180) / Math.PI % 360 + 360) % 360);
  ctx.fillText(`HDG ${String(hdg).padStart(3, '0')}°`, width * 0.5, height * 0.68 + 16);
}

function drawGauge(ctx, x, y, r, label, plane, kind) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#14161c';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd98a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffd98a';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, 0, -r - 6);
  if (kind === 'attitude') {
    // Artificial horizon: the ball rolls and pitches with the plane.
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r - 4, 0, Math.PI * 2);
    ctx.clip();
    ctx.rotate(plane.roll);
    ctx.translate(0, plane.pitch * r * 2.2);
    ctx.fillStyle = '#3a6ea8';
    ctx.fillRect(-r, -r, r * 2, r);
    ctx.fillStyle = '#8a6a42';
    ctx.fillRect(-r, 0, r * 2, r);
    ctx.restore();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r + 8, 0);
    ctx.lineTo(-8, 0);
    ctx.moveTo(8, 0);
    ctx.lineTo(r - 8, 0);
    ctx.stroke();
  } else if (kind === 'alt') {
    const frac = Math.min(1, plane.y / 600);
    needle(ctx, r, -Math.PI * 0.75 + frac * Math.PI * 1.5);
    ctx.fillStyle = '#e8f0f8';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(String(Math.round(plane.y)), 0, r * 0.45);
  } else if (kind === 'speed') {
    const frac = Math.min(1, plane.speed / 90);
    needle(ctx, r, -Math.PI * 0.75 + frac * Math.PI * 1.5);
    ctx.fillStyle = '#e8f0f8';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(String(Math.round(plane.speed * 1.94)), 0, r * 0.45);
  } else if (kind === 'fuel') {
    ctx.fillStyle = plane.fuel < 0.2 ? '#ff5a4a' : '#4aff7a';
    ctx.fillRect(-r + 6, -r + 6, (r * 2 - 12) * plane.fuel, 8);
    ctx.strokeStyle = '#5a6272';
    ctx.strokeRect(-r + 6, -r + 6, r * 2 - 12, 8);
  } else if (kind === 'throttle') {
    ctx.fillStyle = '#ffd98a';
    ctx.fillRect(-r + 6, -r + 6, (r * 2 - 12) * plane.throttle, 8);
    ctx.strokeStyle = '#5a6272';
    ctx.strokeRect(-r + 6, -r + 6, r * 2 - 12, 8);
  }
  ctx.restore();
}

function needle(ctx, r, angle) {
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.sin(angle) * (r - 8), -Math.cos(angle) * (r - 8));
  ctx.stroke();
}

// ---- HUD -----------------------------------------------------------------

export function drawHUD(ctx, camera, game) {
  const { width, height } = camera;
  const plane = game.plane;
  const target = nextRing(game.course);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  // Top-left instrument block: altitude, speed, heading, vertical speed.
  ctx.fillStyle = 'rgba(10,14,22,0.62)';
  roundRect(ctx, 14, 12, 264, 108, 10);
  ctx.fill();
  ctx.fillStyle = '#ffd98a';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(`ALT  ${Math.round(plane.y)} m`, 30, 38);
  ctx.fillText(`SPD  ${Math.round(plane.speed * 1.94)} kt`, 30, 62);
  const hdg = Math.round(((-plane.heading * 180) / Math.PI % 360 + 360) % 360);
  ctx.fillText(`HDG  ${String(hdg).padStart(3, '0')}°`, 30, 86);
  const vs = plane.verticalSpeed;
  ctx.fillStyle = vs < -6 ? '#ff8a7a' : '#9fd8ff';
  ctx.fillText(`V/S  ${vs >= 0 ? '+' : ''}${vs.toFixed(1)} m/s`, 30, 110);
  // Compass strip across the top.
  ctx.fillStyle = 'rgba(10,14,22,0.62)';
  ctx.fillRect(width / 2 - 150, 12, 300, 26);
  ctx.fillStyle = '#e8f0f8';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  const marks = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  for (let i = 0; i < 8; i += 1) {
    const deg = i * 45;
    let diff = ((deg - hdg + 540) % 360) - 180;
    if (Math.abs(diff) > 75) continue;
    ctx.fillText(marks[i], width / 2 + diff * 2, 30);
  }
  ctx.fillStyle = '#ffd98a';
  ctx.fillText('▲', width / 2, 12);
  // Top-right: score, rings, timer.
  ctx.fillStyle = 'rgba(10,14,22,0.62)';
  roundRect(ctx, width - 264, 12, 250, 108, 10);
  ctx.fill();
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd98a';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(`SCORE ${game.score}`, width - 26, 38);
  ctx.fillStyle = '#e8f0f8';
  const done = game.course.rings.filter((r) => r.passed).length;
  ctx.fillText(`RINGS ${done}/${game.course.rings.length}`, width - 26, 62);
  ctx.fillText(`TIME ${Math.max(0, Math.ceil(game.timeLeft))}s`, width - 26, 86);
  ctx.fillStyle = game.combo > 1 ? '#ffd98a' : '#9fb2c8';
  ctx.fillText(game.combo > 1 ? `COMBO x${game.combo}` : 'COMBO —', width - 26, 110);
  // Bottom-left: fuel and throttle bars.
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(10,14,22,0.62)';
  roundRect(ctx, 14, height - 64, 250, 50, 10);
  ctx.fill();
  bar(ctx, 26, height - 52, 226, 12, plane.fuel, plane.fuel < 0.2 ? '#ff5a4a' : '#4aff7a', 'FUEL');
  bar(ctx, 26, height - 30, 226, 12, plane.throttle, '#ffd98a', 'THR');
  // Next-ring distance and direction arrow.
  if (target && game.mode === 'play') {
    const dx = target.x - plane.x;
    const dz = target.z - plane.z;
    const bearing = Math.atan2(dx, -dz);
    let rel = bearing - plane.heading;
    while (rel > Math.PI) rel -= Math.PI * 2;
    while (rel < -Math.PI) rel += Math.PI * 2;
    const dist = Math.round(Math.hypot(dx, target.y - plane.y, dz));
    ctx.fillStyle = 'rgba(10,14,22,0.62)';
    roundRect(ctx, width / 2 - 110, height - 64, 220, 50, 10);
    ctx.fill();
    ctx.fillStyle = '#ffe9b0';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    const arrow = rel > 0.5 ? '▶▶' : rel < -0.5 ? '◀◀' : rel > 0.15 ? '▶' : rel < -0.15 ? '◀' : '▲';
    ctx.fillText(`${arrow}  RING ${target.index + 1}  ${dist} m`, width / 2, height - 32);
  }
  // Warnings, centre screen.
  const warnings = [];
  if (plane.fuel < 0.2) warnings.push('LOW FUEL');
  if (plane.stalled) warnings.push('STALL — NOSE DOWN, THROTTLE UP');
  if (plane.airborne && plane.y - heightAt(plane.x, plane.z) < 45) warnings.push('TERRAIN');
  if (warnings.length > 0) {
    ctx.fillStyle = Math.floor(performance.now() / 350) % 2 === 0 ? '#ff5a4a' : '#ffb0a0';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(warnings.join('   •   '), width / 2, height * 0.3);
  }
  // Transient message (ring scored, takeoff, touchdown).
  if (game.message && game.messageT > 0) {
    ctx.fillStyle = '#ffe9b0';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(game.message, width / 2, height * 0.42);
  }
}

function bar(ctx, x, y, w, h, frac, colour, label) {
  ctx.fillStyle = '#2b2f3a';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = colour;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
  ctx.fillStyle = '#e8f0f8';
  ctx.font = 'bold 10px monospace';
  ctx.fillText(label, x + 4, y + h - 2);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---- screens ---------------------------------------------------------------

function drawTitle(ctx, camera, game) {
  const { width, height } = camera;
  ctx.fillStyle = 'rgba(10,14,26,0.45)';
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd98a';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('SKYHOOK RUN', width / 2, 120);
  ctx.fillStyle = '#f2ead8';
  ctx.font = '20px sans-serif';
  ctx.fillText('Fly the Kestrel through the rings. Bring her home to Runway 27.', width / 2, 156);
  ctx.fillText('One valley, three missions — fuel is the clock.', width / 2, 184);
  game.missionBoxes = [];
  const bw = 300;
  const bh = 164;
  const gap = 24;
  const x0 = width / 2 - (bw * 3 + gap * 2) / 2;
  game.missionBoxes = game.missions.map((m, i) => {
    const x = x0 + i * (bw + gap);
    const y = 240;
    const hover = game.hover && game.hover.x >= x && game.hover.x <= x + bw && game.hover.y >= y && game.hover.y <= y + bh;
    ctx.fillStyle = hover ? 'rgba(255,217,138,0.92)' : 'rgba(20,26,40,0.85)';
    roundRect(ctx, x, y, bw, bh, 12);
    ctx.fill();
    ctx.strokeStyle = '#ffd98a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = hover ? '#1e2129' : '#ffd98a';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(m.name, x + bw / 2, y + 44);
    ctx.font = '15px sans-serif';
    ctx.fillStyle = hover ? '#3a3f46' : '#f2ead8';
    ctx.fillText(m.tag, x + bw / 2, y + 74);
    ctx.font = '13px sans-serif';
    ctx.fillText(m.blurb, x + bw / 2, y + 100, bw - 24);
    ctx.fillStyle = hover ? '#3a3f46' : '#9fd8ff';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`${m.rings} RINGS · ${m.timeLimit}s · x${m.scoreMult} PTS`, x + bw / 2, y + 126);
    ctx.fillStyle = hover ? '#3a3f46' : '#9fb2c8';
    ctx.fillText(`press ${m.key}`, x + bw / 2, y + 150);
    return { x, y, w: bw, h: bh, mission: m };
  });
  ctx.fillStyle = '#e8f0f8';
  ctx.font = '15px monospace';
  ctx.fillText('ARROWS / WASD pitch & roll · SHIFT / CTRL throttle · MOUSE steers too', width / 2, 450);
  ctx.fillText('C camera · F flaps · M mute · P pause · R restart', width / 2, 476);
  ctx.fillStyle = '#ffd98a';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('Click a mission or press 1 / 2 / 3 to fly', width / 2, 530);
  if (game.best > 0) {
    ctx.fillStyle = '#9fd8ff';
    ctx.font = '16px monospace';
    ctx.fillText(`BEST SCORE ${game.best}`, width / 2, 566);
  }
}

function drawEnd(ctx, camera, game) {
  const { width, height } = camera;
  ctx.fillStyle = 'rgba(10,14,26,0.55)';
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = 'center';
  const landed = game.endKind === 'landed';
  const title = landed ? 'WHEELS DOWN — SHE\'S HOME'
    : game.endKind === 'fuel' ? 'OUT OF FUEL'
    : game.endKind === 'time' ? 'OUT OF TIME' : 'CRASHED';
  ctx.fillStyle = landed ? '#4aff7a' : '#ff8a7a';
  ctx.font = 'bold 52px sans-serif';
  ctx.fillText(title, width / 2, 180);
  ctx.fillStyle = '#f2ead8';
  ctx.font = '20px sans-serif';
  ctx.fillText(game.endLine, width / 2, 222);
  ctx.fillStyle = '#ffd98a';
  ctx.font = 'bold 30px monospace';
  ctx.fillText(`SCORE ${game.score}`, width / 2, 290);
  ctx.fillStyle = '#e8f0f8';
  ctx.font = '17px monospace';
  const done = game.course.rings.filter((r) => r.passed).length;
  ctx.fillText(`Rings ${done}/${game.course.rings.length}   ·   Best ring streak ${game.bestCombo}`, width / 2, 330);
  ctx.fillText(`Time flown ${Math.round(game.flown)}s   ·   Fuel left ${Math.round(game.plane.fuel * 100)}%`, width / 2, 358);
  if (game.score >= game.best && game.score > 0) {
    ctx.fillStyle = '#4aff7a';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('NEW BEST SCORE', width / 2, 396);
  }
  ctx.fillStyle = '#ffd98a';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('Press R or click to fly again', width / 2, 450);
}

function drawPause(ctx, camera) {
  const { width, height } = camera;
  ctx.fillStyle = 'rgba(10,14,26,0.55)';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#ffd98a';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', width / 2, height / 2 - 10);
  ctx.fillStyle = '#f2ead8';
  ctx.font = '18px sans-serif';
  ctx.fillText('P to resume · R to restart', width / 2, height / 2 + 28);
}

// ---- top-level draw ---------------------------------------------------------

export function drawGame(ctx, game) {
  const canvas = ctx.canvas;
  const width = canvas.width;
  const height = canvas.height;
  const plane = game.plane;
  const camera = makeCamera(plane, game.camera, width, height);
  if (game.mode === SCREEN_TITLE) {
    // The title flies over the valley at dawn: a slow orbit for the shot.
    drawSky(ctx, camera, plane, game.mission, 0);
    drawFarRidge(ctx, camera, plane);
    drawTerrain(ctx, camera, plane);
    drawRings(ctx, camera, game.course);
    drawTitle(ctx, camera, game);
    return;
  }
  drawSky(ctx, camera, plane, game.mission, 0);
  drawFarRidge(ctx, camera, plane);
  drawTerrain(ctx, camera, plane);
  drawRings(ctx, camera, game.course);
  if (game.camera !== 'cockpit') drawPlaneChase(ctx, camera, plane);
  if (game.camera === 'cockpit') drawCockpit(ctx, camera, plane);
  drawHUD(ctx, camera, game);
  if (game.mode === SCREEN_OVER) drawEnd(ctx, camera, game);
  if (game.mode === SCREEN_PAUSE) drawPause(ctx, camera);
}
