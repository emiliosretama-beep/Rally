// Entrada unificada: teclado + ratón, táctil (joystick, cámara y botones) y mando.
'use strict';

const Input = {
  keys: {}, mx: 0, my: 0, lookX: 0, lookY: 0,
  jump: false, grab: false, sprint: false, interact: false, pause: false,
  itemUse: -1, itemDrop: -1,
  touchGrabToggle: false, touchGrabOn: false, touchSprintOn: false,
  mouseGrab: false, isTouch: false, usingPad: false,
  joy: null, look: null, btnHeld: {},
  canvas: null,

  init(canvas) {
    this.canvas = canvas;
    this.isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    window.addEventListener('keydown', e => this._key(e, true));
    window.addEventListener('keyup', e => this._key(e, false));
    window.addEventListener('blur', () => this.releaseAll());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.releaseAll(); });
    canvas.addEventListener('mousedown', e => {
      // los toques generan eventos de ratón emulados: se ignoran
      if (this.lastPointer && this.lastPointer !== 'mouse') return;
      if (e.button === 0) {
        if (!this.isTouch && document.pointerLockElement !== canvas && Game.state === 'play') { try { canvas.requestPointerLock(); } catch (er) { /* */ } }
        this.mouseGrab = true;
      }
    });
    window.addEventListener('mouseup', e => { if (e.button === 0) this.mouseGrab = false; });
    window.addEventListener('mousemove', e => {
      if (document.pointerLockElement === canvas) { this.lookX += e.movementX * 0.0026; this.lookY += e.movementY * 0.0026; }
    });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    // Táctil sobre el lienzo: mitad izquierda = joystick, mitad derecha = cámara
    canvas.addEventListener('pointerdown', e => this._pDown(e));
    window.addEventListener('pointermove', e => this._pMove(e));
    window.addEventListener('pointerup', e => this._pUp(e));
    window.addEventListener('pointercancel', e => this._pUp(e));
  },

  _key(e, down) {
    const k = e.code;
    if (down && e.repeat) { if (k === 'Space' || k.startsWith('Digit')) return; }
    this.keys[k] = down;
    if (down) {
      if (k === 'Space') this.jump = true;
      if (k === 'KeyE') this.interact = true;
      // solo en partida: en los menús Esc es «volver» y no debe dejar una pausa pendiente
      if ((k === 'Escape' || k === 'KeyP') && Game.state === 'play') this.pause = true;
      const m = /^Digit([1-4])$/.exec(k);
      if (m) { if (e.shiftKey) this.itemDrop = +m[1] - 1; else this.itemUse = +m[1] - 1; }
    }
    if (Game.state === 'play' && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(k) >= 0) e.preventDefault();
    this.usingPad = false;
  },

  _pDown(e) {
    this.lastPointer = e.pointerType;
    if (e.pointerType === 'mouse') return;
    this.isTouch = true;
    const w = window.innerWidth;
    if (e.clientX < w * 0.45 && !this.joy) {
      this.joy = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY };
      UI.joyShow(true, e.clientX, e.clientY);
    } else if (!this.look) {
      this.look = { id: e.pointerId, x: e.clientX, y: e.clientY };
    }
    e.preventDefault();
  },
  _pMove(e) {
    if (this.joy && e.pointerId === this.joy.id) {
      this.joy.x = e.clientX; this.joy.y = e.clientY;
      const R = Math.min(70, window.innerWidth * 0.09);
      let dx = (e.clientX - this.joy.ox) / R, dy = (e.clientY - this.joy.oy) / R;
      const l = Math.hypot(dx, dy);
      if (l > 1) {
        // el centro sigue al dedo si se pasa del borde
        this.joy.ox = e.clientX - dx / l * R; this.joy.oy = e.clientY - dy / l * R;
        dx /= l; dy /= l;
      }
      this.joy.dx = dx; this.joy.dy = dy;
      UI.joyMove(this.joy.ox, this.joy.oy, dx, dy);
    } else if (this.look && e.pointerId === this.look.id) {
      const s = 0.0065;
      this.lookX += (e.clientX - this.look.x) * s; this.lookY += (e.clientY - this.look.y) * s;
      this.look.x = e.clientX; this.look.y = e.clientY;
    }
  },
  _pUp(e) {
    if (this.joy && e.pointerId === this.joy.id) { this.joy = null; UI.joyShow(false); }
    if (this.look && e.pointerId === this.look.id) this.look = null;
  },

  // Botones táctiles (los crea la UI)
  bindButton(el, name) {
    const down = e => {
      e.preventDefault(); e.stopPropagation();
      try { el.setPointerCapture(e.pointerId); } catch (er) { /* */ }
      this.btnHeld[name] = true;
      el.classList.add('on');
      if (name === 'jump') this.jump = true;
      if (name === 'interact') this.interact = true;
      if (name === 'grab' && this.touchGrabToggle) { this.touchGrabOn = !this.touchGrabOn; }
      if (name === 'sprint') { this.touchSprintOn = !this.touchSprintOn; }
      if (navigator.vibrate) { try { navigator.vibrate(8); } catch (er) { /* */ } }
    };
    const up = () => {
      this.btnHeld[name] = false;
      el.classList.remove('on');
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
  },

  releaseAll() {
    this.keys = {}; this.mouseGrab = false; this.btnHeld = {};
    this.joy = null; this.look = null; this.touchGrabOn = false;
    this.jump = this.interact = false;
    if (window.UI && UI.joyShow) UI.joyShow(false);
    document.querySelectorAll('.tbtn.on').forEach(b => b.classList.remove('on'));
  },

  _pad() {
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gps && Array.from(gps).find(g => g && g.connected);
    if (!gp) return null;
    const dz = v => Math.abs(v) < 0.15 ? 0 : v;
    const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed);
    const prev = this._padPrev || [];
    const edge = i => b(i) && !prev[i];
    const res = {
      mx: dz(gp.axes[0] || 0), my: -dz(gp.axes[1] || 0),
      lx: dz(gp.axes[2] || 0), ly: dz(gp.axes[3] || 0),
      jump: edge(0), interact: edge(2), pause: edge(9),
      grab: b(7) || b(5), sprint: b(6) || b(10),
      item: edge(12) ? 0 : edge(15) ? 1 : edge(13) ? 2 : edge(14) ? 3 : -1
    };
    this._padPrev = gp.buttons.map(x => x.pressed);
    if (res.mx || res.my || res.lx || res.ly || gp.buttons.some(x => x.pressed)) this.usingPad = true;
    return res;
  },

  // Lee y consume la entrada de este cuadro.
  poll(dt) {
    const k = this.keys;
    let mx = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
    let my = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
    if (this.joy && this.joy.dx !== undefined) { mx = this.joy.dx; my = -this.joy.dy; }
    let grab = this.mouseGrab || !!k.KeyF || (this.touchGrabToggle ? this.touchGrabOn : !!this.btnHeld.grab);
    let sprint = !!(k.ShiftLeft || k.ShiftRight) || this.touchSprintOn;
    let jump = this.jump, interact = this.interact, pause = this.pause;
    let itemUse = this.itemUse;
    const pad = this._pad();
    if (pad) {
      if (pad.mx || pad.my) { mx = pad.mx; my = pad.my; }
      this.lookX += pad.lx * dt * 3.2; this.lookY += pad.ly * dt * 2.4;
      jump = jump || pad.jump; interact = interact || pad.interact; pause = pause || pad.pause;
      grab = grab || pad.grab; sprint = sprint || pad.sprint;
      if (pad.item >= 0) itemUse = pad.item;
    }
    const out = { mx, my, jump, grab, sprint, interact, pause, itemUse, itemDrop: this.itemDrop, lookX: this.lookX, lookY: this.lookY };
    this.jump = this.interact = this.pause = false;
    this.itemUse = this.itemDrop = -1;
    this.lookX = this.lookY = 0;
    return out;
  }
};
