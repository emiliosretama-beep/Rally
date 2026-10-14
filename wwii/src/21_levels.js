// ===== FRENTE 44 · misiones (LEVELS): escenario, guion y objetivos; frases de guion (LINES); escena del título (TITLE_SCENE) =====
// Formato de escenario y ayudantes del guion: DESIGN §4 (World / Levels) y §5.
// ---------- luz y clima de cada misión (Env.set) ----------
const ENVS={
 day:{sunEl:40,sunAz:-120,cloud:0.45},
 england:{sunEl:28,sunAz:-115,sunCol:[0.94,0.91,0.84],ambSky:[0.45,0.48,0.53],ambGnd:[0.25,0.25,0.21],fog:'#aab1ae',fogN:60,fogF:420,fogSun:[0.12,0.1,0.07],zen:'#71859a',hor:'#c6ccc9',
  cloud:0.78,cloudCol:[0.9,0.9,0.88],cloudDark:[0.55,0.58,0.62],sunK:0.45,mist:[0,2.5,0.12],grade:{tint:[1.0,1.0,0.97],sat:0.8,con:1.05,vig:0.3,bloom:0.25,sepia:0.1}},
 dawn:{sunEl:9,sunAz:95,sunCol:[1.0,0.74,0.52],ambSky:[0.33,0.36,0.43],ambGnd:[0.21,0.2,0.18],fog:'#a2a6a4',fogN:35,fogF:330,fogSun:[0.3,0.2,0.1],zen:'#59708a',hor:'#c8b9a5',
  cloud:0.7,cloudCol:[0.82,0.78,0.74],cloudDark:[0.5,0.52,0.56],mist:[0,3,0.3],grade:{tint:[1.03,0.98,0.94],sat:0.72,con:1.08,vig:0.34,bloom:0.32,sepia:0.14}},
 beach:{sunEl:7,sunAz:100,sunCol:[0.98,0.78,0.6],ambSky:[0.36,0.39,0.45],ambGnd:[0.23,0.22,0.2],fog:'#9ea4a6',fogN:30,fogF:300,fogSun:[0.28,0.2,0.12],zen:'#5d6e80',hor:'#b9b3a8',
  cloud:0.82,cloudCol:[0.78,0.77,0.76],cloudDark:[0.45,0.48,0.52],sunK:0.55,mist:[-1,4,0.32],wind:1.6,grade:{tint:[1.02,0.99,0.96],sat:0.66,con:1.1,vig:0.36,bloom:0.3,sepia:0.12}},
 night:{sunEl:34,sunAz:60,sunCol:[0.3,0.35,0.5],ambSky:[0.12,0.14,0.21],ambGnd:[0.05,0.05,0.06],fog:'#141d32',fogN:25,fogF:240,fogSun:[0,0,0],zen:'#040916',hor:'#16223c',
  cloud:0.35,cloudCol:[0.13,0.16,0.23],cloudDark:[0.04,0.05,0.08],stars:1,moon:1,sunK:0,shK:0.42,grade:{tint:[0.95,0.98,1.06],sat:0.85,con:1.08,vig:0.42,bloom:0.6,sepia:0.05}},
 summer:{sunEl:50,sunAz:-140,sunCol:[1.05,0.97,0.84],ambSky:[0.38,0.44,0.54],ambGnd:[0.26,0.25,0.18],fog:'#b6c4cb',fogN:70,fogF:520,fogSun:[0.25,0.2,0.12],zen:'#4f78a6',hor:'#c9d3d4',
  cloud:0.38,grade:{tint:[1.04,1.0,0.93],sat:0.92,con:1.07,vig:0.28,bloom:0.3,sepia:0.08}},
 overcast:{sunEl:48,sunAz:-60,sunCol:[0.78,0.76,0.7],ambSky:[0.42,0.45,0.5],fog:'#9ca3a3',fogN:50,fogF:420,cloud:0.85,sunK:0.35,grade:{sat:0.78,sepia:0.15}},
 snow:{sunEl:16,sunAz:-150,sunCol:[0.7,0.73,0.8],ambSky:[0.5,0.54,0.62],ambGnd:[0.44,0.46,0.5],fog:'#c0c7cf',fogN:12,fogF:170,fogSun:[0.06,0.06,0.06],zen:'#8a95a2',hor:'#c5ccd4',
  cloud:0.92,cloudCol:[0.86,0.88,0.9],cloudDark:[0.6,0.63,0.68],sunK:0.1,snow:1,mist:[0,5,0.35],wind:1.3,grade:{tint:[0.96,0.99,1.05],sat:0.6,con:1.06,vig:0.34,bloom:0.24,sepia:0.05}},
 dusk:{sunEl:5,sunAz:-75,sunCol:[1.0,0.6,0.36],ambSky:[0.3,0.28,0.32],ambGnd:[0.2,0.16,0.13],fog:'#7d6a5d',fogN:30,fogF:280,fogSun:[0.4,0.22,0.1],zen:'#3c4660',hor:'#c08a62',
  cloud:0.6,cloudCol:[0.9,0.66,0.5],cloudDark:[0.35,0.3,0.34],mist:[0,4,0.2],grade:{tint:[1.06,0.97,0.9],sat:0.8,con:1.1,vig:0.4,bloom:0.4,sepia:0.16}},
 golden:{sunEl:11,sunAz:75,sunCol:[1.08,0.8,0.55],ambSky:[0.34,0.37,0.45],ambGnd:[0.24,0.21,0.17],fog:'#b3aa9a',fogN:40,fogF:360,fogSun:[0.42,0.26,0.12],zen:'#55739a',hor:'#d6bf9c',
  cloud:0.5,cloudCol:[0.98,0.86,0.72],cloudDark:[0.5,0.48,0.52],mist:[0,3,0.22],grade:{tint:[1.05,0.99,0.9],sat:0.85,con:1.08,vig:0.36,bloom:0.38,sepia:0.12}}
};
// reparto: nombre para los subtítulos y voz (el audio puede usar CAST[who].voice: tono y velocidad)
const CAST={Hayes:{es:'Sgto. Hayes',en:'Sgt. Hayes',voice:{pitch:0.8,rate:0.95}},Russo:{es:'Cabo Russo',en:'Cpl. Russo',voice:{pitch:1.0,rate:1.08}},
 Kowalski:{es:'Kowalski',en:'Kowalski',voice:{pitch:0.9,rate:1.0}},'Díaz':{es:'Díaz',en:'Diaz',voice:{pitch:1.1,rate:1.05}},
 Brennan:{es:'Sgto. Brennan',en:'Sgt. Brennan',voice:{pitch:0.75,rate:0.98}},Whitaker:{es:'Tte. Whitaker',en:'Lt. Whitaker',voice:{pitch:0.95,rate:0.95}},
 radio:{es:'Radio',en:'Radio',voice:{pitch:1.0,rate:1.1}},axis:{es:'Alemán',en:'German',voice:{pitch:0.9,rate:1.05,lang:'de'}}};
const SQUAD=[{name:'Hayes',kind:'rifle',hero:true},{name:'Russo',kind:'smg',hero:true}];
const SQUAD4=[{name:'Hayes',kind:'rifle',hero:true},{name:'Russo',kind:'smg',hero:true},{name:'Kowalski',kind:'mg',hero:true},{name:'Díaz',kind:'rifle',hero:true}];

// ---------- ayudantes de escenario ----------
// distancia de (x,z) a una polilínea [[x,z],...] y a una lista de ellas
function polyDist(x,z,P){let b=1e9;for(let i=0;i<P.length-1;i++){const ax=P[i][0],az=P[i][1],dx=P[i+1][0]-ax,dz=P[i+1][1]-az,l2=dx*dx+dz*dz||1,t=clamp(((x-ax)*dx+(z-az)*dz)/l2,0,1),d=Math.hypot(x-ax-dx*t,z-az-dz*t);if(d<b)b=d;}return b;}
const roadsD=(x,z,R)=>{let b=1e9;for(const r of R){const d=polyDist(x,z,r);if(d<b)b=d;}return b;};
// color de suelo (como el de World, con paleta propia) + caminos
function soil(P,x,z,n,depth){const m=fbm2(x*0.03,z*0.03,7,3);let c=mixC(P[0],P[1],smooth((m-0.35)*2.2));
 c=mixC(c,P[2],Math.max(smooth((0.93-n[1])/0.2)*0.8,depth>0.12?smooth(depth/0.7)*0.85:0));const k=0.93+0.12*vnoise(x*0.27,z*0.27,3);return [c[0]*k,c[1]*k,c[2]*k];}
function roadCol(c,d,w,rc){const k=(1-smooth((d-w)/1.6))*0.9;if(k<=0)return c;const r=hex(rc),v=0.92+0.12*vnoise(c[0]*40+d,d*3,5);return mixC(c,[r[0]*v,r[1]*v,r[2]*v],k);}
// fila de objetos iguales: row('tree', [[x,z],...], {kind:'pine'})
const row=(t,pts,o)=>pts.map(([x,z],i)=>Object.assign({t,x,z},typeof o==='function'?o(i):o||{}));
// lancha con rampa: [casco, rampa(id)]
const lcvp=(x,z,yaw,y,id,open)=>[{t:'lcvp',x,z,yaw,y},{t:'lcvpramp',id,x,z,yaw,y,open}];
// zonas de dianas: punto de la primera diana en pie con esa etiqueta
function targetPt(tag){for(const c of World.cols)if(c.tag===tag&&!c.dead)return [c.x,c.y+0.3,c.z];return null;}
function targetsLeft(tag){let n=0;for(const c of World.cols)if(c.tag===tag&&!c.dead)n++;return n;}
// textos dinámicos de objetivos: {es,en} con funciones
const dyn=(es,en)=>({get es(){return es();},get en(){return en();}});

