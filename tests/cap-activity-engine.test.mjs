import test from 'node:test';
import assert from 'node:assert/strict';
import { DreamGame, DREAM_PHYSICS } from '../dist/dream-engine.js';
import { CAP_ACTIVITIES, getCapActivity } from '../dist/dream-cap-activities.js';
import { DreamCapActivity, createCapActivityLayout, normalizeCapActivityRecord, CAP_ACTIVITY_VARIANTS } from '../dist/dream-cap-activity-engine.js';

const noop=()=>{};
globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
globalThis.requestAnimationFrame=()=>1;
globalThis.cancelAnimationFrame=noop;
const context=new Proxy({globalAlpha:1,createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop}),measureText:text=>({width:String(text).length*8})},{get:(target,key)=>key in target?target[key]:noop});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function makeGame(options={},callbacks={}){
  const game=new DreamGame({getContext:()=>context,getBoundingClientRect:()=>({width:1100,height:620})},callbacks);
  game.start({chapterIndex:0,sound:false,...options});return game;
}
const tick=(game,seconds)=>{for(let i=0;i<Math.ceil(seconds*60);i++)game.update(1/60);};

function walkToRing(game){
  const target=game.capActivity.layout.anchor;
  for(let i=0;i<8*60;i++){
    const dx=target.x-game.body.x;
    if(Math.abs(dx)<1&&Math.abs(game.body.vx)<10){game.setInput({x:0,y:0});tick(game,.12);assert.equal(game.capActivity.bodyInRange(game.body),true);return;}
    game.setInput({x:clamp(dx/42,-1,1),y:0});game.update(1/60);
  }
  assert.fail('the safe ring was not reachable by walking');
}

function flyTo(game,point){
  for(let i=0;i<6*60;i++){
    assert.equal(game.form,'soul');
    const dx=point.x-game.soul.x,dy=point.y-game.soul.y;
    if(Math.hypot(dx,dy)<15&&Math.hypot(game.soul.vx,game.soul.vy)<55){game.setInput({x:0,y:0});return;}
    game.setInput({x:clamp(dx/38,-1,1),y:clamp(dy/38,-1,1)});game.update(1/60);
  }
  assert.fail('a bell was unreachable with ordinary soul input');
}

// This solver uses the same E, movement and pulse entry points as keyboard/touch.
// It never assigns progress, switch direction, traveler position or spirit coordinates.
function solveByInput(game,{stopAfter=null,limit=120}={}){
  if(game.form==='body')assert.equal(game.toggleSoul(),true);
  for(let i=0;i<limit*60;i++){
    const activity=game.capActivity;
    if(activity.phase==='complete'||(stopAfter!==null&&activity.delivered.size>=stopAfter)){game.setInput({x:0,y:0});return;}
    if(game.form==='body'){
      game.setInput({x:0,y:0});
      if(game.energy>=98)assert.equal(game.toggleSoul(),true);
      else game.update(1/60);
      continue;
    }
    if(game.energy<8){game.recall();continue;}
    const target=activity.targetIndex,wanted={a:target===0?0:1,b:target===1?0:1};
    const id=activity.switches.a!==wanted.a?'a':target!==0&&activity.switches.b!==wanted.b?'b':null;
    if(id){
      const bell=activity.nodes[id],dx=bell.x-game.soul.x,dy=bell.y-game.soul.y;
      if(Math.hypot(dx,dy)<24){game.setInput({x:0,y:0});if(game.pulseCooldown<=0){assert.equal(game.interact(),true);assert.equal(activity.switches[id],wanted[id]);}}
      else game.setInput({x:clamp(dx/42,-1,1),y:clamp(dy/42,-1,1)});
    }else game.setInput({x:0,y:0});
    game.update(1/60);
  }
  assert.fail('routing did not complete through ordinary inputs');
}

