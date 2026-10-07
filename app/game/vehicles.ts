import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

export type VehicleKind='bicycle'|'motorcycle'|'car'|'truck'|'tank';
export type RiderRig={arms:T.Group[];legs:T.Group[];weapon:T.Group;pose:(attack:number,side:number,kick:boolean,armed:boolean)=>void};
export type RoadVehicle={model:T.Group;kind:VehicleKind;width:number;length:number;cruise:number;wheels:T.Object3D[];rig?:RiderRig};
const paints=new Map<number,T.MeshStandardMaterial>();
const paint=(color:number,metalness=.15)=>{
 const key=color+metalness;let result=paints.get(key);
 if(!result){result=new T.MeshStandardMaterial({color,roughness:.36,metalness});paints.set(key,result);}return result;
};
const tire=()=>paint(0x172027),metal=()=>paint(0xb9c8d1,.7),glass=()=>paint(0x244559,.5);

export function makeVehicle(kind:VehicleKind,color:number,player=false):RoadVehicle{
 const model=new T.Group(),wheels:T.Object3D[]=[];let rig:RiderRig|undefined;
 function mesh(geometry:T.BufferGeometry,material:T.Material,x=0,y=0,z=0,parent:T.Object3D=model){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);parent.add(m);return m;}
 function box(w:number,h:number,d:number,c:number,x=0,y=0,z=0,r=.04){return mesh(new RoundedBoxGeometry(w,h,d,2,r),paint(c),x,y,z);}
 function rod(a:T.Vector3,b:T.Vector3,radius:number,c:number,parent:T.Object3D=model){const delta=b.clone().sub(a),m=mesh(new T.CylinderGeometry(radius,radius,delta.length(),12),paint(c,.5),0,0,0,parent);m.position.copy(a.clone().add(b).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return m;}
 const point=(x:number,y:number,z:number)=>new T.Vector3(x,y,z);
 function wheel(x:number,y:number,z:number,r:number,thin=false){
  const group=new T.Group();group.position.set(x,y,z);model.add(group);wheels.push(group);
  const rubber=mesh(thin?new T.TorusGeometry(r,.027,10,36):new T.CylinderGeometry(r,r,.17,36),tire(),0,0,0,group);
  rubber.rotation[thin?'y':'z']=Math.PI/2;
  const hub=mesh(new T.CylinderGeometry(thin?.035:r*.53,thin?.035:r*.53,thin?.07:.18,24),metal(),0,0,0,group);hub.rotation.z=Math.PI/2;
  if(thin)for(let i=0;i<10;i++){const angle=i*Math.PI/5;rod(point(0,0,0),point(0,Math.cos(angle)*r,Math.sin(angle)*r),.006,0xcbd7de,group);}
 }
 function rider(bicycle=false){
  const jacket=player?0xe74438:color,skin=0xe7bb8e;
  const torso=mesh(new T.CapsuleGeometry(.14,.24,8,20),paint(jacket),0,.9,.03);torso.rotation.x=-.36;
  const arms:T.Group[]=[],legs:T.Group[]=[];
  [-1,1].forEach(side=>{
   const arm=new T.Group();arm.position.set(side*.14,.94,-.01);model.add(arm);arms.push(arm);rod(point(0,0,0),point(side*.09,-.19,-.35),.048,jacket,arm);mesh(new T.SphereGeometry(.058,16,12),paint(skin),side*.09,-.19,-.35,arm);
   const leg=new T.Group();leg.position.set(side*.08,.72,.14);model.add(leg);legs.push(leg);rod(point(0,0,0),point(side*.07,-.32,-.09),.055,0x27374c,leg);const boot=mesh(new RoundedBoxGeometry(.1,.07,.19,2,.02),tire(),side*.09,-.37,-.15,leg);boot.rotation.x=-.1;
  });
  const weapon=new T.Group();weapon.position.set(.09,-.19,-.35);arms[1].add(weapon);
  for(let i=0;i<9;i++){const link=mesh(new T.TorusGeometry(.045,.01,8,12),metal(),i*.065,0,0,weapon);link.rotation.x=i%2?Math.PI/2:0;}
  weapon.visible=false;
  rig={arms,legs,weapon,pose(attack,side,kick,armed){arms.forEach((arm,i)=>{arm.rotation.set(0,0,0);if(attack>0&&(i===0?-1:1)===side){arm.rotation.z=side*(kick?.3:1.9)*attack;arm.rotation.y=-side*.65*attack;}});legs.forEach((leg,i)=>{leg.rotation.set(0,0,0);if(kick&&attack>0&&(i===0?-1:1)===side)leg.rotation.z=side*1.7*attack;});const hand=attack>0&&side<0?0:1;if(weapon.parent!==arms[hand])arms[hand].add(weapon);weapon.position.x=hand===0?-.09:.09;weapon.scale.x=hand===0?-1:1;weapon.visible=armed;weapon.rotation.y=attack*2;}};
  mesh(new T.SphereGeometry(.16,24,18),paint(player?0xfaf3dd:skin),0,1.16,-.1);
  const visor=mesh(new T.SphereGeometry(.164,20,12,Math.PI*.12,Math.PI*.76,Math.PI*.34,Math.PI*.3),glass(),0,1.16,-.1);visor.rotation.y=Math.PI;
  if(bicycle)box(.22,.028,.13,0xffd35c,0,1.27,-.09);
 }
 let width=.44,length=1.25,cruise=47;
 if(kind==='bicycle'){
  width=.44;length=1.36;cruise=22;
  wheel(0,.29,-.5,.28,true);wheel(0,.29,.5,.28,true);
  const a=point(0,.3,.5),b=point(0,.4,.02),c=point(0,.73,.16),d=point(0,.78,-.35),e=point(0,.3,-.5);
  [[a,b],[b,c],[c,a],[c,d],[d,b],[d,e],[e,b]].forEach(([p,q])=>rod(p,q,.023,color));
  box(.18,.045,.22,0x222c36,0,.76,.17);rod(point(-.24,.82,-.38),point(.24,.82,-.38),.022,0xc4d1d6);rider(true);
 }else if(kind==='motorcycle'){
  wheel(0,.23,-.46,.22);wheel(0,.23,.46,.22);
  box(.32,.26,.7,color,0,.48,0,.1);box(.2,.18,.32,0x687782,0,.35,.05);
  box(.25,.065,.32,0x18222d,0,.64,.18);
  rod(point(-.09,.24,-.45),point(-.09,.7,-.35),.026,0xc4d1d6);rod(point(.09,.24,-.45),point(.09,.7,-.35),.026,0xc4d1d6);
  rod(point(-.24,.77,-.38),point(.24,.77,-.38),.027,0xd4dce4);
  const lamp=mesh(new T.CylinderGeometry(.095,.095,.07,24),paint(0xffedb5),0,.65,-.48);lamp.rotation.x=Math.PI/2;
  box(.18,.04,.035,0xee442f,0,.57,.39);rod(point(.19,.31,.15),point(.19,.31,.54),.047,0xaebac2);rider();
 }else if(kind==='car'){
  width=1.06;length=2.1;cruise=53;
  [-.48,.48].forEach(x=>[-.66,.68].forEach(z=>wheel(x,.23,z,.23)));
  box(1.03,.35,1.94,color,0,.43,0,.12);box(.83,.42,.93,color,0,.76,.12,.1);
  box(.73,.23,.035,0x254d65,0,.81,-.37,.02);box(.73,.2,.035,0x254d65,0,.83,.61,.02);
  [-.424,.424].forEach(x=>{box(.015,.2,.63,0x254d65,x,.83,.12,.01);box(.012,.24,.04,color,x,.81,.14,.01);box(.08,.06,.16,color,x*1.25,.7,-.3,.025);});
  [-.32,.32].forEach(x=>{box(.2,.09,.032,0xffebba,x,.49,-.98,.015);box(.21,.07,.035,0xf3453c,x,.47,.98,.01);});
  box(.45,.1,.024,0x242e35,0,.37,-.989,.015);box(.2,.06,.02,0xf4f1dd,0,.32,.99,.005);
 }else if(kind==='truck'){
  width=1.15;length=3.18;cruise=40;
  [-.54,.54].forEach(x=>[-1.08,.53,1.12].forEach(z=>wheel(x,.26,z,.26)));
  box(1.06,.18,2.9,0x34454d,0,.34,0);box(1.09,1.02,.9,color,0,.86,-.97,.08);
  box(.9,.38,.026,0x28556e,0,1.06,-1.44,.01);[-.551,.551].forEach(x=>box(.018,.3,.5,0x28556e,x,1.08,-.99,.015));
  box(1.14,1.23,1.94,0xf0dbc1,0,1.03,.52,.035);box(1.17,.12,1.99,0xeba04d,0,1.59,.52,.03);
  for(let i=0;i<8;i++)[-.577,.577].forEach(x=>box(.017,.96,.025,0xd1b694,x,1.06,-.27+i*.23,.005));
  [-.33,.33].forEach(x=>box(.2,.1,.035,0xffe8a4,x,.61,-1.439,.01));box(.43,.18,.024,0x263943,0,.78,-1.445,.01);
 }else{
  width=1.3;length=2.32;cruise=32;
  [-.52,.52].forEach(x=>{const track=mesh(new T.CapsuleGeometry(.23,1.45,8,20),tire(),x,.28,0);track.rotation.x=Math.PI/2;track.scale.x=.67;for(let i=0;i<5;i++)wheel(x,.29,-.64+i*.32,.14);for(let i=0;i<10;i++)box(.32,.022,.055,0x596354,x,.52,-.91+i*.2,.008);});
  box(1.05,.3,1.95,color,0,.55,0,.08);box(.81,.32,.83,color,0,.84,.1,.12);
  const turret=mesh(new T.CylinderGeometry(.21,.24,.12,24),paint(0x677549),0,1.07,.2);
  const barrel=mesh(new T.CylinderGeometry(.045,.06,1.14,16),paint(color),0,.95,-.8);barrel.rotation.x=Math.PI/2;
  mesh(new T.CylinderGeometry(.075,.075,.12,16),tire(),0,.95,-1.39).rotation.x=Math.PI/2;
  rod(point(.31,1.05,.39),point(.31,1.69,.39),.011,0x293f30);turret.rotation.y=.15;
 }
 const shadow=mesh(new T.CircleGeometry(1,32),new T.MeshBasicMaterial({color:0x101b17,transparent:true,opacity:.22,depthWrite:false}),0,.014,0);
 shadow.rotation.x=-Math.PI/2;shadow.scale.set(width*.8,length*.6,1);
 return {model,kind,width,length,cruise,wheels,rig};
}
