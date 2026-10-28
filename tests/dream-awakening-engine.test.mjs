import test from 'node:test';
import assert from 'node:assert/strict';
import { DreamGame } from '../dist/dream-engine.js';
import { DREAM_LEVELS, getDreamLevel } from '../dist/dream-levels.js';
import { FESTIVAL_LEVELS } from '../dist/dream-festival-levels.js';
import { getStoryAwakening } from '../dist/dream-awakenings.js';

const noop=()=>{};
globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function context(){
  const calls=[];
  const record=(name,args)=>{for(const value of args)if(typeof value==='number')assert.ok(Number.isFinite(value),'non-finite '+name);if(calls.length<30000)calls.push({name,args});};
  return new Proxy({
    calls,globalAlpha:1,
    createLinearGradient:(...args)=>{record('createLinearGradient',args);return {addColorStop:noop};},
    createRadialGradient:(...args)=>{record('createRadialGradient',args);return {addColorStop:noop};},
    measureText:value=>({width:String(value).length*8}),
  },{get:(object,key)=>key in object?object[key]:(...args)=>record(key,args)});
}
function makeGame(options={},callbacks={},size={width:1100,height:620}){
  const ctx=context(),game=new DreamGame({getContext:()=>ctx,getBoundingClientRect:()=>size},callbacks);
  game.start({sound:false,...options});return game;
}
const tick=(game,seconds)=>{for(let i=0;i<Math.ceil(seconds*60);i++)game.update(1/60);};
const anchors=[[420,1220],[550,1540],[430,1530],[660,1740],[460,1510],[430,1950]];
function walkTo(game,target,limit=45){
  let lastJump=-2;
  for(let frame=0;frame<limit*60&&game.state==='playing';frame++){
    const delta=target-game.body.x;
    if(Math.abs(delta)<10&&game.body.grounded){game.setInput({x:0,y:0});tick(game,.15);return;}
    const mushroomNear=game.pads.some(pad=>game.body.x>pad.x-110&&game.body.x<pad.x+pad.w+45);
    if(!mushroomNear&&Math.abs(delta)>=130&&game.body.grounded&&game.time-lastJump>.38){game.jump();lastJump=game.time;}
    game.setInput({x:Math.abs(delta)<8?0:Math.sign(delta),y:0});game.update(1/60);
  }
  if(game.state==='complete')return;
  assert.fail(`walk failed in chapter ${game.chapterIndex} to ${target}: body ${game.body.x},${game.body.y}, deaths ${game.deaths}`);
}
function flyTo(game,target){
  for(let frame=0;frame<8*60;frame++){
    assert.equal(game.form,'soul',`chapter ${game.chapterIndex} body ${game.body.x},${game.body.y} deaths ${game.deaths}`);
    const dx=target.x-game.soul.x,dy=target.y-game.soul.y;
    if(Math.hypot(dx,dy)<45){game.setInput({x:0,y:0});return;}
    game.setInput({x:clamp(dx/75,-1,1),y:clamp(dy/75,-1,1)});game.update(1/60);
  }
  assert.fail(`flight failed in chapter ${game.chapterIndex} to ${target.x},${target.y}`);
}
function visitLamp(game,index,anchor=anchors[game.chapterIndex][index]){
  walkTo(game,anchor);assert.equal(game.toggleSoul(),true);flyTo(game,game.lanterns[index]);
}
function answerLamp(game,index,...answers){
  const correct=answers.length?answers[0]:true;
  assert.equal(game.interact(),true,'Q must reach an actual lamp through the soul');
  assert.equal(game.pendingSeal,index);assert.equal(game.state,'paused');
  assert.equal(game.resolvePuzzle(correct),correct===true);
}
const motion=view=>({id:view.id,elapsed:view.elapsed,progress:view.progress,stage:view.stage,settled:view.settled,anchor:{...view.anchor},bounds:{...view.bounds}});
const geometry=level=>Object.fromEntries(['width','height','spawn','platforms','plates','barriers','lanterns','memories','checkpoints','exit','movers','pads','winds','hazards'].map(key=>[key,level[key]]));

