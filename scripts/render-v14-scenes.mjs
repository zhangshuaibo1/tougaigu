// Offline scene fixtures rendered by the production DreamGame. Direct body /
// soul placement isolates the new story states; it is not a browser playthrough
// and cannot establish HTML HUD, text-font or touch-control accessibility.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { DreamGame } from '../dist/dream-engine.js';
import { drawStoryAwakening } from '../dist/dream-awakening-art.js';

const require=createRequire(import.meta.url);
const {createCanvas}=require(require.resolve('@napi-rs/canvas',{paths:[process.cwd(),process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'']}));
const folder=resolve(process.argv[2]||'/tmp/tougaigu-v14-scenes');
await mkdir(folder,{recursive:true});
const noop=()=>{};
globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
const sizes=[['desktop',1100,640],['phone-320',320,431],['phone-390',390,595]];
const tick=(game,n)=>{for(let i=0;i<n;i++)game.update(1/60);};
const data=canvas=>Buffer.from(canvas.data());
let assertions=0;
const metrics=[],frames=new Map();

function makeGame(chapter,width,height,options={}){
  const canvas=createCanvas(width,height);canvas.getBoundingClientRect=()=>({width,height});
  const events=[],puzzles=[],game=new DreamGame(canvas,{onCapEvent:e=>events.push(e),onPuzzle:e=>puzzles.push(e)});
  game.start({chapterIndex:chapter,sound:false,...options});
  return {canvas,game,events,puzzles};
}
function placeBody(game,x=600){
  Object.assign(game.body,{x,y:560,vx:0,vy:0,grounded:true,platform:null,invulnerable:0});
  game.setInput({x:0,y:0});tick(game,15);
}
function placeSoul(game,point){Object.assign(game.soul,point,{vx:0,vy:0});game.setInput({x:0,y:0});}
function screen(game,p){return {x:(p.x-game.camera)*game.scale,y:p.y*game.scale+game.viewportOffsetY};}
function box(game,x,y,left,right,top,bottom,id){
  const a=screen(game,{x:x+left,y:y+top}),b=screen(game,{x:x+right,y:y+bottom});
  return {id,left:a.x,right:b.x,top:a.y,bottom:b.y};
}
function sceneBoxes(game){
  const out=[],body=game.body,soul=game.getSoulPresentation(),npc=game.getStoryNPCView();
  out.push(box(game,body.x,body.y,-35,35,-112,6,'body'));
  if(npc?.near)out.push(box(game,npc.x,npc.y,-46,46,-100,7,'friend'));
  if(soul?.alpha>.05){
    const size=soul.scale??1;
    out.push(box(game,soul.x,soul.y,-25*size,25*size,-36*size,32*size,'soul'));
    if(game.greenhousePlant?.phase==='held'||game.greenhousePlant?.phase==='returning')out.push(box(game,soul.x,soul.y,-12*size,12*size,5*size,21*size,'held-seed'));
  }
  if(game.cap.projection>.1&&game.capOpen>.1&&!game.options.reducedMotion)out.push(box(game,body.x+body.face*24,body.y-150,-48,48,-52,31,'cap-projection'));
  return out;
}
function overlay(canvas,name,boxes){
  const out=createCanvas(canvas.width,canvas.height),c=out.getContext('2d');c.drawImage(canvas,0,0);
  const bottom=canvas.height-(canvas.width<=640?36:110);
  c.fillStyle='#a34c6455';c.fillRect(0,0,canvas.width,150);c.fillRect(0,bottom,canvas.width,canvas.height-bottom);
  c.strokeStyle='#ffc2d0';c.lineWidth=1;c.setLineDash([5,4]);
  for(const y of [150,bottom]){c.beginPath();c.moveTo(0,y);c.lineTo(canvas.width,y);c.stroke();}
  c.setLineDash([]);c.font='10px sans-serif';c.fillStyle='#fff4dc';c.fillText(name,8,15);c.fillText('Approximate HUD protection / 150 CSS px',8,139);
  for(const b of boxes){
    c.strokeStyle=b.left>=0&&b.right<=canvas.width&&b.top>=150&&b.bottom<=bottom?'#a9f8d6':'#ffb57f';
    c.strokeRect(b.left,b.top,b.right-b.left,b.bottom-b.top);
  }
  return out;
}
async function capture(game,canvas,name,{extraBoxes=[]}={}){
  game.render();const before=data(canvas);game.render();assert.deepEqual(data(canvas),before,'repeated renders do not alter pixels');assertions++;
  const boxes=[...sceneBoxes(game),...extraBoxes],safeBottom=canvas.height-(canvas.width<=640?36:110);
  const record={name,width:canvas.width,height:canvas.height,scale:game.scale,camera:game.camera,offsetY:game.viewportOffsetY,
    phase:game.greenhousePlant?.phase??game.firstTicket?.phase,stage:game.greenhousePlant?.stage??null,
    growth:game.capScene.greenhouse??null,greeting:game.stationGreeting?.greeting,cap:game.cap.phase,projection:game.cap.projection,
    boxes:boxes.map(b=>({...b,withinCanvas:b.left>=0&&b.right<=canvas.width&&b.top>=0&&b.bottom<=canvas.height,withinProtection:b.left>=0&&b.right<=canvas.width&&b.top>=150&&b.bottom<=safeBottom}))};
  metrics.push(record);
  await writeFile(resolve(folder,name+'.png'),await canvas.encode('png'));
  await writeFile(resolve(folder,name+'-qa.png'),await overlay(canvas,name,boxes).encode('png'));
  // Detach the contact-sheet snapshot. Some native Canvas backends defer a
  // drawImage of a mutable canvas until that destination is encoded.
  const copy=createCanvas(canvas.width,canvas.height);copy.getContext('2d').putImageData(canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height),0,0);frames.set(name,copy);
}
function pauseCheck(game,canvas,description){
  game.pause();game.render();const pixels=data(canvas),state=structuredClone({time:game.time,visualTime:game.visualTime,plant:game.greenhousePlant,greeting:game.stationGreeting,cap:game.cap,presented:game.getSoulPresentation()});
  tick(game,120);game.render();
  assert.deepEqual(data(canvas),pixels,description+' paused pixels');
  assert.deepEqual({time:game.time,visualTime:game.visualTime,plant:game.greenhousePlant,greeting:game.stationGreeting,cap:game.cap,presented:game.getSoulPresentation()},state,description+' paused state');assertions+=2;
  game.resume();
}
function openForLook(game){
  assert.equal(game.toggleSoul(),true);assertions++;
  placeSoul(game,{x:game.body.x+85,y:420});tick(game,75);
}
function collect(game,index){
  placeSoul(game,game.memories[index]);tick(game,3);
  assert.equal(game.memories[index].collected,true);assertions++;
}
function answerLamp(fixture,index){
  const {game,puzzles}=fixture;
  placeSoul(game,game.lanterns[index]);tick(game,2);
  assert.equal(game.pulse(),true);assert.equal(game.state,'paused');assert.equal(puzzles.at(-1).sealIndex,index);
  assert.equal(game.resolvePuzzle(true),true);assert.equal(game.lanterns[index].lit,true);assertions+=5;
}
function greenhouseLayoutCheck(game,canvas,mode){
  const view=game.getStoryAwakeningViews().find(v=>v.sealIndex===0),bounds=view.bounds;
  const garden={x:game.body.x+game.body.face*24,y:game.body.y-150,r:60};
  assert.ok(view.clearZones.some(z=>z.x===garden.x&&z.y===garden.y&&z.r===garden.r),'the first flower has a protected projection circle');
  const a=screen(game,{x:bounds.left,y:bounds.top}),b=screen(game,{x:bounds.right,y:bounds.bottom});
  assert.ok(a.x>=0&&b.x<=canvas.width&&a.y>=150&&b.y<=canvas.height-(canvas.width<=640?36:110),'the willow remains inside the HUD-safe viewport');
  const nearX=Math.max(bounds.left,Math.min(bounds.right,garden.x)),nearY=Math.max(bounds.top,Math.min(bounds.bottom,garden.y));
  assert.ok(Math.hypot(nearX-garden.x,nearY-garden.y)>=garden.r,'the fixed willow bounds no longer overlap the garden');
  const layer=createCanvas(canvas.width,canvas.height),c=layer.getContext('2d');
  c.setTransform(game.scale,0,0,game.scale,-game.camera*game.scale,game.viewportOffsetY);drawStoryAwakening(c,view);
  const pixels=layer.data(),center=screen(game,garden),radius=54*game.scale;let ink=0,inside=0;
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(pixels[(y*canvas.width+x)*4+3]>5){
    ink++;if((x+.5-center.x)**2+(y+.5-center.y)**2<radius**2)inside++;
  }
  assert.ok(ink>80,'the willow stays visibly present, rather than being entirely clipped');
  assert.equal(inside,0,'the production willow painter leaves the miniature flower region empty');assertions+=5;
  metrics.push({name:`${mode}-greenhouse-layout-proof`,willowAnchor:view.anchor,willowBounds:view.bounds,garden,inkPixels:ink,gardenIntrusionPixels:inside,screenBounds:{left:a.x,top:a.y,right:b.x,bottom:b.y}});
}

