// ===== FRENTE 44 · mundo: relieve, objetos de escenario, colisiones, raycast, navegación, coberturas y dibujo estático =====
// Relieve: rejilla de alturas fina (terrain.res, 1 m) en la zona de juego y gruesa (4 m) alrededor, con cráteres y trincheras.
// Objetos por datos (PREFABS, ver DESIGN §4 «Formato de escenario»): cada uno pone geometría (unida por trozos de 32 m y material)
// y colisionadores OBB (cajas giradas sólo en rumbo) en una rejilla espacial de 4 m. Navegación: rejilla de 1 m + A* con suavizado.
const W_CH=32,W_STEP=0.45,W_HC=4,W_NO={};
// materiales de la geometría estática: [textura, repeticiones por metro]
const W_MAT={plain:[null,0],wood:[()=>Tex.wood(1),0.9],plaster:[()=>Tex.plaster(1),0.45],brick:[()=>Tex.brick(1),0.55],stone:[()=>Tex.stone(1),0.4],
 metal:[()=>Tex.metal(1),0.6],roof:[()=>Tex.roof(1),0.7],concrete:[()=>Tex.plaster(4),0.32],sand:[()=>Tex.ground('sand',2),1.2],dirt:[()=>Tex.ground('dirt',3),0.5]};
const W_MATK=Object.keys(W_MAT);
const W_SURF={plain:'stone',wood:'wood',plaster:'stone',brick:'stone',stone:'stone',metal:'metal',roof:'stone',concrete:'stone',sand:'sand',dirt:'dirt'};
const W_COL={plaster:'#ddd5c2',brick:'#b07a5e',stone:'#a39b8b',wood:'#8a6a48',concrete:'#a09f96',metal:'#56594f',roof:'#8a5a44',plain:'#8a8478',sand:'#b8a77a',dirt:'#6b5a42'};
// paletas de suelo por defecto: [claro, seco, tierra/talud]
const W_PAL={grass:['#5f7a3a','#7f7a4a','#6a5d44'],dirt:['#7a6a50','#66583f','#55483a'],mud:['#5e5040','#4e4334','#3f362a'],sand:['#c8b48a','#b8a47c','#8f7f62'],snow:['#e9eef3','#d8dfe8','#9c938a']};
const W_GSURF={grass:'grass',dirt:'dirt',mud:'dirt',sand:'sand',snow:'snow'};
const NAV_OFF=[[0,0],[0.3,0],[-0.3,0],[0,0.3],[0,-0.3],[0.3,0.3],[-0.3,-0.3],[0.3,-0.3],[-0.3,0.3]];
const NAV_DX=[1,-1,0,0,1,-1,1,-1],NAV_DZ=[0,0,1,-1,1,1,-1,-1],NAV_OP=[1,0,3,2,7,6,5,4];

