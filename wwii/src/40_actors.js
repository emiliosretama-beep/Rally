// ===== FRENTE 44 · soldados y vehículos: modelos por piezas instanciadas, animación procedimental, zonas de impacto, muerte =====
// Soldado = esqueleto de 17 huesos (raíz, cadera, torso, cabeza, brazos y piernas de 3 piezas, arma). La pose se calcula del estado a.anim:
// marcha con fase y zancada, agachado con una rodilla en tierra, torso y cabeza que siguen la puntería, brazos y piernas con IK de dos
// huesos (manos en el arma, pies en el suelo), retroceso, recarga, cerrojo, lanzamiento, sacudida y muertes por fotogramas clave.
// Aspectos (look): us, para, usw (aliados) · de, deo (oficial), dew (nieve), desn (francotirador). Sin insignias ni símbolos.
// Dibujo: una llamada instanciada (uInst=2) por tipo de pieza para todos. Carros: Panzer IV ('pz4'), Tiger ('tiger') y semioruga ('ht').
const ACT_PK={head:4,torso:1,arm:0.75,leg:0.75};
const ACT_WPN={axis:{rifle:'kar98',smg:'mp40',mg:'mg42mount',officer:'mp40',sniper:'kar98s',assault:'stg44'},
 ally:{rifle:'garand',smg:'thompson',mg:'bar',officer:'thompson',sniper:'garand',bazooka:'bazooka'}};
const ACT_SKIN=['#e6bc9a','#dcab86','#cf9b74','#c48d67','#b57f5a','#a06d4c','#ebc6a6','#d6a47e','#8c5c3e','#f0cdb0'].map(hex);
// paletas: jk chaqueta, pt pantalón, bt botas, lg polainas, wb correaje, hl casco, pk mochila, sh camisa/cuello, lt cuero
const ACT_LOOK={
 us:{team:'ally',jk:'#8b7f5a',pt:'#625f49',bt:'#4f3828',lg:'#a69b74',wb:'#90875f',hl:'#4d5337',pk:'#7f7759',sh:'#5e5944',helm:'m1'},
 para:{team:'ally',jk:'#90885f',pt:'#8a835d',bt:'#5c3c27',wb:'#8c8460',hl:'#465036',pk:'#78704f',sh:'#6a6450',helm:'m1n',para:1},
 usw:{team:'ally',jk:'#5c5541',pt:'#5c5946',bt:'#4a3627',lg:'#958b68',wb:'#888059',hl:'#4d5337',pk:'#77705a',sh:'#4e493b',helm:'m1n',coat:1,glove:'#3d3a31',scarf:'#5c5442'},
 de:{team:'axis',jk:'#5f6553',pt:'#5d6157',bt:'#1f1c19',lt:'#25221e',hl:'#50564f',col:'#4c5345',bb:'#6e674a',helm:'de'},
 deo:{team:'axis',jk:'#686d5e',pt:'#5d6157',bt:'#161514',lt:'#4d3322',hl:'#60665a',col:'#3d4a3b',helm:'cap',coat:1,off:1},
 dew:{team:'axis',jk:'#dcdfd9',pt:'#d4d7d1',bt:'#1f1c19',lt:'#2a2722',hl:'#d6d9d3',col:'#c9cdc6',bb:'#7a7458',helm:'dew',smock:1,glove:'#5f5f59'},
 desn:{team:'axis',jk:'#8a8564',pt:'#5d6157',bt:'#1f1c19',lt:'#25221e',hl:'#6a6a4c',col:'#4c5345',bb:'#6e674a',helm:'decov',camo:['#8a8564','#56653f','#6e5537','#9b946d','#47523a']}
};
// huesos
const BR=0,BH=1,BT=2,BHd=3,BUL=4,BFL=5,BKL=6,BUR=7,BFR=8,BKR=9,BTL=10,BSL=11,BPL=12,BTR=13,BSR=14,BPR=15,BW=16,ACT_NB=17;
// armas en mano: modelo, tipo de agarre (rifle | pistol | mg | tube), muñecas (rh, lh) y boca, en el espacio del arma (origen en la culata)
const ACT_GUN={garand:{m:'w_garand',h:'rifle',rh:[-0.012,-0.03,0.25],lh:[0.012,-0.0,0.56],muz:[0,0.035,1.1],ej:[-0.03,0.05,0.42]},
 kar98:{m:'w_kar98',h:'rifle',rh:[-0.012,-0.03,0.25],lh:[0.012,-0.0,0.56],muz:[0,0.035,1.11],ej:[-0.03,0.05,0.42],bolt:[-0.07,0.04,0.42]},
 kar98s:{m:'w_kar98s',h:'rifle',rh:[-0.012,-0.03,0.25],lh:[0.012,-0.0,0.56],muz:[0,0.035,1.11],ej:[-0.03,0.05,0.42],bolt:[-0.07,0.04,0.42],scope:[0,0.09,0.64]},
 thompson:{m:'w_thompson',h:'rifle',rh:[-0.012,-0.05,0.31],lh:[0.012,-0.03,0.6],muz:[0,0.03,0.85],ej:[-0.03,0.05,0.42]},
 mp40:{m:'w_mp40',h:'rifle',rh:[-0.012,-0.05,0.31],lh:[0.01,-0.1,0.45],muz:[0,0.025,0.83],ej:[-0.03,0.04,0.42]},
 stg44:{m:'w_stg44',h:'rifle',rh:[-0.012,-0.05,0.31],lh:[0.012,-0.02,0.64],muz:[0,0.03,0.94],ej:[-0.03,0.05,0.42]},
 bar:{m:'w_bar',h:'rifle',rh:[-0.012,-0.06,0.31],lh:[0.012,-0.02,0.7],muz:[0,0.03,1.2],ej:[-0.03,0.05,0.45]},
 mg42mount:{m:'w_mg42',h:'mg',rh:[-0.012,-0.06,0.31],lh:[0.03,0.09,0.72],muz:[0,0.03,1.22],ej:[0,-0.03,0.42]},
 colt:{m:'w_pistol',h:'pistol',rh:[0,-0.035,-0.02],lh:[0.03,-0.05,-0.01],muz:[0,0.02,0.18]},
 bazooka:{m:'w_bazooka',h:'tube',rh:[-0.01,-0.11,0.02],lh:[0.01,-0.11,0.34],muz:[0,0,0.78]}};
ACT_GUN.mg42=ACT_GUN.mg42mount;
const ACT_DEF_GRIP={rh:[-0.012,-0.03,0.25],lh:[0.012,0,0.56],muz:[0,0.035,1.0],h:'rifle',m:'w_garand'};

// ---------- utilidades de geometría ----------
// anillos octogonales (esquinas achaflanadas) unidos de abajo arriba. L=[[y, medio ancho x, medio fondo z, chaflán, desplaz. z], ...]
function aLoft(g,L,col,capB,capT){const R=L.map(([y,hx,hz,k,o])=>{k=k==null?0.38:k;o=o||0;const ax=hx*k,az=hz*k;
  return [[hx,y,o+az],[hx-ax,y,o+hz],[ax-hx,y,o+hz],[-hx,y,o+az],[-hx,y,o-az],[ax-hx,y,o-hz],[hx-ax,y,o-hz],[hx,y,o-az]];}),cf=i=>typeof col==='function'?col(i):col;
 for(let i=0;i<R.length-1;i++){const c=cf(i),ct=[0,(L[i][0]+L[i+1][0])/2,((L[i][4]||0)+(L[i+1][4]||0))/2];
  for(let j=0;j<8;j++){const j1=(j+1)&7;g.quad(R[i][j],R[i][j1],R[i+1][j1],R[i+1][j],c,ct);}}
 const cap=(r,y,o,c,up)=>{for(let j=0;j<8;j++)g.tri([0,y,o],r[j],r[(j+1)&7],c,[0,y+(up?-1:1),o]);};
 if(capB!==false)cap(R[0],L[0][0],L[0][4]||0,cf(0),false);
 if(capT!==false){const n=L.length-1;cap(R[n],L[n][0],L[n][4]||0,cf(n-1),true);}}
// correa de ancho w y grosor t que sigue los puntos sobre el cuerpo (la normal sale del eje del torso; arriba, hacia el cielo)
function aStrap(g,P,w,t,col){for(let i=0;i<P.length-1;i++){const a=P[i],b=P[i+1],d=V3.norm(V3.sub(b,a)),m=V3.lerp(a,b,0.5),n=V3.norm([m[0]*0.5,Math.max(0,m[1]-0.42)*4,m[2]]);
  const s=V3.norm(V3.cross(d,n)),c=(p,i,j)=>[p[0]+s[0]*i*w/2+n[0]*j*t/2,p[1]+s[1]*i*w/2+n[1]*j*t/2,p[2]+s[2]*i*w/2+n[2]*j*t/2];
  g.hexa([c(a,-1,-1),c(a,1,-1),c(a,1,1),c(a,-1,1),c(b,-1,-1),c(b,1,-1),c(b,1,1),c(b,-1,1)],col);}}
// barra que se estrecha a lo largo de z (culatas, guardamanos): sección [y0,y1,hx] al principio y al final
function aBar(g,z0,z1,a,b,col){const [ya0,ya1,ax]=a,[yb0,yb1,bx]=b;g.hexa([[-ax,ya0,z0],[ax,ya0,z0],[bx,yb0,z1],[-bx,yb0,z1],[-ax,ya1,z0],[ax,ya1,z0],[bx,yb1,z1],[-bx,yb1,z1]],col);}
// cilindro de radio r entre dos puntos (cantimploras, rollos) — atajo de Geo.tube
const aTube=(g,a,b,r0,r1,seg,col)=>g.tube(a,b,r0,r1==null?r0:r1,seg||8,col);
// bolsillo con tapa sobre el pecho (x centro, y abajo, z delante)
function aPocket(g,x,y,z,w,h,col,flap){g.box(x-w/2,x+w/2,y,y+h,z-0.012,z+0.006,col);g.box(x-w/2-0.004,x+w/2+0.004,y+h-0.03,y+h+0.004,z-0.01,z+0.011,flap||col);}

