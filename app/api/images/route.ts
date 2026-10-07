import {writeAccess} from '@/lib/admin-auth';
import { images } from '@/lib/storage';
import {MAX_IMAGE_BYTES,imageFormat} from '@/lib/product-images';
export const dynamic='force-dynamic';
export async function POST(req:Request){
 const denied=await writeAccess(req);if(denied)return denied;

 const length=Number(req.headers.get('content-length'));if(length>MAX_IMAGE_BYTES)return Response.json({error:'image_too_large'},{status:413});
 if(!req.body)return Response.json({error:'invalid_image'},{status:415});
 try{const reader=req.body.getReader(),chunks:Uint8Array[]=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_IMAGE_BYTES){await reader.cancel();return Response.json({error:'image_too_large'},{status:413});}chunks.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}const format=imageFormat(bytes);if(!format||req.headers.get('content-type')?.split(';')[0]!==format.type)return Response.json({error:'invalid_image'},{status:415});const key=crypto.randomUUID()+'.'+format.extension;await images().put('product-images/'+key,bytes,{httpMetadata:{contentType:format.type}});return Response.json({key,size,type:format.type},{status:201,headers:{'Cache-Control':'no-store'}});
 }catch(error){console.error('Product image upload',error);return Response.json({error:'image_unavailable'},{status:503});}
}
