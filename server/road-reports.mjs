// Convoy-scoped sightings. These are member reports, not verified camera records.
import {randomBytes} from 'node:crypto';
export function createRoadReports(db,{bad,point,transaction,limit,convoys}){
 const lifetime={police:15,camera:60,checkpoint:15,roadworks:120,traffic:30};
 db.exec(`CREATE TABLE IF NOT EXISTS road_reports(id TEXT PRIMARY KEY,convoy TEXT NOT NULL REFERENCES convoys(id) ON DELETE CASCADE,user TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,kind TEXT NOT NULL,lat REAL NOT NULL,lon REAL NOT NULL,created INTEGER NOT NULL,expires INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS road_reports_convoy ON road_reports(convoy,expires);
 CREATE TABLE IF NOT EXISTS road_report_clear_votes(report TEXT REFERENCES road_reports(id) ON DELETE CASCADE,user TEXT REFERENCES users(id) ON DELETE CASCADE,PRIMARY KEY(report,user));`);
 function handle(path,method,b,user){
  const match=path.match(/^\/convoys\/([a-f0-9]+)\/pings(?:\/([a-f0-9]+))?$/);if(!match)return;
  const c=convoys.get(match[1]);if(!convoys.visible(c,user))bad(404,'Convoy unavailable');
  if(!convoys.joined(c.id,user))bad(403,'Join this convoy to see or send road reports');
  if(c.phase==='completed')bad(409,'This convoy has finished');
  const now=Date.now();db.prepare('DELETE FROM road_reports WHERE expires<=?').run(now);
  if(!match[2]&&method==='GET')return {pings:db.prepare(`SELECT r.id,r.kind,r.lat,r.lon,r.created,r.expires,r.user=? AS mine,(SELECT count(*) FROM road_report_clear_votes v WHERE v.report=r.id) AS clearVotes,EXISTS(SELECT 1 FROM road_report_clear_votes v WHERE v.report=r.id AND v.user=?) AS voted FROM road_reports r WHERE convoy=? ORDER BY created DESC LIMIT 200`).all(user,user,c.id),canModerate:c.user===user,serverTime:now};
  if(!match[2]&&method==='POST'){
   if(!Object.hasOwn(lifetime,b.kind))bad(400,'Choose a supported road report');point(b);
   limit('road-report:'+user,5);
   // Repeated taps at the same spot must not create a pile of identical pins.
   const duplicate=db.prepare('SELECT id FROM road_reports WHERE convoy=? AND user=? AND kind=? AND created>? AND abs(lat-?)<0.0003 AND abs(lon-?)<0.0003 LIMIT 1').get(c.id,user,b.kind,now-60000,b.lat,b.lon);
   if(duplicate)return {id:duplicate.id,duplicate:true};
   if(db.prepare('SELECT count(*) AS n FROM road_reports WHERE convoy=?').get(c.id).n>=200)bad(409,'This convoy has too many active reports');
   const id=randomBytes(24).toString('hex'),expires=now+lifetime[b.kind]*60000;
   db.prepare('INSERT INTO road_reports VALUES(?,?,?,?,?,?,?,?)').run(id,c.id,user,b.kind,b.lat,b.lon,now,expires);return {id,expires};
  }
  if(match[2]&&method==='DELETE'){
   const ping=db.prepare('SELECT * FROM road_reports WHERE id=? AND convoy=?').get(match[2],c.id);if(!ping)bad(404,'Report expired or removed');
   if(ping.user===user||c.user===user){db.prepare('DELETE FROM road_reports WHERE id=?').run(ping.id);return {removed:true};}
   // Two different convoy members can clear an outdated sighting. One person cannot vote twice.
   return transaction(()=>{db.prepare('INSERT OR IGNORE INTO road_report_clear_votes VALUES(?,?)').run(ping.id,user);const votes=db.prepare('SELECT count(*) AS n FROM road_report_clear_votes WHERE report=?').get(ping.id).n;if(votes>=2)db.prepare('DELETE FROM road_reports WHERE id=?').run(ping.id);return {removed:votes>=2,votes};});
  }
  bad(405,'Unsupported road report action');
 }
 return {handle};
}
