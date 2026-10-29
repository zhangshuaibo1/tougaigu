// Offline production Canvas inspection, never a browser or physical-device test.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drawStoryNPC, STORY_NPC_BOUNDS } from '../dist/dream-encounter-art.js';
import { getStoryNPC } from '../dist/dream-encounters.js';
import { DreamGame } from '../dist/dream-engine.js';

const require=createRequire(import.meta.url);
const {createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.cwd(),process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'']}));
const folder=resolve(process.argv[2]||'/tmp/tougaigu-v18-keeper');await mkdir(folder,{recursive:true});
const noop=()=>{};
globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
const bytes=canvas=>Buffer.from(canvas.data());
let checks=0;
const equal=(a,b,why)=>{assert.deepEqual(a,b,why);checks++;};
const check=(value,why)=>{assert.ok(value,why);checks++;};
const config=getStoryNPC(1);
const poses=['idle','look-left','look-right','talk','open'];
function view(kind){return {...config,x:70,y:140,name:'',form:kind==='open'?'soul':'body',near:kind!=='idle',talking:kind==='talk',capOpen:kind==='open',look:{x:kind==='look-right'?210:-50,y:kind==='open'?-20:90}};}
function layer(kind,time=2.4,reduced=false){const canvas=createCanvas(140,150);drawStoryNPC(canvas.getContext('2d'),view(kind),time,reduced);return canvas;}
const sheet=createCanvas(5*300,600),ctx=sheet.getContext('2d');
ctx.fillStyle='#1d3737';ctx.fillRect(0,0,sheet.width,sheet.height);
ctx.font='14px sans-serif';ctx.fillStyle='#ead8b8';ctx.fillText('Mr. Gui: production size (top), 3x inspection (bottom)',16,24);
for(const [i,kind]of poses.entries()){
  const x=i*300,original=layer(kind),reference=JSON.stringify(view(kind));
  ctx.fillText(kind,x+18,54);ctx.drawImage(original,x+80,65);
  const enlarged=view(kind);enlarged.look={x:enlarged.look.x-enlarged.x,y:enlarged.look.y-enlarged.y};enlarged.x=0;enlarged.y=0;
  ctx.save();ctx.translate(x+150,560);ctx.scale(3,3);drawStoryNPC(ctx,enlarged,2.4);ctx.restore();
  for(const time of [0,.8,2.4,4.1,8]){
    const sampled=view(kind),canvas=createCanvas(140,150);drawStoryNPC(canvas.getContext('2d'),sampled,time);
    equal(bytes(canvas),bytes(layer(kind,time)),'same view/time is pixel deterministic');
    equal(JSON.stringify(sampled),reference,'painting does not mutate the supplied view');
    const data=canvas.data();let left=140,right=-1,top=150,bottom=-1;
    for(let y=0;y<150;y++)for(let xx=0;xx<140;xx++)if(data[(y*140+xx)*4+3]){left=Math.min(left,xx);right=Math.max(right,xx);top=Math.min(top,y);bottom=Math.max(bottom,y);}
    check(left>=70+STORY_NPC_BOUNDS.left&&right<70+STORY_NPC_BOUNDS.right&&top>=140+STORY_NPC_BOUNDS.top&&bottom<140+STORY_NPC_BOUNDS.bottom,'all poses remain inside the original NPC visual bounds');
  }
  equal(bytes(layer(kind,0,true)),bytes(layer(kind,99,true)),'reduced motion ignores time');
}
check(!bytes(layer('idle',0,true)).equals(bytes(layer('open',0,true))),'opening the cap has a readable settled pose in reduced motion');
await writeFile(resolve(folder,'keeper-poses.png'),await sheet.encode('png'));

const caller=createCanvas(180,180).getContext('2d');caller.translate(3,7);caller.scale(.8,.8);caller.globalAlpha=.61;caller.lineWidth=6;caller.strokeStyle='#123456';caller.fillStyle='#654321';
const before=JSON.stringify([caller.getTransform().toString(),caller.globalAlpha,caller.lineWidth]);
drawStoryNPC(caller,view('open'),2.4);equal(JSON.stringify([caller.getTransform().toString(),caller.globalAlpha,caller.lineWidth]),before,'caller Canvas transform, alpha and width are restored');
const control=createCanvas(180,180).getContext('2d');control.translate(3,7);control.scale(.8,.8);control.globalAlpha=.61;control.lineWidth=6;control.strokeStyle='#123456';control.fillStyle='#654321';
for(const c of [caller,control]){c.fillRect(150,10,12,20);c.beginPath();c.moveTo(165,10);c.lineTo(165,30);c.stroke();}
equal(Buffer.from(caller.getImageData(120,10,20,25).data),Buffer.from(control.getImageData(120,10,20,25).data),'caller actual fill and stroke paints are restored (Canvas getters can be stale)');

const frames=[];
for(const [label,width,height]of [['desktop',1100,640],['phone-390',390,595],['phone-320',320,431]]){
  const canvas=createCanvas(width,height);canvas.getBoundingClientRect=()=>({width,height});
  const game=new DreamGame(canvas,{}, {loadImage:src=>loadImage(fileURLToPath(src))});
  game.start({chapterIndex:1,sound:false});await game.greenhouseScenes.request({mode:'story',chapterIndex:1});
  for(let i=0;i<100;i++)game.update(1/60);
  game.render();check(game.greenhousePaintedFrame,'whole-scene fixture uses the decoded production greenhouse');
  await writeFile(resolve(folder,`${label}-idle.png`),await canvas.encode('png'));frames.push(`${label}-idle.png`);
  check(game.toggleSoul(),'whole-scene open pose uses the real cap input');for(let i=0;i<60;i++)game.update(1/60);
  game.render();await writeFile(resolve(folder,`${label}-open.png`),await canvas.encode('png'));frames.push(`${label}-open.png`);
  game.pause();game.render();const paused=bytes(canvas);for(let i=0;i<90;i++)game.update(1/60);game.render();equal(bytes(canvas),paused,'paused production scene and friend remain frozen');
  game.destroy();
}
await writeFile(resolve(folder,'keeper-report.json'),JSON.stringify({checks,frames,productionRenderer:true,browserQA:false},null,2)+'\n');
console.log(JSON.stringify({folder,checks,frames,productionRenderer:true,browserQA:false}));
