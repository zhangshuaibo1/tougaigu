// Optional offline visual QA. All scene frames use the real DreamGame and
// its authored NPC view; this script never reads browser state or player saves.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { getStoryNPC } from '../dist/dream-encounters.js';
import { drawStoryNPC, STORY_NPC_BOUNDS } from '../dist/dream-encounter-art.js';
import { DreamGame } from '../dist/dream-engine.js';

const require=createRequire(import.meta.url);
const {createCanvas}=require(require.resolve('@napi-rs/canvas',{paths:[process.cwd(),process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'']}));
const folder=resolve(process.argv[2]||'/tmp/tougaigu-story-encounters-v11');
await mkdir(folder,{recursive:true});
const noop=()=>{};
globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
const english={moth:'Rongrong',keeper:'Mr. Gui',whale:'Lanye'};
const chapters=['station','greenhouse','theatre','library','coast','post'];
const configs=Array.from({length:6},(_,index)=>getStoryNPC(index));
function bg(c,w,h){const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#20313a');g.addColorStop(1,'#34464b');c.fillStyle=g;c.fillRect(0,0,w,h);}
function label(c,text,x,y,size=12){c.font=`${size}px sans-serif`;c.textAlign='left';c.textBaseline='alphabetic';c.fillStyle='#ead7b9';c.fillText(text,x,y);}
function proofView(view){return {...view,name:english[view.motif]};}
function image(view,t=0,reduced=false){const canvas=createCanvas(400,640);drawStoryNPC(canvas.getContext('2d'),proofView(view),t,reduced);return canvas;}
function pixels(canvas){return Buffer.from(canvas.data());}
function pixelBounds(canvas){const d=canvas.data();let left=canvas.width,right=-1,top=canvas.height,bottom=-1;for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(d[(y*canvas.width+x)*4+3]){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}return right<0?null:{left,right,top,bottom};}
function pose(config,kind){
  const near=kind!=='far',form=kind.startsWith('open')?'soul':'body';
  return {...config,near,talking:kind==='talk',talked:false,seals:0,form,capOpen:form==='soul',look:{x:kind==='open-right'?config.x+100:config.x-85,y:form==='soul'?config.y-165:config.y-35}};
}
const poseNames=['far','near','open-left','open-right','talk'];
let pure=0,reduced=0,bounded=0;
for(const config of configs)for(const kind of poseNames){
  const view=pose(config,kind),before=JSON.stringify(view);
  for(const t of [0,.8,2.4,4.1]){
    const a=image(view,t),b=image(view,t);assert.deepEqual(pixels(a),pixels(b),'Identical view/time must paint identical pixels');assert.equal(JSON.stringify(view),before,'Painter must not change engine view');pure++;
    const bounds=pixelBounds(a);assert.ok(bounds);
    assert.ok(bounds.left>=view.x+STORY_NPC_BOUNDS.left&&bounds.right<view.x+STORY_NPC_BOUNDS.right,'NPC horizontal art exceeds declared bounds');
    assert.ok(bounds.top>=view.y+STORY_NPC_BOUNDS.top&&bounds.bottom<view.y+STORY_NPC_BOUNDS.bottom,'NPC vertical art exceeds declared bounds');bounded++;
  }
  assert.deepEqual(pixels(image(view,0,true)),pixels(image(view,99,true)),'Reduced motion must stop all decorative clocks');reduced++;
  if(kind==='near')assert.notDeepEqual(pixels(image(view,2,true)),pixels(image(pose(config,'open-left'),2,true)),'Opening the cap should visibly change the friend pose');
}
const contact=createCanvas(5*240,6*200),cc=contact.getContext('2d');bg(cc,contact.width,contact.height);
for(const[row,config]of configs.entries())for(const[column,kind]of poseNames.entries()){
  const x=column*240,y=row*200;label(cc,`${chapters[row]} / ${kind}`,x+10,y+18);
  cc.save();cc.translate(x+120-config.x*1.25,y+180-config.y*1.25);cc.scale(1.25,1.25);drawStoryNPC(cc,proofView(pose(config,kind)),2.4,false);cc.restore();
}
await writeFile(resolve(folder,'story-npc-poses.png'),await contact.encode('png'));
const detail=createCanvas(3*380,2*390),dc=detail.getContext('2d');bg(dc,detail.width,detail.height);
for(const[i,config]of configs.entries()){
  const x=i%3*380,y=Math.floor(i/3)*390;label(dc,`${chapters[i]} / ${config.prop}`,x+14,y+24);
  dc.save();dc.translate(x+190-config.x*2.55,y+350-config.y*2.55);dc.scale(2.55,2.55);drawStoryNPC(dc,proofView(pose(config,'open-left')),2.4,false);dc.restore();
}
await writeFile(resolve(folder,'story-npc-details.png'),await detail.encode('png'));

function gameFrame(index,width,height,kind='body',time=2.4){
  const canvas=createCanvas(width,height);canvas.getBoundingClientRect=()=>({width,height});
  const game=new DreamGame(canvas,{onTalk:noop});game.start({chapterIndex:index,sound:false,season:{id:'halloween'},reducedMotion:false});
  // This inspection runtime has no CJK font. Translate only the drawn name
  // so its bounds can still be inspected; authored data and gameplay stay intact.
  const actualView=game.getStoryNPCView.bind(game);
  game.getStoryNPCView=npc=>{const view=actualView(npc);return view?proofView(view):view;};
  assert.equal(game.level.npcs.length,1,'The actual chapter supplies exactly one friend');
  if(kind==='soul'){assert.equal(game.toggleSoul(),true);for(let i=0;i<40;i++)game.update(1/60);}
  if(kind==='talk'){assert.equal(game.interact(),true);assert.equal(game.state,'paused');}
  game.visualTime=time;game.render();
  const view=game.getStoryNPCView();assert.equal(view.motif,configs[index].motif);
  for(const edge of ['left','right'])assert.ok((view.x+STORY_NPC_BOUNDS[edge]-game.camera)*game.scale>=0&&(view.x+STORY_NPC_BOUNDS[edge]-game.camera)*game.scale<=width,'Initial NPC must fit phone viewport');
  for(const edge of ['top','bottom'])assert.ok((view.y+STORY_NPC_BOUNDS[edge])*game.scale+game.viewportOffsetY>=0&&(view.y+STORY_NPC_BOUNDS[edge])*game.scale+game.viewportOffsetY<=height,'Initial NPC must fit vertical viewport');
  assert.ok(game.companion.x<game.body.x,'The companion starts behind Ashi, away from the new friend');
  if(kind==='body'){
    const before=pixels(canvas);game.pause();for(let i=0;i<120;i++)game.update(1/60);game.render();assert.deepEqual(pixels(canvas),before,'Pause freezes the entire rendered scene, including its friend');
  }
  game.destroy();return canvas;
}
for(const [mode,width,height]of[['desktop',1100,640],['mobile-390',390,708],['mobile-320',320,544]]){
  const tw=mode==='desktop'?550:width,th=mode==='desktop'?344:height+24;
  const sheet=createCanvas(tw*3,th*2),c=sheet.getContext('2d');bg(c,sheet.width,sheet.height);
  const opened=createCanvas(tw*3,th*2),oc=opened.getContext('2d');bg(oc,opened.width,opened.height);
  for(let index=0;index<6;index++){
    const body=gameFrame(index,width,height),soul=gameFrame(index,width,height,'soul');
    const x=index%3*tw,y=Math.floor(index/3)*th;c.drawImage(body,x,y+24,tw,th-24);oc.drawImage(soul,x,y+24,tw,th-24);
    label(c,chapters[index],x+10,y+17);label(oc,chapters[index]+' / cap open',x+10,y+17);
    await writeFile(resolve(folder,`${chapters[index]}-${mode}.png`),await body.encode('png'));
  }
  await writeFile(resolve(folder,`story-npc-${mode}.png`),await sheet.encode('png'));
  await writeFile(resolve(folder,`story-npc-${mode}-open.png`),await opened.encode('png'));
}
// Stateful canvases must survive the public renderer unchanged.
const a=createCanvas(400,640).getContext('2d');a.translate(7,11);a.scale(.8,.8);a.globalAlpha=.63;a.lineWidth=6;a.strokeStyle='#123456';
const prior=JSON.stringify([a.getTransform().toString(),a.globalAlpha,a.lineWidth]);drawStoryNPC(a,pose(configs[0],'open-left'),2);
assert.equal(JSON.stringify([a.getTransform().toString(),a.globalAlpha,a.lineWidth]),prior,'NPC painter must restore caller transform/alpha/line width');
const control=createCanvas(400,640).getContext('2d');control.translate(7,11);control.scale(.8,.8);control.globalAlpha=.63;control.lineWidth=6;control.strokeStyle='#123456';
for(const ctx of[a,control]){ctx.beginPath();ctx.moveTo(430,15);ctx.lineTo(430,60);ctx.stroke();}
assert.deepEqual(Buffer.from(a.getImageData(347,20,10,42).data),Buffer.from(control.getImageData(347,20,10,42).data),'NPC painter restores actual stroke paint');
console.log(`Rendered six chapter friends, five poses each, and actual desktop/390/320 scenes to ${folder}`);
console.log(`${pure} pure/deterministic drawings, ${bounded} bounds checks, ${reduced} reduced-motion comparisons passed.`);
console.log('Actual engine cap reactions, paused full-scene frames, phone bounds and caller Canvas state passed.');
