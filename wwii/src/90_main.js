// ===== FRENTE 44 · juego: estados, bucle de paso fijo, carga de misiones, guion (L), piloto automático y API de pruebas (F44) =====
// Estados: title · brief · play · pause · dead · complete. Simulación a FIX (1/120 s) con varios pasos por fotograma; render por rAF.
const DIFF={recluta:{id:'recluta',dmg:0.5,acc:0.65,tokens:2,medal:'bronze'},regular:{id:'regular',dmg:1,acc:1,tokens:3,medal:'silver'},veterano:{id:'veterano',dmg:1.8,acc:1.5,tokens:5,medal:'gold'}};
const DIFF_ALIAS={recruit:'recluta',easy:'recluta',normal:'regular',veteran:'veterano',hard:'veterano'};
const NO_CMD=mkCmd();

// ---------- guion de la misión (DESIGN §5): temporizadores, corrutinas, disparadores, oleadas, artillería, puntos de control ----------
// Corrutinas: L.run(function*(L){ yield 2; yield L.wait(1); yield ()=>cond; yield L.until(fn); ... }) — yield n = esperar n s de simulación.
class Script{
 constructor(level){this.level=level;this.flags={};this.obj=-1;this.time=0;this.timers={};this.co=[];this.tm=[];this.trig=[];this.waves=[];this.barr=[];this.cp=null;this.restoring=false;this.ended=false;}
 get player(){return Player;}
 // L.wait(s, fn) llama a fn tras s segundos; sin fn devuelve una espera para yield
 wait(s,fn){if(typeof fn==='function'){const h={at:this.time+s,fn,live:true,stop(){this.live=false;}};this.tm.push(h);return h;}return {wait:s};}
 until(f){return {until:f};}
 // corrutina (función generadora o generador); devuelve {stop()}
 run(g){if(typeof g==='function')g=g(this);if(!g||typeof g.next!=='function')return null;const c={g,w:null,live:true,stop(){this.live=false;}};this.co.push(c);this._step(c);return c;}
 _step(c){for(let k=0;k<200&&c.live;k++){const w=c.w;if(w){if(w.at!=null){if(this.time<w.at)return;}else if(w.until&&!w.until(this))return;c.w=null;}
   let r;try{r=c.g.next();}catch(e){console.error(e);c.live=false;return;}if(r.done){c.live=false;return;}const v=r.value;
   c.w=v==null?{at:this.time+FIX/2}:typeof v==='number'?{at:this.time+v}:v.wait!=null?{at:this.time+v.wait}:typeof v==='function'?{until:v}:v.until?{until:v.until}:v.done!=null?{until:()=>v.done}:{at:this.time};}}
 _call(fn,...a){if(typeof fn!=='function')return;const r=fn(this,...a);if(r&&typeof r.next==='function')this.run(r);}
 // zonas: {x,z,r} | {x0,z0,x1,z1} | {pos:[x,y,z], r} | [x,z,r]; y0/y1 opcionales
 _area(a){if(Array.isArray(a))return {x:a[0],z:a[1],r:a[2]||3};if(a.pos)return Object.assign({x:a.pos[0],z:a.pos[2],r:a.r||3},a);return a;}
 inside(a,p){a=a.x0!=null||a.r!=null?a:this._area(a);if(a.y0!=null&&p[1]<a.y0||a.y1!=null&&p[1]>a.y1)return false;
  return a.r!=null?Math.hypot(p[0]-a.x,p[2]-a.z)<=a.r:p[0]>=Math.min(a.x0,a.x1)&&p[0]<=Math.max(a.x0,a.x1)&&p[2]>=Math.min(a.z0,a.z1)&&p[2]<=Math.max(a.z0,a.z1);}
 // fn(L) al entrar el jugador en la zona (una vez; {repeat:true} cada vez que entra)
 trigger(area,fn,opts){const h={area:this._area(area),fn,once:!(opts&&opts.repeat),live:true,in:false,stop(){this.live=false;}};this.trig.push(h);return h;}
 near(p,r){return V3.distXZ(Player.pos,p)<=r;}
 _xyz(p){if(!p)return null;const q=p.length===2?[p[0],null,p[1]]:p.slice();if(q[1]==null){const h=World.height(q[0],q[2]);q[1]=World.groundAt(q[0],q[2],0.25,h+0.6);}return q;}
 // soldados: {team, kind, pos|at:[[x,z],...], n, yaw, tag, goal, hold, rush, name, weapon, hero, health, stance} (o una lista) -> [actores]
 spawn(g){if(Array.isArray(g)){let o=[];for(const x of g)o=o.concat(this.spawn(x));return o;}const n=g.n||1,out=[],base=g.at||g.pos||[0,0,0],multi=Array.isArray(base[0]);
  for(let i=0;i<n;i++){const p=this._xyz(multi?base[i%base.length]:base);if(n>1&&!multi){const a=i*2.4,r=1+i*0.7;p[0]+=Math.sin(a)*r;p[2]+=Math.cos(a)*r;p[1]=this._xyz([p[0],p[2]])[1];}
   const yaw=g.yaw!=null?g.yaw:Math.atan2(Player.pos[0]-p[0],Player.pos[2]-p[2]);
   const a=Actors.spawn({team:g.team||'axis',kind:g.kind||'rifle',pos:p,yaw,name:g.name,weapon:g.weapon,tag:g.tag,hero:g.hero,health:g.health,stance:g.stance});
   if(g.goal)a.goal=this._xyz(g.goal);a.hold=g.hold;a.data.rush=!!g.rush;out.push(a);}return out;}
 // oleada: {tag, n (total), max (vivos a la vez), every (s), delay, from:[[x,z],...], kind|kinds, goal, team} -> {spawned, total, done, stop()}
 wave(d){const h={tag:d.tag||'wave',total:d.n||6,max:d.max||4,every:d.every||3,spawned:0,next:d.delay||0,done:false,live:true,d,stop(){this.live=false;}};this.waves.push(h);return h;}
 // cuántos quedan vivos con esa etiqueta (sin etiqueta: todos los enemigos)
 alive(tag){let n=0;for(const a of Actors.list)if(a.alive&&(tag?a.tag===tag:a.team==='axis'))n++;return n;}
 say(who,key,text){Voice.say(who,key,text);}
 hint(text,dur){HUD.msg('',txt(text),dur||4);}
 // punto de control: guarda jugador (armas, munición) y guion (objetivo actual y flags)
 checkpoint(name,silent){this.cp={obj:this.obj,flags:JSON.parse(JSON.stringify(this.flags)),player:Player.snapshot(),name:name||null};if(!silent)Bus.emit('checkpoint',{name});}
 // fuego de artillería en una zona: n proyectiles (Infinity = hasta stop()), cada ~interval s, con silbido 1.1 s antes; area.danger permite caer junto al jugador
 barrage(area,n,interval){const h={area:this._area(area),left:n==null?Infinity:n,iv:interval||2,next:0.4,pend:[],live:true,stop(){this.live=false;}};this.barr.push(h);return h;}
 fail(reason){Game.fail(txt(reason));}
 complete(){Game.complete();}
 // temporizador: L.timer(n, segundos[, visible]) empieza una cuenta atrás; L.timer(n) -> segundos que quedan (o transcurridos si no tenía duración)
 timer(name,secs,show){if(secs!=null){this.timers[name]={t0:this.time,dur:secs,show:show!==false};return secs;}const q=this.timers[name];if(!q){this.timers[name]={t0:this.time,dur:0,show:false};return 0;}
  return q.dur?Math.max(0,q.dur-(this.time-q.t0)):this.time-q.t0;}
 // ---------- objetivos ----------
 get objective(){return this.level.objectives[this.obj]||null;}
 startObj(cp){const o=this.objective;if(!o)return;if(cp!==false)this.checkpoint(null,this.obj===0);Bus.emit('objective',{index:this.obj,text:txt(o.text)});
  if(this.obj>0||!this.restoring)HUD.msg(t('objective'),txt(o.text),3);this._call(o.onStart);}
 next(){if(this.ended)return;const o=this.objective;if(o)this._call(o.onDone);Bus.emit('objectiveDone',{index:this.obj});this.obj++;
  if(this.obj>=this.level.objectives.length){this.ended=true;HUD.msg(t('objDone'),'',2);this.wait(1.6,()=>Game.complete());return;}HUD.msg(t('objDone'),'',1.5);this.wait(1.2,()=>this.startObj());}
 update(dt){this.time+=dt;
  for(let i=0;i<this.tm.length;i++){const h=this.tm[i];if(!h.live){this.tm.splice(i--,1);continue;}if(this.time>=h.at){this.tm.splice(i--,1);h.live=false;this._call(h.fn);}}
  for(const c of this.co.slice())this._step(c);this.co=this.co.filter(c=>c.live);
  for(const h of this.trig){if(!h.live)continue;const ins=this.inside(h.area,Player.pos);if(ins&&!h.in){if(h.once)h.live=false;this._call(h.fn);}h.in=ins;}this.trig=this.trig.filter(h=>h.live);
  for(const h of this.waves){if(!h.live)continue;h.next-=dt;const d=h.d,al=this.alive(h.tag);
   if(h.spawned<h.total&&h.next<=0&&al<h.max){const F=d.from||[[0,0]],K=d.kinds||[d.kind||'rifle'];this.spawn({team:d.team||'axis',kind:K[h.spawned%K.length],pos:F[h.spawned%F.length],tag:h.tag,goal:d.goal,rush:d.rush});h.spawned++;h.next=h.every;}
   h.done=h.spawned>=h.total&&al===0;}
  for(const h of this.barr){if(!h.live&&!h.pend.length)continue;h.next-=dt;
   if(h.live&&h.left>0&&h.next<=0){h.next=h.iv*(0.6+Math.random()*0.8);h.left--;const a=h.area;let p=null;
    for(let k=0;k<8;k++){const q=a.r!=null?(()=>{const an=Math.random()*6.283,r=Math.sqrt(Math.random())*a.r;return [a.x+Math.sin(an)*r,0,a.z+Math.cos(an)*r];})():[lerp(a.x0,a.x1,Math.random()),0,lerp(a.z0,a.z1,Math.random())];
     if(a.danger||V3.distXZ(q,Player.pos)>6){p=q;break;}}
    if(p){p[1]=World.height(p[0],p[2]);h.pend.push({pos:p,t:1.1});Bus.emit('incoming',{pos:p});Snd.play('whizz',{pos:p,vol:1.4});}}
   for(let i=h.pend.length-1;i>=0;i--){const q=h.pend[i];q.t-=dt;if(q.t<=0){h.pend.splice(i,1);Weapons.explode(q.pos,7,220,null,{shell:true});}}}
  const o=this.objective;if(o&&!this.ended&&o.done&&o.done(this))this.next();}
}

