import test from 'node:test';
import assert from 'node:assert/strict';
import { DreamGame, DREAM_PHYSICS } from '../dist/dream-engine.js';
import { FESTIVAL_LEVELS } from '../dist/dream-festival-levels.js';
import { getStoryEncounter } from '../dist/dream-encounters.js';

const noop=()=>{};
globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function makeGame(options={}){
  const events=[],hud=[],talks=[],puzzles=[];
  const ctx=new Proxy({globalAlpha:1,createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop}),measureText:s=>({width:String(s).length*8})},{get:(o,k)=>k in o?o[k]:noop});
  const game=new DreamGame({getContext:()=>ctx,getBoundingClientRect:()=>({width:1100,height:640})},{onCapEvent:e=>events.push(e),onHud:s=>hud.push(s),onTalk:e=>talks.push(e),onPuzzle:e=>puzzles.push(e)});
  game.start({chapterIndex:1,sound:false,...options});return {game,events,hud,talks,puzzles};
}
const tick=(g,n=1)=>{for(let i=0;i<n;i++)g.update(1/60);};
function walkTo(g,x){
  assert.equal(g.form,'body');
  for(let i=0;i<600;i++){
    const dx=x-g.body.x;if(Math.abs(dx)<1&&Math.abs(g.body.vx)<8){g.setInput({x:0,y:0});tick(g,10);return;}
    g.setInput({x:clamp(dx/40,-1,1),y:0});tick(g);
  }
  assert.fail('A normal walk must reach the greenhouse launch point');
}
function flyTo(g,target,{collect=false}={}){
  for(let i=0;i<420;i++){
    assert.equal(g.form,'soul');
    const dx=target.x-g.soul.x,dy=target.y-g.soul.y;
    if((collect&&target.collected)||(!collect&&Math.hypot(dx,dy)<10&&Math.hypot(g.soul.vx,g.soul.vy)<40)){g.setInput({x:0,y:0});tick(g,5);return;}
    g.setInput({x:clamp(dx/45,-1,1),y:clamp(dy/45,-1,1)});tick(g);
  }
  assert.fail('The ordinary soul controls must reach the authored item');
}
function takeSeed(g){walkTo(g,600);g.toggleSoul();flyTo(g,g.memories[1],{collect:true});assert.equal(g.greenhousePlant.phase,'held');}
function solveNearbyLamp(g,index){
  if(g.form==='body')g.toggleSoul();flyTo(g,g.lanterns[index]);tick(g,30);
  assert.equal(g.pulse(),true);assert.equal(g.state,'paused');assert.equal(g.resolvePuzzle(true),true);assert.equal(g.lanterns[index].lit,true);
}
const memoryEvents=events=>events.filter(e=>e.type==='memory'&&e.index===1);

test('empty and remembered greenhouse scenes use exact ticket, seed and lamp identities without granting this run progress',()=>{
  for(const hasTicket of [false,true]){
    const {game}=makeGame({firstTicketCollected:hasTicket});
    assert.equal(game.capScene.greenhouse.pot,hasTicket?'ticket':'clay');assert.equal(game.greenhousePlant.stage,0);
    assert.equal(game.greenhousePlant.phase,'missing');assert.equal(game.getSnapshot().memories,0);game.render();game.destroy();
  }
  const {game,events}=makeGame({firstTicketCollected:true,greenhouseRecord:{memories:[1],seals:[0,1]}});
  assert.equal(game.greenhousePlant.phase,'planted');assert.equal(game.greenhousePlant.stage,3);
  assert.deepEqual(game.capScene.greenhouse,{pot:'ticket',stage:3,fromStage:3,progress:1});
  assert.equal(game.getSnapshot().memories,0);assert.equal(game.getSnapshot().seals,0);assert.equal(events.length,0);
  game.toggleSoul();tick(game,60);game.render();assert.equal(memoryEvents(events).length,0);game.destroy();
});

