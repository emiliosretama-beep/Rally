// ===== FRENTE 44 · utilidades: números, azar, vectores, matrices, bus de eventos =====
const FIX=1/120; // paso fijo de simulación
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{t=t<0?0:t>1?1:t;return t*t*(3-2*t);};
const angNorm=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;};
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
// '#rrggbb' (o '#rgb') -> [r,g,b] en 0..1; si ya es un array lo devuelve tal cual
const hex=h=>{if(typeof h!=='string')return h;if(h.length===4)h='#'+h[1]+h[1]+h[2]+h[2]+h[3]+h[3];const n=parseInt(h.slice(1),16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255];};
const mixC=(a,b,t)=>{a=hex(a);b=hex(b);return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];};

// Vectores de 3 componentes como arrays. El último argumento opcional `o` evita crear arrays nuevos.
const V3={
 add(a,b,o){o=o||[0,0,0];o[0]=a[0]+b[0];o[1]=a[1]+b[1];o[2]=a[2]+b[2];return o;},
 sub(a,b,o){o=o||[0,0,0];o[0]=a[0]-b[0];o[1]=a[1]-b[1];o[2]=a[2]-b[2];return o;},
 scale(a,s,o){o=o||[0,0,0];o[0]=a[0]*s;o[1]=a[1]*s;o[2]=a[2]*s;return o;},
 madd(a,b,s,o){o=o||[0,0,0];o[0]=a[0]+b[0]*s;o[1]=a[1]+b[1]*s;o[2]=a[2]+b[2]*s;return o;}, // a + b*s
 dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
 cross(a,b,o){o=o||[0,0,0];const x=a[1]*b[2]-a[2]*b[1],y=a[2]*b[0]-a[0]*b[2],z=a[0]*b[1]-a[1]*b[0];o[0]=x;o[1]=y;o[2]=z;return o;},
 len:a=>Math.hypot(a[0],a[1],a[2]),
 norm(a,o){o=o||[0,0,0];const l=Math.hypot(a[0],a[1],a[2])||1;o[0]=a[0]/l;o[1]=a[1]/l;o[2]=a[2]/l;return o;},
 dist:(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]),
 dist2:(a,b)=>{const x=a[0]-b[0],y=a[1]-b[1],z=a[2]-b[2];return x*x+y*y+z*z;},
 distXZ:(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]),
 lerp(a,b,t,o){o=o||[0,0,0];o[0]=a[0]+(b[0]-a[0])*t;o[1]=a[1]+(b[1]-a[1])*t;o[2]=a[2]+(b[2]-a[2])*t;return o;},
 copy(a,o){o=o||[0,0,0];o[0]=a[0];o[1]=a[1];o[2]=a[2];return o;},
 set(o,x,y,z){o[0]=x;o[1]=y;o[2]=z;return o;},
 // rumbo -> dirección horizontal (convención del juego: 0 mira a +Z, crece hacia +X)
 dirYaw(yaw,o){o=o||[0,0,0];o[0]=Math.sin(yaw);o[1]=0;o[2]=Math.cos(yaw);return o;},
 // rumbo y cabeceo -> dirección de mirada
 dirYP(yaw,pitch,o){o=o||[0,0,0];const c=Math.cos(pitch);o[0]=Math.sin(yaw)*c;o[1]=Math.sin(pitch);o[2]=Math.cos(yaw)*c;return o;},
 yawOf:d=>Math.atan2(d[0],d[2]) // dirección -> rumbo
};

// Bus de eventos global (ver DESIGN §2)
const Bus={h:{},
 on(n,f){(this.h[n]||(this.h[n]=[])).push(f);return f;},
 off(n,f){const a=this.h[n];if(!a)return;const i=a.indexOf(f);if(i>=0)a.splice(i,1);},
 emit(n,d){const a=this.h[n];if(!a)return;for(const f of a.slice()){try{f(d);}catch(e){console.error(e);}}}
};

