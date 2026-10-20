// ===== FRENTE 44 · sonido sintetizado (Snd) y voces de la escuadra (Voice) =====
// Todo sale de Web Audio, sin archivos. Cada sonido: fuentes (ruido/osciladores) → filtros → envolvente → ganancia de la voz → [paso bajo de
// distancia/oclusión] → panorama → bus. Buses: fx y amb (pasan por el filtro de «sordera» tras una explosión o con poca vida), ui y música
// (no); todos → compresor → recorte suave → master. Reverberación por convolución con respuestas generadas según el sitio (campo abierto,
// pueblo, interior, bosque, playa). 3D: panorama + atenuación por tipo + absorción del aire + retraso por la velocidad del sonido + oclusión
// barata (World.los con caché por actor y presupuesto por fotograma). Límite de voces por tipo. Snd escucha al Bus y lleva solo el ambiente,
// la música, los carros y el latido: su bucle lo mueve Snd.setListener (Game.render lo llama en cada fotograma). Sin AudioContext (pruebas
// sin cabeza) todo es inocuo. Voice: frases (LINES de 21_levels.js) y gritos de combate (CALLOUTS) con SpeechSynthesis y subtítulos ('say').
const SND_NO={};
const sndMidi=m=>440*Math.pow(2,(m-69)/12);
// ---------- búferes compartidos (un AudioBuffer vale para cualquier contexto; se guardan por frecuencia de muestreo) ----------
const SND_BUF={};
function sndBufs(c){const sr=c.sampleRate;if(SND_BUF[sr])return SND_BUF[sr];const R=Math.random;
 const mk=(len,fn)=>{const b=c.createBuffer(1,Math.floor(sr*len),sr);fn(b.getChannelData(0),sr);return b;};
 // chasquidos sueltos (grava, astillas, fuego): n golpes de largo L con caída exponencial
 const clicks=(d,n,amp,lmax)=>{for(let k=0;k<n;k++){const p=Math.floor(R()*(d.length-lmax-2)),a=amp(),L=4+Math.floor(R()*lmax);for(let j=0;j<L;j++)d[p+j]+=(R()*2-1)*a*Math.exp(-j/(L*0.3));}};
 return SND_BUF[sr]={
  w:mk(2,d=>{for(let i=0;i<d.length;i++)d[i]=R()*2-1;}),                                                   // blanco
  p:mk(2,d=>{let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;for(let i=0;i<d.length;i++){const w=R()*2-1;b0=0.99886*b0+w*0.0555179;b1=0.99332*b1+w*0.0750759;
   b2=0.969*b2+w*0.153852;b3=0.8665*b3+w*0.3104856;b4=0.55*b4+w*0.5329522;b5=-0.7616*b5-w*0.016898;d[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11;b6=w*0.115926;}}), // rosa
  b:mk(3,d=>{let y=0;for(let i=0;i<d.length;i++){y=(y+0.02*(R()*2-1))/1.02;d[i]=y*3.5;}}),                  // marrón (grave)
  g:mk(2,d=>clicks(d,1100,()=>0.25+R()*0.75,50)),                                                          // grava
  c:mk(3,d=>clicks(d,260,()=>R()<0.15?1:0.2+R()*0.4,R()<0.2?200:30)),                                      // crepitar (fuego, tierra que cae)
  // grillos: chirridos de 3-4 pulsos a ~4.5 kHz cada medio segundo
  k:mk(4,(d,sr)=>{let t=0.1;while(t<3.8){const f=4300+R()*500,np=3+(R()*2|0),a=0.3+R()*0.5,L=Math.floor(0.016*sr);
   for(let p=0;p<np;p++){const s0=Math.floor((t+p*0.028)*sr);for(let j=0;j<L&&s0+j<d.length;j++)d[s0+j]+=Math.sin(2*Math.PI*f*j/sr)*Math.sin(Math.PI*j/L)*a;}t+=0.45+R()*0.35;}})};}
// curvas de saturación (tanh) y recorte suave final (lineal hasta 0.7, nunca pasa de ~0.92)
const SND_SAT={};
function sndSatCurve(k){if(SND_SAT[k])return SND_SAT[k];const n=1024,cv=new Float32Array(n),th=Math.tanh(k);for(let i=0;i<n;i++){const x=i/(n-1)*2-1;cv[i]=Math.tanh(k*x)/th;}return SND_SAT[k]=cv;}
const SND_CLIP=(()=>{const n=2048,cv=new Float32Array(n);for(let i=0;i<n;i++){const x=i/(n-1)*2-1,a=Math.abs(x);cv[i]=Math.sign(x)*(a<0.7?a:0.7+0.28*Math.tanh((a-0.7)/0.28));}return cv;})();
// panorama (StereoPanner o, en Safari antiguo, Panner en equalpower)
function sndPan(c,v){if(c.createStereoPanner){const p=c.createStereoPanner();p.pan.value=v;return p;}const p=c.createPanner();p.panningModel='equalpower';sndPanSet(p,v,0);return p;}
function sndPanSet(p,v,t){if(p.pan){if(t)p.pan.setTargetAtTime(v,t,0.08);else p.pan.value=v;}else if(p.positionX){p.positionX.value=v;p.positionZ.value=1-Math.abs(v);}else if(p.setPosition)p.setPosition(v,0,1-Math.abs(v));}

// ---------- kit de síntesis para un contexto (real o sin conexión) ----------
function SndKit(c){const B=sndBufs(c),K={c,B};
 K.g=v=>{const g=c.createGain();g.gain.value=v;return g;};
 K.f=(type,f,q)=>{const x=c.createBiquadFilter();x.type=type;x.frequency.value=f;x.Q.value=q==null?0.7:q;return x;};
 K.sat=(k,out)=>{const w=c.createWaveShaper();w.curve=sndSatCurve(k);if(out)w.connect(out);return w;};
 // envolvente: sube a v en a s y cae exponencialmente en d s
 K.env=(p,t,a,v,d)=>{a=Math.max(a,0.0005);p.setValueAtTime(0.0001,t);p.exponentialRampToValueAtTime(Math.max(v,0.0002),t+a);p.exponentialRampToValueAtTime(0.0001,t+a+d);};
 // ráfaga de ruido filtrado {b búfer, ft tipo, f, f1 barrido (en fd s), q, a ataque, v pico, d caída, r velocidad, f2/ft2 segundo filtro}
 K.nz=(out,t,o)=>{const s=c.createBufferSource(),b=B[o.b||'w'],a=o.a||0.001,len=a+o.d,f=c.createBiquadFilter();s.buffer=b;if(o.r)s.playbackRate.value=o.r;
  f.type=o.ft||'bandpass';f.Q.value=o.q==null?0.8:o.q;f.frequency.setValueAtTime(o.f,t);if(o.f1)f.frequency.exponentialRampToValueAtTime(o.f1,t+(o.fd||len));let n=f;
  if(o.f2){const f2=c.createBiquadFilter();f2.type=o.ft2||'highpass';f2.frequency.value=o.f2;f2.Q.value=0.7;f.connect(f2);n=f2;}
  const g=c.createGain();K.env(g.gain,t,a,o.v,o.d);s.connect(f);n.connect(g);g.connect(out);
  s.start(t,Math.random()*Math.max(0,b.duration-len*(o.r||1)-0.05));s.stop(t+len+0.03);return len;};
 // oscilador con barrido {w forma, f, f1, fd, a, v, d}
 K.os=(out,t,o)=>{const s=c.createOscillator(),a=o.a||0.002,g=c.createGain();s.type=o.w||'sine';s.frequency.setValueAtTime(o.f,t);
  if(o.f1)s.frequency.exponentialRampToValueAtTime(o.f1,t+(o.fd||o.d));K.env(g.gain,t,a,o.v,o.d);s.connect(g);g.connect(out);s.start(t);s.stop(t+a+o.d+0.03);return a+o.d;};
 // metal/campana: parciales inarmónicos ps=[razón, nivel, ...] (los agudos se apagan antes)
 K.ring=(out,t,f,ps,v,d)=>{for(let i=0;i<ps.length;i+=2)K.os(out,t,{f:f*ps[i],a:0.0008,v:v*ps[i+1],d:d/(1+i*0.25)});return d;};
 return K;}

// ---------- disparos ----------
// f cuerpo resonante (Hz) · q · d caída del cuerpo (s) · lo golpe grave (Hz) · lk su nivel · ck chasquido inicial · tl cola · m mecánica · sup supersónica · v volumen
const SND_GUN={
 garand:{f:980,q:1.2,d:0.1,lo:150,lk:0.9,ck:0.9,tl:1,m:'semi',sup:1,v:1},
 kar98:{f:1080,q:1.3,d:0.12,lo:140,lk:1,ck:1,tl:1.15,m:'bolt',sup:1,v:1.05},
 thompson:{f:620,q:0.9,d:0.065,lo:115,lk:0.85,ck:0.45,tl:0.55,m:'auto',sup:0,v:0.85},
 mp40:{f:780,q:1.1,d:0.055,lo:130,lk:0.65,ck:0.5,tl:0.5,m:'auto',sup:0,v:0.8},
 stg44:{f:900,q:1.1,d:0.065,lo:140,lk:0.7,ck:0.75,tl:0.65,m:'auto',sup:1,v:0.88},
 bar:{f:840,q:1,d:0.085,lo:125,lk:0.95,ck:0.85,tl:0.85,m:'auto',sup:1,v:1},
 colt:{f:720,q:0.9,d:0.06,lo:165,lk:0.75,ck:0.55,tl:0.5,m:'pistol',sup:0,v:0.82},
 mg42:{f:1180,q:1.4,d:0.04,lo:155,lk:0.6,ck:0.85,tl:0.45,m:'mg',sup:1,v:0.92}};
SND_GUN.kar98s=SND_GUN.kar98;SND_GUN.mg42mount=SND_GUN.mg42;
// capas: frente de onda (chasquido), cuerpo resonante y ruido ancho saturados, golpe grave, cola que retumba y mecánica del arma (sólo el jugador).
// p.far 0..1: de lejos se pierden los agudos y el chasquido y crece la cola.
function sndShot(K,out,t,p,G){const r=(p.rate||1)*(0.96+Math.random()*0.08),far=p.far||0,nr=1-far,me=p.me,v=G.v;
 const sg=K.g(0.8);sg.connect(out);const ws=K.sat(1.8,sg);
 if(nr>0.05)K.nz(out,t,{ft:'highpass',f:2200*r,q:0.6,a:0.0003,v:(me?0.85:0.6)*G.ck*nr*v,d:0.01+0.006*G.ck});
 K.nz(ws,t,{f:G.f*r*(1-far*0.5),f1:G.f*r*0.45,q:G.q,a:0.0008,v:0.9*v,d:G.d*(1+far*1.8)});
 K.nz(ws,t,{b:'p',ft:'lowpass',f:(5600-far*4600)*r,f1:500,q:0.5,a:0.0008,v:0.75*v*(me?1:0.8),d:G.d*1.5*(1+far*1.5)});
 K.os(ws,t,{f:G.lo*r,f1:36,fd:0.14,a:0.0015,v:G.lk*v*(me?0.75:0.55),d:0.14+far*0.25});
 K.nz(out,t+0.008,{b:'b',ft:'lowpass',f:1100-far*700,f1:140,q:0.5,a:0.02+far*0.06,v:0.32*v*G.tl*(0.7+far*0.6),d:0.3*G.tl+far*0.9});
 if(me){if(G.sup)K.nz(out,t+0.002,{f:4200,q:1.2,a:0.0004,v:0.25*v,d:0.03});
  const m=G.m;if(m==='semi'){K.nz(out,t+0.035,{f:2400,q:3,a:0.0005,v:0.18,d:0.04});K.nz(out,t+0.06,{f:1500,q:4,a:0.0005,v:0.15,d:0.05});}
  else if(m==='auto'||m==='mg')K.nz(out,t+0.02,{f:1800*r,q:3,a:0.0005,v:0.12,d:0.035});
  else if(m==='pistol')K.nz(out,t+0.03,{f:2900,q:4,a:0.0005,v:0.16,d:0.04});}
 return 0.35+G.tl*0.35+far*1.2;}
// bazuca: golpe de salida y silbido del cohete que se aleja
function sndBazooka(K,out,t,p){const nr=1-(p.far||0);
 K.nz(out,t,{b:'b',ft:'lowpass',f:900,f1:120,q:0.6,a:0.002,v:0.9,d:0.4+(p.far||0)*0.5});K.os(out,t,{f:90,f1:40,a:0.002,v:0.6*nr+0.2,d:0.25});
 K.nz(out,t+0.01,{f:500,f1:2600,fd:0.35,q:1.2,a:0.03,v:0.55*nr+0.1,d:0.7});K.nz(out,t+0.02,{b:'p',ft:'highpass',f:1500,q:0.5,a:0.05,v:0.3*nr+0.02,d:0.9});return 1.4;}
// cañón de carro: estampido enorme con retumbo largo
function sndCannon(K,out,t,p){const far=p.far||0,nr=1-far,ws=K.sat(2.5,out);
 if(nr>0.1)K.nz(out,t,{ft:'highpass',f:1500,a:0.0004,v:0.7*nr,d:0.025});
 K.nz(ws,t,{b:'b',ft:'lowpass',f:1800-far*1400,f1:90,fd:0.8,q:0.7,a:0.002,v:1.1,d:0.9+far*0.8});K.os(ws,t,{f:70,f1:28,fd:0.6,a:0.003,v:0.9,d:0.8});
 K.nz(out,t+0.03,{b:'b',ft:'lowpass',f:380,f1:70,q:0.5,a:0.08,v:0.5,d:2.2+far*1.2});return 3.2+far;}
// explosión: chasquido, bola de ruido grave que se cierra, subgrave saturado, escombros (grava) y tierra que cae; de lejos sólo el retumbo
function sndBoom(K,out,t,p){const far=p.far||0,nr=1-far,s=clamp(p.size||1,0.5,2),ws=K.sat(3,out);
 if(nr>0.1)K.nz(out,t,{ft:'highpass',f:1200,a:0.0005,v:0.9*nr,d:0.03});
 K.nz(ws,t,{b:'b',ft:'lowpass',f:2400*(1-far*0.8),f1:120,fd:1.2,q:0.7,a:0.004,v:0.8,d:1.4*s+far*1.2});
 K.nz(ws,t,{ft:'lowpass',f:3000*(1-far*0.85)+200,f1:200,fd:0.6,a:0.003,v:0.45*nr+0.08,d:0.5+far*0.6});
 K.os(ws,t,{f:62,f1:24,fd:0.9,a:0.006,v:0.8*(0.6+0.4*nr),d:1+far*0.6});
 if(nr>0.2){K.nz(out,t+0.12,{b:'g',f:1800,q:0.6,a:0.25,v:0.5*nr,d:1.6*s,r:0.8+Math.random()*0.4});K.nz(out,t+0.5,{b:'c',ft:'highpass',f:2500,a:0.3,v:0.25*nr,d:1.4});}
 K.nz(out,t+0.05,{b:'b',ft:'lowpass',f:250,f1:60,a:0.15,v:0.6,d:2.5+far*1.5});return 3+far*1.5;}

// ---------- impactos de bala por superficie ----------
function sndRico(K,o,t){const f=2400+Math.random()*1800;K.os(o,t,{f,f1:f*0.55,a:0.01,v:0.1,d:0.4});K.nz(o,t,{f:f*0.9,f1:f*0.5,q:8,a:0.01,v:0.25,d:0.35});}
const SND_IMP={
 dirt(K,o,t){K.nz(o,t,{b:'b',ft:'lowpass',f:700,f1:150,q:0.6,a:0.001,v:0.7,d:0.09});K.nz(o,t,{b:'g',f:1600,q:0.6,a:0.002,v:0.45,d:0.16});return 0.2;},
 grass(K,o,t){K.nz(o,t,{b:'b',ft:'lowpass',f:500,f1:140,a:0.001,v:0.5,d:0.08});K.nz(o,t,{b:'p',f:2400,q:0.7,a:0.004,v:0.25,d:0.12});return 0.16;},
 sand(K,o,t){K.nz(o,t,{b:'p',f:1800,f1:900,q:0.6,a:0.003,v:0.4,d:0.2});K.nz(o,t,{b:'b',ft:'lowpass',f:400,a:0.001,v:0.45,d:0.07});return 0.25;},
 snow(K,o,t){K.nz(o,t,{b:'b',ft:'lowpass',f:450,f1:120,a:0.002,v:0.5,d:0.09});K.nz(o,t,{b:'g',ft:'lowpass',f:2200,q:0.5,a:0.004,v:0.22,d:0.1});return 0.15;},
 wood(K,o,t){K.nz(o,t,{ft:'highpass',f:2500,a:0.0004,v:0.45,d:0.012});K.nz(o,t,{f:520+Math.random()*200,q:5,a:0.0008,v:0.9,d:0.08});K.nz(o,t,{f:190,q:3,a:0.001,v:0.6,d:0.1});
  K.nz(o,t+0.01,{b:'c',ft:'highpass',f:1800,a:0.01,v:0.35,d:0.18});return 0.25;},
 metal(K,o,t){K.nz(o,t,{ft:'highpass',f:3000,a:0.0003,v:0.6,d:0.01});K.ring(o,t,1850+Math.random()*900,[1,0.5,2.32,0.3,3.71,0.2,5.1,0.12],0.5,0.35);if(Math.random()<0.35)sndRico(K,o,t+0.02);return 0.5;},
 stone(K,o,t){K.nz(o,t,{ft:'highpass',f:2800,a:0.0003,v:0.8,d:0.014});K.nz(o,t,{f:1400,q:1.5,a:0.0008,v:0.5,d:0.05});K.nz(o,t+0.004,{b:'g',ft:'highpass',f:2500,a:0.003,v:0.4,d:0.2});
  if(Math.random()<0.2)sndRico(K,o,t+0.02);return 0.3;},
 flesh(K,o,t){K.nz(o,t,{b:'b',ft:'lowpass',f:380,f1:120,q:0.8,a:0.002,v:0.9,d:0.1});K.os(o,t,{f:110,f1:60,a:0.002,v:0.35,d:0.08});K.nz(o,t,{b:'p',f:900,q:1,a:0.003,v:0.18,d:0.06});return 0.15;},
 water(K,o,t){K.nz(o,t,{b:'p',f:700,f1:2600,fd:0.12,q:1.2,a:0.004,v:0.5,d:0.22});for(let i=0;i<3;i++)K.os(o,t+0.04+i*0.04*Math.random(),{f:500+Math.random()*700,f1:1400+Math.random()*900,a:0.003,v:0.08,d:0.04});return 0.3;}};
// ---------- pasos por superficie (k: agachado 0.35, andar 0.6, correr 1, caer 1.5) ----------
const SND_STEP={
 dirt(K,o,t,k){K.nz(o,t,{b:'b',ft:'lowpass',f:320+k*120,a:0.004,v:0.55*k,d:0.07});K.nz(o,t+0.008,{b:'g',f:1300+k*400,q:0.7,a:0.006,v:0.35*k,d:0.09});return 0.12;},
 grass(K,o,t,k){K.nz(o,t,{b:'b',ft:'lowpass',f:260,a:0.005,v:0.4*k,d:0.06});K.nz(o,t,{b:'p',f:2600,q:0.6,a:0.02,v:0.22*k,d:0.12});return 0.15;},
 sand(K,o,t,k){K.nz(o,t,{b:'p',f:1500,q:0.5,a:0.015,v:0.35*k,d:0.13});K.nz(o,t,{b:'b',ft:'lowpass',f:250,a:0.005,v:0.35*k,d:0.06});return 0.16;},
 snow(K,o,t,k){K.nz(o,t,{b:'g',f:1900,q:0.5,a:0.02,v:0.55*k,d:0.16,r:0.7});K.nz(o,t,{b:'b',ft:'lowpass',f:240,a:0.008,v:0.35*k,d:0.08});return 0.2;},
 wood(K,o,t,k){K.nz(o,t,{f:210,q:2.5,a:0.002,v:0.7*k,d:0.07});K.nz(o,t,{f:620,q:3,a:0.002,v:0.3*k,d:0.05});K.nz(o,t+0.004,{ft:'highpass',f:2500,a:0.001,v:0.12*k,d:0.02});return 0.12;},
 metal(K,o,t,k){K.nz(o,t,{b:'b',ft:'lowpass',f:300,a:0.003,v:0.4*k,d:0.05});K.ring(o,t,520+Math.random()*80,[1,0.4,2.7,0.25,4.2,0.15],0.35*k,0.18);return 0.2;},
 stone(K,o,t,k){K.nz(o,t,{ft:'highpass',f:2200,a:0.0008,v:0.22*k,d:0.018});K.nz(o,t,{b:'b',ft:'lowpass',f:380,a:0.003,v:0.45*k,d:0.05});K.nz(o,t+0.01,{b:'g',f:3000,q:0.8,a:0.004,v:0.12*k,d:0.05});return 0.1;},
 water(K,o,t,k){K.nz(o,t,{b:'p',f:600,f1:1800,fd:0.15,q:0.9,a:0.02,v:0.5*k,d:0.22});K.nz(o,t+0.05,{b:'c',ft:'highpass',f:1500,a:0.02,v:0.2*k,d:0.2});return 0.3;}};
SND_STEP.flesh=SND_STEP.dirt;
// ---------- recarga: piezas (cl = clase del arma: rifle, bolt, smg, pistol, mg, launcher) ----------
function sndClick(K,o,t,f,v){K.nz(o,t,{ft:'highpass',f:f*1.6,a:0.0003,v:v*0.6,d:0.006});K.nz(o,t,{f,q:5,a:0.0004,v,d:0.035});}
function sndSlide(K,o,t,f0,f1,v,d){K.nz(o,t,{f:f0,f1,q:2.5,a:d*0.4,v,d:d*0.6});}
const SND_RL={
 out(K,o,t,cl){sndClick(K,o,t,cl==='pistol'?3400:2600,0.35);sndSlide(K,o,t+0.02,1800,900,0.25,0.12);if(cl!=='pistol')K.nz(o,t+0.05,{b:'b',ft:'lowpass',f:500,a:0.002,v:0.15,d:0.06});return 0.25;},
 in(K,o,t){sndSlide(K,o,t,900,2000,0.22,0.08);sndClick(K,o,t+0.08,1900,0.6);K.os(o,t+0.08,{f:190,f1:110,a:0.001,v:0.35,d:0.06});return 0.2;},
 bolt(K,o,t){sndClick(K,o,t,2900,0.4);sndSlide(K,o,t+0.06,1300,2600,0.3,0.14);sndSlide(K,o,t+0.26,2600,1300,0.3,0.1);sndClick(K,o,t+0.36,2200,0.55);K.os(o,t+0.36,{f:240,f1:150,a:0.001,v:0.2,d:0.05});return 0.45;},
 clip(K,o,t){sndSlide(K,o,t,1500,3200,0.3,0.1);sndClick(K,o,t+0.1,3600,0.3);sndClick(K,o,t+0.2,2100,0.75);K.ring(o,t+0.2,1400,[1,0.3,2.6,0.2],0.2,0.15);K.os(o,t+0.2,{f:200,f1:120,a:0.001,v:0.3,d:0.06});return 0.4;},
 charge(K,o,t){sndSlide(K,o,t,1100,2400,0.3,0.12);sndClick(K,o,t+0.12,2500,0.4);sndClick(K,o,t+0.22,1800,0.7);K.os(o,t+0.22,{f:170,f1:100,a:0.001,v:0.3,d:0.07});return 0.35;}};
// secuencia de recarga por clase si el módulo de armas no emite 'reloadStep' ([paso, fracción del tiempo de recarga])
const SND_RSEQ={rifle:[['clip',0.45]],bolt:[['bolt',0.08],['clip',0.4],['in',0.82]],smg:[['out',0.15],['in',0.55],['charge',0.82]],pistol:[['out',0.12],['in',0.5],['charge',0.8]],
 mg:[['out',0.1],['in',0.5],['charge',0.85]],launcher:[['in',0.6]]};
function sndCls(w){const d=typeof WEAPONS!=='undefined'&&WEAPONS[w];if(!d)return 'rifle';if(d.mode==='bolt'||d.cls==='sniper')return 'bolt';return d.cls==='lmg'?'smg':d.cls==='mg'?'mg':d.cls||'rifle';}
// ---------- voz sintética sin palabras: gruñido (sierra con caída de tono por dos formantes) + aliento ----------
const SND_FMT=[[640,1190],[780,1300],[500,900],[560,1700]];
function sndGrunt(K,o,t,p){const c=K.c,F=SND_FMT[(Math.random()*4)|0],f0=(p.f0||120)*(0.9+Math.random()*0.2),d=(p.gd||0.24)*(0.85+Math.random()*0.3),v=p.gv||0.6;
 const s=c.createOscillator(),g=c.createGain(),f1=K.f('bandpass',F[0],5),f2=K.f('bandpass',F[1],7),g2=K.g(0.6);s.type='sawtooth';
 s.frequency.setValueAtTime(f0*1.15,t);s.frequency.exponentialRampToValueAtTime(f0*0.72,t+d);K.env(g.gain,t,0.025,v,d);
 s.connect(f1);s.connect(f2);f2.connect(g2);f1.connect(g);g2.connect(g);g.connect(o);s.start(t);s.stop(t+d+0.06);
 K.nz(o,t,{b:'p',f:1300,q:0.8,a:0.02,v:v*0.25,d:d*0.9});return d+0.1;}
// ---------- música: instrumentos ----------
function sndBrass(K,o,t,f,d,v,br){const c=K.c,a=c.createOscillator(),b=c.createOscillator(),lf=c.createOscillator(),lg=c.createGain(),lp=c.createBiquadFilter(),g=c.createGain();
 a.type=b.type='sawtooth';a.frequency.value=f;b.frequency.value=f*1.004;lf.frequency.value=5;lg.gain.setValueAtTime(0,t);lg.gain.linearRampToValueAtTime(f*0.007,t+0.5);
 lf.connect(lg);lg.connect(a.frequency);lg.connect(b.frequency);br=br||3;lp.type='lowpass';lp.Q.value=0.9;
 lp.frequency.setValueAtTime(f*1.2,t);lp.frequency.linearRampToValueAtTime(f*br,t+0.09);lp.frequency.setTargetAtTime(f*br*0.6,t+0.12,0.3);
 g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(v,t+0.06);g.gain.setTargetAtTime(v*0.7,t+0.08,0.25);g.gain.setTargetAtTime(0.0001,t+d,0.12);
 a.connect(lp);b.connect(lp);lp.connect(g);g.connect(o);a.start(t);b.start(t);lf.start(t);const e=t+d+0.8;a.stop(e);b.stop(e);lf.stop(e);return d+0.8;}
function sndPad(K,o,t,f,d,v,cut){const c=K.c,lp=K.f('lowpass',cut||1000,0.4),g=c.createGain();
 g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+Math.min(1.2,d*0.4));g.gain.setValueAtTime(v,t+d);g.gain.setTargetAtTime(0,t+d,0.5);
 for(const k of [0.997,1.003]){const s=c.createOscillator();s.type='sawtooth';s.frequency.value=f*k;s.connect(lp);s.start(t);s.stop(t+d+3);}lp.connect(g);g.connect(o);return d+3;}
