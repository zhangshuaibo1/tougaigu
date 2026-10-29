import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

const helpers=String.raw`
import ast,copy,json,math
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