for(let chapterIndex=0;chapterIndex<6;chapterIndex++){
  test(`chapter ${chapterIndex+1}: the two real puzzle answers reveal their own scenery and the original route still finishes`,()=>{
    const asked=[],events=[],completed=[],game=makeGame({chapterIndex},{onPuzzle:event=>asked.push(event),onCapEvent:event=>events.push(event),onComplete:event=>completed.push(event)});
    assert.deepEqual(game.getStoryAwakeningViews(),[]);
    for(let sealIndex=0;sealIndex<2;sealIndex++){
      visitLamp(game,sealIndex);
      assert.equal(game.interact(),true);assert.equal(game.pendingSeal,sealIndex);assert.equal(game.state,'paused');
      assert.equal(asked.at(-1).sealIndex,sealIndex);assert.equal(game.lanterns[sealIndex].lit,false);
      const paused=game.getStoryAwakeningViews().map(motion),time=game.time;tick(game,2);
      assert.deepEqual(game.getStoryAwakeningViews().map(motion),paused);assert.equal(game.time,time);
      assert.equal(paused.length,sealIndex,'an unanswered lamp cannot leak a new motif');
      assert.equal(game.resolvePuzzle(true),true);assert.equal(game.state,'playing');
      const cfg=getStoryAwakening(chapterIndex,sealIndex),views=game.getStoryAwakeningViews(),view=views.find(item=>item.sealIndex===sealIndex);
      assert.equal(views.length,sealIndex+1);assert.equal(view.cfg,cfg);assert.equal(view.kind,cfg.kind);assert.equal(view.puzzleId,cfg.puzzleId);
      assert.deepEqual(view.lamp,{x:game.lanterns[sealIndex].x,y:game.lanterns[sealIndex].y});
      assert.equal(view.elapsed,0);assert.equal(view.progress,0);assert.equal(view.stage,'unfold');assert.equal(view.settled,false);
      if(sealIndex===0)assert.ok(!JSON.stringify(views).includes(getStoryAwakening(chapterIndex,1).caption),'the other answer must stay hidden');
      game.setInput({x:.4,y:-.2});tick(game,.2);assert.ok(game.getStoryAwakeningViews().find(item=>item.sealIndex===sealIndex).progress>0);
      assert.equal(game.state,'playing','the new scene must never add an input lock');
      assert.equal(game.recall(),true,'E is available while scenery unfolds');
    }
    walkTo(game,game.level.exit.x,60);
    assert.equal(game.state,'complete');assert.equal(completed.length,1);assert.equal(asked.length,2);
    assert.deepEqual(events.filter(event=>event.type==='seal').map(event=>event.index),[0,1],'only the existing two seal events are rewarded');
    assert.ok(game.getStoryAwakeningViews().every(view=>view.settled&&view.elapsed===1.8));
    assert.deepEqual(geometry(game.level),geometry(getDreamLevel(chapterIndex)));
    game.destroy();
  });
}

test('wrong, cancelled and non-boolean answers never reveal scenery; duplicate answers and pulses never restart it',()=>{
  const game=makeGame({chapterIndex:0},{onPuzzle:noop});visitLamp(game,0);
  for(const answer of [false,undefined,null,'true',1]){
    answerLamp(game,0,answer);assert.equal(game.lanterns[0].lit,false);assert.deepEqual(game.getStoryAwakeningViews(),[]);
    tick(game,.5);
  }
  answerLamp(game,0,true);tick(game,.6);
  const before=game.getStoryAwakeningViews().map(motion);
  assert.equal(game.lightSeal(0),false);assert.equal(game.resolvePuzzle(true),false);game.interact();
  assert.deepEqual(game.getStoryAwakeningViews().map(motion),before);
  assert.equal(game.lightSeal(-1),false);assert.equal(game.lightSeal(20),false);
  assert.deepEqual(game.getStoryAwakeningViews().map(motion),before);game.destroy();
});

test('the second greenhouse lamp can be solved first through real travel and keeps its own identity when the first follows',()=>{
  const asked=[],game=makeGame({chapterIndex:1},{onPuzzle:event=>asked.push(event)});
  visitLamp(game,1);answerLamp(game,1);
  const second=game.getStoryAwakeningViews()[0];assert.equal(second.sealIndex,1);assert.equal(second.kind,'greenhouse-sesame');
  assert.equal(game.lanterns[0].lit,false);assert.equal(game.getStoryAwakeningViews().length,1);
  game.recall();
  // Return to the east side of the tall root; the soul can fly over it to the first lamp.
  visitLamp(game,0,1070);answerLamp(game,0);
  const views=game.getStoryAwakeningViews();assert.deepEqual(views.map(view=>view.sealIndex),[0,1]);
  assert.equal(views[0].kind,'greenhouse-willow');assert.equal(views[0].progress,0);
  assert.equal(views[1].progress,1);assert.deepEqual(views[1].anchor,second.anchor);
  assert.deepEqual(asked.map(event=>event.sealIndex),[1,0]);game.destroy();
});