function sndTimp(K,o,t,f,v){K.os(o,t,{f:f*1.02,f1:f*0.98,fd:0.3,a:0.004,v,d:1.4});K.os(o,t,{w:'triangle',f:f*1.5,a:0.004,v:v*0.25,d:0.5});K.nz(o,t,{b:'b',ft:'lowpass',f:500,a:0.002,v:v*0.6,d:0.15});return 1.5;}
function sndSnare(K,o,t,v){K.nz(o,t,{f:2300,q:0.7,a:0.001,v,d:0.12});K.os(o,t,{w:'triangle',f:200,f1:160,a:0.001,v:v*0.4,d:0.06});}
function sndStr(K,o,t,f,d,v){const c=K.c,s=c.createOscillator(),lp=K.f('lowpass',f*3+200,1),g=c.createGain();s.type='sawtooth';s.frequency.value=f;K.env(g.gain,t,0.015,v,d);
 s.connect(lp);lp.connect(g);g.connect(o);s.start(t);s.stop(t+d+0.05);}
// ---------- tabla de sonidos con nombre: {c: categoría, f(K, salida, t, p) -> duración} ----------
const SND_R={};
for(const k in SND_GUN)SND_R[k]={c:'gun',f:(K,o,t,p)=>sndShot(K,o,t,p,SND_GUN[k])};
SND_R.bazooka={c:'gun',f:sndBazooka};SND_R.cannon={c:'boom',f:sndCannon};SND_R.explosion={c:'boom',f:sndBoom};
SND_R.explosion_far={c:'boom',f:(K,o,t,p)=>{p.far=Math.max(0.75,p.far||0);return sndBoom(K,o,t,p);}};
const SND_IMPN={},SND_STEPN={};
for(const s in SND_IMP){SND_IMPN[s]='impact_'+s;SND_R['impact_'+s]={c:'imp',f:(K,o,t)=>SND_IMP[s](K,o,t)};}
for(const s in SND_STEP){SND_STEPN[s]='step_'+s;SND_R['step_'+s]={c:'step',f:(K,o,t,p)=>SND_STEP[s](K,o,t,p.k)};}
for(const s in SND_RL)SND_R['reload_'+s]={c:'fol',f:(K,o,t,p)=>SND_RL[s](K,o,t,p.cl)};
SND_R.reload_rifle=SND_R.reload_clip;
SND_R.gear={c:'step',f:(K,o,t)=>{K.nz(o,t+0.02,{b:'c',f:3500,q:1.5,a:0.01,v:0.14,d:0.12});K.nz(o,t,{b:'p',f:1100,q:0.7,a:0.02,v:0.08,d:0.1});return 0.18;}};
SND_R.ping={c:'fol',f:(K,o,t)=>{const f=2650*(0.97+Math.random()*0.06);K.nz(o,t,{ft:'highpass',f:4000,a:0.0003,v:0.3,d:0.008});K.ring(o,t,f,[1,0.42,1.98,0.16,2.94,0.1,4.1,0.05],0.75,0.65);
 K.ring(o,t+0.42,f*1.12,[1,0.2,2.7,0.1],0.25,0.12);K.ring(o,t+0.58,f*1.05,[1,0.12,2.7,0.06],0.2,0.08);return 0.8;}};
