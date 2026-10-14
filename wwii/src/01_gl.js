// ===== FRENTE 44 · motor WebGL2 (portado del rally y ampliado) =====
// Piezas: GL (programas, mallas, instancias, texturas), Env (luz, cielo, niebla), Cam (cámara y frustum), Lit (uniformes comunes),
// Sky, Shadow (sol en dos cascadas), Post (MSAA, resplandor, SSAO, rayos, gradación, efectos de combate), GFX (calidades), DecalBuf.
// El orden de dibujo lo lleva Game.render (DESIGN §3). Este archivo no usa Geo al cargar (02_geo.js va después).

// ---------- Fragmentos de shader ----------
// árboles mecidos por el viento: la copa (y alta en la geometría unitaria) se desplaza más que la base
const SH_SWAY=`uniform float uSway;uniform float uTime;
vec2 sway(float h,vec3 ip){float ph=ip.x*0.21+ip.z*0.17;h=max(h,0.0);return vec2(sin(uTime*1.6+ph),cos(uTime*1.13+ph*1.3)*0.7)*h*h*uSway;}`;
// instancias: uInst=1 -> posición, rumbo y escala (atributos 4-6); uInst=2 -> matriz 4x4 (7-10) y color (6)
const SH_INST=`layout(location=4) in vec3 iPos;layout(location=5) in vec4 iRS;layout(location=6) in vec3 iCol;
layout(location=7) in vec4 iM0;layout(location=8) in vec4 iM1;layout(location=9) in vec4 iM2;layout(location=10) in vec4 iM3;uniform float uInst;`;
// niebla por distancia (+ neblina baja opcional) que se aclara hacia el sol
const SH_FOG=`uniform vec3 uFog;uniform vec2 uFogR;uniform vec3 uEye;uniform float uFogConst;uniform vec3 uFogSun;uniform vec3 uSunDir;uniform vec3 uMist;
float fogF(vec3 w){if(uFogConst>=0.0)return uFogConst;float d=distance(w,uEye);float f=smoothstep(uFogR.x,uFogR.y,d);
 if(uMist.z>0.0)f=max(f,uMist.z*(1.0-smoothstep(0.0,uMist.y,w.y-uMist.x))*smoothstep(1.5,uFogR.y*0.5,d));return f;}
vec3 fogC(vec3 w){return uFog+uFogSun*pow(max(dot(normalize(w-uEye),uSunDir),0.0),6.0);}`;
const SH_PL=`uniform vec4 uPL[4];uniform vec3 uPLC[4];uniform int uNPL;`;

