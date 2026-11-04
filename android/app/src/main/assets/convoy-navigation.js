'use strict';
// Foreground route guidance only. No location is posted to crew sharing.
function convoyNavigation(convoy,dialog,map,area,menu){
 const panel=node('section',undefined,'convoy-directions');panel.hidden=true;panel.setAttribute('aria-label','In-app directions');area.append(panel);
 let locating=false,generation=0,timer=null,line=null,marker=null,route=null,target=null,label='',follow=true,active=false;
 const metres=n=>n>=1000?(n/1000).toFixed(1)+' km':Math.round(n)+' m';
 function instruction(s){const m=s.maneuver||{},road=s.name?' onto '+s.name:'';if(m.type==='arrive')return 'Arrive at waypoint';if(m.type==='depart')return 'Continue'+road;if(['roundabout','rotary'].includes(m.type))return 'At the roundabout'+(m.exit?', take exit '+m.exit:'')+road;return (m.type==='turn'?'Turn':m.type==='merge'?'Merge':m.type==='fork'?'Keep':m.type==='end of road'?'At the end of the road, turn':'Continue')+' '+(m.modifier||'')+road;}
 function stop(){generation++;active=false;clearTimeout(timer);if(line){map.removeLayer(line);line=null;}if(marker){map.removeLayer(marker);marker=null;}panel.hidden=true;route=null;}
 let status,turn,steps;
 function draw(){panel.replaceChildren();const heading=node('strong',label),row=node('div',undefined,'row');row.append(heading,action('Stop directions',stop,'secondary'));status=node('p','Getting your position…','muted');status.setAttribute('role','status');turn=node('p',undefined,'convoy-next-turn');steps=node('details');steps.append(node('summary','All directions · '+metres(route.distance)+' · about '+Math.max(1,Math.round(route.duration/60))+' min'));const list=node('ol');for(const leg of route.legs)for(const s of leg.steps)list.append(node('li',instruction(s)+' · '+metres(s.distance)));steps.append(list);const controls=node('div',undefined,'row');controls.append(action('Follow me',()=>{follow=true;},'secondary'),action('Recalculate route',()=>start(target,label),'secondary'));panel.append(row,turn,status,controls,steps,node('small','Estimated guidance · no live traffic or spoken directions. Keep Crewline open.'));panel.hidden=false;}
 function update(fix){const p=L.latLng(fix.lat,fix.lon);if(!marker)marker=L.marker(p,{icon:icon('me-pin'),title:'Your location'}).addTo(map);else marker.setLatLng(p);if(follow)map.setView(p,16,{animate:false});
  // Project onto the nearest road segment and show the following maneuver.
  const all=route.legs.flatMap(l=>l.steps),scale=Math.cos(fix.lat*Math.PI/180),xy=c=>[(c[0]-fix.lon)*111320*scale,(c[1]-fix.lat)*111320];let best={distance:Infinity};
  all.forEach((s,step)=>{const points=s.geometry?.coordinates||[];let suffix=0;for(let i=points.length-2;i>=0;i--){const a=xy(points[i]),b=xy(points[i+1]),dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,-(a[0]*dx+a[1]*dy)/length)):0,distance=Math.hypot(a[0]+t*dx,a[1]+t*dy);if(distance<best.distance){const remaining=suffix+(1-t)*Math.sqrt(length);best={distance,step,remaining};}suffix+=Math.sqrt(length);}});
  if(best.distance>80){turn.textContent='Off route — recalculate when safe';status.textContent='Your position is away from the planned road. Route has not changed.';return;}
  const next=all[best.step+1]||all[best.step];turn.textContent=metres(best.remaining||0)+' · '+instruction(next);status.textContent='Position updated · '+new Date().toLocaleTimeString();
  const end=route.geometry.coordinates.at(-1);if(p.distanceTo([end[1],end[0]])<25){turn.textContent='Near your destination';status.textContent='Check the final pin and stop safely.';}
 }
 async function poll(seq){if(!active||seq!==generation||document.hidden||!dialog.open)return;if(locating){timer=setTimeout(()=>poll(seq),1000);return;}locating=true;try{const fix=await native('locate');if(seq===generation&&dialog.open&&!document.hidden)update(fix);}catch(e){if(seq===generation){turn.textContent='Waiting for GPS';status.textContent=e.message;}}finally{locating=false;if(active&&seq===generation&&!document.hidden)timer=setTimeout(()=>poll(seq),4000);}}
 async function start(choice,name){if(!convoy.joined)throw Error('Join this convoy first');if(!confirm('Get driving directions inside Crewline? Your current position and chosen convoy pins are sent through your Crewline server to its routing provider (FOSSGIS by default). This does not enable crew location sharing.'))return;
  stop();target=choice;label=name;const seq=generation;menu.open=false;panel.hidden=false;panel.replaceChildren(node('p','Finding your position and driving route…'));
  try{const fix=await native('locate');if(seq!==generation||!dialog.open)return;const data=await api('/convoys/'+convoy.id+'/route','POST',{lat:fix.lat,lon:fix.lon,target:choice,consent:true});if(seq!==generation||!dialog.open)return;route=data.route;line=L.geoJSON(route.geometry,{style:{color:'#f97316',weight:6,opacity:.85}}).addTo(map);map.fitBounds(line.getBounds(),{padding:[45,100]});follow=false;draw();active=true;update(fix);timer=setTimeout(()=>poll(seq),4000);map.attributionControl.addAttribution('Routing: '+data.provider+' / OSRM · <a href="https://www.openstreetmap.org/fixthemap">Fix the map</a>');}
  catch(e){if(seq===generation){panel.replaceChildren(node('p',e.message),action('Close directions',stop,'secondary'));}}
 }
 map.on('dragstart',()=>{follow=false;});
 function visibility(){clearTimeout(timer);if(!document.hidden&&active)poll(generation);else if(active){turn.textContent='Directions paused';status.textContent='Return to Crewline to update your position.';}}
 document.addEventListener('visibilitychange',visibility);dialog.addEventListener('close',()=>{stop();document.removeEventListener('visibilitychange',visibility);},{once:true});
 return {start};
}