test('real walking and flight find the seed at the authored old boot and carry it home only on arrival',()=>{
  const {game,events}=makeGame({firstTicketCollected:true});takeSeed(game);
  assert.equal(game.memories[1].collected,true);assert.equal(game.getSnapshot().memories,1);assert.equal(memoryEvents(events).length,1);
  assert.equal(game.greenhousePlant.stage,0);assert.equal(game.thoughtFlights.length,0);
  assert.equal(game.recall(),true);tick(game,28);assert.equal(game.greenhousePlant.phase,'returning');assert.equal(game.greenhousePlant.stage,0);
  tick(game);assert.equal(game.greenhousePlant.phase,'planted');assert.equal(game.greenhousePlant.stage,1);
  tick(game,40);const age=game.greenhousePlant.growthAge;tick(game,120);assert.equal(game.greenhousePlant.growthAge,age,'The closed lid saves the growth animation for the next look');
  game.toggleSoul();tick(game,140);assert.equal(game.capScene.greenhouse.progress,1);game.render();
  assert.equal(memoryEvents(events).length,1);game.destroy();
});

test('a successful first-lamp answer before collection grows leaves only after the seed actually reaches the pot',()=>{
  const {game}=makeGame();walkTo(game,600);solveNearbyLamp(game,0);
  assert.equal(game.greenhousePlant.stage,0);flyTo(game,game.memories[1],{collect:true});
  assert.equal(game.greenhousePlant.phase,'held');assert.equal(game.greenhousePlant.stage,0);
  game.recall();tick(game,29);assert.equal(game.greenhousePlant.stage,2);assert.deepEqual(game.greenhousePlant.knownSeals,[0]);game.destroy();
});

test('wrong or cancelled answers cannot grow a planted seed, and two accepted lamp answers open the flower',()=>{
  const {game,puzzles}=makeGame();takeSeed(game);game.recall();tick(game,60);
  game.toggleSoul();flyTo(game,game.lanterns[0]);game.pulse();assert.equal(puzzles.at(-1).sealIndex,0);
  game.resolvePuzzle(false);assert.equal(game.greenhousePlant.stage,1);assert.equal(game.lanterns[0].lit,false);
  tick(game,30);game.pulse();game.resolvePuzzle(true);assert.equal(game.greenhousePlant.stage,2);
  game.recall();tick(game,60);
  // Fixture at the existing right checkpoint isolates the second answer from
  // the mushroom/hazard traversal already covered by the base engine suite.
  Object.assign(game.body,{x:1850,y:560,vx:0,vy:0,grounded:true});solveNearbyLamp(game,1);
  assert.equal(game.greenhousePlant.stage,3);assert.equal(game.getSnapshot().seals,2);
  tick(game,100);assert.equal(game.capScene.greenhouse.progress,1);assert.equal(game.lightSeal(1),false);game.destroy();
});

test('both lamps may be lit before finding the optional seed, without revealing a flower early',()=>{
  const {game}=makeGame();walkTo(game,600);solveNearbyLamp(game,0);game.recall();tick(game,60);
  Object.assign(game.body,{x:1850,y:560,vx:0,vy:0,grounded:true});solveNearbyLamp(game,1);game.recall();tick(game,60);
  assert.equal(game.greenhousePlant.stage,0);assert.equal(game.exitReady(),true,'The optional seed is not an exit requirement');
  Object.assign(game.body,{x:600,y:560,vx:0,vy:0,grounded:true});game.toggleSoul();flyTo(game,game.memories[1],{collect:true});
  assert.equal(game.greenhousePlant.stage,0);game.recall();tick(game,29);assert.equal(game.greenhousePlant.stage,3);game.destroy();
});

test('the ordinary mushroom jump can collect and immediately plant the seed with the body',()=>{
  const {game,events}=makeGame();walkTo(game,700);game.setInput({x:1,y:0});
  for(let i=0;i<180&&!game.memories[1].collected;i++)tick(game);
  game.setInput({x:0,y:0});
  assert.equal(game.memories[1].collected,true,'The authored mushroom launches the body through the seed');
  assert.equal(game.form,'body');assert.equal(game.greenhousePlant.phase,'planted');assert.equal(game.greenhousePlant.stage,1);
  assert.equal(memoryEvents(events).length,1);game.destroy();
});

