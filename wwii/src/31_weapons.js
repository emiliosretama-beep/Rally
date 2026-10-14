// ===== FRENTE 44 · armas: tabla WEAPONS, disparo por rayo, granadas, cohetes, armas en el suelo y arma en primera persona =====
// Campos de WEAPONS: dmg (torso; cabeza x4 y miembros x0.75 los pone Actors) · rpm · mode semi|auto|bolt|rocket · mag · ammo (reserva máx.)
// spread [cadera, apuntando, extra al moverse] rad · recoil [sube, lado] rad por disparo · recMax (tope de subida en ráfaga) · bloom (rad por disparo)
// reload [táctica, vacía] s · range m · fall [m sin caída, m al mínimo, factor mínimo] · adsFov grados · adsT s · move (velocidad)
// pen (paredes finas que atraviesa) · tracer (una de cada n) · rl tipo de recarga · shell casquillo · kick [atrás, cabeceo, giro] en pantalla · boltT s
const WEAPONS={
 garand:{name:'M1 Garand',side:'ally',cls:'rifle',mode:'semi',dmg:72,rpm:380,mag:8,ammo:96,spread:[0.036,0.0016,0.032],recoil:[0.03,0.007],bloom:0.012,reload:[2.5,2.1],range:500,fall:[70,300,0.75],
  adsFov:40,adsT:0.24,move:0.95,model:'garand',rl:'garand',ping:true,pen:2,shell:'shell',kick:[0.075,0.11,0.05]},
 thompson:{name:'Thompson',side:'ally',cls:'smg',mode:'auto',dmg:30,rpm:700,mag:30,ammo:180,spread:[0.048,0.011,0.022],recoil:[0.0075,0.0042],recMax:0.055,bloom:0.0032,reload:[2.4,3.1],range:180,fall:[18,70,0.55],
  adsFov:50,adsT:0.18,move:1,model:'thompson',rl:'mag',tracer:4,pen:1,shell:'shellP',kick:[0.028,0.035,0.03]},
 bar:{name:'B.A.R.',side:'ally',cls:'lmg',mode:'auto',dmg:50,rpm:550,mag:20,ammo:140,spread:[0.065,0.007,0.035],recoil:[0.015,0.006],recMax:0.085,bloom:0.004,reload:[2.7,3.3],range:400,fall:[60,250,0.7],
  adsFov:44,adsT:0.28,move:0.88,model:'bar',rl:'mag',tracer:3,pen:2,shell:'shell',kick:[0.045,0.05,0.035]},
 colt:{name:'M1911',side:'ally',cls:'pistol',mode:'semi',dmg:45,rpm:450,mag:7,ammo:49,spread:[0.026,0.006,0.02],recoil:[0.034,0.01],bloom:0.008,reload:[1.6,2.0],range:80,fall:[15,45,0.55],
  adsFov:55,adsT:0.15,move:1.05,model:'colt',rl:'pistol',pen:0,shell:'shellP',kick:[0.05,0.2,0.06]},
 kar98:{name:'Kar98k',side:'axis',cls:'rifle',mode:'bolt',dmg:105,rpm:60,boltT:1.0,mag:5,ammo:60,spread:[0.045,0.001,0.035],recoil:[0.045,0.008],reload:[3.0,3.0],range:550,fall:[90,350,0.8],
  adsFov:38,adsT:0.26,move:0.95,model:'kar98',rl:'kar98',pen:2,shell:'shell',kick:[0.09,0.13,0.05]},
 kar98s:{name:'Kar98k (visor)',side:'axis',cls:'sniper',mode:'bolt',dmg:120,rpm:50,boltT:1.15,mag:5,ammo:40,spread:[0.07,0,0.05],recoil:[0.05,0.008],reload:[3.3,3.3],range:650,fall:[120,450,0.85],
  adsFov:12,adsT:0.32,move:0.92,model:'kar98s',rl:'kar98',scope:true,adsSens:0.28,pen:2,shell:'shell',kick:[0.09,0.13,0.05]},
 mp40:{name:'MP40',side:'axis',cls:'smg',mode:'auto',dmg:28,rpm:520,mag:32,ammo:192,spread:[0.05,0.011,0.02],recoil:[0.0062,0.0035],recMax:0.05,bloom:0.003,reload:[2.3,2.9],range:160,fall:[18,65,0.55],
  adsFov:50,adsT:0.18,move:1,model:'mp40',rl:'mag',tracer:4,pen:1,shell:'shellP',kick:[0.024,0.03,0.025]},
 stg44:{name:'StG 44',side:'axis',cls:'smg',mode:'auto',dmg:38,rpm:560,mag:30,ammo:180,spread:[0.058,0.009,0.03],recoil:[0.011,0.005],recMax:0.075,bloom:0.0038,reload:[2.4,3.0],range:280,fall:[40,180,0.65],
  adsFov:46,adsT:0.22,move:0.96,model:'stg44',rl:'mag',tracer:4,pen:1,shell:'shell',kick:[0.035,0.04,0.03]},
 mg42mount:{name:'MG42',side:'axis',cls:'mg',mode:'auto',dmg:45,rpm:1150,mag:250,ammo:0,spread:[0.02,0.012,0],recoil:[0.0035,0.004],recMax:0.03,bloom:0.0012,reload:[4,4],range:500,fall:[100,350,0.75],
  adsFov:46,adsT:0.15,move:0,model:'mg42',tracer:3,mounted:true,loud:1.6,pen:2,shell:'shell',heat:0.012,kick:[0.02,0.02,0.02]},
 bazooka:{name:'Bazooka',side:'ally',cls:'launcher',mode:'rocket',dmg:450,radius:6.5,rpm:30,mag:1,ammo:5,spread:[0.03,0.003,0.03],recoil:[0.06,0.01],reload:[3.3,3.3],range:300,speed:75,
  adsFov:42,adsT:0.3,move:0.82,model:'bazooka',rl:'rocket',kick:[0.12,0.09,0.03]},
 frag:{name:'Granada Mk 2',side:'ally',cls:'grenade',dmg:200,radius:7.5,fuse:4.0,count:4,model:'frag'},
 stiel:{name:'Granada de palo',side:'axis',cls:'grenade',dmg:200,radius:7.5,fuse:4.5,count:4,model:'stiel'},
 knife:{name:'Cuchillo',side:'ally',cls:'melee',dmg:150,range:2.0,lunge:3.2}
};
for(const k in WEAPONS)WEAPONS[k].id=k;

// ---------- modelado procedural de las armas ----------
// Espacio del arma: ánima a lo largo de +Z en x=y=0, gatillo en z=0, +Y arriba y +X a la IZQUIERDA del arma (lado derecho = -X).
const WMC=(()=>{const o={},C={wood:'#62391e',wood2:'#74462a',wdk:'#3e2414',mt:'#2a2d30',mt2:'#3a3d41',bl:'#191c20',hi:'#5c6066',od:'#4a5030',od2:'#363b23',
 bak:'#2a201b',bakR:'#4b2b1b',brass:'#c9a24e',sling:'#7f7552',lea:'#4c3320',skin:'#c69478',skin2:'#a97a60',sleeve:'#5f5f3f',sleeve2:'#4b4c31',fg:'#545850',lens:'#30465a',cu:'#b87a48'};
 for(const k in C)o[k]=hex(C[k]);return o;})();
const wmB=(G,x0,x1,y0,y1,z0,z1,c,b)=>b?G.bbox(x0,x1,y0,y1,z0,z1,b,c):G.box(x0,x1,y0,y1,z0,z1,c);
const wmT=(G,z0,z1,r0,r1,c,y,x,seg)=>G.tube([x||0,y||0,z0],[x||0,y||0,z1],r0,r1,seg||8,c);
// arco de cajitas alrededor del eje Z (capuchones de punto de mira, anillas, aros): centro (0,cy), radio r, grosor t, de a0 a a1
const wmArc=(G,cy,r,t,z0,z1,a0,a1,n,c,cx)=>{const da=Math.abs(a1-a0)/n;for(let i=0;i<n;i++){const a=a0+(a1-a0)*(i+0.5)/n,hw=Math.sin(da/2)*r*1.08,m=G.mark();
 G.box(-hw,hw,-t/2,t/2,z0,z1,c);G.xform(m,rotZ(a+Math.PI/2,(cx||0)+Math.cos(a)*r,cy+Math.sin(a)*r,0));}};
// triangulación de un polígono simple (orejas): P = [[u,v],...] -> índices
function wmEar(P){const n=P.length,id=[],out=[];for(let i=0;i<n;i++)id.push(i);let A=0;for(let i=0;i<n;i++){const a=P[i],b=P[(i+1)%n];A+=a[0]*b[1]-b[0]*a[1];}const s=A>0?1:-1;
 const inT=(p,a,b,c)=>{const d1=(p[0]-b[0])*(a[1]-b[1])-(a[0]-b[0])*(p[1]-b[1]),d2=(p[0]-c[0])*(b[1]-c[1])-(b[0]-c[0])*(p[1]-c[1]),d3=(p[0]-a[0])*(c[1]-a[1])-(c[0]-a[0])*(p[1]-a[1]);
  return !((d1<0||d2<0||d3<0)&&(d1>0||d2>0||d3>0));};
 for(let g=0;g<400&&id.length>3;g++){let ok=false;
  for(let i=0;i<id.length;i++){const L=id.length,ia=id[(i+L-1)%L],ib=id[i],ic=id[(i+1)%L],a=P[ia],b=P[ib],c=P[ic],cr=((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))*s;
   if(Math.abs(cr)<1e-11){id.splice(i,1);ok=true;break;}if(cr<0)continue;let inside=false;for(const j of id){if(j===ia||j===ib||j===ic)continue;if(inT(P[j],a,b,c)){inside=true;break;}}
   if(inside)continue;out.push(ia,ib,ic);id.splice(i,1);ok=true;break;}if(!ok)break;}
 if(id.length===3)out.push(id[0],id[1],id[2]);return {tri:out,s};}
// perfil lateral (z, y, media anchura) extruido a lo ancho (X), con bisel b: culatas, empuñaduras, guardamanos
function wmExt(G,pts,col,b,x0){x0=x0||0;b=b||0;const n=pts.length,E=wmEar(pts.map(p=>[p[0],p[1]])),s=E.s;
 // contorno metido hacia dentro (para las tapas biseladas)
 const ins=pts.map((p,i)=>{if(!b)return [p[0],p[1]];const a=pts[(i+n-1)%n],c=pts[(i+1)%n];let e1=[p[0]-a[0],p[1]-a[1]],e2=[c[0]-p[0],c[1]-p[1]];const l1=Math.hypot(...e1)||1,l2=Math.hypot(...e2)||1;
  const n1=[-e1[1]/l1*s,e1[0]/l1*s],n2=[-e2[1]/l2*s,e2[0]/l2*s];let m=[n1[0]+n2[0],n1[1]+n2[1]];const ml=Math.hypot(...m)||1;m=[m[0]/ml,m[1]/ml];const k=b/Math.max(0.35,m[0]*n1[0]+m[1]*n1[1]);return [p[0]+m[0]*k,p[1]+m[1]*k];});
 const V=(q,x)=>[x,q[1],q[0]],cx=(i,sg)=>x0+sg*pts[i][2],cw=(i,sg)=>x0+sg*(pts[i][2]-b);
 for(const sg of [1,-1]){const c=[x0,0,0];for(let k=0;k<E.tri.length;k+=3){const a=E.tri[k],bb=E.tri[k+1],cc=E.tri[k+2];c[1]=(ins[a][1]+ins[bb][1]+ins[cc][1])/3;c[2]=(ins[a][0]+ins[bb][0]+ins[cc][0])/3;
  G.tri(V(ins[a],cx(a,sg)),V(ins[bb],cx(bb,sg)),V(ins[cc],cx(cc,sg)),col,[x0-sg,c[1],c[2]]);}}
 for(let i=0;i<n;i++){const j=(i+1)%n,p=pts[i],q=pts[j],du=q[0]-p[0],dv=q[1]-p[1],l=Math.hypot(du,dv)||1,ou=dv/l*s,ov=-du/l*s,ctr=[x0,(p[1]+q[1])/2-ov*0.002,(p[0]+q[0])/2-ou*0.002];
  G.quad(V(p,cw(i,1)),V(q,cw(j,1)),V(q,cw(j,-1)),V(p,cw(i,-1)),col,ctr);
  if(b){G.quad(V(ins[i],cx(i,1)),V(ins[j],cx(j,1)),V(q,cw(j,1)),V(p,cw(i,1)),col,ctr);G.quad(V(ins[i],cx(i,-1)),V(ins[j],cx(j,-1)),V(q,cw(j,-1)),V(p,cw(i,-1)),col,ctr);}}}
// correa colgante (catenaria) entre a y b por el lado x, con caída sag
function wmSling(G,a,b,sag,x,col,w){const N=7;let pr=null;for(let i=0;i<=N;i++){const t=i/N,p=[x,lerp(a[1],b[1],t)-sag*4*t*(1-t),lerp(a[0],b[0],t)];if(pr)G.beam(pr,p,0.004,w||0.02,col);pr=p;}}
// mano derecha agarrando un mango vertical (eje local Y) en el origen: dorso hacia -X, nudillos delante (+Z), muñeca detrás (-Z)
function wmHand(){const g=new Geo(),C=WMC,sk=C.skin,s2=C.skin2;
 g.rbox(-0.045,-0.015,-0.043,0.04,-0.046,0.026,0.01,sk,2,0.002);
 const F=[[0.027,0.0175],[0.008,0.019],[-0.011,0.018],[-0.029,0.0155]];
 for(const [y,w] of F){g.beam([-0.03,y,0.022],[0.002,y,0.034],w,w*0.95,sk);g.beam([0.002,y,0.034],[0.022,y,0.015],w*0.95,w*0.88,sk);g.beam([0.022,y,0.015],[0.022,y,-0.001],w*0.85,w*0.8,s2);}
 g.beam([-0.032,0.025,-0.032],[-0.008,0.047,-0.014],0.024,0.021,sk);g.beam([-0.008,0.047,-0.014],[0.017,0.044,0.004],0.02,0.017,sk);g.beam([0.017,0.044,0.004],[0.026,0.036,0.014],0.017,0.015,s2);
 g.rbox(-0.043,-0.016,-0.035,0.028,-0.078,-0.04,0.01,s2,2);return g;}
// manga (antebrazo) de longitud 1 a lo largo de +Z: puño en z=0, codo en z=1 (se escala al dibujar)
function wmSleeve(){const g=new Geo(),C=WMC;g.lathe([[0.028,0],[0.033,0.0],[0.034,0.2],[0.031,0.21],[0.035,0.5],[0.033,0.52],[0.04,1],[0.0,1.0]],7,i=>i<2?C.sleeve2:i===3?C.sleeve2:C.sleeve);
 g.xform(0,(v,isN)=>[v[0],v[2],v[1]]);g.cyl(0.03,0.03,0,0.006,7,C.skin2);return g;}
