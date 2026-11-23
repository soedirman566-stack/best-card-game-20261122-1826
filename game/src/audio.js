// audio.js — Crown & Dagger's sounds, synthesised with WebAudio.
//
// There are no sound files in this game: every effect is an oscillator (or a
// breath of filtered noise) shaped for a fraction of a second. The context
// is created lazily on the first user gesture, as browsers require, and
// every call is safe before that — it simply stays silent.

let actx = null;

export function unlockAudio() {
  if (!actx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) actx = new AC();
  }
  if (actx && actx.state === 'suspended') actx.resume();
}

function tone(freq, dur, type = 'sine', gain = 0.16, slideTo = null, delay = 0) {
  if (!actx) return;
  const t0 = actx.currentTime + delay;
  const osc = actx.createOscillator();
  const g = actx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(actx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noiseBurst(dur, gain = 0.12, freq = 1200, delay = 0) {
  if (!actx) return;
  const t0 = actx.currentTime + delay;
  const len = Math.max(1, Math.floor(actx.sampleRate * dur));
  const buffer = actx.createBuffer(1, len, actx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = actx.createBufferSource();
  src.buffer = buffer;
  const filter = actx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  const g = actx.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(actx.destination);
  src.start(t0);
}

// One entry per fx event name duel.js queues. Unknown names stay silent.
export function playSfx(name) {
  if (!actx) return;
  switch (name) {
    case 'play':   noiseBurst(0.07, 0.10, 2400); tone(520, 0.06, 'triangle', 0.06); break;
    case 'hit':    noiseBurst(0.10, 0.16, 700); tone(160, 0.12, 'sawtooth', 0.10, 70); break;
    case 'block':  tone(220, 0.10, 'square', 0.07, 180); noiseBurst(0.05, 0.06, 3000); break;
    case 'guard':  tone(300, 0.12, 'triangle', 0.10, 420); break;
    case 'venom':  tone(620, 0.22, 'sine', 0.09, 240); break;
    case 'heal':   tone(420, 0.14, 'sine', 0.09); tone(630, 0.18, 'sine', 0.09, null, 0.09); break;
    case 'mirror': tone(880, 0.16, 'sine', 0.10, 1320); tone(1320, 0.2, 'sine', 0.06, 1760, 0.08); break;
    case 'gambit': tone(500, 0.07, 'square', 0.07); tone(500, 0.07, 'square', 0.07, null, 0.09); tone(340, 0.12, 'square', 0.07, null, 0.18); break;
    case 'snare':  noiseBurst(0.14, 0.10, 1600); tone(280, 0.12, 'triangle', 0.07, 190); break;
    case 'win':
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.11, null, i * 0.11));
      break;
    case 'lose':
      [392, 330, 262, 196].forEach((f, i) => tone(f, 0.24, 'triangle', 0.10, null, i * 0.12));
      break;
  }
}
