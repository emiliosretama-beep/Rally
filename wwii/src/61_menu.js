// ===== FRENTE 44 · menús, opciones, guardado y textos (I18N) =====
// Store (localStorage con prefijo 'frente44:', a prueba de errores y con copia en memoria), Settings (+set/apply/reset), Save (progreso),
// I18N / t(clave[, vars]) / txt({es,en}) / fmtTime, y Menu: pantallas en #menu (título, campaña, informe con mapa, opciones, controles,
// créditos, pausa, fin de misión, supervivencia) con navegación espacial por teclado y mando, foco visible y tamaños táctiles.
const Store={pre:'frente44:',mem:{},
 get(k,d){let s=null;try{s=localStorage.getItem(this.pre+k);}catch(e){}if(s==null)s=this.mem[k];if(s==null)return d;try{const v=JSON.parse(s);return v==null?d:v;}catch(e){return d;}},
 // guarda (true si llegó a localStorage; si no, queda en memoria: modo privado, cuota llena...)
 set(k,v){let s;try{s=JSON.stringify(v);}catch(e){return false;}this.mem[k]=s;try{localStorage.setItem(this.pre+k,s);return true;}catch(e){return false;}},
 del(k){delete this.mem[k];try{localStorage.removeItem(this.pre+k);}catch(e){}}};

// ---------- opciones: valores por defecto, validación (lo guardado puede estar corrupto o ser de otra versión) ----------
const SET_DEF={lang:/^en/i.test(navigator.language||'')?'en':'es',quality:null,sensMouse:1,sensTouch:1,sensPad:1,invertY:false,fov:62,aimAssist:0.65,autoFire:false,
 btnSize:1,btnAlpha:0.85,blood:true,volMaster:0.8,volFx:1,volMusic:0.6,volVoice:1,voices:true,subtitles:true,subSize:'m',diff:'regular'};
// número: [min, max] · lista: valores válidos · 'b': booleano
const SET_SCHEMA={lang:['es','en'],quality:[null,'baja','media','alta','ultra'],sensMouse:[0.2,3],sensTouch:[0.2,3],sensPad:[0.2,3],invertY:'b',fov:[50,80],aimAssist:[0,1],
 autoFire:'b',btnSize:[0.75,1.35],btnAlpha:[0.3,1],blood:'b',volMaster:[0,1],volFx:[0,1],volMusic:[0,1],volVoice:[0,1],voices:'b',subtitles:'b',subSize:['s','m','l'],diff:['recluta','regular','veterano']};
function setClean(k,v){const s=SET_SCHEMA[k];if(s===undefined)return undefined;
 if(k==='aimAssist'&&typeof v==='boolean')v=v?0.65:0; // versión anterior: sí/no
 if(s==='b')return typeof v==='boolean'?v:v==='true'?true:v==='false'?false:undefined;
 if(s.length===2&&typeof s[0]==='number'&&typeof s[1]==='number'){if(v===null||v===''||typeof v==='boolean')return undefined;v=+v;return isFinite(v)?clamp(v,s[0],s[1]):undefined;}
 return s.includes(v)?v:undefined;}
const Settings=Object.assign({},SET_DEF);
(()=>{const o=Store.get('settings',{});if(o&&typeof o==='object')for(const k in SET_SCHEMA)if(k in o){const v=setClean(k,o[k]);if(v!==undefined)Settings[k]=v;}})();
Object.defineProperty(Settings,'save',{enumerable:false,value(){const o={};for(const k in SET_SCHEMA)o[k]=Settings[k];return Store.set('settings',o);}});
Object.defineProperty(Settings,'set',{enumerable:false,value(k,v){const c=setClean(k,v);if(c===undefined)return false;Settings[k]=c;Settings.save();Settings.apply(k);Bus.emit('settings',{key:k,value:c});return true;}});
Object.defineProperty(Settings,'reset',{enumerable:false,value(){const lang=Settings.lang;Object.assign(Settings,SET_DEF,{lang});Settings.save();if(GL.gl&&GFX.level!==GFX._def)GFX.set(GFX._def);Settings.apply();Bus.emit('settings',{key:'*'});}});
Object.defineProperty(Settings,'apply',{enumerable:false,value(k){const S=Settings;
 if(typeof Input!=='undefined'&&Input.setOpts)Input.setOpts({sensMouse:S.sensMouse,sensTouch:S.sensTouch,sensPad:S.sensPad,invertY:S.invertY,aimAssist:S.aimAssist,autoFire:S.autoFire,btnSize:S.btnSize,btnAlpha:S.btnAlpha});
 if(S.quality&&GL.gl&&GFX.level!==S.quality&&(!k||k==='quality'))GFX.set(S.quality);
 if(typeof Snd!=='undefined'&&Snd.setVol)try{Snd.setVol();}catch(e){}
 if(typeof Voice!=='undefined'&&Voice)Voice.on=!!S.voices;
 document.documentElement.lang=S.lang;const b=document.body;if(b){b.dataset.sub=S.subSize;b.classList.toggle('nosubs',!S.subtitles);}}});
if(typeof GFX!=='undefined')GFX._def=GFX.level; // calidad por defecto del aparato (para «valores por defecto»)

// ---------- progreso: misiones terminadas {id: {time, medal, diff}} (lo escribe Game), mejores tiempos por dificultad y supervivencia ----------
const Save=(()=>{const s=Store.get('save',{}),o={done:{},best:{},survival:0,surv:null};
 if(s&&typeof s==='object'){if(s.done&&typeof s.done==='object')o.done=s.done;if(s.best&&typeof s.best==='object')o.best=s.best;
  if(isFinite(s.survival))o.survival=+s.survival;if(s.surv&&typeof s.surv==='object')o.surv=s.surv;}return o;})();
Object.defineProperty(Save,'store',{enumerable:false,value(){return Store.set('save',{done:Save.done,best:Save.best,survival:Save.survival,surv:Save.surv});}});
// récord de supervivencia {score, wave, kills}: true si lo bate (y lo guarda)
Object.defineProperty(Save,'survRecord',{enumerable:false,value(st){const sc=st&&st.score|0;if(!(sc>(Save.survival||0)))return false;Save.survival=sc;Save.surv={score:sc,wave:st.wave|0,kills:st.kills|0};Save.store();return true;}});
const MEDAL_RANK={bronze:1,silver:2,gold:3},DIFF_MEDAL={recluta:'bronze',regular:'silver',veterano:'gold'};

