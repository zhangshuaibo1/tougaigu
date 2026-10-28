import test from 'node:test';
import assert from 'node:assert/strict';
import { DreamGame, DREAM_LEVELS, DREAM_PHYSICS, createDreamRng, getDreamStars } from '../dist/dream-engine.js';
import { getDreamLevel } from '../dist/dream-levels.js';

const noop=()=>{};
globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
globalThis.requestAnimationFrame=()=>1;
globalThis.cancelAnimationFrame=noop;
const gradient=()=>({addColorStop:noop});
const context=new Proxy({createLinearGradient:gradient,createRadialGradient:gradient,measureText:text=>({width:String(text).length*10})},{get:(target,key)=>key in target?target[key]:noop});
function game(index=0,callbacks={}){
  const g=new DreamGame({getContext:()=>context,getBoundingClientRect:()=>({width:1100,height:620})},callbacks);
  g.start({chapterIndex:index,sound:false});return g;
}
const tick=(g,seconds=1)=>{for(let i=0;i<Math.ceil(seconds*60);i++)g.update(1/60);};

test('six authored stages are independent and contain real progressive mechanisms',()=>{
  assert.equal(DREAM_LEVELS.length,6);
  const a=getDreamLevel(0),b=getDreamLevel(0);a.platforms[0].x=999;assert.notEqual(a.platforms[0].x,b.platforms[0].x);
  for(const level of DREAM_LEVELS){assert.equal(level.memories.length,3);assert.equal(level.lanterns.length,2);assert.ok(level.exit.x>level.spawn.x);}
  assert.ok(DREAM_LEVELS[0].plates.length&&DREAM_LEVELS[0].barriers[0].plateId);
  assert.ok(DREAM_LEVELS[1].pads[0].power>DREAM_PHYSICS.jump);
  assert.ok(DREAM_LEVELS[2].movers.length);
  assert.ok(DREAM_LEVELS[3].movers.some(p=>p.axis==='y')&&DREAM_LEVELS[3].winds.length);
  assert.ok(DREAM_LEVELS[4].hazards.some(h=>h.kind==='pendulum'));
  assert.ok(DREAM_LEVELS[5].plates.length&&DREAM_LEVELS[5].pads.length&&DREAM_LEVELS[5].movers.length);
});

test('ground collision, coyote jump and frame cap prevent tunnelling',()=>{
  const g=game();g.setInput({x:1,y:0});g.update(20);assert.equal(g.time,.04);assert.ok(g.body.x<120);
  g.setInput({x:0,y:0});assert.equal(g.jump(),true);assert.equal(g.jump(),false);tick(g,1.5);
  assert.equal(g.body.y,560);assert.equal(g.body.grounded,true);assert.equal(g.body.vy,0);g.destroy();
});

test('a body pressure plate opens a soul veil; the solved light latches it',()=>{
  const g=game();const gate=g.level.barriers[0];assert.equal(g.barrierOpen(gate),false);
  g.body.x=420;g.update(1/60);assert.equal(g.plateState.get('ticket'),true);assert.equal(g.barrierOpen(gate),true);
  g.toggleSoul();assert.equal(g.form,'soul');g.setInput({x:1,y:0});tick(g,.8);assert.ok(g.soul.x>gate.x+gate.w);
  assert.equal(g.body.x,420);g.lightSeal(0);g.recall();g.body.x=800;g.update(1/60);assert.equal(g.plateState.get('ticket'),false);assert.equal(g.barrierOpen(gate),true);g.destroy();
});

test('soul cannot pass a closed plate veil and always recovers from exhausted energy',()=>{
  const g=game();g.body.x=495;g.update(1/60);g.toggleSoul();g.setInput({x:1,y:0});tick(g,2);assert.ok(g.soul.x<=505.01);
  g.energy=.01;tick(g,.1);assert.equal(g.form,'body');assert.ok(g.energy>=0);tick(g,6);assert.equal(g.energy,100);assert.equal(g.toggleSoul(),true);g.destroy();
});

test('lantern puzzles pause once; wrong answers cannot unlock the door',()=>{
  const asks=[];const g=game(0,{onPuzzle:p=>asks.push(p)});g.body.x=420;g.update(1/60);g.toggleSoul();g.soul.x=g.lanterns[0].x;g.soul.y=g.lanterns[0].y;
  g.soul.vx=320;g.soul.vy=110;const resting={x:g.soul.x,y:g.soul.y};
  assert.equal(g.pulse(),true);assert.equal(g.state,'paused');assert.equal(g.pendingSeal,0);assert.equal(asks.length,1);assert.equal(g.lanterns[0].lit,false);
  const time=g.time;tick(g,5);assert.equal(g.time,time);g.pulse();assert.equal(asks.length,1);
  assert.equal(g.resolvePuzzle(false),false);assert.equal(g.state,'playing');assert.equal(g.lanterns[0].lit,false);
  tick(g,.5);assert.equal(g.soul.x,resting.x);assert.equal(g.soul.y,resting.y);g.pulse();assert.equal(asks.length,2);assert.equal(g.resolvePuzzle(true),true);assert.equal(g.lanterns[0].lit,true);assert.equal(g.resolvePuzzle(true),false);g.destroy();
});

