import {test} from 'node:test';import assert from 'node:assert/strict';
process.env.DB_PATH=':memory:';process.env.NODE_ENV='test';process.env.ADMIN_KEY='test-auth-limit-secret-at-least-32chars';
const {server}=await import('../server/server.mjs');await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
async function post(path,body){return fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json','X-Admin-Key':process.env.ADMIN_KEY},body:JSON.stringify(body)});}
test('repeated password attempts are isolated by account, including case variants',async()=>{try{
 const invite=await(await post('/invites',{})).json();assert.equal((await post('/register',{name:'Other member',password:'long correct test password',invite:invite.code})).status,200);
 for(let i=0;i<10;i++)assert.equal((await post('/login',{name:i%2?'UNKNOWN':'unknown',password:'long wrong test password'})).status,401);
 assert.equal((await post('/login',{name:'unknown',password:'long wrong test password'})).status,429);
 assert.equal((await post('/login',{name:'Other member',password:'long correct test password'})).status,200);
}finally{server.close();}});