SND_R.dryfire={c:'fol',f:(K,o,t)=>{sndClick(K,o,t,2800,0.5);K.nz(o,t+0.004,{f:900,q:3,a:0.001,v:0.12,d:0.03});return 0.08;}};
SND_R.shell={c:'fol',f:(K,o,t)=>{K.ring(o,t,4200+Math.random()*900,[1,0.3,1.6,0.15],0.1,0.08);K.ring(o,t+0.09+Math.random()*0.05,4600,[1,0.2],0.06,0.06);return 0.2;}};
SND_R.whizz={c:'bul',f:(K,o,t)=>{const f=2800+Math.random()*1400;K.nz(o,t,{f,f1:f*0.35,fd:0.25,q:5,a:0.06,v:0.7,d:0.2});K.os(o,t,{f:f*0.7,f1:f*0.3,a:0.05,v:0.05,d:0.2});return 0.3;}};
SND_R.crack={c:'bul',f:(K,o,t)=>{K.nz(o,t,{ft:'highpass',f:1800,a:0.0002,v:1,d:0.006});K.nz(o,t,{f:3500,q:1,a:0.0003,v:0.5,d:0.03});K.nz(o,t+0.004,{b:'b',ft:'lowpass',f:700,a:0.003,v:0.25,d:0.08});return 0.12;}};
// silbido de artillería que llega (dur s hasta el impacto)
SND_R.incoming={c:'inc',f:(K,o,t,p)=>{const c=K.c,dur=p.dur||1.1,s=c.createOscillator(),lfo=c.createOscillator(),lg=K.g(18),g=c.createGain();
 s.frequency.setValueAtTime(1700+Math.random()*300,t);s.frequency.exponentialRampToValueAtTime(480,t+dur);lfo.frequency.value=6.5;lfo.connect(lg);lg.connect(s.frequency);
 g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.1,t+0.25);g.gain.exponentialRampToValueAtTime(0.35,t+dur-0.05);g.gain.linearRampToValueAtTime(0.0001,t+dur+0.02);
 s.connect(g);g.connect(o);s.start(t);lfo.start(t);s.stop(t+dur+0.05);lfo.stop(t+dur+0.05);K.nz(o,t,{b:'p',f:1500,f1:500,fd:dur,q:3,a:dur*0.85,v:0.22,d:0.15});return dur+0.1;}};
SND_R.pin={c:'fol',f:(K,o,t)=>{sndSlide(K,o,t,2500,5200,0.25,0.09);K.ring(o,t+0.09,3100,[1,0.3,2.4,0.12],0.3,0.18);return 0.3;}};
SND_R.throw={c:'fol',f:(K,o,t,p)=>{K.nz(o,t,{b:'p',f:500,f1:1900,fd:0.22,q:1.3,a:0.1,v:0.35,d:0.15});if(p.spoon!==false)K.ring(o,t+0.12,2050,[1,0.3,2.3,0.15,3.9,0.08],0.35,0.25);return 0.45;}};
SND_R.grenade_bounce={c:'fol',f:(K,o,t)=>{K.nz(o,t,{f:850,q:3,a:0.0008,v:0.6,d:0.05});K.os(o,t,{f:320,f1:190,a:0.001,v:0.3,d:0.06});K.ring(o,t,2300,[1,0.15,2.6,0.08],0.4,0.1);return 0.15;}};
SND_R.knife={c:'fol',f:(K,o,t,p)=>{K.nz(o,t,{b:'p',f:1300,f1:4200,fd:0.16,q:1.4,a:0.06,v:0.45,d:0.12});
 if(p.hit){K.nz(o,t+0.13,{b:'b',ft:'lowpass',f:450,f1:120,a:0.002,v:0.8,d:0.12});K.os(o,t+0.13,{f:120,f1:60,a:0.002,v:0.4,d:0.1});}return 0.35;}};
SND_R.hurt={c:'body',f:(K,o,t,p)=>{K.nz(o,t,{b:'b',ft:'lowpass',f:300,a:0.002,v:0.6,d:0.12});K.os(o,t,{f:85,f1:45,a:0.002,v:0.45,d:0.14});p.f0=p.f0||118;p.gv=0.55;return sndGrunt(K,o,t+0.03,p)+0.05;}};
SND_R.death={c:'vox',f:(K,o,t,p)=>{p.gd=0.45;p.gv=0.7;p.f0=p.f0||110+Math.random()*40;return sndGrunt(K,o,t,p);}};
SND_R.pain={c:'vox',f:(K,o,t,p)=>{p.gd=0.2;p.gv=0.55;return sndGrunt(K,o,t,p);}};
SND_R.heartbeat={c:'body',f:(K,o,t)=>{const lp=K.f('lowpass',140,0.7);lp.connect(o);K.os(lp,t,{f:62,f1:40,a:0.008,v:0.95,d:0.13});K.os(lp,t+0.17,{f:55,f1:36,a:0.008,v:0.6,d:0.15});return 0.4;}};
SND_R.tinnitus={c:'body',f:(K,o,t,p)=>{const d=p.dur||4;K.os(o,t,{f:3750,a:0.04,v:0.05,d});K.os(o,t,{f:3790,a:0.04,v:0.03,d:d*0.8});return d+0.1;}};
SND_R.turret={c:'veh',f:(K,o,t,p)=>{const c=K.c,d=p.dur||1,s=c.createOscillator(),bp=K.f('bandpass',520,2.5),g=c.createGain();s.type='sawtooth';s.frequency.setValueAtTime(95,t);
 s.frequency.linearRampToValueAtTime(125,t+d*0.3);g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.25,t+0.15);g.gain.setValueAtTime(0.25,t+d);g.gain.exponentialRampToValueAtTime(0.0001,t+d+0.2);
 s.connect(bp);bp.connect(g);g.connect(o);s.start(t);s.stop(t+d+0.25);K.nz(o,t,{b:'g',f:2000,q:1,a:0.1,v:0.12,d:d});return d+0.3;}};
SND_R.debris={c:'imp',f:(K,o,t)=>{K.nz(o,t,{ft:'highpass',f:2000,a:0.0005,v:0.5,d:0.02});K.nz(o,t,{f:400,q:2,a:0.002,v:0.6,d:0.18});K.nz(o,t+0.02,{b:'c',f:1500,q:0.6,a:0.02,v:0.5,d:0.6});return 0.8;}};
SND_R.helmet={c:'imp',f:(K,o,t)=>{K.ring(o,t,1650+Math.random()*300,[1,0.5,2.4,0.25,3.9,0.12],0.5,0.3);return 0.35;}};
SND_R.pickup={c:'fol',f:(K,o,t)=>{K.nz(o,t,{b:'p',f:1200,q:0.6,a:0.03,v:0.3,d:0.15});sndClick(K,o,t+0.12,2000,0.35);return 0.3;}};
SND_R.ammo={c:'fol',f:(K,o,t)=>{for(let i=0;i<4;i++)sndClick(K,o,t+i*0.07+Math.random()*0.04,1800+Math.random()*1500,0.22);K.nz(o,t,{b:'p',f:900,q:0.6,a:0.05,v:0.25,d:0.3});return 0.45;}};
SND_R.mount={c:'fol',f:(K,o,t)=>{K.nz(o,t,{b:'b',ft:'lowpass',f:500,a:0.002,v:0.4,d:0.1});K.ring(o,t,640,[1,0.4,2.7,0.2,4.4,0.1],0.35,0.25);SND_RL.charge(K,o,t+0.2);return 0.6;}};
SND_R.dismount={c:'fol',f:(K,o,t)=>{K.nz(o,t,{b:'p',f:1000,q:0.6,a:0.04,v:0.25,d:0.15});K.ring(o,t+0.05,700,[1,0.3,2.7,0.15],0.2,0.15);return 0.3;}};
SND_R.jump={c:'fol',f:(K,o,t)=>{K.nz(o,t,{b:'p',f:1100,q:0.7,a:0.02,v:0.2,d:0.12});K.nz(o,t,{b:'c',f:3800,q:1.5,a:0.01,v:0.15,d:0.12});return 0.2;}};
// interfaz y avisos
const sndBeep=(K,o,t,f,v,d)=>K.os(o,t,{w:'triangle',f,a:0.004,v,d});
SND_R.ui_move={c:'ui',f:(K,o,t)=>{sndBeep(K,o,t,760,0.07,0.05);return 0.08;}};
SND_R.ui_ok={c:'ui',f:(K,o,t)=>{sndBeep(K,o,t,660,0.08,0.06);sndBeep(K,o,t+0.06,990,0.09,0.12);return 0.22;}};
SND_R.ui_back={c:'ui',f:(K,o,t)=>{sndBeep(K,o,t,880,0.07,0.06);sndBeep(K,o,t+0.06,560,0.07,0.1);return 0.2;}};
SND_R.objective={c:'ui',f:(K,o,t)=>{sndBrass(K,o,t,sndMidi(67),0.35,0.07,3);return sndBrass(K,o,t+0.32,sndMidi(72),0.9,0.08,3)+0.32;}};
SND_R.objective_done={c:'ui',f:(K,o,t)=>{sndBrass(K,o,t,sndMidi(72),0.18,0.07,4);sndBrass(K,o,t+0.16,sndMidi(76),0.18,0.07,4);return sndBrass(K,o,t+0.32,sndMidi(79),0.8,0.08,4)+0.32;}};
SND_R.checkpoint={c:'ui',f:(K,o,t)=>{K.ring(o,t,1046,[1,0.5,2.01,0.15,3,0.06],0.18,1.1);K.ring(o,t+0.14,1568,[1,0.4,2.01,0.1],0.14,1);return 1.3;}};
SND_R.hitmark={c:'ui',f:(K,o,t)=>{K.nz(o,t,{f:2600,q:6,a:0.0005,v:0.18,d:0.03});return 0.05;}};
SND_R.killmark={c:'ui',f:(K,o,t)=>{K.nz(o,t,{f:1900,q:6,a:0.0005,v:0.2,d:0.05});K.nz(o,t+0.045,{f:1500,q:6,a:0.0005,v:0.16,d:0.06});return 0.12;}};

