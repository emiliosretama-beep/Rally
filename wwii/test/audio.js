// Prueba del sonido y las voces (11_audio.js): cada sonido con nombre se dibuja sin conexión (OfflineAudioContext) y se comprueba que
// no es silencio, que no recorta y que dura lo esperado; después, con el AudioContext real, los eventos del Bus suenan sin errores
// (disparos, impactos, explosión con sordera, pasos, recargas, granadas, carros, ambiente, música) y la cola de voces (speechSynthesis
// simulado): idioma, alemán con y sin voz, enfriamiento de gritos y prioridad de las frases del guion. Cero errores de consola.
// Uso: F44_HTML=/ruta/index.html node wwii/test/audio.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const HTML = process.env.F44_HTML || path.join(ROOT, 'index.html');
const log = (...a) => console.log('[audio]', ...a);

// speechSynthesis simulado: registra lo que se dice; window.__deVoice decide si hay voz alemana
const MOCK = () => {
  window.__spoken = []; window.__cancels = 0; window.__deVoice = true;
  const V = (name, lang) => ({ name, lang, voiceURI: name, localService: true, default: false });
  class U { constructor(t) { this.text = t; this.lang = ''; this.voice = null; this.rate = 1; this.pitch = 1; this.volume = 1; } }
  const S = {
    speaking: false, pending: false, _cur: null,
    getVoices() { const v = [V('Jorge', 'es-ES'), V('Monica', 'es-ES'), V('Alex', 'en-US'), V('Samantha', 'en-US')]; if (window.__deVoice) v.push(V('Markus', 'de-DE')); return v; },
    speak(u) { if (u.text === ' ') return; window.__spoken.push({ text: u.text, lang: u.lang, voice: u.voice && u.voice.name, pitch: u.pitch, rate: u.rate });
      this.speaking = true; this._cur = u; setTimeout(() => { u.onstart && u.onstart(); setTimeout(() => { if (this._cur === u) { this.speaking = false; this._cur = null; u.onend && u.onend(); } }, 120); }, 5); },
    cancel() { window.__cancels++; const u = this._cur; this._cur = null; this.speaking = false; if (u && u.onerror) setTimeout(() => u.onerror({}), 0); },
    resume() {}, pause() {}, addEventListener() {}
  };
  Object.defineProperty(window, 'speechSynthesis', { value: S, configurable: true });
  window.SpeechSynthesisUtterance = U;
};