const World={def:null,built:false,bounds:[-60,-60,60,60],fg:null,cg:null,base:null,kind:'grass',hMax:0,mods:[],water:null,
 cols:[],hash:new Map(),usables:[],props:{},points:{},fxPts:[],chunks:new Map(),chunkList:[],tList:[],_tvis:[],dyn:[],inst:{},decals:null,wm:null,tex:{},
 _stamp:1,_vis:[],_nA:[],_nB:[],_nC:[],_nD:[],_tn:[0,1,0],_mr:{pos:null,onGround:false,hitWall:false,landV:0,ground:0,surface:null,ceil:false},
 // ---------- construir / vaciar ----------
 build(def){this.clear();def=def||{};this.def=def;const T=def.terrain||{};
  this.bounds=(def.bounds||[-60,-60,60,60]).slice();this.kind=T.tex||'grass';this.base=T.h||(()=>0);this.surfFn=T.surface||null;this.colFn=T.color||null;
  this.water=def.water?{y:def.water.y||0,col:hex(def.water.col||'#3e4d48')}:null;
  // 1) modificadores del relieve que piden los objetos (cráteres, trincheras) y los del escenario
  this.mods=(T.mods||[]).slice();const props=(def.props||[]).filter(Boolean);
  for(const o of props){const P=PREFABS[o.t];if(P&&P.mods)P.mods(o,this.mods);}
  for(const m of this.mods)this._prepMod(m);
  // 2) alturas, 3) objetos, 4) mallas, 5) navegación, coberturas e interactuables
  this._heights(T);this.decals=new DecalBuf(700,3);
  for(const o of props)this._place(o);
  this._terrainMeshes(T);this._upload();
  NAV.build();this._autoCover();
  for(const c of def.cover||[])this.cover.add(c.pos,c.n,c.low);
  for(const u of def.usables||[])this.addUsable(u);
  this.built=true;return this;},
 clear(){const ok=GL.gl&&!GL.lost;
  if(ok){for(const T of this.tList)GL.free(T.m);for(const C of this.chunkList)for(const k in C.m)GL.free(C.m[k]);for(const r of this.dyn)for(const k in r.meshes||{})GL.free(r.meshes[k]);
   for(const k in this.inst)if(this.inst[k].m)GL.free(this.inst[k].m);if(this.wm)GL.free(this.wm);if(this.decals)this.decals.free();}
  this.chunks=new Map();this.chunkList=[];this.tList=[];this.dyn=[];this.inst={};this.wm=null;this.decals=null;this.cols=[];this.hash=new Map();
  this.usables=[];this.props={};this.points={};this.fxPts=[];this.covers=[];this.chash=new Map();this.mods=[];this.built=false;this.def=null;},
 // ---------- relieve ----------
 _prepMod(m){let r;if(m.t==='crater'){r=m.r*1.5;m.ax0=m.x-r;m.ax1=m.x+r;m.az0=m.z-r;m.az1=m.z+r;}
  else if(m.t==='trench'){r=m.w/2+1.2;m.ax0=Math.min(m.ax,m.bx)-r;m.ax1=Math.max(m.ax,m.bx)+r;m.az0=Math.min(m.az,m.bz)-r;m.az1=Math.max(m.az,m.bz)+r;m.L=Math.hypot(m.bx-m.ax,m.bz-m.az)||1;}
  else if(m.t==='flat'){r=Math.hypot(m.w||4,m.d||4)/2+(m.blend||3);m.ax0=m.x-r;m.ax1=m.x+r;m.az0=m.z-r;m.az1=m.z+r;}
  else{r=(m.r||5)*2.5;m.ax0=m.x-r;m.ax1=m.x+r;m.az0=m.z-r;m.az1=m.z+r;}},
 // altura sin rejilla: base + modificadores (cráter: cuenco con reborde; trinchera: corte de paredes casi verticales; flat: explanada; hill: loma)
 hRaw(x,z){let h=this.base(x,z),cut=0;
  for(const m of this.mods){if(x<m.ax0||x>m.ax1||z<m.az0||z>m.az1)continue;
   if(m.t==='crater'){const q=Math.hypot(x-m.x,z-m.z)/m.r;if(q<1){const k=1-q*q;h-=m.d*k*k;}h+=m.d*0.2*Math.exp(-(((q-1)/0.22)**2));}
   else if(m.t==='trench'){const dx=m.bx-m.ax,dz=m.bz-m.az;const t=clamp(((x-m.ax)*dx+(z-m.az)*dz)/(m.L*m.L),0,1),s=Math.hypot(x-m.ax-dx*t,z-m.az-dz*t),hw=m.w/2;
    let k=s<=hw?1:smooth(1-(s-hw)/0.9);if(m.rampA)k*=smooth(t*m.L/4);if(m.rampB)k*=smooth((1-t)*m.L/4);cut=Math.max(cut,m.d*k);}
   else if(m.t==='flat'){const c=Math.cos(m.yaw||0),s=Math.sin(m.yaw||0),lx=c*(x-m.x)-s*(z-m.z),lz=s*(x-m.x)+c*(z-m.z);
    const ex=Math.max(0,Math.abs(lx)-(m.w||4)/2),ez=Math.max(0,Math.abs(lz)-(m.d||4)/2),k=1-smooth(Math.hypot(ex,ez)/(m.blend||3));h=lerp(h,m.y!=null?m.y:this.base(m.x,m.z),k);}
   else if(m.t==='hill')h+=m.h*Math.exp(-(((x-m.x)**2+(z-m.z)**2)/(m.r*m.r)));}
  return h-cut;},
 _heights(T){const b=this.bounds,mar=T.margin==null?224:T.margin,ch=W_CH,s=v=>Math.floor(v/ch)*ch,S=v=>Math.ceil(v/ch)*ch;this.hMax=-1e9;
  this.fg=this._grid(s(b[0]-12),s(b[1]-12),S(b[2]+12),S(b[3]+12),T.res||1);
  const s2=v=>Math.floor(v/128)*128,S2=v=>Math.ceil(v/128)*128;this.cg=this._grid(s2(b[0]-12-mar),s2(b[1]-12-mar),S2(b[2]+12+mar),S2(b[3]+12+mar),4);},
 _grid(x0,z0,x1,z1,res){const nx=Math.round((x1-x0)/res),nz=Math.round((z1-z0)/res),h=new Float32Array((nx+1)*(nz+1));let k=0;
  for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){const v=this.hRaw(x0+i*res,z0+j*res);h[k++]=v;if(v>this.hMax)this.hMax=v;}return {x0,z0,x1,z1,res,nx,nz,h};},
 // interpolación por triángulos (la misma partición que las mallas): los pies coinciden con el suelo dibujado
 _tri(g,x,z){const fx=(x-g.x0)/g.res,fz=(z-g.z0)/g.res,i=Math.min(g.nx-1,fx|0),j=Math.min(g.nz-1,fz|0),u=fx-i,v=fz-j,N=g.nx+1,H=g.h,a=j*N+i;
  return u+v<=1?H[a]+(H[a+1]-H[a])*u+(H[a+N]-H[a])*v:H[a+N+1]+(H[a+N]-H[a+N+1])*(1-u)+(H[a+1]-H[a+N+1])*(1-v);},
 height(x,z){let g=this.fg;if(g&&x>=g.x0&&x<g.x1&&z>=g.z0&&z<g.z1)return this._tri(g,x,z);g=this.cg;if(g&&x>=g.x0&&x<g.x1&&z>=g.z0&&z<g.z1)return this._tri(g,x,z);return this.base?this.base(x,z):0;},
 normalAt(x,z,o){o=o||[0,0,0];const e=0.5,hx=(this.height(x+e,z)-this.height(x-e,z))/(2*e),hz=(this.height(x,z+e)-this.height(x,z-e))/(2*e),l=Math.hypot(hx,1,hz);o[0]=-hx/l;o[1]=1/l;o[2]=-hz/l;return o;},
 surfaceAt(x,z){if(this.water&&this.height(x,z)<this.water.y-0.05)return 'water';return this.surfFn?this.surfFn(x,z):(W_GSURF[this.kind]||'grass');},
 inBounds(x,z,m){const b=this.bounds;m=m||0;return x>=b[0]+m&&x<=b[2]-m&&z>=b[1]+m&&z<=b[3]-m;},
 _tcol(x,z,n,y){const depth=this.base(x,z)-y;if(this.colFn)return this.colFn(x,z,n,y,depth);
  const P=W_PAL[this.kind]||W_PAL.grass,m=fbm2(x*0.03,z*0.03,7,3);let c=mixC(P[0],P[1],smooth((m-0.35)*2.2));
  c=mixC(c,P[2],Math.max(smooth((0.93-n[1])/0.2)*0.8,depth>0.12?smooth(depth/0.7)*0.85:0));
  if(this.water&&y<this.water.y+0.5)c=c.map(v=>v*lerp(0.7,1,clamp((y-this.water.y+0.2)/0.7,0,1)));
  const k=0.93+0.12*vnoise(x*0.27,z*0.27,3);return [c[0]*k,c[1]*k,c[2]*k];},
 _terrainMeshes(T){const fg=this.fg,cg=this.cg,ch=W_CH,uvK=T.uv||0.22;
  // se parte en cuadros de 128 m: dentro de la zona fina, trozos de 32 m a la resolución fina; fuera, 4 m (cerca) u 8 m (lejos)
  const tile=(x0,z0,sz)=>{const inF=x0>=fg.x0&&x0+sz<=fg.x1&&z0>=fg.z0&&z0+sz<=fg.z1,outF=x0+sz<=fg.x0||x0>=fg.x1||z0+sz<=fg.z0||z0>=fg.z1;
   const dx=Math.max(fg.x0-(x0+sz),x0-fg.x1,0),dz=Math.max(fg.z0-(z0+sz),z0-fg.z1,0),far=Math.hypot(dx,dz)>=100;
   if(sz>ch&&(!outF||(!far&&sz>64))){const h=sz/2;tile(x0,z0,h);tile(x0+h,z0,h);tile(x0,z0+h,h);tile(x0+h,z0+h,h);return;}
   const T={cx:x0+sz/2,cz:z0+sz/2,cy:0,r:sz,y0:1e9,y1:-1e9,m:null};T.m=GL.mesh(this._tchunk(x0,z0,sz,inF?fg.res:far?8:4,uvK,T));
   T.cy=(T.y0+T.y1)/2;T.r=Math.hypot(sz*0.71,(T.y1-T.y0)/2)+1;this.tList.push(T);};
  for(let z=cg.z0;z<cg.z1;z+=128)for(let x=cg.x0;x<cg.x1;x+=128)tile(x,z,128);},
 // un trozo de relieve con faldón (oculta las grietas entre trozos de distinta resolución)
 _tchunk(x0,z0,ch,res,uvK,C){const n=Math.round(ch/res),N=n+1,nv=N*N+4*N,p=new Float32Array(nv*3),nm=new Float32Array(nv*3),c=new Float32Array(nv*3),u=new Float32Array(nv*2),idx=new Uint32Array((n*n+4*n)*6),nn=[0,1,0];
  let q=0;for(let j=0;j<N;j++)for(let i=0;i<N;i++){const k=j*N+i,x=x0+i*res,z=z0+j*res,y=this.height(x,z);p[k*3]=x;p[k*3+1]=y;p[k*3+2]=z;
   const e=res*0.5,hx=(this.height(x+e,z)-this.height(x-e,z))/(2*e),hz=(this.height(x,z+e)-this.height(x,z-e))/(2*e),l=Math.hypot(hx,1,hz);nn[0]=-hx/l;nn[1]=1/l;nn[2]=-hz/l;
   nm[k*3]=nn[0];nm[k*3+1]=nn[1];nm[k*3+2]=nn[2];const cc=this._tcol(x,z,nn,y);c[k*3]=cc[0];c[k*3+1]=cc[1];c[k*3+2]=cc[2];u[k*2]=x*uvK;u[k*2+1]=z*uvK;
   if(y<C.y0)C.y0=y;if(y>C.y1)C.y1=y;}
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){const a=j*N+i;idx[q++]=a;idx[q++]=a+1;idx[q++]=a+N;idx[q++]=a+1;idx[q++]=a+N+1;idx[q++]=a+N;}
  let v=N*N;const edges=[[0,1],[N*n,1],[0,N],[n,N]];
  for(const [s0,st] of edges){const b=v;for(let k=0;k<N;k++){const e=s0+k*st;for(let a=0;a<3;a++){p[v*3+a]=p[e*3+a];nm[v*3+a]=nm[e*3+a];c[v*3+a]=c[e*3+a]*0.75;}p[v*3+1]-=3;u[v*2]=u[e*2];u[v*2+1]=u[e*2+1];v++;}
   for(let k=0;k<n;k++){const e0=s0+k*st,e1=e0+st;idx[q++]=e0;idx[q++]=e1;idx[q++]=b+k+1;idx[q++]=e0;idx[q++]=b+k+1;idx[q++]=b+k;}}
  return {p,n:nm,c,u,idx};},
 _chunkAt(x,z){const i=Math.floor(x/W_CH),j=Math.floor(z/W_CH),k=this._key(i,j);let C=this.chunks.get(k);
  if(!C){C={i,j,cx:(i+0.5)*W_CH,cz:(j+0.5)*W_CH,cy:0,r:W_CH,y0:1e9,y1:-1e9,g:{},m:{}};this.chunks.set(k,C);this.chunkList.push(C);}return C;},
 _key(i,j){return (i+32768)*65536+(j+32768);},
 // ---------- objetos de escenario ----------
 _place(o){const P=PREFABS[o.t];if(!P){console.error('World: objeto desconocido '+o.t);return null;}
  const w=!!P.world,x=w?0:o.x||0,z=w?0:o.z||0,y=w?0:o.y!=null?o.y:this.height(x,z);
  WB.begin(o,x,y,z,w?0:o.yaw||0,!!o.id);P.build(WB,o);return WB.end();},
 // objeto añadido durante la partida (siempre con malla propia; se puede quitar con World.remove(id))
 addProp(o){if(!o.id)o.id='p'+(this._pid=(this._pid||0)+1);const r=this._place(o);if(!r)return null;this._uploadRec(r);for(const k in this.inst)this.inst[k].dirty=true;
  if(r.cols.length&&NAV.walk){let x0=1e9,z0=1e9,x1=-1e9,z1=-1e9;for(const c of r.cols){const e=c.hx+c.hz;x0=Math.min(x0,c.x-e);x1=Math.max(x1,c.x+e);z0=Math.min(z0,c.z-e);z1=Math.max(z1,c.z+e);}NAV.updateArea(x0,z0,x1,z1);}return r;},
 // activa o quita un colisionador (rampas, puertas); nav=true recalcula la navegación de alrededor
 colOn(c,on,nav){if(!c||c.dead===!on)return;c.dead=!on;if(on)this._hashIns(c);else this._hashDel(c);if(nav&&NAV.walk){const e=c.hx+c.hz;NAV.updateArea(c.x-e,c.z-e,c.x+e,c.z+e);}},
 // objetos móviles (con id): matriz de modelo del objeto entero (M4 en coordenadas del mundo; null = como se construyó)
 setM(id,M){const r=this.props[id];if(r)r.M=M;return r;},
 // gira un objeto con id un ángulo alrededor del eje horizontal perpendicular al rumbo yaw que pasa por pivot (bisagras: rampas, trampillas)
 hinge(id,pivot,yaw,ang){const r=this.props[id];if(!r)return null;const A=M4.compose(pivot,yaw,-ang,0,1),B=M4.invert(M4.compose(pivot,yaw,0,0,1),new Float32Array(16));r.M=M4.mul(A,B,r.M||new Float32Array(16));return r;},
 // punto con nombre de un objeto (World.points['id.nombre'] = [x,y,z,yaw])
 point(name){return this.points[name]||null;},
 remove(id){const r=this.props[id];if(!r)return false;r.vis=false;let x0=1e9,z0=1e9,x1=-1e9,z1=-1e9;
  for(const c of r.cols)if(!c.dead){c.dead=true;this._hashDel(c);const e=c.hx+c.hz;x0=Math.min(x0,c.x-e);x1=Math.max(x1,c.x+e);z0=Math.min(z0,c.z-e);z1=Math.max(z1,c.z+e);}
  for(const c of this.covers)if(c.col&&c.col.dead)c.dead=true;for(const h of r.insts)this._instHide(h);for(const c of r.covers)c.dead=true;delete this.props[id];
  if(x1>x0&&NAV.walk)NAV.updateArea(x0,z0,x1,z1);return true;},
 _upload(){for(const C of this.chunkList){for(const k in C.g){const g=C.g[k];if(!g.count)continue;C.m[k]=GL.fromGeo(g);const P=g.p;for(let i=1;i<P.length;i+=3){if(P[i]<C.y0)C.y0=P[i];if(P[i]>C.y1)C.y1=P[i];}}C.g={};
   if(C.y0>C.y1)C.y0=C.y1=0;C.cy=(C.y0+C.y1)/2;C.r=Math.hypot(W_CH*0.75,(C.y1-C.y0)/2)+2;}
  for(const r of this.dyn)this._uploadRec(r);
  for(const k in this.inst)this.inst[k].dirty=true;
  if(this.water){const g=new Geo(),cg=this.cg,w=this.water;g.grid(cg.x0,cg.z0,cg.x1,cg.z1,24,24,w.col,()=>w.y);this.wm=GL.fromGeo(g);}},
 _uploadRec(r){if(!r.geos||r.meshes)return;r.meshes={};let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9,z0=1e9,z1=-1e9;
  for(const k in r.geos){const g=r.geos[k];if(!g.count)continue;r.meshes[k]=GL.fromGeo(g);const P=g.p;
   for(let i=0;i<P.length;i+=3){x0=Math.min(x0,P[i]);x1=Math.max(x1,P[i]);y0=Math.min(y0,P[i+1]);y1=Math.max(y1,P[i+1]);z0=Math.min(z0,P[i+2]);z1=Math.max(z1,P[i+2]);}}
  r.geos=null;r.c=[(x0+x1)/2,(y0+y1)/2,(z0+z1)/2];r.rad=Math.hypot(x1-x0,y1-y0,z1-z0)/2+0.5;},
 // tipos instanciados (árboles, cajas, barriles, sacos, erizos, rocas): una llamada por tipo
 _instT(type){let I=this.inst[type];if(!I){const D=W_IGEO[type]();I=this.inst[type]={type,g:D.g,mat:D.mat||'plain',sway:D.sway||0,gloss:D.gloss||0,d:[],n:0,m:null,dirty:true};}return I;},
 _instHide(h){const I=this.inst[h.type];if(!I)return;const o=h.i*10;I.d[o+4]=I.d[o+5]=I.d[o+6]=0;I.dirty=true;},
 _instUp(I){if(!I.m)I.m=GL.instOf(I.g);GL.setInst(I.m,new Float32Array(I.d),I.n);I.dirty=false;},
 // ---------- colisionadores ----------
 _addCol(x,y,z,hx,hy,hz,yaw,surf,opt){opt=opt||W_NO;const c={x,y,z,hx,hy,hz,yaw,c:Math.cos(yaw),s:Math.sin(yaw),surf:surf||'stone',thin:!!opt.thin,see:!!opt.see,nob:!!opt.nob,nom:!!opt.nom,
   cov:opt.cover!==false,hp:opt.hp||0,expl:!!opt.expl,inst:null,prop:null,dead:false,st:0,cells:[]};this.cols.push(c);this._hashIns(c);return c;},
 _hashIns(c){const ex=Math.abs(c.c)*c.hx+Math.abs(c.s)*c.hz,ez=Math.abs(c.s)*c.hx+Math.abs(c.c)*c.hz;
  for(let i=Math.floor((c.x-ex)/W_HC);i<=Math.floor((c.x+ex)/W_HC);i++)for(let j=Math.floor((c.z-ez)/W_HC);j<=Math.floor((c.z+ez)/W_HC);j++){
   const k=this._key(i,j);let a=this.hash.get(k);if(!a)this.hash.set(k,a=[]);a.push(c);c.cells.push(k);}},
 _hashDel(c){for(const k of c.cells){const a=this.hash.get(k);if(!a)continue;const i=a.indexOf(c);if(i>=0)a.splice(i,1);}c.cells.length=0;},
 _near(x,z,r,out){out.length=0;const st=++this._stamp;
  for(let i=Math.floor((x-r)/W_HC);i<=Math.floor((x+r)/W_HC);i++)for(let j=Math.floor((z-r)/W_HC);j<=Math.floor((z+r)/W_HC);j++){const a=this.hash.get(this._key(i,j));if(!a)continue;
   for(const c of a){if(c.st===st)continue;c.st=st;out.push(c);}}return out;},
 _circOBB(c,x,z,r){const dx=x-c.x,dz=z-c.z,lx=c.c*dx-c.s*dz,lz=c.s*dx+c.c*dz,ex=lx-clamp(lx,-c.hx,c.hx),ez=lz-clamp(lz,-c.hz,c.hz);return ex*ex+ez*ez<r*r;},
 // ¿algo bloquea una cápsula de radio r y alto h con los pies en y? (lo que queda por debajo de un escalón no cuenta)
 _blocked(x,y,z,r,h){const L=this._near(x,z,r+0.1,this._nC);for(const c of L){if(c.nom||c.dead)continue;if(c.y+c.hy<=y+W_STEP||c.y-c.hy>=y+h)continue;if(this._circOBB(c,x,z,r))return true;}return false;},
 canStand(pos,r,h){return !this._blocked(pos[0],pos[1],pos[2],r||0.33,h||1.8);},
 // suelo más alto bajo el círculo (relieve o techo de un colisionador por debajo de maxY)
 groundAt(x,z,r,maxY){let g=this.height(x,z);this._gs=null;const L=this._near(x,z,r+0.1,this._nB);
  for(const c of L){if(c.nom||c.dead)continue;const t=c.y+c.hy;if(t<=g||t>maxY)continue;if(this._circOBB(c,x,z,r)){g=t;this._gs=c.surf;}}return g;},
 // mueve una cápsula vertical (pies en pos): desliza por paredes, sube escalones de 0.45 m, no trepa pendientes > ~52°, se pega al suelo si snap.
 // Modifica pos y vel. Devuelve {pos, onGround, hitWall, landV (velocidad al aterrizar), ground, surface (null = la del relieve), ceil}
 moveCapsule(pos,vel,r,h,dt,snap){const R=this._mr;R.pos=pos;R.onGround=false;R.hitWall=false;R.landV=0;R.ceil=false;
  let x=pos[0],y=pos[1],z=pos[2];const mx=vel[0]*dt,mz=vel[2]*dt,dist=Math.hypot(mx,mz),n=Math.min(8,Math.max(1,Math.ceil(dist/(r*0.6))));
  const L=this._near(x+mx/2,z+mz/2,r+dist/2+0.6,this._nA),tn=this._tn;
  for(let k=0;k<n;k++){const ox=x,oz=z;x+=mx/n;z+=mz/n;
   for(let it=0;it<2;it++)for(const c of L){if(c.nom||c.dead||c.y+c.hy<=y+W_STEP||c.y-c.hy>=y+h)continue;
    const dx=x-c.x,dz=z-c.z,lx=c.c*dx-c.s*dz,lz=c.s*dx+c.c*dz,qx=clamp(lx,-c.hx,c.hx),qz=clamp(lz,-c.hz,c.hz),ex=lx-qx,ez=lz-qz,d2=ex*ex+ez*ez;if(d2>=r*r)continue;
    let nx,nz,pen;if(d2>1e-9){const d=Math.sqrt(d2);nx=ex/d;nz=ez/d;pen=r-d;}else{const px=c.hx-Math.abs(lx),pz=c.hz-Math.abs(lz);if(px<pz){nx=lx<0?-1:1;nz=0;pen=px+r;}else{nx=0;nz=lz<0?-1:1;pen=pz+r;}}
    const wx=c.c*nx+c.s*nz,wz=-c.s*nx+c.c*nz;x+=wx*pen;z+=wz*pen;const vn=vel[0]*wx+vel[2]*wz;if(vn<0){vel[0]-=vn*wx;vel[2]-=vn*wz;}R.hitWall=true;}
   // relieve: escalón alto o pendiente muy empinada -> se quita la parte cuesta arriba
   const th=this.height(x,z);if(th>y+0.04){this.normalAt(x,z,tn);if(th>y+W_STEP||tn[1]<0.6){const hl=Math.hypot(tn[0],tn[2])||1,dx=tn[0]/hl,dz=tn[2]/hl,up=-((x-ox)*dx+(z-oz)*dz);
     if(up>0){x+=dx*up;z+=dz*up;}const vu=-(vel[0]*dx+vel[2]*dz);if(vu>0){vel[0]+=dx*vu;vel[2]+=dz*vu;}R.hitWall=true;}}}
  const b=this.bounds;x=clamp(x,b[0]+0.5,b[2]-0.5);z=clamp(z,b[1]+0.5,b[3]-0.5);
  y+=vel[1]*dt;const g=this.groundAt(x,z,r*0.75,Math.max(y,pos[1])+W_STEP);R.surface=this._gs;
  if(y<=g){if(vel[1]<0)R.landV=-vel[1];y=g;vel[1]=0;R.onGround=true;}else if(snap&&vel[1]<=0.01&&y-g<0.32){y=g;vel[1]=0;R.onGround=true;}
  if(vel[1]>0)for(const c of L){if(c.nom||c.dead)continue;const cb=c.y-c.hy;if(cb>pos[1]+W_STEP&&cb<y+h&&this._circOBB(c,x,z,r*0.9)){y=Math.max(pos[1],cb-h);vel[1]=0;R.ceil=true;}}
  pos[0]=x;pos[1]=y;pos[2]=z;R.ground=g;return R;},
 overlapSphere(p,r,out){out=out||[];out.length=0;const L=this._near(p[0],p[2],r+0.1,this._nD);
  for(const c of L){if(c.dead)continue;const dx=p[0]-c.x,dz=p[2]-c.z,lx=c.c*dx-c.s*dz,lz=c.s*dx+c.c*dz,ly=p[1]-c.y,ex=lx-clamp(lx,-c.hx,c.hx),ey=ly-clamp(ly,-c.hy,c.hy),ez=lz-clamp(lz,-c.hz,c.hz);
   if(ex*ex+ey*ey+ez*ez<r*r)out.push(c);}return out;},
 // ---------- rayos ----------
 // rayo contra una OBB: devuelve t de entrada (o -1) y deja la normal en this._hn. Si el origen está dentro, no cuenta.
 _rayOBB(c,o,d,tmax){const ox=o[0]-c.x,oz=o[2]-c.z,lox=c.c*ox-c.s*oz,loz=c.s*ox+c.c*oz,loy=o[1]-c.y,ldx=c.c*d[0]-c.s*d[2],ldz=c.s*d[0]+c.c*d[2],ldy=d[1];
  let t0=-1e9,t1=tmax,ax=-1,sg=0;
  for(let a=0;a<3;a++){const oo=a===0?lox:a===1?loy:loz,dd=a===0?ldx:a===1?ldy:ldz,hh=a===0?c.hx:a===1?c.hy:c.hz;if(Math.abs(dd)<1e-9){if(oo<-hh||oo>hh)return -1;continue;}
   let ta=(-hh-oo)/dd,tb=(hh-oo)/dd,s=-1;if(ta>tb){const q=ta;ta=tb;tb=q;s=1;}if(ta>t0){t0=ta;ax=a;sg=s;}if(tb<t1)t1=tb;if(t0>t1)return -1;}
  if(t0<0||ax<0)return -1;const n=this._hn;
  if(ax===1){n[0]=0;n[1]=sg;n[2]=0;}else if(ax===0){n[0]=c.c*sg;n[1]=0;n[2]=-c.s*sg;}else{n[0]=c.s*sg;n[1]=0;n[2]=c.c*sg;}return t0;},
 _hn:[0,1,0],
 // recorre las celdas de la rejilla por las que pasa el rayo (DDA en XZ); mode 0 balas, 1 visión. Devuelve el colisionador más cercano.
 _rayCols(o,d,maxT,mode,thin){const st=++this._stamp,H=W_HC;let ix=Math.floor(o[0]/H),iz=Math.floor(o[2]/H);
  const sx=d[0]>0?1:-1,sz=d[2]>0?1:-1,adx=Math.abs(d[0]),adz=Math.abs(d[2]);
  let tx=adx<1e-9?1e9:((d[0]>0?(ix+1)*H:ix*H)-o[0])/d[0],tz=adz<1e-9?1e9:((d[2]>0?(iz+1)*H:iz*H)-o[2])/d[2];const ddx=adx<1e-9?1e9:H/adx,ddz=adz<1e-9?1e9:H/adz;
  let best=maxT,bc=null;const bn=this._bn;
  for(let guard=0;guard<600;guard++){const a=this.hash.get(this._key(ix,iz));
   if(a)for(const c of a){if(c.st===st||c.dead)continue;c.st=st;if(mode===2?c.nom:c.nob||(mode===1&&c.see))continue;const t=this._rayOBB(c,o,d,best);if(t<0)continue;
    if(thin&&c.thin){thin.push({t,c,n:this._hn.slice()});continue;}best=t;bc=c;bn[0]=this._hn[0];bn[1]=this._hn[1];bn[2]=this._hn[2];}
   const te=Math.min(tx,tz);if(te>=best||te>maxT)break;if(tx<tz){ix+=sx;tx+=ddx;}else{iz+=sz;tz+=ddz;}}
  this._bt=best;return bc;},
 _bn:[0,1,0],
 // rayo contra el relieve: avanza con pasos según la distancia al suelo y afina por bisección. Devuelve t o -1
 _rayTerrain(o,d,maxT){let py=o[1],h=this.height(o[0],o[2]),gap=py-h;if(gap<0)return -1;let t=0,pt=0;
  for(let g=0;g<800;g++){if(d[1]>=0&&o[1]+d[1]*t>this.hMax+0.5)return -1;t+=clamp(gap*0.55,0.12,5);if(t>maxT)t=maxT;
   const x=o[0]+d[0]*t,z=o[2]+d[2]*t;py=o[1]+d[1]*t;h=this.height(x,z);gap=py-h;
   if(gap<0){let a=pt,b=t;for(let k=0;k<10;k++){const m=(a+b)/2;if(o[1]+d[1]*m<this.height(o[0]+d[0]*m,o[2]+d[2]*m))b=m;else a=m;}return b;}
   if(t>=maxT)return -1;pt=t;}return -1;},
 // rayo de bala: d normalizado. opts: {actors:bool, ignore:actor, pierce:n (atravesar madera fina)}.
 // -> {t, pos, normal, surface, actor, part, col (colisionador), through:[{pos,normal,surface,col}]} | null
 raycast(o,d,maxT,opts){opts=opts||W_NO;maxT=maxT||500;const thin=opts.pierce?[]:null;let c=this._rayCols(o,d,maxT,0,thin),best=this._bt,kind=c?1:0,nrm=c?this._bn.slice():null;
  const tt=this._rayTerrain(o,d,best);if(tt>=0&&tt<best){best=tt;kind=2;}
  if(this.water&&d[1]<0&&o[1]>this.water.y){const tw=(this.water.y-o[1])/d[1];if(tw<best){const x=o[0]+d[0]*tw,z=o[2]+d[2]*tw;if(this.height(x,z)<this.water.y){best=tw;kind=4;}}}
  let ah=null;if(opts.actors&&typeof Actors!=='undefined'){ah=Actors.raycast(o,d,best,opts.ignore);if(ah&&ah.t<best){best=ah.t;kind=3;}else ah=null;}
  let through=null;
  if(thin&&thin.length){thin.sort((a,b)=>a.t-b.t);through=[];for(const q of thin){if(q.t>=best)break;if(through.length>=opts.pierce){best=q.t;kind=1;c=q.c;nrm=q.n;break;}
    through.push({t:q.t,pos:V3.madd(o,d,q.t),normal:q.n,surface:q.c.surf,col:q.c});}}
  if(!kind)return null;const pos=V3.madd(o,d,best);const R={t:best,pos,normal:null,surface:'dirt',actor:null,part:null,col:null,through};
  if(kind===1){R.normal=nrm;R.surface=c.surf;R.col=c;}else if(kind===2){R.normal=this.normalAt(pos[0],pos[2]);R.surface=this.surfaceAt(pos[0],pos[2]);}
  else if(kind===4){R.normal=[0,1,0];R.surface='water';}else{R.actor=ah.actor;R.part=ah.part;R.normal=ah.normal||V3.scale(d,-1);R.surface=ah.surface||'flesh';}
  return R;},
 // línea de visión entre dos puntos (colisionadores que no dejan ver + relieve)
 los(a,b){const d=this._ld,l=Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]);if(l<1e-4)return true;d[0]=(b[0]-a[0])/l;d[1]=(b[1]-a[1])/l;d[2]=(b[2]-a[2])/l;
  if(this._rayCols(a,d,l-0.05,1,null))return false;return this._rayTerrain(a,d,l-0.1)<0;},
 _ld:[0,0,0],
 // ¿hay algo que impida ir andando en línea recta de a a b? (rayo a la altura de la rodilla contra lo que frena el paso)
 _moveBlocked(a,b){const o=this._mo,d=this._md;o[0]=a[0];o[1]=a[1]+0.6;o[2]=a[2];d[0]=b[0]-a[0];d[1]=b[1]-a[1];d[2]=b[2]-a[2];const l=Math.hypot(d[0],d[1],d[2]);if(l<1e-4)return false;
  d[0]/=l;d[1]/=l;d[2]/=l;return !!this._rayCols(o,d,l,2,null);},
 _mo:[0,0,0],_md:[0,0,0],
 // ---------- destruibles ----------
 damage(c,dmg,info){if(!c||!c.hp||c.dead)return false;c.hp-=dmg;if(c.hp>0)return false;this.destroy(c,info);return true;},
 destroy(c,info){if(c.dead)return;c.dead=true;this._hashDel(c);if(c.inst)this._instHide(c.inst);const pos=[c.x,c.y,c.z];
  if(typeof FX!=='undefined'&&FX.impact)FX.impact(pos,[0,1,0],c.surf,3);Bus.emit('destroyed',{col:c,pos});
  if(c.expl&&typeof Weapons!=='undefined'&&Weapons.explode)Weapons.explode([c.x,c.y+0.3,c.z],6,170,info&&info.by,{barrel:true});},
 blast(p,r,dmg,by){const L=this.overlapSphere(p,r,[]);for(const c of L)if(c.hp&&!c.dead){const d=Math.hypot(p[0]-c.x,p[1]-c.y,p[2]-c.z);this.damage(c,dmg*clamp(1.2-d/r,0.2,1),{by});}},
 // ---------- interactuables ----------
 // u: {pos, r (alcance, 1.6), text:{es,en}|cadena, hold (s mantenido; 0 = al pulsar), kind ('mg'|'charge'|'ammo'|...), on, use(player)}
 addUsable(u){u.r=u.r||1.6;u.hold=u.hold||0;if(u.on==null)u.on=true;if(u.pos&&u.pos[1]==null)u.pos[1]=this.height(u.pos[0],u.pos[2]);this.usables.push(u);return u;},
 removeUsable(u){const i=this.usables.indexOf(u);if(i>=0)this.usables.splice(i,1);},
 // ---------- coberturas automáticas: a lo largo de las caras de los colisionadores de 0.85 m o más ----------
 _autoCover(){for(const c of this.cols){if(!c.cov||c.dead||c.see||c.nob||c.nom||c.hy*2<0.8)continue;const top=c.y+c.hy;
   for(let f=0;f<4;f++){const xf=f<2,sg=f%2?-1:1,L=xf?c.hz*2:c.hx*2;if(L<0.6)continue;const n=Math.max(1,Math.floor(L/1.4));
    for(let k=0;k<n;k++){const al=-L/2+(k+0.5)*L/n,lx=xf?sg*(c.hx+0.5):al,lz=xf?al:sg*(c.hz+0.5);
     const px=c.x+c.c*lx+c.s*lz,pz=c.z-c.s*lx+c.c*lz,nx=xf?c.c*sg:c.s*sg,nz=xf?-c.s*sg:c.c*sg;if(!this.inBounds(px,pz,1))continue;
     const g=this.groundAt(px,pz,0.2,top-0.8),ch=top-g;if(ch<0.85||c.y-c.hy>g+0.35)continue;if(this._blocked(px,g,pz,0.3,1.2))continue;
     if(!NAV.walkable(px,pz))continue;this.cover.add([px,g,pz],[nx,0,nz],ch<1.45,c);}}}},
 // ---------- dibujo ----------
 _tx(k){if(k in this.tex)return this.tex[k];let t=null;if(k==='ground')t=GL.tex(Tex.ground(this.kind,1),true);else{const M=W_MAT[k];if(M&&M[0])t=GL.tex(M[0](),true);}return this.tex[k]=t;},
 _cull(){const far=(Env.fogF||500)*1.08*(GFX.G.dist||1),e=Cam.eye,q=this._q;
  for(const [L,v] of [[this.chunkList,this._vis],[this.tList,this._tvis]]){v.length=0;for(const C of L){q[0]=C.cx;q[1]=C.cy;q[2]=C.cz;if(Math.hypot(C.cx-e[0],C.cz-e[2])-C.r>far||!Cam.sphereVisible(q,C.r))continue;v.push(C);}}},
 _q:[0,0,0],
 // pass 'shadow' (programa de profundidad puesto; ci = cascada) | 'main'
 draw(pass,ci){if(!this.built)return;const gl=GL.gl;for(const k in this.inst){const I=this.inst[k];if(I.dirty&&I.n)this._instUp(I);}
  if(pass==='shadow'){const u=GL.progs.depth.u;
   for(const T of this.tList)if(T.y1-T.y0>1.2&&Shadow.near(ci,T.cx,T.cz,T.r))GL.draw(T.m);
   for(const C of this.chunkList){if(!Shadow.near(ci,C.cx,C.cz,C.r))continue;for(const k in C.m)GL.draw(C.m[k]);}
   for(const r of this.dyn)if(r.vis&&r.meshes&&Shadow.near(ci,r.c[0],r.c[2],r.rad)){if(r.M)gl.uniformMatrix4fv(u.uModel,false,r.M);for(const k in r.meshes)GL.draw(r.meshes[k]);if(r.M)gl.uniformMatrix4fv(u.uModel,false,MI);}
   gl.uniform1f(u.uInst,1);for(const k in this.inst){const I=this.inst[k];if(!I.n||!I.m)continue;gl.uniform1f(u.uSway,I.sway*(Env.wind||1));GL.draw(I.m);}
   gl.uniform1f(u.uSway,0);gl.uniform1f(u.uInst,0);return;}
  const p=GL.progs.lit,u=p.u;Lit.setup(p);this._cull();
  const tg=this._tx('ground');gl.uniform1f(u.uUseTex,tg?1:0);gl.bindTexture(gl.TEXTURE_2D,tg);for(const T of this._tvis)GL.draw(T.m);
  for(const mat of W_MATK){const t=this._tx(mat);gl.uniform1f(u.uUseTex,t?1:0);if(t)gl.bindTexture(gl.TEXTURE_2D,t);gl.uniform1f(u.uGloss,mat==='metal'?0.25:0);
   for(const C of this._vis){const m=C.m[mat];if(m)GL.draw(m);}
   for(const r of this.dyn)if(r.vis&&r.meshes&&r.meshes[mat]&&Cam.sphereVisible(r.c,r.rad)){if(r.M)gl.uniformMatrix4fv(u.uModel,false,r.M);GL.draw(r.meshes[mat]);if(r.M)gl.uniformMatrix4fv(u.uModel,false,MI);}}
  gl.uniform1f(u.uInst,1);
  for(const k in this.inst){const I=this.inst[k];if(!I.n||!I.m)continue;const t=this._tx(I.mat);gl.uniform1f(u.uUseTex,t?1:0);if(t)gl.bindTexture(gl.TEXTURE_2D,t);
   gl.uniform1f(u.uGloss,I.gloss);gl.uniform1f(u.uSway,I.sway*(Env.wind||1));GL.draw(I.m);}
  gl.uniform1f(u.uInst,0);gl.uniform1f(u.uSway,0);gl.uniform1f(u.uGloss,0);
  if(this.wm){gl.uniform1f(u.uUseTex,0);gl.uniform1f(u.uWet,1);gl.uniform1f(u.uGloss,0.35);GL.draw(this.wm);gl.uniform1f(u.uWet,0);gl.uniform1f(u.uGloss,0);}
  gl.uniform1f(u.uUseTex,0);},
 // marcas del escenario (cráteres, manchas de sombra en Baja): transparentes, tras Post.grabDepth()
 drawDecals(){if(this.built&&this.decals)this.decals.draw();}
};
// contexto nuevo: lo de la GPU vieja ya no existe (no se borra); Game vuelve a construir el escenario
Bus.on('glRestored',()=>{const W=World;W.tex={};for(const T of W.tList)T.m=null;for(const C of W.chunkList)C.m={};for(const r of W.dyn)r.meshes=null;
 for(const k in W.inst){W.inst[k].m=null;W.inst[k].dirty=true;}W.wm=null;W.decals=null;});

