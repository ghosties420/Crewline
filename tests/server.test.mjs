import {test} from 'node:test';import assert from 'node:assert/strict';
process.env.ADMIN_KEY='test-admin-key-32-characters-minimum';process.env.DB_PATH=':memory:';process.env.NODE_ENV='test';
const {server,db}=await import('../server/server.mjs');await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
async function req(path,method='GET',body,token='',admin=false){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,...admin?{'X-Admin-Key':process.env.ADMIN_KEY}:{}},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
async function join(name){const invite=(await req('/invites','POST',{},'',true)).data.code;const r=await req('/register','POST',{name,password:'correct horse battery staple',invite});assert.equal(r.status,200);const uid=db.prepare('SELECT id FROM users WHERE name=?').get(name).id;db.prepare("INSERT OR IGNORE INTO crews VALUES('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','Test crew','','',0)").run();db.prepare("INSERT INTO crew_members VALUES('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',?,'member')").run(uid);db.prepare("UPDATE users SET active_crew='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' WHERE id=?").run(uid);return {token:r.data.token,invite};}
test('complete private-crew workflow and privacy boundaries',async()=>{try{
 assert.equal((await req('/state')).status,401);assert.equal((await req('/invites','POST',{})).status,403);
 const a=await join('Alice'),b=await join('Bob');
 assert.equal((await req('/register','POST',{name:'Eve',password:'some good password',invite:a.invite})).status,403);
 assert.equal((await req('/login','POST',{name:'alice',password:'correct horse battery staple'})).status,200);
 assert.equal((await req('/login','POST',{name:'Alice',password:'wrong password'})).status,401);
 const call=(p,m,body)=>req(p,m,body,a.token),bob=(p,m,body)=>req(p,m,body,b.token);
 let state=(await call('/state')).data;assert.equal(state.crew.length,2);assert.equal(state.crew[0].lat,null);
 assert.equal((await call('/location','PUT',{lat:-41,lon:174,epoch:'stale'})).status,409);
 const epoch=(await call('/sharing','PUT',{})).data.epoch;
 assert.equal((await call('/location','PUT',{lat:999,lon:174,epoch})).status,400);
 await call('/location','PUT',{lat:-41,lon:174,epoch});assert.equal((await bob('/state')).data.crew.find(u=>u.name==='Alice').lat,-41);
 await call('/sharing','DELETE');assert.equal((await call('/location','PUT',{lat:-41,lon:174,epoch})).status,409);assert.equal((await bob('/state')).data.crew.find(u=>u.name==='Alice').lat,null);
 const epoch2=(await call('/sharing','PUT',{})).data.epoch;await call('/location','PUT',{lat:-41,lon:174,epoch:epoch2});db.prepare('UPDATE locations SET updated=?').run(Date.now()-61000);assert.equal((await bob('/state')).data.crew.find(u=>u.name==='Alice').lat,null);
 const vid=(await call('/vehicles','POST',{name:'Caldina',year:'1998',mods:'Exhaust',notes:'Build'})).data.id;
 assert.equal((await bob('/vehicles/'+vid,'DELETE')).status,403);
 await call('/vehicles/'+vid,'PUT',{name:'ST215',mods:'Stock',year:'1998',notes:''});assert.equal((await bob('/state')).data.vehicles[0].name,'ST215');
 await call('/profile','PUT',{name:'Alice',bio:'My private garage',garage_visible:false,profile_visible:false});assert.equal((await bob('/state')).data.crew.find(u=>u.name==='Alice').bio,'');assert.equal((await bob('/state')).data.vehicles.length,0);assert.equal((await call('/state')).data.vehicles.length,1);
 assert.equal((await call('/profile','PUT',{name:'Bob',bio:'',garage_visible:true})).status,409);
 const cid=(await call('/convoys','POST',{title:'Coast run',destination:'Beach',lat:-41,lon:174})).data.id;assert.ok(cid);
 await bob('/convoys/'+cid+'/join','POST',{});await bob('/convoys/'+cid+'/join','POST',{});assert.equal((await call('/state')).data.convoys[0].members.length,2);
 assert.equal((await bob('/convoys/'+cid,'DELETE')).status,403);await bob('/convoys/'+cid+'/leave','POST',{});assert.equal((await call('/state')).data.convoys[0].members.length,1);
 const second=(await req('/login','POST',{name:'Alice',password:'correct horse battery staple'})).data.token;
 assert.equal((await call('/password','PUT',{oldPassword:'incorrect password',password:'changed password long'})).status,403);
 await call('/password','PUT',{oldPassword:'correct horse battery staple',password:'changed password long'});assert.equal((await req('/state','GET',undefined,second)).status,401);
 assert.equal((await call('/account','DELETE',{password:'incorrect password'})).status,403);
 await call('/account','DELETE',{password:'changed password long'});assert.equal((await call('/state')).status,401);state=(await bob('/state')).data;assert.equal(state.crew.length,1);assert.equal(state.convoys.length,0);assert.equal(state.vehicles.length,0);
 await bob('/logout','POST',{});assert.equal((await bob('/state')).status,401);
}finally{server.close();}});
