import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

const helpers=String.raw`
import ast,copy,json,math
from pathlib import Path
from urllib.parse import urlparse
tree=ast.parse(Path('scripts/browser_post_v28.py').read_text())
names={'validate_post_exit','validate_post_rider','validate_post_settlement','validate_post','validate_post_exit_input','validate_fresh_result_touch','validate_post_mushroom','validate_post_mushroom_crossing'}
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

test('an actual short mushroom impulse is retained without inventing a later hold or weakening velocity',()=>{
  const output=run(String.raw`
def frame(at,t,x,vy=0,phase='approach-1420',active=False):
    return dict(at=at,time=t,phase=phase,runId=3,bodyIdentity=13,chapterIndex=5,mode='story',state='playing',form='body',deaths=0,
        body=dict(x=x,y=560,w=30,vy=vy,grounded=vy==0),input=dict(x=1,y=0),
        mushrooms=[dict(x=1450,y=560,w=115,boing=.75 if active else 0,cooldown=.6 if active else 0)])
initial=frame(1000,10,1280)
bounce=frame(1900,10.9,1452,-850,'continuous-right',True)
after=frame(1950,10.95,1460,-782.5,'continuous-right',True)
hold=dict(type='keydown',code='ArrowRight',pointerType=None,direction=None,isTrusted=True,
          runId=3,bodyIdentity=13,phase='continuous-right',at=1850)
evidence=dict(initial=initial,bounce=bounce,after=after,frames=[frame(1800,10.8,1440),bounce,after],
              events=[hold],holdInput=hold,continuityFailure=None)
result=validate_post_mushroom(evidence)
assert result['actualTriggerStage']=='final right hold' and not result['observedBeforeFinalHoldInput']
assert result['bounce']['body']['vy']<-800 and result['after']['body']['vy']>-800
# The old protocol poll could arrive after the impulse's strict window. The
# earlier actual RAF sample is evidence, not a reconstructed or lowered speed.
early=copy.deepcopy(evidence);early['holdInput']=None;early['events']=[]
early['bounce']['phase']='approach-1440'
assert validate_post_mushroom(early)['actualTriggerStage']=='preceding approach movement'
late_hold=copy.deepcopy(evidence);late_hold['holdInput']['at']=1920
assert validate_post_mushroom(late_hold)['observedBeforeFinalHoldInput']
touch=copy.deepcopy(evidence)
touch['holdInput'].update(type='pointerdown',code=None,pointerType='touch',direction='right')
assert not validate_post_mushroom(touch)['observedBeforeFinalHoldInput']
def reject(change):
    bad=copy.deepcopy(evidence);change(bad)
    try:validate_post_mushroom(bad)
    except AssertionError:pass
    else:raise AssertionError('unproven mushroom impulse accepted')
reject(lambda e:e.update(bounce=None))
reject(lambda e:e['bounce']['body'].update(vy=-800))
reject(lambda e:e['bounce']['body'].update(grounded=True))
reject(lambda e:e['bounce']['mushrooms'][0].update(boing=0))
reject(lambda e:e['bounce']['mushrooms'][0].update(cooldown=0))
reject(lambda e:e['bounce']['mushrooms'][0].update(x=745))
reject(lambda e:e['bounce'].update(bodyIdentity=14))
reject(lambda e:e['bounce'].update(runId=4))
reject(lambda e:e['bounce'].update(time=9))
reject(lambda e:e['bounce'].update(at=900))
reject(lambda e:e['initial']['body'].update(x=1451))
reject(lambda e:e['frames'][0].update(deaths=1))
reject(lambda e:e['frames'][0].update(form='soul'))
reject(lambda e:e['frames'][0].update(time=11))
reject(lambda e:e.update(continuityFailure={'bodyIdentity':14}))
reject(lambda e:e.update(frames=[copy.deepcopy(initial)]*241))
reject(lambda e:e.update(events=[copy.deepcopy(hold)]*33))
reject(lambda e:e['holdInput'].update(isTrusted=False))
reject(lambda e:e['holdInput'].update(code='Space'))
reject(lambda e:e['holdInput'].update(at=2000))
reject(lambda e:e['holdInput'].update(type='pointerdown',code=None,pointerType='mouse',direction='right'))
print('actual impulse retained with exact before/after-input provenance; 21 misleading traces rejected')
`);
  assert.match(output,/21 misleading traces rejected/);
});

test('one native right hold must earn safe clearance before release and settle on the root within both original deadlines',()=>{
  const output=run(String.raw`