// ---------- piezas del soldado (geometría en el espacio de su hueso; +X izquierda del modelo, +Z delante) ----------
const AP={
 hips(g,C){const pt=hex(C.pt);aLoft(g,[[-0.13,0.152,0.108],[-0.03,0.17,0.122],[0.09,0.168,0.118]],pt);
  if(C.coat)aLoft(g,[[-0.58,0.25,0.215,0.3],[-0.3,0.21,0.17,0.35],[-0.02,0.18,0.128]],mixC(C.jk,'#000',0.04),true,false);
  else if(C.smock)aLoft(g,[[-0.22,0.2,0.145],[0.0,0.182,0.128]],hex(C.jk),true,false);},
 thigh(g,C,s){const pt=hex(C.pt);if(C.off)aLoft(g,[[-0.47,0.062,0.066],[-0.33,0.09,0.095],[-0.1,0.104,0.104],[0.03,0.09,0.096]],pt);
  else aLoft(g,[[-0.47,0.064,0.068],[-0.24,0.075,0.08],[0.03,0.09,0.096]],pt);
  if(C.para){const x=s*0.075;g.bbox(Math.min(x,x+s*0.04),Math.max(x,x+s*0.04),-0.33,-0.12,-0.06,0.06,0.012,mixC(C.pt,'#000',0.06));}},
 shin(g,C){const pt=hex(C.pt),bt=hex(C.bt);
  if(C.team==='axis'){aLoft(g,[[-0.14,0.062,0.066],[0.02,0.068,0.072]],pt);aLoft(g,[[-0.46,0.06,0.068],[-0.3,0.063,0.071],[-0.12,0.073,0.08]],bt);
   g.box(-0.074,0.074,-0.135,-0.115,-0.081,0.081,mixC(bt,'#fff',0.06));}
  else if(C.para){aLoft(g,[[-0.29,0.062,0.066],[-0.24,0.078,0.082],[-0.1,0.066,0.07],[0.02,0.07,0.074]],pt);aLoft(g,[[-0.46,0.057,0.063],[-0.28,0.062,0.067]],bt);
   for(let i=0;i<4;i++)g.box(-0.02,0.02,-0.44+i*0.04,-0.433+i*0.04,0.06,0.07,hex('#2b2118'));}
  else{aLoft(g,[[-0.24,0.058,0.062],[0.02,0.07,0.074]],pt);aLoft(g,[[-0.46,0.064,0.068],[-0.21,0.068,0.072]],hex(C.lg));
   for(let i=0;i<4;i++){const y=-0.43+i*0.055;g.box(0.06,0.072,y,y+0.012,-0.02,0.02,hex('#3a3428'));}}},
 foot(g,C){const bt=hex(C.bt);g.rbox(-0.048,0.048,-0.085,0.035,-0.075,0.165,0.03,bt,2);g.box(-0.05,0.05,-0.095,-0.075,-0.08,0.17,mixC(bt,'#000',0.4));},
 armU(g,C){aLoft(g,[[-0.29,0.05,0.053],[-0.12,0.057,0.06],[0.03,0.07,0.074]],hex(C.jk));},
 armF(g,C){const jk=hex(C.jk);aLoft(g,[[-0.25,0.043,0.046],[-0.15,0.049,0.052],[0.02,0.054,0.057]],jk);
  aLoft(g,[[-0.255,0.047,0.05],[-0.22,0.048,0.051]],C.coat||C.smock?mixC(jk,'#000',0.12):mixC(jk,'#000',0.08),true,true);},
 hand(g){const s=[0.94,0.94,0.94];g.rbox(-0.038,0.038,-0.095,0.0,-0.026,0.026,0.018,s,2);g.rbox(0.02,0.042,-0.06,-0.015,-0.005,0.03,0.01,s,1);},
 glove(g,C){const s=hex(C.glove);g.rbox(-0.04,0.04,-0.098,0.01,-0.028,0.028,0.018,s,2);g.rbox(0.02,0.044,-0.062,-0.015,-0.005,0.032,0.01,s,1);},
 // cabezas: v 0 normal, 1 bigote, 2 mandíbula ancha con barba de días
 head(g,C,v){const s=[0.95,0.95,0.95],brow=[0.36,0.28,0.22],dk=[0.12,0.11,0.1],jw=v===2?0.08:0.07;
  aLoft(g,[[0,0.05,0.052,0.4],[0.06,0.053,0.057,0.4,0.005],[0.075,jw,0.075,0.45,0.016],[0.12,0.083,0.095,0.45,0.01],[0.17,0.086,0.1,0.45,0.0],[0.215,0.076,0.09,0.45,-0.006],[0.245,0.042,0.05,0.4,-0.012]],
   i=>v===2&&i<3?[0.82,0.8,0.78]:s);
  g.hexa([[-0.014,0.1,0.106],[0.014,0.1,0.106],[0.01,0.1,0.128],[-0.01,0.1,0.128],[-0.011,0.158,0.104],[0.011,0.158,0.104],[0.007,0.11,0.13],[-0.007,0.11,0.13]],s); // nariz
  for(const x of [-1,1]){g.box(x*0.022-0.017,x*0.022+0.017,0.163,0.173,0.093,0.104,brow);g.box(x*0.032-0.011,x*0.032+0.011,0.142,0.153,0.092,0.1,dk);
   g.box(x*0.086-0.008,x*0.086+0.008,0.11,0.165,-0.012,0.028,[0.88,0.85,0.83]);}
  g.box(-0.026,0.026,0.083,0.09,0.082,0.093,[0.6,0.42,0.38]);
  if(v===1)g.box(-0.03,0.03,0.093,0.104,0.088,0.106,brow);
  g.box(-0.08,0.08,0.13,0.205,-0.1,-0.02,brow);}, // pelo de la nuca y las sienes (se ve bajo el casco)
 // cascos (en el espacio de la cabeza)
 m1(g,C,net){const hl=hex(C.hl),dk=mixC(hl,'#000',0.25),m=g.mark();
  g.lathe([[0.17,0],[0.174,0.012],[0.159,0.02],[0.153,0.05],[0.143,0.09],[0.119,0.125],[0.081,0.15],[0.036,0.162],[0,0.165]],14,i=>net&&i>2&&i%2?dk:hl);
  g.cyl(0.165,0.165,-0.004,0.004,14,mixC(hl,'#000',0.4));g.scale(m,1,1,1.12);g.translate(m,0,0.158,0.005);g.vary(m,mulberry32(7),0.08);
  const st=hex('#5a5541');for(const s of [-1,1])aStrap(g,[[s*0.158,0.165,0.02],[s*0.13,0.09,0.045],[s*0.1,0.06,0.06]],0.018,0.008,st);
  if(net){const rnd=mulberry32(3),bur=[hex('#7d6d4a'),hex('#4f5a35'),hex('#5e5232')];for(let i=0;i<9;i++){const a=rnd()*6.28,r=0.08+rnd()*0.07,y=0.16+0.14*(1-r/0.16);
   const x=Math.sin(a)*r,z=Math.cos(a)*r*1.1,s=0.022+rnd()*0.018;g.box(x-s,x+s,y-0.006,y+0.022,z-s*0.6,z+s*0.6,bur[i%3]);}}},
 de(g,C,cover){const hl=hex(C.hl),m=g.mark();
  g.lathe([[0.19,-0.065],[0.176,-0.022],[0.158,0.02],[0.152,0.05],[0.147,0.1],[0.124,0.15],[0.08,0.185],[0.032,0.198],[0,0.2]],16,hl);
  g.xform(m,(v,isN)=>{if(isN||v[1]>0.035)return v;const f=Math.pow(clamp(v[2]/0.16,0,1),1.5),k=1-0.13*f;return [v[0]*k,v[1]+f*0.075,v[2]*k];});
  g.scale(m,1,1,1.1);g.translate(m,0,0.13,-0.005);
  if(cover){const rnd=mulberry32(5),cc=C.camo?C.camo.map(hex):[hl];for(let i=m;i<g.c.length;i+=9){const c=cc[(rnd()*cc.length)|0];for(let j=0;j<9;j+=3){g.c[i+j]=c[0];g.c[i+j+1]=c[1];g.c[i+j+2]=c[2];}}
   for(let i=0;i<8;i++){const a=rnd()*6.28,x=Math.sin(a)*0.12,z=Math.cos(a)*0.13,s=0.02+rnd()*0.02;g.box(x-s,x+s,0.255,0.29+rnd()*0.03,z-s*0.5,z+s*0.5,cc[1]);}}
  else if(C.helm==='dew'){const rnd=mulberry32(9),gr=hex('#8d918a');for(let i=m;i<g.c.length;i+=9)if(rnd()<0.22)for(let j=0;j<9;j+=3){g.c[i+j]=gr[0];g.c[i+j+1]=gr[1];g.c[i+j+2]=gr[2];}}
  else g.vary(m,mulberry32(4),0.05);
  for(const s of [-1,1]){const k=g.mark();g.cyl(0.012,0.012,0,0.012,6,mixC(hl,'#000',0.3));g.xform(k,rotZ(s*Math.PI/2,s*0.152,0.215,-0.01));}
  for(const s of [-1,1])aStrap(g,[[s*0.15,0.12,0.0],[s*0.08,0.03,0.07],[0,0.01,0.08]],0.014,0.006,hex('#26231f'));},
 cap(g,C){const hl=hex(C.hl),band=hex(C.col),m=g.mark();g.cyl(0.113,0.115,0.155,0.205,14,band);
  g.lathe([[0.115,0.2],[0.15,0.235],[0.152,0.25],[0,0.258]],14,hl);
  g.xform(m,(v,isN)=>isN||v[1]<0.21?v:[v[0],v[1]+Math.max(0,v[2]/0.15)*0.035,v[2]]);g.scale(m,1,1,1.08);
  g.box(-0.07,0.07,0.192,0.198,0.112,0.126,hex('#b9bbb5'));g.box(-0.012,0.012,0.168,0.185,0.118,0.13,hex('#9a9c96'));
  const vz=hex('#141312');for(let i=0;i<6;i++){const a0=-1+i/6*2,a1=-1+(i+1)/6*2,p=(a,r,y)=>[Math.sin(a)*r,y,Math.cos(a)*r*1.08];
   g.quad(p(a0,0.113,0.16),p(a1,0.113,0.16),p(a1,0.175,0.14),p(a0,0.175,0.14),vz,[0,0.3,0]);}},
 // torsos (en el espacio del torso: origen en la cintura)
 torsoUS(g,C){const jk=hex(C.jk),wb=hex(C.wb),dk=mixC(jk,'#000',0.3),wb2=mixC(wb,'#000',0.1),coat=C.coat;
  aLoft(g,[[coat?-0.22:-0.17,coat?0.19:0.172,coat?0.135:0.122],[-0.02,0.166,0.116],[0.14,0.18,0.126],[0.3,0.19,0.132],[0.41,0.19,0.118,0.45],[0.47,0.155,0.1,0.5],[0.52,0.07,0.068,0.4]],jk);
  aLoft(g,[[0.47,0.078,0.078,0.4,0.004],[0.535,0.071,0.071,0.4,0.004]],coat?hex(C.scarf):hex(C.sh),false,false);
  for(const s of [-1,1])g.hexa([[s*0.03,0.42,0.112],[s*0.09,0.43,0.098],[s*0.085,0.5,0.07],[s*0.035,0.5,0.078],[s*0.03,0.42,0.124],[s*0.09,0.43,0.11],[s*0.085,0.5,0.082],[s*0.035,0.5,0.09]],coat?jk:mixC(jk,'#000',0.08));
  if(coat){for(const s of [-1,1])for(let i=0;i<3;i++)g.box(s*0.07-0.009,s*0.07+0.009,0.1+i*0.1,0.118+i*0.1,0.124,0.136,dk);}
  else{for(let i=0;i<4;i++)g.box(-0.008,0.008,0.08+i*0.09,0.095+i*0.09,0.122,0.134,dk);for(const s of [-1,1])g.box(s*0.13-0.004,s*0.13+0.004,0.02,0.15,0.112,0.13,dk);}
  // canana con cargadores, botiquín y cantimplora
  aLoft(g,[[-0.012,coat?0.188:0.176,coat?0.136:0.126],[0.05,coat?0.19:0.179,coat?0.138:0.129]],wb);
  for(const s of [-1,1])for(let i=0;i<3;i++){const x=s*(0.05+i*0.044);g.bbox(x-0.019,x+0.019,-0.008,0.062,0.124,0.152,0.005,wb2);g.box(x-0.004,x+0.004,0.035,0.05,0.151,0.155,hex('#6b6545'));}
  g.bbox(-0.18,-0.14,-0.008,0.06,-0.05,0.07,0.005,wb2);g.bbox(0.14,0.18,-0.008,0.06,-0.05,0.07,0.005,wb2);
  const c=g.mark();g.lathe([[0,-0.075],[0.05,-0.07],[0.055,-0.03],[0.052,0.05],[0.03,0.065],[0,0.07]],8,hex('#5b5a41'));g.scale(c,1,1,0.65);g.translate(c,-0.15,-0.1,-0.08);
  // tirantes
  for(const s of [-1,1])aStrap(g,[[s*0.085,0.05,0.13],[s*0.1,0.3,0.138],[s*0.11,0.455,0.07],[s*0.105,0.47,-0.04],[s*0.09,0.3,-0.132],[s*0.085,0.05,-0.13]],0.03,0.01,wb);},
 torsoDE(g,C){const jk=hex(C.jk),lt=hex(C.lt),dk=mixC(jk,'#000',0.22),sm=C.smock,coat=C.coat;
  if(sm)aLoft(g,[[-0.24,0.2,0.145],[-0.05,0.185,0.135],[0.15,0.196,0.138],[0.32,0.2,0.136],[0.42,0.198,0.12,0.45],[0.48,0.16,0.104,0.5],[0.53,0.074,0.07,0.4]],jk);
  else aLoft(g,[[coat?-0.22:-0.2,coat?0.19:0.182,coat?0.134:0.13],[-0.06,0.168,0.118],[0.12,0.18,0.126],[0.3,0.19,0.132],[0.41,0.19,0.118,0.45],[0.47,0.155,0.1,0.5],[0.515,0.07,0.068,0.4]],
   C.camo?(()=>{const r=mulberry32(11),cc=C.camo.map(hex);return ()=>cc[(r()*cc.length)|0];})():jk);
  if(C.camo){const r=mulberry32(12),cc=C.camo.map(hex);for(let i=0;i<g.c.length;i+=9){const c=cc[(r()*cc.length)|0];for(let j=0;j<9;j+=3){g.c[i+j]=c[0];g.c[i+j+1]=c[1];g.c[i+j+2]=c[2];}}}
  if(sm){const k=g.mark();g.rbox(-0.12,0.12,0.38,0.5,-0.16,-0.08,0.04,mixC(jk,'#000',0.05),2,0.01);g.vary(k,mulberry32(2),0.04);}
  else aLoft(g,[[0.47,0.078,0.078,0.4,0.006],[0.55,0.072,0.072,0.4,0.006]],hex(C.col),false,false);
  if(coat){for(const s of [-1,1]){g.hexa([[s*0.02,0.3,0.13],[s*0.13,0.36,0.128],[s*0.12,0.5,0.08],[s*0.05,0.5,0.085],[s*0.02,0.3,0.142],[s*0.13,0.36,0.14],[s*0.12,0.5,0.092],[s*0.05,0.5,0.097]],hex(C.col));
    for(let i=0;i<3;i++)g.box(s*0.075-0.009,s*0.075+0.009,0.06+i*0.1,0.078+i*0.1,0.124,0.137,hex('#8f918a'));}}
  else if(!sm){for(const s of [-1,1]){aPocket(g,s*0.09,0.22,0.136,0.075,0.1,jk,dk);aPocket(g,s*0.11,-0.18,0.128,0.085,0.1,jk,dk);}
   for(let i=0;i<5;i++)g.box(-0.008,0.008,-0.14+i*0.1,-0.125+i*0.1,0.124,0.136,hex('#7d8178'));}
  // cinturón, hebilla lisa y cartucheras (el oficial: cuero marrón y funda de pistola)
  const bz=coat?0.137:sm?0.14:0.129;aLoft(g,[[-0.035,coat?0.193:sm?0.192:0.179,bz],[0.012,coat?0.195:sm?0.194:0.181,bz+0.002]],lt);
  g.box(-0.028,0.028,-0.036,0.014,bz-0.004,bz+0.008,hex(C.off?'#8a7f62':'#7e807b'));
  if(C.off){g.bbox(0.12,0.18,-0.12,0.0,0.0,0.1,0.01,lt);aStrap(g,[[-0.1,0.0,0.14],[-0.12,0.3,0.142],[-0.12,0.46,0.07],[-0.11,0.47,-0.05],[-0.06,0.25,-0.135],[0.05,0.0,-0.14]],0.03,0.008,lt);return;}
  for(const s of [-1,1])for(let i=0;i<3;i++){const x=s*(0.055+i*0.041);g.bbox(x-0.02,x+0.02,-0.032,0.05,bz-0.006,bz+0.034,0.006,lt);}
  // correaje en Y, panera, cantimplora, lata de la máscara de gas y pala
  for(const s of [-1,1])aStrap(g,[[s*0.1,0.04,bz],[s*0.11,0.3,0.14],[s*0.11,0.46,0.07],[s*0.1,0.48,-0.04],[s*0.04,0.3,-0.132]],0.034,0.011,lt);
  aStrap(g,[[0,0.31,-0.134],[0,0.0,-bz]],0.034,0.011,lt);
  const bb=hex(C.bb),b=g.mark();g.rbox(-0.2,-0.05,-0.23,-0.04,-0.165,-0.085,0.025,bb,2,0.008);g.box(-0.2,-0.05,-0.08,-0.035,-0.17,-0.08,mixC(bb,'#000',0.15));g.vary(b,mulberry32(6),0.04);
  const c=g.mark();g.lathe([[0,-0.07],[0.046,-0.065],[0.05,-0.03],[0.048,0.04],[0.028,0.06],[0,0.065]],8,hex('#6a5a42'));g.cyl(0.03,0.03,0.06,0.085,8,hex('#2a2a27'));g.scale(c,1,1,0.7);g.translate(c,-0.12,-0.12,-0.2);
  const gm=g.mark(),gp=[];for(let i=0;i<=8;i++)gp.push([i%2?0.057:0.052,-0.13+i*0.033]);gp.unshift([0,-0.13]);gp.push([0.05,0.142],[0,0.145]);g.lathe(gp,10,hex(sm?'#6f7466':'#545b4c'));
  g.xform(gm,rotZ(0.22,0.06,-0.04,-0.19));
  g.bbox(0.13,0.185,-0.27,-0.02,-0.11,-0.02,0.008,lt);aTube(g,[0.17,-0.03,-0.04],[0.17,0.06,-0.04],0.014,0.014,6,hex('#5c4a33'));},
 // equipo opcional (en el espacio del torso)
 pack(g,C){const pk=hex(C.pk),k=g.mark();g.rbox(-0.13,0.13,0.1,0.41,-0.23,-0.13,0.03,pk,2,0.01);g.box(-0.13,0.13,0.3,0.42,-0.235,-0.125,mixC(pk,'#000',0.1));g.vary(k,mulberry32(8),0.04);
  g.bbox(-0.05,0.05,-0.15,0.1,-0.25,-0.205,0.01,hex('#5a5843'));g.box(-0.012,0.012,-0.2,-0.15,-0.24,-0.215,hex('#4e3a28'));},
 roll(g,C){aTube(g,[-0.19,0.47,-0.17],[0.19,0.47,-0.17],0.06,0.06,8,hex(C.team==='ally'?'#6f6a55':'#4f5446'));for(const s of [-1,1])aTube(g,[s*0.12,0.468,-0.17],[s*0.135,0.468,-0.17],0.064,0.064,8,hex('#3a3428'));},
 zelt(g){const k=g.mark();aTube(g,[-0.17,0.3,-0.19],[0.17,0.3,-0.19],0.045,0.045,8,hex('#5d6447'));g.vary(k,mulberry32(1),0.08);},
 ammo(g){const br=hex('#b08a42'),r=mulberry32(4);for(let i=0;i<14;i++){const t=i/13,x=0.15-t*0.31,y=0.47-Math.sin(t*Math.PI)*0.36,z=0.135+Math.sin(t*Math.PI)*0.025;g.box(x-0.013,x+0.013,y-0.03,y+0.03,z-0.01,z+0.012,mixC(br,'#000',r()*0.2));}
  for(let i=0;i<10;i++){const t=i/9,x=0.15-t*0.3,y=0.47-Math.sin(t*Math.PI)*0.3,z=-0.14-Math.sin(t*Math.PI)*0.02;g.box(x-0.013,x+0.013,y-0.03,y+0.03,z-0.012,z+0.01,mixC(br,'#000',r()*0.2));}},
 binos(g){const d=hex('#1d1c1a');aTube(g,[0.03,0.25,0.14],[0.03,0.36,0.15],0.022,0.02,6,d);aTube(g,[-0.03,0.25,0.14],[-0.03,0.36,0.15],0.022,0.02,6,d);aStrap(g,[[0.03,0.36,0.15],[0.06,0.49,0.05]],0.012,0.005,d);},
 glint(g){const c=[1,1,1];g.quad([0,-0.07,0],[0.07,0,0],[0,0.07,0],[-0.07,0,0],c,false);g.quad([0,-0.015,0],[0.2,0,0],[0,0.015,0],[-0.2,0,0],c,false);g.quad([-0.015,0,0],[0,0.2,0],[0.015,0,0],[0,-0.2,0],c,false);}
};
// armas en el mundo (1:1; origen en la culata, +Z hacia la boca)
const AW={
 w_garand(g){const wd=hex('#6d4a2b'),mt=hex('#363936'),k=g.mark();aBar(g,0,0.33,[-0.085,0.03,0.022],[-0.04,0.028,0.019],wd);aBar(g,0.33,0.52,[-0.045,0.03,0.02],[-0.03,0.035,0.02],wd);
  g.box(-0.021,0.021,-0.005,0.048,0.3,0.53,mt);aBar(g,0.52,0.84,[-0.03,0.028,0.019],[-0.022,0.024,0.017],wd);g.box(-0.016,0.016,0.028,0.046,0.54,0.8,wd);
  aTube(g,[0,0.033,0.52],[0,0.033,1.1],0.009,0.008,6,mt);aTube(g,[0,0.012,0.8],[0,0.012,1.06],0.007,0.007,5,mt);g.box(-0.004,0.004,0.04,0.062,1.05,1.07,mt);g.box(-0.01,0.01,0.046,0.068,0.47,0.5,mt);
  g.box(-0.004,0.004,-0.06,-0.025,0.33,0.39,mt);aStrap(g,[[0,-0.09,0.08],[0,-0.13,0.4],[0,-0.04,0.8]],0.02,0.006,hex('#5f5a3f'));g.vary(k,mulberry32(1),0.04);},
 w_kar98(g,scope){const wd=hex('#5c3a22'),mt=hex('#262729'),k=g.mark();aBar(g,0,0.3,[-0.08,0.025,0.021],[-0.045,0.027,0.017],wd);aBar(g,0.3,0.5,[-0.05,0.028,0.019],[-0.03,0.032,0.019],wd);
  g.box(-0.018,0.018,0.0,0.046,0.3,0.52,mt);aBar(g,0.5,0.86,[-0.03,0.026,0.018],[-0.02,0.022,0.015],wd);g.box(-0.014,0.014,0.026,0.04,0.55,0.84,wd);
  aTube(g,[0,0.033,0.5],[0,0.033,1.11],0.009,0.008,6,mt);g.box(-0.016,0.016,-0.02,0.04,0.84,0.88,mt);g.box(-0.016,0.016,-0.02,0.04,0.66,0.68,mt);g.box(-0.005,0.005,0.04,0.06,1.08,1.1,mt);
  aTube(g,[-0.015,0.035,0.42],[-0.06,0.0,0.42],0.006,0.006,5,mt);
  const s=g.mark();g.sphere(0.012,6,3,mt);g.translate(s,-0.065,-0.005,0.42);g.box(-0.004,0.004,-0.055,-0.02,0.33,0.39,mt);
  aStrap(g,[[0.022,-0.08,0.08],[0.024,-0.12,0.4],[0.022,-0.03,0.7]],0.02,0.006,hex('#2e2a24'));
  if(scope){aTube(g,[0,0.09,0.3],[0,0.09,0.62],0.017,0.017,8,mt);aTube(g,[0,0.09,0.24],[0,0.09,0.3],0.024,0.018,8,mt);aTube(g,[0,0.09,0.62],[0,0.09,0.66],0.018,0.025,8,mt);
   g.box(-0.008,0.008,0.04,0.075,0.35,0.37,mt);g.box(-0.008,0.008,0.04,0.075,0.55,0.57,mt);}g.vary(k,mulberry32(2),0.04);},
 w_kar98s(g){AW.w_kar98(g,true);},
 w_thompson(g){const wd=hex('#74502e'),mt=hex('#2c2d2e'),k=g.mark();aBar(g,0,0.27,[-0.08,0.02,0.02],[-0.04,0.025,0.018],wd);g.box(-0.024,0.024,-0.03,0.05,0.27,0.53,mt);
  aBar(g,0.33,0.38,[-0.13,-0.03,0.016],[-0.12,-0.03,0.016],wd);g.box(-0.012,0.012,-0.21,-0.03,0.45,0.48,mt);aBar(g,0.53,0.67,[-0.045,0.0,0.02],[-0.04,0.0,0.018],wd);
  aTube(g,[0,0.025,0.53],[0,0.025,0.85],0.012,0.011,6,mt);g.box(-0.008,0.008,0.05,0.07,0.3,0.32,mt);g.box(-0.003,0.003,0.036,0.05,0.82,0.84,mt);g.vary(k,mulberry32(3),0.04);},
 w_mp40(g){const mt=hex('#1f2022'),bk=hex('#3b2e24'),k=g.mark();aTube(g,[0.02,-0.0,0.02],[0.02,0.015,0.25],0.006,0.006,4,mt);aTube(g,[-0.02,-0.0,0.02],[-0.02,0.015,0.25],0.006,0.006,4,mt);
  g.box(-0.024,0.024,-0.07,0.02,0.0,0.02,mt);aTube(g,[0,0.02,0.24],[0,0.02,0.6],0.021,0.021,8,mt);g.box(-0.02,0.02,-0.03,0.0,0.27,0.5,bk);aBar(g,0.31,0.36,[-0.13,-0.02,0.016],[-0.12,-0.02,0.016],bk);
  g.box(-0.013,0.013,-0.26,-0.02,0.44,0.475,mt);aTube(g,[0,0.02,0.6],[0,0.02,0.83],0.01,0.01,6,mt);g.box(-0.008,0.008,-0.02,0.0,0.74,0.8,mt);g.vary(k,mulberry32(4),0.04);},
 w_stg44(g){const wd=hex('#6a4527'),mt=hex('#2a2b2c'),k=g.mark();aBar(g,0,0.25,[-0.075,0.022,0.02],[-0.035,0.03,0.018],wd);g.box(-0.022,0.022,-0.03,0.055,0.25,0.6,mt);
  aBar(g,0.32,0.37,[-0.13,-0.03,0.016],[-0.12,-0.03,0.016],mt);for(let i=0;i<3;i++)g.box(-0.012,0.012,-0.08*i-0.1,-0.08*i-0.02,0.44+i*0.02,0.48+i*0.022,mt);
  g.box(-0.016,0.016,0.0,0.05,0.6,0.75,wd);aTube(g,[0,0.03,0.6],[0,0.03,0.94],0.01,0.009,6,mt);aTube(g,[0,0.065,0.58],[0,0.065,0.8],0.009,0.009,5,mt);g.vary(k,mulberry32(5),0.04);},
 w_bar(g){const wd=hex('#6a4a2c'),mt=hex('#2e302f'),k=g.mark();aBar(g,0,0.3,[-0.085,0.025,0.022],[-0.045,0.03,0.02],wd);g.box(-0.026,0.026,-0.04,0.055,0.3,0.63,mt);
  g.box(-0.016,0.016,-0.15,-0.04,0.47,0.54,mt);aBar(g,0.63,0.84,[-0.035,0.03,0.022],[-0.03,0.025,0.02],wd);aTube(g,[0,0.03,0.63],[0,0.03,1.2],0.012,0.011,6,mt);
  for(const s of [-1,1])aTube(g,[s*0.015,0.0,1.06],[s*0.03,-0.02,0.72],0.005,0.005,4,mt);g.vary(k,mulberry32(6),0.04);},
 w_mg42(g){const mt=hex('#202123'),bk=hex('#2c2a27'),k=g.mark();aBar(g,0,0.25,[-0.07,0.02,0.022],[-0.035,0.035,0.02],bk);g.box(-0.03,0.03,-0.03,0.07,0.25,0.62,mt);
  aBar(g,0.31,0.36,[-0.13,-0.03,0.017],[-0.12,-0.03,0.017],bk);
  g.box(-0.028,0.028,-0.005,0.06,0.62,1.06,mt);for(let i=0;i<6;i++){const z=0.66+i*0.065;for(const s of [-1,1])g.box(s*0.028-0.002,s*0.028+0.002,0.012,0.042,z,z+0.035,hex('#090909'));}
  aTube(g,[0,0.027,1.06],[0,0.027,1.22],0.021,0.019,8,mt);aTube(g,[0,0.06,0.72],[0,0.1,0.78],0.008,0.008,4,mt);
  for(const s of [-1,1])aTube(g,[s*0.02,0.0,1.0],[s*0.05,-0.02,0.7],0.007,0.007,4,mt);
  const br=hex('#a8833f');for(let i=0;i<9;i++){const t=i/8;g.box(0.03,0.06,-0.02-t*0.18,0.0-t*0.18,0.36+t*0.04,0.375+t*0.04,br);}g.vary(k,mulberry32(7),0.04);},
 w_pistol(g){const mt=hex('#262729'),k=g.mark();aBar(g,-0.03,0.17,[0.0,0.03,0.013],[0.0,0.03,0.013],mt);aBar(g,-0.04,0.0,[-0.1,0.0,0.014],[-0.1,0.0,0.014],hex('#3a2e24'));g.vary(k,mulberry32(8),0.04);},
 w_bazooka(g){const ol=hex('#4d5736'),dk=hex('#2b2d26'),k=g.mark();aTube(g,[0,0,-0.72],[0,0,0.78],0.045,0.045,10,ol);aTube(g,[0,0,-0.78],[0,0,-0.7],0.07,0.047,10,dk);
  g.box(-0.013,0.013,-0.13,-0.04,0.0,0.05,hex('#5a4128'));g.box(-0.013,0.013,-0.13,-0.04,0.31,0.37,hex('#5a4128'));g.box(-0.01,0.01,0.04,0.09,0.55,0.58,dk);g.vary(k,mulberry32(9),0.04);},
 // ametralladora fija para los nidos: MG42 sobre trípode bajo
 w_mgnest(g){const k=g.mark();AW.w_mg42(g);g.translate(k,0,0,-0.35);const mt=hex('#2b2c2a');
  for(const [x,z] of [[0.35,-0.75],[-0.35,-0.75],[0,0.35]])aTube(g,[0,-0.06,-0.05],[x,-0.32,z],0.016,0.014,5,mt);aTube(g,[0,-0.06,-0.05],[0,0.0,-0.05],0.03,0.03,6,mt);}
};

