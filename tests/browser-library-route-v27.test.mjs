import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

const helpers=String.raw`
import ast,asyncio,base64,copy,json,math,tempfile
from pathlib import Path
from urllib.parse import urlparse
def load(path,names):
    tree=ast.parse(Path(path).read_text())
    exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,(ast.FunctionDef,ast.AsyncFunctionDef,ast.ClassDef)) and n.name in names],type_ignores=[]),path,'exec'),globals())
load('scripts/browser_library_v26.py',{'validate_library_rider_trace','validate_library_paint','validate_library_abort','LibraryAbortGate','pause_library'})
load('scripts/browser-smoke.py',{'validate_request_failures','tap_control'})
LIBRARY_FILE='library-painted-v26.webp'
`;
function run(script){
  const result=spawnSync('python3',['-c',helpers+script],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.error?.message||result.stdout);
  return result.stdout;
}

test('floating-book evidence requires the same real rider for a complete physical round trip',()=>{
  const output=run(String.raw`
period=2*math.pi/.85
samples=[]
for i in range(81):
    t=period*i/80;y=430+62*math.sin(.85*t)
    velocity=62*.85*math.cos(.85*t)
    sample=dict(runId=1,bodyIdentity=9,chapterIndex=3,mode='story',state='playing',form='body',deaths=0,time=t,visualTime=t,
        body=dict(x=691,y=y,w=30,vx=0,walk=12,grounded=True,platform='book-a'),input=dict(x=0,y=0),
        mover=dict(id='book-a',kind='book',axis='y',x=615,y=y,w=155,h=20,dy=velocity/60,range=62,speed=.85))
    sample['travelerPose']={key:copy.deepcopy(sample[key]) for key in ['runId','bodyIdentity','chapterIndex','mode','state','form','deaths','time','visualTime','body']}
    sample['travelerPose'].update(reducedMotion=False,travelerPerformance=dict(phase='ride',platformId='book-a',platformKind='book',platformAxis='y',platformVerticalVelocity=velocity,verticalBalance=velocity/90,landingAge=None))
    samples.append(sample)
result=validate_library_rider_trace(samples,'book-a',True)
assert result['fullCycle'] and result['maxSoleError']==0 and result['verticalTravel']>120
assert result['actualRideSamples']==81 and min(result['verticalPoseDirections'].values())>0
with_contact=copy.deepcopy(samples)
for sample in with_contact[:2]:sample['travelerPose']['travelerPerformance'].update(phase='land',landingAge=sample['visualTime'])
assert validate_library_rider_trace(with_contact,'book-a',True)['actualLandingSamples']==2
reduced=copy.deepcopy(samples)
for sample in reduced:
    sample['travelerPose']['reducedMotion']=True
    sample['travelerPose']['travelerPerformance']['verticalBalance']=0
assert validate_library_rider_trace(reduced,'book-a',True)['actualRideSamples']==81
def reject(change,needle):
    bad=copy.deepcopy(samples);change(bad)
    try:validate_library_rider_trace(bad,'book-a',True)
    except AssertionError as error:assert needle in str(error),(needle,str(error))
    else:raise AssertionError('misleading carry accepted: '+needle)
reject(lambda s:s[40].update(bodyIdentity=10),'changed run, body')
reject(lambda s:s[40].update(deaths=1),'changed run, body')
reject(lambda s:s[40].update(chapterIndex=2),'changed run, body')
reject(lambda s:s[40].update(form='soul'),'interrupted')
reject(lambda s:s[40].update(time=-1),'time reversed')
reject(lambda s:s[40]['body'].update(platform=None),'actual book attachment')
reject(lambda s:s[40]['body'].update(grounded=False),'actual book attachment')
reject(lambda s:s[40]['body'].update(y=s[40]['body']['y']+2),'separated from the real support')
reject(lambda s:s[40]['body'].update(x=1000),'overlaps the body')
reject(lambda s:s[40]['body'].update(x=693),'separated from the real support')
reject(lambda s:s[40]['input'].update(x=1),'held direction input')
reject(lambda s:s[40]['body'].update(vx=3),'held direction input')
reject(lambda s:s.pop(),'omitted part')
reject(lambda s:[(p['mover'].update(dy=1),p['travelerPose']['travelerPerformance'].update(platformVerticalVelocity=60,verticalBalance=2/3)) for p in s],'both physical travel directions')
reject(lambda s:s[40]['body'].update(walk=13),'actual walking cycle')
reject(lambda s:s[40]['travelerPose'].update(time=s[40]['time']+.01),'different frame')
reject(lambda s:s[40]['travelerPose']['body'].update(y=s[40]['body']['y']+1),'different frame')
reject(lambda s:s[40]['travelerPose']['travelerPerformance'].update(platformAxis='x'),'actual vertical support')
reject(lambda s:s[40]['travelerPose']['travelerPerformance'].update(platformKind='stage'),'actual vertical support')
reject(lambda s:s[40]['travelerPose']['travelerPerformance'].update(phase='rise'),'neither contact nor established riding')
reject(lambda s:s[40]['travelerPose']['travelerPerformance'].update(phase='land',landingAge=.01),'restarted the landing response')
reject(lambda s:s[40]['travelerPose']['travelerPerformance'].update(platformVerticalVelocity=60),'real vertical travel direction')
reject(lambda s:s[40]['travelerPose']['travelerPerformance'].update(verticalBalance=.5),'opposed the real vertical travel direction')
reject(lambda s:s[40]['travelerPose'].update(reducedMotion=True),'setting changed')
print('normal, initial contact and reduced book carry accepted; 24 missing or falsified rider observations rejected')
`);
  assert.match(output,/24 missing or falsified/);
});