// ---------- constructor de objetos (lo usan los PREFABS): coordenadas locales del objeto, +Z = su frente, +X = su izquierda ----------
const WB={o:null,x:0,y:0,z:0,yaw:0,c:1,s:0,dyn:false,rec:null,M:new Float32Array(16),T:null,rnd:Math.random,cx:0,cz:0,
 begin(o,x,y,z,yaw,dyn){this.o=o;this.x=x;this.y=y;this.z=z;this.yaw=yaw;this.c=Math.cos(yaw);this.s=Math.sin(yaw);this.dyn=dyn;this.cx=x;this.cz=z;
  this.rec={o,id:o.id,cols:[],geos:dyn?{}:null,meshes:null,insts:[],covers:[],vis:true,c:[x,y,z],rad:10};M4.compose([x,y,z],yaw,0,0,1,this.M);
  this.rnd=mulberry32(o.seed||((Math.round(x*7.3)*73856093)^(Math.round(z*5.1)*19349663)^7));},
 end(){const r=this.rec;if(r.id)World.props[r.id]=r;if(this.dyn)World.dyn.push(r);return r;},
 wx(lx,lz){return this.x+this.c*lx+this.s*lz;},wz(lx,lz){return this.z-this.s*lx+this.c*lz;},
 gy(lx,lz){return World.height(this.wx(lx,lz),this.wz(lx,lz))-this.y;}, // suelo bajo un punto local (relativo al origen)
 at(lx,lz){this.cx=this.wx(lx,lz);this.cz=this.wz(lx,lz);}, // cambia el trozo donde va la geometría (objetos grandes o por puntos)
 geo(mat){if(this.dyn)return this.rec.geos[mat]||(this.rec.geos[mat]=new Geo());const C=World._chunkAt(this.cx,this.cz);return C.g[mat]||(C.g[mat]=new Geo());},
 // añade geometría hecha por fn(g) en coordenadas locales; las uv se proyectan en local salvo keepUV
 add(mat,fn,keepUV){const t=this.T||(this.T=new Geo());t.p.length=t.n.length=t.c.length=t.u.length=0;fn(t);if(!t.p.length)return;
  if(!keepUV&&W_MAT[mat][1])t.uvProj(0,W_MAT[mat][1]);this.geo(mat).merge(t,this.M);},
 // caja local alineada: geometría (biselada) + colisionador. opt: {col:false, bev, surf, thin, see, nob, nom, hp, cover:false, vary:false}
 box(x0,x1,y0,y1,z0,z1,mat,col,opt){opt=opt||W_NO;if(x0>x1){const q=x0;x0=x1;x1=q;}if(z0>z1){const q=z0;z0=z1;z1=q;}const cc=hex(col||W_COL[mat]);const b=opt.bev==null?Math.min(0.035,(x1-x0)*0.2,(y1-y0)*0.2,(z1-z0)*0.2):opt.bev;
  if(mat)this.add(mat,g=>{const m=g.mark();if(b>0.004)g.bbox(x0,x1,y0,y1,z0,z1,b,cc);else g.box(x0,x1,y0,y1,z0,z1,cc);if(opt.vary!==false)g.vary(m,this.rnd,0.04);});
  return opt.col===false?null:this.col(x0,x1,y0,y1,z0,z1,opt.surf||W_SURF[mat||'plain'],opt);},
 // caja girada ry dentro del objeto: centro (cx,cz), semiejes hx,hz
 obox(cx,cz,y0,y1,hx,hz,ry,mat,col,opt){opt=opt||W_NO;const cc=hex(col||W_COL[mat]);const b=opt.bev==null?Math.min(0.03,hx*0.3,hz*0.3,(y1-y0)*0.2):opt.bev;
  if(mat)this.add(mat,g=>{if(b>0.004)g.bbox(-hx,hx,y0,y1,-hz,hz,b,cc);else g.box(-hx,hx,y0,y1,-hz,hz,cc);if(opt.vary!==false)g.vary(0,this.rnd,0.04);
   if(W_MAT[mat][1])g.uvProj(0,W_MAT[mat][1]);g.xform(0,rotY(ry,cx,0,cz));},true);
  if(opt.col===false)return null;const c=World._addCol(this.wx(cx,cz),this.y+(y0+y1)/2,this.wz(cx,cz),hx,(y1-y0)/2,hz,this.yaw+ry,opt.surf||W_SURF[mat||'plain'],opt);
  c.prop=this.rec;this.rec.cols.push(c);return c;},
 col(x0,x1,y0,y1,z0,z1,surf,opt){if(x0>x1){const q=x0;x0=x1;x1=q;}if(z0>z1){const q=z0;z0=z1;z1=q;}const cx=(x0+x1)/2,cz=(z0+z1)/2;const c=World._addCol(this.wx(cx,cz),this.y+(y0+y1)/2,this.wz(cx,cz),(x1-x0)/2,(y1-y0)/2,(z1-z0)/2,this.yaw,surf,opt);
  c.prop=this.rec;this.rec.cols.push(c);return c;},
 // instancia de un tipo (W_IGEO); s = escala (número o [x,y,z]); devuelve el asa para destruirla
 inst(type,lx,ly,lz,yaw,s,col){const I=World._instT(type),k=col?hex(col):[1,1,1];s=s==null?1:s;const sx=typeof s==='number'?s:s[0],sy=typeof s==='number'?s:s[1],sz=typeof s==='number'?s:s[2];
  I.d.push(this.wx(lx,lz),this.y+ly,this.wz(lx,lz),this.yaw+(yaw||0),sx,sy,sz,k[0],k[1],k[2]);const h={type,i:I.n++};this.rec.insts.push(h);return h;},
 // punto con nombre (o.id u o.pt como prefijo): World.points['pref.nombre']=[x,y,z,yaw]; ly relativo al origen
 point(name,lx,ly,lz,yaw){const pre=this.o.pt||this.o.id;if(!pre)return null;const p=[this.wx(lx,lz),this.y+ly,this.wz(lx,lz),this.yaw+(yaw||0)];World.points[pre+'.'+name]=p;return p;},
 // fuego o humo persistente que Game enciende al cargar (FX.fire/FX.smoke): kind 'fire'|'smoke', size
 fx(kind,lx,ly,lz,size,opt){World.fxPts.push(Object.assign({kind,pos:[this.wx(lx,lz),this.y+ly,this.wz(lx,lz)],size:size||1},opt||{}));},
 // sub-objeto en coordenadas locales de éste (lx,lz,yaw relativos): comparte registro (colisionadores, instancias)
 sub(o2,lx,lz,yaw,ly){const P=PREFABS[o2.t];if(!P)return;const sv={x:this.x,y:this.y,z:this.z,yaw:this.yaw,c:this.c,s:this.s,cx:this.cx,cz:this.cz,o:this.o,rnd:this.rnd},M=new Float32Array(this.M);
  const x=this.wx(lx,lz),z=this.wz(lx,lz),yw=this.yaw+(yaw||0);this.x=x;this.z=z;this.y=ly!=null?this.y+ly:World.height(x,z);this.yaw=yw;this.c=Math.cos(yw);this.s=Math.sin(yw);this.cx=x;this.cz=z;
  this.o=Object.assign({},o2,{pt:o2.pt||null,id:null});M4.compose([this.x,this.y,this.z],yw,0,0,1,this.M);try{P.build(this,o2);}finally{Object.assign(this,sv);this.M.set(M);}},
 cover(lx,lz,nx,nz,low,ly){const p=[this.wx(lx,lz),0,this.wz(lx,lz)];p[1]=ly!=null?this.y+ly:World.height(p[0],p[2]);
  const c=World.cover.add(p,[this.c*nx+this.s*nz,0,-this.s*nx+this.c*nz],low);this.rec.covers.push(c);return c;},
 // mancha de sombra suave (calidad Baja) y marcas en el suelo
 blob(lx,lz,r,a){World.decals.addGround(this.wx(lx,lz),this.wz(lx,lz),r,0,0,null,a==null?0.5:a,(x,z)=>World.height(x,z),true);},
 mark(lx,lz,r,cell,a,col){World.decals.addGround(this.wx(lx,lz),this.wz(lx,lz),r,this.rnd()*6,cell,col||null,a==null?1:a,(x,z)=>World.height(x,z),false);}
};

// ---------- geometría de los tipos instanciados (tamaño real; escala por instancia) ----------
const W_IGEO={
 pine(){const g=new Geo(),r=mulberry32(11);g.lathe([[0.3,0],[0.22,2],[0.12,7],[0,9.6]],6,hex('#5a4330'));const P=['#2f4f2a','#36592f','#2b4626'].map(hex);
  for(let i=0;i<4;i++){const m=g.mark(),y0=2.1+i*1.85,rr=2.7-i*0.52;g.cyl(rr,0,y0,y0+3.3-i*0.3,8,P[i%3]);g.xform(m,rotY(r()*3));}g.vary(0,r,0.07);return {g,sway:0.0028};},
 snowy(){const D=W_IGEO.pine(),g=D.g,s=hex('#e8eef4');for(let i=0;i<g.n.length;i+=9){const ny=(g.n[i+1]+g.n[i+4]+g.n[i+7])/3,isT=g.c[i]>0.3;if(ny>0.3&&!isT)for(let j=0;j<9;j+=3){g.c[i+j]=s[0];g.c[i+j+1]=s[1];g.c[i+j+2]=s[2];}}return D;},
 oak(){const g=new Geo(),r=mulberry32(5),bark=hex('#5d4630');g.lathe([[0.45,0],[0.36,1.4],[0.28,3.4],[0.16,5.2]],7,bark);
  for(const [x,y,z] of [[1.6,4.6,0.4],[-1.3,4.9,-0.8],[0.2,5.2,1.5],[-0.4,5.4,-1.6]])g.tube([0,3,0],[x,y,z],0.16,0.09,5,bark);
  const P=['#3d6a2e','#4b7a36','#355f29','#44702f'].map(hex);
  [[0,6.2,0,2.6],[1.7,5.5,0.6,2],[-1.6,5.7,-0.6,2.1],[0.3,5.4,1.8,1.9],[-0.4,5.8,-1.9,1.9],[0.2,7.4,-0.2,1.9]].forEach(([cx,cy,cz,cr],i)=>{const m=g.mark();g.ico(1,P[i%4]);
   g.xform(m,(v,n)=>n?[v[0]/cr,v[1]/(cr*0.82),v[2]/cr]:[v[0]*cr+cx,v[1]*cr*0.82+cy,v[2]*cr+cz]);});g.vary(0,r,0.07);return {g,sway:0.0035};},
 bare(){const g=new Geo(),r=mulberry32(9),bark=hex('#5b5048');g.lathe([[0.32,0],[0.25,2],[0.16,5],[0.05,8]],6,bark);
  for(let i=0;i<7;i++){const a=i*2.4+r(),y=2.6+i*0.7,l=1.6+r()*1.6,e=[Math.sin(a)*l,y+1.2+r()*1.4,Math.cos(a)*l];g.tube([0,y,0],e,0.1,0.03,4,bark);
   g.tube(e,[e[0]*1.3+r()-0.5,e[1]+0.9,e[2]*1.3+r()-0.5],0.03,0.012,3,bark);}g.vary(0,r,0.05);return {g,sway:0.0018};},
 crate(){const g=new Geo(),w=hex('#a08458'),dk=hex('#86704a');g.bbox(-0.5,0.5,0,1,-0.5,0.5,0.03,w);
  for(const s of [-1,1]){g.box(-0.5,0.5,0.04,0.14,s*0.5-0.02,s*0.5+0.02,dk);g.box(-0.5,0.5,0.86,0.96,s*0.5-0.02,s*0.5+0.02,dk);g.box(s*0.5-0.02,s*0.5+0.02,0.04,0.14,-0.5,0.5,dk);g.box(s*0.5-0.02,s*0.5+0.02,0.86,0.96,-0.5,0.5,dk);}
  g.uvProj(0,1);return {g,mat:'wood'};},
 barrel(){const g=new Geo();g.lathe([[0,0],[0.3,0],[0.3,0.06],[0.285,0.1],[0.3,0.45],[0.285,0.5],[0.3,0.84],[0.3,0.88],[0,0.88]],12,[1,1,1]);g.uvProj(0,1.5);return {g,mat:'metal',gloss:0.35};},
 bag(){const g=new Geo();g.sandbag(0.62,0.34,0.2,[1,1,1]);g.uvProj(0,2.2);return {g,mat:'sand'};},
 hedgehog(){const g=new Geo(),c=[1,1,1];g.beam([-0.95,0.02,0],[0.95,1.45,0],0.15,0.15,c);g.beam([0.95,0.02,0],[-0.95,1.45,0],0.15,0.15,c);g.beam([0,0.02,-0.95],[0,1.45,0.95],0.15,0.15,c);return {g,mat:'metal',gloss:0.3};},
 rock(){const g=new Geo(),r=mulberry32(3);g.ico(1,[1,1,1]);const m=g.mark();
  for(let i=0;i<g.p.length;i+=3){const k=0.82+0.3*vnoise(g.p[i]*2+5,g.p[i+2]*2+g.p[i+1],7);g.p[i]*=k;g.p[i+1]*=k;g.p[i+2]*=k;}
  for(let i=0;i<g.p.length;i+=9){const a=[g.p[i],g.p[i+1],g.p[i+2]],b=[g.p[i+3],g.p[i+4],g.p[i+5]],c=[g.p[i+6],g.p[i+7],g.p[i+8]],n=V3.norm(V3.cross(V3.sub(b,a),V3.sub(c,a)));
   if(V3.dot(n,a)<0)V3.scale(n,-1,n);for(let j=0;j<9;j+=3){g.n[i+j]=n[0];g.n[i+j+1]=n[1];g.n[i+j+2]=n[2];}}g.vary(m,r,0.08);g.uvProj(0,0.8);return {g,mat:'stone'};}
};

// ---------- tipos instanciados de la fase 2 (misiones) ----------
Object.assign(W_IGEO,{
 // almiar redondo de paja
 hay(){const g=new Geo(),r=mulberry32(21);g.lathe([[1.25,0],[1.35,0.5],[1.28,1.2],[1.0,1.9],[0.55,2.4],[0.12,2.65],[0,2.7]],10,i=>mixC('#c9a85a','#a88a48',i/6));g.vary(0,r,0.08);g.uvProj(0,1.4);return {g,mat:'plain'};},
 // paca de paja
 bale(){const g=new Geo(),r=mulberry32(22);g.rbox(-0.55,0.55,0,0.5,-0.3,0.3,0.06,hex('#c4a55a'),2,0.02);for(const x of [-0.25,0.25])g.box(x-0.015,x+0.015,-0.002,0.502,-0.305,0.305,hex('#7a6a40'));g.vary(0,r,0.07);return {g,mat:'plain'};},
 // tronco astillado por la artillería (sin copa) y tocón
 split(){const g=new Geo(),r=mulberry32(23),bark=hex('#4e3f31'),wood=hex('#cdb48a');g.lathe([[0.36,0],[0.3,1.5],[0.26,3.2],[0.24,4.2]],7,bark);
  for(let i=0;i<6;i++){const a=i/6*6.28+r(),x=Math.sin(a)*0.16,z=Math.cos(a)*0.16;g.tube([x,4.1,z],[x*1.6+(r()-0.5)*0.2,4.6+r()*1.3,z*1.6+(r()-0.5)*0.2],0.1,0.01,4,i%2?wood:bark);}
  g.tube([0,2.6,0],[1.4,3.6,0.4],0.12,0.03,5,bark);g.tube([0,3.4,0],[-1.1,4.1,-0.6],0.09,0.02,5,bark);g.vary(0,r,0.06);return {g,sway:0.0006};},
 stump(){const g=new Geo(),r=mulberry32(24);g.lathe([[0.42,0],[0.34,0.3],[0.3,0.75]],7,hex('#4e3f31'));g.cyl(0.3,0.0,0.75,0.95,7,hex('#cdb48a'));g.vary(0,r,0.06);return {g};},
 // tronco caído (a lo largo de X)
 log(){const g=new Geo(),r=mulberry32(25);g.tube([-2.2,0.3,0],[2.2,0.28,0],0.3,0.24,7,hex('#54432f'),hex('#b89c70'));g.tube([0.8,0.4,0],[1.6,0.9,0.5],0.08,0.03,4,hex('#54432f'));g.vary(0,r,0.06);return {g};},
 // chopo: alto y estrecho (filas junto a los caminos)
 poplar(){const g=new Geo(),r=mulberry32(26),bark=hex('#6a6050');g.lathe([[0.28,0],[0.2,3],[0.1,9],[0.04,13]],6,bark);const P=['#4d6a32','#5a7838','#46622d'].map(hex);
  for(let i=0;i<7;i++){const m=g.mark(),y=3.5+i*1.35,s=1.5-Math.abs(i-2.6)*0.22;g.ico(1,P[i%3]);g.xform(m,(v,n)=>n?[v[0]/s,v[1]/(s*1.6),v[2]/s]:[v[0]*s+(r()-0.5)*0.4,v[1]*s*1.6+y,v[2]*s+(r()-0.5)*0.4]);}g.vary(0,r,0.08);return {g,sway:0.002};},
 // matorral bajo (verde) y nevado
 bush(){const g=new Geo(),r=mulberry32(27),P=['#3f5f2b','#4b6d31','#567a38'].map(hex);for(let i=0;i<4;i++){const m=g.mark(),s=0.55+r()*0.4;g.ico(1,P[i%3]);
   g.xform(m,(v,n)=>n?[v[0]/s,v[1]/(s*0.75),v[2]/s]:[v[0]*s+(r()-0.5)*1.1,v[1]*s*0.75+s*0.55,v[2]*s+(r()-0.5)*1.1]);}g.vary(0,r,0.1);return {g,sway:0.004};},
 sbush(){const D=W_IGEO.bush(),g=D.g,s=hex('#e6ebf0');for(let i=0;i<g.n.length;i+=9){if((g.n[i+1]+g.n[i+4]+g.n[i+7])/3>0.35)for(let j=0;j<9;j+=3){g.c[i+j]=s[0];g.c[i+j+1]=s[1];g.c[i+j+2]=s[2];}}return D;},
 // mata de hierba (blanca: el color va por instancia)
 tuft(){const g=new Geo(),r=mulberry32(28),lo=[0.55,0.55,0.5],hi=[1.05,1.05,1];for(let i=0;i<7;i++){const a=i/7*6.28+r()*0.6,l=0.25+r()*0.35,x=Math.sin(a)*0.12,z=Math.cos(a)*0.12,tx=x+Math.sin(a)*l*0.6,tz=z+Math.cos(a)*l*0.6,w=0.05;
   const p0=[x-Math.cos(a)*w,0,z+Math.sin(a)*w],p1=[x+Math.cos(a)*w,0,z-Math.sin(a)*w],p2=[tx,l,tz];g.tri(p0,p1,p2,lo,false);g.tri(p1,p0,p2,lo,false);
   const n=g.c.length;for(const k of [n-12,n-3])for(let j=0;j<3;j++)g.c[k+j]=hi[j];}return {g,sway:0.05};},
 // diana de tiro: dos postes y un tablero con silueta y anillos
 target(){const g=new Geo(),post=hex('#6a5038'),paper=hex('#d9cfb4'),ink=hex('#2c2a26'),red=hex('#a8382c');for(const s of [-1,1])g.box(s*0.42-0.04,s*0.42+0.04,0,1.55,-0.04,0.04,post);
  g.box(-0.45,0.45,0.42,1.52,0.0,0.05,paper);g.box(-0.2,0.2,0.55,1.1,0.05,0.07,ink);const m=g.mark();g.cyl(0.13,0.13,0,0.02,10,ink);g.xform(m,rotX(Math.PI/2,0,1.24,0.06));
  for(const [rr,c] of [[0.34,ink],[0.25,paper],[0.16,ink],[0.08,red]]){const k=g.mark();g.cyl(rr,rr,0,0.004,14,c);g.xform(k,rotX(-Math.PI/2,0,0.95,0.075+(0.34-rr)*0.04));}return {g};},
 // obstáculos de playa: estaca inclinada con mina y rampa de troncos
 stake(){const g=new Geo(),w=hex('#5a4a38'),mn=hex('#4a4c44');g.tube([0,-0.4,-0.9],[0,2.0,0.9],0.13,0.11,6,w);g.tube([0,-0.3,0.6],[0,1.2,0.35],0.08,0.08,5,w);const m=g.mark();g.cyl(0.17,0.17,0,0.09,10,mn);g.xform(m,rotX(0.92,0,1.92,0.84));return {g};},
 logramp(){const g=new Geo(),w=hex('#584836');g.tube([0,-0.2,-2.4],[0,1.9,1.6],0.15,0.13,6,w);for(const s of [-1,1])g.tube([s*0.6,-0.3,1.2],[0,1.75,1.45],0.1,0.1,5,w);g.tube([0,-0.3,1.1],[0,1.2,0.4],0.1,0.1,5,w);return {g};}
});

