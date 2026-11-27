// Synthesized sound: an engine hum that follows the throttle, wind
// that rises with speed, a chime for each ring and a thud for landing.
// Oscillators only — no audio files, no network. Everything is guarded:
// no AudioContext, no sound, no crash.

export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let windGain = null;
  let muted = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 320;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();
      // Wind: looped noise through a bandpass, gain follows airspeed.
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      noise.loop = true;
      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 500;
      windFilter.Q.value = 0.6;
      windGain = ctx.createGain();
      windGain.gain.value = 0;
      noise.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(ctx.destination);
      noise.start();
      return true;
    } catch {
      ctx = null;
      return false;
    }
  }

  function tone(freq, at, dur, type = 'sine', vol = 0.16) {
    if (!ctx || muted) return;
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(0, ctx.currentTime + at);
      g.gain.linearRampToValueAtTime(vol, ctx.currentTime + at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + at + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(ctx.currentTime + at);
      o.stop(ctx.currentTime + at + dur + 0.05);
    } catch {
      /* sound is decoration, never a failure */
    }
  }

  return {
    // Call on the first user gesture: browsers need one before audio runs.
    unlock() {
      if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    // Per-frame: engine pitch follows throttle, wind follows airspeed.
    update(throttle, speed, flying) {
      if (!ctx || muted) return;
      try {
        const t = ctx.currentTime;
        engineOsc.frequency.setTargetAtTime(52 + throttle * 68, t, 0.08);
        engineGain.gain.setTargetAtTime(flying ? 0.05 + throttle * 0.05 : 0, t, 0.1);
        windGain.gain.setTargetAtTime(flying ? Math.min(0.12, speed * 0.0016) : 0, t, 0.15);
      } catch {
        /* ignore */
      }
    },
    ring(combo) {
      const base = 660 + Math.min(combo, 8) * 40;
      tone(base, 0, 0.22);
      tone(base * 1.5, 0.07, 0.3);
    },
    thud() {
      tone(70, 0, 0.35, 'sine', 0.3);
      tone(48, 0.05, 0.4, 'triangle', 0.22);
    },
    toggleMute() {
      muted = !muted;
      if (ctx && engineGain) engineGain.gain.value = 0;
      return muted;
    },
  };
}
