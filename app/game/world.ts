import * as T from 'three';
import {makeVehicle, type RoadVehicle} from './vehicles';
import {RaceSession,roadCenter,roadHeight,rivalNames,type Attack,type RaceStatus} from './race';
import {RideSound} from './sound';

export type RideHud={distance:number;speed:number;passed:number;town:boolean;nextTown:number;stamina:number;bike:number;nitro:number;heat:number;weapon:boolean;place:number;total:number;length:number;stage:number;elapsed:number;status:RaceStatus;countdown:number;recovery:number;notice:string;knockdowns:number;falls:number;police:boolean;nearest:{id:number;health:number;gap:number}|null;standings:number[]};
export type RideEngine={reset:(stage?:number)=>void;nudge:(key:string)=>void;attack:(kind:Attack)=>void;setSound:(enabled:boolean)=>void;dispose:()=>void};
const TOWN_START=360,TOWN_END=840,ROUTE_LENGTH=1440;
export function createRide(element:HTMLElement,night:boolean,options:{keys:Set<string>;isPlaying:()=>boolean;english:boolean;onHud:(value:RideHud)=>void;onComplete:()=>void;onPause:()=>void}):RideEngine{
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'default'});
 renderer.setPixelRatio(Math.min(2.5,Math.max(2,devicePixelRatio)));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=night?1.28:1.12;
 element.appendChild(renderer.domElement);
 const scene=new T.Scene();scene.background=new T.Color(night?0x577d9c:0x9ad9f1);scene.fog=new T.Fog(scene.background,65,165);
 const camera=new T.PerspectiveCamera(50,1,.1,240);camera.position.set(0,4.8,13);camera.lookAt(0,.65,-15);
 scene.add(new T.HemisphereLight(0xe5f5ff,0x596d32,2.3));const sun=new T.DirectionalLight(night?0xffc38d:0xfff3cd,night?2.1:3);sun.position.set(-15,26,10);scene.add(sun);
 const materials=new Map<number,T.MeshStandardMaterial>(),geometries=new Map<string,T.BufferGeometry>();
 function mat(color:number){let value=materials.get(color);if(!value){value=new T.MeshStandardMaterial({color,roughness:.85});materials.set(color,value);}return value;}
 function geo(w:number,h:number,d:number){const key=`box:${w},${h},${d}`;let result=geometries.get(key);if(!result){result=new T.BoxGeometry(w,h,d);geometries.set(key,result);}return result;}
 function mesh(parent:T.Object3D,g:T.BufferGeometry,c:number,x:number,y:number,z:number){const m=new T.Mesh(g,mat(c));m.position.set(x,y,z);parent.add(m);return m;}
 function box(parent:T.Object3D,w:number,h:number,d:number,c:number,x:number,y:number,z:number){return mesh(parent,geo(w,h,d),c,x,y,z);}
 const race=new RaceSession(),audio=new RideSound();const dummy=new T.Object3D();
 function instances(parent:T.Object3D,g:T.BufferGeometry,color:number,points:Array<{x:number;y:number;z:number;s?:number;ry?:number;rx?:number;color?:number}>){
  const object=new T.InstancedMesh(g,mat(color),points.length);points.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(p.rx??0,p.ry??0,0);dummy.scale.setScalar(p.s??1);dummy.updateMatrix();object.setMatrixAt(i,dummy.matrix);if(p.color!==undefined)object.setColorAt(i,new T.Color(p.color));});object.instanceMatrix.needsUpdate=true;object.userData.points=points;parent.add(object);return object;
 }
 // The road and terrain bend around the rider rather than sliding straight ahead.
 const roadMeshes:Array<{mesh:T.Mesh;left:number;right:number}>=[];
 function strip(left:number,right:number,color:number){const positions=new Float32Array(101*6),indices=[];for(let i=0;i<100;i++){const j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));geometry.setIndex(indices);const object=new T.Mesh(geometry,mat(color));object.frustumCulled=false;scene.add(object);roadMeshes.push({mesh:object,left,right});return object;}
 strip(-220,220,night?0x658347:0x7ea74e);strip(-4.2,4.2,0xc3ba91).position.y=.008;strip(-3.6,3.6,0x424e4e).position.y=.016;
 [-3.35,3.35].forEach(x=>strip(x-.03,x+.03,0xf3edcf).position.y=.022);
 const marks:T.Mesh[]=[];for(let i=0;i<58;i++)[-1.12,0,1.12].forEach(x=>{const mark=box(scene,x===0?.035:.055,.008,1.9,x===0?0xf4cc61:0xe9ecdc,x,.03,10-i*3.6);mark.userData.lane=x;marks.push(mark);});
 const pathX=(z:number)=>roadCenter(race.distance+(3-z)*2)-roadCenter(race.distance);
 const pathY=(z:number)=>roadHeight(race.distance+(3-z)*2)-roadHeight(race.distance);
 function updateRoad(){roadMeshes.forEach(({mesh,left,right})=>{const attribute=mesh.geometry.getAttribute('position') as T.BufferAttribute;for(let i=0;i<=100;i++){const z=14-i*2.35,x=pathX(z),y=pathY(z)-.06;attribute.setXYZ(i*2,x+left,y,z);attribute.setXYZ(i*2+1,x+right,y,z);}attribute.needsUpdate=true;mesh.geometry.computeVertexNormals();});marks.forEach(mark=>{mark.position.x=pathX(mark.position.z)+mark.userData.lane;mark.position.y=pathY(mark.position.z)-.029;mark.rotation.x=Math.atan((pathY(mark.position.z+.2)-pathY(mark.position.z-.2))/.4);mark.rotation.y=-Math.atan((pathX(mark.position.z+.2)-pathX(mark.position.z-.2))/.4);});}
 // Distant rolling hills and drifting clouds keep a real horizon behind the road.
 const hillGeo=new T.SphereGeometry(1,32,20);
 for(let i=0;i<12;i++){const hill=mesh(scene,hillGeo,i%2?0x79925d:0x688559,(i-5.5)*22,-6,-135-Math.abs(i-5.5)*5);hill.scale.set(24+Math.random()*9,13+Math.random()*8,25);}
 const clouds:T.Group[]=[];
 for(let i=0;i<7;i++){const group=new T.Group();for(let j=0;j<4;j++){const m=mesh(group,hillGeo,0xf8f6e6,j*2.4,Math.sin(j)*.7,0);m.scale.set(3.3,1.1,1.6);}group.position.set(-65+i*19,24+i%3*3,-75-i%3*20);scene.add(group);clouds.push(group);}
 const sunMesh=new T.Mesh(new T.SphereGeometry(3,32,20),new T.MeshBasicMaterial({color:0xffe9b0}));sunMesh.position.set(-39,33,-112);scene.add(sunMesh);
 const trunkGeo=new T.CylinderGeometry(.15,.23,2.2,12),leafGeo=new T.SphereGeometry(1,16,12),pineGeo=new T.ConeGeometry(1,2.8,16),grassGeo=new T.ConeGeometry(.035,.27,3),pebbleGeo=new T.DodecahedronGeometry(.15,0);
 function forest(parent:T.Group){
  const group=new T.Group();parent.add(group);const trunks=[],leaves=[],pines=[],grass=[],rocks=[];
  for(let i=0;i<24;i++){
   const side=i%2?-1:1,x=side*(5.5+Math.random()*20),z=-Math.random()*60,s=.7+Math.random()*.65;
   trunks.push({x,y:1.05*s,z,s,color:0x806446});
   if(i%4===0)pines.push({x,y:3.05*s,z,s:s*1.2,color:0x3b7654});
   else for(let j=0;j<3;j++)leaves.push({x:x+Math.sin(j*2.1)*s*.55,y:(2.8+(j%2)*.5)*s,z:z+Math.cos(j*2.1)*s*.45,s:s*(.9+j*.08),color:[0x4b8a48,0x689d47,0x85ac51][i%3]});
  }
  for(let i=0;i<260;i++)grass.push({x:(i%2?-1:1)*(4.4+Math.random()*24),y:.07,z:-Math.random()*60,s:.6+Math.random()*.8,color:i%7===0?0xd4c172:0x699243});
  for(let i=0;i<14;i++)rocks.push({x:(i%2?-1:1)*(4.6+Math.random()*16),y:.05,z:-Math.random()*60,s:.8+Math.random(),color:0xa2a389});
  instances(group,trunkGeo,0x806446,trunks);instances(group,leafGeo,0x629344,leaves);instances(group,pineGeo,0x437b4a,pines);instances(group,grassGeo,0x739948,grass);instances(group,pebbleGeo,0x9d9e86,rocks);return group;
 }
 function town(parent:T.Group,index:number){
  const group=new T.Group();parent.add(group);
  [-1,1].forEach(side=>{
   box(group,2.6,.1,60,0xc4c1ad,side*5.05,.015,-30);box(group,.13,.14,60,0xe0dac4,side*3.83,.08,-30);
   for(let i=0;i<5;i++){
    const height=2.3+(i+index)%3*.75,x=side*(8.2+(i%2)*1.3),z=-5-i*11.5,w=3.8+(i%2),d=5;
    box(group,w,height,d,[0xe5c18d,0xcbd7db,0xd69172,0xf2dfa7,0x9eb6ae][(i+index)%5],x,height/2,z);
    const roof=mesh(group,new T.ConeGeometry(1,1.25,4),[0xb65c46,0x577384,0xa66e4c][i%3],x,height+.6,z);roof.rotation.y=Math.PI/4;roof.scale.set(w*.8,1,d*.8);
    const front=x-side*(w/2+.012);
    for(let floor=0;floor<(height>3?2:1);floor++)for(let window=0;window<3;window++)box(group,.018,.64,.65,0x325b6d,front,.9+floor*1.2,z-1.5+window*1.4);
    box(group,.03,.12,d*.9,0xf4e4c3,front,height-.15,z);box(group,.03,1.05,.66,0x704f3d,front,.52,z+.1);
    if(i%2===0){box(group,.95,.1,d*.85,[0xe7ad48,0x3687a2,0xc95f4d][i%3],front-side*.36,1.42,z);box(group,.04,.32,1.9,0xf5e6bc,front,1.82,z);}
    box(group,.38,.7,.42,0x79564b,x+w*.22,height+.43,z+.8);
   }
   for(let i=0;i<4;i++){
    const x=side*4.6,z=-3-i*15;
    mesh(group,new T.CylinderGeometry(.04,.07,3.4,12),0x526872,x,1.7,z);box(group,.7,.045,.06,0x526872,x-side*.3,3.39,z);box(group,.37,.065,.18,0xffe8b1,x-side*.55,3.32,z);
    box(group,.58,.05,.28,0xa77a51,side*5.2,.36,z-3);[-.19,.19].forEach(offset=>box(group,.055,.34,.055,0x526872,side*5.2+offset,.17,z-3));
   }
   const parked=makeVehicle('car',[0x508cab,0xce7460,0xf0c35c][index%3]);parked.model.position.set(side*5.3,0,-20);parked.model.rotation.y=side>0?Math.PI:0;group.add(parked.model);
  });
  // Zebra crossings and road-side town sign are part of the passing scenery.
  for(let i=0;i<10;i++)box(group,.42,.008,1.25,0xedeada,-2.8+i*.62,-.03,-28);
  const post=mesh(group,new T.CylinderGeometry(.04,.04,1.8,12),0x727f75,4.9,.9,-57);box(group,.07,.72,1.38,0x3e7795,post.position.x,1.62,-57);
  return group;
 }
 const tiles:Array<{group:T.Group;forest:T.Group;town:T.Group;start:number}>=[];
 for(let i=0;i<7;i++){const group=new T.Group();scene.add(group);tiles.push({group,forest:forest(group),town:town(group,i),start:(i-1)*120});}
 function tileKind(start:number){const route=((start+60)%ROUTE_LENGTH+ROUTE_LENGTH)%ROUTE_LENGTH;return route>=TOWN_START&&route<TOWN_END;}
 const player=makeVehicle('motorcycle',0xe64b38,true);scene.add(player.model);
 const rivals=rivalNames.map((_,i)=>{const vehicle=makeVehicle('motorcycle',[0xd98b31,0x4c8cb6,0x985889,0xb9b9ca,0x506f91,0x885941][i]);scene.add(vehicle.model);return vehicle;});
 const police=makeVehicle('motorcycle',0xf0f4ef);scene.add(police.model);
 const policeLights=[0xef4937,0x278fff].map((color,i)=>{const light=new T.Mesh(new T.SphereGeometry(.07,16,12),new T.MeshBasicMaterial({color}));light.position.set(i===0?-.16:.16,.66,.36);police.model.add(light);return light;});
 const labels=rivals.map((vehicle,i)=>{const canvas=document.createElement('canvas');canvas.width=256;canvas.height=72;const texture=new T.CanvasTexture(canvas),sprite=new T.Sprite(new T.SpriteMaterial({map:texture,depthTest:false}));sprite.position.set(0,1.55,0);sprite.scale.set(1.6,.45,1);vehicle.model.add(sprite);return {canvas,texture,sprite,health:-1,id:i};});
 function updateLabel(label:typeof labels[number],health:number){if(label.health===health)return;label.health=health;const ctx=label.canvas.getContext('2d')!;ctx.clearRect(0,0,256,72);ctx.fillStyle='#172631cf';ctx.fillRect(0,0,256,60);ctx.font='600 30px sans-serif';ctx.fillStyle='#fff';ctx.textAlign='center';ctx.fillText(rivalNames[label.id][options.english?1:0],128,34);ctx.fillStyle='#32404a';ctx.fillRect(12,45,232,8);ctx.fillStyle=health<35?'#f08b5b':'#72bbec';ctx.fillRect(12,45,232*Math.max(0,health)/100,8);label.texture.needsUpdate=true;}
 const finish=new T.Group();scene.add(finish);[-3.75,3.75].forEach(x=>box(finish,.15,3.8,.15,0xe8e1cf,x,1.9,0));
 for(let row=0;row<3;row++)for(let col=0;col<24;col++)box(finish,7.5/24,.23,.05,(row+col)%2?0x253440:0xf6f0dc,-3.6+col*7.5/24,3.3+row*.23,0);
 for(let i=0;i<12;i++)box(finish,.6,.015,1.4,i%2?0xf2ecd8:0x202d34,-3.3+i*.6,-.026,0);
 const impactSpark=new T.Group();scene.add(impactSpark);const sparks=Array.from({length:12},(_,i)=>{const m=new T.Mesh(new T.SphereGeometry(.035,8,6),new T.MeshBasicMaterial({color:i%3?0xffc558:0xffefb7}));impactSpark.add(m);return m;});impactSpark.visible=false;
 const traffic:Array<RoadVehicle&{lane:number;direction:number}>=['car','truck','tank','bicycle','car','motorcycle'].map((kind,i)=>{
  const vehicle=makeVehicle(kind as RoadVehicle['kind'],[0xe1ad48,0x427ab7,0x708149,0x508eaf,0xefe2b8,0x7c65b2][i]);scene.add(vehicle.model);return {...vehicle,lane:0,direction:i===1?-1:1};
 });
 const lanes=[-2.35,-.78,.78,2.35];let passed=0,last=0,lastHud=0,frame=0,visible=true,lastTraffic=-20,lastNotice='';
 function spawn(vehicle:typeof traffic[number],initialZ?:number){const farthest=Math.min(-45,...traffic.filter(v=>v!==vehicle).map(v=>v.model.position.z));vehicle.lane=lanes[Math.floor(Math.random()*lanes.length)];vehicle.model.position.set(vehicle.lane,0,initialZ??Math.min(lastTraffic-24,farthest-24));vehicle.model.rotation.set(0,vehicle.direction<0?Math.PI:0,0);lastTraffic=vehicle.model.position.z;}
 function hud():RideHud{const route=race.distance%ROUTE_LENGTH,nearest=race.nearest;return {distance:Math.floor(race.progress),speed:Math.round(race.speed),passed,town:route>=TOWN_START&&route<TOWN_END,nextTown:Math.ceil(route<TOWN_START?TOWN_START-route:ROUTE_LENGTH+TOWN_START-route),stamina:Math.round(race.stamina),bike:Math.round(race.bike),nitro:Math.round(race.nitro),heat:Math.round(race.heat),weapon:race.weapon,place:race.place,total:7,length:race.length,stage:race.stage,elapsed:race.elapsed,status:race.status,countdown:Math.ceil(race.countdown),recovery:Math.ceil(race.recovery),notice:race.notice,knockdowns:race.knockdowns,falls:race.falls,police:race.policeActive,nearest:nearest?{id:nearest.id,health:Math.max(0,nearest.health),gap:Math.round(Math.abs(nearest.progress-race.progress))}:null,standings:[{id:-1,progress:race.progress},...race.rivals.map(r=>({id:r.id,progress:r.progress}))].sort((a,b)=>b.progress-a.progress).map(r=>r.id)};}
 function configureTile(tile:typeof tiles[number]){const urban=tileKind(tile.start);tile.town.visible=urban;tile.forest.visible=!urban;tile.forest.children.forEach(object=>{if(!(object instanceof T.InstancedMesh))return;const points=object.userData.points as Array<{x:number;y:number;z:number;s?:number;rx?:number;ry?:number}>;points.forEach((p,i)=>{const distance=tile.start-p.z*2;dummy.position.set(p.x+roadCenter(distance)-roadCenter(tile.start),p.y+roadHeight(distance)-roadHeight(tile.start),p.z);dummy.rotation.set(p.rx??0,p.ry??0,0);dummy.scale.setScalar(p.s??1);dummy.updateMatrix();object.setMatrixAt(i,dummy.matrix);});object.instanceMatrix.needsUpdate=true;object.computeBoundingSphere();});}
 function reset(stage?:number){race.reset(stage);passed=0;lastTraffic=-20;traffic.forEach((vehicle,i)=>spawn(vehicle,-45-i*28));tiles.forEach((tile,i)=>{tile.start=(i-1)*120;configureTile(tile);});camera.position.set(0,4.8,13);updateVisuals(0);options.onHud(hud());renderer.render(scene,camera);}
 function updateTiles(){tiles.forEach(tile=>{if(tile.start+120<race.distance-22){tile.start+=840;configureTile(tile);}tile.group.position.set(roadCenter(tile.start)-roadCenter(race.distance),roadHeight(tile.start)-roadHeight(race.distance),-(tile.start-race.distance)/2+6);});}
 function updateVisuals(dt:number){
  updateRoad();updateTiles();const recovering=race.status==='recovering',boost=options.keys.has('Shift')&&race.nitro>0;
  player.model.position.set(race.x+pathX(race.z),pathY(race.z),race.z);player.model.rotation.z=recovering?Math.PI*.43:player.model.rotation.z+(Math.sign(Number(options.keys.has('ArrowRight')||options.keys.has('d'))-Number(options.keys.has('ArrowLeft')||options.keys.has('a')))*-.2-player.model.rotation.z)*Math.min(1,dt*8);player.model.rotation.y=recovering?.4:0;
  player.rig?.pose(Math.sin(Math.PI*race.attackTime/.35),race.attackSide,race.attackKind==='kick',race.weapon);player.model.visible=!race.complete||race.status==='finished';
  rivals.forEach((vehicle,i)=>{const r=race.rivals[i],z=3+(race.distance-r.progress)/2;vehicle.model.position.set(r.x+pathX(z),pathY(z),z);vehicle.model.rotation.z=r.down>0?Math.PI*.42:Math.sin(race.clock*.6+i)*.04;vehicle.rig?.pose(Math.sin(Math.PI*r.attack/.34),r.attackSide,false,r.armed);vehicle.wheels.forEach(w=>w.rotation.x-=r.speed/7.2*dt/.22);labels[i].sprite.visible=r.down<=0;updateLabel(labels[i],Math.ceil(r.health));});
  police.model.visible=race.policeActive;const policeZ=3+(race.distance-race.policeProgress)/2;police.model.position.set(race.policeX+pathX(policeZ),pathY(policeZ),policeZ);policeLights.forEach((light,i)=>light.visible=Math.floor(race.clock*8)%2===i);
  const finishZ=3+(race.distance-race.length)/2;finish.position.set(pathX(finishZ),pathY(finishZ),finishZ);finish.visible=finishZ>-200&&finishZ<20;
  const flash=race.clock-race.lastImpact;impactSpark.visible=race.lastImpact>0&&flash<.3;if(impactSpark.visible){impactSpark.position.copy(player.model.position);sparks.forEach((spark,i)=>spark.position.set(Math.cos(i*2.4)*flash*2.5,.45+Math.sin(i*.7)*flash*2,Math.sin(i*2.4)*flash*2.5));}
  camera.position.x+=(race.x*.24-camera.position.x)*Math.min(1,dt*3);camera.position.y+=(4.8+(recovering?.35:0)-camera.position.y)*Math.min(1,dt*3);camera.rotation.z=(flash<.3&&race.lastImpact>0?Math.sin(flash*80)*.016:0);camera.fov+=((boost?54:50)-camera.fov)*Math.min(1,dt*3);camera.lookAt(race.x*.25,.6,-15);camera.updateProjectionMatrix();
 }
 const resize=()=>{const {width,height}=element.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();renderer.render(scene,camera);};
 const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(element);const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;});intersection.observe(element);const visibility=()=>{if(document.hidden)options.onPause();};document.addEventListener('visibilitychange',visibility);
 reset();resize();
 function animate(now:number){
  frame=requestAnimationFrame(animate);const dt=Math.min(.04,(now-last)/1000);last=now;if(document.hidden||!visible||!options.isPlaying()){audio.tick(0,false,false);return;}
  const k=options.keys;race.step(dt,{left:(k.has('ArrowLeft')||k.has('a')),right:(k.has('ArrowRight')||k.has('d')),up:(k.has('ArrowUp')||k.has('w')),down:(k.has('ArrowDown')||k.has('s')),boost:k.has('Shift'),brake:k.has('b')});const scroll=race.speed/7.2*dt;
  marks.forEach(mark=>{mark.position.z+=scroll;if(mark.position.z>12)mark.position.z-=208.8;});clouds.forEach((cloud,i)=>cloud.position.x+=dt*.055*(i%2?-1:1));player.wheels.forEach(wheel=>wheel.rotation.x-=scroll/.22);
  if(race.status!=='countdown')traffic.forEach(vehicle=>{
   vehicle.model.position.z+=(race.speed-vehicle.cruise*vehicle.direction)/7.2*dt;
   if(vehicle.model.position.z>11){passed++;spawn(vehicle);}else if(vehicle.model.position.z< -190)spawn(vehicle,-145-Math.random()*25);
   const z=vehicle.model.position.z;vehicle.model.position.x=vehicle.lane+pathX(z);vehicle.model.position.y=pathY(z);vehicle.wheels.forEach(wheel=>wheel.rotation.x-=vehicle.cruise/7.2*dt/.23);
   if(Math.abs(vehicle.lane-race.x)<(vehicle.width+player.width)*.43&&Math.abs(z-race.z)<(vehicle.length+player.length)*.43)race.impact(vehicle.kind==='motorcycle'?34:vehicle.kind==='bicycle'?24:70,vehicle.kind==='tank'?36:vehicle.kind==='bicycle'?7:22);
  });
  updateVisuals(dt);audio.tick(race.speed,race.status==='racing',race.policeActive);if(race.notice&&race.notice!==lastNotice){lastNotice=race.notice;audio.cue(race.notice);}if(!race.notice)lastNotice='';
  if(now-lastHud>90||race.complete){lastHud=now;options.onHud(hud());}renderer.render(scene,camera);if(race.complete){options.keys.clear();options.onComplete();}
 }
 frame=requestAnimationFrame(animate);
 return {reset,nudge:key=>{if(options.isPlaying())race.nudge(key);},attack:kind=>{if(!options.isPlaying())return;race.attack(kind);options.onHud(hud());},setSound:enabled=>audio.setEnabled(enabled),dispose(){cancelAnimationFrame(frame);resizeObserver.disconnect();intersection.disconnect();document.removeEventListener('visibilitychange',visibility);options.keys.clear();audio.dispose();const gs=new Set<T.BufferGeometry>(),ms=new Set<T.Material>(),textures=new Set<T.Texture>();scene.traverse(object=>{if(object instanceof T.Mesh||object instanceof T.Sprite){if(object instanceof T.Mesh)gs.add(object.geometry);(Array.isArray(object.material)?object.material:[object.material]).forEach(m=>{ms.add(m);const mapped=m as T.MeshBasicMaterial;if(mapped.map)textures.add(mapped.map);});}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.domElement.remove();}};
}
