// Optional local art QA. Uses the real controller and Canvas; it does not
// change browser assets, storage, progression, or the deployed game.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { LOST_CASES } from '../dist/dream-lost-cases.js';
import { DreamLostCase } from '../dist/dream-lost-engine.js';
import { drawLostCase } from '../dist/dream-lost-art.js';
import { DreamGame } from '../dist/dream-engine.js';

const require=createRequire(import.meta.url);
const canvasPath=require.resolve('@napi-rs/canvas',{paths:[process.cwd(),process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'']});
const {createCanvas}=require(canvasPath);
const folder=resolve(process.argv[2]||'/tmp/tougaigu-lost-cases-v8');
await mkdir(folder,{recursive:true});
const noop=()=>{};
globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
globalThis.requestAnimationFrame=()=>1;
globalThis.cancelAnimationFrame=noop;

const names={moth:'Rongrong',keeper:'Mr. Gui',ashi:'Ashi',light:'Shiguang',rabbit:'Rabbit',bat:'Bat',pumpkin:'Pumpkin',crane:'Aling'};
function preview(view){
  const v=structuredClone(view);
  // The inspection runtime lacks CJK fonts. These short names apply only to
  // art proofs; production always uses the authored Chinese names.
  v.claimants.forEach(person=>{person.name=names[person.id]||person.id;});
  return v;
}
function snapshots(config,index,reducedMotion=false){
  const controller=new DreamLostCase(config,{record:{activeVariant:index}});
  const context={state:'playing',form:'body',body:{x:465,y:560,grounded:true},soul:{x:390,y:430},unlocked:true,reducedMotion};
  controller.refresh(context);const closed=controller.getView();controller.open(context);
  context.form='soul';controller.refresh(context);const sealed=controller.getView();
  controller.pulse(context.soul);const front=controller.getView();controller.pulse(context.soul);const back=controller.getView();
  const correctIndex=controller.variantDefinition.claimants.findIndex(person=>person.id===controller.variantDefinition.answer);
  const wrongIndex=(correctIndex+1)%3;
  context.soul={...controller.layout.claimants[wrongIndex]};controller.refresh(context);controller.pulse(context.soul);
  for(let i=0;i<9;i++)controller.update(1/30,context);
  const wrong=controller.getView();
  for(let i=0;i<30;i++)controller.update(1/30,context);
  const returned=controller.getView();
  context.soul={...controller.layout.claimants[correctIndex]};controller.refresh(context);controller.pulse(context.soul);
  for(let i=0;i<11;i++)controller.update(1/30,context);
  const delivery=controller.getView();
  for(let i=0;i<24;i++)controller.update(1/30,context);
  const solved=controller.getView();
  context.state='paused';controller.refresh(context);const paused=controller.getView();
  controller.destroy();return {closed,sealed,front,back,wrong,returned,delivery,solved,paused};
}
function backdrop(c,w,h,sceneId='story-0'){
  const palette=sceneId==='halloween'?['#252339','#4d3850']:sceneId==='valentine'?['#29283c','#60454f']:['#1e2834','#30494d'];
  const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,palette[0]);g.addColorStop(1,palette[1]);c.fillStyle=g;c.fillRect(0,0,w,h);
}
function label(c,text,x,y,size=13){c.fillStyle='#efdcba';c.font=`${size}px sans-serif`;c.textAlign='left';c.textBaseline='alphabetic';c.fillText(text,x,y);}
function tile(c,view,x,y,w=370,h=390,reduced=false,title=''){
  c.save();c.beginPath();c.rect(x,y,w,h);c.clip();c.translate(x,y);backdrop(c,w,h,view.sceneId);
  c.save();c.translate(w/2-320,h-18-575);drawLostCase(c,preview(view),2.3,reduced);c.restore();label(c,title,12,20);c.restore();
}

