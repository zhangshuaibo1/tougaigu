import test from 'node:test';
import assert from 'node:assert/strict';
import { DreamGame } from '../dist/dream-engine.js';
import { DREAM_LEVELS, getDreamLevel } from '../dist/dream-levels.js';
import { FESTIVAL_LEVELS } from '../dist/dream-festival-levels.js';
import { getStoryNPC, getStoryEncounter } from '../dist/dream-encounters.js';

const noop=()=>{};
globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
const numeric=args=>{for(const value of args){if(typeof value==='number')assert.ok(Number.isFinite(value),'non-finite rendering coordinate');else if(Array.isArray(value))numeric(value);}};
function drawingContext(labels=[]){return new Proxy({
  globalAlpha:1,
  createLinearGradient:(...args)=>{numeric(args);return {addColorStop:noop};},
  createRadialGradient:(...args)=>{numeric(args);return {addColorStop:noop};},
  measureText:value=>({width:String(value).length*8}),
  fillText:(value,...args)=>{numeric(args);labels.push(String(value));},
},{get:(target,key)=>key in target?target[key]:(...args)=>numeric(args)});}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const completeBase=()=>({completedSteps:[0,1,2],completedVariants:[0],best:{},pending:null});
function makeGame(options={},callbacks={},size={width:1100,height:620}){
  const labels=[],ctx=drawingContext(labels),canvas={getContext:()=>ctx,getBoundingClientRect:()=>size};
  const game=new DreamGame(canvas,callbacks);game.start({sound:false,...options});return {game,labels};
}
const tick=(game,seconds)=>{for(let i=0;i<Math.ceil(seconds*60);i++)game.update(1/60);};
function walkTo(game,x){
  assert.equal(game.form,'body');
  for(let frame=0;frame<8*60;frame++){
    const dx=x-game.body.x;
    if(Math.abs(dx)<1&&Math.abs(game.body.vx)<10){game.setInput({x:0,y:0});tick(game,.12);return;}
    game.setInput({x:clamp(dx/42,-1,1),y:0});game.update(1/60);
  }
  assert.fail('NPC or neighbouring optional play was not reachable through walking');
}
function flyTo(game,target){
  for(let frame=0;frame<7*60;frame++){
    assert.equal(game.form,'soul');
    const dx=target.x-game.soul.x,dy=target.y-game.soul.y;
    if(Math.hypot(dx,dy)<12&&Math.hypot(game.soul.vx,game.soul.vy)<45){game.setInput({x:0,y:0});return;}
    game.setInput({x:clamp(dx/38,-1,1),y:clamp(dy/38,-1,1)});game.update(1/60);
  }
  assert.fail('ordinary flight did not reach the first main-story lamp');
}
const geometry=level=>JSON.stringify(Object.fromEntries(['width','height','spawn','platforms','plates','barriers','lanterns','memories','checkpoints','exit','movers','pads','winds','hazards'].map(key=>[key,level[key]])));
const facts=game=>JSON.stringify({lamps:game.lanterns.map(lamp=>lamp.lit),memories:game.memories.map(memory=>memory.collected),deaths:game.deaths,capActivity:game.capActivity.record,lost:game.lostCase?.getRecord()});

test('six story friends live in separate runtime copies without changing authored collisions or shared descriptions',()=>{
  const authored=JSON.stringify(DREAM_LEVELS);
  for(let chapterIndex=0;chapterIndex<6;chapterIndex++){
    const {game}=makeGame({chapterIndex}),definition=getStoryNPC(chapterIndex),npc=game.level.npcs[0];
    assert.equal(game.level.npcs.length,1);assert.equal(npc.id,definition.id);assert.equal(npc.x,190);assert.equal(npc.y,560);
    assert.notEqual(npc,definition);assert.equal(geometry(game.level),geometry(getDreamLevel(chapterIndex)));
    assert.ok(npc.x+98<game.capActivity.layout.anchor.x-game.capActivity.layout.anchor.r,'a story Q must stop before the borrowing ring');
    assert.ok(Math.abs(npc.x-465)>98+30,'the lost-property cabinet remains independent');
    npc.x=220;assert.equal(getStoryNPC(chapterIndex).x,190);game.restart();assert.equal(game.level.npcs[0].x,190);
    assert.equal(game.companion.x,40,'the cat starts at its existing trailing target, clear of the new friend');
    game.destroy();
  }
  assert.equal(JSON.stringify(DREAM_LEVELS),authored);
});

