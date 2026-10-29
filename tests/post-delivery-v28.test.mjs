import test from 'node:test';
import assert from 'node:assert/strict';
import {DreamGame} from '../dist/dream-engine.js';
import {DreamGame as BaseGame} from '../dist/dream-engine-base.js';
import {createPostDelivery,beginPostReturn,advancePostDelivery,postDeliveryView} from '../dist/dream-post-delivery.js';
import {eligiblePost,createPostSceneAssets,drawPaintedPost,getPaintedPostLayout} from '../dist/dream-post-scene.js';
import {drawPostPlatform,drawPostMushroom,drawPostExit} from '../dist/dream-post-finish.js';
const noop=()=>{};
globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
function context(){
 const calls=[],stack=[];let props={};
 const ctx={calls,save(){stack.push({...props});calls.push(['save']);},restore(){assert.ok(stack.length);props=stack.pop();calls.push(['restore']);},
 createLinearGradient(...a){return gradient(a);},createRadialGradient(...a){return gradient(a);},measureText:s=>({width:s.length*8})};
 function gradient(a){assert.ok(a.every(Number.isFinite));return{addColorStop:(p,color)=>{assert.ok(Number.isFinite(p));calls.push(['stop',p,color]);}};}
 return new Proxy(ctx,{get(o,k){if(k in o)return o[k];if(k in props)return props[k];return(...a)=>{for(const x of a)if(typeof x==='number')assert.ok(Number.isFinite(x));calls.push([k,...a]);};},set(o,k,v){props[k]=v;return true;}});
}
function game(chapter=5,options={},Class=DreamGame){
 const c=context(),events=[],cap=[],complete=[];
 const g=new Class({getContext:()=>c,getBoundingClientRect:()=>({width:1100,height:640})},
 {onEvent:e=>events.push(e),onCapEvent:e=>cap.push(e),onComplete:e=>complete.push(e)});
 g.start({chapterIndex:chapter,sound:false,...options});return{g,c,events,cap,complete};
}
const tick=(g,n)=>{for(let i=0;i<n;i++)g.update(1/60);};
const lit=g=>{g.lightSeal(0);g.lightSeal(1);tick(g,25);};
const physics=g=>JSON.stringify({time:g.time,body:g.body,soul:g.soul,form:g.form,energy:g.energy,deaths:g.deaths,lamps:g.lanterns,memories:g.memories,hazards:g.hazards,pads:g.pads,plate:[...g.plateState],state:g.state,complete:g.completed});

test('scene loads only in actual sixth story chapter; all camera endpoints remain covered',async()=>{
 for(let i=0;i<6;i++)assert.equal(eligiblePost({mode:'story',chapterIndex:i}),i===5);
 assert.equal(eligiblePost({mode:'festival',chapterIndex:5}),false);
 let loads=0;const image={complete:true,naturalWidth:2172,naturalHeight:724};
 const scene=createPostSceneAssets({loadImage:()=>{loads++;return image;}});
 assert.equal(await scene.request({mode:'festival',chapterIndex:5}),false);assert.equal(loads,0);
 assert.equal(await scene.request({mode:'story',chapterIndex:5}),true);assert.equal(loads,1);
 for(const width of [1100,390,320])for(const cameraX of [0,700,1600,2680]){
  const view={worldWidth:2680,cameraX,viewport:{width,top:-130,bottom:720}};
  const before=structuredClone(view),layout=getPaintedPostLayout(view);
  assert.ok(layout.x<=0&&layout.x+layout.width>=width-1e-8);
  assert.equal(drawPaintedPost(context(),view,image),true);assert.deepEqual(view,before);
 }
 scene.destroy();assert.equal(scene.getImage({mode:'story',chapterIndex:5}),null);
});

test('post supports, actual mushroom and exit draw within finite geometry',()=>{
 const c=context();for(const kind of ['ground','book','root']){
  assert.equal(drawPostPlatform(c,{kind,x:700,y:465,w:190,h:20},{camera:680,viewWidth:400}),true);
 }
 assert.equal(drawPostPlatform(c,{kind:'air',x:0,y:0,w:12,h:15}),false);
 assert.equal(drawPostMushroom(c,{x:1450,y:560,w:115,boing:.3},0),true);
 assert.equal(drawPostExit(c,{x:2540,y:560},true,[true,true]),true);
});