// ---------- frases de guion: {clave:{who, es, en, de?}} (Voice.say(who, clave) las busca aquí) ----------
const LINES={
 // instrucción
 tr_intro:{who:'Brennan',es:'¡Atención, recluta! Soy el sargento Brennan. En tres semanas cruzáis el Canal, así que hoy aprendes o te quedas en Inglaterra.',en:'Listen up, recruit! I am Sergeant Brennan. In three weeks you cross the Channel, so today you learn or you stay in England.'},
 tr_lane:{who:'Brennan',es:'Empieza por la pista. Ve hasta la entrada, a paso ligero.',en:'Start with the lane. Get to the entrance, on the double.'},
 tr_crouch:{who:'Brennan',es:'Agáchate para pasar bajo las barreras. Si levantas la cabeza en Francia, te la vuelan.',en:'Crouch to get under the bars. Raise your head in France and they will blow it off.'},
 tr_jump:{who:'Brennan',es:'Ahora salta esos troncos. ¡Arriba!',en:'Now jump those logs. Up!'},
 tr_range:{who:'Brennan',es:'Bien. A la línea de tiro. Coge posición junto a los sacos.',en:'Good. To the firing line. Take position by the sandbags.'},
 tr_hip:{who:'Brennan',es:'Dianas a quince metros. Dispara desde la cadera: rápido, sin pensar.',en:'Targets at fifteen yards. Fire from the hip: quick, no thinking.'},
 tr_ads:{who:'Brennan',es:'Las lejanas necesitan puntería. Apunta con el alza y aprieta el gatillo despacio.',en:'The far ones need aim. Use your sights and squeeze the trigger slowly.'},
 tr_reload:{who:'Brennan',es:'Recarga antes de que se vacíe. El Garand canta cuando escupe el peine, y el enemigo también lo oye.',en:'Reload before it runs dry. The Garand pings when the clip flies out, and the enemy hears it too.'},
 tr_pick:{who:'Brennan',es:'Coge la Thompson de la mesa. En combate recogerás lo que encuentres.',en:'Pick up the Thompson from the table. In combat you will grab whatever you find.'},
 tr_smg:{who:'Brennan',es:'Nuevas dianas. Ráfagas cortas, que la Thompson se te sube.',en:'New targets. Short bursts, the Thompson climbs on you.'},
 tr_nades:{who:'Brennan',es:'Zona de granadas. Lanza tres dentro del círculo. Quita la anilla, cuenta y lanza.',en:'Grenade range. Put three inside the circle. Pull the pin, count, throw.'},
 tr_nadeOk:{who:'Brennan',es:'¡Dentro!',en:'Inside!'},
 tr_charge:{who:'Brennan',es:'Ese camión viejo es tuyo. Coloca una carga, mantén pulsado y apártate.',en:'That old truck is yours. Plant a charge, hold it down and get clear.'},
 tr_boom:{who:'Brennan',es:'Eso sí es un ruido bonito.',en:'Now that is a pretty noise.'},
 tr_course:{who:'Brennan',es:'Para terminar, la carrera de obstáculos. Tienes setenta y cinco segundos. ¡Al cruzar la salida empieza el reloj!',en:'To finish, the obstacle course. You have seventy-five seconds. The clock starts at the line!'},
 tr_slow:{who:'Brennan',es:'¡Demasiado lento! Vuelve a la salida y otra vez.',en:'Too slow! Back to the start and again.'},
 tr_done:{who:'Brennan',es:'No está mal para un recluta. Preséntate al teniente junto a los camiones.',en:'Not bad for a recruit. Report to the lieutenant by the trucks.'},
 tr_end:{who:'Whitaker',es:'Así que tú eres el nuevo. Bienvenido a la compañía. Nos vamos a Normandía.',en:'So you are the new man. Welcome to the company. We are going to Normandy.'},
 // playa
 bc_30:{who:'radio',es:'¡Treinta segundos! ¡Preparados!',en:'Thirty seconds! Get ready!'},
 bc_hayes1:{who:'Hayes',es:'Cuando caiga la rampa, no os paréis. ¡Al muro y a cubierto!',en:'When the ramp drops, do not stop. To the seawall and get down!'},
 bc_russo1:{who:'Russo',es:'Dios mío, mirad la playa...',en:'God almighty, look at that beach...'},
 bc_ramp:{who:'Hayes',es:'¡Rampa abajo! ¡Fuera, fuera, fuera!',en:'Ramp down! Out, out, out!'},
 bc_mg:{who:'Díaz',es:'¡Ametralladoras en la loma! ¡Agachaos!',en:'Machine guns on the bluff! Keep your heads down!'},
 bc_arty:{who:'Kowalski',es:'¡Artillería! ¡Al suelo!',en:'Artillery! Hit the dirt!'},
 bc_move:{who:'Hayes',es:'¡Si os quedáis en la arena estáis muertos! ¡De obstáculo en obstáculo!',en:'Stay on this sand and you are dead! Obstacle to obstacle!'},
 bc_wall:{who:'Hayes',es:'¡Al muro! ¡Necesito un torpedo bangalore en esa alambrada!',en:'At the wall! I need a bangalore on that wire!'},
 bc_bang:{who:'Hayes',es:'Tú, mételo bajo la alambrada y apártate.',en:'You, shove it under the wire and get clear.'},
 bc_breach:{who:'Hayes',es:'¡Brecha abierta! ¡Arriba, a la trinchera!',en:'Breach is open! Up, into the trench!'},
 bc_trench:{who:'Russo',es:'¡Trinchera llena de alemanes! ¡Granada!',en:'Trench is full of krauts! Grenade!'},
 bc_nestW:{who:'Hayes',es:'Ese nido de la izquierda está masacrando la playa. Rodéalo y vuélalo por la puerta de atrás.',en:'That nest on the left is slaughtering the beach. Get around it and blow it through the back door.'},
 bc_nestW2:{who:'Kowalski',es:'¡Nido oeste destruido!',en:'West nest is down!'},
 bc_nestE:{who:'Hayes',es:'Ahora el de la derecha. Por la trinchera, ¡vamos!',en:'Now the one on the right. Through the trench, go!'},
 bc_nestE2:{who:'Díaz',es:'¡Se acabó la ametralladora! ¡La playa respira!',en:'That gun is finished! The beach can breathe!'},
 bc_cmd:{who:'Hayes',es:'Queda el búnker de mando en lo alto. Limpiadlo.',en:'The command bunker up top is left. Clear it out.'},
 bc_exit:{who:'Hayes',es:'Hay que asegurar la salida de la playa antes de que traigan refuerzos.',en:'We have to secure the beach exit before they bring up reinforcements.'},
 bc_counter:{who:'Russo',es:'¡Contraataque por la carretera!',en:'Counterattack on the road!'},
 bc_end:{who:'Hayes',es:'Salida asegurada. Lo hemos conseguido... los que quedamos.',en:'Exit secured. We made it... those of us who are left.'},
 // Sainte-Mère-Église
 sm_alone:{who:'radio',es:'(Has caído lejos de la zona de salto. Estás solo. El pueblo arde al noreste.)',en:'(You landed far from the drop zone. You are alone. The town is burning to the northeast.)'},
 sm_flash:{who:'Russo',es:'¡Alto! ¡Flash!',en:'Halt! Flash!'},
 sm_thunder:{who:'Russo',es:'¡Thunder! Vale, eres de los nuestros. Díaz, sal, es uno de la compañía.',en:'Thunder! Okay, you are one of ours. Diaz, come out, he is from the company.'},
 sm_hayes:{who:'Russo',es:'El sargento Hayes estaba junto a la iglesia. Hay que cruzar la calle del oeste.',en:'Sergeant Hayes was by the church. We have to get across the west street.'},
 sm_street:{who:'Díaz',es:'¡Patrulla en la calle!',en:'Patrol in the street!'},
 sm_meet:{who:'Hayes',es:'Ya era hora. Los alemanes se han hecho fuertes en las casas de la plaza. Sacadlos de ahí.',en:'About time. The Germans are holed up in the houses on the square. Get them out of there.'},
 sm_windows:{who:'Russo',es:'¡Cuidado con las ventanas de arriba!',en:'Watch the upstairs windows!'},
 sm_flak:{who:'Hayes',es:'Ese cañón antiaéreo está derribando nuestros aviones. Al este del pueblo. Vuélalo.',en:'That flak gun is shooting down our planes. East of town. Blow it.'},
 sm_flak2:{who:'Kowalski',es:'¡Adiós, cañón!',en:'So long, flak gun!'},
 sm_cross:{who:'Hayes',es:'Van a contraatacar desde el sur. Al cruce. Hay un bazuca junto a los sacos.',en:'They will counterattack from the south. To the crossroads. There is a bazooka by the sandbags.'},
 sm_baz:{who:'Hayes',es:'Coge el bazuca. Si viene un blindado, es tuyo.',en:'Take the bazooka. If armor shows up, it is yours.'},
 sm_wave:{who:'Díaz',es:'¡Ahí vienen!',en:'Here they come!'},
 sm_ht:{who:'Russo',es:'¡Semioruga! ¡Por la carretera!',en:'Halftrack! On the road!'},
 sm_end:{who:'Hayes',es:'El cruce es nuestro. Amanece. El pueblo es libre.',en:'The crossroads is ours. Dawn is coming. The town is free.'},
 // bocage
 bo_intro:{who:'Hayes',es:'Setos, setos y más setos. Cada campo es una fortaleza. Seguid el camino hundido.',en:'Hedges, hedges and more hedges. Every field is a fortress. Follow the sunken lane.'},
 bo_mg:{who:'Kowalski',es:'¡MG42 en el seto de la derecha!',en:'MG42 in the right hedge!'},
 bo_flank:{who:'Hayes',es:'No vayas de frente. Busca el hueco y flanquéala.',en:'Do not go straight at it. Find the gap and flank it.'},
 bo_farm:{who:'Hayes',es:'Bien. Cruzad los campos hasta la granja del oeste.',en:'Good. Cross the fields to the farm in the west.'},
 bo_sniper:{who:'Díaz',es:'¡Francotirador! ¡En el campanario!',en:'Sniper! In the bell tower!'},
 bo_sniper2:{who:'Hayes',es:'Acércate por los setos y tumba a ese tirador.',en:'Work up the hedges and take that shooter out.'},
 bo_sniperDown:{who:'Russo',es:'¡Francotirador abatido!',en:'Sniper down!'},
 bo_mgFarm:{who:'Hayes',es:'Han dejado una MG42 en la tapia de la granja. Úsala, vienen por el campo.',en:'They left an MG42 on the farm wall. Use it, they are coming across the field.'},
 bo_tank:{who:'Kowalski',es:'¡Carro de combate! ¡Por la carretera del este!',en:'Tank! On the east road!'},
 bo_baz:{who:'Hayes',es:'¡Coge el bazuca! ¡Dale en un costado o por detrás!',en:'Grab the bazooka! Hit it in the side or the rear!'},
 bo_tankDown:{who:'Díaz',es:'¡El carro está ardiendo!',en:'The tank is burning!'},
 bo_church:{who:'Hayes',es:'Al pueblo. Nos reagrupamos en la iglesia.',en:'Into the village. We regroup at the church.'},
 bo_end:{who:'Hayes',es:'Un campo menos. Quedan mil.',en:'One field down. A thousand to go.'},
 // Bastoña
 ba_intro:{who:'Hayes',es:'Hace un frío de mil demonios y nos tienen rodeados. Nadie retrocede. A la línea.',en:'It is cold as hell and we are surrounded. Nobody falls back. To the line.'},
 ba_cold:{who:'Russo',es:'No siento los pies. Ni las balas que nos quedan.',en:'I cannot feel my feet. Or the ammo we have left.'},
 ba_arty:{who:'Kowalski',es:'¡Artillería! ¡Estallan en los árboles!',en:'Incoming! They are bursting in the trees!'},
 ba_hole:{who:'Hayes',es:'¡Métete en un agujero! ¡La metralla de los árboles te parte en dos!',en:'Get in a hole! The tree bursts will cut you in half!'},
 ba_hold:{who:'Hayes',es:'Ya vienen tras el bombardeo. ¡Aguantad la línea!',en:'They are coming in behind the barrage. Hold the line!'},
 ba_wave2:{who:'Díaz',es:'¡Más por el bosque! ¡Con abrigos blancos!',en:'More in the woods! In white coats!'},
 ba_tiger:{who:'Russo',es:'¡Un Tiger! ¡Dios, es enorme!',en:'A Tiger! God, it is huge!'},
 ba_baz:{who:'Hayes',es:'El bazuca está en el pozo del centro. ¡Apúntale a los costados!',en:'The bazooka is in the center foxhole. Aim for the sides!'},
 ba_tigerDown:{who:'Kowalski',es:'¡El Tiger está muerto! ¡Lo has hecho!',en:'The Tiger is dead! You did it!'},
 ba_advance:{who:'Hayes',es:'Ahora nos toca a nosotros. Al pueblo, por el bosque.',en:'Now it is our turn. To the village, through the woods.'},
 ba_church:{who:'Hayes',es:'Están en la iglesia. Tomadla.',en:'They are in the church. Take it.'},
 ba_end1:{who:'Hayes',es:'Se acabó. El pueblo es nuestro.',en:'It is over. The village is ours.'},
 ba_end2:{who:'Russo',es:'¿Habrá alguien en casa que sepa lo que ha costado esto?',en:'Will anyone back home know what this cost?'},
 ba_end3:{who:'Hayes',es:'Nosotros lo sabremos. Eso basta.',en:'We will know. That is enough.'},
 // supervivencia
 sv_wave:{who:'Hayes',es:'¡Otra oleada! ¡Aguantad!',en:'Another wave! Hold on!'},
 // alemanes
 de_alarm:{who:'axis',es:'¡Alarma! ¡Americanos!',en:'Alarm! Americans!',de:'Alarm! Amerikaner!'},
 de_fire:{who:'axis',es:'¡Fuego a discreción!',en:'Fire at will!',de:'Feuer frei!'},
 de_forward:{who:'axis',es:'¡Adelante! ¡Adelante!',en:'Forward! Forward!',de:'Vorwärts! Vorwärts!'},
 de_tank:{who:'axis',es:'¡El carro, adelante!',en:'Tank, move up!',de:'Panzer marsch!'}
};

// ---------- campo de pruebas ('test', el de las pruebas de humo) ----------
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
  usables:[{kind:'ammo',pos:[13.6,null,-11.2],text:{es:'coger munición',en:'take ammo'},short:{es:'Munición',en:'Ammo'},use:()=>{Weapons.refill();Bus.emit('ammo',{});}},
   {kind:'mg',pos:[18,null,8],yaw:0,arc:1.1,weapon:'mg42mount',text:{es:'usar la MG42',en:'use the MG42'},short:{es:'MG42',en:'MG42'},mountH:0.62}]};}
function rangeObjectives(){return [
 {text:{es:'Llega a la casa',en:'Reach the house'},marker:[10,null,-9.6],done:L=>!!L.flags.house,onStart:L=>{L.trigger({x:10,z:-6,r:4.5},()=>{L.flags.house=true;});}},
 {text:{es:'Elimina a todos los enemigos',en:'Eliminate all enemies'},marker:L=>{let b=null,bd=1e9;for(const a of Actors.list)if(a.alive&&a.tag==='range'){const d=V3.distXZ(a.pos,Player.pos);if(d<bd){bd=d;b=a.pos;}}return b;},
  done:L=>L.alive('range')===0,onStart:L=>{L.say('Hayes','contact');}}];}
function rangeScript(L){
 if(!L.restoring)L.wait(1.2,()=>L.say('Hayes','follow',{es:'Campo de pruebas. Llega a la casa y limpia la zona.',en:'Test range. Get to the house and clear the area.'}));
 if(!L.flags.spawned||L.restoring)L.spawn([{tag:'range',kind:'rifle',pos:[-8,17.5],yaw:Math.PI},{tag:'range',kind:'smg',pos:[6,27.5],yaw:Math.PI},{tag:'range',kind:'rifle',pos:[-3,10],yaw:Math.PI},
  {tag:'range',kind:'rifle',pos:[14,19],yaw:Math.PI},{tag:'range',kind:'smg',pos:[0,35],yaw:Math.PI},{tag:'range',kind:'rifle',pos:[-23,24.5],yaw:Math.PI+0.5}]);
 L.flags.spawned=true;
 if(!L.flags.gunDown)World.addUsable({kind:'charge',pos:[-23.2,null,36],r:2,hold:2,once:true,text:{es:'colocar la carga',en:'plant the charge'},short:{es:'Carga',en:'Charge'},
  use:()=>{L.hint({es:'¡Carga colocada! ¡Apártate!',en:'Charge planted! Get clear!'},3);L.wait(5,()=>{Weapons.explode([-24,World.height(-24,38)+1,38],6,300,Player,{charge:true});World.remove('gun1');L.flags.gunDown=true;});}});
 else World.remove('gun1');}
function mkRange(o){return Object.assign({env:ENVS.day,start:{pos:[0,-42],yaw:0},loadout:['garand','thompson','colt','frag:4'],squad:SQUAD,
 build:()=>rangeLayout(o.ground||'grass'),objectives:rangeObjectives(),script:rangeScript},o);}

