import test from 'node:test';
import assert from 'node:assert/strict';
import {DreamGame} from '../dist/dream-engine.js';
import {DreamGame as BaseGame} from '../dist/dream-engine-base.js';
import {createLibrarySceneAssets,drawPaintedLibrary,drawPaintedLibraryLights,getPaintedLibraryLayout,eligibleLibrary,LIBRARY_PAINT_URL} from '../dist/dream-library-scene.js';
import {drawLibraryPlatform} from '../dist/dream-library-finish.js';
const noop=()=>{};
globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
const scene={mode:'story',chapterIndex:3},image={complete:true,naturalWidth:2172,naturalHeight:724};
function context(){
 const calls=[],stack=[],values={globalAlpha:1,fillStyle:'#000'};
 const c={calls,stack,fail:false,save(){stack.push({...values});calls.push(['save']);},restore(){assert.ok(stack.length);Object.assign(values,stack.pop());calls.push(['restore']);},
 createLinearGradient(){return{addColorStop(){}};},createRadialGradient(){calls.push(['radial']);return{addColorStop(){}};},
 drawImage(...args){calls.push(['image',...args]);if(c.fail)throw Error('texture unavailable');},
 measureText:t=>({width:t.length*8})};
 return new Proxy(c,{get:(o,k)=>k in o?o[k]:k in values?values[k]:(...args)=>{calls.push([k,...args]);},
 set:(o,k,v)=>{if(k in o)o[k]=v;else values[k]=v;return true;}});
}
test('library assets are strictly story chapter 4, lazy and not reused for festivals',async()=>{
 const sources=[],assets=createLibrarySceneAssets({loadImage:s=>{sources.push(s);return image;}});
 assert.match(LIBRARY_PAINT_URL,/library-painted-v26\.webp$/);
 assert.equal(eligibleLibrary(scene),true);
 for(const x of [{mode:'festival',chapterIndex:3},{mode:'story',chapterIndex:2},{mode:'story',chapterIndex:4}]){
   assert.equal(await assets.request(x),false);assert.equal(assets.getImage(x),null);
 }
 assert.deepEqual(sources,[]);assert.equal(await assets.request(scene),true);
 assert.deepEqual(sources,[LIBRARY_PAINT_URL]);assert.equal(assets.getImage(scene),image);
 assets.destroy();assert.equal(assets.getImage(scene),null);
 const fail=createLibrarySceneAssets({loadImage:()=>{throw Error('offline');}});
 assert.equal(await fail.request(scene),false);assert.equal(await fail.request(scene),false);assert.equal(fail.getSnapshot().status,'error');fail.destroy();
});
test('paint layout remains inside screen at both camera endpoints and drawable failure balances state',()=>{
 const v={worldWidth:2340,cameraX:1900,viewport:{width:320,top:0,bottom:680}};
 const l=getPaintedLibraryLayout(v);assert.ok(l.x<=0&&l.x+l.width>=320);
 const c=context();assert.equal(drawPaintedLibrary(c,v,image),true);assert.equal(c.stack.length,0);
 c.fail=true;assert.equal(drawPaintedLibrary(c,v,image),false);assert.equal(c.stack.length,0);
 assert.equal(drawPaintedLibrary(c,v,{complete:true,naturalWidth:0,naturalHeight:724}),false);
});
test('two real lamp signals have isolated drawing and no false glow for unlit lamps',()=>{
 const v={worldWidth:2340,cameraX:700,viewport:{width:1280,top:0,bottom:800}},c=context();
 const count=a=>{c.calls.length=0;drawPaintedLibraryLights(c,v,a);assert.equal(c.stack.length,0);return c.calls.filter(x=>x[0]==='translate').map(x=>x.slice(1));};
 assert.deepEqual(count([0,0]),[]);const first=count([1,0]),last=count([0,1]);
 assert.equal(first.length,1);assert.equal(last.length,1);assert.notDeepEqual(first,last);
 assert.deepEqual(count([1,1]),[...first,...last]);
});
test('floating book surface is exactly the physical rectangle; detail stays inside clip',()=>{
 const c=context(),p={kind:'book',x:615,y:477,w:155,h:18};
 assert.equal(drawLibraryPlatform(c,p,{camera:490,viewWidth:390}),true);assert.equal(c.stack.length,0);
 assert.ok(c.calls.some(x=>x[0]==='rect'&&x.slice(1).join(',')==='615,477,155,18'));
 assert.equal(drawLibraryPlatform(c,{...p,y:Infinity}),false);
});
test('real chapter 4 inputs preserve base physics; lamp animation freezes, resets and reduced motion settles',async()=>{
 const c=context(),a=new DreamGame({getContext:()=>c,getBoundingClientRect:()=>({width:1100,height:640})},{},{loadLibraryImage:()=>image});
 const b=new BaseGame({getContext:()=>context(),getBoundingClientRect:()=>({width:1100,height:640})});
 a.start({chapterIndex:3,sound:false});b.start({chapterIndex:3,sound:false});await a.libraryScenes.request(scene);
 for(let i=0;i<140;i++){const input={x:i<95?1:0,y:0};a.setInput(input);b.setInput(input);a.update(1/60);b.update(1/60);
  assert.deepEqual({body:a.body,movers:a.movers,lanterns:a.lanterns},{body:b.body,movers:b.movers,lanterns:b.lanterns});}
 a.render();assert.equal(a.libraryPaintedFrame,true);assert.equal(c.stack.length,0);
 a.lightSeal(1);a.update(1/60);assert.equal(a.libraryLight.amounts[0],0);assert.ok(a.libraryLight.amounts[1]>0);
 a.pause();const frozen=a.libraryLight.amounts.slice();for(let i=0;i<10;i++)a.update(1/60);assert.deepEqual(a.libraryLight.amounts,frozen);
 a.setReducedMotion(true);assert.deepEqual(a.libraryLight.amounts,[0,1]);a.resume();a.restart();assert.deepEqual(a.libraryLight.amounts,[0,0]);
 a.start({festival:{id:'christmas'},sound:false});assert.equal(a.getPaintedLibraryImage(),null);
 a.start({festival:{id:'qixi'},sound:false});assert.equal(a.getPaintedLibraryImage(),null);
 a.destroy();b.destroy();
});
