#!/usr/bin/env node
// Run on the server with the same env file and Node 24 as the service.
import {DatabaseSync} from 'node:sqlite';import {randomBytes,createHash,scryptSync} from 'node:crypto';
import {createInterface} from 'node:readline/promises';
const db=new DatabaseSync(process.env.DB_PATH||'crewline.sqlite');db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
const [action,name]=process.argv.slice(2);
if(action==='promote'&&name){const result=db.prepare("UPDATE users SET site_role='admin' WHERE name=?").run(name);if(!result.changes)throw Error('Account name not found');console.log('Administrator enabled for '+name);}
else if(action==='invite'){const code=randomBytes(24).toString('hex');db.prepare('INSERT INTO invites VALUES(?,?)').run(createHash('sha256').update(code).digest('hex'),Date.now()+86400000);console.log('Single-use invitation (expires in 24 hours):\n'+code);}
else if(action==='backup'&&name){db.prepare('VACUUM INTO ?').run(name);console.log('Consistent SQLite backup written to '+name);}
else if(action==='revoke-invites'){db.prepare('DELETE FROM invites').run();console.log('All pending invitations revoked.');}
else if(action==='reset-password'&&name){
 console.log('Enter a new password via stdin. Use 12+ characters; input is visible.');const rl=createInterface({input:process.stdin,output:process.stdout});const password=await rl.question('New password: ');rl.close();if(password.length<12||password.length>200)throw Error('Password must be 12–200 characters');const salt=randomBytes(24).toString('hex');db.exec('BEGIN IMMEDIATE');try{const row=db.prepare('SELECT id FROM users WHERE name=?').get(name);if(!row)throw Error('User not found');db.prepare('UPDATE users SET salt=?,hash=?,epoch=? WHERE id=?').run(salt,scryptSync(password,salt,64).toString('hex'),'',row.id);db.prepare('DELETE FROM sessions WHERE user=?').run(row.id);db.prepare('DELETE FROM locations WHERE user=?').run(row.id);db.exec('COMMIT');console.log('Password reset; sessions revoked.');}catch(e){db.exec('ROLLBACK');throw e;}
}else {console.error('Usage: node admin.mjs promote NAME | invite | revoke-invites | reset-password NAME | backup PATH');process.exitCode=1;}
db.close();
