// Offline fixtures rendered through the real DreamGame. This script positions
// a test body/soul directly to inspect a scene; it is not browser playthrough
// evidence and does not validate the HTML HUD or touch hit areas.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { DreamGame } from '../dist/dream-engine.js';
import { MOON_PLAY_CONFIG, solveMoonSource } from '../dist/dream-moon-play.js';

const require=createRequire(import.meta.url);
const {createCanvas}=require(require.resolve('@napi-rs/canvas',{paths:[process.cwd(),process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'']}));
const folder=resolve(process.argv[2]||'/tmp/tougaigu-v13-scenes');
await mkdir(folder,{recursive:true});
const noop=()=>{};
globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
const sizes=[['desktop',1100,640],['phone-320',320,431],['phone-390',390,595]];
const tick=(game,seconds)=>{for(let i=0;i<Math.ceil(seconds*60);i++)game.update(1/60);};
const metrics=[];
let assertions=0;
function makeGame(chapter,width,height){
  const canvas=createCanvas(width,height);canvas.getBoundingClientRect=()=>({width,height});
  const asked=[],game=new DreamGame(canvas,{onPuzzle:event=>asked.push(event)});
  game.start({chapterIndex:chapter,sound:false,season:{id:'halloween'},outfit:'halloween'});
  return {canvas,game,asked};
}
function screen(game,p){return {x:(p.x-game.camera)*game.scale,y:p.y*game.scale+game.viewportOffsetY};}
function targetBox(game,target){
  const a=screen(game,{x:target.x-36,y:target.y-35}),b=screen(game,{x:target.x+36,y:target.y+57});
  return {left:a.x,top:a.y,right:b.x,bottom:b.y};
}
function overlay(game,canvas,label,boxes=[]){
  const out=createCanvas(canvas.width,canvas.height),c=out.getContext('2d');c.drawImage(canvas,0,0);
  const bottom=canvas.height-(canvas.width<=640?36:110);
  c.fillStyle='#b24c6670';c.fillRect(0,0,canvas.width,150);c.fillRect(0,bottom,canvas.width,canvas.height-bottom);
  c.strokeStyle='#ffb3c4';c.lineWidth=1;c.setLineDash([5,4]);
  for(const y of [150,bottom]){c.beginPath();c.moveTo(0,y);c.lineTo(canvas.width,y);c.stroke();}
  c.setLineDash([]);c.font='10px sans-serif';c.fillStyle='#ffffff';c.fillText(label,8,14);c.fillText('Approx. 150px HUD protection',8,139);
  for(const box of boxes){c.strokeStyle=box.top>=150&&box.bottom<=bottom?'#9af2c1':'#ffad78';c.strokeRect(box.left,box.top,box.right-box.left,box.bottom-box.top);}
  return out;
}
async function capture(game,canvas,name,{boxes=[]}={}){
  game.render();
  await writeFile(resolve(folder,name+'.png'),await canvas.encode('png'));
  await writeFile(resolve(folder,name+'-qa.png'),await overlay(game,canvas,name,boxes).encode('png'));
}
function placeSoul(game,p){Object.assign(game.soul,p,{vx:0,vy:0});game.setInput({x:0,y:0});}
function viewport(game){return {scale:game.scale,offsetY:game.viewportOffsetY,camera:game.camera,viewWidth:game.viewWidth,moonFramed:game.moonFramed};}