// ---------- matrices de huesos ----------
const AM={L:new Float32Array(16),X:[0,0,0],Y:[0,0,0],Z:[0,0,0],
 // out = padre · T(x,y,z) · Ry(yaw) · Rx(-pitch) · Rz(roll)
 bone(o,p,x,y,z,yaw,pitch,roll){M4.trs(x,y,z,-pitch,yaw,roll,this.L);return M4.mul(p,this.L,o);},
 pt(m,x,y,z,o){o[0]=m[0]*x+m[4]*y+m[8]*z+m[12];o[1]=m[1]*x+m[5]*y+m[9]*z+m[13];o[2]=m[2]*x+m[6]*y+m[10]*z+m[14];return o;},
 dir(m,x,y,z,o){o[0]=m[0]*x+m[4]*y+m[8]*z;o[1]=m[1]*x+m[5]*y+m[9]*z;o[2]=m[2]*x+m[6]*y+m[10]*z;return o;},
 // hueso que va de J a K (la pieza cuelga hacia -Y), con la cara delantera hacia h
 seg(o,J,K,h){const Y=this.Y,Z=this.Z,X=this.X;Y[0]=J[0]-K[0];Y[1]=J[1]-K[1];Y[2]=J[2]-K[2];V3.norm(Y,Y);let d=V3.dot(h,Y);Z[0]=h[0]-Y[0]*d;Z[1]=h[1]-Y[1]*d;Z[2]=h[2]-Y[2]*d;
  if(V3.len(Z)<1e-4){Z[0]=0;Z[1]=-Y[2];Z[2]=Y[1];}V3.norm(Z,Z);V3.cross(Y,Z,X);return M4.basis(X,Y,Z,J,o);},
 // IK de dos huesos: S raíz, T objetivo, largos l1 l2, polo P (hacia donde dobla) -> codo/rodilla E y extremo F (T si llega)
 ik(S,T,l1,l2,P,E,F){let dx=T[0]-S[0],dy=T[1]-S[1],dz=T[2]-S[2];const d0=Math.hypot(dx,dy,dz)||1e-4;dx/=d0;dy/=d0;dz/=d0;
  const d=clamp(d0,Math.abs(l1-l2)+0.02,l1+l2-0.003),ca=clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1),sa=Math.sqrt(1-ca*ca);
  const pd=P[0]*dx+P[1]*dy+P[2]*dz;let px=P[0]-dx*pd,py=P[1]-dy*pd,pz=P[2]-dz*pd;const pl=Math.hypot(px,py,pz);if(pl<1e-5){px=-dz;py=0;pz=dx;}else{px/=pl;py/=pl;pz/=pl;}
  E[0]=S[0]+dx*l1*ca+px*l1*sa;E[1]=S[1]+dy*l1*ca+py*l1*sa;E[2]=S[2]+dz*l1*ca+pz*l1*sa;F[0]=S[0]+dx*d;F[1]=S[1]+dy*d;F[2]=S[2]+dz*d;}
};
// zonas de impacto: [hueso, centro (x,y,z), medias (x,y,z), zona]
const ACT_HB=[[BHd,0,0.14,0.01,0.1,0.13,0.115,'head'],[BT,0,0.25,-0.01,0.2,0.3,0.15,'torso'],[BH,0,-0.03,0,0.17,0.12,0.125,'torso'],
 [BUL,0,-0.145,0,0.065,0.155,0.065,'arm'],[BUR,0,-0.145,0,0.065,0.155,0.065,'arm'],[BFL,0,-0.17,0,0.055,0.18,0.055,'arm'],[BFR,0,-0.17,0,0.055,0.18,0.055,'arm'],
 [BTL,0,-0.22,0,0.085,0.24,0.085,'leg'],[BTR,0,-0.22,0,0.085,0.24,0.085,'leg'],[BSL,0,-0.24,0.02,0.07,0.25,0.09,'leg'],[BSR,0,-0.24,0.02,0.07,0.25,0.09,'leg']];
