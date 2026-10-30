// Independent short read-only engine audit. Normal engine-method inputs,
// instrumented mock 2D consumers; not DOM/browser or complete chapter proof.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
const root='/workspace/scratch/2b18af2db412/tougaigu-v34-framing-prestudy';
const original='/workspace/scratch/2b18af2db412/tougaigu-v33-formal';
const out='/tmp/v34-framing-independent-review';
assert.equal(execFileSync('git',['-C',original,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),'1d63072bb9a27690ed14b15d3103c6e8a87fa297');
const hash=b=>createHash('sha256').update(b).digest('hex');
const paths=['dist/dream-engine-base.js','dist/dream-cap-framing.js','dist/dream-engine.js'];
const hashes=async()=>Object.fromEntries(await Promise.all(paths.map(async p=>[p,hash(await readFile(root+'/'+p))])));
const sourceHashes=await hashes();
const {DreamGame:Current}=await import(pathToFileURL(root+'/dist/dream-engine.js'));
const {DreamGame:Previous}=await import(pathToFileURL(original+'/dist/dream-engine.js'));
const noop=()=>{};globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
const clone=o=>JSON.parse(JSON.stringify(o));
function make(Class,width,height){
  let dimensions={width,height};const events=[];let translateObserver=null;
  const c=new Proxy({globalAlpha:1,createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop}),measureText:t=>({width:String(t).length*8}),translate:(x,y)=>translateObserver?.(x,y)},{get:(o,k)=>k in o?o[k]:noop});
  const g=new Class({getContext:()=>c,getBoundingClientRect:()=>dimensions},{onEvent:e=>events.push(clone(e)),onCapEvent:e=>events.push(clone(e))});
  g.start({chapterIndex:0,sound:false,outfit:'halloween'});g.render();
  return {g,events,resize(width,height){dimensions={width,height};g.resize();},watchTranslate(fn){translateObserver=fn;}};
}
const physics=g=>JSON.stringify({body:g.body,soul:g.soul,companion:g.companion,cap:g.cap,form:g.form,state:g.state,input:g.input,time:g.time,visualTime:g.visualTime,energy:g.energy,runId:g.runId,deaths:g.deaths,memories:g.memories,lanterns:g.lanterns,checkpoint:g.checkpoint,movers:g.movers,hazards:g.hazards,pads:g.pads,firstTicket:g.firstTicket,capScene:g.capScene,level:g.level,snapshot:g.getSnapshot()});
const records=[];
for(const [width,height]of[[320,431],[390,595]]){
  const current=make(Current,width,height),old=make(Previous,width,height),a=current.g,b=old.g,tape=[];
  let checks=0,deltaMax=0,changedCameraChecks=0;
  const digestA=createHash('sha256'),digestB=createHash('sha256');
  const equal=()=>{const x=physics(a),y=physics(b);assert.equal(x,y);assert.deepEqual(current.events,old.events);digestA.update(x);digestB.update(y);checks++;const delta=Math.abs(a.camera-b.camera);deltaMax=Math.max(deltaMax,delta);if(delta>10)changedCameraChecks++;};
  const act=(method,...args)=>{tape.push({method,args,atTime:a.time});assert.deepEqual(a[method](...args),b[method](...args));equal();};
  const step=(n=1,render=true)=>{for(let i=0;i<n;i++){a.update(1/60);b.update(1/60);equal();if(render){a.render();b.render();equal();}}};
  act('toggleSoul');step(44);
  let arrived=false;
  for(let i=0;i<600;i++){
    const dx=258-a.soul.x,dy=422-a.soul.y;
    if(Math.hypot(dx,dy)<1&&Math.hypot(a.soul.vx,a.soul.vy)<2){act('setInput',{x:0,y:0});step(24);arrived=true;break;}
    act('setInput',{x:Math.max(-1,Math.min(1,dx/65)),y:Math.max(-1,Math.min(1,dy/65))});step();
  }
  assert.ok(arrived);step(90);assert.ok(a.capFramingView.active);assert.equal(a.body.x,105);assert.ok(Math.abs(a.camera-b.camera)>10);assert.equal(a.activityFramed,false);
  const stable={camera:a.camera,originalCamera:b.camera,delta:Math.abs(a.camera-b.camera),body:clone(a.body),soul:clone(a.soul),framing:clone(a.capFramingView)};
  let frame=null;
  for(const name of ['getCharacterPresentation','getSoulPresentation','getSceneBackdropView','drawBackground','drawCompanion','drawTether','drawCharacter','drawSoul','drawForeground']){
    const originalMethod=a[name].bind(a);
    a[name]=(...args)=>{
      if(!frame)return originalMethod(...args);
      if(name==='getCharacterPresentation'){const p=originalMethod(...args);frame.characterReads++;if(!frame.character)frame.character=p;return p;}
      if(name==='getSoulPresentation'){const s=originalMethod(...args);frame.soulReads++;if(!frame.soulRead){frame.soulRead=true;frame.soul=s;assert.strictEqual(args[0],frame.character);}return s;}
      if(name==='drawCharacter'){assert.strictEqual(args[3],frame.soul);assert.strictEqual(args[4],frame.character);}
      if(name==='drawTether'){assert.strictEqual(args[2],frame.soul);assert.strictEqual(args[3],frame.character);}
      if(name==='drawSoul')assert.strictEqual(args[1],frame.soul);
      if(name==='drawCompanion'){assert.ok(a.companionRenderScope.ready);assert.strictEqual(a.companionRenderScope.shown,frame.soul);}
      frame.consumers.push({method:name,camera:a.camera});const value=originalMethod(...args);
      if(name==='getSceneBackdropView')assert.equal(value.cameraX,a.camera);
      if(name==='drawBackground')frame.awaitingWorldTranslate=true;
      return value;
    };
  }
  current.watchTranslate((x,y)=>{if(frame?.awaitingWorldTranslate){frame.awaitingWorldTranslate=false;frame.worldTranslate={x,y};}});
  function observedRender(label){
    frame={character:null,soul:null,soulRead:false,characterReads:0,soulReads:0,consumers:[],awaitingWorldTranslate:false};
    const before=physics(a);a.render();assert.equal(physics(a),before);b.render();equal();
    assert.equal(frame.characterReads,1);assert.equal(frame.soulReads,1);
    assert.ok(frame.consumers.length>=7);assert.ok(frame.consumers.every(c=>c.camera===a.camera));
    assert.deepEqual(frame.worldTranslate,{x:-a.camera+a.shake*Math.sin(a.visualTime*65)*3,y:0});
    assert.equal(a.capCameraFollow,null);assert.equal(a.companionRenderScope,null);
    const row={label,camera:a.camera,originalCamera:b.camera,characterReads:frame.characterReads,soulReads:frame.soulReads,consumers:frame.consumers,worldTranslate:frame.worldTranslate,sharedActualPoseReferences:true};frame=null;return row;
  }
  const batches=[];
  for(const count of [1,2,6,12]){
    act('setInput',{x:.12,y:0});const start=a.camera;let reconstructed=start;const targets=[];
    for(let i=0;i<count;i++){step(1,false);const target=Math.max(0,Math.min(a.level.width-a.viewWidth,a.soul.x-a.viewWidth*.43));reconstructed+=(target-reconstructed)*5.5/60;targets.push(target);}
    assert.ok(Math.abs(a.camera-reconstructed)<1e-9);assert.equal(a.capCameraFollow.start,start);const decay=(1-5.5/60)**count;assert.ok(Math.abs(a.capCameraFollow.decay-decay)<1e-14);
    const legacyBeforePaint=a.camera,weightedTarget=(legacyBeforePaint-start*decay)/(1-decay);
    const observed=observedRender('catch-up-'+count),v=a.capFramingView;assert.ok(v.active);
    const framedTarget=Math.max(v.low,Math.min(v.high,weightedTarget));const expected=start+(framedTarget-start)*(1-decay);
    assert.ok(Math.abs(a.camera-expected)<1e-9);
    const atFirstPaint=a.camera;const repeated=observedRender('repeat-no-update-'+count);assert.equal(a.camera,atFirstPaint);
    batches.push({updates:count,targets,start,decay,weightedTarget,framedTarget,expected,observed,repeated});
  }
  act('setInput',{x:0,y:0});step(30);
  act('pause');const paused=physics(a),pausedCamera=a.camera;
  a.render();b.render();equal();assert.equal(a.camera,pausedCamera);
  const otherWidth=width===320?390:320,otherHeight=width===320?595:431;
  current.resize(otherWidth,otherHeight);old.resize(otherWidth,otherHeight);a.render();b.render();equal();assert.equal(physics(a),paused);assert.ok(a.capFramingView.active);
  const resizeRecord={from:{width,height},to:{width:otherWidth,height:otherHeight},camera:a.camera,framing:clone(a.capFramingView),clock:a.time,physicalFrozen:true};
  assert.ok((a.capFramingView.bounds.left-a.camera)*a.scale>=8-1e-9);
  const firstResizedCamera=a.camera;for(let i=0;i<6;i++){a.render();b.render();equal();assert.equal(a.camera,firstResizedCamera);assert.equal(physics(a),paused);}
  const physicsHash=digestA.digest('hex'),oldHash=digestB.digest('hex');assert.equal(physicsHash,oldHash);assert.ok(changedCameraChecks>0);
  records.push({viewport:{width,height},checks,physicsHash,oldPhysicsHash:oldHash,changedCameraChecks,maxCameraDelta:deltaMax,stable,batches,resizeRecord,tape,scope:'First-station short normal-method route; no full chapter completion'});
  a.destroy();b.destroy();
}
assert.deepEqual(await hashes(),sourceHashes);
const report={status:'passed',scope:'Independent short normal-method engine comparison with actual changed camera, plus consumer/budget instrumentation on a mock2D context. Not real browser or a complete chapter.',originalCommit:'1d63072bb9a27690ed14b15d3103c6e8a87fa297',sourceHashes,sourceUnchanged:true,cases:records,
  limits:['Camera composition is checked for the captured frame geometry; it does not claim identical camera paths for arbitrary render frequencies while geometry itself changes.',
  'One primary character/soul read is asserted in these open-cap station frames. Existing NPC or postal paths can request other presentations; this module adds no such calls.',
  'The native-Canvas envelope audit is separate; this execution observes consumer arguments and shared references with a mock2D surface.']};
await writeFile(out+'/near-camera-budget-fixed-report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:'passed',cases:records.map(c=>({viewport:c.viewport,checks:c.checks,changedCameraChecks:c.changedCameraChecks,maxCameraDelta:c.maxCameraDelta,stableDelta:c.stable.delta,batches:c.batches.length,physicsHash:c.physicsHash})),sourceHashes}));
