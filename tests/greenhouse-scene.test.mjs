import test from 'node:test';
import assert from 'node:assert/strict';
import { createPaintedSceneAssets, PAINTED_STATION_URL } from '../dist/dream-painted-scene.js';
import { PAINTED_GREENHOUSE_URL, PAINTED_GREENHOUSE_CONFIG, PAINTED_GREENHOUSE_WINDOWS,
  createGreenhouseSceneAssets, getPaintedGreenhouseLayout, drawPaintedGreenhouse, drawPaintedGreenhouseLights } from '../dist/dream-greenhouse-scene.js';

const greenhouse=Object.freeze({mode:'story',chapterIndex:1}),station=Object.freeze({mode:'story',chapterIndex:0});
const picture=()=>Object.freeze({complete:true,naturalWidth:2172,naturalHeight:724});
const view=(width=1100,cameraX=0)=>({cameraX,viewport:{width,top:0,bottom:640},worldWidth:2180});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function context(fail=false){
  const calls=[],stack=[],initial={globalAlpha:.42,globalCompositeOperation:'multiply',imageSmoothingEnabled:false,imageSmoothingQuality:'low',lineWidth:2.4,fillStyle:'#102030'},values={...initial};
  const api={calls,save(){stack.push({...values});calls.push(['save']);},restore(){assert.ok(stack.length);const state=stack.pop();for(const key of Object.keys(values))delete values[key];Object.assign(values,state);calls.push(['restore']);},
    drawImage(...args){calls.push(['image',...args]);if(fail)throw new Error('invalid image');},
    createLinearGradient(...args){const stops=[];calls.push(['linear',...args,stops]);return {addColorStop:(...stop)=>stops.push(stop)};},
    createRadialGradient(...args){const stops=[];calls.push(['radial',...args,stops]);return {addColorStop:(...stop)=>stops.push(stop)};},
    restored(){assert.equal(stack.length,0);assert.deepEqual(values,initial);}};
  return new Proxy(api,{get:(o,key)=>key in o?o[key]:key in values?values[key]:(...args)=>{for(const arg of args)if(typeof arg==='number')assert.ok(Number.isFinite(arg));calls.push([key,...args]);},set:(o,key,value)=>{values[key]=value;return true;}});
}

test('greenhouse asset identity and measured windows are independent immutable scene data',()=>{
  assert.equal(PAINTED_GREENHOUSE_URL,new URL('../dist/assets/greenhouse-painted-v17.webp',import.meta.url).href);
  assert.notEqual(PAINTED_GREENHOUSE_URL,PAINTED_STATION_URL);assert.ok(Object.isFrozen(PAINTED_GREENHOUSE_CONFIG));
  assert.equal(PAINTED_GREENHOUSE_WINDOWS.length,2);assert.ok(Object.isFrozen(PAINTED_GREENHOUSE_WINDOWS));
  for(const pane of PAINTED_GREENHOUSE_WINDOWS){assert.ok(Object.isFrozen(pane));assert.ok(pane.w>0&&pane.h>0&&pane.x-pane.w/2>0&&pane.x+pane.w/2<1&&pane.y-pane.h>0&&pane.y<1);}
  assert.ok(PAINTED_GREENHOUSE_WINDOWS[0].x+PAINTED_GREENHOUSE_WINDOWS[0].w/2<.5);
  assert.ok(PAINTED_GREENHOUSE_WINDOWS[1].x-PAINTED_GREENHOUSE_WINDOWS[1].w/2>.5,'the main door is not a lamp window');
});

test('panorama preserves scale and the floor relationship across desktop, phone, and camera endpoints',()=>{
  for(const [width,height] of [[1100,640],[1920,640],[1920,1080],[320,431],[390,595]]){
    const scale=height/640,w=width/scale,range=Math.max(0,2180-w);
    for(const camera of [0,range*.5,range]){
      const input=view(w,camera),before=structuredClone(input),layout=getPaintedGreenhouseLayout(input);
      near(layout.width/layout.height,3);assert.ok(Object.isFrozen(layout));assert.deepEqual(input,before);
      assert.ok(layout.x<=1e-8&&layout.x+layout.width>=w-1e-8,'a camera endpoint exposes a horizontal image edge');
      assert.ok(layout.y<=0&&layout.y+layout.height>=560,'the image must cover the visible play area above ground');
      near(layout.y+layout.height*.79,500);
    }
    const opening=getPaintedGreenhouseLayout(view(w));const subject=(opening.x+opening.width*.5)/w;
    assert.ok(subject>=.49&&subject<=.63,'greenhouse entrance left the initial view');
  }
  const before=getPaintedGreenhouseLayout(view()),after=getPaintedGreenhouseLayout(view(1100,300));near(after.x-before.x,-84);
  assert.deepEqual(getPaintedGreenhouseLayout(view(1100,-1)),before);
  assert.deepEqual(getPaintedGreenhouseLayout(view(1100,10000)),getPaintedGreenhouseLayout(view(1100,1080)));
  assert.deepEqual(getPaintedGreenhouseLayout({...view(400,320),viewport:{width:400,top:-140,bottom:780}}),getPaintedGreenhouseLayout(view(400,320)));
});

