import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
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
def constant(name):return next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id==name for t in n.targets))
wait=next(n for n in tree.body if isinstance(n,ast.AsyncFunctionDef) and n.name=='await_traveler_pose')
call=next(n for n in ast.walk(wait) if isinstance(n,ast.Call) and isinstance(n.func,ast.Attribute) and n.func.attr=='wait_for_function')
jump=next(n for n in tree.body if isinstance(n,ast.AsyncFunctionDef) and n.name=='sample_body_jump')
cleanup=next(ast.literal_eval(n.args[0]) for n in ast.walk(jump) if isinstance(n,ast.Call) and isinstance(n.func,ast.Attribute) and n.func.attr=='evaluate' and n.args and isinstance(n.args[0],ast.Constant) and 'const stopped=sampler.stop' in str(n.args[0].value))
print(json.dumps(dict(probe=constant('PROBE'),sampler=constant('TRAVELER_FRAME_SAMPLER'),wait=ast.literal_eval(call.args[0]),cleanup=cleanup)))
`],{cwd:root,encoding:'utf8'});
assert.equal(extracted.status,0,extracted.stderr);
const sources=JSON.parse(extracted.stdout),probe=sources.probe;
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

test('the jump driver focuses, observes before keydown and disposes on every exit; null performance remains valid',()=>{
  const app=readFileSync(new URL('../dist/dream-app.js',import.meta.url),'utf8');
  const start=app.indexOf("document.addEventListener('keydown', event => {");
  const end=app.indexOf("document.addEventListener('keyup'",start);
  assert(start>=0&&end>start,'the production keyboard handler was not found');
  let keydown;
  class Element {
    constructor(tag){this.tag=tag;}
    closest(){return ['BUTTON','INPUT','SELECT','TEXTAREA','A'].includes(this.tag)?this:null;}
  }
  const {game,read}=makeGame(0);
  try{
    runInNewContext(app.slice(start,end),{
      document:{addEventListener:(type,callback)=>{assert.equal(type,'keydown');keydown=callback;}},
      Element,game,gameplayAvailable:()=>true,setControlSource:noop,resetInput:noop,
      heldKeys:new Set(),currentHud:{form:'body'},syncInput:noop,
    });
    const space=target=>({code:'Space',repeat:false,target,preventDefault:noop});
    for(const tag of ['BUTTON','INPUT','A']){
      keydown(space(new Element(tag)));
      assert.equal(game.body.grounded,true,'a focused UI control must keep its own Space behavior');
      assert.equal(game.body.vy,0);
    }
    keydown(space(new Element('CANVAS')));
    const rising=read();
    assert.equal(rising.travelerPerformance,null,'chapter one intentionally has no third-chapter acting view');
    assert.equal(rising.body.grounded,false);assert.equal(rising.body.vy,-600);
    const observed={token:'current',status:'sampling',poses:{rise:rising}};
    const probeWindow={__qaTravelerFrames:{token:'current',read:()=>observed}};
    const predicate=runInNewContext('('+sources.wait+')',{window:probeWindow});
    assert.equal(predicate({token:'current',key:'rise'}),observed,'a captured chapter-one null performance must remain observable');
    assert.equal(predicate({token:'current',key:'fall'}),false,'a missing phase must not pass');
    assert.equal(predicate({token:'old',key:'rise'}).status,'missing','another run token must not reuse the observed rise');
    delete probeWindow.__qaTravelerFrames;
    assert.equal(predicate({token:'current',key:'land'}).status,'missing','undefined observer is not a completed landing');
  }finally{game.destroy();}

  // Execute the actual async driver against normal focus/keyboard surfaces.
  // This verifies input ordering, not a browser or a substituted game state.
  const driver=spawnSync('python3',['-c',String.raw`
import ast,asyncio,base64,copy,json,time
from pathlib import Path
tree=ast.parse(Path('scripts/browser-smoke.py').read_text())
function=next(n for n in tree.body if isinstance(n,ast.AsyncFunctionDef) and n.name=='sample_body_jump')
exec(compile(ast.Module(body=[function],type_ignores=[]),'actual-browser-jump-driver','exec'))
TRAVELER_FRAME_SAMPLER='observer-install'
class ArtifactPath:
    def __init__(self,value):self.value=value
    def __truediv__(self,name):return ArtifactPath(name)
    def __str__(self):return self.value
    def write_bytes(self,raw):assert raw==b'unchanged pixels'
Path=ArtifactPath
class Locator:
    def __init__(self,page,selector):self.page=page;self.selector=selector
    async def focus(self):
        self.page.calls.append('focus')
        if self.page.allow_focus:self.page.active='dream-canvas'
    async def evaluate(self,expression):
        if 'toDataURL' in expression:
            if self.page.fail=='pixels':raise RuntimeError('pixels failed')
            return 'data:image/png;base64,dW5jaGFuZ2VkIHBpeGVscw=='
        self.page.calls.append('verify-focus')
        return self.page.active=='dream-canvas'
    async def wait_for(self):pass
    async def click(self):
        assert self.selector=='#stage-resume'
        if self.page.fail=='resume':raise RuntimeError('resume failed')
        self.page.paused=False
