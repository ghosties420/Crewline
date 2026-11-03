/* Pure GPS timing engine: monotonic milliseconds and native Doppler speed (m/s).
 * No location is retained. Distance is speed-integrated, not a surveyed course.
 * Standing starts include the final stationary sample; no one-foot rollout.
 */
(function(root){
 const modes={'0-60':{label:'0–60 km/h',start:0,end:60},'0-100':{label:'0–100 km/h',start:0,end:100},'100-200':{label:'100–200 km/h',start:100,end:200},'quarter':{label:'¼ mile',distance:402.336},'half':{label:'½ mile',distance:804.672},'eighth':{label:'⅛ mile',distance:201.168}};
 function good(s){return s&&['t','speed','accuracy','speedAccuracy','age'].every(k=>Number.isFinite(s[k]))&&s.t>=0&&s.speed>=0&&s.speed<120&&s.accuracy>=0&&s.accuracy<=15&&s.speedAccuracy>=0&&s.speedAccuracy<=1.5&&s.age>=0&&s.age<=1500&&!s.mock;}
 class Timer{
  constructor(mode){if(!Object.hasOwn(modes,mode))throw Error('Unknown timing mode');this.mode=mode;this.spec=modes[mode];this.status='armed';this.message='Hold still for three seconds';this.distance=0;this.samples=0;this.maxGap=0;this.maxAccuracy=0;this.maxSpeedAccuracy=0;}
  cancel(reason){if(['armed','running'].includes(this.status)){this.status='invalid';this.message=reason;}return null;}
  feed(s){
   if(!['armed','running'].includes(this.status))return null;
   if(!good(s))return this.cancel('GPS quality insufficient. Stop safely and retry.');
   const p=this.prev;this.prev=s;
   if(p){const gap=s.t-p.t;if(gap<=0||gap>1500)return this.cancel('GPS readings interrupted');this.maxGap=Math.max(this.maxGap,gap);if(Math.abs(s.speed-p.speed)/(gap/1000)>15)return this.cancel('Implausible speed change');}
   this.samples++;this.maxAccuracy=Math.max(this.maxAccuracy,s.accuracy);this.maxSpeedAccuracy=Math.max(this.maxSpeedAccuracy,s.speedAccuracy);
   if(this.status==='armed'){
    if(this.spec.start>0){this.message='Armed · starts when crossing 100 km/h';if(p&&p.speed<this.spec.start/3.6&&s.speed>=this.spec.start/3.6){this.start=p.t+(s.t-p.t)*(this.spec.start/3.6-p.speed)/(s.speed-p.speed);this.status='running';}}
    else {if(s.speed<=0.5){if(this.still===undefined)this.still=s.t;if(s.t-this.still>=3000)this.ready=true;this.message=this.ready?'Ready · starts automatically on movement':'Hold still for three seconds';}else if(this.ready&&p){this.start=p.t;this.status='running';this.distance=0;}else{this.still=undefined;this.message='Stop safely before arming a standing start';}}
   }
   if(this.status!=='running'||!p)return null;
   if(s.t-this.start>120000)return this.cancel('Run exceeded two minutes');
   const dt=(s.t-p.t)/1000,segment=(s.speed+p.speed)*dt/2,oldDistance=this.distance;this.distance+=segment;
   let finish,finishSpeed;
   if(this.spec.end&&p.speed<this.spec.end/3.6&&s.speed>=this.spec.end/3.6){const f=(this.spec.end/3.6-p.speed)/(s.speed-p.speed);finish=p.t+f*(s.t-p.t);finishSpeed=this.spec.end;}
   if(this.spec.distance&&this.distance>=this.spec.distance){
    // Solve integrated linear speed within the crossing interval (binary search).
    let lo=0,hi=dt;for(let i=0;i<32;i++){let x=(lo+hi)/2;let d=p.speed*x+(s.speed-p.speed)*x*x/(2*dt);if(d<this.spec.distance-oldDistance)lo=x;else hi=x;}
    const x=(lo+hi)/2;finish=p.t+x*1000;finishSpeed=(p.speed+(s.speed-p.speed)*x/dt)*3.6;
   }
   if(finish!==undefined){this.status='finished';this.result={mode:this.mode,elapsedMs:Math.round(finish-this.start),finishKph:Math.round(finishSpeed*10)/10,samples:this.samples,maxGapMs:Math.round(this.maxGap),accuracyM:Math.round(this.maxAccuracy*10)/10,speedAccuracyMps:Math.round(this.maxSpeedAccuracy*10)/10,method:'phone-gps-v1',quality:'Approximate phone GPS · unverified',created:Date.now()};this.message='Saved privately · review when stopped';return this.result;}
   this.message='Timing · hands off';return null;
  }
 }
 root.CrewTiming={Timer,modes,good};if(typeof module!=='undefined')module.exports=root.CrewTiming;
})(globalThis);
