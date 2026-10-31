// Tramos con viento: ¿la ráfaga importa? Tres jugadores en cada paso con viento:
//  recto   = solo mantiene adelante, no reacciona
//  corrige = camina corrigiendo hacia el centro del paso, sin sujetarse
//  sujeta  = igual, pero mantiene AGARRAR desde el aviso hasta que pasa la ráfaga
// Las ráfagas se calculan igual que en el juego (main.js, _env). Uso: node tests/viento.js
require('./load')();
const out = [];
for (const mid of ['volcano', 'k2']) {
  const w = new World(mid), C = w.challenges;
  for (const c of C) {
    if (!['ladderBridge', 'ledge', 'ridge'].includes(c.t)) continue;
    if (!w.winds.some(z => z.tramo === c.tramo && c.x > z.x0 && c.x < z.x1 && c.z > z.z0 && c.z < z.z1)) continue;
    const nx = C[c.idx + 1] && C[c.idx + 1].tramo === c.tramo ? C[c.idx + 1] : w.checkpoints[c.tramo + 1];
    const end = c.t === 'ladderBridge' ? Math.min(12, (nx.x - c.x) * c.fx + (nx.z - c.z) * c.fz - 1) : c.t === 'ledge' ? c.len : (nx.x - c.x) * c.fx + (nx.z - c.z) * c.fz - 1;
    const lat = c.t === 'ledge' ? (c.side === 'L' ? 1 : -1) * (c.W - 0.62) : 0;
    const row = {};
    for (const who of ['recto', 'corrige', 'sujeta']) {
      const res = [];
      for (const ph0 of [0, 1, 2, 3, 4, 5]) {
        w.resetState(); w.t = ph0;
        const p = new Player(w), yaw = Math.atan2(c.fx, c.fz);
        const sx = c.x - c.fx * 1.5 + c.fz * lat, sz = c.z - c.fz * 1.5 - c.fx * lat;
        p.reset(sx, w.groundBelow(sx, c.y + 1, sz), sz, yaw);
        let t = 0, falls = 0, ok = false, gusts = 0, wasG = false;
        for (let k = 0; k < 60 * 40; k++) {
          t += 1 / 60; w.update(1 / 60);
          let wind = null, gust = false, warn = false;
          for (const z of w.winds) {
            const P = p.pos, inside = P.x > z.x0 - 2 && P.x < z.x1 + 2 && P.z > z.z0 - 2 && P.z < z.z1 + 2 && P.y > z.y0 && P.y < z.y1;
            if (!inside) continue;
            const ph = (w.t + z.phase) % z.period, cyc = Math.floor((w.t + z.phase) / z.period), act = z.period - z.dur, sg = cyc % 2 ? 1 : -1;
            if (ph >= act - z.warn && ph < act) warn = true;
            if (ph >= act) { gust = true; wind = { x: z.dx * z.force * sg, z: z.dz * z.force * sg }; }
          }
          if (gust && !wasG) gusts++; wasG = gust;
          const pr = (p.pos.x - c.x) * c.fx + (p.pos.z - c.z) * c.fz, la = (p.pos.x - c.x) * c.fz - (p.pos.z - c.z) * c.fx;
          let hd = yaw;
          if (who !== 'recto') { const ax = c.x + c.fx * (pr + 2) + c.fz * lat, az = c.z + c.fz * (pr + 2) - c.fx * lat; hd = Math.atan2(ax - p.pos.x, az - p.pos.z); }
          const grab = who === 'sujeta' && (warn || gust);
          p.step(1 / 60, { mx: 0, my: 1, grab, jump: false }, hd, { wind, gust, cold: 0 });
          for (const e of p.events) if (e.type === 'catch') falls++;
          p.events.length = 0;
          if (p.grounded && p.state === 'air' && p.anchor) { const pit = w.pitAt(p.pos.x, p.pos.z); if (pit && p.pos.y < pit.y + 1.6) p.startAscend(); }
          if (falls || p.pos.y < c.y - 3) { if (!falls) falls = 1; break; }
          if (pr > end && p.grounded) { ok = true; break; }
        }
        res.push({ ok, t, falls, gusts });
      }
      const n = res.filter(x => x.ok).length, g = res.filter(x => x.gusts > 0);
      row[who] = n + '/' + res.length + (g.length ? ' (con ráfaga ' + g.filter(x => x.ok).length + '/' + g.length + ')' : '') + ' ' + (res.filter(x => x.ok).reduce((a, x) => a + x.t, 0) / Math.max(1, n)).toFixed(1) + 's';
    }
    out.push(mid.padEnd(7) + ' ' + c.nm.padEnd(16) + ' recto ' + row.recto.padEnd(26) + ' corrige ' + row.corrige.padEnd(26) + ' sujeta ' + row.sujeta);
  }
}
console.log(out.join('\n'));