for(const [mode,width,height] of sizes){
  const station=makeGame(0,width,height),sg=station.game,sc=station.canvas;
  tick(sg,33);await capture(sg,sc,`${mode}-station-waiting`);
  sg.toggleSoul();tick(sg,45);collect(sg,0);tick(sg,12);
  assert.equal(sg.firstTicket.phase,'held');assert.equal(sg.stationGreeting.greeting,'notice');assertions+=2;
  await capture(sg,sc,`${mode}-station-held`);pauseCheck(sg,sc,'station held');
  sg.recall();tick(sg,12);
  assert.equal(sg.firstTicket.phase,'returning');const returned=sg.getSoulPresentation();
  assert.deepEqual(sg.getStoryNPCView().look,{x:returned.x,y:returned.y});assertions+=2;
  await capture(sg,sc,`${mode}-station-returning`);pauseCheck(sg,sc,'station return');
  tick(sg,17);assert.equal(sg.firstTicket.phase,'stowed');assert.equal(sg.stationGreeting.greeting,'welcome');assertions+=2;
  tick(sg,33);await capture(sg,sc,`${mode}-station-welcome`);pauseCheck(sg,sc,'station welcome');
  tick(sg,60);assert.equal(sg.stationGreeting.greeting,'settled');assertions++;
  await capture(sg,sc,`${mode}-station-settled`);
  sg.setReducedMotion(true);sg.toggleSoul();tick(sg,8);sg.recall();
  assert.equal(sg.stationGreeting.greeting,'settled');assert.equal(sg.cap.phase,'closed');assertions+=2;
  await capture(sg,sc,`${mode}-station-reduced`);pauseCheck(sg,sc,'station reduced');sg.destroy();

  const fixture=makeGame(1,width,height,{firstTicketCollected:true}),{game,canvas,events}=fixture;
  placeBody(game);openForLook(game);
  assert.deepEqual(game.capScene.greenhouse,{pot:'ticket',stage:0,fromStage:0,progress:1});assertions++;
  await capture(game,canvas,`${mode}-greenhouse-0-empty`);
  game.recall();tick(game,48);game.toggleSoul();tick(game,42);
  placeSoul(game,{x:850,y:350});tick(game,30);
  const seed=game.memories[1];
  await capture(game,canvas,`${mode}-greenhouse-boot`,{extraBoxes:[box(game,seed.x,seed.y,-29,30,-29,23,'old-boot')]});
  collect(game,1);tick(game,12);
  assert.equal(game.greenhousePlant.phase,'held');assert.equal(game.greenhousePlant.stage,0);assertions+=2;
  await capture(game,canvas,`${mode}-greenhouse-held`);pauseCheck(game,canvas,'greenhouse held');
  game.recall();const trajectory=[];
  for(let i=1;i<=29;i++){
    tick(game,1);const shown=game.getSoulPresentation();
    if(shown?.alpha>.05){const p=screen(game,shown);trajectory.push({frame:i,x:p.x,y:p.y,top:p.y-36*shown.scale*game.scale,left:p.x-25*shown.scale*game.scale,right:p.x+25*shown.scale*game.scale});}
    if(i===12){await capture(game,canvas,`${mode}-greenhouse-returning`);pauseCheck(game,canvas,'greenhouse return');}
  }
  metrics.push({name:`${mode}-greenhouse-return-trajectory`,width,height,points:trajectory,minTop:Math.min(...trajectory.map(p=>p.top))});
  assert.equal(game.greenhousePlant.phase,'planted');assert.equal(game.greenhousePlant.stage,1);assertions+=2;
  tick(game,30);const heldAge=game.greenhousePlant.growthAge;tick(game,90);
  assert.equal(game.greenhousePlant.growthAge,heldAge,'closed cap holds its growth age');assertions++;
  openForLook(game);assert.equal(game.capScene.greenhouse.progress,1);assertions++;
  await capture(game,canvas,`${mode}-greenhouse-1-seed`);
  answerLamp(fixture,0);assert.equal(game.greenhousePlant.stage,2);assert.equal(game.greenhousePlant.growthAge,0);assertions+=2;
  tick(game,18);pauseCheck(game,canvas,'greenhouse leaf unfolding');game.recall();tick(game,48);
  openForLook(game);assert.equal(game.capScene.greenhouse.progress,1);assertions++;
  greenhouseLayoutCheck(game,canvas,mode);
  await capture(game,canvas,`${mode}-greenhouse-2-leaves`);
  game.recall();tick(game,48);placeBody(game,1850);game.toggleSoul();tick(game,42);answerLamp(fixture,1);
  assert.equal(game.greenhousePlant.stage,3);assert.equal(game.greenhousePlant.fromStage,2);assertions+=2;
  game.recall();tick(game,48);placeBody(game);openForLook(game);
  assert.equal(game.capScene.greenhouse.progress,1);assert.equal(events.filter(e=>e.type==='memory'&&e.index===1).length,1);assertions+=2;
  await capture(game,canvas,`${mode}-greenhouse-3-flower`);pauseCheck(game,canvas,'greenhouse flower');
  game.setReducedMotion(true);
  assert.equal(game.cap.projection,0);assert.equal(game.capScene.greenhouse.progress,1);assertions+=2;
  await capture(game,canvas,`${mode}-greenhouse-reduced`);pauseCheck(game,canvas,'greenhouse reduced');
  game.destroy();

  // A persisted flower is display-only: no replayed collection or this-run score.
  const restored=makeGame(1,width,height,{firstTicketCollected:true,greenhouseRecord:{memories:[1],seals:[0,1]}});
  placeBody(restored.game);openForLook(restored.game);
  assert.equal(restored.game.greenhousePlant.stage,3);assert.equal(restored.game.greenhousePlant.fromStage,3);
  assert.equal(restored.game.getSnapshot().memories,0);assert.equal(restored.events.filter(e=>e.type==='memory').length,0);assertions+=4;
  await capture(restored.game,restored.canvas,`${mode}-greenhouse-restored`);restored.game.destroy();
}