test('pause freezes unfolding, E and actual fall recovery retain it, and restart or chapter change clears it',()=>{
  const game=makeGame({chapterIndex:0},{onPuzzle:noop});visitLamp(game,0);answerLamp(game,0);tick(game,.45);
  const frozen=game.getStoryAwakeningViews().map(motion);assert.ok(Math.abs(frozen[0].progress-.25)<1e-9);
  assert.equal(game.pause('blur'),true);tick(game,5);game.render();
  assert.deepEqual(game.getStoryAwakeningViews().map(motion),frozen);
  assert.equal(game.resume(),true);assert.equal(game.toggleSoul(),true);assert.equal(game.form,'body');
  assert.deepEqual(game.getStoryAwakeningViews().map(motion),frozen,'returning cannot reset the local clock or move the scene');
  const deaths=game.deaths;game.body.y=730;game.update(1/60);
  const afterFall=game.getStoryAwakeningViews()[0];assert.equal(game.deaths,deaths+1);assert.equal(game.lanterns[0].lit,true);
  assert.deepEqual(afterFall.anchor,frozen[0].anchor);assert.ok(Math.abs(afterFall.elapsed-frozen[0].elapsed-1/60)<1e-9);
  tick(game,2);assert.equal(game.getStoryAwakeningViews()[0].elapsed,1.8);assert.equal(game.getStoryAwakeningViews()[0].stage,'settled');
  tick(game,10);assert.equal(game.getStoryAwakeningViews()[0].elapsed,1.8,'finished scenery remains stable for the run');
  game.restart();assert.deepEqual(game.getStoryAwakeningViews(),[]);assert.ok(game.lanterns.every(lamp=>!lamp.lit));
  visitLamp(game,0);answerLamp(game,0);assert.equal(game.getStoryAwakeningViews()[0].progress,0);
  game.start({chapterIndex:5,sound:false});assert.deepEqual(game.getStoryAwakeningViews(),[]);
  game.destroy();assert.deepEqual(game.getStoryAwakeningViews(),[]);
});

test('restarting while the puzzle is open cancels its reveal and cannot complete the old lamp in the new run',()=>{
  const game=makeGame({chapterIndex:0},{onPuzzle:noop});visitLamp(game,0);
  assert.equal(game.pulse(),true);assert.equal(game.pendingSeal,0);assert.deepEqual(game.getStoryAwakeningViews(),[]);
  game.restart();assert.equal(game.pendingSeal,null);assert.equal(game.resolvePuzzle(true),false);assert.deepEqual(game.getStoryAwakeningViews(),[]);
  game.destroy();
});

test('reduced motion settles immediately at startup or while paused and turning it off never rewinds a scene',()=>{
  for(const reducedMotion of [false,true]){
    const game=makeGame({chapterIndex:0,reducedMotion},{onPuzzle:noop});visitLamp(game,0);answerLamp(game,0);
    assert.equal(game.getStoryAwakeningViews()[0].progress,reducedMotion?1:0);
    tick(game,.4);game.pause();game.setReducedMotion(true);
    const settled=game.getStoryAwakeningViews()[0];assert.equal(settled.elapsed,1.8);assert.equal(settled.stage,'settled');assert.equal(settled.settled,true);
    game.render();game.setReducedMotion(false);game.render();assert.deepEqual(motion(game.getStoryAwakeningViews()[0]),motion(settled));
    game.resume();tick(game,.5);assert.equal(game.getStoryAwakeningViews()[0].progress,1);
    game.lightSeal(1);assert.equal(game.getStoryAwakeningViews()[0].progress,1);assert.equal(game.getStoryAwakeningViews()[1].progress,0);
    game.destroy();
  }
});

test('unfolding uses bounded simulation time at low frame rates and discards suspended wall time',()=>{
  const elapsed=[];
  for(const frameMs of [1000/60,100,200]){
    const game=makeGame();game.lightSeal(0);game.frame(0);
    for(let now=frameMs;now<=1000+.001;now+=frameMs)game.frame(now);
    const before=game.getStoryAwakeningViews()[0];assert.ok(Math.abs(before.elapsed-1)<1e-9);elapsed.push(before.elapsed);
    game.pause();game.frame(10000);assert.equal(game.getStoryAwakeningViews()[0].elapsed,before.elapsed);
    game.resume();game.frame(11000);assert.equal(game.getStoryAwakeningViews()[0].elapsed,before.elapsed);
    game.frame(11100);assert.ok(Math.abs(game.getStoryAwakeningViews()[0].elapsed-1.1)<1e-9);game.destroy();
  }
  assert.ok(Math.max(...elapsed)-Math.min(...elapsed)<1e-9);
});