const SH={
LIT_VS:`#version 300 es
layout(location=0) in vec3 aPos;layout(location=1) in vec3 aNor;layout(location=2) in vec3 aCol;layout(location=3) in vec2 aUV;
${SH_INST}
uniform mat4 uVP;uniform mat4 uModel;
out vec3 vN;out vec3 vC;out vec3 vW;out vec2 vUV;
${SH_SWAY}
void main(){vec3 p=aPos;vec3 n=aNor;
 if(uInst>1.5){mat4 M=mat4(iM0,iM1,iM2,iM3);p=(M*vec4(p,1.0)).xyz;mat3 R=mat3(M);n=mat3(cross(R[1],R[2]),cross(R[2],R[0]),cross(R[0],R[1]))*n;}
 else if(uInst>0.5){float c=cos(iRS.x),s=sin(iRS.x);p*=iRS.yzw;p=vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z)+iPos;n/=iRS.yzw;n=vec3(c*n.x+s*n.z,n.y,-s*n.x+c*n.z);
  if(uSway>0.0)p.xz+=sway(aPos.y,iPos);}
 vec4 w=uModel*vec4(p,1.0);vW=w.xyz;vN=mat3(uModel)*n;vC=aCol*iCol;vUV=aUV;gl_Position=uVP*w;}`,
LIT_FS:`#version 300 es
precision highp float;in vec3 vN;in vec3 vC;in vec3 vW;in vec2 vUV;
uniform vec3 uSun;uniform vec3 uSunCol;uniform vec3 uSky;uniform vec3 uGnd;uniform sampler2D uTex;uniform float uUseTex;uniform float uAlpha;uniform vec4 uTint;
uniform float uWet;uniform float uFlash;uniform float uGloss;uniform float uSunVis;uniform float uMask;
uniform vec3 uSpP;uniform vec3 uSpD;uniform float uSpI;
uniform highp sampler2DShadow uShadow;uniform float uShK;uniform vec2 uShTex;uniform float uShTaps;uniform vec2 uShW;uniform mat4 uLVP0;uniform mat4 uLVP1;
${SH_PL}
${SH_FOG}
out vec4 o;
// sombra del sol en dos cascadas (atlas 2x1). PCF propio con pesos bilineales muestreando en el centro de los texeles:
// borde suave y sin dientes en cualquier GPU, también en las que no filtran la textura de profundidad
float shCasc(vec3 p,float off,float bias){vec2 uv=vec2(p.x*0.5+off,p.y);float z=p.z-bias,s=0.0;
 if(uShTaps>1.5){vec2 c=uv/uShTex-1.5,f=fract(c),b=(floor(c)+0.5)*uShTex;vec4 wx=vec4(1.0-f.x,1.0,1.0,f.x),wy=vec4(1.0-f.y,1.0,1.0,f.y);
  for(int j=0;j<4;j++)for(int i=0;i<4;i++)s+=wx[i]*wy[j]*textureLod(uShadow,vec3(b+vec2(float(i),float(j))*uShTex,z),0.0);return s/9.0;}
 vec2 c=uv/uShTex-1.0,f=fract(c),b=(floor(c)+0.5)*uShTex;vec3 wx=vec3(1.0-f.x,1.0,f.x),wy=vec3(1.0-f.y,1.0,f.y);
 for(int j=0;j<3;j++)for(int i=0;i<3;i++)s+=wx[i]*wy[j]*textureLod(uShadow,vec3(b+vec2(float(i),float(j))*uShTex,z),0.0);return s*0.25;}
// el punto se separa de la superficie según el tamaño del texel (sin rayas sobre el propio objeto);
// la cascada lejana sólo se calcula donde la cercana no llega del todo
float shadowF(vec3 n){if(uShK<=0.0)return 1.0;
 vec4 b=uLVP0*vec4(vW+n*uShW.x,1.0);vec3 p0=b.xyz/b.w*0.5+0.5;vec2 e0=min(p0.xy,1.0-p0.xy);float w0=p0.z<1.0?smoothstep(0.0,0.14,min(e0.x,e0.y)):0.0,s=1.0;
 if(w0>0.0)s=shCasc(p0,0.0,0.00025);
 if(w0<1.0){vec4 a=uLVP1*vec4(vW+n*uShW.y,1.0);vec3 p1=a.xyz/a.w*0.5+0.5;vec2 e1=min(p1.xy,1.0-p1.xy);float w1=p1.z<1.0?smoothstep(0.0,0.06,min(e1.x,e1.y)):0.0;
  s=mix(w1>0.0?mix(1.0,shCasc(p1,0.5,0.0004),w1):1.0,s,w0);}
 return mix(1.0,s,uShK);}
void main(){vec3 n=normalize(vN);vec3 V=normalize(uEye-vW);if(dot(n,V)<0.0)n=-n; // caras finas vistas por detrás
 float d=max(dot(n,uSun),0.0);float sh=(d>0.0?shadowF(n):1.0)*uSunVis;
 vec3 amb=mix(uGnd,uSky,n.y*0.5+0.5)+vec3(0.75,0.8,1.0)*uFlash;
 vec3 b=mix(vC,uTint.rgb,uTint.a);if(uUseTex>0.5)b*=texture(uTex,vUV).rgb;
 float em=step(1.05,max(vC.r,max(vC.g,vC.b))); // color de vértice > 1: emisivo (sin luz ni sombra)
 float flat_=smoothstep(0.5,0.92,n.y),sk=max(uGloss,uWet*flat_);
 b*=mix(1.0,0.6,uWet*flat_);
 vec3 lt=amb+uSunCol*d*sh,sp=vec3(0.0),glow=vec3(0.0);
 // luces puntuales (fogonazos, explosiones, fuegos): caída suave hasta su radio; también iluminan la niebla cercana
 for(int i=0;i<4;i++){if(i>=uNPL)break;vec3 Lv=uPL[i].xyz-vW;float dd=dot(Lv,Lv),r2=uPL[i].w*uPL[i].w;if(dd>=r2)continue;
  float a=1.0-dd/r2;a*=a;vec3 L=Lv*inversesqrt(max(dd,1e-4));lt+=uPLC[i]*a*(0.2+0.8*max(dot(n,L),0.0));glow+=uPLC[i]*a;
  if(sk>0.0)sp+=uPLC[i]*a*pow(max(dot(n,normalize(L+V)),0.0),40.0)*sk;}
 // foco (linterna, reflector)
 if(uSpI>0.0){vec3 Lv=uSpP-vW;float dist=length(Lv);vec3 L=Lv/max(dist,0.001);float cd=dot(-L,uSpD);
  float hl=(smoothstep(0.86,0.97,cd)+smoothstep(0.6,0.86,cd)*0.15)*uSpI/(1.0+dist*dist/400.0);
  lt+=vec3(1.0,0.95,0.84)*hl*(0.3+0.7*max(dot(n,L),0.0));if(sk>0.0)sp+=vec3(1.0,0.95,0.85)*pow(max(dot(n,normalize(L+V)),0.0),50.0)*hl*1.5*sk;}
 if(uWet>0.0){vec3 R=reflect(-uSun,n);sp+=(uSunCol*pow(max(dot(R,V),0.0),20.0)*0.6*sh+uSky*0.35*pow(1.0-max(dot(n,V),0.0),3.0))*uWet*flat_;}
 // metal (armas, cascos, carros): destello del sol y reflejo del cielo en los bordes
 if(uGloss>0.0){vec3 Hs=normalize(uSun+V);sp+=uSunCol*pow(max(dot(n,Hs),0.0),48.0)*0.9*sh*uGloss;
  float fr=pow(1.0-max(dot(n,V),0.0),4.0);vec3 env=mix(uGnd*1.1,uSky*1.6+vec3(0.04),smoothstep(-0.2,0.4,reflect(-V,n).y));sp+=env*(0.05+0.4*fr)*uGloss;}
 vec3 c=mix(b*lt+sp,vC,em);float f=fogF(vW);c=mix(c,fogC(vW),f)+glow*f*0.3;
 o=vec4(c,uMask>0.5?0.0:uAlpha);}`,
// pasada de sombras: sólo profundidad desde el sol
DEPTH_VS:`#version 300 es
layout(location=0) in vec3 aPos;
${SH_INST}
uniform mat4 uLVP;uniform mat4 uModel;
${SH_SWAY}
void main(){vec3 p=aPos;if(uInst>1.5)p=(mat4(iM0,iM1,iM2,iM3)*vec4(p,1.0)).xyz;
 else if(uInst>0.5){float c=cos(iRS.x),s=sin(iRS.x);p*=iRS.yzw;p=vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z)+iPos;if(uSway>0.0)p.xz+=sway(aPos.y,iPos);}
 gl_Position=uLVP*(uModel*vec4(p,1.0));}`,
DEPTH_FS:`#version 300 es
precision mediump float;void main(){}`,
// cielo: degradado, sol, nubes que se mueven, estrellas y luna
SKY_VS:`#version 300 es
layout(location=0) in vec3 aPos;out vec2 vP;void main(){vP=aPos.xy;gl_Position=vec4(aPos.xy,0.9999,1.0);}`,
SKY_FS:`#version 300 es
precision highp float;in vec2 vP;uniform mat4 uInv;uniform vec3 uZen;uniform vec3 uHor;uniform vec3 uSun;uniform float uStars;uniform float uFlash;uniform float uSunK;
uniform float uCloud;uniform float uTime;uniform vec3 uCloudCol;uniform vec3 uCloudDark;uniform vec3 uFogSun;uniform vec3 uFog;uniform vec3 uMoonDir;uniform float uMoon;uniform float uWind;out vec4 o;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h21(i),h21(i+vec2(1.0,0.0)),f.x),mix(h21(i+vec2(0.0,1.0)),h21(i+vec2(1.0,1.0)),f.x),f.y);}
float fbm(vec2 p){float a=0.5,s=0.0;for(int i=0;i<5;i++){s+=a*vn(p);p=p*2.03+vec2(1.7,9.2);a*=0.5;}return s;}
void main(){vec4 a=uInv*vec4(vP,-1.0,1.0);vec4 b=uInv*vec4(vP,1.0,1.0);vec3 d=normalize(b.xyz/b.w-a.xyz/a.w);
 float t=smoothstep(-0.02,0.5,d.y);vec3 c=mix(uHor,uZen,t);float s=max(dot(d,uSun),0.0);
 c+=(vec3(1.0,0.9,0.7)*pow(s,60.0)*0.6+vec3(1.0,0.85,0.6)*pow(s,6.0)*0.12)*uSunK+uFogSun*pow(s,6.0)*(1.0-t);
 c+=vec3(1.0,0.95,0.85)*smoothstep(0.9994,0.99965,s)*uSunK*1.2; // disco del sol
 float cov=0.0;
 if(uCloud>0.0&&d.y>0.0){vec2 uv=d.xz/(d.y+0.12)*1.3+vec2(uTime*0.012,uTime*0.004)*uWind;float nz=fbm(uv);
  cov=smoothstep(1.0-uCloud-0.05,1.0-uCloud+0.32,nz)*smoothstep(0.0,0.22,d.y)*0.94;
  float lit=0.55+0.45*fbm(uv*1.7+vec2(3.1,1.3));vec3 cc=mix(uCloudDark,uCloudCol,lit)+vec3(1.0,0.9,0.75)*pow(s,8.0)*0.4*uSunK+vec3(0.6,0.65,0.8)*uFlash;
  if(uMoon>0.0)cc+=vec3(0.25,0.28,0.36)*pow(max(dot(d,uMoonDir),0.0),12.0)*uMoon;
  c=mix(c,cc,cov);}
 if(uStars>0.0&&cov<0.9){vec3 q=d*380.0;vec3 cell=floor(q);float h=fract(sin(dot(cell,vec3(12.9898,78.233,37.719)))*43758.5453);
  float st=step(0.9972,h)*smoothstep(0.02,0.2,d.y)*(0.5+0.5*fract(h*917.0));c+=vec3(0.9,0.93,1.0)*st*uStars*(1.0-cov);}
 if(uMoon>0.0){float mc=dot(d,uMoonDir);vec3 t1=normalize(cross(uMoonDir,vec3(0.0,1.0,0.0))+vec3(1e-4)),t2=cross(t1,uMoonDir);
  vec2 mu=vec2(dot(d,t1),dot(d,t2))/0.026;float disk=smoothstep(0.99962,0.99972,mc);
  float cr=0.8+0.2*vn(mu*5.0+3.0)-0.12*vn(mu*11.0+9.0);
  c=mix(c,vec3(0.96,0.94,0.86)*cr*uMoon*1.3,disk*(1.0-cov*0.9));
  c+=vec3(0.32,0.38,0.52)*(pow(max(mc,0.0),300.0)*0.5+pow(max(mc,0.0),30.0)*0.12)*uMoon*(1.0-cov*0.6);}
 c=mix(c,uFog,smoothstep(0.0,-0.12,d.y)); // bajo el horizonte, el color de la niebla
 c+=vec3(0.55,0.6,0.75)*uFlash*(0.4+0.6*t);o=vec4(c,1.0);}`,
// partículas: rectángulos de cara a la cámara con atlas 2x2 (0 humo, 1 fuego, 2 chispa, 3 tierra); fundido suave con la profundidad
PT_VS:`#version 300 es
layout(location=0) in vec3 aPos;layout(location=4) in vec3 iPos;layout(location=5) in vec4 iRS;layout(location=6) in vec3 iCol;
uniform mat4 uVP;uniform vec3 uRight;uniform vec3 uUp;uniform vec3 uPtLit;${SH_PL}
out vec2 vUV;out float vA;out vec3 vC;out vec3 vW;out float vZ;
void main(){float c=cos(iRS.z),s=sin(iRS.z);vec2 q=vec2(c*aPos.x-s*aPos.y,s*aPos.x+c*aPos.y);
 vec3 p=iPos+(uRight*q.x+uUp*q.y)*iRS.x;float cell=floor(iRS.w+0.5);
 vUV=(vec2(mod(cell,2.0),floor(cell*0.5))+vec2(aPos.x,-aPos.y)*0.47+0.5)*0.5;vA=iRS.y;
 vec3 L=uPtLit;for(int i=0;i<4;i++){if(i>=uNPL)break;vec3 Lv=uPL[i].xyz-iPos;float a=max(0.0,1.0-dot(Lv,Lv)/(uPL[i].w*uPL[i].w));L+=uPLC[i]*a*a*0.45;}
 vC=(cell==1.0||cell==2.0)?iCol:iCol*L;vW=p;vec4 cp=uVP*vec4(p,1.0);vZ=cp.w;gl_Position=cp;}`,
PT_FS:`#version 300 es
precision highp float;in vec2 vUV;in float vA;in vec3 vC;in vec3 vW;in float vZ;
uniform sampler2D uTex;uniform sampler2D uDepth;uniform float uSoft;uniform vec2 uNF;uniform vec2 uRes;uniform float uAdd;${SH_FOG}out vec4 o;
void main(){vec4 t=texture(uTex,vUV);float a=t.a*vA*smoothstep(0.15,0.9,vZ);
 if(uSoft>0.0){float d=texture(uDepth,gl_FragCoord.xy/uRes).r*2.0-1.0;float zs=2.0*uNF.x*uNF.y/(uNF.y+uNF.x-d*(uNF.y-uNF.x));a*=clamp((zs-vZ)/uSoft,0.0,1.0);}
 if(a<0.003)discard;vec3 c=t.rgb*vC;float f=fogF(vW);c=uAdd>0.5?c*(1.0-f):mix(c,fogC(vW),f*0.85);o=vec4(c,a);}`,
// manchas planas instanciadas (sombras de contacto bajo soldados y objetos en calidad Baja)
BLOB_VS:`#version 300 es
layout(location=0) in vec3 aPos;layout(location=4) in vec3 iPos;layout(location=5) in vec4 iRS;
uniform mat4 uVP;out vec2 vUV;out float vA;out vec3 vW;
void main(){float c=cos(iRS.x),s=sin(iRS.x);vec3 p=vec3(aPos.x*iRS.y,0.0,aPos.z*iRS.z);p=vec3(c*p.x+s*p.z,0.0,-s*p.x+c*p.z)+iPos;
 vUV=aPos.xz;vA=iRS.w;vW=p;gl_Position=uVP*vec4(p,1.0);}`,
BLOB_FS:`#version 300 es
precision highp float;in vec2 vUV;in float vA;in vec3 vW;${SH_FOG}out vec4 o;
void main(){float r=length(vUV);float a=vA*(1.0-smoothstep(0.35,1.0,r))*(1.0-fogF(vW));o=vec4(0.03,0.035,0.03,a);}`,
// marcas en el suelo y paredes (DecalBuf): agujeros de bala, quemaduras, sangre, cráteres y manchas de sombra que siguen el relieve.
// aNor = (alfa, mancha de sombra 0/1, -), aUV = coordenadas del atlas
DEC_VS:`#version 300 es
layout(location=0) in vec3 aPos;layout(location=1) in vec3 aNor;layout(location=2) in vec3 aCol;layout(location=3) in vec2 aUV;
uniform mat4 uVP;out vec2 vUV;out vec3 vC;out vec3 vW;out vec2 vAB;
void main(){vUV=aUV;vC=aCol;vAB=aNor.xy;vW=aPos;gl_Position=uVP*vec4(aPos,1.0);}`,
DEC_FS:`#version 300 es
precision highp float;in vec2 vUV;in vec3 vC;in vec3 vW;in vec2 vAB;uniform sampler2D uTex;uniform vec3 uDecLit;uniform float uCov;uniform mat4 uLVP1;${SH_FOG}out vec4 o;
void main(){vec4 t=texture(uTex,vUV);float a=t.a*vAB.x*(1.0-fogF(vW));
 if(vAB.y>0.5&&uCov>0.5){vec4 q=uLVP1*vec4(vW,1.0);vec3 p=q.xyz/q.w*0.5+0.5;vec2 e=min(p.xy,1.0-p.xy);a*=1.0-smoothstep(0.0,0.06,min(e.x,e.y));} // con mapa de sombras manda la sombra real
 if(a<0.004)discard;o=vec4(t.rgb*vC*mix(uDecLit,vec3(1.0),vAB.y),a);}`,
// posprocesado
PP_VS:`#version 300 es
layout(location=0) in vec3 aPos;out vec2 vUV;void main(){vUV=aPos.xy*0.5+0.5;gl_Position=vec4(aPos.xy,0.0,1.0);}`,
PP_BRIGHT:`#version 300 es
precision mediump float;in vec2 vUV;uniform sampler2D uTex;uniform vec2 uPx;uniform float uThr;out vec4 o;
void main(){vec3 c=(texture(uTex,vUV-uPx).rgb+texture(uTex,vUV+vec2(uPx.x,-uPx.y)).rgb+texture(uTex,vUV+vec2(-uPx.x,uPx.y)).rgb+texture(uTex,vUV+uPx).rgb)*0.25;
 float l=max(c.r,max(c.g,c.b));o=vec4(c*smoothstep(uThr,uThr+0.35,l),1.0);}`,
PP_DOWN:`#version 300 es
precision mediump float;in vec2 vUV;uniform sampler2D uTex;uniform vec2 uPx;out vec4 o;
void main(){o=vec4((texture(uTex,vUV).rgb*4.0+texture(uTex,vUV-uPx).rgb+texture(uTex,vUV+vec2(uPx.x,-uPx.y)).rgb+texture(uTex,vUV+vec2(-uPx.x,uPx.y)).rgb+texture(uTex,vUV+uPx).rgb)/8.0,1.0);}`,
PP_UP:`#version 300 es
precision mediump float;in vec2 vUV;uniform sampler2D uTex;uniform vec2 uPx;out vec4 o;
void main(){vec3 c=texture(uTex,vUV+vec2(-uPx.x*2.0,0.0)).rgb+texture(uTex,vUV+vec2(uPx.x*2.0,0.0)).rgb+texture(uTex,vUV+vec2(0.0,-uPx.y*2.0)).rgb+texture(uTex,vUV+vec2(0.0,uPx.y*2.0)).rgb;
 c+=(texture(uTex,vUV-uPx).rgb+texture(uTex,vUV+vec2(uPx.x,-uPx.y)).rgb+texture(uTex,vUV+vec2(-uPx.x,uPx.y)).rgb+texture(uTex,vUV+uPx).rgb)*2.0;o=vec4(c/12.0,1.0);}`,
// oclusión ambiental en pantalla (SSAO) a media resolución
PP_AO:`#version 300 es
precision highp float;in vec2 vUV;uniform sampler2D uDepth;uniform mat4 uInvP;uniform mat4 uP;uniform vec2 uPx;uniform float uRad;uniform vec3 uK[16];uniform int uN;out vec4 o;
vec3 vpos(vec2 uv){float d=texture(uDepth,uv).r;vec4 p=uInvP*vec4(uv*2.0-1.0,d*2.0-1.0,1.0);return p.xyz/p.w;}
void main(){float d=texture(uDepth,vUV).r;if(d>=0.99999){o=vec4(1.0);return;}
 vec3 P=vpos(vUV),dx=vpos(vUV+vec2(uPx.x,0.0))-P,dy=vpos(vUV+vec2(0.0,uPx.y))-P,dx2=P-vpos(vUV-vec2(uPx.x,0.0)),dy2=P-vpos(vUV-vec2(0.0,uPx.y));
 if(abs(dx2.z)<abs(dx.z))dx=dx2;if(abs(dy2.z)<abs(dy.z))dy=dy2;
 vec3 N=normalize(cross(dx,dy));if(dot(N,P)>0.0)N=-N;
 float a=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)*6.2831;vec3 r=vec3(cos(a),sin(a),0.0),T=normalize(r-N*dot(r,N)),B=cross(N,T);
 float rad=uRad,occ=0.0,bias=0.08*rad+0.004*(-P.z);
 for(int i=0;i<16;i++){if(i>=uN)break;vec3 k=uK[i];vec3 S=P+(T*k.x+B*k.y+N*k.z)*rad;vec4 q=uP*vec4(S,1.0);vec2 su=q.xy/q.w*0.5+0.5;
  if(su.x<0.0||su.x>1.0||su.y<0.0||su.y>1.0)continue;float sz=vpos(su).z;occ+=(sz>=S.z+bias?1.0:0.0)*smoothstep(0.0,1.0,rad/abs(P.z-sz));}
 float fade=smoothstep(0.6,1.5,-P.z)*(1.0-smoothstep(22.0,38.0,-P.z));
 o=vec4(vec3(1.0-occ/float(uN)*fade),1.0);}`,
PP_AOBLUR:`#version 300 es
precision highp float;in vec2 vUV;uniform sampler2D uTex;uniform sampler2D uDepth;uniform vec2 uPx;uniform mat4 uInvP;out vec4 o;
float lz(vec2 uv){vec4 p=uInvP*vec4(0.0,0.0,texture(uDepth,uv).r*2.0-1.0,1.0);return p.z/p.w;}
void main(){float z0=lz(vUV),s=0.0,w=0.0;for(int x=-2;x<2;x++)for(int y=-2;y<2;y++){vec2 uv=vUV+(vec2(float(x),float(y))+0.5)*uPx;float wz=1.0/(0.04+abs(lz(uv)-z0));s+=texture(uTex,uv).r*wz;w+=wz;}o=vec4(vec3(s/w),1.0);}`,
// rayos de sol: máscara del cielo alrededor del sol y desenfoque radial (a un cuarto de resolución)
PP_GODMASK:`#version 300 es
precision mediump float;in vec2 vUV;uniform sampler2D uDepth;uniform vec2 uSun;uniform float uAsp;out vec4 o;
void main(){float sky=step(0.99999,texture(uDepth,vUV).r);vec2 dv=(vUV-uSun)*vec2(uAsp,1.0);o=vec4(vec3(sky*pow(max(0.0,1.0-length(dv)/0.9),2.0)),1.0);}`,
PP_GODBLUR:`#version 300 es
precision mediump float;in vec2 vUV;uniform sampler2D uTex;uniform vec2 uSun;out vec4 o;
void main(){vec2 dl=(vUV-uSun)*(0.94/40.0),uv=vUV;float il=1.0,s=0.0;for(int i=0;i<40;i++){uv-=dl;s+=texture(uTex,uv).r*il;il*=0.962;}o=vec4(vec3(s/40.0*2.4),1.0);}`,
// composición final: SSAO, resplandor, rayos, gradación de época, viñeta y efectos de combate (herido, aturdido, apuntar, visor).
// El alfa de la escena es una máscara: 0 en el arma en primera persona (no recibe SSAO ni rayos)
PP_FINAL:`#version 300 es
precision highp float;in vec2 vUV;uniform sampler2D uScene;uniform sampler2D uBloom;uniform sampler2D uAO;uniform sampler2D uGod;
uniform float uBloomK;uniform float uVig;uniform float uSat;uniform float uCon;uniform vec3 uTint;uniform float uSepia;
uniform float uAOK;uniform float uGodK;uniform vec3 uGodCol;uniform vec2 uPx;uniform float uAsp;uniform float uTime;
uniform float uHurt;uniform float uBlast;uniform float uAds;uniform float uScope;out vec4 o;
float h12(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
vec3 knee(vec3 x){return mix(x,0.9+0.3*(1.0-exp(-(x-0.9)/0.3)),step(0.9,x));}
void main(){vec2 q=vUV-0.5;vec4 s=texture(uScene,vUV);vec3 c=s.rgb;float m=s.a;
 if(uBlast>0.01){vec2 d=uPx*(1.0+uBlast*6.0);c=(c*2.0+texture(uScene,vUV+vec2(d.x,0.0)).rgb+texture(uScene,vUV-vec2(d.x,0.0)).rgb+texture(uScene,vUV+vec2(0.0,d.y)).rgb+texture(uScene,vUV-vec2(0.0,d.y)).rgb)/6.0;}
 if(uAOK>0.0)c*=mix(1.0,texture(uAO,vUV).r,uAOK*m);
 if(uBloomK>0.0)c+=texture(uBloom,vUV).rgb*uBloomK;
 if(uGodK>0.0)c+=uGodCol*texture(uGod,vUV).r*uGodK*m;
 c=knee(c)*uTint;float l=dot(c,vec3(0.299,0.587,0.114));
 c=mix(vec3(l),c,uSat*(1.0-uHurt*0.6));c=mix(c,l*vec3(1.08,0.97,0.8),uSepia);c=(c-0.5)*uCon+0.5;
 vec2 qa=vec2(q.x*uAsp,q.y);float r=length(qa);
 if(uHurt>0.0){float an=atan(qa.y,qa.x),e=r*1.2+0.05*sin(an*5.0+1.3)+0.035*sin(an*11.0+uTime*0.8)-0.025*sin(an*17.0-uTime*0.5);
  float k=smoothstep(0.5-uHurt*0.25,0.95,e)*uHurt;c=mix(c,vec3(0.3,0.015,0.01)+c*vec3(0.3,0.02,0.02),clamp(k*1.4,0.0,0.94));}
 c*=1.0-(uVig+uAds*0.5)*dot(q,q)*1.8;
 if(uBlast>0.01)c=mix(c,vec3(1.0,0.97,0.9),uBlast*uBlast*0.5);
 if(uScope>0.0){float rs=r/0.47;c*=mix(1.0,(1.0-smoothstep(0.96,1.0,rs))*(1.0-0.4*smoothstep(0.55,0.99,rs)),uScope);}
 c+=(h12(gl_FragCoord.xy)-0.5)/255.0;o=vec4(clamp(c,0.0,1.0),1.0);}`
};

