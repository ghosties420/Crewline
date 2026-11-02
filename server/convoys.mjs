// Convoy plans: public visibility is distinct from membership and location sharing.
import {randomBytes} from 'node:crypto';
export function createConvoys(db,{bad,text,point,transaction,limit,community}){
 const add=(table,name,type)=>{if(!db.prepare('PRAGMA table_info('+table+')').all().some(c=>c.name===name))db.exec('ALTER TABLE '+table+' ADD COLUMN '+name+' '+type);};
 transaction(()=>{for(const [n,t]of [['visibility',"TEXT NOT NULL DEFAULT 'crew'"],['start_lat','REAL'],['start_lon','REAL'],['meeting',"TEXT NOT NULL DEFAULT ''"],['departure','INTEGER'],['notes',"TEXT NOT NULL DEFAULT ''"],['stops',"TEXT NOT NULL DEFAULT '[]'"],['phase',"TEXT NOT NULL DEFAULT 'meeting'"],['source_event','TEXT']])add('convoys',n,t);add('members','ready','INTEGER NOT NULL DEFAULT 0');});
 db.exec(`CREATE TABLE IF NOT EXISTS convoy_exclusions(convoy TEXT REFERENCES convoys(id) ON DELETE CASCADE,user TEXT REFERENCES users(id) ON DELETE CASCADE,PRIMARY KEY(convoy,user));
 CREATE TABLE IF NOT EXISTS convoy_updates(id INTEGER PRIMARY KEY AUTOINCREMENT,user TEXT REFERENCES users(id) ON DELETE CASCADE,convoy TEXT REFERENCES convoys(id) ON DELETE CASCADE,body TEXT NOT NULL,created INTEGER NOT NULL,seen INTEGER NOT NULL DEFAULT 0);
 CREATE INDEX IF NOT EXISTS convoy_updates_user ON convoy_updates(user,id);`);
 function notify(c,body,actor){db.prepare('INSERT INTO convoy_updates(user,convoy,body,created) SELECT user,?,?,? FROM members WHERE convoy=? AND user<>?').run(c.id,body,Date.now(),c.id,actor);db.prepare('DELETE FROM convoy_updates WHERE created<?').run(Date.now()-30*86400000);}
 const get=id=>db.prepare('SELECT c.*,u.name AS owner FROM convoys c JOIN users u ON u.id=c.user WHERE c.id=?').get(id);
 const visible=(c,user)=>!!c&&(c.visibility==='public'||!!community.member(c.crew,user));
 const joined=(id,user)=>!!db.prepare('SELECT 1 FROM members WHERE convoy=? AND user=?').get(id,user);
 function detail(c,user){if(!visible(c,user))bad(404,'Convoy unavailable');const mine=c.user===user,isJoined=joined(c.id,user);return {...c,mine,joined:isJoined,stops:JSON.parse(c.stops),memberCount:db.prepare('SELECT count(*) AS n FROM members WHERE convoy=?').get(c.id).n,members:mine||isJoined?db.prepare('SELECT u.id,u.name,m.ready FROM members m JOIN users u ON u.id=m.user WHERE m.convoy=? ORDER BY u.name').all(c.id):[]};}
 const list=user=>db.prepare("SELECT c.*,u.name AS owner FROM convoys c JOIN users u ON u.id=c.user WHERE c.visibility='public' OR EXISTS(SELECT 1 FROM crew_members m WHERE m.crew=c.crew AND m.user=?) ORDER BY c.created DESC LIMIT 200").all(user).map(c=>detail(c,user));
 function handle(path,method,b,user){
 if(path==='/convoy-updates'&&method==='GET')return {updates:db.prepare(`SELECT n.* FROM convoy_updates n JOIN convoys c ON c.id=n.convoy WHERE n.user=? AND (c.visibility='public' OR EXISTS(SELECT 1 FROM crew_members m WHERE m.crew=c.crew AND m.user=n.user)) ORDER BY n.id DESC LIMIT 100`).all(user)};
 if(path==='/convoy-updates'&&method==='PUT'){if(!Number.isSafeInteger(b.through)||b.through<0)bad(400,'Invalid update cursor');db.prepare('UPDATE convoy_updates SET seen=1 WHERE user=? AND id<=?').run(user,b.through);return {ok:true};}
 if(path==='/convoys'&&method==='POST'){
  limit('convoy-create:'+user,10);const visibility=b.visibility||'crew';if(!['crew','public'].includes(visibility))bad(400,'Choose crew-only or public visibility');const crew=visibility==='crew'?(b.crew||community.requireCrew(user)):null;if(crew&&!community.member(crew,user))bad(403,'Join that crew first');
  point(b);const hasStart=b.start_lat!==undefined||b.start_lon!==undefined;if(hasStart)point({lat:b.start_lat,lon:b.start_lon});else if(b.planVersion===2)bad(400,'Choose a meeting point');
  const departure=b.departure??Date.now();if(!Number.isSafeInteger(departure)||departure<Date.now()-3600000||departure>Date.now()+365*86400000)bad(400,'Choose a departure within the next year');
  const stops=b.stops||[];if(!Array.isArray(stops)||stops.length>5)bad(400,'Up to five stops allowed');const cleanStops=stops.map(s=>{if(!s||typeof s!=='object')bad(400,'Invalid stop');point(s);return {lat:s.lat,lon:s.lon,name:text(s.name||'Stop',120)};});
  if(b.source_event){const e=db.prepare('SELECT * FROM events WHERE id=?').get(b.source_event);if(!community.visibleEvent(e,user))bad(404,'Event unavailable');if(e.visibility!=='public'&&(visibility==='public'||crew!==e.crew))bad(403,'A private event can only seed a convoy for its host crew');}
  const id=randomBytes(24).toString('hex');transaction(()=>{db.prepare('INSERT INTO convoys(id,user,title,destination,lat,lon,created,crew,visibility,start_lat,start_lon,meeting,departure,notes,stops,phase,source_event) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,user,text(b.title),text(b.destination||'',200,true),b.lat,b.lon,Date.now(),crew,visibility,hasStart?b.start_lat:null,hasStart?b.start_lon:null,text(b.meeting||'',200,true),departure,text(b.notes||'',3000,true),JSON.stringify(cleanStops),departure>Date.now()+60000?'scheduled':'meeting',b.source_event||null);db.prepare('INSERT INTO members(convoy,user) VALUES(?,?)').run(id,user);});return {id};
 }
 const m=path.match(/^\/convoys\/([a-f0-9]+)(?:\/(join|leave|ready|start|finish|remove|restore))?$/);if(!m)return;const c=get(m[1]);if(!visible(c,user))bad(404,'Convoy unavailable');const act=m[2];
 if(!act&&method==='GET')return {...detail(c,user),excluded:c.user===user?db.prepare('SELECT u.id,u.name FROM convoy_exclusions x JOIN users u ON u.id=x.user WHERE x.convoy=?').all(c.id):[]};
 if(!act&&method==='PUT'){
  if(c.user!==user)bad(403,'Only the organiser can edit this convoy');if(c.phase==='completed')bad(409,'This convoy has finished');limit('convoy-edit:'+user,20);
  const title=text(b.title),meeting=text(b.meeting||'',200,true),destination=text(b.destination||'',200,true),notes=text(b.notes||'',3000,true),departure=b.departure;
  if(!Number.isSafeInteger(departure)||departure<Date.now()-3600000||departure>Date.now()+365*86400000)bad(400,'Choose a departure within the next year');
  transaction(()=>{db.prepare('UPDATE convoys SET title=?,meeting=?,destination=?,notes=?,departure=? WHERE id=?').run(title,meeting,destination,notes,departure,c.id);db.prepare('UPDATE members SET ready=0 WHERE convoy=?').run(c.id);notify(c,'Plan updated: '+title+'. Check departure time and notes; please mark ready again.',user);});return {ok:true};
 }
 if(act&&method==='POST'){
  if(act==='remove'||act==='restore'){
   if(c.user!==user)bad(403,'Only the organiser can manage participants');if(b.user===user)bad(400,'The organiser cannot remove themselves');if(typeof b.user!=='string'||!db.prepare('SELECT id FROM users WHERE id=?').get(b.user))bad(404,'Person unavailable');
   transaction(()=>{if(act==='remove'){db.prepare('INSERT OR IGNORE INTO convoy_exclusions(convoy,user) VALUES(?,?)').run(c.id,b.user);db.prepare('DELETE FROM members WHERE convoy=? AND user=?').run(c.id,b.user);}else db.prepare('DELETE FROM convoy_exclusions WHERE convoy=? AND user=?').run(c.id,b.user);});return {ok:true};
  }
  if(act==='leave'){db.prepare('DELETE FROM members WHERE convoy=? AND user=?').run(c.id,user);return {ok:true};}
  if(c.phase==='completed')bad(409,'This convoy has finished');
  if(act==='join'){if(db.prepare('SELECT 1 FROM convoy_exclusions WHERE convoy=? AND user=?').get(c.id,user))bad(403,'The organiser has removed you from this convoy');if(db.prepare('SELECT count(*) AS n FROM members WHERE convoy=?').get(c.id).n>=100&&!joined(c.id,user))bad(409,'Convoy is full (100 participants)');db.prepare('INSERT OR IGNORE INTO members(convoy,user) VALUES(?,?)').run(c.id,user);return {ok:true};}
  if(act==='ready'){if(!joined(c.id,user))bad(403,'Join this convoy first');db.prepare('UPDATE members SET ready=? WHERE convoy=? AND user=?').run(b.ready===true?1:0,c.id,user);return {ok:true};}
  if(c.user!==user)bad(403,'Only the organiser can start or finish this convoy');
  transaction(()=>{db.prepare('UPDATE convoys SET phase=? WHERE id=?').run(act==='start'?'driving':'completed',c.id);notify(c,c.title+(act==='start'?' has started driving.':' has finished.'),user);});return {ok:true};
 }
 if(!act&&method==='DELETE'){if(c.user!==user)bad(403,'Only the organiser can delete this convoy');db.prepare('DELETE FROM convoys WHERE id=?').run(c.id);return {ok:true};}
 }
 return {handle,list,visible,joined,get};
}