// ---------- partituras: {len: bucle en s (0 = una vez), dur, ev: [[t, fn(K, salida, t)], ...]} — se programan poco antes de sonar ----------
const SND_MUS={};
(()=>{const M=sndMidi,menu=[],add=(A,t,fn)=>A.push([t,fn]);
 // tema del menú: re menor, acordes de cuerda de 4 s; la segunda vuelta lleva una trompa grave y lenta (64 s en total)
 const ch=[[38,57,62,65],[34,58,62,65],[41,57,60,65],[36,55,60,64],[43,58,62,67],[38,57,62,65],[33,57,61,64],[38,53,57,62]];
 for(let L=0;L<2;L++)ch.forEach((cd,i)=>{const t=L*32+i*4;add(menu,t,(K,o,tt)=>{for(const m of cd)sndPad(K,o,tt,M(m),4.3,m<45?0.05:0.035,900);});
  if(i===0||i===5)add(menu,t,(K,o,tt)=>sndTimp(K,o,tt,M(38),0.16));});
 for(const [t,m,d] of [[0.5,69,1.5],[2,74,1],[3,72,1],[4,70,2.5],[6.5,69,1.5],[8,65,1],[9,67,1],[10,69,2],[12,67,1.5],[13.5,64,0.5],[14,64,1.8],
  [16,70,1.5],[17.5,69,0.5],[18,67,2],[20,69,1.5],[21.5,65,0.5],[22,62,2],[24,64,1.5],[25.5,61,0.5],[26,64,1.5],[28,62,3.5]])add(menu,32+t,(K,o,tt)=>sndBrass(K,o,tt,M(m-12),d,0.06,2.2));
 SND_MUS.menu={len:64,ev:menu};
 // tensión: ostinato grave de cuerdas a 104 pulsos, timbal y un pedal muy bajo
 const ten=[],e8=60/104/2,pat=[38,38,50,38,41,38,40,38,38,38,50,38,43,41,40,37];
 pat.forEach((m,i)=>add(ten,i*e8,(K,o,tt)=>sndStr(K,o,tt,M(m),e8*0.9,i%4===0?0.09:0.06)));
 add(ten,0,(K,o,tt)=>{sndTimp(K,o,tt,M(26),0.22);sndPad(K,o,tt,M(50),16*e8,0.018,600);sndPad(K,o,tt,M(57),16*e8,0.012,600);});add(ten,8*e8,(K,o,tt)=>sndTimp(K,o,tt,M(26),0.15));
 SND_MUS.tension={len:16*e8,ev:ten};
 // victoria: redoble, tresillo de trompetas y acorde de do mayor con timbales
 const vic=[];for(let i=0;i<15;i++)add(vic,i*0.06,(K,o,tt)=>sndSnare(K,o,tt,0.04+i*0.008));
 for(const [t,m,d] of [[0.9,67,0.16],[1.08,67,0.16],[1.26,67,0.16],[1.44,72,0.9],[2.4,67,0.32],[2.75,72,0.32],[3.1,76,1],[4.2,74,0.28],[4.5,76,0.28],[4.8,79,2.4]])add(vic,t,(K,o,tt)=>sndBrass(K,o,tt,M(m),d,0.1,4));
 for(const [t,m,d] of [[1.44,64,0.9],[3.1,67,1],[4.8,72,2.4],[4.8,64,2.4]])add(vic,t,(K,o,tt)=>sndBrass(K,o,tt,M(m),d,0.06,3));
 for(const t of [1.44,3.1,4.8])add(vic,t,(K,o,tt)=>sndTimp(K,o,tt,M(36),0.28));
 add(vic,4.8,(K,o,tt)=>{for(const m of [48,55,60,64])sndPad(K,o,tt,M(m),2.8,0.035,1400);});
 for(let i=0;i<14;i++)add(vic,6.1+i*0.07,(K,o,tt)=>sndTimp(K,o,tt,M(36),0.05+i*0.01));add(vic,7.1,(K,o,tt)=>sndTimp(K,o,tt,M(36),0.32));
 SND_MUS.victory={len:0,dur:9,ev:vic};
 // muerte: acorde disminuido grave que se hincha y se apaga
 SND_MUS.death={len:0,dur:5,ev:[[0,(K,o,tt)=>{sndTimp(K,o,tt,M(26),0.32);for(const m of [38,50,53,56])sndPad(K,o,tt,M(m),3,0.05,700);}],
  [0.2,(K,o,tt)=>{sndBrass(K,o,tt,M(50),2.4,0.05,1.8);sndBrass(K,o,tt,M(44),2.4,0.04,1.8);}]]};
 for(const k in SND_MUS)SND_MUS[k].ev.sort((a,b)=>a[0]-b[0]);})();

// ---------- ambientes en bucle: fn(K, salida) -> {src:[fuentes], upd(t)} (upd a 4 Hz para ráfagas y olas) ----------
function sndLoopSrc(K,b,o,ft,f,q,v,rate){const s=K.c.createBufferSource();s.buffer=K.B[b];s.loop=true;if(rate)s.playbackRate.value=rate;const fl=K.f(ft,f,q),g=K.g(v);
 s.connect(fl);fl.connect(g);g.connect(o);s.start(0,Math.random()*1.5);return {s,f:fl,g};}
const SND_AMB={
 // batalla lejana: retumbo continuo que respira (los disparos y cañonazos sueltos los programa Snd.update)
 battle(K,o){const a=sndLoopSrc(K,'b',o,'lowpass',130,0.6,0.3),lf=K.c.createOscillator(),lg=K.g(0.13);lf.frequency.value=0.06;lf.connect(lg);lg.connect(a.g.gain);lf.start();return {src:[a.s,lf]};},
 // viento: rosa por un paso banda que se mueve a ráfagas + un silbido fino
 wind(K,o){const a=sndLoopSrc(K,'p',o,'bandpass',420,0.6,0.22),b=sndLoopSrc(K,'w',o,'bandpass',1250,9,0.012);
  return {src:[a.s,b.s],k:0.5,upd(T){this.k=clamp(this.k+(Math.random()-0.5)*0.2,0.15,1);const k=this.k;a.f.frequency.setTargetAtTime(260+k*520,T,0.8);
   a.g.gain.setTargetAtTime(0.1+k*0.28,T,0.8);b.f.frequency.setTargetAtTime(900+k*900,T,1);b.g.gain.setTargetAtTime(k>0.7?0.03:0.008,T,1);}};},
 // noche: grillos a izquierda y derecha
 night(K,o){const c=K.c,src=[];for(let i=0;i<2;i++){const s=c.createBufferSource();s.buffer=K.B.k;s.loop=true;s.playbackRate.value=0.94+i*0.11;
  const p=sndPan(c,i?0.6:-0.55),g=K.g(0.08);s.connect(g);g.connect(p);p.connect(o);s.start(0,i*1.7);src.push(s);}return {src};},
 // fuego: crepitar y rugido grave
 fire(K,o){const a=sndLoopSrc(K,'c',o,'bandpass',2400,0.5,0.16),b=sndLoopSrc(K,'b',o,'lowpass',220,0.5,0.1);return {src:[a.s,b.s]};},
 // playa: olas que crecen, rompen y se retiran
 surf(K,o){const a=sndLoopSrc(K,'b',o,'lowpass',400,0.5,0.05),b=sndLoopSrc(K,'p',o,'highpass',1200,0.5,0.01);
  return {src:[a.s,b.s],nx:0,upd(T){if(T<this.nx)return;const p=5.5+Math.random()*3.5;this.nx=T+p;
   a.g.gain.setTargetAtTime(0.5,T,p*0.22);a.g.gain.setTargetAtTime(0.06,T+p*0.45,p*0.18);a.f.frequency.setTargetAtTime(1400,T,p*0.2);a.f.frequency.setTargetAtTime(350,T+p*0.45,p*0.2);
   b.g.gain.setTargetAtTime(0.12,T+p*0.3,0.3);b.g.gain.setTargetAtTime(0.01,T+p*0.5,p*0.15);}};},
 // bosque: rumor de ramas (sube y baja)
 forest(K,o){const a=sndLoopSrc(K,'p',o,'bandpass',1500,0.4,0.06);return {src:[a.s],k:0.5,upd(T){this.k=clamp(this.k+(Math.random()-0.5)*0.2,0.1,1);a.g.gain.setTargetAtTime(0.02+this.k*0.08,T,0.7);}};}};
const SND_AMBV={battle:0.8,wind:0.6,night:0.7,fire:0.45,surf:0.9,forest:0.7};
// ---------- carro de combate: motor (sierras graves saturadas), cadenas (grava con golpeteo de eslabones), chirrido de rodillos y torreta ----------
function sndTank(K,o,half){const c=K.c,T=c.currentTime,base=half?46:31,eg=K.g(0),lp=K.f('lowpass',half?600:420,1.2),sat=K.sat(2.4,lp);lp.connect(eg);eg.connect(o);
 const os=[],mk=(type,v)=>{const s=c.createOscillator(),g=K.g(v);s.type=type;s.connect(g);g.connect(sat);os.push(s);return s;};
 const o1=mk('sawtooth',0.5),o2=mk('square',0.35),o3=mk('sawtooth',0.25);
 const n=c.createBufferSource();n.buffer=K.B.g;n.loop=true;const tb=K.f('bandpass',1700,0.9),am=K.g(0.5),tg=K.g(0),clk=c.createOscillator(),ck=K.g(0.45);
 clk.type='square';clk.frequency.value=4;clk.connect(ck);ck.connect(am.gain);n.connect(tb);tb.connect(am);am.connect(tg);tg.connect(o);
 const sq=c.createOscillator(),sqg=K.g(0);sq.frequency.value=1500;sq.connect(sqg);sqg.connect(o);
 const tu=c.createOscillator(),tbp=K.f('bandpass',520,2.5),tug=K.g(0);tu.type='sawtooth';tu.frequency.value=110;tu.connect(tbp);tbp.connect(tug);tug.connect(o);
 const all=os.concat([n,clk,sq,tu]);for(const s of all)s.start(T);eg.gain.setTargetAtTime(0.4,T,0.5);
 return {all,
  // velocidad (m/s) y giro de la torreta (rad/s); se llama a 10 Hz
  set(t,spd,tr){const rpm=clamp(0.3+spd/7,0.3,1.2),f=base*(0.8+rpm*0.9),mv=clamp(spd/4,0,1);
   o1.frequency.setTargetAtTime(f,t,0.25);o2.frequency.setTargetAtTime(f*0.5,t,0.25);o3.frequency.setTargetAtTime(f*1.51,t,0.25);
   lp.frequency.setTargetAtTime((half?500:330)+rpm*500,t,0.3);eg.gain.setTargetAtTime(0.32+rpm*0.25,t,0.3);
   clk.frequency.setTargetAtTime(1.5+spd*3.2,t,0.2);tg.gain.setTargetAtTime(mv*(half?0.18:0.32),t,0.2);
   tug.gain.setTargetAtTime(clamp(Math.abs(tr)*0.4,0,0.12),t,0.08);tu.frequency.setTargetAtTime(95+Math.min(2,Math.abs(tr))*60,t,0.1);
   if(mv>0.2&&Math.random()<0.02){sq.frequency.setValueAtTime(1300+Math.random()*700,t);sqg.gain.setTargetAtTime(0.025*mv,t,0.05);sqg.gain.setTargetAtTime(0,t+0.25+Math.random()*0.4,0.1);}},
  stop(t){for(const s of all)try{s.stop(t);}catch(e){}}};}
// ---------- reverberación: respuestas generadas (d duración · er primeras reflexiones [t, nivel] · dif difusa · lp0/lp1 brillo · wet) ----------
const SND_RV={
 open:{d:1.8,er:[[0.045,0.35],[0.13,0.25],[0.29,0.2],[0.52,0.14],[0.85,0.09]],dif:0.35,lp0:0.5,lp1:0.05,wet:0.3},
 beach:{d:1.3,er:[[0.21,0.18],[0.6,0.1]],dif:0.3,lp0:0.4,lp1:0.05,wet:0.24},
 village:{d:1.3,er:[[0.011,0.5],[0.019,0.42],[0.033,0.35],[0.05,0.3],[0.081,0.22],[0.12,0.16],[0.19,0.12]],dif:0.7,lp0:0.7,lp1:0.1,wet:0.38},
 indoor:{d:0.75,er:[[0.004,0.6],[0.009,0.5],[0.014,0.45],[0.021,0.38],[0.03,0.3]],dif:0.9,lp0:0.8,lp1:0.2,wet:0.48},
 forest:{d:2.2,er:[[0.03,0.15],[0.06,0.14],[0.09,0.12],[0.14,0.1],[0.2,0.08]],dif:0.6,lp0:0.3,lp1:0.04,wet:0.38}};
// categorías: ref (m a volumen pleno), ro (caída), max (m), n (voces a la vez), rv (envío a la reverb), bus
const SND_CAT={gun:{ref:9,ro:1,max:1200,n:18,rv:0.45},boom:{ref:16,ro:1,max:3000,n:6,rv:0.55},imp:{ref:3,ro:1.3,max:60,n:10,rv:0.2},
 step:{ref:2,ro:1.6,max:28,n:8,rv:0.12},fol:{ref:2.5,ro:1.4,max:35,n:8,rv:0.15},bul:{ref:3,ro:1,max:30,n:4,rv:0.08},vox:{ref:5,ro:1,max:70,n:4,rv:0.25},
 inc:{ref:60,ro:0.6,max:3000,n:4,rv:0.2},veh:{ref:10,ro:1,max:400,n:4,rv:0.3},amb:{ref:1,ro:0,max:1e9,n:24,rv:0.4,bus:'amb'},
 ui:{ref:1,ro:0,max:1e9,n:8,rv:0,bus:'ui'},body:{ref:1,ro:0,max:1e9,n:6,rv:0,bus:'ui'}};

