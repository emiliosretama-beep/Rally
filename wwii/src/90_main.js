// ===== FRENTE 44 · juego: estados, bucle de paso fijo, carga de misiones, guion (L), piloto automático y API de pruebas (F44) =====
// Estados: title · brief · play · pause · dead · complete. Simulación a FIX (1/120 s) con varios pasos por fotograma; render por rAF.
const DIFF={recluta:{id:'recluta',dmg:0.5,acc:0.65,tokens:2,medal:'bronze'},regular:{id:'regular',dmg:1,acc:1,tokens:3,medal:'silver'},veterano:{id:'veterano',dmg:1.8,acc:1.5,tokens:5,medal:'gold'}};
const DIFF_ALIAS={recruit:'recluta',easy:'recluta',normal:'regular',veteran:'veterano',hard:'veterano'};
const NO_CMD=mkCmd();
const LN=k=>typeof LINES!=='undefined'?LINES[k]||null:null; // frase de guion (21_levels.js)

// ---------- guion de la misión (DESIGN §5): temporizadores, corrutinas, disparadores, oleadas, artillería, puntos de control ----------
// Corrutinas: L.run(function*(L){ yield 2; yield L.wait(1); yield ()=>cond; yield L.until(fn); yield* L.talk([...]); ... }) — yield n = esperar n s de simulación.
class Script{
 constructor(level){this.level=level;this.flags={};this.obj=-1;this.time=0;this.timers={};this.co=[];this.tm=[];this.trig=[];this.waves=[];this.barr=[];this.fol=[];this.ons=[];this.cp=null;this.restoring=false;this.ended=false;this.status='';}
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
 // escucha del Bus que se quita sola al terminar el guion (reinicio, salida)
 on(ev,fn){const f=d=>{if(!this.dead)fn(d,this);};Bus.on(ev,f);this.ons.push([ev,f]);return f;}
 dispose(){this.dead=true;for(const [e,f] of this.ons)Bus.off(e,f);this.ons.length=0;for(const c of this.co)c.live=false;}
 // zonas: {x,z,r} | {x0,z0,x1,z1} | {pos:[x,y,z], r} | [x,z,r]; y0/y1 opcionales
 _area(a){if(Array.isArray(a))return {x:a[0],z:a[1],r:a[2]||3};if(a.pos)return Object.assign({x:a.pos[0],z:a.pos[2],r:a.r||3},a);return a;}
 inside(a,p){a=a.x0!=null||a.r!=null?a:this._area(a);if(a.y0!=null&&p[1]<a.y0||a.y1!=null&&p[1]>a.y1)return false;
  return a.r!=null?Math.hypot(p[0]-a.x,p[2]-a.z)<=a.r:p[0]>=Math.min(a.x0,a.x1)&&p[0]<=Math.max(a.x0,a.x1)&&p[2]>=Math.min(a.z0,a.z1)&&p[2]<=Math.max(a.z0,a.z1);}
 // fn(L) al entrar el jugador en la zona (una vez; {repeat:true} cada vez que entra)
 trigger(area,fn,opts){const h={area:this._area(area),fn,once:!(opts&&opts.repeat),live:true,in:false,stop(){this.live=false;}};this.trig.push(h);return h;}
 near(p,r){return V3.distXZ(Player.pos,p)<=r;}
 _xyz(p){if(!p)return null;if(typeof p==='string'){const q=World.point(p);return q?q.slice(0,3):null;}const q=p.length===2?[p[0],null,p[1]]:p.slice(0,3);
  if(q[1]==null){const h=World.height(q[0],q[2]);q[1]=World.groundAt(q[0],q[2],0.25,h+0.6);}return q;}
 // punto con nombre de un prefabricado ('pref.nombre') -> [x,y,z]
 pt(name){const q=World.point(name);return q?q.slice(0,3):null;}
 // soldados: {team, kind, pos|at:[[x,z],...] (o 'pref.punto'), n, yaw|face:[x,z], tag, goal, behavior:'hold'|'advance'|'patrol'|'charge'|'mg', route:[[x,z],...],
 //  name, weapon, hero, health, stance, frozen (no se mueve: instructores)} (o una lista) -> [actores]
 spawn(g){if(Array.isArray(g)){let o=[];for(const x of g)o=o.concat(this.spawn(x));return o;}const n=g.n||1,out=[],base=g.at||g.pos||[0,0,0],multi=typeof base!=='string'&&(Array.isArray(base[0])||typeof base[0]==='string');
  for(let i=0;i<n;i++){const p=this._xyz(multi?base[i%base.length]:base);if(!p)continue;if(n>1&&!multi){const a=i*2.4,r=1+i*0.7;p[0]+=Math.sin(a)*r;p[2]+=Math.cos(a)*r;p[1]=this._xyz([p[0],p[2]])[1];}
   const pp=typeof (multi?base[i%base.length]:base)==='string'?World.point(multi?base[i%base.length]:base):null;
   const fc=g.face?this._xyz(g.face):Player.pos,yaw=g.yaw!=null?g.yaw:pp&&pp[3]!=null&&!g.face?pp[3]:Math.atan2(fc[0]-p[0],fc[2]-p[2]);
   const beh=g.behavior||(g.hold?'hold':g.rush?'charge':null),route=g.route?g.route.map(q=>this._xyz(q)):null;
   const a=Actors.spawn({team:g.team||'axis',kind:g.kind||'rifle',pos:p,yaw,name:g.name,weapon:g.weapon,tag:g.tag,hero:g.hero,health:g.health,stance:g.stance,behavior:beh,route,path:route,
    mg:typeof g.mg==='string'?this.useOf(g.mg):g.mg,sight:g.sight,leash:g.leash,alert:g.alert,accuracy:g.accuracy,aggression:g.aggression,grenades:g.grenades,look:g.look,retreat:g.retreat?this._xyz(g.retreat):undefined,
    data:{behavior:beh,route,rush:!!g.rush||beh==='charge',home:p.slice()}});
   a.behavior=beh;a.route=route;if(g.goal)a.goal=this._xyz(g.goal);else if(beh==='hold'||beh==='mg')a.goal=null;a.hold=g.hold||beh==='hold'||beh==='mg';a.data.rush=!!g.rush||beh==='charge';
   if(g.frozen)a.frozen=true;if(g.onSpawn)g.onSpawn(a);out.push(a);}return out;}
 // oleada: {tag, n (total), max (vivos a la vez), every (s), delay, from:[[x,z],...], kind|kinds, goal|goals, behavior, team, weapon} -> {spawned, total, done, stop()}
 wave(d){const h={tag:d.tag||'wave',total:d.n||6,max:d.max||4,every:d.every||3,spawned:0,next:d.delay||0,done:false,live:true,d,stop(){this.live=false;}};this.waves.push(h);return h;}
 // cuántos quedan vivos con esa etiqueta (o lista de etiquetas; sin etiqueta: todos los enemigos)
 alive(tag){let n=0;const arr=Array.isArray(tag);for(const a of Actors.list)if(a.alive&&(tag?(arr?tag.includes(a.tag):a.tag===tag):a.team==='axis'))n++;return n;}
 // el vivo más cercano al jugador con esa etiqueta -> [x,y,z] | null (para marcadores)
 nearest(tag){let b=null,bd=1e9;const arr=Array.isArray(tag);for(const a of Actors.list)if(a.alive&&(arr?tag.includes(a.tag):a.tag===tag)){const d=V3.distXZ(a.pos,Player.pos);if(d<bd){bd=d;b=a.pos;}}return b;}
 // frase: L.say(clave) (quién sale de LINES) o L.say(quién, clave[, texto])
 say(who,key,text){if(key==null||(typeof key==='object'&&text==null&&!LN(key))){if(LN(who)){text=key;key=who;who=LN(key).who;}}Voice.say(who,key,text||LN(key)||undefined);}
 // diálogo encadenado: yield* L.talk(['clave1', 1.5, ['Russo','clave2'], ...]) — espera según la longitud de cada frase
 *talk(list){for(const it of list){if(typeof it==='number'){yield it;continue;}const k=Array.isArray(it)?it[1]:it,ln=LN(k);this.say(Array.isArray(it)?it[0]:ln?ln.who:'Hayes',k);
  yield ln?clamp(1.1+txt(ln).length*0.05,1.6,6):2;}}
 hint(text,dur){HUD.msg('',txt(text),dur||4);}
 // aliados por nombre y lista de la escuadra
 ally(name){return Actors.list.find(a=>a.alive&&a.team==='ally'&&a.name===name)||null;}
 squad(){return Actors.list.filter(a=>a.alive&&a.team==='ally');}
 // destino de la escuadra (la IA completa lo usa; null = seguir al jugador): pts = [x,z] común o lista por miembro
 squadTo(pts){const S=this.squad();S.forEach((a,i)=>{const p=!pts?null:Array.isArray(pts[0])?pts[i%pts.length]:pts;a.goal=p?this._xyz(p):null;a.data.squadGoal=a.goal;});}
 // punto de control: guarda jugador (armas, munición) y guion (objetivo actual y flags)
 checkpoint(name,silent){this.cp={obj:this.obj,flags:JSON.parse(JSON.stringify(this.flags)),player:Player.snapshot(),name:name||null};if(!silent)Bus.emit('checkpoint',{name});}
 // fuego de artillería en una zona: n proyectiles (Infinity = hasta stop()), cada ~interval s, con silbido 1.1 s antes; area.danger permite caer junto al jugador.
 // opts: {air (altura: estallido en las copas de los árboles), r (radio), dmg, safe (distancia mínima al jugador, 6)}
 barrage(area,n,interval,opts){const h={area:this._area(area),left:n==null?Infinity:n,iv:interval||2,next:0.4,pend:[],live:true,o:opts||{},stop(){this.live=false;}};this.barr.push(h);return h;}
 // explosión inmediata (guion): L.boom([x,y,z], r, dmg)
 boom(p,r,dmg,opts){const q=this._xyz(p);Weapons.explode(q,r||6,dmg==null?200:dmg,null,Object.assign({shell:true},opts||{}));return q;}
 fail(reason){Game.fail(txt(reason));}
 complete(opts){this.ended=true;Game.complete(opts);}
 // temporizador: L.timer(n, segundos[, visible]) empieza una cuenta atrás; L.timer(n) -> segundos que quedan (o transcurridos si no tenía duración)
 timer(name,secs,show){if(secs!=null){this.timers[name]={t0:this.time,dur:secs,show:show!==false};return secs;}const q=this.timers[name];if(!q){this.timers[name]={t0:this.time,dur:0,show:false};return 0;}
  return q.dur?Math.max(0,q.dur-(this.time-q.t0)):this.time-q.t0;}
 stopTimer(name){delete this.timers[name];}
 // ---------- interactuables y efectos ----------
 usable(u){if(u.pos)u.pos=this._xyz(u.pos);return World.addUsable(u);}
 useOf(tag){return World.usables.find(u=>u.tag===tag)||null;}
 // caja de munición
 ammo(p,tag){return this.usable({kind:'ammo',pos:p,r:1.8,tag:tag||'ammo',text:{es:'coger munición',en:'take ammo'},short:{es:'Munición',en:'Ammo'},use:()=>{Weapons.refill();Bus.emit('ammo',{});}});}
 // ametralladora fija {pos, yaw, arc, tag}
 mg(p,yaw,o){o=o||{};const q=this._xyz(p);return this.usable(Object.assign({kind:'mg',pos:[q[0],q[1]+(o.h||0),q[2]],yaw,arc:o.arc||1.1,weapon:'mg42mount',mountH:0.62,tag:o.tag||'mg',text:{es:'usar la ametralladora',en:'use the machine gun'},short:{es:'MG',en:'MG'}},o.u||{}));}
 // carga explosiva: {pos, text, hold (s, 2), fuse (s, 5), radius, dmg, remove:[ids], swap:{...prop nuevo}, flag, tag, follow:actor, onPlant(L), onBoom(L)}
 charge(o){const L=this,u=this.usable({kind:'charge',pos:o.pos,r:o.r||2,hold:o.hold==null?2:o.hold,once:true,tag:o.tag||'charge',text:o.text||{es:'colocar la carga',en:'plant the charge'},short:{es:'Carga',en:'Charge'},
   use:()=>{if(o.flag)L.flags[o.flag+'Planted']=true;L.hint({es:'¡Carga colocada! ¡Apártate!',en:'Charge planted! Get clear!'},3);Bus.emit('pin',{by:Player});const fz=o.fuse==null?5:o.fuse;L.timer('carga',fz,true);L._call(o.onPlant);
    L.wait(fz,()=>{L.stopTimer('carga');const p=u.follow&&u.follow.alive?Actors.chest(u.follow):u.pos;Weapons.explode([p[0],p[1]+0.8,p[2]],o.radius||6,o.dmg||400,Player,{charge:true,actor:u.follow||null});
     if(u.follow&&u.follow.alive)Actors.damage(u.follow,99999,'hull',{by:Player,explosive:true,weapon:'charge'});
     for(const id of [].concat(o.remove||[]))World.remove(id);if(o.swap)World.addProp(Object.assign({},o.swap));FX.shake(0.8);if(o.flag)L.flags[o.flag]=true;L._call(o.onBoom);});}});
  if(o.follow)this.follow(u,o.follow,o.off||[0,-3.4]);return u;}
 // un interactuable que va pegado a un actor (cargas en la trasera de un carro): off = [lado, adelante] en metros
 follow(u,actor,off){this.fol.push({u,a:actor,off});}
 fire(p,size){return FX.fire(this._xyz(p),size||1);}
 smoke(p,o){return FX.smoke(this._xyz(p),o||{});}
 // arma en el suelo para recoger: L.pickup('bazooka', [x,z], munición)
 pickup(id,p,ammo){const d=WEAPONS[id];if(!d)return null;const q=this._xyz(p);return Weapons.drop(d,[q[0],q[1]+0.3,q[2]],ammo);}
 // carros: {pos, yaw, goal|route, half (semioruga), health, tag, team}
 tank(o){const p=this._xyz(o.pos),route=o.route?o.route.map(q=>this._xyz(q)):null,a=(o.half?Actors.spawnHalftrack:Actors.spawnTank).call(Actors,Object.assign({team:o.team||'axis',pos:p,yaw:o.yaw||0,tag:o.tag||'tank'},
  o.health?{health:o.health}:{},o.type?{type:o.type}:{},o.speed?{speed:o.speed}:{},o.camo?{camo:o.camo}:{},route?{path:route}:{},{behavior:o.behavior||'advance'}));
  if(o.goal)a.goal=this._xyz(o.goal);if(route){a.route=route;a.data.route=route;if(!o.goal)a.goal=route[route.length-1];}a.data.behavior=o.behavior||'advance';return a;}
 // rampa de una lancha (prefab lcvpramp): la baja en dur s y cambia los colisionadores
 ramp(id,dur,fn){const r=World.props[id];if(!r)return;const t0=this.time,A=r.rampAng;
  this.run(function*(L){for(;;){const k=clamp((L.time-t0)/(dur||1.2),0,1),e=k*k;World.hinge(id,r.hinge,r.hingeYaw,A*e);if(k>=1)break;yield 0;}
   for(const c of r.rampUp)World.colOn(c,false);for(const c of r.rampDown)World.colOn(c,true,true);FX.shake(0.25);L._call(fn);});}
 // cámara de cine: keys [{eye:[x,y,z], yaw, pitch}], dur s; el jugador no se mueve mientras dura
 cine(keys,dur,fn){Game.cine={keys,t:0,dur:dur||6,fn:fn||null,L:this};}
 fade(on){const e=document.getElementById('fade');if(e)e.classList.toggle('on',!!on);}
 // ---------- objetivos ----------
 // atajos de objetivo: reach:[x,z,r] · kill:'tag'|[...] · flag:'nombre' · use:'tag' (usable a usar; el piloto automático lo usa) · pickup:'arma' · marker:'pref.punto'
 _norm(o){if(o._n)return o;o._n=true;
  if(o.reach&&!o.marker)o.marker=[o.reach[0],null,o.reach[1]];if(o.reach&&!o.done)o.done=L=>L.near([o.reach[0],0,o.reach[1]],o.reach[2]||3);
  if(o.kill&&!o.marker)o.marker=L=>L.nearest(o.kill);if(o.kill&&!o.done)o.done=L=>L.alive(o.kill)===0;
  if(o.flag&&!o.done)o.done=L=>!!L.flags[o.flag];
  if(o.use&&!o.marker)o.marker=L=>{const u=L.useOf(o.use);return u&&u.on?u.pos:null;};
  if(typeof o.marker==='string'){const nm=o.marker;o.marker=()=>World.point(nm);}return o;}
 get objective(){const o=this.level.objectives[this.obj];return o?this._norm(o):null;}
 startObj(cp){const o=this.objective;if(!o)return;if(cp!==false&&o.checkpoint!==false)this.checkpoint(null,this.obj===0);Bus.emit('objective',{index:this.obj,text:txt(o.text)});
  if(this.obj>0||!this.restoring)HUD.msg(t('objective'),txt(o.text),3);this._call(o.onStart);}
 next(){if(this.ended)return;const o=this.objective;if(o)this._call(o.onDone);Bus.emit('objectiveDone',{index:this.obj});this.obj++;
  if(this.obj>=this.level.objectives.length){this.ended=true;HUD.msg(t('objDone'),'',2);const fin=this.level.finale;this.wait(1.6,()=>fin?this._call(fin):Game.complete());return;}
  HUD.msg(t('objDone'),'',1.5);this.wait(1.2,()=>this.startObj());}
 update(dt){this.time+=dt;
  for(let i=0;i<this.tm.length;i++){const h=this.tm[i];if(!h.live){this.tm.splice(i--,1);continue;}if(this.time>=h.at){this.tm.splice(i--,1);h.live=false;this._call(h.fn);}}
  for(const c of this.co.slice())this._step(c);this.co=this.co.filter(c=>c.live);
  for(const h of this.trig){if(!h.live)continue;const ins=this.inside(h.area,Player.pos);if(ins&&!h.in){if(h.once)h.live=false;this._call(h.fn);}h.in=ins;}this.trig=this.trig.filter(h=>h.live);
  for(const h of this.waves){if(!h.live)continue;h.next-=dt;const d=h.d,al=this.alive(h.tag);
   if(h.spawned<h.total&&h.next<=0&&al<h.max){const F=d.from||[[0,0]],K=d.kinds||[d.kind||'rifle'],G=d.goals||null,fi=d.random?(Math.random()*F.length)|0:h.spawned%F.length;
    const s=this.spawn({team:d.team||'axis',kind:K[h.spawned%K.length],pos:F[fi],tag:h.tag,goal:G?G[h.spawned%G.length]:d.goal,rush:d.rush,behavior:d.behavior||'advance',weapon:d.weapon,face:d.face});
    if(d.onSpawn)for(const a of s)d.onSpawn(a,this);h.spawned++;h.next=h.every;}
   h.done=h.spawned>=h.total&&al===0;}
  for(const h of this.barr){if(!h.live&&!h.pend.length)continue;h.next-=dt;const O=h.o;
   if(h.live&&h.left>0&&h.next<=0){h.next=h.iv*(0.6+Math.random()*0.8);h.left--;const a=h.area;let p=null;
    for(let k=0;k<8;k++){const q=a.r!=null?(()=>{const an=Math.random()*6.283,r=Math.sqrt(Math.random())*a.r;return [a.x+Math.sin(an)*r,0,a.z+Math.cos(an)*r];})():[lerp(a.x0,a.x1,Math.random()),0,lerp(a.z0,a.z1,Math.random())];
     if(a.danger||V3.distXZ(q,Player.pos)>(O.safe||6)){p=q;break;}}
    if(p){p[1]=World.height(p[0],p[2])+(O.air?O.air*(0.7+Math.random()*0.5):0);h.pend.push({pos:p,t:1.1});Bus.emit('incoming',{pos:p});Snd.play('whizz',{pos:p,vol:1.4});}}
   for(let i=h.pend.length-1;i>=0;i--){const q=h.pend[i];q.t-=dt;if(q.t<=0){h.pend.splice(i,1);Weapons.explode(q.pos,O.r||7,O.dmg==null?220:O.dmg,null,{shell:true,air:!!O.air});
    if(O.air&&typeof FX!=='undefined')for(let k=0;k<3;k++)FX.impact([q.pos[0]+(Math.random()-0.5)*3,q.pos[1]-Math.random()*2,q.pos[2]+(Math.random()-0.5)*3],[0,-1,0],'wood',2);}}}
  for(let i=this.fol.length-1;i>=0;i--){const f=this.fol[i],a=f.a;if(!a.alive||!f.u.on){f.u.on=false;this.fol.splice(i,1);continue;}const s=Math.sin(a.yaw),c=Math.cos(a.yaw);
   f.u.pos[0]=a.pos[0]+c*f.off[0]+s*f.off[1];f.u.pos[2]=a.pos[2]-s*f.off[0]+c*f.off[1];f.u.pos[1]=a.pos[1];f.u.follow=a;}
  const o=this.objective;if(o&&!this.ended&&o.done&&o.done(this))this.next();}
}

