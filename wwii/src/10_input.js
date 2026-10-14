// ===== FRENTE 44 · entrada: teclado y ratón (bloqueo del puntero), mando y táctil -> Input.cmd =====
// Input.update(dt) una vez por fotograma de render ACUMULA en Input.cmd (giros sumados, flancos con OR); Game usa el comando en el
// primer paso fijo del fotograma y llama a Input.consume() (borra giros y flancos). Así no se pierde nada aunque un fotograma no tenga pasos.
// Campos: mx, mz (-1..1: derecha, adelante) · lookX (rad, >0 gira a la DERECHA) · lookY (rad, >0 mira ARRIBA) · aimAssist 0..1
//  mantenidos: fire, ads, sprint, grenade, use · flancos (un paso): fireDown, adsDown, reload, jump, crouch (alterna), grenadeDown,
//  melee, useDown, swap, next, prev, pause, slot (0 | 1..3)
// Ayuda al apuntar (mando y táctil): Input añade un leve «imán» hacia el enemigo más cercano a la retícula mientras el jugador mueve o
// apunta (sumado a lookX/lookY) y pone cmd.aimAssist = fuerza (opción × dispositivo) para que Player frene la mira cerca del objetivo.
// Disparo automático táctil (opción): fire/fireDown cuando hay un enemigo bajo la retícula.
const CMD_EDGE=['fireDown','adsDown','reload','jump','crouch','grenadeDown','melee','useDown','swap','next','prev','pause'];
const CMD_HELD=['fire','ads','sprint','grenade','use'];
const mkCmd=()=>({mx:0,mz:0,lookX:0,lookY:0,aimAssist:0,fire:false,ads:false,sprint:false,grenade:false,use:false,
 fireDown:false,adsDown:false,reload:false,jump:false,crouch:false,grenadeDown:false,melee:false,useDown:false,swap:false,next:false,prev:false,pause:false,slot:0});
const KEYMAP={KeyW:'f',ArrowUp:'f',KeyS:'b',ArrowDown:'b',KeyA:'l',ArrowLeft:'l',KeyD:'r',ArrowRight:'r',KeyZ:'f',KeyQ:'swap',
 Space:'jump',KeyC:'crouch',ControlLeft:'crouch',ControlRight:'crouch',ShiftLeft:'sprint',ShiftRight:'sprint',KeyG:'grenade',KeyV:'melee',KeyF:'melee',
 KeyE:'use',KeyR:'reload',Digit1:'s1',Digit2:'s2',Digit3:'s3',Escape:'pause',KeyP:'pause'};
// iconos de los botones táctiles (trazos SVG sobre 24x24)
const TICON={fire:'<circle cx="12" cy="12" r="6.5"/><path d="M12 2.5v5.5M12 16v5.5M2.5 12H8M16 12h5.5"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/>',
 ads:'<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v5M12 15.5v5M3.5 12h5M15.5 12h5"/>',
 jump:'<path d="M6 13.5l6-6.5 6 6.5M12 7v13"/><path d="M5 4h14"/>',crouch:'<path d="M6 5.5l6 5 6-5M6 12.5l6 5 6-5"/><path d="M5 21h14"/>',
 reload:'<path d="M18.5 8.5A7.5 7.5 0 1 0 19.5 14"/><path d="M19.5 3.5v5h-5"/><path d="M10.5 9.5h3v6h-3z"/>',
 grenade:'<ellipse cx="11" cy="14.5" rx="5.5" ry="6.3"/><path d="M8.7 8.4V6h4.6v2.4M13.3 6.6l3.5-2.6M6 12.2h10M6 16.4h10M11 8.4v12.3"/>',
 melee:'<path d="M3.5 20.5l8.2-8.2"/><path d="M11.7 12.3l7.6-8.8 1.2 1.2-8.8 7.6z"/><path d="M6 15.6l2.4 2.4"/>',
 swap:'<path d="M4 8.5h14.5l-3.5-3.5M20 15.5H5.5l3.5 3.5"/>',
 use:'<path d="M8.5 12.5V5.8a1.6 1.6 0 0 1 3.2 0v5.2M11.7 10.5V4.6a1.6 1.6 0 0 1 3.2 0v6M14.9 10.6V6.4a1.6 1.6 0 0 1 3.2 0v8.1c0 4.1-2.6 7-6.2 7-2.9 0-4.4-1.6-5.9-4.3l-2.4-4.3a1.6 1.6 0 0 1 2.6-1.7l2.5 2.9"/>',
 pause:'<path d="M8.5 5.5v13M15.5 5.5v13"/>'};
