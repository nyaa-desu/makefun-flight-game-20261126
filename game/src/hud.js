// Every overlay on top of the world: the top bar, the side panel with
// the mission, the ring count and the radio log, the bottom bar with
// the controls and the fuel gauge, the corner meters, the ring feedback
// floats, and the title / end / pause screens. No overlay ever covers
// the middle of the frame — the plane and the next ring stay visible.

import { MISSIONS, PALETTE } from './config.js';
import { nearestPlaces, groundLabel } from './places.js';
import { stallCallout } from './radio.js';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.hudPanel;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = PALETTE.hudEdge;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.stroke();
}

function bar(ctx, x, y, w, h, frac, color, bg = 'rgba(255,255,255,0.14)') {
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, Math.max(h, w * Math.max(0, Math.min(1, frac))), h, h / 2);
  ctx.fill();
}

// The top bar: mission name, ring count, score, time and fuel — always on.
export function drawTopBar(ctx, f, W, H) {
  const m = MISSIONS[f.mission];
  const y = 12;
  ctx.textAlign = 'left';
  panel(ctx, 12, y, 300, 44);
  ctx.fillStyle = '#ffd27a';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(m.name, 24, y + 19);
  ctx.fillStyle = '#fff4d6';
  ctx.font = '13px sans-serif';
  ctx.fillText(`RINGS ${f.ringsHit}/${m.rings}   SCORE ${f.score}`, 24, y + 36);
  // Time, right of the mission panel.
  panel(ctx, 322, y, 110, 44);
  ctx.fillStyle = f.timeLeft < 30 ? '#ff8a6a' : '#fff4d6';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  const mm = Math.floor(f.timeLeft / 60);
  const ss = Math.floor(f.timeLeft % 60);
  ctx.fillText(`${mm}:${String(ss).padStart(2, '0')}`, 377, y + 28);
  // Fuel, top right.
  const fw = 190;
  panel(ctx, W - fw - 12, y, fw, 44);
  ctx.fillStyle = '#fff4d6';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`FUEL ${Math.round(f.fuel)}%`, W - fw + 2, y + 18);
  const fuelColor = f.fuel < 20 ? '#ff5a3c' : f.fuel < 45 ? '#ffb84d' : '#7ec850';
  bar(ctx, W - fw + 2, y + 26, fw - 28, 9, f.fuel / 100, fuelColor);
  // Combo, under the fuel.
  if (f.combo >= 2) {
    ctx.fillStyle = '#ffb84d';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`COMBO x${f.combo}`, W - 16, y + 72);
  }
}

// The side panel: where the plane is, the nearest named places with
// distances, and Mara's radio log.
export function drawSidePanel(ctx, f, W, H, radio) {
  const x = 12;
  const y = 68;
  const w = 218;
  const h = 216;
  panel(ctx, x, y, w, h);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd27a';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('KESTREL VALLEY — DUSK', x + 12, y + 20);
  ctx.fillStyle = '#fff4d6';
  ctx.font = '12px sans-serif';
  ctx.fillText(`Over: ${groundLabel(f.x, f.z)}`, x + 12, y + 40);
  ctx.fillText(`Alt ${Math.round(f.y * 3.28)} ft   ${Math.round(f.speed)} kt`, x + 12, y + 58);
  ctx.fillStyle = '#ffb84d';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('NEARBY', x + 12, y + 82);
  ctx.fillStyle = '#e8e0f0';
  ctx.font = '12px sans-serif';
  const places = nearestPlaces(f.x, f.z, 3);
  places.forEach((p, i) => {
    ctx.fillText(`${p.name} — ${p.dist} m`, x + 12, y + 102 + i * 18);
  });
  ctx.fillStyle = '#ffb84d';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('MILLTOWN TOWER — MARA VOSS', x + 12, y + 168);
  ctx.fillStyle = '#e8e0f0';
  ctx.font = '12px sans-serif';
  const lines = radio.lastLines();
  lines.forEach((line, i) => {
    ctx.fillText(`“${line.text}”`, x + 12, y + 188 + i * 16);
  });
  if (lines.length === 0) {
    ctx.fillText('“Tower listening, Kestrel.”', x + 12, y + 188);
  }
}

