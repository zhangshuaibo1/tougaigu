import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DreamGame, DREAM_PHYSICS } from '../dist/dream-engine.js';

const root=new URL('..',import.meta.url);
const pythonHelpers=String.raw`
import ast,json,time,asyncio
from pathlib import Path
tree=ast.parse(Path('scripts/browser-smoke.py').read_text())
names={'theatre_mover','theatre_alight_window','wait_theatre_alight_window','hold'}
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,(ast.FunctionDef,ast.AsyncFunctionDef)) and n.name in names],type_ignores=[]),'actual-browser-driver','exec'))
`;
function python(script,input){
  const folder=input?mkdtempSync(join(tmpdir(),'tougaigu-alight-')):null;
  try{
    const path=folder?join(folder,'observations.json'):null;
    if(path)writeFileSync(path,input);
    const result=spawnSync('python3',['-c',pythonHelpers+script,...(path?[path]:[])],{cwd:root,encoding:'utf8'});
    assert.equal(result.status,0,result.stderr||result.error?.message||result.stdout);
    return result.stdout;
  }finally{if(folder)rmSync(folder,{recursive:true,force:true});}
}

test('theatre driver waits for fresh safe geometry and does not press after arrival',()=>{
  const output=python(String.raw`
def snapshot(x,dx=1):
    return dict(form='body',state='playing',body=dict(x=x+110,y=465,w=34,vx=0,grounded=True,platform='stage'),
                movers=[dict(id='stage',x=x,y=465,w=185,h=20,dx=dx,range=245,speed=.6)])
right=dict(x=1130,y=465,w=225,h=18)
class Keyboard:
    def __init__(self):self.events=[]
    async def down(self,key):self.events.append(('down',key))
    async def up(self,key):self.events.append(('up',key))
class Page:
    def __init__(self):self.keyboard=Keyboard();self.reads=0;self.waits=0
    async def evaluate(self,expression):
        self.reads+=1
        return [snapshot(1130),snapshot(980,-1),snapshot(980)][min(self.reads-1,2)]
    async def wait_for_timeout(self,milliseconds):self.waits+=1
async def run():
    page=Page()
    fresh=await wait_theatre_alight_window(page,right)
    assert fresh['movers'][0]['x']==980 and fresh['movers'][0]['dx']>0
    assert page.reads==3 and page.waits==2,'stale late/inbound observations must not issue input'
    assert not page.keyboard.events
    async def already_ashore():return True
    await hold(page,'right',until=already_ashore)
    assert not page.keyboard.events,'arrival before input must not introduce a key pulse'
    checks=0
    async def arrives_after_press():
        nonlocal checks
        checks+=1
        return checks==2
    await hold(page,'right',until=arrives_after_press)
    assert page.keyboard.events==[('down','ArrowRight'),('up','ArrowRight')]
    page.keyboard.events=[]
    async def fails_after_press():
        if page.keyboard.events:raise RuntimeError('observation failed')
        return False
    try:await hold(page,'right',until=fails_after_press)
    except RuntimeError:pass
    else:raise AssertionError('an observation error was swallowed')
    assert page.keyboard.events==[('down','ArrowRight'),('up','ArrowRight')],'failure must still release input'
    print('fresh late/inbound rejection, arrival precheck and failure key release passed')
asyncio.run(run())
`);
  assert.match(output,/arrival precheck and failure key release passed/);
});

