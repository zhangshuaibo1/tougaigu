import test from 'node:test';
import assert from 'node:assert/strict';
import { DreamGame, DREAM_PHYSICS } from '../dist/dream-engine.js';
import { LOST_CASES, evaluateLostClaim } from '../dist/dream-lost-cases.js';
import { DreamLostCase, normalizeLostCaseRecord, pointOnLostHandoff } from '../dist/dream-lost-engine.js';
import { CAP_ACTIVITIES } from '../dist/dream-cap-activities.js';

const noop=()=>{};
globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
const numeric=(args)=>{for(const arg of args){if(typeof arg==='number')assert.ok(Number.isFinite(arg),'non-finite drawing coordinate');else if(Array.isArray(arg))numeric(arg);}};
const context=new Proxy({globalAlpha:1,createLinearGradient:(...args)=>{numeric(args);return {addColorStop:noop};},createRadialGradient:(...args)=>{numeric(args);return {addColorStop:noop};},measureText:text=>({width:String(text).length*10})},{get:(target,key)=>key in target?target[key]:(...args)=>numeric(args)});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const completeBase=()=>({completedSteps:[0,1,2],completedVariants:[0],best:{},pending:null});
const caseOptions=config=>config.sceneId.startsWith('story-')?{chapterIndex:Number(config.sceneId.slice(6))}:{festival:{id:config.sceneId}};
function makeGame(options={},callbacks={},width=1100){
  const game=new DreamGame({getContext:()=>context,getBoundingClientRect:()=>({width,height:620})},callbacks);
  game.start({chapterIndex:0,capActivityRecord:completeBase(),sound:false,...options});return game;
}
const tick=(game,seconds)=>{for(let i=0;i<Math.ceil(seconds*60);i++)game.update(1/60);};
function walkTo(game,target){
  assert.equal(game.form,'body');
  for(let i=0;i<8*60;i++){
    const dx=target-game.body.x;
    if(Math.abs(dx)<1&&Math.abs(game.body.vx)<10){game.setInput({x:0,y:0});tick(game,.12);return;}
    game.setInput({x:clamp(dx/42,-1,1),y:0});game.update(1/60);
  }
  assert.fail('the lost-property box was not reachable by walking');
}
function flyTo(game,target){
  for(let i=0;i<7*60;i++){
    assert.equal(game.form,'soul');const dx=target.x-game.soul.x,dy=target.y-game.soul.y;
    if(Math.hypot(dx,dy)<12&&Math.hypot(game.soul.vx,game.soul.vy)<45){game.setInput({x:0,y:0});return;}
    game.setInput({x:clamp(dx/38,-1,1),y:clamp(dy/38,-1,1)});game.update(1/60);
  }
  assert.fail('a lost-property interaction was unreachable through ordinary flight');
}
function pulse(game,space=false){if(game.pulseCooldown>0)tick(game,game.pulseCooldown+1/60);assert.equal(space?game.jump():game.interact(),true);}
function openBox(game){walkTo(game,465);assert.equal(game.lostCase.bodyInRange(game.body),true);assert.equal(game.interact(),true);assert.equal(game.lostCase.opened,true);assert.equal(game.toggleSoul(),true);}
function readBoth(game){
  flyTo(game,game.lostCase.layout.object);pulse(game,true);const front=game.getSnapshot().lostCase.evidence;
  assert.equal(front.kind,'clue');pulse(game);const back=game.getSnapshot().lostCase.evidence;
  assert.equal(back.kind,'clue');assert.notEqual(front.title,back.title);assert.deepEqual(game.lostCase.seenClues,[0,1]);
}
function claimant(game,correct=true){const lost=game.lostCase,index=lost.variantDefinition.claimants.findIndex(person=>evaluateLostClaim(lost.config.id,lost.variant,person.id).correct===correct);return {...lost.variantDefinition.claimants[index],...lost.layout.claimants[index]};}
function choose(game,person){flyTo(game,person);const evidence=game.getSnapshot().lostCase.evidence;assert.equal(evidence.kind,'claimant');assert.equal(evidence.text,person.observation);pulse(game);}
const geometry=game=>JSON.stringify({platforms:game.level.platforms,barriers:game.level.barriers,pads:game.level.pads,winds:game.level.winds,exit:game.level.exit,checkpoints:game.level.checkpoints});
const stateOfPlay=game=>JSON.stringify({body:game.body,soul:game.soul,energy:game.energy,time:game.time,lamps:game.lanterns,memories:game.memories,geometry:geometry(game)});

