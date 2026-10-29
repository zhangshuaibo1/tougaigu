// Read-only v26 route preparation against the frozen production v25 engine.
// start(chapterIndex:3) is an explicit offline entry fixture. Thereafter only
// normal public controls are used; no coordinates, progress or saves are set.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

// Usage: node docs/v26-baseline/explore-library.mjs [outputRoot] [viewport] [checkoutRoot]
// The default checkout is derived from this file, not the caller's cwd.
const root=resolve(process.argv[4]||fileURLToPath(new URL('../../',import.meta.url)));
const outputRoot=resolve(process.argv[2]||'/tmp/tougaigu-v26-baseline-replay');
const label=process.argv[3]||'desktop';
const dimensions={desktop:[1100,640],'phone-390':[390,595],'phone-320':[320,431]};
assert.ok(dimensions[label], 'Known offline Canvas review size');
const [width,height]=dimensions[label];
const output=resolve(outputRoot,label);
await mkdir(output,{recursive:true});
const {DreamGame}=await import(pathToFileURL(resolve(root,'dist/dream-engine.js')));
const {PUZZLES}=await import(pathToFileURL(resolve(root,'dist/dream-story.js')));
const {getStoryEncounter}=await import(pathToFileURL(resolve(root,'dist/dream-encounters.js')));
const require=createRequire(import.meta.url);
const {createCanvas}=require(require.resolve('@napi-rs/canvas',{
 paths:[root,process.cwd(),process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'']
}));
const noop=()=>{};
globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
globalThis.requestAnimationFrame=()=>1;
globalThis.cancelAnimationFrame=noop;
const canvas=createCanvas(width,height);
canvas.getBoundingClientRect=()=>({width,height});
let updates=0;
const report={
  status:'running',sourceRoot:root,viewport:{label,width,height},
  scope:'Offline actual engine inputs after explicit chapterIndex:3 start fixture. Not browser unlock, HUD, touch, save or clock-choice verification.',
  mutations:'Only public start, setInput, jump, toggleSoul, recall, interact, pulse, resolveTalk and resolvePuzzle controls; fixed-step update and render. No body/soul/lantern/save assignments.',
  sourceHashes:{},actions:[],captures:[],talks:[],puzzles:[],events:[],completions:[],rides:[],respawns:[]
};
for(const name of ['dream-engine.js','dream-engine-base.js','dream-levels.js']){
 report.sourceHashes[name]=createHash('sha256').update(await readFile(resolve(root,'dist',name))).digest('hex');
}
const game=new DreamGame(canvas,{
 onTalk:e=>report.talks.push({...e,update:updates}),
 onPuzzle:e=>report.puzzles.push({...e,update:updates}),
 onComplete:e=>report.completions.push({...e,update:updates}),
 onEvent:e=>report.events.push({...e,update:updates})
});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const clone=x=>JSON.parse(JSON.stringify(x));
const read=()=>({update:updates,time:game.time,state:game.state,form:game.form,
 body:clone(game.body),soul:clone(game.soul),energy:game.energy,deaths:game.deaths,
 movers:clone(game.movers),lanterns:clone(game.lanterns),memories:clone(game.memories),
 hazards:clone(game.hazards),checkpoint:clone(game.checkpoint),camera:game.camera,
 npc:game.getStoryNPCView(),nearHint:game.getNearHint(),gateOpen:game.barrierOpen(game.level.barriers[0])});