// muertes: fotogramas clave {t, e:'in' (caída acelerada) | suave, parámetros}; lo que falta se hereda del anterior
const ACT_DP=['rp','rr','ry','ty','tz','h','hp','tb','tr','tw','hb','hr','hy','lt','lk','lto','rt','rk','rto','la','lo','le','ra','ro','re'];
const ACT_D0={rp:0,rr:0,ry:0,ty:0,tz:0,h:0.93,hp:0,tb:0.05,tr:0,tw:0,hb:0,hr:0,hy:0,lt:0.05,lk:0.1,lto:0.03,rt:-0.05,rk:0.12,rto:0.03,la:1.25,lo:0.25,le:0.7,ra:0.85,ro:0.4,re:1.35};
const ACT_D0C={h:0.56,hp:0.1,tb:0.3,lt:1.25,lk:1.7,rt:-0.25,rk:2.0};
const ACT_DIE={
 back:[{t:0.22,tb:-0.35,hb:-0.45,la:2.2,lo:0.7,le:0.3,ra:2.0,ro:0.8,re:0.4,lk:0.35,rk:0.25,lt:0.25,rp:-0.18,h:0.9},
  {t:0.78,e:'in',rp:-1.57,ty:0.15,tz:-0.05,tb:0.12,hb:0.35,hr:0.3,la:2.7,lo:1.1,le:0.5,ra:2.5,ro:1.25,re:0.8,lt:0.15,lk:0.3,rt:0.55,rk:0.7,lto:0.18,rto:0.08},
  {t:1.05,hb:0.12,hr:0.6,ty:0.14,lk:0.2,re:0.6}],
 forward:[{t:0.2,rp:0.12,tb:0.45,hb:0.35,la:0.5,ra:0.35,le:0.5,re:0.6,lk:0.6,rk:0.35,h:0.86},
  {t:0.72,e:'in',rp:1.57,ty:0.13,tb:0.0,hb:-0.3,hr:1.2,la:-0.2,lo:0.6,le:1.5,ra:0.2,ro:0.9,re:0.9,lt:-0.05,lk:0.15,rt:0.35,rk:0.9,rto:0.12},
  {t:0.95,hb:-0.4,ty:0.12}],
 crumple:[{t:0.38,h:0.4,lt:1.35,lk:2.25,rt:1.0,rk:2.3,tb:0.85,hb:0.55,la:0.2,lo:0.15,le:0.5,ra:0.15,ro:0.2,re:0.6,tz:0.05},
  {t:0.85,e:'in',rr:1.45,ty:0.17,h:0.36,lt:1.1,lk:1.6,rt:0.9,rk:1.8,tb:0.5,hb:0.25,hr:0.5,la:0.9,lo:0.3,le:0.9,ra:0.4,ro:0.8,re:0.25},
  {t:1.05,hr:0.7}],
 knees:[{t:0.35,h:0.52,hp:0,lt:-0.05,lk:1.55,rt:-0.05,rk:1.55,tb:0.25,hb:0.45,la:0.3,lo:0.1,le:0.3,ra:0.2,ro:0.15,re:0.3},
  {t:0.85,tb:0.4,hb:0.6,la:0.1,ra:0.05},
  {t:1.3,e:'in',rp:1.5,ty:0.13,h:0.5,lt:0.1,lk:1.3,rt:0.25,rk:1.0,tb:0.1,hb:-0.3,hr:-1.1,la:-0.2,lo:0.5,le:1.2,ra:0.1,ro:0.7,re:0.8},
  {t:1.5,lk:0.6,rk:0.4,ty:0.12}],
 spin:[{t:0.42,ry:1.5,tw:-0.4,rr:0.35,la:1.9,lo:1.0,ra:0.6,ro:1.2,h:0.85,lk:0.5,rk:0.2},
  {t:0.9,e:'in',ry:2.5,rr:1.52,ty:0.18,la:1.5,lo:0.6,le:0.6,ra:0.3,ro:0.2,re:0.5,lt:0.55,lk:0.9,rt:0.2,rk:0.4,tb:0.3,hr:0.5,tw:-0.2},
  {t:1.1,hr:0.7}],
 blast:[{t:0.15,tb:-0.5,hb:-0.6,la:2.6,lo:1.2,le:0.3,ra:2.5,ro:1.3,re:0.3,lt:0.6,lk:0.8,rt:0.2,rk:0.3,rp:-0.4},
  {t:0.75,e:'in',rp:-1.57,ty:0.15,tb:0.1,hb:0.3,hr:-0.4,la:2.8,lo:1.3,le:0.4,ra:2.2,ro:0.9,re:0.9,lt:0.3,lk:0.5,rt:0.6,rk:0.9,lto:0.25,rto:0.15},
  {t:1.0,hb:0.15}]
};
(()=>{for(const k in ACT_DIE)ACT_DIE[k].end=ACT_DIE[k][ACT_DIE[k].length-1].t;})();