// ---------- piloto automático para las pruebas: va al objetivo por World.nav, dispara a lo que ve, usa lo que haya en el objetivo ----------
const Bot={path:null,pi:0,pt:0,goal:null,tgt:null,tt:0,ft:0,st:0,sp:null,stuck:0,strafe:0,warps:0,_u:false,_e:[0,0,0],
 reset(){this.path=null;this.pi=0;this.pt=0;this.goal=null;this.tgt=null;this.tt=0;this.st=0;this.sp=null;this.stuck=0;this.strafe=0;this._u=false;},
 _target(){const e=Player.eye(this._e);let best=null,bd=75;for(const a of Actors.list){if(!a.alive||a.team!=='axis')continue;const c=Actors.chest(a),d=V3.dist(e,c);if(d<bd&&World.los(e,c)){bd=d;best=a;}}return best;},
 _turn(c,yaw,pitch,dt){const P=Player,ey=angNorm(yaw-(P.yaw+P.recoil.y)),ep=pitch-(P.pitch+P.recoil.p),r=7*dt;c.lookX=-clamp(ey,-r,r);c.lookY=clamp(ep,-r,r);return Math.abs(ey)+Math.abs(ep)*0.5;},
 think(dt,c){const P=Player;for(const k of CMD_HELD)c[k]=false;for(const k of CMD_EDGE)c[k]=false;c.mx=c.mz=c.lookX=c.lookY=0;c.slot=0;if(!P.alive)return;
  const w=Weapons.cur(),d=Weapons.def(),e=P.eye(this._e);this.ft-=dt;this.tt-=dt;
  if(w&&!d.mounted&&w.mag===0&&w.ammo===0&&this.ft<=0){c.swap=true;this.ft=1;}
  if(this.tt<=0){this.tt=0.15;this.tgt=this._target();}
  const a=this.tgt&&this.tgt.alive?this.tgt:null;
  if(a){const ch=Actors.chest(a),dist=V3.dist(e,ch),err=this._turn(c,Math.atan2(ch[0]-e[0],ch[2]-e[2]),Math.atan2(ch[1]-e[1],Math.hypot(ch[0]-e[0],ch[2]-e[2])),dt);
   c.ads=dist>10;if(w&&w.mag>0&&err<0.02+0.5/Math.max(dist,1)){if(d.mode==='auto')c.fire=true;else if(this.ft<=0){c.fireDown=c.fire=true;this.ft=0.3;}}
   if(w&&w.mag===0)c.reload=true;this.path=null;return;}
  if(w&&w.mag<d.mag*0.5&&w.ammo>0&&this.ft<=0){c.reload=true;this.ft=0.5;}
  const goal=Game.marker();if(!goal)return;this.pt-=dt;
  if(!this.path||this.pt<=0||!this.goal||V3.distXZ(this.goal,goal)>2){this.path=World.nav.path(P.pos,goal);this.pi=0;this.pt=2;this.goal=goal.slice();}
  let wp=this.path&&this.path[this.pi];while(wp&&this.pi<this.path.length-1&&V3.distXZ(P.pos,wp)<0.9)wp=this.path[++this.pi];if(!wp)wp=goal;
  const dg=V3.distXZ(P.pos,goal),err=this._turn(c,Math.atan2(wp[0]-P.pos[0],wp[2]-P.pos[2]),-0.05,dt);
  if(dg>0.6&&err<0.9){c.mz=dg<2?0.5:1;c.sprint=dg>15&&err<0.3;}
  if(this.strafe>0){this.strafe-=dt;c.mx=this.sd;c.mz=0.6;}
  // usar lo que haya en el objetivo
  if(dg<3.5&&P.focus&&P.focus.kind==='usable'){c.use=true;c.useDown=!this._u;this._u=true;}else this._u=false;
  // atascado: saltar y apartarse; si sigue, saltar al siguiente punto del camino (se cuenta en warps)
  this.st+=dt;if(this.st>1.2){if(c.mz&&this.sp&&V3.distXZ(this.sp,P.pos)<0.5){this.stuck++;c.jump=true;this.strafe=0.6;this.sd=Math.random()<0.5?-1:1;
    if(this.stuck>=4&&wp){P.pos[0]=wp[0];P.pos[2]=wp[2];P.pos[1]=wp[1];this.warps++;this.stuck=0;}}else if(this.sp&&V3.distXZ(this.sp,P.pos)>=0.5)this.stuck=0;this.st=0;this.sp=P.pos.slice();}}
};

