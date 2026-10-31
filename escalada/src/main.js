// Estados del juego, bucle principal, cámara, ruta (fogatas, caídas, peligros), guardado.
'use strict';

const ROUTE_VER = 'v4-barrancos'; // si cambia la ruta, los récords viejos ya no sirven

const Game = {
  state: 'menu',
  settings: { lang: 'es', quality: 'med', sens: 1, vol: 0.8, music: 0.5, invY: 0, shake: 1, grabMode: 'hold', autoCam: 1, tune: 0, mode: 'normal', ghost: 1, mtn: 'volcano' },
  save: { records: {}, hints: {}, badges: {}, ghosts: {}, ghostKeys: [], unlocked: 1, gems: {}, unlockedK2: 1, gemsK2: {} },

  boot() {
    this.canvas = document.getElementById('c');
    const sv = U.store.load();
    if (sv) {
      Object.assign(this.settings, sv.settings || {});
      const S = this.save;
      S.hints = sv.hints || {}; S.badges = sv.badges || {};
      // los tiempos, fantasmas y gemas de otra ruta no se pueden comparar con esta
      if (sv.route === ROUTE_VER) {
        S.records = sv.records || {}; S.ghosts = sv.ghosts || {}; S.ghostKeys = sv.ghostKeys || []; S.unlocked = sv.unlocked || 1; S.gems = sv.gems || {};
      } else {
        // los récords del Gigante Blanco no dependen de la ruta del volcán
        const R = sv.records || {};
        for (const k in R) if (k.indexOf('k2:') === 0 || k.indexOf('g:k2:') === 0) S.records[k] = R[k];
      }
      S.unlockedK2 = sv.unlockedK2 || 1; S.gemsK2 = sv.gemsK2 || {};
      if (!MOUNTAINS[this.settings.mtn]) this.settings.mtn = 'volcano';
    } else {
      this.settings.lang = (navigator.language || 'es').toLowerCase().startsWith('es') ? 'es' : 'en';
      this.settings.quality = this._autoQuality();
    }
    LANG = this.settings.lang;
    Input.init(this.canvas);
    UI.init();
    this._applySettings();
    UI.syncSettings(this.settings);
    UI.show('menu');
    window.addEventListener('resize', () => { if (this.gfx) this.gfx.resize(); });
    // En escritorio, Esc suelta el ratón sin avisar a la página: se pausa ahí
    document.addEventListener('pointerlockchange', () => {
      if (!document.pointerLockElement && this.state === 'play' && !Input.isTouch && this._hadLock) this.pause();
      this._hadLock = !!document.pointerLockElement;
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { if (this.state === 'play') this.pause(); Sfx.suspend(); }
      else if (this.state !== 'pause') Sfx.resume();
    });
    // El primer toque desbloquea el audio en Safari
    const unlock = () => { Sfx.init(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
    window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock);
    this._last = performance.now();
    requestAnimationFrame(t => this.loop(t));
    // la montaña se arma detrás del menú (vuelo por los barrancos)
    setTimeout(() => this._menuWorld(), 80);
  },

  _autoQuality() {
    const small = Math.min(screen.width, screen.height) < 500;
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return small ? 'low' : ios ? 'med' : 'high';
  },

  persist() {
    const S = this.save;
    U.store.save({ route: ROUTE_VER, settings: this.settings, records: S.records, hints: S.hints, badges: S.badges, ghosts: S.ghosts, ghostKeys: S.ghostKeys, unlocked: S.unlocked, gems: S.gems, unlockedK2: S.unlockedK2, gemsK2: S.gemsK2 });
  },

  // Lo guardado de la montaña elegida (barrancos desbloqueados y gemas)
  unlockedOf(mid) { return (mid || this.settings.mtn) === 'k2' ? this.save.unlockedK2 : this.save.unlocked; },
  gemsOf(mid) { return (mid || this.settings.mtn) === 'k2' ? this.save.gemsK2 : this.save.gems; },
  recPrefix(mid) { return MOUNTAINS[mid || this.settings.mtn].rec; },
  sectionsOf(mid) { return (mid || this.settings.mtn) === 'k2' ? K2_SECTIONS.length : GORGES.length; },

  // Elegir la montaña en el menú: se vuelve a armar el vuelo de fondo
  setMountain(id) {
    if (!MOUNTAINS[id] || this.settings.mtn === id) return;
    this.setSetting('mtn', id);
    if (this.state !== 'menu') return;
    UI.menuLoading(true);
    setTimeout(() => {
      if (this.gfx) { this.gfx.dispose(); this.gfx = null; }
      this.world = null;
      this._menuWorld();
      UI.menuLoading(false);
    }, 40);
  },

  setSetting(k, v) {
    this.settings[k] = v;
    this._applySettings(k);
    UI.syncSettings(this.settings);
    this.persist();
  },

  _applySettings(changed) {
    const s = this.settings;
    if (LANG !== s.lang) { LANG = s.lang; UI.applyLang(); }
    Sfx.setVolume(s.vol); Sfx.setMusic(s.music);
    Input.touchGrabToggle = s.grabMode === 'toggle';
    UI.tunePanel(!!s.tune && this.state !== 'menu');
    if (changed === 'quality' && this.gfx && (this.state === 'pause' || this.state === 'menu')) this._rebuildGfx();
  },

  _rebuildGfx() {
    this.gfx.dispose();
    this.gfx = new Gfx(this.canvas, this.world, this.settings.quality);
    this.gfx.setAnchorState(this.player ? this.player.anchor : null);
    this.gfx.setTimeOfDay(this.state === 'menu' ? 0.3 : this._dayT(), 0);
    this.gfx.ch.root.visible = this.state !== 'menu';
  },

  // Mundo y gráficos para el menú: se reutilizan al empezar
  _menuWorld() {
    if (this.world || this.state !== 'menu') return;
    try {
      this.world = new World(this.settings.mtn);
      this.gfx = new Gfx(this.canvas, this.world, this.settings.quality);
      this.gfx.ch.root.visible = false;
      this.gfx.setTimeOfDay(0.3, 0);
      this.fly = null;
      UI.menuLive(true);
    } catch (e) {
      // sin 3D en el menú: queda el fondo dibujado
      console.error(e);
      this.world = null; this.gfx = null;
    }
  },

  // ---------- flujo de partida ----------
  // mode: 'route' (toda la ruta) o 'tramo' (un barranco, de una fogata a la siguiente)
  start(mode, tramo) {
    this.runMode = mode; this.runTramo = tramo || 0;
    this.state = 'loading';
    UI.setPlaying(false);
    UI.tunePanel(false);
    UI.show('loading');
    setTimeout(() => this._build(), 60);
  },

  _build() {
    if (!this.world || this.world.mtn.id !== this.settings.mtn) {
      if (this.gfx) { this.gfx.dispose(); this.gfx = null; }
      this.world = new World(this.settings.mtn);
      this.gfx = new Gfx(this.canvas, this.world, this.settings.quality);
    } else {
      this.world.resetState();
      this.gfx.resetState();
    }
    const w = this.world;
    this.player = new Player(w);
    this.gfx.ch.root.visible = true;
    this.hard = this.settings.mode === 'hard';
    const last = w.checkpoints.length - 1;
    this.startCp = this.runMode === 'route' ? 0 : this.runTramo;
    this.endCp = this.runMode === 'route' ? last : this.runTramo + 1;
    this.checkpoint = this.startCp;
    for (let i = 0; i <= this.startCp && i < w.campfires.length; i++) w.campfires[i].lit = true;
    this.elapsed = 0; this.acc = 0; this.cpTime = 0;
    this.stats = { time: 0, falls: 0, gems: 0, splits: [] };
    this.cam = { yaw: 0, pitch: 0.28, dist: CFG.camDist, lookIdle: 9, shake: 0, fov: 0, lift: 0 };
    this._placeAtCheckpoint(this.startCp);
    this.cam.yaw = this.player.yaw;
    this.hurtFlash = 0; this.slowT = 0; this.danger = 0; this.exposure = 0; this.heartT = 0;
    this.chIdx = -1; this.respawnT = 0; this.fallingRocks = []; this.rockState = {}; this.steamState = {};
    this.trail = []; this.trailT = 0;
    this.ghostData = this.settings.ghost ? this.save.ghosts[this._recKey()] || null : null;
    this.breathT = 0; this.climbSnd = 0; this.sprintIdle = 0; this.wave = 0; this.windWarned = 0;
    this.lastBiome = w.biomeIndex(this.player.pos.y);
    this.curGorge = -1; this.inWater = false; this._offT = 0;
    this.gust = 0; this.wind = { x: 0.3, z: 0.2 }; this.fireD = 1e9;
    this.winSeq = null; this.ringTarget = null; this.zipNear = null;
    // montaña nevada: expedición, ventiscas y frío
    this.k2 = w.snow;
    this.cold = 0; this.stormK = 0; this.stormWind = { x: 0, z: 0 }; this.iceState = {};
    this.weather = { phase: 'calm', t: 45 + Math.random() * 25, int: 0 };
    this.expedition = this.k2 ? new Expedition(w, this.startCp, 6, 7 + this.startCp) : null;
    this.greeted = {};
    this.lavaSpots = [];
    for (const p of w.pits) if (p.lava) { const g = w.gorges[p.gi], q = g.samples[Math.min(g.samples.length - 1, Math.round((p.s0 + p.s1) / 2))]; this.lavaSpots.push({ x: q.x, y: p.water, z: q.z }); }
    UI.fires(w, this.startCp, this.endCp);
    this.gfx.setTimeOfDay(0, 0);
    this.gfx.setAnchorState(null);
    this.gfx.celebrate = false;
    this.state = 'play';
    UI.menuLive(false);
    UI.show(null);
    UI.setPlaying(true);
    UI.tunePanel(!!this.settings.tune);
    this._hintOnce(Input.isTouch ? 'h_move' : 'h_move_kb', 'move');
    Sfx.biome = w.snow ? 4 : this.lastBiome;
    this._last = performance.now();
  },

  // Pone al escalador junto a una fogata (o en el campamento de la playa)
  _placeAtCheckpoint(i) {
    const w = this.world, p = this.player, c = w.checkpoints[i];
    const g = w.gorges[Math.min(c.tramo, w.gorges.length - 1)], s0 = g.samples[0];
    const yaw = Math.atan2(s0.x - c.x, s0.z - c.z);
    const x = c.x + Math.sin(yaw) * 4, z = c.z + Math.cos(yaw) * 4;
    p.reset(x, w.groundBelow(x, c.y + 1, z), z, yaw);
    p.anchor = null;
    this.gfx && this.gfx.setAnchorState(null);
  },

  pause() {
    if (this.state !== 'play') return;
    this.state = 'pause';
    Input.releaseAll();
    if (document.pointerLockElement) document.exitPointerLock();
    document.getElementById('pauseInfo').textContent = this._runLabel() + ' · ' + U.fmtTime(this.elapsed);
    UI.show('pause');
  },

  resume() {
    if (this.state !== 'pause') return;
    this.state = 'play';
    UI.show(null);
    Sfx.resume();
    this._last = performance.now();
  },

  quit() {
    this.state = 'menu';
    Input.releaseAll();
    if (document.pointerLockElement) document.exitPointerLock();
    UI.setPlaying(false);
    UI.tunePanel(false);
    this.player = null;
    if (this.gfx) { this.gfx.ch.root.visible = false; this.gfx.setGhost(null); this.gfx.ropeMesh.visible = false; this.gfx.setAnchorState(null); this.gfx.setTimeOfDay(0.3, 0); this.fly = null; }
    UI.menuLive(!!this.gfx);
    UI.show('menu');
  },

  // Volver a la última fogata a mano (desde la pausa)
  toCheckpoint() {
    if (!this.player) return;
    this.state = 'play';
    UI.show(null);
    this._respawn(false);
  },

  _runLabel() {
    return this.runMode === 'route' ? T('routeName') : T(this.world.gorges[this.runTramo].id);
  },

  _recKey() { return this.world.mtn.rec + (this.runMode === 'route' ? 'route' : 't' + this.runTramo) + (this.hard ? '·X' : ''); },

  _dayT() {
    const base = this.runMode === 'route' ? 0 : this.runTramo / this.world.gorges.length;
    return U.clamp(base + this.elapsed / CFG.dayLength, 0, 1);
  },

  // ---------- bucle ----------
  loop(now) {
    requestAnimationFrame(t => this.loop(t));
    let dt = (now - this._last) / 1000;
    this._last = now;
    if (dt > 0.05) dt = 0.05;
    if (dt <= 0) return;
    if (!this.gfx) return;
    const st = this.state;
    if (st === 'play') {
      // cámara lenta cuando la cuerda te detiene
      let sdt = dt;
      if (this.slowT > 0) { this.slowT -= dt; sdt = dt * (this.slowT > 0.2 ? 0.3 : 0.65); }
      this.acc += sdt;
      const step = 1 / 60;
      const inp = Input.poll(dt);
      this._frameInput(inp, dt);
      // un salto pulsado en un cuadro sin paso de física (pantallas de 120 Hz) espera al siguiente
      this.pendJump = this.pendJump || inp.jump;
      inp.jump = this.pendJump;
      let first = true;
      while (this.acc >= step && this.state === 'play') {
        this._fixed(step, inp, first);
        if (first) this.pendJump = false;
        first = false;
        this.acc -= step;
      }
      this.elapsed += sdt;
    } else if (st === 'winseq') {
      Input.poll(dt);
      this._winStep(dt);
    } else if (st === 'respawn') {
      this.respawnT -= dt;
      if (this.respawnT <= 0) this._finishRespawn();
    } else if (st === 'menu') {
      // vuelo por los barrancos detrás del menú, a 30 cuadros por segundo
      this._menuT = (this._menuT || 0) + dt;
      if (this._menuT < 1 / 31) return;
      const mdt = Math.min(0.1, this._menuT);
      this._menuT = 0;
      this._menuCam(mdt);
      Sfx.ambient(30, 0, 0, 0, 0, 0, 0.15, 0, 0);
      this.gfx.updateRoute(mdt, this);
      this.gfx.render(mdt, st);
      return;
    } else {
      // en pausa no hace falta dibujar a 60 fps
      this._idle = (this._idle || 0) + dt;
      if (this._idle < 0.1) return;
      this._idle = 0;
    }
    if (this.player) this._render(dt);
  },

  // Cámara del menú: recorre los cauces por encima, mirando hacia adelante
  _menuCam(dt) {
    const w = this.world, g = this.gfx;
    if (!this.fly) {
      const path = [];
      for (const gr of w.gorges) {
        for (let i = 0; i < gr.samples.length; i += 2) { const q = gr.samples[i]; path.push({ x: q.x, y: Math.max(q.F + 9, gr.rims[i] - 2), z: q.z }); }
        const e = gr.end; path.push({ x: e.x + Math.sin(e.ang) * 8, y: e.F + 9, z: e.z + Math.cos(e.ang) * 8 });
      }
      this.fly = { path, s: 0, y: path[0].y, lx: 0, ly: 0, lz: 0, init: false };
    }
    const f = this.fly, P = f.path, n = P.length;
    f.s = (f.s + dt * 2.2) % (n - 8);
    const at = s => { const i = Math.floor(s), k = s - i, a = P[Math.min(n - 1, i)], b = P[Math.min(n - 1, i + 1)]; return { x: U.lerp(a.x, b.x, k), y: U.lerp(a.y, b.y, k), z: U.lerp(a.z, b.z, k) }; };
    const p = at(f.s), q = at(f.s + 7);
    f.y = f.init ? U.damp(f.y, p.y, 0.8, dt) : p.y;
    const lx = q.x, ly = q.y - 6, lz = q.z;
    if (!f.init) { f.lx = lx; f.ly = ly; f.lz = lz; f.init = true; }
    f.lx = U.damp(f.lx, lx, 1.2, dt); f.ly = U.damp(f.ly, ly, 1.2, dt); f.lz = U.damp(f.lz, lz, 1.2, dt);
    g.camera.position.set(p.x, f.y, p.z);
    g.camera.lookAt(f.lx, f.ly, f.lz);
    const b = w.biomeIndex(f.y);
    g.updateSnow(dt, g.camera.position, b === 2 ? 0.3 : b === 3 ? 0.18 : b === 1 ? 0.2 : 0, { x: 0.3, z: 0.2 }, b === 3 ? 'ash' : b === 1 ? 'pollen' : 'snow');
  },

  _frameInput(inp, dt) {
    const c = this.cam, s = this.settings;
    if (inp.pause) { this.pause(); return; }
    if (inp.lookX || inp.lookY) c.lookIdle = 0; else c.lookIdle += dt;
    c.yaw -= inp.lookX * s.sens;
    c.pitch = U.clamp(c.pitch + inp.lookY * s.sens * (s.invY ? -1 : 1), -0.55, 1.25);
    if (inp.interact) this._interact();
    // apagar "correr" táctil al soltar el joystick
    if (Input.touchSprintOn && !Input.joy) { this.sprintIdle += dt; if (this.sprintIdle > 0.5) Input.touchSprintOn = false; } else this.sprintIdle = 0;
  },

  _fixed(dt, inp, first) {
    const p = this.player, w = this.world;
    w.update(dt);
    if (this.k2) { this._weather(dt); this._coldStep(dt); this.expedition.update(dt, p); }
    const env = this._env(dt);
    const pin = first ? inp : { mx: inp.mx, my: inp.my, grab: inp.grab, sprint: inp.sprint, jump: false };
    const wasAnchor = p.anchor;
    p.step(dt, pin, this.cam.yaw, env);
    if (p.anchor !== wasAnchor) this.gfx.setAnchorState(p.anchor);
    this._handleEvents();
    this._hazards(dt);
    this._checkFalls();
    if (this.state !== 'play') return;
    this._checkProgress();
    this.trailT += dt;
    if (this.trailT >= 0.25) {
      this.trailT -= 0.25;
      this.trail.push(Math.round(p.pos.x * 10), Math.round(p.pos.y * 10), Math.round(p.pos.z * 10), Math.round(p.yaw * 100));
    }
    // vaho con el frío
    this.breathT -= dt;
    if (this.breathT <= 0 && (this.k2 || w.biomeIndex(p.pos.y) === 2)) {
      this.breathT = this.danger > 0.5 ? 0.9 : 1.7;
      const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
      this.gfx.burst(p.pos.x + fx * 0.3, p.pos.y + 1.85, p.pos.z + fz * 0.3, 5, { color: 0xffffff, speed: 0.35, up: 0.15, life: 1.1, size: 0.3, grav: -0.25, alpha: 0.32, spread: 0.1 });
    }
    // pistas por situación
    if (p.steep && p.state !== 'climb') this._hintOnce(Input.isTouch ? 'h_grab' : 'h_grab_kb', 'grab');
    if (p.state === 'climb' && p.stamina < 0.6) this._hintOnce('h_rest', 'rest');
    if (p.state === 'climb' && p.surf && p.surf !== 'rock') this._hintOnce('h_' + p.surf, p.surf);
    if (p.state === 'climb' && p.cz && p.cz.cells) this._hintOnce('h_crumble', 'crumble');
    if (p.slip > 0.3) this._hintOnce('h_slip', 'slip');
    if (this.k2) {
      if (p.steep && p.line && p.line.steep && p.state === 'air') this._hintOnce('h_k2_jumar', 'k2jumar');
      if (p.state === 'jumar' && p.stamina < 0.35) this._hintOnce('h_k2_jrest', 'k2jrest');
      if (p.onLadder) this._hintOnce('h_k2_ladder', 'k2ladder');
      if (p.arresting) this._hintOnce('h_k2_arrest', 'k2arrest');
      if (this.cold > 0.45) this._hintOnce('h_k2_cold', 'k2cold');
    }
  },

  // ---------- montaña nevada: ventiscas y frío ----------
  _weather(dt) {
    const W = this.weather, sec = Math.max(0, Math.min(4, this.checkpoint));
    const scale = [0.55, 0.7, 0.8, 1, 1][sec];
    W.t -= dt;
    if (W.phase === 'calm') { W.int = Math.max(0, W.int - dt * 0.2); if (W.t <= 0) { W.phase = 'build'; W.t = 7; UI.toast(T('stormComing'), 2.6, 'snow'); Sfx.gust(); } }
    else if (W.phase === 'build') { W.int = Math.min(1, W.int + dt / 7); if (W.t <= 0) { W.phase = 'storm'; W.t = 20 + Math.random() * 14; this._hintOnce('h_k2_storm', 'k2storm'); } }
    else if (W.phase === 'storm') { W.int = 1; if (W.t <= 0) { W.phase = 'ease'; W.t = 8; } }
    else { W.int = Math.max(0, W.int - dt / 8); if (W.t <= 0) { W.phase = 'calm'; W.t = [85, 70, 60, 48, 42][sec] + Math.random() * 30; } }
    this.stormK = W.int * scale;
    // ráfagas que cambian de fuerza y de dirección
    const t = this.world.t, gust = 0.5 + 0.5 * Math.sin(t * 1.3) * Math.sin(t * 0.37 + 1), a = 0.9 + Math.sin(t * 0.11) * 0.6;
    const f = this.stormK * (1.5 + 4 * gust);
    this.stormWind.x = Math.cos(a) * f; this.stormWind.z = Math.sin(a) * f;
  },

  _coldStep(dt) {
    const p = this.player, w = this.world;
    let warm = false;
    for (const c of w.campfires) if (c.lit && Math.hypot(c.x - p.pos.x, c.z - p.pos.z) < 9 && Math.abs(c.y - p.pos.y) < 3) warm = true;
    const alt = U.clamp(p.pos.y / w.summit.y, 0, 1);
    if (warm) this.cold = Math.max(0, this.cold - 0.12 * dt);
    else this.cold = Math.min(1, this.cold + (0.0012 + 0.002 * alt + 0.008 * this.stormK) * dt);
  },

  // ---------- entorno: viento, fuego, sonido ----------
  _env(dt) {
    const p = this.player, w = this.world, t = w.t;
    const b = w.biomeIndex(p.pos.y);
    if (b !== this.lastBiome) { this.lastBiome = b; Sfx.biome = w.snow ? 4 : b; }
    let wind = null;
    this.gust = 0;
    for (const z of w.winds) {
      const ph = (t + z.phase) % z.period, cyc = Math.floor((t + z.phase) / z.period);
      const inside = p.pos.x > z.x0 - 2 && p.pos.x < z.x1 + 2 && p.pos.z > z.z0 - 2 && p.pos.z < z.z1 + 2 && p.pos.y > z.y0 && p.pos.y < z.y1;
      if (!inside) continue;
      this._hintOnce('h_wind', 'wind');
      const act = z.period - z.dur, warn = act - z.warn;
      const sg = cyc % 2 ? 1 : -1;
      if (ph >= warn && ph < act) { this.gust = 0.5; if (this.windWarned !== cyc) { this.windWarned = cyc; UI.toast(T('gust'), 1.2, 'wind'); Sfx.gust(); } }
      if (ph >= act) {
        this.gust = 1;
        wind = { x: z.dx * z.force * sg, z: z.dz * z.force * sg };
        if (Math.random() < 0.5) this.gfx.burst(p.pos.x - z.dx * sg * 3, p.pos.y + 0.5 + Math.random() * 2, p.pos.z - z.dz * sg * 3, 1, { color: 0xffffff, speed: 0.5, up: 0, life: 0.5, size: 0.12, grav: 0, alpha: 0.5, spread: 3 });
      }
    }
    if (this.k2 && this.stormK > 0.02) wind = { x: (wind ? wind.x : 0) + this.stormWind.x, z: (wind ? wind.z : 0) + this.stormWind.z };
    this.wind = wind || { x: 0.3, z: 0.2 };
    let fireD = 1e9;
    for (const f of w.campfires) if (f.lit) fireD = Math.min(fireD, Math.hypot(f.x - p.pos.x, f.y - p.pos.y, f.z - p.pos.z));
    this.fireD = fireD;
    return { wind, noRope: this.hard, climbMul: 1, cold: this.k2 ? this.cold : 0 };
  },

  // Rocas que caen y chorros de vapor
  _hazards(dt) {
    const p = this.player, w = this.world, t = w.t, g = this.gfx;
    const chest = { x: p.pos.x, y: p.pos.y + 1, z: p.pos.z };
    this.fallingRocks.length = 0;
    for (let ri = 0; ri < w.rockfalls.length; ri++) {
      const rf = w.rockfalls[ri];
      const near = rf.lanes.some(l => Math.abs(l.x - chest.x) + Math.abs(l.z - chest.z) < 30) && chest.y > rf.bot - 6 && chest.y < rf.top + 8;
      if (!near) continue;
      this._hintOnce('h_rockfall', 'rockfall');
      const fallT = Math.sqrt(2 * (rf.top - rf.bot) / 14);
      rf.lanes.forEach((L, li) => {
        const per = rf.periods[li % rf.periods.length], phs = rf.phase[li % rf.phase.length], ph = (t + phs) % per, key = ri + ':' + li;
        if (ph > per - 1.0 && Math.random() < 0.35) g.burst(L.x, rf.top, L.z, 1, { color: 0xb0a090, speed: 0.6, up: 0.2, life: 0.6, size: 0.18, grav: 3, alpha: 0.7, spread: 0.6 });
        if (ph < fallT) {
          const y = rf.top - 7 * ph * ph;
          this.fallingRocks.push({ x: L.x, y, z: L.z });
          if (this.rockState[key] !== Math.floor((t + phs) / per) && Math.hypot(L.x - chest.x, y - chest.y, L.z - chest.z) < 1.0) {
            this.rockState[key] = Math.floor((t + phs) / per);
            p.knock(L.nx * 4, -1, L.nz * 4);
            this._hurt(0.6); Sfx.rockHit();
          }
          if (ph + dt >= fallT) { g.burst(L.x, rf.bot + 0.3, L.z, 10, { color: 0x9a8f82, speed: 3, up: 1.5, life: 0.7, size: 0.25, alpha: 0.6 }); Sfx.rockfall(); }
        }
      });
    }
    // bloques de hielo que bajan rodando por el cuello de botella
    for (let fi = 0; fi < (w.icefalls || []).length; fi++) {
      const F = w.icefalls[fi];
      const top = F.lanes[0].pts[0], near = Math.hypot(top.x - chest.x, top.z - chest.z) < 45 && chest.y > top.y - 45 && chest.y < top.y + 10;
      if (!near) continue;
      this._hintOnce('h_k2_icefall', 'k2icefall');
      F.lanes.forEach((L, li) => {
        const per = F.periods[li % F.periods.length], phs = F.phase[li % F.phase.length], ph = (t + phs) % per, cyc = Math.floor((t + phs) / per), key = fi + ':' + li;
        const T = L.len / F.speed;
        if (ph > per - 1.1 && Math.random() < 0.4) g.burst(top.x + (L.pts[0].x - top.x), L.pts[0].y + 1.5, L.pts[0].z, 1, { color: 0xffffff, speed: 1, up: 0.3, life: 0.8, size: 0.4, grav: 2, alpha: 0.7, spread: 1.2 });
        if (ph < T) {
          const q = w.alongPts(L.pts, ph * F.speed, this._iq || (this._iq = {}));
          const y = q.y + Math.abs(Math.sin(ph * F.speed * 0.9)) * 0.7;
          this.fallingRocks.push({ x: q.x, y, z: q.z, ice: true });
          if (ph < dt * 1.5) Sfx.rockfall();
          if (Math.random() < 0.3) g.burst(q.x, q.y - 0.3, q.z, 1, { color: 0xf2f8ff, speed: 1.5, up: 0.8, life: 0.6, size: 0.3, grav: 2, alpha: 0.6 });
          if (this.iceState[key] !== cyc && Math.hypot(q.x - chest.x, q.z - chest.z) < 0.7 && Math.abs(y - chest.y) < 1.4) {
            this.iceState[key] = cyc;
            const a = w.alongPts(L.pts, Math.min(L.len, ph * F.speed + 1), {}), dx = a.x - q.x, dz = a.z - q.z, l = Math.hypot(dx, dz) || 1;
            p.knock(dx / l * 5, 1.5, dz / l * 5);
            this._hurt(0.7); Sfx.rockHit();
          }
        }
      });
    }
    for (let si = 0; si < w.steams.length; si++) {
      const s = w.steams[si], ph = (t + s.phase) % s.period, act = s.period - s.dur, warn = act - 0.9;
      const d = Math.hypot(s.x - chest.x, s.y - chest.y, s.z - chest.z);
      if (d > 30) continue;
      if (d < 14) this._hintOnce('h_steam', 'steam');
      if (ph > warn && ph < act && Math.random() < 0.3) g.burst(s.x + s.nx * 0.3, s.y, s.z + s.nz * 0.3, 1, { color: 0xeeeeee, speed: 0.4, up: 0.3, life: 0.6, size: 0.25, grav: -0.5, alpha: 0.5, spread: 0.2 });
      if (ph >= act) {
        g.burst(s.x + s.nx * 0.3, s.y, s.z + s.nz * 0.3, 2, { color: 0xf4f4f4, speed: 0.8, up: 0.4, life: 0.7, size: 0.6, grav: -1, alpha: 0.55, spread: 0.3 });
        const rel = { x: chest.x - s.x, y: chest.y - s.y, z: chest.z - s.z };
        const along = rel.x * s.nx + rel.z * s.nz;
        const perp = Math.hypot(rel.x - s.nx * along, rel.y, rel.z - s.nz * along);
        const key = si + ':' + Math.floor((t + s.phase) / s.period);
        if (along > -0.2 && along < 2.8 && perp < 0.9 && !this.steamState[key]) {
          this.steamState[key] = 1;
          p.knock(s.nx * 7, 2, s.nz * 7);
          this._hurt(0.5); Sfx.steam();
        }
      }
    }
  },

  // Lava, fosos, agua y caídas sin cuerda
  _checkFalls() {
    const p = this.player, w = this.world;
    if (p.state === 'ascend' || p.state === 'zip' || p.state === 'ride') return;
    if (w.inLava(p.pos.x, p.pos.y, p.pos.z)) {
      UI.toast(T('lava'), 1.5, 'flame'); Sfx.hurt(); this._hurt(0.8);
      this.gfx.burst(p.pos.x, p.pos.y, p.pos.z, 25, { color: 0xff7a1a, speed: 5, up: 4, life: 0.9, size: 0.3 });
      if (p.anchor && !this.hard) { p.startAscend(); this.stats.falls++; } else this._respawn(true);
      return;
    }
    // chapuzón
    const wa = w.waterAt(p.pos.x, p.pos.y + 0.1, p.pos.z), inW = !!wa && wa.deep;
    if (inW && !this.inWater) {
      Sfx.splash(U.clamp(-p.vel.y / 12, 0.2, 1));
      this.gfx.burst(p.pos.x, wa.y + 0.1, p.pos.z, 26, { color: 0xeaf8ff, speed: 3.5, up: 3.5, life: 0.8, size: 0.28, alpha: 0.75 });
    }
    this.inWater = inW;
    const pit = w.pitAt(p.pos.x, p.pos.z);
    const inPit = pit && ((p.grounded && p.pos.y < pit.y + 1.6) || (!pit.lava && p.pos.y < pit.water - 0.6));
    if (inPit) {
      this._offT += 1 / 60;
      if (this._offT > 0.45) { this._offT = 0; if (p.anchor && !this.hard) p.startAscend(); else this._respawn(true); }
    } else this._offT = 0;
    const limit = this.hard ? 6 : 12;
    if (p.state === 'air' && !p.grounded && (!p.anchor || this.hard) && p.fallTop - p.pos.y > limit && !p.swim) this._respawn(true);
  },

  // Aviso de cada desafío, títulos de barranco, fogatas y gemas
  _checkProgress() {
    const p = this.player, w = this.world;
    const g = w.gorgeAt(p.pos.x, p.pos.z);
    if (g && g.gi !== this.curGorge && g.gi >= this.curGorge) {
      this.curGorge = g.gi;
      UI.title(T(g.id), T('gs_' + g.id), g.gi + 1, w.gorges.length, w.snow);
      Sfx.title();
    }
    for (let i = this.chIdx + 1; i < w.challenges.length; i++) {
      const c = w.challenges[i];
      if (Math.hypot(c.x - p.pos.x, c.z - p.pos.z) < 5 && Math.abs(c.y - p.pos.y) < 3) {
        this.chIdx = i;
        UI.challenge(i + 1, w.challenges.length, T(c.nm));
        const hk = { boulders: 'h_jump', bridge: 'h_jump', ledge: 'h_ledge', traverse: 'h_traverse', hookGap: 'h_hook', zipline: 'h_zip' }[c.t];
        if (hk) this._hintOnce(hk, hk);
        else if (c.nm === 'c_crack') this._hintOnce('h_crack', 'crack');
        else if (c.t === 'step') this._hintOnce('h_fall', 'fall');
        if (c.bands) this._hintOnce('h_lunge', 'lunge');
        break;
      }
    }
    // en los campamentos de la montaña nevada, la expedición saluda
    if (this.expedition) {
      for (let k = 0; k < w.checkpoints.length; k++) {
        const c = w.checkpoints[k];
        if (k <= this.startCp || this.greeted[k] || Math.hypot(c.x - p.pos.x, c.z - p.pos.z) > 7 || Math.abs(c.y - p.pos.y) > 3) continue;
        const n = this.expedition.restingNear(c.x, c.y, c.z, 10);
        if (!n) continue;
        this.greeted[k] = true;
        setTimeout(() => UI.toast(n.name + ': ' + T('npc_' + (k % 5)), 3.4, 'chat'), 1800);
      }
    }
    // la siguiente fogata se enciende sola al llegar
    const ni = this.checkpoint + 1;
    if (ni <= this.endCp) {
      const c = w.checkpoints[ni];
      if (Math.hypot(c.x - p.pos.x, c.z - p.pos.z) < 6 && Math.abs(c.y - p.pos.y) < 2.5 && p.grounded) this._reachCheckpoint(ni);
    }
    for (const gm of w.gems) {
      if (gm.taken) continue;
      if (Math.hypot(gm.x - p.pos.x, gm.y - (p.pos.y + 1), gm.z - p.pos.z) < 1.3) {
        gm.taken = true; this.stats.gems++;
        this.gemsOf(w.mtn.id)[gm.idx] = 1; this.persist();
        Sfx.gem(); UI.toast(T('gemGot'), 1.6, 'gem');
        this.gfx.burst(gm.x, gm.y, gm.z, 20, { color: 0x8ff0ff, speed: 3, up: 2, life: 0.8, size: 0.2 });
        if (Object.keys(this.gemsOf(w.mtn.id)).length >= w.gems.length) this._badge(w.snow ? 'k2gems' : 'gems');
      }
    }
  },

  _reachCheckpoint(i) {
    const w = this.world, split = this.elapsed - this.cpTime, tramo = i - 1;
    this.cpTime = this.elapsed;
    this.checkpoint = i;
    this.player.anchor = null;
    this.gfx.setAnchorState(null);
    this.stats.splits.push(split);
    // récord del barranco (también cuenta al hacer la ruta completa)
    const key = w.mtn.rec + 't' + tramo + (this.hard ? '·X' : '');
    const prev = this.save.records[key];
    const medal = this._medal(split, this._parTramo(tramo));
    const nb = !prev || split < prev.time;
    if (nb) this.save.records[key] = { time: split, medal, falls: this.stats.falls };
    const nS = w.gorges.length;
    if (w.snow) this.save.unlockedK2 = Math.max(this.save.unlockedK2, Math.min(nS, i + 1));
    else this.save.unlocked = Math.max(this.save.unlocked, Math.min(nS, i + 1));
    this._badge('tramo1');
    this._checkAllGold();
    this.persist();
    const isSummit = !!w.checkpoints[i].summit;
    if (isSummit) { this._startWin(); return; }
    w.campfires[i].lit = true;
    UI.fires(w, this.startCp, this.endCp);
    Sfx.ignite();
    w.campfires[i] && this.gfx.burst(w.campfires[i].x, w.campfires[i].y + 0.5, w.campfires[i].z, 30, { color: 0xffb040, speed: 3, up: 4, life: 1, size: 0.25 });
    UI.toast((w.snow ? T(w.mtn.camps[i]) : T(w.gorges[tramo].id)) + ' · ' + U.fmtTime(split) + (nb ? ' · ' + T('newBest') : ''), 3.5, w.snow ? 'tent' : 'flame');
    if (w.snow) this.cold = Math.max(0, this.cold - 0.25);
    if (i >= this.endCp) this._finish();
  },

  _parTramo(k) {
    let s = 0;
    for (const c of this.world.challenges) if (c.tramo === k) s += c.par;
    return s + 14;
  },
  _parRoute() { let s = 0; for (let k = 0; k < this.world.gorges.length; k++) s += this._parTramo(k); return s; },
  _medal(time, par) { return time <= par ? 'gold' : time <= par * 1.5 ? 'silver' : 'bronze'; },

  _checkAllGold() {
    const R = this.save.records, w = this.world, pre = w.mtn.rec;
    if (w.gorges.every((g, k) => R[pre + 't' + k] && R[pre + 't' + k].medal === 'gold')) this._badge(w.snow ? 'k2gold' : 'allgold');
  },

  // Caída sin cuerda (o en modo Extremo): fundido y de vuelta a la última fogata
  _respawn(fell) {
    if (this.state === 'respawn') return;
    if (fell) { this.stats.falls++; Sfx.fall(); }
    this.state = 'respawn';
    this.respawnT = 0.55;
    document.getElementById('fade').style.opacity = 0.9;
  },

  _finishRespawn() {
    this._placeAtCheckpoint(this.checkpoint);
    this.cam.yaw = this.player.yaw;
    this.state = 'play';
    this.slowT = 0;
    document.getElementById('fade').style.opacity = 0;
    UI.toast(T(this.hard ? 'backToFireHard' : 'backToFire'), 2);
    this._last = performance.now();
  },

  _hurt(k) {
    this.hurtFlash = Math.max(this.hurtFlash, k);
    if (this.settings.shake) this.cam.shake = Math.max(this.cam.shake, k * 0.6);
    this._buzz(30 + k * 60);
  },

  _buzz(ms) { if (navigator.vibrate) { try { navigator.vibrate(Math.round(ms)); } catch (e) { /* */ } } },

  _handleEvents() {
    const p = this.player, g = this.gfx, w = this.world;
    for (const e of p.events) {
      switch (e.type) {
        case 'step': {
          const gb = p.groundBlock;
          const surf = gb ? (gb.kind === 'wood' ? 'wood' : gb.kind === 'ladder' ? 'metal' : w.snow ? 'snow' : 'rock') : w.snow ? 'snow' : w.surfaceAt(p.pos.x, p.pos.y, p.pos.z, 1);
          Sfx.step(surf);
          if (surf === 'sand' || surf === 'snow' || surf === 'ash') g.burst(p.pos.x, p.pos.y + 0.05, p.pos.z, 2, { color: surf === 'snow' ? 0xffffff : surf === 'ash' ? 0x555055 : 0xe6d29c, speed: 1, up: 0.6, life: 0.4, size: 0.15, alpha: 0.6 });
          if (surf === 'water') g.burst(p.pos.x, p.pos.y + 0.1, p.pos.z, 5, { color: 0xeaf8ff, speed: 1.4, up: 1.4, life: 0.45, size: 0.14, alpha: 0.7 });
          if (gb && gb.kind === 'wood' && this.settings.shake) this.cam.shake = Math.max(this.cam.shake, 0.05); // el puente se mece
          break;
        }
        case 'jump': Sfx.jump(); g.burst(p.pos.x, p.pos.y + 0.05, p.pos.z, 6, { color: 0xd8ccb0, speed: 1.6, up: 0.6, life: 0.5, size: 0.2, alpha: 0.5 }); break;
        case 'land': {
          const pw = U.clamp((e.speed - 5) / 22, 0, 1);
          g.charLand(pw);
          Sfx.land(pw);
          g.burst(p.pos.x, p.pos.y + 0.05, p.pos.z, 6 + pw * 20, { color: 0xd8ccb0, speed: 2 + pw * 4, up: 0.8, life: 0.6, size: 0.25, alpha: 0.55 });
          if (this.settings.shake) this.cam.shake = Math.max(this.cam.shake, pw * 0.8);
          break;
        }
        case 'grab': {
          Sfx.grab();
          const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
          g.burst(p.pos.x + fx * 0.3, p.pos.y + 1.7, p.pos.z + fz * 0.3, 7, { color: 0xf4f4f4, speed: 0.9, up: 0.3, life: 0.6, size: 0.16, grav: 0.8, alpha: 0.55, spread: 0.4 });
          break;
        }
        case 'catchWall': Sfx.grab(); this._hurt(0.25); break;
        case 'ledgeGrab': {
          Sfx.ledge();
          if (this.settings.shake) this.cam.shake = Math.max(this.cam.shake, 0.25);
          const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
          g.burst(p.pos.x + fx * 0.6, p.pos.y + e.dh + 0.1, p.pos.z + fz * 0.6, 8, { color: 0xd8ccb0, speed: 1.2, up: 0.3, life: 0.6, size: 0.15, grav: 4, alpha: 0.6, spread: 0.5 });
          this._hintOnce('h_ledgegrab', 'ledgegrab');
          break;
        }
        case 'crack': {
          Sfx.crack();
          const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
          g.burst(p.pos.x + fx * 0.35, p.pos.y + 1.7, p.pos.z + fz * 0.35, 10, { color: 0x9c6b4d, speed: 1, up: 0, life: 0.9, size: 0.14, grav: 9, alpha: 0.9, spread: 0.5 });
          this._buzz(25);
          break;
        }
        case 'clip':
          Sfx.clip();
          if (e.line) this._hintOnce('h_k2_rope', 'k2rope'); else this._hintOnce('h_rope', 'rope');
          break;
        case 'jumarOn': Sfx.jumar(); break;
        case 'ropeGrab': Sfx.grab(); Sfx.jumar(); if (this.settings.shake) this.cam.shake = Math.max(this.cam.shake, 0.4); break;
        case 'arrest': {
          Sfx.arrest();
          g.burst(p.pos.x, p.pos.y + 0.2, p.pos.z, 14, { color: 0xffffff, speed: 2, up: 1.2, life: 0.7, size: 0.22, alpha: 0.7 });
          break;
        }
        case 'catch':
          Sfx.ropeCatch(U.clamp((e.drop || 4) / 12, 0.3, 1));
          this._hurt(0.45); this.stats.falls++;
          this.slowT = 0.55;
          if (this.settings.shake) this.cam.shake = Math.max(this.cam.shake, 0.9);
          UI.toast(T('caught'), 1.4, 'rope');
          break;
        case 'ascend': Sfx.ascend(); break;
        case 'hook': Sfx.hook(); break;
        case 'ride': Sfx.zip(); break;
        case 'lunge': Sfx.lunge(); break;
        case 'mantle': Sfx.mantle(); break;
        case 'release': if (e.tired) { Sfx.tired(); UI.toast(T('noStrength'), 0.9, 'breath'); } break;
        case 'knock': if (this.settings.shake) this.cam.shake = Math.max(this.cam.shake, 0.5); break;
      }
    }
    p.events.length = 0;
    if (p.state === 'jumar') {
      const k = Math.floor(p.climbAnim / Math.PI);
      if (k !== this.climbSnd) { this.climbSnd = k; Sfx.jumar(); Sfx.step('snow'); }
    }
    if (p.state === 'climb') {
      const k = Math.floor(p.climbAnim / Math.PI);
      if (k !== this.climbSnd) {
        this.climbSnd = k;
        Sfx.climbStep(p.surf);
        // magnesio que cae de las manos
        if (Math.random() < 0.5) { const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw); g.burst(p.pos.x + fx * 0.3, p.pos.y + 1.6, p.pos.z + fz * 0.3, 2, { color: 0xffffff, speed: 0.3, up: 0, life: 0.9, size: 0.1, grav: 0.6, alpha: 0.5, spread: 0.3 }); }
      }
      this.breathT -= 1 / 60;
      if (p.stamina < 0.25 && this.breathT <= 0) { this.breathT = 1.1; Sfx.tired(); }
    }
  },

  // ---------- garfio y tirolesa ----------
  _findInteract() {
    const p = this.player, w = this.world, c = this.cam;
    this.ringTarget = null; this.zipNear = null;
    if (p.state !== 'air' && p.state !== 'climb') return;
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
    for (const r of w.rings) {
      const dx = r.x - p.pos.x, dy = r.y - p.pos.y, dz = r.z - p.pos.z, d = Math.hypot(dx, dy, dz);
      if (d > 16 || d < 2 || p.pos.y > r.land.y - 1.5) continue; // solo desde abajo, antes de cruzar
      if ((dx * fx + dz * fz) / Math.hypot(dx, dz) < 0.55) continue;
      this.ringTarget = r;
    }
    if (p.grounded) for (const z of w.zips) if (Math.hypot(z.a.x - p.pos.x, z.a.z - p.pos.z) < 2.4 && Math.abs(z.a.y - 2.35 - p.pos.y) < 1.2) this.zipNear = z;
  },

  _interact() {
    const p = this.player;
    if (this.ringTarget) { p.startZip(this.ringTarget); this.ringTarget = null; }
    else if (this.zipNear) { p.startRide(this.zipNear); this.zipNear = null; }
  },

  _badge(id) {
    if (this.save.badges[id]) return;
    this.save.badges[id] = 1;
    this.persist();
    const b = BADGES.find(x => x.id === id);
    UI.toast(T('badgeGot') + ' ' + T('bd_' + id), 3.2, b.icon);
    Sfx.badge();
  },

  _hintOnce(key, flag) {
    if (this.save.hints[flag]) return;
    this.save.hints[flag] = 1;
    UI.hint(key);
    this.persist();
  },

  // ---------- final de un barranco o de la ruta ----------
  _finish() {
    // barranco suelto terminado (la ruta completa termina en la cumbre)
    this.state = 'win';
    if (this.gfx) this.gfx.celebrate = true;
    Input.releaseAll();
    if (document.pointerLockElement) document.exitPointerLock();
    const st = this._finalStats(), par = this._parTramo(this.runTramo);
    const medal = this._medal(st.time, par);
    const nb = this._recordGhost();
    UI.setPlaying(false);
    UI.resultScreen({ title: T('tramoDone'), sub: T(this.world.gorges[this.runTramo].id), time: st.time, par, falls: st.falls, gems: st.gems, gemsTotal: this._gemsIn(this.runTramo), medal, newBest: nb, splits: null, next: this.runTramo < this.world.gorges.length - 1 });
  },

  _startWin() {
    this.state = 'winseq';
    if (this.gfx) this.gfx.celebrate = true;
    this.winSeq = { t: 0, y: this.world.summit.y + 2 };
    Input.releaseAll();
    if (document.pointerLockElement) document.exitPointerLock();
    Sfx.flare();
    UI.prompt(null);
  },

  _winStep(dt) {
    const s = this.winSeq, w = this.world, g = this.gfx;
    s.t += dt;
    if (s.t < 2.2) {
      s.y += dt * 45;
      g.burst(w.summit.x, s.y, w.summit.z, 4, { color: 0xff4030, speed: 0.6, up: -2, life: 0.8, size: 0.5, grav: 1 });
    } else if (!s.boom) {
      s.boom = true;
      g.burst(w.summit.x, s.y, w.summit.z, 120, { color: 0xff3b2a, speed: 22, up: 2, life: 2.2, size: 0.9, grav: 3, spread: 1 });
      g.burst(w.summit.x, s.y, w.summit.z, 60, { color: 0xffe080, speed: 14, up: 2, life: 1.8, size: 0.6, grav: 3, spread: 1 });
      Sfx.fanfare();
    }
    this.cam.yaw += dt * 0.35;
    this.cam.pitch = U.damp(this.cam.pitch, 0.05, 2, dt);
    if (s.t > 4.5 && !s.shown) {
      s.shown = true;
      this.state = 'win';
      const st = this._finalStats(), route = this.runMode === 'route';
      const par = route ? this._parRoute() : this._parTramo(this.runTramo);
      const medal = this._medal(st.time, par);
      const nb = this._recordGhost();
      if (route) {
        const key = w.mtn.rec + 'route' + (this.hard ? '·X' : '');
        const prev = this.save.records[key];
        if (!prev || st.time < prev.time) this.save.records[key] = { time: st.time, medal, falls: st.falls };
        if (w.snow) { this._badge('k2top'); if (this.hard) this._badge('k2hard'); }
        else this._badge('first');
        if (st.falls === 0) this._badge('clean');
        if (this.hard && !w.snow) this._badge('hard');
        if (medal === 'gold') this._badge('gold');
        if (!w.snow && st.time < 480) this._badge('speed');
        this.persist();
      }
      UI.setPlaying(false);
      UI.resultScreen({ title: T('summit'), sub: route ? T('routeName') : T(w.gorges[this.runTramo].id), time: st.time, par, falls: st.falls, gems: st.gems, gemsTotal: route ? w.gems.length : this._gemsIn(this.runTramo), medal, newBest: nb, splits: route ? st.splits : null, next: false });
    }
  },

  _gemsIn(k) { return this.world.gems.filter(g => g.tramo === k).length; },

  _finalStats() { const s = this.stats; s.time = this.elapsed; return s; },

  // Guarda el fantasma si esta subida es la mejor (solo los 3 más recientes)
  _recordGhost() {
    const key = this._recKey(), S = this.save;
    const prev = S.records['g:' + key];
    const nb = !prev || this.elapsed < prev;
    if (nb) {
      S.records['g:' + key] = this.elapsed;
      S.ghosts[key] = this.trail;
      S.ghostKeys = S.ghostKeys.filter(k => k !== key).concat(key);
      while (S.ghostKeys.length > 3) delete S.ghosts[S.ghostKeys.shift()];
    }
    this.persist();
    return nb;
  },

  next() {
    if (this.runMode === 'tramo' && this.runTramo < this.world.gorges.length - 1) this.start('tramo', this.runTramo + 1);
  },

  // Altura sobre el vacío: lo más bajo que hay justo alrededor del escalador
  _exposureNow() {
    const p = this.player.pos, w = this.world;
    let lo = 1e9;
    for (const o of [[0, 0], [1.5, 0], [-1.5, 0], [0, 1.5], [0, -1.5]]) lo = Math.min(lo, w.groundBelow(p.x + o[0], p.y + 0.3, p.z + o[1]));
    return Math.max(0, p.y - lo);
  },

  // ---------- cámara y dibujo ----------
  _render(dt) {
    const p = this.player, g = this.gfx, c = this.cam, w = this.world;
    const a = this.state === 'play' ? U.clamp(this.acc * 60, 0, 1) : 1;
    const pos = { x: U.lerp(p.prev.x, p.pos.x, a), y: U.lerp(p.prev.y, p.pos.y, a), z: U.lerp(p.prev.z, p.pos.z, a) };
    // peligro: altura sobre el vacío, cansancio, resbalones y cuerda tensa
    this.exposure = U.damp(this.exposure || 0, this._exposureNow(), 6, dt);
    const climbing = p.state === 'climb' || p.state === 'ascend' || p.state === 'jumar';
    const edge = U.clamp((this.exposure - 4) / 14, 0, 1);
    const dangerT = U.clamp(Math.max(climbing || p.onCable || p.taut ? edge : edge * 0.6, p.slip, climbing && p.stamina < 0.3 ? 0.8 : 0, p.taut ? 1 : 0), 0, 1);
    this.danger = U.damp(this.danger || 0, dangerT, 3, dt);
    // cámara automática detrás del escalador; mientras más alto, más se ve el vacío de abajo
    if (this.state === 'play' && climbing && this.settings.autoCam && c.lookIdle > 0.8) {
      c.yaw += U.angDiff(c.yaw, p.yaw) * Math.min(1, dt * 2.2);
      c.pitch = U.damp(c.pitch, 0.26 + edge * 0.38, 1.4, dt);
    }
    const tx = pos.x, ty = pos.y + CFG.camHeight, tz = pos.z;
    const want = (climbing ? CFG.camDistClimb : CFG.camDist) + edge * 1.2;
    // colisión de la cámara con el terreno, los bloques y las paredes: distancia libre para una inclinación dada
    const solid = (x, y, z) => w.solidAt(x, y, z, 0.3);
    const freeDist = pitch => {
      const cp = Math.cos(pitch), fx = Math.sin(c.yaw) * cp, fy = -Math.sin(pitch), fz = Math.cos(c.yaw) * cp;
      for (let i = 1; i <= 14; i++) {
        const k = want * i / 14;
        if (solid(tx - fx * k, ty - fy * k, tz - fz * k)) return Math.max(0.6, k * 0.85);
      }
      return want;
    };
    // si algo tapa la cámara, primero sube en arco por encima del obstáculo
    let lift = 0, d = freeDist(c.pitch);
    if (d < 2.6) {
      for (let k = 1; k <= 6; k++) {
        const dd = freeDist(Math.min(1.35, c.pitch + k * 0.15));
        if (dd > d + 0.4) { d = dd; lift = Math.min(1.35, c.pitch + k * 0.15) - c.pitch; if (dd >= Math.min(want, 3.2)) break; }
      }
    }
    c.lift = U.damp(c.lift || 0, lift, lift > (c.lift || 0) ? 10 : 2, dt);
    const pitchE = c.pitch + c.lift;
    const cp = Math.cos(pitchE), sp = Math.sin(pitchE);
    const fx = Math.sin(c.yaw) * cp, fy = -sp, fz = Math.cos(c.yaw) * cp;
    c.dist = d < c.dist ? d : U.damp(c.dist, d, 3, dt);
    let cx = tx - fx * c.dist, cy = ty - fy * c.dist, cz = tz - fz * c.dist;
    if (c.dist < 1.7) cy += (1.7 - c.dist) * 1.1;
    // al escalar la cámara se mece un poco con cada jalón
    if (p.state === 'climb' || p.state === 'jumar') cy += Math.sin(p.climbAnim * 2) * 0.035;
    // en las escaleras sobre las grietas todo se mece un poco
    if (p.onLadder) { cx += Math.sin(this.wave * 2.1) * 0.05; cy += Math.sin(this.wave * 3.3) * 0.03; }
    const gh = w.heightAt(cx, cz) + 0.4;
    if (cy < gh) cy = gh;
    g.ch.root.visible = Math.hypot(cx - tx, cy - ty, cz - tz) > 0.8;
    if (c.shake > 0) {
      const s = c.shake * 0.25;
      cx += (Math.random() - 0.5) * s; cy += (Math.random() - 0.5) * s; cz += (Math.random() - 0.5) * s;
      c.shake = Math.max(0, c.shake - dt * 2.5);
    }
    g.camera.position.set(cx, cy, cz);
    g.camera.lookAt(tx, ty + (climbing ? 0.3 : 0), tz);
    // caer abre el campo de visión; el vacío también un poco
    const falling = p.state === 'air' && !p.grounded && p.vel.y < -6 ? U.clamp((-p.vel.y - 6) / 14, 0, 1) : 0;
    const fovT = (p.sprinting ? 5 : 0) + (p.state === 'ride' || p.state === 'zip' ? 8 : 0) + falling * 10 + this.danger * 3;
    c.fov = U.damp(c.fov, fovT, 4, dt);
    const baseFov = window.innerWidth < window.innerHeight ? 72 : 62;
    if (Math.abs(g.camera.fov - (baseFov + c.fov)) > 0.05) { g.camera.fov = baseFov + c.fov; g.camera.updateProjectionMatrix(); }
    // entorno visual
    const sk = this.k2 ? this.stormK : 0;
    g.setTimeOfDay(this._dayT(), sk * 0.85);
    // la ventisca cierra la niebla: solo se ve la cuerda fija y lo más cercano
    g.scene.fog.near = U.lerp(60, 4, sk); g.scene.fog.far = U.lerp(g.Q.far, 48, sk);
    if (sk > 0.01) g.scene.fog.color.lerp(g._c2.set(0xdfe6ee), sk * 0.8);
    const b = w.biomeIndex(p.pos.y);
    const moteAmt = this.k2 ? 0.25 + sk * 0.75 + this.gust * 0.2 : b === 2 ? 0.3 + this.gust * 0.4 : b === 3 ? 0.18 : b === 1 ? 0.2 : 0;
    g.updateSnow(dt, g.camera.position, moteAmt, this.wind || { x: 0, z: 0 }, this.k2 ? 'snow' : b === 3 ? 'ash' : b === 1 ? 'pollen' : 'snow');
    g.uWind.value = U.damp(g.uWind.value, 0.25 + (b === 2 ? 0.3 : 0) + this.gust * 0.8 + edge * 0.25 + sk, 1, dt);
    if (this.k2) { g.updateNPCs(this.expedition, dt); g.updateLabels(this, dt); g.setLineGlow(sk); }
    g.updateCharacter(p, pos, dt);
    if (g.chalkPuff) { g.chalkPuff = false; Sfx.chalk(); }
    g.updateRope(p, pos);
    // fantasma de la mejor subida
    const gd = this.ghostData;
    let ghostPos = null;
    if (gd && this.state !== 'menu') {
      const f = this.elapsed / 0.25, i = Math.floor(f) * 4, k = f - Math.floor(f);
      if (i + 7 < gd.length) ghostPos = { x: U.lerp(gd[i], gd[i + 4], k) / 10, y: U.lerp(gd[i + 1], gd[i + 5], k) / 10, z: U.lerp(gd[i + 2], gd[i + 6], k) / 10, yaw: gd[i + 7] / 100 };
    }
    g.setGhost(ghostPos);
    this.ghostPos = ghostPos;
    if (this.state === 'play') this._findInteract();
    g.updateRoute(dt, this);
    g.render(dt, this.state);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 1.5);
    if (this.state === 'play') {
      // anillo de agarre junto al escalador
      const v = g._v.set(pos.x, pos.y + 1.55, pos.z).project(g.camera);
      this.ringScreen = { x: (v.x * 0.5 + 0.5) * window.innerWidth, y: (-v.y * 0.5 + 0.5) * window.innerHeight, ok: v.z < 1 };
      UI.prompt(this.ringTarget ? T('p_hook') : this.zipNear ? T('p_zip') : null);
      UI.updateHUD(this);
      UI.updateCompass(this);
      this.wave += dt;
      const r = Math.hypot(p.pos.x, p.pos.z);
      const nearSea = p.pos.y < 12 && r > CFG.BASE_R - 30 ? 1 - p.pos.y / 12 : 0;
      const fireNear = this.fireD < 14 ? 1 - this.fireD / 14 : 0;
      let lavaNear = 0, waterNear = 0;
      for (const l of this.lavaSpots) lavaNear = Math.max(lavaNear, U.clamp(1 - Math.hypot(l.x - p.pos.x, l.z - p.pos.z) / 30, 0, 1));
      for (const f of g.fallSpots) {
        const dd = Math.hypot(f.x - p.pos.x, (f.y + f.top) / 2 - p.pos.y, f.z - p.pos.z);
        if (f.kind === 'water') waterNear = Math.max(waterNear, U.clamp(1 - dd / 34, 0, 1));
        else if (f.kind === 'lava') lavaNear = Math.max(lavaNear, U.clamp(1 - dd / 30, 0, 1));
      }
      Sfx.ambient(p.pos.y, Math.max(this.gust * 0.6, sk), nearSea, fireNear, lavaNear, this.wave, edge, waterNear, falling);
      // latidos cuando el peligro es real
      this.heartT -= dt;
      if (this.danger > 0.55 && this.heartT <= 0) { this.heartT = U.lerp(0.95, 0.55, this.danger); Sfx.heart(this.danger); }
    }
  }
};

window.__game = Game;
window.addEventListener('load', () => Game.boot());
