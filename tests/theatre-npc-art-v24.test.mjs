import test from 'node:test';
import assert from 'node:assert/strict';
import { drawStoryNPC, STORY_NPC_BOUNDS } from '../dist/dream-encounter-art.js';
import { DreamGame } from '../dist/dream-engine.js';
const noop=()=>{};
globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
function context() {
  const calls=[];
  const gradient=()=>({addColorStop:noop});
  const ctx=new Proxy({createLinearGradient:gradient,createRadialGradient:gradient,measureText:txt=>({width:String(txt).length*8})}, {
    get(target,key) {return key in target?target[key]:(...args)=>{calls.push({name:key,args});for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n),String(key));};},
  });
  return {ctx,calls};
}
function view(seals=0, capOpen=0, reduced=false){
  return {motif:'moth',chapterIndex:2,prop:'theatre-ticket',name:'绒绒',x:190,y:560,near:true,form:capOpen?'soul':'body',capOpen,seals,look:{x:202,y:480},talking:false,reduced};
}
test('theatre moth uses rich material gradients, attached fan rotation and true cap progress without mutating view',()=>{
  const a=context(),b=context();const settled=view(),open=view(1,1);
  const before=[JSON.stringify(settled),JSON.stringify(open)];
  drawStoryNPC(a.ctx,settled,0,false);drawStoryNPC(b.ctx,open,0,false);
  assert.deepEqual([JSON.stringify(settled),JSON.stringify(open)],before);
  assert.ok(a.calls.some(c=>c.name==='rotate'));
  assert.ok(b.calls.some(c=>c.name==='rotate'&&Math.abs(c.args[0])>.1));
  assert.ok(a.calls.length>120 && b.calls.length>120);
  assert.deepEqual(STORY_NPC_BOUNDS,{left:-46,right:46,top:-134,bottom:7});
});
test('current lamp count drives smile; reduced motion and paused time keep a stable draw',()=>{
  const a=context(),b=context(),smile=view(2,0);
  drawStoryNPC(a.ctx,smile,8,true);drawStoryNPC(b.ctx,smile,200,true);
  assert.deepEqual(a.calls,b.calls,'reduced motion should not follow wall clock');
  const c=context(),d=context();drawStoryNPC(c.ctx,smile,3.1,false);drawStoryNPC(d.ctx,smile,3.1,false);
  assert.deepEqual(c.calls,d.calls,'identical engine time yields identical stage pose');
});
test('existing gameplay starts at the same position with unchanged rewards and stage rules',()=>{
  const c=context(),canvas={getContext:()=>c.ctx,getBoundingClientRect:()=>({width:1280,height:800})};
  const game=new DreamGame(canvas,{});game.start({chapterIndex:2,sound:false});
  const original=game.getStoryNPCView();assert.equal(original.seals,0);assert.equal(original.prop,'theatre-ticket');
  assert.equal(game.getNearbyNPC().x,190);
  game.toggleSoul();for(let i=0;i<25;i++)game.update(1/60);
  assert.ok(game.getStoryNPCView().capOpen>0);game.recall();
  assert.equal(game.getStoryNPCView().seals,0);assert.equal(game.completed,false);
  assert.equal(game.lanterns.filter(l=>l.lit).length,0);game.destroy();
});
