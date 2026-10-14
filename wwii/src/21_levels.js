// ===== FRENTE 44 · misiones (LEVELS): escenario, guion y objetivos =====
// STUB fase 1: lo sustituye el módulo completo (21_levels.js). Un campo de pruebas ('test') completo y las 5 misiones de la campaña + supervivencia
// como marcadores que reutilizan su escenario con otra luz (amanecer, noche, día, nieve) para que el menú las liste.
const ENVS={
 day:{sunEl:40,sunAz:-120,cloud:0.45},
 dawn:{sunEl:9,sunAz:95,sunCol:[1.0,0.74,0.52],ambSky:[0.33,0.36,0.43],ambGnd:[0.21,0.2,0.18],fog:'#a2a6a4',fogN:35,fogF:330,fogSun:[0.3,0.2,0.1],zen:'#59708a',hor:'#c8b9a5',
  cloud:0.7,cloudCol:[0.82,0.78,0.74],cloudDark:[0.5,0.52,0.56],mist:[0,3,0.3],grade:{tint:[1.03,0.98,0.94],sat:0.72,con:1.08,vig:0.34,bloom:0.32,sepia:0.14}},
 night:{sunEl:34,sunAz:60,sunCol:[0.14,0.17,0.26],ambSky:[0.07,0.085,0.13],ambGnd:[0.03,0.032,0.04],fog:'#0b1222',fogN:25,fogF:240,fogSun:[0,0,0],zen:'#040916',hor:'#14203a',
  cloud:0.3,cloudCol:[0.12,0.15,0.22],cloudDark:[0.04,0.05,0.08],stars:1,moon:1,sunK:0,shK:0.42,grade:{tint:[0.95,0.98,1.06],sat:0.85,con:1.08,vig:0.42,bloom:0.55,sepia:0.05}},
 overcast:{sunEl:48,sunAz:-60,sunCol:[0.78,0.76,0.7],ambSky:[0.42,0.45,0.5],fog:'#9ca3a3',fogN:50,fogF:420,cloud:0.85,sunK:0.35,grade:{sat:0.78,sepia:0.15}},
 snow:{sunEl:18,sunAz:-150,sunCol:[0.72,0.75,0.82],ambSky:[0.48,0.52,0.6],ambGnd:[0.42,0.44,0.48],fog:'#c3c9d1',fogN:18,fogF:230,fogSun:[0.08,0.08,0.08],zen:'#8e99a5',hor:'#c8ced5',
  cloud:0.9,cloudCol:[0.86,0.88,0.9],cloudDark:[0.62,0.65,0.7],sunK:0.15,snow:1,grade:{tint:[0.97,0.99,1.04],sat:0.62,con:1.05,vig:0.32,bloom:0.25,sepia:0.06}}
};
const SQUAD=[{name:'Hayes',kind:'rifle',hero:true},{name:'Russo',kind:'smg',hero:true}];
// escenario del campo de pruebas; kind = textura del suelo ('grass'|'sand'|'snow'|'dirt')
function rangeLayout(kind){const snow=kind==='snow',tree=snow?'snowy':'oak',pine=snow?'snowy':'pine';
 return {bounds:[-64,-64,64,64],
  terrain:{tex:kind,h:(x,z)=>{const r=Math.hypot(x,z);return 0.5*Math.sin(x*0.045)*Math.cos(z*0.05)+0.22*Math.sin(x*0.13+z*0.07)+12*smooth((r-50)/55)*(0.7+0.3*Math.sin(Math.atan2(x,z)*3))+14*smooth((r-120)/140);}},
  props:[
   {t:'house',x:10,z:-6,yaw:Math.PI,w:8,d:6},
   {t:'house',x:-30,z:-30,yaw:0.4,w:7,d:5,mat:'brick',ruined:true},
   {t:'sandbags',x:-8,z:15,yaw:Math.PI,r:3,a0:-0.9,a1:0.9},{t:'sandbags',x:6,z:25,yaw:Math.PI,r:3,a0:-1,a1:1},{t:'sandbags',x:18,z:8,yaw:Math.PI,len:4},
   {t:'crate',x:-3,z:7,n:3},{t:'crate',x:14,z:16,yaw:0.4,n:2},{t:'crate',x:-12,z:-8,s:0.8},
   {t:'barrel',x:4,z:18,explosive:true},{t:'barrel',x:-14,z:-6},{t:'barrel',x:-13.3,z:-5.5},
   {t:'fence',x:-22,z:-20,len:14},{t:'fence',x:-9,z:-20,yaw:0.2,len:8},
   {t:'ruin',x:-18,z:10,yaw:0.3,len:7},{t:'wall',x:22,z:3,yaw:-0.1,len:8,h:1.8},
   {t:'hedgehog',x:-22,z:-8},{t:'hedgehog',x:-18,z:-12},{t:'hedgehog',x:-25,z:-13},
   {t:'wire',x:0,z:-26,len:7},{t:'crater',x:-6,z:-14,r:3,d:1.2},{t:'crater',x:16,z:-22,r:2.2,d:0.8},
   {t:'trench',pts:[[-34,18],[-24,24],[-12,26]],rampA:true},
   {t:'bunker',x:0,z:36,yaw:Math.PI},
   {t:'hedge',x:32,z:12,yaw:Math.PI/2,len:16},{t:'gun',id:'gun1',x:-24,z:38,yaw:Math.PI-0.3},{t:'crate',x:13.6,z:-11.2,s:0.7},{t:'wreck',x:25,z:30,yaw:0.7},
   {t:'tower',x:-40,z:46},{t:'rock',x:30,z:-10,s:1.3},{t:'rock',x:-36,z:4,s:1},{t:'rock',x:12,z:44,s:1.6},
   ...[[-44,-20],[-40,-8],[-46,14],[-28,30],[36,-30],[40,-12],[44,22],[38,38],[-8,50],[20,52],[-50,-44],[48,-46],[0,-52]].map(([x,z],i)=>({t:'tree',x,z,kind:i%3===0?pine:i%5===0?(snow?'snowy':'bare'):tree}))
  ],
  // munición junto a la casa y una MG42 sobre los sacos (mirando al norte)
  usables:[{kind:'ammo',pos:[13.6,null,-11.2],text:{es:'coger munición',en:'take ammo'},short:{es:'Munición',en:'Ammo'},use:()=>{Weapons.refill();Bus.emit('ammo',{});}},
   {kind:'mg',pos:[18,null,8],yaw:0,arc:1.1,weapon:'mg42mount',text:{es:'usar la MG42',en:'use the MG42'},short:{es:'MG42',en:'MG42'},mountH:0.62}]};}
