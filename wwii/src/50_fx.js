// ===== FRENTE 44 · efectos: partículas, marcas, trazadoras, restos con física, fuegos, humo, clima, luces puntuales y temblor de cámara =====
// Partículas en un Float32Array (sin crear objetos en el bucle): FXS floats por partícula. Edad negativa = retraso (aún no se ve).
// Los efectos se piden por superficie ('dirt','grass','sand','snow','wood','metal','stone','water','flesh') y se recortan por calidad
// (GFX.G.parts) y por distancia a la cámara. Restos 3D (casquillos, peine del Garand, piedras, astillas) con rebotes en FX.drawOpaque;
// trazadoras y lluvia como estelas 3D; nieve y ceniza alrededor de la cámara (se animan al dibujar: también en el título y en pausa).
const FXS=20,FX_MAX=1600;
// partícula: 0-2 pos · 3-5 vel · 6 edad · 7 vida · 8 tam0 · 9 tam1 · 10 alfa · 11 giro · 12 vgiro · 13 celda · 14-16 color · 17 gravedad · 18 freno · 19 banderas
// banderas: 1 aditiva · 2 choca con el suelo · 4 fuego (se enrojece al envejecer) · 8 aparece despacio (humo)
const FXF_ADD=1,FXF_GND=2,FXF_FIRE=4,FXF_SLOW=8;
// polvo (d) y trozos (c) por superficie
const FX_SURF={dirt:{d:[0.5,0.43,0.34],c:[0.32,0.25,0.18]},grass:{d:[0.5,0.46,0.36],c:[0.28,0.34,0.15]},sand:{d:[0.82,0.74,0.57],c:[0.68,0.6,0.43]},
 snow:{d:[0.95,0.96,0.99],c:[0.88,0.9,0.95]},wood:{d:[0.66,0.56,0.42],c:[0.66,0.5,0.32]},metal:{d:[0.55,0.55,0.55],c:[0.33,0.33,0.34]},
 stone:{d:[0.74,0.72,0.68],c:[0.56,0.54,0.5]},water:{d:[0.85,0.9,0.94],c:[0.8,0.86,0.9]},flesh:{d:[0.42,0.05,0.04],c:[0.32,0.03,0.02]}};