test('all sixteen scenes have a reachable safe ring and complete through real E, flying and pulse inputs',()=>{
  assert.equal(CAP_ACTIVITIES.length,16);
  for(const config of CAP_ACTIVITIES){
    const events=[],options=config.festivalId?{festival:{id:config.festivalId}}:{chapterIndex:config.chapterIndex};
    const game=makeGame(options,{onCapActivity:event=>events.push(event)}),level=game.level;
    const geometry=JSON.stringify({platforms:level.platforms,barriers:level.barriers,pads:level.pads,winds:level.winds,exit:level.exit});
    walkToRing(game);assert.equal(game.capActivity.getSnapshot().nearRing,true);assert.match(game.getNearHint(),/E/);
    const anchor=game.capActivity.layout.anchor;
    assert.ok(level.platforms.some(p=>p.y===anchor.y&&anchor.x-anchor.r>p.x&&anchor.x+anchor.r<p.x+p.w));
    assert.ok((level.npcs||[]).every(npc=>Math.abs(npc.x-anchor.x)-anchor.r>98),'the ring must not steal an NPC Q');
    for(const id of ['a','b']){
      const bell=game.capActivity.nodes[id];
      assert.ok(Math.hypot(bell.x-anchor.x,bell.y-(anchor.y-56))<DREAM_PHYSICS.tether-80);
      assert.ok(game.lanterns.every(lamp=>Math.hypot(lamp.x-bell.x,lamp.y-bell.y)>DREAM_PHYSICS.pulseRadius+40));
      assert.ok(game.memories.every(memory=>Math.hypot(memory.x-bell.x,memory.y-bell.y)>60));
    }
    solveByInput(game);assert.equal(game.capActivity.phase,'complete',config.id);game.render();
    assert.deepEqual(events.filter(e=>e.type==='step').map(e=>e.stepIndex),[0,1,2]);assert.equal(events.filter(e=>e.type==='start').length,1);assert.equal(events.filter(e=>e.type==='complete').length,1);
    assert.ok(events.every(e=>e.sceneId===config.id&&e.variant===0&&e.chapterIndex===game.chapterIndex&&e.festivalId===game.festivalId&&e.mode===game.mode));
    assert.equal(game.state,'playing');assert.equal(game.getSnapshot().seals,0);assert.equal(game.canExit(),false);
    assert.equal(JSON.stringify({platforms:level.platforms,barriers:level.barriers,pads:level.pads,winds:level.winds,exit:level.exit}),geometry);
    game.destroy();
  }
});

test('a wrong route returns its traveler without erasing progress or adding a gameplay penalty',()=>{
  const events=[];const game=makeGame({}, {onCapActivity:event=>events.push(event)});walkToRing(game);game.toggleSoul();
  const before={time:game.time,energy:game.energy,deaths:game.deaths};
  for(let i=0;i<12*60&&!events.some(e=>e.type==='wrong');i++)game.update(1/60);
  assert.ok(events.some(e=>e.type==='wrong'));assert.equal(game.capActivity.delivered.size,0);assert.equal(game.capActivity.targetIndex,0);assert.equal(game.deaths,before.deaths);
  assert.ok(Math.abs(game.energy-(before.energy-(game.time-before.time)*DREAM_PHYSICS.energyDrain))<.001);
  solveByInput(game);assert.equal(game.capActivity.phase,'complete');assert.equal(events.filter(e=>e.type==='step').length,3);assert.equal(events.filter(e=>e.type==='complete').length,1);
  const count=events.length;tick(game,8);game.render();assert.equal(events.length,count,'completion must wait for an explicit replay');game.destroy();
});

test('Q explicitly cycles three fixed orders and complete never automatically starts a new variant',()=>{
  const events=[];const game=makeGame({}, {onCapActivity:event=>events.push(event)});walkToRing(game);
  for(let variant=0;variant<3;variant++){
    assert.equal(game.capActivity.variant,variant);solveByInput(game);
    assert.deepEqual(events.filter(e=>e.variant===variant&&e.type==='step').map(e=>e.stepIndex),[...CAP_ACTIVITY_VARIANTS[variant]]);
    const completed=events.filter(e=>e.type==='complete'&&e.variant===variant);assert.equal(completed.length,1);assert.equal(completed[0].resumed,false);
    const before=events.length;tick(game,.6);assert.equal(events.length,before);assert.equal(game.capActivity.variant,variant);
    if(game.form==='soul')game.recall();tick(game,6);assert.equal(game.interact(),true);assert.equal(game.capActivity.variant,(variant+1)%3);assert.equal(game.capActivity.phase,'idle');assert.equal(game.capActivity.delivered.size,0);assert.equal(events.length,before);
  }
  assert.equal(new Set(events.filter(e=>e.type==='complete').map(e=>e.attemptId)).size,3);game.destroy();
});

