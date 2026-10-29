import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

const helpers=String.raw`
import ast,asyncio,copy,json,math
from pathlib import Path
from urllib.parse import urlparse
tree=ast.parse(Path('scripts/browser_coast_v27.py').read_text())
names={'validate_clock_echo','validate_coast_paint','coast_full_sweep_right','validate_coast_crossing'}
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in names],type_ignores=[]),'actual-coast-browser-gates','exec'))
COAST_FILE='coast-painted-v27.webp'
`;
function run(script){
  const result=spawnSync('python3',['-c',helpers+script],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.error?.message||result.stdout);
  return result.stdout;
}

test('clock browser evidence requires the saved branch, real cap threshold and bounded duration',()=>{
  const output=run(String.raw`
sample=dict(mode='story',chapterIndex=4,clockChoice='release',clockEcho=dict(choice='release',phase='playing',elapsed=.6),
            state='paused',reducedMotion=False,form='soul',capPhase='open',capAge=2,capAmount=1)
validate_clock_echo(sample,'release','playing')
waiting={**sample,'form':'body','capPhase':'closed','clockEcho':dict(choice='release',phase='waiting',elapsed=0)}
validate_clock_echo(waiting,'release','waiting')
settled={**waiting,'reducedMotion':True,'clockEcho':dict(choice='release',phase='settled',elapsed=2.8)}
validate_clock_echo(settled,'release','settled')
for change in [dict(mode='festival'),dict(chapterIndex=3),dict(clockChoice='hold'),dict(capPhase='opening'),
    dict(capAge=1.39),dict(capAmount=.84),dict(reducedMotion=True),dict(form='body'),
    dict(clockEcho=dict(choice='hold',phase='playing',elapsed=.6)),
    dict(clockEcho=dict(choice='release',phase='playing',elapsed=2.81))]:
    try:validate_clock_echo({**sample,**change},'release','playing')
    except AssertionError:pass
    else:raise AssertionError('invalid real clock presentation accepted: '+str(change))
print('saved branch and real cap threshold retained; ten misleading clock observations rejected')
`);
  assert.match(output,/ten misleading clock/);
});

test('pendulum body evidence clears the complete authored swing while each actual freeze remains',()=>{
  const output=run(String.raw`
hazards=[dict(kind='pendulum',x=820,y=215,length=310,swing=.6,r=31),
         dict(kind='pendulum',x=1130,y=180,length=350,swing=.5,r=34),
         dict(kind='pendulum',x=1720,y=215,length=310,swing=.55,r=30)]
expected=[1041.039166752461,1346.798938511471,1927.0330409685043]
for h,right in zip(hazards,expected):assert abs(coast_full_sweep_right(h,30)-right)<1e-9
def sample(x,t,remaining):
    return dict(runId=1,bodyIdentity=17,chapterIndex=4,mode='story',state='playing',form='body',deaths=0,time=t,
                body=dict(x=x,y=560,w=30,grounded=True),hazards=[{**h,'frozen':remaining} for h in hazards])
samples=[sample(585,10,3.4),sample(1044,12,1.4),sample(1348,13.2,.2),sample(1398,13.4,0)]
result=validate_coast_crossing(samples,[0,1]);assert [c['index'] for c in result['crossings']]==[0,1]
assert result['crossings'][0]['remainingFreeze']==1.4 and result['crossings'][1]['remainingFreeze']==.2
validate_coast_crossing([sample(1398,20,4.5),sample(1930,22.4,2.1),sample(1960,22.6,1.9)],[2])
def reject(change):
    bad=copy.deepcopy(samples);change(bad)
    try:validate_coast_crossing(bad,[0,1])
    except AssertionError:pass
    else:raise AssertionError('unsafe or invented pendulum crossing accepted')
reject(lambda s:s[1].update(bodyIdentity=18))
reject(lambda s:s[1].update(deaths=1))
reject(lambda s:s[1].update(form='soul'))
reject(lambda s:s[1].update(chapterIndex=3))
reject(lambda s:s[1].update(time=0))
reject(lambda s:s[1]['body'].update(grounded=False))
reject(lambda s:s[1]['body'].update(y=445))
reject(lambda s:s[1]['hazards'][0].update(frozen=0))
reject(lambda s:s[2]['hazards'][1].update(frozen=0))
reject(lambda s:s[0]['body'].update(x=1050))
reject(lambda s:s.__delitem__(slice(2,None)))
print('all three complete swing bounds verified; eleven unsafe or misleading body crossings rejected')
`);
  assert.match(output,/eleven unsafe or misleading/);
});

