// Prueba de humo del juego completo: título -> campaña -> informe -> juego (con la interfaz), andar, disparar y matar a un enemigo,
// apuntar, piloto automático (F44.bot + F44.god) hasta completar la misión de prueba y muerte del jugador. Sin errores de consola.
// Uso: F44_OUT=/ruta/capturas node wwii/test/smoke.js   (capturas core_*.png)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs'), os = require('os'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const OUT = process.env.F44_OUT || path.join(os.tmpdir(), 'frente44');
fs.mkdirSync(OUT, { recursive: true });
const HTML = process.env.F44_HTML || path.join(ROOT, 'index.html'); // F44_HTML: probar una construcción privada
const log = (...a) => console.log('[smoke]', ...a);

async function run() {
  if (!process.env.F44_HTML) execFileSync('python3', [path.join(ROOT, 'build.py')], { stdio: 'inherit' });
  const errors = [], fails = [];
  const check = (ok, msg) => { if (!ok) fails.push(msg); log((ok ? 'ok   ' : 'FAIL ') + msg); };
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 800, height: 500 } });
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('frente44:settings', JSON.stringify({ lang: 'es', quality: 'media' })); } catch (e) {} });
  await page.goto('file://' + HTML);
  await page.waitForFunction(() => window.F44 && window.Game && Game.mode === 'title', null, { timeout: 120000 });
  await page.evaluate(() => { GFX.auto = false; GFX.set('media'); });
  const shot = async (name) => { const f = path.join(OUT, 'core_' + name + '.png'); await page.screenshot({ path: f, timeout: 180000 }); log('captura', f); };
  const ev = (fn, arg) => page.evaluate(fn, arg);

  // ---------- título (bucle normal) ----------
  await page.waitForTimeout(2500);
  check(await ev(() => !!document.querySelector('#menu h1')), 'pantalla de título con el nombre');
  await shot('title');

  // ---------- título -> campaña -> informe -> juego, con la interfaz ----------
  await page.click('#menu .bt >> nth=0');
  await page.waitForSelector('#menu .bt.lv', { timeout: 120000 });
  const nLv = await ev(() => document.querySelectorAll('#menu .bt.lv').length);
  check(nLv === 7, 'la campaña lista 7 entradas (' + nLv + ')');
  await page.click('#menu .bt.lv >> nth=0');
  await page.waitForFunction(() => Game.mode === 'brief', null, { timeout: 120000 });
  check(true, 'informe de la misión');
  await page.click('#menu .bt >> nth=0');
  await page.waitForFunction(() => Game.mode === 'play', null, { timeout: 120000 });
  check(true, 'título -> juego por los menús');

  // ---------- control manual: misión de prueba ----------
  const st0 = await ev(() => { F44.start('test', 'regular'); F44.god(true); return F44.state(); });
  check(st0.mode === 'play' && st0.enemies === 6 && st0.allies === 2, 'F44.start(test): 6 enemigos y 2 aliados (' + st0.enemies + '/' + st0.allies + ')');
  log('estado', JSON.stringify(st0));
  // andar hacia delante 2 s
  const walk = await ev(() => { const p0 = Player.pos.slice(); F44.input({ mz: 1 }); F44.step(240); F44.input(null); F44.step(30); return { d: Math.hypot(Player.pos[0] - p0[0], Player.pos[2] - p0[2]), p: Player.pos }; });
  check(walk.d > 6 && walk.d < 12, 'el jugador anda (' + walk.d.toFixed(2) + ' m en 2 s)');
  // saltar y agacharse
  const jc = await ev(() => { const y0 = Player.pos[1]; F44.input({ jump: true }); F44.step(20); const up = Player.pos[1] - y0; F44.input(null); F44.step(100); F44.input({ crouch: true }); F44.step(60); const cr = Player.stance; F44.input({ crouch: true }); F44.step(60); F44.input(null); return { up, cr, st: Player.stance }; });
  check(jc.up > 0.3 && jc.cr === 'crouch' && jc.st === 'stand', 'salto (' + jc.up.toFixed(2) + ' m) y agacharse/levantarse');
  // disparar a un enemigo hasta matarlo
  const kill = await ev(() => {
    const e = Actors.list.find(a => a.alive && a.team === 'axis' && a.tag === 'range' && Math.abs(a.pos[0] + 3) < 0.6);
    if (!e) return { err: 'sin enemigo' };
    F44.teleport(e.pos[0] + 0.5, null, e.pos[2] - 9, 0);
    let shots = 0; const k0 = Game.stats.kills;
    for (let i = 0; i < 12 && e.alive; i++) {
      const eye = Player.eye(), c = Actors.chest(e);
      Player.yaw = Math.atan2(c[0] - eye[0], c[2] - eye[2]); Player.pitch = Math.atan2(c[1] - eye[1], Math.hypot(c[0] - eye[0], c[2] - eye[2])); Player.recoil.p = Player.recoil.y = 0;
      F44.input({ fire: true, fireDown: true, ads: true }); F44.step(1); shots++; F44.input({ ads: true }); F44.step(50);
    }
    F44.input(null); F44.step(10);
    return { dead: !e.alive, shots, kills: Game.stats.kills - k0, hits: Game.stats.hits, drops: Weapons.pickups.length, mag: Weapons.cur().mag };
  });
  check(kill.dead && kill.kills === 1, 'disparar y matar a un enemigo (' + JSON.stringify(kill) + ')');
  // recoger el arma que soltó el enemigo, caja de munición, MG fija, carga con temporizador y granada
  const use = await ev(() => {
    const r = {}, look = (p) => { const e = Player.eye(); Player.yaw = Math.atan2(p[0] - e[0], p[2] - e[2]); Player.pitch = -0.3; };
    const q = Weapons.pickups[0]; F44.teleport(q.pos[0], null, q.pos[2] - 1.0, 0); look(q.pos); F44.step(2);
    r.focus = Player.focus && Player.focus.kind; F44.input({ useDown: true, use: true }); F44.step(2); F44.input(null); F44.step(60); r.picked = Weapons.cur().id;
    Weapons.cur().ammo = 0; F44.teleport(13.6, null, -12.5, 0); look([13.6, 0, -11.2]); F44.step(2); r.ammoFocus = Player.focus && Player.focus.obj.kind;
    F44.input({ useDown: true }); F44.step(2); F44.input(null); r.ammo = Weapons.cur().ammo;
    F44.teleport(18, null, 6.4, 0); Player.pitch = 0; F44.step(2); F44.input({ useDown: true }); F44.step(2); F44.input(null); F44.step(30); r.mounted = !!Player.mounted;
    const s0 = Game.stats.shots; F44.input({ fire: true }); F44.step(60); F44.input(null); r.mgShots = Game.stats.shots - s0;
    F44.input({ useDown: true }); F44.step(2); F44.input(null); F44.step(40); r.dismounted = !Player.mounted;
    F44.teleport(-23.2, null, 34.6, 0); look([-23.2, 0, 36]); F44.step(2); r.chargeFocus = Player.focus && Player.focus.obj.kind;
    F44.input({ use: true, useDown: true }); F44.step(2); F44.input({ use: true }); F44.step(250); F44.input(null);
    F44.teleport(-23.2, null, 20, 0); F44.step(700); r.gunGone = !World.props.gun1 && !!Game.L.flags.gunDown;
    let ex = 0; const f = () => ex++; Bus.on('explosion', f); const n0 = Weapons.inv.nades; Player.pitch = 0.3;
    F44.input({ grenadeDown: true, grenade: true }); F44.step(30); F44.input(null); F44.step(600); Bus.off('explosion', f); r.nades = n0 - Weapons.inv.nades; r.explosions = ex;
    return r;
  });
  check(use.focus === 'pickup' && use.picked !== 'garand', 'recoger un arma del suelo (' + use.picked + ')');
  check(use.ammoFocus === 'ammo' && use.ammo > 0, 'caja de munición (' + JSON.stringify(use) + ')');
  check(use.mounted && use.mgShots > 6 && use.dismounted, 'MG42 fija: montar, disparar (' + use.mgShots + ') y soltar');
  check(use.chargeFocus === 'charge' && use.gunGone, 'carga mantenida 2 s que destruye el cañón (' + JSON.stringify(use) + ')');
  check(use.nades === 1 && use.explosions === 1, 'lanzar una granada que explota');
  // captura de juego y apuntando
  await ev(() => { F44.teleport(2, null, -14, 0.15); Player.pitch = 0.02; F44.input(null); F44.step(30); });
  await ev(() => F44.render()); await ev(() => F44.render());
  await shot('play');
  await ev(() => { F44.input({ ads: true }); F44.step(60); });
  await ev(() => F44.render());
  await shot('ads');
  await ev(() => { F44.input(null); F44.step(30); });

  // ---------- piloto automático hasta completar la misión ----------
  const t0 = Date.now(); let st = null, lastObj = -1;
  await ev(() => { F44.start('test', 'regular'); F44.god(true); F44.bot(true); });
  for (let i = 0; i < 150; i++) {
    st = await ev(() => F44.step(240));
    if (st.objective && st.objective.index !== lastObj) { lastObj = st.objective.index; log('objetivo', lastObj, st.objective.text, 't=' + st.time, 'pos', st.player.pos.join(','), 'enemigos', st.enemies); }
    if (st.mode !== 'play') break;
  }
  log('bot', ((Date.now() - t0) / 1000).toFixed(1) + ' s reales', JSON.stringify({ mode: st.mode, obj: st.objective, enemies: st.enemies, kills: st.stats && st.stats.kills, warps: st.warps, t: st.time }));
  check(st.mode === 'complete', 'el piloto automático completa la misión de prueba (modo ' + st.mode + ', objetivo ' + JSON.stringify(st.objective) + ', enemigos ' + st.enemies + ')');
  await ev(() => F44.render());
  await shot('complete');

  // ---------- muerte del jugador y vuelta al punto de control ----------
  const death = await ev(() => { F44.start('test', 'regular'); F44.bot(false); F44.god(false); Player.damage(500, [0, 0, 0], null); const m1 = Game.mode; F44.step(300); const m2 = Game.mode;
    Game.restartCheckpoint(); return { m1, m2, m3: Game.mode, hp: Player.health, deaths: Game.stats.deaths }; });
  check(death.m1 === 'dead' && death.m3 === 'play' && death.hp === 100 && death.deaths === 1, 'muerte y reaparición en el punto de control (' + JSON.stringify(death) + ')');
  const glErr = await ev(() => F44.render());
  check(glErr === 0, 'gl.getError() = 0 (' + glErr + ')');

  await browser.close();
  for (const e of errors) fails.push(e);
  if (errors.length) log('errores de consola:\n' + errors.join('\n'));
  if (fails.length) { console.error('FALLOS:\n' + fails.join('\n')); process.exit(1); }
  log('smoke: OK');
}
run().catch(e => { console.error(e); process.exit(1); });