// The bottom bar: controls on the left, wind and stall on the right.
export function drawBottomBar(ctx, f, W, H, muted) {
  const h = 34;
  const y = H - h - 10;
  panel(ctx, 12, y, W - 24, h);
  ctx.fillStyle = '#e8e0f0';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('↑↓ pitch   ←→ bank   Shift throttle   Ctrl slow   F flaps   C camera   M sound   P pause', 22, y + 21);
  ctx.textAlign = 'right';
  const wind = f.windNow;
  const windText = Math.abs(wind) < 1 ? 'wind calm' : `wind ${wind > 0 ? '→' : '←'} ${Math.abs(wind).toFixed(0)} m/s`;
  ctx.fillText(`${windText}   ${muted ? 'sound off' : 'sound on'}`, W - 22, y + 21);
  if (f.stall) {
    ctx.fillStyle = '#ff5a3c';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(stallCallout(), W / 2, y - 14);
  }
}

// Floating feedback after a ring: the points and the banner, fading out.
export function drawFeedback(ctx, f, W, H, nowMs) {
  const ev = f.lastEvent;
  if (!ev || ev.at == null) return;
  const age = (nowMs - ev.at * 1000) / 1000;
  if (age < 0 || age > 2.4) return;
  const alpha = age < 1.8 ? 1 : 1 - (age - 1.8) / 0.6;
  const rise = age * 26;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  if (ev.kind === 'ring' || ev.kind === 'finalRing') {
    const cx = W / 2;
    const cy = H * 0.3 - rise;
    if (ev.kind === 'finalRing') {
      ctx.fillStyle = '#ff8a6a';
      ctx.font = 'bold 34px sans-serif';
      ctx.fillText('FINAL RING!', cx, cy);
      ctx.fillStyle = '#fff4d6';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(`+${ev.gain}  —  land it on Runway 27`, cx, cy + 28);
    } else {
      ctx.fillStyle = '#ffd27a';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(`+${ev.gain}`, cx, cy);
      if (f.combo >= 2) {
        ctx.fillStyle = '#ffb84d';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(`COMBO x${f.combo}`, cx, cy + 24);
      }
    }
  } else if (ev.kind === 'missed') {
    ctx.fillStyle = '#c8b8d8';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('Ring missed — combo lost', W / 2, H * 0.3 - rise);
  } else if (ev.kind === 'lowFuel') {
    ctx.fillStyle = '#ff8a6a';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('Fuel low — ring top-ups give +4%', W / 2, H * 0.3 - rise);
  }
  ctx.restore();
}