// ---------- Snd ----------
const Snd={ctx:null,K:null,ok:false,master:null,bus:null,vol:{fx:1,music:0.6,voice:1,master:0.8},L:{pos:[0,0,0],yaw:0},
 V:[],cnt:{},loops:{},_lid:0,pend:[],err:0,lastErr:null,deaf:0,tension:0,env:null,envBase:'open',main:null,ten:null,_amb:{},_battle:0,
 tanks:new Map(),occ:new WeakMap(),_mode:null,_lvl:undefined,_LL:undefined,_now:0,_lt:0,_t10:0,_t4:0,_tenv:0,_hb:0,_ab:2,_mf:20000,_duck:1,_losN:6,_scan:0,
 _rsSeen:false,_incPos:null,_q:[0,0,0],_Q:{vol:1,pan:0,lp:20000,dl:0,dist:0},_up:[0,1,0],_dirs:[[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]],
 _wzT:-9,_hurtT:-9,_painT:-9,_dieT:-9,_tinT:-9,_odT:-9,_nadeT:-9,_warnT:-9,_envT:-9,_impN:0,_impT:0,
 _e(e){this.err++;this.lastErr=String(e&&e.stack||e);},
 // tras el primer gesto del usuario (y en cada gesto: en iOS el contexto puede quedar «interrumpido»)
 init(){if(this.ctx){this.resume();return;}
  try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;const c=this.ctx=new AC();this.K=SndKit(c);this._graph(c);this.ok=true;this.setVol();this.resume();}
  catch(e){this.ctx=null;this.ok=false;this._e(e);}},
 resume(){const c=this.ctx;if(!c)return;if(c.state!=='running'){try{const p=c.resume();if(p&&p.catch)p.catch(()=>{});}catch(e){}}
  if(!this._unl){try{const s=c.createBufferSource();s.buffer=c.createBuffer(1,1,22050);s.connect(c.destination);s.start(0);this._unl=true;}catch(e){}}},
 _graph(c){const K=this.K;
  this.master=c.createGain();this.master.connect(c.destination);
  const clip=c.createWaveShaper();clip.curve=SND_CLIP;clip.connect(this.master);
  const comp=this.comp=c.createDynamicsCompressor();comp.threshold.value=-14;comp.knee.value=8;comp.ratio.value=6;comp.attack.value=0.003;comp.release.value=0.22;comp.connect(clip);
  this.pre=K.g(0.9);this.pre.connect(comp);this.muf=K.f('lowpass',20000,0.5);this.muf.connect(this.pre);
  const B=this.bus={fx:K.g(1),amb:K.g(1),ui:K.g(1),mus:K.g(0.4)};B.fx.connect(this.muf);B.amb.connect(this.muf);B.ui.connect(this.pre);
  // música: eco suave de sala (retardo con realimentación), no la reverb del escenario
  const m=B.mus,dl=c.createDelay(1),fb=K.g(0.32),dlf=K.f('lowpass',2200,0.5),wet=K.g(0.35);dl.delayTime.value=0.27;m.connect(this.pre);m.connect(dl);dl.connect(dlf);dlf.connect(fb);fb.connect(dl);dlf.connect(wet);wet.connect(this.pre);
  this.rvIn=K.g(1);this.rv=null;this.env=null;this._setRv('open');},
 // respuesta al impulso: difusa (ruido que se oscurece y cae) + primeras reflexiones como ráfagas cortas (ecos), normalizada
 _ir(kind){const I=this._irs||(this._irs={});if(I[kind])return I[kind];const c=this.ctx,sr=c.sampleRate,P=SND_RV[kind]||SND_RV.open,
   low=typeof GFX!=='undefined'&&GFX.level==='baja',dur=P.d*(low?0.6:1),n=Math.floor(sr*dur),b=c.createBuffer(2,n,sr),eL=Math.floor(0.02*sr),eT=0.004*sr;
  for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);let y=0,E=0;
   for(let i=0;i<n;i++){const t=i/sr,a=P.lp0+(P.lp1-P.lp0)*(t/dur);y+=a*((Math.random()*2-1)-y);d[i]=y*P.dif*Math.exp(-6.9*t/dur)*(1-Math.exp(-t/0.006));}
   for(const [t0,a] of P.er){const j=Math.floor(t0*(1+(ch?0.07:-0.05))*sr);for(let k=0;k<eL&&j+k<n;k++)d[j+k]+=a*1.5*(Math.random()*2-1)*Math.exp(-k/eT);}
   for(let i=0;i<n;i++)E+=d[i]*d[i];const k=0.8/Math.sqrt(E||1);for(let i=0;i<n;i++)d[i]*=k;}
  return I[kind]=b;},
 // cambia la reverb con un fundido entre dos convolvers
 _setRv(kind){const c=this.ctx;if(!c||kind===this.env)return;const P=SND_RV[kind]||SND_RV.open,t=c.currentTime,conv=c.createConvolver(),w=this.K.g(0);
  conv.normalize=false;conv.buffer=this._ir(kind);this.rvIn.connect(conv);conv.connect(w);w.connect(this.muf);w.gain.setTargetAtTime(P.wet,t,0.25);
  const old=this.rv;if(old){old.w.gain.setTargetAtTime(0,t,0.2);this._later(1.6,()=>{try{this.rvIn.disconnect(old.conv);}catch(e){}try{old.w.disconnect();}catch(e){}});}
  this.rv={conv,w};this.env=kind;},
 setVol(){const S=typeof Settings!=='undefined'?Settings:SND_NO,nv=(v,d)=>v==null||!isFinite(v)?d:clamp(+v,0,1);
  this.vol.fx=nv(S.volFx,1);this.vol.music=nv(S.volMusic,0.6);this.vol.voice=nv(S.volVoice,1);this.vol.master=nv(S.volMaster,0.8);
  if(this.master){this.master.gain.setTargetAtTime(this.vol.master,this.ctx.currentTime,0.05);this._busVol();}},
 _busVol(){if(!this.bus)return;const t=this.ctx.currentTime,p=this._mode==='pause',B=this.bus,f=this.vol.fx;
  B.fx.gain.setTargetAtTime(p?0:f,t,0.08);B.amb.gain.setTargetAtTime(f*(p?0.3:1)*this._duck,t,0.3);B.ui.gain.setTargetAtTime(f,t,0.05);B.mus.gain.setTargetAtTime(this.vol.music*0.7*this._duck,t,0.25);},
 // baja ambiente y música mientras habla un personaje del guion
 duck(on){this._duck=on?0.6:1;if(this.ctx)this._busVol();},
 setListener(pos,yaw){V3.copy(pos,this.L.pos);this.L.yaw=yaw||0;this.update();},
 // tarea diferida (s de reloj de audio), con etiqueta para cancelarla
 _later(s,fn,tag){this.pend.push({at:(this.ctx?this.ctx.currentTime:0)+s,fn,tag:tag||null});},
 _cancel(tag){this.pend=this.pend.filter(p=>p.tag!==tag);},
 // ---------- colocación 3D: P.vol, P.pan, P.lp, P.dl (retraso), P.dist; false si no se oye ----------
 _place(P,pos,C,by){const L=this.L,dx=pos[0]-L.pos[0],dy=pos[1]-L.pos[1],dz=pos[2]-L.pos[2],h=Math.hypot(dx,dz),d=Math.hypot(h,dy);P.dist=d;if(d>C.max)return false;
  P.vol*=d<=C.ref?1:C.ref/(C.ref+(d-C.ref)*C.ro);if(P.vol<0.003)return false;
  const s=Math.sin(L.yaw),co=Math.cos(L.yaw);P.pan=h>0.01?clamp((-dx*co+dz*s)/h*Math.min(1,h/1.5)*0.9,-0.95,0.95):0;
  const fr=h>0.01?(dx*s+dz*co)/h:1;let lp=Math.min(20000,22000*Math.exp(-d/260));if(fr<-0.2)lp*=lerp(1,0.5,(-fr-0.2)/0.8); // detrás suena más apagado
  if(this._occl(pos,by,d)){lp=Math.min(lp,700);P.vol*=0.5;}
  P.lp=Math.max(lp,250);P.dl=d>30?Math.min(1.5,d/343):0;return true;},
 // oclusión: World.los con caché por actor (0.35 s) y pocas comprobaciones por fotograma
 _occl(pos,by,d){if(d<3||typeof World==='undefined'||!World.built||!World.los)return false;const ob=by&&typeof by==='object',e=ob?this.occ.get(by):null;
  if(e&&this._now-e.t<0.35)return e.v;if(this._losN<=0)return e?e.v:false;this._losN--;const q=this._q;q[0]=pos[0];q[1]=pos[1]+0.4;q[2]=pos[2];
  let v=false;try{v=!World.los(this.L.pos,q);}catch(err){}if(ob){if(e){e.t=this._now;e.v=v;}else this.occ.set(by,{t:this._now,v});}return v;},
 // ---------- reproducir: Snd.play(nombre, {pos, vol, rate, by, delay, me, prio, far, pan, lp, k, cl, hit, f0, dur, size, spoon, cat}) ----------
 play(name,o){const c=this.ctx;if(!c||!this.ok||typeof name!=='string')return null;o=o||SND_NO;
  if(name.startsWith('music_')){this.music(name.slice(6));return null;}
  if(name==='whizz'&&o.pos&&o.pos===this._incPos)return null; // el silbido de artillería del guion ya suena por 'incoming'
  const R=SND_R[name];if(!R||c.state!=='running')return null;
  try{return this._play(R,o);}catch(e){this._e(e);return null;}},
 _play(R,o){const c=this.ctx,cat=o.cat||R.c,C=SND_CAT[cat]||SND_CAT.fol;this._now=c.currentTime;
  const P={vol:o.vol==null?1:o.vol,pan:o.pan||0,lp:o.lp||20000,dl:0,dist:0,far:o.far||0,me:!!o.me,rate:o.rate||1,k:o.k==null?1:o.k,hit:!!o.hit,cl:o.cl||'rifle',f0:o.f0||0,dur:o.dur||0,size:o.size||1,spoon:o.spoon};
  if(o.pos&&!o.me){if(!this._place(P,o.pos,C,o.by))return null;if((cat==='gun'||cat==='boom')&&o.far==null)P.far=clamp((P.dist-35)/250,0,1);}
  this._purge();const n=this.cnt[cat]||0;if(n>=C.n||this.V.length>=72){if(!o.prio)return null;this._steal(cat);}
  const t=this._now+0.005+P.dl+(o.delay||0),g=c.createGain(),ns=[g];g.gain.value=P.vol;let x=g;
  if(P.lp<18000){const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=P.lp;f.Q.value=0.5;x.connect(f);x=f;ns.push(f);}
  if(P.pan){const p=sndPan(c,P.pan);x.connect(p);x=p;ns.push(p);}
  x.connect(this.bus[C.bus||'fx']);
  const rs=C.rv*(o.pos?0.6+Math.min(1.2,P.dist/50):0.45);if(rs>0.01&&this.rvIn){const s=c.createGain();s.gain.value=rs;x.connect(s);s.connect(this.rvIn);ns.push(s);}
  const len=R.f(this.K,g,t,P)||0.5,v={cat,end:t+len+0.15,ns};this.V.push(v);this.cnt[cat]=n+1;return v;},
 _purge(){const now=this._now,V=this.V;for(let i=V.length-1;i>=0;i--){const v=V[i];if(now>v.end){for(const x of v.ns)try{x.disconnect();}catch(e){}this.cnt[v.cat]--;V[i]=V[V.length-1];V.pop();}}},
 _steal(cat){let b=null;for(const v of this.V)if(v.cat===cat&&(!b||v.end<b.end))b=v;b=b||this.V[0];if(!b)return;try{b.ns[0].gain.setTargetAtTime(0,this._now,0.01);}catch(e){}b.end=this._now+0.05;},
 // ---------- bucles: 'tank_engine' | 'halftrack_engine' {pos, follow} · 'ambience_<battle|wind|night|fire|surf|forest>' · 'music_<pieza>' -> id ----------
 loop(name,o){const c=this.ctx;if(!c||!this.ok||typeof name!=='string')return 0;o=o||SND_NO;
  try{if(name.startsWith('music_')){this.music(name.slice(6));return 0;}
   const id=++this._lid,t=c.currentTime;
   if(name.startsWith('ambience_')){const k=name.slice(9),F=SND_AMB[k];if(!F)return 0;const g=this.K.g(0);g.connect(this.bus.amb);const a=F(this.K,g);a.g=g;a.name=k;
    g.gain.setTargetAtTime(o.vol==null?1:o.vol,t,0.8);this.loops[id]=a;return id;}
   if(name==='tank_engine'||name==='halftrack_engine'){const sp=this._spat(),tk=sndTank(this.K,sp.g,name!=='tank_engine');
    this.loops[id]={tank:tk,sp,src:null,vol:o.vol==null?1:o.vol,pos:o.pos?o.pos.slice():null,follow:o.follow||null,spd:0,tr:0};this._loopsUpd(t);return id;}
   return 0;}catch(e){this._e(e);return 0;}},
 move(id,pos){const L=this.loops[id];if(L&&pos){if(!L.pos)L.pos=[0,0,0];V3.copy(pos,L.pos);}},
 set(id,spd,turn){const L=this.loops[id];if(L){L.spd=spd||0;L.tr=turn||0;}},
 stop(id,fade){const L=this.loops[id];if(!L)return;delete this.loops[id];const c=this.ctx;if(!c)return;const t=c.currentTime,f=fade==null?0.4:fade;
  try{const g=L.g||L.sp.out;g.gain.cancelScheduledValues(t);g.gain.setValueAtTime(g.gain.value,t);g.gain.setTargetAtTime(0,t,f/3+0.01);const end=t+f+0.2;
   if(L.src)for(const s of L.src)try{s.stop(end);}catch(e){}if(L.tank)L.tank.stop(end);
   this._later(f+0.4,()=>{try{g.disconnect();}catch(e){}if(L.sp)try{L.sp.s.disconnect();}catch(e){}});}catch(e){this._e(e);}},
 _spat(){const c=this.ctx,K=this.K,g=K.g(1),lp=K.f('lowpass',20000,0.5),p=sndPan(c,0),out=K.g(0),s=K.g(0.35);g.connect(lp);lp.connect(p);p.connect(out);out.connect(this.bus.fx);out.connect(s);s.connect(this.rvIn);return {g,lp,p,out,s};},
 _loopsUpd(now){for(const id in this.loops){const L=this.loops[id];if(!L.sp)continue;const Q=this._Q,S=L.sp;Q.vol=L.vol;Q.pan=0;Q.lp=20000;
   const ok=L.pos?this._place(Q,L.pos,SND_CAT.veh,L.follow):true;S.out.gain.setTargetAtTime(ok?Q.vol:0,now,0.12);S.lp.frequency.setTargetAtTime(ok?Q.lp:500,now,0.12);sndPanSet(S.p,ok?Q.pan:0,now);
   if(L.tank)L.tank.set(now,L.spd,L.tr);}},
 // carros: un bucle por cada carro vivo cercano (máx. 4), que sigue su posición, velocidad y giro de torreta
 _tanks(dt){if(typeof Actors==='undefined'||!Actors.list)return;const M=this.tanks,sc=++this._scan,inLv=this._mode!=='title'&&this._mode!=='brief';
  if(inLv)for(const a of Actors.list){if(!a||!a.tank||!a.alive||!a.pos)continue;let v=M.get(a);
   if(!v){if(M.size>=4||V3.dist(a.pos,this.L.pos)>320)continue;const id=this.loop(a.half?'halftrack_engine':'tank_engine',{pos:a.pos,follow:a});if(!id)continue;v={id,ay:a.aim?a.aim[0]:a.yaw||0,sc};M.set(a,v);}
   v.sc=sc;const L=this.loops[v.id];if(!L)continue;const ay=a.aim?a.aim[0]:a.yaw||0;L.spd=a.speed!=null?a.speed:a.vel?Math.hypot(a.vel[0],a.vel[2]):0;
   L.tr=angNorm(ay-v.ay)/Math.max(dt,0.01);v.ay=ay;V3.copy(a.pos,L.pos);}
  for(const [a,v] of M)if(v.sc!==sc){this.stop(v.id,a.alive===false?0.3:1.2);M.delete(a);}},
 _stopTanks(){for(const [a,v] of this.tanks)this.stop(v.id,0.5);this.tanks.clear();},
 // ---------- música: pista principal (menu, victory, death | null) y capa de tensión ----------
 music(name,fade){const c=this.ctx;if(!c||!this.ok)return;if(name==='tension'){this._tense(true);return;}fade=fade==null?1.5:fade;
  if(this.main&&this.main.name===name&&!this.main.done)return;this._endTrack(this.main,fade);this.main=null;
  if(name&&SND_MUS[name]){this.main=this._track(name,SND_MUS[name].len?0.4:0.01);if(name==='victory'||name==='death')this._tense(false);}},
 _track(name,tc){const S=SND_MUS[name],g=this.K.g(0),t=this.ctx.currentTime;g.connect(this.bus.mus);g.gain.setTargetAtTime(1,t,tc);return {name,S,g,t0:t+0.08,i:0,loop:0,done:false};},
 _endTrack(T,fade){if(!T)return;const t=this.ctx.currentTime,g=T.g;T.dead=true;g.gain.cancelScheduledValues(t);g.gain.setValueAtTime(g.gain.value,t);g.gain.setTargetAtTime(0,t,fade/3+0.01);
  this._later(fade+(T.S.len?3:T.S.dur||6),()=>{try{g.disconnect();}catch(e){}});},
 _tense(on){if(!this.ctx)return;if(on&&!this.ten)this.ten=this._track('tension',1.2);else if(!on&&this.ten){this._endTrack(this.ten,4);this.ten=null;}},
 _sched(T,now){if(!T||T.dead||T.done)return;const S=T.S,E=S.ev;for(let k=0;k<64;k++){if(T.i>=E.length){if(!S.len){T.done=true;return;}T.i=0;T.loop++;}
   const at=T.t0+T.loop*S.len+E[T.i][0];if(at>now+0.6)return;if(at>=now-0.15)E[T.i][1](this.K,T.g,Math.max(at,now+0.01));T.i++;}},
 // ---------- ambiente ----------
 ambience(list){if(!this.ctx)return;list=list||[];for(const k in this._amb)if(list.indexOf(k)<0){this.stop(this._amb[k],2);delete this._amb[k];}
  for(const k of list)if(!this._amb[k]&&SND_AMB[k]){const id=this.loop('ambience_'+k,{vol:SND_AMBV[k]});if(id)this._amb[k]=id;}},
 // ambiente de la misión: lv.ambience (lista), lv.battle (0..1, tiroteo lejano) o deducido del entorno
 _ambFor(lv,mode){if(mode==='title')return {a:['wind','battle'],b:0.25};if(!lv)return {a:['wind'],b:0};
  const id=lv.id||'',E=lv.env||SND_NO,night=!!(E.stars||E.moon)||E.sunK===0,snow=!!E.snow,sand=/beach|playa/.test(id)||lv.ground==='sand';
  let a=lv.ambience?(Array.isArray(lv.ambience)?lv.ambience.slice():[lv.ambience]):null,b=lv.battle;
  if(!a){a=[];if(sand)a.push('surf');if(night)a.push('night','fire');else if(snow)a.push('forest');a.push('wind','battle');}
  if(b==null)b=id==='training'?0:night?0.4:sand?1:0.6;if(!(b>0))a=a.filter(x=>x!=='battle');return {a,b};},
 _rvFor(lv){return lv&&lv.reverb||lv&&{beach:'beach',village:'village',bastogne:'forest',survival:'village'}[lv.id]||(lv&&lv.env&&lv.env.snow?'forest':'open');},
 // suceso lejano de la batalla: disparos sueltos, ráfagas de ametralladora, descargas de fusiles, cañonazos y explosiones
 _farEvent(){const r=Math.random(),pan=Math.random()*1.8-0.9,dist=200+Math.random()*900,v=clamp(60/dist,0.05,0.3)*(0.7+Math.random()*0.6),
   o={vol:v,far:1,pan,cat:'amb',lp:900+Math.random()*1600,delay:0},R=SND_R,pick=a=>a[(Math.random()*a.length)|0];
  if(r<0.35)this._play(R[pick(['garand','kar98','kar98','bar','thompson'])],o);
  else if(r<0.6){const w=Math.random()<0.6?'mg42':'bar',n=5+(Math.random()*12|0),dt=w==='mg42'?0.052:0.11;for(let i=0;i<n;i++){o.delay=i*dt*(0.95+Math.random()*0.1);this._play(R[w],o);}}
  else if(r<0.8){for(let i=0;i<3+(Math.random()*4|0);i++){o.delay=Math.random()*0.9;o.pan=clamp(pan+Math.random()*0.3-0.15,-1,1);this._play(R[pick(['garand','kar98','mp40'])],o);}}
  else{o.vol=Math.min(0.5,v*1.8);o.lp=600;this._play(R[Math.random()<0.6?'explosion_far':'cannon'],o);}},
 // ---------- bucle (lo mueve setListener en cada fotograma de render) ----------
 update(){const c=this.ctx;if(!c||!this.ok||c.state!=='running')return;const now=c.currentTime;let dt=now-this._lt;this._lt=now;if(!(dt>0))return;dt=Math.min(dt,0.25);this._now=now;
  try{this._update(now,dt);}catch(e){this._e(e);}if(typeof Voice!=='undefined')Voice.update();},
 _update(now,dt){this._losN=6;this._purge();
  for(let i=this.pend.length-1;i>=0;i--){const p=this.pend[i];if(now>=p.at){this.pend.splice(i,1);try{p.fn();}catch(e){this._e(e);}}}
  const G=typeof Game!=='undefined'?Game:null,mode=G?G.mode:'title',lv=G?G.level:null,LL=G?G.L:null;
  if(mode!==this._mode){const a=this._mode;this._mode=mode;this._modeChange(a,mode);}
  if(lv!==this._lvl||LL!==this._LL){this._lvl=lv;this._LL=LL;this._levelChange(lv,mode);}
  this._t10-=dt;if(this._t10<=0){this._t10=0.1;this._tanks(0.1);this._loopsUpd(now);}
  this._t4-=dt;if(this._t4<=0){this._t4=0.25;for(const id in this.loops){const L=this.loops[id];if(L.upd)try{L.upd(now);}catch(e){this._e(e);}}}
  const live=mode==='play'||mode==='title'||mode==='brief';
  if(this._battle>0&&live){this._ab-=dt;if(this._ab<=0){this._ab=(0.6+Math.random()*2.6)/this._battle;this._farEvent();}}
  // poca vida: latido y sonido apagado; explosión cercana: sordera que se pasa poco a poco
  const P=typeof Player!=='undefined'?Player:null,play=mode==='play';let hk=0;
  if(play&&P&&P.alive&&P.health<38){hk=1-Math.max(0,P.health)/38;this._hb-=dt;if(this._hb<=0){this._hb=lerp(0.95,0.5,hk);this.play('heartbeat',{vol:0.5+hk*0.5});}}
  this.deaf=Math.max(0,this.deaf-dt/3.2);const dk=Math.max(this.deaf,hk*0.45,mode==='dead'?0.6:0),mf=20000*Math.pow(300/20000,dk);
  if(Math.abs(mf-this._mf)>this._mf*0.03){this._mf=mf;this.muf.frequency.setTargetAtTime(mf,now,0.06);}
  // música: la capa de tensión entra con el combate y se va con la calma
  this.tension=Math.max(0,this.tension-dt*0.03);
  if(play&&this.tension>0.45&&!this.ten)this._tense(true);else if(this.ten&&((!play&&mode!=='pause')||this.tension<0.08))this._tense(false);
  this._sched(this.main,now);this._sched(this.ten,now);
  this._tenv-=dt;if(this._tenv<=0){this._tenv=0.7;this._envCheck(mode);}},
 _modeChange(a,b){if(b==='title'||b==='brief'){if(!this.main||this.main.name!=='menu')this.music('menu');this._tense(false);if(b==='title'){this._stopTanks();if(typeof Voice!=='undefined')Voice.stop();}}
  else if(b==='play'&&this.main&&(this.main.name==='menu'||this.main.name==='death'))this.music(null,a==='brief'?2.5:1);
  this._busVol();},
 _levelChange(lv,mode){this._stopTanks();this.deaf=0;this.tension=0;this._tense(false);
  const A=this._ambFor(lv,mode);this.ambience(A.a);this._battle=A.b;this.envBase=this._rvFor(lv);this._envT=-9;this._wantEnv(this.envBase);},
 // reverb según dónde está el oyente: techo encima = interior; paredes cerca = pueblo; si no, la del escenario
 _envCheck(mode){let k=this.envBase;
  if((mode==='play'||mode==='dead')&&typeof World!=='undefined'&&World.built&&World.raycast){try{const e=this.L.pos;
   if(World.raycast(e,this._up,14))k='indoor';else if(k!=='forest'){let n=0;for(const D of this._dirs){const h=World.raycast(e,D,9);if(h&&h.t<9)n++;}if(n>=2)k='village';}}catch(err){}}
  this._wantEnv(k);},
 _wantEnv(k){if(k===this.env||this._now-this._envT<1.2)return;this._envT=this._now;this._setRv(k);},
 // sordera tras una explosión cercana (0..1) con pitido
 deafen(k){this.deaf=Math.max(this.deaf,k);if(k>0.5&&this._now-this._tinT>2){this._tinT=this._now;this.play('tinnitus',{vol:k,dur:2.5+k*2.5});}},
 // nombres que se pueden pedir a play/loop (para pruebas y depuración)
 names(){return Object.keys(SND_R).concat(Object.keys(SND_MUS).map(k=>'music_'+k),Object.keys(SND_AMB).map(k=>'ambience_'+k),['tank_engine','halftrack_engine']);},
 stats(){return {voices:this.V.length,loops:Object.keys(this.loops).length,tanks:this.tanks.size,env:this.env,deaf:+this.deaf.toFixed(3),tension:+this.tension.toFixed(3),
  music:this.main&&!this.main.dead?this.main.name:null,tense:!!this.ten,amb:Object.keys(this._amb),state:this.ctx?this.ctx.state:'none',err:this.err};},
 // pruebas: dibuja un sonido sin conexión (OfflineAudioContext) -> Promise {peak, rms, len}; o.raw sin compresor ni recorte
 async render(name,o){o=o||SND_NO;const OAC=window.OfflineAudioContext||window.webkitOfflineAudioContext;if(!OAC)return null;
  const sr=o.sr||22050,dur=o.dur||4,c=new OAC(2,Math.ceil(sr*dur),sr),K=SndKit(c),out=K.g(1);
  if(o.raw)out.connect(c.destination);else{const comp=c.createDynamicsCompressor();comp.threshold.value=-14;comp.knee.value=8;comp.ratio.value=6;comp.attack.value=0.003;comp.release.value=0.22;
   const clip=c.createWaveShaper();clip.curve=SND_CLIP;out.connect(comp);comp.connect(clip);clip.connect(c.destination);}
  const P={vol:1,pan:0,lp:20000,dl:0,dist:0,far:o.far||0,me:o.me!==false,rate:1,k:o.k==null?1:o.k,hit:true,cl:o.cl||'rifle',f0:0,dur:o.len||0,size:1,spoon:true};
  if(name.startsWith('music_')){const S=SND_MUS[name.slice(6)];if(!S)return null;for(let t0=0;t0<dur;t0+=S.len||1e9)for(const e of S.ev)if(t0+e[0]<dur-0.3)e[1](K,out,t0+e[0]+0.02);}
  else if(name.startsWith('ambience_')){const F=SND_AMB[name.slice(9)];if(!F)return null;const a=F(K,out);if(a.upd)a.upd(0.05);}
  else if(name==='tank_engine'||name==='halftrack_engine'){const T=sndTank(K,out,name!=='tank_engine');T.set(0.05,3,0.5);}
  else{const R=SND_R[name];if(!R)return null;R.f(K,out,0.02,P);}
  const b=await c.startRendering(),n=b.length;let pk=0,ss=0,last=0;
  for(let ch=0;ch<b.numberOfChannels;ch++){const d=b.getChannelData(ch);for(let i=0;i<n;i++){const a=Math.abs(d[i]);if(a>pk)pk=a;ss+=a*a;if(a>0.002&&i>last)last=i;}}
  return {peak:pk,rms:Math.sqrt(ss/(n*b.numberOfChannels)),len:last/sr};}
};