// ---------- juego ----------
const Game={mode:'boot',level:null,diff:'regular',D:DIFF.regular,L:null,acc:0,last:0,stats:null,manual:false,botOn:false,fps:60,_ft:0,_fn:0,deadT:0,failReason:null,
 _tc:{eye:[0,0,0],yaw:0,pitch:-0.12,roll:0,fov:58,near:0.1,far:900},_ta:0,
 init(){const cv=document.getElementById('c');
  if(!GL.init(cv)){const n=document.getElementById('nogl');if(n)n.hidden=false;return false;}
  if(Settings.quality)GFX.set(Settings.quality);Input.init(cv);HUD.init();Menu.init();FX.init();
  Bus.on('playerDied',()=>this._died());
  Bus.on('pointerUnlock',()=>{if(this.mode==='play'&&!this.manual&&Input.device==='kbm')this.pause();});
  addEventListener('blur',()=>{if(this.mode==='play'&&!this.manual)this.pause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.mode==='play'&&!this.manual)this.pause();});
  Bus.on('glRestored',()=>{if(this.mode==='play'||this.mode==='pause'||this.mode==='dead'){this.restartCheckpoint(true);this.pause();}else if(this.level&&World.built)this._loadWorld();});
  Bus.on('shot',d=>{if(d.by===Player&&this.stats)this.stats.shots++;});
  Bus.on('hit',d=>{if(d.by===Player&&this.stats&&d.actor&&d.actor.team!=='ally')this.stats.hits++;});
  Bus.on('kill',d=>{if(d.by===Player&&this.stats){this.stats.kills++;if(d.headshot)this.stats.heads++;}});
  addEventListener('pointerdown',e=>{Snd.init();if(this.mode==='dead'&&this.deadT>2.2&&!this.manual)this.restartCheckpoint();},true);
  addEventListener('keydown',()=>Snd.init());
  this.toTitle();requestAnimationFrame(t=>this.frame(t));return true;},
 frame(ts){requestAnimationFrame(t=>this.frame(t));const dt=this.last?Math.min(0.1,Math.max(0,(ts-this.last)/1000)):1/60;this.last=ts;
  this._ft+=dt;this._fn++;if(this._ft>=0.5){this.fps=Math.round(this._fn/this._ft);this._ft=0;this._fn=0;}
  if(this.manual||GL.lost)return;Input.update(dt);const c=Input.cmd;
  if(this.mode==='play'){if(c.pause){Input.consume();this.pause();}else{this.acc+=dt;let n=0;while(this.acc>=FIX&&n<12){this.update(FIX);Input.consume();this.acc-=FIX;n++;}if(n>=12)this.acc=0;}}
  else if(this.mode==='dead'){this.acc+=dt;let n=0;while(this.acc>=FIX&&n<12){this.update(FIX);this.acc-=FIX;n++;}if(n>=12)this.acc=0;
   if(this.deadT>2.2&&(c.fireDown||c.jump||c.useDown||c.pause))this.restartCheckpoint();Input.consume();}
  else{const pz=c.pause;Menu.update(dt);Input.consume();if(this.mode==='pause'&&pz)this.resume();}
  this.render(dt);},
 // un paso fijo de simulación
 update(dt){const play=this.mode==='play';let cmd=play?Input.cmd:NO_CMD;if(play&&this.botOn)Bot.think(dt,cmd);
  Player.update(dt,cmd);Weapons.update(dt,cmd);AI.update(dt);Actors.update(dt);FX.update(dt);if(this.L)this.L.update(dt);
  if(play&&this.stats)this.stats.time+=dt;
  if(this.mode==='dead'){this.deadT+=dt;if(this.deadT>2.2&&HUD.el.dead)HUD.death(true,this.failReason,t('pressToContinue'));if(this.botOn&&this.deadT>1.5)this.restartCheckpoint();}},
 render(dt){if(!GL.gl||GL.lost)return;GL.begin(dt);const inLevel=this.mode==='play'||this.mode==='pause'||this.mode==='dead'||this.mode==='complete';
  Cam.set(inLevel?Player.camera():this._titleCam(dt));if(typeof Snd!=='undefined')Snd.setListener(Cam.eye,Cam.yaw);GL.setLights(FX.lights());
  if(World.built)Shadow.render(Cam.eye,Cam.fwd,(p,ci)=>{World.draw('shadow',ci);Actors.draw('shadow',ci);Weapons.drawWorld('shadow');});
  if(!inLevel)Post.fx.hurt=Post.fx.ads=Post.fx.scope=0;
  Post.begin();Sky.draw();
  if(World.built){World.draw('main');Actors.draw('main');Weapons.drawWorld('main');FX.drawOpaque();}
  Post.grabDepth();if(World.built){World.drawDecals();FX.draw();}
  if(inLevel&&this.mode!=='complete')Weapons.drawViewmodel();
  Post.end();if(inLevel)HUD.update(dt);},
 // cámara lenta del título y del informe: gira alrededor del centro del escenario (o del punto de salida)
 _titleCam(dt){this._ta+=(dt||0)*0.035;const b=World.bounds,c=this.mode==='brief'&&this.level?this._startPos():[(b[0]+b[2])/2,0,(b[1]+b[3])/2],R=this.mode==='brief'?16:Math.min(40,(b[2]-b[0])*0.32);
  const x=c[0]+Math.sin(this._ta)*R,z=c[2]+Math.cos(this._ta)*R,T=this._tc;T.eye[0]=x;T.eye[2]=z;T.eye[1]=(World.built?World.height(x,z):0)+(this.mode==='brief'?6:9);
  T.yaw=Math.atan2(c[0]-x,c[2]-z);T.pitch=-0.16;T.far=Math.max(450,(Env.fogF||500)*1.15);return T;},
 _startPos(){const s=this.level.start||{pos:[0,0]};const p=s.pos.length===2?[s.pos[0],null,s.pos[1]]:s.pos.slice();if(p[1]==null)p[1]=World.built?World.height(p[0],p[2]):0;return p;},
 // ---------- cambios de estado ----------
 toTitle(){this.mode='title';this.L=null;this.botOn=false;Input.setActive(false);Input.unlock();HUD.show(false);HUD.death(false);Actors.clear();AI.reset();FX.clear();Weapons.reset();
  const lv=LEVELS.find(l=>l.title)||LEVELS[0];this.level=lv;this._loadWorld();Menu.title();},
 // empieza una misión: informe (o directamente si skip)
 start(id,diff,skip){const lv=LEVELS.find(l=>l.id===id);if(!lv){console.error('Game.start: misión desconocida '+id);return false;}
  this.level=lv;this._setDiff(diff);Actors.clear();AI.reset();FX.clear();Weapons.reset();this.L=null;HUD.show(false);HUD.death(false);this._loadWorld();
  if(skip)this.begin(this.diff);else{this.mode='brief';Input.setActive(false);Menu.brief(lv,this.diff);}return true;},
 _setDiff(d){d=DIFF_ALIAS[d]||d;this.diff=DIFF[d]?d:'regular';this.D=DIFF[this.diff];},
 _loadWorld(){const lv=this.level;Env.set(lv.env||{});FX.clear();FX.weather(lv.env||null);World.build(lv.build(World));},
 // jugador, escuadra y guion sobre el escenario ya cargado
 _populate(){const lv=this.level,s=this._startPos();Actors.clear();AI.reset();Weapons.reset();FX.clear();FX.weather(lv.env||null);
  Player.spawn(s,(lv.start&&lv.start.yaw)||0,lv.loadout||['garand','colt','frag:4']);
  (lv.squad||[]).forEach((m,i)=>{const q=World.nav.near([s[0]+(i%2?1.8:-1.8),s[1],s[2]-1.5-i],5)||s;Actors.spawn(Object.assign({team:'ally',pos:q,yaw:Player.yaw},m));});
  this.L=new Script(lv);this.acc=0;this.deadT=0;this.failReason=null;Bot.reset();},
 begin(diff){if(diff)this._setDiff(diff);this.stats={time:0,kills:0,shots:0,hits:0,heads:0,deaths:0};this._populate();const L=this.L;
  this._call(this.level.script);L.obj=0;L.startObj();this._enter();HUD.banner([txt(this.level.name),txt(this.level.place),this.level.date||'']);
  if(Input.device==='touch'&&!this.manual&&document.documentElement.requestFullscreen&&!document.fullscreenElement)document.documentElement.requestFullscreen().catch(()=>{});},
 _call(fn){if(typeof fn==='function')this.L._call(fn);},
 _enter(){this.mode='play';Menu.hide();HUD.show(true);HUD.death(false);Input.setActive(true);Input.flush();this.acc=0;if(!this.manual)Input.lock();},
 // vuelve al último punto de control: se rehace el escenario, se repite el guion con L.restoring=true y se restaura jugador y flags
 restartCheckpoint(noDeath){if(!this.level)return;const cp=this.L&&this.L.cp;if(this.stats&&!noDeath&&!Player.alive)this.stats.deaths++;
  this._loadWorld();this._populate();const L=this.L,O=this.level.objectives;L.restoring=true;if(cp)L.flags=JSON.parse(JSON.stringify(cp.flags));
  this._call(this.level.script);
  if(cp){for(let i=0;i<cp.obj;i++)if(O[i]&&O[i].restore)L._call(O[i].restore);L.obj=cp.obj;Player.restore(cp.player);L.cp=cp;
   // la escuadra aparece junto al jugador
   let i=0;for(const a of Actors.list)if(a.team==='ally'){const q=World.nav.near([Player.pos[0]+(i%2?1.6:-1.6),Player.pos[1],Player.pos[2]-1.5-(i>>1)],5);if(q)V3.copy(q,a.pos);i++;}
   L.startObj(false);}else{L.obj=0;L.startObj();}
  L.restoring=false;HUD.reset();this._enter();},
 pause(){if(this.mode!=='play')return;this.mode='pause';Input.setActive(false);Input.unlock();Menu.pause();},
 resume(){if(this.mode!=='pause')return;this._enter();},
 _died(){if(this.mode!=='play')return;this.mode='dead';this.deadT=0;HUD.death(true,this.failReason,'');},
 fail(reason){if(this.mode!=='play')return;this.failReason=reason||' ';Player.die(null);},
 complete(){if(this.mode!=='play')return;this.mode='complete';const S=this.stats||{time:0,kills:0,shots:0,hits:0,heads:0,deaths:0},lv=this.level;
  const st={time:S.time,kills:S.kills,acc:S.shots?Math.round(S.hits/S.shots*100):0,heads:S.heads,deaths:S.deaths,medal:this.D.medal,diff:this.diff,level:lv.id};
  const prev=Save.done[lv.id],rank={bronze:1,silver:2,gold:3};Save.done[lv.id]={time:prev?Math.min(prev.time,st.time):st.time,medal:prev&&rank[prev.medal]>rank[st.medal]?prev.medal:st.medal,diff:this.diff};Save.store();
  Input.setActive(false);Input.unlock();HUD.show(false);this.lastStats=st;Bus.emit('missionComplete',{stats:st});Menu.complete(st);},
 nextLevel(){const i=LEVELS.indexOf(this.level);for(let k=i+1;k<LEVELS.length;k++)if(!LEVELS[k].survival&&LEVELS[k].id!=='test')return LEVELS[k];return null;},
 // posición del marcador del objetivo actual -> [x,y,z] | null
 marker(){const L=this.L,o=L&&L.objective;if(!o||!o.marker||L.ended)return null;let m=typeof o.marker==='function'?o.marker(L):o.marker;if(!m)return null;
  if(m.length===2)m=[m[0],null,m[1]];if(m[1]==null)m=[m[0],World.height(m[0],m[2]),m[2]];return m;}
};

