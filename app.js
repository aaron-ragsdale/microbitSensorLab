/* micro:bit Sensor Lab — all data stays in this browser.
 * Plotly is loaded from CDN. Web Bluetooth requires Chromium + HTTPS.
 * BLE services are optional: missing channels are reported, not fabricated.
 */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const UUID={
 accelerometer:'e95d0753-251d-470a-a062-fa1922dfa9a8',
 accelerometerData:'e95dca4b-251d-470a-a062-fa1922dfa9a8',
 magnetometer:'e95df2d8-251d-470a-a062-fa1922dfa9a8',
 magnetometerData:'e95dfb11-251d-470a-a062-fa1922dfa9a8',
 compassData:'e95d9715-251d-470a-a062-fa1922dfa9a8',
 temperature:'e95d6100-251d-470a-a062-fa1922dfa9a8',
 temperatureData:'e95d9250-251d-470a-a062-fa1922dfa9a8',
 uart:'6e400001-b5a3-f393-e0a9-e50e24dcca9e',
 uartNotify:'6e400002-b5a3-f393-e0a9-e50e24dcca9e',
 uartWrite:'6e400003-b5a3-f393-e0a9-e50e24dcca9e'
};
const DEF={
 accelerometer:{label:'Accelerometer',unit:'mg',keys:['ax','ay','az','strength'],labels:['X','Y','Z','Strength'],color:'#367ce2'},
 magnetometer:{label:'Magnetometer',unit:'µT',keys:['mx','my','mz'],labels:['X','Y','Z'],color:'#8b70c9'},
 compass:{label:'Compass heading',unit:'°',keys:['heading'],labels:['Heading'],color:'#967eb5'},
 light:{label:'Light level',unit:'0–255',keys:['light'],labels:['Light'],color:'#edb74d'},
 sound:{label:'Sound level',unit:'0–255',keys:['sound'],labels:['Sound'],color:'#d36d91'},
 temperature:{label:'Temperature',unit:'°C',keys:['temp'],labels:['Temperature'],color:'#2ba78a'}
};
const KEYS=Object.values(DEF).flatMap(x=>x.keys);
const SETTINGS={threshold:1200,signal:'az',direction:'rising',cooldown:300,hysteresis:60};
const state={
 mode:'none',device:null,server:null,notifications:[],samples:[],latest:{},lastSeen:{},
 startClock:0,paused:false,pausedAt:0,services:new Set(),demoTimer:null,frameHandle:null,
 recording:false,recordSamples:[],recordStart:0,recordName:'Walking_Trial_01',recordTimer:null,
 savedSamples:[],savedName:'',replaying:false,replayTimer:null,thresholdEvents:[],lastThresholdReset:0,
 plotTouched:false,clickedThreshold:false,axisVisible:{ax:true,ay:true,az:true,strength:false,mx:true,my:true,mz:true},serviceErrors:[],serviceData:new Set(),uartPackets:0,uartBytes:0,uartLast:'',uartSubscribed:false,uartHandshake:'not sent'
};
const MAX_SAMPLES=30000;
const timeNow=()=>performance.now();
function stat(msg){$('connectionText').textContent=msg;}
function stream(msg){$('streamStatus').textContent=msg;}
function setBadge(text,mode=''){$('connectionBadge').textContent=text;$('connectionBadge').className='pill '+mode;}
function number(v,otherwise=0){const n=Number(v);return Number.isFinite(n)?n:otherwise;}
function escapeCsv(value){const text=String(value??'');return /[",\r\n]/.test(text)?'"'+text.replaceAll('"','""')+'"':text;}
function selectedSensors(){return [...document.querySelectorAll('[data-sensor]:checked')].map(el=>el.dataset.sensor);}
function sensorForKey(key){return Object.entries(DEF).find(([,item])=>item.keys.includes(key))?.[0];}
function formatSeconds(ms){const n=Math.max(0,ms/1000);return String(Math.floor(n/60)).padStart(2,'0')+':'+(n%60).toFixed(1).padStart(4,'0');}
function activeData(){return state.mode==='replay'?state.samples:state.samples;}
function updateReady(){
 const ready=state.mode!=='none';
 $('recordBtn').disabled=!ready||state.mode==='replay';
 $('pauseBtn').disabled=!ready;
 $('clearGraphBtn').disabled=!ready||state.mode==='replay';
 $('connectBtn').disabled=state.mode==='bluetooth';
 $('demoBtn').disabled=state.mode==='demo';
 $('disconnectBtn').disabled=!ready;
 $('replayBtn').disabled=!state.savedSamples.length;
 const canExport=state.savedSamples.length>0;
 for(const id of ['pngBtn','csvBtn','bundleBtn'])$(id).disabled=!canExport;
}
function setServiceMessage(){
 const list=[...state.services];
 const receiving=list.filter(k=>state.serviceData.has(k));
 const waiting=list.filter(k=>!state.serviceData.has(k));
 const missing=Object.keys(DEF).filter(k=>!state.services.has(k));
 const parts=[list.length?'Available: '+list.map(k=>DEF[k]?.label||k).join(' · '):'No sensor services detected'];
 if(receiving.length)parts.push('Receiving: '+receiving.map(k=>DEF[k].label).join(' · '));
 if(waiting.length)parts.push('Subscribed, waiting for data: '+waiting.map(k=>DEF[k].label).join(' · '));
 if(missing.length)parts.push('Missing: '+missing.map(k=>DEF[k].label).join(' · '));
 if(state.mode==='bluetooth')parts.push('UART: '+(state.uartSubscribed?'subscribed':'not subscribed')+' · handshake: '+state.uartHandshake+' · '+state.uartPackets+' sensor packets · '+state.uartBytes+' bytes'+(state.uartLast?' · last: '+state.uartLast:''));
 if(state.serviceErrors.length)parts.push('Details: '+state.serviceErrors.join(' | '));
 $('serviceStatus').textContent=parts.join(' — ');
}
function addSample(partial,at){
 if(state.mode==='none')return;
 const stamp=Number.isFinite(at)?at:timeNow()-state.startClock;
 if(!state.startClock&&state.mode!=='replay')state.startClock=timeNow();
 // Compute vector strength (magnitude) from the three acceleration axes in mg.
 // It is derived, not a separate sensor; update only when a full XYZ set exists.
 if(['ax','ay','az'].some(key=>Object.prototype.hasOwnProperty.call(partial,key))){
  const ax=Number.isFinite(partial.ax)?partial.ax:state.latest.ax;
  const ay=Number.isFinite(partial.ay)?partial.ay:state.latest.ay;
  const az=Number.isFinite(partial.az)?partial.az:state.latest.az;
  if([ax,ay,az].every(Number.isFinite)){
   partial.strength=Math.round(Math.hypot(ax,ay,az)*100)/100;
   partial._changed=[...new Set([...(partial._changed||[]),'strength'])];
  }
 }
 Object.assign(state.latest,partial);
 for(const key of Object.keys(partial))state.lastSeen[key]=stamp;
 const sample={time_ms:Math.round(stamp*10)/10,...state.latest};
 let newReceiving=false;
 for(const key of Object.keys(partial))if(KEYS.includes(key)&&Number.isFinite(partial[key])){const sensor=sensorForKey(key);if(!state.serviceData.has(sensor))newReceiving=true;state.serviceData.add(sensor);}
 if(newReceiving&&state.mode==='bluetooth')setServiceMessage();
 // Missing sensor values stay blank rather than pretending older readings arrived simultaneously.
 for(const key of KEYS)if(!(key in partial)&&!(key in state.latest))sample[key]=null;
 state.samples.push(sample);
 if(state.samples.length>MAX_SAMPLES)state.samples.splice(0,state.samples.length-MAX_SAMPLES);
 if(state.recording){state.recordSamples.push({...sample});$('recordSamples').textContent=state.recordSamples.length+' samples';$('recordTime').textContent=formatSeconds(timeNow()-state.recordStart);}
 if(state.samples.length%5===0)renderCount();
}
function mergeView(data){
 // Every sensor notification has its own time. Keep each channel's own samples for charts,
 // rather than drawing horizontal lines through unrelated readings.
 return data;
}
function readingsFor(data,key){
 const samples=data.filter(s=>Number.isFinite(s[key]));
 const xs=[],ys=[];
 // suppress repeated hold values that were caused by other channel events;
 // actual same-value samples for a channel are retained via _changed.
 for(const s of samples){if(s._changed&&s._changed.length&&!s._changed.includes(key))continue;xs.push(s.time_ms/1000);ys.push(s[key]);}
 return {xs,ys};
}
function refreshSignalSelect(){
 const menu=$('signalSelect');const old=menu.value||SETTINGS.signal;
 menu.innerHTML='';
 for(const [group,d] of Object.entries(DEF)){
  const optgroup=document.createElement('optgroup');optgroup.label=d.label;
  for(let i=0;i<d.keys.length;i++){const op=document.createElement('option');op.value=d.keys[i];op.textContent=d.labels[i]+' ('+d.unit+')';optgroup.append(op);}
  menu.append(optgroup);
 }
 menu.value=KEYS.includes(old)?old:'az';
 SETTINGS.signal=menu.value;
 $('thresholdUnit').textContent=DEF[sensorForKey(SETTINGS.signal)]?.unit||'';
}
function thresholds(samples){
 const signal=SETTINGS.signal;
 const {xs,ys}=readingsFor(samples,signal);
 const events=[];
 const level=SETTINGS.threshold,hyst=Math.max(0,SETTINGS.hysteresis),cool=Math.max(0,SETTINGS.cooldown);
 let armed=false,lastEvent=-Infinity;
 for(let i=0;i<ys.length;i++){
  const v=ys[i],t=xs[i]*1000;
  if(t<state.lastThresholdReset)continue;
  if(SETTINGS.direction==='rising'){
   if(v<=level-hyst)armed=true;
   if(armed&&v>=level&&t-lastEvent>=cool){events.push({t:xs[i],value:v});lastEvent=t;armed=false;}
  }else{
   if(v>=level+hyst)armed=true;
   if(armed&&v<=level&&t-lastEvent>=cool){events.push({t:xs[i],value:v});lastEvent=t;armed=false;}
  }
 }
 return events;
}
function renderCount(){
 state.thresholdEvents=thresholds(state.samples);
 $('crossingCount').textContent=state.thresholdEvents.length;
}
function plotHeight(count){return count===1?440:count===2?330:count===3?275:235;}
function defHasAxes(group){return group==='accelerometer'||group==='magnetometer';}
function createPlots(){
 if(!window.Plotly){$('graphStack').textContent='Chart library failed to load. Check your internet connection or browser content blocker.';return;}
 const stack=$('graphStack');stack.innerHTML='';
 const selected=selectedSensors();
 $('emptyGraph').hidden=!!selected.length;
 for(const group of selected){
  const box=document.createElement('div');box.className='sensor-plot';box.dataset.group=group;
  const head=document.createElement('div');head.className='sensor-plot-header';
  const label=document.createElement('strong');label.textContent=DEF[group].label;
  const desc=document.createElement('span');desc.textContent=DEF[group].unit;
  head.append(label,desc);
  if(defHasAxes(group)){
   const axes=document.createElement('div');axes.className='axis-pills';axes.setAttribute('aria-label',DEF[group].label+' visible axes');
   DEF[group].keys.forEach((key,i)=>{
    const b=document.createElement('button');b.type='button';b.className='axis-pill';b.textContent=DEF[group].labels[i];b.dataset.axis=key;
    b.setAttribute('aria-pressed',String(state.axisVisible[key]!==false));
    b.title='Toggle '+DEF[group].labels[i]+'-axis without changing the graph';
    b.onclick=()=>{const next=!(state.axisVisible[key]!==false);state.axisVisible[key]=next;b.setAttribute('aria-pressed',String(next));drawPlots(true);};axes.append(b);
   });head.append(axes);
  }
  const plot=document.createElement('div');plot.className='plot';plot.id='plot-'+group;plot.style.height=plotHeight(selected.length)+'px';
  box.append(head,plot);stack.append(box);
  plot.addEventListener('plotly_click',event=>{
   if(!event.points?.length||!event.event)return;
   const axis=event.points[0].yaxis;const signal=SETTINGS.signal;
   if(sensorForKey(signal)!==group)return;
   const y=number(event.points[0].y,SETTINGS.threshold);
   $('thresholdInput').value=Math.round(y*100)/100;SETTINGS.threshold=y;
   state.clickedThreshold=true;renderCount();drawPlots(true);
  });
 }
 drawPlots();
}
let rendering=false;
async function drawPlots(force=false){
 if(!window.Plotly||rendering)return;
 rendering=true;
 try{
 const source=state.paused&&!force?state.samples.filter(s=>s.time_ms<=state.pausedAt):state.samples;
 const selected=selectedSensors();
 const last=source.length?source[source.length-1].time_ms/1000:0;
 const win=number($('windowSelect').value,20);
 const timeLimit=win>0?[Math.max(0,last-win),Math.max(win,last)]:null;
 for(const group of selected){
  const element=$('plot-'+group);if(!element)continue;
  const def=DEF[group],isThreshold=$('countEnabled').checked&&sensorForKey(SETTINGS.signal)===group;
  const traces=def.keys.filter(key=>state.axisVisible[key]!==false).map((key)=>{
   const i=def.keys.indexOf(key);
   const {xs,ys}=readingsFor(source,key);
   const shade=group==='accelerometer'||group==='magnetometer'?['#367ce2','#ea9b56','#259d88','#a96cce'][i]:def.color;
   if(def.keys.length===1&&xs.length&&source.length){const lastTime=source[source.length-1].time_ms/1000;if(lastTime>xs.at(-1)){xs.push(lastTime);ys.push(ys.at(-1));}}
   return {type:'scattergl',mode:'lines',name:def.labels[i],x:xs,y:ys,line:{color:shade,width:1.9,shape:def.keys.length===1?'hv':'linear'},hovertemplate:'%{x:.2f} s<br>%{y:.2f} '+def.unit+'<extra>%{fullData.name}</extra>'};
  });
  const events=isThreshold?thresholds(source).map(e=>e.t):[];
  const shapes=isThreshold?[{type:'line',xref:'paper',x0:0,x1:1,yref:'y',y0:SETTINGS.threshold,y1:SETTINGS.threshold,line:{color:'#d65760',width:2,dash:'dash'}}]:[];
  const chartHeight=plotHeight(selected.length);
  const layout={
   paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)',
   margin:{l:56,r:14,t:10,b:46},height:chartHeight,
   font:{size:11,color:'#687b95'},showlegend:true,legend:{orientation:'h',y:1.17,x:0,font:{size:10}},
   xaxis:{title:{text:'Time (s)',font:{size:10}},gridcolor:'#ecf0f5',zeroline:false,showspikes:true,spikemode:'across',spikecolor:'#a8b8ca'},
   yaxis:{title:{text:def.unit,font:{size:10}},gridcolor:'#ecf0f5',zeroline:false,autorange: $('autoScale').checked},
   shapes,uirevision:'sensorlab-'+group
  };
  if(timeLimit&&!state.plotTouched)layout.xaxis.range=timeLimit;
  if(!$('autoScale').checked)layout.yaxis.autorange=false;
  // Plotly.react preserves interactive zoom, while the Reset zoom button resets it.
  await Plotly.react(element,traces,layout,{responsive:true,displaylogo:false,scrollZoom:true,modeBarButtonsToRemove:['lasso2d','select2d']});
  if(!element._labEvents){
   element.on('plotly_relayout',e=>{if('xaxis.range[0]' in e||'xaxis.range' in e)state.plotTouched=true;});
   element._labEvents=true;
  }
 }
 }catch(error){stream('Graph error: '+error.message);}
 finally{rendering=false;}
}
function scheduleDraw(){
 if(state.frameHandle)return;
 state.frameHandle=setTimeout(()=>{
  state.frameHandle=null;
  if(!state.paused)drawPlots();
  if(state.mode!=='none')scheduleDraw();
 },200);
}
function clearTimers(){
 if(state.demoTimer){clearInterval(state.demoTimer);state.demoTimer=null;}
 if(state.recordTimer){clearTimeout(state.recordTimer);state.recordTimer=null;}
 if(state.replayTimer){clearInterval(state.replayTimer);state.replayTimer=null;}
}
function resetData(){
 state.samples=[];state.latest={};state.lastSeen={};state.startClock=timeNow();state.lastThresholdReset=0;state.serviceData=new Set();
 state.paused=false;state.plotTouched=false;$('pauseBtn').textContent='Pause view';
 renderCount();drawPlots(true);stream('Ready for new data');
}
function clearGraph(){
 // Clear the live visualization and counter without changing Bluetooth subscription,
 // recording buffers, selected sensors, or threshold settings.
 if(state.mode==='none'||state.mode==='replay')return;
 const oldTime=timeNow()-state.startClock;
 state.samples=[];
 state.latest={};
 state.lastSeen={};
 state.lastThresholdReset=0;
 state.startClock=timeNow();
 state.paused=false;
 state.pausedAt=0;
 state.plotTouched=false;
 $('pauseBtn').textContent='Pause view';
 renderCount();
 // Plotly.react may keep previously selected ranges; redraw the chart containers.
 createPlots();
 stream('Graph cleared · collecting fresh readings');
 if(state.recording)$('recordingStatus').textContent='Graph cleared. Recording continues uninterrupted.';
}
function demo(){
 disconnect(false);
 resetData();
 state.mode='demo';state.services=new Set(Object.keys(DEF));setBadge('Demo data','connected');setServiceMessage();
 stat('Generating realistic-looking sample signals for interface testing. Not real measurements.');
 updateReady();
 let i=0;
 state.demoTimer=setInterval(()=>{
  const t=i*0.08,step=Math.sin(t*2*Math.PI*1.65),burst=Math.pow(Math.max(0,step),5);
  const accel={ax:Math.round(160*Math.sin(t*7.1)+65*Math.sin(t*20)),ay:Math.round(120*Math.cos(t*8.3)),az:Math.round(920+800*burst+70*Math.sin(t*19))};
  const mag={mx:Math.round(25*Math.sin(t/4)),my:Math.round(40*Math.cos(t/4)),mz:Math.round(18+9*Math.sin(t/7))};
  const extras={heading:Math.round((90+30*Math.sin(t/4)+360)%360),light:Math.round(160+75*Math.sin(t/3)),sound:Math.round(20+(i%47===0?190:12*Math.random())),temp:Math.round((23.5+0.8*Math.sin(t/20))*10)/10};
  const combined={...accel,...mag,...extras};
  addSample({...combined,_changed:KEYS.slice()},timeNow()-state.startClock);
  i++;
 },80);
 stream('Demo running · synthetic readings');
 scheduleDraw();
}
async function subscribe(service,uuid,parser,availableLabel){
 const ch=await service.getCharacteristic(uuid);
 const handle=event=>{try{parser(event.target.value);}catch(e){stream('Decode error: '+e.message);}};
 await ch.startNotifications();ch.addEventListener('characteristicvaluechanged',handle);
 state.notifications.push({ch,handle});
 state.services.add(availableLabel);
 try{const value=await ch.readValue();parser(value);}catch(_){}
 return ch;
}
function signedVector(v,keys,scale=1){
 if(v.byteLength<6)return;
 const obj={};keys.forEach((k,i)=>obj[k]=v.getInt16(i*2,true)*scale);
 addSample({...obj,_changed:keys.slice()});
}
let uartBuffer='';
async function connect(){
 if(!navigator.bluetooth){stat('Web Bluetooth is not available. Use Chrome or Edge on a supported device with Bluetooth and HTTPS.');return;}
 disconnect(false);resetData();
 stat('Choose your micro:bit from the Bluetooth picker…');
 try{
 const device=await navigator.bluetooth.requestDevice({filters:[{namePrefix:'BBC micro:bit'}],optionalServices:[UUID.accelerometer,UUID.magnetometer,UUID.temperature,UUID.uart]});
 state.device=device;const server=await device.gatt.connect();state.server=server;state.mode='bluetooth';state.services=new Set();state.serviceErrors=[];state.uartPackets=0;state.uartBytes=0;state.uartLast='';state.uartSubscribed=false;state.uartHandshake='not sent';
 device.addEventListener('gattserverdisconnected',()=>{if(state.mode==='bluetooth')disconnect(true);});
 async function service(name,callback){
  try{const s=await server.getPrimaryService(UUID[name]);await callback(s);}catch(e){const error=name+': '+e.message;state.serviceErrors.push(error);console.info('Sensor Bluetooth error:',error);}
 }
 await service('accelerometer',async s=>subscribe(s,UUID.accelerometerData,v=>signedVector(v,['ax','ay','az']),'accelerometer'));
 await service('magnetometer',async s=>{
  await subscribe(s,UUID.magnetometerData,v=>signedVector(v,['mx','my','mz'],0.1),'magnetometer');
  try{await subscribe(s,UUID.compassData,v=>{if(v.byteLength>=2)addSample({heading:v.getUint16(0,true),_changed:['heading']});},'compass');}catch(e){console.info('Compass bearing unavailable',e.message);}
 });
 await service('temperature',async s=>subscribe(s,UUID.temperatureData,v=>{if(v.byteLength)addSample({temp:v.getInt8(0),_changed:['temp']});},'temperature'));
 await service('uart',async s=>{
  const ch=await s.getCharacteristic(UUID.uartNotify);
  const handle=e=>{
   state.uartBytes+=e.target.value.byteLength;
   if(state.uartBytes<160||state.uartBytes%20===0)setServiceMessage();
   uartBuffer+=new TextDecoder().decode(e.target.value);
   if(uartBuffer.length>300)uartBuffer=uartBuffer.slice(-150);
   let pos;
   while((pos=uartBuffer.indexOf('\n'))>=0){
    const line=uartBuffer.slice(0,pos).trim();uartBuffer=uartBuffer.slice(pos+1);
    const pair=line.split(',');
    const types={
     LS:['light','sound'],M:['mx','my','mz'],A:['ax','ay','az'],
     C:['heading'],T:['temp']
    };
    if(pair[0]==='ACK'){
     state.uartHandshake='acknowledged';state.uartLast=line;setServiceMessage();continue;
    }
    const keys=types[pair[0]];
    if(keys&&pair.length===keys.length+1){
     const values=pair.slice(1).map(Number);
     if(values.every(Number.isFinite)){
      const reading={_changed:keys.slice()};
      keys.forEach((key,i)=>reading[key]=values[i]);
      // If a standard BLE service is active, prefer it over duplicate UART values.
      if(pair[0]!=='A'||!state.services.has('accelerometer')){
       if(pair[0]!=='T'||!state.services.has('temperature')){
        addSample(reading);
       }
      }
      state.uartPackets++;
      state.uartLast=pair[0]+' '+values.join(',');
      for(const key of keys)state.services.add(sensorForKey(key));
      setServiceMessage();
     }
    }
   }
  };
  await ch.startNotifications();ch.addEventListener('characteristicvaluechanged',handle);
  state.uartSubscribed=true;
  state.notifications.push({ch,handle});
  try{
   const write=await s.getCharacteristic(UUID.uartWrite);
   const data=new TextEncoder().encode('START\n');
   await write.writeValue(data);
   state.uartHandshake='START sent';
  }catch(error){
   state.uartHandshake='write failed: '+error.message;
   state.serviceErrors.push('UART START: '+error.message);
  }
  setServiceMessage();
  // UART may exist without delivering LS packets. Mark channels ready only on valid data.
 });
 setServiceMessage();
 setBadge('Connected','connected');
 stat('Connected to '+(device.name||'micro:bit')+'. See Available/Missing services below. Some absent services may require a new HEX.');
 stream('Live Bluetooth · '+state.services.size+' sensor groups');
 updateReady();scheduleDraw();
 if(!state.services.size)stat('Bluetooth connected, but no supported sensor services were found. Flash the firmware in the setup guide.');
 }catch(error){
  if(error.name!=='NotFoundError')stat('Connection failed: '+error.message);
  else stat('Device selection canceled. You can try again.');
  disconnect(false);
 }
}
function disconnect(unexpected=true){
 if(state.recording)finishRecording();
 clearTimers();state.replaying=false;
 for(const n of state.notifications){try{n.ch.removeEventListener('characteristicvaluechanged',n.handle);n.ch.stopNotifications().catch(()=>{});}catch(_){}}
 state.notifications=[];
 if(state.server?.connected)try{state.server.disconnect();}catch(_){}
 state.device=null;state.server=null;state.mode='none';state.services=new Set();state.serviceErrors=[];state.uartSubscribed=false;uartBuffer='';
 setServiceMessage();setBadge('Not connected');updateReady();
 if(unexpected){stat('Micro:bit disconnected. Any completed recording is still available for export.');stream('Disconnected');}
}
function finishRecording(){
 if(!state.recording)return;
 state.recording=false;
 if(state.recordTimer){clearTimeout(state.recordTimer);state.recordTimer=null;}
 state.savedSamples=state.recordSamples.slice();
 state.savedName=state.recordName;
 $('recordBtn').textContent='● Start recording';
 $('recordTime').textContent=formatSeconds(timeNow()-state.recordStart);
 $('recBadge').className='pill';$('recBadge').textContent='Saved locally';
 $('recordingStatus').textContent='Trial captured. Export graph/CSV or start another.';
 updateReady();
 drawPlots(true);
}
function beginRecording(){
 if(state.mode==='none'||state.mode==='replay')return;
 if(state.recording){finishRecording();return;}
 state.recording=true;state.recordSamples=[];
 state.recordName=($('trialName').value.trim()||'Sensor_Trial').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,70);
 state.recordStart=timeNow();
 $('recordBtn').textContent='■ Stop recording';$('recordBtn').disabled=false;
 $('recBadge').textContent='● Recording';$('recBadge').className='pill recording';
 $('recordSamples').textContent='0 samples';$('recordTime').textContent='00:00.0';$('recordingStatus').textContent='Capturing all available sensors…';
 const duration=number($('durationSelect').value);
 if(duration)state.recordTimer=setTimeout(finishRecording,duration*1000);
}
function recordingRows(samples){
 if(!samples.length)return [];
 const t0=samples[0].time_ms;
 return samples.map(s=>({time_ms:Math.round((s.time_ms-t0)*10)/10, ...Object.fromEntries(KEYS.map(key=>[key,s._changed?.includes(key)?s[key]:null]))}));
}
function csvText(samples){
 const cols=['time_ms',...KEYS];
 return [cols.join(','),...recordingRows(samples).map(s=>cols.map(k=>escapeCsv(s[k])).join(','))].join('\r\n');
}
function downloadBlob(blob,filename){
 const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
function exportCsv(){if(!state.savedSamples.length)return;downloadBlob(new Blob([csvText(state.savedSamples)],{type:'text/csv;charset=utf-8'}),state.savedName+'.csv');}
async function exportPng(){
 if(!window.Plotly)throw Error('Plotly is unavailable');
 const groups=selectedSensors();if(!groups.length)throw Error('Select at least one visible sensor first.');
 // Plotly's SVG export scales poorly with webgl. Render a clean static SVG composite
 // using SVG traces for print-quality PNG; overlays all selected panels on white.
 const source=state.savedSamples;
 const full=groups.map(g=>DEF[g]);
 const pWidth=1100,pHeight=groups.length*235+95,plotWidth=1000;
 const nodes=[],colors=['#367ce2','#e9a158','#269b88'];
 nodes.push('<rect width="'+pWidth+'" height="'+pHeight+'" fill="#ffffff"/>');
 nodes.push('<text x="45" y="42" font-family="Arial,sans-serif" font-size="22" font-weight="bold" fill="#24344e">'+xmlSafe(state.savedName)+'</text>');
 nodes.push('<text x="45" y="67" font-family="Arial,sans-serif" font-size="12" fill="#71829b">micro:bit Sensor Lab · recorded sensor data · time in seconds · '+thresholds(source).length+' threshold crossings</text>');
 const start=source[0]?.time_ms||0,end=source[source.length-1]?.time_ms||start+1000,duration=Math.max(1,end-start);
 full.forEach((def,groupIdx)=>{
  const top=90+groupIdx*235;
  nodes.push('<text x="52" y="'+(top+4)+'" font-family="Arial,sans-serif" font-size="15" font-weight="bold" fill="#25344d">'+xmlSafe(def.label)+' ('+xmlSafe(def.unit)+')</text>');
  let vals=def.keys.flatMap(k=>source.filter(s=>!s._changed||s._changed.includes(k)).map(s=>s[k]).filter(Number.isFinite));
  if(def.keys.includes(SETTINGS.signal)&&$('countEnabled').checked)vals.push(SETTINGS.threshold);
  let lo=vals.length?Math.min(...vals):0,hi=vals.length?Math.max(...vals):1;
  if(lo===hi){lo-=1;hi+=1;}const pad=(hi-lo)*.12;lo-=pad;hi+=pad;
  const x=t=>80+(t-start)/duration*plotWidth;
  const y=v=>top+190-(v-lo)/(hi-lo)*158;
  for(let j=0;j<=4;j++){
   const yy=top+32+j*39.5;nodes.push('<line x1="80" x2="1080" y1="'+yy+'" y2="'+yy+'" stroke="#e6edf4"/>');
   nodes.push('<text x="72" y="'+(yy+4)+'" text-anchor="end" font-family="Arial" font-size="10" fill="#8390a1">'+(hi-j*(hi-lo)/4).toFixed(1)+'</text>');
  }
  def.keys.forEach((key,i)=>{
   if(state.axisVisible[key]===false) return;
   const values=source.filter(s=>Number.isFinite(s[key])&&(!s._changed||s._changed.includes(key)));
   if(values.length>1){
    const path=values.map((s,j)=>(j?'L':'M')+x(s.time_ms).toFixed(2)+','+y(s[key]).toFixed(2)).join(' ');
    nodes.push('<path d="'+path+'" fill="none" stroke="'+(groupIdx===0&&def.label==='Accelerometer'||def.label==='Magnetometer'?[...colors,'#a96cce'][i]:def.color)+'" stroke-width="1.6"/>');
   }
   nodes.push('<text x="'+(960+i*39)+'" y="'+(top+5)+'" font-family="Arial" font-size="11" fill="'+(def.label==='Accelerometer'||def.label==='Magnetometer'?[...colors,'#a96cce'][i]:def.color)+'">'+xmlSafe(def.labels[i])+'</text>');
  });
  if(def.keys.includes(SETTINGS.signal)&&$('countEnabled').checked){const yy=y(SETTINGS.threshold);nodes.push('<line x1="80" x2="1080" y1="'+yy+'" y2="'+yy+'" stroke="#d65760" stroke-width="2" stroke-dasharray="8 5"/>');}
  nodes.push('<text x="580" y="'+(top+220)+'" text-anchor="middle" font-family="Arial" font-size="11" fill="#8390a1">Time (s) 0–'+(duration/1000).toFixed(1)+'</text>');
 });
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+pWidth+'" height="'+pHeight+'" viewBox="0 0 '+pWidth+' '+pHeight+'">'+nodes.join('')+'</svg>';
 const img=new Image(),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
 await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});
 const canvas=document.createElement('canvas');canvas.width=pWidth*2;canvas.height=pHeight*2;canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);URL.revokeObjectURL(url);
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
 if(!blob)throw Error('Could not export PNG');
 downloadBlob(blob,state.savedName+'.png');
}
function xmlSafe(value){return String(value).replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
function parseCsv(text){
 const lines=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/);if(lines.length<2)throw Error('No CSV data');
 const columns=lines[0].split(',').map(s=>s.trim());
 if(!columns.includes('time_ms'))throw Error('Expected a time_ms column exported by Sensor Lab');
 const out=[];
 for(let i=1;i<lines.length;i++){
  const cells=lines[i].split(',');const sample={_changed:[]};
  for(let j=0;j<columns.length;j++){
   const key=columns[j];if(key==='time_ms'){sample.time_ms=Number(cells[j]);continue;}
   if(!KEYS.includes(key)||cells[j]===undefined||cells[j]==='')continue;
   const val=Number(cells[j]);if(Number.isFinite(val)){sample[key]=val;sample._changed.push(key);}
  }
  if(Number.isFinite(sample.time_ms))out.push(sample);
 }
 if(!out.length)throw Error('No valid readings');
 return out;
}
async function importCsv(file){
 if(!file)return;try{
  const loaded=parseCsv(await file.text());
  disconnect(false);resetData();
  state.savedSamples=loaded;state.savedName=file.name.replace(/\.csv$/i,'').replace(/[^a-zA-Z0-9_-]/g,'_');
  state.samples=loaded.slice();state.mode='replay';state.paused=true;state.pausedAt=loaded[loaded.length-1].time_ms;
  // Preserve gaps in sensor channels, not replacing missing data with zero.
  state.services=new Set(Object.keys(DEF).filter(g=>DEF[g].keys.some(k=>loaded.some(row=>Number.isFinite(row[k])))));
  setServiceMessage();setBadge('CSV loaded','connected');stat('Loaded '+loaded.length+' timestamped samples for replay and analysis.');
  $('replayStatus').textContent=file.name+' · '+loaded.length+' rows. Adjust thresholds or play the recording.';
  renderCount();updateReady();drawPlots(true);
 }catch(e){$('replayStatus').textContent='Import failed: '+e.message;}
}
function replay(){
 if(!state.savedSamples.length)return;
 if(state.replaying){clearInterval(state.replayTimer);state.replaying=false;$('replayBtn').textContent='Play replay';return;}
 disconnect(false);state.mode='replay';state.replaying=true;
 state.samples=[];state.latest={};state.lastThresholdReset=0;
 let pos=0;const series=state.savedSamples.slice(),t0=series[0].time_ms,begin=timeNow();
 $('replayBtn').textContent='Stop replay';setBadge('Replaying','connected');stat('Playing saved trial; Bluetooth is disconnected.');updateReady();scheduleDraw();
 state.paused=false;state.plotTouched=false;
 state.replayTimer=setInterval(()=>{
  const elapsed=timeNow()-begin;
  while(pos<series.length&&series[pos].time_ms-t0<=elapsed){state.samples.push({...series[pos],time_ms:series[pos].time_ms-t0});pos++;}
  renderCount();
  if(pos===series.length){clearInterval(state.replayTimer);state.replayTimer=null;state.replaying=false;$('replayBtn').textContent='Play replay';stream('Replay complete');}
 },50);
}
function resetCounter(){state.lastThresholdReset=state.samples.length?state.samples[state.samples.length-1].time_ms:0;renderCount();}
function init(){
 refreshSignalSelect();updateReady();createPlots();
 $('connectBtn').onclick=connect;$('demoBtn').onclick=demo;$('disconnectBtn').onclick=()=>{disconnect(true);};
 $('sensorOptions').addEventListener('change',createPlots);
 $('windowSelect').onchange=()=>{state.plotTouched=false;drawPlots(true)};
 $('autoScale').onchange=()=>{state.plotTouched=false;drawPlots(true)};
 $('resetZoomBtn').onclick=()=>{state.plotTouched=false;createPlots();};
 $('clearGraphBtn').onclick=clearGraph;
 $('pauseBtn').onclick=()=>{state.paused=!state.paused;state.pausedAt=state.samples.at(-1)?.time_ms??0;$('pauseBtn').textContent=state.paused?'Resume view':'Pause view';if(!state.paused)drawPlots(true);};
 $('signalSelect').onchange=()=>{
  SETTINGS.signal=$('signalSelect').value;
  const unit=DEF[sensorForKey(SETTINGS.signal)]?.unit||'';$('thresholdUnit').textContent=unit;
  const defaults={ax:300,ay:300,az:1200,mx:20,my:20,mz:20,heading:180,light:128,sound:100,temp:25};
  SETTINGS.threshold=defaults[SETTINGS.signal];$('thresholdInput').value=SETTINGS.threshold;renderCount();drawPlots(true);
 };
 for(const [id,key,asString] of [['thresholdInput','threshold',false],['directionSelect','direction',true],['cooldownInput','cooldown',false],['hysteresisInput','hysteresis',false]]){
  $(id).addEventListener('input',()=>{
   SETTINGS[key]=asString?$(id).value:number($(id).value);renderCount();drawPlots(true);
  });
 }
 $('countEnabled').onchange=()=>drawPlots(true);
 $('resetCounterBtn').onclick=resetCounter;
 $('recordBtn').onclick=beginRecording;
 $('pngBtn').onclick=()=>exportPng().catch(e=>{$('recordingStatus').textContent='PNG export failed: '+e.message;});
 $('csvBtn').onclick=exportCsv;
 $('bundleBtn').onclick=async()=>{exportCsv();try{await exportPng();}catch(e){$('recordingStatus').textContent='PNG export failed: '+e.message;}};
 $('csvFile').onchange=e=>importCsv(e.target.files?.[0]);
 $('replayBtn').onclick=replay;
 $('clearBtn').onclick=()=>{disconnect(false);resetData();state.savedSamples=[];state.savedName='';updateReady();$('replayStatus').textContent='Cleared. Import a CSV or start a new recording.';};
 window.addEventListener('pagehide',()=>{if(state.server?.connected)state.server.disconnect();});
 stream('Ready · connect or try demo');
}
init();
})();