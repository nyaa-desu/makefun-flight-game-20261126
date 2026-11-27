// Skyhook Run — sound: everything is a WebAudio oscillator or filtered
// noise, so the game ships no audio files at all.

export function createAudio() {
  const audio = {
    ctx: null,
    muted: false,
    engineOsc: null,
    engineGain: null,
    windGain: null,
    windSource: null,
    master: null,
  };

  function ensure() {
    if (audio.ctx) return true;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audio.ctx = new Ctx();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = 0.5;
      audio.master.connect(audio.ctx.destination);
    } catch {
      return false;
    }
    return true;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure() || audio.muted) return;
    const t = audio.ctx.currentTime;
    const osc = audio.ctx.createOscillator();
    const gain = audio.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(audio.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  return {
    muted: () => audio.muted,
    toggleMute() {
      audio.muted = !audio.muted;
      if (audio.master) audio.master.gain.value = audio.muted ? 0 : 0.5;
      return audio.muted;
    },
    /** Start the engine hum and wind once the player has interacted. */
    startEngine() {
      if (!ensure() || audio.engineOsc) return;
      if (audio.ctx.state === 'suspended') audio.ctx.resume();
      const osc = audio.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 52;
      const filter = audio.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      const gain = audio.ctx.createGain();
      gain.gain.value = 0.05;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audio.master);
      osc.start();
      audio.engineOsc = osc;
      audio.engineGain = gain;
      // Wind: looped filtered noise, louder with speed.
      const len = audio.ctx.sampleRate * 2;
      const buffer = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
      const src = audio.ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const windFilter = audio.ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 500;
      windFilter.Q.value = 0.6;
      const windGain = audio.ctx.createGain();
      windGain.gain.value = 0;
      src.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(audio.master);
      src.start();
      audio.windSource = src;
      audio.windGain = windGain;
    },
    /** Engine pitch and wind follow throttle and airspeed. */
    setFlight(throttle, speed) {
      if (!audio.engineOsc || audio.muted) return;
      const t = audio.ctx.currentTime;
      audio.engineOsc.frequency.setTargetAtTime(46 + throttle * 70 + speed * 0.35, t, 0.1);
      audio.engineGain.gain.setTargetAtTime(0.03 + throttle * 0.05, t, 0.1);
      audio.windGain.gain.setTargetAtTime(Math.min(0.16, speed * 0.0016), t, 0.15);
    },
    stopEngine() {
      if (audio.engineOsc) {
        try { audio.engineOsc.stop(); } catch { /* already stopped */ }
        audio.engineOsc = null;
      }
      if (audio.windSource) {
        try { audio.windSource.stop(); } catch { /* already stopped */ }
        audio.windSource = null;
      }
    },
    ring() {
      tone(880, 0.28, 'sine', 0.22, 1318);
      tone(1318, 0.35, 'sine', 0.12);
    },
    miss() {
      tone(220, 0.3, 'triangle', 0.16, 160);
    },
    crash() {
      tone(90, 0.7, 'sawtooth', 0.3, 38);
      tone(55, 0.9, 'square', 0.18, 30);
    },
    land() {
      tone(523, 0.18, 'sine', 0.2);
      tone(659, 0.18, 'sine', 0.2);
      tone(784, 0.4, 'sine', 0.22);
    },
    click() {
      tone(660, 0.07, 'sine', 0.12);
    },
    warn() {
      tone(440, 0.12, 'square', 0.08, 415);
    },
  };
}
