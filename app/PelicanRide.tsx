'use client';
import {useEffect,useRef} from 'react';

export default function PelicanRide({running}:{running:boolean}){
 const host=useRef<HTMLDivElement>(null),runningRef=useRef(running);runningRef.current=running;
 useEffect(()=>{
  const element=host.current;if(!element)return;let alive=true,dispose=()=>{};
  import('three').then(T=>{
   if(!alive)return;
   let renderer:InstanceType<typeof T.WebGLRenderer>;try{renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});}catch{return;}
   renderer.setPixelRatio(Math.min(3,Math.max(2,devicePixelRatio)));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;renderer.setClearColor(0,0);element.appendChild(renderer.domElement);
   const scene=new T.Scene(),camera=new T.OrthographicCamera(-2.8,2.8,2.1,-2.1,.1,30);camera.position.set(5,3.1,12);camera.lookAt(.25,1.65,0);
   scene.add(new T.HemisphereLight(0xedfaff,0x687b9d,2.4));const light=new T.DirectionalLight(0xffefd7,3.7);light.position.set(-3,6,7);scene.add(light);
   const ivory=new T.MeshStandardMaterial({color:0xfffcf0,roughness:.55}),feather=new T.MeshStandardMaterial({color:0xe3e9ee,roughness:.65}),gold=new T.MeshStandardMaterial({color:0xf7b437,roughness:.42}),pouch=new T.MeshStandardMaterial({color:0xffd079,roughness:.55}),orange=new T.MeshStandardMaterial({color:0xd68b36,roughness:.6}),blue=new T.MeshStandardMaterial({color:0x328bbd,metalness:.45,roughness:.3}),rubber=new T.MeshStandardMaterial({color:0x26374e,roughness:.75}),chrome=new T.MeshStandardMaterial({color:0xcad7e2,metalness:.7,roughness:.28}),black=new T.MeshStandardMaterial({color:0x182539,roughness:.3});
   const sphere=new T.SphereGeometry(1,32,24),cylinder=new T.CylinderGeometry(1,1,1,16),bird=new T.Group(),bicycle=new T.Group(),ride=new T.Group();scene.add(ride);ride.add(bicycle,bird);
   function ellipsoid(parent:InstanceType<typeof T.Object3D>,material:InstanceType<typeof T.Material>,x:number,y:number,z:number,sx:number,sy:number,sz:number){const m=new T.Mesh(sphere,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;}
   function line(parent:InstanceType<typeof T.Object3D>,a:InstanceType<typeof T.Vector3>,b:InstanceType<typeof T.Vector3>,radius:number,material:InstanceType<typeof T.Material>){const m=new T.Mesh(cylinder,material);parent.add(m);positionLine(m,a,b,radius);return m;}
   function positionLine(m:InstanceType<typeof T.Mesh>,a:InstanceType<typeof T.Vector3>,b:InstanceType<typeof T.Vector3>,radius:number){const d=b.clone().sub(a);m.position.copy(a.clone().add(b).multiplyScalar(.5));m.scale.set(radius,d.length(),radius);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());}
   const v=(x:number,y:number,z=0)=>new T.Vector3(x,y,z),wheels:InstanceType<typeof T.Group>[]=[];
   [-1.3,1.3].forEach(x=>{
    const wheel=new T.Group();wheel.position.set(x,.65,0);bicycle.add(wheel);wheels.push(wheel);
    const tire=new T.Mesh(new T.TorusGeometry(.6,.055,16,64),rubber),rim=new T.Mesh(new T.TorusGeometry(.54,.022,12,64),chrome);wheel.add(tire,rim);
    for(let i=0;i<12;i++){const angle=i*Math.PI/6;line(wheel,v(0,0),v(Math.cos(angle)*.53,Math.sin(angle)*.53),.007,chrome);}
    const hub=new T.Mesh(new T.CylinderGeometry(.08,.08,.18,24),blue);hub.rotation.x=Math.PI/2;wheel.add(hub);
   });
   const rear=v(-1.3,.65),crank=v(-.05,.66),seat=v(-.57,1.46),front=v(.86,1.49),axle=v(1.3,.65);
   [[rear,crank],[crank,seat],[seat,rear],[seat,front],[front,crank],[front,axle],[axle,crank]].forEach(([a,b])=>line(bicycle,a,b,.04,blue));
   line(bicycle,v(-.57,1.4),v(-.57,1.62),.035,chrome);ellipsoid(bicycle,rubber,-.62,1.64,0,.26,.06,.15);
   line(bicycle,front,v(.81,1.79),.033,chrome);line(bicycle,v(.81,1.79,-.24),v(.81,1.79,.24),.028,chrome);
   [-.24,.24].forEach(z=>ellipsoid(bicycle,rubber,.81,1.79,z,.095,.04,.045));
   const chainring=new T.Mesh(new T.CylinderGeometry(.19,.19,.06,32),chrome);chainring.rotation.x=Math.PI/2;chainring.position.copy(crank);bicycle.add(chainring);
   line(bicycle,v(-1.29,.65,.07),v(-.06,.76,.07),.012,rubber);line(bicycle,v(-1.29,.65,.07),v(-.06,.53,.07),.012,rubber);
   const pedals=new T.Group();pedals.position.copy(crank);bicycle.add(pedals);line(pedals,v(-.2,0,-.19),v(.2,0,.19),.025,chrome);
   [-1,1].forEach(side=>ellipsoid(pedals,rubber,side*.2,0,side*.19,.1,.035,.1));
   // A long neck, narrow upper bill and hanging throat pouch distinguish the pelican.
   ellipsoid(bird,ivory,-.57,2.03,0,.63,.58,.43).rotation.z=-.16;
   const neckPath=new T.CatmullRomCurve3([v(-.13,2.02),v(.07,2.45),v(.04,2.73),v(.38,2.96),v(.65,3.03)]);
   bird.add(new T.Mesh(new T.TubeGeometry(neckPath,40,.15,20,false),ivory));
   const head=new T.Group();head.position.set(.66,3.06,0);bird.add(head);
   ellipsoid(head,ivory,0,0,0,.3,.285,.255);
   const bill=ellipsoid(head,gold,.62,-.03,0,.66,.055,.16);bill.rotation.z=-.025;
   const throat=ellipsoid(head,pouch,.49,-.19,0,.48,.19,.14);throat.rotation.z=.15;
   ellipsoid(head,gold,1.22,-.035,0,.035,.07,.11);
   const eyes:InstanceType<typeof T.Mesh>[]=[];
   [-1,1].forEach(side=>{ellipsoid(head,pouch,.125,.07,side*.228,.095,.1,.023);eyes.push(ellipsoid(head,black,.14,.082,side*.249,.041,.048,.018));ellipsoid(head,ivory,.15,.102,side*.265,.012,.014,.005);});
   for(let i=0;i<3;i++){const crest=ellipsoid(head,ivory,-.18-i*.035,.245+i*.014,0,.12,.03,.1);crest.rotation.z=-.35-i*.2;}
   for(let i=0;i<4;i++){const tail=ellipsoid(bird,i%2?feather:ivory,-1.11-i*.085,1.93+i*.05,(i-1.5)*.06,.36,.095,.075);tail.rotation.z=-.15;}
   [-1,1].forEach(side=>{
    const wing=ellipsoid(bird,feather,-.58,2.08,side*.345,.46,.27,.09);wing.rotation.z=-.27;
    for(let i=0;i<5;i++){const f=ellipsoid(bird,ivory,-.62+i*.09,1.96+i*.035,side*.395,.27,.067,.035);f.rotation.z=.45;}
    line(bird,v(-.16,2.06,side*.22),v(.81,1.82,side*.24),.055,ivory);
   });
   const legs=[-1,1].map(side=>({side,upper:line(bird,v(-.49,1.72,side*.18),v(-.42,1.2,side*.18),.039,orange),lower:line(bird,v(-.42,1.2,side*.18),v(0,.72,side*.2),.031,orange),foot:ellipsoid(bird,gold,0,.72,side*.2,.16,.04,.1)}));
   const shadow=new T.Mesh(new T.CircleGeometry(1,64),new T.MeshBasicMaterial({color:0x6381a9,transparent:true,opacity:.15,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.scale.set(2,.45,1);shadow.position.y=.007;scene.add(shadow);
   const tracks:InstanceType<typeof T.Mesh>[]=[];for(let i=0;i<6;i++){const m=line(scene,v(-2.6+i*.9,.03,-.6),v(-2.32+i*.9,.03,-.6),.014,chrome);tracks.push(m);}
   let frame=0,last=0,time=0,visible=true;
   const resize=()=>{const {width,height}=element.getBoundingClientRect();if(!width||!height)return;const aspect=width/height;camera.left=-2.15*aspect;camera.right=2.15*aspect;camera.updateProjectionMatrix();renderer.setSize(width,height);renderer.render(scene,camera);};
   const observer=new ResizeObserver(resize);observer.observe(element);resize();const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;});intersection.observe(element);
   function animate(now:number){frame=requestAnimationFrame(animate);const dt=Math.min(.04,(now-last)/1000);last=now;if(document.hidden||!visible||!runningRef.current)return;time+=dt;const angle=-time*3.2;
    wheels.forEach(w=>w.rotation.z=angle);pedals.rotation.z=angle;ride.position.y=Math.sin(time*6.4)*.025;head.rotation.z=Math.sin(time*1.6)*.035;
    legs.forEach(leg=>{const theta=angle+(leg.side<0?Math.PI:0),foot=v(crank.x+Math.cos(theta)*.2,crank.y+Math.sin(theta)*.2,leg.side*.2),hip=v(-.49,1.7,leg.side*.18),knee=v(-.38+Math.cos(theta)*.11,1.12+Math.sin(theta)*.05,leg.side*.2);positionLine(leg.upper,hip,knee,.039);positionLine(leg.lower,knee,foot,.031);leg.foot.position.copy(foot);leg.foot.rotation.z=Math.cos(theta)*.15;});
    const blink=time%5>4.84;eyes.forEach(eye=>eye.scale.y=blink?.008:.048);tracks.forEach((track,i)=>track.position.x=-2.5+((i*.9-time*.9)%5.4+5.4)%5.4);renderer.render(scene,camera);
   }
   frame=requestAnimationFrame(animate);
   dispose=()=>{cancelAnimationFrame(frame);observer.disconnect();intersection.disconnect();const geometries=new Set<InstanceType<typeof T.BufferGeometry>>(),materials=new Set<InstanceType<typeof T.Material>>();scene.traverse(object=>{if(object instanceof T.Mesh){geometries.add(object.geometry);(Array.isArray(object.material)?object.material:[object.material]).forEach(m=>materials.add(m));}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove();};
  }).catch(()=>{});
  return()=>{alive=false;dispose();};
 },[]);
 return <div ref={host} className="pelican-ride" role="img" aria-label="鹈鹕骑自行车动画 / Pelican riding a bicycle"/>;
}
