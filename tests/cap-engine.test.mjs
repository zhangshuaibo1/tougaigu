import test from 'node:test';
import assert from 'node:assert/strict';
import { DreamGame } from '../dist/dream-engine.js';
import { CAP_MOTIFS, resolveCapScene, drawCapMiniature, drawSoulVision } from '../dist/dream-cap-art.js';

const noop=()=>{};
globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
globalThis.requestAnimationFrame=()=>1;
globalThis.cancelAnimationFrame=noop;

function makeContext(){
  const calls=[];
  const numeric=(name,args)=>{for(const n of args)assert.ok(typeof n==='number'&&Number.isFinite(n),`${name} received ${n}`);calls.push([name,...args]);};
  const allNumeric=new Set(['moveTo','lineTo','bezierCurveTo','quadraticCurveTo','translate','scale','rotate','fillRect','strokeRect','clearRect','setTransform','arcTo']);
  const target={
    calls,globalAlpha:1,
    createLinearGradient:(...args)=>{numeric('linear gradient',args);return {addColorStop:noop};},
    createRadialGradient:(...args)=>{numeric('radial gradient',args);assert.ok(args[2]>=0&&args[5]>=0);return {addColorStop:noop};},
    measureText:text=>({width:String(text).length*10}),
    ellipse:(...args)=>{numeric('ellipse',args.slice(0,7));assert.ok(args[2]>=0&&args[3]>=0);},
    arc:(...args)=>{numeric('arc',args.slice(0,5));assert.ok(args[2]>=0);},
    roundRect:(...args)=>numeric('roundRect',args),
  };
  return new Proxy(target,{get:(object,key)=>key in object?object[key]:allNumeric.has(key)?(...args)=>numeric(key,args):noop});
}
function makeGame(options={},callbacks={}){
  const context=makeContext();
  const game=new DreamGame({getContext:()=>context,getBoundingClientRect:()=>({width:1100,height:620})},callbacks);
  game.start({chapterIndex:0,sound:false,...options});return {game,context};
}
function tick(game,seconds){for(let i=0;i<Math.ceil(seconds*60);i++)game.update(1/60);}
function assertPose(pose){if(!pose)return;for(const key of ['x','y','vx','vy','scale','alpha'])assert.ok(Number.isFinite(pose[key]),key);assert.ok(pose.alpha>=0&&pose.alpha<=1);assert.ok(pose.scale>0&&pose.scale<=1);}

test('six chapters and ten celebrations resolve the matching brain theatre without new required options',()=>{
  const main=['station','sprout','moon','whale','clock','dawn'];
  main.forEach((motif,index)=>{const {game}=makeGame({chapterIndex:index});assert.equal(game.capScene.motif,motif);game.destroy();});
  const festivals={halloween:'pumpkin',thanksgiving:'table',christmas:'bell',newyear:'firework',spring:'nian',lantern:'rabbit',valentine:'heart',dragonboat:'boat',qixi:'bridge',midautumn:'mooncake'};
  for(const [id,motif] of Object.entries(festivals)){const {game}=makeGame({festival:{id}});assert.equal(game.capScene.motif,motif);game.destroy();}
  assert.equal(new Set(CAP_MOTIFS).size,16);
  const selected=resolveCapScene({id:'special',motif:'heart',color:'#abc',accent:'invalid'},4,null,{light:'#cba987'});
  assert.equal(selected.id,'special');assert.equal(selected.motif,'heart');assert.equal(selected.color,'#aabbcc');assert.equal(selected.accent,'#cba987');
  assert.equal(resolveCapScene({motif:'unexpected'},NaN).motif,'station');
});