for(const [mode,width,height] of sizes){
  const {canvas,game,asked}=makeGame(2,width,height);
  // Deliberate offline fixture: do not call this a crossed-platform playthrough.
  Object.assign(game.body,MOON_PLAY_CONFIG.anchor,{grounded:true,vx:0,vy:0,invulnerable:0});tick(game,.2);
  await capture(game,canvas,`${mode}-moon-approach`);
  assert.equal(game.toggleSoul(),true);tick(game,.8);assertions++;
  for(let variant=0;variant<3;variant++){
    const spec=MOON_PLAY_CONFIG.variants[variant];assert.equal(game.moonPlay.variant,variant);assertions++;
    const source=solveMoonSource(spec.targets[0],MOON_PLAY_CONFIG.angles[0]);
    placeSoul(game,source);tick(game,.2);
    await capture(game,canvas,`${mode}-moon-${variant}-holding`);
    for(const target of spec.targets){
      placeSoul(game,solveMoonSource(target,MOON_PLAY_CONFIG.angles[0]));tick(game,1.45);
    }
    assert.equal(game.moonPlay.complete,true);assertions++;
    // A centered source keeps the solved scenery and Ashi in one stable frame.
    placeSoul(game,{x:1460,y:465});tick(game,.15);game.render();
    const boxes=spec.targets.map(target=>({...targetBox(game,target),id:target.id}));
    const bottom=height-(width<=640?36:110),body=screen(game,game.body);
    const record={mode,scene:spec.id,...viewport(game),body,boxes,safeTop:150,safeBottom:bottom,
      targetsWithinProtection:boxes.every(box=>box.left>=0&&box.right<=width&&box.top>=150-.5&&box.bottom<=bottom+.5),
      bodyWithinProtection:body.y<=bottom+.5};
    metrics.push(record);
    await capture(game,canvas,`${mode}-moon-${variant}-complete`,{boxes});
    const before=Buffer.from(canvas.data());game.pause();game.render();
    const frozen=Buffer.from(canvas.data());tick(game,2);game.render();
    assert.deepEqual(Buffer.from(canvas.data()),frozen,'paused scene has identical pixels across further simulation attempts');assertions++;
    // One pause transition may hide a Q affordance. The scenery remains lit.
    assert.equal(game.moonPlay.getView().targets.every(target=>target.lit),true);assertions++;
    game.resume();
    if(variant<2){assert.equal(game.recall(),true);tick(game,.8);assert.equal(game.interact(),true);assert.equal(game.toggleSoul(),true);tick(game,.8);assertions+=3;}
  }
  // Approach the existing second story lamp using the real update/framing path.
  const lamp=game.lanterns[1];placeSoul(game,{x:lamp.x-110,y:lamp.y});tick(game,.05);game.render();
  assert.equal(game.moonFramed,false,'normal story-lamp interaction takes priority before reaching the lamp');assertions++;
  let lampScreen=screen(game,lamp),soulScreen=screen(game,game.soul);
  assert.ok(lampScreen.x>0&&lampScreen.x<width,'the story lamp stays visible after framing releases');assertions++;
  metrics.push({mode,scene:'story-lamp-release',...viewport(game),lamp:lampScreen,soul:soulScreen});
  await capture(game,canvas,`${mode}-story-lamp-release`);
  placeSoul(game,lamp);tick(game,.05);assert.equal(game.interact(),true);assert.equal(asked.at(-1)?.sealIndex,1);assertions+=2;
  game.resolvePuzzle(false);game.destroy();

  const station=makeGame(0,width,height),sg=station.game,cv=station.canvas;
  tick(sg,1.1);await capture(sg,cv,`${mode}-ticket-before`);
  assert.equal(sg.toggleSoul(),true);tick(sg,.8);placeSoul(sg,sg.memories[0]);tick(sg,.05);
  assert.equal(sg.firstTicket.phase,'held');assertions++;
  await capture(sg,cv,`${mode}-ticket-held`);
  const heldPose=sg.getSoulPresentation();
  metrics.push({mode,scene:'ticket-held',...viewport(sg),ticketPhase:sg.firstTicket.phase,soul:screen(sg,heldPose),body:screen(sg,sg.body)});
  assert.equal(sg.recall(),true);tick(sg,.2);assert.equal(sg.firstTicket.phase,'returning');assertions++;
  await capture(sg,cv,`${mode}-ticket-returning`);
  tick(sg,.65);assert.equal(sg.firstTicket.phase,'stowed');assert.equal(sg.capScene.firstTicket,true);assertions+=2;
  assert.equal(sg.toggleSoul(),true);tick(sg,.75);await capture(sg,cv,`${mode}-ticket-reopened`);
  assert.equal(sg.getSnapshot().memories,1);assertions++;
  // The enlarged head projection is temporary; the ticket remains in the cap.
  tick(sg,1.8);assert.equal(sg.capScene.firstTicket,true);await capture(sg,cv,`${mode}-ticket-kept`);assertions++;
  sg.destroy();
}
await writeFile(resolve(folder,'scene-metrics.json'),JSON.stringify({fixture:true,browserQA:false,assumptions:{hudTopCSS:150,phoneBottomCSS:36,desktopBottomCSS:110},assertions,metrics},null,2)+'\n');
const failed=metrics.filter(row=>row.targetsWithinProtection===false||row.bodyWithinProtection===false);
console.log(JSON.stringify({folder,assertions,sceneMetrics:metrics.length,protectionWarnings:failed.map(row=>({mode:row.mode,scene:row.scene,targets:row.targetsWithinProtection,body:row.bodyWithinProtection})),fixture:true,browserQA:false}));
