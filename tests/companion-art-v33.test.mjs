import test from 'node:test';
import assert from 'node:assert/strict';
import {DreamGame} from '../dist/dream-engine.js';
import {DreamGame as BaseGame} from '../dist/dream-engine-base.js';
import {FESTIVAL_LEVELS} from '../dist/dream-festival-levels.js';
import {isCompanionScene,getCompanionView,drawRefinedCompanion} from '../dist/dream-companion-art.js';

const noop=()=>{},clone=x=>JSON.parse(JSON.stringify(x));
globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
function context(){
  const calls=[],stack=[],values={globalAlpha:.7,fillStyle:'#123456',strokeStyle:'#234567',lineWidth:4,lineCap:'butt',lineJoin:'miter'};
  const record=(name,args=[])=>{for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n),name+' uses finite geometry');calls.push([name,...args]);};
  const api={calls,depth:()=>stack.length,snapshot:()=>clone(values),
    save(){stack.push({...values});record('save');},restore(){assert.ok(stack.length);Object.assign(values,stack.pop());record('restore');},
    createLinearGradient(...args){record('gradient',args);return {addColorStop(at,color){record('stop',[at,color]);}};},
    createRadialGradient(...args){record('radial',args);return {addColorStop(at,color){record('stop',[at,color]);}};},
    measureText:text=>({width:text.length*8})};
  return new Proxy(api,{get(o,k){if(k in o)return o[k];if(k in values)return values[k];return (...args)=>record(k,args);},set(o,k,v){if(k in o)o[k]=v;else values[k]=v;return true;}});
}
function make(options={},Class=DreamGame){const c=context(),game=new Class({getContext:()=>c,getBoundingClientRect:()=>({width:320,height:431})});game.start({sound:false,...options});return {game,c};}
function tick(g,n){for(let i=0;i<n;i++)g.update(1/60);}
function view(g,t=g.options.reducedMotion?0:g.visualTime){const character=g.getCharacterPresentation(t),shown=g.getSoulPresentation(character);return {shown,view:getCompanionView(g,g.companion.x,g.companion.y,t,shown)};}
function openAndFly(g){assert.equal(g.toggleSoul(),true);tick(g,44);g.setInput({x:.65,y:-.7});tick(g,24);g.setInput({x:0,y:0});tick(g,9);assert.equal(g.form,'soul');}
const physical=g=>clone({body:g.body,soul:g.soul,companion:g.companion,form:g.form,cap:g.cap,input:g.input,state:g.state,time:g.time,visualTime:g.visualTime,runId:g.runId,energy:g.energy,emoteTime:g.emoteTime,deaths:g.deaths,lanterns:g.lanterns,memories:g.memories,movers:g.movers,hazards:g.hazards,pads:g.pads,checkpoint:g.checkpoint,firstTicket:g.firstTicket,greenhousePlant:g.greenhousePlant});

test('real recall keeps watching the presented return while form is already body, then settles by the original cap progress',()=>{
  const {game:g}=make();openAndFly(g);const raw={x:g.soul.x,y:g.soul.y};assert.equal(g.recall(),true);tick(g,8);
  const returning=view(g);assert.equal(g.form,'body');assert.equal(returning.shown.pose,'return');assert.equal(returning.view.focus,'return');
  assert.deepEqual(returning.view.target,{x:returning.shown.x,y:returning.shown.y});assert.notDeepEqual(returning.view.target,raw,'the original raw soul no longer describes its visible cubic return');
  assert.equal(returning.view.returnBlink,0);assert.ok(returning.view.lookY<0);
  tick(g,20);assert.equal(view(g).shown.pose,'return');assert.equal(view(g).view.returnBlink,0,'28 actual frames are still before arrival');
  tick(g,1);assert.equal(view(g).shown,null);assert.ok(view(g).view.returnBlink>0,'29 actual frames begin the last closing third');
  tick(g,7);assert.ok(view(g).view.returnBlink>.99,'36 actual frames reach the brief closing blink');
  tick(g,8);const closed=view(g);assert.equal(g.cap.phase,'closed');assert.equal(closed.view.returnBlink,0);assert.equal(closed.view.focus,'body');
  assert.deepEqual(closed.view.target,{x:g.body.x,y:g.body.y-58});g.destroy();
});

