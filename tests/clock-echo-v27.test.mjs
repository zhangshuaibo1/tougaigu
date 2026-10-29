import test from 'node:test';
import assert from 'node:assert/strict';
import {DreamGame} from '../dist/dream-engine.js';
import {DreamGame as BaseGame} from '../dist/dream-engine-base.js';
import {createDreamSave,completeDreamChapter,chooseStoryReply,validateDreamSave,persistDreamSave,loadDreamSave} from '../dist/dream-story.js';
import {createClockEcho,advanceClockEcho,settleClockEcho,getClockEchoSnapshot,drawClockEcho,drawClockMiniature,normalizeClockChoice,CLOCK_ECHO_DURATION} from '../dist/dream-clock-echo.js';

const noop=()=>{};let frameRequests=0;
globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
globalThis.requestAnimationFrame=()=>++frameRequests;globalThis.cancelAnimationFrame=noop;
const ready={playing:true,reducedMotion:false,capPhase:'open',capAge:1.4,capOpen:.85};
const snapshot=e=>JSON.stringify(getClockEchoSnapshot(e));
function context(){
  const calls=[],stack=[],values={globalAlpha:1,globalCompositeOperation:'source-over'};
  const api={calls,stack,save(){stack.push({...values});calls.push(['save']);},restore(){assert.ok(stack.length);Object.assign(values,stack.pop());calls.push(['restore']);},measureText:s=>({width:String(s).length*8})};
  for(const name of ['createLinearGradient','createRadialGradient'])api[name]=(...args)=>{
    assert.ok(args.every(Number.isFinite));const stops=[];calls.push([name,...args,stops]);return{addColorStop:(at,color)=>{assert.ok(Number.isFinite(at));stops.push([at,color]);}};
  };
  return new Proxy(api,{get:(o,k)=>k in o?o[k]:k in values?values[k]:(...args)=>{for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n),String(k));calls.push([k,...args]);},set:(o,k,v)=>{if(k in o)o[k]=v;else values[k]=v;return true;}});
}
function fixture(options={},Class=DreamGame){
  const c=context(),events=[],capEvents=[],completions=[],hud=[];
  const g=new Class({getContext:()=>c,getBoundingClientRect:()=>({width:1100,height:640})},{onEvent:e=>events.push(e),onCapEvent:e=>capEvents.push(e),onComplete:e=>completions.push(e),onHud:e=>hud.push(e)});
  g.start({chapterIndex:4,sound:false,...options});return{g,c,events,capEvents,completions,hud};
}
const tick=(g,frames)=>{for(let i=0;i<frames;i++)g.update(1/60);};
const physics=g=>structuredClone({time:g.time,visualTime:g.visualTime,state:g.state,form:g.form,body:g.body,soul:g.soul,energy:g.energy,deaths:g.deaths,lanterns:g.lanterns,memories:g.memories,hazards:g.hazards,checkpoint:g.checkpoint,level:g.level,progress:g.capActivity?.record,lost:g.lostCase?.getRecord()});
function render(h){h.c.calls.length=0;h.g.render();assert.equal(h.c.stack.length,0);return structuredClone(h.c.calls);}
function savedChoice(choice){
  const save=createDreamSave();
  for(const chapterIndex of [0,1,2,3])assert.equal(completeDreamChapter(save,{chapterIndex,time:60,memories:0,deaths:0,stars:2}).ok,true);
  assert.equal(chooseStoryReply(save,'clock',choice),true);return save;
}

test('clock choice normalization accepts only existing release and hold ids without coercion',()=>{
  for(const value of [undefined,null,true,false,0,1,'RELEASE','keep','send',{},['release'],{toString(){throw Error('coercion');}}]){
    assert.equal(normalizeClockChoice(value),null);assert.equal(createClockEcho(value),null);
  }
  for(const choice of ['release','hold']){
    assert.equal(normalizeClockChoice(choice),choice);assert.deepEqual(createClockEcho(choice),{choice,phase:'waiting',elapsed:0});
    assert.deepEqual(createClockEcho(choice,true),{choice,phase:'settled',elapsed:CLOCK_ECHO_DURATION});
  }
  assert.equal(CLOCK_ECHO_DURATION,2.8);assert.equal(getClockEchoSnapshot(null),null);
});