test('E grants immediate control while the clasp, hinged lid, and peek play in order',()=>{
  const events=[];const {game}=makeGame({}, {onCapEvent:event=>events.push(event)});
  assert.equal(game.toggleSoul(),true);assert.equal(game.form,'soul');assert.equal(game.getSnapshot().cap.phase,'opening');assert.equal(game.capOpen,0);
  const start=game.soul.x;game.setInput({x:1});tick(game,.08);
  assert.ok(game.soul.x>start,'physics must move during the clasp gesture');assert.equal(game.capOpen,0);assert.equal(game.getSoulPresentation().scale,.36);
  tick(game,.2);assert.ok(game.capOpen>0&&game.capOpen<1);assert.ok(game.getSoulPresentation().scale>.36&&game.getSoulPresentation().scale<1);
  tick(game,.4);assert.equal(game.getSnapshot().cap.phase,'open');assert.equal(game.capOpen,1);assert.equal(game.getSoulPresentation().scale,1);assert.equal(game.getSnapshot().cap.opens,1);
  assert.ok(game.cap.projection>0);tick(game,1.2);assert.equal(game.cap.projection,0,'the enlarged theatre must not linger');
  assert.deepEqual(events.map(e=>e.type),['open']);game.emitHud();game.render();assert.equal(events.length,1);game.destroy();
});

test('recall immediately returns body control while the soul follows a curve and then the lid closes',()=>{
  const {game}=makeGame();game.toggleSoul();tick(game,.7);game.soul.x=game.body.x+170;game.soul.y=game.body.y-160;
  const source={x:game.soul.x,y:game.soul.y},bodyX=game.body.x;
  assert.equal(game.recall(),true);assert.equal(game.form,'body');assert.equal(game.getSnapshot().cap.phase,'returning');
  assert.equal(game.getSoulPresentation().x,source.x);assert.equal(game.getSoulPresentation().y,source.y);
  game.setInput({x:1});tick(game,.2);const curved=game.getSoulPresentation();assertPose(curved);assert.ok(curved.y<source.y,'the return should arc above its endpoints');assert.ok(game.body.x>bodyX,'return animation cannot lock walking');assert.equal(game.capOpen,1);
  tick(game,.3);assert.equal(game.getSoulPresentation(),null);assert.ok(game.capOpen>0&&game.capOpen<1,'the lid catches the soul, then gently closes');
  tick(game,.3);assert.equal(game.capOpen,0);assert.equal(game.cap.returnFrom,null);assert.equal(game.getSnapshot().cap.phase,'closed');game.destroy();
});

test('rapid alternating E presses cancel the old presentation without a ghost, lock, or duplicated event',()=>{
  const events=[];const {game}=makeGame({}, {onCapEvent:event=>events.push(event.type)});
  for(let i=0;i<24;i++){
    assert.equal(game.toggleSoul(),true);assert.equal(game.form,'soul');assert.equal(game.cap.returnFrom,null);tick(game,.12);assertPose(game.getSoulPresentation());
    assert.equal(game.toggleSoul(),true);assert.equal(game.form,'body');tick(game,.08);assertPose(game.getSoulPresentation());
  }
  tick(game,1);assert.equal(game.getSoulPresentation(),null);assert.equal(game.capOpen,0);assert.equal(game.getSnapshot().cap.opens,24);
  assert.equal(events.filter(e=>e==='open').length,24);assert.equal(events.filter(e=>e==='return').length,24);assert.ok(game.particles.length<=180);assert.ok(game.thoughtFlights.length<=8);
  assert.equal(game.jump(),true);assert.ok(game.body.vy<0);game.destroy();
});

test('a recall before the peek never creates a suddenly enlarged ghost',()=>{
  const {game}=makeGame();game.toggleSoul();game.recall();assert.equal(game.getSoulPresentation(),null);
  tick(game,.1);game.toggleSoul();tick(game,.3);const before=game.getSoulPresentation();game.recall();const after=game.getSoulPresentation();
  assert.ok(after);assert.equal(after.scale,before.scale);assert.equal(after.alpha,before.alpha);tick(game,1);assert.equal(game.getSoulPresentation(),null);game.destroy();
});

