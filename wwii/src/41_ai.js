// ===== FRENTE 44 · inteligencia: enemigos, aliados y carros =====
// STUB fase 1: lo sustituye el módulo completo (41_ai.js). Enemigos: ven al jugador (o a un aliado) con World.los, se giran y disparan
// ráfagas imprecisas con Weapons.fire (fichas de ataque según dificultad); van a su destino (a.goal) por World.nav. Aliados: siguen al
// jugador y disparan a los enemigos que ven. Carros: van a su destino, giran la torreta y disparan proyectiles explosivos.
const AI={tokens:new Set(),t:0,_e:[0,0,0],_c:[0,0,0],
 reset(){this.tokens.clear();this.t=0;},
 _brain(a){return {think:Math.random()*0.1,target:null,vis:false,alert:false,heard:null,burst:0,shotT:0,fireT:0.5+Math.random()*1.5,path:null,pi:0,pathT:0,pg:null,tokT:0,reload:0,idx:0};},
 update(dt){this.t+=dt;const D=typeof Game!=='undefined'?Game.D:{acc:1,tokens:3};let ai=0;
  for(const a of Actors.list){if(!a.alive){if(this.tokens.has(a))this.tokens.delete(a);continue;}const b=a.brain||(a.brain=this._brain(a));
   if(a.team==='ally')b.idx=ai++;b.think-=dt;if(b.think<=0){b.think+=0.1;this._perceive(a,b);}
   if(a.tank)this._tank(a,b,dt,D);else this._soldier(a,b,dt,D);}},
 // ---------- percepción a 10 Hz: objetivo visible más cercano ----------
 _perceive(a,b){const e=Actors.eye(a,this._e),range=a.team==='axis'?75:55;let best=null,bd=range;
  const look=(t,c)=>{const d=V3.dist(e,c);if(d>bd)return;if(!b.alert&&a.team==='axis'&&d>12){const fy=V3.yawOf(V3.sub(c,e));if(Math.abs(angNorm(fy-a.yaw))>1.2)return;}
   if(World.los(e,c)){bd=d;best=t;}};
  if(a.team==='axis'){if(Player.alive){const pc=Player.eye(this._c);pc[1]-=0.35;look(Player,pc);}for(const o of Actors.list)if(o.alive&&o.team==='ally'&&!o.tank)look(o,Actors.chest(o));}
  else for(const o of Actors.list)if(o.alive&&o.team==='axis')look(o,Actors.chest(o));
  b.vis=!!best;if(best){b.target=best;b.alert=true;b.lastSeen=(best===Player?Player.pos:best.pos).slice();}},
 _tpos(t,o){return t===Player?(o=Player.eye(o),o[1]-=0.4,o):Actors.chest(t,o);},
 // ---------- soldado ----------
 _soldier(a,b,dt,D){const wd=WEAPONS[a.weapon]||WEAPONS.kar98;let goal=null,speed=3.4;
  if(a.team==='ally'){if(Player.alive){const s=b.idx%2?1:-1,k=1+(b.idx>>1),f=V3.dirYaw(Player.yaw);goal=[Player.pos[0]-f[0]*2.5*k+f[2]*s*2*k,Player.pos[1],Player.pos[2]-f[2]*2.5*k-f[0]*s*2*k];
    if(V3.distXZ(a.pos,Player.pos)<5.5&&!b.path)goal=null;}}
  else if(a.goal){const near=b.vis&&b.target&&V3.dist(a.pos,b.target.pos)<30;if(!near||a.data.rush)goal=a.goal;}
  if(a.goal&&a.team==='axis'&&V3.distXZ(a.pos,a.goal)<1.2)goal=null;
  // moverse por la red de navegación
  let mvx=0,mvz=0;if(goal){b.pathT-=dt;if(!b.path||b.pathT<=0||!b.pg||V3.distXZ(b.pg,goal)>2){b.path=World.nav.path(a.pos,goal);b.pi=0;b.pathT=2+Math.random();b.pg=goal.slice();}
   if(b.path&&b.pi<b.path.length){const w=b.path[b.pi],dx=w[0]-a.pos[0],dz=w[2]-a.pos[2],l=Math.hypot(dx,dz);if(l<0.6)b.pi++;else{const sp=b.vis?speed*0.55:speed;mvx=dx/l*sp;mvz=dz/l*sp;}}
   else if(!b.path){const dx=goal[0]-a.pos[0],dz=goal[2]-a.pos[2],l=Math.hypot(dx,dz);if(l>1){mvx=dx/l*2;mvz=dz/l*2;}}}
  else b.path=null;
  const k=Math.min(1,dt*10);a.vel[0]+=(mvx-a.vel[0])*k;a.vel[2]+=(mvz-a.vel[2])*k;
  // mirar y disparar
  const tg=b.target&&(b.target===Player?Player.alive:b.target.alive)?b.target:null;let wantYaw=Math.hypot(mvx,mvz)>0.3?Math.atan2(mvx,mvz):a.yaw;
  if(tg&&b.vis){const e=Actors.eye(a,this._e),c=this._tpos(tg,this._c),v=V3.sub(c,e);wantYaw=Math.atan2(v[0],v[2]);a.aim[1]=Math.atan2(v[1],Math.hypot(v[0],v[2]));
   const dist=V3.len(v);if(a.team==='axis'&&tg===Player){if(!this.tokens.has(a)){if(this.tokens.size<(D.tokens||3)){this.tokens.add(a);b.tokT=2.5+Math.random()*2;}}else if((b.tokT-=dt)<=0)this.tokens.delete(a);}
   const may=a.team==='ally'||tg!==Player||this.tokens.has(a);b.fireT-=dt;b.reload-=dt;
   if(may&&b.reload<=0&&Math.abs(angNorm(wantYaw-a.yaw))<0.2){
    if(b.burst<=0&&b.fireT<=0){b.burst=wd.mode==='auto'?3+((Math.random()*(wd.mounted?10:4))|0):1;b.shotT=0;}
    if(b.burst>0){b.shotT-=dt;if(b.shotT<=0){b.shotT=60/wd.rpm;b.burst--;this._shoot(a,wd,e,v,dist,tg,D);
      if(b.burst<=0)b.fireT=wd.mode==='auto'?0.7+Math.random()*1.0:wd.mode==='bolt'?1.8+Math.random()*1.5:1.1+Math.random()*1.2;}}}}
  else if(b.lastSeen&&!goal){wantYaw=Math.atan2(b.lastSeen[0]-a.pos[0],b.lastSeen[2]-a.pos[2]);a.aim[1]*=0.9;}
  else a.aim[1]*=0.9;
  const dy=angNorm(wantYaw-a.yaw),tr=4*dt;a.yaw=angNorm(a.yaw+clamp(dy,-tr,tr));a.aim[0]=a.yaw;},
 _shoot(a,wd,e,v,dist,tg,D){const acc=(a.team==='ally'?0.035:0.055)/(D.acc||1)*(1+dist/45)*(tg===Player&&Player.speed>3?1.3:1)*(tg===Player&&Player.stance==='crouch'?1.2:1);
  const d=V3.norm(v),r=acc*Math.sqrt(Math.random()),t=Math.random()*6.283,rt=[-Math.cos(a.yaw),0,Math.sin(a.yaw)],up=V3.cross(rt,d);
  const dir=V3.norm([d[0]+(rt[0]*Math.cos(t)+up[0]*Math.sin(t))*r,d[1]+up[1]*Math.sin(t)*r,d[2]+(rt[2]*Math.cos(t)+up[2]*Math.sin(t))*r]);
  const mz=V3.madd(e,dir,0.7);if(typeof FX!=='undefined')FX.muzzle(mz,dir,wd.mounted?1.2:0.8,false);a.anim.fire=1;
  Weapons.fire(a,wd,e,dir,{muzzle:mz,k:tg===Player?0.8:1});a.mag--;if(a.mag<=0){a.mag=wd.mag;a.brain.reload=2.2;Bus.emit('reload',{by:a,weapon:wd.id});}},
 // ---------- carro ----------
 _tank(a,b,dt,D){let mv=0;if(a.goal&&V3.distXZ(a.pos,a.goal)>3){b.pathT-=dt;if(!b.path||b.pathT<=0){b.path=World.nav.path(a.pos,a.goal);b.pi=0;b.pathT=4;}
   const w=b.path&&b.path[b.pi];if(w){const dx=w[0]-a.pos[0],dz=w[2]-a.pos[2],l=Math.hypot(dx,dz);if(l<2)b.pi++;else{const wy=Math.atan2(dx,dz),dy=angNorm(wy-a.yaw);a.yaw=angNorm(a.yaw+clamp(dy,-0.5*dt,0.5*dt));mv=Math.abs(dy)<0.6?3:0.8;}}}
  a.vel[0]=Math.sin(a.yaw)*mv;a.vel[2]=Math.cos(a.yaw)*mv;
  const tg=b.vis&&b.target?b.target:null;if(!tg||a.half)return;const e=Actors.eye(a,this._e),c=this._tpos(tg,this._c),ty=Math.atan2(c[0]-e[0],c[2]-e[2]);
  a.aim[0]=angNorm(a.aim[0]+clamp(angNorm(ty-a.aim[0]),-0.6*dt,0.6*dt));a.aim[1]=Math.atan2(c[1]-e[1],Math.hypot(c[0]-e[0],c[2]-e[2]));
  b.fireT-=dt;if(b.fireT<=0&&Math.abs(angNorm(ty-a.aim[0]))<0.05){b.fireT=5+Math.random()*3;const dir=V3.dirYP(a.aim[0]+(Math.random()-0.5)*0.05,a.aim[1]+(Math.random()-0.5)*0.03),o=V3.madd(e,dir,4);
   const h=World.raycast(o,dir,300,{actors:true,ignore:a}),p=h?h.pos:V3.madd(o,dir,300);let hp=p;const pt=Weapons._rayPlayer(o,dir,h?h.t:300);if(pt>=0)hp=V3.madd(o,dir,pt);
   if(typeof FX!=='undefined')FX.muzzle(o,dir,3,false);Bus.emit('shot',{pos:o,dir,weapon:'cannon',by:a,loud:3});Weapons.explode(hp,5.5,160,a,{shell:true});}}
};
// los enemigos oyen los disparos del jugador y de sus aliados
Bus.on('shot',d=>{if(!d.by||(d.by!==Player&&d.by.team!=='ally'))return;for(const a of Actors.list)if(a.alive&&a.team==='axis'&&a.brain&&V3.dist(a.pos,d.pos)<55){a.brain.alert=true;if(!a.brain.vis)a.brain.lastSeen=d.pos.slice();}});