test('mushroom launch clears a ledge that an ordinary jump cannot reach',()=>{
  const g=game(1);g.body.x=780;g.update(1/60);assert.ok(g.body.vy<-800);let high=560;for(let i=0;i<90;i++){g.update(1/60);high=Math.min(high,g.body.y);}assert.ok(high<320);
  assert.ok(560-DREAM_PHYSICS.jump**2/(2*DREAM_PHYSICS.gravity)>g.level.platforms.find(p=>p.kind==='root').y);g.destroy();
});

test('moving platforms carry a grounded body and wind changes soul trajectory',()=>{
  const g=game(2),p=g.movers[0];g.body.x=p.x+p.w/2;g.body.y=p.y;g.body.grounded=true;g.body.platform=p.id;
  const relative=g.body.x-p.x;tick(g,.75);assert.ok(Math.abs(g.body.x-g.movers[0].x-relative)<.1);assert.equal(g.body.platform,p.id);
  g.destroy();const wind=game(3);wind.body.x=1550;wind.update(1/60);wind.toggleSoul();wind.soul.x=1550;wind.soul.y=300;wind.setInput({x:0,y:0});tick(wind,.7);assert.ok(wind.soul.x<1545);assert.ok(wind.soul.y<270);wind.destroy();
});

test('spirit resonance freezes pendulums but time resumes afterward',()=>{
  const g=game(4);g.body.x=650;g.update(1/60);g.toggleSoul();const h=g.hazards[0];g.soul.x=h.px;g.soul.y=h.py-90;
  g.pulse();assert.ok(h.frozen>4);const x=h.px,y=h.py;g.recall();tick(g,1);assert.equal(h.px,x);assert.equal(h.py,y);tick(g,4);assert.equal(h.frozen,0);assert.notEqual(h.px,x);g.destroy();
});

test('checkpoint recovery preserves solved lights and found memories',()=>{
  const g=game();g.lightSeal(0);g.memories[0].collected=true;g.body.x=1200;g.update(1/60);assert.equal(g.checkpoint.index,0);
  g.body.y=730;g.update(1/60);assert.equal(g.deaths,1);assert.equal(g.body.x,1020);assert.equal(g.body.y,560);assert.equal(g.lanterns[0].lit,true);assert.equal(g.memories[0].collected,true);assert.equal(g.form,'body');assert.ok(g.body.invulnerable>1);g.destroy();
});

test('both answers and the body are required at the exit; completion is idempotent',()=>{
  const results=[];const g=game(0,{onComplete:r=>results.push(r)});g.body.x=g.level.exit.x;g.update(1/60);assert.equal(g.state,'playing');g.lightSeal(0);g.update(1/60);assert.equal(g.state,'playing');g.lightSeal(1);g.toggleSoul();g.update(1/60);assert.equal(g.state,'playing');g.recall();g.update(1/60);assert.equal(g.state,'complete');assert.equal(results.length,1);g.finish();tick(g,4);assert.equal(results.length,1);g.destroy();
});

test('pause, bounded effects, decorative seed and render cover every theme',()=>{
  const randomA=createDreamRng('letters'),randomB=createDreamRng('letters');assert.deepEqual(Array.from({length:30},randomA),Array.from({length:30},randomB));
  for(let i=0;i<6;i++){const g=game(i);const before=g.time;g.pause();tick(g,4);assert.equal(g.time,before);g.resume();g.burst(100,100,500,'#ffffff',100);assert.ok(g.particles.length<=180);g.render();g.toggleSoul();g.render();g.destroy();}
});

test('replay stars reward memories plus a clean timely run',()=>{
  assert.equal(getDreamStars({memories:0,deaths:0,time:10},100),1);assert.equal(getDreamStars({memories:3,deaths:2,time:90},100),2);assert.equal(getDreamStars({memories:3,deaths:0,time:101},100),2);assert.equal(getDreamStars({memories:3,deaths:0,time:99},100),3);
});

