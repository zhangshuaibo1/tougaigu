import test from 'node:test';
import assert from 'node:assert/strict';
import {
  THEATRE_PAINT_URL, getTheatrePaintedLayout, drawPaintedTheatre,
  drawPaintedTheatreLights, createTheatrePaintedAssets
} from '../dist/dream-theatre-painted.js';
import { getTheatreLampVisual, drawTheatreLantern } from '../dist/dream-theatre-lantern.js';
import { DREAM_PHYSICS } from '../dist/dream-engine-base.js';
import { DreamGame } from '../dist/dream-engine.js';

const noop=()=>{};
globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
const view=(width=1100,cameraX=0)=>({mode:'story',chapterIndex:2,worldWidth:2260,cameraX,viewport:{width,top:0,bottom:640}});
const image=Object.freeze({complete:true,naturalWidth:2400,naturalHeight:750});
function fakeCanvas(){
  const calls=[],stack=[],values={globalAlpha:1,globalCompositeOperation:'source-over'};
  const context=new Proxy({
    calls,stack,save(){stack.push({...values});calls.push(['save']);},
    restore(){assert.ok(stack.length);Object.assign(values,stack.pop());calls.push(['restore']);},
    createLinearGradient(...args){const stops=[];calls.push(['linear',...args,stops]);return {addColorStop:(x,y)=>stops.push([x,y])};},
    createRadialGradient(...args){const stops=[];calls.push(['radial',...args,stops]);return {addColorStop:(x,y)=>stops.push([x,y])};},
    measureText:t=>({width:String(t).length*8})
  },{get:(o,k)=>k in o?o[k]:k in values?values[k]:(...args)=>{
    for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n),String(k));
    calls.push([k,...args]);
  },set:(o,k,val)=>{values[k]=val;return true;}});
  return context;
}
test('v20 original panorama layout covers all camera endpoints and portrait view; invalid inputs fail safely',()=>{
  for(const width of [1100,390,320]){
    for(const camera of [0,420,1050,3000]){
      const v=view(width,camera),l=getTheatrePaintedLayout(v);
      assert.ok(l&&l.x<=0&&l.width+l.x>=width);
      assert.ok(l.height>600&&Object.isFrozen(l));
    }
  }
  assert.equal(getTheatrePaintedLayout(null),null);
  assert.equal(getTheatrePaintedLayout({...view(),cameraX:NaN}),null);
});
test('chapter-three art is lazy and isolated, retries do not spin on a failed decode',async()=>{
  const req=[],assets=createTheatrePaintedAssets({loadImage:src=>{req.push(src);return image;}});
  assert.equal(assets.getImage(view()),null);assert.equal(assets.getStatus(),'idle');
  await assets.request({mode:'story',chapterIndex:0});
  await assets.request({mode:'festival',chapterIndex:2});
  assert.equal(req.length,0);
  await Promise.all([assets.request(view()),assets.request(view())]);
  assert.deepEqual(req,[THEATRE_PAINT_URL]);assert.equal(assets.getImage(view()),image);
  assert.equal(assets.getImage({mode:'story',chapterIndex:1}),null);
  assets.destroy();assert.equal(assets.getImage(view()),null);
  const errors=createTheatrePaintedAssets({loadImage:()=>{throw Error('not decoded');}});
  assert.equal(await errors.request(view()),false);assert.equal(await errors.request(view()),false);
  assert.equal(errors.getStatus(),'failed');
});
test('painting and lamp-lit backdrop keep caller state balanced, independently follow true lamp amounts',()=>{
  const c=fakeCanvas();assert.ok(drawPaintedTheatre(c,view(1100,450),image));
  assert.ok(c.calls.some(call=>call[0]==='drawImage'));assert.equal(c.stack.length,0);
  c.calls.length=0;drawPaintedTheatreLights(c,view(),[0,0]);assert.ok(!c.calls.some(call=>call[0]==='radial'));
  c.calls.length=0;drawPaintedTheatreLights(c,view(),[1,0]);const first=c.calls.filter(call=>call[0]==='radial');
  assert.equal(first.length,1);assert.equal(c.stack.length,0);
  c.calls.length=0;drawPaintedTheatreLights(c,view(),[0,1]);const second=c.calls.filter(call=>call[0]==='radial');
  assert.equal(second.length,1);assert.notDeepEqual(first,second);
  c.calls.length=0;drawPaintedTheatreLights(c,view(),[1,1]);assert.equal(c.calls.filter(call=>call[0]==='radial').length,2);
  assert.equal(c.stack.length,0);
});
test('poem lamp four conditions never borrow optional minigame state or change puzzle radius',()=>{
  const lamp={x:515,y:285,lit:false};
  const basic=getTheatreLampVisual(lamp,0);assert.equal(basic.glow,'low');assert.equal(basic.near,false);
  const far=getTheatreLampVisual(lamp,0,{form:'soul',soul:{x:515+DREAM_PHYSICS.pulseRadius+2,y:285}});
  assert.equal(far.near,false);
  const near=getTheatreLampVisual(lamp,0,{form:'soul',soul:{x:515+DREAM_PHYSICS.pulseRadius-2,y:285}});
  assert.equal(near.glow,'violet');assert.equal(near.near,true);
  const lit=getTheatreLampVisual({...lamp,lit:true},0,{form:'soul',soul:{x:515,y:285}});
  assert.equal(lit.glow,'warm');assert.equal(lit.near,false);
  const c=fakeCanvas(),game={form:'soul',soul:{x:515,y:285},options:{reducedMotion:false}};
  for(const state of [lamp,{...lamp,lit:true}]){c.calls.length=0;assert.ok(drawTheatreLantern(c,game,state,0,2));assert.equal(c.stack.length,0);}
  c.calls.length=0;game.options.reducedMotion=true;drawTheatreLantern(c,game,lamp,0,2);
  const snapshot=structuredClone(c.calls);c.calls.length=0;drawTheatreLantern(c,game,lamp,0,200);
  assert.deepEqual(c.calls,snapshot,'reduced motion ignores cosmetic clock');
});
test('engine draws the actual third-chapter bitmap only in chapter three; lamp fades freeze on pause',async()=>{
  const c=fakeCanvas(),calls=[];
  const g=new DreamGame({getContext:()=>c,getBoundingClientRect:()=>({width:1100,height:640})},{},{loadTheatreImage:src=>{calls.push(src);return image;}});
  g.start({chapterIndex:2,sound:false});
  await g.theatreScenes.request({mode:'story',chapterIndex:2});
  c.calls.length=0;g.render();assert.equal(g.theatrePaintedFrame,true);assert.ok(c.calls.some(call=>call[0]==='drawImage'));
  assert.deepEqual(calls,[THEATRE_PAINT_URL]);
  assert.deepEqual(g.theatreLight.amounts,[0,0]);
  g.lanterns[0].lit=true;g.update(1/60);assert.ok(g.theatreLight.amounts[0]>0&&g.theatreLight.amounts[0]<1);
  const value=g.theatreLight.amounts[0];g.pause();for(let i=0;i<20;i++)g.update(1/60);
  assert.equal(g.theatreLight.amounts[0],value);
  g.setReducedMotion(true);assert.deepEqual(g.theatreLight.amounts,[1,0]);
  g.restart();assert.deepEqual(g.theatreLight.amounts,[0,0],'new run does not borrow old album lamps');
  g.start({chapterIndex:1,sound:false});assert.equal(g.getPaintedTheatreImage(),null);
  assert.equal(calls.length,1);g.destroy();
});