// ---------- cada arma: piezas en su espacio (m metal, w madera; mag, bolt, clip... animadas) ----------
const WM_BUILD={
 kar98(P,scope){const M=P.g('m'),W=P.g('w'),C=WMC;
  wmExt(W,[[0.505,-0.003,0.016],[0.505,-0.028,0.016],[0.33,-0.034,0.018],[0.13,-0.038,0.019],[0.1,-0.05,0.02],[0.0,-0.052,0.02],[-0.042,-0.046,0.019],[-0.07,-0.088,0.017],[-0.118,-0.094,0.017],
   [-0.14,-0.066,0.017],[-0.44,-0.157,0.021],[-0.452,-0.148,0.021],[-0.452,-0.036,0.021],[-0.17,-0.013,0.018],[-0.095,-0.01,0.018],[-0.08,-0.004,0.019],[0.12,-0.002,0.019]],C.wood,0.0045);
  wmB(W,-0.013,0.013,0.0,0.017,0.21,0.43,C.wood2,0.004);
  wmT(M,0.135,0.34,0.0115,0.011,C.mt);wmT(M,0.34,0.705,0.0098,0.0086,C.mt);wmT(M,0.05,0.137,0.0158,0.0158,C.mt,0,0,10);wmT(M,-0.085,0.05,0.0148,0.0148,C.mt,0,0,10);
  wmB(M,-0.012,0.012,0.007,0.021,0.137,0.205,C.mt,0.002);wmB(M,-0.011,0.011,0.019,0.0255,0.16,0.206,C.mt2,0.001);
  wmB(M,-0.0085,-0.0028,0.025,0.031,0.199,0.206,C.bl);wmB(M,0.0028,0.0085,0.025,0.031,0.199,0.206,C.bl);
  wmB(M,-0.0072,0.0072,0.006,0.0135,0.665,0.705,C.mt);wmB(M,-0.0014,0.0014,0.013,0.0285,0.684,0.69,C.bl);wmArc(M,0.0185,0.0115,0.0024,0.673,0.698,0,Math.PI,7,C.mt);
  wmB(M,-0.021,0.021,-0.037,0.02,0.328,0.344,C.mt,0.003);wmB(M,-0.018,0.018,-0.032,0.014,0.468,0.506,C.mt,0.003);wmB(M,-0.006,0.006,-0.044,-0.031,0.45,0.505,C.mt);wmT(M,0.505,0.53,0.003,0.003,C.hi,-0.016,0,5);
  wmB(M,-0.0172,0.0172,-0.058,-0.049,0.004,0.098,C.mt,0.002);wmB(M,-0.004,0.004,-0.068,-0.06,-0.045,0.012,C.mt);wmB(M,-0.004,0.004,-0.068,-0.05,0.008,0.013,C.mt);wmB(M,-0.004,0.004,-0.068,-0.05,-0.048,-0.042,C.mt);
  wmB(M,-0.0016,0.0016,-0.056,-0.036,-0.016,-0.008,C.bl);wmB(M,-0.021,0.021,-0.151,-0.034,-0.458,-0.451,C.mt,0.002);G_disc(M,-0.0215,-0.07,-0.27,0.012,C.mt2);
  wmB(M,0.0102,0.0122,0.004,0.016,-0.045,-0.03,C.mt);wmB(M,-0.0122,-0.0102,0.004,0.016,-0.045,-0.03,C.mt);
  wmSling(W,[-0.33,-0.11],[0.336,-0.025],0.075,0.023,C.lea,0.02);
  const B=P.g('bolt');wmT(B,-0.142,-0.088,0.0108,0.0108,C.mt2,0.001,0,8);wmT(B,-0.158,-0.142,0.0075,0.0085,C.mt,0.001,0,6);wmB(B,-0.003,0.003,0.009,0.02,-0.138,-0.124,C.mt);
  wmT(B,-0.088,0.02,0.0088,0.0088,C.hi,0.001,0,8);B.beam([-0.006,0.0,-0.072],[-0.047,-0.021,-0.078],0.0085,0.0085,C.hi);const m0=B.mark();B.sphere(0.0105,7,5,C.hi);B.translate(m0,-0.051,-0.025,-0.079);
  const Cl=P.g('clip');for(let i=0;i<5;i++){wmT(Cl,-0.03,0.034,0.0055,0.0045,C.brass,0.006-i*0.0105,(i%2?1:-1)*0.004,6);wmT(Cl,0.034,0.046,0.0045,0.0018,C.cu,0.006-i*0.0105,(i%2?1:-1)*0.004,5);}
  wmB(Cl,-0.0085,0.0085,-0.044,0.012,-0.034,-0.03,C.mt2);wmB(Cl,-0.0085,0.0085,-0.044,0.012,0.028,0.032,C.mt2);
  if(scope){wmB(M,-0.008,0.008,0.012,0.05,-0.08,-0.064,C.mt);wmB(M,-0.008,0.008,0.012,0.05,0.098,0.114,C.mt);wmT(M,-0.09,0.15,0.0125,0.0125,C.bl,0.062,0,10);
   wmT(M,0.15,0.19,0.0125,0.0195,C.bl,0.062,0,10);wmT(M,0.19,0.226,0.0195,0.0195,C.bl,0.062,0,10);wmT(M,-0.142,-0.105,0.0175,0.0175,C.bl,0.062,0,10);wmT(M,-0.105,-0.09,0.0175,0.0125,C.bl,0.062,0,10);
   wmArc(M,0.062,0.0145,0.004,-0.076,-0.066,0,Math.PI*2,10,C.mt);wmArc(M,0.062,0.0145,0.004,0.1,0.11,0,Math.PI*2,10,C.mt);
   M.tube([0,0.072,0.02],[0,0.09,0.02],0.0085,0.0085,8,C.bl);M.tube([-0.01,0.062,0.02],[-0.026,0.062,0.02],0.0075,0.0075,8,C.bl);wmT(M,0.2255,0.2262,0.017,0.017,C.lens,0.062,0,10);}},
 garand(P){const M=P.g('m'),W=P.g('w'),C=WMC;
  wmExt(W,[[0.555,-0.004,0.016],[0.555,-0.034,0.017],[0.36,-0.04,0.019],[0.17,-0.042,0.021],[0.05,-0.046,0.022],[-0.04,-0.046,0.021],[-0.075,-0.06,0.019],[-0.12,-0.076,0.019],
   [-0.41,-0.143,0.022],[-0.421,-0.136,0.022],[-0.421,-0.034,0.022],[-0.15,-0.022,0.019],[-0.075,-0.02,0.019],[-0.06,-0.018,0.02],[0.165,-0.015,0.02]],C.wood,0.0045);
  wmB(W,-0.0155,0.0155,-0.004,0.019,0.172,0.345,C.wood2,0.005);wmB(W,-0.015,0.015,-0.004,0.018,0.375,0.545,C.wood2,0.005);
  wmB(M,-0.019,0.019,-0.024,0.021,-0.07,0.17,C.mt,0.004);wmB(M,-0.012,0.012,0.012,0.0215,-0.01,0.085,C.bl);
  wmB(M,-0.014,0.014,0.019,0.031,-0.068,-0.036,C.mt,0.002);wmB(M,-0.0105,0.0105,0.031,0.0405,-0.052,-0.046,C.mt2);wmB(M,-0.0105,0.0105,0.0475,0.052,-0.052,-0.046,C.mt2);wmB(M,-0.0105,-0.0028,0.0405,0.0475,-0.052,-0.046,C.mt2);wmB(M,0.0028,0.0105,0.0405,0.0475,-0.052,-0.046,C.mt2);
  wmB(M,-0.016,-0.0105,0.024,0.054,-0.066,-0.04,C.mt,0.001);wmB(M,0.0105,0.016,0.024,0.054,-0.066,-0.04,C.mt,0.001);
  M.tube([0.014,0.028,-0.052],[0.028,0.028,-0.052],0.0075,0.0075,8,C.mt2);M.tube([-0.014,0.028,-0.052],[-0.028,0.028,-0.052],0.0075,0.0075,8,C.mt2);
  wmT(M,0.17,0.62,0.0108,0.0102,C.mt);wmT(M,0.6,0.715,0.0145,0.0145,C.mt,-0.006,0,10);wmT(M,0.715,0.72,0.0145,0.011,C.mt,-0.006,0,10);
  wmB(M,-0.006,0.006,0.008,0.024,0.665,0.69,C.mt);wmB(M,-0.0015,0.0015,0.024,0.042,0.674,0.68,C.bl);wmB(M,-0.009,-0.0068,0.012,0.044,0.668,0.686,C.mt);wmB(M,0.0068,0.009,0.012,0.044,0.668,0.686,C.mt);
  wmB(M,-0.02,0.02,-0.04,0.021,0.348,0.372,C.mt,0.003);wmB(M,-0.006,0.006,-0.058,-0.038,0.58,0.6,C.mt);wmB(M,-0.007,0.007,-0.032,-0.022,0.55,0.6,C.mt);
  wmB(M,-0.0045,0.0045,-0.072,-0.064,-0.058,0.025,C.mt);wmB(M,-0.0045,0.0045,-0.072,-0.045,0.019,0.026,C.mt);wmB(M,-0.0045,0.0045,-0.072,-0.045,-0.06,-0.052,C.mt);
  wmB(M,-0.0016,0.0016,-0.06,-0.04,-0.01,-0.004,C.bl);wmB(M,-0.022,0.022,-0.14,-0.032,-0.428,-0.42,C.mt,0.002);
  wmSling(W,[-0.31,-0.125],[0.59,-0.058],0.05,0.0,C.sling,0.024);
  const B=P.g('bolt');wmB(B,-0.011,0.011,0.014,0.0245,-0.035,0.04,C.hi,0.002);wmB(B,-0.021,-0.013,-0.012,0.0,0.03,0.4,C.mt);wmB(B,-0.033,-0.016,-0.014,0.008,0.07,0.1,C.mt2,0.003);
  const Cl=P.g('clip');for(let i=0;i<4;i++)for(const sx of [-1,1]){const x=sx*0.0055,y=0.006-i*0.0115+(sx>0?0.0055:0);wmT(Cl,-0.004,0.062,0.0058,0.0048,C.brass,y,x,6);wmT(Cl,0.062,0.074,0.0048,0.002,C.cu,y,x,5);}
  wmB(Cl,-0.0125,0.0125,-0.045,0.016,-0.006,-0.003,C.mt2);wmB(Cl,-0.0125,0.0125,-0.045,0.016,0.058,0.061,C.mt2);},
 thompson(P){const M=P.g('m'),W=P.g('w'),C=WMC;
  wmExt(W,[[-0.105,0.024,0.017],[-0.105,-0.03,0.017],[-0.15,-0.042,0.017],[-0.41,-0.118,0.021],[-0.424,-0.112,0.021],[-0.424,-0.014,0.02],[-0.16,0.012,0.017]],C.wood,0.004);
  wmExt(W,[[-0.004,-0.03,0.015],[-0.043,-0.03,0.015],[-0.08,-0.122,0.016],[-0.05,-0.13,0.016],[-0.022,-0.11,0.015]],C.wood,0.004);
  wmB(W,-0.018,0.018,-0.05,-0.01,0.19,0.33,C.wood2,0.006);
  wmB(M,-0.022,0.022,-0.03,0.034,-0.108,0.19,C.mt,0.004);wmB(M,-0.017,0.017,0.03,0.04,-0.06,0.17,C.mt2,0.003);wmB(M,-0.0235,-0.021,-0.004,0.016,0.03,0.11,C.bl);
  wmB(M,-0.006,0.006,0.04,0.05,-0.075,-0.05,C.mt,0.001);wmB(M,-0.0105,-0.0055,0.04,0.062,-0.072,-0.052,C.mt);wmB(M,0.0055,0.0105,0.04,0.062,-0.072,-0.052,C.mt);
  wmB(M,-0.0018,0.0018,0.05,0.0565,-0.067,-0.058,C.bl);
  wmT(M,0.19,0.41,0.0105,0.0098,C.mt);wmB(M,-0.006,0.006,0.008,0.03,0.385,0.402,C.mt);wmB(M,-0.0015,0.0015,0.03,0.056,0.388,0.398,C.bl);
  wmB(M,-0.018,0.018,-0.05,-0.028,0.04,0.105,C.mt,0.003);wmB(M,-0.004,0.004,-0.062,-0.054,-0.045,0.04,C.mt);wmB(M,-0.004,0.004,-0.062,-0.03,0.034,0.04,C.mt);wmB(M,-0.0016,0.0016,-0.052,-0.034,0.012,0.018,C.bl);
  wmB(M,-0.022,0.022,-0.112,-0.012,-0.43,-0.423,C.mt,0.002);wmB(M,-0.005,0.005,-0.06,-0.044,0.24,0.25,C.mt);
  wmSling(W,[-0.33,-0.1],[0.245,-0.06],0.06,0.019,C.sling,0.022);
  const B=P.g('bolt');B.tube([-0.022,0.012,0.09],[-0.036,0.012,0.09],0.0065,0.0075,8,C.hi);
  const Mg=P.g('mag');wmB(Mg,-0.0125,0.0125,-0.235,-0.028,0.052,0.096,C.mt2,0.0025);wmB(Mg,-0.013,0.013,-0.24,-0.229,0.05,0.098,C.mt,0.002);for(let i=0;i<5;i++)wmB(Mg,-0.0128,0.0128,-0.06-i*0.035,-0.057-i*0.035,0.053,0.095,C.mt);},
 bar(P){const M=P.g('m'),W=P.g('w'),C=WMC;
  wmExt(W,[[-0.115,0.022,0.019],[-0.115,-0.035,0.019],[-0.16,-0.052,0.018],[-0.2,-0.075,0.019],[-0.465,-0.14,0.023],[-0.478,-0.133,0.023],[-0.478,-0.018,0.022],[-0.18,0.012,0.019]],C.wood,0.0045);
  wmB(W,-0.021,0.021,-0.052,0.0,0.26,0.5,C.wood2,0.006);
  wmB(M,-0.024,0.024,-0.04,0.034,-0.118,0.262,C.mt,0.004);wmB(M,-0.02,0.02,-0.06,-0.035,-0.06,0.03,C.mt,0.003);
  wmB(M,-0.004,0.004,-0.074,-0.066,-0.05,0.02,C.mt);wmB(M,-0.004,0.004,-0.074,-0.05,0.016,0.021,C.mt);wmB(M,-0.0016,0.0016,-0.064,-0.046,-0.004,0.002,C.bl);
  wmB(M,-0.012,0.012,0.034,0.046,-0.11,-0.075,C.mt,0.002);wmB(M,-0.0035,0.0035,0.046,0.066,-0.1,-0.095,C.mt);wmArc(M,0.058,0.006,0.002,-0.101,-0.094,0,Math.PI*2,8,C.mt2);
  wmT(M,0.262,0.88,0.0125,0.0115,C.mt);wmT(M,0.262,0.63,0.0095,0.0095,C.mt,-0.03,0,7);wmT(M,0.86,0.93,0.0135,0.0175,C.bl,0,0,9);
  wmB(M,-0.006,0.006,0.008,0.036,0.83,0.85,C.mt);wmB(M,-0.0015,0.0015,0.036,0.06,0.835,0.845,C.bl);wmB(M,-0.009,-0.007,0.015,0.058,0.832,0.848,C.mt);wmB(M,0.007,0.009,0.015,0.058,0.832,0.848,C.mt);
  wmB(M,-0.02,0.02,-0.028,0.016,0.76,0.79,C.mt,0.003);M.beam([0.012,-0.02,0.775],[0.026,-0.06,0.5],0.008,0.008,C.mt2);M.beam([-0.012,-0.02,0.775],[-0.026,-0.06,0.5],0.008,0.008,C.mt2);
  wmB(M,0.018,0.034,-0.07,-0.054,0.49,0.51,C.mt2);wmB(M,-0.034,-0.018,-0.07,-0.054,0.49,0.51,C.mt2);
  wmB(M,-0.023,0.023,-0.138,-0.016,-0.486,-0.478,C.mt,0.002);wmB(M,-0.025,-0.022,-0.01,0.02,0.04,0.13,C.bl);
  wmSling(W,[-0.36,-0.115],[0.47,-0.055],0.05,0.022,C.sling,0.024);
  const B=P.g('bolt');B.tube([0.024,0.006,0.17],[0.038,0.006,0.17],0.0065,0.008,8,C.hi);
  const Mg=P.g('mag');wmB(Mg,-0.0165,0.0165,-0.15,-0.035,0.035,0.105,C.mt2,0.003);wmB(Mg,-0.017,0.017,-0.155,-0.145,0.033,0.107,C.mt,0.002);wmB(Mg,-0.0168,0.0168,-0.1,-0.095,0.036,0.104,C.mt);},
 colt(P){const M=P.g('m'),W=P.g('w'),C=WMC;
  wmB(M,-0.0128,0.0128,-0.032,-0.012,-0.07,0.118,C.mt,0.002);
  wmExt(M,[[-0.022,-0.012,0.0128],[-0.078,-0.012,0.0128],[-0.085,-0.022,0.0128],[-0.108,-0.12,0.0135],[-0.07,-0.128,0.0135],[-0.045,-0.032,0.0128]],C.mt,0.002);
  wmExt(W,[[-0.03,-0.04,0.0158],[-0.074,-0.034,0.0158],[-0.098,-0.11,0.0158],[-0.074,-0.117,0.0158],[-0.052,-0.06,0.0158]],C.bakR,0.0025);
  wmB(M,-0.004,0.004,-0.05,-0.044,-0.042,0.012,C.mt);wmB(M,-0.004,0.004,-0.05,-0.03,0.008,0.013,C.mt);wmB(M,-0.0018,0.0018,-0.043,-0.028,-0.02,-0.013,C.bl);
  wmB(M,-0.006,0.006,0.012,0.032,-0.088,-0.077,C.mt2);wmB(M,-0.012,0.012,-0.02,-0.01,-0.092,-0.075,C.mt);
  const B=P.g('bolt');wmB(B,-0.0145,0.0145,-0.012,0.015,-0.077,0.13,C.mt2,0.0025);for(let i=0;i<6;i++)wmB(B,-0.0148,0.0148,-0.009,0.012,-0.072+i*0.006,-0.0695+i*0.006,C.bl);
  wmB(B,-0.006,0.006,0.015,0.0235,-0.072,-0.062,C.mt);wmB(B,-0.0015,0.0015,0.0195,0.0245,-0.0725,-0.0615,C.bl);wmB(B,-0.0018,0.0018,0.015,0.0235,0.112,0.122,C.mt);
  wmB(B,-0.0152,-0.0145,0.0,0.012,-0.01,0.03,C.bl);wmT(B,0.13,0.134,0.0075,0.0075,C.bl,0,0,8);
  const Mg=P.g('mag');wmB(Mg,-0.0108,0.0108,-0.135,-0.03,-0.098,-0.062,C.mt2,0.002);const m0=Mg.mark();Mg.xform(m0,rotX(-0.32,0,-0.0,-0.0));},
 mp40(P){const M=P.g('m'),W=P.g('w'),C=WMC;
  wmT(M,-0.125,0.185,0.0172,0.0172,C.mt,0.004,0,10);wmT(M,0.185,0.39,0.0098,0.0092,C.mt);wmT(M,0.39,0.42,0.0108,0.0108,C.mt);
  wmB(M,-0.004,0.004,-0.04,-0.008,0.33,0.36,C.mt);wmB(M,-0.006,0.006,0.008,0.016,0.398,0.42,C.mt);wmB(M,-0.0014,0.0014,0.014,0.0345,0.405,0.411,C.bl);wmArc(M,0.023,0.012,0.0025,0.398,0.418,0,Math.PI,7,C.mt);
  wmB(M,-0.008,0.008,0.018,0.03,-0.01,0.03,C.mt);wmB(M,-0.006,0.006,0.026,0.038,0.008,0.014,C.mt2);wmB(M,-0.0016,0.0016,0.036,0.039,0.008,0.014,C.bl);
  wmExt(W,[[0.04,-0.006,0.0165],[-0.125,-0.006,0.0165],[-0.125,-0.04,0.016],[-0.02,-0.042,0.016],[0.04,-0.034,0.0165]],C.bak,0.003);
  wmExt(W,[[-0.004,-0.04,0.0145],[-0.046,-0.04,0.0145],[-0.078,-0.128,0.0155],[-0.045,-0.136,0.0155],[-0.02,-0.11,0.0145]],C.bak,0.004);
  wmB(M,-0.0165,0.0165,-0.085,-0.006,0.045,0.105,C.mt,0.003);wmB(M,-0.004,0.004,-0.056,-0.05,-0.008,0.045,C.mt);wmB(M,-0.0016,0.0016,-0.05,-0.034,0.01,0.016,C.bl);
  for(const sx of [-1,1]){M.beam([sx*0.012,-0.012,-0.12],[sx*0.012,-0.03,-0.405],0.006,0.01,C.mt);M.beam([sx*0.012,-0.035,-0.12],[sx*0.012,-0.085,-0.4],0.006,0.008,C.mt);}
  wmB(M,-0.016,0.016,-0.11,-0.02,-0.42,-0.4,C.mt,0.004);wmB(M,0.0172,0.0185,-0.002,0.01,-0.09,0.08,C.bl);
  const B=P.g('bolt');B.tube([0.014,0.004,0.07],[0.032,0.004,0.07],0.004,0.004,6,C.mt2);const m0=B.mark();B.sphere(0.0065,6,4,C.mt2);B.translate(m0,0.034,0.004,0.07);
  const Mg=P.g('mag');wmB(Mg,-0.0112,0.0112,-0.275,-0.03,0.058,0.09,C.mt2,0.0025);wmB(Mg,-0.0118,0.0118,-0.28,-0.27,0.056,0.092,C.mt,0.002);for(let i=0;i<3;i++)wmB(Mg,-0.0114,0.0114,-0.1-i*0.05,-0.085-i*0.05,0.059,0.089,C.mt);},
 stg44(P){const M=P.g('m'),W=P.g('w'),C=WMC;
  wmExt(W,[[-0.098,0.03,0.018],[-0.098,-0.035,0.018],[-0.42,-0.122,0.021],[-0.432,-0.116,0.021],[-0.432,0.0,0.02],[-0.16,0.03,0.018]],C.wood,0.0045);
  wmExt(W,[[-0.004,-0.036,0.0145],[-0.045,-0.036,0.0145],[-0.078,-0.128,0.0155],[-0.046,-0.135,0.0155],[-0.02,-0.1,0.0145]],C.wood2,0.004);
  wmB(M,-0.018,0.018,-0.012,0.04,-0.1,0.205,C.mt,0.004);wmB(M,-0.0165,0.0165,-0.042,-0.01,-0.1,0.05,C.mt,0.003);wmB(M,-0.0192,-0.017,0.002,0.025,0.06,0.13,C.bl);
  wmB(M,-0.009,0.009,0.04,0.05,0.1,0.18,C.mt,0.002);wmB(M,-0.008,0.008,0.05,0.056,0.14,0.18,C.mt2);wmB(M,-0.0074,-0.0024,0.054,0.06,0.172,0.178,C.bl);wmB(M,0.0024,0.0074,0.054,0.06,0.172,0.178,C.bl);
  wmT(M,0.205,0.43,0.0135,0.0135,C.mt,0.018,0,9);wmT(M,0.205,0.56,0.0092,0.0088,C.mt);wmB(M,-0.012,0.012,-0.008,0.03,0.415,0.445,C.mt,0.002);
  wmB(M,-0.0014,0.0014,0.03,0.0575,0.43,0.436,C.bl);wmArc(M,0.044,0.0125,0.0026,0.425,0.442,0,Math.PI,7,C.mt);wmT(M,0.545,0.565,0.0115,0.0115,C.mt);
  wmB(M,-0.016,0.016,-0.075,-0.035,0.05,0.115,C.mt,0.003);wmB(M,-0.004,0.004,-0.058,-0.051,-0.004,0.05,C.mt);wmB(M,-0.0016,0.0016,-0.05,-0.034,0.014,0.02,C.bl);
  wmB(M,-0.021,0.021,-0.118,0.004,-0.44,-0.432,C.mt,0.002);
  wmSling(W,[-0.35,-0.095],[0.44,-0.008],0.06,0.02,C.lea,0.02);
  const B=P.g('bolt');B.tube([0.012,0.02,0.19],[0.03,0.024,0.19],0.004,0.0045,6,C.mt2);const m0=B.mark();B.sphere(0.0062,6,4,C.mt2);B.translate(m0,0.032,0.025,0.19);
  const Mg=P.g('mag');for(let i=0;i<6;i++){const y0=-0.04-i*0.037,z0=0.06+i*i*0.0022+i*0.004;wmB(Mg,-0.0128,0.0128,y0-0.039,y0,z0,z0+0.047,C.mt2,0.002);}wmB(Mg,-0.0132,0.0132,-0.27,-0.258,0.162,0.212,C.mt);},
 mg42(P){const M=P.g('m'),W=P.g('w'),C=WMC;
  wmB(M,-0.028,0.028,-0.032,0.034,-0.13,0.2,C.mt,0.004);wmB(M,-0.026,0.026,0.034,0.054,-0.06,0.16,C.mt2,0.004);wmB(M,-0.01,0.01,0.054,0.06,0.0,0.06,C.mt);
  wmB(M,-0.022,0.022,-0.022,0.022,0.2,0.74,C.mt,0.004);for(let i=0;i<9;i++){const z=0.24+i*0.055;for(const sx of [-1,1])wmB(M,sx*0.0222,sx*0.0226,-0.012,0.012,z,z+0.035,C.bl);wmB(M,-0.012,0.012,0.0222,0.0226,z,z+0.035,C.bl);}
  wmB(M,-0.0228,-0.0222,-0.016,0.016,0.24,0.42,C.bl);wmT(M,0.74,0.8,0.016,0.019,C.mt,0,0,9);wmT(M,0.8,0.83,0.019,0.012,C.bl,0,0,9);
  wmB(M,-0.006,0.006,0.022,0.04,0.71,0.725,C.mt);wmB(M,-0.0015,0.0015,0.04,0.058,0.714,0.72,C.bl);wmB(M,-0.012,0.012,0.022,0.034,0.2,0.24,C.mt,0.002);wmB(M,-0.009,0.009,0.034,0.054,0.226,0.232,C.mt2);wmB(M,-0.0025,0.0025,0.05,0.056,0.226,0.232,C.bl);
  wmExt(W,[[-0.13,0.03,0.022],[-0.13,-0.03,0.022],[-0.44,-0.075,0.026],[-0.452,-0.07,0.026],[-0.452,0.012,0.026],[-0.2,0.034,0.022]],C.bak,0.005);
  wmExt(W,[[-0.004,-0.032,0.016],[-0.045,-0.032,0.016],[-0.075,-0.128,0.017],[-0.042,-0.136,0.017],[-0.018,-0.1,0.016]],C.bak,0.004);
  wmB(M,-0.004,0.004,-0.058,-0.05,-0.005,0.05,C.mt);wmB(M,-0.0016,0.0016,-0.05,-0.034,0.014,0.02,C.bl);
  M.beam([0.012,-0.02,0.62],[0.05,-0.3,0.66],0.012,0.012,C.mt2);M.beam([-0.012,-0.02,0.62],[-0.05,-0.3,0.66],0.012,0.012,C.mt2);wmB(M,-0.02,0.02,-0.03,0.0,0.6,0.64,C.mt,0.003);
  wmB(M,-0.032,-0.026,-0.004,0.01,0.12,0.14,C.hi);
  const Bt=P.g('belt');for(let i=0;i<9;i++){const x=0.034+i*0.013,y=-0.004-i*i*0.0024;wmT(Bt,-0.028,0.03,0.0055,0.0048,C.brass,y,x,6);wmT(Bt,0.03,0.04,0.0048,0.0018,C.cu,y,x,5);wmB(Bt,x-0.0066,x+0.0066,y-0.007,y+0.007,-0.012,0.008,C.mt2);}},
 bazooka(P){const M=P.g('m'),W=P.g('w'),C=WMC;
  wmT(M,-0.7,0.66,0.031,0.031,C.od,0,0,12);wmT(M,0.64,0.69,0.033,0.04,C.od2,0,0,12);for(let i=0;i<4;i++)wmT(M,-0.69+i*0.02,-0.68+i*0.02,0.0335,0.0335,C.od2,0,0,12);
  wmT(M,-0.705,-0.7,0.031,0.028,C.bl,0,0,12);
  wmExt(W,[[-0.12,-0.025,0.02],[-0.32,-0.025,0.02],[-0.36,-0.07,0.022],[-0.14,-0.078,0.02]],C.wood,0.004);
  wmExt(W,[[0.015,-0.028,0.014],[-0.025,-0.028,0.014],[-0.055,-0.125,0.015],[-0.025,-0.132,0.015],[-0.004,-0.1,0.014]],C.wood,0.004);
  wmExt(W,[[0.26,-0.028,0.014],[0.22,-0.028,0.014],[0.205,-0.125,0.015],[0.235,-0.132,0.015],[0.25,-0.1,0.014]],C.wood,0.004);
  wmB(M,-0.035,0.035,-0.033,0.0,-0.03,0.03,C.od2,0.003);wmB(M,-0.035,0.035,-0.033,0.0,0.2,0.27,C.od2,0.003);wmB(M,-0.004,0.004,-0.052,-0.044,-0.04,0.03,C.mt);
  wmB(M,0.03,0.05,-0.06,-0.03,-0.22,-0.14,C.od2,0.003);
  wmB(M,0.03,0.05,-0.004,0.008,-0.18,-0.16,C.mt);wmB(M,0.047,0.059,0.005,0.04,-0.176,-0.168,C.mt);wmArc(M,0.032,0.0055,0.002,-0.177,-0.167,0,Math.PI*2,8,C.bl,0.053);
  wmB(M,0.03,0.052,-0.004,0.006,0.3,0.32,C.mt);wmB(M,0.046,0.05,0.004,0.06,0.304,0.316,C.mt);wmB(M,0.062,0.066,0.004,0.06,0.304,0.316,C.mt);wmB(M,0.046,0.066,0.056,0.06,0.304,0.316,C.mt);
  wmB(M,0.0525,0.0555,0.022,0.033,0.306,0.314,C.bl);wmB(M,-0.012,0.012,0.028,0.045,-0.62,-0.58,C.od2,0.003);
  const R=P.g('rocket');R.lathe([[0,0.0],[0.026,0.03],[0.03,0.09],[0.03,0.16],[0.019,0.19],[0.019,0.44],[0,0.44]].map(p=>[p[0],p[1]]),10,i=>i<3?C.od:C.fg);R.xform(0,(v,isN)=>isN?[v[0],v[2],-v[1]]:[v[0],v[2],0.44-v[1]]);
  for(let i=0;i<4;i++){const a=i*Math.PI/2,m0=R.mark();R.box(-0.002,0.002,0.0,0.03,0.0,0.07,C.fg);R.xform(m0,rotZ(a,0,0,0));}},
 frag(P){const G=P.g('m'),C=WMC;G.lathe([[0,-0.032],[0.018,-0.03],[0.027,-0.018],[0.029,0.0],[0.027,0.018],[0.018,0.03],[0.011,0.033],[0,0.034]],10,i=>i%2?C.od:C.od2);
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2,m0=G.mark();G.box(-0.0016,0.0016,-0.028,0.028,0.0285,0.0305,C.od2);G.xform(m0,rotY(a,0,0,0));}
  wmB(G,-0.006,0.006,0.032,0.05,-0.006,0.006,C.mt2);G.beam([0.0,0.048,0.006],[0.0,0.03,0.03],0.008,0.0025,C.od);G.beam([0.0,0.03,0.03],[0.0,-0.01,0.031],0.008,0.0025,C.od);
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2,b=(i+1)/8*Math.PI*2;G.beam([-0.008,0.042+Math.sin(a)*0.012,-0.012+Math.cos(a)*0.012],[-0.008,0.042+Math.sin(b)*0.012,-0.012+Math.cos(b)*0.012],0.0025,0.0025,C.hi);}},
 stiel(P){const G=P.g('m'),W=P.g('w'),C=WMC;wmT(W,-0.27,0.0,0.0125,0.0125,C.wood2,0,0,8);wmT(G,-0.285,-0.27,0.014,0.0145,C.mt2,0,0,8);wmT(G,0.0,0.075,0.032,0.032,C.fg,0,0,12);wmT(G,0.075,0.08,0.032,0.026,C.fg,0,0,12);wmT(G,-0.008,0.0,0.016,0.032,C.fg,0,0,12);},
 knife(P){const G=P.g('m'),W=P.g('w'),C=WMC;wmT(W,-0.12,0.0,0.0125,0.0135,C.lea,0,0,7);for(let i=0;i<5;i++)wmT(W,-0.11+i*0.022,-0.1+i*0.022,0.0142,0.0142,C.wdk,0,0,7);
  wmB(G,-0.008,0.008,-0.03,0.02,0.0,0.008,C.mt2);wmT(G,-0.132,-0.12,0.012,0.015,C.mt2,0,0,7);
  wmExt(G,[[0.008,0.012,0.0025],[0.17,0.004,0.0012],[0.178,-0.002,0.001],[0.15,-0.012,0.0012],[0.008,-0.012,0.0025]],C.hi,0.001);}
};
// disco (tornillo pasante de la culata del Kar98) en el lado derecho
function G_disc(G,x,y,z,r,c){G.tube([x,y,z],[x-0.002,y,z],r,r,8,c);}
// datos de cada modelo para la vista en primera persona (espacio del arma): sl altura de la línea de miras, eye distancia ojo-gatillo al apuntar,
// hip [x,y,z (cámara: +X izquierda), rumbo, cabeceo, giro], fov y fov al apuntar del arma, rh/lh manos [x,y,z, rumbo, cabeceo, giro],
// muz boca, port expulsión y ej su velocidad, mag (desplazamientos 'out'/'away'), bolt (dirección y recorrido), anclas de la recarga
const WM_META={
 garand:{sl:0.044,eye:0.3,hip:[-0.13,-0.15,0.27,0.03,0.02,-0.04],fov:54,afov:46,muz:[0,0,0.73],port:[-0.006,0.03,0.02],ej:[-0.9,2.6,-0.3],
  rh:[-0.004,-0.058,-0.072,0,-0.5,0.15],lh:[0.02,-0.033,0.29,0.05,1.45,-1.75],bolt:{z:-0.085},clip:true,
  A:{opRod:[-0.03,-0.012,0.07,0.2,0.1,0.6],pouchR:[-0.12,-0.32,-0.1,0.3,0.6,0.8],clipH:[-0.02,0.07,0.03,0.3,-1.2,0.6]}},
 kar98:{sl:0.028,eye:0.4,hip:[-0.13,-0.145,0.25,0.03,0.02,-0.05],fov:54,afov:48,muz:[0,0,0.71],port:[-0.012,0.012,0.0],ej:[-1.6,1.8,-0.3],
  rh:[-0.004,-0.056,-0.098,0,-0.75,0.1],lh:[0.02,-0.033,0.25,0.05,1.45,-1.75],bolt:{z:-0.1,lift:-1.35},strip:true,
  A:{knob:[-0.06,-0.02,-0.11,0.3,-0.2,0.9],pouchR:[-0.12,-0.32,-0.12,0.3,0.6,0.8],stripH:[-0.0,0.075,-0.0,0.3,-1.2,0.5]}},
 kar98s:{sl:0.062,eye:0.42,hip:[-0.13,-0.16,0.25,0.03,0.02,-0.05],fov:54,afov:48,muz:[0,0,0.71],port:[-0.012,0.012,0.0],ej:[-1.6,1.8,-0.3],
  rh:[-0.004,-0.056,-0.098,0,-0.75,0.1],lh:[0.02,-0.033,0.25,0.05,1.45,-1.75],bolt:{z:-0.1,lift:-1.35},strip:true,
  A:{knob:[-0.06,-0.02,-0.11,0.3,-0.2,0.9],pouchR:[-0.12,-0.32,-0.12,0.3,0.6,0.8],stripH:[-0.0,0.075,-0.0,0.3,-1.2,0.5]}},
 thompson:{sl:0.0545,eye:0.32,hip:[-0.135,-0.15,0.3,0.035,0.02,-0.04],fov:54,afov:46,muz:[0,0,0.415],port:[-0.024,0.008,0.07],ej:[-2.2,1.4,0.1],
  rh:[-0.004,-0.072,-0.052,0,-0.55,0.12],lh:[0.02,-0.04,0.26,0.05,1.5,-1.65],mag:{out:[0,-0.11,0.0],away:[0.06,-0.5,-0.1]},bolt:{z:-0.085},
  A:{magH:[0.002,-0.16,0.075,0.0,-0.05,-0.1],charge:[-0.045,0.012,0.09,-0.4,0.1,0.9],pouch:[0.14,-0.4,0.0,0.2,0.4,-0.6]}},
 bar:{sl:0.058,eye:0.33,hip:[-0.13,-0.155,0.26,0.03,0.02,-0.04],fov:54,afov:46,muz:[0,0,0.93],port:[-0.026,0.01,0.08],ej:[-2.2,1.5,0.1],
  rh:[-0.004,-0.075,-0.13,0,-0.75,0.12],lh:[0.02,-0.048,0.36,0.05,1.5,-1.65],mag:{out:[0,-0.1,0.0],away:[0.06,-0.5,-0.1]},bolt:{z:-0.1},
  A:{magH:[0.002,-0.12,0.07,0.0,-0.05,-0.1],charge:[0.05,0.006,0.17,0.3,0.1,-0.9],pouch:[0.14,-0.4,0.0,0.2,0.4,-0.6]}},
 colt:{sl:0.024,eye:0.5,hip:[-0.11,-0.13,0.42,0.06,0.04,-0.02],fov:54,afov:50,muz:[0,0,0.135],port:[-0.015,0.012,0.0],ej:[-2,2,-0.2],
  rh:[-0.002,-0.074,-0.06,0,-0.32,0.08],lh:[0.016,-0.088,-0.06,0.3,-0.32,-0.25],mag:{out:[0,-0.08,-0.025],away:[0.0,-0.45,-0.12]},bolt:{z:-0.04},
  A:{magH:[0.03,-0.17,-0.1,0.6,-0.6,-0.4],pouch:[0.14,-0.4,-0.1,0.2,0.4,-0.6],sup:[0.016,-0.088,-0.06,0.3,-0.32,-0.25]}},
 mp40:{sl:0.035,eye:0.34,hip:[-0.135,-0.15,0.3,0.035,0.02,-0.04],fov:54,afov:46,muz:[0,0,0.425],port:[-0.018,0.006,0.06],ej:[-2.2,1.3,0.1],
  rh:[-0.004,-0.078,-0.052,0,-0.55,0.12],lh:[0.002,-0.05,0.075,0.0,0.05,-0.1],mag:{out:[0,-0.11,0.0],away:[0.06,-0.5,-0.1]},bolt:{z:-0.15},
  A:{magH:[0.002,-0.2,0.074,0.0,-0.05,-0.1],charge:[0.048,0.004,0.06,0.3,0.1,-0.9],pouch:[0.14,-0.4,0.0,0.2,0.4,-0.6]}},
 stg44:{sl:0.057,eye:0.3,hip:[-0.135,-0.15,0.28,0.035,0.02,-0.04],fov:54,afov:46,muz:[0,0,0.565],port:[-0.02,0.012,0.09],ej:[-2.2,1.4,0.1],
  rh:[-0.004,-0.075,-0.052,0,-0.55,0.12],lh:[0.02,-0.023,0.3,0.05,1.5,-1.65],mag:{out:[0,-0.1,0.02],away:[0.06,-0.5,-0.1]},bolt:{z:-0.1},
  A:{magH:[0.002,-0.17,0.12,0.0,-0.3,-0.1],charge:[0.046,0.024,0.18,0.3,0.1,-0.9],pouch:[0.14,-0.4,0.0,0.2,0.4,-0.6]}},
 mg42:{sl:0.052,eye:0.4,hip:[0,-0.13,0.3,0,0,0],fov:56,afov:48,muz:[0,0,0.83],port:[0,-0.035,0.05],ej:[0.2,-1.5,0.2],
  rh:[-0.002,-0.072,-0.052,0,-0.5,0.1],lh:[0.03,-0.03,-0.2,0.6,-1.2,-0.4]},
 bazooka:{sl:0.032,sx:0.053,eye:0.45,hip:[-0.12,-0.1,0.2,0.04,0.0,0.0],fov:56,afov:50,muz:[0,0,0.69],
  rh:[-0.002,-0.075,-0.04,0,-0.35,0.1],lh:[-0.002,-0.075,0.215,0,-0.35,-0.1],A:{rocketH:[0.03,-0.02,-0.95,0.3,0.0,-0.4],pouchR:[-0.2,-0.4,-0.4,0.3,0.6,0.8]}}
};
// ---------- coreografía de recargas: pistas [u, valor] (u de 0 a 1 de la duración) ----------
// W pose del arma [x,y,z,cabeceo,rumbo,giro] (cámara) · L/R manos (anclas por nombre) · mag 'in'|'out'|'away' · B cerrojo atrás 0..1 · K cerrojo levantado 0..1
// steps: eventos 'reloadStep' · commit: momento en que entra la munición
const WT_P0=[0,0,0,0,0,0],WT_TILT=[0.07,0.045,-0.02,0.25,-0.1,0.6],WT_SLAP=[0.07,0.06,-0.02,0.32,-0.1,0.55],WT_GT=[0.045,0.02,-0.02,0.12,-0.22,0.35],WT_GSL=[0.045,0.03,-0.035,0.2,-0.22,0.3],
 WT_KT=[0.025,0.01,-0.01,0.12,-0.14,0.32],WT_KB=[0,-0.006,0,0.03,0,0.16],WT_PT=[0.03,0.02,-0.06,0.35,-0.3,-0.4],WT_RT=[0.02,-0.07,-0.06,0.25,-0.15,0.2];
