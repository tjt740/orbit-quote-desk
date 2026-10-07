import assert from 'node:assert/strict';
const origin=process.env.ORBIT_TEST_URL||'http://127.0.0.1:3210';
let cookies='';
async function call(path,method='GET',body,headers={}){const r=await fetch(origin+path,{method,headers:{Origin:origin,...(cookies?{Cookie:cookies}:{}),...headers},body});const cookie=r.headers.get('set-cookie');if(cookie)cookies=cookie.split(';')[0];return r;}
assert.equal((await call('/')).status,200);
assert.equal((await call('/api/auth')).status,200);
const catalog=await (await call('/api/catalog')).json();assert.equal(catalog.catalog.products.length,34);
assert.equal((await call('/api/catalog','PUT',JSON.stringify(catalog),{'Content-Type':'application/json'})).status,401);
assert.equal((await call('/api/images','POST',new Uint8Array([1,2]),{'Content-Type':'image/png'})).status,401);
assert(process.env.ORBIT_TEST_PASSWORD,'Test password is required');
const login=await call('/api/auth','POST',JSON.stringify({username:process.env.ORBIT_ADMIN_USERNAME,password:process.env.ORBIT_TEST_PASSWORD}),{'Content-Type':'application/json'});assert.equal(login.status,200);assert.equal((await login.json()).role,'admin');
assert.equal((await (await call('/api/auth')).json()).role,'admin');
const saved=await call('/api/catalog','PUT',JSON.stringify({catalog:catalog.catalog,revision:catalog.revision}),{'Content-Type':'application/json'});assert.equal(saved.status,200);assert.equal((await saved.json()).revision,catalog.revision+1);
assert.equal((await call('/api/catalog','PUT',JSON.stringify({catalog:catalog.catalog,revision:catalog.revision}),{'Content-Type':'application/json'})).status,409);
assert.equal((await call('/api/catalog','PUT','{}',{'Content-Type':'application/json',Origin:'https://other.example'})).status,403);
// This script runs only against an isolated test database, never production.
let revision=catalog.revision+1;
async function saveAndRead(value){
  const response=await call('/api/catalog','PUT',JSON.stringify({catalog:value,revision}),{'Content-Type':'application/json'});
  assert.equal(response.status,200);revision=(await response.json()).revision;
  const stored=await (await call('/api/catalog')).json();
  assert.equal(stored.revision,revision);assert.deepEqual(stored.catalog,value);
  return stored.catalog;
}
let editable=structuredClone(catalog.catalog);
const plan={id:'crud-plan',package:'测试套餐',packageEn:'Test plan',type:['CDK'],duration:'1 个月',warranty:'质保',price:12,coverage:'全程质保',aftercare:['补 CDK'],test:'',extra:{'crud-field':'待处理'}};
editable.columns.push({id:'crud-field',name:'测试字段',en:'Test field',type:'select',options:['待处理','已确认']});
editable.products.push({id:'crud-product',name:'测试产品',en:'Test product',category:'productivity',types:['CDK'],duration:'1 个月',rows:[plan]});
editable=await saveAndRead(editable);
assert.equal(editable.products.filter(p=>p.name.includes('测试产品')).length,1);
const testProduct=editable.products.find(p=>p.id==='crud-product');
testProduct.name='已修改产品';testProduct.rows[0].package='已修改套餐';testProduct.rows[0].price=35;testProduct.rows[0].extra['crud-field']='已确认';
editable.columns.find(c=>c.id==='crud-field').name='已修改字段';
editable=await saveAndRead(editable);
editable.products.find(p=>p.id==='crud-product').rows=[];
editable=await saveAndRead(editable);assert.equal(editable.products.find(p=>p.id==='crud-product').rows.length,0);
editable.products=editable.products.filter(p=>p.id!=='crud-product');
editable.columns=editable.columns.filter(c=>c.id!=='crud-field');
editable=await saveAndRead(editable);assert.deepEqual(editable,catalog.catalog);
const bytes=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jJ/oAAAAASUVORK5CYII=','base64'));
const image=await call('/api/images','POST',bytes,{'Content-Type':'image/png'});assert.equal(image.status,201);const {key}=await image.json();const read=await call('/api/images/'+key);assert.equal(read.status,200);assert.equal(read.headers.get('content-type'),'image/png');assert.deepEqual(new Uint8Array(await read.arrayBuffer()),bytes);
assert.equal((await call('/api/images','POST',new Uint8Array(5*1024*1024+1),{'Content-Type':'image/png'})).status,413);
assert.equal((await call('/api/auth','DELETE')).status,200);assert.equal((await (await call('/api/auth')).json()).role,'viewer');
console.log('PASS: page, seeded catalog, admin authentication, viewer write rejection, product/plan/field CRUD with persisted reads, revision conflict, origin rejection, image round trip/size limit, logout.');
