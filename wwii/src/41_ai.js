// ===== FRENTE 44 · inteligencia: enemigos, aliados y carros =====
// Cada actor con cerebro (a.brain) piensa a ~10 Hz repartido entre pasos (percepción y decisiones) y actúa en cada paso (moverse por el
// camino, apuntar, ráfagas). Enemigos: estados idle/alert/combat/search, vista en cono + World.los, oído por el Bus, coberturas
// (asomarse y esconderse, cambiar), supresión, flanqueo, granadas con parábola, huir de granadas, cargas a la bayoneta, retirada,
// fichas de ataque por dificultad, nidos de MG42, francotiradores con destello y oficiales que gritan y animan. Aliados: siguen al jugador
// o a su destino, se cubren, disparan sin cruzarse con el jugador y avisan con Voice.say (claves de CALLOUTS). Carros: ruta, torreta, aviso,
// proyectil explosivo y ametralladora. Órdenes del guion: AI.order / AI.alert / AI.follow (ver DESIGN §4 AI).
const AI_PW={rifle:42,sniper:72,smg:16,lmg:22,mg:20,pistol:16,launcher:60}; // daño al jugador por bala en Regular (antes de la dificultad)
const AI={tokens:new Set(),t:0,nadeT:{axis:4,ally:4},sayT:{},tagN:{},_pb:0,charger:null,_e:[0,0,0],_c:[0,0,0],_d:[0,0,0],_q:[0,0,0],_r:[0,0,0],_s:[0,0,0],
 reset(){this.tokens.clear();this.t=0;this.nadeT={axis:4,ally:6};this.sayT={};this.tagN={};this.charger=null;this.shells=[];},
 shells:[],
 D(){return typeof Game!=='undefined'&&Game.D?Game.D:{acc:1,tokens:3,dmg:1};},
 night(){return (Env.stars||0)>0.5||Env.sunCol&&Env.sunCol[0]+Env.sunCol[1]<0.6;},
 // ---------- órdenes del guion ----------
 // AI.order(actor | lista | 'etiqueta', {behavior, goal, path, hold, alert, accuracy, aggression}) — goal:null devuelve a los aliados a seguir al jugador
 order(who,o){const L=typeof who==='string'?Actors.list.filter(a=>a.tag===who||a.name===who):Array.isArray(who)?who:[who];
  for(const a of L){if(!a||!a.alive)continue;for(const k of ['behavior','path','accuracy','aggression','leash','retreat'])if(o[k]!==undefined)a[k]=o[k];
   if(o.goal!==undefined)a.goal=o.goal?(o.goal.length===2?[o.goal[0],World.height(o.goal[0],o.goal[1]),o.goal[1]]:o.goal.slice()):null;
   if(a.brain){const b=a.brain;b.beh=null;b.pi=0;b.path=null;b.cover&&World.cover.release(b.cover,a);b.cover=null;b.moved=false;if(o.alert)this._alert(a,o.alert===true?Player.pos:o.alert);}}return L;},
 // pone en guardia a un grupo hacia una posición (por defecto el jugador)
 alert(tag,pos){for(const a of Actors.list)if(a.alive&&(!tag||a.tag===tag))this._alert(a,pos||Player.pos);},
 follow(who){return this.order(who||Actors.list.filter(a=>a.team==='ally'),{goal:null,behavior:null});},
 // ---------- cerebro ----------
 _brain(a){const b={think:(a.id%10)*0.01,st:a.alertStart?'alert':'idle',beh:null,tgt:null,vis:false,seenT:-99,lkp:null,aware:0,cover:null,peek:false,peekT:0,
  mv:null,path:null,pi:0,pathT:0,pg:[0,0,0],run:false,supp:0,fireT:0.5+Math.random(),burst:0,shotT:0,aimT:0,tok:false,tokT:0,tokCD:0,nadeT:3+Math.random()*4,
  flee:null,fleeT:0,charge:false,stuckT:0,lp:a.pos.slice(),morale:1,home:a.pos.slice(),shoutT:4+Math.random()*4,buff:-9,retreated:false,coverT:0,miss:false,
  pathFail:0,sideT:0,lastSay:-9,hintT:0,mgTry:0,warn:0,coax:0};
  if(a.alertStart&&a.team==='axis'){b.lkp=Player.pos.slice();b.alT=-9;}return b;},
 _beh(a){if(a.tank)return a.behavior||'advance';if(a.behavior)return a.behavior;if(a.anim.mount||a.mg||a.kind==='mg'&&a.team==='axis')return 'mg';if(a.kind==='sniper'&&a.team==='axis')return 'sniper';
  if(a.data&&a.data.rush)return 'charge';if(a.hold)return 'hold';if(a.path&&a.team==='axis')return 'patrol';if(a.team==='ally')return a.goal?'goal':'follow';return a.goal?'advance':'hold';},
 _alert(a,pos){const b=a.brain||(a.brain=this._brain(a));if(b.st==='idle'||b.st==='search'){b.st='alert';b.aware=1;b.alT=this.t;}if(!b.vis&&pos&&b.st!=='combat'){b.lkp=b.lkp||[0,0,0];V3.copy(pos,b.lkp);}},
 say(a,key,force){const k=a.team+key,t=this.t;if(!force&&(t-(this.sayT[a.team]||-9)<2.5||t-(this.sayT[k]||-9)<8))return;this.sayT[a.team]=t;this.sayT[k]=t;
  if(typeof Voice!=='undefined'&&V3.dist2(a.pos,Player.pos)<2500)Voice.say(a.name||(a.team==='axis'?'axis':'ally'),key);},
 // quién lleva rato sin moverse (atrincherado): para decidir granadas
 _still(o){const p=o.pos;if(!o._mp){o._mp=p.slice();o._mt=this.t;}else if(V3.distXZ(p,o._mp)>1.5){V3.copy(p,o._mp);o._mt=this.t;}},
 update(dt){this.t+=dt;this.nadeT.axis-=dt;this.nadeT.ally-=dt;this._pb=2;const D=this.D();let ai=0;this._still(Player);
  for(const a of Actors.list){if(!a.alive){if(this.tokens.has(a))this.tokens.delete(a);if(this.charger===a)this.charger=null;continue;}
   this._still(a);const b=a.brain||(a.brain=this._brain(a));if(!b.beh)b.beh=this._beh(a);if(a.team==='ally'&&!a.tank)b.idx=ai++;
   b.think-=dt;if(b.think<=0){b.think+=0.1;if(a.tank)this._tankThink(a,b,D);else{this._perceive(a,b,D);this._decide(a,b,D);}}
   if(a.tank)this._tankAct(a,b,dt,D);else this._act(a,b,dt,D);}
  this._shells(dt);},
 // ---------- percepción (10 Hz) ----------
 _range(a){return a.sight||(a.brain&&a.brain.beh==='sniper'?160:Math.min(a.team==='axis'?90:75,(Env.fogF||400)*0.75)*(this.night()?0.55:1));},
 _tp(t,o){if(t===Player){Player.eye(o);o[1]-=Player.stance==='crouch'?0.25:0.4;return o;}return Actors.chest(t,o);},
 _perceive(a,b,D){const e=Actors.eye(a,this._e),R=this._range(a),fw=a.aim[0],aware=b.st==='combat'||b.st==='alert';let best=null,bd=R,checks=0,seeP=false;
  const look=(t)=>{const c=this._tp(t,this._c),dx=c[0]-e[0],dz=c[2]-e[2],d=Math.hypot(dx,c[1]-e[1],dz);if(d>bd)return;
   if(d>4&&!(b.st==='combat'&&t===b.tgt)){const ang=Math.abs(angNorm(Math.atan2(dx,dz)-fw));if(ang>(aware?1.75:1.05))return;}
   if(checks++>5)return;if(!World.los(e,c)){if(t===Player&&Player.stance!=='crouch'){c[1]+=0.35;if(!World.los(e,c))return;}else return;}
   if(t===Player)seeP=true;bd=d;best=t;};
  if(a.team==='axis'){if(Player.alive)look(Player);for(const o of Actors.list)if(o.alive&&o.team==='ally')look(o);}
  else for(const o of Actors.list)if(o.alive&&o.team==='axis')look(o);
  // aún sin alerta: el jugador se detecta poco a poco (de cerca, de pie y moviéndose, antes)
  if(best&&b.st==='idle'&&a.team==='axis'&&best===Player&&bd>6){const k=(1.6-bd/R)*(Player.stance==='crouch'?0.55:1)*(Player.speed>3?1.6:Player.speed>0.5?1.1:0.7)*(this.night()?0.6:1);
   b.aware+=0.1*k*1.6;if(b.aware<1){b.lkp=b.lkp||[0,0,0];return;}}
  if(best){b.tgt=best;b.vis=true;b.seenT=this.t;b.lkp=b.lkp||[0,0,0];V3.copy(best===Player?Player.pos:best.pos,b.lkp);
   if(b.st!=='combat'){b.st='combat';b.aimT=0;if(a.team==='ally')this.say(a,'enemySpotted');else if(Math.random()<0.5)this.say(a,'enemySpotted');
    // avisa a los compañeros cercanos
    for(const o of Actors.list)if(o!==a&&o.alive&&!o.tank&&o.team===a.team&&V3.dist2(o.pos,a.pos)<900)this._alert(o,b.lkp);}
   if(a.tag&&a.team==='axis')this.tagN[a.tag]=Math.max(this.tagN[a.tag]||0,Actors.count('axis',a.tag));}
  else{b.vis=false;if(b.st==='combat'&&this.t-b.seenT>(b.beh==='hold'||b.beh==='mg'?14:7)){b.st='search';b.seT=this.t;}}},
 // ---------- decisiones (10 Hz) ----------
 _decide(a,b,D){const P=Player,beh=b.beh,thr=b.lkp,A=a.anim;b.supp=Math.max(0,b.supp-0.06);
  // ¡granada! apartarse
  if(typeof Weapons!=='undefined')for(const g of Weapons.grenades){const dx=a.pos[0]-g.pos[0],dz=a.pos[2]-g.pos[2],d=Math.hypot(dx,dz);
   if(d<5&&g.t<3.8&&g.owner!==a&&!A.mount){if(!b.flee){const k=7/(d||1);b.flee=World.nav.near([a.pos[0]+dx*k,a.pos[1],a.pos[2]+dz*k],4)||[a.pos[0]+dx*k,a.pos[1],a.pos[2]+dz*k];b.fleeT=2.5;b.path=null;
     if(a.team==='ally'||Math.random()<0.6)this.say(a,'grenade',true);}break;}}
  if(b.flee)return;
  const dist=thr?V3.distXZ(a.pos,thr):99,ally=a.team==='ally',comb=b.st==='combat';
  // nido de ametralladora: ir al arma y quedarse; si el enemigo se echa encima, la abandona
  if(beh==='mg'){if(!A.mount){let u=a.mg&&a.mg.kind?a.mg:null;if(!u)for(const q of World.usables)if(q.kind==='mg'&&(!q._ai||!q._ai.alive)&&V3.distXZ(q.pos,a.pos)<(a.mg==='auto'||a.kind==='mg'?12:0.1)&&q.on!==false){u=q;break;}
    if(u&&b.mgTry<60){a.mg=u;const s=this._seat(u),dd=V3.distXZ(a.pos,s);b.mgTry++;if(dd<0.6){a.pos[0]=s[0];a.pos[2]=s[2];Actors.mount(a,u);a.yaw=u.yaw;a.stance='crouch';b.mv=null;}else{b.mv=s;b.run=true;}return;}
    b.beh='hold';if(a.weapon==='mg42mount'){a.weapon='mp40';a.gun=ACT_GUN.mp40;a.mag=32;}return;}
   if(thr&&dist<4.5&&b.vis){Actors._release(a);b.beh='hold';if(a.weapon==='mg42mount'){a.weapon='mp40';a.gun=ACT_GUN.mp40;a.mag=32;}return;}
   a.ready=comb?1:0.6;return;}
  if(beh==='sniper'){a.stance=b.supp>0.6&&!b.vis?'crouch':'stand';a.ready=comb?1:0;b.mv=null;return;}
  // oficial: grita y anima a los suyos
  if(a.kind==='officer'&&comb&&(b.shoutT-=0.1)<=0){b.shoutT=7+Math.random()*5;Actors.act(a,'shout',1.0);this.say(a,Math.random()<0.5?'moveUp':'enemySpotted',true);
   for(const o of Actors.list)if(o.alive&&o.team===a.team&&o.brain&&V3.dist2(o.pos,a.pos)<500){o.brain.buff=this.t;o.brain.supp*=0.5;}}
  // retirada si la escuadra está diezmada (el oficial y los que mantienen posición aguantan más)
  if(!ally&&comb&&!b.retreated&&a.tag&&this.tagN[a.tag]>=3){const n=Actors.count('axis',a.tag),N=this.tagN[a.tag];
   if(n/N<0.35&&Math.random()<0.03*(1.2-a.aggression)*(this.t-b.buff<8?0.3:1)){b.retreated=true;const away=V3.norm([a.pos[0]-thr[0],0,a.pos[2]-thr[2]]);
    const to=a.retreat?(a.retreat.length===2?[a.retreat[0],0,a.retreat[1]]:a.retreat):[a.pos[0]+away[0]*22,a.pos[1],a.pos[2]+away[2]*22];
    const c=World.cover.find(to,thr,10,a);this._takeCover(a,b,c);if(!c)b.mv=World.nav.near(to,6);b.run=true;b.home=(b.mv||to).slice();b.beh='hold';return;}}
  // carga a la bayoneta: de vez en cuando, de cerca
  if(!ally&&(beh==='charge'&&comb||comb&&b.vis&&dist<16&&dist>4&&!this.charger&&Math.random()<0.004*a.aggression*(1+b.supp*0))){if(!b.charge){b.charge=true;this.charger=a;this.say(a,'moveUp');}}
  if(b.charge){if(!comb||!P.alive)b.charge=false;else{b.mv=b.tgt===P||!b.tgt?P.pos:b.tgt.pos;b.run=true;a.stance='stand';a.ready=1;this._release(a,b);return;}}
  // granada si el objetivo lleva un rato escondido
  if(comb&&a.grenades>0&&!A.act&&thr&&dist>6&&dist<30&&(this.t-b.seenT>2.5||b.tgt&&this.t-(b.tgt._mt||this.t)>5&&dist<27)&&this.nadeT[a.team]<=0&&(b.nadeT-=0.1)<=0&&(ally||Math.random()<0.5)){
   if(!ally||Actors.count('axis')>0){this._throw(a,b,thr,D);return;}}
  // patrulla y reposo
  // en guardia y sabiendo dónde está el enemigo: pasa a combatir (cubrirse, hostigar, granadas) aunque no lo vea
  if(b.st==='alert'&&thr&&!ally&&this.t-(b.alT||0)>3){b.st='combat';b.seenT=this.t-2;b.tgt=b.tgt||Player;return;}
  if(!comb&&b.st!=='search'){a.ready=b.st==='alert'?1:0;if(ally){this._allyMove(a,b,false);return;}
   if(beh==='patrol'&&a.path&&b.st==='idle'){const p=a.path[b.pi%a.path.length],q=p.length===2?[p[0],0,p[1]]:p;if(V3.distXZ(a.pos,q)<1.2)b.pi++;b.mv=q;b.run=false;a.stance='stand';return;}
   if(b.st==='alert'&&thr&&!b.cover){const c=World.cover.find(a.pos,thr,8,a);this._takeCover(a,b,c);}
   if(beh==='advance'&&a.goal&&V3.distXZ(a.pos,a.goal)>2&&!b.cover){b.mv=a.goal;b.run=b.st==='alert';}
   if(b.cover)this._coverStep(a,b,false);return;}
  if(b.st==='search'){a.ready=1;if(ally){this._allyMove(a,b,false);return;}
   if(beh==='hold'||beh==='sniper'){if(thr&&this.t-(b.seT||0)>8){b.st='alert';b.alT=this.t;}if(!b.cover&&thr){this._takeCover(a,b,World.cover.find(a.pos,thr,6,a));}if(b.cover)this._coverStep(a,b,false);return;}
   if(thr&&V3.distXZ(a.pos,thr)>3){this._release(a,b);b.mv=thr;b.run=false;}else{b.st='alert';b.lkp=null;}return;}
  // ---------- combate ----------
  a.ready=1;if(ally){this._allyMove(a,b,true);return;}
  const leash=a.leash||(beh==='hold'?7:14);
  // cobertura comprometida (nos han flanqueado) o ninguna: buscar otra
  let need=!b.cover;if(b.cover){const c=b.cover,tx=thr[0]-c.pos[0],tz=thr[2]-c.pos[2],tl=Math.hypot(tx,tz)||1;if(-(tx*c.n[0]+tz*c.n[2])/tl<0.25||tl<3)need=true;}
  if(beh==='advance'&&a.goal&&!b.moved&&V3.distXZ(a.pos,a.goal)>4&&(!b.cover||this.t-b.coverT>4+Math.random()*4)){need=true;b.adv=true;}
  if(need&&this.t-b.coverT>1.2){let from=a.pos,r=leash;
   if(b.adv&&a.goal){const g=a.goal,dx=g[0]-a.pos[0],dz=g[2]-a.pos[2],l=Math.hypot(dx,dz)||1,k=Math.min(l,9);from=this._q;from[0]=a.pos[0]+dx/l*k;from[1]=a.pos[1];from[2]=a.pos[2]+dz/l*k;r=7;}
   else if(beh!=='hold'&&Math.random()<0.25*a.aggression&&dist<45){const dx=a.pos[0]-thr[0],dz=a.pos[2]-thr[2],l=Math.hypot(dx,dz)||1,s=Math.random()<0.5?-1:1;
    from=this._q;from[0]=a.pos[0]+(-dz/l)*s*9-dx/l*3;from[1]=a.pos[1];from[2]=a.pos[2]+(dx/l)*s*9-dz/l*3;r=7;}
   else if(beh==='hold'){from=b.home;}
   const c=World.cover.find(from,thr,r,a);b.adv=false;if(c&&c!==b.cover){this._takeCover(a,b,c);if(Math.random()<0.4)this.say(a,'coverMe');}
   else if(!c){b.coverT=this.t;if(beh==='advance'&&a.goal&&V3.distXZ(a.pos,a.goal)>3){b.mv=a.goal;b.run=true;}else{b.mv=null;a.stance=b.supp>0.5||dist>20?'crouch':'stand';}}}
  if(b.cover)this._coverStep(a,b,true);},
 _seat(u){return u.seat||[u.pos[0]-Math.sin(u.yaw)*0.95,u.pos[1],u.pos[2]-Math.cos(u.yaw)*0.95];},
 _takeCover(a,b,c){if(!c)return;this._release(a,b);World.cover.claim(c,a);b.cover=c;b.coverT=this.t;b.mv=c.pos;b.run=true;b.peek=false;b.peekT=0.6+Math.random();},
 _release(a,b){if(b.cover){World.cover.release(b.cover,a);b.cover=null;}},
 // en la cobertura: escondido (agachado) y asomarse a disparar (de pie tras una baja o un paso al lado tras una alta)
 _coverStep(a,b,comb){const c=b.cover,at=V3.distXZ(a.pos,c.pos)<0.8;if(!at&&b.mv!==c.pos&&!b.peek){b.mv=c.pos;}
  if(!at&&!b.peek)return;b.peekT-=0.1;const sup=b.supp>0.8;
  if(b.peekT<=0){b.peek=comb&&!sup&&!b.peek;b.peekT=b.peek?1.6+Math.random()*2.2:0.9+Math.random()*1.8+(sup?1.5:0);
   if(!c.low&&b.peek){const s=(a.id&1)?1:-1;b.side=[c.pos[0]-c.n[2]*s*0.85,c.pos[1],c.pos[2]+c.n[0]*s*0.85];if(!World.nav.walkable(b.side[0],b.side[2]))b.side=[c.pos[0]+c.n[2]*s*0.85,c.pos[1],c.pos[2]-c.n[0]*s*0.85];}}
  if(b.peek){a.stance='stand';b.mv=c.low?c.pos:b.side||c.pos;}else{a.stance='crouch';b.mv=c.pos;}},
 // aliados: huecos alrededor del jugador (o su destino); en combate, la cobertura más cercana a su hueco
 _allyMove(a,b,comb){const P=Player,i=b.idx||0;let base;
  if(a.goal&&b.beh==='goal'||a.goal){base=a.goal;if(!b.moved&&V3.distXZ(a.pos,a.goal)>6&&this.t-(b.mvSay||-9)>20){b.mvSay=this.t;this.say(a,'moveUp');}}
  else{const s=i%2?1:-1,k=1+(i>>1),f=V3.dirYaw(P.yaw);base=this._s;base[0]=P.pos[0]-f[0]*2.6*k+f[2]*s*2.2*k;base[1]=P.pos[1];base[2]=P.pos[2]-f[2]*2.6*k-f[0]*s*2.2*k;}
  if(comb&&b.lkp){const need=!b.cover||V3.distXZ(b.cover.pos,base)>9||this.t-b.coverT>10;
   if(need&&this.t-b.coverT>1.5){const c=World.cover.find(base,b.lkp,8,a);if(c&&c!==b.cover)this._takeCover(a,b,c);else b.coverT=this.t;}
   if(b.cover){this._coverStep(a,b,true);return;}a.stance='crouch';}
  else{this._release(a,b);a.stance=P.stance==='crouch'&&V3.distXZ(a.pos,P.pos)<12?'crouch':'stand';}
  const d=V3.distXZ(a.pos,base);if(d>(a.goal?1.2:2.5)){b.mv=d>3&&!a.goal?World.nav.near(base,3)||base:base;b.run=d>6;}else b.mv=null;},
 // granada en parábola hacia la última posición conocida (con error)
 _throw(a,b,thr,D){const e=Actors.eye(a,[0,0,0]);a.grenades--;b.nadeT=8+Math.random()*6;this.nadeT[a.team]=(a.team==='axis'?8:12)/(D.acc||1)+Math.random()*4;
  const err=(1.8+Math.random()*1.5)/(D.acc||1),an=Math.random()*6.28,tx=thr[0]+Math.cos(an)*err,tz=thr[2]+Math.sin(an)*err;
  b.nade={tgt:[tx,World.height(tx,tz),tz],rel:false};Actors.act(a,'throw',0.9);a.aim[0]=Math.atan2(tx-a.pos[0],tz-a.pos[2]);a.stance='stand';b.mv=null;
  this.say(a,'grenade',true);},
 _release_nade(a,b){const n=b.nade,e=Actors.eye(a,[0,0,0]);e[1]+=0.25;const t=clamp(V3.distXZ(e,n.tgt)/10,0.9,2.0),g=14;
  const v=[(n.tgt[0]-e[0])/t,(n.tgt[1]+0.2-e[1]+0.5*g*t*t)/t,(n.tgt[2]-e[2])/t];const ty=a.team==='axis'?'stiel':'frag',W=WEAPONS[ty]||WEAPONS.frag;
  Weapons.throwGrenade(a,e,v,ty,Math.max(t+1.2,Math.min(W.fuse||4,t+2.2)));n.rel=true;},
 // ---------- acción (cada paso): moverse, apuntar y disparar ----------
 _act(a,b,dt,D){const A=a.anim,wd=WEAPONS[a.weapon]||WEAPONS.kar98;
  if(b.flee){b.fleeT-=dt;if(b.fleeT<=0||V3.distXZ(a.pos,b.flee)<0.8){b.flee=null;}else{b.mv=b.flee;b.run=true;a.stance='stand';}}
  if(b.nade&&!b.nade.rel&&A.act==='throw'&&A.at>=0.45)this._release_nade(a,b);if(b.nade&&A.act!=='throw')b.nade=null;
  if(A.act==='reload'&&!b.reloading){b.reloading=true;}else if(b.reloading&&A.act!=='reload'){b.reloading=false;a.mag=wd.mag||10;}
  // movimiento por el camino
  let mx=0,mz=0;const mg=!!A.mount,busy=A.act==='throw'||mg;
  if(b.mv&&!busy){const g=b.mv;b.pathT-=dt;const far=V3.distXZ(a.pos,g);
   if(far>0.5){if((!b.path||b.pathT<=0||V3.distXZ(b.pg,g)>1.5)&&this._pb>0){this._pb--;b.path=World.nav.path(a.pos,g);b.pi=0;b.pathT=3+Math.random();V3.copy(g,b.pg);if(!b.path){b.pathFail++;}}
    let w=b.path&&b.path[b.pi];while(w&&b.pi<b.path.length-1&&V3.distXZ(a.pos,w)<0.5)w=b.path[++b.pi];if(!w)w=g;
    const dx=w[0]-a.pos[0],dz=w[2]-a.pos[2],l=Math.hypot(dx,dz)||1;let sp=b.charge?5.2:b.run?(a.stance==='crouch'?2.4:3.9):a.stance==='crouch'?1.5:(b.st==='idle'?1.35:2.0);
    if(b.vis&&!b.run&&!b.charge)sp*=0.75;if(b.flee)sp=4.6;if(l>0.05&&far>0.25){mx=dx/l*sp;mz=dz/l*sp;}}
   else{b.path=null;if(b.st==='idle'&&b.beh==='patrol')b.mv=null;}}
  const k=Math.min(1,dt*10);a.vel[0]+=(mx-a.vel[0])*k;a.vel[2]+=(mz-a.vel[2])*k;
  // atasco: si no avanza, se rehace el camino
  b.stuckT+=dt;if(b.stuckT>1.5){if(Math.hypot(mx,mz)>1&&V3.distXZ(a.pos,b.lp)<0.4){b.path=null;b.pathT=0;if(b.cover&&++b.pathFail>2){this._release(a,b);b.pathFail=0;}}V3.copy(a.pos,b.lp);b.stuckT=0;}
  // a dónde mira: al objetivo si lo ve; si no, hacia donde va o a la última posición
  const tg=b.tgt&&(b.tgt===Player?Player.alive:b.tgt.alive)?b.tgt:null,e=Actors.eye(a,this._e),mvs=Math.hypot(mx,mz);let wy=a.yaw,ay=a.aim[0],apt=a.aim[1]*0.95;
  if(tg&&(b.vis||this.t-b.seenT<1.5)){const c=this._tp(tg,this._c);ay=Math.atan2(c[0]-e[0],c[2]-e[2]);apt=Math.atan2(c[1]-e[1],Math.hypot(c[0]-e[0],c[2]-e[2]));
   wy=mvs>2.6&&!b.charge?Math.atan2(mx,mz):ay;}
  else if(mvs>0.3){wy=Math.atan2(mx,mz);ay=wy;}else if(b.lkp&&b.st!=='idle'){ay=Math.atan2(b.lkp[0]-a.pos[0],b.lkp[2]-a.pos[2]);wy=ay;}
  else if(b.cover&&!b.vis){ay=Math.atan2(-b.cover.n[0],-b.cover.n[2]);wy=ay;}
  if(A.act==='throw'&&b.nade)ay=wy=Math.atan2(b.nade.tgt[0]-a.pos[0],b.nade.tgt[2]-a.pos[2]);
  if(mg){const u=A.mount.u,arc=u.arc||1.1;ay=u.yaw+clamp(angNorm(ay-u.yaw),-arc,arc);wy=u.yaw;}
  const tr=(b.beh==='sniper'?1.5:4.5)*dt,ea=angNorm(ay-a.aim[0]);a.aim[0]=angNorm(a.aim[0]+clamp(ea,-tr,tr));a.aim[1]+=clamp(apt-a.aim[1],-tr,tr);
  if(Math.abs(angNorm(wy-a.yaw))>0.6||mvs>0.3||Math.abs(angNorm(a.aim[0]-a.yaw))>0.9)a.yaw=angNorm(a.yaw+clamp(angNorm(wy-a.yaw),-5*dt,5*dt));
  if(mg){a.yaw=A.mount.u.yaw;a.pos[0]+=(this._seat(A.mount.u)[0]-a.pos[0])*0.2;a.pos[2]+=(this._seat(A.mount.u)[2]-a.pos[2])*0.2;}
  // fichas de ataque contra el jugador
  b.tokCD-=dt;if(b.tok){b.tokT-=dt;if(b.tokT<=0||!b.vis){this.tokens.delete(a);b.tok=false;b.tokCD=1.2+Math.random()*2;}}
  a.glint=0;if(!tg||!b.vis||A.act||b.flee||a.team==='ally'&&!this._clear(a,e,tg)){b.aimT=0;return;}
  if(a.team==='axis'&&tg===Player&&!b.tok&&b.tokCD<=0&&this.tokens.size<(D.tokens||3)+(b.beh==='mg'?1:0)){this.tokens.add(a);b.tok=true;b.tokT=(b.beh==='mg'?4:2.5)+Math.random()*2;}
  const may=a.team==='ally'||tg!==Player||b.tok;b.aimT+=dt;if(b.beh==='sniper'){a.glint=tg===Player?clamp(b.aimT/1.5,0,1):0;if(b.aimT<2.4/(D.acc||1))return;}
  if(b.cover&&!b.peek&&b.supp>0.8&&b.beh!=='mg')return; // agachado bajo el fuego: no asoma
  b.fireT-=dt;if(Math.abs(ea)>0.12||mvs>3.2&&!b.charge)return;
  if(b.burst<=0&&b.fireT<=0){if(!may&&Math.random()<0.6){b.fireT=0.8+Math.random();return;}b.miss=!may;
   b.burst=wd.mode==='auto'?(b.beh==='mg'?12+(Math.random()*20|0):3+(Math.random()*4|0)):1;b.shotT=0;}
  if(b.burst>0){b.shotT-=dt;if(b.shotT<=0){b.shotT=60/(wd.rpm||300)*(b.beh==='mg'?1:1.15);b.burst--;this._shoot(a,b,wd,e,tg,D);
   if(b.burst<=0)b.fireT=b.beh==='mg'?0.5+Math.random()*0.9:wd.mode==='auto'?0.6+Math.random()*0.9:wd.mode==='bolt'?0.3+Math.random()*1.2:0.7+Math.random()*1.1;}}},
 // ¿el jugador o un compañero se cruza en la línea de tiro de un aliado?
 _clear(a,e,tg){const c=this._tp(tg,this._d),dx=c[0]-e[0],dy=c[1]-e[1],dz=c[2]-e[2],L=Math.hypot(dx,dy,dz)||1;
  const chk=p=>{const px=p[0]-e[0],py=p[1]+1.1-e[1],pz=p[2]-e[2],t=(px*dx+py*dy+pz*dz)/L;if(t<0.5||t>L-0.5)return true;const qx=px-dx/L*t,qy=py-dy/L*t,qz=pz-dz/L*t;return qx*qx+qy*qy*0.3+qz*qz>0.8;};
  if(!chk(Player.pos)){if(this.t-a.brain.sideT>1.5){a.brain.sideT=this.t;const s=Math.random()<0.5?-1:1;a.brain.mv=World.nav.near([a.pos[0]-dz/L*s*2,a.pos[1],a.pos[2]+dx/L*s*2],2);}return false;}
  for(const o of Actors.list)if(o!==a&&o.alive&&o.team===a.team&&!o.tank&&!chk(o.pos))return false;return true;},
 _shoot(a,b,wd,e,tg,D){const c=this._tp(tg,this._c),P=Player,dist=V3.dist(e,c),isP=tg===P;
  if(b.miss){const s=Math.random()<0.5?-1:1;c[0]+=(Math.random()-0.5)*2+s*1.6;c[1]+=Math.random()*1.2-0.2;c[2]+=(Math.random()-0.5)*2+s*1.6;}
  const v=V3.sub(c,e,this._q);const tm=isP?P.speed:tg.speed||0;
  let acc=(a.team==='ally'?0.022:0.034)/((D.acc||1)*(a.accuracy||1))*(1+dist/38)*(1+Math.min(1,tm/4)*0.7)*(isP&&P.stance==='crouch'?1.15:1)*(1+b.supp*0.6)*(a.speed>0.6?1.6:1)
   *(1+Math.max(0,1.2-b.aimT)*0.9)*(this.t-b.buff<10?0.85:1)*(b.beh==='mg'?1.25:b.beh==='sniper'?0.25:1)*(a.anim.cr>0.5?0.85:1);
  if(b.charge)acc*=1.6;const d=V3.norm(v,v),r=acc*Math.sqrt(-2*Math.log(Math.random()+1e-6))*0.6,t=Math.random()*6.283,rt=this._r;rt[0]=-Math.cos(a.aim[0]);rt[1]=0;rt[2]=Math.sin(a.aim[0]);
  const up=V3.cross(rt,d,this._s),dir=[d[0]+(rt[0]*Math.cos(t)+up[0]*Math.sin(t))*r,d[1]+up[1]*Math.sin(t)*r,d[2]+(rt[2]*Math.cos(t)+up[2]*Math.sin(t))*r];V3.norm(dir,dir);
  const mz=Actors.muzzle(a,[0,0,0]);if(typeof FX!=='undefined'){FX.muzzle(mz,dir,b.beh==='mg'?1.2:wd.cls==='pistol'?0.6:0.85,false);if(FX.shell&&V3.dist2(a.pos,P.pos)<400&&wd.mode!=='bolt')FX.shell(mz,[-dir[2]*1.5,1.5,dir[0]*1.5]);}
  a.anim.fire=1;const k=isP?(AI_PW[b.beh==='sniper'?'sniper':b.beh==='mg'?'mg':wd.cls]||30)/(wd.dmg||30):a.team==='ally'?0.8:0.7;
  Weapons.fire(a,wd,e,dir,{muzzle:mz,k});a.mag--;
  if(wd.mode==='bolt'&&a.mag>0)Actors.act(a,'bolt',Math.max(0.6,60/(wd.rpm||55)-0.2));
  if(a.mag<=0&&!wd.mounted){Actors.act(a,'reload',(wd.reload?wd.reload[1]:2.5)*1.1);b.burst=0;if(a.team==='ally'&&Math.random()<0.35||a.team==='axis'&&Math.random()<0.15)this.say(a,'reloading');
   if(b.cover)b.peek=false,b.peekT=1;}
  else if(wd.mounted&&a.mag<=0)a.mag=wd.mag;},
 // ---------- carros ----------
 _tankThink(a,b,D){const V=a.V,e=this._e;e[0]=a.pos[0];e[1]=a.pos[1]+V.h;e[2]=a.pos[2];const R=a.sight||Math.min(140,(Env.fogF||400)*0.8);let best=null,bd=R,bs=-1;
  const look=t=>{const c=this._tp(t,this._c),d=V3.dist(e,c);if(d>bd+15)return;if(!World.los(e,c))return;const s=(t===Player?30:t.tank?40:0)-d*0.3;if(s>bs){bs=s;bd=Math.min(bd,d);best=t;}};
  if(a.team==='axis'){if(Player.alive)look(Player);for(const o of Actors.list)if(o.alive&&o.team==='ally')look(o);}else for(const o of Actors.list)if(o.alive&&o.team==='axis')look(o);
  if(best){if(b.tgt!==best)b.warn=0;b.tgt=best;b.vis=true;b.seenT=this.t;b.lkp=(b.lkp||[0,0,0]);V3.copy(best===Player?Player.pos:best.pos,b.lkp);b.st='combat';}else b.vis=false;
  // ruta: a.path ([[x,z],...]) o a.goal; se detiene a disparar si 'hold' o si tiene blanco cerca
  let w=null;if(a.path&&b.pi<a.path.length){const p=a.path[b.pi];w=p.length===2?[p[0],0,p[1]]:p;if(V3.distXZ(a.pos,w)<3)b.pi++;}else if(a.goal&&V3.distXZ(a.pos,a.goal)>3)w=a.goal;
  const stop=a.behavior==='hold'||b.vis&&bd<(a.half?18:45)&&!b.troopsOut&&a.half||b.vis&&bd<35&&!a.half&&Math.random()<0.6;
  if(w&&!stop){a.steer=Math.atan2(w[0]-a.pos[0],w[2]-a.pos[2]);a.drive=a.speedMax*(Math.abs(angNorm(a.steer-a.yaw))>0.5?0.25:1);}else a.drive=0;
  // el semioruga baja a su escuadra al llegar o al verse en peligro
  if(a.half&&a.troops&&!b.troopsOut&&(!w||a.health<a.maxHealth*0.7||b.vis&&bd<25)){b.troopsOut=true;const n=a.troops,s=Math.sin(a.yaw),c=Math.cos(a.yaw);
   for(let i=0;i<n;i++){const p=[a.pos[0]-s*(V.hz+1)+c*(i-n/2)*0.9,0,a.pos[2]-c*(V.hz+1)-s*(i-n/2)*0.9];const q=World.nav.near(p,4)||p;
    const t=Actors.spawn({team:a.team,kind:i===0?'smg':'rifle',pos:q,yaw:a.yaw+Math.PI,tag:a.tag,goal:a.goal&&!w?null:a.goal,behavior:'advance'});this._alert(t,b.lkp||Player.pos);}}},
 _tankAct(a,b,dt,D){const V=a.V,tg=b.tgt&&(b.tgt===Player?Player.alive:b.tgt.alive)?b.tgt:null;if(!tg||!b.vis&&this.t-b.seenT>3){b.warn=0;return;}
  const c=this._tp(tg,this._c),e=this._e;e[0]=a.pos[0];e[1]=a.pos[1]+(V.tur?V.tur[1]+V.gun[0]:V.mg[1]);e[2]=a.pos[2];
  const ty=Math.atan2(c[0]-e[0],c[2]-e[2]),tp=Math.atan2(c[1]-e[1],Math.hypot(c[0]-e[0],c[2]-e[2]));a.aimT[0]=ty;a.aimT[1]=tp;const err=Math.abs(angNorm(ty-a.aim[0]));
  b.fireT-=dt;
  // cañón: aviso (evento 'tankAim' y sonido de la torreta) y disparo un rato después
  if(V.tur&&b.vis&&err<0.05){if(!b.warn){b.warn=this.t;Bus.emit('tankAim',{actor:a,target:tg});}
   if(b.fireT<=0&&this.t-b.warn>1.6/(D.acc||1)){b.fireT=(6+Math.random()*3)/Math.sqrt(D.acc||1);this._cannon(a,tg,D);}}
  // ametralladora coaxial / del semioruga
  if(b.vis&&err<0.25&&V3.dist(e,c)<75){const isP=tg===Player;if(isP&&!b.tok&&this.tokens.size<(D.tokens||3)){this.tokens.add(a);b.tok=true;b.tokT=3;}
   if(b.tok){b.tokT-=dt;if(b.tokT<=0){this.tokens.delete(a);b.tok=false;}}
   b.coax-=dt;if(b.coax<=0&&(!isP||b.tok)){if(b.burst<=0){b.burst=8+(Math.random()*12|0);}b.coax=0.07;b.burst--;if(b.burst<=0)b.coax=1+Math.random()*1.5;
    const wd=WEAPONS.mg42mount,s=Math.sin(a.aim[0]),co=Math.cos(a.aim[0]),o=V.tur?[e[0]+co*V.coax[0]+s*V.coax[2],e[1]-0.1,e[2]-s*V.coax[0]+co*V.coax[2]]:[a.pos[0]+Math.sin(a.yaw)*V.mg[2],a.pos[1]+V.mg[1]+0.1,a.pos[2]+Math.cos(a.yaw)*V.mg[2]];
    const v=V3.norm(V3.sub(c,o)),sp=0.05/(D.acc||1)*(1+V3.dist(o,c)/40);const dir=V3.norm([v[0]+(Math.random()-0.5)*sp,v[1]+(Math.random()-0.5)*sp,v[2]+(Math.random()-0.5)*sp]);
    if(typeof FX!=='undefined')FX.muzzle(V3.madd(o,dir,0.5),dir,1,false);Weapons.fire(a,wd,o,dir,{muzzle:V3.madd(o,dir,0.5),k:isP?AI_PW.mg/wd.dmg:0.7});}}},
 // proyectil explosivo con vuelo (trazadora) y error según la dificultad
 _cannon(a,tg,D){const V=a.V,y=a.aim[0],p=a.aim[1],dir=V3.dirYP(y+(Math.random()-0.5)*0.03/(D.acc||1),p+(Math.random()-0.5)*0.02/(D.acc||1)),o=[a.pos[0],a.pos[1]+V.tur[1]+V.gun[0],a.pos[2]];
  V3.madd(o,V3.dirYaw(y),V.tur[2]*0+V.gun[1]+V.len,o);const h=World.raycast(o,dir,300,{actors:true,ignore:a});let t=h?h.t:300;const pt=Weapons._rayPlayer?Weapons._rayPlayer(o,dir,t):-1;if(pt>=0)t=pt;
  const hp=V3.madd(o,dir,t);if(typeof FX!=='undefined'){FX.muzzle(o,dir,3,false);if(FX.tracer)FX.tracer(o,hp);FX.shake&&V3.dist(o,Player.pos)<30&&FX.shake(0.15);}
  a.gp-=0.04;Bus.emit('shot',{pos:o,dir,weapon:'cannon',by:a,loud:3});this.shells.push({pos:h?V3.madd(h.pos,h.normal||[0,1,0],0.3):hp,t:t/450,by:a,actor:h&&h.actor});},
 _shells(dt){for(let i=this.shells.length-1;i>=0;i--){const s=this.shells[i];s.t-=dt;if(s.t<=0){this.shells.splice(i,1);Weapons.explode(s.pos,5,130,s.by,{shell:true,actor:s.actor});}}}
};
// oído y supresión: disparos cercanos o que pasan rozando, impactos recibidos, explosiones y bajas
Bus.on('shot',d=>{const by=d.by;if(!by)return;const team=by===Player?'ally':by.team,R=55*(d.loud||1);
 for(const a of Actors.list){if(!a.alive||a.tank||a.team===team)continue;const b=a.brain;if(!b)continue;const dx=a.pos[0]-d.pos[0],dz=a.pos[2]-d.pos[2],dd=dx*dx+dz*dz;if(dd>R*R)continue;
  if(b.st!=='combat'){AI._alert(a,d.pos);if(by!==Player&&by.pos)b.lkp=by.pos.slice();}
  if(d.dir){const cx=a.pos[0]-d.pos[0],cy=a.pos[1]+1-d.pos[1],cz=a.pos[2]-d.pos[2],t=cx*d.dir[0]+cy*d.dir[1]+cz*d.dir[2];if(t>0){const q=cx*cx+cy*cy+cz*cz-t*t;if(q<5)b.supp=Math.min(2,b.supp+(d.weapon==='cannon'?1:0.25));}}}});
