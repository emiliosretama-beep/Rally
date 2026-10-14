// ===== FRENTE 44 · HUD: retícula, marcadores de impacto, munición, brújula con objetivo, avisos, subtítulos, daño direccional, granadas, visor y muerte =====
// Capa DOM en #hud (estilos en shell.html) + canvas 2D para la brújula y los cartuchos. Lee: Player (salud, postura, foco de uso, montado),
// Weapons (cur(), adsAmt, spread, inv.nades/nadeT, grenades[{pos}], st, heat), Game (L, level, marker()), Cam y Post (pone Post.fx.hurt/ads).
// Escucha el Bus: hit, kill, playerHurt, say, checkpoint, objective, gfxAuto, wave {n}, score {add,total}, playerDied, device, settings.
const SPK_COL={hayes:'#e4c47c',russo:'#9fcae8',kowalski:'#bcd992',diaz:'#f0a874',díaz:'#f0a874',instructor:'#e4c47c',sargento:'#e4c47c',axis:'#e6826f',german:'#e6826f'};
const HICON={star:'<path d="M12 2.6l2.7 6 6.5.6-4.9 4.4 1.4 6.4L12 16.7 6.3 20l1.4-6.4-4.9-4.4 6.5-.6z"/>',check:'<path d="M4.5 12.5l5 5 10-11"/>',
 flag:'<path d="M6 21V4M6 4h11l-2.5 4L17 12H6"/>',gren:'<ellipse cx="12" cy="14" rx="6" ry="6.8"/><path d="M9.6 7.6V5h4.8v2.6M14.4 5.6l3.6-2.4"/><path d="M6.3 12h11.4M6.3 16h11.4" opacity=".6"/>',
 stand:'<circle cx="12" cy="3.6" r="2.1"/><path d="M12 6.4v7.4M12 8.4l-3.6 4M12 8.4l3.6 3.4M12 13.8l-3 7.4M12 13.8l3 7.4"/>',
 crouch:'<circle cx="11" cy="7.8" r="2.1"/><path d="M11.6 10.6l1.4 5.2M12.4 12l-3.6 2.4M12.4 12l3.8 1.2M13 15.8l4.4.4 .4 4.6M13 15.8l-4.8 2.2 1 3"/>',
 sprint:'<circle cx="14.6" cy="3.6" r="2.1"/><path d="M13.6 6.6l-2.4 6.4M13 8l3.8 2.6M12.6 8.2L8.6 9.6M11.2 13l3.8 3.2-1.4 5M11.2 13l-3.2 4-4 .6"/>'};
