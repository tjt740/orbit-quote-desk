export const MAX_IMAGE_BYTES=5*1024*1024;
export const IMAGE_KEY=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp|gif)$/;
export function imagePath(key?:string){return key&&IMAGE_KEY.test(key)?'/api/images/'+key:'';}
export function imageFormat(bytes:Uint8Array):{type:string;extension:string}|null{
 const text=(start:number,end:number)=>String.fromCharCode(...bytes.slice(start,end));
 if(bytes.length>=8&&bytes.slice(0,8).every((v,i)=>v===[137,80,78,71,13,10,26,10][i]))return {type:'image/png',extension:'png'};
 if(bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return {type:'image/jpeg',extension:'jpg'};
 if(bytes.length>=12&&text(0,4)==='RIFF'&&text(8,12)==='WEBP')return {type:'image/webp',extension:'webp'};
 if(bytes.length>=6&&['GIF87a','GIF89a'].includes(text(0,6)))return {type:'image/gif',extension:'gif'};
 return null;
}
