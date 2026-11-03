// Opt-in crew results only. No route, coordinates, or automatic uploads.
import {randomBytes} from 'node:crypto';
export function createPerformance(db,{bad,text,limit,community,safety}){
 const modes=new Set(['0-60','0-100','100-200','quarter','half','eighth']);
 db.exec(`CREATE TABLE IF NOT EXISTS performance_results(id TEXT PRIMARY KEY,crew TEXT NOT NULL REFERENCES crews(id) ON DELETE CASCADE,user TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,client_id TEXT NOT NULL,mode TEXT NOT NULL,elapsed_ms INTEGER NOT NULL,finish_kph REAL NOT NULL,vehicle TEXT NOT NULL,accuracy REAL NOT NULL,speed_accuracy REAL NOT NULL,max_gap INTEGER NOT NULL,samples INTEGER NOT NULL,created INTEGER NOT NULL,removed INTEGER NOT NULL DEFAULT 0,UNIQUE(crew,user,client_id));
 CREATE INDEX IF NOT EXISTS performance_crew ON performance_results(crew,mode,elapsed_ms);`);
 return {handle(path,method,b,user,url){
  if(path==='/performance-mine'&&method==='GET')return {results:db.prepare('SELECT r.id,r.mode,r.elapsed_ms AS elapsedMs,r.finish_kph AS finishKph,r.vehicle,c.name AS crewName FROM performance_results r JOIN crews c ON c.id=r.crew WHERE r.user=? AND r.removed=0 ORDER BY r.created DESC LIMIT 1000').all(user)};
  if(path==='/performance'&&method==='GET'){
   const crew=url.searchParams.get('crew'),mode=url.searchParams.get('mode');if(!community.member(crew,user))bad(403,'Join this crew to view its leaderboard');if(!modes.has(mode))bad(400,'Choose a timing category');
   const rows=db.prepare(`SELECT r.id,r.user,r.mode,r.elapsed_ms AS elapsedMs,r.finish_kph AS finishKph,r.vehicle,r.accuracy AS accuracyM,r.max_gap AS maxGapMs,r.created,u.name FROM performance_results r JOIN users u ON u.id=r.user JOIN crew_members m ON m.crew=r.crew AND m.user=r.user WHERE r.crew=? AND r.mode=? AND r.removed=0 AND u.banned=0 ORDER BY r.elapsed_ms,r.created`).all(crew,mode);
   const seen=new Set();return {canModerate:community.manage(crew,user)||['admin','moderator'].includes(db.prepare('SELECT site_role FROM users WHERE id=?').get(user)?.site_role),results:rows.filter(r=>{if(safety.blocked(user,r.user)||seen.has(r.user))return false;seen.add(r.user);return true;}).slice(0,100).map(r=>({...r,mine:r.user===user,quality:'Approximate phone GPS · unverified'}))};
  }
  if(path==='/performance'&&method==='POST'){
   if(!community.member(b.crew,user))bad(403,'Join this crew before sharing');if(b.consent!==true)bad(400,'Confirm sharing this result with your crew');limit('performance:'+user,10);
   if(!modes.has(b.mode)||b.method!=='phone-gps-v1'||typeof b.clientId!=='string'||! /^[a-f0-9-]{16,64}$/.test(b.clientId))bad(400,'Invalid run');
   for(const [key,min,max]of [['elapsedMs',1000,120000],['finishKph',1,430],['accuracyM',0,15],['speedAccuracyMps',0,1.5],['maxGapMs',1,1500],['samples',4,2000]])if(!Number.isFinite(b[key])||b[key]<min||b[key]>max)bad(400,'Invalid GPS result');
   if(!Number.isInteger(b.elapsedMs)||!Number.isInteger(b.samples))bad(400,'Invalid run measurements');
   const expected={'0-60':60,'0-100':100,'100-200':200}[b.mode];if(expected&&Math.abs(b.finishKph-expected)>0.1)bad(400,'Finish speed does not match category');
   const prior=db.prepare('SELECT id,removed FROM performance_results WHERE crew=? AND user=? AND client_id=?').get(b.crew,user,b.clientId);if(prior){if(prior.removed)bad(409,'This entry was removed');return {id:prior.id};}
   if(db.prepare('SELECT count(*) AS n FROM performance_results WHERE user=?').get(user).n>=1000)bad(409,'Result limit reached');
   const id=randomBytes(24).toString('hex');db.prepare('INSERT INTO performance_results VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,0)').run(id,b.crew,user,b.clientId,b.mode,b.elapsedMs,b.finishKph,text(b.vehicle,120),b.accuracyM,b.speedAccuracyMps,b.maxGapMs,b.samples,Date.now());return {id};
  }
  const m=path.match(/^\/performance\/([a-f0-9]{48})$/);
  if(m&&method==='DELETE'){const r=db.prepare('SELECT * FROM performance_results WHERE id=?').get(m[1]);if(!r)bad(404,'Result unavailable');if(r.user!==user&&!community.manage(r.crew,user)&&!['admin','moderator'].includes(db.prepare('SELECT site_role FROM users WHERE id=?').get(user)?.site_role))bad(403,'Only the owner or a moderator can remove this result');db.prepare('UPDATE performance_results SET removed=1,vehicle=? WHERE id=?').run('',r.id);return {ok:true};}
 }};
}
