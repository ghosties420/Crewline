'use strict';
const $=id=>document.getElementById(id);
const pending=new Map();let next=0,dashboard=null,metrics=null,screen='overview',signedIn=false;
window.nativeResult=(id,data,error)=>{const p=pending.get(id);if(!p)return;pending.delete(id);error?p.reject(Error(error)):p.resolve(data);};
function native(action,payload={}){return new Promise((resolve,reject)=>{const id=String(++next);pending.set(id,{resolve,reject});Native.request(id,action,JSON.stringify(payload));});}
function el(tag,text,cls){const node=document.createElement(tag);if(text!==undefined&&text!==null)node.textContent=String(text);if(cls)node.className=cls;return node;}
function child(parent,...nodes){nodes.forEach(n=>parent.appendChild(n));return parent;}
function notify(message){$('message').textContent=message;$('message').classList.remove('hidden');setTimeout(()=>$('message').classList.add('hidden'),4500);}
function loginView(server=''){$('signin').classList.remove('hidden');$('app').classList.add('hidden');$('health').className='health unknown';$('health').textContent='Not connected';$('server').value=server;signedIn=false;}
function appView(){$('signin').classList.add('hidden');$('app').classList.remove('hidden');signedIn=true;switchTo('overview');refresh();loadTerminalKey();}
function switchTo(name){screen=name;document.querySelectorAll('.screen').forEach(n=>n.classList.toggle('hidden',n.id!==name));document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));}
const api=(path,method='GET',body)=>native('api',{path,method,body});
async function refresh(){if(!signedIn)return;try{
 const responses=await Promise.all([api('/admin/dashboard'),api('/admin/metrics').catch(e=>({error:e.message}))]);
 dashboard=responses[0];metrics=responses[1];render();$('health').className='health good';$('health').textContent='Server online';
 $('updated').textContent='Updated '+new Date().toLocaleTimeString();
 }catch(e){$('health').className='health bad';$('health').textContent='Connection issue';notify(e.message);
 if(/sign in|staff access|unauthorised|suspended/i.test(e.message))loginView($('server').value);
 }}
function tile(label,value,hint=''){const n=el('div',null,'metric');return child(n,el('small',label),el('strong',value??'—'),el('span',hint,'hint'));}
function renderOverview(){const g=$('metric-grid');g.replaceChildren();
 if(metrics&&!metrics.error){const mb=n=>Number.isFinite(n)?(n/1048576).toFixed(1)+' MB':'—';
  child(g,tile('Connected voices',metrics.voiceConnections),tile('Active calls',metrics.activeCalls),tile('Call participants',metrics.joinedCallParticipants),tile('Live GPS shares',metrics.activeLocations),tile('Active convoys',metrics.activeConvoys),tile('Server process RAM',mb(metrics.memoryRssBytes)),tile('Server process heap',mb(metrics.heapUsedBytes)),tile('Process uptime',Math.floor(metrics.uptimeSeconds/60)+' min'));}
 else child(g,tile('App metrics','Unavailable',metrics?.error||''));
 const c=$('community-grid');c.replaceChildren();if(!dashboard)return;for(const [k,v]of Object.entries(dashboard.counts))c.appendChild(tile(k.replace(/\b\w/g,x=>x.toUpperCase()),v));
}
function buttons(...args){const bar=el('div',null,'actions');for(const [label,handler,style]of args){const b=el('button',label,style||'');b.addEventListener('click',async()=>{b.disabled=true;try{await handler();await refresh();}catch(e){notify(e.message);}finally{b.disabled=false;}});bar.appendChild(b);}return bar;}
function renderUsers(){const root=$('user-list');root.replaceChildren();if(!dashboard)return;
 for(const u of dashboard.users){const card=el('article',null,'person');const title=el('div',null,'row');child(title,el('strong',u.name),el('span',u.site_role+(u.banned?' · suspended':''),'pill'));card.appendChild(title);
  const actions=[];
  actions.push([u.banned?'Unsuspend':'Suspend',async()=>{if(!confirm((u.banned?'Unsuspend ':'Suspend ')+u.name+'?'))return;await api('/admin/users','PUT',{user:u.id,banned:!u.banned});},u.banned?'':'danger-outline']);
  if(dashboard.role==='admin')for(const role of ['user','moderator','admin'])if(role!==u.site_role)actions.push(['Make '+role,async()=>{if(!confirm('Change '+u.name+' to '+role+'?'))return;await api('/admin/users','PUT',{user:u.id,role});}]);
  card.appendChild(buttons(...actions));root.appendChild(card);
 }
}
function renderReports(){const root=$('report-list');root.replaceChildren();if(!dashboard)return;
 if(!dashboard.reports.length){root.appendChild(el('p','No reports have been submitted.'));return;}
 for(const r of dashboard.reports){const card=el('article',null,'report');const title=el('div',null,'row');child(title,el('strong',r.kind+' #'+r.id),el('span',r.status,'pill '+r.status));card.appendChild(title);
  child(card,el('small','Reported by '+(r.reporterName||'Deleted account')+' · '+new Date(r.created).toLocaleString()),el('div',r.reason));
  const actions=[];if(r.status!=='resolved')actions.push(['Resolve',()=>api('/admin/reports','PUT',{id:r.id,status:'resolved'})]);
  if(r.status!=='dismissed')actions.push(['Dismiss',()=>api('/admin/reports','PUT',{id:r.id,status:'dismissed'})]);
  if(r.status!=='open')actions.push(['Reopen',()=>api('/admin/reports','PUT',{id:r.id,status:'open'})]);
  if(['post','message','event','event-message','vehicle','convoy'].includes(r.kind))actions.push(['Review evidence',async()=>{
   if(!confirm('View reported content? This access is recorded in the audit log.'))return;
   const result=await api('/admin/content?kind='+r.kind+'&target='+encodeURIComponent(r.target));
   alert(JSON.stringify(result.content||{},null,2).slice(0,5000));
  }]);
  if(['post','message','event','event-message','vehicle','photo','convoy'].includes(r.kind))actions.push(['Remove content',async()=>{
   if(!confirm('Permanently delete the reported '+r.kind+'? This cannot be undone.'))return;
   await api('/admin/content','DELETE',{kind:r.kind,target:r.target});
  },'danger-outline']);
  card.appendChild(buttons(...actions));root.appendChild(card);
 }
}
function renderOps(){if(!dashboard)return;$('contact').value=dashboard.contact||'';$('signup').textContent=dashboard.signupOpen?'Close registration':'Open registration';
 $('signup').disabled=dashboard.role!=='admin';$('save-contact').disabled=dashboard.role!=='admin';const root=$('audit');root.replaceChildren();
 for(const a of dashboard.audit){root.appendChild(child(el('div',null,'row'),el('span',a.action+' · '+a.target),el('small',new Date(a.created).toLocaleString())));}
}
function render(){renderOverview();renderUsers();renderReports();renderOps();}
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>switchTo(b.dataset.tab)));
$('login-form').addEventListener('submit',async e=>{e.preventDefault();const btn=e.target.querySelector('button');btn.disabled=true;
 try{await native('login',{server:$('server').value,name:$('name').value,password:$('password').value});$('password').value='';appView();}
 catch(error){notify(error.message);}finally{btn.disabled=false;}});