class Keyboard:
    def __init__(self,page):self.page=page
    async def down(self,key):
        self.page.calls.append('down:'+key)
        assert key=='Space' and self.page.active=='dream-canvas' and self.page.installed,'observation must be installed before actual keydown'
        if self.page.fail=='down':raise RuntimeError('down failed')
        self.page.jumped=True
    async def up(self,key):self.page.calls.append('up:'+key)
    async def press(self,key):
        assert key=='Escape'
        self.page.paused=True
class Page:
    def __init__(self,active,allow_focus=True,fail=None):
        self.active=active;self.allow_focus=allow_focus;self.fail=fail;self.calls=[];self.jumped=False;self.installed=False;self.paused=False
        self.keyboard=Keyboard(self)
    async def evaluate(self,expression,arg=None):
        if expression==TRAVELER_FRAME_SAMPLER:
            self.token=arg;self.installed=True;self.calls.append('install');return {}
        if 'const stopped=sampler.stop' in expression:
            assert arg==self.token and self.installed
            self.calls.append('dispose');self.installed=False
            return dict(pendingFrame=False,pendingTimer=False,oldPosesCleared=True,removed=True)
        if 'window.__qaTravelerFrames' in expression:
            return dict(token=self.token,status='complete',pendingFrame=False,pendingTimer=False,activeMs=900,elapsedMs=1100,initial=before,frames=[],droppedFrames=0,input={})
        if 'requestAnimationFrame(resolve)' in expression:return paused()
        if expression=='window.__qaRead()':
            if self.paused:return paused()
            if self.jumped and self.fail=='after-input':raise RuntimeError('after-input failed')
            return phase('rise') if self.jumped else copy.deepcopy(before)
        return dict(id=self.active,tag='CANVAS' if self.active=='dream-canvas' else 'BUTTON')
    def locator(self,selector):return Locator(self,selector)
    async def screenshot(self,**options):
        if self.fail=='screenshot':raise RuntimeError('screenshot failed')
before=dict(state='playing',form='body',body=dict(x=105,y=560,vx=0,vy=0,grounded=True),deaths=0,runId=1,bodyIdentity=1,time=0)
def phase(name):
    sample=copy.deepcopy(before);sample['time']={'rise':.01,'fall':.6,'land':.9}[name]
    sample['body'].update(grounded=name=='land',vy={'rise':-600,'fall':120,'land':0}[name])
    sample['travelerPerformance']=dict(phase=name)
    return sample
def paused():
    sample=phase('rise');sample['state']='paused';return sample
async def await_traveler_pose(page,token,name,reduced_motion=None):
    assert page.jumped and token==page.token,'driver observed phases without its own real keyboard action'
    assert page.calls[-1]=='up:Space','Space was held while waiting for a transient frame'
    if page.fail==name:raise RuntimeError(name+' failed')
    return phase(name)
def traveler_pose_record(snapshot):return snapshot
def validate_traveler_pose(*args):pass
async def run():
    for target in ['stage-story','dream-pref-motion']:
        page=Page(target);result=await sample_body_jump(page,'focus-regression')
        assert page.calls==['focus','verify-focus','install','down:Space','up:Space','dispose'],page.calls
        assert result['keyboardFocusBefore']['id']==target
        assert result['keyboardTargetVerified']=='dream-canvas'
        assert result['observerCleanup']['oldPosesCleared'] and not page.installed
    blocked=Page('stage-story',allow_focus=False)
    try:await sample_body_jump(blocked,'blocked-focus')
    except AssertionError as error:assert 'Space target' in str(error)
    else:raise AssertionError('a failed focus operation was ignored')
    assert blocked.calls==['focus','verify-focus'] and not blocked.jumped
    for failure in ['down','after-input','rise','fall','land','pixels','screenshot','resume']:
        page=Page('stage-story',fail=failure)
        try:await sample_body_jump(page,'cleanup-regression',pause=failure in ['pixels','screenshot','resume'],output='/not-written-by-fake')
        except RuntimeError as error:assert failure in str(error),(failure,str(error))
        else:raise AssertionError('expected failure was swallowed: '+failure)
        assert 'up:Space' in page.calls and page.calls[-1]=='dispose' and not page.installed,(failure,page.calls)
    print('focus before observer before keydown; failed focus sends no key; eight exceptional exits release key and dispose observer')