// The title screen: the valley's name, the three missions, the controls.
export function drawTitle(ctx, f, W, H, time) {
  ctx.fillStyle = 'rgba(10, 8, 20, 0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd27a';
  ctx.font = 'bold 46px sans-serif';
  ctx.fillText('SKYHOOK RUN', W / 2, H * 0.24);
  ctx.fillStyle = '#fff4d6';
  ctx.font = '20px sans-serif';
  ctx.fillText('Fly the Kestrel through a river valley at dusk', W / 2, H * 0.24 + 34);
  ctx.fillStyle = '#ffb84d';
  ctx.font = '15px sans-serif';
  ctx.fillText('3 missions · 29 rings · gusting crosswind · fuel top-ups · stall model', W / 2, H * 0.24 + 62);
  // Mission cards.
  const cw = 210;
  const ch = 128;
  const gap = 18;
  const x0 = W / 2 - (cw * 3 + gap * 2) / 2;
  MISSIONS.forEach((m, i) => {
    const x = x0 + i * (cw + gap);
    const y = H * 0.4;
    panel(ctx, x, y, cw, ch);
    ctx.fillStyle = i === f.mission ? '#ffd27a' : '#fff4d6';
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText(m.name, x + cw / 2, y + 28);
    ctx.fillStyle = '#e8e0f0';
    ctx.font = '13px sans-serif';
    ctx.fillText(`${m.rings} rings · ${Math.round(m.time)}s`, x + cw / 2, y + 52);
    ctx.fillText(`${m.wind} · score x${m.multiplier}`, x + cw / 2, y + 72);
    ctx.fillText(m.blurb, x + cw / 2, y + 96);
    ctx.fillStyle = i === f.mission ? '#ffd27a' : '#8a7a9a';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`press ${i + 1}`, x + cw / 2, y + 116);
  });
  ctx.fillStyle = '#e8e0f0';
  ctx.font = '14px sans-serif';
  ctx.fillText('Arrows or mouse to steer · Shift throttle · C cockpit view · Enter to fly', W / 2, H * 0.4 + ch + 36);
  ctx.fillStyle = '#ffb84d';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('Land on Runway 27 for +500 and bonuses — anywhere else is a crash', W / 2, H * 0.4 + ch + 60);
  ctx.fillStyle = '#ffb84d';
  ctx.font = '13px sans-serif';
  ctx.fillText('Kestrel Valley · Alder River · Milltown · Runway 27 · Milltown Tower, Mara Voss', W / 2, H * 0.4 + ch + 86);
}

// The end screen: the result and the full breakdown.
export function drawEnd(ctx, f, W, H) {
  const m = MISSIONS[f.mission];
  ctx.fillStyle = 'rgba(10, 8, 20, 0.62)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  const landed = f.status === 'landed';
  ctx.fillStyle = landed ? '#ffd27a' : '#ff8a6a';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText(
    landed ? (f.landedKind === 'perfect' ? 'PERFECT LANDING' : 'LANDED') : f.status === 'outoffuel' ? 'OUT OF FUEL' : 'CRASHED',
    W / 2,
    H * 0.22,
  );
  ctx.fillStyle = '#fff4d6';
  ctx.font = '18px sans-serif';
  ctx.fillText(
    landed
      ? `Down on Runway 27 — Mara: “${f.landedKind === 'perfect' ? 'Textbook, Kestrel. The valley is yours.' : 'On the strip. A little rough, but you are down.'}”`
      : 'The Kestrel is down in the valley. R to fly again.',
    W / 2,
    H * 0.22 + 32,
  );
  // Breakdown card.
  const bw = 420;
  const bh = 250;
  const bx = W / 2 - bw / 2;
  const by = H * 0.34;
  panel(ctx, bx, by, bw, bh);
  const rows = [
    ['Mission', m.name],
    ['Rings', `${f.ringsHit} / ${m.rings}`],
    ['Best combo', `x${f.bestCombo}`],
    ['Fuel left', `${Math.round(f.fuel)}%`],
    ['Time left', `${Math.max(0, Math.ceil(f.timeLeft))}s`],
    ['Score multiplier', `x${m.multiplier}`],
    ['TOTAL SCORE', `${f.score}`],
  ];
  ctx.textAlign = 'left';
  rows.forEach(([k, v], i) => {
    const y = by + 32 + i * 32;
    const isTotal = i === rows.length - 1;
    ctx.fillStyle = isTotal ? '#ffd27a' : '#e8e0f0';
    ctx.font = isTotal ? 'bold 17px sans-serif' : '15px sans-serif';
    ctx.fillText(k, bx + 24, y);
    ctx.textAlign = 'right';
    ctx.fillText(v, bx + bw - 24, y);
    ctx.textAlign = 'left';
  });
  ctx.fillStyle = '#e8e0f0';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('R to fly again · 1 / 2 / 3 to change mission', W / 2, by + bh + 32);
}

// The pause veil.
export function drawPause(ctx, W, H) {
  ctx.fillStyle = 'rgba(10, 8, 20, 0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff4d6';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', W / 2, H / 2);
  ctx.font = '15px sans-serif';
  ctx.fillText('P to resume · R to restart', W / 2, H / 2 + 30);
}
