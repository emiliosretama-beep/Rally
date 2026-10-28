// Crash Lab: dibujo en canvas 2D. Solo lee el estado; no cambia la física.
var CL = window.CL || (window.CL = {});

CL.Render = (function () {
  var cv, g, W = 0, H = 0, dpr = 1;
  var cam = { x: 0, y: -200, zoom: 1, shake: 0 };
  var reduceShake = false;

  // Partículas con pool: no se crean objetos nuevos en el bucle
  var POOL = 260, parts = [];
  for (var i = 0; i < POOL; i++) parts.push({ on: false });

  function init(canvas) {
    cv = canvas; g = cv.getContext('2d');
    resize();
  }
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  }

  function spawn(type, x, y, vx, vy, life, size) {
    for (var i = 0; i < POOL; i++) {
      var p = parts[i];
      if (p.on) continue;
      p.on = true; p.type = type; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = life; p.max = life; p.size = size;
      return;
    }
  }
  function sparks(x, y, power) {
    var n = Math.min(26, 4 + power * 2) | 0;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, s = 2 + Math.random() * (3 + power * 0.6);
      spawn('spark', x, y, Math.cos(a) * s, Math.sin(a) * s - 2, 0.25 + Math.random() * 0.35, 2);
    }
    if (power > 6) for (var k = 0; k < 6; k++) spawn('dust', x, y, (Math.random() - 0.5) * 3, -Math.random() * 2, 0.8 + Math.random() * 0.6, 14);
  }
  function smoke(x, y, dark) {
    spawn(dark ? 'smokeDark' : 'smoke', x, y, (Math.random() - 0.5) * 0.8, -1 - Math.random(), 1.2 + Math.random() * 0.8, 10);
  }
  function flame(x, y) {
    spawn('flame', x, y, -2 - Math.random() * 2, (Math.random() - 0.5) * 1.2, 0.18, 7);
  }
  function addShake(a) { if (!reduceShake) cam.shake = Math.min(26, cam.shake + a); }

  function stepParticles(dt) {
    var f = dt * 60;
    for (var i = 0; i < POOL; i++) {
      var p = parts[i];
      if (!p.on) continue;
      p.life -= dt;
      if (p.life <= 0) { p.on = false; continue; }
      p.x += p.vx * f; p.y += p.vy * f;
      if (p.type === 'spark') p.vy += 0.35 * f;
      else { p.vx *= 0.97; p.vy *= 0.98; p.size += 0.35 * f; }
    }
  }

  function follow(target, vel, dt, portrait) {
    var look = 18;
    var tx = target.x + vel.x * look, ty = target.y + vel.y * look * 0.5 - 60;
    var k = 1 - Math.pow(0.0025, dt);
    cam.x += (tx - cam.x) * k;
    cam.y += (ty - cam.y) * k;
    // Ancho de mundo visible: más zoom out con la velocidad
    var speed = Math.hypot(vel.x, vel.y);
    var worldW = (portrait ? 760 : 1350) + Math.min(portrait ? 400 : 700, speed * 30);
    var z = W / worldW;
    if (H / z < 620) z = H / 620;
    cam.zoom += (z - cam.zoom) * (1 - Math.pow(0.05, dt));
    cam.shake *= Math.pow(0.004, dt);
  }
  function snap(x, y) { cam.x = x; cam.y = y - 60; cam.shake = 0; }

  function poly(verts) {
    g.beginPath();
    g.moveTo(verts[0].x, verts[0].y);
    for (var i = 1; i < verts.length; i++) g.lineTo(verts[i].x, verts[i].y);
    g.closePath();
  }

  function background() {
    var grd = g.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, '#1b1f27'); grd.addColorStop(1, '#2c313b');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
  }

  // Rejilla del laboratorio con parallax
  function labGrid() {
    var par = 0.5, step = 120 * cam.zoom * par;
    var ox = (-cam.x * cam.zoom * par) % step, oy = (-cam.y * cam.zoom * par) % step;
    g.strokeStyle = 'rgba(255,255,255,0.045)';
    g.lineWidth = 1;
    g.beginPath();
    for (var x = ox; x < W; x += step) { g.moveTo(x, 0); g.lineTo(x, H); }
    for (var y = oy; y < H; y += step) { g.moveTo(0, y); g.lineTo(W, y); }
    g.stroke();
  }

  function hazard(b) {
    var bb = b.bounds;
    g.save();
    poly(b.vertices); g.clip();
    g.fillStyle = '#e8b500';
    g.fillRect(bb.min.x, bb.min.y, bb.max.x - bb.min.x, bb.max.y - bb.min.y);
    g.fillStyle = '#16181c';
    for (var x = bb.min.x - (bb.max.y - bb.min.y); x < bb.max.x; x += 60) {
      g.beginPath();
      g.moveTo(x, bb.max.y); g.lineTo(x + 30, bb.max.y); g.lineTo(x + 30 + (bb.max.y - bb.min.y), bb.min.y); g.lineTo(x + (bb.max.y - bb.min.y), bb.min.y);
      g.closePath(); g.fill();
    }
    g.restore();
  }

  function drawStatic(b) {
    var k = b.kind;
    if (k === 'wall' || k === 'pillar') {
      poly(b.vertices); g.fillStyle = '#8a8f98'; g.fill();
      g.save(); poly(b.vertices); g.clip();
      g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 3;
      var bb = b.bounds;
      for (var y = bb.min.y; y < bb.max.y; y += 50) { g.beginPath(); g.moveTo(bb.min.x, y); g.lineTo(bb.max.x, y); g.stroke(); }
      g.restore();
      // franja de peligro en la cara
      var face = { vertices: [
        { x: b.bounds.min.x, y: b.bounds.min.y }, { x: b.bounds.min.x + 18, y: b.bounds.min.y },
        { x: b.bounds.min.x + 18, y: b.bounds.max.y }, { x: b.bounds.min.x, y: b.bounds.max.y }], bounds: null };
      face.bounds = { min: face.vertices[0], max: face.vertices[2] };
      hazard(face);
    } else if (k === 'ramp') {
      poly(b.vertices); g.fillStyle = '#5c6470'; g.fill();
      g.strokeStyle = '#e8b500'; g.lineWidth = 6; g.stroke();
    } else if (k === 'block') {
      poly(b.vertices); g.fillStyle = '#6b717b'; g.fill();
      g.strokeStyle = '#3b4048'; g.lineWidth = 4; g.stroke();
    } else {
      poly(b.vertices); g.fillStyle = k === 'pit' ? '#2a2e35' : '#41464f'; g.fill();
      // línea de la pista
      g.strokeStyle = k === 'pit' ? '#3a3f47' : '#c9ccd1'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(b.bounds.min.x, b.bounds.min.y + 2); g.lineTo(b.bounds.max.x, b.bounds.min.y + 2); g.stroke();
    }
  }

  function drawDynamic(b) {
    if (b.kind === 'crate') {
      poly(b.vertices); g.fillStyle = '#b07a3c'; g.fill();
      g.strokeStyle = '#6e4a20'; g.lineWidth = 3; g.stroke();
      var v = b.vertices;
      g.beginPath(); g.moveTo(v[0].x, v[0].y); g.lineTo(v[2].x, v[2].y); g.moveTo(v[1].x, v[1].y); g.lineTo(v[3].x, v[3].y);
      g.lineWidth = 2; g.stroke();
    } else if (b.kind === 'barrel') {
      g.beginPath(); g.arc(b.position.x, b.position.y, b.circleRadius, 0, Math.PI * 2);
      g.fillStyle = '#2f7dd1'; g.fill();
      g.strokeStyle = '#1b4f88'; g.lineWidth = 3; g.stroke();
      g.save(); g.translate(b.position.x, b.position.y); g.rotate(b.angle);
      g.fillStyle = '#e8b500'; g.fillRect(-14, -3, 28, 6);
      g.restore();
    }
  }

  function wheel(b) {
    var r = b.circleRadius;
    g.save(); g.translate(b.position.x, b.position.y); g.rotate(b.angle);
    g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fillStyle = '#15161a'; g.fill();
    g.beginPath(); g.arc(0, 0, r * 0.55, 0, Math.PI * 2); g.fillStyle = '#b9bec7'; g.fill();
    g.strokeStyle = '#6d727b'; g.lineWidth = 3;
    g.beginPath();
    for (var i = 0; i < 5; i++) { var a = i * Math.PI * 2 / 5; g.moveTo(0, 0); g.lineTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5); }
    g.stroke();
    g.restore();
  }

  // Pieza del auto: contorno abollado + oscurecido según daño
  function carPart(pos, ang, rd, dmg) {
    var pts = rd.outline, c = Math.cos(ang), s = Math.sin(ang);
    g.beginPath();
    for (var i = 0; i < pts.length; i++) {
      var x = pos.x + pts[i].x * c - pts[i].y * s, y = pos.y + pts[i].x * s + pts[i].y * c;
      if (i) g.lineTo(x, y); else g.moveTo(x, y);
    }
    g.closePath();
    g.fillStyle = rd.color; g.fill();
    if (dmg > 0.05) { g.fillStyle = 'rgba(20,12,8,' + Math.min(0.55, dmg * 0.6) + ')'; g.fill(); }
    g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 2; g.stroke();
    // detalles de la decoración (sin abollar, son calcomanías)
    g.save(); g.translate(pos.x, pos.y); g.rotate(ang);
    if (rd.kind === 'core') {
      g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(-70, -4, 140, 5);
      g.fillStyle = '#ffd23f'; g.fillRect(66, -12, 7, 7);           // faro
      g.fillStyle = '#ff4d4d'; g.fillRect(-73, -12, 5, 7);          // calavera
    } else if (rd.kind === 'cabin') {
      g.fillStyle = 'rgba(120,180,230,0.85)';
      g.beginPath(); g.moveTo(8, -10); g.lineTo(28, -10); g.lineTo(38, 8); g.lineTo(8, 8); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(-30, -10); g.lineTo(2, -10); g.lineTo(2, 8); g.lineTo(-40, 8); g.closePath(); g.fill();
      g.fillStyle = '#d7263d'; g.font = 'bold 12px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('07', -14, 4);
    }
    g.restore();
  }

  function drawCar(car) {
    var ch = car.chassis, ang = ch.angle;
    car.wheels.forEach(function (w) { if (w.attached) wheel(w.body); });
    for (var k in car.parts) {
      var p = car.parts[k];
      if (!p.attached) continue;
      carPart(p.body.position, ang, p.render, 1 - Math.max(0, p.hp) / p.max);
    }
  }

  function drawDebris(car) {
    car.debris.forEach(function (b) {
      if (b.carRender.kind === 'wheel') wheel(b);
      else carPart(b.position, b.angle + b.carRender.off, b.carRender, 0.6);
    });
  }

  function drawParticles() {
    for (var i = 0; i < POOL; i++) {
      var p = parts[i];
      if (!p.on) continue;
      var t = p.life / p.max;
      if (p.type === 'spark') {
        g.strokeStyle = 'rgba(255,' + (180 + 60 * t | 0) + ',60,' + t + ')';
        g.lineWidth = 2;
        g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 2, p.y - p.vy * 2); g.stroke();
      } else if (p.type === 'flame') {
        g.fillStyle = 'rgba(80,170,255,' + t + ')';
        g.beginPath(); g.arc(p.x, p.y, p.size * t + 2, 0, Math.PI * 2); g.fill();
      } else {
        var col = p.type === 'smokeDark' ? '30,30,34' : (p.type === 'dust' ? '170,160,145' : '140,140,148');
        g.fillStyle = 'rgba(' + col + ',' + (0.45 * t) + ')';
        g.beginPath(); g.arc(p.x, p.y, p.size, 0, Math.PI * 2); g.fill();
      }
    }
  }

  function frame(world, level, car, crane) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    background();
    labGrid();
    var sx = (Math.random() - 0.5) * cam.shake, sy = (Math.random() - 0.5) * cam.shake;
    g.save();
    g.translate(W / 2 + sx, H / 2 + sy);
    g.scale(cam.zoom, cam.zoom);
    g.translate(-cam.x, -cam.y);
    if (crane) {
      g.strokeStyle = '#c9ccd1'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(crane.x, crane.y); g.lineTo(car.chassis.position.x, car.chassis.position.y - 20); g.stroke();
      g.fillStyle = '#e8b500'; g.fillRect(crane.x - 60, crane.y - 26, 120, 26);
    }
    level.statics.forEach(drawStatic);
    level.dynamics.forEach(drawDynamic);
    drawDebris(car);
    drawCar(car);
    drawParticles();
    g.restore();
  }

  return { init: init, resize: resize, frame: frame, follow: follow, snap: snap, sparks: sparks, smoke: smoke, flame: flame,
    addShake: addShake, stepParticles: stepParticles, setReduceShake: function (v) { reduceShake = v; },
    size: function () { return { w: W, h: H }; }, canvas: function () { return cv; } };
})();
