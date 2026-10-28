// Menús, HUD y controles táctiles en el DOM.
'use strict';

const $ = id => document.getElementById(id);
const MEDAL = { gold: '🥇', silver: '🥈', bronze: '🥉' };

const UI = {
  screens: ['menu', 'options', 'howtoS', 'records', 'loading', 'pause', 'tramos', 'win'],
  last: {},
  optReturn: 'menu',

  init() {
    $('bLang').onclick = () => { Game.setSetting('lang', LANG === 'es' ? 'en' : 'es'); Sfx.ui(); };
    this._seg('segMode', 'mode');
    this._seg('segLang', 'lang');
    this._seg('segQ', 'quality');
    this._seg('segInv', 'invY', true);
    this._seg('segShake', 'shake', true);
    this._seg('segGrab', 'grabMode');
    this._seg('segAuto', 'autoCam', true);
    this._seg('segTune', 'tune', true);
    this._seg('segGhost', 'ghost', true);
    const rng = (id, key) => { const el = $(id); el.oninput = () => Game.setSetting(key, +el.value); };
    rng('rSens', 'sens'); rng('rVol', 'vol'); rng('rMus', 'music');
    const click = (id, fn) => { $(id).onclick = () => { Sfx.init(); Sfx.ui(); fn(); }; };
    click('bRoute', () => Game.start('route', 0));
    click('bTramos', () => { this.renderTramos(); this.show('tramos'); });
    click('bTramosBack', () => this.show('menu'));
    click('bHow', () => this.show('howtoS'));
    click('bOpt', () => { this.optReturn = 'menu'; this.show('options'); });
    click('bRec', () => { this.renderRecords(); this.show('records'); });
    click('bOptBack', () => this.show(this.optReturn));
    click('bHowBack', () => this.show(Game.state === 'pause' ? 'pause' : 'menu'));
    click('bRecBack', () => this.show('menu'));
    click('bResume', () => Game.resume());
    click('bPOpt', () => { this.optReturn = 'pause'; this.show('options'); });
    click('bPHow', () => this.show('howtoS'));
    click('bPFire', () => Game.toCheckpoint());
    click('bRestart', () => Game.start(Game.runMode, Game.runTramo));
    click('bQuit', () => Game.quit());
    click('bWinRetry', () => Game.start(Game.runMode, Game.runTramo));
    click('bWinNext', () => Game.next());
    click('bWinQuit', () => Game.quit());
    $('bPause').onclick = () => Game.pause();
    Input.bindButton($('tJump'), 'jump');
    Input.bindButton($('tGrab'), 'grab');
    Input.bindButton($('tSprint'), 'sprint');
    Input.bindButton($('tUse'), 'interact');
    this.applyLang();
  },

  _seg(id, key, num) {
    const el = $(id);
    el.querySelectorAll('button').forEach(b => {
      b.onclick = () => { Sfx.ui(); Game.setSetting(key, num ? +b.dataset.v : b.dataset.v); };
    });
  },

  syncSettings(s) {
    const sel = (id, v) => $(id).querySelectorAll('button').forEach(b => b.classList.toggle('sel', b.dataset.v === String(v)));
    sel('segMode', s.mode); sel('segLang', s.lang); sel('segQ', s.quality); sel('segInv', s.invY);
    sel('segShake', s.shake); sel('segGrab', s.grabMode); sel('segAuto', s.autoCam); sel('segTune', s.tune); sel('segGhost', s.ghost);
    $('rSens').value = s.sens; $('rVol').value = s.vol; $('rMus').value = s.music;
    $('modeDesc').textContent = T(s.mode === 'hard' ? 'modeHardDesc' : 'modeNormalDesc');
    $('bLang').textContent = s.lang.toUpperCase();
  },

  applyLang() {
    document.documentElement.lang = LANG;
    document.querySelectorAll('[data-t]').forEach(el => { el.textContent = T(el.dataset.t); });
    $('bLang').setAttribute('aria-label', T('language'));
    $('bPause').setAttribute('aria-label', T('pause'));
    $('c').setAttribute('aria-label', T('title'));
    [['tJump', 'jump'], ['tGrab', 'grab'], ['tSprint', 'sprint'], ['tUse', 'interact']].forEach(([id, k]) => $(id).setAttribute('aria-label', T(k)));
    $('howList').innerHTML = T('howtoText').map(p => '<p>' + p + '</p>').join('');
    $('howKeys').innerHTML = T('keysText') + '<br>' + T('padText');
    this.last = {};
    if (this.hintKey && !$('hint').classList.contains('hidden')) $('hint').textContent = T(this.hintKey);
    if (this.chInfo) this.challenge(...this.chInfo.slice(0, 2), T(this.chInfo[2]));
  },

  show(id) {
    for (const s of this.screens) $(s).classList.toggle('hidden', s !== id);
    // desde el menú, las pantallas usan su mismo fondo (no el último cuadro de la partida)
    document.body.classList.toggle('inmenu', Game.state === 'menu');
    const scr = id && $(id);
    if (scr) { const b = scr.querySelector('.btn:not(.locked)'); if (b && !Input.isTouch) setTimeout(() => b.focus({ preventScroll: true }), 30); }
  },

  setPlaying(on) {
    $('hud').classList.toggle('hidden', !on);
    $('touch').classList.toggle('hidden', !on || !Input.isTouch);
    if (!on) { this.chInfo = null; $('chLbl').textContent = ''; }
  },

  toast(msg, dur) {
    const el = $('toast');
    el.textContent = msg; el.style.opacity = 1;
    clearTimeout(this._tt);
    this._tt = setTimeout(() => { el.style.opacity = 0; }, (dur || 2.4) * 1000);
  },

  hint(key) {
    const el = $('hint');
    if (!key) { el.classList.add('hidden'); return; }
    this.hintKey = key;
    el.textContent = T(key);
    el.classList.remove('hidden');
    el.style.opacity = 1;
    clearTimeout(this._ht);
    this._ht = setTimeout(() => { el.style.opacity = 0; setTimeout(() => el.classList.add('hidden'), 450); }, 6500);
  },

  prompt(text) {
    if (this.last.prompt === text) return;
    this.last.prompt = text;
    const el = $('prompt'), tu = $('tUse');
    if (!text) { el.classList.add('hidden'); tu.classList.add('hidden'); return; }
    el.innerHTML = (Input.isTouch ? '' : '<kbd>' + (Input.usingPad ? 'X' : 'E') + '</kbd>') + text;
    el.classList.remove('hidden');
    tu.classList.toggle('hidden', !Input.isTouch);
  },

  challenge(i, n, name) {
    this.chInfo = [i, n, name && Game.world ? Game.world.challenges[i - 1].nm : ''];
    $('chLbl').textContent = T('challenge') + ' ' + i + '/' + n + ' · ' + name;
  },

  joyShow(on, x, y) {
    $('joyBase').classList.toggle('hidden', !on);
    $('joyHint').classList.toggle('hidden', on);
    if (on) this.joyMove(x, y, 0, 0);
  },
  joyMove(ox, oy, dx, dy) {
    const b = $('joyBase'), k = $('joyKnob');
    b.style.left = ox + 'px'; b.style.top = oy + 'px';
    k.style.left = (65 + dx * 40) + 'px'; k.style.top = (65 + dy * 40) + 'px';
  },

  // Actualiza el HUD solo cuando cambian los valores
  updateHUD(g) {
    const p = g.player, L = this.last;
    const alt = Math.max(0, Math.round(p.pos.y));
    const biome = T('b_' + CFG.BIOMES[g.world.biomeIndex(p.pos.y)].id);
    const altKey = alt + '|' + biome;
    if (L.alt !== altKey) { L.alt = altKey; $('alt').innerHTML = alt + ' m<small>' + biome + '</small>'; }
    const tm = U.fmtTime(g.elapsed);
    if (L.tm !== tm) { L.tm = tm; $('timer').textContent = tm; }
    const prog = U.clamp(p.pos.y / g.world.summit.y, 0, 1);
    const pk = Math.round(prog * 200);
    if (L.prog !== pk) {
      L.prog = pk;
      $('prog').querySelector('.me').style.bottom = (prog * 100) + '%';
      $('prog').querySelector('.fill').style.height = (prog * 100) + '%';
    }
    const sk = Math.round(p.stamina * 300);
    if (L.bar !== sk) {
      L.bar = sk;
      $('sta').style.width = (p.stamina * 100) + '%';
      $('bar').classList.toggle('low', p.stamina < 0.2 && (p.state === 'climb' || p.sprinting));
    }
    // cuerda, caídas y gemas
    const rope = g.hard ? 'hard' : p.anchor ? 'on' : 'off';
    if (L.rope !== rope) {
      L.rope = rope;
      const el = $('ropeChip');
      el.className = 'chip ' + rope;
      el.textContent = rope === 'on' ? '🔒 ' + T('secured') : rope === 'hard' ? '💀 ' + T('noRope') : '⚠️ ' + T('unsecured');
    }
    const rest = p.resting ? 1 : 0;
    if (L.rest !== rest) { L.rest = rest; $('restChip').classList.toggle('hidden', !rest); }
    const fg = g.stats.falls + '|' + g.stats.gems;
    if (L.fg !== fg) { L.fg = fg; $('fallChip').textContent = '🪢 ' + g.stats.falls; $('gemChip').textContent = '💎 ' + g.stats.gems; }
    const vig = Math.round(U.clamp(g.hurtFlash, 0, 1) * 50);
    if (L.vig !== vig) {
      L.vig = vig;
      $('vig').style.background = 'radial-gradient(ellipse at center,transparent 40%,rgba(200,20,20,.7) 100%)';
      $('vig').style.opacity = vig / 50;
    }
    const gl = Input.touchGrabToggle && Input.touchGrabOn, sl = Input.touchSprintOn;
    if (L.gl !== gl) { L.gl = gl; $('tGrab').classList.toggle('latched', gl); }
    if (L.sl !== sl) { L.sl = sl; $('tSprint').classList.toggle('latched', sl); }
  },

  // Marcas de las fogatas en la barra de altura
  fires(world, from, to) {
    const pr = $('prog');
    pr.querySelectorAll('.fire').forEach(e => e.remove());
    world.checkpoints.forEach((c, i) => {
      if (i < from || i > to) return;
      const d = document.createElement('span');
      const lit = world.campfires[i] && world.campfires[i].lit;
      d.className = 'fire'; d.textContent = c.summit ? '🚩' : lit ? '🔥' : '·';
      d.style.bottom = (U.clamp(c.y / world.summit.y, 0, 1) * 100) + '%';
      pr.appendChild(d);
    });
  },

  resultScreen(r) {
    $('winTitle').textContent = r.title;
    $('winMedal').textContent = MEDAL[r.medal];
    $('winMedalT').textContent = T(r.medal === 'gold' ? 'medalGold' : r.medal === 'silver' ? 'medalSilver' : 'medalBronze') + (r.newBest ? ' · ' + T('newBest') : '');
    let h = '<span>' + T('time') + '</span><b>' + U.fmtTime(r.time) + '</b>' +
      '<span>' + T('par') + '</span><b>' + U.fmtTime(r.par) + '</b>' +
      '<span>' + T('falls') + '</span><b>' + r.falls + '</b>' +
      '<span>' + T('gems') + '</span><b>' + r.gems + ' / ' + r.gemsTotal + '</b>';
    if (r.splits) r.splits.forEach((s, i) => { h += '<span>· ' + T('tramo') + ' ' + (i + 1) + '</span><b>' + U.fmtTime(s) + '</b>'; });
    $('winStats').innerHTML = h;
    $('bWinNext').classList.toggle('hidden', !r.next);
    this.show('win');
  },

  renderTramos() {
    const R = Game.save.records, un = Game.save.unlocked || 1, hard = Game.settings.mode === 'hard' ? '·X' : '';
    const box = $('tramoList');
    box.innerHTML = '';
    for (let k = 0; k < 4; k++) {
      const rec = R['t' + k + hard], locked = k >= un;
      const b = document.createElement('button');
      b.className = 'btn sec tramo' + (locked ? ' locked' : '');
      b.innerHTML = '<span>' + (k + 1) + ' · ' + T('b_' + CFG.BIOMES[k].id) + '</span><b>' + (locked ? '🔒' : rec ? MEDAL[rec.medal] + ' ' + U.fmtTime(rec.time) : '—') + '</b>';
      b.setAttribute('aria-label', T('tramo') + ' ' + (k + 1) + (locked ? ' · ' + T('locked') : ''));
      if (!locked) b.onclick = () => { Sfx.init(); Sfx.ui(); Game.start('tramo', k); };
      box.appendChild(b);
    }
    $('tramoNote').textContent = un < 4 ? T('unlockNote') : '';
  },

  renderRecords() {
    const R = Game.save.records || {};
    const row = (label, r) => '<div class="rec"><span>' + (r ? MEDAL[r.medal] + ' ' : '') + label + '</span><b>' + (r ? U.fmtTime(r.time) : '—') + '</b></div>';
    let h = row(T('routeName'), R.route) + row(T('routeName') + ' · ' + T('modeHard'), R['route·X']);
    for (let k = 0; k < 4; k++) h += row(T('tramo') + ' ' + (k + 1) + ' · ' + T('b_' + CFG.BIOMES[k].id), R['t' + k]);
    const gems = Object.keys(Game.save.gems || {}).length;
    h += '<div class="rec"><span>💎 ' + T('gems') + '</span><b>' + gems + ' / 9</b></div>';
    $('recList').innerHTML = h;
    const got = Game.save.badges || {};
    $('badgeList').innerHTML = BADGES.map(b => '<div class="bd' + (got[b.id] ? '' : ' off') + '"><b>' + b.icon + '</b><span>' + T('bd_' + b.id) + '</span></div>').join('');
  },

  // Brújula: próxima fogata, cumbre y fantasma
  updateCompass(g) {
    const p = g.player, w = g.world, yaw = g.cam.yaw, L = this.last;
    const box = $('compass'), half = box.clientWidth / 2 || 140;
    const place = (id, tx, tz, label) => {
      const el = $(id);
      if (tx === null) { if (L[id] !== 'off') { L[id] = 'off'; el.style.display = 'none'; } return; }
      const rel = U.angDiff(yaw, Math.atan2(tx - p.pos.x, tz - p.pos.z));
      const edge = Math.abs(rel) > 1.2;
      const x = Math.round(half - U.clamp(rel / 1.2, -1, 1) * (half - 14));
      const key = x + '|' + label + '|' + edge;
      if (L[id] === key) return;
      L[id] = key;
      el.style.display = '';
      el.style.left = x + 'px';
      el.classList.toggle('edge', edge);
      const sm = el.querySelector('small');
      if (sm) sm.textContent = label;
    };
    const nc = w.checkpoints[g.checkpoint + 1];
    if (nc && !nc.summit) place('cmFire', nc.x, nc.z, Math.max(0, Math.round(nc.y - p.pos.y)) + 'm↑');
    else place('cmFire', null);
    const s = w.summit;
    place('cmFlag', s.x, s.z, Math.max(0, Math.round(s.y - p.pos.y)) + 'm↑');
    if (g.ghostPos) place('cmGhost', g.ghostPos.x, g.ghostPos.z, ''); else place('cmGhost', null);
  },

  // Panel de ajuste en vivo para afinar el manejo desde el iPad
  tunePanel(on) {
    const el = $('tune');
    el.classList.toggle('hidden', !on);
    if (!on || el.childElementCount) return;
    const P = [['walkSpeed', 2, 8], ['sprintSpeed', 4, 12], ['jumpVel', 4, 12], ['gravity', 10, 35], ['climbSpeed', 0.8, 4],
      ['lungeUp', 3, 10], ['staClimbIdle', 0, 0.15], ['staClimbMove', 0, 0.2], ['staLunge', 0, 0.4], ['staRegen', 0.1, 1],
      ['anchorRegen', 0, 0.6], ['clipDist', 1, 4]];
    el.innerHTML = '<b>Tuning</b>';
    P.forEach(([k, a, b]) => {
      const l = document.createElement('label');
      const v = document.createElement('span');
      const r = document.createElement('input');
      r.type = 'range'; r.min = a; r.max = b; r.step = (b - a) / 100; r.value = CFG[k];
      v.textContent = k + ': ' + (+CFG[k]).toFixed(3);
      r.oninput = () => { CFG[k] = +r.value; v.textContent = k + ': ' + (+r.value).toFixed(3); };
      l.appendChild(v); l.appendChild(r); el.appendChild(l);
    });
  }
};