test('the exact failed primary image cannot absorb another request, another error or a hidden retry',()=>{
  const output=run(String.raw`
class Request:
    def __init__(self,failure='net::ERR_FAILED'):self.failure=failure
class Route:
    def __init__(self,gate):self.gate=gate;self.request=Request();self.continued=False
    async def abort(self,reason):
        assert reason=='failed';self.gate.failed(self.request)
    async def continue_(self):self.continued=True
async def main():
    gate=LibraryAbortGate('https://example.test/assets/library-painted-v26.webp')
    unrelated=Request();gate.failed(unrelated)
    assert gate.failure is None and not gate.done.is_set()
    route=Route(gate);await gate.route(route)
    record,failure=await gate.finish()
    assert failure==dict(url=gate.url,failure='net::ERR_FAILED')
    for change in [dict(failure='net::ERR_ABORTED'),dict(failure=None),dict(aborted=False),dict(requestCount=2)]:
        try:validate_library_abort({**record,**change})
        except AssertionError:pass
        else:raise AssertionError('wrong image failure accepted: '+str(change))
    second=Route(gate);await gate.route(second)
    assert second.continued
    try:await gate.finish()
    except AssertionError as error:assert 'retried' in str(error)
    else:raise AssertionError('a second request escaped the exact image budget')
    print('only the exact deliberately aborted primary request enters the network budget')
asyncio.run(main())
`);
  assert.match(output,/exact deliberately aborted primary/);
});

test('ready and failed library images require actual source, dimensions and current painted state',()=>{
  const output=run(String.raw`
ready=dict(status='ready',frame=True,width=2172,height=724,complete=True,imageSource='https://example.test/assets/'+LIBRARY_FILE)
fallback=dict(status='error',frame=False,width=0,height=0,complete=False,imageSource=None)
validate_library_paint(ready);validate_library_paint(fallback,'error')
validate_library_paint({**fallback,'status':'loading'},'loading')
for sample,kind,change in [(ready,'ready',dict(frame=False)),(ready,'ready',dict(complete=False)),
    (ready,'ready',dict(width=1)),(ready,'ready',dict(imageSource='https://example.test/assets/theatre-painted-v22.webp')),
    (fallback,'error',dict(frame=True)),(fallback,'error',dict(imageSource=ready['imageSource'])),
    (fallback,'error',dict(width=2172)),(fallback,'error',dict(status='ready'))]:
    try:validate_library_paint({**sample,**change},kind)
    except AssertionError:pass
    else:raise AssertionError('unproven painted image accepted')
print('native loading/failure never masquerades as a painted current scene')
`);
  assert.match(output,/never masquerades/);
});

test('the final network gate includes late library/coast faults without weakening the earlier exact budgets',()=>{
  const output=run(String.raw`
expected=[dict(url='https://example.test/assets/portrait-hero-curious.svg',failure='net::ERR_ABORTED') for _ in range(2)]
expected += [dict(url='https://example.test/assets/'+name,failure='net::ERR_FAILED') for name in [
    'theatre-painted-v22.webp','theatre-painted-v22.webp','theatre-painted-v20.svg','library-painted-v26.webp','coast-painted-v27.webp']]
assert validate_request_failures(copy.deepcopy(expected),expected)['exactMatch']
cases=[expected+[dict(url='https://example.test/assets/late-library.png',failure='net::ERR_ABORTED')],expected[:-1],
       expected+[expected[-1]],expected[:4]+[expected[5],expected[4]]+expected[6:],
       expected[:-1]+[{**expected[-1],'failure':'net::ERR_ABORTED'}]]
for actual in cases:
    try:validate_request_failures(actual,expected)
    except AssertionError:pass
    else:raise AssertionError('a late/missing/repeated/reordered/wrong failure escaped')
print('the entire final network history must match all and only the proven intentional failures')
`);
  assert.match(output,/entire final network history/);
});

