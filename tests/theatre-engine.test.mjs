import test from 'node:test';
import assert from 'node:assert/strict';
import { DreamGame } from '../dist/dream-engine.js';
import { DreamGame as BaseGame } from '../dist/dream-engine-base.js';
import { MOON_PLAY_CONFIG } from '../dist/dream-moon-play.js';

const noop=()=>{};
globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
function context(){
  const calls=[],stack=[],values={globalAlpha:1};
  return new Proxy({calls,stack,
    save(){stack.push({...values});calls.push(['save']);},
    restore(){assert.ok(stack.length,'every restore has a save');Object.assign(values,stack.pop());calls.push(['restore']);},
    createLinearGradient(...a){calls.push(['linear',...a]);return {addColorStop:noop};},
    createRadialGradient(...a){calls.push(['radial',...a]);return {addColorStop:noop};},
    measureText:text=>({width:String(text).length*8})
  },{get:(o,k)=>k in o?o[k]:k in values?values[k]:(...args)=>{for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n),String(k));calls.push([k,...args]);},set:(o,k,v)=>{values[k]=v;return true;}});
}
function makeGame(options={},Class=DreamGame,resources={}){
  const c=context(),events=[];
  const game=new Class({getContext:()=>c,getBoundingClientRect:()=>({width:1100,height:640})},{onCapEvent:e=>events.push(e)},resources);
  game.start({chapterIndex:2,sound:false,...options});return {game,c,events};
}
const tick=(g,n=1)=>{for(let i=0;i<n;i++)g.update(1/60);};
const physical=g=>JSON.stringify({body:g.body,soul:g.soul,input:g.input,level:g.level,movers:g.movers,lamps:g.lanterns,memories:g.memories,time:g.time,form:g.form,energy:g.energy,cap:g.cap,checkpoint:g.checkpoint,deaths:g.deaths,particles:g.particles});
function render(h){h.c.calls.length=0;h.game.render();assert.equal(h.c.stack.length,0);return structuredClone(h.c.calls);}

test('third-chapter presentation keeps exact simulation, platform carrying and recovery over several stage cycles',()=>{
  const a=makeGame(),b=makeGame({},BaseGame);
  assert.equal(a.game.frame,BaseGame.prototype.frame,'no second animation loop');
  for(let frame=0;frame<2000;frame++){
    const input=frame<130?1:frame<180?0:frame<400?1:frame<850?0:frame<1130?-1:1;
    a.game.setInput({x:input});b.game.setInput({x:input});
    if([120,300,1000,1250].includes(frame)){a.game.jump();b.game.jump();}
    tick(a.game);tick(b.game);
    assert.equal(physical(a.game),physical(b.game),'unchanged physics at frame '+frame);
  }
  assert.deepEqual(a.events,b.events);a.game.destroy();b.game.destroy();
});

test('theatre guidance yields to actual friend, soul lamp and borrowed-moon interactions',()=>{
  const h=makeGame(),g=h.game;
  Object.assign(g.body,{x:190,y:560,grounded:true});
  assert.match(g.getNearHint(),/绒绒/);assert.equal(g.getTheatreGuidance(),null);
  g.form='soul';Object.assign(g.soul,{x:g.lanterns[0].x,y:g.lanterns[0].y});
  assert.equal(g.getNearHint(),'空格 / Q：与诗灯共鸣');assert.equal(g.getTheatreGuidance(),null);
  g.form='body';Object.assign(g.body,{...MOON_PLAY_CONFIG.anchor,grounded:true});g.refreshCapActivity();
  assert.match(g.getNearHint(),/借月追光/);assert.equal(g.getTheatreGuidance(),null);
  g.destroy();
});

test('guidance follows the real platform and clears on restart or leaving the chapter',()=>{
  const h=makeGame(),g=h.game,stage=g.movers[0];
  Object.assign(g.body,{x:stage.x+stage.w/2,y:stage.y,grounded:true,platform:stage.id});
  assert.equal(g.getTheatreGuidance()?.stage,'ride');
  const before=physical(g);g.getNearHint();g.getTheatreGuidance();assert.equal(physical(g),before);
  g.restart();assert.equal(g.getTheatreGuidance(),null,'spawn is outside the stage guidance area');
  g.start({chapterIndex:1,sound:false});assert.equal(g.getTheatreGuidance(),null);
  g.start({festival:{id:'lantern'},sound:false});assert.equal(g.getTheatreGuidance(),null);
  g.destroy();
});

test('production theatre rendering is pure and pause and reduced motion freeze decorative changes',()=>{
  const h=makeGame(),g=h.game;g.setInput({x:1});tick(g,170);g.setInput({x:0});
  const before=physical(g),frame=render(h);assert.equal(physical(g),before);assert.deepEqual(render(h),frame);
  g.pause();const frozen=render(h);tick(g,120);assert.deepEqual(render(h),frozen);assert.equal(physical(g),before);
  g.setReducedMotion(true);const still=render(h);g.visualTime+=99;assert.deepEqual(render(h),still);
  g.destroy();
});

test('cached station and greenhouse paintings do not enter the refined theatre or trigger a third image request',async()=>{
  const requests=[],image={complete:true,naturalWidth:2172,naturalHeight:724};
  const a=makeGame({},DreamGame,{loadImage:src=>{requests.push(src);return image;}}),b=makeGame();
  await Promise.resolve();assert.equal(requests.length,0,'the theatre does not request an irrelevant painting');
  a.game.start({chapterIndex:0,sound:false});await a.game.paintedScenes.request({mode:'story',chapterIndex:0});
  a.game.start({chapterIndex:1,sound:false});await a.game.greenhouseScenes.request({mode:'story',chapterIndex:1});
  assert.equal(requests.length,2);a.game.start({chapterIndex:2,sound:false});
  assert.deepEqual(render(a),render(b));assert.equal(a.game.paintedFrame,false);assert.equal(a.game.greenhousePaintedFrame,false);
  assert.equal(a.game.getPaintedStationImage(),null);assert.equal(a.game.getPaintedGreenhouseImage(),null);
  assert.equal(requests.length,2);a.game.destroy();b.game.destroy();
});
