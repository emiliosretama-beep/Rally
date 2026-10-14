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
