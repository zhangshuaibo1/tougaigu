// Offline production Canvas QA. The route uses ordinary engine input from the
// authored spawn; these files are not browser, touch or physical-device proof.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getTheatrePaintedLayout, THEATRE_PAINT_URL } from '../dist/dream-theatre-painted.js';
import { DreamGame } from '../dist/dream-engine.js';
import { getDreamLevel } from '../dist/dream-levels.js';
import { drawTheatrePlatform,getTheatreDockingOverlaps } from '../dist/dream-theatre-art.js';

const require=createRequire(import.meta.url);
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.cwd(),process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'']}));
const folder=resolve(process.argv[2]||'/tmp/tougaigu-v22-theatre');await mkdir(folder,{recursive:true});
const noop=()=>{};
globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
const bytes=canvas=>Buffer.from(canvas.data());
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
let checks=0;
const check=(condition,message)=>{assert.ok(condition,message);checks++;};
const equal=(a,b,message)=>{assert.deepEqual(a,b,message);checks++;};
const tick=(g,n=1)=>{for(let i=0;i<n;i++)g.update(1/60);};
const physics=g=>JSON.stringify({body:g.body,soul:g.soul,form:g.form,state:g.state,time:g.time,energy:g.energy,memories:g.memories,lamps:g.lanterns,movers:g.movers,cap:g.cap,particles:g.particles});

// Isolate the paint boundary and the exact changed pixels of docking feedback.
const level=getDreamLevel(2),base=level.movers[0];
for(const x of [695,940,1185]){
  const p={...base,x,baseX:base.x},image=createCanvas(1500,650),c=image.getContext('2d');
  check(drawTheatrePlatform(c,p,{platforms:level.platforms}),'production platform accepts authored geometry');
  const data=image.data();let outside=0,opaque=0;
  for(let y=0;y<650;y++)for(let xx=0;xx<1500;xx++)if(data[(y*1500+xx)*4+3]){opaque++;if(xx<p.x||xx>=p.x+p.w||y<p.y||y>=p.y+p.h)outside++;}
  check(opaque>0&&outside===0,'no painted lip or frame escapes the physical stage rectangle');
  const undocked=createCanvas(1500,650);drawTheatrePlatform(undocked.getContext('2d'),p);
  const old=undocked.data(),overlaps=getTheatreDockingOverlaps(p,level.platforms);let changes=0,unjustified=0;
  for(let y=0;y<650;y++)for(let xx=0;xx<1500;xx++){
    const at=(y*1500+xx)*4;if(data[at]===old[at]&&data[at+1]===old[at+1]&&data[at+2]===old[at+2]&&data[at+3]===old[at+3])continue;
    changes++;if(!overlaps.some(area=>xx>=area.x&&xx<area.x+area.w&&y>=area.y&&y<area.y+3))unjustified++;
  }
  equal(unjustified,0,'docking changes pixels only in the actual top-edge overlap');
  check(overlaps.length?changes>0:changes===0,'midway has no docking light; real bank overlaps do');
}

function walkTo(g,target,maxFrames=720){
  for(let i=0;i<maxFrames;i++){
    if(Math.abs(g.body.x-target)<2&&Math.abs(g.body.vx)<10&&g.body.grounded){g.setInput({x:0,y:0});tick(g,10);return;}
    g.setInput({x:clamp((target-g.body.x)/35,-1,1),y:0});tick(g);
  }
  assert.fail('ordinary walking did not reach '+target+': '+JSON.stringify(g.body));
}
function waitUntil(g,predicate,maxFrames=1600){
  g.setInput({x:0,y:0});for(let i=0;i<maxFrames;i++){if(predicate())return;tick(g);}
  assert.fail('timed out waiting for actual platform position: '+JSON.stringify({body:g.body,stage:g.movers[0]}));
}


function solveLamp(game,index){
  if(game.form==='body')check(game.toggleSoul(),'normal input opens the head');
  const target=game.lanterns[index];let arrived=false;
  for(let n=0;n<900;n++){
    const dx=target.x-game.soul.x,dy=target.y-game.soul.y;
    if(Math.hypot(dx,dy)<20&&Math.hypot(game.soul.vx,game.soul.vy)<50){arrived=true;break;}
    game.setInput({x:clamp(dx/75,-1,1),y:clamp(dy/75,-1,1)});tick(game);
  }
  check(arrived,'normal soul flight reaches the authored poem lamp');game.setInput({x:0,y:0});tick(game,8);
  check(game.pulse(),'normal pulse reaches the actual poem lamp');
  equal(game.pendingSeal,index,'the puzzle has the intended authored lamp identity');
  check(game.resolvePuzzle(true),'the normal puzzle answer callback lights the lamp');tick(game,110);
}