test('three cases and all six evidence variants finish through walking, Q, E, flying and pulse inputs',()=>{
  assert.equal(LOST_CASES.length,3);
  for(const config of LOST_CASES){
    const events=[],mainCompletions=[],game=makeGame(caseOptions(config),{onLostCase:event=>events.push(event),onComplete:event=>mainCompletions.push(event)}),before=geometry(game);
    openBox(game);assert.equal(events.filter(e=>e.type==='open').length,1);assert.equal(game.getSnapshot().lostCase.evidence,null);
    for(let variant=0;variant<2;variant++){
      assert.equal(game.lostCase.variant,variant);readBoth(game);const person=claimant(game);choose(game,person);
      assert.ok(game.lostCase.record.solvedVariants.includes(variant),'correct decisions must save before their presentation ends');assert.equal(game.lostCase.roundSolved,true);assert.equal(game.state,'playing');
      const event=events.filter(e=>e.type==='solve'&&e.variant===variant);assert.equal(event.length,1);assert.equal(event[0].claimantId,person.id);assert.deepEqual(event[0].seenClues,[0,1]);
      assert.ok(events.every(e=>e.caseId===config.id&&e.sceneId===config.sceneId&&e.revision==='0:base'&&e.chapterIndex===game.chapterIndex&&e.festivalId===game.festivalId&&e.mode===game.mode));
      const count=events.length;tick(game,1);game.render();assert.equal(game.interact(),true);assert.equal(events.length,count,'a solved round cannot emit another solve without explicit replay');
      assert.equal(game.getSnapshot().seals,0);assert.equal(game.deaths,0);assert.equal(geometry(game),before);assert.equal(mainCompletions.length,0);assert.equal(game.maxEnergy,DREAM_PHYSICS.maxEnergy);
      if(variant===0){assert.equal(game.recall(),true);tick(game,6);assert.equal(game.interact(),true);assert.equal(game.toggleSoul(),true);}
    }
    assert.deepEqual(events.filter(e=>e.type==='clue').map(e=>[e.variant,e.clueIndex]),[[0,0],[0,1],[1,0],[1,1]]);assert.deepEqual(game.lostCase.record.solvedVariants,[0,1]);game.destroy();
  }
});

test('a cabinet stays locked until a real base route completes, and unsupported scenes add no cabinet',()=>{
  const game=makeGame({capActivityRecord:null});assert.equal(game.lostCase.available,false);assert.equal(game.getSnapshot().lostCase,null);assert.equal(game.lostCase.getView().visible,false);
  walkTo(game,465);assert.equal(game.interact(),false);assert.equal(game.lostCase.opened,false);walkTo(game,330);game.toggleSoul();
  for(let i=0;i<120*60&&game.capActivity.phase!=='complete';i++){
    const activity=game.capActivity;
    if(game.form==='body'){if(game.energy>=98)game.toggleSoul();else game.update(1/60);continue;}
    if(game.energy<8){game.recall();continue;}
    const target=activity.targetIndex,wanted={a:target===0?0:1,b:target===1?0:1},id=activity.switches.a!==wanted.a?'a':target!==0&&activity.switches.b!==wanted.b?'b':null;
    if(id){const bell=activity.nodes[id],dx=bell.x-game.soul.x,dy=bell.y-game.soul.y;if(Math.hypot(dx,dy)<24){game.setInput({x:0,y:0});if(game.pulseCooldown<=0)assert.equal(game.interact(),true);}else game.setInput({x:clamp(dx/42,-1,1),y:clamp(dy/42,-1,1)});}else game.setInput({x:0,y:0});
    game.update(1/60);
  }
  assert.equal(game.capActivity.phase,'complete');assert.equal(game.lostCase.available,true);assert.equal(game.lostCase.opened,false);game.recall();tick(game,6);openBox(game);assert.equal(game.lostCase.phase,'active');game.destroy();
  const supported=new Set(LOST_CASES.map(item=>item.sceneId));
  for(const activity of CAP_ACTIVITIES){const other=makeGame(activity.festivalId?{festival:{id:activity.festivalId}}:{chapterIndex:activity.chapterIndex});assert.equal(Boolean(other.lostCase),supported.has(activity.id));other.render();other.destroy();}
});