test('coast painted readiness cannot be inferred from another chapter or a failed native image',()=>{
  const output=run(String.raw`
ready=dict(status='ready',frame=True,width=2172,height=724,complete=True,imageSource='https://example.test/assets/'+COAST_FILE)
fallback=dict(status='error',frame=False,width=0,height=0,complete=False,imageSource=None)
validate_coast_paint(ready);validate_coast_paint(fallback,'error')
for sample,kind,change in [(ready,'ready',dict(imageSource='https://example.test/assets/library-painted-v26.webp')),
    (ready,'ready',dict(complete=False)),(ready,'ready',dict(frame=False)),
    (fallback,'error',dict(width=2172)),(fallback,'error',dict(imageSource=ready['imageSource']))]:
    try:validate_coast_paint({**sample,**change},kind)
    except AssertionError:pass
    else:raise AssertionError('unproven coast paint accepted')
print('only the actual decoded, drawn coast resource passes the ready gate')
`);
  assert.match(output,/actual decoded, drawn coast/);
});

test('the coast performs its one existing jump observation only at the fresh safe body entry',()=>{
  const output=run(String.raw`
route=next(n for n in tree.body if isinstance(n,ast.AsyncFunctionDef) and n.name=='play_coast_route')
calls=[n for n in ast.walk(route) if isinstance(n,ast.Call) and isinstance(n.func,ast.Attribute) and n.func.attr=='sample_body_jump']
assert len(calls)==1,'the complete coast route must not repeat this jump'
jump=next(i for i,n in enumerate(route.body) if any(isinstance(c,ast.Call) and isinstance(c.func,ast.Attribute) and c.func.attr=='sample_body_jump' for c in ast.walk(n)))
# Execute the unmodified real entry statements; the remaining route belongs
# to the independent full pendulum/crossing browser checks, not this unit stub.
prefix=copy.deepcopy(route);prefix.body=prefix.body[:jump+1]+[ast.Return(value=ast.Name(id='entry_jump',ctx=ast.Load()))]
exec(compile(ast.fix_missing_locations(ast.Module(body=[prefix],type_ignores=[])),'actual-coast-entry','exec'))
start=dict(chapterIndex=4,state='playing',form='body',body=dict(x=105,y=560,grounded=True,vx=0),
           seals=0,memories=0,deaths=0,reducedMotion=False)
class Page:
    def __init__(self,changes=None):self.snapshot=copy.deepcopy(start);self.snapshot.update(changes or {});self.calls=[]
    async def evaluate(self,expression):assert expression=='window.__qaRead()';self.calls.append('read');return self.snapshot
    def locator(self,selector):raise AssertionError('the jump must precede any story or route action')
async def assert_coast_paint(page):page.calls.append('paint-ready')
class Driver:
    async def sample_body_jump(self,page,label,reduced_motion=None):
        assert page.calls==['read','paint-ready'] and label=='candidate-coast-entry'
        assert reduced_motion is page.snapshot['reducedMotion']
        page.calls.append('original-one-Space-driver')
        return dict(rise='captured',fall='captured',landed='captured',observerCleanup=dict(removed=True))
async def main():
    for reduced in [False,True]:
        page=Page(dict(reducedMotion=reduced));result=await play_coast_route(page,None,'candidate',Driver())
        assert result['observerCleanup']['removed'] and page.calls[-1]=='original-one-Space-driver'
    for changes in [dict(chapterIndex=3),dict(state='paused'),dict(form='soul'),dict(body={**start['body'],'x':201}),
                    dict(seals=1),dict(memories=1),dict(deaths=1)]:
        page=Page(changes)
        try:await play_coast_route(page,None,'candidate',Driver())
        except AssertionError:pass
        else:raise AssertionError('unsafe or non-fresh coast entry reached the extra jump')
        assert page.calls==['read']
    print('one original jump at fresh safe entry; seven wrong contexts rejected before input')
asyncio.run(main())
`);
  assert.match(output,/seven wrong contexts rejected before input/);
});
