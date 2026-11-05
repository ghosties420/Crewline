// Map controls float above the map. Opening the dropdown never resizes the map.
let mapControls=null;
function setMapFullScreen(enabled){
 document.body.classList.toggle('map-fullscreen',!!enabled);
 const button=mapControls?.full;
 if(button){button.textContent=enabled?'Exit full screen':'Full screen';button.setAttribute('aria-pressed',String(!!enabled));}
 // ResizeObserver also handles rotation, call banners and mobile viewport changes.
 requestAnimationFrame(()=>map?.invalidateSize({pan:true,animate:false}));
}
function cleanMapControls(){
 if(mapControls){mapControls.observer?.disconnect();mapControls=null;}
 document.body.classList.remove('map-fullscreen');
}
function closeMapOverlay(){
 if(!mapControls)return false;
 if(mapControls.menu.open){mapControls.menu.open=false;mapControls.summary.focus();return true;}
 if(document.body.classList.contains('map-fullscreen')){setMapFullScreen(false);mapControls.full.focus();return true;}
 return false;
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.querySelector('dialog[open]')&&closeMapOverlay()){e.preventDefault();e.stopPropagation();}});
function mapShell(explore){
 const p=node('section',undefined,'map-page'),m=node('div');m.id='map';p.setAttribute('aria-label',explore?'Exploration map':'Crew map');p.append(m);
 const toolbar=node('div',undefined,'map-toolbar');
 const full=action('Full screen',()=>setMapFullScreen(!document.body.classList.contains('map-fullscreen')),'secondary');full.id='mapFullscreen';full.setAttribute('aria-pressed','false');
 const menu=node('details',undefined,'map-menu'),summary=node('summary','Map options');summary.setAttribute('aria-controls','mapOptions');
 const tools=node('div',undefined,'map-tools');tools.id='mapOptions';tools.append(node('h2',explore?'Exploration controls':'Map controls'));
 tools.append(node('p',explore?'Your discovery map stays on this phone.':'Long press the map to select a convoy destination.'));
 const share=action(boot.sharing?'Ghost Mode · stop sharing':'Share live location',()=>track(!boot.sharing,boot.exploring));share.id='shareToggle';
 const record=action(boot.exploring?'Stop exploring':'Record exploration',()=>track(boot.sharing,!boot.exploring),'secondary');record.id='exploreToggle';tools.append(explore?record:share);
 if(explore){const stat=node('div',visited.size+' discovered cells','muted');stat.id='explorationCount';tools.append(stat);}
 const status=node('div',boot.status||'Location stopped','muted');status.id='trackingStatus';tools.append(status);
 menu.append(summary,tools);toolbar.append(full,menu);p.append(toolbar);
 const centre=action('Centre on me',async()=>{const target=map,fix=await native('locate');if(map!==target||!target)return;lastFix=[fix.lat,fix.lon];target.setView(lastFix,16);updateMarkers();},'secondary map-centre');p.append(centre);
 $('#main').append(p);mapControls={menu,summary,full,container:p};
 // A tap on the map closes only the options, leaving layer choices intact.
 m.addEventListener('pointerdown',()=>{menu.open=false;});
 return {p,m,tools};
}
function watchMapViewport(){
 if(!mapControls||!map)return;const target=map;
 mapControls.observer=new ResizeObserver(()=>{if(map===target){mapControls.container.style.setProperty("--map-menu-height",Math.max(70,mapControls.container.clientHeight-86)+"px");target.invalidateSize({pan:true,animate:false});}});
 mapControls.observer.observe(mapControls.container);
}
