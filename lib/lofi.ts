/**
 * A tiny lo-fi beat generated live in the browser with the Web Audio API.
 *
 * No audio file is downloaded and there is no track to license: the chords,
 * bass, drums and vinyl crackle are all synthesized here. This file is only
 * loaded the first time someone presses the music button (see LofiToggle.tsx).
 */

const BPM = 72;
const EIGHTH = 60 / BPM / 2; // seconds per 8th note
const SWING = 0.18 * EIGHTH; // lazy, behind-the-beat off-beats

// A classic lo-fi loop: Dm9 → G13 → Cmaj9 → Am9 (MIDI note numbers), one bar each.
const CHORDS = [
  { bass: 38, notes: [53, 57, 60, 64] }, // Dm9  (F A C E over D)
  { bass: 43, notes: [53, 57, 59, 64] }, // G13  (F A B E over G)
  { bass: 36, notes: [52, 55, 59, 62] }, // Cmaj9 (E G B D over C)
  { bass: 45, notes: [55, 60, 64, 67] }, // Am9  (G C E G over A)
];
const MELODY = [69, 72, 74, 76, 79, 81]; // A minor pentatonic, kept high and sparse

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export interface LofiPlayer {
  stop: () => void;
}

/** Start the beat on an AudioContext created during the visitor's tap. */
export function startLofi(ctx: AudioContext): LofiPlayer {
  const master = ctx.createGain();
  master.gain.setValueAtTime(0, ctx.currentTime);
  master.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 2); // gentle fade-in

  // Everything runs through a warm low-pass, like an old tape.
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 2200;
  master.connect(tone).connect(ctx.destination);

  // A short echo for the melody.
  const echo = ctx.createDelay(1);
  echo.delayTime.value = EIGHTH * 3;
  const echoBack = ctx.createGain();
  echoBack.gain.value = 0.35;
  echo.connect(echoBack).connect(echo);
  echo.connect(master);

  const noise = makeNoise(ctx);
  const crackle = startCrackle(ctx, master, noise);

  /* ---------------- instruments ---------------- */

  function keys(midi: number, t: number, vel: number, len: number) {
    // Soft electric-piano-ish tone: a sine plus a quiet, slightly detuned triangle.
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.07 * vel, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.025 * vel, t + 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    g.connect(master);
    for (const [type, detune, level] of [["sine", 0, 1], ["triangle", 7, 0.35]] as const) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = hz(midi);
      o.detune.value = detune;
      const lv = ctx.createGain();
      lv.gain.value = level;
      o.connect(lv).connect(g);
      o.start(t);
      o.stop(t + len + 0.05);
    }
  }

  function bass(midi: number, t: number, len: number) {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = hz(midi);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + len + 0.05);
  }

  function lead(midi: number, t: number) {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = hz(midi);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.045, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.connect(g);
    g.connect(master);
    g.connect(echo);
    o.start(t);
    o.stop(t + 1);
  }

  function kick(t: number) {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.4);
  }

  function hit(t: number, filter: BiquadFilterType, freq: number, level: number, len: number) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(f).connect(g).connect(master);
    src.start(t, Math.random() * 1.5);
    src.stop(t + len + 0.02);
  }

  /* ---------------- sequencer ---------------- */

  let step = 0; // 8th notes since start
  let next = ctx.currentTime + 0.1;

  function play(s: number, t: number) {
    const inBar = s % 8;
    const chord = CHORDS[Math.floor(s / 8) % CHORDS.length];
    const at = inBar % 2 ? t + SWING : t;

    if (inBar === 0) chord.notes.forEach((n, i) => keys(n, t + i * 0.012, 1, EIGHTH * 7)); // slight strum
    if (inBar === 3 && Math.random() < 0.6) chord.notes.slice(1).forEach((n) => keys(n, at, 0.55, EIGHTH * 3));
    if (inBar === 0) bass(chord.bass, t, EIGHTH * 3);
    if (inBar === 5) bass(chord.bass + (Math.random() < 0.5 ? 7 : 12), at, EIGHTH * 2);

    if (inBar === 0 || inBar === 5) kick(at);
    if (inBar === 4) hit(at, "bandpass", 1800, 0.22, 0.18); // snare
    hit(at, "highpass", 7000, inBar % 2 ? 0.035 : 0.06, 0.05); // hi-hat

    if (s >= 16 && inBar % 2 === 0 && Math.random() < 0.22) {
      lead(MELODY[Math.floor(Math.random() * MELODY.length)], at);
    }
  }

  // Schedule a little ahead of time so timing stays steady even if the page is busy.
  const timer = setInterval(() => {
    while (next < ctx.currentTime + 0.3) {
      play(step, next);
      step++;
      next += EIGHTH;
    }
  }, 50);

  return {
    stop() {
      clearInterval(timer);
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + 0.4);
      crackle.stop(now + 0.5);
      setTimeout(() => void ctx.close(), 600);
    },
  };
}

/** Two seconds of white noise, reused by the drums and the crackle. */
function makeNoise(ctx: AudioContext): AudioBuffer {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

/** Quiet vinyl hiss with the odd pop, on a loop. */
function startCrackle(ctx: AudioContext, out: AudioNode, noise: AudioBuffer): AudioBufferSourceNode {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
  const data = buf.getChannelData(0);
  const src = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = src[i % src.length] * 0.012 + (Math.random() < 0.0004 ? (Math.random() - 0.5) * 0.6 : 0);
  }
  const node = ctx.createBufferSource();
  node.buffer = buf;
  node.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = 3000;
  f.Q.value = 0.6;
  node.connect(f).connect(out);
  node.start();
  return node;
}
