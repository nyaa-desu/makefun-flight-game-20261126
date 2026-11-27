// Mara Voss at Milltown Tower: the voice on the radio. Flight events
// become one-line calls, and the last few stay on screen in the side
// panel as the flight log — the valley feels inhabited, not empty.

import { RADIO } from './config.js';

// The radio log: [{text, at}] newest last, kept to 4 lines.
export function createRadio() {
  const log = [];
  return {
    log,
    // Turn a flight event into Mara's line. Returns the line or null.
    say(eventKind, detail) {
      let line = null;
      if (eventKind === 'takeoff') line = RADIO.takeoff;
      else if (eventKind === 'ring' && detail?.ring === 3) line = RADIO.ring3;
      else if (eventKind === 'ring' && detail?.ring === 6) line = RADIO.ring6;
      else if (eventKind === 'finalRing') line = RADIO.finalRing;
      else if (eventKind === 'lowFuel') line = RADIO.lowFuel;
      else if (eventKind === 'missed') line = RADIO.missed;
      else if (eventKind === 'landed') line = RADIO.landed;
      else if (eventKind === 'crash' || eventKind === 'timeout') line = RADIO.crashed;
      else if (eventKind === 'storm') line = RADIO.storm;
      if (!line) return null;
      log.push({ text: line, at: performance.now() });
      if (log.length > 4) log.shift();
      return line;
    },
    // A line the pilot can read at a glance in the side panel.
    lastLines() {
      return log.slice(-3);
    },
  };
}

// The stall warning is a shout, not a chat line — it goes on the HUD.
export function stallCallout() {
  return RADIO.stall;
}