// ---------- API de pruebas (DESIGN §9) ----------
const F44={
 start(id,diff){Game.manual=true;GFX.auto=false;return Game.start(id,diff||'regular',true)?Game.mode:null;},
 step(n){Game.manual=true;n=n||1;for(let i=0;i<n;i++){Input.update(0);if(Game.mode==='play'||Game.mode==='dead')Game.update(FIX);Input.consume();}return this.state();},
 render(){Game.manual=true;return new Promise(res=>requestAnimationFrame(()=>{Game.render(1/60);res(GL.gl?GL.gl.getError():-1);}));},
 input(cmd){Input.override=cmd?Object.assign(mkCmd(),cmd):null;},
 bot(on){Game.botOn=!!on;Bot.reset();Bot.warps=0;},
 god(on){Player.god=!!on;},
 teleport(x,y,z,yaw){Player.pos[0]=x;Player.pos[2]=z;Player.pos[1]=y==null?World.groundAt(x,z,0.3,World.height(x,z)+0.6):y;V3.set(Player.vel,0,0,0);if(yaw!=null)Player.yaw=yaw;},
 state(){const L=Game.L,w=Weapons.cur(),o=L&&L.objective;return {mode:Game.mode,level:Game.level&&Game.level.id,
  objective:L?{index:L.obj,count:Game.level.objectives.length,text:o?txt(o.text):null,ended:L.ended}:null,
  player:{pos:Player.pos.map(v=>+v.toFixed(2)),yaw:+Player.yaw.toFixed(3),health:Math.round(Player.health),alive:Player.alive,stance:Player.stance,weapon:w?w.id:null,ammo:w?{mag:w.mag,reserve:w.ammo}:null},
  enemies:Actors.count('axis'),allies:Actors.count('ally'),fps:Game.fps,time:L?+L.time.toFixed(2):0,stats:Game.stats,warps:Bot.warps,cp:L&&L.cp?L.cp.obj:-1};},
 skipObjective(){if(Game.L)Game.L.next();},
 auto(){Game.manual=false;Game.last=0;},
 title(){Game.toTitle();}
};
window.F44=F44;window.Game=Game;
Game.init();
