// All game audio is synthesised at runtime — no asset files.
// Extracted from app.js in Phase 2a; behaviour is unchanged.

interface LegacyAudioWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

export class SoundKit {
  ctx: AudioContext | null = null;
  enabled = true;
  private lastRattle = 0;

  setEnabled(value: boolean) { this.enabled = value; }

  async unlock() {
    if (!this.enabled) return;
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext || (window as LegacyAudioWindow).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
      }
      if (this.ctx.state === 'suspended') await this.ctx.resume();
    } catch { /* audio is optional */ }
  }

  tone(freq: number, duration = .12, type: OscillatorType = 'sine', gain = .045, when = 0) {
    if (!this.enabled || !this.ctx) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + when);
    amp.gain.setValueAtTime(0.0001, ctx.currentTime + when);
    amp.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + when + .012);
    amp.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + when + duration);
    osc.connect(amp).connect(ctx.destination);
    osc.start(ctx.currentTime + when);
    osc.stop(ctx.currentTime + when + duration + .03);
  }

  noise(duration = .08, gain = .04, when = 0, freq = 1200) {
    if (!this.enabled || !this.ctx) return;
    const ctx = this.ctx;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = .8;
    const amp = ctx.createGain();
    amp.gain.value = gain;
    source.connect(filter).connect(amp).connect(ctx.destination);
    source.start(ctx.currentTime + when);
  }

  click() { this.tone(430 + Math.random() * 90, .055, 'triangle', .025); }

  dice(count = 6) {
    for (let i = 0; i < Math.min(10, count + 3); i += 1) {
      this.noise(.06 + Math.random() * .04, .035, i * .035 + Math.random() * .02, 800 + Math.random() * 1200);
    }
    this.tone(118, .18, 'sine', .03, .06);
  }

  rattle() {
    const now = performance.now();
    if (now - this.lastRattle < 75) return;
    this.lastRattle = now;
    this.noise(.035, .018, 0, 1700 + Math.random() * 900);
  }

  score(value = 300) {
    const base = 330;
    this.tone(base, .12, 'triangle', .035);
    this.tone(base * 1.25, .14, 'triangle', .028, .07);
    this.tone(base * 1.5, .2, 'sine', .025, .14);
    if (value > 800) this.tone(base * 2, .28, 'sine', .025, .22);
  }

  item() { this.tone(620, .1, 'triangle', .028); this.tone(930, .2, 'sine', .02, .07); }
  paperUnfold() { this.noise(.24, .035, 0, 620); this.tone(240, .16, 'triangle', .022, .02); this.tone(360, .12, 'sine', .015, .12); }

  gesture() {
    [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, .24, 'sine', .022, i * .075));
  }

  win() {
    [261.6, 329.6, 392, 523.2].forEach((f, i) => this.tone(f, .8, 'triangle', .03, i * .13));
    this.tone(130.8, 1.2, 'sine', .025, .02);
  }

  lose() {
    this.tone(196, .5, 'sine', .03);
    this.tone(146.8, .8, 'sine', .025, .2);
    this.tone(98, 1.1, 'triangle', .02, .36);
  }
}

export const sound = new SoundKit();
