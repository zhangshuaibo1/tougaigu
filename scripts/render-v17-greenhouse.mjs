// Offline production Canvas review, not browser or physical-device QA.
// Travel, collection, return, planting and the mushroom all use normal engine
// input. Puzzle answers use the engine's ordinary answer callback boundary.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DreamGame } from '../dist/dream-engine.js';

const require=createRequire(import.meta.url);
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.cwd(),process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'']}));
const folder=resolve(process.argv[2]||'/tmp/tougaigu-v17-greenhouse');await mkdir(folder,{recursive:true});
const noop=()=>{};
globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const tick=(game,n=1)=>{for(let i=0;i<n;i++)game.update(1/60);};
const pixels=canvas=>Buffer.from(canvas.data());
const state=game=>JSON.stringify({body:game.body,soul:game.soul,form:game.form,energy:game.energy,time:game.time,cap:game.cap,plant:game.greenhousePlant,memories:game.memories,lamps:game.lanterns,pads:game.pads,particles:game.particles});
let checks=0;
const check=(condition,message)=>{assert.ok(condition,message);checks++;};
const equal=(a,b,message)=>{assert.deepEqual(a,b,message);checks++;};
const frames=[];

async function makeGame(width,height){
  const canvas=createCanvas(width,height),events=[],puzzles=[];
  canvas.getBoundingClientRect=()=>({width,height});
  const game=new DreamGame(canvas,{onCapEvent:event=>events.push(event),onPuzzle:event=>puzzles.push(event)},{loadImage:src=>loadImage(fileURLToPath(src))});
  // This fixture retains the real first ticket, but starts with no greenhouse
  // seed, lamps or current-round score. No seed state is injected.
  game.start({chapterIndex:1,sound:false,firstTicketCollected:true});
  await game.greenhouseScenes.request({mode:'story',chapterIndex:1});
  check(!!game.getPaintedGreenhouseImage(),'production greenhouse image is decoded before capture');
  check(game.getSnapshot().memories===0&&game.greenhousePlant.stage===0,'the new greenhouse starts unearned');
  tick(game,60); // Let the existing spawn blink finish through real updates.
  return {game,canvas,events,puzzles};
}
function walkTo(game,target){
  check(game.form==='body','walking belongs to the body');
  const deaths=game.deaths;
  for(let i=0;i<900;i++){
    const dx=target-game.body.x;
    if(Math.abs(dx)<2&&Math.abs(game.body.vx)<10){game.setInput({x:0,y:0});tick(game,12);equal(game.deaths,deaths,'the authored route does not need a respawn');return;}
    game.setInput({x:clamp(dx/40,-1,1),y:0});tick(game);
  }
  assert.fail('normal walking could not reach '+target);
}
function flyTo(game,target,{collect=false}={}){
  check(game.form==='soul','flight starts under soul control');
  for(let i=0;i<600;i++){
    assert.equal(game.form,'soul','flight remains controlled by the soul');
    const dx=target.x-game.soul.x,dy=target.y-game.soul.y;
    if(collect?target.collected:Math.hypot(dx,dy)<36){game.setInput({x:0,y:0});return;}
    game.setInput({x:clamp(dx/45,-1,1),y:clamp(dy/45,-1,1)});tick(game);
  }
  assert.fail('ordinary flight could not reach its authored target');
}
function solveLamp(game,index,puzzles){
  if(game.form==='body')check(game.toggleSoul(),'can open the head');
  flyTo(game,game.lanterns[index]);tick(game,8);
  check(game.pulse(),'the pulse reaches the real lamp');
  equal(puzzles.at(-1)?.sealIndex,index,'the requested lamp has the expected identity');
  check(game.resolvePuzzle(true),'the normal answer boundary accepts the answer');
  check(game.lanterns[index].lit,'only the actual accepted lamp is lit');
  game.setInput({x:0,y:0});tick(game,110);
}

for(const [name,width,height] of [['desktop',1100,640],['phone-320',320,431],['phone-390',390,595]]){
  const {game,canvas,events,puzzles}=await makeGame(width,height);
  async function capture(label){
    const before=state(game);game.render();equal(state(game),before,'rendering cannot update gameplay');
    check(game.greenhousePaintedFrame,'each finished composite uses the actual painting');
    const file=name+'-'+label+'.png';await writeFile(resolve(folder,file),await canvas.encode('png'));frames.push(file);
  }
  await capture('arrival');
  walkTo(game,600);check(game.toggleSoul(),'real soul input starts the seed trip');
  flyTo(game,game.memories[1],{collect:true});
  equal(game.greenhousePlant.phase,'held','the exact second memory is the held seed');
  equal(game.greenhousePlant.stage,0,'the held seed does not grow before planting');
  await capture('seed-held');
  check(game.recall(),'real recall begins');tick(game,12);await capture('seed-returning');
  game.pause();game.render();const paused=pixels(canvas);tick(game,90);game.render();equal(pixels(canvas),paused,'pause freezes the whole painted scene and carried seed');
  game.resume();tick(game,50);equal(game.greenhousePlant.phase,'planted','the seed really arrives in the pot');
  equal(game.greenhousePlant.stage,1,'a planted seed waits for actual lamp answers');
  check(game.toggleSoul(),'the planted miniature can be opened');tick(game,100);
  flyTo(game,{x:game.body.x+105,y:game.body.y-160});await capture('seed-planted');
  solveLamp(game,0,puzzles);equal(game.greenhousePlant.stage,2,'first accepted answer grows the leaves');
  check(game.lanterns[1].lit===false,'the other window remains unearned');
  await capture('first-light');
  game.recall();tick(game,60);game.setInput({x:1,y:0});
  let launched=false;
  for(let i=0;i<180;i++){tick(game);if(game.pads[0].boing>0&&game.body.vy<0&&game.body.y<490){launched=true;break;}}
  check(launched,'the actual mushroom launches the body');await capture('mushroom-flight');
  walkTo(game,1240);solveLamp(game,1,puzzles);
  equal(game.greenhousePlant.stage,3,'the second accepted answer opens the flower');
  equal(game.getSnapshot().seals,2,'both real lamps are solved');await capture('two-lights');
  game.recall();tick(game,60);check(game.toggleSoul(),'the earned flower can be inspected at home');tick(game,100);
  flyTo(game,{x:game.body.x+105,y:game.body.y-160});await capture('flower-home');
  equal(events.filter(event=>event.type==='memory'&&event.index===1).length,1,'the seed was collected exactly once');
  game.setReducedMotion(true);game.render();const still=pixels(canvas);game.visualTime+=123;game.render();equal(pixels(canvas),still,'reduced motion ignores decorative presentation time');
  game.destroy();
}
const report={checks,frames,productionRenderer:true,realInputTravelAndSeed:true,puzzleAnswers:'normal engine answer boundary, not browser UI',browserQA:false};
await writeFile(resolve(folder,'greenhouse-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({folder,...report}));
