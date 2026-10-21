/* SKIP — a fictional, authored story. All art and music run locally. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const ui = Object.fromEntries(['stage','world','openingMayaBubble','hud','date','thought','interact','verb','object','highHelp','dialogue','speaker','line','next','choice','choiceTitle','choiceBody','choiceTag','options','phone','phoneTime','phoneName','phoneSub','messages','phoneOptions','curtain','title','pauseScreen','endScreen','support','status','controls','moment','momentContact','momentText','montageMessages','reflection','reflectionText','memoryPhoto','mirrorView','mirrorClose','mirrorLine','supplyView','draft','draftText','phoneThought','pace','deskChoice','deskOptions'].map(id => [id,$(id)]));
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const TAU=Math.PI*2, CANCEL=Symbol('restart');
const storage={get(k,f){try{return localStorage.getItem('skip.v2.'+k)??f;}catch{return f;}},set(k,v){try{localStorage.setItem('skip.v2.'+k,String(v));}catch{}}};
const savedVolume=Number(storage.get('volume','70'));
const settings={volume:Number.isFinite(savedVolume)?clamp(savedVolume,0,100):70,sound:storage.get('sound','on')==='on',motion:storage.get('motion',matchMedia('(prefers-reduced-motion: reduce)').matches?'reduced':'full')};
class Timeline {
  constructor(){this.time=0;this.epoch=0;this.jobs=[];}
  wait(s){return new Promise((resolve,reject)=>this.jobs.push({at:this.time+s,resolve,reject}));}
  update(dt){this.time+=dt;const due=this.jobs.filter(x=>x.at<=this.time);this.jobs=this.jobs.filter(x=>x.at>this.time);for(const x of due)x.resolve();}
  reset(){this.epoch++;for(const x of this.jobs)x.reject(CANCEL);this.jobs=[];this.time=0;}
  async tween(s,fn){const start=this.time;while(this.time-start<s){fn(smooth((this.time-start)/s));await this.wait(1/60);}fn(1);}
}
const clock=new Timeline();
function initial(){return {phase:'title',scene:'party',level:0,paused:false,busy:false,high:null,intensity:0,partyProgress:0,date:'FRIDAY · 21 AUGUST',minutes:23*60+14,player:{x:71,y:218,vx:0,vy:0,angle:0,spin:0,dir:1,walking:false,pose:'stand'},keys:new Set(),target:null,flags:{},threads:{MAYA:[],MUM:[],COURSE:[]},objects:[],sceneAt:0,thoughtUntil:0,caption:'',trails:[],sparks:[],ripples:[],zoneEnergy:[0,0,0,0],zoneCooldown:[0,0,0,0],stepAt:0,ambientAt:0,typing:0,phoneLit:false,photoDown:false,showPill:false,workState:'draft',npcPose:'party',night:0,breath:0,falls:0,fall:null,breakfast:false,cinematic:false,reach:0,call:null,montageSeconds:null,finishSeconds:null,timeOfDay:null,mirrorPulse:0,mirror:false,commonVariant:null,lastProgressAt:0,guidancePhase:'title'};}
let G=initial(), pendingChoice=null, currentLine=null, pendingBeat=null;
let acknowledgementActive=false,pointerActionBlockedUntil=0,stormDepartureActive=false,phoneScrollMode='end';const acknowledgementKeyLocks=new Set();
const dialogueHistory=[];
let momentSerial=0,activeMoment=null,activePhoneBuzz=null;
function phoneBuzzSuppressed(){
  return G.paused||document.visibilityState!=='visible'||!!G.high||G.cinematic||!!currentLine||!!pendingChoice||!!pendingBeat||!ui.phone.hidden||!ui.choice.hidden||!ui.reflection.hidden||!ui.memoryPhoto.hidden||!ui.mirrorView.hidden||!ui.supplyView.hidden||!ui.montageMessages.hidden||['title','complete'].includes(G.phase);
}
function phoneBuzzState(){
  if(!activePhoneBuzz||activePhoneBuzz.epoch!==clock.epoch||phoneBuzzSuppressed())return null;
  const elapsed=activePhoneBuzz.elapsed%3;
  return elapsed<1.4?{...activePhoneBuzz,elapsed}:null;
}
function startPhoneBuzz(token,owner='notification'){
  if(!token)return false;activePhoneBuzz={token,owner,epoch:clock.epoch,elapsed:0};return true;
}
function stopPhoneBuzz(token=null){if(!activePhoneBuzz||token!==null&&activePhoneBuzz.token!==token)return false;activePhoneBuzz=null;return true;}
function updatePhoneBuzz(dt){
  if(!G.phoneLit){stopPhoneBuzz();return;}
  if(phoneBuzzSuppressed())return;
  const opening=openingAttention();
  if(!activePhoneBuzz){
    if(opening&&!opening.windowClosed&&!opening.mumRead&&opening.mumAlertState==='pending')return;
    startPhoneBuzz(++momentSerial,'unread');audio.fx('phone-soft');
  }
  const cycle=Math.floor(activePhoneBuzz.elapsed/3);activePhoneBuzz.elapsed+=dt;
  if(Math.floor(activePhoneBuzz.elapsed/3)>cycle)audio.fx('phone-soft');
}
function momentOwned(token){return !!activeMoment&&activeMoment.token===token&&activeMoment.epoch===clock.epoch;}
function interruptMoment(token,reason='interrupted'){
  if(!momentOwned(token))return false;const previous=activeMoment;activeMoment=null;ui.moment.hidden=true;delete ui.moment.dataset.owner;
  if(previous.onInterrupted)previous.onInterrupted(reason);return true;
}
function finishMoment(token){
  if(!momentOwned(token))return false;const previous=activeMoment;activeMoment=null;ui.moment.hidden=true;delete ui.moment.dataset.owner;
  if(previous.onComplete)previous.onComplete();return true;
}
function claimMoment(owner,contact,text,{onInterrupted=null,onComplete=null}={}){
  if(activeMoment)interruptMoment(activeMoment.token,'replaced');
  const token=++momentSerial;activeMoment={token,owner,epoch:clock.epoch,onInterrupted,onComplete};ui.moment.dataset.owner=owner;ui.momentContact.textContent=contact;ui.momentText.textContent=text;ui.moment.hidden=false;return token;
}
function showTimedMoment(owner,contact,text,seconds,{sound=false,buzz=false,onInterrupted=null,onComplete=null}={}){
  const token=claimMoment(owner,contact,text,{onInterrupted,onComplete});if(sound)audio.fx('phone');if(buzz)startPhoneBuzz(token,owner);later(seconds,()=>finishMoment(token));return token;
}
function clearMoment(reason='cleared'){return activeMoment?interruptMoment(activeMoment.token,reason):false;}
function resetMomentOwnership(){activeMoment=null;activePhoneBuzz=null;momentSerial++;ui.moment.hidden=true;delete ui.moment.dataset.owner;}
function actionPointerBlocked(){return performance.now()<pointerActionBlockedUntil;}
function consumeAcknowledgementPointer(){pointerActionBlockedUntil=performance.now()+240;advanceBeat();}

// Audio is scheduled ahead on the audio clock; UI pause suspends the whole graph.
class Sound {
  constructor(){this.ctx=null;this.nodes=new Set();this.mode='silent';this.beat=0;this.next=0;this.zone=0;this.lastMode='';}
  init(){
    if(this.ctx){if(!G.paused)this.ctx.resume().catch(()=>{});return;}
    try{
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      this.ctx=new AC();const c=this.ctx;
      this.master=c.createGain();this.master.gain.value=settings.sound?1.04*settings.volume/100:0;
      const limit=c.createDynamicsCompressor();limit.threshold.value=-15;limit.knee.value=18;limit.ratio.value=5;limit.attack.value=.006;limit.release.value=.22;
      this.master.connect(limit);limit.connect(c.destination);
      this.music=c.createGain();this.music.gain.value=1.65;this.filter=c.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=1200;this.music.connect(this.filter);this.filter.connect(this.master);
      this.echo=c.createDelay(.8);this.echo.delayTime.value=60/112*.75;this.feedback=c.createGain();this.feedback.gain.value=.28;this.echoGain=c.createGain();this.echoGain.gain.value=.14;this.echo.connect(this.feedback);this.feedback.connect(this.echo);this.echo.connect(this.echoGain);this.echoGain.connect(this.master);
      this.reverb=c.createConvolver();const impulse=c.createBuffer(2,Math.floor(c.sampleRate*1.9),c.sampleRate);let seed=74;
      for(let ch=0;ch<2;ch++){const d=impulse.getChannelData(ch);for(let i=0;i<d.length;i++){seed=(seed*16807)%2147483647;d[i]=(seed/2147483647*2-1)*Math.pow(1-i/d.length,3)*.42;}}
      this.reverb.buffer=impulse;this.wet=c.createGain();this.wet.gain.value=.12;this.reverb.connect(this.wet);this.wet.connect(this.master);
      this.noise=c.createBuffer(1,c.sampleRate,c.sampleRate);const nd=this.noise.getChannelData(0);for(let i=0;i<nd.length;i++){seed=(seed*16807)%2147483647;nd[i]=seed/2147483647*2-1;}
      this.next=c.currentTime+.07;c.resume().catch(()=>{});
    }catch(e){console.warn('Audio unavailable; the story remains playable.',e);this.ctx=null;}
  }
  track(source,cleanup){this.nodes.add(source);source.onended=()=>{this.nodes.delete(source);cleanup();};}
  tone(note,len=.2,vol=.04,type='sine',at,pan=0,wet=false,raw=false){
    if(!this.ctx)return;const c=this.ctx,t=at??c.currentTime,o=c.createOscillator(),g=c.createGain(),p=c.createStereoPanner();
    o.type=type;o.frequency.value=raw?note:440*Math.pow(2,(note-69)/12);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,vol),t+.018);g.gain.exponentialRampToValueAtTime(.0001,t+Math.max(.04,len));p.pan.value=pan;
    o.connect(g);g.connect(p);p.connect(wet?this.music:this.master);if(wet){p.connect(this.echo);p.connect(this.reverb);}o.start(t);o.stop(t+len+.04);this.track(o,()=>{o.disconnect();g.disconnect();p.disconnect();});
  }
  noiseSound(len=.12,vol=.03,freq=1600,at,pan=0){
    if(!this.ctx)return;const c=this.ctx,t=at??c.currentTime,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain(),p=c.createStereoPanner();s.buffer=this.noise;f.type='bandpass';f.frequency.value=freq;f.Q.value=.6;g.gain.setValueAtTime(Math.max(.0002,vol),t);g.gain.exponentialRampToValueAtTime(.0001,t+len);p.pan.value=pan;s.connect(f);f.connect(g);g.connect(p);p.connect(this.master);s.start(t);s.stop(t+len+.01);this.track(s,()=>{s.disconnect();f.disconnect();g.disconnect();p.disconnect();});
  }
  kick(t,v=.16){if(!this.ctx)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.frequency.setValueAtTime(130,t);o.frequency.exponentialRampToValueAtTime(42,t+.12);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+.27);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+.29);this.track(o,()=>{o.disconnect();g.disconnect();});}
  fx(name){if(!this.ctx||G.paused)return;const t=this.ctx.currentTime;
    if(name==='step')this.noiseSound(.055,.012,260,t,G.player.x/480- .5);
    else if(name==='phone'){this.tone(79,.16,.065,'sawtooth',t,0,false,true);this.tone(79,.14,.04,'sawtooth',t+.24,0,false,true);}
    else if(name==='phone-soft'){this.tone(79,.12,.022,'sawtooth',t,0,false,true);this.tone(79,.10,.016,'sawtooth',t+.24,0,false,true);}
    else if(name==='ring'){this.tone(76,.28,.04,'sine',t);this.tone(81,.36,.03,'sine',t+.31);}
    else if(name==='send'){this.tone(76,.14,.035,'sine',t);this.tone(81,.2,.025,'sine',t+.075);}
    else if(name==='land'){this.noiseSound(.17,.1,180);this.tone(48,.18,.075,'sine',t,0,false,true);}
    else if(name==='type')this.noiseSound(.025,.013,2100);
    else if(name==='door'){this.noiseSound(.2,.05,420);this.tone(120,.1,.018,'triangle',t,0,false,true);}
    else if(name==='use')this.noiseSound(.22,.035,1900);
    else if(name==='dry')this.noiseSound(.055,.022,1450,t);
    else if(name==='camera'){this.noiseSound(.085,.05,3200,t);this.tone(84,.07,.018,'triangle',t+.025,0,false,true);}
    else if(name==='paper')this.noiseSound(.18,.018,850,t);
    else this.tone(69,.055,.018,'triangle');
  }
  dialogueBlip(who,index){if(!this.ctx||G.paused||!settings.sound)return;this.tone((who==='YOU'?60:65)+(index%3),.042,.011,'sine');}
  sensation(i,amount=1){if(!this.ctx)return;const t=this.ctx.currentTime;this.tone([62,78,81,85][i],.9,.045*amount,'sine',t,(i-1.5)/2,true);this.tone([50,66,69,73][i],.4,.03*amount,'triangle',t,0,true);if(i===0)this.kick(t,.09*amount);}
  setMode(mode){if(mode===this.mode)return;this.mode=mode;this.beat=0;if(this.ctx)this.next=this.ctx.currentTime+.06;}
  update(){if(!this.ctx||G.paused)return;const c=this.ctx,now=c.currentTime,h=G.high;
    this.master.gain.setTargetAtTime(settings.sound?(G.flags.escapeFocus?.78:1.04)*settings.volume/100:0,now,.03);
    this.filter.frequency.setTargetAtTime(h?mix(1100,8500,G.intensity):950,now,.12);
    this.echoGain.gain.setTargetAtTime(h?.17*G.intensity:.025,now,.3);this.wet.gain.setTargetAtTime(h?.24*G.intensity:.025,now,.3);
    if(this.mode==='silent'){this.next=now+.08;return;}
    if(this.next<now-.2)this.next=now+.04;
    while(this.next<now+.14){this.play(this.next);this.next+=60/(h?112:86)/4;this.beat++;}
  }
  play(t){const n=this.beat,h=G.high,a=G.intensity;
    if(h){
      const elapsed=clock.time-h.start,build=clamp(elapsed/10),full=h.number<3,late=h.number>=4;
      const v=a*(late?.52:1),chord=Math.floor(n/32)%4,roots=[50,47,43,45],r=roots[chord];
      const gap=h.number===3&&n%64>=42&&n%64<49;if(gap)return;
      if(n%8===0)this.tone(r-12,.42,.09*v,'triangle',t,0,true);
      const drums=h.regions.has(0)||build>.5,melodyOn=h.regions.has(1)||build>.8,shimmer=h.regions.has(2)||h.regions.has(3)||elapsed>12;
      if(n%4===0&&drums&&!late)this.kick(t,.15*v);
      if(n%8===4&&drums&&!late)this.noiseSound(.14,.095*v,2300,t);
      if(n%2===0&&drums&&!late)this.noiseSound(.035,.021*v,7200,t,Math.sin(n)*.6);
      if(n%16===0){for(const [j,interval] of [0,7,11,14].entries())this.tone(r+12+interval,2.2,.014*v,'sine',t,j/3-.5,true);}
      const melody=[74,78,81,85,83,81,78,76,74,73,69,71,73,76,78,81];
      if(n%2===0&&melodyOn&&!late)this.tone(melody[Math.floor(n/2)%16],.36,.036*v,'triangle',t,Math.sin(n*.4)*.45,true);
      if(n%4===1&&shimmer&&full)this.tone([86,90,93,88][Math.floor(n/4)%4],.29,.018*v,'sine',t,Math.cos(n)*.7,true);
      if(late&&n===8)this.tone(78,.7,.03,'sine',t,0,true);
    }else if(this.mode==='party'){
      const quiet=1-G.partyProgress;
      if(n%8===0)this.tone([35,38,31,33][Math.floor(n/32)%4],.5,.045*quiet,'triangle',t,0,true);
      if(n%8===0)this.kick(t,.043*quiet);
      if(n%8===4)this.noiseSound(.08,.022*quiet,900,t);
      if(n%4===2)this.tone([62,66,69,61,62,57,59,61][Math.floor(n/4)%8],.24,.013*quiet,'triangle',t,-.25,true);
      if(n%32===20){this.noiseSound(.7,.016*quiet,1200,t,.6);this.tone(220,.19,.008*quiet,'triangle',t+.1,.6,false,true);this.tone(270,.12,.007*quiet,'triangle',t+.3,.6,false,true);}
    }else if(this.mode==='room'&&n%32===0){this.tone(54,5.8,.030,'sine',t,0,false,true);this.tone(108,5.8,.024,'sine',t,-.2,false,true);this.tone(162,5.2,.012,'sine',t,.2,false,true);this.noiseSound(4.8,.024,300,t,-.5);}
  }
  pause(on){if(!this.ctx)return;(on?this.ctx.suspend():this.ctx.resume()).catch(()=>{});}
  reset(){for(const n of this.nodes){try{n.stop();}catch{}}this.nodes.clear();this.mode='silent';this.beat=0;if(this.ctx){this.next=this.ctx.currentTime+.06;this.pause(false);}}
}
const audio=new Sound();

function formatTime(minutes=G.minutes){let m=((Math.floor(minutes)%1440)+1440)%1440,h=Math.floor(m/60);return `${h%12||12}:${String(m%60).padStart(2,'0')} ${h>=12?'PM':'AM'}`;}
function timeOfDayFor(minutes=G.minutes){const m=((Math.floor(minutes)%1440)+1440)%1440;if(m>=5*60&&m<10*60)return 'morning';if(m>=10*60&&m<17*60)return 'afternoon';if(m>=17*60&&m<20*60)return 'evening';return 'night';}
function currentTimeOfDay(){return G.timeOfDay||timeOfDayFor();}
function stamp(){return `${G.date}\n${formatTime()}`;}
function messageStamp(){const day=G.date.split(' · ').at(-1).replace('AUGUST','AUG').replace('SEPTEMBER','SEP').replace('OCTOBER','OCT').replace('NOVEMBER','NOV').replace('DECEMBER','DEC');return `${day} · ${formatTime()}`;}
function markProgress(){G.lastProgressAt=clock.time;G.guidancePhase=G.phase;ui.interact?.classList.remove('idle-guidance');}
function guidanceCandidateIds(){
  const p=G.phase;
  if(p==='party')return [G.flags.bonded?'rex':'maya'];
  if(p==='after')return [G.flags.afterTalk?'door':'maya'];
  if(p==='room1'){
    if(!G.flags.firstPriority)return ['work','phone'];
    if(G.flags.firstPriority==='work'&&!G.flags.room1MayaAttempted)return ['phone'];
    return ['work'];
  }
  if(p==='room2'||p==='room3'||p==='room2after'||p==='room3after')return ['phone'];
  if(p==='room1after')return ['work'];
  if(p==='emptycheck')return ['drug'];
  if(p==='realisation')return ['phone'];
  if(p==='courseworkrealisation')return ['work'];
  if(p==='mirrorwalk'||p==='mirror')return ['mirror'];
  if(p==='finalphoto')return ['photo'];
  if(p==='postcycle'||p==='posthall')return ['door'];
  if(p==='empty')return ['sofa'];
  return [];
}
function guidanceSuppressed(){
  return G.paused||G.busy||G.cinematic||!!G.high||!!currentLine||!!pendingChoice||!!pendingBeat||['title','complete','ending','montage','escapebreak'].includes(G.phase)||!ui.dialogue.hidden||!ui.choice.hidden||!ui.phone.hidden||!ui.deskChoice.hidden||!ui.reflection.hidden||!ui.memoryPhoto.hidden||!ui.mirrorView.hidden||!ui.supplyView.hidden;
}
function idleGuidanceTarget(){
  if(guidanceSuppressed()||clock.time-G.lastProgressAt<.8)return null;
  const ids=guidanceCandidateIds(),fallback={mirror:{id:'mirror',x:106,y:91}};
  const candidates=ids.map(id=>G.objects.find(o=>o.id===id)||fallback[id]).filter(Boolean);
  if(!candidates.length)return null;
  return candidates.reduce((best,o)=>Math.abs(o.x-G.player.x)<Math.abs(best.x-G.player.x)?o:best,candidates[0]);
}
function setScene(phase,scene,level,date,minutes,timeOfDay=null){cancelVisualEffects();setEscapeFocus(false);G.phase=phase;G.scene=scene;G.level=level;G.date=date;G.minutes=minutes;G.timeOfDay=timeOfDay;if(scene!=='party')G.commonVariant=null;G.sceneAt=clock.time;G.target=null;G.player.pose='stand';G.player.walking=false;G.player.y=218;G.player.vx=G.player.vy=G.player.angle=G.player.spin=0;G.player.stumbleUntil=0;G.player.restUntil=0;G.player.walkDistance=0;G.trails=[];G.objects=[];G.high=null;G.intensity=0;clearThought();ui.stage.dataset.phase=phase;ui.stage.dataset.tod=currentTimeOfDay();ui.status.textContent=`${scene==='bedroom'?'Your room':scene==='party'?'The common room':'The hallway'}. ${date}. ${formatTime()}. ${currentTimeOfDay()}.`;markProgress();}
function setStoryClock(minutes,timeOfDay=null,date=null){if(date)G.date=date;G.minutes=minutes;G.timeOfDay=timeOfDay||timeOfDayFor(minutes);ui.stage.dataset.tod=currentTimeOfDay();if(!ui.phone.hidden)ui.phoneTime.textContent=formatTime();}
function thought(text,seconds=4.5){ui.thought.hidden=false;ui.thought.dataset.kind=/^(E —|REX:)/.test(text)?'cue':'thought';ui.thought.replaceChildren();const span=document.createElement('span');span.textContent=text;ui.thought.append(span);ui.thought.classList.add('visible');G.thoughtUntil=clock.time+seconds;}
function clearThought(){ui.thought.hidden=true;ui.thought.classList.remove('visible');G.thoughtUntil=0;}
async function fade(to,duration=.55){const from=Number(ui.curtain.style.opacity)||0;await clock.tween(duration,t=>ui.curtain.style.opacity=mix(from,to,t));}
async function run(fn){if(G.busy||G.paused)return;G.busy=true;G.target=null;G.keys.clear();ui.interact.hidden=true;const epoch=clock.epoch;try{await fn();}catch(e){if(e!==CANCEL){console.error(e);thought('Something interrupted this moment. Pause to restart.',8);}}finally{if(epoch===clock.epoch){G.busy=false;G.keys.clear();markProgress();refreshObjects();}}}
function later(seconds,fn){const epoch=clock.epoch;clock.wait(seconds).then(()=>{if(epoch===clock.epoch)fn();}).catch(()=>{});}
async function say(lines,{gentle=false}={}){clearThought();for(const entry of lines){const [who,text]=entry;ui.dialogue.hidden=false;ui.speaker.textContent=who;ui.line.textContent='';dialogueHistory.push({who,text});if(dialogueHistory.length>30)dialogueHistory.shift();await new Promise((resolve,reject)=>{currentLine={text,who,shown:0,lastBlip:0,readyAt:null,at:clock.time,resolve,reject};});}if(gentle)await clock.tween(.35,t=>ui.dialogue.style.opacity=1-t);ui.dialogue.hidden=true;ui.dialogue.style.opacity='';ui.stage.focus({preventScroll:true});}
function advance(){if(G.paused||!currentLine)return;markProgress();const l=currentLine;if(l.shown<l.text.length){l.shown=l.text.length;l.readyAt=clock.time;ui.line.textContent=l.text;return;}if(l.readyAt===null||clock.time-l.readyAt<.3)return;currentLine=null;l.resolve();}
function setEscapeFocus(on){G.flags.escapeFocus=!!on;if(on)ui.stage.dataset.escapeFocus='true';else delete ui.stage.dataset.escapeFocus;}
function bindEscapeFocus(button){
  const sync=()=>setEscapeFocus(!G.paused&&!button.disabled&&button.isConnected&&!!button.getClientRects().length&&(button.matches(':hover')||button.matches(':focus-visible')));
  button.onfocus=sync;button.onblur=sync;button.onmouseenter=sync;button.onmouseleave=sync;
}
function setEscapeButtonContent(button){button.replaceChildren();const main=document.createElement('span');main.className='escape-main';main.textContent='ESCAPE';const key=document.createElement('span');key.className='escape-space';key.textContent='SPACE';key.setAttribute('aria-hidden','true');button.append(main,key);}
function mountEscapeKey(container,button){const wrap=document.createElement('div');wrap.className='escape-key-wrap';wrap.append(button);container.append(wrap);return wrap;}
function escapeKeyHint(button){return button.querySelector('.escape-space');}
function makeButtons(container,options,close){container.replaceChildren();const focusIndex=options.findIndex(o=>o.id==='leave');return new Promise((resolve,reject)=>{pendingChoice={reject};for(const [index,opt] of options.entries()){const b=document.createElement('button');const escape=opt.id==='escape',deadEscape=opt.id==='escape-disabled';if(deadEscape)b.innerHTML='ESCAPE<small>unavailable</small>';else if(escape)setEscapeButtonContent(b);else b.textContent=opt.label;b.dataset.action=opt.id;if(opt.primary)b.classList.add('primary');if(opt.id==='call')b.classList.add('connection-option');if(escape)b.classList.add('escape-option');if(deadEscape){b.classList.add('escape-unavailable');if(G.flags.escapeUnavailableRevealed)b.classList.add('escape-revealed');}if(opt.id==='skip')b.classList.add('skip-option');if(opt.disabled||deadEscape){b.disabled=true;b.setAttribute('aria-disabled','true');}if(escape)bindEscapeFocus(b);if(!b.disabled)b.onclick=()=>{if(G.paused||actionPointerBlocked())return;markProgress();setEscapeFocus(false);audio.fx('select');pendingChoice=null;close();resolve(opt.id);};if(escape)mountEscapeKey(container,b);else container.append(b);if(!b.disabled&&index===(focusIndex<0?0:focusIndex))queueMicrotask(()=>{b.focus({preventScroll:true});if(container===ui.phoneOptions&&phoneScrollMode==='end')ui.messages.scrollTop=ui.messages.scrollHeight;});}});}
async function choose(title,body,options,tag=''){clearThought();ui.choiceTitle.textContent=title;ui.choiceBody.textContent=body;ui.choiceTag.textContent=tag;ui.choice.hidden=false;return makeButtons(ui.options,options,()=>{ui.choice.hidden=true;ui.stage.focus({preventScroll:true});});}
function mayaInCurrentRoom(){
  return (G.scene==='party'&&G.commonVariant!=='empty'&&['party','high1','after'].includes(G.phase))||(G.scene==='hallway'&&G.phase==='hall');
}
function notifyMessage(contact,text,label,seconds=4.5){
  if(contact==='MAYA'&&mayaInCurrentRoom())return false;
  G.phoneLit=true;showTimedMoment('notification:'+contact,label,text,seconds,{sound:true,buzz:true});return true;
}
function message(contact,text,date,sent=false,id=''){const row={text,date,sent,id:id||''};G.threads[contact].push(row);return row;}
function renderMessages(contact,{scroll=phoneScrollMode}={}){ui.messages.replaceChildren();for(const m of G.threads[contact]){const wrap=document.createElement('div');wrap.className='message'+(m.sent?' sent':'')+(contact==='COURSE'&&m.text.startsWith('SUBMISSION CLOSED')?' submission-closed':'');if(m.id)wrap.dataset.messageId=m.id;const label=document.createElement('small');label.textContent=(m.sent?'YOU · ':'')+m.date;const p=document.createElement('p');p.textContent=m.text;wrap.append(label,p);ui.messages.append(wrap);}ui.messages.scrollTop=scroll==='start'?0:ui.messages.scrollHeight;}
function openPhone(contact,sub='',{scroll='end'}={}){stopPhoneBuzz();clearThought();phoneScrollMode=scroll;ui.phone.dataset.contact=contact;if(G.phase==='room3'&&contact==='MUM')G.flags.mumRead3=true;ui.draft.hidden=true;ui.phoneThought.textContent='';ui.phone.hidden=false;ui.phoneName.textContent=contact==='COURSE'?'COURSE PORTAL':contact;ui.phoneSub.textContent=sub;ui.phoneTime.textContent=formatTime();renderMessages(contact,{scroll});ui.phoneOptions.replaceChildren();G.phoneLit=false;}
function closePhone(){setEscapeFocus(false);phoneScrollMode='end';ui.draft.hidden=true;ui.phoneThought.textContent='';ui.phone.hidden=true;ui.phoneOptions.replaceChildren();ui.stage.focus({preventScroll:true});}
function phoneChoice(options){return makeButtons(ui.phoneOptions,options,()=>{ui.phoneOptions.replaceChildren();ui.stage.focus({preventScroll:true});});}
async function phoneEscapeChoice(normal=[],pressure='middle'){
  ui.stage.dataset.escapePrompt='true';ui.stage.dataset.escapePressure=pressure;
  const result=await phoneChoice([...normal,{id:'escape',label:'ESCAPE'}]);
  delete ui.stage.dataset.escapePrompt;delete ui.stage.dataset.escapePressure;setEscapeFocus(false);return result;
}
async function send(contact,text,date=messageStamp()){message(contact,text,date,true);renderMessages(contact);audio.fx('send');await clock.wait(1.4);}
// Readable, cancellable pacing gates. Held keys cannot spill into the next beat.
function advanceBeat(){if(G.paused||!pendingBeat)return;markProgress();if(acknowledgementActive)pointerActionBlockedUntil=performance.now()+240;const beat=pendingBeat;pendingBeat=null;ui.pace.hidden=true;beat.resolve();}
function waitBeat(){ui.pace.hidden=false;ui.stage.focus({preventScroll:true});return new Promise((resolve,reject)=>{pendingBeat={resolve,reject};});}
async function acknowledgedMoment(contact,text){
  const token=claimMoment('acknowledged',contact,text);ui.moment.classList.add('awaiting-ack');ui.pace.classList.add('ack-pace');acknowledgementActive=true;
  const acknowledge=e=>{if(e){e.preventDefault();e.stopPropagation();}consumeAcknowledgementPointer();};ui.moment.addEventListener('pointerup',acknowledge);
  try{await waitBeat();}finally{acknowledgementActive=false;ui.moment.removeEventListener('pointerup',acknowledge);ui.moment.classList.remove('awaiting-ack');ui.pace.classList.remove('ack-pace');finishMoment(token);}
}
async function waitForPhoneReadingAck(){
  const epoch=clock.epoch,wasCinematic=G.cinematic;G.cinematic=true;G.keys.clear();G.target=null;acknowledgementActive=true;ui.phone.classList.add('awaiting-read');ui.pace.hidden=true;
  const button=document.createElement('button');button.type='button';button.className='reading-continue';button.textContent='CONTINUE · SPACE / ENTER / E';button.setAttribute('aria-label','Continue. Space, Enter, or E also works.');
  const acknowledge=e=>{if(e){e.preventDefault();e.stopPropagation();}consumeAcknowledgementPointer();};button.addEventListener('pointerup',acknowledge);ui.phoneOptions.replaceChildren(button);queueMicrotask(()=>{button.focus({preventScroll:true});if(phoneScrollMode==='end')ui.messages.scrollTop=ui.messages.scrollHeight;});
  try{await new Promise((resolve,reject)=>{pendingBeat={resolve,reject};});}finally{button.removeEventListener('pointerup',acknowledge);ui.phoneOptions.replaceChildren();acknowledgementActive=false;ui.phone.classList.remove('awaiting-read');if(clock.epoch===epoch){G.cinematic=wasCinematic;G.keys.clear();ui.stage.focus({preventScroll:true});}}
}
function phoneThought(text){ui.phoneThought.textContent=text;if(phoneScrollMode==='end')ui.messages.scrollTop=ui.messages.scrollHeight;}
async function typeDraft(text){ui.draft.hidden=false;ui.draftText.textContent='';if(phoneScrollMode==='end')ui.messages.scrollTop=ui.messages.scrollHeight;for(let i=1;i<=text.length;i++){ui.draftText.textContent=text.slice(0,i);audio.fx('type');await clock.wait(.065);} }
async function deleteDraft(){const text=ui.draftText.textContent;for(let i=text.length;i>=0;i--){ui.draftText.textContent=text.slice(0,i);await clock.wait(.035);} }
async function typeHumanAppend(text){
  for(let i=0;i<text.length;i++){ui.draftText.textContent+=text[i];if(i%2===0)audio.fx('type');const variable=.038+((i*7+text.charCodeAt(i))%6)*.005;await clock.wait(variable+(text[i]==='.'?.045:0));}
}
async function deleteDraftChars(count){for(let i=0;i<count;i++){ui.draftText.textContent=ui.draftText.textContent.slice(0,-1);if(i%3===0)audio.fx('type');await clock.wait(.032+((i*5)%4)*.004);}}
const FINAL_MAYA_MESSAGE='i started taking pills that night at the party. i kept taking them. i’ve told my mum. she’s coming over. can we talk?';
async function typeHonestMayaDraft(){
  ui.draft.hidden=false;ui.draftText.textContent='';phoneThought('');
  await typeHumanAppend('i started taking pills that night at the party.');await clock.wait(.34);
  await typeHumanAppend(' i kept taking them.');await clock.wait(.42);
  await typeHumanAppend(' i’ve told my mum.');await clock.wait(.28);
  const rethink=' she knows.';await typeHumanAppend(rethink);await clock.wait(.28);await deleteDraftChars(rethink.length);await clock.wait(.18);
  await typeHumanAppend(' she’s coming over.');await clock.wait(.24);await typeHumanAppend(' can we talk?');
  ui.draftText.textContent=FINAL_MAYA_MESSAGE;phoneThought('READY TO SEND');
}
async function draftMoment(kind){
  const key='typed_'+kind;if(G.flags[key])return;G.flags[key]=true;
  const lines=kind==='maya1'?[['hey sorry ive been—',''],['i didnt mean to—','what am i even supposed to say?']]:kind==='maya2'?[['yeah we should—',''],['sorry ive just—','She kept making room for me. I kept leaving her waiting.']]:[['sorry mum',''],['ive just been busy','I’ve used “busy” before. She knows something’s wrong.']];
  for(const [text,thoughtLine] of lines){phoneThought('');await typeDraft(text);await clock.wait(.35);if(thoughtLine)phoneThought(thoughtLine);await waitForPhoneReadingAck();await deleteDraft();}
}
async function skipChoice(title,body=''){
  clearThought();G.flags.skipPrompt=true;ui.stage.dataset.skip='true';
  ui.choiceTitle.textContent=title;ui.choiceBody.textContent=body;ui.choiceTag.textContent='NOT RIGHT NOW';ui.choice.hidden=false;
  const result=await makeButtons(ui.options,[{id:'skip',label:'SKIP FOR NOW',primary:true}],()=>{ui.choice.hidden=true;delete ui.stage.dataset.skip;G.flags.skipPrompt=false;ui.stage.focus({preventScroll:true});});
  return result;
}
async function escapeChoice(title,body='',normal=[],pressure='middle'){
  clearThought();ui.stage.dataset.escapePrompt='true';ui.stage.dataset.escapePressure=pressure;ui.choiceTitle.textContent=title;ui.choiceBody.textContent=body;ui.choiceTag.textContent='AN EASIER WAY OUT';ui.choice.hidden=false;
  const options=[...normal,{id:'escape',label:'ESCAPE'}];
  return makeButtons(ui.options,options,()=>{ui.choice.hidden=true;delete ui.stage.dataset.escapePrompt;delete ui.stage.dataset.escapePressure;setEscapeFocus(false);ui.stage.focus({preventScroll:true});});
}
async function forcedEscapeChoice(title,body='',phone=false){
  clearThought();ui.stage.dataset.escapePrompt='true';ui.stage.dataset.escapePressure='forced';
  let result;
  if(phone){if(body)phoneThought(body);result=await phoneChoice([{id:'escape',label:'ESCAPE'}]);}
  else{ui.choiceTitle.textContent=title;ui.choiceBody.textContent=body;ui.choiceTag.textContent='';ui.choice.hidden=false;result=await makeButtons(ui.options,[{id:'escape',label:'ESCAPE'}],()=>{ui.choice.hidden=true;ui.stage.focus({preventScroll:true});});}
  delete ui.stage.dataset.escapePrompt;delete ui.stage.dataset.escapePressure;setEscapeFocus(false);return result;
}

// Local effects share the paused game clock. No teammate animation code is used.
const visualEffects=new Set();
function animateVisual(node,duration,render,delay=0){
  return new Promise((resolve,reject)=>{const effect={node,start:clock.time+delay,duration,render,resolve,reject};visualEffects.add(effect);render(0);});
}
function cancelVisualEffects(node=null){
  for(const effect of visualEffects){if(!node||node===effect.node||node.contains(effect.node)){visualEffects.delete(effect);effect.reject(CANCEL);}}
}
function updateVisualEffects(){
  for(const effect of visualEffects){const t=clamp((clock.time-effect.start)/effect.duration);effect.render(t);if(t>=1){visualEffects.delete(effect);effect.resolve();}}
}
const stormMood={count:0,opacity:0,from:0,target:0,at:0,duration:.8,locked:false};
const stormDark=document.createElement('div');stormDark.id='stormDark';stormDark.setAttribute('aria-hidden','true');ui.stage.append(stormDark);
const stormThought=document.createElement('div');stormThought.id='stormThought';stormThought.hidden=true;stormThought.setAttribute('aria-live','polite');ui.stage.append(stormThought);
function setStormDarkness(target,duration=.8){stormMood.from=stormMood.opacity;stormMood.target=target;stormMood.at=clock.time;stormMood.duration=duration;}
function updateStormMood(){
  const progress=smooth(clamp((clock.time-stormMood.at)/stormMood.duration));stormMood.opacity=mix(stormMood.from,stormMood.target,progress);stormDark.style.opacity=String(stormMood.opacity);
  ui.stage.classList.toggle('storm-pressure',stormMood.opacity>0||stormMood.target>0);
}
function prepareStormMood(){beginStormMood();stormThought.hidden=true;}
function beginStormMood(stage=null){
  const n=stage??Math.min(4,++stormMood.count);if(stage)stormMood.count=Math.max(stormMood.count,stage);
  setStormDarkness([.15,.25,.45,.70][n-1],1.2);stormThought.textContent=['one thing at a time.','i can’t answer all of this.','too much. too much.','just make it stop.'][n-1];stormThought.hidden=false;
}
function resetStormMood(){Object.assign(stormMood,{count:0,opacity:0,from:0,target:0,at:clock.time,locked:false});stormDark.style.opacity='0';stormThought.hidden=true;ui.stage.classList.remove('storm-pressure');}
const stormAnchorsDesktop=[[3,10],[68,11],[4,68],[67,69],[2,34],[72,35],[20,6],[22,75],[49,7],[48,76],[9,22],[76,22],[10,53],[75,56],[27,23],[58,22],[57,61]];
const stormAnchorsSmall=[[2,9],[58,10],[2,70],[58,71],[1,31],[64,33],[20,4],[21,76],[46,5],[46,77],[5,20],[68,20],[5,51],[67,54],[24,22],[52,23],[52,62]];
function stormRectIntersects(a,b){return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;}
function layoutMontageMessages(origin=null){
  if(ui.montageMessages.hidden)return;const stageRect=ui.stage.getBoundingClientRect(),compact=stageRect.width<700,cards=[...ui.montageMessages.querySelectorAll('.montage-message')],anchors=compact?stormAnchorsSmall:stormAnchorsDesktop;
  const clearance=clamp(stageRect.width*.018,16,24),estimatedWidth=clamp(stageRect.width*.258,190,340),estimatedHeight=clamp(stageRect.width*.067,58,88);
  let br=origin?origin.getBoundingClientRect():{left:stageRect.left+(stageRect.width-estimatedWidth)/2,right:stageRect.left+(stageRect.width+estimatedWidth)/2,top:stageRect.top+(stageRect.height-estimatedHeight)/2,bottom:stageRect.top+(stageRect.height+estimatedHeight)/2,width:estimatedWidth,height:estimatedHeight};
  if(origin){const hint=escapeKeyHint(origin);if(hint&&!hint.hidden&&hint.getClientRects().length){const hr=hint.getBoundingClientRect();br={left:Math.min(br.left,hr.left),right:Math.max(br.right,hr.right),top:Math.min(br.top,hr.top),bottom:Math.max(br.bottom,hr.bottom),width:Math.max(br.right,hr.right)-Math.min(br.left,hr.left),height:Math.max(br.bottom,hr.bottom)-Math.min(br.top,hr.top)};}}
  const protectedRect={left:br.left-clearance,right:br.right+clearance,top:br.top-clearance-ui.stage.clientHeight*.18,bottom:br.bottom+clearance};
  if(!stormThought.hidden){const tr=stormThought.getBoundingClientRect();protectedRect.left=Math.min(protectedRect.left,tr.left-8);protectedRect.right=Math.max(protectedRect.right,tr.right+8);protectedRect.top=Math.min(protectedRect.top,tr.top-8);}
  const utilityRects=[...document.querySelectorAll('#hud .utilities button,#date')].filter(n=>n.getClientRects().length).map(n=>{const q=n.getBoundingClientRect();return {left:q.left-8,right:q.right+8,top:q.top-8,bottom:q.bottom+8};});
  cards.forEach((card,i)=>{
    const [ax,ay]=anchors[i%anchors.length],w=card.offsetWidth,h=card.offsetHeight;let left=stageRect.left+stageRect.width*ax/100,top=stageRect.top+stageRect.height*ay/100;
    const clampPos=()=>{left=clamp(left,stageRect.left+7,stageRect.right-w-7);top=clamp(top,stageRect.top+7,stageRect.bottom-h-7);};clampPos();
    let rect=()=>({left,right:left+w,top,bottom:top+h});
    if(stormRectIntersects(rect(),protectedRect)){
      const cardCx=left+w/2,cardCy=top+h/2,bcx=(br.left+br.right)/2,bcy=(br.top+br.bottom)/2,dx=cardCx-bcx,dy=cardCy-bcy;
      if(Math.abs(dx)>Math.abs(dy)){left=dx<0?protectedRect.left-w-8:protectedRect.right+8;}else{top=dy<0?protectedRect.top-h-8:protectedRect.bottom+8;}clampPos();
      if(stormRectIntersects(rect(),protectedRect)){
        const candidates=[
          [protectedRect.left-w-8,top],[protectedRect.right+8,top],[left,protectedRect.top-h-8],[left,protectedRect.bottom+8]
        ].map(([x,y])=>{x=clamp(x,stageRect.left+7,stageRect.right-w-7);y=clamp(y,stageRect.top+7,stageRect.bottom-h-7);const rr={left:x,right:x+w,top:y,bottom:y+h};return {x,y,rr,d:Math.hypot(x-left,y-top)};}).filter(c=>!stormRectIntersects(c.rr,protectedRect)).sort((a,b)=>a.d-b.d);
        if(candidates[0]){left=candidates[0].x;top=candidates[0].y;}
      }
    }
    for(const u of utilityRects){if(stormRectIntersects(rect(),u)){top=u.bottom+8;clampPos();}}
    card.style.left=`${left-stageRect.left}px`;card.style.top=`${top-stageRect.top}px`;
  });
}
function stormDateLabel(row){return row.year?`${row.date} ’${String(row.year).slice(-2)}`:row.date;}
function showMontageMessages(rows,{initialCount=null,burst=false}={}){
  cancelVisualEffects(ui.montageMessages);ui.montageMessages.replaceChildren();ui.montageMessages.hidden=false;
  const compact=ui.stage.clientWidth<700,visible=rows.slice(-17);
  const label=document.createElement('div');label.className='montage-label';label.textContent='UNANSWERED MESSAGES';ui.montageMessages.append(label);
  const first=initialCount==null?visible.length:Math.min(initialCount,visible.length);
  let entranceEnd=0;
  visible.forEach((m,index)=>{
    const card=document.createElement('div');card.className='montage-message'+(index===visible.length-1?' newest':' older');card.dataset.stormIndex=String(index);
    const width=compact?clamp(34+m.text.length*.11,34,43):clamp(24+m.text.length*.075,24,33);card.style.width=`${width}%`;card.style.zIndex=index+1;
    const meta=document.createElement('small');meta.className='montage-meta';const sender=document.createElement('span');sender.textContent=m.sender;const date=document.createElement('time');date.textContent=stormDateLabel(m);meta.append(sender,date);
    const text=document.createElement('p');text.textContent=m.text;card.append(meta,text);ui.montageMessages.append(card);
    const delay=index<first?index*.045:(burst?.78+(index-first)*.075:index*.045),duration=settings.motion==='reduced'?.14:.32;entranceEnd=Math.max(entranceEnd,delay+duration);
    animateVisual(card,duration,t=>{card.style.opacity=smooth(t);card.style.transform=`translateY(${settings.motion==='reduced'?0:7*(1-smooth(t))}px)`;},delay).catch(e=>{if(e!==CANCEL)console.error(e);});
  });
  layoutMontageMessages();return entranceEnd;
}
async function hideMontageMessages(retreat=false,origin=null){
  if(ui.montageMessages.hidden)return;
  const stageAtStart=ui.stage.getBoundingClientRect(),cards=[...ui.montageMessages.querySelectorAll('.montage-message')];
  const snapshots=cards.map(card=>{const r=card.getBoundingClientRect(),style=getComputedStyle(card);return {card,r,localLeft:r.left-stageAtStart.left,localTop:r.top-stageAtStart.top,opacity:Number(style.opacity),matrix:new DOMMatrixReadOnly(style.transform==='none'?undefined:style.transform),maxTravel:1};});
  cancelVisualEffects(ui.montageMessages);
  stormThought.hidden=true;
  if(retreat&&origin){
    setStormDarkness(0,.4);const reliefDone=clock.wait(.4);
    stormDepartureActive=true;
    try{
      const b=origin.getBoundingClientRect(),cx=b.left+b.width/2-stageAtStart.left,cy=b.top+b.height/2-stageAtStart.top;
      const distances=snapshots.map(({r})=>Math.hypot(r.left+r.width/2-(b.left+b.width/2),r.top+r.height/2-(b.top+b.height/2))),max=Math.max(1,...distances),reduced=settings.motion==='reduced',margin=20,diagonal=Math.hypot(stageAtStart.width,stageAtStart.height);
      await Promise.all(snapshots.map((snap,i)=>{
        const {card,r,localLeft,localTop,opacity,matrix}=snap;let dx=localLeft+r.width/2-cx,dy=localTop+r.height/2-cy,d=Math.hypot(dx,dy);
        if(d<1){const angle=(i*.61803398875+.125)*Math.PI*2;dx=Math.cos(angle);dy=Math.sin(angle);d=1;}
        const ux=dx/d,uy=dy/d,delay=0,duration=reduced?.16:.30;
        const neededTravel=()=>{const w=ui.stage.clientWidth,h=ui.stage.clientHeight,cxCard=localLeft+r.width/2,cyCard=localTop+r.height/2,candidates=[];if(Math.abs(ux)>.0001)candidates.push(ux>0?(w+margin+r.width/2-cxCard)/ux:(-margin-r.width/2-cxCard)/ux);if(Math.abs(uy)>.0001)candidates.push(uy>0?(h+margin+r.height/2-cyCard)/uy:(-margin-r.height/2-cyCard)/uy);return Math.max(1,Math.min(...candidates.filter(value=>value>0)));};
        snap.maxTravel=neededTravel();
        return animateVisual(card,duration,t=>{
          if(reduced){card.style.opacity=String(opacity*(1-t));return;}
          snap.maxTravel=Math.max(snap.maxTravel,neededTravel());const move=.65*t+.35*t*t,fade=1-t*t;
          card.style.transform=`translate(${matrix.m41+ux*snap.maxTravel*move}px,${matrix.m42+uy*snap.maxTravel*move}px)`;card.style.opacity=String(opacity*fade);
        },delay).then(()=>card.remove());
      }));
    await reliefDone;G.flags.physicalDecline=Math.max(physicalDecline(),Math.min(3,stormMood.count));}finally{stormDepartureActive=false;}
  }
  ui.montageMessages.hidden=true;ui.montageMessages.replaceChildren();
}
async function successfulEscapePress(b){
  const reduced=settings.motion==='reduced',style=getComputedStyle(b),base=new DOMMatrixReadOnly(style.transform==='none'?undefined:style.transform),matrixAt=scale=>`matrix(${base.a*scale},${base.b*scale},${base.c*scale},${base.d*scale},${base.e},${base.f})`;
  b.style.transformOrigin='50% 50%';
  try{
    if(reduced){await animateVisual(b,.12,t=>{b.style.filter=`brightness(${1+.08*(1-t)})`;b.style.setProperty('--escape-depth',`${mix(5,2,t)}px`);});return;}
    await animateVisual(b,.09,t=>{b.style.transform=matrixAt(1-.025*t);b.style.filter=`brightness(${1+.12*t})`;b.style.setProperty('--escape-depth',`${mix(5,2,t)}px`);});
    await animateVisual(b,.14,t=>{b.style.transform=matrixAt(.975+.025*t);b.style.filter=`brightness(${1.12-.12*t})`;b.style.setProperty('--escape-depth',`${mix(2,5,t)}px`);});
  }finally{b.style.transform='';b.style.filter='';b.style.transformOrigin='';b.style.removeProperty('--escape-depth');}
}
async function montageEscapeBeat(rows,{initialCount=null,burst=false}={}){
  beginStormMood(Math.max(1,stormMood.count));const entranceEnd=showMontageMessages(rows,{initialCount,burst});G.cinematic=true;G.keys.clear();G.target=null;
  await clock.wait(burst?Math.max(.42,entranceEnd+.04):.58);
  G.cinematic=false;ui.stage.dataset.escapePrompt='true';ui.stage.dataset.escapePressure='forced';ui.stage.dataset.montageChoice='true';
  ui.choiceTitle.textContent='';ui.choiceBody.textContent='';ui.choiceTag.textContent='';ui.choice.hidden=false;ui.options.replaceChildren();
  const b=document.createElement('button');setEscapeButtonContent(b);b.className='escape-option escape-central';b.dataset.action='escape';mountEscapeKey(ui.options,b);bindEscapeFocus(b);b.focus({preventScroll:true});layoutMontageMessages(b);
  await new Promise((resolve,reject)=>{
    pendingChoice={reject};let used=false;
    b.onclick=async()=>{if(G.paused||used||actionPointerBlocked())return;used=true;b.disabled=true;setEscapeFocus(false);audio.fx('select');
      try{audio.sensation(0,.12);await Promise.all([successfulEscapePress(b),hideMontageMessages(true,b)]);pendingChoice=null;resolve();}catch(e){reject(e);}};
  });
  ui.choice.hidden=true;ui.options.replaceChildren();delete ui.stage.dataset.escapePrompt;delete ui.stage.dataset.escapePressure;delete ui.stage.dataset.montageChoice;setEscapeFocus(false);ui.stage.focus({preventScroll:true});
}
async function reflectionCard(text,hold=1.05,{tod=null,mode='plain',keepVisible=false}={}){
  G.cinematic=true;if(tod){G.timeOfDay=tod;ui.stage.dataset.tod=tod;}ui.reflection.dataset.mode=mode;ui.reflectionText.textContent=text;ui.reflection.hidden=false;audio.setMode('silent');await clock.wait(hold);if(!keepVisible){ui.reflection.hidden=true;delete ui.reflection.dataset.mode;G.cinematic=false;}
}
async function courseworkMemoryCard(status,detail,tone='amber',hold=1.1){
  G.cinematic=true;G.timeOfDay='morning';ui.stage.dataset.tod='morning';ui.reflection.dataset.mode='course-memory';ui.reflection.dataset.courseTone=tone;ui.reflectionText.replaceChildren();
  const heading=document.createElement('span');heading.className='course-heading';heading.textContent='COURSEWORK';
  const main=document.createElement('strong');main.className='course-status';main.textContent=status;
  const sub=document.createElement('span');sub.className='course-detail';sub.textContent=detail;
  ui.reflectionText.append(heading,main,sub);ui.reflection.hidden=false;audio.setMode('silent');await clock.wait(hold);ui.reflection.hidden=true;ui.reflectionText.replaceChildren();delete ui.reflection.dataset.mode;delete ui.reflection.dataset.courseTone;G.cinematic=false;
}
async function endingTextCard(text,hold){
 G.cinematic=true;ui.reflection.dataset.mode='ending';ui.reflectionText.textContent=text;ui.reflectionText.style.opacity=0;ui.reflection.hidden=false;audio.setMode('silent');
 if(settings.motion==='full')await clock.tween(.55,t=>ui.reflectionText.style.opacity=t);else ui.reflectionText.style.opacity=1;
 await clock.wait(hold);
 if(settings.motion==='full')await clock.tween(.4,t=>ui.reflectionText.style.opacity=1-t);else ui.reflectionText.style.opacity=0;
 await clock.wait(.22);ui.reflection.hidden=true;ui.reflectionText.style.opacity='';delete ui.reflection.dataset.mode;G.cinematic=false;
}
async function unavailableChoice(title,actionLabel,tag='STAY WITH IT'){
  clearThought();ui.choiceTitle.textContent=title;ui.choiceBody.textContent='';ui.choiceTag.textContent=tag;ui.choice.hidden=false;
  return makeButtons(ui.options,[{id:'face',label:actionLabel,primary:true},{id:'escape-disabled',disabled:true}],()=>{ui.choice.hidden=true;ui.stage.focus({preventScroll:true});});
}
async function normalPassageTransition(gapLabel,dateLabel,tod='morning'){
  // Ordinary chapter passage is intentionally quiet: no drug visuals, no rapid day/night cycling.
  clearThought();G.cinematic=true;G.keys.clear();G.target=null;G.objects=[];audio.setMode('silent');
  await fade(1,.42);G.timeOfDay=tod;ui.stage.dataset.tod=tod;G.flags.pendingChapterMarker={gapLabel,dateLabel};G.cinematic=false;
}
async function chapterMarker(dateLabel,broad=''){
  // A small in-world date marker appears over the newly opened scene instead of a dramatic full-screen card.
  const token=claimMoment('chapter-marker',broad||'DATE',dateLabel);await clock.wait(1.65);finishMoment(token);
}
function routineReliefCue(strength=.17){
  // Keep the audio cue; leave the room visible without a flash or extra delay.
  audio.fx('use');audio.sensation(0,strength);
}
async function routineCourseworkAttempt(status='UNFINISHED PARAGRAPH'){
  const start=G.player.x;G.player.dir=start<=304?1:-1;G.player.walking=true;await clock.tween(.42,t=>G.player.x=mix(start,304,t));G.player.walking=false;G.player.pose='sit';G.player.y=212;G.typing=1;
  const winter=status.startsWith('WINTER COURSEWORK'),submittedInitial=G.flags.draftSent&&!winter;let shownStatus=status,draft='This suggests the intervention may improve…',sub='Familiar document';
  if(winter){draft='Winter coursework — outline notes…';sub='Winter coursework';}
  else if(submittedInitial){draft='References — Tan, 2025. Publication details…';shownStatus=status.replace('SAME PARAGRAPH','REFERENCES');sub='Submitted draft · references outstanding';}
  openPhone('COURSE',sub);ui.draft.hidden=false;ui.draftText.textContent=draft;phoneThought(shownStatus);await waitForPhoneReadingAck();G.typing=0;closePhone();G.player.pose='stand';G.player.y=218;await clock.wait(.35);
}
async function routineReplyAttempt(contact,draft){
  const start=G.player.x;G.player.dir=start<=178?1:-1;G.player.walking=true;await clock.tween(.36,t=>G.player.x=mix(start,178,t));G.player.walking=false;openPhone(contact,'Draft');ui.draft.hidden=false;ui.draftText.textContent=draft;phoneThought('UNSENT');await waitForPhoneReadingAck();await deleteDraft();closePhone();await clock.wait(.3);
}
async function routineAftermath(text){
  G.minutes=(G.minutes+22)%1440;thought(text,2.1);await clock.wait(2.1);clearThought();
}
function populateFinalHistory(){
  if(G.flags.finalHistoryPopulated)return;G.flags.finalHistoryPopulated=true;
  const once=(contact,text,date)=>{if(!G.threads[contact].some(m=>m.text===text&&m.date===date))message(contact,text,date);};
  once('MAYA','helloooo???','9 FEBRUARY 2027');once('MAYA','table by the fan? :)','14 FEBRUARY 2027');once('MAYA','you alive?','2 MARCH 2027');once('MAYA','haven’t heard from you','27 JUNE 2027');once('MAYA','guess today’s not happening. maybe another time','19 APRIL 2028');
  once('MUM','call me when you can','11 FEBRUARY 2027');once('MUM','left dinner outside ❤️','3 MAY 2027');once('MUM','how are you feeling?','12 AUGUST 2027');once('MUM','happy birthday ❤️','18 AUGUST 2027');once('MUM','i’m worried','12 APRIL 2028');once('MUM','just tell me you’re okay','29 APRIL 2028');
  once('COURSE','WINTER COURSEWORK · SUBMISSION CLOSED. No submission received.','5 JANUARY 2028 · 11:00 PM');G.phoneLit=true;
}



async function deskChoice(text){ui.deskChoice.hidden=false;thought(text,3600);return makeButtons(ui.deskOptions,[{id:'take',label:'TAKE'},{id:'leave',label:'LEAVE IT'}],()=>{ui.deskChoice.hidden=true;clearThought();ui.stage.focus({preventScroll:true});});}
function objects(...items){G.objects=items.map(([id,name,verb,x,y,fn])=>({id,name,verb,x,y,fn}));}
function nearest(){if(G.high)return null;let found=null,d=25;for(const o of G.objects){const n=Math.abs(o.x-G.player.x);if(n<d){d=n;found=o;}}return found;}
function openingAttention(){return G.flags.openingAttention||null;}
const OPENING_MAYA_X=153,OPENING_MAYA_BUBBLE_Y=164,OPENING_MUM_ALERT_SECONDS=7;
function openingMayaInRange(){return G.scene==='party'&&G.phase==='party'&&Math.abs(G.player.x-OPENING_MAYA_X)<25;}
function openingWindowMode(){
  if(G.scene!=='party'||G.commonVariant==='empty')return 'outside';
  if(G.phase==='party'||G.phase==='after')return 'eligible';
  if(G.phase==='high1'||G.phase==='aftermath')return 'blocked';
  return 'outside';
}
function syncOpeningMayaBubble(){
  const s=openingAttention(),bubble=ui.openingMayaBubble;if(!bubble)return;
  if(!s||!s.bubbleVisible||G.scene!=='party'||G.phase!=='party'){bubble.hidden=true;return;}
  const remaining=s.bubbleUntil-clock.time;if(remaining<=0){bubble.hidden=true;return;}
  const alpha=clock.time>=s.bubbleFadeAt?clamp(remaining/(s.bubbleUntil-s.bubbleFadeAt)):1;
  bubble.style.left=(OPENING_MAYA_X/480*100)+'%';bubble.style.top=(OPENING_MAYA_BUBBLE_Y/270*100)+'%';bubble.style.opacity=String(alpha);bubble.hidden=false;
}
function dismissOpeningBubble(){const s=openingAttention();if(s)s.bubbleVisible=false;syncOpeningMayaBubble();}
function openingMumMessagePresented(s){
  if(!s||!s.mumMessageId||s.mumRead||!s.mumReadWatchActive||G.paused||G.cinematic||document.visibilityState!=='visible'||ui.phone.hidden||ui.phone.dataset.contact!=='MUM')return false;
  if(!ui.pauseScreen.hidden||!ui.choice.hidden||!ui.dialogue.hidden||!ui.reflection.hidden||!ui.memoryPhoto.hidden||!ui.mirrorView.hidden||!ui.supplyView.hidden)return false;
  const row=ui.messages.querySelector('[data-message-id="'+s.mumMessageId+'"]');if(!row)return false;
  const viewport=ui.messages.getBoundingClientRect(),r=row.getBoundingClientRect(),visible=Math.max(0,Math.min(r.bottom,viewport.bottom)-Math.max(r.top,viewport.top));
  return visible>=Math.min(r.height*.75,36);
}
function markOpeningMumRead(){
  const s=openingAttention();if(!s||s.mumRead)return;
  s.mumRead=true;s.mumReadWatchActive=false;s.mumReadVisibleSince=0;s.mumAlertState='done';G.phoneLit=false;
  if(s.mumAlertToken&&momentOwned(s.mumAlertToken))finishMoment(s.mumAlertToken);s.mumAlertToken=0;s.mumVisibleElapsed=0;
}
function interruptOpeningMumAlert(reason='foreground'){
  const s=openingAttention();if(!s||s.mumAlertState!=='visible')return;
  const token=s.mumAlertToken;s.mumAlertState=s.mumRead?'done':'pending';s.mumAlertToken=0;s.mumVisibleElapsed=0;if(token&&momentOwned(token))interruptMoment(token,reason);
}
function openingForegroundStarted(){
  const s=openingAttention();if(!s||s.windowClosed||openingWindowMode()==='outside')return;
  dismissOpeningBubble();if(s.greetingVisible){s.greetingVisible=false;clearThought();}interruptOpeningMumAlert('foreground');
}
function openingForegroundClear(){
  return openingWindowMode()==='eligible'&&!G.paused&&!G.busy&&!G.cinematic&&document.visibilityState==='visible'&&!currentLine&&!pendingChoice&&!pendingBeat&&ui.dialogue.hidden&&ui.choice.hidden&&ui.phone.hidden&&ui.deskChoice.hidden&&ui.reflection.hidden&&ui.memoryPhoto.hidden&&ui.mirrorView.hidden&&ui.supplyView.hidden&&!activeMoment;
}
function showOpeningMumAlert(s){
  if(!s||s.mumRead||s.windowClosed||s.mumAlertState!=='pending')return;
  s.mumAlertState='visible';s.mumVisibleElapsed=0;
  const token=claimMoment('opening-mum','MUM','Left dinner in the freezer. Blue lid.\nHave fun tonight ❤️',{
    onInterrupted:()=>{const live=openingAttention();if(live!==s||live.mumRead)return;live.mumAlertState='pending';live.mumAlertToken=0;live.mumVisibleElapsed=0;},
    onComplete:()=>{const live=openingAttention();if(live!==s)return;live.mumAlertState='done';live.mumAlertToken=0;live.mumVisibleElapsed=OPENING_MUM_ALERT_SECONDS;}
  });
  s.mumAlertToken=token;G.phoneLit=true;startPhoneBuzz(token,'opening-mum');if(!s.mumAlertSounded){audio.fx('phone');s.mumAlertSounded=true;}
}
function startOpeningAttention(){
  mumMoment('opening');const mumMessageId=G.flags.openingMumMessageId||'opening-mum-fun',start=clock.time;
  G.flags.openingAttention={start,bubbleVisible:true,bubbleFadeAt:start+3.05,bubbleUntil:start+3.5,greetingVisible:true,greetingUntil:start+3,mayaWasInRange:openingMayaInRange(),windowClosed:false,mumMessageId,mumRead:false,mumReadWatchActive:false,mumReadVisibleSince:0,mumAlertState:'pending',mumEligibleAt:start+5.5,mumAlertToken:0,mumVisibleElapsed:0,mumAlertSounded:false};
  thought('Maya: “Oi. Saved you a seat.”',3);syncOpeningMayaBubble();
}
function watchOpeningMumRead(){
  const s=openingAttention();if(!s||s.mumRead||s.windowClosed)return;s.mumReadWatchActive=true;s.mumReadVisibleSince=0;
}
function updateOpeningMumRead(s){
  if(!s||!s.mumReadWatchActive||s.mumRead)return;
  if(openingMumMessagePresented(s)){if(!s.mumReadVisibleSince)s.mumReadVisibleSince=clock.time;else if(clock.time-s.mumReadVisibleSince>=1.4)markOpeningMumRead();}
  else s.mumReadVisibleSince=0;
}
function updateOpeningAttention(dt){
  const s=openingAttention();if(!s){if(ui.openingMayaBubble)ui.openingMayaBubble.hidden=true;return;}
  const mode=openingWindowMode();
  if(!s.windowClosed&&mode==='outside'){s.windowClosed=true;dismissOpeningBubble();s.greetingVisible=false;interruptOpeningMumAlert('window-closed');}
  if(mode!=='eligible'){dismissOpeningBubble();if(G.phase!=='party')s.greetingVisible=false;if(mode==='blocked'&&s.mumAlertState==='visible')interruptOpeningMumAlert('blocked-sequence');}
  if(s.bubbleVisible&&mode==='eligible'&&G.phase==='party'){const inside=openingMayaInRange();if(inside&&!s.mayaWasInRange)dismissOpeningBubble();s.mayaWasInRange=inside;if(clock.time>=s.bubbleUntil)s.bubbleVisible=false;}
  if(s.greetingVisible&&clock.time>=s.greetingUntil)s.greetingVisible=false;
  syncOpeningMayaBubble();updateOpeningMumRead(s);
  if(s.mumRead)return;
  if(s.mumAlertState==='visible'){
    if(!s.mumAlertToken||!momentOwned(s.mumAlertToken)||ui.moment.hidden){s.mumAlertState='pending';s.mumAlertToken=0;s.mumVisibleElapsed=0;}
    else{
      const obstructed=G.cinematic||!!currentLine||!!pendingChoice||!!pendingBeat||!ui.dialogue.hidden||!ui.choice.hidden||!ui.phone.hidden||!ui.deskChoice.hidden||!ui.reflection.hidden||!ui.memoryPhoto.hidden||!ui.mirrorView.hidden||!ui.supplyView.hidden;
      if(obstructed)interruptOpeningMumAlert('obstructed');
      else if(!G.paused&&document.visibilityState==='visible'&&ui.pauseScreen.hidden){s.mumVisibleElapsed+=dt;if(s.mumVisibleElapsed>=OPENING_MUM_ALERT_SECONDS)finishMoment(s.mumAlertToken);}
    }
  }
  if(!s.windowClosed&&s.mumAlertState==='pending'&&clock.time>=s.mumEligibleAt&&!s.bubbleVisible&&!s.greetingVisible&&openingForegroundClear())showOpeningMumAlert(s);
}
function interact(){if(G.paused)return;if(currentLine){advance();return;}if(G.busy)return;const o=nearest();if(o){openingForegroundStarted();markProgress();run(o.fn);}}

// The renderer uses one sober scene buffer. Dreams transform its appearance;
// the actual party, clock and responsibilities advance independently beneath it.
const canvas=ui.world,screen=canvas.getContext('2d',{alpha:false});
const buffer=document.createElement('canvas');buffer.width=480;buffer.height=270;
const c=buffer.getContext('2d',{alpha:false});screen.imageSmoothingEnabled=c.imageSmoothingEnabled=false;
const P={void:'#14131f',wall:'#353448',trim:'#59516b',ink:'#191925',wood:'#6c5059',warm:'#e5ab7d',cream:'#e4d7ba',pink:'#b96f82',blue:'#767eaa',green:'#8d9c87',shadow:'#252434'};
function rect(x,y,w,h,color){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function line(x1,y1,x2,y2,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(Math.round(x1)+.5,Math.round(y1)+.5);c.lineTo(Math.round(x2)+.5,Math.round(y2)+.5);c.stroke();}
function box(x,y,w,h,fill,border=P.ink){rect(x,y,w,h,border);rect(x+1,y+1,w-2,h-2,fill);}
function disk(x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();}
function ellipse(x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();}
function poly(points,color){c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
function nativeText(text,x,y,color=P.cream,size=5){c.font=`${size}px monospace`;c.fillStyle=color;c.fillText(text,Math.round(x),Math.round(y));}
function pixelStar(x,y,color,r=2){rect(x-r,y,r*2+1,1,color);rect(x,y-r,1,r*2+1,color);}
const sprites={};for(const kind of ['player','maya','rex','dealer','cleaner','mum','eli','nia']){const img=new Image();img.src=`assets/sprites/${kind}.png`;sprites[kind]=img;}
const polaroidArt=new Image();polaroidArt.src='assets/maya-polaroid.png';
function character(kind,x,y,opts={},ctx=c,scale=1){
 const {walk=false,dir=1,angle=0,alpha=1,high=false,pose='stand',dance=0}=opts;
 const t=clock.time,row=(high?2:0)+(walk?1:0),frame=Math.floor(t*(walk?8:2.4)+(kind==='maya'?2:0))%(walk?6:4);
 const stage=kind==='player'?physicalDecline():(Number.isFinite(opts.deteriorationStage)?opts.deteriorationStage:G.level);
 const injuryStage=Number.isFinite(opts.injuryStage)?opts.injuryStage:Math.min(2,G.falls||0);
 const rr=(rx,ry,rw,rh,color)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(rx),Math.round(ry),Math.round(rw),Math.round(rh));};
 const bb=(rx,ry,rw,rh,fill,border=P.ink)=>{rr(rx,ry,rw,rh,border);rr(rx+1,ry+1,rw-2,rh-2,fill);};
 ctx.save();ctx.globalAlpha=alpha;ctx.translate(Math.round(x),Math.round(y));ctx.rotate(angle);ctx.scale(dir*scale,scale);
 const tired=kind==='player'&&!high&&stage>=2;if(tired&&pose==='stand'){ctx.rotate(.025*(stage-1));ctx.translate(0,1);}if(dance)ctx.rotate(Math.sin(t*3+x)*dance);
 const img=sprites[kind];
 if(img&&img.complete&&img.naturalWidth){
   if(kind==='player'&&!high&&stage>=1&&pose!=='sit'&&img.naturalHeight>=368){
     // Supplied expanded sheet: two mild injury rows at 288/328 precede the heavier fatigue poses.
     // The last (falling) row at y=248 is deliberately not used.
     const fatigueY=[288,328,168,208][stage-1],rate=[6.6,5.8,4.8,4.3][Math.min(3,stage-1)],fatigueFrame=walk?Math.floor(t*rate)%6:0;
     ctx.drawImage(img,fatigueFrame*40,fatigueY,40,40,-20,-38,40,40);
   }else if(pose==='sit'){ctx.drawImage(img,frame*24,row*32,24,26,-12,-26,24,26);rr(-6,-2,16,3,P.blue);}else ctx.drawImage(img,frame*24,row*32,24,32,-12,-32,24,32);
   if(tired){const yy=pose==='sit'?-11:-17;rr(-3,yy,3,1,'#947d85');rr(4,yy,3,1,'#947d85');}
 }else{rr(-6,-17,12,16,kind==='maya'?P.pink:P.blue);rr(-7,-29,14,13,P.cream);rr(-5,-33,3,6,P.cream);rr(3,-33,3,6,P.cream);rr(-4,-24,2,3,P.ink);rr(3,-24,2,3,P.ink);}
 if(kind==='player'&&G.reach&&!high)rr(7,-14,3+G.reach*10,3,'#d7c4a8');
 if(kind==='player'&&G.call&&!high){const yy=mix(-12,-25,G.call.lift);rr(7,yy+3,4,5,'#d7c4a8');bb(8,yy,4,9,'#191d2b','#ad929f');}
 if(kind==='player'&&injuryStage&&!high){rr(-6,pose==='sit'?-5:-7,5,3,'#d8bd9e');rr(-4,pose==='sit'?-4:-6,1,1,'#a38275');if(injuryStage>1){rr(7,pose==='sit'?-9:-12,4,3,'#dbc2a4');rr(8,pose==='sit'?-8:-11,1,1,'#a38275');}}
 ctx.restore();
}

function todName(v){if(typeof v==='string')return v;return v?'afternoon':'night';}
function floor(tod='night'){tod=todName(tod);const day=tod!=='night';const fill={morning:'#877c80',afternoon:'#8b7775',evening:'#745a67',night:'#614f60'}[tod];const seam={morning:'#746a75',afternoon:'#725e69',evening:'#5a4759',night:'#473b50'}[tod];rect(0,201,480,69,fill);rect(0,201,480,3,P.ink);for(let y=217;y<270;y+=17){rect(0,y,480,1,seam);for(let x=(y%2?14:42);x<480;x+=61)rect(x,y-15,1,15,day?'#716573':'#493b50');}rect(0,257,480,13,'#262332');}
function wall(tod='night'){tod=todName(tod);const day=tod!=='night';const wallFill={morning:'#787b8d',afternoon:'#817887',evening:'#66586f',night:P.wall}[tod];const top={morning:'#9898a6',afternoon:'#a0959e',evening:'#827080',night:'#60566f'}[tod];const lower={morning:'#555c69',afternoon:'#605864',evening:'#493d50',night:'#2b2d3e'}[tod];rect(0,0,480,270,P.void);rect(17,20,446,182,wallFill);rect(17,20,446,6,top);rect(17,26,446,2,P.ink);rect(17,28,4,174,day?'#9b99a6':'#4e485f');rect(459,28,4,174,P.ink);rect(21,155,438,47,lower);rect(21,153,438,3,day?'#b1a8b0':'#74677f');for(let x=26;x<459;x+=24)rect(x,158,1,43,day?'#727482':'#454056');floor(tod);}
function windowArt(x,y,w=74,h=59,tod='night',closed=false){tod=todName(tod);const day=tod!=='night',sky={morning:'#c8cfce',afternoon:'#d8c5ab',evening:'#b67a7f',night:'#303044'}[tod],city={morning:'#9da6af',afternoon:'#aaa6ac',evening:'#7e687b',night:'#464356'}[tod],lit={morning:'#d8d0c8',afternoon:'#d7c9bc',evening:'#d5a58e',night:'#d5a879'}[tod];box(x-4,y-4,w+8,h+9,'#817181');box(x-1,y-1,w+2,h+2,P.ink);rect(x,y,w,h,sky);if(!closed){if(tod==='night'){disk(x+w-15,y+13,5,'#d5c1ad');disk(x+w-17,y+11,5,sky);}if(tod==='morning'){rect(x,y+h-9,w,9,'#e5d0b7');}if(tod==='evening'){rect(x,y+h-12,w,12,'#d69a78');}for(let i=0;i<9;i++){const xx=x+i*w/9,hh=12+(i*13)%33;rect(xx,y+h-hh,w/9-1,hh,city);for(let yy=y+h-hh+5;yy<y+h-3;yy+=7){rect(xx+2,yy,2,2,day?(i+yy)%4===0?lit:city:(i+yy)%3?'#74717f':lit);}}if(tod==='night'){const tx=x+((clock.time*6)%150)-65;rect(clamp(tx,x,x+w),y+h-7,clamp(24-Math.max(0,x-tx)-Math.max(0,tx+24-(x+w)),0,24),2,'#a39caa');}rect(x+w/2-1,y,2,h,P.ink);rect(x,y+h/2,w,2,P.ink);}else{rect(x,y,w/2-2,h,'#4b435b');rect(x+w/2+2,y,w/2-2,h,'#4b435b');for(let i=3;i<w;i+=8)rect(x+i,y,2,h,'#373247');rect(x+w/2,y,1,h,'#9b8492');}rect(x-7,y-6,6,h+12,'#815a72');rect(x+w+1,y-6,6,h+12,'#815a72');rect(x-7,y+h+4,w+14,3,'#332c41');}
function door(x,open=false,day=false){box(x-3,139,32,65,day?'#b0a1a5':'#897081');box(x,142,26,59,open?'#1c1e2b':'#564253');if(open){rect(x+20,143,5,56,'#383347');rect(x+2,158,16,41,'#282a3a');}else{box(x+3,147,20,23,'#604b5d');box(x+3,176,20,20,'#604b5d');rect(x+21,173,2,2,'#d5ab84');}rect(x-5,202,36,3,P.ink);}
function couch(x=107,y=177,empty=false){rect(x+5,y+27,5,6,P.ink);rect(x+58,y+27,5,6,P.ink);box(x+3,y,64,26,empty?'#827182':'#975d77');rect(x+6,y+3,58,2,empty?'#a38d96':'#be8694');rect(x+35,y+3,1,17,'#633f58');box(x,y+12,8,19,empty?'#8b7786':'#aa7189');box(x+63,y+12,8,19,empty?'#8b7786':'#aa7189');rect(x+8,y+20,55,8,'#6d4a64');rect(x+10,y+20,23,2,empty?'#aa8d9c':'#c18b98');rect(x+37,y+20,22,2,empty?'#aa8d9c':'#c18b98');box(x+10,y+6,15,11,empty?'#777c87':'#829480');if(!empty){line(x+12,y+8,x+22,y+14,'#b6ba9f');}}
function chair(x,y,stack=0){for(let i=0;i<=stack;i++){const xx=x+i*2,yy=y-i*7;rect(xx+3,yy-29,2,28,'#363343');rect(xx+21,yy-29,2,28,'#363343');box(xx+3,yy-30,20,14,'#72778a');rect(xx+5,yy-28,16,2,'#9191a0');box(xx,yy-13,26,5,'#a398a5');rect(xx+2,yy-8,3,12,'#302c3b');rect(xx+21,yy-8,3,12,'#302c3b');line(xx+5,yy-2,xx+20,yy-2,'#575062');}}
function plant(x,y,dead=false){line(x,y,x+1,y-25,dead?'#7b6870':'#819b8d',2);line(x,y-10,x-9,y-20,dead?'#7b6870':'#819b8d',2);line(x,y-17,x+9,y-28,dead?'#7b6870':'#819b8d',2);if(!dead){ellipse(x-10,y-21,7,3,'#829d88');ellipse(x+9,y-28,7,3,'#a1b499');ellipse(x+1,y-28,3,8,'#90a990');}else{rect(x+8,y-22,3,5,'#756576');rect(x-12,y+8,6,2,'#756576');}box(x-7,y,16,4,'#d69981');poly([[x-5,y+4],[x+7,y+4],[x+5,y+14],[x-3,y+14]],'#946773');rect(x-3,y+5,2,7,'#b98383');}
function picture(x,y,down=false){
 const w=38,h=25;
 if(down){box(x-3,y+19,w+6,6,'#5c4858');rect(x-1,y+20,w+2,2,'#8e7580');return;}
 rect(x-4,y-4,w+8,h+9,'#2a222b');box(x-3,y-3,w+6,h+7,'#725764');rect(x-1,y-1,w+2,h+3,'#c9b9ad');
 c.save();c.beginPath();c.rect(x,y,w,h);c.clip();rect(x,y,w,h,'#6d4655');
 for(let i=0;i<5;i++){rect(x+2+i*8,y+2+(i%2),1,3,'#e6b578');}
 const maya=sprites.maya,player=sprites.player;
 if(maya.complete&&maya.naturalWidth&&player.complete&&player.naturalWidth){
   c.drawImage(maya,3,64,19,25,x,y,19,25);c.drawImage(player,3,64,19,25,x+19,y+1,19,25);
   rect(x+16,y+19,9,3,'#c58791');rect(x+23,y+19,3,3,'#e3cbb1');
 }else{rect(x+3,y+7,13,13,'#e2cfc4');rect(x+22,y+7,13,13,'#e4d7ba');}
 c.restore();rect(x+3,y+h+1,w-6,1,'#8b747d');rect(x-2,y+h+4,w+4,2,'#3d303b');
}
function mirrorStage(){if(['escapebreak','realisation','mirrorwalk','mirror','postcycle','posthall','empty','final','ending','finalphoto'].includes(G.phase)||G.level>=4)return 4;if(G.level>=3)return 3;if(G.level>=2)return 2;return 1;}
// Ver 1 mirror visual language: small wall mirror, muted mauve frame, real player sprite reflected only while facing it.
function mirrorObject(x=92,y=88,w=29,h=47){
 const stage=mirrorStage();box(x,y,w,h,stage>=4?'#7b6975':'#96828e');box(x+2,y+2,w-4,h-4,'#656b7b');rect(x+4,y+4,w-8,h-8,'#4b5263');
 if(G.mirror){
   c.save();c.beginPath();c.rect(x+4,y+4,w-8,h-8);c.clip();
   const slump=(stage-1)*.7;character('player',x+15,y+44+slump,{dir:-1,angle:stage>=3?.05:0,alpha:.86,deteriorationStage:stage,injuryStage:Math.min(2,G.falls||0)});
   if(stage>=2){c.globalAlpha=.18+.06*stage;rect(x+4,y+4,w-8,h-8,'#514a59');c.globalAlpha=1;}
   c.restore();
 }else{
   line(x+7,y+9,x+20,y+23,'#7a7e8b');line(x+7,y+15,x+13,y+21,'#7a7e8b');
 }
 if(stage>=3){rect(x+3,y+38,2,5,'#88808a');rect(x+22,y+26,2,9,'#88808a');}
}
function pixelBuzzWord(x,y,color='#cbb6ae'){
  const glyphs={b:['100','100','110','101','110'],r:['000','000','110','101','100']};let ox=0;
  for(const ch of 'brr'){const rows=glyphs[ch];for(let yy=0;yy<rows.length;yy++)for(let xx=0;xx<rows[yy].length;xx++)if(rows[yy][xx]==='1')rect(x+ox+xx,y+yy,1,1,color);ox+=4;}
}
function drawPhoneBuzzCue(x,y,buzz){
  if(!buzz)return;const reduced=settings.motion==='reduced',e=buzz.elapsed;
  const lineIn=clamp(e/.1),lineOut=1-smooth(clamp((e-.9)/.38)),lineAlpha=lineIn*lineOut;
  if(lineAlpha>0){c.save();c.globalAlpha=.78*lineAlpha;const col='#d8c1ad';
    // Compact stepped marks echo the supplied vibration reference without introducing smooth vector arcs.
    rect(x-5,y+1,1,2,col);rect(x-7,y+3,1,3,col);rect(x-5,y+7,1,2,col);
    rect(x+12,y+1,1,2,col);rect(x+14,y+3,1,3,col);rect(x+12,y+7,1,2,col);
    if(!reduced&&e<.95){const phase=Math.floor(e/.09)%2;rect(x-9+(phase?1:0),y+2,1,2,col);rect(x+16-(phase?1:0),y+2,1,2,col);}
    c.restore();
  }
  const cue=(start,offset,reducedCue=false)=>{const age=e-start;if(age<0||age>.72)return;const t=clamp(age/.72),alpha=(1-smooth(t))*(age<.08?age/.08:1),rise=reducedCue?0:Math.round(t*5);c.save();c.globalAlpha=.88*alpha;pixelBuzzWord(x+11+offset,y-3-rise);c.restore();};
  cue(.15,0,reduced);if(!reduced)cue(.5,2,false);
}
function phoneProp(x,y,buzzable=true){
  const buzz=buzzable?phoneBuzzState():null,e=buzz?buzz.elapsed:0,shake=buzz&&settings.motion==='full'&&e<1.05?((Math.floor(e/.065)%2)*2-1):0;
  const px=x+shake;box(px,y,8,12,'#131724','#9e889c');rect(px+2,y+2,4,7,G.phoneLit?'#e9bf9d':'#57506c');if(G.phoneLit&&Math.floor(clock.time*2)%2===0)rect(px-2,y+2,1,5,'#eac395');if(buzz)drawPhoneBuzzCue(x,y,buzz);
}
function pill(x,y){box(x,y,14,8,'#c2a2af');rect(x+2,y+2,4,3,'#e891a1');rect(x+6,y+2,4,3,'#f1dbbd');rect(x+10,y+1,2,6,'#827287');}
function emptyPacket(x,y){box(x,y,14,8,'#8d858e');rect(x+2,y+2,10,4,'#5e5966');rect(x+3,y+3,8,1,'#aba2a8');line(x+2,y+7,x+12,y+1,'#6e6672');}
function poster(x,y,color='#aa7185'){box(x,y,22,29,'#bdb0ac');rect(x+2,y+2,18,25,color);disk(x+11,y+10,6,'#dcb58d');poly([[x+3,y+23],[x+16,y+11],[x+19,y+23]],'#5d5571');rect(x+5,y+25,12,1,'#ddc7ae');}
function speaker(x,y){box(x,y,22,36,'#303047');disk(x+11,y+25,7,'#191b2b');disk(x+11,y+25,5,'#625a76');disk(x+11,y+25,2,'#242334');disk(x+11,y+9,4,'#161926');rect(x+4,y+2,3,1,'#b992a3');const amp=G.high?G.intensity:(G.commonVariant==='empty'||['after','empty','hall'].includes(G.phase)?0:.18);if(amp){c.globalAlpha=amp*.25*(.5+.5*Math.sin(clock.time*11.73));ellipse(x+11,y+25,11,11,'#ef9cbd');c.globalAlpha=1;}}
function partyBackground(){const empty=G.commonVariant==='empty'||G.phase==='empty',tod=empty?'afternoon':'night';wall(tod);door(37,true,tod!=='night');windowArt(277,77,74,65,tod);couch(107,177,empty);poster(95,81);poster(124,89,'#758b94');
  if(!empty){poster(395,89,'#698876');rect(184,105,63,3,P.ink);for(let i=0;i<5;i++){rect(190+i*10,95-i%2*4,5,10+i%2*4,['#b38487','#92a08e','#c7a681'][i%3]);}nativeText('SIDE B',196,81,'#d9b9aa',7);}
  else{rect(395,89,22,29,'#9590a0');rect(396,90,2,2,'#b9afae');}
  for(let x=36;x<443;x++){const y=44+Math.sin((x-36)/407*Math.PI)*19;rect(x,y,1,1,'#252334');if(x%19===0){rect(x,y,1,5,'#413447');if(!empty){const col=['#e4b584','#d9a69b','#c0bd92'][Math.floor(x/19)%3];rect(x-1,y+4,3,3,col);c.globalAlpha=.075;disk(x,y+6,9,col);c.globalAlpha=1;}}}
  rect(87,224,267,25,empty?'#706576':'#37334c');rect(91,227,259,19,empty?'#a09299':'#926479');rect(95,230,251,13,empty?'#877983':'#684c67');for(let i=0;i<24;i++){rect(100+i*10,231,3,1,empty?'#b4a4a7':'#b98b90');rect(100+i*10,240,3,1,empty?'#b4a4a7':'#b98b90');}
  box(205,190,50,7,'#ad837d');rect(209,197,3,17,P.ink);rect(247,197,3,17,P.ink);rect(213,183,5,7,'#d3b5b2');rect(213,182,5,1,'#eee0ce');rect(235,188,10,2,'#a99aaa');speaker(353,171);line(365,207,390,215,P.ink);line(390,215,424,207,P.ink);door(429,true,tod!=='night');
  if(empty){chair(398,190,3);chair(370,204,1);box(433,194,12,17,'#84978f');line(442,152,436,197,'#b19980',2);}else{ellipse(409,215,11,3,'#222131');plant(409,201);}
  const mess=empty?2:Math.floor(G.partyProgress*8);for(let i=0;i<mess;i++){const x=185+(i*41)%220,y=216+(i*13)%31;rect(x,y,5,2,i%2?'#b7a2a5':'#d2c5b5');rect(x+1,y-3,3,3,'#b7a2a5');}
  if(!empty){phoneProp(196,188);c.globalAlpha=.08;poly([[149,99],[94,202],[205,202]],'#ffb787');c.globalAlpha=1;}else{c.globalAlpha=.18;poly([[278,141],[351,141],[440,257],[219,257]],'#e8d0b0');c.globalAlpha=1;}
}
function floorClutter(x,y,kind){
 if(kind===0){poly([[x,y],[x+2,y-5],[x+6,y-7],[x+11,y-3],[x+9,y+1]],'#b8aba9');line(x+3,y-4,x+6,y-1,'#82778a');line(x+6,y-5,x+9,y-3,'#d2c3b6');}
 else if(kind===1){poly([[x,y-2],[x+3,y-7],[x+7,y-5],[x+10,y-6],[x+14,y-1],[x+10,y+2],[x+3,y+1]],'#73738b');line(x+5,y-4,x+7,y,'#9990a0',2);}
 else{box(x+2,y-7,6,8,'#a7838a');rect(x+3,y-7,4,2,'#d3bbaa');rect(x+8,y-5,2,4,'#70586b');}
}
function bedroomBackground(){const level=G.level,late=level>=3,final=level>=4,tod=currentTimeOfDay(),day=tod!=='night',windowClosed=late&&!['montage','escapebreak','emptycheck','realisation','courseworkrealisation','mirror','postcycle','final','ending','finalphoto'].includes(G.phase);wall(tod);door(35,false,day);windowArt(167,62,79,72,tod,windowClosed);rect(75,163,4,40,'#bb8c80');box(76,177,78,25,'#8a7187');rect(80,171,71,13,'#d2c6b6');box(83,171,22,8,'#e5d5c0');if(G.level>=2&&!G.flags.spaceForMum){box(132,169,14,4,'#8f777b');box(130,166,14,3,'#8f98a1');}rect(108,175,43,25,final?'#6a6b80':'#839189');rect(109,177,40,2,final?'#87849a':'#b1b6a1');for(let x=116;x<148;x+=12)rect(x,181,2,16,late?'#777887':'#bdc1a8');
  rect(81,202,3,6,P.ink);rect(146,202,3,6,P.ink);
  box(163,190,30,5,'#aa817a');rect(166,195,3,14,P.ink);rect(187,195,3,14,P.ink);if(!G.call)phoneProp(174,177);
  box(276,177,83,7,'#ae857d');rect(281,184,3,28,P.ink);rect(351,184,3,28,P.ink);box(283,185,67,16,'#65505f');rect(313,190,7,2,'#b9a1a4');
  if(!final){box(286,149,31,27,'#8b7f93');rect(288,151,27,22,'#252937');rect(291,154,18,1,'#d3c3b1');if(G.workState==='draft'){for(let i=0;i<3+(G.flags.wrote?1:0);i++)rect(291,158+i*3,13+i%2*6,1,i===3?'#a5c3ad':'#737c95');if(G.typing||G.flags.cursorBlink)rect(305+Math.floor(clock.time*4)%8,168,1,2,'#f1dcbd');}else{nativeText(G.workState==='closed'?'CLOSED':G.workState==='sent'?'SENT':'LATE',290,166,G.workState==='sent'?'#abc3a2':'#e6a69b',6);}rect(282,176,38,2,'#b7a5ad');}
  else{box(285,174,35,4,'#656477');rect(296,174,8,1,'#9992a0');}
  if(G.flags.lettersHome){rect(267,174,9,3,'#c5b8ac');line(267,174,271,176,'#9c8d90');line(271,176,275,174,'#9c8d90');}if(G.flags.ate||G.phase==='room1'){box(251,174,13,4,'#b3c5c6');rect(251,173,13,1,'#7b9eae');if(!G.flags.ate)rect(253,170,9,3,'#a78760');}if(G.flags.wentOut){box(210,214,14,13,'#ae8967');rect(212,212,10,4,'#c7ae89');rect(213,219,8,1,'#8f6e58');}if(G.showPill){box(335,167,12,7,'#b0a6ae');rect(337,168,8,5,'#d1c5c8');pill(338,169);}else if(G.flags.emptySupply){box(335,167,12,7,'#817984');rect(337,168,8,5,'#5f5a66');emptyPacket(338,169);}if(G.breakfast){ellipse(263,176,9,2,'#d5c7b4');box(253,168,10,6,'#ae825b');rect(255,169,6,3,'#d2a46a');}if(G.falls>1){box(360,207,10,5,'#bdb2a7');rect(364,207,2,5,'#a57476');rect(359,215,8,2,'#c1aaa0');}
  chair(307,218);mirrorObject();if(!final){rect(386,145,48,4,'#b38b7f');rect(390,149,2,17,'#604d5e');rect(428,149,2,17,'#604d5e');picture(397,121,G.photoDown);plant(371,186,level>=2);}
  else{plant(371,186,true);if(!G.flags.photoHeld)picture(397,121,G.photoDown);rect(386,145,48,3,'#5c485b');}
  if(level<2){poster(126,86,'#738c85');box(265,75,34,30,'#cfc1b0');rect(265,75,34,6,'#b87f85');nativeText('AUG',273,80,'#272738',5);for(let y=86;y<101;y+=5)for(let x=269;x<296;x+=5)rect(x,y,2,2,'#817583');}else{rect(126,86,22,29,'#3f3a51');rect(127,86,2,2,'#776579');box(265,75,34,30,'#a697a0');rect(265,75,34,6,'#896776');nativeText(level===2?'SEP':level===3?'NOV':'DEC',272,80,'#252334',5);for(let y=86;y<101;y+=5)for(let x=269;x<296;x+=5)rect(x,y,2,2,'#6d6078');}
  box(86,227,102,21,final?'#555468':'#686b78');rect(89,230,96,15,final?'#555468':'#879285');for(let i=0;i<Math.max(0,(level-1)*3);i++){const x=214+(i*33)%160,y=218+(i*17)%33;floorClutter(x,y,i%3);}if(level>=2){box(232,211,18,8,'#aa9c9e');rect(234,208,14,3,'#c2b4af');rect(254,224,4,8,'#aa7c8e');}
  rect(414,179,21,27,'#454356');rect(416,177,17,3,'#656072');if(!late||['escapebreak','emptycheck','realisation','courseworkrealisation','mirror'].includes(G.phase)){c.globalAlpha=tod==='morning'?.16:tod==='afternoon'?.12:tod==='evening'?.08:.035;poly([[167,134],[246,134],[280,256],[91,256]],tod==='morning'?'#efe0c5':tod==='afternoon'?'#f4c993':tod==='evening'?'#d98f81':'#aea1e5');c.globalAlpha=1;}if(G.workState==='draft'&&!final){c.globalAlpha=.08;poly([[289,153],[314,153],[334,192],[264,192]],'#c9cff1');c.globalAlpha=1;}
}
function hallBackground(){const tod=currentTimeOfDay();wall(tod);nativeText('COMMON ROOM',71,128,'#cdbda9',6);nativeText('POST',414,53,'#cdbda9',6);for(let x=40;x<400;x+=137)door(x,x===40);rect(20,123,438,2,'#9a7c8a');box(410,60,38,109,'#262b3d');rect(413,63,32,103,'#3f4357');for(let i=0;i<4;i++)rect(418,85+i*19,22,2,'#77758d');box(224,59,23,8,'#d8c4a1');nativeText('EXIT',227,65,'#55716a',5);c.globalAlpha=.06;poly([[225,68],[247,68],[307,203],[165,203]],'#e2c095');c.globalAlpha=1;}

function drawPeople(){const t=clock.time;
  if(G.scene==='party'){
    if(G.commonVariant==='empty'||G.phase==='empty'){character('cleaner',403,215,{dir:-1});line(416,195,426,226,'#b5a189',2);rect(419,226,15,3,'#6c807a');}
    else if(G.phase==='after'){character('maya',133,210,{pose:'stand'});box(147,200,10,13,'#826c87');}
    else{
      const prog=G.partyProgress,guests=[['maya',153,209,1.3],['rex',250,211,.73],['dealer',393,211,.62],['nia',311,211,.47],['eli',89,218,.33]];
      for(let i=0;i<guests.length;i++){const [kind,x,y,exit]=guests[i];const departure=clamp((prog-(exit-.1))/.16);if(departure>=1)continue;let baseX=x;if(kind==='maya'&&G.high?.number===1){const away=Math.sin(clamp((prog-.18)/.7)*Math.PI);baseX=x+away*48;}const xx=mix(baseX,43,departure);const seated=kind==='maya'&&prog>.7;if(kind==='maya'&&G.fall){character('maya',G.player.x-29,215,{pose:'sit',dir:1});continue;}ellipse(xx,y+1,10,2,'#272436');character(kind,xx,seated?201:y,{dir:departure? -1:i%2? -1:1,walk:departure>0||kind==='maya'&&G.high?.number===1&&prog>.2,pose:seated?'sit':'stand',dance:departure?0:.04,high:false});}if(G.high?.number===1&&prog>.42&&prog<.88){const clean=clamp((prog-.42)/.46),cx=mix(432,350,clean);character('cleaner',cx,216,{dir:-1,walk:true});rect(cx-13,205,8,3,'#d0c2b5');rect(cx-10,202,3,3,'#b7988e');}
    }
  }else if(G.scene==='hallway'&&G.phase==='hall'){character('maya',228,218,{dir:-1});box(240,208,10,13,'#826c87');}
  const p=G.player;if(!G.high||G.intensity<.005){ellipse(p.x,p.y+1,10,2,'#272436');character('player',p.x,p.y,{walk:p.walking,dir:p.dir,pose:p.pose,angle:p.angle});}
}
const zones=[{x:364,y:181,color:'#e9a2cf',r:38},{x:121,y:94,color:'#f4c580',r:44},{x:230,y:63,color:'#bc9aff',r:40},{x:330,y:103,color:'#8eefe0',r:46}];
function drawDream(){const h=G.high,a=G.intensity;if(!h||a<.005)return;const t=clock.time,elapsed=t-h.start,late=h.number>=4;
  c.save();c.globalAlpha=a*.66;
  const grad=c.createLinearGradient(0,0,480,270);grad.addColorStop(0,'#7d366e');grad.addColorStop(.5,'#322158');grad.addColorStop(1,'#29626f');c.fillStyle=grad;c.fillRect(0,0,480,270);c.restore();
  c.save();c.globalAlpha=a*.48;const cx=294+Math.sin(t*.25)*25,cy=110;
  for(let k=7;k>=0;k--){const r=(k*31+t*13)%245;c.strokeStyle=['#ffb899','#bf8be7','#8bdacb'][k%3];c.lineWidth=1;c.beginPath();for(let j=0;j<=100;j++){const ang=j/100*TAU,rr=r*(1+.12*Math.sin(ang*5+t*.45));const x=cx+Math.cos(ang)*rr*1.2,y=cy+Math.sin(ang)*rr*.64;if(j===0)c.moveTo(x,y);else c.lineTo(x,y);}c.stroke();}c.restore();
  // The familiar window opens into an impossible, breathing landscape.
  if(!late){const wx=G.scene==='party'?276:168,wy=G.scene==='party'?76:62,stretch=1+.22*Math.sin(t*.7)+G.zoneEnergy[3]*.2;c.save();c.globalAlpha=a*.92;c.translate(wx+38,wy+32);c.scale(stretch,1+.1*Math.cos(t*.6));c.beginPath();c.rect(-39,-34,78,68);c.clip();rect(-39,-34,78,68,'#46336f');for(let j=0;j<8;j++)rect(-39,-34+j*6,78,6,['#72539d','#81549d','#a568a3','#c583a8','#e5aaa7','#efc19f','#c3c5b0','#94ccc0'][j]);disk(15,-12,14,'#f5dcb0');for(let layer=0;layer<3;layer++){const points=[[-45,36]];for(let x=-45;x<=45;x+=4)points.push([x,4+layer*10+Math.sin(x*.07+t*.24+layer*2)*9]);points.push([45,36]);poly(points,['#806298','#597f96','#426d88'][layer]);}for(let j=0;j<5;j++)rect(-5+Math.sin(t+j)*6,15+j*4,26-j*4,1,'#c9d7c6');c.restore();}
  // Familiar obligations temporarily become pleasing patterns, not solved tasks.
  if(G.scene==='bedroom'&&!late){
    c.save();c.globalAlpha=a;rect(286,149,31,26,'#45366d');for(let i=0;i<6;i++){const yy=152+i*4;line(288,yy,314,yy+Math.sin(t*2+i)*4,['#b8e6d0','#bb9ee8','#f0bfaa'][i%3],2);}rect(174,177,8,11,'#a894e2');for(let i=0;i<5;i++){const y=177-(elapsed*6+i*11)%75;pixelStar(179+Math.sin(t+i)*12,y,'#c3eee0',2);}if(!G.photoDown&&G.level<4){c.globalAlpha=a*.4;ellipse(413,130,27,34,'#f6b697');}c.restore();
  }
  if(h.number===1){
    // The impression of company lingers, while actual NPCs have already left.
    c.save();c.globalAlpha=a*.45;
    for(const [kind,x,y] of [['maya',153,205],['rex',250,209],['dealer',393,207],['nia',311,207]])character(kind,x+Math.sin(t+x)*2,y+Math.sin(t*2+x)*3,{high:true,dance:.12,alpha:a*.5});c.restore();
  }
  for(let i=0;i<zones.length;i++){
    if(late&&i>0)continue;if(h.number===3&&i===2&&elapsed>8)continue;if(late&&elapsed>4.7)continue;
    const z=zones[i],e=G.zoneEnergy[i],pulse=1+Math.sin(t*2+i)*.07,x=z.x+Math.sin(t*.7+i)*8,y=z.y+Math.cos(t*.8+i)*10;
    c.save();c.globalAlpha=a*(.1+e*.13);ellipse(x,y,z.r*pulse,z.r*.64,z.color);c.globalAlpha=a*(.38+e*.35);c.strokeStyle=z.color;c.lineWidth=1;c.beginPath();c.ellipse(x,y,z.r*pulse,z.r*.64,Math.sin(t*.4+i)*.4,0,TAU);c.stroke();for(let j=0;j<7;j++){const an=t*.5+j*TAU/7;pixelStar(x+Math.cos(an)*z.r*.78,y+Math.sin(an)*z.r*.51,z.color,j%3===0?2:1);}c.restore();
  }
  if(!late){c.save();c.globalAlpha=a*.55;for(let i=0;i<26;i++){const xx=(i*47+t*(i%2?4:-3)+960)%480,yy=(i*29-t*(i%3+2)+540)%230;pixelStar(xx,yy,['#ffe0b1','#b6f0df','#c7a5f3'][i%3],i%6===0?2:1);}c.restore();}
  for(const r of G.ripples){c.save();c.globalAlpha=clamp(r.life)*a*.7;c.strokeStyle=r.color;c.lineWidth=1;c.beginPath();c.ellipse(r.x,r.y,10+(1-r.life)*85,5+(1-r.life)*40,0,0,TAU);c.stroke();c.restore();}
  if(settings.motion==='full')for(let i=0;i<G.trails.length;i++){const p=G.trails[i];character('player',p.x,p.y,{dir:p.dir,angle:p.angle,high:true,alpha:i/G.trails.length*a*.23});}
  const p=G.player;ellipse(p.x,220,10-(218-p.y)/35,2,'#252236');character('player',p.x,p.y,{dir:p.dir,angle:settings.motion==='full'?p.angle:Math.sin(t)*.06,high:!late});
  for(const s of G.sparks){c.save();c.globalAlpha=s.life;rect(s.x,s.y,s.size,s.size,s.color);c.restore();}
  if(h.number===2&&elapsed>11&&elapsed<15){c.save();c.globalAlpha=.75;phoneProp(174,177,false);c.restore();}
  if(h.number===3&&!h.compressed&&elapsed>9&&elapsed<14){c.save();c.globalAlpha=.22*(1-Math.abs(elapsed-11.5)/2.5);character('maya',153,205,{alpha:c.globalAlpha,pose:'sit'});c.restore();}
  // Local windows into reality replace abrupt full-screen flashes.
  if(h.number===1&&elapsed>h.duration*.42&&elapsed<h.duration*.97){const rs=h.duration*.42,re=h.duration*.97;c.save();c.globalAlpha=smooth((elapsed-rs)/(h.duration*.18))*.48*(1-smooth((elapsed-(re-h.duration*.15))/(h.duration*.15)));if(G.partyProgress>.55)character('maya',198,211,{dir:-1,walk:true});c.restore();}
}
function draw(){const t=clock.time;
  if(G.scene==='party')partyBackground();else if(G.scene==='hallway')hallBackground();else bedroomBackground();drawPeople();drawDream();
  if(G.scene==='party'&&G.commonVariant==='empty'&&!G.call){const buzz=phoneBuzzState();if(buzz)drawPhoneBuzzCue(G.player.x+7,G.player.y-15,buzz);}
  // After ~20 seconds without meaningful progress, softly glint the next useful state-specific target.
  const guide=idleGuidanceTarget();if(guide){const cycle=(t%1.6)/1.6,pulse=cycle<.22?0:cycle<.45?smooth((cycle-.22)/.23):cycle<.65?1:1-smooth((cycle-.65)/.35);c.save();c.globalAlpha=pulse;disk(guide.x,guide.y-12,4,'#32283b');disk(guide.x,guide.y-12,3,'#ffe99a');disk(guide.x,guide.y-12,1,'#fff9df');c.restore();}
  screen.fillStyle='#191426';screen.fillRect(0,0,480,270);screen.save();
  if(G.high&&settings.motion==='full'&&!G.cinematic){
    const a=G.intensity,zoom=1.045+a*(.027+.018*Math.sin(t*.6));screen.translate(240,135);screen.rotate(Math.sin(t*.38)*.022*a);screen.scale(zoom,zoom);screen.translate(-240,-135);
    for(let y=0;y<270;y+=3){const shift=Math.sin(y*.025+t*.8)*5*a+Math.sin(y*.08-t*1.1)*1.5*a;screen.drawImage(buffer,0,y,480,3,shift,y,480,3);}
  }else screen.drawImage(buffer,0,0);
  screen.restore();
}

async function showPolaroidMemory(hold=1.78,{paper=true,dissolve=0,flash=true,handoffFromReflection=false}={}){
  G.cinematic=true;G.keys.clear();G.target=null;
  if(flash){audio.fx('camera');ui.curtain.style.background='#fff2d8';await clock.tween(.07,t=>ui.curtain.style.opacity=t*.88);await clock.tween(.15,t=>ui.curtain.style.opacity=.88*(1-t));ui.curtain.style.background='#12121b';}
  ui.memoryPhoto.style.opacity='1';ui.memoryPhoto.hidden=false;ui.memoryPhoto.classList.remove('settled');if(handoffFromReflection)ui.memoryPhoto.classList.add('retrospective-handoff');void ui.memoryPhoto.offsetWidth;ui.memoryPhoto.classList.add('settled');
  if(handoffFromReflection){ui.reflection.hidden=true;ui.reflectionText.replaceChildren();delete ui.reflection.dataset.mode;delete ui.reflection.dataset.courseTone;}
  if(paper)audio.fx('paper');await clock.wait(hold);
  if(dissolve>0)await clock.tween(dissolve,t=>ui.memoryPhoto.style.opacity=String(1-smooth(t)));
  ui.memoryPhoto.hidden=true;ui.memoryPhoto.style.opacity='';ui.memoryPhoto.classList.remove('settled','retrospective-handoff');G.cinematic=false;ui.stage.focus({preventScroll:true});
}
function drawMirrorClose(stage=mirrorStage()){
 const cv=ui.mirrorClose,mc=cv.getContext('2d',{alpha:false}),tod=currentTimeOfDay();mc.imageSmoothingEnabled=false;
 mc.fillStyle='#15131c';mc.fillRect(0,0,480,270);
 mc.fillStyle=stage>=4?'#7b6975':'#96828e';mc.fillRect(149,25,182,220);
 mc.fillStyle='#656b7b';mc.fillRect(160,36,160,198);
 mc.fillStyle='#4b5263';mc.fillRect(172,48,136,174);
 mc.fillStyle={morning:'rgba(242,216,180,.10)',afternoon:'rgba(242,201,147,.08)',evening:'rgba(217,143,129,.05)',night:'rgba(174,161,229,.025)'}[tod];mc.fillRect(172,48,136,174);
 // Reuse the gameplay character renderer itself so the reflection inherits the real late-game slouch, tired eyes and injuries.
 mc.save();mc.beginPath();mc.rect(172,48,136,174);mc.clip();
 const angle=stage>=4?.07:stage>=3?.035:0;
 character('player',240,216,{dir:-1,angle,pose:'stand',deteriorationStage:stage,injuryStage:stage>=4?2:stage>=3?1:0},mc,4.1);
 mc.restore();
 // Glass wear stays subtle and separate from the character deterioration.
 mc.strokeStyle='rgba(135,139,153,.42)';mc.lineWidth=2;mc.beginPath();mc.moveTo(187,65);mc.lineTo(226,105);mc.moveTo(187,92);mc.lineTo(208,113);if(stage>=4){mc.moveTo(292,184);mc.lineTo(301,205);}mc.stroke();
}
async function mirrorLook(){
 const mandatory=G.phase==='mirror',stage=mirrorStage();clearThought();G.keys.clear();G.target=null;
 const startX=G.player.x;G.player.dir=startX<=106?1:-1;G.player.walking=true;await clock.tween(.55,t=>G.player.x=mix(startX,106,t));G.player.walking=false;G.player.dir=1;G.mirror=true;
 if(!mandatory){
   const line=stage<=1?'Long weekend.':stage===2?'I need some sleep.':'I’ve looked better.';
   await clock.wait(.28);thought(line,2.15);await clock.wait(2.25);clearThought();G.mirror=false;refreshObjects();return;
 }
 audio.setMode('silent');await clock.wait(.35);G.cinematic=true;drawMirrorClose(stage);ui.mirrorLine.textContent='';ui.mirrorView.hidden=false;await clock.wait(1.55);
 ui.mirrorLine.textContent='...';await clock.wait(.55);ui.mirrorLine.textContent='how long have I looked like this?';
 await waitBeat();ui.mirrorView.hidden=true;ui.mirrorLine.textContent='';G.cinematic=false;G.mirror=false;audio.setMode('room');
 G.flags.mirrorFaced=true;G.phase='finalphoto';ui.stage.dataset.phase='finalphoto';thought('The photo.',3.2);refreshObjects();
}
async function automaticMirrorGlimpse(){
 if(G.flags.mirrorGlimpsed||G.phase!=='mirrorwalk')return;G.flags.mirrorGlimpsed=true;G.keys.clear();G.target=null;G.player.walking=false;G.mirror=true;audio.setMode('silent');await clock.wait(.72);thought('wait.',1.35);await clock.wait(1.45);G.phase='mirror';ui.stage.dataset.phase='mirror';audio.setMode('room');thought('E — LOOK',3600);refreshObjects();
}
async function firstMaya(){
  G.player.x=129;G.player.dir=1;
  if(G.flags.met){await say([['MAYA','You okay?'],['YOU','Yeah. Just loud.'],['MAYA','Stay by me a sec.']]);return;}
  await say([['MAYA','Oi. Saved you a seat.'],['YOU','The half without crisp dust?'],['MAYA','Luxury. Sit.']]);
  G.player.pose='sit';G.player.y=201;G.player.x=132;await clock.wait(.65);
  await say([['MAYA','Last crisp. Photo?']]);
  await showPolaroidMemory();
  await say([['MAYA','Delete that. I blinked.'],['YOU','Absolutely not.'],['MAYA','Lunch tomorrow. Table by the fan?'],['YOU','Twelve.']]);
  G.player.pose='stand';G.player.y=218;G.flags.met=true;G.flags.bonded=true;G.flags.photoMade=true;
  message('MAYA','Twelve tomorrow. Table by the fan :)','21 AUG · 10:42 PM');G.phoneLit=true;
  G.partyProgress=.08;thought('Everyone already knows each other.',2.4);await clock.wait(.7);thought('Maya’s having fun. Don’t make this weird.',2.8);
  later(2.2,()=>{if(G.phase==='party'&&!G.flags.usedFirst)thought('REX: “You alright?”',2.6);});
}

async function rexTalk(){
  G.player.x=226;G.player.dir=1;
  if(!G.flags.bonded){await say([['REX','Maya’s been waving at you. Go rescue your seat.']]);return;}
  if(G.flags.usedFirst){await say([['REX','You alright?'],['YOU','Yeah.']]);return;}
  G.partyProgress=.22;
  await say([['REX','You alright?'],['YOU','It’s loud. I can’t switch my head off.'],['REX','When mine won’t shut up, this helps me switch off for a bit.']]);
  await escapeChoice('You want the noise to stop.','A pink-and-white pill. A drug.\nRex says it helps him switch off for a bit.');
  G.flags.usedFirst=true;const returnX=G.player.x;
  await playHigh(1,13,{minutes:43,returnToStart:true,suppressAftermath:true,partyContinuity:true});
  setScene('after','party',0,'FRIDAY · 21 AUGUST',G.minutes);G.partyProgress=.84;G.player.x=returnX;audio.setMode('party');
  // Let the quieter room register before any notification or explanation covers it.
  await clock.wait(.8);
  message('MAYA','where’d you go? saved your seat','21 AUG · 11:57 PM');
  // This is evidence in the later thread, not a new alert from someone standing beside us.
  notifyMessage('MAYA','where’d you go? saved your seat','MAYA · 11:57 PM');
  refreshObjects();
}
async function partyPhone(){openPhone('MUM','Earlier today');watchOpeningMumRead();const a=await phoneChoice(G.flags.mumThanks?[{id:'close',label:'PUT AWAY'}]:[{id:'thanks',label:'THANKS MUM'},{id:'close',label:'PUT AWAY'}]);if(a==='thanks'){markOpeningMumRead();await send('MUM','thanks mum');G.flags.mumThanks=true;}const opening=openingAttention();if(opening){opening.mumReadWatchActive=false;opening.mumReadVisibleSince=0;}closePhone();if(opening&&!opening.mumRead&&!opening.windowClosed)G.phoneLit=true;}
async function eliTalk(){G.player.x=65;G.player.dir=1;await say(G.flags.eli?[['ELI','Speaker survived. Somehow.']]:[['ELI','Yo.'],['YOU','Hey.'],['ELI','Maya said you’d show.']]);G.flags.eli=true;}
async function samTalk(){await say([['SAM','Is this your first one of these?'],['YOU','That obvious?'],['SAM','I still never know where to stand.']]);}
async function niaTalk(){G.player.x=287;G.player.dir=1;await say(G.flags.nia?[['NIA','I’m keeping the blurry one.']]:[['NIA','You’re finally here.'],['YOU','Apparently.'],['NIA','Don’t disappear before the group photo.']]);G.flags.nia=true;}

async function mumMoment(visit){
  if(G.flags['mum_'+visit])return visit==='opening'?(G.flags.openingMumMessageId||'opening-mum-fun'):null;G.flags['mum_'+visit]=true;
  if(visit==='opening'){
    message('MUM','Left dinner in the freezer. Blue lid.','21 AUG · 6:18 PM',false,'opening-mum-dinner');message('MUM','Have fun tonight ❤️','21 AUG · 6:19 PM',false,'opening-mum-fun');G.flags.openingMumMessageId='opening-mum-fun';G.phoneLit=true;return G.flags.openingMumMessageId;
  }
  const beats={
    room1:['Did you get home okay after the party? You forgot to text me.','22 AUG · 9:12 AM','The weekend','got home. sorry, forgot to text.','Glad you’re home. Call when you’ve eaten?'],
    room2:[G.flags.mumReply_room1?'How did the assignment go? Come for Sunday lunch?':'Sunday lunch? I’ll make the one you like.','1 SEP · 6:04 PM','Yesterday','i’ll try to come sunday','I’d like that. I’ll save you a plate.'],
    room3:['I put your plate back in the cupboard. We can try another day.','7 SEP · 8:23 PM','Last week','sorry about sunday','You don’t need a special reason to come home.']
  };
  const [text,date,sub,reply,response]=beats[visit];message('MUM',text,date);audio.fx('phone');openPhone('MUM',sub);
  const a=await phoneChoice([{id:'reply',label:'WRITE BACK'},{id:'later',label:'LATER'}]);
  if(a==='reply'){await send('MUM',reply);G.flags['mumReply_'+visit]=true;await clock.wait(1);message('MUM',response,messageStamp());renderMessages('MUM');await phoneChoice([{id:'close',label:'PUT AWAY'}]);}
  closePhone();
}
async function messagesMenu(){
  const contacts=G.phase==='room3'?[{id:'mum',label:G.flags.mumRead3?'MUM':'MUM · UNREAD'},{id:'maya',label:'MAYA'}]:[{id:'maya',label:'MAYA'},{id:'mum',label:'MUM'}];
  const a=await choose('Messages','',[...contacts,{id:'close',label:'PUT AWAY'}],'YOUR PHONE');
  if(a==='maya')await roomPhone();
  else if(a==='mum'){
    if(G.phase==='room3'){await mumLateReply();return;}
    openPhone('MUM','Conversation');const eligible=['room1','room2'].includes(G.phase)&&!G.flags['mumReply_'+G.phase];
    const b=await phoneChoice(eligible?[{id:'reply',label:'WRITE BACK'},{id:'close',label:'PUT AWAY'}]:[{id:'close',label:'PUT AWAY'}]);
    if(b==='reply'){
      await send('MUM',G.phase==='room1'?'got home. sorry, forgot to text.':'i’ll try to come sunday');G.flags['mumReply_'+G.phase]=true;await clock.wait(.8);
      message('MUM',G.phase==='room1'?'Glad you’re home. Call when you’ve eaten?':'I’d like that. I’ll save you a plate.',messageStamp());renderMessages('MUM');await phoneChoice([{id:'close',label:'PUT AWAY'}]);
    }
    closePhone();
  }
}

async function offer(){
  G.player.x=370;G.player.dir=1;
  if(!G.flags.met){await say([['STRANGER','Think your friend’s saving you a seat.']]);return;}
  await say(G.flags.offered?[['STRANGER','Hey again.']]:[['STRANGER','Long week?'],['YOU','Still happening in my head.'],['STRANGER','I’ve got a pill, if you want one.']]);G.flags.offered=true;
  const a=await choose('Just for a little while.','A pink-and-white pill. A drug.\nI want to feel like being here.',[{id:'take',label:'TAKE'},{id:'leave',label:'LEAVE IT FOR NOW'}],'THE OFFER');
  if(a==='leave'){
    await say([['STRANGER','No worries.']]);
    if(!G.flags.declined){G.flags.declined=true;G.player.x=177;await say([['MAYA','Found the last crisp.'],['YOU','You’re giving it to me?'],['MAYA','Don’t make it weird.']]);thought('I stay a little longer.',4);G.minutes+=24;}return;
  }
  await playHigh(1);
  setScene('after','party',0,'SATURDAY · 22 AUGUST',150);G.partyProgress=1;G.player.x=262;audio.setMode('silent');refreshObjects();
}
async function afterMaya(){
  G.player.x=109;G.player.dir=1;
  if(G.flags.afterTalk){await say([['MAYA','Come on. I’ll walk you out.']]);return;}
  await say([['MAYA','There you are. I thought you left.'],['YOU','What time is it?'],['MAYA','Nearly midnight. You kept saying “one sec”.'],['MAYA','Lunch tomorrow. Don’t vanish on me.']]);G.flags.afterTalk=true;
}

async function leaveParty(){
  clearMoment('leave-opening-party');audio.fx('door');await fade(1,.38);setScene('hall','hallway',0,'FRIDAY · 21 AUGUST',23*60+59);G.player.x=162;audio.setMode('room');await fade(0,.3);
  await say([['MAYA','Text me when you get in.']]);
  await normalPassageTransition('3 DAYS LATER','MONDAY · 24 AUGUST 2026','evening');
  setScene('room1','bedroom',1,'MONDAY · 24 AUGUST',20*60+10,'evening');G.player.x=284;G.player.pose='sit';G.showPill=true;G.workState='draft';audio.setMode('room');
  message('MAYA','Home?','22 AUG · 3:06 AM');message('MAYA','got us the table by the fan','SATURDAY · 12:04 PM');message('MAYA','you coming?','SATURDAY · 12:26 PM');message('MAYA','shit sorry just woke up','SATURDAY · 1:38 PM',true);message('MAYA','😭 another day then','SATURDAY · 1:40 PM');message('MAYA','yeah tomorrow?','SATURDAY · 1:42 PM',true);message('MAYA','tomorrow works. same time?','SATURDAY · 1:44 PM');message('MAYA','you still coming?','SUNDAY · 12:15 PM');message('COURSE','FINAL DRAFT · Question 2 / 2 · Paragraph 3\nDeadline: 11:00 PM.','24 AUG · 9:00 AM');message('MUM','Did you get home okay after the party? You forgot to text me.','24 AUG · 7:42 PM');G.phoneLit=true;await fade(0,.45);await chapterMarker('MONDAY · 24 AUGUST 2026','3 DAYS LATER');
  await say([['YOU','I missed lunch with Maya. Now my draft is due at eleven, and paragraph three is still open.']]);audio.fx('phone');
  showTimedMoment('room1-waiting','TWO THINGS WAITING','COURSEWORK · DUE 11:00 PM\nMAYA · MISSED LUNCH',5);
  G.player.pose='stand';thought('Work or Maya. Start with one.',4.2);refreshObjects();
}
async function roomPhone(replyNow=false){
  const phase=G.phase;G.flags['phone_'+phase]=true;
  if(phase==='room1'){
    openPhone('MAYA','Conversation');
    if(G.flags.replied1){await phoneChoice([{id:'close',label:'PUT AWAY'}]);closePhone();return;}
    const workFirst=G.flags.firstPriority==='work';
    if(workFirst)G.flags.room1MayaAttempted=true;
    const a=await phoneChoice([{id:'reply',label:'WRITE BACK'},{id:'close',label:'PUT AWAY'}]);
    if(a==='reply'){
      if(workFirst){await send('MAYA','sorry. i vanished. can we try again?');G.flags.replied1=true;await clock.wait(.7);message('MAYA','yeah. table by the fan when you’re ready.',messageStamp());renderMessages('MAYA');}
      else{await send('MAYA','sorry about saturday. and yesterday');if(!G.flags.firstPriority)G.flags.firstPriority='maya';G.flags.replied1=true;await clock.wait(.7);message('MAYA','you owe me lunch now',messageStamp());renderMessages('MAYA');await clock.wait(.75);await send('MAYA','fair 😭');}
      G.flags.replied1=true;
      await phoneChoice([{id:'close',label:'PUT AWAY'}]);closePhone();
      thought(workFirst?'That was awkward. It still moved forward.':'I dealt with that. The coursework is still open.',4);return;
    }
    closePhone();thought('I put the phone down. The message is still there, but I chose what to do next.',3.8);return;
  }
  if(phase==='room2'){
    openPhone('MAYA','Tonight');G.flags.room2Discomfort=true;
    await draftMoment('maya2');G.flags.mayaStruggle2=true;
    phoneThought('If I answer, I have to admit I left her waiting again.');await typeDraft('yeah. give me ten—');G.flags.mayaPendingDraft=ui.draftText.textContent;
    const a=await phoneEscapeChoice([{id:'continue',label:'KEEP WRITING'}],'middle');
    if(a==='escape'){closePhone();await performBedroomEscape('room2','maya');return;}
    phoneThought('');await deleteDraft();await typeDraft('sorry. i can still—');await clock.wait(.35);phoneThought('Another apology. Nothing to show her has changed.');G.flags.mayaPendingDraft=ui.draftText.textContent;await waitForPhoneReadingAck();
    phoneThought('what am i even trying to say');await clock.wait(.45);
    await forcedEscapeChoice('', 'I can’t explain all of it tonight.', true);
    closePhone();await performBedroomEscape('room2','maya');return;
  }
  if(phase==='room3'){
    openPhone('MAYA','Earlier');await phoneChoice([{id:'close',label:'PUT AWAY'}]);closePhone();return;
  }
  if(phase==='postcycle'){
    openPhone('MAYA','Last message');const a=await phoneChoice(G.flags.lastSent?[{id:'close',label:'PUT AWAY'}]:[{id:'reply',label:'SEND A MESSAGE'},{id:'close',label:'PUT AWAY'}]);
    if(a==='reply'){await send('MAYA','I still have the photo.');G.flags.lastSent=true;await phoneChoice([{id:'close',label:'PUT AWAY'}]);}closePhone();return;
  }
  openPhone('MAYA','No new messages');await phoneChoice([{id:'close',label:'PUT AWAY'}]);closePhone();
}

async function photoLook(){
  if(G.phase==='room1'){await say([['YOU','Of course she blinked.'],['YOU','“table by the fan :)” — she wrote it underneath.']]);G.flags.photoSeen=true;}
  else if(G.phase==='finalphoto'){
    clearThought();
    if(G.photoDown){const a=await choose('The Polaroid.','',[{id:'up',label:'TURN OVER',primary:true}]);if(a==='up'){G.photoDown=false;G.flags.photoKept=true;}}
    await showPolaroidMemory(.9,{paper:false});G.photoDown=false;G.flags.photoKept=true;G.flags.finalPhotoComplete=true;G.phase='postcycle';ui.stage.dataset.phase='postcycle';pointerActionBlockedUntil=performance.now()+240;thought('Maybe she still sits there.',3600);refreshObjects();
  }
  else if(G.phase==='postcycle'&&G.flags.finalPhotoComplete){await showPolaroidMemory(.72,{paper:false});G.photoDown=false;G.flags.photoKept=true;thought('Maybe she still sits there.',3.3);}
  else if(G.photoDown){await say([['YOU','Still here.']]);const a=await choose('The Polaroid.','',[{id:'up',label:'TURN IT OVER'},{id:'leave',label:'LEAVE IT'}]);if(a==='up'){G.photoDown=false;G.flags.photoKept=true;thought('Her ears didn’t fit in the frame.',4);}}
  else{await say([['YOU','We never took another one.']]);const a=await choose('The Polaroid.','',[{id:'keep',label:'LEAVE IT UP'},{id:'down',label:'LAY IT FACE DOWN'}]);if(a==='down'){G.photoDown=true;G.flags.photoKept=false;}else G.flags.photoKept=true;}
}
async function work(){
  if(G.phase==='room1'){
    if(!G.flags.firstPriority){
      const a=await choose('FINAL DRAFT · QUESTION 2 / 2','Paragraph 3 still says [citation needed]. Deadline: 11:00 PM.',[{id:'source',label:'OPEN SOURCE NOTES',primary:true},{id:'close',label:'CLOSE'}],'COURSEWORK · DUE 11:00 PM');
      if(a==='close')return;
      const b=await choose('SOURCE NOTES','Two tabs are open. Which one actually supports the paragraph?',[{id:'article',label:'ARTICLE — TAN, 2025',primary:true},{id:'slides',label:'LECTURE SLIDES'}],'ONE SMALL TASK');
      if(b==='slides')await say([['YOU','No. That slide doesn’t support it.'],['YOU','The article does.']]);
      G.flags.workStarted=true;G.flags.wrote=true;G.flags.firstPriority='work';G.workState='draft';
      thought('Okay. That one makes sense.',4.5);return;
    }
    if(G.flags.firstPriority==='work'&&!G.flags.room1MayaAttempted){thought('The document can wait thirty seconds. Maya’s message is still there.',4.5);return;}
    const a=await choose('FINAL DRAFT · QUESTION 2 / 2','Paragraph 3 starts: “This suggests…”\nDeadline: 11:00 PM.',[{id:'read',label:'READ IT AGAIN',primary:true},{id:'close',label:'CLOSE'}],'COURSEWORK');
    if(a==='close')return;
    G.player.x=304;G.player.pose='sit';G.player.y=212;G.typing=1;thought('read it again',2.0);await clock.wait(2.0);thought('didn’t take any of that in',2.5);await clock.wait(2.0);G.typing=0;G.player.pose='stand';G.player.y=218;G.flags.room1Discomfort=true;
    const b=await escapeChoice('The cursor keeps blinking.','You can keep working. ESCAPE is there, but it has not taken the task away.',[{id:'continue',label:'KEEP GOING'}],'early');
    if(b==='escape'){await performBedroomEscape('room1','work');return;}
    G.flags.workProgress=2;G.typing=1;G.player.pose='sit';G.player.y=212;thought('One sentence. Then the next.',2.4);await clock.wait(2.1);G.typing=0;G.player.pose='stand';G.player.y=218;
    const c=await escapeChoice('The paragraph finally makes sense.','The draft is rough, but it exists. You can send what you have.',[{id:'submit',label:'SUBMIT WHAT I HAVE',primary:true}],'strong');
    if(c==='escape'){await performBedroomEscape('room1','work');return;}
    G.flags.workProgress=3;G.flags.room1Resisted=true;await submitDraft();await say([['YOU','It’s rough. It’s sent.']]);
    await enterRoom2(false);return;
  }
  openPhone('COURSE',G.flags.draftSent?'Your draft is still attached':'Submission history');await phoneChoice([{id:'close',label:'CLOSE'}]);closePhone();
  thought(G.flags.draftSent?'At least I sent that part.':'The tab’s been open longer than the deadline.',4.5);
}

async function attemptClosedSubmission(){
  if(G.flags.closedSubmissionAcknowledged)return;
  clearThought();G.player.x=304;G.player.pose='sit';G.player.y=212;openPhone('COURSE','FINAL DRAFT · QUESTION 2 / 2');
  ui.draft.hidden=false;ui.draftText.textContent=G.flags.courseDraftText||'This suggests the intervention may improve…';phoneThought('Autosaved. Not submitted.');
  const a=await phoneChoice([{id:'submit',label:'SUBMIT',primary:true}]);
  if(a==='submit'){
    audio.fx('dry');G.flags.closedSubmissionAttempted=true;ui.draft.hidden=true;phoneThought('');
    message('COURSE','SUBMISSION CLOSED\nDeadline: 11:00 PM.','24 AUG · 11:52 PM');renderMessages('COURSE');
    await waitForPhoneReadingAck();
  }
  closePhone();G.flags.closedSubmissionAcknowledged=true;G.flags.cursorBlink=false;G.workState='late';G.player.pose='stand';G.player.y=218;
  await say([['YOU','What? No—how is it already closed?'],['YOU','I missed it.']]);await clock.wait(.65);await enterRoom2(true);
}
async function mayaAfterEscape(){
  if(G.flags.mayaAfterSeen)return;G.flags.mayaAfterSeen=true;clearThought();openPhone('MAYA','Tonight');ui.draft.hidden=false;ui.draftText.textContent=G.flags.mayaPendingDraft||'sorry. i can still—';phoneThought('UNSENT');
  await phoneChoice([{id:'close',label:'PUT AWAY'}]);closePhone();await say([['YOU','She waited again. I didn’t even send it.']]);await enterRoom3();
}
async function mumAfterEscape(){
  if(G.flags.mumAfterSeen)return;G.flags.mumAfterSeen=true;clearThought();openPhone('MUM','Tonight');ui.draft.hidden=false;ui.draftText.textContent=G.flags.mumPendingDraft||'i just—';phoneThought('UNSENT');
  await phoneChoice([{id:'close',label:'PUT AWAY'}]);closePhone();await clock.wait(1.3);thought('I still haven’t replied to Mum.',2.1);await clock.wait(2.25);clearThought();thought('Tomorrow. I’ll answer tomorrow.',2.4);await clock.wait(2.55);clearThought();await montage();
}
async function enterRoom3(){
  await normalPassageTransition('12 DAYS LATER','MONDAY · 14 SEPTEMBER 2026','evening');
  setScene('room3','bedroom',3,'MONDAY · 14 SEPTEMBER',19*60+26,'evening');G.player.x=115;G.showPill=true;G.workState=G.flags.draftSent?'sent':'late';G.photoDown=true;G.flags.escapeVisible3=false;audio.setMode('room');
  message('MUM','Made too much again. There’s a portion here if you want it.','7 SEP · 8:23 PM');message('MUM','don’t worry about calling tonight','11 SEP · 8:05 PM');message('MUM','just let me know you’re okay','13 SEP · 4:16 PM');message('COURSE',G.flags.draftSent?'The module closes this week. Your missing references remain outstanding.':'No submission received. The module closes this week. Please contact your tutor.','14 SEP · 9:00 AM');
  message('MAYA','hope you’re okay. no pressure to answer tonight.','13 SEP · 7:12 PM');G.phoneLit=true;await fade(0,.65);await chapterMarker('MONDAY · 14 SEPTEMBER 2026','12 DAYS LATER');audio.fx('phone');await acknowledgedMoment('MUM · YESTERDAY','just let me know you’re okay');thought('I should at least open it.',4);refreshObjects();
}

async function submitDraft(){G.flags.draftSent=true;G.workState='sent';message('COURSE','Draft received. Please send the missing references by Friday.',messageStamp());audio.fx('send');thought('Sent. Not finished. But sent.',4.5);await clock.wait(1.5);}

async function enterRoom2(room1Escaped){
  await normalPassageTransition('9 DAYS LATER','WEDNESDAY · 2 SEPTEMBER 2026','evening');
  setScene('room2','bedroom',2,'WEDNESDAY · 2 SEPTEMBER',20*60+43,'evening');G.player.x=115;G.showPill=true;G.photoDown=false;G.flags.escapeVisible2=false;G.workState=room1Escaped?'late':'sent';audio.setMode('room');
  if(room1Escaped){
    if(G.flags.firstPriority==='maya'){message('MAYA','and crisps. don’t forget','24 AUG · 8:16 PM');message('MAYA','table by the fan?','1 SEP · 5:41 PM');message('MAYA','guess today’s not happening. maybe another time','1 SEP · 7:18 PM');}
    else{message('MAYA','you alive?','28 AUG · 6:20 PM');message('MAYA','table by the fan?','1 SEP · 5:41 PM');message('MAYA','guess today’s not happening. maybe another time','1 SEP · 7:18 PM');}
    message('COURSE','No submission received. Submissions are closed. Please arrange a meeting.','31 AUG · 9:00 AM');
  }else{
    message('MAYA',G.flags.replied1?'table by the fan this week?':'you alive?','1 SEP · 5:41 PM');
    message('COURSE','Draft received. Missing references are still due Friday.','31 AUG · 9:00 AM');
  }
  message('MAYA','remember the party photo 😭','2 SEP · 7:02 PM');message('MAYA',"miss hanging out with you",'2 SEP · 7:03 PM');message('MAYA','got the table by the fan. i’m here till 10 if you wanna come?','2 SEP · 7:04 PM');G.phoneLit=true;
  await fade(0,.7);await chapterMarker('WEDNESDAY · 2 SEPTEMBER 2026','9 DAYS LATER');thought(room1Escaped?(G.flags.firstPriority==='maya'?'Maya answered. The deadline didn’t wait.':'The paragraph is still there. Submissions are closed. Maya’s message is harder to open.'):'The draft went through. Maya’s message is still harder to open.',4.3);await mumMoment('room2');audio.fx('phone');refreshObjects();
}
async function mumLateReply(){
  G.flags.mumStruggle3=true;G.flags.room3Discomfort=true;openPhone('MUM','Recent messages');
  await draftMoment('mum');phoneThought('I don’t know how to make this sound normal.');await typeDraft('sorry mum. i just—');G.flags.mumPendingDraft=ui.draftText.textContent;
  const a=await phoneEscapeChoice([{id:'continue',label:'TRY ONCE MORE'}],'strong');
  if(a==='escape'){closePhone();await performBedroomEscape('room3','mum');return;}
  phoneThought('');await deleteDraft();await typeDraft('i just need a bit—');G.flags.mumPendingDraft=ui.draftText.textContent;await clock.wait(.3);phoneThought('she knows something’s wrong');await waitForPhoneReadingAck();
  await forcedEscapeChoice('', 'I can’t explain all of it tonight.', true);closePhone();await performBedroomEscape('room3','mum');
}
async function performBedroomEscape(phase,source='desk'){
  if(G.flags.escaping)return;G.flags.escaping=true;setEscapeFocus(false);closePhone();ui.choice.hidden=true;delete ui.stage.dataset.escapePrompt;delete ui.stage.dataset.escapePressure;
  const count=G.flags.postPartyEscapes||0;const highNumber=Math.min(4,2+count);G.flags.postPartyEscapes=count+1;
  const returnX=G.player.x;
  if(phase==='room1'){
    G.flags.room1Escaped=true;if(!G.flags.firstPriority)G.flags.firstPriority=source==='maya'?'maya':'work';G.flags.courseDraftText=G.flags.workProgress>=2?'This suggests the intervention may improve…':'This suggests…';
    const target=23*60+52;const reliefMinutes=Math.max(1,target-G.minutes);await playHigh(highNumber,8,{minutes:reliefMinutes,returnToStart:true,suppressAftermath:true,preserveWorkState:true});
    setScene('room1after','bedroom',1,'MONDAY · 24 AUGUST',target,'night');G.player.x=304;G.player.pose='sit';G.player.y=212;G.showPill=true;G.workState='draft';G.flags.cursorBlink=true;audio.setMode('room');
    await clock.wait(.9);thought('E — LAPTOP · SUBMIT',3600);refreshObjects();
  }else if(phase==='room2'){
    G.flags.room2Escaped=true;const target=23*60;const reliefMinutes=Math.max(1,target-G.minutes);await playHigh(highNumber,5,{minutes:reliefMinutes,returnToStart:true,suppressAftermath:true});
    setScene('room2after','bedroom',2,'WEDNESDAY · 2 SEPTEMBER',target,'night');G.player.x=returnX;G.showPill=true;G.workState=G.flags.draftSent?'sent':'late';audio.setMode('room');
    message('MAYA','heading home now. another time.','2 SEP · 10:58 PM');G.phoneLit=true;await clock.wait(.9);showTimedMoment('room2-maya','MAYA · 10:58 PM','heading home now. another time.',5,{sound:true,buzz:true});thought('E — CHECK UNSENT REPLY',3600);refreshObjects();
  }else if(phase==='room3'){
    G.flags.room3Escaped=true;const target=22*60;const reliefMinutes=Math.max(1,target-G.minutes);await playHigh(highNumber,3,{minutes:reliefMinutes,returnToStart:true,suppressAftermath:true});
    setScene('room3after','bedroom',3,'MONDAY · 14 SEPTEMBER',target,'night');G.player.x=returnX;G.showPill=true;G.workState=G.flags.draftSent?'sent':'late';G.photoDown=true;audio.setMode('room');
    await clock.wait(1.15);thought('E — PHONE · UNSENT',3600);refreshObjects();
  }
  G.flags.escaping=false;refreshObjects();
}
async function bedroomDrug(){
  const phase=G.phase;thought(phase==='room1'?'I keep looking at it instead of the paragraph.':'I know exactly where I left them.',3.5);
}

async function eatFood(){
  if(G.phase==='room1'){
    if(G.flags.ate){await say([['YOU','The blue container’s washed. I should give it back.']]);return;}
    await say([['YOU','The corridor smells like someone’s dinner.'],['YOU','I get the blue container out.']]);
    G.player.x=264;G.player.dir=1;thought('I eat standing at the desk.',4);await clock.wait(4);G.flags.ate=true;G.minutes+=16;
    await say([['YOU','It tastes like home.']]);message('MUM','Left the recipe on the lid. Ring me if you can’t read my writing.',messageStamp());return;
  }
}
async function tryDoor(){
  if(['room1','room2','room3'].includes(G.phase)){
    if(G.flags.wentOut){await say([['YOU','The bread’s here. I just wanted to get back.']]);return;}
    await say([['YOU','Keys. Shoes.'],['YOU','Just to the shop.']]);audio.fx('door');await fade(1,.5);G.flags.wentOut=true;G.minutes+=23;await clock.wait(.6);await fade(0,.5);await say([['YOU','The bread’s here. I just wanted to get back.']]);
  }else if(G.phase==='postcycle'){
    audio.fx('door');await fade(1,.55);setScene('posthall','hallway',4,'FRIDAY · 5 MAY 2028',14*60+15,'afternoon');G.player.x=402;G.showPill=false;audio.setMode('room');await fade(0,.65);thought('The common-room door is open.',3.4);
  }
}
async function enterCommon(){
  audio.fx('door');await fade(1,.55);setScene('empty','party',4,'FRIDAY · 5 MAY 2028',14*60+18,'afternoon');G.commonVariant='empty';G.player.x=61;G.showPill=false;G.partyProgress=1;audio.setMode('room');await fade(0,.7);
  await say([['YOU','Rex’s speaker. Same loose cable.']]);
}
async function montage(){
  G.cinematic=true;G.objects=[];G.keys.clear();G.target=null;closePhone();clearThought();clearMoment('montage');await hideMontageMessages(false);
  const openBeat=async(date,m,tod,level,broad='',workState=null)=>{await fade(1,.34);setScene('montage','bedroom',level,date,m,tod);G.player.x=305;G.showPill=true;G.photoDown=level>=3;G.workState=workState??(G.flags.draftSent?'sent':level>=3?'late':'draft');audio.setMode('room');await fade(0,.38);await chapterMarker(date,broad);};
  const storm1=[
    {sender:'MAYA',date:'9 FEB',year:2027,text:'helloooo???'},
    {sender:'MUM',date:'11 FEB',year:2027,text:'call me when you can'},
    {sender:'MAYA',date:'14 FEB',year:2027,text:'table by the fan? :)'}
  ];
  const storm2=[...storm1,
    {sender:'MAYA',date:'2 MAR',year:2027,text:'you alive?'},
    {sender:'MUM',date:'3 MAY',year:2027,text:'left dinner outside ❤️'}
  ];
  const storm3=[...storm2,
    {sender:'MAYA',date:'27 JUN',year:2027,text:'haven’t heard from you'},
    {sender:'MUM',date:'12 AUG',year:2027,text:'how are you feeling?'},
    {sender:'MUM',date:'18 AUG',year:2027,text:'happy birthday ❤️'},
    {sender:'COURSEWORK',date:'14 SEP',year:2026,text:G.flags.draftSent?'Missing references remain outstanding.':'No submission received. Please contact your tutor.'}
  ];
  const storm4=[...storm3,
    {sender:'MAYA',date:'13 SEP',year:2026,text:'hope you’re okay. no pressure to answer tonight.'},
    {sender:'MUM',date:'13 SEP',year:2026,text:'just let me know you’re okay'},
    {sender:'MAYA',date:'2 FEB',year:2027,text:'hey how you doing?'},
    {sender:'MAYA',date:'6 FEB',year:2027,text:'everything alright?'},
    {sender:'MUM',date:'3 MAY',year:2027,text:'love you ❤️'},
    {sender:'COURSEWORK',date:'20 DEC',year:2027,text:'WINTER COURSEWORK · Due 5 January, 11:00 PM.'},
    {sender:'COURSEWORK',date:'5 JAN',year:2028,text:'SUBMISSION CLOSED. No submission received.'},
    {sender:'MUM',date:'12 APR',year:2028,text:'i’m worried'}
  ];

  // Beat 1 — selected ordinary morning, then three demands intrude.
  await openBeat('SUNDAY · 14 FEBRUARY 2027',8*60+10,'morning',3,'5 MONTHS LATER');thought('I kept saying that.',2.15);await clock.wait(2.3);clearThought();
  await routineCourseworkAttempt('SAME PARAGRAPH · STILL UNFINISHED');
  message('MAYA','hey how you doing?','2 FEBRUARY 2027');message('MAYA','everything alright?','6 FEBRUARY 2027');message('MAYA','helloooo???','9 FEBRUARY 2027');message('MUM','call me when you can','11 FEBRUARY 2027');message('MAYA','table by the fan? :)','14 FEBRUARY 2027');audio.fx('phone');
  prepareStormMood();await acknowledgedMoment('MAYA · 14 FEB','table by the fan? :)');await montageEscapeBeat(storm1);G.cinematic=true;routineReliefCue(.18);await routineAftermath(G.flags.draftSent?'For a bit, the room is quieter. The references are still unfinished.':'For a bit, the room is quieter. The paragraph is still there.');

  // Beat 2 — another selected day. A reply starts, gets abandoned, then five accumulated windows arrive.
  await openBeat('MONDAY · 3 MAY 2027',17*60+28,'evening',3,'2 MONTHS LATER');await routineReplyAttempt('MUM','will call later');
  message('MAYA','you alive?','2 MARCH 2027');message('MUM','love you ❤️','3 MAY 2027');message('MUM','left dinner outside ❤️','3 MAY 2027');G.phoneLit=true;audio.fx('phone');
  prepareStormMood();await acknowledgedMoment('MUM · 3 MAY','left dinner outside ❤️');await montageEscapeBeat(storm2);G.cinematic=true;routineReliefCue(.15);await routineAftermath('I make tea. I still don’t send the reply.');

  // Beat 3 — nine windows. Work is visibly attempted before the pressure returns.
  await openBeat('WEDNESDAY · 18 AUGUST 2027',8*60+35,'morning',3,'AUGUST 2027');await routineCourseworkAttempt('SAME PARAGRAPH · CURSOR BLINKING');
  message('MAYA','haven’t heard from you','27 JUNE 2027');message('MUM','how are you feeling?','12 AUGUST 2027');message('MUM','happy birthday ❤️','18 AUGUST 2027');audio.fx('phone');
  prepareStormMood();await acknowledgedMoment('MUM · 18 AUG','happy birthday ❤️');await montageEscapeBeat(storm3);G.cinematic=true;routineReliefCue(.12);await routineAftermath('The morning keeps going. I leave the document open.');

  // Selected days continue between ESCAPEs; this is ordinary life, not unconscious time loss.
  await openBeat('MONDAY · 20 DECEMBER 2027',16*60+50,'evening',3,'DECEMBER 2027','draft');message('COURSE','WINTER COURSEWORK · Due 5 January, 11:00 PM.','20 DECEMBER 2027');G.phoneLit=true;await routineCourseworkAttempt('WINTER COURSEWORK · UPCOMING');
  await openBeat('FRIDAY · 21 JANUARY 2028',11*60+15,'afternoon',3,'JANUARY 2028','late');message('COURSE','WINTER COURSEWORK · SUBMISSION CLOSED. No submission received.','5 JANUARY 2028 · 11:00 PM');G.workState='late';openPhone('COURSE','Winter coursework');await waitForPhoneReadingAck();closePhone();await clock.wait(.35);

  // Beat 4 — begin around nine windows, then eight more arrive in overlapping bursts; ESCAPE appears only after all 17 are in.
  await openBeat('WEDNESDAY · 19 APRIL 2028',18*60+40,'evening',3,'APRIL 2028');await routineReplyAttempt('MAYA','hey. sorry. next week?');
  message('MUM','i’m worried','12 APRIL 2028');message('MAYA','guess today’s not happening. maybe another time','19 APRIL 2028');audio.fx('phone');
  prepareStormMood();await acknowledgedMoment('MUM · 12 APR','i’m worried');await montageEscapeBeat(storm4,{initialCount:9,burst:true});G.cinematic=true;routineReliefCue(.07);await routineAftermath('It passes. The messages are still in the phone.');

  // Separate failed ESCAPE: the current message remains present when the button stops working.
  await openBeat('SATURDAY · 29 APRIL 2028',20*60+5,'evening',3,'10 DAYS LATER');message('MUM','just tell me you’re okay','29 APRIL 2028');audio.fx('phone');await acknowledgedMoment('MUM · 29 APR','just tell me you’re okay');showMontageMessages([{sender:'MUM',date:'29 APR',year:2028,text:'just tell me you’re okay'}]);await clock.wait(.45);
  await fade(1,.38);setScene('escapebreak','bedroom',4,'FRIDAY · 5 MAY 2028',14*60+6,'afternoon');G.player.x=119;G.showPill=true;G.workState='closed';G.photoDown=true;G.flags.montageDone=true;audio.setMode('room');await fade(0,.58);await chapterMarker('FRIDAY · 5 MAY 2028','6 DAYS LATER');
  G.cinematic=false;beginStormMood(4);showMontageMessages([...storm4.slice(2),{sender:'MAYA',date:'19 APR',year:2028,text:'guess today’s not happening. maybe another time'},{sender:'MUM',date:'29 APR',year:2028,text:'just tell me you’re okay'}]);await clock.wait(.85);await failedEscape();
}
async function crumbleEscape(b){
  const reduced=settings.motion==='reduced',r=b.getBoundingClientRect(),stageRect=ui.stage.getBoundingClientRect(),gold=getComputedStyle(b),originalHTML=b.innerHTML;
  const snap={background:gold.background,backgroundColor:gold.backgroundColor,backgroundImage:gold.backgroundImage,border:gold.border,boxShadow:gold.boxShadow,color:gold.color,font:gold.font,fontSize:gold.fontSize,fontWeight:gold.fontWeight,letterSpacing:gold.letterSpacing,lineHeight:gold.lineHeight,padding:gold.padding};
  b.style.width=`${r.width}px`;b.style.height=`${r.height}px`;b.style.minHeight=`${r.height}px`;b.style.padding=gold.padding;
  b.className='escape-unavailable escape-revealed escape-crumble-button';b.innerHTML='ESCAPE<small>unavailable</small>';
  const fallLayer=document.createElement('div');fallLayer.className='gold-fall-layer';fallLayer.setAttribute('aria-hidden','true');ui.stage.append(fallLayer);
  const layer=document.createElement('div');layer.className='gold-coating';layer.style.left=`${r.left-stageRect.left}px`;layer.style.top=`${r.top-stageRect.top}px`;layer.style.width=`${r.width}px`;layer.style.height=`${r.height}px`;fallLayer.append(layer);
  const applyGold=(node)=>{Object.assign(node.style,snap);node.style.width='100%';node.style.height='100%';node.style.margin='0';node.style.borderRadius='0';node.style.textAlign='center';};
  const face=document.createElement('div');face.className='gold-face';face.innerHTML=originalHTML;applyGold(face);layer.append(face);

  // Preserve the authored 67.7 three-origin fracture trees exactly; only the post-crack breakup changes.
  const crackSpecs=[
    {o:0,d:.00,t:.68,p:[[24,30],[20,24],[21,17],[16,10],[18,4],[13,0]],primary:1},{o:0,d:.04,t:.82,p:[[24,30],[32,32],[39,28],[47,34],[54,31],[61,37],[69,42]],primary:1},
    {o:0,d:.31,t:.36,p:[[20,24],[13,20],[8,13],[2,10]]},{o:0,d:.48,t:.38,p:[[39,28],[41,21],[37,14],[40,7]]},{o:0,d:.62,t:.31,p:[[47,34],[44,42],[37,48]]},
    {o:1,d:.20,t:.72,p:[[69,42],[77,38],[84,44],[91,40],[100,45]],primary:1},{o:1,d:.23,t:.82,p:[[69,42],[72,35],[68,28],[74,20],[72,13],[77,7],[75,0]],primary:1},{o:1,d:.26,t:.48,p:[[69,42],[63,39],[58,35],[54,31]],primary:1},
    {o:1,d:.56,t:.34,p:[[84,44],[80,53],[85,61]]},{o:1,d:.58,t:.33,p:[[72,35],[80,31],[88,34]]},{o:1,d:.74,t:.30,p:[[74,20],[84,18],[92,23]]},
    {o:2,d:.40,t:.68,p:[[39,72],[44,80],[40,87],[47,94],[45,100]],primary:1},{o:2,d:.44,t:.80,p:[[39,72],[31,70],[24,76],[17,74],[10,82],[0,80]],primary:1},{o:2,d:.43,t:.78,p:[[39,72],[46,65],[51,59],[58,56],[63,49],[69,42]],primary:1},
    {o:2,d:.76,t:.34,p:[[24,76],[22,87],[17,95]]},{o:2,d:.79,t:.36,p:[[51,59],[46,52],[43,43],[37,48]]},{o:2,d:.92,t:.34,p:[[58,56],[69,62],[76,70]]},{o:2,d:.88,t:.38,p:[[44,80],[54,83],[63,90]]}
  ];
  const cracks=document.createElementNS('http://www.w3.org/2000/svg','svg');cracks.setAttribute('viewBox','0 0 100 100');cracks.setAttribute('preserveAspectRatio','none');cracks.classList.add('gold-fractures');layer.append(cracks);
  const crackPaths=crackSpecs.map(spec=>{const path=document.createElementNS(cracks.namespaceURI,'path');path.setAttribute('d',spec.p.map((pt,i)=>`${i?'L':'M'}${pt[0]} ${pt[1]}`).join(' '));path.setAttribute('pathLength','1');path.style.strokeDasharray='1';path.style.strokeDashoffset='1';path.classList.add(spec.primary?'crack-primary':'crack-branch',`crack-origin-${spec.o+1}`);cracks.append(path);return {path,...spec};});

  await animateVisual(face,.15,t=>face.style.filter=`brightness(${1+.12*Math.sin(t*Math.PI)})`);
  await animateVisual(face,.5,t=>face.style.filter=`brightness(${1-.12*smooth(t)})`);
  if(reduced){
    await animateVisual(cracks,.38,t=>{const elapsed=t*1.25;crackPaths.forEach(({path,d,t:dur})=>path.style.strokeDashoffset=String(1-clamp((elapsed-d)/dur)));});
    await animateVisual(face,.42,t=>{face.style.opacity=String(1-t);cracks.style.opacity=String(1-.55*t);});
    fallLayer.remove();b.classList.remove('escape-crumble-button');return;
  }

  await animateVisual(cracks,1.45,t=>{const elapsed=t*1.45;crackPaths.forEach(({path,d,t:dur})=>path.style.strokeDashoffset=String(1-clamp((elapsed-d)/dur)));});

  // Reconstruct the intact gold face as many small source patches. They remain stationary, then erode away from the crack network while grains fall in the stage-sized layer.
  const cols=r.width<360?18:24,rows=6,patches=[];
  const segmentDistance=(px,py,a,b)=>{const vx=b[0]-a[0],vy=b[1]-a[1],den=vx*vx+vy*vy||1,u=clamp(((px-a[0])*vx+(py-a[1])*vy)/den),x=a[0]+vx*u,y=a[1]+vy*u;return Math.hypot(px-x,py-y);};
  let maxDist=1;
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
    const x0=r.width*col/cols,y0=r.height*row/rows,x1=r.width*(col+1)/cols,y1=r.height*(row+1)/rows,cx=(x0+x1)/2,cy=(y0+y1)/2,px=cx/r.width*100,py=cy/r.height*100;
    let distance=Infinity;for(const spec of crackSpecs)for(let i=0;i<spec.p.length-1;i++)distance=Math.min(distance,segmentDistance(px,py,spec.p[i],spec.p[i+1]));maxDist=Math.max(maxDist,distance);
    const patch=document.createElement('div');patch.className='gold-source-patch';patch.style.left=`${x0-.45}px`;patch.style.top=`${y0-.45}px`;patch.style.width=`${x1-x0+.9}px`;patch.style.height=`${y1-y0+.9}px`;
    const inner=document.createElement('div');inner.className='gold-source-patch-face';inner.innerHTML=originalHTML;applyGold(inner);inner.style.position='absolute';inner.style.width=`${r.width}px`;inner.style.height=`${r.height}px`;inner.style.left=`${-x0}px`;inner.style.top=`${-y0}px`;patch.append(inner);patch.style.opacity='0';layer.insertBefore(patch,cracks);patches.push({patch,row,col,x0,y0,x1,y1,cx,cy,distance,released:false,particles:[]});
  }
  patches.forEach(p=>p.patch.style.opacity='1');face.style.opacity='0';await clock.wait(.12);

  const palette=['#d7ad64','#c3914b','#e1bb70','#b17c42','#9e6e3d'];
  patches.forEach((p,index)=>{
    const jitter=(((index*37)%19)/19-.42)*.11,spread=Math.pow(p.distance/maxDist,.72);p.release=clamp(.03+.73*spread+jitter,0,.86);
    const count=2+((index*11)%4);
    for(let j=0;j<count;j++){
      const seed=index*29+j*17+7,size=seed%23===0?4:1+(seed%3),fx=((seed*13)%97)/97,fy=((seed*31)%89)/89;
      p.particles.push({release:p.release+((j*7+index)%5)*.012,size,x:r.left-stageRect.left+p.x0+(p.x1-p.x0)*(.15+.7*fx),y:r.top-stageRect.top+p.y0+(p.y1-p.y0)*(.2+.62*fy),vx:-17+((seed*7)%35),vy:15+((seed*5)%25),gravity:560+((seed*19)%180),wobble:1+((seed*3)%3),phase:(seed%13)/13*TAU,color:palette[seed%palette.length],node:null});
    }
  });
  const particles=patches.flatMap(p=>p.particles),sandDuration=2.55;
  await animateVisual(fallLayer,sandDuration,t=>{
    const elapsed=t*sandDuration;
    for(const p of patches){if(!p.released&&elapsed>=p.release){p.released=true;p.patch.remove();}}
    cracks.style.opacity=String(1-.82*clamp((elapsed-.18)/.92));
    for(const grain of particles){
      if(elapsed<grain.release)continue;
      if(!grain.node){const n=document.createElement('i');n.className='gold-grain';n.style.left=`${grain.x}px`;n.style.top=`${grain.y}px`;n.style.width=`${grain.size}px`;n.style.height=`${grain.size}px`;n.style.background=grain.color;fallLayer.append(n);grain.node=n;}
      const age=elapsed-grain.release,y=grain.vy*age+.5*grain.gravity*age*age,x=grain.vx*age+Math.sin(age*4+grain.phase)*grain.wobble,posY=grain.y+y,fadeStart=stageRect.height*(.82+((grain.phase/TAU)*.09));
      grain.node.style.transform=`translate(${x}px,${y}px)`;grain.node.style.opacity=String(posY<=fadeStart?1:1-Math.pow(clamp((posY-fadeStart)/(stageRect.height-fadeStart+18)),1.2));
      if(posY>stageRect.height+grain.size*3)grain.node.style.opacity='0';
    }
  });
  for(const grain of particles)grain.node?.remove();for(const p of patches)p.patch.remove();fallLayer.remove();b.classList.remove('escape-crumble-button');
}
async function failedEscape(){
  if(G.flags.escapeFailed)return;beginStormMood(4);stormMood.locked=true;G.flags.escapeFailed=true;G.objects=[];audio.setMode('room');clearThought();
  ui.stage.dataset.escapePrompt='true';ui.stage.dataset.escapePressure='forced';ui.choiceTitle.textContent='';ui.choiceBody.textContent='';ui.choiceTag.textContent='';ui.choice.hidden=false;ui.options.replaceChildren();
  const b=document.createElement('button');setEscapeButtonContent(b);b.className='escape-option escape-central escape-failure-button';b.dataset.action='escape';mountEscapeKey(ui.options,b);bindEscapeFocus(b);b.focus({preventScroll:true});layoutMontageMessages(b);
  await new Promise((resolve,reject)=>{
    pendingChoice={reject};let used=false;
    b.onclick=async()=>{
      if(G.paused||used||actionPointerBlocked())return;used=true;G.flags.escapeFailureAnimating=true;b.disabled=true;const hint=escapeKeyHint(b);if(hint)hint.style.visibility='hidden';setEscapeFocus(false);audio.fx('dry');
      try{await crumbleEscape(b);await hideMontageMessages(false);}catch(e){reject(e);return;}
      b.removeAttribute('data-action');b.setAttribute('aria-disabled','true');G.flags.escapeUnavailableRevealed=true;G.flags.escapeFailureAnimating=false;G.flags.physicalDecline=4;
      // Earlier presses pushed the message away. This time it stays exactly where it is.
      try{await clock.wait(1);pendingChoice=null;resolve();}catch(e){reject(e);}
    };
  });
  ui.choice.hidden=true;ui.options.replaceChildren();delete ui.stage.dataset.escapePrompt;delete ui.stage.dataset.escapePressure;G.phase='emptycheck';ui.stage.dataset.phase='emptycheck';G.showPill=true;G.flags.emptySupply=false;thought('E — CHECK SUPPLY',3600);refreshObjects();
}

async function checkEmptySupply(){
  if(G.flags.supplyChecked)return;G.flags.supplyChecked=true;clearThought();await hideMontageMessages(false);G.cinematic=true;G.objects=[];G.keys.clear();G.target=null;audio.fx('dry');G.showPill=false;G.flags.emptySupply=true;
  ui.supplyView.hidden=false;await clock.wait(1.35);ui.supplyView.hidden=true;G.cinematic=false;
  // Running out only interrupts the routine. The player still has to face what kept moving.
  populateFinalHistory();G.phase='realisation';ui.stage.dataset.phase='realisation';setStoryClock(14*60+6,'afternoon','FRIDAY · 5 MAY 2028');audio.setMode('room');
  thought('E — CHECK PHONE',3600);refreshObjects();
}

async function phoneHistoryRealisation(){
  if(G.flags.timelineSeen)return;
  await unavailableChoice('The phone is still lit.','CHECK PHONE');
  G.flags.timelineSeen=true;clearThought();openPhone('MAYA','Message history · scroll to read',{scroll:'start'});
  await waitForPhoneReadingAck();closePhone();openPhone('MUM','Message history · scroll to read',{scroll:'start'});
  await waitForPhoneReadingAck();closePhone();
  G.phase='courseworkrealisation';ui.stage.dataset.phase='courseworkrealisation';thought('E — CHECK COURSEWORK',3600);refreshObjects();
}

async function courseworkRealisation(){
  if(G.flags.courseworkFaced)return;await unavailableChoice('The deadline is still there.','CHECK COURSEWORK');G.flags.courseworkFaced=true;clearThought();G.cinematic=true;G.objects=[];audio.setMode('silent');
  openPhone('COURSE','Coursework history · scroll to read',{scroll:'start'});await waitForPhoneReadingAck();closePhone();
  await elapsedTimeRealisation();
}

async function elapsedTimeRealisation(){
  const dates=[['AUGUST 2026','night',.62],['SEPTEMBER 2026','morning',.58],['FEBRUARY 2027','afternoon',.54],['MAY 2027','evening',.5],['AUGUST 2027','night',.48],['APRIL 2028','morning',.58]];
  for(const [label,tod,hold] of dates)await reflectionCard(label,hold,{tod,mode:'time'});
  G.timeOfDay='morning';ui.stage.dataset.tod='morning';await reflectionCard(`1 YEAR
8 MONTHS
14 DAYS`,2.35,{tod:'morning',mode:'total'});await reflectionCard('since the party',1.0,{tod:'morning',mode:'total-sub'});await reflectionCard(`You kept skipping.
Life didn’t.`,1.85,{tod:'morning',mode:'statement'});

  // Interleave ordinary connection with coursework consequences; simple relationship cards keep the quick ~0.62 s rhythm.
  await courseworkMemoryCard('DUE TODAY','FINAL DRAFT · 24 August 2026 · 11:00 PM','amber',1.3);
  await reflectionCard(`MAYA
“see you later!”`,1.10,{tod:'morning',mode:'memory'});
  if(G.flags.draftSent)await courseworkMemoryCard('DRAFT RECEIVED','Missing references outstanding.','amber',1.20);
  else await courseworkMemoryCard('SUBMISSION CLOSED','24 August 2026 · No submission received.','red',1.20);

  for(const [who,text] of [['MAYA','“hey how you doing?”'],['MUM','“call me when you can”']])await reflectionCard(`${who}
${text}`,.62,{tod:'morning',mode:'memory'});
  await courseworkMemoryCard('UPCOMING','WINTER COURSEWORK · Due 5 January 2028 · 11:00 PM','amber',1.3);
  for(const [who,text] of [['MUM','“haven’t heard from you in a while ❤️”'],['MAYA','“wanna go shopping?”'],['MAYA','“everything alright?”']])await reflectionCard(`${who}
${text}`,.62,{tod:'morning',mode:'memory'});
  await courseworkMemoryCard('SUBMISSION CLOSED','WINTER COURSEWORK · 5 January 2028 · No submission received.','red',1.35);
  await reflectionCard(`MUM
“i’m worried”`,.62,{tod:'morning',mode:'memory'});
  await reflectionCard(`MAYA
“guess today’s not happening. maybe another time”`,.62,{tod:'morning',mode:'memory',keepVisible:true});

  await showPolaroidMemory(1.0,{paper:false,dissolve:1.35,flash:false,handoffFromReflection:true});
  G.cinematic=false;G.phase='mirrorwalk';setStoryClock(14*60+10,'afternoon','FRIDAY · 5 MAY 2028');ui.stage.dataset.phase='mirrorwalk';audio.setMode('room');clearThought();refreshObjects();
}
async function emptySofa(){
  const from=G.player.x;G.player.dir=from<=132?1:-1;G.player.walking=true;await clock.tween(.62,t=>G.player.x=mix(from,132,t));G.player.walking=false;G.player.y=201;G.player.pose='sit';G.flags.sofa=true;await clock.wait(2.7);thought('she used to save this seat.',2.5);await clock.wait(2.5);
  if(!G.flags.finalCallStarted){G.flags.finalCallStarted=true;await beginEnding();}
}
async function cleaner(){
  await say([['CLEANER','Looking for someone?'],['YOU','No. I used to come here.'],['CLEANER','Students used to book it on Fridays.'],['YOU','Right.'],['CLEANER','Mind the floor. It’s still wet.']]);
}
async function beginEnding(){
  G.phase='ending';ui.stage.dataset.phase='ending';G.objects=[];clearThought();G.commonVariant='empty';setStoryClock(14*60+18,'afternoon','FRIDAY · 5 MAY 2028');audio.setMode('room');
  await clock.wait(.85);audio.fx('phone');G.phoneLit=true;setStoryClock(14*60+24,'afternoon');
  message('MUM','are you there?',messageStamp());
  const endingMoment=claimMoment('ending-mum','MUM · NOW','are you there?');startPhoneBuzz(endingMoment,'ending-mum');await clock.wait(3.2);finishMoment(endingMoment);setStoryClock(14*60+25,'afternoon');
  message('MUM',"you don’t have to explain anything right now",messageStamp());
  openPhone('MUM','Now');
  await phoneChoice([{id:'call',label:'[ ENTER ]  CALL MUM',primary:true},{id:'escape-disabled',disabled:true}]);
  stormMood.locked=false;setStormDarkness(0,1.2);
  closePhone();G.call={lift:0,connected:false};await clock.tween(.45,t=>G.call.lift=smooth(t));
  await say([['YOU','Mum?'],['MUM','Yeah?'],['YOU','Can I tell you something?'],['MUM','Go on.']],{gentle:false});
  await clock.wait(.45);
  await say([['YOU','I’ve been taking pills.'],['YOU','It started at that party.'],['YOU','I didn’t think it was a big deal.']],{gentle:false});
  await clock.wait(.5);
  await say([['YOU','I don’t really know what to do.'],['MUM','Where are you?'],['YOU','Downstairs. Common room.'],['MUM','I’ll come over.'],['YOU','Can you stay on the phone?'],['MUM','Yeah.']],{gentle:true});
  G.call.connected=true;
  await say([['YOU','I’ve avoided this conversation for long enough.']]);
  openPhone('MAYA','Call with Mum · connected');await typeHonestMayaDraft();
  await phoneChoice([{id:'send',label:'SEND',primary:true}]);ui.draft.hidden=true;phoneThought('');setStoryClock(14*60+27,'afternoon');await send('MAYA',FINAL_MAYA_MESSAGE,messageStamp());await clock.wait(.45);closePhone();
  G.call.connected=true;await clock.wait(5);await completeEndingFromCall();
}
async function completeEndingFromCall(){
  clearThought();await fade(1,2.5);ui.hud.hidden=true;await clock.wait(.65);audio.setMode('silent');
  await endingTextCard('Drugs can make worries feel distant for a while.',3);
  await endingTextCard('Repeated use can leave problems unresolved and put distance between you and the people you love.',5.5);
  await endingTextCard('Reaching out can start with one conversation.',3);
  G.phase='complete';G.finishSeconds=clock.time;ui.stage.dataset.phase='complete';ui.endScreen.hidden=false;ui.endScreen.querySelector('.end-note').textContent="You don’t have to skip the next conversation.";storage.set('completed','yes');
  ui.support.hidden=false;$('supportBack').focus({preventScroll:true});
}

async function playHigh(number,duration=[0,30,24,19,14][number],opts={}){
  clearThought();closePhone();G.objects=[];G.phase='high'+number;ui.stage.dataset.phase=G.phase;G.showPill=false;audio.fx('use');const startX=G.player.x,startY=G.player.y,startPose=G.player.pose;G.player.pose='stand';G.player.y=218;G.player.vx=0;G.player.vy=-7;G.player.angle=0;G.player.spin=0;
  const explicitMinutes=Number.isFinite(opts.minutes)?opts.minutes:null;const endMinutes=opts.noTimeJump?G.minutes:G.minutes+(explicitMinutes??(opts.compressed?(opts.minutes||0):Math.round(duration*2)));
  if(!stormMood.locked){stormThought.hidden=true;setStormDarkness(0,.4);}
  G.high={number,compressed:!!opts.compressed,start:clock.time,duration,from:G.minutes,to:endMinutes,initialDate:G.date,partyFrom:G.partyProgress,partyTo:.84,landed:false,lastTrail:0,regionVisits:0,regions:new Set(),returnToStart:!!opts.returnToStart,startX,startY,startPose,preserveWorkState:!!opts.preserveWorkState};G.intensity=0;G.trails=[];G.zoneEnergy=[0,0,0,0];G.zoneCooldown=[0,0,0,0];audio.setMode('high');if(opts.compressed)audio.sensation(0,number===4?.18:.55);
  ui.highHelp.hidden=number!==1;if(number===1){later(4,()=>thought('MAYA: “You’ve been saving that dance move?”',3.2));later(10,()=>{ui.highHelp.hidden=true;});}
  await clock.wait(duration);G.high=null;G.intensity=0;G.player.y=218;G.player.vx=G.player.vy=G.player.angle=G.player.spin=0;G.player.stumbleUntil=0;G.player.restUntil=0;G.player.walkDistance=0;G.trails=[];G.ripples=[];G.sparks=[];ui.highHelp.hidden=true;G.minutes=endMinutes%1440;if(opts.returnToStart){G.player.x=startX;G.player.y=startY;G.player.pose=startPose;G.player.angle=0;}audio.setMode('silent');if(opts.compressed){G.phase='montage';await clock.wait(.28);}else if(!opts.suppressAftermath)await fallAfterHigh(number,duration);audio.setMode(number===1?'silent':'room');
}
async function fallAfterHigh(number,duration){
  G.phase='aftermath';ui.stage.dataset.phase='aftermath';G.keys.clear();G.target=null;G.fall={number};G.falls++;
  const p=G.player,at=p.x,landing=G.scene==='party'?262:333;p.dir=1;const fallAngle=number===2?-.55:-1.15;
  await clock.tween(.7,t=>{p.x=mix(at,landing,t);p.y=218;p.angle=settings.motion==='reduced'?0:t*.24;});
  audio.fx('land');
  if(settings.motion==='reduced'){p.angle=fallAngle;p.y=215;}else await clock.tween(.45,t=>{p.angle=mix(.24,fallAngle,t);p.y=mix(218,215,t);});
  await clock.wait(number===1?2:2.6);
  if(number===1)await say([['MAYA','Hey—stay there a second. You caught your knee on the table.'],['YOU','I thought I was still moving.'],['MAYA','I know. Here. Hold my arm.']]);
  else{
    // Home aftermaths are physical and quiet, without repeating the party dialogue.
    if(number===2){p.pose='sit';p.angle=-.12;p.y=218;thought('I hold the desk until it stays still.',3.2);await clock.wait(3.2);}
    else if(number===3){p.pose='sit';p.angle=-.35;p.y=221;await clock.wait(3.2);}
    else{p.pose='stand';p.angle=-1.15;p.y=215;await clock.wait(4);return;}
  }
  const from=p.angle,fromY=p.y;await clock.tween(1.1,t=>{p.angle=mix(from,0,t);p.y=mix(fromY,218,t);});p.pose='stand';p.angle=0;p.y=218;G.fall=null;clearThought();
  if(number===1)await say([['MAYA','I’ve got a plaster in my bag. Sit with me.']]);

}
function refreshObjects(){
  const p=G.phase;
  if(p==='party'){objects(['maya','MAYA','SIT WITH',153,168,firstMaya],['eli','ELI','TALK',89,176,eliTalk],['rex','REX','TALK',250,173,rexTalk],['nia','NIA','TALK',311,169,niaTalk],['phone','YOUR PHONE','OPEN',197,177,partyPhone],['guest','SAM','TALK',393,173,samTalk]);}
  else if(p==='after')objects(['maya','MAYA','TALK',133,170,afterMaya],...(G.flags.afterTalk?[['door','HALLWAY','LEAVE',48,151,leaveParty]]:[]));
  else if(['room1','room2','room3'].includes(p)){
    // The supply remains visible in the room, but ESCAPE now intrudes inside the task itself.
    objects(['phone',p==='room3'&&!G.flags.mumRead3?'MUM · UNREAD':'MESSAGES','OPEN',178,166,messagesMenu],...(p==='room1'?[['food',G.flags.ate?'BLUE CONTAINER':"MUM’S DINNER",G.flags.ate?'LOOK':'EAT',254,158,eatFood]]:[]),['work','UNFINISHED WORK','OPEN',303,144,work],['mirror','MIRROR','LOOK',106,91,mirrorLook],['photo','MAYA PHOTO','LOOK',414,116,photoLook],['door','HALLWAY','OPEN',48,151,tryDoor]);
  }else if(p==='room1after')objects(['work','FINAL DRAFT · UNSENT','SUBMIT',303,144,attemptClosedSubmission],['mirror','MIRROR','LOOK',106,91,mirrorLook],['photo','MAYA PHOTO','LOOK',414,116,photoLook]);
  else if(p==='room2after')objects(['phone','UNSENT REPLY','CHECK',178,166,mayaAfterEscape],['mirror','MIRROR','LOOK',106,91,mirrorLook],['photo','MAYA PHOTO','LOOK',414,116,photoLook]);
  else if(p==='room3after')objects(['phone','UNSENT REPLY','CHECK',178,166,mumAfterEscape],['mirror','MIRROR','LOOK',106,91,mirrorLook],['photo','MAYA PHOTO','LOOK',414,116,photoLook]);
  else if(p==='empty')objects(['sofa','MAYA’S OLD SEAT','SIT',143,163,emptySofa],['cleaner','CLEANER','TALK',403,172,cleaner]);
  else if(p==='escapebreak')objects([]);
  else if(p==='emptycheck')objects(['drug','SUPPLY','CHECK',344,157,checkEmptySupply],['photo','MAYA PHOTO','LOOK',414,116,photoLook]);
  else if(p==='realisation')objects(['phone','PHONE HISTORY','CHECK',178,166,phoneHistoryRealisation],['work','SUBMISSION CLOSED · 4 MONTHS AGO','LOOK',303,144,()=>thought('Not yet. The phone is still lit.',2.5)],['mirror','MIRROR','LOOK',106,91,mirrorLook],['photo','MAYA PHOTO','LOOK',414,116,photoLook]);
  else if(p==='courseworkrealisation')objects(['phone','PHONE HISTORY','OPEN',178,166,messagesMenu],['work','SUBMISSION CLOSED · 4 MONTHS AGO','CHECK',303,144,courseworkRealisation],['mirror','MIRROR','LOOK',106,91,mirrorLook],['photo','MAYA PHOTO','LOOK',414,116,photoLook]);
  else if(p==='mirrorwalk')objects();
  else if(p==='mirror')objects(['mirror','MIRROR','LOOK',106,91,mirrorLook],['photo','MAYA PHOTO','LOOK',414,116,photoLook]);
  else if(p==='finalphoto')objects(['photo','MAYA PHOTO','LOOK',414,116,photoLook],['mirror','MIRROR','LOOK',106,91,mirrorLook]);
  else if(p==='postcycle')objects(['photo','MAYA PHOTO','LOOK',414,116,photoLook],['door','COMMON ROOM','GO DOWNSTAIRS',48,151,tryDoor]);
  else if(p==='posthall')objects(['door','COMMON ROOM','LOOK INSIDE',48,145,enterCommon]);
  else G.objects=[];
}


function updateHigh(dt){
  const h=G.high;if(!h)return;const elapsed=clock.time-h.start,progress=clamp(elapsed/h.duration),late=h.number>=4;
  const attack=Math.min(2,h.duration*.22),release=Math.min(h.number===4?3:6,h.duration*.38);
  let amount=smooth(elapsed/attack)*(1-smooth((elapsed-(h.duration-release))/release));
  if(h.number===3)amount*=.85-.18*smooth((elapsed-5)/10);if(late)amount*=h.compressed?.25:.48;
  G.intensity=amount;G.minutes=mix(h.from,h.to,smooth(progress));if(h.number===1){G.partyProgress=mix(h.partyFrom??0,h.partyTo??1,smooth(progress));G.date=G.minutes>=1440?'SATURDAY · 22 AUGUST':h.initialDate;}
  if(h.number===2&&G.minutes>=23*60&&!h.preserveWorkState)G.workState=G.flags.draftSent?'sent':'late';
  const p=G.player;let move=(G.keys.has('d')||G.keys.has('arrowright')?1:0)-(G.keys.has('a')||G.keys.has('arrowleft')?1:0);
  if(G.target!==null&&!move){move=clamp((G.target-p.x)/30,-1,1);if(Math.abs(G.target-p.x)<8)G.target=null;}
  const rise=G.keys.has(' ')||G.keys.has('w')||G.keys.has('arrowup');
  if(move)p.dir=move>0?1:-1;
  p.vx+=move*135*dt;p.vx*=Math.exp(-1.15*dt);p.vx=clamp(p.vx,-95,95);
  if(h.compressed){p.x=333;p.y=218-Math.sin(progress*Math.PI)*(late?6:24);p.angle=0;return;}
  const active=amount>.05,base=late?201:145+Math.sin(elapsed*.72)*30;
  const targetY=mix(218,rise?(late?186:57):base,smooth(amount/(late?.28:.6)));
  p.vy+=(targetY-p.y)*2.1*dt;p.vy*=Math.exp(-1.6*dt);p.x+=p.vx*dt;p.y+=p.vy*dt;
  if(p.x<35||p.x>445){p.x=clamp(p.x,35,445);p.vx*=-.6;p.spin+=.9;}
  p.y=clamp(p.y,47,218);p.angle+=p.spin*dt;p.spin*=Math.exp(-2*dt);p.angle=mix(p.angle,move*.18,dt*.5);if(progress>.83)p.angle*=Math.exp(-3*dt);
  if(settings.motion==='full'&&elapsed-h.lastTrail>.07){G.trails.push({x:p.x,y:p.y,dir:p.dir,angle:p.angle});if(G.trails.length>14)G.trails.shift();h.lastTrail=elapsed;}
  for(let i=0;i<zones.length;i++){
    G.zoneEnergy[i]=Math.max(0,G.zoneEnergy[i]-dt*.7);G.zoneCooldown[i]=Math.max(0,G.zoneCooldown[i]-dt);
    const z=zones[i],dist=Math.hypot((p.x-z.x)/z.r,(p.y-16-z.y)/(z.r*.9));
    const available=active&&elapsed<h.duration-release*.65&&(!late||i===0&&elapsed<4.7)&&!(h.number===3&&i===2&&elapsed>8);
    if(dist<1.3&&available){G.zoneEnergy[i]=Math.min(1,G.zoneEnergy[i]+dt*2);if(G.zoneCooldown[i]===0){G.zoneCooldown[i]=1.5;h.regionVisits++;h.regions.add(i);audio.sensation(i,amount);p.vy-=late?3:15;p.vx+=(i%2?-1:1)*10;p.spin+=(i%2?-1:1)*(late?.5:2.8);G.ripples.push({x:p.x,y:p.y-10,life:1,color:z.color});for(let k=0;k<(late?5:16);k++){const an=k*TAU/16;G.sparks.push({x:p.x,y:p.y-13,vx:Math.cos(an)*(12+k%4*9),vy:Math.sin(an)*24,life:1,size:k%3===0?2:1,color:z.color});}}}
  }
}
function physicalDecline(){return clamp(G.flags.physicalDecline||0,0,4);}
function walkingScale(){return [1,.9,.8,.7,.6][physicalDecline()];}
function updateMovement(dt){
  const p=G.player;p.walking=false;
  if(G.high){updateHigh(dt);return;}
  if(G.busy||G.cinematic||['title','complete'].includes(G.phase))return;
  if(p.restUntil){
    if(clock.time<p.restUntil){p.pose='rest';p.angle=-.12;p.y=218;return;}
    p.restUntil=0;p.pose='stand';p.angle=0;thought('Okay. Keep going.',2.6);
  }
  let move=(G.keys.has('d')||G.keys.has('arrowright')?1:0)-(G.keys.has('a')||G.keys.has('arrowleft')?1:0);
  if(move)G.target=null;
  if(!move&&G.target!==null){const d=G.target-p.x;if(Math.abs(d)<2)G.target=null;else move=Math.sign(d);}
  const stumbling=clock.time<(p.stumbleUntil||0);
  p.angle=stumbling?.18*Math.sin(Math.PI*(1-(p.stumbleUntil-clock.time)/.7))*p.dir:0;
  if(!move)return;
  p.pose='stand';p.y=218;p.dir=move;
  const step=Math.min(88*walkingScale()*(stumbling?.22:1)*dt,G.target===null?Infinity:Math.abs(G.target-p.x));
  const previousX=p.x;p.x=clamp(p.x+move*step,34,446);const travelled=Math.abs(p.x-previousX);
  p.walking=travelled>.001;p.walkDistance=(p.walkDistance||0)+travelled;
  if(p.walking&&clock.time-G.stepAt>.34/walkingScale()){audio.fx('step');G.stepAt=clock.time;}
  if(G.phase==='posthall'){
    if(p.x<=355&&!G.flags.finalWalkThought){G.flags.finalWalkThought=true;thought('I swear the common room was closer.',3.6);}
    if(p.x<=285&&!G.flags.finalWalkStumble){G.flags.finalWalkStumble=true;p.stumbleUntil=clock.time+.7;}
    if(p.x<=205&&!G.flags.finalWalkRest){G.flags.finalWalkRest=true;p.restUntil=clock.time+2.6;p.walking=false;p.pose='rest';thought('Just a second.',2.6);}
  }else if(physicalDecline()>=2&&G.phase!=='empty'&&p.walkDistance>=180&&!G.flags['stumbled_'+G.phase]){
    G.flags['stumbled_'+G.phase]=true;p.stumbleUntil=clock.time+.7;
  }
}
function update(dt){
  clock.update(dt);if(G.guidancePhase!==G.phase)markProgress();updateVisualEffects();if(currentLine){const l=currentLine;l.shown=Math.min(l.text.length,l.shown+dt*35);if(l.shown===l.text.length&&l.readyAt===null)l.readyAt=clock.time;ui.next.textContent=l.shown<l.text.length?'REVEAL ↵':'CONTINUE ↵';const n=Math.floor(l.shown);ui.line.textContent=l.text.slice(0,n);if(n<l.text.length&&n-l.lastBlip>=3&&/[a-z0-9]/i.test(l.text[n-1])&&G.phase!=='ending'&&!G.cinematic){l.lastBlip=n;audio.dialogueBlip(l.who,n);}}
  updateOpeningAttention(dt);updatePhoneBuzz(dt);updateStormMood();
  updateMovement(dt);if(G.phase==='mirrorwalk'&&!G.flags.mirrorGlimpsed&&!G.busy&&G.player.x<=114&&G.player.x>=88){run(automaticMirrorGlimpse);}if(clock.time>G.thoughtUntil){ui.thought.hidden=true;ui.thought.classList.remove('visible');}
  for(const r of G.ripples)r.life-=dt*.7;G.ripples=G.ripples.filter(r=>r.life>0);
  for(const s of G.sparks){s.x+=s.vx*dt;s.y+=s.vy*dt;s.vy+=9*dt;s.life-=dt*.7;}G.sparks=G.sparks.filter(s=>s.life>0);
  if(G.typing&&Math.floor(clock.time*8)!==G.lastType){G.lastType=Math.floor(clock.time*8);audio.fx('type');}
  const o=nearest(),guide=idleGuidanceTarget();ui.interact.hidden=!o||G.busy||!!G.high||G.paused;ui.interact.classList.toggle('escape-object',!!o&&o.id==='drug');ui.interact.classList.toggle('unread-phone',!!o&&o.id==='phone'&&G.phase==='room3'&&!G.flags.mumRead3);ui.interact.classList.toggle('idle-guidance',!!guide&&!!o&&!ui.interact.hidden&&guide.id===o.id);if(o&&!ui.interact.hidden){ui.verb.textContent=o.verb;ui.object.textContent=o.name;ui.interact.style.left=(clamp(o.x,55,425)/480*100)+'%';ui.interact.style.top=(o.y/270*100)+'%';}
  ui.stage.dataset.mumUnread=String(G.phase==='room3'&&!G.flags.mumRead3);ui.date.textContent=stamp();ui.stage.dataset.elapsed=Math.floor(clock.time);ui.stage.dataset.high=G.high?G.high.number:'';ui.stage.dataset.tod=currentTimeOfDay();if(!ui.mirrorView.hidden)drawMirrorClose(mirrorStage());ui.controls.textContent=G.cinematic||['ending','reflection','mirror','courseworkrealisation'].includes(G.phase)?'E / ENTER · CONTINUE · ESC TO PAUSE':G.high?'← → DRIFT · SPACE TO RISE · ESC TO PAUSE':'A / D MOVE · E INTERACT · GOLD DOT: NEXT STEP · ESC PAUSE';audio.update();
}
function applySettings(){
  document.body.dataset.motion=settings.motion;for(const id of ['sound','titleSound','pauseSound']){$(id).textContent=settings.sound?'SOUND ON':'SOUND OFF';$(id).setAttribute('aria-pressed',String(!settings.sound));}
  for(const id of ['titleMotion','pauseMotion']){$(id).textContent=settings.motion==='full'?'FULL MOTION':'REDUCED MOTION';$(id).setAttribute('aria-pressed',String(settings.motion==='reduced'));}
  for(const id of ['titleVolume','pauseVolume']){$(id).value=settings.volume;$(id+'Value').textContent=settings.volume+'%';}storage.set('volume',settings.volume);storage.set('sound',settings.sound?'on':'off');storage.set('motion',settings.motion);audio.update();
}
function toggleSound(){audio.init();settings.sound=!settings.sound;applySettings();}
function toggleMotion(){settings.motion=settings.motion==='full'?'reduced':'full';applySettings();}
function pause(on){if(['title','complete'].includes(G.phase))return;G.paused=on;if(on)setEscapeFocus(false);G.keys.clear();G.target=null;ui.pauseScreen.hidden=!on;audio.pause(on);ui.interact.hidden=true;if(on){const log=$('dialogueLog');log.replaceChildren();for(const entry of dialogueHistory){const row=document.createElement('p');const name=document.createElement('strong');name.textContent=entry.who+': ';row.append(name,document.createTextNode(entry.text));log.append(row);}if(!dialogueHistory.length)log.textContent='Your conversations will appear here.';}if(on)$('resume').focus({preventScroll:true});else{const button=(!ui.deskChoice.hidden?ui.deskOptions:!ui.choice.hidden?ui.options:!ui.phone.hidden?ui.phoneOptions:null)?.querySelector('button');(button||ui.stage).focus({preventScroll:true});}}
function reset(){
  cancelVisualEffects();clock.reset();resetMomentOwnership();resetStormMood();acknowledgementActive=false;acknowledgementKeyLocks.clear();pointerActionBlockedUntil=0;stormDepartureActive=false;phoneScrollMode='end';ui.montageMessages.replaceChildren();ui.options.replaceChildren();ui.phoneOptions.replaceChildren();ui.stage.querySelectorAll('.gold-fall-layer').forEach(node=>node.remove());ui.dialogue.style.opacity='';ui.curtain.style.background='';delete ui.stage.dataset.montageChoice;if(pendingBeat){pendingBeat.reject(CANCEL);pendingBeat=null;}if(currentLine){currentLine.reject(CANCEL);currentLine=null;}if(pendingChoice){pendingChoice.reject(CANCEL);pendingChoice=null;}audio.reset();dialogueHistory.length=0;$('recentDialogue').open=false;G=initial();
  for(const id of ['hud','openingMayaBubble','dialogue','choice','phone','pauseScreen','endScreen','support','interact','highHelp','moment','montageMessages','reflection','memoryPhoto','mirrorView','supplyView','pace','deskChoice','draft'])ui[id].hidden=true;
  ui.title.hidden=false;ui.curtain.style.opacity=0;ui.memoryPhoto.style.opacity='';ui.moment.classList.remove('awaiting-ack');ui.phone.classList.remove('awaiting-read');ui.pace.classList.remove('ack-pace','reading-pace');ui.pace.setAttribute('aria-label','Continue this moment');ui.thought.replaceChildren();ui.thought.hidden=true;ui.thought.classList.remove('visible');ui.status.textContent='';ui.stage.dataset.phase='title';ui.stage.dataset.high='';delete ui.stage.dataset.duration;delete ui.stage.dataset.tod;delete ui.stage.dataset.escapeFocus;delete ui.stage.dataset.escapePrompt;delete ui.stage.dataset.escapePressure;delete ui.stage.dataset.skip;delete ui.stage.dataset.skipping;delete ui.reflection.dataset.mode;delete ui.reflection.dataset.courseTone;applySettings();$('begin').focus({preventScroll:true});
}
async function begin(){if(G.phase!=='title'||G.busy)return;clock.reset();audio.init();ui.title.hidden=true;ui.hud.hidden=false;ui.stage.focus({preventScroll:true});await run(async()=>{setScene('party','party',0,'FRIDAY · 21 AUGUST',23*60+14);G.player.x=72;audio.setMode('party');ui.curtain.style.opacity=.6;await fade(0,.28);});startOpeningAttention();}

for(const id of ['sound','titleSound','pauseSound'])$(id).onclick=toggleSound;
for(const id of ['titleMotion','pauseMotion'])$(id).onclick=toggleMotion;
for(const id of ['titleVolume','pauseVolume'])$(id).addEventListener('input',e=>{settings.volume=Number(e.target.value);applySettings();});
$('begin').onclick=begin;
ui.interact.onclick=()=>interact();ui.next.onclick=()=>advance();ui.pace.onclick=()=>{if(acknowledgementActive)pointerActionBlockedUntil=performance.now()+240;advanceBeat();};

$('pause').onclick=()=>pause(true);$('resume').onclick=()=>pause(false);$('again').onclick=reset;
$('restart').onclick=()=>{reset();};
$('help').onclick=()=>{ui.support.hidden=false;$('supportBack').focus({preventScroll:true});};
$('supportBack').onclick=()=>{ui.support.hidden=true;$('help').focus({preventScroll:true});};
window.addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey)return;const k=e.key.toLowerCase();
  if(e.target instanceof HTMLInputElement)return;
  const button=e.target instanceof HTMLElement&&['BUTTON','A'].includes(e.target.tagName);
  if(G.phase==='title'&&(!button||e.target.id==='begin')&&!['tab','escape','m'].includes(k)){e.preventDefault();if(!e.repeat)begin();return;}
  if(k==='escape'){e.preventDefault();if(!ui.support.hidden){ui.support.hidden=true;$('help').focus({preventScroll:true});return;}if(!e.repeat)pause(!G.paused);return;}
  if(k==='m'){if(!e.repeat)toggleSound();return;}
  if(k==='tab'){const panel=!ui.pauseScreen.hidden?ui.pauseScreen:!ui.support.hidden?ui.support:!ui.deskChoice.hidden?ui.deskChoice:!ui.choice.hidden?ui.choice:!ui.phone.hidden?ui.phone:null;if(panel){const list=[...panel.querySelectorAll('button:not(:disabled),a[href],input,summary')];if(list.length){const first=list[0],last=list[list.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}return;}
  if(G.paused)return;
  if(acknowledgementKeyLocks.has(k)){e.preventDefault();return;}
  if(pendingBeat&&['enter','e',' '].includes(k)){e.preventDefault();if(!e.repeat){if(acknowledgementActive)acknowledgementKeyLocks.add(k);advanceBeat();}return;}
  if(k===' '){const escapeButton=[...document.querySelectorAll('button[data-action="escape"]')].find(b=>!b.disabled&&b.getClientRects().length);if(escapeButton){e.preventDefault();if(!e.repeat)escapeButton.click();return;}}
  if(k==='enter'){if(currentLine){e.preventDefault();if(!e.repeat)advance();}else if(!button&&G.phase==='title'){e.preventDefault();begin();}return;}
  if(['a','d','arrowleft','arrowright','w','arrowup','e',' '].includes(k)){
    if(button&&!G.high&&k===' ')return;e.preventDefault();
    if(G.cinematic)return;
    if(G.high){if(k!=='e')G.keys.add(k);return;}
    if(k==='e'||k===' '){if(!e.repeat)interact();}else if(!G.busy)G.keys.add(k);
  }
});
window.addEventListener('resize',()=>{requestAnimationFrame(()=>{if(!ui.phone.hidden&&phoneScrollMode==='end')ui.messages.scrollTop=ui.messages.scrollHeight;if(!ui.montageMessages.hidden&&!stormDepartureActive){const origin=[...document.querySelectorAll('button[data-action=\"escape\"]')].find(b=>!b.disabled&&b.getClientRects().length)||null;layoutMontageMessages(origin);}});});
window.addEventListener('keyup',e=>{const k=e.key.toLowerCase();G.keys.delete(k);acknowledgementKeyLocks.delete(k);});
window.addEventListener('blur',()=>{G.keys.clear();if(G.phase!=='title'&&G.phase!=='complete')pause(true);});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true);});
ui.world.addEventListener('pointerdown',e=>{if(G.paused)return;if(pendingBeat){if(acknowledgementActive)return;advanceBeat();return;}if(G.cinematic||G.busy&&!G.high)return;const r=ui.world.getBoundingClientRect();G.target=clamp((e.clientX-r.left)/r.width*480,34,446);ui.stage.focus({preventScroll:true});});
let previous=performance.now();function frame(now){const dt=Math.min((now-previous)/1000,.05);previous=now;if(!G.paused)update(dt);draw();requestAnimationFrame(frame);}
reset();requestAnimationFrame(frame);
})();