test('pause freezes a carried seed, its return and its growth, while reduced motion settles the actual arrival and HUD',()=>{
  const {game,hud}=makeGame();takeSeed(game);game.pause();const held=structuredClone(game.getSnapshot().greenhousePlant);tick(game,150);
  assert.deepEqual(game.getSnapshot().greenhousePlant,held);assert.equal(game.recall(),false);
  game.resume();game.recall();tick(game,12);game.pause();const plant=structuredClone(game.greenhousePlant),soul=game.getSoulPresentation();tick(game,150);
  assert.deepEqual(game.greenhousePlant,plant);assert.deepEqual(game.getSoulPresentation(),soul);
  game.setReducedMotion(true);assert.equal(game.greenhousePlant.phase,'planted');assert.equal(game.capScene.greenhouse.progress,1);
  assert.equal(hud.at(-1).greenhousePlant.phase,'planted');assert.equal(game.state,'paused');game.setReducedMotion(false);game.resume();game.toggleSoul();tick(game,60);
  assert.equal(game.capScene.greenhouse.progress,1);game.destroy();
});

test('rapid open-return alternation keeps one seed and one collection event',()=>{
  const {game,events}=makeGame();takeSeed(game);
  for(let i=0;i<4;i++){game.recall();tick(game,8);assert.equal(game.greenhousePlant.phase,'returning');game.toggleSoul();assert.equal(game.greenhousePlant.phase,'held');tick(game,45);}
  game.recall();tick(game,60);assert.equal(game.greenhousePlant.phase,'planted');assert.equal(memoryEvents(events).length,1);
  assert.equal(game.getSnapshot().memories,1);game.destroy();
});

test('energy recall, a fall and a restart preserve discovered seed presentation without duplicating the new run score',()=>{
  for(const reason of ['energy','fall']){
    const {game,events}=makeGame();takeSeed(game);
    if(reason==='energy'){game.energy=.001;tick(game,60);}else{game.body.y=730;tick(game);}
    assert.equal(game.greenhousePlant.phase,'planted');assert.equal(game.greenhousePlant.stage,1);assert.equal(memoryEvents(events).length,1);
    game.restart();assert.equal(game.greenhousePlant.phase,'planted');assert.equal(game.greenhousePlant.newlyCollected,false);assert.equal(game.getSnapshot().memories,0);
    assert.equal(game.getSnapshot().seals,0);game.destroy();
  }
});

test('stored growth is a display only, snapshots are isolated and other chapters or festivals cannot inherit the seed',()=>{
  const {game}=makeGame({greenhouseRecord:{memories:[1],seals:[0,1]}});
  const snapshot=game.getSnapshot();snapshot.greenhousePlant.stage=0;snapshot.greenhousePlant.knownSeals.length=0;snapshot.journey.plantStage=0;
  assert.equal(game.greenhousePlant.stage,3);assert.deepEqual(game.greenhousePlant.knownSeals,[0,1]);game.destroy();
  for(const option of [0,2,3,4,5].map(chapterIndex=>({chapterIndex})).concat(FESTIVAL_LEVELS.map(level=>({festival:{id:level.festivalId}})))){
    const {game:other}=makeGame({...option,firstTicketCollected:true,greenhouseRecord:{memories:[1],seals:[0,1]}});
    assert.equal(other.greenhousePlant,null);assert.equal(other.capScene.greenhouse,undefined);assert.equal(other.getSnapshot().greenhousePlant,null);other.destroy();
  }
});

test('the station friend follows the real ticket return and welcomes it exactly once',()=>{
  const {game}=makeGame({chapterIndex:0});game.toggleSoul();flyTo(game,game.memories[0],{collect:true});tick(game,20);
  assert.equal(game.getStoryNPCView().stationTicket.greeting,'notice');assert.ok(game.getStoryNPCView().stationTicket.progress>0,'The first notice advances while the ticket is held');game.recall();tick(game,10);
  const visible=game.getSoulPresentation(),view=game.getStoryNPCView();assert.deepEqual(view.look,{x:visible.x,y:visible.y});
  tick(game,19);assert.equal(game.stationGreeting.greeting,'welcome');game.pause();const greeting=structuredClone(game.stationGreeting);tick(game,120);assert.deepEqual(game.stationGreeting,greeting);
  game.resume();tick(game,100);assert.equal(game.stationGreeting.greeting,'settled');game.toggleSoul();tick(game,50);game.recall();tick(game,50);assert.equal(game.stationGreeting.greeting,'settled');game.destroy();
  const saved=makeGame({chapterIndex:0,firstTicketCollected:true}).game;assert.equal(saved.stationGreeting.greeting,'settled');saved.destroy();
});