// restos 3D: geometría (se crea al dibujar), rebote, vida
const FX_DEB={shell:{e:0.35,life:9},shellP:{e:0.35,life:9},clip:{e:0.3,life:12},spoon:{e:0.3,life:10},chunk:{e:0.25,life:5},splinter:{e:0.3,life:6},plate:{e:0.3,life:6},brick:{e:0.2,life:7}};
const FX={P:new Float32Array(FX_MAX*FXS),n:0,L:[],T:[],D:[],E:[],I:[],trauma:0,_sh:[0,0,0],dec:null,big:null,env:null,t:0,
 _lo:[],_lp:[],_tp:[],_dp:[],_da:new Float32Array(FX_MAX*10),_db:new Float32Array(FX_MAX*10),_idx:new Int32Array(FX_MAX),_key:new Float32Array(FX_MAX),
 _v:[0,0,0],_w:[0,0,0],_q:[0,0,0],_M:new Float32Array(16),_dm:null,_dd:{},_trM:null,_trD:new Float32Array(160*19),
 W:{snow:0,rain:0,ash:0,n:0,a:null,last:-1,rd:null,rm:null,sp:0},
 init(){Bus.on('incoming',d=>this.incoming(d.pos,d.t));Bus.on('glRestored',()=>{this.dec=this.big=null;this._dm=null;this._dd={};this._trM=null;this.W.rm=null;});},
 clear(){this.n=0;for(const l of this.L)this._lp.push(l);this.L.length=0;for(const q of this.T)this._tp.push(q);this.T.length=0;for(const d of this.D)this._dp.push(d);this.D.length=0;
  this.E.length=0;this.I.length=0;this.trauma=0;if(this.dec)this.dec.clear();if(this.big)this.big.clear();Post.fx.blast=0;Env.flash=0;},
 // cuántas partículas caben según la calidad; k = fracción mínima libre que se exige (los efectos de fondo no se comen el sitio)
 _room(k){return this.n<Math.min(FX_MAX,GFX.G.parts||600)*(1-(k||0));},
 // nivel de detalle por distancia a la cámara: 1 cerca, ~0.3 lejos, 0 fuera de alcance
 _lod(p,far){const d=Math.sqrt(V3.dist2(p,Cam.eye));far=far||160;return d>far?0:d<25?1:1-0.7*(d-25)/(far-25);},
 _p(x,y,z,vx,vy,vz,life,s0,s1,a,cell,r,g,b,grav,drag,fl,delay){if(this.n>=Math.min(FX_MAX,GFX.G.parts||600))return;const P=this.P,o=this.n++*FXS;
  P[o]=x;P[o+1]=y;P[o+2]=z;P[o+3]=vx;P[o+4]=vy;P[o+5]=vz;P[o+6]=-(delay||0);P[o+7]=life;P[o+8]=s0;P[o+9]=s1;P[o+10]=a;P[o+11]=Math.random()*6.283;P[o+12]=(Math.random()-0.5)*2;
  P[o+13]=cell;P[o+14]=r;P[o+15]=g;P[o+16]=b;P[o+17]=grav;P[o+18]=drag;P[o+19]=fl||0;},
 // compatibilidad con la fase 1
 _add(x,y,z,vx,vy,vz,life,s0,s1,a,cell,r,g,b,grav,drag,add){this._p(x,y,z,vx,vy,vz,life,s0,s1,a,cell,r,g,b,grav,drag,add?FXF_ADD:0);},
 // ---------- luces puntuales (pos, radio, color, vida, parpadeo) ----------
 light(pos,r,col,life,fl){const l=this._lp.pop()||{pos:[0,0,0],r:0,col:[0,0,0],base:[0,0,0],t:0,life:0,fl:0,s:0};V3.copy(pos,l.pos);l.r=r;const c=hex(col);
  l.base[0]=c[0];l.base[1]=c[1];l.base[2]=c[2];l.t=0;l.life=life||0.1;l.fl=fl||0;this.L.push(l);return l;},
 _decals(){if(!this.dec&&GL.gl){const q=GFX.name();this.dec=new DecalBuf(q==='baja'?140:q==='media'?220:q==='alta'?320:420,1);}return this.dec;},
 _bigDec(){if(!this.big&&GL.gl)this.big=new DecalBuf(40,4);return this.big;},
 // ---------- fogonazo: pos de la boca, dir, size (1 = fusil); player=true: el arma en primera persona dibuja el suyo (aquí sólo luz y humo) ----------
 muzzle(pos,dir,size,player){size=size||1;const R=Math.random,lod=player?1:this._lod(pos,220);if(!lod&&!player)return;
  if(!player){const d=Math.sqrt(V3.dist2(pos,Cam.eye)),vis=Math.max(1,d/30); // de lejos se ve algo más grande: así se localiza al tirador
   for(let i=0;i<3;i++){const k=(0.06+i*0.12)*size;this._p(pos[0]+dir[0]*k,pos[1]+dir[1]*k,pos[2]+dir[2]*k,dir[0]*3,dir[1]*3,dir[2]*3,0.045,0.13*size*vis*(1.15-i*0.25),0.2*size*vis,1,1,1,0.82,0.5,0,0,FXF_ADD);}
   this._p(pos[0],pos[1],pos[2],0,0,0,0.035,0.28*size*vis,0.34*size*vis,0.6,2,1,0.75,0.4,0,0,FXF_ADD);}
  if(R()<0.8*lod)this._p(pos[0]+dir[0]*0.1,pos[1]+dir[1]*0.1,pos[2]+dir[2]*0.1,dir[0]*1.2+(R()-0.5)*0.3,dir[1]*1.2+0.35,dir[2]*1.2+(R()-0.5)*0.3,0.9+R()*0.8,0.06*size,0.45*size,player?0.1:0.16,0,0.78,0.77,0.75,-0.25,2.2,FXF_SLOW);
  if(size>=2.5){for(let i=0;i<8;i++){const a=R()*6.28,s=1+R()*2;this._p(pos[0],pos[1],pos[2],dir[0]*4+Math.cos(a)*s,dir[1]*4+R()*1.5,dir[2]*4+Math.sin(a)*s,1.5+R()*1.5,0.4,2.2,0.35,0,0.62,0.6,0.57,-0.2,1.2,FXF_SLOW);}}
  this.light(pos,(player?5:6)*Math.min(size,2.5),size>=2.5?[3,2,0.9]:[2.6,1.75,0.75],size>=2.5?0.12:0.06);},
 // ---------- trazadora de a a b (estela luminosa que avanza) ----------
 tracer(a,b,speed){const l=Math.sqrt(V3.dist2(a,b));if(l<4||this.T.length>=150)return;const q=this._tp.pop()||{a:[0,0,0],d:[0,0,0],l:0,t:0,v:0};
  V3.copy(a,q.a);q.d[0]=(b[0]-a[0])/l;q.d[1]=(b[1]-a[1])/l;q.d[2]=(b[2]-a[2])/l;q.l=l;q.t=0;q.v=speed||430;this.T.push(q);},
 // ---------- impacto de bala según la superficie (polvo, trozos, astillas, chispas, nieve, agua, carne) + agujero o mancha; n = cantidad ----------
 impact(pos,nrm,surf,n){n=n||1;const lod=this._lod(pos,140);if(!lod)return;const R=Math.random,nn=nrm||V3.set(this._w,0,1,0),S=FX_SURF[surf]||FX_SURF.dirt,dc=S.d,cc=S.c,k=n*lod,x=pos[0],y=pos[1],z=pos[2];
  const nx=nn[0],ny=nn[1],nz=nn[2],cnt=v=>Math.max(1,Math.round(v*k));
  if(surf==='flesh'){this.blood(pos,V3.set(this._v,-nx,-ny,-nz),n);return;}
  if(surf==='water'){ // columna de agua y espuma
   for(let i=0;i<cnt(8);i++){const s=0.4+R()*0.7;this._p(x+(R()-0.5)*0.1,y,z+(R()-0.5)*0.1,(R()-0.5)*1.2*s,2.5+R()*3.5,(R()-0.5)*1.2*s,0.6+R()*0.4,0.05,0.09,0.75,2,0.8,0.85,0.88,9.8,0.4,FXF_GND);}
   for(let i=0;i<cnt(3);i++){const a=R()*6.28;this._p(x,y+0.05,z,Math.cos(a)*0.8,0.3,Math.sin(a)*0.8,0.9+R()*0.5,0.12,0.6,0.35,0,dc[0],dc[1],dc[2],0,2,FXF_SLOW);}return;}
  if(surf==='metal'){ // chispas y un destello
   for(let i=0;i<cnt(8);i++){const s=3+R()*6;this._p(x,y,z,nx*s+(R()-0.5)*4,ny*s+(R()-0.2)*4,nz*s+(R()-0.5)*4,0.15+R()*0.35,0.022,0.012,1,2,1,0.75+R()*0.2,0.35,9.8,0.5,FXF_ADD|FXF_GND);}
   this._p(x+nx*0.03,y+ny*0.03,z+nz*0.03,0,0,0,0.05,0.12,0.18,1,2,1,0.85,0.5,0,0,FXF_ADD);
   this._p(x,y,z,nx*0.5,ny*0.5+0.3,nz*0.5,0.7,0.05,0.3,0.25,0,dc[0],dc[1],dc[2],-0.1,2,FXF_SLOW);
   if(k>0.6&&R()<0.5)this.light(pos,2.2,[2,1.4,0.6],0.05);}
  else{ // polvo que sale disparado según la normal y trozos que caen
   const big=surf==='sand'||surf==='snow'?1.5:surf==='dirt'||surf==='grass'?1.2:1,ground=ny>0.6;
   for(let i=0;i<cnt(2.5*big);i++){const s=1.2+R()*2.4;this._p(x+nx*0.04,y+ny*0.04,z+nz*0.04,nx*s+(R()-0.5)*0.8,ny*s+(ground?1.2+R()*1.8:R()*0.6),nz*s+(R()-0.5)*0.8,0.5+R()*0.7,0.05*big,(0.35+R()*0.3)*big,0.55,0,dc[0],dc[1],dc[2],ground?2.5:0.6,3,0);}
   this._p(x+nx*0.05,y+ny*0.05,z+nz*0.05,nx*0.4,ny*0.4+0.15,nz*0.4,1.2+R()*0.8,0.08*big,0.6*big,0.3,0,dc[0],dc[1],dc[2],-0.05,1.6,FXF_SLOW);
   const nc=surf==='wood'?6:surf==='stone'?5:4;
   for(let i=0;i<cnt(nc);i++){const s=1.8+R()*3.5;this._p(x,y,z,nx*s+(R()-0.5)*2.5,ny*s+R()*2.5+(ground?1.5:0.5),nz*s+(R()-0.5)*2.5,0.6+R()*0.6,surf==='wood'?0.03:0.022,surf==='wood'?0.025:0.018,1,3,cc[0]*(0.85+R()*0.3),cc[1]*(0.85+R()*0.3),cc[2]*(0.85+R()*0.3),9.8,0.3,FXF_GND);}
   if(surf==='grass')for(let i=0;i<cnt(2);i++)this._p(x,y,z,(R()-0.5)*1.5,1.5+R()*2,(R()-0.5)*1.5,0.8,0.03,0.025,1,3,0.32,0.42,0.16,6,1,FXF_GND);
   if(surf==='stone'&&R()<0.5)this._p(x,y,z,nx*5,ny*5+1,nz*5,0.12,0.02,0.01,1,2,1,0.8,0.5,9.8,0,FXF_ADD);
   if(surf==='wood'&&k>0.5&&R()<0.35)this.debris('splinter',pos,V3.set(this._v,nx*2+(R()-0.5)*2,ny*2+1.5,nz*2+(R()-0.5)*2),null,0.5+R()*0.4);}
  // marca: agujero en paredes, salpicadura o hoyo en el suelo
  const D=this._decals();if(!D)return;const ground=ny>0.7&&(surf==='dirt'||surf==='grass'||surf==='sand'||surf==='snow');
  D.addQuad(pos,nn,ground?0.13+R()*0.06:surf==='wood'?0.07:0.055,R()*6.28,surf==='snow'?7:ground?6:surf==='wood'?2:1,surf==='sand'&&ground?[1.6,1.45,1.2]:null,ground?0.75:surf==='metal'?0.8:1);},
 // ---------- sangre (moderada; se quita en opciones): neblina roja y gotas; dir = hacia donde va la bala ----------
 blood(pos,dir,n){const lod=this._lod(pos,90);if(!lod)return;const R=Math.random,x=pos[0],y=pos[1],z=pos[2];
  if(typeof Settings!=='undefined'&&Settings.blood===false){for(let i=0;i<2;i++)this._p(x,y,z,dir[0]*0.8+(R()-0.5),dir[1]*0.8+0.4,dir[2]*0.8+(R()-0.5),0.7,0.06,0.35,0.35,0,0.5,0.47,0.42,0,2.5,FXF_SLOW);return;}
  const k=(n||1)*lod;
  for(let i=0;i<Math.round(3*k)+1;i++){const s=0.6+R()*1.2;this._p(x,y,z,dir[0]*s+(R()-0.5)*0.6,dir[1]*s+R()*0.5,dir[2]*s+(R()-0.5)*0.6,0.35+R()*0.3,0.05,0.32,0.55,0,0.4,0.03,0.025,0.5,3.5,0);}
  for(let i=0;i<Math.round(4*k);i++){const s=1.5+R()*2.5;this._p(x,y,z,dir[0]*s+(R()-0.5)*1.5,dir[1]*s+R()*1.5,dir[2]*s+(R()-0.5)*1.5,0.6,0.018,0.014,0.9,3,0.3,0.02,0.015,9.8,0.3,FXF_GND);}
  // salpicadura en la pared de detrás o en el suelo (de vez en cuando)
  if(R()<0.3*k){const B=this._bigDec();if(B){const h=World.raycast(pos,dir,2.2,null);if(h&&!h.actor){if(h.normal[1]>0.7)B.addGround(h.pos[0],h.pos[2],0.25+R()*0.2,R()*6,4,null,0.8,(a,b)=>World.height(a,b));else B.addQuad(h.pos,h.normal,0.3,R()*6,4,null,0.75);}
   else if(R()<0.5){const g=World.groundAt(x,z,0.1,y);if(y-g<2)B.addGround(x+dir[0]*0.6,z+dir[2]*0.6,0.22+R()*0.2,R()*6,4,null,0.7,(a,b)=>World.height(a,b));}}}},
 // ---------- explosión de radio r: bola de fuego, onda de polvo, columna de tierra, restos, humo que queda, marca, luz, temblor y aturdimiento ----------
 // opts: {surf, big (cohete/carga), water}
 explosion(pos,r,opts){r=r||6;opts=opts||W_NO;const R=Math.random,k=r/6,x=pos[0],y=pos[1],z=pos[2],lod=Math.max(0.35,this._lod(pos,400));
  const hy=World.height(x,z),wat=opts.water||(World.water&&y<World.water.y+0.6&&hy<World.water.y),surf=wat?'water':opts.surf||(y-hy<0.8?World.surfaceAt(x,z):'stone');
  const S=FX_SURF[surf]||FX_SURF.dirt,dc=surf==='grass'?FX_SURF.dirt.d:S.d,cc=surf==='grass'?FX_SURF.dirt.c:S.c,c=v=>Math.round(v*lod);
  // destello y bola de fuego
  this._p(x,y+0.4*k,z,0,0,0,0.12,1.4*k,2.2*k,1,2,1,0.92,0.75,0,0,FXF_ADD);
  for(let i=0;i<c(12);i++){const a=R()*6.28,e=R()*1.2,s=(2+R()*5)*k;this._p(x+(R()-0.5)*0.5*k,y+0.3+R()*0.6*k,z+(R()-0.5)*0.5*k,Math.cos(a)*Math.cos(e)*s,Math.sin(e)*s*0.8+1.5,Math.sin(a)*Math.cos(e)*s,0.3+R()*0.35,0.7*k,(1.8+R()*1.2)*k,1,1,1,0.85,0.55,-1.5,4,FXF_ADD|FXF_FIRE);}
  // chispas y metralla incandescente
  for(let i=0;i<c(18);i++){const a=R()*6.28,e=R()*1.3,s=(9+R()*16)*Math.sqrt(k);this._p(x,y+0.3,z,Math.cos(a)*Math.cos(e)*s,Math.sin(e)*s,Math.sin(a)*Math.cos(e)*s,0.35+R()*0.9,0.04,0.025,1,2,1,0.7,0.3,9.8,0.8,FXF_ADD|FXF_GND);}
  // onda de polvo a ras de suelo
  for(let i=0;i<c(16);i++){const a=i/16*6.283+R()*0.3,s=(10+R()*6)*Math.sqrt(k);this._p(x+Math.cos(a)*0.8,hy+0.3,z+Math.sin(a)*0.8,Math.cos(a)*s,0.4+R()*0.6,Math.sin(a)*s,1.1+R()*0.8,0.5*k,2.4*k,wat?0.45:0.32,0,dc[0],dc[1],dc[2],0,3.2,FXF_SLOW);}
  if(wat){ // columna de agua
   for(let i=0;i<c(26);i++){const a=R()*6.28,s=R()*2.2*k;this._p(x+(R()-0.5)*k,y+0.2,z+(R()-0.5)*k,Math.cos(a)*s,(7+R()*9)*Math.sqrt(k),Math.sin(a)*s,1.4+R()*0.9,0.3*k,1.2*k,0.8,0,0.88,0.92,0.95,9.8,0.5,FXF_GND);}
   for(let i=0;i<c(20);i++){const a=R()*6.28,s=1+R()*4;this._p(x,y+0.3,z,Math.cos(a)*s,6+R()*8,Math.sin(a)*s,1.3+R(),0.06,0.08,0.8,2,0.82,0.86,0.9,9.8,0.2,FXF_GND);}}
  else{ // columna de tierra y trozos
   for(let i=0;i<c(14);i++){const a=R()*6.28,s=R()*2.5*k;this._p(x+(R()-0.5)*0.8*k,y+0.3,z+(R()-0.5)*0.8*k,Math.cos(a)*s,(5+R()*9)*Math.sqrt(k),Math.sin(a)*s,1.4+R()*1.2,0.5*k,(2+R()*1.5)*k,0.75,0,dc[0]*0.8,dc[1]*0.8,dc[2]*0.8,4.5,1.1,FXF_SLOW);}
   for(let i=0;i<c(22);i++){const a=R()*6.28,s=(2+R()*7)*Math.sqrt(k);this._p(x,y+0.3,z,Math.cos(a)*s*0.7,(5+R()*11)*Math.sqrt(k),Math.sin(a)*s*0.7,1.3+R()*1.1,0.06+R()*0.08,0.05,1,3,cc[0]*(0.7+R()*0.5),cc[1]*(0.7+R()*0.5),cc[2]*(0.7+R()*0.5),9.8,0.15,FXF_GND);}
   const kind=surf==='wood'?'splinter':surf==='metal'?'plate':'chunk';
   for(let i=0;i<c(opts.big?9:6);i++){const a=R()*6.28,s=(3+R()*6)*Math.sqrt(k);this.debris(kind,V3.set(this._q,x,y+0.4,z),V3.set(this._v,Math.cos(a)*s*0.6,(5+R()*8)*Math.sqrt(k),Math.sin(a)*s*0.6),kind==='chunk'?mixC(cc,dc,R()*0.5):null,(0.6+R()*0.9)*Math.min(1.5,k));}}
  // humo que se queda (aparece tras la bola de fuego)
  const sg=surf==='snow'?0.55:0.3;
  for(let i=0;i<c(12);i++){const a=R()*6.28,s=R()*1.6*k;this._p(x+Math.cos(a)*s*0.6,y+0.6+R()*1.5*k,z+Math.sin(a)*s*0.6,Math.cos(a)*s*0.4+(Env.wind||1)*0.3,0.6+R()*1.2,Math.sin(a)*s*0.4,4+R()*5,1*k,(3.2+R()*2)*k,0.62,0,sg+R()*0.12,sg+R()*0.11,sg+R()*0.1,-0.12,0.5,FXF_SLOW,0.1+R()*0.35);}
  // marcas, luz, cielo, temblor y aturdimiento
  if(!wat&&y-hy<1.5){const B=this._bigDec();if(B){B.addGround(x,z,r*0.48,R()*6,3,null,0.92,(a,b)=>World.height(a,b));if(surf!=='stone'&&surf!=='metal'&&surf!=='wood')B.addGround(x,z,r*0.3,R()*6,surf==='snow'?7:5,null,0.85,(a,b)=>World.height(a,b));}}
  this.light(V3.set(this._q,x,y+1.2*k,z),12*k+4,[4.2,2.7,1.2],0.45,0.4);
  const d=Math.sqrt(V3.dist2(Cam.eye,pos)),e=Player.alive?Player.eye(this._w):Cam.eye,dp=Math.sqrt(V3.dist2(e,pos));
  this.shake(clamp(1.25-dp/(r*4.5),0,1)*(opts.big?1.2:1));if(dp<r*2.4)Post.fx.blast=Math.max(Post.fx.blast,clamp(1.25-dp/(r*2),0,1));
  Env.flash=Math.max(Env.flash,clamp(0.55-d/90,0,0.45));
  if(dp<r*3&&Player.punch)Player.punch(clamp(1-dp/(r*3),0,1)*0.06,(R()-0.5)*0.05,(R()-0.5)*0.08);},
 // ---------- humo: {puff:true, size, life, col} una bocanada; si no, columna persistente {rate, size, life, col, dur, dense} -> asa para FX.stop ----------
 smoke(pos,opts){opts=opts||W_NO;const R=Math.random;
  if(opts.puff){const s=opts.size||0.5,c=opts.col?hex(opts.col):null;this._p(pos[0],pos[1],pos[2],(R()-0.5)*0.4+(opts.vel?opts.vel[0]:0),0.25+(opts.vel?opts.vel[1]:0),(R()-0.5)*0.4+(opts.vel?opts.vel[2]:0),
   (opts.life||1.5)*(0.8+R()*0.4),s*0.6,s*2.6,opts.a||0.4,0,c?c[0]:0.74,c?c[1]:0.73,c?c[2]:0.71,-0.1,opts.drag||1,FXF_SLOW);return null;}
  const e={kind:'smoke',pos:pos.slice(),rate:opts.rate||5,size:opts.size||1.6,life:opts.life||7,col:hex(opts.col||(opts.dense?[0.82,0.82,0.8]:[0.28,0.27,0.26])).slice(),dur:opts.dur||1e9,dense:!!opts.dense,acc:0,t:0,lt:null};
  this.E.push(e);return e;},
 // fuego persistente con luz que parpadea (size 1 = hoguera; 2-3 = casa o carro ardiendo) -> asa para FX.stop
 fire(pos,size){size=size||1;const e={kind:'fire',pos:pos.slice(),rate:9*Math.sqrt(size),size,life:0.8,dur:1e9,acc:0,t:0,ph:Math.random()*9,
  lt:{pos:[pos[0],pos[1]+0.9*size,pos[2]],r:6+5*size,col:[0,0,0],base:[2.3,1.25,0.45],fl:1,s:0}};this.E.push(e);return e;},
 stop(e){const i=this.E.indexOf(e);if(i>=0)this.E.splice(i,1);},
 // ---------- restos con física: casquillos, peines, astillas, piedras (kind de FX_DEB); col opcional; s = escala ----------
 debris(kind,pos,vel,col,s){if(!FX_DEB[kind])return null;const max=GFX.name()==='baja'?50:GFX.name()==='media'?90:150;if(this.D.length>=max){const o=this.D.shift();this._dp.push(o);}
  const d=this._dp.pop()||{k:'',p:[0,0,0],v:[0,0,0],r:[0,0,0],w:[0,0,0],c:[1,1,1],s:1,t:0,life:0,rest:false,b:0};const R=Math.random;
  d.k=kind;V3.copy(pos,d.p);V3.copy(vel,d.v);d.r[0]=R()*6.28;d.r[1]=R()*6.28;d.r[2]=R()*6.28;d.w[0]=(R()-0.5)*30;d.w[1]=(R()-0.5)*30;d.w[2]=(R()-0.5)*30;
  if(col){const c=hex(col);d.c[0]=c[0];d.c[1]=c[1];d.c[2]=c[2];}else d.c[0]=d.c[1]=d.c[2]=1;d.s=s||1;d.t=0;d.life=FX_DEB[kind].life;d.rest=false;d.b=0;this.D.push(d);return d;},
 // casquillo (kind 'shell' fusil, 'shellP' pistola)
 shell(pos,vel,kind){if(this._lod(pos,30)<0.3)return;this.debris(kind||'shell',pos,vel,null,1);},
 // ---------- temblor de cámara (trauma 0..1, se suma) ----------
 shake(a){this.trauma=Math.min(1,this.trauma+a);},
 // desfase [rumbo, cabeceo, alabeo] (ruido suave, crece con el cuadrado del trauma)
 shakeOff(){const k=this.trauma*this.trauma,t=this.t,o=this._sh;
  o[0]=k*0.04*(Math.sin(t*37.1)*0.6+Math.sin(t*23.7+1.3)*0.4);o[1]=k*0.035*(Math.sin(t*41.7+2)*0.6+Math.sin(t*19.3)*0.4);o[2]=k*0.05*Math.sin(t*29.3+4);return o;},
 // clima: env.snow / env.rain / env.ash (0..1); se lee del entorno de la misión
 weather(env){const W=this.W;W.snow=env&&env.snow||0;W.rain=env&&env.rain||0;W.ash=env&&env.ash||0;W.a=null;W.last=-1;},
 // proyectil de artillería que llega a pos en t s (silbido): estela que cae del cielo
 incoming(pos,t){if(!pos)return;const R=Math.random,a=R()*6.28;this.I.push({to:pos.slice(),t:t||1.1,T:t||1.1,from:[pos[0]+Math.sin(a)*40,pos[1]+160,pos[2]+Math.cos(a)*40],p:[0,0,0],acc:0});},
 // ---------- simulación (paso fijo) ----------
 update(dt){this.t+=dt;this.trauma=Math.max(0,this.trauma-dt*(0.9+this.trauma));Post.fx.blast=Math.max(0,Post.fx.blast-dt*0.8);Env.flash=Math.max(0,Env.flash-dt*2.2);
  const P=this.P;let n=this.n;
  for(let i=0;i<n;i++){const o=i*FXS;let age=P[o+6]+dt;P[o+6]=age;if(age<0)continue;
   if(age>=P[o+7]){n--;if(i<n){P.copyWithin(o,n*FXS,n*FXS+FXS);i--;}continue;}
   const dr=Math.max(0,1-P[o+18]*dt);P[o+3]*=dr;P[o+5]*=dr;P[o+4]=P[o+4]*dr-P[o+17]*dt;P[o]+=P[o+3]*dt;P[o+1]+=P[o+4]*dt;P[o+2]+=P[o+5]*dt;P[o+11]+=P[o+12]*dt;
   if(P[o+19]&FXF_GND&&P[o+4]<0){const g=World.height(P[o],P[o+2]);if(P[o+1]<g){P[o+1]=g+0.01;P[o+3]*=0.35;P[o+5]*=0.35;P[o+4]*=-0.25;if(P[o+4]<0.3){P[o+4]=0;P[o+17]=0;P[o+18]=8;}}}}
  this.n=n;
  this._updDebris(dt);
  for(let i=this.L.length-1;i>=0;i--){const l=this.L[i];l.t+=dt;if(l.t>=l.life){this._lp.push(l);this.L.splice(i,1);}}
  for(let i=this.T.length-1;i>=0;i--){const q=this.T[i];q.t+=dt;if(q.t*q.v>q.l+6){this._tp.push(q);this.T.splice(i,1);}}
  // emisores: fuego y columnas de humo (menos lejos y si no queda sitio)
  const R=Math.random;
  for(let i=this.E.length-1;i>=0;i--){const e=this.E[i];e.t+=dt;if(e.t>e.dur){this.E.splice(i,1);continue;}const lod=this._lod(e.pos,e.kind==='fire'?260:600);if(!lod)continue;
   e.acc+=dt*e.rate*Math.max(0.35,lod);while(e.acc>=1){e.acc--;const s=e.size,x=e.pos[0],y=e.pos[1],z=e.pos[2];
    if(e.kind==='fire'){if(!this._room(0.08))break;
     this._p(x+(R()-0.5)*0.7*s,y+0.05+R()*0.2*s,z+(R()-0.5)*0.7*s,(R()-0.5)*0.4,1.3*Math.sqrt(s)+R()*s,(R()-0.5)*0.4,0.45+R()*0.45,0.42*s,0.12*s,0.9,1,1,0.78,0.45,-0.6,0.8,FXF_ADD|FXF_FIRE);
     if(R()<0.25)this._p(x+(R()-0.5)*0.5*s,y+0.4*s,z+(R()-0.5)*0.5*s,(R()-0.5)*1.2,2+R()*2.5,(R()-0.5)*1.2,1+R()*1.4,0.025,0.015,1,2,1,0.6,0.25,-0.4,0.6,FXF_ADD);
     if(R()<0.45&&this._room(0.25))this._p(x+(R()-0.5)*0.4*s,y+1.1*s,z+(R()-0.5)*0.4*s,(R()-0.5)*0.4+(Env.wind||1)*0.5,1.2+R()*0.6,(R()-0.5)*0.4,3.5+R()*2,0.5*s,2.6*s,0.42,0,0.16,0.15,0.14,-0.15,0.25,FXF_SLOW);}
    else{if(!this._room(e.dense?0.1:0.3))break;
     this._p(x+(R()-0.5)*s*0.8,y+R()*0.3,z+(R()-0.5)*s*0.8,(R()-0.5)*0.5+(Env.wind||1)*0.45,(e.dense?0.5:1)+R()*0.6,(R()-0.5)*0.5,e.life*(0.7+R()*0.6),s*0.7,s*(e.dense?3:4.2),e.dense?0.7:0.5,0,e.col[0]*(0.9+R()*0.2),e.col[1]*(0.9+R()*0.2),e.col[2]*(0.9+R()*0.2),-0.05,e.dense?0.35:0.15,FXF_SLOW);}}}
  // artillería que llega: estela de humo detrás del proyectil
  for(let i=this.I.length-1;i>=0;i--){const q=this.I[i];q.t-=dt;if(q.t<=0){this.I.splice(i,1);continue;}const u=1-q.t/q.T;if(u<0.55)continue;
   const w=(u-0.55)/0.45;V3.lerp(q.from,q.to,w*w,q.p);q.acc+=dt;if(q.acc>0.025){q.acc=0;this._p(q.p[0],q.p[1],q.p[2],0,0,0,0.9,0.25,0.9,0.25,0,0.55,0.55,0.55,0,0.5,FXF_SLOW);}}},
 // restos: gravedad, rebotes contra el suelo (o lo que haya debajo), giro; quietos dejan de calcularse
 _updDebris(dt){const D=this.D;
  for(let i=D.length-1;i>=0;i--){const d=D[i];d.t+=dt;if(d.t>d.life){this._dp.push(d);D.splice(i,1);continue;}if(d.rest)continue;
   d.v[1]-=11*dt;d.p[0]+=d.v[0]*dt;d.p[1]+=d.v[1]*dt;d.p[2]+=d.v[2]*dt;d.r[0]+=d.w[0]*dt;d.r[1]+=d.w[1]*dt;d.r[2]+=d.w[2]*dt;
   if(d.v[1]<0){const g=World.groundAt(d.p[0],d.p[2],0.02,d.p[1]+0.25)+0.012*d.s;if(d.p[1]<g){d.p[1]=g;const e=FX_DEB[d.k].e,vn=-d.v[1];d.v[1]=vn*e;d.v[0]*=0.55;d.v[2]*=0.55;d.w[0]*=0.5;d.w[1]*=0.6;d.w[2]*=0.5;
     if(d.b++<2&&vn>1.2&&(d.k==='shell'||d.k==='shellP'||d.k==='clip')&&Math.sqrt(V3.dist2(d.p,Cam.eye))<14)Bus.emit('casing',{pos:d.p.slice(),kind:d.k});
     if(vn<1.1){d.rest=true;if(d.k!=='chunk'){d.r[0]=0;d.r[2]=Math.round(d.r[2]/Math.PI)*Math.PI;}}}}}},
 // ---------- luces activas -> [{pos, r, col}] para GL.setLights: las más importantes (brillo·radio² / distancia²) ----------
 lights(){const o=this._lo,e=Cam.eye,max=GFX.G.lights||4,t=this.t;o.length=0;
  for(const l of this.L){const u=l.t/l.life,k=(1-u)*(1-u)*(l.fl?0.8+0.2*Math.sin(t*53+l.pos[0]):1);l.col[0]=l.base[0]*k;l.col[1]=l.base[1]*k;l.col[2]=l.base[2]*k;
   l.s=(l.col[0]+l.col[1]+l.col[2])*l.r*l.r/(V3.dist2(l.pos,e)+4);o.push(l);}
  for(const q of this.E)if(q.lt){const l=q.lt,f=0.72+0.18*Math.sin(t*9.3+q.ph)*Math.sin(t*5.1+q.ph*2)+0.1*Math.sin(t*23+q.ph);l.col[0]=l.base[0]*f;l.col[1]=l.base[1]*f;l.col[2]=l.base[2]*f;
   l.s=(l.col[0]+l.col[1]+l.col[2])*l.r*l.r/(V3.dist2(l.pos,e)+4);if(l.s>0.02)o.push(l);}
  if(o.length>max){o.sort(FX_BYS);o.length=max;}return o;},
 // ---------- dibujo ----------
 _debMesh(k){if(this._dd[k])return this._dd[k];const g=new Geo(),br=hex('#c9a04c'),dk=hex('#6a5228'),mt=hex('#4a4c4e');
  if(k==='shell'){g.tube([0,0,-0.026],[0,0,0.022],0.0058,0.0058,6,br);g.tube([0,0,0.022],[0,0,0.03],0.0058,0.004,6,br);g.cyl(0.0055,0.0055,-0.0262,-0.0258,6,dk);}
  else if(k==='shellP'){g.tube([0,0,-0.012],[0,0,0.012],0.006,0.006,6,br);}
  else if(k==='clip'){g.box(-0.016,0.016,-0.003,0.003,-0.028,0.028,mt);g.box(-0.016,-0.012,0.003,0.022,-0.028,0.028,mt);g.box(0.012,0.016,0.003,0.022,-0.028,0.028,mt);}
  else if(k==='spoon'){g.box(-0.007,0.007,-0.001,0.001,-0.04,0.04,hex('#59603f'));g.box(-0.007,0.007,-0.012,0.0,0.035,0.041,hex('#59603f'));}
  else if(k==='chunk'){g.ico(0.07,[1,1,1]);g.scale(0,1,0.7,1.2);}
  else if(k==='splinter'){g.box(-0.012,0.012,-0.006,0.006,-0.08,0.08,hex('#a07a50'));}
  else if(k==='plate'){g.box(-0.04,0.04,-0.003,0.003,-0.03,0.03,mt);}
  else g.box(-0.06,0.06,-0.03,0.03,-0.04,0.04,hex('#9a6a50'));
  return this._dd[k]={m:GL.matInst(g),d:new Float32Array(24*19),n:0};},
 // restos 3D (opaco, con el resto de la escena)
 drawOpaque(){if(!GL.gl||!this.D.length)return;const gl=GL.gl,p=GL.progs.lit,M=this._M;
  for(const k in this._dd)this._dd[k].n=0;
  for(const d of this.D){const b=this._debMesh(d.k),fade=Math.min(1,(d.life-d.t)*1.5),s=d.s*fade;if(s<0.05)continue;
   if(d.t>0.3&&V3.dist2(d.p,Cam.eye)>3600)continue;
   if((b.n+1)*19>b.d.length){const nd=new Float32Array(b.d.length*2);nd.set(b.d);b.d=nd;}
   M4.compose(d.p,d.r[1],d.r[0],d.r[2],s,M);const o=b.n*19;b.d.set(M,o);b.d[o+16]=d.c[0];b.d[o+17]=d.c[1];b.d[o+18]=d.c[2];b.n++;}
  Lit.setup(p);gl.uniform1f(p.u.uInst,2);
  for(const k in this._dd){const b=this._dd[k];if(!b.n)continue;GL.setMatInst(b.m,b.d,b.n);gl.uniform1f(p.u.uGloss,k==='shell'||k==='shellP'||k==='clip'||k==='plate'?0.7:0);GL.draw(b.m);}
  gl.uniform1f(p.u.uInst,0);gl.uniform1f(p.u.uGloss,0);},
 // marcas, partículas (transparentes ordenadas de lejos a cerca + aditivas), trazadoras, clima
 draw(){if(!GL.gl)return;const gl=GL.gl;if(this.dec)this.dec.draw();if(this.big)this.big.draw();
  const P=this.P,A=this._da,B=this._db,e=Cam.eye,idx=this._idx,key=this._key,fw=Cam.fwd;let na=0,nb=0,ni=0;
  for(let i=0;i<this.n;i++){const o=i*FXS,age=P[o+6];if(age<0)continue;const dx=P[o]-e[0],dy=P[o+1]-e[1],dz=P[o+2]-e[2],sz=P[o+9]>P[o+8]?P[o+9]:P[o+8];
   if(dx*fw[0]+dy*fw[1]+dz*fw[2]<-sz*2)continue; // detrás de la cámara
   if(P[o+19]&FXF_ADD){if(nb>=FX_MAX-200)continue;const u=age/P[o+7],q=nb++*10,ft=P[o+19]&FXF_FIRE,uu=1-(1-u)*(1-u);
    B[q]=P[o];B[q+1]=P[o+1];B[q+2]=P[o+2];B[q+3]=P[o+8]+(P[o+9]-P[o+8])*uu;B[q+4]=P[o+10]*(1-u)*Math.min(1,u*20+0.3);B[q+5]=P[o+11];B[q+6]=P[o+13];
    B[q+7]=P[o+14];B[q+8]=P[o+15]*(ft?1-0.55*u:1);B[q+9]=P[o+16]*(ft?1-0.85*u:1);}
   else{key[ni]=dx*dx+dy*dy+dz*dz;idx[ni++]=i;}}
  // ordenar índices por distancia (inserción: casi ordenado de un fotograma a otro sería mejor, pero así es simple y sin memoria)
  const sub=idx.subarray(0,ni);FX._k=key;sub.sort(FX_BYK);
  for(let j=0;j<ni;j++){const i=sub[j],o=i*FXS,u=P[o+6]/P[o+7],fi=P[o+19]&FXF_SLOW?Math.min(1,u*6):Math.min(1,u*14+0.2),q=na++*10,uu=1-(1-u)*(1-u);
   A[q]=P[o];A[q+1]=P[o+1];A[q+2]=P[o+2];A[q+3]=P[o+8]+(P[o+9]-P[o+8])*uu;A[q+4]=P[o+10]*fi*(1-u*u);A[q+5]=P[o+11];A[q+6]=P[o+13];A[q+7]=P[o+14];A[q+8]=P[o+15];A[q+9]=P[o+16];}
  // proyectiles de artillería que caen (mancha oscura)
  for(const q of this.I){if(q.t>q.T*0.45||nb>=FX_MAX-4)continue;const o=na++*10;A[o]=q.p[0];A[o+1]=q.p[1];A[o+2]=q.p[2];A[o+3]=0.35;A[o+4]=0.8;A[o+5]=0;A[o+6]=0;A[o+7]=0.1;A[o+8]=0.1;A[o+9]=0.1;}
  GL.drawParticles(A,na,false);
  this._weather(A);
  GL.drawParticles(B,nb,true);
  this._drawTracers();}
};
FX._k=null;
const FX_BYS=(a,b)=>b.s-a.s,FX_BYK=(a,b)=>FX._k[b]-FX._k[a];
// trazadoras (y lluvia): estelas 3D emisivas con mezcla aditiva; el ancho crece con la distancia para que se vean siempre
FX._trGeo=function(){const g=new Geo(),c=[1,1,1],h=[1,0.92,0.75];
 // rombo alargado: cabeza gruesa delante (z=1) y cola fina detrás (z=0)
 const P=[[0,0,0],[0.5,0,0.86],[0,0.5,0.86],[-0.5,0,0.86],[0,-0.5,0.86],[0,0,1]];
 for(let i=0;i<4;i++){const a=P[1+i],b=P[1+(i+1)%4];g.tri(P[0],a,b,h,false);g.tri(P[5],a,b,c,false);}return g;};