test('unseen evidence cannot be guessed, wrong owners get specific feedback and retries have no resource penalty',()=>{
  for(const config of LOST_CASES){
    const events=[],game=makeGame(caseOptions(config),{onLostCase:event=>events.push(event)});openBox(game);const wrong=claimant(game,false);choose(game,wrong);
    assert.equal(events.some(e=>e.type==='wrong'||e.type==='solve'),false);assert.match(game.getSnapshot().lostCase.hint,/另一面/);assert.equal(game.lostCase.handoff,null);
    readBoth(game);flyTo(game,wrong);tick(game,.5);const before={energy:game.energy,deaths:game.deaths,gifts:game.getSnapshot().gifts};choose(game,wrong);
    assert.equal(game.lostCase.feedback.text,game.lostCase.variantDefinition.wrong[wrong.id]);assert.equal(game.lostCase.handoff.kind,'wrong');assert.equal(events.filter(e=>e.type==='wrong').length,1);assert.deepEqual(game.lostCase.record.solvedVariants,[]);
    assert.equal(game.deaths,before.deaths);assert.equal(game.getSnapshot().gifts,before.gifts);assert.equal(game.energy,before.energy);
    tick(game,1);assert.equal(game.lostCase.phase,'active');assert.equal(game.lostCase.handoff,null);assert.deepEqual(game.lostCase.seenClues,[0,1]);choose(game,claimant(game));assert.equal(events.filter(e=>e.type==='solve').length,1);game.destroy();
  }
});

test('all case observation circles preserve energy without replenishing it, and flight outside them still drains normally',()=>{
  for(const config of LOST_CASES){
    const events=[],mainEvents=[],game=makeGame(caseOptions(config),{onLostCase:event=>events.push(event),onCapEvent:event=>mainEvents.push(event)});openBox(game);
    for(const target of [game.lostCase.layout.object,...game.lostCase.layout.claimants]){
      flyTo(game,target);tick(game,.5);assert.ok(game.lostCase.nearestTarget());
      const before={energy:game.energy,events:events.length,mainEvents:mainEvents.length,gifts:game.getSnapshot().gifts,seals:game.getSnapshot().seals,record:game.lostCase.getRecord()};
      tick(game,3);assert.equal(game.energy,before.energy);assert.equal(events.length,before.events);assert.equal(mainEvents.length,before.mainEvents);assert.equal(game.getSnapshot().gifts,before.gifts);assert.equal(game.getSnapshot().seals,before.seals);assert.deepEqual(game.lostCase.getRecord(),before.record);
      // Check the real circular boundary after an ordinary flight, including its inclusive edge.
      for(const [offset,protectedReading] of [[target.r,true],[target.r+.01,false]]){
        Object.assign(game.soul,{x:target.x,y:target.y+offset,vx:0,vy:0});game.setInput({x:0,y:0});const energy=game.energy;game.update(1/60);
        assert.ok(Math.abs(game.energy-(energy-(protectedReading?0:DREAM_PHYSICS.energyDrain/60)))<1e-9);
      }
    }
    flyTo(game,{x:390,y:490});tick(game,.5);assert.equal(game.lostCase.nearestTarget(),null);const energy=game.energy;tick(game,1);assert.ok(Math.abs(game.energy-(energy-DREAM_PHYSICS.energyDrain))<1e-9);game.destroy();
  }
});

test('locked or unopened cabinets and bodies away from the box do not protect observation locations',()=>{
  for(const state of ['locked','closed','away','borrowing']){
    const game=makeGame({capActivityRecord:state==='locked'||state==='borrowing'?null:completeBase()});
    if(state==='away'){openBox(game);game.recall();walkTo(game,390);}
    else walkTo(game,state==='borrowing'?330:465);
    assert.equal(game.toggleSoul(),true);flyTo(game,game.lostCase.layout.object);tick(game,.5);
    assert.ok(game.lostCase.nearestTarget());assert.equal(game.lostCase.isExpanded(),false);if(state==='borrowing')assert.equal(game.capActivity.started,true);
    const energy=game.energy;tick(game,1);assert.ok(Math.abs(game.energy-(energy-DREAM_PHYSICS.energyDrain))<1e-9);game.destroy();
  }
});

