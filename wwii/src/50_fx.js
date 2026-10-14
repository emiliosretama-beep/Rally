// ===== FRENTE 44 · efectos: partículas, marcas, trazadoras, luces puntuales y temblor de cámara =====
// STUB fase 1: lo sustituye el módulo completo (50_fx.js). Fogonazo (partícula + luz), polvo de impacto con agujero, sangre moderada,
// explosión (bola de fuego, humo, tierra, luz, marca quemada, temblor y aturdimiento), trazadoras, humo y fuego persistentes, nieve.
// Partícula (20 floats): x,y,z, vx,vy,vz, edad, vida, tam0, tam1, alfa, giro, vgiro, celda, r,g,b, gravedad, freno, aditiva
const FXS=20;
const FX={P:new Float32Array(1600*FXS),n:0,L:[],T:[],E:[],trauma:0,_sh:[0,0,0],dec:null,env:null,_lo:[],_da:new Float32Array(1600*10),_db:new Float32Array(1600*10),_idx:[],_key:new Float32Array(1600),t:0,
 init(){},
 clear(){this.n=0;this.L.length=0;this.T.length=0;this.E.length=0;this.trauma=0;if(this.dec)this.dec.clear();Post.fx.blast=0;Env.flash=0;},
 _add(x,y,z,vx,vy,vz,life,s0,s1,a,cell,r,g,b,grav,drag,add,rot){const max=Math.min(1600,GFX.G.parts||600);if(this.n>=max)return;const P=this.P,o=this.n++*FXS;
  P[o]=x;P[o+1]=y;P[o+2]=z;P[o+3]=vx;P[o+4]=vy;P[o+5]=vz;P[o+6]=0;P[o+7]=life;P[o+8]=s0;P[o+9]=s1;P[o+10]=a;P[o+11]=rot==null?Math.random()*6.28:rot;P[o+12]=(Math.random()-0.5)*1.5;
  P[o+13]=cell;P[o+14]=r;P[o+15]=g;P[o+16]=b;P[o+17]=grav;P[o+18]=drag;P[o+19]=add?1:0;},
 light(pos,r,col,life){this.L.push({pos:pos.slice(),r,col:hex(col).slice(),c:[0,0,0],t:0,life});},
 _decals(){if(!this.dec&&GL.gl)this.dec=new DecalBuf(240,1);return this.dec;},
 // fogonazo en pos hacia dir (size 1 = fusil); player=true si es el del jugador (el arma en primera persona ya lleva el suyo)
 muzzle(pos,dir,size,player){size=size||1;const R=Math.random;
  if(!player)for(let i=0;i<3;i++){const k=0.15+i*0.18;this._add(pos[0]+dir[0]*k*size,pos[1]+dir[1]*k*size,pos[2]+dir[2]*k*size,dir[0]*2,dir[1]*2,dir[2]*2,0.05,0.16*size*(1.2-i*0.25),0.22*size,1,1,1,0.85,0.55,0,0,true);}
  this._add(pos[0],pos[1],pos[2],dir[0]*1.5+(R()-0.5)*0.3,dir[1]*1.5+0.3,dir[2]*1.5+(R()-0.5)*0.3,0.6+R()*0.4,0.12*size,0.6*size,0.18,0,0.75,0.73,0.7,-0.3,2.5,false);
  this.light(pos,6*size,[2.4,1.6,0.7],0.06);},
 tracer(a,b){const l=V3.dist(a,b);if(l<3)return;this.T.push({a:a.slice(),d:V3.scale(V3.sub(b,a),1/l),l,t:0});},
 // polvo, astillas o chispas según la superficie y agujero de bala; n = cantidad (1 normal)
 impact(pos,nrm,surf,n){n=n||1;const R=Math.random,nn=nrm||[0,1,0];
  const C={dirt:[0.5,0.42,0.32],grass:[0.45,0.42,0.3],sand:[0.78,0.7,0.52],snow:[0.92,0.94,0.97],wood:[0.62,0.5,0.34],metal:[0.5,0.5,0.5],stone:[0.66,0.63,0.58],water:[0.75,0.82,0.86],flesh:[0.45,0.05,0.04]}[surf]||[0.55,0.5,0.42];
  const cnt=Math.round((surf==='water'?7:4)*n);for(let i=0;i<cnt;i++){const s=0.6+R()*1.8;this._add(pos[0],pos[1],pos[2],nn[0]*s+(R()-0.5)*1.2,nn[1]*s+R()*1.4,nn[2]*s+(R()-0.5)*1.2,0.5+R()*0.6,0.12,0.45+0.25*n,0.5,surf==='water'?0:0,C[0],C[1],C[2],surf==='water'?6:1.5,2.2,false);}
  for(let i=0;i<Math.round(3*n);i++){const s=2+R()*4;this._add(pos[0],pos[1],pos[2],nn[0]*s+(R()-0.5)*3,nn[1]*s+R()*2,nn[2]*s+(R()-0.5)*3,0.5+R()*0.4,0.035,0.03,1,surf==='metal'||surf==='stone'?2:3,surf==='metal'?1:C[0]*0.8,surf==='metal'?0.8:C[1]*0.8,surf==='metal'?0.5:C[2]*0.8,9.8,0.3,surf==='metal');}
  const D=this._decals();if(!D||surf==='water'||surf==='flesh')return;const ground=surf==='dirt'||surf==='grass'||surf==='sand'||surf==='snow';
  D.addQuad(pos,nn,ground?0.16:0.065,R()*6,surf==='snow'?7:ground?6:surf==='wood'?2:1,ground?null:null,ground?0.7:1);},
 blood(pos,dir){if(typeof Settings!=='undefined'&&Settings.blood===false)return;const R=Math.random;
  for(let i=0;i<4;i++)this._add(pos[0],pos[1],pos[2],dir[0]*1.5+(R()-0.5),dir[1]*1.5+R()*0.5,dir[2]*1.5+(R()-0.5),0.35+R()*0.3,0.08,0.35,0.55,0,0.42,0.05,0.04,2,3,false);},
 // explosión de radio r: bola de fuego, humo, tierra, luz, marca, temblor y aturdimiento si está cerca
 explosion(pos,r){r=r||6;const R=Math.random,k=r/6,water=World.water&&pos[1]<World.water.y+0.3&&World.height(pos[0],pos[2])<World.water.y;
  for(let i=0;i<10;i++){const a=R()*6.28,s=R()*4*k;this._add(pos[0],pos[1]+0.3,pos[2],Math.cos(a)*s,1+R()*4*k,Math.sin(a)*s,0.35+R()*0.25,0.8*k,2.4*k,1,1,1,0.75,0.4,-1,3,true);}
  for(let i=0;i<14;i++){const a=R()*6.28,s=R()*2.5*k,g=water?0.85:0.22+R()*0.15;this._add(pos[0]+(R()-0.5)*k,pos[1]+0.5,pos[2]+(R()-0.5)*k,Math.cos(a)*s,1.5+R()*3*k,Math.sin(a)*s,2.5+R()*2.5,1.2*k,5*k,water?0.6:0.75,0,g,g*0.97,g*0.93,-0.15,0.9,false);}
  for(let i=0;i<16;i++){const a=R()*6.28,s=3+R()*7*k;this._add(pos[0],pos[1]+0.2,pos[2],Math.cos(a)*s*0.6,4+R()*9*k,Math.sin(a)*s*0.6,1.2+R(),0.12+R()*0.15,0.1,1,water?0:3,water?0.8:0.3,water?0.85:0.25,water?0.9:0.2,12,0.2,false);}
  this.light([pos[0],pos[1]+1.2,pos[2]],14*k,[3.2,2.0,0.8],0.35);
  const D=this._decals();if(D&&!water)D.addGround(pos[0],pos[2],r*0.45,R()*6,3,null,0.9,(x,z)=>World.height(x,z));
  const e=Player.eye(),d=V3.dist(e,pos);this.shake(clamp(1.2-d/(r*4),0,1));if(d<r*2.5)Post.fx.blast=Math.max(Post.fx.blast,clamp(1.2-d/(r*2.2),0,1));Env.flash=Math.max(Env.flash,clamp(0.5-d/80,0,0.4));},
 // humo: {puff:true} una bocanada; si no, columna persistente {rate, size, life, col, dur}
 smoke(pos,opts){opts=opts||{};if(opts.puff){const s=opts.size||0.5;this._add(pos[0],pos[1],pos[2],(Math.random()-0.5)*0.3,0.3,(Math.random()-0.5)*0.3,opts.life||1.5,s,s*3,0.4,0,0.7,0.7,0.68,-0.1,1,false);return null;}
  const e={kind:'smoke',pos:pos.slice(),rate:opts.rate||6,size:opts.size||1.5,life:opts.life||6,col:hex(opts.col||[0.3,0.29,0.28]),dur:opts.dur||1e9,acc:0,t:0};this.E.push(e);return e;},
 fire(pos,size){const e={kind:'fire',pos:pos.slice(),rate:10*(size||1),size:size||1,life:0.8,dur:1e9,acc:0,t:0,lt:{pos:[pos[0],pos[1]+0.8*(size||1),pos[2]],r:7*(size||1),col:[2.2,1.2,0.4]}};this.E.push(e);return e;},
 stop(e){const i=this.E.indexOf(e);if(i>=0)this.E.splice(i,1);},
 shell(pos,vel){this._add(pos[0],pos[1],pos[2],vel[0],vel[1],vel[2],0.8,0.025,0.025,1,3,0.85,0.65,0.3,9.8,0.1,false);},
 shake(a){this.trauma=Math.min(1,this.trauma+a);},
 // desfase de cámara [rumbo, cabeceo, alabeo] por el temblor
 shakeOff(){const k=this.trauma*this.trauma,t=this.t,o=this._sh;o[0]=k*0.035*Math.sin(t*37.1)*Math.sin(t*5.3+1);o[1]=k*0.03*Math.sin(t*41.7+2);o[2]=k*0.05*Math.sin(t*29.3+4);return o;},
 weather(env){this.env=env||null;},
 update(dt){this.t+=dt;this.trauma=Math.max(0,this.trauma-dt*1.4);Post.fx.blast=Math.max(0,Post.fx.blast-dt*0.9);Env.flash=Math.max(0,Env.flash-dt*2.5);
  const P=this.P;let n=this.n;for(let i=0;i<n;i++){const o=i*FXS;P[o+6]+=dt;if(P[o+6]>=P[o+7]){n--;if(i<n){P.copyWithin(o,n*FXS,n*FXS+FXS);i--;}continue;}
   const dr=Math.max(0,1-P[o+18]*dt);P[o+3]*=dr;P[o+5]*=dr;P[o+4]=P[o+4]*dr-P[o+17]*dt;P[o]+=P[o+3]*dt;P[o+1]+=P[o+4]*dt;P[o+2]+=P[o+5]*dt;P[o+11]+=P[o+12]*dt;
   if(P[o+17]>3&&P[o+4]<0){const g=World.height(P[o],P[o+2]);if(P[o+1]<g){P[o+1]=g;P[o+3]*=0.3;P[o+5]*=0.3;P[o+4]*=-0.2;}}}this.n=n;
  for(let i=this.L.length-1;i>=0;i--){const l=this.L[i];l.t+=dt;if(l.t>=l.life)this.L.splice(i,1);}
  for(let i=this.T.length-1;i>=0;i--){const q=this.T[i];q.t+=dt;if(q.t*380>q.l+4)this.T.splice(i,1);}
  for(let i=this.E.length-1;i>=0;i--){const e=this.E[i],R=Math.random;e.t+=dt;if(e.t>e.dur){this.E.splice(i,1);continue;}e.acc+=dt*e.rate;
   while(e.acc>=1){e.acc--;if(e.kind==='fire'){const s=e.size;this._add(e.pos[0]+(R()-0.5)*0.6*s,e.pos[1]+0.1,e.pos[2]+(R()-0.5)*0.6*s,(R()-0.5)*0.3,1.2*s+R()*s,(R()-0.5)*0.3,0.5+R()*0.4,0.5*s,0.15*s,0.9,1,1,0.8,0.5,-0.5,0.5,true);
     if(R()<0.4)this._add(e.pos[0],e.pos[1]+1.2*s,e.pos[2],(R()-0.5)*0.4,1.4,(R()-0.5)*0.4,3,0.6*s,2.5*s,0.35,0,0.2,0.19,0.18,-0.2,0.3,false);}
    else{const s=e.size;this._add(e.pos[0]+(R()-0.5)*s,e.pos[1],e.pos[2]+(R()-0.5)*s,(R()-0.5)*0.4+(Env.wind||1)*0.4,1+R()*0.6,(R()-0.5)*0.4,e.life*(0.7+R()*0.6),s,s*4,0.45,0,e.col[0],e.col[1],e.col[2],-0.05,0.15,false);}}}
  // nieve alrededor de la cámara
  if(this.env&&this.env.snow&&GL.gl){const c=Cam.eye;for(let i=0;i<Math.round(this.env.snow*60*dt+Math.random()*0.5);i++)this._add(c[0]+(Math.random()-0.5)*36,c[1]+6+Math.random()*4,c[2]+(Math.random()-0.5)*36,0.4*(Env.wind||1),-1.3,0.2,7,0.05,0.05,0.85,2,0.9,0.92,0.95,0,0,false);}},
 // luces puntuales activas -> [{pos, r, col}] para GL.setLights
 lights(){const o=this._lo;o.length=0;for(const l of this.L){const k=1-l.t/l.life;l.c[0]=l.col[0]*k;l.c[1]=l.col[1]*k;l.c[2]=l.col[2]*k;o.push({pos:l.pos,r:l.r,col:l.c});}
  for(const e of this.E)if(e.lt){const f=0.8+0.2*Math.sin(this.t*21+e.pos[0])*Math.sin(this.t*7.7);o.push({pos:e.lt.pos,r:e.lt.r,col:[e.lt.col[0]*f,e.lt.col[1]*f,e.lt.col[2]*f]});}return o;},
 drawOpaque(){},
 // marcas y partículas (transparentes, tras Post.grabDepth)
 draw(){if(!GL.gl)return;if(this.dec)this.dec.draw();const P=this.P,A=this._da,B=this._db,e=Cam.eye,idx=this._idx,key=this._key;let na=0,nb=0;idx.length=0;
  for(let i=0;i<this.n;i++){const o=i*FXS,u=P[o+6]/P[o+7],fade=Math.min(1,u*8)*(1-u*u);const s=P[o+8]+(P[o+9]-P[o+8])*u,al=P[o+10]*fade;
   if(P[o+19]>0.5){const q=nb++*10;B[q]=P[o];B[q+1]=P[o+1];B[q+2]=P[o+2];B[q+3]=s;B[q+4]=al;B[q+5]=P[o+11];B[q+6]=P[o+13];B[q+7]=P[o+14];B[q+8]=P[o+15];B[q+9]=P[o+16];}
   else{key[i]=(P[o]-e[0])**2+(P[o+1]-e[1])**2+(P[o+2]-e[2])**2;idx.push(i);}}
  // trazadoras: un hilo de chispas que avanza
  for(const q of this.T){const h=q.t*380;for(let k=0;k<6;k++){const d=h-k*0.6;if(d<0||d>q.l||nb>=1590)continue;const o=nb++*10,p=V3.madd(q.a,q.d,d);B[o]=p[0];B[o+1]=p[1];B[o+2]=p[2];B[o+3]=0.07-k*0.008;B[o+4]=1-k*0.13;B[o+5]=0;B[o+6]=2;B[o+7]=1.6;B[o+8]=1.1;B[o+9]=0.5;}}
  idx.sort((a,b)=>key[b]-key[a]);for(const i of idx){const o=i*FXS,u=P[o+6]/P[o+7],fade=Math.min(1,u*8)*(1-u*u),q=na++*10;
   A[q]=P[o];A[q+1]=P[o+1];A[q+2]=P[o+2];A[q+3]=P[o+8]+(P[o+9]-P[o+8])*u;A[q+4]=P[o+10]*fade;A[q+5]=P[o+11];A[q+6]=P[o+13];A[q+7]=P[o+14];A[q+8]=P[o+15];A[q+9]=P[o+16];}
  GL.drawParticles(A,na,false);GL.drawParticles(B,nb,true);}
};
Bus.on('glRestored',()=>{FX.dec=null;});
