// Crash Lab: bucle principal, entrada, pantallas y flujo de juego.
var CL = window.CL || (window.CL = {});

(function () {
  var M = Matter, Engine = M.Engine, Events = M.Events, Composite = M.Composite, Constraint = M.Constraint, Body = M.Body;
  var T = CL.TUNING, R = CL.Render, A = CL.Audio;
  var $ = function (id) { return document.getElementById(id); };

  var save = CL.load();
  var lang = save.lang || ((navigator.language || 'es').toLowerCase().indexOf('es') === 0 ? 'es' : 'en');
  var tr = function (k) { return CL.I18N[lang][k] || k; };

  var S = {
    screen: 'title', prev: 'title', engine: null, level: null, car: null, crane: null, craneC: null,
    input: { gas: false, brake: false, nitro: false }, keys: {},
    acc: 0, playing: false, hint: '', hintT: 0,
    crash: { started: false, t: 0, rest: 0, ended: false },
    slowManual: false, slowAuto: 0, lastDmg: -1, lastSpd: -1
  };

  // ---------- Idioma ----------
  function applyLang() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = tr(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) { el.setAttribute('aria-label', tr(el.dataset.i18nAria)); });
    $('soundBtn').textContent = tr('sound') + ': ' + (save.sound ? tr('on') : tr('off'));
    buildLevels(); buildGarage();
  }

  // ---------- Pantallas ----------
  var SCREENS = { title: 'titleScreen', levels: 'levelScreen', garage: 'garageScreen', results: 'resultScreen' };
  function show(name) {
    if (name !== S.screen) S.prev = S.screen;
    S.screen = name;
    for (var k in SCREENS) $(SCREENS[k]).classList.toggle('hidden', k !== name);
    var play = name === 'play';
    $('hud').classList.toggle('hidden', !play && name !== 'results');
    $('controls').classList.toggle('hidden', !play);
    if (!play) releaseAll();
    if (name === 'garage') buildGarage();
    if (name === 'levels') buildLevels();
    var first = SCREENS[name] && document.querySelector('#' + SCREENS[name] + ' .btn');
    if (first && matchMedia('(hover: hover)').matches) first.focus();
  }

  function buildLevels() {
    var box = $('levelList');
    box.innerHTML = '';
    CL.Levels.ids.forEach(function (id) {
      var b = document.createElement('button');
      b.className = 'btn lvl';
      b.innerHTML = '<b></b><small></small><em></em>';
      b.querySelector('b').textContent = tr('lvl_' + id);
      b.querySelector('small').textContent = tr('lvl_' + id + '_d');
      b.querySelector('em').textContent = tr('best') + ' ' + (save.best[id] ? CL.fmtMoney(save.best[id]) : tr('none'));
      b.addEventListener('click', function () { startLevel(id); });
      box.appendChild(b);
    });
  }

  function buildGarage() {
    $('garageMoney').textContent = CL.fmtMoney(save.money);
    var box = $('upgradeList');
    box.innerHTML = '';
    var U = CL.UPGRADES;
    var items = [
      { key: 'motor', name: tr('motor') + ' · ' + tr('level') + ' ' + save.motor, desc: tr('motor_d'),
        cost: save.motor < U.motor.max ? U.motor.costs[save.motor - 1] : null, done: save.motor >= U.motor.max, doneText: tr('maxed'),
        buy: function () { save.motor++; } },
      { key: 'nitro', name: tr('nitro'), desc: tr('nitro_d'), cost: save.nitro ? null : U.nitro.cost, done: save.nitro, doneText: tr('owned'),
        buy: function () { save.nitro = true; } },
      { key: 'sponsor', name: tr('sponsor'), desc: tr('sponsor_d'), cost: save.sponsor ? null : U.sponsor.cost, done: save.sponsor, doneText: tr('owned'),
        buy: function () { save.sponsor = true; } }
    ];
    items.forEach(function (it) {
      var row = document.createElement('div');
      row.className = 'up';
      row.innerHTML = '<div><b></b><small></small></div><button class="btn"></button>';
      row.querySelector('b').textContent = it.name;
      row.querySelector('small').textContent = it.desc;
      var btn = row.querySelector('button');
      if (it.done) { btn.textContent = it.doneText; btn.disabled = true; }
      else {
        btn.textContent = tr('buy') + ' ' + CL.fmtMoney(it.cost);
        btn.disabled = save.money < it.cost;
        btn.classList.toggle('primary', save.money >= it.cost);
        btn.addEventListener('click', function () {
          if (save.money < it.cost) return;
          save.money -= it.cost; it.buy(); CL.store(save); buildGarage();
        });
      }
      box.appendChild(row);
    });
  }

  // ---------- Mundo ----------
  function teardown() {
    if (!S.engine) return;
    Events.off(S.engine);
    Composite.clear(S.engine.world, false, true);
    Engine.clear(S.engine);
    S.engine = null;
  }

  function buildWorld(id) {
    teardown();
    var engine = Engine.create({ positionIterations: 8, velocityIterations: 6 });
    engine.gravity.y = T.gravity;
    S.engine = engine;
    S.level = CL.Levels.build(engine.world, id);
    var sp = S.level.spawn;
    S.car = CL.Car.create(engine.world, sp.x, sp.y, save);
    S.crane = S.level.crane || null;
    S.craneC = null;
    S.car.invuln = true; S.grace = T.spawnGrace;
    if (S.crane) {
      S.craneC = Constraint.create({ pointA: { x: S.crane.x, y: S.crane.y }, bodyB: S.car.chassis, pointB: { x: 0, y: -20 },
        stiffness: 0.9, damping: 0.1 });
      Composite.add(engine.world, S.craneC);
    }
    Events.on(engine, 'collisionStart', onCollisionStart);
    Events.on(engine, 'collisionActive', onCollisionActive);
    S.crash = { started: false, t: 0, rest: 0, ended: false };
    S.slowManual = false; S.slowAuto = 0;
    $('slowBtn').setAttribute('aria-pressed', 'false');
    S.acc = 0;
    R.snap(sp.x + 250, sp.y);
  }

  function markWheelContact(pair) {
    var car = S.car;
    for (var i = 0; i < car.wheels.length; i++) {
      var w = car.wheels[i];
      if (!w.attached) continue;
      if ((pair.bodyA === w.body && !pair.bodyB.parent.isCar) || (pair.bodyB === w.body && !pair.bodyA.parent.isCar)) w.contact = 4;
    }
  }
  function onCollisionActive(ev) { ev.pairs.forEach(markWheelContact); }
  function onCollisionStart(ev) {
    ev.pairs.forEach(function (pair) {
      markWheelContact(pair);
      var hit = CL.Car.onCollision(S.car, pair);
      if (!hit || hit.impact < T.impactMin) return;
      var p = hit.impact;
      R.sparks(hit.point.x, hit.point.y, p);
      A.hit(p / 16);
      R.addShake(Math.min(22, p * 0.9));
      if (hit.dmg >= T.crashMinDmg && !S.crash.started) { S.crash.started = true; S.crash.t = 0; }
      if (p > T.bigHit && !S.slowManual) S.slowAuto = T.autoSlowSecs;
      if (navigator.vibrate && p > 8 && S.screen === 'play') try { navigator.vibrate(Math.min(60, p * 3)); } catch (e) {}
    });
  }

  function startLevel(id) {
    A.unlock();
    buildWorld(id);
    S.playing = true;
    $('nitroPad').classList.toggle('hidden', !save.nitro);
    $('nitroBar').classList.toggle('hidden', !save.nitro);
    setHint(S.crane ? tr('hint_drop') : tr('hint_drive'), 4.5);
    S.lastDmg = -1;
    show('play');
  }

  function setHint(text, secs) {
    S.hint = text; S.hintT = secs;
    $('hint').textContent = text;
    $('hint').style.opacity = 1;
    $('hint').classList.toggle('hidden', !text);
  }

  // ---------- Fin del choque ----------
  function endCrash() {
    S.crash.ended = true;
    var car = S.car, id = S.level.id;
    var dmg = Math.round(CL.Car.damageValue(car));
    var record = dmg > (save.best[id] || 0);
    if (record) save.best[id] = dmg;
    var earned = Math.round(dmg * (save.sponsor ? CL.UPGRADES.sponsor.mul : 1));
    save.money += earned;
    CL.store(save);
    $('resDamage').textContent = CL.fmtMoney(dmg);
    $('resTotal').classList.toggle('hidden', !car.dead);
    $('resRecord').classList.toggle('hidden', !record);
    var counts = {};
    car.lost.forEach(function (n) { counts[n] = (counts[n] || 0) + 1; });
    var names = Object.keys(counts).map(function (n) { return tr('p_' + n) + (counts[n] > 1 ? ' ×' + counts[n] : ''); });
    $('resLost').textContent = tr('partsLost') + ': ' + (names.length ? names.join(', ') : tr('none'));
    $('resEarned').textContent = tr('earned') + ' ' + CL.fmtMoney(earned) + ' · ' + tr('money') + ' ' + CL.fmtMoney(save.money);
    show('results');
  }

  // ---------- Entrada ----------
  function releaseAll() {
    S.input.gas = S.input.brake = S.input.nitro = false;
    S.keys = {};
    document.querySelectorAll('.pad.down').forEach(function (p) { p.classList.remove('down'); });
  }

  function syncKeys() {
    var k = S.keys;
    S.input.gas = !!(k.ArrowRight || k.KeyD || k.ArrowUp || k.KeyW || padState.gas);
    S.input.brake = !!(k.ArrowLeft || k.KeyA || k.ArrowDown || k.KeyS || padState.brake);
    S.input.nitro = !!(k.KeyN || k.ShiftLeft || k.ShiftRight || padState.nitro);
  }

  var padState = { gas: false, brake: false, nitro: false };
  function bindPad(el, key) {
    var ids = {};
    function down(e) {
      e.preventDefault();
      A.unlock();
      ids[e.pointerId] = true;
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
      padState[key] = true; el.classList.add('down'); syncKeys();
      if (key === 'gas') onGasPressed();
    }
    function up(e) {
      delete ids[e.pointerId];
      if (Object.keys(ids).length) return;
      padState[key] = false; el.classList.remove('down'); syncKeys();
    }
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  function onGasPressed() {
    if (S.screen === 'play' && S.craneC) {
      Composite.remove(S.engine.world, S.craneC);
      S.craneC = null; S.crane = null;
      setHint('', 0);
    }
  }

  window.addEventListener('keydown', function (e) {
    if (S.screen !== 'play') {
      if (e.code === 'Escape' && S.screen !== 'title') show(S.screen === 'garage' ? backTarget() : 'title');
      return;
    }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].indexOf(e.code) >= 0) e.preventDefault();
    if (e.repeat) return;
    A.unlock();
    S.keys[e.code] = true; syncKeys();
    if (e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'ArrowUp' || e.code === 'KeyW') onGasPressed();
    if (e.code === 'Space') toggleSlow();
    if (e.code === 'KeyR') startLevel(S.level.id);
    if (e.code === 'Escape') show('levels');
  });
  window.addEventListener('keyup', function (e) { delete S.keys[e.code]; syncKeys(); });
  window.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { releaseAll(); A.suspend(); } else A.resume();
  });

  function toggleSlow() {
    S.slowManual = !S.slowManual;
    $('slowBtn').setAttribute('aria-pressed', String(S.slowManual));
  }

  function backTarget() { return S.prev === 'results' ? 'results' : (S.prev === 'levels' ? 'levels' : 'title'); }

  // ---------- Grabar clip ----------
  var rec = null;
  function toast(text) {
    var t = $('toast');
    t.textContent = text; t.classList.remove('hidden');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.add('hidden'); }, 2200);
  }
  function startRec() {
    var cv = R.canvas();
    if (!cv.captureStream || !window.MediaRecorder) { toast(tr('recNo')); return; }
    var stream = cv.captureStream(30);
    var au = A.stream();
    if (au) au.stream.getAudioTracks().forEach(function (t) { stream.addTrack(t); });
    var types = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
    var type = types.filter(function (t) { return MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t); })[0];
    var mr;
    try { mr = type ? new MediaRecorder(stream, { mimeType: type }) : new MediaRecorder(stream); }
    catch (e) { toast(tr('recNo')); if (au) au.done(); return; }
    var chunks = [];
    mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
    mr.onstop = function () {
      if (au) au.done();
      stream.getTracks().forEach(function (t) { t.stop(); });
      var mime = mr.mimeType || type || 'video/webm';
      var blob = new Blob(chunks, { type: mime });
      var ext = mime.indexOf('mp4') >= 0 ? 'mp4' : 'webm';
      var name = 'crash-lab-' + Date.now() + '.' + ext;
      var file = null;
      try { file = new File([blob], name, { type: mime }); } catch (e) {}
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: 'Crash Lab' }).catch(function () {});
      } else {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      }
      toast(tr('recSaved'));
    };
    mr.start(500);
    rec = { mr: mr, t: 0 };
    $('recBtn').setAttribute('aria-pressed', 'true');
    $('recBtn').setAttribute('aria-label', tr('recStop'));
  }
  function stopRec() {
    if (!rec) return;
    try { rec.mr.stop(); } catch (e) {}
    rec = null;
    $('recBtn').setAttribute('aria-pressed', 'false');
    $('recBtn').setAttribute('aria-label', tr('rec'));
  }

  // ---------- Bucle ----------
  var STEP = 1 / 60, last = performance.now(), NO_INPUT = { gas: false, brake: false, nitro: false };
  function onDetach(part) {
    A.clank();
    var b = part.body;
    R.sparks(b.position.x, b.position.y, 8);
    R.addShake(6);
  }
  function step() {
    var car = S.car;
    var active = S.screen === 'play' && !S.crash.ended;
    var scale = (S.slowManual || S.slowAuto > 0) ? T.slowScale : 1;
    S.engine.timing.timeScale = scale;
    var n = T.substeps, res = null;
    for (var i = 0; i < n; i++) {
      res = CL.Car.drive(car, active ? S.input : NO_INPUT, STEP * scale / n, 1 / n);
      Engine.update(S.engine, 1000 / 60 / n);
      CL.Car.processDetach(car, onDetach);
    }
    return { res: res, scale: scale };
  }

  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (S.engine) {
      var info = null;
      S.acc += dt;
      var n = 0;
      while (S.acc >= STEP && n < 4) { info = step(); S.acc -= STEP; n++; }
      if (n === 4) S.acc = 0;
      if (S.slowAuto > 0) S.slowAuto -= dt;
      if (S.grace > 0) { S.grace -= dt; if (S.grace <= 0) S.car.invuln = false; }
      var scale = (S.slowManual || S.slowAuto > 0) ? T.slowScale : 1;
      var car = S.car, ch = car.chassis, v = Body.getVelocity(ch);
      emitEffects(car, dt * scale);
      R.stepParticles(dt * scale);
      var sz = R.size();
      R.follow(ch.position, v, dt, sz.h > sz.w);
      R.frame(S.engine.world, S.level, car, S.crane);
      if (S.screen === 'play' || S.screen === 'results') updateHud(car, v, info, dt);
      if (S.screen === 'play') checkCrash(car, v, dt);
    }
    if (rec) { rec.t += dt; if (rec.t > 30) stopRec(); }
    requestAnimationFrame(frame);
  }

  var smokeT = 0;
  function emitEffects(car, dt) {
    var core = car.parts.core, ch = car.chassis;
    var dmg = 1 - Math.max(0, core.hp) / core.max;
    smokeT -= dt;
    if ((dmg > 0.45 || car.dead) && smokeT <= 0) {
      var c = Math.cos(ch.angle), s = Math.sin(ch.angle);
      R.smoke(ch.position.x + c * 55 - s * -18, ch.position.y + s * 55 + c * -18, car.dead || dmg > 0.75);
      smokeT = car.dead ? 0.05 : 0.12;
    }
    if (car.nitroOn) {
      var c2 = Math.cos(ch.angle), s2 = Math.sin(ch.angle);
      R.flame(ch.position.x - c2 * 80, ch.position.y - s2 * 80 + 4);
    }
  }

  function updateHud(car, v, info, dt) {
    var dmg = Math.round(CL.Car.damageValue(car) / 10) * 10;
    if (dmg !== S.lastDmg) { $('dmgVal').textContent = CL.fmtMoney(dmg); S.lastDmg = dmg; }
    var kmh = Math.round(Math.hypot(v.x, v.y) * 60 / T.pxPerMeter * 3.6);
    if (kmh !== S.lastSpd) { $('spdVal').textContent = kmh + ' ' + tr('speed'); S.lastSpd = kmh; }
    if (save.nitro) $('nitroFill').style.width = (car.nitroFuel / T.nitroFuel * 100).toFixed(0) + '%';
    if (S.hintT > 0) { S.hintT -= dt; if (S.hintT <= 0 && !S.crane) $('hint').style.opacity = 0; }
    // Sonido del motor según el giro de las llantas
    var spin = T.motorSpin[Math.max(0, save.motor - 1)], avg = 0, nw = 0;
    car.wheels.forEach(function (w) { if (w.attached) { avg += Math.abs(Body.getAngularVelocity(w.body)); nw++; } });
    var rpm = nw ? Math.min(1.2, avg / nw / spin) : (S.input.gas ? 1 : 0);
    if (S.screen === 'play') A.engine(rpm, S.input.gas ? 1 : (S.input.brake ? 0.4 : 0), !car.dead);
    else A.silenceEngine();
  }

  function checkCrash(car, v, dt) {
    var c = S.crash;
    if (!c.started && !c.ended && CL.Car.damageValue(car) >= T.crashMinValue) { c.started = true; c.t = 0; }
    if (!c.started || c.ended) return;
    c.t += dt;
    // Quieto = el choque terminó, aunque el jugador siga acelerando contra el muro
    var still = Math.hypot(v.x, v.y) < T.restSpeed && Math.abs(Body.getAngularVelocity(car.chassis)) < 0.02;
    c.rest = still ? c.rest + dt : 0;
    if (c.rest > T.restSecs || c.t > T.maxCrashSecs) endCrash();
  }

  // ---------- Panel de tuning (solo con ?debug=1) ----------
  function tuningPanel() {
    if (!/[?&]debug=1/.test(location.search)) return;
    var box = document.createElement('div');
    box.id = 'tune';
    [['gravity', 0.5, 2, 0.05], ['damageMul', 0.2, 3, 0.1], ['motorAccel', 0.01, 0.1, 0.005], ['impactMin', 0.5, 6, 0.25], ['nitroAccel', 0.05, 0.4, 0.01]]
      .forEach(function (d) {
        var l = document.createElement('label');
        var inp = document.createElement('input');
        inp.type = 'range'; inp.min = d[1]; inp.max = d[2]; inp.step = d[3]; inp.value = T[d[0]];
        var span = document.createElement('span');
        span.textContent = d[0] + ': ' + T[d[0]];
        inp.addEventListener('input', function () {
          T[d[0]] = parseFloat(inp.value); span.textContent = d[0] + ': ' + inp.value;
          if (d[0] === 'gravity' && S.engine) S.engine.gravity.y = T.gravity;
        });
        l.appendChild(span); l.appendChild(inp); box.appendChild(l);
      });
    document.body.appendChild(box);
  }

  // El toque que salta la intro de ERA genera un click justo después; la intro ya no recibe toques
  // en ese momento y el click caería en el botón de abajo ("Jugar"). Mientras la intro siga en la
  // página (se quita ~0.5 s después de saltarla), los clicks no llegan al juego.
  document.addEventListener('click', function (e) {
    if (document.getElementById('era-splash')) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  // ---------- Botones ----------
  function init() {
    R.init($('game'));
    window.addEventListener('resize', R.resize);
    window.addEventListener('orientationchange', function () { setTimeout(R.resize, 250); });
    bindPad($('gasPad'), 'gas');
    bindPad($('brakePad'), 'brake');
    bindPad($('nitroPad'), 'nitro');
    $('playBtn').addEventListener('click', function () { A.unlock(); show('levels'); });
    $('garageBtn').addEventListener('click', function () { show('garage'); });
    $('resGarageBtn').addEventListener('click', function () { show('garage'); });
    $('retryBtn').addEventListener('click', function () { startLevel(S.level.id); });
    $('langBtn').addEventListener('click', function () { lang = lang === 'es' ? 'en' : 'es'; save.lang = lang; CL.store(save); applyLang(); });
    $('soundBtn').addEventListener('click', function () {
      A.unlock(); save.sound = !save.sound; CL.store(save); A.setEnabled(save.sound); syncMute(); applyLang();
    });
    $('muteBtn').addEventListener('click', function () {
      A.unlock(); save.sound = !save.sound; CL.store(save); A.setEnabled(save.sound); syncMute(); applyLang();
    });
    $('slowBtn').addEventListener('click', toggleSlow);
    $('restartBtn').addEventListener('click', function () { startLevel(S.level.id); });
    $('menuBtn').addEventListener('click', function () { stopRec(); show('levels'); });
    $('recBtn').addEventListener('click', function () { A.unlock(); if (rec) stopRec(); else startRec(); });
    document.querySelectorAll('[data-go]').forEach(function (b) {
      b.addEventListener('click', function () {
        var go = b.dataset.go;
        show(go === 'back' ? backTarget() : go);
      });
    });
    A.setEnabled(save.sound);
    syncMute();
    applyLang();
    tuningPanel();
    // Fondo animado del menú: la prueba del muro sin piloto
    buildWorld('wall');
    show('title');
    requestAnimationFrame(frame);
  }
  function syncMute() {
    $('muteBtn').textContent = save.sound ? '🔊' : '🔇';
    $('muteBtn').setAttribute('aria-pressed', String(!save.sound));
  }

  // Para pruebas automáticas
  CL.debug = { state: S, startLevel: startLevel, save: function () { return save; } };

  init();
})();
