// Offline sensitivity check for browser-smoke.py drive_to's digital one-axis
// policy. No browser/IPC latency is measured or claimed by this simulation.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../../',import.meta.url)),output=resolve(process.argv[2]||'/tmp/tougaigu-v27-digital-coast.json');
const require=createRequire(import.meta.url),{createCanvas}=require(require.resolve('@napi-rs/canvas',{paths:[root,process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'']}));
const noop=()=>{};globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
const {DreamGame}=await import(pathToFileURL(resolve(root,'dist/dream-engine.js')));
const baseline=JSON.parse(await readFile(resolve(root,'docs/v27-baseline/desktop/route-report.json'),'utf8'));
const tape=JSON.parse(await readFile(resolve(root,'docs/v27-baseline/desktop/input-tape.json'),'utf8')).steps;
const results=[];
for(const sampleSeconds of [.03,.06,.09]){
  const c=createCanvas(1100,640);c.getBoundingClientRect=()=>({width:1100,height:640});
  const game=new DreamGame(c,{onPuzzle:noop,onTalk:noop});
  for(const s of tape){game[s.method](...s.args);if(s.method==='pulse'&&s.update===baseline.freezes[0].update)break;}
  assert.equal(game.hazards[0].frozen,4.5);const began=game.time,frames=[],clearances=[];let remainder=0;
  const snapshot=()=>({time:game.time,form:game.form,body:{x:game.body.x,y:game.body.y,vx:game.body.vx},soul:{...game.soul},deaths:game.deaths,freeze:game.hazards.map(h=>h.frozen)});
  function step(){remainder+=sampleSeconds;while(remainder+1e-10>=1/60){remainder-=1/60;game.update(1/60);
    for(const index of [0,1]){const h=game.hazards[index],right=h.x+Math.sin(h.swing)*h.length+h.r+game.body.w/2;if(game.body.x>right&&!clearances.some(c=>c.index===index))clearances.push({index,bodyX:game.body.x,time:game.time,remainingFreeze:h.frozen});}
  }}
  function drive(x,y=null){
    const end=game.time+10;
    while(game.time<end){const a=game.form==='soul'?game.soul:game.body,dx=x-a.x,dy=y===null?0:y-a.y;
      if(Math.abs(dx)<=12&&Math.abs(dy)<=12&&Math.abs(a.vx)<40&&(y===null||Math.abs(a.vy)<40)){game.setInput({x:0,y:0});return;}
      const px=a.x+(game.form==='soul'?a.vx/7:a.vx*Math.abs(a.vx)/3300),py=a.y+a.vy/7,ex=x-px,ey=y===null?0:y-py;
      const input={x:0,y:0};if(Math.abs(ey)>12&&Math.abs(ey)>Math.abs(ex))input.y=Math.sign(ey);else if(Math.abs(ex)>12)input.x=Math.sign(ex);
      game.setInput(input);step();frames.push({input,...snapshot()});if(game.deaths)throw Error('digital policy respawn');
    }
    throw Error('digital policy timeout');
  }
  const result={sampleSeconds,scope:sampleSeconds===.03?'Ideal 30ms policy sampling, no browser command overhead':'Sensitivity only: slower simulated sampling, not a measurement of browser overhead',start:snapshot(),status:'running'};
  try{drive(1100,420);result.atSecondPulse=snapshot();assert.equal(game.pulse(),true);assert.equal(game.hazards[1].frozen,4.5);result.afterSecondPulse=snapshot();assert.equal(game.recall(),true);drive(1400);assert.equal(game.deaths,0);assert.equal(clearances.length,2);assert.ok(clearances.every(c=>c.remainingFreeze>0));result.status='passed';}
  catch(error){result.status='failed';result.error=error.stack;}
  result.elapsed=game.time-began;result.final=snapshot();result.clearances=clearances;result.frames=frames;results.push(result);game.destroy();
}
const source=await readFile(resolve(root,'scripts/browser-smoke.py'));
const report={scope:'Isolated offline digital-policy check after the immutable v26 input tape naturally reaches its first normal pendulum pulse. No state/position/hazard assignments; sample intervals are simulated, not measured browser latency.',browserDriverSha256:createHash('sha256').update(source).digest('hex'),results};
await mkdir(resolve(output,'..'),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output,results:results.map(r=>({sampleSeconds:r.sampleSeconds,status:r.status,flightSeconds:r.atSecondPulse?.time-r.start.time,firstRemainingAtSecondPulse:r.atSecondPulse?.freeze[0],clearances:r.clearances,error:r.error}))}));
if(results[0].status!=='passed')process.exitCode=1;