// disposición táctil para los pulgares en horizontal: [id, centro x desde la derecha, centro y desde abajo, diámetro] en px a escala 1 (iPad);
// la escala = opción de tamaño × tamaño de la pantalla (más pequeña en móviles)
const TLAYOUT=[['fire',104,128,112],['ads',222,74,76],['crouch',204,186,62],['jump',104,262,66],['reload',314,96,60],['grenade',300,198,60],
 ['swap',236,278,54],['melee',176,350,50],['use',420,150,72]];
const PAD_NAMES={0:['A','a'],1:['B','b'],2:['X','x'],3:['Y','y'],4:['LB','sh'],5:['RB','sh'],6:['LT','tr'],7:['RT','tr'],8:['⧉','sm'],9:['≡','sm'],10:['L3','st'],11:['R3','st'],12:['▲','dp'],13:['▼','dp'],14:['◀','dp'],15:['▶','dp']};
// acción -> tecla, botón del mando y botón táctil (para avisos y pantallas de ayuda)
const ACT_GLYPH={use:['E',2,'use'],reload:['R',2,'reload'],grenade:['G',5,'grenade'],melee:['V',4,'melee'],jump:['k_space',0,'jump'],crouch:['C',1,'crouch'],swap:['Q',3,'swap'],
 fire:['k_lclick',7,'fire'],ads:['k_rclick',6,'ads'],sprint:['k_shift',10,null],pause:['Esc',9,'pause']};