// ---------- PREFABS: objetos de escenario por datos {t:'tipo', x, z, yaw, ...} (ver DESIGN). mods(o,lista) = modificadores del relieve ----------
const PREFABS={
 // caja genérica {w,h,d,mat,col,surf}
 box:{build(B,o){const w=o.w||1,h=o.h||1,d=o.d||1,y0=o.y0||0;B.box(-w/2,w/2,y0,y0+h,-d/2,d/2,o.mat||'plain',o.col,{surf:o.surf,thin:o.thin,see:o.see,cover:o.cover});}},
 // muro recto {len, h, th, mat, col}
 wall:{build(B,o){const L=o.len||6,h=o.h||2.2,t=o.th||0.35,mat=o.mat||'brick',g0=Math.min(B.gy(-L/2,0),B.gy(L/2,0),0)-0.35;B.box(-L/2,L/2,g0,h,-t/2,t/2,mat,o.col);
  if(mat!=='wood'&&o.cap!==false)B.box(-L/2-0.03,L/2+0.03,h,h+0.08,-t/2-0.05,t/2+0.05,'stone',mixC(o.col||W_COL[mat],'#9a9890',0.5),{col:false});}},
 // muro en ruinas {len, h, th, mat}
 ruin:{build(B,o){const L=o.len||6,h=o.h||2.6,t=o.th||0.45,mat=o.mat||'stone',n=Math.max(2,Math.round(L/0.9)),g0=Math.min(B.gy(-L/2,0),B.gy(L/2,0),0)-0.35,r=B.rnd;
  for(let i=0;i<n;i++){const a=-L/2+L*i/n,b=a+L/n,k=0.22+0.78*Math.pow(r(),0.7);B.box(a,b+0.01,g0,Math.max(0.5,h*k),-t/2,t/2,mat,o.col,{bev:0.07});}
  PREFABS.rubble.build(B,{r:L*0.3,n:Math.round(L*1.5),mat,col:o.col,off:[0,t/2+0.5]});}},
 // escombros {r, n, mat}: bloques sueltos (colisionador bajo si el montón es grande)
 rubble:{build(B,o){const R=o.r||1.5,n=o.n||8,mat=o.mat||'stone',col=hex(o.col||W_COL[mat]),r=B.rnd,ox=o.off?o.off[0]:0,oz=o.off?o.off[1]:0;
  B.add(mat,g=>{for(let i=0;i<n;i++){const a=r()*6.28,d=Math.sqrt(r())*R,x=ox+Math.sin(a)*d,z=oz+Math.cos(a)*d,s=0.12+r()*0.3,m=g.mark(),y=B.gy(x,z);
   g.bbox(-s,s,-s*0.5,s*0.7,-s*0.7,s*0.7,s*0.2,mixC(col,'#4a4640',r()*0.4));g.xform(m,rotY(r()*6,x,y,z));}});
  if(R>=1.2)B.col(ox-R*0.6,ox+R*0.6,B.gy(ox,oz)-0.3,B.gy(ox,oz)+0.35,oz-R*0.6,oz+R*0.6,'stone',{cover:false});}},
 // casa {w, d, h (alto de cada planta), storeys (1|2), th, mat, col, roofCol, roof:'gable'|'flat'|'none', pitch, doors:[{side,at,w,h}], windows:[{side,at,w,y0,y1}],
 //  ruined, burnt (quemada: paredes con hollín, techo hundido, fuegos), lit (0..1: ventanas encendidas de noche), shutters, furnish, chimney, pt (prefijo de puntos)}
 // lados: 0 frente (+Z), 1 izquierda (+X), 2 detrás (-Z), 3 derecha (-X); at = posición a lo largo del lado. Puntos: door, in, up (planta alta), w0.. (ventanas altas)
 house:{build(B,o){const w=o.w||8,d=o.d||6,S=o.storeys||1,h=o.h||(S>1?2.8:3),H=h*S,t=o.th||0.32,mat=o.mat||'plaster',r=B.rnd,ru=!!o.ruined,bu=!!o.burnt;
  let col=hex(o.col||W_COL[mat]);if(bu)col=mixC(col,'#38302a',0.4);
  const cs=[B.gy(-w/2,-d/2),B.gy(w/2,-d/2),B.gy(w/2,d/2),B.gy(-w/2,d/2),B.gy(0,0)],fy=Math.max(...cs)+0.15,by=Math.min(...cs)-0.5;
  B.box(-w/2-0.06,w/2+0.06,by,fy-0.05,-d/2-0.06,d/2+0.06,'stone','#8f887a',{col:false,bev:0.03});
  B.col(-w/2,w/2,by,fy,-d/2,d/2,'wood',{cover:false});B.box(-w/2+t,w/2-t,fy-0.06,fy,-d/2+t,d/2-t,'wood',bu?'#3a3029':'#7a5f43',{col:false,bev:0});
  const doors=o.doors||[{side:0,at:0}],wins=o.windows||[...(w>=6?[{side:0,at:-w*0.3},{side:0,at:w*0.3}]:[]),{side:1,at:0},{side:3,at:0},{side:2,at:w>=7?-w*0.22:0},...(w>=7?[{side:2,at:w*0.22}]:[])];
  const ops=[[],[],[],[]];for(const q of doors)ops[q.side||0].push({at:q.at||0,w:q.w||1.3,y0:0,y1:q.h||2.2,door:true});
  for(let k=0;k<S;k++)for(const q of wins){if(k&&q.ground)continue;ops[q.side||0].push({at:q.at||0,w:q.w||1.1,y0:(q.y0||0.95)+k*h,y1:Math.min((q.y1||2.15)+k*h,(k+1)*h-0.25),k});}
  const shut=hex(o.shutters||['#5d6b4a','#6b4a3a','#4a5a6b','#7a6a48'][(r()*4)|0]),fr=hex(bu?'#1c1916':'#4a3a2a'),glowP=o.lit===true?0.6:o.lit||0,soot=hex('#24201d');let wi=0;
  if(o.pt||o.id){const ds=doors[0],sd=ds.side||0,at=ds.at||0,dz=sd===0?d/2+0.9:sd===2?-d/2-0.9:0,dx=sd===1?w/2+0.9:sd===3?-w/2-0.9:0;
   B.point('door',sd%2?dx:at,fy+0.02,sd%2?at:dz,sd===0?0:sd===2?Math.PI:sd===1?Math.PI/2:-Math.PI/2);B.point('in',0,fy+0.02,0);if(S>1)B.point('up',0,fy+h+0.08,0);}
  for(let s=0;s<4;s++){const ev=s%2===0,L=ev?w:d-2*t,a0=-L/2,p=(s===0?d/2:s===1?w/2:s===2?-d/2:-w/2)+(s<2?-t/2:t/2),out=s<2?1:-1;
   const bx=(a,b,y0,y1,m,c,op)=>ev?B.box(a,b,fy+y0,fy+y1,p-t/2,p+t/2,m,c,op):B.box(p-t/2,p+t/2,fy+y0,fy+y1,a,b,m,c,op);
   const piece=(a,b,y0,y1)=>{if(b-a<0.04||y1-y0<0.04)return;if(!ru||y0>0){if(!ru)bx(a,b,y0,y1,mat,col);else if(r()<0.5&&y0<h*1.2)bx(a,b,y0,Math.min(y1,y0+h*0.8*r()+0.3),mat,col);return;}
    const n=Math.max(1,Math.round((b-a)/0.9));for(let i=0;i<n;i++){const k=0.3+0.7*Math.pow(r(),0.6);bx(a+(b-a)*i/n,a+(b-a)*(i+1)/n+0.01,y0,Math.max(0.6,Math.min(y1,h*1.1)*k),mat,col,{bev:0.06});}};
   const L2=ops[s].sort((a,b)=>a.at-b.at||a.y0-b.y0);let cur=a0;
   // columnas de huecos: las ventanas de varias plantas en el mismo sitio comparten columna
   const cols=[];for(const q of L2){const c=cols.find(c=>Math.abs(c.at-q.at)<0.05&&Math.abs(c.w-q.w)<0.05);if(c)c.q.push(q);else cols.push({at:q.at,w:q.w,q:[q]});}
   for(const C of cols){const a=C.at-C.w/2,b=C.at+C.w/2;piece(cur,a,0,H);let y=0;for(const q of C.q.sort((x,y)=>x.y0-y.y0)){piece(a,b,y,q.y0);y=q.y1;}piece(a,b,y,H);cur=b;
    if(ru)continue;
    for(const q of C.q){const fz=p+out*(t/2+0.025),fb=(a1,b1,y0,y1,c,op)=>ev?B.box(a1,b1,fy+y0,fy+y1,fz-0.03,fz+0.03,'wood',c,Object.assign({col:false,bev:0},op)):B.box(fz-0.03,fz+0.03,fy+y0,fy+y1,a1,b1,'wood',c,Object.assign({col:false,bev:0},op));
     fb(a-0.08,a,q.y0,q.y1,fr);fb(b,b+0.08,q.y0,q.y1,fr);fb(a-0.08,b+0.08,q.y1,q.y1+0.08,fr);
     if(!q.door){fb(a-0.1,b+0.1,q.y0-0.07,q.y0,fr);if(o.shutters!==false&&!bu){fb(a-q.w*0.5-0.1,a-0.1,q.y0,q.y1,shut);if(r()<0.85)fb(b+0.1,b+q.w*0.5+0.1,q.y0,q.y1,shut);}
      // ventana encendida (emisiva) o, en las quemadas, resplandor del fuego y hollín encima
      const g=bu?(q.k===0&&r()<0.75?[2.6,1.15,0.32]:null):glowP&&r()<glowP?[2.1,1.45,0.62]:null;
      if(g)ev?B.box(a,b,fy+q.y0,fy+q.y1,p-0.03,p+0.03,'plain',g,{col:false,bev:0,vary:false}):B.box(p-0.03,p+0.03,fy+q.y0,fy+q.y1,a,b,'plain',g,{col:false,bev:0,vary:false});
      if(bu){const sz=p+out*(t/2+0.012);B.add('plain',G=>{const k=out*(ev?1:1);if(ev)G.quad([a-0.15,fy+q.y1+0.05,sz],[b+0.15,fy+q.y1+0.05,sz],[b+0.05,fy+q.y1+1.1,sz],[a-0.05,fy+q.y1+1.1,sz],soot,[0,fy,p-k]);
        else G.quad([sz,fy+q.y1+0.05,a-0.15],[sz,fy+q.y1+0.05,b+0.15],[sz,fy+q.y1+1.1,b+0.05],[sz,fy+q.y1+1.1,a-0.05],soot,[p-k,fy,0]);});}
      if(q.k>0&&(o.pt||o.id)){const ix=ev?q.at:p-out*0.75,iz=ev?p-out*0.75:q.at;B.point('w'+(wi++),ix,fy+h*q.k+0.08,iz,s===0?0:s===2?Math.PI:s===1?Math.PI/2:-Math.PI/2);}}
     else{const sy=fy-B.gy(ev?q.at:p+out*0.6,ev?p+out*0.6:q.at);if(sy>0.3)ev?B.box(a,b,fy-sy-0.2,fy-sy/2,p+out*(t/2),p+out*(t/2+0.5),'stone','#8f887a'):B.box(p+out*(t/2),p+out*(t/2+0.5),fy-sy-0.2,fy-sy/2,a,b,'stone','#8f887a');}}}
   piece(cur,a0+L,0,H);}
  if(ru){PREFABS.rubble.build(B,{r:Math.min(w,d)*0.35,n:14,mat,col});const nb=2+((r()*3)|0);
   B.add('wood',g=>{for(let i=0;i<nb;i++){const x=(r()-0.5)*w*0.6,z=(r()-0.5)*d*0.6,a=r()*6;g.beam([x,fy+0.1,z],[x+Math.sin(a)*2.6,fy+0.6+r()*1.6,z+Math.cos(a)*2.6],0.18,0.18,hex('#2f2924'));}});return;}
  // plantas altas: forjado de madera con colisionador (se puede estar arriba)
  for(let k=1;k<S;k++)B.box(-w/2+t,w/2-t,fy+k*h-0.16,fy+k*h+0.06,-d/2+t,d/2-t,'wood',bu?'#2e2622':'#6a5038',{bev:0,cover:false});
  // muebles: una mesa, sillas y un aparador (cobertura dentro)
  if(o.furnish!==false&&w*d>30){const tx=(r()-0.5)*(w-3.4),tz=(r()-0.5)*(d-3.4),wc=bu?'#2a2420':'#6e5236';B.box(tx-0.7,tx+0.7,fy,fy+0.76,tz-0.45,tz+0.45,'wood',wc,{cover:false});
   for(const sx of [-1,1])B.box(tx+sx*0.95-0.2,tx+sx*0.95+0.2,fy,fy+0.45,tz-0.2,tz+0.2,'wood',wc,{col:false});
   B.box(-w/2+t+0.05,-w/2+t+0.55,fy,fy+1.5,-0.7,0.7,'wood',bu?'#241e1a':'#5e4430');
   if(mat==='stone'||mat==='brick'){B.box(w/2-t-0.45,w/2-t,fy,fy+1.1,-0.75,0.75,'stone','#7d766a',{col:false});B.box(w/2-t-0.42,w/2-t-0.05,fy,fy+0.75,-0.45,0.45,'plain',bu?[0.05,0.04,0.03]:[0.12,0.1,0.09],{col:false,bev:0});}}
  const y0=fy+H;
  if(bu){// techo hundido: vigas quemadas, medio tejado y fuego dentro
   const rc=hex(o.roofCol||W_COL.roof),alongX=w>=d,Lr=alongX?w:d,D=alongX?d:w,pk=o.pitch||0.72,ry=y0+D/2*pk,bc=hex('#2b2420');
   B.add('wood',g=>{g.beam([-Lr/2,ry-0.1,0],[Lr*0.15,ry-0.5,0],0.2,0.2,bc);const n=Math.max(3,Math.round(Lr/1.4));for(let i=0;i<n;i++){const x=-Lr/2+0.3+i*(Lr-0.6)/(n-1);if(r()<0.3)continue;
    for(const sg of [-1,1])if(r()<0.8){const dr=r()<0.25?1.2:0;g.beam([x,ry-0.15-dr,0],[x,y0-0.1-dr*0.4,sg*(D/2+0.3)],0.13,0.13,bc);}}if(!alongX)g.xform(0,rotY(Math.PI/2));});
   B.add('roof',g=>{const X=Lr/2+0.35,ez=D/2+0.45,ey=y0-0.45*pk,k0=-X,k1=-X+Lr*(0.35+r()*0.25);g.quad([k0,ey,ez],[k1,ey,ez],[k1,ry,0],[k0,ry,0],mixC(rc,'#2a221d',0.35),[0,y0-5,0]);
    g.quad([k0,ey-0.12,ez],[k1,ey-0.12,ez],[k1,ry-0.12,0],[k0,ry-0.12,0],mixC(rc,'#1a1512',0.6),[0,ry+5,0]);if(!alongX)g.xform(0,rotY(Math.PI/2));},true);
   B.add(mat,g=>{for(const sx of [-1,1])for(const xo of [Lr/2,Lr/2-t]){g.tri([sx*xo,y0,-D/2],[sx*xo,y0,D/2],[sx*xo,ry-0.08,0],col,[0,y0,0]);}if(!alongX)g.xform(0,rotY(Math.PI/2));});
   B.fx('fire',(r()-0.5)*w*0.3,fy-B.y+0.2,(r()-0.5)*d*0.3,1.5);B.fx('fire',(r()-0.5)*w*0.4,y0-B.y-0.3,(r()-0.5)*d*0.3,1.1);B.fx('smoke',0,ry-B.y+0.5,0,2.6,{col:[0.16,0.15,0.14],rate:5,life:9});
   B.add('plain',g=>{for(let i=0;i<5;i++){const x=(r()-0.5)*(w-1.5),z=(r()-0.5)*(d-1.5),m=g.mark();g.ico(0.3+r()*0.3,[2.2,0.7+r()*0.3,0.15]);g.scale(m,1,0.35,1);g.translate(m,x,fy+0.05,z);}});return;}
  B.box(-w/2+t,w/2-t,y0-0.08,y0,-d/2+t,d/2-t,'plaster','#cfc8b8',{col:false,bev:0});
  if(o.roof==='none')return;if(o.roof==='flat'){B.box(-w/2-0.2,w/2+0.2,y0,y0+0.3,-d/2-0.2,d/2+0.2,'concrete','#8e8b82');return;}
  const alongX=w>=d,Lr=alongX?w:d,D=alongX?d:w,ov=0.45,pk=o.pitch||0.72,ry=y0+D/2*pk,ey=y0-ov*pk,rc=hex(o.roofCol||W_COL.roof),gc=col,tt=0.14;
  const rot=(g,m)=>{if(!alongX)g.xform(m,rotY(Math.PI/2));};
  B.add('roof',g=>{const X=Lr/2+0.35;for(const sg of [-1,1]){const ez=sg*(D/2+ov),A=[-X,ey,ez],Bq=[X,ey,ez],C=[X,ry,0],E=[-X,ry,0],sl=Math.hypot(D/2+ov,ry-ey),k=0.75;
    const uv=[-X*k,sl*0.9,X*k,sl*0.9,X*k,0,-X*k,0];g.quad(A,Bq,C,E,rc,[0,y0-5,0],uv);
    const A2=[-X,ey-tt,ez],B2=[X,ey-tt,ez],C2=[X,ry-tt,0],E2=[-X,ry-tt,0];g.quad(A2,B2,C2,E2,mixC(rc,'#3a2a20',0.4),[0,ry+5,0],uv);
    g.quad(A,Bq,B2,A2,mixC(rc,'#3a2a20',0.3),[0,ey,0]);}
   g.beam([-X,ry+0.02,0],[X,ry+0.02,0],0.22,0.14,mixC(rc,'#3a2a20',0.25));rot(g,0);},true);
  B.add(mat,g=>{for(const sx of [-1,1])for(const xo of [Lr/2,Lr/2-t]){g.tri([sx*xo,y0,-D/2],[sx*xo,y0,D/2],[sx*xo,ry-0.08,0],gc,[0,y0,0]);}rot(g,0);});
  B.col(-w/2,w/2,y0-0.08,ry-0.3,-d/2,d/2,'stone',{cover:false});
  if(o.chimney!==false){const cx=alongX?Lr*0.28:0,cz=alongX?0:Lr*0.28;B.box(cx-0.3,cx+0.3,y0+D*0.2,ry+0.9,cz-0.3,cz+0.3,'brick','#8a6050',{col:false});
   if(o.smoke)B.fx('smoke',cx,ry+1-B.y,cz,0.5,{col:[0.5,0.5,0.5],rate:2,life:7});}}},
 // sacos terreros {len, rows} rectos o en arco {r, a0, a1, rows} (ángulos desde el frente del objeto, +Z)
 sandbags:{build(B,o){const rows=o.rows||3,bh=0.19,col=hex(o.col||'#b5a274'),r=B.rnd,segs=[];
  if(o.r){const a0=o.a0!=null?o.a0:-0.9,a1=o.a1!=null?o.a1:0.9,arc=Math.abs(a1-a0)*o.r,n=Math.max(1,Math.round(arc/1.5));
   for(let i=0;i<n;i++){const a=a0+(a1-a0)*(i+0.5)/n;segs.push([Math.sin(a)*o.r,Math.cos(a)*o.r,arc/n+0.08,a]);}}else segs.push([0,0,o.len||4,0]);
  for(const [cx,cz,len,ry] of segs){const ax=Math.cos(ry),az=-Math.sin(ry),nb=Math.max(1,Math.round(len/0.58));let gmin=1e9,gmax=-1e9;
   for(let l=0;l<rows;l++){const n=nb-(l%2&&nb>1?1:0),sh=l%2?len/nb/2:0;for(let k=0;k<n;k++){const t=-len/2+(k+0.5)*len/nb+sh,x=cx+ax*t,z=cz+az*t,g=B.gy(x,z);gmin=Math.min(gmin,g);gmax=Math.max(gmax,g);
     const v=0.84+r()*0.18;B.inst('bag',x,g+l*bh-0.02,z,ry+(r()-0.5)*0.12,[1+(r()-0.5)*0.1,1,1],[col[0]*v,col[1]*v,col[2]*v]);}}
   B.obox(cx,cz,gmin-0.2,gmax+rows*bh-0.02,len/2,0.2,ry,null,null,{surf:'sand'});}}},
 // cajas de madera {s, n}: destruibles, la bala las atraviesa
 crate:{build(B,o){const s=o.s||1,n=o.n||1,r=B.rnd,P=[[0,0,0],[s*1.05,0,0.1],[0.1,s,0.05],[s*0.5,0,-s*1.05]];
  for(let i=0;i<Math.min(n,4);i++){const [x,y0,z]=P[i],yw=(r()-0.5)*0.4,g=B.gy(x,z)+y0,h=B.inst('crate',x,g,z,yw,s);
   const c=B.obox(x,z,g,g+s,s/2,s/2,yw,null,null,{surf:'wood',thin:true,hp:o.hp||60,cover:i===0});c.inst=h;if(i===0)B.blob(x,z,s*0.9,0.45);}}},
 // barril {explosive}
 barrel:{build(B,o){const g=B.gy(0,0),ex=!!o.explosive,h=B.inst('barrel',0,g,0,B.rnd()*6,1,ex?'#8a2a1e':(o.col||'#4f5a35'));
  const c=B.col(-0.3,0.3,g,g+0.88,-0.3,0.3,'metal',{hp:ex?25:90,expl:ex,cover:false});c.inst=h;B.blob(0,0,0.5,0.4);}},
 // valla de madera {len}
 fence:{build(B,o){const L=o.len||6,n=Math.max(1,Math.round(L/2.2)),wc=hex(o.col||'#7a6448'),r=B.rnd;
  B.add('wood',g=>{for(let i=0;i<=n;i++){const x=-L/2+L*i/n,y=B.gy(x,0),m=g.mark();g.box(-0.06,0.06,y-0.3,y+1.2,-0.06,0.06,wc);g.vary(m,r,0.06);g.translate(m,x,0,0);}
   for(let i=0;i<n;i++){const xa=-L/2+L*i/n,xb=xa+L/n,ya=B.gy(xa,0),yb=B.gy(xb,0);for(const hy of [0.45,0.95]){g.beam([xa,ya+hy,0.08],[xb,yb+hy,0.08],0.04,0.12,wc);}}});
  B.col(-L/2,L/2,Math.min(B.gy(-L/2,0),B.gy(L/2,0))-0.2,Math.max(B.gy(-L/2,0),B.gy(L/2,0))+1.1,-0.1,0.1,'wood',{thin:true,see:true,cover:false});}},
 // seto de bocage sobre talud {len, h, th}
 hedge:{build(B,o){const L=o.len||8,h=o.h||3.4,t=o.th||2,r=B.rnd,P=['#3b5a2a','#46692f','#334f25','#52713a'].map(hex),g0=Math.min(B.gy(-L/2,0),B.gy(L/2,0),B.gy(0,0));
  B.add('dirt',g=>{g.rbox(-L/2,L/2,g0-0.4,g0+0.9,-t/2-0.2,t/2+0.2,0.5,hex('#6b5a42'),3,0.15);});
  B.add('plain',g=>{const n=Math.max(2,Math.round(L/1.3));for(let i=0;i<n;i++)for(let k=0;k<3;k++){const x=-L/2+L*(i+0.5)/n+(r()-0.5)*0.8,y=g0+0.9+k*(h-1.2)/2.3+r()*0.4,z=(r()-0.5)*t*0.5,s=0.9+r()*0.6,m=g.mark();
   g.ico(1,P[(r()*4)|0]);g.xform(m,(v,isN)=>isN?[v[0]/s,v[1]/(s*0.85),v[2]/(s*0.8)]:[v[0]*s+x,v[1]*s*0.85+y,v[2]*s*0.8+z]);}g.vary(0,r,0.08);});
  B.col(-L/2,L/2,g0-0.5,g0+h,-t/2,t/2,'grass');}},
 // árbol {kind:'pine'|'oak'|'bare'|'snowy', s}
 // árbol {kind:'pine'|'oak'|'bare'|'snowy'|'poplar'|'split' (astillado)|'stump'|'bush'|'sbush', s}
 tree:{build(B,o){const k=o.kind||'oak',s=o.s||(0.8+B.rnd()*0.45),g=B.gy(0,0);B.inst(k,0,g-0.1,0,B.rnd()*6,s,[0.9+B.rnd()*0.2,0.9+B.rnd()*0.2,0.92]);
  if(k!=='bush'&&k!=='sbush')B.col(-0.28*s,0.28*s,g-0.3,g+(k==='stump'?0.8:k==='split'?4:5.5)*s,-0.28*s,0.28*s,'wood',{cover:k==='stump'?false:false});
  B.blob(0,0,(k==='pine'||k==='snowy'?2.3:k==='bare'||k==='split'?1.2:k==='stump'?0.6:k==='poplar'?1.8:k==='bush'||k==='sbush'?1.2:3.0)*s,0.5);}},
 // tronco caído {s}
 log:{build(B,o){const s=o.s||1,g=B.gy(0,0);B.inst('log',0,g,0,0,s,null);B.obox(0,0,g-0.1,g+0.55*s,2.2*s,0.3*s,0,null,null,{surf:'wood'});}},
 // roca {s}
 rock:{build(B,o){const s=o.s||1,r=B.rnd,sc=[s*(0.8+r()*0.5),s*(0.55+r()*0.35),s*(0.8+r()*0.4)],g=B.gy(0,0);B.inst('rock',0,g-0.25*sc[1],0,r()*6,sc,o.col||'#8d877b');
  B.col(-sc[0]*0.75,sc[0]*0.75,g-0.3,g+sc[1]*0.7,-sc[2]*0.75,sc[2]*0.75,'stone');}},
 // erizo checo
 hedgehog:{build(B,o){const g=B.gy(0,0);B.inst('hedgehog',0,g-0.05,0,B.rnd()*6,o.s||1,o.col||'#5a5650');B.col(-0.6,0.6,g,g+1.25,-0.6,0.6,'metal',{see:true,cover:false});}},
 // alambre de espino {len}: frena el paso, no las balas ni la vista
 wire:{build(B,o){const L=o.len||6,n=Math.max(1,Math.round(L/2.5)),mc=hex('#3d3a36'),wc=hex('#56524c');
  B.add('wood',g=>{for(let i=0;i<=n;i++){const x=-L/2+L*i/n,y=B.gy(x,0);g.beam([x,y-0.2,-0.3],[x+0.05,y+1.1,0],0.06,0.06,hex('#5a4a38'));g.beam([x,y-0.2,0.3],[x-0.05,y+1.1,0],0.06,0.06,hex('#5a4a38'));}});
  B.add('plain',g=>{const loops=Math.round(L/0.32);let prev=null;for(let i=0;i<=loops*8;i++){const t=i/8,x=-L/2+L*t/loops,a=t*Math.PI*2,y=B.gy(x,0)+0.45+Math.sin(a)*0.42,z=Math.cos(a)*0.42,p=[x,y,z];
   if(prev)g.tube(prev,p,0.012,0.012,3,i%3?wc:mc);prev=p;}
   for(const hy of [0.25,0.75])g.tube([-L/2,B.gy(-L/2,0)+hy,0],[L/2,B.gy(L/2,0)+hy,0],0.01,0.01,3,mc);});
  B.col(-L/2,L/2,Math.min(B.gy(-L/2,0),B.gy(L/2,0))-0.2,Math.max(B.gy(-L/2,0),B.gy(L/2,0))+1.0,-0.45,0.45,'metal',{nob:true,see:true,cover:false});}},
 // cráter {r, d}: hoyo en el relieve con reborde y tierra quemada
 crater:{mods(o,L){L.push({t:'crater',x:o.x||0,z:o.z||0,r:o.r||3,d:o.d||1});},
  build(B,o){const R=o.r||3,D=o.d||1;B.mark(0,0,R*1.25,5,0.9);if(D>=1.1&&R>=2.5)for(let i=0;i<6;i++){const a=i/6*Math.PI*2+0.3;B.cover(Math.sin(a)*R*0.6,Math.cos(a)*R*0.6,-Math.sin(a),-Math.cos(a),true);}}},
 // trinchera por puntos del mundo {pts:[[x,z],...], w, d, rampA, rampB}: corta el relieve y la reviste de tablones
 trench:{world:true,mods(o,L){const P=o.pts||[],w=o.w||2.2,d=o.d||1.6;for(let i=0;i<P.length-1;i++)L.push({t:'trench',ax:P[i][0],az:P[i][1],bx:P[i+1][0],bz:P[i+1][1],w,d,rampA:i===0&&!!o.rampA,rampB:i===P.length-2&&!!o.rampB});},
  build(B,o){const P=o.pts||[],w=o.w||2.2,d=o.d||1.6,hw=w/2,pc=hex('#6d5537'),dk=hex('#4f3e2a');
   for(let i=0;i<P.length-1;i++){const ax=P[i][0],az=P[i][1],bx=P[i+1][0],bz=P[i+1][1],L=Math.hypot(bx-ax,bz-az);if(L<0.5)continue;const dx=(bx-ax)/L,dz=(bz-az)/L,ry=Math.atan2(-dz,dx),px=dz,pz=-dx;
    const n=Math.max(1,Math.round(L/3));for(let k=0;k<n;k++){const t0=L*k/n,t1=L*(k+1)/n,tm=(t0+t1)/2,cx=ax+dx*tm,cz=az+dz*tm;B.at(cx,cz);
     const ramp=(i===0&&o.rampA&&tm<4)||(i===P.length-2&&o.rampB&&L-tm<4);const f=World.height(cx,cz);
     B.obox(cx,cz,f-0.05,f+0.03,(t1-t0)/2,hw-0.15,ry,'wood',dk,{col:false,bev:0});
     if(ramp)continue;
     for(const sg of [-1,1]){const wx=cx+px*sg*(hw+0.07),wz=cz+pz*sg*(hw+0.07),gt=World.height(cx+px*sg*(hw+1.1),cz+pz*sg*(hw+1.1));
      B.obox(wx,wz,f-0.15,gt+0.1,(t1-t0)/2+0.04,0.07,ry,'wood',pc,{bev:0.01});
      if(o.bags&&(o.bags===2||o.bags===sg)){const bc=hex(o.bagCol||'#b5a274'),nb=Math.max(1,Math.round((t1-t0)/0.6)),ox=cx+px*sg*(hw+0.42),oz=cz+pz*sg*(hw+0.42);
       for(let l=0;l<2;l++)for(let q=0;q<nb-(l?1:0);q++){const tq=t0+(q+0.5+(l?0.5:0))*(t1-t0)/nb-tm,x=ox+dx*tq,z=oz+dz*tq,v=0.84+B.rnd()*0.18;B.inst('bag',x,World.height(x,z)+l*0.19-0.02,z,ry+(B.rnd()-0.5)*0.12,1,[bc[0]*v,bc[1]*v,bc[2]*v]);}
       B.obox(ox,oz,gt-0.1,gt+0.36,(t1-t0)/2,0.18,ry,null,null,{surf:'sand',cover:false});}
      B.obox(cx+px*sg*(hw+0.1)+dx*(t0-tm),cz+pz*sg*(hw+0.1)+dz*(t0-tm),f-0.1,gt+0.25,0.07,0.07,ry,'wood',dk,{col:false});
      for(let q=0;q<Math.max(1,Math.round((t1-t0)/2));q++){const tq=t0+(q+0.5)*(t1-t0)/Math.max(1,Math.round((t1-t0)/2))-tm;B.cover(cx+px*sg*(hw-0.45)+dx*tq,cz+pz*sg*(hw-0.45)+dz*tq,-px*sg,-pz*sg,d<=1.65);}}}}}},
 // búnker de hormigón {w, d, h, slit (ancho de la tronera), mg (MG42 utilizable en la tronera), tag}: tronera al frente (+Z) a la altura de los ojos, puerta detrás (-Z).
 // Puntos (con id o pt): door (fuera de la puerta), in (dentro), gun y gun2 (tiradores en la tronera), charge (junto a la puerta), roof
 bunker:{build(B,o){const w=o.w||7,d=o.d||5,h=o.h||2.4,t=0.6,col=o.col||W_COL.concrete,fy=W_FLOOR(B,w,d)+0.05,by=W_BASE(B,w,d)-0.6;
  const C='concrete',sw=Math.min(w-2.4,o.slit||4),s0=1.1,s1=1.65,dw=1.2,dx=w/2-t-0.9;
  B.box(-w/2,w/2,by,fy,-d/2,d/2,C,col,{cover:false});
  B.box(-w/2,w/2,fy,fy+s0,d/2-t,d/2,C,col);B.box(-w/2,w/2,fy+s1,fy+h,d/2-t,d/2,C,col,{cover:false});B.box(-w/2,-sw/2,fy+s0,fy+s1,d/2-t,d/2,C,col,{cover:false});B.box(sw/2,w/2,fy+s0,fy+s1,d/2-t,d/2,C,col,{cover:false});
  B.box(-sw/2-0.3,sw/2+0.3,fy+s1,fy+s1+0.12,d/2,d/2+0.35,C,mixC(col,'#666',0.2),{col:false});
  B.box(-w/2,dx-dw/2,fy,fy+h,-d/2,-d/2+t,C,col);B.box(dx+dw/2,w/2,fy,fy+h,-d/2,-d/2+t,C,col);B.box(dx-dw/2,dx+dw/2,fy+2.05,fy+h,-d/2,-d/2+t,C,col,{cover:false});
  for(const s of [-1,1])B.box(s<0?-w/2:w/2-t,s<0?-w/2+t:w/2,fy,fy+h,-d/2+t,d/2-t,C,col);
  B.box(-w/2-0.35,w/2+0.35,fy+h,fy+h+0.7,-d/2-0.35,d/2+0.45,C,mixC(col,'#777',0.15),{bev:0.12,cover:false});
  B.box(-w/2+t,w/2-t,fy+h-0.05,fy+h,-d/2+t,d/2-t,'plain','#2c2b28',{col:false,bev:0});
  B.add('dirt',g=>{for(const s of [-1,1])g.rbox(s*w/2-1.3,s*w/2+1.3,by,fy+h*0.6,-d/2-0.6,d/2-0.2,0.8,hex('#6b5a42'),2,0.2);});
  // dentro: cajas de munición, mesa y estante
  if(o.furnish!==false&&w>=6){B.box(-w/2+t+0.05,-w/2+t+0.85,fy,fy+0.75,-d/2+t+0.1,-d/2+t+1.2,'wood','#5d6440',{cover:false});B.box(-w/2+t+0.1,-w/2+t+0.7,fy+0.75,fy+1.2,-d/2+t+0.2,-d/2+t+0.8,'wood','#4f5537',{col:false});
   B.box(w/2-t-1.6,w/2-t-0.05,fy+1.3,fy+1.36,-d/2+t+0.05,-d/2+t+0.45,'wood','#6b5238',{col:false});}
  B.point('door',dx,fy+0.02,-d/2-1.3,Math.PI);B.point('in',-w*0.15,fy+0.02,-0.2);B.point('gun',-sw*0.22,fy+0.02,d/2-t-0.55,0);B.point('gun2',sw*0.22,fy+0.02,d/2-t-0.55,0);B.point('charge',dx,fy+0.02,-d/2-0.45,Math.PI);B.point('roof',0,fy+h+0.7,0);
  if(o.mg){const p=[B.wx(0,d/2-t+0.05),B.y+fy+s0-0.55,B.wz(0,d/2-t+0.05)];World.addUsable({kind:'mg',pos:p,yaw:B.yaw,arc:o.arc||0.7,weapon:'mg42mount',mountH:0.62,seat:[B.wx(0,d/2-t-0.8),B.y+fy,B.wz(0,d/2-t-0.8)],tag:o.tag||null,
   text:{es:'usar la ametralladora',en:'use the machine gun'},short:{es:'MG',en:'MG'}});}}},
 // torre de iglesia {s, h}: campanario en lo alto (puesto de francotirador sobre fy+h-4)
 tower:{build(B,o){const s=o.s||5,H=o.h||16,hb=H-4.2,mat='stone',col=o.col||'#a59d8c',fy=Math.max(B.gy(-s/2,-s/2),B.gy(s/2,s/2),B.gy(-s/2,s/2),B.gy(s/2,-s/2)),g0=Math.min(B.gy(-s/2,-s/2),B.gy(s/2,s/2))-0.5;
  B.box(-s/2,s/2,g0,fy+hb,-s/2,s/2,mat,col);B.box(-s/2-0.12,s/2+0.12,fy+hb-0.3,fy+hb,-s/2-0.12,s/2+0.12,mat,mixC(col,'#777',0.3),{col:false});
  const pw=0.9,ph=3.2;for(const sx of [-1,1])for(const sz of [-1,1])B.box(sx>0?s/2-pw:-s/2,sx>0?s/2:-s/2+pw,fy+hb,fy+hb+ph,sz>0?s/2-pw:-s/2,sz>0?s/2:-s/2+pw,mat,col,{cover:false});
  for(let f=0;f<4;f++){const ev=f%2===0,sg=f<2?1:-1;if(ev)B.box(-s/2+pw,s/2-pw,fy+hb,fy+hb+1.0,sg>0?s/2-0.3:-s/2,sg>0?s/2:-s/2+0.3,mat,col);else B.box(sg>0?s/2-0.3:-s/2,sg>0?s/2:-s/2+0.3,fy+hb,fy+hb+1.0,-s/2+pw,s/2-pw,mat,col);}
  B.box(-s/2-0.15,s/2+0.15,fy+hb+ph,fy+hb+ph+0.45,-s/2-0.15,s/2+0.15,mat,mixC(col,'#777',0.3),{cover:false});
  B.point('belfry',0,fy+hb+0.02,0);B.point('base',0,B.gy(0,s/2+1.2),s/2+1.2);
  const top=fy+hb+ph+0.45,R=s/2+0.1,rc=hex(o.roofCol||'#5d625f');B.add('roof',g=>{const A=[-R,top,-R],Bq=[R,top,-R],C=[R,top,R],D=[-R,top,R],T=[0,top+s*1.3,0];
   for(const [a,b] of [[A,Bq],[Bq,C],[C,D],[D,A]])g.tri(a,b,T,rc,[0,top+1,0],[0,0,1,0,0.5,1]);});
  }},
 // iglesia: nave (casa alta de piedra) y torre delante {w, d, h}
 church:{build(B,o){const w=o.w||10,d=o.d||16,h=o.h||6.5;const sv={x:B.x,y:B.y,z:B.z,yaw:B.yaw};
  PREFABS.house.build(B,{w,d,h,mat:'stone',col:o.col||'#a8a090',roofCol:o.roofCol||'#5d625f',pitch:0.9,chimney:false,shutters:false,furnish:false,ruined:o.ruined,burnt:o.burnt,lit:o.lit,pt:o.pt||o.id,doors:[{side:0,at:0,w:1.8,h:3}],
   windows:[{side:1,at:-d*0.25,w:1,y0:2,y1:4.6},{side:1,at:d*0.25,w:1,y0:2,y1:4.6},{side:3,at:-d*0.25,w:1,y0:2,y1:4.6},{side:3,at:d*0.25,w:1,y0:2,y1:4.6},{side:2,at:0,w:1.2,y0:2.5,y1:5}]});
  const fy=W_FLOOR(B,w,d)+0.15;if(o.furnish!==false&&!o.ruined&&!o.burnt){B.sub({t:'pews',rows:Math.floor(d/2.2),w:w/2-1.6,gap:1.6,fy},0,d/2-3.2,0,0);
   B.box(-1.2,1.2,fy,fy+1.0,-d/2+1.2,-d/2+2.0,'stone','#bdb4a2',{cover:true});B.box(-2,2,fy,fy+0.25,-d/2+0.35,-d/2+2.8,'stone','#a59c8a',{col:false,bev:0.02});}
  B.point('nave',0,fy+0.02,0);B.point('altar',0,fy+0.02,-d/2+3.2);
  const tz=d/2+2.6;B.x=B.wx(0,tz);B.z=B.wz(0,tz);B.y=World.height(B.x,B.z);M4.compose([B.x,B.y,B.z],B.yaw,0,0,1,B.M);B.cx=B.x;B.cz=B.z;
  PREFABS.tower.build(B,{s:5,h:o.towerH||18});Object.assign(B,sv);M4.compose([B.x,B.y,B.z],B.yaw,0,0,1,B.M);}},
 // lancha de desembarco {len, open}: cubierta en y del objeto (ponerla en el nivel del agua + 0.3), rampa al frente (+Z)
 boat:{build(B,o){const L=o.len||11,W=3.4,hs=1.7,mt=hex(o.col||'#5c675a'),dk=hex('#3e463e'),open=o.open!==false;
  B.box(-W/2,W/2,-1.3,-0.02,-L/2,L/2,'metal',mt,{col:false});B.col(-W/2,W/2,-1.3,0,-L/2,L/2,'metal',{cover:false});
  B.box(-W/2+0.15,W/2-0.15,-0.06,0.02,-L/2+0.2,L/2-0.1,'wood','#6a5a44',{col:false,bev:0});
  for(const s of [-1,1])B.box(s<0?-W/2:W/2-0.14,s<0?-W/2+0.14:W/2,0,hs,-L/2,L/2,'metal',mt);
  B.box(-W/2,W/2,0,hs+0.3,-L/2,-L/2+0.18,'metal',mt);B.box(-0.9,0.9,0,1.15,-L/2+0.18,-L/2+1.6,'metal',dk);
  if(open){const n=4,len=2.8;B.add('metal',g=>{g.quad([-W/2+0.1,0,L/2],[W/2-0.1,0,L/2],[W/2-0.1,-1.05,L/2+len],[-W/2+0.1,-1.05,L/2+len],mt,[0,-3,L/2]);
    g.quad([-W/2+0.1,-0.08,L/2],[W/2-0.1,-0.08,L/2],[W/2-0.1,-1.13,L/2+len],[-W/2+0.1,-1.13,L/2+len],dk,[0,3,L/2]);});
   for(let i=0;i<n;i++)B.col(-W/2+0.1,W/2-0.1,-1.6,-(i+0.5)*1.05/n,L/2+i*len/n,L/2+(i+1)*len/n,'metal',{cover:false});}
  else B.box(-W/2,W/2,-0.2,hs+0.25,L/2-0.16,L/2,'metal',mt);}},
 // pieza de artillería {aa:false} (antiaérea con aa:true)
 gun:{build(B,o){const c=hex(o.col||'#4d5248'),dk=hex('#2e302c'),g=B.gy(0,0);
  if(o.aa){B.add('metal',q=>{for(const a of [0,Math.PI/2])q.beam([Math.sin(a)*2.4,0.15,Math.cos(a)*2.4],[-Math.sin(a)*2.4,0.15,-Math.cos(a)*2.4],0.3,0.25,c);
    q.cyl(0.45,0.35,0.2,1.3,8,c);q.box(-0.9,0.9,1.0,2.0,0.4,0.48,c);const el=0.75;q.tube([0,1.5,-0.6],[0,1.5+Math.sin(el)*4.2,Math.cos(el)*4.2],0.11,0.08,8,dk);q.box(-0.35,0.35,1.2,1.8,-0.9,0.5,c);q.translate(0,0,g,0);});
   B.col(-1.3,1.3,g,g+1.9,-1.3,1.3,'metal');return;}
  B.add('metal',q=>{for(const s of [-1,1]){const m=q.mark();q.cyl(0.62,0.62,-0.09,0.09,10,dk,hex('#45473f'));q.xform(m,rotZ(Math.PI/2,s*0.9,0.62,0));}
   q.tube([-0.95,0.62,0],[0.95,0.62,0],0.06,0.06,6,dk);const m=q.mark();q.box(-0.95,0.95,0.45,1.75,-0.04,0.04,c);q.xform(m,rotX(-0.12,0,0,0.45));
   q.tube([0,1.05,-0.4],[0,1.15,3.1],0.085,0.07,8,dk);q.box(-0.22,0.22,0.85,1.2,-0.7,0.6,c);for(const s of [-1,1])q.beam([s*0.25,0.8,-0.2],[s*0.7,0.05,-2.8],0.14,0.12,c);q.translate(0,0,g,0);});
  B.col(-1.05,1.05,g,g+1.6,-2.6,1.2,'metal');}},
 // escalera de bloques {w, h, d}: sube hacia +Z
 stairs:{build(B,o){const w=o.w||1.4,h=o.h||1.5,d=o.d||2.5,n=Math.max(2,Math.round(h/0.3)),g=B.gy(0,0);
  for(let i=0;i<n;i++)B.box(-w/2,w/2,g-0.2,g+h*(i+1)/n,-d/2+d*i/n,d/2,o.mat||'stone',o.col,{bev:0.02,cover:false});}},
 // vehículo quemado {w, d}
 wreck:{build(B,o){const w=o.w||2.3,d=o.d||5,g=B.gy(0,0),c=hex('#3a3734'),r=B.rnd;
  B.box(-w/2,w/2,g+0.35,g+1.3,-d/2,d/2,'metal',c);B.box(-w/2+0.15,w/2-0.15,g+1.3,g+2.1,d/2-1.8,d/2-0.3,'metal',mixC(c,'#5a4a3a',0.3));
  B.add('metal',q=>{for(const sx of [-1,1])for(const sz of [-1,1]){const m=q.mark();q.cyl(0.42,0.42,-0.12,0.12,8,hex('#222'));q.xform(m,rotZ(Math.PI/2,sx*(w/2-0.05),g+0.42,sz*(d/2-0.8)));}});
  B.mark(0,0,Math.max(w,d)*0.7,3,0.8);}}
};