const Actors={list:[],_id:0,P:null,tick:0,_fr:-1,_nb:0,_blob:new Float32Array(10*96),_exp:null,_expT:-9,time:0,corpses:25,
 uniform:{ally:null,axis:null}, // aspecto por defecto de cada bando que puede fijar el guion (si no, se deduce del nivel)
 _v:[[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0]],_M:new Float32Array(16),_N:new Float32Array(16),_G:new Float32Array(16),
 clear(){for(const a of this.list)this._release(a);this.list=[];this._id=0;this.uniform={ally:null,axis:null};},
 // aspecto por defecto: nieve -> invierno; noche -> paracaidistas
 _look(team,kind){const u=this.uniform[team];if(u)return u==='de'&&kind==='officer'?'deo':u==='de'&&kind==='sniper'?'desn':u;
  const lv=typeof Game!=='undefined'&&Game.level,env=lv&&lv.env||{},snow=!!env.snow||lv&&/bastogne|ardenas/i.test(lv.id),night=(env.stars||0)>0.5||lv&&lv.id==='village';
  if(team==='ally')return snow?'usw':night?'para':'us';return kind==='officer'?'deo':kind==='sniper'&&!snow?'desn':snow?'dew':'de';},
 // {team, kind:'rifle'|'smg'|'mg'|'officer'|'sniper'|'assault'|'bazooka', pos, yaw, name, weapon, tag, hero, health, stance, look, goal,
 //  behavior, path, accuracy, aggression, grenades, mg (puesto de World.usables), sight, leash, retreat, alert, data}
 spawn(o){o=o||{};const team=o.team||'axis',kind=o.kind||'rifle',p=o.pos?o.pos.slice():[0,0,0];if(p[1]==null||!isFinite(p[1]))p[1]=World.height(p[0],p[2]);
  const w=o.weapon||ACT_WPN[team][kind]||(team==='axis'?'kar98':'garand'),d=WEAPONS[w],r=Math.random,look=ACT_LOOK[o.look]?o.look:this._look(team,kind),L=ACT_LOOK[look];
  const a={id:++this._id,team,kind,name:o.name||null,tag:o.tag||null,hero:!!o.hero,pos:p,vel:[0,0,0],yaw:o.yaw||0,health:o.health||100,maxHealth:o.health||100,alive:true,
   stance:o.stance||'stand',aim:[o.yaw||0,0],weapon:w,mag:d?d.mag:10,brain:null,goal:o.goal?o.goal.slice():null,onGround:true,deadT:0,tank:false,speed:0,data:o.data||{},
   behavior:o.behavior||null,path:o.path||null,accuracy:o.accuracy||1,aggression:o.aggression==null?0.5:o.aggression,grenades:o.grenades!=null?o.grenades:team==='axis'?(kind==='rifle'||kind==='assault'?2:kind==='smg'||kind==='officer'?1:0):kind==='rifle'||kind==='smg'?1:0,
   mg:o.mg||null,sight:o.sight||0,leash:o.leash||0,retreat:o.retreat||null,alertStart:!!o.alert,ready:0,glint:0,look,
   skin:ACT_SKIN[(r()*ACT_SKIN.length)|0],tint:[0.94+r()*0.12,0.94+r()*0.12,0.94+r()*0.1],ht:0.95+r()*0.1,headV:(r()*3)|0,
   gear:L.team==='ally'?(r()<0.8?['pack']:[]).concat(r()<0.45?['roll']:[]):look==='deo'?['binos']:(r()<0.35?['zelt']:[]).concat(kind==='mg'?['ammo']:[]),
   gun:ACT_GUN[w]||ACT_DEF_GRIP,anim:null,pose:new Float32Array(ACT_NB*16),bm:[],_pt:-1};
  for(let i=0;i<ACT_NB;i++)a.bm.push(a.pose.subarray(i*16,i*16+16));
  a.anim={ph:r()*6.28,mv:0,run:0,spd:0,mx:0,mz:1,S:0.3,cr:a.stance==='crouch'?1:0,rd:0,fire:0,hit:0,hdx:0,hdz:0,t:r()*10,br:r()*6,look:0,act:null,at:0,adur:1,
   die:null,dk:new Float32Array(ACT_DP.length),fv:null,slope:0,var:r(),step:0,mount:null};
  this.list.push(a);Bus.emit('spawn',{actor:a});return a;},
 // ---------- vehículos ----------
 // carro {team, pos, yaw, type:'pz4'|'tiger', camo:'yellow'|'grey'|'white', health, tag, goal, path (ruta [[x,z],...]), speed}
 spawnTank(o){o=o||{};const vt=o.type||o.vt||(o.half?'ht':'pz4'),V=ACT_VEH[vt]||ACT_VEH.pz4;
  const a=this.spawn(Object.assign({kind:'tank',weapon:'cannon',health:V.hp,look:'de'},o));a.tank=true;a.vt=vt;a.V=V;a.half=vt==='ht';a.r=V.r;a.kind=vt==='ht'?'halftrack':'tank';
  const lv=typeof Game!=='undefined'&&Game.level,snow=lv&&lv.env&&lv.env.snow;a.camo=o.camo||(snow?'white':'yellow');a.grenades=0;
  a.tur=0;a.gp=0;a.aim[0]=a.yaw;a.aimT=[a.yaw,0];a.drive=0;a.steer=a.yaw;a.v=0;a.w=0;a.trL=0;a.trR=0;a.tilt=[0,0];a.ex=0;a.fx=null;a.crew=V.crew;a.hatch=1;a.turS=0;a.troops=o.troops||0;a.speedMax=o.speed||V.speed;
  a.pos[1]=World.height(a.pos[0],a.pos[2]);return a;},
 spawnHalftrack(o){return this.spawnTank(Object.assign({type:'ht'},o));},
 byTag(tag){return this.list.filter(a=>a.tag===tag);},
 count(team,tag){let n=0;for(const a of this.list)if(a.alive&&(!team||a.team===team)&&(!tag||a.tag===tag))n++;return n;},
 height(a){return a.tank?a.V.h:a.anim.cr>0.5?1.25:1.8;},
 // pecho y ojos aproximados (sin calcular la pose); para la IA, el piloto y la ayuda al apuntar
 chest(a,o){o=o||[0,0,0];if(a.tank){o[0]=a.pos[0];o[1]=a.pos[1]+a.V.h*0.6;o[2]=a.pos[2];return o;}const A=a.anim,f=0.06+A.cr*0.1;
  o[0]=a.pos[0]+Math.sin(a.yaw)*f;o[1]=a.pos[1]+(a.alive?lerp(1.26,0.86,A.cr)*a.ht:0.2);o[2]=a.pos[2]+Math.cos(a.yaw)*f;return o;},
 eye(a,o){o=o||[0,0,0];if(a.tank){o[0]=a.pos[0];o[1]=a.pos[1]+a.V.h;o[2]=a.pos[2];return o;}const A=a.anim,f=0.08+A.cr*0.14;
  o[0]=a.pos[0]+Math.sin(a.aim[0])*f;o[1]=a.pos[1]+(a.alive?lerp(1.64,1.12,A.cr)*a.ht:0.3);o[2]=a.pos[2]+Math.cos(a.aim[0])*f;return o;},
 // boca del arma (de la pose) -> o
 muzzle(a,o){o=o||[0,0,0];if(a.tank)return this.eye(a,o);this.pose(a);const g=a.gun,m=a.anim.mount&&a.anim.mount.m?a.anim.mount.m:a.bm[BW],q=a.anim.mount?ACT_GUN.mg42.muz:g.muz;
  return AM.pt(m,q[0],q[1],a.anim.mount?q[2]-0.35:q[2],o);},
 // acciones animadas: 'reload' | 'bolt' | 'throw' | 'shout' (dur en s); la IA mira a.anim.act para saber si terminó
 act(a,name,dur){const A=a.anim;A.act=name;A.at=0;A.adur=dur||1;},
 // ---------- simulación ----------
 update(dt){this.tick++;this.time+=dt;let nd=0;const L=this.list;
  for(const a of L){if(a.tank){this._tank(a,dt);continue;}const A=a.anim;A.fire=Math.max(0,A.fire-dt*9);A.hit=Math.max(0,A.hit-dt*3.2);A.t+=dt;
   if(A.act){A.at+=dt;if(A.at>=A.adur)A.act=null;}
   if(!a.alive){a.deadT+=dt;nd++;if(A.fv){const v=A.fv;v[1]-=14*dt;a.pos[0]+=v[0]*dt;a.pos[1]+=v[1]*dt;a.pos[2]+=v[2]*dt;const g=World.height(a.pos[0],a.pos[2]);
     if(a.pos[1]<=g&&v[1]<0){a.pos[1]=g;A.fv=null;}}continue;}
   if(A.mount){a.vel[0]=a.vel[2]=0;}
   a.vel[1]-=16*dt;const R=World.moveCapsule(a.pos,a.vel,0.33,A.cr>0.5?1.25:1.8,dt,a.onGround);a.onGround=R.onGround;
   const sp=Math.hypot(a.vel[0],a.vel[2]),k=Math.min(1,dt*8);a.speed=A.spd=sp;A.mv+=(Math.min(1,sp/1.3)-A.mv)*k;A.run+=(clamp((sp-2.5)/1.6,0,1)-A.run)*Math.min(1,dt*5);
   if(sp>0.25){const s=Math.sin(a.yaw),c=Math.cos(a.yaw);A.mx+=((a.vel[0]*c-a.vel[2]*s)/sp-A.mx)*k;A.mz+=((a.vel[0]*s+a.vel[2]*c)/sp-A.mz)*k;}
   A.S+=(clamp(0.2+sp*0.085,0.22,0.52)*(1-0.3*A.cr)-A.S)*k;const p0=A.ph;A.ph+=dt*Math.PI*sp/(2*A.S);
   if(Math.floor(p0/Math.PI)!==Math.floor(A.ph/Math.PI)&&sp>0.6&&V3.dist2(a.pos,Player.pos)<400)Bus.emit('step',{pos:a.pos,surface:World.surfaceAt(a.pos[0],a.pos[2]),by:a,run:sp>3});
   A.cr+=((a.stance==='crouch'?1:0)-A.cr)*Math.min(1,dt*6);A.rd+=((a.ready?1:0)-A.rd)*Math.min(1,dt*(a.ready?6:2.5));A.br+=dt*(1.7+A.run*2.5);
   A.look=(0.45*Math.sin(A.t*0.37+a.id)+0.2*Math.sin(A.t*0.91+a.id*2))*(1-A.rd);}
  this._separate();if(nd>this.corpses)this._cull(nd-this.corpses);},
 // los soldados no se atraviesan; carros y restos apartan a soldados y jugador
 _separate(){const L=this.list,n=L.length,P=Player;
  for(let i=0;i<n;i++){const a=L[i];if(!a.alive||a.tank)continue;
   for(let j=i+1;j<n;j++){const b=L[j];if(!b.alive||b.tank)continue;const dx=b.pos[0]-a.pos[0],dz=b.pos[2]-a.pos[2],d2=dx*dx+dz*dz;if(d2>0.4||Math.abs(b.pos[1]-a.pos[1])>1.2)continue;
    const d=Math.sqrt(d2)||0.01,pen=(0.64-d)*0.5,ux=dx/d,uz=dz/d;if(pen<=0)continue;a.pos[0]-=ux*pen;a.pos[2]-=uz*pen;b.pos[0]+=ux*pen;b.pos[2]+=uz*pen;}
   if(P.alive){const dx=a.pos[0]-P.pos[0],dz=a.pos[2]-P.pos[2],d2=dx*dx+dz*dz;if(d2<0.46&&Math.abs(a.pos[1]-P.pos[1])<1.2){const d=Math.sqrt(d2)||0.01,pen=0.68-d;a.pos[0]+=dx/d*pen;a.pos[2]+=dz/d*pen;}}}
  for(const t of L){if(!t.tank)continue;const V=t.V,c=Math.cos(t.yaw),s=Math.sin(t.yaw);
   const push=(p,r)=>{const dx=p[0]-t.pos[0],dz=p[2]-t.pos[2],lx=c*dx-s*dz,lz=s*dx+c*dz,ex=V.hx+r,ez=V.hz+r;if(Math.abs(lx)>=ex||Math.abs(lz)>=ez||p[1]>t.pos[1]+V.h)return;
    const px=ex-Math.abs(lx),pz=ez-Math.abs(lz);let nx=0,nz=0;if(px<pz)nx=(lx<0?-1:1)*px;else nz=(lz<0?-1:1)*pz;p[0]+=c*nx+s*nz;p[2]+=-s*nx+c*nz;};
   if(P.alive)push(P.pos,0.35);for(const a of L)if(a.alive&&!a.tank)push(a.pos,0.33);}},
 _cull(k){const D=[];for(const a of this.list)if(!a.alive&&!a.tank)D.push(a);D.sort((x,y)=>y.deadT-x.deadT);const rm=new Set(D.slice(0,k));this.list=this.list.filter(a=>!rm.has(a));},
 // ---------- impactos ----------
 // rayo contra los soldados (cajas que siguen la pose) y los carros -> {t, actor, part, normal, surface}
 raycast(o,d,maxT,ignore){let best=null,bt=maxT;const lo=this._v[0],ld=this._v[1];
  for(const a of this.list){if(!a.alive||a===ignore)continue;const p=a.pos;
   if(a.tank){const V=a.V,t=this._rayVeh(a,o,d,bt);if(t>=0){bt=t;best={t,actor:a,part:this._vp,normal:this._vn.slice(),surface:'metal'};}continue;}
   // descarte rápido con una esfera alrededor del cuerpo
   const cx=p[0]-o[0],cy=p[1]+0.9-o[1],cz=p[2]-o[2],tc=cx*d[0]+cy*d[1]+cz*d[2];if(tc<-1.2||tc-1.2>bt)continue;const q2=cx*cx+cy*cy+cz*cz-tc*tc;if(q2>1.4)continue;
   this.pose(a);const M=a.bm;
   for(const h of ACT_HB){const m=M[h[0]],ox=o[0]-m[12],oy=o[1]-m[13],oz=o[2]-m[14];
    lo[0]=m[0]*ox+m[1]*oy+m[2]*oz-h[1];lo[1]=m[4]*ox+m[5]*oy+m[6]*oz-h[2];lo[2]=m[8]*ox+m[9]*oy+m[10]*oz-h[3];
    ld[0]=m[0]*d[0]+m[1]*d[1]+m[2]*d[2];ld[1]=m[4]*d[0]+m[5]*d[1]+m[6]*d[2];ld[2]=m[8]*d[0]+m[9]*d[1]+m[10]*d[2];
    const t=this._slab(lo,ld,h[4],h[5],h[6],bt);if(t>=0){bt=t;const ax=this._ax,n=[0,0,0];n[ax]=this._sg;best={t,actor:a,part:h[7],normal:AM.dir(m,n[0],n[1],n[2],n),surface:'flesh'};}}}
  return best;},
 // rayo local contra una caja centrada -> t | -1 (deja el eje y el signo de la cara en _ax/_sg)
 _slab(o,d,hx,hy,hz,tmax){let t0=-1e9,t1=tmax,ax=0,sg=1;const H=[hx,hy,hz];
  for(let i=0;i<3;i++){if(Math.abs(d[i])<1e-9){if(o[i]<-H[i]||o[i]>H[i])return -1;continue;}let ta=(-H[i]-o[i])/d[i],tb=(H[i]-o[i])/d[i],s=-1;if(ta>tb){const q=ta;ta=tb;tb=q;s=1;}
   if(ta>t0){t0=ta;ax=i;sg=s;}if(tb<t1)t1=tb;if(t0>t1)return -1;}
  if(t0<0)return -1;this._ax=ax;this._sg=sg;return t0;},
 _ax:0,_sg:1,_vp:'hull',_vn:[0,1,0],
 _rayVeh(a,o,d,bt){const V=a.V,c=Math.cos(a.yaw),s=Math.sin(a.yaw),lo=this._v[2],ld=this._v[3];let best=-1;
  const test=(cx,cy,cz,hx,hy,hz,yaw,part)=>{const cc=Math.cos(yaw),ss=Math.sin(yaw),ox=o[0]-cx,oz=o[2]-cz;lo[0]=cc*ox-ss*oz;lo[1]=o[1]-cy;lo[2]=ss*ox+cc*oz;ld[0]=cc*d[0]-ss*d[2];ld[1]=d[1];ld[2]=ss*d[0]+cc*d[2];
   const t=this._slab(lo,ld,hx,hy,hz,best>=0?best:bt);if(t>=0){best=t;this._vp=part;const n=[0,0,0];n[this._ax]=this._sg;this._vn[0]=cc*n[0]+ss*n[2];this._vn[1]=n[1];this._vn[2]=-ss*n[0]+cc*n[2];}};
  test(a.pos[0],a.pos[1]+V.hy0+V.hh,a.pos[2],V.hx,V.hh,V.hz,a.yaw,'hull');
  if(V.tur){const tz=V.tur[2],tx=a.pos[0]+s*tz,tzz=a.pos[2]+c*tz;test(tx,a.pos[1]+V.tur[1]+V.tur[4],tzz,V.tur[3],V.tur[4],V.tur[5],a.yaw+a.tur,'turret');}
  return best;},
 // daño por zona (cabeza x4, brazos/piernas x0.75; explosiones x1); emite 'hit' y 'kill'; los héroes no mueren
 damage(a,dmg,part,info){if(!a||!a.alive)return;info=info||W_NO;if(a.tank)return this._dmgVeh(a,dmg,part,info);
  const pos=info.pos||this.chest(a),A=a.anim,d=dmg*(info.explosive?1:ACT_PK[part]||1);A.hit=1;a.lastHit=info;a.hitT=this.time;
  const dir=info.dir||(info.by&&info.by.pos?V3.norm(V3.sub(a.pos,info.by.pos)):null);if(dir){const c=Math.cos(a.yaw),s=Math.sin(a.yaw);A.hdx=dir[0]*c-dir[2]*s;A.hdz=dir[0]*s+dir[2]*c;}
  if(a.hero){a.health=Math.max(1,a.health-d);Bus.emit('hit',{actor:a,part,dmg:d,pos,by:info.by,kill:false});return;}
  a.health-=d;const kill=a.health<=0;Bus.emit('hit',{actor:a,part,dmg:d,pos,by:info.by,kill});if(kill)this.kill(a,info,part);},
 kill(a,info,part){if(!a.alive)return;info=info||W_NO;if(a.tank)return this._killVeh(a,info);
  this.pose(a);const A=a.anim,R=Math.random(),cr=A.cr>0.5;a.alive=false;a.health=0;a.deadT=0;a.ready=0;
  const dir=info.dir||(info.by&&info.by.pos?V3.norm(V3.sub(a.pos,info.by.pos)):[-Math.sin(a.yaw),0,-Math.cos(a.yaw)]),fwd=dir[0]*Math.sin(a.yaw)+dir[2]*Math.cos(a.yaw);
  let ty;if(info.explosive){ty='blast';const l=Math.hypot(dir[0],dir[2])||1;A.fv=[dir[0]/l*3.5,3.2+Math.random()*1.5,dir[2]/l*3.5];a.yaw=Math.atan2(-dir[0],-dir[2]);}
  else if(cr)ty=R<0.4?'crumple':R<0.65?'spin':R<0.85?'back':'forward';else if(fwd>0.35)ty=R<0.75?'forward':'knees';else if(part==='head')ty=R<0.55?'crumple':'back';else if(part==='leg')ty=R<0.6?'knees':'crumple';
  else ty=R<0.35?'back':R<0.55?'spin':R<0.8?'knees':'crumple';
  if(ACT_DIE[info.death])ty=info.death;
  // fotogramas rellenos (lo que falta se hereda) desde la postura actual
  const K=[],k0=Object.assign({},ACT_D0,cr?ACT_D0C:null);k0.t=0;K.push(k0);if(ty==='spin'&&R<0.4)k0.mir=1;
  for(const f of ACT_DIE[ty]){const q=Object.assign({},K[K.length-1],f);K.push(q);}A.dkeys=K;A.die=ty;A.mirror=Math.random()<0.5?-1:1;
  // pendiente del suelo en la dirección de la caída (la cabeza no flota ni se hunde)
  const F=K[K.length-1],fx=Math.abs(F.rp)>Math.abs(F.rr)?Math.sign(F.rp):0,fs=fx?0:Math.sign(F.rr)*A.mirror;
  const ux=Math.sin(a.yaw)*fx-Math.cos(a.yaw)*fs,uz=Math.cos(a.yaw)*fx+Math.sin(a.yaw)*fs,h0=World.height(a.pos[0],a.pos[2]),h1=World.height(a.pos[0]+ux*1.4,a.pos[2]+uz*1.4);
  A.slope=Math.abs(a.pos[1]-h0)<0.3?Math.atan2(h1-h0,1.4):0;
  if(a.brain&&a.brain.cover&&World.cover)World.cover.release(a.brain.cover,a);this._release(a);
  Bus.emit('kill',{actor:a,by:info.by,weapon:info.weapon,headshot:part==='head'});
  if(typeof Weapons!=='undefined'){const d=WEAPONS[a.weapon];if(d&&!d.mounted&&d.cls!=='launcher'){const w=AM.pt(a.bm[BW],0,0,0.4,[0,0,0]);Weapons.drop(d,[w[0],a.pos[1]+0.3,w[2]]);}}},
 // suelta la ametralladora fija que manejaba
 _release(a){const m=a.anim&&a.anim.mount;if(m&&m.u){m.u.draw=m.draw;m.u.on=m.on;if(m.u._ai===a)m.u._ai=null;}if(a.anim)a.anim.mount=null;},
 // monta a un soldado en una ametralladora fija de World.usables (la IA lo coloca detrás)
 mount(a,u){if(!u||u._ai&&u._ai!==a&&u._ai.alive)return false;this._release(a);a.anim.mount={u,draw:u.draw,on:u.on,m:new Float32Array(16)};u._ai=a;u.draw=false;u.on=false;return true;},
 // ---------- pose ----------
 pose(a){if(a._pt===this.tick)return a.bm;a._pt=this.tick;if(a.alive)this._live(a);else this._dead(a);return a.bm;},
 _live(a){const A=a.anim,M=a.bm,v=this._v,cr=A.cr,rd=A.rd,mv=A.mv,run=A.run,ph=A.ph,sc=a.ht;
  const tw=clamp(angNorm(a.aim[0]-a.yaw),-1.5,1.5),ap=clamp(a.aim[1],-1.1,1.1),act=A.act,u=act?clamp(A.at/A.adur,0,1):0,mt=A.mount;
  M4.compose(a.pos,a.yaw,0,0,sc,M[BR]);
  const sw=Math.sin(ph)*mv,cph=Math.cos(ph),br=Math.sin(A.br)*(1-mv*0.7),hit=A.hit*A.hit;
  const thr=act==='throw'?u:-1,wind=thr<0?0:thr<0.5?Math.sin(thr/0.5*Math.PI/2):Math.cos((thr-0.5)/0.5*Math.PI/2)*1.6-0.6;
  // cadera
  const hipH=lerp(0.94,mt?0.52:0.56,cr)-mv*(0.016+0.04*run)*cph*cph,pY=tw*0.25+sw*0.12-wind*0.15,pB=0.07*run*mv+cr*0.12;
  AM.bone(M[BH],M[BR],0,hipH,0,pY,-pB,sw*0.04);
  // torso: inclinado al correr y agachado, sigue la puntería, respira y se sacude al recibir un balazo
  const tY=clamp(tw*0.6,-0.95,0.95)-sw*0.16-wind*0.45,tB=0.16*cr+0.22*run*mv+0.03*mv-ap*0.32*rd+br*0.012-hit*0.25*A.hdz+(mt?0.25:0)+(act==='shout'?-0.1*Math.sin(u*Math.PI):0);
  AM.bone(M[BT],M[BH],0,0.06,0,tY,-tB,hit*0.3*A.hdx+wind*0.08);
  const hY=clamp(tw-pY-tY,-1.2,1.2)+A.look,hB=-ap*(0.75-0.35*rd)-tB*0.5-pB*0.5+rd*0.1;
  AM.bone(M[BHd],M[BT],0,0.52,0.005,hY-rd*0.1,-hB,rd*0.2-hit*0.2*A.hdx);
  // arma: en el hombro al apuntar, baja y cruzada al ir tranquilo
  const g=a.gun,h=g.h,ry=tw-pY-tY,wp=ap+tB+pB;let wx,wy,wz,wa,wb,wc;
  if(h==='pistol'){wx=lerp(-0.2,-0.08,rd);wy=lerp(0.03,0.4,rd);wz=lerp(0.12,0.5,rd);wa=lerp(0.1,ry,rd);wb=lerp(-1.25,wp,rd);wc=0;}
  else if(h==='mg'){wx=-0.13;wy=lerp(0.14,0.13,rd);wz=lerp(0.06,0.04,rd);wa=lerp(0.25,ry,rd);wb=lerp(-0.3,wp,rd);wc=lerp(-0.2,0,rd);}
  else if(h==='tube'){wx=-0.13;wy=0.47;wz=0.0;wa=lerp(0.05,ry,rd);wb=lerp(0.55,wp,rd);wc=0;}
  else{wx=lerp(-0.12,-0.115,rd);wy=lerp(0.15,0.405,rd);wz=lerp(0.15,0.1,rd);wa=lerp(0.4,ry+0.02,rd);wb=lerp(-0.32+tB*0.5,wp,rd);wc=lerp(-0.4,0,rd);}
  const fk=A.fire*(h==='pistol'?1.6:1);wz-=fk*0.045;wb+=fk*0.07;
  if(act==='reload'){const k=Math.sin(Math.PI*Math.min(1,u*1.15));wb-=0.35*k;wc+=0.5*k;wa+=0.2*k;wy-=0.07*k;wx+=0.04*k;}
  else if(act==='bolt'){const k=Math.sin(Math.PI*u);wc+=0.25*k;wb-=0.06*k;}
  else if(thr>=0){wx=-0.06;wy=0.12;wz=0.16;wa=0.7;wb=-0.7;wc=-0.3;}
  AM.bone(M[BW],M[BT],wx,wy,wz,wa,wb,wc);
  // manos: en el arma (o en la ametralladora fija); recarga, cerrojo y granada mueven una
  const W=mt?mt.m:M[BW],G=mt?ACT_GUN.mg42mount:g,mz=mt?-0.35:0,rh=AM.pt(W,G.rh[0],G.rh[1],G.rh[2]+mz,v[2]),lh=AM.pt(W,G.lh[0],G.lh[1],mt?0.05:G.lh[2]+mz,v[3]);
  if(act==='reload'){const k=Math.sin(Math.PI*clamp((u-0.08)/0.62,0,1)),pp=AM.pt(M[BT],0.06,0.02,0.17,v[4]);V3.lerp(lh,pp,k,lh);}
  else if(act==='bolt'&&g.bolt){const k=Math.sin(Math.PI*u),bp=AM.pt(W,g.bolt[0],g.bolt[1],g.bolt[2],v[4]);V3.lerp(rh,bp,k,rh);}
  else if(thr>=0){const b=v[4],k=thr<0.5?thr/0.5:1-(thr-0.5)/0.5;if(thr<0.5)AM.pt(M[BT],lerp(-0.12,-0.24,k),lerp(0.15,0.68,k),lerp(0.15,-0.22,k),b);
   else AM.pt(M[BT],lerp(-0.1,-0.12,k),lerp(0.3,0.62,k),lerp(0.55,-0.22,k),b);V3.copy(b,rh);if(thr<0.12)AM.pt(W,G.rh[0],G.rh[1],G.rh[2],rh);}
  else if(act==='shout'){const k=Math.sin(Math.PI*u);AM.pt(M[BT],0.25,lerp(0.5,0.85,k),lerp(0.3,0.45,k),v[4]);V3.lerp(lh,v[4],k,lh);}
  if(h==='pistol'&&rd<0.5&&!mt)AM.pt(M[BT],0.2,0.05,0.04,lh);
  this._arm(M,BUL,1,lh,v);this._arm(M,BUR,-1,rh,v);
  // piernas: pies con la marcha (o una rodilla en tierra agachado) y IK con la rodilla hacia delante
  const sx=A.mx,sz=A.mz,S=A.S*mv,near=V3.dist2(a.pos,Cam.eye)<900;
  for(const s of [1,-1]){const f=ph+(s>0?0:Math.PI),c=Math.cos(f),sn=Math.sin(f),lift=sn<0?-sn*(0.08+0.14*run)*mv:0,ti=s>0?BTL:BTR;
   let fx=s*0.105+sx*S*c+cr*s*0.035,fz=sz*S*c+0.02+cr*(s>0?0.24:-0.29),fy=0.085+lift+cr*(s>0?0:0.045);
   if(mt){fz=s>0?0.12:-0.32;fy=s>0?0.085:0.13;}
   const hj=AM.pt(M[BH],s*0.095,-0.05,0,v[5]),ft=AM.pt(M[BR],fx,fy,fz,v[6]);
   if(near&&a.onGround){const gy=World.height(ft[0],ft[2])-a.pos[1];if(Math.abs(gy)<0.35)ft[1]+=gy;}
   const pole=AM.dir(M[BR],s*0.15,s>0||cr<0.5?0.25:-0.45,1,v[7]),E=v[8],F=v[9];AM.ik(hj,ft,0.45*sc,0.45*sc,pole,E,F);
   const fw=AM.dir(M[BR],0,0,1,v[1]);AM.seg(M[ti],hj,E,fw);AM.seg(M[ti+1],E,F,fw);
   const fp=lift*1.6-(s<0?cr*0.95:0)+(mt&&s<0?-0.9:0);M4.compose(F,a.yaw+s*0.07,fp,0,sc,M[ti+2]);}},
 // brazo con IK: hombro del torso -> muñeca en T; s=1 izquierdo, -1 derecho
 _arm(M,bi,s,T,v){const sh=AM.pt(M[BT],s*0.19,0.445,-0.01,v[5]),pole=AM.dir(M[BT],s*0.55,-0.85,-0.25,v[6]),E=v[7],F=v[8];AM.ik(sh,T,0.29,0.26,pole,E,F);
  const fw=AM.dir(M[BT],0,0,1,v[9]);v[0][0]=F[0]-E[0];v[0][1]=F[1]-E[1];v[0][2]=F[2]-E[2];V3.norm(v[0],v[0]);
  AM.seg(M[bi],sh,E,v[0]);AM.seg(M[bi+1],E,F,fw);v[1][0]=F[0]+v[0][0]*0.09;v[1][1]=F[1]+v[0][1]*0.09;v[1][2]=F[2]+v[0][2]*0.09;AM.seg(M[bi+2],F,v[1],fw);},
 // muerte por fotogramas clave con cinemática directa
 _dead(a){const A=a.anim,M=a.bm,K=A.dkeys,P=A.dk;if(!K)return;const t=a.deadT,end=ACT_DIE[A.die].end;
  if(A.settled&&t>end+0.1)return;A.settled=t>end;let i=0;while(i<K.length-2&&t>K[i+1].t)i++;const k0=K[i],k1=K[i+1],q=clamp((t-k0.t)/Math.max(1e-3,k1.t-k0.t),0,1),e=k1.e==='in'?q*q:smooth(q);
  for(let j=0;j<ACT_DP.length;j++){const n=ACT_DP[j];P[j]=k0[n]+(k1[n]-k0[n])*e;}
  const [rp,rr,ry,ty,tz,h,hp,tb,tr,tw,hb,hr,hy,lt,lk,lto,rt,rk,rto,la,lo,le,ra,ro,re]=P,mi=A.mirror,fin=smooth(clamp(t/end,0,1));
  const rp2=rp-A.slope*fin*Math.sign(rp||1)*(Math.abs(rp)>Math.abs(rr)?1:0),rr2=rr*mi-(Math.abs(rr)>=Math.abs(rp)?A.slope*fin*Math.sign(rr*mi||1):0);
  M4.trs(a.pos[0],a.pos[1],a.pos[2],0,a.yaw+ry*mi,0,M[BR]);M4.translate(M[BR],0,ty,tz);M4.trs(0,0,0,rp2,0,rr2,AM.L);M4.mul(M[BR],AM.L,M[BR]);
  const sc=a.ht;if(sc!==1)for(let k=0;k<12;k++)if(k%4<3)M[BR][k]*=sc;
  AM.bone(M[BH],M[BR],0,h,0,0,-hp,0);AM.bone(M[BT],M[BH],0,0.06,0,tw*mi,-tb,tr*mi);AM.bone(M[BHd],M[BT],0,0.52,0.005,hy,-hb,hr*mi);
  const lg=(s,ti,th,kn,out)=>{AM.bone(M[ti],M[BH],s*0.095,-0.05,0,0,th,s*out);AM.bone(M[ti+1],M[ti],0,-0.45,0,0,-kn,0);AM.bone(M[ti+2],M[ti+1],0,-0.45,0,0,kn*0.3,0);};
  const lgL=mi>0?[lt,lk,lto]:[rt,rk,rto],lgR=mi>0?[rt,rk,rto]:[lt,lk,lto];lg(1,BTL,...lgL);lg(-1,BTR,...lgR);
  const am=(s,bi,f,o,e)=>{AM.bone(M[bi],M[BT],s*0.19,0.445,-0.01,0,f,s*o);AM.bone(M[bi+1],M[bi],0,-0.29,0,0,e,0);AM.bone(M[bi+2],M[bi+1],0,-0.26,0,0,0.1,0);};
  if(mi>0){am(1,BUL,la,lo,le);am(-1,BUR,ra,ro,re);}else{am(1,BUL,ra,ro,re);am(-1,BUR,la,lo,le);}},
 // ---------- vehículos: simulación ----------
 _tank(a,dt){const V=a.V,A=a.anim;A.t+=dt;A.hit=Math.max(0,A.hit-dt*2);
  if(!a.alive){a.deadT+=dt;if(a.fx&&a.fx.fire&&a.deadT>50&&typeof FX!=='undefined'&&FX.stop){FX.stop(a.fx.fire);a.fx.fire=null;}return;}
  // marcha: velocidad hacia a.drive, giro hacia a.steer (la IA los pone)
  const dy=angNorm(a.steer-a.yaw),wmax=V.turn*(a.v<0?-1:1)*(Math.abs(a.v)<0.3?0.8:1),w=clamp(dy*2,-V.turn,V.turn);a.w=Math.abs(dy)<0.005?0:w;a.yaw=angNorm(a.yaw+a.w*dt);
  const tv=clamp(a.drive,-a.speedMax*0.5,a.speedMax)*(Math.abs(dy)>0.8?0.3:1),acc=tv>a.v?V.acc:V.acc*1.6;a.v+=clamp(tv-a.v,-acc*dt,acc*dt);
  a.vel[0]=Math.sin(a.yaw)*a.v;a.vel[2]=Math.cos(a.yaw)*a.v;a.vel[1]=0;const R=World.moveCapsule(a.pos,a.vel,V.r,V.h,dt,true);if(R.hitWall)a.v*=0.9;
  // apoyo en el relieve: altura media y cabeceo/alabeo suaves
  const c=Math.cos(a.yaw),s=Math.sin(a.yaw),H=(x,z)=>World.height(a.pos[0]+s*z+c*x,a.pos[2]+c*z-s*x),hf=H(0,V.hz*0.8),hb=H(0,-V.hz*0.8),hl=H(V.hx*0.8,0),hr=H(-V.hx*0.8,0);
  a.pos[1]+=((hf+hb+hl+hr)/4-a.pos[1])*Math.min(1,dt*10);const tp=Math.atan2(hf-hb,V.hz*1.6)-(a.v-(a._v0||0))/dt*0.004,tr=Math.atan2(hl-hr,V.hx*1.6);a._v0=a.v;
  a.tilt[0]+=(clamp(tp,-0.5,0.5)-a.tilt[0])*Math.min(1,dt*4);a.tilt[1]+=(tr-a.tilt[1])*Math.min(1,dt*4);
  a.trL+=(a.v-a.w*V.hx)*dt;a.trR+=(a.v+a.w*V.hx)*dt;a.speed=Math.abs(a.v);
  // torreta y cañón hacia a.aimT (velocidad limitada; suena al empezar a girar)
  if(V.tur){const d=angNorm(a.aimT[0]-(a.yaw+a.tur)),ts=V.turS*dt,st=Math.abs(d)>0.01;a.tur=angNorm(a.tur+clamp(d,-ts,ts));if(st&&!a.turS&&typeof Snd!=='undefined')Snd.play('turret',{pos:a.pos});a.turS=st?1:0;
   a.gp+=clamp(clamp(a.aimT[1],-0.14,0.35)-a.gp,-0.3*dt,0.3*dt);a.aim[0]=angNorm(a.yaw+a.tur);a.aim[1]=a.gp;}
  else{a.aim[0]=a.aimT[0];a.aim[1]=a.aimT[1];}
  // humo del escape y del motor dañado
  if(typeof FX!=='undefined'&&V3.dist2(a.pos,Cam.eye)<40000){a.ex-=dt;if(a.ex<=0){const k=Math.abs(a.v)/a.speedMax;a.ex=0.09+0.3*(1-k);const e=V.exh;
    for(const sx of e[3]?[-1,1]:[1]){const q=this._v[0];q[0]=a.pos[0]+s*e[2]+c*e[0]*sx;q[1]=a.pos[1]+e[1];q[2]=a.pos[2]+c*e[2]-s*e[0]*sx;FX.smoke(q,{puff:true,size:0.25+0.3*k,life:1.2+k});}
    const hp=a.health/a.maxHealth;if(hp<0.6&&Math.random()<0.7){const q=this._v[0];q[0]=a.pos[0]-s*V.hz*0.5;q[1]=a.pos[1]+V.h*0.75;q[2]=a.pos[2]-c*V.hz*0.5;FX.smoke(q,{puff:true,size:0.5+(0.6-hp),life:2.5});}}}
  if(a.health/a.maxHealth<0.3&&!a.fx&&typeof FX!=='undefined'){a.fx={fire:FX.fire([a.pos[0]-s*V.hz*0.55,a.pos[1]+V.h*0.7,a.pos[2]-c*V.hz*0.55],0.6),smoke:null};}
  if(a.fx&&a.fx.fire){const f=a.fx.fire,p=f.pos;p[0]=a.pos[0]-s*V.hz*0.55;p[1]=a.pos[1]+V.h*0.7;p[2]=a.pos[2]-c*V.hz*0.55;if(f.lt){f.lt.pos[0]=p[0];f.lt.pos[1]=p[1]+0.6;f.lt.pos[2]=p[2];}}},
 // blindaje: frente fuerte, lados medios, trasera débil. Cohete x1 con multiplicador, carga x5, granada x0.1 (x0.6 semioruga), balas nada (o poco en el semioruga)
 _dmgVeh(a,dmg,part,info){const V=a.V,pos=info.pos||this.chest(a),w=info.weapon||'',ex=!!info.explosive;let k;
  if(!ex){k=a.half?0.05:0;if(typeof FX!=='undefined'&&info.pos)FX.impact(info.pos,this._vn,'metal',0.6);}
  else{const src=this._exp&&this.time-this._expT<0.05?this._exp:info.by&&info.by.pos?info.by.pos:null;let side=1;
   if(src){const c=Math.cos(a.yaw),s=Math.sin(a.yaw),dx=src[0]-a.pos[0],dz=src[2]-a.pos[2],lz=s*dx+c*dz,lx=c*dx-s*dz,top=src[1]>a.pos[1]+V.h*0.9&&Math.hypot(lx,lz)<V.hz;
    side=top?V.arm[3]:Math.abs(lz)/V.hz>Math.abs(lx)/V.hx?(lz>0?V.arm[0]:V.arm[2]):V.arm[1];}
   k=/bazooka|rocket|piat|faust/.test(w)?side:/frag|stiel|grenade/.test(w)?(a.half?0.6:0.1):w==='cannon'?side*0.8:5*Math.max(1,side*0.6);}
  const d=dmg*k;a.anim.hit=1;a.hatch=0;if(d<=0){Bus.emit('hit',{actor:a,part:part||'hull',dmg:0,pos,by:info.by,kill:false});return;}
  if(a.hero){a.health=Math.max(1,a.health-d);Bus.emit('hit',{actor:a,part,dmg:d,pos,by:info.by,kill:false});return;}
  a.health-=d;const kill=a.health<=0;Bus.emit('hit',{actor:a,part:part||'hull',dmg:d,pos,by:info.by,kill});if(kill)this._killVeh(a,info);},
 _killVeh(a,info){if(!a.alive)return;a.alive=false;a.health=0;a.deadT=0;a.v=0;a.drive=0;const V=a.V,c=[a.pos[0],a.pos[1]+V.h*0.6,a.pos[2]];
  a.pop=V.tur&&Math.random()<0.6?{y:0.25+Math.random()*0.5,r:(Math.random()-0.5)*0.5,yaw:(Math.random()-0.5)*1.5}:null;
  if(typeof FX!=='undefined'){FX.explosion(c,V.tur?7:5);if(a.fx&&a.fx.fire&&FX.stop)FX.stop(a.fx.fire);
   a.fx={fire:FX.fire([a.pos[0],a.pos[1]+V.h*0.8,a.pos[2]],V.tur?1.5:1.1),smoke:FX.smoke([a.pos[0],a.pos[1]+V.h+0.5,a.pos[2]],{rate:4,size:1.8,life:8,col:[0.13,0.12,0.11]})};}
  Bus.emit('kill',{actor:a,by:info&&info.by,weapon:info&&info.weapon,headshot:false});Bus.emit('destroyed',{pos:c,actor:a});
  if(World.cover&&World.cover.add){const s=Math.sin(a.yaw),co=Math.cos(a.yaw);for(const [x,z,nx,nz] of [[V.hx+0.6,0,1,0],[-V.hx-0.6,0,-1,0],[0,V.hz+0.6,0,1],[0,-V.hz-0.6,0,-1]]){
    const p=[a.pos[0]+co*x+s*z,0,a.pos[2]-s*x+co*z];p[1]=World.height(p[0],p[2]);World.cover.add(p,[co*nx+s*nz,0,-s*nx+co*nz],false);}}},
 // ---------- dibujo ----------
 _part(k){let P=this.P[k];if(P)return P;const g=new Geo(),i=k.indexOf(':'),nm=i<0?k:k.slice(0,i),arg=i<0?null:k.slice(i+1);
  if(AW[nm])AW[nm](g);else if(nm[0]==='v')ACT_VG[nm](g,arg);
  else{const C=ACT_LOOK[arg]||ACT_LOOK.de;
   if(nm==='thighL'||nm==='thighR')AP.thigh(g,C,nm==='thighL'?1:-1);else if(nm==='torso')(C.team==='ally'?AP.torsoUS:AP.torsoDE)(g,C);
   else if(nm==='helm'){if(C.helm==='m1'||C.helm==='m1n')AP.m1(g,C,C.helm==='m1n');else if(C.helm==='cap')AP.cap(g,C);else AP.de(g,C,C.helm==='decov');}
   else if(nm.startsWith('head'))AP.head(g,C,+nm[4]);else AP[nm](g,C);}
  const gl=/^w_|helm/.test(nm)?(nm==='w_bazooka'?0.15:0.25):nm[0]==='v'?0.22:nm==='foot'&&ACT_LOOK[arg]&&ACT_LOOK[arg].team==='axis'?0.18:0;
  return this.P[k]={m:GL.matInst(g),d:new Float32Array(19*8),n:0,gloss:gl};},
 _put(k,M,c0,c1,c2){const p=this._part(k);if((p.n+1)*19>p.d.length){const d=new Float32Array(p.d.length*2);d.set(p.d);p.d=d;}const o=p.n*19;p.d.set(M,o);p.d[o+16]=c0;p.d[o+17]=c1;p.d[o+18]=c2;p.n++;},
 _build(){if(!this.P)this.P={};const P=this.P;for(const k in P)P[k].n=0;let nb=0;const e=Cam.eye,far=Math.max(120,(Env.fogF||400)*1.05*(GFX.G.dist||1)),q=this._v[0],lod=GFX.G.lod||0;
  for(const a of this.list){const dx=a.pos[0]-e[0],dz=a.pos[2]-e[2],d2=dx*dx+dz*dz;if(d2>far*far)continue;q[0]=a.pos[0];q[1]=a.pos[1]+1;q[2]=a.pos[2];
   if(d2>625&&!Cam.sphereVisible(q,a.tank?5:1.6))continue;
   if(a.tank){this._buildVeh(a,d2);if(nb<96){this._blobAt(nb++,a.pos,a.yaw,a.V.hx*2.2,a.V.hz*2.2,0.55);}continue;}
   this.pose(a);const M=a.bm,L=a.look,t=a.tint,sk=a.skin,dead=!a.alive,dk=dead?0.85:1,small=d2<(lod>=2?3600:1600);
   const cl=(k,m)=>this._put(k+':'+L,m,t[0]*dk,t[1]*dk,t[2]*dk);
   cl('hips',M[BH]);cl('torso',M[BT]);this._put('head'+a.headV+':'+L,M[BHd],sk[0],sk[1],sk[2]);cl('helm',M[BHd]);
   cl('armU',M[BUL]);cl('armU',M[BUR]);cl('armF',M[BFL]);cl('armF',M[BFR]);cl('thighL',M[BTL]);cl('thighR',M[BTR]);cl('shin',M[BSL]);cl('shin',M[BSR]);
   const C=ACT_LOOK[L];if(C.glove){cl('glove',M[BKL]);cl('glove',M[BKR]);}else{this._put('hand:'+L,M[BKL],sk[0],sk[1],sk[2]);this._put('hand:'+L,M[BKR],sk[0],sk[1],sk[2]);}
   if(small||d2<6400){cl('foot',M[BPL]);cl('foot',M[BPR]);for(const gk of a.gear)cl(gk,M[BT]);}
   if(!dead){const mt=a.anim.mount;if(mt){this._mgMat(a,mt);this._put('w_mgnest',mt.m,1,1,1);}else this._put(a.gun.m,M[BW],1,1,1);
    if(a.glint>0.05&&a.gun.scope){const gp=AM.pt(M[BW],a.gun.scope[0],a.gun.scope[1],a.gun.scope[2],this._v[1]),dirx=e[0]-gp[0],diry=e[1]-gp[1],dirz=e[2]-gp[2],dl=Math.hypot(dirx,diry,dirz)||1;
     const fd=AM.dir(M[BW],0,0,1,this._v[2]),k=Math.pow(Math.max(0,(fd[0]*dirx+fd[1]*diry+fd[2]*dirz)/dl),6)*a.glint;
     if(k>0.05){const G=this._G,s=Math.min(6,0.6+dl*0.035)*(0.7+0.3*Math.sin(GL.time*23));M4.basis(Cam.right,Cam.up,[-Cam.fwd[0],-Cam.fwd[1],-Cam.fwd[2]],gp,G);for(let i=0;i<11;i++)if(i%4<3)G[i]*=s;
      this._put('glint',G,6*k,5.6*k,4.6*k);}}
    if(nb<96)this._blobAt(nb++,a.pos,a.yaw,0.5,0.5,0.45);}}
  for(const k in P)if(P[k].n)GL.setMatInst(P[k].m,P[k].d,P[k].n);this._nb=nb;},
 _blobAt(i,p,yaw,w,l,al){const o=i*10,B=this._blob;B[o]=p[0];B[o+1]=p[1]+0.03;B[o+2]=p[2];B[o+3]=yaw;B[o+4]=w;B[o+5]=l;B[o+6]=al;},
 // matriz de la ametralladora fija que maneja un soldado (gira con su puntería)
 _mgMat(a,mt){const u=mt.u,y=u.pos[1]+(u.mountH!=null?u.mountH:0.6)+0.32;M4.compose([u.pos[0],y,u.pos[2]],a.aim[0],clamp(a.aim[1],-0.3,0.3),0,1,mt.m);M4.translate(mt.m,0,0,0.35);},
 draw(pass,ci){if(!this.list.length||!GL.gl)return;if(this._fr!==GL.frameNo){this._fr=GL.frameNo;this._build();}const gl=GL.gl,P=this.P,sh=pass==='shadow';
  const p=sh?GL.progs.depth:GL.progs.lit;if(!sh)Lit.setup(p);gl.uniform1f(p.u.uInst,2);
  for(const k in P){const q=P[k];if(!q.n||sh&&k==='glint')continue;if(!sh)gl.uniform1f(p.u.uGloss,q.gloss);GL.draw(q.m);}
  gl.uniform1f(p.u.uInst,0);if(!sh){gl.uniform1f(p.u.uGloss,0);if(!Shadow.active&&this._nb)GL.drawBlobs(this._blob,this._nb);}}
};
Bus.on('glRestored',()=>{Actors.P=null;Actors._fr=-1;});
// la última explosión (para saber por qué lado entra en el blindaje)
Bus.on('explosion',d=>{Actors._exp=d.pos;Actors._expT=Actors.time;});

