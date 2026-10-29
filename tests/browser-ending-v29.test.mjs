import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const helpers = String.raw`
import asyncio,copy,json,sys,tempfile
from pathlib import Path
sys.path.insert(0,'scripts')
import browser_ending_v29 as ending
from browser_ending_v29 import (ENDING_CONTENT,ENDING_NOTE,ending_for_choices,validate_progress,
    validate_ending_view,validate_reading_coverage,ending_touch_environment)
`;
function run(script) {
  const result = spawnSync('python3', ['-c', helpers + script], {
    cwd: new URL('..', import.meta.url), encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.error?.message || result.stdout);
  return result.stdout;
}

test('ending browser proof rejects fake unlocks, duplicate discoveries and any repeated reward or settlement', () => {
  const output = run(String.raw`
before={'dream':dict(version=1,chapters=[dict(completed=True,runs=1,bestStars=3,bestTime=40,bestMemories=3,bestDeaths=0) for _ in range(6)],
    choices=dict(letter='keep',clock='hold'),lastChapter=5,settings=dict(sound=True,reducedMotion=False),
    discoveredEndings=['lanterns'],riddles={'post-1':dict(solved=True,assisted=False)}),
    'collections':{'story-5':dict(memories=[0,1,2],seals=[0,1])}}
after=copy.deepcopy(before);after['dream']['choices']=dict(letter='send',clock='release')
after['dream']['discoveredEndings']=['lanterns','dawn']
grants=dict(stardust=12,inventory={'glow_candy':1},supplyClaims=0)
validate_progress(before,after,dict(letter='send',clock='release'),{'lanterns','dawn'},grants,grants)
assert ending_for_choices(dict(letter='send',clock='release'))=='dawn'
assert ending_for_choices(dict(letter='keep',clock='hold'))=='lanterns'
for pair in [('send','hold'),('keep','release')]:
    assert ending_for_choices(dict(zip(['letter','clock'],pair)))=='tender'
for choices in [dict(letter=None,clock='hold'),dict(letter='send',clock='tomorrow'),dict(letter='send')]:
    try:ending_for_choices(choices)
    except AssertionError:pass
    else:raise AssertionError('incomplete or invented replies created an ending')
changes=[lambda s:s['dream']['chapters'][5].update(runs=2),
    lambda s:s['dream']['chapters'][5].update(bestStars=2),
    lambda s:s['dream']['riddles']['post-1'].update(assisted=True),
    lambda s:s['dream']['settings'].update(sound=False),
    lambda s:s['dream'].update(extraReward=True),
    lambda s:s['dream'].update(discoveredEndings=['lanterns','dawn','dawn']),
    lambda s:s['dream'].update(discoveredEndings=['dawn']),
    lambda s:s['dream'].update(discoveredEndings=['lanterns','dawn','fourth']),
    lambda s:s['dream']['choices'].update(clock='hold'),
    lambda s:s['collections']['story-5'].update(memories=[0,1])]
for change in changes:
    bad=copy.deepcopy(after);change(bad)
    try:validate_progress(before,bad,dict(letter='send',clock='release'),{'lanterns','dawn'},grants,grants)
    except AssertionError:pass
    else:raise AssertionError('fake/rewarding reread evidence accepted')
try:validate_progress(before,after,dict(letter='send',clock='release'),{'lanterns','dawn'},grants,{**grants,'stardust':13})
except AssertionError:pass
else:raise AssertionError('rereading granted currency')
unearned=copy.deepcopy(before);unearned['dream']['chapters'][4]['completed']=False
try:validate_progress(unearned,after,dict(letter='send',clock='release'),{'lanterns','dawn'},grants,grants)
except AssertionError:pass
else:raise AssertionError('unearned terminal chapter accepted')
print('four real choice combinations map to three endings; 12 false progress/reward records rejected')
`);
  assert.match(output, /12 false progress\/reward records rejected/);
});

const validView = String.raw`
def rect(left,top,width,height):
    return dict(left=left,right=left+width,top=top,bottom=top+height,width=width,height=height)
view=dict(open=True,ending='lanterns',sceneId='lanterns',sceneCount=1,sceneSvgCount=1,
    savedChoices=dict(letter='keep',clock='hold'),sceneChoice=dict(ending='lanterns',letter='keep',clock='hold'),
    choiceLabels=dict(letter='信留窗边',clock='为想念留灯',sky='长夜的窗灯亮着，太阳尚未升起'),
    art=dict(sun=0,lamps=3,emptyChair=1,slot=0,train=0,bench=0,blankPage=0,whale=0,ashi=1,shiguang=1),
    sceneLabel='阿拾和拾光在长桌旁替大家留灯，太阳尚未升起',sceneRect=rect(30,30,260,140),
    title=ENDING_CONTENT['lanterns']['title'],eyebrow=ENDING_CONTENT['lanterns']['eyebrow'],
    lastLine=ENDING_CONTENT['lanterns']['lastLine'],collection='你已收好 3 / 3 种天色',collectionFont=11,
    paragraphs=[dict(text=text,rect=rect(30,200+i*90,260,70),fontSize=14,lineHeight=24,
      fullyVisible=True,scrollWidth=260,clientWidth=260) for i,text in enumerate(ENDING_CONTENT['lanterns']['paragraphs'])],
    home=dict(rect=rect(50,580,220,48),fullyVisible=True,centerHits=True),
    note=dict(text=ENDING_NOTE,rect=rect(30,635,260,30),fullyVisible=True,fontSize=10,lineHeight=15,
      scrollWidth=260,clientWidth=260),
    dialog=rect(10,10,300,660),scrollTop=0,scrollHeight=640,clientHeight=640,
    scrollWidth=298,clientWidth=298,overflowY='auto',pageWidth=320,viewport=dict(width=320,height=680))
`;

test('ending browser view requires the correct illustration, complete original prose and readable 320px layout', () => {
  const output = run(validView + String.raw`
validate_ending_view(view,'lanterns',set(ENDING_CONTENT),phone=True,at_top=True)
changes=[lambda v:v.update(ending='dawn'),lambda v:v.update(sceneId='dawn'),
    lambda v:v.update(sceneCount=2),lambda v:v.update(sceneSvgCount=0),lambda v:v.update(sceneLabel=''),
    lambda v:v.update(title=ENDING_CONTENT['dawn']['title']),lambda v:v['paragraphs'].pop(),
    lambda v:v['paragraphs'][1].update(text='缺失原文'),lambda v:v.update(collection='你已收好 4 / 3 种天色'),
    lambda v:v.update(pageWidth=321),lambda v:v.update(scrollWidth=301),
    lambda v:v.update(overflowY='hidden'),lambda v:v['paragraphs'][0].update(fontSize=13.9),
    lambda v:v['paragraphs'][0].update(lineHeight=20),lambda v:v.update(collectionFont=10),
    lambda v:v['home']['rect'].update(height=43),lambda v:v.update(scrollTop=8),
    lambda v:v['sceneRect'].update(bottom=700),lambda v:v['paragraphs'][1].update(scrollWidth=263),
    lambda v:v['savedChoices'].update(letter='send'),lambda v:v['sceneChoice'].update(clock='release'),
    lambda v:v['choiceLabels'].update(clock='钟声向前'),lambda v:v['art'].update(sun=1),
    lambda v:v['art'].update(lamps=0),lambda v:v['art'].update(emptyChair=0),
    lambda v:v['art'].update(ashi=0),lambda v:v['note'].update(text='缺失尾注'),
    lambda v:v['note'].update(rect=None),lambda v:v['note']['rect'].update(right=311),
    lambda v:v['note'].update(scrollWidth=262)]
for change in changes:
    bad=copy.deepcopy(view);change(bad)
    try:validate_ending_view(bad,'lanterns',set(ENDING_CONTENT),phone=True,at_top=True)
    except AssertionError:pass
    else:raise AssertionError('inaccessible, stale or truncated ending accepted')
print('correct night ending is readable; 30 mismatched, clipped or undersized views rejected')
`);
  assert.match(output, /30 mismatched, clipped or undersized views rejected/);
});

test('phone reading proof requires every complete paragraph, an actual scroll and an uncovered dismissal button', () => {
  const output = run(validView + String.raw`
view.update(scrollHeight=1000,clientHeight=640)
first=copy.deepcopy(view);middle=copy.deepcopy(view);last=copy.deepcopy(view)
for i,p in enumerate(first['paragraphs']):p['fullyVisible']=i==0
first['home'].update(fullyVisible=False,centerHits=False)
middle.update(scrollTop=180)
for i,p in enumerate(middle['paragraphs']):p['fullyVisible']=i==1
middle['home'].update(fullyVisible=False,centerHits=False)
last.update(scrollTop=360)
for i,p in enumerate(last['paragraphs']):p['fullyVisible']=i==2
samples=[first,middle,last]
result=validate_reading_coverage(samples)
assert result['fullyReadParagraphs']==[0,1,2] and result['maxScrollTop']==360
changes=[lambda s:s.pop(1),lambda s:s[-1]['home'].update(centerHits=False),
    lambda s:s[-1]['home'].update(fullyVisible=False),
    lambda s:s[1].update(ending='tender'),lambda s:s[1]['viewport'].update(width=390),
    lambda s:[p.update(scrollTop=0) for p in s],lambda s:s[-1]['note'].update(fullyVisible=False)]
for change in changes:
    bad=copy.deepcopy(samples);change(bad)
    try:validate_reading_coverage(bad)
    except AssertionError:pass
    else:raise AssertionError('incomplete or faked reading accepted')
print('all paragraphs, final note and actual dialog scroll proven; 7 false reading sequences rejected')
`);
  assert.match(output, /7 false reading sequences rejected/);
});

test('ending touch input is enabled after the route and restored even when a phone assertion fails', () => {
  const output = run(String.raw`
class Session:
    def __init__(self):self.events=[];self.detached=False
    async def send(self,method,params):self.events.append((method,params))
    async def detach(self):self.detached=True
class Page:
    def __init__(self):self.context=self;self.session=Session()
    async def new_cdp_session(self,page):
        assert page is self
        return self.session
async def run():
    for fail in [False,True]:
        page=Page()
        try:
            async with ending_touch_environment(page):
                assert page.session.events==[('Emulation.setTouchEmulationEnabled',dict(enabled=True,maxTouchPoints=5))]
                if fail:raise ValueError('strict phone layout assertion failed')
        except ValueError as error:
            assert fail and str(error)=='strict phone layout assertion failed'
        else:assert not fail
        assert page.session.detached
        assert page.session.events==[
            ('Emulation.setTouchEmulationEnabled',dict(enabled=True,maxTouchPoints=5)),
            ('Emulation.setTouchEmulationEnabled',dict(enabled=False))]
    print('normal and failed phone checks restore their own native touch environment')
asyncio.run(run())
`);
  assert.match(output, /normal and failed phone checks restore/);
});

const readingFakes = String.raw`
class ReadingSession:
    def __init__(self,page):self.page=page;self.sent=[];self.detached=False
    async def send(self,method,params):
        assert method=='Input.dispatchTouchEvent'
        self.sent.append(copy.deepcopy(params))
        if self.page.fail_on==params['type'] and not self.page.failed:
            self.page.failed=True
            raise RuntimeError('transport failed at '+params['type'])
        if params['type']=='touchEnd':
            self.page.releases+=1
            self.page.current=copy.deepcopy(self.page.after[min(self.page.releases-1,len(self.page.after)-1)])
    async def detach(self):
        if self.page.fail_on=='detach':raise RuntimeError('transport failed at detach')
        self.detached=True
class ReadingPage:
    def __init__(self,first,after,fail_on=None):
        self.viewport_size=copy.deepcopy(first['viewport']);self.context=self
        self.current=copy.deepcopy(first);self.after=copy.deepcopy(after);self.fail_on=fail_on;self.failed=False
        self.sessions=[];self.releases=0;self.screenshots=[];self.waits=[]
    async def evaluate(self,expression):
        assert expression==ending.ENDING_PROBE
        return copy.deepcopy(self.current)
    async def new_cdp_session(self,page):
        assert page is self
        if self.fail_on=='create':raise RuntimeError('transport failed at create')
        session=ReadingSession(self);self.sessions.append(session);return session
    async def wait_for_timeout(self,delay):
        assert delay in (16,100)
        self.waits.append(delay)
    async def screenshot(self,path,full_page):
        assert full_page
        self.screenshots.append(Path(path).name)

async def exercise_reading(first,after,attempts,error=None,fail_on=None):
    page=ReadingPage(first,after,fail_on)
    with tempfile.TemporaryDirectory() as output:
        result=None
        try:result=await ending.phone_reading(page,output,'fixture',None,'lanterns',set(ENDING_CONTENT))
        except (AssertionError,RuntimeError) as failure:
            assert error and error in str(failure),(error,str(failure))
        else:assert error is None
        files=list(Path(output).glob('*-reading.json'))
        assert len(files)==1
        trace=json.loads(files[0].read_text())
        assert trace['gestureAttemptCount']==attempts and len(trace['gestureAttempts'])==attempts
        assert trace['maxGestureAttempts']==9 and trace['layoutSamples'][0]==first
        if error:
            assert trace['status']=='failed' and error in trace['error']['message']
            assert trace['failureView']==page.current
            assert trace['failureScreenshot'] in page.screenshots
        else:
            assert trace['status']=='complete' and trace['reading']['finalNoteFullyVisible']
            assert result['layoutSamples']==trace['layoutSamples']
            assert result['readingEvidenceFile']==files[0].name
            assert page.screenshots[-1].endswith('-read.png')
        return trace,page
`;

test('phone reader scrolls past an already visible button to the final note and keeps the overflow gate', () => {
  const output = run(validView + readingFakes + String.raw`
async def run_cases():
    # Regression: all three paragraphs and the button are already visible,
    # but the real final note is below the short viewport.
    first=copy.deepcopy(view);first.update(scrollHeight=720,clientHeight=640)
    first['note'].update(fullyVisible=False,rect=rect(30,685,260,30))
    after=copy.deepcopy(view);after.update(scrollHeight=720,clientHeight=640,scrollTop=80)
    trace,page=await exercise_reading(first,[after],1)
    assert len(trace['layoutSamples'])==2 and trace['reading']['maxScrollTop']==80
    assert trace['requiresActualScroll'] and trace['initialOverflowPixels']==80
    assert trace['inputCleanup']['gestureSessionsCreated']==trace['inputCleanup']['gestureSessionsDetached']==1
    assert trace['inputCleanup']['touchEndAcknowledged']==1 and page.sessions[0].detached
    assert [command['type'] for command in trace['gestureAttempts'][0]['dispatches']]==['touchStart']+['touchMove']*12+['touchEnd']

    # Even when the note is initially visible, a small positive overflow
    # still needs measured movement; visibility alone cannot end the loop.
    overflow=copy.deepcopy(view);overflow.update(scrollHeight=642,clientHeight=640)
    moved=copy.deepcopy(overflow);moved['scrollTop']=2
    await exercise_reading(overflow,[moved],1)

    # A genuinely fitting page needs no pointless touch gesture.
    fitting,page=await exercise_reading(view,[view],0)
    assert not fitting['requiresActualScroll'] and not page.sessions

    # Preserve cumulative reading of paragraphs across two actual gestures.
    beginning=copy.deepcopy(first)
    for i,p in enumerate(beginning['paragraphs']):p['fullyVisible']=i==0
    beginning['home'].update(fullyVisible=False,centerHits=False)
    middle=copy.deepcopy(beginning);middle['scrollTop']=40
    for i,p in enumerate(middle['paragraphs']):p['fullyVisible']=i==1
    last=copy.deepcopy(after)
    for i,p in enumerate(last['paragraphs']):p['fullyVisible']=i==2
    completed,_=await exercise_reading(beginning,[middle,last],2)
    assert completed['reading']['fullyReadParagraphs']==[0,1,2]

    # Nine acknowledged gestures with no actual movement must still fail.
    stalled,page=await exercise_reading(overflow,[overflow],9,'long phone ending did not actually scroll')
    assert len(stalled['layoutSamples'])==10 and all(s.detached for s in page.sessions)
    assert all(a['status']=='complete' for a in stalled['gestureAttempts'])
    assert stalled['inputCleanup']['touchEndAcknowledged']==9

    hidden=copy.deepcopy(after);hidden['note']['fullyVisible']=False
    await exercise_reading(first,[hidden],9,'final ending note was not fully readable')

    # An invalid post-gesture layout is saved before its strict validator
    # raises, rather than discarding the only diagnostic measurement.
    tiny=copy.deepcopy(after);tiny['paragraphs'][0]['fontSize']=13.9
    invalid,_=await exercise_reading(first,[tiny],1,'phone ending prose is too small or crowded')
    assert invalid['layoutSamples'][-1]['paragraphs'][0]['fontSize']==13.9
    print('initially visible button no longer skips overflow or final note; bounded failure evidence survives')
asyncio.run(run_cases())
`);
  assert.match(output, /initially visible button no longer skips overflow or final note/);
});

test('phone swipe attempts retain dispatch failures and distinguish release acknowledgement from cleanup', () => {
  const output = run(validView + readingFakes + String.raw`
async def run_cases():
    first=copy.deepcopy(view);first.update(scrollHeight=720,clientHeight=640)
    first['note']['fullyVisible']=False
    after=copy.deepcopy(view);after.update(scrollHeight=720,clientHeight=640,scrollTop=80)
    for where in ['create','touchStart','touchMove','touchEnd','detach']:
        trace,page=await exercise_reading(first,[after],1,'transport failed at '+where,where)
        attempt=trace['gestureAttempts'][0];cleanup=attempt['cleanup']
        assert attempt['status']=='failed' and attempt['error']['message']=='transport failed at '+where
        if where=='create':
            assert not cleanup['sessionCreated'] and not attempt['dispatches']
            assert not cleanup['touchEndAttempted'] and not cleanup['sessionDetached']
        else:
            assert cleanup['sessionCreated'] and cleanup['touchEndAttempted'] and cleanup['detachAttempted']
            assert attempt['dispatches'][-1]['type']=='touchEnd'
            assert cleanup['touchEndAcknowledged']==(where!='touchEnd')
            assert cleanup['sessionDetached']==(where!='detach')
            if where=='detach':assert cleanup['detachError']['message']=='transport failed at detach'
        assert trace['inputCleanup']['allCreatedGestureSessionsDetached']==(where!='detach')
    print('five protocol failure positions preserve attempt, release, detach and failure JSON evidence')
asyncio.run(run_cases())
`);
  assert.match(output, /five protocol failure positions preserve attempt, release, detach and failure JSON/);
});

test('each desktop reread checkpoints its reload invariants before a later phone error', () => {
  const output = run(validView + String.raw`
from contextlib import asynccontextmanager
from types import SimpleNamespace

progress={'dream':dict(version=1,chapters=[dict(completed=True,runs=1,bestStars=3,bestTime=40,bestMemories=3,bestDeaths=0) for _ in range(6)],
    choices=dict(letter='keep',clock='hold'),lastChapter=5,settings=dict(sound=True,reducedMotion=False),
    discoveredEndings=['lanterns'],riddles={'post-1':dict(solved=True,assisted=False)}),
    'collections':{'story-5':dict(memories=[0,1,2],seals=[0,1])}}
grants=dict(stardust=12,inventory={'glow_candy':1},supplyClaims=0)
class Locator:
    async def wait_for(self):pass
class Page:
    def __init__(self):self.viewport_size=dict(width=1280,height=800);self.reloads=0
    def locator(self,selector):return Locator()
    async def evaluate(self,expression):
        assert expression==ending.ENDING_PROBE
        return copy.deepcopy(view)
    async def screenshot(self,**kwargs):pass
    async def wait_for_load_state(self,state):assert state=='networkidle'
    async def reload(self,wait_until):
        assert wait_until=='networkidle';self.reloads+=1
    async def wait_for_function(self,expression):pass
    async def emulate_media(self,**kwargs):assert kwargs==dict(reduced_motion='no-preference')
    async def set_viewport_size(self,size):self.viewport_size=copy.deepcopy(size)
async def read_progress(page):return copy.deepcopy(progress)
async def read_grants(page):return copy.deepcopy(grants)
async def choose(page,driver,key,value,touch=False):
    assert not touch
    progress['dream']['choices'][key]=value
    return {'speaker':'fixture','choice':value}
async def open_ending(page,driver,expected,discovered,touch=False):
    assert not touch
    progress['dream']['discoveredEndings']=sorted(discovered)
    return {'ending':expected,'reloadOrdinal':page.reloads}
async def leave(page,driver,**kwargs):pass
async def click(page,selector,driver):pass
@asynccontextmanager
async def fail_next_phone(page):
    raise RuntimeError('later phone setup failed')
    yield

async def run_case():
    page=Page()
    # The real initial validator still sees complete content and the original
    # earned branch. Only UI transport is replaced in this unit fixture.
    view['collection']='你已收好 1 / 3 种天色'
    replacements=dict(read_progress=read_progress,choose_reply=choose,open_ending=open_ending,
      leave_ending=leave,click_input=click,ending_touch_environment=fail_next_phone)
    original={name:getattr(ending,name) for name in replacements}
    try:
        for name,value in replacements.items():setattr(ending,name,value)
        with tempfile.TemporaryDirectory() as output:
            try:await ending.verify_endings(page,output,'fixture',SimpleNamespace(read_reward_grants=read_grants))
            except RuntimeError as error:assert str(error)=='later phone setup failed'
            else:raise AssertionError('later failure was swallowed')
            assert page.reloads==4 and page.viewport_size==dict(width=1280,height=800)
            files=list(Path(output).glob('*.json'));assert len(files)==4
            for ordinal,(letter,clock,expected) in enumerate(ending.COMBINATIONS,1):
                case=json.loads(Path(output,f'fixture-ending-{letter}-{clock}.json').read_text())
                assert case['choices']==dict(letter=letter,clock=clock) and case['ending']==expected
                assert case['afterRealReload']['reloadOrdinal']==ordinal
                assert case['afterReloadInvariants']['actualChoices']==case['choices']
                assert case['invariants']['chaptersAndScoresUnchanged'] and case['afterReloadInvariants']['rewardGrantsUnchanged']
                assert case['repeatReadDidNotDuplicateDiscovery'] and len(case['replyPortraits'])==2
    finally:
        for name,value in original.items():setattr(ending,name,value)
    print('all four desktop combinations keep completed reload and invariant evidence after a later failure')
asyncio.run(run_case())
`);
  assert.match(output, /all four desktop combinations keep completed reload and invariant evidence/);
});
