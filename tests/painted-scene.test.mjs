import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PAINTED_STATION_URL,PAINTED_STATION_CONFIG,getPaintedStationLayout,
  drawPaintedStation,createPaintedSceneAssets,
} from '../dist/dream-painted-scene.js';

const station=Object.freeze({mode:'story',chapterIndex:0});
const loadedImage=()=>Object.freeze({complete:true,naturalWidth:2172,naturalHeight:724});
const view=(width=1100,cameraX=0,extra={})=>({
  cameraX,viewport:{width,top:0,bottom:640},worldWidth:2020,...extra,
});
const near=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<1e-8,`${message||'number'}: ${actual} != ${expected}`);
const deferred=()=>{
  let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
  return {promise,resolve,reject};
};

function context({fail=false}={}){
  const original={globalAlpha:.37,globalCompositeOperation:'multiply',imageSmoothingEnabled:false,imageSmoothingQuality:'low'};
  const stack=[],calls=[];
  return {
    ...original,calls,
    save(){stack.push(Object.fromEntries(Object.keys(original).map(key=>[key,this[key]])));calls.push(['save']);},
    restore(){assert.ok(stack.length,'unbalanced restore');Object.assign(this,stack.pop());calls.push(['restore']);},
    drawImage(...args){calls.push(['drawImage',...args]);assert.equal(this.globalAlpha,1);assert.equal(this.globalCompositeOperation,'source-over');assert.equal(this.imageSmoothingEnabled,true);assert.equal(this.imageSmoothingQuality,'high');if(fail)throw new Error('not a usable Canvas image');},
    assertRestored(){assert.equal(stack.length,0);for(const [key,value]of Object.entries(original))assert.equal(this[key],value,key);},
  };
}

test('painting URL is module-relative and its geometry contract is immutable',()=>{
  assert.equal(PAINTED_STATION_URL,new URL('../dist/assets/station-painted-v16.webp',import.meta.url).href);
  assert.equal(PAINTED_STATION_CONFIG.parallax,.28);
  assert.ok(Object.isFrozen(PAINTED_STATION_CONFIG));
  const source=view(),before=structuredClone(source),layout=getPaintedStationLayout(source);
  assert.ok(Object.isFrozen(layout));assert.deepEqual(source,before);
});

test('real desktop and phone Canvas sizes preserve aspect and cover both camera endpoints',()=>{
  for(const [cssWidth,cssHeight]of [[1100,640],[1920,640],[1920,1080],[320,431],[390,595]]){
    const scale=cssHeight/640,width=cssWidth/scale,range=Math.max(0,2020-width);
    for(const cameraX of [0,range/2,range]){
      const layout=getPaintedStationLayout(view(width,cameraX));
      near(layout.width/layout.height,3,'painting aspect');
      assert.ok(layout.x<=1e-8,'left edge exposed');
      assert.ok(layout.x+layout.width>=width-1e-8,'right edge exposed');
      assert.ok(layout.y<=0&&layout.y+layout.height>=640,'authored vertical area exposed');
      const backgroundGround=layout.y+.78*layout.height;
      assert.ok(backgroundGround>=499.2-1e-8&&backgroundGround<=500+1e-8,'painted ground must stay about 60 logical pixels behind walkable y=560');
    }
    const start=getPaintedStationLayout(view(width));
    const clockX=(start.x+.613*start.width)*scale;
    assert.ok(clockX>cssWidth*.5&&clockX<cssWidth*.7,'main clock missing from opening composition');
  }
});

test('camera moves the painting by exactly 0.28 and invalid overscroll is clamped',()=>{
  const start=getPaintedStationLayout(view()),moved=getPaintedStationLayout(view(1100,300));
  near(moved.x-start.x,-300*.28);
  assert.deepEqual(getPaintedStationLayout(view(1100,-100)),start);
  assert.deepEqual(getPaintedStationLayout(view(1100,5000)),getPaintedStationLayout(view(1100,920)));
  const wide=getPaintedStationLayout(view(2400,100));
  assert.equal(wide.scrollRange,0);assert.equal(wide.cameraX,0);assert.equal(wide.x,0);assert.equal(wide.width,2400);
});

