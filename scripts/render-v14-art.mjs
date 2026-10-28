// Isolated, offline Canvas proofs for v14's small story actions. They use the
// production painters with explicit authored state, never synthetic browser QA.
import { createRequire } from 'node:module';
import { mkdir,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { drawCapMiniature } from '../dist/dream-cap-art.js';
import { drawStoryNPC,STORY_NPC_BOUNDS } from '../dist/dream-encounter-art.js';
import { drawGreenhouseSeed,GREENHOUSE_SEED_BOUNDS } from '../dist/dream-greenhouse-art.js';
import { getStoryNPC } from '../dist/dream-encounters.js';

const require=createRequire(import.meta.url);
const {createCanvas}=require(require.resolve('@napi-rs/canvas',{paths:[process.cwd(),process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'']}));
const folder=resolve(process.argv[2]||'/tmp/tougaigu-v14-art');await mkdir(folder,{recursive:true});
const data=canvas=>Buffer.from(canvas.data());
let assertions=0;
function backdrop(c,w,h){const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#183337');g.addColorStop(1,'#355149');c.fillStyle=g;c.fillRect(0,0,w,h);}
function label(c,value,x,y){c.font='12px sans-serif';c.textAlign='left';c.fillStyle='#f3e4c6';c.fillText(value,x,y);}
function layer(paint,view,opts={}){
  const canvas=createCanvas(240,240),c=canvas.getContext('2d');c.translate(120,170);
  c.globalAlpha=.8;c.lineWidth=2;c.setLineDash([3,5]);
  const before=JSON.stringify(view),matrix=c.getTransform(),alpha=c.globalAlpha,width=c.lineWidth,dash=c.getLineDash();
  paint(c,view,opts.time??0,opts.reduced===true);
  assert.equal(JSON.stringify(view),before,'the source view is immutable');assertions++;
  assert.deepEqual(c.getTransform(),matrix,'transform is restored');assert.equal(c.globalAlpha,alpha,'alpha is restored');assert.equal(c.lineWidth,width,'line width is restored');assert.deepEqual(c.getLineDash(),dash,'dash is restored');assertions++;
  return canvas;
}
function inkBounds(canvas){
  const pixels=canvas.data();let left=240,right=-1,top=240,bottom=-1;
  for(let y=0;y<240;y++)for(let x=0;x<240;x++)if(pixels[(y*240+x)*4+3]>1){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  return right<0?null:{left:left-120,right:right-120,top:top-170,bottom:bottom-170};
}
function within(canvas,bounds,name){
  const b=inkBounds(canvas);assert.ok(b,name+' has ink');
  for(const side of ['left','top'])assert.ok(b[side]>=bounds[side]-1,name+' '+side+' '+b[side]);
  for(const side of ['right','bottom'])assert.ok(b[side]<=bounds[side]+1,name+' '+side+' '+b[side]);assertions++;
  return b;
}
function capState(pot,stage,fromStage=stage,progress=1){return {motif:'sprout',color:'#b5dec0',accent:'#f4c78f',greenhouse:{pot,stage,fromStage,progress}};}
const capPainter=(c,view,time)=>drawCapMiniature(c,view,time);
const capSheet=createCanvas(880,480),capC=capSheet.getContext('2d');backdrop(capC,880,480);
const growthSheet=createCanvas(1000,600),growthC=growthSheet.getContext('2d');backdrop(growthC,1000,600);
const seedDetails=[],mothDetails=[];
for(const [row,pot] of ['ticket','clay'].entries())for(let stage=0;stage<=3;stage++){
  const view=capState(pot,stage),canvas=layer(capPainter,view);
  within(canvas,{left:-60,right:60,top:-60,bottom:30},`${pot} stage ${stage}`);
  assert.deepEqual(data(canvas),data(layer(capPainter,view)),'cap stage is deterministic');assertions++;
  assert.deepEqual(data(canvas),data(layer(capPainter,view,{time:77})),'earned plant has no ambient growth or sway clock');assertions++;
  const x=stage*220,y=row*240;capC.save();capC.translate(x+110,y+170);capC.scale(2.2,2.2);drawCapMiniature(capC,view,0);capC.restore();label(capC,`${pot} / stage ${stage}`,x+12,y+23);
  if(stage){assert.notDeepEqual(data(canvas),data(layer(capPainter,capState(pot,stage-1))),'each new stage makes a visible change');assertions++;}
}
for(let stage=1;stage<=3;stage++)for(const [col,p] of [0,.25,.5,.75,1].entries()){
  const view=capState('ticket',stage,stage-1,p),image=layer(capPainter,view);
  within(image,{left:-60,right:60,top:-60,bottom:30},`stage ${stage} / ${p}`);
  if(p===0){assert.deepEqual(data(image),data(layer(capPainter,capState('ticket',stage-1))),'a transition begins at the previously earned image');assertions++;}
  if(p===1){assert.deepEqual(data(image),data(layer(capPainter,capState('ticket',stage))),'a transition reaches the saved final image');assertions++;}
  const x=col*200,y=(stage-1)*200;growthC.save();growthC.translate(x+100,y+150);growthC.scale(1.9,1.9);drawCapMiniature(growthC,view,0);growthC.restore();label(growthC,`${stage-1} -> ${stage} / ${p}`,x+10,y+22);
}
// An impossible previous state cannot expose an unearned flower.
assert.deepEqual(data(layer(capPainter,capState('ticket',0,3,0))),data(layer(capPainter,capState('ticket',0))));assertions++;
const legacy={motif:'sprout',color:'#b5dec0',accent:'#f4c78f'};
assert.notDeepEqual(data(layer(capPainter,legacy)),data(layer(capPainter,capState('clay',0))),'missing greenhouse data keeps the old mature miniature');assertions++;

const seedSheet=createCanvas(660,210),seedC=seedSheet.getContext('2d');backdrop(seedC,660,210);
for(const [i,spec] of [{boot:true},{held:true},{}].entries()){
  const view={x:0,y:0,scale:1,...spec},canvas=layer(drawGreenhouseSeed,view);
  seedDetails.push(within(canvas,GREENHOUSE_SEED_BOUNDS,'seed '+i));
  assert.deepEqual(data(canvas),data(layer(drawGreenhouseSeed,view,{time:88,reduced:true})),'seed/boot has no hidden clock, reduced motion is identical');assertions++;
  const x=i*220;seedC.save();seedC.translate(x+110,112);seedC.scale(2.7,2.7);drawGreenhouseSeed(seedC,view);seedC.restore();label(seedC,['sheltered in an old boot','held by Shiguang','the same little seed'][i],x+12,23);
}
const npc=getStoryNPC(0),base={...npc,near:true,form:'body',capOpen:0,look:{x:270,y:420},talking:false};
const poses=[
  ['waiting',{phase:'missing',fresh:false,greeting:'none',progress:1}],
  ['noticed the ticket',{phase:'held',fresh:true,greeting:'notice',progress:1}],
  ['watching the return',{phase:'returning',fresh:true,greeting:'notice',progress:1}],
  ['welcome / .25',{phase:'stowed',fresh:true,greeting:'welcome',progress:.25}],
  ['welcome / .55',{phase:'stowed',fresh:true,greeting:'welcome',progress:.55}],
  ['warm lamp remains',{phase:'stowed',fresh:true,greeting:'settled',progress:1}],
];
const npcSheet=createCanvas(1320,330),npcC=npcSheet.getContext('2d');backdrop(npcC,1320,330);
for(const [i,[name,ticket]] of poses.entries()){
  const airborne=['held','returning'].includes(ticket.phase);
  const view={...base,x:0,y:0,name:'',form:ticket.phase==='held'?'soul':'body',capOpen:airborne?1:0,look:ticket.phase==='held'?{x:80,y:-140}:ticket.phase==='returning'?{x:20,y:-95}:{x:-80,y:-45},stationTicket:ticket};
  const canvas=layer(drawStoryNPC,view,{time:.55});mothDetails.push(within(canvas,STORY_NPC_BOUNDS,name));
  assert.deepEqual(data(canvas),data(layer(drawStoryNPC,view,{time:.55})),'identical greeting view/time yields identical pixels');assertions++;
  const x=i*220;npcC.save();npcC.translate(x+110,295);npcC.scale(2.35,2.35);drawStoryNPC(npcC,view,.55);npcC.restore();label(npcC,name,x+12,22);
}
const welcoming={...base,x:0,y:0,name:'',stationTicket:poses[4][1]};
assert.deepEqual(data(layer(drawStoryNPC,welcoming,{time:1,reduced:true})),data(layer(drawStoryNPC,welcoming,{time:99,reduced:true})),'reduced-motion greeting is static');assertions++;
const settled={...welcoming,stationTicket:{...welcoming.stationTicket,greeting:'settled',progress:1}};
assert.deepEqual(data(layer(drawStoryNPC,welcoming,{reduced:true})),data(layer(drawStoryNPC,settled,{reduced:true})),'reduced-motion welcome uses the settled warm-lamp pose');assertions++;
// Restoring a saved ticket cannot cause the celebration pose by an old tag.
const restored={...welcoming,stationTicket:{...welcoming.stationTicket,fresh:false}};
assert.deepEqual(data(layer(drawStoryNPC,restored)),data(layer(drawStoryNPC,settled)),'non-fresh restored ticket cannot animate a welcome');assertions++;
await writeFile(resolve(folder,'greenhouse-stages.png'),await capSheet.encode('png'));
await writeFile(resolve(folder,'greenhouse-growth.png'),await growthSheet.encode('png'));
await writeFile(resolve(folder,'greenhouse-seed.png'),await seedSheet.encode('png'));
await writeFile(resolve(folder,'station-sendoff.png'),await npcSheet.encode('png'));
await writeFile(resolve(folder,'art-checks.json'),JSON.stringify({assertions,seedDetails,mothDetails,isolatedCanvas:true,browserQA:false},null,2)+'\n');
console.log(JSON.stringify({folder,assertions,seedBounds:seedDetails,npcBounds:mothDetails,isolatedCanvas:true,browserQA:false}));
