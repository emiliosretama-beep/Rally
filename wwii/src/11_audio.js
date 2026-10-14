// ===== FRENTE 44 · sonido sintetizado (Snd) y voces de la escuadra (Voice) =====
// STUB fase 1: lo sustituye el módulo completo (11_audio.js). Unos pocos sonidos sintetizados (disparo, explosión, paso, interfaz, silbido)
// a los que se asignan todos los nombres de DESIGN §4 (los desconocidos suenan genéricos); 3D simple (panorama y distancia a la cámara).
const SND_MAP={garand:['shot',1,1],kar98:['shot',0.95,1.05],kar98s:['shot',0.95,1.05],thompson:['shot',1.25,0.7],mp40:['shot',1.3,0.65],stg44:['shot',1.15,0.75],bar:['shot',1.05,0.85],
 mg42mount:['shot',1.45,0.6],mg42:['shot',1.45,0.6],colt:['shot',1.4,0.6],bazooka:['boom',1.6,0.6],cannon:['boom',0.8,1],explosion:['boom',1,1],explosion_far:['boom',0.6,0.5],
 ping:['ping',1,0.6],dryfire:['click',1,0.5],whizz:['whizz',1,0.5],crack:['click',2,0.6],grenade_bounce:['click',0.6,0.5],pin:['click',1.4,0.5],knife:['swish',1,0.6],
 hurt:['thud',1,0.8],ui_move:['blip',1,0.25],ui_ok:['blip',1.5,0.3],ui_back:['blip',0.7,0.3],objective:['chime',1,0.5],checkpoint:['chime',1.2,0.4],tank_engine:['hum',1,0.4]};
