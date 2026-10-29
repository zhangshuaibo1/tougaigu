import test from 'node:test';
import assert from 'node:assert/strict';
import { DreamGame } from '../dist/dream-engine.js';
import { DreamGame as BaseGame } from '../dist/dream-engine-base.js';
import { PAINTED_STATION_URL } from '../dist/dream-painted-scene.js';
import { PAINTED_GREENHOUSE_URL, drawPaintedGreenhouseLights } from '../dist/dream-greenhouse-scene.js';
import { FESTIVAL_LEVELS } from '../dist/dream-festival-levels.js';
import { getFestival } from '../dist/dream-festivals.js';

const noop=()=>{};
globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
const greenhouse={mode:'story',chapterIndex:1},station={mode:'story',chapterIndex:0};
const image=Object.freeze({complete:true,naturalWidth:2172,naturalHeight:724});
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function context(){
  const calls=[],stack=[],values={globalAlpha:1,globalCompositeOperation:'source-over',fillStyle:'#000',strokeStyle:'#000',lineWidth:1};
  const gradient=(kind,args)=>{const stops=[];calls.push([kind,...args,stops]);return {addColorStop:(...stop)=>stops.push(stop)};};
  const api={calls,stack,failImage:false,
    save(){stack.push({...values});calls.push(['save']);},restore(){assert.ok(stack.length);const state=stack.pop();for(const key of Object.keys(values))delete values[key];Object.assign(values,state);calls.push(['restore']);},
    createLinearGradient(...args){return gradient('linear',args);},createRadialGradient(...args){return gradient('radial',args);},
    measureText:text=>({width:String(text).length*8}),drawImage(...args){calls.push(['image',...args]);if(api.failImage)throw new Error('lost decoded pixels');}};
  return new Proxy(api,{get:(o,key)=>key in o?o[key]:key in values?values[key]:(...args)=>{for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n),String(key));calls.push([key,...args]);},set:(o,key,value)=>{if(key in o)o[key]=value;else values[key]=value;return true;}});
}
function fixture(loadImage,Class=DreamGame){
  const c=context(),events=[],hud=[],capEvents=[];
  const game=new Class({getContext:()=>c,getBoundingClientRect:()=>({width:1100,height:640})},{onEvent:e=>events.push(e),onHud:e=>hud.push(e),onCapEvent:e=>capEvents.push(e)},{loadImage});
  return {game,c,events,hud,capEvents};
}
const tick=(game,frames=1)=>{for(let frame=0;frame<frames;frame++)game.update(1/60);};
const counts=h=>[h.events.length,h.hud.length,h.capEvents.length];
const physical=game=>JSON.stringify({snapshot:game.getSnapshot(),body:game.body,soul:game.soul,input:game.input,cap:game.cap,capScene:game.capScene,camera:game.camera,level:game.level,particles:game.particles,awakening:game.storyAwakenings,visualTime:game.visualTime});
function render(h){h.c.calls.length=0;h.game.render();assert.equal(h.c.stack.length,0);return structuredClone(h.c.calls);}
function fallback(h){
  const expected=context(),g=h.game,t=g.options.reducedMotion?0:g.visualTime;
  BaseGame.prototype.drawBackground.call(g,expected,g.viewWidth,640,t);h.c.calls.length=0;g.drawBackground(h.c,g.viewWidth,640,t);
  assert.deepEqual(h.c.calls.slice(-expected.calls.length),expected.calls,'complete original greenhouse background must follow a failed image attempt');
  expected.calls.length=0;h.c.calls.length=0;BaseGame.prototype.drawArchitecture.call(g,expected,t);g.drawArchitecture(h.c,t);
  assert.deepEqual(h.c.calls,expected.calls,'glasshouse ribs and plants remain on fallback');assert.equal(g.greenhousePaintedFrame,false);assert.equal(g.paintedFrame,false);assert.equal(h.c.stack.length,0);
}
function collectSeed(g){
  g.setInput({x:1,y:0});for(let frame=0;frame<240&&g.body.x<600;frame++)tick(g);
  g.setInput({x:0,y:0});tick(g,10);assert.ok(g.body.x>=600&&g.body.x<700);
  assert.equal(g.toggleSoul(),true);const seed=g.memories[1];
  for(let frame=0;frame<240&&!seed.collected;frame++){g.setInput({x:Math.max(-1,Math.min(1,(seed.x-g.soul.x)/60)),y:Math.max(-1,Math.min(1,(seed.y-g.soul.y)/60))});tick(g);}
  g.setInput({x:0,y:0});assert.equal(seed.collected,true);assert.equal(g.greenhousePlant.phase,'held');
}

