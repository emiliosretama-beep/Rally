// ===== FRENTE 44 · jugador: movimiento en primera persona, cámara, salud, interacción =====
// Player.update(dt, cmd) en cada paso fijo (antes de Weapons.update: puede tocar cmd, p. ej. disparo automático táctil o usar en vez de recargar).
// Cápsula de radio 0.35 (1.8 m de pie, 1.2 agachado), ojos a 1.62/1.05. Salud 100 que se regenera (4 s sin daño, 25/s).
const PL={walk:4.6,sprint:7,crouch:2.3,acc:44,fric:30,airAcc:7,jumpV:4.9,grav:16,r:0.35,hS:1.8,hC:1.2,eyeS:1.62,eyeC:1.05,stam:5,fov:62};
const Player={pos:[0,0,0],vel:[0,0,0],yaw:0,pitch:0,health:100,stance:'stand',onGround:false,alive:true,team:'ally',isPlayer:true,
 eyeH:PL.eyeS,bob:{x:0,y:0,ph:0,amt:0,roll:0},recoil:{p:0,y:0},land:0,landV:0,stamina:PL.stam,tired:false,sprinting:false,speed:0,
 lastHurt:-99,time:0,god:false,sway:{p:0,y:0},pn:{p:0,y:0,r:0,vp:0,vy:0,vr:0},_stepY:0,_lg:null,mounted:null,focus:null,useT:0,useProg:0,deadT:0,surface:'grass',water:0,kills:0,
 _cam:{eye:[0,0,0],yaw:0,pitch:0,roll:0,fov:62,near:0.06,far:1500},_d:[0,0,1],_e:[0,0,0],_f:[0,0,0],_at:null,_atT:0,_af:false,_lean:0,
 get inv(){return typeof Weapons!=='undefined'?Weapons.inv:null;},
 eye(o){o=o||this._e;o[0]=this.pos[0];o[1]=this.pos[1]+this.eyeH;o[2]=this.pos[2];return o;},
 // dirección de puntería (incluye el retroceso y el balanceo del visor)
 dir(o){return V3.dirYP(this.yaw+this.recoil.y+this.sway.y,this.pitch+this.recoil.p+this.sway.p,o||this._d);},
 // sacudida de la vista que vuelve sola (explosiones, golpes, balas muy cerca): no mueve la puntería
 punch(p,y,r){const n=this.pn;n.vp+=p*60;n.vy+=(y||0)*60;n.vr+=(r||0)*60;},
 // embestida corta hacia (dx,dz) al dar un culatazo
 lunge(dx,dz,v){const l=Math.hypot(dx,dz)||1;this._lg={x:dx/l*v,z:dz/l*v,t:0.14};},
 height(){return this.stance==='crouch'?PL.hC:PL.hS;},
 spawn(pos,yaw,loadout){V3.copy(pos,this.pos);if(pos[1]==null||!isFinite(pos[1]))this.pos[1]=World.height(pos[0],pos[2]);
  V3.set(this.vel,0,0,0);this.yaw=yaw||0;this.pitch=0;this.health=100;this.alive=true;this.stance='stand';this.eyeH=PL.eyeS;this.onGround=true;
  this.recoil.p=this.recoil.y=0;this.sway.p=this.sway.y=0;const n=this.pn;n.p=n.y=n.r=n.vp=n.vy=n.vr=0;this._stepY=0;this._lg=null;this.land=0;this.stamina=PL.stam;this.tired=false;this.sprinting=false;this.lastHurt=-99;this.mounted=null;this.focus=null;this.useT=0;this.deadT=0;
  if(loadout&&typeof Weapons!=='undefined')Weapons.setLoadout(loadout);if(typeof Input!=='undefined')Input.touchUse(null);},
 // estado para los puntos de control
 snapshot(){return {pos:this.pos.slice(),yaw:this.yaw,pitch:this.pitch,stance:this.stance,inv:typeof Weapons!=='undefined'?Weapons.snapshot():null};},
 restore(s){this.spawn(s.pos,s.yaw,null);this.pitch=s.pitch||0;if(s.inv&&typeof Weapons!=='undefined')Weapons.restore(s.inv);},
 // retroceso del arma: sube la mira (p) y la desvía (y); se recupera en parte
 kick(p,y){this.recoil.p+=p;this.recoil.y+=y||0;this._kt=0;},
 update(dt,cmd){this.time+=dt;
  const pn=this.pn;pn.vp+=(-90*pn.p-12*pn.vp)*dt;pn.vy+=(-90*pn.y-12*pn.vy)*dt;pn.vr+=(-70*pn.r-10*pn.vr)*dt;pn.p+=pn.vp*dt;pn.y+=pn.vy*dt;pn.r+=pn.vr*dt;
  this._stepY*=Math.max(0,1-dt*14);
  if(!this.alive){this.deadT+=dt;this.eyeH=lerp(this.eyeH,0.26,Math.min(1,dt*3));this.vel[1]-=PL.grav*dt;this.vel[0]*=0.9;this.vel[2]*=0.9;World.moveCapsule(this.pos,this.vel,PL.r,0.6,dt,true);return;}
  const W=typeof Weapons!=='undefined'?Weapons:null,ads=W?W.adsAmt||0:0;
  // disparo automático táctil: dispara solo con un enemigo bajo la retícula
  if(Input.device==='touch'&&Input.opts.autoFire&&!cmd.fire){const t=this._assist(0.035,true);if(t){cmd.fire=true;if(!this._af)cmd.fireDown=true;this._af=true;}else this._af=false;}
  // mirar (más lento al apuntar; ayuda al apuntar con mando y táctil: frena cerca de un enemigo y lo atrapa al empezar a apuntar)
  let k=lerp(1,W?W.adsSens():0.55,ads);
  if(cmd.aimAssist>0&&(cmd.lookX||cmd.lookY)){const t=this._assist(0.075,false);if(t)k*=1-0.42*cmd.aimAssist;}
  if(cmd.aimAssist>0.5&&cmd.adsDown){const t=this._assist(0.13,false);if(t){const e=this.eye(),c=t.chest,dy=V3.yawOf([c[0]-e[0],0,c[2]-e[2]]),dp=Math.atan2(c[1]-e[1],Math.hypot(c[0]-e[0],c[2]-e[2]));
   this.yaw+=angNorm(dy-this.yaw)*0.75;this.pitch+=(dp-this.pitch)*0.75;}}
  this.yaw=angNorm(this.yaw-cmd.lookX*k);this.pitch=clamp(this.pitch+cmd.lookY*k,-1.45,1.45);
  // retroceso: vuelve poco a poco
  this._kt=(this._kt||0)+dt;if(this._kt>0.07){const r=Math.min(1,dt*(this._kt>0.25?9:ads>0.5?5:6.5));this.recoil.p-=this.recoil.p*r;this.recoil.y-=this.recoil.y*r;}
  // ametralladora fija: sin moverse, giro limitado
  const M=this.mounted;
  if(M){if(cmd.useDown||cmd.jump||cmd.crouch){this.dismount();cmd.useDown=false;}
   else{const a=M.arc||1.1,dy=angNorm(this.yaw-M.yaw);if(Math.abs(dy)>a)this.yaw=angNorm(M.yaw+Math.sign(dy)*a);this.pitch=clamp(this.pitch,-0.35,0.3);
    V3.set(this.vel,0,0,0);this.speed=0;this.sprinting=false;this._interact(dt,cmd);this._health(dt);return;}}
  // postura
  if(cmd.crouch){if(this.stance==='crouch'){if(World.canStand(this.pos,PL.r*0.95,PL.hS))this.stance='stand';}else this.stance='crouch';}
  let sprint=cmd.sprint&&cmd.mz>0.5&&ads<0.3&&!cmd.fire&&!this.tired&&!(W&&W.busy());
  if(sprint&&this.stance==='crouch'){if(World.canStand(this.pos,PL.r*0.95,PL.hS))this.stance='stand';else sprint=false;}
  this.sprinting=sprint&&(this.onGround||this.sprinting);
  if(this.sprinting){this.stamina-=dt;if(this.stamina<=0){this.stamina=0;this.tired=true;this.sprinting=false;}}
  else{this.stamina=Math.min(PL.stam,this.stamina+dt*(this.speed<0.5?1.3:0.7));if(this.tired&&this.stamina>PL.stam*0.35)this.tired=false;}
  this.eyeH+=((this.stance==='crouch'?PL.eyeC:PL.eyeS)-this.eyeH)*Math.min(1,dt*10);
  // movimiento
  const sy=Math.sin(this.yaw),cy=Math.cos(this.yaw);let wx=sy*cmd.mz-cy*cmd.mx,wz=cy*cmd.mz+sy*cmd.mx;const wl=Math.hypot(wx,wz);if(wl>1){wx/=wl;wz/=wl;}
  let sp=this.sprinting?PL.sprint:this.stance==='crouch'?PL.crouch:PL.walk;sp*=lerp(1,0.55,ads)*(W?W.moveK():1);if(this.water>0.4)sp*=0.6;
  const tx=wx*sp,tz=wz*sp,dx=tx-this.vel[0],dz=tz-this.vel[2],dl=Math.hypot(dx,dz),acc=(this.onGround?(wl>0.05?PL.acc:PL.fric):PL.airAcc)*dt;
  if(dl>acc){this.vel[0]+=dx/dl*acc;this.vel[2]+=dz/dl*acc;}else{this.vel[0]=tx;this.vel[2]=tz;}
  if(cmd.jump&&this.onGround){if(this.stance==='crouch'){if(World.canStand(this.pos,PL.r*0.95,PL.hS))this.stance='stand';}else{this.vel[1]=PL.jumpV;this.onGround=false;Bus.emit('jump',{by:this});}}
  this.vel[1]-=PL.grav*dt;
  if(this._lg){this._lg.t-=dt;this.vel[0]=this._lg.x;this.vel[2]=this._lg.z;if(this._lg.t<=0)this._lg=null;}
  const y0=this.pos[1],R=World.moveCapsule(this.pos,this.vel,PL.r,this.height(),dt,this.onGround);const was=this.onGround;this.onGround=R.onGround;
  // escalones: la cámara sube suave en vez de saltar
  if(was&&R.onGround&&this.pos[1]-y0>0.05)this._stepY=clamp(this._stepY-(this.pos[1]-y0),-0.45,0);
  if(R.onGround&&!was&&R.landV>2.5){this.land=Math.min(0.22,R.landV*0.022);this.punch(Math.min(0.03,R.landV*0.003),0,(Math.random()-0.5)*0.01);this.landV=R.landV;Bus.emit('step',{pos:this.pos,surface:this._surf(R),by:this,run:true,land:true});
   if(R.landV>11.5)this.damage((R.landV-11.5)*9,null,'fall');}
  this.speed=Math.hypot(this.vel[0],this.vel[2]);
  this.water=World.water?Math.max(0,World.water.y-this.pos[1]):0;
  if(this.pos[1]<World.height(this.pos[0],this.pos[2])-4){this.pos[1]=World.height(this.pos[0],this.pos[2]);this.vel[1]=0;}
  // balanceo al andar y pasos
  const B=this.bob,moving=this.onGround&&this.speed>0.6;B.amt+=((moving?Math.min(1,this.speed/PL.walk):0)-B.amt)*Math.min(1,dt*8);
  if(moving){const len=this.sprinting?1.25:this.stance==='crouch'?0.8:1.0,p0=B.ph;B.ph+=dt*Math.PI*this.speed/len/1.6;
   if(Math.floor(p0/Math.PI)!==Math.floor(B.ph/Math.PI))Bus.emit('step',{pos:this.pos,surface:this._surf(R),by:this,run:this.sprinting,crouch:this.stance==='crouch'});}
  const ak=B.amt*lerp(1,0.25,ads)*(this.sprinting?1.5:1);B.x=Math.sin(B.ph)*0.035*ak;B.y=-Math.abs(Math.sin(B.ph))*0.045*ak;B.roll=Math.sin(B.ph)*0.006*ak;
  this.land+=(0-this.land)*Math.min(1,dt*7);
  this._lean+=(cmd.mx*0.012*(this.onGround?1:0)-this._lean)*Math.min(1,dt*6);
  this._interact(dt,cmd);this._health(dt);},
 _surf(R){return R&&R.surface||World.surfaceAt(this.pos[0],this.pos[2]);},
 _health(dt){if(this.time-this.lastHurt>4&&this.health<100)this.health=Math.min(100,this.health+25*dt);},
 // enemigo vivo más cercano a la línea de mira (ángulo < maxA y a la vista) -> {a, chest, ang} | null (se cachea unos pasos)
 _assist(maxA,strict){if(typeof Actors==='undefined')return null;if(this.time-this._atT<0.05&&this._atA>=maxA)return this._at&&this._at.ang<maxA?this._at:null;
  this._atT=this.time;this._atA=maxA;const e=this.eye(),d=this.dir(this._f);let best=null,ba=maxA;
  for(const a of Actors.list){if(!a.alive||a.team!=='axis')continue;const c=[a.pos[0],a.pos[1]+(a.stance==='crouch'?0.85:1.25),a.pos[2]],v=V3.sub(c,e),l=V3.len(v);if(l>90||l<0.5)continue;
   const ang=Math.acos(clamp(V3.dot(v,d)/l,-1,1))*(strict?1:Math.min(1,l/25+0.4));if(ang<ba&&World.los(e,c)){ba=ang;best={a,chest:c,ang};}}
  this._at=best;return best;},
 // ---------- interactuar: lo usable más a mano o un arma del suelo ----------
 _interact(dt,cmd){if(this.mounted){this.focus=null;this.useProg=0;if(typeof Input!=='undefined')Input.touchUse(t('getOff'));return;}const f=this._findFocus();this.focus=f;
  if(f){const u=f.obj;if(cmd.useDown||cmd.use)cmd.reload=false; // con algo a mano, el botón de usar no recarga
   if(f.kind==='pickup'){if(cmd.useDown&&typeof Weapons!=='undefined')Weapons.pickup(u);this.useT=0;}
   else if(u.hold>0){if(cmd.use){this.useT+=dt;if(this.useT>=u.hold){this.useT=0;this._use(u);}}else this.useT=0;}
   else{this.useT=0;if(cmd.useDown)this._use(u);}}
  else this.useT=0;
  this.useProg=f&&f.kind==='usable'&&f.obj.hold>0?clamp(this.useT/f.obj.hold,0,1):0;
  if(typeof Input!=='undefined')Input.touchUse(f?f.short:null);},
 _findFocus(){const p=this.pos,fx=Math.sin(this.yaw),fz=Math.cos(this.yaw);let best=null,bs=1e9;
  for(const u of World.usables){if(!u.on||!u.pos)continue;const dx=u.pos[0]-p[0],dz=u.pos[2]-p[2],d=Math.hypot(dx,dz);if(d>u.r||Math.abs(u.pos[1]-p[1])>2.4)continue;
   const fc=d>0.01?(dx*fx+dz*fz)/d:1;if(d>0.8&&fc<0.35)continue;const s=d-fc;if(s<bs){bs=s;best={kind:'usable',obj:u};}}
  if(typeof Weapons!=='undefined')for(const q of Weapons.pickups){const dx=q.pos[0]-p[0],dz=q.pos[2]-p[2],d=Math.hypot(dx,dz);if(d>1.7||Math.abs(q.pos[1]-p[1])>1.5)continue;
   if(Weapons.has(q.id))continue;const fc=d>0.01?(dx*fx+dz*fz)/d:1;if(d>0.7&&fc<0.4)continue;const s=d-fc+0.5;if(s<bs){bs=s;best={kind:'pickup',obj:q};}}
  if(!best)return null;
  if(best.kind==='pickup'){const def=WEAPONS[best.obj.id];best.text=t('pickUp')+' '+(def?def.name:best.obj.id);best.short=def?def.name:t('use');}
  else{const u=best.obj;best.text=typeof u.text==='string'?u.text:u.text?txt(u.text):t('use');best.short=u.short?txt(u.short):best.text;}
  return best;},
 _use(u){if(u.kind==='mg'&&!u.use)this.mount(u);else if(u.use)u.use(this,u);if(u.once)u.on=false;Bus.emit('use',{u});},
 // ametralladora fija: u = {pos (del arma), yaw, arc, seat ([x,y,z] donde va el jugador), weapon}
 mount(u){this.mounted=u;this.stance='stand';const s=u.seat||V3.madd(u.pos,V3.dirYaw(u.yaw),-0.85);this.pos[0]=s[0];this.pos[2]=s[2];this.pos[1]=s[1]!=null?s[1]:World.height(s[0],s[2]);
  this.yaw=u.yaw;this.pitch=0;if(typeof Weapons!=='undefined'&&Weapons.mount)Weapons.mount(u);Bus.emit('mount',{u});},
 dismount(){const u=this.mounted;if(!u)return;this.mounted=null;if(typeof Weapons!=='undefined'&&Weapons.unmount)Weapons.unmount(u);Bus.emit('dismount',{u});},
 // daño: de una posición (indicador de dirección) y de quién (la dificultad multiplica el daño enemigo)
 damage(dmg,from,by){if(!this.alive||this.god||dmg<=0)return;const D=typeof Game!=='undefined'?Game.D:null;if(by&&by!==this&&by.team==='axis'&&D)dmg*=D.dmg;
  this.health-=dmg;this.lastHurt=this.time;Bus.emit('playerHurt',{dmg,from:from?from.slice():null,by});
  if(typeof FX!=='undefined'&&FX.shake)FX.shake(Math.min(0.45,dmg/70));
  // el golpe da un respingo a la vista (y mueve algo la puntería)
  const fl=Math.min(1,dmg/40),sd=from?Math.sign(Math.sin(this.yaw-Math.atan2(from[0]-this.pos[0],from[2]-this.pos[2])))||1:1;this.punch(0.05*fl,0.03*fl*sd,0.05*fl*sd);this.recoil.p+=0.012*fl;this.recoil.y+=(Math.random()-0.5)*0.02*fl;
  if(this.health<=0){this.health=0;this.die(by);}},
 die(by){if(!this.alive)return;this.alive=false;this.deadT=0;this.dismount();this.vel[0]=this.vel[2]=0;Bus.emit('playerDied',{by});},
 // cámara: balanceo, caída al aterrizar, retroceso, temblor de FX y FOV (apuntar estrecha, correr ensancha)
 camera(){const c=this._cam,B=this.bob,sh=typeof FX!=='undefined'&&FX.shakeOff?FX.shakeOff():null,cy=Math.cos(this.yaw),sy=Math.sin(this.yaw);
  const pn=this.pn,dk=this.alive?0:smooth(this.deadT*1.4);
  c.eye[0]=this.pos[0]-cy*B.x;c.eye[1]=this.pos[1]+this.eyeH+B.y-this.land+this._stepY;c.eye[2]=this.pos[2]+sy*B.x;
  c.yaw=this.yaw+this.recoil.y+this.sway.y+pn.y+(sh?sh[0]:0);c.pitch=clamp(this.pitch+this.recoil.p+this.sway.p+pn.p+(sh?sh[1]:0),-1.5,1.5)*(1-dk*0.7)+dk*0.25;
  c.roll=B.roll+this._lean+pn.r+(sh?sh[2]:0)+dk*1.15;
  const base=(typeof Settings!=='undefined'&&Settings.fov)||PL.fov,W=typeof Weapons!=='undefined'?Weapons:null,ads=W?W.adsAmt||0:0;
  const tf=lerp(base,W?W.adsFov(base):base*0.75,smooth(ads))+(this.sprinting?6:0),now=this.time,fd=clamp(now-(this._ft==null?now:this._ft),0,0.1);this._ft=now;
  this._fov=this._fov==null?tf:this._fov+(tf-this._fov)*Math.min(1,fd*14);c.fov=this._fov;
  c.near=0.06;c.far=Math.max(450,(Env.fogF||500)*1.15);return c;}
};
