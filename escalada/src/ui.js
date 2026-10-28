// Menús, HUD y controles táctiles en el DOM.
'use strict';

const $ = id => document.getElementById(id);

const UI = {
  screens: ['menu', 'options', 'howtoS', 'records', 'loading', 'pause', 'dead', 'win'],
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
    const rng = (id, key) => { const el = $(id); el.oninput = () => Game.setSetting(key, +el.value); };
    rng('rSens', 'sens'); rng('rVol', 'vol'); rng('rMus', 'music');
    const click = (id, fn) => { $(id).onclick = () => { Sfx.init(); Sfx.ui(); fn(); }; };
    click('bDaily', () => Game.start(U.todayKey()));
    click('bRandom', () => Game.start('R' + ((Math.random() * 1e6) | 0)));
    click('bHow', () => this.show('howtoS'));
    click('bOpt', () => { this.optReturn = 'menu'; this.show('options'); });
    click('bRec', () => { this.renderRecords(); this.show('records'); });
    click('bOptBack', () => this.show(this.optReturn));
    click('bHowBack', () => this.show(Game.state === 'pause' ? 'pause' : 'menu'));
    click('bRecBack', () => this.show('menu'));
    click('bResume', () => Game.resume());
    click('bPOpt', () => { this.optReturn = 'pause'; this.show('options'); });
    click('bPHow', () => this.show('howtoS'));
    click('bRestart', () => Game.start(Game.seedKey));
    click('bQuit', () => Game.quit());
    click('bDeadGo', () => Game.afterDeath());
    click('bDeadQuit', () => Game.quit());
    click('bWinRetry', () => Game.start(Game.seedKey));
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
    sel('segShake', s.shake); sel('segGrab', s.grabMode); sel('segAuto', s.autoCam); sel('segTune', s.tune);
    $('rSens').value = s.sens; $('rVol').value = s.vol; $('rMus').value = s.music;
    $('modeDesc').textContent = T(s.mode === 'hard' ? 'modeHardDesc' : 'modeNormalDesc');
    $('bLang').textContent = s.lang.toUpperCase();
  },

  applyLang() {
    document.documentElement.lang = LANG;
    document.querySelectorAll('[data-t]').forEach(el => { el.textContent = T(el.dataset.t); });
    $('bDaily').textContent = T('daily') + ' · ' + U.todayKey();
    $('bLang').setAttribute('aria-label', T('language'));
    $('bPause').setAttribute('aria-label', T('pause'));
    $('c').setAttribute('aria-label', T('title'));
    [['tJump', 'jump'], ['tGrab', 'grab'], ['tSprint', 'sprint'], ['tUse', 'interact']].forEach(([id, k]) => $(id).setAttribute('aria-label', T(k)));
    $('howList').innerHTML = T('howtoText').map(p => '<p>' + p + '</p>').join('');
    $('howKeys').innerHTML = T('keysText') + '<br>' + T('padText');
    this.last = {};
    if (Game.inv) this.renderSlots(Game.inv);
    if (this.hintKey && !$('hint').classList.contains('hidden')) $('hint').textContent = T(this.hintKey);
  },

  show(id) {
    for (const s of this.screens) $(s).classList.toggle('hidden', s !== id);
    const scr = id && $(id);
    if (scr) { const b = scr.querySelector('.btn'); if (b && !Input.isTouch) setTimeout(() => b.focus({ preventScroll: true }), 30); }
  },

  setPlaying(on) {
    $('hud').classList.toggle('hidden', !on);
    $('touch').classList.toggle('hidden', !on || !Input.isTouch);
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

  renderSlots(inv) {
    const box = $('slots');
    box.innerHTML = '';
    inv.forEach((it, i) => {
      const d = document.createElement('div');
      d.className = 'slot' + (it ? '' : ' empty');
      d.innerHTML = '<span class="k">' + (i + 1) + '</span>' + (it ? ITEMS[it].icon : '') + '<div class="hold"></div>';
      d.setAttribute('role', 'button');
      d.setAttribute('aria-label', it ? T('i_' + it) : String(i + 1));
      let timer = null, start = 0, raf = 0;
      const hold = d.querySelector('.hold');
      d.addEventListener('pointerdown', e => {
        e.preventDefault(); e.stopPropagation();
        if (!inv[i]) return;
        start = performance.now();
        const tick = () => { const k = Math.min(1, (performance.now() - start) / 550); hold.style.transform = 'scaleY(' + k + ')'; if (k < 1) raf = requestAnimationFrame(tick); };
        raf = requestAnimationFrame(tick);
        timer = setTimeout(() => { timer = null; hold.style.transform = 'scaleY(0)'; Game.dropItem(i); }, 550);
      });
      const end = (fire) => {
        cancelAnimationFrame(raf); hold.style.transform = 'scaleY(0)';
        if (timer) { clearTimeout(timer); timer = null; if (fire) Game.useItem(i); }
      };
      d.addEventListener('pointerup', () => end(true));
      d.addEventListener('pointercancel', () => end(false));
      d.addEventListener('pointerleave', () => end(false));
      box.appendChild(d);
    });
    const f = document.createElement('div');
    f.className = 'slot flare';
    f.innerHTML = '🧨';
    f.setAttribute('aria-label', T('p_flare'));
    box.appendChild(f);
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
    // barra
    const a = p.aff, sum = Math.min(1, p.affSum());
    const parts = [a.poison, a.cold, a.injury, a.hunger];
    const key = [p.stamina, p.bonus, a.hunger, a.injury, a.cold, a.poison].map(v => Math.round(v * 300)).join(',');
    if (L.bar !== key) {
      L.bar = key;
      const sta = Math.min(p.stamina, 1 - sum);
      $('sta').style.width = (sta * 100) + '%';
      const bon = Math.min(p.bonus, 0.6);
      $('bon').style.left = (sta * 100) + '%'; $('bon').style.width = (bon * 100 * (1 - sum)) + '%';
      let right = 0;
      const ids = ['a_poison', 'a_cold', 'a_injury', 'a_hunger'];
      for (let i = 0; i < 4; i++) {
        const v = Math.min(parts[i], 1 - right);
        const el = $(ids[i]);
        el.style.right = (right * 100) + '%'; el.style.width = (Math.max(0, v) * 100) + '%';
        right += Math.max(0, v);
      }
      $('bar').classList.toggle('low', p.stamina < 0.18 && (p.state === 'climb' || p.sprinting));
      const lbl = [['hunger', a.hunger], ['injury', a.injury], ['cold', a.cold], ['poison', a.poison]].filter(x => x[1] > 0.04)
        .map(x => '<span><i style="background:var(--' + x[0] + ')"></i>' + T('a_' + x[0]) + '</span>').join('');
      if (L.lbl !== lbl) { L.lbl = lbl; $('affLbl').innerHTML = lbl; }
    }
    // efectos de pantalla
    const vig = U.clamp(g.hurtFlash, 0, 1);
    const vk = Math.round(vig * 50) + '|' + Math.round(a.cold * 50) + '|' + Math.round(a.poison * 50);
    if (L.vig !== vk) {
      L.vig = vk;
      $('vig').style.background = 'radial-gradient(ellipse at center,transparent 40%,rgba(200,20,20,.7) 100%)';
      $('vig').style.opacity = Math.max(vig, a.injury > 0.5 ? 0.25 : 0);
      $('frost').style.opacity = U.clamp(a.cold * 1.2, 0, 0.9);
      $('tox').style.opacity = U.clamp(a.poison * 1.5, 0, 0.8);
    }
    const gl = Input.touchGrabToggle && Input.touchGrabOn, sl = Input.touchSprintOn;
    if (L.gl !== gl) { L.gl = gl; $('tGrab').classList.toggle('latched', gl); }
    if (L.sl !== sl) { L.sl = sl; $('tSprint').classList.toggle('latched', sl); }
  },

  fires(world) {
    const pr = $('prog');
    pr.querySelectorAll('.fire').forEach(e => e.remove());
    world.campfires.forEach(f => {
      const d = document.createElement('span');
      d.className = 'fire'; d.textContent = f.lit ? '🔥' : '·';
      d.style.bottom = (U.clamp(f.y / world.summit.y, 0, 1) * 100) + '%';
      pr.appendChild(d);
    });
    const s = document.createElement('span');
    s.className = 'fire'; s.textContent = '🚩'; s.style.bottom = '100%';
    pr.appendChild(s);
  },

  statsHTML(st) {
    return '<span>' + T('time') + '</span><b>' + U.fmtTime(st.time) + '</b>' +
      '<span>' + T('deaths') + '</span><b>' + st.deaths + '</b>' +
      '<span>' + T('maxFall') + '</span><b>' + Math.round(st.maxFall) + ' m</b>' +
      '<span>' + T('eaten') + '</span><b>' + st.eaten + '</b>' +
      '<span>' + T('altitude') + '</span><b>' + Math.round(st.maxAlt) + ' m</b>';
  },

  deadScreen(st, hard) {
    $('deadT').textContent = T(hard ? 'expeditionOver' : 'fainted');
    $('deadS').textContent = T(hard ? 'expeditionOverSub' : 'faintedSub');
    $('deadStats').innerHTML = this.statsHTML(st);
    $('bDeadGo').textContent = T(hard ? 'retry' : 'resume');
    this.show('dead');
  },

  winScreen(st, medal, newBest) {
    $('winMedal').textContent = medal === 'gold' ? '🥇' : medal === 'silver' ? '🥈' : '🥉';
    $('winMedalT').textContent = T(medal === 'gold' ? 'medalGold' : medal === 'silver' ? 'medalSilver' : 'medalBronze') + (newBest ? ' · ' + T('newBest') : '');
    $('winStats').innerHTML = this.statsHTML(st);
    this.show('win');
  },

  renderRecords() {
    const best = Game.save.best || {};
    const keys = Object.keys(best).sort().reverse().slice(0, 12);
    $('recList').innerHTML = keys.length ? keys.map(k => {
      const r = best[k], m = r.medal === 'gold' ? '🥇' : r.medal === 'silver' ? '🥈' : '🥉';
      return '<div class="rec"><span>' + m + ' ' + T('seed') + ' ' + k + (r.hard ? ' · ' + T('modeHard') : '') + '</span><b>' + U.fmtTime(r.time) + '</b></div>';
    }).join('') : '<p class="small">' + T('none') + '</p>';
  },

  // Panel de ajuste en vivo para afinar el manejo desde el iPad
  tunePanel(on) {
    const el = $('tune');
    el.classList.toggle('hidden', !on);
    if (!on || el.childElementCount) return;
    const P = [['walkSpeed', 2, 8], ['sprintSpeed', 4, 12], ['jumpVel', 4, 12], ['gravity', 10, 35], ['climbSpeed', 0.8, 4],
      ['lungeUp', 3, 10], ['staClimbIdle', 0, 0.15], ['staClimbMove', 0, 0.2], ['staLunge', 0, 0.4], ['staRegen', 0.1, 1],
      ['safeFallSpeed', 6, 20], ['fallDamage', 0, 0.08], ['hungerRate', 0, 0.005], ['coldRate', 0, 0.02]];
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
