// Tiny Web Audio sound kit, no asset files needed.
//
// The spray is meant to be listened to almost nonstop, so it's tuned to sit in
// the background: pink noise (softer than white) through a low-pass filter for a
// rounded "whoosh" instead of a hiss, a quiet low rumble for body, slow drift in
// the filter so it never sounds like a static drone, and gentle fades in and out.
// When the jet is hitting dirt the tone opens up slightly as feedback.

const SPRAY_VOLUME = 0.07;
const RUMBLE_VOLUME = 0.035;
const CUTOFF_WALL = 900;   // Hz, low-pass cutoff when spraying a clean surface
const CUTOFF_DIRT = 1300;  // Hz, slightly brighter while scrubbing a stain
const FADE_IN = 0.12;      // s, time constant
const FADE_OUT = 0.2;      // s, time constant

function pinkNoiseBuffer(ctx, seconds) {
  // Paul Kellet's pink noise filter over white noise.
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const out = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  // Crossfade the ends so the loop point doesn't click.
  const fade = Math.floor(ctx.sampleRate * 0.05);
  for (let i = 0; i < fade; i++) {
    const t = i / fade;
    out[i] = out[i] * t + out[len - fade + i] * (1 - t);
  }
  return buf;
}

export class SprayAudio {
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());

    this.master = ctx.createGain();
    this.master.gain.value = 1;
    this.master.connect(ctx.destination);

    // Water: pink noise -> high-pass (remove mud) -> low-pass (remove hiss) -> gain
    const noise = ctx.createBufferSource();
    noise.buffer = pinkNoiseBuffer(ctx, 4);
    noise.loop = true;
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 150;
    this.lowpass = ctx.createBiquadFilter();
    this.lowpass.type = 'lowpass';
    this.lowpass.frequency.value = CUTOFF_WALL;
    this.lowpass.Q.value = 0.5;
    this.sprayGain = ctx.createGain();
    this.sprayGain.gain.value = 0;
    noise.connect(highpass).connect(this.lowpass).connect(this.sprayGain).connect(this.master);
    noise.start();

    // Slow, small wobble on the cutoff so the sound breathes a little.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.35;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 120;
    lfo.connect(lfoDepth).connect(this.lowpass.frequency);
    lfo.start();

    // Pump rumble: a quiet low sine pair, rounded off with its own low-pass.
    this.rumbleGain = ctx.createGain();
    this.rumbleGain.gain.value = 0;
    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.value = 200;
    for (const [f, v] of [[58, 1], [116, 0.35]]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = v;
      osc.connect(g).connect(rumbleFilter);
      osc.start();
    }
    rumbleFilter.connect(this.rumbleGain).connect(this.master);
  }

  setSpraying(on, onDirt = false) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const tc = on ? FADE_IN : FADE_OUT;
    this.sprayGain.gain.setTargetAtTime(on ? SPRAY_VOLUME : 0, t, tc);
    this.rumbleGain.gain.setTargetAtTime(on ? RUMBLE_VOLUME : 0, t, tc * 1.5);
    this.lowpass.frequency.setTargetAtTime(on && onDirt ? CUTOFF_DIRT : CUTOFF_WALL, t, 0.15);
  }

  tone(freq, start, dur, vol = 0.08, type = 'sine') {
    const t = this.ctx.currentTime + start;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  ding() {
    if (!this.ctx) return;
    this.tone(784, 0, 0.5, 0.07);
    this.tone(1175, 0.07, 0.6, 0.05);
  }

  win() {
    if (!this.ctx) return;
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, i * 0.12, 0.6, 0.1, 'triangle'));
  }
}