const WT={
 magT:{W:[[0,WT_P0],[0.15,WT_TILT],[0.78,WT_TILT],[0.86,WT_SLAP],[1,WT_P0]],L:[[0,'fore'],[0.15,'magH'],[0.25,'magH'],[0.37,'magH'],[0.5,'pouch'],[0.58,'pouch'],[0.7,'magH'],[0.86,'magH'],[1,'fore']],
  mag:[[0,'in'],[0.25,'in'],[0.37,'out'],[0.5,'away'],[0.58,'away'],[0.7,'out'],[0.8,'in'],[1,'in']],steps:[[0.28,'out'],[0.8,'in']],commit:0.8},
 magE:{W:[[0,WT_P0],[0.12,WT_TILT],[0.62,WT_TILT],[0.68,WT_SLAP],[0.74,'chg'],[0.9,'chg'],[1,WT_P0]],L:[[0,'fore'],[0.12,'magH'],[0.2,'magH'],[0.3,'magH'],[0.42,'pouch'],[0.5,'pouch'],[0.6,'magH'],[0.7,'magH'],[0.78,'charge'],[0.88,'charge'],[0.96,'fore'],[1,'fore']],
  mag:[[0,'in'],[0.2,'in'],[0.3,'out'],[0.42,'away'],[0.5,'away'],[0.6,'out'],[0.67,'in'],[1,'in']],B:[[0,0],[0.81,0],[0.85,1],[0.87,1],[0.89,0],[1,0]],steps:[[0.24,'out'],[0.67,'in'],[0.85,'charge']],commit:0.67},
 pisT:{W:[[0,WT_P0],[0.12,WT_PT],[0.85,WT_PT],[1,WT_P0]],L:[[0,'sup'],[0.14,'pouch'],[0.42,'pouch'],[0.6,'magH'],[0.72,'magH'],[0.84,'sup'],[1,'sup']],
  mag:[[0,'in'],[0.08,'in'],[0.22,'away'],[0.45,'away'],[0.6,'out'],[0.72,'in'],[1,'in']],steps:[[0.1,'out'],[0.72,'in']],commit:0.72},
 pisE:{W:[[0,WT_P0],[0.12,WT_PT],[0.85,WT_PT],[1,WT_P0]],L:[[0,'sup'],[0.12,'pouch'],[0.4,'pouch'],[0.55,'magH'],[0.66,'magH'],[0.76,'sup'],[1,'sup']],
  mag:[[0,'in'],[0.08,'in'],[0.2,'away'],[0.42,'away'],[0.55,'out'],[0.66,'in'],[1,'in']],B:[[0,1],[0.78,1],[0.81,0],[1,0]],steps:[[0.1,'out'],[0.66,'in'],[0.8,'charge']],commit:0.66},
 garE:{W:[[0,WT_P0],[0.15,WT_GT],[0.8,WT_GT],[0.85,WT_GSL],[1,WT_P0]],R:[[0,'grip'],[0.12,'pouchR'],[0.32,'pouchR'],[0.5,'clipH'],[0.58,'clipD'],[0.66,'clipD'],[0.72,'opRod'],[0.78,'opRod'],[0.9,'grip'],[1,'grip']],
  B:[[0,1],[0.77,1],[0.8,0],[1,0]],clip:[0.22,0.6],steps:[[0.6,'clip'],[0.79,'bolt']],commit:0.6},
 garT:{W:[[0,WT_P0],[0.12,WT_GT],[0.82,WT_GT],[0.87,WT_GSL],[1,WT_P0]],R:[[0,'grip'],[0.08,'opRod'],[0.14,'opRod'],[0.24,'pouchR'],[0.38,'pouchR'],[0.54,'clipH'],[0.62,'clipD'],[0.68,'clipD'],[0.74,'opRod'],[0.8,'opRod'],[0.92,'grip'],[1,'grip']],
  B:[[0,0],[0.1,0],[0.14,1],[0.79,1],[0.82,0],[1,0]],clip:[0.3,0.64],eject:0.14,steps:[[0.14,'bolt'],[0.64,'clip'],[0.81,'bolt']],commit:0.64},
 karE:{W:[[0,WT_P0],[0.12,WT_KT],[0.86,WT_KT],[1,WT_P0]],R:[[0,'grip'],[0.12,'pouchR'],[0.28,'pouchR'],[0.42,'stripH'],[0.5,'stripH'],[0.6,'stripD'],[0.68,'knob'],[0.86,'knob'],[0.95,'grip'],[1,'grip']],
  B:[[0,1],[0.72,1],[0.79,0],[1,0]],K:[[0,1],[0.8,1],[0.86,0],[1,0]],strip:[0.2,0.5,0.79],steps:[[0.5,'clip'],[0.6,'in'],[0.78,'bolt']],commit:0.6},
 karT:{W:[[0,WT_P0],[0.12,WT_KT],[0.88,WT_KT],[1,WT_P0]],R:[[0,'grip'],[0.1,'knob'],[0.2,'knob'],[0.3,'pouchR'],[0.42,'pouchR'],[0.52,'stripH'],[0.58,'stripH'],[0.66,'stripD'],[0.72,'knob'],[0.86,'knob'],[0.95,'grip'],[1,'grip']],
  B:[[0,0],[0.15,0],[0.2,1],[0.76,1],[0.82,0],[1,0]],K:[[0,0],[0.1,0],[0.15,1],[0.82,1],[0.88,0],[1,0]],strip:[0.3,0.58,0.82],steps:[[0.15,'bolt'],[0.58,'clip'],[0.66,'in'],[0.8,'bolt']],commit:0.66},
 cyc:{W:[[0,WT_P0],[0.15,WT_KB],[0.85,WT_KB],[1,WT_P0]],R:[[0,'grip'],[0.17,'knob'],[0.78,'knob'],[1,'grip']],K:[[0,0],[0.17,0],[0.3,1],[0.65,1],[0.76,0],[1,0]],
  B:[[0,0],[0.3,0],[0.45,1],[0.55,1],[0.66,0],[1,0]],eject:0.45,steps:[[0.3,'bolt'],[0.66,'bolt']]},
 rkt:{W:[[0,WT_P0],[0.15,WT_RT],[0.85,WT_RT],[1,WT_P0]],R:[[0,'grip'],[0.12,'pouchR'],[0.3,'pouchR'],[0.5,'rocketH'],[0.62,'rocketI'],[0.72,'rocketI'],[0.86,'grip'],[1,'grip']],
  rocket:[0.2,0.62],steps:[[0.62,'in'],[0.76,'clip']],commit:0.62}
};
// interpolación suave entre claves: escribe en o (número o array); los valores de texto los resuelve f(nombre, out)
function wtSample(tr,u,o,f,ta,tb){let i=0;const n=tr.length;while(i<n-2&&u>=tr[i+1][0])i++;const a=tr[i],b=tr[Math.min(i+1,n-1)],t=b===a||b[0]<=a[0]?(u>=b[0]?1:0):smooth((u-a[0])/(b[0]-a[0]));
 let va=a[1],vb=b[1];if(typeof va==='number')return va+(vb-va)*t;if(typeof va==='string')va=f(va,ta);if(typeof vb==='string')vb=f(vb,tb);for(let k=0;k<va.length;k++)o[k]=va[k]+(vb[k]-va[k])*t;return o;}
