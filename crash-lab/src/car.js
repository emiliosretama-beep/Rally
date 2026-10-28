// Crash Lab: el auto. Un cuerpo compuesto (chasis + piezas) y dos llantas con suspensión.
// Cada pieza tiene vida; al llegar a 0 se separa del compuesto y sale volando como pieza suelta.
// Las abolladuras son solo visuales: se deforma el contorno dibujado, no el colisionador.
var CL = window.CL || (window.CL = {});

(function () {
  var M = Matter, Bodies = M.Bodies, Body = M.Body, Composite = M.Composite,
      Constraint = M.Constraint, Vertices = M.Vertices;

  var PART_HP = { core: 140, cabin: 70, hood: 38, bumperF: 30, bumperR: 30, spoiler: 16, wheel: 45 };
  var COLORS = { core: '#d7263d', cabin: '#f2f2f2', hood: '#b81e33', bumperF: '#2b2d31', bumperR: '#2b2d31', spoiler: '#2b2d31' };

  // Contorno subdividido para poder abollarlo con detalle
  function outlineFrom(vertices, center, step) {
    var out = [];
    for (var i = 0; i < vertices.length; i++) {
      var a = vertices[i], b = vertices[(i + 1) % vertices.length];
      var len = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(len / step));
      for (var k = 0; k < n; k++) {
        var x = a.x + (b.x - a.x) * k / n - center.x, y = a.y + (b.y - a.y) * k / n - center.y;
        out.push({ x: x, y: y, ox: x, oy: y });
      }
    }
    return out;
  }

  function createCar(world, x, y, save) {
    var group = Body.nextGroup(true);
    var opt = function (extra) {
      return Object.assign({ collisionFilter: { group: group }, friction: 0.45, density: 0.0016, restitution: 0.05 }, extra || {});
    };
    var defs = [
      ['core', Bodies.rectangle(x, y, 150, 30, opt())],
      ['cabin', Bodies.trapezoid(x - 6, y - 29, 94, 28, 0.42, opt({ density: 0.0008 }))],
      ['hood', Bodies.rectangle(x + 50, y - 19, 46, 8, opt())],
      ['bumperF', Bodies.rectangle(x + 80, y + 3, 12, 20, opt())],
      ['bumperR', Bodies.rectangle(x - 80, y + 3, 12, 20, opt())],
      ['spoiler', Bodies.rectangle(x - 62, y - 20, 30, 8, opt({ density: 0.0008 }))]
    ];
    var parts = {}, list = [];
    defs.forEach(function (d) {
      var name = d[0], b = d[1];
      b.carPart = name;
      var max = PART_HP[name];
      parts[name] = { name: name, body: b, hp: max, max: max, attached: true,
        render: { outline: outlineFrom(b.vertices, b.position, 7), color: COLORS[name], kind: name, off: 0 } };
      list.push(b);
    });
    var chassis = Body.create({ parts: list, collisionFilter: { group: group }, frictionAir: 0.002, friction: 0.45 });
    chassis.isCar = true;

    var wheels = [-52, 52].map(function (dx, i) {
      var w = Bodies.circle(x + dx, y + 22, 21, { collisionFilter: { group: group }, friction: 1.1, frictionStatic: 6, density: 0.0022, restitution: 0.1 });
      w.carPart = 'wheel';
      w.isCar = true;
      var c = Constraint.create({ bodyA: chassis, pointA: { x: x + dx - chassis.position.x, y: y + 22 - chassis.position.y },
        bodyB: w, stiffness: 0.4, damping: 0.18, length: 0 });
      var max = PART_HP.wheel;
      return { name: 'wheel', idx: i, body: w, constraint: c, hp: max, max: max, attached: true, contact: 0 };
    });

    Composite.add(world, [chassis].concat(wheels.map(function (w) { return w.body; }), wheels.map(function (w) { return w.constraint; })));

    var car = {
      world: world, group: group, chassis: chassis, parts: parts, wheels: wheels,
      debris: [], pending: [], dead: false, nitroFuel: save.nitro ? CL.TUNING.nitroFuel : 0,
      motorLevel: save.motor, lost: [], maxImpact: 0
    };
    return car;
  }

  function pointVel(body, p) {
    var v = Body.getVelocity(body), w = Body.getAngularVelocity(body);
    var rx = p.x - body.position.x, ry = p.y - body.position.y;
    return { x: v.x - w * ry, y: v.y + w * rx };
  }

  function partOf(car, b) {
    if (b.carPart === 'wheel') {
      for (var i = 0; i < car.wheels.length; i++) if (car.wheels[i].body === b && car.wheels[i].attached) return car.wheels[i];
      return null;
    }
    if (b.carPart && b.parent === car.chassis) return car.parts[b.carPart];
    return null;
  }

  // Se llama desde collisionStart. Devuelve info del golpe (para chispas, sonido y cámara) o null.
  function onCollision(car, pair) {
    var a = pair.bodyA, b = pair.bodyB;
    var pa = partOf(car, a), pb = partOf(car, b);
    if (!pa && !pb) return null;
    var mine = pa ? a : b, other = pa ? b : a, part = pa || pb;
    var sup = pair.collision.supports && pair.collision.supports[0];
    var cp = sup ? { x: sup.x, y: sup.y } : { x: mine.position.x, y: mine.position.y };
    var n = pair.collision.normal;
    var vm = pointVel(mine.parent, cp), vo = pointVel(other.parent, cp);
    var impact = Math.abs((vm.x - vo.x) * n.x + (vm.y - vo.y) * n.y);
    var T = CL.TUNING;
    // Las llantas absorben golpes (suspensión): necesitan un impacto mayor para dañarse
    var minImpact = T.impactMin + (part.name === 'wheel' ? T.wheelExtraMin : 0);
    if (impact < minImpact || car.invuln) return { point: cp, normal: n, impact: impact, dmg: 0 };
    var carMass = car.chassis.mass;
    var massFactor = other.parent.isStatic ? 1 : Math.min(1, 2 * other.parent.mass / carMass);
    var dmg = Math.pow(impact - minImpact, T.impactPow) * T.damageMul * massFactor;
    applyDamage(car, part, dmg, cp);
    if (impact > car.maxImpact) car.maxImpact = impact;
    return { point: cp, normal: n, impact: impact, dmg: dmg };
  }

  function applyDamage(car, part, dmg, cp) {
    if (!part.attached) return;
    part.hp -= dmg;
    if (part.name !== 'core') {
      var core = car.parts.core;
      core.hp -= dmg * CL.TUNING.coreShare;
      dent(car, core, cp, dmg * CL.TUNING.coreShare);
    }
    if (part.render) dent(car, part, cp, dmg);
    if (part.hp <= 0 && part.name !== 'core' && car.pending.indexOf(part) < 0) car.pending.push(part);
    if (car.parts.core.hp <= 0) car.dead = true;
  }

  // Empuja el contorno hacia el centro de la pieza cerca del punto de impacto
  function dent(car, part, cp, dmg) {
    var b = part.body, ang = car.chassis.angle;
    var dx = cp.x - b.position.x, dy = cp.y - b.position.y;
    var c = Math.cos(-ang), s = Math.sin(-ang);
    var lx = dx * c - dy * s, ly = dx * s + dy * c;
    var amt = Math.min(9, dmg * 0.3), R = 28;
    var pts = part.render.outline;
    for (var i = 0; i < pts.length; i++) {
      var q = pts[i], d = Math.hypot(q.x - lx, q.y - ly);
      if (d >= R) continue;
      var f = 1 - d / R, len = Math.hypot(q.x, q.y) || 1;
      var minLen = Math.hypot(q.ox, q.oy) * 0.45;
      var nl = Math.max(minLen, len - amt * f);
      q.x = q.x / len * nl; q.y = q.y / len * nl;
    }
  }

  // Separa las piezas marcadas. Se llama después de Engine.update, nunca dentro de un evento.
  function processDetach(car, onDetach) {
    while (car.pending.length) {
      var part = car.pending.shift();
      if (!part.attached) continue;
      if (part.name === 'wheel') detachWheel(car, part); else detachPart(car, part);
      car.lost.push(part.name);
      if (onDetach) onDetach(part);
    }
  }

  function detachPart(car, part) {
    var ch = car.chassis, b = part.body;
    var v = Body.getVelocity(ch), w = Body.getAngularVelocity(ch);
    var pv = pointVel(ch, b.position);
    var anchors = car.wheels.map(function (wh) {
      return { x: ch.position.x + wh.constraint.pointA.x, y: ch.position.y + wh.constraint.pointA.y };
    });
    var ang = ch.angle;
    // autoHull = false: en Matter 0.19, setParts con autoHull desplaza el contorno del padre cuando el cuerpo
    // no está en el origen, y la detección amplia deja de ver el suelo (el auto lo atravesaba).
    // El contorno viejo sigue siendo válido como caja envolvente; los choques reales usan cada pieza.
    Body.setParts(ch, ch.parts.slice(1).filter(function (p) { return p !== b; }), false);
    Body.setVelocity(ch, v);
    Body.setAngularVelocity(ch, w);
    car.wheels.forEach(function (wh, i) {
      wh.constraint.pointA = { x: anchors[i].x - ch.position.x, y: anchors[i].y - ch.position.y };
    });
    part.attached = false;

    var verts = b.vertices.map(function (p) { return { x: p.x, y: p.y }; });
    var loose = Body.create({ position: Vertices.centre(verts), vertices: verts, collisionFilter: { group: car.group },
      friction: 0.5, density: 0.0016, restitution: 0.15, frictionAir: 0.004 });
    // Empujón hacia afuera del auto para que se note que salió volando
    var ox = loose.position.x - ch.position.x, oy = loose.position.y - ch.position.y, ol = Math.hypot(ox, oy) || 1;
    Body.setVelocity(loose, { x: pv.x + ox / ol * 3, y: pv.y + oy / ol * 3 - 2 });
    Body.setAngularVelocity(loose, (Math.random() - 0.5) * 0.4);
    loose.carRender = Object.assign({}, part.render, { off: ang });
    Composite.add(car.world, loose);
    car.debris.push(loose);
  }

  function detachWheel(car, wh) {
    Composite.remove(car.world, wh.constraint);
    wh.attached = false;
    var b = wh.body;
    Body.setVelocity(b, { x: b.velocity.x + (Math.random() - 0.5) * 4, y: b.velocity.y - 3 });
    b.carRender = { kind: 'wheel' };
    car.debris.push(b);
  }

  // input: { gas, brake, nitro }. Se llama una vez por subpaso.
  // dtSim: segundos de simulación del subpaso (combustible del nitro); sub: fracción de 1/60 s que dura el subpaso.
  function drive(car, input, dtSim, sub) {
    var T = CL.TUNING, ch = car.chassis;
    var grounded = car.wheels.some(function (w) { return w.attached && w.contact > 0; });
    car.wheels.forEach(function (w) { if (w.contact > 0) w.contact--; });
    if (car.dead) return { grounded: grounded, load: 0 };
    var spin = T.motorSpin[Math.max(0, Math.min(2, car.motorLevel - 1))];
    var fwd = Body.getVelocity(ch).x * Math.cos(ch.angle) + Body.getVelocity(ch).y * Math.sin(ch.angle);
    var target = null, accel = T.motorAccel * sub;
    if (input.gas) target = spin;
    else if (input.brake) { target = fwd > 1.5 ? 0 : T.brakeSpin; if (fwd > 1.5) accel = T.motorAccel * 2; }
    if (target !== null) {
      car.wheels.forEach(function (w) {
        if (!w.attached) return;
        var av = Body.getAngularVelocity(w.body);
        var d = Math.max(-accel, Math.min(accel, target - av));
        Body.setAngularVelocity(w.body, av + d);
      });
    }
    if (!grounded && (input.gas || input.brake)) {
      var aw = Body.getAngularVelocity(ch);
      var dir = input.gas ? -1 : 1;
      Body.setAngularVelocity(ch, Math.max(-0.12, Math.min(0.12, aw + dir * T.airTorque * sub)));
    }
    if (input.nitro && car.nitroFuel > 0) {
      // Cambio directo de velocidad: no depende del tamaño del paso como applyForce
      var v = Body.getVelocity(ch), a = T.nitroAccel * sub;
      Body.setVelocity(ch, { x: v.x + Math.cos(ch.angle) * a, y: v.y + Math.sin(ch.angle) * a });
      car.nitroFuel = Math.max(0, car.nitroFuel - dtSim);
      car.nitroOn = true;
    } else car.nitroOn = false;
    return { grounded: grounded, load: input.gas ? 1 : 0 };
  }

  function damageValue(car) {
    var V = CL.PART_VALUE, total = 0;
    for (var k in car.parts) {
      var p = car.parts[k];
      total += V[k] * (p.attached ? Math.min(1, Math.max(0, (p.max - p.hp) / p.max)) : 1);
    }
    car.wheels.forEach(function (w) {
      total += V.wheel * (w.attached ? Math.min(1, Math.max(0, (w.max - w.hp) / w.max)) : 1);
    });
    return total;
  }

  function remove(car) {
    var all = [car.chassis].concat(car.wheels.map(function (w) { return w.body; }), car.debris);
    all.forEach(function (b) { Composite.remove(car.world, b); });
    car.wheels.forEach(function (w) { if (w.attached) Composite.remove(car.world, w.constraint); });
  }

  CL.Car = { create: createCar, onCollision: onCollision, processDetach: processDetach, drive: drive,
    damageValue: damageValue, remove: remove, partOf: partOf };
})();