test('greenhouse and station requests are separate, lazy, reusable and chapter-specific',async()=>{
  const sources=[],h=fixture(src=>{sources.push(src);return image;});assert.deepEqual(sources,[]);
  h.game.start({chapterIndex:1,sound:false});await h.game.greenhouseScenes.request(greenhouse);
  assert.deepEqual(sources,[PAINTED_GREENHOUSE_URL]);assert.equal(h.game.paintedScenes.getSnapshot().status,'idle');render(h);
  assert.equal(h.game.greenhousePaintedFrame,true);assert.equal(h.game.paintedFrame,false);assert.equal(h.game.getPaintedStationImage(),null);
  h.game.restart();await h.game.greenhouseScenes.request(greenhouse);assert.equal(sources.length,1);
  h.game.start({sound:false});await h.game.paintedScenes.request(station);render(h);
  assert.deepEqual(sources,[PAINTED_GREENHOUSE_URL,PAINTED_STATION_URL]);assert.equal(h.game.getPaintedGreenhouseImage(),null);assert.equal(h.game.paintedFrame,true);assert.equal(h.game.greenhousePaintedFrame,false);
  h.game.start({chapterIndex:1,sound:false});render(h);assert.equal(h.game.greenhousePaintedFrame,true);assert.equal(sources.length,2);h.game.destroy();
});

test('a late greenhouse image cannot paint the chapter or festival entered while it loaded',async()=>{
  const later=deferred(),h=fixture(src=>src===PAINTED_GREENHOUSE_URL?later.promise:image);
  h.game.start({chapterIndex:1,sound:false});await Promise.resolve();const requested=h.game.greenhouseScenes.request(greenhouse);
  h.game.start({chapterIndex:2,sound:false});const before=physical(h.game),events=counts(h);later.resolve(image);assert.equal(await requested,true);
  render(h);assert.equal(physical(h.game),before);assert.deepEqual(counts(h),events);assert.equal(h.game.getPaintedGreenhouseImage(),null);assert.equal(h.game.greenhousePaintedFrame,false);
  h.game.start({festival:getFestival('spring'),sound:false});render(h);assert.equal(h.game.greenhousePaintedFrame,false);assert.equal(h.game.getPaintedGreenhouseImage(),null);h.game.destroy();
});

test('pending, rejected and failed drawing retain the complete base greenhouse scenery',async()=>{
  for(const rejected of [false,true]){
    const later=deferred(),h=fixture(()=>later.promise);h.game.start({chapterIndex:1,sound:false});await Promise.resolve();
    const request=h.game.greenhouseScenes.request(greenhouse);if(rejected){later.reject(new Error('offline'));assert.equal(await request,false);}
    fallback(h);h.game.lightSeal(1);fallback(h);h.game.destroy();if(!rejected){later.resolve(image);assert.equal(await request,false);}
  }
  const h=fixture(()=>image);h.game.start({chapterIndex:1,sound:false});await h.game.greenhouseScenes.request(greenhouse);render(h);
  const before=physical(h.game),events=counts(h);h.c.failImage=true;render(h);fallback(h);assert.equal(physical(h.game),before);assert.deepEqual(counts(h),events);
  h.c.failImage=false;render(h);assert.equal(h.game.greenhousePaintedFrame,true);assert.equal(physical(h.game),before);h.game.destroy();
});

test('new materials and traveler animation retain the exact inherited walk, mushroom launch, seed and collision simulation',()=>{
  const a=fixture(),b=fixture(undefined,BaseGame);a.game.start({chapterIndex:1,sound:false});b.game.start({chapterIndex:1,sound:false});
  let bounced=false,found=false,frames=0;
  const step=x=>{
    for(const {game} of [a,b]){game.setInput({x,y:0});game.update(1/60);}
    if(a.game.pads[0].boing>0)bounced=true;if(a.game.memories[1].collected)found=true;
    assert.equal(physical(a.game),physical(b.game));
    if(frames++%30===0){const before=physical(a.game);render(a);assert.equal(physical(a.game),before);}
  };
  // Approach and stop before the pad, then take the authored running launch.
  // A continuous full-speed run has a different ballistic seed intersection.
  for(let frame=0;frame<600;frame++){
    const dx=700-a.game.body.x;if(Math.abs(dx)<1&&Math.abs(a.game.body.vx)<8)break;
    step(Math.max(-1,Math.min(1,dx/40)));
  }
  assert.ok(Math.abs(a.game.body.x-700)<1);for(let frame=0;frame<10;frame++)step(0);
  for(let frame=0;frame<240;frame++)step(1);
  assert.equal(bounced,true,'the actual mushroom must be reached');assert.equal(found,true,'the authored launch must still pass the seed');a.game.destroy();b.game.destroy();
});

