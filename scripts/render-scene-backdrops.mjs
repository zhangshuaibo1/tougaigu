// Optional vector-art inspection with a real Canvas implementation. This uses
// the actual game renderer and never writes to deployed assets or saved games.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DreamGame } from '../dist/dream-engine.js';
import { DREAM_LEVELS } from '../dist/dream-levels.js';
import { drawSceneBackdrop } from '../dist/dream-scene-backdrop.js';

const require=createRequire(import.meta.url);
const canvasPath=require.resolve('@napi-rs/canvas',{paths:[process.cwd(),process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'']});
const {createCanvas}=require(canvasPath);
const folder=resolve(process.argv[2]||'/tmp/tougaigu-scene-backdrops-v7');
await mkdir(folder,{recursive:true});
const noop=()=>{};
globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
globalThis.requestAnimationFrame=()=>1;
globalThis.cancelAnimationFrame=noop;

function renderGame(index,{season=null,width=1100,height=640,activity=false,camera=0}={}){
  const canvas=createCanvas(width,height);canvas.getBoundingClientRect=()=>({width,height});
  const game=new DreamGame(canvas);game.start({chapterIndex:index,sound:false,season:season?{id:season}:null,reducedMotion:false});
  game.body.invulnerable=0;game.visualTime=3.1;game.camera=camera;
  if(activity){game.body.x=330;game.body.y=560;game.body.grounded=true;game.toggleSoul();for(let i=0;i<70;i++)game.update(1/60);game.soul.x=245;game.soul.y=355;game.refreshCapActivity();}
  game.render();const view=game.getSceneBackdropView();game.destroy();return {canvas,view};
}
function label(c,text,x,y){c.fillStyle='#f1dec0';c.font='16px sans-serif';c.textAlign='left';c.fillText(text,x,y);}
const scenes=['station','garden','theatre','library','coast','post'];
for(const mode of ['normal','halloween','narrow']){
  const narrow=mode==='narrow',tw=narrow?390:550,th=narrow?808:344;
  const sheet=createCanvas(tw*3,th*2),s=sheet.getContext('2d');s.fillStyle='#121d2a';s.fillRect(0,0,sheet.width,sheet.height);
  for(let i=0;i<6;i++){
    const result=renderGame(i,{season:mode==='normal'?null:'halloween',width:narrow?390:1100,height:narrow?780:640});
    await writeFile(resolve(folder,`${scenes[i]}-${mode}.png`),await result.canvas.encode('png'));
    const x=i%3*tw,y=Math.floor(i/3)*th;
    s.drawImage(result.canvas,x,y+24,tw,th-24);label(s,`${scenes[i]} / ${mode}`,x+12,y+18);
  }
  await writeFile(resolve(folder,`${mode}-contact.png`),await sheet.encode('png'));
}
for(const index of [1,3,4]){
  const result=renderGame(index,{season:'halloween',width:390,height:780,activity:true});
  await writeFile(resolve(folder,`${scenes[index]}-narrow-activity.png`),await result.canvas.encode('png'));
}

function renderModule(view,t,reducedMotion){
  const canvas=createCanvas(1100,640),c=canvas.getContext('2d');drawSceneBackdrop(c,view,t,reducedMotion);return canvas;
}
for(let i=0;i<6;i++)for(const seasonId of [null,'halloween']){
  const view={sceneId:scenes[i],cameraX:387,viewport:{width:1100,top:-70,bottom:710},worldWidth:DREAM_LEVELS[i].width,palette:DREAM_LEVELS[i].theme,seasonId,litSeals:1,clearZones:[{x:665,y:285,r:78},{x:720,y:305,r:66}]};
  const before=JSON.stringify(view),a=renderModule(view,1,true),b=renderModule(view,991,true);
  if(!Buffer.from(a.data()).equals(Buffer.from(b.data())))throw new Error(`${scenes[i]}: reduced-motion drift`);
  if(JSON.stringify(view)!==before)throw new Error(`${scenes[i]}: renderer mutated view`);
}

// Overlapping protected circles must stay protected, not cancel each other.
const zones=[{x:330,y:310,r:105},{x:405,y:345,r:110}];
const testView={sceneId:'station',cameraX:0,viewport:{width:1100,top:0,bottom:640},worldWidth:2020,palette:DREAM_LEVELS[0].theme,seasonId:'halloween',litSeals:2,clearZones:zones};
const cleared=renderModule(testView,0,true).getContext('2d').getImageData(0,0,1100,640).data;
const onlyStructure=renderModule({...testView,clearZones:[{x:550,y:320,r:1100}]},0,true).getContext('2d').getImageData(0,0,1100,640).data;
let pixels=0;
for(let y=205;y<450;y++)for(let x=220;x<520;x++){
  if(!zones.some(z=>Math.hypot(x+.5-z.x,y+.5-z.y)<z.r-4))continue;
  const o=(y*1100+x)*4;
  for(let k=0;k<4;k++)if(cleared[o+k]!==onlyStructure[o+k])throw new Error('A bright detail leaked into a protected circle');
  pixels++;
}
console.log(`Rendered six chapters × normal / Halloween / narrow, plus three narrow activity views, to ${folder}`);
console.log(`12 reduced-motion/view-purity comparisons passed; ${pixels} protected pixels matched structure-only art.`);