// ---------- prefabricados de la fase 2 (misiones). Ver DESIGN §4 «Prefabricados» ----------
// suelo más alto de un rectángulo local (para apoyar plantas y bases)
const W_FLOOR=(B,w,d)=>Math.max(B.gy(-w/2,-d/2),B.gy(w/2,-d/2),B.gy(w/2,d/2),B.gy(-w/2,d/2),B.gy(0,0));
const W_BASE=(B,w,d)=>Math.min(B.gy(-w/2,-d/2),B.gy(w/2,-d/2),B.gy(w/2,d/2),B.gy(-w/2,d/2),B.gy(0,0));
Object.assign(PREFABS,{
 // granero {w,d,h}: tablas de madera, portalón al frente (+Z), puerta detrás, pacas y almiar dentro
 barn:{build(B,o){const w=o.w||10,d=o.d||14,h=o.h||4.4,r=B.rnd;
  PREFABS.house.build(B,{w,d,h,mat:'wood',col:o.col||'#6a4e37',roofCol:o.roofCol||'#56524b',pitch:1.05,chimney:false,shutters:false,furnish:false,th:0.24,pt:o.pt,id:o.id,burnt:o.burnt,lit:o.lit,
   doors:[{side:0,at:0,w:3.4,h:3.4},{side:2,at:w*0.25,w:1.3}],windows:[{side:1,at:-d*0.25,w:0.8,y0:2.5,y1:3.3},{side:3,at:d*0.25,w:0.8,y0:2.5,y1:3.3},{side:1,at:d*0.25,w:0.8,y0:1.0,y1:1.8}]});
  const fy=W_FLOOR(B,w,d)+0.15;if(o.burnt)return;
  // tablas verticales (listones oscuros) por fuera
  B.add('wood',g=>{const dk=hex('#4a3626');for(let s=0;s<4;s++){const ev=s%2===0,L=ev?w:d,n=Math.round(L/0.9);for(let i=1;i<n;i++){const a=-L/2+L*i/n;if(ev&&Math.abs(a)<1.9&&s===0)continue;
    const p=(s<2?1:-1)*((ev?d:w)/2+0.01);if(ev)g.box(a-0.04,a+0.04,fy,fy+h,p-0.02,p+0.02,dk);else g.box(p-0.02,p+0.02,fy,fy+h,a-0.04,a+0.04,dk);}}});
  for(let i=0;i<5;i++){const x=-w/2+1.2+(i%3)*1.15,z=-d/2+1.4+((i/3)|0)*0.7;B.inst('bale',x,fy,z,0,1,null);}
  B.box(-w/2+0.6,-w/2+3.8,fy,fy+1.0,-d/2+0.9,-d/2+2.6,null,null,{cover:true});
  B.inst('hay',w/2-2,fy,-d/2+2.4,r()*6,0.75,null);B.col(w/2-2.9,w/2-1.1,fy,fy+1.8,-d/2+1.5,-d/2+3.3,'grass',{cover:false});}},
 // almiar {s} y pacas {n}
 haystack:{build(B,o){const s=o.s||1,g=B.gy(0,0);B.inst('hay',0,g-0.1,0,B.rnd()*6,s,null);B.col(-1.0*s,1.0*s,g-0.2,g+2.2*s,-1.0*s,1.0*s,'grass');B.blob(0,0,1.8*s,0.45);}},
 bales:{build(B,o){const n=Math.min(5,o.n||4),r=B.rnd,P=[[-1.15,0],[0,0],[1.15,0],[-0.57,1],[0.57,1]];for(let i=0;i<n;i++){const [x,l]=P[i],y=B.gy(0,0)+l*0.5;B.inst('bale',x,y,(r()-0.5)*0.15,(r()-0.5)*0.1,1,null);}
  B.col(-1.75,1.75,B.gy(0,0)-0.2,B.gy(0,0)+(n>3?1.0:0.5),-0.32,0.32,'grass');}},
 // carro de granja {hay}
 cart:{build(B,o){const g=B.gy(0,0),wc=hex('#6b5238'),dk=hex('#3d3024');
  B.add('wood',q=>{q.box(-0.75,0.75,0.75,0.85,-1.3,1.3,wc);for(const s of [-1,1])q.box(s*0.75-0.05,s*0.75+0.05,0.85,1.25,-1.3,1.3,wc);q.box(-0.75,0.75,0.85,1.2,-1.35,-1.27,wc);q.box(-0.75,0.75,0.85,1.2,1.27,1.35,wc);
   for(const s of [-1,1]){const m=q.mark();q.cyl(0.62,0.62,-0.05,0.05,12,dk);q.xform(m,rotZ(Math.PI/2,s*0.88,0.62,0.1));q.beam([s*0.45,0.8,1.2],[s*0.35,0.14,3.1],0.08,0.08,wc);}
   q.tube([-0.95,0.62,0.1],[0.95,0.62,0.1],0.05,0.05,6,dk);q.translate(0,0,g,0);});
  if(o.hay)B.add('plain',q=>{q.rbox(-0.7,0.7,g+0.85,g+1.75,-1.25,1.25,0.4,hex('#c4a55a'),3,0.1);q.vary(0,B.rnd,0.08);});
  B.col(-0.95,0.95,g,g+(o.hay?1.75:1.25),-1.35,1.35,'wood',{thin:!o.hay});B.blob(0,0,1.6,0.4);}},
 // postes de telégrafo por puntos del mundo {pts, every, broken (índice de poste caído)}
 poles:{world:true,build(B,o){const P=o.pts||[],ev=o.every||30,pc=hex('#5a4a3a'),wc=hex('#2a2826'),ins=hex('#d8d2c0'),pts=[];
  for(let i=0;i<P.length-1;i++){const [ax,az]=P[i],[bx,bz]=P[i+1],L=Math.hypot(bx-ax,bz-az),n=Math.max(1,Math.round(L/ev));for(let k=0;k<n;k++)pts.push([ax+(bx-ax)*k/n,az+(bz-az)*k/n]);}
  pts.push(P[P.length-1]);const tops=[];
  for(let i=0;i<pts.length;i++){const [x,z]=pts[i],y=World.height(x,z),nx=pts[Math.min(i+1,pts.length-1)],pv=pts[Math.max(i-1,0)],a=Math.atan2(nx[0]-pv[0],nx[1]-pv[1]),bk=o.broken===i;
   B.at(x,z);B.add('wood',g=>{g.lathe([[0.15,-0.5],[0.13,6.5],[0.11,7]],6,pc);g.box(-0.9,0.9,6.3,6.45,-0.06,0.06,pc);for(const s of [-0.75,-0.25,0.25,0.75]){const m=g.mark();g.cyl(0.04,0.03,6.45,6.62,5,ins);g.translate(m,s,0,0);}
    if(bk)g.xform(0,rotX(1.2,0,0,0));g.xform(0,rotY(a,x,y,z));});
   if(!bk){B.obox(x,z,y-0.5,y+6.5,0.16,0.16,0,null,null,{surf:'wood',cover:false});tops.push([x,y,z,a]);}else tops.push(null);}
  for(let i=0;i<tops.length-1;i++){const A=tops[i],C=tops[i+1];if(!A||!C)continue;B.at((A[0]+C[0])/2,(A[2]+C[2])/2);B.add('plain',g=>{for(const s of [-0.75,0.75,-0.25]){const pa=[A[0]+Math.cos(A[3])*s,A[1]+6.58,A[2]-Math.sin(A[3])*s],pb=[C[0]+Math.cos(C[3])*s,C[1]+6.58,C[2]-Math.sin(C[3])*s];
   let pr=pa;for(let k=1;k<=6;k++){const t=k/6,q=[lerp(pa[0],pb[0],t),lerp(pa[1],pb[1],t)-Math.sin(t*Math.PI)*0.5,lerp(pa[2],pb[2],t)];g.tube(pr,q,0.015,0.015,3,wc);pr=q;}}});}}},
 // vehículo {kind:'truck'|'tank'|'jeep'|'halftrack', burnt (por defecto sí), col, smoke}
 wreck:{build(B,o){const k=o.kind||'truck',bu=o.burnt!==false,g=B.gy(0,0),r=B.rnd,base=hex(o.col||(bu?'#3b3733':'#515a3c')),c=bu?mixC(base,'#5a3a26',r()*0.4):base,dk=hex('#1e1d1b'),tire=hex(bu?'#151413':'#222120');
  const wheel=(q,x,y,z,R,wd)=>{const m=q.mark();q.cyl(R,R,-wd/2,wd/2,10,tire,hex('#3a3936'));q.xform(m,rotZ(Math.PI/2,x,y,z));};
  if(k==='tank'){B.add('metal',q=>{q.bbox(-1.45,1.45,0.55,1.55,-2.9,2.6,0.1,c);q.wedge(-1.45,1.45,0.55,1.55,2.6,3.4,c);q.box(-1.75,-1.3,0.1,1.05,-3.2,3.2,dk);q.box(1.3,1.75,0.1,1.05,-3.2,3.2,dk);
    const m=q.mark();q.rbox(-1.0,1.0,1.55,2.3,-1.3,1.1,0.25,c,2);q.tube([0,1.95,1.0],[0,1.9,3.8],0.09,0.08,8,dk);q.xform(m,rotY(o.turret==null?r()*1.2-0.6:o.turret,0,0,0.2));for(let i=0;i<6;i++)wheel(q,(i%2?-1:1)*1.52,0.45,-2.4+((i/2)|0)*2.2,0.42,0.35);
    q.translate(0,0,g,0);});B.col(-1.8,1.8,g,g+2.3,-3.3,3.4,'metal');}
  else if(k==='halftrack'){B.add('metal',q=>{q.bbox(-1.05,1.05,0.7,1.85,-2.6,1.2,0.06,c);q.bbox(-0.85,0.85,0.75,1.45,1.2,3.0,0.08,c);q.box(-1.2,-0.85,0.15,0.95,-2.7,0.6,dk);q.box(0.85,1.2,0.15,0.95,-2.7,0.6,dk);
    for(const s of [-1,1])wheel(q,s*0.95,0.48,2.2,0.48,0.25);q.translate(0,0,g,0);});B.col(-1.25,1.25,g,g+1.85,-2.7,3.1,'metal');}
  else if(k==='jeep'){B.add('metal',q=>{q.bbox(-0.75,0.75,0.45,0.95,-1.6,1.7,0.05,c);q.box(-0.7,0.7,0.95,1.35,0.75,0.8,dk);for(const sx of [-1,1])for(const sz of [-1.1,1.2])wheel(q,sx*0.78,0.36,sz,0.36,0.22);q.translate(0,0,g,0);});
   B.col(-0.9,0.9,g,g+1.2,-1.7,1.8,'metal',{cover:true});}
  else{B.add('metal',q=>{q.bbox(-1.05,1.05,0.75,1.0,-3.2,2.3,0.03,c);q.bbox(-1.0,1.0,1.0,2.25,1.05,2.3,0.08,c);q.box(-0.85,0.85,1.6,2.05,2.29,2.33,bu?dk:hex('#2c3330'));q.bbox(-0.75,0.75,0.75,1.65,2.3,3.4,0.1,c);
    if(!o.open)for(const s of [-1,1])q.box(s*1.05-0.04,s*1.05+0.04,1.0,1.6,-3.2,0.9,c);
    if(!bu&&o.cover!==false)q.rbox(-1.1,1.1,1.2,2.7,-3.25,0.95,0.6,hex('#5f6448'),2,0.05);
    for(const sz of [-2.3,-1.4,2.6])for(const sx of [-1,1])wheel(q,sx*0.95,0.48,sz,0.48,0.3);q.translate(0,0,g,0);});
   B.col(-1.15,1.15,g,g+(bu?2.2:2.7),-3.3,3.5,'metal');}
  if(bu){B.mark(0,0,3.6,3,0.85);if(o.smoke)B.fx('smoke',0,g+1.5,0,1.2,{col:[0.15,0.14,0.13],rate:3,life:8});if(o.fire)B.fx('fire',0,g+1,0.5,0.8);}else B.blob(0,0,3,0.45);}},
 // cañón antiaéreo de 2 cm {aim (rumbo del arma), el (elevación), broken, nobags}; puntos: charge, gun
 flak:{build(B,o){const g=B.gy(0,0),c=hex(o.col||'#5a5d51'),dk=hex('#2a2c28'),br=!!o.broken,el=br?-0.18:o.el==null?0.75:o.el,yw=o.aim||0;
  B.add('metal',q=>{for(const a of [0.785,2.356])q.beam([Math.sin(a)*2.2,0.22,Math.cos(a)*2.2],[-Math.sin(a)*2.2,0.22,-Math.cos(a)*2.2],0.28,0.18,c);
   for(const a of [0.785,2.356,3.927,5.498]){const m=q.mark();q.cyl(0.22,0.25,0,0.12,8,dk);q.translate(m,Math.sin(a)*2.15,0,Math.cos(a)*2.15);}
   q.cyl(0.6,0.52,0.3,0.6,12,c);const m=q.mark();q.box(-0.55,0.55,0.6,0.85,-0.65,0.6,c);for(const s of [-1,1])q.box(s*0.42-0.06,s*0.42+0.06,0.85,1.55,-0.35,0.45,c);
   q.box(-0.12,0.12,0.6,1.0,-1.0,-0.6,dk);q.box(-0.2,0.2,0.95,1.05,-1.2,-0.8,dk);
   const m2=q.mark();q.box(-0.18,0.18,-0.18,0.2,-0.75,0.55,c);q.tube([0,0.02,0.5],[0,0.02,2.5],0.045,0.04,8,dk);q.tube([0,0.02,2.3],[0,0.02,2.6],0.07,0.065,8,dk);q.box(-0.07,0.07,0.2,0.62,-0.25,0.1,dk);q.box(-0.2,-0.05,0.25,0.4,0.1,0.25,dk);
   q.xform(m2,rotX(-el,0,1.35,0));q.box(-0.9,0.9,0.8,1.85,0.62,0.68,c);q.box(-0.12,0.12,1.2,1.5,0.6,0.7,dk);if(br)q.xform(m,rotZ(0.25,0,0,0));q.xform(m,rotY(yw,0,0,0));q.translate(0,0,g,0);});
  B.col(-1.1,1.1,g,g+1.7,-1.1,1.1,'metal',{cover:false});B.point('charge',-Math.sin(yw)*1.25,g+0.05,-Math.cos(yw)*1.25,yw);B.point('gun',-Math.sin(yw)*1.1,g,-Math.cos(yw)*1.1,yw);
  if(!o.nobags)B.sub({t:'sandbags',r:3.6,a0:-2.45,a1:2.45,rows:3},0,0,yw);
  if(br){B.mark(0,0,3.2,3,0.9);B.fx('smoke',0,g+1.2,0,1,{col:[0.14,0.13,0.12],rate:3,life:7});}else B.blob(0,0,2.4,0.4);}},
 // pozo de tirador {r, d, bags:[a0,a1] (arco de sacos, desde el frente +Z), col}: hoyo en el relieve con sacos en el borde
 foxhole:{mods(o,L){L.push({t:'crater',x:o.x||0,z:o.z||0,r:o.r||1.5,d:o.d||1.3});},
  build(B,o){const R=o.r||1.5,bg=o.bags||[-1.4,1.4];B.mark(0,0,R*1.2,6,0.7);if(bg)B.sub({t:'sandbags',r:R+0.55,a0:bg[0],a1:bg[1],rows:2,col:o.col},0,0,0,null);
   B.cover(0,R*0.25,0,-1,true);B.cover(-R*0.3,0,0,-1,true);B.point('in',0,B.gy(0,0),0);}},
 // nido de ametralladora {r, a0, a1, rows, mg (true: MG42 fija utilizable), arc, tag}: sacos en arco hacia el frente (+Z); puntos: gun (sitio del tirador), mg
 nest:{build(B,o){const R=o.r||1.7,rows=o.rows||4;B.sub({t:'sandbags',r:R,a0:o.a0==null?-1.35:o.a0,a1:o.a1==null?1.35:o.a1,rows,col:o.col},0,0,0,null);
  const gy=B.gy(0,R-0.85);B.point('gun',0,gy,R-0.85,0);B.point('mg',0,B.gy(0,R),R,0);
  if(o.mg){const p=[B.wx(0,R-0.05),B.y+B.gy(0,R)+rows*0.19-0.62,B.wz(0,R-0.05)];
   World.addUsable({kind:'mg',pos:p,yaw:B.yaw,arc:o.arc||1.1,weapon:'mg42mount',mountH:0.62,seat:[B.wx(0,R-0.9),B.y+gy,B.wz(0,R-0.9)],tag:o.tag||null,
    text:{es:'usar la ametralladora',en:'use the machine gun'},short:{es:'MG',en:'MG'}});}
  B.inst('crate',0.9,B.gy(0.9,R-1.4),R-1.4,0.4,0.45,'#5d6440');}},
 // mesa {radio, maps, lamp, chairs}
 table:{build(B,o){const g=W_FLOOR(B,1.6,1)+0.0,wc=hex(o.col||'#6b4f36');B.box(-0.8,0.8,g+0.72,g+0.78,-0.45,0.45,'wood',wc,{col:false});for(const sx of [-1,1])for(const sz of [-1,1])B.box(sx*0.72-0.04,sx*0.72+0.04,g,g+0.72,sz*0.38-0.04,sz*0.38+0.04,'wood',wc,{col:false});
  B.col(-0.8,0.8,g,g+0.78,-0.45,0.45,'wood',{thin:true,cover:false});
  if(o.radio){B.box(-0.65,-0.15,g+0.78,g+1.12,-0.25,0.15,'metal','#4c5340',{col:false});B.box(-0.6,-0.2,g+0.95,g+1.08,0.15,0.16,'plain',o.lit?[1.6,1.3,0.6]:'#c9b98a',{col:false,bev:0,vary:false});
   B.add('metal',q=>q.tube([-0.2,g+1.1,-0.15],[-0.3,g+2.2,-0.2],0.008,0.005,3,hex('#333')));}
  if(o.maps)B.add('plain',q=>{q.quad([0.0,g+0.785,-0.3],[0.7,g+0.785,-0.3],[0.7,g+0.785,0.3],[0.0,g+0.785,0.3],hex('#d8cfa8'));q.quad([0.1,g+0.79,-0.2],[0.4,g+0.79,-0.25],[0.45,g+0.79,0.05],[0.12,g+0.79,0.1],hex('#9fae84'));});
  if(o.lamp)B.box(0.5,0.62,g+0.78,g+0.98,-0.06,0.06,'plain',[2.2,1.6,0.8],{col:false,bev:0,vary:false});
  if(o.chairs!==false)for(const s of [-1,1])B.box(-0.22,0.22,g,g+0.45,s*0.75-0.2,s*0.75+0.2,'wood',wc,{col:false});}},
 // bancos de iglesia {rows, w, gap}
 pews:{build(B,o){const n=o.rows||6,w=o.w||3,gap=o.gap||1.4,wc=hex('#5a4128');const g=o.fy!=null?o.fy:B.gy(0,0);
  for(let i=0;i<n;i++){const z=-i*1.15;for(const s of [-1,1]){const x0=s*gap/2,x1=s*(gap/2+w);B.box(x0,x1,g,g+0.5,z-0.22,z+0.22,'wood',wc,{cover:false});B.box(x0,x1,g+0.45,g+0.95,z-0.3,z-0.22,'wood',wc,{col:false});}}}},
 // diana {tag}: se rompe de un tiro (World 'destroyed' con col.tag)
 target:{build(B,o){const g=B.gy(0,0),h=B.inst('target',0,g,0,0,o.s||1,null),c=B.col(-0.45,0.45,g+0.35,g+1.55,-0.06,0.08,'wood',{thin:true,hp:o.hp||1,cover:false});c.inst=h;c.tag=o.tag||null;B.blob(0,0,0.6,0.3);}},
 // barrera para pasar agachado {w}: travesaño de 1.28 a 1.5 m con alambre encima
 barrier:{build(B,o){const w=o.w||3,g=B.gy(0,0),wc=hex('#6a5038');for(const s of [-1,1])B.box(s*w/2-0.07,s*w/2+0.07,g-0.2,g+1.7,-0.07,0.07,'wood',wc,{cover:false,see:true});
  B.box(-w/2,w/2,g+1.28,g+1.5,-0.08,0.08,'wood',wc,{cover:false,see:true});B.add('plain',q=>{let pr=null;for(let i=0;i<=40;i++){const t=i/40,a=t*Math.PI*14,p=[-w/2+w*t,g+1.62+Math.sin(a)*0.1,Math.cos(a)*0.1];if(pr)q.tube(pr,p,0.01,0.01,3,hex('#3d3a36'));pr=p;}});}},
 // muro bajo o tronco para saltar {len, h}
 vault:{build(B,o){const L=o.len||3,h=o.h||0.85,g=B.gy(0,0),wc=hex('#6d5536');B.box(-L/2,L/2,g-0.2,g+h,-0.15,0.15,'wood',wc,{cover:false});
  B.add('wood',q=>{for(const s of [-1,1])q.beam([s*(L/2-0.2),g,-0.5],[s*(L/2-0.2),g+h,-0.05],0.1,0.1,wc);});}},
 // malecón {len, h, th, breach:{at, w}}: hormigón con cornisa hacia el mar (-Z) y brecha con escombros por la que se sube; puntos: breach, top
 seawall:{build(B,o){const L=o.len||40,h=o.h||2.6,t=o.th||1.2,col=hex(o.col||'#9b978a'),dk=mixC(col,'#3a3934',0.45),br=o.breach,r=B.rnd,n=Math.max(1,Math.round(L/4)),top=B.gy(0,-t/2-0.6)+h;
  const inB=x=>br&&Math.abs(x-br.at)<br.w/2;
  for(let i=0;i<n;i++){const a=-L/2+L*i/n,b=a+L/n;let s0=a,s1=b;if(br){const ba=br.at-br.w/2,bb=br.at+br.w/2;if(b>ba&&a<bb){if(a<ba)s1=ba;else if(b>bb)s0=bb;else continue;}}if(s1-s0<0.2)continue;
   const gb=Math.min(B.gy(s0,-t/2-0.3),B.gy(s1,-t/2-0.3),B.gy((s0+s1)/2,0))-0.8;B.box(s0,s1-0.04,gb,top,-t/2,t/2,'concrete',col,{bev:0.03});
   B.box(s0,s1-0.04,top-0.35,top+0.05,-t/2-0.4,-t/2,'concrete',mixC(col,'#777',0.12),{col:false,bev:0.04});B.box(s1-0.06,s1,gb,top,-t/2-0.02,t/2,'plain',dk,{col:false,bev:0});}
  if(br){const a=br.at,w2=br.w/2;
   for(const s of [-1,1])for(let k=0;k<4;k++){const x=a+s*(w2+0.15-k*0.28),hh=top-(0.4+k*0.5+r()*0.4);B.box(x-0.25,x+0.25,B.gy(x,0)-0.3,Math.max(B.gy(x,0)+0.3,hh),-t/2+r()*0.2,t/2-r()*0.2,'concrete',col,{bev:0.08,cover:false});}
   B.add('metal',q=>{for(let k=0;k<7;k++){const x=a+(r()-0.5)*br.w*0.9,y=top-0.3-r()*0.8;q.tube([x,y,(r()-0.5)*t],[x+(r()-0.5)*0.8,y+0.6+r()*0.5,(r()-0.5)*1.2],0.012,0.012,3,hex('#4a3a30'));}});
   const z0=-t/2-3.4,z1=t/2+1.2,y0=B.gy(a,z0),y1=top-0.25,ns=8,rc=mixC(col,'#7a6a52',0.5);
   B.add('dirt',q=>{q.wedge(a-w2,a+w2,y0-0.2,y1,z0,z1-0.6,hex('#7a6a52'));q.box(a-w2,a+w2,y0-0.2,y1,z1-0.6,z1,hex('#6f604a'));});
   for(let k=0;k<ns;k++){const za=z0+(z1-z0)*k/ns;B.col(a-w2,a+w2,y0-0.4,y0+(y1-y0)*(k+1)/ns,za,z1,'stone',{cover:false});}
   for(const s of [-1,1])PREFABS.rubble.build(B,{r:1.3,n:12,mat:'concrete',col,off:[a+s*(w2+1.1),-t/2-1.1]});B.point('breach',a,y0,z0-0.5,0);B.point('top',a,y1,z1+0.6,0);}}},
 // lancha de desembarco {len, col}: proa al frente (+Z); la y del objeto es la cubierta (agua + 0.35). La rampa va aparte (lcvpramp, con id)
 lcvp:{build(B,o){const L=o.len||11,W=3.3,hs=1.8,mt=hex(o.col||'#56665f'),dk=mixC(mt,'#20241f',0.5),r=B.rnd;
  B.box(-W/2,W/2,-1.4,-0.02,-L/2,L/2,'metal',mt,{col:false});B.col(-W/2,W/2,-1.4,0,-L/2,L/2,'metal',{cover:false});
  B.box(-W/2+0.15,W/2-0.15,-0.06,0.02,-L/2+0.2,L/2-0.1,'wood','#5f5442',{col:false,bev:0});
  for(const s of [-1,1]){B.box(s<0?-W/2:W/2-0.16,s<0?-W/2+0.16:W/2,0,hs,-L/2,L/2,'metal',mt);B.box(s<0?-W/2-0.08:W/2,s<0?-W/2:W/2+0.08,hs-0.25,hs-0.1,-L/2,L/2,'metal',dk,{col:false});
   B.box(s<0?-W/2-0.03:W/2,s<0?-W/2:W/2+0.03,-1.2,hs-0.3,L/2-0.3,L/2,'metal',dk,{col:false});}
  B.box(-W/2,W/2,0,hs+0.35,-L/2,-L/2+0.2,'metal',mt);B.box(-1.0,1.0,0,1.15,-L/2+0.2,-L/2+1.8,'metal',dk);B.box(-W/2+0.2,-0.5,0,hs+0.65,-L/2+0.2,-L/2+1.1,'metal',mt,{cover:false});
  B.add('metal',q=>{for(const s of [-1,1])q.tube([s*1.1,hs+0.2,-L/2+1.3],[s*1.1,hs+0.75,-L/2+1.3],0.04,0.04,5,dk);q.box(-W/2+0.25,-0.55,hs+0.2,hs+0.62,-L/2+1.05,-L/2+1.12,hex('#2a302c'));});
  B.point('hinge',0,0,L/2,0);B.point('deck',0,0.02,L/2-2.2,0);}},
 // rampa de la lancha (id obligatorio): se dibuja levantada y World.hinge la baja; colisionadores rampUp/rampDown (ver L.ramp)
 lcvpramp:{build(B,o){const L=o.len||11,W=3.3,len=2.05,mt=hex(o.col||'#56665f'),dk=mixC(mt,'#20241f',0.45),z=L/2;
  B.box(-W/2+0.08,W/2-0.08,0,len,z,z+0.16,'metal',mt,{col:false});B.add('metal',q=>{for(let i=1;i<5;i++)q.box(-W/2+0.15,W/2-0.15,i*len/5-0.03,i*len/5+0.03,z-0.05,z,dk);for(const s of [-1,1])q.box(s*(W/2-0.12)-0.03,s*(W/2-0.12)+0.03,0,len,z-0.08,z,dk);});
  const up=B.col(-W/2,W/2,0,len,z,z+0.18,'metal',{cover:false}),dn=[],A=2.06,dz=Math.sin(A)*len,dy=-Math.cos(A)*len;
  for(let i=0;i<4;i++)dn.push(B.col(-W/2+0.1,W/2-0.1,-1.8,-(i+0.5)*dy/4,z+i*dz/4,z+(i+1)*dz/4,'metal',{cover:false}));
  const R=B.rec;R.rampUp=[up];R.rampDown=dn;R.rampAng=A;R.hinge=[B.wx(0,z),B.y,B.wz(0,z)];R.hingeYaw=B.yaw;
  if(o.open){World.colOn(up,false);const M1=M4.compose(R.hinge,B.yaw,-A,0,1),Bi=M4.invert(M4.compose(R.hinge,B.yaw,0,0,1),new Float32Array(16));R.M=M4.mul(M1,Bi,new Float32Array(16));}
  else for(const c of dn)World.colOn(c,false);}},
 // barracón semicilíndrico (Nissen) {len, r}
 hut:{build(B,o){const L=o.len||11,R=o.r||2.7,n=16,mt=hex(o.col||'#6b6c61'),g=W_FLOOR(B,2*R,L)+0.12,gb=W_BASE(B,2*R,L)-0.4,wc=hex('#6d5a44');
  B.box(-R-0.12,R+0.12,gb,g,-L/2-0.12,L/2+0.12,'concrete','#8d8a80',{bev:0.02,cover:false});
  B.add('metal',q=>{for(let i=0;i<n;i++){const a0=Math.PI*i/n,a1=Math.PI*(i+1)/n,c=i%2?mt:mixC(mt,'#45463e',0.3);
   q.quad([Math.cos(a0)*R,g+Math.sin(a0)*R,-L/2],[Math.cos(a1)*R,g+Math.sin(a1)*R,-L/2],[Math.cos(a1)*R,g+Math.sin(a1)*R,L/2],[Math.cos(a0)*R,g+Math.sin(a0)*R,L/2],c,[0,g,0]);}});
  B.add('wood',q=>{for(const s of [-1,1]){const z=s*(L/2-0.05);for(let i=0;i<n;i++){const a0=Math.PI*i/n,a1=Math.PI*(i+1)/n;q.tri([0,g,z],[Math.cos(a0)*R,g+Math.sin(a0)*R,z],[Math.cos(a1)*R,g+Math.sin(a1)*R,z],wc,[0,g,z-s]);}
   q.box(-0.55,0.55,g,g+2.0,z-0.02*s-0.03,z+0.06*s+0.03,hex('#4a3a2a'));for(const x of [-1.6,1.6])q.box(x-0.4,x+0.4,g+1.0,g+1.6,z+0.04*s-0.03,z+0.04*s+0.03,hex('#2a2c2a'));}});
  B.col(-R,R,g,g+R*0.92,-L/2,L/2,'metal');B.col(-R*0.7,R*0.7,g+R*0.92,g+R,-L/2,L/2,'metal',{cover:false});B.blob(0,0,R*1.6,0.35);}},
 // tienda de campaña {w, d, h}
 tent:{build(B,o){const w=o.w||2.8,d=o.d||4,h=o.h||1.9,g=B.gy(0,0),c=hex(o.col||'#6a6b48'),dk=mixC(c,'#2a2a1e',0.35);
  B.add('plain',q=>{q.quad([-w/2,g,-d/2],[0,g+h,-d/2],[0,g+h,d/2],[-w/2,g,d/2],c,[1,g,0]);q.quad([w/2,g,-d/2],[0,g+h,-d/2],[0,g+h,d/2],[w/2,g,d/2],mixC(c,'#fff',0.06),[-1,g,0]);
   q.tri([-w/2,g,-d/2],[w/2,g,-d/2],[0,g+h,-d/2],dk,[0,g,1]);q.tri([-w/2,g,d/2],[0,g,d/2+0.02],[0,g+h,d/2],c,[0,g,-1]);q.tri([w/2,g,d/2],[0.25,g,d/2+0.5],[0,g+h,d/2],c,[0,g,-1]);
   q.tube([0,g,d/2+0.05],[0,g+h+0.15,d/2+0.05],0.03,0.03,4,hex('#5a4a38'));q.vary(0,B.rnd,0.05);});
  B.col(-w/2+0.3,w/2-0.3,g,g+h*0.8,-d/2,d/2,'wood',{cover:false,thin:true});B.blob(0,0,w,0.35);}},
 // seto de bocage por puntos del mundo {pts, h, th, gaps:[[tramo, t 0..1, ancho]], trees (separación; 0 = sin árboles), bank (color del talud)}
 hedgerow:{world:true,build(B,o){const P=o.pts||[],h=o.h||3.6,t=o.th||2.2,gaps=o.gaps||[],r=B.rnd,F=['#3a5a29','#45682f','#324e24','#50703a','#3d6130'].map(hex),bank=hex(o.bank||'#6b5a42'),tsp=o.trees==null?13:o.trees;
  for(let i=0;i<P.length-1;i++){const [ax,az]=P[i],[bx,bz]=P[i+1],L=Math.hypot(bx-ax,bz-az);if(L<0.5)continue;const dx=(bx-ax)/L,dz=(bz-az)/L,ry=Math.atan2(dx,dz);
   let segs=[[0,L]];for(const gp of gaps)if(gp[0]===i){const c=gp[1]*L,hw=(gp[2]||4)/2,ns=[];for(const [s0,s1] of segs){if(c+hw<=s0||c-hw>=s1){ns.push([s0,s1]);continue;}if(c-hw>s0)ns.push([s0,c-hw]);if(c+hw<s1)ns.push([c+hw,s1]);}segs=ns;}
   for(const [S0,S1] of segs){const nsub=Math.max(1,Math.ceil((S1-S0)/8));for(let k=0;k<nsub;k++){const s0=S0+(S1-S0)*k/nsub,s1=S0+(S1-S0)*(k+1)/nsub,sl=s1-s0,m0=(s0+s1)/2,cx=ax+dx*m0,cz=az+dz*m0;
     let g0=1e9;for(let q=0;q<=3;q++){const tt=s0+sl*q/3;g0=Math.min(g0,World.height(ax+dx*tt,az+dz*tt));}B.at(cx,cz);
     const hh=h*(0.85+r()*0.3),ends=[k===0&&s0>0.01,k===nsub-1&&s1<L-0.01];
     B.add('dirt',g=>{g.rbox(-t/2-0.25,t/2+0.25,-0.5,1.05,-sl/2-(ends[0]?0:0.3),sl/2+(ends[1]?0:0.3),0.55,bank,3,0.15);g.xform(0,rotY(ry,cx,g0,cz));});
     B.add('plain',g=>{const n=Math.max(2,Math.round(sl/1.25));for(let i2=0;i2<n;i2++)for(let l=0;l<3;l++){const z=-sl/2+sl*(i2+0.5)/n+(r()-0.5)*0.7,y=0.95+l*(hh-1.2)/2.2+r()*0.35,x=(r()-0.5)*t*0.45,s=(0.85+r()*0.6)*(l===2?0.85:1),m=g.mark();
       g.ico(1,F[(r()*F.length)|0]);g.xform(m,(v,isN)=>isN?[v[0]/(s*0.85),v[1]/(s*0.8),v[2]/s]:[v[0]*s*0.85+x,v[1]*s*0.8+y,v[2]*s+z]);}g.vary(0,r,0.09);g.xform(0,rotY(ry,cx,g0,cz));});
     B.obox(cx,cz,g0-0.5,g0+hh,t/2,sl/2,ry,null,null,{surf:'grass'});
     if(tsp>0&&r()<sl/tsp){const tz=(r()-0.5)*sl*0.7,tx=cx+dx*tz,tzz=cz+dz*tz,kind=o.kind||(r()<0.75?'oak':'poplar'),s=0.85+r()*0.45;B.inst(kind,tx,World.height(tx,tzz)+0.7,tzz,r()*6,s,[0.9+r()*0.2,0.92+r()*0.16,0.9]);}}}}}},
 // dispersión por una zona del mundo {x0,z0,x1,z1, n, items:[{t,…,w (peso)}], minD, clear (radio libre de colisionadores), seed, avoid(x,z)}
 scatter:{world:true,build(B,o){const r=mulberry32(o.seed||7),items=o.items||[{t:'tree'}],tot=items.reduce((a,b)=>a+(b.w||1),0),pts=[],md=o.minD==null?3:o.minD,N=o.n||20;
  for(let i=0,tries=0;i<N&&tries<N*10;tries++){const x=lerp(o.x0,o.x1,r()),z=lerp(o.z0,o.z1,r());if(o.avoid&&o.avoid(x,z))continue;
   if(md>0&&pts.some(p=>(p[0]-x)**2+(p[1]-z)**2<md*md))continue;const y=World.height(x,z);if(o.clear!==0&&World._blocked(x,y,z,o.clear||1.2,3))continue;
   let k=r()*tot,it=items[0];for(const q of items){k-=q.w||1;if(k<=0){it=q;break;}}pts.push([x,z]);i++;B.sub(Object.assign({},it),x,z,r()*6.283);}}},
 // matas de hierba (instancias, sin colisión) {x0,z0,x1,z1, n, cols, s, type ('tuft'|'bush'|'sbush'|'stump'...), avoid(x,z)}
 tufts:{world:true,build(B,o){const r=mulberry32(o.seed||3),cols=(o.cols||['#6f8a44','#7f8f4c','#8a8a52','#5f7a3a']).map(hex),type=o.type||'tuft',nn=[0,1,0];
  for(let i=0;i<(o.n||200);i++){const x=lerp(o.x0,o.x1,r()),z=lerp(o.z0,o.z1,r());if(o.avoid&&o.avoid(x,z))continue;const y=World.height(x,z);if(World.normalAt(x,z,nn)[1]<(o.slope||0.8))continue;
   if(o.clear&&World._blocked(x,y,z,o.clear,2))continue;const c=cols[(r()*cols.length)|0],v=0.85+r()*0.3;B.inst(type,x,y-0.04,z,r()*6.28,(o.s||1)*(0.7+r()*0.6),[c[0]*v,c[1]*v,c[2]*v]);}}},
 // pozo de piedra
 well:{build(B,o){const g=B.gy(0,0);B.add('stone',q=>{q.cyl(0.9,0.9,-0.3,0.85,10,hex('#9a9282'));q.cyl(0.7,0.7,0.84,0.86,10,hex('#1d1c1a'));q.translate(0,0,g,0);});
  B.add('wood',q=>{for(const s of [-1,1])q.box(s*0.8-0.06,s*0.8+0.06,g+0.85,g+2.3,-0.06,0.06,hex('#5a4630'));q.tube([-0.85,g+2.0,0],[0.85,g+2.0,0],0.06,0.06,6,hex('#5a4630'));
   q.quad([-1.0,g+2.2,-0.75],[1.0,g+2.2,-0.75],[1.0,g+2.6,0],[-1.0,g+2.6,0],hex('#6a5038'),[0,g,0]);q.quad([-1.0,g+2.2,0.75],[1.0,g+2.2,0.75],[1.0,g+2.6,0],[-1.0,g+2.6,0],hex('#6a5038'),[0,g,0]);});
  B.col(-0.9,0.9,g-0.3,g+0.85,-0.9,0.9,'stone');B.blob(0,0,1.4,0.4);}},
 // monumento (obelisco sobre gradas)
 memorial:{build(B,o){const g=B.gy(0,0),c=hex('#b2ab9c');B.box(-1.4,1.4,g-0.4,g+0.2,-1.4,1.4,'stone',c);B.box(-1.0,1.0,g+0.2,g+0.5,-1.0,1.0,'stone',c);B.box(-0.5,0.5,g+0.5,g+1.5,-0.5,0.5,'stone',c);
  B.add('stone',q=>{q.cyl(0.38,0.22,1.5,4.2,4,c);q.cyl(0.22,0,4.2,4.6,4,c);q.xform(0,rotY(Math.PI/4,0,g,0));});B.col(-0.4,0.4,g+1.5,g+4.4,-0.4,0.4,'stone',{cover:false});}},
 // poste indicador
 signpost:{build(B,o){const g=B.gy(0,0),wc=hex('#6a5038'),pc=hex('#d8d0b8');B.add('wood',q=>{q.box(-0.06,0.06,g-0.3,g+2.6,-0.06,0.06,wc);
  [[0.4,2.3],[-0.9,2.0],[2.2,1.75]].forEach(([a,y])=>{const m=q.mark();q.box(0.08,1.1,g+y-0.1,g+y+0.1,-0.03,0.03,pc);q.box(1.1,1.25,g+y-0.07,g+y+0.07,-0.03,0.03,pc);q.xform(m,rotY(a,0,0,0));});});
  B.col(-0.08,0.08,g,g+2.6,-0.08,0.08,'wood',{cover:false});}},
 // paracaídas enganchado {s}: tela caída con cuerdas
 chute:{build(B,o){const s=o.s||1,y=o.h||0,c=hex(o.col||'#c9c4b0');B.add('plain',q=>{const m=q.mark();q.sphere(3.2*s,10,4,c,true);q.xform(m,(v,isN)=>isN?v:[v[0]+Math.sin(v[2]*0.8)*0.4,v[1]*0.45-Math.abs(v[0])*0.25*(v[0]>0?1:0.4),v[2]*1.1]);
   q.translate(m,0,y,0);for(let i=0;i<8;i++){const a=i/8*6.28;q.tube([Math.cos(a)*2.8*s,y-0.1,Math.sin(a)*3*s],[0.4,y-4.5*s,0.3],0.01,0.01,3,hex('#a8a290'));}q.vary(0,B.rnd,0.05);});}},
 // fuego o humo persistente {kind:'fire'|'smoke', size, h (altura sobre el suelo), col, rate, life}
 fx:{build(B,o){B.fx(o.kind||'fire',0,B.gy(0,0)+(o.h||0),0,o.size||1,o.col||o.rate||o.life?{col:o.col,rate:o.rate,life:o.life}:null);if((o.kind||'fire')==='fire')B.mark(0,0,(o.size||1)*1.4,3,0.8);}},
 // obstáculo de playa {k:'stake'|'logramp'}: estaca con mina o rampa de troncos (no para las balas ni la vista)
 obstacle:{build(B,o){const g=B.gy(0,0),k=o.k||'stake';B.inst(k,0,g,0,0,o.s||1,null);if(k==='stake')B.obox(0,0.2,g,g+1.6,0.2,0.8,0,null,null,{surf:'wood',see:true,cover:false});
  else B.obox(0,-0.3,g,g+1.4,0.35,2.0,0,null,null,{surf:'wood',see:true,cover:false});}},
 // barco de fondo (silueta en la niebla; sin colisión) {len, kind:'destroyer'|'transport'}
 ship:{build(B,o){const L=o.len||70,W=L*0.12,c=hex(o.col||'#5b6066'),dk=mixC(c,'#202428',0.5),y=(o.y||0)-B.y,tr=o.kind==='transport';
  B.add('metal',q=>{q.box(-W/2,W/2,y-2,y+3,-L/2,L/2-L*0.12,c);q.wedge(-W/2,W/2,y-2,y+3.4,L/2-L*0.12,L/2,c);q.box(-W/2-0.05,W/2+0.05,y-0.4,y+0.1,-L/2,L/2-L*0.12,dk);
   if(tr){q.box(-W*0.4,W*0.4,y+3,y+9,-L*0.12,L*0.08,c);q.box(-W*0.3,W*0.3,y+9,y+11,-L*0.08,L*0.04,dk);q.cyl(1.4,1.2,y+9,y+15,8,dk);for(const z of [-L*0.3,L*0.28])q.tube([0,y+3,z],[0,y+16,z],0.25,0.2,5,dk);}
   else{q.box(-W*0.35,W*0.35,y+3,y+8,-L*0.05,L*0.15,c);q.box(-W*0.25,W*0.25,y+8,y+10,0,L*0.12,dk);for(const z of [-L*0.12,-L*0.25]){const m=q.mark();q.cyl(1.0,1.1,y+3,y+9,8,dk);q.translate(m,0,0,z);}
    for(const z of [L*0.3,-L*0.38]){q.box(-1.6,1.6,y+3,y+4.6,z-1.6,z+1.6,c);q.tube([0,y+4,z],[0,y+4.6,z+(z>0?6:-6)],0.25,0.22,6,dk);}q.tube([0,y+10,L*0.06],[0,y+22,L*0.06],0.18,0.12,5,dk);}});}},
 // caja de munición con la que se rellena (usable 'ammo')
 ammo:{build(B,o){const g=B.gy(0,0);B.inst('crate',0,g,0,0.2,0.62,'#5f6642');B.inst('crate',0.68,g,0.1,-0.1,0.5,'#5f6642');B.inst('crate',0.1,g+0.62,0.05,0.5,0.45,'#6a7148');
  B.col(-0.4,1.0,g,g+0.62,-0.38,0.45,'wood',{cover:false});
  World.addUsable({kind:'ammo',pos:[B.x,null,B.z],r:1.8,tag:o.tag||'ammo',text:{es:'coger munición',en:'take ammo'},short:{es:'Munición',en:'Ammo'},use:()=>{if(typeof Weapons!=='undefined'){Weapons.refill();Bus.emit('ammo',{});}}});}}
});