test('manual pause and E return freeze traveler position and activity time, then continue the same attempt',()=>{
  const events=[];const game=makeGame({}, {onCapActivity:event=>events.push(event)});walkToRing(game);game.toggleSoul();tick(game,1.3);game.pause();
  const paused=structuredClone(game.capActivity.traveler),elapsed=game.capActivity.activeSeconds,attempt=game.capActivity.attemptId;
  tick(game,3);game.render();assert.deepEqual(game.capActivity.traveler,paused);assert.equal(game.capActivity.activeSeconds,elapsed);assert.equal(game.capActivity.phase,'suspended');
  game.resume();tick(game,.1);assert.notDeepEqual(game.capActivity.traveler,paused);game.recall();
  const recalled=structuredClone(game.capActivity.traveler),restingTime=game.capActivity.activeSeconds;tick(game,3);assert.deepEqual(game.capActivity.traveler,recalled);assert.equal(game.capActivity.activeSeconds,restingTime);
  game.toggleSoul();tick(game,.1);assert.equal(game.capActivity.attemptId,attempt);assert.equal(events.filter(e=>e.type==='start').length,1);assert.equal(game.capActivity.phase,'active');game.destroy();
});

test('energy exhaustion suspends the route and recharging restores control without a second start event',()=>{
  const events=[];const game=makeGame({}, {onCapActivity:event=>events.push(event)});walkToRing(game);game.toggleSoul();tick(game,1);game.energy=.001;game.update(1/60);
  assert.equal(game.form,'body');assert.equal(game.capActivity.phase,'suspended');const traveler=structuredClone(game.capActivity.traveler),elapsed=game.capActivity.activeSeconds;
  tick(game,6);assert.deepEqual(game.capActivity.traveler,traveler);assert.equal(game.capActivity.activeSeconds,elapsed);assert.equal(game.energy,100);
  solveByInput(game);assert.equal(game.capActivity.phase,'complete');assert.equal(events.filter(e=>e.type==='start').length,1);game.destroy();
});

test('falling preserves delivered pieces, restarting makes a full attempt, and destruction removes the old route',()=>{
  const events=[];const game=makeGame({}, {onCapActivity:event=>events.push(event)});walkToRing(game);solveByInput(game,{stopAfter:1});const delivered=[...game.capActivity.delivered];
  game.body.y=730;game.update(1/60);assert.equal(game.form,'body');assert.deepEqual([...game.capActivity.delivered],delivered);assert.equal(game.capActivity.getView().traveler.visible,false);assert.equal(game.capActivity.traveler.state,'parked');
  walkToRing(game);solveByInput(game);assert.equal(game.capActivity.phase,'complete');const old=game.capActivity;
  game.restart();assert.equal(old.getView(),null);assert.equal(game.capActivity.delivered.size,0);assert.equal(game.capActivity.resumed,false);assert.equal(game.capActivity.phase,'idle');
  walkToRing(game);game.toggleSoul();tick(game,1);const abandoned=game.capActivity,count=events.length;game.destroy();assert.equal(abandoned.getView(),null);assert.equal(abandoned.traveler,null);tick(game,2);assert.equal(events.length,count);
});

test('leaving the ring folds the route without clearing success, and the original exit remains independent',()=>{
  const game=makeGame();walkToRing(game);solveByInput(game,{stopAfter:1});game.recall();game.setInput({x:1});tick(game,1);game.setInput({x:0});
  assert.equal(game.capActivity.phase,'suspended');assert.equal(game.capActivity.inRange,false);assert.equal(game.capActivity.delivered.size,1);
  game.lightSeal(0);game.lightSeal(1);game.body.x=game.level.exit.x;game.body.y=game.level.exit.y;game.update(1/60);
  assert.equal(game.state,'complete');assert.equal(game.capActivity.getView().traveler.visible,false);assert.equal(game.capActivity.delivered.size,1);game.destroy();
});

test('partial base progress resumes exact remaining targets, marks partial scores, and Q starts a full new route',()=>{
  const events=[];const game=makeGame({capActivityRecord:{completedSteps:[0,2],completedVariants:[],best:{}}},{onCapActivity:event=>events.push(event)});
  assert.deepEqual([...game.capActivity.delivered],[0,2]);assert.equal(game.capActivity.targetIndex,1);assert.equal(game.capActivity.resumed,true);walkToRing(game);solveByInput(game);
  assert.deepEqual(events.filter(e=>e.type==='step').map(e=>e.stepIndex),[1]);const complete=events.find(e=>e.type==='complete');assert.equal(complete.resumed,true);assert.deepEqual(complete.completedSteps,[0,1,2]);
  game.recall();tick(game,6);game.interact();assert.equal(game.capActivity.variant,1);assert.equal(game.capActivity.resumed,false);assert.equal(game.capActivity.delivered.size,0);game.destroy();
});