def frame(at,t,x,y,vy=0,grounded=True,moving=True):
    return dict(at=at,time=t,phase='continuous-right',runId=3,bodyIdentity=13,chapterIndex=5,mode='story',state='playing',form='body',deaths=0,
        body=dict(x=x,y=y,w=30,vx=240 if moving else 0,vy=vy,grounded=grounded),input=dict(x=1 if moving else 0,y=0),
        mushrooms=[dict(x=1450,y=560,w=115,boing=.75,cooldown=.6)],roots=[dict(x=1600,y=390,w=130,h=170)])
initial=frame(1000,10,1280,465,moving=False);safe=frame(2000,11,1420,560,moving=False)
bounce=frame(2240,11.24,1452,560,-850,False)
middle=frame(2600,11.6,1540,300,-200,False);clear=frame(3000,12,1664,340,350,False)
contact=frame(3250,12.25,1680,390,moving=False);after=frame(3350,12.35,1680,390,moving=False)
def event(kind,at):
    return dict(type=kind,code='ArrowRight',pointerType=None,pointerId=None,direction=None,isTrusted=True,repeat=False,
                runId=3,bodyIdentity=13,phase='continuous-right',at=at)
down=event('keydown',2010);up=event('keyup',3030)
evidence=dict(initial=initial,safeStart=safe,bounce=bounce,clearance=clear,firstGroundContact=contact,settled=contact,after=after,
    frames=[safe,bounce,middle,clear,contact,after],events=[{**down,'defaultPreventedAfter':True},{**up,'defaultPreventedAfter':False}],
    holdInput=down,releaseInput=up,continuityFailure=None,repeatedBounce=None,droppedEvents=0,
    observerCleanup=dict(pendingFrame=False,removed=True))
result=validate_post_mushroom_crossing(evidence)
assert result['singleContinuousRightInput'] and result['bounceWallSeconds']==.23 and result['rootWallSeconds']==1.24
touch=copy.deepcopy(evidence)
for event in [touch['holdInput'],touch['releaseInput'],*touch['events']]:
    event.update(type='pointerdown' if event['type']=='keydown' else 'pointerup',code=None,pointerId=41,pointerType='touch',direction='right')
assert validate_post_mushroom_crossing(touch,True)['inputSource']=='Chromium CDP simulated touch'
wide_landing=copy.deepcopy(evidence)
for sample in [wide_landing['firstGroundContact'],wide_landing['settled'],wide_landing['after']]:sample['body']['x']=1700
assert validate_post_mushroom_crossing(wide_landing)['actualRootLanding']['body']['x']==1700
def reject(change,source=evidence,touch=False):
    bad=copy.deepcopy(source);change(bad)
    try:validate_post_mushroom_crossing(bad,touch)
    except AssertionError:pass
    else:raise AssertionError('unproven continuous mushroom/root crossing accepted')
reject(lambda e:e['bounce'].update(at=1990))
reject(lambda e:e['safeStart']['body'].update(x=1451))
reject(lambda e:e['safeStart']['body'].update(vx=1))
reject(lambda e:e['safeStart']['input'].update(x=1))
reject(lambda e:e.update(repeatedBounce=copy.deepcopy(e['bounce'])))
reject(lambda e:e['events'].append({**e['events'][0],'at':2500}))
reject(lambda e:e['events'].append({**e['events'][0],'code':'ArrowLeft','at':2500}))
reject(lambda e:e['events'].append({**e['events'][0],'code':'Space','at':2500}))
reject(lambda e:e['events'].append({**e['events'][1],'type':'pointercancel','at':2500}))
reject(lambda e:e['holdInput'].update(repeat=True))
reject(lambda e:e.update(droppedEvents=1))
reject(lambda e:e['after'].update(at=8011))
reject(lambda e:e['clearance']['body'].update(x=1659))
reject(lambda e:e['clearance']['body'].update(y=400))
reject(lambda e:e['clearance']['body'].update(x=1720))
reject(lambda e:e['releaseInput'].update(at=2900))
reject(lambda e:e['frames'][2]['input'].update(x=0))
reject(lambda e:e['firstGroundContact']['body'].update(y=560))
reject(lambda e:e['firstGroundContact']['roots'][0].update(x=1590))
reject(lambda e:e['settled']['input'].update(x=1))
reject(lambda e:e['after']['body'].update(x=1720))
reject(lambda e:e['events'][0].update(isTrusted=False))
reject(lambda e:e['releaseInput'].update(pointerId=42),touch,True)
reject(lambda e:e['observerCleanup'].update(pendingFrame=True))
reject(lambda e:e['observerCleanup'].update(removed=False))
def late_impulse(e):
    for sample in [e['bounce'],e['clearance'],e['firstGroundContact'],e['after']]:sample['at']+=3000
    e['releaseInput']['at']+=3000;e['events'][1]['at']+=3000
reject(late_impulse)
print('single keyboard/touch hold and non-exact safe landing accepted; 26 invalid crossing traces rejected')
`);
  assert.match(output,/26 invalid crossing traces rejected/);
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
