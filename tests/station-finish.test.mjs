import test from 'node:test';
import assert from 'node:assert/strict';
import { DreamGame, DREAM_PHYSICS } from '../dist/dream-engine.js';
import { DreamGame as BaseGame } from '../dist/dream-engine-base.js';
import { formatControlHint, getStageActions } from '../dist/dream-ui.js';
const noop=()=>{};
globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
function context(){
 const calls=[],states=[];const values={globalAlpha:1};
 return new Proxy({calls,save(){states.push({...values});calls.push(['save']);},restore(){assert.ok(states.length);Object.assign(values,states.pop());calls.push(['restore']);},balanced(){assert.equal(states.length,0);},createLinearGradient(...a){calls.push(['gradient',...a]);return {addColorStop:noop};},createRadialGradient(...a){calls.push(['radial',...a]);return {addColorStop:noop};},measureText:t=>({width:t.length*8})},{get(o,k){if(k in o)return o[k];if(k in values)return values[k];return (...args)=>{for(const a of args)if(typeof a==='number')assert.ok(Number.isFinite(a),k);calls.push([k,...args]);};},set(o,k,v){values[k]=v;return true;}});
}
function game(options={},Class=DreamGame){const c=context(),g=new Class({getContext:()=>c,getBoundingClientRect:()=>({width:1100,height:640})});g.start({sound:false,...options});return {g,c};}
const tick=(g,n)=>{for(let i=0;i<n;i++)g.update(1/60);};
const physical=g=>JSON.stringify({body:g.body,soul:g.soul,energy:g.energy,time:g.time,lamps:g.lanterns,memories:g.memories,pads:g.pads,platforms:g.level.platforms,barriers:g.level.barriers,plate:[...g.plateState],form:g.form});

test('station finish retains one inherited simulation and exact collision dimensions',()=>{
 const {g}=game(),{g:b}=game({},BaseGame);
 for(let i=0;i<160;i++){g.setInput({x:1});b.setInput({x:1});if(i===24){g.jump();b.jump();}g.update(1/60);b.update(1/60);assert.equal(physical(g),physical(b));}
 assert.ok(g instanceof BaseGame);assert.equal(g.frame,BaseGame.prototype.frame);g.destroy();b.destroy();
});
test('walking onto the actual plate opens and animates the semaphore, leaving reverses it',()=>{
 const {g}=game();assert.equal(g.stationSignal.amount,0);g.setInput({x:1});
 for(let i=0;i<180&&g.body.x<420;i++)g.update(1/60);
 g.setInput({x:0});tick(g,20);assert.equal(g.plateState.get('ticket'),true);assert.equal(g.stationSignal.amount,1);assert.equal(g.barrierOpen(g.level.barriers[0]),true);
 g.setInput({x:-1});tick(g,40);g.setInput({x:0});tick(g,20);assert.equal(g.stationSignal.amount,0);assert.equal(g.barrierOpen(g.level.barriers[0]),false);g.destroy();
});
test('only the first concrete lamp latches the station signal',()=>{
 const {g}=game();g.lightSeal(1);tick(g,20);assert.equal(g.stationSignal.amount,0);
 g.lightSeal(0);tick(g,20);assert.equal(g.stationSignal.amount,1);assert.equal(g.barrierOpen(g.level.barriers[0]),true);g.destroy();
});
test('pause freezes the partial signal; reduced motion settles without opening physics gates',()=>{
 const {g}=game();g.setInput({x:1});while(g.body.x<365)g.update(1/60);g.setInput({x:0});
 assert.ok(g.stationSignal.amount>0&&g.stationSignal.amount<1);g.pause();const a=g.stationSignal.amount;tick(g,50);assert.equal(g.stationSignal.amount,a);
 g.setReducedMotion(true);assert.equal(g.stationSignal.amount,1);g.resume();g.setInput({x:-1});tick(g,50);assert.equal(g.stationSignal.amount,0);g.destroy();
});
test('restart clears the signal and preserves the original ticket save contract',()=>{
 const {g}=game({firstTicketCollected:true});g.lightSeal(0);tick(g,20);g.restart();assert.equal(g.stationSignal.amount,0);assert.equal(g.firstTicket.phase,'stowed');assert.equal(g.memories.filter(x=>x.collected).length,0);g.destroy();
});
test('rendering is pure, finite, balanced, deterministic and does not touch rewards',()=>{
 const {g,c}=game();g.toggleSoul();tick(g,45);const before=physical(g);g.render();c.balanced();assert.equal(physical(g),before);
 c.calls.length=0;g.render();const a=JSON.stringify(c.calls);c.calls.length=0;g.render();assert.equal(JSON.stringify(c.calls),a);g.destroy();
});
test('the three remaining chapters and every festival keep exactly their prior draw sequence',()=>{
 for(const options of [...[3,4,5].map(chapterIndex=>({chapterIndex})),...['halloween','thanksgiving','christmas','newyear','spring','lantern','valentine','dragonboat','qixi','midautumn'].map(id=>({festival:{id}}))]){
  const {g,c}=game(options),{g:b,c:bc}=game(options,BaseGame);g.render();b.render();assert.deepEqual(c.calls,bc.calls);g.destroy();b.destroy();
 }
});
test('station reduced-motion full frame ignores presentation time and keeps puzzle range',()=>{
 const {g,c}=game({reducedMotion:true});g.visualTime=1;g.render();const a=JSON.stringify(c.calls);c.calls.length=0;g.visualTime=999;g.render();assert.equal(JSON.stringify(c.calls),a);assert.equal(DREAM_PHYSICS.pulseRadius,102);g.destroy();
});
test('touch hints remove duplicate action names without deleting narrative instructions',()=>{
 const body=getStageActions({form:'body'}),soul=getStageActions({form:'soul'});
 assert.equal(formatControlHint('E 掀开头盖骨 · 让拾光去找上方的去程票','buttons',body),'「掀开头盖骨」 · 让拾光去找上方的去程票');
 assert.equal(formatControlHint('按 E 回到身体，带着身体向前走。','buttons',soul),'点「回到身体」，带着身体向前走。');
 assert.equal(formatControlHint('E 掀开头盖骨','keyboard',body),'E 掀开头盖骨');
 assert.match(formatControlHint('按 E 回来，带着身体向前走。','buttons',soul),/带着身体向前走/);
});