test('the two new NPC reactions get their first full dialogue after actual milestones and repeat only the same stage',()=>{
  const {game,talks}=makeGame({chapterIndex:0});game.interact();game.resolveTalk();game.interact();assert.equal(talks.at(-1).repeated,true);game.resolveTalk();
  game.toggleSoul();flyTo(game,game.memories[0],{collect:true});game.recall();tick(game,60);game.interact();
  assert.equal(talks.at(-1).journey.hasTicket,true);assert.equal(talks.at(-1).repeated,false);game.resolveTalk();game.interact();assert.equal(talks.at(-1).repeated,true);game.resolveTalk();game.destroy();
});

test('poetry prompts, rendered affordances and the target all use the exact executable pulse boundary',()=>{
  for(const distance of [DREAM_PHYSICS.pulseRadius+.01,115,DREAM_PHYSICS.pulseRadius,DREAM_PHYSICS.pulseRadius-.01]){
    const {game,puzzles}=makeGame({chapterIndex:0});Object.assign(game.body,{x:410,y:560});game.toggleSoul();
    const lamp=game.lanterns[0];Object.assign(game.soul,{x:lamp.x-distance,y:lamp.y,vx:0,vy:0});
    const available=distance<=DREAM_PHYSICS.pulseRadius;
    assert.equal(game.getSnapshot().target?.kind==='lamp',available);
    assert.equal(game.getNearHint()==='空格 / Q：与诗灯共鸣',available);
    assert.equal(game.pulse(),available);assert.equal(puzzles.length,available?1:0);
    if(available){game.resolvePuzzle(true);assert.equal(game.getSnapshot().target,null);assert.doesNotMatch(game.getNearHint(),/^空格 \/ Q：与诗灯共鸣$/);}
    game.destroy();
  }
});


test('talking during the actual ticket return describes its journey without claiming it is still uncollected',()=>{
  const {game,talks}=makeGame({chapterIndex:0});game.toggleSoul();flyTo(game,game.memories[0],{collect:true});
  assert.equal(game.getJourneyContext().ticketPhase,'held');game.recall();tick(game,10);game.interact();
  const payload=talks.at(-1);assert.equal(game.state,'paused');assert.equal(payload.journey.ticketPhase,'returning');assert.equal(payload.journey.hasTicket,false);
  const text=getStoryEncounter(0,payload).map(line=>line.text).join('');assert.match(text,/归位|回家|落定|回来/);assert.doesNotMatch(text,/还在站台上方/);
  const returnAge=game.cap.age;tick(game,60);assert.equal(game.cap.age,returnAge);game.resolveTalk();tick(game,50);assert.equal(game.getJourneyContext().ticketPhase,'stowed');game.destroy();
});

test('a growth callback may start or destroy a run without letting the old return overwrite its successor',()=>{
  for(const reducedMotion of [false,true])for(const action of ['start','destroy']){
    const {game}=makeGame();takeSeed(game);if(reducedMotion)game.setReducedMotion(true);
    let calls=0;game.callbacks.onEvent=event=>{if(event.type!=='growth')return;calls++;if(action==='start')game.start({chapterIndex:0,sound:false});else game.destroy();};
    game.recall();if(!reducedMotion)tick(game,29);
    assert.equal(calls,1);assert.equal(game.cap.phase,'closed');assert.equal(game.capOpen,0);
    if(action==='start'){
      assert.equal(game.chapterIndex,0);assert.equal(game.time,0);assert.equal(game.greenhousePlant,null);assert.equal(game.options.greenhouseRecord,undefined);
      assert.equal(game.getSnapshot().memories,0);assert.equal(game.body.x,105);assert.equal(game.firstTicket.phase,'missing');game.destroy();
    }else assert.equal(game.destroyed,true);
  }
});
