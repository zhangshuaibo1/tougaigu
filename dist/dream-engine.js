import { DREAM_LEVELS, getDreamLevel } from './dream-levels.js';
import { getFestivalLevel } from './dream-festival-levels.js';
import { FESTIVAL_VISUAL_IDS, getFestivalTheme, getOutfitPalette, drawFestivalArchitecture, drawFestivalProps, drawFestivalWeather, drawFestivalGift, drawFestivalNPC, drawFestivalPlatform, drawOutfitBack, drawOutfitHat, drawCompass } from './dream-festival-art.js';
import { resolveCapScene, drawCapInterior, drawCapFrontRim, drawCapTheatre, drawSoulVision, createCapRig, transformCapPoint, solveCapArm } from './dream-cap-art.js';
import { getCapActivity } from './dream-cap-activities.js';
import { DreamCapActivity } from './dream-cap-activity-engine.js';
import { drawCapActivity } from './dream-cap-activity-art.js';
import { drawSceneBackdrop } from './dream-scene-backdrop.js';
import { getLostCase } from './dream-lost-cases.js';
import { DreamLostCase } from './dream-lost-engine.js';
import { drawLostCase } from './dream-lost-art.js';
import { getStoryNPC, getStoryEncounter } from './dream-encounters.js';
import { drawStoryNPC } from './dream-encounter-art.js';

const TAU=Math.PI*2;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const mix=(a,b,t)=>a+(b-a)*clamp(t,0,1);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const approach=(a,b,d)=>a<b?Math.min(b,a+d):Math.max(b,a-d);
const FONT='"PingFang SC","Microsoft YaHei",sans-serif';
const FIXED_STEP=1/60;
const MAX_FRAME_ELAPSED=.2;
const ease=n=>{n=clamp(n,0,1);return n*n*(3-2*n);};
const STORY_BACKDROP_SCENES=['station','garden','theatre','library','coast','post'];
// Festival chapterIndex is intentionally zero; keep its authored physical base explicit.
const FESTIVAL_BACKDROP_SCENES={halloween:'station',thanksgiving:'garden',christmas:'library',newyear:'coast',spring:'post',lantern:'theatre',valentine:'garden',dragonboat:'theatre',qixi:'library',midautumn:'station'};
export const DREAM_PHYSICS={gravity:1350,speed:240,jump:600,soulSpeed:340,tether:565,maxEnergy:100,energyDrain:4.3,pulseRadius:102};