test('a usable image paints once without source or Canvas mutation; failure restores the complete fallback contract',()=>{
  const source=Object.freeze({...view(),viewport:Object.freeze(view().viewport)}),image=picture(),before=JSON.stringify(source),layout=getPaintedGreenhouseLayout(source),c=context();
  assert.equal(drawPaintedGreenhouse(c,source,image),true);c.restored();assert.equal(JSON.stringify(source),before);
  assert.deepEqual(c.calls,[['save'],['image',image,layout.x,layout.y,layout.width,layout.height],['restore']]);
  const broken=context(true);assert.equal(drawPaintedGreenhouse(broken,source,image),false);broken.restored();
  for(const invalid of [null,{},view(0),view(NaN),{...view(),cameraX:Infinity}]){
    const empty=context();assert.equal(drawPaintedGreenhouse(empty,invalid,image),false);assert.deepEqual(empty.calls,[]);
  }
  for(const invalid of [null,{complete:false,width:2172,height:724},{complete:true,width:2172,height:724,naturalWidth:0,naturalHeight:0}])assert.equal(drawPaintedGreenhouse(context(),view(),invalid),false);
});

test('the two real lamp booleans illuminate separate windows even when the second is solved first',()=>{
  function paint(lit,source=view()){const c=context();drawPaintedGreenhouseLights(c,source,Object.freeze(lit));c.restored();return c.calls;}
  const windows=calls=>calls.filter(call=>call[0]==='linear');
  const dark=paint([false,false]),first=paint([true,false]),second=paint([false,true]),both=paint([true,true]);
  for(const calls of [dark,first,second,both])assert.equal(windows(calls).length,2);
  assert.notDeepEqual(windows(first)[0],windows(dark)[0]);assert.deepEqual(windows(first)[1],windows(dark)[1]);
  assert.deepEqual(windows(second)[0],windows(dark)[0]);assert.notDeepEqual(windows(second)[1],windows(dark)[1]);
  assert.deepEqual(windows(first)[0],windows(both)[0]);assert.deepEqual(windows(second)[1],windows(both)[1]);
  assert.deepEqual(paint([1,'true']),dark,'only an exact solved state is illumination');
  assert.deepEqual(paint([false,false],{...view(),litSeals:2,plantStage:3}),dark,'totals and old garden flowers cannot light current-run windows');
  const moved=windows(paint([true,false],view(1100,300)));
  near(moved[0][1]-windows(first)[0][1],-84);near(moved[1][1]-windows(first)[1][1],-84);
  assert.deepEqual(paint([true,false]),first,'there is no independent decoration clock');
});

test('each chapter owns a lazy single-attempt cache; station and greenhouse never share images',async()=>{
  const sources=[],stationImage=picture(),greenhouseImage=picture();
  const loader=src=>{sources.push(src);return src===PAINTED_GREENHOUSE_URL?greenhouseImage:stationImage;};
  const a=createPaintedSceneAssets({loadImage:loader}),b=createGreenhouseSceneAssets({loadImage:loader});
  for(const context of [undefined,{},station,{mode:'festival',chapterIndex:1},{mode:'story',chapterIndex:'1'}]){assert.equal(await b.request(context),false);assert.equal(b.getImage(context),null);}
  assert.deepEqual(sources,[]);assert.equal(a.getSnapshot().status,'idle');assert.equal(b.getSnapshot().status,'idle');
  const first=b.request(greenhouse),again=b.request(greenhouse);assert.equal(first,again);assert.equal(await first,true);
  assert.deepEqual(sources,[PAINTED_GREENHOUSE_URL]);assert.equal(b.getImage(greenhouse),greenhouseImage);assert.equal(a.getImage(station),null);
  assert.equal(await a.request(station),true);assert.equal(a.getImage(station),stationImage);assert.equal(b.getImage(station),null);assert.equal(a.getImage(greenhouse),null);
  await b.request(greenhouse);await a.request(station);assert.deepEqual(sources,[PAINTED_GREENHOUSE_URL,PAINTED_STATION_URL]);a.destroy();b.destroy();
});

test('greenhouse failure stays on fallback and destruction makes both late outcomes inert',async()=>{
  for(const fail of [true,false]){
    const pending=deferred();let calls=0;const assets=createGreenhouseSceneAssets({loadImage:()=>{calls++;return pending.promise;}});
    const request=assets.request(greenhouse);await Promise.resolve();assets.destroy();
    if(fail)pending.reject(new Error('late failure'));else pending.resolve(picture());
    assert.equal(await request,false);assert.equal(assets.getImage(greenhouse),null);assert.equal(assets.getSnapshot().status,'destroyed');assert.equal(await assets.request(greenhouse),false);assert.equal(calls,1);
  }
  let calls=0;const failed=createGreenhouseSceneAssets({loadImage:()=>{calls++;throw new Error('offline');}});
  assert.equal(await failed.request(greenhouse),false);assert.equal(await failed.request(greenhouse),false);assert.equal(calls,1);assert.equal(failed.getSnapshot().status,'error');
  const cancelled=createGreenhouseSceneAssets({loadImage:()=>{throw new Error('must not start');}}),request=cancelled.request(greenhouse);cancelled.destroy();assert.equal(await request,false);
});