const all=[];
for(const config of LOST_CASES)for(let index=0;index<2;index++){
  const normal=snapshots(config,index),reduced=snapshots(config,index,true);all.push({config,index,normal,reduced});
  const frames=['sealed','front','back','wrong','delivery','solved'];
  const sheet=createCanvas(370*frames.length,390*2),c=sheet.getContext('2d');
  for(let col=0;col<frames.length;col++)for(let row=0;row<2;row++){
    const key=frames[col];tile(c,(row?reduced:normal)[key],col*370,row*390,370,390,!!row,`${key}${row?' / reduced':''}`);
  }
  await writeFile(resolve(folder,`${config.sceneId}-${index}-keyframes.png`),await sheet.encode('png'));
}
const overview=createCanvas(1200,840),o=overview.getContext('2d');
for(const[i,item]of all.entries())tile(o,item.normal.front,(i%3)*400,Math.floor(i/3)*420,400,420,false,`${item.config.sceneId} / evidence ${item.index+1}`);
await writeFile(resolve(folder,'lost-cases-contact.png'),await overview.encode('png'));

// Isolate both faces at a useful inspection size, including each genuinely
// different authored evidence set; a closed cabinet is shown underneath.
const objects=createCanvas(1200,960),p=objects.getContext('2d');backdrop(p,1200,960);
for(const[i,item]of all.entries()){
  const x=(i%3)*400,y=Math.floor(i/3)*480;label(p,`${item.config.sceneId} / evidence ${item.index+1}`,x+14,y+24,15);
  for(const[side,key]of['front','back'].entries()){
    const view=preview(item.normal[key]);view.claimants=[];view.box=null;view.object.selected=false;
    p.save();p.beginPath();p.rect(x+side*200,y+34,200,252);p.clip();p.translate(x+side*200+100-390*2.2,y+126-430*2.2);p.scale(2.2,2.2);drawLostCase(p,view,0,true);p.restore();label(p,key,x+side*200+16,y+270);
  }
  p.save();p.translate(x+200-465*3,y+410-560*3);p.scale(3,3);drawLostCase(p,preview(item.normal.closed),0,true);p.restore();
}
await writeFile(resolve(folder,'lost-evidence-faces.png'),await objects.encode('png'));

function gameFrame(config,index,width,height){
  const canvas=createCanvas(width,height);canvas.getBoundingClientRect=()=>({width,height});
  const game=new DreamGame(canvas);const festival=config.sceneId==='story-0'?null:{id:config.sceneId};
  game.start({chapterIndex:0,festival,sound:false,reducedMotion:false,season:{id:'halloween'},lostCaseUnlocked:true,lostCaseRecord:{activeVariant:index},capActivityRecord:{completedSteps:[0,1,2],completedVariants:[0]}});
  game.body.x=465;game.body.y=560;game.body.grounded=true;game.body.vx=0;game.body.vy=0;game.body.invulnerable=0;
  game.refreshCapActivity();game.lostCase.open(game.lostCaseContext());game.toggleSoul();
  for(let i=0;i<65;i++)game.update(1/60);
  // Approach from the body below the exhibit, just inside its real 36px
  // interaction range. The diagram stays above the observer's bright face.
  game.soul.x=390;game.soul.y=465;game.soul.vx=0;game.soul.vy=0;game.refreshLostCase();game.lostCase.pulse(game.soul);
  game.visualTime=2.3;game.render();
  const view=game.lostCase.getView();
  if(!view.expanded)throw new Error('Full-game art proof failed to open lost-property projections');
  for(const person of view.claimants){
    const left=(person.x-44-game.camera)*game.scale,right=(person.x+44-game.camera)*game.scale;
    if(left<0||right>width)throw new Error(`${config.sceneId}: claimant ${person.id} leaves the ${width}px viewport`);
  }
  game.destroy();return canvas;
}
for(const mode of ['desktop','mobile']){
  const mobile=mode==='mobile',tw=mobile?390:550,th=mobile?808:344;
  const sheet=createCanvas(tw*3,th*2),c=sheet.getContext('2d');backdrop(c,sheet.width,sheet.height);
  for(const[i,item]of all.entries()){
    const canvas=gameFrame(item.config,item.index,mobile?390:1100,mobile?780:640);
    await writeFile(resolve(folder,`${item.config.sceneId}-${item.index}-${mode}.png`),await canvas.encode('png'));
    const x=i%3*tw,y=Math.floor(i/3)*th;c.drawImage(canvas,x,y+24,tw,th-24);label(c,`${item.config.sceneId} / evidence ${item.index+1}`,x+10,y+18);
  }
  await writeFile(resolve(folder,`lost-full-game-${mode}.png`),await sheet.encode('png'));
}
await writeFile(resolve(folder,'lost-full-game-320.png'),await gameFrame(LOST_CASES[1],0,320,680).encode('png'));