// ---------- navegación: rejilla de 1 m sobre los límites; celda con altura y mejor punto de paso ----------
const NAV={x0:0,z0:0,nx:0,nz:0,walk:null,h:null,ox:null,oz:null,_stamp:0,_nn:[0,1,0],
 build(){const b=World.bounds,N=this;N.x0=Math.floor(b[0]);N.z0=Math.floor(b[1]);N.nx=Math.ceil(b[2])-N.x0;N.nz=Math.ceil(b[3])-N.z0;const n=N.nx*N.nz;
  N.walk=new Uint8Array(n);N.h=new Float32Array(n);N.ox=new Int8Array(n);N.oz=new Int8Array(n);N._g=new Float32Array(n);N._f=new Float32Array(n);
  N.edge=new Uint8Array(n);N._par=new Int32Array(n);N._st=new Uint32Array(n);N._cl=new Uint32Array(n);N._heap=new Int32Array(n*4+8);N._hk=new Float32Array(n*4+8);N._stamp=0;N.update(0,0,N.nx,N.nz);},
 // recalcula las celdas de un rectángulo (índices de celda) tras cambiar el escenario
 update(i0,j0,i1,j1){for(let j=Math.max(0,j0);j<Math.min(this.nz,j1);j++)for(let i=Math.max(0,i0);i<Math.min(this.nx,i1);i++)this._cell(i,j);this._edges(i0-1,j0-1,i1+1,j1+1);},
 // aristas cortadas (bit d = no se puede ir a la vecina en la dirección d): salto de altura o algo en medio (muros finos entre dos celdas libres)
 _edges(i0,j0,i1,j1){const nx=this.nx,nz=this.nz,E=this.edge,a=this._la,b=this._lb;
  for(let j=Math.max(0,j0);j<Math.min(nz,j1);j++)for(let i=Math.max(0,i0);i<Math.min(nx,i1);i++){const k=j*nx+i;
   for(const d of [0,2,4,5]){const ni=i+NAV_DX[d],nj=j+NAV_DZ[d];if(ni<0||nj<0||ni>=nx||nj>=nz)continue;const n=nj*nx+ni,op=NAV_OP[d];
    let bl=!this.walk[k]||!this.walk[n]||Math.abs(this.h[k]-this.h[n])>(d<4?0.6:0.8);if(!bl){this.pos(k,a);this.pos(n,b);bl=World._moveBlocked(a,b);}
    if(bl){E[k]|=1<<d;E[n]|=1<<op;}else{E[k]&=~(1<<d);E[n]&=~(1<<op);}}}},
 updateArea(x0,z0,x1,z1){this.update(Math.floor(x0-this.x0)-1,Math.floor(z0-this.z0)-1,Math.ceil(x1-this.x0)+1,Math.ceil(z1-this.z0)+1);},
 _cell(i,j){const k=j*this.nx+i,cx=this.x0+i+0.5,cz=this.z0+j+0.5,W=World;this.walk[k]=0;
  for(const [ox,oz] of NAV_OFF){const x=cx+ox,z=cz+oz,th=W.height(x,z),g=W.groundAt(x,z,0.22,th+W_STEP);
   if(W.water&&g<W.water.y-0.95)continue;if(g<=th+1e-3&&W.normalAt(x,z,this._nn)[1]<0.62)continue;if(W._blocked(x,g,z,0.3,1.6))continue;
   this.walk[k]=1;this.h[k]=g;this.ox[k]=Math.round(ox*10);this.oz[k]=Math.round(oz*10);return;}},
 idx(x,z){const i=Math.floor(x-this.x0),j=Math.floor(z-this.z0);return i<0||j<0||i>=this.nx||j>=this.nz?-1:j*this.nx+i;},
 walkable(x,z){const k=this.idx(x,z);return k>=0&&this.walk[k]===1;},
 pos(k,o){o=o||[0,0,0];o[0]=this.x0+k%this.nx+0.5+this.ox[k]/10;o[1]=this.h[k];o[2]=this.z0+((k/this.nx)|0)+0.5+this.oz[k]/10;return o;},
 _nearIdx(p,maxR){if(!this.walk)return -1;const ci=Math.floor(p[0]-this.x0),cj=Math.floor(p[2]-this.z0);let best=-1,bd=1e9;
  for(let r=0;r<=maxR;r++){for(let j=cj-r;j<=cj+r;j++)for(let i=ci-r;i<=ci+r;i++){if(Math.max(Math.abs(i-ci),Math.abs(j-cj))!==r||i<0||j<0||i>=this.nx||j>=this.nz)continue;const k=j*this.nx+i;if(!this.walk[k])continue;
    const x=this.x0+i+0.5,z=this.z0+j+0.5,d=(x-p[0])**2+(z-p[2])**2+(p[1]!=null?(this.h[k]-p[1])**2*0.5:0);if(d<bd){bd=d;best=k;}}if(best>=0)return best;}return -1;},
 // celda transitable más cercana -> [x,y,z] | null
 near(p,maxR){const k=this._nearIdx(p,maxR==null?6:maxR);return k<0?null:this.pos(k);},
 // punto transitable al azar a menos de r de c
 random(c,r,rnd){rnd=rnd||Math.random;for(let i=0;i<24;i++){const a=rnd()*6.283,d=Math.sqrt(rnd())*r,k=this.idx(c[0]+Math.sin(a)*d,c[2]+Math.cos(a)*d);if(k>=0&&this.walk[k])return this.pos(k);}return this.near(c,4);},
 // A* de 8 vecinos (sin cortar esquinas, saltos de altura <= 0.6 m) + suavizado por línea directa. -> [[x,y,z],...] | null
 path(a,b,maxIt){const s=this._nearIdx(a,3),g=this._nearIdx(b,6);if(s<0||g<0)return null;if(s===g)return [this.pos(g)];
  const nx=this.nx,nz=this.nz,st=++this._stamp,G=this._g,F=this._f,P=this._par,ST=this._st,CL=this._cl,HP=this._heap,HK=this._hk,EG=this.edge,W=this.walk,Hh=this.h,gi=g%nx,gj=(g/nx)|0;let hn=0;
  const heur=k=>{const dx=Math.abs(k%nx-gi),dz=Math.abs(((k/nx)|0)-gj);return dx+dz-0.5858*Math.min(dx,dz);};
  const push=k=>{if(hn>=HP.length-1)return;const f=F[k];let i=hn++;while(i>0){const p=(i-1)>>1;if(HK[p]<=f)break;HP[i]=HP[p];HK[i]=HK[p];i=p;}HP[i]=k;HK[i]=f;};
  const pop=()=>{const top=HP[0],last=HP[--hn],lk=HK[hn];let i=0;if(hn>0){for(;;){let c=i*2+1;if(c>=hn)break;if(c+1<hn&&HK[c+1]<HK[c])c++;if(HK[c]>=lk)break;HP[i]=HP[c];HK[i]=HK[c];i=c;}HP[i]=last;HK[i]=lk;}return top;};
  ST[s]=st;G[s]=0;F[s]=heur(s);P[s]=-1;push(s);let it=0,found=false;const lim=maxIt||40000;
  while(hn){const c=pop();if(CL[c]===st)continue;CL[c]=st;if(c===g){found=true;break;}if(++it>lim)return null;const ci=c%nx,cj=(c/nx)|0,hc=Hh[c];
   for(let d=0;d<8;d++){const ni=ci+NAV_DX[d],nj=cj+NAV_DZ[d];if(ni<0||nj<0||ni>=nx||nj>=nz)continue;const n=nj*nx+ni;if(!W[n]||CL[n]===st||(EG[c]>>d)&1)continue;
    if(d>=4&&(!W[cj*nx+ni]||!W[nj*nx+ci]))continue;const ng=G[c]+(d<4?1:1.4142);if(ST[n]===st&&ng>=G[n])continue;ST[n]=st;G[n]=ng;F[n]=ng+heur(n);P[n]=c;push(n);}}
  if(!found)return null;const cells=[];for(let k=g;k>=0&&cells.length<5000;k=P[k])cells.push(k);cells.reverse();
  const pts=[this.pos(cells[0])];let i=0;while(i<cells.length-1){let j=i+1;while(j+1<cells.length&&this._line(cells[i],cells[j+1]))j++;pts.push(this.pos(cells[j]));i=j;}
  if(pts.length>1)pts.shift();return pts;},
 // ¿se puede ir en línea recta entre dos celdas? (muestras cada 0.3 m con margen lateral)
 _line(a,b){const A=this.pos(a,this._la),B=this.pos(b,this._lb),dx=B[0]-A[0],dz=B[2]-A[2],L=Math.hypot(dx,dz),n=Math.ceil(L/0.3),px=-dz/(L||1)*0.32,pz=dx/(L||1)*0.32;let ph=A[1];
  for(let s=1;s<=n;s++){const t=s/n,x=A[0]+dx*t,z=A[2]+dz*t;for(const o of [0,1,-1]){const k=this.idx(x+px*o,z+pz*o);if(k<0||!this.walk[k])return false;if(o===0){if(Math.abs(this.h[k]-ph)>0.6)return false;ph=this.h[k];}}}
  // nada en medio, tampoco a los lados (anchura del soldado)
  const q=this._lq,r=this._lr;for(const o of [0,1,-1]){q[0]=A[0]+px*o;q[1]=A[1];q[2]=A[2]+pz*o;r[0]=B[0]+px*o;r[1]=B[1];r[2]=B[2]+pz*o;if(World._moveBlocked(q,r))return false;}return true;},
 _lq:[0,0,0],_lr:[0,0,0],
 _la:[0,0,0],_lb:[0,0,0]
};
World.nav=NAV;