test('successful E reversal cancels the real return; rejected low-energy E keeps its current settling',()=>{
  const {game:g}=make();openAndFly(g);g.recall();tick(g,36);assert.ok(view(g).view.returnBlink>.99);
  assert.equal(g.toggleSoul(),true);assert.equal(g.cap.phase,'opening');assert.equal(g.cap.returnFrom,null);assert.equal(view(g).view.returnBlink,0);g.destroy();
  const {game:tired}=make();assert.equal(tired.toggleSoul(),true);
  for(let frame=0;frame<1500&&tired.energy>=6;frame++)tired.update(1/60);
  assert.equal(tired.form,'soul');assert.ok(tired.energy>0&&tired.energy<6);assert.equal(tired.recall(),true);tick(tired,36);
  const before=physical(tired),blink=view(tired).view.returnBlink;assert.ok(tired.energy<18);assert.ok(blink>.99);
  assert.equal(tired.toggleSoul(),false);assert.deepEqual(physical(tired),before);assert.equal(view(tired).view.returnBlink,blink);tired.destroy();
});

test('immediate invisible double E cannot manufacture a return blink',()=>{
  const {game:g}=make();assert.equal(g.toggleSoul(),true);assert.equal(g.getSoulPresentation().alpha,0);assert.equal(g.toggleSoul(),true);assert.equal(g.cap.returnFrom,null);
  for(let frame=0;frame<46;frame++){tick(g,1);assert.equal(view(g).view.returnBlink,0);assert.equal(view(g).view.focus,'body');}g.destroy();
});

test('paused return is frozen; reduced motion settles it and restoring motion does not replay',()=>{
  const {game:g}=make();openAndFly(g);g.recall();tick(g,8);assert.equal(g.pause(),true);
  const before=physical(g),frozen=view(g).view,a=context(),b=context();drawRefinedCompanion(a,frozen);tick(g,120);drawRefinedCompanion(b,view(g).view);
  assert.deepEqual(physical(g),before);assert.deepEqual(view(g).view,frozen);assert.deepEqual(a.calls,b.calls);
  assert.equal(g.resume(),true);g.setReducedMotion(true);assert.equal(g.cap.phase,'closed');assert.equal(g.cap.returnFrom,null);
  const reduced=view(g,1e8).view;assert.equal(reduced.time,0);assert.equal(reduced.returnBlink,0);assert.equal(reduced.bob,0);assert.equal(reduced.tailBend,0);assert.equal(reduced.headTilt,0);
  assert.deepEqual(view(g,0).view,reduced);g.setReducedMotion(false);assert.equal(view(g).view.returnBlink,0);assert.equal(g.cap.phase,'closed');g.destroy();
});

test('the six story chapters change only presentation under ordinary input, including original cat following coordinates',()=>{
  for(let chapterIndex=0;chapterIndex<6;chapterIndex++){
    const {game:g}=make({chapterIndex}),{game:base}=make({chapterIndex},BaseGame);
    assert.equal(isCompanionScene(g),true);
    const equal=()=>assert.deepEqual(physical(g),physical(base),'identical original gameplay in chapter '+chapterIndex);
    const both=(method,...args)=>{assert.deepEqual(g[method](...args),base[method](...args));equal();};
    const advance=n=>{for(let frame=0;frame<n;frame++){g.update(1/60);base.update(1/60);equal();}};
    both('setInput',{x:1,y:0});advance(20);both('setInput',{x:0,y:0});advance(14);both('toggleSoul');advance(44);
    both('setInput',{x:.5,y:-.6});advance(20);both('recall');advance(44);
    const before=physical(g);g.render();assert.deepEqual(physical(g),before);assert.equal(g.ctx.depth(),0);g.destroy();base.destroy();
  }
});