test('finished saves do not replay or award anything until circle Q is pressed',()=>{
  const events=[];const game=makeGame({capActivityRecord:{completedSteps:[0,1,2],completedVariants:[0],best:{0:{switches:4,seconds:19}}}},{onCapActivity:event=>events.push(event)});
  assert.equal(game.capActivity.phase,'complete');walkToRing(game);game.toggleSoul();tick(game,2);assert.equal(events.length,0);assert.equal(game.capActivity.phase,'complete');game.recall();assert.equal(game.interact(),true);assert.equal(game.capActivity.variant,1);assert.equal(events.length,0);game.toggleSoul();assert.equal(events.filter(e=>e.type==='start').length,1);game.destroy();
});

test('validating activity records bounds input and cannot combine unknown targets or variants',()=>{
  const record=normalizeCapActivityRecord({completedSteps:[0,'1',2,2,-1,3,Infinity],completedVariants:[8,2,2],best:{0:{switches:NaN,seconds:2},1:{switches:Infinity,seconds:2},2:{switches:4,seconds:23}}});
  assert.deepEqual(record.completedSteps,[0,2]);assert.deepEqual(record.completedVariants,[2]);assert.deepEqual(record.best,{2:{switches:4,seconds:23}});
  const full=normalizeCapActivityRecord({completedSteps:[],completedVariants:[0],best:{}});assert.deepEqual(full.completedSteps,[0,1,2]);
  assert.deepEqual(normalizeCapActivityRecord(null),{completedSteps:[],completedVariants:[],best:{},pending:null});
});

test('only a nearby highlighted bell can turn, and pulse cooldown prevents double toggles',()=>{
  const game=makeGame();walkToRing(game);game.toggleSoul();assert.equal(game.capActivity.pulse({x:0,y:0}),false);flyTo(game,game.capActivity.nodes.a);
  assert.equal(game.capActivity.getSnapshot().nearbySwitchId,'a');assert.match(game.getNearHint(),/导向铃 A/);const before=game.capActivity.switches.a;
  assert.equal(game.pulse(),true);assert.equal(game.capActivity.switches.a,1-before);assert.equal(game.pulse(),false);assert.equal(game.capActivity.switches.a,1-before);tick(game,.5);assert.equal(game.pulse(),true);assert.equal(game.capActivity.switches.a,before);game.destroy();
});

test('existing lanterns, hazard resonance, and NPC Q always take precedence over optional activity actions',()=>{
  let asked=0;const game=makeGame({}, {onPuzzle:()=>asked++});walkToRing(game);game.toggleSoul();flyTo(game,game.capActivity.nodes.a);
  Object.assign(game.lanterns[0],{x:game.soul.x,y:game.soul.y});const before=game.capActivity.switches.a;game.pulse();assert.equal(asked,1);assert.equal(game.state,'paused');assert.equal(game.capActivity.switches.a,before);const stopped=structuredClone(game.capActivity.traveler);tick(game,2);assert.deepEqual(game.capActivity.traveler,stopped);
  game.resolvePuzzle(false);game.lanterns[0].x=900;tick(game,.5);game.hazards.push({kind:'drifter',x:game.soul.x,y:game.soul.y,px:game.soul.x,py:game.soul.y,r:10,range:0,speed:0,clock:0,frozen:0,hitCooldown:0});game.pulse();assert.equal(game.hazards[0].frozen,4.5);assert.equal(game.capActivity.switches.a,before);game.destroy();
  let talks=0;const festival=makeGame({festival:{id:'halloween'},capActivityRecord:{completedSteps:[0,1,2]}},{onTalk:()=>talks++});walkToRing(festival);festival.level.npcs[0].x=festival.body.x;assert.equal(festival.interact(),true);assert.equal(talks,1);assert.equal(festival.capActivity.variant,0);assert.equal(festival.state,'paused');festival.destroy();
});

