// Prueba de la interfaz: menús (título, campaña, informe, opciones, controles, créditos, pausa, fin), navegación con teclado,
// opciones que se guardan al recargar, HUD en juego (escritorio) y controles táctiles (iPad horizontal y vertical). Sin errores de consola.
// Uso: F44_OUT=/ruta/capturas [F44_HTML=construcción privada] [F44_FONTS=carpeta con fonts.css y los .woff2] node wwii/test/ui.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs'), os = require('os'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const OUT = process.env.F44_OUT || path.join(os.tmpdir(), 'frente44');
fs.mkdirSync(OUT, { recursive: true });
const HTML = process.env.F44_HTML || path.join(ROOT, 'index.html');
const FONTS = process.env.F44_FONTS || '';
const log = (...a) => console.log('[ui]', ...a);

// fuentes: si hay copia local se sirven (capturas fieles); si no, CSS vacío (sin errores de red)
async function routeFonts(ctx) {
  const css = FONTS && fs.existsSync(path.join(FONTS, 'fonts.css')) ? fs.readFileSync(path.join(FONTS, 'fonts.css'), 'utf8') : '';
  await ctx.route(/fonts\.googleapis\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: css }));
  await ctx.route(/fonts\.gstatic\.com/, r => {
    const f = path.join(FONTS, new URL(r.request().url()).pathname.slice(1).replace(/\//g, '_'));
    if (css && fs.existsSync(f)) return r.fulfill({ status: 200, contentType: 'font/woff2', body: fs.readFileSync(f) });
    return r.fulfill({ status: 404, body: '' });
  });
}

async function run() {
  if (!process.env.F44_HTML) execFileSync('python3', [path.join(ROOT, 'build.py')], { stdio: 'inherit' });
  const errors = [], fails = [];
  const check = (ok, msg) => { if (!ok) fails.push(msg); log((ok ? 'ok   ' : 'FAIL ') + msg); };
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const watch = (page, tag) => { page.on('console', m => { if (m.type() === 'error') errors.push(tag + ' console: ' + m.text()); }); page.on('pageerror', e => errors.push(tag + ' pageerror: ' + e.message)); };
  // progreso de ejemplo: instrucción y playa hechas (medallas), el resto por orden
  const SAVE = { done: { training: { time: 412.3, medal: 'gold', diff: 'veterano' }, beach: { time: 735.9, medal: 'silver', diff: 'regular' } }, best: { beach: { regular: 735.9 } }, survival: 4350, surv: { score: 4350, wave: 7, kills: 61 } };

  // =============== escritorio (teclado y ratón) ===============
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 640 }, deviceScaleFactor: 1 });
  await routeFonts(ctx);
  await ctx.addInitScript(s => { try { if (!sessionStorage.getItem('f44ui')) { sessionStorage.setItem('f44ui', '1'); localStorage.clear(); localStorage.setItem('frente44:settings', JSON.stringify({ lang: 'es', quality: 'media' })); localStorage.setItem('frente44:save', JSON.stringify(s)); } } catch (e) {} }, SAVE);
  const page = await ctx.newPage(); watch(page, 'desk');
  await page.goto('file://' + HTML);
  await page.waitForFunction(() => window.F44 && window.Game && Game.mode === 'title', null, { timeout: 120000 });
  await page.evaluate(() => { GFX.auto = false; GFX.set('media'); });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const shot = async (name, p) => { const f = path.join(OUT, 'ui_' + name + '.png'); await (p || page).screenshot({ path: f, timeout: 180000 }); log('captura', f); };
  const key = async (k, n) => { for (let i = 0; i < (n || 1); i++) { await page.keyboard.press(k); await page.waitForTimeout(60); } };
  const scr = () => ev(() => Menu.name);
  const focused = () => ev(() => { const a = document.activeElement; return a ? (a.dataset.a || a.dataset.k || a.className) : null; });

  // ---------- título ----------
  await page.waitForTimeout(1500);
  check(await ev(() => !!document.querySelector('#menu h1') && document.querySelectorAll('#menu .mnav .bt').length === 5), 'título con logo y 5 botones');
  await shot('title');

  // ---------- teclado: título -> campaña (flechas + Intro) ----------
  await key('ArrowDown'); await key('ArrowUp');
  check(await focused() === 'camp', 'foco con flechas en Campaña (' + await focused() + ')');
  check(await ev(() => document.body.classList.contains('kbnav')), 'foco visible (kbnav)');
  await key('Enter'); await page.waitForTimeout(300);
  check(await scr() === 'campaign', 'Intro abre la campaña');
  const camp = await ev(() => ({ n: document.querySelectorAll('#menu .bt.lv').length, locked: document.querySelectorAll('#menu .card.locked').length, medals: document.querySelectorAll('#menu .card .medal.on').length, f: document.activeElement.dataset.id }));
  check(camp.n === 7 && camp.locked >= 1 && camp.medals >= 5, 'tarjetas de misión con bloqueo y medallas (' + JSON.stringify(camp) + ')');
  await key('ArrowRight'); const f2 = await focused();
  await shot('campaign');
  // tarjeta bloqueada: no abre nada
  await ev(() => { const b = document.querySelector('#menu .card.locked'); if (b) { b.focus(); } });
  await key('Enter'); await page.waitForTimeout(200);
  check(await scr() === 'campaign' && await ev(() => Game.mode) === 'title', 'una misión bloqueada no se abre');
  // misión desbloqueada -> informe
  await ev(() => document.querySelector('#menu .card[data-id="village"]').focus());
  await key('Enter');
  await page.waitForFunction(() => Game.mode === 'brief', null, { timeout: 120000 });
  check(await focused() === 'go' || (await focused() || '').includes('go'), 'informe: el foco empieza en Empezar');
  await key('ArrowLeft'); await key('Enter'); // elige otra dificultad (la de al lado: Veterano)
  await page.waitForTimeout(3500);
  const br = await ev(() => ({ tw: document.querySelector('.tw').textContent.length, full: (document.querySelector('.tw').dataset.full || '').length, diff: Menu._diff, map: !!document.querySelector('.mapw canvas') }));
  check(br.map && br.tw > 10 && br.diff === 'veterano', 'informe con mapa y texto a máquina (' + JSON.stringify(br) + ')');
  await shot('briefing');
  await key('Escape'); await page.waitForTimeout(500);
  check(await scr() === 'campaign' && await ev(() => Game.mode) === 'title', 'Esc vuelve del informe a la campaña');
  await key('Escape'); await page.waitForTimeout(200);
  check(await scr() === 'title', 'Esc vuelve al título');

  // ---------- opciones: pestañas, ajustar con flechas, guardado ----------
  await ev(() => document.querySelector('#menu [data-a="opts"]').focus()); await key('Enter'); await page.waitForTimeout(200);
  check(await scr() === 'options', 'opciones abiertas');
  await key('KeyE'); // pestaña Controles
  check(await ev(() => Menu.tab.opts) === 'controls', 'Q/E cambian de pestaña');
  await ev(() => document.querySelector('.opt[data-k="sensMouse"]').focus());
  await key('ArrowRight', 4);
  const sm = await ev(() => Settings.sensMouse);
  check(Math.abs(sm - 1.2) < 0.001, 'flecha derecha sube la sensibilidad (' + sm + ')');
  await ev(() => document.querySelector('.opt[data-k="invertY"]').focus()); await key('Enter');
  check(await ev(() => Settings.invertY) === true, 'Intro alterna invertir Y');
  await shot('options');
  await key('KeyE'); await page.waitForTimeout(100); // Imagen
  await ev(() => document.querySelector('.opt[data-k="quality"]').focus()); await key('ArrowLeft');
  check(await ev(() => Settings.quality === 'baja' && GFX.level === 'baja'), 'calidad gráfica cambia el GFX del motor');
  await key('ArrowRight');
  await key('KeyE'); await page.waitForTimeout(100); // Sonido
  await ev(() => document.querySelector('.opt[data-k="volMusic"]').focus()); await key('ArrowLeft', 2);
  await key('KeyQ', 3); // Juego
  await ev(() => document.querySelector('.opt[data-k="lang"]').focus()); await key('ArrowRight');
  check(await ev(() => Settings.lang === 'en' && document.querySelector('#menu h2').textContent === 'Options'), 'idioma: la pantalla se traduce al momento');
  // controles por dispositivo
  await key('Escape'); await page.waitForTimeout(200);
  await ev(() => document.querySelector('#menu [data-a="ctl"]').focus()); await key('Enter'); await page.waitForTimeout(200);
  check(await scr() === 'controls', 'pantalla de controles');
  await key('ArrowRight'); await key('Enter'); await page.waitForTimeout(150);
  check(await ev(() => document.querySelectorAll('.keymap .pg').length > 5), 'controles del mando con glifos');
  await shot('controls_pad');
  await ev(() => document.querySelector('.tab[data-v="touch"]').click()); await page.waitForTimeout(150);
  check(await ev(() => document.querySelectorAll('.tprev .tb').length >= 9), 'vista previa de la disposición táctil');
  await shot('controls_touch');
  await key('Escape'); await page.waitForTimeout(150);
  await ev(() => document.querySelector('#menu [data-a="cred"]').focus()); await key('Enter'); await page.waitForTimeout(200);
  check(await scr() === 'credits' && (await ev(() => document.querySelector('.credits').textContent)).includes('ERAGAMES'), 'créditos de ERAGAMES');
  await key('Escape');

  // ---------- opciones guardadas al recargar ----------
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.F44 && window.Game && Game.mode === 'title', null, { timeout: 120000 });
  const per = await ev(() => ({ lang: Settings.lang, sm: Settings.sensMouse, inv: Settings.invertY, mus: Settings.volMusic, inp: Input.opts.sensMouse, h: document.querySelector('#menu .bt .lb').textContent, raw: JSON.parse(localStorage.getItem('frente44:settings')) }));
  check(per.lang === 'en' && Math.abs(per.sm - 1.2) < 1e-6 && per.inv === true && Math.abs(per.mus - 0.5) < 1e-6 && per.inp === per.sm && /Campaign/.test(per.h), 'opciones conservadas al recargar (' + JSON.stringify(per).slice(0, 160) + ')');
  // cuota llena / almacenamiento roto: no rompe nada
  const quota = await ev(() => { const o = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new DOMException('full', 'QuotaExceededError'); }; let ok = true; try { Settings.set('volFx', 0.7); Save.store(); } catch (e) { ok = false; } Storage.prototype.setItem = o; return ok && Settings.volFx === 0.7; });
  check(quota, 'error de cuota de localStorage sin excepciones');
  const bad = await ev(() => { const o = Store.get('settings'); localStorage.setItem('frente44:settings', '{"fov":"abc","sensMouse":99,"lang":"xx"'); const r = Store.get('settings', 'def'); localStorage.setItem('frente44:settings', JSON.stringify(o)); return r; });
  check(bad === 'def', 'JSON corrupto -> valores por defecto');
  await ev(() => { Settings.set('lang', 'es'); Settings.set('invertY', false); Settings.set('sensMouse', 1); Settings.set('quality', 'media'); GFX.set('media'); GFX.auto = false; Menu.title(); });

  // ---------- HUD en juego (escritorio) ----------
  await ev(() => { F44.start('test', 'regular'); F44.god(true); F44.teleport(13.6, null, -12.5, 0); Player.pitch = -0.1; F44.step(30);
    Bus.emit('say', { who: 'Hayes', key: 'x', text: 'Recoged munición de la caja y seguidme hasta la casa.' }); Bus.emit('say', { who: 'Russo', key: 'y', text: '¡Entendido, sargento!' });
    Bus.emit('playerHurt', { dmg: 30, from: [Player.pos[0] - 10, 0, Player.pos[2]] }); Player.health = 45; Player.lastHurt = Player.time;
    const a = Actors.list.find(x => x.team === 'axis'); Bus.emit('hit', { actor: a, by: Player, kill: false });
    Weapons.throwGrenade(null, [Player.pos[0] + 2.5, Player.pos[1] + 0.3, Player.pos[2] + 2], [0, 0, 0], 'stiel', 30);
    HUD.toast(t('checkpoint')); });
  for (let i = 0; i < 4; i++) await ev(() => F44.render());
  const hud = await ev(() => ({ prompt: getComputedStyle(HUD.el.pr).display !== 'none' && HUD.el.pr.textContent, kbd: !!HUD.el.pr.querySelector('kbd'), ammo: HUD.el.amm.textContent, obj: HUD.el.obj.textContent, subs: HUD.el.sub.children.length, gren: HUD.el.gws.querySelector('.gw.on') ? 1 : 0, arcs: [...HUD.el.dm.children].filter(e => +e.style.opacity > 0).length }));
  check(hud.prompt && hud.kbd && /munición/.test(hud.prompt), 'aviso de usar con tecla [E] (' + hud.prompt + ')');
  check(/M1 Garand|Garand/i.test(hud.ammo) && /Llega/.test(hud.obj) && hud.subs === 2 && hud.gren === 1 && hud.arcs === 1, 'HUD: munición, objetivo, subtítulos, granada y daño (' + JSON.stringify(hud) + ')');
  await shot('hud_desktop');
  // visor del fusil de precisión
  await ev(() => { Weapons.grenades.length = 0; Weapons.setLoadout(['kar98s', 'colt', 'stiel:3']); F44.input({ ads: true }); F44.step(80); Player.health = 100; });
  await ev(() => F44.render()); await ev(() => F44.render());
  check(await ev(() => getComputedStyle(HUD.el.scope).display !== 'none' && HUD.el.xh.classList.contains('off')), 'visor: retícula del visor y sin cruz');
  await shot('hud_scope');
  await ev(() => { F44.input(null); F44.step(40); });

  // ---------- pausa con teclado ----------
  await ev(() => { Game.pause(); });
  await page.waitForTimeout(300);
  check(await scr() === 'pause' && await ev(() => Game.mode) === 'pause', 'pausa');
  await ev(() => F44.render());
  await shot('pause');
  await ev(() => document.querySelector('#menu [data-a="opts"]').focus()); await key('Enter'); await page.waitForTimeout(150);
  await key('Escape'); await page.waitForTimeout(150);
  check(await scr() === 'pause' && await ev(() => Game.mode) === 'pause', 'Esc en Opciones vuelve a la pausa (no reanuda)');
  await ev(() => document.querySelector('#menu [data-a="quit"]').focus()); await key('Enter'); await page.waitForTimeout(150);
  check(await ev(() => !!Menu.dlg), 'salir pide confirmación');
  await key('Escape'); await page.waitForTimeout(100);
  check(await ev(() => !Menu.dlg) && await scr() === 'pause', 'Esc cierra la confirmación');
  await key('Escape'); await page.waitForTimeout(200);
  check(await ev(() => Game.mode) === 'play', 'Esc reanuda desde la pausa');

  // ---------- muerte ----------
  await ev(() => { F44.god(false); Player.damage(500, [Player.pos[0] + 5, 0, Player.pos[2]], null); F44.step(320); });
  await ev(() => F44.render()); await ev(() => F44.render());
  check(await ev(() => HUD.el.dead.classList.contains('on') && /muerto/i.test(HUD.el.dead.textContent) && HUD.el.dead.querySelector('.tip').textContent.length > 10), 'pantalla de muerte con consejo');
  await page.waitForTimeout(1300);
  await shot('dead');
  await ev(() => Game.restartCheckpoint());

  // ---------- fin de misión ----------
  await ev(() => { Game.stats.kills = 6; Game.stats.shots = 20; Game.stats.hits = 14; Game.stats.heads = 2; Game.stats.time = 196; Game.complete(); });
  await page.waitForTimeout(1600);
  check(await scr() === 'complete' && await ev(() => document.querySelector('.stats dd[data-v="6"]').textContent) === '6', 'fin de misión con estadísticas');
  await shot('complete');
  check(await ev(() => !!document.querySelector('#menu .bt.pri[data-a="next"]')), 'botón de siguiente misión');

  // ---------- supervivencia: muerte con resultados ----------
  await ev(() => { F44.start('survival', 'regular'); F44.god(false); Game.L.flags.wave = 3; Game.L.flags.score = 5200; Bus.emit('wave', { n: 3 }); Bus.emit('score', { add: 250, total: 5200 }); Player.damage(500, null, null); F44.step(300); });
  await ev(() => F44.render());
  check(await ev(() => Save.survival === 5200 && /5/.test(HUD.el.dead.querySelector('.svr').textContent)), 'supervivencia: récord guardado y resultados al morir');
  await ev(() => F44.title());
  await ctx.close();

  // =============== táctil (iPad 1024×768 y 768×1024) ===============
  const tctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  await routeFonts(tctx);
  await tctx.addInitScript(s => { try { if (!sessionStorage.getItem('f44ui')) { sessionStorage.setItem('f44ui', '1'); localStorage.clear(); localStorage.setItem('frente44:settings', JSON.stringify({ lang: 'es', quality: 'media' })); localStorage.setItem('frente44:save', JSON.stringify(s)); } } catch (e) {} }, SAVE);
  const tp = await tctx.newPage(); watch(tp, 'touch');
  await tp.goto('file://' + HTML);
  await tp.waitForFunction(() => window.F44 && window.Game && Game.mode === 'title', null, { timeout: 120000 });
  const tev = (fn, arg) => tp.evaluate(fn, arg);
  await tev(() => { GFX.auto = false; GFX.set('media'); });
  await tp.touchscreen.tap(700, 80); await tp.waitForTimeout(1200);
  check(await tev(() => Input.device) === 'touch', 'el primer toque activa el modo táctil');
  await shot('touch_title', tp);
  await tp.touchscreen.tap(160, await tev(() => { const r = document.querySelector('#menu .bt.pri').getBoundingClientRect(); return r.top + r.height / 2; }));
  await tp.waitForTimeout(400);
  check(await tev(() => Menu.name) === 'campaign', 'tocar Campaña abre la campaña');
  await shot('touch_campaign', tp);
  await tev(() => document.querySelector('#menu .card[data-id="beach"]').click());
  await tp.waitForFunction(() => Game.mode === 'brief', null, { timeout: 120000 }); await tp.waitForTimeout(2500);
  await shot('touch_briefing', tp);
  await tev(() => { F44.start('test', 'regular'); F44.god(true); F44.teleport(13.6, null, -12.6, 0); Player.pitch = -0.12; F44.step(20); Weapons.inv.nades = 3; });
  await tp.touchscreen.tap(600, 300); // toque en la zona de mirar
  const tst = await tev(() => {
    const T = Input.T, tz = T.el.tz, ev = (t, id, x, y) => tz.dispatchEvent(new PointerEvent(t, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, cancelable: true }));
    // palanca flotante (pulgar izquierdo) + mirar con el derecho a la vez
    ev('pointerdown', 7, 180, 560); ev('pointermove', 7, 180, 505); ev('pointerdown', 8, 640, 360); ev('pointermove', 8, 700, 360); Input.update(1 / 60);
    const c = { mx: +Input.cmd.mx.toFixed(2), mz: +Input.cmd.mz.toFixed(2), look: Input.cmd.lookX > 0, stick: !T.el.stk.classList.contains('idle') };
    ev('pointerup', 8, 700, 360); Input.consume();
    // botones: disparar y apuntar (alterna)
    const fr = T.el.fire.getBoundingClientRect(), ar = T.el.ads.getBoundingClientRect();
    ev('pointerdown', 9, fr.left + fr.width / 2, fr.top + fr.height / 2); Input.update(1 / 60); c.fire = Input.cmd.fire && Input.cmd.fireDown; ev('pointerup', 9, fr.left + fr.width / 2, fr.top + fr.height / 2);
    ev('pointerdown', 10, ar.left + ar.width / 2, ar.top + ar.height / 2); ev('pointerup', 10, ar.left + ar.width / 2, ar.top + ar.height / 2); Input.update(1 / 60); c.ads = Input.cmd.ads; Input.consume();
    ev('pointerdown', 10, ar.left + ar.width / 2, ar.top + ar.height / 2); ev('pointerup', 10, ar.left + ar.width / 2, ar.top + ar.height / 2); Input.update(1 / 60); c.adsOff = !Input.cmd.ads; Input.consume();
    c.use = !T.el.use.hidden; c.btns = document.querySelectorAll('#touch .tb').length;
    // botones sin solaparse y dentro de la pantalla
    const R = [...document.querySelectorAll('#touch .tb')].filter(e => !e.hidden).map(e => [e.dataset.b, e.getBoundingClientRect()]); let over = [];
    for (let i = 0; i < R.length; i++) { const a = R[i][1]; if (a.left < 0 || a.top < 0 || a.right > innerWidth || a.bottom > innerHeight) over.push(R[i][0] + ':fuera');
      for (let j = i + 1; j < R.length; j++) { const b = R[j][1], d = Math.hypot(a.left + a.width / 2 - b.left - b.width / 2, a.top + a.height / 2 - b.top - b.height / 2); if (d < (a.width + b.width) / 2 + 4) over.push(R[i][0] + '/' + R[j][0]); } }
    c.over = over; ev('pointerup', 7, 180, 505); return c; });
  check(tst.mz > 0.8 && Math.abs(tst.mx) < 0.15 && tst.stick && tst.look, 'táctil: palanca flotante y mirar a la vez (' + JSON.stringify(tst) + ')');
  check(tst.fire && tst.ads && tst.adsOff && tst.use && tst.btns >= 10, 'táctil: disparar, apuntar alterna y botón Usar contextual');
  check(tst.over.length === 0, 'botones táctiles sin solaparse (' + tst.over.join(',') + ')');
  // el HUD no queda debajo de los botones
  const lay = await tev(() => { const B = [...document.querySelectorAll('#touch .tb')].filter(e => !e.hidden && e.dataset.b !== 'pause').map(e => e.getBoundingClientRect()); const hit = el => { const r = el.getBoundingClientRect(); if (!r.width) return false; return B.some(b => r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top); };
    Bus.emit('say', { who: 'Hayes', key: 'x', text: 'Coge munición de esa caja, soldado. Nos vamos en cuanto estés listo.' }); HUD.update(0.016);
    return { amm: hit(HUD.el.amm), sub: hit(HUD.el.sub), obj: hit(HUD.el.obj), pr: hit(HUD.el.pr) }; });
  check(!lay.amm && !lay.sub && !lay.obj && !lay.pr, 'HUD sin tapar los botones táctiles (' + JSON.stringify(lay) + ')');
  // escena con la palanca puesta
  await tev(() => { const tz = Input.T.el.tz; tz.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 21, pointerType: 'touch', clientX: 170, clientY: 590, bubbles: true })); tz.dispatchEvent(new PointerEvent('pointermove', { pointerId: 21, pointerType: 'touch', clientX: 190, clientY: 548, bubbles: true })); });
  for (let i = 0; i < 3; i++) await tev(() => F44.render());
  await shot('touch_hud_landscape', tp);
  await tev(() => { Input.T.el.tz.dispatchEvent(new PointerEvent('pointerup', { pointerId: 21, pointerType: 'touch', clientX: 190, clientY: 548, bubbles: true })); });
  await tp.setViewportSize({ width: 768, height: 1024 }); await tp.waitForTimeout(300);
  for (let i = 0; i < 2; i++) await tev(() => F44.render());
  const lay2 = await tev(() => { const B = [...document.querySelectorAll('#touch .tb')].filter(e => !e.hidden && e.dataset.b !== 'pause').map(e => e.getBoundingClientRect()); const hit = el => { const r = el.getBoundingClientRect(); if (!r.width) return false; return B.some(b => r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top); }; return { amm: hit(HUD.el.amm), sub: hit(HUD.el.sub), obj: hit(HUD.el.obj) }; });
  check(!lay2.amm && !lay2.sub && !lay2.obj, 'vertical: HUD sin tapar los botones (' + JSON.stringify(lay2) + ')');
  await shot('touch_hud_portrait', tp);
  await tev(() => { Game.pause(); });
  await tp.waitForTimeout(300);
  await shot('touch_pause_portrait', tp);
  await tev(() => F44.title()); await tp.waitForTimeout(800);
  await shot('touch_title_portrait', tp);
  await tctx.close();

  await browser.close();
  for (const e of errors) fails.push(e);
  if (errors.length) log('errores de consola:\n' + errors.join('\n'));
  if (fails.length) { console.error('FALLOS:\n' + fails.join('\n')); process.exit(1); }
  log('ui: OK');
}
run().catch(e => { console.error(e); process.exit(1); });
