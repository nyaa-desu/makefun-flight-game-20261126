// The chase view: dusk sky, sun glare, haze, and the valley floor drawn
// as perspective bands — river winding, Milltown's lamps, Runway 27's
// edge lights — with the Kestrel big in frame and the next ring ahead.
// Everything is Canvas 2D, deterministic for a fixed state and time.

import { PALETTE, TUNE, riverX } from './config.js';
import { groundHeight, groundKind } from './terrain.js';
import { mulberry32 } from './random.js';

// ---- small helpers ----

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerpColor(a, b, t) {
  const ca = hexRgb(a);
  const cb = hexRgb(b);
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * t);
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * t);
  const bl = Math.round(ca[2] + (cb[2] - ca[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

// ---- camera ----

export function makeCamera(f) {
  return {
    x: f.x - Math.sin(f.heading) * TUNE.cameraBack,
    y: f.y + TUNE.cameraUp,
    z: f.z - Math.cos(f.heading) * TUNE.cameraBack,
    heading: f.heading,
  };
}

// Project a world point to the screen. Returns null behind the camera.
export function project(cam, x, y, z, W, H, focal) {
  const dx = x - cam.x;
  const dz = z - cam.z;
  const forward = dx * Math.sin(cam.heading) + dz * Math.cos(cam.heading);
  if (forward < 2) return null;
  const lateral = dx * Math.cos(cam.heading) - dz * Math.sin(cam.heading);
  const s = focal / forward;
  const horizonY = H * 0.4;
  return { sx: W / 2 + lateral * s, sy: horizonY + (cam.y - y) * s, s };
}

// ---- sky ----

function drawSky(ctx, W, H, time, storm) {
  const horizonY = H * 0.4;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  if (storm) {
    g.addColorStop(0, '#141428');
    g.addColorStop(0.35, '#2c2c48');
    g.addColorStop(0.55, '#5a4450');
    g.addColorStop(1, '#8a6a58');
  } else {
    g.addColorStop(0, PALETTE.skyTop);
    g.addColorStop(0.35, PALETTE.skyMid);
    g.addColorStop(0.62, PALETTE.skyLow);
    g.addColorStop(0.75, PALETTE.horizon);
    g.addColorStop(1, PALETTE.horizon);
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Stars fading in at the top of the dusk.
  const rng = mulberry32(99);
  ctx.fillStyle = 'rgba(255, 244, 214, 0.85)';
  for (let i = 0; i < 70; i++) {
    const sx = rng() * W;
    const sy = rng() * H * 0.24;
    const a = 0.25 + rng() * 0.55;
    ctx.globalAlpha = a * (storm ? 0.25 : 1);
    ctx.fillRect(sx, sy, 1.4, 1.4);
  }
  ctx.globalAlpha = 1;

  // The low sun and its glare, or the storm's lightning glow.
  const sunX = W * 0.7;
  const sunY = horizonY - H * 0.045;
  if (storm) {
    const lg = ctx.createRadialGradient(sunX, horizonY, 0, sunX, horizonY, W * 0.3);
    lg.addColorStop(0, 'rgba(230, 220, 255, 0.5)');
    lg.addColorStop(1, 'rgba(230, 220, 255, 0)');
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, W, H);
  } else {
    const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, H * 0.26);
    glow.addColorStop(0, PALETTE.sunGlow);
    glow.addColorStop(1, 'rgba(255, 154, 60, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = PALETTE.sun;
    ctx.beginPath();
    ctx.arc(sunX, sunY, H * 0.042, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 220, 160, 0.9)';
    ctx.beginPath();
    ctx.arc(sunX, sunY, H * 0.028, 0, Math.PI * 2);
    ctx.fill();
  }

  // Slow clouds, dark bellies with amber rims.
  const crng = mulberry32(41);
  for (let i = 0; i < 6; i++) {
    const bx = ((crng() * W + time * (6 + i * 2)) % (W + 320)) - 160;
    const by = H * (0.1 + crng() * 0.2);
    const bw = 130 + crng() * 190;
    const bh = 16 + crng() * 14;
    ctx.fillStyle = storm ? 'rgba(30, 28, 52, 0.85)' : 'rgba(52, 38, 78, 0.8)';
    ctx.beginPath();
    ctx.ellipse(bx, by, bw / 2, bh / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = storm ? 'rgba(150, 140, 190, 0.25)' : 'rgba(255, 170, 100, 0.28)';
    ctx.beginPath();
    ctx.ellipse(bx, by - bh * 0.28, bw / 2.4, bh * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Haze sitting on the horizon.
  ctx.fillStyle = PALETTE.haze;
  ctx.fillRect(0, horizonY - H * 0.02, W, H * 0.05);
  ctx.fillStyle = 'rgba(232, 144, 90, 0.1)';
  ctx.fillRect(0, horizonY + H * 0.03, W, H * 0.04);
}

// ---- terrain bands ----

const BAND_COLORS = {
  field: [PALETTE.fieldGreen, PALETTE.fieldDark],
  fieldAmber: [PALETTE.fieldAmber, '#7a5c30'],
  forest: [PALETTE.forest, '#243d2a'],
  river: [PALETTE.river, '#4e6f96'],
  town: [PALETTE.townGround, '#3e352e'],
  runway: [PALETTE.runway, '#26262c'],
  marsh: [PALETTE.marsh, '#3e4c3a'],
};

function bandColor(kind, x, z, dz) {
  const pair = BAND_COLORS[kind] || BAND_COLORS.field;
  const n = Math.sin(x * 0.021 + z * 0.013) * 0.5 + 0.5;
  const base = lerpColor(pair[0], pair[1], n);
  // Distance haze: far ground melts into the amber horizon.
  const haze = Math.min(0.72, dz / 1500);
  return lerpColor(base, PALETTE.horizon, haze);
}

function drawGround(ctx, cam, W, H, focal) {
  // Depth slices, thin near the camera, wide far away.
  const slices = [];
  let z = cam.z + 2;
  while (z < cam.z + TUNE.drawDistance) {
    slices.push(z);
    z += Math.max(3, (z - cam.z) * 0.05);
  }
  // Columns across the valley.
  const VALLEY_HALF = 420;
  const cols = [];
  for (let x = -VALLEY_HALF; x <= VALLEY_HALF; x += 70) cols.push(x);
  // Project every (column, slice) ground point once.
  const pts = slices.map((sz) =>
    cols.map((cx) => {
      const gy = groundHeight(cx, sz);
      const p = project(cam, cx, gy, sz, W, H, focal);
      return { p, kind: groundKind(cx, sz) };
    }),
  );
  // Draw far to near so near bands overlap far ones.
  for (let i = slices.length - 2; i >= 0; i--) {
    const zA = slices[i];
    const zB = slices[i + 1];
    const dz = zB - cam.z;
    for (let c = 0; c < cols.length - 1; c++) {
      const a0 = pts[i][c];
      const a1 = pts[i][c + 1];
      const b0 = pts[i + 1][c];
      const b1 = pts[i + 1][c + 1];
      if (!a0.p || !a1.p || !b0.p || !b1.p) continue;
      const midX = (cols[c] + cols[c + 1]) / 2;
      const midZ = (zA + zB) / 2;
      // Sample three points across the quad: the river (52 m) and the
      // runway (60 m) are narrower than a 70 m column, so a single
      // midpoint sample misses them entirely and the valley reads as
      // one brown mountain. A narrow feature anywhere in the quad
      // colours the quad.
      const samples = [groundKind(midX - 20, midZ), groundKind(midX, midZ), groundKind(midX + 20, midZ)];
      const kind = samples.includes('river')
        ? 'river'
        : samples.includes('runway')
          ? 'runway'
          : samples.includes('town')
            ? 'town'
            : groundKind(midX, midZ);
      ctx.fillStyle = bandColor(kind, midX, (zA + zB) / 2, dz);
      ctx.beginPath();
      ctx.moveTo(a0.p.sx, a0.p.sy);
      ctx.lineTo(a1.p.sx, a1.p.sy);
      ctx.lineTo(b1.p.sx, b1.p.sy);
      ctx.lineTo(b0.p.sx, b0.p.sy);
      ctx.closePath();
      ctx.fill();
    }
  }
  // The river's amber glint: a bright streak down its centreline.
  ctx.strokeStyle = 'rgba(216, 138, 74, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  let started = false;
  for (let sz = cam.z + 10; sz < cam.z + TUNE.drawDistance; sz += 14) {
    const rx = riverX(sz);
    const p = project(cam, rx, groundHeight(rx, sz) + 1, sz, W, H, focal);
    if (!p) continue;
    if (!started) {
      ctx.moveTo(p.sx, p.sy);
      started = true;
    } else {
      ctx.lineTo(p.sx, p.sy);
    }
  }
  ctx.stroke();
}

// Milltown's lamps: warm dots with halos, seeded once.
const LAMPS = (() => {
  const rng = mulberry32(20261127);
  const lamps = [];
  for (let i = 0; i < 46; i++) {
    lamps.push({
      x: -260 + rng() * 190,
      z: 1970 + rng() * 310,
    });
  }
  return lamps;
})();

function drawTownLamps(ctx, cam, W, H, focal) {
  for (const lamp of LAMPS) {
    const p = project(cam, lamp.x, groundHeight(lamp.x, lamp.z) + 5, lamp.z, W, H, focal);
    if (!p) continue;
    if (p.sx < -20 || p.sx > W + 20 || p.sy < 0 || p.sy > H) continue;
    const r = Math.max(1.5, 260 * p.s / 90);
    ctx.fillStyle = PALETTE.lampGlow;
    ctx.beginPath();
    ctx.arc(p.sx, p.sy, r * 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.lamp;
    ctx.beginPath();
    ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Runway 27: edge lights, threshold bars and centreline dashes.
function drawRunway(ctx, cam, W, H, focal) {
  for (let sz = 2520; sz <= 2900; sz += 80) {
    for (const side of [-28, 28]) {
      const p = project(cam, side, groundHeight(side, sz) + 2, sz, W, H, focal);
      if (!p) continue;
      ctx.fillStyle = PALETTE.runwayLight;
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, Math.max(1.5, 200 * p.s / 110), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Threshold bars at the near end.
  for (let x = -24; x <= 24; x += 8) {
    const p = project(cam, x, groundHeight(x, 2505) + 1, 2505, W, H, focal);
    if (!p) continue;
    ctx.fillStyle = PALETTE.runwayMark;
    ctx.fillRect(p.sx - 3 * p.s, p.sy - 1.5 * p.s, 6 * p.s, 3 * p.s);
  }
  // Centreline dashes.
  ctx.fillStyle = 'rgba(232, 232, 232, 0.85)';
  for (let sz = 2560; sz <= 2880; sz += 60) {
    const p = project(cam, 0, groundHeight(0, sz) + 1, sz, W, H, focal);
    if (!p) continue;
    ctx.fillRect(p.sx - 1.5 * p.s, p.sy - 1 * p.s, 3 * p.s, 6 * p.s);
  }
}

// ---- rings ----

function drawRings(ctx, f, cam, W, H, focal) {
  const ordered = [...f.rings].sort((a, b) => b.z - a.z);
  for (const ring of ordered) {
    const p = project(cam, ring.x, ring.y, ring.z, W, H, focal);
    if (!p) continue;
    const radius = ring.r * p.s;
    if (radius < 2 || radius > W) continue;
    const isNext = f.rings.indexOf(ring) === f.ringsHit;
    const isFinal = ring.final;
    const color = isFinal ? PALETTE.finalRing : PALETTE.ring;
    // Glow.
    ctx.strokeStyle = isFinal ? 'rgba(255, 90, 60, 0.5)' : PALETTE.ringGlow;
    ctx.lineWidth = Math.max(3, radius * 0.3);
    ctx.beginPath();
    ctx.ellipse(p.sx, p.sy, radius, radius * 0.94, 0, 0, Math.PI * 2);
    ctx.stroke();
    // The ring itself.
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2.5, radius * 0.13);
    ctx.beginPath();
    ctx.ellipse(p.sx, p.sy, radius, radius * 0.94, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Inner tick marks, like a gunsight.
    ctx.strokeStyle = 'rgba(255, 242, 216, 0.9)';
    ctx.lineWidth = Math.max(1.5, radius * 0.05);
    for (const a of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
      const x0 = p.sx + Math.cos(a) * radius * 0.82;
      const y0 = p.sy + Math.sin(a) * radius * 0.82 * 0.94;
      const x1 = p.sx + Math.cos(a) * radius * 0.66;
      const y1 = p.sy + Math.sin(a) * radius * 0.66 * 0.94;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    // The next ring gets its name and distance, so the pilot always
    // knows the target and how far it is.
    if (isNext) {
      const dist = Math.round(Math.hypot(ring.x - f.x, ring.y - f.y, ring.z - f.z));
      const label = isFinal ? `FINAL RING · ${dist} m` : `RING ${f.ringsHit + 1}/${f.rings.length} · ${dist} m`;
      ctx.font = `bold ${Math.max(13, Math.round(radius * 0.22))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(10, 12, 24, 0.75)';
      const tw = ctx.measureText(label).width;
      ctx.fillRect(p.sx - tw / 2 - 8, p.sy - radius - 30, tw + 16, 24);
      ctx.fillStyle = isFinal ? '#ff8a6a' : '#ffd27a';
      ctx.fillText(label, p.sx, p.sy - radius - 12);
    }
  }
}

// ---- the Kestrel ----

// A bigger, built-looking bush plane seen from behind and slightly above:
// wide wings, foreshortened fuselage, red tail, warm cockpit glow, nav
// lights and a spinning prop. Drawn at (px, py), `size` wide, banked by roll.
export function drawPlane(ctx, px, py, size, roll, time, shadowAlpha = 0.28) {
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(roll * 0.85);
  const u = size / 230; // one unit: the sprite is 230 wide
  // Soft shadow on the ground haze below — it fades out as the plane
  // climbs, so a high plane never pretends to be near the ground.
  ctx.fillStyle = `rgba(20, 16, 40, ${shadowAlpha})`;
  ctx.beginPath();
  ctx.ellipse(0, 52 * u, 95 * u, 10 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  // Main wing, spanning the frame, tips slightly up.
  const wingGrad = ctx.createLinearGradient(0, -8 * u, 0, 12 * u);
  wingGrad.addColorStop(0, PALETTE.planeAmber);
  wingGrad.addColorStop(0.45, PALETTE.planeCream);
  wingGrad.addColorStop(1, '#8a7a9a');
  ctx.fillStyle = wingGrad;
  ctx.beginPath();
  ctx.moveTo(-112 * u, 4 * u);
  ctx.quadraticCurveTo(-70 * u, -8 * u, -18 * u, -4 * u);
  ctx.lineTo(18 * u, -4 * u);
  ctx.quadraticCurveTo(70 * u, -8 * u, 112 * u, 4 * u);
  ctx.quadraticCurveTo(70 * u, 12 * u, 20 * u, 10 * u);
  ctx.lineTo(-20 * u, 10 * u);
  ctx.quadraticCurveTo(-70 * u, 12 * u, -112 * u, 4 * u);
  ctx.closePath();
  ctx.fill();
  // Wing struts.
  ctx.strokeStyle = 'rgba(90, 70, 90, 0.8)';
  ctx.lineWidth = 2 * u;
  ctx.beginPath();
  ctx.moveTo(-58 * u, 6 * u);
  ctx.lineTo(-34 * u, 26 * u);
  ctx.moveTo(58 * u, 6 * u);
  ctx.lineTo(34 * u, 26 * u);
  ctx.stroke();
  // Fuselage: tail near the camera, nose away, foreshortened.
  const fusGrad = ctx.createLinearGradient(0, -34 * u, 0, 34 * u);
  fusGrad.addColorStop(0, PALETTE.planeAmber);
  fusGrad.addColorStop(0.4, PALETTE.planeCream);
  fusGrad.addColorStop(1, '#7a6a8a');
  ctx.fillStyle = fusGrad;
  ctx.beginPath();
  ctx.moveTo(0, -58 * u);
  ctx.quadraticCurveTo(15 * u, -44 * u, 15 * u, -18 * u);
  ctx.quadraticCurveTo(15 * u, 12 * u, 9 * u, 30 * u);
  ctx.quadraticCurveTo(0, 38 * u, -9 * u, 30 * u);
  ctx.quadraticCurveTo(-15 * u, 12 * u, -15 * u, -18 * u);
  ctx.quadraticCurveTo(-15 * u, -44 * u, 0, -58 * u);
  ctx.closePath();
  ctx.fill();
  // Panel lines and rivets.
  ctx.strokeStyle = 'rgba(80, 60, 80, 0.55)';
  ctx.lineWidth = 1 * u;
  for (const yy of [-30, -8, 12]) {
    ctx.beginPath();
    ctx.moveTo(-13 * u, yy * u);
    ctx.quadraticCurveTo(0, (yy + 2) * u, 13 * u, yy * u);
    ctx.stroke();
  }
  // Cockpit windows, lit warm from inside.
  ctx.fillStyle = PALETTE.planeGlass;
  ctx.beginPath();
  ctx.ellipse(-6 * u, -34 * u, 5.5 * u, 8 * u, -0.25, 0, Math.PI * 2);
  ctx.ellipse(6 * u, -34 * u, 5.5 * u, 8 * u, 0.25, 0, Math.PI * 2);
  ctx.fill();
  // Tail fin, red tip.
  ctx.fillStyle = PALETTE.planeRed;
  ctx.beginPath();
  ctx.moveTo(0, 30 * u);
  ctx.lineTo(-11 * u, 52 * u);
  ctx.lineTo(11 * u, 52 * u);
  ctx.closePath();
  ctx.fill();
  // Tailplane.
  ctx.fillStyle = PALETTE.planeCream;
  ctx.beginPath();
  ctx.moveTo(-34 * u, 38 * u);
  ctx.lineTo(34 * u, 38 * u);
  ctx.lineTo(26 * u, 46 * u);
  ctx.lineTo(-26 * u, 46 * u);
  ctx.closePath();
  ctx.fill();
  // Registration on the fuselage.
  ctx.fillStyle = 'rgba(60, 40, 60, 0.85)';
  ctx.font = `bold ${9 * u}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('KESTREL', 0, 4 * u);
  // Propeller: a spinning translucent disc at the nose, plus spinner.
  const propA = 0.16 + 0.06 * Math.sin(time * 40);
  ctx.fillStyle = `rgba(220, 220, 230, ${propA})`;
  ctx.beginPath();
  ctx.ellipse(0, -58 * u, 5 * u, 26 * u, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a3048';
  ctx.beginPath();
  ctx.arc(0, -58 * u, 4 * u, 0, Math.PI * 2);
  ctx.fill();
  // Navigation lights: red left, green right, white tail.
  const blink = 0.6 + 0.4 * Math.sin(time * 5);
  ctx.fillStyle = `rgba(255, 60, 50, ${blink})`;
  ctx.beginPath();
  ctx.arc(-112 * u, 4 * u, 3.5 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(90, 255, 150, ${blink})`;
  ctx.beginPath();
  ctx.arc(112 * u, 4 * u, 3.5 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(255, 255, 255, ${blink})`;
  ctx.beginPath();
  ctx.arc(0, 52 * u, 3 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---- rain ----

export function drawRain(ctx, W, H, seed, time) {
  const rng = mulberry32(seed);
  ctx.strokeStyle = 'rgba(200, 210, 235, 0.35)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < 110; i++) {
    const x = rng() * (W + 60);
    const y = rng() * H;
    const len = 14 + rng() * 14;
    const drift = 6 + rng() * 6;
    ctx.moveTo(x, y);
    ctx.lineTo(x - drift, y + len);
  }
  ctx.stroke();
  // A dark storm band across the top of the sky.
  ctx.fillStyle = 'rgba(18, 18, 38, 0.55)';
  ctx.fillRect(0, 0, W, H * 0.16);
}

// ---- the whole chase frame ----

export function drawChase(ctx, f, W, H, time, storm) {
  const focal = (TUNE.focal * W) / 1280;
  const cam = makeCamera(f);
  drawSky(ctx, W, H, time, storm);
  drawGround(ctx, cam, W, H, focal);
  drawTownLamps(ctx, cam, W, H, focal);
  drawRunway(ctx, cam, W, H, focal);
  drawRings(ctx, f, cam, W, H, focal);
  // The Kestrel, big in frame, low and centred; its shadow fades with height.
  const heightAboveGround = Math.max(0, f.y - groundHeight(f.x, f.z));
  const shadowAlpha = Math.max(0, 0.3 - heightAboveGround * 0.0012);
  drawPlane(ctx, W / 2, H * 0.62, Math.min(W, H) * 0.34, f.roll, time, shadowAlpha);
  // A light vignette pulls the eye to the plane and the next ring.
  const vig = ctx.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.42, W / 2, H * 0.55, Math.max(W, H) * 0.75);
  vig.addColorStop(0, 'rgba(10, 8, 20, 0)');
  vig.addColorStop(1, 'rgba(10, 8, 20, 0.28)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
  if (storm) drawRain(ctx, W, H, 37, time);
}

// The world from the cockpit: same valley, camera at the plane, no sprite.
export function drawCockpitWorld(ctx, f, W, H, time, storm) {
  const focal = (TUNE.focal * W) / 1280;
  const cam = { x: f.x, y: f.y + 1.2, z: f.z, heading: f.heading };
  drawSky(ctx, W, H, time, storm);
  drawGround(ctx, cam, W, H, focal);
  drawTownLamps(ctx, cam, W, H, focal);
  drawRunway(ctx, cam, W, H, focal);
  drawRings(ctx, f, cam, W, H, focal);
  if (storm) drawRain(ctx, W, H, 37, time);
}