FX._drawTracers=function(){const W=this.W;if(!this.T.length&&!W.rain)return;const gl=GL.gl,p=GL.progs.lit,u=p.u;
 if(!this._trM)this._trM=GL.matInst(this._trGeo());const D=this._trD,e=Cam.eye,M=this._M;let n=0;
 for(const q of this.T){if(n>=150)break;const head=q.t*q.v,h=Math.min(head,q.l),L=h-Math.max(0,head-5.5);if(L<0.3)continue;
  const x=q.a[0]+q.d[0]*h,y=q.a[1]+q.d[1]*h,z=q.a[2]+q.d[2]*h,dist=Math.sqrt((x-e[0])**2+(y-e[1])**2+(z-e[2])**2),w=Math.max(0.022,dist*0.0016),fog=clamp((dist-Env.fogN)/(Env.fogF-Env.fogN+1),0,1);
  // matriz: eje Z a lo largo de la trazadora (longitud L), ancho w
  const dx=q.d[0],dy=q.d[1],dz=q.d[2];let ax=-dz,az=dx,al=Math.hypot(ax,az);if(al<1e-4){ax=1;az=0;al=1;}ax/=al;az/=al;const bx=dy*az,by=dz*ax-dx*az,bz=-dy*ax;
  M[0]=ax*w;M[1]=0;M[2]=az*w;M[3]=0;M[4]=bx*w;M[5]=by*w;M[6]=bz*w;M[7]=0;M[8]=dx*L;M[9]=dy*L;M[10]=dz*L;M[11]=0;M[12]=x-dx*L;M[13]=y-dy*L;M[14]=z-dz*L;M[15]=1;
  const o=n*19,k=1-fog*0.75;D.set(M,o);D[o+16]=2.6*k+0.5;D[o+17]=1.9*k+0.3;D[o+18]=0.95*k+0.12;n++;}
 Lit.setup(p);gl.uniform1f(u.uInst,2);gl.uniform1f(u.uFogConst,0);gl.depthMask(false);
 if(n){GL.setMatInst(this._trM,D,n);GL.blend('add');GL.draw(this._trM);}
 // lluvia: estelas finas y grises con mezcla normal
 if(W.rain&&W.rm&&W.rn){gl.uniform1f(u.uFogConst,-1);gl.uniform1f(u.uAlpha,0.28);GL.blend('alpha');GL.setMatInst(W.rm,W.rd,W.rn);GL.draw(W.rm);gl.uniform1f(u.uAlpha,1);}
 GL.blend(null);gl.depthMask(true);gl.uniform1f(u.uInst,0);gl.uniform1f(u.uFogConst,-1);};