// ---------- textos ----------
const I18N={
 es:{campaign:'Campaña',campaignSub:'{n} misiones · Normandía y Las Ardenas',survival:'Supervivencia',survivalSub:'Oleadas sin fin · récord {s}',survivalNew:'Oleadas sin fin en un pueblo en ruinas',
  options:'Opciones',optionsSub:'Imagen, sonido, controles e idioma',controls:'Controles',controlsSub:'Teclado, mando y táctil',credits:'Créditos',creditsSub:'ERAGAMES',
  back:'Volver',start:'Empezar',resume:'Continuar',continue:'Continuar',restartCp:'Reiniciar desde el punto de control',quit:'Salir al menú',
  quitQ:'¿Salir al menú principal?',quitWarn:'Perderás el progreso desde el último punto de control.',restartQ:'¿Volver al último punto de control?',yes:'Sí',no:'No',
  paused:'Pausa',menu:'Menú',next:'Siguiente misión',retry:'Repetir',playAgain:'Jugar otra vez',mission:'Misión',missionNofM:'Misión {n} de {m}',extras:'Extras',
  locked:'Bloqueada',unlockHint:'Completa «{m}»',best:'Mejor',bestTime:'Mejor tiempo',notPlayed:'Sin completar',completed:'Completada',medal:'Medalla',
  bronze:'Bronce',silver:'Plata',gold:'Oro',difficulty:'Dificultad',recluta:'Recluta',regular:'Regular',veterano:'Veterano',
  recluta_d:'Para aprender: los enemigos hacen la mitad de daño.',regular_d:'La experiencia pensada: exigente pero justa.',veterano_d:'Para expertos: unos pocos disparos y caes.',
  briefing:'Informe de la misión',confidential:'Confidencial',place:'Lugar',date:'Fecha',objectives:'Objetivos',mapTitle:'Plano de operaciones',
  legendYou:'Tu sección',legendObj:'Objetivo',legendEnemy:'Enemigo',legendAdvance:'Avance',survivalBest:'Récord: {s} puntos · oleada {w}',noRecord:'Aún sin récord',
  tab_game:'Juego',tab_controls:'Controles',tab_video:'Imagen',tab_audio:'Sonido',quality:'Calidad gráfica',baja:'Baja',media:'Media',alta:'Alta',ultra:'Ultra',
  q_baja:'Sin sombras ni efectos costosos: para aparatos modestos.',q_media:'Sombras suaves y partículas: la recomendada en iPad.',q_alta:'Sombras más lejanas, HDR y rayos de sol.',
  q_ultra:'Todo al máximo, con oclusión ambiental: para ordenadores potentes.',qAuto:'Se ha bajado a {q} automáticamente para mantener la fluidez.',
  sensMouse:'Sensibilidad del ratón',sensTouch:'Sensibilidad táctil',sensPad:'Sensibilidad del mando',invertY:'Invertir el eje vertical',fov:'Campo de visión',
  aimAssist:'Ayuda al apuntar',aimAssist_d:'Frena la mira cerca de los enemigos y la acerca a ellos (mando y táctil).',aa0:'No',aa1:'Baja',aa2:'Normal',aa3:'Alta',
  autoFire:'Disparo automático táctil',autoFire_d:'Dispara solo cuando hay un enemigo bajo la retícula.',btnSize:'Tamaño de los botones',btnAlpha:'Opacidad de los botones',
  blood:'Sangre',subtitles:'Subtítulos',subSize:'Tamaño de los subtítulos',sz_s:'Pequeño',sz_m:'Normal',sz_l:'Grande',language:'Idioma',
  voices:'Voces habladas',voices_d:'Si las apagas, las frases sólo salen en los subtítulos.',volMaster:'Volumen general',volFx:'Efectos',volMusic:'Música',volVoice:'Voces',on:'Sí',off:'No',resetDefaults:'Valores por defecto',resetQ:'¿Restablecer todas las opciones?',
  sec_look:'Mirar',sec_touch:'Controles táctiles',sec_access:'Accesibilidad',sec_play:'Partida',
  dev_kbm:'Teclado y ratón',dev_pad:'Mando',dev_touch:'Táctil',a_move:'Moverse',a_look:'Mirar',a_fire:'Disparar',a_ads:'Apuntar con la mira',a_reload:'Recargar',a_jump:'Saltar',
  a_crouch:'Agacharse',a_sprint:'Correr',a_grenade:'Granada (mantén para cocinarla)',a_melee:'Cuchillo',a_use:'Usar · recoger',a_swap:'Cambiar de arma',a_slots:'Arma 1, arma 2, pistola',a_pause:'Pausa',
  k_mouse:'Ratón',k_lclick:'Clic izquierdo',k_rclick:'Clic derecho',k_mclick:'Clic central',k_wheel:'Rueda',k_space:'Espacio',k_shift:'Mayús',k_or:'o',
  p_ls:'Stick izq.',p_rs:'Stick der.',p_l3:'Pulsar stick izq.',p_r3:'Pulsar stick der.',p_dpad:'Cruceta ◀ ▶',
  t_stick:'Apoya el pulgar en cualquier punto de la mitad izquierda: ahí aparece la palanca. Empújala a fondo hacia delante para correr.',
  t_look:'Arrastra en la mitad derecha para mirar, también con el dedo sobre el botón de disparo.',t_fire:'Mantén para disparar; arrastra sin soltar para seguir al enemigo.',
  t_ads:'Toca para apuntar con la mira y otra vez para dejar de apuntar.',t_use:'Sólo aparece cuando hay algo que usar o recoger.',touchPreview:'Disposición en pantalla',
  objective:'Objetivo',newObjective:'Nuevo objetivo',objDone:'Objetivo cumplido',checkpoint:'Punto de control',youDied:'Has muerto',missionFailed:'Misión fracasada',
  pressToContinue:'Pulsa para continuar',cont_kbm:'Pulsa Espacio o haz clic para volver al último punto de control',cont_pad:'Pulsa {b} para volver al último punto de control',
  cont_touch:'Toca la pantalla para volver al último punto de control',again_kbm:'Pulsa Espacio o haz clic para jugar otra vez',again_pad:'Pulsa {b} para jugar otra vez',again_touch:'Toca la pantalla para jugar otra vez',
  tip:'Consejo',pickUp:'recoger',use:'Usar',getOff:'Soltar el arma',hold:'Mantén',press:'Pulsa',touchHold:'Mantén',touchPress:'Toca',to:'para',
  mode_semi:'Semi',mode_auto:'Auto',mode_bolt:'Cerrojo',mode_rocket:'Cohete',mode_mounted:'Fija',reloading:'Recargando',noAmmo:'Sin munición',lowAmmo:'Recarga',overheat:'Recalentada',
  wave:'Oleada',points:'Puntos',waveStart:'Oleada {n}',waveClear:'Oleada superada',survOver:'Fin de la partida',waveReached:'Oleada alcanzada',score:'Puntuación',newRecord:'¡Nuevo récord!',
  gfxAutoT:'Calidad gráfica reducida a {q}',missionComplete:'Misión cumplida',time:'Tiempo',kills:'Bajas',accuracy:'Precisión',headshots:'Disparos a la cabeza',deaths:'Muertes',
  newBest:'Nuevo mejor tiempo',campaignDone:'¡Campaña completada!',subtitle:'Normandía · Las Ardenas',studio:'Un juego de ERAGAMES',loading:'Cargando…',fullscreen:'Pantalla completa',
  k_select:'Elegir',k_ok:'Aceptar',k_back:'Volver',k_tabs:'Pestañas',k_adjust:'Ajustar',you:'Tú',
  cr_game:'Un juego de ERAGAMES',cr_dir:'Dirección, diseño y programación',cr_gfx:'Gráficos',cr_gfxT:'Modelos, texturas y efectos generados por código con WebGL 2',
  cr_snd:'Sonido y música',cr_sndT:'Sintetizados en tiempo real con Web Audio',cr_vox:'Voces',cr_voxT:'Síntesis de voz del sistema',cr_fonts:'Tipografías',
  cr_fontsT:'Saira Condensed, Saira Stencil One y Special Elite (Google Fonts, licencia SIL OFL)',cr_mem:'En memoria de quienes desembarcaron en Normandía y resistieron en Las Ardenas en 1944.',
  controlsHint:'WASD mover · Ratón apuntar · Clic disparar · Clic der. apuntar · R recargar · G granada · C agacharse · Mayús correr · E usar',
  tips:['Agáchate tras los sacos terreros: la salud sólo se recupera si dejas de recibir disparos unos segundos.','Apuntar con la mira reduce mucho la dispersión. Con los subfusiles, dispara en ráfagas cortas.',
   'Mantén la granada un par de segundos antes de lanzarla para que explote al llegar.','El M1 Garand expulsa el peine con un «ping» al vaciarse: recarga a cubierto.',
   'Los enemigos sueltan sus armas. Si te quedas sin munición, recoge un MP40 o un Kar98k del suelo.','Un disparo a la cabeza hace cuatro veces más daño.',
   'La MG42 se recalienta: dispara en ráfagas cortas.','Cuando la pantalla se tiñe de rojo, ponte a cubierto y espera a recuperarte.','Sigue la estrella de la brújula: marca el objetivo y la distancia que te queda.',
   'Una granada cerca aparece con un aviso rojo y una flecha: corre en sentido contrario.','Correr agota el aliento; agachado eres un blanco más pequeño y apuntas mejor.','La madera fina no para las balas: no te escondas tras una valla.'],
  tips_kbm:['Pulsa V para el cuchillo cuando tengas a un enemigo encima.','Usa 1, 2 y 3 para elegir arma directamente.'],tips_pad:['Pulsa el stick izquierdo para correr y el derecho para el cuchillo.'],
  tips_touch:['Si te cuesta apuntar y disparar a la vez, activa el disparo automático táctil en Opciones.','Arrastra el dedo sobre el botón de disparo para seguir al enemigo mientras disparas.']},
 en:{campaign:'Campaign',campaignSub:'{n} missions · Normandy and the Ardennes',survival:'Survival',survivalSub:'Endless waves · best {s}',survivalNew:'Endless waves in a ruined village',
  options:'Options',optionsSub:'Video, sound, controls and language',controls:'Controls',controlsSub:'Keyboard, controller and touch',credits:'Credits',creditsSub:'ERAGAMES',
  back:'Back',start:'Start',resume:'Resume',continue:'Continue',restartCp:'Restart from checkpoint',quit:'Quit to menu',
  quitQ:'Quit to the main menu?',quitWarn:'Progress since the last checkpoint will be lost.',restartQ:'Go back to the last checkpoint?',yes:'Yes',no:'No',
  paused:'Paused',menu:'Menu',next:'Next mission',retry:'Retry',playAgain:'Play again',mission:'Mission',missionNofM:'Mission {n} of {m}',extras:'Extras',
  locked:'Locked',unlockHint:'Complete “{m}”',best:'Best',bestTime:'Best time',notPlayed:'Not completed',completed:'Completed',medal:'Medal',
  bronze:'Bronze',silver:'Silver',gold:'Gold',difficulty:'Difficulty',recluta:'Recruit',regular:'Regular',veterano:'Veteran',
  recluta_d:'To learn: enemies deal half damage.',regular_d:'The intended experience: tough but fair.',veterano_d:'For experts: a few hits and you are down.',
  briefing:'Mission briefing',confidential:'Confidential',place:'Place',date:'Date',objectives:'Objectives',mapTitle:'Operations map',
  legendYou:'Your squad',legendObj:'Objective',legendEnemy:'Enemy',legendAdvance:'Advance',survivalBest:'Best: {s} points · wave {w}',noRecord:'No record yet',
  tab_game:'Game',tab_controls:'Controls',tab_video:'Video',tab_audio:'Sound',quality:'Graphics quality',baja:'Low',media:'Medium',alta:'High',ultra:'Ultra',
  q_baja:'No shadows or costly effects: for modest devices.',q_media:'Soft shadows and particles: recommended on iPad.',q_alta:'Longer shadows, HDR and sun rays.',
  q_ultra:'Everything maxed, with ambient occlusion: for powerful computers.',qAuto:'Lowered to {q} automatically to keep it smooth.',
  sensMouse:'Mouse sensitivity',sensTouch:'Touch sensitivity',sensPad:'Controller sensitivity',invertY:'Invert vertical axis',fov:'Field of view',
  aimAssist:'Aim assist',aimAssist_d:'Slows the sights near enemies and pulls them closer (controller and touch).',aa0:'Off',aa1:'Low',aa2:'Normal',aa3:'High',
  autoFire:'Touch auto fire',autoFire_d:'Fires by itself when an enemy is under the crosshair.',btnSize:'Button size',btnAlpha:'Button opacity',
  blood:'Blood',subtitles:'Subtitles',subSize:'Subtitle size',sz_s:'Small',sz_m:'Normal',sz_l:'Large',language:'Language',
  voices:'Spoken voices',voices_d:'When off, lines only appear as subtitles.',volMaster:'Master volume',volFx:'Effects',volMusic:'Music',volVoice:'Voices',on:'On',off:'Off',resetDefaults:'Restore defaults',resetQ:'Restore all options to their defaults?',
  sec_look:'Look',sec_touch:'Touch controls',sec_access:'Accessibility',sec_play:'Gameplay',
  dev_kbm:'Keyboard & mouse',dev_pad:'Controller',dev_touch:'Touch',a_move:'Move',a_look:'Look',a_fire:'Fire',a_ads:'Aim down sights',a_reload:'Reload',a_jump:'Jump',
  a_crouch:'Crouch',a_sprint:'Sprint',a_grenade:'Grenade (hold to cook)',a_melee:'Knife',a_use:'Use · pick up',a_swap:'Switch weapon',a_slots:'Weapon 1, weapon 2, pistol',a_pause:'Pause',
  k_mouse:'Mouse',k_lclick:'Left click',k_rclick:'Right click',k_mclick:'Middle click',k_wheel:'Wheel',k_space:'Space',k_shift:'Shift',k_or:'or',
  p_ls:'Left stick',p_rs:'Right stick',p_l3:'Left stick click',p_r3:'Right stick click',p_dpad:'D-pad ◀ ▶',
  t_stick:'Rest your thumb anywhere on the left half: the stick appears there. Push it fully forward to sprint.',
  t_look:'Drag on the right half to look, also with your finger on the fire button.',t_fire:'Hold to fire; keep dragging to track the enemy.',
  t_ads:'Tap to aim down the sights, tap again to stop.',t_use:'Only appears when there is something to use or pick up.',touchPreview:'On-screen layout',
  objective:'Objective',newObjective:'New objective',objDone:'Objective complete',checkpoint:'Checkpoint',youDied:'You died',missionFailed:'Mission failed',
  pressToContinue:'Press to continue',cont_kbm:'Press Space or click to return to the last checkpoint',cont_pad:'Press {b} to return to the last checkpoint',
  cont_touch:'Tap the screen to return to the last checkpoint',again_kbm:'Press Space or click to play again',again_pad:'Press {b} to play again',again_touch:'Tap the screen to play again',
  tip:'Tip',pickUp:'pick up',use:'Use',getOff:'Leave the gun',hold:'Hold',press:'Press',touchHold:'Hold',touchPress:'Tap',to:'to',
  mode_semi:'Semi',mode_auto:'Auto',mode_bolt:'Bolt',mode_rocket:'Rocket',mode_mounted:'Mounted',reloading:'Reloading',noAmmo:'No ammo',lowAmmo:'Reload',overheat:'Overheated',
  wave:'Wave',points:'Points',waveStart:'Wave {n}',waveClear:'Wave cleared',survOver:'Game over',waveReached:'Wave reached',score:'Score',newRecord:'New record!',
  gfxAutoT:'Graphics quality lowered to {q}',missionComplete:'Mission complete',time:'Time',kills:'Kills',accuracy:'Accuracy',headshots:'Headshots',deaths:'Deaths',
  newBest:'New best time',campaignDone:'Campaign complete!',subtitle:'Normandy · The Ardennes',studio:'An ERAGAMES game',loading:'Loading…',fullscreen:'Fullscreen',
  k_select:'Select',k_ok:'Accept',k_back:'Back',k_tabs:'Tabs',k_adjust:'Adjust',you:'You',
  cr_game:'An ERAGAMES game',cr_dir:'Direction, design and programming',cr_gfx:'Graphics',cr_gfxT:'Models, textures and effects generated in code with WebGL 2',
  cr_snd:'Sound and music',cr_sndT:'Synthesized in real time with Web Audio',cr_vox:'Voices',cr_voxT:'System speech synthesis',cr_fonts:'Typefaces',
  cr_fontsT:'Saira Condensed, Saira Stencil One and Special Elite (Google Fonts, SIL OFL licence)',cr_mem:'In memory of those who landed in Normandy and held on in the Ardennes in 1944.',
  controlsHint:'WASD move · Mouse aim · Click fire · Right click aim · R reload · G grenade · C crouch · Shift sprint · E use',
  tips:['Crouch behind sandbags: health only comes back after a few seconds without being hit.','Aiming down the sights greatly reduces spread. With submachine guns, fire short bursts.',
   'Hold the grenade a couple of seconds before throwing so it explodes on arrival.','The M1 Garand ejects its clip with a “ping” when empty: reload in cover.',
   'Enemies drop their weapons. If you run out of ammo, pick up an MP40 or a Kar98k.','A headshot deals four times the damage.',
   'The MG42 overheats: fire short bursts.','When the screen turns red, get into cover and wait to recover.','Follow the star on the compass: it marks the objective and the distance left.',
   'A nearby grenade shows a red warning and an arrow: run the other way.','Sprinting wears you out; crouched you are a smaller target and aim better.','Thin wood does not stop bullets: do not hide behind a fence.'],
  tips_kbm:['Press V for the knife when an enemy gets close.','Use 1, 2 and 3 to pick a weapon directly.'],tips_pad:['Click the left stick to sprint and the right stick for the knife.'],
  tips_touch:['If aiming and firing at once is hard, turn on touch auto fire in Options.','Drag your finger over the fire button to track the enemy while firing.']}};
