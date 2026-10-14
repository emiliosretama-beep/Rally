// ===== FRENTE 44 · entrada: teclado y ratón (bloqueo del puntero), mando y táctil -> Input.cmd =====
// Input.update(dt) una vez por fotograma de render ACUMULA en Input.cmd (giros sumados, flancos con OR); Game usa el comando en el
// primer paso fijo del fotograma y llama a Input.consume() (borra giros y flancos). Así no se pierde nada aunque un fotograma no tenga pasos.
// Campos: mx, mz (-1..1: derecha, adelante) · lookX (rad, >0 gira a la DERECHA) · lookY (rad, >0 mira ARRIBA) · aimAssist 0..1
//  mantenidos: fire, ads, sprint, grenade, use · flancos (un paso): fireDown, adsDown, reload, jump, crouch (alterna), grenadeDown,
//  melee, useDown, swap, next, prev, pause, slot (0 | 1..3)
const CMD_EDGE=['fireDown','adsDown','reload','jump','crouch','grenadeDown','melee','useDown','swap','next','prev','pause'];
const CMD_HELD=['fire','ads','sprint','grenade','use'];
const mkCmd=()=>({mx:0,mz:0,lookX:0,lookY:0,aimAssist:0,fire:false,ads:false,sprint:false,grenade:false,use:false,
 fireDown:false,adsDown:false,reload:false,jump:false,crouch:false,grenadeDown:false,melee:false,useDown:false,swap:false,next:false,prev:false,pause:false,slot:0});
const KEYMAP={KeyW:'f',ArrowUp:'f',KeyS:'b',ArrowDown:'b',KeyA:'l',ArrowLeft:'l',KeyD:'r',ArrowRight:'r',KeyZ:'f',KeyQ:'swap',
 Space:'jump',KeyC:'crouch',ControlLeft:'crouch',ControlRight:'crouch',ShiftLeft:'sprint',ShiftRight:'sprint',KeyG:'grenade',KeyV:'melee',KeyF:'melee',
 KeyE:'use',KeyR:'reload',Digit1:'s1',Digit2:'s2',Digit3:'s3',Escape:'pause',KeyP:'pause'};
// iconos de los botones táctiles (trazos SVG sobre 24x24)
const TICON={fire:'<circle cx="12" cy="12" r="6.5"/><path d="M12 2v6M12 16v6M2 12h6M16 12h6"/>',ads:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><path d="M12 4v3M12 17v3M4 12h3M17 12h3"/>',
 jump:'<path d="M5 14l7-7 7 7M12 7v13"/>',crouch:'<path d="M5 6l7 6 7-6M5 13l7 6 7-6"/>',reload:'<path d="M19 8a8 8 0 1 0 1 6"/><path d="M20 3v5h-5"/>',
 grenade:'<ellipse cx="12" cy="14" rx="5.5" ry="6.5"/><path d="M10 7.5V5h4v2.5M14 5l3-2M8 12h8M8 16h8"/>',melee:'<path d="M4 20l9-9M13 11l6-8 1 1-6 9z"/><path d="M6 15l3 3"/>',
 swap:'<path d="M4 8h14l-3-3M20 16H6l3 3"/>',use:'<path d="M8 12V5.5a1.5 1.5 0 0 1 3 0V11M11 10V4a1.5 1.5 0 0 1 3 0v7M14 10V5.5a1.5 1.5 0 0 1 3 0V14c0 4-2.5 7-6 7s-5-2-6.5-5L3 12.5a1.5 1.5 0 0 1 2.5-1.6L8 14"/>',
 pause:'<path d="M8 5v14M16 5v14"/>'};
// disposición de los botones: [id, derecha (px desde el borde), abajo, diámetro]; se escala con la opción de tamaño
const TLAYOUT=[['fire',34,64,96],['ads',148,40,64],['jump',40,186,62],['crouch',150,128,58],['reload',224,42,54],['grenade',236,124,54],
 ['swap',122,210,52],['melee',214,200,48],['use',290,150,62]];