const Snd={ctx:null,master:null,bus:null,nb:null,vol:{fx:1,music:0.6,voice:1},L:{pos:[0,0,0],yaw:0},live:0,_loops:{},_lid:0,
 init(){if(this.ctx){if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});return;}
  try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;const c=this.ctx=new AC();
   const comp=c.createDynamicsCompressor();comp.threshold.value=-12;comp.ratio.value=5;comp.connect(c.destination);this.master=c.createGain();this.master.connect(comp);this.setVol();
   const b=this.nb=c.createBuffer(1,c.sampleRate*2,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
   if(c.state==='suspended')c.resume().catch(()=>{});}catch(e){this.ctx=null;}},
 setVol(){if(!this.master)return;const S=typeof Settings!=='undefined'?Settings:{};this.vol.fx=S.volFx==null?1:S.volFx;this.vol.music=S.volMusic==null?0.6:S.volMusic;this.vol.voice=S.volVoice==null?1:S.volVoice;
  this.master.gain.setTargetAtTime((S.volMaster==null?0.8:S.volMaster)*0.7,this.ctx.currentTime,0.05);},
 setListener(pos,yaw){V3.copy(pos,this.L.pos);this.L.yaw=yaw;},
 // nombre de DESIGN -> receta; o {pos, vol, rate}
 play(name,o){const c=this.ctx;if(!c||c.state!=='running'||this.live>28)return;o=o||W_NO;let m=SND_MAP[name];
  if(!m){if(name.startsWith('step_'))m=['step',name==='step_wood'||name==='step_metal'?1.6:name==='step_snow'?0.7:1,0.18];else if(name.startsWith('impact_'))m=['click',name==='impact_metal'?2.2:name==='impact_flesh'?0.6:1.2,0.35];
   else if(name.startsWith('reload'))m=['click',1.2,0.4];else m=['click',1,0.3];}
  let vol=(o.vol==null?1:o.vol)*m[2]*this.vol.fx,pan=0;
  if(o.pos){const L=this.L,dx=o.pos[0]-L.pos[0],dy=o.pos[1]-L.pos[1],dz=o.pos[2]-L.pos[2],d=Math.hypot(dx,dy,dz);vol*=1/(1+d/14);if(vol<0.01)return;
   const a=Math.atan2(dx,dz);pan=clamp(Math.sin(L.yaw-a),-1,1)*0.8;}
  const t=c.currentTime,g=c.createGain(),p=c.createStereoPanner?c.createStereoPanner():null,r=(o.rate||1)*m[1]*(0.96+Math.random()*0.08);if(p){p.pan.value=pan;g.connect(p);p.connect(this.master);}else g.connect(this.master);
  const noise=(f0,f1,len,type,q)=>{const s=c.createBufferSource();s.buffer=this.nb;const f=c.createBiquadFilter();f.type=type||'lowpass';f.frequency.setValueAtTime(f0,t);f.frequency.exponentialRampToValueAtTime(Math.max(30,f1),t+len);if(q)f.Q.value=q;s.connect(f);f.connect(g);s.start(t,Math.random()*1.5,len+0.05);return s;};
  const osc=(type,f0,f1,len,k)=>{const s=c.createOscillator(),gg=c.createGain();s.type=type;s.frequency.setValueAtTime(f0,t);s.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+len);gg.gain.setValueAtTime(k,t);gg.gain.exponentialRampToValueAtTime(0.001,t+len);s.connect(gg);gg.connect(g);s.start(t);s.stop(t+len+0.02);return s;};
  let len=0.3,src;
  switch(m[0]){case 'shot':len=0.35/r;g.gain.setValueAtTime(vol*1.1,t);g.gain.exponentialRampToValueAtTime(0.001,t+len);src=noise(5200*r,300,len);osc('sine',160*r,45,len*0.8,0.9);break;
   case 'boom':len=1.6/r;g.gain.setValueAtTime(vol*1.4,t);g.gain.exponentialRampToValueAtTime(0.001,t+len);src=noise(1400*r,90,len);osc('sine',70*r,25,len,1.2);break;
   case 'step':len=0.07;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+len);src=noise(1400*r,500,len,'bandpass',0.8);break;
   case 'click':len=0.05;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+len);src=noise(3500*r,2000,len,'bandpass',1.5);break;
   case 'ping':len=0.5;g.gain.setValueAtTime(vol,t);src=osc('sine',2650,2600,len,0.5);osc('sine',5300,5200,0.2,0.15);break;
   case 'whizz':len=0.28;g.gain.setValueAtTime(0.001,t);g.gain.linearRampToValueAtTime(vol,t+0.08);g.gain.exponentialRampToValueAtTime(0.001,t+len);src=noise(3000,700,len,'bandpass',4);break;
   case 'swish':len=0.18;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+len);src=noise(2500,6000,len,'bandpass',2);break;
   case 'thud':len=0.25;g.gain.setValueAtTime(vol,t);src=osc('sine',110,40,len,1);break;
   case 'blip':len=0.08;g.gain.setValueAtTime(vol,t);src=osc('square',660*r,660*r,len,0.3);break;
   case 'chime':len=0.7;g.gain.setValueAtTime(vol,t);src=osc('triangle',523*r,523*r,0.35,0.5);const s2=c.createOscillator(),g2=c.createGain();s2.type='triangle';s2.frequency.value=784*r;g2.gain.setValueAtTime(0.001,t);g2.gain.setValueAtTime(0.45,t+0.15);g2.gain.exponentialRampToValueAtTime(0.001,t+0.7);s2.connect(g2);g2.connect(g);s2.start(t);s2.stop(t+0.72);break;
   default:len=0.3;g.gain.setValueAtTime(vol*0.5,t);src=osc('sawtooth',90,85,len,0.3);}
  this.live++;setTimeout(()=>{this.live--;try{g.disconnect();if(p)p.disconnect();}catch(e){}},len*1000+150);},
 // bucles (ambiente, motores): devuelve un id para Snd.stop
 loop(name,o){const c=this.ctx;if(!c)return 0;o=o||W_NO;const id=++this._lid,g=c.createGain();g.gain.value=(o.vol==null?0.15:o.vol)*this.vol.fx;g.connect(this.master);
  const s=c.createBufferSource();s.buffer=this.nb;s.loop=true;const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=name==='tank_engine'?180:name.startsWith('music')?0:500;
  if(name.startsWith('music')){g.gain.value=0;}s.connect(f);f.connect(g);s.start();this._loops[id]={s,g};return id;},
 stop(id){const L=this._loops[id];if(!L)return;try{L.s.stop();L.g.disconnect();}catch(e){}delete this._loops[id];}
};
// el sonido escucha al Bus
Bus.on('shot',d=>{const me=d.by===Player;Snd.play(d.weapon,{pos:me?null:d.pos,vol:(d.loud||1)*(me?0.8:1)});});
Bus.on('explosion',d=>{const far=V3.dist(d.pos,Snd.L.pos)>60;Snd.play(far?'explosion_far':'explosion',{pos:d.pos});});
Bus.on('impact',d=>{if(Math.random()<0.6)Snd.play('impact_'+d.surface,{pos:d.pos,vol:0.6});});
Bus.on('step',d=>{if(d.by===Player)Snd.play('step_'+(d.surface||'dirt'),{vol:d.run?0.9:d.crouch?0.35:0.6});});
Bus.on('hit',d=>{if(d.by===Player)Snd.play('impact_flesh',{vol:d.kill?1.2:0.7});});
for(const [ev,nm] of [['playerHurt','hurt'],['objective','objective'],['checkpoint','checkpoint'],['whizz','whizz'],['ping','ping'],['dryfire','dryfire'],['pin','pin'],['grenadeBounce','grenade_bounce'],['melee','knife'],['reload','reload_rifle']])
 Bus.on(ev,d=>{if(ev==='reload'&&d.by!==Player)return;Snd.play(nm,{pos:d&&d.pos&&ev!=='ping'?d.pos:null});});
// frases de la escuadra (STUB: sin voz sintetizada; sólo el subtítulo por el Bus)
const VOICE_LINES={grenade:{es:'¡Granada!',en:'Grenade!',de:'Granate!'},reload:{es:'¡Recargando!',en:'Reloading!',de:'Nachladen!'},contact:{es:'¡Contacto al frente!',en:'Contact front!',de:'Feindkontakt!'},
 move:{es:'¡Adelante, adelante!',en:'Move, move!',de:'Vorwärts!'},clear:{es:'¡Despejado!',en:'Clear!',de:'Alles klar!'},cover:{es:'¡A cubierto!',en:'Take cover!',de:'In Deckung!'},
 good:{es:'Buen trabajo, soldado.',en:'Good work, soldier.',de:'Gut gemacht.'},follow:{es:'¡Seguidme!',en:'Follow me!',de:'Mir nach!'}};
const Voice={say(who,key,text){const L=VOICE_LINES[key],axis=who==='axis'||who==='german';const tx=text?txt(text):L?(axis?L.de:txt(L)):key;Bus.emit('say',{who:axis?null:who,key,text:tx});}};
