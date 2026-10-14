// Prueba de la campaña: para cada misión, F44.start + F44.god(true) + F44.bot(true) hasta completarla (tope de tiempo simulado),
// con el tiempo simulado, los saltos del piloto (warps) y las capturas en momentos representativos (al llegar a ciertos objetivos).
// También la escena del título y unas oleadas de supervivencia. Sin errores de consola.
// Uso: F44_OUT=/ruta/capturas [F44_HTML=construcción.html] [F44_MISSIONS=beach,village] [F44_NOSHOTS=1] node wwii/test/missions.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs'), os = require('os'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const OUT = process.env.F44_OUT || path.join(os.tmpdir(), 'frente44');
fs.mkdirSync(OUT, { recursive: true });
const HTML = process.env.F44_HTML || path.join(ROOT, 'index.html');
const log = (...a) => console.log('[missions]', ...a);
// objetivos en los que se hace captura (índice) y tope de tiempo simulado (s)
const PLAN = {
  training: { shots: [1, 4, 12], cap: 900, restart: 5 },
  beach: { shots: [0, 2, 4], cap: 1200, at0: 14, restart: 3 },
  village: { shots: [1, 3, 7], cap: 1200, restart: 4 },
  bocage: { shots: [1, 3, 6], cap: 1200, restart: 4 },
  bastogne: { shots: [2, 3, 7], cap: 1200, restart: 3 },
  survival: { shots: [], cap: 240, waves: 3 }
};

async function run() {
  if (!process.env.F44_HTML) execFileSync('python3', [path.join(ROOT, 'build.py')], { stdio: 'inherit' });
  const errors = [], fails = [], report = [];
  const check = (ok, msg) => { if (!ok) fails.push(msg); log((ok ? 'ok   ' : 'FAIL ') + msg); };
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 800, height: 500 } });
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('frente44:settings', JSON.stringify({ lang: 'es' })); } catch (e) {} });
  await page.goto('file://' + HTML);
  await page.waitForFunction(() => window.F44 && window.Game && Game.mode === 'title', null, { timeout: 180000 });
  await page.evaluate(() => { GFX.auto = false; GFX.set('media'); });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const noShots = !!process.env.F44_NOSHOTS;
  const shot = async (name) => { if (noShots) return; await ev(() => F44.render()); await ev(() => F44.render()); const f = path.join(OUT, 'mission_' + name + '.png'); await page.screenshot({ path: f, timeout: 300000 }); log('captura', f); };

  // escena del título (bucle normal unos segundos)
  if (!noShots) { await page.waitForTimeout(3000); const f = path.join(OUT, 'mission_title.png'); await page.screenshot({ path: f, timeout: 300000 }); log('captura', f); }
  const tl = await ev(() => ({ id: Game.level && Game.level.id, built: World.built }));
  check(tl.id === 'title' && tl.built, 'escena del título (' + JSON.stringify(tl) + ')');

  const only = (process.env.F44_MISSIONS || '').split(',').filter(Boolean);
  const ids = await ev(() => LEVELS.map(l => l.id).filter(id => id !== 'test'));
  for (const id of ids) {
    if (only.length && !only.includes(id)) continue;
    const P = PLAN[id] || { shots: [0], cap: 900 }, t0 = Date.now();
    const s0 = await ev(id => { const t = performance.now(); F44.start(id, 'regular'); F44.god(true); F44.bot(true); return { ms: Math.round(performance.now() - t), mode: Game.mode, cols: World.cols.length }; }, id);
    check(s0.mode === 'play', id + ': carga (' + s0.ms + ' ms, ' + s0.cols + ' colisionadores)');
    let st = null, last = -1; const done = new Set();
    if (id === 'survival') {
      let wave = 0;
      for (let i = 0; i < P.cap / 2; i++) { st = await ev(() => F44.step(240)); wave = await ev(() => Game.L.flags.wave || 0); if (wave > P.waves) break; }
      await shot(id);
      const pts = await ev(() => Game.L.flags.pts || 0);
      check(wave > P.waves - 1 && pts > 0, id + ': oleadas ' + wave + ', ' + pts + ' puntos en ' + st.time + ' s');
      // muerte: récord guardado y vuelta a empezar
      const d = await ev(() => { F44.god(false); F44.bot(false); Player.damage(999, null, null); F44.step(10); return { mode: Game.mode, best: Game.bestSurvival() }; });
      check(d.mode === 'dead' && d.best > 0, id + ': récord guardado al morir (' + JSON.stringify(d) + ')');
      report.push({ id, wave, pts, t: st.time });
      continue;
    }
    for (let i = 0; i < P.cap / 2; i++) {
      st = await ev(() => F44.step(240));
      const oi = st.objective ? st.objective.index : -1;
      if (oi !== last) { last = oi; log(id, 'objetivo', oi, st.objective && st.objective.text, 't=' + st.time, 'enemigos', st.enemies, 'warps', st.warps); }
      if (P.shots.includes(oi) && !done.has(oi) && st.mode === 'play' && !st.cine) {
        done.add(oi); if (oi === 0 && P.at0) await ev(n => F44.step(n), (P.at0 - st.time) * 120 | 0);
        await ev(() => { F44.step(30); });
        await shot(id + '_' + oi);
      }
      // vuelta al punto de control a mitad de misión (como al morir): mismo objetivo y la partida sigue
      if (P.restart === oi && !done.has('r') && st.mode === 'play' && !st.cine) {
        done.add('r'); await ev(() => F44.step(240));
        const r = await ev(() => { const o0 = Game.L.obj, cp = Game.L.cp && Game.L.cp.obj; Game.restartCheckpoint(true); F44.step(120); return { o0, cp, o1: Game.L.obj, mode: Game.mode }; });
        check(r.mode === 'play' && r.o1 === r.cp, id + ': reinicio desde el punto de control (' + JSON.stringify(r) + ')');
      }
      if (st.mode !== 'play' && st.mode !== 'dead') break;
    }
    const real = ((Date.now() - t0) / 1000).toFixed(0);
    report.push({ id, mode: st.mode, t: st.time, warps: st.warps, kills: st.stats && st.stats.kills, real });
    check(st.mode === 'complete', id + ': el piloto la completa (' + st.mode + ', t=' + st.time + ' s simulados, ' + real + ' s reales, warps ' + st.warps + ', bajas ' + (st.stats && st.stats.kills) + ', objetivo ' + JSON.stringify(st.objective) + ')');
  }
  await ev(() => F44.title());
  const glErr = await ev(() => F44.render());
  check(glErr === 0, 'gl.getError() = 0 (' + glErr + ')');
  await browser.close();
  log('resumen', JSON.stringify(report));
  for (const e of errors) fails.push(e);
  if (errors.length) log('errores de consola:\n' + errors.join('\n'));
  if (fails.length) { console.error('FALLOS:\n' + fails.join('\n')); process.exit(1); }
  log('missions: OK');
}
run().catch(e => { console.error(e); process.exit(1); });