// ---------- vehículos: datos y geometría ----------
// hx,hz medias del casco; hy0+hh centro vertical de la caja de impacto; tur [x,y,z, hx,hy,hz] de la torreta (y en su base); gun [y,z] del muñón;
// arm [frente, lado, trasera, techo]; wheels [[z,y,r],...] por lado en x=wx; track: [ancho, z0 (atrás), z1 (delante), y suelo]; exh [x,y,z,dos]
const ACT_VEH={
 pz4:{hp:1000,r:1.7,h:2.65,hx:1.45,hz:2.95,hy0:0.4,hh:0.7,speed:5.5,turn:0.45,acc:2.2,turS:0.5,tur:[0,1.72,0.25,1.0,0.36,1.0],gun:[0.33,0.95],len:3.7,arm:[0.75,1.3,2.4,2.2],
  wx:1.2,wr:0.235,wheels:[-1.91,-1.39,-0.81,-0.29,0.29,0.81,1.39,1.91],wy:0.3,spr:[2.4,0.62,0.3],idl:[-2.5,0.55,0.27],tw:0.42,exh:[0.55,1.05,-3.0,0],crew:[0,0.72,-0.52],coax:[0.25,0.28,0.95],mg:[-0.55,1.45,1.8]},
 tiger:{hp:1700,r:1.9,h:2.9,hx:1.8,hz:3.15,hy0:0.45,hh:0.75,speed:4.2,turn:0.35,acc:1.6,turS:0.32,tur:[0,1.95,0.0,1.15,0.45,1.3],gun:[0.42,1.2],len:5.0,arm:[0.45,1.0,1.8,1.8],
  wx:1.4,wr:0.4,wheels:[-2.35,-1.68,-1.0,-0.33,0.33,1.0,1.68,2.35],wy:0.42,spr:[2.85,0.75,0.38],idl:[-2.85,0.72,0.36],tw:0.72,exh:[0.5,2.2,-3.1,1],big:1,crew:[0.45,0.9,-0.35],coax:[0.3,0.4,1.2],mg:[-0.6,1.65,2.6]},
 ht:{hp:550,r:1.3,h:2.1,hx:1.05,hz:2.9,hy0:0.45,hh:0.6,speed:7,turn:0.55,acc:2.8,tur:null,len:0,arm:[0.9,1.2,1.6,1.6],
  wx:0.82,wr:0.28,wheels:[-2.2,-1.75,-1.3,-0.85,-0.4],wy:0.32,spr:[0.15,0.5,0.25],idl:[-2.6,0.45,0.24],tw:0.3,exh:[0.7,0.6,1.3,0],ht:1,crew:[0,1.3,0.35],mg:[0,1.9,0.75]}
};
// colores del carro: amarillo oscuro con manchas, gris o encalado
const ACT_CAMO={yellow:['#9b8a5b','#5d6640','#70543a'],grey:['#565b58','#4b504d','#5f625c'],white:['#d8dad4','#9c9a8e','#c3c5bf']};
// parte los triángulos pintados (blancos) grandes en cuatro hasta que ningún lado pase de e metros: el camuflaje sale con bordes irregulares
function aSub(g,m,e){const P=g.p.splice(m),N=g.n.splice(m),C=g.c.splice(m),U=g.u.splice(m/3*2),add=(a,b,c,n,col,d)=>{const l=Math.max(V3.dist(a,b),V3.dist(b,c),V3.dist(c,a));
  if(l>e&&d<5&&col[0]===1&&col[1]===1){const ab=V3.lerp(a,b,0.5),bc=V3.lerp(b,c,0.5),ca=V3.lerp(c,a,0.5);add(a,ab,ca,n,col,d+1);add(ab,b,bc,n,col,d+1);add(ca,bc,c,n,col,d+1);add(ab,bc,ca,n,col,d+1);return;}
  for(const v of [a,b,c]){g.p.push(v[0],v[1],v[2]);g.n.push(n[0],n[1],n[2]);g.c.push(col[0],col[1],col[2]);g.u.push(0,0);}};
 for(let i=0;i<P.length;i+=9)add([P[i],P[i+1],P[i+2]],[P[i+3],P[i+4],P[i+5]],[P[i+6],P[i+7],P[i+8]],[N[i],N[i+1],N[i+2]],[C[i],C[i+1],C[i+2]],0);}