// This is offline production-physics sensitivity evidence, not a browser run.
// Every route starts at the authored spawn and uses input/jump/update only.
// No body position, stage phase, save, award or puzzle result is assigned.
const noop=()=>{};
globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
const ctx=new Proxy({createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop}),measureText:()=>({width:40})},{get:(o,k)=>k in o?o[k]:noop,set:()=>true});
const tick=(g,n=1)=>{for(let i=0;i<n;i++)g.update(1/60);};
function wait(g,predicate,seconds=16){
  for(let n=0;n<seconds*60;n++){if(predicate())return true;tick(g);}
  return false;
}
function drive(g,target){
  for(let n=0;n<600;n++){
    const b=g.body;
    if(Math.abs(target-b.x)<=12&&Math.abs(b.vx)<40){g.setInput({x:0});return;}
    const error=target-(b.x+b.vx*Math.abs(b.vx)/3300);
    g.setInput({x:Math.abs(error)>12?Math.sign(error):0});tick(g,2);
  }
  throw Error('normal input did not reach the target');
}
const observe=g=>({form:g.form,state:g.state,body:{...g.body},movers:g.movers.map(p=>({...p})),deaths:g.deaths});
function atObservedAlight(delay){
  const g=new DreamGame({getContext:()=>ctx,getBoundingClientRect:()=>({width:1280,height:640})});
  g.start({chapterIndex:2,sound:false});
  drive(g,490);assert(wait(g,()=>g.body.grounded&&Math.abs(g.body.vx)<1));
  assert(g.jump());drive(g,710);
  assert(wait(g,()=>g.body.grounded&&g.body.platform===null&&Math.abs(g.body.y-465)<2&&Math.abs(g.body.vx)<1));
  assert(wait(g,()=>g.movers[0].x>925));
  assert(wait(g,()=>g.movers[0].x<=725&&g.movers[0].dx>0));
  g.setInput({x:1});assert(wait(g,()=>g.body.platform==='stage',5));g.setInput({x:0});
  assert(wait(g,()=>Math.abs(g.body.vx)<1));
  assert(wait(g,()=>g.movers[0].x>=1020&&g.movers[0].dx>0));
  assert.match(g.getNearHint(),/右侧踏台到了/);
  tick(g,Math.round(delay*60));return g;
}
function walkOff(g){
  g.setInput({x:1});let ashore=false;
  for(let i=0;i<150;i++){
    const b=g.body;
    if(b.platform===null&&b.grounded&&b.x>1220&&Math.abs(b.y-465)<2){ashore=true;break;}
    tick(g,2);
  }
  g.setInput({x:0});
  const settled=wait(g,()=>g.body.grounded&&g.body.platform===null&&Math.abs(g.body.vx)<1,3);
  return {ashore,settled,landed:observe(g),encore:g.getTheatreEncoreView()};
}

test('late HUD observations cannot turn a real moving-stage exit into a lower-ground landing',()=>{
  assert.equal(DREAM_PHYSICS.speed,240,'the browser clearance model must match authored walk speed');
  const old=atObservedAlight(.9);
  try{
    const failure=walkOff(old);
    assert(failure.ashore&&failure.settled,'old driver briefly sees an ashore point');
    assert.equal(failure.landed.body.y,560,'the old generic grounded wait accepts the lower floor');
    assert(failure.landed.body.x>1355,'old delayed input overshoots the actual right bank');
  }finally{old.destroy();}

  const delays=[0,.3,.6,.75,.9,1.2];
  const traces=delays.map(delay=>{
    const g=atObservedAlight(delay),frames=[];
    try{for(let i=0;i<690;i++){frames.push(observe(g));tick(g);}}finally{g.destroy();}
    return frames;
  });
  // Ask the ACTUAL Python browser predicate which fresh frame is safe, then
  // replay the same real input route and advance to that frame normally.
  const indices=JSON.parse(python(String.raw`
import sys
traces=json.loads(Path(sys.argv[1]).read_text())
right=dict(x=1130,y=465,w=225,h=18)
print(json.dumps([next(i for i,s in enumerate(frames) if theatre_alight_window(s,right)) for frames in traces]))
`,JSON.stringify(traces)));
  for(let i=0;i<delays.length;i++){
    const g=atObservedAlight(delays[i]);
    try{
      tick(g,indices[i]);
      const fresh=observe(g);
      tick(g,6); // Also spend 100ms on the remaining input/protocol handoff.
      const result=walkOff(g),b=result.landed.body;
      const detail=JSON.stringify({delay:delays[i],fresh,result});
      assert(result.ashore&&result.settled,detail);
      assert(b.x>1130&&b.x<1355&&Math.abs(b.y-465)<2,detail);
      assert(b.grounded&&b.platform===null&&Math.abs(b.vx)<1,detail);
      assert.equal(result.landed.deaths,0,detail);
      assert.equal(result.encore.phase,'active','the real far-bank landing still earns its bow: '+detail);
    }finally{g.destroy();}
  }
});
