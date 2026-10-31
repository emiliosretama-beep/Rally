// Cuerdas fijas del Gigante Blanco: cada ladera empinada desde abajo, con varios niveles de frío. Uso: node tests/cuerdas.js
// Simulación honesta: sin rellenar resistencia. Cada cuerda empinada, desde abajo, con varios niveles de frío.
require('./load')();
const w=new World('k2');
for (const L of w.lines) {
  if (!L.steep) { console.log('line',L.id,'flat len',L.len.toFixed(1)); continue; }
  const steepLen=L.dTop-L.dBot, rise=w.alongPts(L.pts,L.dTop,{}).y-w.alongPts(L.pts,L.dBot,{}).y;
  const res=[];
  for (const cold of [0,0.5,1]) {
    const p=new Player(w); const a=w.alongPts(L.pts,Math.max(0,L.dBot-3),{}), b=w.alongPts(L.pts,Math.max(0,L.dBot-2),{});
    const yaw=Math.atan2(b.x-a.x,b.z-a.z);
    p.reset(a.x,w.groundBelow(a.x,a.y+1,a.z),a.z,yaw); p.cold=cold; p.stamina=1-0.3*cold;
    const env={cold}; const ev={}; let t=0, maxD=0, topReached=false;
    for(;t<90;t+=1/60){w.update(1/60);p.step(1/60,{mx:0,my:1,grab:true},yaw,env);for(const e of p.events)ev[e.type]=(ev[e.type]||0)+1;p.events.length=0;
      if(p.line===L) maxD=Math.max(maxD,p.lineD);
      if(p.state!=='jumar'&&p.grounded&&p.line===L&&p.lineD>=L.dTop-0.3){topReached=true;break;}
      if(p.line&&p.line!==L&&p.line.idx>L.idx){topReached=true;break;}}
    res.push('cold '+cold+': '+(topReached?'TOP in '+t.toFixed(0)+'s':'STUCK at '+(maxD-L.dBot).toFixed(1)+'/'+steepLen.toFixed(1)+'m')+' sta '+p.stamina.toFixed(2)+' '+JSON.stringify(ev));
  }
  console.log('line',L.id,'gi',L.gi,'steep',steepLen.toFixed(1)+'m rise',rise.toFixed(1)+'m\n   '+res.join('\n   '));
}