// ---------- piloto automático para las pruebas: va al objetivo por World.nav, dispara mientras anda, salta y se agacha ante obstáculos,
// usa cargas, ametralladoras y armas del objetivo, lanza granadas (o.lob), dispara a dianas (o.aim) y busca un sitio con vista (torres, ventanas) ----------
const Bot={path:null,pi:0,pt:0,goal:null,tgt:null,tt:0,ft:0,st:0,sp:null,stuck:0,strafe:0,warps:0,_u:false,_e:[0,0,0],_d:[0,0,0],_o:[0,0,0],crT:0,ct:0,nade:0,mt:0,vt:0,van:null,vk:null,seen:0,
 reset(){this.path=null;this.pi=0;this.pt=0;this.goal=null;this.tgt=null;this.tt=0;this.st=0;this.sp=null;this.stuck=0;this.strafe=0;this._u=false;this.crT=0;this.nade=0;this.mt=0;this.van=null;this.vk=null;this.seen=0;},
 _hasBaz(){const I=Weapons.inv;for(let i=0;i<3;i++){const w=I.w[i];if(w&&w.id==='bazooka'&&w.mag+w.ammo>0)return i;}return -1;},
 _target(){const e=Player.eye(this._e),baz=this._hasBaz()>=0;let best=null,bd=1e9;
  for(const a of Actors.list){if(!a.alive||a.team!=='axis')continue;if(a.tank&&!baz)continue;const c=Actors.chest(a),d=V3.dist(e,c);if(d>(a.tank?120:80))continue;if(!World.los(e,c))continue;
   const s=d*(a.tank?0.5:1);if(s<bd){bd=s;best=a;}}return best;},
 _turn(c,yaw,pitch,dt){const P=Player,ey=angNorm(yaw-(P.yaw+P.recoil.y)),ep=pitch-(P.pitch+P.recoil.p),r=7*dt;c.lookX=-clamp(ey,-r,r);c.lookY=clamp(ep,-r,r);return Math.abs(ey)+Math.abs(ep)*0.5;},
 // mover hacia una dirección del mundo sin girar la cámara
 _moveDir(c,dx,dz,k){const P=Player,sy=Math.sin(P.yaw),cy=Math.cos(P.yaw),l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;c.mz=(dx*sy+dz*cy)*k;c.mx=(-dx*cy+dz*sy)*k;},
 // celda transitable con vista sobre el punto m (francotirador en una torre, enemigo en un piso alto)
 _vantage(m){const N=World.nav,P=Player.pos,tp=[m[0],m[1]+1.2,m[2]],e=[0,0,0];let best=null,bd=1e9;
  for(let r=5;r<=45;r+=5){for(let a=0;a<20;a++){const an=a/20*6.283,x=m[0]+Math.sin(an)*r,z=m[2]+Math.cos(an)*r,k=N.idx(x,z);if(k<0||!N.walk[k])continue;const p=N.pos(k);e[0]=p[0];e[1]=p[1]+1.6;e[2]=p[2];
    if(!World.los(e,tp))continue;const d=V3.distXZ(p,P)+r*0.3;if(d<bd){bd=d;best=p;}}if(best&&r>=15)break;}return best;},
 // cabeceo para lanzar una granada a p (simula la parábola de Weapons: 17 m/s + 3.2 hacia arriba, g 14)
 _lob(p){const e=Player.eye(),dx=Math.hypot(p[0]-e[0],p[2]-e[2]),dy=p[1]-e[1];let best=0,be=1e9;
  for(let a=-0.4;a<1.2;a+=0.02){const vx=17*Math.cos(a),vy=17*Math.sin(a)+3.2;const t=dx/vx,y=vy*t-7*t*t;const er=Math.abs(y-dy);if(er<be){be=er;best=a;}}return best;},
 think(dt,c){const P=Player;for(const k of CMD_HELD)c[k]=false;for(const k of CMD_EDGE)c[k]=false;c.mx=c.mz=c.lookX=c.lookY=0;c.slot=0;if(!P.alive)return;
  const L=Game.L,o=L&&L.objective;if(o&&o.bot&&o.bot(L,c,this,dt)===true)return;
  const I=Weapons.inv,w=Weapons.cur(),d=Weapons.def(),e=P.eye(this._e);this.ft-=dt;this.tt-=dt;this.crT-=dt;
  if(this.tt<=0){this.tt=0.15;this.tgt=this._target();}
  const a=this.tgt&&this.tgt.alive?this.tgt:null;if(a)this.seen=0;else this.seen+=dt;
  // ametralladora fija: dispara mientras haya enemigos; se baja si el objetivo ya no la pide
  if(P.mounted){const u=P.mounted,want=o&&o.use&&u.tag===o.use;
   if(a){const ch=Actors.chest(a),err=this._turn(c,Math.atan2(ch[0]-e[0],ch[2]-e[2]),Math.atan2(ch[1]-e[1],Math.hypot(ch[0]-e[0],ch[2]-e[2])),dt);if(err<0.05)c.fire=true;}
   if((!want&&this.seen>1.5)||(want&&o.done&&this.seen>25)){c.useDown=true;}return;}
  // armas: bazuca contra carros, cambiar si el arma está vacía
  if(a&&a.tank){const bi=this._hasBaz();if(bi>=0&&I.cur!==bi&&Weapons.st==='idle'&&this.ft<=0){c.slot=bi+1;this.ft=0.8;}}
  else if(w&&!d.mounted&&d.id==='bazooka'&&Weapons.st==='idle'&&this.ft<=0){const j=I.w[0]&&I.w[0].id!=='bazooka'?0:I.w[1]&&I.w[1].id!=='bazooka'?1:2;if(I.w[j]&&j!==I.cur){c.slot=j+1;this.ft=0.8;}}
  if(w&&!d.mounted&&w.mag===0&&w.ammo===0&&this.ft<=0){c.swap=true;this.ft=1;}
  // objetivo y camino
  let goal=Game.marker();
  if(goal&&o){const ng=World.nav.near(goal,4);const high=!ng||goal[1]-ng[1]>1.6;
   if((high||(o.kill&&V3.distXZ(P.pos,goal)<6&&a===null&&this.seen>2))&&(o.kill||o.vantage)){const vk=Math.round(goal[0])+','+Math.round(goal[2])+','+Math.round(goal[1]);
    if(this.vk!==vk||this.vt<=0){this.vk=vk;this.van=this._vantage(goal);this.vt=4;}this.vt-=dt;if(this.van)goal=this.van;}}
  // lanzar granadas a un punto (o.lob)
  if(o&&o.lob&&!a){const lp=typeof o.lob==='function'?o.lob(L):o.lob;if(lp){const dd=V3.distXZ(P.pos,lp);if(dd<26&&dd>8&&World.los(e,[lp[0],lp[1]+1,lp[2]])){const pit=this._lob(lp),err=this._turn(c,Math.atan2(lp[0]-e[0],lp[2]-e[2]),pit,dt);
    if(this.nade>0){this.nade-=dt;c.grenade=true;if(this.nade<=0)c.grenade=false;}else if(err<0.03&&Weapons.cook<0&&Weapons.st==='idle'&&I.nades>0&&this.ft<=0){c.grenadeDown=c.grenade=true;this.nade=0.25;this.ft=2.2;}
    return;}}}
  // dianas (o.aim): sin enemigos a la vista, apunta y dispara al punto
  if(o&&o.aim&&!a){const ap=o.aim(L);const apl=ap?V3.lerp(ap,e,0.4/Math.max(0.5,V3.dist(ap,e))):null;if(ap&&V3.distXZ(P.pos,ap)<70&&World.los(e,apl)){const err=this._turn(c,Math.atan2(ap[0]-e[0],ap[2]-e[2]),Math.atan2(ap[1]-e[1],Math.hypot(ap[0]-e[0],ap[2]-e[2])),dt);
    c.ads=!o.hip;if(w&&w.mag>0&&err<0.012&&this.ft<=0){c.fireDown=c.fire=true;this.ft=0.35;}if(w&&w.mag===0)c.reload=true;if(V3.distXZ(P.pos,ap)<(o.aimMax||60))return;}}
  // disparar a lo que se ve (y seguir andando)
  let aiming=false;
  if(a){const ch=Actors.chest(a),dist=V3.dist(e,ch),err=this._turn(c,Math.atan2(ch[0]-e[0],ch[2]-e[2]),Math.atan2(ch[1]-e[1],Math.hypot(ch[0]-e[0],ch[2]-e[2])),dt);aiming=true;
   c.ads=dist>12&&!(d&&d.id==='bazooka'&&dist<15);const ok=w&&w.mag>0&&err<0.02+0.5/Math.max(dist,1);
   if(ok){if(d.mode==='auto')c.fire=true;else if(this.ft<=0){c.fireDown=c.fire=true;this.ft=d.mode==='rocket'?0.6:0.3;}}
   if(w&&w.mag===0)c.reload=true;}
  else if(w&&!d.mounted&&w.mag<d.mag*0.5&&w.ammo>0&&this.ft<=0){c.reload=true;this.ft=0.5;}
  if(!goal){if(!aiming){c.lookY=clamp(-P.pitch,-0.05,0.05);}return;}
  this.pt-=dt;
  if(!(o&&o.direct)&&(!this.path||this.pt<=0||!this.goal||V3.distXZ(this.goal,goal)>2)){this.path=World.nav.path(P.pos,goal);this.pi=0;this.pt=2;this.goal=goal.slice();}
  let wp=this.path&&this.path[this.pi];while(wp&&this.pi<this.path.length-1&&V3.distXZ(P.pos,wp)<0.9)wp=this.path[++this.pi];if(!wp)wp=goal;
  if(o&&o.direct)this.path=null;
  const dg=V3.distXZ(P.pos,goal),hold=o&&o.stay;
  // en combate: anda (sin correr) hacia el objetivo mientras dispara; si no, mira al camino y corre si está lejos
  if(dg>(hold?1.2:0.6)){const dx=wp[0]-P.pos[0],dz=wp[2]-P.pos[2];
   if(aiming){if(!(o&&o.kill&&dg<10&&a))this._moveDir(c,dx,dz,dg<2?0.5:1);}
   else{const err=this._turn(c,Math.atan2(dx,dz),-0.05,dt);if(err<0.9){c.mz=dg<2?0.5:1;c.sprint=dg>15&&err<0.3&&!P.tired;}}}
  else if(!aiming)c.lookY=clamp(-P.pitch,-0.05,0.05);
  if(this.strafe>0){this.strafe-=dt;c.mx=this.sd;c.mz=0.6;}
  // obstáculos: saltar muros bajos, agacharse bajo barreras
  if(c.mz>0.2||c.mx){const mv=Math.hypot(P.vel[0],P.vel[2]),dx=wp[0]-P.pos[0],dz=wp[2]-P.pos[2],l=Math.hypot(dx,dz)||1,D=this._d,O=this._o;D[0]=dx/l;D[1]=0;D[2]=dz/l;
   O[0]=P.pos[0];O[2]=P.pos[2];O[1]=P.pos[1]+1.45;const head=World.raycast(O,D,1.1,{});O[1]=P.pos[1]+0.75;const knee=World.raycast(O,D,1.0,{});O[1]=P.pos[1]+1.15;const mid=World.raycast(O,D,1.0,{});
   if(head&&!knee&&!mid&&!head.actor){this.crT=0.7;}
   else if(knee&&!mid&&!head&&P.onGround&&!knee.actor&&knee.normal&&Math.abs(knee.normal[1])<0.5)c.jump=true;
   if(mv<0.5&&knee&&!mid&&P.onGround)c.jump=true;}
  this.ct-=dt;if(this.crT>0){if(P.stance!=='crouch'&&this.ct<=0){c.crouch=true;this.ct=0.6;}c.sprint=false;}
  else if(P.stance==='crouch'&&!(o&&o.crouch)&&this.ct<=0&&World.canStand(P.pos,0.33,1.8)){c.crouch=true;this.ct=0.6;}
  // usar: cargas y lo que pida el objetivo; recoger el arma que pida el objetivo
  const f=P.focus;let use=false;
  if(f&&f.kind==='usable'){const u=f.obj;use=(u.kind==='charge'&&dg<4)||(o&&o.use&&u.tag===o.use)||(o&&o.useAny&&dg<4);if(u.kind==='ammo'&&w&&w.ammo<d.ammo*0.25)use=true;}
  if(f&&f.kind==='pickup'&&o&&o.pickup&&(o.pickup==='*'||f.obj.id===o.pickup)){if(!this._u){c.useDown=true;}this._u=true;}
  else if(use){c.use=true;c.useDown=!this._u;this._u=true;}else this._u=false;
  // atascado: saltar y apartarse; si sigue, saltar al siguiente punto del camino (se cuenta en warps)
  this.st+=dt;if(this.st>1.2){if((c.mz||c.mx)&&this.sp&&V3.distXZ(this.sp,P.pos)<0.5&&!use){this.stuck++;c.jump=true;this.strafe=0.6;this.sd=Math.random()<0.5?-1:1;
    if(this.stuck>=4&&wp){P.pos[0]=wp[0];P.pos[2]=wp[2];P.pos[1]=wp[1];this.warps++;this.stuck=0;this.path=null;}}else if(this.sp&&V3.distXZ(this.sp,P.pos)>=0.5)this.stuck=0;this.st=0;this.sp=P.pos.slice();}}
};