// ---------- el sonido escucha al Bus ----------
const sndIsP=b=>!!b&&(b.isPlayer||(typeof Player!=='undefined'&&b===Player));
const sndOn=()=>!!(Snd.ctx&&Snd.ok);
const SND_VP=[0,0,0];
function sndAt(a,h){SND_VP[0]=a.pos[0];SND_VP[1]=a.pos[1]+(h||1.5);SND_VP[2]=a.pos[2];return SND_VP;}
Bus.on('shot',d=>{if(!sndOn()||!d)return;const w=d.weapon,G=SND_GUN[w];if(!SND_R[w])return;
 if(sndIsP(d.by)){Snd.play(w,{me:true,prio:true,vol:0.95});
  if(G&&!Snd._csSeen&&Math.random()<(G.m==='semi'||G.m==='bolt'||G.m==='pistol'?0.6:0.2))Snd.play('shell',{delay:0.28+Math.random()*0.15,vol:0.6});
  // cerrojo tras el disparo si el módulo de armas no emite 'reloadStep'
  if(G&&G.m==='bolt'&&!Snd._rsSeen)Snd._later(0.45,()=>Snd.play('reload_bolt',{vol:0.9}),'rs');}
 else if(d.pos){Snd.play(w,{pos:d.pos,by:d.by,vol:Math.min(1.5,0.7+0.3*(d.loud||1))});
  if(d.by&&d.by.team==='axis'&&V3.dist(d.pos,Snd.L.pos)<70)Snd.tension=Math.min(1,Snd.tension+0.05);}});