function pixels(view,t,reduced){const canvas=createCanvas(640,640);drawLostCase(canvas.getContext('2d'),view,t,reduced);return Buffer.from(canvas.data());}
let comparisons=0;
for(const item of all)for(const[key,view]of Object.entries(item.normal)){
  const before=JSON.stringify(view),a=pixels(view,1,true),b=pixels(view,97,true);
  if(!a.equals(b))throw new Error(`${item.config.id}/${item.index}/${key}: decoration moved with reduced motion`);
  if(JSON.stringify(view)!==before)throw new Error('Painting changed controller state');
  comparisons++;
}
for(const item of all){
  if(pixels(item.normal.front,0,true).equals(pixels(item.normal.back,0,true)))throw new Error('Two evidence faces are not visually distinguishable');
  if(pixels(item.normal.sealed,0,true).equals(pixels(item.normal.front,0,true)))throw new Error('Unobserved evidence is not visually distinct');
  if(pixels(item.normal.delivery,0,true).equals(pixels(item.normal.solved,0,true)))throw new Error('Required hand-off state was hidden by reduced motion');
  if(!pixels(item.reduced.solved,0,true).equals(pixels(item.reduced.paused,0,true)))throw new Error('Pausing changed a settled delivery');
}
// Preserve the caller's transform/alpha/styles, even when painting a selected
// target. Verify the public contract rather than individual drawing helpers.
const context=createCanvas(640,640).getContext('2d');context.translate(13,17);context.scale(.8,.8);context.globalAlpha=.53;context.lineWidth=7;context.strokeStyle='#123456';
const contextBefore=JSON.stringify([context.getTransform().toString(),context.globalAlpha,context.lineWidth]);
drawLostCase(context,all[0].normal.front,4,false);
if(contextBefore!==JSON.stringify([context.getTransform().toString(),context.globalAlpha,context.lineWidth]))throw new Error('Lost-property art leaked Canvas state');
// napi Canvas caches style getters across restore(); compare an actual stroke
// outside the artwork to check the restored native paint rather than that cache.
const control=createCanvas(640,640).getContext('2d');control.translate(13,17);control.scale(.8,.8);control.globalAlpha=.53;control.lineWidth=7;control.strokeStyle='#123456';
for(const target of [context,control]){target.beginPath();target.moveTo(700,20);target.lineTo(700,70);target.stroke();}
if(!Buffer.from(context.getImageData(566,28,15,53).data).equals(Buffer.from(control.getImageData(566,28,15,53).data)))throw new Error('Lost-property art leaked its stroke paint');
console.log(`Rendered 3 cases × 2 evidence sets × normal/reduced keyframes to ${folder}`);
console.log(`${comparisons} reduced-motion/pure-view comparisons passed; both faces, unobserved covers, delivery states and paused results stay distinguishable/stable.`);
console.log('Full-game desktop, 390px and 320px Canvas proofs passed claimant bounds; caller Canvas state is preserved.');
