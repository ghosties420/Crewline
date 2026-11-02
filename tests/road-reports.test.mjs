import {test} from 'node:test';import assert from 'node:assert/strict';
process.env.DB_PATH=':memory:';process.env.NODE_ENV='test';process.env.ADMIN_KEY='road-report-test-secret-at-least-32-chars';const {server,db}=await import('../server/server.mjs');await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
async function req(u,p,m='GET',b){const r=await fetch(base+p,{method:m,headers:{Authorization:'Bearer '+(u?.token||''),'Content-Type':'application/json','X-Admin-Key':process.env.ADMIN_KEY},body:b===undefined?undefined:JSON.stringify(b)});return {status:r.status,...await r.json()};}
const ok=async(u,p,m,b)=>{const r=await req(u,p,m,b);assert.equal(r.status,200,JSON.stringify(r));return r;};
async function user(name){const inv=await ok(null,'/invites','POST',{});const u=await ok(null,'/register','POST',{name,password:'strong test password',invite:inv.code});return {...u,id:(await ok(u,'/state')).me.id};}
test('convoy road reports enforce membership, expiry, validation, deletion and distinct clear votes',async()=>{try{
 const a=await user('Organiser'),b=await user('Reporter'),c=await user('Voter'),d=await user('Second voter'),out=await user('Outsider');
 const plan={title:'Test drive',visibility:'public',lat:-41,lon:174,departure:Date.now()};const id=(await ok(a,'/convoys','POST',plan)).id,path='/convoys/'+id+'/pings';
 for(const u of [b,c,d])await ok(u,'/convoys/'+id+'/join','POST',{});
 const point={lat:-41.1,lon:174.8};assert.equal((await req(null,path)).status,401);assert.equal((await req(out,path)).status,403);assert.equal((await req(out,path,'POST',{kind:'traffic',...point})).status,403);
 assert.equal((await req(b,path,'POST',{kind:'unknown',...point})).status,400);assert.equal((await req(b,path,'POST',{kind:'police',lat:91,lon:0})).status,400);
 const ping=await ok(b,path,'POST',{kind:'police',...point});assert.ok(ping.expires>Date.now()+14*60000);assert.equal((await ok(b,path,'POST',{kind:'police',...point})).id,ping.id);
 const row=(await ok(c,path)).pings[0];assert.equal(row.mine,0);assert.equal(row.kind,'police');assert.equal(row.user,undefined);assert.equal((await ok(a,'/state')).convoys[0].pings,undefined);assert.equal(db.prepare('SELECT count(*) AS n FROM locations').get().n,0);
 assert.equal((await ok(c,path+'/'+ping.id,'DELETE')).removed,false);assert.equal((await ok(c,path+'/'+ping.id,'DELETE')).votes,1);assert.equal((await ok(d,path+'/'+ping.id,'DELETE')).removed,true);assert.equal((await ok(b,path)).pings.length,0);
 const own=await ok(b,path,'POST',{kind:'camera',...point});assert.equal((await ok(b,path+'/'+own.id,'DELETE')).removed,true);
 const mod=await ok(b,path,'POST',{kind:'roadworks',...point});assert.equal((await ok(a,path+'/'+mod.id,'DELETE')).removed,true);
 const expiry=await ok(b,path,'POST',{kind:'checkpoint',...point});db.prepare('UPDATE road_reports SET expires=? WHERE id=?').run(Date.now()-1,expiry.id);assert.equal((await ok(a,path)).pings.length,0);
 assert.equal((await req(b,path,'POST',{kind:'traffic',...point})).status,429);
 const live=await ok(c,path,'POST',{kind:'traffic',...point});await ok(a,'/convoys/'+id+'/remove','POST',{user:c.id});assert.equal((await req(c,path)).status,403);assert.equal((await req(c,path+'/'+live.id,'DELETE')).status,403);
 const other=(await ok(a,'/convoys','POST',plan)).id;assert.equal((await req(a,'/convoys/'+other+'/pings/'+live.id,'DELETE')).status,404);
 await ok(a,'/convoys/'+id+'/finish','POST',{});assert.equal((await req(b,path)).status,409);
 const crew=(await ok(a,'/crews','POST',{name:'Private crew'})).id;const privateId=(await ok(a,'/convoys','POST',{...plan,visibility:'crew',crew})).id;assert.equal((await req(out,'/convoys/'+privateId+'/pings')).status,404);
}finally{server.close();}});