// At the real return midpoint, enabling reduced motion settles seed arrival
// and growth immediately while keeping the already-paused simulation paused.
const reduced=makeGame(1,390,595,{firstTicketCollected:true});placeBody(reduced.game);
reduced.game.toggleSoul();tick(reduced.game,45);collect(reduced.game,1);reduced.game.recall();tick(reduced.game,12);reduced.game.pause();
reduced.game.setReducedMotion(true);
assert.equal(reduced.game.state,'paused');assert.equal(reduced.game.greenhousePlant.phase,'planted');assert.equal(reduced.game.capScene.greenhouse.progress,1);assertions+=3;
pauseCheck(reduced.game,reduced.canvas,'reduced motion switched during seed return');reduced.game.destroy();

for(const [mode,width,height] of sizes){
  const names=[`${mode}-station-held`,`${mode}-station-returning`,`${mode}-station-welcome`,`${mode}-greenhouse-boot`,`${mode}-greenhouse-held`,`${mode}-greenhouse-returning`,...['0-empty','1-seed','2-leaves','3-flower'].map(s=>`${mode}-greenhouse-${s}`),`${mode}-greenhouse-reduced`];
  const unitWidth=mode==='desktop'?550:width,unitHeight=height*unitWidth/width,cols=mode==='desktop'?2:4,rows=Math.ceil(names.length/cols);
  const sheet=createCanvas(cols*unitWidth,rows*(unitHeight+24)),c=sheet.getContext('2d');c.fillStyle='#142a2e';c.fillRect(0,0,sheet.width,sheet.height);c.font='12px sans-serif';
  names.forEach((name,i)=>{const x=(i%cols)*unitWidth,y=Math.floor(i/cols)*(unitHeight+24);c.fillStyle='#f7e8ca';c.fillText(name,x+8,y+16);c.drawImage(frames.get(name),x,y+24,unitWidth,unitHeight);});
  await writeFile(resolve(folder,`${mode}-contact-sheet.png`),await sheet.encode('png'));
}
await writeFile(resolve(folder,'scene-metrics.json'),JSON.stringify({fixture:true,browserQA:false,assertions,assumptions:{hudTopCSS:150,phoneBottomCSS:36,desktopBottomCSS:110,fonts:'Executor font availability differs from the browser; Chinese labels require browser validation.'},metrics},null,2)+'\n');
console.log(JSON.stringify({folder,assertions,frames:frames.size,fixture:true,browserQA:false,returnPaths:metrics.filter(m=>m.points).map(m=>({name:m.name,minTop:m.minTop}))}));