test('extra portrait framing does not stretch or move the painted station',()=>{
  const normal=getPaintedStationLayout(view(400,300));
  const portrait=getPaintedStationLayout(view(400,300,{viewport:{width:400,top:-140,bottom:780}}));
  assert.deepEqual(portrait,normal);
});

test('malformed dimensions are rejected before any Canvas operation',()=>{
  const bad=[null,{},view(0),view(-1),view(NaN),view(Infinity),view(1100,Infinity),
    view(1100,0,{worldWidth:0}),view(1100,0,{worldWidth:NaN}),
    view(1100,0,{viewport:{width:1100,top:0,bottom:0}}),
    view(1100,0,{viewport:{width:1100,top:-Infinity,bottom:640}})];
  for(const source of bad){const c=context();assert.equal(getPaintedStationLayout(source),null);assert.equal(drawPaintedStation(c,source,loadedImage()),false);assert.deepEqual(c.calls,[]);}
});

test('drawing uses one screen-space image without changing source objects or Canvas state',()=>{
  const source=Object.freeze({...view(),viewport:Object.freeze(view().viewport),clearZones:Object.freeze([{x:105,y:520,r:56}])});
  const image=loadedImage(),before=JSON.stringify(source),layout=getPaintedStationLayout(source),c=context();
  assert.equal(drawPaintedStation(c,source,image),true);
  assert.deepEqual(c.calls,[['save'],['drawImage',image,layout.x,layout.y,layout.width,layout.height],['restore']]);
  c.assertRestored();assert.equal(JSON.stringify(source),before);
  const second=context();assert.equal(drawPaintedStation(second,source,image),true);assert.deepEqual(second.calls,c.calls,'paused or reduced-motion callers need no presentation clock');
});

test('unloaded and broken images fall back, including Canvas draw failures',()=>{
  for(const image of [null,{}, {complete:false,naturalWidth:2172,naturalHeight:724},
    {complete:true,width:2172,height:724,naturalWidth:0,naturalHeight:0},
    {width:0,height:724},{width:2172,height:NaN}]){
    const c=context();assert.equal(drawPaintedStation(c,view(),image),false);assert.deepEqual(c.calls,[]);
  }
  const c=context({fail:true});assert.equal(drawPaintedStation(c,view(),loadedImage()),false);c.assertRestored();
  assert.deepEqual(c.calls.map(call=>call[0]),['save','drawImage','restore']);
  assert.equal(drawPaintedStation(null,view(),loadedImage()),false);
  assert.equal(drawPaintedStation(context(),view(),{width:2172,height:724}),true,'offline Canvas images do not require DOM-only fields');
});

test('asset requests are lazy, guarded to story chapter zero, and share one attempt',async()=>{
  const pending=deferred(),image=loadedImage(),sources=[];
  const assets=createPaintedSceneAssets({src:'test/station.png',loadImage:src=>{sources.push(src);return pending.promise;}});
  assert.deepEqual(assets.getSnapshot(),{status:'idle'});assert.ok(Object.isFrozen(assets.getSnapshot()));
  for(const scene of [undefined,{}, {mode:'festival',chapterIndex:0},{mode:'story',chapterIndex:1},{mode:'story',chapterIndex:'0'}]){
    assert.equal(await assets.request(scene),false);assert.equal(assets.getImage(scene),null);
  }
  assert.deepEqual(sources,[]);assert.deepEqual(assets.getSnapshot(),{status:'idle'});
  const first=assets.request(station),second=assets.request(station);
  assert.equal(first,second);assert.deepEqual(assets.getSnapshot(),{status:'loading'});assert.equal(assets.getImage(station),null);
  await Promise.resolve();assert.deepEqual(sources,['test/station.png']);
  pending.resolve(image);assert.equal(await first,true);assert.equal(assets.getImage(station),image);
  assert.equal(assets.getImage({mode:'festival',chapterIndex:0}),null);assert.equal(assets.getImage({mode:'story',chapterIndex:2}),null);
  assert.equal(assets.request(station),first);assert.equal(await assets.request(station),true);assert.equal(sources.length,1);
  assert.deepEqual(assets.getSnapshot(),{status:'ready'});
});