test('clock echo waits for a truly open cap with finite age and openness and a valid active update',()=>{
  for(const context of [{},{...ready,playing:false},{...ready,capPhase:'opening'},{...ready,capPhase:'returning'},{...ready,capAge:1.3999},{...ready,capOpen:.8499},{...ready,capAge:undefined},{...ready,capAge:NaN},{...ready,capOpen:NaN},{...ready,capOpen:Infinity}]){
    const e=createClockEcho('release'),before=snapshot(e);advanceClockEcho(e,1/60,context);assert.equal(snapshot(e),before);
  }
  for(const dt of [undefined,null,0,-1,NaN,Infinity,-Infinity,'0.02']){
    const e=createClockEcho('hold'),before=snapshot(e);advanceClockEcho(e,dt,ready);assert.equal(snapshot(e),before);
  }
  const e=createClockEcho('release');advanceClockEcho(e,1/60,ready);assert.equal(e.phase,'playing');assert.equal(e.elapsed,1/60);
});

test('clock echo is bounded to 2.8 seconds, clamps one update and never replays within the same run',()=>{
  for(const choice of ['release','hold']){
    const e=createClockEcho(choice);advanceClockEcho(e,100,ready);assert.equal(e.elapsed,.04);
    for(let i=0;i<180;i++)advanceClockEcho(e,1/60,ready);
    assert.deepEqual(e,{choice,phase:'settled',elapsed:2.8});
    for(const capPhase of ['returning','closed','opening','open'])advanceClockEcho(e,1/60,{...ready,capPhase,capAge:5,capOpen:1});
    assert.deepEqual(e,{choice,phase:'settled',elapsed:2.8});
  }
});

test('pause freezes the clock state; recalling after playback settles it and reduced motion does not replay',()=>{
  for(const choice of ['release','hold']){
    const waiting=createClockEcho(choice);advanceClockEcho(waiting,1/60,{...ready,capPhase:'returning'});assert.equal(waiting.phase,'waiting');
    const e=createClockEcho(choice);advanceClockEcho(e,1/60,ready);const before=snapshot(e);
    for(let i=0;i<180;i++)advanceClockEcho(e,1/60,{...ready,playing:false});assert.equal(snapshot(e),before);
    advanceClockEcho(e,1/60,{...ready,capPhase:'returning'});assert.equal(e.phase,'settled');
    const reduced=createClockEcho(choice);advanceClockEcho(reduced,1/60,{...ready,reducedMotion:true});assert.equal(reduced.phase,'settled');
    advanceClockEcho(reduced,1/60,ready);assert.equal(reduced.phase,'settled');
    settleClockEcho(reduced);assert.equal(reduced.elapsed,2.8);settleClockEcho(null);
  }
});

test('clock snapshots are detached and drawing cannot mutate a reply or schedule another animation loop',()=>{
  const e=createClockEcho('release'),copy=getClockEchoSnapshot(e);copy.choice='hold';copy.elapsed=2;
  assert.deepEqual(e,{choice:'release',phase:'waiting',elapsed:0});
  const beforeFrames=frameRequests,frames=[];
  for(const choice of ['release','hold']){
    const c=context(),value={choice,phase:'playing',elapsed:1.2},before=structuredClone(value);
    drawClockEcho(c,value,{opening:{x:105,y:480},face:1,camera:0,width:320});assert.equal(c.stack.length,0);assert.deepEqual(value,before);frames.push(structuredClone(c.calls));
    const mini=context();drawClockMiniature(mini,value,1.2);assert.equal(mini.stack.length,0);assert.deepEqual(value,before);
    for(const elapsed of [0,.1,1,2.7,2.8])for(const face of [-1,1]){
      const x=context();drawClockEcho(x,{choice,phase:'playing',elapsed},{opening:{x:25,y:490},face,camera:0,width:320});assert.equal(x.stack.length,0);
    }
  }
  assert.notDeepEqual(frames[0],frames[1],'Existing replies must produce distinct visible actions');
  assert.equal(frameRequests,beforeFrames);
  const c=context();drawClockEcho(c,null);drawClockMiniature(c,null);drawClockEcho(c,{choice:'hold',phase:'playing',elapsed:1},{opening:{x:NaN,y:0}});assert.deepEqual(c.calls,[]);
});

