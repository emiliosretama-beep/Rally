// ¿Se puede hacer trampa caminando por fuera de la ruta?
// 1) Desde cada fogata se intenta trepar la ladera hacia la cumbre (debe subir poco).
// 2) Se intenta llegar a la fogata siguiente por fuera de los barrancos (no debe poder).
// Uso: node tests/atajos.js <volcano|k2>
require('./load')();
{
const mid = process.argv[2] || 'volcano';
const w = new World(mid);
const top = w.summit, out = [];
w.checkpoints.forEach((c, ci) => {
  if (c.summit) return;
  const next = w.checkpoints[ci + 1];
  let best = -1e9, bestDir = '';
  for (let a = 0; a < 16; a++) {
    const ang = a / 16 * Math.PI * 2;
    const p = new Player(w);
    const sx = c.x + Math.sin(ang) * 9, sz = c.z + Math.cos(ang) * 9;
    if (w.gorgeAt(sx, sz)) continue;           // dentro de un barranco: eso es la ruta
    p.reset(sx, w.groundBelow(sx, c.y + 20, sz), sz, ang);
    let maxY = p.pos.y, t = 0;
    const dt = 1 / 60;
    for (let k = 0; k < 60 * 40; k++) {
      t += dt; w.update(dt);
      // hacia la cumbre, con algo de zigzag para buscar rampas
      const hd = Math.atan2(top.x - p.pos.x, top.z - p.pos.z) + Math.sin(t * 0.7 + a) * 0.9;
      p.step(dt, { mx: 0, my: 1, jump: k % 45 === 0, grab: true, sprint: true }, hd, { cold: 0 });
      // si se mete en un barranco (eso ya es la ruta normal), se descarta
      if (w.gorgeAt(p.pos.x, p.pos.z)) break;
      maxY = Math.max(maxY, p.pos.y);
    }
    if (maxY - c.y > best) { best = maxY - c.y; bestDir = a; }
  }
  out.push('fogata ' + ci + ' (y ' + c.y.toFixed(0) + ', siguiente ' + (next.y - c.y).toFixed(0) + ' m más arriba): subió como máximo ' + best.toFixed(1) + ' m');
});
console.log(mid + '\n' + out.join('\n'));
}
for (const mid of [process.argv[2] || 'volcano']) {
  const w = new World(mid), out = [];
  for (let ci = 0; ci < w.checkpoints.length - 1; ci++) {
    const c = w.checkpoints[ci], n = w.checkpoints[ci + 1];
    let best = 1e9, reached = false, how = '';
    for (let a = 0; a < 24 && !reached; a++) {
      const off = (a / 24 - 0.5) * 2.6;           // salir hacia distintos lados y luego ir a la fogata
      const p = new Player(w), base = Math.atan2(n.x - c.x, n.z - c.z) + off;
      const sx = c.x + Math.sin(base) * 6, sz = c.z + Math.cos(base) * 6;
      p.reset(sx, w.groundBelow(sx, c.y + 10, sz), sz, base);
      let inG = 0;
      for (let k = 0; k < 60 * 75; k++) {
        w.update(1 / 60);
        const t = k / 60, toN = Math.atan2(n.x - p.pos.x, n.z - p.pos.z);
        const hd = t < 6 ? base : toN + Math.sin(t * 0.5 + a) * 0.8;
        p.step(1 / 60, { mx: 0, my: 1, jump: k % 50 === 0, grab: true, sprint: true }, hd, { cold: 0 });
        if (w.gorgeAt(p.pos.x, p.pos.z)) { inG++; if (inG > 30) break; } else inG = 0;   // por dentro del barranco = ruta normal
        const d = Math.hypot(n.x - p.pos.x, n.z - p.pos.z);
        best = Math.min(best, d + Math.max(0, Math.abs(n.y - p.pos.y) - 2.5) * 3);
        if (d < 6 && Math.abs(n.y - p.pos.y) < 2.5 && p.grounded) { reached = true; how = 'salida ' + (off * 57).toFixed(0) + '°, ' + t.toFixed(0) + ' s'; break; }
      }
    }
    out.push('fogata ' + ci + ' → ' + (ci + 1) + ': ' + (reached ? 'SE LLEGA POR FUERA (' + how + ')' : 'no se llega (lo más cerca: ' + best.toFixed(0) + ')'));
  }
  console.log(mid + '\n  ' + out.join('\n  '));
}

