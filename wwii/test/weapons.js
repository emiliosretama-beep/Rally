// Prueba de armas, efectos y jugador: disparar y recargar cada arma, apuntar, cerrojo, granada (cocinar, lanzar, explotar), bazuca contra un carro,
// culatazo, recoger armas, efectos de impacto y capturas del arma en primera persona (cadera, apuntando, recargando) en F44_OUT (w_*.png).
// Uso: F44_OUT=/ruta F44_HTML=/ruta/index.html node wwii/test/weapons.js [vista]   (con 'vista' sólo hace las capturas)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs'), os = require('os'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const OUT = process.env.F44_OUT || path.join(os.tmpdir(), 'frente44');
fs.mkdirSync(OUT, { recursive: true });
const HTML = process.env.F44_HTML || path.join(ROOT, 'index.html');
const ONLY = process.argv[2] || '';
const log = (...a) => console.log('[armas]', ...a);
async function run() {
  if (!process.env.F44_HTML) execFileSync('python3', [path.join(ROOT, 'build.py')], { stdio: 'inherit' });
  const errors = [], fails = [];
  const check = (ok, msg) => { if (!ok) fails.push(msg); log((ok ? 'ok   ' : 'FAIL ') + msg); };
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 800, height: 500 } });
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('frente44:settings', JSON.stringify({ lang: 'es' })); } catch (e) {} });
  await page.goto('file://' + HTML);
  await page.waitForFunction(() => window.F44 && window.Game && Game.mode === 'title', null, { timeout: 120000 });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const shot = async (name) => { await ev(() => F44.render()); const f = path.join(OUT, 'w_' + name + '.png'); await page.screenshot({ path: f, timeout: 180000 }); log('captura', f); };
  // escenario limpio: sin enemigos ni escuadra, jugador inmortal
  const prep = () => ev(() => { GFX.auto = false; GFX.set('media'); F44.start('test', 'regular'); F44.god(true); for (const a of Actors.list.slice()) if (a.team === 'axis') Actors.kill(a, {}); Actors.list = Actors.list.filter(a => a.team !== 'ally'); F44.step(10);
    document.getElementById('hud').style.display = 'none'; F44.teleport(-4, null, -30, 0.6); Player.pitch = 0.04; F44.step(5); });
  await prep();
  const IDS = ['garand', 'thompson', 'bar', 'colt', 'kar98', 'kar98s', 'mp40', 'stg44', 'bazooka'];
  // ---------- capturas del arma en primera persona ----------
  const VIEW = ONLY === 'vista' || !ONLY;
  if (VIEW) for (const id of (process.argv[3] ? process.argv[3].split(',') : IDS)) {
    await ev(id => { Weapons.setLoadout([id, 'frag:2']); F44.input(null); F44.step(80); }, id);
    await shot(id + '_hip');
    await ev(() => { F44.input({ ads: true }); F44.step(60); });
    await shot(id + '_ads');
    await ev(() => { F44.input(null); F44.step(50); const w = Weapons.cur(); w.mag = 0; Weapons.boltOpen = Weapons.def().rl === 'garand' || Weapons.def().rl === 'kar98'; Weapons.slideBack = Weapons.def().rl === 'pistol';
      F44.input({ reload: true }); F44.step(1); F44.input(null); F44.step(Math.round(Weapons.stD * 120 * 0.2)); });
    await shot(id + '_reload');
  }
  if (ONLY === 'vista') { await browser.close(); for (const e of errors) log(e); return; }
  // ---------- disparo y recarga de cada arma ----------
  const res = await ev(IDS => { const R = {}; const steps = []; Bus.on('reloadStep', d => steps.push(d.weapon + ':' + d.step));
    for (const id of IDS) { Weapons.setLoadout([id]); F44.step(80); const d = WEAPONS[id], w = Weapons.cur(), s0 = Game.stats.shots; steps.length = 0;
      for (let i = 0; i < 6; i++) { F44.input({ fire: true, fireDown: true }); F44.step(1); F44.input(null); F44.step(Math.ceil((d.boltT || 60 / d.rpm) * 120) + 6); }
      const fired = Game.stats.shots - s0, m1 = w.mag; w.mag = 0; if (d.rl === 'garand' || d.rl === 'kar98') Weapons.boltOpen = true; F44.input({ reload: true }); F44.step(1); F44.input(null); F44.step(Math.ceil(d.reload[1] * 120) + 40);
      R[id] = { fired, mag: w.mag, full: w.mag === d.mag, steps: steps.slice() }; }
    return R; }, IDS);
  for (const id of IDS) check(res[id].fired >= 1 && res[id].full && res[id].steps.length >= 1, id + ': dispara y recarga ' + JSON.stringify(res[id]));
  // ---------- Garand: peine con 'ping'; Kar98: cerrojo tras cada disparo ----------
  const gk = await ev(() => { let ping = 0; const f = () => ping++; Bus.on('ping', f); Weapons.setLoadout(['garand']); F44.step(80);
    for (let i = 0; i < 8; i++) { F44.input({ fire: true, fireDown: true }); F44.step(1); F44.input(null); F44.step(40); } const g = { ping, open: Weapons.boltOpen, mag: Weapons.cur().mag };
    F44.step(300); g.after = Weapons.cur().mag; Bus.off('ping', f);
    Weapons.setLoadout(['kar98']); F44.step(80); F44.input({ fire: true, fireDown: true }); F44.step(1); F44.input(null); F44.step(10); g.bolt = Weapons.st; F44.step(130); g.boltDone = Weapons.st;
    return g; });
  check(gk.ping === 1 && gk.open && gk.mag === 0 && gk.after === 8, 'Garand: el peine sale con ping al vaciarse y se recarga solo ' + JSON.stringify(gk));
  check(gk.bolt === 'bolt' && gk.boltDone === 'idle', 'Kar98: cerrojo tras disparar');
  // ---------- apuntar, dispersión y visor ----------
  const ads = await ev(() => { Weapons.setLoadout(['kar98s']); F44.step(80); const s0 = Weapons.spread; F44.input({ ads: true }); F44.step(60); const r = { hip: s0, ads: Weapons.spread, fov: Player.camera().fov }; F44.render(); r.scope = Post.fx.scope; F44.input(null); F44.step(40); return r; });
  check(ads.ads < ads.hip * 0.2 && ads.fov < 20, 'apuntar con visor: menos dispersión y zoom ' + JSON.stringify(ads));
  // ---------- granada: cocinar, lanzar, rebotar, explotar; cocinada de más, explota en la mano ----------
  const gr = await ev(() => { Weapons.setLoadout(['thompson', 'frag:4']); F44.step(80); let ex = [], b = 0; const fe = d => ex.push(d.pos), fb = () => b++; Bus.on('explosion', fe); Bus.on('grenadeBounce', fb);
    Player.pitch = 0.25; F44.input({ grenadeDown: true, grenade: true }); F44.step(2); F44.input({ grenade: true }); F44.step(150); const cook = Weapons.cook; F44.input(null); F44.step(40);
    const g = Weapons.grenades[0], fuse = g ? g.t : -1, p0 = Player.pos.slice(); F44.step(400); const r = { cook: +cook.toFixed(2), fuse: +fuse.toFixed(2), ex: ex.length, bounces: b, dist: ex[0] ? +Math.hypot(ex[0][0] - p0[0], ex[0][2] - p0[2]).toFixed(1) : 0, nades: Weapons.inv.nades };
    F44.god(false); Player.health = 100; F44.input({ grenadeDown: true, grenade: true }); F44.step(2); F44.input({ grenade: true }); F44.step(600); r.hand = ex.length; r.dead = !Player.alive; F44.input(null);
    Bus.off('explosion', fe); Bus.off('grenadeBounce', fb); return r; });
  check(gr.cook > 0.8 && gr.fuse > 0 && gr.fuse < 3 && gr.ex === 1 && gr.dist > 8 && gr.nades === 3, 'granada cocinada y lanzada ' + JSON.stringify(gr));
  check(gr.hand === 2 && gr.dead, 'granada cocinada de más: explota en la mano');
  await prep();
  // ---------- bazuca contra un carro ----------
  const bz = await ev(() => { Weapons.setLoadout(['bazooka']); F44.step(80); const tk = Actors.spawnTank({ team: 'axis', pos: [-4, null, -10], yaw: 0 }); tk.pos[1] = World.height(-4, -10); tk.brain = null; const hp0 = tk.health; let sh = 0;
    for (let i = 0; i < 6 && tk.alive; i++) { const e = Player.eye(), c = Actors.chest(tk); Player.yaw = Math.atan2(c[0] - e[0], c[2] - e[2]); Player.pitch = Math.atan2(c[1] - e[1], Math.hypot(c[0] - e[0], c[2] - e[2])); Player.recoil.p = Player.recoil.y = 0;
      F44.input({ fire: true, fireDown: true }); F44.step(1); F44.input(null); F44.step(60); sh++; const t = Weapons.cur(); if (t.mag === 0) F44.step(Math.ceil(WEAPONS.bazooka.reload[1] * 120) + 20); }
    return { hp0, hp: Math.round(tk.health), alive: tk.alive, shots: sh, ammo: Weapons.cur().ammo }; });
  check(!bz.alive && bz.shots <= 4, 'bazuca destruye un carro ' + JSON.stringify(bz));
  // ---------- culatazo con embestida ----------
  const ml = await ev(() => { Weapons.setLoadout(['garand']); F44.step(80); const a = Actors.spawn({ team: 'axis', pos: [Player.pos[0] + Math.sin(Player.yaw) * 2.6, null, Player.pos[2] + Math.cos(Player.yaw) * 2.6] }); a.brain = null; F44.step(2);
    const e = Player.eye(), c = Actors.chest(a); Player.yaw = Math.atan2(c[0] - e[0], c[2] - e[2]); Player.pitch = -0.1; let hit = null; const f = d => { if (!d.start) hit = d.hit; }; Bus.on('melee', f);
    const p0 = Player.pos.slice(); F44.input({ melee: true }); F44.step(1); F44.input(null); F44.step(80); Bus.off('melee', f); return { hit, dead: !a.alive, moved: +V3.distXZ(p0, Player.pos).toFixed(2) }; });
  check(ml.hit && ml.dead && ml.moved > 0.3, 'culatazo con embestida mata ' + JSON.stringify(ml));
  // ---------- recoger un arma: cambia por la de la mano; pasar por encima da munición ----------
  const pk = await ev(() => { Weapons.setLoadout(['garand', 'thompson']); F44.step(80); const q = Weapons.drop(WEAPONS.mp40, [Player.pos[0] + Math.sin(Player.yaw) * 1, Player.pos[1], Player.pos[2] + Math.cos(Player.yaw) * 1], 64);
    Player.pitch = -0.4; F44.step(2); const foc = Player.focus && Player.focus.kind; F44.input({ useDown: true, use: true }); F44.step(2); F44.input(null); F44.step(60);
    const r = { foc, cur: Weapons.cur().id, dropped: Weapons.pickups.map(p => p.id) }; Weapons.cur().ammo = 10; const q2 = Weapons.drop(WEAPONS.mp40, Player.pos, 50); F44.step(5); r.ammo = Weapons.cur().ammo; return r; });
  check(pk.foc === 'pickup' && pk.cur === 'mp40' && pk.dropped.includes('garand') && pk.ammo > 10, 'recoger MP40 y munición al pasar ' + JSON.stringify(pk));
  // ---------- balas enemigas que pasan cerca: whizz; penetración de madera fina ----------
  const wz = await ev(() => { let n = 0; const f = () => n++; Bus.on('whizz', f); const a = Actors.spawn({ team: 'axis', pos: [Player.pos[0] + 20, null, Player.pos[2]] }); a.brain = null;
    const o = Actors.eye(a), e = Player.eye(), d = V3.norm([e[0] - o[0], e[1] + 0.9 - o[1], e[2] - o[2]]); Weapons.fire(a, WEAPONS.kar98, o, d); Bus.off('whizz', f); Actors.kill(a, {}); return n; });
  check(wz === 1, 'bala que pasa cerca: whizz');
  // ---------- efectos: impactos por superficie, explosión, fuego, humo y luces ----------
  const fx = await ev(() => { FX.clear(); for (const s of ['dirt', 'grass', 'sand', 'snow', 'wood', 'metal', 'stone', 'water', 'flesh']) FX.impact([Player.pos[0], Player.pos[1] + 1, Player.pos[2] + 3], [0, 0, -1], s);
    const n1 = FX.n; FX.explosion([Player.pos[0] + 6, Player.pos[1], Player.pos[2] + 10], 6); const n2 = FX.n; const f = FX.fire([Player.pos[0] - 3, Player.pos[1], Player.pos[2] + 6], 1.5); FX.smoke([Player.pos[0] + 3, Player.pos[1], Player.pos[2] + 20], {});
    F44.step(120); const L = FX.lights().length; FX.weather({ snow: 1 }); F44.render(); return { n1, n2, n3: FX.n, deb: FX.D.length, L, dec: FX.dec ? FX.dec.n : 0, max: GFX.G.parts }; });
  check(fx.n1 > 20 && fx.n2 > fx.n1 + 40 && fx.n3 <= fx.max && fx.L >= 1 && fx.dec >= 5, 'efectos de impacto, explosión, fuego y luces ' + JSON.stringify(fx));
  await ev(() => { Weapons.setLoadout(['thompson']); F44.step(80); Player.yaw = 0.3; for (let i = 0; i < 5; i++) { F44.input({ fire: true }); F44.step(9); } F44.input(null); });
  await shot('fx');
  const glErr = await ev(() => F44.render());
  check(glErr === 0, 'gl.getError() = 0 (' + glErr + ')');
  await browser.close();
  for (const e of errors) fails.push(e);
  if (fails.length) { console.error('FALLOS:\n' + fails.join('\n')); process.exit(1); }
  log('armas: OK');
}
run().catch(e => { console.error(e); process.exit(1); });
