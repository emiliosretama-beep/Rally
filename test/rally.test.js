// Pruebas automáticas de Born to Rally con el piloto automático del propio juego.
// Uso:  node test/rally.test.js            (desde la carpeta del juego; necesita Playwright y Chromium)
// Bloquea Supabase: ningún tiempo de prueba llega a la clasificación real.
const {chromium}=require('playwright');
const path=require('path');
const URL='file://'+path.resolve(__dirname,'..','index.html');
const OUT=process.env.SHOTS||path.resolve(__dirname,'shots');
let fails=0;const ok=(c,msg)=>{console.log((c?'  OK   ':'  FALLA ')+msg);if(!c)fails++;};

(async()=>{
  require('fs').mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:844,height:390},deviceScaleFactor:2,hasTouch:true,isMobile:true});
  const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/supabase|ERR_FAILED|Failed to load resource/i.test(m.text()))errs.push(m.text());});
  await p.route(/supabase/,r=>r.abort());
  await p.goto(URL);await p.waitForFunction(()=>typeof S!=='undefined'&&S.mode==='menu'&&!!S.W,null,{timeout:30000});
  await p.waitForTimeout(800);

  console.log('1. Arranque');
  ok(errs.length===0,'sin errores de consola al arrancar '+(errs.length?JSON.stringify(errs):''));

  console.log('2. Medallas por coche');
  const meds=await p.evaluate(()=>{const o=[];const keep=settings.car;
    for(let i=0;i<STAGES.length;i++){const r={st:STAGES[i].id};for(let k=0;k<CARS.length;k++){settings.car=k;r[CARS[k].id]=medalsFor(i).gold;}o.push(r);}
    settings.car=keep;return o;});
  for(const m of meds)ok(m.r1<m.r2&&m.r2<m.lino,`${m.st}: oro Rally 1 ${m.r1}s < Rally 2 ${m.r2}s < Lino ${m.lino}s`);

  console.log('3. Carreras completas con el piloto automático (juego real, sin dibujar)');
  // cada pasada: cuenta atrás, tramo, meta lanzada y tarjeta de meta, con daños y todo
  const races=await p.evaluate(()=>{const res=[];const keep=settings.car;
    playerInput=function(){return botInput(S.car,S.st,S.trk,1.4);};
    for(let k=0;k<CARS.length;k++)for(let i=0;i<STAGES.length;i++){settings.car=k;settings.stage=i;startRace();
      let n=0;while(S.mode!=='finish'&&n<120*400){tick(FIX);n++;}
      let m=0;while(!S.finShown&&m<120*20){tick(FIX);m++;}
      const meds=medalsFor(i);res.push({car:CARS[k].id,st:STAGES[i].id,done:S.mode==='finish',card:!$('finish').hidden,t:+(S.finishTotal||0).toFixed(2),bronze:meds.bronze,
        worlds:Object.values(cache).filter(c=>c.W).length});}
    settings.car=keep;toMenu('title');return res;});
  for(const r of races)ok(r.done&&r.card&&r.t<=r.bronze,`${r.car} en ${r.st}: meta en ${r.t}s (bronce ${r.bronze}s), tarjeta ${r.card?'sí':'no'}`);
  ok(races.every(r=>r.worlds===1),'sólo un mundo de tramo en la GPU a la vez ('+[...new Set(races.map(r=>r.worlds))].join(',')+')');
  ok(errs.length===0,'sin errores de consola en las carreras '+(errs.length?JSON.stringify(errs.slice(0,3)):''));

  console.log('4. Una carrera dibujada (captura)');
  await p.evaluate(()=>{settings.car=1;settings.stage=0;startRace();});
  // el navegador de pruebas no tiene GPU y va lento: se espera a que la cuenta atrás termine y el crono avance
  const ran=await p.waitForFunction(()=>S.mode==='run'&&S.t>1,null,{timeout:60000}).then(()=>true,()=>false);
  await p.screenshot({path:path.join(OUT,'carrera.png')});
  ok(ran,'la carrera dibujada arranca y el crono avanza');

  console.log('5. Clasificación: temporada 2 (sin tocar el servidor real: la respuesta es falsa)');
  const sent=[];
  await p.route(/rest\/v1\/rpc\/rally_(submit|top)/,r=>{const body=JSON.parse(r.request().postData()||'{}');sent.push(body);
    r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(/submit/.test(r.request().url())?{rank:1,total:1,best_ms:body.p_time_ms,improved:true,name:'Test'}:{top:[],me:null,total:0})});});
  await p.evaluate(()=>{settings.car=1;settings.stage=0;playerInput=function(){return botInput(S.car,S.st,S.trk,1.4);};startRace();
    let n=0;while(S.mode!=='finish'&&n<120*400){tick(FIX);n++;}});
  await p.waitForTimeout(1500);
  const sub=sent.find(b=>b.p_time_ms);
  ok(!!sub&&sub.p_board==='s2:bosque','al terminar el tramo envía el tiempo al tablero "s2:bosque" '+(sub?`(${sub.p_board}, ${sub.p_cp.length} puntos de control)`:'(no se envió nada)'));
  ok(!!sub&&sub.p_cp.length>=47&&sub.p_cp.length<=49,'manda los 48 puntos de control que espera el servidor');
  // Rally completo: los 5 tramos originales seguidos (pulsando "Siguiente" en cada meta) y el total a 's2:rally'
  sent.length=0;
  const rally=await p.evaluate(()=>{settings.car=1;startRally();const done=[];
    for(let k=0;k<RALLY.length;k++){let n=0;while(S.mode!=='finish'&&n<120*400){tick(FIX);n++;}done.push(STAGES[S.si].id);if(k<RALLY.length-1)$('nextBtn').click();}
    return {done,title:$('finTitle').textContent,time:$('finTime').textContent};});
  await p.waitForTimeout(1500);
  const rs=sent.find(b=>b.p_board==='s2:rally');
  ok(rally.done.join(',')==='bosque,nieve,asfalto,desierto,colinas','el Rally completo corre los 5 tramos originales en orden ('+rally.done.join(', ')+')');
  ok(!!rs&&rs.p_cp.length===5&&Math.abs(rs.p_cp.reduce((a,b)=>a+b,0)-rs.p_time_ms)<=10,'envía el total a "s2:rally" con los 5 tiempos que suman el total '+(rs?`(${rally.time})`:'(no se envió)'));
  await p.unroute(/rest\/v1\/rpc\/rally_(submit|top)/);
  await p.evaluate(()=>toMenu('title'));

  console.log('6. Montecarlo: placas de hielo');
  const mc=await p.evaluate(()=>{const si=STAGES.findIndex(q=>q.id==='montecarlo'),keep=[settings.season,settings.night,settings.car];
    settings.season='invierno';settings.night=false;settings.car=1;const trk=getStage(si).trk,ice=trk.notes.filter(n=>n.ice||n.iceOnly);
    // el coche puesto sobre la primera placa: pisa hielo y agarra la mitad
    startRace(si);const i0=Math.round(1015/PX2M/SP);S.car=init3D(newCar(S.trk,i0));S.mode='run';S.cd=0;playerInput=function(){return {steer:0,gas:1,brake:0,hand:0};};tick(FIX);
    const on=S.car.onIce;const i1=Math.round(1200/PX2M/SP);S.car=init3D(newCar(S.trk,i1));tick(FIX);const off=S.car.onIce;
    [settings.season,settings.night,settings.car]=keep;toMenu('title');
    return {n:ice.length,txt:ice.map(n=>n.iceOnly?'¡Hielo!':(n.hair?'horquilla':n.sev)).join(', '),max:Math.max(...trk.ice),on,off,km:(trk.finishD-trk.startD)*PX2M/1000,
      snow:trk.notes.filter(n=>n.snow||n.snowOnly).length,wet:Math.max(...trk.wet)};});
  ok(mc.n===5&&mc.max===1,`el copiloto avisa las 5 placas de hielo (${mc.txt})`);
  ok(mc.on&&!mc.off,'sobre la placa el coche pisa hielo y fuera de ella no');
  ok(mc.snow===4&&mc.wet>0.5,`además hay nieve en la carretera (${mc.snow} avisos del copiloto) y tramos de asfalto mojado, como en Dirt Rally 2.0`);
  ok(mc.km>2&&mc.km<2.2,'Montecarlo mide '+mc.km.toFixed(2)+' km');

  console.log('6b. Suecia: bancos de nieve, saltos y lago helado');
  const se=await p.evaluate(()=>{const si=STAGES.findIndex(q=>q.id==='suecia'),keep=[settings.season,settings.night,settings.car];settings.season='invierno';settings.night=false;settings.car=1;
    const c=getStage(si),trk=c.trk,d=c.decor,N=trk.Nd||trk.N;let bank=0;for(let i=0;i<N;i++)for(const sd of [0,1])if(d.kind[i*2+sd]===7)bank++;
    // el coche contra el banco de nieve, a 100 km/h con 20° de ángulo: se apoya, no rebota ni cuenta como golpe
    startRace(si);const i0=Math.round(380/PX2M/SP),a=trk.as[i0];S.car=init3D(newCar(S.trk,i0));S.mode='run';S.cd=0;S.hits=0;
    const v=100/PX2KMH,h=a+0.35;S.car.vx=Math.cos(h)*v;S.car.vy=Math.sin(h)*v;S.car.a=h;playerInput=function(){return {steer:0,gas:0.5,brake:0,hand:0};};
    let mx=0;for(let q=0;q<120;q++){tick(FIX);const lat=(S.car.x-trk.xs[S.car.ti])*-Math.sin(trk.as[S.car.ti])+(S.car.y-trk.ys[S.car.ti])*Math.cos(trk.as[S.car.ti]);mx=Math.max(mx,Math.abs(lat));}
    const kmh=Math.hypot(S.car.vx,S.car.vy)*PX2KMH,hits=S.hits;[settings.season,settings.night,settings.car]=keep;toMenu('title');
    return {roadM:STAGES[si].roadW*PX2M,bankP:bank/(2*N),jumps:trk.notes.filter(n=>n.jump).length,lake:!!getStage(si).trk._H.LK,kmh,hits,inside:mx<=d.bar[i0*2+1]/K+1};});
  ok(se.roadM<=6,`carretera angosta (${se.roadM.toFixed(1)} m)`);
  ok(se.bankP>0.95,`bancos de nieve a los dos lados en casi todo el tramo (${Math.round(se.bankP*100)} %)`);
  ok(se.hits===0&&se.kmh>70&&se.inside,`apoyarse en el banco a 100 km/h no es un golpe y el coche sigue a ${Math.round(se.kmh)} km/h`);
  ok(se.jumps===2&&se.lake,'el copiloto canta los 2 saltos y hay un lago helado');

  console.log('6c. Portugal: grava suelta, salto grande, molinos y público');
  const pt=await p.evaluate(()=>{const si=STAGES.findIndex(q=>q.id==='portugal'),keep=[settings.season,settings.night,settings.car];settings.season='primavera';settings.night=false;settings.car=1;
    const c=getStage(si),trk=c.trk,d=c.decor,N=trk.Nd||trk.N;let armco=0;for(let i=0;i<N;i++)for(const sd of [0,1])if(d.kind[i*2+sd]===1)armco++;
    const jump=trk.notes.find(n=>n.jump&&n.big),js=Math.round(1000/PX2M/SP);
    const fansJ=d.fans.filter(f=>{const dx=f.x-trk.xs[js],dy=f.y-trk.ys[js];return Math.hypot(dx,dy)*PX2M<60;}).length;
    // la trazada limpia en el centro y la grava suelta junto al borde
    startRace(si);const i0=Math.round(860/PX2M/SP);playerInput=function(){return {steer:0,gas:1,brake:0,hand:0};};
    S.car=init3D(newCar(S.trk,i0));S.mode='run';S.cd=0;tick(FIX);const mid=S.car.onLoose;
    const a=trk.as[i0],e=S.st.roadW/2*0.9;S.car=init3D(newCar(S.trk,i0));S.car.x-=Math.sin(a)*e;S.car.y+=Math.cos(a)*e;tick(FIX);const edge=S.car.onLoose;
    // el salto grande: el piloto automático vuela más de 0,8 s y aterriza sin golpe
    settings.car=1;startRace(si);playerInput=function(){return botInput(S.car,S.st,S.trk,1.4);};let n=0,air=0,cur=0;
    while(S.mode!=='finish'&&n<120*400){tick(FIX);n++;if(S.mode==='run'&&S.car.air){cur+=FIX;air=Math.max(air,cur);}else cur=0;}
    const hits=S.hits,W=S.W;[settings.season,settings.night,settings.car]=keep;toMenu('title');
    return {km:(trk.finishD-trk.startD)*PX2M/1000,jump:!!jump&&noteText(jump),turb:(d.turbines||[]).length,rot:!!W.rotors&&W.rotors.list.length,armco,fansJ,mid,edge,air,hits,
      champ:CHAMP.find(C=>C.c==='pt').id};});
  ok(pt.champ==='portugal'&&pt.km>1.9&&pt.km<2.2,`Portugal en el campeonato: Serra das Fragas, ${pt.km.toFixed(2)} km`);
  ok(!pt.mid&&pt.edge,'en la trazada del centro no hay grava suelta; junto al borde, sí (agarra menos)');
  ok(/^(¡Salto grande!|Big jump!)$/.test(pt.jump||'')&&pt.air>0.8&&pt.hits===0,`el copiloto avisa "${pt.jump}" y el coche vuela ${pt.air.toFixed(2)} s sin golpearse`);
  ok(pt.turb>=3&&pt.rot===pt.turb,`molinos de viento en la sierra (${pt.turb}), con las palas girando`);
  ok(pt.fansJ>=40&&pt.armco===0,`la ladera del salto llena de público (${pt.fansJ}) y sin biondas en la grava`);

  console.log('6d. Finlandia: grava rápida, saltos, un lago de verdad, granja y pacas');
  const fi=await p.evaluate(()=>{const si=STAGES.findIndex(q=>q.id==='finlandia'),keep=[settings.season,settings.night,settings.car];settings.season='verano';settings.night=false;settings.car=1;
    const c=getStage(si),trk=c.trk,d=c.decor,H=trk._H;
    // ningún punto de la carretera dentro del lago (la carretera va por la orilla, por encima del agua)
    let under=0;for(let i=0;i<trk.N;i+=2){const x=trk.xs[i]*K,z=trk.ys[i]*K;if(H.LW(x,z)>0.05&&H.hr[i]<H.waterH+1)under++;}
    // el coche que acaba en el lago: chapuzón y vuelta a la carretera con +5 s
    startRace(si);const i0=Math.round(700/PX2M/SP),a=trk.as[i0],e=30/K;S.car=init3D(newCar(S.trk,i0));S.car.x+=Math.sin(a)*e;S.car.y-=Math.cos(a)*e;S.car.h=H(S.car.x*K,S.car.y*K);
    S.mode='run';S.cd=0;S.pen=0;S.resets=0;playerInput=function(){return {steer:0,gas:0,brake:0,hand:0};};const inLake=H.LW(S.car.x*K,S.car.y*K);tick(FIX);
    const reset={resets:S.resets,pen:S.pen,onRoad:S.car.td<S.st.roadW/2};const W=S.W;
    // el piloto automático, a fondo: media de velocidad (km/h) y tiempo en el aire
    startRace(si);playerInput=function(){return botInput(S.car,S.st,S.trk,1.4);};let n=0,air=0;while(S.mode!=='finish'&&n<120*400){tick(FIX);n++;if(S.mode==='run'&&S.car.air)air+=FIX;}
    const kmh=(trk.finishD-trk.startD)*PX2M/1000/(S.t/3600),hits=S.hits;
    [settings.season,settings.night,settings.car]=keep;toMenu('title');
    return {km:(trk.finishD-trk.startD)*PX2M/1000,jumps:trk.notes.filter(n=>n.jump).length,big:trk.notes.some(n=>n.jump&&n.big),water:!!W.water,under,inLake,reset,kmh,air,hits,
      bales:d.items.filter(o=>o.t==='bale').length,farms:d.houses.length,champ:CHAMP.find(C=>C.c==='fi').id};});
  ok(fi.champ==='finlandia'&&fi.km>1.9&&fi.km<2.2,`Finlandia en el campeonato: Harjuvaara, ${fi.km.toFixed(2)} km`);
  ok(fi.kmh>110&&fi.hits===0,`el tramo más rápido: el piloto automático va a ${Math.round(fi.kmh)} km/h de media, sin golpes`);
  ok(fi.jumps===3&&fi.big&&fi.air>1.5,`3 saltos (uno grande) y ${fi.air.toFixed(1)} s en el aire en todo el tramo`);
  ok(fi.water&&fi.under===0,'un lago de verdad junto a la carretera, que nunca queda bajo el agua');
  ok(fi.inLake>0.3&&fi.reset.resets===1&&fi.reset.pen===5&&fi.reset.onRoad,'si el coche acaba en el lago, vuelve a la carretera con +5 s');
  ok(fi.bales>=20&&fi.farms>=6,`pacas de silo en los campos (${fi.bales}) y granjas rojas (${fi.farms/2})`);

  console.log('6e. Daños: la dirección tocada');
  const dg=await p.evaluate(()=>{const si=STAGES.findIndex(q=>q.id==='portugal'),keep=[settings.season,settings.car,settings.damage,settings.lang];settings.season='primavera';settings.car=1;settings.damage=true;settings.lang='es';
    // recto, sin tocar la dirección, a 100 km/h durante 2 s, con un daño dado en el lado derecho: cuánto se desvía (m, + = derecha)
    const run=r=>{startRace(si);const trk=S.trk,i0=Math.round(760/PX2M/SP),a=trk.as[i0];S.car=init3D(newCar(S.trk,i0));S.mode='run';S.cd=0;S.dmg.r=r;S.dmg.l=0;
      const v=100/PX2KMH;S.car.vx=Math.cos(a)*v;S.car.vy=Math.sin(a)*v;S.car.vf=v;playerInput=function(){return {steer:0,gas:1,brake:0,hand:0};};const x0=S.car.x,y0=S.car.y;
      for(let q=0;q<240;q++)tick(FIX);return ((S.car.x-x0)*-Math.sin(a)+(S.car.y-y0)*Math.cos(a))*PX2M;};
    const res={none:run(0),light:run(0.15),heavy:run(0.6)};
    // un golpe fuerte de lado avisa "Dirección tocada"
    startRace(si);S.mode='run';S.cd=0;const c=S.car;hitDamage(c,-Math.sin(c.a),Math.cos(c.a),260);const el=$('dmgAlert');
    res.msg=$('daT').textContent+' · '+$('daS').textContent;res.z=el.dataset.z;res.vis=getComputedStyle(el).display!=='none'&&el.classList.contains('show');
    // un golpe de frente (contra un árbol, como en el modo libre) avisa del motor
    startRace(si);S.mode='run';S.cd=0;const c2=S.car;hitDamage(c2,Math.cos(c2.a),Math.sin(c2.a),330);res.eng=$('daT').textContent;res.ez=el.dataset.z;
    [settings.season,settings.car,settings.damage,settings.lang]=keep;toMenu('title');return res;});
  ok(Math.abs(dg.none)<0.05&&Math.abs(dg.light)<0.05,`sin daño o con un golpe leve, el coche va recto (${dg.none.toFixed(2)} m y ${dg.light.toFixed(2)} m)`);
  ok(dg.heavy>1,`con mucho daño del lado derecho tira a la derecha (${dg.heavy.toFixed(2)} m en 2 s)`);
  ok(/Dirección tocada/.test(dg.msg)&&dg.z==='r'&&dg.vis,`un golpe fuerte de lado avisa con el panel de daño: "${dg.msg}" (zona ${dg.z})`);
  ok(/Motor tocado/.test(dg.eng)&&dg.ez==='f',`un golpe fuerte de frente avisa: "${dg.eng}" (zona ${dg.ez})`);

  console.log('6f. Modo libre con todos los tramos');
  const fr=await p.evaluate(()=>{const keep=[settings.stage,settings.season,settings.car,settings.lang];settings.lang='es';applyLang();
    const plates=FREE.map(i=>plate(i)+' '+stName(STAGES[i].id));
    // Col des Lacets desde el menú del modo libre: se elige, se corre con el piloto automático y no se envía a la clasificación online
    let sent=0;const lf=window.lbFinish;window.lbFinish=function(){sent++;return lf.apply(this,arguments);};
    settings.car=1;settings.stage=STAGES.findIndex(q=>q.id==='montecarlo');settings.season='invierno';toMenu('title');menuChamp=false;setMenuRally(false);setScr('stage');
    const tile=!!$('stageList').querySelector('.stage.sel[data-i="'+settings.stage+'"]');
    playerInput=function(){return botInput(S.car,S.st,S.trk,1.4);};startRace(settings.stage);
    let n=0;while(S.mode!=='finish'&&n<120*400){tick(FIX);n++;}let m=0;while(!S.finShown&&m<120*20){tick(FIX);m++;}
    const res={plates,tile,done:S.mode==='finish',card:!$('finish').hidden&&$('podium').hidden,rank:!$('finRank').hidden,sent,next:$('nextBtn').textContent,
      gold:medalsFor(settings.stage).gold,boards:LB_BOARDS.join(','),rally:RALLY.map(i=>STAGES[i].id).join(',')};
    window.lbFinish=lf;[settings.stage,settings.season,settings.car,settings.lang]=keep;applyLang();toMenu('title');return res;});
  ok(fr.plates.length===11&&fr.plates[6]==='TC7 Col des Lacets'&&fr.plates[10]==='TC11 Vallserena',`el modo libre tiene los 11 tramos (${fr.plates.slice(6).join(', ')})`);
  ok(fr.tile&&fr.done&&fr.card&&fr.gold>0,`Col des Lacets se elige y se corre en el modo libre (oro ${fr.gold}s), con su tarjeta de meta y sin podio`);
  ok(!fr.rank&&fr.sent===0,'los tramos del campeonato no se envían a la clasificación online');
  ok(fr.boards==='bosque,nieve,asfalto,desierto,colinas,riudecanyes,rally'&&fr.rally==='bosque,nieve,asfalto,desierto,colinas',`la clasificación y el Rally completo siguen con sus tramos (${fr.rally})`);

  console.log('6g. Controles táctiles');
  const tc=await p.evaluate(()=>{const lang0=settings.lang;startRace(0);let n=0;while(S.mode!=='run'&&n<600){tick(FIX);n++;}
    const c=el=>{const r=$(el).getBoundingClientRect();return {x:(r.left+r.right)/2,y:(r.top+r.bottom)/2,w:r.width,h:r.height};};
    const press=(...ids)=>{ptrs.clear();ids.forEach((id,k)=>ptrs.set(k+1,c(id)));updTouch();const o={l:touch.l,r:touch.r,gas:touch.gas,brake:touch.brake,hand:touch.hand};ptrs.clear();updTouch();return o;};
    const a=press('bL','bGas'),b=press('bR','bBrake','bHand');
    const sizes=['bL','bR','bGas','bBrake','bHand'].map(id=>{const r=c(id);return Math.min(r.w,r.h);});
    settings.lang='en';applyLang();const en=[$('bGas').textContent,$('bBrake').textContent,$('bHand').textContent,!!$('bHand').querySelector('svg'),!!$('bL').querySelector('svg')];
    settings.lang=lang0;applyLang();toMenu('title');return {a,b,minSize:Math.min(...sizes),en};});
  ok(tc.a.l&&tc.a.gas&&!tc.a.r&&!tc.a.brake&&tc.b.r&&tc.b.brake&&tc.b.hand&&!tc.b.l&&!tc.b.gas,'izquierda + gas y derecha + freno + freno de mano a la vez: cada toque cae en su botón');
  ok(tc.minSize>=44,`los botones miden al menos 44 px para el pulgar (el más chico: ${Math.round(tc.minSize)} px)`);
  ok(tc.en[0]&&tc.en[1]&&tc.en[2]&&tc.en[3]&&tc.en[4],`al cambiar de idioma no se pierden textos ni iconos (${tc.en.slice(0,3).join(', ')})`);

  console.log('6h. Cambiar de tramo rápido en el selector');
  // antes: cada toque construía el mundo entero al momento y el nuevo convivía un instante con el viejo en la GPU;
  // tocando rápido se encadenaban las construcciones (el juego se trababa) y el iPhone/iPad perdía el 3D (pantalla negra)
  await p.evaluate(()=>{window.__bw=[];const f=window.buildWorld;window.__bwf=f;window.buildWorld=function(){window.__bw.push(Object.values(cache).filter(c=>c.W).length);return f.apply(this,arguments);};
    settings.lang='es';applyLang();settings.stage=FREE[3];toMenu('title');setMenuRally(false);menuChamp=false;setScr('stage');window.__bw=[];}); // se empieza en Dunas rojas; el último toque es Bosque de pinos
  const sw0=Date.now();
  for(let k=0;k<8;k++)await p.evaluate(k=>{const t=[...$('stageList').querySelectorAll('.stage')];t[(k*3+1)%t.length].click();setScr('stage');},k);
  const swTaps=Date.now()-sw0;await p.waitForTimeout(1200);
  const sw=await p.evaluate(()=>{const r={builds:window.__bw.length,alive:window.__bw,shown:S.si===settings.stage,live:Object.values(cache).filter(c=>c.W).length};
    // y al empezar la carrera justo después de elegir, el fondo pendiente no rehace el menú en plena carrera
    const t=[...$('stageList').querySelectorAll('.stage')];t[2].click();startRace(settings.stage);return r;});
  await p.waitForTimeout(600);
  const swRace=await p.evaluate(()=>{const m=S.mode;window.buildWorld=window.__bwf;toMenu('title');return m;});
  ok(sw.builds===1&&sw.shown,`8 tramos tocados seguidos (${swTaps} ms): el fondo 3D se construye una sola vez (${sw.builds}), con el último elegido (${sw.shown?'sí':'no'})`);
  ok(sw.alive.every(n=>n===0)&&sw.live===1,'nunca hay dos mundos a la vez en la GPU: el viejo se libera antes de construir el nuevo');
  ok(swRace==='countdown'||swRace==='run','empezar la carrera justo después de elegir no la interrumpe');

  console.log('6i. Todos los tramos en todas las condiciones');
  // cada tramo del modo libre en cada estación que admite, de día y de noche, seco y con lluvia: se carga y se dibuja un fotograma
  // (Serra das Fragas y Harjuvaara de noche se colgaban: les faltaba su cielo nocturno)
  const cnd=await p.evaluate(()=>{const keep=[settings.stage,settings.season,settings.night,settings.rain],bad=[];let n=0;
    for(const i of FREE)for(const sea of (seasonLocked(STAGES[i].id)?['invierno']:SEASONS))for(const night of [false,true])for(const rain of [false,true]){
      settings.season=sea;settings.night=night;settings.rain=rain;n++;
      try{startRace(i);render(1/60);if(S.si!==i)throw new Error('no cambió de tramo');}catch(e){bad.push(STAGES[i].id+' '+sea+(night?' noche':' día')+(rain?' lluvia':'')+': '+e.message);}}
    [settings.stage,settings.season,settings.night,settings.rain]=keep;toMenu('title');return {n,bad};});
  ok(cnd.n===140&&cnd.bad.length===0,`los 11 tramos cargan y se dibujan en sus ${cnd.n} condiciones`+(cnd.bad.length?' — fallan: '+cnd.bad.slice(0,4).join(' | '):''));

  console.log('6j. Tramos de ida y regreso');
  // el regreso: el mismo tramo al revés, con su salida, su meta y su STOP donde caben (sin tocar casas, muros ni agua)
  const rv=await p.evaluate(()=>{const out=[];
    for(let i=0;i<STAGES.length;i++){const c=getStage(i),f=c.trk,R=revOf(c),T=R.trk,M=f.N-1,F=c.decor.fin,len=t=>(t.finishD-t.startD)*PX2M,lc=f.corners[f.corners.length-1];
      const chevF=c.decor.items.filter(o=>o.t==='chevron').length,chevR=R.view.items.filter(o=>o.t==='chevron');
      out.push({id:STAGES[i].id,fit:!T.noFit,dl:Math.round(len(f)-len(T)),order:T.startI<T.finishI&&T.finishI<T.stopI&&T.stopI<T.N,tail:Math.round((T.N-1-T.stopI)*SP*PX2M),
        flip:T.corners.length===f.corners.length&&T.corners[0].dir===-lc.dir&&T.corners[0].s===M-lc.e,notes:T.notes.filter(n=>n.sev).length===f.notes.filter(n=>n.sev).length,
        start:Math.hypot(T.xs[T.startI]-f.xs[f.stopI],T.ys[T.startI]-f.ys[f.stopI])<1,boards:R.view.fin.boards.length,
        oldGone:!R.view.items.some(o=>o.t==='fin'&&Math.hypot(o.x*K-F.tent.x,o.y*K-F.tent.z)<1)&&!(R.run.solids||[]).some(o=>o.fin&&Math.hypot(o.x-F.tent.x,o.z-F.tent.z)<1),
        chev:chevF===0?chevR.length===0:chevR.length>0&&chevR.every(o=>o.yaw!==undefined)});}
    return out;});
  ok(rv.every(r=>r.fit&&r.order),'el regreso de los 11 tramos tiene salida, meta y STOP en orden, y la meta, la carpa y los carteles caben sin tocar casas, muros ni agua');
  ok(rv.every(r=>r.dl>=0&&r.dl<=350),'cada regreso mide casi lo que la ida: '+rv.map(r=>r.id+' −'+r.dl+' m').join(', '));
  ok(rv.every(r=>r.tail>=55),'tras el STOP del regreso quedan al menos 55 m de carretera (el que menos, '+Math.min(...rv.map(r=>r.tail))+' m)');
  ok(rv.every(r=>r.flip&&r.notes&&r.start),'las curvas van al revés (la última de la ida es la primera del regreso, hacia el otro lado) con todas sus notas, y la salida está donde la ida tenía el STOP');
  ok(rv.every(r=>r.oldGone&&r.boards===5),'la meta de la ida no se queda en el regreso (ni su carpa ni sus postes invisibles) y el regreso tiene su meta, su cartel de 100 m y su STOP');
  ok(rv.every(r=>r.chev),'las señales de curva de Montecarlo se ponen de cara al coche del regreso');
  // el piloto automático hace el regreso de los 11 tramos en el juego de verdad (con choques): llega, se para en el STOP y no se envía nada online
  const rr=await p.evaluate(()=>{const res=[];const keep=[settings.car,settings.rev],sub=LB.submit;let subs=0;LB.submit=function(){subs++;return sub.apply(this,arguments);};
    playerInput=function(){return botInput(S.car,S.st,S.trk,1.4);};
    for(let i=0;i<STAGES.length;i++){settings.car=1;settings.stage=i;settings.rev=true;startRace();
      let n=0;while(S.mode!=='finish'&&n<120*400){tick(FIX);n++;}let m=0;while(!S.finShown&&m<120*20){tick(FIX);m++;}
      res.push({id:STAGES[i].id,done:S.mode==='finish',card:!$('finish').hidden,rev:!!S.trk.rev&&!!S.W.rev,hits:S.hits,resets:S.resets,stop:+((S.car.ti-S.trk.stopI)*SP*PX2M).toFixed(1),
        cond:$('finCond').textContent.includes(t('dirRev')),rank:!$('finRank').hidden,t:+S.finishTotal.toFixed(1),gold:medalsFor(i).gold});}
    LB.submit=sub;[settings.car,settings.rev]=keep;toMenu('title');return {res,subs};});
  for(const r of rr.res)ok(r.done&&r.card&&r.rev&&r.resets===0&&r.hits<=1&&Math.abs(r.stop)<6,`regreso de ${r.id}: meta en ${r.t}s (oro ${r.gold}s), ${r.hits} golpes, sin reinicios, parado en el STOP (${r.stop} m)`);
  ok(rr.res.every(r=>r.cond&&!r.rank)&&rr.subs===0,'la tarjeta de meta dice "Regreso" y el regreso no va a la clasificación online (envíos: '+rr.subs+')');
  ok(await p.evaluate(()=>{const k=settings.rev;settings.rev=false;const a=bestKey('bosque');settings.rev=true;const b=bestKey('bosque');settings.rev=k;return a==='best:v3:bosque'&&b!==a&&/regreso/.test(b);}),'los récords y el fantasma del regreso se guardan aparte (los de la ida no cambian de nombre)');
  const rc=await p.evaluate(()=>{const keep=[settings.stage,settings.season,settings.night,settings.rain,settings.rev],bad=[];let n=0;settings.rev=true;
    for(const i of FREE)for(const [sea,night,rain] of [['verano',false,false],['otono',true,true],['invierno',false,true],['primavera',true,false]]){if(seasonLocked(STAGES[i].id)&&sea!=='invierno')continue;
      settings.season=sea;settings.night=night;settings.rain=rain;n++;try{startRace(i);render(1/60);if(!S.trk.rev||!S.W.rev)throw new Error('no es el regreso');}catch(e){bad.push(STAGES[i].id+' '+sea+': '+e.message);}}
    [settings.stage,settings.season,settings.night,settings.rain,settings.rev]=keep;toMenu('title');return {n,bad};});
  ok(rc.bad.length===0,`el regreso de cada tramo carga y se dibuja de día, de noche, con lluvia y con nieve (${rc.n} combinaciones)`+(rc.bad.length?' — fallan: '+rc.bad.slice(0,4).join(' | '):''));
  ok(errs.length===0,'sin errores de consola en el regreso '+(errs.length?JSON.stringify(errs.slice(0,3)):''));

  console.log('7. Menú principal y Juego libre');
  const lang0=await p.evaluate(()=>settings.lang); // los textos del menú y del campeonato se comprueban en español
  await p.evaluate(()=>{settings.lang='es';applyLang();toMenu('title');});await p.waitForTimeout(200);
  const nav=await p.evaluate(()=>[...document.querySelectorAll('.mbtn')].filter(b=>!b.hidden).map(b=>b.querySelector('i').textContent+' '+b.querySelector('span').textContent));
  ok(nav.join(',')==='01 Campeonato,02 Juego libre,03 Controles,04 Clasificación,05 Opciones','menú en orden: '+nav.join(' · '));
  ok(await p.evaluate(()=>{setScr('title');return $('btnChamp').classList.contains('primary')&&document.activeElement===$('btnChamp');}),'Campeonato es el botón principal y tiene el foco');
  const scrNow=()=>p.evaluate(()=>menuScr),clickBack=async()=>{await p.evaluate(()=>$(SCR[menuScr]).querySelector('.back').click());await p.waitForTimeout(120);};
  const condNow=()=>p.evaluate(()=>({id:STAGES[settings.stage].id,season:settings.season,night:!!settings.night,rain:!!settings.rain,step:($(SCR[menuScr]).querySelector('.step')||{}).textContent}));
  await p.click('#btnStart');await p.waitForTimeout(200);
  ok(await p.evaluate(()=>menuScr==='free'&&$('freeModes').querySelectorAll('.mode').length===2),'"Juego libre" pregunta: tramo único o crear rally');
  // tramo único: tramo -> estación, hora y clima -> coche -> resumen
  await p.click('#freeModes .mode[data-v="single"]');await p.waitForTimeout(200);
  ok((await scrNow())==='stage'&&(await condNow()).step==='1/4','tramo único: primero se elige el tramo (paso 1/4)');
  await p.click('#stageList .stage[data-i="2"]');await p.waitForTimeout(200);
  await p.click('#seasons .season[data-v="otono"]');await p.click('#segNight [data-v="1"]');await p.click('#segRain [data-v="0"]');await p.click('#segDir [data-v="1"]');await p.waitForTimeout(150);
  ok(await p.evaluate(()=>settings.rev===true&&$('segDir').querySelector('[data-v="1"]').getAttribute('aria-pressed')==='true'),'en las condiciones se elige el sentido: Regreso');
  await p.click('#toCar');await p.waitForTimeout(150);await p.click('#go');await p.waitForTimeout(200);
  const sum1=await p.evaluate(()=>({scr:menuScr,rows:$('sumList').children.length,txt:$('sumList').textContent,go:$('sumGo').textContent,head:$('sumHead').textContent}));
  ok(sum1.scr==='sum'&&sum1.rows===1&&/Puerto de montaña/.test(sum1.txt)&&/Regreso/.test(sum1.txt)&&/Otoño · De noche/.test(sum1.txt)&&/Seco/.test(sum1.txt)&&sum1.go==='Correr TC3',`resumen antes de salir: "${sum1.head}", "${sum1.txt}" y el botón "${sum1.go}"`);
  const backs=[];for(let k=0;k<5;k++){await clickBack();backs.push(await scrNow());}
  ok(backs.join(',')==='car,cond,stage,free,title','"Atrás" recorre todas las pantallas hasta el menú ('+backs.join(' → ')+')');
  // crear rally: 5 tramos, cada uno con su estación, hora y clima
  await p.click('#btnStart');await p.waitForTimeout(150);await p.click('#freeModes .mode[data-v="rally"]');await p.waitForTimeout(200);
  const r0=await condNow();
  ok(r0.id==='bosque'&&/Tramo\s*1\/5/i.test(r0.step),`crear rally: el tramo 1 propone el TC1 (${r0.id}) y dice "${r0.step}"`);
  const plan=[['portugal','primavera',0,0,0],['desierto','verano',1,0,1],['nieve',null,0,1,0],['vallserena','otono',0,1,1],['bosque','verano',1,1,0]];
  for(const [id,sea,n,r,v] of plan){await p.evaluate(id=>$('stageList').querySelector(`.stage[data-i="${STAGES.findIndex(q=>q.id===id)}"]`).click(),id);await p.waitForTimeout(150);
    if(sea)await p.click(`#seasons .season[data-v="${sea}"]`);await p.click(`#segNight [data-v="${n}"]`);await p.click(`#segRain [data-v="${r}"]`);await p.click(`#segDir [data-v="${v}"]`);await p.waitForTimeout(100);await p.click('#toCar');await p.waitForTimeout(150);}
  ok((await scrNow())==='car','tras el tramo 5 se elige el coche');
  await clickBack();await clickBack();const b4=[await scrNow()];await clickBack();const c4=await condNow();b4.push(await scrNow());
  await p.keyboard.press('Escape');await p.waitForTimeout(120);b4.push(await scrNow());
  ok(b4.join(',')==='stage,cond,stage'&&c4.id==='vallserena'&&c4.season==='otono'&&c4.rain&&!c4.night&&/4\/5/.test(c4.step),`"Atrás" en el rally vuelve al tramo anterior con lo que tenía (${c4.id}, ${c4.season}, ${c4.step}); Esc también`);
  for(let k=0;k<2;k++){await p.click('#toCond');await p.waitForTimeout(100);await p.click('#toCar');await p.waitForTimeout(120);}
  await p.click('#go');await p.waitForTimeout(200);
  const sum5=await p.evaluate(()=>({scr:menuScr,rows:[...$('sumList').children].map(li=>li.textContent),go:$('sumGo').textContent,head:$('sumHead').textContent}));
  ok(sum5.scr==='sum'&&sum5.rows.length===5&&/Rally a tu gusto · 5 tramos/.test(sum5.head)&&sum5.go==='Empezar rally'&&/Valle helado.*Invierno · De día.*Nevando/.test(sum5.rows[2])&&/Bosque de pinos.*Verano · De noche.*Con lluvia/.test(sum5.rows[4]),
    `resumen del rally: "${sum5.head}" (${sum5.rows.length} tramos; el 3.º: "${sum5.rows[2]}")`);
  await p.screenshot({path:path.join(OUT,'juego-libre-resumen.png')});
  const rSent=[];
  await p.route(/rest\/v1\/rpc\/rally_(submit|top)/,r=>{const body=JSON.parse(r.request().postData()||'{}');rSent.push(body.p_board);
    r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(/submit/.test(r.request().url())?{rank:3,total:9,best_ms:body.p_time_ms,improved:false,name:'Test'}:{top:[],me:null,total:0})});});
  await p.click('#sumGo');await p.waitForTimeout(200);
  // cada tramo se corre con sus condiciones (se acaba al momento con un tiempo inventado: aquí sólo importa el flujo)
  const legs=[];for(let k=0;k<5;k++){legs.push(await p.evaluate(k=>{const c={id:S.st.id,season:seasonOf(S.st.id),night:!!settings.night,rain:!!settings.rain,rev:!!S.trk.rev};
    S.mode='run';S.t=95+k;S.pen=0;finishRace();c.next=$('nextBtn').hidden?null:$('nextBtn').textContent;c.cond=$('finCond').textContent;c.title=$('finTitle').textContent;c.time=$('finTime').textContent;
    if(k<4)$('nextBtn').click();return c;},k));}
  const want=['portugal primavera d - ida','desierto verano n - regreso','nieve invierno d r ida','vallserena otono d r regreso','bosque verano n r ida'],got=legs.map(c=>c.id+' '+c.season+' '+(c.night?'n':'d')+' '+(c.rain?'r':'-')+' '+(c.rev?'regreso':'ida'));
  ok(got.join()===want.join(),'cada tramo del rally con sus condiciones y su sentido: '+got.join(' | '));
  ok(/1\/5/.test(legs[0].cond)&&/Siguiente/.test(legs[0].next||'')&&legs[4].next===null&&/Rally/.test(legs[4].title)&&legs[4].time===await p.evaluate(()=>fmt(95+96+97+98+99)),`meta del rally: "${legs[4].title}", total ${legs[4].time}`);
  await p.waitForTimeout(1200);
  ok(!rSent.includes('s2:rally')&&!rSent.includes('s2:desierto')&&await p.evaluate(()=>Object.keys(localStorage).some(k=>/rallyc:v1:portugal\.primavera\.d,desierto\.verano\.n\.v/.test(k))),'un rally a tu gusto guarda su récord en el aparato y no va a la tabla online del Rally clásico ('+([...new Set(rSent)].join(', ')||'nada')+')');
  await p.unroute(/rest\/v1\/rpc\/rally_(submit|top)/);
  await p.evaluate(()=>toMenu('title'));
  ok(errs.length===0,'sin errores de consola en el juego libre '+(errs.length?JSON.stringify(errs.slice(0,3)):''));

  console.log('7b. Campeonato (10 tramos)');
  await p.evaluate(()=>{toMenu('title');store.set(CH_KEY,null);settings.season='verano';settings.night=false;settings.rain=true;settings.rev=true;saveSettings();});
  await p.click('#btnChamp');await p.waitForTimeout(300);
  const scr=await p.evaluate(()=>({scr:menuScr,cal:$('champCal').children.length,tab:$('champTab').children.length,go:$('champGo').textContent,nw:$('champNew').hidden}));
  ok(scr.scr==='champ'&&scr.cal===10&&scr.tab===10,`la pantalla del campeonato muestra 10 tramos y 10 pilotos (${scr.cal}, ${scr.tab})`);
  ok(/Empezar/.test(scr.go)&&scr.nw,'sin campeonato guardado: "'+scr.go+'" y sin botón de nuevo campeonato');
  await p.screenshot({path:path.join(OUT,'campeonato-menu.png')});
  await p.click('#champGo');await p.waitForTimeout(200);
  ok(await p.evaluate(()=>menuScr==='car'&&/campeonato/i.test($('go').textContent)),'"Empezar" pide elegir coche y el botón dice "'+await p.evaluate(()=>$('go').textContent)+'"');
  const champSent=[];
  await p.route(/rest\/v1\/rpc\/rally_(submit|top)/,r=>{const body=JSON.parse(r.request().postData()||'{}');champSent.push(body.p_board);
    r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(/submit/.test(r.request().url())?{rank:3,total:9,best_ms:body.p_time_ms,improved:false,name:'Test'}:{top:[],me:null,total:0})});});
  await p.evaluate(()=>{settings.car=1;playerInput=function(){return botInput(S.car,S.st,S.trk,1.4);};});
  await p.click('#go');
  // cada país: el tramo con el piloto automático, el podio (los 3 primeros; "Continuar") y después la tarjeta de meta
  const runCountry=async()=>{const r=await p.evaluate(()=>{const cnd={id:STAGES[S.si].id,season:settings.season,night:settings.night,rain:settings.rain,rev:!!S.trk.rev,restart:null};
    let n=0;while(S.mode!=='finish'&&n<120*400){tick(FIX);n++;}let m=0;while(!S.finShown&&m<120*20){tick(FIX);m++;}
    return Object.assign(cnd,{done:S.mode==='finish',title:$('finTitle').textContent,next:$('nextBtn').hidden?null:$('nextBtn').textContent,
      again:!$('againBtn').hidden,menu:$('menuBtn').textContent,rank:!$('finRank').hidden,sec:$('finSec').children.length,
      pod:!$('podium').hidden&&$('finish').hidden,podTitle:$('podPos').textContent,podTop:$('podTab').querySelectorAll('li.p1,li.p2,li.p3').length,
      podMe:$('podTab').querySelectorAll('li.me').length,podHud:getComputedStyle($('hud')).display,podTags:(S.podQ||[]).map(d=>d.tag)});});
    // con la cámara de cabina elegida, en el podio se dibuja el coche entero (no la cabina): se cuentan las llamadas de dos fotogramas
    r.podDraw=await p.evaluate(()=>new Promise(res=>{const keep=settings.cam,f0=window.drawCarMesh,f1=window.drawCockpit;let car=0,cab=0;settings.cam=3;
      window.drawCarMesh=function(){car++;return f0.apply(this,arguments);};window.drawCockpit=function(){cab++;return f1.apply(this,arguments);};
      requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{window.drawCarMesh=f0;window.drawCockpit=f1;settings.cam=keep;res({car,cab});})));}));
    r.pods=0;while(await p.evaluate(()=>!$('podium').hidden)){await p.click('#podGo');r.pods++;}
    r.card=await p.evaluate(()=>!$('finish').hidden&&!S.podCam);return r;};
  const c1=await runCountry();
  ok(c1.pod&&c1.podTop===3&&c1.podMe===1&&c1.podHud==='none'&&/puesto/.test(c1.podTitle),`al acabar el país sale el podio (sin el HUD): "${c1.podTitle}", los 3 primeros y tu fila`);
  ok(c1.pods===1&&c1.card,'"Continuar" pasa del podio a la tarjeta de meta');
  ok(c1.podDraw.car>0&&c1.podDraw.cab===0,`con la cámara de cabina, el podio enseña el coche entero (${c1.podDraw.car} dibujos del coche, ${c1.podDraw.cab} de la cabina)`);
  ok(c1.id==='montecarlo'&&c1.season==='invierno'&&c1.night===true&&c1.rain===false&&!c1.rev,`Montecarlo se corre en ${c1.id}, ${c1.season}, ${c1.night?'noche':'día'}, seco y de ida (aunque tuvieras elegido el regreso)`);
  ok(c1.done&&/pts/.test(c1.title)&&/Montecarlo 2\/2/.test(c1.next||'')&&!c1.again,`meta en Col des Lacets: "${c1.title}", siguiente "${c1.next}", sin repetir`);
  ok(await p.evaluate(()=>{const g=store.get(CH_KEY,null);return g&&g.v===2&&g.i===1&&g.res.length===1&&g.rt[0].length===9;}),'el progreso se guarda al terminar cada tramo (con los 9 rivales)');
  await p.click('#nextBtn');
  ok(await p.evaluate(()=>{pauseGame();const h=$('restartBtn').hidden;resumeGame();return h;}),'en pausa no se puede reiniciar el tramo');
  const c2=await runCountry();
  ok(c2.id==='asfalto'&&c2.season==='invierno'&&!c2.night&&/Suecia 1\/2/.test(c2.next||''),`Montecarlo 2 en el Puerto de montaña (${c2.season}, de día), siguiente: "${c2.next}"`);
  // guardar y salir a mitad del campeonato: vuelven las condiciones del jugador y se puede continuar
  await p.click('#menuBtn');await p.waitForTimeout(300);
  const mid=await p.evaluate(()=>({scr:menuScr,season:settings.season,night:settings.night,rain:settings.rain,rev:settings.rev,saved:store.get('settings',{}),go:$('champGo').textContent,nw:!$('champNew').hidden}));
  ok(mid.scr==='champ'&&mid.season==='verano'&&!mid.night&&mid.rain&&mid.rev===true&&mid.saved.season==='verano'&&!mid.saved.night&&mid.saved.rain===true,'al salir vuelven tus condiciones (verano, día, lluvia, regreso) y no se guardan las del país');
  ok(/Suecia/.test(mid.go)&&mid.nw,'la pantalla ofrece "'+mid.go+'" y "Nuevo campeonato"');
  await p.click('#champGo');
  const cs=[];for(let k=2;k<10;k++){cs.push(await runCountry());if(k<9)await p.click('#nextBtn');}
  const cl=cs[cs.length-1];
  ok(cs.map(c=>c.id).join()==='suecia,nieve,portugal,bosque,finlandia,colinas,vallserena,riudecanyes',`el resto del calendario en orden (${cs.map(c=>c.id).join(', ')})`);
  ok(cs.map(c=>c.season).join()==='invierno,invierno,primavera,primavera,verano,verano,otono,otono','cada país con su estación (Suecia invierno, Portugal primavera, Finlandia verano, España otoño)');
  ok(cs.every(c=>!c.rev),'todo el campeonato se corre de ida');
  ok(cl.pods===2&&cl.podTags[1]==='Clasificación final',`al final, dos podios: el del último tramo y el del campeonato (${cl.podTags.join(' / ')})`);
  ok(cl.again&&cl.next===null&&/(Campeón|Campeonato terminado)/.test(cl.title)&&cl.sec>=5,`tarjeta final: "${cl.title}", con la general y "Nuevo campeonato"`);
  await p.screenshot({path:path.join(OUT,'campeonato-final.png')});
  const tot=await p.evaluate(()=>{const st=champStand(store.get(CH_KEY,null));return {sum:st.reduce((a,r)=>a+r.pts,0),me:st.findIndex(r=>r.me)+1,pts:st.find(r=>r.me).pts,top:st[0].name+' '+st[0].pts};});
  ok(tot.sum===10*101,`se reparten 101 puntos por tramo (${tot.sum} en total); acabaste ${tot.me}.º con ${tot.pts} pts (líder: ${tot.top})`);
  await p.waitForTimeout(1200);
  const sentB=[...new Set(champSent.filter(b=>b))].sort().join(',');
  ok(sentB==='s2:asfalto,s2:bosque,s2:colinas,s2:nieve,s2:riudecanyes'&&!cs[6].rank&&cl.rank,'sólo los tramos clásicos del calendario van a su tabla online ('+sentB+'); los propios del campeonato, no');
  await p.unroute(/rest\/v1\/rpc\/rally_(submit|top)/);
  await p.click('#againBtn');await p.waitForTimeout(300);
  ok(await p.evaluate(()=>menuScr==='champ'&&/Empezar/.test($('champGo').textContent)),'"Nuevo campeonato" vuelve a la pantalla del campeonato');
  ok(errs.length===0,'sin errores de consola en el campeonato '+(errs.length?JSON.stringify(errs.slice(0,3)):''));
  await p.evaluate(l=>{settings.lang=l;settings.rev=false;applyLang();saveSettings();toMenu('title');},lang0);

  console.log('8. Pérdida del contexto 3D (como cuando iOS libera la GPU)');
  const hasExt=await p.evaluate(()=>{window.__lc=GL.gl.getExtension('WEBGL_lose_context');return !!window.__lc;});
  ok(hasExt,'el navegador de pruebas puede simular la pérdida');
  if(hasExt){
    await p.evaluate(()=>__lc.loseContext());await p.waitForTimeout(500);
    ok(await p.evaluate(()=>!$('glLost').hidden&&S.mode!=='run'),'aparece el aviso y la carrera se detiene');
    await p.screenshot({path:path.join(OUT,'contexto-perdido.png')});
    await p.waitForTimeout(3200);
    ok(await p.evaluate(()=>!$('reloadBtn').hidden),'a los 3 s aparece el botón Recargar');
    const nav=p.waitForNavigation({timeout:15000});await p.evaluate(()=>__lc.restoreContext());await nav;
    await p.waitForFunction(()=>typeof S!=='undefined'&&S.mode==='menu'&&!!S.W,null,{timeout:30000});
    await p.waitForTimeout(300);
    ok(await p.evaluate(()=>$('toast').classList.contains('show')&&$('glBack')===null),'al volver el 3D se recarga solo y avisa: "'+await p.evaluate(()=>$('toast').textContent)+'"');
    await p.screenshot({path:path.join(OUT,'tras-recuperar.png')});
  }
  ok(errs.length===0,'sin errores de consola al final '+(errs.length?JSON.stringify(errs.slice(0,3)):''));
  await b.close();
  console.log(fails?`\n${fails} prueba(s) fallaron`:'\nTodo en verde');process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
