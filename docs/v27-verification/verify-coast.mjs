// Replay immutable v26 inputs against production v27, using real Node Canvas
// pixels and the production WebP. Explicit offline chapter entrance fixture;
// this is not browser unlock, DOM, touch, storage or network evidence.
// node docs/v27-verification/verify-coast.mjs [outputRoot] [checkoutRoot]
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
const root=resolve(process.argv[3]||fileURLToPath(new URL('../../',import.meta.url)));
const output=resolve(process.argv[2]||'/tmp/tougaigu-v27-production-review');await mkdir(output,{recursive:true});
const require=createRequire(import.meta.url),{createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[root,process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'']}));
const noop=()=>{};globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
const {DreamGame}=await import(pathToFileURL(resolve(root,'dist/dream-engine.js')));
const {DreamGame:BaseGame}=await import(pathToFileURL(resolve(root,'dist/dream-engine-base.js')));
const {getPaintedCoastLayout,COAST_LIGHT_ZONES,COAST_PAINT_URL}=await import(pathToFileURL(resolve(root,'dist/dream-coast-scene.js')));
const {drawCoastPlatform,drawCoastPendulum}=await import(pathToFileURL(resolve(root,'dist/dream-coast-finish.js')));
const {drawStoryNPC,STORY_NPC_BOUNDS}=await import(pathToFileURL(resolve(root,'dist/dream-encounter-art.js')));
const {drawClockMiniature}=await import(pathToFileURL(resolve(root,'dist/dream-clock-echo.js')));
const hash=b=>createHash('sha256').update(b).digest('hex'),clone=x=>JSON.parse(JSON.stringify(x));
const sourceFiles=['dream-engine.js','dream-engine-base.js','dream-levels.js','dream-app.js','dream-coast-scene.js','dream-coast-finish.js','dream-clock-echo.js','dream-cap-art.js','dream-encounter-art.js','dream-station-art.js','assets/coast-painted-v27.webp'];
const sourceHashes=Object.fromEntries(await Promise.all(sourceFiles.map(async f=>[f,hash(await readFile(resolve(root,'dist',f)))])));
const webp=await loadImage(await readFile(fileURLToPath(COAST_PAINT_URL)));
assert.equal(webp.width,2172);assert.equal(webp.height,724);
const summary={status:'running',sourceRoot:root,sourceVersion:JSON.parse(await readFile(resolve(root,'package.json'),'utf8')).version,sourceHashes,productionImage:{url:COAST_PAINT_URL,width:webp.width,height:webp.height},scope:'Offline original-size Node Canvas rendering and exact frozen-input physics replay. start(chapterIndex:4) and selected clockChoice are explicit entry fixtures. No save/progress/position/hazard writes. Not browser DOM, touch, unlock, storage or real network failure evidence.',routes:[],clocks:[],pixelBounds:[],files:[]};
const clockInteriorPixels=new Map();
const dimensions={desktop:[1100,640],'phone-390':[390,595],'phone-320':[320,431]};
const hooks=['onEvent','onCapEvent','onComplete','onPuzzle','onTalk','onPause','onCapActivity','onLostCase','onHud'];
function physical(g){return clone({time:g.time,visualTime:g.visualTime,state:g.state,form:g.form,runId:g.runId,body:g.body,soul:g.soul,energy:g.energy,maxEnergy:g.maxEnergy,deaths:g.deaths,completed:g.completed,input:g.input,movers:g.movers,pads:g.pads,hazards:g.hazards,lanterns:g.lanterns,memories:g.memories,checkpoint:g.checkpoint,pendingSeal:g.pendingSeal,pendingTalk:g.pendingTalk,pulseCooldown:g.pulseCooldown,jumpBuffer:g.jumpBuffer,plateState:[...(g.plateState||[])],camera:g.camera,viewWidth:g.viewWidth,scale:g.scale});}
function plainEvent(e){const v=clone(e);if(v.name==='onHud')delete v.event.clockEcho;return v;}
function canvasFor(width,height){const c=createCanvas(width,height);c.getBoundingClientRect=()=>({width,height});return c;}
function bounds(data,width,height,alpha=1){
  let left=width,top=height,right=-1,bottom=-1,count=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>=alpha){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);count++;}
  return count?{left,top,right,bottom,width:right-left+1,height:bottom-top+1,pixels:count}:null;
}
function raw(c){return c.getContext('2d').getImageData(0,0,c.width,c.height).data;}
async function savePNG(name,c){const bytes=await c.encode('png');await writeFile(resolve(output,name),bytes);const entry={file:name,width:c.width,height:c.height,bytes:bytes.length,sha256:hash(bytes)};summary.files.push(entry);return entry;}
function zoneView(g){const view=g.getSceneBackdropView(),l=getPaintedCoastLayout(view);return COAST_LIGHT_ZONES.map((z,i)=>({index:i,center:{x:l.x+l.width*z.x,y:l.y+l.height*z.y},radius:{x:l.width*z.rx,y:l.height*z.ry},viewport:clone(view.viewport),amount:g.coastLight.amounts[i],centerVisible:l.x+l.width*z.x>=0&&l.x+l.width*z.x<=view.viewport.width}));}
async function replay(label,fail){
  const [width,height]=dimensions[label],id=label+(fail?'-fallback-hold':'-painted-release');
  const baselineRoot=resolve(root,'docs/v27-baseline',label),baseline=JSON.parse(await readFile(resolve(baselineRoot,'route-report.json'),'utf8'));
  for(const name of ['dream-engine-base.js','dream-levels.js'])assert.equal(sourceHashes[name],baseline.sourceHashes[name],'Authored physics must remain the frozen baseline');
  const tape=JSON.parse(await readFile(resolve(baselineRoot,'input-tape.json'),'utf8')).steps;
  const oldRows=gunzipSync(await readFile(resolve(baselineRoot,'physics-trace.jsonl.gz'))).toString().trim().split('\n').map(JSON.parse);
  const expected=new Map(oldRows.filter(r=>r.reason==='update').map(r=>[r.update,r.integrated]));
  const c=canvasFor(width,height),bc=canvasFor(width,height),events={integrated:[],base:[]};let update=0,loads=0,compared=0,eventCursor=0;
  const callbacks=id=>Object.fromEntries(hooks.map(name=>[name,event=>events[id].push({name,event:clone(event),update})]));
  const game=new DreamGame(c,callbacks('integrated'),{loadCoastImage:async src=>{loads++;assert.equal(src,COAST_PAINT_URL);if(fail)throw Error('controlled offline production image failure');return webp;}}),base=new BaseGame(bc,callbacks('base'));
  const report={id,label,viewport:{width,height},choice:fail?'hold':'release',imageMode:fail?'loader rejection, all chapter-five painted resources unavailable':'actual production WebP decoded by Node Canvas',sourceHashes,baselineTraceSha256:baseline.trace.uncompressedSha256,baselineInputTapeSha256:baseline.inputTape.sha256,trace:[],milestones:[],events,removedFromEventComparison:['onHud.event.clockEcho only; actual unnormalized HUD events are preserved'],status:'running'};
  const captured=new Set();let firstGlowCaptured=false;
  for(const step of tape){
    if(step.method==='update')assert.equal(step.update,update+1);else assert.equal(step.update,update);
    const args=clone(step.args);if(step.method==='start')args[0].clockChoice=report.choice;
    const a=game[step.method](...args),b=base[step.method](...args);assert.deepEqual(a,b,'Control return '+step.method);
    if(step.method==='start'){await game.coastScenes.request({mode:'story',chapterIndex:4});assert.equal(game.coastScenes.getSnapshot().status,fail?'error':'ready');}
    if(step.method==='update')update++;
    const actual=physical(game),baseState=physical(base);assert.deepEqual(actual,baseState,id+' same-input mismatch '+update);compared++;
    assert.equal(events.integrated.length,events.base.length);
    while(eventCursor<events.integrated.length){assert.deepEqual(plainEvent(events.integrated[eventCursor]),events.base[eventCursor]);eventCursor++;}
    if(step.method==='update'){
      assert.deepEqual(actual,expected.get(update),id+' diverged from immutable v26 state at '+update);
      report.trace.push(JSON.stringify({update,input:clone(game.input),integrated:actual,base:baseState,equalsFrozenV26:true,gameplayEventsCompared:eventCursor,clockEcho:game.getClockEchoView(),coastLight:game.getCoastLightView()}));
      if(!firstGlowCaptured&&game.coastLight.amounts[0]>=.54&&!game.lanterns[1].lit){
        firstGlowCaptured=true;game.render();assert.deepEqual(physical(game),actual);const zones=zoneView(game);
        assert.equal(zones[0].centerVisible,true);report.firstVisibleGlow={update,time:game.time,zones,coastLight:game.getCoastLightView(),pixelHash:hash(raw(c))};
        if(!fail&&label==='desktop')report.firstVisibleGlow.image=await savePNG(id+'-first-lamp-visible-glow.png',c);
      }
    }
    for(const point of baseline.captures){
      if(captured.has(point.name)||point.update!==update||JSON.stringify(actual)!==JSON.stringify(point.state))continue;
      captured.add(point.name);game.render();assert.deepEqual(physical(game),actual,'Drawing cannot move the route');assert.equal(game.coastPaintedFrame,!fail);
      const zones=zoneView(game),m={name:point.name,update,time:game.time,paintedFrame:game.coastPaintedFrame,coastLight:game.getCoastLightView(),clockEcho:game.getClockEchoView(),zones,pixelHash:hash(raw(c))};
      if(!fail&&point.name==='lamp-1-lit')assert.equal(zones[0].centerVisible,true,'First response must be visible at the actual first lamp');
      if(!fail&&point.name==='two-lamps-exit-approach')assert.equal(zones[1].centerVisible,true,'Second response must be visible near the actual exit');
      if((!fail&&point.name==='two-lamps-exit-approach')||(!fail&&label==='desktop'&&['wind-and-second-memory','pendulum-3-frozen'].includes(point.name))||(fail&&label==='desktop'&&point.name==='two-lamps-exit-approach'))m.image=await savePNG(id+'-'+point.name+'.png',c);
      report.milestones.push(m);
    }
  }
  assert.equal(captured.size,14);assert.equal(update,1285);assert.equal(loads,1);assert.equal(game.deaths,0);assert.equal(game.state,'complete');assert.equal(game.memories.filter(m=>m.collected).length,3);assert.equal(game.lanterns.filter(l=>l.lit).length,2);
  assert.deepEqual(events.base,baseline.callbacks.base,'Full original callback/settlement stream must remain unchanged');
  const bytes=Buffer.from(report.trace.join('\n')+'\n'),gzip=gzipSync(bytes,{level:9});delete report.trace;
  const file=id+'-physics.jsonl.gz';await writeFile(resolve(output,file),gzip);
  report.trace={file,rows:update,compressedBytes:gzip.length,compressedSha256:hash(gzip),uncompressedBytes:bytes.length,uncompressedSha256:hash(bytes)};
  report.status='passed';report.updates=update;report.sameInputChecks=compared;report.eventsCompared=eventCursor;report.final=physical(game);report.loads=loads;report.completions=events.integrated.filter(e=>e.name==='onComplete');
  await writeFile(resolve(output,id+'-report.json'),JSON.stringify(report,null,2)+'\n');
  summary.routes.push({id,status:report.status,updates:update,sameInputChecks:compared,eventsCompared:eventCursor,loads,finalTime:game.time,deaths:game.deaths,completions:report.completions,baselineExact:true,report:id+'-report.json',firstVisibleGlow:report.firstVisibleGlow,milestones:report.milestones});
  game.destroy();base.destroy();process.stdout.write(JSON.stringify({route:id,status:'passed',updates:update,compared,eventCursor,loads})+'\n');
}
function componentPixels(game,name,draw,{width=512,height=512,origin={x:256,y:370},anchor=game.body}={}){
  const c=createCanvas(width,height),ctx=c.getContext('2d');ctx.translate(origin.x-anchor.x,origin.y-anchor.y);draw(ctx);const data=raw(c),box=bounds(data,width,height,8),solid=bounds(data,width,height,192);
  assert.ok(box&&box.left>0&&box.top>0&&box.right<width-1&&box.bottom<height-1,name+' is not clipped by measurement Canvas');
  return{name,origin,anchor:{x:anchor.x,y:anchor.y},bounds:box,solidBounds:solid,relative:{left:box.left-origin.x,top:box.top-origin.y,right:box.right-origin.x,bottom:box.bottom-origin.y},pixelHash:hash(data)};
}
async function clockFrames(label,choice){
  const [width,height]=dimensions[label],c=canvasFor(width,height),game=new DreamGame(c,{}, {loadCoastImage:()=>webp});
  game.start({chapterIndex:4,sound:false,clockChoice:choice});await game.coastScenes.request({mode:'story',chapterIndex:4});
  const report={label,choice,viewport:{width,height},scope:'Real engine cap opening after explicit offline saved-choice option fixture; no state/elapsed assignment.',samples:[],status:'running'};
  const render=async(name,save=false)=>{
    const before=physical(game);game.render();assert.deepEqual(physical(game),before);const pixels=raw(c),s={name,time:game.time,echo:game.getClockEchoView(),cap:{phase:game.cap.phase,age:game.cap.age,openness:game.capOpen},pixelHash:hash(pixels)};
    if(save)s.image=await savePNG(label+'-clock-'+choice+'-'+name+'.png',c);
    report.samples.push(s);return s;
  };
  const tick=n=>{for(let i=0;i<n;i++)game.update(1/60);};tick(30);game.toggleSoul();tick(30);await render('opening');
  while(game.getClockEchoView().phase==='waiting')tick(1);
  await render('playing-start');while(game.getClockEchoView().elapsed<.8)tick(1);const mid=await render('playing-middle',true);
  const physicsBefore=physical(game);game.pause();const paused=await render('paused');tick(180);const pausedAfter=await render('paused-after-180-updates');
  assert.equal(paused.pixelHash,pausedAfter.pixelHash,'Actual Canvas pixels freeze under pause');assert.deepEqual(physical(game),{...physicsBefore,state:'paused'});assert.deepEqual(paused.echo,pausedAfter.echo);
  report.pause={updates:180,pixelsEqual:true,physicsEqual:true,echoEqual:true};game.resume();
  while(game.getClockEchoView().elapsed<1.8)tick(1);await render('playing-late');
  while(game.getClockEchoView().phase!=='settled')tick(1);await render('settled-near-head');
  game.setInput({x:1,y:0});tick(24);game.setInput({x:0,y:0});tick(10);
  const displacement=game.soul.x-game.body.x;assert.ok(displacement>=100&&displacement<=130,'Only actual directional input moves the soul clear of the cap');
  await render('settled-soul-away',label==='desktop');
  const opening=game.getCharacterPresentation().rig.openingWorld;
  const rect={x:Math.floor((opening.x-25-game.camera)*game.scale),y:Math.floor((opening.y-34)*game.scale+game.viewportOffsetY),width:Math.ceil(50*game.scale),height:Math.ceil(40*game.scale)};
  const interior=c.getContext('2d').getImageData(rect.x,rect.y,rect.width,rect.height).data;
  clockInteriorPixels.set(label+'-'+choice,{rect,bytes:interior});
  report.persistentInterior={scope:'Pixels cropped for numerical comparison from the actual full gameplay frame after normal directional input; original full-size image preserved. No isolated miniature is substituted.',soulDisplacement:displacement,headRegion:rect,headRegionPixelHash:hash(interior),echo:game.getClockEchoView()};
  game.recall();tick(60);game.toggleSoul();tick(150);assert.equal(game.getClockEchoView().phase,'settled');report.noReplayOnSecondOpening=true;
  game.start({chapterIndex:4,sound:false,clockChoice:choice,reducedMotion:true});game.toggleSoul();tick(30);
  assert.equal(game.getClockEchoView().phase,'settled');await render('reduced-motion');
  const mini=()=>{const v=createCanvas(160,160),ctx=v.getContext('2d');ctx.translate(80,110);drawClockMiniature(ctx,game.getClockEchoView(),0);return hash(raw(v));};
  const miniatureBefore=mini();tick(120);assert.equal(game.getClockEchoView().phase,'settled');assert.equal(mini(),miniatureBefore);
  report.reducedMotion={immediatelySettled:true,miniaturePixelsStable:true,simulationContinues:true};
  game.setReducedMotion(false);tick(120);assert.equal(game.getClockEchoView().phase,'settled');report.motionRestoreDoesNotReplay=true;
  report.status='passed';summary.clocks.push(report);game.destroy();process.stdout.write(JSON.stringify({clock:label+'-'+choice,status:'passed',samples:report.samples.length})+'\n');
}
async function pixelGeometry(){
  const c=canvasFor(1100,640),game=new DreamGame(c,{}, {loadCoastImage:()=>webp});game.start({chapterIndex:4,sound:false});await game.coastScenes.request({mode:'story',chapterIndex:4});
  for(let i=0;i<60;i++)game.update(1/60);
  summary.keeperLift={scope:'Explicit painter-view fixtures at five cap amounts, with actual production Canvas commands and pixels; not game-progress, unlock or control-timing evidence.',samples:[]};
  for(const talking of [false,true])for(const capOpen of [0,.25,.5,.75,1]){
    let opening=null;
    for(const form of ['soul','body']){
      const canvas=createCanvas(320,240),ctx=canvas.getContext('2d'),calls=[];
      const view={...game.getStoryNPCView(),near:true,capOpen,form,talking},before=clone(view);
      ctx.translate(160-view.x,180-view.y);
      const recorded=new Proxy(ctx,{get:(target,key)=>typeof target[key]==='function'?(...args)=>{calls.push([key,...args]);return target[key](...args);}:target[key],set:(target,key,value)=>{target[key]=value;return true;}});
      drawStoryNPC(recorded,view,0,true);assert.deepEqual(view,before);
      const dial=calls.findIndex(v=>v[0]==='ellipse'&&v[3]===13.4&&v[4]===14);assert.ok(dial>=0);
      const anchor=calls.slice(0,dial).findLast(v=>v[0]==='translate'),hands=calls.filter(v=>v[0]==='ellipse'&&v[3]===3.1&&v[4]===3.5).map(v=>({x:v[1],y:v[2]}));
      const expectedY=-26-capOpen*11-(talking?3*(1-capOpen):0),grips={watch:{x:anchor[1],y:anchor[2]},hands};
      assert.deepEqual(grips,{watch:{x:0,y:expectedY},hands:[{x:-11,y:expectedY},{x:11,y:expectedY}]});
      if(opening)assert.deepEqual(grips,opening,'The watch and both hands retain the same partial lift during body recall');else opening=grips;
      const pixels=raw(canvas),box=bounds(pixels,320,240,1);assert.ok(box&&box.left>0&&box.top>0&&box.right<319&&box.bottom<239);
      summary.keeperLift.samples.push({talking,capOpen,form,grips,actualPixelBounds:box,pixelSha256:hash(pixels),sameOpeningAndReturningGrip:true});
    }
  }
  for(const talking of [false,true])for(const form of ['soul','body'])assert.equal(new Set(summary.keeperLift.samples.filter(v=>v.talking===talking&&v.form===form).map(v=>v.pixelSha256)).size,5,'All five actual partial lifts produce different pixels');
  summary.keeperLift.status='passed';
  for(const form of ['body','soul']){
    if(form==='soul'){game.toggleSoul();for(let i=0;i<100;i++)game.update(1/60);}
    const view=game.getStoryNPCView(),npc=componentPixels(game,'keeper-'+form,ctx=>drawStoryNPC(ctx,view,game.visualTime,false),{anchor:view,origin:{x:256,y:370}});
    assert.ok(npc.relative.left>=STORY_NPC_BOUNDS.left-1&&npc.relative.right<=STORY_NPC_BOUNDS.right+1&&npc.relative.top>=STORY_NPC_BOUNDS.top-1&&npc.relative.bottom<=STORY_NPC_BOUNDS.bottom+1,'Actual keeper pixels fit authored bounds');summary.pixelBounds.push(npc);
    const p=game.getCharacterPresentation(),shown=game.getSoulPresentation(p),player=componentPixels(game,'player-'+form,ctx=>game.drawCharacter(ctx,game.body,game.visualTime,shown,p));
    player.physicalCollisionBox={left:-game.body.w/2,right:game.body.w/2,top:-game.body.h,bottom:0};player.note='Visual clothing/head/shadow extend beyond collision rectangle; measured pixels, not a claim of identical visual and collision bounds.';summary.pixelBounds.push(player);
  }
  for(const [index,h]of game.hazards.entries()){
    // Actual unmodified runtime bob positions; frozen variants are separately
    // captured by normal pulses in the full replay, not set on this game.
    const left=Math.min(h.x,h.px)-h.r-60,top=Math.min(h.y,h.py)-h.r-60;
    const canvas=createCanvas(600,600),ctx=canvas.getContext('2d');ctx.translate(-left,-top);drawCoastPendulum(ctx,h);
    const data=raw(canvas),box=bounds(data,600,600,8);assert.ok(box&&box.left>0&&box.top>0&&box.right<599&&box.bottom<599);
    const row=Math.round(h.py-top),cx=h.px-left;let min=Infinity,max=-Infinity;
    for(let x=Math.floor(cx-h.r-20);x<=Math.ceil(cx+h.r+20);x++)if(data[(row*600+x)*4+3]>=192){min=Math.min(min,x);max=Math.max(max,x);}
    assert.ok(min>=cx-h.r-1&&max<=cx+h.r+1,'Solid bob diameter must not imply a larger dangerous disc');assert.ok(max-min+1>=h.r*2-3);
    summary.pixelBounds.push({name:'pendulum-'+(index+1),actualHazard:clone(h),bounds:box,centerRowSolid:{left:min+left,right:max+left,width:max-min+1,actualRadius:h.r},pixelHash:hash(data)});
  }
  for(const p of game.level.platforms.filter(p=>p.h<=24)){
    const canvas=createCanvas(p.w+40,p.h+40),ctx=canvas.getContext('2d');ctx.translate(20-p.x,20-p.y);drawCoastPlatform(ctx,p);
    const box=bounds(raw(canvas),canvas.width,canvas.height,1);assert.deepEqual({left:box.left,top:box.top,right:box.right,bottom:box.bottom},{left:20,top:20,right:20+p.w-1,bottom:20+p.h-1});
    summary.pixelBounds.push({name:'platform-'+p.x,physicalRect:clone(p),actualPixelBounds:box,exactPhysicalClip:true});
  }
  game.destroy();
}
async function safeEntry(label){
  const [width,height]=dimensions[label],c=canvasFor(width,height),game=new DreamGame(c,{}, {loadCoastImage:()=>webp});
  game.start({chapterIndex:4,sound:false,clockChoice:'release'});await game.coastScenes.request({mode:'story',chapterIndex:4});
  for(let i=0;i<66;i++)game.update(1/60);assert.equal(game.body.x,105);assert.equal(game.body.y,560);assert.equal(game.body.invulnerable,0);assert.equal(game.deaths,0);
  game.render();const image=await savePNG(label+'-painted-release-safe-entry.png',c);summary.safeEntries??=[];
  summary.safeEntries.push({label,time:game.time,normalUpdates:66,body:clone(game.body),image,scope:'Separate original entry fixture plus 66 actual stationary updates, preserving original invulnerability flashing until it ends; no pose or pixel edit.'});game.destroy();
}
try{
  const glyphCanvas=createCanvas(120,50),gc=glyphCanvas.getContext('2d');gc.font='16px "PingFang SC","Microsoft YaHei",sans-serif';gc.fillStyle='#fff';gc.fillText('归先生',5,30);
  summary.fontEvidence={cjkProbeText:'归先生',cjkProbePixelBounds:bounds(raw(glyphCanvas),120,50),limitation:'This host has no Chinese fonts listed by fc-list :lang=zh. Offline Chinese labels can be absent; actual browser CI screenshots remain the authority for Chinese glyphs and text layout. Numeric timer and vector material evidence remain observable.'};
  for(const label of Object.keys(dimensions))for(const fail of [false,true])await replay(label,fail);
  for(const label of Object.keys(dimensions))await safeEntry(label);
  for(const label of Object.keys(dimensions))for(const choice of ['release','hold'])await clockFrames(label,choice);
  for(const label of Object.keys(dimensions)){
    const a=summary.clocks.find(x=>x.label===label&&x.choice==='release').samples.find(x=>x.name==='playing-middle'),b=summary.clocks.find(x=>x.label===label&&x.choice==='hold').samples.find(x=>x.name==='playing-middle');
    assert.notEqual(a.pixelHash,b.pixelHash,'Choices produce different real full-size pixels');
    const left=clockInteriorPixels.get(label+'-release'),right=clockInteriorPixels.get(label+'-hold');assert.deepEqual(left.rect,right.rect);
    let changedPixels=0,total=0,largest=0;
    for(let i=0;i<left.bytes.length;i+=4){let changed=false;for(let channel=0;channel<3;channel++){const delta=Math.abs(left.bytes[i+channel]-right.bytes[i+channel]);total+=delta;largest=Math.max(largest,delta);if(delta>8)changed=true;}if(changed)changedPixels++;}
    assert.ok(changedPixels>20,'Actual settled cap interior must retain a visible choice difference after the soul moves away');
    summary.persistentInteriorComparison??=[];summary.persistentInteriorComparison.push({label,headRegion:left.rect,changedPixelsThreshold8:changedPixels,maximumChannelDifference:largest,meanAbsoluteRGBDifference:total/(left.bytes.length/4*3),scope:'Same-time actual gameplay head region, naturally settled, soul moved aside by identical real input.'});
  }
  await pixelGeometry();
  for(const [name,digest]of Object.entries(sourceHashes))assert.equal(hash(await readFile(resolve(root,'dist',name))),digest,'Production file changed while collecting evidence: '+name);
  summary.status='passed';
}catch(error){summary.status='failed';summary.error=error.stack;process.exitCode=1;}
finally{
  await writeFile(resolve(output,'verification-summary.json'),JSON.stringify(summary,null,2)+'\n');
  process.stdout.write(JSON.stringify({status:summary.status,routes:summary.routes.length,clocks:summary.clocks.length,bounds:summary.pixelBounds.length,images:summary.files.length,error:summary.error,output})+'\n');
}
