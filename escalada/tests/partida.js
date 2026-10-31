// Partida en el navegador (Playwright): Gigante Blanco con cuerdas, bloques de hielo, ventisca, escaleras,
// cumbre, tramos, récords y vuelta al volcán. Uso: node tests/partida.js (deja capturas en tests/out)
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.join(__dirname, '..', 'index.html');
require('fs').mkdirSync(path.join(__dirname, 'out'), { recursive: true });
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const page = await (await b.newContext({ viewport: { width: 960, height: 540 }, locale: 'es-MX' })).newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERR ' + e.message + ' ' + (e.stack||'').split('\n').slice(1,3).join(' | ')));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(URL);
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload(); await page.waitForTimeout(500);
  await page.waitForFunction(() => !document.getElementById('era-splash'), null, { timeout: 15000 });
  await page.click('#bClimb'); await page.click('#mtnSel button[data-m=k2]');
  await page.waitForFunction(() => window.__game.world && window.__game.world.mtn.id === 'k2', null, { timeout: 90000 });
  await page.click('#bRoute');
  await page.waitForFunction(() => window.__game.state === 'play', null, { timeout: 90000 });
  const R = await page.evaluate(() => {
    const g = window.__game, w = g.world, p = g.player, out = [];
    const steps = (n, inp) => { for (let i = 0; i < n && g.state === 'play'; i++) { g._fixed(1 / 60, typeof inp === 'function' ? inp(i) : (inp || { mx: 0, my: 0 }), true); g.elapsed += 1 / 60; } };
    const ch = nm => w.challenges.find(c => c.nm === nm);
    // 1) ladera con cuerda fija
    const s1 = ch('c_k_slope1'); g.cam.yaw = Math.atan2(s1.fx, s1.fz);
    p.reset(s1.x - s1.fx, w.groundBelow(s1.x - s1.fx, s1.y + 2, s1.z - s1.fz), s1.z - s1.fz, g.cam.yaw);
    let jum = false; for (let i = 0; i < 60 * 25 && !(p.state === 'jumar' && p.pos.y > s1.y + 10); i++) { steps(1, { mx: 0, my: 1, grab: true }); if (p.state === 'jumar') jum = true; }
    out.push('slope: jumar=' + jum + ' y+' + (p.pos.y - s1.y).toFixed(1) + ' clipped=' + !!p.line + ' anchor lineOnly=' + !!(p.anchor && p.anchor.lineOnly));
    const f0 = g.stats.falls; const y0 = p.pos.y; let caught = false, regrab = false;
    for (let i = 0; i < 60 * 4; i++) { steps(1, { mx: 0, my: 0, grab: false }); if (p.taut) caught = true; if (p.state === 'jumar') { regrab = true; break; } }
    out.push('let go: slid ' + (y0 - p.pos.y).toFixed(1) + ' caught=' + caught + ' regrab=' + regrab + ' slowT>0=' + (g.slowT > 0) + ' falls+' + (g.stats.falls - f0));
    // 2) cuello de botella: bloques de hielo
    const bn = ch('c_k_bottleneck'), F = w.icefalls[0], L = F.lanes[1];
    const mid = w.alongPts(L.pts, L.len * 0.5, {});
    let knocks = 0; const ke = p.knock.bind(p); p.knock = (...a) => { knocks++; ke(...a); };
    p.reset(mid.x, mid.y - 0.5, mid.z, 0); p.state = 'air';
    for (let i = 0; i < 60 * 12 && g.state === 'play'; i++) { steps(1, { mx: 0, my: 0, grab: true }); if (knocks) break; if (p.state !== 'jumar' && p.line && p.line.steep) {} }
    out.push('icefall: knocks=' + knocks + ' rocks visible max=' + g.fallingRocks.length + ' state=' + p.state);
    // 3) ventisca y frío
    g.weather.phase = 'build'; g.weather.t = 0.01;
    steps(60 * 9);
    const c0 = g.cold;
    out.push('storm: phase=' + g.weather.phase + ' stormK=' + g.stormK.toFixed(2) + ' wind=' + Math.hypot(g.stormWind.x, g.stormWind.z).toFixed(1) + ' cold=' + c0.toFixed(2));
    const cp1 = w.checkpoints[1];
    p.reset(cp1.x + 1, cp1.y, cp1.z, 0); g.cold = 0.8; w.campfires[1].lit = true;
    steps(60 * 4);
    out.push('warm at camp: cold ' + 0.8 + ' -> ' + g.cold.toFixed(2));
    // 4) caída de la escalera
    const ld = ch('c_k_ladder2'); const Ld = w.ladders[1];
    p.reset((Ld.a.x + Ld.b.x) / 2, Ld.y + 0.05, (Ld.a.z + Ld.b.z) / 2, 0); steps(5);
    out.push('ladder: onLadder=' + p.onLadder + ' line=' + (p.line ? p.line.id : 'none'));
    p.pos.x += Math.cos(ld.fx) * 0 + ld.fz * 0.9; p.pos.z += -ld.fx * 0.9; p.state = 'air'; p.grounded = false; p.vel.x = ld.fz * 3; p.vel.z = -ld.fx * 3;
    let asc = false; for (let i = 0; i < 60 * 8; i++) { steps(1); if (p.state === 'ascend') asc = true; if (asc && p.state !== 'ascend') break; }
    out.push('ladder fall: ascended=' + asc + ' end onLadder/grounded=' + p.grounded + ' dy=' + (p.pos.y - Ld.y).toFixed(2));
    // 5) expedición
    out.push('npcs: ' + g.expedition.list.map(n => n.name + '@' + n.i).join(' '));
    return out.join('\n');
  });
  console.log(R);
  // 6) cumbre
  await page.evaluate(() => { const g = window.__game, w = g.world, p = g.player; g.checkpoint = w.checkpoints.length - 2; const s = w.summit; p.reset(s.x, s.y, s.z - 1, 0); for (let i = 0; i < 5; i++) g._fixed(1 / 60, { mx: 0, my: 0 }, true); });
  await page.waitForFunction(() => window.__game.state === 'win', null, { timeout: 90000 });
  console.log('win:', await page.evaluate(() => document.getElementById('winTitle').textContent + ' / ' + document.getElementById('winSub').textContent + ' | badges ' + Object.keys(window.__game.save.badges).join(',')));
  await page.click('#bWinQuit'); await page.waitForTimeout(500);
  await page.click('#bClimb'); await page.waitForTimeout(300); await page.click('#bTramos'); await page.waitForTimeout(300);
  console.log('tramos:', await page.evaluate(() => document.getElementById('tramosTitle').textContent + ' | ' + document.getElementById('tramoList').innerText.replace(/\n/g, ' | ')));
  await page.screenshot({ path: path.join(__dirname, 'out', 'k2-tramos.png') });
  await page.click('#bTramosBack'); await page.waitForTimeout(200); await page.click('#bExpBack'); await page.waitForTimeout(200);
  await page.click('#bRec'); await page.waitForTimeout(300);
  console.log('records:', await page.evaluate(() => document.getElementById('recList').innerText.replace(/\n/g, ' | ')));
  await page.screenshot({ path: path.join(__dirname, 'out', 'k2-records.png') });
  await page.click('#bRecBack'); await page.waitForTimeout(200);
  // 7) volver al volcán
  await page.click('#bClimb'); await page.waitForTimeout(300); await page.click('#mtnSel button[data-m=volcano]');
  await page.waitForFunction(() => window.__game.world && window.__game.world.mtn.id === 'volcano', null, { timeout: 90000 });
  await page.click('#bRoute');
  await page.waitForFunction(() => window.__game.state === 'play', null, { timeout: 90000 });
  console.log('volcano:', await page.evaluate(() => { const g = window.__game; return g.world.mtn.id + ' k2=' + g.k2 + ' exp=' + !!g.expedition + ' gorges=' + g.world.gorges.length + ' y=' + g.player.pos.y.toFixed(1); }));
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(__dirname, 'out', 'k2-back-volcano.png') });
  console.log(errs.slice(0, 10).join('\n') || 'no errors');
  await b.close();
})();