const frames=[],routes=[];
for(const [label,width,height]of [['desktop',1100,640],['phone-390',390,595],['phone-320',320,431]]){
  const canvas=createCanvas(width,height);canvas.getBoundingClientRect=()=>({width,height});
  const game=new DreamGame(canvas,{onPuzzle:noop},{loadTheatreImage:src=>loadImage(fileURLToPath(src))});
  game.start({chapterIndex:2,sound:false});
  await game.theatreScenes.request({mode:'story',chapterIndex:2});
  const painting=game.getPaintedTheatreImage();
  check(painting?.width===2172&&painting?.height===724,'the actual v22 WebP is decoded at its native size');
  equal(game.theatreScenes.getSource(),THEATRE_PAINT_URL,'the primary production source is used');
  tick(game,80);
  const capture=async name=>{
    const before=physics(game);game.render();equal(physics(game),before,'rendering leaves the current route unchanged');
    check(game.theatrePaintedFrame,'the actual painting is part of this production frame');
    const layout=getTheatrePaintedLayout(game.getSceneBackdropView(),painting);
    check(Math.abs(layout.width/layout.height-3)<1e-9,'the bitmap is not distorted');
    check(layout.x<=0&&layout.x+layout.width>=game.viewWidth,'the current camera has no uncovered side strip');
    const path=`${label}-${name}.png`;await writeFile(resolve(folder,path),await canvas.encode('png'));frames.push(path);
  };
  await capture('arrival');
  walkTo(game,510);check(game.jump(),'the player jumps from the authored ground');walkTo(game,680);
  equal(game.body.y,465,'ordinary jumping reaches the actual left bank');equal(game.deaths,0,'bank approach does not use respawn');
  await capture('wait-bank');
  solveLamp(game,0);await capture('first-lamp');
  equal(game.lanterns.map(l=>l.lit),[true,false],'only the first real poem lamp is solved');
  check(game.toggleSoul(),'normal input recalls the soul before boarding');tick(game,80);
  waitUntil(game,()=>game.movers[0].dx<0&&getTheatreDockingOverlaps(game.movers[0],game.level.platforms).some(a=>a.platformIndex===2&&a.w>=50));
  await capture('left-dock');
  let boarded=false;
  for(let i=0;i<360;i++){
    const stage=game.movers[0];
    if(game.body.grounded&&game.body.platform===stage.id&&game.body.x-stage.x>100){boarded=true;break;}
    game.setInput({x:clamp((stage.x+stage.w*.78-game.body.x)/35,-1,1),y:0});tick(game);
  }
  check(boarded,'normal direction input boards the real moving platform');game.setInput({x:0,y:0});tick(game,12);
  const relative=game.body.x-game.movers[0].x;await capture('aboard');
  waitUntil(game,()=>game.movers[0].dx>0&&game.movers[0].x>=900);
  check(game.body.platform===game.movers[0].id&&game.body.grounded,'the actual platform carries the body midway');
  check(Math.abs((game.body.x-game.movers[0].x)-relative)<.1,'the feet remain at the same spot on the moving deck');
  equal(getTheatreDockingOverlaps(game.movers[0],game.level.platforms).length,0,'midway has no falsely lit landing bank');
  await capture('midway');
  // Pause in the middle of travel, not just on an idle starting frame.
  game.pause();game.render();const frozen=bytes(canvas);tick(game,90);game.render();equal(bytes(canvas),frozen,'pause freezes the moving deck, cables and character');game.resume();
  waitUntil(game,()=>getTheatreDockingOverlaps(game.movers[0],game.level.platforms).some(a=>a.platformIndex===3&&a.w>=130));
  await capture('right-dock');walkTo(game,1400);
  check(game.body.x>1355&&game.body.grounded&&game.body.y===560,'the player leaves the stage and lands on the right bank ground');
  equal(game.deaths,0,'the complete crossing needs no death or respawn');await capture('landed');
  solveLamp(game,1);await capture('both-lamps');
  equal(game.lanterns.map(l=>l.lit),[true,true],'both lamps belong to the current real route');
  equal(game.theatreLight.amounts,[1,1],'each actual lamp has finished its own light transition');
  game.pause();game.render();const litPause=bytes(canvas);tick(game,90);game.render();equal(bytes(canvas),litPause,'pause freezes the lit scene and soul');game.resume();
  game.setReducedMotion(true);game.render();const still=bytes(canvas);game.visualTime+=100;game.render();equal(bytes(canvas),still,'reduced motion has no independent decorative clock');
  routes.push({viewport:{width,height},actualInputCrossing:true,deaths:game.deaths,seconds:game.time,finishedX:game.body.x});game.destroy();
}
const result={checks,frames,routes,productionRenderer:true,actualAsset:THEATRE_PAINT_URL,normalEngineInput:true,puzzleAnswerViaEngineCallback:true,browserQA:false};
await writeFile(resolve(folder,'theatre-report.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({folder,...result}));
