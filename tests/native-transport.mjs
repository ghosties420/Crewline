import {mkdtempSync,readFileSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {execFileSync,spawn} from 'node:child_process';import https from 'node:https';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));const tmp=mkdtempSync(join(tmpdir(),'crewline-tls-'));process.env.DB_PATH=':memory:';process.env.ADMIN_KEY='native-java-test-key-longer-than-32';process.env.NODE_ENV='test';
const {server,comms,db}=await import(root+'/server/server.mjs');await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
async function api(token,path,body){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'X-Admin-Key':process.env.ADMIN_KEY,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return r.json();}
let tls;
try{
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',tmp+'/key.pem','-out',tmp+'/cert.pem','-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost'],{stdio:'pipe'});
 const jdk=process.env.JAVA_HOME?process.env.JAVA_HOME+'/bin/':'';execFileSync(jdk+'keytool',['-importcert','-noprompt','-alias','local','-file',tmp+'/cert.pem','-keystore',tmp+'/trust.p12','-storepass','testpassword'],{stdio:'pipe'});
 execFileSync(jdk+'javac',['-d',tmp,root+'/android/app/src/main/java/nz/crewline/app/VoiceSocket.java',root+'/tests/VoiceSocketCheck.java',root+'/android/app/src/main/java/nz/crewline/app/VoiceCodec.java']);
 const accounts=[];for(const name of ['Alice','Bob']){const invite=(await api('','/invites',{})).code;accounts.push(await api('','/register',{name,password:'private test password',invite}));}
 db.prepare("UPDATE users SET dm_policy='anyone'").run();
 const bob=(await api(accounts[1].token,'/state')).me.id;const call=await api(accounts[0].token,'/calls',{peer:bob});await api(accounts[1].token,'/calls/'+call.id+'/join',{});
 tls=https.createServer({key:readFileSync(tmp+'/key.pem'),cert:readFileSync(tmp+'/cert.pem')});comms.attach(tls);await new Promise(r=>tls.listen(0,'127.0.0.1',r));
 await new Promise((resolve,reject)=>{const p=spawn(jdk+'java',['-Djavax.net.ssl.trustStore='+tmp+'/trust.p12','-Djavax.net.ssl.trustStorePassword=testpassword','-cp',tmp,'nz.crewline.app.VoiceSocketCheck','https://localhost:'+tls.address().port,accounts[0].token,accounts[1].token,call.id],{stdio:'inherit'});p.on('exit',code=>code===0?resolve():reject(Error('Java check failed '+code)));});
}finally{tls?.close();server.close();rmSync(tmp,{recursive:true,force:true});}
