import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {DreamGame} from '../../dist/dream-engine.js';

// Pure engine analysis, not browser evidence. Every case starts normally at
// chapter six's authored spawn and reaches the mushroom by ordinary inputs.
// No coordinate, velocity, platform, lamp, death, save, or physics assignment.
const noop=()=>{};
globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
const ctx=new Proxy({createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop}),measureText:()=>({width:40})},{get:(o,k)=>k in o?o[k]:noop});
function makeGame(){
  const game=new DreamGame({getContext:()=>ctx,getBoundingClientRect:()=>({width:390,height:640})},{onPuzzle:noop});
  game.start({chapterIndex:5,sound:false});
  return {game,body:game.body,run:game.runId,phase:'normal-route',samples:[],commands:[],watch:false,bounce:null,landing:null};
}
function snap(c){const g=c.game;return {time:g.time,phase:c.phase,runId:g.runId,sameBody:g.body===c.body,deaths:g.deaths,state:g.state,form:g.form,
  body:{...g.body},input:{...g.input},mushroom:{...g.pads[0]}};}
function observe(c){
  assert.equal(c.game.body,c.body);assert.equal(c.game.runId,c.run);assert.equal(c.game.deaths,0);
  if(!c.watch)return;
  const s=snap(c);c.samples.push(s);
  if(!c.bounce&&s.body.vy<-800)c.bounce=s;
  if(!c.landing&&s.body.grounded&&Math.abs(s.body.y-390)<.01&&s.body.x-s.body.w/2>=1600)c.landing=s;
}
function tick(c,n=1){for(let i=0;i<n;i++){c.game.update(1/60);observe(c);}}
function set(c,x,y=0){c.game.setInput({x,y});if(c.watch)c.commands.push({time:c.game.time,phase:c.phase,x,y});}
function until(c,predicate,seconds=15){for(let i=0;i<seconds*60;i++){if(predicate())return;tick(c);}throw Error('ordinary-input condition timeout: '+c.phase);}
function steer(c,x,y=null,{poll=2,gap=0,limit=10}={}){
  let held=null;const start=c.game.time;
  function change(next){if(next===held)return;if(held){set(c,0);tick(c,gap);}held=next;
    if(held){set(c,held==='right'?1:held==='left'?-1:0,held==='down'?1:held==='up'?-1:0);tick(c,gap);}}
  try{
    while(c.game.time-start<limit){
      const g=c.game,a=g.form==='body'?g.body:g.soul,dx=x-a.x,dy=y===null?0:y-a.y;
      if(Math.abs(dx)<=12&&Math.abs(dy)<=12&&Math.abs(a.vx)<40&&(y===null||Math.abs(a.vy)<40))return;
      const ex=x-(a.x+(g.form==='soul'?a.vx/7:a.vx*Math.abs(a.vx)/3300)),ey=y===null?0:y-(a.y+a.vy/7);
      let next=null;
      if(Math.abs(ey)>12&&Math.abs(ey)>Math.abs(ex))next=ey>0?'down':'up';
      else if(Math.abs(ex)>12)next=ex>0?'right':'left';
      change(next);tick(c,poll);
    }
    throw Error('steer timeout '+x);
  }finally{change(null);}
}
function settle(c){set(c,0);until(c,()=>c.game.body.grounded&&Math.abs(c.game.body.vx)<.001,3);}
function reachShelf(c){
  const g=c.game;
  steer(c,430);settle(c);assert(g.plateState.get('letter'));
  assert(g.toggleSoul());steer(c,225,420);assert(g.memories[0].collected);
  steer(c,700,270);assert(g.pulse());assert.equal(g.pendingSeal,0);assert(g.resolvePuzzle(true));assert(g.lanterns[0].lit);
  assert(g.recall());tick(c,70);steer(c,760);settle(c);assert(g.jump());
  until(c,()=>g.body.grounded&&Math.abs(g.body.y-465)<.01,3);
  steer(c,845);settle(c);until(c,()=>g.movers[0].x<=850&&g.movers[0].dx>0);
  set(c,1);until(c,()=>g.body.platform==='last-stage',3.8);settle(c);
  tick(c,Math.ceil(9.05*60));assert(g.body.platform==='last-stage');
  assert(g.toggleSoul());steer(c,1100,305);assert(g.memories[1].collected);
  assert(g.recall());tick(c,70);until(c,()=>g.movers[0].x>=1120&&g.movers[0].dx>0);
  assert(g.jump());steer(c,1280);until(c,()=>g.body.grounded&&Math.abs(g.body.y-465)<.01,3);
  assert.equal(g.body.platform,null);assert.equal(g.deaths,0);assert.equal(g.memories.filter(m=>m.collected).length,2);
  c.watch=true;c.phase='approach-1420';observe(c);
}
export function run(kind,config){
  const c=makeGame();let outcome,error,holdStart,releaseDecision,releaseInput;
  try{
    reachShelf(c);
    steer(c,1420,null,{...config,limit:6});
    if(kind==='old'){
      c.phase='approach-1440';steer(c,1440,null,{...config,limit:5});
      c.phase='focus-and-protocol';tick(c,config.handoff);
      c.phase='final-bounce-hold';holdStart=snap(c);
      if(!c.bounce){set(c,1);until(c,()=>!!c.bounce,2.8);set(c,0);}
      c.phase='release-and-reacquire';tick(c,config.handoff);
      c.phase='steer-root';steer(c,1680,null,{...config,limit:6});
      until(c,()=>c.game.body.grounded&&Math.abs(c.game.body.y-390)<.01,1.8);
    }else{
      c.phase='settle-safe-before-mushroom';settle(c);
      assert(c.game.body.x<1450&&c.game.body.grounded&&Math.abs(c.game.body.y-560)<.01&&!c.bounce);
      // All setup delays occur before this one continuous direction input.
      tick(c,config.handoff);c.phase='one-continuous-right';holdStart=snap(c);set(c,1);
      const ready=()=>kind==='continuous-release'?c.bounce&&c.game.body.x>=1660&&c.game.body.y<=390:!!c.landing;
      while(c.game.time-holdStart.time<6&&!ready()){
        tick(c,config.poll);
        if(!c.bounce&&c.game.time-holdStart.time>=2.8)throw Error('strict bounce deadline');
      }
      assert(c.bounce&&c.bounce.time-holdStart.time<2.8&&ready());releaseDecision=snap(c);
      // Model the dispatch completing after a bounded protocol return delay.
      tick(c,config.gap);releaseInput=snap(c);set(c,0);
      until(c,()=>c.game.body.grounded&&Math.abs(c.game.body.vx)<.001,Math.max(0,6-(c.game.time-holdStart.time)));
      assert(c.game.body.grounded&&Math.abs(c.game.body.y-390)<.01);
    }
    outcome='root-landed';
  }catch(e){outcome='failed';error=e.message;}
  const result={kind,config,outcome,error,holdStart,releaseDecision,releaseInput,bounce:c.bounce,landing:c.landing,final:snap(c),
    bounceBeforeFinalHold:!!(holdStart&&c.bounce&&c.bounce.time<holdStart.time),
    secondsHoldToBounce:holdStart&&c.bounce?c.bounce.time-holdStart.time:null,
    secondsHoldToLanding:holdStart&&c.landing?c.landing.time-holdStart.time:null,
    commands:c.commands,samples:c.samples};
  c.game.destroy();return result;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
const results=[];
for(const poll of [2,3,4,5,6])for(const gap of [0,1,2,3])for(const handoff of [0,2,4,8]){
  const config={poll,gap,handoff};results.push(run('old',config),run('continuous',config),run('continuous-release',config));
}
writeFileSync('/tmp/tougaigu-v29-mushroom-input-analysis.json',JSON.stringify({scope:'offline real-engine normal inputs; synthetic control polling/delivery delays, not a reconstruction of candidate4 browser timing',results},null,2));
const summary=kind=>{const r=results.filter(r=>r.kind===kind);return {cases:r.length,passed:r.filter(r=>r.outcome==='root-landed').length,failed:r.filter(r=>r.outcome!=='root-landed').length,
  bounceBeforeHold:r.filter(r=>r.bounceBeforeFinalHold).length,
  maxBounceDelay:Math.max(...r.filter(r=>r.secondsHoldToBounce!==null).map(r=>r.secondsHoldToBounce)),
  maxLandingDelay:Math.max(...r.filter(r=>r.secondsHoldToLanding!==null).map(r=>r.secondsHoldToLanding))};};
const examples=results.filter(r=>r.kind==='old'&&r.outcome==='failed'&&r.bounce).slice(0,4).map(({samples,...r})=>r);
console.log(JSON.stringify({summary:{old:summary('old'),continuous:summary('continuous'),releaseAt1660:summary('continuous-release')},examples:examples.slice(0,1)},null,2));

}
