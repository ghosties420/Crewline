import {test} from 'node:test';import assert from 'node:assert/strict';
process.env.DB_PATH=':memory:';process.env.NODE_ENV='test';process.env.ADMIN_KEY='convoy-test-secret-at-least-32-chars';const {server,db}=await import('../server/server.mjs');await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
async function req(u,p,m='GET',b){const r=await fetch(base+p,{method:m,headers:{Authorization:'Bearer '+(u?.token||''),'Content-Type':'application/json','X-Admin-Key':process.env.ADMIN_KEY},body:b===undefined?undefined:JSON.stringify(b)});return {status:r.status,...await r.json()};}
async function user(name){const invite=(await req(null,'/invites','POST',{})).code;const u=await req(null,'/register','POST',{name,password:'strong test password',invite});return {...u,id:(await req(u,'/state')).me.id};}
const ok=async(u,p,m,b)=>{const r=await req(u,p,m,b);assert.equal(r.status,200,JSON.stringify(r));return r;};
test('convoy planning, public vs crew isolation, readiness, event privacy, opt-in radio access',async()=>{try{
 const a=await user('A'),b=await user('B'),e=await user('Outsider');const crew=(await ok(a,'/crews','POST',{name:'Local crew'})).id;await ok(a,'/active-crew','PUT',{crew});await ok(b,'/crews/'+crew+'/apply','POST',{});await ok(a,'/crews/'+crew+'/applications','POST',{user:b.id,accept:true});
 const plan={planVersion:2,title:'Coast run',meeting:'Car park',destination:'Beach',start_lat:-41.1,start_lon:174.8,lat:-41.2,lon:174.9,departure:Date.now()+86400000,stops:[{lat:-41.15,lon:174.85,name:'Coffee'}],visibility:'crew',crew};
 const privateId=(await ok(a,'/convoys','POST',plan)).id;assert.equal((await req(e,'/state')).convoys.length,0);assert.equal((await req(e,'/convoys/'+privateId)).status,404);assert.equal((await req(e,'/convoys/'+privateId+'/join','POST',{})).status,404);
 assert.equal((await req(e,'/convoys','POST',plan)).status,403);assert.equal((await req(a,'/convoys','POST',{...plan,start_lat:NaN})).status,400);assert.equal((await req(a,'/convoys','POST',{...plan,stops:Array(6).fill(plan.stops[0])})).status,400);
 await ok(b,'/convoys/'+privateId+'/join','POST',{});await ok(b,'/convoys/'+privateId+'/ready','POST',{ready:true});assert.equal((await req(a,'/convoys/'+privateId)).members.find(m=>m.id===b.id).ready,1);assert.equal((await req(b,'/convoys/'+privateId+'/start','POST',{})).status,403);
 const publicId=(await ok(a,'/convoys','POST',{...plan,visibility:'public',departure:Date.now()})).id;const publicView=await ok(e,'/convoys/'+publicId);assert.equal(publicView.members.length,0);assert.equal(publicView.memberCount,1);assert.equal(publicView.start_lat,-41.1);assert.equal(publicView.stops[0].name,'Coffee');assert.equal((await req(e,'/calls','POST',{convoy:publicId})).status,403);
 await ok(e,'/convoys/'+publicId+'/join','POST',{});assert.equal(db.prepare('SELECT count(*) AS n FROM locations').get().n,0);assert.equal(db.prepare('SELECT epoch FROM users WHERE id=?').get(e.id).epoch,'');
 const radio=(await ok(a,'/calls','POST',{convoy:publicId})).id;assert.equal((await ok(e,'/calls','POST',{convoy:publicId})).id,radio);await ok(e,'/calls/'+radio+'/join','POST',{});await ok(e,'/convoys/'+publicId+'/leave','POST',{});assert.equal((await req(e,'/calls/'+radio+'/join','POST',{})).status,404);assert.equal((await req(e,'/calls')).calls.length,0);
 // A plan change informs only current participants and invalidates readiness.
 await ok(e,'/convoys/'+publicId+'/join','POST',{});
 await ok(e,'/convoys/'+publicId+'/ready','POST',{ready:true});
 const edit={title:'Revised coast run',meeting:'New meeting label',destination:'Beach',notes:'Leave ten minutes later',departure:Date.now()+600000};
 assert.equal((await req(e,'/convoys/'+publicId,'PUT',edit)).status,403);
 assert.equal((await req(a,'/convoys/'+publicId,'PUT',{...edit,departure:0})).status,400);
 await ok(a,'/convoys/'+publicId,'PUT',edit);
 assert.equal((await ok(a,'/convoys/'+publicId)).members.find(m=>m.id===e.id).ready,0);
 const updates=(await ok(e,'/convoy-updates')).updates;assert.equal(updates.length,1);assert.match(updates[0].body,/Revised coast run/);
 assert.equal((await ok(b,'/convoy-updates')).updates.length,0);
 assert.equal((await ok(e,'/comms/poll')).convoyUpdateId,updates[0].id);
 await ok(b,'/convoy-updates','PUT',{through:updates[0].id});assert.equal((await ok(e,'/convoy-updates')).updates[0].seen,0);
 await ok(e,'/convoy-updates','PUT',{through:updates[0].id});assert.equal((await ok(e,'/comms/poll')).convoyUpdateId,0);
 assert.equal((await req(e,'/convoys/'+publicId+'/remove','POST',{user:a.id})).status,403);
 assert.equal((await req(a,'/convoys/'+publicId+'/remove','POST',{user:a.id})).status,400);
 await ok(a,'/convoys/'+publicId+'/remove','POST',{user:e.id});
 assert.equal((await req(e,'/convoys/'+publicId+'/join','POST',{})).status,403);
 assert.equal((await req(e,'/calls/'+radio+'/join','POST',{})).status,404);
 assert.equal((await ok(a,'/convoys/'+publicId)).excluded[0].id,e.id);
 assert.equal((await ok(e,'/convoys/'+publicId)).excluded.length,0);
 await ok(a,'/convoys/'+publicId+'/restore','POST',{user:e.id});await ok(e,'/convoys/'+publicId+'/join','POST',{});
 await ok(a,'/convoys/'+publicId+'/start','POST',{});assert.equal((await req(a,'/convoys/'+publicId)).phase,'driving');await ok(a,'/convoys/'+publicId+'/finish','POST',{});assert.equal((await req(e,'/convoys/'+publicId+'/join','POST',{})).status,409);assert.equal((await req(a,'/calls/'+radio+'/join','POST',{})).status,404);
 const event=(await ok(a,'/events','POST',{title:'Secret meet',place:'Meeting place',starts:Date.now()+86400000,visibility:'crew',crew})).id;assert.equal((await req(a,'/convoys','POST',{...plan,visibility:'public',source_event:event})).status,403);await ok(a,'/convoys','POST',{...plan,source_event:event});
 assert.equal((await req(null,'/convoys/'+publicId)).status,401);await ok(b,'/reports','POST',{kind:'convoy',target:publicId,reason:'Test report'});
}finally{server.close();}});