// ---------- coberturas: puntos junto a colisionadores; n = normal hacia fuera (la amenaza debe estar al otro lado) ----------
World.cover={
 add(pos,n,low,col){const W=World,k=W._key(Math.floor(pos[0]/8),Math.floor(pos[2]/8));let a=W.chash.get(k);if(!a)W.chash.set(k,a=[]);
  for(const c of a)if(Math.abs(c.pos[0]-pos[0])<0.7&&Math.abs(c.pos[2]-pos[2])<0.7&&c.n[0]*n[0]+c.n[2]*n[2]>0.7)return c;
  const c={pos:pos.slice(),n:[n[0],0,n[2]],low:!!low,by:null,col:col||null,dead:false,dirToThreat:[0,0,0]};a.push(c);W.covers.push(c);return c;},
 // la mejor libre a menos de maxDist de p que protege de threatPos -> {pos, low, dirToThreat, n} | null
 find(p,threat,maxDist,actor){const W=World,r=maxDist||15;let best=null,bs=1e9;
  for(let i=Math.floor((p[0]-r)/8);i<=Math.floor((p[0]+r)/8);i++)for(let j=Math.floor((p[2]-r)/8);j<=Math.floor((p[2]+r)/8);j++){const a=W.chash.get(W._key(i,j));if(!a)continue;
   for(const c of a){if(c.dead||(c.by&&c.by!==actor))continue;const d=Math.hypot(c.pos[0]-p[0],c.pos[2]-p[2]);if(d>r)continue;
    const tx=threat[0]-c.pos[0],tz=threat[2]-c.pos[2],tl=Math.hypot(tx,tz)||1;if(tl<4)continue;const dot=-(tx*c.n[0]+tz*c.n[2])/tl;if(dot<0.55)continue;
    const s=d-dot*2+(tl<10?4:0);if(s<bs){bs=s;best=c;}}}
  if(best){const tx=threat[0]-best.pos[0],tz=threat[2]-best.pos[2],tl=Math.hypot(tx,tz)||1;best.dirToThreat[0]=tx/tl;best.dirToThreat[1]=0;best.dirToThreat[2]=tz/tl;}return best;},
 claim(c,actor){if(c)c.by=actor;},release(c,actor){if(c&&(!actor||c.by===actor))c.by=null;}
};