function rangeObjectives(){return [
 {text:{es:'Llega a la casa',en:'Reach the house'},marker:[10,null,-9.6],done:L=>!!L.flags.house,onStart:L=>{L.trigger({x:10,z:-6,r:4.5},()=>{L.flags.house=true;});}},
 {text:{es:'Elimina a todos los enemigos',en:'Eliminate all enemies'},marker:L=>{let b=null,bd=1e9;for(const a of Actors.list)if(a.alive&&a.tag==='range'){const d=V3.distXZ(a.pos,Player.pos);if(d<bd){bd=d;b=a.pos;}}return b;},
  done:L=>L.alive('range')===0,onStart:L=>{L.say('Hayes','contact');}}];}
function rangeScript(L){
 if(!L.restoring)L.wait(1.2,()=>L.say('Hayes','follow',{es:'Campo de pruebas. Llega a la casa y limpia la zona.',en:'Test range. Get to the house and clear the area.'}));
 // seis enemigos tras las coberturas, mirando hacia el jugador
 if(!L.flags.spawned||L.restoring)L.spawn([{tag:'range',kind:'rifle',pos:[-8,17.5],yaw:Math.PI},{tag:'range',kind:'smg',pos:[6,27.5],yaw:Math.PI},{tag:'range',kind:'rifle',pos:[-3,10],yaw:Math.PI},
  {tag:'range',kind:'rifle',pos:[14,19],yaw:Math.PI},{tag:'range',kind:'smg',pos:[0,35],yaw:Math.PI},{tag:'range',kind:'rifle',pos:[-23,24.5],yaw:Math.PI+0.5}]);
 L.flags.spawned=true;
 // carga explosiva (mantener 2 s) en el cañón: ejemplo de interactuable del guion y de World.remove
 if(!L.flags.gunDown)World.addUsable({kind:'charge',pos:[-23.2,null,36],r:2,hold:2,once:true,text:{es:'colocar la carga',en:'plant the charge'},short:{es:'Carga',en:'Charge'},
  use:()=>{L.hint({es:'¡Carga colocada! ¡Apártate!',en:'Charge planted! Get clear!'},3);L.wait(5,()=>{Weapons.explode([-24,World.height(-24,38)+1,38],6,300,Player,{charge:true});World.remove('gun1');L.flags.gunDown=true;});}});
 else World.remove('gun1');}