function aCamo(g,m,kind,seed){aSub(g,m,0.45);const C=(ACT_CAMO[kind]||ACT_CAMO.yellow).map(hex),P=g.p,c=g.c;for(let i=m*1;i<c.length;i+=9){if(Math.abs(c[i]-1)>0.01||Math.abs(c[i+1]-1)>0.01)continue;
  const x=(P[i]+P[i+3]+P[i+6])/3,y=(P[i+1]+P[i+4]+P[i+7])/3,z=(P[i+2]+P[i+5]+P[i+8])/3,n=fbm2(x*0.55+z*0.42+seed,y*0.9+z*0.5-x*0.2,seed,3);
  const col=n>0.59?C[2]:n<0.41?C[1]:C[0],k=0.95+((i*7919)%97)/97*0.1;for(let j=0;j<9;j+=3){c[i+j]=col[0]*k;c[i+j+1]=col[1]*k;c[i+j+2]=col[2]*k;}}}
const ACT_VG={
 // casco del Panzer IV (blanco = pintura)
 v_pz4h(g,cm){const W=[1,1,1],dk=hex('#2b2a27'),m=g.mark();
  g.box(-0.95,0.95,0.42,1.16,-2.95,2.55,W);g.hexa([[-0.95,0.5,2.55],[0.95,0.5,2.55],[0.95,0.85,2.95],[-0.95,0.85,2.95],[-0.95,1.16,2.55],[0.95,1.16,2.55],[0.95,1.06,2.95],[-0.95,1.06,2.95]],W);
  g.box(-1.47,1.47,1.14,1.18,-2.95,2.75,W);g.box(-1.12,1.12,1.16,1.78,-2.35,1.72,W);g.hexa([[-1.12,1.16,1.72],[1.12,1.16,1.72],[1.12,1.16,2.6],[-1.12,1.16,2.6],[-1.12,1.78,1.72],[1.12,1.78,1.72],[1.12,1.25,2.6],[-1.12,1.25,2.6]],W);
  g.box(-1.1,1.1,1.16,1.52,-2.95,-2.35,W);for(let i=0;i<5;i++)g.box(-0.9,0.9,1.52,1.55,-2.85+i*0.11,-2.8+i*0.11,dk);
  g.box(0.35,0.75,1.42,1.6,1.72,1.79,dk);const b=g.mark();g.sphere(0.13,8,4,W);g.translate(b,-0.6,1.48,1.73);aTube(g,[-0.6,1.48,1.8],[-0.6,1.48,2.05],0.025,0.02,5,dk);
  g.box(-0.75,-0.35,1.78,1.82,0.6,1.3,W);g.box(0.35,0.75,1.78,1.82,0.6,1.3,W);g.box(-0.5,0.5,1.52,1.6,-1.6,-1.0,dk);
  for(const s of [-1,1]){for(let i=0;i<5;i++){const z0=-2.55+i*0.95;g.box(s*1.5,s*1.54,0.62,1.62,z0,z0+0.92,W);}g.box(s*1.38,s*1.55,1.6,1.64,-2.6,2.2,W);}
  for(const s of [-1,1])for(const z of [-2.6,2.5])g.box(s*1.2-0.05,s*1.2+0.05,0.1,0.95,z-0.04,z+0.04,dk);
  aTube(g,[0.55,1.0,-2.97],[0.55,1.0,-3.12],0.06,0.06,6,dk);g.box(-1.05,1.05,0.42,1.0,-3.0,-2.95,W);
  for(const s of [-1,1])aTube(g,[s*0.85,1.25,2.7],[s*0.85,1.3,2.85],0.07,0.07,6,hex('#d8d0a8'));
  for(let i=0;i<4;i++){const z=-1.6+i*1.0;aTube(g,[1.0,0.96,z],[1.4,0.96,z],0.08,0.08,6,dk);aTube(g,[-1.0,0.96,z],[-1.4,0.96,z],0.08,0.08,6,dk);}aCamo(g,m,cm,3);},
 v_pz4t(g,cm){const W=[1,1,1],dk=hex('#2b2a27'),m=g.mark();
  g.hexa([[-1.0,0,-1.05],[1.0,0,-1.05],[0.95,0,0.85],[-0.95,0,0.85],[-0.82,0.7,-0.92],[0.82,0.7,-0.92],[0.78,0.7,0.7],[-0.78,0.7,0.7]],W);
  g.bbox(-0.36,0.36,0.12,0.56,0.82,1.02,0.03,W);aTube(g,[0,0.34,1.0],[0,0.34,1.18],0.11,0.1,8,W);
  const c=g.mark();g.cyl(0.32,0.3,0.7,0.92,10,W);g.cyl(0.33,0.33,0.92,0.97,10,W);g.translate(c,0,0,-0.52);g.box(-0.31,0.31,0.8,0.84,-0.84,-0.2,dk);
  for(const s of [-1,1]){g.hexa([[s*1.18,-0.08,-1.2],[s*1.21,-0.08,-1.2],[s*1.21,-0.08,0.55],[s*1.18,-0.08,0.55],[s*1.18,0.6,-1.2],[s*1.21,0.6,-1.2],[s*1.21,0.6,0.55],[s*1.18,0.6,0.55]],W);
   g.box(s*0.82,s*1.0,0.1,0.55,0.1,0.5,dk);}g.box(-1.21,1.21,-0.08,0.6,-1.24,-1.2,W);
  g.box(0.5,0.9,0.7,0.73,-0.35,0.25,W);aTube(g,[0.6,0.7,-0.9],[0.6,1.6,-0.9],0.01,0.006,3,dk);aCamo(g,m,cm,7);},
 v_pz4g(g){const dk=hex('#3b3c37'),m=g.mark();aTube(g,[0,0,0],[0,0,3.4],0.06,0.05,8,dk);aTube(g,[0,0,3.4],[0,0,3.7],0.085,0.085,8,dk);g.box(-0.1,0.1,-0.06,0.06,3.5,3.6,hex('#2a2b28'));g.vary(m,mulberry32(1),0.05);},
 v_tgh(g,cm){const W=[1,1,1],dk=hex('#2b2a27'),m=g.mark();
  g.box(-0.95,0.95,0.42,1.05,-3.05,2.9,W);g.hexa([[-0.95,0.42,2.9],[0.95,0.42,2.9],[0.95,0.9,3.2],[-0.95,0.9,3.2],[-0.95,1.05,2.9],[0.95,1.05,2.9],[0.95,1.05,3.2],[-0.95,1.05,3.2]],W);
  g.box(-1.8,1.8,1.02,1.95,-3.1,2.65,W);g.box(-1.8,1.8,1.02,1.6,2.65,3.25,W);g.hexa([[-1.8,1.6,2.65],[1.8,1.6,2.65],[1.8,1.6,3.25],[-1.8,1.6,3.25],[-1.8,1.95,2.65],[1.8,1.95,2.65],[1.8,1.63,3.25],[-1.8,1.63,3.25]],W);
  g.box(0.35,0.85,1.62,1.82,3.24,3.29,dk);const b=g.mark();g.sphere(0.14,8,4,W);g.translate(b,-0.75,1.72,3.25);aTube(g,[-0.75,1.72,3.3],[-0.75,1.72,3.55],0.025,0.02,5,dk);
  for(let i=0;i<3;i++)for(const s of [-1,1])g.box(s*0.2,s*1.0,1.95,1.98,-2.9+i*0.6,-2.5+i*0.6,dk);
  for(const s of [-1,1]){aTube(g,[s*0.55,1.4,-3.15],[s*0.55,2.35,-3.15],0.09,0.08,8,dk);g.box(s*0.55-0.13,s*0.55+0.13,1.5,2.3,-3.28,-3.25,W);}
  g.box(-1.8,1.8,1.95,1.97,-1.0,0.9,W);for(const s of [-1,1])g.box(s*1.79,s*1.82,0.75,1.04,-3.1,3.0,W);
  for(const s of [-1,1])aTube(g,[s*1.1,1.97,2.4],[s*1.1,2.05,2.4],0.05,0.05,5,dk);aCamo(g,m,cm,5);},
 v_tgt(g,cm){const W=[1,1,1],dk=hex('#2b2a27'),m=g.mark(),pts=[];
  for(let i=0;i<=12;i++){const a=Math.PI*0.5+i/12*Math.PI;pts.push([Math.cos(a)*1.2,Math.sin(a)*1.25-0.05]);}pts.push([1.2,1.0],[-1.2,1.0]);
  const R=[];for(let i=0;i<=12;i++)R.push(pts[i]);const top=0.85,ring=[[-1.15,1.02],...R.map(([x,z])=>[-x,z]),[1.15,1.02]];
  for(let i=0;i<ring.length-1;i++){const [x0,z0]=ring[i],[x1,z1]=ring[i+1];g.quad([x0,0,z0],[x1,0,z1],[x1,top,z1],[x0,top,z0],W,[0,top/2,0]);g.tri([0,top,0],[x0,top,z0],[x1,top,z1],W,[0,0,0]);}
  g.quad([1.15,0,1.02],[-1.15,0,1.02],[-1.15,top,1.02],[1.15,top,1.02],W,[0,top/2,0]);g.tri([0,top,0],[1.15,top,1.02],[-1.15,top,1.02],W,[0,0,0]);
  g.bbox(-0.75,0.75,0.08,0.78,0.98,1.28,0.05,W);aTube(g,[0,0.42,1.25],[0,0.42,1.5],0.16,0.14,8,W);
  const c=g.mark();g.cyl(0.33,0.32,0.85,1.08,10,W);g.translate(c,0.45,0,-0.35);g.box(0.13,0.77,0.95,0.99,-0.6,-0.1,dk);
  for(const s of [-1,1])for(let i=0;i<3;i++)aTube(g,[s*1.16,0.55,-0.6+i*0.25],[s*1.16,0.55,-0.45+i*0.25],0.09,0.09,6,dk);aCamo(g,m,cm,9);},
 v_tgg(g){const dk=hex('#3b3c37'),m=g.mark();aTube(g,[0,0,0],[0,0,4.5],0.09,0.07,8,dk);aTube(g,[0,0,4.5],[0,0,4.95],0.13,0.13,8,dk);g.box(-0.16,0.16,-0.1,0.1,4.6,4.85,hex('#2a2b28'));g.vary(m,mulberry32(2),0.05);},
 // semioruga: casco abierto de chapas inclinadas, morro del motor y escudo de la ametralladora
 v_hth(g,cm){const W=[1,1,1],dk=hex('#2b2a27'),fl=hex('#3a3833'),m=g.mark();
  g.hexa([[-0.9,0.55,-2.7],[0.9,0.55,-2.7],[0.9,0.55,1.25],[-0.9,0.55,1.25],[-1.08,1.2,-2.7],[1.08,1.2,-2.7],[1.08,1.2,1.25],[-1.08,1.2,1.25]],W);
  for(const s of [-1,1])g.hexa([[s*1.08,1.2,-2.7],[s*1.02,1.2,-2.7],[s*1.02,1.2,0.95],[s*1.08,1.2,0.95],[s*0.96,1.82,-2.6],[s*0.9,1.82,-2.6],[s*0.9,1.82,0.95],[s*0.96,1.82,0.95]],W);
  g.hexa([[-1.08,1.2,-2.7],[1.08,1.2,-2.7],[1.08,1.2,-2.64],[-1.08,1.2,-2.64],[-0.96,1.82,-2.6],[0.96,1.82,-2.6],[0.96,1.82,-2.54],[-0.96,1.82,-2.54]],W);
  g.hexa([[-1.08,1.2,0.95],[1.08,1.2,0.95],[1.08,1.2,1.25],[-1.08,1.2,1.25],[-0.96,1.82,0.95],[0.96,1.82,0.95],[0.96,1.82,1.02],[-0.96,1.82,1.02]],W);
  g.box(-0.9,0.9,0.9,0.95,-2.6,0.95,fl);for(const s of [-1,1])g.box(s*0.55-0.25,s*0.55+0.25,0.95,1.35,-2.4,0.6,hex('#4a3f30'));
  g.hexa([[-0.78,0.55,1.25],[0.78,0.55,1.25],[0.6,0.6,2.75],[-0.6,0.6,2.75],[-0.98,1.45,1.25],[0.98,1.45,1.25],[0.62,1.05,2.75],[-0.62,1.05,2.75]],W);
  g.box(-0.5,0.5,0.62,1.0,2.75,2.79,dk);for(const s of [-1,1]){g.box(s*0.6,s*0.98,1.45,1.5,1.25,1.95,W);g.box(s*0.55,s*0.62,1.05,1.5,1.25,2.6,W);
   const k=g.mark();g.hexa([[-0.18,0,-0.55],[0.18,0,-0.55],[0.18,0,0.55],[-0.18,0,0.55],[-0.18,0.08,-0.45],[0.18,0.08,-0.45],[0.18,0.08,0.45],[-0.18,0.08,0.45]],W);g.translate(k,s*0.88,0.8,2.15);}
  g.box(-0.35,0.35,1.82,2.22,0.62,0.66,W);g.box(-0.6,-0.2,1.5,1.62,1.02,1.08,dk);g.box(0.2,0.6,1.5,1.62,1.02,1.08,dk);aCamo(g,m,cm,11);},
 // rueda de rodaje (eje x), piñón con dientes, eslabón de oruga, neumático
 v_wheel(g,cm){const r=hex('#26241f'),mt=hex((ACT_CAMO[cm]||ACT_CAMO.yellow)[0]),m=g.mark();g.cyl(1,1,-0.5,0.5,12,r,mt);g.cyl(0.55,0.55,-0.55,0.55,8,mt);g.cyl(0.18,0.18,-0.62,0.62,6,hex('#3a3a36'));g.xform(m,rotZ(Math.PI/2));},
 v_spr(g,cm){const mt=hex((ACT_CAMO[cm]||ACT_CAMO.yellow)[0]),dk=hex('#2d2c29'),m=g.mark();g.cyl(0.82,0.82,-0.5,0.5,12,mt,dk);for(let i=0;i<12;i++){const a=i/12*Math.PI*2,k=g.mark();g.box(-0.12,0.12,0.75,1.0,-0.3,0.3,dk);g.xform(k,(v,isN)=>{const c=Math.cos(a),s=Math.sin(a);return [c*v[0]-s*v[1],s*v[0]+c*v[1],v[2]];});}
  g.cyl(0.25,0.25,-0.6,0.6,6,dk);g.xform(m,rotZ(Math.PI/2));},
 v_link(g){const c=hex('#34322e');g.box(-0.5,0.5,-0.03,0.03,-0.07,0.07,c);g.box(-0.42,0.42,0.03,0.06,-0.03,0.03,hex('#454340'));g.box(-0.5,0.5,-0.05,-0.03,-0.02,0.02,c);},
 v_tyre(g,cm){const m=g.mark();g.cyl(1,1,-0.5,0.5,14,hex('#1f1e1c'),hex('#5d5a50'));g.cyl(0.55,0.55,-0.55,0.55,8,hex((ACT_CAMO[cm]||ACT_CAMO.yellow)[0]));g.xform(m,rotZ(Math.PI/2));}
};
// recorrido de la oruga en (z,y): abajo, piñón delante, arriba, rueda tensora detrás -> [[z,y,tz,ty],...] con longitud acumulada
function aTrack(V){const pts=[],add=(z,y)=>pts.push([z,y]),ws=V.wheels,z0=ws[0],z1=ws[ws.length-1],yb=0.06,S=V.spr,I=V.idl,ty=Math.max(S[1]+S[2],I[1]+I[2])+0.03;
 add(z0,yb);add(z1,yb);for(let i=0;i<=6;i++){const a=-Math.PI/2+i/6*Math.PI;add(S[0]+Math.cos(a)*(S[2]+0.03),S[1]+Math.sin(a)*(S[2]+0.03));}
 add(I[0],ty);for(let i=0;i<=6;i++){const a=Math.PI/2+i/6*Math.PI;add(I[0]+Math.cos(a)*(I[2]+0.03),I[1]+Math.sin(a)*(I[2]+0.03));}add(z0,yb);
 const out=[];let L=0;for(let i=0;i<pts.length-1;i++){const [za,ya]=pts[i],[zb,yb2]=pts[i+1],l=Math.hypot(zb-za,yb2-ya);if(l<1e-4)continue;out.push([za,ya,(zb-za)/l,(yb2-ya)/l,L,l]);L+=l;}out.L=L;return out;}
