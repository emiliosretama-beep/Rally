// ===== FRENTE 44 · soldados y vehículos: modelos por piezas instanciadas, zonas de impacto, muerte =====
// STUB fase 1: lo sustituye el módulo completo (40_actors.js). Soldados de cajas con piezas (cabeza, casco, torso, brazos, piernas, arma)
// dibujadas con instancias de matriz (una llamada por pieza), colores por bando, zonas de impacto, caída al morir y un carro de cajas.
const ACT_PK={head:4,torso:1,arm:0.75,leg:0.75};
const ACT_WPN={axis:{rifle:'kar98',smg:'mp40',mg:'stg44',officer:'mp40',sniper:'kar98s'},ally:{rifle:'garand',smg:'thompson',mg:'bar',officer:'thompson',sniper:'garand'}};
const ACT_COL={ally:{cloth:'#646744',helmet:'#4b5232',gear:'#7c7354'},axis:{cloth:'#5d6462',helmet:'#4f5552',gear:'#3c3a33'}};
const Actors={list:[],_id:0,P:null,_fr:-1,_M:new Float32Array(16),_L:new Float32Array(16),_T:new Float32Array(16),_U:new Float32Array(16),_H:new Float32Array(16),_blob:new Float32Array(10*64),
 clear(){this.list=[];this._id=0;},
 // {team:'ally'|'axis', kind:'rifle'|'smg'|'mg'|'officer'|'sniper', pos, yaw, name, weapon, tag, hero, health}
 spawn(o){o=o||{};const team=o.team||'axis',kind=o.kind||'rifle',p=o.pos?o.pos.slice():[0,0,0];if(p[1]==null||!isFinite(p[1]))p[1]=World.height(p[0],p[2]);
  const w=o.weapon||ACT_WPN[team][kind]||'kar98',d=WEAPONS[w];
  const a={id:++this._id,team,kind,name:o.name||null,tag:o.tag||null,hero:!!o.hero,pos:p,vel:[0,0,0],yaw:o.yaw||0,health:o.health||100,maxHealth:o.health||100,alive:true,
   stance:o.stance||'stand',aim:[o.yaw||0,0],weapon:w,mag:d?d.mag:10,anim:{ph:Math.random()*6,mv:0,fire:0,hit:0,die:0,dir:1,var:Math.random()},brain:null,goal:o.goal||null,
   onGround:true,deadT:0,tank:false,speed:0,data:o.data||{}};
  this.list.push(a);Bus.emit('spawn',{actor:a});return a;},
 // carro de combate de cajas {team, pos, yaw, health}
 spawnTank(o){const a=this.spawn(Object.assign({kind:'tank',weapon:'cannon',health:1200},o));a.tank=true;a.half=!!o.half;a.r=a.half?1.4:1.9;return a;},
 spawnHalftrack(o){return this.spawnTank(Object.assign({half:true,health:600},o));},
 byTag(tag){return this.list.filter(a=>a.tag===tag);},
 count(team,tag){let n=0;for(const a of this.list)if(a.alive&&(!team||a.team===team)&&(!tag||a.tag===tag))n++;return n;},
 height(a){return a.tank?(a.half?2.2:2.6):a.stance==='crouch'?1.25:1.8;},
 chest(a,o){o=o||[0,0,0];o[0]=a.pos[0];o[1]=a.pos[1]+(a.tank?1.5:a.stance==='crouch'?0.85:1.25);o[2]=a.pos[2];return o;},
 eye(a,o){o=o||[0,0,0];o[0]=a.pos[0];o[1]=a.pos[1]+(a.tank?2.4:a.stance==='crouch'?1.05:1.6);o[2]=a.pos[2];return o;},
 update(dt){let dead=0;
  for(const a of this.list){const A=a.anim;A.hit=Math.max(0,A.hit-dt*4);A.fire=Math.max(0,A.fire-dt*8);
   if(!a.alive){a.deadT+=dt;A.die=Math.min(1,a.deadT/0.65);dead++;continue;}
   a.vel[1]-=16*dt;const R=World.moveCapsule(a.pos,a.vel,a.tank?a.r:0.33,this.height(a),dt,a.onGround);a.onGround=R.onGround;
   a.speed=Math.hypot(a.vel[0],a.vel[2]);A.mv+=(Math.min(1,a.speed/3.5)-A.mv)*Math.min(1,dt*8);A.ph+=dt*a.speed*2.4;}
  // se retiran los cuerpos más antiguos
  if(dead>25){let k=dead-25;this.list=this.list.filter(a=>a.alive||k--<=0);}},
 // rayo contra soldados (cilindro con tapa de arriba) y carros (caja) -> {t, actor, part, normal, surface}
 raycast(o,d,maxT,ignore){let best=null,bt=maxT;
  for(const a of this.list){if(!a.alive||a===ignore)continue;const p=a.pos,H=this.height(a);
   if(a.tank){const c={x:p[0],y:p[1]+H/2,z:p[2],hx:a.half?1.2:1.7,hy:H/2,hz:a.half?3:3.3,c:Math.cos(a.yaw),s:Math.sin(a.yaw)},t=World._rayOBB(c,o,d,bt);
    if(t>=0&&t<bt){bt=t;best={t,actor:a,part:'hull',normal:World._hn.slice(),surface:'metal'};}continue;}
   const r=a.stance==='crouch'?0.4:0.34,ox=o[0]-p[0],oz=o[2]-p[2],A=d[0]*d[0]+d[2]*d[2];if(Math.abs(ox)>bt+1&&Math.abs(oz)>bt+1)continue;let t=-1;
   if(A>1e-8){const B=2*(ox*d[0]+oz*d[2]),C=ox*ox+oz*oz-r*r,ds=B*B-4*A*C;if(ds<0)continue;t=(-B-Math.sqrt(ds))/(2*A);}
   let y=o[1]+d[1]*t;if(t<0||y>p[1]+H){if(d[1]>=0)continue;const tc=(p[1]+H-o[1])/d[1],x=o[0]+d[0]*tc-p[0],z=o[2]+d[2]*tc-p[2];if(tc<0||x*x+z*z>r*r)continue;t=tc;y=p[1]+H;}
   if(y<p[1]||t>=bt)continue;const hx=o[0]+d[0]*t-p[0],hz=o[2]+d[2]*t-p[2],rel=(y-p[1])/H,lat=Math.abs(-Math.cos(a.yaw)*hx+Math.sin(a.yaw)*hz);
   const part=rel>0.84?'head':rel>0.47?(lat>0.2?'arm':'torso'):'leg';bt=t;best={t,actor:a,part,normal:V3.norm([hx,0,hz]),surface:'flesh'};}
  return best;},
 // daño por zona (cabeza x4, brazos/piernas x0.75; explosiones x1); emite 'hit' y 'kill'; héroes nunca mueren
 damage(a,dmg,part,info){if(!a||!a.alive)return;info=info||W_NO;const pos=info.pos||this.chest(a);
  if(a.tank&&!info.explosive){Bus.emit('hit',{actor:a,part:'hull',dmg:0,pos,by:info.by,kill:false});return;}
  const d=dmg*(info.explosive?1:ACT_PK[part]||1);a.anim.hit=1;a.lastHit=info;
  if(a.hero){a.health=Math.max(1,a.health-d);Bus.emit('hit',{actor:a,part,dmg:d,pos,by:info.by,kill:false});return;}
  a.health-=d;const kill=a.health<=0;Bus.emit('hit',{actor:a,part,dmg:d,pos,by:info.by,kill});if(kill)this.kill(a,info,part);},
 kill(a,info,part){if(!a.alive)return;a.alive=false;a.health=0;a.deadT=0;a.vel[0]=a.vel[2]=0;info=info||W_NO;
  const dir=info.dir||(info.by&&info.by.pos?V3.sub(a.pos,info.by.pos):[0,0,-1]);a.anim.dir=(Math.sin(a.yaw)*dir[0]+Math.cos(a.yaw)*dir[2])>0?-1:1; // cae hacia donde empuja el disparo
  if(a.brain&&a.brain.cover&&World.cover)World.cover.release(a.brain.cover,a);
  Bus.emit('kill',{actor:a,by:info.by,weapon:info.weapon,headshot:part==='head'});
  if(!a.tank&&a.team==='axis'&&typeof Weapons!=='undefined'){const d=WEAPONS[a.weapon];if(d&&!d.mounted)Weapons.drop(d,[a.pos[0]+Math.sin(a.yaw)*0.5,a.pos[1]+0.3,a.pos[2]+Math.cos(a.yaw)*0.5]);}},
 // ---------- dibujo ----------
 _parts(){if(this.P)return this.P;const P={},w=[1,1,1],mk=(k,f)=>{const g=new Geo();f(g);P[k]={m:GL.matInst(g),d:new Float32Array(19*16),n:0};};
  const boot=hex('#2e2a24'),skin=hex('#d1a27e'),belt=hex('#3d3a30'),wood=hex('#5c4128'),metal=hex('#2d2e30');
  mk('leg',g=>{g.bbox(-0.075,0.075,-0.86,0,-0.085,0.085,0.02,w);g.box(-0.08,0.08,-0.95,-0.84,-0.1,0.15,boot);});
  mk('torso',g=>{g.bbox(-0.2,0.2,-0.04,0.6,-0.12,0.12,0.04,w);g.box(-0.205,0.205,0.02,0.1,-0.125,0.125,belt);g.box(-0.16,0.16,0.2,0.48,-0.2,-0.12,hex('#8a8264'));g.box(-0.06,0.06,0.58,0.68,-0.06,0.06,skin);});
  mk('arm',g=>{g.bbox(-0.06,0.06,-0.56,0.04,-0.065,0.065,0.02,w);g.box(-0.055,0.055,-0.66,-0.55,-0.055,0.055,skin);});
  mk('head',g=>{g.rbox(-0.1,0.1,-0.11,0.12,-0.11,0.11,0.06,skin,2);g.box(-0.07,0.07,-0.02,0.02,0.1,0.115,hex('#b88e6c'));});
  mk('helmA',g=>{g.sphere(0.16,10,4,w,true);g.translate(0,0,0.02,0);g.cyl(0.165,0.17,0.0,0.03,10,w);g.scale(0,1,0.85,1.05);});
  mk('helmG',g=>{g.lathe([[0.2,-0.07],[0.17,-0.01],[0.155,0.03],[0.15,0.1],[0.11,0.17],[0,0.19]],10,w);g.translate(0,0,0.01,-0.01);});
  mk('cap',g=>{g.cyl(0.12,0.13,0.04,0.14,10,w);g.cyl(0.15,0.15,0.14,0.18,10,w);g.box(-0.08,0.08,0.03,0.05,0.08,0.17,hex('#222'));});
  mk('rifle',g=>{g.box(-0.025,0.025,-0.05,0.05,-0.45,0.35,wood);g.tube([0,0.02,0.3],[0,0.02,0.75],0.012,0.012,5,metal);});
  mk('smg',g=>{g.box(-0.025,0.025,-0.05,0.05,-0.3,0.22,metal);g.box(-0.015,0.015,-0.22,-0.04,0.0,0.06,metal);g.tube([0,0.0,0.2],[0,0.0,0.45],0.014,0.014,5,metal);});
  mk('hull',g=>{g.bbox(-1.55,1.55,0.45,1.55,-3.1,3.1,0.12,w);g.box(-1.75,-1.3,0.05,1.0,-3.3,3.3,hex('#2b2a27'));g.box(1.3,1.75,0.05,1.0,-3.3,3.3,hex('#2b2a27'));});
  mk('turret',g=>{g.bbox(-1.05,1.05,0,0.85,-1.3,1.2,0.1,w);g.cyl(0.25,0.25,0.85,1.1,8,w);});
  mk('barrel',g=>{g.tube([0,0,0],[0,0,3.2],0.09,0.075,8,w);g.box(-0.2,0.2,-0.2,0.2,-0.1,0.25,w);});
  return this.P=P;},
 _put(k,M,c){const p=this.P[k];if((p.n+1)*19>p.d.length){const d=new Float32Array(p.d.length*2);d.set(p.d);p.d=d;}p.d.set(M,p.n*19);p.d[p.n*19+16]=c[0];p.d[p.n*19+17]=c[1];p.d[p.n*19+18]=c[2];p.n++;},
 // pieza = base · local(pos, giros)
 _part(k,base,pos,yaw,pitch,roll,c){M4.compose(pos,yaw,pitch,roll,1,this._L);M4.mul(base,this._L,this._T);this._put(k,this._T,c);return this._T;},
 _build(){const P=this._parts();for(const k in P)P[k].n=0;const W1=[1,1,1];let nb=0;
  for(const a of this.list){const A=a.anim,C=ACT_COL[a.team]||ACT_COL.axis,cl=hex(C.cloth),hl=hex(C.helmet);
   if(a.tank){const b=M4.compose(a.pos,a.yaw,0,0,1,this._M),tc=hex(a.team==='ally'?'#4f5634':'#55594f');this._part('hull',b,[0,0,0],0,0,0,a.alive?tc:[0.2,0.19,0.18]);
    if(!a.half){const tb=this._part('turret',b,[0,1.55,-0.3],angNorm(a.aim[0]-a.yaw),0,0,a.alive?tc:[0.2,0.19,0.18]);this._U.set(tb);this._part('barrel',this._U,[0,0.5,1.1],0,a.aim[1]||0,0,a.alive?tc:[0.2,0.19,0.18]);}continue;}
   const k=a.alive?0:smooth(A.die),cr=a.stance==='crouch'&&a.alive,hip=cr?0.58:0.95,sw=Math.sin(A.ph)*0.55*A.mv;
   const b=M4.compose([a.pos[0],a.pos[1]+(a.alive?0:k*0.12),a.pos[2]],a.yaw,k*A.dir*1.45,0,1,this._M);
   const lean=cr?0.25:0.06*A.mv,ap=a.alive?clamp(a.aim[1]||0,-0.6,0.6):0;
   this._part('leg',b,[0.1,hip,cr?0.05:0],0,cr?1.25:sw,0,cl);this._part('leg',b,[-0.1,hip,cr?0.05:0],0,cr?0.35:-sw,0,cl);
   const tb=this._part('torso',b,[0,hip,0],0,-lean,0,cl);this._U.set(tb);const T=this._U;
   const hb=this._part('head',T,[0,0.76,0],0,ap*0.5,0,W1);const H=this._H;H.set(hb);
   if(a.kind==='officer')this._part('cap',H,[0,0.06,0],0,0,0,cl);else this._part(a.team==='ally'?'helmA':'helmG',H,[0,0.06,0],0,0,0,hl);
   const aim=a.alive?1.35+ap:0.2*k,fire=A.fire*0.08;
   this._part('arm',T,[-0.25,0.55,0],-0.15,aim-fire,0,cl);this._part('arm',T,[0.25,0.55,0],0.35,aim+0.12,0,cl);
   if(a.alive){const wd=WEAPONS[a.weapon];this._part(wd&&(wd.cls==='smg'||wd.cls==='pistol')?'smg':'rifle',T,[-0.06,0.38,0.32-fire],0,ap,0,W1);}
   if(a.alive&&nb<64){const o=nb*10;this._blob[o]=a.pos[0];this._blob[o+1]=a.pos[1]+0.03;this._blob[o+2]=a.pos[2];this._blob[o+3]=a.yaw;this._blob[o+4]=0.45;this._blob[o+5]=0.45;this._blob[o+6]=0.45;nb++;}}
  for(const k in P)if(P[k].n)GL.setMatInst(P[k].m,P[k].d,P[k].n);this._nb=nb;},
 draw(pass,ci){if(!this.list.length||!GL.gl)return;if(this._fr!==GL.frameNo){this._fr=GL.frameNo;this._build();}const gl=GL.gl,P=this.P;
  const p=pass==='shadow'?GL.progs.depth:GL.progs.lit;if(pass!=='shadow')Lit.setup(p);gl.uniform1f(p.u.uInst,2);
  for(const k in P)if(P[k].n){if(pass!=='shadow')gl.uniform1f(p.u.uGloss,k==='helmA'||k==='helmG'||k==='hull'||k==='turret'?0.3:0);GL.draw(P[k].m);}
  gl.uniform1f(p.u.uInst,0);if(pass!=='shadow'){gl.uniform1f(p.u.uGloss,0);if(!Shadow.active&&this._nb)GL.drawBlobs(this._blob,this._nb);}}
};
Bus.on('glRestored',()=>{Actors.P=null;Actors._fr=-1;});