// 3) Desde cada fogata, rodear por fuera el barranco que empieza ahí y meterse a medio camino
//    (más allá de su primer desafío). No debe poder.
{
  const mid = process.argv[2] || 'volcano', w = new World(mid), out = [];
  for (let gi = 0; gi < w.gorges.length; gi++) {
    const c = w.checkpoints[gi], g = w.gorges[gi];
    const first = w.challenges.find(q => q.tramo === gi);
    let sFirst = 0, bd = 1e9;
    g.samples.forEach(q => { const d = Math.hypot(q.x - first.x, q.z - first.z); if (d < bd) { bd = d; sFirst = q.s; } });
    let worst = null;
    const S = g.samples.length;
    for (const fr of [0.25, 0.4, 0.55, 0.7, 0.85]) for (const side of [-1, 1]) for (let a = 0; a < 4; a++) {
      const q = g.samples[Math.floor(S * fr)], Lx = Math.cos(q.ang), Lz = -Math.sin(q.ang);
      const p = new Player(w), ang0 = (a / 4) * Math.PI * 2 + 0.4;
      const sx = c.x + Math.sin(ang0) * 9, sz = c.z + Math.cos(ang0) * 9;
      if (w.gorgeAt(sx, sz)) continue;
      p.reset(sx, w.groundBelow(sx, c.y + 20, sz), sz, ang0);
      let t = 0, offT = 0, far = false;
      for (let k = 0; k < 60 * 45; k++) {
        t += 1 / 60; w.update(1 / 60);
        const tx = t < 25 ? q.x + Lx * side * 20 : q.x, tz = t < 25 ? q.z + Lz * side * 20 : q.z;
        const hd = Math.atan2(tx - p.pos.x, tz - p.pos.z) + Math.sin(t * 0.9 + a) * 0.5;
        p.step(1 / 60, { mx: 0, my: 1, jump: k % 40 === 0, grab: true, sprint: true }, hd, { cold: 0 });
        const vi = w._vi(p.pos.x, p.pos.z);
        // en la montaña nevada, 3 s fuera del camino marcado te devuelven a la reunión
        if (w.offRoute && w.offRoute(p.pos.x, p.pos.z)) { offT += 1 / 60; if (offT > 3) break; } else offT = 0;
        // ¿anduvo lejos del camino (más de 6 m) a la altura del desafío? (caminar por el lomo de una arista
        // a unos metros del centro no es saltársela)
        if (w.gIdx[vi] === gi && w.gS[vi] > sFirst && Math.abs(w.gLat[vi]) > w.gorgeW(g, w.gS[vi]) + 6) far = true;
        // cuenta el punto donde se mete al camino (aunque vaya colgado de una cuerda): si es más allá
        // del inicio del primer desafío y venía de lejos, se lo saltó
        if (w.gmap[vi] === gi + 1) {
          const s = w.gS[vi];
          if (far && s > sFirst + 5 && (!worst || s > worst.s)) worst = { s: +s.toFixed(1), y: +p.pos.y.toFixed(1) };
          break;
        }
        if (w.gmap[vi] && w.gmap[vi] !== gi + 1) break;
      }
    }
    out.push('barranco ' + gi + ': ' + (worst ? 'SE ENTRA POR FUERA a medio camino (s=' + worst.s + ', y ' + worst.y + ')' : 'no se entra por fuera'));
  }
  console.log(mid + ' (entrar a medio barranco)\n  ' + out.join('\n  '));
}
