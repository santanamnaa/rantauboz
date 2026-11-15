import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {uuid} from '../lib/validation.mjs';
import {friendPhotoSql} from '../lib/friends-photo.mjs';
const require=createRequire(import.meta.url),ts=require('typescript'),id='11111111-1111-4111-8111-111111111111';
const compiled=ts.transpileModule(readFileSync(new URL('../app/api/friends/[id]/photo/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function setup(){
 let user=null,active=true,photo=Buffer.from([255,216,255,224,1,255,217]);
 const exports={},queries=[];
 const auth={getSession:async()=>({data:user?{user:{id:user}}:null})};
 const pool={query:async(sql,args)=>{
  assert.equal(sql,friendPhotoSql);queries.push(args);
  const allowed=active&&args[0]===id&&['alice','bob'].includes(args[1]);
  return{rowCount:allowed&&photo?1:0,rows:allowed&&photo?[{image:photo}]:[]};
 }};
 vm.runInNewContext(compiled,{exports,require:name=>name.endsWith('/auth')?{auth}:name.endsWith('/db')?{pool}:name.endsWith('/validation.mjs')?{uuid}:{friendPhotoSql},Response,Request,Uint8Array});
 return{api:exports,queries,as:value=>user=value,disconnect:()=>active=false,remove:()=>photo=null,replace:value=>photo=value};
}
const request=(connection=id)=>[new Request('https://app.example/api/friends/'+connection+'/photo?user_id=alice'),{params:Promise.resolve({id:connection})}];
test('friend photos require a session and use connection id plus session identity',async()=>{const s=setup();assert.equal((await s.api.GET(...request())).status,401);assert.equal(s.queries.length,0);s.as('bob');assert.equal((await s.api.GET(...request('not-an-id'))).status,400);assert.equal(s.queries.length,0);const r=await s.api.GET(...request());assert.equal(r.status,200);assert.deepEqual(Array.from(s.queries[0]),[id,'bob']);assert.equal(r.headers.get('Content-Type'),'image/jpeg');assert.equal(r.headers.get('Cache-Control'),'private, no-store');assert.equal(r.headers.get('Vary'),'Cookie');assert.equal(r.headers.get('X-Content-Type-Options'),'nosniff');assert(!('POST' in s.api));assert(!('DELETE' in s.api))});
test('strangers, removed photos and disconnected friendships have no photo access',async()=>{const s=setup();s.as('stranger');assert.equal((await s.api.GET(...request())).status,404);s.as('bob');const first=Buffer.from(await(await s.api.GET(...request())).arrayBuffer());s.replace(Buffer.from([255,216,255,224,2,255,217]));assert.notDeepEqual(Buffer.from(await(await s.api.GET(...request())).arrayBuffer()),first);s.remove();assert.equal((await s.api.GET(...request())).status,404);s.replace(first);s.disconnect();assert.equal((await s.api.GET(...request())).status,404)});