test('validated saved clock reply enters only the coast; completion does not invent a choice or collectibles',()=>{
  const unearned=createDreamSave();unearned.choices.clock='release';assert.equal(validateDreamSave(unearned).choices.clock,null);
  for(const clockChoice of [undefined,null,'invalid']){
    const h=fixture({clockChoice});assert.equal(h.g.getClockEchoView(),null);assert.equal('clockEcho' in h.g.capScene,false);h.g.destroy();
  }
  for(const choice of ['release','hold']){
    const save=validateDreamSave(savedChoice(choice)),h=fixture({clockChoice:save.choices.clock});
    assert.deepEqual(h.g.getClockEchoView(),{choice,phase:'waiting',elapsed:0});
    assert.equal(h.g.getSnapshot().memories,0);assert.equal(h.g.getSnapshot().seals,0);assert.equal(h.g.exitReady(),false);h.g.destroy();
  }
});

test('real cap opening starts after its existing projection and performs only one echo on the original RAF loop',()=>{
  for(const choice of ['release','hold']){
    const h=fixture({clockChoice:choice}),requests=frameRequests;tick(h.g,120);assert.equal(h.g.getClockEchoView().phase,'waiting');
    assert.equal(h.g.toggleSoul(),true);tick(h.g,60);assert.equal(h.g.getClockEchoView().phase,'waiting');
    tick(h.g,40);assert.equal(h.g.getClockEchoView().phase,'playing');tick(h.g,190);assert.equal(h.g.getClockEchoView().phase,'settled');
    assert.equal(h.g.recall(),true);tick(h.g,60);h.g.toggleSoul();tick(h.g,150);assert.equal(h.g.getClockEchoView().phase,'settled');
    assert.equal(frameRequests,requests);assert.equal(h.completions.length,0);h.g.destroy();
  }
});

test('paused clock playback freezes the full rendered commands, physics and callbacks',()=>{
  for(const choice of ['release','hold']){
    const h=fixture({clockChoice:choice});h.g.toggleSoul();tick(h.g,120);assert.equal(h.g.getClockEchoView().phase,'playing');h.g.pause();
    const before=physics(h.g),echo=h.g.getClockEchoView(),frame=render(h),counts=[h.events.length,h.capEvents.length,h.completions.length,h.hud.length];
    tick(h.g,600);assert.deepEqual(physics(h.g),before);assert.deepEqual(h.g.getClockEchoView(),echo);assert.deepEqual(render(h),frame);
    assert.deepEqual([h.events.length,h.capEvents.length,h.completions.length,h.hud.length],counts);
    h.g.resume();tick(h.g,180);assert.equal(h.g.getClockEchoView().phase,'settled');h.g.destroy();
  }
});

test('real early recall leaves the reply waiting, mid-echo recall settles it, and reduced motion remains settled',()=>{
  for(const choice of ['release','hold']){
    const h=fixture({clockChoice:choice});h.g.toggleSoul();tick(h.g,35);h.g.recall();tick(h.g,60);assert.equal(h.g.getClockEchoView().phase,'waiting');
    h.g.toggleSoul();tick(h.g,120);assert.equal(h.g.getClockEchoView().phase,'playing');h.g.recall();tick(h.g,3);assert.equal(h.g.getClockEchoView().phase,'settled');
    h.g.restart();h.g.toggleSoul();tick(h.g,120);h.g.pause();h.g.setReducedMotion(true);assert.equal(h.g.getClockEchoView().phase,'settled');
    h.g.setReducedMotion(false);h.g.resume();tick(h.g,120);assert.equal(h.g.getClockEchoView().phase,'settled');h.g.destroy();
    const reduced=fixture({clockChoice:choice,reducedMotion:true});assert.equal(reduced.g.getClockEchoView().phase,'settled');reduced.g.toggleSoul();tick(reduced.g,120);assert.equal(reduced.g.getClockEchoView().phase,'settled');reduced.g.destroy();
  }
});