const W_SZ=[0,0,0],W_A=[0,0,0,0,0,0],W_B=[0,0,0,0,0,0];

const Weapons={inv:{w:[null,null,null],cur:0,nades:4,nadeT:'frag'},adsAmt:0,spread:0.04,pickups:[],grenades:[],rockets:[],
 st:'idle',stT:0,stD:1,t:0,T:1,fireT:0,swapTo:-1,cook:-1,mountW:null,mountU:null,heat:0,flash:0,bloom:0,burst:0,_bt:0,rl:null,_si:0,_com:false,
 boltOpen:false,slideBack:false,nd:null,breath:4,_bk:1,_sun:1,_sunT:0,_tc:0,_wh:0,M:{},
 V:{Wc:new Float32Array(16),show:true,model:null,rh:[0,0,0,0,0,0],lh:[0,0,0,0,0,0],rhC:false,lhC:false,mag:[0,0,0],B:0,K:0,clip:0,strip:0,rocket:0,item:null,itemP:[0,0,0],
  kz:0,kzv:0,kp:0,kpv:0,kr:0,krv:0,ky:0,kyv:0,sy:0,syv:0,sp:0,spv:0,ld:0,ldv:0,spr:0,adsK:0,fov:54,flash:0,fr:0,fs:1,knife:false},
 _m:new Float32Array(16),_m2:new Float32Array(16),_m3:new Float32Array(16),_cm:new Float32Array(16),_v:[0,0,0],_w:[0,0,0],_e:[0,0,0],_f:[0,0,0],_r:[0,0,0],_u:[0,0,0],_mz:[0,0,0],_fp:new Float32Array(20),
 reset(){this.inv={w:[null,null,null],cur:0,nades:4,nadeT:'frag'};this.pickups=[];this.grenades=[];this.rockets=[];this._idle();this.cook=-1;this.nd=null;this.adsAmt=0;this.mountW=this.mountU=null;
  this.heat=0;this.bloom=0;this.boltOpen=this.slideBack=false;this.breath=4;},
 _idle(){this.st='idle';this.stT=0;this.stD=1;this.rl=null;},
 _set(st,d){this.st=st;this.stT=0;this.stD=Math.max(0.01,d);this.t=d;this.T=d;this._si=0;this._com=false;},
 // equipo: ['garand','colt','frag:4'] o {id, mag, ammo}
 setLoadout(list){this.reset();const I=this.inv;let pi=0;
  for(const e of list||[]){const o=typeof e==='string'?{id:e.split(':')[0],n:+e.split(':')[1]||0}:e,d=WEAPONS[o.id];if(!d)continue;
   if(d.cls==='grenade'){I.nadeT=o.id;I.nades=o.n||d.count;continue;}if(d.cls==='melee')continue;
   const w={id:o.id,mag:o.mag!=null?o.mag:d.mag,ammo:o.ammo!=null?o.ammo:d.ammo};if(d.cls==='pistol')I.w[2]=w;else if(pi<2)I.w[pi++]=w;}
  I.cur=I.w[0]?0:I.w[1]?1:2;this._raise(0.45);},
 snapshot(){return JSON.parse(JSON.stringify(this.inv));},
 restore(s){this.reset();this.inv=JSON.parse(JSON.stringify(s));this._raise(0.45);},
 cur(){return this.mountW||this.inv.w[this.inv.cur];},
 def(){const w=this.cur();return w?WEAPONS[w.id]:null;},
 has(id){return this.inv.w.some(w=>w&&w.id===id);},
 busy(){return this.st==='melee'||this.st==='nade';},
 moveK(){const d=this.def();return d&&d.move?d.move:1;},
 adsSens(){const d=this.def();return d&&d.adsSens||0.55;},
 adsFov(base){const d=this.def();return d&&d.adsFov?d.adsFov:base*0.75;},
 refill(){for(const w of this.inv.w)if(w){const d=WEAPONS[w.id];w.ammo=d.ammo;}this.inv.nades=Math.max(this.inv.nades,4);},
 _raise(d){this._set('raise',d||0.32);const w=this.cur();if(w)Bus.emit('weaponRaise',{by:Player,weapon:w.id});},
 // ---------- jugador (paso fijo) ----------
 update(dt,cmd){const P=Player;this._updProj(dt);this._updPickups(dt);this.flash=Math.max(0,this.flash-dt);this.bloom=Math.max(0,this.bloom-dt*0.12);
  this.heat=Math.max(0,this.heat-dt*(this.st==='hot'?0.45:0.28));this._bt+=dt;if(this._bt>0.28)this.burst=0;
  if(!P.alive){this.adsAmt=Math.max(0,this.adsAmt-dt*4);if(this.nd&&this.nd.ph==='hold'){const e=P.eye(this._e);this.throwGrenade(P,[e[0],P.pos[1]+0.3,e[2]],[0,0,0],this.inv.nadeT,WEAPONS[this.inv.nadeT].fuse-this.cook);}
   this.nd=null;this.cook=-1;this._vm(dt,cmd);return;}
  const I=this.inv;this.stT+=dt;this.t=Math.max(0,this.stD-this.stT);this.fireT-=dt;
  let w=this.cur(),d=w?WEAPONS[w.id]:null;
  if(this.st==='reload'||this.st==='bolt')this._steps(w,d);
  if(this.st!=='idle'&&this.st!=='nade'&&this.stT>=this.stD)this._finish();
  w=this.cur();d=w?WEAPONS[w.id]:null;
  const free=this.st==='idle'||this.st==='reload'||this.st==='bolt'||this.st==='raise';
  // cambiar de arma (cancela la recarga si aún no entró la munición)
  if(!this.mountW&&free&&!this.nd){let to=-1;
   if(cmd.slot)to=cmd.slot-1;else if(cmd.swap)to=I.cur===0&&I.w[1]?1:I.cur===1&&I.w[0]?0:I.w[0]?0:I.w[1]?1:-1;
   else if(cmd.next||cmd.prev){for(let k=1;k<3;k++){const j=(I.cur+(cmd.next?k:3-k))%3;if(I.w[j]){to=j;break;}}}
   if(to>=0&&to!==I.cur&&I.w[to]){this._set('swap',0.26);this.swapTo=to;}}
  // culatazo o cuchillo, con una pequeña embestida
  if(cmd.melee&&(this.st==='idle'||this.st==='bolt'||this.st==='reload'||this.st==='raise')&&!this.nd&&!this.mountW){this._set('melee',0.62);this._mh=0;
   this.V.knife=!d||d.cls==='smg'||d.cls==='pistol';Bus.emit('melee',{by:P,hit:false,start:true});}
  if(this.st==='melee'){if(this._mh===0&&this.stT>0.08){this._mh=1;this._lunge(P);}if(this._mh===1&&this.stT>0.17){this._mh=2;this._melee(P);}}
  // granada: anilla, cocinar mientras se mantiene, lanzar al soltar
  this._nade(dt,cmd,P);
  // recargar
  if(w&&d&&!d.mounted&&d.rl&&this.st==='idle'&&w.ammo>0&&w.mag<d.mag&&(cmd.reload||(w.mag===0&&(cmd.fireDown||this.fireT<-0.25))))this._reload(w,d);
  // apuntar
  const canAds=d&&(this.st==='idle'||this.st==='bolt'&&!d.scope||this.st==='raise'&&this.stT>this.stD*0.5)&&!P.sprinting&&!this.nd;
  this.adsAmt=clamp(this.adsAmt+(cmd.ads&&canAds?1:-1.3)*dt/((d&&d.adsT)||0.2),0,this.st==='bolt'&&!d.scope?0.7:1);
  // disparar
  if(w&&d&&this.st==='idle'&&!this.nd&&this.V.spr<0.35){const want=d.mode==='auto'?cmd.fire:cmd.fireDown||(this._buf>0&&cmd.fire);
   if(cmd.fireDown&&this.fireT>0)this._buf=0.12;this._buf=(this._buf||0)-dt;
   if(want&&this.fireT<=0){this._buf=0;if(w.mag>0)this._shoot(P,w,d);else if(cmd.fireDown||d.mode==='auto'&&this.fireT<-0.4){Bus.emit('dryfire',{by:P,weapon:w.id});this.fireT=0.25;}}}
  // dispersión actual (también la usa la retícula)
  if(d&&d.spread){const s=d.spread,a=this.adsAmt,mv=clamp(P.speed/PL.walk,0,1.6);this.spread=(lerp(s[0],s[1],a*a)+s[2]*mv*(1-a*0.65)+(P.onGround?0:0.05)+this.bloom*(1-a*0.5))*(P.stance==='crouch'?0.8:1);}
  // balanceo con visor; mantener la respiración con correr
  P.sway.p=P.sway.y=0;if(d&&this.adsAmt>0.6){const t=P.time,k=d.scope?1:0.12;let hb=1;
   if(d.scope&&cmd.sprint&&this.breath>0){this.breath-=dt;hb=0.1;}else{this.breath=Math.min(4,this.breath+dt*(cmd.sprint?0:0.8));if(this.breath<=0.05)hb=2;}this._bk+=(hb-this._bk)*Math.min(1,dt*6);
   const s=this._bk*k*(this.adsAmt-0.6)/0.4;P.sway.y=(Math.sin(t*0.83)*0.007+Math.sin(t*1.9)*0.0025)*s;P.sway.p=(Math.sin(t*1.21+1)*0.006+Math.cos(t*2.3)*0.002)*s;}
  this._vm(dt,cmd);},
 _finish(){const I=this.inv,w=this.cur();
  if(this.st==='reload'&&w&&!this._com)this._commit(w);
  if(this.st==='swap'&&this.swapTo>=0){I.cur=this.swapTo;this.swapTo=-1;this.boltOpen=this.slideBack=false;const nw=this.cur();if(nw&&nw.mag===0){const d=WEAPONS[nw.id];this.boltOpen=d.rl==='garand'||d.rl==='kar98';this.slideBack=d.rl==='pistol';}this._raise(0.3);return;}
  if(this.st==='bolt'&&w&&w.mag===0)this.boltOpen=true;
  this._idle();},
 _commit(w){const d=WEAPONS[w.id],n=Math.min(d.mag-w.mag,w.ammo);w.mag+=n;w.ammo-=n;this._com=true;this.boltOpen=false;if(d.rl==='pistol'||this.rl==='pisE')this.slideBack=false;},
 _reload(w,d){const e=w.mag===0;this.rl=d.rl==='mag'?(e?'magE':'magT'):d.rl==='pistol'?(e?'pisE':'pisT'):d.rl==='garand'?(this.boltOpen?'garE':'garT'):d.rl==='kar98'?(this.boltOpen?'karE':'karT'):'rkt';
  this._set('reload',e?d.reload[1]:d.reload[0]);this.adsAmt=Math.min(this.adsAmt,0.3);Bus.emit('reload',{by:Player,weapon:w.id});},
 // eventos de la coreografía según avanza (recarga y cerrojo)
 _steps(w,d){const tl=WT[this.st==='bolt'?'cyc':this.rl];if(!tl)return;const u=this.stT/this.stD;
  while(this._si<tl.steps.length&&u>=tl.steps[this._si][0]){const s=tl.steps[this._si++][1];Bus.emit('reloadStep',{by:Player,weapon:w.id,step:s});
   if(s==='bolt'&&this.st==='bolt'&&this._si===2&&w.mag===0)break;}
  if(tl.eject!=null&&!this._ej&&u>=tl.eject){this._ej=true;if(this.rl==='garT'){this._clipOut(w,true);}else this._eject(d);}
  if(u<0.05)this._ej=false;
  if(this.st==='reload'&&tl.commit!=null&&!this._com&&u>=tl.commit)this._commit(w);
  // cerrojo con el cargador vacío: se queda abierto
  if(this.st==='bolt'&&w.mag===0&&u>=0.5){this.boltOpen=true;this._idle();if(w.ammo>0)this._reload(w,d);}},
 // ---------- disparo del jugador ----------
 _shoot(P,w,d){w.mag--;this.fireT=60/d.rpm;this.burst++;this._bt=0;const ads=this.adsAmt,e=P.eye(this._e),f=P.dir(this._f),sp=this.spread,R=Math.random,a=R()*6.283,r=sp*Math.sqrt(R());
  const rt=V3.set(this._r,-Math.cos(P.yaw),0,Math.sin(P.yaw)),up=V3.cross(rt,f,this._u),dir=V3.norm(V3.set(this._v,f[0]+(rt[0]*Math.cos(a)+up[0]*Math.sin(a))*r,f[1]+up[1]*Math.sin(a)*r,f[2]+(rt[2]*Math.cos(a)+up[2]*Math.sin(a))*r),this._v);
  const mz=this._worldPt(WM_META[d.model].muz,this._mz);
  if(d.mode==='rocket'){const o=V3.madd(e,f,0.6);this.rockets.push({pos:o,vel:V3.scale(dir,d.speed),owner:P,t:5,def:d,st:0,lt:0});Bus.emit('shot',{pos:e.slice(),dir:dir.slice(),weapon:w.id,by:P,loud:1.4});
   const back=V3.madd(e,f,-1.2);for(let i=0;i<6;i++)FX.smoke(back,{puff:true,size:0.5,life:2,vel:[-f[0]*3+(R()-0.5)*2,0.5,-f[2]*3+(R()-0.5)*2]});FX.shake(0.25);}
  else this.fire(P,d,e,dir,{muzzle:mz});
  // retroceso: sube y se va a un lado; en ráfaga larga sube menos y baila más
  const rc=d.recoil,k=(1-0.35*ads)*(P.stance==='crouch'?0.8:1);let upk=rc[0]*(this.burst<=2?1.25:1),sd=rc[1]*((R()-0.5)*2+0.45*Math.sin(this.burst*0.9));
  if(d.recMax&&P.recoil.p>d.recMax){upk*=0.18;sd*=1.7;}P.kick(upk*k,sd*k);
  const kk=d.kick||[0.05,0.06,0.03],V=this.V,ka=1-0.55*ads;V.kz-=kk[0]*ka;V.kp+=kk[1]*ka;V.kr+=(R()-0.5)*kk[2]*2;V.ky+=(R()-0.5)*kk[2];
  this.flash=0.05;V.flash=2;V.fr=R()*6.28;V.fs=0.8+R()*0.5;this.bloom=Math.min(0.06,this.bloom+(d.bloom||0.006));
  FX.muzzle(mz,dir,d.cls==='pistol'?0.6:d.mounted?1.3:d.mode==='rocket'?1.6:1,true);
  if(d.mounted){this.heat+=d.heat||0.011;if(this.heat>=1){this._set('hot',2.2);for(let i=0;i<3;i++)FX.smoke(mz,{puff:true,size:0.3,life:1.5,col:[0.85,0.85,0.85]});}}
  if(d.mode==='bolt'){this._set('bolt',d.boltT||1);this._ej=false;}else if(d.mode!=='rocket'&&d.shell)this._eject(d);
  if(d.rl==='pistol'&&w.mag===0)this.slideBack=true;
  if(d.ping&&w.mag===0){this.boltOpen=true;this._clipOut(w,false);}
  if(d.mode==='rocket'&&w.ammo>0)this.fireT=0.6;},
 // casquillo por la ventana de expulsión
 _eject(d){const m=WM_META[d.model];if(!m||!m.port||!d.shell)return;const p=this._worldPt(m.port,this._w),C=this._cm,R=Math.random,v=M4.xfDir(C,m.ej,this._u),pv=Player.vel;
  v[0]+=pv[0]+(R()-0.5)*0.6;v[1]+=pv[1]+(R()-0.5)*0.4;v[2]+=pv[2]+(R()-0.5)*0.6;FX.shell(p,v,d.shell);},
 // el peine del Garand sale volando con su 'ping' (con balas si se saca a medias)
 _clipOut(w,partial){const p=this._worldPt([0,0.03,0.02],this._w),v=M4.xfDir(this._cm,[-0.4,3.2,-0.6],this._u);FX.debris('clip',p,v,null,1);Bus.emit('ping',{pos:p.slice(),by:Player});
  if(partial&&w.mag>0){w.ammo+=w.mag;w.mag=0;}},
 // punto del arma en primera persona -> mundo (corrige la diferencia de FOV entre el arma y la escena para que coincida en pantalla)
 _worldPt(lp,o){const P=Player,C=this._cm,e=P.eye(this._e);M4.compose(e,P.yaw+P.recoil.y,P.pitch+P.recoil.p,0,1,C);const q=M4.xfPoint(this.V.Wc,lp,o),cf=Cam.fov>0.2?Cam.fov:1.08,
  k=Math.tan(cf/2)/Math.tan((this.V.fov||54)*Math.PI/360);q[0]*=k;q[1]*=k;return M4.xfPoint(C,q,o);},
 _lunge(P){const e=P.eye(this._e),f=P.dir(this._f);let best=null,bd=WEAPONS.knife.lunge;
  for(const a of Actors.list){if(!a.alive||a.team===P.team||a.tank)continue;const c=Actors.chest(a),dx=c[0]-e[0],dz=c[2]-e[2],l=Math.hypot(dx,dz);if(l<bd&&l>1.2&&(dx*f[0]+dz*f[2])/l>0.88&&Math.abs(c[1]-e[1])<1.2){bd=l;best=a;}}
  if(best&&P.lunge){const c=best.pos;P.lunge(c[0]-P.pos[0],c[2]-P.pos[2],Math.min(7,(bd-1)/0.12));}},
 _melee(P){const e=P.eye(this._e),f=P.dir(this._f);let best=null,bd=WEAPONS.knife.range;
  for(const a of Actors.list){if(!a.alive||a.team===P.team)continue;const c=a.tank?a.pos:Actors.chest(a),v=V3.sub(c,e,this._w),l=Math.hypot(v[0],v[2])-(a.tank?2:0);if(l<bd&&(v[0]*f[0]+v[2]*f[2])/Math.max(0.01,Math.hypot(v[0],v[2]))>0.55){bd=l;best=a;}}
  if(best&&!best.tank){const c=Actors.chest(best);Actors.damage(best,WEAPONS.knife.dmg,'torso',{by:P,weapon:'knife',dir:f.slice(),pos:c,melee:true});FX.blood(c,f,0.8);FX.shake(0.12);}
  else{const h=World.raycast(e,f,1.7,null);if(h){FX.impact(h.pos,h.normal,h.surface,0.6);Bus.emit('impact',{pos:h.pos,normal:h.normal,surface:h.surface,by:P});FX.shake(0.08);if(h.col&&h.col.hp)World.damage(h.col,60,{by:P});}}
  Bus.emit('melee',{by:P,hit:!!best});},
 // granada del jugador: fases pin (0.35 s) -> hold (cocinando) -> throw (0.34 s, sale a los 0.11 s) -> sube el arma
 _nade(dt,cmd,P){const I=this.inv;
  if(!this.nd){if(cmd.grenadeDown&&I.nades>0&&!this.mountW&&(this.st==='idle'||this.st==='bolt'||this.st==='raise'||this.st==='reload'&&!this._com)){this.nd={ph:'pin',t:0,rel:false,pin:false};this._set('nade',9);this.adsAmt=0;}return;}
  const n=this.nd,gd=WEAPONS[I.nadeT]||WEAPONS.frag;n.t+=dt;if(!cmd.grenade)n.rel=true;
  if(n.ph==='pin'){if(!n.pin&&n.t>0.16){n.pin=true;Bus.emit('pin',{by:P,type:gd.id});}if(n.t>=0.35){n.ph=n.rel?'throw':'hold';n.t=0;this.cook=0;}}
  else if(n.ph==='hold'){this.cook+=dt;if(n.rel){n.ph='throw';n.t=0;}
   else if(this.cook>=gd.fuse){I.nades--;this.nd=null;this.cook=-1;const e=P.eye(this._e);this.explode([e[0],e[1]-0.3,e[2]],gd.radius,gd.dmg,P,{grenade:true});this._raise(0.4);return;}}
  else if(n.ph==='throw'){if(this.cook>=0)this.cook+=dt;if(!n.out&&n.t>0.11){n.out=true;const f=V3.dirYP(P.yaw+P.recoil.y,P.pitch+P.recoil.p+0.13,this._f),e=P.eye(this._e),rt=V3.set(this._r,-Math.cos(P.yaw),0,Math.sin(P.yaw));
     const pos=[e[0]+f[0]*0.35+rt[0]*0.15,e[1]+f[1]*0.35+0.02,e[2]+f[2]*0.35+rt[2]*0.15],v=[f[0]*16.5+P.vel[0]*0.6,f[1]*16.5+2.2+P.vel[1]*0.3,f[2]*16.5+P.vel[2]*0.6];
     this.throwGrenade(P,pos,v,gd.id,gd.fuse-Math.max(0,this.cook));I.nades--;this.cook=-1;}
   if(n.t>=0.34){this.nd=null;this.cook=-1;this._raise(0.3);}}},
 // ---------- disparo de cualquiera (jugador o IA): rayo con penetración de madera fina, caída de daño, marcas, trazadoras, balas que silban ----------
 dmgAt(d,t){const f=d.fall;if(!f||t<=f[0])return d.dmg;return d.dmg*(t>=f[1]?f[2]:lerp(1,f[2],(t-f[0])/(f[1]-f[0])));},
 fire(owner,def,origin,dir,opts){opts=opts||W_NO;const isP=owner===Player,range=def.range||300;
  Bus.emit('shot',{pos:origin.slice(),dir:dir.slice(),weapon:def.id,by:owner,loud:def.loud||1});
  const h=World.raycast(origin,dir,range,{actors:true,ignore:isP?null:owner,pierce:def.pen||0});const tEnd=h?h.t:range;
  // las balas de los enemigos contra el jugador; si pasan cerca, silban
  if(!isP&&Player.alive&&owner&&owner.team!=='ally'){const tp=this._rayPlayer(origin,dir,tEnd);
   if(tp>=0){Player.damage(this.dmgAt(def,tp)*(opts.k||1),origin,owner);this._tracer(owner,def,origin,dir,tp,opts);return {t:tp,player:true};}
   const e=Player.eye(this._e),vx=e[0]-origin[0],vy=e[1]-origin[1],vz=e[2]-origin[2],tc=clamp(vx*dir[0]+vy*dir[1]+vz*dir[2],0,tEnd);
   if(tc>3){const qx=origin[0]+dir[0]*tc-e[0],qy=origin[1]+dir[1]*tc-e[1],qz=origin[2]+dir[2]*tc-e[2],dd=Math.sqrt(qx*qx+qy*qy+qz*qz);
    if(dd<1.6&&Player.time-this._wh>0.09){this._wh=Player.time;Bus.emit('whizz',{pos:[e[0]+qx,e[1]+qy,e[2]+qz],by:owner,weapon:def.id,dist:dd});if(dd<0.7&&Player.punch)Player.punch(0.004,(Math.random()-0.5)*0.006,0);}}}
  if(h){const th=h.through,np=th?th.length:0,dm=this.dmgAt(def,h.t)*(opts.k||1)*(np?Math.pow((def.pen||0)>=2?0.8:0.6,np):1);
   if(np)for(const q of th){FX.impact(q.pos,q.normal,q.surface,0.7);V3.madd(q.pos,dir,0.12,this._w);FX.impact(this._w,dir,q.surface,0.5);if(q.col&&q.col.hp)World.damage(q.col,dm,{by:owner});}
   if(h.actor){if(!(owner&&h.actor.team===owner.team))Actors.damage(h.actor,dm,h.part,{by:owner,weapon:def.id,dir:dir.slice(),pos:h.pos});
    if(h.surface==='metal'){FX.impact(h.pos,h.normal,'metal');Bus.emit('impact',{pos:h.pos,normal:h.normal,surface:'metal',by:owner});}else FX.blood(h.pos,dir);}
   else{FX.impact(h.pos,h.normal,h.surface);Bus.emit('impact',{pos:h.pos,normal:h.normal,surface:h.surface,by:owner});if(h.col&&h.col.hp)World.damage(h.col,dm,{by:owner});}}
  this._tracer(owner,def,origin,dir,tEnd,opts);
  // casquillos de los soldados cercanos
  if(!isP&&owner&&owner.pos&&def.shell&&V3.dist2(owner.pos,Cam.eye)<144){const y=owner.yaw||0,R=Math.random;FX.shell([origin[0]-Math.cos(y)*0.12,origin[1]-0.1,origin[2]+Math.sin(y)*0.12],[-Math.cos(y)*2+(R()-0.5),1.5+R(),Math.sin(y)*2+(R()-0.5)],def.shell);}
  return h;},
 _tracer(owner,def,o,dir,t,opts){const isP=owner===Player;let on;if(isP)on=def.tracer&&(++this._tc)%def.tracer===0;else{owner._tc=(owner._tc||0)+1;on=def.tracer?owner._tc%def.tracer===0:Math.random()<0.25;}
  if(!on)return;const a=opts.muzzle||V3.madd(o,dir,0.8,this._w);FX.tracer(a,V3.madd(o,dir,Math.min(t,def.range||300),this._u),isP?520:380);},
 // rayo contra la cápsula del jugador -> t | -1
 _rayPlayer(o,d,maxT){const p=Player.pos,r=0.38,h=Player.height()+0.1,ox=o[0]-p[0],oz=o[2]-p[2],a=d[0]*d[0]+d[2]*d[2];if(a<1e-8)return -1;
  const b=2*(ox*d[0]+oz*d[2]),c=ox*ox+oz*oz-r*r,ds=b*b-4*a*c;if(ds<0)return -1;const t=(-b-Math.sqrt(ds))/(2*a);if(t<0||t>maxT)return -1;const y=o[1]+d[1]*t;return y>=p[1]&&y<=p[1]+h?t:-1;},
 // ---------- granadas: rebotan, ruedan por las cuestas y explotan al acabar la mecha ----------
 throwGrenade(owner,pos,vel,type,fuse){const d=WEAPONS[type]||WEAPONS.frag;const g={pos:pos.slice(),vel:vel.slice(),t:fuse==null?d.fuse:fuse,type:d.id,owner,rest:false,spin:0,rx:Math.random()*6,ry:Math.random()*6,wr:8+Math.random()*8};
  this.grenades.push(g);Bus.emit('throw',{by:owner,type:d.id,pos:g.pos});if(d.id==='frag'&&V3.dist2(pos,Cam.eye)<400)FX.debris('spoon',pos,[vel[0]*0.3+1,2,vel[2]*0.3],null,1);return g;},
 _updProj(dt){const G=this.grenades;
  for(let i=G.length-1;i>=0;i--){const g=G[i];g.t-=dt;
   if(!g.rest){g.vel[1]-=12*dt;const sp=Math.hypot(g.vel[0],g.vel[1],g.vel[2]),l=sp*dt;
    if(l>1e-5){const dir=V3.scale(g.vel,1/sp,this._v),h=World.raycast(g.pos,dir,l+0.05,null);
     if(h){V3.madd(h.pos,h.normal,0.05,g.pos);const n=h.normal,vn=V3.dot(g.vel,n);V3.madd(g.vel,n,-vn,g.vel);V3.scale(g.vel,0.72,g.vel);V3.madd(g.vel,n,-vn*0.38,g.vel);
      if(Math.abs(vn)>1.5){Bus.emit('grenadeBounce',{pos:g.pos.slice(),surface:h.surface});if(h.surface==='dirt'||h.surface==='sand'||h.surface==='snow')FX.impact(g.pos,n,h.surface,0.3);}g.wr*=0.6;
      if(n[1]>0.55&&Math.abs(vn)<2.2){g.roll=true;}}
     else V3.madd(g.pos,g.vel,dt,g.pos);}
    // rodar por el suelo: frena y baja por la pendiente
    if(g.roll){const gy=World.groundAt(g.pos[0],g.pos[2],0.05,g.pos[1]+0.3);if(g.pos[1]-gy<0.08){g.pos[1]=gy+0.045;if(g.vel[1]<0)g.vel[1]=0;const nm=World.normalAt(g.pos[0],g.pos[2],this._w);
      g.vel[0]+=nm[0]*7*dt;g.vel[2]+=nm[2]*7*dt;const hs=Math.hypot(g.vel[0],g.vel[2]),fr=Math.max(0,hs-2.6*dt);if(hs>1e-4){g.vel[0]*=fr/hs;g.vel[2]*=fr/hs;}if(hs<0.08&&nm[1]>0.93)g.rest=true;}else g.roll=false;}
    g.rx+=g.wr*dt;g.ry+=g.wr*0.7*dt;}
   if(g.t<=0){G.splice(i,1);const d=WEAPONS[g.type];this.explode([g.pos[0],g.pos[1]+0.05,g.pos[2]],d.radius,d.dmg,g.owner,{grenade:true});}}
  // cohetes: estela de humo, algo de caída; impactan en mundo, soldados, carros o el jugador
  const R=this.rockets;for(let i=R.length-1;i>=0;i--){const r=R[i];r.t-=dt;r.st+=dt;r.vel[1]-=2.5*dt;const sp=Math.hypot(r.vel[0],r.vel[1],r.vel[2]),dir=V3.scale(r.vel,1/sp,this._v);
   const h=World.raycast(r.pos,dir,sp*dt,{actors:true,ignore:r.owner});let tp=-1;if(r.owner!==Player&&Player.alive)tp=this._rayPlayer(r.pos,dir,h?h.t:sp*dt);
   if(r.st>0.022){r.st=0;FX.smoke(r.pos,{puff:true,size:0.32,life:1.8,col:[0.82,0.81,0.78],a:0.45});}
   if(r.lt<=0){r.lt=0.04;FX.light(r.pos,5,[2.4,1.5,0.6],0.06);}r.lt-=dt;
   if(h||tp>=0||r.t<=0){R.splice(i,1);const p=tp>=0?V3.madd(r.pos,dir,tp):h?V3.madd(h.pos,dir,-0.25):r.pos;let k=1;
    if(h&&h.actor&&h.actor.tank){const a=h.actor,fx=Math.sin(a.yaw),fz=Math.cos(a.yaw);if(dir[0]*fx+dir[2]*fz>0.45)k=1.8;} // por detrás, el doble casi
    this.explode(p,r.def.radius,r.def.dmg*k,r.owner,{rocket:true,actor:h&&h.actor,big:true});}
   else V3.madd(r.pos,r.vel,dt,r.pos);}},
 // explosión: daño con caída (algo atraviesa coberturas), a soldados, jugador y destruibles; efectos y aviso por el Bus
 explode(pos,r,dmg,by,opts){opts=opts||W_NO;FX.explosion(pos,r,{big:opts.rocket||opts.charge||opts.shell});Bus.emit('explosion',{pos:pos.slice(),radius:r,dmg,by,kind:opts.grenade?'grenade':opts.rocket?'rocket':opts.shell?'shell':opts.charge?'charge':'other'});
  const up=[pos[0],pos[1]+0.35,pos[2]],c=[0,0,0];
  for(const a of Actors.list){if(!a.alive)continue;Actors.chest(a,c);const d=Math.max(0,V3.dist(c,pos)-(a.tank?1.8:0.25));if(d>r)continue;if(a.tank&&!opts.rocket&&!opts.charge)continue;
   let k=a===opts.actor?1:Math.pow(clamp(1-d/r,0,1),1.25);if(a!==opts.actor&&!World.los(up,c)&&!World.los(up,Actors.eye(a,this._w)))k*=0.18;
   if(k>0.01)Actors.damage(a,dmg*k,'torso',{by,weapon:opts.grenade?'frag':opts.rocket?'bazooka':'explosion',explosive:true,pos:c.slice(),dir:V3.norm(V3.sub(c,pos))});}
  if(Player.alive){const e=Player.eye(this._e),d=Math.min(V3.dist(e,pos),V3.dist(Player.pos,pos));if(d<r){let k=Math.pow(clamp(1-d/r,0,1),1.2);if(!World.los(up,e)&&!World.los(up,[Player.pos[0],Player.pos[1]+0.4,Player.pos[2]]))k*=0.15;
   Player.damage(dmg*k*(by===Player?0.75:1),pos,by===Player?null:by);}}
  World.blast(pos,r,dmg,by);},
 // ---------- armas en el suelo ----------
 drop(def,pos,ammo){if(!def||def.cls==='grenade'||def.mounted||!def.model)return null;const y=World.groundAt(pos[0],pos[2],0.1,pos[1]+0.5)+0.02;
  const q={id:def.id,pos:[pos[0],y,pos[2]],yaw:Math.random()*6.28,mag:def.mag,ammo:ammo!=null?ammo:Math.round(def.mag*(1+Math.random()*2)),t:0};
  this.pickups.push(q);if(this.pickups.length>18)this.pickups.shift();return q;},
 // recoger: cambia por el arma en la mano (la otra queda en el suelo)
 pickup(q){const I=this.inv,i=this.pickups.indexOf(q);if(i<0)return;const d=WEAPONS[q.id];if(!d)return;
  if(this.has(q.id)){this._takeAmmo(q);return;}this.pickups.splice(i,1);
  const slot=d.cls==='pistol'?2:!I.w[0]?0:!I.w[1]?1:I.cur===2?0:I.cur;
  const old=I.w[slot];if(old){const dq=this.drop(WEAPONS[old.id],[Player.pos[0],Player.pos[1],Player.pos[2]],old.ammo);if(dq)dq.mag=old.mag;}
  I.w[slot]={id:q.id,mag:q.mag,ammo:q.ammo};I.cur=slot;this.boltOpen=this.slideBack=false;this.nd=null;this.cook=-1;this._raise(0.4);Bus.emit('pickup',{id:q.id});},
 _takeAmmo(q){const w=this.inv.w.find(w=>w&&w.id===q.id);if(!w)return;const d=WEAPONS[q.id],n=Math.min(d.ammo-w.ammo,q.ammo+q.mag);if(n<=0)return;w.ammo+=n;
  const left=q.ammo+q.mag-n;q.mag=0;q.ammo=left;if(left<=0){const i=this.pickups.indexOf(q);if(i>=0)this.pickups.splice(i,1);}Bus.emit('ammo',{id:q.id,n});},
 _updPickups(dt){if(!Player.alive)return;const P=this.pickups;for(let i=P.length-1;i>=0;i--){const q=P[i];if(!q)continue;q.t+=dt;if(this.has(q.id)&&V3.distXZ(q.pos,Player.pos)<1.3&&Math.abs(q.pos[1]-Player.pos[1])<1.5)this._takeAmmo(q);}},
 // ---------- ametralladora fija ----------
 mount(u){this.mountU=u;this.mountW={id:u.weapon||'mg42mount',mag:1e9,ammo:0};this.nd=null;this.cook=-1;this._set('raise',0.2);this.adsAmt=0;this.heat=0;},
 unmount(){this.mountU=this.mountW=null;this._raise(0.3);},
 // ---------- arma en primera persona: pose (paso fijo) ----------
 // anclas de la coreografía en el espacio del arma (las que siguen a una pieza usan su estado actual)
 _anc(n,o){const m=WM_META[this.V.model],A=m.A||W_NO,V=this.V,bz=m.bolt?m.bolt.z:0;let s=null,dx=0,dy=0,dz=0;
  switch(n){case 'grip':s=m.rh;break;case 'fore':s=m.lh;break;case 'sup':s=A.sup||m.lh;break;
   case 'magH':s=A.magH;dx=V.mag[0];dy=V.mag[1];dz=V.mag[2];break;case 'charge':case 'opRod':s=A[n];dz=V.B*bz;break;
   case 'clipD':s=A.clipH;dy=-0.035;break;case 'stripD':s=A.stripH;dy=-0.032;break;case 'rocketI':s=A.rocketH;dz=0.42;break;
   case 'chg':{const sd=V.model==='thompson'?-1:1;o[0]=0.02;o[1]=0.01;o[2]=-0.02;o[3]=0.1;o[4]=-0.15;o[5]=0.42*sd;return o;}
   case 'knob':{const k=A.knob,a=V.K*(m.bolt.lift||0),c=Math.cos(a),sn=Math.sin(a);o[0]=k[0]*c-k[1]*sn;o[1]=k[0]*sn+k[1]*c;o[2]=k[2]+V.B*bz;o[3]=k[3];o[4]=k[4];o[5]=k[5]+a;return o;}
   case 'in':o[0]=o[1]=o[2]=0;return o;case 'out':case 'away':s=m.mag[n];break;default:s=A[n]||m.rh;}
  for(let i=0;i<s.length;i++)o[i]=s[i];o[0]+=dx;o[1]+=dy;o[2]+=dz;return o;},
 _vm(dt,cmd){const V=this.V,P=Player,w=this.cur(),d=w?WEAPONS[w.id]:null,m=d?WM_META[d.model]:null,R=Math.random;V.model=d?d.model:null;
  // muelles: retroceso, inercia al mirar, aterrizaje
  V.kzv+=(-260*V.kz-24*V.kzv)*dt;V.kz+=V.kzv*dt;V.kpv+=(-200*V.kp-20*V.kpv)*dt;V.kp+=V.kpv*dt;V.krv+=(-160*V.kr-16*V.krv)*dt;V.kr+=V.krv*dt;V.kyv+=(-180*V.ky-18*V.kyv)*dt;V.ky+=V.kyv*dt;
  V.syv+=(cmd.lookX||0)*3.5;V.spv-=(cmd.lookY||0)*3.5;V.syv+=(-140*V.sy-19*V.syv)*dt;V.sy+=V.syv*dt;V.spv+=(-140*V.sp-19*V.spv)*dt;V.sp+=V.spv*dt;
  V.sy=clamp(V.sy,-0.12,0.12);V.sp=clamp(V.sp,-0.1,0.1);
  if(P.land>(V._pl||0)+0.005)V.ldv-=P.land*1.4;V._pl=P.land;V.ldv+=(-150*V.ld-15*V.ldv)*dt;V.ld+=V.ldv*dt;
  V.spr+=((P.sprinting?1:0)-V.spr)*Math.min(1,dt*7);V.adsK=smooth(this.adsAmt);
  this._sunT-=dt;if(this._sunT<=0){this._sunT=0.15;const e=P.eye(this._e),s=Env.sunDir;this._sunTg=Env.sunDir[1]>0.02&&!World.los(e,[e[0]+s[0]*70,e[1]+s[1]*70,e[2]+s[2]*70])?0.3:1;}
  this._sun+=((this._sunTg==null?1:this._sunTg)-this._sun)*Math.min(1,dt*4);
  V.rhC=V.lhC=false;V.lhHide=false;V.item=null;V.show=!!d;V.mag[0]=V.mag[1]=V.mag[2]=0;V.B=this.boltOpen||this.slideBack?1:0;V.K=this.boltOpen&&m&&m.bolt&&m.bolt.lift?1:0;
  V.clip=d&&d.rl==='garand'&&!this.boltOpen&&w.mag>0?1:0;V.strip=0;V.rocket=0;V.knife=V.knife&&this.st==='melee';
  if(!m){if(this.nd)this._nadePose(V);return;}
  V.fov=lerp(m.fov,m.afov,V.adsK);
  const H=m.hip,a=V.adsK,ia=1-a,t=P.time,B=P.bob,bb=B.amt*(1-0.86*a)*(1+V.spr*0.9),mt=d.mounted;
  let x=lerp(H[0],m.sx?-m.sx:0,a),y=lerp(H[1],-m.sl,a),z=lerp(H[2],m.eye,a),yw=H[3]*ia,pt=H[4]*ia,rl=H[5]*ia;
  // paso, respiración, carrera, salto
  if(!mt){x+=Math.sin(B.ph)*0.011*bb;y+=(Math.abs(Math.sin(B.ph))-0.5)*0.013*bb-0.002*bb;rl+=Math.sin(B.ph)*0.025*bb;yw+=Math.sin(B.ph)*0.012*bb;
   y+=Math.sin(t*1.7)*0.0011*(1-a*0.8);x+=Math.sin(t*0.83)*0.0008*(1-a*0.8);
   const s=V.spr;x+=0.025*s;y-=0.035*s;z-=0.03*s;yw+=0.6*s;pt-=0.32*s;rl+=0.42*s;
   if(!P.onGround)y+=clamp(-P.vel[1]*0.0035,-0.02,0.02);if(P.stance==='crouch')rl+=0.03*ia;}
  z+=V.kz;pt+=V.kp;rl+=V.kr;yw+=V.ky+V.sy*(1-0.75*a);pt+=V.sp*(1-0.75*a);y+=V.ld;x-=V.sy*0.05*ia;y+=V.sp*0.05*ia;
  // estados
  const u=clamp(this.stT/this.stD,0,1);let low=0;
  if(this.st==='swap')low=smooth(u);else if(this.st==='raise')low=1-smooth(u);else if(this.nd){const n=this.nd;low=n.ph==='pin'?smooth(n.t/0.15):1;}
  if(this.st==='hot'){y-=0.02;rl-=0.08;}
  y-=low*0.3;pt-=low*0.9;rl-=low*0.2;
  let tl=null;if(this.st==='reload')tl=WT[this.rl];else if(this.st==='bolt')tl=WT.cyc;
  const W6=W_A;
  if(tl){const f=(n,o)=>this._anc(n,o);
   if(tl.B)V.B=wtSample(tl.B,u,null,f);if(tl.K)V.K=wtSample(tl.K,u,null,f);
   if(tl.mag)wtSample(tl.mag,u,V.mag,f,W_A,W_B);
   wtSample(tl.W,u,W6,f,this._t6a||(this._t6a=[0,0,0,0,0,0]),this._t6b||(this._t6b=[0,0,0,0,0,0]));x+=W6[0];y+=W6[1];z+=W6[2];pt+=W6[3];yw+=W6[4];rl+=W6[5];
   if(tl.L)wtSample(tl.L,u,V.lh,f,W_A,W_B);else this._anc('fore',V.lh);
   if(tl.R)wtSample(tl.R,u,V.rh,f,W_A,W_B);else this._anc('grip',V.rh);
   if(tl.clip){V.clip=u>=tl.clip[1]?1:u>=tl.clip[0]?2:tl.eject!=null&&u<tl.eject?1:0;if(V.clip===2){V.itemP[0]=V.rh[0]+0.02;V.itemP[1]=V.rh[1]-0.03;V.itemP[2]=V.rh[2]-0.03;}}
   if(tl.strip){const s=tl.strip;V.strip=u>=s[2]?0:u>=s[1]?1:u>=s[0]?2:0;if(V.strip===2){V.itemP[0]=V.rh[0]+0.025;V.itemP[1]=V.rh[1]-0.02;V.itemP[2]=V.rh[2];}
    else if(V.strip===1){V.itemP[0]=0;V.itemP[1]=0.04-0.034*smooth((u-s[1])/((tl.commit-s[1])||1));V.itemP[2]=-0.04;}}
   if(tl.rocket){V.rocket=u>=tl.rocket[0]&&u<tl.rocket[1]?1:0;V.itemP[0]=V.rh[0];V.itemP[1]=V.rh[1]+0.02;V.itemP[2]=V.rh[2]+0.06;}}
  else{this._anc(d.cls==='pistol'?'sup':'fore',V.lh);this._anc('grip',V.rh);}
  if(d.cls==='pistol'&&this.st!=='reload'){const k=a;V.lh[0]=lerp(m.lh[0],m.lh[0],k);}
  // cuerpo a cuerpo: culatazo (fusiles) o cuchillo con la izquierda
  if(this.st==='melee'){if(V.knife){const k=Math.sin(Math.min(1,u*1.6)*Math.PI);x-=0.05*k;y-=0.1*k;pt-=0.45*k;yw-=0.3*k;rl-=0.35*k;V.lhC=true;
    const s=u<0.3?smooth(u/0.3):1-smooth((u-0.3)/0.7),wd=u<0.3?1-smooth(u/0.3):0;V.lh[0]=lerp(0.13,0.0,s)+wd*0.03;V.lh[1]=lerp(-0.3,-0.07,s)+wd*0.06;V.lh[2]=lerp(0.12,0.4,s);V.lh[3]=-0.2;V.lh[4]=-1.0;V.lh[5]=-1.2;}
   else{const K=[[0,WT_P0],[0.18,[0.03,-0.03,-0.07,0.15,0.45,0.25]],[0.32,[0.06,0.05,0.12,-0.35,-0.8,0.7]],[0.55,[0.04,0.0,0.03,-0.1,-0.3,0.3]],[1,WT_P0]];
    wtSample(K,u,W6,null);x+=W6[0];y+=W6[1];z+=W6[2];pt+=W6[3];yw+=W6[4];rl+=W6[5];}}
  if(this._dbg){const q=this._dbg;x=q[0];y=q[1];z=q[2];yw=q[3];pt=q[4];rl=q[5];}
  M4.compose(V._p||(V._p=[0,0,0]),yw,pt,rl,1,V.Wc);V.Wc[12]=x;V.Wc[13]=y;V.Wc[14]=z;
  if(this.nd)this._nadePose(V);},
 // granada en la mano (espacio de cámara): sacar, quitar la anilla con la izquierda, echar atrás y lanzar
 _nadePose(V){const n=this.nd;if(!n)return;V.rhC=true;V.item='nade';const R=V.rh,L=V.lh;let t=n.t;
  const set=(o,x,y,z,a,b,c)=>{o[0]=x;o[1]=y;o[2]=z;o[3]=a;o[4]=b;o[5]=c;};
  if(n.ph==='pin'){const k=smooth(t/0.2);set(R,lerp(-0.16,-0.085,k),lerp(-0.42,-0.125,k),lerp(0.18,0.27,k),-0.3,-0.25,0.35);
   V.lhC=true;const k2=smooth((t-0.05)/0.12),k3=smooth((t-0.2)/0.15);set(L,lerp(0.14,-0.03,k2)+k3*0.14,lerp(-0.4,-0.1,k2)-k3*0.2,lerp(0.18,0.27,k2)-k3*0.05,0.6,-0.6,-0.9);}
  else if(n.ph==='hold'){const tr=Math.min(1,(this.cook||0)/3)*0.0015;set(R,-0.13+Math.sin(Player.time*31)*tr,-0.095,0.2,-0.3,0.1,0.5);}
  else{const k=smooth(t/0.11),k2=smooth((t-0.11)/0.2);set(R,lerp(-0.13,-0.05,k),lerp(-0.095,0.02,k)-k2*0.38,lerp(0.2,0.45,k),-0.3,lerp(0.1,-0.6,k),0.4);if(n.out)V.item=null;}
  if(!V.lhC)V.lhHide=true;},
 // ---------- mallas ----------
 _mdl(id){if(this.M[id])return this.M[id];const G={},P={g:k=>G[k]||(G[k]=new Geo())};WM_BUILD[id==='kar98s'?'kar98':id](P,id==='kar98s');
  const o={},wg=new Geo(),rnd=mulberry32(7);for(const k in G){if(!G[k].count)continue;if(k==='w')G[k].vary(0,rnd,0.05);o[k]=GL.fromGeo(G[k]);if(k!=='clip'&&k!=='rocket')wg.merge(G[k]);}
  o.world=GL.fromGeo(wg);return this.M[id]=o;},
 _misc(){if(this.M.hR)return this.M;const M=this.M,h=wmHand(),hl=new Geo();hl.merge(h);hl.xform(0,(v,isN)=>[-v[0],v[1],v[2]]);M.hR=GL.fromGeo(h);M.hL=GL.fromGeo(hl);M.sl=GL.fromGeo(wmSleeve());
  const g=new Geo(),c=[3.4,2.5,1.2],c2=[3.2,1.9,0.7];for(let i=0;i<6;i++){const a=i/6*Math.PI*2,r=i%2?0.045:0.07;g.tri([0,0,0.01],[Math.cos(a)*r,Math.sin(a)*r,0.05],[Math.cos(a+0.5)*0.015,Math.sin(a+0.5)*0.015,0.02],c2,false);}
  g.tri([-0.022,0,0],[0.022,0,0],[0,0,0.17],c,false);g.tri([0,-0.022,0],[0,0.022,0],[0,0,0.17],c,false);g.tri([-0.012,-0.012,0],[0.012,0.012,0],[0,0,0.11],c,false);M.flash=GL.fromGeo(g);
  const r=new Geo(),k=[0.01,0.01,0.01];r.box(-0.0045,0.0045,-0.4,-0.012,0,0.001,k);r.tri([-0.0045,-0.012,0],[0.0045,-0.012,0],[0,-0.0015,0],k,false);r.box(0.016,0.4,-0.0028,0.0028,0,0.001,k);r.box(-0.4,-0.016,-0.0028,0.0028,0,0.001,k);
  M.ret=GL.fromGeo(r);return M;},
 // dibuja una malla con uModel = cámara · X
 _dm(p,mesh,X){if(!mesh)return;const T=this._m3;M4.mul(Cam.M,X,T);GL.gl.uniformMatrix4fv(p.u.uModel,false,T);GL.draw(mesh);},
 // mano (y manga hasta el codo); X = matriz de la mano en espacio de cámara
 _hand(p,left,X){const M=this._misc(),gl=GL.gl;gl.uniform1f(p.u.uGloss,0.05);this._dm(p,left?M.hL:M.hR,X);
  const wr=M4.xfPoint(X,left?[0.03,-0.003,-0.07]:[-0.03,-0.003,-0.07],this._w),bk=M4.xfDir(X,[0,-0.2,-1],this._u),bl=Math.hypot(bk[0],bk[1],bk[2])||1;
  const bx=left?0.35:-0.3,ex=bk[0]/bl*0.3+bx*0.7,ey=bk[1]/bl*0.3-0.9*0.7,ez=bk[2]/bl*0.3-0.3*0.7,el=Math.hypot(ex,ey,ez)||1,L=0.3;
  const zx=ex/el*L,zy=ey/el*L,zz=ez/el*L;let xx=zz,xz=-zx,xl=Math.hypot(xx,xz)||1;xx/=xl;xz/=xl;const zl=L,ux=(zy*xz)/zl,uy=(zz*xx-zx*xz)/zl,uz=(-zy*xx)/zl;
  const S=this._m2;S[0]=xx;S[1]=0;S[2]=xz;S[3]=0;S[4]=ux;S[5]=uy;S[6]=uz;S[7]=0;S[8]=zx;S[9]=zy;S[10]=zz;S[11]=0;S[12]=wr[0];S[13]=wr[1];S[14]=wr[2];S[15]=1;
  gl.uniform1f(p.u.uGloss,0);this._dm(p,M.sl,S);},
 drawViewmodel(){Post.fx.scope=0;const P=Player;if(!GL.gl||!P.alive)return;const V=this.V,w=this.cur(),d=w?WEAPONS[w.id]:null;if(!d&&!this.nd)return;
  if(d&&d.scope&&V.adsK>0.82&&this.st==='idle'){Post.fx.scope=clamp((V.adsK-0.82)/0.12,0,1);const M=this._misc();
   GL.drawViewmodel(54,p=>{const X=this._m;M4.ident(X);X[14]=0.5;X[12]=-P.sway.y*0.5*0;this._dm(p,M.ret,X);},1);V.flash=0;return;}
  GL.drawViewmodel(V.fov||54,p=>this._drawVM(p,d,w),this._sun);},
 _drawVM(p,d,w){const gl=GL.gl,V=this.V,M=this._misc(),X=this._m,Y=this._m2;
  if(d&&V.show){const mdl=this._mdl(d.model),m=WM_META[d.model],Wc=V.Wc;
   gl.uniform1f(p.u.uGloss,0.12);this._dm(p,mdl.w,Wc);gl.uniform1f(p.u.uGloss,0.42);this._dm(p,mdl.m,Wc);
   if(mdl.mag){M4.compose(V.mag,0,0,0,1,X);M4.mul(Wc,X,X);this._dm(p,mdl.mag,X);}
   if(mdl.bolt){const bz=m.bolt?m.bolt.z:0;M4.compose(null,0,0,V.K*((m.bolt&&m.bolt.lift)||0),1,X);X[14]=V.B*bz;M4.mul(Wc,X,X);this._dm(p,mdl.bolt,X);}
   if(mdl.belt)this._dm(p,mdl.belt,Wc);
   if(mdl.clip&&(m.clip&&V.clip||m.strip&&V.strip)){M4.ident(X);if(m.clip&&V.clip===2||m.strip){X[12]=V.itemP[0];X[13]=V.itemP[1];X[14]=V.itemP[2];}M4.mul(Wc,X,X);this._dm(p,mdl.clip,X);}
   if(mdl.rocket&&V.rocket){M4.ident(X);X[12]=V.itemP[0];X[13]=V.itemP[1];X[14]=V.itemP[2];M4.mul(Wc,X,X);this._dm(p,mdl.rocket,X);}
   // manos
   if(!V.rhC){M4.compose(V.rh,V.rh[3],V.rh[4],V.rh[5],1,X);M4.mul(Wc,X,X);this._hand(p,false,X);}
   if(!V.lhC&&!V.lhHide&&!d.mounted||d.mounted&&!V.lhC){M4.compose(V.lh,V.lh[3],V.lh[4],V.lh[5],1,X);M4.mul(Wc,X,X);this._hand(p,true,X);}
   // fogonazo: estrella emisiva + resplandor (partícula aditiva con la proyección del arma)
   if(V.flash>0){V.flash--;const mz=m.muz,k=(d.cls==='pistol'?0.7:d.mounted?1.3:d.mode==='rocket'?2:1)*V.fs*(1-0.35*V.adsK);M4.compose(mz,0,0,V.fr,k,X);M4.mul(Wc,X,X);this._dm(p,M.flash,X);
    const q=M4.xfPoint(Cam.M,M4.xfPoint(Wc,[mz[0],mz[1],mz[2]+0.05*k],this._w),this._u),F=this._fp;F[0]=q[0];F[1]=q[1];F[2]=q[2];F[3]=0.16*k;F[4]=0.9;F[5]=V.fr;F[6]=1;F[7]=1;F[8]=0.8;F[9]=0.45;
    F[10]=q[0];F[11]=q[1];F[12]=q[2];F[13]=0.32*k;F[14]=0.35;F[15]=0;F[16]=2;F[17]=1;F[18]=0.75;F[19]=0.4;const vp=Cam.VP;Cam.VP=VM_VP;GL.drawParticles(F,2,true);Cam.VP=vp;gl.useProgram(p.p);}}
  // granada, cuchillo y manos libres
  if(V.rhC){M4.compose(V.rh,V.rh[3],V.rh[4],V.rh[5],1,X);this._hand(p,false,X);
   if(V.item==='nade'){const nm=this._mdl(this.inv.nadeT==='stiel'?'stiel':'frag');M4.compose([0.002,0.0,0.002],0,this.inv.nadeT==='stiel'?1.2:0,0,1,Y);M4.mul(X,Y,Y);gl.uniform1f(p.u.uGloss,0.3);this._dm(p,nm.world,Y);}}
  if(V.lhC){M4.compose(V.lh,V.lh[3],V.lh[4],V.lh[5],1,X);this._hand(p,true,X);
   if(V.knife){const km=this._mdl('knife');M4.compose([0.0,0.0,0.0],0,-1.57,0,1,Y);M4.mul(X,Y,Y);gl.uniform1f(p.u.uGloss,0.5);this._dm(p,km.world,Y);}}
  gl.uniform1f(p.u.uGloss,0);},
 // armas tiradas, ametralladoras fijas, granadas y cohetes en el mundo (pass 'shadow' | 'main')
 drawWorld(pass){if(!GL.gl)return;const gl=GL.gl,sh=pass==='shadow',p=sh?GL.progs.depth:GL.progs.lit,u=p.u,M=this._m;if(!sh){Lit.setup(p);gl.uniform1f(u.uGloss,0.25);}
  const put=m=>{gl.uniformMatrix4fv(u.uModel,false,M);GL.draw(m);},e=Cam.eye;
  for(const q of this.pickups){const d=WEAPONS[q.id];if(!d||!d.model||V3.dist2(q.pos,e)>4900)continue;if(!sh&&!Cam.sphereVisible(q.pos,0.8))continue;
   M4.compose([q.pos[0],q.pos[1]+0.025,q.pos[2]],q.yaw,0,Math.PI/2,1,M);put(this._mdl(d.model).world);}
  for(const q of World.usables)if(q.kind==='mg'&&q.on!==false&&q!==this.mountU&&q.draw!==false&&q.pos){M4.compose([q.pos[0],q.pos[1]+(q.mountH||0),q.pos[2]],q.yaw||0,0,0,1,M);put(this._mdl('mg42').world);}
  for(const g of this.grenades){const st=g.type==='stiel';M4.compose(g.pos,g.ry,st?g.rx:g.rx*0.3,st?0:g.rx,1,M);put(this._mdl(st?'stiel':'frag').world);}
  for(const r of this.rockets){const sp=Math.hypot(r.vel[0],r.vel[1],r.vel[2])||1;M4.compose(r.pos,V3.yawOf(r.vel),Math.asin(clamp(r.vel[1]/sp,-1,1)),0,1,M);M4.translate(M,0,0,-0.44);
   const b=this._mdl('bazooka');put(b.rocket);if(!sh){M4.compose(null,0,0,Math.random()*6,0.7+Math.random()*0.4,this._m2);M4.mul(M,this._m2,M);M4.translate(M,0,0,0);const fm=this._misc().flash;
    M[8]=-M[8];M[9]=-M[9];M[10]=-M[10];put(fm);}}
  gl.uniformMatrix4fv(u.uModel,false,MI);if(!sh)gl.uniform1f(u.uGloss,0);}
};
Bus.on('glRestored',()=>{Weapons.M={};});