test('the discovery radius never replaces a real copper-plate hint outside the borrowing ring',()=>{
  for(const options of [{chapterIndex:0},{chapterIndex:5},{festival:{id:'halloween'}}]){
    const game=makeGame(options),plate=game.level.plates[0];game.body.x=plate.x+plate.w/2;game.update(1/60);
    assert.equal(game.capActivity.getSnapshot().nearRing,true);assert.equal(game.capActivity.bodyInRange(game.body),false);assert.equal(game.plateState.get(plate.id),true);
    assert.match(game.getNearHint(),/踏板压住了/);
    game.body.x=330;game.update(1/60);assert.equal(game.capActivity.bodyInRange(game.body),true);assert.match(game.getNearHint(),/小景借出来/);game.destroy();
  }
});

test('activity success is committed before callbacks and successful events are idempotent',()=>{
  const events=[];let game;game=makeGame({}, {onCapActivity:event=>{events.push(event);if(event.type==='step')assert.ok(game.capActivity.delivered.has(event.stepIndex));if(event.type==='complete')assert.equal(game.capActivity.phase,'complete');}});
  walkToRing(game);solveByInput(game);const count=events.length;for(let i=0;i<50;i++){game.emitHud();game.capActivity.getView();game.render();}tick(game,1);assert.equal(events.length,count);assert.equal(events.filter(e=>e.type==='step').length,3);assert.equal(events.filter(e=>e.type==='complete').length,1);assert.equal(new Set(events.map(e=>e.attemptId)).size,1);game.destroy();
});

test('reduced motion retains the same routes and input-solvable outcomes for all sixteen motifs',()=>{
  for(const config of CAP_ACTIVITIES){
    const game=makeGame({...(config.festivalId?{festival:{id:config.festivalId}}:{chapterIndex:config.chapterIndex}),reducedMotion:true});walkToRing(game);solveByInput(game);assert.equal(game.capActivity.phase,'complete');assert.equal(game.cap.phase,'open');game.render();game.destroy();
  }
});

test('the shared visual view is finite, detached from mutable route state, and stays before the first veil',()=>{
  const activity=new DreamCapActivity(getCapActivity({chapterIndex:0}));
  const context={state:'playing',body:{x:330,y:560,grounded:true},soul:{x:245,y:355},form:'soul'};activity.refresh(context);
  const view=activity.getView();assert.equal(view.targetIndex,0);assert.equal(view.bells,view.switches);assert.equal(view.targets,view.destinations);assert.equal(view.anchor.inRange,true);
  for(const route of view.routes)for(const p of route.points){assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));assert.ok(p.x<500);assert.ok(p.y>0&&p.y<560);}
  view.routes[0].points[0].x=9999;assert.notEqual(activity.getView().routes[0].points[0].x,9999);
  for(let i=0;i<10000;i++)activity.update(i%3===0?Infinity:1/60,context);
  for(const n of [activity.activeSeconds,activity.traveler.x,activity.traveler.y,activity.traveler.angle])assert.ok(Number.isFinite(n));assert.ok(activity.switchCount<=99999);activity.destroy();assert.equal(activity.getView(),null);
  assert.deepEqual(createCapActivityLayout().anchor,{x:330,y:560,r:24});
});

test('after a reload Q chooses an unfinished route, and same-instance completions update that choice',()=>{
  const game=makeGame({capActivityRecord:{completedSteps:[0,1,2],completedVariants:[0,1],best:{},pending:null}});
  walkToRing(game);assert.equal(game.capActivity.phase,'complete');assert.equal(game.interact(),true);assert.equal(game.capActivity.variant,2);
  solveByInput(game);assert.deepEqual(game.capActivity.record.completedVariants,[0,1,2]);assert.equal(game.capActivity.record.pending,null);
  game.recall();tick(game,6);game.interact();assert.equal(game.capActivity.variant,0,'all finished routes should now cycle from the current route');
  solveByInput(game);game.recall();tick(game,6);game.interact();assert.equal(game.capActivity.variant,1);game.destroy();
});