// ======================= 1. CAMPO DE INSTRUCCIÓN (Inglaterra, mayo de 1944) =======================
// Campamento al sur (barracones, tiendas, camiones), pista de agacharse/saltar, galería de tiro al este, zona de granadas al oeste,
// camión para la carga y carrera de obstáculos cronometrada al norte. El sargento Brennan va de estación en estación.
const TR_ROADS=[[[0,-98],[0,-56],[0,-30],[0,30],[-38,56]],[[0,-56],[24,-30]],[[0,-56],[-24,-30]],[[-24,-30],[-44,-16]],[[0,30],[44,56]],[[0,-80],[12,-88],[40,-88]]];
const TR_GATES=[[-37,56,3],[-28,57.6,1.4],[-23,54.4,1.4],[-19,56,3],[-7.5,56,3],[5,56,3],[13,56,3],[26,56,3],[40,56,3]];
const TR_NADE=[-24,-3];
function trH(x,z){return 0.45*Math.sin(x*0.04)*Math.cos(z*0.035)+0.22*Math.sin(x*0.11+z*0.07)+16*smooth(Math.max(x-72,-66-x,z-78,-94-z,0)/95)+6*smooth(Math.max(x-90,-84-x,z-96,-112-z,0)/60)*fbm2(x*0.02,z*0.02,9,3);}
function trainingLayout(){const P=['#5b7d39','#728644','#6a5d44'],off=(x,z)=>roadsD(x,z,TR_ROADS)<3.2||Math.abs(x)<4&&z>-56&&z<-28||z>51&&z<61&&x>-42&&x<46;
 return {bounds:[-68,-96,74,78],
  terrain:{tex:'grass',h:trH,mods:[{t:'flat',x:0,z:-76,w:84,d:34,blend:8},{t:'flat',x:24,z:-12,w:24,d:36,blend:5},{t:'flat',x:2,z:56,w:92,d:12,blend:5},{t:'flat',x:-24,z:-12,w:18,d:24,blend:5},
    {t:'hill',x:24,z:33,r:8,h:4.2},{t:'hill',x:-50,z:30,r:14,h:2.5}],
   color:(x,z,n,y,dp)=>roadCol(soil(P,x,z,n,dp),roadsD(x,z,TR_ROADS),1.6,'#7d6b52'),surface:(x,z)=>roadsD(x,z,TR_ROADS)<1.8?'dirt':'grass'},
  props:[
   // campamento
   {t:'hut',x:-26,z:-82,yaw:Math.PI/2},{t:'hut',x:-26,z:-70,yaw:Math.PI/2},{t:'hut',x:28,z:-74,yaw:-Math.PI/2},
   ...row('tent',[[42,-82],[48,-82],[54,-82],[42,-74],[48,-74],[54,-74]],{yaw:Math.PI/2}),
   {t:'wreck',kind:'truck',burnt:false,x:14,z:-91,yaw:Math.PI/2},{t:'wreck',kind:'truck',burnt:false,x:22,z:-91,yaw:Math.PI/2,cover:false},{t:'wreck',kind:'jeep',burnt:false,x:6,z:-86,yaw:0.4},
   {t:'table',x:-5,z:-66,maps:true,radio:true},{t:'crate',x:-18,z:-64,n:3},{t:'crate',x:-17,z:-88,n:2},{t:'barrel',x:-19,z:-76},{t:'barrel',x:-19.6,z:-75.4},{t:'barrel',x:-18.8,z:-75},
   {t:'sandbags',x:-12,z:-58,len:6},{t:'signpost',x:3,z:-58},{t:'bales',x:34,z:-64,n:5},
   {t:'poles',pts:[[-5,-96],[-5,-30],[-5,24]]},
   // pista: barreras y troncos
   {t:'fence',x:-2.7,z:-41,yaw:Math.PI/2,len:22},{t:'fence',x:2.7,z:-41,yaw:Math.PI/2,len:22},
   {t:'barrier',x:0,z:-47,w:5.2},{t:'barrier',x:0,z:-44,w:5.2},{t:'vault',x:0,z:-38,len:5.2},{t:'vault',x:0,z:-34,len:5.2,h:0.95},
   // galería de tiro
   {t:'sandbags',x:24,z:-21,len:22,rows:2},{t:'table',x:32,z:-25.5,chairs:false},{t:'crate',x:35,z:-26,s:0.7,n:2},
   ...row('target',[[19,-8],[25,-6],[31,-8]],{tag:'near'}),...row('target',[[15,18],[21,20],[27,18]],{tag:'far'}),
   {t:'wall',x:24,z:27,len:22,h:2.4,mat:'wood',th:0.3},{t:'fence',x:12,z:4,yaw:Math.PI/2,len:46},{t:'fence',x:36,z:4,yaw:Math.PI/2,len:46},
   // granadas
   {t:'sandbags',x:-24,z:-20,len:6,rows:3},{t:'crater',x:TR_NADE[0],z:TR_NADE[1],r:3,d:0.5},{t:'sandbags',x:TR_NADE[0],z:TR_NADE[1],r:3.6,a0:-3.0,a1:3.0,rows:1},
   {t:'barrel',x:-27.5,z:1.5},{t:'tree',x:-31,z:6,kind:'split'},{t:'crater',x:-20,z:3,r:1.6,d:0.4},{t:'crater',x:-28,z:-8,r:1.4,d:0.4},
   // camión para la carga
   {t:'wreck',id:'oldtruck',kind:'truck',x:-45,z:-12,yaw:0.4},
   // carrera de obstáculos (de oeste a este)
   {t:'fence',x:2,z:53,len:84},{t:'fence',x:2,z:59,len:84},
   {t:'box',x:-28,z:54.75,w:0.4,h:1.6,d:3.5,mat:'wood'},{t:'box',x:-23,z:57.25,w:0.4,h:1.6,d:3.5,mat:'wood'},
   {t:'vault',x:-15,z:56,yaw:Math.PI/2,len:6},{t:'vault',x:-11,z:56,yaw:Math.PI/2,len:6,h:0.95},
   {t:'barrier',x:-3,z:56,yaw:Math.PI/2,w:6},{t:'barrier',x:1,z:56,yaw:Math.PI/2,w:6},
   {t:'trench',pts:[[9,51.5],[9,60.5]],w:1.8,d:0.8},
   {t:'stairs',x:17,z:56,yaw:Math.PI/2,w:3,h:1.5,d:3,mat:'wood'},{t:'box',x:20.6,z:56,w:4.2,h:1.5,d:4,mat:'wood'},
   {t:'sandbags',x:44,z:56,yaw:Math.PI/2,len:5},
   // setos alrededor, árboles, hierba
   {t:'hedgerow',pts:[[-66,-94],[-66,76],[72,76],[72,-94],[-66,-94]],h:3.2,gaps:[[3,0.53,7]],trees:11},
   {t:'scatter',x0:-150,z0:-170,x1:160,z1:170,n:140,minD:6,items:[{t:'tree',kind:'oak',w:3},{t:'tree',kind:'poplar'},{t:'tree',kind:'bush'}],avoid:(x,z)=>x>-74&&x<80&&z>-102&&z<84},
   {t:'scatter',x0:-60,z0:-52,x1:66,z1:72,n:22,minD:8,items:[{t:'tree',kind:'oak',w:3},{t:'tree',kind:'bush',w:2}],avoid:(x,z)=>off(x,z)||(x>8&&x<40&&z>-28&&z<36)||(x>-34&&x<-14&&z>-24&&z<6)||(x>-52&&x<-38&&z>-20&&z<-4)},
   {t:'tufts',x0:-64,z0:-92,x1:70,z1:74,n:900,avoid:off},
   {t:'tufts',x0:-64,z0:-92,x1:70,z1:74,n:60,type:'bush',cols:['#5a7a3a','#4e6e34'],avoid:(x,z)=>off(x,z)||(x>8&&x<40&&z>-28&&z<36),clear:1.5}
  ]};}
const M_TRAINING={id:'training',name:{es:'Campo de instrucción',en:'Boot camp'},place:{es:'Inglaterra',en:'England'},date:'Mayo de 1944',env:ENVS.england,
 brief:{es:'Campamento del sur de Inglaterra. El sargento Brennan tiene una mañana para enseñarte a moverte, disparar, lanzar granadas y volar cosas. Luego, la carrera de obstáculos contra el reloj.',
  en:'A camp in southern England. Sergeant Brennan has one morning to teach you to move, shoot, throw grenades and blow things up. Then, the obstacle course against the clock.'},
 start:{pos:[0,-76],yaw:0},loadout:['garand','colt','frag:4'],
 squad:[{name:'Brennan',kind:'officer',weapon:'thompson',hero:true,frozen:true,pos:[1.5,-70],yaw:Math.PI},{name:'Whitaker',kind:'officer',weapon:'thompson',hero:true,frozen:true,pos:[9,-83],yaw:-1.2},
  {name:'Recluta',kind:'rifle',hero:true,frozen:'still',pos:[15.5,-22.6],yaw:0},{name:'Recluta',kind:'rifle',hero:true,frozen:'still',pos:[33.5,-22.6],yaw:0},{name:'Recluta',kind:'smg',hero:true,frozen:'still',pos:[-12,-60],yaw:2.4}],
 build:trainingLayout,
 objectives:[
  {text:{es:'Ve a la entrada de la pista',en:'Go to the start of the lane'},reach:[0,-54,3],onStart:L=>{if(!L.restoring)L.run(L.talk(['tr_intro',0.5,'tr_lane']));}},
  {text:{es:'Pasa agachado bajo las barreras',en:'Crouch under the bars'},reach:[0,-41.5,2.4],onStart:L=>{trBrennan(L,4.5,-46);L.say('tr_crouch');}},
  {text:{es:'Salta los troncos',en:'Jump over the logs'},reach:[0,-30.5,2.6],onStart:L=>L.say('tr_jump')},
  {text:{es:'Ve a la línea de tiro',en:'Go to the firing line'},reach:[24,-23,2.6],onStart:L=>{trBrennan(L,21,-26);L.say('tr_range');}},
  {text:dyn(()=>'Derriba las dianas cercanas ('+(3-targetsLeft('near'))+'/3)',()=>'Knock down the near targets ('+(3-targetsLeft('near'))+'/3)'),hip:true,aimMax:80,
   done:L=>targetsLeft('near')===0,aim:()=>targetPt('near'),onStart:L=>L.say('tr_hip')},
  {text:dyn(()=>'Apunta y derriba las dianas lejanas ('+(3-targetsLeft('far'))+'/3)',()=>'Aim down the sights at the far targets ('+(3-targetsLeft('far'))+'/3)'),aimMax:80,
   done:L=>targetsLeft('far')===0,aim:()=>targetPt('far'),onStart:L=>L.say('tr_ads')},
  {text:{es:'Recarga el arma',en:'Reload your weapon'},flag:'reloaded',onStart:L=>{L.flags.reloaded=false;L.say('tr_reload');},
   bot:(L,c,B,dt)=>{const w=Weapons.cur(),d=Weapons.def();if(!w||Weapons.st!=='idle')return true;if(w.mag<d.mag){c.reload=true;return true;}
    B._turn(c,0,-0.12,dt);if(B.ft<=0&&Player.pitch<-0.08){c.fireDown=c.fire=true;B.ft=0.4;}return true;}},
  {text:{es:'Coge la Thompson de la mesa',en:'Pick up the Thompson from the table'},pickup:'thompson',marker:[32,null,-25.5],done:()=>Weapons.has('thompson'),
   onStart:L=>{if(!Weapons.has('thompson')&&!Weapons.pickups.some(q=>q.id==='thompson'))L.pickup('thompson',[32,-25.5],120);L.say('tr_pick');}},
  {text:dyn(()=>'Ráfagas cortas contra las dianas nuevas ('+(3-targetsLeft('smg'))+'/3)',()=>'Short bursts on the new targets ('+(3-targetsLeft('smg'))+'/3)'),aimMax:80,hip:true,
   done:L=>!!L.flags.smgUp&&targetsLeft('smg')===0,aim:()=>targetPt('smg'),
   onStart:L=>{if(!L.flags.smgUp){[[19,-12],[24,-13.5],[29,-12]].forEach(([x,z],i)=>World.addProp({t:'target',id:'tsmg'+i,x,z,tag:'smg'}));L.flags.smgUp=true;}L.say('tr_smg');}},
  {text:{es:'Ve a la zona de granadas',en:'Go to the grenade range'},reach:[-24,-22.5,2.6],onStart:L=>{trBrennan(L,-20.5,-24);Weapons.refill();}},
  {text:dyn(()=>'Lanza granadas dentro del círculo ('+(Game.L&&Game.L.flags.nades||0)+'/3)',()=>'Throw grenades into the circle ('+(Game.L&&Game.L.flags.nades||0)+'/3)'),
   marker:[-24,null,-21.5],lob:()=>[TR_NADE[0],World.height(TR_NADE[0],TR_NADE[1]),TR_NADE[1]],done:L=>(L.flags.nades||0)>=3,
   onStart:L=>{L.flags.nades=0;L.say('tr_nades');L.run(function*(){while((L.flags.nades||0)<3){if(Weapons.inv.nades<1&&!Weapons.grenades.length)Weapons.refill();yield 0.5;}});}},
  {text:{es:'Coloca una carga en el camión viejo',en:'Plant a charge on the old truck'},flag:'truck',
   onStart:L=>{trBrennan(L,-40,-20);L.say('tr_charge');if(!L.flags.truck&&!L.useOf('truckCharge'))L.charge({pos:[-43.3,-13.6],tag:'truckCharge',remove:'oldtruck',flag:'truck',
    swap:{t:'wreck',kind:'truck',x:-45,z:-12,yaw:0.9,smoke:true,fire:true,id:'oldtruck2'},onBoom:L=>L.say('tr_boom')});},marker:[-43.3,null,-13.6]},
  {text:dyn(()=>{const L=Game.L,g=L&&L.flags.g||0;return g?'Carrera: puerta '+Math.min(g,TR_GATES.length-1)+' de '+(TR_GATES.length-1):'Carrera de obstáculos: ve a la salida';},
    ()=>{const L=Game.L,g=L&&L.flags.g||0;return g?'Course: gate '+Math.min(g,TR_GATES.length-1)+' of '+(TR_GATES.length-1):'Obstacle course: go to the start line';}),
   flag:'course',direct:true,marker:L=>{const G=TR_GATES[Math.min(L.flags.g||0,TR_GATES.length-1)];return [G[0],null,G[1]];},
   onStart:L=>{trBrennan(L,-38,50);L.say('tr_course');L.flags.g=0;L.run(trCourse);}},
  {text:{es:'Preséntate al teniente Whitaker',en:'Report to Lieutenant Whitaker'},reach:[8,-81,3],onStart:L=>{trBrennan(L,42,52);L.say('tr_done');}}
 ],
 finale(L){L.run(function*(){yield* L.talk(['tr_end']);yield 1;L.complete();});},
 script(L){
  L.on('reload',d=>{if(d.by===Player)L.flags.reloaded=true;});
  L.on('explosion',d=>{if(d.by===Player&&L.objective&&L.objective.lob&&Math.hypot(d.pos[0]-TR_NADE[0],d.pos[2]-TR_NADE[1])<4.2){L.flags.nades=(L.flags.nades||0)+1;L.say('tr_nadeOk');}});
  if(L.flags.truck){World.remove('oldtruck');World.addProp({t:'wreck',kind:'truck',x:-45,z:-12,yaw:0.9,smoke:true,id:'oldtruck2'});}
  if(L.flags.smgUp&&L.restoring)L.flags.smgUp=false;
 }};
