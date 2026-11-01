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

  console.log('5. Pérdida del contexto 3D (como cuando iOS libera la GPU)');
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