// clave -> texto en el idioma actual (con {variables}); si falta, español; si tampoco, la clave
function t(k,vars){const L=I18N[Settings.lang]||I18N.es;let s=L[k]!=null?L[k]:I18N.es[k]!=null?I18N.es[k]:k;
 if(vars&&typeof s==='string')s=s.replace(/\{(\w+)\}/g,(m,v)=>vars[v]!=null?vars[v]:m);return s;}
// texto localizado de {es, en} (o una cadena tal cual)
function txt(o){if(o==null)return '';if(typeof o==='string')return o;return o[Settings.lang]||o.es||o.en||'';}
const fmtTime=s=>{s=Math.max(0,s||0);const h=Math.floor(s/3600),m=Math.floor(s%3600/60),r=String(Math.floor(s%60)).padStart(2,'0');return h?h+':'+String(m).padStart(2,'0')+':'+r:m+':'+r;};
const fmtNum=n=>Math.round(n||0).toLocaleString(Settings.lang==='en'?'en-US':'es-ES');
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);

// ---------- iconos y medallas (SVG) ----------
const MICON={camp:'<path d="M3 6.5l6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',surv:'<path d="M4 15.5c0-5.2 3.6-9.5 8-9.5s8 4.3 8 9.5z"/><path d="M2 15.5h20M12 6v3.5"/>',
 opts:'<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
 ctl:'<path d="M7 8.5h10a4 4 0 0 1 4 4v2.3a2.9 2.9 0 0 1-5.1 1.9L14.3 15H9.7l-1.6 1.7A2.9 2.9 0 0 1 3 14.8v-2.3a4 4 0 0 1 4-4z"/><path d="M8 10.8v3.2M6.4 12.4h3.2"/><circle cx="15.6" cy="11.6" r=".6"/><circle cx="17.4" cy="13.4" r=".6"/>',
 cred:'<path d="M12 3.2l2.6 5.5 6 .7-4.4 4.1 1.1 5.9L12 16.5l-5.3 2.9 1.1-5.9-4.4-4.1 6-.7z"/>',lock:'<rect x="5" y="11" width="14" height="10" rx="1.5"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>',
 fs:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',fsx:'<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',back:'<path d="M15 5l-7 7 7 7"/>',play:'<path d="M8 5l11 7-11 7z"/>',
 retry:'<path d="M5 12a7 7 0 1 0 2-5"/><path d="M4 4v4.5h4.5"/>',home:'<path d="M4 11l8-7 8 7v9h-5v-6h-6v6H4z"/>',globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.3 3 14.7 0 18M12 3c-3 3.3-3 14.7 0 18"/>'};
const micon=(k,cls)=>'<svg class="ic'+(cls?' '+cls:'')+'" viewBox="0 0 24 24" aria-hidden="true">'+MICON[k]+'</svg>';
const MEDAL_COL={bronze:['#c98b4f','#7d5128','#8e2f2a','#f0c48a'],silver:['#d9dde2','#7f878f','#2f467e','#ffffff'],gold:['#e9c14c','#94701a','#8e2f2a','#fff3b8']};
function medalSVG(kind,on){const C=MEDAL_COL[kind]||MEDAL_COL.bronze;return '<svg class="medal '+(on?'on':'off')+'" viewBox="0 0 40 58" aria-hidden="true"><path d="M9 0h22l-5 24H14z" fill="'+C[2]+'"/><path d="M17 0h6l-1.2 24h-3.6z" fill="#efe6cf" opacity=".85"/>'+
 '<circle cx="20" cy="39" r="16" fill="'+C[0]+'" stroke="'+C[1]+'" stroke-width="2.4"/><circle cx="20" cy="39" r="11.5" fill="none" stroke="'+C[1]+'" stroke-width=".9" opacity=".7"/>'+
 '<path d="M20 29.2l2.8 5.8 6.4.8-4.7 4.4 1.2 6.3-5.7-3.1-5.7 3.1 1.2-6.3-4.7-4.4 6.4-.8z" fill="'+C[3]+'" stroke="'+C[1]+'" stroke-width=".8"/></svg>';}

// ---------- opciones (modelo de las filas) ----------
const OPTS={
 game:[{k:'diff',type:'choice',vals:['recluta','regular','veterano'],names:v=>t(v)},{k:'lang',type:'choice',vals:['es','en'],names:v=>v==='es'?'Español':'English'},
  {sec:'sec_access'},{k:'subtitles',type:'toggle'},{k:'subSize',type:'choice',vals:['s','m','l'],names:v=>t('sz_'+v)},{k:'blood',type:'toggle'}],
 controls:[{sec:'sec_look'},{k:'sensMouse',type:'slider',min:0.2,max:3,step:0.05,fmt:v=>v.toFixed(2)},{k:'sensPad',type:'slider',min:0.2,max:3,step:0.05,fmt:v=>v.toFixed(2)},
  {k:'sensTouch',type:'slider',min:0.2,max:3,step:0.05,fmt:v=>v.toFixed(2)},{k:'invertY',type:'toggle'},{k:'fov',type:'slider',min:50,max:80,step:1,fmt:v=>Math.round(v)+'°'},
  {k:'aimAssist',type:'choice',vals:[0,0.35,0.65,1],names:v=>t('aa'+[0,0.35,0.65,1].indexOf(v)),desc:'aimAssist_d'},
  {sec:'sec_touch'},{k:'autoFire',type:'toggle',desc:'autoFire_d'},{k:'btnSize',type:'slider',min:0.75,max:1.35,step:0.05,fmt:v=>Math.round(v*100)+'%'},
  {k:'btnAlpha',type:'slider',min:0.3,max:1,step:0.05,fmt:v=>Math.round(v*100)+'%'}],
 video:[{k:'quality',type:'choice',vals:['baja','media','alta','ultra'],names:v=>t(v),desc:()=>t('q_'+(Settings.quality||GFX.level))+(GFX.cap&&GFX.name()!==GFX.level?' '+t('qAuto',{q:t(GFX.name())}):'')},
  {k:'fov',type:'slider',min:50,max:80,step:1,fmt:v=>Math.round(v)+'°'}],
 audio:[{k:'volMaster',type:'slider',min:0,max:1,step:0.05,fmt:v=>Math.round(v*100)+'%'},{k:'volFx',type:'slider',min:0,max:1,step:0.05,fmt:v=>Math.round(v*100)+'%'},
  {k:'volMusic',type:'slider',min:0,max:1,step:0.05,fmt:v=>Math.round(v*100)+'%'},{k:'volVoice',type:'slider',min:0,max:1,step:0.05,fmt:v=>Math.round(v*100)+'%'},{k:'voices',type:'toggle',desc:'voices_d'},{k:'subtitles',type:'toggle'}]};

// ---------- menús ----------
const Menu={el:null,scr:null,name:'',back:null,acts:null,dlg:null,_pp:[],_rep:0,_tm:[],_raf:0,tab:{opts:'game',ctl:null},_mus:null,
 init(){const M=document.getElementById('menu');this.el=M;
  addEventListener('keydown',e=>this._key(e));
  addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'||e.pointerType==='touch'||e.pointerType==='pen')document.body.classList.remove('kbnav');},true);
  addEventListener('mousemove',e=>{if(this.scr&&(Math.abs(e.movementX)+Math.abs(e.movementY)>2))document.body.classList.remove('kbnav');},{passive:true});
  Bus.on('device',()=>this._keys());
  Bus.on('missionComplete',d=>this._record(d&&d.stats));
  document.addEventListener('fullscreenchange',()=>this._fsIcon());
  Settings.apply();},
 // ---------- utilidades ----------
 _snd(n){if(typeof Snd==='undefined')return;try{Snd.init();Snd.play(n==='ok'?'ui_ok':n==='back'?'ui_back':'ui_move');}catch(e){}},
 _music(name){if(typeof Snd==='undefined'||this._mus===name)return;this._mus=name;try{if(Snd.music)Snd.music(name);else Bus.emit('music',{name});}catch(e){}},
 _later(fn,ms){const h=setTimeout(fn,ms);this._tm.push(h);return h;},
 _clear(){for(const h of this._tm)clearTimeout(h);this._tm.length=0;if(this._raf)cancelAnimationFrame(this._raf);this._raf=0;this.dlg=null;},
 hide(){this._clear();this.scr=null;this.name='';this.back=null;this.el.innerHTML='';this.el.dataset.scr='';this._music(null);},
 _dev(){return typeof Input!=='undefined'?Input.device:'kbm';},
 // pantalla: nombre, html, {back, acts, focus, cls}
 _show(name,html,o){o=o||{};this._clear();this.el.dataset.scr=name;this.el.innerHTML='';const s=document.createElement('div');s.className='scr scr-'+name+(o.cls?' '+o.cls:'');s.innerHTML=html;
  this.el.appendChild(s);this.scr=s;this.name=name;this.back=o.back||null;this.acts=o.acts||{};
  s.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b||!s.contains(b)||b.disabled||b.getAttribute('aria-disabled')==='true')return;
   const root=this.dlg?this.dlg.el:s;if(!root.contains(b))return;const f=(this.dlg?this.dlg.acts:this.acts)[b.dataset.a];if(f){e.preventDefault();this._snd(b.dataset.a==='back'||b.dataset.a==='no'?'back':'ok');f(b,e);}});
  this._keys();this._fsIcon();
  const f=(o.focus&&s.querySelector(o.focus))||this._items()[0];if(f&&!o.nofocus)f.focus({preventScroll:true});return s;},
 // elementos navegables visibles (dentro del diálogo si hay uno)
 _items(){const r=this.dlg?this.dlg.el:this.scr;if(!r)return [];return [...r.querySelectorAll('button:not([disabled]),[tabindex="0"]')].filter(e=>e.getClientRects().length&&!e.closest('[hidden]'));},
 _keys(){if(!this.scr)return;const d=this._dev(),K=this.scr.querySelectorAll('.keys');if(!K.length)return;const tabs=!!this.scr.querySelector('.tabs'),adj=!!this.scr.querySelector('.opt');
  let h='';if(d==='pad')h='<span>'+Input.padGlyph(0)+' '+t('k_ok')+'</span><span>'+Input.padGlyph(1)+' '+t('k_back')+'</span>'+(tabs?'<span>'+Input.padGlyph(4)+Input.padGlyph(5)+' '+t('k_tabs')+'</span>':'');
  else if(d==='kbm')h='<span><kbd>↑</kbd><kbd>↓</kbd> '+t('k_select')+'</span>'+(adj?'<span><kbd>←</kbd><kbd>→</kbd> '+t('k_adjust')+'</span>':'')+'<span><kbd>Intro</kbd> '+t('k_ok')+'</span><span><kbd>Esc</kbd> '+t('k_back')+'</span>'+(tabs?'<span><kbd>Q</kbd><kbd>E</kbd> '+t('k_tabs')+'</span>':'');
  if(Settings.lang==='en')h=h.replace('>Intro<','>Enter<');for(const k of K)k.innerHTML=h;},
 _fsIcon(){if(!this.scr)return;const b=this.scr.querySelector('[data-a="fs"]');if(b)b.innerHTML=micon(document.fullscreenElement?'fsx':'fs');},
 _top(title,info){return '<header class="top"><button class="back" data-a="back" aria-label="'+esc(t('back'))+'">'+micon('back')+'<span>'+esc(t('back'))+'</span></button><h2>'+esc(title)+'</h2>'+(info?'<div class="tinfo">'+info+'</div>':'')+'</header>';},
 // ---------- misiones ----------
 camp(){return LEVELS.filter(L=>!L.survival&&L.id!=='test'&&!L.hidden&&!L.extra);},
 extras(){return LEVELS.filter(L=>(L.survival||L.id==='test'||L.extra)&&!L.hidden);},
 optional(L){return !!(L.optional||L.id==='training');},
 unlocked(L){const C=this.camp(),i=C.indexOf(L);if(i<=0)return true;for(let k=0;k<i;k++)if(!this.optional(C[k])&&!Save.done[C[k].id])return false;return true;},
 // misión con la que seguir: la primera desbloqueada y sin terminar (sin contar la instrucción si ya se jugó otra)
 nextUp(){const C=this.camp();for(const L of C)if(this.unlocked(L)&&!Save.done[L.id]&&!(this.optional(L)&&C.some(c=>Save.done[c.id])))return L;return null;},
 _medals(id){const d=Save.done[id],r=d?MEDAL_RANK[d.medal]||1:0;return ['bronze','silver','gold'].map((m,i)=>medalSVG(m,r>=i+1)).join('');},
 _record(st){if(!st||!st.level)return;const B=Save.best[st.level]||(Save.best[st.level]={}),prev=B[st.diff];this._prevBest=prev;if(prev==null||st.time<prev)B[st.diff]=Math.round(st.time*10)/10;Save.store();},
 // ---------- título ----------
 title(){const C=this.camp(),nx=this.nextUp(),sv=Save.survival?t('survivalSub',{s:fmtNum(Save.survival)}):t('survivalNew'),fsOK=!!(document.fullscreenEnabled&&document.documentElement.requestFullscreen);
  const b=(a,ic,lab,sub,cls)=>'<button class="bt'+(cls?' '+cls:'')+'" data-a="'+a+'">'+micon(ic)+'<span class="lb">'+esc(lab)+(sub?'<small>'+esc(sub)+'</small>':'')+'</span></button>';
  const ci=nx?C.indexOf(nx):-1;
  this._show('title','<div class="brand"><div class="emb"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" stroke-width="3.5"/><path d="M32 9.5l6.2 18.9h19.9L42 40.1l6.1 18.9L32 47.3 15.9 59l6.1-18.9L5.9 28.4h19.9z" fill="currentColor"/></svg></div>'+
   '<h1>Frente <em>44</em></h1><div class="tag">'+esc(t('subtitle'))+'</div></div>'+
   '<nav class="mnav">'+b('camp','camp',t('campaign'),t('campaignSub',{n:C.length}),'pri')+b('surv','surv',t('survival'),sv)+b('opts','opts',t('options'))+b('ctl','ctl',t('controls'))+b('cred','cred',t('credits'))+'</nav>'+
   (nx?'<button class="cont" data-a="cont"><canvas width="320" height="180"></canvas><span class="cl"><small>'+esc(t('continue'))+' · '+esc(t('mission'))+' '+(ci+1)+'</small><b>'+esc(txt(nx.name))+'</b><i>'+esc(txt(nx.place))+(nx.date?' · '+esc(nx.date):'')+'</i></span>'+micon('play','go')+'</button>':'')+
   '<footer class="foot"><span class="studio">ERAGAMES · 1944</span><span class="keys"></span><span class="fb"><button class="mini" data-a="lang" aria-label="'+esc(t('language'))+'">'+micon('globe')+'<b>'+(Settings.lang==='es'?'ES':'EN')+'</b></button>'+
   (fsOK?'<button class="mini" data-a="fs" aria-label="'+esc(t('fullscreen'))+'"></button>':'')+'</span></footer>',
   {acts:{camp:()=>this.campaign(),surv:()=>this._startLevel(LEVELS.find(L=>L.survival)),opts:()=>this.options(()=>this.title()),ctl:()=>this.controls(()=>this.title()),cred:()=>this.credits(),
    cont:()=>this._startLevel(nx),lang:()=>{Settings.set('lang',Settings.lang==='es'?'en':'es');this.title();const f=this.scr.querySelector('[data-a="lang"]');if(f)f.focus();},fs:()=>this._fs()}});
  if(nx){const cv=this.scr.querySelector('.cont canvas');if(cv)this._thumb(cv,nx);}
  this._music('music_menu');},
 _fs(){try{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen().catch(()=>{});}catch(e){}},
 _startLevel(L){if(!L)return;Game.start(L.id,Settings.diff);},
 // ---------- campaña ----------
 campaign(focusId){const C=this.camp(),X=this.extras();
  const card=(L,i,ex)=>{const un=ex||this.unlocked(L),d=Save.done[L.id],no=ex?'':String(i+1).padStart(2,'0');let foot;
   if(L.survival)foot='<span class="best">'+(Save.survival?t('best')+' <b>'+fmtNum(Save.survival)+'</b>':esc(t('noRecord')))+'</span>';
   else if(!un){const pv=C.slice(0,i).filter(c=>!this.optional(c)&&!Save.done[c.id]).pop();foot='<span class="best lockt">'+micon('lock')+esc(t('unlockHint',{m:pv?txt(pv.name):''}))+'</span>';}
   else foot='<span class="md">'+this._medals(L.id)+'</span><span class="best">'+(d?t('best')+' <b>'+fmtTime(d.time)+'</b>':esc(t('notPlayed')))+'</span>';
   return '<button class="bt lv card'+(un?'':' locked')+(ex?' ex':'')+'" data-a="lv" data-id="'+esc(L.id)+'"'+(un?'':' aria-disabled="true"')+'><span class="ph"><canvas width="320" height="180"></canvas>'+(no?'<span class="no">'+no+'</span>':'')+
    (un?'':'<span class="lk">'+micon('lock')+'<em>'+esc(t('locked'))+'</em></span>')+(d&&!L.survival?'<span class="ok">'+esc(t('completed'))+'</span>':'')+'</span><span class="cb"><b class="nm">'+esc(txt(L.name))+'</b><small>'+esc(txt(L.place))+(L.date?' · '+esc(L.date):'')+'</small>'+
    '<span class="cf">'+foot+'</span></span></button>';};
  const done=C.filter(L=>Save.done[L.id]).length;
  this._show('campaign',this._top(t('campaign'),'<span>'+esc(t('difficulty'))+': <b>'+esc(t(Settings.diff))+'</b></span><span>'+done+' / '+C.length+'</span>')+
   '<div class="body"><div class="cards">'+C.map((L,i)=>card(L,i,false)).join('')+'</div>'+(X.length?'<h3 class="sec">'+esc(t('extras'))+'</h3><div class="cards exs">'+X.map((L,i)=>card(L,i,true)).join('')+'</div>':'')+'</div><footer class="keys"></footer>',
   {back:()=>this.title(),focus:focusId?'[data-id="'+focusId+'"]':'.card:not(.locked)',acts:{back:()=>this.title(),lv:b=>{const L=LEVELS.find(l=>l.id===b.dataset.id);if(!L)return;
    if(b.classList.contains('locked')){b.classList.remove('shake');void b.offsetWidth;b.classList.add('shake');return;}Game.start(L.id,Settings.diff);}}});
  this.scr.querySelectorAll('.card').forEach(b=>{const L=LEVELS.find(l=>l.id===b.dataset.id),cv=b.querySelector('canvas');if(L&&cv)this._thumb(cv,L);});
  this._music('music_menu');},
 // ---------- informe de la misión: dossier a máquina, mapa y dificultad ----------
 brief(L,diff){const C=this.camp(),i=C.indexOf(L),D=['recluta','regular','veterano'],ob=(L.objectives||[]).map(o=>txt(o.text)).filter(Boolean),best=Save.best[L.id]||{};
  diff=D.includes(diff)?diff:Settings.diff;this._diff=diff;
  const seg=D.map(k=>'<button class="sg'+(k===diff?' on':'')+'" data-a="diff" data-v="'+k+'" role="radio" aria-checked="'+(k===diff)+'">'+medalSVG(DIFF_MEDAL[k],!!best[k]||(Save.done[L.id]&&MEDAL_RANK[Save.done[L.id].medal]>=MEDAL_RANK[DIFF_MEDAL[k]]))+
   '<span><b>'+esc(t(k))+'</b><small>'+esc(t(k+'_d'))+'</small>'+(best[k]!=null&&!L.survival?'<i>'+esc(t('best'))+' '+fmtTime(best[k])+'</i>':'')+'</span></button>').join('');
  const info=L.survival?(Save.survival?t('survivalBest',{s:fmtNum(Save.survival),w:(Save.surv&&Save.surv.wave)||'—'}):t('noRecord')):i>=0?t('missionNofM',{n:i+1,m:C.length}):t('extras');
  this._show('brief',this._top(t('briefing'),'<span>'+esc(info)+'</span>')+
   '<div class="body brief"><article class="dossier"><span class="stamp">'+esc(t('confidential'))+'</span><div class="dh">'+(i>=0?'<small>'+esc(t('mission'))+' '+(i+1)+'</small>':'')+'<h3>'+esc(txt(L.name))+'</h3>'+
   '<dl><dt>'+esc(t('place'))+'</dt><dd>'+esc(txt(L.place))+'</dd>'+(L.date?'<dt>'+esc(t('date'))+'</dt><dd>'+esc(L.date)+'</dd>':'')+'</dl></div>'+
   '<p class="tw" data-full="'+esc(txt(L.brief))+'"></p>'+(ob.length?'<h4>'+esc(t('objectives'))+'</h4><ol class="obl">'+ob.map(o=>'<li>'+esc(o)+'</li>').join('')+'</ol>':'')+'</article>'+
   '<figure class="mapw"><canvas width="760" height="560"></canvas><figcaption><span class="lg you">'+esc(t('legendYou'))+'</span><span class="lg obj">'+esc(t('legendObj'))+'</span><span class="lg en">'+esc(t('legendEnemy'))+'</span><span class="lg adv">'+esc(t('legendAdvance'))+'</span></figcaption></figure></div>'+
   '<div class="dock"><div class="seg diff" role="radiogroup" aria-label="'+esc(t('difficulty'))+'">'+seg+'</div><button class="bt pri go" data-a="go">'+esc(t('start'))+'<span class="chev">›››</span></button></div><footer class="keys"></footer>',
   {back:()=>{Game.toTitle();this.campaign(L.id);},focus:'.go',acts:{back:()=>{Game.toTitle();this.campaign(L.id);},
    diff:b=>{this._diff=b.dataset.v;this.scr.querySelectorAll('.sg').forEach(x=>{const on=x===b;x.classList.toggle('on',on);x.setAttribute('aria-checked',on);});},
    go:()=>{const v=this._diff||diff;Settings.set('diff',v);this._music(null);Game.begin(v);}}});
  const cv=this.scr.querySelector('.mapw canvas');if(cv)try{this._map(cv,L);}catch(e){console.error(e);}
  this._type(this.scr.querySelector('.tw'));this._music('music_menu');},
 // texto a máquina (se completa al instante si se pulsa sobre él)
 _type(el){if(!el)return;const full=el.dataset.full||'';let n=0;el.textContent='';el.classList.add('typing');
  const step=()=>{if(!el.isConnected)return;n=Math.min(full.length,n+2);el.textContent=full.slice(0,n);if(n<full.length)this._later(step,28);else el.classList.remove('typing');};
  el.addEventListener('click',()=>{n=full.length-2;});this._later(step,350);},
 // ---------- opciones ----------
 options(back,tab){this._optBack=back;tab=tab||this.tab.opts||'game';this.tab.opts=tab;const T=['game','controls','video','audio'];
  const rows=OPTS[tab].map(o=>o.sec?'<h3 class="sec">'+esc(t(o.sec))+'</h3>':this._optRow(o)).join('');
  this._show('options',this._top(t('options'))+'<div class="tabs" role="tablist">'+T.map(k=>'<button class="tab'+(k===tab?' on':'')+'" data-a="tab" data-v="'+k+'" role="tab" aria-selected="'+(k===tab)+'">'+esc(t('tab_'+k))+'</button>').join('')+'</div>'+
   '<div class="body"><div class="panel">'+rows+'<div class="prow"><button class="mbt" data-a="reset">'+micon('retry')+esc(t('resetDefaults'))+'</button></div></div></div><footer class="keys"></footer>',
   {back,focus:'.opt',acts:{back,tab:b=>this.options(back,b.dataset.v),reset:()=>this.confirm(t('resetQ'),'',()=>{Settings.reset();this.options(back,tab);},()=>{})}});
  this._bindOpts();},
 _opt(k){for(const tb in OPTS)for(const o of OPTS[tb])if(o.k===k)return o;return null;},
 _optVal(o){return o.k==='quality'?(Settings.quality||GFX.level):Settings[o.k];},
 _optRow(o){const v=this._optVal(o),d=o.desc?(typeof o.desc==='function'?o.desc():t(o.desc)):'';let ctl;
  if(o.type==='slider'){const p=(v-o.min)/(o.max-o.min)*100;ctl='<span class="ar" data-d="-1">‹</span><span class="sl"><i style="width:'+p.toFixed(1)+'%"></i></span><span class="ar" data-d="1">›</span><em>'+o.fmt(v)+'</em>';}
  else if(o.type==='toggle')ctl='<span class="sw'+(v?' on':'')+'"><i></i></span><em>'+esc(t(v?'on':'off'))+'</em>';
  else{const j=o.vals.indexOf(v);ctl='<span class="ar" data-d="-1">‹</span><span class="ch">'+o.vals.map((x,i)=>'<i'+(i===j?' class="on"':'')+'></i>').join('')+'<b>'+esc(o.names(v))+'</b></span><span class="ar" data-d="1">›</span>';}
  const role=o.type==='slider'?'slider':o.type==='toggle'?'switch':'listbox';
  return '<div class="opt '+o.type+'" tabindex="0" data-k="'+o.k+'" role="'+role+'"'+(o.type==='toggle'?' aria-checked="'+!!v+'"':'')+(o.type==='slider'?' aria-valuemin="'+o.min+'" aria-valuemax="'+o.max+'" aria-valuenow="'+v+'"':'')+'>'+
   '<span class="ol">'+esc(t(o.k))+(d?'<small>'+esc(d)+'</small>':'')+'</span><span class="ov">'+ctl+'</span></div>';},
 _bindOpts(){const P=this.scr.querySelector('.panel');if(!P)return;
  P.addEventListener('click',e=>{const r=e.target.closest('.opt');if(!r)return;const o=this._opt(r.dataset.k);if(!o)return;const a=e.target.closest('.ar');
   if(a)this._optStep(r,o,+a.dataset.d);else if(o.type==='toggle'||o.type==='choice')this._optStep(r,o,1);});
  // deslizadores: arrastrar sobre la barra
  P.addEventListener('pointerdown',e=>{const sl=e.target.closest('.sl');if(!sl)return;const r=sl.closest('.opt'),o=this._opt(r.dataset.k);if(!o)return;e.preventDefault();r.focus({preventScroll:true});
   const set=x=>{const b=(r.querySelector('.sl')||sl).getBoundingClientRect(),f=clamp((x-b.left)/b.width,0,1);let v=o.min+f*(o.max-o.min);v=Math.round(v/o.step)*o.step;this._optSet(r,o,+v.toFixed(3));};
   set(e.clientX);const mv=ev=>set(ev.clientX),up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);removeEventListener('pointercancel',up);};
   addEventListener('pointermove',mv);addEventListener('pointerup',up);addEventListener('pointercancel',up);});},
 _optStep(r,o,d){let v=this._optVal(o);if(o.type==='slider')v=clamp(Math.round((v+d*o.step)/o.step)*o.step,o.min,o.max);else if(o.type==='toggle')v=!v;
  else{const n=o.vals.length,j=o.vals.indexOf(v);v=o.vals[((j<0?0:j)+d+n)%n];}this._optSet(r,o,typeof v==='number'?+v.toFixed(3):v);this._snd('move');},
 _optSet(r,o,v){if(o.k==='quality'){if(GL.gl)GFX.set(v);}if(!Settings.set(o.k,v))return;
  if(o.k==='lang'){this.options(this._optBack,this.tab.opts);const f=this.scr.querySelector('[data-k="lang"]');if(f)f.focus({preventScroll:true});return;}
  const nr=document.createElement('div');nr.innerHTML=this._optRow(o);const n=nr.firstChild;r.className=n.className;r.innerHTML=n.innerHTML;for(const a of ['aria-checked','aria-valuenow'])if(n.hasAttribute(a))r.setAttribute(a,n.getAttribute(a));
  // la misma opción puede estar en dos pestañas (fov): nada más que hacer; la vista previa táctil se actualiza sola
  if(o.k==='btnSize'||o.k==='btnAlpha'){const pv=this.scr.querySelector('.tprev');if(pv)this._touchPrev(pv);}},
 // ---------- controles por dispositivo ----------
 controls(back,dev){this._ctlBack=back;dev=dev||this.tab.ctl||this._dev();this.tab.ctl=dev;const D=['kbm','pad','touch'];
  const K=(...a)=>a.map(x=>'<kbd>'+esc(x)+'</kbd>').join(''),O=' <em>'+esc(t('k_or'))+'</em> ',P=i=>Input.padGlyph(i);let rows=[];
  if(dev==='kbm')rows=[['a_move',K('W','A','S','D')+O+K('↑','←','↓','→')],['a_look',K(t('k_mouse'))],['a_fire',K(t('k_lclick'))],['a_ads',K(t('k_rclick'))],['a_reload',K('R')],['a_jump',K(t('k_space'))],
   ['a_crouch',K('C')+O+K('Ctrl')],['a_sprint',K(t('k_shift'))],['a_grenade',K('G')],['a_melee',K('V')+O+K(t('k_mclick'))],['a_use',K('E')],['a_swap',K('Q')+O+K(t('k_wheel'))],['a_slots',K('1','2','3')],['a_pause',K('Esc')+O+K('P')]];
  else if(dev==='pad')rows=[['a_move','<span class="pt">'+esc(t('p_ls'))+'</span>'],['a_look','<span class="pt">'+esc(t('p_rs'))+'</span>'],['a_fire',P(7)],['a_ads',P(6)],['a_reload',P(2)],['a_use',P(2)],['a_jump',P(0)],['a_crouch',P(1)],
   ['a_sprint','<span class="pt">'+esc(t('p_l3'))+'</span>'],['a_grenade',P(5)],['a_melee',P(4)+O+'<span class="pt">'+esc(t('p_r3'))+'</span>'],['a_swap',P(3)+O+'<span class="pt">'+esc(t('p_dpad'))+'</span>'],['a_pause',P(9)]];
  else rows=[['a_move',esc(t('t_stick'))],['a_look',esc(t('t_look'))],['a_fire',Input.touchGlyph('fire')+esc(t('t_fire'))],['a_ads',Input.touchGlyph('ads')+esc(t('t_ads'))],['a_use',Input.touchGlyph('use')+esc(t('t_use'))],
   ['a_reload',Input.touchGlyph('reload')],['a_grenade',Input.touchGlyph('grenade')],['a_jump',Input.touchGlyph('jump')],['a_crouch',Input.touchGlyph('crouch')],['a_swap',Input.touchGlyph('swap')],['a_melee',Input.touchGlyph('melee')],['a_pause',Input.touchGlyph('pause')]];
  const tbl='<dl class="keymap'+(dev==='touch'?' tk':'')+'">'+rows.map(r=>'<div><dt>'+esc(t(r[0]))+'</dt><dd>'+r[1]+'</dd></div>').join('')+'</dl>';
  this._show('controls',this._top(t('controls'))+'<div class="tabs" role="tablist">'+D.map(k=>'<button class="tab'+(k===dev?' on':'')+'" data-a="tab" data-v="'+k+'" role="tab" aria-selected="'+(k===dev)+'">'+esc(t('dev_'+k))+'</button>').join('')+'</div>'+
   '<div class="body"><div class="panel ctl '+dev+'">'+(dev==='touch'?'<div class="tprev" aria-label="'+esc(t('touchPreview'))+'"></div>':'')+tbl+'</div></div><footer class="keys"></footer>',
   {back,focus:'.tab.on',acts:{back,tab:b=>this.controls(back,b.dataset.v)}});
  const pv=this.scr.querySelector('.tprev');if(pv)this._touchPrev(pv);},
 // vista previa de la disposición táctil (mismas posiciones que en juego, a escala)
 _touchPrev(el){const W=1024,H=640,k=el.clientWidth?el.clientWidth/W:0.4,L=Input.touchLayout(W,H);
  el.innerHTML='<span class="stk"></span>'+L.map(b=>'<span class="tb '+b.id+'" style="left:'+((b.x-b.d/2)*k).toFixed(1)+'px;top:'+((b.y-b.d/2)*k).toFixed(1)+'px;width:'+(b.d*k).toFixed(1)+'px;height:'+(b.d*k).toFixed(1)+'px;opacity:'+Settings.btnAlpha+'">'+Input.touchIcon(b.id)+'</span>').join('');
  el.style.height=(H*k).toFixed(0)+'px';},
 // ---------- créditos ----------
 credits(){const r=(a,b)=>'<div class="cr"><dt>'+esc(t(a))+'</dt><dd>'+esc(b)+'</dd></div>';
  this._show('credits',this._top(t('credits'))+'<div class="body"><article class="paper credits"><div class="emb">'+micon('cred')+'</div><h3>Frente 44</h3><p class="by">'+esc(t('cr_game'))+'</p><dl>'+
   r('cr_dir','ERAGAMES')+r('cr_gfx',t('cr_gfxT'))+r('cr_snd',t('cr_sndT'))+r('cr_vox',t('cr_voxT'))+r('cr_fonts',t('cr_fontsT'))+'</dl><p class="mem">'+esc(t('cr_mem'))+'</p><p class="sig">ERAGAMES · MMXXVI</p></article></div><footer class="keys"></footer>',
   {back:()=>this.title(),focus:'.back',acts:{back:()=>this.title()}});},
 // ---------- pausa ----------
 pause(){const L=Game.level,o=Game.L&&Game.L.objective,surv=L&&L.survival;
  this._show('pause','<div class="pz"><h2>'+esc(t('paused'))+'</h2><div class="pinfo">'+esc(L?txt(L.name):'')+' · '+esc(t(Game.diff))+'</div>'+
   (o?'<div class="pobj"><span>'+esc(t('objective'))+'</span>'+esc(txt(o.text))+'</div>':'')+
   '<nav class="mnav">'+[['resume','play',t('resume'),'pri'],surv?null:['restart','retry',t('restartCp')],['opts','opts',t('options')],['ctl','ctl',t('controls')],['quit','home',t('quit')]].filter(Boolean).map(b=>'<button class="bt'+(b[3]?' '+b[3]:'')+'" data-a="'+b[0]+'">'+micon(b[1])+'<span class="lb">'+esc(b[2])+'</span></button>').join('')+'</nav>'+
   '</div><footer class="keys"></footer>',{cls:'dim',back:()=>Game.resume(),acts:{resume:()=>Game.resume(),
    restart:()=>this.confirm(t('restartQ'),'',()=>Game.restartCheckpoint(true),()=>{}),opts:()=>this.options(()=>this.pause()),ctl:()=>this.controls(()=>this.pause()),
    quit:()=>this.confirm(t('quitQ'),t('quitWarn'),()=>Game.toTitle(),()=>{})}});},
 // ---------- diálogo de confirmación ----------
 confirm(q,sub,yes,no){if(!this.scr)return;const prev=document.activeElement,d=document.createElement('div');d.className='dlg';
  d.innerHTML='<div class="dcard" role="alertdialog" aria-modal="true"><p>'+esc(q)+'</p>'+(sub?'<small>'+esc(sub)+'</small>':'')+'<div class="drow"><button class="mbt" data-a="yes">'+esc(t('yes'))+'</button><button class="mbt" data-a="no">'+esc(t('no'))+'</button></div></div>';
  this.scr.appendChild(d);const close=()=>{d.remove();this.dlg=null;if(prev&&prev.isConnected)prev.focus({preventScroll:true});};
  this.dlg={el:d,acts:{yes:()=>{close();yes();},no:()=>{close();if(no)no();}},close};d.querySelector('[data-a="no"]').focus({preventScroll:true});},
 // ---------- fin de misión ----------
 complete(st){st=st||{};const L=Game.level;if(L&&L.survival)return this.survivalEnd(st);const nx=Game.nextLevel(),C=this.camp(),i=C.indexOf(L),prev=this._prevBest,best=Save.best[st.level]&&Save.best[st.level][st.diff];
  const nb=prev==null||st.time<prev,medal=st.medal||DIFF_MEDAL[st.diff]||'bronze',last=i>=0&&i===C.length-1;
  const row=(k,v,cls)=>'<div class="sr'+(cls?' '+cls:'')+'"><dt>'+esc(t(k))+'</dt><dd data-v="'+v+'">'+(typeof v==='number'?'0':esc(v))+'</dd></div>';
  this._show('complete','<div class="cmp"><div class="stampx">'+esc(t(last?'campaignDone':'missionComplete'))+'</div><h3>'+esc(L?txt(L.name):'')+'</h3><div class="cpl">'+esc(L?txt(L.place):'')+' · '+esc(t(st.diff||Game.diff))+'</div>'+
   '<div class="cgrid"><dl class="stats">'+row('time',fmtTime(st.time),nb?'nb':'')+row('kills',st.kills|0)+row('accuracy',(st.acc|0)+'%')+row('headshots',st.heads|0)+row('deaths',st.deaths|0)+'</dl>'+
   '<div class="medw">'+medalSVG(medal,true)+'<b>'+esc(t(medal))+'</b>'+(nb?'<span class="nbt">'+esc(t('newBest'))+'</span>':best!=null?'<span class="bt0">'+esc(t('best'))+' '+fmtTime(best)+'</span>':'')+'</div></div>'+
   '<nav class="crow">'+(nx?'<button class="bt pri" data-a="next">'+esc(t('next'))+'<span class="chev">›››</span></button>':'')+'<button class="bt" data-a="retry">'+micon('retry')+'<span class="lb">'+esc(t('retry'))+'</span></button>'+
   '<button class="bt" data-a="menu">'+micon('home')+'<span class="lb">'+esc(t('menu'))+'</span></button></nav></div><footer class="keys"></footer>',
   {cls:'dim',back:()=>{Game.toTitle();this.campaign(L&&L.id);},acts:{next:()=>Game.start(nx.id,Game.diff),retry:()=>Game.start(L.id,Game.diff),menu:()=>{Game.toTitle();this.campaign(L&&L.id);}}});
  this._count();this._music('music_victory');},
 // cifras que suben al aparecer
 _count(){const E=[...this.scr.querySelectorAll('dd[data-v]')].filter(e=>/^\d+$/.test(e.dataset.v));const t0=performance.now()+300;
  const f=now=>{const k=clamp((now-t0)/900,0,1),q=1-Math.pow(1-k,3);for(const e of E)e.textContent=Math.round(+e.dataset.v*q);if(k<1&&this.scr&&this.scr.isConnected)this._raf=requestAnimationFrame(f);};this._raf=requestAnimationFrame(f);},
 // ---------- supervivencia: resultados ({score, wave, kills, time}) ----------
 survivalEnd(st){st=Object.assign({},typeof HUD!=='undefined'&&HUD.survStats?HUD.survStats():{},st||{});const sc=st.score|0;
  const rec=Save.survRecord(st)||!!st.record||!!(typeof HUD!=='undefined'&&HUD.sv&&HUD.sv.rec);
  const row=(k,v)=>'<div class="sr"><dt>'+esc(t(k))+'</dt><dd data-v="'+v+'">'+(typeof v==='number'?'0':esc(v))+'</dd></div>';
  this._show('complete','<div class="cmp surv"><div class="stampx">'+esc(t('survOver'))+'</div><h3>'+esc(t('survival'))+'</h3><div class="cpl">'+esc(t(Game.diff))+'</div><div class="cgrid"><dl class="stats">'+
   row('score',sc)+row('waveReached',st.wave|0)+row('kills',st.kills|0)+row('time',fmtTime(st.time))+'</dl><div class="medw"><b class="big">'+fmtNum(Save.survival)+'</b><span class="bt0">'+esc(t('best'))+'</span>'+(rec?'<span class="nbt">'+esc(t('newRecord'))+'</span>':'')+'</div></div>'+
   '<nav class="crow"><button class="bt pri" data-a="again">'+esc(t('playAgain'))+'<span class="chev">›››</span></button><button class="bt" data-a="menu">'+micon('home')+'<span class="lb">'+esc(t('menu'))+'</span></button></nav></div><footer class="keys"></footer>',
   {cls:'dim',back:()=>Game.toTitle(),acts:{again:()=>Game.start(Game.level.id,Game.diff,true),menu:()=>Game.toTitle()}});this._count();},
 // ---------- navegación: teclado ----------
 _nav(dir){const els=this._items();if(!els.length)return;const cur=document.activeElement;if(!els.includes(cur)){els[0].focus({preventScroll:true});this._see(els[0]);return;}
  const rc=cur.getBoundingClientRect(),cx=(rc.left+rc.right)/2,cy=(rc.top+rc.bottom)/2;let best=null,bs=Infinity;
  for(const el of els){if(el===cur)continue;const r=el.getBoundingClientRect(),dx=(r.left+r.right)/2-cx,dy=(r.top+r.bottom)/2-cy;
   // solapes: lo que está en la misma fila/columna gana
   const main=dir==='up'?-dy:dir==='down'?dy:dir==='left'?-dx:dx,side=dir==='up'||dir==='down'?Math.max(0,Math.abs(dx)-(rc.width+r.width)/2):Math.max(0,Math.abs(dy)-(rc.height+r.height)/2);
   if(main<=2)continue;const s=main+side*3;if(s<bs){bs=s;best=el;}}
  if(!best&&(dir==='down'||dir==='up')){const i=els.indexOf(cur);best=els[(i+(dir==='down'?1:els.length-1))%els.length];}
  if(best&&best!==cur){best.focus({preventScroll:true});this._see(best);this._snd('move');}},
 _see(el){const b=el.closest('.body');if(!b)return;const r=el.getBoundingClientRect(),br=b.getBoundingClientRect();if(r.top<br.top+8)b.scrollTop-=br.top+8-r.top;else if(r.bottom>br.bottom-8)b.scrollTop+=r.bottom-br.bottom+8;},
 _tabStep(d){if(!this.scr||this.dlg)return false;const tabs=[...this.scr.querySelectorAll('.tab')];if(!tabs.length)return false;const i=tabs.findIndex(x=>x.classList.contains('on'));
  const n=tabs[(i+d+tabs.length)%tabs.length];n.click();const f=this.scr.querySelector('.tab.on');if(f)f.focus({preventScroll:true});return true;},
 _activate(el){if(!el)return;if(el.classList.contains('opt')){const o=this._opt(el.dataset.k);if(o)this._optStep(el,o,1);}else el.click();},
 _key(e){if(!this.scr)return;const c=e.code,a=document.activeElement;
  const dir={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'}[c];
  if(dir){e.preventDefault();document.body.classList.add('kbnav');
   if((dir==='left'||dir==='right')&&a&&a.classList&&a.classList.contains('opt')){const o=this._opt(a.dataset.k);if(o)this._optStep(a,o,dir==='left'?-1:1);return;}
   this._nav(dir);return;}
  if(c==='Tab'){document.body.classList.add('kbnav');return;}
  if(e.repeat&&c!=='KeyQ'&&c!=='KeyE')return;
  if(c==='Escape'||c==='Backspace'){e.preventDefault();if(this.dlg){this._snd('back');this.dlg.acts.no();return;}if(this.back){this._snd('back');this.back();}return;}
  if(c==='KeyP'&&this.name==='pause'&&!this.dlg){e.preventDefault();Game.resume();return;}
  if((c==='KeyQ'||c==='PageUp')&&this._tabStep(-1)){e.preventDefault();return;}
  if((c==='KeyE'||c==='PageDown')&&this._tabStep(1)){e.preventDefault();return;}
  if(c==='Enter'||c==='Space'||c==='NumpadEnter'){const items=this._items();
   if(a&&a.classList&&a.classList.contains('opt')){e.preventDefault();this._activate(a);return;}
   if(!items.includes(a)&&items[0]){e.preventDefault();document.body.classList.add('kbnav');items[0].focus({preventScroll:true});}}},
 // ---------- navegación: mando (cruceta/palanca, A aceptar, B volver, LB/RB pestañas, Start) ----------
 update(dt){if(!this.scr)return;const gs=navigator.getGamepads?navigator.getGamepads():null;let g=null;if(gs)for(const q of gs)if(q&&q.connected&&q.buttons&&q.buttons.length){g=q;break;}if(!g)return;
  const b=i=>!!(g.buttons[i]&&(g.buttons[i].pressed||g.buttons[i].value>0.5)),ax=g.axes[0]||0,ay=g.axes[1]||0;
  const now=[b(12)||ay<-0.55,b(13)||ay>0.55,b(14)||ax<-0.55,b(15)||ax>0.55,b(0),b(1),b(4),b(5),b(9)],pp=this._pp;this._rep-=dt;
  let d=-1;for(let k=0;k<4;k++)if(now[k]){d=k;break;}
  if(d>=0&&(!pp[d]||this._rep<=0)){this._rep=pp[d]?0.11:0.36;document.body.classList.add('kbnav');const a=document.activeElement,dir=['up','down','left','right'][d];
   if((d===2||d===3)&&a&&a.classList&&a.classList.contains('opt')&&this._items().includes(a)){const o=this._opt(a.dataset.k);if(o)this._optStep(a,o,d===2?-1:1);}else this._nav(dir);}
  const dn=i=>now[i]&&!pp[i];
  if(dn(4)){const a=document.activeElement,items=this._items();if(items.includes(a))this._activate(a);else if(items[0]){items[0].focus({preventScroll:true});document.body.classList.add('kbnav');}}
  else if(dn(5)){if(this.dlg){this._snd('back');this.dlg.acts.no();}else if(this.back){this._snd('back');this.back();}}
  else if(dn(6))this._tabStep(-1);else if(dn(7))this._tabStep(1);
  else if(dn(8)){if(this.name==='pause'&&!this.dlg)Game.resume();else{const a=document.activeElement;if(this._items().includes(a))this._activate(a);}}
  this._pp=now;},
 // ---------- miniaturas de las misiones (canvas, estilo foto de época) ----------
 _hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;},
 _thumb(cv,L){const c=cv.getContext('2d');if(!c)return;const W=cv.width,H=cv.height,E=L.env||{},R=mulberry32(this._hash(L.id||'x')),id=L.id||'';
  const rgb=(v,d)=>{let a;try{a=hex(v==null?d:v);}catch(e){a=hex(d);}if(!a||a.length<3)a=hex(d);return 'rgb('+(a[0]*255|0)+','+(a[1]*255|0)+','+(a[2]*255|0)+')';};
  const night=(E.stars||0)>0.5,snow=!!E.snow||id==='bastogne',sand=id==='beach',hz=H*(0.58+R()*0.06);
  // cielo y suelo
  let g=c.createLinearGradient(0,0,0,hz);g.addColorStop(0,rgb(E.zen,night?'#050b18':'#6f8aa6'));g.addColorStop(1,rgb(E.hor,night?'#1a2742':'#d6cfbd'));c.fillStyle=g;c.fillRect(0,0,W,hz+1);
  if(night){c.fillStyle='rgba(255,255,240,.8)';for(let i=0;i<70;i++){c.fillRect(R()*W,R()*hz*0.85,R()<0.15?1.6:0.9,R()<0.15?1.6:0.9);}c.fillStyle='#e9e6d6';c.beginPath();c.arc(W*0.78,H*0.2,9,0,7);c.fill();}
  else{c.fillStyle='rgba(255,255,255,.18)';for(let i=0;i<6;i++){const x=R()*W,y=R()*hz*0.6,w=40+R()*80;c.beginPath();c.ellipse(x,y,w,6+R()*7,0,0,7);c.fill();}}
  const gc=snow?['#dfe3e6','#c5ccd2']:sand?['#b8a782','#9a8a66']:id==='survival'?['#6d6250','#4f4638']:night?['#1d2419','#11160f']:['#6f7a46','#4f5a30'];
  g=c.createLinearGradient(0,hz,0,H);g.addColorStop(0,gc[0]);g.addColorStop(1,gc[1]);c.fillStyle=g;c.fillRect(0,hz,W,H-hz);
  const sil=night?'#070a10':snow?'#3c4650':'#2b2f22';
  const tree=(x,y,s,col)=>{c.fillStyle=col||sil;c.beginPath();c.moveTo(x,y-34*s);c.lineTo(x+11*s,y-8*s);c.lineTo(x+5*s,y-8*s);c.lineTo(x+14*s,y+4*s);c.lineTo(x-14*s,y+4*s);c.lineTo(x-5*s,y-8*s);c.lineTo(x-11*s,y-8*s);c.closePath();c.fill();c.fillRect(x-1.5*s,y+4*s,3*s,5*s);};
  const house=(x,y,w,h,col,roofH)=>{c.fillStyle=col||sil;c.fillRect(x,y-h,w,h);c.beginPath();c.moveTo(x-3,y-h);c.lineTo(x+w/2,y-h-(roofH||h*0.6));c.lineTo(x+w+3,y-h);c.fill();};
  const hedgehog=(x,y,s)=>{c.strokeStyle=sil;c.lineWidth=2.4*s;c.lineCap='round';c.beginPath();c.moveTo(x-9*s,y);c.lineTo(x+9*s,y-16*s);c.moveTo(x+9*s,y);c.lineTo(x-9*s,y-16*s);c.moveTo(x,y+2*s);c.lineTo(x,y-18*s);c.stroke();};
  const smoke=(x,y,h)=>{for(let i=0;i<9;i++){const k=i/9;c.fillStyle='rgba(60,58,54,'+(0.35*(1-k))+')';c.beginPath();c.arc(x+Math.sin(i*1.3)*8+k*30,y-k*h,7+k*18,0,7);c.fill();}};
  if(id==='beach'){c.fillStyle='#5b6d72';c.fillRect(0,hz,W,(H-hz)*0.35);c.fillStyle='rgba(220,230,230,.35)';for(let i=0;i<5;i++)c.fillRect(0,hz+(H-hz)*(0.08+i*0.06),W,1);
   c.fillStyle='#6d6248';c.beginPath();c.moveTo(W*0.35,hz+1);c.quadraticCurveTo(W*0.6,hz-34,W,hz-40);c.lineTo(W,hz+1);c.fill();c.fillStyle=sil;c.fillRect(W*0.7,hz-46,22,10);
   for(let i=0;i<7;i++)hedgehog(20+i*48+R()*16,hz+(H-hz)*(0.5+R()*0.42),0.8+R()*0.6);smoke(W*0.82,hz-40,70);smoke(W*0.25,hz-2,50);
   c.fillStyle='#2e3436';c.beginPath();c.moveTo(18,hz+12);c.lineTo(78,hz+12);c.lineTo(70,hz+24);c.lineTo(24,hz+24);c.fill();}
  else if(id==='village'){const glow=c.createRadialGradient(W*0.45,hz,4,W*0.45,hz,W*0.5);glow.addColorStop(0,'rgba(255,140,40,.65)');glow.addColorStop(1,'rgba(255,120,30,0)');c.fillStyle=glow;c.fillRect(0,0,W,H);
   house(30,hz+8,50,34);house(92,hz+8,38,46);c.fillStyle=sil;c.fillRect(W*0.47,hz-70,16,80);c.beginPath();c.moveTo(W*0.47-2,hz-70);c.lineTo(W*0.47+8,hz-104);c.lineTo(W*0.47+18,hz-70);c.fill();
   house(W*0.6,hz+8,56,30);house(W*0.82,hz+8,44,40);c.fillStyle='rgba(255,190,90,.9)';for(const [x,y] of [[44,hz-12],[60,hz-12],[104,hz-20],[W*0.64,hz-8],[W*0.86,hz-18]])c.fillRect(x,y,5,6);
   c.strokeStyle='rgba(230,225,210,.7)';c.lineWidth=1;c.beginPath();c.arc(W*0.3,H*0.22,13,Math.PI,0);c.lineTo(W*0.3,H*0.22+26);c.closePath();c.stroke();}
  else if(id==='bocage'){for(let r=0;r<3;r++){const y=hz+(H-hz)*(0.12+r*0.34),col=['#3d4826','#344020','#2a3419'][r];c.fillStyle=col;c.beginPath();c.moveTo(0,y+6);
    for(let x=0;x<=W;x+=14)c.lineTo(x,y-8-R()*10-r*4);c.lineTo(W,y+10);c.lineTo(0,y+10);c.fill();}
   c.fillStyle=sil;c.fillRect(W*0.72,hz-62,14,62);c.beginPath();c.moveTo(W*0.72-2,hz-62);c.lineTo(W*0.72+7,hz-88);c.lineTo(W*0.72+16,hz-62);c.fill();
   c.fillStyle='#262a1e';c.fillRect(W*0.2,H*0.7,64,16);c.fillRect(W*0.2+14,H*0.7-10,30,11);c.fillRect(W*0.2+44,H*0.7-6,34,3);c.beginPath();c.ellipse(W*0.2+32,H*0.7+17,34,6,0,0,7);c.fill();}
  else if(snow){for(let i=0;i<16;i++){const x=R()*W,y=hz+R()*(H-hz)*0.5,s=0.6+R()*0.9;tree(x,y,s,'#2f3a3c');c.fillStyle='rgba(240,244,246,.85)';c.beginPath();c.moveTo(x,y-34*s);c.lineTo(x+6*s,y-20*s);c.lineTo(x-6*s,y-20*s);c.fill();}
   c.fillStyle='rgba(255,255,255,.85)';for(let i=0;i<90;i++)c.fillRect(R()*W,R()*H,1.4,1.4);c.fillStyle='#8b8f8c';c.beginPath();c.ellipse(W*0.5,H*0.86,60,9,0,0,7);c.fill();}
  else if(id==='survival'){const glow=c.createLinearGradient(0,0,0,hz);glow.addColorStop(0,'rgba(120,40,20,0)');glow.addColorStop(1,'rgba(170,70,30,.45)');c.fillStyle=glow;c.fillRect(0,0,W,hz);
   for(let i=0;i<5;i++){const x=10+i*66+R()*20,w=34+R()*26,h=28+R()*44;c.fillStyle=sil;c.beginPath();c.moveTo(x,hz+10);c.lineTo(x,hz-h);c.lineTo(x+w*0.3,hz-h+8+R()*10);c.lineTo(x+w*0.55,hz-h*0.6);c.lineTo(x+w,hz-h*0.8);c.lineTo(x+w,hz+10);c.fill();}
   smoke(W*0.3,hz-30,80);smoke(W*0.75,hz-20,60);}
  else{ // instrucción y campo de pruebas: dianas, tiendas y una casa
   house(W*0.62,hz+6,52,30,'#3a3d2c');for(let i=0;i<3;i++){c.fillStyle='#3f4430';c.beginPath();c.moveTo(20+i*44,hz+6);c.lineTo(40+i*44,hz-20);c.lineTo(60+i*44,hz+6);c.fill();}
   for(let i=0;i<4;i++){const x=W*0.12+i*W*0.2,y=H*0.82-i*6,s=1-i*0.12;c.fillStyle='#5a4630';c.fillRect(x-1.5*s,y-6*s,3*s,16*s);c.fillStyle='#d8cfb4';c.beginPath();c.arc(x,y-14*s,11*s,0,7);c.fill();
    c.strokeStyle='#7c2a22';c.lineWidth=2*s;c.beginPath();c.arc(x,y-14*s,7*s,0,7);c.stroke();c.fillStyle='#7c2a22';c.beginPath();c.arc(x,y-14*s,2.6*s,0,7);c.fill();}
   c.strokeStyle=sil;c.lineWidth=1.5;c.beginPath();c.moveTo(W*0.9,hz+4);c.lineTo(W*0.9,hz-60);c.stroke();c.fillStyle='#8e2f2a';c.fillRect(W*0.9,hz-60,18,11);tree(W*0.48,hz,0.8);}
  // tratamiento de foto: tono cálido, grano y viñeta
  c.globalCompositeOperation='multiply';c.fillStyle=night?'rgba(150,160,190,1)':'rgba(236,214,170,1)';c.fillRect(0,0,W,H);c.globalCompositeOperation='source-over';
  const id2=c.getImageData(0,0,W,H),p=id2.data;for(let i=0;i<p.length;i+=4){const n=(R()-0.5)*22;p[i]+=n;p[i+1]+=n;p[i+2]+=n;}c.putImageData(id2,0,0);
  const v=c.createRadialGradient(W/2,H/2,H*0.35,W/2,H/2,W*0.65);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.55)');c.fillStyle=v;c.fillRect(0,0,W,H);},
 // ---------- mapa militar del informe (canvas): relieve, curvas de nivel, edificios, setos, trincheras, flechas de avance y símbolos ----------
 _map(cv,L){const c=cv.getContext('2d');if(!c)return;const W=cv.width,H=cv.height,R=mulberry32(this._hash((L.id||'')+'map')),ink='#3b3226',red='#a3291f',blue='#244a86';
  c.fillStyle='#e6dcc0';c.fillRect(0,0,W,H);
  const B=World.built&&World.bounds?World.bounds:null;
  // encuadre: escenario (o zona de acción) con el aspecto del lienzo; norte (+Z) arriba, este (-X) a la derecha
  let x0=-60,z0=-60,x1=60,z1=60;if(B){x0=B[0];z0=B[1];x1=B[2];z1=B[3];}
  const pts=[];const st=L.start&&L.start.pos;if(st)pts.push([st[0],st.length===2?st[1]:st[2]]);
  const marks=(L.objectives||[]).map(o=>Array.isArray(o.marker)?[o.marker[0],o.marker.length===2?o.marker[1]:o.marker[2]]:null);for(const m of marks)if(m)pts.push(m);
  const cx=(x0+x1)/2,cz=(z0+z1)/2,span=Math.max((x1-x0)/W,(z1-z0)/H)*1.04,k=1/span;
  const sx=x=>W/2-(x-cx)*k,sy=z=>H/2-(z-cz)*k,wx=px=>cx-(px-W/2)/k,wz=py=>cz-(py-H/2)/k;
  if(B){// relieve: rejilla de alturas, sombreado desde el noroeste y color por superficie
   const n=4,GW=Math.ceil(W/n)+1,GH=Math.ceil(H/n)+1,hs=new Float32Array(GW*GH);let hmin=1e9,hmax=-1e9;
   for(let j=0;j<GH;j++)for(let i=0;i<GW;i++){const h=World.height(wx(i*n),wz(j*n));hs[j*GW+i]=h;if(h<hmin)hmin=h;if(h>hmax)hmax=h;}
   const SC={grass:[188,192,146],dirt:[201,181,140],sand:[226,211,166],snow:[236,238,236],water:[150,178,190],mud:[180,160,120],wood:[188,170,130],stone:[190,186,170],metal:[180,180,170],flesh:[188,192,146]};
   const img=c.createImageData(GW,GH),d=img.data;
   for(let j=0;j<GH;j++)for(let i=0;i<GW;i++){const q=j*GW+i,h=hs[q],hx=hs[j*GW+Math.min(GW-1,i+1)]-hs[j*GW+Math.max(0,i-1)],hz=hs[Math.min(GH-1,j+1)*GW+i]-hs[Math.max(0,j-1)*GW+i];
    let s='grass';try{s=World.surfaceAt(wx(i*n),wz(j*n));}catch(e){}const col=SC[s]||SC.grass,sh=clamp(1+(-hx-hz)*0.9/n*span*0.5,0.72,1.18),hk=0.94+0.1*(h-hmin)/Math.max(1,hmax-hmin);
    const o=q*4;d[o]=clamp(col[0]*sh*hk,0,255);d[o+1]=clamp(col[1]*sh*hk,0,255);d[o+2]=clamp(col[2]*sh*hk,0,255);d[o+3]=255;}
   const tmp=document.createElement('canvas');tmp.width=GW;tmp.height=GH;tmp.getContext('2d').putImageData(img,0,0);c.imageSmoothingEnabled=true;c.drawImage(tmp,0,0,GW*n,GH*n);
   // curvas de nivel cada 2 m (más marcadas cada 10 m)
   c.fillStyle='rgba(120,84,40,.55)';const ci=2;for(let j=0;j<GH-1;j++)for(let i=0;i<GW-1;i++){const a=Math.floor(hs[j*GW+i]/ci),b=Math.floor(hs[j*GW+i+1]/ci),e=Math.floor(hs[(j+1)*GW+i]/ci);
    if(a!==b||a!==e){const major=Math.max(a,b,e)*ci%10===0;c.globalAlpha=major?0.85:0.45;c.fillRect(i*n+1,j*n+1,major?2:1.4,major?2:1.4);}}c.globalAlpha=1;
   // bosques y setos (de los objetos del escenario), trincheras
   const P=(World.def&&World.def.props)||[];
   for(const p of P){if(p.t==='tree'){c.fillStyle='rgba(70,96,52,.55)';c.beginPath();c.arc(sx(p.x),sy(p.z),Math.max(3,2.6*k*(p.s||1)),0,7);c.fill();c.strokeStyle='rgba(50,70,38,.6)';c.lineWidth=1;c.stroke();}}
   for(const p of P)if(p.t==='trench'&&p.pts&&p.pts.length>1){c.strokeStyle=ink;c.lineWidth=2;c.beginPath();for(let q=0;q<p.pts.length-1;q++){const a=p.pts[q],b=p.pts[q+1],len=Math.hypot(b[0]-a[0],b[1]-a[1]),nn=Math.max(2,Math.round(len/2.5));
     for(let s=0;s<=nn;s++){const f=s/nn,x=a[0]+(b[0]-a[0])*f,z=a[1]+(b[1]-a[1])*f,o=(s%2?1:-1)*0.9,nx=-(b[1]-a[1])/len*o,nz=(b[0]-a[0])/len*o;if(s===0&&q===0)c.moveTo(sx(x+nx),sy(z+nz));else c.lineTo(sx(x+nx),sy(z+nz));}}c.stroke();}
   // colisionadores: edificios, muros, sacos y setos vistos desde arriba
   for(const q of World.cols||[]){if(q.dead||q.hx*q.hz<0.12)continue;const ht=q.hy*2,cs=q.c,sn=q.s,cr=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>{const lx=a*q.hx,lz=b*q.hz;return [sx(q.x+cs*lx+sn*lz),sy(q.z-sn*lx+cs*lz)];});
    c.beginPath();cr.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();
    c.fillStyle=q.surf==='grass'?'rgba(52,78,40,.8)':ht>2.4?'rgba(70,62,50,.88)':ht>1?'rgba(96,84,66,.8)':'rgba(130,112,80,.7)';c.fill();if(ht>2.4){c.strokeStyle='rgba(30,26,20,.8)';c.lineWidth=1;c.stroke();}}
  }else{// sin escenario: papel con manchas de relieve
   for(let i=0;i<40;i++){c.fillStyle='rgba(120,140,90,'+(0.05+R()*0.08)+')';c.beginPath();c.arc(R()*W,R()*H,20+R()*90,0,7);c.fill();}}
  // cuadrícula con coordenadas
  c.strokeStyle='rgba(40,50,70,.22)';c.lineWidth=1;c.font='600 12px "Saira Condensed",sans-serif';c.fillStyle='rgba(40,50,70,.6)';
  const gs=W/8;for(let i=1;i<8;i++){c.beginPath();c.moveTo(i*gs,0);c.lineTo(i*gs,H);c.stroke();c.fillText(String.fromCharCode(64+i),i*gs-gs/2-3,14);}
  for(let j=1;j*gs<H;j++){c.beginPath();c.moveTo(0,j*gs);c.lineTo(W,j*gs);c.stroke();c.fillText(String(j),4,j*gs-gs/2+4);}
  // flechas de avance: salida -> objetivos (trazo a mano, azul)
  const route=[];if(st)route.push([sx(pts[0][0]),sy(pts[0][1])]);for(const m of marks)if(m)route.push([sx(m[0]),sy(m[1])]);
  const hint=L.map||{};const en=(hint.enemy||[]).map(p=>[sx(p[0]),sy(p[1])]);
  if(!en.length&&World.def&&World.def.props)for(const p of World.def.props)if(p.t==='bunker'||p.t==='gun'||p.t==='nest'||p.t==='tower'||p.t==='mg')en.push([sx(p.x),sy(p.z)]);
  c.lineCap='round';c.lineJoin='round';
  for(let i=0;i<route.length-1;i++){const a=route[i],b=route[i+1],mx=(a[0]+b[0])/2+(R()-0.5)*40,my=(a[1]+b[1])/2+(R()-0.5)*40;
   c.strokeStyle='rgba(36,74,134,.85)';c.lineWidth=6;c.setLineDash([]);c.beginPath();c.moveTo(a[0],a[1]);c.quadraticCurveTo(mx,my,b[0],b[1]);c.stroke();
   const an=Math.atan2(b[1]-my,b[0]-mx),hl=18;c.fillStyle='rgba(36,74,134,.9)';c.beginPath();c.moveTo(b[0]+Math.cos(an)*4,b[1]+Math.sin(an)*4);c.lineTo(b[0]-Math.cos(an-0.5)*hl,b[1]-Math.sin(an-0.5)*hl);c.lineTo(b[0]-Math.cos(an+0.5)*hl,b[1]-Math.sin(an+0.5)*hl);c.fill();}
  // enemigo: rombo rojo con aspa (símbolo OTAN de unidad hostil)
  for(const p of en){c.save();c.translate(p[0],p[1]);c.fillStyle='rgba(163,41,31,.18)';c.beginPath();c.arc(0,0,26,0,7);c.fill();c.strokeStyle=red;c.lineWidth=2.5;c.fillStyle='rgba(240,200,190,.85)';c.beginPath();c.moveTo(0,-13);c.lineTo(13,0);c.lineTo(0,13);c.lineTo(-13,0);c.closePath();c.fill();c.stroke();
   c.lineWidth=1.8;c.beginPath();c.moveTo(-6,-6);c.lineTo(6,6);c.moveTo(6,-6);c.lineTo(-6,6);c.stroke();c.restore();}
  // objetivos numerados
  marks.forEach((m,i)=>{if(!m)return;const x=sx(m[0]),y=sy(m[1]);c.strokeStyle=red;c.lineWidth=3;c.fillStyle='rgba(250,240,220,.9)';c.beginPath();c.arc(x,y,13,0,7);c.fill();c.stroke();
   c.fillStyle=red;c.font='700 16px "Saira Condensed",sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(String(i+1),x,y+1);});c.textAlign='left';c.textBaseline='alphabetic';
  // salida: rectángulo azul con aspa (infantería amiga)
  if(st){const x=sx(pts[0][0]),y=sy(pts[0][1]);c.fillStyle='rgba(200,215,240,.92)';c.strokeStyle=blue;c.lineWidth=2.5;c.fillRect(x-15,y-10,30,20);c.strokeRect(x-15,y-10,30,20);
   c.lineWidth=1.8;c.beginPath();c.moveTo(x-15,y-10);c.lineTo(x+15,y+10);c.moveTo(x+15,y-10);c.lineTo(x-15,y+10);c.stroke();c.fillStyle=blue;c.font='700 13px "Saira Condensed",sans-serif';c.fillText(t('you').toUpperCase(),x+19,y+5);}
  // rosa de los vientos, escala y cartela
  c.save();c.translate(W-40,46);c.fillStyle=ink;c.beginPath();c.moveTo(0,-22);c.lineTo(7,4);c.lineTo(0,0);c.lineTo(-7,4);c.closePath();c.fill();c.strokeStyle=ink;c.lineWidth=1.5;c.beginPath();c.arc(0,0,15,0,7);c.stroke();
  c.font='700 15px "Saira Condensed",sans-serif';c.textAlign='center';c.fillText('N',0,-26);c.restore();
  const m50=50*k,sl=m50>W*0.3?10*k:m50,lab=m50>W*0.3?'10 m':'50 m';c.fillStyle=ink;c.fillRect(18,H-26,sl,5);c.fillStyle='#e6dcc0';c.fillRect(18+sl/2,H-25,sl/2,3);c.fillStyle=ink;c.font='600 12px "Saira Condensed",sans-serif';c.fillText('0',15,H-32);c.fillText(lab,18+sl-8,H-32);
  c.fillStyle='rgba(230,220,192,.92)';c.fillRect(W-232,H-50,220,38);c.strokeStyle=ink;c.lineWidth=1.2;c.strokeRect(W-232,H-50,220,38);c.fillStyle=ink;c.font='400 15px "Special Elite",monospace';
  c.fillText(t('mapTitle').toUpperCase(),W-224,H-33);c.font='400 12px "Special Elite",monospace';c.fillText((txt(L.place)+(L.date?' · '+L.date:'')).slice(0,34),W-224,H-18);
  // papel: pliegues, manchas y bordes gastados
  c.strokeStyle='rgba(90,70,40,.18)';c.lineWidth=2;c.beginPath();c.moveTo(W/2,0);c.lineTo(W/2,H);c.moveTo(0,H/2);c.lineTo(W,H/2);c.stroke();
  for(let i=0;i<4;i++){const x=R()*W,y=R()*H,r=30+R()*70,gg=c.createRadialGradient(x,y,r*0.6,x,y,r);gg.addColorStop(0,'rgba(150,110,60,0)');gg.addColorStop(0.85,'rgba(150,110,60,.10)');gg.addColorStop(1,'rgba(150,110,60,0)');c.fillStyle=gg;c.fillRect(x-r,y-r,r*2,r*2);}
  const v=c.createRadialGradient(W/2,H/2,Math.min(W,H)*0.45,W/2,H/2,Math.max(W,H)*0.75);v.addColorStop(0,'rgba(80,60,30,0)');v.addColorStop(1,'rgba(80,60,30,.35)');c.fillStyle=v;c.fillRect(0,0,W,H);}
};
