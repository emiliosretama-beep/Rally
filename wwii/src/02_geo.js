// ===== FRENTE 44 · geometría (Geo) y texturas procedurales (Tex) =====
// Geo acumula triángulos planos (sin índices) con normal, color y uv por vértice; GL.fromGeo(g) / GL.instOf(g) / GL.matInst(g) lo suben a la GPU.
// Orientación de normales en tri(): ctr=[x,y,z] -> hacia fuera de ese punto; ctr=false -> según el orden de los vértices; sin ctr -> hacia arriba.
class Geo{
 constructor(){this.p=[];this.n=[];this.c=[];this.u=[];}
 get count(){return this.p.length/3;}
 tri(a,b,c,col,ctr,uvs){
  const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
  let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;
  if(ctr){const mx=(a[0]+b[0]+c[0])/3-ctr[0],my=(a[1]+b[1]+c[1])/3-ctr[1],mz=(a[2]+b[2]+c[2])/3-ctr[2];if(nx*mx+ny*my+nz*mz<0){nx=-nx;ny=-ny;nz=-nz;}}
  else if(ctr!==false&&ny<0){nx=-nx;ny=-ny;nz=-nz;}
  const vs=[a,b,c];for(let k=0;k<3;k++){const v=vs[k];this.p.push(v[0],v[1],v[2]);this.n.push(nx,ny,nz);this.c.push(col[0],col[1],col[2]);
    if(uvs)this.u.push(uvs[k*2],uvs[k*2+1]);else this.u.push(0,0);}
 }
 quad(a,b,c,d,col,ctr,uvs){this.tri(a,b,c,col,ctr,uvs?[uvs[0],uvs[1],uvs[2],uvs[3],uvs[4],uvs[5]]:null);this.tri(a,c,d,col,ctr,uvs?[uvs[0],uvs[1],uvs[4],uvs[5],uvs[6],uvs[7]]:null);}
 hexa(v,col,faceCols){ // v: 8 esquinas (0-3 abajo, 4-7 arriba); faceCols: [abajo, arriba, z0, x1, z1, x0]
  const ctr=[0,0,0];for(const q of v){ctr[0]+=q[0]/8;ctr[1]+=q[1]/8;ctr[2]+=q[2]/8;}
  const F=[[0,1,2,3],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]];
  F.forEach((f,i)=>this.quad(v[f[0]],v[f[1]],v[f[2]],v[f[3]],(faceCols&&faceCols[i])||col,ctr));
 }
 beam(a,b,w,h,col){ // prisma rectangular de a a b (sección w x h)
  const d=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],l=Math.hypot(d[0],d[1],d[2])||1;d[0]/=l;d[1]/=l;d[2]/=l;
  let s=[-d[2],0,d[0]];let sl=Math.hypot(s[0],s[1],s[2]);
  if(sl<1e-4){s=[0,0,1];sl=1;}s=[s[0]/sl,s[1]/sl,s[2]/sl];
  const u=[s[1]*d[2]-s[2]*d[1],s[2]*d[0]-s[0]*d[2],s[0]*d[1]-s[1]*d[0]];
  const c=(p,i,j)=>[p[0]+s[0]*i*w/2+u[0]*j*h/2,p[1]+s[1]*i*w/2+u[1]*j*h/2,p[2]+s[2]*i*w/2+u[2]*j*h/2];
  this.hexa([c(a,-1,-1),c(a,1,-1),c(a,1,1),c(a,-1,1),c(b,-1,-1),c(b,1,-1),c(b,1,1),c(b,-1,1)],col);
 }
 box(x0,x1,y0,y1,z0,z1,col,fc){this.hexa([[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]],col,fc);}
 cyl(r0,r1,y0,y1,seg,col,capCol,alt){ // tronco de cono vertical (r1=0: cono)
  const ctr=[0,(y0+y1)/2,0];
  for(let i=0;i<seg;i++){const a0=i/seg*Math.PI*2,a1=(i+1)/seg*Math.PI*2;
   const b0=[Math.cos(a0)*r0,y0,Math.sin(a0)*r0],b1=[Math.cos(a1)*r0,y0,Math.sin(a1)*r0],t0=[Math.cos(a0)*r1,y1,Math.sin(a0)*r1],t1=[Math.cos(a1)*r1,y1,Math.sin(a1)*r1];
   if(r1>0)this.quad(b0,b1,t1,t0,col,ctr);else this.tri(b0,b1,t0,col,ctr);
   const cc=alt&&i%2?alt:(capCol||col);
   if(r0>0)this.tri([0,y0,0],b0,b1,cc,ctr);if(r1>0)this.tri([0,y1,0],t0,t1,cc,ctr);}
 }
 ico(r,col){const t=(1+Math.sqrt(5))/2;const V=[[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]].map(v=>{const l=Math.hypot(...v);return v.map(x=>x/l*r);});
  const F=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
  for(const f of F)this.tri(V[f[0]],V[f[1]],V[f[2]],col,[0,0,0]);}
 // caja con aristas biseladas (b = tamaño del bisel)
 bbox(x0,x1,y0,y1,z0,z1,b,col,fc){const cx=(x0+x1)/2,cy=(y0+y1)/2,cz=(z0+z1)/2,hx=(x1-x0)/2,hy=(y1-y0)/2,hz=(z1-z0)/2;b=Math.min(b,hx*0.9,hy*0.9,hz*0.9);
  const ctr=[cx,cy,cz],P=(ax,sx,sy,sz)=>ax===0?[cx+sx*hx,cy+sy*(hy-b),cz+sz*(hz-b)]:ax===1?[cx+sx*(hx-b),cy+sy*hy,cz+sz*(hz-b)]:[cx+sx*(hx-b),cy+sy*(hy-b),cz+sz*hz];
  const S=[-1,1],fcol=i=>(fc&&fc[i])||col;
  for(const s of S){this.quad(P(0,s,-1,-1),P(0,s,1,-1),P(0,s,1,1),P(0,s,-1,1),fcol(s<0?5:3),ctr);
   this.quad(P(1,-1,s,-1),P(1,1,s,-1),P(1,1,s,1),P(1,-1,s,1),fcol(s<0?0:1),ctr);
   this.quad(P(2,-1,-1,s),P(2,1,-1,s),P(2,1,1,s),P(2,-1,1,s),fcol(s<0?2:4),ctr);}
  for(const a of S)for(const c of S){ // biseles de las 12 aristas
   this.quad(P(0,a,c,-1),P(0,a,c,1),P(1,a,c,1),P(1,a,c,-1),col,ctr); // x-y (a lo largo de z)
   this.quad(P(0,a,-1,c),P(0,a,1,c),P(2,a,1,c),P(2,a,-1,c),col,ctr); // x-z (a lo largo de y)
   this.quad(P(1,-1,a,c),P(1,1,a,c),P(2,1,a,c),P(2,-1,a,c),col,ctr);} // y-z (a lo largo de x)
  for(const sx of S)for(const sy of S)for(const sz of S)this.tri(P(0,sx,sy,sz),P(1,sx,sy,sz),P(2,sx,sy,sz),col,ctr);}
 // cuña o rampa: sube de y0 (en z0) a y1 (en z1) sobre la base x0..x1
 wedge(x0,x1,y0,y1,z0,z1,col){const ctr=[(x0+x1)/2,y0+(y1-y0)/3,z0+(z1-z0)*2/3],a=[x0,y0,z0],b=[x1,y0,z0],c=[x1,y0,z1],d=[x0,y0,z1],e=[x1,y1,z1],f=[x0,y1,z1];
  this.quad(a,b,c,d,col,ctr);this.quad(a,b,e,f,col,ctr);this.quad(d,c,e,f,col,ctr);this.tri(a,d,f,col,ctr);this.tri(b,c,e,col,ctr);}
 // tubo (tronco de cono) de a a b: cañones, tuberías, ramas
 tube(a,b,r0,r1,seg,col,capCol){const m=this.mark(),d=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],l=Math.hypot(d[0],d[1],d[2])||1;this.cyl(r0,r1,0,l,seg||6,col,capCol);
  const y=[d[0]/l,d[1]/l,d[2]/l],t=Math.abs(y[1])<0.95?[0,1,0]:[1,0,0],x=V3.norm(V3.cross(t,y)),z=V3.cross(x,y);
  this.xform(m,(v,isN)=>{const r=[x[0]*v[0]+y[0]*v[1]+z[0]*v[2],x[1]*v[0]+y[1]*v[1]+z[1]*v[2],x[2]*v[0]+y[2]*v[1]+z[2]*v[2]];if(!isN){r[0]+=a[0];r[1]+=a[1];r[2]+=a[2];}return r;});}
 // sólido de revolución alrededor de Y: prof = [[r,y],...] de abajo arriba por la cara exterior (r=0 en un extremo lo cierra).
 // col: color o función (i del tramo) -> color. Cascos, granadas, botellas, cañones, depósitos...
 lathe(prof,seg,col,a0,a1){seg=seg||8;a0=a0||0;a1=a1==null?Math.PI*2:a1;let L=0;const vs=[0];for(let i=1;i<prof.length;i++){L+=Math.hypot(prof[i][0]-prof[i-1][0],prof[i][1]-prof[i-1][1]);vs.push(L);}
  for(let i=0;i<prof.length-1;i++){const [r0,y0]=prof[i],[r1,y1]=prof[i+1],cc=typeof col==='function'?col(i):col;
   for(let j=0;j<seg;j++){const b0=a0+(a1-a0)*j/seg,b1=a0+(a1-a0)*(j+1)/seg,c0=Math.cos(b0),s0=Math.sin(b0),c1=Math.cos(b1),s1=Math.sin(b1);
    const P0=[c0*r0,y0,s0*r0],P1=[c1*r0,y0,s1*r0],Q0=[c0*r1,y1,s0*r1],Q1=[c1*r1,y1,s1*r1],u0=j/seg,u1=(j+1)/seg,v0=vs[i]/(L||1),v1=vs[i+1]/(L||1);
    if(r0<=1e-6)this.tri(P0,Q0,Q1,cc,false,[u0,v0,u0,v1,u1,v1]);
    else if(r1<=1e-6)this.tri(P0,Q0,P1,cc,false,[u0,v0,u0,v1,u1,v0]);
    else this.quad(P0,Q0,Q1,P1,cc,false,[u0,v0,u0,v1,u1,v1,u1,v0]);}}}
 // esfera (o media esfera si half: de y=0 hacia arriba)
 sphere(r,seg,rings,col,half){rings=rings||5;const P=[];const t0=half?Math.PI/2:0;for(let i=0;i<=rings;i++){const t=t0+(Math.PI-t0)*i/rings;P.push([Math.sin(t)*r,-Math.cos(t)*r]);}
  if(half)P.unshift([0,0]);this.lathe(P,seg||8,col);}
 // cápsula vertical de y=0 a y=h (h >= 2r)
 capsule(r,h,seg,col,rings){rings=rings||3;const P=[];for(let i=0;i<=rings;i++){const t=i/rings*Math.PI/2;P.push([Math.sin(t)*r,r-Math.cos(t)*r]);}
  for(let i=0;i<=rings;i++){const t=Math.PI/2+i/rings*Math.PI/2;P.push([Math.sin(t)*r,h-r-Math.cos(t)*r]);}this.lathe(P,seg||8,col);}
 // caja redondeada (round = radio de las aristas, n = subdivisiones por cara, puff = abombado de las caras): sacos terreros, mochilas, cojines
 rbox(x0,x1,y0,y1,z0,z1,round,col,n,puff){n=n||3;puff=puff||0;const c=[(x0+x1)/2,(y0+y1)/2,(z0+z1)/2],h=[(x1-x0)/2,(y1-y0)/2,(z1-z0)/2],r=Math.min(round,h[0],h[1],h[2]);
  const map=(q,ax,a1,a2)=>{const C=[0,0,0],P=[0,0,0];for(let k=0;k<3;k++){P[k]=q[k]*h[k];C[k]=clamp(P[k],-(h[k]-r),h[k]-r);}
   let dx=P[0]-C[0],dy=P[1]-C[1],dz=P[2]-C[2];const l=Math.hypot(dx,dy,dz)||1;
   const o=[c[0]+C[0]+dx/l*r,c[1]+C[1]+dy/l*r,c[2]+C[2]+dz/l*r];o[ax]+=q[ax]*puff*(1-q[a1]*q[a1])*(1-q[a2]*q[a2]);return o;}; // abombado: máximo en el centro de cada cara
  const face=(ax,s)=>{const a1=(ax+1)%3,a2=(ax+2)%3;for(let j=0;j<n;j++)for(let i=0;i<n;i++){const g=(ii,jj)=>{const q=[0,0,0];q[ax]=s;q[a1]=-1+2*ii/n;q[a2]=-1+2*jj/n;return map(q,ax,a1,a2);};
   this.quad(g(i,j),g(i+1,j),g(i+1,j+1),g(i,j+1),col,c);}};
  for(let ax=0;ax<3;ax++){face(ax,-1);face(ax,1);}}
 // saco terrero centrado en el suelo: largo (x), ancho (z), alto (y)
 sandbag(len,wid,hgt,col){const m=this.mark();this.rbox(-len/2,len/2,0,hgt,-wid/2,wid/2,hgt*0.45,col,3,hgt*0.06);
  this.xform(m,(v,isN)=>isN?v:[v[0],v[1]*(1-0.12*(v[0]/len*2)*(v[0]/len*2)),v[2]]);} // las puntas algo más bajas
 // rejilla plana (opcional H(x,z) para la altura y cfn(x,z) para el color), normales hacia arriba
 grid(x0,z0,x1,z1,nx,nz,col,H,cfn,uvK){const y=(x,z)=>H?H(x,z):0;uvK=uvK||0;
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const xa=x0+(x1-x0)*i/nx,xb=x0+(x1-x0)*(i+1)/nx,za=z0+(z1-z0)*j/nz,zb=z0+(z1-z0)*(j+1)/nz;
   const cc=cfn?cfn((xa+xb)/2,(za+zb)/2):col;this.quad([xa,y(xa,za),za],[xb,y(xb,za),za],[xb,y(xb,zb),zb],[xa,y(xa,zb),zb],cc,null,uvK?[xa*uvK,za*uvK,xb*uvK,za*uvK,xb*uvK,zb*uvK,xa*uvK,zb*uvK]:null);}}
 mark(){return this.p.length;}
 xform(start,fn){ // fn(v,isN)->v aplicado a posición y normal (sin traslación para normales)
  for(let i=start;i<this.p.length;i+=3){const p=fn([this.p[i],this.p[i+1],this.p[i+2]],false),n=fn([this.n[i],this.n[i+1],this.n[i+2]],true);
   this.p[i]=p[0];this.p[i+1]=p[1];this.p[i+2]=p[2];const l=Math.hypot(n[0],n[1],n[2])||1;this.n[i]=n[0]/l;this.n[i+1]=n[1]/l;this.n[i+2]=n[2]/l;}}
 // aplica una matriz M4 desde start (normales con la inversa traspuesta)
 xformM(start,m){const P=this.p,N=this.n,c0=[m[0],m[1],m[2]],c1=[m[4],m[5],m[6]],c2=[m[8],m[9],m[10]],k0=V3.cross(c1,c2),k1=V3.cross(c2,c0),k2=V3.cross(c0,c1);
  for(let i=start;i<P.length;i+=3){const x=P[i],y=P[i+1],z=P[i+2];P[i]=m[0]*x+m[4]*y+m[8]*z+m[12];P[i+1]=m[1]*x+m[5]*y+m[9]*z+m[13];P[i+2]=m[2]*x+m[6]*y+m[10]*z+m[14];
   const a=N[i],b=N[i+1],c=N[i+2],nx=k0[0]*a+k1[0]*b+k2[0]*c,ny=k0[1]*a+k1[1]*b+k2[1]*c,nz=k0[2]*a+k1[2]*b+k2[2]*c,l=Math.hypot(nx,ny,nz)||1;N[i]=nx/l;N[i+1]=ny/l;N[i+2]=nz/l;}}
 translate(start,x,y,z){const P=this.p;for(let i=start;i<P.length;i+=3){P[i]+=x;P[i+1]+=y;P[i+2]+=z;}}
 scale(start,sx,sy,sz){if(sy==null)sy=sz=sx;this.xform(start,(v,isN)=>isN?[v[0]/sx,v[1]/sy,v[2]/sz]:[v[0]*sx,v[1]*sy,v[2]*sz]);}
 recolor(start,col){col=hex(col);for(let i=start;i<this.c.length;i+=3){this.c[i]=col[0];this.c[i+1]=col[1];this.c[i+2]=col[2];}}
 tint(start,k){const t=typeof k==='number'?[k,k,k]:hex(k);for(let i=start;i<this.c.length;i+=3){this.c[i]*=t[0];this.c[i+1]*=t[1];this.c[i+2]*=t[2];}}
 // variación de tono por triángulo (aspecto facetado más rico): amt ~0.06
 vary(start,rnd,amt){for(let i=start;i<this.c.length;i+=9){const k=1+(rnd()*2-1)*amt;for(let j=0;j<9;j++)this.c[i+j]*=k;}}
 // uv proyectadas desde la posición según el eje dominante de la normal (paredes, suelos), escala en repeticiones por metro
 uvProj(start,k){k=k||1;const P=this.p,N=this.n,U=this.u;for(let i=start;i<P.length;i+=3){const ax=Math.abs(N[i]),ay=Math.abs(N[i+1]),az=Math.abs(N[i+2]),j=i/3*2;
  if(ay>=ax&&ay>=az){U[j]=P[i]*k;U[j+1]=P[i+2]*k;}else if(ax>=az){U[j]=P[i+2]*k;U[j+1]=-P[i+1]*k;}else{U[j]=P[i]*k;U[j+1]=-P[i+1]*k;}}}
 // añade otra geometría (opcionalmente transformada por una M4)
 merge(g,m){const s=this.mark();for(let i=0;i<g.p.length;i++){this.p.push(g.p[i]);this.n.push(g.n[i]);this.c.push(g.c[i]);}for(let i=0;i<g.u.length;i++)this.u.push(g.u[i]);if(m)this.xformM(s,m);return this;}
 data(){return {p:new Float32Array(this.p),n:new Float32Array(this.n),c:new Float32Array(this.c),u:new Float32Array(this.u)};}
 // malla indexada con normales suaves para relieve: esquina x0,z0, tamaño w x d, nx x nz celdas, H(x,z), cfn(x,z,n)->color, uv por metro
 static gridData(x0,z0,w,d,nx,nz,H,cfn,uvK){const NX=nx+1,NZ=nz+1,p=new Float32Array(NX*NZ*3),n=new Float32Array(NX*NZ*3),c=new Float32Array(NX*NZ*3),u=new Float32Array(NX*NZ*2),idx=new Uint32Array(nx*nz*6);
  const e=Math.min(w/nx,d/nz)*0.5;uvK=uvK||0.15;let q=0;
  for(let j=0;j<NZ;j++)for(let i=0;i<NX;i++){const x=x0+w*i/nx,z=z0+d*j/nz,k=j*NX+i,y=H(x,z);p[k*3]=x;p[k*3+1]=y;p[k*3+2]=z;
   const hx=(H(x+e,z)-H(x-e,z))/(2*e),hz=(H(x,z+e)-H(x,z-e))/(2*e),l=Math.hypot(hx,1,hz),nn=[-hx/l,1/l,-hz/l];n[k*3]=nn[0];n[k*3+1]=nn[1];n[k*3+2]=nn[2];
   const cc=cfn?cfn(x,z,nn):[1,1,1];c[k*3]=cc[0];c[k*3+1]=cc[1];c[k*3+2]=cc[2];u[k*2]=x*uvK;u[k*2+1]=z*uvK;}
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=j*NX+i;idx[q++]=a;idx[q++]=a+1;idx[q++]=a+NX;idx[q++]=a+1;idx[q++]=a+NX+1;idx[q++]=a+NX;}
  return {p,n,c,u,idx};}
}
// giros para Geo.xform: rotY(a,tx,ty,tz) gira y luego traslada
const rotY=(a,tx,ty,tz)=>(v,isN)=>{const c=Math.cos(a),s=Math.sin(a);const x=c*v[0]+s*v[2],z=-s*v[0]+c*v[2];return isN?[x,v[1],z]:[x+(tx||0),v[1]+(ty||0),z+(tz||0)];};
const rotZ=(a,tx,ty,tz)=>(v,isN)=>{const c=Math.cos(a),s=Math.sin(a);const x=c*v[0]-s*v[1],y=s*v[0]+c*v[1];return isN?[x,y,v[2]]:[x+(tx||0),y+(ty||0),v[2]+(tz||0)];};
const rotX=(a,tx,ty,tz)=>(v,isN)=>{const c=Math.cos(a),s=Math.sin(a);const y=c*v[1]-s*v[2],z=s*v[1]+c*v[2];return isN?[v[0],y,z]:[v[0]+(tx||0),y+(ty||0),z+(tz||0)];};