test('all festivals retain the exact old companion painter; absent or damaged contexts do not enter refinement',()=>{
  for(const level of FESTIVAL_LEVELS){
    const {game:g}=make({festival:{id:level.festivalId}}),a=context(),b=context();
    assert.equal(isCompanionScene(g),false);assert.equal(getCompanionView(g,g.companion.x,g.companion.y,0),null);
    g.drawCompanion(a,g.companion.x,g.companion.y,0);BaseGame.prototype.drawCompanion.call(g,b,g.companion.x,g.companion.y,0);assert.deepEqual(a.calls,b.calls);g.destroy();
  }
  const {game:g}=make(),bad=[null,undefined,{},...[-1,6,.5,'0'].map(chapterIndex=>({...g,chapterIndex})),{...g,mode:'survivor'},
    {...g,destroyed:true},{...g,body:null},{...g,body:{...g.body,x:NaN}},{...g,cap:null},{...g,capOpen:NaN},
    {...g,cap:{...g.cap,entry:NaN}},{...g,options:null},{...g,level:null}];
  for(const invalid of bad){assert.equal(isCompanionScene(invalid),false);assert.equal(getCompanionView(invalid,40,560,0),null);}
  assert.equal(getCompanionView(g,NaN,560,0),null);assert.equal(getCompanionView(g,40,Infinity,0),null);
  const before=physical(g);g.drawCompanion(null,40,560,0);assert.deepEqual(physical(g),before);
  g.destroy();assert.equal(getCompanionView(g,40,560,0),null);
});

test('the painter preserves Canvas state, refuses before paint, and never turns a mid-paint error into a duplicate fallback',()=>{
  const {game:g}=make(),v=view(g).view,c=context(),before=c.snapshot(),facts=physical(g);assert.ok(Object.isFrozen(v)&&Object.isFrozen(v.target));
  assert.equal(drawRefinedCompanion(c,v),true);assert.equal(c.depth(),0);assert.deepEqual(c.snapshot(),before);assert.deepEqual(physical(g),facts);
  for(const invalid of [null,{...v,x:NaN},{...v,blink:Infinity}]){const unused=context();assert.equal(drawRefinedCompanion(unused,invalid),false);assert.deepEqual(unused.calls,[]);}
  const missing=context();missing.createLinearGradient=null;assert.equal(drawRefinedCompanion(missing,v),false);assert.deepEqual(missing.calls,[]);
  const throwing=context();throwing.fill=()=>{throw Error('paint failure');};assert.throws(()=>drawRefinedCompanion(throwing,v),/paint failure/);assert.equal(throwing.depth(),0);g.destroy();
});

test('one shared render result survives null, failure and reentry without escaping its frame',()=>{
  const {game:g}=make();let reads=0,lastSoul;const get=g.getSoulPresentation.bind(g);
  g.getSoulPresentation=(...args)=>{reads++;return lastSoul=get(...args);};g.render();assert.equal(reads,1);assert.equal(g.companionRenderScope,null);
  reads=0;const standalone=context(),old=context();g.drawCompanion(standalone,40,560,0);BaseGame.prototype.drawCompanion.call(g,old,40,560,0);
  assert.equal(reads,0,'standalone drawing safely falls back without another pose');assert.deepEqual(standalone.calls,old.calls);
  const draw=g.drawCompanion;g.drawCompanion=()=>{assert.equal(g.companionRenderScope.ready,true);assert.equal(g.companionRenderScope.shown,null);throw Error('interrupted render');};
  assert.throws(()=>g.render(),/interrupted render/);assert.equal(g.companionRenderScope,null);
  g.drawCompanion=function(...args){assert.strictEqual(this.companionRenderScope.shown,lastSoul,'the cat consumes the one base-render object');return draw.apply(this,args);};
  openAndFly(g);g.recall();tick(g,8);reads=0;g.render();assert.equal(reads,1);assert.equal(g.companionRenderScope,null);
  const background=g.drawBackground,painted=[];let entered=false,outer;
  g.drawBackground=function(...args){
    if(!entered){entered=true;outer=this.companionRenderScope;const originalSoul=outer.shown;this.render();assert.strictEqual(this.companionRenderScope,outer);assert.strictEqual(outer.shown,originalSoul);}
    return background.apply(this,args);
  };
  g.drawCompanion=function(...args){painted.push(this.companionRenderScope);return draw.apply(this,args);};
  reads=0;g.render();assert.equal(reads,2,'one original result for each of the two nested frames');assert.equal(painted.length,2);
  assert.notStrictEqual(painted[0],outer);assert.strictEqual(painted[1],outer);assert.equal(g.companionRenderScope,null);
  const savedContext=g.ctx;g.ctx=null;reads=0;g.render();assert.equal(reads,0);assert.equal(g.companionRenderScope,null);g.ctx=savedContext;
  g.destroy();g.render();assert.equal(reads,0);assert.equal(g.companionRenderScope,null);
});
