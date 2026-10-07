'use client';
import {useEffect,useRef} from 'react';

export default function SidebarModel({theme,running}:{theme:'light'|'dark'|'antd';running:boolean}){
 const host=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const element=host.current;if(!element)return;
  let alive=true,dispose=()=>{};
  import('three').then(T=>{
   if(!alive)return;
   let renderer;try{renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{return;}
   renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
   renderer.setClearColor(0x000000,0);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
   element.appendChild(renderer.domElement);
   const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.1,30);
   camera.position.set(0,.3,7.5);camera.lookAt(0,0,0);
   scene.add(new T.HemisphereLight(0xe5efff,0x5d348a,3));
   const blueLight=new T.DirectionalLight(0xffffff,5);blueLight.position.set(-3,4,5);scene.add(blueLight);
   const pinkLight=new T.PointLight(0xff72cf,16,12);pinkLight.position.set(3,1,3);scene.add(pinkLight);
   const goldLight=new T.PointLight(0xffb648,13,12);goldLight.position.set(-3,-2,2);scene.add(goldLight);
   const tilt=new T.Group(),model=new T.Group();scene.add(tilt);tilt.add(model);
   const knot=new T.Mesh(new T.TorusKnotGeometry(.72,.23,128,20,2,3),new T.MeshPhysicalMaterial({color:0x5688ff,metalness:.35,roughness:.2,clearcoat:1,clearcoatRoughness:.13,iridescence:.8,iridescenceIOR:1.35}));model.add(knot);
   const rings=[0xab69ff,0xffaf4d].map((color,i)=>{
    const ring=new T.Mesh(new T.TorusGeometry(1.45+i*.13,.024,8,100),new T.MeshStandardMaterial({color,metalness:.4,roughness:.25,emissive:color,emissiveIntensity:.18}));
    ring.rotation.set(.9+i*.75,.35+i*.75,.3);model.add(ring);return ring;
   });
   const satellites=[0xff8bbb,0x8b67ff,0xffbd63].map((color,i)=>{
    const sphere=new T.Mesh(new T.SphereGeometry(.09+i*.025,20,16),new T.MeshStandardMaterial({color,metalness:.25,roughness:.2,emissive:color,emissiveIntensity:.18}));model.add(sphere);return sphere;
   });
   let frame=0,visible=true,last=0,x=0,y=0;
   const render=(time:number)=>{
    model.rotation.set(.23,time*.00018,.12);model.position.y=Math.sin(time*.001)*.09;
    tilt.rotation.x+=(y*.16-tilt.rotation.x)*.06;tilt.rotation.y+=(x*.2-tilt.rotation.y)*.06;
    rings[0].rotation.z=.3+time*.00012;rings[1].rotation.z=.3-time*.00008;
    satellites.forEach((sphere,i)=>{const a=time*.0005+i*Math.PI*2/3;sphere.position.set(Math.cos(a)*1.48,Math.sin(a)*.7,Math.sin(a+i)*.9);});
    renderer.render(scene,camera);
   };
   const resize=()=>{const {width,height}=element.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();render(last);};
   const observer=new ResizeObserver(resize);observer.observe(element);
   const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;});intersection.observe(element);
   const move=(event:PointerEvent)=>{const r=element.getBoundingClientRect();x=(event.clientX-r.left)/r.width*2-1;y=(event.clientY-r.top)/r.height*2-1;};
   const leave=()=>{x=0;y=0;};element.addEventListener('pointermove',move);element.addEventListener('pointerleave',leave);
   resize();
   const animate=(now:number)=>{frame=requestAnimationFrame(animate);if(document.hidden||!visible||now-last<33)return;last=now;render(now);};
   if(running)frame=requestAnimationFrame(animate);
   dispose=()=>{cancelAnimationFrame(frame);observer.disconnect();intersection.disconnect();element.removeEventListener('pointermove',move);element.removeEventListener('pointerleave',leave);scene.traverse(object=>{if(object instanceof T.Mesh){object.geometry.dispose();const materials=Array.isArray(object.material)?object.material:[object.material];materials.forEach(material=>material.dispose());}});renderer.dispose();renderer.domElement.remove();};
  }).catch(()=>{});
  return()=>{alive=false;dispose();};
 },[theme,running]);
 return <div ref={host} className="sidebar-model" aria-hidden="true"/>;
}