test('touch controls use actual target coordinates for both selectors and answer locators',()=>{
  const output=run(String.raw`
class Target:
    async def wait_for(self,state):assert state=='visible'
    async def scroll_into_view_if_needed(self):pass
    async def bounding_box(self):return dict(x=20,y=40,width=80,height=60)
class Session:
    def __init__(self):self.events=[];self.detached=False
    async def send(self,name,args):self.events.append((name,args))
    async def detach(self):self.detached=True
class Page:
    def __init__(self):self.target=Target();self.context=self;self.sessions=[]
    def locator(self,selector):
        assert isinstance(selector,str),'an existing answer locator must not be stringified'
        return self.target
    async def new_cdp_session(self,page):
        assert page is self
        session=Session();self.sessions.append(session);return session
async def main():
    page=Page()
    await tap_control(page,'#stage-jump');await tap_control(page,page.target)
    for session in page.sessions:
        assert session.detached
        assert session.events==[
            ('Input.dispatchTouchEvent',dict(type='touchStart',touchPoints=[dict(x=60,y=70,id=41)])),
            ('Input.dispatchTouchEvent',dict(type='touchEnd',touchPoints=[]))]
    print('selector and puzzle-answer locator use the same actual CDP touch sequence')
asyncio.run(main())
`);
  assert.match(output,/actual CDP touch sequence/);
});

test('library pause compares the entire validated traveler pose within the original six passive frames',()=>{
  const output=run(String.raw`
before=dict(state='paused',chapterIndex=3,runId=1,bodyIdentity=5,time=12,visualTime=12,
            body=dict(x=691,y=430,platform='book-a'),movers=[dict(id='book-a',y=430)],
            libraryPaint=dict(frame=True),storyNPC=None,reducedMotion=False,travelerPerformance=dict(phase='ride'),
            pose=dict(bodyMatrix=[1,0,0,1,691,430],travelerStepSeconds=1/60,
                      travelerPerformance=dict(phase='ride',verticalBalance=.4),
                      arms=dict(left=dict(world=dict(x=670,y=410))),legs=[dict(worldFoot=dict(x=684,y=430))]))
class Driver:
    def __init__(self):self.samples=[]
    def validate_traveler_pose(self,s,phase,reduced):
        assert phase=='ride' and reduced is False
        self.samples.append(copy.deepcopy(s['pose']));return copy.deepcopy(s['pose'])
class Locator:
    async def wait_for(self):pass
    async def evaluate(self,expression):return 'data:image/png;base64,c2FtZSBwaXhlbHM='
class Page:
    def __init__(self,change=None):self.change=change;self.reads=0;self.raf_checks=0;self.resumed=False;self.keyboard=self
    async def press(self,key):assert key=='Escape'
    def locator(self,selector):assert selector in ['#pause-dialog[open]','#dream-canvas'];return Locator()
    async def evaluate(self,expression):
        if expression=='window.__qaRead()':
            self.reads+=1;s=copy.deepcopy(before)
            if self.reads==2 and self.change:self.change(s['pose'])
            return s
        assert 'for(let i=0;i<6;i++)' in expression and 'requestAnimationFrame(resolve)' in expression
        self.raf_checks+=1
    async def wait_for_function(self,expression):assert self.resumed and "state==='playing'" in expression
async def click_input(page,selector,driver,touch=False):assert selector=='#stage-resume';page.resumed=True
async def main():
    with tempfile.TemporaryDirectory() as output:
        page=Page();driver=Driver();result=await pause_library(page,output,'unchanged',driver)
        assert page.raf_checks==1 and page.reads==2 and len(driver.samples)==2
        assert result['passiveFrames']==6 and result['fullTravelerPoseFrozen'] and result['travelerPose']==before['pose']
        assert page.resumed
        changes=[lambda p:p['bodyMatrix'].__setitem__(5,431),lambda p:p.update(travelerStepSeconds=.02),
                 lambda p:p['travelerPerformance'].update(verticalBalance=.5),
                 lambda p:p['arms']['left']['world'].update(x=671),lambda p:p['legs'][0]['worldFoot'].update(y=431)]
        for change in changes:
            page=Page(change);driver=Driver()
            try:await pause_library(page,output,'changed',driver)
            except AssertionError as error:assert 'actual full traveler pose' in str(error)
            else:raise AssertionError('changing paused presentation escaped the six-frame comparison')
            assert page.raf_checks==1 and page.reads==2 and not page.resumed
    print('original six frames compare view, consumed step, rig, arm and foot without new browser reads')
asyncio.run(main())
`);
  assert.match(output,/original six frames compare view, consumed step, rig, arm and foot/);
});