$('refresh').addEventListener('click',refresh);
$('save-contact').addEventListener('click',async()=>{try{await api('/admin/contact','PUT',{contact:$('contact').value});await refresh();notify('Contact updated');}catch(e){notify(e.message);}});
$('signup').addEventListener('click',async()=>{if(!dashboard)return;const open=!dashboard.signupOpen;if(!confirm((open?'Open public':'Close public')+' registration?'))return;
 try{await api('/admin/signup','PUT',{open});await refresh();}catch(e){notify(e.message);}});
async function loadTerminalKey(){try{const s=await native('terminalSetup');$('ssh-public').textContent=s.publicKey;$('ssh-copy-key').disabled=false;
 if(s.connected)$('ssh-status').textContent='Connected';}catch(e){$('ssh-public').textContent=e.message;}}
window.terminalEvent=(kind,message)=>{
 if(kind==='output'){
  const output=$('ssh-output');
  // Drop basic VT/ANSI control sequences for a readable text shell. A full
  // screen buffer is still needed for Vim/top and other cursor-heavy programs.
  const plain=message.replace(/\x1b\][\s\S]*?(?:\x07|\x1b\\)/g,'').replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'').replace(/\r/g,'');
  output.textContent=(output.textContent+plain).slice(-100000);output.scrollTop=output.scrollHeight;
 }else if(kind==='connected'){$('ssh-status').textContent='Connected to '+message;$('ssh-output').textContent='';}
 else if(kind==='closed'){$('ssh-status').textContent='Disconnected';}
 else if(kind==='notice')notify(message);
};
$('ssh-open').addEventListener('click',async()=>{
 const password=$('ssh-password').value;$('ssh-password').value='';$('ssh-status').textContent='Connecting…';
 try{await native('terminalConnect',{host:$('ssh-host').value,user:$('ssh-user').value,port:Number($('ssh-port').value),password});}
 catch(e){$('ssh-status').textContent='Connection failed';notify(e.message);}
});
$('ssh-close').addEventListener('click',async()=>{try{await native('terminalDisconnect');$('ssh-status').textContent='Disconnected';}catch(e){notify(e.message);}});
$('ssh-copy-key').addEventListener('click',async()=>{try{await native('terminalCopyKey');notify('Public key copied');}catch(e){notify(e.message);}});
$('ssh-form').addEventListener('submit',async e=>{e.preventDefault();const input=$('ssh-input').value;$('ssh-input').value='';
 try{await native('terminalSend',{input:input+'\n'});}catch(error){notify(error.message);}});
const controlKeys={interrupt:'\u0003',tab:'\t',up:'\u001b[A',down:'\u001b[B',backspace:'\u007f'};
document.querySelectorAll('[data-key]').forEach(b=>b.addEventListener('click',async()=>{
 try{await native('terminalSend',{input:controlKeys[b.dataset.key]});}catch(e){notify(e.message);}}));
$('ssh-clear').addEventListener('click',()=>$('ssh-output').textContent='');
$('signout').addEventListener('click',async()=>{await native('logout').catch(()=>{});loginView($('server').value);});
native('boot').then(b=>{if(b.signedIn){signedIn=true;$('server').value=b.server;appView();}else loginView(b.server);}).catch(e=>loginView());
setInterval(()=>{if(signedIn)refresh();},15000);
