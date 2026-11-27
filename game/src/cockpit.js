// The cockpit: a warm-lit panel under the world view, with a yoke,
// a compass strip, fuel and speed gauges, and the flare of the
// instrument lamps. Drawn on top of drawCockpitWorld.

import { MISSIONS, PALETTE } from './config.js';
import { drawCockpitWorld } from './render.js';

// A round gauge: needle, ticks, a label and a value.
function gauge(ctx, cx, cy, r, frac, label, value, warn) {
  ctx.fillStyle = 'rgba(16, 14, 26, 0.92)';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#4a3a5a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  // Ticks.
  ctx.strokeStyle = 'rgba(230, 220, 250, 0.6)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
    const x0 = cx + Math.cos(a) * (r - 5);
    const y0 = cy + Math.sin(a) * (r - 5);
    const x1 = cx + Math.cos(a) * (r - 11);
    const y1 = cy + Math.sin(a) * (r - 11);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  // Needle.
  const na = Math.PI * 0.75 + Math.max(0, Math.min(1, frac)) * Math.PI * 1.5;
  ctx.strokeStyle = warn ? '#ff5a3c' : '#ffd27a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(na) * (r - 14), cy + Math.sin(na) * (r - 14));
  ctx.stroke();
  ctx.fillStyle = '#ffd27a';
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  // Label and value.
  ctx.fillStyle = 'rgba(230, 220, 250, 0.8)';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, cx, cy + r * 0.45);
  ctx.fillStyle = '#fff4d6';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(value, cx, cy + r * 0.72);
}

export function drawCockpit(ctx, f, W, H, time, storm) {
  drawCockpitWorld(ctx, f, W, H, time, storm);
  const m = MISSIONS[f.mission];
  // The panel: a dark glareshield across the lower third.
  const panelY = H * 0.66;
  const pg = ctx.createLinearGradient(0, panelY, 0, H);
  pg.addColorStop(0, '#1c1626');
  pg.addColorStop(0.25, '#241c30');
  pg.addColorStop(1, '#120e1a');
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.moveTo(0, panelY + 26);
  ctx.quadraticCurveTo(W * 0.5, panelY - 14, W, panelY + 26);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();
  // A warm lamp wash over the panel.
  const wash = ctx.createRadialGradient(W * 0.5, H, 0, W * 0.5, H, W * 0.45);
  wash.addColorStop(0, 'rgba(255, 176, 92, 0.16)');
  wash.addColorStop(1, 'rgba(255, 176, 92, 0)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, panelY, W, H - panelY);
  // Gauges.
  const gy = H * 0.86;
  gauge(ctx, W * 0.2, gy, 44, f.speed / 95, 'AIRSPEED', `${Math.round(f.speed)} kt`, f.stall);
  gauge(ctx, W * 0.36, gy, 44, Math.max(0, (f.y - 20) / 320), 'ALTITUDE', `${Math.round(f.y * 3.28)} ft`, false);
  gauge(ctx, W * 0.52, gy, 44, f.fuel / 100, 'FUEL', `${Math.round(f.fuel)}%`, f.fuel < 20);
  gauge(ctx, W * 0.68, gy, 44, f.throttle, 'THROTTLE', `${Math.round(f.throttle * 100)}%`, false);
  // Compass strip.
  const cx = W * 0.84;
  ctx.fillStyle = 'rgba(16, 14, 26, 0.92)';
  ctx.beginPath();
  ctx.roundRect(cx - 62, gy - 34, 124, 68, 8);
  ctx.fill();
  ctx.fillStyle = '#ffd27a';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  const headingDeg = Math.round(((f.heading * 180) / Math.PI % 360 + 360) % 360);
  ctx.fillText(`${String(headingDeg).padStart(3, '0')}°`, cx, gy - 2);
  ctx.fillStyle = 'rgba(230, 220, 250, 0.8)';
  ctx.font = '11px sans-serif';
  ctx.fillText('HEADING', cx, gy + 18);
  ctx.fillStyle = '#fff4d6';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`${m.name}  ${f.ringsHit}/${m.rings} RINGS`, cx, gy + 34);
  // The yoke, low and centred.
  ctx.strokeStyle = '#3a3048';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(W * 0.5 - 52, H * 0.97);
  ctx.quadraticCurveTo(W * 0.5 - 40, H * 0.9, W * 0.5 - 14, H * 0.9);
  ctx.lineTo(W * 0.5 + 14, H * 0.9);
  ctx.quadraticCurveTo(W * 0.5 + 40, H * 0.9, W * 0.5 + 52, H * 0.97);
  ctx.stroke();
  // Warning lamp when stalled or low on fuel.
  if (f.stall || f.fuel < 20) {
    const on = Math.sin(time * 8) > 0;
    ctx.fillStyle = on ? '#ff5a3c' : '#7a2a1c';
    ctx.beginPath();
    ctx.arc(W * 0.5, panelY + 12, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd7cc';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(f.stall ? 'STALL' : 'LOW FUEL', W * 0.5, panelY + 34);
  }
}