// ===== Matrices 4x4 (columnas, como WebGL) =====
// Convención de modelos: miran a +Z con +Y arriba; en coordenadas locales +X queda a su IZQUIERDA (sistema a derechas).
const M4={
 ident(o){o=o||new Float32Array(16);o.fill(0);o[0]=o[5]=o[10]=o[15]=1;return o;},
 copy(a,o){o=o||new Float32Array(16);o.set(a);return o;},
 ortho(l,r,b,t,n,f,o){o.fill(0);o[0]=2/(r-l);o[5]=2/(t-b);o[10]=-2/(f-n);o[12]=-(r+l)/(r-l);o[13]=-(t+b)/(t-b);o[14]=-(f+n)/(f-n);o[15]=1;return o;},
 persp(fovy,asp,n,f,o){const t=1/Math.tan(fovy/2);o.fill(0);o[0]=t/asp;o[5]=t;o[10]=(f+n)/(n-f);o[11]=-1;o[14]=2*f*n/(n-f);return o;},
 lookAt(e,c,u,o){let zx=e[0]-c[0],zy=e[1]-c[1],zz=e[2]-c[2];let l=Math.hypot(zx,zy,zz)||1;zx/=l;zy/=l;zz/=l;
  let xx=u[1]*zz-u[2]*zy,xy=u[2]*zx-u[0]*zz,xz=u[0]*zy-u[1]*zx;l=Math.hypot(xx,xy,xz)||1;xx/=l;xy/=l;xz/=l;
  const yx=zy*xz-zz*xy,yy=zz*xx-zx*xz,yz=zx*xy-zy*xx;
  o[0]=xx;o[1]=yx;o[2]=zx;o[3]=0;o[4]=xy;o[5]=yy;o[6]=zy;o[7]=0;o[8]=xz;o[9]=yz;o[10]=zz;o[11]=0;
  o[12]=-(xx*e[0]+xy*e[1]+xz*e[2]);o[13]=-(yx*e[0]+yy*e[1]+yz*e[2]);o[14]=-(zx*e[0]+zy*e[1]+zz*e[2]);o[15]=1;return o;},
 mul(a,b,o){ // o = a*b (o puede ser a o b)
  const a0=a[0],a1=a[1],a2=a[2],a3=a[3],a4=a[4],a5=a[5],a6=a[6],a7=a[7],a8=a[8],a9=a[9],a10=a[10],a11=a[11],a12=a[12],a13=a[13],a14=a[14],a15=a[15];
  for(let j=0;j<4;j++){const b0=b[j*4],b1=b[j*4+1],b2=b[j*4+2],b3=b[j*4+3];
   o[j*4]=a0*b0+a4*b1+a8*b2+a12*b3;o[j*4+1]=a1*b0+a5*b1+a9*b2+a13*b3;o[j*4+2]=a2*b0+a6*b1+a10*b2+a14*b3;o[j*4+3]=a3*b0+a7*b1+a11*b2+a15*b3;}
  return o;},
 invert(m,o){const a00=m[0],a01=m[1],a02=m[2],a03=m[3],a10=m[4],a11=m[5],a12=m[6],a13=m[7],a20=m[8],a21=m[9],a22=m[10],a23=m[11],a30=m[12],a31=m[13],a32=m[14],a33=m[15];
  const b00=a00*a11-a01*a10,b01=a00*a12-a02*a10,b02=a00*a13-a03*a10,b03=a01*a12-a02*a11,b04=a01*a13-a03*a11,b05=a02*a13-a03*a12,b06=a20*a31-a21*a30,b07=a20*a32-a22*a30,b08=a20*a33-a23*a30,b09=a21*a32-a22*a31,b10=a21*a33-a23*a31,b11=a22*a33-a23*a32;
  let d=b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06;if(!d)return null;d=1/d;
  o[0]=(a11*b11-a12*b10+a13*b09)*d;o[1]=(a02*b10-a01*b11-a03*b09)*d;o[2]=(a31*b05-a32*b04+a33*b03)*d;o[3]=(a22*b04-a21*b05-a23*b03)*d;
  o[4]=(a12*b08-a10*b11-a13*b07)*d;o[5]=(a00*b11-a02*b08+a03*b07)*d;o[6]=(a32*b02-a30*b05-a33*b01)*d;o[7]=(a20*b05-a22*b02+a23*b01)*d;
  o[8]=(a10*b10-a11*b08+a13*b06)*d;o[9]=(a01*b08-a00*b10-a03*b06)*d;o[10]=(a30*b04-a31*b02+a33*b00)*d;o[11]=(a21*b02-a20*b04-a23*b00)*d;
  o[12]=(a11*b07-a10*b09-a12*b06)*d;o[13]=(a00*b09-a01*b07+a02*b06)*d;o[14]=(a31*b01-a30*b03-a32*b00)*d;o[15]=(a20*b03-a21*b01+a22*b00)*d;return o;},
 // matriz desde base (f=eje X local, u=eje Y local, r=eje Z local) y posición
 basis(f,u,r,p,o){o[0]=f[0];o[1]=f[1];o[2]=f[2];o[3]=0;o[4]=u[0];o[5]=u[1];o[6]=u[2];o[7]=0;o[8]=r[0];o[9]=r[1];o[10]=r[2];o[11]=0;o[12]=p[0];o[13]=p[1];o[14]=p[2];o[15]=1;return o;},
 trs(tx,ty,tz,rx,ry,rz,o){ // traslación * rotY(ry) * rotX(rx) * rotZ(rz)
  const cx=Math.cos(rx),sx=Math.sin(rx),cy=Math.cos(ry),sy=Math.sin(ry),cz=Math.cos(rz),sz=Math.sin(rz);
  const m00=cy*cz+sy*sx*sz,m01=cx*sz,m02=-sy*cz+cy*sx*sz;
  const m10=-cy*sz+sy*sx*cz,m11=cx*cz,m12=sy*sz+cy*sx*cz;
  const m20=sy*cx,m21=-sx,m22=cy*cx;
  o[0]=m00;o[1]=m01;o[2]=m02;o[3]=0;o[4]=m10;o[5]=m11;o[6]=m12;o[7]=0;o[8]=m20;o[9]=m21;o[10]=m22;o[11]=0;o[12]=tx;o[13]=ty;o[14]=tz;o[15]=1;return o;},
 // T(pos) * Ry(yaw) * Rx(-pitch) * Rz(roll) * S(scale): +Z local apunta a [sin(yaw)cos(p), sin(p), cos(yaw)cos(p)];
 // pitch>0 levanta el morro; roll>0 inclina hacia la derecha del modelo (la cabeza hacia -X local). scale: número o [sx,sy,sz]
 compose(pos,yaw,pitch,roll,scale,o){o=o||new Float32Array(16);M4.trs(pos?pos[0]:0,pos?pos[1]:0,pos?pos[2]:0,-(pitch||0),yaw||0,roll||0,o);
  if(scale!=null&&scale!==1){const sx=typeof scale==='number'?scale:scale[0],sy=typeof scale==='number'?scale:scale[1],sz=typeof scale==='number'?scale:scale[2];
   o[0]*=sx;o[1]*=sx;o[2]*=sx;o[4]*=sy;o[5]*=sy;o[6]*=sy;o[8]*=sz;o[9]*=sz;o[10]*=sz;}
  return o;},
 fromYawPitch(yaw,pitch,o){return M4.compose(null,yaw,pitch,0,1,o);},
 translate(m,x,y,z){m[12]+=m[0]*x+m[4]*y+m[8]*z;m[13]+=m[1]*x+m[5]*y+m[9]*z;m[14]+=m[2]*x+m[6]*y+m[10]*z;return m;}, // m = m*T(x,y,z)
 xfPoint(m,p,o){o=o||[0,0,0];const x=p[0],y=p[1],z=p[2];o[0]=m[0]*x+m[4]*y+m[8]*z+m[12];o[1]=m[1]*x+m[5]*y+m[9]*z+m[13];o[2]=m[2]*x+m[6]*y+m[10]*z+m[14];return o;},
 xfDir(m,d,o){o=o||[0,0,0];const x=d[0],y=d[1],z=d[2];o[0]=m[0]*x+m[4]*y+m[8]*z;o[1]=m[1]*x+m[5]*y+m[9]*z;o[2]=m[2]*x+m[6]*y+m[10]*z;return o;}
};