test('pending replay routes survive reload independently of the fully completed base record',()=>{
  for(const [variant,delivered,expected] of [[1,[1],[2,0]],[2,[0,2],[1]]]){
    const events=[],attemptId='saved-route-'+variant,revision='revision-'+variant;
    const game=makeGame({capActivityRevision:revision,capActivityRecord:{completedSteps:[0,1,2],completedVariants:[0,1],best:{},pending:{variant,completedSteps:delivered,attemptId}}},{onCapActivity:event=>events.push(event)});
    assert.equal(game.capActivity.variant,variant);assert.deepEqual([...game.capActivity.delivered],delivered);assert.equal(game.capActivity.resumed,true);assert.equal(game.capActivity.attemptId,attemptId);assert.equal(game.capActivity.phase,'idle');
    walkToRing(game);solveByInput(game);assert.deepEqual(events.filter(e=>e.type==='step').map(e=>e.stepIndex),expected);assert.ok(events.every(e=>e.variant===variant&&e.attemptId===attemptId&&e.revision===revision&&e.resumed===true));
    assert.equal(events.filter(e=>e.type==='complete').length,1);assert.equal(game.capActivity.record.pending,null);assert.ok(game.capActivity.record.completedVariants.includes(variant));game.destroy();
  }
});

test('a pending route with no delivered targets remains a full scoring attempt',()=>{
  const events=[];const game=makeGame({capActivityRevision:'fresh-import',capActivityRecord:{completedSteps:[0,1,2],completedVariants:[0],best:{},pending:{variant:2,completedSteps:[],attemptId:'saved-before-first-arrival'}}},{onCapActivity:event=>events.push(event)});
  assert.equal(game.capActivity.variant,2);assert.equal(game.capActivity.resumed,false);assert.equal(game.capActivity.delivered.size,0);
  walkToRing(game);solveByInput(game);assert.deepEqual(events.filter(e=>e.type==='step').map(e=>e.stepIndex),[2,0,1]);assert.ok(events.every(e=>e.resumed===false));assert.ok(events.every(e=>e.attemptId==='saved-before-first-arrival'));game.destroy();
});

test('a saved final step repairs its missing completion only after installation and only once',()=>{
  const events=[],record={completedSteps:[0,1,2],completedVariants:[],best:{},pending:{variant:0,completedSteps:[0,1,2],attemptId:'saved-last-step'}};
  assert.deepEqual(normalizeCapActivityRecord(record).completedVariants,[],'three steps alone are not a recorded completion');
  const activity=new DreamCapActivity(getCapActivity({chapterIndex:0}),{record,revision:'repair-revision',onEvent:event=>{events.push(event);activity.refresh(playing);}});
  const playing={state:'playing',body:{x:105,y:560,grounded:true},soul:{x:105,y:477},form:'body'};
  assert.equal(events.length,0,'constructors must not call back before their owner installs the instance');activity.refresh({...playing,state:'paused'});assert.equal(events.length,0);
  activity.refresh(playing);assert.equal(events.length,1);assert.equal(events[0].type,'complete');assert.equal(events[0].resumed,true);assert.equal(events[0].attemptId,'saved-last-step');assert.equal(events[0].revision,'repair-revision');assert.deepEqual(activity.record.completedVariants,[0]);assert.equal(activity.record.pending,null);
  for(let i=0;i<10;i++){activity.refresh(playing);activity.update(1/60,playing);}assert.equal(events.length,1);activity.destroy();
});

test('activity-record replacement preserves every main-game state and binds only the new revision',()=>{
  const events=[];const game=makeGame({chapterIndex:3,capActivityRevision:'before-import'},{onCapActivity:event=>events.push(event)});walkToRing(game);game.toggleSoul();tick(game,.9);game.lightSeal(0);game.memories[0].collected=true;game.energy=47;
  const previous=game.capActivity,references={body:game.body,soul:game.soul,level:game.level,lanterns:game.lanterns,memories:game.memories,hazards:game.hazards,movers:game.movers,particles:game.particles};
  const state=structuredClone({body:game.body,soul:game.soul,lanterns:game.lanterns,memories:game.memories,energy:game.energy,time:game.time,state:game.state,form:game.form,cap:game.cap,camera:game.camera,deaths:game.deaths,checkpoint:game.checkpoint});
  const record={completedSteps:[],completedVariants:[],best:{},pending:{variant:2,completedSteps:[2],attemptId:'imported-route'}};
  assert.equal(game.setCapActivityRecord(record,'after-import'),true);assert.equal(previous.destroyed,true);assert.equal(previous.getView(),null);assert.equal(game.capActivity.variant,2);assert.equal(game.capActivity.revision,'after-import');assert.equal(game.options.capActivityRevision,'after-import');
  for(const [key,value] of Object.entries(references))assert.equal(game[key],value,`${key} identity changed`);
  assert.deepEqual({body:game.body,soul:game.soul,lanterns:game.lanterns,memories:game.memories,energy:game.energy,time:game.time,state:game.state,form:game.form,cap:game.cap,camera:game.camera,deaths:game.deaths,checkpoint:game.checkpoint},state);
  assert.equal(events.at(-1).type,'start');assert.equal(events.at(-1).revision,'after-import');const count=events.length;
  previous.emit('complete');previous.arrive(previous.routes['b-2']);previous.update(1/60,game.capActivityContext());assert.equal(events.length,count);game.destroy();assert.equal(game.setCapActivityRecord(record,'too-late'),false);
});