test('manual pause freezes opening, projection, and curved return presentation',()=>{
  const {game}=makeGame();game.toggleSoul();tick(game,.3);game.pause();
  const opening=structuredClone(game.cap),openingPose=game.getSoulPresentation(),clock=game.time;
  tick(game,3);game.render();assert.deepEqual(game.cap,opening);assert.deepEqual(game.getSoulPresentation(),openingPose);assert.equal(game.time,clock);
  game.resume();tick(game,.5);game.soul.x+=90;game.recall();tick(game,.2);game.pause();
  const returning=structuredClone(game.cap),returnPose=game.getSoulPresentation();tick(game,3);game.render();assert.deepEqual(game.cap,returning);assert.deepEqual(game.getSoulPresentation(),returnPose);
  game.resume();tick(game,1);assert.equal(game.cap.phase,'closed');game.destroy();
});

test('puzzle ownership freezes presentation and emits one seal event after successful resolution',()=>{
  const events=[];let game;({game}=makeGame({}, {onPuzzle:noop,onCapEvent:event=>events.push({...event,lit:game?.lanterns[event.index]?.lit})}));
  game.body.x=420;game.update(1/60);game.toggleSoul();tick(game,.3);Object.assign(game.soul,{x:game.lanterns[0].x,y:game.lanterns[0].y});game.pulse();
  assert.equal(game.state,'paused');const cap=structuredClone(game.cap);tick(game,3);assert.deepEqual(game.cap,cap);assert.equal(game.toggleSoul(),false);
  game.resolvePuzzle(true);assert.equal(game.lanterns[0].lit,true);assert.equal(events.filter(e=>e.type==='seal').length,1);assert.equal(events.find(e=>e.type==='seal').lit,true);assert.equal(game.lightSeal(0),false);assert.equal(events.filter(e=>e.type==='seal').length,1);game.destroy();
});

test('exhausted energy recalls through the same animation and does not delay recovery',()=>{
  const events=[];const {game}=makeGame({}, {onCapEvent:event=>events.push(event.type)});game.toggleSoul();tick(game,.7);game.energy=.001;game.update(1/60);
  assert.equal(game.form,'body');assert.equal(game.cap.phase,'returning');assert.ok(game.getSoulPresentation());assert.equal(game.toggleSoul(),false);
  tick(game,1);assert.equal(game.cap.phase,'closed');assert.equal(game.getSoulPresentation(),null);assert.ok(game.energy>=18);assert.equal(game.toggleSoul(),true);
  assert.deepEqual(events,['open','return','open']);game.destroy();
});

test('fall recovery, restarting, completing, and destruction clear presentation without touching solved goals',()=>{
  const {game}=makeGame();game.lightSeal(0);game.memories[0].collected=true;game.toggleSoul();tick(game,.7);game.recall();tick(game,.2);game.body.y=730;game.update(1/60);
  assert.equal(game.form,'body');assert.equal(game.cap.phase,'closed');assert.equal(game.cap.returnFrom,null);assert.equal(game.getSoulPresentation(),null);assert.equal(game.thoughtFlights.length,0);assert.equal(game.getSnapshot().cap.opens,1);assert.equal(game.lanterns[0].lit,true);assert.equal(game.memories[0].collected,true);
  game.restart();assert.equal(game.getSnapshot().cap.opens,0);assert.equal(game.cap.phase,'closed');game.toggleSoul();tick(game,.7);game.recall();game.lightSeal(0);game.lightSeal(1);game.body.x=game.level.exit.x;game.body.y=game.level.exit.y;game.update(1/60);
  assert.equal(game.state,'complete');assert.equal(game.getSoulPresentation(),null);assert.equal(game.capOpen,0);
  game.restart();game.toggleSoul();tick(game,.7);game.recall();game.destroy();assert.equal(game.getSoulPresentation(),null);assert.equal(game.cap.returnFrom,null);assert.equal(game.cap.phase,'closed');assert.equal(game.thoughtFlights.length,0);
});