// ---------- Texturas procedurales ----------
function canvasTex(w,h,fn){const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);return c;}
// ruido de valor (periódico si per>0) para pintar texturas que se repiten sin costura
function hash2(ix,iy,s){let h=Math.imul(ix,374761393)+Math.imul(iy,668265263)+Math.imul(s|0,1442695041)|0;h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967296;}
function vnoise(x,y,s,per){let ix=Math.floor(x),iy=Math.floor(y);const fx=x-ix,fy=y-iy,ux=fx*fx*(3-2*fx),uy=fy*fy*(3-2*fy);let jx=ix+1,jy=iy+1;
 if(per){ix=((ix%per)+per)%per;iy=((iy%per)+per)%per;jx=jx%per;jy=jy%per;}
 const a=hash2(ix,iy,s),b=hash2(jx,iy,s),c=hash2(ix,jy,s),d=hash2(jx,jy,s);return a+(b-a)*ux+(c-a)*uy+(a-b-c+d)*ux*uy;}
function fbm2(x,y,s,oct,per){let v=0,a=0.5,t=0;for(let i=0;i<(oct||4);i++){v+=a*vnoise(x,y,s+i*17,per);t+=a;x*=2;y*=2;if(per)per*=2;a*=0.5;}return v/t;}
// dibuja fn(x,y) y sus copias al otro lado cuando está a menos de r de un borde
function wrapAt(w,h,x,y,r,fn){fn(x,y);const X=x<r?x+w:x>w-r?x-w:null,Y=y<r?y+h:y>h-r?y-h:null;if(X!=null)fn(X,y);if(Y!=null)fn(x,Y);if(X!=null&&Y!=null)fn(X,Y);}
// modula el brillo de lo pintado: variación suave (fbm periódico) + grano fino por píxel. Sin manchas oscuras
function texNoise(g,w,h,seed,cells,amp,grain,oct){const img=g.getImageData(0,0,w,h),d=img.data,rnd=mulberry32(seed+5);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const v=fbm2(x/w*cells,y/h*cells,seed,oct||3,cells)-0.5,k=1+amp*v*2+(rnd()-0.5)*grain*2,i=(y*w+x)*4;
  d[i]=clamp(d[i]*k,0,255);d[i+1]=clamp(d[i+1]*k,0,255);d[i+2]=clamp(d[i+2]*k,0,255);}
 g.putImageData(img,0,0);}
