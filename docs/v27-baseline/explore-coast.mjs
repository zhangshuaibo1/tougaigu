// Fifth-chapter BEFORE baseline. Explicit offline chapterIndex:4 entry fixture.
// After start, gameplay uses public input methods only. No coordinates, lamps,
// hazard clocks/frozen values, progress or saves are assigned by this harness.
// Usage: node docs/v27-baseline/explore-coast.mjs [outputRoot] [viewport] [checkoutRoot]
// Viewports are actual engine canvas sizes, not browser/page screenshots.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';

const root=resolve(process.argv[4]||fileURLToPath(new URL('../../',import.meta.url)));
const outputRoot=resolve(process.argv[2]||'/tmp/tougaigu-v27-coast-baseline');
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
  scope:'Offline Node Canvas gameplay with explicit chapterIndex:4 entry fixture; NOT browser unlock, HUD, touch, save, clock-choice, delayed-asset or browser-network verification.',
  fixture:{method:'start',options:{chapterIndex:4,sound:false}},
  controls:'Identical start/setInput/jump/toggleSoul/recall/interact/pulse/resolveTalk/resolvePuzzle controls and fixed-step update are delivered to integrated DreamGame and BaseGame. No body/soul/lantern/hazard/save assignments.',
  puzzleAdapter:'The authored correct answer is recorded; resolvePuzzle(true) is called only after a normal pulse creates the actual pendingSeal and pauses the game. No answer DOM exists in this offline harness.',
  capturesAreSimulationNeutral:'RAF is stubbed. Every image is encoded from the engine Canvas at its original size; no update occurs while rendering or encoding. This does not demonstrate a browser can screenshot during a 4.5-second freeze window.',
  sourceHashes:{},actions:[],captures:[],freezes:[],crossings:[],puzzles:[],respawns:[],
};
for(const file of ['dream-engine.js','dream-engine-base.js','dream-levels.js','dream-story.js','dream-encounters.js']){
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
  const puzzle=PUZZLES.find(p=>p.chapterIndex===4&&p.sealIndex===index);
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
function cross(indices,target){
  const start=physical(game),clears=[];
  assert.equal(act('recall'),true);
  // NO tick-for-animation, screenshot, dialogue or settling wait here.
  walk(target,{observe(){
    for(const index of indices){
      if(clears.some(c=>c.index===index))continue;
      const h=game.hazards[index];
      const rightmost=h.x+Math.sin(h.swing)*h.length+h.r+game.body.w/2;
      if(game.body.x>rightmost){
        assert.ok(h.frozen>0,'Body clears the full authored sweep while this pendulum remains frozen');
        clears.push({index,update:updates,time:game.time,bodyX:game.body.x,fullSweepRight:rightmost,
          elapsedSinceLastPulse:game.time-start.time,remainingFreeze:h.frozen,state:physical(game)});
      }
    }
  }});
  assert.equal(clears.length,indices.length);
  report.crossings.push({indices,target,start,clears,end:physical(game),elapsed:game.time-start.time});
}
try{
  act('start',{chapterIndex:4,sound:false});tick(30);
  report.authoredGeometry=clone(game.level);
  await capture('entry');
  walk(120);assert.equal(act('interact'),true);assert.equal(game.pendingTalk,'story-npc-4');
  report.npcLines=getStoryEncounter(4,{seals:0,repeated:false});
  await capture('keeper-talk');assert.equal(act('resolveTalk'),true);
  // x=585 is left of the complete first pendulum sweep, including collision radii.
  walk(585);await capture('first-two-left-safe');
  assert.equal(act('toggleSoul'),true);
  fly(355,415);assert.equal(game.memories[0].collected,true);
  await solve(0);
  // Target slightly left of memory center remains inside the 565-pixel tether.
  fly(1110,320);assert.equal(game.memories[1].collected,true);
  await capture('wind-and-second-memory');
  freeze(0,[820,420]);await capture('pendulum-1-frozen');
  freeze(1,[1100,420]);await capture('pendulum-2-frozen');
  cross([0,1],1400);await capture('first-two-passed');
  assert.equal(act('toggleSoul'),true);await solve(1);
  fly(1915,420);assert.equal(game.memories[2].collected,true);
  await capture('third-memory-before-freeze');
  freeze(2,[1720,410]);await capture('pendulum-3-frozen');
  cross([2],1960);await capture('all-three-passed');
  walk(2030);await capture('two-lamps-exit-approach');
  walk(2120);assert.equal(game.state,'complete');
  assert.equal(game.lanterns.filter(l=>l.lit).length,2);
  assert.equal(game.memories.filter(m=>m.collected).length,3);
  assert.equal(report.respawns.length,0);assert.equal(game.deaths,0);
  const completions=callbacks.integrated.filter(e=>e.name==='onComplete');
  assert.equal(completions.length,1);assert.equal(completions[0].event.chapterIndex,4);
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
  process.stdout.write(JSON.stringify({status:report.status,updates,time:game.time,deaths:game.deaths,checks,callbacksCompared:eventCursor,completions:report.completions,crossings:report.crossings.map(c=>({indices:c.indices,elapsed:c.elapsed,clears:c.clears.map(x=>({index:x.index,remainingFreeze:x.remainingFreeze,elapsed:x.elapsedSinceLastPulse}))})),error:report.error,output})+'\n');
  game.destroy();base.destroy();
}