test('all ten festivals preserve their existing puzzle flow and never acquire main-story scenes',()=>{
  for(const level of FESTIVAL_LEVELS){
    const asked=[],game=makeGame({festival:{id:level.festivalId}},{onPuzzle:event=>asked.push(event)}),before=JSON.stringify(geometry(game.level));
    game.body.x=game.lanterns[0].x-100;assert.equal(game.toggleSoul(),true);
    game.soul.x=game.lanterns[0].x;game.soul.y=game.lanterns[0].y;
    answerLamp(game,0);assert.equal(asked[0].mode,'festival');assert.equal(asked[0].festivalId,level.festivalId);
    game.lightSeal(1);tick(game,.3);game.setReducedMotion(true);game.render();
    assert.deepEqual(game.getStoryAwakeningViews(),[]);assert.equal(JSON.stringify(geometry(game.level)),before);game.destroy();
  }
});

test('the pure view contains only actually revealed lamps and isolates coordinates from rendering code',()=>{
  const ctx=context(),game=new DreamGame({getContext:()=>ctx,getBoundingClientRect:()=>({width:390,height:640})});
  assert.deepEqual(game.getStoryAwakeningViews(),[]);game.start({chapterIndex:3,sound:false});
  game.lanterns[0].lit=true;assert.deepEqual(game.getStoryAwakeningViews(),[],'a naked aggregate flag must not manufacture a reveal');
  game.lanterns[0].lit=false;game.lightSeal(1);
  const view=game.getStoryAwakeningViews()[0],before=motion(view),lamp={...game.lanterns[1]},zones=game.getSceneBackdropView().clearZones;
  assert.equal(view.sealIndex,1);assert.equal(view.cfg,getStoryAwakening(3,1));assert.equal(Object.isFrozen(view.cfg),true);
  assert.throws(()=>{view.cfg.kind='wrong';},TypeError);
  view.anchor.x=-999;view.bounds.top=-999;view.lamp.x=-999;view.clearZones[0].x=-999;view.elapsed=999;view.progress=999;view.kind='wrong';
  const current=game.getStoryAwakeningViews()[0];assert.deepEqual(motion(current),before);assert.equal(current.kind,'library-bookmark');
  assert.deepEqual(game.lanterns[1],lamp);assert.deepEqual(game.getSceneBackdropView().clearZones,zones);
  game.lanterns[1].lit=false;assert.deepEqual(game.getStoryAwakeningViews(),[],'even a recorded scene is hidden if its source lamp is not lit');
  game.destroy();
});

test('real mobile lamp approaches keep the locked scene visible and include current interactive protection circles',()=>{
  // These are the canvas rectangles, after shell/footer/control-strip layout.
  // 320x544 also preserves the wind-and-camera regression found in art review.
  for(let chapterIndex=0;chapterIndex<6;chapterIndex++)for(const [width,height] of [[320,431],[390,595],[320,544]]){
    const game=makeGame({chapterIndex},{onPuzzle:noop},{width,height});
    for(let sealIndex=0;sealIndex<2;sealIndex++){
      // Watch from the greenhouse's existing ledge, above its roaming shadow.
      if(chapterIndex===1&&sealIndex===1){
        walkTo(game,1370);if(game.body.y>450){assert.equal(game.jump(),true);tick(game,1);}
        assert.equal(game.body.y,445);assert.equal(game.toggleSoul(),true);flyTo(game,game.lanterns[sealIndex]);
      }else visitLamp(game,sealIndex);
      answerLamp(game,sealIndex);
      const view=game.getStoryAwakeningViews().find(item=>item.sealIndex===sealIndex),b=view.bounds;
      assert.equal(b.right-b.left,96);assert.equal(b.bottom-b.top,96);
      assert.equal(Math.hypot(view.anchor.x-view.lamp.x,view.anchor.y-view.lamp.y),128);
      const assertVisible=()=>{
        const left=(b.left-game.camera)*game.scale,right=(b.right-game.camera)*game.scale,top=b.top*game.scale+game.viewportOffsetY,bottom=b.bottom*game.scale+game.viewportOffsetY;
        const overlapX=Math.max(0,Math.min(right,width)-Math.max(left,0)),overlapY=Math.max(0,Math.min(bottom,height-36)-Math.max(top,150));
        assert.ok(overlapX*overlapY>=(96*game.scale)**2*.95,`chapter ${chapterIndex} lamp ${sealIndex} at ${width}x${height} must remain clear of HUD and controls, camera=${game.camera} body=${game.body.x},${game.body.y} soul=${game.soul.x},${game.soul.y} form=${game.form} deaths=${game.deaths} bounds=${JSON.stringify(b)}`);
      };
      assertVisible();
      assert.deepEqual(view.clearZones,game.getSceneBackdropView().clearZones);
      for(const lamp of game.lanterns)assert.ok(view.clearZones.some(zone=>zone.x===lamp.x&&zone.y===lamp.y&&zone.r===78));
      for(const memory of game.memories.filter(item=>!item.collected))assert.ok(view.clearZones.some(zone=>zone.x===memory.x&&zone.y===memory.y&&zone.r===54));
      assert.ok(view.clearZones.some(zone=>zone.x===game.soul.x&&zone.y===game.soul.y&&zone.r===48));
      assert.ok(view.clearZones.some(zone=>zone.x===game.body.x&&zone.y===game.body.y-36&&zone.r===56));
      const anchor={...view.anchor},bounds={...b},deaths=game.deaths;game.render();tick(game,1.8);assert.equal(game.deaths,deaths);assertVisible();
      assert.equal(game.getStoryAwakeningViews().find(item=>item.sealIndex===sealIndex).settled,true);
      game.recall();tick(game,.3);
      const after=game.getStoryAwakeningViews().find(item=>item.sealIndex===sealIndex);
      assert.deepEqual(after.anchor,anchor);assert.deepEqual(after.bounds,bounds);
    }
    game.destroy();
  }
});

