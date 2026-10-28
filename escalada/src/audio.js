// Sonido sintetizado con WebAudio (sin archivos). Safari exige un gesto para arrancar.
'use strict';

const Sfx = {
  ctx: null, master: null, musicGain: null, vol: 0.8, musicVol: 0.5,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { this.ctx = new AC(); } catch (e) { return; }
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = this.vol; this.master.connect(c.destination);
    this.musicGain = c.createGain(); this.musicGain.gain.value = this.musicVol * 0.25; this.musicGain.connect(this.master);
    // ruido reutilizable
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
    // viento (bucle)
    this.wind = this._loopNoise('bandpass', 500, 0.6);
    this.waves = this._loopNoise('lowpass', 420, 0.8);
    this.fire = this._loopNoise('highpass', 2500, 0.5);
    this.lava = this._loopNoise('lowpass', 160, 1);
    this._startMusic();
  },
  _loopNoise(type, freq, q) {
    const c = this.ctx, src = c.createBufferSource();
    src.buffer = this.noise; src.loop = true;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start();
    return { f, g };
  },
  setVolume(v) { this.vol = v; if (this.master) this.master.gain.value = v; },
  setMusic(v) { this.musicVol = v; if (this.musicGain) this.musicGain.gain.value = v * 0.25; },
  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },

  // Ambiente continuo según el entorno
  ambient(alt, storm, nearSea, fireNear, lavaNear, wave) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const wv = U.clamp(0.04 + alt / 300 * 0.18 + storm * 0.35, 0, 0.6);
    this.wind.g.gain.setTargetAtTime(wv, t, 0.4);
    this.wind.f.frequency.setTargetAtTime(380 + alt * 1.2 + storm * 400 + Math.sin(t * 0.7) * 120, t, 0.5);
    this.waves.g.gain.setTargetAtTime(nearSea * (0.12 + 0.1 * Math.sin(wave)), t, 0.3);
    this.fire.g.gain.setTargetAtTime(fireNear * 0.05 * (0.6 + Math.random() * 0.8), t, 0.05);
    this.lava.g.gain.setTargetAtTime(lavaNear * 0.4, t, 0.4);
  },

  _env(g, t, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  },
  _noiseHit(freq, type, peak, dec, q, delay) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + (delay || 0);
    const s = c.createBufferSource(); s.buffer = this.noise;
    s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q || 1;
    const g = c.createGain();
    s.connect(f); f.connect(g); g.connect(this.master);
    this._env(g, t, 0.004, peak, dec);
    s.start(t, Math.random() * 1.5); s.stop(t + dec + 0.05);
  },
  _tone(freq, type, peak, dec, slide, delay, dest) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + (delay || 0);
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dec);
    const g = c.createGain();
    o.connect(g); g.connect(dest || this.master);
    this._env(g, t, 0.01, peak, dec);
    o.start(t); o.stop(t + dec + 0.05);
  },

  step(surface) {
    const m = { sand: [700, 0.05, 0.09], grass: [1200, 0.05, 0.07], rock: [2600, 0.07, 0.05], snow: [900, 0.09, 0.12], ash: [1600, 0.06, 0.07] }[surface] || [1500, 0.05, 0.06];
    this._noiseHit(m[0] * (0.85 + Math.random() * 0.3), 'bandpass', m[1], m[2], 1.2);
  },
  jump() { this._noiseHit(900, 'bandpass', 0.05, 0.1, 2); this._tone(220, 'sine', 0.05, 0.12, 1.3); },
  grab() { this._noiseHit(3000, 'bandpass', 0.06, 0.05, 3); },
  climbStep() { this._noiseHit(2200 + Math.random() * 800, 'bandpass', 0.03, 0.04, 3); },
  lunge() { this._tone(180, 'triangle', 0.08, 0.18, 1.6); this._noiseHit(1200, 'bandpass', 0.06, 0.12, 2); },
  land(power) {
    const p = U.clamp(power, 0, 1);
    this._tone(140, 'sine', 0.15 + p * 0.4, 0.2 + p * 0.25, 0.4);
    this._noiseHit(500, 'lowpass', 0.08 + p * 0.3, 0.15 + p * 0.2, 1);
    if (p > 0.3) this._tone(320, 'sawtooth', 0.04 * p, 0.25, 0.6, 0.02);
  },
  pickup() { this._tone(660, 'triangle', 0.1, 0.12); this._tone(990, 'triangle', 0.1, 0.16, 1, 0.08); },
  eat() { for (let i = 0; i < 3; i++) this._noiseHit(1800, 'bandpass', 0.07, 0.05, 2, i * 0.11); },
  drink() { for (let i = 0; i < 4; i++) this._tone(300 + i * 40, 'sine', 0.06, 0.07, 1.4, i * 0.09); },
  bad() { this._tone(300, 'sawtooth', 0.06, 0.4, 0.5); },
  open() { this._noiseHit(800, 'bandpass', 0.1, 0.1, 1.5); this._tone(500, 'square', 0.03, 0.06, 1, 0.05); },
  ignite() { this._noiseHit(600, 'lowpass', 0.25, 0.6, 0.7); this._tone(392, 'triangle', 0.08, 0.5, 1, 0.1); this._tone(587, 'triangle', 0.07, 0.6, 1, 0.25); },
  piton() { this._tone(1400, 'square', 0.05, 0.05); this._tone(1700, 'square', 0.05, 0.05, 1, 0.09); },
  erupt() { this._noiseHit(200, 'lowpass', 0.35, 1.0, 0.8); this._tone(60, 'sine', 0.3, 0.9, 0.6); },
  hurt() { this._tone(200, 'square', 0.07, 0.15, 0.6); },
  faint() { this._tone(330, 'sine', 0.12, 1.4, 0.3); },
  tired() { this._noiseHit(600, 'bandpass', 0.05, 0.35, 1); },
  ui() { this._tone(880, 'sine', 0.04, 0.05); },
  hook() { this._noiseHit(2400, 'highpass', 0.12, 0.25, 0.7); this._tone(900, 'sawtooth', 0.04, 0.2, 0.5); this._tone(1800, 'square', 0.04, 0.05, 1, 0.22); },
  badge() { [784, 988, 1175, 1568].forEach((f, i) => this._tone(f, 'triangle', 0.08, 0.25, 1, i * 0.09)); },
  flare() { this._noiseHit(1500, 'highpass', 0.2, 1.5, 0.5); this._tone(400, 'sawtooth', 0.06, 1.2, 3); },
  fanfare() {
    const n = [523, 659, 784, 1047, 784, 1047];
    n.forEach((f, i) => { this._tone(f, 'triangle', 0.12, 0.35, 1, i * 0.16); this._tone(f / 2, 'sine', 0.08, 0.4, 1, i * 0.16); });
  },

  // Música ambiental suave: acordes lentos que cambian por bioma.
  _startMusic() {
    this.chordT = 0; this.biome = 0;
    this._musicTick();
  },
  CHORDS: [
    [[220, 277, 330], [196, 247, 294], [175, 220, 262], [196, 247, 330]],
    [[196, 233, 294], [175, 220, 262], [156, 196, 233], [175, 220, 294]],
    [[165, 196, 247], [147, 175, 220], [131, 165, 196], [147, 185, 220]],
    [[147, 175, 220], [139, 165, 208], [131, 156, 196], [123, 147, 185]]
  ],
  _musicTick() {
    if (!this.ctx) return;
    const c = this.ctx, set = this.CHORDS[this.biome] || this.CHORDS[0];
    const ch = set[this.chordT % set.length];
    this.chordT++;
    if (c.state === 'running' && this.musicVol > 0) {
      const t = c.currentTime;
      ch.forEach((f, i) => {
        const o = c.createOscillator(); o.type = i === 0 ? 'triangle' : 'sine'; o.frequency.value = f;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.18, t + 2.5);
        g.gain.linearRampToValueAtTime(0.0001, t + 7.8);
        o.connect(lp); lp.connect(g); g.connect(this.musicGain);
        o.start(t); o.stop(t + 8);
      });
      // nota de melodía ocasional
      if (Math.random() < 0.6) this._tone(ch[(Math.random() * 3) | 0] * 2, 'sine', 0.12, 1.6, 1, 1 + Math.random() * 3, this.musicGain);
    }
    this._mt = setTimeout(() => this._musicTick(), 7000);
  }
};