Actors._buildVeh=function(a,d2){const V=a.V,M=this._M,N=this._N,G=this._G,cm=a.camo,dead=!a.alive,k=dead?0.24:1-a.anim.hit*0.1;
 M4.compose(a.pos,a.yaw,a.tilt[0],a.tilt[1],1,M);const pre=a.vt==='pz4'?'v_pz4':a.vt==='tiger'?'v_tg':'v_ht';
 this._put(pre+'h:'+cm,M,k,k,k);
 if(V.tur){const pop=dead&&a.pop;AM.bone(N,M,V.tur[0],V.tur[1]+(pop?pop.y:0),V.tur[2],a.tur+(pop?pop.yaw:0),0,pop?pop.r:0);this._put(pre+'t:'+cm,N,k,k,k);
  AM.bone(G,N,0,V.gun[0],V.gun[1],0,dead?-0.12:a.gp,0);this._put(pre+'g',G,k,k,k);
  if(!dead&&a.hatch&&V.crew)this._crew(N,V.crew,a.aim[0]);}
 else if(!dead){AM.bone(N,M,0,V.mg[1],V.mg[2],angNorm(a.aim[0]-a.yaw),clamp(a.aim[1],-0.3,0.3),0);M4.translate(N,0,0,0.3);this._put('w_mgnest',N,1,1,1);this._crew(M,V.crew,a.aim[0]);}
 if(d2>14400)return;
 // ruedas y orugas
 const big=V.big?1:0,wr=V.wr,tl=a._trk||(a._trk=aTrack(V)),wc=dead?0.3:1;
 for(const s of [1,-1]){const tr=s>0?a.trL:a.trR,x=s*V.wx;
  for(let i=0;i<V.wheels.length;i++){const z=V.wheels[i],xo=big?(i%2?0.13:-0.13)*s:0;AM.bone(G,M,x+xo,V.wy,z,0,tr/wr,0);for(let j=0;j<3;j++){G[j]*=V.tw*0.5;G[4+j]*=wr;G[8+j]*=wr;}this._put('v_wheel:'+cm,G,wc*0.85,wc*0.85,wc*0.8);}
  if(V.ht){AM.bone(G,M,s*0.88,0.45,2.0,0,a.trR/0.45,0);for(let j=0;j<3;j++){G[j]*=0.25;G[4+j]*=0.45;G[8+j]*=0.45;}this._put('v_tyre:'+cm,G,wc,wc,wc);}
  for(const [z,y,r] of [V.spr,V.idl]){AM.bone(G,M,x,y,z,0,tr/r,0);for(let j=0;j<3;j++){G[j]*=V.tw*0.5;G[4+j]*=r;G[8+j]*=r;}this._put('v_spr:'+cm,G,wc*0.9,wc*0.9,wc*0.85);}
  if(d2>3600)continue;const n=Math.round(tl.L/0.19),sp=tl.L/n;let si=0;
  for(let i=0;i<n;i++){let t=((i*sp-tr)%tl.L+tl.L)%tl.L;while(si>0&&tl[si][4]>t)si--;while(si<tl.length-1&&tl[si][4]+tl[si][5]<t)si++;const q=tl[si],u=t-q[4],z=q[0]+q[2]*u,y=q[1]+q[3]*u;
   AM.bone(G,M,x,y,z,0,Math.atan2(q[3],q[2]),0);for(let j=0;j<3;j++)G[j]*=V.tw;this._put('v_link',G,wc,wc,wc);}}};
// tripulante asomado (torso, cabeza y gorra/casco del aspecto 'de') en el espacio m
Actors._crew=function(m,c,aim){const G=this._G,H=this._N2||(this._N2=new Float32Array(16));AM.bone(G,m,c[0],c[1]-0.15,c[2],0,0,0);
 const wy=Math.atan2(G[8],G[10]);AM.bone(G,G,0,0,0,angNorm(aim-wy)*0.5,0,0);this._put('torso:de',G,1,1,1);AM.bone(H,G,0,0.52,0.005,angNorm(aim-wy)*0.4,0,0);
 this._put('head0:de',H,0.85,0.68,0.55);this._put('helm:de',H,1,1,1);};