const hsvg=(k,cls)=>'<svg class="'+(cls||'hi')+'" viewBox="0 0 24 24" aria-hidden="true">'+HICON[k]+'</svg>';
const HUD={el:{},on:false,hm:0,hmK:false,hmH:false,dmg:[],gw:[],subs:[],msgT:0,banT:-1,ban:null,toastT:0,_c:{},_s:[0,0,0],_e:[0,0,0],_d:[0,0,0],_rayT:0,_ray:null,_objT:0,
 sv:{wave:0,score:0,rec:false,pops:[]},
 init(){const H=document.getElementById('hud');if(!H||this.el.root)return;const E=this.el;E.root=H;
  H.innerHTML='<div class="h scope"><svg viewBox="-100 -100 200 200" aria-hidden="true"><path d="M0 0l-3.4 9H-3.4V100H3.4V9H3.4z"/><rect x="-100" y="-2" width="80" height="4"/><rect x="20" y="-2" width="80" height="4"/>'+
   '<rect x="-.5" y="-100" width="1" height="86"/></svg></div>'+
   '<div class="h xh"><i class="u"></i><i class="d"></i><i class="l"></i><i class="r"></i><i class="c"></i></div><div class="h frn"></div>'+
   '<div class="h hm"><i></i><i></i><i></i><i></i></div><div class="h dm"></div><div class="h gws"></div>'+
   '<div class="h cmp"><canvas></canvas></div><div class="h tmr"></div><div class="h toast">'+hsvg('flag')+'<span></span></div>'+
   '<div class="h obj"><span class="lb">'+hsvg('star')+'<span></span></span><div class="tx"></div></div>'+
   '<div class="h surv"><div class="wv"><small></small><b>1</b></div><div class="sc"><small></small><b>0</b></div><div class="pops"></div></div>'+
   '<div class="h amm"><div class="wn"><span class="md"></span><span class="nm"></span></div><div class="cnt"><b class="mag"></b><span class="res"></span></div><canvas class="bul"></canvas>'+
   '<div class="heat"><i></i></div><div class="eq"><span class="gr"></span><span class="stn"></span></div><div class="st"></div></div>'+
   '<div class="h pr"><span class="pt"></span><span class="bar"><i></i></span></div>'+
   '<div class="h msg"><div class="t"></div><div class="s"></div></div><div class="h sub"></div>'+
   '<div class="h ban"><b></b><span class="l1"></span><span class="l2"></span></div><div class="h mk">'+hsvg('star')+'<b></b></div>'+
   '<div class="h dead"><div class="dc"><h2></h2><p class="why"></p><div class="svr"></div><div class="tipc"><span class="tl"></span><p class="tip"></p></div><p class="hint"></p></div></div>';
  const q=s=>H.querySelector(s);
  for(const k of ['scope','xh','frn','hm','dm','gws','cmp','tmr','toast','obj','surv','amm','pr','msg','sub','ban','mk','dead'])E[k]=q('.'+k);
  [...E.hm.children].forEach((b,i)=>{b.style.transform='rotate('+(45+i*90)+'deg) translateY(-13px)';});
  for(let i=0;i<6;i++){const a=document.createElement('i');a.innerHTML='<svg viewBox="0 0 120 34" preserveAspectRatio="none"><path d="M3 31Q60-6 117 31Q60 13 3 31Z"/></svg>';E.dm.appendChild(a);this.dmg.push({el:a,t:0,k:1,from:null});}
  for(let i=0;i<2;i++){const g=document.createElement('div');g.className='gw';g.innerHTML='<span class="ga"><svg viewBox="0 0 24 24"><path d="M12 2l7 9h-4.5v4h-5v-4H5z"/></svg></span><span class="gi">'+hsvg('gren')+'</span>';E.gws.appendChild(g);this.gw.push({el:g,on:false});}
  this.cv=E.cmp.firstChild;this.cx=this.cv.getContext('2d');this.bcv=E.amm.querySelector('.bul');this.bcx=this.bcv.getContext('2d');
  Bus.on('hit',d=>{if(d.by===Player&&d.actor&&d.actor.team!=='ally'){this.hm=d.kill?0.45:0.24;this.hmK=!!d.kill;if(!d.kill)this.hmH=false;}});
  Bus.on('kill',d=>{if(d.by===Player&&d.actor&&d.actor.team!=='ally'){this.hm=0.45;this.hmK=true;this.hmH=!!d.headshot;}});
  Bus.on('playerHurt',d=>{if(!d||!d.from)return;let s=this.dmg.reduce((a,b)=>a.t<b.t?a:b);s.t=1.7;s.k=clamp(0.45+(d.dmg||20)/40,0.45,1);s.from=d.from.slice();});
  Bus.on('say',d=>{if(!d||!d.text||Settings.subtitles===false)return;const tx=String(d.text);this.subs.push({who:d.who||null,text:tx,t:Math.min(8,2.2+tx.length*0.065)});if(this.subs.length>3)this.subs.shift();});
  Bus.on('checkpoint',()=>this.toast(t('checkpoint')));
  Bus.on('objective',()=>{this._objT=2.2;});
  Bus.on('gfxAuto',d=>this.toast(t('gfxAutoT',{q:t(d&&d.level||'media')}),3.5));
  Bus.on('wave',d=>{const n=d&&d.n|0;if(!n)return;this.sv.wave=n;this.msg('',t('waveStart',{n}),2.6,'wave');});
  Bus.on('score',d=>{if(!d)return;const add=d.add|0;this.sv.score=d.total!=null?d.total|0:this.sv.score+add;if(add)this._pop('+'+fmtNum(add));});
  Bus.on('playerDied',()=>{if(Game.level&&Game.level.survival)this.sv.rec=Save.survRecord(this.survStats());});
  Bus.on('device',()=>{this._c.pr=null;this._c.deadHint=null;});
  Bus.on('settings',d=>{if(!d||d.key==='lang'||d.key==='*'){this._labels();this._c={};}});
  this._labels();this.show(false);},
 _labels(){const E=this.el;if(!E.obj)return;E.obj.querySelector('.lb span').textContent=t('objective');const s=E.surv.querySelectorAll('small');s[0].textContent=t('wave');s[1].textContent=t('points');
  E.dead.querySelector('.tl').textContent=t('tip');},
 show(on){this.on=!!on;if(this.el.root)this.el.root.style.display=on?'':'none';if(!on)this._clearT();},
 _clearT(){this.subs.length=0;this.hm=0;for(const d of this.dmg){d.t=0;d.el.style.opacity=0;}this.msgT=0;this.banT=-1;this.ban=null;this.toastT=0;this._objT=0;
  const E=this.el;if(E.msg){E.msg.classList.remove('on');E.ban.classList.remove('on');E.toast.classList.remove('on');E.sub.innerHTML='';this._c.sub='';}},
 reset(){this._clearT();this.sv={wave:0,score:0,rec:false,pops:[]};if(this.el.dead){this.death(false);this.el.surv.querySelector('.pops').innerHTML='';}},
 // aviso centrado: título y línea; HUD.msg(t('objective'), texto) = «nuevo objetivo», t('objDone') = cumplido, sin título = consejo del guion
 msg(text,small,dur,kind){const E=this.el.msg;if(!E)return;let cls=kind||'',title=text||'';
  if(!kind){if(text&&text===t('objective')){cls='obj';title=t('newObjective');this._objT=2.2;}else if(text&&text===t('objDone'))cls='done';else if(!text)cls='hint';}
  E.className='h msg '+cls;E.querySelector('.t').innerHTML=(cls==='obj'?hsvg('star'):cls==='done'?hsvg('check'):'')+'<span>'+esc(title)+'</span>';E.querySelector('.s').textContent=small||'';
  void E.offsetWidth;E.classList.add('on');this.msgT=dur||2.5;},
 // aviso breve bajo la brújula (punto de control, calidad gráfica...)
 toast(text,dur){const E=this.el.toast;if(!E)return;E.querySelector('span').textContent=text;E.classList.remove('on');void E.offsetWidth;E.classList.add('on');this.toastT=dur||2.4;},
 // cartel de inicio de misión: [nombre, lugar, fecha] (las dos últimas líneas a máquina)
 banner(lines){const E=this.el.ban;if(!E)return;this.ban=[String(lines[0]||''),String(lines[1]||''),String(lines[2]||'')];this.banT=0;E.querySelector('b').textContent=this.ban[0];
  E.querySelector('.l1').textContent='';E.querySelector('.l2').textContent='';E.classList.add('on');},
 _pop(s){const P=this.el.surv.querySelector('.pops'),e=document.createElement('span');e.textContent=s;P.appendChild(e);setTimeout(()=>e.remove(),1300);while(P.children.length>4)P.firstChild.remove();},
 // estadísticas de la partida de supervivencia (del guion si las lleva; si no, de los eventos)
 survStats(){const L=Game.L,F=L&&L.flags||{},S=Game.stats||{};const num=(...v)=>{for(const x of v)if(typeof x==='number'&&isFinite(x))return x;return 0;};
  return {score:num(L&&L.score,F.score,this.sv.score),wave:num(L&&L.wave,F.wave,this.sv.wave),kills:S.kills|0,time:S.time||0};},
 _tips(){const d=Input.device,a=(I18N[Settings.lang]||I18N.es),b=I18N.es,L=(a.tips||b.tips).concat(a['tips_'+d]||b['tips_'+d]||[]);return L;},
 _contHint(){const surv=Game.level&&Game.level.survival,k=(surv?'again_':'cont_')+Input.device;return esc(t(k,{b:'%B%'})).replace('%B%',Input.padGlyph(0));},
 death(on,reason,hint){const e=this.el.dead;if(!e)return;const C=this._c;
  if(!on){if(C.dead){C.dead=false;e.classList.remove('on');}return;}
  if(!C.dead){C.dead=true;C.deadHint=null;const T=this._tips(),surv=Game.level&&Game.level.survival,r=(reason||'').trim();
   e.querySelector('h2').textContent=surv?t('survOver'):r?t('missionFailed'):t('youDied');e.querySelector('.why').textContent=r;
   e.querySelector('.tip').textContent=T[Math.floor(Math.random()*T.length)]||'';const sv=e.querySelector('.svr');
   if(surv){const s=this.survStats();sv.hidden=false;sv.innerHTML='<span><small>'+esc(t('waveReached'))+'</small><b>'+(s.wave|0)+'</b></span><span><small>'+esc(t('score'))+'</small><b>'+fmtNum(s.score)+'</b></span>'+
    '<span><small>'+esc(t('best'))+'</small><b>'+fmtNum(Save.survival)+'</b></span>'+(this.sv.rec?'<em>'+esc(t('newRecord'))+'</em>':'');}else{sv.hidden=true;sv.innerHTML='';}
   e.querySelector('.hint').innerHTML='';e.classList.add('on');}
  const hk=hint?this._contHint():'';if(C.deadHint!==hk){C.deadHint=hk;e.querySelector('.hint').innerHTML=hk;}},
 // ángulo de un punto respecto a donde mira el jugador (0 delante, + a la derecha)
 _rel(p){const P=Player,a=Math.atan2(p[0]-P.pos[0],p[2]-P.pos[2]);return angNorm(P.yaw-a);},
 _txt(el,k,v){if(this._c[k]===v)return;this._c[k]=v;el.textContent=v;},
 _cls(el,k,c,on){const kk=k+'.'+c;if(this._c[kk]===on)return;this._c[kk]=on;el.classList.toggle(c,on);},
 _vis(el,k,on){if(this._c['v.'+k]===on)return;this._c['v.'+k]=on;el.style.display=on?'':'none';},
 update(dt){if(!this.on||!this.el.root)return;const E=this.el,P=Player,W=Weapons,C=this._c,w=W.cur?W.cur():null,d=w?WEAPONS[w.id]:null,ads=W.adsAmt||0,dev=Input.device;
  // salud -> viñeta roja (Post); apuntar -> viñeta suave (el visor lo pone Weapons en Post.fx.scope)
  Post.fx.hurt=P.alive?clamp((78-P.health)/62,0,1):1;Post.fx.ads=ads*(d&&d.scope?0:0.8);
  const scoped=P.alive&&(Post.fx.scope||0)>0.5;this._vis(E.scope,'scope',scoped);
  if(scoped){const R=Math.round(GL.H*0.47);if(C.sR!==R){C.sR=R;E.scope.style.setProperty('--R',R+'px');}}
  // retícula: hueco según la dispersión real; roja sobre un enemigo, nombre sobre un aliado
  const hideX=!P.alive||scoped||ads>0.55||P.sprinting||!d||W.cook>=0&&W.cook!=null&&false;this._cls(E.xh,'xh','off',hideX);
  if(!hideX){const fov=Cam.fov||1.1,sp=typeof W.spread==='number'?W.spread:d.spread?lerp(d.spread[0],d.spread[1],ads):0.04;
   const g=Math.round(clamp(Math.tan(sp)/Math.tan(fov/2)*GL.H/2,3,150)*2)/2;if(C.g!==g){C.g=g;E.xh.style.setProperty('--g',g+'px');}}
  this._rayT-=dt;if(this._rayT<=0){this._rayT=0.1;this._ray=P.alive?this._probe():null;}
  const ra=this._ray&&this._ray.alive?this._ray:null;this._cls(E.xh,'xh','en',!!ra&&ra.team==='axis');
  const fn=ra&&ra.team==='ally'&&ra.name&&!hideX?String(ra.name):'';this._txt(E.frn,'frn',fn);this._cls(E.frn,'frn','on',!!fn);
  // marcador de impacto / baja / tiro a la cabeza
  if(this.hm>0)this.hm=Math.max(0,this.hm-dt);const ho=this.hm>0?Math.min(1,this.hm*6):0;if(C.hmo!==ho){C.hmo=ho;E.hm.style.opacity=ho;}
  this._cls(E.hm,'hm','k',this.hmK);this._cls(E.hm,'hm','h',this.hmK&&this.hmH);
  // munición
  this._ammo(w,d,P,W,dev);
  // objetivo
  const L=Game.L,o=L&&Game.level&&!L.ended?Game.level.objectives[L.obj]:null,ot=o?txt(o.text):'';
  if(C.ot!==ot){C.ot=ot;E.obj.querySelector('.tx').textContent=ot;}this._vis(E.obj,'obj',!!ot);
  if(this._objT>0)this._objT-=dt;this._cls(E.obj,'obj','new',this._objT>0);
  // supervivencia
  const surv=!!(Game.level&&Game.level.survival);this._vis(E.surv,'surv',surv);
  if(surv){const s=this.survStats();this._txt(E.surv.querySelector('.wv b'),'svw',String(Math.max(1,s.wave|0)));this._txt(E.surv.querySelector('.sc b'),'svs',fmtNum(s.score));}
  this._compass();this._marker();
  // temporizador visible del guion
  let tm='';if(L)for(const k in L.timers){const q=L.timers[k];if(q.show&&q.dur){const s=Math.max(0,q.dur-(L.time-q.t0));tm=fmtTime(Math.ceil(s));this._cls(E.tmr,'tmr','low',s<10);}}
  this._txt(E.tmr,'tmr',tm);this._vis(E.tmr,'tmrv',!!tm);
  // usar / recoger / soltar la ametralladora
  const f=P.focus;let pk='',prog=0;
  if(P.alive&&f&&f.text){const hold=f.kind==='usable'&&f.obj&&f.obj.hold>0;pk=dev+'|'+(hold?1:0)+'|'+f.text;prog=P.useProg||0;
   if(C.pr!==pk){C.pr=pk;const v=dev==='touch'?(hold?t('touchHold'):t('touchPress')):(hold?t('hold'):t('press'));E.pr.querySelector('.pt').innerHTML=esc(v)+' '+Input.glyph('use')+' '+esc(t('to'))+' '+esc(f.text);}}
  else if(P.alive&&P.mounted){pk=dev+'|m';if(C.pr!==pk){C.pr=pk;E.pr.querySelector('.pt').innerHTML=Input.glyph('use')+' '+esc(t('getOff'));}}
  else C.pr='';this._vis(E.pr,'pr',!!pk);
  const pb=Math.round(prog*100);if(C.pb!==pb){C.pb=pb;E.pr.querySelector('.bar').style.display=pb>0?'':'none';E.pr.querySelector('.bar i').style.width=pb+'%';}
  // subtítulos
  for(const s of this.subs)s.t-=dt;while(this.subs.length&&this.subs[0].t<=0)this.subs.shift();
  const sh=this.subs.map(s=>'<p>'+(s.who?'<b style="color:'+this._spk(s.who)+'">'+esc(s.who)+'</b>':'')+esc(s.text)+'</p>').join('');if(C.sub!==sh){C.sub=sh;E.sub.innerHTML=sh;}
  // avisos y cartel de inicio
  if(this.msgT>0){this.msgT-=dt;if(this.msgT<=0)E.msg.classList.remove('on');}
  if(this.toastT>0){this.toastT-=dt;if(this.toastT<=0)E.toast.classList.remove('on');}
  if(this.ban){this.banT+=dt;const b=this.ban,k=Math.max(0,Math.floor((this.banT-0.7)*26)),l1=b[1].slice(0,k),l2=b[2].slice(0,Math.max(0,k-b[1].length-4));
   this._txt(E.ban.querySelector('.l1'),'b1',l1);this._txt(E.ban.querySelector('.l2'),'b2',l2);if(this.banT>7.5){E.ban.classList.remove('on');this.ban=null;}}
  // indicadores de daño
  for(const q of this.dmg){if(q.t<=0)continue;q.t=Math.max(0,q.t-dt);q.el.style.opacity=(Math.min(1,q.t*1.4)*q.k).toFixed(3);q.el.style.transform='rotate('+this._rel(q.from).toFixed(3)+'rad)';}
  // granadas cerca: icono y flecha alrededor del centro
  const G=W.grenades||[],R=Math.min(GL.W,GL.H)*0.2;let n=0;
  if(P.alive)for(const g of G){if(n>=2)break;if(!g||!g.pos)continue;const dd=V3.dist(g.pos,P.pos);if(dd>8.5)continue;const r=this._rel(g.pos),q=this.gw[n++];
   if(!q.on){q.on=true;q.el.classList.add('on');}q.el.style.transform='translate('+(Math.sin(r)*R).toFixed(1)+'px,'+(-Math.cos(r)*R).toFixed(1)+'px)';
   q.el.firstChild.style.transform='rotate('+r.toFixed(3)+'rad)';q.el.classList.toggle('near',dd<4.5);}
  for(let i=n;i<this.gw.length;i++){const q=this.gw[i];if(q.on){q.on=false;q.el.classList.remove('on');}}
  // estado de los botones táctiles
  if(dev==='touch'&&Input.touchHud)Input.touchHud({nades:W.inv?W.inv.nades|0:0,crouch:P.stance==='crouch',reload:!!(w&&d&&!d.mounted&&w.mag<=Math.ceil(d.mag*0.25)&&w.ammo>0)});},
 _spk(who){const k=String(who).toLowerCase().split(/\s+/).pop();if(SPK_COL[k])return SPK_COL[k];let h=0;for(const c of k)h=(h*31+c.charCodeAt(0))>>>0;return ['#e4c47c','#9fcae8','#bcd992','#f0a874','#d7b7e8','#c9d0a0'][h%6];},
 // qué hay bajo la retícula (rayo cada 0.1 s)
 _probe(){if(typeof World==='undefined'||!World.built)return null;try{const P=Player,h=World.raycast(P.eye(this._e),P.dir(this._d),150,{actors:true});return h&&h.actor?h.actor:null;}catch(e){return null;}},
 _ammo(w,d,P,W,dev){const E=this.el.amm,C=this._c,show=!!(d&&P.alive);this._vis(E,'amm',show);if(!show)return;
  const mt=d.mounted,mag=mt?'∞':String(w.mag),res=mt?'':String(w.ammo),low=!mt&&w.mag<=Math.ceil(d.mag*0.25),rel=W.st==='reload';
  this._txt(E.querySelector('.nm'),'wn',d.name||w.id);this._txt(E.querySelector('.md'),'wm',t('mode_'+(mt?'mounted':d.mode||'semi')));
  this._txt(E.querySelector('.mag'),'mg',mag);this._txt(E.querySelector('.res'),'rs',res?'/ '+res:'');
  this._cls(E,'amm','low',low&&w.mag>0);this._cls(E,'amm','empty',!mt&&w.mag===0);this._cls(E,'amm','mt',!!mt);
  let st='',sk='';if(rel){st=t('reloading');sk='r';}else if(!mt&&w.mag===0&&w.ammo===0){st=t('noAmmo');sk='n';}else if(W.st==='hot'){st=t('overheat');sk='h';}else if(low&&w.ammo>0&&dev!=='touch'){sk='l'+dev;st='';}
  if(C.stk!==sk){C.stk=sk;const el=E.querySelector('.st');if(sk[0]==='l')el.innerHTML=Input.glyph('reload')+' '+esc(t('lowAmmo'));else el.textContent=st;el.className='st '+(sk[0]||'');}
  // calor de la ametralladora
  this._vis(E.querySelector('.heat'),'heat',!!mt);if(mt){const h=Math.round(clamp(W.heat||0,0,1)*100);if(C.ht!==h){C.ht=h;E.querySelector('.heat i').style.width=h+'%';}this._cls(E,'amm','hot',W.st==='hot');}
  // cartuchos (canvas) al cambiar
  const bk=w.id+'|'+(mt?-1:w.mag)+'|'+d.mag+'|'+(window.devicePixelRatio||1);if(C.bk!==bk){C.bk=bk;this._bullets(d,mt?0:w.mag);}
  // granadas y postura
  const I=W.inv||{},gn=I.nades|0,gk=gn+'|'+(I.nadeT||'frag');if(C.gk!==gk){C.gk=gk;const g=E.querySelector('.gr');g.className='gr '+(I.nadeT==='stiel'?'stiel':'frag')+(gn?'':' none');
   g.innerHTML=gn?hsvg('gren').repeat(Math.min(gn,5))+(gn>5?'<b>×'+gn+'</b>':''):hsvg('gren');}
  const sn=P.sprinting?'sprint':P.stance==='crouch'?'crouch':'stand';if(C.sn!==sn){C.sn=sn;E.querySelector('.stn').innerHTML=hsvg(sn);}},
 _bullets(d,n){const cv=this.bcv,c=this.bcx,pr=window.devicePixelRatio||1,cap=d.mounted?0:d.mag;let bw,bh,gap,kind;
  if(d.mode==='rocket'){bw=26;bh=9;gap=4;kind='r';}else if(cap<=10){bw=5;bh=22;gap=3;kind=d.cls==='pistol'?'p':'c';}else if(cap<=36){bw=3;bh=15;gap=2;kind='s';}else{bw=0;kind='b';}
  const cnt=kind==='b'?0:cap,Wc=kind==='b'?0:Math.min(220,cnt*(bw+gap)),Hc=kind==='r'?12:bh+2;
  if(!Wc){cv.style.display='none';return;}cv.style.display='';cv.width=Math.ceil(Wc*pr);cv.height=Math.ceil(Hc*pr);cv.style.width=Wc+'px';cv.style.height=Hc+'px';
  c.setTransform(pr,0,0,pr,0,0);c.clearRect(0,0,Wc,Hc);
  for(let i=0;i<cnt;i++){const x=Wc-(i+1)*(bw+gap)+gap/2,on=i<n;c.globalAlpha=on?1:0.22;
   if(kind==='r'){c.fillStyle=on?'#c9c3a8':'#777';c.fillRect(x+4,3,bw-10,6);c.beginPath();c.moveTo(x+bw-6,2);c.lineTo(x+bw,6);c.lineTo(x+bw-6,10);c.fill();c.fillRect(x,1,5,10);continue;}
   const tip=kind==='p'?bh*0.32:bh*0.38;c.fillStyle=on?'#d6aa4c':'#8a8a80';c.fillRect(x,1+tip,bw,bh-tip);c.fillStyle=on?'#b07a3c':'#6f6f68';c.fillRect(x,bh-1,bw,2);
   c.fillStyle=on?'#c4703e':'#8a8a80';c.beginPath();c.moveTo(x,1+tip);c.quadraticCurveTo(x,1,x+bw/2,1);c.quadraticCurveTo(x+bw,1,x+bw,1+tip);c.fill();}
  c.globalAlpha=1;},
 // brújula: marcas, rumbos, aliados y la estrella del objetivo con su distancia
 _compass(){const cv=this.cv,c=this.cx,pr=Math.min(2,window.devicePixelRatio||1),cw=Math.round(clamp(GL.W*0.36,230,400)),ch=46;
  if(this._c.cw!==cw||this._c.cpr!==pr){this._c.cw=cw;this._c.cpr=pr;cv.width=cw*pr;cv.height=ch*pr;cv.style.width=cw+'px';cv.style.height=ch+'px';}
  c.setTransform(pr,0,0,pr,0,0);c.clearRect(0,0,cw,ch);const yaw=Player.yaw,en=Settings.lang==='en',span=Math.PI*0.95,px=a=>cw/2+a/span*cw,mid=15;
  const g=c.createLinearGradient(0,0,cw,0);g.addColorStop(0,'rgba(14,16,10,0)');g.addColorStop(0.18,'rgba(14,16,10,.55)');g.addColorStop(0.82,'rgba(14,16,10,.55)');g.addColorStop(1,'rgba(14,16,10,0)');
  c.fillStyle=g;c.fillRect(0,3,cw,25);c.fillStyle='rgba(201,160,58,.5)';c.fillRect(cw*0.15,27,cw*0.7,1);
  const LB=en?['N','NE','E','SE','S','SW','W','NW']:['N','NE','E','SE','S','SO','O','NO'];c.textAlign='center';c.textBaseline='middle';
  for(let k=0;k<24;k++){const rel=angNorm(k/24*Math.PI*2+yaw);if(Math.abs(rel)>span/2)continue;const x=px(rel),a=Math.pow(1-Math.abs(rel)/(span/2),0.6);
   if(k%3===0){const main=k%6===0;c.fillStyle=k===0?'rgba(232,96,74,'+a+')':'rgba(240,234,214,'+a*0.95+')';c.font=(main?'700 15px':'600 11px')+' "Saira Condensed",sans-serif';c.fillText(LB[k/3],x,mid+1);}
   else{c.fillStyle='rgba(240,234,214,'+a*0.7+')';c.fillRect(x-0.5,mid-4,1,8);}}
  c.fillStyle='#f0ead6';c.beginPath();c.moveTo(cw/2-5,1);c.lineTo(cw/2+5,1);c.lineTo(cw/2,6);c.fill();
  // aliados
  if(typeof Actors!=='undefined')for(const a of Actors.list){if(!a.alive||a.team!=='ally')continue;const rel=this._rel(a.pos);if(Math.abs(rel)>span/2)continue;c.fillStyle='rgba(143,191,90,.95)';c.beginPath();c.arc(px(rel),24,2.6,0,7);c.fill();}
  // objetivo (fijado al borde si queda fuera)
  const m=Game.marker&&Game.marker();if(m&&Player.alive){const rel=this._rel(m),out=Math.abs(rel)>span/2*0.94,x=px(clamp(rel,-span/2*0.94,span/2*0.94)),dist=Math.round(V3.distXZ(m,Player.pos));
   c.save();c.translate(x,mid);c.fillStyle='#e0b13c';c.strokeStyle='rgba(20,16,8,.8)';c.lineWidth=1.2;c.beginPath();for(let i=0;i<10;i++){const r=i%2?3.8:8.6,an=i/10*Math.PI*2-Math.PI/2;c.lineTo(Math.cos(an)*r,Math.sin(an)*r);}c.closePath();c.fill();c.stroke();
   if(out){c.fillStyle='#e0b13c';c.beginPath();const s=rel<0?-1:1;c.moveTo(s*12,-5);c.lineTo(s*18,0);c.lineTo(s*12,5);c.fill();}c.restore();
   c.font='600 12px "Saira Condensed",sans-serif';c.fillStyle='rgba(240,234,214,.95)';c.fillText(dist+' m',x,38);}},
 // estrella del objetivo en el mundo (con distancia)
 _marker(){const E=this.el.mk,m=Game.marker&&Game.marker();if(!m||!Player.alive){this._vis(E,'mk',false);return;}const s=Cam.toScreen([m[0],m[1]+1.6,m[2]],this._s);
  if(!s[2]||s[0]<12||s[0]>GL.W-12||s[1]<12||s[1]>GL.H-12){this._vis(E,'mk',false);return;}this._vis(E,'mk',true);E.style.transform='translate('+s[0].toFixed(1)+'px,'+s[1].toFixed(1)+'px)';
  const dd=Math.round(V3.distXZ(m,Player.pos));this._txt(E.lastChild,'mkd',dd+' m');const cen=Math.hypot(s[0]-GL.W/2,s[1]-GL.H/2)<GL.H*0.08;this._cls(E,'mk','dim',cen);}
};