test('an old head flower never lights new-run windows, and the second lamp can illuminate its pane first',async()=>{
  const h=fixture(()=>image);h.game.start({chapterIndex:1,sound:false,firstTicketCollected:true,greenhouseRecord:{memories:[1],seals:[0,1]}});await h.game.greenhouseScenes.request(greenhouse);
  assert.equal(h.game.greenhousePlant.stage,3);assert.equal(h.game.getSnapshot().seals,0);assert.equal(h.game.exitReady(),false);
  const background=()=>{h.c.calls.length=0;h.game.drawBackground(h.c,h.game.viewWidth,640,0);return structuredClone(h.c.calls);};
  const assertWindows=lit=>{const expected=context();drawPaintedGreenhouseLights(expected,h.game.getSceneBackdropView(),lit);const calls=background();assert.deepEqual(calls.slice(-expected.calls.length),expected.calls);return calls;};
  const dark=assertWindows([false,false]);h.game.lightSeal(1);const second=assertWindows([false,true]);assert.notDeepEqual(second,dark);assert.equal(h.game.exitReady(),false);
  assert.equal(h.game.getStoryAwakeningViews()[0].kind,'greenhouse-sesame');h.game.lightSeal(0);assertWindows([true,true]);assert.equal(h.game.exitReady(),true);h.game.destroy();
});

test('real seed collection and paused recall survive late image readiness without extra rewards or premature planting',async()=>{
  const later=deferred(),h=fixture(()=>later.promise);h.game.start({chapterIndex:1,sound:false});collectSeed(h.game);
  h.game.recall();tick(h.game,10);assert.equal(h.game.greenhousePlant.phase,'returning');h.game.pause();
  const before=physical(h.game),events=counts(h);later.resolve(image);await h.game.greenhouseScenes.request(greenhouse);
  const first=render(h);tick(h.game,120);assert.deepEqual(render(h),first);assert.equal(physical(h.game),before);assert.deepEqual(counts(h),events);
  h.game.resume();tick(h.game,60);assert.equal(h.game.greenhousePlant.phase,'planted');assert.equal(h.game.greenhousePlant.stage,1);
  assert.equal(h.capEvents.filter(e=>e.type==='memory'&&e.index===1).length,1);h.game.destroy();
});

test('painted greenhouse pause and reduced motion share existing simulation time and state',async()=>{
  const h=fixture(()=>image);h.game.start({chapterIndex:1,sound:false});await h.game.greenhouseScenes.request(greenhouse);
  h.game.setInput({x:1});tick(h.game,188);h.game.setInput({x:0});h.game.pause();const before=physical(h.game),frame=render(h);tick(h.game,100);assert.deepEqual(render(h),frame);assert.equal(physical(h.game),before);
  h.game.setReducedMotion(true);const still=render(h);h.game.visualTime+=100;assert.deepEqual(render(h),still);h.game.destroy();
});

test('the final story chapter and all festivals retain the exact prior renderer after both paintings were cached',async()=>{
  const a=fixture(()=>image),b=fixture(undefined,BaseGame);a.game.start({sound:false});await a.game.paintedScenes.request(station);a.game.start({chapterIndex:1,sound:false});await a.game.greenhouseScenes.request(greenhouse);
  const scenes=FESTIVAL_LEVELS.map(level=>({festival:getFestival(level.festivalId)})); // Sixth chapter has new art; festivals retain their renderer.
  for(const options of scenes){a.game.start({sound:false,...options});b.game.start({sound:false,...options});assert.deepEqual(render(a),render(b));assert.equal(a.game.getPaintedGreenhouseImage(),null);assert.equal(a.game.greenhousePaintedFrame,false);}
  a.game.destroy();b.game.destroy();
});

test('destroy cancels early and late greenhouse callbacks without resurrecting either cache',async()=>{
  for(const started of [false,true])for(const reject of [false,true]){
    const later=deferred();let loads=0;const h=fixture(()=>{loads++;return later.promise;});h.game.start({chapterIndex:1,sound:false});const request=h.game.greenhouseScenes.request(greenhouse);
    if(started)await Promise.resolve();h.game.destroy();const before=counts(h);if(reject&&started)later.reject(new Error('late failure'));else later.resolve(image);
    assert.equal(await request,false);assert.equal(loads,started?1:0);h.game.start({chapterIndex:1,sound:false});h.game.update(1/60);assert.deepEqual(render(h),[]);
    assert.deepEqual(counts(h),before);assert.equal(h.game.state,'destroyed');assert.equal(h.game.greenhouseScenes.getSnapshot().status,'destroyed');assert.equal(h.game.paintedScenes.getSnapshot().status,'destroyed');assert.equal(h.game.getPaintedGreenhouseImage(),null);
  }
});