test('approaching never auto-pauses, and actual Q owns one conversation pause until it is resolved',()=>{
  for(let chapterIndex=0;chapterIndex<6;chapterIndex++){
    const talks=[],completions=[],{game}=makeGame({chapterIndex},{onTalk:event=>talks.push(event),onComplete:event=>completions.push(event)}),npc=getStoryNPC(chapterIndex);
    assert.deepEqual(game.getSnapshot().target,{kind:'npc',id:npc.id,name:npc.name,action:'talk'});
    assert.equal(game.getNearHint(),'Q：与'+npc.name+'聊一聊');
    walkTo(game,190);tick(game,.3);assert.equal(game.state,'playing');assert.equal(talks.length,0);
    const before=facts(game);assert.equal(game.interact(),true);
    assert.deepEqual(talks,[{mode:'story',chapterIndex,npcId:npc.id,repeated:false,seals:0}]);
    assert.equal(game.state,'paused');assert.equal(game.pendingTalk,npc.id);assert.equal(game.getStoryNPCView().talking,true);
    assert.equal(game.getNearHint(),npc.name+'正在和你说话。');
    const time=game.time,visualTime=game.visualTime,pose=game.getStoryNPCView();tick(game,9);
    assert.equal(game.time,time);assert.equal(game.visualTime,visualTime);assert.deepEqual(game.getStoryNPCView(),pose);
    assert.equal(game.resume(),false);assert.equal(game.pause(),false);assert.equal(game.interact(),false);assert.equal(game.toggleSoul(),false);assert.equal(game.useItem('star_compass'),false);
    assert.equal(game.resolveTalk(),true);assert.equal(game.state,'playing');assert.equal(game.pendingTalk,null);assert.equal(game.getStoryNPCView().talked,true);assert.equal(game.resolveTalk(),false);
    assert.equal(game.interact(),true);assert.equal(talks.length,2);assert.equal(talks[1].repeated,true);game.resolveTalk();
    assert.equal(facts(game),before);assert.equal(completions.length,0);game.destroy();
  }
});

test('returning after a real first-lamp journey reports the current light count without granting anything for a conversation',()=>{
  for(let chapterIndex=0;chapterIndex<6;chapterIndex++){
    const talks=[],{game}=makeGame({chapterIndex},{onTalk:event=>talks.push(event)});
    game.interact();game.resolveTalk();walkTo(game,410);assert.equal(game.getSnapshot().target,null);
    assert.equal(game.toggleSoul(),true);flyTo(game,game.lanterns[0]);assert.equal(game.interact(),true);assert.equal(game.lanterns[0].lit,true);
    game.recall();walkTo(game,190);const before=facts(game);game.interact();
    assert.equal(talks.at(-1).seals,1);assert.equal(talks.at(-1).repeated,true);game.resolveTalk();assert.equal(facts(game),before);
    game.lightSeal(1);game.interact();assert.equal(talks.at(-1).seals,2);game.resolveTalk();
    assert.equal(game.lanterns.filter(lamp=>lamp.lit).length,2);assert.equal(game.state,'playing');assert.equal(game.completed,false);game.destroy();
  }
});

test('soul pulses, borrowing-ring replay and the lost cabinet cannot be intercepted by the new story friend',()=>{
  for(let chapterIndex=0;chapterIndex<6;chapterIndex++){
    const talks=[],{game}=makeGame({chapterIndex,capActivityRecord:completeBase()},{onTalk:event=>talks.push(event)});
    assert.equal(game.toggleSoul(),true);tick(game,.4);assert.equal(game.getSnapshot().target,null);assert.equal(game.getNearbyNPC(),null);
    assert.equal(game.getStoryNPCView().form,'soul');assert.equal(game.getStoryNPCView().near,true);
    assert.deepEqual(game.getStoryNPCView().look,{x:game.soul.x,y:game.soul.y});game.interact();assert.equal(game.state,'playing');assert.equal(talks.length,0);
    game.recall();walkTo(game,330);assert.equal(game.getNearbyNPC(),null);assert.match(game.getNearHint(),/Q/);
    assert.equal(game.interact(),true);assert.equal(game.capActivity.variant,1);assert.equal(game.toggleSoul(),true);tick(game,.2);assert.equal(game.capActivity.started,true);assert.equal(talks.length,0);
    game.recall();walkTo(game,465);assert.equal(game.getSnapshot().target,null);
    if(game.lostCase){assert.equal(game.interact(),true);assert.equal(game.lostCase.opened,true);assert.equal(game.toggleSoul(),true);assert.equal(game.lostCase.isExpanded(),true);}
    assert.equal(talks.length,0);assert.equal(game.state,'playing');game.destroy();
  }
});

test('body proximity is strict on both axes and friends do not change a walking trajectory',()=>{
  const {game}=makeGame({chapterIndex:0});
  for(const [x,y,near] of [[288,560,false],[287.9,560,true],[92,560,false],[92.1,560,true],[190,470,false],[190,470.1,true],[190,650,false],[190,649.9,true]]){
    game.body.x=x;game.body.y=y;assert.equal(Boolean(game.getNearbyNPC()),near,`body ${x},${y}`);
  }
  game.destroy();
  for(let chapterIndex=0;chapterIndex<6;chapterIndex++){
    const a=makeGame({chapterIndex}).game,b=makeGame({chapterIndex}).game;b.level.npcs=[];
    a.setInput({x:1});b.setInput({x:1});tick(a,1.4);tick(b,1.4);
    assert.deepEqual(a.body,b.body);assert.equal(a.time,b.time);assert.equal(a.deaths,b.deaths);assert.equal(a.state,'playing');assert.equal(b.state,'playing');a.destroy();b.destroy();
  }
});

