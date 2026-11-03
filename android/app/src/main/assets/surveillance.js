// Viewport grouping keeps several thousand records usable on small phones.
async function loadSurveillance(target,tools){
 const data=await native('surveillanceData');if(map!==target||!tools.isConnected)return;
 const all=data.cameras||[],visible={anpr:!!boot.mapAnpr,cctv:!!boot.mapCctv};const layer=L.layerGroup().addTo(target),canvas=L.canvas({padding:.2});
 const counts={anpr:all.filter(c=>c.type==='anpr').length,cctv:all.filter(c=>c.type==='cctv').length};
 const controls=node('details',undefined,'camera-options');controls.append(node('summary','ANPR & road CCTV layers'));
 const row=node('div',undefined,'row');
 for(const kind of ['anpr','cctv']){const title=kind==='anpr'?'ANPR':'Road CCTV';const b=action('',async()=>{const next=!visible[kind];await native('mapLayer',{layer:kind,enabled:next});visible[kind]=next;boot[kind==='anpr'?'mapAnpr':'mapCctv']=next;b.textContent=(next?'Hide ':'Show ')+title;b.setAttribute('aria-pressed',String(next));draw();},'secondary');b.textContent=(visible[kind]?'Hide ':'Show ')+title;b.setAttribute('aria-pressed',String(visible[kind]));row.append(b);}
 controls.append(row,node('p',counts.anpr+' ANPR · '+counts.cctv+' road CCTV · public records, incomplete.','muted'),node('p','Pins may be old or approximate. Road-address matches do not confirm field of view. These layers do not trigger speed-camera alerts.','muted'));
 controls.append(action('Camera sources & licence',()=>{const d=modal('Camera sources & licence');d.append(node('p',data.credit),node('p',data.warning),node('p','Retrieved '+data.retrieved+'. Per-camera observation dates are unavailable. Agency source dates are listed in the upstream README.'),node('p','Filtered and regrouped for Crewline. '+data.license+' — noncommercial reuse only.'));
 for(const [label,url]of [['Source and agency dates',data.source],['CC BY-NC 4.0 licence',data.licenseUrl]]){const a=node('a',label);a.href=url;d.append(a,node('br'));}d.append(action('Close',()=>d.close(),'secondary'));},'secondary'));
 tools.append(controls);
 function details(c){const d=node('div');d.append(node('strong',(c.type==='anpr'?'ANPR':'Road CCTV')+' · '+c.name),node('div',c.agency+' · '+c.region),node('div',c.basis),node('div','Camera date: '+c.sourceDate),node('div','Collection retrieved: '+data.retrieved),node('small','Source: NZ CCTV Camera Map / Jay J · CC BY-NC 4.0. Unverified, potentially outdated.'));return d;}
 function draw(){if(map!==target)return;layer.clearLayers();const groups=new Map(),bounds=target.getBounds().pad(.1),zoom=target.getZoom();
  for(const c of all){if(!visible[c.type]||!bounds.contains([c.lat,c.lon]))continue;const pt=target.project([c.lat,c.lon],zoom),key=c.type+':'+Math.floor(pt.x/36)+':'+Math.floor(pt.y/36);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(c);}
  for(const group of groups.values()){const c=group[0],lat=group.reduce((n,r)=>n+r.lat,0)/group.length,lon=group.reduce((n,r)=>n+r.lon,0)/group.length;const mark=L.circleMarker([lat,lon],{renderer:canvas,radius:group.length>1?10:7,color:c.type==='anpr'?'#ba9cff':'#58d6df',fillOpacity:.85,weight:2}).addTo(layer);
   if(group.length===1)mark.bindPopup(details(c));else{const box=node('div');box.append(node('strong',group.length+' '+(c.type==='anpr'?'ANPR':'CCTV')+' records here'));box.append(action('Zoom in',()=>target.setView([lat,lon],Math.min(19,zoom+2)),'secondary'));for(const item of group.slice(0,30)){const detail=node('details');detail.append(node('summary',item.name),details(item));box.append(detail);}if(group.length>30)box.append(node('p','Zoom in to separate the remaining records.'));mark.bindPopup(box,{maxHeight:300});}
  }
 }
 target.on('moveend',draw);draw();
}