// ---------- juego ----------
const Game={mode:'boot',level:null,diff:'regular',D:DIFF.regular,L:null,acc:0,last:0,stats:null,manual:false,botOn:false,fps:60,_ft:0,_fn:0,deadT:0,failReason:null,cine:null,
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
  if(this.mode==='play'){if(c.pause&&!this.cine){Input.consume();this.pause();}else{this.acc+=dt;let n=0;while(this.acc>=FIX&&n<12){this.update(FIX);Input.consume();this.acc-=FIX;n++;}if(n>=12)this.acc=0;}}
  else if(this.mode==='dead'){this.acc+=dt;let n=0;while(this.acc>=FIX&&n<12){this.update(FIX);this.acc-=FIX;n++;}if(n>=12)this.acc=0;
   if(this.deadT>2.2&&(c.fireDown||c.jump||c.useDown||c.pause))this.restartCheckpoint();Input.consume();}
  else{const pz=c.pause;Menu.update(dt);Input.consume();if(this.mode==='pause'&&pz)this.resume();if(this.mode==='title'||this.mode==='brief')this._titleTick(dt);}
  this.render(dt);},
 // un paso fijo de simulación
 update(dt){const play=this.mode==='play';let cmd=play&&!this.cine?Input.cmd:NO_CMD;if(play&&this.botOn&&!this.cine)Bot.think(dt,cmd);
  Player.update(dt,cmd);Weapons.update(dt,cmd);AI.update(dt);
  // instructores y figurantes quietos: no se desplazan, miran al jugador
  for(const a of Actors.list)if(a.frozen&&a.alive){a.vel[0]=a.vel[2]=0;if(a.frozen!=='still'&&(!a.brain||!a.brain.vis)){const y=Math.atan2(Player.pos[0]-a.pos[0],Player.pos[2]-a.pos[2]),dy=angNorm(y-a.yaw);a.yaw=angNorm(a.yaw+clamp(dy,-2*dt,2*dt));a.aim[0]=a.yaw;}}
  Actors.update(dt);FX.update(dt);if(this.L)this.L.update(dt);
  if(this.cine){const C=this.cine;C.t+=dt;if(C.t>=C.dur){this.cine=null;if(C.fn&&C.L)C.L._call(C.fn);}}
  if(play&&this.stats)this.stats.time+=dt;
  if(this.mode==='dead'){this.deadT+=dt;if(this.deadT>2.2&&HUD.el.dead)HUD.death(true,this.failReason,t('pressToContinue'));if(this.botOn&&this.deadT>1.5)this.restartCheckpoint();}},
 render(dt){if(!GL.gl||GL.lost)return;GL.begin(dt);const inLevel=this.mode==='play'||this.mode==='pause'||this.mode==='dead'||this.mode==='complete';
  Cam.set(this.cine?this._cineCam():inLevel?Player.camera():this._titleCam(dt));if(typeof Snd!=='undefined')Snd.setListener(Cam.eye,Cam.yaw);GL.setLights(FX.lights());
  if(World.built)Shadow.render(Cam.eye,Cam.fwd,(p,ci)=>{World.draw('shadow',ci);Actors.draw('shadow',ci);Weapons.drawWorld('shadow');});
  if(!inLevel)Post.fx.hurt=Post.fx.ads=Post.fx.scope=0;
  Post.begin();Sky.draw();
  if(World.built){World.draw('main');Actors.draw('main');Weapons.drawWorld('main');FX.drawOpaque();}
  Post.grabDepth();if(World.built){World.drawDecals();FX.draw();}
  if(inLevel&&this.mode!=='complete'&&!this.cine)Weapons.drawViewmodel();
  Post.end();if(inLevel)HUD.update(dt);},
 // cámara de cine (L.cine): interpola entre las claves
 _cineCam(){const C=this.cine,K=C.keys,T=this._tc,u=clamp(C.t/C.dur,0,1)*(K.length-1),i=Math.min(K.length-2,Math.floor(u)),f=smooth(u-i),A=K[Math.max(0,i)],B=K[Math.min(K.length-1,i+1)];
  V3.lerp(A.eye,B.eye,f,T.eye);T.yaw=A.yaw+angNorm(B.yaw-A.yaw)*f;T.pitch=lerp(A.pitch||0,B.pitch||0,f);T.roll=0;T.fov=A.fov||60;T.far=Math.max(450,(Env.fogF||500)*1.15);return T;},
 // cámara lenta del título (TITLE_SCENE.cam(t) si existe) y del informe (gira alrededor del punto de salida)
 _titleTick(dt){this._ta+=dt;if(this.mode==='title'&&this.level&&this.level.tick)this.level.tick(dt,this._ta);},
 _titleCam(dt){const T=this._tc;T.far=Math.max(450,(Env.fogF||500)*1.15);T.roll=0;T.fov=58;
  if(this.mode==='title'&&this.level&&this.level.cam){const k=this.level.cam(this._ta);V3.copy(k.eye,T.eye);T.yaw=k.yaw;T.pitch=k.pitch||0;T.fov=k.fov||58;return T;}
  const ta=this._ta*0.035,b=World.bounds,c=this.mode==='brief'&&this.level?this._startPos():[(b[0]+b[2])/2,0,(b[1]+b[3])/2],R=this.mode==='brief'?16:Math.min(40,(b[2]-b[0])*0.32);
  const x=c[0]+Math.sin(ta)*R,z=c[2]+Math.cos(ta)*R;T.eye[0]=x;T.eye[2]=z;T.eye[1]=(World.built?World.height(x,z):0)+(this.mode==='brief'?6:9);
  T.yaw=Math.atan2(c[0]-x,c[2]-z);T.pitch=-0.16;return T;},
 _startPos(){const s=this.level.start||{pos:[0,0]};const p=s.pos.length===2?[s.pos[0],null,s.pos[1]]:s.pos.slice();if(p[1]==null)p[1]=World.built?World.groundAt(p[0],p[2],0.3,World.height(p[0],p[2])+0.6):0;return p;},
 // ---------- cambios de estado ----------
 toTitle(){this.mode='title';if(this.L)this.L.dispose();this.L=null;this.cine=null;this.botOn=false;Input.setActive(false);Input.unlock();HUD.show(false);HUD.death(false);Actors.clear();AI.reset();FX.clear();Weapons.reset();
  const lv=typeof TITLE_SCENE!=='undefined'?TITLE_SCENE:LEVELS.find(l=>l.title)||LEVELS[0];this.level=lv;this._ta=0;this._loadWorld();if(lv.setup)lv.setup();Menu.title();},
 // empieza una misión: informe (o directamente si skip)
 start(id,diff,skip){const lv=LEVELS.find(l=>l.id===id);if(!lv){console.error('Game.start: misión desconocida '+id);return false;}
  if(this.L)this.L.dispose();this.cine=null;this.level=lv;this._setDiff(diff);Actors.clear();AI.reset();FX.clear();Weapons.reset();this.L=null;HUD.show(false);HUD.death(false);this._loadWorld();
  if(skip)this.begin(this.diff);else{this.mode='brief';Input.setActive(false);Menu.brief(lv,this.diff);}return true;},
 _setDiff(d){d=DIFF_ALIAS[d]||d;this.diff=DIFF[d]?d:'regular';this.D=DIFF[this.diff];},
 _loadWorld(){const lv=this.level;Env.set(lv.env||{});FX.clear();FX.weather(lv.env||null);World.build(lv.build(World));this._ambient();},
 // fuegos y humos fijos del escenario (World.fxPts, de los prefabricados)
 _ambient(){for(const q of World.fxPts||[]){if(q.kind==='fire')FX.fire(q.pos,q.size);else FX.smoke(q.pos,{size:q.size,rate:q.rate||4,life:q.life||8,col:q.col||[0.3,0.29,0.28]});}},
 // jugador, escuadra y guion sobre el escenario ya cargado
 _populate(){const lv=this.level,s=this._startPos();if(this.L)this.L.dispose();this.cine=null;Actors.clear();AI.reset();Weapons.reset();FX.clear();FX.weather(lv.env||null);this._ambient();
  Player.spawn(s,(lv.start&&lv.start.yaw)||0,lv.loadout||['garand','colt','frag:4']);
  (lv.squad||[]).forEach((m,i)=>{const q=m.pos?Script.prototype._xyz(m.pos):World.nav.near([s[0]+(i%2?1.8:-1.8),s[1],s[2]-1.5-i],5)||s;const a=Actors.spawn(Object.assign({team:'ally',pos:q,yaw:Player.yaw},m));if(m.frozen)a.frozen=true;});
  this.L=new Script(lv);this.acc=0;this.deadT=0;this.failReason=null;Bot.reset();},
 begin(diff){if(diff)this._setDiff(diff);this.stats={time:0,kills:0,shots:0,hits:0,heads:0,deaths:0};this._populate();const L=this.L;
  this._call(this.level.script);L.obj=0;L.startObj();this._enter();HUD.banner([txt(this.level.name),txt(this.level.place),this.level.date||'']);
  if(Input.device==='touch'&&!this.manual&&document.documentElement.requestFullscreen&&!document.fullscreenElement)document.documentElement.requestFullscreen().catch(()=>{});},
 _call(fn){if(typeof fn==='function')this.L._call(fn);},
 _enter(){this.mode='play';Menu.hide();HUD.show(true);HUD.death(false);Input.setActive(true);Input.flush();this.acc=0;if(!this.manual)Input.lock();},
 // vuelve al último punto de control: se rehace el escenario, se repite el guion con L.restoring=true y se restaura jugador y flags.
 // En supervivencia (sin puntos de control) se empieza de nuevo.
 restartCheckpoint(noDeath){if(!this.level)return;const cp=this.level.survival?null:this.L&&this.L.cp;if(this.stats&&!noDeath&&!Player.alive)this.stats.deaths++;
  if(this.level.survival&&this.stats){this.stats.time=0;this.stats.kills=0;}
  this._loadWorld();this._populate();const L=this.L,O=this.level.objectives;L.restoring=true;if(cp)L.flags=JSON.parse(JSON.stringify(cp.flags));
  this._call(this.level.script);
  if(cp){for(let i=0;i<cp.obj;i++)if(O[i]&&O[i].restore)L._call(O[i].restore);L.obj=cp.obj;Player.restore(cp.player);L.cp=cp;
   // la escuadra aparece junto al jugador
   let i=0;for(const a of Actors.list)if(a.team==='ally'&&!a.frozen){const q=World.nav.near([Player.pos[0]+(i%2?1.6:-1.6),Player.pos[1],Player.pos[2]-1.5-(i>>1)],5);if(q)V3.copy(q,a.pos);i++;}
   L.startObj(false);}else{L.obj=0;L.startObj();}
  L.restoring=false;HUD.reset();this._enter();},
 pause(){if(this.mode!=='play')return;this.mode='pause';Input.setActive(false);Input.unlock();Menu.pause();},
 resume(){if(this.mode!=='pause')return;this._enter();},
 _died(){if(this.mode!=='play')return;this.mode='dead';this.deadT=0;const lv=this.level;
  // supervivencia: se guarda el récord y la pantalla de muerte dice la puntuación
  if(lv&&lv.survival&&this.L&&lv.score){const s=lv.score(this.L);this.failReason=s.text;this.saveBest(s.points,s.wave);}
  HUD.death(true,this.failReason,'');},
 // récord de supervivencia: Save del menú si existe; si no, localStorage 'frente44:survival'
 saveBest(points,wave){try{if(typeof Save!=='undefined'&&Save&&typeof Save.store==='function'){const prev=+Save.survival||0;if(points>prev){Save.survival=points;Save.survivalWave=wave;Save.store();}return Math.max(prev,points);}
   const prev=+(localStorage.getItem('frente44:survival')||0);if(points>prev)localStorage.setItem('frente44:survival',String(points));return Math.max(prev,points);}catch(e){return points;}},
 bestSurvival(){try{if(typeof Save!=='undefined'&&Save&&Save.survival!=null)return +Save.survival||0;return +(localStorage.getItem('frente44:survival')||0);}catch(e){return 0;}},
 fail(reason){if(this.mode!=='play')return;this.failReason=reason||' ';Player.die(null);},
 // opts: {credits:true} (final de la campaña: el menú enseña los créditos)
 complete(opts){if(this.mode!=='play')return;this.mode='complete';this.cine=null;const S=this.stats||{time:0,kills:0,shots:0,hits:0,heads:0,deaths:0},lv=this.level;
  const st={time:S.time,kills:S.kills,acc:S.shots?Math.round(S.hits/S.shots*100):0,heads:S.heads,deaths:S.deaths,medal:this.D.medal,diff:this.diff,level:lv.id,credits:!!(opts&&opts.credits)};
  const prev=Save.done[lv.id],rank={bronze:1,silver:2,gold:3};Save.done[lv.id]={time:prev?Math.min(prev.time,st.time):st.time,medal:prev&&rank[prev.medal]>rank[st.medal]?prev.medal:st.medal,diff:this.diff};Save.store();
  Input.setActive(false);Input.unlock();HUD.show(false);this.lastStats=st;Bus.emit('missionComplete',{stats:st});if(st.credits)Bus.emit('credits',{});Menu.complete(st);},
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
  enemies:Actors.count('axis'),allies:Actors.count('ally'),fps:Game.fps,time:L?+L.time.toFixed(2):0,stats:Game.stats,warps:Bot.warps,cp:L&&L.cp?L.cp.obj:-1,cine:!!Game.cine};},
 skipObjective(){if(Game.L)Game.L.next();},
 auto(){Game.manual=false;Game.last=0;},
 title(){Game.toTitle();}
};
window.F44=F44;window.Game=Game;
Game.init();
