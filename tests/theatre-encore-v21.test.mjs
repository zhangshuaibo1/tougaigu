import test from 'node:test';
import assert from 'node:assert/strict';
import {createTheatreEncore,advanceTheatreEncore,getTheatreEncoreView,drawTheatreEncore} from '../dist/dream-theatre-encore.js';
import {DreamGame} from '../dist/dream-engine.js';

const left={x:565,y:465,w:220,h:18},right={x:1130,y:465,w:225,h:18};
const stage={id:'stage',kind:'stage',x:695,y:465,w:185,h:20,dx:3};
const b={x:790,y:465,w:34,h:55,grounded:true,platform:'stage'};
const ctx={mode:'story',chapterIndex:2,state:'playing',form:'body',deaths:0,
  level:{platforms:[left,right]},movers:[stage],body:b};
const tick=(s,dt=1/60)=>advanceTheatreEncore(s,ctx,dt);
function ride(s){tick(s);for(let x=700;x<=1090;x+=10){stage.x=x;b.x=x+96;tick(s);}return s;}

test('earned curtain call requires left-bank boarding, actual traversal and far-bank landing',()=>{
  const s=createTheatreEncore();
  b.x=790;stage.x=695;stage.dx=3;b.platform='stage';
  tick(s);assert.equal(s.phase,'riding');
  ride(s);assert.ok(s.rideDistance>145);
  b.platform=null;b.x=1245;stage.x=1090;stage.dx=3;tick(s);
  assert.equal(s.phase,'active');assert.equal(getTheatreEncoreView(s).age,0);
  tick(s,1);assert.ok(s.age>0);for(let i=0;i<150;i++)tick(s);
  assert.equal(s.phase,'done');assert.equal(getTheatreEncoreView(s).phase,'done');
  b.x=790;stage.x=695;b.platform='stage';tick(s);assert.equal(s.phase,'done','once per chapter');
});
test('remote landing, soul, gap jump, failed ride and death never grant a curtain call',()=>{
  const s=createTheatreEncore();stage.x=1090;b.platform=null;b.x=1245;
  tick(s);assert.equal(s.phase,'waiting');
  stage.x=695;b.x=790;b.platform='stage';ctx.form='soul';tick(s);assert.equal(s.phase,'waiting');
  ctx.form='body';tick(s);assert.equal(s.phase,'riding');
  stage.x=750;b.x=845;tick(s);b.platform=null;b.x=820;tick(s);
  assert.equal(s.phase,'waiting','falling or stepping back does not grant');
  stage.x=695;b.x=790;b.platform='stage';tick(s);
  ctx.deaths=1;tick(s);assert.equal(s.phase,'waiting');assert.equal(s.deaths,1);
  ctx.deaths=0;
});
test('pause and reduced-motion view do not advance the earned animation',()=>{
  const s=createTheatreEncore();b.x=790;stage.x=695;b.platform='stage';ride(s);
  b.platform=null;b.x=1245;stage.x=1090;tick(s);
  assert.equal(s.phase,'active');ctx.state='paused';tick(s,1);
  assert.equal(s.age,0);ctx.state='playing';tick(s);
  assert.ok(s.age>0);
  const calls=[],canvas=new Proxy({save(){calls.push('save');},restore(){calls.push('restore');},createLinearGradient(){return {addColorStop(){}}}}, {get(o,k){if(k in o)return o[k];return (...args)=>{calls.push(k);};},set(o,k,v){return true;}});
  assert.equal(drawTheatreEncore(canvas,s,{camera:400,reducedMotion:true}),true);
  assert.equal(calls.filter(x=>x==='save').length,calls.filter(x=>x==='restore').length);
});
test('encore does not alter original engine state or persist across chapter restart',()=>{
  const noop=()=>{};
  globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
  globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
  globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
  const c=new Proxy({save(){},restore(){},createLinearGradient(){return {addColorStop(){}}},createRadialGradient(){return {addColorStop(){}}},measureText(){return {width:70}}},{get(o,k){if(k in o)return o[k];return ()=>{};},set(o,k,v){return true;}});
  const g=new DreamGame({getContext:()=>c,getBoundingClientRect:()=>({width:1100,height:640})});
  g.start({chapterIndex:2,sound:false});assert.equal(g.theatreEncore.phase,'waiting');
  g.theatreEncore.phase='done';g.restart();assert.equal(g.theatreEncore.phase,'waiting');
  g.start({chapterIndex:1,sound:false});assert.equal(g.theatreEncore,null);
  g.destroy();
});