Bus.on('hit',d=>{const a=d.actor;if(!a||!a.brain||!a.alive)return;const b=a.brain;b.supp=Math.min(2,b.supp+0.6);if(d.by&&d.by.pos&&b.st!=='combat'){b.st='combat';b.tgt=d.by;b.lkp=d.by.pos.slice();b.seenT=AI.t;}});
Bus.on('explosion',d=>{for(const a of Actors.list){if(!a.alive||!a.brain||a.tank)continue;const dd=V3.dist(a.pos,d.pos);if(dd<14)a.brain.supp=Math.min(2,a.brain.supp+1.2*(1-dd/14));else if(dd<45)AI._alert(a,d.pos);}});
Bus.on('kill',d=>{const v=d.actor;if(!v)return;
 if(v.team==='ally'&&!v.tank){for(const a of Actors.list)if(a.alive&&a.team==='ally'&&!a.tank&&V3.dist2(a.pos,v.pos)<900){AI.say(a,'manDown');break;}}
 else if(v.team==='axis')for(const a of Actors.list)if(a.alive&&a.team==='axis'&&a.brain&&V3.dist2(a.pos,v.pos)<400){a.brain.supp=Math.min(2,a.brain.supp+0.35);a.brain.morale-=0.15;}
});
// '¡Despejado!' poco después de caer el último enemigo cercano
Bus.on('kill',d=>{if(!d.actor||d.actor.team!=='axis')return;let near=0;for(const a of Actors.list)if(a.alive&&a.team==='axis'&&V3.dist2(a.pos,Player.pos)<3600)near++;
 if(!near)for(const a of Actors.list)if(a.alive&&a.team==='ally'&&!a.tank){AI.say(a,'clear');break;}});