// ---------- GL: programas, mallas, instancias, texturas ----------
const MI=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]); // identidad (no tocar)
const GL={gl:null,cv:null,progs:{},W:1,H:1,time:0,frameNo:0,lost:false,aniso:null,
 init(canvas){
  // sin antialiasing en el lienzo: la escena se pinta en un framebuffer propio con MSAA (ver Post)
  const gl=canvas.getContext('webgl2',{antialias:false,alpha:false,depth:true,powerPreference:'high-performance',preserveDrawingBuffer:false});
  if(!gl)return false;this.gl=gl;this.cv=canvas;
  if(!this._setup())return false;
  if(!this._ev){this._ev=true;
   addEventListener('resize',()=>this.resize());
   canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;Bus.emit('glLost',{});});
   canvas.addEventListener('webglcontextrestored',()=>{this.lost=false;if(this._setup())Bus.emit('glRestored',{});});}
  return true;},
 // (re)crea todo lo que vive en la GPU y es del motor; tras perder el contexto, cada módulo rehace sus mallas al oír 'glRestored'
 _setup(){const gl=this.gl;this.progs={};this._ptTex=this._decTex=null;
  this.aniso=gl.getExtension('EXT_texture_filter_anisotropic');
  const P=this.progs,mk=(n,v,f)=>{P[n]=this.prog(SH[v],SH[f]);};
  mk('lit','LIT_VS','LIT_FS');mk('depth','DEPTH_VS','DEPTH_FS');mk('sky','SKY_VS','SKY_FS');mk('pt','PT_VS','PT_FS');mk('blob','BLOB_VS','BLOB_FS');mk('dec','DEC_VS','DEC_FS');
  mk('ppBright','PP_VS','PP_BRIGHT');mk('ppDown','PP_VS','PP_DOWN');mk('ppUp','PP_VS','PP_UP');mk('ppFinal','PP_VS','PP_FINAL');
  mk('ppAO','PP_VS','PP_AO');mk('ppAOBlur','PP_VS','PP_AOBLUR');mk('ppGodMask','PP_VS','PP_GODMASK');mk('ppGodBlur','PP_VS','PP_GODBLUR');
  for(const k in P)if(!P[k])return false;
  this.quadXZ=this.mesh({p:[-1,0,-1,1,0,-1,1,0,1,-1,0,-1,1,0,1,-1,0,1]},{inst:true});
  this.quadXY=this.mesh({p:[-1,-1,0,1,-1,0,1,1,0,-1,-1,0,1,1,0,-1,1,0]},{inst:true});
  this.tri=this.mesh({p:[-1,-1,0,3,-1,0,-1,3,0]});
  Shadow.tex=Shadow.fbo=Shadow.dummy=null;Shadow.size=0;Post.ms=null;Post.w=Post.h=0;Post.init();GFX.apply(false);
  return true;},
 prog(vs,fs){const gl=this.gl;const mk=(t,s)=>{const sh=gl.createShader(t);gl.shaderSource(sh,s);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)&&!gl.isContextLost()){console.error(gl.getShaderInfoLog(sh));return null;}return sh;};
  const v=mk(gl.VERTEX_SHADER,vs),f=mk(gl.FRAGMENT_SHADER,fs);if(!v||!f)return null;const p=gl.createProgram();gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS)){if(!gl.isContextLost())console.error(gl.getProgramInfoLog(p));return null;}
  const u={};const n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);for(let i=0;i<n;i++){const info=gl.getActiveUniform(p,i);u[info.name]=gl.getUniformLocation(p,info.name);}
  return {p,u};},
 buf(loc,data,size,dyn){const gl=this.gl;const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,dyn?gl.DYNAMIC_DRAW:gl.STATIC_DRAW);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,0,0);return b;},
 // atributos por instancia: modo 1 (10 floats: pos3, rumbo, escala3, color3) o modo matriz (19 floats: mat4 + color3)
 _instAttr(m,mat){const gl=this.gl;m.ib=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,m.ib);
  if(mat){for(let k=0;k<4;k++){gl.enableVertexAttribArray(7+k);gl.vertexAttribPointer(7+k,4,gl.FLOAT,false,76,k*16);gl.vertexAttribDivisor(7+k,1);}
   gl.enableVertexAttribArray(6);gl.vertexAttribPointer(6,3,gl.FLOAT,false,76,64);gl.vertexAttribDivisor(6,1);m.mat=true;}
  else for(const [loc,sz,off] of [[4,3,0],[5,4,3],[6,3,7]]){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,sz,gl.FLOAT,false,40,off*4);gl.vertexAttribDivisor(loc,1);}},
 f32:a=>a instanceof Float32Array?a:new Float32Array(a),
 // d: {p,n,c,u,idx}; opts: {inst:true (modo 1) | mat:true (modo matriz), dyn}
 mesh(d,opts){opts=opts||{};const gl=this.gl,f=this.f32;const vao=gl.createVertexArray();gl.bindVertexArray(vao);
  const m={vao,count:d.idx?d.idx.length:d.p.length/3,indexed:!!d.idx,ninst:0};
  m.pb=this.buf(0,f(d.p),3,opts.dyn);
  if(d.n)m.nb=this.buf(1,f(d.n),3,opts.dyn);if(d.c)m.cb=this.buf(2,f(d.c),3,opts.dyn);if(d.u)m.ub=this.buf(3,f(d.u),2,opts.dyn);
  if(d.idx){const ib=m.eb=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,d.idx instanceof Uint32Array?d.idx:new Uint32Array(d.idx),gl.STATIC_DRAW);}
  if(opts.inst||opts.mat)this._instAttr(m,!!opts.mat);
  gl.bindVertexArray(null);return m;},
 fromGeo(g,opts){return this.mesh({p:g.p,n:g.n,c:g.c,u:g.u},opts);},
 setInst(m,data,n){const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,m.ib);gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);m.ninst=n;},
 instOf(g){return this.fromGeo(g,{inst:true});},
 // otra malla instanciada que comparte la geometría de b (con su propio buffer de instancias)
 instFrom(b,mat){const gl=this.gl,vao=gl.createVertexArray();gl.bindVertexArray(vao);
  for(const [buf,loc,sz] of [[b.pb,0,3],[b.nb,1,3],[b.cb,2,3],[b.ub,3,2]])if(buf){gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,sz,gl.FLOAT,false,0,0);}
  if(b.eb)gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,b.eb);
  const m={vao,count:b.count,indexed:b.indexed,ninst:0,shared:true};this._instAttr(m,!!mat);gl.bindVertexArray(null);return m;},
 // instancias con matriz (uInst=2): acepta un Geo, datos {p,n,c,u} o una malla ya creada (comparte sus buffers)
 matInst(g){return g&&g.vao?this.instFrom(g,true):this.mesh(g.p?{p:g.p,n:g.n,c:g.c,u:g.u,idx:g.idx}:g,{mat:true});},
 setMatInst(m,data,n){this.setInst(m,data,n);},
 tex(canvas,repeat,nomip){const gl=this.gl;const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,canvas);
  if(!nomip)gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,nomip?gl.LINEAR:gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  const w=repeat?gl.REPEAT:gl.CLAMP_TO_EDGE;gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,w);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,w);
  if(this.aniso&&!nomip)gl.texParameterf(gl.TEXTURE_2D,this.aniso.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,gl.getParameter(this.aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));return t;},
 free(m){if(!m||!this.gl)return;const gl=this.gl;if(!m.shared)for(const b of [m.pb,m.nb,m.cb,m.ub,m.eb])if(b)gl.deleteBuffer(b);if(m.ib)gl.deleteBuffer(m.ib);gl.deleteVertexArray(m.vao);m.vao=null;},
 // dibuja una malla (count opcional: número de vértices/índices); las instanciadas sin instancias no dibujan nada
 draw(m,count){if(!m||!m.vao||(m.ib&&!m.ninst))return;const gl=this.gl,c=count==null?m.count:count;gl.bindVertexArray(m.vao);
  if(m.ninst){if(m.indexed)gl.drawElementsInstanced(gl.TRIANGLES,c,gl.UNSIGNED_INT,0,m.ninst);else gl.drawArraysInstanced(gl.TRIANGLES,0,c,m.ninst);}
  else if(m.indexed)gl.drawElements(gl.TRIANGLES,c,gl.UNSIGNED_INT,0);else gl.drawArrays(gl.TRIANGLES,0,c);},
 // mezcla que conserva el alfa del destino (la máscara del arma para Post): null | 'alpha' | 'add' | 'mul'
 blend(m){const gl=this.gl;if(!m){gl.disable(gl.BLEND);return;}gl.enable(gl.BLEND);
  if(m==='add')gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE,gl.ZERO,gl.ONE);
  else if(m==='mul')gl.blendFuncSeparate(gl.DST_COLOR,gl.ZERO,gl.ZERO,gl.ONE);
  else gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ZERO,gl.ONE);},
 resize(){const cv=this.cv;if(!cv)return;const w=Math.max(1,window.innerWidth|0),h=Math.max(1,window.innerHeight|0),pr=GFX.PR;this.W=w;this.H=h;
  const bw=Math.max(1,Math.round(w*pr)),bh=Math.max(1,Math.round(h*pr));if(cv.width!==bw||cv.height!==bh){cv.width=bw;cv.height=bh;}
  cv.style.width=w+'px';cv.style.height=h+'px';Post.resize(bw,bh);},
 // al empezar cada fotograma de render: reloj, vigilancia del rendimiento y tamaño de la ventana
 begin(dt){dt=dt||0;this.time+=dt;this.frameNo++;Shadow.active=false;if(GFX.auto&&dt>0)GFX.monitor(dt);
  if((window.innerWidth|0)!==this.W||(window.innerHeight|0)!==this.H)this.resize();},
 // luces puntuales: [{pos:[x,y,z], r:radio, col:[r,g,b]}] (como mucho 4, o 2 en Baja; se quedan las más cercanas a la cámara)
 setLights(arr){const L=Lit,max=GFX.G.lights||4,e=Cam.eye;let n=0;L.n=0;if(!arr||!arr.length)return;
  const sel=L._sel;sel.length=0;for(const l of arr)if(l&&l.r>0)sel.push(l);
  if(sel.length>max)sel.sort((a,b)=>(V3.dist2(a.pos,e)/(a.r*a.r))-(V3.dist2(b.pos,e)/(b.r*b.r)));
  for(const l of sel){if(n>=max)break;L.PL[n*4]=l.pos[0];L.PL[n*4+1]=l.pos[1];L.PL[n*4+2]=l.pos[2];L.PL[n*4+3]=l.r;
   const c=hex(l.col);L.PLC[n*3]=c[0];L.PLC[n*3+1]=c[1];L.PLC[n*3+2]=c[2];n++;}L.n=n;},
 // foco (linterna o reflector): intensidad 0 lo apaga
 setSpot(pos,dir,i){const s=Lit.spot;if(pos)V3.copy(pos,s.p);if(dir)V3.norm(dir,s.d);s.i=i||0;},
 // arma en primera persona: borra la profundidad, proyección propia (cerca 0.02) y el programa iluminado listo;
 // fn(prog) dibuja en coordenadas del mundo (Cam.M da la base de la cámara). Sin sombras propias: sunVis 0..1 oscurece el sol
 drawViewmodel(fov,fn,sunVis){const gl=this.gl,p=this.progs.lit,u=p.u;if(fov>3.2)fov*=Math.PI/180;
  M4.persp(fov||1.0,this.W/this.H,0.02,80,VM_P);M4.mul(VM_P,Cam.V,VM_VP);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(true);gl.clear(gl.DEPTH_BUFFER_BIT);this.blend(null);
  Lit.setup(p);gl.uniformMatrix4fv(u.uVP,false,VM_VP);gl.uniform1f(u.uShK,0);gl.uniform1f(u.uSunVis,sunVis==null?1:clamp(sunVis,0,1));gl.uniform1f(u.uFogConst,0);gl.uniform1f(u.uMask,1);
  fn(p);gl.useProgram(p.p);gl.uniform1f(u.uMask,0);gl.uniform1f(u.uSunVis,1);},
 // partículas: data Float32Array con 10 floats por partícula [x,y,z, tamaño, alfa, giro, celda(0 humo,1 fuego,2 chispa,3 tierra), r,g,b]
 // add=true para mezcla aditiva (fuego, chispas, fogonazos). Llamar tras Post.grabDepth() para el fundido suave
 drawParticles(d,n,add){if(!n)return;const gl=this.gl,p=this.progs.pt,u=p.u,V=Cam.V;gl.useProgram(p.p);
  gl.uniformMatrix4fv(u.uVP,false,Cam.VP);Lit.fog(p);gl.uniform3f(u.uRight,V[0],V[4],V[8]);gl.uniform3f(u.uUp,V[1],V[5],V[9]);
  gl.uniform3fv(u.uPtLit,Lit.avgLight(Lit._pt,0.55));Lit.lights(p);
  const dt=Post.depthTex(),soft=!!(dt&&GFX.G.soft);gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,soft?dt:null);gl.uniform1i(u.uDepth,2);
  gl.uniform1f(u.uSoft,soft?0.5:0);gl.uniform2f(u.uNF,Cam.near,Cam.far);gl.uniform2f(u.uRes,Post.ms?Post.w:this.cv.width,Post.ms?Post.h:this.cv.height);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.ptTex());gl.uniform1i(u.uTex,0);gl.uniform1f(u.uAdd,add?1:0);
  gl.enable(gl.DEPTH_TEST);gl.depthMask(false);this.blend(add?'add':'alpha');
  this.setInst(this.quadXY,n*10<d.length?d.subarray(0,n*10):d,n);this.draw(this.quadXY);gl.depthMask(true);this.blend(null);},
 // manchas planas instanciadas: 10 floats [x,y,z, rumbo, ancho, largo, alfa, -,-,-]
 drawBlobs(d,n){if(!n)return;const gl=this.gl,p=this.progs.blob,u=p.u;gl.useProgram(p.p);gl.uniformMatrix4fv(u.uVP,false,Cam.VP);Lit.fog(p);
  gl.depthMask(false);this.blend('alpha');gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(-1,-6);
  this.setInst(this.quadXZ,n*10<d.length?d.subarray(0,n*10):d,n);this.draw(this.quadXZ);gl.disable(gl.POLYGON_OFFSET_FILL);gl.depthMask(true);this.blend(null);},
 ptTex(){return this._ptTex||(this._ptTex=this.tex(Tex.particles(),false));},
 decTex(){return this._decTex||(this._decTex=this.tex(Tex.decals(),false));}
};
const VM_P=new Float32Array(16),VM_VP=new Float32Array(16);