test('low-energy reading stays controllable, recall restores only normal body energy, and empty flight still recalls',()=>{
  const events=[],game=makeGame({}, {onLostCase:event=>events.push(event)});openBox(game);readBoth(game);tick(game,.5);game.energy=.01;
  const record=game.lostCase.getRecord(),count=events.length;tick(game,25);assert.equal(game.form,'soul');assert.equal(game.energy,.01);assert.match(game.getNearHint(),/翻看另一面/);assert.equal(events.length,count);assert.deepEqual(game.lostCase.getRecord(),record);
  assert.equal(game.toggleSoul(),true);assert.equal(game.form,'body');assert.equal(game.lostCase.isExpanded(),false);tick(game,1);assert.ok(Math.abs(game.energy-18.01)<1e-9);assert.equal(game.toggleSoul(),true);
  assert.equal(game.lostCase.nearestTarget(),null);assert.match(game.getNearHint(),/灵光快用完/);game.energy=.001;game.update(1/60);assert.equal(game.form,'body');assert.equal(game.energy,0);tick(game,1);assert.ok(Math.abs(game.energy-18)<1e-9);assert.deepEqual(game.lostCase.getRecord(),record);assert.equal(events.length,count);game.destroy();
});

test('pause, recall, leaving the box and low energy retain evidence and freeze presentation without locking control',()=>{
  const events=[],game=makeGame({}, {onLostCase:event=>events.push(event)});openBox(game);readBoth(game);choose(game,claimant(game,false));tick(game,.18);
  const handoff=structuredClone(game.lostCase.handoff);game.pause();tick(game,3);game.render();assert.deepEqual(game.lostCase.handoff,handoff);assert.equal(game.lostCase.getView().expanded,true);
  game.resume();tick(game,.1);assert.ok(game.lostCase.handoff.progress>handoff.progress);game.recall();const returned=structuredClone(game.lostCase.handoff);tick(game,1);assert.deepEqual(game.lostCase.handoff,returned);assert.equal(game.getSnapshot().lostCase.evidence,null);
  walkTo(game,390);assert.equal(game.lostCase.getView().expanded,false);walkTo(game,465);assert.equal(game.toggleSoul(),true);tick(game,1);assert.equal(game.lostCase.phase,'active');assert.deepEqual(game.lostCase.seenClues,[0,1]);
  game.energy=.001;game.update(1/60);assert.equal(game.form,'body');assert.equal(game.lostCase.phase,'suspended');tick(game,6);game.toggleSoul();choose(game,claimant(game));assert.equal(events.filter(e=>e.type==='solve').length,1);
  game.pause();game.setReducedMotion(true);assert.equal(game.lostCase.handoff,null);assert.equal(game.lostCase.getView().object.delivered,true);assert.ok(game.lostCase.getView().deliveredClaimantId);game.resume();game.recall();game.setInput({x:-1,y:0});const x=game.body.x;tick(game,.2);assert.ok(game.body.x<x);game.destroy();
});

test('saved partial evidence restores only seen facts and explicit Q selects unfinished groups before replaying solved ones',()=>{
  const events=[],game=makeGame({capActivityRecord:null,lostCaseRecord:{activeVariant:1,seenClues:{0:[0,1],1:[0]},solvedVariants:[0]}},{onLostCase:event=>events.push(event)});
  assert.equal(game.lostCase.available,true);assert.equal(game.lostCase.opened,true);assert.equal(game.getSnapshot().lostCase.evidence,null);assert.equal(events.length,0);
  walkTo(game,465);game.toggleSoul();assert.equal(game.getSnapshot().lostCase.evidence.title,game.lostCase.variantDefinition.clues[0].title);flyTo(game,game.lostCase.layout.object);pulse(game);assert.equal(game.lostCase.clueIndex,1);assert.equal(events.filter(e=>e.type==='clue').length,1);choose(game,claimant(game));
  game.recall();tick(game,6);assert.equal(game.interact(),true);assert.equal(game.lostCase.variant,0);assert.equal(game.lostCase.clueIndex,null);game.toggleSoul();assert.equal(game.getSnapshot().lostCase.evidence,null);choose(game,claimant(game));
  assert.deepEqual(game.lostCase.record.solvedVariants,[0,1]);assert.equal(events.filter(e=>e.type==='solve').length,2);const before=events.length;tick(game,2);game.interact();assert.equal(events.length,before);
  game.recall();game.interact();assert.equal(game.lostCase.variant,1);game.destroy();
});