Bus.on('impact',d=>{if(!sndOn()||!d||!d.pos)return;const n=Snd._now;if(n-Snd._impT>0.1){Snd._impT=n;Snd._impN=0;}if(++Snd._impN>8)return;
 Snd.play(SND_IMPN[d.surface]||'impact_dirt',{pos:d.pos,vol:sndIsP(d.by)?0.75:0.65});});
Bus.on('hit',d=>{if(!sndOn()||!d)return;const a=d.actor;
 if(a&&a.tank){if(d.pos)Snd.play('impact_metal',{pos:d.pos,vol:0.8});return;}
 if(d.pos)Snd.play('impact_flesh',{pos:d.pos,vol:0.8});
 if(sndIsP(d.by)&&a&&a.team!=='ally'){Snd.play(d.kill?'killmark':'hitmark',{});if(d.part==='head'&&d.pos)Snd.play('helmet',{pos:d.pos,vol:0.6});}
 if(a&&a.pos&&!d.kill&&a.alive&&Math.random()<0.3&&Snd._now-Snd._painT>0.6){Snd._painT=Snd._now;Snd.play('pain',{pos:sndAt(a),by:a,f0:100+((a.id||0)*37%40)});}});
Bus.on('kill',d=>{if(!d||!d.actor)return;const a=d.actor;if(a.tank)return;
 if(sndOn()&&a.pos&&Math.random()<0.75&&Snd._now-Snd._dieT>0.3){Snd._dieT=Snd._now;Snd.play('death',{pos:sndAt(a,1),by:a,f0:100+((a.id||0)*37%40)});}
 if(a.team==='ally'&&!a.hero)Voice.ally('manDown',a.pos,a);else if(a.team==='axis'&&sndIsP(d.by)&&Math.random()<0.12)Voice.ally('niceShot');});
Bus.on('explosion',d=>{if(!sndOn()||!d||!d.pos)return;const dd=V3.dist(d.pos,Snd.L.pos),r=d.radius||6;
 const kd=d.kind,ks=kd==='grenade'?0.85:kd==='shell'||kd==='charge'?1.25:kd==='rocket'?1.1:1;
 Snd.play(dd>180?'explosion_far':'explosion',{pos:d.pos,size:r/6*ks,vol:clamp(r/6*ks,0.6,1.6),rate:kd==='grenade'?1.08:kd==='shell'?0.92:1});
 if(kd&&kd!=='grenade'&&dd<45)Snd.play('debris',{pos:d.pos,delay:0.25,vol:0.7});
 const P=typeof Player!=='undefined'?Player:null;if(P&&P.alive&&Snd._mode==='play'&&dd<r*2.4)Snd.deafen(clamp(1.25-dd/(r*2.4),0.25,1));
 if(dd<80)Snd.tension=Math.min(1,Snd.tension+0.25);});
Bus.on('step',d=>{if(!sndOn()||!d)return;const s=SND_STEPN[d.surface]||'step_dirt',k=d.land?1.5:d.run?1:d.crouch?0.35:0.6,me=sndIsP(d.by);
 if(me)Snd.play(s,{k,vol:0.7,rate:0.95+Math.random()*0.1});else if(d.pos)Snd.play(s,{pos:d.pos,by:d.by,k,vol:0.8});
 if((d.run||d.land)&&Math.random()<0.5)Snd.play('gear',me?{vol:0.5}:d.pos?{pos:d.pos,by:d.by,vol:0.5}:SND_NO);});
Bus.on('reload',d=>{if(!d)return;const by=d.by,cl=sndCls(d.weapon);
 if(sndIsP(by)){if(sndOn()&&!Snd._rsSeen){const W=typeof WEAPONS!=='undefined'&&WEAPONS[d.weapon],T=W&&W.reload?W.reload[0]:2.2;
   for(const [st,f] of SND_RSEQ[cl]||SND_RSEQ.rifle)Snd._later(T*f,()=>Snd.play('reload_'+st,{cl,vol:0.9}),'rs');}return;}
 if(!by||!by.pos)return;if(sndOn()){Snd.play('reload_out',{pos:by.pos,by,cl,vol:0.6});const p=by.pos.slice();Snd._later(1.1,()=>Snd.play('reload_in',{pos:p,cl,vol:0.6}));}
 if(Math.random()<(by.team==='axis'?0.3:0.35))Voice.say(by,'reloading');});
Bus.on('reloadStep',d=>{if(!d)return;if(!Snd._rsSeen){Snd._rsSeen=true;Snd._cancel('rs');}if(!sndOn())return;const n='reload_'+d.step;if(!SND_R[n])return;const cl=sndCls(d.weapon);
 if(sndIsP(d.by))Snd.play(n,{cl,vol:0.9});else if(d.by&&d.by.pos)Snd.play(n,{pos:d.by.pos,by:d.by,cl,vol:0.7});});
Bus.on('ping',d=>{if(sndOn())Snd.play('ping',!d||sndIsP(d.by)||!d.pos?{vol:0.8}:{pos:d.pos,by:d.by});});
Bus.on('dryfire',d=>{if(sndOn()&&(!d||!d.by||sndIsP(d.by)))Snd.play('dryfire',{vol:0.8});});
Bus.on('pin',d=>{if(!sndOn())return;if(!d||sndIsP(d.by))Snd.play('pin',{});else if(d.by&&d.by.pos)Snd.play('pin',{pos:d.by.pos,by:d.by});});
Bus.on('throw',d=>{if(!d)return;const by=d.by,spoon=d.type!=='stiel';
 if(sndIsP(by)){if(sndOn())Snd.play('throw',{spoon});return;}if(!by||!by.pos)return;if(sndOn())Snd.play('throw',{pos:by.pos,by,spoon});
 if(by.team==='axis'){Snd._nadeT=Snd._now;if(Math.random()<0.7)Voice.say(by,'grenade');}});
Bus.on('grenadeBounce',d=>{if(!sndOn()||!d||!d.pos)return;Snd.play('grenade_bounce',{pos:d.pos,vol:0.9});
 // granada enemiga cerca del jugador: un compañero avisa
 if(Snd._now-Snd._nadeT<4&&V3.dist(d.pos,Snd.L.pos)<10&&Snd._now-Snd._warnT>4){Snd._warnT=Snd._now;Voice.ally('grenade');}});
Bus.on('whizz',d=>{if(!sndOn()||!d||!d.pos||d.pos===Snd._incPos)return;if(Snd._now-Snd._wzT<0.07)return;Snd._wzT=Snd._now;
 const G=d.by&&SND_GUN[d.by.weapon];if(G&&G.sup)Snd.play('crack',{pos:d.pos,vol:0.9});Snd.play('whizz',{pos:d.pos,vol:0.8*(d.dist!=null?clamp(1.35-d.dist/1.6,0.45,1.05):1)});Snd.tension=Math.min(1,Snd.tension+0.08);});
Bus.on('casing',d=>{Snd._csSeen=true;if(!sndOn()||!d||!d.pos||Snd._now-(Snd._csT||0)<0.05)return;Snd._csT=Snd._now;Snd.play('shell',{pos:d.pos,vol:d.kind==='clip'?0.7:0.5});});
Bus.on('weaponRaise',d=>{if(sndOn()&&(!d||sndIsP(d.by)))Snd.play('gear',{vol:0.35,rate:1.25});});
// un carro apunta: la torreta chirría y alguien de la escuadra avisa (si apunta al jugador)
Bus.on('tankAim',d=>{const a=d&&d.actor;if(!a||!a.pos)return;if(sndOn())Snd.play('turret',{pos:a.pos,by:a,dur:0.8,vol:0.8});
 if(d.target===Player&&Snd._now-(Snd._tkT||-99)>12){Snd._tkT=Snd._now;Voice.ally('tank');}Snd.tension=Math.min(1,Snd.tension+0.15);});
Bus.on('melee',d=>{if(!sndOn()||!d)return;if(sndIsP(d.by))Snd.play('knife',{hit:!!d.hit});else if(d.by&&d.by.pos)Snd.play('knife',{pos:d.by.pos,by:d.by,hit:!!d.hit});});
Bus.on('pickup',()=>{if(sndOn())Snd.play('pickup',{});});
Bus.on('ammo',()=>{if(sndOn())Snd.play('ammo',{});});
Bus.on('mount',()=>{if(sndOn())Snd.play('mount',{});});
Bus.on('dismount',()=>{if(sndOn())Snd.play('dismount',{});});
Bus.on('jump',d=>{if(sndOn()&&(!d||sndIsP(d.by)))Snd.play('jump',{});});
Bus.on('destroyed',d=>{if(sndOn()&&d&&d.pos)Snd.play('debris',{pos:d.pos});});
Bus.on('incoming',d=>{if(!d||!d.pos)return;Snd._incPos=d.pos;if(!sndOn())return;Snd.play('incoming',{pos:d.pos,dur:d.t||1.1});if(V3.dist(d.pos,Snd.L.pos)<60)Snd.tension=Math.min(1,Snd.tension+0.1);});
Bus.on('playerHurt',d=>{if(!sndOn()||Snd._now-Snd._hurtT<0.35)return;Snd._hurtT=Snd._now;Snd.play('hurt',{vol:clamp(0.5+((d&&d.dmg)||10)/60,0.5,1)});});
Bus.on('playerDied',()=>{if(sndOn())Snd.music('death');});
Bus.on('missionFailed',()=>{if(sndOn())Snd.music('death');});
Bus.on('missionComplete',()=>{if(sndOn())Snd.music('victory');Voice.stop();});
Bus.on('objectiveDone',()=>{if(sndOn()){Snd._odT=Snd._now;Snd.play('objective_done',{});}});
Bus.on('objective',()=>{if(sndOn()&&Snd._now-Snd._odT>2.5)Snd.play('objective',{});});
Bus.on('checkpoint',()=>{if(sndOn())Snd.play('checkpoint',{});});
Bus.on('settings',d=>{Snd.setVol();if(d&&(d.key==='lang'||d.key==='volVoice')){Voice.reset();if(d.key==='volVoice'&&!(d.value>0))Voice.stop();}});
// el audio sólo puede arrancar con un gesto del jugador (iOS: también al soltar el dedo); al volver a la pestaña se reanuda
if(typeof addEventListener==='function'){for(const ev of ['pointerdown','touchend','mousedown','keydown'])addEventListener(ev,()=>{Snd.init();Voice.unlock();},{capture:true,passive:true});
 if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Snd.ctx)Snd.resume();});}

// ---------- voces: gritos de combate (variantes ES/EN y alemán para el enemigo; cd = s sin repetir la misma clave) ----------
const CALLOUTS={
 grenade:{es:['¡Granada!','¡Granada, al suelo!','¡Cuidado, granada!'],en:['Grenade!','Grenade, get down!','Watch out, grenade!'],de:['Granate!','Achtung, Granate!','Handgranate!'],cd:3},
 throwing:{es:['¡Granada va!','¡Lanzo granada!'],en:['Frag out!','Throwing grenade!'],de:['Granate weg!','Werfe Granate!'],cd:4},
 reloading:{es:['¡Recargando!','¡Cubridme, recargo!','¡Sin balas, recargo!'],en:['Reloading!','Cover me, reloading!',"I'm out, reloading!"],de:['Nachladen!','Lade nach!','Gebt mir Deckung, lade nach!'],cd:6},
 enemySpotted:{es:['¡Enemigo a la vista!','¡Alemanes!','¡Ahí están!'],en:['Enemy spotted!','Germans!','There they are!'],de:['Amerikaner!','Da sind sie!','Feind gesichtet!'],cd:8},
 enemyLeft:{es:['¡Enemigo a la izquierda!','¡Por la izquierda!'],en:['Enemy left!','On the left!'],de:['Links!','Feind links!'],cd:6},
 enemyRight:{es:['¡Enemigo a la derecha!','¡Por la derecha!'],en:['Enemy right!','On the right!'],de:['Rechts!','Feind rechts!'],cd:6},
 contact:{es:['¡Contacto al frente!','¡Contacto!','¡Nos disparan!'],en:['Contact front!','Contact!','Taking fire!'],de:['Feindkontakt!','Feuer!','Achtung!'],cd:8},
 coverMe:{es:['¡Cubridme!','¡Fuego de cobertura!','¡Cúbreme, voy!'],en:['Cover me!','Covering fire!',"Cover me, I'm moving!"],de:['Feuerschutz!','Deckt mich!','Gebt mir Feuerschutz!'],cd:6},
 takeCover:{es:['¡A cubierto!','¡Buscad cobertura!'],en:['Take cover!','Find cover!'],de:['In Deckung!','Deckung!'],cd:6},
 getDown:{es:['¡Al suelo!','¡Agachaos!','¡Cuerpo a tierra!'],en:['Get down!','Heads down!','Hit the dirt!'],de:['Deckung!','Runter!','Kopf runter!'],cd:5},
 manDown:{es:['¡Hombre caído!','¡Le han dado!','¡Han herido a uno!'],en:['Man down!',"He's hit!",'We got a man down!'],de:['Mann am Boden!','Er ist getroffen!','Verwundeter!'],cd:5},
 medic:{es:['¡Sanitario!','¡Necesito un médico!'],en:['Medic!','I need a medic!'],de:['Sanitäter!','Sani!'],cd:8},
 clear:{es:['¡Despejado!','¡Zona despejada!','¡Todo limpio!'],en:['Clear!','Area clear!','All clear!'],de:['Alles klar!','Gesäubert!'],cd:6},
 moveUp:{es:['¡Adelante, adelante!','¡Avanzad!','¡Moveos!'],en:['Move up!','Go, go, go!','Keep moving!'],de:['Vorwärts!','Los, los!','Vorrücken!'],cd:6},
 follow:{es:['¡Seguidme!','¡Conmigo!'],en:['Follow me!','On me!'],de:['Mir nach!','Folgt mir!'],cd:5},
 flank:{es:['¡Flanqueadlos!','¡Rodeadlos por el lado!'],en:['Flank them!','Go around the side!'],de:['Flankieren!','Umgehen!'],cd:8},
 sniper:{es:['¡Francotirador!','¡Tirador en lo alto!','¡Cuidado, francotirador!'],en:['Sniper!','Sniper up high!','Watch it, sniper!'],de:['Scharfschütze!','Achtung, Scharfschütze!'],cd:8},
 mg:{es:['¡Ametralladora!','¡Nido de ametralladora!','¡Al suelo, la MG!'],en:['Machine gun!','MG nest!','Get down, MG!'],de:['MG, Feuer!','Maschinengewehr!'],cd:8},
 tank:{es:['¡Carro de combate!','¡Tanque!','¡Un panzer!'],en:['Tank!','Enemy armor!','Panzer!'],de:['Panzer!','Panzer, Achtung!'],cd:8},
 fire:{es:['¡Fuego!','¡Disparad!'],en:['Fire!','Open fire!'],de:['Feuer!','Feuer frei!','Schießt!'],cd:4},
 attack:{es:['¡Al ataque!','¡A por ellos!'],en:['Attack!','Get them!'],de:['Angriff!','Vorwärts!','Los, los, los!'],cd:6},
 alarm:{es:['¡Alarma!'],en:['Alarm!'],de:['Alarm!','Achtung!','Amerikaner!'],cd:6},
 halt:{es:['¡Alto!'],en:['Halt!'],de:['Halt!','Stehenbleiben!','Hände hoch!'],cd:6},
 retreat:{es:['¡Se retiran!','¡Huyen!'],en:["They're falling back!","They're running!"],de:['Rückzug!','Zurück!','Absetzen!'],cd:8},
 hit:{es:['¡Me han dado!','¡Agh!'],en:["I'm hit!",'Argh!'],de:['Ich bin getroffen!','Ahh!'],cd:4},
 niceShot:{es:['¡Buen tiro!','¡Le has dado!','¡Uno menos!'],en:['Nice shot!','Got him!','One less!'],cd:20},
 good:{es:['Buen trabajo, soldado.','Bien hecho.'],en:['Good work, soldier.','Well done.'],de:['Gut gemacht.'],cd:10},
 hurry:{es:['¡Rápido!','¡Daos prisa!'],en:['Hurry!','Move it!'],de:['Schnell!','Beeilung!'],cd:6}};