test('the new renderer runs after architecture and before physical objects, memories, lamps and characters',()=>{
  const game=makeGame({chapterIndex:4});game.ctx.calls.length=0;game.drawStoryAwakenings(game.ctx);assert.equal(game.ctx.calls.length,0);
  game.lightSeal(0);tick(game,.9);game.ctx.calls.length=0;game.drawStoryAwakenings(game.ctx);
  assert.ok(game.ctx.calls.some(call=>call.name==='clip'),'the real art renderer must consume the protected view');
  const order=[];
  for(const method of ['drawBackground','drawArchitecture','drawStoryAwakenings','drawPlatform','drawMemory','drawLantern','drawHazard','drawCharacter']){
    const original=game[method].bind(game);game[method]=(...args)=>{order.push(method);return original(...args);};
  }
  game.render();const newLayer=order.indexOf('drawStoryAwakenings');assert.ok(newLayer>order.indexOf('drawArchitecture'));
  for(const method of ['drawPlatform','drawMemory','drawLantern','drawHazard','drawCharacter'])assert.ok(order.indexOf(method)>newLayer,method+' must remain in front');
  game.destroy();
});

test('scenery cannot change collision maps, physics, camera following, progression or rewards',()=>{
  const authored=JSON.stringify(DREAM_LEVELS);
  for(let chapterIndex=0;chapterIndex<6;chapterIndex++){
    const aEvents=[],bEvents=[],a=makeGame({chapterIndex},{onCapEvent:event=>aEvents.push(event)}),b=makeGame({chapterIndex},{onCapEvent:event=>bEvents.push(event)});
    for(const game of [a,b]){game.lightSeal(0);game.lightSeal(1);}
    b.storyAwakenings=[];
    for(let frame=0;frame<180;frame++){
      for(const game of [a,b]){
        if(frame===20)game.jump();if(frame===60||frame===120)game.toggleSoul();
        game.setInput({x:frame<120?.8:-.5,y:frame<120?-.3:0});game.update(1/60);
        if(frame%30===0)game.render();
      }
      assert.deepEqual(a.body,b.body);assert.deepEqual(a.soul,b.soul);assert.equal(a.camera,b.camera);assert.equal(a.energy,b.energy);
    }
    assert.deepEqual(a.getSnapshot(),b.getSnapshot());assert.deepEqual(a.hazards,b.hazards);assert.deepEqual(a.movers,b.movers);assert.deepEqual(a.pads,b.pads);
    assert.deepEqual(aEvents,bEvents);assert.deepEqual(a.capActivity.record,b.capActivity.record);assert.deepEqual(a.lostCase?.getRecord(),b.lostCase?.getRecord());
    assert.deepEqual(geometry(a.level),geometry(getDreamLevel(chapterIndex)));a.destroy();b.destroy();
  }
  assert.equal(JSON.stringify(DREAM_LEVELS),authored);
});
