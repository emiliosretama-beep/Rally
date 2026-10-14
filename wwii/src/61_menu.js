// ===== FRENTE 44 · menús, opciones, guardado y textos (I18N) =====
// STUB fase 1: lo sustituye el módulo completo (61_menu.js). Settings (valores) + Settings.set(k,v) (guarda y emite 'settings'), Save (progreso),
// Store (localStorage con prefijo 'frente44:' y a prueba de errores), I18N / t(clave) / txt({es,en}), Menu (pantallas en #menu).
const Store={get(k,d){try{const v=localStorage.getItem('frente44:'+k);return v==null?d:JSON.parse(v);}catch(e){return d;}},
 set(k,v){try{localStorage.setItem('frente44:'+k,JSON.stringify(v));}catch(e){}}};
const SET_DEF={lang:/^en/i.test(navigator.language||'')?'en':'es',quality:null,sensMouse:1,sensTouch:1,sensPad:1,invertY:false,fov:62,aimAssist:true,autoFire:false,
 btnSize:1,btnAlpha:0.85,blood:true,volMaster:0.8,volFx:1,volMusic:0.6,volVoice:1,subtitles:true,diff:'regular'};
const Settings=Object.assign({},SET_DEF,Store.get('settings',{}));
Object.defineProperty(Settings,'set',{enumerable:false,value(k,v){Settings[k]=v;Store.set('settings',Object.assign({},Settings));Settings.apply();Bus.emit('settings',{key:k,value:v});}});
Object.defineProperty(Settings,'apply',{enumerable:false,value(){const S=Settings;
 if(typeof Input!=='undefined')Input.setOpts({sensMouse:S.sensMouse,sensTouch:S.sensTouch,sensPad:S.sensPad,invertY:S.invertY,aimAssist:S.aimAssist,autoFire:S.autoFire,btnSize:S.btnSize,btnAlpha:S.btnAlpha});
 if(S.quality&&GFX.level!==S.quality&&GL.gl)GFX.set(S.quality);if(typeof Snd!=='undefined'&&Snd.setVol)Snd.setVol();document.documentElement.lang=S.lang;}});
// progreso: misiones terminadas {id: {time, medal, diff}}, récord de supervivencia
const Save=Object.assign({done:{},survival:0},Store.get('save',{}));
Object.defineProperty(Save,'store',{enumerable:false,value(){Store.set('save',{done:Save.done,survival:Save.survival});}});
const I18N={
 es:{campaign:'Campaña',survival:'Supervivencia',options:'Opciones',credits:'Créditos',back:'Volver',start:'Empezar',resume:'Continuar',restartCp:'Reiniciar desde el punto de control',
  quit:'Salir al menú',paused:'Pausa',quality:'Calidad gráfica',sens:'Sensibilidad',sensMouse:'Sensibilidad del ratón',sensTouch:'Sensibilidad táctil',sensPad:'Sensibilidad del mando',
  volume:'Volumen',language:'Idioma',difficulty:'Dificultad',recluta:'Recluta',regular:'Regular',veterano:'Veterano',missionComplete:'Misión cumplida',next:'Siguiente misión',menu:'Menú',
  time:'Tiempo',kills:'Bajas',accuracy:'Precisión',headshots:'Disparos a la cabeza',deaths:'Muertes',youDied:'Has muerto',missionFailed:'Misión fracasada',pressToContinue:'Pulsa para continuar',
  checkpoint:'Punto de control',objective:'Objetivo',objDone:'Objetivo cumplido',pickUp:'recoger',use:'Usar',getOff:'Soltar el arma',hold:'Mantén',press:'Pulsa',locked:'Bloqueada',best:'Mejor',
  subtitle:'Normandía · Las Ardenas',briefing:'Informe de la misión',objectives:'Objetivos',invertY:'Invertir eje Y',fov:'Campo de visión',aimAssist:'Ayuda al apuntar',autoFire:'Disparo automático táctil',
  blood:'Sangre',subtitles:'Subtítulos',on:'Sí',off:'No',baja:'Baja',media:'Media',alta:'Alta',ultra:'Ultra',loading:'Cargando…',medal:'Medalla',
  creditsText:'FRENTE 44 · un juego de ERAGAMES.<br>Programación, gráficos, sonido y voces generados por código: WebGL 2 y Web Audio, sin recursos externos.<br>Homenaje a quienes lucharon en 1944.',
  bronze:'Bronce',silver:'Plata',gold:'Oro',controlsHint:'WASD mover · Ratón apuntar · Clic disparar · Clic der. apuntar · R recargar · G granada · C agacharse · Mayús correr · E usar'},
 en:{campaign:'Campaign',survival:'Survival',options:'Options',credits:'Credits',back:'Back',start:'Start',resume:'Resume',restartCp:'Restart from checkpoint',
  quit:'Quit to menu',paused:'Paused',quality:'Graphics quality',sens:'Sensitivity',sensMouse:'Mouse sensitivity',sensTouch:'Touch sensitivity',sensPad:'Controller sensitivity',
  volume:'Volume',language:'Language',difficulty:'Difficulty',recluta:'Recruit',regular:'Regular',veterano:'Veteran',missionComplete:'Mission complete',next:'Next mission',menu:'Menu',
  time:'Time',kills:'Kills',accuracy:'Accuracy',headshots:'Headshots',deaths:'Deaths',youDied:'You died',missionFailed:'Mission failed',pressToContinue:'Press to continue',
  checkpoint:'Checkpoint',objective:'Objective',objDone:'Objective complete',pickUp:'pick up',use:'Use',getOff:'Leave the gun',hold:'Hold',press:'Press',locked:'Locked',best:'Best',
  subtitle:'Normandy · The Ardennes',briefing:'Mission briefing',objectives:'Objectives',invertY:'Invert Y axis',fov:'Field of view',aimAssist:'Aim assist',autoFire:'Touch auto fire',
  blood:'Blood',subtitles:'Subtitles',on:'On',off:'Off',baja:'Low',media:'Medium',alta:'High',ultra:'Ultra',loading:'Loading…',medal:'Medal',
  creditsText:'FRENTE 44 · an ERAGAMES game.<br>Code, graphics, sound and voices all generated in code: WebGL 2 and Web Audio, no external assets.<br>In memory of those who fought in 1944.',
  bronze:'Bronze',silver:'Silver',gold:'Gold',controlsHint:'WASD move · Mouse aim · Click fire · Right click aim · R reload · G grenade · C crouch · Shift sprint · E use'}};