function mkRange(o){return Object.assign({env:ENVS.day,start:{pos:[0,-42],yaw:0},loadout:['garand','thompson','colt','frag:4'],squad:SQUAD,
 build:()=>rangeLayout(o.ground||'grass'),objectives:rangeObjectives(),script:rangeScript},o);}
const LEVELS=[
 mkRange({id:'test',title:true,name:{es:'Campo de pruebas',en:'Test range'},place:{es:'Campo de pruebas',en:'Test range'},date:'1944',
  brief:{es:'Prueba de todo lo que hay: muévete, dispara, recoge armas y limpia la zona.',en:'Try everything: move, shoot, pick up weapons and clear the area.'}}),
 mkRange({id:'training',name:{es:'Campo de instrucción',en:'Boot camp'},place:{es:'Inglaterra',en:'England'},date:'Mayo 1944',env:ENVS.overcast,
  brief:{es:'(Provisional) Instrucción antes del desembarco.',en:'(Placeholder) Training before the landings.'}}),
 mkRange({id:'beach',name:{es:'Playa de Normandía',en:'Normandy beach'},place:{es:'Normandía, Francia',en:'Normandy, France'},date:'6 de junio de 1944',env:ENVS.dawn,ground:'sand',
  brief:{es:'(Provisional) La rampa cae. Cruza la arena, llega al muro y destruye los nidos de ametralladora.',en:'(Placeholder) The ramp drops. Cross the sand, reach the wall and destroy the machine gun nests.'}}),
 mkRange({id:'village',name:{es:'Sainte-Mère-Église',en:'Sainte-Mère-Église'},place:{es:'Normandía, Francia',en:'Normandy, France'},date:'5-6 de junio de 1944',env:ENVS.night,
  brief:{es:'(Provisional) Paracaidista separado de su unidad. Reúne a la escuadra en el pueblo.',en:'(Placeholder) A paratrooper cut off from his unit. Regroup in the village.'}}),
 mkRange({id:'bocage',name:{es:'El bocage',en:'The bocage'},place:{es:'Normandía, Francia',en:'Normandy, France'},date:'Junio 1944',env:ENVS.day,
  brief:{es:'(Provisional) Setos altos, francotiradores y un carro de combate.',en:'(Placeholder) Tall hedgerows, snipers and a tank.'}}),
 mkRange({id:'bastogne',name:{es:'Bastoña',en:'Bastogne'},place:{es:'Las Ardenas, Bélgica',en:'The Ardennes, Belgium'},date:'Diciembre 1944',env:ENVS.snow,ground:'snow',
  brief:{es:'(Provisional) Bosque nevado, artillería y el contraataque final.',en:'(Placeholder) Snowy forest, artillery and the final counterattack.'}}),
 mkRange({id:'survival',survival:true,name:{es:'Supervivencia',en:'Survival'},place:{es:'Pueblo en ruinas',en:'Ruined village'},date:'',env:ENVS.overcast,ground:'dirt',
  brief:{es:'(Provisional) Oleadas de enemigos cada vez más numerosas.',en:'(Placeholder) Ever larger waves of enemies.'}})
];
