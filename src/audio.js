// Tiny Web Audio sound kit: filtered white noise for the spray, a chime per
// cleaned stain, and a short arpeggio on win. No asset files needed.
export class SprayAudio {
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();

    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2200;
    filter.Q.value = 0.7;
    this.sprayGain = this.ctx.createGain();
    this.sprayGain.gain.value = 0;
    src.connect(filter).connect(this.sprayGain).connect(this.ctx.destination);
    src.start();
  }

  setSpraying(on) {
    if (!this.ctx) return;
    const target = on ? 0.18 : 0;
    this.sprayGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.04);
  }

  tone(freq, start, dur, vol = 0.15) {
    const t = this.ctx.currentTime + start;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  ding() {
    if (!this.ctx) return;
    this.tone(880, 0, 0.35);
    this.tone(1320, 0.08, 0.4);
  }

  win() {
    if (!this.ctx) return;
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, i * 0.12, 0.5, 0.18));
  }
}