// Brennan se planta en cada estación
function trBrennan(L,x,z){const a=Actors.list.find(a=>a.name==='Brennan');if(!a)return;const p=World.nav.near([x,0,z],4);if(p){V3.copy(p,a.pos);V3.set(a.vel,0,0,0);}}
// carrera: salida, puertas en orden y 75 s; si se acaba el tiempo, vuelta a la salida
function* trCourse(L){for(;;){L.flags.g=0;yield ()=>L.near([TR_GATES[0][0],0,TR_GATES[0][1]],2.6);L.flags.g=1;L.timer('course',75,true);let fail=false;
 while(L.flags.g<TR_GATES.length){const G=TR_GATES[L.flags.g];if(Math.abs(Player.pos[0]-G[0])<1.3&&Math.abs(Player.pos[2]-G[1])<G[2])L.flags.g++;if(L.timer('course')<=0){fail=true;break;}yield 0;}
 const left=L.timer('course');L.stopTimer('course');if(!fail){L.flags.course=true;const u=(75-left).toFixed(1);L.hint({es:'¡Carrera superada en '+u+' s!',en:'Course passed in '+u+' s!'},4);return;}L.say('tr_slow');}}

// ======================= 2. PLAYA DE NORMANDÍA (6 de junio de 1944, amanecer) =======================
// Mar al sur (z<-38, agua y=0), playa de arena que sube hasta el malecón (z=20.5) con brecha en x=-4, loma con trincheras, dos nidos de MG42
// (oeste y este), búnker de mando arriba y salida por la carretera al norte. Lanchas de desembarco en el agua y barcos en la niebla.
const BC_BREACH=-4,BC_ROADS=[[[-4,23],[-3,40],[0,58],[0,108]],[[0,72],[-30,80],[-60,84]]];
function bcH(x,z){let h;if(z<-38)h=-0.32-(-38-z)*0.034;else if(z<=20.2)h=-0.32+(z+38)*0.04+0.1*Math.sin(x*0.15+z*0.31)*smooth((z+34)/10);
 else h=4.25+8.2*smooth((z-27)/27)+0.5*(fbm2(x*0.05,z*0.05,4,3)-0.5)*smooth((z-24)/6);
 const ax=Math.abs(x);h+=16*smooth((ax-56)/34)*smooth((z+70)/50)+(z>20?3*smooth((ax-40)/30):0);return h;}
function bcCol(x,z,n,y,dp){const sand=['#c4b08a','#b5a07a','#8e7d61'],grass=['#6d7a45','#7f7d4e','#6a5d44'],wet=z<-30?smooth((-30-z)/8):0;
 let c;if(z<20.6){c=soil(sand,x,z,n,dp);c=mixC(c,[0.5,0.47,0.4],wet*0.55+(y<0.3?0.25:0));if(z>14)c=mixC(c,[0.55,0.53,0.5],smooth((z-14)/5)*0.6);}
 else{c=soil(grass,x,z,n,dp);c=mixC(c,hex('#b4a37c'),smooth((27-z)/4)*0.6);}
 return roadCol(c,roadsD(x,z,BC_ROADS),2.2,'#857558');}
function beachLayout(){const r=mulberry32(44),P=[],rnd=(a,b)=>a+(b-a)*r();
 // obstáculos de playa en bandas (dejando libre el pasillo de la brecha a ratos)
 for(let i=0;i<34;i++){const x=rnd(-50,50),z=rnd(-26,-2);P.push({t:'hedgehog',x,z,s:0.9+r()*0.3});}
 for(let i=0;i<24;i++)P.push({t:'obstacle',k:'stake',x:rnd(-50,50),z:rnd(-36,-27),yaw:Math.PI+rnd(-0.4,0.4)});
 for(let i=0;i<10;i++){P.push({t:'obstacle',k:'logramp',x:rnd(-46,46),z:rnd(-20,-10),yaw:Math.PI+rnd(-0.3,0.3)});}
 for(let i=0;i<9;i++){const x=-48+i*12+rnd(-2,2);if(Math.abs(x-BC_BREACH)<6)continue;P.push({t:'wire',x,z:rnd(9,13),len:rnd(6,9),yaw:rnd(-0.2,0.2)});}
 for(let i=0;i<18;i++)P.push({t:'crater',x:rnd(-50,50),z:rnd(-30,14),r:rnd(1.6,3.2),d:rnd(0.5,1.0)});
 for(let i=0;i<14;i++)P.push({t:'crater',x:rnd(-45,45),z:rnd(26,60),r:rnd(1.5,2.8),d:rnd(0.5,1.1)});
 return {bounds:[-66,-76,66,110],water:{y:0,col:'#46564f'},
  terrain:{tex:'sand',h:bcH,color:bcCol,surface:(x,z)=>z<20.6?'sand':roadsD(x,z,BC_ROADS)<2.5?'dirt':'grass',
   mods:[{t:'flat',x:-24,z:47,w:10,d:9,blend:4},{t:'flat',x:24,z:48,w:10,d:9,blend:4},{t:'flat',x:2,z:66,w:14,d:11,blend:5}]},
  props:[
   // lanchas: la del jugador (rampa 'ramp0') y dos más con la rampa ya abajo
   ...lcvp(0,-60,0,0.4,'ramp0'),...lcvp(-15,-64,0.08,0.4,'ramp1',true),...lcvp(14,-67,-0.06,0.4,'ramp2',true),
   {t:'lcvp',x:-38,z:-37,yaw:0.5,y:0.6,col:'#4a524c'},{t:'fx',x:-38,z:-36,kind:'smoke',size:1.4,h:1,col:[0.18,0.17,0.16],rate:3,life:9},
   {t:'lcvp',x:40,z:-41,yaw:-0.3,y:0.5,col:'#4a524c'},
   {t:'ship',x:-70,z:-260,yaw:1.4,len:110,kind:'transport'},{t:'ship',x:60,z:-230,yaw:1.7,len:80},{t:'ship',x:170,z:-300,yaw:1.5,len:120,kind:'transport'},{t:'ship',x:-190,z:-210,yaw:1.6,len:75},
   // malecón con brecha y alambrada que hay que volar
   {t:'seawall',x:0,z:20.5,len:132,h:2.6,breach:{at:BC_BREACH,w:4.6},pt:'sw'},{t:'wire',id:'breachWire',x:BC_BREACH,z:17.2,len:7.5},
   // vehículos destruidos en la arena
   {t:'wreck',kind:'tank',x:-19,z:-9,yaw:0.35,smoke:true},{t:'wreck',kind:'halftrack',x:25,z:-15,yaw:-0.5,smoke:true,fire:true},{t:'wreck',kind:'jeep',x:9,z:4,yaw:1.2},
   {t:'wreck',kind:'tank',x:43,z:2,yaw:-0.2,turret:0.8},
   ...P,
   // loma: trincheras (con sacos hacia el mar), nidos y búnker de mando
   {t:'trench',pts:[[-46,36],[-36,34.5],[-26,37],[-18,35]],rampA:true,rampB:true,bags:1},
   {t:'trench',pts:[[-12,36],[-2,34.5],[8,37],[14,35]],rampA:true,rampB:true,bags:1},
   {t:'trench',pts:[[19,36.5],[30,34.5],[38,37],[47,35.5]],rampA:true,rampB:true,bags:1},
   {t:'bunker',x:-24,z:47,yaw:Math.PI,pt:'nW',slit:3.2},{t:'bunker',x:24,z:48,yaw:Math.PI,pt:'nE',slit:3.2},
   {t:'bunker',x:2,z:66,yaw:Math.PI,w:10,d:7,pt:'cb',slit:5},
   {t:'sandbags',x:-9,z:58,yaw:Math.PI,r:2,rows:3},{t:'sandbags',x:13,z:57,yaw:Math.PI,r:2,rows:3},{t:'foxhole',x:-34,z:52},{t:'foxhole',x:36,z:53},
   {t:'wire',x:-36,z:28,len:9},{t:'wire',x:30,z:28.5,len:10,yaw:0.1},{t:'wire',x:-14,z:29,len:7},{t:'wire',x:12,z:28,len:6},
   {t:'gun',x:-46,z:58,yaw:Math.PI-0.4},{t:'crate',x:-42,z:60,n:3},{t:'crate',x:8,z:72,n:2},{t:'barrel',x:-3,z:71},{t:'barrel',x:-3.6,z:71.6},
   // arriba: casa en ruinas, setos, postes, salida
   {t:'house',x:-22,z:88,yaw:0.2,w:8,d:6,mat:'stone',ruined:true},{t:'house',x:26,z:90,yaw:-0.3,w:7,d:6,mat:'stone',storeys:2,roofCol:'#5a4a42'},
   {t:'hedgerow',pts:[[-66,76],[-36,78]],h:3},{t:'hedgerow',pts:[[8,99],[66,96]],h:3},{t:'hedgerow',pts:[[-66,100],[-8,101]],h:3},
   {t:'poles',pts:[[6,40],[6,108]],every:24,broken:1},{t:'signpost',x:5,z:84},{t:'wreck',kind:'truck',x:-8,z:84,yaw:1.4,smoke:true},
   {t:'tufts',x0:-64,z0:24,x1:64,z1:108,n:900,cols:['#7f8a52','#8a8656','#6f7a46','#9a9060'],s:1.3,avoid:(x,z)=>roadsD(x,z,BC_ROADS)<3},
   {t:'tufts',x0:-60,z0:14,x1:60,z1:20,n:120,type:'rock',cols:['#8a8478','#7a756c'],s:0.18},
   {t:'scatter',x0:-150,z0:60,x1:150,z1:200,n:60,minD:8,items:[{t:'tree',kind:'oak'},{t:'tree',kind:'poplar'},{t:'tree',kind:'bush'}],avoid:(x,z)=>x>-70&&x<70&&z<112},
   {t:'fx',x:-20,z:30,kind:'smoke',size:2,h:0,col:[0.36,0.35,0.33],rate:3,life:12},{t:'fx',x:30,z:62,kind:'smoke',size:2.5,col:[0.2,0.19,0.18],rate:3,life:12}
  ]};}
const M_BEACH={id:'beach',name:{es:'Playa de Normandía',en:'Normandy beach'},place:{es:'Normandía, Francia',en:'Normandy, France'},date:'6 de junio de 1944',env:ENVS.beach,
 brief:{es:'Primera oleada. La rampa cae a cien metros de la orilla. Cruza la arena entre erizos y cráteres bajo el fuego de las ametralladoras, llega al malecón, abre la alambrada con un torpedo bangalore, destruye los dos nidos de MG42 y asegura la salida de la playa.',
  en:'First wave. The ramp drops a hundred yards out. Cross the sand between hedgehogs and craters under machine gun fire, reach the seawall, blow the wire with a bangalore, destroy both MG42 nests and secure the beach exit.'},
 start:{pos:[0,0.42,-62.5],yaw:0},loadout:['garand','colt','frag:4'],
 squad:[{name:'Hayes',kind:'rifle',hero:true,pos:[-0.9,0.42,-58.5]},{name:'Russo',kind:'smg',hero:true,pos:[0.9,0.42,-58.5]},{name:'Kowalski',kind:'mg',hero:true,pos:[-0.9,0.42,-60.5]},{name:'Díaz',kind:'rifle',hero:true,pos:[0.9,0.42,-60.5]}],
 build:beachLayout,
 objectives:[
  {text:{es:'Llega al malecón',en:'Reach the seawall'},marker:L=>L.flags.rampDown?[BC_BREACH,null,15.5]:null,done:L=>L.near([BC_BREACH,0,16],5),
   onStart:L=>{if(!L.restoring)L.run(bcLanding);else if(!L.flags.rampDown)L.run(bcLanding);
    L.trigger({x0:-60,z0:-14,x1:60,z1:-4},()=>L.checkpoint());L.trigger({x0:-60,z0:-30,x1:60,z1:-24},()=>L.say('bc_move'));}},
  {text:{es:'Coloca el torpedo bangalore bajo la alambrada',en:'Plant the bangalore under the wire'},flag:'wire',marker:[BC_BREACH,null,16.4],
   onStart:L=>{if(!L.restoring)L.run(L.talk(['bc_wall',0.4,'bc_bang']));L.charge({pos:[BC_BREACH,16.6],tag:'bangalore',text:{es:'colocar el torpedo bangalore',en:'place the bangalore'},fuse:4,radius:4,dmg:150,remove:'breachWire',flag:'wire',onBoom:L=>L.say('bc_breach')});}},
  {text:{es:'Sube por la brecha y limpia la trinchera',en:'Go up the breach and clear the trench'},kill:'trench',onStart:L=>{L.squadTo([[-6,30],[-2,31],[-8,32],[0,30]]);if(!L.restoring)L.wait(2,()=>L.say('bc_trench'));},onDone:L=>{L.flags.trenchDone=true;}},
  {text:{es:'Destruye el nido de ametralladora oeste',en:'Destroy the west machine gun nest'},marker:'nW.charge',done:L=>!!L.flags.nW||L.alive('mgW')===0,
   onStart:L=>{L.say('bc_nestW');bcNestCharge(L,'nW','mgW');},onDone:L=>bcNestDown(L,'nW','mgW','bc_nestW2')},
  {text:{es:'Destruye el nido de ametralladora este',en:'Destroy the east machine gun nest'},marker:'nE.charge',done:L=>!!L.flags.nE||L.alive('mgE')===0,
   onStart:L=>{L.say('bc_nestE');bcNestCharge(L,'nE','mgE');},onDone:L=>bcNestDown(L,'nE','mgE','bc_nestE2')},
  {text:{es:'Limpia el búnker de mando',en:'Clear the command bunker'},kill:'cmd',onStart:L=>{L.say('bc_cmd');if(L.barr0){L.barr0.stop();L.barr0=null;}
    L.spawn([{tag:'cmd',kind:'officer',pos:'cb.in',behavior:'hold'},{tag:'cmd',kind:'smg',pos:'cb.gun',behavior:'hold'},{tag:'cmd',kind:'rifle',pos:'cb.gun2',behavior:'hold'},
     {tag:'cmd',kind:'rifle',pos:[-9,59.5],behavior:'hold'},{tag:'cmd',kind:'smg',pos:[13,58.5],behavior:'hold'},{tag:'cmd',kind:'rifle',pos:[6,74],behavior:'advance',goal:[4,62]}]);}},
  {text:{es:'Asegura la salida de la playa',en:'Secure the beach exit'},reach:[0,92,7],onStart:L=>{L.say('bc_exit');L.squadTo([[-4,90],[4,90],[-8,86],[8,88]]);}},
  {text:{es:'Rechaza el contraataque',en:'Repel the counterattack'},done:L=>!!L.w7&&L.w7.done,marker:L=>L.nearest('exitW')||[0,null,92],stay:true,
   onStart:L=>{L.say('bc_counter');L.w7=L.wave({tag:'exitW',n:10,max:5,every:2.5,delay:2,from:[[-24,108],[-6,108],[10,108],[30,106]],kinds:['rifle','smg','rifle','mg'],goals:[[-6,94],[4,93],[0,90]],behavior:'advance'});}}
 ],
 finale(L){L.run(function*(){yield* L.talk(['bc_end']);yield 1.5;L.complete();});},
 script(L){
  if(L.flags.rampDown)L.ramp('ramp0',0.001);
  if(L.flags.wire)World.remove('breachWire');
  // defensores: trinchera y nidos (si siguen en pie)
  if(!L.flags.trenchDone)L.spawn([[-40,35.4],[-31,35.6],[-22,36],[-8,35.4],[3,35.4],[11,36],[24,35.6],[34,35.7],[43,36.2]].map((p,i)=>({tag:'trench',kind:i%3===1?'smg':'rifle',pos:p,face:[p[0],0],behavior:'hold',sight:90,alert:true})));
  for(const [n,tag] of [['nW','mgW'],['nE','mgE']]){if(L.flags[n]){bcNestSmoke(n);continue;}
   L.spawn([{tag,kind:'mg',weapon:'mg42mount',pos:n+'.gun',behavior:'mg',sight:140,alert:true},{tag,kind:'mg',weapon:'mg42mount',pos:n+'.gun2',behavior:'mg',sight:140,alert:true},{tag,kind:'rifle',pos:n+'.in',behavior:'hold'}]);}
  // fuego sobre la playa hasta que caigan los nidos
  if(!(L.flags.nW&&L.flags.nE))L.barr0=L.barrage({x0:-48,z0:-40,x1:48,z1:12},Infinity,1.5,{safe:8});
  // soldados de la primera oleada ya en la arena
  if(!L.flags.wire)L.spawn([[-30,-22],[-12,-28],[18,-24],[32,-18],[-40,-12],[6,-30]].map((p,i)=>({team:'ally',kind:i%2?'smg':'rifle',pos:p,tag:'gi',goal:[p[0]*0.6,17],behavior:'advance',face:[p[0],20]})));
 }};
