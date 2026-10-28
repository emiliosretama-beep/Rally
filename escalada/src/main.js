// Estados del juego, bucle principal, cámara, entorno, objetos y guardado.
'use strict';

const Game = {
  state: 'menu',
  settings: { lang: 'es', quality: 'med', sens: 1, vol: 0.8, music: 0.5, invY: 0, shake: 1, grabMode: 'hold', autoCam: 1, tune: 0, mode: 'normal', ghost: 1 },
  save: { best: {}, hints: {}, badges: {}, ghosts: {}, ghostKeys: [] },
  inv: null,

  boot() {
    this.canvas = document.getElementById('c');
    const sv = U.store.load();
    if (sv) {
      Object.assign(this.settings, sv.settings || {});
      this.save.best = sv.best || {}; this.save.hints = sv.hints || {};
      this.save.badges = sv.badges || {}; this.save.ghosts = sv.ghosts || {}; this.save.ghostKeys = sv.ghostKeys || [];
    }
    else {
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
  },

  _autoQuality() {
    const small = Math.min(screen.width, screen.height) < 500;
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return small ? 'low' : ios ? 'med' : 'high';
  },

  persist() {
    const S = this.save;
    U.store.save({ settings: this.settings, best: S.best, hints: S.hints, badges: S.badges, ghosts: S.ghosts, ghostKeys: S.ghostKeys });
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
    if (changed === 'quality' && this.gfx && this.state === 'pause') this._rebuildGfx();
  },

  _rebuildGfx() {
    this.gfx.dispose();
    this.gfx = new Gfx(this.canvas, this.world, this.settings.quality);
    for (const pt of this.player.pitons) this.gfx.addPiton(pt);
    this.gfx.updateBushes();
    this.gfx.setTimeOfDay(this._dayT(), 0);
  },

  // ---------- flujo de partida ----------
  start(seedKey) {
    this.seedKey = seedKey;
    this.state = 'loading';
    UI.setPlaying(false);
    UI.tunePanel(false);
    document.getElementById('loadSeed').textContent = T('seed') + ' ' + seedKey;
    UI.show('loading');
    setTimeout(() => this._build(), 60);
  },

  _build() {
    if (this.gfx) { this.gfx.dispose(); this.gfx = null; }
    this.world = new World(U.hashStr(seedKey_(this.seedKey)));
    this.player = new Player(this.world);
    this.gfx = new Gfx(this.canvas, this.world, this.settings.quality);
    this.hard = this.settings.mode === 'hard';
    this.inv = ['granola', null, null, null];
    this.elapsed = 0; this.acc = 0;
    this.stats = { time: 0, deaths: 0, maxFall: 0, eaten: 0, maxAlt: 0, cases: 0, hooks: 0, pitons: 0 };
    // fantasma: grabación de esta subida y reproducción de la mejor
    this.trail = []; this.trailT = 0;
    this.ghostData = this.settings.ghost ? this.save.ghosts[this._recKey()] || null : null;
    this.aimHit = null; this.breathT = 0; this._bigFall = false;
    this.checkpoint = 0;
    this.cam = { yaw: this.world.start.yaw, pitch: 0.28, dist: CFG.camDist, lookIdle: 9, shake: 0, fov: 0 };
    this.hurtFlash = 0;
    this.storm = { t: 40 + Math.random() * 30, on: false, k: 0, ang: Math.random() * 6.28 };
    this.lavaCd = 0; this.ventHit = {}; this.climbSnd = 0; this.breathT = 0; this.sprintIdle = 0;
    this.lastBiome = 0; this.winSeq = null; this.deadT = 0; this.hintQ = [];
    this.wave = 0;
    UI.renderSlots(this.inv);
    UI.fires(this.world);
    this.gfx.setTimeOfDay(0, 0);
    this.state = 'play';
    UI.show(null);
    UI.setPlaying(true);
    UI.tunePanel(!!this.settings.tune);
    this._hintOnce(Input.isTouch ? 'h_move' : 'h_move_kb', 'move');
    Sfx.biome = 0;
    this._last = performance.now();
  },

  pause() {
    if (this.state !== 'play') return;
    this.state = 'pause';
    Input.releaseAll();
    if (document.pointerLockElement) document.exitPointerLock();
    document.getElementById('pauseInfo').textContent = T('seed') + ' ' + this.seedKey + ' · ' + U.fmtTime(this.elapsed);
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
    if (this.gfx) { this.gfx.dispose(); this.gfx = null; }
    this.world = null; this.player = null;
    UI.show('menu');
  },

  afterDeath() {
    if (this.hard) { this.start(this.seedKey); return; }
    const f = this.world.campfires[this.checkpoint];
    const p = this.player;
    p.reset(f.x + 1.5, this.world.heightAt(f.x + 1.5, f.z + 1.5), f.z + 1.5, p.yaw);
    p.aff.hunger = Math.min(p.aff.hunger, 0.3);
    p.aff.injury = 0.2; p.aff.cold = 0; p.aff.poison = 0;
    this.state = 'play';
    UI.show(null);
    document.getElementById('fade').style.opacity = 0;
    this._last = performance.now();
  },

  _dayT() { return U.clamp(this.elapsed / CFG.dayLength, 0, 1); },

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
      this.acc += dt;
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
      this.elapsed += dt;
    } else if (st === 'winseq') {
      Input.poll(dt);
      this._winStep(dt);
    } else if (st === 'dying') {
      this.deadT += dt;
      if (this.deadT > 1.6) {
        this.state = 'dead';
        UI.deadScreen(this._finalStats(), this.hard);
      }
    } else {
      // en menús de pausa no hace falta dibujar a 60 fps
      this._idle = (this._idle || 0) + dt;
      if (this._idle < 0.1) return;
      this._idle = 0;
    }
    this._render(dt);
  },

  _frameInput(inp, dt) {
    const c = this.cam, s = this.settings;
    if (inp.pause) { this.pause(); return; }
    const sens = s.sens;
    if (inp.lookX || inp.lookY) c.lookIdle = 0; else c.lookIdle += dt;
    c.yaw -= inp.lookX * sens;
    c.pitch = U.clamp(c.pitch + inp.lookY * sens * (s.invY ? -1 : 1), -0.55, 1.25);
    if (inp.itemUse >= 0) this.useItem(inp.itemUse);
    if (inp.itemDrop >= 0) this.dropItem(inp.itemDrop);
    if (inp.interact) this._interact();
    // apagar "correr" táctil al soltar el joystick
    if (Input.touchSprintOn && !Input.joy) { this.sprintIdle += dt; if (this.sprintIdle > 0.5) Input.touchSprintOn = false; } else this.sprintIdle = 0;
  },

  _fixed(dt, inp, first) {
    const p = this.player, w = this.world;
    const env = this._env(dt);
    // los eventos de un solo toque solo cuentan en el primer paso del cuadro
    const pin = first ? inp : { mx: inp.mx, my: inp.my, grab: inp.grab, sprint: inp.sprint, jump: false };
    p.step(dt, pin, this.cam.yaw, env);
    this._handleEvents();
    if (p.pos.y > this.stats.maxAlt) this.stats.maxAlt = p.pos.y;
    this.trailT += dt;
    if (this.trailT >= 0.25) {
      this.trailT -= 0.25;
      this.trail.push(Math.round(p.pos.x * 10), Math.round(p.pos.y * 10), Math.round(p.pos.z * 10), Math.round(p.yaw * 100));
    }
    // vaho con el frío
    this.breathT -= dt;
    if (this.breathT <= 0 && (w.biomeIndex(p.pos.y) === 2 || p.aff.cold > 0.15) && p.state !== 'down') {
      this.breathT = 1.7;
      const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
      this.gfx.burst(p.pos.x + fx * 0.3, p.pos.y + 1.85, p.pos.z + fz * 0.3, 5, { color: 0xffffff, speed: 0.35, up: 0.15, life: 1.1, size: 0.3, grav: -0.25, alpha: 0.32, spread: 0.1 });
    }
    if (p.onVine) this._hintOnce('h_vine', 'vine');
    if (p.onIce) this._hintOnce('h_ice', 'ice');
    if (this._bigFall && p.state !== 'down') { this._bigFall = false; this._badge('fall'); }
    if (this.stats.eaten >= 8) this._badge('glutton');
    if (this.stats.cases >= 10) this._badge('explorer');
    if (p.vineClimb >= 40) this._badge('tarzan');
    if (this.stats.hooks >= 3) this._badge('spider');
    // ¿Se desmayó?
    if (p.state === 'down' && this.state === 'play') {
      this.state = 'dying'; this.deadT = 0;
      this.stats.deaths++;
      Sfx.faint();
      document.getElementById('fade').style.opacity = 0.85;
      if (this.hard) this._recordRun(false);
    }
    // pistas por situación
    if (p.steep && p.state !== 'climb') this._hintOnce(Input.isTouch ? 'h_grab' : 'h_grab_kb', 'grab');
    if (p.state === 'climb' && p.stamina < 0.55) this._hintOnce('h_stamina', 'stamina');
    if (p.state === 'climb' && this.save.hints.stamina && p.pos.y > 20) this._hintOnce('h_lunge', 'lunge');
    if (p.aff.hunger > 0.22) this._hintOnce('h_hunger', 'hunger');
    const f1 = w.campfires[1];
    if (!f1.lit && Math.hypot(f1.x - p.pos.x, f1.z - p.pos.z) < 30) this._hintOnce('h_fire', 'fire');
  },

  // Clima, frío, hambre, lava, fumarolas
  _env(dt) {
    const p = this.player, w = this.world, a = p.aff;
    const b = w.biomeIndex(p.pos.y);
    if (b !== this.lastBiome) {
      if (b > this.lastBiome) UI.toast(T('b_' + CFG.BIOMES[b].id), 2.5);
      if (b === 2) this._hintOnce('h_cold', 'cold');
      this.lastBiome = b; Sfx.biome = b;
    }
    // tormenta
    const S = this.storm;
    S.t -= dt;
    if (S.t <= 0) {
      S.on = !S.on;
      const r = S.on ? CFG.blizzardLen : CFG.blizzardEvery;
      S.t = r[0] + Math.random() * (r[1] - r[0]);
      if (b === 2) UI.toast(T(S.on ? 'blizzard' : 'blizzardEnd'), 3);
      S.ang += (Math.random() - 0.5) * 2;
    }
    S.k = U.clamp(S.k + (S.on ? dt / 4 : -dt / 4), 0, 1);
    const inAlp = b === 2 ? 1 : 0;
    const storm = S.k * inAlp;
    // fogata cercana
    let fireD = 1e9;
    for (const f of w.campfires) if (f.lit) fireD = Math.min(fireD, Math.hypot(f.x - p.pos.x, f.y - p.pos.y, f.z - p.pos.z));
    this.fireD = fireD;
    const nearFire = fireD < 5.5;
    // afecciones
    p.addAff('hunger', CFG.hungerRate * dt);
    p.warmth -= dt;
    if (nearFire) { p.addAff('cold', -CFG.fireWarm * dt); p.addAff('injury', -CFG.fireHeal * dt); }
    else if (inAlp && p.warmth <= 0) p.addAff('cold', CFG.coldRate * (1 + storm * (CFG.blizzardCold - 1)) * dt);
    else p.addAff('cold', -CFG.coldDecay * dt);
    p.addAff('poison', -CFG.poisonDecay * dt);
    // lava del cráter
    this.lavaCd -= dt;
    if (p.pos.y < CFG.LAVA_H + 0.4 && Math.hypot(p.pos.x, p.pos.z) < CFG.CRATER_R + 4 && this.lavaCd <= 0) {
      this.lavaCd = 0.7;
      p.addAff('injury', CFG.lavaBurn * 0.5);
      // salta hacia afuera del lago, en dirección al borde del cráter
      const rr = Math.max(0.5, Math.hypot(p.pos.x, p.pos.z));
      p.state = 'air'; p.vel.y = 13; p.vel.x = p.pos.x / rr * 5; p.vel.z = p.pos.z / rr * 5;
      this._hurt(0.6); UI.toast(T('lava'), 1.5); Sfx.hurt();
      this.gfx.burst(p.pos.x, p.pos.y, p.pos.z, 30, { color: 0xff7a1a, speed: 5, up: 4, life: 0.9, size: 0.3 });
    }
    // fumarolas
    for (let i = 0; i < w.vents.length; i++) {
      const v = w.vents[i];
      v.t += dt;
      const ph = v.t % v.period;
      const was = v.active;
      v.active = ph < 1.1;
      const d = Math.hypot(v.x - p.pos.x, v.z - p.pos.z);
      if (v.active && !was) {
        this.ventHit[i] = false;
        if (d < 60) {
          this.gfx.burst(v.x, v.y + 0.8, v.z, 40, { color: 0xff8a2a, speed: 3, up: 9, life: 1.3, size: 0.45, grav: 3 });
          this.gfx.burst(v.x, v.y + 0.8, v.z, 25, { color: 0x666066, speed: 2, up: 6, life: 2, size: 0.9, grav: -1, alpha: 0.5 });
          if (d < 35) Sfx.erupt();
        }
      }
      if (!v.active && ph > v.period - 1.6 && d < 8 && !this._ventWarned) { this._ventWarned = true; UI.toast(T('vent'), 1.2); setTimeout(() => { this._ventWarned = false; }, 4000); }
      if (v.active && !this.ventHit[i] && d < 2.6 && p.pos.y - v.y < 5) {
        this.ventHit[i] = true;
        p.addAff('injury', CFG.ventBurn);
        p.state = 'air'; p.vel.y = 11;
        p.vel.x = (p.pos.x - v.x) / Math.max(0.3, d) * 5; p.vel.z = (p.pos.z - v.z) / Math.max(0.3, d) * 5;
        this._hurt(0.7); Sfx.hurt();
      }
    }
    // viento
    const wk = storm * CFG.windForce * 2 + inAlp * 0.4;
    const wind = wk > 0.05 ? { x: Math.cos(S.ang) * wk, z: Math.sin(S.ang) * wk } : null;
    this.wind = wind || { x: 0.3, z: 0.2 };
    this.stormK = storm;
    return {
      wind, storm,
      surface: w.surfaceAt(p.pos.x, p.pos.y, p.pos.z, w.normalAt(p.pos.x, p.pos.z, { x: 0, y: 1, z: 0 }).y),
      climbMul: 1 + inAlp * 0.15 + storm * 0.35 + (b === 3 ? 0.1 : 0)
    };
  },

  _hurt(k) {
    this.hurtFlash = Math.max(this.hurtFlash, k);
    if (this.settings.shake) this.cam.shake = Math.max(this.cam.shake, k * 0.6);
    if (navigator.vibrate) { try { navigator.vibrate(Math.round(30 + k * 60)); } catch (e) { /* */ } }
  },

  _handleEvents() {
    const p = this.player, g = this.gfx, w = this.world;
    for (const e of p.events) {
      switch (e.type) {
        case 'step': {
          const surf = w.surfaceAt(p.pos.x, p.pos.y, p.pos.z, 1);
          Sfx.step(surf);
          if (surf === 'sand' || surf === 'snow' || surf === 'ash') g.burst(p.pos.x, p.pos.y + 0.05, p.pos.z, 2, { color: surf === 'snow' ? 0xffffff : surf === 'ash' ? 0x555055 : 0xe6d29c, speed: 1, up: 0.6, life: 0.4, size: 0.15, alpha: 0.6 });
          break;
        }
        case 'jump': Sfx.jump(); g.burst(p.pos.x, p.pos.y + 0.05, p.pos.z, 6, { color: 0xd8ccb0, speed: 1.6, up: 0.6, life: 0.5, size: 0.2, alpha: 0.5 }); break;
        case 'land': {
          const pw = U.clamp((e.speed - 5) / 22, 0, 1);
          Sfx.land(pw);
          g.burst(p.pos.x, p.pos.y + 0.05, p.pos.z, 6 + pw * 20, { color: 0xd8ccb0, speed: 2 + pw * 4, up: 0.8, life: 0.6, size: 0.25, alpha: 0.55 });
          if (this.settings.shake) this.cam.shake = Math.max(this.cam.shake, pw * 0.8);
          if (e.dmg > 0) { this._hurt(Math.min(1, e.dmg * 3)); Sfx.hurt(); }
          if (e.height > this.stats.maxFall) this.stats.maxFall = e.height;
          if (e.height >= 25 && e.dmg > 0) this._bigFall = true;
          break;
        }
        case 'grab': {
          Sfx.grab();
          const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
          g.burst(p.pos.x + fx * 0.3, p.pos.y + 1.7, p.pos.z + fz * 0.3, 7, { color: 0xf4f4f4, speed: 0.9, up: 0.3, life: 0.6, size: 0.16, grav: 0.8, alpha: 0.55, spread: 0.4 });
          break;
        }
        case 'hook': Sfx.hook(); break;
        case 'catch': if (this.settings.shake) this.cam.shake = Math.max(this.cam.shake, 0.3); break;
        case 'lunge': Sfx.lunge(); break;
        case 'mantle': Sfx.grab(); break;
        case 'release': if (e.tired) { Sfx.tired(); UI.toast('😮‍💨', 0.8); } break;
      }
    }
    p.events.length = 0;
    // sonido de manos al escalar
    if (p.state === 'climb') {
      const k = Math.floor(p.climbAnim / Math.PI);
      if (k !== this.climbSnd) { this.climbSnd = k; Sfx.climbStep(); }
      this.breathT -= 1 / 60;
      if (p.stamina < 0.2 && this.breathT <= 0) { this.breathT = 1.3; Sfx.tired(); }
    }
  },

  // ---------- interacción ----------
  _nearest() {
    const p = this.player, w = this.world;
    if (p.state === 'climb' || p.state === 'down' || p.state === 'mantle' || p.state === 'zip') return null;
    let best = null, bd = 2.4;
    const test = (x, y, z, act, ref) => {
      const d = Math.hypot(x - p.pos.x, z - p.pos.z);
      if (d < bd && Math.abs(y - p.pos.y) < 2.5) { bd = d; best = { act, ref }; }
    };
    for (let i = 0; i < w.pickups.length; i++) { const q = w.pickups[i]; if (!q.taken) test(q.x, q.y, q.z, q.kind === 'case' ? 'case' : 'item', i); }
    for (let i = 0; i < w.bushes.length; i++) { const b = w.bushes[i]; if (b.berries > 0) test(b.x, b.y, b.z, 'bush', i); }
    for (let i = 0; i < w.campfires.length; i++) {
      const f = w.campfires[i];
      if (!f.lit) test(f.x, f.y, f.z, 'fire', i);
      else if (!f.roasted && !f.start) test(f.x, f.y, f.z, 'roast', i);
    }
    const s = w.summit;
    if (Math.hypot(s.x - p.pos.x, s.z - p.pos.z) < 4.5 && p.pos.y > s.y - 3) best = { act: 'flare' };
    return best;
  },

  _promptText(n) {
    if (!n) return null;
    const w = this.world;
    switch (n.act) {
      case 'item': return T('p_pick', { item: T('i_' + w.pickups[n.ref].item) });
      case 'case': return T('p_open');
      case 'bush': return T('p_bush');
      case 'fire': return T('p_fire');
      case 'roast': return T('p_rest');
      case 'flare': return T('p_flare');
    }
    return null;
  },

  _interact() {
    const n = this._nearest();
    if (!n) return;
    const p = this.player, w = this.world, g = this.gfx;
    if (n.act === 'item') {
      const q = w.pickups[n.ref];
      if (this.addItem(q.item)) { q.taken = true; Sfx.pickup(); }
    } else if (n.act === 'case') {
      const q = w.pickups[n.ref];
      q.kind = 'item'; q.item = q.loot;
      this.stats.cases++;
      g.refreshPickup(n.ref);
      Sfx.open();
      g.burst(q.x, q.y + 0.4, q.z, 12, { color: 0xfff2c0, speed: 2, up: 2, life: 0.6, size: 0.18 });
    } else if (n.act === 'bush') {
      const b = w.bushes[n.ref];
      if (this.addItem(b.mys ? 'berryMys' : 'berryRed')) { b.berries--; g.updateBushes(); Sfx.pickup(); }
    } else if (n.act === 'fire') {
      const f = w.campfires[n.ref];
      f.lit = true;
      if (n.ref > this.checkpoint) this.checkpoint = n.ref;
      p.aff.cold = 0;
      Sfx.ignite(); UI.toast(T('lit'), 3); UI.fires(w);
      g.burst(f.x, f.y + 0.5, f.z, 30, { color: 0xffb040, speed: 3, up: 4, life: 1, size: 0.25 });
    } else if (n.act === 'roast') {
      const f = w.campfires[n.ref];
      f.roasted = true;
      p.addAff('hunger', -0.35);
      this.stats.eaten++;
      Sfx.eat(); UI.toast('🍡 ' + T('roasted'), 2.5);
    } else if (n.act === 'flare') {
      this._startWin();
    }
  },

  addItem(it) {
    const i = this.inv.indexOf(null);
    if (i < 0) { UI.toast(T('full'), 2.2); return false; }
    this.inv[i] = it;
    UI.renderSlots(this.inv);
    if (it === 'hook') this._hintOnce('h_hook', 'hook');
    this._hintOnce(Input.isTouch ? 'h_items' : 'h_items_kb', 'items');
    return true;
  },

  useItem(i) {
    if (this.state !== 'play') return;
    const it = this.inv[i];
    if (!it) return;
    const p = this.player, def = ITEMS[it];
    if (def.piton) {
      if (!p.placePiton()) { UI.toast(T('onlyWall'), 1.8); return; }
      this.gfx.addPiton(p.pitons[p.pitons.length - 1]);
      this.stats.pitons++;
      Sfx.piton(); UI.toast(T('pitonPlaced'), 1.8);
    } else if (def.hook) {
      const hit = this._aimHook();
      if (!hit) { UI.toast(T('noHook'), 2); return; }
      p.startZip(hit);
      this.stats.hooks++;
    } else {
      const e = def.eff;
      if (e.hunger) p.addAff('hunger', e.hunger);
      if (e.injury) p.addAff('injury', e.injury);
      if (e.cold) p.addAff('cold', e.cold);
      if (e.poison) p.addAff('poison', e.poison);
      if (e.bonus) p.bonus = Math.min(0.6, p.bonus + e.bonus);
      if (e.warmth) p.warmth = e.warmth;
      if (def.mystery) {
        if (Math.random() < 0.5) { p.addAff('poison', 0.3); UI.toast(T('poisoned'), 2.5); Sfx.bad(); this._hurt(0.3); }
        else { p.bonus = Math.min(0.6, p.bonus + 0.4); UI.toast(T('lucky'), 2.5); }
      } else UI.toast(def.icon + ' ' + T('i_' + it), 1.5);
      if (e.hunger) this.stats.eaten++;
      if (it === 'energy' || it === 'tea') Sfx.drink(); else Sfx.eat();
    }
    this.inv[i] = null;
    UI.renderSlots(this.inv);
  },

  dropItem(i) {
    if (this.state !== 'play') return;
    const it = this.inv[i];
    if (!it) return;
    const p = this.player, w = this.world;
    const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
    const x = p.pos.x + fx * 0.9, z = p.pos.z + fz * 0.9;
    w.pickups.push({ kind: 'item', item: it, x, z, y: w.heightAt(x, z), taken: false });
    this.gfx.refreshPickup(w.pickups.length - 1);
    this.inv[i] = null;
    UI.renderSlots(this.inv);
    UI.toast(T('dropped', { item: T('i_' + it) }), 1.5);
  },

  // Rayo del garfio: sale del pecho hacia donde mira la cámara, un poco hacia arriba
  _aimHook() {
    const p = this.player, w = this.world, c = this.cam;
    if (p.state === 'zip' || p.state === 'down' || p.state === 'mantle') return null;
    const pp = c.pitch - 0.24, cp = Math.cos(pp);
    const dx = Math.sin(c.yaw) * cp, dy = -Math.sin(pp), dz = Math.cos(c.yaw) * cp;
    const ox = p.pos.x, oy = p.pos.y + 1.3, oz = p.pos.z;
    let prev = 0, hitT = -1;
    for (let t = 0.5; t <= CFG.hookRange; t += 0.5) {
      if (oy + dy * t < w.heightAt(ox + dx * t, oz + dz * t)) { hitT = t; break; }
      prev = t;
    }
    if (hitT < 0) return null;
    let lo = prev, hi = hitT;
    for (let i = 0; i < 10; i++) { const m = (lo + hi) / 2; if (oy + dy * m < w.heightAt(ox + dx * m, oz + dz * m)) hi = m; else lo = m; }
    if (lo < 3) return null;
    const x = ox + dx * lo, y = oy + dy * lo, z = oz + dz * lo;
    if (y < oy - 2) return null; // solo sirve para subir
    const n = w.normalAt(x, z, { x: 0, y: 1, z: 0 });
    return { x, y, z, nx: n.x, ny: n.y, nz: n.z };
  },

  _badge(id) {
    if (this.save.badges[id]) return;
    this.save.badges[id] = 1;
    this.persist();
    const b = BADGES.find(x => x.id === id);
    UI.toast(b.icon + ' ' + T('badgeGot') + ' ' + T('bd_' + id), 3.2);
    Sfx.badge();
  },

  _hintOnce(key, flag) {
    if (this.save.hints[flag]) return;
    this.save.hints[flag] = 1;
    UI.hint(key);
    this.persist();
  },

  // ---------- cumbre ----------
  _startWin() {
    this.state = 'winseq';
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
      const st = this._finalStats();
      const medal = st.time < CFG.goldTime && st.deaths === 0 ? 'gold' : st.time < CFG.silverTime && st.deaths <= 1 ? 'silver' : 'bronze';
      const nb = this._recordRun(true, medal);
      this._badge('first');
      if (st.deaths === 0) this._badge('clean');
      if (this.hard) this._badge('hard');
      if (medal === 'gold') this._badge('gold');
      if (st.time < 540) this._badge('speed');
      if (this.stats.pitons === 0) this._badge('nopiton');
      UI.setPlaying(false);
      UI.winScreen(st, medal, nb);
    }
  },

  _finalStats() { const s = this.stats; s.time = this.elapsed; return s; },

  _recKey() { return this.seedKey + (this.hard ? '·X' : ''); },

  _recordRun(won, medal) {
    if (!won) return false;
    const key = this._recKey();
    const prev = this.save.best[key];
    const st = this._finalStats();
    const nb = !prev || st.time < prev.time;
    if (nb) {
      this.save.best[key] = { time: st.time, deaths: st.deaths, medal, hard: this.hard };
      // guardar el fantasma de esta subida (solo los 3 más recientes, para no llenar el almacenamiento)
      const S = this.save;
      S.ghosts[key] = this.trail;
      S.ghostKeys = S.ghostKeys.filter(k => k !== key).concat(key);
      while (S.ghostKeys.length > 3) delete S.ghosts[S.ghostKeys.shift()];
    }
    this.persist();
    return nb;
  },

  // ---------- cámara y dibujo ----------
  _render(dt) {
    const p = this.player, g = this.gfx, c = this.cam, w = this.world;
    const a = this.state === 'play' ? U.clamp(this.acc * 60, 0, 1) : 1;
    const pos = { x: U.lerp(p.prev.x, p.pos.x, a), y: U.lerp(p.prev.y, p.pos.y, a), z: U.lerp(p.prev.z, p.pos.z, a) };
    // cámara automática detrás del escalador
    if (this.state === 'play' && p.state === 'climb' && this.settings.autoCam && c.lookIdle > 0.8) {
      c.yaw += U.angDiff(c.yaw, p.yaw) * Math.min(1, dt * 2.2);
      c.pitch = U.damp(c.pitch, 0.12, 1.5, dt);
    }
    const climbing = p.state === 'climb';
    const tx = pos.x, ty = pos.y + CFG.camHeight, tz = pos.z;
    const want = climbing ? CFG.camDistClimb : CFG.camDist;
    // colisión de la cámara con el terreno: distancia libre para una inclinación dada
    const freeDist = pitch => {
      const cp = Math.cos(pitch), fx = Math.sin(c.yaw) * cp, fy = -Math.sin(pitch), fz = Math.cos(c.yaw) * cp;
      for (let i = 1; i <= 14; i++) {
        const k = want * i / 14;
        if (ty - fy * k < w.heightAt(tx - fx * k, tz - fz * k) + 0.45) return Math.max(0.6, k * 0.85);
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
    // si el terreno acerca mucho la cámara, se eleva por encima de la cabeza
    if (c.dist < 1.7) cy += (1.7 - c.dist) * 1.1;
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
    const fovT = (p.sprinting ? 5 : 0) + (this.stormK || 0) * -3;
    c.fov = U.damp(c.fov, fovT, 4, dt);
    const baseFov = window.innerWidth < window.innerHeight ? 72 : 62;
    if (Math.abs(g.camera.fov - (baseFov + c.fov)) > 0.05) { g.camera.fov = baseFov + c.fov; g.camera.updateProjectionMatrix(); }
    // entorno visual
    const storm = this.stormK || 0;
    g.setTimeOfDay(this._dayT(), storm);
    g.scene.fog.near = U.lerp(60, 8, storm);
    g.scene.fog.far = U.lerp(g.Q.far, 70, storm);
    const b = w.biomeIndex(p.pos.y);
    const moteAmt = b === 2 ? 0.22 + storm * 0.78 : b === 3 ? 0.18 : b === 1 ? 0.2 : 0;
    g.updateSnow(dt, g.camera.position, moteAmt, this.wind || { x: 0, z: 0 }, b === 3 ? 'ash' : b === 1 ? 'pollen' : 'snow');
    g.uWind.value = U.damp(g.uWind.value, 0.25 + storm * 1.3 + (b === 2 ? 0.3 : 0), 1, dt);
    g.updateCharacter(p, pos, dt);
    // fantasma de la mejor subida
    const gd = this.ghostData;
    let ghostPos = null;
    if (gd && this.state !== 'menu') {
      const f = this.elapsed / 0.25, i = Math.floor(f) * 4, k = f - Math.floor(f);
      if (i + 7 < gd.length) {
        ghostPos = { x: U.lerp(gd[i], gd[i + 4], k) / 10, y: U.lerp(gd[i + 1], gd[i + 5], k) / 10, z: U.lerp(gd[i + 2], gd[i + 6], k) / 10, yaw: gd[i + 7] / 100 };
      }
    }
    g.setGhost(ghostPos);
    this.ghostPos = ghostPos;
    // puntería del garfio cuando hay uno en la mochila
    this.aimHit = this.state === 'play' && this.inv && this.inv.indexOf('hook') >= 0 ? this._aimHook() : null;
    g.setAim(this.aimHit);
    g.render(dt, this.state);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 1.5);
    if (this.state === 'play') {
      UI.prompt(this._promptText(this._nearest()));
      UI.updateHUD(this);
      UI.updateCompass(this);
      this.wave += dt;
      const r = Math.hypot(p.pos.x, p.pos.z);
      const nearSea = p.pos.y < 12 && r > CFG.BASE_R - 30 ? 1 - p.pos.y / 12 : 0;
      const fireNear = this.fireD < 14 ? 1 - this.fireD / 14 : 0;
      const lavaNear = p.pos.y > CFG.PEAK_H - 40 && r < 70 ? U.clamp(1 - (r - CFG.CRATER_R) / 45, 0, 1) : 0;
      Sfx.ambient(p.pos.y, storm, nearSea, fireNear, lavaNear, this.wave);
    }
  }
};

// La misma clave de montaña da la misma isla en cualquier modo.
function seedKey_(k) { return 'btc:' + k; }

window.__game = Game;
window.addEventListener('load', () => Game.boot());
