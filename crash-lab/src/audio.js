// Crash Lab: sonido sintetizado con Web Audio (sin archivos).
// Safari exige un gesto del usuario: unlock() se llama en el primer toque.
var CL = window.CL || (window.CL = {});

CL.Audio = (function () {
  var ctx = null, master = null, noiseBuf = null;
  var eng = null, engGain = null, engFilter = null;
  var enabled = true, lastHit = 0, hitsActive = 0;

  function unlock() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = enabled ? 0.7 : 0;
      master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      // Motor: diente de sierra filtrado, siempre encendido y con volumen variable
      eng = ctx.createOscillator();
      eng.type = 'sawtooth';
      eng.frequency.value = 50;
      engFilter = ctx.createBiquadFilter();
      engFilter.type = 'lowpass';
      engFilter.frequency.value = 500;
      engGain = ctx.createGain();
      engGain.gain.value = 0;
      eng.connect(engFilter); engFilter.connect(engGain); engGain.connect(master);
      eng.start();
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  function setEnabled(on) {
    enabled = on;
    if (master) master.gain.setTargetAtTime(on ? 0.7 : 0, ctx.currentTime, 0.02);
  }

  // rpm: 0..1, load: 0..1 (acelerador), alive: el motor sigue vivo
  function engine(rpm, load, alive) {
    if (!ctx) return;
    var t = ctx.currentTime;
    eng.frequency.setTargetAtTime(alive ? 45 + rpm * 140 : 30, t, 0.05);
    engFilter.frequency.setTargetAtTime(350 + load * 900, t, 0.05);
    engGain.gain.setTargetAtTime(alive ? 0.05 + load * 0.08 : 0, t, 0.08);
  }

  function silenceEngine() {
    if (ctx) engGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
  }

  // Golpe metálico: ruido filtrado + un "thump" grave. Limita sonidos simultáneos.
  function hit(power) {
    if (!ctx || !enabled) return;
    var t = ctx.currentTime;
    if (t - lastHit < 0.04 || hitsActive > 5) return;
    lastHit = t;
    var p = Math.min(1, power);
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 900 + Math.random() * 1600;
    bp.Q.value = 1.2;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.25 + p * 0.6, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15 + p * 0.35);
    src.connect(bp); bp.connect(g); g.connect(master);
    src.start(t); src.stop(t + 0.6);
    hitsActive++;
    src.onended = function () { hitsActive--; };
    if (p > 0.3) {
      var o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(110, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.25);
      var og = ctx.createGain();
      og.gain.setValueAtTime(0.5 * p, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.connect(og); og.connect(master);
      o.start(t); o.stop(t + 0.32);
    }
  }

  // Pieza que se suelta: un "clank" corto y agudo
  function clank() {
    if (!ctx || !enabled) return;
    var t = ctx.currentTime;
    var o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(620, t);
    o.frequency.exponentialRampToValueAtTime(180, t + 0.12);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.15);
  }

  function suspend() { if (ctx && ctx.state === 'running') ctx.suspend(); }
  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }
  function stream() {
    // Para grabar el clip con sonido
    if (!ctx || !ctx.createMediaStreamDestination) return null;
    var dest = ctx.createMediaStreamDestination();
    master.connect(dest);
    return { stream: dest.stream, done: function () { try { master.disconnect(dest); } catch (e) {} } };
  }

  return { unlock: unlock, setEnabled: setEnabled, engine: engine, silenceEngine: silenceEngine, hit: hit, clank: clank, suspend: suspend, resume: resume, stream: stream };
})();