function* bcLanding(L){L.flags.rampDown=false;const sea=()=>[(Math.random()-0.5)*60,0,-45-Math.random()*25];
 L.run(function*(){for(let i=0;i<5;i++){yield 1.3+Math.random();L.boom(sea(),5,0);}});
 yield* L.talk(['bc_30',0.6,'bc_hayes1','bc_russo1']);yield 1;L.say('bc_ramp');L.ramp('ramp0',1.1);L.flags.rampDown=true;yield 3;L.say('bc_mg');yield 6;L.say('bc_arty');}
function bcNestCharge(L,n,tag){if(L.flags[n]||L.useOf('ch_'+n))return;L.charge({pos:n+'.charge',tag:'ch_'+n,flag:n,radius:7,dmg:500,onBoom:L=>{}});}
function bcNestDown(L,n,tag,line){L.flags[n]=true;const u=L.useOf('ch_'+n);if(u)u.on=false;for(const a of Actors.list)if(a.alive&&a.tag===tag)Actors.damage(a,999,'torso',{by:Player,explosive:true});L.say(line);bcNestSmoke(n);
 if(L.flags.nW&&L.flags.nE&&L.barr0){L.barr0.stop();L.barr0=null;}}
function bcNestSmoke(n){const p=World.point(n+'.gun');if(p){FX.smoke([p[0],p[1]+1.6,p[2]],{size:1.2,rate:4,life:8,col:[0.15,0.14,0.13]});FX.fire([p[0],p[1]+0.2,p[2]],0.6);}}

// ======================= 3. SAINTE-MÈRE-ÉGLISE (noche del 5 al 6 de junio de 1944) =======================
// Plaza con la iglesia al norte (z 0..20), calle mayor este-oeste (z=-10), carretera al sur hasta el cruce (0,-64). Casas de dos plantas, tres ardiendo.
// El jugador cae en un campo del suroeste; Russo y Díaz están en el granero; el cañón antiaéreo está en un huerto al este.
const SM_ROADS=[[[-98,-10],[98,-10]],[[0,-10],[0,-98]],[[-98,-64],[98,-64]],[[0,-10],[0,4]],[[-56,-52],[-46,-30],[-40,-10]],[[30,-10],[50,8],[58,18]]];
const SM_CROSS=[0,-64];
function smH(x,z){return 0.35*Math.sin(x*0.05)*Math.cos(z*0.04)+0.2*Math.sin(x*0.13+z*0.09)+10*smooth(Math.max(Math.abs(x)-92,z-84,-96-z,0)/80);}
function smCol(x,z,n,y,dp){let c=soil(['#3f5a2f','#4f5f35','#5a4e3c'],x,z,n,dp);const d=roadsD(x,z,SM_ROADS);
 const sq=Math.max(Math.abs(x)-17,-22-z,z-2);if(sq<0)c=mixC(c,hex('#7d776a'),0.85*(1-smooth((sq+1.5)/1.5)));return roadCol(c,d,2.4,'#6e6655');}
function villageLayout(){const H=(x,z,yaw,o)=>Object.assign({t:'house',x,z,yaw,storeys:2,mat:'stone',col:['#b5aa94','#a89f8b','#bdb29a','#9f9784'][Math.abs(Math.round(x*7+z*3))%4],
  roofCol:['#5d5148','#6a4e40','#55504c'][Math.abs(Math.round(x+z))%3],lit:0.3,w:8,d:6},o||{}),PI=Math.PI,off=(x,z)=>roadsD(x,z,SM_ROADS)<3.5||(Math.abs(x)<18&&z>-24&&z<22);
 return {bounds:[-92,-94,92,82],
  terrain:{tex:'grass',h:smH,color:smCol,surface:(x,z)=>roadsD(x,z,SM_ROADS)<2.6||(Math.abs(x)<17&&z>-22&&z<2)?'stone':'grass',mods:[{t:'flat',x:0,z:0,w:44,d:46,blend:6}]},
  props:[
   {t:'church',x:0,z:12,yaw:PI,pt:'ch',lit:0.5},
   H(-21,-4,PI/2,{pt:'h1'}),H(-21,-17,PI/2,{pt:'h2'}),H(21,-4,-PI/2,{pt:'h3'}),H(21,-17,-PI/2,{pt:'h4'}),H(-10,-27,0,{w:9,pt:'h5'}),H(10,-27,0,{w:9,pt:'h6'}),
   H(-36,-3,PI,{pt:'h7'}),H(-48,-3,PI,{burnt:true,storeys:1,h:3.2}),H(-36,-17,0,{pt:'h9'}),H(-50,-17,0,{w:9}),
   H(36,-3,PI),H(48,-3,PI,{w:9}),H(36,-17,0,{burnt:true}),H(50,-17,0,{storeys:1,h:3.2}),
   H(-11,-42,PI/2,{burnt:true,storeys:1,h:3.2,w:9}),H(11,-44,-PI/2,{pt:'h16'}),H(-14,-74,PI/2,{w:7,storeys:1,h:3}),
   H(-24,32,PI,{w:9}),H(22,30,PI,{w:8}),H(-48,22,0.3,{storeys:1,h:3.2}),H(46,-34,-PI/2,{storeys:1}),
   {t:'barn',x:-55,z:-45,yaw:PI,pt:'barn',w:9,d:12},{t:'haystack',x:-64,z:-52},{t:'cart',x:-48,z:-54,yaw:0.6,hay:true},
   {t:'memorial',x:-7,z:-16},{t:'well',x:8,z:-17},{t:'tree',x:-14,z:-20,kind:'oak',s:0.9},{t:'tree',x:14,z:-1,kind:'oak',s:0.9},{t:'tree',x:-14,z:-1,kind:'oak',s:0.85},
   {t:'wall',x:-30,z:8,len:12,h:1.4,mat:'stone',cap:false},{t:'wall',x:30,z:8,len:12,h:1.4,mat:'stone',cap:false},{t:'wall',x:-11,z:-54,yaw:PI/2,len:14,h:1.2,mat:'stone',cap:false},
   {t:'poles',pts:[[-90,-6],[90,-6]],every:22},{t:'poles',pts:[[4,-12],[4,-94]],every:24,broken:2},
   {t:'chute',x:-70,z:-68,h:6,s:0.9},{t:'tree',x:-70,z:-68,kind:'oak',s:1.2},{t:'chute',x:9,z:4,h:21,s:0.7,col:'#b9b3a0'},
   // cañón antiaéreo en el huerto del este
   {t:'flak',id:'fk',x:60,z:22,aim:-0.6},{t:'crate',x:64,z:18,n:3},{t:'crate',x:56,z:27,n:2},{t:'wreck',kind:'truck',burnt:false,x:66,z:28,yaw:2.2,col:'#4f554a'},
   {t:'scatter',x0:44,z0:8,x1:80,z1:40,n:22,minD:5,items:[{t:'tree',kind:'oak',s:0.75}],avoid:(x,z)=>Math.hypot(x-60,z-22)<7},
   // cruce del sur: sacos, camión cruzado, munición
   {t:'sandbags',x:-4,z:-69,yaw:PI,r:2.4,rows:3},{t:'sandbags',x:6,z:-68,yaw:PI,r:2.2,rows:3},{t:'wreck',kind:'truck',x:9,z:-74,yaw:1.25,smoke:true},{t:'ammo',x:-1,z:-60},
   {t:'signpost',x:4,z:-60},{t:'wreck',kind:'jeep',x:-20,z:-66,yaw:2.6},
   // setos de los campos
   {t:'hedgerow',pts:[[-92,-50],[-60,-50]],gaps:[[0,0.5,5]],h:3.4},{t:'hedgerow',pts:[[-50,-50],[-6,-50]],gaps:[[0,0.4,6]],h:3.4},{t:'hedgerow',pts:[[-32,-94],[-32,-54]],gaps:[[0,0.55,5]],h:3.4},
   {t:'hedgerow',pts:[[6,-50],[92,-50]],gaps:[[0,0.35,6]],h:3.4},{t:'hedgerow',pts:[[34,-94],[34,-56]],gaps:[[0,0.5,6]],h:3.4},
   {t:'hedgerow',pts:[[-92,-26],[-62,-26]],h:3},{t:'hedgerow',pts:[[62,-26],[92,-26]],h:3},
   {t:'scatter',x0:-170,z0:-170,x1:170,z1:170,n:120,minD:7,items:[{t:'tree',kind:'oak',w:3},{t:'tree',kind:'poplar'}],avoid:(x,z)=>x>-96&&x<96&&z>-98&&z<86},
   {t:'scatter',x0:-90,z0:-92,x1:90,z1:80,n:40,minD:7,items:[{t:'tree',kind:'oak',w:2},{t:'tree',kind:'bush',w:2},{t:'haystack'}],avoid:(x,z)=>off(x,z)||Math.abs(x)<60&&z>-24&&z<40||Math.hypot(x+55,z+45)<12},
   {t:'tufts',x0:-90,z0:-92,x1:90,z1:80,n:700,cols:['#4f6a36','#5a6e3c','#61703f'],avoid:(x,z)=>off(x,z)}
  ]};}