test('reduced motion skips presentation travel, keeps controls and plate puzzles, and can be enabled mid-return',()=>{
  const events=[];const {game}=makeGame({reducedMotion:true},{onCapEvent:event=>events.push(event.type)});
  game.body.x=420;game.update(1/60);game.toggleSoul();assert.equal(game.cap.phase,'open');assert.equal(game.capOpen,1);assert.equal(game.cap.projection,0);assert.equal(game.getSoulPresentation().x,game.soul.x);
  game.setInput({x:1});const before=game.soul.x;tick(game,.4);assert.ok(game.soul.x>before);assert.equal(game.barrierOpen(game.level.barriers[0]),true);
  Object.assign(game.soul,{x:game.lanterns[0].x,y:game.lanterns[0].y});assert.equal(game.pulse(),true);assert.equal(game.lanterns[0].lit,true);assert.equal(game.thoughtFlights.length,0);
  game.recall();assert.equal(game.cap.phase,'closed');assert.equal(game.getSoulPresentation(),null);
  game.setReducedMotion(false);game.toggleSoul();tick(game,.7);game.recall();tick(game,.2);assert.ok(game.getSoulPresentation());const count=events.length;game.setReducedMotion(true);assert.equal(game.getSoulPresentation(),null);assert.equal(game.capOpen,0);assert.equal(events.length,count);game.render();game.destroy();
});

test('memory and seal notifications carry exact original array indices and only fire on a successful first action',()=>{
  for(const options of [{chapterIndex:3},{festival:{id:'halloween'}}]){
    const events=[];let game;({game}=makeGame(options,{onCapEvent:event=>events.push({...event,stored:event.type==='memory'?game.memories[event.index].collected:event.type==='seal'?game.lanterns[event.index].lit:true})}));
    for(let index=0;index<3;index++){Object.assign(game.memories[index],{x:game.body.x,y:game.body.y-30});game.update(1/60);game.update(1/60);}
    game.lightSeal(0);game.lightSeal(0);game.lightSeal(1);game.lightSeal(1);game.emitHud();game.render();
    assert.deepEqual(events.filter(e=>e.type==='memory').map(e=>e.index),[0,1,2]);assert.deepEqual(events.filter(e=>e.type==='seal').map(e=>e.index),[0,1]);assert.ok(events.every(e=>e.stored));
    assert.ok(events.every(e=>e.mode===game.mode&&e.chapterIndex===game.chapterIndex&&e.festivalId===game.festivalId));assert.equal(game.getSnapshot().memories,3);assert.equal(game.getSnapshot().seals,2);game.destroy();
  }
});

test('all sixteen native miniatures and cap phases render finite geometry in normal and reduced motion',()=>{
  for(const motif of CAP_MOTIFS){
    const standalone=makeContext();for(const time of [0,.5,20,Number.MAX_VALUE,NaN])drawCapMiniature(standalone,{motif,color:'#b8ead1',accent:'#f4c48d'},time);
    assert.ok(standalone.calls.length>100);
    for(const reducedMotion of [false,true]){
      const {game,context}=makeGame({capScene:{motif,color:'#b8ead1',accent:'#f4c48d'},reducedMotion});game.render();game.toggleSoul();tick(game,.28);game.render();tick(game,.5);game.render();game.recall();tick(game,.2);game.render();tick(game,.6);game.render();assert.ok(context.calls.length>500);game.destroy();
    }
  }
});

test('brain vision is exclusive to soul form and never modifies plate, goal, or movement data',()=>{
  const {game}=makeGame();let context=makeContext();drawSoulVision(game,context,0);assert.equal(context.calls.length,0);
  game.toggleSoul();const physics={body:structuredClone(game.body),soul:structuredClone(game.soul),plate:[...game.plateState],lamps:structuredClone(game.lanterns),memories:structuredClone(game.memories)};
  context=makeContext();drawSoulVision(game,context,.5);assert.ok(context.calls.length>0);assert.deepEqual(game.body,physics.body);assert.deepEqual(game.soul,physics.soul);assert.deepEqual([...game.plateState],physics.plate);assert.deepEqual(game.lanterns,physics.lamps);assert.deepEqual(game.memories,physics.memories);game.destroy();
});