test('revision replacement is safe inside clue and solve callbacks and destroyed instances cannot emit stale progress',()=>{
  const events=[];let replaceOn='clue',game;
  game=makeGame({}, {onLostCase:event=>{
    events.push(event);
    if(event.type===replaceOn){const before=stateOfPlay(game);game.setLostCaseRecord({activeVariant:1,seenClues:{0:[],1:[]},solvedVariants:[]},replaceOn==='clue'?'2:clue-import':'3:solve-import');assert.equal(stateOfPlay(game),before);}
  }});
  openBox(game);flyTo(game,game.lostCase.layout.object);const first=game.lostCase;pulse(game);
  assert.equal(first.destroyed,true);assert.equal(first.handoff,null);assert.equal(game.lostCase.variant,1);assert.equal(game.lostCase.revision,'2:clue-import');assert.deepEqual(game.lostCase.seenClues,[]);assert.equal(game.lostCase.opened,false);
  const eventCount=events.length;first.emit('solve',{claimantId:'keeper'});first.update(1/60,game.lostCaseContext());assert.equal(first.pulse(game.soul),false);assert.equal(first.getView(),null);assert.equal(events.length,eventCount);
  replaceOn='solve';game.recall();tick(game,6);game.interact();game.toggleSoul();readBoth(game);const second=game.lostCase;choose(game,claimant(game));
  assert.equal(second.destroyed,true);assert.equal(second.handoff,null);assert.equal(game.lostCase.revision,'3:solve-import');assert.deepEqual(game.lostCase.record.solvedVariants,[]);assert.equal(game.lostCase.opened,false);
  assert.equal(events.filter(e=>e.type==='solve').length,1);assert.equal(events.find(e=>e.type==='solve').revision,'2:clue-import');tick(game,2);assert.equal(events.filter(e=>e.type==='solve').length,1);
  const abandoned=game.lostCase;game.destroy();abandoned.emit('open');assert.equal(abandoned.getSnapshot(),null);assert.equal(events.filter(e=>e.type==='solve').length,1);
});

test('restart retains obtained cabinet access and facts, but explicit imports clear the temporary unlock source',()=>{
  const game=makeGame();assert.equal(game.lostCase.available,true);const old=game.lostCase;game.restart();assert.equal(old.destroyed,true);assert.equal(game.capActivity.phase,'idle');assert.equal(game.lostCase.available,true);assert.equal(game.restartLostUnlocked,true);
  game.setCapActivityRecord(null,'1:empty-cap');assert.equal(game.restartLostUnlocked,false);assert.equal(game.lostCase.available,false);
  game.setCapActivityRecord(completeBase(),'2:complete-cap');openBox(game);flyTo(game,game.lostCase.layout.object);pulse(game);assert.deepEqual(game.lostCase.seenClues,[0]);
  game.restart();assert.equal(game.capActivity.phase,'idle');assert.deepEqual(game.lostCase.seenClues,[0]);assert.equal(game.lostCase.available,true);assert.equal(game.getSnapshot().lostCase.evidence,null);
  game.setCapActivityRecord(null,'3:empty-cap');assert.equal(game.lostCase.available,true,'real seen evidence keeps its legitimate prior unlock');const before=stateOfPlay(game);game.setLostCaseRecord(null,'4:empty-lost');assert.equal(game.lostCase.available,false);assert.equal(game.restartLostUnlocked,false);assert.equal(stateOfPlay(game),before);
  game.start({chapterIndex:0,capActivityRecord:null,lostCaseRecord:null,sound:false});assert.equal(game.lostCase.available,false,'a new launch must not inherit another instance unlock');game.destroy();
});

test('lamps, dangerous shadows, festival NPCs and the original borrowing Q retain interaction priority',()=>{
  const lostEvents=[],talks=[],puzzles=[],game=makeGame({festival:{id:'halloween'}},{onLostCase:event=>lostEvents.push(event),onTalk:event=>talks.push(event),onPuzzle:event=>puzzles.push(event)});
  walkTo(game,196);assert.equal(game.interact(),true);assert.equal(talks.length,1);assert.equal(game.state,'paused');assert.equal(game.lostCase.opened,false);game.resolveTalk();walkTo(game,330);assert.equal(game.interact(),true);assert.equal(game.capActivity.variant,1);assert.equal(game.lostCase.opened,false);
  openBox(game);flyTo(game,game.lostCase.layout.object);const before=lostEvents.length;game.hazards.push({kind:'wisp',x:390,y:430,px:390,py:430,r:10,range:0,speed:0,clock:0,frozen:0,hitCooldown:0});pulse(game);
  assert.equal(game.hazards.at(-1).frozen,4.5);assert.equal(lostEvents.length,before);assert.deepEqual(game.lostCase.seenClues,[]);game.hazards.pop();
  flyTo(game,game.lanterns[0]);pulse(game);assert.equal(puzzles.length,1);assert.equal(game.pendingSeal,0);assert.equal(game.state,'paused');assert.equal(lostEvents.length,before);game.resolvePuzzle(true);assert.equal(game.lanterns[0].lit,true);assert.equal(game.state,'playing');game.destroy();
});

