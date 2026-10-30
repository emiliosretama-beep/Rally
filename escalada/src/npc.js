// Escaladores de la IA: otros miembros de la expedición que suben la ruta por su cuenta.
// Siguen el camino que dejó el constructor de la ruta (caminar, escalera, cuerda fija, pared,
// salto), descansan en los campamentos y esperan si alguien les tapa el paso. Sin Three.js.
'use strict';

const NPC_NAMES = ['Nima', 'Ana', 'Dawa', 'Lucía', 'Pemba', 'Tomás', 'Kami'];
// metros por segundo de cada forma de avanzar
// lugares de espera alrededor del punto de descanso (a los lados y adelante/atrás)
const NPC_WAIT_SPOTS = [[0, 0], [0.4, 1.5], [-0.3, -1.5], [1.0, 0.2]];
const NPC_SPEED = { walk: 1.45, ladder: 0.55, jumar: 0.62, climb: 0.55, mantle: 0.8, jump: 2.6, rest: 1.2 };

function Expedition(world, startCamp, count, seed) {
  this.w = world;
  this.list = [];
  const P = world.npcPath, rng = U.rng(seed || 1234);
  let i0 = P.findIndex(n => n.mode === 'rest' && n.camp === startCamp);
  if (i0 < 0) i0 = 0;
  this.endI = P.length - 1;
  for (let k = 0; k < count; k++) {
    // salen escalonados: unos ya van adelante, otros salen después que tú
    const ahead = k < 2 ? 6 + k * 9 : 0;
    const n = { i: Math.min(this.endI - 1, i0 + ahead), t: 0, x: P[i0].x, y: P[i0].y, z: P[i0].z, yaw: 0, mode: 'rest', wait: ahead ? 0 : 4 + (k - 2) * 11 + rng() * 5,
      sp: 0.85 + rng() * 0.3, anim: rng() * 6, variant: k % 3, name: NPC_NAMES[k % NPC_NAMES.length], lat: (rng() - 0.5) * 0.5, said: {}, done: false };
    const a = P[n.i];
    n.x = a.x; n.y = a.y; n.z = a.z; n.ox = 0; n.oz = 0;
    // los que esperan en la salida no se enciman: cada quien en su lugar junto al farol
    if (!ahead && a.dir !== undefined) {
      const [la, fw] = NPC_WAIT_SPOTS[(k - 2) % NPC_WAIT_SPOTS.length];
      n.ox = Math.cos(a.dir) * la + Math.sin(a.dir) * fw; n.oz = -Math.sin(a.dir) * la + Math.cos(a.dir) * fw;
      n.x += n.ox; n.z += n.oz; n.y = world.groundBelow(n.x, a.y + 1.2, n.z);
    }
    this.list.push(n);
  }
}

Expedition.prototype.update = function (dt, player) {
  const P = this.w.npcPath, pp = player && player.pos;
  for (const n of this.list) {
    if (n.wait > 0) { n.wait -= dt; n.moving = false; continue; }
    if (n.i >= this.endI) {
      if (!n.done) this._summitSpot(n);
      n.done = true; n.moving = false; n.mode = 'summit'; n.anim += dt * 2; continue;
    }
    const a = P[n.i], b = P[n.i + 1];
    // no encimarse con el de adelante, ni con el jugador
    let blocked = false;
    for (const o of this.list) if (o !== n && !o.done && (o.i > n.i || (o.i === n.i && o.t > n.t)) && o.i - n.i < 4 && Math.hypot(o.x - n.x, o.y - n.y, o.z - n.z) < 2.2) { blocked = true; break; }
    if (!blocked && pp && b.mode !== 'climb' && Math.hypot(pp.x - n.x, pp.z - n.z) < 1.2 && Math.abs(pp.y - n.y) < 2 && ((pp.x - n.x) * (b.x - a.x) + (pp.z - n.z) * (b.z - a.z)) > 0) blocked = true;
    if (blocked) { n.moving = false; continue; }
    const d = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) || 0.01;
    const sp = (NPC_SPEED[b.mode] || 1.2) * n.sp;
    n.t += sp * dt / d;
    n.moving = true;
    if (n.t >= 1) {
      n.i++; n.t = 0;
      const c = P[n.i];
      if (c.mode === 'rest') n.wait = 7 + Math.random() * 12;
      // de vez en cuando se detienen a tomar aire
      else if (Math.random() < 0.025) n.wait = 1 + Math.random() * 2;
      continue;
    }
    const t = n.t;
    // al salir de su lugar de espera vuelven al camino poco a poco
    if (n.ox || n.oz) { const k = Math.max(0, 1 - dt * 0.7); n.ox *= k; n.oz *= k; if (Math.abs(n.ox) + Math.abs(n.oz) < 0.01) n.ox = n.oz = 0; }
    n.x = U.lerp(a.x, b.x, t) + n.ox; n.z = U.lerp(a.z, b.z, t) + n.oz;
    n.y = U.lerp(a.y, b.y, t) + (b.mode === 'jump' ? Math.sin(t * Math.PI) * 0.9 : 0);
    n.mode = b.mode === 'rest' ? 'walk' : b.mode;
    const yawT = (b.mode === 'climb' && b.yaw !== undefined) ? b.yaw : Math.atan2(b.x - a.x, b.z - a.z);
    n.yaw += U.angDiff(n.yaw, yawT) * Math.min(1, dt * 6);
    n.anim += sp * dt * (b.mode === 'walk' ? 2.6 : 3.2);
  }
};

// En la cumbre cada quien se hace a un lado para no tapar a los que vienen atrás
Expedition.prototype._summitSpot = function (n) {
  const P = this.w.npcPath, e = P[this.endI], k = this.list.filter(o => o.done).length;
  const a = 0.6 + [0, 3, 1, 4, 2, 5][k % 6] * Math.PI / 3, rr = k < 6 ? 1.5 : 2.6;
  const x = e.x + Math.cos(a) * rr, z = e.z + Math.sin(a) * rr;
  const y = this.w.groundBelow(x, e.y + 1.5, z);
  if (Math.abs(y - e.y) < 0.7) { n.x = x; n.y = y; n.z = z; }
  n.yaw = Math.atan2(e.x - n.x, e.z - n.z) + Math.PI;
};

// Alguien de la expedición descansando cerca de este punto (para saludar en los campamentos)
Expedition.prototype.restingNear = function (x, y, z, r) {
  for (const n of this.list) if (n.wait > 0 && Math.hypot(n.x - x, n.z - z) < r && Math.abs(n.y - y) < 3) return n;
  return null;
};