test('replacing an activity inside its last-step callback prevents the old completion from being emitted',()=>{
  const events=[];let game,abandoned;
  game=makeGame({capActivityRevision:'old-ledger'},{onCapActivity:event=>{
    events.push(event);
    if(event.revision==='old-ledger'&&event.type==='step'&&event.completedSteps.length===3){
      abandoned=game.capActivity;
      game.setCapActivityRecord({completedSteps:[],completedVariants:[1],best:{},pending:{variant:2,completedSteps:[2],attemptId:'replacement-at-last-step'}},'new-ledger');
    }
  }});
  walkToRing(game);solveByInput(game);
  assert.ok(abandoned?.destroyed);assert.equal(events.filter(e=>e.revision==='old-ledger'&&e.type==='complete').length,0);assert.equal(events.filter(e=>e.revision==='new-ledger'&&e.type==='complete').length,1);
  assert.equal(game.capActivity.revision,'new-ledger');assert.deepEqual(game.capActivity.record.completedVariants,[1,2]);assert.equal(game.capActivity.record.completedSteps.length,0);assert.ok(events.filter(e=>e.revision==='new-ledger').every(e=>e.attemptId==='replacement-at-last-step'));game.destroy();
});

test('nested replacement during a repair callback retains the newest instance and revision',()=>{
  const events=[];let game,repairInstance;
  game=makeGame({capActivityRevision:'original'},{onCapActivity:event=>{
    events.push(event);
    if(event.revision==='repairing'&&event.type==='complete'){
      repairInstance=game.capActivity;
      game.setCapActivityRecord({completedSteps:[],completedVariants:[],best:{},pending:{variant:1,completedSteps:[1],attemptId:'newest-pending'}},'newest');
    }
  }});
  walkToRing(game);game.toggleSoul();const position={x:game.body.x,y:game.body.y},energy=game.energy;
  game.setCapActivityRecord({completedSteps:[0,1,2],completedVariants:[],best:{},pending:{variant:0,completedSteps:[0,1,2],attemptId:'interrupted-completion'}},'repairing');
  assert.ok(repairInstance?.destroyed);assert.equal(game.capActivity.revision,'newest');assert.equal(game.options.capActivityRevision,'newest');assert.equal(game.capActivity.variant,1);assert.equal(game.capActivity.attemptId,'newest-pending');assert.deepEqual({x:game.body.x,y:game.body.y},position);assert.equal(game.energy,energy);
  assert.equal(events.filter(e=>e.revision==='repairing'&&e.type==='complete').length,1);assert.equal(events.filter(e=>e.revision==='newest'&&e.type==='start').length,1);game.destroy();
});

test('paused imports defer completion repair until resume without restarting the main scene',()=>{
  const events=[];const game=makeGame({capActivityRevision:'paused-old'},{onCapActivity:event=>events.push(event)});walkToRing(game);game.toggleSoul();game.pause();
  const time=game.time,energy=game.energy,runId=game.runId;
  game.setCapActivityRecord({completedSteps:[0,1,2],completedVariants:[],best:{},pending:{variant:0,completedSteps:[0,1,2],attemptId:'paused-final-step'}},'paused-new');
  assert.equal(game.state,'paused');assert.equal(game.runId,runId);assert.equal(events.filter(e=>e.revision==='paused-new').length,0);tick(game,2);assert.equal(game.time,time);assert.equal(game.energy,energy);
  game.resume();assert.equal(events.filter(e=>e.revision==='paused-new'&&e.type==='complete').length,1);assert.equal(game.runId,runId);game.refreshCapActivity();assert.equal(events.filter(e=>e.revision==='paused-new').length,1);game.destroy();
});