test('delivery state requires both lamps, same run/body and the actual returning cap',()=>{
 const s=createPostDelivery(),body={};const lamps=[{lit:true},{lit:true}],cap={phase:'returning',age:0};
 assert.equal(beginPostReturn(s,{eligible:false,lamps,run:1,body,cap}),false);
 assert.equal(beginPostReturn(s,{eligible:true,lamps:[lamps[0],{lit:false}],run:1,body,cap}),false);
 assert.equal(beginPostReturn(s,{eligible:true,lamps,run:1,body,cap}),true);
 assert.equal(postDeliveryView(s).phase,'returning');
 advancePostDelivery(s,{eligible:true,lamps,run:1,body,cap:{...cap,age:.47}});
 assert.equal(s.phase,'returning');
 advancePostDelivery(s,{eligible:true,lamps,run:1,body,cap:{...cap,age:.49}});
 assert.equal(s.phase,'settled');
});

test('one lamp, normal recall, early reopening and settled reopening observe the true rig',()=>{
 const a=game();assert.equal(a.g.getPostDeliveryView().phase,'waiting');a.g.lightSeal(0);tick(a.g,20);
 assert.equal(a.g.getPostDeliveryView().phase,'waiting');
 a.g.toggleSoul();tick(a.g,50);a.g.recall();tick(a.g,35);
 assert.equal(a.g.getPostDeliveryView().phase,'waiting');
 a.g.lightSeal(1);tick(a.g,25);assert.equal(a.g.getPostDeliveryView().phase,'ready');
 a.g.toggleSoul();tick(a.g,50);assert.equal(a.g.recall(),true);
 tick(a.g,12);assert.equal(a.g.toggleSoul(),true);assert.equal(a.g.getPostDeliveryView().phase,'ready');
 tick(a.g,55);assert.equal(a.g.recall(),true);tick(a.g,30);
 assert.equal(a.g.getPostDeliveryView().phase,'settled');
 a.g.toggleSoul();tick(a.g,45);a.g.recall();assert.equal(a.g.getPostDeliveryView().phase,'settled');
 a.g.restart();assert.equal(a.g.getPostDeliveryView().phase,'waiting');a.g.destroy();
});

test('pause and reduced motion respect in-game time, not a separate animation clock',()=>{
 const a=game();lit(a.g);a.g.toggleSoul();tick(a.g,50);a.g.recall();tick(a.g,8);
 assert.equal(a.g.getPostDeliveryView().phase,'returning');const age=a.g.cap.age;
 assert.equal(a.g.pause(),true);tick(a.g,100);assert.equal(a.g.cap.age,age);
 assert.equal(a.g.getPostDeliveryView().phase,'returning');a.g.resume();a.g.setReducedMotion(true);
 assert.equal(a.g.getPostDeliveryView().phase,'settled');a.g.destroy();
 const b=game(5,{reducedMotion:true});lit(b.g);b.g.toggleSoul();b.g.recall();
 assert.equal(b.g.getPostDeliveryView().phase,'settled');b.g.destroy();
});

test('post decorative logic never changes physics or duplicates original game events',()=>{
 const a=game(),b=game(5,{},BaseGame);
 for(const h of [a,b]){lit(h.g);h.g.toggleSoul();tick(h.g,55);h.g.recall();tick(h.g,45);}
 assert.equal(physics(a.g),physics(b.g));assert.deepEqual(a.events,b.events);assert.deepEqual(a.cap,b.cap);
 assert.deepEqual(a.complete,b.complete);a.g.destroy();b.g.destroy();
});

test('original exit takes precedence over an unfinished stamp; only one completion',()=>{
 const a=game();lit(a.g);a.g.toggleSoul();tick(a.g,50);
 a.g.body.x=2510;a.g.body.y=560;a.g.body.invulnerable=2;
 assert.equal(a.g.recall(),true);tick(a.g,1);
 assert.equal(a.g.completed,true);assert.equal(a.complete.length,1);
 assert.equal(a.g.getPostDeliveryView().phase,'waiting');tick(a.g,20);
 assert.equal(a.complete.length,1);a.g.destroy();
});

test('previous chapters and festival never request post art or show post stamp',()=>{
 for(const chapter of [0,1,2,3,4]){
  const a=game(chapter);assert.equal(a.g.getPostDeliveryView(),null);
  assert.equal(a.g.getPaintedPostImage(),null);a.g.destroy();
 }
 const festival=game(5,{festival:{id:'halloween'}});
 assert.equal(festival.g.getPostDeliveryView(),null);festival.g.destroy();
});
