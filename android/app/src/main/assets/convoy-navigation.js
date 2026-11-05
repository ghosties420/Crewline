'use strict';
// Foreground route guidance only. No location is posted to crew sharing.
function convoyNavigation(convoy,dialog,map,area,menu){
 const panel=node('section',undefined,'convoy-directions');panel.hidden=true;panel.setAttribute('aria-label','In-app directions');area.append(panel);
 let generation=0,timer=null,animation=null,session="",lastFix=null,lastReceived=0,lastSample=0,line=null,marker=null,route=null,target=null,label='',follow=true,active=false;
 const metres=n=>n>=1000?(n/1000).toFixed(1)+' km':Math.round(n)+' m';
 function instruction(s){const m=s.maneuver||{},road=s.name?' onto '+s.name:'';if(m.type==='arrive')return 'Arrive at waypoint';if(m.type==='depart')return 'Continue'+road;if(['roundabout','rotary'].includes(m.type))return 'At the roundabout'+(m.exit?', take exit '+m.exit:'')+road;return (m.type==='turn'?'Turn':m.type==='merge'?'Merge':m.type==='fork'?'Keep':m.type==='end of road'?'At the end of the road, turn':'Continue')+' '+(m.modifier||'')+road;}
 function stop(){generation++;active=false;clearInterval(timer);cancelAnimationFrame(animation);native('navigationStop',{session}).catch(()=>{});lastFix=null;if(line){map.removeLayer(line);line=null;}if(marker){map.removeLayer(marker);marker=null;}panel.hidden=true;route=null;}
 let status,turn,steps;
 function draw(){panel.replaceChildren();const heading=node('strong',label),row=node('div',undefined,'row');row.append(heading,action('Stop directions',stop,'secondary'));status=node('p','Getting your position…','muted');status.setAttribute('role','status');turn=node('p',undefined,'convoy-next-turn');steps=node('details');steps.append(node('summary','All directions · '+metres(route.distance)+' · about '+Math.max(1,Math.round(route.duration/60))+' min'));const list=node('ol');for(const leg of route.legs)for(const s of leg.steps)list.append(node('li',instruction(s)+' · '+metres(s.distance)));steps.append(list);const controls=node('div',undefined,'row');controls.append(action('Follow me',()=>{follow=true;if(lastFix)map.setView([lastFix.lat,lastFix.lon],16,{animate:false});},'secondary'),action('Recalculate route',()=>start(target,label),'secondary'));panel.append(row,turn,status,controls,steps,node('small','Estimated guidance · no live traffic or spoken directions. Keep Crewline open.'));panel.hidden=false;}
 function move(fix){const p=L.latLng(fix.lat,fix.lon);cancelAnimationFrame(animation);if(!marker){marker=L.marker(p,{icon:icon('me-pin'),title:'Your location'}).addTo(map);if(follow)map.setView(p,16,{animate:false});return;}
  const from=marker.getLatLng(),begin=performance.now(),duration=300;
  if(from.distanceTo(p)>150){marker.setLatLng(p);if(follow)map.setView(p,map.getZoom(),{animate:false});return;}
  function frame(now){if(!active||document.hidden)return;const t=Math.min(1,(now-begin)/duration),q=L.latLng(from.lat+(p.lat-from.lat)*t,from.lng+(p.lng-from.lng)*t);marker.setLatLng(q);if(follow)map.setView(q,map.getZoom(),{animate:false});if(t<1)animation=requestAnimationFrame(frame);}
  animation=requestAnimationFrame(frame);
 }
 function update(fix){lastFix=fix;lastReceived=performance.now();move(fix);const p=L.latLng(fix.lat,fix.lon);
  // Project onto the nearest road segment and show the following maneuver.
  const all=route.legs.flatMap(l=>l.steps),scale=Math.cos(fix.lat*Math.PI/180),xy=c=>[(c[0]-fix.lon)*111320*scale,(c[1]-fix.lat)*111320];let best={distance:Infinity};
  all.forEach((s,step)=>{const points=s.geometry?.coordinates||[];let suffix=0;for(let i=points.length-2;i>=0;i--){const a=xy(points[i]),b=xy(points[i+1]),dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,-(a[0]*dx+a[1]*dy)/length)):0,distance=Math.hypot(a[0]+t*dx,a[1]+t*dy);if(distance<best.distance){const remaining=suffix+(1-t)*Math.sqrt(length);best={distance,step,remaining};}suffix+=Math.sqrt(length);}});
  if(best.distance>80){turn.textContent='Off route — recalculate when safe';status.textContent='Your position is away from the planned road. Route has not changed.';return;}
  const next=all[best.step+1]||all[best.step];turn.textContent=metres(best.remaining||0)+' · '+instruction(next);status.textContent='Position updated · '+new Date().toLocaleTimeString();
  const end=route.geometry.coordinates.at(-1);if(p.distanceTo([end[1],end[0]])<25){turn.textContent='Near your destination';status.textContent='Check the final pin and stop safely.';}
 }
 function paused(){cancelAnimationFrame(animation);if(active&&turn){turn.textContent='Waiting for fresh GPS';status.textContent='Position is paused. Keep Crewline open with Location enabled.';}}
 function sample(fix){if(!active||!dialog.open||document.hidden||fix.session!==session||!Number.isFinite(fix.lat)||!Number.isFinite(fix.lon)||!Number.isFinite(fix.t)||fix.t<=lastSample||!Number.isFinite(fix.age)||fix.age>3000||fix.age<0||!Number.isFinite(fix.accuracy)||fix.accuracy>50)return;lastSample=fix.t;update(fix);}
 window.navigationSample=sample;window.navigationPaused=paused;
 async function start(choice,name){if(!convoy.joined)throw Error('Join this convoy first');if(!confirm('Get driving directions inside Crewline? Your current position and chosen convoy pins are sent through your Crewline server to its routing provider (FOSSGIS by default). This does not enable crew location sharing.'))return;
  stop();target=choice;label=name;const seq=generation;menu.open=false;panel.hidden=false;panel.replaceChildren(node('p','Finding your position and driving route…'));
  try{const fix=await native('locate');if(seq!==generation||!dialog.open)return;const data=await api('/convoys/'+convoy.id+'/route','POST',{lat:fix.lat,lon:fix.lon,target:choice,consent:true});if(seq!==generation||!dialog.open)return;route=data.route;line=L.geoJSON(route.geometry,{style:{color:'#f97316',weight:6,opacity:.85}}).addTo(map);map.fitBounds(line.getBounds(),{padding:[45,100]});follow=true;draw();active=true;lastSample=0;session=String(Date.now())+':'+seq;update(fix);await native('navigationStart',{session});if(seq!==generation||!dialog.open)return;timer=setInterval(()=>{if(active&&performance.now()-lastReceived>5000)paused();},1000);map.attributionControl.addAttribution('Routing: '+data.provider+' / OSRM · <a href="https://www.openstreetmap.org/fixthemap">Fix the map</a>');}
  catch(e){if(seq===generation){active=false;native('navigationStop',{session}).catch(()=>{});panel.replaceChildren(node('p',e.message),action('Close directions',stop,'secondary'));}}
 }
 map.on('dragstart',()=>{follow=false;});
 function visibility(){if(document.hidden)paused();}
 document.addEventListener('visibilitychange',visibility);dialog.addEventListener('close',()=>{stop();document.removeEventListener('visibilitychange',visibility);if(window.navigationSample===sample)delete window.navigationSample;if(window.navigationPaused===paused)delete window.navigationPaused;},{once:true});
 return {start};
}
