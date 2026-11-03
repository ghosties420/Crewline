// Crewline private, single-crew service. Node 24 built-ins only: no npm install.
import http from 'node:http';
import {createPerformance} from './performance.mjs';
import {createRoadReports} from './road-reports.mjs';
import {readFileSync} from 'node:fs';
const cameraData=JSON.parse(readFileSync(new URL('./cameras.json',import.meta.url))); 
import {createConvoys} from './convoys.mjs';
import {createCommunity} from './community.mjs';
import {createSafety} from './safety.mjs';
import {createComms} from './comms.mjs';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,createHash,scryptSync,timingSafeEqual} from 'node:crypto';
export const db=new DatabaseSync(process.env.DB_PATH||'crewline.sqlite');
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL COLLATE NOCASE UNIQUE,salt TEXT NOT NULL,hash TEXT NOT NULL,bio TEXT NOT NULL DEFAULT '',garage_visible INTEGER NOT NULL DEFAULT 1,profile_visible INTEGER NOT NULL DEFAULT 1,epoch TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user TEXT REFERENCES users(id) ON DELETE CASCADE,expires INTEGER);
CREATE TABLE IF NOT EXISTS invites(code TEXT PRIMARY KEY,expires INTEGER);
CREATE TABLE IF NOT EXISTS locations(user TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,lat REAL,lon REAL,updated INTEGER);
CREATE TABLE IF NOT EXISTS vehicles(id TEXT PRIMARY KEY,user TEXT REFERENCES users(id) ON DELETE CASCADE,name TEXT,year TEXT,mods TEXT,notes TEXT);
CREATE TABLE IF NOT EXISTS convoys(id TEXT PRIMARY KEY,user TEXT REFERENCES users(id) ON DELETE CASCADE,title TEXT,destination TEXT,lat REAL,lon REAL,created INTEGER);
CREATE TABLE IF NOT EXISTS members(convoy TEXT REFERENCES convoys(id) ON DELETE CASCADE,user TEXT REFERENCES users(id) ON DELETE CASCADE,PRIMARY KEY(convoy,user));`);
const secret=process.env.ADMIN_KEY;
if(!secret||secret.length<32)throw Error('ADMIN_KEY must contain at least 32 characters.');
const id=()=>randomBytes(24).toString('hex');
const digest=v=>createHash('sha256').update(v).digest('hex');
const bad=(status,message)=>{throw Object.assign(Error(message),{status});};
const text=(v,max=120,empty=false)=>{if(typeof v!=='string'||v.length>max||(!empty&&!v.trim()))bad(400,'Invalid text field');return v.trim();};
const point=b=>{if(!Number.isFinite(b.lat)||!Number.isFinite(b.lon)||Math.abs(b.lat)>85||Math.abs(b.lon)>180)bad(400,'Invalid coordinates');};
const equal=(a,b)=>{a=Buffer.from(a);b=Buffer.from(b);return a.length===b.length&&timingSafeEqual(a,b);};
function transaction(fn){db.exec('BEGIN IMMEDIATE');try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}
const limits=new Map();
function limit(key,n=120){const now=Date.now();let a=limits.get(key);if(!a||now-a.start>60000){a={start:now,n:0};limits.set(key,a);}if(++a.n>n)bad(429,'Too many requests; wait one minute');}
function housekeeping(){const now=Date.now();db.prepare('DELETE FROM road_reports WHERE expires<=?').run(now);db.prepare('DELETE FROM sessions WHERE expires<?').run(now);db.prepare('DELETE FROM invites WHERE expires<?').run(now);db.prepare('DELETE FROM locations WHERE updated<?').run(now-60000);for(const [k,v]of limits)if(now-v.start>60000)limits.delete(k);}
const cleanup=setInterval(housekeeping,30000);cleanup.unref();
let community,safety,convoys;
export const comms=createComms(db,{bad,text,transaction,limit,community:()=>community,safety:()=>safety,convoys:()=>convoys});
community=createCommunity(db,{bad,text,transaction,limit});
safety=createSafety(db,{bad,text,transaction,limit,comms});
convoys=createConvoys(db,{bad,text,point,transaction,limit,community});
const roadReports=createRoadReports(db,{bad,point,transaction,limit,convoys});
const performance=createPerformance(db,{bad,text,limit,community,safety});
export const server=http.createServer(async(req,res)=>{
 res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const send=data=>res.end(JSON.stringify(data));
 try{
  const url=new URL(req.url,'http://localhost'),path=url.pathname,method=req.method;
  let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>(path==='/photos'?650000:32768))bad(413,'Request too large');chunks.push(chunk);}
  let b={};try{if(size)b=JSON.parse(Buffer.concat(chunks).toString());}catch{bad(400,'Invalid JSON');}if(!b||typeof b!=='object'||Array.isArray(b))bad(400,'Expected an object');
  if(path==='/health'&&method==='GET'){db.prepare('SELECT 1').get();return send({ok:true,version:'1.6.0',protocol:4});}
  if(path==='/about'&&method==='GET')return send(safety.about());
  if(path==='/signup-info'&&method==='GET')return send({open:safety.openSignup()});
  if(path==='/recover'&&method==='POST')return send(safety.recover(b));
  if(path==='/invites'&&method==='POST'){
   if(!equal(String(req.headers['x-admin-key']||''),secret))bad(403,'Forbidden');
   const code=id();db.prepare('INSERT INTO invites VALUES(?,?)').run(digest(code),Date.now()+86400000);return send({code,expiresInHours:24});
  }
  if(['/register','/login'].includes(path)&&method==='POST'){
   // Bound expensive password hashing; isolate repeated attempts against one account.
   // Never trust arbitrary X-Forwarded-For headers. Public ingress still needs its own source limits.
   const name=text(b.name,40),password=text(b.password,200);limit('auth-account:'+digest(name.toLowerCase()),10);limit('auth-cpu',120);if(password.length<12)bad(400,'Password needs at least 12 characters');
   let user;
   if(path==='/register'){
    if(safety.openSignup()&&b.acceptRules!==true)bad(400,'Read and accept the community rules and privacy information');const invite=b.invite?digest(text(b.invite,100)):null;if(!invite&&!safety.openSignup())bad(403,'Registration requires an invitation from the host');const salt=id();const hash=scryptSync(password,salt,64).toString('hex');
    user=transaction(()=>{if(invite&&!db.prepare('SELECT code FROM invites WHERE code=? AND expires>?').get(invite,Date.now()))bad(403,'Invalid or expired invitation');if(db.prepare('SELECT id FROM users WHERE name=?').get(name))bad(409,'Name already used');const uid=id();db.prepare('INSERT INTO users(id,name,salt,hash) VALUES(?,?,?,?)').run(uid,name,salt,hash);db.prepare('DELETE FROM invites WHERE code=?').run(invite);return uid;});
   }else{
    const row=db.prepare('SELECT * FROM users WHERE name=?').get(name);const hash=scryptSync(password,row?.salt||'dummy',64).toString('hex');if(!row||!equal(hash,row.hash))bad(401,'Name or password incorrect');user=row.id;
   }
   if(safety.banned(user))bad(403,'This account is suspended');
   const token=id();db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token),user,Date.now()+30*86400000);return send({token,name,recoveryCode:path==='/register'?safety.newRecovery(user):undefined});
  }
  const token=digest(String(req.headers.authorization||'').replace(/^Bearer /,''));
  const session=db.prepare('SELECT user FROM sessions WHERE token=? AND expires>?').get(token,Date.now());if(!session)bad(401,'Sign in again');const user=session.user;if(safety.banned(user))bad(403,'This account is suspended');limit('u:'+user,240);
  if(path==='/cameras'&&method==='GET')return send(cameraData);
  const perf=performance.handle(path,method,b,user,url);if(perf!==undefined)return send(perf);
  const safe=safety.handle(path,method,b,user,url);if(safe!==undefined)return send(safe);
  const roadResult=roadReports.handle(path,method,b,user);if(roadResult!==undefined)return send(roadResult);
  const convoyResult=convoys.handle(path,method,b,user);if(convoyResult!==undefined)return send(convoyResult);
  const social=community.handle(path,method,b,user,url);if(social!==undefined)return send(social);
  const handled=comms.handle(path,method,b,user,url);if(handled!==undefined)return send(handled);
  const me=()=>db.prepare('SELECT id,name,bio,garage_visible,profile_visible,active_crew,site_role,dm_policy,(SELECT id FROM photos WHERE user=users.id AND vehicle IS NULL) AS photo FROM users WHERE id=?').get(user);
  if(path==='/state'&&method==='GET')return send({me:me(),map:{url:process.env.MAP_TILE_URL||'https://tile.openstreetmap.org/{z}/{x}/{y}.png',attribution:process.env.MAP_ATTRIBUTION||'© OpenStreetMap contributors'},
   activeCrew:community.active(user),crews:db.prepare('SELECT c.id,c.name,m.role FROM crews c JOIN crew_members m ON m.crew=c.id WHERE m.user=?').all(user),
   crew:db.prepare(`SELECT u.id,u.name,CASE WHEN u.profile_visible=1 THEN (SELECT id FROM photos WHERE user=u.id AND vehicle IS NULL) ELSE NULL END AS photo,CASE WHEN u.profile_visible=1 THEN u.bio ELSE '' END AS bio, l.lat,l.lon,l.updated FROM users u LEFT JOIN locations l ON l.user=u.id AND l.updated>? AND l.crew=? WHERE u.id=? OR EXISTS(SELECT 1 FROM crew_members m WHERE m.crew=? AND m.user=u.id) ORDER BY u.name`).all(Date.now()-60000,community.active(user),user,community.active(user)).filter(u=>!safety.blocked(user,u.id)),
   vehicles:db.prepare('SELECT v.*,(SELECT id FROM photos WHERE vehicle=v.id) AS photo,u.name AS owner,v.user=? AS mine FROM vehicles v JOIN users u ON u.id=v.user WHERE v.user=? OR (u.garage_visible=1 AND EXISTS(SELECT 1 FROM crew_members m WHERE m.crew=? AND m.user=v.user)) ORDER BY v.rowid DESC').all(user,user,community.active(user)),
   convoys:convoys.list(user)});
  if(path==='/profile'&&method==='PUT'){const name=text(b.name,40),bio=text(b.bio,500,true);if(db.prepare('SELECT id FROM users WHERE name=? AND id<>?').get(name,user))bad(409,'Name already used');db.prepare('UPDATE users SET name=?,bio=?,garage_visible=?,profile_visible=? WHERE id=?').run(name,bio,b.garage_visible===true?1:0,b.profile_visible!==false?1:0,user);return send(me());}
  if(path==='/password'&&method==='PUT'){
   limit('password:'+user,5);const row=db.prepare('SELECT * FROM users WHERE id=?').get(user);if(!equal(scryptSync(text(b.oldPassword,200),row.salt,64).toString('hex'),row.hash))bad(403,'Current password incorrect');const password=text(b.password,200);if(password.length<12)bad(400,'Password needs at least 12 characters');const salt=id();comms.disconnect(user);transaction(()=>{db.prepare('UPDATE users SET salt=?,hash=?,epoch=? WHERE id=?').run(salt,scryptSync(password,salt,64).toString('hex'),'',user);db.prepare('DELETE FROM sessions WHERE user=? AND token<>?').run(user,token);db.prepare('DELETE FROM locations WHERE user=?').run(user);});return send({ok:true});
  }
  if(path==='/sharing'&&method==='PUT'){community.requireCrew(user);const epoch=id();db.prepare('UPDATE users SET epoch=? WHERE id=?').run(epoch,user);return send({epoch});}
  if(path==='/sharing'&&method==='DELETE'){transaction(()=>{db.prepare('UPDATE users SET epoch=? WHERE id=?').run('',user);db.prepare('DELETE FROM locations WHERE user=?').run(user);});return send({ok:true});}
  if(path==='/location'&&method==='PUT'){point(b);if(!b.epoch||db.prepare('SELECT epoch FROM users WHERE id=?').get(user).epoch!==b.epoch)bad(409,'Sharing was stopped');db.prepare('INSERT OR REPLACE INTO locations(user,lat,lon,updated,crew) VALUES(?,?,?,?,?)').run(user,b.lat,b.lon,Date.now(),community.requireCrew(user));return send({ok:true});}
  if(path==='/vehicles'&&method==='POST'){if(db.prepare('SELECT count(*) AS n FROM vehicles WHERE user=?').get(user).n>=20)bad(400,'Maximum 20 vehicles per person');const vid=id();db.prepare('INSERT INTO vehicles VALUES(?,?,?,?,?,?)').run(vid,user,text(b.name),text(b.year||'',8,true),text(b.mods||'',4000,true),text(b.notes||'',4000,true));return send({id:vid});}
  let match=path.match(/^\/vehicles\/([a-f0-9]+)$/);
  if(match&&['PUT','DELETE'].includes(method)){
   if(!db.prepare('SELECT id FROM vehicles WHERE id=? AND user=?').get(match[1],user))bad(403,'Only the vehicle owner can change it');
   if(method==='DELETE')db.prepare('DELETE FROM vehicles WHERE id=?').run(match[1]);else db.prepare('UPDATE vehicles SET name=?,year=?,mods=?,notes=? WHERE id=?').run(text(b.name),text(b.year||'',8,true),text(b.mods||'',4000,true),text(b.notes||'',4000,true),match[1]);return send({ok:true});
  }
  if(path==='/account'&&method==='DELETE'){const row=db.prepare('SELECT * FROM users WHERE id=?').get(user);if(!equal(scryptSync(text(b.password,200),row.salt,64).toString('hex'),row.hash))bad(403,'Password incorrect');if(db.prepare("SELECT 1 FROM crew_members WHERE user=? AND role='owner'").get(user))bad(409,'Transfer ownership or delete your crews before deleting your account');comms.disconnect(user);db.prepare('DELETE FROM users WHERE id=?').run(user);return send({ok:true});}
  if(path==='/logout'&&method==='POST'){comms.disconnect(user);transaction(()=>{db.prepare('UPDATE users SET epoch=? WHERE id=?').run('',user);db.prepare('DELETE FROM locations WHERE user=?').run(user);db.prepare('DELETE FROM sessions WHERE token=?').run(token);});return send({ok:true});}
  bad(404,'Not found');
 }catch(e){res.statusCode=e.status||500;if(!e.status)console.error(e.message);send({error:e.status?e.message:'Server error'});}
});
comms.attach(server);
server.maxConnections=200;server.requestTimeout=15000;server.headersTimeout=10000;server.on('close',()=>clearInterval(cleanup));
if(process.env.NODE_ENV!=='test')server.listen(Number(process.env.PORT||8080),process.env.HOST||'127.0.0.1',()=>console.log('Crewline 1.6 listening'));