// ---------- Env: luz, cielo y niebla (formato que usan las misiones) ----------
// Colores como [r,g,b] o '#rrggbb'. sunDir = luz principal (la luna de noche); o bien sunEl/sunAz en grados.
const ENV_DEF=()=>({sunDir:Env.sunVec(38,-125),sunCol:[1.0,0.93,0.8],ambSky:[0.36,0.41,0.5],ambGnd:[0.24,0.22,0.18],
 fog:[0.72,0.76,0.78],fogN:60,fogF:520,fogSun:[0.24,0.19,0.12],mist:[0,0,0],
 zen:[0.36,0.52,0.71],hor:[0.8,0.83,0.84],cloud:0.4,cloudCol:[0.95,0.94,0.92],cloudDark:[0.62,0.66,0.7],
 stars:0,moon:0,moonDir:null,wind:1,sunK:1,wet:0,shK:null,flash:0,
 grade:{tint:[1.03,1.0,0.94],sat:0.86,con:1.06,vig:0.3,bloom:0.28,sepia:0.12}});
const ENV_COLS=['sunCol','ambSky','ambGnd','fog','fogSun','zen','hor','cloudCol','cloudDark'];
const Env={
 // el: elevación, az: acimut (grados) -> dirección hacia la luz
 sunVec(el,az){const e=el*Math.PI/180,a=az*Math.PI/180;return [Math.cos(e)*Math.cos(a),Math.sin(e),Math.cos(e)*Math.sin(a)];},
 set(o){o=o||{};const d=ENV_DEF();for(const k in d)this[k]=o[k]!==undefined?o[k]:d[k];
  for(const k of ENV_COLS)this[k]=hex(this[k]).slice();
  if(o.sunEl!=null)this.sunDir=this.sunVec(o.sunEl,o.sunAz==null?-125:o.sunAz);this.sunDir=V3.norm(this.sunDir);
  this.moonDir=V3.norm(this.moonDir||this.sunDir);this.mist=(this.mist||[0,0,0]).slice();
  const g=Object.assign({},d.grade,o.grade||{});g.tint=hex(g.tint).slice();this.grade=g;return this;}
};
Env.set();

