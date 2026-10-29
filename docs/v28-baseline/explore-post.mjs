// Sixth-chapter BEFORE baseline. Explicit offline chapterIndex:5 entry fixture.
// After start, gameplay uses public input methods only. No coordinates, lamps,
// hazard clocks/frozen values, progress or saves are assigned by this harness.
// Usage: node docs/v28-baseline/explore-post.mjs [outputRoot] [viewport] [checkoutRoot]
// Viewports are actual engine canvas sizes, not browser/page screenshots.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';

const root=resolve(process.argv[4]||fileURLToPath(new URL('../../',import.meta.url)));
const outputRoot=resolve(process.argv[2]||'/tmp/tougaigu-v28-post-baseline');
const label=process.argv[3]||'desktop';
const dimensions={desktop:[1100,640],'phone-390':[390,595],'phone-320':[320,431]};
assert.ok(dimensions[label],'Use desktop, phone-390 or phone-320');
const [width,height]=dimensions[label],output=resolve(outputRoot,label);
await mkdir(output,{recursive:true});
const require=createRequire(import.meta.url);
const {createCanvas}=require(require.resolve('@napi-rs/canvas',{
  paths:[root,process.cwd(),process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'']
}));
const noop=()=>{};
globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
const {DreamGame}=await import(pathToFileURL(resolve(root,'dist/dream-engine.js')));
const {DreamGame:BaseGame,DREAM_PHYSICS}=await import(pathToFileURL(resolve(root,'dist/dream-engine-base.js')));
const {PUZZLES}=await import(pathToFileURL(resolve(root,'dist/dream-story.js')));
const {getStoryEncounter}=await import(pathToFileURL(resolve(root,'dist/dream-encounters.js')));
const canvas=createCanvas(width,height),baseCanvas=createCanvas(width,height);
for(const c of [canvas,baseCanvas])c.getBoundingClientRect=()=>({width,height});
const clone=x=>JSON.parse(JSON.stringify(x));
const hash=x=>createHash('sha256').update(x).digest('hex');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let updates=0,checks=0,eventCursor=0;
const callbacks={integrated:[],base:[]},trace=[],tape=[];
async function sourceCommit(){
  // Read repository metadata without a subprocess; hashes remain authoritative.
  try{
    let dir=resolve(root,'.git');
    if((await stat(dir)).isFile())dir=resolve(root,(await readFile(dir,'utf8')).trim().replace(/^gitdir:\s*/,''));
    const head=(await readFile(resolve(dir,'HEAD'),'utf8')).trim();
    if(/^[0-9a-f]{40}$/.test(head))return head;
    const ref=head.replace(/^ref:\s*/,'');
    let common=dir;
    try{common=resolve(dir,(await readFile(resolve(dir,'commondir'),'utf8')).trim());}catch{}
    for(const store of [...new Set([dir,common])]){
      try{return (await readFile(resolve(store,ref),'utf8')).trim();}catch{}
      try{const packed=(await readFile(resolve(store,'packed-refs'),'utf8')).split('\n').find(line=>line.endsWith(' '+ref))?.split(' ')[0];if(packed)return packed;}catch{}
    }
    return null;
  }catch{return null;}
}
const report={
  status:'running',sourceRoot:root,sourceCommit:await sourceCommit(),
  sourceVersion:JSON.parse(await readFile(resolve(root,'package.json'),'utf8')).version,
  viewport:{label,width,height},
  scope:'Offline Node Canvas gameplay with explicit chapterIndex:5 entry fixture; NOT browser unlock, HUD, touch, save, clock-choice, delayed-asset or browser-network verification.',
  fixture:{method:'start',options:{chapterIndex:5,sound:false}},
  controls:'Identical start/setInput/jump/toggleSoul/recall/interact/pulse/resolveTalk/resolvePuzzle controls and fixed-step update are delivered to integrated DreamGame and BaseGame. No body/soul/lantern/hazard/save assignments.',
  puzzleAdapter:'The authored correct answer is recorded; resolvePuzzle(true) is called only after a normal pulse creates the actual pendingSeal and pauses the game. No answer DOM exists in this offline harness.',
  capturesAreSimulationNeutral:'RAF is stubbed. Every image is encoded from the engine Canvas at its original size; no update occurs while rendering or encoding. This does not demonstrate a browser can screenshot during a 4.5-second freeze window.',
  sourceHashes:{},actions:[],captures:[],freezes:[],crossings:[],puzzles:[],respawns:[],rides:[],bounces:[],
};
for(const file of ['dream-engine.js','dream-engine-base.js','dream-levels.js','dream-story.js','dream-encounters.js','dream-encounter-art.js','dream-cap-art.js','dream-station-art.js']){
  report.sourceHashes[file]=hash(await readFile(resolve(root,'dist',file)));
}
const eventNames=['onEvent','onCapEvent','onComplete','onPuzzle','onTalk','onPause','onCapActivity','onLostCase','onHud'];
const hooks=id=>Object.fromEntries(eventNames.map(name=>[name,event=>callbacks[id].push({name,event:clone(event),update:updates})]));
const game=new DreamGame(canvas,hooks('integrated'));
const base=new BaseGame(baseCanvas,hooks('base'));
function physical(g){
  return clone({time:g.time,visualTime:g.visualTime,state:g.state,form:g.form,runId:g.runId,
    body:g.body,soul:g.soul,energy:g.energy,maxEnergy:g.maxEnergy,deaths:g.deaths,completed:g.completed,
    input:g.input,movers:g.movers,pads:g.pads,hazards:g.hazards,lanterns:g.lanterns,memories:g.memories,
    checkpoint:g.checkpoint,pendingSeal:g.pendingSeal,pendingTalk:g.pendingTalk,
    pulseCooldown:g.pulseCooldown,jumpBuffer:g.jumpBuffer,plateState:[...(g.plateState||[])],
    camera:g.camera,viewWidth:g.viewWidth,scale:g.scale});
}
function verify(reason,record=false){
  const integrated=physical(game),baseline=physical(base);
  assert.deepEqual(integrated,baseline,'same-input physics mismatch at '+reason+' update '+updates);
  assert.equal(callbacks.integrated.length,callbacks.base.length,'callback count mismatch at '+reason);
  while(eventCursor<callbacks.integrated.length){
    assert.deepEqual(callbacks.integrated[eventCursor],callbacks.base[eventCursor],'callback mismatch at '+eventCursor);
    eventCursor++;
  }
  checks++;
  if(record)trace.push(JSON.stringify({update:updates,reason,input:clone(game.input),integrated,base:baseline,exactlyEqual:true,callbacksCompared:eventCursor}));
  return integrated;
}
function act(method,...args){
  const before=physical(game),a=game[method](...args),b=base[method](...args);
  assert.deepEqual(a,b,'public control result differs: '+method);
  tape.push({update:updates,method,args});
  if(method!=='setInput')report.actions.push({update:updates,method,args,result:a??null,before});
  verify(method,method!=='setInput');
  return a;
}
function tick(frames=1){
  for(let i=0;i<frames;i++){
    const body=game.body,baseBody=base.body;
    game.update(1/60);base.update(1/60);updates++;
    tape.push({update:updates,method:'update',args:[1/60]});
    const state=verify('update',true);
    if(body!==game.body||baseBody!==base.body)report.respawns.push({update:updates,integratedChanged:body!==game.body,baseChanged:baseBody!==base.body,state});
    assert.equal(game.deaths,0,'Route must never depend on a respawn');
  }
}
async function capture(name){
  const before=physical(game),beforeBase=physical(base);
  game.render();base.render();
  assert.deepEqual(physical(game),before,'Integrated rendering must not advance physics');
  assert.deepEqual(physical(base),beforeBase,'Base rendering must not advance physics');
  verify('render');
  const bytes=await canvas.encode('png'),file=name+'.png';
  await writeFile(resolve(output,file),bytes);
  assert.deepEqual(physical(game),before,'PNG encoding must not consume simulated freeze time');
  report.captures.push({name,file,width,height,bytes:bytes.length,sha256:hash(bytes),update:updates,simulationTime:game.time,state:before});
  process.stdout.write(JSON.stringify({capture:name,time:game.time,bodyX:game.body.x,form:game.form,deaths:game.deaths})+'\n');
}
function walk(target,{limit=1000,observe}={}){
  assert.equal(game.form,'body');
  report.actions.push({method:'walk-feedback',target,rule:'clamp((target-body.x)/35,-1,1); no jump or position edits',update:updates});
  for(let i=0;i<limit;i++){
    if(game.state==='complete')return;
    if(Math.abs(game.body.x-target)<2&&Math.abs(game.body.vx)<10&&game.body.grounded){act('setInput',{x:0,y:0});tick(6);return;}
    act('setInput',{x:clamp((target-game.body.x)/35,-1,1),y:0});tick();
    observe?.();
  }
  throw Error('Walk timeout: '+JSON.stringify(physical(game)));
}
function fly(x,y,{threshold=12,limit=900}={}){
  assert.equal(game.form,'soul');
  report.actions.push({method:'fly-feedback',target:{x,y},rule:'position error / 75 minus actual authored wind / soulSpeed, clamped input axes',update:updates});
  for(let i=0;i<limit;i++){
    const dx=x-game.soul.x,dy=y-game.soul.y;
    if(Math.hypot(dx,dy)<threshold&&Math.hypot(game.soul.vx,game.soul.vy)<55){act('setInput',{x:0,y:0});return;}
    let wx=0,wy=0;
    for(const wind of game.level.winds)if(game.soul.x>=wind.x&&game.soul.x<=wind.x+wind.w&&game.soul.y>=wind.y&&game.soul.y<=wind.y+wind.h){wx+=wind.dx;wy+=wind.dy;}
    act('setInput',{x:clamp(dx/75-wx/DREAM_PHYSICS.soulSpeed,-1,1),y:clamp(dy/75-wy/DREAM_PHYSICS.soulSpeed,-1,1)});tick();
    assert.equal(game.form,'soul','Planned flight must not drain energy into an automatic recall');
  }
  throw Error('Flight timeout: '+JSON.stringify({target:{x,y},state:physical(game)}));
}
async function solve(index){
  const lamp=game.lanterns[index];fly(lamp.x,lamp.y);
  assert.equal(act('pulse'),true);assert.equal(game.pendingSeal,index);
  const puzzle=PUZZLES.find(p=>p.chapterIndex===5&&p.sealIndex===index);
  report.puzzles.push({update:updates,id:puzzle.id,sealIndex:index,answer:puzzle.answer,text:puzzle.options[puzzle.answer],actualPendingSeal:game.pendingSeal});
  assert.equal(act('resolvePuzzle',true),true);
  await capture('lamp-'+(index+1)+'-lit');
}
function freeze(index,target){
  fly(...target);
  const before=physical(game);
  assert.equal(act('pulse'),true);
  assert.equal(game.hazards[index].frozen,4.5,'Normal pulse must freeze the intended actual pendulum');
  const snapshot={index,target,update:updates,time:game.time,before,after:physical(game),
    distances:before.hazards.map(h=>Math.hypot(h.px-before.soul.x,h.py-before.soul.y))};
  report.freezes.push(snapshot);return snapshot;
}
function waitUntil(predicate,limit=1200){
  for(let i=0;i<limit;i++){if(predicate())return;tick();}
  throw Error('Bounded route wait timed out: '+JSON.stringify(physical(game)));
}
async function boardAndCross(){
  const mover=()=>game.movers.find(p=>p.id==='last-stage');
  walk(760);assert.equal(act('jump'),true);
  waitUntil(()=>game.body.grounded&&game.body.y===465,100);
  assert.equal(game.body.platform,null);walk(845);await capture('left-fixed-platform');
  waitUntil(()=>mover().x<=850&&mover().dx>0);
  const launch=physical(game);act('setInput',{x:1,y:0});
  waitUntil(()=>game.body.grounded&&game.body.platform==='last-stage',100);
  act('setInput',{x:0,y:0});waitUntil(()=>game.body.vx===0,30);
  assert.equal(game.body.platform,'last-stage');
  const boarded=physical(game),relative=game.body.x-mover().x;
  await capture('floating-book-boarded');
  const frames=Math.ceil((Math.PI*2/mover().speed+.15)*60),samples=[];
  let maxContactError=0,maxRelativeXDrift=0,left=0,right=0,minX=Infinity,maxX=-Infinity;
  for(let i=0;i<frames;i++){
    tick();const p=mover();
    assert.equal(game.body.platform,'last-stage','The actual mover retains its same-height support tie');assert.equal(game.body.grounded,true);
    const footError=Math.abs(game.body.y-p.y),drift=Math.abs(game.body.x-p.x-relative);
    maxContactError=Math.max(maxContactError,footError);maxRelativeXDrift=Math.max(maxRelativeXDrift,drift);
    assert.equal(footError,0);assert.ok(drift<1e-9,'Numerical carry drift must remain negligible');
    minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);if(p.dx<0)left++;if(p.dx>0)right++;
    samples.push({update:updates,time:game.time,body:clone(game.body),mover:clone(p),input:clone(game.input),relativeX:game.body.x-p.x});
  }
  assert.ok(left>0&&right>0&&maxX-minX>369,'Observe a full authored horizontal cycle');
  assert.equal(act('toggleSoul'),true);fly(1100,305);assert.equal(game.memories[1].collected,true);
  await capture('floating-book-second-memory');assert.equal(act('recall'),true);
  waitUntil(()=>mover().x>=1120&&mover().dx>0);
  const disembark=physical(game);assert.equal(game.body.platform,'last-stage');
  assert.equal(act('jump'),true);walk(1280);
  assert.equal(game.body.y,465);assert.equal(game.body.platform,null,'A normal jump lands on the fixed right platform');
  const landing=physical(game);await capture('right-fixed-platform');
  report.rides.push({id:'last-stage',launch,boarded,noInputFrames:frames,noInputSeconds:frames/60,minX,maxX,maxContactError,maxRelativeXDrift,leftFrames:left,rightFrames:right,samples,disembark,landing,normalJumpToFixedRightPlatform:true});
}
try{
  act('start',{chapterIndex:5,sound:false});tick(66);
  report.authoredGeometry=clone(game.level);
  const glyph=createCanvas(120,50),gc=glyph.getContext('2d');gc.font='16px "PingFang SC","Microsoft YaHei",sans-serif';gc.fillText('归先生',5,30);
  report.fontEvidence={cjkProbeText:'归先生',nontransparentPixels:Array.from(gc.getImageData(0,0,120,50).data).filter((v,i)=>i%4===3&&v>0).length,note:'Offline font probe, not evidence of browser Chinese glyph rendering.'};
  await capture('entry');
  walk(120);assert.equal(act('interact'),true);assert.equal(game.pendingTalk,'story-npc-5');
  report.npcLines=getStoryEncounter(5,{seals:0,repeated:false});
  await capture('keeper-talk');assert.equal(act('resolveTalk'),true);
  walk(430);assert.equal(game.plateState.get('letter'),true);assert.equal(game.barrierOpen(game.level.barriers[0]),true);
  await capture('body-on-letter-plate');
  assert.equal(act('toggleSoul'),true);fly(225,420);assert.equal(game.memories[0].collected,true);
  await solve(0);assert.equal(act('recall'),true);tick(60);
  walk(650);assert.equal(game.barrierOpen(game.level.barriers[0]),true);
  await boardAndCross();
  walk(1420);assert.ok(game.checkpoint.index>=1);assert.equal(game.body.y,560);
  walk(1440);act('setInput',{x:1,y:0});waitUntil(()=>game.pads[0].boing>0&&game.body.vy<0,60);
  const springLaunch=physical(game);assert.equal(game.body.vy,-850);assert.equal(game.body.grounded,false);
  await capture('mushroom-launched-body');
  // Preserve normal rightward control in the air; opening the cap here would
  // remove the body's horizontal drive and is deliberately not this route.
  walk(1680);assert.equal(game.body.y,390);assert.equal(game.body.grounded,true);
  const rootLanding=physical(game);await capture('root-platform-landing');
  report.bounces.push({actualPad:clone(game.pads[0]),launch:springLaunch,rootLanding,normalBodyInputOnly:true});
  walk(1880);assert.ok(game.checkpoint.index>=2);walk(2110);
  const h=game.hazards[0],fullSweepLeft=h.x-Math.sin(h.swing)*h.length-h.r-game.body.w/2;
  assert.ok(game.body.x<fullSweepLeft,'Actual body waits outside the entire pendulum sweep');
  report.lastPendulumSafeAnchor={body:clone(game.body),fullSweepLeft,time:game.time};
  assert.equal(act('toggleSoul'),true);await solve(1);
  fly(2350,400);assert.equal(game.memories[2].collected,true);await capture('wind-and-third-memory');
  freeze(0,[2350,380]);await capture('last-pendulum-frozen');
  const beforeExit=physical(game);assert.equal(act('recall'),true);
  // No cap animation wait in the frozen crossing. Normal completion happens
  // before the pendulum's full right sweep edge; no claim of clearing it.
  walk(2540);assert.equal(game.state,'complete');assert.ok(game.hazards[0].frozen>0);
  report.crossings.push({scope:'Normal body exit occurs while the last pendulum is still frozen, before the full sweep right edge; not a full-sweep traversal claim.',start:beforeExit,end:physical(game),elapsed:game.time-beforeExit.time,remainingFreezeAtCompletion:game.hazards[0].frozen});
  assert.equal(game.lanterns.filter(l=>l.lit).length,2);assert.equal(game.memories.filter(m=>m.collected).length,3);
  assert.equal(report.respawns.length,0);assert.equal(game.deaths,0);
  const completions=callbacks.integrated.filter(e=>e.name==='onComplete');assert.equal(completions.length,1);assert.equal(completions[0].event.chapterIndex,5);
  await capture('complete');
  for(const [file,digest] of Object.entries(report.sourceHashes))assert.equal(hash(await readFile(resolve(root,'dist',file))),digest,'Source file changed while capturing baseline: '+file);
  report.status='passed';
}catch(error){report.status='failed';report.error=error.stack;process.exitCode=1;}
finally{
  report.final=physical(game);report.updates=updates;report.comparisonChecks=checks;report.callbacksCompared=eventCursor;
  report.callbacks=callbacks;report.completions=callbacks.integrated.filter(e=>e.name==='onComplete');
  report.exactPhysicsAndEventsEqual=report.status==='passed';
  const raw=Buffer.from(trace.join('\n')+'\n'),compressed=gzipSync(raw,{level:9});
  await writeFile(resolve(output,'physics-trace.jsonl.gz'),compressed);
  const input=Buffer.from(JSON.stringify({scope:report.scope,sourceHashes:report.sourceHashes,steps:tape},null,2)+'\n');
  await writeFile(resolve(output,'input-tape.json'),input);
  report.trace={file:'physics-trace.jsonl.gz',rows:trace.length,compressedBytes:compressed.length,compressedSha256:hash(compressed),uncompressedBytes:raw.length,uncompressedSha256:hash(raw),contents:'Every fixed update and non-direction public action; integrated and BaseGame physical state, energy, hazards, inputs and callback equality position.'};
  report.inputTape={file:'input-tape.json',steps:tape.length,bytes:input.length,sha256:hash(input)};
  await writeFile(resolve(output,'route-report.json'),JSON.stringify(report,null,2)+'\n');
  process.stdout.write(JSON.stringify({status:report.status,updates,time:game.time,deaths:game.deaths,checks,callbacksCompared:eventCursor,completions:report.completions,crossings:report.crossings.map(c=>({elapsed:c.elapsed,remainingFreezeAtCompletion:c.remainingFreezeAtCompletion})),error:report.error,output})+'\n');
  game.destroy();base.destroy();
}