const M_VILLAGE={id:'village',name:{es:'Sainte-Mère-Église',en:'Sainte-Mère-Église'},place:{es:'Normandía, Francia',en:'Normandy, France'},date:'5-6 de junio de 1944',env:ENVS.night,
 brief:{es:'Saltaste de noche y el viento te dejó lejos de la zona prevista. Encuentra a tu escuadra, entra en el pueblo, limpia las casas de la plaza, vuela el cañón antiaéreo y defiende el cruce del sur hasta el amanecer.',
  en:'You jumped at night and the wind carried you far off the drop zone. Find your squad, get into town, clear the houses on the square, blow the flak gun and hold the south crossroads until dawn.'},
 start:{pos:[-76,-80],yaw:0.75},loadout:['thompson','colt','frag:3'],squad:[],build:villageLayout,
 objectives:[
  {text:{es:'Encuentra a tu escuadra: el granero',en:'Find your squad: the barn'},reach:[-55,-53,4.5],
   onStart:L=>{if(!L.restoring)L.wait(1.5,()=>L.say('sm_alone'));
    L.spawn([{tag:'field',kind:'rifle',pos:[-60,-66],route:[[-60,-66],[-40,-70],[-40,-58],[-60,-60]],behavior:'patrol',face:[-40,-70]},{tag:'field',kind:'rifle',pos:[-58,-64],route:[[-58,-64],[-38,-68]],behavior:'patrol'},
     {tag:'field',kind:'smg',pos:[-45,-82],route:[[-45,-82],[-70,-86],[-45,-82]],behavior:'patrol'}]);}},
  {text:{es:'Cruza a la calle del oeste',en:'Get across to the west street'},kill:'street1',
   onStart:L=>{smJoin(L,['Russo','Díaz'],[[-55,-47],[-53,-46]]);if(!L.restoring)L.run(L.talk(['sm_flash',0.3,'sm_thunder','sm_hayes']));
    L.spawn([{tag:'street1',kind:'rifle',pos:[-42,-11]},{tag:'street1',kind:'smg',pos:[-30,-9],behavior:'advance',goal:[-44,-20]},{tag:'street1',kind:'rifle',pos:'h9.w0',behavior:'hold'},
     {tag:'street1',kind:'rifle',pos:[-52,-10]},{tag:'street1',kind:'officer',pos:[-38,-12],behavior:'hold'}]);L.trigger({x:-44,z:-24,r:8},()=>L.say('sm_street'));}},
  {text:{es:'Reúnete con el sargento Hayes en la plaza',en:'Meet Sergeant Hayes on the square'},reach:[-13,-12,4],onStart:L=>{smJoin(L,['Russo','Díaz'],[[-40,-12],[-38,-14]]);smJoin(L,['Hayes'],[[-14,-13]]);}},
  {text:{es:'Limpia las casas de la plaza',en:'Clear the houses on the square'},kill:'houses',
   onStart:L=>{smJoin(L,['Hayes','Russo','Díaz'],[[-14,-13],[-15,-11],[-15,-15]]);if(!L.restoring)L.run(L.talk(['sm_meet',0.5,'sm_windows']));
    L.spawn([{tag:'houses',kind:'rifle',pos:'h3.w0',behavior:'hold'},{tag:'houses',kind:'smg',pos:'h3.in',behavior:'hold'},{tag:'houses',kind:'rifle',pos:'h4.w1',behavior:'hold'},
     {tag:'houses',kind:'smg',pos:'h4.in',behavior:'hold'},{tag:'houses',kind:'rifle',pos:'h6.w0',behavior:'hold'},{tag:'houses',kind:'rifle',pos:'h6.in',behavior:'hold'},
     {tag:'houses',kind:'mg',pos:[6,-20],behavior:'hold'},{tag:'houses',kind:'rifle',pos:[13,-12],behavior:'advance',goal:[0,-12]}]);}},
  {text:{es:'Destruye el cañón antiaéreo',en:'Destroy the flak gun'},flag:'flak',marker:'fk.charge',
   onStart:L=>{L.say('sm_flak');L.squadTo([[46,6],[48,4],[44,8]]);if(!L.useOf('ch_flak'))L.charge({pos:'fk.charge',tag:'ch_flak',flag:'flak',remove:'fk',swap:{t:'flak',x:60,z:22,aim:-0.6,broken:true,id:'fk2'},onBoom:L=>L.say('sm_flak2')});
    L.spawn([{tag:'flak',kind:'rifle',pos:[58,19],behavior:'hold'},{tag:'flak',kind:'rifle',pos:[62,25],behavior:'hold'},{tag:'flak',kind:'officer',pos:[57,26]},{tag:'flak',kind:'smg',pos:[52,12],behavior:'advance',goal:[44,2]},{tag:'flak',kind:'rifle',pos:[68,14]}]);}},
  {text:{es:'Ve al cruce del sur',en:'Get to the south crossroads'},reach:[0,-60,5],onStart:L=>{L.say('sm_cross');L.squadTo([[-4,-66],[6,-66],[0,-58]]);}},
  {text:{es:'Coge el bazuca',en:'Pick up the bazooka'},pickup:'bazooka',done:()=>Weapons.has('bazooka'),marker:L=>{const q=Weapons.pickups.find(q=>q.id==='bazooka');return q?q.pos:[2,null,-61];},
   onStart:L=>{if(!Weapons.has('bazooka')&&!Weapons.pickups.some(q=>q.id==='bazooka'))L.pickup('bazooka',[2.2,-61],6);L.say('sm_baz');}},
  {text:{es:'Defiende el cruce',en:'Hold the crossroads'},flag:'held',stay:true,marker:L=>L.nearest(['ctr','ht'])||[0,null,-64],onStart:L=>L.run(smDefend)}
 ],
 finale(L){L.run(function*(){yield* L.talk(['sm_end']);yield 1.5;L.complete();});},
 script(L){
  if(!L.flags.flak)L.run(function*(){const p=[60,World.height(60,22)+1.6,22];for(;!L.flags.flak;){yield 0.09+Math.random()*0.12;if(Math.random()<0.7)FX.tracer(p,[p[0]-40+Math.random()*60,p[1]+110+Math.random()*60,p[2]+20+Math.random()*80]);
   if(Math.random()<0.02)L.boom([p[0]-60+Math.random()*120,p[1]+90+Math.random()*50,p[2]-30+Math.random()*120],4,0);}});
  else{World.remove('fk');World.addProp({t:'flak',x:60,z:22,aim:-0.6,broken:true,id:'fk2'});}
  // fogonazos lejanos de combates
  L.run(function*(){for(;;){yield 4+Math.random()*7;const a=Math.random()*6.28;L.boom([Math.sin(a)*150,4,Math.cos(a)*150],5,0);}});
 }};
// la escuadra se une (aparecen si aún no están)
function smJoin(L,names,pts){names.forEach((n,i)=>{if(Actors.list.some(a=>a.alive&&a.name===n))return;const def={Hayes:'rifle',Russo:'smg','Díaz':'rifle',Kowalski:'mg'}[n]||'rifle';
 L.spawn({team:'ally',name:n,kind:def,hero:true,pos:pts[i%pts.length],face:[Player.pos[0],Player.pos[2]]});});}
function* smDefend(L){if(L.flags.held)return;L.flags.waveA=L.flags.waveA||false;yield 3;L.say('sm_wave');
 const W1=L.wave({tag:'ctr',n:9,max:5,every:2.2,from:[[-26,-92],[0,-94],[24,-92],[-40,-80],[40,-82]],kinds:['rifle','smg','rifle','mg'],goals:[[-6,-70],[0,-72],[6,-70]],behavior:'advance'});
 yield ()=>W1.done;yield 4;L.say('sm_ht');const ht=L.tank({half:true,pos:[0,-93],yaw:0,route:[[0,-86],[0,-76]],tag:'ht'});
 const W2=L.wave({tag:'ctr',n:8,max:5,every:2.5,delay:2,from:[[-14,-92],[14,-92],[-36,-86],[36,-88]],kinds:['smg','rifle','assault','rifle'],goals:[[-5,-70],[5,-70]],behavior:'advance'});
 yield ()=>W2.done&&!ht.alive;L.flags.held=true;}

// ======================= 4. EL BOCAGE (Normandía, junio de 1944, día) =======================
// Camino hundido al sur entre setos (x=0), campo con una MG42 en el seto del norte, granja al noroeste con MG capturada, carretera este-oeste
// con chopos (z=22) por la que llega el carro, y el pueblo con la iglesia al norte (francotirador en el campanario).
const BO_ROADS=[[[0,-115],[0,-40],[-2,-10],[-6,12],[-8,22]],[[104,22],[-30,22],[-50,18]],[[-8,22],[2,60],[12,72]],[[12,72],[60,80],[104,84]]];
function boH(x,z){let h=0.8*Math.sin(x*0.022+1)*Math.cos(z*0.018)+0.3*Math.sin(x*0.07+z*0.05)+0.6*smooth((z-40)/50);
 if(z<-38)h-=1.1*(1-smooth((Math.abs(x)-1.8)/1.8))*smooth((-38-z)/4);return h+12*smooth(Math.max(Math.abs(x)-100,z-110,-114-z,0)/90);}
function boCol(x,z,n,y,dp){const fi=Math.floor((x+130)/52)*7+Math.floor((z+130)/48),k=((fi*2654435761)>>>0)%5;
 const pal=[['#5f8a3a','#73903f','#6a5d44'],['#b49d52','#c2a95c','#7a6a48'],['#5a8238','#6a8a3e','#6a5d44'],['#7a6a48','#6e5e40','#5a4c38'],['#66903d','#82974a','#6a5d44']][k];
 let c=soil(pal,x,z,n,dp);if(k===1||k===3){const s=Math.sin((k===1?x:z)*2.2);c=mixC(c,mixC(c,'#3a2e22',0.25),s>0.6?0.5:0);}
 return roadCol(c,roadsD(x,z,BO_ROADS),1.9,'#86745a');}
function bocageLayout(){const PI=Math.PI,off=(x,z)=>roadsD(x,z,BO_ROADS)<3;
 return {bounds:[-100,-114,100,112],
  terrain:{tex:'grass',h:boH,color:boCol,surface:(x,z)=>roadsD(x,z,BO_ROADS)<2.2?'dirt':'grass',mods:[{t:'flat',x:-50,z:35,w:36,d:36,blend:6},{t:'flat',x:10,z:86,w:40,d:30,blend:6}]},
  props:[
   // camino hundido y setos de los campos
   {t:'hedgerow',pts:[[-4.2,-114],[-4.2,-41]],h:3.8,gaps:[[0,0.62,3.5]]},{t:'hedgerow',pts:[[4.2,-114],[4.2,-41]],h:3.8},
   {t:'hedgerow',pts:[[-100,-40],[-4.2,-41]],gaps:[[0,0.72,5]],h:3.6},{t:'hedgerow',pts:[[4.2,-41],[100,-40]],gaps:[[0,0.4,5]],h:3.6},
   {t:'hedgerow',pts:[[-100,10],[-56,10]],h:3.6},{t:'hedgerow',pts:[[-46,10],[-10,10]],gaps:[[0,0.5,4]],h:3.6},{t:'hedgerow',pts:[[-2,10],[16,10]],h:3.6},{t:'hedgerow',pts:[[24,10],[100,10]],gaps:[[0,0.5,5]],h:3.6},
   {t:'hedgerow',pts:[[-60,-112],[-60,-40]],gaps:[[0,0.5,5]],h:3.4},{t:'hedgerow',pts:[[-60,-40],[-60,10]],gaps:[[0,0.5,5]],h:3.4},{t:'hedgerow',pts:[[50,-112],[50,-40]],h:3.4},{t:'hedgerow',pts:[[50,-40],[50,10]],gaps:[[0,0.55,5]],h:3.4},
   {t:'hedgerow',pts:[[-100,60],[-30,58]],gaps:[[0,0.3,5],[0,0.7,5]],h:3.4},{t:'hedgerow',pts:[[-24,58],[-6,60]],h:3.2},{t:'hedgerow',pts:[[30,62],[100,64]],gaps:[[0,0.4,6]],h:3.4},
   // la MG42 del seto norte del primer campo
   {t:'nest',x:20,z:7.5,yaw:PI,pt:'n1',r:1.7,rows:3},{t:'haystack',x:-14,z:-14},{t:'haystack',x:30,z:-22,s:0.9},{t:'cart',x:12,z:-6,yaw:1.1,hay:true},{t:'bales',x:-28,z:-2,yaw:0.3},
   {t:'wreck',kind:'jeep',x:-6,z:-32,yaw:0.7},
   // granja con patio y MG en la tapia norte
   {t:'house',x:-60,z:38,yaw:0,storeys:2,mat:'stone',col:'#b3a58a',roofCol:'#5b4a40',w:9,d:7,pt:'farm',smoke:true},{t:'barn',x:-38,z:42,yaw:-PI/2,w:10,d:13,pt:'fb'},
   {t:'wall',x:-61,z:18,len:12,h:1.4,mat:'stone',cap:false},{t:'wall',x:-38,z:18,len:12,h:1.4,mat:'stone',cap:false},{t:'wall',x:-68,z:35,yaw:PI/2,len:34,h:1.4,mat:'stone',cap:false},
   {t:'wall',x:-61,z:52,len:12,h:1.2,mat:'stone',cap:false},{t:'wall',x:-39,z:52,len:12,h:1.2,mat:'stone',cap:false},{t:'sandbags',x:-50,z:52.4,len:4,rows:3},
   {t:'well',x:-52,z:30},{t:'cart',x:-46,z:26,yaw:2.2},{t:'haystack',x:-30,z:30},{t:'ammo',x:-54,z:48},
   // carretera con chopos y pueblo
   ...row('tree',[[-20,26],[-4,26.5],[12,26],[28,26.5],[44,26],[60,26.5],[76,26],[92,26.5],[-20,17.5],[12,17.5],[44,17.5],[76,17.5]],{kind:'poplar'}),
   {t:'poles',pts:[[100,19],[-30,19]],every:26},{t:'signpost',x:-6,z:19},
   {t:'church',x:12,z:88,yaw:PI,pt:'ch',w:10,d:16},
   {t:'house',x:-10,z:80,yaw:PI/2,storeys:2,mat:'stone',w:8},{t:'house',x:34,z:82,yaw:-PI/2,storeys:2,mat:'stone',w:9,ruined:true},{t:'house',x:-8,z:98,yaw:PI/2,mat:'plaster',w:8,storeys:2},
   {t:'house',x:36,z:100,yaw:-PI/2,mat:'stone',w:8},{t:'house',x:58,z:76,yaw:PI,w:8,mat:'plaster'},{t:'memorial',x:12,z:72},{t:'wreck',kind:'truck',x:22,z:66,yaw:0.8,smoke:true},
   // árboles sueltos, flores y hierba
   {t:'scatter',x0:-200,z0:-200,x1:200,z1:220,n:150,minD:7,items:[{t:'tree',kind:'oak',w:3},{t:'tree',kind:'poplar'}],avoid:(x,z)=>x>-104&&x<104&&z>-118&&z<116},
   {t:'scatter',x0:-96,z0:-110,x1:96,z1:108,n:26,minD:9,items:[{t:'tree',kind:'oak',w:2},{t:'tree',kind:'bush',w:2},{t:'rock'}],avoid:(x,z)=>off(x,z)||(x>-70&&x<-30&&z>14&&z<56)||(x>-14&&x<44&&z>64)},
   {t:'tufts',x0:-98,z0:-112,x1:98,z1:110,n:1100,cols:['#6f9442','#83994b','#8d8a52','#a29f5c'],avoid:off},
   {t:'tufts',x0:-98,z0:-112,x1:98,z1:110,n:180,cols:['#d8d0c0','#e0c050','#c84a3a'],s:0.6,avoid:off}
  ]};}