// ---------- Cam: cámara en primera persona y frustum ----------
// Cam.set({eye, yaw, pitch, roll, fov (rad; si >3.2 se toma en grados), near, far}) -> P, V, VP, INV, M (base de la cámara), fwd, right, up, planos
const Cam={eye:[0,1.62,0],yaw:0,pitch:0,roll:0,fov:1.15,near:0.08,far:1500,asp:1,
 P:new Float32Array(16),V:new Float32Array(16),VP:new Float32Array(16),INV:new Float32Array(16),M:new Float32Array(16),
 fwd:[0,0,1],right:[-1,0,0],up:[0,1,0],planes:new Float32Array(24),
 set(o){if(o.eye)V3.copy(o.eye,this.eye);for(const k of ['yaw','pitch','roll','near','far'])if(o[k]!=null)this[k]=o[k];
  if(o.fov!=null)this.fov=o.fov>3.2?o.fov*Math.PI/180:o.fov;this.asp=GL.W/GL.H;
  const cy=Math.cos(this.yaw),sy=Math.sin(this.yaw),cp=Math.cos(this.pitch),sp=Math.sin(this.pitch),cr=Math.cos(this.roll),sr=Math.sin(this.roll);
  const f=this.fwd,r=this.right,u=this.up,e=this.eye;f[0]=sy*cp;f[1]=sp;f[2]=cy*cp;
  const r0x=-cy,r0z=sy,u0x=-sy*sp,u0y=cp,u0z=-cy*sp;
  r[0]=r0x*cr-u0x*sr;r[1]=-u0y*sr;r[2]=r0z*cr-u0z*sr;u[0]=u0x*cr+r0x*sr;u[1]=u0y*cr;u[2]=u0z*cr+r0z*sr;
  const V=this.V;V[0]=r[0];V[4]=r[1];V[8]=r[2];V[1]=u[0];V[5]=u[1];V[9]=u[2];V[2]=-f[0];V[6]=-f[1];V[10]=-f[2];V[3]=V[7]=V[11]=0;V[15]=1;
  V[12]=-V3.dot(r,e);V[13]=-V3.dot(u,e);V[14]=V3.dot(f,e);
  M4.persp(this.fov,this.asp,this.near,this.far,this.P);M4.mul(this.P,V,this.VP);M4.invert(this.VP,this.INV);
  M4.compose(e,this.yaw,this.pitch,this.roll,1,this.M);
  const m=this.VP,pl=this.planes;
  for(let i=0;i<6;i++){const a=i>>1,s=i&1?-1:1,o4=i*4;
   pl[o4]=m[3]+s*m[a];pl[o4+1]=m[7]+s*m[4+a];pl[o4+2]=m[11]+s*m[8+a];pl[o4+3]=m[15]+s*m[12+a];
   const l=Math.hypot(pl[o4],pl[o4+1],pl[o4+2])||1;pl[o4]/=l;pl[o4+1]/=l;pl[o4+2]/=l;pl[o4+3]/=l;}
  return this;},
 sphereVisible(c,r){const pl=this.planes;for(let i=0;i<24;i+=4)if(pl[i]*c[0]+pl[i+1]*c[1]+pl[i+2]*c[2]+pl[i+3]<-r)return false;return true;},
 // punto del mundo -> [x, y en píxeles CSS, 1 si está delante de la cámara y 0 si detrás]
 toScreen(p,o){o=o||[0,0,0];const m=this.VP,x=p[0],y=p[1],z=p[2],w=m[3]*x+m[7]*y+m[11]*z+m[15];
  const cx=m[0]*x+m[4]*y+m[8]*z+m[12],cy=m[1]*x+m[5]*y+m[9]*z+m[13],iw=1/Math.max(Math.abs(w),1e-4)*(w<0?-1:1);
  o[0]=(cx*iw*0.5+0.5)*GL.W;o[1]=(0.5-cy*iw*0.5)*GL.H;o[2]=w>0?1:0;return o;}
};