async function run() {
  if (!process.env.F44_HTML) execFileSync('python3', [path.join(ROOT, 'build.py')], { stdio: 'inherit' });
  const errors = [], fails = [];
  const check = (ok, msg) => { if (!ok) fails.push(msg); log((ok ? 'ok   ' : 'FAIL ') + msg); };
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 800, height: 500 } });
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('frente44:settings', JSON.stringify({ lang: 'es' })); } catch (e) {} });
  await page.addInitScript(MOCK);
  await page.goto('file://' + HTML);
  await page.waitForFunction(() => window.F44 && window.Game && Game.mode === 'title', null, { timeout: 120000 });
  await page.evaluate(() => { GFX.auto = false; GFX.set('baja'); });
  const ev = (fn, arg) => page.evaluate(fn, arg);

  // ---------- sin AudioContext: nada falla y los subtítulos salen ----------
  const pre = await ev(() => { const r = { ctx: !!Snd.ctx }; let subs = 0; const f = () => subs++; Bus.on('say', f);
    r.play = Snd.play('garand', { pos: [0, 0, 0] }); r.loop = Snd.loop('tank_engine'); Snd.stop(5); Snd.setListener([0, 1, 0], 0); Snd.music('menu');
    Bus.emit('shot', { pos: [1, 1, 1], dir: [0, 0, 1], weapon: 'mp40', by: null }); Bus.emit('explosion', { pos: [3, 0, 3], radius: 6 });
    r.say = Voice.say('Hayes', 'grenade'); Bus.off('say', f); r.subs = subs; return r; });
  check(!pre.ctx && pre.play === null && pre.loop === 0 && pre.subs === 1, 'sin AudioContext todo es inocuo y el subtítulo sale (' + JSON.stringify(pre) + ')');

  // ---------- cada sonido dibujado sin conexión ----------
  const names = await ev(() => Snd.names());
  const LEN = { // [mín, máx] de duración audible esperada (s)
    ui_move: [0.02, 0.3], ui_ok: [0.1, 0.5], ui_back: [0.1, 0.5], hitmark: [0.01, 0.2], killmark: [0.05, 0.3], dryfire: [0.01, 0.2],
    explosion: [1.2, 4.5], explosion_far: [1.5, 5], cannon: [1.2, 4.5], ping: [0.3, 1.2], heartbeat: [0.15, 0.5], tinnitus: [2, 4.5], incoming: [0.8, 1.4],
    music_menu: [7, 8.1], music_tension: [7, 8.1], music_victory: [6, 8.1], music_death: [3, 6] };
  const bad = [], res = {};
  for (const n of names) {
    const loopy = n.startsWith('ambience_') || n.startsWith('music_') || n.endsWith('_engine');
    const r = await ev(([n, d]) => Promise.all([Snd.render(n, { dur: d }), Snd.render(n, { dur: d, raw: true })]), [n, loopy ? 8 : 5]);
    const [m, raw] = r; res[n] = m;
    if (!m || !raw) { bad.push(n + ': sin resultado'); continue; }
    const [lo, hi] = LEN[n] || (loopy ? [7, 8.1] : [0.02, 4.5]);
    if (!(m.rms > 2e-4)) bad.push(n + ': silencio (rms ' + m.rms.toExponential(2) + ')');
    if (!(m.peak < 0.995)) bad.push(n + ': recorta (pico ' + m.peak.toFixed(3) + ')');
    if (!(raw.peak < 3)) bad.push(n + ': demasiado fuerte en bruto (' + raw.peak.toFixed(2) + ')');
    if (!(m.len >= lo && m.len <= hi)) bad.push(n + ': duración ' + m.len.toFixed(2) + ' fuera de [' + lo + ',' + hi + ']');
  }
  // lejos: la explosión lejana tiene menos agudos (menos pico) que la cercana y un disparo lejano suena más largo
  const farNear = await ev(async () => { const a = await Snd.render('kar98', { raw: true, me: false }), b = await Snd.render('kar98', { raw: true, me: false, far: 1 }); return { near: a, far: b }; });
  log('sonidos', names.length, Object.entries(res).slice(0, 6).map(([k, v]) => k + ' pk ' + v.peak.toFixed(2) + ' len ' + v.len.toFixed(2)).join(' · '));
  check(names.length >= 70 && bad.length === 0, names.length + ' sonidos dibujados: no silenciosos, sin recorte y con su duración' + (bad.length ? ' — ' + bad.join(' | ') : ''));
  check(farNear.far.len > farNear.near.len, 'el disparo lejano tiene más cola (' + farNear.near.len.toFixed(2) + ' -> ' + farNear.far.len.toFixed(2) + ' s)');

  // ---------- AudioContext real tras un gesto ----------
  await page.mouse.click(400, 250);
  await page.waitForFunction(() => Snd.ctx && Snd.ctx.state === 'running', null, { timeout: 15000 }).catch(() => {});
  const st0 = await ev(() => { Snd.setListener(Cam.eye, Cam.yaw); return Snd.stats(); });
  check(st0.state === 'running', 'AudioContext en marcha tras el primer gesto (' + st0.state + ')');
  // en el título: música del menú y ambiente
  await ev(() => F44.render()); await ev(() => F44.render());
  const st1 = await ev(() => { Snd.update(); return Snd.stats(); });
  check(st1.music === 'menu' && st1.amb.length > 0, 'título: música del menú y ambiente (' + JSON.stringify(st1) + ')');

  // ---------- en partida: eventos del Bus ----------
  const bus = await ev(async () => {
    F44.start('test', 'regular'); F44.god(true); await F44.render(); Snd.setListener(Cam.eye, Cam.yaw);
    const r = {}, P = Player, e = Player.eye().slice(), en = Actors.list.find(a => a.team === 'axis'), al = Actors.list.find(a => a.team === 'ally');
    r.mode = Game.mode; r.amb = Snd.stats().amb; r.music = Snd.stats().music;
    const v0 = Snd.V.length;
    for (const w of ['garand', 'thompson', 'bar', 'colt', 'kar98', 'mp40', 'stg44', 'mg42mount', 'bazooka']) Bus.emit('shot', { pos: e, dir: [0, 0, 1], weapon: w, by: P, loud: 1 });
    for (const w of ['kar98', 'mp40', 'mg42', 'cannon']) Bus.emit('shot', { pos: en.pos, dir: [0, 0, -1], weapon: w, by: en, loud: w === 'cannon' ? 3 : 1 });
    for (const s of ['dirt', 'grass', 'sand', 'snow', 'wood', 'metal', 'stone', 'flesh', 'water', 'lava']) Bus.emit('impact', { pos: [e[0] + 2, e[1] - 1, e[2] + 3], normal: [0, 1, 0], surface: s, by: en });
    for (const s of ['dirt', 'snow', 'wood', 'metal', 'water']) { Bus.emit('step', { pos: P.pos, surface: s, by: P, run: true }); Bus.emit('step', { pos: al.pos, surface: s, by: al }); }
    for (const st of ['out', 'in', 'bolt', 'clip', 'charge']) Bus.emit('reloadStep', { by: P, weapon: 'garand', step: st });
    Bus.emit('reload', { by: en, weapon: 'kar98' }); Bus.emit('ping', { pos: e, by: P }); Bus.emit('dryfire', { by: P }); Bus.emit('pin', { by: P });
    Bus.emit('throw', { by: en, type: 'stiel' }); Bus.emit('grenadeBounce', { pos: [e[0] + 3, e[1] - 1.5, e[2]] }); Bus.emit('whizz', { pos: [e[0] + 0.8, e[1], e[2] + 1], by: en });
    Bus.emit('melee', { by: P, hit: true }); Bus.emit('pickup', { id: 'mp40' }); Bus.emit('ammo', {}); Bus.emit('mount', { u: {} }); Bus.emit('dismount', { u: {} });
    Bus.emit('hit', { actor: en, part: 'head', dmg: 40, pos: Actors.chest(en), by: P, kill: false }); Bus.emit('playerHurt', { dmg: 30, from: en.pos });
    Bus.emit('incoming', { pos: [e[0] + 20, 0, e[2] + 20] }); Bus.emit('objective', { index: 1, text: 'x' }); Bus.emit('checkpoint', {});
    r.voices = Snd.V.length - v0; r.byCat = Object.assign({}, Snd.cnt);
    Bus.emit('explosion', { pos: [e[0] + 2, e[1] - 1, e[2] + 2], radius: 6, dmg: 0, by: null }); r.deaf = Snd.deaf;
    Bus.emit('explosion', { pos: [e[0] + 400, e[1], e[2]], radius: 6, dmg: 0, by: null });
    // retrasos por la distancia: la explosión a 400 m empieza ~1.2 s después
    const far = Snd.V[Snd.V.length - 1]; r.farDelay = far ? +(far.end - Snd.ctx.currentTime).toFixed(2) : 0;
    r.err = Snd.err; r.lastErr = Snd.lastErr; return r; });
  log('bus', JSON.stringify(bus));
  check(bus.mode === 'play' && bus.voices > 40 && bus.err === 0, 'eventos del Bus suenan sin errores (' + bus.voices + ' voces, err ' + bus.err + (bus.lastErr ? ' ' + bus.lastErr : '') + ')');
  check(bus.deaf > 0.5, 'explosión cercana: sordera ' + bus.deaf.toFixed(2));
  check(bus.amb.length >= 2 && bus.music === null, 'en partida: ambiente de la misión ' + JSON.stringify(bus.amb) + ' y sin música del menú');
  const cnt = await ev(() => { const c = Object.assign({}, Snd.cnt), over = []; for (const k in c) if (c[k] > SND_CAT[k].n + 9) over.push(k + ':' + c[k]); return over; });
  check(cnt.length === 0, 'límite de voces por tipo (' + JSON.stringify(cnt) + ')');

  // ---------- carros, latido, reverb, tensión, ráfagas de MG ----------
  const loop = await ev(async () => {
    const r = {}, p = Player.pos; const tk = Actors.spawnTank({ team: 'axis', pos: [p[0] + 15, p[1], p[2] + 25], yaw: 0 });
    for (let i = 0; i < 6; i++) { F44.step(12); await F44.render(); await new Promise(res => setTimeout(res, 40)); }
    r.tanks = Snd.stats().tanks; tk.alive = false; for (let i = 0; i < 4; i++) { await F44.render(); await new Promise(res => setTimeout(res, 40)); } r.tanksAfter = Snd.stats().tanks;
    // MG42 a 1150 disparos/min durante 1 s
    for (let i = 0; i < 20; i++) Bus.emit('shot', { pos: Player.eye(), dir: [0, 0, 1], weapon: 'mg42mount', by: Player, loud: 1.6 });
    r.gun = Snd.cnt.gun;
    // vida baja -> latido
    const pl = Snd.play; let hb = 0; Snd.play = function (n, o) { if (n === 'heartbeat') hb++; return pl.call(this, n, o); };
    Player.health = 15; Snd._hb = 0; for (let i = 0; i < 3; i++) { await F44.render(); await new Promise(res => setTimeout(res, 30)); } Snd.play = pl; r.body = hb; Player.health = 100;
    Snd.tension = 0.9; await F44.render(); r.tense = Snd.stats().tense;
    // interior: bajo un techo
    r.env0 = Snd.env; r.err = Snd.err; return r; });
  check(loop.tanks === 1 && loop.tanksAfter === 0, 'bucle de motor del carro: aparece y se va al destruirlo (' + loop.tanks + '/' + loop.tanksAfter + ')');
  check(loop.gun >= 15, 'ráfaga de MG42 del jugador: cada disparo suena (' + loop.gun + ' voces)');
  check(loop.body >= 1, 'latido con poca vida');
  check(loop.tense, 'capa de música de tensión en combate');
  check(loop.err === 0, 'sin errores internos en el bucle (' + loop.err + ')');

  // ---------- victoria y muerte ----------
  const mus = await ev(() => { Bus.emit('missionComplete', { stats: {} }); const a = Snd.stats().music; Bus.emit('playerDied', {}); return { a, b: Snd.stats().music }; });
  check(mus.a === 'victory' && mus.b === 'death', 'fanfarria de victoria y golpe de muerte (' + JSON.stringify(mus) + ')');

  // ---------- voces ----------
  const vo = await ev(async () => {
    const r = {}, subs = [], f = d => subs.push(d), wait = ms => new Promise(res => setTimeout(res, ms)); Bus.on('say', f); Voice.stop(); window.__spoken.length = 0; Voice.cd = {}; Voice.spk = {};
    r.a = Voice.say('Hayes', 'grenade'); r.b = Voice.say('Hayes', 'grenade'); // repetido: se descarta
    await wait(250); r.sp1 = window.__spoken.slice();
    Voice.say('axis', 'grenade'); await wait(250); r.de = window.__spoken[window.__spoken.length - 1];
    // sin voz alemana: subtítulo sí, voz no
    window.__deVoice = false; Voice.reset(); const n0 = window.__spoken.length; Voice.cd = {}; Voice.spk = {};
    r.c = Voice.say('axis', 'reloading'); await wait(200); r.deSkipped = window.__spoken.length === n0; window.__deVoice = true; Voice.reset();
    // una frase del guion corta un grito en curso
    Voice.cd = {}; Voice.spk = {}; const c0 = window.__cancels; Voice.say('Russo', 'contact'); await wait(20); Voice.say('Hayes', 'x', { es: 'Frase del guion.', en: 'Script line.' }); await wait(300);
    r.cancelled = window.__cancels > c0; r.last = window.__spoken[window.__spoken.length - 1];
    // inglés
    Settings.set('lang', 'en'); Voice.cd = {}; Voice.spk = {}; Voice.say('Kowalski', 'reloading'); await wait(250); r.en = window.__spoken[window.__spoken.length - 1]; Settings.set('lang', 'es');
    // un actor alemán lejano no se oye
    const far = { team: 'axis', pos: [Player.pos[0] + 200, 0, Player.pos[2]], id: 99 }; r.farAxis = Voice.say(far, 'grenade');
    // LINES (si el módulo de misiones las define) y clave desconocida
    r.unknown = Voice.say('Hayes', 'zz_sin_texto');
    Bus.off('say', f); r.subs = subs.map(s => s.who + ': ' + s.text); return r; });
  log('voces', JSON.stringify(vo));
  check(vo.a === true && vo.b === false, 'grito con enfriamiento (el repetido se descarta)');
  check(vo.sp1.length === 1 && vo.sp1[0].lang === 'es-ES' && /granada/i.test(vo.sp1[0].text) && vo.sp1[0].pitch < 0.8, 'Hayes grita en español con voz grave (' + JSON.stringify(vo.sp1[0]) + ')');
  check(vo.de && vo.de.lang === 'de-DE' && /Granate/.test(vo.de.text), 'alemán con voz de-DE (' + JSON.stringify(vo.de) + ')');
  check(vo.c === true && vo.deSkipped, 'sin voz alemana: subtítulo sí, voz no');
  check(vo.cancelled && vo.last && vo.last.text === 'Frase del guion.', 'una frase del guion corta el grito en curso');
  check(vo.en && vo.en.lang === 'en-US' && /reload|out/i.test(vo.en.text), 'en inglés con voz en-US (' + JSON.stringify(vo.en) + ')');
  check(vo.farAxis === false, 'el grito de un alemán lejano no se oye');
  check(vo.subs.some(s => /^Alemán: .*Granate.*\(¡Granada!\)/.test(s)), 'subtítulo alemán con traducción (' + vo.subs.find(s => /Alem/.test(s)) + ')');

  // ---------- misión jugada por el piloto automático con el audio real ----------
  const bot = await ev(async () => { F44.start('test', 'regular'); F44.god(true); F44.bot(true); let n = 0;
    for (let i = 0; i < 40 && Game.mode === 'play'; i++) { F44.step(120); await F44.render(); n++; } F44.bot(false); return { mode: Game.mode, n, err: Snd.err, last: Snd.lastErr, st: Snd.stats() }; });
  check(bot.err === 0, 'misión con el piloto automático y audio real sin errores internos (' + bot.mode + ', ' + JSON.stringify(bot.st) + (bot.last ? ' ' + bot.last : '') + ')');
  const fin = await ev(() => Snd.stats());
  check(fin.err === 0, 'Snd.err = 0 (' + fin.err + ')');
  check(errors.length === 0, 'sin errores de consola' + (errors.length ? ': ' + errors.slice(0, 5).join(' | ') : ''));
  await browser.close();
  if (fails.length) { log('FALLAN ' + fails.length + ':\n  ' + fails.join('\n  ')); process.exit(1); }
  log('TODO OK');
}
run().catch(e => { console.error(e); process.exit(1); });
