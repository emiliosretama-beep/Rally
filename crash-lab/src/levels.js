// Crash Lab: las pruebas. Cada una arma sus cuerpos estáticos y los objetos sueltos.
// Coordenadas en px (40 px = 1 m). El suelo base está en y = 0 y la y crece hacia abajo.
var CL = window.CL || (window.CL = {});

(function () {
  var Bodies = Matter.Bodies, Composite = Matter.Composite;
  var STATIC = { isStatic: true, friction: 0.9, restitution: 0 };

  function slab(x1, x2, top, depth, kind) {
    var b = Bodies.rectangle((x1 + x2) / 2, top + depth / 2, x2 - x1, depth, STATIC);
    b.kind = kind || 'ground';
    return b;
  }
  function crate(x, y, s) {
    var b = Bodies.rectangle(x, y, s, s, { friction: 0.6, density: 0.0005, restitution: 0.05 });
    b.kind = 'crate';
    return b;
  }
  function barrel(x, y) {
    var b = Bodies.circle(x, y, 20, { friction: 0.4, density: 0.0009, restitution: 0.2 });
    b.kind = 'barrel';
    return b;
  }
  function stack(list, x, cols, rows, s) {
    for (var r = 0; r < rows; r++)
      for (var c = 0; c < cols; c++) list.push(crate(x + c * (s + 1), -s / 2 - r * (s + 1), s));
  }

  var LEVELS = {
    wall: function () {
      var st = [slab(-800, 3200, 0, 400), slab(-800, -600, -900, 900, 'wall'), slab(2300, 2560, -700, 700, 'wall')];
      var dyn = [];
      // Camino limpio: cajas o barriles terminaban empujados contra el muro y absorbían el golpe
      return { statics: st, dynamics: dyn, spawn: { x: 0, y: -46 }, goalX: 2300 };
    },
    ramp: function () {
      // fromVertices coloca el centroide del triángulo en (x, y)
      var ramp = Bodies.fromVertices((900 + 1350 + 1350) / 3, -70, [[{ x: 900, y: 0 }, { x: 1350, y: 0 }, { x: 1350, y: -210 }]], STATIC);
      ramp.kind = 'ramp';
      var st = [ramp, slab(-800, 1350, 0, 400), slab(-800, -600, -900, 900, 'wall'), slab(1350, 1780, 320, 300, 'pit'),
        slab(1780, 3600, 0, 400), slab(3000, 3260, -700, 700, 'wall')];
      var dyn = [];
      stack(dyn, 2250, 4, 3, 44);
      stack(dyn, 2700, 2, 5, 44);
      return { statics: st, dynamics: dyn, spawn: { x: 0, y: -46 }, goalX: 3000 };
    },
    drop: function () {
      var st = [slab(-1200, 1600, 0, 400), slab(-1200, -1000, -1400, 1400, 'wall'), slab(1400, 1600, -1400, 1400, 'wall'),
        // Bloque central ancho (un poste delgado atravesaba el auto a alta velocidad)
        slab(-10, 150, -140, 140, 'pillar'), slab(-420, -260, -60, 60, 'block'), slab(300, 520, -90, 90, 'block')];
      var dyn = [];
      stack(dyn, -180, 2, 2, 44);
      stack(dyn, 620, 3, 3, 44);
      dyn.push(barrel(180, -20), barrel(222, -20));
      return { statics: st, dynamics: dyn, spawn: { x: 40, y: -1000 }, crane: { x: 40, y: -1140 }, goalX: null };
    }
  };

  CL.Levels = {
    ids: ['wall', 'ramp', 'drop'],
    build: function (world, id) {
      var lv = LEVELS[id]();
      lv.id = id;
      Composite.add(world, lv.statics.concat(lv.dynamics));
      return lv;
    }
  };
})();