// ---------- Lit: uniformes comunes de los programas iluminados ----------
const Lit={PL:new Float32Array(16),PLC:new Float32Array(12),n:0,spot:{p:[0,0,0],d:[0,0,1],i:0},_sel:[],_pt:[0,0,0],_dec:[0,0,0],
 // deja listo un programa iluminado (lit) con Env, cámara, sombras y luces; uModel identidad, sin instancias ni textura
 setup(p){const gl=GL.gl,u=p.u,E=Env,S=Shadow,sz=S.size||1;
  gl.useProgram(p.p);gl.uniformMatrix4fv(u.uVP,false,Cam.VP);gl.uniformMatrix4fv(u.uModel,false,MI);
  gl.uniform3fv(u.uSun,E.sunDir);gl.uniform3fv(u.uSunCol,E.sunCol);gl.uniform3fv(u.uSky,E.ambSky);gl.uniform3fv(u.uGnd,E.ambGnd);
  this.fog(p);gl.uniform1f(u.uWet,0);gl.uniform1f(u.uFlash,E.flash*0.9);gl.uniform1f(u.uAlpha,1);gl.uniform4f(u.uTint,0,0,0,0);
  gl.uniform1f(u.uInst,0);gl.uniform1f(u.uUseTex,0);gl.uniform1i(u.uTex,0);
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,S.active?S.tex:S.dummy);gl.activeTexture(gl.TEXTURE0);
  gl.uniform1i(u.uShadow,1);gl.uniform1f(u.uShK,S.active?S.k:0);gl.uniformMatrix4fv(u.uLVP0,false,S.C[0].LVP);gl.uniformMatrix4fv(u.uLVP1,false,S.C[1].LVP);
  gl.uniform2f(u.uShTex,0.5/sz,1/sz);gl.uniform1f(u.uShTaps,GFX.G.taps);
  const tw=2/sz*1.8;gl.uniform2f(u.uShW,S.C[0].R*tw,S.C[1].R*tw); // separación de la superficie: ~2 texeles de cada cascada
  gl.uniform1f(u.uGloss,0);gl.uniform1f(u.uSway,0);gl.uniform1f(u.uTime,GL.time%1000);gl.uniform1f(u.uSunVis,1);gl.uniform1f(u.uMask,0);
  this.lights(p);gl.vertexAttrib3f(6,1,1,1);},
 fog(p){const gl=GL.gl,u=p.u,E=Env;gl.uniform3fv(u.uFog,E.fog);gl.uniform2f(u.uFogR,E.fogN,E.fogF);gl.uniform3fv(u.uEye,Cam.eye);gl.uniform1f(u.uFogConst,-1);
  gl.uniform3fv(u.uFogSun,E.fogSun);gl.uniform3fv(u.uSunDir,E.sunDir);gl.uniform3fv(u.uMist,E.mist);},
 lights(p){const gl=GL.gl,u=p.u,s=this.spot;gl.uniform1i(u.uNPL,this.n);if(this.n){gl.uniform4fv(u['uPL[0]'],this.PL);gl.uniform3fv(u['uPLC[0]'],this.PLC);}
  if(u.uSpI){gl.uniform1f(u.uSpI,s.i);gl.uniform3fv(u.uSpP,s.p);gl.uniform3fv(u.uSpD,s.d);}},
 // luz media que recibe algo sin orientación (humo, marcas): ambiente + parte del sol
 avgLight(o,k){const E=Env,s=Math.max(0,E.sunDir[1])*k+0.12;for(let i=0;i<3;i++)o[i]=E.ambSky[i]*0.85+E.ambGnd[i]*0.3+E.sunCol[i]*s*(Shadow.active?Shadow.k*0.3+0.7:1)+E.flash*0.5;return o;}
};

// ---------- Sky ----------
const Sky={draw(){const gl=GL.gl,p=GL.progs.sky,u=p.u,E=Env;gl.disable(gl.DEPTH_TEST);gl.depthMask(false);GL.blend(null);gl.useProgram(p.p);
  gl.uniformMatrix4fv(u.uInv,false,Cam.INV);gl.uniform3fv(u.uZen,E.zen);gl.uniform3fv(u.uHor,E.hor);gl.uniform3fv(u.uSun,E.sunDir);gl.uniform1f(u.uStars,E.stars);
  gl.uniform1f(u.uFlash,E.flash);gl.uniform1f(u.uSunK,E.sunK);gl.uniform1f(u.uCloud,GFX.G.clouds?E.cloud:0);gl.uniform1f(u.uTime,GL.time%3000);gl.uniform1f(u.uWind,E.wind||1);
  gl.uniform3fv(u.uCloudCol,E.cloudCol);gl.uniform3fv(u.uCloudDark,E.cloudDark);gl.uniform3fv(u.uFogSun,E.fogSun);gl.uniform3fv(u.uFog,E.fog);
  gl.uniform3fv(u.uMoonDir,E.moonDir);gl.uniform1f(u.uMoon,E.moon);
  GL.draw(GL.tri);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(true);}};

// ---------- Sombras del sol: dos cascadas en un atlas 2x1 (cerca nítida / lejos amplia) que siguen a la cámara ----------
const Shadow={size:0,tex:null,fbo:null,dummy:null,active:false,k:0,
 C:[{R:18,LVP:M4.ident(),cx:0,cy:0,cz:0},{R:80,LVP:M4.ident(),cx:0,cy:0,cz:0}],LV:new Float32Array(16),LP:new Float32Array(16),
 mkTex(w,h,fmt){const gl=GL.gl,t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texStorage2D(gl.TEXTURE_2D,1,fmt||gl.DEPTH_COMPONENT24,w,h);
  for(const [k,v] of [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE],
    [gl.TEXTURE_COMPARE_MODE,gl.COMPARE_REF_TO_TEXTURE],[gl.TEXTURE_COMPARE_FUNC,gl.LEQUAL]])gl.texParameteri(gl.TEXTURE_2D,k,v);
  gl.bindTexture(gl.TEXTURE_2D,null);return t;}, // no se deja puesta en la unidad activa: un sampler2D normal no puede leerla
 init(size,R0,R1){const gl=GL.gl;if(!this.dummy)this.dummy=this.mkTex(1,1); // textura vacía para cuando no hay sombras (el shader siempre necesita una)
  if(this.tex){gl.deleteTexture(this.tex);gl.deleteFramebuffer(this.fbo);this.tex=this.fbo=null;}this.size=0;this.active=false;if(!size)return;
  size=Math.min(size,Math.floor((gl.getParameter(gl.MAX_TEXTURE_SIZE)||4096)/2));
  // si el aparato no puede (memoria, formato), se prueba con la mitad de tamaño y con profundidad de 16 bits antes de quedarse sin sombras
  for(const sz of [size,size>>1])for(const fmt of [gl.DEPTH_COMPONENT24,gl.DEPTH_COMPONENT16]){if(sz<512&&sz!==size)continue;
    let t=null,f=null;try{for(let q=0;q<8&&gl.getError()!==gl.NO_ERROR;q++);t=this.mkTex(sz*2,sz,fmt);f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,t,0);
      gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);const ok=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE&&gl.getError()===gl.NO_ERROR;gl.bindFramebuffer(gl.FRAMEBUFFER,null);
      if(ok){this.tex=t;this.fbo=f;this.size=sz;this.C[0].R=R0||18;this.C[1].R=R1||80;return;}}catch(e){gl.bindFramebuffer(gl.FRAMEBUFFER,null);}
    if(t)gl.deleteTexture(t);if(f)gl.deleteFramebuffer(f);}},
 matrix(c,cx,cy,cz,sun){const R=c.R,LV=this.LV;M4.lookAt(sun,[0,0,0],[0,1,0],LV);
  // centro en el espacio de la luz, ajustado a la rejilla de texeles para que las sombras no tiemblen al moverse
  const lx=LV[0]*cx+LV[4]*cy+LV[8]*cz+LV[12],ly=LV[1]*cx+LV[5]*cy+LV[9]*cz+LV[13],lz=LV[2]*cx+LV[6]*cy+LV[10]*cz+LV[14];
  const tx=2*R/this.size,sx=Math.round(lx/tx)*tx,sy=Math.round(ly/tx)*tx;
  M4.ortho(sx-R,sx+R,sy-R,sy+R,-lz-120,-lz+120,this.LP);M4.mul(this.LP,LV,c.LVP);},
 // pinta las dos cascadas alrededor de ctr (adelantadas hacia fwd). drawCasters(prog, ci, cascada) se llama con el programa
 // de profundidad puesto, uModel identidad, uInst 0 y uSway 0; para descartar lejanos: Shadow.near(ci, x, z, r)
 render(ctr,fwd,drawCasters){const gl=GL.gl,E=Env,sz=this.size,k=E.shK!=null?E.shK:E.sunK>0.15?Math.min(1,E.sunK)*0.74:E.moon>0?0.45:0;
  this.active=false;this.k=k;if(!sz||!this.fbo||k<=0)return false;
  const dp=GL.progs.depth,u=dp.u,fl=Math.hypot(fwd[0],fwd[2])||1,fx=fwd[0]/fl,fz=fwd[2]/fl;
  gl.bindFramebuffer(gl.FRAMEBUFFER,this.fbo);gl.viewport(0,0,sz*2,sz);gl.depthMask(true);gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);GL.blend(null);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(2,4);
  gl.useProgram(dp.p);gl.uniform1f(u.uTime,GL.time%1000);
  for(let ci=0;ci<2;ci++){const c=this.C[ci],ah=c.R*(ci?0.6:0.45);c.cx=ctr[0]+fx*ah;c.cy=ctr[1];c.cz=ctr[2]+fz*ah;
   this.matrix(c,c.cx,c.cy,c.cz,E.sunDir);gl.viewport(ci*sz,0,sz,sz);gl.uniformMatrix4fv(u.uLVP,false,c.LVP);
   gl.uniformMatrix4fv(u.uModel,false,MI); // en cada cascada: lo último dibujado en la anterior deja puesta su matriz
   gl.uniform1f(u.uInst,0);gl.uniform1f(u.uSway,0);drawCasters(dp,ci,c);}
  gl.disable(gl.POLYGON_OFFSET_FILL);gl.bindFramebuffer(gl.FRAMEBUFFER,null);this.active=true;return true;},
 near(ci,x,z,r){const c=this.C[ci],dx=x-c.cx,dz=z-c.cz,R=c.R*1.45+(r||0);return dx*dx+dz*dz<R*R;}
};