// clima alrededor de la cámara (se anima al dibujar, con el reloj del motor): nieve, lluvia y ceniza
FX._weather=function(A){const W=this.W,amt=W.snow+W.rain+W.ash;if(!amt)return;const e=Cam.eye,now=GL.time,dt=W.last<0?0:clamp(now-W.last,0,0.1);W.last=now;
 const q=GFX.name(),cap=q==='baja'?260:q==='media'?480:q==='alta'?720:1000,R=Math.random,wind=(Env.wind||1),BX=30,BY=16;
 if(!W.a){W.n=Math.round(cap*Math.min(1,amt));W.a=new Float32Array(W.n*4);for(let i=0;i<W.n;i++){W.a[i*4]=e[0]+(R()-0.5)*BX;W.a[i*4+1]=e[1]-4+R()*BY;W.a[i*4+2]=e[2]+(R()-0.5)*BX;W.a[i*4+3]=R()*6.28;}}
 const a=W.a,n=W.n,rain=W.rain>W.snow&&W.rain>=W.ash,ash=!rain&&W.ash>W.snow;
 // luz que reciben los copos (no usan la luz del shader): ambiente + algo de sol
 const L=Lit.avgLight(this._q,0.5),k=rain?0.75:1.15,cr=ash?0.33:Math.min(1.2,L[0]*k),cg=ash?0.32:Math.min(1.2,L[1]*k),cb=ash?0.31:Math.min(1.2,L[2]*k*1.04);
 const fall=rain?10:ash?0.45:1.25,swirl=rain?0.1:ash?0.9:0.5;
 if(rain&&GL.gl){if(!W.rm)W.rm=GL.matInst(FX._rainGeo());if(!W.rd||W.rd.length<n*19)W.rd=new Float32Array(n*19);}
 let m=0;const D=W.rd,M=this._M;
 for(let i=0;i<n;i++){const o=i*4,ph=a[o+3];a[o]+=(wind*(rain?1.6:0.7)+Math.sin(now*0.9+ph)*swirl)*dt;a[o+1]-=fall*(0.8+0.4*Math.sin(ph*7))*dt;a[o+2]+=(wind*0.3+Math.cos(now*0.7+ph*1.3)*swirl)*dt;
  if(a[o]-e[0]>BX/2)a[o]-=BX;else if(e[0]-a[o]>BX/2)a[o]+=BX;if(a[o+2]-e[2]>BX/2)a[o+2]-=BX;else if(e[2]-a[o+2]>BX/2)a[o+2]+=BX;
  if(a[o+1]<e[1]-5){a[o+1]+=BY;if(rain&&R()<0.06&&this._room(0.3)){const gx=a[o],gz=a[o+2],gy=World.height(gx,gz);if(Math.abs(gy-e[1])<4)this._p(gx,gy+0.02,gz,0,0.8,0,0.25,0.03,0.08,0.45,2,cr,cg,cb,6,0,0);}}
  else if(a[o+1]>e[1]+BY-5)a[o+1]-=BY;
  if(rain){if(!D)continue;const x=a[o],y=a[o+1],z=a[o+2],len=0.55,w=0.012,sx=wind*1.6/10;
   M[0]=w;M[1]=0;M[2]=0;M[3]=0;M[4]=0;M[5]=0;M[6]=w;M[7]=0;M[8]=sx*len;M[9]=-len;M[10]=0;M[11]=0;M[12]=x;M[13]=y;M[14]=z;M[15]=1;const q2=m*19;D.set(M,q2);D[q2+16]=0.75;D[q2+17]=0.8;D[q2+18]=0.88;m++;}
  else{const q2=i*10;A[q2]=a[o];A[q2+1]=a[o+1];A[q2+2]=a[o+2];A[q2+3]=ash?0.028:0.03+0.012*Math.sin(ph*5);A[q2+4]=ash?0.7:0.85;A[q2+5]=ph;A[q2+6]=ash?3:2;A[q2+7]=cr;A[q2+8]=cg;A[q2+9]=cb;}}
 W.rn=m;
 if(!rain){GL.drawParticles(A,n,false);
  // ceniza: alguna brasa que sube
  if(ash&&R()<dt*((Env.stars||0)>0.5?18:6)&&this._room(0.3))this._p(e[0]+(R()-0.5)*20,e[1]-1.5,e[2]+(R()-0.5)*20,wind*0.4,0.8+R(),0,3+R()*2,0.02,0.012,1,2,1,0.5,0.15,-0.05,0.1,FXF_ADD);}};
FX._rainGeo=function(){const g=new Geo(),c=[1,1,1];g.quad([-1,0,0],[1,0,0],[1,0,1],[-1,0,1],c,false);g.quad([0,-1,0],[0,1,0],[0,1,1],[0,-1,1],c,false);return g;};