const Input={cmd:mkCmd(),device:'kbm',override:null,active:false,locked:false,freeMouse:false,cv:null,
 opts:{sensMouse:1,sensTouch:1,sensPad:1,invertY:false,aimAssist:0.65,autoFire:false,btnSize:1,btnAlpha:0.85},
 kb:{},_e:mkCmd(),_mdx:0,_mdy:0,_mb:[false,false,false],_wheelT:0,_pad:null,_padPrev:[],_ph:0,
 tgt:null,tgtOn:false,tgtErr:1,tgtDist:0,_tgtT:0,_af:false,_afT:0,_ae:[0,0,0],_ad:[0,0,0],_ac:[0,0,0],_cand:[],
 T:{on:false,built:false,stick:null,look:new Map(),btn:new Map(),mx:0,mz:0,lx:0,ly:0,sprint:false,adsOn:false,el:{},s:1,hud:{}},
 init(cv){this.cv=cv;const K=this;
  addEventListener('keydown',e=>K._key(e,true));addEventListener('keyup',e=>K._key(e,false));
  addEventListener('blur',()=>{K.kb={};K._mb=[false,false,false];K._clearTouch();});
  addEventListener('mousemove',e=>{if(!K.active||!(K.locked||K.freeMouse))return;
   // en algunos navegadores el bloqueo da saltos enormes de vez en cuando: se recortan
   K._mdx+=clamp(e.movementX||0,-250,250);K._mdy+=clamp(e.movementY||0,-250,250);});
  addEventListener('mousedown',e=>{if(e.pointerType==='touch'||!K.active)return;if(K.device==='touch'&&e.sourceCapabilities&&e.sourceCapabilities.firesTouchEvents)return;
   if(!K.locked&&!K.freeMouse){if(e.target===cv)K.lock();return;}
   K._dev('kbm');if(e.button===0){K._mb[0]=true;K._e.fireDown=true;}else if(e.button===2){K._mb[2]=true;K._e.adsDown=true;}else if(e.button===1){K._e.melee=true;e.preventDefault();}});
  addEventListener('mouseup',e=>{if(e.button===0)K._mb[0]=false;else if(e.button===2)K._mb[2]=false;});
  addEventListener('contextmenu',e=>{if(K.active||K.device==='touch')e.preventDefault();});
  addEventListener('wheel',e=>{if(!K.active)return;const t=performance.now();if(t-K._wheelT<110)return;K._wheelT=t;if(e.deltaY>0)K._e.next=true;else if(e.deltaY<0)K._e.prev=true;},{passive:true});
  document.addEventListener('pointerlockchange',()=>{const was=K.locked;K.locked=document.pointerLockElement===cv;if(K.locked)K.freeMouse=false;if(was&&!K.locked)Bus.emit('pointerUnlock',{});});
  document.addEventListener('pointerlockerror',()=>{K.freeMouse=true;});
  addEventListener('pointerdown',e=>{if(e.pointerType==='touch'){K._dev('touch');if(K.active)K._buildTouch();}else if(e.pointerType==='mouse'&&K.device==='touch'&&e.isPrimary&&!(e.sourceCapabilities&&e.sourceCapabilities.firesTouchEvents))K._dev('kbm');},true);
  addEventListener('resize',()=>K._touchStyle());
  addEventListener('gamepadconnected',()=>{});
  // vibración del mando: daño y explosiones cercanas
  Bus.on('playerHurt',d=>K.rumble(clamp((d&&d.dmg||10)/45,0.25,1),140));
  Bus.on('explosion',d=>{if(typeof Player==='undefined'||!d||!d.pos)return;const r=V3.dist(d.pos,Player.pos);if(r<24)K.rumble(clamp(1-r/24,0.15,1),320);});
 },
 setOpts(o){Object.assign(this.opts,o||{});if(typeof this.opts.aimAssist==='boolean')this.opts.aimAssist=this.opts.aimAssist?0.65:0;this._touchStyle();},
 // Game lo activa en juego (bloqueo del puntero, controles táctiles visibles, se capturan las teclas)
 setActive(on){this.active=!!on;if(!on){this._mb=[false,false,false];this._clearTouch();this.T.adsOn=false;this.tgt=null;this.tgtOn=false;}else if(this.device==='touch')this._buildTouch();this._showTouch();},
 lock(){const cv=this.cv;if(!cv||this.device==='touch'||this.locked||!cv.requestPointerLock)return;
  try{const p=cv.requestPointerLock({unadjustedMovement:true});
   if(p&&p.catch)p.catch(()=>{try{const q=cv.requestPointerLock();if(q&&q.catch)q.catch(()=>{this.freeMouse=true;});}catch(e){this.freeMouse=true;}});}
  catch(e){try{cv.requestPointerLock();}catch(e2){this.freeMouse=true;}}},
 unlock(){if(document.pointerLockElement&&document.exitPointerLock)document.exitPointerLock();},
 _dev(d){if(this.device===d)return;this.device=d;document.body.classList.toggle('touch',d==='touch');document.body.dataset.dev=d;this._showTouch();Bus.emit('device',{device:d});},
 rumble(k,ms){if(this.device!=='pad'||!this.active)return;const g=this._gp();const a=g&&g.vibrationActuator;if(!a||!a.playEffect)return;
  try{const p=a.playEffect('dual-rumble',{duration:ms||150,strongMagnitude:clamp(k,0,1),weakMagnitude:clamp(k*0.8,0,1)});if(p&&p.catch)p.catch(()=>{});}catch(e){}},
 _key(e,down){const a=KEYMAP[e.code];if(!a)return;
  // en los menús la pausa (Esc/P) la lleva Menu: así Esc en Opciones vuelve atrás en vez de reanudar
  if(a==='pause'&&!this.active){if(down)this._dev('kbm');return;}
  if(this.active&&!e.metaKey&&!(e.ctrlKey&&a!=='crouch'))e.preventDefault();
  if(down&&e.repeat)return;this.kb[a]=down;if(!down)return;this._dev('kbm');const E=this._e;
  switch(a){case 'jump':E.jump=true;break;case 'crouch':E.crouch=true;break;case 'grenade':E.grenadeDown=true;break;case 'melee':E.melee=true;break;
   case 'use':E.useDown=true;break;case 'reload':E.reload=true;break;case 'swap':E.swap=true;break;case 'pause':E.pause=true;break;
   case 's1':E.slot=1;break;case 's2':E.slot=2;break;case 's3':E.slot=3;break;}},
 // borra giros y flancos tras usarlos en un paso fijo
 consume(){const c=this.cmd;c.lookX=c.lookY=0;for(const k of CMD_EDGE)c[k]=false;c.slot=0;},
 // descarta todo lo pendiente (al entrar o volver al juego: que una tecla del menú no dispare ni pause)
 flush(){this.consume();this._e=mkCmd();this._mdx=this._mdy=0;const T=this.T;T.lx=T.ly=0;this._padPrev=this._padNow();},
 update(dt){const c=this.cmd,o=this.override;
  if(o){c.mx=o.mx||0;c.mz=o.mz||0;c.aimAssist=o.aimAssist||0;for(const k of CMD_HELD)c[k]=!!o[k];
   c.lookX+=o.lookX||0;c.lookY+=o.lookY||0;o.lookX=o.lookY=0;for(const k of CMD_EDGE)if(o[k]){c[k]=true;o[k]=false;}if(o.slot){c.slot=o.slot;o.slot=0;}
   this._e=mkCmd();this._mdx=this._mdy=0;return c;}
  const K=this.kb,E=this._e,op=this.opts;
  let mx=(K.r?1:0)-(K.l?1:0),mz=(K.f?1:0)-(K.b?1:0);
  let fire=this._mb[0],ads=this._mb[2],sprint=!!K.sprint,gren=!!K.grenade,use=!!K.use;
  // ratón (sin aceleración)
  if(this._mdx||this._mdy){const k=0.0022*op.sensMouse;c.lookX+=this._mdx*k;c.lookY-=this._mdy*k*(op.invertY?-1:1);this._mdx=this._mdy=0;}
  // mando
  const P=this._pollPad(dt);
  if(P){if(Math.abs(P.mx)>Math.abs(mx))mx=P.mx;if(Math.abs(P.mz)>Math.abs(mz))mz=P.mz;fire=fire||P.fire;ads=ads||P.ads;sprint=sprint||P.sprint;gren=gren||P.gren;use=use||P.use;}
  // táctil
  const T=this.T;
  if(T.on){if(T.mx||T.mz){mx=T.mx;mz=T.mz;}if(T.sprint){sprint=true;if(T.adsOn)this._setAds(false);}
   if(T.lx||T.ly){const k=0.0056*op.sensTouch;c.lookX+=T.lx*k;c.lookY-=T.ly*k*(op.invertY?-1:1);T.lx=T.ly=0;}
   for(const b of T.btn.values()){if(b==='fire')fire=true;else if(b==='grenade')gren=true;else if(b==='use')use=true;}
   if(T.adsOn)ads=true;}
  const l=Math.hypot(mx,mz);if(l>1){mx/=l;mz/=l;}
  // ayuda al apuntar y disparo automático (sólo jugando, mando o táctil)
  const dev=this.device,aa=(dev==='pad'?1:dev==='touch'?0.85:0)*(+op.aimAssist||0);c.aimAssist=aa;
  const auto=dev==='touch'&&op.autoFire;
  if((aa>0||auto)&&this.active)this._assist(dt,c,aa,Math.abs(mx)+Math.abs(mz)>0.15,ads);else{this.tgt=null;this.tgtOn=false;}
  if(auto&&this.tgtOn&&!fire&&this._canAuto()){fire=true;this._afT-=dt;if(!this._af||this._afT<=0){E.fireDown=true;this._afT=this._semi?0.32:0.8;}this._af=true;}else{this._af=false;this._afT=0;}
  c.mx=mx;c.mz=mz;c.fire=!!fire;c.ads=!!ads;c.sprint=!!sprint;c.grenade=!!gren;c.use=!!use;
  for(const k of CMD_EDGE)if(E[k]){c[k]=true;E[k]=false;}if(E.slot){c.slot=E.slot;E.slot=0;}
  return c;},
 // ---------- ayuda al apuntar ----------
 _chest(a,o){o=o||[0,0,0];if(typeof Actors!=='undefined'&&Actors.chest)return Actors.chest(a,o);o[0]=a.pos[0];o[1]=a.pos[1]+(a.stance==='crouch'?0.85:1.25);o[2]=a.pos[2];return o;},
 // enemigo vivo y a la vista más cerca de la línea de mira (cono más ancho de cerca)
 _tgtFind(){const P=Player,e=P.eye(this._ae),d=P.dir(this._ad),cand=this._cand,ch=this._ac;cand.length=0;
  for(const a of Actors.list){if(!a.alive||a.team!=='axis'||a.tank)continue;this._chest(a,ch);const vx=ch[0]-e[0],vy=ch[1]-e[1],vz=ch[2]-e[2],l=Math.hypot(vx,vy,vz);if(l<0.8||l>95)continue;
   const ang=Math.acos(clamp((vx*d[0]+vy*d[1]+vz*d[2])/l,-1,1)),cone=Math.min(0.22,0.05+1.5/l);if(ang<cone)cand.push({k:ang/cone,a});}
  cand.sort((x,y)=>x.k-y.k);for(let i=0;i<cand.length&&i<3;i++){const a=cand[i].a;if(World.los(e,this._chest(a,ch)))return a;}return null;},
 _assist(dt,c,S,moving,ads){this.tgtOn=false;if(typeof Actors==='undefined'||typeof Player==='undefined'||typeof World==='undefined'||!Player.alive||Player.mounted)return;
  if(typeof Game!=='undefined'&&Game.mode!=='play')return;
  this._tgtT-=dt;if(this._tgtT<=0){this._tgtT=0.08;this.tgt=this._tgtFind();}
  const a=this.tgt;if(!a||!a.alive){this.tgt=null;return;}const P=Player,e=P.eye(this._ae),ch=this._chest(a,this._ac);
  const dx=ch[0]-e[0],dy=ch[1]-e[1],dz=ch[2]-e[2],dh=Math.hypot(dx,dz),dist=Math.hypot(dh,dy);
  const ey=angNorm(Math.atan2(dx,dz)-(P.yaw+P.recoil.y)),ep=Math.atan2(dy,dh)-(P.pitch+P.recoil.p),err=Math.hypot(ey,ep),cone=Math.min(0.22,0.05+1.5/Math.max(dist,1));
  if(err>cone)return;this.tgtOn=true;this.tgtErr=err;this.tgtDist=dist;
  // imán suave: sólo mientras el jugador se mueve, mira o apunta (nunca gira solo con el mando quieto)
  if(S>0&&(moving||ads||Math.abs(c.lookX)+Math.abs(c.lookY)>1e-5)){const rate=(ads?1.05:0.5)*S*(1-0.55*err/cone),ry=rate*dt,rp=ry*0.75;
   c.lookX-=clamp(ey,-ry,ry);c.lookY+=clamp(ep,-rp,rp);}},
 _canAuto(){if(this.tgtErr>0.022+0.45/Math.max(this.tgtDist,2))return false;if(typeof Weapons==='undefined'||!Weapons.def)return true;const d=Weapons.def();if(!d||d.mode==='rocket')return false;
  this._semi=d.mode!=='auto';return true;},
 // ---------- mando (distribución estándar) ----------
 _gp(){const gs=navigator.getGamepads?navigator.getGamepads():null;if(!gs)return null;for(const q of gs)if(q&&q.connected&&q.buttons&&q.buttons.length)return q;return null;},
 _padNow(){const g=this._gp();if(!g)return [];const r=[];for(let i=0;i<17;i++){const b=g.buttons[i];r[i]=b?(typeof b==='object'?b.value>0.5||b.pressed:b>0.5):false;}return r;},
 _pollPad(dt){if(document.hidden)return null;const g=this._gp();if(!g)return null;
  const A=i=>g.axes[i]||0,prev=this._padPrev,E=this._e,c=this.cmd,op=this.opts;
  const dz=(x,y,d)=>{const l=Math.hypot(x,y);if(l<d)return [0,0];const k=Math.min(1,(l-d)/(1-d))/l;return [x*k,y*k];};
  const [sx,sy]=dz(A(0),A(1),0.16),[rx,ry]=dz(A(2),A(3),0.14);
  const now=this._padNow();
  const any=now.some(v=>v)||Math.hypot(sx,sy)>0.3||Math.hypot(rx,ry)>0.3;if(any)this._dev('pad');
  const dn=i=>now[i]&&!prev[i];
  if(this.active){if(dn(0))E.jump=true;if(dn(1))E.crouch=true;if(dn(2)){E.reload=true;E.useDown=true;}if(dn(3))E.swap=true;if(dn(4))E.melee=true;if(dn(11))E.melee=true;
   if(dn(5))E.grenadeDown=true;if(dn(9))E.pause=true;if(dn(15))E.next=true;if(dn(14))E.prev=true;if(dn(7))E.fireDown=true;if(dn(6))E.adsDown=true;}
  this._padPrev=now;
  // mirar: curva (precisión en el centro) y giro rápido al mantener la palanca a fondo; velocidad en rad/s
  if(this.active&&(rx||ry)){const m=Math.hypot(rx,ry),cur=Math.pow(m,1.9)/m;this._ph=m>0.9?this._ph+dt:0;const boost=1+0.75*smooth((this._ph-0.18)/0.5),k=dt*op.sensPad;
   c.lookX+=rx*cur*3.1*boost*k;c.lookY-=ry*cur*2.2*k*(op.invertY?-1:1);}else this._ph=0;
  return this.active?{mx:sx,mz:-sy,fire:now[7],ads:now[6],sprint:now[10],gren:now[5],use:now[2]}:null;},
 // ---------- glifos de controles (avisos del HUD, pantalla de controles) ----------
 padGlyph(i){const n=PAD_NAMES[i]||['?','sm'];return '<i class="pg '+n[1]+(i<4?' b'+i:'')+'">'+n[0]+'</i>';},
 touchIcon(id){return '<svg viewBox="0 0 24 24" aria-hidden="true">'+(TICON[id]||'')+'</svg>';},
 touchGlyph(id){return '<i class="tg '+id+'">'+this.touchIcon(id)+'</i>';},
 // glifo de una acción para el dispositivo activo (o el indicado)
 glyph(act,dev){const g=ACT_GLYPH[act];if(!g)return '';dev=dev||this.device;
  if(dev==='pad')return this.padGlyph(g[1]);if(dev==='touch')return g[2]?this.touchGlyph(g[2]):'';
  const k=g[0].startsWith('k_')&&typeof t==='function'?t(g[0]):g[0];return '<kbd>'+k+'</kbd>';},
 // ---------- táctil: palanca flotante a la izquierda, arrastre a la derecha para mirar y botones para los pulgares ----------
 _scale(w,h){w=w||innerWidth;h=h||innerHeight;return (this.opts.btnSize||1)*clamp(Math.min(w,h)/760,0.62,1.12);},
 // posiciones absolutas (centro y diámetro en px) para una pantalla w×h, sin márgenes seguros (vista previa de Opciones)
 touchLayout(w,h){const s=this._scale(w,h);return TLAYOUT.map(([id,x,y,d])=>({id,x:w-x*s,y:h-y*s,d:d*s})).concat([{id:'pause',x:w-36*s,y:34*s,d:46*s}]);},
 _buildTouch(){const T=this.T;if(T.built)return;const root=document.getElementById('touch');if(!root)return;T.built=true;
  const tz=document.createElement('div');tz.className='tz';tz.hidden=true;root.appendChild(tz);T.el.tz=tz;
  const stk=document.createElement('div');stk.className='stk idle';stk.innerHTML='<i></i><b></b>';tz.appendChild(stk);T.el.stk=stk;
  const mk=id=>{const b=document.createElement('div');b.className='tb '+id;b.dataset.b=id;b.innerHTML=this.touchIcon(id)+(id==='use'?'<span class="ul"></span>':id==='grenade'?'<b class="bd"></b>':id==='fire'?'<span class="af">AUTO</span>':'');
   tz.appendChild(b);T.el[id]=b;return b;};
  for(const [id] of TLAYOUT)mk(id);mk('pause');T.el.use.hidden=true;
  this._touchStyle();
  const onDown=e=>{if(e.pointerType!=='touch'&&e.pointerType!=='pen')return;e.preventDefault();this._dev('touch');const id=this._hitBtn(e.clientX,e.clientY);
   if(id){this._press(e.pointerId,id,e);return;}
   if(e.clientX<innerWidth*0.45&&!T.stick){T.stick={id:e.pointerId,x:e.clientX,y:e.clientY};this._stickMove(e.clientX,e.clientY);return;}
   T.look.set(e.pointerId,{x:e.clientX,y:e.clientY,t:e.timeStamp});};
  const onMove=e=>{if(T.stick&&T.stick.id===e.pointerId){this._stickMove(e.clientX,e.clientY);return;}
   const l=T.look.get(e.pointerId);if(!l)return;const dx=e.clientX-l.x,dy=e.clientY-l.y,dt=Math.max(4,e.timeStamp-l.t),v=Math.hypot(dx,dy)/dt*1000;
   // curva de aceleración: movimientos lentos precisos, barridos rápidos giran más
   const gain=1+1.1*smooth((v-220)/1400);T.lx+=dx*gain;T.ly+=dy*gain;l.x=e.clientX;l.y=e.clientY;l.t=e.timeStamp;};
  const onUp=e=>{if(T.stick&&T.stick.id===e.pointerId){T.stick=null;T.mx=T.mz=0;T.sprint=false;this._stickDraw(null);}
   T.look.delete(e.pointerId);const b=T.btn.get(e.pointerId);if(b){T.btn.delete(e.pointerId);if(T.el[b]&&![...T.btn.values()].includes(b))T.el[b].classList.remove('on');}};
  tz.addEventListener('pointerdown',onDown);tz.addEventListener('pointermove',onMove);tz.addEventListener('pointerup',onUp);tz.addEventListener('pointercancel',onUp);
  tz.addEventListener('contextmenu',e=>e.preventDefault());
  this._showTouch();},
 _touchStyle(){const T=this.T;if(!T.built)return;const s=T.s=this._scale(),a=this.opts.btnAlpha==null?0.85:this.opts.btnAlpha;
  for(const [id,x,y,d] of TLAYOUT){const el=T.el[id];if(!el)continue;const D=d*s;el.style.width=el.style.height=D.toFixed(1)+'px';
   el.style.right=`calc(var(--sar) + ${((x-d/2)*s).toFixed(1)}px)`;el.style.bottom=`calc(var(--sab) + ${((y-d/2)*s).toFixed(1)}px)`;el.style.opacity=a;}
  const p=T.el.pause;if(p){const D=46*s;p.style.width=p.style.height=D.toFixed(1)+'px';p.style.right=`calc(var(--sar) + ${(13*s).toFixed(1)}px)`;p.style.top=`calc(var(--sat) + ${(11*s).toFixed(1)}px)`;p.style.opacity=Math.max(0.5,a);}
  const k=T.el.stk;if(k){const D=128*s;k.style.width=k.style.height=D+'px';k.style.margin=(-D/2)+'px 0 0 '+(-D/2)+'px';k.style.setProperty('--ka',a);if(!T.stick)this._stickDraw(null);}
  document.documentElement.style.setProperty('--ts',s.toFixed(3));},
 _showTouch(){const T=this.T;T.on=this.active&&this.device==='touch';if(T.el.tz)T.el.tz.hidden=!T.on;},
 _clearTouch(){const T=this.T;T.stick=null;T.look.clear();T.btn.clear();T.mx=T.mz=T.lx=T.ly=0;T.sprint=false;
  for(const id in T.el)if(T.el[id]&&T.el[id].classList&&id!=='ads')T.el[id].classList.remove('on');this._stickDraw(null);},
 _hitBtn(x,y){const T=this.T;let best=null,bd=1e9;
  for(const id in T.el){const el=T.el[id];if(!el||!el.dataset||!el.dataset.b||el.hidden)continue;const r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,d=Math.hypot(x-cx,y-cy);
   if(d<r.width*0.6+6&&d<bd){bd=d;best=id;}}return best;},
 _setAds(on){const T=this.T;T.adsOn=on;if(on)this._e.adsDown=true;if(T.el.ads)T.el.ads.classList.toggle('on',on);},
 _press(pid,id,e){const T=this.T,E=this._e,el=T.el[id];
  switch(id){case 'fire':E.fireDown=true;T.btn.set(pid,'fire');T.look.set(pid,{x:e.clientX,y:e.clientY,t:e.timeStamp});break; // el botón de disparo también sirve para mirar
   case 'ads':this._setAds(!T.adsOn);return;
   case 'jump':E.jump=true;break;case 'crouch':E.crouch=true;break;case 'reload':E.reload=true;break;case 'swap':E.swap=true;break;case 'melee':E.melee=true;break;
   case 'grenade':E.grenadeDown=true;T.btn.set(pid,'grenade');break;case 'use':E.useDown=true;T.btn.set(pid,'use');break;case 'pause':E.pause=true;break;}
  if(el){el.classList.add('on');if(!T.btn.has(pid))setTimeout(()=>{if(![...T.btn.values()].includes(id))el.classList.remove('on');},130);}},
 _stickMove(x,y){const T=this.T,s=T.stick,R=52*T.s;let dx=x-s.x,dy=y-s.y;const l=Math.hypot(dx,dy);
  // empujar más allá del borde hacia delante = correr; si el dedo se aleja mucho, la base le sigue
  T.sprint=-dy>R*1.3&&Math.abs(dx)<-dy*0.65;
  if(l>R*1.6){s.x+=dx*(1-R*1.6/l);s.y+=dy*(1-R*1.6/l);dx=x-s.x;dy=y-s.y;}
  const k=Math.min(1,Math.hypot(dx,dy)/R)/(Math.hypot(dx,dy)||1);T.mx=dx*k;T.mz=-dy*k;if(Math.hypot(T.mx,T.mz)<0.1)T.mx=T.mz=0;this._stickDraw(s,dx,dy);},
 _stickDraw(s,dx,dy){const T=this.T,el=T.el.stk;if(!el)return;
  if(!s){el.classList.add('idle');el.classList.remove('sp');el.style.left=`calc(var(--sal) + ${(132*T.s).toFixed(0)}px)`;el.style.top=`calc(100% - var(--sab) - ${(140*T.s).toFixed(0)}px)`;el.firstChild.style.transform='';return;}
  el.classList.remove('idle');el.style.left=s.x+'px';el.style.top=s.y+'px';const R=52*T.s,l=Math.hypot(dx,dy),m=Math.min(l,R)/(l||1);
  el.firstChild.style.transform=`translate(${(dx*m).toFixed(1)}px,${(dy*m).toFixed(1)}px)`;el.classList.toggle('sp',T.sprint);},
 // botón contextual de usar (texto o null para ocultarlo)
 touchUse(text){const el=this.T.el.use;if(!el)return;const on=!!text;if(el.hidden===!on&&(!on||el._t===text))return;el.hidden=!on;el._t=text;if(on)el.querySelector('.ul').textContent=text;},
 // estado que el HUD refleja en los botones: {nades, crouch, reload (recarga recomendada), auto (disparo automático activo)}
 touchHud(o){const T=this.T;if(!T.built||!T.on)return;const H=T.hud,el=T.el;
  if(o.nades!==H.nades){H.nades=o.nades;const b=el.grenade&&el.grenade.querySelector('.bd');if(b)b.textContent=o.nades;if(el.grenade)el.grenade.classList.toggle('empty',!o.nades);}
  if(o.crouch!==H.crouch){H.crouch=o.crouch;if(el.crouch)el.crouch.classList.toggle('lit',!!o.crouch);}
  if(o.reload!==H.reload){H.reload=o.reload;if(el.reload)el.reload.classList.toggle('hint',!!o.reload);}
  const au=!!this.opts.autoFire;if(au!==H.auto){H.auto=au;if(el.fire)el.fire.classList.toggle('auto',au);}
  const tg=!!(au&&this.tgtOn);if(tg!==H.tg){H.tg=tg;if(el.fire)el.fire.classList.toggle('tgt',tg);}}
};