// rectángulo redondeado (sin depender de CanvasRenderingContext2D.roundRect, que falta en Safari antiguos)
function rrect(g,x,y,w,h,r){w=Math.max(w,0.1);h=Math.max(h,0.1);r=Math.max(0,Math.min(r,w/2,h/2));g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
const grey=(v,a)=>a==null?`rgb(${v|0},${v|0},${v|0})`:`rgba(${v|0},${v|0},${v|0},${a})`;
// Texturas de detalle casi blancas (media ~0.85): el color lo pone el vértice (o uTint). Se suben con GL.tex(Tex.xxx(), true).
// Las de atlas (particles, decals) son ImageData con RGB también donde el alfa es 0 (sin halos oscuros al filtrar).
const Tex={_c:{},
 get(k,fn){return this._c[k]||(this._c[k]=fn());},
 // suelo: 'grass' | 'dirt' | 'sand' | 'snow' | 'mud'
 ground(kind,seed){seed=seed||1;return this.get('g:'+kind+seed,()=>canvasTex(256,256,(g,w,h)=>{const rnd=mulberry32(seed*31+kind.length);
  const base={grass:226,dirt:220,sand:232,snow:246,mud:206}[kind]||224;g.fillStyle=grey(base);g.fillRect(0,0,w,h);
  if(kind==='snow'){texNoise(g,w,h,seed,4,0.05,0.02);
   for(let i=0;i<900;i++){const v=228+rnd()*27,s=1.5+rnd()*4,x=rnd()*w,y=rnd()*h,a=rnd()*3;wrapAt(w,h,x,y,s*2,(X,Y)=>{g.fillStyle=`rgb(${v|0},${v+2|0},${Math.min(255,v+6)|0})`;g.beginPath();g.ellipse(X,Y,s*1.6,s,a,0,7);g.fill();});}
   for(let i=0;i<300;i++){g.fillStyle='#ffffff';g.fillRect(rnd()*w,rnd()*h,1,1);}return;}
  if(kind==='sand'){texNoise(g,w,h,seed,3,0.06,0.04);
   for(let i=0;i<26;i++){const y0=rnd()*h,k=1+Math.floor(rnd()*3),ph=rnd()*7,am=2+rnd()*4;g.strokeStyle=rnd()<0.5?'rgba(0,0,0,0.05)':'rgba(255,255,255,0.08)';g.lineWidth=1+rnd()*1.5;
    for(const off of [-h,0,h]){g.beginPath();for(let x=0;x<=w;x+=4){const y=y0+off+Math.sin(x/w*Math.PI*2*k+ph)*am;x?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();}}
   for(let i=0;i<3500;i++){g.fillStyle=rnd()<0.5?grey(255,0.35):grey(120,0.18);g.fillRect(rnd()*w,rnd()*h,1,1);}return;}
  texNoise(g,w,h,seed,4,kind==='mud'?0.12:0.1,0.05);
  for(let i=0;i<1500;i++){const v=150+rnd()*100,s=0.7+rnd()*2.4,x=rnd()*w,y=rnd()*h,a=rnd()*3,al=0.35+rnd()*0.4;
   wrapAt(w,h,x,y,s*2,(X,Y)=>{g.fillStyle=grey(v,al);g.beginPath();g.ellipse(X,Y,s*1.5,s,a,0,7);g.fill();});}
  if(kind==='grass'){for(let i=0;i<1300;i++){const x=rnd()*w,y=rnd()*h,l=3+rnd()*6,dx=(rnd()-0.5)*4,lt=rnd()<0.55;
    wrapAt(w,h,x,y,10,(X,Y)=>{g.strokeStyle=lt?grey(255,0.16+rnd()*0.2):'rgba(40,52,30,0.16)';g.lineWidth=1;g.beginPath();g.moveTo(X,Y);g.lineTo(X+dx,Y-l);g.stroke();});}}
  if(kind==='dirt'||kind==='mud'){for(let i=0;i<220;i++){const x=rnd()*w,y=rnd()*h,s=1.2+rnd()*2.4,v=225+rnd()*30;
    wrapAt(w,h,x,y,6,(X,Y)=>{g.fillStyle='rgba(60,50,40,0.22)';g.beginPath();g.ellipse(X+0.6,Y+0.9,s*1.2,s*0.9,0,0,7);g.fill();g.fillStyle=grey(v);g.beginPath();g.ellipse(X,Y,s*1.2,s*0.85,rnd()*3,0,7);g.fill();});}}
  if(kind==='mud'){for(let i=0;i<40;i++){const y=rnd()*h,x=rnd()*w,l=20+rnd()*40;wrapAt(w,h,x,y,60,(X,Y)=>{g.strokeStyle='rgba(255,255,255,0.12)';g.lineWidth=1.5;g.beginPath();g.moveTo(X,Y);g.quadraticCurveTo(X+l/2,Y+(rnd()-0.5)*6,X+l,Y);g.stroke();});}}
 }));},
 // tablones de madera a lo largo de u (4 por textura), con veta, juntas y clavos
 wood(seed){seed=seed||1;return this.get('wood'+seed,()=>canvasTex(256,256,(g,w,h)=>{const rnd=mulberry32(seed*97),ph=h/4;
  for(let p=0;p<4;p++){const v=205+rnd()*35,y0=p*ph;g.fillStyle=`rgb(${v|0},${v*0.965|0},${v*0.91|0})`;g.fillRect(0,y0,w,ph);
   for(let i=0;i<26;i++){const yy=y0+3+rnd()*(ph-6),k=1+Math.floor(rnd()*2),am=1+rnd()*3,f=rnd()*7;g.strokeStyle=rnd()<0.7?`rgba(70,50,30,${0.05+rnd()*0.1})`:'rgba(255,250,240,0.1)';g.lineWidth=0.6+rnd()*1.2;
    g.beginPath();for(let x=0;x<=w;x+=4){const y=yy+Math.sin(x/w*Math.PI*2*k+f)*am+Math.sin(x/w*Math.PI*2*(k+2)+f*2)*am*0.3;x?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();}
   if(rnd()<0.8){const kx=20+rnd()*(w-40),ky=y0+ph*(0.3+rnd()*0.4);for(let r=6;r>0;r-=1.5){g.strokeStyle=`rgba(70,48,28,${0.12+0.05*(6-r)})`;g.lineWidth=1;g.beginPath();g.ellipse(kx,ky,r*1.8,r*0.8,0,0,7);g.stroke();}}
   g.fillStyle='rgba(30,22,14,0.75)';g.fillRect(0,y0,w,1.5);g.fillStyle='rgba(255,255,255,0.12)';g.fillRect(0,y0+1.5,w,1);
   const jx=16+rnd()*(w-32);g.fillStyle='rgba(30,22,14,0.6)';g.fillRect(jx,y0,1.5,ph);
   g.fillStyle='rgba(40,40,40,0.8)';for(const nx of [jx-5,jx+6])for(const ny of [y0+ph*0.25,y0+ph*0.75]){g.beginPath();g.arc(nx,ny,1.4,0,7);g.fill();}}
  texNoise(g,w,h,seed,4,0.05,0.04);}));},
 // revoque/encalado: variación suave, marcas de llana y alguna grieta fina
 plaster(seed){seed=seed||1;return this.get('plaster'+seed,()=>canvasTex(256,256,(g,w,h)=>{const rnd=mulberry32(seed*53);g.fillStyle=grey(236);g.fillRect(0,0,w,h);
  for(let i=0;i<70;i++){const x=rnd()*w,y=rnd()*h,r=10+rnd()*28;wrapAt(w,h,x,y,r+2,(X,Y)=>{g.strokeStyle=rnd()<0.5?grey(255,0.05):grey(0,0.022);g.lineWidth=3+rnd()*5;g.beginPath();g.arc(X,Y,r,rnd()*6,rnd()*6+1.2);g.stroke();});}
  texNoise(g,w,h,seed,4,0.08,0.05,4);
  for(let i=0;i<5;i++){let x=30+rnd()*(w-60),y=30+rnd()*(h-60),a=rnd()*6;g.strokeStyle='rgba(60,55,50,0.18)';g.lineWidth=0.7;g.beginPath();g.moveTo(x,y);
   for(let k=0;k<14;k++){a+=(rnd()-0.5)*1.2;x=clamp(x+Math.cos(a)*4,4,w-4);y=clamp(y+Math.sin(a)*4,4,h-4);g.lineTo(x,y);}g.stroke();}}));},
 // ladrillo: 8 hiladas de 4 ladrillos al tresbolillo, mortero claro
 brick(seed){seed=seed||1;return this.get('brick'+seed,()=>canvasTex(256,256,(g,w,h)=>{const rnd=mulberry32(seed*71),bh=h/8,bw=w/4;g.fillStyle=grey(232);g.fillRect(0,0,w,h);
  for(let r=0;r<8;r++)for(let b=0;b<5;b++){const x=b*bw-(r%2?bw/2:0),y=r*bh,v=165+rnd()*55,t=rnd()*0.08;
   g.fillStyle=`rgb(${v*(1+t)|0},${v|0},${v*(0.97-t)|0})`;g.fillRect(x+1.5,y+1.5,bw-3,bh-3);
   g.strokeStyle='rgba(0,0,0,0.12)';g.lineWidth=1;g.strokeRect(x+2,y+2,bw-4,bh-4);g.fillStyle='rgba(255,255,255,0.1)';g.fillRect(x+2,y+2,bw-4,1.5);
   for(let i=0;i<30;i++){g.fillStyle=rnd()<0.5?grey(255,0.15):grey(0,0.12);g.fillRect(x+2+rnd()*(bw-4),y+2+rnd()*(bh-4),1.2,1.2);}
   if(rnd()<0.2){g.fillStyle=grey(225);g.beginPath();g.arc(x+(rnd()<0.5?3:bw-3),y+(rnd()<0.5?3:bh-3),3+rnd()*3,0,7);g.fill();}}
  texNoise(g,w,h,seed,4,0.06,0.04);}));},
 // muro de piedra (mampostería de granja): piedras irregulares por hiladas y juntas oscuras
 stone(seed){seed=seed||1;return this.get('stone'+seed,()=>canvasTex(256,256,(g,w,h)=>{const rnd=mulberry32(seed*41);g.fillStyle=grey(120);g.fillRect(0,0,w,h);
  const rows=[];let y=0;while(y<h){let rh=26+rnd()*20;if(h-(y+rh)<24)rh=h-y;rows.push([y,rh]);y+=rh;}
  for(const [y0,rh] of rows){let x=-rnd()*30;const xs=x;while(x<xs+w-0.5){let sw=30+rnd()*40;if(xs+w-x-sw<22)sw=xs+w-x;const v=170+rnd()*60,t=(rnd()-0.5)*0.08;
    for(const off of [0,w,-w]){const X=x+off;if(X>w||X+sw<0)continue;g.fillStyle=`rgb(${v*(1+t)|0},${v|0},${v*(1-t)|0})`;rrect(g,X+2,y0+2,sw-4,rh-4,5+rnd()*5);g.fill();
     const gr=g.createLinearGradient(0,y0,0,y0+rh);gr.addColorStop(0,'rgba(255,255,255,0.14)');gr.addColorStop(1,'rgba(0,0,0,0.14)');g.fillStyle=gr;g.fill();}
    x+=sw;}}
  texNoise(g,w,h,seed,6,0.08,0.06);}));},
 // metal pintado: chorreones verticales, arañazos y grano
 metal(seed){seed=seed||1;return this.get('metal'+seed,()=>canvasTex(256,256,(g,w,h)=>{const rnd=mulberry32(seed*29);g.fillStyle=grey(222);g.fillRect(0,0,w,h);
  texNoise(g,w,h,seed,3,0.06,0.03);
  for(let i=0;i<110;i++){const x=rnd()*w,y=rnd()*h,l=10+rnd()*60;g.fillStyle=rnd()<0.6?grey(0,0.035):grey(255,0.04);g.fillRect(x,y,1+rnd()*2,l);if(y+l>h)g.fillRect(x,y-h,1+rnd()*2,l);}
  for(let i=0;i<45;i++){const x=rnd()*w,y=rnd()*h,a=rnd()*6,l=4+rnd()*14;wrapAt(w,h,x,y,l,(X,Y)=>{g.strokeStyle=grey(255,0.22);g.lineWidth=0.7;g.beginPath();g.moveTo(X,Y);g.lineTo(X+Math.cos(a)*l,Y+Math.sin(a)*l);g.stroke();});}}));},
 // tejas o pizarra en hiladas al tresbolillo
 roof(seed){seed=seed||1;return this.get('roof'+seed,()=>canvasTex(256,256,(g,w,h)=>{const rnd=mulberry32(seed*13),th=h/8,tw=w/8;
  for(let r=0;r<8;r++)for(let b=0;b<9;b++){const x=b*tw-(r%2?tw/2:0),y=r*th,v=170+rnd()*60;const gr=g.createLinearGradient(0,y,0,y+th);
   gr.addColorStop(0,grey(v*0.8));gr.addColorStop(0.75,grey(v));gr.addColorStop(1,grey(v*0.55));g.fillStyle=gr;g.fillRect(x+1,y,tw-2,th);g.fillStyle='rgba(0,0,0,0.35)';g.fillRect(x,y,1,th);}
  texNoise(g,w,h,seed,4,0.06,0.05);}));},
 // atlas de partículas 2x2 (128 px por celda): 0 humo, 1 fuego, 2 chispa, 3 trozo de tierra o escombro
 particles(){return this.get('particles',()=>{const W=256,img=new ImageData(W,W),d=img.data;
  for(let y=0;y<W;y++)for(let x=0;x<W;x++){const cell=(y>=128?2:0)+(x>=128?1:0),u=(x%128+0.5)/64-1,v=(y%128+0.5)/64-1,r=Math.hypot(u,v);let R=1,G=1,B=1,A=0;
   if(cell===0){const n=fbm2(u*2.2+5,v*2.2+5,11,4),n2=fbm2(u*5+1,v*5+9,23,3);A=smooth((1-(r+(n-0.5)*0.75))/0.8)*(0.45+0.55*n2);const k=0.86+0.14*n-0.12*Math.max(0,v);R=G=B=k;}
   else if(cell===1){const n=fbm2(u*3+2,v*3-1,37,4),dd=Math.hypot(u*1.35,(v+0.15)*0.85+Math.max(0,-v)*0.35);const s=dd+(n-0.5)*0.5;A=smooth((1-s)/0.75);const hot=smooth((0.75-s)/0.6);
    R=1;G=0.42+0.5*hot;B=0.08+0.5*hot*hot;}
   else if(cell===2){A=Math.exp(-r*r*7)+0.5*Math.exp(-r*r*40);A=Math.min(1,A);R=1;G=0.95;B=0.8;}
   else{const a=Math.atan2(v,u),rad=0.58+0.14*Math.sin(a*3+1)+0.1*Math.sin(a*5+2.3)+0.06*Math.sin(a*9);A=smooth((rad-r)/0.08);const k=0.8+0.2*clamp(-u*0.5-v*0.5,-1,1)+0.08*(vnoise(u*9,v*9,5)-0.5);R=G=B=k;}
   const i=(y*W+x)*4;d[i]=R*255;d[i+1]=G*255;d[i+2]=B*255;d[i+3]=clamp(A,0,1)*255;}
  return img;});},
 // atlas de marcas 4x2 (128 px): 0 mancha de sombra, 1 agujero de bala, 2 agujero en madera, 3 quemadura, 4 sangre, 5 cráter, 6 tierra, 7 nieve
 decals(){return this.get('decals',()=>{const W=512,H=256,img=new ImageData(W,H),d=img.data,drops=[];const rnd=mulberry32(77);for(let i=0;i<9;i++)drops.push([(rnd()-0.5)*1.4,(rnd()-0.5)*1.4,0.05+rnd()*0.12]);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const cell=(y>=128?4:0)+(x>>7),u=(x%128+0.5)/64-1,v=(y%128+0.5)/64-1,r=Math.hypot(u,v),a=Math.atan2(v,u);let R=0,G=0,B=0,A=0;
   if(cell===0){const k=clamp(1-r*r,0,1);A=Math.min(1,k*(1.3-0.3*k));R=0.03;G=0.035;B=0.03;}
   else if(cell===1){const n=vnoise(a*3+7,r*6,3);const hole=smooth((0.13-r)/0.04),ring=smooth((0.36+0.12*n-r)/0.08)*(1-hole);
    const crack=smooth((0.03-Math.abs(Math.sin(a*3.5+1.3)*r))/0.02)*smooth((0.62-r)/0.2)*(r>0.1?1:0);
    A=Math.max(hole,ring*0.6,crack*0.5);const k=hole>0.5?0.04:0.22+0.1*n;R=G=B=k;}
   else if(cell===2){const n=vnoise(u*3,v*14,9);const hole=smooth((0.12-r)/0.04),spl=smooth((0.22+0.5*n-Math.abs(v)*3-Math.abs(u)*0.4)/0.1)*smooth((0.8-Math.abs(u))/0.2);
    A=Math.max(hole,spl*0.75);R=hole>0.5?0.05:0.78;G=hole>0.5?0.04:0.66;B=hole>0.5?0.03:0.5;}
   else if(cell===3){const n=fbm2(u*2.5+3,v*2.5+3,41,4);A=smooth((1-(r+(n-0.5)*0.6))/0.6)*0.92;R=0.05;G=0.045;B=0.04;}
   else if(cell===4){const n=fbm2(u*3+1,v*3+1,51,3);let m=smooth((0.42+(n-0.5)*0.4-r)/0.06);for(const [dx,dy,dr] of drops)m=Math.max(m,smooth((dr-Math.hypot(u-dx,v-dy))/0.03));
    A=m*0.85;R=0.33;G=0.025;B=0.02;}
   else if(cell===5){const n=fbm2(u*3+9,v*3+9,61,4),rr=r+(n-0.5)*0.25;const burn=smooth((0.55-rr)/0.3),rim=smooth((0.25-Math.abs(rr-0.72))/0.18);
    A=Math.max(burn*0.92,rim*0.55)*smooth((1-rr)/0.15);const k=burn>rim?0.06:0.34;R=k;G=k*0.86;B=k*0.7;}
   else if(cell===6){const n=fbm2(u*3+4,v*3+4,71,4);A=smooth((0.8-(r+(n-0.5)*0.7))/0.25)*0.8;R=0.3;G=0.24;B=0.17;}
   else{const n=fbm2(u*3,v*3,81,3);A=smooth((0.8-(r+(n-0.5)*0.4))/0.4)*0.6;R=0.6;G=0.66;B=0.76;}
   const i=(y*W+x)*4;d[i]=R*255;d[i+1]=G*255;d[i+2]=B*255;d[i+3]=clamp(A,0,1)*255;}
  return img;});}
};
