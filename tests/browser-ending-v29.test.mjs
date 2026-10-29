import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const helpers = String.raw`
import copy,sys
sys.path.insert(0,'scripts')
from browser_ending_v29 import (ENDING_CONTENT,ending_for_choices,validate_progress,
    validate_ending_view,validate_reading_coverage)
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
    lambda v:v['art'].update(ashi=0)]
for change in changes:
    bad=copy.deepcopy(view);change(bad)
    try:validate_ending_view(bad,'lanterns',set(ENDING_CONTENT),phone=True,at_top=True)
    except AssertionError:pass
    else:raise AssertionError('inaccessible, stale or truncated ending accepted')
print('correct night ending is readable; 26 mismatched, clipped or undersized views rejected')
`);
  assert.match(output, /26 mismatched, clipped or undersized views rejected/);
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
    lambda s:[p.update(scrollTop=0) for p in s]]
for change in changes:
    bad=copy.deepcopy(samples);change(bad)
    try:validate_reading_coverage(bad)
    except AssertionError:pass
    else:raise AssertionError('incomplete or faked reading accepted')
print('all paragraphs and actual dialog scroll proven; 6 false reading sequences rejected')
`);
  assert.match(output, /6 false reading sequences rejected/);
});