test('narrow-screen lost projections retain all claimant labels during pause and restore framing after recall',()=>{
  for(const width of [320,390]){
    const game=makeGame({}, {},width);openBox(game);game.render();assert.equal(game.lostFramed,true);assert.ok(game.viewWidth>=400);
    const view=game.lostCase.getView();for(const person of view.claimants){assert.ok((person.x-44-game.camera)*game.scale>=0);assert.ok((person.x+44-game.camera)*game.scale<=width);assert.ok((person.y-43)*game.scale+game.viewportOffsetY>=0);assert.ok((person.y+55)*game.scale+game.viewportOffsetY<=620);}
    const backdrop=game.getSceneBackdropView();for(const person of view.claimants)assert.ok(backdrop.clearZones.some(circle=>circle.x===person.x&&circle.y===person.y+8&&circle.r>=65));
    const frame={camera:game.camera,scale:game.scale,offset:game.viewportOffsetY};game.pause();tick(game,2);game.render();assert.deepEqual({camera:game.camera,scale:game.scale,offset:game.viewportOffsetY},frame);game.resume();game.recall();game.render();assert.equal(game.lostFramed,false);assert.equal(game.scale,game.baseScale);assert.equal(game.viewportOffsetY,0);
    walkTo(game,390);game.toggleSoul();game.render();assert.equal(game.lostFramed,false);assert.equal(game.lostCase.getView().expanded,false);game.destroy();
  }
});

test('reduced motion settles handoffs immediately, and falls clear presentation while retaining solved records',()=>{
  const events=[],game=makeGame({reducedMotion:true},{onLostCase:event=>events.push(event)});openBox(game);readBoth(game);choose(game,claimant(game,false));assert.equal(game.lostCase.handoff,null);assert.equal(game.lostCase.phase,'active');choose(game,claimant(game));assert.equal(game.lostCase.handoff,null);assert.equal(game.lostCase.phase,'solved');
  const record=game.lostCase.getRecord();game.body.y=730;game.update(1/60);assert.equal(game.form,'body');assert.deepEqual(game.lostCase.getRecord(),record);assert.equal(game.lostCase.getView().expanded,false);assert.equal(game.lostCase.handoff,null);game.render();assert.equal(events.filter(e=>e.type==='solve').length,1);game.destroy();
  const from={x:390,y:430},to={x:175,y:285};assert.deepEqual(pointOnLostHandoff(from,to,0),{...from,scale:1});assert.deepEqual(pointOnLostHandoff(from,to,1),{...to,scale:.8});assert.deepEqual(pointOnLostHandoff(from,to,1,'wrong'),{...from,scale:1});
  for(let i=0;i<=100;i++)for(const kind of ['solve','wrong']){const point=pointOnLostHandoff(from,to,i/100,kind);assert.ok(Number.isFinite(point.x)&&Number.isFinite(point.y)&&point.scale>0&&point.scale<=1);}
});

test('lost records are bounded independent copies and constructing an instance cannot write progress',()=>{
  const input={activeVariant:99,seenClues:{0:[1,1,-1,0,3,'1'],1:[0,Infinity]},solvedVariants:[1,1,2,null]},record=normalizeLostCaseRecord(input);
  assert.deepEqual(record,{activeVariant:0,seenClues:{0:[0,1],1:[0]},solvedVariants:[1]});record.seenClues[0].push(9);assert.deepEqual(input.seenClues[0],[1,1,-1,0,3,'1']);
  const events=[],lost=new DreamLostCase(LOST_CASES[0],{record:input,onEvent:event=>events.push(event)});assert.equal(events.length,0);const view=lost.getView();view.seenClues.push(99);assert.deepEqual(lost.seenClues,[0,1]);lost.destroy();assert.equal(lost.getView(),null);
});
