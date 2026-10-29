import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('browser HUD checks reject obscured, truncated and inaccessible observations without launching a browser',()=>{
  // Run the actual Python assertion helper on independent observed-geometry
  // fixtures. These records never enter a DOM, engine, save or browser.
  const script=String.raw`
import ast, copy
from pathlib import Path
tree=ast.parse(Path('scripts/browser-smoke.py').read_text())
names={'rectangles_overlap','rect_contains','validate_hud_geometry'}
namespace={}
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in names],type_ignores=[]),'hud-observation-checks','exec'),namespace)
def rect(x,y,w,h):return dict(left=x,top=y,right=x+w,bottom=y+h,width=w,height=h)
def item(x,y,w,h):
    r=rect(x,y,w,h)
    return dict(rect=r,text='真实提示',visible=True,clientWidth=w,clientHeight=h,scrollWidth=w,scrollHeight=h,
                whiteSpace='normal',textOverflow='clip',lineClamp='none',fontSize=11,textRects=[r.copy()])
e={
 'hud':item(14,80,292,74),'chapter':item(14,80,150,40),'title':item(14,87,64,24),'story':item(95,84,62,36),
 'goals':item(174,80,132,40),'sealGroup':item(174,90,56,18),'memoryGroup':item(238,90,56,18),
 'seals':item(180,90,40,18),'memories':item(244,90,40,18),'form':item(14,126,292,20),
 'formName':item(14,128,72,16),'energy':item(100,134,100,4),'energyLabel':item(214,128,92,16),
 'objectiveBox':item(14,162,292,78),'objective':item(22,170,276,32),'hint':item(22,206,276,25),
 'bubble':item(14,248,292,48),'bubbleLines':item(50,256,248,32),
 'activity':dict(item(22,235,276,25),visible=False),
 'activityName':item(30,237,160,20),'activityCount':item(250,237,40,20)
}
e['bubbleLines']['lineClamp']='2'  # Existing flavor limit is not a current-action truncation.
buttons=[dict(item(95,84,62,36),id='stage-story',centerHits=True),
         dict(item(230,560,62,64),id='stage-toggle',centerHits=True)]
good=dict(viewport=dict(width=320,height=680),elements=e,buttons=buttons,horizontalOverflow=False)
check=namespace['validate_hud_geometry']
assert check(good)==dict(hudToObjectivePx=8,objectiveToBubblePx=8)
wide=copy.deepcopy(good);wide['viewport']['width']=390;assert check(wide)['hudToObjectivePx']==8
rejected=0
def reject(change,expected):
    global rejected
    sample=copy.deepcopy(good);change(sample)
    try:check(sample)
    except AssertionError as error:
        assert expected in str(error),(expected,str(error));rejected+=1
    else:raise AssertionError('a broken observation was accepted: '+expected)
reject(lambda s:s['elements'].__setitem__('form',item(174,104,132,20)),'goals overlaps form')
reject(lambda s:s['elements']['energyLabel'].__setitem__('visible',False),'not visibly readable')
reject(lambda s:s['elements']['hint'].__setitem__('whiteSpace','nowrap'),'single-line truncation')
reject(lambda s:s['elements']['objective'].__setitem__('textOverflow','ellipsis'),'single-line truncation')
reject(lambda s:s['elements']['hint'].__setitem__('lineClamp','2'),'clamps lines')
reject(lambda s:s['elements']['hint'].__setitem__('scrollHeight',40),'hides vertical text')
# Scroll sizes alone can look fine while the actual final line escapes its box.
reject(lambda s:s['elements']['hint'].__setitem__('textRects',[rect(22,206,100,12),rect(22,228,100,12)]),'clipped text line')
reject(lambda s:s['elements'].__setitem__('objectiveBox',item(14,150,292,90)),'6px separation')
reject(lambda s:s['elements'].__setitem__('bubble',item(14,220,292,48)),'covers the current instruction')
reject(lambda s:s['buttons'][1].__setitem__('centerHits',False),'actual input center')
reject(lambda s:s['buttons'].__setitem__(1,dict(item(230,260,62,30),id='stage-toggle',centerHits=True)),'covered by the speech bubble')
reject(lambda s:s['elements']['energyLabel'].__setitem__('fontSize',8),'too small')
reject(lambda s:s.__setitem__('horizontalOverflow',True),'horizontal overflow')
active=copy.deepcopy(good)
active['elements']['objectiveBox']=item(14,162,292,104)
active['elements']['bubble']=item(14,274,292,48)
active['elements']['activity']['visible']=True
assert check(active)['objectiveToBubblePx']==8
active['elements']['activityCount']=item(150,237,40,20)
try:check(active)
except AssertionError as error:assert 'activity name overlaps' in str(error);rejected+=1
else:raise AssertionError('activity labels overlapped without detection')
festival=copy.deepcopy(good)
festival['elements']['objectiveBox']=item(14,162,292,144)
festival['elements']['bubble']=item(14,314,292,48)
festival['elements']['festivalBar']=item(22,240,276,52)
festival['elements']['seasonButton']=item(22,248,180,36)
festival['elements']['backStory']=item(210,248,80,36)
assert check(festival)['objectiveToBubblePx']==8
bad_festival=copy.deepcopy(festival)
bad_festival['elements']['backStory']=item(188,248,80,36)
try:check(bad_festival)
except AssertionError as error:assert 'return buttons overlap' in str(error);rejected+=1
else:raise AssertionError('festival return overlaps the story button without detection')
bad_festival=copy.deepcopy(festival)
bad_festival['elements']['festivalBar']=item(8,240,276,52)
try:check(bad_festival)
except AssertionError as error:assert 'return bar escaped' in str(error);rejected+=1
else:raise AssertionError('festival return escaped the reading panel without detection')
assert rejected==16
print('four readable observations accepted; sixteen concrete HUD regressions rejected')
`;
  const result=spawnSync('python3',['-c',script],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.error?.message||result.stdout);
  assert.match(result.stdout,/sixteen concrete HUD regressions rejected/);
});
