// ===== FRENTE 44 · HUD: retícula, munición, brújula con objetivo, avisos, subtítulos, indicadores de daño, pantalla de muerte =====
// STUB fase 1: lo sustituye el módulo completo (60_hud.js). Capa DOM en #hud + un canvas 2D para la brújula.
const HUD={el:{},on:false,hm:0,hmK:false,dmg:[],subs:[],_msgT:0,_banT:0,_cmpW:0,_s:[0,0,0],_wa:[0,0,0],
 init(){const H=document.getElementById('hud');if(!H||this.el.root)return;const st=document.createElement('style');st.textContent=`
#hud .h{position:absolute}
#hud .xh{left:50%;top:50%;width:0;height:0}
#hud .xh i{position:absolute;background:rgba(240,236,220,.9);box-shadow:0 0 2px rgba(0,0,0,.8)}
#hud .xh i:nth-child(1),#hud .xh i:nth-child(2){width:2px;height:9px;left:-1px}
#hud .xh i:nth-child(3),#hud .xh i:nth-child(4){height:2px;width:9px;top:-1px}
#hud .hm{left:50%;top:50%;width:0;height:0;opacity:0}
#hud .hm i{position:absolute;width:2px;height:9px;background:#fff;left:-1px;top:-4px}
#hud .hm.k i{background:#e0402c}
#hud .ammo{right:calc(var(--sar) + 22px);bottom:calc(var(--sab) + 18px);text-align:right;font-family:var(--cond);font-weight:700}
#hud .ammo b{font-size:42px;letter-spacing:.02em}#hud .ammo small{font-size:22px;opacity:.75;margin-left:6px}
#hud .ammo .wn{font:600 15px var(--cond);letter-spacing:.12em;text-transform:uppercase;opacity:.85}
#hud .ammo .gr{font-size:17px;opacity:.9}
body.touch #hud .ammo{bottom:auto;top:calc(var(--sat) + 64px)}
#hud .obj{left:calc(var(--sal) + 18px);top:calc(var(--sat) + 16px);max-width:min(420px,46vw);padding:7px 12px 8px;background:rgba(16,18,12,.55);border-left:3px solid var(--brass);font:600 17px/1.25 var(--cond);letter-spacing:.02em}
#hud .obj span{display:block;font:400 12px var(--stencil);letter-spacing:.14em;color:var(--brass);margin-bottom:2px}
#hud .cmp{left:50%;top:calc(var(--sat) + 10px);transform:translateX(-50%)}
#hud .tmr{left:50%;top:calc(var(--sat) + 52px);transform:translateX(-50%);font:700 22px var(--cond);color:#f0d9a0}
#hud .pr{left:50%;bottom:calc(var(--sab) + 25%);transform:translateX(-50%);text-align:center;font:600 18px var(--cond);letter-spacing:.03em}
#hud .pr .bar{width:180px;height:5px;margin:6px auto 0;background:rgba(0,0,0,.5)}#hud .pr .bar i{display:block;height:100%;width:0;background:var(--brass)}
#hud .sub{left:50%;bottom:calc(var(--sab) + 13%);transform:translateX(-50%);width:min(760px,86vw);text-align:center;font:500 19px/1.35 var(--cond)}
#hud .sub p{margin:3px 0;padding:2px 10px;background:rgba(0,0,0,.45);display:inline-block}#hud .sub b{color:var(--khaki);margin-right:6px}
#hud .msg{left:50%;top:30%;transform:translateX(-50%);font:400 26px var(--stencil);letter-spacing:.12em;text-transform:uppercase;text-align:center;opacity:0;transition:opacity .3s;white-space:nowrap}
#hud .msg small{display:block;font:600 17px var(--cond);letter-spacing:.04em;text-transform:none;margin-top:4px}
#hud .ban{left:calc(var(--sal) + 28px);bottom:calc(var(--sab) + 90px);font-family:var(--type);font-size:18px;line-height:1.5;opacity:0;transition:opacity .8s}
#hud .ban b{display:block;font:400 30px var(--stencil);letter-spacing:.08em;margin-bottom:4px}
#hud .dm{left:50%;top:50%;width:0;height:0}
#hud .dm i{position:absolute;left:-26px;top:-120px;width:52px;height:30px;background:radial-gradient(ellipse at 50% 100%,rgba(200,30,20,.85),rgba(200,30,20,0) 70%);transform-origin:26px 120px;clip-path:polygon(50% 0,100% 100%,0 100%)}
#hud .gw{left:50%;top:50%;width:0;height:0;opacity:0}#hud .gw i{position:absolute;left:-15px;top:-95px;width:30px;height:30px;border-radius:50%;background:rgba(190,40,30,.8);transform-origin:15px 95px;font:700 16px var(--stencil);color:#fff;text-align:center;line-height:30px;font-style:normal}
#hud .mk{width:0;height:0;opacity:.9}#hud .mk i{position:absolute;left:-9px;top:-9px;width:18px;height:18px;background:var(--brass);clip-path:polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)}
#hud .mk b{position:absolute;left:-30px;top:10px;width:60px;text-align:center;font:600 13px var(--cond)}
#hud .dead{inset:0;display:grid;place-items:center;text-align:center;background:radial-gradient(ellipse,rgba(60,0,0,.15),rgba(30,0,0,.55));opacity:0;transition:opacity 1s}
#hud .dead h2{font-size:48px;letter-spacing:.14em;color:#e8d7c8}#hud .dead p{font:500 20px var(--cond);margin:8px 0 0}#hud .dead .hint{opacity:.8;margin-top:22px}`;document.head.appendChild(st);
  const mk=(c,html)=>{const d=document.createElement('div');d.className='h '+c;if(html)d.innerHTML=html;H.appendChild(d);return d;};const E=this.el;E.root=H;
  E.xh=mk('xh','<i></i><i></i><i></i><i></i>');E.hm=mk('hm','<i></i><i></i><i></i><i></i>');[...E.hm.children].forEach((b,i)=>{b.style.transform=`rotate(${45+i*90}deg) translateY(-12px)`;});
  E.ammo=mk('ammo','<div class="wn"></div><b></b><small></small><div class="gr"></div>');E.obj=mk('obj','<span></span><div></div>');
  E.cmp=mk('cmp','<canvas width="360" height="40"></canvas>');this.cv=E.cmp.firstChild;this.cx=this.cv.getContext('2d');
  E.tmr=mk('tmr');E.pr=mk('pr','<div></div><div class="bar"><i></i></div>');E.sub=mk('sub');E.msg=mk('msg');E.ban=mk('ban');E.dm=mk('dm');E.gw=mk('gw','<i>!</i>');E.mk=mk('mk','<i></i><b></b>');
  E.dead=mk('dead','<div><h2></h2><p class="why"></p><p class="hint"></p></div>');
  for(let i=0;i<6;i++){const a=document.createElement('i');a.style.opacity=0;E.dm.appendChild(a);this.dmg.push({el:a,t:0,from:null});}
  Bus.on('hit',d=>{if(d.by===Player&&d.actor&&d.actor.team!=='ally'){this.hm=0.25;this.hmK=d.kill;}});
  Bus.on('playerHurt',d=>{if(!d.from)return;let s=this.dmg.reduce((a,b)=>a.t<b.t?a:b);s.t=1.6;s.from=d.from.slice();});
  Bus.on('say',d=>{if(typeof Settings!=='undefined'&&Settings.subtitles===false)return;this.subs.push({who:d.who,text:d.text,t:Math.min(7,2+(d.text||'').length*0.06)});if(this.subs.length>3)this.subs.shift();});
  Bus.on('checkpoint',()=>this.msg(t('checkpoint'),'',2.2));
  this.show(false);},
 show(on){this.on=!!on;if(this.el.root)this.el.root.style.display=on?'':'none';},
 reset(){this.subs.length=0;this.hm=0;for(const d of this.dmg)d.t=0;this._msgT=0;this._banT=0;if(this.el.msg){this.el.msg.style.opacity=0;this.el.ban.style.opacity=0;this.el.dead.style.opacity=0;}},
 // aviso centrado (texto grande y línea pequeña opcional)
 msg(text,small,dur){const e=this.el.msg;if(!e)return;e.innerHTML=text+(small?'<small>'+small+'</small>':'');e.style.opacity=1;this._msgT=dur||2.5;},
 // cartel de inicio de misión: [nombre, lugar, fecha]
 banner(lines){const e=this.el.ban;if(!e)return;e.innerHTML='<b>'+lines[0]+'</b>'+lines.slice(1).join('<br>');e.style.opacity=1;this._banT=7;},
 death(on,reason,hint){const e=this.el.dead;if(!e)return;e.style.opacity=on?1:0;if(!on)return;e.querySelector('h2').textContent=reason?t('missionFailed'):t('youDied');
  e.querySelector('.why').textContent=reason||'';e.querySelector('.hint').textContent=hint||'';},
 update(dt){if(!this.on)return;const E=this.el,P=Player,W=Weapons,w=W.cur(),d=w?WEAPONS[w.id]:null;
  // vida -> viñeta roja (Post)
  Post.fx.hurt=P.alive?clamp((78-P.health)/62,0,1):1;Post.fx.ads=W.adsAmt*(d&&d.scope?0:0.8);
  // retícula según la dispersión
  const hideX=!P.alive||W.adsAmt>0.5||P.sprinting||!d||P.mounted&&false;E.xh.style.display=hideX?'none':'';
  if(!hideX){const fov=(Cam.fov||1.1),g=Math.max(4,Math.tan(W.spread||0.03)/Math.tan(fov/2)*GL.H/2)+3,b=E.xh.children;b[0].style.top=-(g+9)+'px';b[1].style.top=g+'px';b[2].style.left=-(g+9)+'px';b[3].style.left=g+'px';}
  this.hm=Math.max(0,this.hm-dt);E.hm.style.opacity=this.hm>0?Math.min(1,this.hm*6):0;E.hm.classList.toggle('k',this.hmK);
  // munición
  if(d){E.ammo.style.display='';E.ammo.children[0].textContent=d.name;E.ammo.children[1].textContent=d.mounted?'∞':w.mag;E.ammo.children[2].textContent=d.mounted?'':'/ '+w.ammo;
   E.ammo.children[1].style.color=!d.mounted&&w.mag<=Math.ceil(d.mag*0.25)?'#e8a070':'';E.ammo.children[3].textContent='● '.repeat(Math.min(6,W.inv.nades)).trim()||'—';}else E.ammo.style.display='none';
  // objetivo
  const L=Game.L,o=L&&Game.level&&Game.level.objectives[L.obj];const ot=o?txt(o.text):'';if(E.obj._t!==ot){E.obj._t=ot;E.obj.children[0].textContent=t('objective');E.obj.children[1].textContent=ot;E.obj.style.display=ot?'':'none';}
  this._compass();this._marker();
  // temporizador visible del guion
  let tm='';if(L)for(const k in L.timers){const q=L.timers[k];if(q.show&&q.dur){const s=Math.max(0,q.dur-(L.time-q.t0));tm=Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');}}E.tmr.textContent=tm;
  // usar / recoger
  const f=P.focus;if(f&&P.alive){const key=Input.device==='pad'?'X':Input.device==='touch'?'':'E';E.pr.style.display='';const tx=(f.obj.hold>0?t('hold'):t('press'))+(key?' ['+key+'] ':' ')+f.text;
   if(E.pr._t!==tx){E.pr._t=tx;E.pr.firstChild.textContent=tx;}E.pr.lastChild.style.display=P.useProg>0?'':'none';E.pr.lastChild.firstChild.style.width=(P.useProg*100)+'%';}
  else if(P.mounted){E.pr.style.display='';E.pr.firstChild.textContent=t('getOff')+(Input.device==='kbm'?' [E]':Input.device==='pad'?' [X]':'');E.pr.lastChild.style.display='none';E.pr._t='';}else E.pr.style.display='none';
  // subtítulos
  for(const s of this.subs)s.t-=dt;while(this.subs.length&&this.subs[0].t<=0)this.subs.shift();
  const sh=this.subs.map(s=>'<p>'+(s.who?'<b>'+s.who+':</b>':'')+s.text+'</p>').join('<br>');if(E.sub._h!==sh){E.sub._h=sh;E.sub.innerHTML=sh;}
  if(this._msgT>0){this._msgT-=dt;if(this._msgT<=0)E.msg.style.opacity=0;}if(this._banT>0){this._banT-=dt;if(this._banT<=0)E.ban.style.opacity=0;}
  // indicadores de daño
  for(const q of this.dmg){q.t=Math.max(0,q.t-dt);q.el.style.opacity=Math.min(1,q.t);if(q.t>0){const r=this._rel(q.from);q.el.style.transform='rotate('+r+'rad)';}}
  // granada cerca
  let gw=null,gd=7;for(const g of W.grenades){const dd=V3.dist(g.pos,P.pos);if(dd<gd){gd=dd;gw=g;}}E.gw.style.opacity=gw?1:0;if(gw)E.gw.firstChild.style.transform='rotate('+this._rel(gw.pos)+'rad)';},
 // ángulo de un punto respecto a donde mira la cámara (0 delante, + a la derecha)
 _rel(p){const P=Player,a=Math.atan2(p[0]-P.pos[0],p[2]-P.pos[2]);return angNorm(P.yaw-a);},
 _compass(){const c=this.cx,W=360,H=40,yaw=Player.yaw,es=(typeof Settings!=='undefined'?Settings.lang:'es')!=='en';c.clearRect(0,0,W,H);
  const g=c.createLinearGradient(0,0,W,0);g.addColorStop(0,'rgba(16,18,12,0)');g.addColorStop(0.2,'rgba(16,18,12,.55)');g.addColorStop(0.8,'rgba(16,18,12,.55)');g.addColorStop(1,'rgba(16,18,12,0)');
  c.fillStyle=g;c.fillRect(0,4,W,24);const span=Math.PI*0.9,px=a=>W/2+a/span*W;c.textAlign='center';c.font='600 13px "Saira Condensed",sans-serif';
  const L=es?['N','NE','E','SE','S','SO','O','NO']:['N','NE','E','SE','S','SW','W','NW'];
  for(let k=0;k<24;k++){const hd=k/24*Math.PI*2,rel=angNorm(hd+yaw);if(Math.abs(rel)>span/2)continue;const x=px(rel);c.fillStyle='rgba(236,230,211,'+(1-Math.abs(rel)/(span/2))*0.9+')';
   if(k%3===0){c.fillText(L[k/3],x,20);}else c.fillRect(x-0.5,10,1,8);}
  c.fillStyle='rgba(236,230,211,.8)';c.fillRect(W/2-1,2,2,5);
  const m=Game.marker&&Game.marker();if(m){const rel=this._rel(m),x=px(clamp(rel,-span/2,span/2)),d=Math.round(V3.distXZ(m,Player.pos));
   c.fillStyle='#c9a03a';c.beginPath();for(let i=0;i<10;i++){const r=i%2?3.5:8,a=i/10*Math.PI*2-Math.PI/2;c.lineTo(x+Math.cos(a)*r,16+Math.sin(a)*r);}c.fill();
   c.fillStyle='rgba(236,230,211,.9)';c.font='600 11px "Saira Condensed",sans-serif';c.fillText(d+' m',x,37);}},
 _marker(){const E=this.el.mk,m=Game.marker&&Game.marker();if(!m||!Player.alive){E.style.display='none';return;}const s=Cam.toScreen([m[0],m[1]+1.6,m[2]],this._s);
  if(!s[2]||s[0]<0||s[0]>GL.W||s[1]<0||s[1]>GL.H){E.style.display='none';return;}E.style.display='';E.style.left=s[0]+'px';E.style.top=s[1]+'px';E.lastChild.textContent=Math.round(V3.distXZ(m,Player.pos))+' m';}
};