const Input={cmd:mkCmd(),device:'kbm',override:null,active:false,locked:false,freeMouse:false,cv:null,
 opts:{sensMouse:1,sensTouch:1,sensPad:1,invertY:false,aimAssist:true,autoFire:false,btnSize:1,btnAlpha:0.85},
 kb:{},_e:mkCmd(),_mdx:0,_mdy:0,_mb:[false,false,false],_wheelT:0,_pad:null,_padPrev:[],_padAds:false,
 T:{on:false,built:false,stick:null,look:new Map(),btn:new Map(),mx:0,mz:0,lx:0,ly:0,sprint:false,adsOn:false,el:{}},
 init(cv){this.cv=cv;const K=this;
  addEventListener('keydown',e=>K._key(e,true));addEventListener('keyup',e=>K._key(e,false));
  addEventListener('blur',()=>{K.kb={};K._mb=[false,false,false];});
  addEventListener('mousemove',e=>{if(!K.active||!(K.locked||K.freeMouse))return;
   // en algunos navegadores el bloqueo da saltos enormes de vez en cuando: se recortan
   K._mdx+=clamp(e.movementX||0,-250,250);K._mdy+=clamp(e.movementY||0,-250,250);});
  addEventListener('mousedown',e=>{if(e.pointerType==='touch'||!K.active)return;if(!K.locked&&!K.freeMouse){if(e.target===cv)K.lock();return;}
   K._dev('kbm');if(e.button===0){K._mb[0]=true;K._e.fireDown=true;}else if(e.button===2){K._mb[2]=true;K._e.adsDown=true;}else if(e.button===1){K._e.melee=true;e.preventDefault();}});
  addEventListener('mouseup',e=>{if(e.button===0)K._mb[0]=false;else if(e.button===2)K._mb[2]=false;});
  addEventListener('contextmenu',e=>{if(K.active)e.preventDefault();});
  addEventListener('wheel',e=>{if(!K.active)return;const t=performance.now();if(t-K._wheelT<110)return;K._wheelT=t;if(e.deltaY>0)K._e.next=true;else if(e.deltaY<0)K._e.prev=true;},{passive:true});
  document.addEventListener('pointerlockchange',()=>{const was=K.locked;K.locked=document.pointerLockElement===cv;if(K.locked)K.freeMouse=false;if(was&&!K.locked)Bus.emit('pointerUnlock',{});});
  document.addEventListener('pointerlockerror',()=>{K.freeMouse=true;});
  addEventListener('pointerdown',e=>{if(e.pointerType==='touch'){K._dev('touch');if(K.active)K._buildTouch();}},true);
  addEventListener('gamepadconnected',()=>{});
 },
 setOpts(o){Object.assign(this.opts,o||{});this._touchStyle();},
 // Game lo activa en juego (bloqueo del puntero, controles táctiles visibles, se capturan las teclas)
 setActive(on){this.active=!!on;if(!on){this._mb=[false,false,false];this._clearTouch();}else if(this.device==='touch')this._buildTouch();this._showTouch();},
 lock(){const cv=this.cv;if(!cv||this.device==='touch'||this.locked||!cv.requestPointerLock)return;
  try{const p=cv.requestPointerLock({unadjustedMovement:true});
   if(p&&p.catch)p.catch(()=>{try{const q=cv.requestPointerLock();if(q&&q.catch)q.catch(()=>{this.freeMouse=true;});}catch(e){this.freeMouse=true;}});}
  catch(e){try{cv.requestPointerLock();}catch(e2){this.freeMouse=true;}}},
 unlock(){if(document.pointerLockElement&&document.exitPointerLock)document.exitPointerLock();},
 _dev(d){if(this.device===d)return;this.device=d;document.body.classList.toggle('touch',d==='touch');this._showTouch();Bus.emit('device',{device:d});},
 _key(e,down){const a=KEYMAP[e.code];if(!a)return;
  if(this.active&&!e.metaKey&&!(e.ctrlKey&&a!=='crouch'))e.preventDefault();
  if(down&&e.repeat)return;this.kb[a]=down;if(!down)return;this._dev('kbm');const E=this._e;
  switch(a){case 'jump':E.jump=true;break;case 'crouch':E.crouch=true;break;case 'grenade':E.grenadeDown=true;break;case 'melee':E.melee=true;break;
   case 'use':E.useDown=true;break;case 'reload':E.reload=true;break;case 'swap':E.swap=true;break;case 'pause':E.pause=true;break;
   case 's1':E.slot=1;break;case 's2':E.slot=2;break;case 's3':E.slot=3;break;}},
 // borra giros y flancos tras usarlos en un paso fijo
 consume(){const c=this.cmd;c.lookX=c.lookY=0;for(const k of CMD_EDGE)c[k]=false;c.slot=0;},
 // descarta todo lo pendiente (al entrar o volver al juego: que una tecla del menú no dispare ni pause)
 flush(){this.consume();this._e=mkCmd();this._mdx=this._mdy=0;const T=this.T;T.lx=T.ly=0;},
 update(dt){const c=this.cmd,o=this.override;
  if(o){c.mx=o.mx||0;c.mz=o.mz||0;c.aimAssist=o.aimAssist||0;for(const k of CMD_HELD)c[k]=!!o[k];
   c.lookX+=o.lookX||0;c.lookY+=o.lookY||0;o.lookX=o.lookY=0;for(const k of CMD_EDGE)if(o[k]){c[k]=true;o[k]=false;}if(o.slot){c.slot=o.slot;o.slot=0;}
   this._e=mkCmd();this._mdx=this._mdy=0;return c;}
  const K=this.kb,E=this._e,op=this.opts;
  let mx=(K.r?1:0)-(K.l?1:0),mz=(K.f?1:0)-(K.b?1:0);
  let fire=this._mb[0],ads=this._mb[2],sprint=!!K.sprint,gren=!!K.grenade,use=!!K.use;
  // ratón
  if(this._mdx||this._mdy){const k=0.0022*op.sensMouse;c.lookX+=this._mdx*k;c.lookY-=this._mdy*k*(op.invertY?-1:1);this._mdx=this._mdy=0;}
  // mando
  const P=this._pollPad(dt);
  if(P){if(Math.abs(P.mx)>Math.abs(mx))mx=P.mx;if(Math.abs(P.mz)>Math.abs(mz))mz=P.mz;fire=fire||P.fire;ads=ads||P.ads;sprint=sprint||P.sprint;gren=gren||P.gren;use=use||P.use;}
  // táctil
  const T=this.T;
  if(T.on){if(T.mx||T.mz){mx=T.mx;mz=T.mz;}if(T.sprint)sprint=true;if(T.lx||T.ly){const k=0.0058*op.sensTouch;c.lookX+=T.lx*k;c.lookY-=T.ly*k*(op.invertY?-1:1);T.lx=T.ly=0;}
   if(T.btn.size){for(const b of T.btn.values()){if(b==='fire')fire=true;else if(b==='grenade')gren=true;else if(b==='use')use=true;}}
   if(T.adsOn)ads=true;}
  const l=Math.hypot(mx,mz);if(l>1){mx/=l;mz/=l;}
  c.mx=mx;c.mz=mz;c.fire=!!fire;c.ads=!!ads;c.sprint=!!sprint;c.grenade=!!gren;c.use=!!use;
  for(const k of CMD_EDGE)if(E[k]){c[k]=true;E[k]=false;}if(E.slot){c.slot=E.slot;E.slot=0;}
  c.aimAssist=op.aimAssist?(this.device==='pad'?1:this.device==='touch'?0.7:0):0;
  return c;},
 // ---------- mando (distribución estándar) ----------
 _pollPad(dt){const gs=navigator.getGamepads?navigator.getGamepads():null;if(!gs)return null;let g=null;for(const q of gs)if(q&&q.connected){g=q;break;}if(!g)return null;
  const B=i=>{const b=g.buttons[i];return b?(typeof b==='object'?b.value>0.5||b.pressed:b>0.5):false;},A=i=>g.axes[i]||0,prev=this._padPrev,E=this._e,c=this.cmd,op=this.opts;
  const dz=(x,y,d)=>{const l=Math.hypot(x,y);if(l<d)return [0,0];const k=Math.min(1,(l-d)/(1-d))/l;return [x*k,y*k];};
  const [sx,sy]=dz(A(0),A(1),0.16),[rx,ry]=dz(A(2),A(3),0.14);
  const now=[];for(let i=0;i<17;i++)now[i]=B(i);
  const any=now.some(v=>v)||Math.hypot(sx,sy)>0.3||Math.hypot(rx,ry)>0.3;if(any)this._dev('pad');
  const dn=i=>now[i]&&!prev[i];
  if(dn(0))E.jump=true;if(dn(1))E.crouch=true;if(dn(2)){E.reload=true;E.useDown=true;}if(dn(3))E.swap=true;if(dn(4))E.melee=true;if(dn(11))E.melee=true;
  if(dn(5))E.grenadeDown=true;if(dn(9))E.pause=true;if(dn(15))E.next=true;if(dn(14))E.prev=true;if(dn(7))E.fireDown=true;if(dn(6))E.adsDown=true;
  this._padPrev=now;
  // mirar: curva (más precisión en el centro) y velocidad en rad/s
  if(rx||ry){const m=Math.hypot(rx,ry),cur=Math.pow(m,1.8)/m,k=dt*op.sensPad;c.lookX+=rx*cur*3.3*k;c.lookY-=ry*cur*2.3*k*(op.invertY?-1:1);}
  return {mx:sx,mz:-sy,fire:now[7],ads:now[6],sprint:now[10],gren:now[5],use:now[2]};},
 // ---------- táctil: palanca a la izquierda, arrastre a la derecha para mirar y botones ----------
 _buildTouch(){const T=this.T;if(T.built)return;T.built=true;const root=document.getElementById('touch');if(!root)return;
  const st=document.createElement('style');st.textContent=`
#touch .tz{position:absolute;inset:0;pointer-events:auto;touch-action:none}
#touch .tb{position:absolute;border-radius:50%;display:grid;place-items:center;background:rgba(22,26,15,.5);border:2px solid rgba(194,178,128,.62);color:#e8e1cc;
 box-shadow:0 2px 8px rgba(0,0,0,.35),inset 0 0 0 3px rgba(0,0,0,.18);pointer-events:none;transition:background .08s,transform .08s}
#touch .tb svg{width:46%;height:46%;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
#touch .tb.on{background:rgba(201,160,58,.55);transform:scale(.94)}
#touch .tb.fire{background:rgba(110,30,22,.5);border-color:rgba(232,160,120,.7)}
#touch .tb.fire.on{background:rgba(179,38,30,.7)}
#touch .tb.use span{position:absolute;top:100%;margin-top:4px;font:600 13px var(--cond);white-space:nowrap;text-shadow:0 1px 2px #000;letter-spacing:.04em;text-transform:uppercase}
#touch .tb.pause{border-radius:8px}
#touch .stk{position:absolute;width:128px;height:128px;margin:-64px 0 0 -64px;border-radius:50%;border:2px solid rgba(194,178,128,.45);background:rgba(22,26,15,.28);pointer-events:none}
#touch .stk i{position:absolute;left:50%;top:50%;width:54px;height:54px;margin:-27px 0 0 -27px;border-radius:50%;background:rgba(232,225,204,.5);border:2px solid rgba(255,255,255,.4)}
#touch .stk.sp{border-color:rgba(201,160,58,.9)}
#touch .stk.idle{opacity:.45}`;document.head.appendChild(st);
  const tz=document.createElement('div');tz.className='tz';root.appendChild(tz);T.el.tz=tz;
  const stk=document.createElement('div');stk.className='stk idle';stk.innerHTML='<i></i>';tz.appendChild(stk);T.el.stk=stk;
  const mk=(id,lab)=>{const b=document.createElement('div');b.className='tb '+id;b.dataset.b=id;b.setAttribute('aria-label',lab||id);
   b.innerHTML='<svg viewBox="0 0 24 24">'+TICON[id]+'</svg>'+(id==='use'?'<span></span>':'');tz.appendChild(b);T.el[id]=b;return b;};
  for(const [id] of TLAYOUT)mk(id);mk('pause');T.el.use.hidden=true;
  this._touchStyle();
  const onDown=e=>{if(e.pointerType!=='touch'&&e.pointerType!=='pen')return;e.preventDefault();this._dev('touch');const id=this._hitBtn(e.clientX,e.clientY);
   if(id){this._press(e.pointerId,id,e);return;}
   if(e.clientX<innerWidth*0.42&&!T.stick){T.stick={id:e.pointerId,x:e.clientX,y:e.clientY};this._stickMove(e.clientX,e.clientY);return;}
   T.look.set(e.pointerId,{x:e.clientX,y:e.clientY});};
  const onMove=e=>{if(T.stick&&T.stick.id===e.pointerId){this._stickMove(e.clientX,e.clientY);return;}
   const l=T.look.get(e.pointerId);if(l){T.lx+=e.clientX-l.x;T.ly+=e.clientY-l.y;l.x=e.clientX;l.y=e.clientY;}};
  const onUp=e=>{if(T.stick&&T.stick.id===e.pointerId){T.stick=null;T.mx=T.mz=0;T.sprint=false;this._stickDraw(null);}
   T.look.delete(e.pointerId);const b=T.btn.get(e.pointerId);if(b){T.btn.delete(e.pointerId);if(T.el[b])T.el[b].classList.remove('on');}};
  tz.addEventListener('pointerdown',onDown);tz.addEventListener('pointermove',onMove);tz.addEventListener('pointerup',onUp);tz.addEventListener('pointercancel',onUp);
  this._showTouch();},
 _touchStyle(){const T=this.T;if(!T.built)return;const k=this.opts.btnSize||1,a=this.opts.btnAlpha==null?0.85:this.opts.btnAlpha;
  for(const [id,r,b,d] of TLAYOUT){const el=T.el[id];if(!el)continue;const D=d*k;el.style.width=el.style.height=D+'px';
   el.style.right=`calc(var(--sar) + ${r*k}px)`;el.style.bottom=`calc(var(--sab) + ${b*k}px)`;el.style.opacity=a;}
  const p=T.el.pause;if(p){p.style.width=p.style.height=44*k+'px';p.style.right='calc(var(--sar) + 14px)';p.style.top='calc(var(--sat) + 12px)';p.style.opacity=a;}
  if(T.el.stk)T.el.stk.style.opacity='';},
 _showTouch(){const T=this.T;T.on=this.active&&this.device==='touch';if(T.el.tz)T.el.tz.hidden=!T.on;},
 _clearTouch(){const T=this.T;T.stick=null;T.look.clear();T.btn.clear();T.mx=T.mz=T.lx=T.ly=0;T.sprint=false;T.adsOn=false;
  for(const id in T.el)if(T.el[id]&&T.el[id].classList)T.el[id].classList.remove('on');this._stickDraw(null);},
 _hitBtn(x,y){const T=this.T;let best=null,bd=1e9;
  for(const id in T.el){const el=T.el[id];if(!el||!el.dataset||!el.dataset.b||el.hidden)continue;const r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,d=Math.hypot(x-cx,y-cy);
   if(d<r.width*0.62&&d<bd){bd=d;best=id;}}return best;},
 _press(pid,id,e){const T=this.T,E=this._e,el=T.el[id];
  switch(id){case 'fire':E.fireDown=true;T.btn.set(pid,'fire');T.look.set(pid,{x:e.clientX,y:e.clientY});break; // el botón de disparo también sirve para mirar
   case 'ads':T.adsOn=!T.adsOn;if(T.adsOn)E.adsDown=true;el.classList.toggle('on',T.adsOn);return;
   case 'jump':E.jump=true;break;case 'crouch':E.crouch=true;break;case 'reload':E.reload=true;break;case 'swap':E.swap=true;break;case 'melee':E.melee=true;break;
   case 'grenade':E.grenadeDown=true;T.btn.set(pid,'grenade');break;case 'use':E.useDown=true;T.btn.set(pid,'use');break;case 'pause':E.pause=true;break;}
  if(el){el.classList.add('on');if(!T.btn.has(pid))setTimeout(()=>{if(![...T.btn.values()].includes(id))el.classList.remove('on');},120);}},
 _stickMove(x,y){const T=this.T,s=T.stick,R=52;let dx=x-s.x,dy=y-s.y;const l=Math.hypot(dx,dy);
  // empujar más allá del borde hacia delante = correr
  T.sprint=-dy>R*1.35&&Math.abs(dx)<-dy*0.6;
  if(l>R*1.6){s.x+=dx*(1-R*1.6/l);s.y+=dy*(1-R*1.6/l);dx=x-s.x;dy=y-s.y;}
  const k=Math.min(1,l/R)/(l||1);T.mx=dx*k;T.mz=-dy*k;if(Math.hypot(T.mx,T.mz)<0.12)T.mx=T.mz=0;this._stickDraw(s,dx,dy);},
 _stickDraw(s,dx,dy){const el=this.T.el.stk;if(!el)return;
  if(!s){el.classList.add('idle');el.style.left=`calc(var(--sal) + 110px)`;el.style.top=`calc(100% - var(--sab) - 110px)`;el.firstChild.style.transform='';el.classList.remove('sp');return;}
  el.classList.remove('idle');el.style.left=s.x+'px';el.style.top=s.y+'px';const l=Math.hypot(dx,dy),m=Math.min(l,52)/(l||1);
  el.firstChild.style.transform=`translate(${dx*m}px,${dy*m}px)`;el.classList.toggle('sp',this.T.sprint);},
 // botón contextual de usar (texto o null para ocultarlo)
 touchUse(text){const el=this.T.el.use;if(!el)return;const on=!!text;if(el.hidden===!on&&(!on||el._t===text))return;el.hidden=!on;el._t=text;if(on)el.lastChild.textContent=text;}
};
