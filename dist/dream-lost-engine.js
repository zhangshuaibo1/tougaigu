import { evaluateLostClaim } from './dream-lost-cases.js';
import { getLostEncore } from './dream-lost-encores.js';

// A small optional evidence game. Its anchors never enter the collision model.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=(n,fallback=0)=>typeof n==='number'&&Number.isFinite(n)?n:fallback;
const indexes=value=>Array.isArray(value)?[...new Set(value.filter(n=>Number.isInteger(n)&&n>=0&&n<2))].sort():[];
const distance=(a,b)=>a&&b?Math.hypot(a.x-b.x,a.y-b.y):Infinity;
const smooth=t=>t*t*(3-2*t);
export const LOST_BOX_ANCHOR=Object.freeze({x:465,y:560,r:30});
export const LOST_INTERACTION_RADIUS=36;
export const LOST_ENCORE_DURATION=3;

export function createLostLayout(sceneId){
  // The library's first memory occupies the shared object position.
  return {box:{...LOST_BOX_ANCHOR},object:{x:sceneId==='story-3'?450:390,y:430,r:LOST_INTERACTION_RADIUS},claimants:[{x:175,y:285,r:LOST_INTERACTION_RADIUS},{x:355,y:265,r:LOST_INTERACTION_RADIUS},{x:460,y:340,r:LOST_INTERACTION_RADIUS}]};
}
export function normalizeLostCaseRecord(value){
  return {activeVariant:value?.activeVariant===1?1:0,seenClues:{0:indexes(value?.seenClues?.[0]),1:indexes(value?.seenClues?.[1])},solvedVariants:indexes(value?.solvedVariants)};
}
export function pointOnLostHandoff(from,to,progress,kind='solve'){
  const raw=clamp(finite(progress),0,1),p=kind==='wrong'?(raw<.45?smooth(raw/.45):1-smooth((raw-.45)/.55)):smooth(raw),u=1-p;
  const control={x:(from.x+to.x)/2,y:Math.min(from.y,to.y)-52};
  return {x:u*u*from.x+2*u*p*control.x+p*p*to.x,y:u*u*from.y+2*u*p*control.y+p*p*to.y,scale:kind==='solve'?1-.2*p:1-.08*p};
}

