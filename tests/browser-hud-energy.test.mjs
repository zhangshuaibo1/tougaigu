import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('browser energy observations keep the live threshold and reject mixed HUD values',()=>{
  const script=String.raw`
import ast,copy,json,math,re
from pathlib import Path
tree=ast.parse(Path('scripts/browser-smoke.py').read_text())
names={'validate_hud_energy','validate_hud_aria_energy'}
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in names],type_ignores=[]),'actual-energy-observation-checks','exec'))
# Independent data from the reproduced old double-throttle catch-up frame:
# live65.143, latest callback63.943, old meter62 versus synchronized meter64.
good=dict(viewport=dict(width=320,height=680),
          runtime=dict(form='body',state='playing',time=7.2,energy=65.143,maxEnergy=100),
          hudSample=dict(form='body',state='playing',time=7.133333333333,energy=63.943,maxEnergy=100),
          timing=dict(observedAt=7200,fullHudWrittenAt=7000),
          meter=dict(role='progressbar',name='拾光灵光',min='0',max='100',value='64',text='恢复中 64%',barPercent=63.943),
          elements=dict(energyLabel=dict(text='恢复中 64%')))
result=validate_hud_energy(good)
assert abs(result['liveDelta']-1.143)<1e-9
assert result['onHudPercent']==63.943 and result['ariaPercent']==64
old=copy.deepcopy(good)
old['meter'].update(value='62',text='恢复中 62%',barPercent=61.843)
old['elements']['energyLabel']['text']='恢复中 62%'
try:validate_hud_energy(old)
except AssertionError as error:
    message=str(error)
    assert 'more than 3' in message
    assert all(value in message for value in ['65.143','63.943','61.843','7200','7000','"width": 320','恢复中 62%']),message
else:raise AssertionError('the reproduced old live discrepancy was accepted')
edge=copy.deepcopy(good);edge['runtime']['energy']=67
assert validate_hud_energy(edge)['liveDelta']==3
rejected=0
def reject(change,expected):
    global rejected
    sample=copy.deepcopy(good);change(sample)
    try:validate_hud_energy(sample)
    except AssertionError as error:
        assert expected in str(error),(expected,str(error));rejected+=1
    else:raise AssertionError('broken energy observation accepted: '+expected)
reject(lambda s:s['runtime'].__setitem__('energy',67.00001),'more than 3')
reject(lambda s:s['hudSample'].__setitem__('energy',64.943),'ARIA energy does not match')
reject(lambda s:s['meter'].__setitem__('barPercent',62),'energy fill does not match')
reject(lambda s:s['elements']['energyLabel'].__setitem__('text','恢复中 63%'),'visible energy label does not match')
reject(lambda s:s['meter'].__setitem__('text','恢复中 63%'),'accessible energy must retain')
reject(lambda s:s['meter'].__setitem__('value','not-a-number'),'invalid accessible energy number')
reject(lambda s:s['hudSample'].__setitem__('form','soul'),'stale form')
full=copy.deepcopy(good)
full['runtime']['energy']=100;full['hudSample']['energy']=99.25
full['meter'].update(value='100',text='灵光充足 100%',barPercent=99.25)
full['elements']['energyLabel']['text']='灵光充足'
assert validate_hud_energy(full)['ariaPercent']==100
soul=copy.deepcopy(good)
soul['runtime'].update(form='soul',energy=22)
soul['hudSample'].update(form='soul',energy=22.6)
soul['meter'].update(value='23',text='灵光 23%',barPercent=22.6)
soul['elements']['energyLabel']['text']='灵光 23%'
assert validate_hud_energy(soul)['ariaPercent']==23
assert rejected==7
# AX snapshot is a later asynchronous read. A legitimate recovery->full
# transition must be checked against that AX sample, not the old DOM prefix.
for aria in ['- text: 阿拾 · 身体\n- text: 恢复中 64%',
             '- text: 阿拾 · 身体\n- progressbar "拾光灵光"\n- text: 灵光充足',
             '- text: 拾光 · 灵魂\n- text: 灵光 23%']:
    validate_hud_aria_energy(aria)
for aria in ['- text: 阿拾 · 身体\n- text: 灵光 23%',
             '- text: 拾光 · 灵魂\n- text: 恢复中 64%',
             '- text: 拾光灵光',
             '- text: 阿拾 · 身体\n- text: 拾光 · 灵魂\n- text: 灵光充足']:
    try:validate_hud_aria_energy(aria)
    except AssertionError:pass
    else:raise AssertionError('incoherent AX energy/form observation accepted')
print('unchanged live<=3 boundary; mixed onHud/bar/label/ARIA rejected; later AX recovery boundary handled')
`;
  const result=spawnSync('python3',['-c',script],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.error?.message||result.stdout);
  assert.match(result.stdout,/unchanged live<=3 boundary/);
});