export function createDreamRng(seed=1){
  let value=2166136261;
  for(const c of String(seed)){value^=c.charCodeAt(0);value=Math.imul(value,16777619);}
  return ()=>{value+=0x6D2B79F5;let x=value;x=Math.imul(x^(x>>>15),x|1);x^=x+Math.imul(x^(x>>>7),x|61);return ((x^(x>>>14))>>>0)/4294967296;};
}
export function getDreamStars(result,parTime=140){
  return 1+(result.memories>=3?1:0)+(result.memories>=3&&result.deaths===0&&result.time<=parTime?1:0);
}
function roundRect(c,x,y,w,h,r=8){
  r=Math.min(r,w/2,h/2);c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();
}
function box(c,x,y,w,h,r,fill,stroke){roundRect(c,x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}}
function ellipse(c,x,y,rx,ry,fill,rotation=0){c.beginPath();c.ellipse(x,y,rx,ry,rotation,0,TAU);c.fillStyle=fill;c.fill();}
function line(c,points,color,width=2){c.beginPath();points.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function star(c,x,y,r,color){c.beginPath();c.moveTo(x,y-r);c.quadraticCurveTo(x+r*.2,y-r*.2,x+r,y);c.quadraticCurveTo(x+r*.2,y+r*.2,x,y+r);c.quadraticCurveTo(x-r*.2,y+r*.2,x-r,y);c.quadraticCurveTo(x-r*.2,y-r*.2,x,y-r);c.fillStyle=color;c.fill();}
function circleRect(x,y,r,rect){const nearX=clamp(x,rect.x,rect.x+rect.w),nearY=clamp(y,rect.y,rect.y+rect.h);return Math.hypot(x-nearX,y-nearY)<r;}

export class DreamGame {
  constructor(canvas,callbacks={}){
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.callbacks=callbacks;this.state='idle';this.form='body';this.input={x:0,y:0};this.destroyed=false;this.raf=null;this.audio=null;this.lastFrame=null;this.frameAccumulator=0;this.runId=0;this.dpr=1;this.scale=1;this.viewWidth=1280;this.viewHeight=640;
    this._resize=()=>this.resize();
    this._visibility=()=>{if(typeof document!=='undefined'&&document.hidden)this.pause('visibility');};
    this._blur=()=>this.pause('blur');
    if(typeof window!=='undefined'){window.addEventListener('resize',this._resize);window.addEventListener('blur',this._blur);}
    if(typeof document!=='undefined')document.addEventListener('visibilitychange',this._visibility);
    this.resize();
  }
  resize(){
    const rect=this.canvas.getBoundingClientRect?.()||{width:1280,height:640};
    this.cssWidth=Math.max(300,rect.width||1280);this.cssHeight=Math.max(240,rect.height||640);
    this.dpr=Math.min(2,typeof window!=='undefined'?(window.devicePixelRatio||1):1);
    this.canvas.width=Math.round(this.cssWidth*this.dpr);this.canvas.height=Math.round(this.cssHeight*this.dpr);
    this.baseScale=this.cssHeight/640;this.viewHeight=640;this.updateViewport();
  }
  updateViewport(){
    const wasFramed=this.activityFramed===true;
    this.lostFramed=this.form==='soul'&&!!this.lostCase?.available&&this.lostCase.opened&&this.lostCase.bodyInRange(this.body);
    this.activityFramed=this.lostFramed||(this.form==='soul'&&!!this.capActivity?.bodyInRange(this.body)&&(this.capActivity.started||this.capActivity.phase==='complete'));
    this.scale=this.activityFramed?Math.min(this.baseScale,this.cssWidth/400):this.baseScale;
    this.viewWidth=this.cssWidth/this.scale;this.viewportOffsetY=Math.max(0,(this.cssHeight-640*this.scale)/2);
    if(!this.level)return;
    const limit=Math.max(0,this.level.width-this.viewWidth);
    if(this.activityFramed)this.camera=clamp(320-this.viewWidth/2,0,limit);
    else if(wasFramed){const target=this.form==='soul'?this.soul.x:this.body.x;this.camera=clamp(target-this.viewWidth*.43,0,limit);}
    else this.camera=clamp(this.camera||0,0,limit);
  }
  start(options={}){
    if(this.destroyed)return;
    this.capActivity?.destroy();
    this.lostCase?.destroy();
    if(this.raf!==null&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(this.raf);
    this.runId++;const startedRun=this.runId;
    this.options={chapterIndex:0,sound:true,reducedMotion:false,...options};
    this.restartLostUnlocked=this.options.lostCaseUnlocked===true;
    const festivalLevel=this.options.festival?.id?getFestivalLevel(this.options.festival.id):null;
    this.mode=festivalLevel?'festival':'story';this.festival=festivalLevel?this.options.festival:null;this.festivalId=this.festival?.id||null;
    this.level=festivalLevel||getDreamLevel(this.options.chapterIndex);this.chapterIndex=this.level.chapterIndex;
    // Friends inhabit a fresh runtime copy; the authored collision maps stay untouched.
    if(this.mode==='story'){const friend=getStoryNPC(this.chapterIndex);this.level.npcs=friend?[{...friend}]:[];}
    if(this.festival&&Array.isArray(this.festival.gifts))this.level.memories.forEach((gift,index)=>{if(typeof this.festival.gifts[index]==='string')gift.name=this.festival.gifts[index];});
    this.baseTheme={...this.level.theme,sky:[...this.level.theme.sky]};
    this.season=FESTIVAL_VISUAL_IDS.includes(this.options.season?.id)?this.options.season:null;
    this.outfit=FESTIVAL_VISUAL_IDS.includes(this.options.outfit)||this.options.outfit==='starlight'?this.options.outfit:'auto';
    this.applySeasonTheme();
    this.capScene=resolveCapScene(this.options.capScene,this.chapterIndex,this.festivalId,this.level.theme);
    this.time=0;this.visualTime=0;this.deaths=0;this.energy=DREAM_PHYSICS.maxEnergy;this.maxEnergy=DREAM_PHYSICS.maxEnergy;this.form='body';this.state='playing';this.pendingSeal=null;this.pendingTalk=null;this.talked=new Set();this.completed=false;
    this.compassTime=0;this.featherCharges=0;this.emoteTime=0;
    this.input={x:0,y:0};this.body={...this.level.spawn,w:30,h:58,vx:0,vy:0,face:1,grounded:true,coyote:.12,platform:null,invulnerable:1,walk:0,land:0};
    this.soul={x:this.body.x,y:this.body.y-58,vx:0,vy:0};this.checkpoint={...this.level.spawn,index:-1};
    this.companion={x:this.mode==='story'?clamp(this.body.x-this.body.face*65,30,this.level.width-30):this.body.x+75,y:this.body.y};
    this.memories=this.level.memories.map(m=>({...m,collected:false}));this.lanterns=this.level.lanterns.map(l=>({...l,lit:false,glow:0}));
    this.movers=this.level.movers.map(m=>({...m,baseX:m.x,baseY:m.y,prevX:m.x,prevY:m.y}));
    this.hazards=this.level.hazards.map(h=>({...h,clock:0,frozen:0,hitCooldown:0,px:h.x,py:h.y}));
    this.pads=this.level.pads.map(p=>({...p,boing:0,cooldown:0}));this.plateState=new Map();this.particles=[];this.pulses=[];this.camera=0;this.capOpen=0;this.jumpBuffer=0;this.hudTick=0;this.trailTick=0;this.eventCooldown=0;this.pulseCooldown=0;this.lastCheckpointEvent=-1;this.shake=0;
    this.resetCapPresentation();
    this.capActivity=this.createCapActivity(this.options.capActivityRecord,this.options.capActivityRevision);
    this.lostCase=this.createLostCase(this.options.lostCaseRecord,this.options.lostCaseRevision);
    this.rng=createDreamRng('dream-'+(this.festivalId||this.chapterIndex));this.decorations=Array.from({length:90},()=>({x:this.rng()*this.level.width,y:40+this.rng()*480,r:.5+this.rng()*2,phase:this.rng()*TAU,speed:.3+this.rng()}));
    this.updateMovers(0);this.updatePlates();this.resize();this.refreshCapActivity();
    if(this.destroyed||this.runId!==startedRun)return;
    this.emitHud(true);this.event(this.level.tutorial,'tutorial',true);this.lastFrame=null;this.frameAccumulator=0;
    if(typeof requestAnimationFrame==='function')this.raf=requestAnimationFrame(t=>this.frame(t));
  }
  frame(timestamp){
    if(this.destroyed)return;
    const now=Number(timestamp);
    const elapsed=Number.isFinite(now)&&Number.isFinite(this.lastFrame)?clamp((now-this.lastFrame)/1000,0,MAX_FRAME_ELAPSED):0;
    this.lastFrame=Number.isFinite(now)?now:null;
    if(this.state==='playing'){
      // Slow rendering must not slow walking or make the chapter clock drift.
      // Catch up in collision-safe steps, with a strict bound for suspended tabs.
      this.frameAccumulator=Math.min(MAX_FRAME_ELAPSED,this.frameAccumulator+elapsed);
      const steps=Math.min(12,Math.floor((this.frameAccumulator+1e-9)/FIXED_STEP)),run=this.runId;
      for(let i=0;i<steps&&this.state==='playing'&&this.runId===run;i++){
        this.frameAccumulator=Math.max(0,this.frameAccumulator-FIXED_STEP);
        this.update(FIXED_STEP);
      }
      if(this.state!=='playing'||this.runId!==run)this.frameAccumulator=0;
    }else this.frameAccumulator=0;
    this.render();
    if(typeof requestAnimationFrame==='function')this.raf=requestAnimationFrame(t=>this.frame(t));
  }
  setInput(input={}){this.input={x:clamp(Number(input.x)||0,-1,1),y:clamp(Number(input.y)||0,-1,1)};}
  createCapActivity(record,revision){
    const activity=getCapActivity({chapterIndex:this.chapterIndex,festivalId:this.festivalId});
    return activity?new DreamCapActivity(activity,{record,revision,chapterIndex:this.chapterIndex,festivalId:this.festivalId,mode:this.mode,onEvent:event=>this.callbacks.onCapActivity?.(event)}):null;
  }
  setCapActivityRecord(record,revision=this.options?.capActivityRevision){
    if(this.destroyed||!this.level)return false;
    this.capActivity?.destroy();
    this.options.capActivityRecord=record;this.options.capActivityRevision=typeof revision==='string'?revision:'';
    this.restartLostUnlocked=false;this.options.lostCaseUnlocked=false;
    const activity=this.createCapActivity(record,this.options.capActivityRevision);
    this.capActivity=activity;
    activity?.refresh(this.capActivityContext());
    this.refreshLostCase();
    // The refresh callback may itself install a newer imported record.
    if(!this.destroyed&&this.capActivity===activity)this.emitHud(true);
    return !this.destroyed;
  }
  capActivityContext(){return {state:this.state,body:this.body,soul:this.soul,form:this.form,reducedMotion:!!this.options.reducedMotion};}
  refreshCapActivity(){this.capActivity?.refresh(this.capActivityContext());this.refreshLostCase();}
  createLostCase(record,revision){
    const config=getLostCase(this.festivalId||'story-'+this.chapterIndex);if(!config)return null;
    let lost;
    lost=new DreamLostCase(config,{record,revision,chapterIndex:this.chapterIndex,festivalId:this.festivalId,mode:this.mode,onEvent:event=>{
      if(this.destroyed||this.lostCase!==lost)return;
      this.options.lostCaseRecord=lost.getRecord();
      this.callbacks.onLostCase?.(event);
    }});
    return lost;
  }
  setLostCaseRecord(record,revision=this.options?.lostCaseRevision){
    if(this.destroyed||!this.level)return false;
    this.lostCase?.destroy();this.restartLostUnlocked=false;this.options.lostCaseUnlocked=false;
    this.options.lostCaseRecord=record;this.options.lostCaseRevision=typeof revision==='string'?revision:'0:base';
    const lost=this.createLostCase(record,this.options.lostCaseRevision);this.lostCase=lost;
    lost?.refresh(this.lostCaseContext());
    if(!this.destroyed&&this.lostCase===lost)this.emitHud(true);
    return !this.destroyed;
  }
  isLostCaseUnlocked(){
    const record=this.lostCase?.record;
    return !!(this.restartLostUnlocked||this.capActivity?.record.completedVariants.includes(0)||record?.solvedVariants.length||record?.seenClues[0]?.length||record?.seenClues[1]?.length);
  }
  lostCaseContext(){return {...this.capActivityContext(),unlocked:this.isLostCaseUnlocked()};}
  refreshLostCase(){this.lostCase?.refresh(this.lostCaseContext());}
  // The cabinet supplies reading light only inside an actual observation circle.
  hasLostReadingLight(){return !!(this.lostCase?.isExpanded(this.lostCaseContext())&&this.lostCase.nearestTarget(this.soul));}
  setSound(value){this.options.sound=!!value;}
  setReducedMotion(value){
    this.options.reducedMotion=!!value;
    if(value&&this.cap){const opens=this.cap.opens;this.resetCapPresentation();this.cap.opens=opens;this.cap.phase=this.form==='soul'?'open':'closed';this.capOpen=this.form==='soul'?1:0;this.cap.openness=this.capOpen;this.cap.handGrip=this.capOpen;this.cap.handClasp=this.capOpen*.25;this.emitHud();}
    this.refreshCapActivity();
  }
  applySeasonTheme(){
    if(!this.level||!this.baseTheme)return;
    this.level.theme={...this.baseTheme,sky:[...this.baseTheme.sky]};
    // Halloween is a local decoration; six distinct places keep their own atmosphere.
    if(this.mode==='story'&&this.season&&this.season.id!=='halloween'){
      const seasonal=getFestivalTheme(this.season.id);
      this.level.theme={...this.level.theme,sky:seasonal.sky,light:seasonal.light,spirit:seasonal.spirit,accent:seasonal.accent};
    }
  }
  setSeason(config){this.season=FESTIVAL_VISUAL_IDS.includes(config?.id)?config:null;this.options.season=this.season;this.applySeasonTheme();this.render();}
  setOutfit(id='auto'){this.outfit=FESTIVAL_VISUAL_IDS.includes(id)||id==='starlight'?id:'auto';this.options.outfit=this.outfit;this.render();}
  getOutfitId(){return this.outfit==='auto'?(this.festivalId||this.season?.id||null):this.outfit;}
  useItem(id){
    if(this.destroyed||!this.level||!['playing','paused'].includes(this.state)||this.pendingSeal!==null||this.pendingTalk!==null)return false;
    if(id==='glow_candy'){
      if(this.energy>=this.maxEnergy-.01)return false;
      this.energy=this.maxEnergy;this.burst(this.soul.x,this.soul.y,22,this.level.theme.spirit,105);this.event('灵光糖化开了，拾光的能量恢复充足。','item',true);
    }else if(id==='star_compass'){
      if(this.compassTime>0)return false;
      this.compassTime=30;this.event('星引罗盘亮起：跟着金色光圈找礼物、谜灯和出口。','item',true);
    }else if(id==='feather_charm'){
      if(this.featherCharges>0)return false;
      this.featherCharges=1;this.event('轻羽护符已佩戴，下一次跌落会被轻轻接住，不增加跌落次数。','item',true);
    }else return false;
    this.sound('memory');this.emitHud(true);return true;
  }
  jump(){
    if(this.state!=='playing')return false;
    if(this.form==='soul')return this.pulse();
    this.jumpBuffer=.14;
    if(this.body.grounded||this.body.coyote>0){this.body.vy=-DREAM_PHYSICS.jump;this.body.grounded=false;this.body.platform=null;this.body.coyote=0;this.jumpBuffer=0;this.body.land=-.15;this.burst(this.body.x,this.body.y,8,'#d7ceb7',70);this.sound('jump');return true;}
    return false;
  }
  toggleSoul(){
    if(this.state!=='playing')return false;
    if(this.form==='soul')return this.recall();
    if(this.energy<18){this.event('灵魂正在休息。留在身体里，等光芒恢复。','hint');return false;}
    this.form='soul';this.body.vx=0;this.soul={x:this.body.x,y:this.body.y-83,vx:0,vy:-30};this.input={x:0,y:0};
    const previous=this.capOpen,opens=(this.cap?.opens||0)+1,hands={handGrip:this.cap.handGrip,handClasp:this.cap.handClasp,handCatch:this.cap.handCatch};this.resetCapPresentation();
    this.cap={...this.cap,...hands,phase:this.options.reducedMotion?'open':'opening',progress:this.options.reducedMotion?1:0,opens,fromOpen:previous,openness:this.options.reducedMotion?1:previous,entry:this.options.reducedMotion?1:0,projection:this.options.reducedMotion?0:1.4};this.capOpen=this.cap.openness;
    if(this.options.reducedMotion){this.cap.handGrip=1;this.cap.handClasp=.25;this.cap.handCatch=0;}
    this.burst(this.soul.x,this.soul.y,this.options.reducedMotion?0:7,this.level.theme.spirit,45);this.sound('soul');this.capEvent('open');this.refreshCapActivity();this.emitHud(true);return true;
  }
  recall(){
    if(this.state!=='playing'||this.form!=='soul')return false;
    const from=this.getSoulPresentation();
    this.cap={...this.cap,phase:this.options.reducedMotion?'closed':'returning',age:0,progress:this.options.reducedMotion?1:0,fromOpen:this.capOpen,returnFrom:this.options.reducedMotion||from.alpha<=.02?null:{x:from.x,y:from.y,vx:from.vx,vy:from.vy,scale:from.scale,alpha:from.alpha},projection:0,entry:1};
    if(this.options.reducedMotion){this.capOpen=0;this.cap.openness=0;this.cap.handGrip=0;this.cap.handClasp=0;this.cap.handCatch=0;}
    this.form='body';this.soul.vx=0;this.soul.vy=0;this.input={x:0,y:0};this.sound('return');this.refreshCapActivity();this.emitHud(true);this.capEvent('return');return true;
  }
  resetCapPresentation(preserveOpens=false){
    const opens=preserveOpens?(this.cap?.opens||0):0;
    this.cap={phase:'closed',age:0,progress:1,opens,openness:0,fromOpen:0,entry:1,projection:0,returnFrom:null,handGrip:0,handClasp:0,handCatch:0};this.capOpen=0;this.thoughtFlights=[];
  }
  updateCapPresentation(dt){
    const cap=this.cap;if(!cap)return;
    cap.age+=dt;
    if(cap.phase==='opening'){
      cap.progress=clamp(cap.age/.64,0,1);
      // Clasp, hinge, then a peek. Control already belongs to the soul at t = 0.
      cap.openness=cap.fromOpen+(1-cap.fromOpen)*ease((cap.age-.11)/.34);
      cap.entry=ease((cap.age-.24)/.3);
      if(cap.age>=.64){cap.phase='open';cap.progress=1;cap.openness=1;cap.entry=1;}
    }else if(cap.phase==='returning'){
      cap.progress=clamp(cap.age/.72,0,1);
      cap.openness=cap.fromOpen*(1-ease((cap.age-.44)/.28));
      if(cap.age>=.72){cap.phase='closed';cap.progress=1;cap.openness=0;cap.returnFrom=null;}
    }
    const gripTarget=cap.phase==='opening'||cap.phase==='open'||cap.openness>.001?1:0;
    const claspTarget=cap.phase==='opening'?(cap.age<.25?1:.25):cap.phase==='returning'?(cap.age<.55?.8:1):cap.phase==='open'?.25:0;
    const catchTarget=cap.phase==='returning'&&cap.age<.48?1:0;
    cap.handGrip=cap.openness>.001?1:approach(cap.handGrip,gripTarget,dt*12);
    cap.handClasp=approach(cap.handClasp,claspTarget,dt*10);cap.handCatch=approach(cap.handCatch,catchTarget,dt*8);
    if(cap.projection>0&&(cap.phase==='open'||cap.age>.2))cap.projection=Math.max(0,cap.projection-dt);
    this.capOpen=clamp(cap.openness,0,1);
    for(const flight of this.thoughtFlights)flight.age+=dt;
    this.thoughtFlights=this.thoughtFlights.filter(f=>f.age<f.duration).slice(-8);
  }
  getCharacterPresentation(t=this.options.reducedMotion?0:this.visualTime){
    const b=this.body,walking=b.grounded&&Math.abs(b.vx)>12,step=walking?Math.sin(b.walk):0;
    const hop=this.options.reducedMotion?0:walking?Math.abs(Math.cos(b.walk))*2.4:Math.sin(t*1.8)*1.1,scaleY=1-b.land;
    const tilt=this.options.reducedMotion?0:clamp(b.vx/240,-1,1)*.055+(b.grounded?0:b.vy/9000)-this.capOpen*.025;
    const rig=createCapRig({x:b.x,y:b.y,face:b.face,scaleY,hop,tilt,open:this.capOpen}),grip=clamp(this.cap.handGrip,0,1),clasp=clamp(this.cap.handClasp,0,1),catching=clamp(this.cap.handCatch,0,1);
    const leftTarget={x:mix(-16-step*4,rig.gripBody.x,grip)-Math.sin(Math.PI*grip)*16,y:mix(-16,rig.gripBody.y,grip)};
    const catchTarget={x:mix(rig.claspBody.x,rig.catchBody.x,catching),y:mix(rig.claspBody.y,rig.catchBody.y,catching)};
    const rightTarget={x:mix(17+step*4,catchTarget.x,clasp)+Math.sin(Math.PI*clasp)*16,y:mix(-16,catchTarget.y,clasp)};
    const left=solveCapArm({x:-13,y:-35},leftTarget,-1),right=solveCapArm({x:13,y:-35},rightTarget,1);
    left.world=transformCapPoint(rig.bodyMatrix,left.wrist);right.world=transformCapPoint(rig.bodyMatrix,right.wrist);
    return {walking,step,hop,scaleY,tilt,rig,grip,clasp,catching,arms:{left,right}};
  }
  getSoulPresentation(character=null){
    if(this.destroyed||!this.body||!this.soul)return null;
    character=character||this.getCharacterPresentation();
    const cap=this.cap,b=this.body,s=this.soul;
    const opening=character.rig.openingWorld;
    if(this.form==='soul'){
      const q=cap?.phase==='opening'?cap.entry:1;
      return {...s,x:mix(opening.x,s.x,q),y:mix(opening.y,s.y,q),scale:.36+.64*q,alpha:clamp((cap?.openness||0)*3,0,1),pose:q<1?'peek':'free',layer:q<1?'inside':'world'};
    }
    if(cap?.phase!=='returning'||!cap.returnFrom||this.options.reducedMotion)return null;
    const progress=clamp(cap.age/.48,0,1);if(progress>=1)return null;
    const q=ease(progress),u=1-q,from=cap.returnFrom,to=opening,lift=Math.min(135,28+Math.hypot(to.x-from.x,to.y-from.y)*.17);
    const cx1=from.x+(to.x-from.x)*.3,cy1=from.y-lift,cx2=to.x-b.face*33,cy2=to.y-52;
    return {x:u*u*u*from.x+3*u*u*q*cx1+3*u*q*q*cx2+q*q*q*to.x,y:u*u*u*from.y+3*u*u*q*cy1+3*u*q*q*cy2+q*q*q*to.y,vx:clamp((to.x-from.x)*1.3,-340,340),vy:0,scale:(from.scale??1)*(1-q*.68),alpha:(from.alpha??1)*clamp((1-progress)/.13,0,1),pose:'return',layer:'inside'};
  }
  capEvent(type,index){this.callbacks.onCapEvent?.({type,...(Number.isInteger(index)?{index}:{}),chapterIndex:this.chapterIndex,festivalId:this.festivalId,mode:this.mode});}
  rememberInCap(source,type,index){
    if(!this.options.reducedMotion){this.thoughtFlights.push({x:source.x,y:source.y,color:type==='seal'?this.level.theme.light:this.level.theme.spirit,age:0,duration:.8});this.thoughtFlights=this.thoughtFlights.slice(-8);}
    this.capEvent(type,index);
  }
  pulse(){
    if(this.state!=='playing'||this.pendingSeal!==null)return false;
    if(this.form!=='soul'){this.event('按 E 掀开头盖骨，让灵魂去和灯说话。','hint');return false;}
    if(this.pulseCooldown>0)return false;
    this.pulseCooldown=.45;this.pulses.push({x:this.soul.x,y:this.soul.y,age:0,r:0,max:210});this.sound('pulse');
    let froze=false;
    for(const h of this.hazards){if(Math.hypot(h.px-this.soul.x,h.py-this.soul.y)<240){h.frozen=4.5;froze=true;this.burst(h.px,h.py,12,'#c8ecff',80);}}
    if(froze)this.event('嘘——时间睡着了。现在回到身体，通过钟摆。','freeze',true);
    const index=this.lanterns.findIndex(l=>!l.lit&&dist(l,this.soul)<=DREAM_PHYSICS.pulseRadius);
    if(index>=0){
      if(typeof this.callbacks.onPuzzle==='function'){
        this.pendingSeal=index;this.state='paused';this.input={x:0,y:0};this.soul.vx=0;this.soul.vy=0;this.frameAccumulator=0;this.refreshCapActivity();this.emitHud(true);
        this.callbacks.onPuzzle({chapterIndex:this.chapterIndex,sealIndex:index,id:this.lanterns[index].id,mode:this.mode,festivalId:this.festivalId});
      }else this.lightSeal(index);
      return true;
    }
    if(!froze&&this.capActivity?.pulse(this.soul)){this.emitHud(true);return true;}
    this.refreshLostCase();
    const lost=this.lostCase;
    if(!froze&&lost?.pulse(this.soul)){if(!this.destroyed&&this.lostCase===lost)this.emitHud(true);return true;}
    if(!froze)this.event('再靠近一点。灯笼听见灵魂的共鸣，就会醒来。','hint');
    return froze;
  }
  resolvePuzzle(correct){
    if(this.pendingSeal===null||this.state!=='paused')return false;
    const index=this.pendingSeal;this.pendingSeal=null;
    if(correct===true)this.lightSeal(index);
    this.state='playing';this.lastFrame=null;this.frameAccumulator=0;this.input={x:0,y:0};this.refreshCapActivity();this.emitHud(true);return correct===true;
  }
  lightSeal(index){
    const lamp=this.lanterns[index];if(!lamp||lamp.lit)return false;
    lamp.lit=true;lamp.glow=1;this.energy=Math.min(this.maxEnergy,this.energy+24);this.burst(lamp.x,lamp.y,30,this.level.theme.light,160);this.pulses.push({x:lamp.x,y:lamp.y,age:0,r:0,max:290});this.sound('light');
    this.emoteTime=2;
    const giftsLeft=this.memories.filter(m=>!m.collected).length;
    this.event(this.lanterns.every(l=>l.lit)?(this.mode==='festival'&&giftsLeft?'谜灯都亮了，再找回 '+giftsLeft+' 份礼物，就能寄出节日包裹。':'两盏诗灯都醒了。按 E 回到身体，走向发光的门。'):'一盏诗灯亮了。它记住了你的答案，也为身体打开了路。','seal',true);this.emitHud(true);this.rememberInCap(lamp,'seal',index);return true;
  }
  getNearbyNPC(){
    if(this.form!=='body'||!this.body)return null;
    return this.level?.npcs?.find(npc=>Math.abs(npc.x-this.body.x)<98&&Math.abs(npc.y-this.body.y)<90)||null;
  }
  getNPCName(npc){return this.mode==='festival'?(this.festival?.npc?.name||'节日朋友'):(npc?.name||'旅途朋友');}
  getStoryNPCView(npc=this.level?.npcs?.[0]){
    if(this.mode!=='story'||!npc||!this.body)return null;
    const near=Math.abs(npc.x-this.body.x)<98&&Math.abs(npc.y-this.body.y)<90;
    const look=near&&this.form==='soul'?this.soul:{x:this.body.x,y:this.body.y-35};
    const {id,chapterIndex,speaker,name,motif,prop,x,y,accent}=npc;
    return {id,chapterIndex,speaker,name,motif,prop,x,y,accent,near,talking:this.pendingTalk===id,talked:this.talked.has(id),seals:this.lanterns.filter(lamp=>lamp.lit).length,form:this.form,look:{x:look.x,y:look.y},capOpen:clamp(this.cap?.openness||0,0,1)};
  }
  interact(){
    if(this.state!=='playing')return false;
    if(this.form==='soul')return this.pulse();
    if(this.canExit()){this.finish();return true;}
    const npc=this.getNearbyNPC();
    if(npc){
      if(typeof this.callbacks.onTalk==='function'){
        this.pendingTalk=npc.id;this.state='paused';this.input={x:0,y:0};this.body.vx=0;this.frameAccumulator=0;this.refreshCapActivity();this.emitHud(true);
        this.callbacks.onTalk(this.mode==='festival'?{mode:this.mode,festivalId:this.festivalId,npcId:this.festival?.npc?.id||npc.id,repeated:this.talked.has(npc.id)}:{mode:'story',chapterIndex:this.chapterIndex,npcId:npc.id,repeated:this.talked.has(npc.id),seals:this.lanterns.filter(lamp=>lamp.lit).length});
      }else if(this.mode==='story'){
        const lines=getStoryEncounter(this.chapterIndex,{seals:this.lanterns.filter(lamp=>lamp.lit).length,repeated:this.talked.has(npc.id)});
        this.event(lines?.[0]?.text||this.level.tutorial,'story',true);this.talked.add(npc.id);
      }else this.event(this.festival?.sceneHint||this.level.tutorial,'story',true);
      return true;
    }
    if(this.capActivity?.replay(this.capActivityContext())){this.sound('soul');this.emitHud(true);return true;}
    const lost=this.lostCase;
    if(lost?.open(this.lostCaseContext())){if(!this.destroyed&&this.lostCase===lost){this.sound('soul');this.emitHud(true);}return true;}
    this.event(this.getNearHint()||this.level.mechanic,'hint');return false;
  }
  resolveTalk(){
    if(this.pendingTalk===null||this.state!=='paused')return false;
    this.talked.add(this.pendingTalk);this.pendingTalk=null;this.state='playing';this.lastFrame=null;this.frameAccumulator=0;this.input={x:0,y:0};this.refreshCapActivity();this.emitHud(true);return true;
  }
  pause(reason='manual'){
    if(this.state!=='playing'||this.pendingSeal!==null||this.pendingTalk!==null)return false;
    this.state='paused';this.input={x:0,y:0};this.lastFrame=null;this.frameAccumulator=0;this.refreshCapActivity();this.emitHud(true);this.callbacks.onPause?.(reason);return true;
  }
  resume(){if(this.state!=='paused'||this.pendingSeal!==null||this.pendingTalk!==null)return false;this.state='playing';this.lastFrame=null;this.frameAccumulator=0;this.input={x:0,y:0};this.refreshCapActivity();this.emitHud(true);return true;}
  restart(){this.start({...this.options,capActivityRecord:null,lostCaseRecord:this.lostCase?.getRecord()||this.options.lostCaseRecord,lostCaseUnlocked:this.isLostCaseUnlocked()});}
  destroy(){
    this.destroyed=true;this.state='destroyed';if(this.raf!==null&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(this.raf);
    if(typeof window!=='undefined'){window.removeEventListener('resize',this._resize);window.removeEventListener('blur',this._blur);}
    if(typeof document!=='undefined')document.removeEventListener('visibilitychange',this._visibility);
    if(this.audio?.close)this.audio.close().catch(()=>{});this.audio=null;this.particles=[];this.pulses=[];this.resetCapPresentation(true);this.capActivity?.destroy();this.capActivity=null;this.lostCase?.destroy();this.lostCase=null;
  }
  updateMovers(dt){
    for(const p of this.movers){p.prevX=p.x;p.prevY=p.y;const offset=Math.sin(this.time*p.speed+p.phase)*p.range;p.x=p.baseX+(p.axis==='x'?offset:0);p.y=p.baseY+(p.axis==='y'?offset:0);p.dx=p.x-p.prevX;p.dy=p.y-p.prevY;}
  }
  updatePlates(){
    for(const p of this.level.plates){this.plateState.set(p.id,this.body.x>p.x-5&&this.body.x<p.x+p.w+5&&Math.abs(this.body.y-p.y)<9);}
  }
  barrierOpen(barrier){return (Number.isInteger(barrier.latchedBy)&&this.lanterns[barrier.latchedBy]?.lit)||(barrier.plateId&&this.plateState.get(barrier.plateId))||false;}
  getSolids(){return [...this.level.platforms.filter(p=>p.solid),...this.level.barriers.filter(b=>!this.barrierOpen(b))];}
  update(dt){
    if(this.state!=='playing'||this.destroyed||!this.level)return;
    dt=clamp(Number(dt)||0,0,.04);if(dt===0)return;
    this.time+=dt;this.visualTime+=dt;this.eventCooldown=Math.max(0,this.eventCooldown-dt);this.pulseCooldown=Math.max(0,(this.pulseCooldown||0)-dt);this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);this.shake=Math.max(0,this.shake-dt*9);this.compassTime=Math.max(0,this.compassTime-dt);this.emoteTime=Math.max(0,this.emoteTime-dt);
    this.updateMovers(dt);
    const b=this.body,oldPlatform=this.movers.find(p=>p.id===b.platform);
    if(b.grounded&&oldPlatform){b.x+=oldPlatform.dx;b.y+=oldPlatform.dy;}
    b.invulnerable=Math.max(0,b.invulnerable-dt);b.land=approach(b.land,0,dt*2.8);b.coyote=b.grounded?.12:Math.max(0,b.coyote-dt);
    b.vx=approach(b.vx,(this.form==='body'?this.input.x:0)*DREAM_PHYSICS.speed,dt*1650);
    if(Math.abs(b.vx)>10){b.face=Math.sign(b.vx);b.walk+=dt*Math.abs(b.vx)/20;}
    const solids=this.getSolids();const previousX=b.x;b.x=clamp(b.x+b.vx*dt,18,this.level.width-18);
    for(const p of solids){if(b.x+b.w/2>p.x&&b.x-b.w/2<p.x+p.w&&b.y>p.y+2&&b.y-b.h<p.y+p.h-2){if(previousX<=p.x)b.x=p.x-b.w/2;else if(previousX>=p.x+p.w)b.x=p.x+p.w+b.w/2;else b.x=previousX;b.vx=0;}}
    const oldFeet=b.y,oldHead=b.y-b.h;
    b.vy=Math.min(850,b.vy+DREAM_PHYSICS.gravity*dt);b.y+=b.vy*dt;b.grounded=false;b.platform=null;
    const surfaces=[...this.level.platforms,...this.movers,...this.level.barriers.filter(p=>!this.barrierOpen(p))];
    if(b.vy>=0){
      let landing=null;
      for(const p of surfaces){if(b.x+b.w/2>p.x+1&&b.x-b.w/2<p.x+p.w-1&&oldFeet<=p.y+3&&b.y>=p.y&&(!landing||p.y<landing.y-.01||(Math.abs(p.y-landing.y)<.01&&p.id&&p.id===oldPlatform?.id)))landing=p;}
      if(landing){if(b.vy>180){b.land=Math.min(.22,b.vy/3000);this.burst(b.x,landing.y,6,'#b7c5b8',60);}b.y=landing.y;b.vy=0;b.grounded=true;b.platform=landing.id||null;}
    }else{
      for(const p of solids){if(b.x+b.w/2>p.x&&b.x-b.w/2<p.x+p.w&&oldHead>=p.y+p.h-1&&b.y-b.h<=p.y+p.h){b.y=p.y+p.h+b.h;b.vy=0;}}
    }
    for(const pad of this.pads){pad.boing=Math.max(0,pad.boing-dt);pad.cooldown=Math.max(0,pad.cooldown-dt);if(this.form==='body'&&b.grounded&&pad.cooldown===0&&b.x>pad.x&&b.x<pad.x+pad.w&&Math.abs(b.y-pad.y)<6){b.vy=-pad.power;b.grounded=false;b.coyote=0;b.platform=null;pad.boing=.75;pad.cooldown=.6;this.burst(b.x,b.y-12,17,this.level.theme.accent,120);this.sound('bounce');this.event('借一朵蘑菇的力气，跳得比烦恼更高。','bounce');}}
    if(this.jumpBuffer>0&&(b.grounded||b.coyote>0)&&this.form==='body')this.jump();
    this.updatePlates();
    if(this.form==='soul'){
      const s=this.soul;let nx=this.input.x,ny=this.input.y;const length=Math.hypot(nx,ny);if(length>1){nx/=length;ny/=length;}
      let wx=0,wy=0;for(const wind of this.level.winds){if(s.x>=wind.x&&s.x<=wind.x+wind.w&&s.y>=wind.y&&s.y<=wind.y+wind.h){wx+=wind.dx;wy+=wind.dy;}}
      s.vx=mix(s.vx,nx*DREAM_PHYSICS.soulSpeed+wx,dt*7);s.vy=mix(s.vy,ny*DREAM_PHYSICS.soulSpeed+wy,dt*7);
      const sx=s.x,sy=s.y;s.x=clamp(s.x+s.vx*dt,16,this.level.width-16);s.y=clamp(s.y+s.vy*dt,32,545);
      for(const gate of this.level.barriers.filter(g=>g.plateId&&!this.barrierOpen(g))){
        if(circleRect(s.x,s.y,15,gate)){if(sx+15<=gate.x)s.x=gate.x-15;else if(sx-15>=gate.x+gate.w)s.x=gate.x+gate.w+15;else{s.x=sx;s.y=sy;}s.vx=0;this.event('门只听身体的重量。按 E 回去，让身体踩住铜踏板。','hint');}
      }
      const anchor={x:b.x,y:b.y-56},distance=dist(s,anchor);
      if(distance>DREAM_PHYSICS.tether){const factor=DREAM_PHYSICS.tether/distance;s.x=anchor.x+(s.x-anchor.x)*factor;s.y=anchor.y+(s.y-anchor.y)*factor;s.vx*=.35;s.vy*=.35;this.event('离身体太远啦。按 E 回来，带着身体向前走。','hint');}
      if(!this.hasLostReadingLight())this.energy=Math.max(0,this.energy-dt*DREAM_PHYSICS.energyDrain);
      this.trailTick-=dt;if(this.trailTick<=0&&!this.options.reducedMotion){this.trailTick=.055;this.particle(s.x,s.y,-s.vx*.06,12-s.vy*.03,this.level.theme.spirit,.65,2.2);}
      if(this.energy<=0){this.recall();this.event('灵魂打了个哈欠，回到身体充充电。已点亮的灯会等你。','recall',true);}
    }else this.energy=Math.min(this.maxEnergy,this.energy+dt*18);
    this.updateCapPresentation(dt);
    for(const lamp of this.lanterns)lamp.glow=Math.max(0,lamp.glow-dt*.4);
    const actor=this.form==='soul'?this.soul:{x:b.x,y:b.y-30};
    for(let index=0;index<this.memories.length;index++){const m=this.memories[index];if(!m.collected&&dist(m,actor)<34){m.collected=true;this.emoteTime=2.3;this.burst(m.x,m.y,24,this.level.theme.accent,125);this.energy=Math.min(this.maxEnergy,this.energy+15);this.sound('memory');this.event(this.mode==='festival'?'收进邮包 · '+(m.name||'节日礼物')+'（'+this.memories.filter(item=>item.collected).length+'/3）':'拾到一页记忆。有人把没说完的话，留在了这里。','memory',true);this.rememberInCap(m,'memory',index);}}
    for(const h of this.hazards){
      h.frozen=Math.max(0,h.frozen-dt);h.hitCooldown=Math.max(0,h.hitCooldown-dt);
      if(h.frozen===0)h.clock+=dt;
      if(h.kind==='pendulum'){h.angle=Math.sin(h.clock*h.speed+h.phase)*h.swing;h.px=h.x+Math.sin(h.angle)*h.length;h.py=h.y+Math.cos(h.angle)*h.length;}
      else {h.px=h.x+Math.sin(h.clock*h.speed)*h.range;h.py=h.y+Math.sin(h.clock*2)*8;}
      if(h.frozen===0&&b.invulnerable===0&&circleRect(h.px,h.py,h.r,{x:b.x-b.w/2,y:b.y-b.h,w:b.w,h:b.h})){this.respawn('影子碰到了身体。回到最近的暖灯，路还记得你。');break;}
      if(h.frozen===0&&this.form==='soul'&&h.hitCooldown===0&&Math.hypot(h.px-this.soul.x,h.py-this.soul.y)<h.r+17){this.energy=Math.max(0,this.energy-22);h.hitCooldown=1.2;this.soul.vx=(this.soul.x-h.px)*9;this.soul.vy=-170;this.burst(this.soul.x,this.soul.y,10,'#f1b5a3',80);this.event('影子会吹散灵光。靠近后按空格，让它安静一会儿。','hint');}
    }
    if(b.y>720)this.respawn('没关系，掉下去的只是这一小步。灯会把你接回来。');
    if(b.grounded&&Math.abs(b.y-560)<8){for(let i=0;i<this.level.checkpoints.length;i++){const cp=this.level.checkpoints[i];if(i>this.checkpoint.index&&b.x>=cp.x){this.checkpoint={...cp,index:i};this.burst(cp.x,cp.y-22,10,this.level.theme.light,65);this.event('暖灯记住了这里。散架后，会从这里再出发。','checkpoint');}}}
    if(this.canExit()){this.finish();return;}
    this.capActivity?.update(dt,this.capActivityContext());
    if(this.destroyed||this.state!=='playing')return;
    this.lostCase?.update(dt,this.lostCaseContext());
    for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=1-dt*.7;p.vy+=dt*8;}
    this.particles=this.particles.filter(p=>p.life>0).slice(-180);
    for(const p of this.pulses){p.age+=dt;p.r=p.max*Math.min(1,p.age/.7);}
    this.pulses=this.pulses.filter(p=>p.age<.8).slice(-8);
    this.updateViewport();
    const target=this.form==='soul'?this.soul.x:this.body.x,targetCamera=clamp(target-this.viewWidth*.43,0,Math.max(0,this.level.width-this.viewWidth));
    if(!this.activityFramed)this.camera=this.options.reducedMotion?targetCamera:mix(this.camera,targetCamera,dt*5.5);
    this.companion.x=mix(this.companion.x,clamp(b.x-b.face*65,30,this.level.width-30),dt*3);this.companion.y=mix(this.companion.y,Math.min(560,b.y+10),dt*4);
    this.hudTick-=dt;if(this.hudTick<=0){this.hudTick=.1;this.emitHud();}
  }
  respawn(message='暖灯把你接住了。'){
    if(this.state!=='playing')return false;
    if(this.featherCharges>0){this.featherCharges--;message='轻羽接住了阿拾。这次没有增加跌落次数，护符已经化成星光。';}else this.deaths++;
    this.burst(this.body.x,this.body.y-30,24,this.level.theme.accent,170);this.body={...this.body,x:this.checkpoint.x,y:this.checkpoint.y,vx:0,vy:0,grounded:true,platform:null,invulnerable:2.1,land:.1};this.soul={x:this.body.x,y:this.body.y-80,vx:0,vy:0};this.form='body';this.resetCapPresentation(true);this.capActivity?.recover(this.capActivityContext());this.lostCase?.recover(this.lostCaseContext());this.energy=this.maxEnergy;this.input={x:0,y:0};this.shake=this.options.reducedMotion?0:1.1;this.sound('fall');this.updatePlates();this.event(message,'respawn',true);this.emitHud(true);return true;
  }
  exitReady(){return this.lanterns.every(l=>l.lit)&&(this.mode!=='festival'||this.memories.every(m=>m.collected));}
  canExit(){return this.state==='playing'&&this.form==='body'&&this.exitReady()&&Math.abs(this.body.x-this.level.exit.x)<52&&Math.abs(this.body.y-this.level.exit.y)<90;}
  finish(){
    if(this.completed||this.state!=='playing'||!this.canExit())return false;
    this.completed=true;this.state='complete';this.input={x:0,y:0};this.resetCapPresentation(true);this.capActivity?.recover(this.capActivityContext());this.lostCase?.recover(this.lostCaseContext());
    const result={chapterIndex:this.chapterIndex,time:Math.round(this.time*10)/10,memories:this.memories.filter(m=>m.collected).length,deaths:this.deaths,mode:this.mode,festivalId:this.festivalId};result.gifts=result.memories;result.stars=getDreamStars(result,this.level.parTime);this.sound('complete');this.emitHud(true);this.callbacks.onComplete?.(result);return true;
  }
  getNearHint(){
    if(!this.level)return '';
    if(this.pendingSeal!==null)return '诗灯在等你的答案。';
    if(this.pendingTalk!==null)return this.mode==='festival'?'节日朋友正在和你说话。':this.getNPCName(this.level.npcs?.find(npc=>npc.id===this.pendingTalk))+'正在和你说话。';
    const actor=this.form==='soul'?this.soul:{x:this.body.x,y:this.body.y-35};
    if(this.form==='soul'){
      const nearby=this.lanterns.find(l=>!l.lit&&dist(l,actor)<125);if(nearby)return '空格 / Q：与诗灯共鸣';
      if(this.hazards.some(h=>h.frozen===0&&Math.hypot(h.px-actor.x,h.py-actor.y)<240))return '空格：共鸣让影子与钟摆暂停';
      if(this.energy<25&&!this.hasLostReadingLight())return '灵光快用完了 · E 回到身体恢复';
      const activityHint=this.capActivity?.getHint(this.capActivityContext());if(activityHint)return activityHint;
      const lostHint=this.lostCase?.getHint(this.lostCaseContext());if(lostHint)return lostHint;
      return 'WASD / 方向键飞行 · E 回到身体';
    }
    const npc=this.getNearbyNPC();
    if(npc)return 'Q：与'+this.getNPCName(npc)+'聊一聊';
    const activityHint=this.capActivity?.getHint(this.capActivityContext());if(activityHint&&this.capActivity.bodyInRange(this.body))return activityHint;
    const lostHint=this.lostCase?.getHint(this.lostCaseContext());if(lostHint&&this.lostCase.bodyInRange(this.body))return lostHint;
    const plate=this.level.plates.find(p=>Math.abs(this.body.x-p.x-p.w/2)<125&&!this.lanterns[0].lit);
    if(plate)return this.plateState.get(plate.id)?'踏板压住了 · E 掀开头盖骨':'把身体留在发光铜踏板上';
    if(this.pads.some(p=>Math.abs(this.body.x-p.x-p.w/2)<140))return '踩上蘑菇，保持方向，借力跳上高台';
    if(activityHint)return activityHint;
    if(lostHint)return lostHint;
    if(Math.abs(this.body.x-this.level.exit.x)<160)return this.exitReady()?'带着身体走进门，送出这一封信':this.mode==='festival'&&this.lanterns.every(l=>l.lit)?'还差 '+this.memories.filter(m=>!m.collected).length+' 份节日礼物':'还需要点亮两盏诗灯';
    return '';
  }
  getSnapshot(){
    const memories=this.memories?.filter(m=>m.collected).length||0,seals=this.lanterns?.filter(l=>l.lit).length||0;
    const npc=this.getNearbyNPC();
    const target=npc?{kind:'npc',id:this.festival?.npc?.id||npc.id,name:this.getNPCName(npc),action:'talk'}:null;
    return {chapterIndex:this.chapterIndex||0,mode:this.mode||'story',festivalId:this.festivalId||null,time:this.time||0,memories,gifts:memories,totalMemories:3,seals,totalSeals:2,energy:this.energy||0,maxEnergy:DREAM_PHYSICS.maxEnergy,form:this.form,deaths:this.deaths||0,objective:this.mode==='festival'?(seals===2&&memories===3?'礼物齐了，回到身体寄出节日包裹':`谜灯 ${seals} / 2 · 礼物 ${memories} / 3`):(seals===2?'回到身体，走向发光的出口':`点亮诗灯 ${seals} / 2 · 找回记忆 ${memories} / 3`),nearHint:this.getNearHint(),target,state:this.state,buffs:{compass:Math.ceil(this.compassTime||0),feather:this.featherCharges||0},cap:{phase:this.cap?.phase||'closed',progress:this.cap?.progress??1,opens:this.cap?.opens||0},capActivity:this.capActivity?.getSnapshot()||null,lostCase:this.lostCase?.getSnapshot()||null};
  }
  emitHud(){this.callbacks.onHud?.(this.getSnapshot());}
  event(text,type='hint',force=false){if(!force&&this.eventCooldown>0)return;this.eventCooldown=3.3;this.callbacks.onEvent?.({type,text});}
  particle(x,y,vx,vy,color,life=1,size=3){if(this.options.reducedMotion&&this.particles.length>35)return;this.particles.push({x,y,vx,vy,color,life,maxLife:life,size});if(this.particles.length>180)this.particles.splice(0,this.particles.length-180);}
  burst(x,y,count,color,speed=100){if(this.options.reducedMotion)count=Math.min(count,5);for(let i=0;i<count;i++){const a=this.rng()*TAU,v=speed*(.2+this.rng()*.8);this.particle(x,y,Math.cos(a)*v,Math.sin(a)*v-20,color,.5+this.rng()*.8,1.5+this.rng()*3);}}
  sound(kind){
    if(!this.options?.sound||typeof window==='undefined')return;
    try{
      const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
      if(!this.audio)this.audio=new Audio();if(this.audio.state==='suspended')this.audio.resume().catch(()=>{});
      const note={jump:220,bounce:350,soul:520,return:380,pulse:640,memory:880,light:740,fall:130,complete:990}[kind]||440;
      const osc=this.audio.createOscillator(),gain=this.audio.createGain(),time=this.audio.currentTime;osc.type=kind==='fall'?'triangle':'sine';osc.frequency.setValueAtTime(note,time);osc.frequency.exponentialRampToValueAtTime(note*(kind==='fall'?.55:1.35),time+.18);gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(.045,time+.025);gain.gain.exponentialRampToValueAtTime(.0001,time+.35);osc.connect(gain);gain.connect(this.audio.destination);osc.start(time);osc.stop(time+.36);
    }catch{ /* Sound is a decoration. A denied audio context never blocks a puzzle. */ }
  }

  render(){
    if(this.destroyed||!this.level||!this.ctx)return;
    this.updateViewport();
    const c=this.ctx,w=this.viewWidth,h=640,t=this.options.reducedMotion?0:this.visualTime,theme=this.level.theme;
    const character=this.getCharacterPresentation(t),presentedSoul=this.getSoulPresentation(character);
    const canvasTop=-this.viewportOffsetY/this.scale,canvasHeight=this.cssHeight/this.scale;
    c.setTransform(this.dpr*this.scale,0,0,this.dpr*this.scale,0,this.dpr*this.viewportOffsetY);c.clearRect(0,canvasTop,w,canvasHeight);c.lineCap='round';c.lineJoin='round';
    this.drawBackground(c,w,h,t);
    c.save();const shake=this.options.reducedMotion?0:this.shake*Math.sin(t*65)*3;c.translate(-this.camera+shake,0);
    if(this.mode==='festival')drawFestivalArchitecture(this,c,t);else this.drawArchitecture(c,t);
    this.drawWinds(c,t);
    // Extend only the drawn ground into the extra portrait framing; collisions stay authored.
    if(this.viewportOffsetY>0){const bottom=canvasTop+canvasHeight;c.fillStyle=theme.ground;for(const p of this.level.platforms)if(p.kind==='ground'&&p.y+p.h<bottom)c.fillRect(p.x,p.y+p.h-2,p.w,bottom-p.y-p.h+2);}
    for(const p of this.level.platforms)this.drawPlatform(c,p,t);
    for(const p of this.movers)this.drawPlatform(c,p,t);
    for(const p of this.pads)this.drawMushroom(c,p,t);
    for(const p of this.level.plates)this.drawPlate(c,p,t);
    for(const cp of this.level.checkpoints)this.drawCheckpoint(c,cp,t);
    for(const gate of this.level.barriers)this.drawVeil(c,gate,t);
    drawFestivalProps(this,c,t);
    drawCapActivity(c,this.capActivity?.getView(),t,this.options.reducedMotion);
    drawLostCase(c,this.lostCase?.getView(),t,this.options.reducedMotion);
    this.drawExit(c,t);
    for(const memory of this.memories)if(!memory.collected){if(this.mode==='festival')drawFestivalGift(this,c,memory,t);else this.drawMemory(c,memory,t);}
    for(let i=0;i<this.lanterns.length;i++)this.drawLantern(c,this.lanterns[i],i,t);
    for(const hazard of this.hazards)this.drawHazard(c,hazard,t);
    drawSoulVision(this,c,t);
    this.drawSigns(c);
    for(const npc of this.level.npcs||[]){if(this.mode==='festival')drawFestivalNPC(this,c,npc,t);else drawStoryNPC(c,this.getStoryNPCView(npc),t,this.options.reducedMotion);}
    this.drawCompanion(c,this.companion.x,this.companion.y,t);
    if(this.form==='soul')this.drawTether(c,t,presentedSoul,character);
    drawCapTheatre(this,c,t);
    this.drawCharacter(c,this.body,t,presentedSoul,character);
    if(presentedSoul?.layer==='world')this.drawSoul(c,presentedSoul,t);
    for(const p of this.particles){c.globalAlpha=Math.max(0,p.life/p.maxLife)*.75;ellipse(c,p.x,p.y,p.size,p.size*.75,p.color);}
    c.globalAlpha=1;
    for(const p of this.pulses){c.globalAlpha=Math.max(0,1-p.age/.8)*.5;c.strokeStyle=theme.spirit;c.lineWidth=2;c.beginPath();c.ellipse(p.x,p.y,p.r,p.r*.85,0,0,TAU);c.stroke();}
    c.globalAlpha=1;c.restore();
    this.drawForeground(c,w,h,t);
    drawFestivalWeather(this,c,w,h,t);
    drawCompass(this,c,w,t);
  }
  getSceneBackdropView(){
    const clearZones=[],circle=(x,y,r)=>{if(Number.isFinite(x)&&Number.isFinite(y)&&Number.isFinite(r)&&r>0)clearZones.push({x,y,r});};
    for(const lamp of this.lanterns)circle(lamp.x,lamp.y,78);
    for(const memory of this.memories)if(!memory.collected)circle(memory.x,memory.y,54);
    for(const plate of this.level.plates)circle(plate.x+plate.w/2,plate.y-13,plate.w/2+22);
    for(const pad of this.pads)circle(pad.x+pad.w/2,pad.y-38,pad.w/2+24);
    for(const platform of this.movers)circle(platform.x+platform.w/2,platform.y-8,Math.min(110,platform.w/2+20));
    for(const hazard of this.hazards)circle(hazard.px,hazard.py,hazard.r+28);
    for(const checkpoint of this.level.checkpoints)circle(checkpoint.x,checkpoint.y-40,50);
    for(const npc of this.level.npcs||[])circle(npc.x,npc.y-(this.mode==='story'?63:78),this.mode==='story'?86:94);
    circle(this.level.exit.x,this.level.exit.y-102,112);
    circle(this.body.x,this.body.y-36,56);
    if(this.form==='soul')circle(this.soul.x,this.soul.y,48);
    const activity=this.capActivity?.getView();
    if(activity){
      circle(activity.anchor.x,activity.anchor.y-28,70);
      if(activity.active){
        for(const bell of activity.switches)circle(bell.x,bell.y,50);
        for(const destination of activity.destinations)circle(destination.x,destination.y+12,58);
      }
    }
    const lost=this.lostCase?.getView();
    if(lost?.visible){
      circle(lost.box.x,lost.box.y-21,53);
      if(lost.expanded){
        circle(lost.object.x,lost.object.y,58);
        for(const claimant of lost.claimants)circle(claimant.x,claimant.y+8,claimant.diagram?.type==='rhythm-signature'?80:65);
        if(lost.encore){
          const {left,right,top,bottom}=lost.encore.bounds;
          circle((left+right)/2,(top+bottom)/2,Math.hypot((right-left)/2,(bottom-top)/2)+3);
        }
      }
    }
    const top=-this.viewportOffsetY/this.scale;
    return {sceneId:FESTIVAL_BACKDROP_SCENES[this.festivalId]||STORY_BACKDROP_SCENES[this.chapterIndex]||'station',cameraX:this.camera,viewport:{width:this.viewWidth,top,bottom:top+this.cssHeight/this.scale},worldWidth:this.level.width,palette:this.level.theme,seasonId:this.festivalId||this.season?.id||null,litSeals:this.lanterns.filter(lamp=>lamp.lit).length,clearZones};
  }
  drawBackground(c,w,h,t){
    const top=-this.viewportOffsetY/this.scale,fullHeight=this.cssHeight/this.scale,th=this.level.theme,gradient=c.createLinearGradient(0,top,0,top+fullHeight);gradient.addColorStop(0,th.sky[0]);gradient.addColorStop(1,th.sky[1]);c.fillStyle=gradient;c.fillRect(0,top,w,fullHeight);
    const mx=w*.73-this.camera*.075,my=133;
    const halo=c.createRadialGradient(mx,my,8,mx,my,220);halo.addColorStop(0,th.light+'20');halo.addColorStop(1,th.light+'00');c.fillStyle=halo;c.fillRect(mx-220,my-220,440,440);
    ellipse(c,mx,my,43,43,th.light+'be');ellipse(c,mx+16,my-10,39,39,th.sky[0]);
    for(let i=0;i<3;i++){const scroll=this.camera*(.1+i*.07),base=405+i*49;c.beginPath();c.moveTo(-10,h);for(let x=-30;x<w+50;x+=35){const y=base+Math.sin((x+scroll)/(105+i*47)+i)*21+Math.sin((x+scroll)/221)*27;c.lineTo(x,y);}c.lineTo(w+20,h);c.closePath();c.fillStyle=[th.mist+'0b',th.mist+'0d',th.mist+'12'][i];c.fill();}
    drawSceneBackdrop(c,this.getSceneBackdropView(),t,this.options.reducedMotion);
    for(const s of this.decorations){const x=((s.x-this.camera*.38)%(w+90)+w+90)%(w+90)-45;const y=s.y+Math.sin(t*s.speed+s.phase)*5;c.globalAlpha=.13+(Math.sin(t*.8+s.phase)+1)*.16;star(c,x,y,s.r,th.light);}
    c.globalAlpha=1;
  }
  drawArchitecture(c,t){
    const th=this.level.theme,motif=th.motif;c.save();
    if(motif==='station'){
      c.globalAlpha=.42;box(c,640,282,400,235,12,'#18292f',th.mist+'55');box(c,604,274,473,22,9,'#1a2e34',th.mist+'70');
      for(let i=0;i<6;i++){box(c,665+i*61,315,43,94,21,'#e9bf780c',th.mist+'40');line(c,[[686+i*61,319],[686+i*61,408]],th.mist+'30',2);}
      ellipse(c,842,244,39,39,'#233940');ellipse(c,842,244,32,32,'#e9bf7830');c.strokeStyle=th.light+'80';c.lineWidth=2;c.beginPath();c.arc(842,244,32,0,TAU);c.stroke();line(c,[[842,222],[842,244],[858,253]],th.light,2);
      box(c,747,431,191,35,5,'#101f26',th.mist+'55');c.fillStyle=th.light;c.font=`12px ${FONT}`;c.textAlign='center';c.fillText('未寄出的心事 · 候车处',842,453);c.globalAlpha=1;
      for(const x of [445,1150,1750])this.drawStreetLamp(c,x,560,t);
    }else if(motif==='garden'){
      c.globalAlpha=.45;c.beginPath();c.moveTo(390,550);c.lineTo(390,280);c.bezierCurveTo(460,27,1110,27,1180,280);c.lineTo(1180,550);c.closePath();c.fillStyle='#8ebd9911';c.fill();c.strokeStyle='#9bc2a14d';c.lineWidth=7;c.stroke();
      for(let i=1;i<8;i++){const x=390+i*99;line(c,[[x,196-Math.sin(i/8*Math.PI)*60],[x,548]],'#a2c5aa44',3);}line(c,[[400,340],[1170,340]],'#a2c5aa33',3);line(c,[[400,445],[1170,445]],'#a2c5aa33',3);c.globalAlpha=1;
      for(let i=0;i<12;i++){const x=460+i*137;this.drawPlant(c,x,560,60+i%3*25,th.edge,.65);}
    }else if(motif==='theatre'){
      c.globalAlpha=.42;box(c,400,120,1520,410,80,'#271d32',th.accent+'35');for(const x of [420,1810]){c.fillStyle='#684054';c.beginPath();c.moveTo(x,130);c.lineTo(x+100,130);c.quadraticCurveTo(x+35,280,x+108,505);c.lineTo(x-24,505);c.quadraticCurveTo(x+45,280,x,130);c.fill();for(let i=0;i<4;i++)line(c,[[x+i*25,145],[x+24+i*14,310],[x+7+i*24,480]],'#bd8ca817',3);}
      c.beginPath();c.moveTo(440,140);c.quadraticCurveTo(740,290,1060,150);c.quadraticCurveTo(1430,290,1840,140);c.lineTo(1840,110);c.lineTo(440,110);c.closePath();c.fillStyle='#71485b';c.fill();
      for(let i=0;i<12;i++)star(c,520+i*105,170+Math.sin(i*.55)*60,7,th.light+'70');c.globalAlpha=1;
    }else if(motif==='library'){
      c.save();c.translate(1120,270);c.rotate(-.08);c.globalAlpha=.22;c.strokeStyle='#cee2d2';c.lineWidth=13;c.beginPath();c.moveTo(-330,5);c.bezierCurveTo(-165,-69,155,-63,300,5);c.stroke();
      for(let i=0;i<11;i++){const x=-230+i*42;c.beginPath();c.moveTo(x,-31);c.bezierCurveTo(x-40,18,x-34,95,x+4,117-Math.abs(i-5)*11);c.stroke();}
      c.beginPath();c.moveTo(-310,4);c.quadraticCurveTo(-415,-87,-433,-30);c.quadraticCurveTo(-390,23,-433,74);c.quadraticCurveTo(-355,92,-310,4);c.stroke();ellipse(c,302,10,80,44,'#cee2d2');ellipse(c,335,0,7,7,th.sky[0]);c.restore();
      for(let i=0;i<9;i++){const x=300+i*215;box(c,x,356,100,174,4,'#10233155',th.mist+'23');for(let j=0;j<4;j++){line(c,[[x+8,390+j*34],[x+92,390+j*34]],th.mist+'33',3);for(let k=0;k<6;k++){c.fillStyle=[th.accent+'22',th.light+'22',th.spirit+'22'][(j+k)%3];c.fillRect(x+12+k*13,364+j*34,9,25);}}}
    }else if(motif==='coast'){
      c.globalAlpha=.45;c.beginPath();c.moveTo(1660,510);c.lineTo(1698,205);c.lineTo(1745,205);c.lineTo(1782,510);c.closePath();c.fillStyle='#b9b7b361';c.fill();
      for(let i=0;i<5;i++){box(c,1692-i*4,232+i*52,62+i*8,21,2,'#273542');}box(c,1680,178,85,39,4,'#e9cf9477','#f3dba877');c.beginPath();c.moveTo(1666,179);c.lineTo(1721,146);c.lineTo(1777,179);c.fillStyle='#202d39';c.fill();
      const beam=c.createLinearGradient(1720,192,1250,240);beam.addColorStop(0,'#ffe2a344');beam.addColorStop(1,'#ffe2a300');c.beginPath();c.moveTo(1720,194);c.lineTo(1100,112+Math.sin(t*.25)*40);c.lineTo(1100,370+Math.sin(t*.25)*40);c.closePath();c.fillStyle=beam;c.fill();c.globalAlpha=1;
    }else{
      c.globalAlpha=.62;box(c,2230,255,370,290,14,'#47303e',th.light+'34');c.beginPath();c.moveTo(2190,265);c.lineTo(2410,118);c.lineTo(2640,265);c.closePath();c.fillStyle='#4a3444';c.fill();line(c,[[2190,265],[2410,118],[2640,265]],th.light+'80',5);
      for(const x of [2270,2375,2480]){box(c,x,296,69,113,34,th.light+'22',th.light+'55');line(c,[[x+34,300],[x+34,406]],th.light+'50',3);}
      box(c,2320,209,192,46,8,'#342637',th.light+'44');c.fillStyle=th.light;c.font=`bold 20px ${FONT}`;c.textAlign='center';c.fillText('黎 明 邮 局',2416,239);c.globalAlpha=1;
      for(let i=0;i<9;i++){const x=245+i*235,y=125+Math.sin(i*.7)*35;line(c,[[x,y-55],[x,y]],th.light+'33',1);ellipse(c,x,y,12,18,th.light+'40');}
    }
    c.restore();
  }
  drawStreetLamp(c,x,y,t){
    const th=this.level.theme;line(c,[[x,y],[x,y-204]],'#23353d',7);c.beginPath();c.moveTo(x,y-204);c.bezierCurveTo(x,y-242,x+44,y-242,x+44,y-210);c.strokeStyle='#52716c';c.lineWidth=5;c.stroke();
    const glow=c.createRadialGradient(x+44,y-187,3,x+44,y-187,74);glow.addColorStop(0,th.light+'25');glow.addColorStop(1,th.light+'00');c.fillStyle=glow;c.fillRect(x-31,y-262,150,150);box(c,x+32,y-211,24,39,5,th.light+'36',th.light+'75');
  }
  drawPlant(c,x,y,height,color,alpha=1){
    c.save();c.globalAlpha=alpha;line(c,[[x,y],[x+4,y-height]],color,2);for(let i=1;i<5;i++){const yy=y-i*height/5,side=i%2?1:-1;ellipse(c,x+side*8,yy,12,4,color,side*-.5);}c.restore();
  }
  drawWinds(c,t){
    const color=this.level.theme.spirit;
    for(const wind of this.level.winds){
      if(wind.x+wind.w<this.camera||wind.x>this.camera+this.viewWidth)continue;
      c.save();c.globalAlpha=.2;
      for(let i=0;i<11;i++){
        const phase=(t*.18+i*.137)%1;
        const x=wind.x+((i*91+phase*wind.dx*2)%wind.w+wind.w)%wind.w;
        const y=wind.y+((i*71+phase*wind.dy*2)%wind.h+wind.h)%wind.h;
        c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+wind.dx*.13+12,y+wind.dy*.1,x+wind.dx*.28,y+wind.dy*.28);c.strokeStyle=color;c.lineWidth=i%3?1:2;c.stroke();
        if(i%3===0)star(c,x,y,2.2,color);
      }
      c.restore();
    }
  }
  drawPlatform(c,p,t){
    if(p.x+p.w<this.camera-100||p.x>this.camera+this.viewWidth+100)return;
    if(drawFestivalPlatform(this,c,p,t))return;
    const th=this.level.theme;
    if(p.kind==='book'){
      c.save();const tilt=this.options.reducedMotion?0:Math.sin(t*.8+p.x)*.012;c.translate(p.x+p.w/2,p.y);c.rotate(tilt);box(c,-p.w/2,-2,p.w,p.h+9,5,'#776487','#c2aecf66');box(c,-p.w/2+7,3,p.w-14,p.h-2,2,'#e8dcc4');for(let j=0;j<3;j++)line(c,[[-p.w/2+11,7+j*4],[p.w/2-11,7+j*4]],'#9e939366',1);box(c,-p.w/2-1,-4,p.w+2,6,2,th.accent);c.restore();return;
    }
    if(p.kind==='stage'){
      line(c,[[p.x+26,330],[p.x+26,p.y]],th.accent+'72',2);line(c,[[p.x+p.w-26,330],[p.x+p.w-26,p.y]],th.accent+'72',2);line(c,[[650,330],[1420,330]],th.mist+'30',4);box(c,p.x,p.y,p.w,p.h+8,6,'#694552',th.accent+'70');box(c,p.x-5,p.y-5,p.w+10,9,3,'#bd91a1');for(let i=0;i<5;i++){c.fillStyle=th.light+'60';c.fillRect(p.x+18+i*34,p.y+10,16,3);}return;
    }
    box(c,p.x,p.y,p.w,p.h,Math.min(8,p.h/2),th.ground);
    c.fillStyle=th.edge+'c0';c.fillRect(p.x+2,p.y,p.w-4,4);c.fillStyle=th.light+'15';c.fillRect(p.x+4,p.y+5,p.w-8,2);
    if(p.kind==='root'){
      c.strokeStyle='#172b2777';c.lineWidth=8;for(let i=0;i<4;i++){c.beginPath();c.moveTo(p.x+14+i*30,p.y+8);c.bezierCurveTo(p.x+50+i*17,p.y+60,p.x-10+i*33,p.y+118,p.x+18+i*30,p.y+p.h);c.stroke();}this.drawPlant(c,p.x+18,p.y,40,th.edge,.8);this.drawPlant(c,p.x+p.w-15,p.y,55,th.edge,.6);
    }else{
      const start=Math.max(p.x,Math.floor(this.camera/70)*70);for(let x=start;x<p.x+p.w&&x<this.camera+this.viewWidth+90;x+=71){line(c,[[x+21,p.y+11],[x+28,p.y+30],[x+20,p.y+42]],'#111d2366',1.5);if(p.h>30)line(c,[[x,p.y+45],[x+67,p.y+45]],th.mist+'0a',1);}
    }
    for(let x=Math.max(p.x+10,Math.floor(this.camera/46)*46);x<p.x+p.w-8&&x<this.camera+this.viewWidth+30;x+=47){const n=Math.sin(x*2.91);line(c,[[x,p.y],[x-3,p.y-5-n*2],[x+1,p.y-2],[x+5,p.y-8+n*3]],th.edge+'66',1.3);}
  }
  drawMushroom(c,p,t){
    const squash=p.boing>0?Math.sin(p.boing*14)*.13:Math.sin(t*1.1)*.015,mid=p.x+p.w/2;
    c.save();c.translate(mid,p.y);c.scale(1+squash,1-squash);ellipse(c,0,0,p.w*.57,8,'#101c2644');box(c,-13,-43,26,43,9,'#c9bca0');line(c,[[-5,-5],[-4,-31]],'#79686c66',2);c.beginPath();c.moveTo(-p.w*.53,-25);c.bezierCurveTo(-p.w*.45,-85,p.w*.45,-85,p.w*.53,-25);c.quadraticCurveTo(0,-12,-p.w*.53,-25);c.fillStyle='#c38f9e';c.fill();c.strokeStyle='#edc8be';c.lineWidth=3;c.stroke();for(const [x,y,r] of [[-27,-39,8],[0,-53,7],[24,-39,10]])ellipse(c,x,y,r,r*.55,'#ffdfbd');line(c,[[-40,-25],[40,-25]],'#694c7055',2);c.restore();
    star(c,mid,p.y-101+Math.sin(t*2)*4,6,this.level.theme.light+'a8');
  }
  drawPlate(c,p,t){
    const on=this.plateState.get(p.id),th=this.level.theme;const glow=c.createRadialGradient(p.x+p.w/2,p.y,2,p.x+p.w/2,p.y,93);glow.addColorStop(0,(on?th.spirit:th.light)+'2d');glow.addColorStop(1,th.light+'00');c.fillStyle=glow;c.fillRect(p.x-40,p.y-80,p.w+80,90);
    box(c,p.x,p.y-7,p.w,12,5,on?'#8dccb0':'#ac865e','#e1bd83');for(const x of [p.x+9,p.x+p.w-9])ellipse(c,x,p.y-1,2,2,'#443a35');line(c,[[p.x+35,p.y-3],[p.x+p.w/2,p.y-8],[p.x+p.w-35,p.y-3]],on?'#edffe6':'#e1c99f',2);
    c.textAlign='center';c.font=`11px ${FONT}`;c.fillStyle=on?th.spirit:th.light+'aa';c.fillText(on?'身体留住了门':'身体踏板',p.x+p.w/2,p.y+31);
  }
  drawCheckpoint(c,p,t){
    const active=p.x===this.checkpoint.x,th=this.level.theme;c.save();c.globalAlpha=active?1:.52;box(c,p.x-6,p.y-40,12,40,5,'#6a726b');box(c,p.x-15,p.y-58,30,27,6,active?th.light+'77':th.light+'22',th.light+'75');line(c,[[p.x-18,p.y-58],[p.x,p.y-72],[p.x+18,p.y-58]],'#899a8e',4);ellipse(c,p.x,p.y-44,4,7,th.light);if(active){const glow=c.createRadialGradient(p.x,p.y-46,2,p.x,p.y-46,65);glow.addColorStop(0,th.light+'22');glow.addColorStop(1,th.light+'00');c.fillStyle=glow;c.fillRect(p.x-65,p.y-110,130,130);}c.restore();
  }
  drawVeil(c,g,t){
    const open=this.barrierOpen(g),th=this.level.theme;c.save();c.globalAlpha=open?.12:.78;const grad=c.createLinearGradient(g.x,0,g.x+g.w,0);grad.addColorStop(0,th.accent+'00');grad.addColorStop(.5,th.accent+'55');grad.addColorStop(1,th.accent+'00');c.fillStyle=grad;c.fillRect(g.x-12,g.y,g.w+24,g.h);for(let i=0;i<4;i++){c.beginPath();for(let y=Math.max(35,g.y);y<g.y+g.h;y+=13){const x=g.x+i*g.w/3+Math.sin(y*.025+t*1.5+i)*4;y===Math.max(35,g.y)?c.moveTo(x,y):c.lineTo(x,y);}c.strokeStyle=th.accent+'90';c.lineWidth=1;c.stroke();}for(let y=Math.max(65,g.y+15);y<g.y+g.h;y+=65){star(c,g.x+g.w/2,y+Math.sin(t+y)*3,4,th.accent);}c.restore();
    if(!open){box(c,g.x-12,g.y+g.h-18,g.w+24,18,5,'#57445f',th.accent+'66');}
  }
  drawMemory(c,m,t){
    const th=this.level.theme,y=m.y+(this.options.reducedMotion?0:Math.sin(t*2+m.x)*6);const halo=c.createRadialGradient(m.x,y,2,m.x,y,42);halo.addColorStop(0,th.accent+'30');halo.addColorStop(1,th.accent+'00');c.fillStyle=halo;c.fillRect(m.x-44,y-44,88,88);c.save();c.translate(m.x,y);c.rotate(Math.sin(t+m.x)*.08);box(c,-15,-11,30,23,3,'#e8d1c3','#f4e3d1');line(c,[[-13,-8],[0,2],[13,-8]],'#9a7787',1.5);star(c,0,3,5,'#b58ba6');c.restore();star(c,m.x+25,y-19,3,th.light);star(c,m.x-24,y+9,2,th.accent);
  }
  drawLantern(c,l,index,t){
    const th=this.level.theme,y=l.y+(this.options.reducedMotion?0:Math.sin(t*1.2+index)*4),color=l.lit?th.light:th.spirit;
    const halo=c.createRadialGradient(l.x,y,5,l.x,y,l.lit?125:73);halo.addColorStop(0,color+(l.lit?'42':'1c'));halo.addColorStop(1,color+'00');c.fillStyle=halo;c.fillRect(l.x-135,y-135,270,270);
    line(c,[[l.x,y-33],[l.x,y-92]],th.mist+'65',1.5);ellipse(c,l.x,y-37,6,4,'#8d9a8b');
    c.save();c.translate(l.x,y);c.rotate(Math.sin(t*.9+index)*.035);c.beginPath();c.moveTo(-17,-27);c.quadraticCurveTo(-29,-4,-19,23);c.quadraticCurveTo(0,34,19,23);c.quadraticCurveTo(29,-4,17,-27);c.closePath();c.fillStyle=l.lit?'#f4d49cd6':'#29434cd9';c.fill();c.strokeStyle=l.lit?'#ffe6b5':'#a2d8cd';c.lineWidth=2;c.stroke();line(c,[[-18,-24],[18,-24]],'#9f886f',4);line(c,[[-19,24],[19,24]],'#9f886f',4);for(const x of [-9,0,9])line(c,[[x,-22],[x*1.2,22]],l.lit?'#bba47988':'#85ada055',1);line(c,[[0,27],[0,44]],color,2);ellipse(c,0,46,4,5,color);c.fillStyle=l.lit?'#684f42':'#c7e2d3';c.font=`bold 18px ${FONT}`;c.textAlign='center';c.fillText(l.lit?'光':'谜',0,7);c.restore();
    c.textAlign='center';c.font=`10px ${FONT}`;c.fillStyle=l.lit?th.light:th.spirit+'ad';c.fillText(l.lit?'已点亮':`诗灯 · ${index+1}`,l.x,y+69);
    if(!l.lit&&this.form==='soul'&&dist(l,this.soul)<125){c.fillStyle=th.light;c.font=`11px ${FONT}`;c.fillText('空格 / Q 共鸣',l.x,y-110);}
  }
  drawHazard(c,h,t){
    const th=this.level.theme,color=h.frozen>0?'#9ce4e8':'#d8a39b';
    if(h.kind==='pendulum'){
      ellipse(c,h.x,h.y,11,11,'#89948f');ellipse(c,h.x,h.y,5,5,'#273b42');line(c,[[h.x,h.y],[h.px,h.py]],'#889c99',4);line(c,[[h.x+2,h.y],[h.px+2,h.py]],'#d3d0b355',1);
      c.save();c.translate(h.px,h.py);c.rotate(-(h.angle||0));const halo=c.createRadialGradient(0,0,5,0,0,h.r+24);halo.addColorStop(0,color+'30');halo.addColorStop(1,color+'00');c.fillStyle=halo;c.fillRect(-h.r-25,-h.r-25,h.r*2+50,h.r*2+50);ellipse(c,0,0,h.r,h.r,'#34424b');c.strokeStyle=color;c.lineWidth=3;c.beginPath();c.arc(0,0,h.r-2,0,TAU);c.stroke();ellipse(c,0,0,h.r-9,h.r-9,'#596067');for(let i=0;i<8;i++){const a=i*TAU/8;line(c,[[Math.cos(a)*(h.r-10),Math.sin(a)*(h.r-10)],[Math.cos(a)*(h.r-15),Math.sin(a)*(h.r-15)]],color,2);}line(c,[[0,-15],[0,0],[10,7]],'#eee1c3',2);ellipse(c,0,0,3,3,color);c.restore();
    }else{
      const yy=h.py;c.save();c.translate(h.px,yy);c.fillStyle=h.frozen>0?'#6a9baca8':'#6d6c918c';c.beginPath();c.moveTo(-h.r,10);c.bezierCurveTo(-h.r-8,-h.r-13,h.r+8,-h.r-13,h.r,10);c.lineTo(h.r*.5,7);c.lineTo(0,14);c.lineTo(-h.r*.5,7);c.closePath();c.fill();ellipse(c,-7,-5,3,4,'#d0c4d2');ellipse(c,7,-5,3,4,'#d0c4d2');c.restore();
    }
    if(h.frozen>0){for(let i=0;i<4;i++){const a=i*TAU/4+t*.3;star(c,h.px+Math.cos(a)*(h.r+12),h.py+Math.sin(a)*(h.r+12),4,'#b8f5f4');}c.fillStyle='#c4f6f2';c.font=`11px ${FONT}`;c.textAlign='center';c.fillText(`静止 ${h.frozen.toFixed(1)}s`,h.px,h.py+h.r+24);}
  }
  drawExit(c,t){
    const th=this.level.theme,x=this.level.exit.x,y=this.level.exit.y,open=this.exitReady();
    const halo=c.createRadialGradient(x,y-90,5,x,y-90,170);halo.addColorStop(0,th.light+(open?'38':'08'));halo.addColorStop(1,th.light+'00');c.fillStyle=halo;c.fillRect(x-180,y-270,360,360);
    c.beginPath();c.moveTo(x-48,y);c.lineTo(x-48,y-113);c.bezierCurveTo(x-48,y-189,x+48,y-189,x+48,y-113);c.lineTo(x+48,y);c.closePath();c.fillStyle=open?'#ead6a42a':'#142834dd';c.fill();c.strokeStyle=open?'#d4c8a4':'#627b7d';c.lineWidth=9;c.stroke();
    if(open){for(let i=0;i<6;i++){const xx=x-31+i*12;const light=c.createLinearGradient(0,y-155,0,y);light.addColorStop(0,th.light+'08');light.addColorStop(.5,th.light+'7a');light.addColorStop(1,th.light+'12');c.strokeStyle=light;c.lineWidth=5;c.beginPath();c.moveTo(xx,y-129);c.quadraticCurveTo(xx+Math.sin(t+i)*8,y-75,xx,y-8);c.stroke();}for(let i=0;i<7;i++){star(c,x+Math.sin(i*22+t*.2)*30,y-30-(i*25+t*13)%125,3,th.light+'d0');}}
    else{line(c,[[x-35,y-110],[x+35,y-42]],'#80939366',5);line(c,[[x+35,y-110],[x-35,y-42]],'#80939366',5);}
    box(c,x-63,y-7,126,16,4,'#627274',th.light+'33');ellipse(c,x,y-180,14,14,open?th.light:'#5e747a');star(c,x,y-180,7,open?'#665e53':'#aec3bb');
    c.textAlign='center';c.font=`bold 12px ${FONT}`;c.fillStyle=open?th.light:th.mist;c.fillText(open?(this.mode==='festival'?'寄出节日包裹':'把信带向下一站'):(this.mode==='festival'?'两盏谜灯 · 三份礼物':'等待两盏诗灯'),x,y-211);
  }
  drawSigns(c){
    for(const sign of this.level.signs){if(Math.abs(this.body.x-sign.x)>220)continue;c.save();c.globalAlpha=clamp(1-Math.abs(this.body.x-sign.x)/260,0,.7);c.font=`11px ${FONT}`;c.textAlign='center';const width=c.measureText?.(sign.text)?.width||180;box(c,sign.x-width/2-12,585,width+24,27,9,'#101d2b99');c.fillStyle=this.level.theme.light;c.fillText(sign.text,sign.x,603);c.restore();}
  }
  drawCompanion(c,x,y,t){
    const happy=this.emoteTime>0,look=clamp(((this.form==='soul'?this.soul.x:this.body.x)-x)/180,-1.5,1.5),blink=Math.sin(t*1.6+.8)>.985?.18:happy?.6:1;
    c.save();c.translate(x,y);ellipse(c,0,-3,18,4,'#0d1c264d');const bob=this.options.reducedMotion?0:Math.sin(t*(happy?5:2))*(happy?4:2);c.translate(0,bob);
    c.beginPath();c.moveTo(-8,-12);c.bezierCurveTo(-28,-10,-30,-28,-20,-32+Math.sin(t*2.5)*4);c.strokeStyle='#8eaf9e';c.lineWidth=6;c.stroke();
    ellipse(c,0,-24,13,18,'#b5c9b7');ellipse(c,0,-17,7,10,'#d7dfc3');c.beginPath();c.moveTo(-11,-36);c.lineTo(-16,-52);c.lineTo(-3,-43);c.lineTo(3,-43);c.lineTo(15,-52);c.lineTo(11,-34);c.fillStyle='#b5c9b7';c.fill();line(c,[[-12,-45],[-10,-38]],'#e3b7a9',2);line(c,[[11,-45],[10,-38]],'#e3b7a9',2);
    for(const eye of [-5,5]){ellipse(c,eye,-31,3,4*blink,'#293f42');if(blink>.3)ellipse(c,eye+look,-32,1,1.4,'#edf3d9');}ellipse(c,-10,-27,3,1.5,'#d9a99b66');ellipse(c,10,-27,3,1.5,'#d9a99b66');c.fillStyle='#eacb93';c.beginPath();c.moveTo(-3,-25);c.lineTo(3,-25);c.lineTo(0,-21);c.fill();line(c,[[-9,-7],[-5,-3],[1,-6],[7,-3]],'#8c7462',2);if(happy)star(c,20,-46,4,this.level.theme.light);c.restore();
  }
  drawTether(c,t,s,character){
    if(!s||s.alpha<.05)return;const anchor=character.rig.openingWorld,sx=anchor.x,sy=anchor.y;const bend=(sx+s.x)/2;c.save();c.globalAlpha=.25*s.alpha;c.strokeStyle=this.level.theme.spirit;c.lineWidth=1.25;c.setLineDash([3,8]);c.lineDashOffset=-t*18;c.beginPath();c.moveTo(sx,sy);c.quadraticCurveTo(bend,Math.min(sy,s.y)-45,s.x,s.y);c.stroke();c.setLineDash([]);c.globalAlpha=.55*s.alpha;for(let i=0;i<3;i++){const u=(t*.22+i/3)%1;const px=(1-u)*(1-u)*sx+2*(1-u)*u*bend+u*u*s.x,py=(1-u)*(1-u)*sy+2*(1-u)*u*(Math.min(sy,s.y)-45)+u*u*s.y;ellipse(c,px,py,2,2,this.level.theme.spirit);}c.restore();
  }
  drawCharacter(c,b,t,shown=null,character=null){
    const p=character||this.getCharacterPresentation(t),{rig,step,walking}=p,th=this.level.theme,outfit=this.getOutfitId(),dress=getOutfitPalette(outfit),happy=this.emoteTime>0;
    const opacity=b.invulnerable>0&&!this.options.reducedMotion&&Math.floor(t*13)%2===0?.48:1;
    c.save();c.translate(b.x,b.y);ellipse(c,0,2,24-(b.grounded?0:6),5,'#0c18294d');c.restore();
    c.save();c.transform(...rig.bodyMatrix);c.globalAlpha*=opacity;
    drawOutfitBack(c,outfit,t,walking);
    if(this.featherCharges){for(let i=0;i<3;i++){const a=t*.55+i*TAU/3;star(c,Math.cos(a)*30,-39+Math.sin(a)*22,3,'#d6e8ecaa');}}
    // A stitched delivery satchel and springy scarf give the small silhouette a story.
    c.save();c.translate(-17,-28);c.rotate(-.2+step*.04);box(c,-10,-3,17,22,5,'#ba8c67','#dfb887');line(c,[[-7,5],[4,5]],'#765c54',1);star(c,0,8,3.2,'#efc779');c.restore();
    const legs=[{x:-7,phase:step},{x:7,phase:-step}];
    for(const leg of legs){const kneeX=leg.x+leg.phase*4,footX=leg.x+leg.phase*8;line(c,[[leg.x,-21],[kneeX,-11],[footX,-2]],'#d9cfb4',5);ellipse(c,kneeX,-11,3,3,'#f0e5c9');ellipse(c,footX+2,-2,7,3.3,'#b9c9b6');}
    // The shoulders and wrists are solved in the same body space as the lid grip.
    // The coat covers the folded inner arm when the hands are resting.
    for(const arm of [p.arms.left,p.arms.right]){line(c,[[arm.shoulder.x,arm.shoulder.y],[arm.elbow.x,arm.elbow.y],[arm.wrist.x,arm.wrist.y]],'#d9cfb4',4);ellipse(c,arm.elbow.x,arm.elbow.y,2.8,2.8,'#f3e6c5');}
    c.beginPath();c.moveTo(-13,-39);c.quadraticCurveTo(1,-47,14,-38);c.lineTo(17,-17);c.quadraticCurveTo(0,-12,-16,-18);c.closePath();const coat=c.createLinearGradient(-15,-37,18,-14);coat.addColorStop(0,dress.trim);coat.addColorStop(.25,dress.coat);coat.addColorStop(1,dress.coat);c.fillStyle=coat;c.fill();line(c,[[0,-35],[0,-18]],dress.trim+'99',1.3);line(c,[[-11,-34],[-5,-29],[0,-36],[6,-29],[12,-34]],dress.trim+'aa',1);for(let y=-31;y<-18;y+=6)ellipse(c,2,y,1.5,1.5,'#e3d6b3');box(c,-11,-27,7,6,2,dress.coat,dress.trim+'88');star(c,10,-29,2,dress.trim);
    c.beginPath();c.moveTo(-9,-38);c.bezierCurveTo(-27,-41,-34,-52+Math.sin(t*4)*3,-49,-44+Math.sin(t*3)*4);c.lineTo(-44,-34+Math.sin(t*3+.4)*4);c.bezierCurveTo(-31,-36,-18,-32,-9,-34);c.closePath();c.fillStyle=dress.scarf;c.fill();line(c,[[-40,-41],[-39,-35]],'#f5d2a577',1);box(c,-16,-41,32,8,4,dress.scarf);line(c,[[-11,-37],[11,-37]],'#fff0cf33',1);
    c.save();c.transform(...rig.headLocalMatrix);drawCapInterior(c,this.capScene,t,this.capOpen);c.restore();c.restore();
    // World-space spirit, head-space occlusion: no duplicate spirit is drawn later.
    if(shown?.layer==='inside')this.drawSoul(c,shown,t);
    c.save();c.transform(...rig.bodyMatrix);c.globalAlpha*=shown?.layer==='inside'?1:opacity;
    c.save();c.transform(...rig.headLocalMatrix);
    this.drawSkullFront(c,b,t,shown);drawCapFrontRim(c,this.capScene,this.capOpen);this.drawCapLid(c,t,rig,outfit);c.restore();
    this.drawCharacterHands(c,p);
    if(happy){star(c,32,-56,3,th.light+'cc');star(c,-36,-38,2,th.light+'88');}c.restore();
  }
  drawSkullFront(c,b,t,shown){
    const th=this.level.theme,opening=this.cap.phase==='opening',attentive=this.form==='soul'||this.cap.phase==='returning',sleepy=this.energy<20,happy=this.emoteTime>0;
    // Lower skull: cheekbones, inset eye sockets, little teeth and a hairline crack.
    c.beginPath();c.moveTo(-22,-13);c.bezierCurveTo(-26,0,-23,10,-14,14);c.lineTo(-13,22);c.quadraticCurveTo(0,26,13,22);c.lineTo(14,14);c.bezierCurveTo(23,10,26,0,22,-13);c.closePath();const ivory=c.createLinearGradient(-22,-13,23,23);ivory.addColorStop(0,'#fff0cf');ivory.addColorStop(.48,'#e9d8b6');ivory.addColorStop(1,'#c7b996');c.fillStyle=ivory;c.fill();c.strokeStyle='#c7bb9c';c.lineWidth=1.2;c.stroke();
    const blink=Math.sin(t*1.27+.4)>.985?.12:sleepy?.43:opening?1.06:happy?.7:1,look=attentive?clamp(((shown?.x??b.x)-b.x)*b.face/100,-3,3):clamp(b.vx*b.face/180,-1.3,1.3)+.35,lookY=attentive?-2.7:sleepy?1.8:-.7;
    for(const x of [-9,9]){ellipse(c,x,1,6.6,8.2*blink,'#2d303d');if(blink>.2){ellipse(c,x+look,lookY,2.2,2.6,th.light);ellipse(c,x+look+1,lookY-1.5,.9,1,'#fff1ce');}}
    if(attentive||happy){line(c,[[-15,-11],[-10,-13],[-5,-11]],'#bba684',1.2);line(c,[[5,-11],[10,-13],[15,-11]],'#bba684',1.2);}
    ellipse(c,-18,8,3.8,1.7,'#d39b8b44');ellipse(c,18,8,3.8,1.7,'#d39b8b44');c.beginPath();c.moveTo(0,9);c.lineTo(-3,14);c.lineTo(3,14);c.closePath();c.fillStyle='#736566';c.fill();for(const x of [-7,0,7])line(c,[[x,20],[x,24]],'#9b8d7a',1.4);
    if(sleepy)ellipse(c,0,19,3,2.4,'#9f8b7a');else if(happy)line(c,[[-8,18],[-4,20],[4,20],[8,18]],'#a68a75',1);
  }
  drawCapLid(c,t,rig,outfit){
    // The exact same cap matrix transforms its grip, ivory shell and every outfit.
    c.save();c.transform(...rig.capLocalMatrix);c.beginPath();c.moveTo(-22,-13);c.bezierCurveTo(-21,-40,21,-40,22,-13);c.closePath();const capIvory=c.createLinearGradient(0,-36,0,-12);capIvory.addColorStop(0,'#fff3d8');capIvory.addColorStop(1,'#d8c6a0');c.fillStyle=capIvory;c.fill();c.strokeStyle='#b8a788';c.lineWidth=1.2;c.stroke();
    line(c,[[-4,-31],[-1,-25],[-5,-20],[0,-18]],'#a69a84',1.15);line(c,[[-21,-13],[21,-13]],'#a88a5f',3);line(c,[[-18,-14],[18,-14]],'#f0dca7',.9);line(c,[[-16,-26],[-10,-31],[-3,-33]],'#fff8e4bb',2);box(c,19,-17,6,6,2,'#d1ac6d','#e8cf92');
    star(c,10,-25,2.2,'#c1a574');drawOutfitHat(c,outfit,t);c.restore();
    ellipse(c,-22,-13,3.8,3.8,'#bda16f');ellipse(c,-22,-13,2,2,'#f0d69a');line(c,[[-23,-14],[-21,-12]],'#917b5f',.9);box(c,20,-12,5,6,1.5,'#a38b64');ellipse(c,22.5,-9,1.1,1.1,'#f3d998');
  }
  drawCharacterHands(c,pose){
    for(const [side,arm] of Object.entries(pose.arms)){
      const hand=arm.wrist,angle=side==='left'?(pose.rig.theta+pose.tilt)*pose.grip:-.25*pose.clasp;
      c.save();c.translate(hand.x,hand.y);c.rotate(angle);ellipse(c,0,0,3.8,4,'#f2e5c6');line(c,[[-1,-2],[-1,1]],'#b9a88b',.8);line(c,[[1,-2],[1,1]],'#b9a88b',.8);ellipse(c,-3,1,1.8,2,'#e7d8b7');c.restore();
    }
  }
  drawSoul(c,s,t){
    const th=this.level.theme,bob=this.options.reducedMotion||s.layer==='inside'?0:Math.sin(t*3)*2,size=s.scale??1,alpha=s.alpha??1,sleepy=this.energy<25,returning=s.pose==='return';if(alpha<=0)return;
    c.save();c.globalAlpha*=alpha;
    const glow=c.createRadialGradient(s.x,s.y,1,s.x,s.y,58*size);glow.addColorStop(0,th.spirit+'50');glow.addColorStop(1,th.spirit+'00');c.fillStyle=glow;c.fillRect(s.x-60*size,s.y-60*size,120*size,120*size);
    c.save();c.translate(s.x,s.y+bob*size);c.rotate(this.options.reducedMotion?0:clamp(s.vx/340,-1,1)*.14);c.scale(size,size);const tailX=-clamp(s.vx,-400,400)*.055,tailY=(sleepy?23:29)+Math.sin(t*4)*2;
    c.beginPath();c.moveTo(-15,4);c.bezierCurveTo(-24,-8,-17,-22,-6,-23);c.quadraticCurveTo(1,-28,2,-35);c.bezierCurveTo(10,-31,7,-25,12,-22);c.bezierCurveTo(20,-21,23,-14,19,-9);c.bezierCurveTo(25,9,11,21,tailX,tailY);c.quadraticCurveTo(4,15,-15,4);const pearl=c.createLinearGradient(-15,-29,18,26);pearl.addColorStop(0,'#f4fff0');pearl.addColorStop(.5,'#d5f5df');pearl.addColorStop(1,th.spirit+'aa');c.fillStyle=pearl;c.fill();c.strokeStyle=th.spirit;c.lineWidth=1.5;c.stroke();
    c.beginPath();c.moveTo(-8,14);c.quadraticCurveTo(1,19,tailX,tailY);c.strokeStyle='#ffffff66';c.lineWidth=1;c.stroke();line(c,[[-14,-16],[-10,-20],[-4,-22]],'#ffffff99',1.5);
    const blink=Math.sin(t*1.42+1)>.99?.18:sleepy?.42:1,look=clamp(s.vx/250,-1.2,1.2);
    if(returning&&!sleepy){for(const x of [-6,7]){c.beginPath();c.moveTo(x-3,-4);c.quadraticCurveTo(x,-9,x+3,-4);c.strokeStyle='#35545d';c.lineWidth=1.8;c.stroke();}}
    else {ellipse(c,-6,-6,4,5*blink,'#35545d');ellipse(c,7,-6,4,5*blink,'#35545d');if(blink>.3){ellipse(c,-5+look,-7,1.2,1.4,'#fff8df');ellipse(c,8+look,-7,1.2,1.4,'#fff8df');}}
    if(this.emoteTime>0){star(c,-23,-12,3,th.light+'bb');star(c,23,-18,2.5,th.light+'bb');}
    if(sleepy)ellipse(c,1,4,2.3,3,'#6d9c94');else if(s.pose==='peek')ellipse(c,1,3,2,2.6,'#6d9c94');else {c.beginPath();c.moveTo(-3,3);c.quadraticCurveTo(1,8,5,3);c.strokeStyle='#6d9c94';c.lineWidth=1.2;c.stroke();}
    ellipse(c,-12,1,3,1.5,'#f2bcac77');ellipse(c,13,1,3,1.5,'#f2bcac77');star(c,0,-16,3.2,th.light);c.restore();
    if(sleepy&&!returning){c.strokeStyle='#efba9c88';c.lineWidth=2;c.beginPath();c.arc(s.x,s.y,30*size,-Math.PI/2,-Math.PI/2+TAU*this.energy/this.maxEnergy);c.stroke();}c.restore();
  }
  drawForeground(c,w,h,t){
    const th=this.level.theme;
    const vignette=c.createRadialGradient(w*.5,h*.5,h*.18,w*.5,h*.5,Math.max(w,h)*.7);vignette.addColorStop(0,'#07101900');vignette.addColorStop(1,'#0710196c');c.fillStyle=vignette;c.fillRect(0,-this.viewportOffsetY/this.scale,w,this.cssHeight/this.scale);
    for(let i=0;i<5;i++){const x=((i*377-this.camera*.95)%(w+220)+w+220)%(w+220)-100;this.drawPlant(c,x,666,75+i%2*40,'#111d2be6',.75);}
    if(this.form==='soul'){
      const bx=this.body.x-this.camera;if(bx<20||bx>w-20){const edge=bx<20?18:w-18;c.save();c.fillStyle=th.light;c.font=`12px ${FONT}`;c.textAlign=bx<20?'left':'right';c.fillText(bx<20?'← 身体 · E 回去':'身体 · E 回去 →',edge,530);c.restore();}
    }
  }
}

export { DREAM_LEVELS };