export class DreamLostCase {
  constructor(config,{record,onEvent,revision='0:base',chapterIndex=0,festivalId=null,mode='story'}={}){
    this.config=config;this.layout=createLostLayout(config.sceneId);this.record=normalizeLostCaseRecord(record);
    this.variant=this.record.activeVariant;this.revision=typeof revision==='string'?revision:'0:base';this.meta={revision:this.revision,chapterIndex,festivalId,mode};this.onEvent=onEvent;
    this.destroyed=false;this.context=null;this.available=false;this.inRange=false;this.phase='locked';this.observed=new Set();
    this.opened=this.record.seenClues[this.variant].length>0||this.record.solvedVariants.includes(this.variant);
    this.roundSolved=this.record.solvedVariants.includes(this.variant);this.solveSent=this.roundSolved;
    this.clueIndex=this.record.seenClues[this.variant][0]??null;this.handoff=null;this.feedback=null;this.notice=null;
    // This is presentation time only. Restored receipts are already complete,
    // and never replay a solve event or invent another stored fact.
    this.encoreElapsed=this.roundSolved?LOST_ENCORE_DURATION:null;
  }
  get variantDefinition(){return this.config.variants[this.variant];}
  get seenClues(){return this.record.seenClues[this.variant];}
  getRecord(){return normalizeLostCaseRecord(this.record);}
  bodyInRange(body){return !!body&&body.grounded!==false&&Math.abs(body.y-this.layout.box.y)<12&&distance(body,this.layout.box)<=this.layout.box.r;}
  nearBox(body=this.context?.body){return !!body&&Math.abs(body.y-this.layout.box.y)<90&&Math.abs(body.x-this.layout.box.x)<90;}
  isExpanded(context=this.context){return !this.destroyed&&this.available&&this.opened&&context?.form==='soul'&&this.bodyInRange(context.body)&&['playing','paused'].includes(context.state);}
  nearestTarget(soul=this.context?.soul){
    const candidates=[{kind:'object',index:null,...this.layout.object},...this.layout.claimants.map((point,index)=>({kind:'claimant',index,...point}))];
    return candidates.map(target=>({...target,distance:distance(soul,target)})).filter(target=>target.distance<=target.r).sort((a,b)=>a.distance-b.distance)[0]||null;
  }
  refresh(context){
    if(this.destroyed)return;
    this.context=context;this.available=!!context?.unlocked;this.inRange=this.bodyInRange(context?.body);
    if(context?.reducedMotion){this.handoff=null;if(this.roundSolved)this.encoreElapsed=LOST_ENCORE_DURATION;}
    if(!this.available)this.phase='locked';
    else if(!this.opened)this.phase='closed';
    else if(!this.isExpanded(context)||context.state!=='playing')this.phase='suspended';
    else if(this.handoff)this.phase=this.handoff.kind==='solve'?'delivering':'returning';
    else this.phase=this.roundSolved?'solved':'active';
    if(this.isExpanded(context)){
      const selected=this.nearestTarget();if(selected?.kind==='claimant')this.observed.add(this.variantDefinition.claimants[selected.index].id);
    }
  }
  emit(type,extra={}){
    if(this.destroyed||typeof this.onEvent!=='function')return;
    this.onEvent({type,caseId:this.config.id,sceneId:this.config.sceneId,variant:this.variant,seenClues:[...this.seenClues],...extra,...this.meta});
  }
  open(context){
    this.refresh(context);
    if(this.destroyed||!this.available||context?.state!=='playing'||context?.form!=='body'||!this.inRange)return false;
    let announce=!this.opened;
    if(this.roundSolved){
      this.variant=[0,1].find(index=>!this.record.solvedVariants.includes(index))??(this.variant+1)%2;
      this.record.activeVariant=this.variant;this.roundSolved=false;this.solveSent=false;this.clueIndex=null;this.observed.clear();this.handoff=null;this.feedback=null;this.notice=null;this.encoreElapsed=null;announce=true;
    }
    this.opened=true;this.record.activeVariant=this.variant;this.refresh(context);
    if(announce)this.emit('open');
    return true;
  }
  pulse(soul=this.context?.soul){
    const context=this.context;
    if(this.destroyed||!this.isExpanded(context)||context?.state!=='playing')return false;
    const target=this.nearestTarget(soul);if(!target)return false;
    // Repeated presses keep this interaction's hint; they cannot submit again.
    if(this.roundSolved||this.handoff)return true;
    this.notice=null;
    if(target.kind==='object'){
      this.clueIndex=this.clueIndex===0?1:0;this.feedback=null;
      if(!this.seenClues.includes(this.clueIndex)){
        this.record.seenClues[this.variant]=indexes([...this.seenClues,this.clueIndex]);this.emit('clue',{clueIndex:this.clueIndex});
      }
      return true;
    }
    const claimant=this.variantDefinition.claimants[target.index];this.observed.add(claimant.id);
    if(this.seenClues.length<2){this.notice={text:'先照看失物的另一面',remaining:2};return true;}
    const judgement=evaluateLostClaim(this.config.id,this.variant,claimant.id);if(!judgement.valid)return false;
    const kind=judgement.correct?'solve':'wrong';this.feedback={kind,text:judgement.feedback,claimantId:claimant.id};
    this.handoff=context.reducedMotion?null:{kind,claimantId:claimant.id,progress:0,duration:judgement.correct?.7:.85,from:{x:this.layout.object.x,y:this.layout.object.y},to:{x:target.x,y:target.y}};
    if(judgement.correct){
      this.roundSolved=true;this.record.solvedVariants=indexes([...this.record.solvedVariants,this.variant]);
      this.encoreElapsed=context.reducedMotion?LOST_ENCORE_DURATION:0;
      this.record.activeVariant=this.variant;this.refresh(context);
      if(!this.solveSent){this.solveSent=true;this.emit('solve',{claimantId:claimant.id});}
    }else{this.refresh(context);this.emit('wrong',{claimantId:claimant.id});}
    return true;
  }
  update(dt,context){
    if(this.destroyed)return;
    this.refresh(context);dt=clamp(finite(dt),0,.04);
    if(!this.isExpanded(context)||context?.state!=='playing'||!dt)return;
    if(this.notice){this.notice.remaining=Math.max(0,this.notice.remaining-dt);if(!this.notice.remaining)this.notice=null;}
    if(this.handoff){this.handoff.progress=clamp(this.handoff.progress+dt/this.handoff.duration,0,1);if(this.handoff.progress>=1)this.handoff=null;}
    if(this.roundSolved&&this.encoreElapsed!==null){
      const next=this.encoreElapsed+dt;
      this.encoreElapsed=next>=LOST_ENCORE_DURATION-1e-9?LOST_ENCORE_DURATION:next;
    }
    this.refresh(context);
  }
  recover(context){
    if(this.destroyed)return;
    this.handoff=null;this.notice=null;
    if(this.roundSolved)this.encoreElapsed=LOST_ENCORE_DURATION;
    this.refresh(context);
  }
  getEvidence(){
    if(!this.isExpanded())return null;
    const target=this.nearestTarget();
    if(target?.kind==='claimant'){
      const claimant=this.variantDefinition.claimants[target.index];
      return {kind:'claimant',title:claimant.name,text:claimant.observation,...(claimant.diagram?{diagram:claimant.diagram}:{})};
    }
    if(this.clueIndex!==null&&this.seenClues.includes(this.clueIndex)){
      const clue=this.variantDefinition.clues[this.clueIndex];return {kind:'clue',title:clue.title,text:clue.text,...(clue.diagram?{diagram:clue.diagram}:{})};
    }
    return null;
  }
  getHint(context=this.context){
    if(this.destroyed||!this.available)return '';
    if(context?.form==='body'){
      if(!this.nearBox(context.body))return '';
      if(!this.bodyInRange(context.body))return '走到失物匣旁 · Q 查看';
      if(this.roundSolved)return this.record.solvedVariants.length<2?'Q：打开下一件失物':'Q：再认领一次';
      return this.opened?'E：让拾光查看失物':'Q：打开失物匣';
    }
    if(!this.isExpanded(context))return '';
    if(this.notice)return this.notice.text;
    if(this.roundSolved)return '物归原主 · E 归位，Q 查看下一件';
    if(this.handoff)return '失物正在回来，线索还在';
    const target=this.nearestTarget(context.soul);
    if(target?.kind==='object')return this.clueIndex===null?'空格 / Q：照看失物':'空格 / Q：翻看另一面';
    if(target?.kind==='claimant')return this.seenClues.length<2?'先看齐两面物证，再交还':'空格 / Q：交给 '+this.variantDefinition.claimants[target.index].name;
    return this.seenClues.length<2?'飞近失物 · 看齐两面物证':'飞近认领者，看看谁与物证相符';
  }
  getSnapshot(){
    if(this.destroyed||!this.available)return null;
    const encore=this.getEncore();
    return {caseId:this.config.id,title:this.config.title,phase:this.phase,variant:this.variant,nearBox:this.nearBox(),opened:this.opened,seenClues:this.seenClues.length,totalClues:2,hint:this.getHint(),evidence:this.getEvidence(),
      encore:encore?{caption:encore.caption,stage:encore.stage,settled:encore.settled}:null};
  }
  getEncore(){
    if(!this.roundSolved||!this.isExpanded()||this.encoreElapsed===null)return null;
    const definition=getLostEncore(this.config.id,this.variant);
    if(!definition)return null;
    const index=this.variantDefinition.claimants.findIndex(person=>person.id===this.variantDefinition.answer);
    if(index<0)return null;
    const elapsed=clamp(finite(this.encoreElapsed),0,LOST_ENCORE_DURATION),x=this.layout.object.x,library=this.config.sceneId==='story-3';
    return {...definition,motif:this.config.object.motif,elapsed,duration:LOST_ENCORE_DURATION,progress:elapsed/LOST_ENCORE_DURATION,
      stage:elapsed<.7?'delivery':elapsed<1.65?'unfold':elapsed<LOST_ENCORE_DURATION?'celebrate':'settled',settled:elapsed===LOST_ENCORE_DURATION,
      anchor:{x,y:library?424:432},bounds:{left:x-52,right:x+52,top:library?403:404,bottom:library?448:464},
      recipient:{...this.variantDefinition.claimants[index],...this.layout.claimants[index]}};
  }
  getView(){
    if(this.destroyed)return null;
    const expanded=this.isExpanded(),selected=expanded?this.nearestTarget():null;
    const handoff=this.handoff?{...this.handoff,...pointOnLostHandoff(this.handoff.from,this.handoff.to,this.handoff.progress,this.handoff.kind)}:null;
    return {caseId:this.config.id,sceneId:this.config.sceneId,config:this.config,variant:this.variant,variantDefinition:this.variantDefinition,phase:this.phase,available:this.available,opened:this.opened,visible:this.available,expanded,nearBox:this.nearBox(),
      box:{...this.layout.box,nearby:this.inRange},object:{...this.layout.object,...this.config.object,selected:selected?.kind==='object',clueIndex:this.clueIndex,seen:[...this.seenClues],delivered:this.roundSolved&&!this.handoff},
      claimants:this.variantDefinition.claimants.map((claimant,index)=>({...claimant,...this.layout.claimants[index],selected:selected?.kind==='claimant'&&selected.index===index,seen:this.observed.has(claimant.id)})),
      seenClues:[...this.seenClues],solvedVariants:[...this.record.solvedVariants],deliveredClaimantId:this.roundSolved?this.variantDefinition.answer:null,handoff,encore:this.getEncore(),feedback:this.feedback?{...this.feedback}:null,hint:this.getHint()};
  }
  destroy(){this.destroyed=true;this.phase='destroyed';this.context=null;this.handoff=null;this.encoreElapsed=null;this.notice=null;this.feedback=null;this.observed.clear();this.onEvent=null;}
}