asyncio.run(run())
`],{cwd:root,encoding:'utf8'});
  assert.equal(driver.status,0,driver.stderr||driver.error?.message||driver.stdout);
  assert.match(driver.stdout,/failed focus sends no key/);
});

test('pre-input frame observation preserves missed phases but rejects resets, replaced bodies and missing phases',()=>{
  const app=readFileSync(new URL('../dist/dream-app.js',import.meta.url),'utf8');
  const start=app.indexOf("document.addEventListener('keydown', event => {");
  const handler=app.slice(start,app.indexOf("document.addEventListener('keyup'",start));
  function harness(chapter=0){
    const {game,read}=makeGame(chapter);
    let now=0,sequence=0;
    const frames=new Map(),timers=new Map(),listeners=[];
    class Element {
      constructor(tag,id){this.tagName=tag;this.id=id;}
      closest(){return ['BUTTON','INPUT','A'].includes(this.tagName)?this:null;}
    }
    const canvas=new Element('CANVAS','dream-canvas');
    const document={activeElement:canvas,querySelectorAll:()=>[],
      addEventListener(type,fn,options){listeners.push({type,fn,capture:options===true||options?.capture===true});},
      removeEventListener(type,fn,options){const capture=options===true||options?.capture===true;const i=listeners.findIndex(l=>l.type===type&&l.fn===fn&&l.capture===capture);if(i>=0)listeners.splice(i,1);}};
    runInNewContext(handler,{document,Element,game,gameplayAvailable:()=>game.state==='playing',
      setControlSource:noop,resetInput:noop,heldKeys:new Set(),currentHud:{form:'body'},syncInput:noop});
    assert.equal(listeners.length,1,'register the real production listener before the observer');
    const window={__qaRead:read};
    const environment={window,document,performance:{now:()=>now},
      requestAnimationFrame:fn=>{const id=++sequence;frames.set(id,fn);return id;},
      cancelAnimationFrame:id=>frames.delete(id),
      setTimeout:(fn,ms)=>{const id=++sequence;timers.set(id,{fn,at:now+ms});return id;},
      clearTimeout:id=>timers.delete(id)};
    const install=runInNewContext('('+sources.sampler+')',environment);
    const wait=runInNewContext('('+sources.wait+')',environment);
    const cleanup=runInNewContext('('+sources.cleanup+')',environment);
    const dispatch=(code='Space',target=canvas)=>{
      const event={key:code==='Space'?' ':code,code,target,repeat:false,ctrlKey:false,metaKey:false,altKey:false,defaultPrevented:false,
        preventDefault(){this.defaultPrevented=true;}};
      for(const capture of [true,false])for(const listener of [...listeners])
        if(listener.type==='keydown'&&listener.capture===capture&&listeners.includes(listener))listener.fn(event);
      return event;
    };
    const timersDue=()=>{for(const [id,timer] of [...timers])if(timer.at<=now){timers.delete(id);timer.fn();}};
    const frame=(steps=1)=>{
      now+=steps*1000/60;tick(game,steps);
      const queued=[...frames];frames.clear();for(const [,fn] of queued)fn(now);
      timersDue();
    };
    const advance=(count,steps=1)=>{for(let i=0;i<count;i++)frame(steps);};
    const stopped=()=>{assert.equal(frames.size,0);assert.equal(timers.size,0);assert.equal(listeners.length,1,'only the original production listener may remain');};
    return {game,read,window,install,wait,cleanup,dispatch,frame,advance,stopped,button:new Element('BUTTON','stage-story'),
      view:()=>window.__qaTravelerFrames.read('jump'),
      clockOnly:ms=>{now+=ms;timersDue();},
      destroy(){if(window.__qaTravelerFrames)cleanup('jump');game.destroy();}};
  }

  // Run all physical frames before the hypothetical slow Python consumer
  // returns. A fresh live fall predicate now fails, yet the real frame survives.
  const delayed=harness();
  try{
    delayed.install('jump');delayed.advance(6);
    assert.equal(Object.keys(delayed.view().poses).length,0,'initial grounded frames cannot become landing');
    delayed.dispatch();
    assert.equal(delayed.view().input.capture.sample.grounded,true);
    assert.equal(delayed.view().input.after.sample.vy,-600);
    assert.equal(delayed.view().input.after.defaultPrevented,true,'the production listener ran before afterKey');
    assert.equal(delayed.view().poses.rise.travelerPerformance,null);
    delayed.advance(27);
    assert.equal(delayed.game.body.vy,7.5);
    assert.equal(delayed.view().poses.fall,undefined,'7.5 is not the required >80 fall');
    delayed.advance(45);
    const view=delayed.view();
    assert.equal(view.status,'complete');delayed.stopped();
    assert(delayed.game.body.grounded&&delayed.game.body.vy===0,'the late consumer really arrived after the fall');
    assert(view.poses.rise.body.vy<-80&&view.poses.fall.body.vy>80&&view.poses.land.body.grounded);
    assert(view.poses.rise.time<view.poses.fall.time&&view.poses.fall.time<view.poses.land.time);
    assert(view.frames.some(f=>f.vy===7.5)&&view.frames.some(f=>f.vy>80),'preserve the continuous velocity evidence');
    assert.equal(delayed.wait({token:'jump',key:'fall'}).poses.fall.body.vy,view.poses.fall.body.vy);
    const old=delayed.window.__qaTravelerFrames;
    assert.equal(old.read('obsolete-token').status,'mismatch');assert.equal(Object.keys(old.read('obsolete-token').poses).length,0);
    const cleanup=delayed.cleanup('jump');assert.equal(cleanup.oldPosesCleared,true);assert.equal(cleanup.removed,true);
    assert.equal(old.read('jump').status,'disposed');assert.equal(Object.keys(old.read('jump').poses).length,0);
    assert.equal(delayed.wait({token:'jump',key:'land'}).status,'missing');delayed.stopped();
  }finally{delayed.destroy();}

  // Pausing is real engine pause; neither its duration nor duplicate paused
  // frames may create phases or consume the active observation budget.
  const paused=harness(2);
  try{
    paused.install('jump');paused.dispatch();paused.advance(6);
    paused.dispatch('Escape');const frozen=paused.read();paused.advance(520);
    assert.equal(paused.game.time,frozen.time);assert.equal(paused.view().status,'sampling');
    assert.equal(Object.keys(paused.view().poses).join(','),'rise');
    assert(paused.view().activeMs<200&&paused.view().frames.length<=512&&paused.view().droppedFrames>0);
    paused.game.resume();paused.advance(5,12); // real .2s fixed-step catch-up frames
    const view=paused.view();assert.equal(view.status,'complete');paused.stopped();
    assert(view.poses.fall.body.vy>80&&view.poses.land.travelerPerformance.phase==='land');
    assert(view.poses.land.travelerPerformance.landingAge<.2);
  }finally{paused.destroy();}

  for(const reset of ['same-chapter-restart','feather-body-replacement']){
    const h=harness();
    try{
      h.install('jump');h.dispatch();h.advance(32);assert(h.view().poses.fall);
      const earlier=h.read();
      if(reset==='same-chapter-restart')h.game.start({chapterIndex:0,sound:false});
      else{assert(h.game.useItem('feather_charm'));h.game.respawn('offline lifecycle fixture');}
      const current=h.read();assert.notEqual(current.bodyIdentity,earlier.bodyIdentity);
      assert.equal(current.deaths,earlier.deaths,'exercise the case a death counter alone cannot catch');
      h.frame();const view=h.view();assert.equal(view.status,'invalid');assert.equal(Object.keys(view.poses).length,0);
      assert.match(view.reason,/run, body, chapter or deaths/);h.stopped();
    }finally{h.destroy();}
  }

  const noInput=harness();
  try{
    noInput.install('jump');noInput.advance(220);
    assert.equal(noInput.view().status,'timeout');assert.equal(Object.keys(noInput.view().poses).length,0);noInput.stopped();
  }finally{noInput.destroy();}
  const blocked=harness();
  try{
    blocked.install('jump');blocked.dispatch('Space',blocked.button);
    assert.equal(blocked.game.body.grounded,true);
    assert.equal(blocked.view().status,'invalid');assert.equal(Object.keys(blocked.view().poses).length,0);
    assert.match(blocked.view().reason,/Space did not start/);blocked.stopped();
  }finally{blocked.destroy();}
  const repeated=harness();
  try{
    repeated.install('jump');repeated.dispatch();repeated.frame();repeated.dispatch();
    assert.equal(repeated.view().status,'invalid');assert.match(repeated.view().reason,/second Space/);
    assert.equal(Object.keys(repeated.view().poses).length,0);repeated.stopped();
  }finally{repeated.destroy();}
  const missingFall=harness();
  try{
    missingFall.install('jump');missingFall.dispatch();
    // Deliberately miss the observer's downward frames while the actual
    // engine completes the jump. Ground contact cannot fill in that evidence.
    tick(missingFall.game,60);missingFall.frame();
    assert.equal(missingFall.game.body.grounded,true);
    assert.equal(missingFall.view().status,'invalid');assert.match(missingFall.view().reason,/contact preceded an observed downward phase/);
    assert.equal(Object.keys(missingFall.view().poses).length,0);missingFall.stopped();
  }finally{missingFall.destroy();}
  const noFrames=harness();
  try{
    noFrames.install('jump');noFrames.clockOnly(10501);
    assert.equal(noFrames.view().status,'timeout');assert.equal(Object.keys(noFrames.view().poses).length,0);noFrames.stopped();
  }finally{noFrames.destroy();}
});
