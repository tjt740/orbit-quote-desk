export type CropArea={x:number;y:number;width:number;height:number};
export function loadCropImage(src:string):Promise<HTMLImageElement>{return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('invalid_image'));image.src=src;});}
// Draw directly into a bounded output canvas; large originals need no intermediate canvas.
export function drawCrop(image:HTMLImageElement,area:CropArea,rotation:number,canvas:HTMLCanvasElement,maxSize=1024){
 if(![area.x,area.y,area.width,area.height,rotation].every(Number.isFinite)||area.width<=0||area.height<=0)throw Error('invalid_crop');
 const scale=Math.min(1,maxSize/Math.max(area.width,area.height));canvas.width=Math.max(1,Math.round(area.width*scale));canvas.height=Math.max(1,Math.round(area.height*scale));const context=canvas.getContext('2d');if(!context)throw Error('canvas_unavailable');const angle=rotation*Math.PI/180,w=image.naturalWidth,h=image.naturalHeight,boundWidth=Math.abs(Math.cos(angle))*w+Math.abs(Math.sin(angle))*h,boundHeight=Math.abs(Math.sin(angle))*w+Math.abs(Math.cos(angle))*h;
 context.scale(canvas.width/area.width,canvas.height/area.height);context.translate(-area.x,-area.y);context.translate(boundWidth/2,boundHeight/2);context.rotate(angle);context.drawImage(image,-w/2,-h/2);
}
export async function cropFile(image:HTMLImageElement,area:CropArea,rotation:number,name:string){const canvas=document.createElement('canvas');drawCrop(image,area,rotation,canvas);const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('crop_failed')),'image/png'));return new File([blob],(name.replace(/\.[^.]+$/,'').slice(0,270)||'product')+'-cropped.png',{type:'image/png'});}
