// Server-selected OSRM endpoint. No client-controlled hosts or location persistence.
export function createRouting({bad,point,limit,convoys,fetcher=fetch,base=process.env.ROUTING_URL||'https://routing.openstreetmap.de/routed-car',now=Date.now}){
 let last=-Infinity;
 return async function(path,method,b,user){
  const match=path.match(/^\/convoys\/([a-f0-9]+)\/route$/);if(!match)return;
  if(method!=='POST')bad(405,'Use POST');
  const c=convoys.get(match[1]);if(!convoys.visible(c,user))bad(404,'Convoy unavailable');
  if(!convoys.joined(c.id,user))bad(403,'Join this convoy first');
  point(b);if(b.consent!==true)bad(400,'Confirm sending your location to the routing provider');
  let targets;
  if(b.target==='meeting'){if(c.start_lat==null)bad(400,'Meeting point unavailable');targets=[{lat:c.start_lat,lon:c.start_lon}];}
  else if(b.target==='destination')targets=[{lat:c.lat,lon:c.lon}];
  else if(b.target==='all')targets=[...JSON.parse(c.stops),{lat:c.lat,lon:c.lon}];
  else if(Number.isInteger(b.target)&&b.target>=0&&b.target<JSON.parse(c.stops).length)targets=[JSON.parse(c.stops)[b.target]];
  else bad(400,'Choose a convoy destination');
  limit('route:'+user,6);if(now()-last<1100)bad(429,'Routing busy. Try again in a moment.');last=now();
  const points=[b,...targets].map(p=>`${p.lon.toFixed(6)},${p.lat.toFixed(6)}`).join(';');
  const url=new URL(base.replace(/\/$/,'')+'/route/v1/driving/'+points);url.search='steps=true&overview=full&geometries=geojson';
  let data;try{const r=await fetcher(url,{headers:{'User-Agent':'Crewline/1.7 (private convoy pilot)','Accept':'application/json'},signal:AbortSignal.timeout(6000),redirect:'error'});if(!r.ok)throw Error();const reader=r.body.getReader();let chunks=[],size=0;for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>3000000){await reader.cancel();throw Error();}chunks.push(value);}data=JSON.parse(Buffer.concat(chunks).toString());}catch{bad(503,'Routing unavailable. Check your connection or try again.');}
  const route=data?.routes?.[0];if(data?.code!=='Ok'||!route?.geometry?.coordinates?.length)bad(422,'No driving route found for these pins. Move pins onto an accessible road.');
  return {route,provider:new URL(base).hostname};
 };
}
