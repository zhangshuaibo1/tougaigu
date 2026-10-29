import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

const helpers=String.raw`
import ast,copy,json,math
from pathlib import Path
from urllib.parse import urlparse
tree=ast.parse(Path('scripts/browser_post_v28.py').read_text())
names={'validate_post_exit','validate_post_rider','validate_post_settlement','validate_post','validate_post_exit_input','validate_fresh_result_touch'}
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in names],type_ignores=[]),'actual-post-browser-gates','exec'))
POST_FILE='post-painted-v28.webp'
`;
function run(script){
  const r=spawnSync('python3',['-c',helpers+script],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
  assert.equal(r.status,0,r.stderr||r.error?.message||r.stdout);
  return r.stdout;
}

test('post-office book evidence requires the same actual rider for a complete horizontal period',()=>{
  const output=run(String.raw`
period=2*math.pi/.7
samples=[]
for i in range(121):
    t=(period+.1)*i/120;x=1010+185*math.sin(.7*t)
    samples.append(dict(runId=4,bodyIdentity=9,chapterIndex=5,mode='story',state='playing',form='body',deaths=0,time=t,
        body=dict(x=x+36,y=465,w=30,vx=0,grounded=True,platform='last-stage'),input=dict(x=0,y=0),
        mover=dict(id='last-stage',x=x,y=465,w=190,h=20,dx=185*.7*math.cos(.7*t)/60,range=185,speed=.7)))
result=validate_post_rider(samples)
assert result['fullCycle'] and result['elapsed']>=period and result['horizontalTravel']>365
assert result['maxSoleError']==0 and result['maxRelativeHorizontalDrift']<1e-9
def reject(change,needle):
    bad=copy.deepcopy(samples);change(bad)
    try:validate_post_rider(bad)
    except AssertionError as error:assert needle in str(error),(needle,str(error))
    else:raise AssertionError('misleading post book carry accepted: '+needle)
reject(lambda s:s[40].update(bodyIdentity=10),'changed run, body')
reject(lambda s:s[40].update(runId=5),'changed run, body')
reject(lambda s:s[40].update(deaths=1),'changed run, body')
reject(lambda s:s[40].update(chapterIndex=4),'changed run, body')
reject(lambda s:s[40].update(form='soul'),'interrupted')
reject(lambda s:s[40].update(time=-1),'time reversed')
reject(lambda s:s[40]['body'].update(platform=None),'actual floating-book attachment')
reject(lambda s:s[40]['body'].update(grounded=False),'actual floating-book attachment')
reject(lambda s:s[40]['body'].update(y=467),'contact or relative carry drifted')
reject(lambda s:s[40]['body'].update(x=s[40]['body']['x']+2),'contact or relative carry drifted')
reject(lambda s:s[40]['input'].update(x=1),'held direction input')
reject(lambda s:s[40]['body'].update(vx=1),'held direction input')
reject(lambda s:s.__delitem__(slice(-4,None)),'omitted part')
reject(lambda s:[p['mover'].update(dx=1) for p in s],'both actual floating-book')
print('full actual horizontal period accepted; 14 misleading rider traces rejected')
`);
  assert.match(output,/14 misleading rider/);
});

test('final post-office exit is the authored early exit while frozen, never a fictitious full-swing crossing',()=>{
  const output=run(String.raw`
hazard=dict(kind='pendulum',x=2350,y=215,length=310,swing=.58,r=30,frozen=4.5)
def sample(x,t,remaining,state='playing',form='body'):
    return dict(runId=2,bodyIdentity=11,chapterIndex=5,mode='story',state=state,form=form,deaths=0,time=t,
                body=dict(x=x,y=560,w=30,grounded=True),hazards=[{**hazard,'frozen':remaining}],input=dict(x=1,y=0))
frozen=sample(2108,10,4.5,form='soul')
samples=[sample(2110,10.02,4.48),sample(2250,10.7,3.8),sample(2410,11.4,3.1)]
done=sample(2489,11.7,2.8,state='complete')
result=validate_post_exit(frozen,samples,done)
assert result['bodyExitBeforeFullSwingRight'] and result['remainingFreezeAtExit']==2.8
assert done['body']['x']<result['fullSwingRight']
def reject(change,needle):
    f=copy.deepcopy(frozen);s=copy.deepcopy(samples);d=copy.deepcopy(done);change(f,s,d)
    try:validate_post_exit(f,s,d)
    except AssertionError as error:assert needle in str(error),(needle,str(error))
    else:raise AssertionError('unproven final approach accepted: '+needle)
reject(lambda f,s,d:s[1].update(bodyIdentity=99),'changed run, body')
reject(lambda f,s,d:s[1].update(deaths=1),'changed run, body')
reject(lambda f,s,d:s[1].update(chapterIndex=4),'changed run, body')
reject(lambda f,s,d:s[1].update(form='soul'),'actual body')
reject(lambda f,s,d:s[1].update(time=0),'time reversed')
reject(lambda f,s,d:s[1]['hazards'][0].update(frozen=0),'thawed')
reject(lambda f,s,d:d['hazards'][0].update(frozen=0),'thawed')
reject(lambda f,s,d:d.update(state='playing'),'authored exit')
reject(lambda f,s,d:d['body'].update(x=2400),'authored exit')
reject(lambda f,s,d:s.pop(),'too few actual')
print('real early terminal exit accepted; ten missing or unsafe approaches rejected')
`);
  assert.match(output,/ten missing or unsafe/);
});

test('each legitimate full replay adds exactly one chapter run without changing other chapter results or choices',()=>{
  const output=run(String.raw`
before=dict(chapters=[dict(completed=True,runs=1,bestStars=3) for _ in range(6)],choices=dict(letter='keep',clock='hold'))
after=copy.deepcopy(before);after['chapters'][5]['runs']+=1
assert validate_post_settlement(before,after)['legitimateCompletedRunsAdded']==1
three=copy.deepcopy(before);three['chapters'][5]['runs']+=3
assert validate_post_settlement(before,three,3)['legitimateCompletedRunsAdded']==3
for change in [lambda s:s['chapters'][5].update(runs=before['chapters'][5]['runs']),
               lambda s:s['chapters'][5].update(runs=before['chapters'][5]['runs']+2),
               lambda s:s['chapters'][5].update(completed=False),
               lambda s:s['chapters'][2].update(runs=3),
               lambda s:s['choices'].update(letter='send')]:
    bad=copy.deepcopy(after);change(bad)
    try:validate_post_settlement(before,bad)
    except AssertionError:pass
    else:raise AssertionError('duplicate/missing/unrelated settlement accepted')
print('legitimate replay counts remain separate from ending rereads')
`);
  assert.match(output,/separate from ending rereads/);
});

test('post-office ready, failed and delayed states require actual native pixels of the intended scene',()=>{
  const output=run(String.raw`
ready=dict(status='ready',frame=True,width=2172,height=724,complete=True,imageSource='https://example.test/assets/'+POST_FILE,
           lampLit=[False,False],lightAmounts=[0,0])
failed=dict(status='error',frame=False,width=0,height=0,complete=False,imageSource=None,lampLit=[True,True],lightAmounts=[1,1])
validate_post(ready);validate_post(failed,'error');validate_post({**failed,'status':'loading'},'loading')
for sample,kind,change in [(ready,'ready',dict(frame=False)),(ready,'ready',dict(complete=False)),
    (ready,'ready',dict(width=1)),(ready,'ready',dict(imageSource='https://example.test/assets/coast-painted-v27.webp')),
    (failed,'error',dict(frame=True)),(failed,'error',dict(imageSource=ready['imageSource'])),
    (failed,'error',dict(width=2172)),(failed,'error',dict(status='ready'))]:
    try:validate_post({**sample,**change},kind)
    except AssertionError:pass
    else:raise AssertionError('unproven painted post office accepted')
print('a late or failed primary image cannot masquerade as a ready post office')
`);
  assert.match(output,/cannot masquerade/);
});

test('real release at completion preserves the result and blocks any old-gesture retargeted click',()=>{
  const output=run(String.raw`
def event(kind,target=None,direction=None,pointer=31,state='playing',form='soul',at=1,dialogs=None,blocked=False):
    return dict(type=kind,targetId=target,direction=direction,pointerId=pointer,pointerType='touch',isTrusted=True,
                runId=2,bodyIdentity=11,state=state,form=form,at=at,dialogs=dialogs or [],
                defaultPreventedAfter=blocked,dialogsAfter=dialogs or [])
events=[]
for index,target in enumerate(['stage-jump','stage-toggle']):
    events.extend(event(kind,target,pointer=31+index,at=index*10+i) for i,kind in enumerate(['pointerdown','pointerup','click']))
events.extend([
 event('pointerdown',direction='right',pointer=41,form='body',at=30),
 event('pointerup',direction='right',pointer=41,state='complete',form='body',at=50,dialogs=['result-dialog']),
 event('click','result-story',pointer=41,state='complete',form='body',at=51,dialogs=['result-dialog'],blocked=True)])
current=dict(result=dict(visible=True),dialogs=['result-dialog'],game=dict(runId=2,bodyIdentity=11))
result=validate_post_exit_input(events,current,True)
assert result['resultRetained'] and len(result['oldGestureBlockedClicks'])==1
assert validate_post_exit_input(events[:-1],current,True)['oldGestureBlockedClicks']==[]
# A browser that does not produce the trailing click is valid. When it does,
# the exact old pointer must be consumed and the result must remain open.
def reject(change):
    e=copy.deepcopy(events);s=copy.deepcopy(current);change(e,s)
    try:validate_post_exit_input(e,s,True)
    except AssertionError:pass
    else:raise AssertionError('old gesture boundary violation accepted')
reject(lambda e,s:e[-1].update(defaultPreventedAfter=False))
reject(lambda e,s:e[-1].update(dialogsAfter=['story-dialog']))
reject(lambda e,s:s.update(dialogs=['story-dialog']))
reject(lambda e,s:s['result'].update(visible=False))
reject(lambda e,s:e[-1].update(pointerId=99))
reject(lambda e,s:e[-2].update(pointerId=99))
reject(lambda e,s:e[-2].update(state='playing'))
reject(lambda e,s:e[-2].update(at=0))
reject(lambda e,s:e[-3].update(form='soul'))
reject(lambda e,s:e[2].update(isTrusted=False))
reject(lambda e,s:e[2].update(defaultPreventedAfter=True))
reject(lambda e,s:e.append(copy.deepcopy(e[2])))
print('native old-gesture clicks are optional but cannot advance the result; twelve misleading traces rejected')
`);
  assert.match(output,/twelve misleading traces/);
});

test('a new intentional native result tap remains usable after the old gesture is consumed',()=>{
  const output=run(String.raw`
events=[dict(type=kind,targetId='result-story',pointerId=52,pointerType='touch',isTrusted=True,
             dialogs=['result-dialog'],defaultPreventedAfter=False)
        for kind in ['pointerdown','pointerup','click']]
after=dict(dialogs=['story-dialog'],game=dict(state='complete'))
result=validate_fresh_result_touch(events,after)
assert result['freshDownUpClick'] and result['intentionalClickAllowed'] and result['realOutroOpened']
for change in [lambda e,s:e.pop(0),lambda e,s:e[-1].update(pointerId=53),
               lambda e,s:e[-1].update(defaultPreventedAfter=True),lambda e,s:e[-1].update(isTrusted=False),
               lambda e,s:e[0].update(dialogs=[]),lambda e,s:s.update(dialogs=['result-dialog'])]:
    e=copy.deepcopy(events);s=copy.deepcopy(after);change(e,s)
    try:validate_fresh_result_touch(e,s)
    except AssertionError:pass
    else:raise AssertionError('missing/blocked/non-native result continuation accepted')
print('fresh actual result tap reaches outro; six missing or incorrectly blocked activations rejected')
`);
  assert.match(output,/six missing or incorrectly blocked/);
});