test('diary selection rebuilds presentation while paused without changing physics or granting anything',()=>{
  const h=fixture({clockChoice:'release'});h.g.toggleSoul();tick(h.g,120);h.g.pause();
  const before=physics(h.g),events=structuredClone(h.events),cap=structuredClone(h.capEvents),completions=structuredClone(h.completions);
  assert.equal(h.g.setClockChoice('hold'),true);assert.deepEqual(h.g.getClockEchoView(),{choice:'hold',phase:'waiting',elapsed:0});
  assert.deepEqual(physics(h.g),before);assert.deepEqual(h.events,events);assert.deepEqual(h.capEvents,cap);assert.deepEqual(h.completions,completions);
  tick(h.g,120);assert.equal(h.g.getClockEchoView().phase,'waiting');h.g.resume();tick(h.g,1);assert.equal(h.g.getClockEchoView().phase,'playing');
  const playing=h.g.getClockEchoView();assert.equal(h.g.setClockChoice('hold'),false);assert.deepEqual(h.g.getClockEchoView(),playing);
  assert.equal(h.g.setClockChoice('invalid'),true);assert.equal(h.g.getClockEchoView(),null);assert.equal('clockEcho' in h.g.capScene,false);h.g.destroy();
});

test('the existing save key restores both replies and restart rebuilds only this run presentation',()=>{
  for(const choice of ['release','hold']){
    const data=new Map(),storage={getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)},save=savedChoice(choice);
    assert.equal(persistDreamSave(save,storage),true);assert.equal(data.size,1);
    const loaded=loadDreamSave(storage),h=fixture({clockChoice:loaded.choices.clock});h.g.toggleSoul();tick(h.g,300);assert.equal(h.g.getClockEchoView().phase,'settled');
    h.g.restart();assert.deepEqual(h.g.getClockEchoView(),{choice,phase:'waiting',elapsed:0});assert.deepEqual(loadDreamSave(storage),loaded);assert.equal(h.g.getSnapshot().seals,0);h.g.destroy();
  }
});

test('both reply performances preserve inherited physical state and genuine gameplay callbacks',()=>{
  for(const choice of ['release','hold']){
    const a=fixture({clockChoice:choice}),b=fixture({},BaseGame);for(const h of [a,b])h.g.toggleSoul();
    for(let i=0;i<300;i++){a.g.update(1/60);b.g.update(1/60);assert.deepEqual(physics(a.g),physics(b.g));}
    assert.deepEqual(a.events,b.events);assert.deepEqual(a.capEvents,b.capEvents);assert.deepEqual(a.completions,b.completions);
    // onHud carries an intentional clockEcho presentation field; it is not a reward.
    assert.equal(a.hud.length,b.hud.length);assert.equal(a.g.getClockEchoView().phase,'settled');a.g.destroy();b.g.destroy();
  }
});

test('other chapters and festivals never inherit coast choice performance and destruction cannot revive it',()=>{
  const h=fixture({clockChoice:'release'});
  for(const options of [...[0,1,2,3,5].map(chapterIndex=>({chapterIndex})),{festival:{id:'newyear'}}]){
    h.g.start({...options,clockChoice:'hold',sound:false});assert.equal(h.g.getClockEchoView(),null);assert.equal('clockEcho' in h.g.capScene,false);assert.equal('clockEcho' in h.g.getSnapshot(),false);
    h.g.setClockChoice('release');assert.equal(h.g.getClockEchoView(),null);
  }
  h.g.destroy();assert.equal(h.g.setClockChoice('hold'),false);h.g.update(1/60);assert.equal(h.g.getClockEchoView(),null);assert.deepEqual(render(h),[]);
});