function act(name,...args){
 const before={time:game.time,x:game.body?.x,y:game.body?.y,form:game.form};
 const result=game[name](...args);
 report.actions.push({name,args,result:result===undefined?null:result,before,update:updates});
 return result;
}
function tick(frames=1){
 for(let i=0;i<frames;i++){
  const prior=game.body;
  game.update(1/60);updates++;
  if(game.body!==prior)report.respawns.push(read());
 }
}
async function capture(name){
 const before=JSON.stringify(read());
 game.render();
 assert.equal(JSON.stringify(read()),before,'Rendering does not move or complete the route');
 const file=name+'.png';
 await writeFile(resolve(output,file),await canvas.encode('png'));
 const state=read();report.captures.push({name,file,...state});
 process.stdout.write(JSON.stringify({capture:name,time:state.time,body:{x:state.body.x,y:state.body.y,platform:state.body.platform},form:state.form,deaths:state.deaths})+'\n');
}
function walk(target,limit=1200){
 assert.equal(game.form,'body');
 report.actions.push({name:'walk-feedback',target,rule:'setInput.x=clamp((target-body.x)/35,-1,1), then brake to zero',before:read()});
 for(let i=0;i<limit;i++){
  if(game.state==='complete')return;
  if(Math.abs(game.body.x-target)<2&&Math.abs(game.body.vx)<10&&game.body.grounded){game.setInput({x:0,y:0});tick(10);return;}
  game.setInput({x:clamp((target-game.body.x)/35,-1,1),y:0});tick();
 }
 throw new Error('Walk timeout at '+target+': '+JSON.stringify(read()));
}
function wait(predicate,limit=1500){
 game.setInput({x:0,y:0});
 for(let i=0;i<limit;i++){if(predicate())return;tick();}
 throw new Error('Wait timeout: '+JSON.stringify(read()));
}
async function boardAndRide(id,x){
 walk(x);const mover=()=>game.movers.find(p=>p.id===id);
 // A downward-moving book near its low end will meet the falling player.
 wait(()=>mover().y>=mover().baseY+mover().range-14&&mover().dy>0);
 const launch=read();act('jump');
 wait(()=>game.body.grounded&&game.body.platform===id,90);
 const landed=read();assert.equal(game.body.y,mover().y);
 await capture(id+'-boarded');
 const relative=game.body.x-mover().x;
 let maxContactError=0,maxRelativeXError=0,lostAttachment=0,minY=Infinity,maxY=-Infinity,up=0,down=0;
 let topCaptured=false,bottomCaptured=false;
 // One complete authored cycle, with no input, proves both directions.
 const frames=Math.ceil((Math.PI*2/mover().speed+0.15)*60);
 game.setInput({x:0,y:0});
 for(let i=0;i<frames;i++){
  tick();const p=mover();
  maxContactError=Math.max(maxContactError,Math.abs(game.body.y-p.y));
  maxRelativeXError=Math.max(maxRelativeXError,Math.abs(game.body.x-p.x-relative));
  if(!game.body.grounded||game.body.platform!==id)lostAttachment++;
  minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);
  if(p.dy<0)up++;if(p.dy>0)down++;
  if(!topCaptured&&p.y<=p.baseY-p.range+2){await capture(id+'-upper');topCaptured=true;}
  if(!bottomCaptured&&p.y>=p.baseY+p.range-2){await capture(id+'-lower');bottomCaptured=true;}
 }
 const summary={id,x,launch,landed,noInputFrames:frames,noInputSeconds:frames/60,minY,maxY,
  maxContactError,maxRelativeXError,lostAttachment,upFrames:up,downFrames:down,topCaptured,bottomCaptured,end:read()};
 report.rides.push(summary);
 assert.equal(lostAttachment,0,'The real book carries the body throughout its authored cycle');
 assert.equal(maxContactError,0);assert.equal(maxRelativeXError,0);
}
function fly(x,y,{threshold=18,limit=1000}={}){
 assert.equal(game.form,'soul');
 report.actions.push({name:'fly-feedback',target:{x,y},rule:'setInput axes from soul-target error, offset by actual authored wind / soulSpeed',before:read()});
 for(let i=0;i<limit;i++){
  const dx=x-game.soul.x,dy=y-game.soul.y;
  if(Math.hypot(dx,dy)<threshold&&Math.hypot(game.soul.vx,game.soul.vy)<55){game.setInput({x:0,y:0});return;}
  let wx=0,wy=0;
  for(const wind of game.level.winds)if(game.soul.x>=wind.x&&game.soul.x<=wind.x+wind.w&&game.soul.y>=wind.y&&game.soul.y<=wind.y+wind.h){wx+=wind.dx;wy+=wind.dy;}
  game.setInput({x:clamp(dx/75-wx/340,-1,1),y:clamp(dy/75-wy/340,-1,1)});tick();
  assert.equal(game.form,'soul','Soul remains active during planned short flight');
 }
 throw new Error('Flight timeout '+JSON.stringify({x,y,actual:read()}));
}
async function solve(index){
 const lamp=game.lanterns[index];fly(lamp.x,lamp.y);
 await capture('lamp-'+(index+1)+'-near');
 assert.equal(act('pulse'),true);
 assert.equal(game.pendingSeal,index);
 const puzzle=PUZZLES.find(p=>p.chapterIndex===3&&p.sealIndex===index);
 report.puzzles.at(-1).answer={id:puzzle.id,optionIndex:puzzle.answer,text:puzzle.options[puzzle.answer],adapter:'resolvePuzzle(true) only after normal pulse creates the real pendingSeal; no DOM answer UI is rendered offline'};
 assert.equal(act('resolvePuzzle',true),true);
 await capture('lamp-'+(index+1)+'-lit');
}
try{
 act('start',{chapterIndex:3,sound:false});tick(30);
 report.authoredGeometry=clone({levelId:game.level.id,width:game.level.width,spawn:game.level.spawn,
  platforms:game.level.platforms,movers:game.level.movers,barriers:game.level.barriers,
  winds:game.level.winds,lanterns:game.level.lanterns,memories:game.level.memories,
  hazards:game.level.hazards,npcs:game.level.npcs,exit:game.level.exit});
 await capture('entry');
 // Stand beside Bluepage, not directly on the NPC's x=190 silhouette.
 walk(120);await capture('lanye-near');
 assert.equal(act('interact'),true);assert.equal(game.pendingTalk,'story-npc-3');
 report.talks.at(-1).lines=getStoryEncounter(3,{seals:0,repeated:false});
 await capture('lanye-talking');assert.equal(act('resolveTalk'),true);
 act('toggleSoul');tick(40);await capture('lanye-open');act('recall');tick(60);
 await boardAndRide('book-a',692.5);
 act('toggleSoul');tick(25);fly(375,420);await capture('memory-1');
 fly(990,270);await capture('memory-2');await solve(0);
 assert.equal(game.barrierOpen(game.level.barriers[0]),true);
 act('recall');tick(60);walk(1245);await capture('catalogue-open');
 await boardAndRide('book-b',1440);
 act('toggleSoul');tick(25);fly(1590,320);await capture('wind-corridor');await solve(1);
 fly(1600,410);assert.equal(act('pulse'),true);
 assert.ok(game.hazards[0].frozen>4,'A normal nearby pulse freezes the real drifter before the ground crossing');
 await capture('drifter-frozen');act('recall');tick(50);
 walk(1750);await capture('hazard-passed');
 walk(2010);act('toggleSoul');tick(25);fly(2060,390);await capture('memory-3');
 act('recall');tick(60);walk(2130);await capture('exit-approach');walk(2195);
 assert.equal(game.state,'complete');assert.equal(report.completions.length,1);
 assert.equal(game.deaths,0);assert.equal(report.respawns.length,0);
 assert.equal(game.memories.filter(m=>m.collected).length,3);
 await capture('complete');
 report.status='passed';report.final=read();report.updates=updates;
}catch(error){report.status='failed';report.error=error.stack;report.final=read();report.updates=updates;process.exitCode=1;}
finally{
 await writeFile(resolve(output,'route-report.json'),JSON.stringify(report,null,2)+'\n');
 process.stdout.write(JSON.stringify({status:report.status,updates,deaths:report.final.deaths,completions:report.completions,rides:report.rides.map(r=>({id:r.id,frames:r.noInputFrames,minY:r.minY,maxY:r.maxY,contactError:r.maxContactError,xError:r.maxRelativeXError})),output})+'\n');
 game.destroy();
}
