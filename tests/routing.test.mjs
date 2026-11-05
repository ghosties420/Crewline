import {test} from 'node:test';import assert from 'node:assert/strict';import {createRouting} from '../server/routing.mjs';
const bad=(status,message)=>{throw Object.assign(Error(message),{status});};
const point=b=>{if(!Number.isFinite(b.lat)||!Number.isFinite(b.lon)||Math.abs(b.lat)>85||Math.abs(b.lon)>180)bad(400,'Invalid coordinates');};
const convoy={id:'abc',lat:-41,lon:175,start_lat:-42,start_lon:174,stops:JSON.stringify([{lat:-40,lon:173}])};
const sample={code:'Ok',routes:[{geometry:{coordinates:[[174,-42],[175,-41]]}}]};
test('routing requires visible convoy membership, consent and valid targets before any upstream request',async()=>{
 let calls=0,visible=true,joined=true,clock=10000,urls=[];const route=createRouting({bad,point,limit:()=>{},convoys:{get:()=>convoy,visible:()=>visible,joined:()=>joined},now:()=>clock,fetcher:async url=>{calls++;urls.push(url.href);return new Response(JSON.stringify(sample));}});
 const b={lat:-43,lon:172,consent:true,target:'all'};const run=body=>route('/convoys/abc/route','POST',body,'u');
 visible=false;await assert.rejects(run(b),{status:404});visible=true;joined=false;await assert.rejects(run(b),{status:403});joined=true;
 for(const body of [{...b,consent:false},{...b,lat:NaN},{...b,target:10},{...b,target:'https://evil.test'}])await assert.rejects(run(body),{status:400});assert.equal(calls,0);
 assert.equal((await run(b)).provider,'routing.openstreetmap.de');assert.ok(urls[0].includes('172.000000,-43.000000;173.000000,-40.000000;175.000000,-41.000000'));await assert.rejects(run(b),{status:429});
 for(const target of ['meeting','destination',0]){clock+=1100;await run({...b,target});}assert.equal(calls,4);
 assert.equal(await route('/state','GET',{},'u'),undefined);
});
test('routing returns useful errors for provider failure and no road route',async()=>{
 for(const [fetcher,status] of [[async()=>{throw Error('offline');},503],[async()=>new Response('{"code":"NoRoute"}'),422]]){
 const route=createRouting({bad,point,limit:()=>{},convoys:{get:()=>convoy,visible:()=>true,joined:()=>true},fetcher});await assert.rejects(route('/convoys/abc/route','POST',{lat:0,lon:0,consent:true,target:'destination'},'u'),{status});
 }
});