// ---------- Posprocesado: escena con MSAA en un framebuffer propio; luego SSAO, resplandor, rayos, color y efectos ----------
// Post.fx: hurt 0..1 (viñeta roja y desaturación), blast 0..1 (aturdimiento: destello y desenfoque), ads 0..1 (viñeta al apuntar), scope 0..1 (visor)
const Post={ok:false,ms:null,res:null,L:[],w:0,h:0,G:null,hdr:false,hasDepth:false,fx:{hurt:0,blast:0,ads:0,scope:0},INVP:new Float32Array(16),
 init(){const gl=GL.gl,P=GL.progs;this.cbf=!!(gl.getExtension('EXT_color_buffer_float')||gl.getExtension('EXT_color_buffer_half_float'));this.ok=!!(P.ppBright&&P.ppDown&&P.ppUp&&P.ppFinal);
  this.ms=this.res=this.dt=this.df=this.ao0=this.ao1=this.g0=this.g1=null;this.L=[];},
 tex(w,h,fmt){const gl=GL.gl,t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texStorage2D(gl.TEXTURE_2D,1,fmt,w,h);
  for(const [k,v] of [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,k,v);
  const f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);
  return {t,f,w,h,ok:gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE};},
 free(){const gl=GL.gl;for(const r of [this.res,...this.L,this.ao0,this.ao1,this.g0,this.g1])if(r){gl.deleteTexture(r.t);gl.deleteFramebuffer(r.f);}
  if(this.ms){gl.deleteFramebuffer(this.ms);gl.deleteRenderbuffer(this.rc);gl.deleteRenderbuffer(this.rd);}
  if(this.dt){gl.deleteTexture(this.dt);gl.deleteFramebuffer(this.df);}this.ms=this.res=this.dt=this.df=this.ao0=this.ao1=this.g0=this.g1=null;this.L=[];},
 build(w,h,G,hdr){const gl=GL.gl,fmt=hdr?gl.RGBA16F:gl.RGBA8,ns=Math.min(G.msaa,gl.getParameter(gl.MAX_SAMPLES)||0);
  const rb=f=>{const r=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,r);if(ns>0)gl.renderbufferStorageMultisample(gl.RENDERBUFFER,ns,f,w,h);else gl.renderbufferStorage(gl.RENDERBUFFER,f,w,h);return r;};
  this.rc=rb(fmt);this.rd=rb(gl.DEPTH_COMPONENT24);this.ms=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,this.ms);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.RENDERBUFFER,this.rc);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,this.rd);
  let ok=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;this.res=this.tex(w,h,fmt);ok=ok&&this.res.ok;
  if(G.bloom){let lw=w,lh=h;for(let i=0;i<4;i++){lw=Math.max(1,lw>>1);lh=Math.max(1,lh>>1);const r=this.tex(lw,lh,fmt);this.L.push(r);ok=ok&&r.ok;}}
  if(G.depth){const t=this.dt=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texStorage2D(gl.TEXTURE_2D,1,gl.DEPTH_COMPONENT24,w,h);
    for(const [k,v] of [[gl.TEXTURE_MIN_FILTER,gl.NEAREST],[gl.TEXTURE_MAG_FILTER,gl.NEAREST],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,k,v);
    this.df=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,this.df);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,t,0);gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);
    ok=ok&&gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;gl.bindTexture(gl.TEXTURE_2D,null);}
  if(G.ssao&&G.depth){const hw=Math.max(1,w>>1),hh=Math.max(1,h>>1);this.ao0=this.tex(hw,hh,gl.RGBA8);this.ao1=this.tex(hw,hh,gl.RGBA8);ok=ok&&this.ao0.ok&&this.ao1.ok;}
  if(G.god&&G.depth){const qw=Math.max(1,w>>2),qh=Math.max(1,h>>2);this.g0=this.tex(qw,qh,gl.RGBA8);this.g1=this.tex(qw,qh,gl.RGBA8);ok=ok&&this.g0.ok&&this.g1.ok;}
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);return ok&&!gl.getError();},
 resize(w,h){if(!this.ok)return;const G=GFX.G;if(this.ms&&w===this.w&&h===this.h&&G===this.G)return;
  this.free();this.w=w;this.h=h;this.G=G;
  try{for(const hdr of (G.hdr&&this.cbf?[true,false]:[false])){if(this.build(w,h,G,hdr)){this.hdr=hdr;return;}this.free();}}catch(e){this.free();}
  GL.gl.bindFramebuffer(GL.gl.FRAMEBUFFER,null);}, // si nada funciona, se pinta directamente en el lienzo
 // empieza la escena: framebuffer con MSAA, borrado con el color de la niebla (alfa 1 = máscara de mundo)
 begin(){const gl=GL.gl,cv=GL.cv,f=Env.fog;this.hasDepth=false;gl.bindFramebuffer(gl.FRAMEBUFFER,this.ms||null);gl.viewport(0,0,cv.width,cv.height);
  gl.depthMask(true);gl.colorMask(true,true,true,true);gl.clearColor(f[0],f[1],f[2],1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);GL.blend(null);},
 // copia la profundidad de lo opaco (llamar tras lo opaco y antes de humo, partículas y arma) para SSAO, rayos y partículas suaves
 grabDepth(){if(!this.ms||!this.df)return;const gl=GL.gl,w=this.w,h=this.h;gl.bindFramebuffer(gl.READ_FRAMEBUFFER,this.ms);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,this.df);
  gl.blitFramebuffer(0,0,w,h,0,0,w,h,gl.DEPTH_BUFFER_BIT,gl.NEAREST);gl.bindFramebuffer(gl.FRAMEBUFFER,this.ms);this.hasDepth=true;},
 depthTex(){return this.hasDepth&&this.dt?this.dt:null;},
 pass(pr,src,dst){const gl=GL.gl;gl.bindFramebuffer(gl.FRAMEBUFFER,dst.f);gl.viewport(0,0,dst.w,dst.h);gl.useProgram(pr.p);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,src.t);gl.uniform1i(pr.u.uTex,0);gl.uniform2f(pr.u.uPx,1/src.w,1/src.h);GL.draw(GL.tri);},
 bindT(unit,t){const gl=GL.gl;gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);},
 to(r){const gl=GL.gl;gl.bindFramebuffer(gl.FRAMEBUFFER,r.f);gl.viewport(0,0,r.w,r.h);},
 // termina el fotograma: resuelve el MSAA y compone en el lienzo
 end(){const gl=GL.gl,cv=GL.cv;if(!this.ms){gl.bindFramebuffer(gl.FRAMEBUFFER,null);return;}
  const w=this.w,h=this.h,PG=GL.progs,L=this.L,E=Env,gr=E.grade,G=this.G,dep=this.hasDepth&&this.dt,fx=this.fx,INVP=this.INVP;
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER,this.ms);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,this.res.f);gl.blitFramebuffer(0,0,w,h,0,0,w,h,gl.COLOR_BUFFER_BIT,gl.NEAREST);
  gl.disable(gl.DEPTH_TEST);GL.blend(null);gl.depthMask(false);
  M4.invert(Cam.P,INVP);
  const aoOn=!!(G.ssao&&dep&&this.ao0);
  if(aoOn){const pa=PG.ppAO,u=pa.u;this.to(this.ao0);gl.useProgram(pa.p);this.bindT(0,this.dt);gl.uniform1i(u.uDepth,0);
    gl.uniformMatrix4fv(u.uInvP,false,INVP);gl.uniformMatrix4fv(u.uP,false,Cam.P);gl.uniform2f(u.uPx,1/w,1/h);gl.uniform1f(u.uRad,0.5);gl.uniform3fv(u['uK[0]'],AO_K);gl.uniform1i(u.uN,G.ssao);GL.draw(GL.tri);
    const pb=PG.ppAOBlur,v=pb.u;this.to(this.ao1);gl.useProgram(pb.p);this.bindT(0,this.ao0.t);this.bindT(1,this.dt);gl.uniform1i(v.uTex,0);gl.uniform1i(v.uDepth,1);
    gl.uniform2f(v.uPx,1/this.ao0.w,1/this.ao0.h);gl.uniformMatrix4fv(v.uInvP,false,INVP);GL.draw(GL.tri);}
  // rayos de sol (sólo si el sol está delante y cerca del encuadre)
  let godK=0;
  if(G.god&&dep&&this.g0&&E.sunK>0.2){const sd=E.sunDir,ey=Cam.eye,x=ey[0]+sd[0]*1000,y=ey[1]+sd[1]*1000,z=ey[2]+sd[2]*1000,V_=Cam.VP;
    const cx=V_[0]*x+V_[4]*y+V_[8]*z+V_[12],cy=V_[1]*x+V_[5]*y+V_[9]*z+V_[13],cw=V_[3]*x+V_[7]*y+V_[11]*z+V_[15];
    if(cw>0){const sx=cx/cw*0.5+0.5,sy=cy/cw*0.5+0.5,ex=Math.max(0,Math.abs(sx-0.5)-0.5,Math.abs(sy-0.5)-0.5);godK=E.sunK*(1-clamp(ex/0.65,0,1))*(1-E.cloud*0.5)*0.55;
      if(godK>0.01){const pm=PG.ppGodMask;this.to(this.g0);gl.useProgram(pm.p);this.bindT(0,this.dt);gl.uniform1i(pm.u.uDepth,0);gl.uniform2f(pm.u.uSun,sx,sy);gl.uniform1f(pm.u.uAsp,w/h);GL.draw(GL.tri);
        const pg=PG.ppGodBlur;this.to(this.g1);gl.useProgram(pg.p);this.bindT(0,this.g0.t);gl.uniform1i(pg.u.uTex,0);gl.uniform2f(pg.u.uSun,sx,sy);GL.draw(GL.tri);}else godK=0;}}
  // resplandor
  if(L.length){gl.useProgram(PG.ppBright.p);gl.uniform1f(PG.ppBright.u.uThr,this.hdr?1.0:0.92);this.pass(PG.ppBright,this.res,L[0]);
    for(let i=1;i<L.length;i++)this.pass(PG.ppDown,L[i-1],L[i]);
    gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);for(let i=L.length-1;i>0;i--)this.pass(PG.ppUp,L[i],L[i-1]);gl.disable(gl.BLEND);}
  // composición final en el lienzo
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,cv.width,cv.height);const pf=PG.ppFinal,u=pf.u;gl.useProgram(pf.p);const R=this.res.t;
  this.bindT(3,godK?this.g1.t:R);this.bindT(2,aoOn?this.ao1.t:R);this.bindT(1,L.length?L[0].t:R);this.bindT(0,R);
  gl.uniform1i(u.uScene,0);gl.uniform1i(u.uBloom,1);gl.uniform1i(u.uAO,2);gl.uniform1i(u.uGod,3);
  gl.uniform1f(u.uBloomK,L.length?gr.bloom*(this.hdr?1:0.8):0);gl.uniform1f(u.uAOK,aoOn?0.45:0);gl.uniform1f(u.uGodK,godK);
  gl.uniform3f(u.uGodCol,E.sunCol[0]*1.25,E.sunCol[1]*1.15,E.sunCol[2]*0.95);
  gl.uniform1f(u.uVig,gr.vig);gl.uniform1f(u.uSat,gr.sat);gl.uniform1f(u.uCon,gr.con);gl.uniform3fv(u.uTint,gr.tint);gl.uniform1f(u.uSepia,gr.sepia||0);
  gl.uniform2f(u.uPx,1/w,1/h);gl.uniform1f(u.uAsp,w/h);gl.uniform1f(u.uTime,GL.time%1000);
  gl.uniform1f(u.uHurt,clamp(fx.hurt,0,1));gl.uniform1f(u.uBlast,clamp(fx.blast,0,1));gl.uniform1f(u.uAds,clamp(fx.ads,0,1));gl.uniform1f(u.uScope,clamp(fx.scope,0,1));
  GL.draw(GL.tri);gl.activeTexture(gl.TEXTURE0);gl.depthMask(true);gl.enable(gl.DEPTH_TEST);}
};
// núcleo de muestras del SSAO: hemisferio con más densidad cerca del centro
const AO_K=(()=>{const r=mulberry32(4242),k=new Float32Array(48);for(let i=0;i<16;i++){let x,y,z,l;do{x=r()*2-1;y=r()*2-1;z=r();l=Math.hypot(x,y,z);}while(l>1||l<0.1);
  const s=0.15+0.85*Math.pow((i+1)/16,2);k[i*3]=x/l*s;k[i*3+1]=y/l*s;k[i*3+2]=z/l*s;}return k;})();