test('low-render-rate frames advance real time using collision-safe fixed steps',()=>{
  const positions=[];
  for(const interval of [1000/60,100,200]){
    const g=game();g.setInput({x:1,y:0});g.frame(0);
    for(let now=interval;now<=1000+.001;now+=interval)g.frame(now);
    assert.ok(Math.abs(g.time-1)<.0001,`${interval}ms frames simulated ${g.time}s`);
    positions.push(g.body.x);g.destroy();
  }
  assert.ok(Math.max(...positions)-Math.min(...positions)<.001);
});

test('a long frame is bounded and its substeps cannot tunnel through a closed veil',()=>{
  const g=game();g.body.x=490;g.setInput({x:1,y:0});g.frame(0);g.frame(10000);
  assert.ok(Math.abs(g.time-.2)<.0001);assert.ok(g.body.x<=505);assert.equal(g.body.y,560);g.destroy();
});

test('resume discards suspended time and any partial accumulated step',()=>{
  const g=game();g.frame(0);g.frame(155);assert.ok(Math.abs(g.time-.15)<.0001);
  g.pause('blur');g.frame(10000);g.resume();g.frame(10100);assert.ok(Math.abs(g.time-.15)<.0001);
  g.frame(10200);assert.ok(Math.abs(g.time-.25)<.0001);g.destroy();
});

test('fixed-step catch-up stops immediately on a puzzle or chapter completion',()=>{
  let g;const prompts=[];
  g=game(0,{onPuzzle:p=>prompts.push(p),onHud:()=>{if(g&&g.time>.05&&g.state==='playing'&&g.form==='soul')g.pulse();}});
  g.body.x=420;g.update(1/60);g.toggleSoul();g.soul.x=g.lanterns[0].x;g.soul.y=g.lanterns[0].y;g.frame(0);g.frame(200);
  assert.equal(g.state,'paused');assert.equal(prompts.length,1);assert.ok(g.time<.19);assert.equal(g.frameAccumulator,0);g.destroy();
  const results=[];const end=game(0,{onComplete:r=>results.push(r)});end.body.x=end.level.exit.x;end.lightSeal(0);end.lightSeal(1);end.frame(0);end.frame(200);
  assert.equal(end.state,'complete');assert.equal(results.length,1);assert.ok(Math.abs(end.time-1/60)<.0001);assert.equal(end.frameAccumulator,0);end.destroy();
});

function steerSoul(g,target,limit=8){
  for(let i=0;i<limit*60;i++){
    const dx=target.x-g.soul.x,dy=target.y-g.soul.y;
    if(Math.hypot(dx,dy)<45){g.setInput({x:0,y:0});return true;}
    g.setInput({x:Math.max(-1,Math.min(1,dx/75)),y:Math.max(-1,Math.min(1,dy/75))});g.update(1/60);
    if(g.form!=='soul')return false;
  }
  return false;
}
function walkTo(g,target,limit=45){
  let lastJump=-2;
  for(let i=0;i<limit*60&&g.state==='playing';i++){
    const delta=target-g.body.x;
    if(Math.abs(delta)<10&&g.body.grounded){g.setInput({x:0,y:0});tick(g,.15);return true;}
    const mushroomNear=g.pads.some(p=>g.body.x>p.x-110&&g.body.x<p.x+p.w+45);
    const lastLeg=Math.abs(delta)<130;
    if(!mushroomNear&&!lastLeg&&g.body.grounded&&g.time-lastJump>.38){g.jump();lastJump=g.time;}
    g.setInput({x:Math.abs(delta)<8?0:Math.sign(delta),y:0});g.update(1/60);
  }
  return g.state==='complete';
}

for(const [chapterIndex,anchors] of [[0,[420,1220]],[1,[550,1540]],[2,[430,1530]],[3,[660,1740]],[4,[460,1510]],[5,[430,1950]]]){
  test(`chapter ${chapterIndex+1} has a complete route using actual movement, flight and interactions`,()=>{
    const g=game(chapterIndex);const diagnostics=()=>`chapter=${chapterIndex+1} x=${g.body.x.toFixed(1)} y=${g.body.y.toFixed(1)} deaths=${g.deaths} time=${g.time.toFixed(1)}`;
    for(let index=0;index<2;index++){
      assert.equal(walkTo(g,anchors[index]),true,`walk to lantern ${index}: ${diagnostics()}`);
      assert.equal(g.toggleSoul(),true,diagnostics());
      assert.equal(steerSoul(g,g.lanterns[index]),true,`fly to lantern ${index}: ${diagnostics()}`);
      g.pulse();assert.equal(g.lanterns[index].lit,true,diagnostics());g.recall();
    }
    assert.equal(walkTo(g,g.level.exit.x,60),true,`walk to exit: ${diagnostics()}`);
    assert.equal(g.state,'complete',diagnostics());g.destroy();
  });
}
