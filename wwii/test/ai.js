// Prueba de soldados, vehículos e IA: galería de aspectos y carros (capturas), poses, zonas de impacto (tiro a la cabeza),
// tiroteo con coberturas (se cubren, lanzan granadas, mueren con animación), fichas de ataque, carro destruido por la trasera,
// y supervivencia del jugador (sin modo dios, Regular) tras una cobertura. Sin errores de consola.
// Uso: F44_HTML=/ruta/index.html F44_OUT=/ruta/capturas node wwii/test/ai.js [galeria|combate|todo]
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs'), os = require('os');
const ROOT = path.resolve(__dirname, '..');
const OUT = process.env.F44_OUT || path.join(os.tmpdir(), 'frente44');
const HTML = process.env.F44_HTML || path.join(ROOT, 'index.html');
const MODE = process.argv[2] || 'todo';
fs.mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log('[ai]', ...a);

async function run() {
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
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const shot = async (name) => { await ev(() => F44.render()); const f = path.join(OUT, 'ai_' + name + '.png'); await page.screenshot({ path: f, timeout: 180000 }); log('captura', f); };
  await ev(() => { GFX.auto = false; GFX.set('alta'); F44.start('test', 'regular'); F44.god(true);
    // escenario vacío para la galería: fuera los soldados del guion
    window.G = {
      clear() { Actors.clear(); AI.reset(); Weapons.pickups.length = 0; },
      // fila de soldados frente a la cámara; o: {looks, kinds, z, sp, setup(a,i)}
      row(o) { this.clear(); const out = []; const n = o.items.length;
        o.items.forEach((it, i) => { const x = (i - (n - 1) / 2) * (o.sp || 1.1), z = o.z || 0; const a = Actors.spawn(Object.assign({ pos: [x, null, z], yaw: Math.PI }, it)); a.brain = { fake: 1 }; out.push(a); if (o.setup) o.setup(a, i); });
        return out; },
      cam(x, y, z, yaw, pitch) { F44.teleport(x, null, z, yaw); Player.pos[1] = y - 1.62; Player.pitch = pitch || 0; Player.recoil.p = Player.recoil.y = 0; },
      settle(n) { for (let i = 0; i < (n || 1); i++) { Actors.update(1 / 120); } }
    };
    // capturas limpias: sin interfaz ni arma en primera persona
    for (const el of document.body.children) if (el.id !== 'c') el.style.visibility = 'hidden'; Weapons.drawViewmodel = () => {};
    // la IA no toca a los de la galería
    const upd = AI.update.bind(AI); AI.update = dt => { if (!Actors.list.some(a => a.brain && a.brain.fake)) upd(dt); };
  });

  if (MODE === 'galeria' || MODE === 'todo') {
    // ---------- galería: todos los aspectos ----------
    await ev(() => { G.row({ z: 0, sp: 1.05, items: [{ team: 'ally', look: 'us', kind: 'rifle' }, { team: 'ally', look: 'para', kind: 'smg' }, { team: 'ally', look: 'usw', kind: 'mg' },
      { team: 'axis', look: 'de', kind: 'rifle' }, { team: 'axis', look: 'deo', kind: 'officer' }, { team: 'axis', look: 'dew', kind: 'smg' }, { team: 'axis', look: 'desn', kind: 'sniper' }],
      setup: (a, i) => { a.ready = i % 2; a.anim.rd = i % 2; } }); G.settle(2); G.cam(0, 1.3, -4.6, 0, -0.04); });
    await shot('gal_front');
    await ev(() => { for (const a of Actors.list) { a.yaw = 0; a.aim[0] = 0; } Actors.tick++; G.cam(0, 1.3, -4.6, 0, -0.04); });
    await shot('gal_back');
    await ev(() => { G.row({ z: 0, sp: 1.3, items: [{ team: 'ally', look: 'us' }, { team: 'axis', look: 'de' }, { team: 'axis', look: 'deo', kind: 'officer' }] }); G.settle(2); G.cam(0.5, 1.6, -1.9, -0.2, -0.1); });
    await shot('gal_close');
    // ---------- poses: andar, correr, agachado, recargar, lanzar, muerte ----------
    await ev(() => { const L = G.row({ z: 0, sp: 1.25, items: [{ team: 'axis' }, { team: 'axis' }, { team: 'axis', stance: 'crouch' }, { team: 'axis' }, { team: 'axis' }, { team: 'axis', kind: 'smg' }, { team: 'axis' }] });
      L[0].anim.mv = 1; L[0].anim.spd = 1.5; L[0].anim.ph = 0.6; L[1].anim.mv = 1; L[1].anim.run = 1; L[1].anim.S = 0.5; L[1].anim.ph = 2.2; L[2].ready = 1; L[2].anim.rd = 1;
      Actors.act(L[3], 'reload', 2); L[3].anim.at = 0.7; Actors.act(L[4], 'throw', 0.9); L[4].anim.at = 0.3; L[5].ready = 1; L[5].anim.rd = 1; L[5].aim[1] = 0.3;
      Actors.kill(L[6], { dir: [0, 0, 1] }, 'torso'); L[6].deadT = 0.45; Actors.tick++; G.cam(0, 1.35, -5.2, 0, -0.05); });
    await shot('poses');
    await ev(() => { for (const a of Actors.list) { a.yaw += Math.PI / 2; a.aim[0] = a.yaw; } Actors.tick++; G.cam(0, 1.35, -5.2, 0, -0.05); });
    await shot('poses_side');
    // muertes variadas, ya en el suelo
    const deaths = await ev(() => { const ty = ['back', 'forward', 'crumple', 'knees', 'spin', 'blast'], L = G.row({ z: 0, sp: 1.9, items: ty.map(() => ({ team: 'axis' })) });
      const parts = ['head', 'torso', 'leg', 'leg', 'torso', 'torso'], dirs = [[0, 0, 1], [0, 0, -1], [0, 0, 1], [0, 0, 1], [1, 0, 0], [0, 0, 1]];
      L.forEach((a, i) => { Actors.kill(a, { dir: dirs[i], explosive: i === 5, death: ty[i] }, parts[i]); }); for (let i = 0; i < 300; i++) Actors.update(1 / 120); for (const a of L) a.deadT = 3; Actors.tick++;
      G.cam(0, 4.5, -5.5, 0, -0.6); return L.map(a => a.anim.die); });
    log('muertes', deaths.join(','));
    await shot('deaths');
    // ---------- vehículos ----------
    const veh = async (name, o, cam) => { await ev(([o, cam]) => { G.clear(); const t = o.type === 'ht' ? Actors.spawnHalftrack(o) : Actors.spawnTank(o); t.brain = { fake: 1 }; t.tur = o.tur || 0; t.trL = t.trR = 0.3;
      if (o.dead) { Actors._killVeh(t, {}); for (let i = 0; i < 120; i++) Actors.update(1 / 120); } G.cam(...cam); }, [o, cam]); await shot(name); };
    await veh('pz4', { type: 'pz4', pos: [0, null, 6], yaw: -Math.PI * 0.62, tur: 0.5 }, [0, 2.3, -2, 0, -0.1]);
    await veh('tiger', { type: 'tiger', pos: [0, null, 7], yaw: Math.PI * 0.7, tur: -0.3 }, [0, 2.4, -2, 0, -0.1]);
    await veh('ht', { type: 'ht', pos: [0, null, 5.5], yaw: -Math.PI * 0.7 }, [0, 2.2, -2, 0, -0.12]);
    await veh('wreck', { type: 'pz4', pos: [0, null, 7], yaw: Math.PI * 0.4, camo: 'white', dead: true }, [0, 2.2, -2, 0, -0.1]);
  }

  if (MODE === 'combate' || MODE === 'todo') {
    // ---------- zonas de impacto según la pose ----------
    const hz = await ev(() => { G.clear(); const a = Actors.spawn({ team: 'axis', pos: [0, null, 0], yaw: Math.PI }); a.brain = { fake: 1 }; G.settle(3);
      const M = Actors.pose(a), r = {}, ray = (p) => { const o = [p[0] + 0.03, p[1] + 0.02, -10], d = V3.norm(V3.sub(p, o)); const h = Actors.raycast(o, d, 50); return h ? h.part : null; };
      r.head = ray(AM.pt(M[BHd], 0, 0.13, 0, [0, 0, 0])); r.torso = ray(Actors.chest(a)); r.leg = ray(AM.pt(M[BSL], 0, -0.2, 0, [0, 0, 0])); r.arm = ray(AM.pt(M[BFR], 0, -0.1, 0, [0, 0, 0]));
      r.miss = ray([a.pos[0] + 0.7, a.pos[1] + 1.2, a.pos[2]]);
      // agachado: la cabeza baja con la pose
      a.stance = 'crouch'; G.settle(120); const M2 = Actors.pose(a); r.crouchHead = ray(AM.pt(M2[BHd], 0, 0.13, 0, [0, 0, 0])); r.crouchY = +(M2[BHd][13] - a.pos[1]).toFixed(2);
      // tiro a la cabeza con el arma del jugador: muere y el evento lo marca
      a.stance = 'stand'; G.settle(120); let kill = null; const f = d => { kill = d; }; Bus.on('kill', f); const hp = AM.pt(Actors.pose(a)[BHd], 0, 0.13, 0, [0, 0, 0]);
      F44.teleport(0, null, -8, 0); const e = Player.eye(); Weapons.fire(Player, WEAPONS.garand, e, V3.norm(V3.sub(hp, e))); Bus.off('kill', f);
      r.headshot = !!(kill && kill.headshot); r.dead = !a.alive; r.drop = Weapons.pickups.length; return r; });
    log('zonas', JSON.stringify(hz));
    check(hz.head === 'head' && hz.torso === 'torso' && hz.leg === 'leg' && hz.arm === 'arm' && hz.miss === null, 'zonas de impacto (cabeza, torso, brazo, pierna, fallo)');
    check(hz.crouchHead === 'head' && hz.crouchY < 1.3, 'la cabeza agachada sigue la pose (' + hz.crouchY + ' m)');
    check(hz.headshot && hz.dead && hz.drop >= 1, 'tiro a la cabeza: muere, kill.headshot y suelta el arma');

    // ---------- tiroteo: 4 aliados y el jugador contra 7 alemanes tras las coberturas del campo ----------
    await ev(() => { G.clear(); F44.god(true); F44.teleport(0, null, -6, 0); Player.stance = 'crouch';
      const al = [], ax = [], St = { throws: 0, nades: 0, maxTok: 0, inCover: 0, peeks: 0, kills: 0, dies: {}, shots: { axis: 0, ally: 0 }, said: {}, flee: 0, coverSeen: new Set() };
      for (let i = 0; i < 4; i++) al.push(Actors.spawn({ team: 'ally', kind: i === 1 ? 'smg' : 'rifle', name: ['Hayes', 'Russo', 'Kowalski', 'Díaz'][i], pos: [-4 + i * 2.6, null, -3 - (i % 2)], yaw: 0 }));
      const P = [[-8, 18], [6, 28], [-3, 11], [14, 20], [0, 36], [-23, 25], [10, 15]];
      P.forEach((p, i) => ax.push(Actors.spawn({ team: 'axis', kind: i === 1 ? 'smg' : i === 4 ? 'officer' : 'rifle', pos: [p[0], null, p[1]], yaw: Math.PI, tag: 'f', grenades: 2 })));
      const h1 = Bus.on('throw', d => { if (d.by && d.by.team === 'axis') St.throws++; }), h2 = Bus.on('shot', d => { if (d.by && d.by.team) St.shots[d.by.team]++; }), h3 = Bus.on('say', d => { St.said[d.key] = (St.said[d.key] || 0) + 1; });
      const h4 = Bus.on('kill', d => { if (d.actor.team === 'axis') { St.kills++; } });
      window.FS = { St, al, ax, h1, h2, h3, h4 }; FS.sample = () => { for (const a of ax) if (a.alive && a.brain) { if (a.brain.cover) { St.coverSeen.add(a.id); if (V3.distXZ(a.pos, a.brain.cover.pos) < 1) St.inCover++; } if (a.brain.flee) St.flee++; } };
      for (let s = 0; s < 120 * 8; s++) { F44.step(1); St.maxTok = Math.max(St.maxTok, AI.tokens.size); if (s % 60 === 0) FS.sample(); }
      G.cam(-1, 1.8, 1, 0.05, -0.02); });
    await shot('fight');
    const fight = await ev(() => { const { St, al, ax, h1, h2, h3, h4 } = FS;
      // el jugador (piloto automático quieto en su sitio) también dispara
      const mk = Game.marker; Game.marker = () => [0, null, -6]; F44.bot(true);
      for (let s = 0; s < 120 * 70; s++) { F44.step(1); St.maxTok = Math.max(St.maxTok, AI.tokens.size);
        if (s % 60 === 0) FS.sample();
        if (!ax.some(a => a.alive)) break; }
      F44.bot(false); Game.marker = mk; F44.input(null);
      for (const a of ax) if (!a.alive) St.dies[a.anim.die] = (St.dies[a.anim.die] || 0) + 1;
      Bus.off('throw', h1); Bus.off('shot', h2); Bus.off('say', h3); Bus.off('kill', h4);
      St.t = +AI.t.toFixed(1); St.coverUsers = St.coverSeen.size; delete St.coverSeen; St.axisLeft = ax.filter(a => a.alive).length; St.allies = al.filter(a => a.alive).length; St.tok = Game.D.tokens; return St; });
    log('tiroteo', JSON.stringify(fight));
    check(fight.coverUsers >= 4 && fight.inCover > 10, 'los enemigos usan coberturas (' + fight.coverUsers + ' distintos)');
    check(fight.kills >= 3 && Object.keys(fight.dies).length >= 2, 'mueren con animaciones variadas (' + JSON.stringify(fight.dies) + ')');
    check(fight.maxTok <= fight.tok + 1, 'las fichas limitan los tiradores (' + fight.maxTok + ' <= ' + fight.tok + '+1)');
    check(fight.shots.axis > 20 && fight.shots.ally > 20, 'los dos bandos disparan');

    // ---------- carro: el frente aguanta un cohete, la trasera no ----------
    const tank = await ev(() => { G.clear(); const t = Actors.spawnTank({ type: 'pz4', pos: [0, null, 10], yaw: 0 }); t.brain = { fake: 1 };
      const boom = (z) => { const p = [t.pos[0], t.pos[1] + 1.2, t.pos[2] + z]; Weapons.explode(p, 6, WEAPONS.bazooka.dmg, Player, { rocket: true, actor: t }); };
      boom(3.2); const front = t.health; boom(-3.3); for (let i = 0; i < 240; i++) Actors.update(1 / 120);
      return { front, alive: t.alive, hp: t.health, max: t.maxHealth }; });
    log('carro', JSON.stringify(tank));
    check(tank.front > 0 && tank.front < tank.max && !tank.alive, 'el carro aguanta de frente y cae con un cohete en la trasera');
    await ev(() => { G.cam(-4, 2.2, 2, 0.4, -0.1); });
    await shot('tank_dead');

    // ---------- carro con IA: gira la torreta, avisa y dispara ----------
    const tai = await ev(() => { G.clear(); F44.god(true); F44.teleport(0, null, -10, 0); const t = Actors.spawnTank({ type: 'tiger', pos: [12, null, 40], yaw: Math.PI, path: [[12, 25], [5, 10]] });
      let warn = 0, cannon = 0, ex = 0; const a = Bus.on('tankAim', () => warn++), b = Bus.on('shot', d => { if (d.weapon === 'cannon') cannon++; }), c = Bus.on('explosion', () => ex++);
      const z0 = t.pos[2]; F44.step(120 * 25); Bus.off('tankAim', a); Bus.off('shot', b); Bus.off('explosion', c); return { warn, cannon, ex, moved: +(z0 - t.pos[2]).toFixed(1), tur: +t.tur.toFixed(2) }; });
    log('carro IA', JSON.stringify(tai));
    check(tai.warn >= 1 && tai.cannon >= 1 && tai.ex >= 1 && tai.moved > 5, 'el carro avanza por su ruta, avisa y dispara');

    // ---------- el jugador (sin modo dios, Regular) tras un muro aguanta ----------
    const surv = await ev(() => { G.clear(); Game._setDiff('regular'); F44.god(false); Player.health = 100; Player.alive = true; Game.mode = 'play';
      F44.teleport(22, null, 1.6, 0); Player.stance = 'crouch';
      for (const [x, z, k] of [[18, 22, 'rifle'], [26, 24, 'smg'], [22, 30, 'rifle'], [14, 28, 'rifle'], [30, 30, 'rifle']]) Actors.spawn({ team: 'axis', kind: k, pos: [x, null, z], yaw: Math.PI, alert: true });
      let t = 0, minH = 100, nades = 0; const hn = Bus.on('throw', d => { if (d.by !== Player) nades++; }); for (; t < 120 * 45 && Player.alive; t++) { // si cae una granada cerca, se aparta
        const g = Weapons.grenades.find(g => g.owner !== Player && V3.distXZ(g.pos, Player.pos) < 6); F44.input(g ? { mx: g.pos[0] > Player.pos[0] ? 1 : -1, sprint: true } : null);
        if (!g && t % 240 === 0) F44.teleport(22 + (Math.random() - 0.5), null, 1.6, 0), Player.stance = 'crouch';
        F44.step(1); minH = Math.min(minH, Player.health); }
      F44.input(null); Bus.off('throw', hn); return { alive: Player.alive, secs: +(t / 120).toFixed(1), minH: Math.round(minH), nades }; });
    log('supervivencia', JSON.stringify(surv));
    check(surv.nades >= 1, 'con el jugador quieto tras la cobertura, los enemigos lanzan granadas (' + surv.nades + ')');
    check(surv.secs >= 30, 'el jugador tras cobertura aguanta en Regular (' + surv.secs + ' s, vida mínima ' + surv.minH + ')');
    // al descubierto, de pie, los enemigos sí son peligrosos (pero no le matan al instante)
    const open_ = await ev(() => { G.clear(); Game._setDiff('regular'); F44.god(false); Player.health = 100; Player.alive = true; Game.mode = 'play'; F44.teleport(0, null, -2, 0); Player.stance = 'stand';
      for (const [x, z, k] of [[-4, 24, 'rifle'], [4, 26, 'smg'], [0, 30, 'rifle'], [8, 22, 'rifle']]) Actors.spawn({ team: 'axis', kind: k, pos: [x, null, z], yaw: Math.PI, alert: true });
      let t = 0, first = -1; for (; t < 120 * 60 && Player.alive; t++) { F44.step(1); if (first < 0 && Player.health < 100) first = t; }
      return { secs: +(t / 120).toFixed(1), firstHit: +(first / 120).toFixed(1), alive: Player.alive }; });
    log('al descubierto', JSON.stringify(open_));
    check(!open_.alive && open_.secs > 3 && open_.firstHit > 0.8, 'al descubierto el jugador cae, pero no al instante (' + open_.secs + ' s)');
    await ev(() => { Game.restartCheckpoint(); });
  }

  await browser.close();
  for (const e of errors) fails.push(e);
  if (errors.length) log('errores de consola:\n' + errors.join('\n'));
  if (fails.length) { console.error('FALLOS:\n' + fails.join('\n')); process.exit(1); }
  log('ai: OK');
}
run().catch(e => { console.error(e); process.exit(1); });