test('loader rejection, synchronous throws and invalid pixels fail once and stay on fallback',async()=>{
  for(const failure of [()=>Promise.reject(new Error('offline')),()=>{throw new Error('decode failed');},()=>({naturalWidth:0,naturalHeight:0,complete:true}),()=>({width:2172,height:724,complete:false})]){
    let count=0;const assets=createPaintedSceneAssets({loadImage:()=>{count++;return failure();}});
    assert.equal(await assets.request(station),false);assert.equal(assets.getImage(station),null);
    assert.deepEqual(assets.getSnapshot(),{status:'error'});
    assert.equal(await assets.request(station),false);assert.equal(count,1);
  }
  const bad=createPaintedSceneAssets({loadImage:null});assert.equal(await bad.request(station),false);assert.deepEqual(bad.getSnapshot(),{status:'error'});
});

test('destroyed assets cannot load or be resurrected by a late success or rejection',async()=>{
  for(const reject of [false,true]){
    const pending=deferred();let calls=0;
    const assets=createPaintedSceneAssets({loadImage:()=>{calls++;return pending.promise;}});
    const request=assets.request(station);await Promise.resolve();assets.destroy();
    if(reject)pending.reject(new Error('late network failure'));else pending.resolve(loadedImage());
    assert.equal(await request,false);assert.deepEqual(assets.getSnapshot(),{status:'destroyed'});
    assert.equal(assets.getImage(station),null);assert.equal(await assets.request(station),false);assert.equal(calls,1);
    assets.destroy();assert.deepEqual(assets.getSnapshot(),{status:'destroyed'});
  }
  let calls=0;const assets=createPaintedSceneAssets({loadImage:()=>{calls++;return loadedImage();}});
  const request=assets.request(station);assets.destroy();assert.equal(await request,false);assert.equal(calls,0,'destroy before the first microtask must skip the request');
});

test('destroy releases a ready image and never retries it',async()=>{
  let calls=0;const assets=createPaintedSceneAssets({loadImage:()=>{calls++;return loadedImage();}});
  assert.equal(await assets.request(station),true);assets.destroy();
  assert.equal(assets.getImage(station),null);assert.equal(await assets.request(station),false);assert.equal(calls,1);
});

test('default loading is harmless when the browser Image constructor is unavailable',async()=>{
  const original=Object.getOwnPropertyDescriptor(globalThis,'Image');
  try{
    delete globalThis.Image;
    const assets=createPaintedSceneAssets();assert.deepEqual(assets.getSnapshot(),{status:'idle'});
    assert.equal(await assets.request({mode:'story',chapterIndex:1}),false);assert.deepEqual(assets.getSnapshot(),{status:'idle'});
    assert.equal(await assets.request(station),false);assert.deepEqual(assets.getSnapshot(),{status:'error'});assert.equal(assets.getImage(station),null);
  }finally{if(original)Object.defineProperty(globalThis,'Image',original);else delete globalThis.Image;}
});

test('native loading sets handlers before src and clears them after success or error',async()=>{
  const original=Object.getOwnPropertyDescriptor(globalThis,'Image');
  try{
    for(const succeeds of [true,false]){
      let calls=0,last;
      globalThis.Image=class {
        constructor(){calls++;last=this;this.complete=false;this.naturalWidth=0;this.naturalHeight=0;}
        set src(value){this.source=value;assert.equal(typeof this.onload,'function');assert.equal(typeof this.onerror,'function');queueMicrotask(()=>{this.complete=true;if(succeeds){this.naturalWidth=2172;this.naturalHeight=724;this.onload();}else this.onerror();});}
      };
      const assets=createPaintedSceneAssets();assert.equal(calls,0);
      assert.equal(await assets.request(station),succeeds);assert.equal(calls,1);assert.equal(last.source,PAINTED_STATION_URL);assert.equal(last.decoding,'async');
      assert.equal(last.onload,null);assert.equal(last.onerror,null);assert.equal(assets.getImage(station),succeeds?last:null);
      assert.equal(await assets.request(station),succeeds);assert.equal(calls,1);
    }
  }finally{if(original)Object.defineProperty(globalThis,'Image',original);else delete globalThis.Image;}
});
