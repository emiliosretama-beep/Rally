// Bot honesto: juega cada desafío sin rellenar la resistencia. Uso: node tests/bot.js <volcano|k2> [desafío|-] [v] [frío 0-1] [resistencia inicial]
require('./load')();
const mid=process.argv[2]||'k2';
const w=new World(mid);const C=w.challenges;
const only=process.argv[3]!==undefined&&process.argv[3]!=='-'?+process.argv[3]:-1;
const verbose=process.argv[4]==='v';const COLD=+(process.argv[5]||0),STA0=+(process.argv[6]||1);let restT=0;
const results=[];
for(let ci=0;ci<C.length;ci++){
  if(only>=0&&ci!==only)continue;
  const c=C[ci];
  let tgt=C[ci+1]&&C[ci+1].tramo===c.tramo?C[ci+1]:w.checkpoints[c.tramo+1];
  const H={x:c.fx,z:c.fz},L={x:c.fz,z:-c.fx},W=c.W;
  const p=new Player(w);const yaw0=Math.atan2(c.fx,c.fz);
  p.reset(c.x-c.fx*1.2,w.groundBelow(c.x-c.fx*1.2,c.y+1,c.z-c.fz*1.2),c.z-c.fz*1.2,yaw0);p.stamina=Math.min(STA0,1-0.2*COLD);p.cold=COLD;let minSta=1,rests=0,resting=false;
  const prog=()=>(p.pos.x-c.x)*H.x+(p.pos.z-c.z)*H.z;
  const lat=()=>(p.pos.x-c.x)*L.x+(p.pos.z-c.z)*L.z;
  let desired=0;
  if(c.t==='step'){desired=c.fall==='L'?-(W/2+0.1):c.fall==='R'?W/2:c.fall==='N'?0:W/2+0.4;}
  if(c.t==='traverse'||c.t==='seracTraverse')desired=(c.side==='L'?1:-1)*(W-0.6);
  if(c.t==='ledge')desired=(c.side==='L'?1:-1)*(W-0.62);
  if(c.t==='slope')desired=0.6;
  const dt=1/60;let ok=false,t=0,ev={},stuck=0,lastY=p.pos.y,used=false,log=[],maxT=0;
  for(let i=0;i<60*120;i++){
    t+=dt;w.update(dt);
    let mx=0,my=1,grab=true,sprint=false,jump=false;
    let des=desired;
    if(c.t==='boulders'||c.t==='columns'){const bs=w.blocks.filter(b=>(b.kind==='boulder'||b.kind==='basalt')&&b.tramo===c.tramo);let best=null,bd=1e9;
      for(const b of bs){const f=(b.cx-c.x)*H.x+(b.cz-c.z)*H.z;const l=(b.cx-c.x)*L.x+(b.cz-c.z)*L.z;if(Math.abs(l)>1.5)continue;if(f>prog()+0.6&&f<bd){bd=f;best=l;}}des=best===null?0:best;}
    if(c.t==='step'&&(c.nm==='c_crack'||c.nm==='c_k_chimney')){const st=w.strips.filter(s=>s.kind==='step').sort((a,b)=>{const pa=a.pts[3],pb=b.pts[3];return Math.hypot(pa.x-c.x,pa.z-c.z)-Math.hypot(pb.x-c.x,pb.z-c.z)})[0];
      const cy=p.pos.y+1;let zz=st.zones.find(z=>cy+0.6>=z.y0&&cy+0.6<=z.y1)||st.zones[0];const half=st.half;des=half-(zz.u0+zz.u1)/2;}
    let heading;const pr=prog();
    if(p.grounded&&Math.abs(p.pos.y-tgt.y)<0.8&&Math.hypot(p.pos.x-tgt.x,p.pos.z-tgt.z)<20) heading=Math.atan2(tgt.x-p.pos.x,tgt.z-p.pos.z);
    else {const ax=c.x+H.x*(pr+2.5)+L.x*des,az=c.z+H.z*(pr+2.5)+L.z*des;heading=Math.atan2(ax-p.pos.x,az-p.pos.z);}
    if(p.state==='jumar'){ // hacia arriba por la cuerda
      const a=w.alongPts(p.line.pts,p.lineD,{}),b=w.alongPts(p.line.pts,Math.min(p.line.len,p.lineD+1),{});heading=Math.atan2(b.x-a.x,b.z-a.z);mx=0;my=1;}
    if(p.state==='climb'){
      if(c.t==='traverse'||c.t==='seracTraverse'){my=0;const sp=w.stripPoint(p.cs,p.cu+0.5,{});const f2=(sp.x-c.x)*H.x+(sp.z-c.z)*H.z;const sp0=w.stripPoint(p.cs,p.cu,{});const f1=(sp0.x-c.x)*H.x+(sp0.z-c.z)*H.z;
        mx=(f2>f1?1:-1)*p.dirU; if(pr>c.len+1.2){mx=0;my=-1;}}
      else {const l=lat();if(Math.abs(l-des)>0.4){const sp=w.stripPoint(p.cs,p.cu+0.5,{});const l2=(sp.x-c.x)*L.x+(sp.z-c.z)*L.z;const sp0=w.stripPoint(p.cs,p.cu,{});const l1=(sp0.x-c.x)*L.x+(sp0.z-c.z)*L.z;mx=((l2>l1)===(des>l)?1:-1)*p.dirU;}}
      if(p.pos.y<=lastY+0.0005&&my>0)stuck+=dt;else stuck=0;
      if(stuck>0.4&&p.stamina>0.3){jump=true;stuck=0;}
    }
    lastY=p.pos.y;
    // columnas: si la roca de enfrente está más alta, saltar a ella
    if(c.t==='columns'&&p.grounded&&p.state==='air'){const hi=d=>w.groundBelow(p.pos.x+Math.sin(heading)*d,p.pos.y+1.6,p.pos.z+Math.cos(heading)*d)>p.pos.y+0.35;if(hi(0.55)||hi(0.85))jump=true;}
    if(p.grounded&&p.state==='air'&&c.t!=='slope'){const low=d=>w.groundBelow(p.pos.x+Math.sin(heading)*d,p.pos.y+0.3,p.pos.z+Math.cos(heading)*d)<p.pos.y-1.0;if(low(0.5)&&low(0.7)&&!p.onLadder)jump=true;}
    if(c.t==='hookGap'&&!used&&p.grounded&&pr>-0.5){const r=w.rings.find(r=>Math.hypot(r.x-p.pos.x,r.z-p.pos.z)<14);if(r){p.startZip(r);used=true;}}
    if(c.t==='zipline'&&!used&&p.grounded){const z=w.zips.find(q=>Math.hypot(q.a.x-p.pos.x,q.a.z-p.pos.z)<2.4);if(z){p.startRide(z);used=true;}}
    // jugador real: cansado escalando junto a un gancho de pared, descansa
    if(p.state==='climb'&&p.anchor&&p.anchor.wall){const ch=p.chest();const dA=Math.hypot(p.anchor.x-ch.x,p.anchor.y-ch.y,p.anchor.z-ch.z);if(!resting&&p.stamina<0.3&&dA<1.8){resting=true;rests++;}}
    if(resting){if(p.stamina>Math.min(0.85,1-0.2*COLD-0.03)||p.state!=='climb')resting=false;else{mx=0;my=0;jump=false;}}
    p.step(dt,{mx,my,jump,grab,sprint},heading,{cold:COLD});minSta=Math.min(minSta,p.stamina);
    for(const e of p.events){ev[e.type]=(ev[e.type]||0)+1;if(verbose)log.push(t.toFixed(2)+' '+e.type);}p.events.length=0;
    if(p.grounded&&p.anchor&&p.state==='air'){const pit=w.pitAt(p.pos.x,p.pos.z);if(pit&&p.pos.y<pit.y+1.6)p.startAscend();}
    if(verbose&&i%30===0)log.push(t.toFixed(1)+' st='+p.state+' pr='+pr.toFixed(1)+' lat='+lat().toFixed(1)+' y='+(p.pos.y-c.y).toFixed(2)+' g='+p.grounded+' steep='+p.steep+(p.line?' line='+p.line.id+' d='+p.lineD.toFixed(1):'')+(p.cs?' u='+p.cu.toFixed(1):''));
    if(Math.hypot(p.pos.x-tgt.x,p.pos.z-tgt.z)<3.5&&Math.abs(p.pos.y-tgt.y)<1.0){ok=true;break;}
  }
  const evs=Object.entries(ev).filter(([k])=>['catch','ascend','ledgeGrab','jumarOn','ropeGrab','arrest','lunge','release'].includes(k)).map(([k,v])=>k+'='+v).join(' ')+' minSta='+minSta.toFixed(2)+' rests='+rests;
  results.push(`${ci} ${c.nm.padEnd(16)} ${c.t.padEnd(13)} ${ok?'OK  ':'FAIL'} t=${t.toFixed(1)}s ${evs} y=${(p.pos.y).toFixed(1)}/${tgt.y.toFixed(1)} st=${p.state} pr=${prog().toFixed(1)} lat=${lat().toFixed(1)} d=${Math.hypot(p.pos.x-tgt.x,p.pos.z-tgt.z).toFixed(1)}`);
  if(verbose)console.log(log.join('\n'));
}
console.log(results.join('\n'));
