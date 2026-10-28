// Optional Canvas inspection: actual controllers, actual scene renderer and
// authored solved states. Nothing here touches a browser or a player save.
import { createRequire } from 'node:module';
import { mkdir,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { LOST_CASES } from '../dist/dream-lost-cases.js';
import { DreamLostCase } from '../dist/dream-lost-engine.js';
import { drawLostEncore } from '../dist/dream-lost-encore-art.js';
import { DreamGame } from '../dist/dream-engine.js';

const require=createRequire(import.meta.url);
const {createCanvas}=require(require.resolve('@napi-rs/canvas',{paths:[process.cwd(),process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'']}));
const out=resolve(process.argv[2]||'/tmp/tougaigu-lost-encores-v10');
await mkdir(out,{recursive:true});
const noop=()=>{};
globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
const times=[0,.7,1.1,1.65,2.4,3];
function background(c,w,h){const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#20303b');g.addColorStop(1,'#31434b');c.fillStyle=g;c.fillRect(0,0,w,h);}
function label(c,txt,x,y,size=13){c.fillStyle='#f0dfbf';c.font=`${size}px sans-serif`;c.textAlign='left';c.textBaseline='alphabetic';c.fillText(txt,x,y);}
function openCase(config,index,reduced=false){
  const engine=new DreamLostCase(config,{record:{activeVariant:index}});
  const context={state:'playing',form:'body',body:{...engine.layout.box,grounded:true},soul:{...engine.layout.object},unlocked:true,reducedMotion:reduced};
  engine.refresh(context);engine.open(context);context.form='soul';engine.refresh(context);
  assert.equal(engine.getView().encore,null,'A closed / unobserved case must not preview its end scene');
  engine.pulse();engine.pulse();
  assert.equal(engine.getView().encore,null,'Two observed faces alone do not authorize a thank-you');
  const correct=engine.variantDefinition.claimants.findIndex(person=>person.id===engine.variantDefinition.answer);
  context.soul={...engine.layout.claimants[correct]};engine.refresh(context);engine.pulse();
  return {engine,context};
}
function advance(engine,context,seconds){let remaining=seconds;while(remaining>1e-8){const dt=Math.min(1/60,remaining);engine.update(dt,context);remaining-=dt;}}
function isolated(view,reduced=false){const c=createCanvas(640,640),ctx=c.getContext('2d');drawLostEncore(ctx,view,reduced);return c;}
function pixel(canvas){return Buffer.from(canvas.data());}
function boundsOf(canvas){const data=canvas.data();let left=canvas.width,top=canvas.height,right=-1,bottom=-1;for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(data[(y*canvas.width+x)*4+3]){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}return right<0?null:{left,top,right,bottom};}

const all=[];let purity=0,closed=0;
for(const config of LOST_CASES)for(let index=0;index<2;index++){
  const {engine,context}=openCase(config,index),views=[];let elapsed=0;
  for(const time of times){advance(engine,context,time-elapsed);elapsed=time;const view=engine.getView();views.push(structuredClone(view));
    const before=JSON.stringify(view),a=isolated(view.encore),b=isolated(view.encore);
    assert.deepEqual(pixel(a),pixel(b),'Same event clock has identical pixels');assert.equal(JSON.stringify(view),before,'The painter must not mutate controller output');purity++;
    const ink=boundsOf(a),frame=view.encore.bounds;
    if(time<=.7){assert.equal(ink,null,'The original handoff has sole visual ownership of its first .7s');closed++;}
    else{assert.ok(ink);assert.ok(ink.left>=Math.floor(frame.left)&&ink.right<Math.ceil(frame.right)&&ink.top>=Math.floor(frame.top)&&ink.bottom<Math.ceil(frame.bottom),'Decoration stays in its authored safe frame');}
  }
  const reduced=openCase(config,index,true).engine.getView();
  for(const view of views){assert.deepEqual(pixel(isolated(view.encore,true)),pixel(isolated(reduced.encore,true)),'Reduced motion directly shows the same final drawing');purity++;}
  context.state='paused';engine.refresh(context);const held=engine.getView();advance(engine,context,4);assert.deepEqual(pixel(isolated(held.encore)),pixel(isolated(engine.getView().encore)),'Pause freezes the encore');
  const settled=views.at(-1),restore=new DreamLostCase(config,{record:{activeVariant:index,seenClues:{[index]:[0,1]},solvedVariants:[index]}});restore.refresh(context);
  assert.deepEqual(pixel(isolated(settled.encore)),pixel(isolated(restore.getView().encore)),'Restored completion paints a settled miniature');
  all.push({config,index,views,settled});engine.destroy();restore.destroy();
}

// Each row is one actual solved group, not an invented animation state.
const keyframes=createCanvas(times.length*220,all.length*154),kc=keyframes.getContext('2d');background(kc,keyframes.width,keyframes.height);
for(const [row,item]of all.entries())for(const [column,view]of item.views.entries()){
  const x=column*220,y=row*154;label(kc,`${item.config.sceneId}/${item.index+1}  ${times[column].toFixed(2)}s`,x+9,y+19,11);
  kc.save();kc.translate(x+110-view.encore.anchor.x*1.8,y+90-view.encore.anchor.y*1.8);kc.scale(1.8,1.8);drawLostEncore(kc,view.encore);kc.restore();
}
await writeFile(resolve(out,'encore-keyframes.png'),await keyframes.encode('png'));

const finals=createCanvas(900,Math.ceil(all.length/3)*260),fc=finals.getContext('2d');background(fc,finals.width,finals.height);
for(const [i,item]of all.entries()){
  const x=i%3*300,y=Math.floor(i/3)*260,encore=item.settled.encore;label(fc,`${item.config.sceneId} / ${item.index+1}`,x+13,y+23);
  fc.save();fc.translate(x+150-encore.anchor.x*2.55,y+134-encore.anchor.y*2.55);fc.scale(2.55,2.55);drawLostEncore(fc,encore,true);fc.restore();
}
await writeFile(resolve(out,'encore-settled-scenes.png'),await finals.encode('png'));

// The same pure painter can be placed on a small, static receipt canvas.
const receipts=createCanvas(3*180,4*120),rc=receipts.getContext('2d');background(rc,receipts.width,receipts.height);
for(const[i,item]of all.entries()){
  const x=i%3*180,y=Math.floor(i/3)*120;
  rc.save();rc.translate(x+20,y+24);drawLostEncore(rc,{...item.settled.encore,anchor:{x:70,y:43},bounds:{left:18,right:122,top:15,bottom:75}},true);rc.restore();label(rc,`${item.config.sceneId}/${item.index+1}`,x+12,y+17,10);
}
await writeFile(resolve(out,'encore-receipt-thumbnails.png'),await receipts.encode('png'));

function gameFrame(config,index,width,height,bodyX=465,seasonId='halloween',seconds=3){
  const canvas=createCanvas(width,height);canvas.getBoundingClientRect=()=>({width,height});
  const game=new DreamGame(canvas),story=config.sceneId.startsWith('story-'),festival=story?null:{id:config.sceneId};
  game.start({chapterIndex:story?Number(config.sceneId.slice(6)):0,festival,sound:false,reducedMotion:false,season:{id:seasonId},lostCaseUnlocked:true,lostCaseRecord:{activeVariant:index},capActivityRecord:{completedSteps:[0,1,2],completedVariants:[0]}});
  game.body.x=bodyX;game.body.y=game.lostCase.layout.box.y;game.body.grounded=true;game.body.vx=0;game.body.vy=0;game.body.invulnerable=0;
  game.refreshCapActivity();game.lostCase.open(game.lostCaseContext());game.toggleSoul();for(let i=0;i<65;i++)game.update(1/60);
  game.soul.x=game.lostCase.layout.object.x;game.soul.y=game.lostCase.layout.object.y;game.soul.vx=0;game.soul.vy=0;game.refreshLostCase();game.lostCase.pulse(game.soul);game.lostCase.pulse(game.soul);
  const correct=game.lostCase.variantDefinition.claimants.findIndex(person=>person.id===game.lostCase.variantDefinition.answer);
  game.soul.x=game.lostCase.layout.claimants[correct].x;game.soul.y=game.lostCase.layout.claimants[correct].y;game.refreshLostCase();game.lostCase.pulse(game.soul);
  for(let i=0;i<Math.ceil(seconds*60);i++)game.update(1/60);
  game.visualTime=2.3;game.render();const encore=game.lostCase.getView().encore;
  assert.ok(encore,'Full-scene rendering uses an actually solved controller');
  for(const x of [encore.bounds.left,encore.bounds.right])assert.ok((x-game.camera)*game.scale>=0&&(x-game.camera)*game.scale<=width,'The entire encore fits horizontal framing');
  for(const y of [encore.bounds.top,encore.bounds.bottom])assert.ok(y*game.scale+game.viewportOffsetY>=0&&y*game.scale+game.viewportOffsetY<=height,'The entire encore fits vertical framing');
  game.destroy();return canvas;
}
for(const width of [320,390]){
  const height=width===320?680:780,contact=createCanvas(width*3,(height+24)*4),cc=contact.getContext('2d');background(cc,contact.width,contact.height);
  for(const[i,item]of all.entries()){
    const frame=gameFrame(item.config,item.index,width,height),x=i%3*width,y=Math.floor(i/3)*(height+24);
    cc.drawImage(frame,x,y+24);label(cc,`${item.config.sceneId} / ${item.index+1}`,x+9,y+17,11);
    if(item.index===0)await writeFile(resolve(out,`${item.config.sceneId}-${width}.png`),await frame.encode('png'));
  }
  await writeFile(resolve(out,`encore-full-game-${width}.png`),await contact.encode('png'));
}
const whale=LOST_CASES.find(config=>config.sceneId==='story-3'),whaleProof=createCanvas(3*500,2*440),wc=whaleProof.getContext('2d');background(wc,whaleProof.width,whaleProof.height);
for(const[row,season]of['halloween','christmas'].entries())for(const[column,x]of[436,465,494].entries()){
  const frame=gameFrame(whale,0,1000,780,x,season);wc.drawImage(frame,column*500,row*440+24,500,390);label(wc,`${season} / body ${x}`,column*500+10,row*440+18);
}
await writeFile(resolve(out,'encore-whale-hat-clearance.png'),await whaleProof.encode('png'));

// Canvas state must survive even a clipped and non-uniformly scaled frame.
const ctx=createCanvas(640,640).getContext('2d');ctx.translate(7,11);ctx.scale(.8,.7);ctx.globalAlpha=.51;ctx.lineWidth=9;ctx.strokeStyle='#52789b';
const state=JSON.stringify([ctx.getTransform().toString(),ctx.globalAlpha,ctx.lineWidth]);drawLostEncore(ctx,all.at(-1).settled.encore);
assert.equal(JSON.stringify([ctx.getTransform().toString(),ctx.globalAlpha,ctx.lineWidth]),state);
const reference=createCanvas(640,640).getContext('2d');reference.translate(7,11);reference.scale(.8,.7);reference.globalAlpha=.51;reference.lineWidth=9;reference.strokeStyle='#52789b';
for(const c of [ctx,reference]){c.beginPath();c.moveTo(700,10);c.lineTo(700,90);c.stroke();}
assert.deepEqual(Buffer.from(ctx.getImageData(560,10,16,70).data),Buffer.from(reference.getImageData(560,10,16,70).data),'Restore caller stroke paint and clip');

console.log(`Rendered ${all.length} solved groups × ${times.length} actual event times to ${out}.`);
console.log(`${purity} purity/determinism/reduced comparisons, ${closed} pre-unfold blank states, pause/restore and safe-frame checks passed.`);
console.log('Full-game 320/390 proofs and whale raised-hat positions 436/465/494 under Halloween/Christmas rendered; receipt thumbnails use the same pure painter.');
