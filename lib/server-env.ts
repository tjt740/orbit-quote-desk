/** Node server bindings used only by the self-hosted Next.js build. */
import {DatabaseSync, type SQLInputValue} from 'node:sqlite';
import {mkdirSync, readFileSync, writeFileSync, renameSync, existsSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {createHash, randomUUID} from 'node:crypto';

const root=()=>resolve(process.env.ORBIT_DATA_DIR||'data');
let database:DatabaseSync|undefined;
function db(){
 if(database)return database;
 mkdirSync(root(),{recursive:true,mode:0o700});
 const value=new DatabaseSync(join(root(),'orbit.sqlite'));
 value.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS catalogs(id INTEGER PRIMARY KEY,body TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS fx_cache(id INTEGER PRIMARY KEY,body TEXT NOT NULL,fetched_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS admin_sessions(token_hash TEXT PRIMARY KEY,subject TEXT NOT NULL,credential_version TEXT NOT NULL,expires_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS login_attempts(key TEXT PRIMARY KEY,attempts INTEGER NOT NULL,expires_at INTEGER NOT NULL);`);
 database=value;return value;
}
class Statement{
 constructor(private sql:string,private values:SQLInputValue[]=[]){ }
 bind(...values:SQLInputValue[]){return new Statement(this.sql,values);}
 async first<T>(column?:string):Promise<T|null>{const row=db().prepare(this.sql).get(...this.values);return (column?row?.[column]:row) as T??null;}
 runSync(){const result=db().prepare(this.sql).run(...this.values);return {success:true,meta:{changes:Number(result.changes)}};}
 async run(){return this.runSync();}
 async all<T>(){return {success:true,results:db().prepare(this.sql).all(...this.values) as T[]};}
}
const DB={prepare:(sql:string)=>new Statement(sql),async batch(statements:Statement[]){const value=db();value.exec('BEGIN IMMEDIATE');try{const result=[];for(const stmt of statements)result.push(stmt.runSync());value.exec('COMMIT');return result;}catch(e){value.exec('ROLLBACK');throw e;}}};
function imagePath(key:string){if(!/^product-images\/[a-f0-9-]{36}\.(png|jpg|webp|gif)$/.test(key))throw Error('Invalid image key');const dir=join(root(),'product-images');mkdirSync(dir,{recursive:true,mode:0o700});return join(root(),key);}
const BUCKET={
 async put(key:string,bytes:Uint8Array,_options?:{httpMetadata?:{contentType?:string}}){void _options;const path=imagePath(key),temporary=path+'.'+randomUUID()+'.tmp';writeFileSync(temporary,bytes,{mode:0o600});renameSync(temporary,path);},
 async get(key:string){const path=imagePath(key);if(!existsSync(path))return null;const bytes=readFileSync(path),extension=key.split('.').pop()!;return {body:new Uint8Array(bytes),size:bytes.length,httpMetadata:{contentType:({png:'image/png',jpg:'image/jpeg',webp:'image/webp',gif:'image/gif'} as Record<string,string>)[extension]},httpEtag:'"'+createHash('sha256').update(bytes).digest('hex')+'"'};}
};
export const env={DB,BUCKET,get ORBIT_ADMIN_USERNAME(){return process.env.ORBIT_ADMIN_USERNAME;},get ORBIT_ADMIN_PASSWORD_HASH(){return process.env.ORBIT_ADMIN_PASSWORD_HASH;}};
