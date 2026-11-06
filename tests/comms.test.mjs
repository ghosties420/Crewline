import {test} from 'node:test';import assert from 'node:assert/strict';import http from 'node:http';import {randomBytes} from 'node:crypto';
process.env.DB_PATH=':memory:';process.env.ADMIN_KEY='communication-tests-secret-long-enough';process.env.NODE_ENV='test';
const {server,db}=await import('../server/server.mjs');await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port,base='http://127.0.0.1:'+port;const connections=[];
async function request(token,path,method='GET',body){const r=await fetch(base+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','X-Admin-Key':process.env.ADMIN_KEY},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};}
async function user(name){const invite=(await request('','/invites','POST',{})).data.code;const token=(await request('','/register','POST',{name,password:'private password long',invite})).data.token;const uid=db.prepare('SELECT id FROM users WHERE name=?').get(name).id;db.prepare("INSERT OR IGNORE INTO crews VALUES('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','Test crew','','',0)").run();db.prepare("INSERT INTO crew_members VALUES('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',?,'member')").run(uid);db.prepare("UPDATE users SET active_crew='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' WHERE id=?").run(uid);return {token,id:(await request(token,'/state')).data.me.id};}
function voice(user,cid){return new Promise((resolve,reject)=>{const r=http.request({host:'127.0.0.1',port,path:'/voice?call='+cid,headers:{Authorization:'Bearer '+user.token,Connection:'Upgrade',Upgrade:'websocket','Sec-WebSocket-Version':'13','Sec-WebSocket-Key':randomBytes(16).toString('base64')}});r.on('response',s=>{s.resume();reject(Object.assign(Error('Rejected'),{status:s.statusCode}));});r.on('error',reject);r.on('upgrade',(res,socket,head)=>{connections.push(socket);let buffer=head,packets=[],waiters=[];function parse(chunk){buffer=Buffer.concat([buffer,chunk]);while(buffer.length>=2){let n=buffer[1]&127,offset=2;if(n===126){if(buffer.length<4)return;n=buffer.readUInt16BE(2);offset=4;}if(buffer.length<offset+n)return;const op=buffer[0]&15,data=buffer.subarray(offset,offset+n);buffer=buffer.subarray(offset+n);if(op===2){if(waiters.length)waiters.shift()(data);else packets.push(data);}}}socket.on('data',parse);socket.on('error',()=>{});resolve({socket,send(data){const mask=randomBytes(4),h=Buffer.alloc(8);h[0]=130;h[1]=254;h.writeUInt16BE(data.length,2);mask.copy(h,4);const payload=Buffer.from(data);for(let i=0;i<payload.length;i++)payload[i]^=mask[i%4];socket.write(Buffer.concat([h,payload]));},read(){if(packets.length)return Promise.resolve(packets.shift());return new Promise((yes,no)=>{const t=setTimeout(()=>no(Error('No voice packet')),1500);waiters.push(p=>{clearTimeout(t);yes(p);});});}});});r.end();});}
test('posts, DM isolation, photo ownership/privacy and authenticated voice relay',async()=>{try{
 const a=await user('Alice'),b=await user('Bob'),e=await user('Eve');const call=(u,p,m,body)=>request(u.token,p,m,body);
 const post=(await call(a,'/board','POST',{title:'Meet',body:'Sunday drive'})).data.id;await call(b,'/board','POST',{parent:post,body:'Count me in'});assert.equal((await call(e,'/board/'+post)).data.replies.length,1);assert.equal((await call(b,'/board/'+post,'DELETE')).status,403);
 const mid=(await call(a,'/messages','POST',{peer:b.id,body:'Private message'})).data.id;assert.equal((await call(b,'/messages?peer='+a.id)).data.messages[0].body,'Private message');assert.equal((await call(e,'/messages?peer='+a.id)).data.messages.length,0);assert.equal((await call(e,'/messages/'+mid,'DELETE')).status,403);assert.equal((await call(e,'/comms/poll')).data.messageId,0);
 await call(a,'/messages','POST',{peer:'crew',body:'Everyone welcome'});assert.equal((await call(e,'/messages?peer=crew')).data.messages.length,1);
 const vehicle=(await call(a,'/vehicles','POST',{name:'Caldina'})).data.id;const jpeg=Buffer.from([255,216,255,224,0,16,255,217]).toString('base64');
 assert.equal((await call(b,'/photos','POST',{vehicle,data:jpeg})).status,403);assert.equal((await call(a,'/photos','POST',{data:Buffer.from('<svg/>').toString('base64')})).status,400);
 const avatar=(await call(a,'/photos','POST',{data:jpeg})).data.id,carPhoto=(await call(a,'/photos','POST',{vehicle,data:jpeg})).data.id;assert.ok((await call(b,'/photos/'+avatar)).data.data.startsWith('data:image/jpeg'));
 await call(a,'/profile','PUT',{name:'Alice',bio:'',garage_visible:false,profile_visible:false});assert.equal((await call(b,'/photos/'+avatar)).status,403);assert.equal((await call(b,'/photos/'+carPhoto)).status,403);assert.equal((await call(a,'/photos/'+avatar)).status,200);
 let cid=(await call(a,'/calls','POST',{peer:b.id})).data.id;assert.ok(cid);assert.equal((await call(e,'/calls')).data.calls.length,0);assert.equal((await call(e,'/calls/'+cid+'/join','POST',{})).status,404);
 await assert.rejects(voice(b,cid),err=>err.status===403);await call(b,'/calls/'+cid+'/join','POST',{});
 const av=await voice(a,cid),bv=await voice(b,cid);await assert.rejects(voice(e,cid),err=>err.status===404);const audio=Buffer.alloc(160,23);av.send(audio);let received=await bv.read();assert.equal(received.subarray(0,48).toString(),a.id);assert.deepEqual(received.subarray(48),audio);
 bv.send(Buffer.alloc(160,42));assert.equal((await av.read())[48],42);await call(b,'/calls/'+cid+'/leave','POST',{});assert.equal((await call(a,'/calls')).data.calls.length,0);
 cid=(await call(a,'/calls','POST',{peer:'crew'})).data.id;await call(b,'/calls/'+cid+'/join','POST',{});await call(e,'/calls/'+cid+'/join','POST',{});const va=await voice(a,cid),vb=await voice(b,cid),ve=await voice(e,cid);va.send(audio);assert.deepEqual((await vb.read()).subarray(48),audio);assert.deepEqual((await ve.read()).subarray(48),audio);assert.equal((await call(b,'/calls/'+cid+'/end','POST',{})).status,403);await call(a,'/calls/'+cid+'/end','POST',{});assert.equal((await call(e,'/calls')).data.calls.length,0);
 // Twenty participants can join the same convoy radio, with one speaker at a time.
 const group=[a,b,e];for(let i=4;i<=20;i++)group.push(await user('Member'+i));
 const convoy=(await call(a,'/convoys','POST',{title:'Radio scale test',destination:'Harbour',lat:-41.1,lon:174.8})).data.id;
 cid=(await call(a,'/calls','POST',{convoy})).data.id;
 for(const participant of group.slice(1)){
  assert.equal((await call(participant,'/convoys/'+convoy+'/join','POST',{})).status,200);
  assert.equal((await call(participant,'/calls','POST',{convoy})).data.id,cid);
  assert.equal((await call(participant,'/calls/'+cid+'/join','POST',{})).status,200);
 }
 const allVoice=await Promise.all(group.map(participant=>voice(participant,cid)));
 const receivedByAll=allVoice.slice(1).map(v=>v.read());allVoice[0].send(audio);
 for(const packet of await Promise.all(receivedByAll))assert.deepEqual(packet.subarray(48),audio);
 allVoice[1].send(Buffer.alloc(160,42));
 await assert.rejects(allVoice[2].read(),/No voice packet/); // Alice still holds the floor.
 allVoice[1].send(Buffer.alloc(160,42));
 assert.equal((await allVoice[3].read()).subarray(48)[0],42); // Lease expires.
 await call(a,'/calls/'+cid+'/end','POST',{});
 await call(a,'/board/'+post,'DELETE');assert.equal((await call(b,'/board')).data.posts.length,0);
}finally{for(const s of connections)s.destroy();await new Promise(r=>setTimeout(r,30));server.close();}});