// ---------- Calidad gráfica: Baja / Media / Alta / Ultra, con bajada automática y resolución dinámica ----------
// shadow: tamaño de cada cascada (0 = manchas en vez de sombras), R0/R1: alcance en m, taps: filtrado, msaa, prMax: resolución máxima,
// depth: copia de profundidad (partículas suaves, SSAO, rayos), parts: máximo de partículas, lights: luces puntuales, dist: distancia de dibujo, lod: detalle
const GFX={Q:{
  baja:{shadow:0,taps:1,bloom:false,hdr:false,clouds:false,msaa:2,prMax:1,depth:false,soft:false,parts:300,lights:2,dist:0.75,lod:0},
  media:{shadow:1024,R0:16,R1:60,taps:1,bloom:true,hdr:false,clouds:true,msaa:4,prMax:1.5,depth:true,soft:true,parts:600,lights:4,dist:0.9,lod:1},
  alta:{shadow:2048,R0:18,R1:85,taps:2,bloom:true,hdr:true,clouds:true,msaa:4,prMax:1.5,depth:true,soft:true,god:true,parts:1000,lights:4,dist:1,lod:2},
  ultra:{shadow:3072,R0:22,R1:110,taps:2,bloom:true,hdr:true,clouds:true,msaa:8,prMax:2,depth:true,soft:true,god:true,ssao:12,parts:1600,lights:4,dist:1.2,lod:3}},
 order:['baja','media','alta','ultra'],level:matchMedia('(pointer:coarse)').matches?'media':'alta',cap:null,auto:true,PR:1,PRmax:1,bad:{},good:0,pt:0,pn:0,
 // nivel efectivo (el elegido, limitado por la bajada automática)
 name(){const o=this.order,c=o.indexOf(this.level),m=this.cap?o.indexOf(this.cap):9;return o[Math.max(0,Math.min(c<0?2:c,m))];},
 get G(){return this.Q[this.name()];},
 set(level){if(this.Q[level])this.level=level;this.cap=null;this.apply(false);},
 apply(auto){const G=this.G;this.PRmax=Math.min(G.prMax,window.devicePixelRatio||1);this.PR=auto?Math.min(this.PR,this.PRmax):this.PRmax;
  if(!auto)this.bad={};this.good=0;this.pt=this.pn=0;if(GL.gl){Shadow.init(G.shadow,G.R0,G.R1);GL.resize();}},
 // si el aparato no llega, se baja antes la resolución (hasta 1x) que la calidad (sin bajar de Media); por debajo de 1x sólo al final
 monitor(dt){this.pt+=Math.min(dt,0.05);this.pn++;if(this.pn<90)return;const avg=this.pt/this.pn;this.pt=0;this.pn=0;
  const pk=v=>Math.min(this.PRmax,v).toFixed(2),lv=this.order.indexOf(this.name());
  if(avg>1/38&&(this.PR>0.75||lv>0)){this.bad[pk(this.PR)]=(this.bad[pk(this.PR)]||0)+1;this.good=0;
   if(this.PR>1.001){this.PR=Math.max(1,this.PR-(avg>1/24?0.5:0.25));GL.resize();}
   else if(lv>1){this.cap=this.order[lv-1];this.apply(true);Bus.emit('gfxAuto',{level:this.cap});}
   else if(this.PR>0.75){this.PR=0.75;GL.resize();}}
  else if(avg<1/55&&this.PR<this.PRmax&&(this.bad[pk(this.PR+0.25)]||0)<2){if(++this.good>=4){this.good=0;this.PR=Math.min(this.PRmax,this.PR+0.25);GL.resize();}}
  else this.good=0;}
};

const DEC_W=[1,1,1];
// ---------- DecalBuf: marcas en anillo (las más viejas se reemplazan) ----------
// Cada marca es una rejilla de (N+1)² vértices; en el suelo sigue el relieve con H(x,z). Atlas Tex.decals() de 4x2 celdas:
// 0 mancha de sombra, 1 agujero de bala, 2 agujero en madera, 3 quemadura, 4 sangre, 5 cráter, 6 salpicadura de tierra, 7 hoyo en nieve
class DecalBuf{
 constructor(max,N){const gl=GL.gl;this.max=max;this.N=N||3;this.nv=(this.N+1)*(this.N+1);this.head=0;this.n=0;
  const nv=this.nv,ni=this.N*this.N*6;this.P=new Float32Array(max*nv*3);this.A=new Float32Array(max*nv*3);this.C=new Float32Array(max*nv*3);this.U=new Float32Array(max*nv*2);
  const I=new Uint32Array(max*ni),N1=this.N+1;let q=0;for(let d=0;d<max;d++){const b=d*nv;for(let j=0;j<this.N;j++)for(let i=0;i<this.N;i++){const k=b+j*N1+i;I[q++]=k;I[q++]=k+1;I[q++]=k+N1+1;I[q++]=k;I[q++]=k+N1+1;I[q++]=k+N1;}}
  this.m=GL.mesh({p:this.P,n:this.A,c:this.C,u:this.U,idx:I},{dyn:true});this.m.count=0;this.ni=ni;this.dirty=null;}
 _slot(){const s=this.head;this.head=(this.head+1)%this.max;if(this.n<this.max)this.n++;return s;}
 _put(s,i,x,y,z,u,v,cell,col,a,blob){const o=s*this.nv+i,o3=o*3,c=col?hex(col):DEC_W,P=this.P,A=this.A,C=this.C;P[o3]=x;P[o3+1]=y;P[o3+2]=z;A[o3]=a;A[o3+1]=blob?1:0;A[o3+2]=0;
  C[o3]=c[0];C[o3+1]=c[1];C[o3+2]=c[2];const cx=cell%4,cy=Math.floor(cell/4);this.U[o*2]=(cx+0.5+u*0.46)/4;this.U[o*2+1]=(cy+0.5+v*0.46)/2;}
 _mark(s){this.dirty=this.dirty?[Math.min(this.dirty[0],s),Math.max(this.dirty[1],s)]:[s,s];}
 // marca en el suelo: centro x,z, radio r, giro, celda del atlas, color, alfa; H(x,z) = altura del terreno; blob=true para manchas de sombra
 addGround(x,z,r,rot,cell,col,a,H,blob){const s=this._slot(),N=this.N,c=Math.cos(rot||0),sn=Math.sin(rot||0);let i=0;
  for(let j=0;j<=N;j++)for(let k=0;k<=N;k++){const u=k/N*2-1,v=j/N*2-1,px=x+(c*u+sn*v)*r,pz=z+(-sn*u+c*v)*r;this._put(s,i++,px,(H?H(px,pz):0)+0.025,pz,u,v,cell,col,a==null?1:a,blob);}
  this._mark(s);return s;}
 // marca plana en cualquier superficie: posición, normal, radio, giro, celda, color, alfa
 addQuad(pos,nrm,r,rot,cell,col,a){const s=this._slot(),N=this.N,n=V3.norm(nrm,[0,0,0]);const t=Math.abs(n[1])<0.9?V3.norm(V3.cross([0,1,0],n)):V3.norm(V3.cross([1,0,0],n)),b=V3.cross(n,t);
  const c=Math.cos(rot||0),sn=Math.sin(rot||0);let i=0;
  for(let j=0;j<=N;j++)for(let k=0;k<=N;k++){const u=k/N*2-1,v=j/N*2-1,du=(c*u-sn*v)*r,dv=(sn*u+c*v)*r;
   this._put(s,i++,pos[0]+t[0]*du+b[0]*dv+n[0]*0.012,pos[1]+t[1]*du+b[1]*dv+n[1]*0.012,pos[2]+t[2]*du+b[2]*dv+n[2]*0.012,u,v,cell,col,a==null?1:a,false);}
  this._mark(s);return s;}
 fade(s,a){for(let i=0;i<this.nv;i++)this.A[(s*this.nv+i)*3]=a;this._mark(s);} // cambia el alfa de una marca
 clear(){this.head=this.n=0;this.m.count=0;}
 _upload(){const d=this.dirty;if(!d)return;this.dirty=null;const gl=GL.gl,nv=this.nv,a=d[0]*nv,b=(d[1]+1)*nv,m=this.m;
  for(const [buf,arr,k] of [[m.pb,this.P,3],[m.nb,this.A,3],[m.cb,this.C,3],[m.ub,this.U,2]]){gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferSubData(gl.ARRAY_BUFFER,a*k*4,arr,a*k,(b-a)*k);}}
 // dibuja (transparente: tras lo opaco). Con sombras reales, las manchas de sombra se apagan donde llega el mapa
 draw(){if(!this.n)return;this._upload();const gl=GL.gl,p=GL.progs.dec,u=p.u;gl.useProgram(p.p);gl.uniformMatrix4fv(u.uVP,false,Cam.VP);Lit.fog(p);
  gl.uniform3fv(u.uDecLit,Lit.avgLight(Lit._dec,0.8));gl.uniform1f(u.uCov,Shadow.active?1:0);gl.uniformMatrix4fv(u.uLVP1,false,Shadow.C[1].LVP);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,GL.decTex());gl.uniform1i(u.uTex,0);
  gl.enable(gl.DEPTH_TEST);gl.depthMask(false);GL.blend('alpha');gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(-1,-6);
  GL.draw(this.m,this.n*this.ni);gl.disable(gl.POLYGON_OFFSET_FILL);gl.depthMask(true);GL.blend(null);}
 free(){GL.free(this.m);}
}