const M_BOCAGE={id:'bocage',name:{es:'El bocage',en:'The bocage'},place:{es:'Normandía, Francia',en:'Normandy, France'},date:'Junio de 1944',env:ENVS.summer,
 brief:{es:'Los setos de Normandía convierten cada campo en una fortaleza. Sube por el camino hundido, silencia la MG42 del seto, cruza hasta la granja, elimina al francotirador del campanario, aguanta el contraataque con la MG capturada y destruye el carro que viene por la carretera.',
  en:'The Normandy hedgerows turn every field into a fortress. Push up the sunken lane, silence the MG42 in the hedge, cross to the farm, kill the bell tower sniper, hold the counterattack with the captured MG and destroy the tank coming down the road.'},
 start:{pos:[0,-104],yaw:0},loadout:['garand','colt','frag:4'],squad:SQUAD4,build:bocageLayout,
 objectives:[
  {text:{es:'Avanza por el camino hundido',en:'Advance up the sunken lane'},reach:[0,-46,5],onStart:L=>{if(!L.restoring)L.wait(1.5,()=>L.say('bo_intro'));}},
  {text:{es:'Silencia la MG42 del seto',en:'Silence the MG42 in the hedge'},kill:'hedge1',
   onStart:L=>{L.spawn([{tag:'hedge1',kind:'mg',weapon:'mg42mount',pos:'n1.gun',behavior:'mg',sight:110,alert:true},{tag:'hedge1',kind:'rifle',pos:[8,5],behavior:'hold',face:[0,-30]},
     {tag:'hedge1',kind:'rifle',pos:[34,4],behavior:'hold',face:[20,-30]},{tag:'hedge1',kind:'smg',pos:[-12,-12],behavior:'hold'},{tag:'hedge1',kind:'rifle',pos:[-50,7],behavior:'advance',goal:[-30,-8]},{tag:'hedge1',kind:'rifle',pos:[28,-20],behavior:'hold'}]);
    if(!L.restoring)L.run(L.talk(['bo_mg',0.4,'bo_flank']));}},
  {text:{es:'Cruza los campos hasta la granja',en:'Cross the fields to the farm'},reach:[-50,24,6],onStart:L=>{L.say('bo_farm');L.squadTo([[-52,26],[-48,26],[-54,30],[-46,30]]);}},
  {text:{es:'Elimina al francotirador del campanario',en:'Kill the sniper in the bell tower'},kill:['sniper','outsk'],
   onStart:L=>{L.spawn([{tag:'sniper',kind:'sniper',pos:'ch.belfry',behavior:'hold',sight:160,alert:true,face:[-40,30]},{tag:'outsk',kind:'rifle',pos:[4,70],behavior:'hold'},{tag:'outsk',kind:'smg',pos:[22,74],behavior:'hold'},{tag:'outsk',kind:'rifle',pos:[-4,62]}]);
    if(!L.restoring)L.run(L.talk(['bo_sniper',0.3,'bo_sniper2']));},onDone:L=>L.say('bo_sniperDown')},
  {text:{es:'Usa la MG42 de la granja y rechaza el contraataque',en:'Use the farm MG42 and repel the counterattack'},use:'farmMG',done:L=>!!L.w4&&L.w4.done,stay:true,
   onStart:L=>{L.say('bo_mgFarm');L.squadTo([[-58,50],[-44,50],[-64,46],[-36,48]]);
    L.w4=L.wave({tag:'waveF',n:16,max:6,every:2,delay:6,from:[[-86,104],[-62,106],[-38,104],[-76,90],[-24,96]],kinds:['rifle','smg','rifle','rifle','mg'],goals:[[-56,55.5],[-50,56],[-44,55.5]],behavior:'charge'});}},
  {text:{es:'Coge el bazuca',en:'Pick up the bazooka'},pickup:'bazooka',done:()=>Weapons.has('bazooka'),marker:L=>{const q=Weapons.pickups.find(q=>q.id==='bazooka');return q?q.pos:[-46,null,46];},
   onStart:L=>{if(!Weapons.has('bazooka')&&!Weapons.pickups.some(q=>q.id==='bazooka'))L.pickup('bazooka',[-46,46],6);L.run(L.talk(['bo_tank',0.3,'bo_baz']));}},
  {text:{es:'Destruye el carro de combate',en:'Destroy the tank'},kill:'tank',onStart:L=>{const t=L.tank({pos:[98,22],yaw:-Math.PI/2,route:[[70,22],[30,22],[-6,22]],tag:'tank'});
    L.charge({follow:t,off:[0,-3.6],tag:'ch_tank',text:{es:'colocar una carga en la trasera',en:'plant a charge on the rear'},hold:1.5,fuse:4,radius:4});
    L.spawn([{tag:'escort',kind:'rifle',pos:[92,25],behavior:'advance',goal:[-4,25]},{tag:'escort',kind:'smg',pos:[94,19],behavior:'advance',goal:[0,18]},{tag:'escort',kind:'rifle',pos:[88,22],behavior:'advance',goal:[6,24]}]);},
   onDone:L=>L.say('bo_tankDown')},
  {text:{es:'Reagrupaos en la iglesia del pueblo',en:'Regroup at the village church'},reach:[12,70,6],onStart:L=>{L.say('bo_church');L.squadTo([[8,70],[16,70],[10,66],[14,66]]);}}
 ],
 finale(L){L.run(function*(){yield* L.talk(['bo_end']);yield 1.5;L.complete();});},
 script(L){L.mg([-50,52.3],0,{tag:'farmMG',h:0,arc:1.2});}};


// ======================= 5. BASTOÑA (Las Ardenas, diciembre de 1944) =======================
// Campamento al sur, línea de pozos de tirador (z=-20) en un claro del bosque nevado, tierra de nadie con árboles astillados, bosque espeso al norte
// y el pueblo en ruinas con la iglesia (z~100). La pista del bosque (x~20) es por donde baja el Tiger.
const BA_ROADS=[[[18,122],[20,70],[12,24],[2,-14],[0,-104]],[[-90,92],[90,96]],[[0,96],[0,112]]];
const BA_HOLES=[[-38,-20],[-27,-21],[-17,-19.5],[-7,-21],[6,-20.5],[16,-19.5],[27,-21],[37,-20]];
function baH(x,z){return 1.2*Math.sin(x*0.03+0.5)*Math.cos(z*0.025)+0.5*Math.sin(x*0.09+z*0.07)+1.5*smooth((z-60)/50)+14*smooth(Math.max(Math.abs(x)-92,z-120,-102-z,0)/90);}
function baCol(x,z,n,y,dp){let c=soil(['#e6ebf0','#d7dee6','#8e877c'],x,z,n,dp);const d=roadsD(x,z,BA_ROADS);
 if(d<4)c=mixC(c,mixC(hex('#b9b4aa'),hex('#7a6e60'),smooth((2.2-d)/2)*0.6),(1-smooth((d-1.5)/2.5))*0.75);
 if(z>-30&&z<-12)c=mixC(c,hex('#a59d90'),0.3*smooth(1-Math.abs(z+21)/9)*vnoise(x*0.3,z*0.3,9));return c;}
function bastogneLayout(){const PI=Math.PI,clear=(x,z)=>roadsD(x,z,BA_ROADS)<4||(z>-34&&z<-8&&Math.abs(x)<50)||(z>-96&&z<-58&&Math.abs(x)<26)||(z>74&&Math.abs(x)<46);
 return {bounds:[-90,-102,90,120],
  terrain:{tex:'snow',h:baH,color:baCol,surface:()=>'snow',mods:[{t:'flat',x:0,z:-78,w:44,d:34,blend:6},{t:'flat',x:0,z:100,w:80,d:40,blend:8}]},
  props:[
   // campamento
   ...row('tent',[[-14,-86],[-8,-86],[10,-88],[16,-88]],{yaw:PI/2,col:'#7d7f6c'}),{t:'wreck',kind:'jeep',burnt:false,x:4,z:-74,yaw:0.4},{t:'fx',x:-2,z:-80,kind:'fire',size:0.5},
   {t:'barrel',x:-2.6,z:-80.4},{t:'crate',x:-18,z:-74,n:3},{t:'ammo',x:6,z:-28},{t:'log',x:-8,z:-76,yaw:0.2},{t:'log',x:2,z:-82,yaw:1.4,s:0.7},
   // línea de pozos y nido propio
   ...BA_HOLES.map(([x,z])=>({t:'foxhole',x,z,r:1.4,d:1.25,col:'#c9c7bd'})),{t:'nest',x:0,z:-17,yaw:0,mg:true,tag:'lineMG',col:'#c9c7bd'},
   {t:'log',x:-11,z:-15,yaw:0.1},{t:'log',x:12,z:-15.5,yaw:-0.2},{t:'wire',x:-24,z:-9,len:10},{t:'wire',x:24,z:-8,len:10,yaw:0.1},
   // tierra de nadie: árboles astillados, tocones, cráteres
   ...row('tree',[[-30,0],[-12,6],[8,-2],[28,4],[-40,16],[40,18],[-20,24],[16,28],[34,-4],[-46,-2]],i=>({kind:i%3===2?'stump':'split',s:0.9+(i%4)*0.1})),
   ...row('crater',[[-22,-4],[10,8],[30,14],[-34,10],[0,22],[-8,-6]],i=>({r:1.8+(i%3)*0.5,d:0.6})),
   // bosques
   {t:'scatter',x0:-90,z0:-102,x1:90,z1:120,n:330,minD:4.2,clear:1.3,items:[{t:'tree',kind:'snowy',w:6},{t:'tree',kind:'bare',w:1},{t:'tree',kind:'sbush',w:2}],avoid:(x,z)=>clear(x,z)||(z>-8&&z<34&&Math.abs(x)<55)},
   {t:'scatter',x0:-220,z0:-220,x1:220,z1:240,n:260,minD:6,items:[{t:'tree',kind:'snowy'}],avoid:(x,z)=>x>-94&&x<94&&z>-106&&z<124},
   // pueblo en ruinas
   {t:'church',x:0,z:104,yaw:PI,pt:'ch',roofCol:'#e2e6ea'},
   {t:'house',x:-26,z:94,yaw:PI/2,mat:'stone',ruined:true,w:9},{t:'house',x:24,z:88,yaw:-PI/2,mat:'stone',burnt:true,w:8,pt:'hb'},{t:'house',x:-24,z:114,yaw:PI/2,mat:'stone',storeys:2,roofCol:'#dfe3e8',pt:'hc'},
   {t:'house',x:26,z:112,yaw:-PI/2,mat:'plaster',storeys:2,roofCol:'#dde2e7'},{t:'house',x:-46,z:84,yaw:0.3,mat:'stone',ruined:true},{t:'house',x:48,z:94,yaw:-0.2,mat:'stone',roofCol:'#e0e4e8'},
   {t:'wreck',kind:'halftrack',x:-12,z:88,yaw:0.6,smoke:true},{t:'wreck',kind:'truck',x:16,z:80,yaw:2.0},{t:'rubble',x:8,z:92,r:2},{t:'sandbags',x:-6,z:92,yaw:PI,r:2.2,rows:3,col:'#cfcbc0'},
   {t:'tufts',x0:-88,z0:-100,x1:88,z1:118,n:240,type:'sbush',cols:['#ffffff','#e8ecef'],s:0.7,clear:1.2,avoid:clear}
  ]};}
const M_BASTOGNE={id:'bastogne',name:{es:'Bastoña',en:'Bastogne'},place:{es:'Las Ardenas, Bélgica',en:'The Ardennes, Belgium'},date:'Diciembre de 1944',env:ENVS.snow,
 brief:{es:'Rodeados, sin ropa de invierno y con poca munición. Aguanta la línea del bosque bajo la artillería, rechaza el asalto y el contraataque del Tiger, y luego avanza hasta el pueblo y toma la iglesia.',
  en:'Surrounded, without winter gear and short on ammo. Hold the forest line under the artillery, repel the assault and the Tiger counterattack, then push to the village and take the church.'},
 start:{pos:[0,-86],yaw:0},loadout:['garand','colt','frag:3'],squad:SQUAD4,build:bastogneLayout,
 objectives:[
  {text:{es:'Ve a la línea de pozos',en:'Get to the foxhole line'},reach:[0,-25,5],onStart:L=>{if(!L.restoring)L.run(L.talk([1,'ba_intro',0.6,'ba_cold']));}},
  {text:{es:'¡Artillería! Métete en un pozo de tirador',en:'Incoming! Get into a foxhole'},flag:'inHole',stay:true,marker:()=>{let b=null,bd=1e9;for(const h of BA_HOLES){const d=Math.hypot(h[0]-Player.pos[0],h[1]-Player.pos[2]);if(d<bd){bd=d;b=h;}}return [b[0],null,b[1]];},
   onStart:L=>{L.say('ba_arty');L.wait(1.5,()=>L.say('ba_hole'));L.barrA=L.barrage({x0:-48,z0:-36,x1:48,z1:6},Infinity,0.55,{air:7,r:9,dmg:120,safe:5});
    L.run(function*(){while(!BA_HOLES.some(h=>Math.hypot(h[0]-Player.pos[0],h[1]-Player.pos[2])<1.2))yield 0.1;L.flags.inHole=true;});}},
  {text:{es:'Aguanta el bombardeo',en:'Ride out the barrage'},flag:'barrageOver',stay:true,marker:()=>null,
   onStart:L=>{if(!L.barrA)L.barrA=L.barrage({x0:-48,z0:-36,x1:48,z1:6},Infinity,0.55,{air:7,r:9,dmg:120,safe:5});L.timer('arty',16,true);L.wait(16,()=>{L.flags.barrageOver=true;L.stopTimer('arty');if(L.barrA)L.barrA.stop();});}},
  {text:{es:'Defiende la línea',en:'Hold the line'},flag:'lineHeld',stay:true,marker:L=>L.nearest(['w1','w2'])||[0,null,-20],
   onStart:L=>{if(L.barrA){L.barrA.stop();L.barrA=null;}L.squadTo([[-17,-19.5],[6,-20.5],[-7,-21],[16,-19.5]]);L.run(baWaves);}},
  {text:{es:'¡Tiger! Coge el bazuca del pozo central',en:'Tiger! Grab the bazooka from the center foxhole'},pickup:'bazooka',done:()=>Weapons.has('bazooka'),
   marker:L=>{const q=Weapons.pickups.find(q=>q.id==='bazooka');return q?q.pos:[6,null,-20.5];},
   onStart:L=>{if(!Weapons.has('bazooka')&&!Weapons.pickups.some(q=>q.id==='bazooka'))L.pickup('bazooka',[6.3,-20.5],7);if(!L.restoring)L.run(L.talk(['ba_tiger',0.3,'ba_baz']));}},
  {text:{es:'Destruye el Tiger',en:'Destroy the Tiger'},kill:'tiger',
   onStart:L=>{const t=L.tank({type:'tiger',health:1150,pos:[19,116],yaw:Math.PI,route:[[20,70],[12,26],[6,4]],tag:'tiger',speed:3.4});
    L.charge({follow:t,off:[0,-3.9],tag:'ch_tiger',text:{es:'colocar una carga en la trasera',en:'plant a charge on the rear'},hold:1.5,fuse:4,radius:4});
    L.spawn([{tag:'escort',kind:'rifle',pos:[14,112],behavior:'advance',goal:[4,0]},{tag:'escort',kind:'smg',pos:[24,110],behavior:'advance',goal:[14,2]},{tag:'escort',kind:'assault',pos:[18,118],behavior:'advance',goal:[8,6]}]);},
   onDone:L=>L.say('ba_tigerDown')},
  {text:{es:'Avanza hasta el pueblo',en:'Advance to the village'},reach:[0,78,7],
   onStart:L=>{L.say('ba_advance');L.squadTo([[-6,76],[6,76],[-10,72],[10,72]]);
    L.spawn([[-30,52],[-12,58],[10,50],[28,56],[40,64],[-40,66]].map((p,i)=>({tag:'forest',kind:['rifle','smg','rifle','mg'][i%4],pos:p,behavior:'hold',face:[0,-20]})));}},
  {text:{es:'Toma la iglesia',en:'Take the church'},kill:'church',
   onStart:L=>{L.say('ba_church');L.spawn([{tag:'church',kind:'officer',pos:'ch.altar',behavior:'hold'},{tag:'church',kind:'smg',pos:'ch.nave',behavior:'hold'},{tag:'church',kind:'rifle',pos:[-4,94],behavior:'hold'},
     {tag:'church',kind:'sniper',pos:'ch.belfry',behavior:'hold',face:[0,60]},{tag:'church',kind:'mg',pos:[-6,90.8],behavior:'hold',face:[0,70]},{tag:'church',kind:'rifle',pos:'hc.w0',behavior:'hold'},{tag:'church',kind:'rifle',pos:[20,96],behavior:'advance',goal:[6,86]}]);}}
 ],
 // final: la cámara sube sobre la iglesia mientras hablan; luego créditos
 finale(L){L.run(function*(){const c=World.point('ch.belfry')||[0,14,93];L.squadTo([[-3,84],[3,84],[-6,82],[6,82]]);
  L.cine([{eye:[Player.pos[0],Player.pos[1]+1.7,Player.pos[2]],yaw:Player.yaw,pitch:0.05},{eye:[-14,c[1]-4,80],yaw:0.5,pitch:0.15},{eye:[-26,c[1]+10,62],yaw:0.42,pitch:-0.12},{eye:[-30,c[1]+26,40],yaw:0.5,pitch:-0.28}],16);
  yield 1;yield* L.talk(['ba_end1',0.5,'ba_end2',0.4,'ba_end3']);yield ()=>!Game.cine;L.fade(true);yield 1;L.fade(false);L.complete({credits:true});});},
 script(L){}};