const VOICE_ALIAS={reload:'reloading',move:'moveUp',cover:'takeCover',spotted:'enemySpotted',left:'enemyLeft',right:'enemyRight',machinegun:'mg'};
// personajes: tono (p) y velocidad (r) de la voz; s elige otra voz del sistema si hay varias
const VOICE_CHAR={Hayes:{p:0.55,r:0.9,s:0},Russo:{p:1.05,r:1.24,s:1},Kowalski:{p:1.32,r:1.06,s:2},'Díaz':{p:0.88,r:1.12,s:1},Diaz:{p:0.88,r:1.12,s:1},
 Instructor:{p:0.62,r:0.96,s:0},Sargento:{p:0.62,r:0.96,s:0},radio:{p:0.9,r:1.05,s:2},narrator:{p:0.8,r:0.95,s:0},ally:{p:1,r:1.1,s:2},axis:{p:0.78,r:1.1,s:0}};
// voz de un personaje del reparto de las misiones (CAST[who].voice: pitch, rate) si no está en VOICE_CHAR
function voiceCast(who){const c=typeof CAST!=='undefined'&&CAST[who];if(!c||!c.voice)return null;const v=c.voice;let h=0;for(const ch of who)h=(h*31+ch.charCodeAt(0))>>>0;
 return VOICE_CHAR[who]={p:clamp(v.pitch||1,0.3,1.8)*0.85,r:v.rate||1,s:h%3};}
const VOICE_AXIS=/^(axis|german|germans|de|alem[aá]n|alemanes|enemy|feind)$/i;
const VOICE_MALE=new Set(['jorge','pablo','alvaro','álvaro','diego','enrique','carlos','raul','raúl','jordi','dario','darío','jose','josé','juan','gerardo','andres','andrés','daniel','oliver','george','ryan','guy',
 'thomas','arthur','christopher','eric','roger','andrew','brian','aaron','alex','tom','lee','reed','eddy','davis','tony','jason','male','hombre','masculino','stefan','markus','hans','conrad','klaus','yannick','killian','florian','jonas','ralf','männlich']);
const VOICE_JOKE=new Set(['albert','bahh','bells','boing','bubbles','cellos','deranged','hysterical','organ','pipeorgan','princess','trinoids','whisper','zarvox','fred','junior','kathy','ralph','jester','superstar','wobble','news','goodnews','badnews','grandma','grandpa','espeak']);
const sndVWords=v=>((v.name||'')+' '+(v.voiceURI||'')).toLowerCase().split(/[^a-záéíóúñüäöß]+/);
const sndLang=()=>typeof Settings!=='undefined'&&Settings.lang==='en'?'en':'es';
const sndTxt=x=>Array.isArray(x)?x[(Math.random()*x.length)|0]:x||'';
const Voice={q:[],busy:false,cur:null,curP:0,t0:0,watch:0,cd:{},spk:{},lastV:{},_vs:{},_unl:false,on:true,
 synth(){try{return typeof window!=='undefined'&&window.speechSynthesis||null;}catch(e){return null;}},
 voices(){const S=this.synth();try{return S&&S.getVoices()||[];}catch(e){return [];}},
 reset(){this._vs={};},
 // voces de un idioma por preferencia: acento (es-ES, en-US, de-DE), calidad, voz de hombre; sin voces de broma
 list(lang){const C=this._vs[lang];if(C&&C.length)return C;const all=this.voices();if(!all.length)return [];const re=new RegExp('^'+lang,'i'),pref={es:/^es[-_]ES/i,en:/^en[-_]US/i,de:/^de[-_]DE/i}[lang];
  const sc=v=>{const n=(v.name||'')+' '+(v.voiceURI||''),w=sndVWords(v);let s=0;if(pref&&pref.test(v.lang||''))s+=30;if(/natural|neural|online|premium|enhanced|wavenet|studio/i.test(n))s+=20;
   if(/google/i.test(n))s+=8;if(w.some(x=>VOICE_MALE.has(x)))s+=25;if(/eloquence/i.test(n))s-=25;return s;};
  return this._vs[lang]=all.filter(v=>re.test(v.lang||'')&&!sndVWords(v).some(x=>VOICE_JOKE.has(x))).sort((a,b)=>sc(b)-sc(a));},
 // ¿se puede decir en voz alta? (alemán sólo si hay voz alemana; si ya hay voces cargadas y ninguna del idioma, sólo subtítulo)
 _can(lang){if(!this.on||!this.synth()||!(Snd.vol.voice>0))return false;const all=this.voices();return lang==='de'?this.list('de').length>0:!all.length||this.list(lang).length>0;},
 _var(ck,arr){let i=(Math.random()*arr.length)|0;if(arr.length>1&&i===this.lastV[ck])i=(i+1)%arr.length;this.lastV[ck]=i;return arr[i];},
 // Voice.say(quién, clave[, texto {es,en,de?} o cadena]) — quién: 'Hayes'..., 'ally', 'axis'/'german' o un actor. Busca en LINES y luego en CALLOUTS.
 // Emite 'say' {who, key, text, de, actor} (subtítulo) y habla con SpeechSynthesis. Devuelve false si se descarta (repetido, lejos, sin texto).
 say(who,key,text){let actor=null;if(who&&typeof who==='object'){actor=who;who=who.team==='axis'?'axis':(who.name||'ally');}
  const lang=sndLang(),LS=typeof LINES!=='undefined'?LINES:null,line=!text&&LS&&key!=null?LS[key]||null:null;
  const cal=!text&&!line?CALLOUTS[key]||CALLOUTS[VOICE_ALIAS[key]]||null:null;
  if(!who&&line&&line.who)who=line.who;if(!who)who='ally';who=String(who);
  const axis=VOICE_AXIS.test(who)||!!(actor&&actor.team==='axis');
  // gritos lejanos: no se oyen
  if(actor&&actor.pos&&cal&&typeof Player!=='undefined'&&Player.pos&&V3.dist(actor.pos,Player.pos)>(axis?40:60))return false;
  let tx='',tr='';
  if(text){if(typeof text==='string')tx=text;else if(axis&&text.de){tx=sndTxt(text.de);tr=sndTxt(text[lang]||text.es||'');}else tx=sndTxt(text[lang]||text.es||text.en);}
  else if(line){if(axis&&line.de){tx=sndTxt(line.de);tr=sndTxt(line[lang]||line.es||'');}else tx=sndTxt(line[lang]||line.es||line.en||line.de);}
  else if(cal){const k=CALLOUTS[key]?key:VOICE_ALIAS[key],ck=(axis?'de:':'')+k,gk=axis?'_de':'_al',now=typeof performance!=='undefined'?performance.now()/1000:Date.now()/1000;
   if(now<(this.cd[ck]||0)||now<(this.cd[gk]||0)||now<(this.spk[actor?'#'+actor.id:who]||0))return false;
   const arr=axis?cal.de:cal[lang]||cal.es;if(!arr||!arr.length)return false;tx=this._var(ck,arr);if(axis)tr=cal[lang]?cal[lang][0]:'';
   this.cd[ck]=now+(cal.cd||5);this.cd[gk]=now+(axis?1.5:1.1);this.spk[actor?'#'+actor.id:who]=now+1.6;}
  else tx=key==null?'':String(key);
  if(!tx)return false;
  const cst=typeof CAST!=='undefined'&&CAST[who],name=axis?(lang==='en'?'German':'Alemán'):who==='ally'?(lang==='en'?'Soldier':'Soldado'):cst&&cst[lang]?cst[lang]:who==='Diaz'?'Díaz':who==='radio'?'Radio':who;
  Bus.emit('say',{who:name,key,text:tr&&tr!==tx?tx+' ('+tr+')':tx,de:axis,actor});
  const vl=axis?'de':lang;
  if(this._can(vl)){const pr=line||text?2:axis?0:1,now=typeof performance!=='undefined'?performance.now():Date.now();
   this.q.push({tx,lang:vl,who:VOICE_CHAR[who]||voiceCast(who)?who:axis?'axis':'ally',id:actor&&actor.id||0,pr,exp:now+(pr===2?15000:axis?1800:2600)});
   this.q.sort((a,b)=>b.pr-a.pr);if(this.q.length>5)this.q.length=5;
   if(this.busy&&pr===2&&this.curP<2)this._cancel(); // una frase del guion corta un grito
   this.pump();}
  return true;},
 // un compañero cercano grita la clave (el más cercano a pos, sin contar a 'skip')
 ally(key,pos,skip){if(typeof Actors==='undefined'||!Actors.list)return false;const p=pos||(typeof Player!=='undefined'?Player.pos:null);if(!p)return false;let b=null,bd=35;
  for(const a of Actors.list)if(a&&a!==skip&&a.alive&&a.team==='ally'&&!a.tank&&a.pos){const d=V3.dist(a.pos,p);if(d<bd){bd=d;b=a;}}return b?this.say(b,key):false;},
 pump(){const S=this.synth();if(!S)return;const now=typeof performance!=='undefined'?performance.now():Date.now();
  if(this.busy){let sp=true;try{sp=S.speaking||S.pending;}catch(e){}if(now>this.watch||(now-this.t0>600&&!sp))this._done(true);else return;}
  while(this.q.length&&this.q[0].exp<now)this.q.shift();if(!this.q.length)return;const it=this.q.shift();
  try{const u=new SpeechSynthesisUtterance(it.tx),C=VOICE_CHAR[it.who]||VOICE_CHAR.ally,L=this.list(it.lang),gen=it.who==='ally'||it.who==='axis',
    v=L.length?L[((gen?it.id:0)+(C.s||0))%Math.min(L.length,3)]:null;
   u.lang=v?v.lang:{es:'es-ES',en:'en-US',de:'de-DE'}[it.lang];if(v)u.voice=v;
   u.rate=clamp((it.lang==='es'?1.1:1.05)*C.r*(it.pr<2?1.08:1),0.5,2);u.pitch=clamp(C.p+(gen?((it.id%5)-2)*0.06:0),0,2);
   u.volume=clamp(Snd.vol.voice*Math.min(1,(Snd.vol.master==null?0.8:Snd.vol.master)*1.25),0,1);
   u.onstart=()=>{if(this.cur===u&&this.curP===2)Snd.duck(true);};u.onend=u.onerror=()=>{if(this.cur===u)this._done();};
   this.cur=u;this.curP=it.pr;this.busy=true;this.t0=now;this.watch=now+2000+it.tx.length*110;try{S.resume();}catch(e){}S.speak(u);}
  catch(e){this.busy=false;this.cur=null;}},
 _done(sync){this.busy=false;this.cur=null;Snd.duck(false);if(!sync)setTimeout(()=>this.pump(),0);},
 _cancel(){this.cur=null;this.busy=false;try{const S=this.synth();if(S)S.cancel();}catch(e){}},
 stop(){this.q.length=0;if(this.busy)this._cancel();Snd.duck(false);},
 update(){if(this.busy||this.q.length)this.pump();},
 // iOS: la voz también necesita un primer uso dentro de un gesto
 unlock(){if(this._unl)return;const S=this.synth();if(!S)return;this._unl=true;try{const u=new SpeechSynthesisUtterance(' ');u.volume=0;S.speak(u);}catch(e){}}};
try{const S=Voice.synth();if(S&&'onvoiceschanged' in S)S.addEventListener('voiceschanged',()=>Voice.reset());}catch(e){}
