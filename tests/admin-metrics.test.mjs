import {test} from 'node:test';
import assert from 'node:assert/strict';
process.env.ADMIN_KEY='metric-tests-secret-long-enough-123456';
process.env.DB_PATH=':memory:';
process.env.NODE_ENV='test';
const {server,db}=await import('../server/server.mjs');
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
const req=async(path,token='',method='GET',body)=>{
 const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,'X-Admin-Key':process.env.ADMIN_KEY},body:body?JSON.stringify(body):undefined});
 return {status:r.status,data:await r.json()};
};
test('private operational metrics require administrator privileges and reveal no location coordinates',async()=>{try{
 const invite=(await req('/invites','','POST',{})).data.code;
 const registration=await req('/register','','POST',{name:'Operator',password:'a suitably private passphrase',invite});
 assert.equal(registration.status,200);const token=registration.data.token;
 assert.equal((await req('/admin/metrics',token)).status,403);
 db.prepare("UPDATE users SET site_role='moderator' WHERE name='Operator'").run();
 assert.equal((await req('/admin/metrics',token)).status,403);
 db.prepare("UPDATE users SET site_role='admin' WHERE name='Operator'").run();
 const r=await req('/admin/metrics',token);assert.equal(r.status,200);
 for(const key of ['time','uptimeSeconds','memoryRssBytes','heapUsedBytes','activeLocations','activeConvoys','voiceConnections','activeCalls','joinedCallParticipants'])assert.equal(typeof r.data[key],'number');
 assert.equal(r.data.voiceConnections,0);
 assert.ok(!('lat' in r.data));assert.ok(!('lon' in r.data));
}finally{server.close();db.close();}});