test('without a dialogue callback the current short line is announced without pausing or mutating progression',()=>{
  for(let chapterIndex=0;chapterIndex<6;chapterIndex++){
    const events=[],{game}=makeGame({chapterIndex},{onEvent:event=>events.push(event)}),before=facts(game);
    assert.equal(game.interact(),true);assert.equal(game.state,'playing');assert.equal(game.pendingTalk,null);
    assert.equal(events.at(-1).text,getStoryEncounter(chapterIndex,{seals:0,repeated:false})[0].text);
    assert.equal(events.at(-1).type,'story');assert.equal(game.talked.has(getStoryNPC(chapterIndex).id),true);
    game.interact();assert.equal(events.at(-1).text,getStoryEncounter(chapterIndex,{seals:0,repeated:true})[0].text);
    assert.equal(facts(game),before);game.destroy();
  }
});

test('all ten festival conversations keep their original payload, name, placement and companion start',()=>{
  for(const level of FESTIVAL_LEVELS){
    const talks=[],festival={id:level.festivalId,npc:{id:level.festivalId+'-host',name:'节日朋友'}},{game}=makeGame({festival},{onTalk:event=>talks.push(event)});
    assert.deepEqual(game.level.npcs,level.npcs);assert.equal(game.getStoryNPCView(),null);assert.equal(game.companion.x,180);
    assert.equal(game.getSnapshot().target.name,'节日朋友');assert.equal(game.interact(),true);
    assert.deepEqual(talks[0],{mode:'festival',festivalId:festival.id,npcId:festival.npc.id,repeated:false});assert.equal(game.getNearHint(),'节日朋友正在和你说话。');
    assert.equal(game.resolveTalk(),true);game.interact();assert.deepEqual(talks[1],{mode:'festival',festivalId:festival.id,npcId:festival.npc.id,repeated:true});game.resolveTalk();game.destroy();
  }
});

test('main-character rendering receives isolated poses, freezes with pause and has clear mobile labels and separated cat placement',()=>{
  for(let chapterIndex=0;chapterIndex<6;chapterIndex++)for(const width of [320,390]){
    const {game,labels}=makeGame({chapterIndex},{},{width,height:640}),npc=getStoryNPC(chapterIndex);
    const pose=game.getStoryNPCView();pose.look.x=-999;pose.name='changed outside';assert.notEqual(game.getStoryNPCView().look.x,-999);assert.equal(game.getStoryNPCView().name,npc.name);
    const zone=game.getSceneBackdropView().clearZones.find(zone=>zone.x===190&&zone.y===497&&zone.r===86);assert.ok(zone);
    for(const x of [npc.x-46,npc.x+46])for(const y of [npc.y-134,npc.y+7])assert.ok(Math.hypot(x-zone.x,y-zone.y)<=zone.r,'name and silhouette fit inside their clear zone');
    for(const x of [npc.x-46,npc.x+46,game.body.x-16,game.body.x+16,game.companion.x-28,game.companion.x+28])assert.ok((x-game.camera)*game.scale>=0&&(x-game.camera)*game.scale<=width,'first-screen bodies must stay visible');
    assert.ok(game.companion.x+28<npc.x-46,'the cat and new NPC must not pile up at spawn');
    game.render();assert.ok(labels.some(label=>label.includes(npc.name)),'the correct main-story name must be rendered');
    game.toggleSoul();game.setInput({x:.2,y:-.4});tick(game,.6);game.setInput({x:0,y:0});
    const watching=game.getStoryNPCView();assert.deepEqual(watching.look,{x:game.soul.x,y:game.soul.y});assert.ok(watching.capOpen>0);
    labels.length=0;game.render();assert.ok(!labels.some(label=>label.includes('Q')&&label.includes(npc.name)),'a soul pulse must not be labelled as an available conversation');
    game.pause();const frozen=game.getStoryNPCView(),visualTime=game.visualTime;tick(game,4);game.render();assert.deepEqual(game.getStoryNPCView(),frozen);assert.equal(game.visualTime,visualTime);
    game.setReducedMotion(true);game.render();game.setReducedMotion(false);game.resume();game.render();game.destroy();
  }
});

test('restarting or switching chapters inside a conversation callback cannot leave the old talk pending',()=>{
  let game,first=true;
  ({game}=makeGame({chapterIndex:0},{onTalk:()=>{if(first){first=false;game.start({chapterIndex:3,sound:false});}}}));
  assert.equal(game.interact(),true);assert.equal(game.chapterIndex,3);assert.equal(game.state,'playing');assert.equal(game.pendingTalk,null);assert.equal(game.resolveTalk(),false);assert.equal(game.talked.size,0);
  game.interact();assert.equal(game.pendingTalk,getStoryNPC(3).id);game.restart();assert.equal(game.pendingTalk,null);assert.equal(game.talked.size,0);assert.equal(game.resolveTalk(),false);game.destroy();assert.equal(game.interact(),false);
});