function* baWaves(L){if(L.flags.lineHeld)return;yield 2;L.say('ba_hold');
 const W1=L.wave({tag:'w1',n:10,max:6,every:1.8,from:[[-40,42],[-20,46],[0,44],[20,46],[40,42]],kinds:['rifle','smg','rifle','mg','rifle'],goals:[[-26,-12],[-6,-12],[14,-12],[30,-12]],behavior:'advance'});
 yield ()=>W1.done;yield 3;L.say('ba_wave2');
 const W2=L.wave({tag:'w2',n:12,max:6,every:1.6,from:[[-46,48],[-24,52],[4,50],[26,52],[46,48]],kinds:['smg','rifle','assault','rifle','mg'],goals:[[-30,-14],[-10,-14],[10,-14],[30,-14]],behavior:'charge'});
 yield ()=>W2.done;L.flags.lineHeld=true;}

// ======================= SUPERVIVENCIA: pueblo en ruinas al atardecer =======================
// Oleadas cada vez mayores desde los bordes. Puntos por baja (60, +40 a la cabeza) y por oleada; armas en las paredes que se compran con puntos;
// cajas de munición gratis. Al morir se guarda el récord (Save.survival del menú o localStorage 'frente44:survival').
const SV_SPAWN=[[-52,-42],[-53,24],[-20,53],[18,53],[52,36],[53,-20],[22,-53],[-26,-53]];
const SV_BUY=[{id:'thompson',cost:500,pos:[-13.2,-6],yaw:Math.PI/2},{id:'stg44',cost:900,pos:[13.2,6],yaw:-Math.PI/2},{id:'bar',cost:1100,pos:[6,-13.3],yaw:0},{id:'kar98s',cost:800,pos:[-6,13.3],yaw:Math.PI},
 {id:'bazooka',cost:1500,pos:[-26,18],yaw:0},{id:'frag',cost:300,pos:[24,-20],yaw:Math.PI}];
function svLayout(){const PI=Math.PI,R=(x,z,yaw,o)=>Object.assign({t:'house',x,z,yaw,mat:['stone','brick','plaster'][Math.abs(Math.round(x*3+z))%3],ruined:true,w:8,d:6},o||{});
 return {bounds:[-56,-56,56,56],
  terrain:{tex:'dirt',h:(x,z)=>0.3*Math.sin(x*0.08)*Math.cos(z*0.07)+0.15*Math.sin(x*0.21+z*0.17)+10*smooth(Math.max(Math.abs(x)-54,Math.abs(z)-54,0)/70),
   color:(x,z,n,y,dp)=>{let c=soil(['#6d6250','#5e5444','#4a4034'],x,z,n,dp);const sq=Math.max(Math.abs(x),Math.abs(z));if(sq<11)c=mixC(c,hex('#7a7468'),0.7);
    if(Math.abs(x)<3.5||Math.abs(z)<3.5)c=mixC(c,hex('#6c665c'),0.6);return c;},surface:(x,z)=>Math.max(Math.abs(x),Math.abs(z))<11?'stone':'dirt'},
  props:[
   {t:'well',x:0,z:0},{t:'memorial',x:-6,z:-6},
   // casas alrededor de la plaza: unas en pie (paredes para las armas), otras en ruinas
   {t:'house',x:-18,z:-6,yaw:PI/2,mat:'stone',storeys:2,w:9,d:7,burnt:true},{t:'house',x:18,z:6,yaw:-PI/2,mat:'stone',w:9,d:7,storeys:2},
   {t:'house',x:6,z:-18,yaw:0,mat:'brick',w:9,d:7},{t:'house',x:-6,z:18,yaw:PI,mat:'plaster',w:9,d:7,burnt:true},
   R(-18,14,PI/2),R(18,-14,-PI/2),R(-30,-24,0.3),R(30,26,-0.4),R(-34,30,PI),R(34,-34,0.2,{w:10}),R(-10,-36,0.1,{w:9}),R(12,36,PI),
   {t:'church',x:-34,z:-2,yaw:PI/2,ruined:true,w:9,d:14},
   {t:'wreck',kind:'tank',x:24,z:-6,yaw:1.2,smoke:true},{t:'wreck',kind:'truck',x:-10,z:28,yaw:0.4,fire:true,smoke:true},{t:'wreck',kind:'halftrack',x:38,z:8,yaw:2.5},
   ...row('crater',[[10,10],[-12,-14],[26,20],[-24,8],[2,-28],[-40,-38],[40,-10],[14,-38],[-4,40]],i=>({r:1.8+(i%3)*0.6,d:0.7})),
   ...row('sandbags',[[-4,-9],[9,-3],[-9,4],[3,9]],i=>({yaw:i*PI/2+PI,r:2.2,a0:-0.9,a1:0.9,rows:3})),
   {t:'rubble',x:-26,z:-12,r:2},{t:'rubble',x:28,z:-26,r:2.2},{t:'rubble',x:8,z:26,r:1.6},{t:'crate',x:-12,z:-10,n:2},{t:'barrel',x:14,z:12,explosive:true},{t:'barrel',x:-16,z:22,explosive:true},
   {t:'ammo',x:-3,z:-12},{t:'ammo',x:3,z:12},
   ...row('tree',[[-44,-12],[44,20],[-20,-46],[22,46],[-46,46],[46,-46]],i=>({kind:i%2?'split':'bare'})),
   {t:'poles',pts:[[-56,-48],[56,-46]],every:20,broken:2},
   {t:'fx',x:-40,z:40,kind:'smoke',size:3,col:[0.2,0.18,0.17],rate:3,life:14},{t:'fx',x:46,z:-40,kind:'smoke',size:3,col:[0.22,0.2,0.18],rate:3,life:14},
   {t:'scatter',x0:-150,z0:-150,x1:150,z1:150,n:70,minD:9,items:[{t:'tree',kind:'bare'},{t:'tree',kind:'split'},{t:'house',ruined:true,mat:'stone',w:7,d:6}],avoid:(x,z)=>Math.abs(x)<62&&Math.abs(z)<62},
   {t:'tufts',x0:-54,z0:-54,x1:54,z1:54,n:300,cols:['#6a6a44','#7a7550','#5d5a3c'],avoid:(x,z)=>Math.max(Math.abs(x),Math.abs(z))<12}
  ]};}
function svScore(L){const p=L.flags.pts||0,w=L.flags.wave||1,best=Game.bestSurvival();return {points:p,wave:w,
 text:txt({es:'Oleada '+w+' · '+p+' puntos (récord '+Math.max(best,p)+')',en:'Wave '+w+' · '+p+' points (best '+Math.max(best,p)+')'})};}
function* svLoop(L){L.flags.wave=0;yield 3;for(;;){const n=++L.flags.wave;L.hint({es:'Oleada '+n,en:'Wave '+n},3);if(n>1)L.say('sv_wave');
 const K=['rifle','smg','rifle',n>2?'mg':'rifle',n>3?'assault':'smg',n>4?'officer':'rifle'];
 const W=L.wave({tag:'sv',n:4+n*3,max:Math.min(4+n,14),every:Math.max(0.6,2.2-n*0.15),from:SV_SPAWN,random:true,kinds:K,goals:[[0,0],[-7,5],[7,-5],[5,7],[-5,-7]],behavior:n%3===0?'charge':'advance',
  onSpawn:a=>{a.health=a.maxHealth=100+8*(n-1);a.alert=true;if(a.data)a.data.alert=true;}});
 yield ()=>W.done;const b=100*n;L.flags.pts+=b;L.hint({es:'Oleada '+n+' superada · +'+b,en:'Wave '+n+' cleared · +'+b},3);yield 9;}}
const M_SURVIVAL={id:'survival',survival:true,name:{es:'Supervivencia',en:'Survival'},place:{es:'Pueblo en ruinas',en:'Ruined village'},date:'1944',env:ENVS.dusk,
 brief:{es:'Un pueblo en ruinas y ninguna salida. Aguanta oleadas cada vez mayores. Cada baja da puntos: gástalos en las armas colgadas de las paredes. Las cajas de munición son gratis.',
  en:'A ruined village and no way out. Survive ever larger waves. Every kill earns points: spend them on the weapons hung on the walls. Ammo crates are free.'},
 start:{pos:[0,-4],yaw:0},loadout:['garand','colt','frag:2'],squad:[],build:svLayout,
 score:svScore,
 objectives:[{text:dyn(()=>{const L=Game.L;return L?'Oleada '+(L.flags.wave||1)+' · '+(L.flags.pts||0)+' puntos · récord '+Game.bestSurvival():'';},()=>{const L=Game.L;return L?'Wave '+(L.flags.wave||1)+' · '+(L.flags.pts||0)+' points · best '+Game.bestSurvival():'';}),
  checkpoint:false,done:()=>false,marker:L=>L.alive('sv')<=3?L.nearest('sv'):null}],
 script(L){L.flags.pts=0;L.flags.wave=0;
  L.on('kill',d=>{if(d.by===Player&&d.actor&&d.actor.team==='axis'){L.flags.pts+=60+(d.headshot?40:0);}});
  for(const b of SV_BUY){const d=WEAPONS[b.id],nm=d?d.name:b.id,pp=[b.pos[0],null,b.pos[1]];
   const u=L.usable({kind:'buy',pos:pp,r:1.7,tag:'buy_'+b.id,bot:false,text:dyn(()=>(b.id==='frag'?'comprar granadas':'comprar '+nm)+' ('+b.cost+' puntos)',()=>(b.id==='frag'?'buy grenades':'buy '+nm)+' ('+b.cost+' points)'),short:{es:nm,en:nm},
    use:()=>{if((L.flags.pts||0)<b.cost){L.hint({es:'Faltan puntos',en:'Not enough points'},2);return;}L.flags.pts-=b.cost;Bus.emit('buy',{id:b.id,cost:b.cost});
     if(b.id==='frag'){Weapons.inv.nades=Math.max(Weapons.inv.nades,4);Bus.emit('ammo',{});return;}const q=Weapons.drop(d,[Player.pos[0],Player.pos[1]+0.5,Player.pos[2]],d.ammo);if(q)Weapons.pickup(q);}});
   // el arma colgada en la pared (tablero con el arma de adorno)
   World.addProp({t:'box',x:b.pos[0]-Math.sin(b.yaw)*0.25,z:b.pos[1]-Math.cos(b.yaw)*0.25,yaw:b.yaw,w:1.4,h:0.9,d:0.06,y0:1.1,mat:'wood',col:'#4a3a2a'});}
  L.run(svLoop);}};

// ======================= ESCENA DEL TÍTULO =======================
// Pueblo normando al amanecer después de la batalla: la cámara pasea despacio alrededor de la iglesia (Game.toTitle la carga sola).
function titleLayout(){const L=villageLayout();L.props=L.props.filter(p=>p.t!=='flak'&&p.t!=='ammo');for(const p of L.props)if(p.lit)p.lit=0;
 L.props.push({t:'wreck',kind:'tank',x:-6,z:-36,yaw:0.7,smoke:true},{t:'crater',x:4,z:-30,r:2.6,d:1},{t:'crater',x:-16,z:-30,r:2,d:0.8},{t:'fx',x:30,z:30,kind:'smoke',size:3.5,col:[0.25,0.24,0.23],rate:3,life:16},
  {t:'fx',x:-60,z:10,kind:'smoke',size:3,col:[0.3,0.29,0.28],rate:2,life:16},{t:'flak',x:60,z:22,aim:-0.6,broken:true});return L;}
const TITLE_SCENE={id:'title',title:true,name:{es:'FRENTE 44',en:'FRENTE 44'},place:{es:'',en:''},date:'',env:Object.assign({},ENVS.golden,{fogF:300}),build:titleLayout,objectives:[],
 // cámara: órbita lenta alrededor de la plaza, subiendo y bajando
 cam(t){const a=3.3+t*0.02,R=52+8*Math.sin(t*0.05),x=Math.sin(a)*R,z=-6+Math.cos(a)*R,y=(World.built?World.height(x,z):0)+11+4*Math.sin(t*0.037),tx=0,tz=0;
  return {eye:[x,y,z],yaw:Math.atan2(tx-x,tz-z),pitch:-0.08,fov:56};}};


const LEVELS=[
 mkRange({id:'test',name:{es:'Campo de pruebas',en:'Test range'},place:{es:'Campo de pruebas',en:'Test range'},date:'1944',
  brief:{es:'Prueba de todo lo que hay: muévete, dispara, recoge armas y limpia la zona.',en:'Try everything: move, shoot, pick up weapons and clear the area.'}}),
 M_TRAINING,
 M_BEACH,
 M_VILLAGE,
 M_BOCAGE,
 M_BASTOGNE,
 M_SURVIVAL
];
