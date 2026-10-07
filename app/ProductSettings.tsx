'use client';
import {useEffect,useRef,useState} from 'react';
import {Alert,Button,Input,Modal,Upload} from 'antd';
import {ImagePlus,UploadCloud,Trash2,Crop} from 'lucide-react';
import ImageCropper from './ImageCropper';
import type {Product} from '@/lib/catalog';
import {imagePath,MAX_IMAGE_BYTES} from '@/lib/product-images';
export type ProductInfo={name:string;en:string;imageKey?:string;imageName?:string};
export default function ProductSettings({product,lang,onClose,onSave}:{product:Product;lang:string;onClose:()=>void;onSave:(info:ProductInfo)=>void}){
 const [candidate,setCandidate]=useState<{file:File;source:string;existing:boolean}|null>(null);
 const t=(zh:string,en:string)=>lang==='zh'?zh:en;
 const [name,setName]=useState(product.name),[en,setEn]=useState(product.en),[imageKey,setImageKey]=useState(product.imageKey),[imageName,setImageName]=useState(product.imageName),[uploading,setUploading]=useState(false),[error,setError]=useState(''),[invalidName,setInvalidName]=useState(false);const request=useRef<AbortController|null>(null),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;request.current?.abort();};},[]);
 useEffect(()=>()=>{if(candidate)URL.revokeObjectURL(candidate.source);},[candidate]);
 async function upload(file:File){
  setError('');if(file.size>MAX_IMAGE_BYTES){setError(t('图片超过 5 MB，请选择更小的图片。','This image exceeds 5 MB. Choose a smaller image.'));return false;}if(!file.size||!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)){setError(t('请选择 PNG、JPG、WebP 或 GIF 图片。','Choose a PNG, JPG, WebP or GIF image.'));return false;}
  try{const decoded=await createImageBitmap(file);decoded.close();setCandidate({file,source:URL.createObjectURL(file),existing:false});}catch{setError(t('图片无法读取，请选择有效的图片。','This image could not be read. Choose a valid image.'));}return false;
 }
 async function applyImage(file:File){if(file.size>MAX_IMAGE_BYTES)throw Error('large');setUploading(true);const controller=new AbortController();request.current=controller;try{const res=await fetch('/api/images',{method:'POST',headers:{'Content-Type':file.type},body:file,signal:controller.signal});if(!res.ok)throw Error(res.status===413?'large':'upload');const data=await res.json() as {key:string};if(alive.current){setImageKey(data.key);setImageName(file.name.slice(0,300));setCandidate(null);setError('');}}finally{if(alive.current)setUploading(false);request.current=null;}}
 async function cropExisting(){setError('');setUploading(true);const controller=new AbortController();request.current=controller;try{const response=await fetch(imagePath(imageKey),{signal:controller.signal});if(!response.ok)throw Error();const blob=await response.blob();const file=new File([blob],imageName||'product.png',{type:blob.type});if(file.size>MAX_IMAGE_BYTES)throw Error();const decoded=await createImageBitmap(file);decoded.close();if(alive.current)setCandidate({file,source:URL.createObjectURL(file),existing:true});}catch{if(alive.current&&!controller.signal.aborted)setError(t('图片读取失败，请重试或重新上传。','Unable to load this image. Retry or upload it again.'));}finally{if(alive.current)setUploading(false);request.current=null;}}

 function save(){if(!name.trim()){setInvalidName(true);return;}onSave({name:name.trim(),en:en.trim()||name.trim(),imageKey,imageName});}
 const url=imagePath(imageKey);
 return <><Modal open title={t('产品设置','Product settings')} onCancel={onClose} width={520} mask={{closable:!uploading&&!candidate}} keyboard={!uploading&&!candidate} closable={!candidate} destroyOnHidden footer={<><Button disabled={!!candidate} onClick={onClose}>{t('取消','Cancel')}</Button><Button type="primary" disabled={uploading||!!candidate} onClick={save}>{t('保存产品信息','Save product info')}</Button></>}>
 <form className="product-settings-form" onSubmit={e=>{e.preventDefault();if(!uploading&&!candidate)save();}}>
 <label htmlFor="product-name-zh">{t('产品名称','Product name')} <span className="required-mark">*</span></label><Input id="product-name-zh" value={name} maxLength={300} status={invalidName?'error':undefined} onChange={e=>{setName(e.target.value);setInvalidName(false);}} autoFocus placeholder={t('例如：Notion','e.g. Notion')}/>{invalidName&&<p className="product-form-error" role="alert">{t('请填写产品名称。','Enter a product name.')}</p>}
 <label htmlFor="product-name-en">{t('英文名称（可选）','English name (optional)')}</label><Input id="product-name-en" value={en} maxLength={300} onChange={e=>setEn(e.target.value)}/>
 <label>{t('产品图片','Product image')}</label><div className="product-image-setting"><div className="product-image-preview">{url?<img src={url} alt={name||t('产品图片','Product image')}/>:<ImagePlus size={30}/>}</div><div className="product-upload-actions"><Upload accept="image/png,image/jpeg,image/webp,image/gif" beforeUpload={upload} showUploadList={false} maxCount={1} disabled={uploading||!!candidate}><Button loading={uploading} icon={!uploading&&<UploadCloud size={16}/>} disabled={uploading||!!candidate}>{uploading?t('正在处理…','Processing…'):url?t('更换图片','Replace image'):t('上传图片','Upload image')}</Button></Upload>{url&&<Button disabled={uploading||!!candidate} icon={<Crop size={15}/>} onClick={()=>void cropExisting()}>{t('重新裁剪','Crop image')}</Button>}{url&&<Button type="text" danger size="small" icon={<Trash2 size={14}/>} disabled={uploading||!!candidate} onClick={()=>{setImageKey(undefined);setImageName(undefined);setError('');}}>{t('移除图片','Remove image')}</Button>}<p>{t('PNG / JPG / WebP / GIF，单张不超过 5 MB。','PNG / JPG / WebP / GIF, up to 5 MB per image.')}</p>{imageName&&<span className="product-image-filename" title={imageName}>{imageName}</span>}</div></div>
 {error&&<Alert type="error" showIcon title={error} role="alert"/>}<p className="product-save-hint">{t('点击“保存产品信息”后，名称和图片会自动保存到表格。','Click Save product info to save the name and image to the table.')}</p>
 </form></Modal>{candidate&&<ImageCropper key={candidate.source} source={candidate.source} file={candidate.file} lang={lang} onClose={()=>setCandidate(null)} onApply={applyImage} onOriginal={async()=>{if(candidate.existing)setCandidate(null);else await applyImage(candidate.file);}}/>}</>;
}
