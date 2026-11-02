// Additive v1.1 schema: existing v1.0 accounts, garages and drives are preserved.
import {randomBytes,createHash} from 'node:crypto';
export function createComms(db,{bad,text,transaction,limit,community,safety,convoys}) {
 const id=()=>randomBytes(24).toString('hex');
 db.exec(`CREATE TABLE IF NOT EXISTS posts(id INTEGER PRIMARY KEY AUTOINCREMENT,user TEXT REFERENCES users(id) ON DELETE CASCADE,parent INTEGER REFERENCES posts(id) ON DELETE CASCADE,title TEXT,body TEXT,created INTEGER);
 CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY AUTOINCREMENT,room TEXT NOT NULL,user TEXT REFERENCES users(id) ON DELETE CASCADE,body TEXT,created INTEGER);
 CREATE INDEX IF NOT EXISTS message_room ON messages(room,id);
 CREATE TABLE IF NOT EXISTS photos(id TEXT PRIMARY KEY,user TEXT REFERENCES users(id) ON DELETE CASCADE,vehicle TEXT REFERENCES vehicles(id) ON DELETE CASCADE,data BLOB NOT NULL);
 CREATE UNIQUE INDEX IF NOT EXISTS one_avatar ON photos(user) WHERE vehicle IS NULL;
 CREATE UNIQUE INDEX IF NOT EXISTS one_car_photo ON photos(vehicle) WHERE vehicle IS NOT NULL;
 CREATE TABLE IF NOT EXISTS calls(id TEXT PRIMARY KEY,owner TEXT REFERENCES users(id) ON DELETE CASCADE,kind TEXT,created INTEGER,ended INTEGER);
 CREATE TABLE IF NOT EXISTS call_members(call TEXT REFERENCES calls(id) ON DELETE CASCADE,user TEXT REFERENCES users(id) ON DELETE CASCADE,status TEXT,seen INTEGER,PRIMARY KEY(call,user));`);
 if(!db.prepare('PRAGMA table_info(calls)').all().some(c=>c.name==='convoy'))db.exec('ALTER TABLE calls ADD COLUMN convoy TEXT');
 const convoyAllowed=(cid,user)=>{const c=convoys().get(cid);return !!c&&c.phase!=='completed'&&convoys().visible(c,user)&&convoys().joined(cid,user);};
 const sockets=new Map(); // Key = call/user. Audio exists only in bounded socket buffers.
 const room=(user,peer)=>{if(!peer||peer==='crew')return 'crew:'+community().requireCrew(user);if(peer===user||!db.prepare('SELECT id FROM users WHERE id=?').get(peer))bad(400,'Choose another member');if(!safety().canContact(user,peer))bad(403,'Messaging is unavailable for this person');return [user,peer].sort().join(':');};
 const members=cid=>db.prepare('SELECT m.user,m.status,u.name FROM call_members m JOIN users u ON u.id=m.user WHERE m.call=?').all(cid);
 function calls(user){return db.prepare(`SELECT c.*,u.name AS name,m.status AS myStatus FROM calls c JOIN users u ON u.id=c.owner JOIN call_members m ON m.call=c.id AND m.user=? WHERE c.ended IS NULL AND (c.crew IS NULL OR EXISTS(SELECT 1 FROM crew_members cm WHERE cm.crew=c.crew AND cm.user=m.user)) ORDER BY c.created DESC`).all(user).filter(c=>!c.convoy||convoyAllowed(c.convoy,user)).map(c=>({...c,members:members(c.id)}));}
 function closeVoice(cid,user){const s=sockets.get(cid+'/'+user);if(s)s.destroy();}
 function end(cid){db.prepare('UPDATE calls SET ended=? WHERE id=? AND ended IS NULL').run(Date.now(),cid);for(const [k,s]of sockets)if(k.startsWith(cid+'/'))s.destroy();}
 function finishEmpty(cid){if(!db.prepare("SELECT 1 FROM call_members WHERE call=? AND status='joined'").get(cid))end(cid);}
 function allowedCall(cid,user){const c=db.prepare('SELECT c.*,m.status FROM calls c JOIN call_members m ON m.call=c.id AND m.user=? WHERE c.id=? AND c.ended IS NULL').get(user,cid);if(!c||(c.convoy&&!convoyAllowed(c.convoy,user))||(c.crew&&!community().member(c.crew,user)))bad(404,'Call unavailable');return c;}
 function housekeeping(){const now=Date.now();for(const c of db.prepare('SELECT id,kind,created FROM calls WHERE ended IS NULL').all()){
  for(const m of db.prepare("SELECT user,seen FROM call_members WHERE call=? AND status='joined'").all(c.id))if(now-m.seen>45000){db.prepare("UPDATE call_members SET status='left' WHERE call=? AND user=?").run(c.id,m.user);closeVoice(c.id,m.user);}
  if(c.kind==='direct'&&now-c.created>60000&&db.prepare("SELECT 1 FROM call_members WHERE call=? AND status='invited'").get(c.id))end(c.id);
  else finishEmpty(c.id);
 }
 for(const [k,s]of sockets){const session=db.prepare('SELECT 1 FROM sessions WHERE token=? AND expires>?').get(s.sessionHash,now);const [cid,user]=k.split('/');const linked=db.prepare('SELECT convoy FROM calls WHERE id=?').get(cid)?.convoy;if((linked&&!convoyAllowed(linked,user))||!session||safety().banned(user)||!db.prepare("SELECT 1 FROM call_members m JOIN calls c ON c.id=m.call WHERE m.call=? AND m.user=? AND m.status='joined' AND c.ended IS NULL AND (c.crew IS NULL OR EXISTS(SELECT 1 FROM crew_members cm WHERE cm.crew=c.crew AND cm.user=m.user))").get(cid,user))s.destroy();else s.write(frame(Buffer.alloc(0),9));}
 }
 const timer=setInterval(housekeeping,10000);timer.unref();
 function handle(path,method,b,user,url){
  if(path==='/board'&&method==='GET'){const crew=community().requireCrew(user);return {posts:db.prepare('SELECT p.*,u.name,(SELECT count(*) FROM posts r WHERE r.parent=p.id) AS replies FROM posts p JOIN users u ON u.id=p.user WHERE p.parent IS NULL AND p.crew=? ORDER BY p.id DESC LIMIT 50').all(crew)};}
  if(path==='/board'&&method==='POST'){limit('post:'+user,20);const crew=community().requireCrew(user);const title=b.parent?'':text(b.title,160),body=text(b.body,6000);if(b.parent&&!db.prepare('SELECT 1 FROM posts WHERE id=? AND parent IS NULL AND crew=?').get(b.parent,crew))bad(404,'Thread not found');const r=db.prepare('INSERT INTO posts(user,parent,title,body,created,crew) VALUES(?,?,?,?,?,?)').run(user,b.parent||null,title,body,Date.now(),crew);return {id:Number(r.lastInsertRowid)};}
  let match=path.match(/^\/board\/(\d+)$/);if(match){const p=db.prepare('SELECT p.*,u.name FROM posts p JOIN users u ON u.id=p.user WHERE p.id=?').get(Number(match[1]));if(!p||!community().member(p.crew,user))bad(404,'Post not found');if(method==='GET')return {post:p,replies:db.prepare('SELECT p.*,u.name FROM posts p JOIN users u ON u.id=p.user WHERE p.parent=? ORDER BY p.id LIMIT 200').all(p.id)};if(method==='DELETE'){if(p.user!==user)bad(403,'Only the author can delete it');db.prepare('DELETE FROM posts WHERE id=?').run(p.id);return {ok:true};}}
  if(path==='/messages'&&method==='GET'){const r=room(user,url.searchParams.get('peer')),before=Number(url.searchParams.get('before'))||Number.MAX_SAFE_INTEGER;return {messages:db.prepare('SELECT m.*,u.name FROM messages m JOIN users u ON u.id=m.user WHERE m.room=? AND m.id<? ORDER BY m.id DESC LIMIT 50').all(r,before).reverse()};}
  if(path==='/messages'&&method==='POST'){limit('chat:'+user,60);const r=room(user,b.peer),body=text(b.body,6000);const result=db.prepare('INSERT INTO messages(room,user,body,created) VALUES(?,?,?,?)').run(r,user,body,Date.now());return {id:Number(result.lastInsertRowid)};}
  match=path.match(/^\/messages\/(\d+)$/);if(match&&method==='DELETE'){if(!db.prepare('SELECT 1 FROM messages WHERE id=? AND user=?').get(Number(match[1]),user))bad(403,'Only the sender can delete it');db.prepare('DELETE FROM messages WHERE id=?').run(Number(match[1]));return {ok:true};}
  if(path==='/photos'&&method==='POST'){
   limit('photo:'+user,10);if(db.prepare('SELECT COALESCE(sum(length(data)),0) AS n FROM photos').get().n>100000000)bad(507,'Photo storage is full; ask the host to review storage');if(b.vehicle&&!db.prepare('SELECT 1 FROM vehicles WHERE id=? AND user=?').get(b.vehicle,user))bad(403,'Not your vehicle');
   if(typeof b.data!=='string'||b.data.length>600000||!/^[A-Za-z0-9+/=]+$/.test(b.data))bad(400,'Invalid photo');const data=Buffer.from(b.data,'base64');if(data.length>450000||data.length<4||data[0]!==255||data[1]!==216||data[data.length-2]!==255||data[data.length-1]!==217)bad(400,'Use a JPEG under 450 KB');
   const pid=id();transaction(()=>{db.prepare('DELETE FROM photos WHERE user=? AND vehicle IS ?').run(user,b.vehicle||null);db.prepare('INSERT INTO photos VALUES(?,?,?,?)').run(pid,user,b.vehicle||null,data);});return {id:pid};
  }
  match=path.match(/^\/photos\/([a-f0-9]+)$/);if(match){const p=db.prepare('SELECT p.*,u.garage_visible,u.profile_visible FROM photos p JOIN users u ON u.id=p.user WHERE p.id=?').get(match[1]);if(!p)bad(404,'Photo not found');if(method==='DELETE'){if(p.user!==user)bad(403,'Not your photo');db.prepare('DELETE FROM photos WHERE id=?').run(p.id);return {ok:true};}if(method==='GET'){if(p.user!==user&&(!db.prepare('SELECT 1 FROM crew_members a JOIN crew_members b ON b.crew=a.crew WHERE a.user=? AND b.user=?').get(user,p.user)||!(p.vehicle?p.garage_visible:p.profile_visible)))bad(403,'Photo is private');return {data:'data:image/jpeg;base64,'+Buffer.from(p.data).toString('base64')};}}
  if(path==='/calls'&&method==='GET')return {calls:calls(user)};
  if(path==='/calls'&&method==='POST'){
   limit('call:'+user,6);const kind=b.convoy?'convoy':b.peer&&b.peer!=='crew'?'direct':'crew';if(kind==='convoy'&&!convoyAllowed(b.convoy,user))bad(403,'Join this active convoy first');const crew=kind==='crew'?community().requireCrew(user):null;if(kind==='direct')room(user,b.peer);
   if(db.prepare("SELECT 1 FROM call_members m JOIN calls c ON c.id=m.call WHERE m.user=? AND m.status='joined' AND c.ended IS NULL").get(user))bad(409,'Leave your current call first');
   if(kind==='convoy'){const existing=db.prepare("SELECT id FROM calls WHERE convoy=? AND ended IS NULL").get(b.convoy);if(existing){db.prepare("INSERT INTO call_members VALUES(?,?,'left',?) ON CONFLICT(call,user) DO NOTHING").run(existing.id,user,Date.now());return {id:existing.id};}}
   if(kind==='crew'&&db.prepare("SELECT 1 FROM calls WHERE kind='crew' AND crew=? AND ended IS NULL").get(crew))bad(409,'There is already a crew call; join it');
   const cid=id(),now=Date.now();transaction(()=>{db.prepare('INSERT INTO calls(id,owner,kind,created,ended,crew,convoy) VALUES(?,?,?,?,NULL,?,?)').run(cid,user,kind,now,crew,b.convoy||null);const people=kind==='convoy'?[{id:user}]:kind==='direct'?[{id:user},{id:b.peer}]:community().people(crew).filter(p=>!safety().blocked(user,p.id));for(const p of people)db.prepare('INSERT INTO call_members VALUES(?,?,?,?)').run(cid,p.id,p.id===user?'joined':'invited',now);});return {id:cid};
  }
  match=path.match(/^\/calls\/([a-f0-9]+)\/(join|leave|decline|end)$/);if(match&&method==='POST'){
   const cid=match[1],act=match[2],c=allowedCall(cid,user);
   if(act==='end'){if(c.owner!==user)bad(403,'Only the organiser can end the call');end(cid);return {ok:true};}
   if(act==='join'){
    if(db.prepare("SELECT 1 FROM call_members m JOIN calls c ON c.id=m.call WHERE m.user=? AND m.call<>? AND m.status='joined' AND c.ended IS NULL").get(user,cid))bad(409,'Already in another call');
    if(c.status!=='joined'&&db.prepare("SELECT count(*) AS n FROM call_members WHERE call=? AND status='joined'").get(cid).n>=8)bad(409,'Call is full (8 people maximum)');
    db.prepare("UPDATE call_members SET status='joined',seen=? WHERE call=? AND user=?").run(Date.now(),cid,user);
   }else {db.prepare('UPDATE call_members SET status=? WHERE call=? AND user=?').run(act==='decline'?'declined':'left',cid,user);closeVoice(cid,user);if(c.kind==='direct')end(cid);else finishEmpty(cid);}
   return {ok:true};
  }
  if(path==='/comms/poll'&&method==='GET')return {convoyUpdateId:db.prepare('SELECT COALESCE(max(id),0) AS n FROM convoy_updates WHERE user=? AND seen=0').get(user).n,messageId:db.prepare("SELECT COALESCE(max(id),0) AS n FROM messages WHERE user<>? AND (room IN (SELECT 'crew:'||crew FROM crew_members WHERE user=?) OR room LIKE ? OR room LIKE ?) AND NOT EXISTS(SELECT 1 FROM blocks WHERE (owner=? AND target=messages.user) OR (owner=messages.user AND target=?))").get(user,user,user+':%', '%:'+user,user,user).n,postId:db.prepare('SELECT COALESCE(max(id),0) AS n FROM posts WHERE user<>? AND crew IN (SELECT crew FROM crew_members WHERE user=?)').get(user,user).n,calls:calls(user)};

 }
 function attach(server){server.on('close',()=>{clearInterval(timer);for(const s of sockets.values())s.destroy();});server.on('upgrade',(req,socket,head)=>{
  try{
   const url=new URL(req.url,'http://localhost');if(url.pathname!=='/voice')bad(404,'Not found');
   const raw=String(req.headers.authorization||'').replace(/^Bearer /,''),hash=createHash('sha256').update(raw).digest('hex');
   const session=db.prepare('SELECT user FROM sessions WHERE token=? AND expires>?').get(hash,Date.now());if(!session)bad(401,'Unauthorised');const user=session.user;if(safety().banned(user))bad(403,'Suspended');const cid=url.searchParams.get('call'),c=allowedCall(cid,user);if(c.status!=='joined')bad(403,'Accept the call first');
   const key=req.headers['sec-websocket-key'];if(req.headers['sec-websocket-version']!=='13'||typeof key!=='string'||Buffer.from(key,'base64').length!==16||String(req.headers.upgrade).toLowerCase()!=='websocket')bad(400,'Invalid upgrade');
   const tag=cid+'/'+user;if(sockets.has(tag))bad(409,'Already connected');
   const accept=createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n\r\n');socket.setNoDelay(true);socket.sessionHash=hash;sockets.set(tag,socket);
   let buffer=Buffer.alloc(0),window=Date.now(),count=0,lastLease=0;
   const dispose=()=>{if(sockets.get(tag)!==socket)return;sockets.delete(tag);db.prepare("UPDATE call_members SET status='left' WHERE call=? AND user=? AND status='joined'").run(cid,user);if(c.kind==='direct')end(cid);else finishEmpty(cid);};socket.on('close',dispose);socket.on('error',()=>socket.destroy());
   function data(chunk){buffer=Buffer.concat([buffer,chunk]);if(buffer.length>65536){socket.destroy();return;}while(buffer.length>=2){const op=buffer[0]&15;let n=buffer[1]&127,offset=2;if(!(buffer[0]&128)||(buffer[0]&112)||!(buffer[1]&128)){socket.destroy();return;}if(n===127){socket.destroy();return;}if(n===126){if(buffer.length<4)return;n=buffer.readUInt16BE(2);offset=4;}if(n>2048){socket.destroy();return;}if(buffer.length<offset+4+n)return;const mask=buffer.subarray(offset,offset+4);offset+=4;const payload=Buffer.from(buffer.subarray(offset,offset+n));for(let i=0;i<n;i++)payload[i]^=mask[i%4];buffer=buffer.subarray(offset+n);
    const now=Date.now();if(now-window>=1000){window=now;count=0;}if(++count>100){socket.destroy();return;}
    if(op===8){socket.end(frame(Buffer.alloc(0),8));return;}if(op===9){if(n>125){socket.destroy();return;}socket.write(frame(payload,10));continue;}if(op===10){db.prepare('UPDATE call_members SET seen=? WHERE call=? AND user=?').run(now,cid,user);continue;}
    if(op!==2||n!==160){socket.destroy();return;}
    if(now-lastLease>5000){lastLease=now;if(!db.prepare('SELECT 1 FROM sessions WHERE token=? AND expires>?').get(hash,now)){socket.destroy();return;}db.prepare('UPDATE call_members SET seen=? WHERE call=? AND user=?').run(now,cid,user);}
    if((c.convoy&&!convoyAllowed(c.convoy,user))||(c.crew&&!community().member(c.crew,user))){socket.destroy();return;}
    const outgoing=frame(Buffer.concat([Buffer.from(user,'ascii'),payload]));for(const [k,other]of sockets)if(k.startsWith(cid+'/')&&other!==socket){if((c.convoy&&!convoyAllowed(c.convoy,k.split('/')[1]))||(c.crew&&!community().member(c.crew,k.split('/')[1]))){other.destroy();continue;}if(other.writableLength>8192)other.destroy();else other.write(outgoing);}
   }}socket.on('data',data);if(head.length)data(head);
  }catch(e){socket.end('HTTP/1.1 '+(e.status||400)+' Rejected\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');}
 });}
 function disconnect(user){for(const [key,s]of sockets)if(key.endsWith('/'+user))s.destroy();}
 return {handle,attach,disconnect};
}
function frame(payload,opcode=2){let h;if(payload.length<126)h=Buffer.from([128|opcode,payload.length]);else{h=Buffer.alloc(4);h[0]=128|opcode;h[1]=126;h.writeUInt16BE(payload.length,2);}return Buffer.concat([h,payload]);}
