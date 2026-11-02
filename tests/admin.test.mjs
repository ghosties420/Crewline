import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync,statSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {execFileSync} from 'node:child_process';import {DatabaseSync} from 'node:sqlite';
const dir=mkdtempSync(join(tmpdir(),'crewline-test-'));process.env.DB_PATH=join(dir,'crewline.sqlite');process.env.ADMIN_KEY='admin-key-for-local-tests-only-12345';process.env.NODE_ENV='test';
const {server,db}=await import('../server/server.mjs');await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const admin=(...args)=>execFileSync(process.execPath,[new URL('../server/admin.mjs',import.meta.url).pathname,...args],{encoding:'utf8',env:process.env,stdio:['pipe','pipe','pipe']});
test('offline admin invites and consistent online database backup',async()=>{try{
 const output=admin('invite'),invite=output.trim().split('\n').at(-1);assert.match(invite,/^[a-f0-9]{48}$/);
 let r=await fetch(base+'/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Owner',password:'my long private password',invite})});assert.equal(r.status,200);
 const backup=join(dir,'backup.sqlite');admin('backup',backup);assert.ok(statSync(backup).size>0);const snapshot=new DatabaseSync(backup);assert.equal(snapshot.prepare('SELECT name FROM users').get().name,'Owner');snapshot.close();
 admin('invite');assert.equal(db.prepare('SELECT COUNT(*) AS n FROM invites').get().n,1);admin('revoke-invites');assert.equal(db.prepare('SELECT COUNT(*) AS n FROM invites').get().n,0);
 assert.throws(()=>admin('backup',backup));
}finally{server.close();db.close();rmSync(dir,{recursive:true,force:true});}});
