// Explicit offline input comparison against an unmodified checkout, not browser
// or public-site evidence. The original fixture path is supplied by the caller.
import assert from 'node:assert/strict';
import {writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const original=resolve(process.argv[2]),output=resolve(process.argv[3]);
const root=fileURLToPath(new URL('../../',import.meta.url));
const noop=()=>{};globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
const {DreamGame:NewGame}=await import(new URL('../../dist/dream-engine.js',import.meta.url));
const {DreamGame:OldGame}=await import(pathToFileURL(resolve(original,'dist/dream-engine.js')));
const originalCommit=execFileSync('git',['-C',original,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
assert.equal(originalCommit,'1d63072bb9a27690ed14b15d3103c6e8a87fa297');
const hash=b=>createHash('sha256').update(b).digest('hex');
const facts=g=>({body:g.body,soul:g.soul,companion:g.companion,cap:g.cap,form:g.form,state:g.state,input:g.input,
  time:g.time,visualTime:g.visualTime,energy:g.energy,runId:g.runId,deaths:g.deaths,memories:g.memories,lanterns:g.lanterns,
  checkpoint:g.checkpoint,movers:g.movers,hazards:g.hazards,pads:g.pads,firstTicket:g.firstTicket,
  capScene:g.capScene,level:g.level,snapshot:g.getSnapshot()});
function make(Class,width,height,chapterIndex){
  let dimensions={width,height};const events=[];
  const c=new Proxy({globalAlpha:1,createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop}),measureText:t=>({width:String(t).length*8})},{get:(o,k)=>k in o?o[k]:noop});
  const game=new Class({getContext:()=>c,getBoundingClientRect:()=>dimensions},{onEvent:e=>events.push(e),onCapEvent:e=>events.push(e)});
  game.start({chapterIndex,sound:false,outfit:'halloween'});game.render();
  return {game,events,resize(width,height){dimensions={width,height};game.resize();}};
}
const report={scope:'Normal deterministic public game methods on two independent offline instances; 12 bounded chapter/size routes, not complete chapters or browser inputs',originalCommit,status:'running',cases:[]};
try{
  for(let chapter=0;chapter<6;chapter++)for(const [width,height]of[[320,431],[390,595]]){
    const a=make(NewGame,width,height,chapter),b=make(OldGame,width,height,chapter),tape=[],samples=[];
    const newHash=createHash('sha256'),oldHash=createHash('sha256');let checks=0;
    const equal=()=>{const left=JSON.stringify(facts(a.game)),right=JSON.stringify(facts(b.game));assert.equal(left,right);newHash.update(left);oldHash.update(right);assert.deepEqual(a.events,b.events);checks++;};
    const act=(frame,method,...args)=>{tape.push({frame,method,args});assert.deepEqual(a.game[method](...args),b.game[method](...args));equal();};
    for(let frame=0;frame<180;frame++){
      if(frame===0)act(frame,'setInput',{x:1,y:0});if(frame===25||frame===85)act(frame,'setInput',{x:0,y:0});
      if([40,105,135].includes(frame))act(frame,'toggleSoul');if([95,120,155].includes(frame))act(frame,'recall');
      if(frame===50)act(frame,'setInput',{x:.45,y:-.6});
      if(frame===134)act(frame,'setReducedMotion',true);if(frame===145)act(frame,'setReducedMotion',false);
      a.game.update(1/60);b.game.update(1/60);equal();
      // A pair of unpainted fixed steps periodically exercises a slower renderer.
      if(frame%20!==1&&frame%20!==2){a.game.render();b.game.render();equal();}
      if(frame%15===0)samples.push({frame,originalCamera:b.game.camera,camera:a.game.camera,framing:a.game.capFramingView,form:a.game.form,capPhase:a.game.cap.phase});
    }
    act(180,'toggleSoul');for(let i=0;i<44;i++){a.game.update(1/60);b.game.update(1/60);a.game.render();b.game.render();equal();}
    act(224,'pause');const frozen=JSON.stringify(facts(a.game));a.resize(width===320?390:320,width===320?595:431);b.resize(width===320?390:320,width===320?595:431);a.game.render();b.game.render();equal();assert.equal(JSON.stringify(facts(a.game)),frozen);
    const caseReport={chapter,width,height,checks,physicsSha256:newHash.digest('hex'),originalPhysicsSha256:oldHash.digest('hex'),eventsEqual:true,tape,samples};
    assert.equal(caseReport.physicsSha256,caseReport.originalPhysicsSha256);report.cases.push(caseReport);a.game.destroy();b.game.destroy();
  }
  report.status='passed';report.comparisons=report.cases.reduce((n,c)=>n+c.checks,0);
}catch(e){report.status='failed';report.error=String(e);throw e;}
finally{
  report.sourceHashes=Object.fromEntries(await Promise.all(['dist/dream-engine-base.js','dist/dream-cap-framing.js','dist/dream-engine.js'].map(async name=>[name,hash(await readFile(resolve(root,name)))])));
  await writeFile(output,JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify({status:report.status,cases:report.cases.length,comparisons:report.comparisons}));
