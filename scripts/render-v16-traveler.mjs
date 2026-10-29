// Offline production-Canvas art review. Pose sheets use explicit visual
// fixtures; the open/held-ticket frames use real engine input and updates.
// This is not browser QA or evidence of completing a whole chapter.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DreamGame } from '../dist/dream-engine.js';
import { DreamGame as BaseGame } from '../dist/dream-engine-base.js';

const require=createRequire(import.meta.url);
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.cwd(),process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'']}));
const folder=resolve(process.argv[2]||'/tmp/tougaigu-v16-traveler');await mkdir(folder,{recursive:true});
const noop=()=>{};
globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
const pixels=canvas=>Buffer.from(canvas.data());
const tick=(game,frames)=>{for(let frame=0;frame<frames;frame++)game.update(1/60);};
const state=game=>JSON.stringify({body:game.body,soul:game.soul,form:game.form,energy:game.energy,cap:game.cap,firstTicket:game.firstTicket,memories:game.memories,lamps:game.lanterns,signal:game.stationSignal,particles:game.particles,capActivity:game.capActivity?.getSnapshot()});
let checks=0;
const check=(condition,message)=>{assert.ok(condition,message);checks++;};
const equal=(a,b,message)=>{assert.deepEqual(a,b,message);checks++;};

async function makeGame(width,height,options={}){
  const canvas=createCanvas(width,height),pending=[];
  canvas.getBoundingClientRect=()=>({width,height});
  const resources={loadImage:src=>{const file=fileURLToPath(new URL(src,new URL('../dist/',import.meta.url))),promise=loadImage(file);pending.push(promise);return promise;}};
  const game=new DreamGame(canvas,{},resources);game.start({sound:false,...options});
  if(game.paintedScenes)await game.paintedScenes.request({mode:game.mode,chapterIndex:game.chapterIndex});
  await Promise.allSettled(pending);await Promise.resolve();
  if(game.mode==='story'&&game.chapterIndex===0&&game.getPaintedStationImage)check(!!game.getPaintedStationImage(),'the production painting has actually loaded before composite capture');
  game.body.invulnerable=0;return {game,canvas};
}
function words(c,text,x,y,size=13){c.fillStyle='#e9e2c9';c.font=`${size}px sans-serif`;c.textAlign='left';c.fillText(text,x,y);}
async function save(canvas,name){await writeFile(resolve(folder,name),await canvas.encode('png'));}

const fixture=await makeGame(300,240),{game}=fixture;
const poses=[
  {name:'quiet stance',body:{vx:0,vy:0,walk:0,grounded:true,land:0}},
  {name:'contact / swing',body:{vx:240,vy:0,walk:.45,grounded:true,land:0}},
  {name:'next step',body:{vx:240,vy:0,walk:1.2,grounded:true,land:0}},
  {name:'rising',body:{vx:240,vy:-450,walk:1.2,grounded:false,land:-.08}},
  {name:'descending',body:{vx:100,vy:600,walk:1.2,grounded:false,land:0}},
  {name:'soft landing',body:{vx:0,vy:0,walk:1.2,grounded:true,land:.2}},
];
const sheet=createCanvas(1080,580),s=sheet.getContext('2d');s.fillStyle='#16394b';s.fillRect(0,0,1080,580);
for(const [index,pose] of poses.entries()){
  Object.assign(game.body,{x:0,y:0,face:1,invulnerable:0},pose.body);game.visualTime=.55;
  const before=state(game),presentation=game.getCharacterPresentation();
  equal(presentation,BaseGame.prototype.getCharacterPresentation.call(game),'the original rig and arm presentation are unchanged');
  const single=createCanvas(220,240),c=single.getContext('2d');c.translate(110,180);c.globalAlpha=.87;c.lineWidth=2.4;c.setLineDash([2,4]);
  const transform=c.getTransform(),dash=c.getLineDash(),alpha=c.globalAlpha,lineWidth=c.lineWidth;
  game.drawCharacter(c,game.body,.55,null,presentation);
  equal(state(game),before,'painting a pose does not update gameplay');equal(c.getTransform(),transform);equal(c.getLineDash(),dash);equal(c.globalAlpha,alpha);equal(c.lineWidth,lineWidth);
  const data=single.data();let left=220,right=-1,top=240,bottom=-1;
  for(let y=0;y<240;y++)for(let x=0;x<220;x++)if(data[(y*220+x)*4+3]>2){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  check(left>=50&&right<=170&&top>=60&&bottom<=190,'pose exceeds the existing default-character drawing envelope');
  const x=index*180;
  words(s,pose.name,x+10,24,12);s.save();s.translate(x+91,276);s.scale(2.5,2.5);game.drawCharacter(s,game.body,.55,null,presentation);s.restore();
  for(const [row,scale] of [.6734375,.9296875,1].entries()){
    s.save();s.translate(x+91,366+row*86);s.scale(scale,scale);game.drawCharacter(s,game.body,.55,null,presentation);s.restore();
    if(index===0)words(s,`${scale===1?'1x':row===0?'320px':'390px'} play scale`,8,391+row*86,10);
  }
}
await save(sheet,'traveler-pose-sheet.png');game.destroy();

const frames=[];
for(const [name,width,height] of [['desktop',1100,640],['phone-320',320,431],['phone-390',390,595]]){
  const {game,canvas}=await makeGame(width,height);
  async function capture(label){const before=state(game);game.render();equal(state(game),before,'full frame keeps simulation immutable');await save(canvas,`${name}-${label}.png`);frames.push(`${name}-${label}.png`);}
  await capture('arrival');
  // Exercise the normal first-ticket collection, then the real recall path.
  check(game.toggleSoul(),'real soul control can start');tick(game,40);
  const ticket=game.memories[0];
  for(let frame=0;frame<220&&!ticket.collected;frame++){
    const dx=ticket.x-game.soul.x,dy=ticket.y-game.soul.y,d=Math.hypot(dx,dy)||1;
    game.setInput({x:dx/d,y:dy/d});game.update(1/60);
  }
  game.setInput({x:0,y:0});check(game.firstTicket.phase==='held','the original first ticket is really held');await capture('ticket-held');
  game.recall();tick(game,12);await capture('ticket-returning');
  game.pause();game.render();const paused=pixels(canvas);tick(game,90);game.render();equal(pixels(canvas),paused,'paused full frame is pixel-identical');
  game.resume();tick(game,40);check(game.firstTicket.phase==='stowed','the ticket reaches the original head train');
  await capture('ticket-home');
  game.setReducedMotion(true);game.render();const still=pixels(canvas);game.visualTime+=123;game.render();equal(pixels(canvas),still,'reduced-motion full frame ignores decorative time');
  game.destroy();
}
const report={checks,poseFixtures:poses.map(pose=>pose.name),frames,productionRenderer:true,realTicketInput:true,browserQA:false};
await writeFile(resolve(folder,'traveler-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({folder,...report}));