function t(k){const L=I18N[Settings.lang]||I18N.es;return L[k]!=null?L[k]:I18N.es[k]!=null?I18N.es[k]:k;}
// texto localizado de {es, en} (o una cadena tal cual)
function txt(o){if(o==null)return '';if(typeof o==='string')return o;return o[Settings.lang]||o.es||o.en||'';}
const fmtTime=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');

const Menu={el:null,scr:null,back:null,_pp:[],_rep:0,
 init(){const M=document.getElementById('menu');this.el=M;const st=document.createElement('style');st.textContent=`
#menu .scr{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:calc(var(--sat) + 28px) calc(var(--sar) + 28px) calc(var(--sab) + 28px) calc(var(--sal) + 6vw);
 background:linear-gradient(90deg,rgba(14,16,10,.88) 0%,rgba(14,16,10,.62) 42%,rgba(14,16,10,0) 75%);pointer-events:auto;overflow:auto}
#menu .scr.dim{background:rgba(12,13,9,.78)}
#menu h1{font-size:clamp(48px,9vw,104px);line-height:.9;letter-spacing:.06em;color:#ece6d3;text-shadow:0 3px 0 rgba(0,0,0,.4)}
#menu h1 em{font-style:normal;color:var(--brass)}
#menu .sub{font:400 clamp(15px,2.2vw,22px) var(--type);color:var(--khaki);margin:8px 0 26px;letter-spacing:.06em}
#menu h2{font-size:clamp(26px,4vw,40px);margin-bottom:16px;color:#ece6d3}
#menu .bt{display:block;width:min(380px,80vw);text-align:left;margin:5px 0;padding:9px 16px 9px 14px;background:rgba(32,36,24,.72);border:0;border-left:4px solid var(--khaki);
 font:700 clamp(17px,2.4vw,22px) var(--cond);letter-spacing:.1em;text-transform:uppercase;color:#ece6d3;transition:background .12s,border-color .12s,padding .12s}
#menu .bt:hover,#menu .bt:focus-visible{background:rgba(74,82,40,.9);border-left-color:var(--brass);padding-left:20px;outline:none}
#menu .bt small{display:block;font:500 13px var(--cond);letter-spacing:.04em;text-transform:none;color:var(--muted)}
#menu .bt.lv{width:min(520px,86vw)}#menu .bt .st{float:right;color:var(--brass);font-size:14px;letter-spacing:.05em}
#menu .row{display:flex;align-items:center;justify-content:space-between;gap:14px;width:min(520px,86vw);margin:4px 0;padding:6px 12px;background:rgba(32,36,24,.6);font:600 17px var(--cond)}
#menu .row select,#menu .row input{font:600 16px var(--cond);background:#23271a;color:#ece6d3;border:1px solid #4a5228;padding:3px 6px;min-width:150px}
#menu .paper{max-width:min(640px,90vw);background:var(--paper);color:var(--paperInk);padding:22px 28px;font:400 17px/1.5 var(--type);box-shadow:0 10px 40px rgba(0,0,0,.5);transform:rotate(-.4deg)}
#menu .paper h2{color:#3a2a1a;font-size:30px;margin:0 0 4px}#menu .paper .meta{font-size:15px;color:#6a5a40;margin-bottom:12px}
#menu .paper ul{margin:10px 0 0 18px;padding:0}#menu .paper .stamp{display:inline-block;border:3px solid #a33;color:#a33;font:400 14px var(--stencil);padding:2px 8px;transform:rotate(-4deg);letter-spacing:.12em}
#menu .stats{font:600 19px/1.7 var(--cond);margin-bottom:18px}#menu .stats b{display:inline-block;min-width:220px;color:var(--khaki)}
#menu .hint{font:500 14px var(--cond);color:var(--muted);margin-top:18px;max-width:560px}`;document.head.appendChild(st);
  addEventListener('keydown',e=>this._key(e));Settings.apply();},
 _ui(){if(typeof Snd!=='undefined'){Snd.init();Snd.play('ui_ok');}},
 hide(){this.scr=null;this.el.innerHTML='';},
 // pantalla: título, botones [[texto, fn, extra]] y html opcional; back = función de Esc
 _show(o){this.el.innerHTML='';const s=document.createElement('div');s.className='scr'+(o.dim?' dim':'');if(o.html)s.innerHTML=o.html;
  for(const b of o.buttons||[]){const e=document.createElement('button');e.className='bt'+(b[2]&&b[2].cls?' '+b[2].cls:'');e.innerHTML=b[0];if(b[2]&&b[2].disabled)e.disabled=true;
   e.addEventListener('click',()=>{this._ui();b[1]();});s.appendChild(e);}
  if(o.after)s.insertAdjacentHTML('beforeend',o.after);this.el.appendChild(s);this.scr=s;this.back=o.back||null;const f=s.querySelector('button:not([disabled]),select,input');if(f&&!o.nofocus)f.focus({preventScroll:true});return s;},
 title(){this._show({html:'<h1>FRENTE <em>44</em></h1><div class="sub">'+t('subtitle')+'</div>',buttons:[[t('campaign'),()=>this.campaign()],[t('survival'),()=>Game.start('survival',Settings.diff)],
   [t('options'),()=>this.options(()=>this.title())],[t('credits'),()=>this.credits()]],after:'<div class="hint">'+t('controlsHint')+'</div>'});},
 campaign(){const B=[];for(const L of LEVELS){const d=Save.done[L.id];B.push([txt(L.name)+(d?'<span class="st">★ '+t(d.medal||'bronze')+' · '+fmtTime(d.time)+'</span>':'')+'<small>'+txt(L.place)+' · '+(L.date||'')+'</small>',()=>Game.start(L.id,Settings.diff),{cls:'lv'}]);}
  B.push([t('back'),()=>this.title()]);this._show({html:'<h2>'+t('campaign')+'</h2>',buttons:B,back:()=>this.title()});},
 brief(L,diff){const D=['recluta','regular','veterano'],ob=(L.objectives||[]).map(o=>'<li>'+txt(o.text)+'</li>').join('');
  const s=this._show({dim:true,html:'<div class="paper"><span class="stamp">'+t('briefing')+'</span><h2>'+txt(L.name)+'</h2><div class="meta">'+txt(L.place)+' · '+(L.date||'')+'</div><div>'+txt(L.brief)+'</div>'+
   (ob?'<p><b>'+t('objectives')+':</b></p><ul>'+ob+'</ul>':'')+'</div><div class="row" style="margin-top:18px"><span>'+t('difficulty')+'</span><select id="mdiff">'+D.map(k=>'<option value="'+k+'"'+(k===diff?' selected':'')+'>'+t(k)+'</option>').join('')+'</select></div>',
   buttons:[[t('start'),()=>{const v=document.getElementById('mdiff').value;Settings.set('diff',v);Game.begin(v);}],[t('back'),()=>{Game.toTitle();this.campaign();}]],back:()=>{Game.toTitle();this.campaign();}});
  const b=s.querySelector('.bt');if(b)b.focus({preventScroll:true});},
 pause(){this._show({dim:true,html:'<h2>'+t('paused')+'</h2>',buttons:[[t('resume'),()=>Game.resume()],[t('restartCp'),()=>Game.restartCheckpoint()],[t('options'),()=>this.options(()=>this.pause())],[t('quit'),()=>Game.toTitle()]],back:()=>Game.resume()});},
 complete(st){const medal=st.medal?t(st.medal):'',nx=Game.nextLevel();
  this._show({dim:true,html:'<h2>'+t('missionComplete')+'</h2><div class="stats"><b>'+t('time')+'</b>'+fmtTime(st.time)+'<br><b>'+t('kills')+'</b>'+st.kills+'<br><b>'+t('accuracy')+'</b>'+st.acc+'%<br><b>'+t('headshots')+'</b>'+st.heads+'<br><b>'+t('deaths')+'</b>'+st.deaths+
   (medal?'<br><b>'+t('medal')+'</b>★ '+medal:'')+'</div>',buttons:[...(nx?[[t('next'),()=>Game.start(nx.id,Game.diff)]]:[]),[t('menu'),()=>{Game.toTitle();this.campaign();}]]});},
 credits(){this._show({html:'<h2>'+t('credits')+'</h2><div class="paper" style="margin-bottom:16px">'+t('creditsText')+'</div>',buttons:[[t('back'),()=>this.title()]],back:()=>this.title()});},
 options(back){const S=Settings,Q=['baja','media','alta','ultra'],row=(lab,ctl)=>'<div class="row"><span>'+lab+'</span>'+ctl+'</div>',
  sel=(k,opts)=>'<select data-k="'+k+'">'+opts.map(([v,l])=>'<option value="'+v+'"'+(String(S[k])===String(v)?' selected':'')+'>'+l+'</option>').join('')+'</select>',
  rng=(k,a,b,st)=>'<input type="range" data-k="'+k+'" min="'+a+'" max="'+b+'" step="'+st+'" value="'+S[k]+'">',yn=k=>sel(k,[['true',t('on')],['false',t('off')]]);
  const s=this._show({html:'<h2>'+t('options')+'</h2>'+row(t('quality'),'<select data-k="quality">'+Q.map(q=>'<option value="'+q+'"'+(GFX.level===q?' selected':'')+'>'+t(q)+'</option>').join('')+'</select>')+
   row(t('sensMouse'),rng('sensMouse',0.2,3,0.05))+row(t('sensTouch'),rng('sensTouch',0.2,3,0.05))+row(t('sensPad'),rng('sensPad',0.2,3,0.05))+row(t('invertY'),yn('invertY'))+row(t('fov'),rng('fov',50,80,1))+
   row(t('aimAssist'),yn('aimAssist'))+row(t('autoFire'),yn('autoFire'))+row(t('volume'),rng('volMaster',0,1,0.05))+row(t('subtitles'),yn('subtitles'))+row(t('blood'),yn('blood'))+
   row(t('language'),sel('lang',[['es','Español'],['en','English']])),buttons:[[t('back'),()=>back()]],back});
  s.querySelectorAll('[data-k]').forEach(e=>e.addEventListener('change',()=>{const k=e.dataset.k;let v=e.value;if(v==='true')v=true;else if(v==='false')v=false;else if(e.type==='range')v=+v;
   Settings.set(k,v);if(k==='lang')this.options(back);}));},
 // teclado: flechas para moverse por los botones, Esc para volver
 _key(e){if(!this.scr)return;const items=[...this.scr.querySelectorAll('button:not([disabled]),select,input')];if(!items.length)return;const i=items.indexOf(document.activeElement);
  if(e.code==='ArrowDown'||e.code==='ArrowUp'){if(document.activeElement&&document.activeElement.tagName==='SELECT'&&e.altKey)return;e.preventDefault();const n=items.length,j=i<0?0:(i+(e.code==='ArrowDown'?1:n-1))%n;items[j].focus();if(typeof Snd!=='undefined')Snd.play('ui_move');}
  else if(e.code==='Escape'&&this.back){e.preventDefault();if(typeof Snd!=='undefined')Snd.play('ui_back');this.back();}},
 // mando en los menús: cruceta/palanca para moverse, A aceptar, B volver
 update(dt){if(!this.scr)return;const gs=navigator.getGamepads?navigator.getGamepads():null;let g=null;if(gs)for(const q of gs)if(q&&q.connected){g=q;break;}if(!g)return;
  const b=i=>!!(g.buttons[i]&&g.buttons[i].pressed),ay=g.axes[1]||0,now=[b(12)||ay<-0.6,b(13)||ay>0.6,b(0),b(1)],pp=this._pp;this._rep-=dt;
  const items=[...this.scr.querySelectorAll('button:not([disabled]),select,input')];const i=items.indexOf(document.activeElement);
  if((now[0]&&(!pp[0]||this._rep<=0))||(now[1]&&(!pp[1]||this._rep<=0))){this._rep=pp[0]||pp[1]?0.12:0.35;const n=items.length;if(n){items[i<0?0:(i+(now[1]?1:n-1))%n].focus();if(typeof Snd!=='undefined')Snd.play('ui_move');}}
  if(now[2]&&!pp[2]&&i>=0&&items[i].tagName==='BUTTON')items[i].click();if(now[3]&&!pp[3]&&this.back)this.back();this._pp=now;}
};
