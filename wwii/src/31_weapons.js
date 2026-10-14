// ===== FRENTE 44 · armas: tabla WEAPONS, disparo por rayo, granadas, cohetes, armas en el suelo y arma en primera persona =====
// STUB fase 1: lo sustituye el módulo completo (31_weapons.js). Mantiene la API de DESIGN §4 (y lo añadido en «API extra de Weapons»).
// spread en radianes (cadera / apuntando / extra al moverse a toda velocidad); recoil [sube, lado]; reload [táctica, vacía] en s;
// fall [m sin caída, m al mínimo, factor mínimo]; adsFov en grados (FOV vertical al apuntar).
const WEAPONS={
 garand:{name:'M1 Garand',side:'ally',cls:'rifle',mode:'semi',dmg:75,rpm:330,mag:8,ammo:96,spread:[0.04,0.0025,0.03],recoil:[0.032,0.008],reload:[2.1,2.0],range:450,fall:[60,250,0.7],adsFov:42,adsT:0.22,move:0.95,model:'rifle',ping:true},
 thompson:{name:'Thompson',side:'ally',cls:'smg',mode:'auto',dmg:30,rpm:700,mag:30,ammo:180,spread:[0.055,0.012,0.025],recoil:[0.011,0.006],reload:[2.4,3.0],range:160,fall:[20,70,0.55],adsFov:50,adsT:0.18,move:1,model:'smg',tracer:4},
 bar:{name:'B.A.R.',side:'ally',cls:'lmg',mode:'auto',dmg:46,rpm:550,mag:20,ammo:140,spread:[0.07,0.008,0.035],recoil:[0.02,0.008],reload:[2.6,3.1],range:320,fall:[50,200,0.7],adsFov:45,adsT:0.26,move:0.88,model:'bar',tracer:3},
 colt:{name:'M1911',side:'ally',cls:'pistol',mode:'semi',dmg:42,rpm:420,mag:7,ammo:49,spread:[0.03,0.007,0.02],recoil:[0.03,0.01],reload:[1.5,1.8],range:70,fall:[15,45,0.5],adsFov:55,adsT:0.14,move:1.05,model:'pistol'},
 kar98:{name:'Kar98k',side:'axis',cls:'rifle',mode:'bolt',dmg:105,rpm:55,mag:5,ammo:60,spread:[0.05,0.0012,0.035],recoil:[0.05,0.01],reload:[2.7,3.0],range:500,fall:[80,300,0.75],adsFov:40,adsT:0.24,move:0.95,model:'rifle'},
 kar98s:{name:'Kar98k (visor)',side:'axis',cls:'sniper',mode:'bolt',dmg:115,rpm:50,mag:5,ammo:40,spread:[0.07,0,0.05],recoil:[0.05,0.01],reload:[2.9,3.2],range:600,fall:[100,400,0.8],adsFov:14,adsT:0.3,move:0.92,model:'rifle',scope:true,adsSens:0.3},
 mp40:{name:'MP40',side:'axis',cls:'smg',mode:'auto',dmg:28,rpm:500,mag:32,ammo:192,spread:[0.055,0.011,0.025],recoil:[0.01,0.005],reload:[2.4,3.0],range:150,fall:[20,65,0.55],adsFov:50,adsT:0.18,move:1,model:'smg',tracer:4},
 stg44:{name:'StG 44',side:'axis',cls:'smg',mode:'auto',dmg:36,rpm:560,mag:30,ammo:180,spread:[0.06,0.009,0.03],recoil:[0.016,0.007],reload:[2.4,2.9],range:260,fall:[40,160,0.65],adsFov:46,adsT:0.22,move:0.96,model:'smg',tracer:4},
 mg42mount:{name:'MG42',side:'axis',cls:'mg',mode:'auto',dmg:42,rpm:1150,mag:250,ammo:0,spread:[0.022,0.022,0],recoil:[0.006,0.004],reload:[4,4],range:450,fall:[80,300,0.7],adsFov:48,adsT:0.01,move:0,model:'mg',tracer:3,mounted:true,loud:1.6},
 bazooka:{name:'Bazooka',side:'ally',cls:'launcher',mode:'rocket',dmg:450,radius:6,rpm:30,mag:1,ammo:5,spread:[0.03,0.004,0.03],recoil:[0.06,0.01],reload:[3.4,3.4],range:300,speed:75,adsFov:45,adsT:0.3,move:0.82,model:'tube'},
 frag:{name:'Granada Mk 2',side:'ally',cls:'grenade',dmg:190,radius:7.5,fuse:4.0,count:4},
 stiel:{name:'Granada de palo',side:'axis',cls:'grenade',dmg:190,radius:7.5,fuse:4.5,count:4},
 knife:{name:'Cuchillo',side:'ally',cls:'melee',dmg:200,range:1.9}
};
for(const k in WEAPONS)WEAPONS[k].id=k;
const Weapons={inv:{w:[null,null,null],cur:0,nades:4,nadeT:'frag'},adsAmt:0,spread:0.04,pickups:[],grenades:[],rockets:[],
 st:'idle',t:0,T:1,fireT:0,swapTo:-1,cook:-1,mountW:null,mountU:null,kick:0,flash:0,bloom:0,heat:0,_tc:0,_wz:0,M:{},_m:new Float32Array(16),_m2:new Float32Array(16),
 reset(){this.inv={w:[null,null,null],cur:0,nades:4,nadeT:'frag'};this.pickups=[];this.grenades=[];this.rockets=[];this.st='idle';this.t=0;this.cook=-1;this.adsAmt=0;this.mountW=this.mountU=null;this.heat=0;},
 // equipo: ['garand','colt','frag:4'] o {id, mag, ammo}
 setLoadout(list){this.reset();const I=this.inv;let pi=0;
  for(const e of list||[]){const o=typeof e==='string'?{id:e.split(':')[0],n:+e.split(':')[1]||0}:e,d=WEAPONS[o.id];if(!d)continue;
   if(d.cls==='grenade'){I.nadeT=o.id;I.nades=o.n||d.count;continue;}if(d.cls==='melee')continue;
   const w={id:o.id,mag:o.mag!=null?o.mag:d.mag,ammo:o.ammo!=null?o.ammo:d.ammo};if(d.cls==='pistol')I.w[2]=w;else if(pi<2)I.w[pi++]=w;}
  I.cur=I.w[0]?0:I.w[1]?1:2;},
 snapshot(){return JSON.parse(JSON.stringify(this.inv));},
 restore(s){this.reset();this.inv=JSON.parse(JSON.stringify(s));},
 cur(){return this.mountW||this.inv.w[this.inv.cur];},
 def(){const w=this.cur();return w?WEAPONS[w.id]:null;},
 has(id){return this.inv.w.some(w=>w&&w.id===id);},
 busy(){return this.st==='melee'||this.st==='throw';},
 moveK(){const d=this.def();return d&&d.move?d.move:1;},
 adsSens(){const d=this.def();return d&&d.adsSens||0.55;},
 adsFov(base){const d=this.def();return d&&d.adsFov?d.adsFov:base*0.75;},
 refill(){for(const w of this.inv.w)if(w){const d=WEAPONS[w.id];w.ammo=d.ammo;}this.inv.nades=Math.max(this.inv.nades,4);},
 // ---------- jugador ----------
 update(dt,cmd){const P=Player;this._updProj(dt);this._updPickups(dt);this.flash=Math.max(0,this.flash-dt);this.kick=Math.max(0,this.kick-dt*9);this.bloom=Math.max(0,this.bloom-dt*0.25);
  if(!P.alive){this.adsAmt=Math.max(0,this.adsAmt-dt*4);return;}
  this.t-=dt;this.fireT-=dt;this.heat=Math.max(0,this.heat-dt*(this.st==='hot'?0.5:0.3));const I=this.inv;
  if(this.st!=='idle'&&this.t<=0)this._finish();
  let w=this.cur(),d=w?WEAPONS[w.id]:null;
  // cambiar de arma
  if(!this.mountW&&(this.st==='idle'||this.st==='reload'||this.st==='bolt')){let to=-1;
   if(cmd.slot)to=cmd.slot-1;else if(cmd.swap)to=I.cur===0&&I.w[1]?1:I.cur===1&&I.w[0]?0:I.w[0]?0:I.w[1]?1:-1;
   else if(cmd.next||cmd.prev){for(let k=1;k<3;k++){const j=(I.cur+(cmd.next?k:3-k))%3;if(I.w[j]){to=j;break;}}}
   if(to>=0&&to!==I.cur&&I.w[to]){this.st='swap';this.t=this.T=0.55;this.swapTo=to;}}
  // cuchillo
  if(cmd.melee&&(this.st==='idle'||this.st==='bolt'||this.st==='reload')){this.st='melee';this.t=this.T=0.6;this._mh=true;Bus.emit('melee',{by:P});}
  if(this.st==='melee'&&this._mh&&this.T-this.t>0.14){this._mh=false;this._melee(P);}
  // granada: mantener para cocinarla, soltar para lanzar
  if(cmd.grenadeDown&&I.nades>0&&this.cook<0&&(this.st==='idle'||this.st==='bolt')&&!this.mountW){this.cook=0;Bus.emit('pin',{by:P});}
  if(this.cook>=0){this.cook+=dt;const gd=WEAPONS[I.nadeT];if(!cmd.grenade||this.cook>=gd.fuse){const fwd=P.dir([0,0,0]),e=P.eye();
    const v=V3.add(V3.scale(fwd,17),[P.vel[0]*0.5,3.2,P.vel[2]*0.5]);this.throwGrenade(P,V3.madd(e,fwd,0.4),v,I.nadeT,gd.fuse-this.cook);I.nades--;this.cook=-1;this.st='throw';this.t=this.T=0.5;}}
  // recargar
  if(w&&d&&!d.mounted&&this.st==='idle'&&w.ammo>0&&w.mag<d.mag&&(cmd.reload||(w.mag===0&&this.fireT<-0.15))){this.st='reload';this.t=this.T=w.mag>0?d.reload[0]:d.reload[1];Bus.emit('reload',{by:P,weapon:w.id});}
  // apuntar
  const canAds=d&&(this.st==='idle'||this.st==='bolt')&&!P.sprinting&&this.cook<0;
  this.adsAmt=clamp(this.adsAmt+(cmd.ads&&canAds?1:-1)*dt/((d&&d.adsT)||0.2),0,1);
  // disparar
  if(w&&d&&this.st==='idle'&&this.fireT<=0&&!P.sprinting&&this.cook<0){const want=d.mode==='auto'?cmd.fire:cmd.fireDown;
   if(want){if(w.mag>0){this._shoot(P,w,d);if(d.mode==='bolt'&&w.mag>0){this.st='bolt';this.t=this.T=60/d.rpm;}}else if(cmd.fireDown){Bus.emit('dryfire',{by:P});this.fireT=0.2;}}}
  // dispersión actual (para la retícula)
  if(d&&d.spread){const s=d.spread,mv=clamp(P.speed/PL.walk,0,1.5);this.spread=(lerp(s[0],s[1],this.adsAmt)+s[2]*mv*(1-this.adsAmt*0.6)+(P.onGround?0:0.05)+this.bloom)*(P.stance==='crouch'?0.8:1);}},
 _finish(){const I=this.inv,w=this.cur();
  if(this.st==='reload'&&w){const d=WEAPONS[w.id],n=Math.min(d.mag-w.mag,w.ammo);w.mag+=n;w.ammo-=n;}
  else if(this.st==='swap'&&this.swapTo>=0){I.cur=this.swapTo;this.swapTo=-1;this.st='raise';this.t=this.T=0.3;return;}
  this.st='idle';},
 _shoot(P,w,d){w.mag--;this.fireT=60/d.rpm;const ads=this.adsAmt,e=P.eye(),f=P.dir([0,0,0]),sp=this.spread,a=Math.random()*6.283,r=sp*Math.sqrt(Math.random());
  const rt=[-Math.cos(P.yaw),0,Math.sin(P.yaw)],up=V3.cross(rt,f),dir=V3.norm([f[0]+(rt[0]*Math.cos(a)+up[0]*Math.sin(a))*r,f[1]+up[1]*Math.sin(a)*r,f[2]+(rt[2]*Math.cos(a)+up[2]*Math.sin(a))*r]);
  const mz=V3.madd(V3.madd(V3.madd(e,f,0.8),rt,ads>0.5?0.02:0.13),up,ads>0.5?-0.05:-0.11);this._muz=mz;
  if(d.mode==='rocket'){this.rockets.push({pos:V3.madd(e,f,0.9),vel:V3.scale(dir,d.speed),owner:P,t:5,def:d,st:0});Bus.emit('shot',{pos:e,dir,weapon:w.id,by:P,loud:1.3});}
  else this.fire(P,d,e,dir,{muzzle:mz});
  P.kick(d.recoil[0]*(1-0.35*ads)*(P.stance==='crouch'?0.8:1),(Math.random()-0.5)*2*d.recoil[1]);this.kick=1;this.flash=0.05;this.bloom=Math.min(0.06,this.bloom+(d.mode==='auto'?0.006:0.01));
  if(d.mounted){this.heat+=0.011;if(this.heat>=1){this.st='hot';this.t=this.T=2.2;}}
  if(typeof FX!=='undefined')FX.muzzle(mz,dir,d.cls==='pistol'?0.6:1,true);
  if(d.ping&&w.mag===0)Bus.emit('ping',{pos:e,by:P});},
 _melee(P){const e=P.eye(),f=P.dir([0,0,0]);let best=null,bd=WEAPONS.knife.range;
  for(const a of Actors.list){if(!a.alive||a.team===P.team)continue;const c=[a.pos[0],a.pos[1]+1.1,a.pos[2]],v=V3.sub(c,e),l=V3.len(v);if(l<bd&&V3.dot(v,f)/l>0.6){bd=l;best=a;}}
  if(best)Actors.damage(best,WEAPONS.knife.dmg,'torso',{by:P,weapon:'knife',dir:f,pos:[best.pos[0],best.pos[1]+1.1,best.pos[2]]});
  else{const h=World.raycast(e,f,1.8,{});if(h){if(typeof FX!=='undefined')FX.impact(h.pos,h.normal,h.surface);Bus.emit('impact',{pos:h.pos,normal:h.normal,surface:h.surface,by:P});}}},
 // ---------- disparo de cualquiera (jugador o IA): rayo con penetración de madera fina, daño, marcas, trazadoras ----------
 dmgAt(d,t){const f=d.fall;if(!f||t<=f[0])return d.dmg;return d.dmg*(t>=f[1]?f[2]:lerp(1,f[2],(t-f[0])/(f[1]-f[0])));},
 fire(owner,def,origin,dir,opts){opts=opts||W_NO;const isP=owner===Player,range=def.range||300;
  Bus.emit('shot',{pos:origin,dir,weapon:def.id,by:owner,loud:def.loud||1});
  const h=World.raycast(origin,dir,range,{actors:true,ignore:isP?null:owner,pierce:1});let tEnd=h?h.t:range;
  // contra el jugador (las balas de los demás)
  if(!isP&&Player.alive&&owner&&owner.team!=='ally'){const tp=this._rayPlayer(origin,dir,tEnd);
   if(tp>=0){Player.damage(this.dmgAt(def,tp)*(opts.k||1),origin,owner);this._tracer(owner,def,origin,dir,tp,opts);return {t:tp,player:true};}
   const e=Player.eye(),v=V3.sub(e,origin),tc=clamp(V3.dot(v,dir),0,tEnd);if(tc>2){const q=V3.madd(origin,dir,tc),dd=V3.dist(q,e);if(dd<1.6&&dd>0.3&&Player.time-(this._wh||0)>0.12){this._wh=Player.time;Bus.emit('whizz',{pos:q,by:owner});}}}
  if(h){const dm=this.dmgAt(def,h.t)*(opts.k||1)*(h.through&&h.through.length?0.6:1);
   if(h.through&&typeof FX!=='undefined')for(const q of h.through)FX.impact(q.pos,q.normal,q.surface);
   if(h.actor){if(!(owner&&h.actor.team===owner.team))Actors.damage(h.actor,dm,h.part,{by:owner,weapon:def.id,dir,pos:h.pos});if(typeof FX!=='undefined')FX.blood(h.pos,dir);}
   else{if(typeof FX!=='undefined')FX.impact(h.pos,h.normal,h.surface);Bus.emit('impact',{pos:h.pos,normal:h.normal,surface:h.surface,by:owner});if(h.col&&h.col.hp)World.damage(h.col,dm,{by:owner});}}
  this._tracer(owner,def,origin,dir,tEnd,opts);return h;},
 _tracer(owner,def,o,dir,t,opts){if(typeof FX==='undefined')return;const isP=owner===Player;if(!(def.tracer&&(++this._tc)%def.tracer===0)&&(isP||Math.random()>0.35))return;
  const a=opts.muzzle||V3.madd(o,dir,0.8);FX.tracer(a,V3.madd(o,dir,Math.min(t,def.range||300)));},
 // rayo contra la cápsula del jugador -> t | -1
 _rayPlayer(o,d,maxT){const p=Player.pos,r=0.38,h=Player.height()+0.1,ox=o[0]-p[0],oz=o[2]-p[2],a=d[0]*d[0]+d[2]*d[2];if(a<1e-8)return -1;
  const b=2*(ox*d[0]+oz*d[2]),c=ox*ox+oz*oz-r*r,ds=b*b-4*a*c;if(ds<0)return -1;const t=(-b-Math.sqrt(ds))/(2*a);if(t<0||t>maxT)return -1;const y=o[1]+d[1]*t;return y>=p[1]&&y<=p[1]+h?t:-1;},
 // ---------- granadas y cohetes ----------
 throwGrenade(owner,pos,vel,type,fuse){const d=WEAPONS[type]||WEAPONS.frag;this.grenades.push({pos:pos.slice(),vel:vel.slice(),t:fuse==null?d.fuse:fuse,type:d.id,owner,rest:false,spin:0});Bus.emit('throw',{by:owner,type:d.id});},
 _updProj(dt){const G=this.grenades;for(let i=G.length-1;i>=0;i--){const g=G[i];g.t-=dt;
   if(!g.rest){g.vel[1]-=14*dt;const sp=V3.len(g.vel),l=sp*dt;if(l>1e-5){const dir=V3.scale(g.vel,1/sp),h=World.raycast(g.pos,dir,l+0.06,{});
     if(h){V3.madd(h.pos,h.normal,0.06,g.pos);const vn=V3.dot(g.vel,h.normal);V3.madd(g.vel,h.normal,-vn*1.4,g.vel);V3.scale(g.vel,0.6,g.vel);if(Math.abs(vn)>2)Bus.emit('grenadeBounce',{pos:g.pos.slice()});
      if(V3.len(g.vel)<0.8&&h.normal[1]>0.5)g.rest=true;}else V3.madd(g.pos,g.vel,dt,g.pos);}g.spin+=dt*12;}
   if(g.t<=0){G.splice(i,1);const d=WEAPONS[g.type];this.explode(g.pos,d.radius,d.dmg,g.owner,{grenade:true});}}
  const R=this.rockets;for(let i=R.length-1;i>=0;i--){const r=R[i];r.t-=dt;r.st+=dt;const sp=V3.len(r.vel),dir=V3.scale(r.vel,1/sp),h=World.raycast(r.pos,dir,sp*dt,{actors:true,ignore:r.owner});
   if(r.st>0.02&&typeof FX!=='undefined'){r.st=0;FX.smoke(r.pos,{puff:true,size:0.35,life:1.2});}
   if(h||r.t<=0){R.splice(i,1);this.explode(h?V3.madd(h.pos,h.normal||[0,1,0],0.2):r.pos,r.def.radius,r.def.dmg,r.owner,{rocket:true,actor:h&&h.actor});}else V3.madd(r.pos,r.vel,dt,r.pos);}},
 // explosión: daño con caída y sin atravesar paredes, a soldados, jugador y destruibles; efectos y aviso por el Bus
 explode(pos,r,dmg,by,opts){opts=opts||W_NO;if(typeof FX!=='undefined')FX.explosion(pos,r);Bus.emit('explosion',{pos:pos.slice(),radius:r,dmg,by});
  const up=[pos[0],pos[1]+0.4,pos[2]];
  for(const a of Actors.list){if(!a.alive)continue;const c=[a.pos[0],a.pos[1]+0.9,a.pos[2]],d=V3.dist(c,pos);if(d>r+(a.tank?2:0))continue;if(a.tank&&!opts.rocket&&!opts.charge)continue;
   if(a!==opts.actor&&!World.los(up,c))continue;const k=a===opts.actor?1:Math.pow(clamp(1-d/(r+0.5),0,1),1.1);Actors.damage(a,dmg*k,'torso',{by,weapon:opts.grenade?'frag':opts.rocket?'bazooka':'explosion',explosive:true,pos:c});}
  if(Player.alive){const e=Player.eye(),d=Math.min(V3.dist(e,pos),V3.dist(Player.pos,pos));if(d<r&&World.los(up,e)){const k=Math.pow(clamp(1-d/r,0,1),1.2);Player.damage(dmg*k*(by===Player?0.75:1),pos,by===Player?null:by);}}
  World.blast(pos,r,dmg,by);},
 // ---------- armas en el suelo ----------
 drop(def,pos,ammo){if(!def||def.cls==='grenade'||def.mounted)return null;const y=World.groundAt(pos[0],pos[2],0.1,pos[1]+0.5)+0.06;
  const q={id:def.id,pos:[pos[0],y,pos[2]],yaw:Math.random()*6.28,mag:def.mag,ammo:ammo!=null?ammo:Math.round(def.mag*(1+Math.random()*2)),t:0};
  this.pickups.push(q);if(this.pickups.length>18)this.pickups.shift();return q;},
 // recoger: cambia por el arma en la mano (la otra queda en el suelo)
 pickup(q){const I=this.inv,i=this.pickups.indexOf(q);if(i<0)return;const d=WEAPONS[q.id];if(!d)return;
  if(this.has(q.id)){this._takeAmmo(q);return;}this.pickups.splice(i,1);
  const slot=d.cls==='pistol'?2:!I.w[0]?0:!I.w[1]?1:I.cur===2?0:I.cur;
  const old=I.w[slot];if(old)this.drop(WEAPONS[old.id],[Player.pos[0],Player.pos[1],Player.pos[2]],old.ammo+old.mag);
  I.w[slot]={id:q.id,mag:q.mag,ammo:q.ammo};I.cur=slot;this.st='raise';this.t=this.T=0.4;Bus.emit('pickup',{id:q.id});},
 _takeAmmo(q){const w=this.inv.w.find(w=>w&&w.id===q.id);if(!w)return;const d=WEAPONS[q.id],n=Math.min(d.ammo-w.ammo,q.ammo+q.mag);if(n<=0)return;w.ammo+=n;
  let left=q.ammo+q.mag-n;q.mag=0;q.ammo=left;if(left<=0)this.pickups.splice(this.pickups.indexOf(q),1);Bus.emit('ammo',{id:q.id,n});},
 _updPickups(dt){if(!Player.alive)return;for(const q of this.pickups.slice()){q.t+=dt;if(this.has(q.id)&&V3.distXZ(q.pos,Player.pos)<1.3&&Math.abs(q.pos[1]-Player.pos[1])<1.5)this._takeAmmo(q);}},
 // ---------- ametralladora fija ----------
 mount(u){this.mountU=u;this.mountW={id:u.weapon||'mg42mount',mag:1e9,ammo:0};this.st='raise';this.t=this.T=0.3;this.adsAmt=0;},
 unmount(){this.mountU=this.mountW=null;this.st='raise';this.t=this.T=0.3;},
 // ---------- dibujo: arma en primera persona (con manos) y armas/granadas en el mundo ----------
 _model(id,arms){const k=id+(arms?'+':'');if(this.M[k])return this.M[k];const g=new Geo(),wd=hex('#6e4a2c'),mt=hex('#2f3032'),dk=hex('#232325'),ol=hex('#5d6440'),sk=hex('#c99a76');
  if(id==='rifle'||id==='bar'){g.bbox(-0.028,0.028,-0.12,-0.035,-0.46,0.08,0.012,wd);g.bbox(-0.024,0.024,-0.065,-0.012,-0.06,0.2,0.008,mt);g.bbox(-0.026,0.026,-0.075,-0.025,0.18,0.56,0.01,wd);
   g.tube([0,-0.035,0.18],[0,-0.035,id==='bar'?0.86:0.8],0.011,0.01,8,mt);g.box(-0.0035,0.0035,-0.03,0.0015,id==='bar'?0.84:0.78,id==='bar'?0.85:0.79,dk);g.box(-0.014,0.014,-0.022,-0.012,-0.01,0.012,dk);g.box(-0.014,-0.006,-0.012,0.006,-0.004,0.006,dk);g.box(0.006,0.014,-0.012,0.006,-0.004,0.006,dk);
   if(id==='bar'){g.box(-0.02,0.02,-0.2,-0.06,0.02,0.12,dk);g.beam([0,-0.04,0.6],[0.05,-0.25,0.68],0.008,0.008,dk);g.beam([0,-0.04,0.6],[-0.05,-0.25,0.68],0.008,0.008,dk);}}
  else if(id==='smg'){g.bbox(-0.026,0.026,-0.11,-0.04,-0.36,0.02,0.01,wd);g.bbox(-0.025,0.025,-0.07,-0.01,-0.06,0.24,0.008,mt);g.tube([0,-0.035,0.22],[0,-0.035,0.48],0.012,0.012,8,mt);
   g.box(-0.016,0.016,-0.24,-0.07,0.08,0.13,dk);g.bbox(-0.02,0.02,-0.16,-0.06,-0.04,0.02,0.008,wd);g.box(-0.004,0.004,-0.03,0.0,0.46,0.47,dk);g.box(-0.01,0.01,-0.014,0.004,-0.03,-0.01,dk);}
  else if(id==='pistol'){g.bbox(-0.016,0.016,-0.04,-0.004,-0.06,0.14,0.006,mt);g.bbox(-0.015,0.015,-0.14,-0.03,-0.06,-0.005,0.006,dk);g.box(-0.003,0.003,-0.006,0.002,0.12,0.13,dk);}
  else if(id==='mg'){g.bbox(-0.035,0.035,-0.1,-0.02,-0.25,0.18,0.01,mt);g.tube([0,-0.05,0.15],[0,-0.05,0.75],0.028,0.028,8,dk);g.tube([0,-0.05,0.7],[0,-0.05,0.9],0.012,0.012,6,mt);
   g.bbox(-0.03,0.03,-0.12,-0.04,-0.55,-0.25,0.01,dk);g.box(-0.02,0.08,-0.16,-0.06,-0.05,0.08,hex('#59513b'));g.box(-0.004,0.004,-0.02,0.004,0.6,0.61,dk);}
  else if(id==='tube'){g.tube([0,-0.06,-0.55],[0,-0.06,0.9],0.045,0.045,10,hex('#4c5636'));g.box(-0.012,0.012,-0.17,-0.1,0.0,0.06,wd);g.box(-0.012,0.012,-0.17,-0.1,0.3,0.36,wd);g.box(-0.004,0.004,-0.015,0.004,0.1,0.11,dk);}
  if(arms){const hand=(p)=>{const m=g.mark();g.rbox(-0.028,0.028,-0.035,0.035,-0.045,0.045,0.015,sk,2);g.translate(m,p[0],p[1],p[2]);};
   const rh=id==='pistol'?[0,-0.085,-0.03]:id==='tube'?[0,-0.15,0.03]:[0,-0.1,-0.06],lh=id==='pistol'?[0.012,-0.1,-0.015]:id==='tube'?[0.01,-0.13,0.33]:[0.01,-0.085,id==='smg'?0.3:0.36];
   hand(rh);hand(lh);g.beam([rh[0],rh[1]-0.01,rh[2]-0.03],[-0.08,-0.3,-0.42],0.07,0.075,ol);g.beam([lh[0],lh[1]-0.01,lh[2]-0.02],[0.16,-0.32,lh[2]-0.4],0.07,0.075,ol);}
  return this.M[k]=GL.fromGeo(g);},
 _mflash(){if(this.M.flash)return this.M.flash;const g=new Geo(),c=[3.2,2.4,1.1];for(let i=0;i<5;i++){const a=i/5*Math.PI*2;g.tri([0,0,0],[Math.cos(a)*0.05,Math.sin(a)*0.05,0.04],[Math.cos(a+0.6)*0.02,Math.sin(a+0.6)*0.02,0.1],c,false);}
  g.tri([-0.03,0,0],[0.03,0,0],[0,0,0.16],c,false);g.tri([0,-0.03,0],[0,0.03,0],[0,0,0.16],c,false);return this.M.flash=GL.fromGeo(g);},
 _ball(){return this.M.ball||(this.M.ball=(()=>{const g=new Geo();g.sphere(0.055,8,5,hex('#3d4a2e'));g.box(-0.01,0.01,0.05,0.08,-0.01,0.01,hex('#888'));return GL.fromGeo(g);})());},
 drawViewmodel(){const P=Player;if(!P.alive||!GL.gl)return;const w=this.cur();if(!w)return;const d=WEAPONS[w.id],gl=GL.gl,ads=smooth(this.adsAmt),B=P.bob;
  if(d.scope&&ads>0.85){Post.fx.scope=ads;return;}Post.fx.scope=0;
  const hip=d.model==='pistol'?[-0.13,-0.11,0.3]:d.model==='tube'?[-0.11,-0.06,0.12]:d.model==='mg'?[-0.05,-0.08,0.3]:[-0.15,-0.12,0.24],aim=d.model==='tube'?[0,0.0,0.05]:[0,-0.002,d.model==='pistol'?0.3:0.21];
  let x=lerp(hip[0],aim[0],ads),y=lerp(hip[1],aim[1],ads),z=lerp(hip[2],aim[2],ads),rp=0,ry=0,rr=0;const amb=1-ads*0.85;
  // balanceo, inercia del giro, retroceso, carrera y animaciones de estado
  x+=B.x*0.6*amb;y+=B.y*0.5*amb;const dy=angNorm(P.yaw-(this._ly==null?P.yaw:this._ly));this._ly=P.yaw;this._sw=lerp(this._sw||0,clamp(dy*2.5,-0.06,0.06),0.2);x+=this._sw*amb;ry+=this._sw*0.6;
  z-=this.kick*(d.model==='pistol'?0.03:0.045);rp+=this.kick*(d.model==='pistol'?0.12:0.05);
  const spr=this._spr=lerp(this._spr||0,P.sprinting?1:0,0.15);x+=spr*0.05;y-=spr*0.04;ry+=spr*0.6;rr+=spr*0.35;
  const u=this.T>0?clamp(1-this.t/this.T,0,1):1,s=Math.sin(u*Math.PI);
  if(this.st==='reload'){y-=s*0.1;rr+=s*0.6;rp-=s*0.25;}else if(this.st==='swap'){y-=smooth(u)*0.35;}else if(this.st==='raise'){y-=(1-smooth(u))*0.35;}
  else if(this.st==='bolt'){rr+=s*0.25;y-=s*0.03;}else if(this.st==='melee'){z+=s*0.18;ry-=s*0.5;y+=s*0.03;}else if(this.st==='throw'||this.cook>=0){y-=0.25;}else if(this.st==='hot'){y-=0.03;}
  const m=this._model(d.model,!d.mounted),M=this._m;
  GL.drawViewmodel(d.model==='mg'?58:54,p=>{M4.compose([x,y,z],ry,rp,rr,1,M);M4.mul(Cam.M,M,this._m2);gl.uniformMatrix4fv(p.u.uModel,false,this._m2);gl.uniform1f(p.u.uGloss,0.3);GL.draw(m);gl.uniform1f(p.u.uGloss,0);
   if(this.flash>0){const fz=d.model==='pistol'?0.15:d.model==='smg'?0.5:d.model==='tube'?0.9:0.82;M4.translate(this._m2,0,d.model==='tube'?-0.06:-0.035,fz);const q=this._m;q.set(this._m2);
    const sc=0.8+Math.random()*0.6;for(let i=0;i<3;i++){q[i]*=sc;q[4+i]*=sc;q[8+i]*=sc;}gl.uniformMatrix4fv(p.u.uModel,false,q);GL.draw(this._mflash());}},P.alive?1:0.6);},
 // armas tiradas, granadas y cohetes en el mundo (pass 'shadow' | 'main')
 drawWorld(pass){if(!GL.gl)return;const gl=GL.gl,p=pass==='shadow'?GL.progs.depth:GL.progs.lit,u=p.u,M=this._m;if(pass!=='shadow')Lit.setup(p);
  for(const q of this.pickups){const d=WEAPONS[q.id];if(!d||!d.model)continue;M4.compose([q.pos[0],q.pos[1]+0.03,q.pos[2]],q.yaw,0,Math.PI/2,1.1,M);gl.uniformMatrix4fv(u.uModel,false,M);GL.draw(this._model(d.model,false));}
  for(const g of this.grenades){M4.compose(g.pos,g.spin,g.spin*0.7,0,1,M);gl.uniformMatrix4fv(u.uModel,false,M);GL.draw(this._ball());}
  for(const r of this.rockets){M4.compose(r.pos,V3.yawOf(r.vel),Math.asin(clamp(r.vel[1]/V3.len(r.vel),-1,1)),0,0.6,M);gl.uniformMatrix4fv(u.uModel,false,M);GL.draw(this._model('tube',false));}
  gl.uniformMatrix4fv(u.uModel,false,MI);}
};
Bus.on('glRestored',()=>{Weapons.M={};});
