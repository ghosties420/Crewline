import {test} from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {mkdtempSync,readFileSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
const dir=mkdtempSync(join(tmpdir(),'crewline-upgrade11-')),path=join(dir,'db.sqlite'),old=new DatabaseSync(path);old.exec(readFileSync(new URL('./schema-1.0.sql',import.meta.url),'utf8'));
old.prepare("INSERT INTO users(id,name,salt,hash,epoch) VALUES('user1','Original','salt','hash','old-sharing-token')").run();old.prepare("INSERT INTO locations VALUES('user1',-41,174,?)").run(Date.now());
// Exact legacy social shapes, before community columns existed.
old.exec(`CREATE TABLE posts(id INTEGER PRIMARY KEY AUTOINCREMENT,user TEXT REFERENCES users(id) ON DELETE CASCADE,parent INTEGER REFERENCES posts(id) ON DELETE CASCADE,title TEXT,body TEXT,created INTEGER);
CREATE TABLE messages(id INTEGER PRIMARY KEY AUTOINCREMENT,room TEXT NOT NULL,user TEXT REFERENCES users(id) ON DELETE CASCADE,body TEXT,created INTEGER);
CREATE TABLE calls(id TEXT PRIMARY KEY,owner TEXT REFERENCES users(id) ON DELETE CASCADE,kind TEXT,created INTEGER,ended INTEGER);
INSERT INTO posts VALUES(1,'user1',NULL,'Old post','Private text',0);
INSERT INTO messages VALUES(1,'crew','user1','Old chat',0);
INSERT INTO calls VALUES('oldcall','user1','crew',0,NULL);`);old.close();
process.env.DB_PATH=path;process.env.ADMIN_KEY='upgrade11-test-secret-long-enough';process.env.NODE_ENV='test';const {db,server}=await import('../server/server.mjs');
test('v1.1 private content stays scoped; old live location and calls end',()=>{try{const crew=db.prepare('SELECT id FROM crews').get().id;assert.equal(db.prepare('SELECT crew FROM posts').get().crew,crew);assert.equal(db.prepare('SELECT room FROM messages').get().room,'crew:'+crew);assert.equal(db.prepare('SELECT count(*) AS n FROM locations').get().n,0);assert.equal(db.prepare('SELECT epoch FROM users').get().epoch,'');assert.ok(db.prepare('SELECT ended FROM calls').get().ended);assert.equal(db.prepare('SELECT body FROM posts').get().body,'Private text');}finally{server.emit('close');db.close();rmSync(dir,{recursive:true,force:true});}});
