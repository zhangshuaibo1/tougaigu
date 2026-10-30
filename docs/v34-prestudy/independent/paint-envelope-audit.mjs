// Read-only offline geometry audit. Synthetic poses, not browser/gameplay proof.
// Raster scanning exists only in this /tmp reviewer, never in runtime source.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const root='/workspace/scratch/2b18af2db412/tougaigu-v34-framing-prestudy';
const out='/tmp/v34-framing-independent-review';
const req=createRequire(import.meta.url);
const {createCanvas}=req(req.resolve('@napi-rs/canvas',{paths:[root,process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'']}));
const mod=p=>import(pathToFileURL(root+'/'+p));
const {DreamGame}=await mod('dist/dream-engine.js');
const {getCapFramingBounds}=await mod('dist/dream-cap-framing.js');
const {FESTIVAL_VISUAL_IDS,drawOutfitHat,drawOutfitBack,getOutfitPalette}=await mod('dist/dream-festival-art.js');
const {getTravelerMotion,drawTravelerBack,drawTravelerLegs,drawTravelerCoat}=await mod('dist/dream-traveler-art.js');
const sourcePaths=['dist/dream-cap-framing.js','dist/dream-engine-base.js','dist/dream-engine.js','dist/dream-cap-art.js','dist/dream-festival-art.js','dist/dream-station-art.js','dist/dream-traveler-art.js','dist/dream-traveler-face.js','dist/dream-traveler-performance.js','dist/dream-soul-art.js','dist/dream-first-ticket-art.js','dist/dream-greenhouse-art.js'];
const sha=b=>createHash('sha256').update(b).digest('hex');
const hashes=async()=>Object.fromEntries(await Promise.all(sourcePaths.map(async p=>[p,sha(await readFile(root+'/'+p))])));
const beforeHashes=await hashes();
const noop=()=>{};globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
const gradient=()=>({addColorStop:noop});
const stub=new Proxy({createLinearGradient:gradient,createRadialGradient:gradient,measureText:s=>({width:String(s).length*8})},{get:(o,k)=>k in o?o[k]:noop});
const game=new DreamGame({getContext:()=>stub,getBoundingClientRect:()=>({width:390,height:595})});
game.start({sound:false,outfit:'halloween'});
const R=3,N=320*R,canvas=createCanvas(N,N),c=canvas.getContext('2d');
const records=[],violations=[];let rasterCount=0;
function paint(fn){
  c.resetTransform();c.clearRect(0,0,N,N);c.save();c.scale(R,R);c.lineCap='round';c.lineJoin='round';
  try{fn(c);}finally{c.restore();}
  const pixels=canvas.data();let lo=N,hi=-1,top=N,bottom=-1,count=0;
  for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(pixels[(y*N+x)*4+3]>0){lo=Math.min(lo,x);hi=Math.max(hi,x);top=Math.min(top,y);bottom=Math.max(bottom,y);count++;}
  rasterCount++;if(!count)return null;
  assert.ok(lo>1&&hi<N-2&&top>1&&bottom<N-2,'test canvas clipped a shape');
  return {left:lo/R,right:(hi+1)/R,top:top/R,bottom:(bottom+1)/R,pixels:count};
}
function check(label,expected,actual,fixture){
  if(!actual){records.push({label,fixture,empty:true,expected});return;}
  const leftOverflow=expected.left-actual.left,rightOverflow=actual.right-expected.right;
  const row={label,fixture,expected,actual,leftOverflow,rightOverflow,roundingAllowance:1/R};records.push(row);
  if(Math.max(leftOverflow,rightOverflow)>1/R+1e-8)violations.push(row);
}
const configs=[
  {name:'neutral',vx:0,vy:0,land:0,grounded:true,walk:0},
  {name:'compressed-right',vx:240,vy:0,land:.22,grounded:true,walk:2.4},
  {name:'rising-left',vx:-240,vy:-600,land:0,grounded:false,walk:1.7},
  {name:'falling-right',vx:240,vy:850,land:0,grounded:false,walk:4.2},
];
const outfits=[...FESTIVAL_VISUAL_IDS,'starlight',null];
for(const config of configs)for(const face of [-1,1])for(const open of [0,.1,.4,.75,1]){
  game.body={...game.body,...config,x:160,y:250,face,invulnerable:0};
  game.cap={...game.cap,phase:open===0?'closed':open===1?'open':'opening',openness:open,handGrip:open>0?1:0,handClasp:open>0?.25:0,handCatch:0};
  game.capOpen=open;game.form=open>0?'soul':'body';game.soul={x:205,y:150,vx:0,vy:0};game.firstTicket.phase='missing';game.greenhousePlant=null;
  const pose=game.getCharacterPresentation(1.1),fixture={state:config.name,face,open,tilt:pose.tilt,scaleY:pose.scaleY};
  for(const outfit of outfits){
    const bounds=getCapFramingBounds(pose,null,outfit);assert.ok(bounds);
    const actual=paint(ctx=>{ctx.transform(...pose.rig.capMatrix);drawOutfitHat(ctx,outfit,1.1);});
    if(outfit===null){assert.equal(bounds.hat,null);assert.equal(actual,null);records.push({label:'no-hat',fixture,empty:true});}
    else check('hat',bounds.hat,actual,{...fixture,outfit});
  }
  const bare=getCapFramingBounds(pose,null,null);
  check('cap-and-fixed-hinge',{left:Math.min(bare.cap.left,160-28),right:Math.max(bare.cap.right,160+28)},paint(ctx=>{ctx.transform(...pose.rig.headMatrix);game.drawCapLid(ctx,1.1,pose.rig,null);}),fixture);
  check('hands',bare.hands,paint(ctx=>{ctx.transform(...pose.rig.bodyMatrix);game.drawCharacterHands(ctx,pose);}),fixture);
  const head={left:Math.min(bare.left,160-28),right:Math.max(bare.right,160+28)};
  // Skull and stationary rim belong to the full entity union, not the lifted lid.
  check('skull-union',head,paint(ctx=>{ctx.transform(...pose.rig.headMatrix);game.drawSkullFront(ctx,game.body,1.1,null);game.drawStationRim(ctx);}),fixture);
  for(const t of [0,.65,1.1,1.9,2.7]){
    const p=game.getCharacterPresentation(t),bounds=getCapFramingBounds(p,null,'halloween');
    const motion=getTravelerMotion(game.body,{time:t,hop:p.hop,reducedMotion:false,performance:p.performance});
    check('clothing-and-feet',bounds.body,paint(ctx=>{ctx.transform(...p.rig.bodyMatrix);drawOutfitBack(ctx,'halloween',t,p.walking);drawTravelerBack(ctx,motion,getOutfitPalette('halloween'));drawTravelerLegs(ctx,motion);drawTravelerCoat(ctx,motion,getOutfitPalette('halloween'));}),{...fixture,t});
  }
}
// Original soul entity, including carried ticket/seed and low-energy arc. Skip
// exactly the first large decorative glow fillRect, whose exclusion is explicit
// in the product contract; all later fillRect calls (ticket art) remain original.
let soulCases=0,glowExclusions=0;
for(const vx of [-400,0,400])for(const vy of [-340,340])for(const t of [.2,1.1,2.7])for(const energy of [14,100])for(const poseName of ['free','peek','return'])for(const held of ['none','ticket','seed']){
  game.body={...game.body,x:160,y:250,face:1,vx:0,vy:0,land:0,grounded:true};game.capOpen=1;game.cap.phase='open';game.form='soul';game.energy=energy;game.emoteTime=1;
  game.firstTicket.phase=held==='ticket'?'held':'missing';game.greenhousePlant=held==='seed'?{phase:'held'}:null;
  const shown={x:160,y:150,vx,vy,pose:poseName,layer:poseName==='free'?'world':'inside',scale:poseName==='free'?1:poseName==='peek'?.36:.2,alpha:1};
  const p=game.getCharacterPresentation(t),bounds=getCapFramingBounds(p,shown,null);let skipped=0;
  const actual=paint(ctx=>{
    const wrapped=new Proxy(ctx,{get(target,key){if(key==='fillRect')return (...args)=>{if(skipped===0){assert.deepEqual(args,[shown.x-60*shown.scale,shown.y-60*shown.scale,120*shown.scale,120*shown.scale]);skipped++;return;}return target.fillRect(...args);};const value=target[key];return typeof value==='function'?value.bind(target):value;},set(target,key,value){target[key]=value;return true;}});
    game.drawSoul(wrapped,shown,t);
  });
  assert.equal(skipped,1);glowExclusions++;soulCases++;
  check('soul',bounds.soul,actual,{vx,vy,t,energy,pose:poseName,held,scale:shown.scale});
}
game.destroy();const afterHashes=await hashes();assert.deepEqual(afterHashes,beforeHashes,'reviewed source changed during offline audit');
const summary={status:violations.length?'findings':'passed',scope:'Read-only offline authored-paint envelope audit; synthetic pose fixtures; not a browser, normal-input route or deployed build',sourceRoot:root,sourceHashes:beforeHashes,sourceUnchanged:true,
  rasterScale:R,outerPixelCellRoundingWorldAllowance:1/R,hatCases:configs.length*2*5*outfits.length,noHatCases:configs.length*2*5,poseConfigs:configs,facings:[-1,1],openAmounts:[0,.1,.4,.75,1],outfits,soulCases,glowExclusions,rasterCount,recordCount:records.length,violations,
  minObservedClearance:records.filter(r=>r.actual).reduce((min,r)=>Math.min(min,-r.leftOverflow,-r.rightOverflow),Infinity),
  limits:['Finite synthetic poses and sampled clocks do not exhaust every possible authored body motion. Source control-hull review complements these raster checks.',
  'The original soul decorative glow is deliberately omitted once per draw, exactly as product envelope policy permits; entity and carried-object paint remain original.',
  'Hat and hands are checked against their own helper envelopes; clothing/feet against body; fixed hinge and skull against the entity union. Soft shadows, tether, scene projection and particles do not force framing.',
  'No per-frame pixel scan, fixture state mutation or native-canvas dependency is added to the game.'],records};
await writeFile(out+'/paint-envelope-report.json',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({status:summary.status,hatCases:summary.hatCases,soulCases,rasterCount,records:records.length,violations:violations.length,minObservedClearance:summary.minObservedClearance,sourceHashes:beforeHashes}));
if(violations.length)console.log(JSON.stringify(violations.slice(0,10)));
