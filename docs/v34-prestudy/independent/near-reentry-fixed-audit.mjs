// Read-only independent engine-method probe for the body-readable re-entry boundary.
// Mock2D render consumers. No browser, clock manipulation, pose/state injection or product mutation.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const root='/workspace/scratch/2b18af2db412/tougaigu-v34-framing-prestudy';
const out='/tmp/v34-framing-independent-review';
const paths=['dist/dream-engine-base.js','dist/dream-cap-framing.js','dist/dream-engine.js'];
const hashes=async()=>Object.fromEntries(await Promise.all(paths.map(async p=>[p,createHash('sha256').update(await readFile(root+'/'+p)).digest('hex')])));
const sourceHashes=await hashes();
const {DreamGame}=await import(pathToFileURL(root+'/dist/dream-engine.js'));
const noop=()=>{};globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
const clone=o=>JSON.parse(JSON.stringify(o));
function make(width,height){
 const ctx=new Proxy({globalAlpha:1,createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop}),measureText:t=>({width:String(t).length*8})},{get:(o,k)=>k in o?o[k]:noop});
 const g=new DreamGame({getContext:()=>ctx,getBoundingClientRect:()=>({width,height})});
 g.start({chapterIndex:0,sound:false,outfit:'halloween'});g.render();return g;
}
function record(g){const v=g.capFramingView;return {time:g.time,soul:clone(g.soul),body:{x:g.body.x,y:g.body.y},camera:g.camera,originalTarget:Math.max(0,Math.min(g.level.width-g.viewWidth,g.soul.x-.43*g.viewWidth)),scale:g.scale,viewWidth:g.viewWidth,bodyCenterFromLeftWorld:g.body.x-g.camera,activityFramed:g.activityFramed,state:g.state,form:g.form,deaths:g.deaths,energy:g.energy,framing:clone(v),leftMarginCss:v?(v.bounds.left-g.camera)*g.scale:null};}
const step=(g,n=1)=>{for(let i=0;i<n;i++){g.update(1/60);g.render();}};
function fly(g,x,y){let firstActive=null;
 for(let i=0;i<600;i++){
  const dx=x-g.soul.x,dy=y-g.soul.y;
  if(Math.hypot(dx,dy)<.05&&Math.hypot(g.soul.vx,g.soul.vy)<.1){g.setInput({x:0,y:0});step(g,24);return {steps:i,firstActive};}
  g.setInput({x:Math.max(-1,Math.min(1,dx/65)),y:Math.max(-1,Math.min(1,dy/65))});step(g);
  if(!firstActive&&g.capFramingView?.active)firstActive=record(g);
 }throw Error('normal input did not arrive');
}
const cases=[];
for(const [width,height,target] of [[390,595,258],[390,595,266],[390,595,268],[390,595,270],[390,595,275],[390,595,278],[390,595,282],[320,431,278]]){
 const g=make(width,height);g.toggleSoul();step(g,44);fly(g,258,422);step(g,90);assert.ok(g.capFramingView.active);const initial=record(g);
 fly(g,480,422);step(g,120);assert.equal(g.capFramingView.active,false);const far=record(g);
 const returned=fly(g,target,422),atArrival=record(g),settle=[];
 for(let i=1;i<=300;i++){step(g);if([1,30,60,120,300].includes(i))settle.push({afterSteps:i,...record(g)});}
 const final=record(g);assert.equal(g.body.x,105);assert.equal(g.body.y,560);assert.equal(g.deaths,0);assert.equal(g.form,'soul');assert.equal(g.activityFramed,false);assert.ok(final.framing.active,'body center still visible should re-enter');assert.ok(final.leftMarginCss>=7.99,'stable complete envelope should have 8 CSS px');
 cases.push({viewport:{width,height},target,previousReadableSoulEquilibriumLimit:g.body.x-18+.43*g.viewWidth,currentReadableSoulEquilibriumLimit:g.body.x+.43*g.viewWidth,initial,far,returned,atArrival,settle,final});g.destroy();
}
assert.deepEqual(await hashes(),sourceHashes);
const report={status:'passed',scope:'Targeted ordinary-method near/far/re-entry boundary probe on mock2D; no browser. Post-fix targeted repetition preserves the original failing report separately.',sourceHashes,sourceUnchanged:true,cases};
await writeFile(out+'/near-reentry-fixed-report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:'passed',sourceHashes,cases:cases.map(c=>({viewport:c.viewport,target:c.target,previousEquilibriumLimit:c.previousReadableSoulEquilibriumLimit,currentEquilibriumLimit:c.currentReadableSoulEquilibriumLimit,actualX:c.final.soul.x,camera:c.final.camera,bodyCenterFromLeftWorld:c.final.bodyCenterFromLeftWorld,active:c.final.framing.active,reason:c.final.framing.reason,low:c.final.framing.low,high:c.final.framing.high,slackCss:c.final.framing.slackCss,leftMarginCss:c.final.leftMarginCss,everActiveOnReturn:!!c.returned.firstActive}))}));
