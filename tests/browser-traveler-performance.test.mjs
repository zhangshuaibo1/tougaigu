import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { DreamGame } from '../dist/dream-engine.js';

const root=new URL('..',import.meta.url),noop=()=>{};
globalThis.window={devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
globalThis.document={hidden:false,addEventListener:noop,removeEventListener:noop};
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=noop;
const context=new Proxy({createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop}),measureText:()=>({width:40})},{get:(o,k)=>k in o?o[k]:noop});
const extracted=spawnSync('python3',['-c',String.raw`
import ast,json
from pathlib import Path
tree=ast.parse(Path('scripts/browser-smoke.py').read_text())
print(json.dumps(next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='PROBE' for t in n.targets))))
`],{cwd:root,encoding:'utf8'});
assert.equal(extracted.status,0,extracted.stderr);
const probe=JSON.parse(extracted.stdout);
function makeGame(chapterIndex){
  const game=new DreamGame({getContext:()=>context,getBoundingClientRect:()=>({width:1280,height:640})});
  game.start({chapterIndex,sound:false});
  const readWindow={};
  runInNewContext(probe,{window:readWindow,game,currentHud:null,lastHudAt:0,controlSource:'keyboard',performance:{now:()=>100},save:{choices:{letter:null}}});
  return {game,read:()=>JSON.parse(JSON.stringify(readWindow.__qaRead()))};
}
const tick=(game,n=1)=>{for(let i=0;i<n;i++)game.update(1/60);};
function until(game,predicate,seconds=15){
  for(let i=0;i<seconds*60;i++){if(predicate())return;tick(game);}
  throw Error('authored route did not reach the actual physical condition');
}
function walk(game,x){
  for(let i=0;i<600;i++){
    const b=game.body;
    if(Math.abs(x-b.x)<=12&&Math.abs(b.vx)<40){game.setInput({x:0});return;}
    const error=x-(b.x+b.vx*Math.abs(b.vx)/3300);
    game.setInput({x:Math.abs(error)>12?Math.sign(error):0});tick(game,2);
  }
  throw Error('ordinary walking did not arrive');
}

test('browser pose checks accept actual production-input observations and reject detached or stale drawing views',()=>{
  const samples=[];
  for(const chapter of [0,1,2]){
    const {game,read}=makeGame(chapter);
    try{
      assert(game.jump());tick(game,6);
      samples.push({phase:'rise',snapshot:read()});
      until(game,()=>game.body.vy>80);samples.push({phase:'fall',snapshot:read()});
      until(game,()=>game.body.grounded);samples.push({phase:'land',snapshot:read()});
      if(chapter===2){
        game.setReducedMotion(true);
        assert(game.jump());tick(game,6);samples.push({phase:'rise',reduced:true,snapshot:read()});
        until(game,()=>game.body.vy>80);samples.push({phase:'fall',reduced:true,snapshot:read()});
        until(game,()=>game.body.grounded);samples.push({phase:'idle',reduced:true,snapshot:read()});
      }
    }finally{game.destroy();}
  }
  // Reach the real stage from its original spawn with walking and jump input.
  // This only supplies observations to the browser checker; it is not browser
  // evidence and never assigns a body coordinate, platform or saved result.
  const {game,read}=makeGame(2);
  try{
    walk(game,490);until(game,()=>game.body.grounded&&Math.abs(game.body.vx)<1);
    assert(game.jump());walk(game,710);until(game,()=>game.body.grounded&&Math.abs(game.body.vx)<1);
    until(game,()=>game.movers[0].x<=725&&game.movers[0].dx>0);
    game.setInput({x:1});until(game,()=>game.body.platform==='stage',5);
    game.setInput({x:0});until(game,()=>Math.abs(game.body.vx)<1);
    samples.push({phase:'ride',snapshot:read()});
  }finally{game.destroy();}
  const folder=mkdtempSync(join(tmpdir(),'tougaigu-browser-pose-'));
  try{
    const file=join(folder,'actual-observations.json');writeFileSync(file,JSON.stringify(samples));
    const python=String.raw`
import ast,copy,json,math,sys
from pathlib import Path
tree=ast.parse(Path('scripts/browser-smoke.py').read_text())
names={'traveler_pose_record','validate_traveler_pose'}
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in names],type_ignores=[]),'actual-browser-pose-checks','exec'))
samples=json.loads(Path(sys.argv[1]).read_text())
for sample in samples:validate_traveler_pose(sample['snapshot'],sample['phase'],sample.get('reduced'))
rise=next(s['snapshot'] for s in samples if s['phase']=='rise' and s['snapshot']['chapterIndex']==2 and not s.get('reduced'))
land=next(s['snapshot'] for s in samples if s['phase']=='land' and s['snapshot']['chapterIndex']==2)
ride=next(s['snapshot'] for s in samples if s['phase']=='ride')
reduced=next(s['snapshot'] for s in samples if s.get('reduced') and s['phase']=='rise')
def set_view(s,key,value):
    s['travelerPerformance'][key]=value
    s['characterPose']['performance']=copy.deepcopy(s['travelerPerformance'])
def reject(source,phase,mutate,needle):
    sample=copy.deepcopy(source);mutate(sample)
    try:validate_traveler_pose(sample,phase)
    except AssertionError as error:assert needle in str(error),(needle,str(error))
    else:raise AssertionError('broken pose evidence accepted: '+needle)
reject(rise,'rise',lambda s:s['characterPose'].update(performance=None),'lost the production performance view')
reject(rise,'rise',lambda s:s['characterPose']['arms']['left']['requested'].update(x=-16,y=-16),'actual free arm did not use')
reject(rise,'rise',lambda s:s['body'].update(vy=200),'rise lacks real upward motion')
reject(land,'land',lambda s:s.update(platforms=[],movers=[]),'has no real support')
reject(land,'land',lambda s:set_view(s,'landingAge',.201),'short current contact response')
reject(ride,'ride',lambda s:s['body'].update(platform=None),'lacks actual stage attachment')
reject(reduced,'rise',lambda s:set_view(s,'rise',.1),'retained decorative amplitude')
reject(reduced,'rise',lambda s:set_view(s,'freeArms',dict(left=dict(x=-17,y=-16),right=dict(x=17,y=-16))),'retained a free-arm animation')
outside=copy.deepcopy(samples[0]['snapshot']);outside['travelerPerformance']=rise['travelerPerformance']
reject(outside,'rise',lambda s:None,'leaked outside its scope')
print(str(len(samples))+' actual input/probe samples accepted; nine independent regressions rejected; offline only')
`;
    const result=spawnSync('python3',['-c',python,file],{cwd:root,encoding:'utf8'});
    assert.equal(result.status,0,result.stderr||result.error?.message||result.stdout);
    assert.match(result.stdout,/13 actual input\/probe samples accepted; nine independent regressions rejected/);
  }finally{rmSync(folder,{recursive:true,force:true});}
});
