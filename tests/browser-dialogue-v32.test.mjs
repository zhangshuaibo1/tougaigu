import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

// These are independent measured-geometry fixtures, never injected into a
// browser or a game. They test projections and rejection of actual bad layouts.
const fixture=String.raw`
import copy,importlib.util,json,math,tempfile
from pathlib import Path
spec=importlib.util.spec_from_file_location('dialogue','scripts/browser_dialogue_v32.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
def rect(x,y,w,h):return dict(left=x,top=y,right=x+w,bottom=y+h,width=w,height=h)
def item(x,y,w,h,text='原文',visible=True):
 return dict(rect=rect(x,y,w,h),text=text,visible=visible,clientWidth=w,clientHeight=h,scrollWidth=w,scrollHeight=h,
  glyphRects=[rect(x+2,y+2,max(1,w-4),min(16,h-4))] if visible else [],glyphsTruncated=False,clipAncestors=[],
  display='block',transform='none',pointerEvents='none',whiteSpace='normal',textOverflow='clip',lineClamp='none',fontSize=12,transitionDuration='0.2s, 0.25s')
def sample():
 e=dict(communications=item(24,96,1232,200),hud=item(24,96,1232,60),objectiveBox=item(430,175,700,70),
  objective=item(440,180,680,22),hint=item(440,210,680,25),announcement=item(550,255,400,40),
  bubble=item(24,175,360,90),bubbleLines=item(100,185,270,65),portrait=item(38,190,49,49,text=''))
 e['communications']['display']='grid'
 controls=[dict(item(1100,650,76,64),id='stage-toggle',centerHits=True,isButton=True),
           dict(item(1180,650,76,64),id='stage-jump',centerHits=True,isButton=True),
           dict(item(0,0,0,0,visible=False),id='stage-touch-move',centerHits=False,isButton=False)]
 return dict(schema='desktop-dialogue-v32-1',eligible=True,viewport=dict(width=1280,height=800),mode='story',excluded=[],version='32.0.0',
  state='playing',openDialogs=[],reducedMotion=False,mediaReduced=False,horizontalOverflow=False,elements=e,controls=controls,
  speechParagraphs=[item(100,187,260,25)],semantics=dict(count=1,role='status',live='polite',atomic='true',portraitAlt=''),portraitLoaded=True,
  canvas=dict(rect=rect(0,80,1280,640),width=2560,height=1280,cssWidth=1280,cssHeight=640,
   transforms=[dict(id='dream-canvas',transform='none',translate='none',rotate='none',scale='none')]),
  renderer=dict(dpr=2,scale=1,viewportOffsetY=0,camera=200,shakeX=3),
  actor=dict(bodyMatrix=[1,0,0,1,750,560],headMatrix=[1,0,0,1,750,511],capMatrix=[1,0,0,1,750,511],
   feet=[dict(x=-7,y=0,angle=0),dict(x=7,y=0,angle=0)],grounded=True),
  projectionScope='actual rig regions; not complete silhouette')
def reject(fn,expected):
 try:fn()
 except AssertionError as error:assert expected in str(error),(expected,str(error))
 else:raise AssertionError('bad geometry passed: '+expected)
def move(element,dx,dy):
 for r in [element['rect'],*element['glyphRects']]:
  for key in ['left','right']:r[key]+=dx
  for key in ['top','bottom']:r[key]+=dy
`;

function run(body){
  const result=spawnSync('python3',['-c',fixture+'\n'+body],{cwd:new URL('..',import.meta.url),encoding:'utf8',timeout:30000});
  assert.equal(result.status,0,result.stderr||result.error?.message||result.stdout);
}

test('dialogue projection applies real rig, camera, shake, DPR and buffer rounding exactly',()=>run(String.raw`
s=sample();r=module.project_actor_regions(s)
assert r['face']['rect']==rect(526,576,54,43)
s['actor']['headMatrix']=[0,1,-1,0,750,511]
assert module.project_actor_regions(s)['face']['rect']==rect(525,564,43,54)
s=sample();s['actor']['bodyMatrix']=[-1,0,0,1,750,560];s['actor']['feet'][0]['angle']=math.pi/2
point=module.project_actor_regions(s)['foot0']['points'][0]
assert abs(point['x']-551)<1e-9 and abs(point['y']-632)<1e-9
s=sample();s['canvas']['rect']=rect(0,80,1280.25,640.2);s['canvas'].update(width=2561,cssWidth=1280.25,cssHeight=640.2)
r=module.project_actor_regions(s)['face']['rect']
assert abs(r['left']-526*2560.5/2561)<1e-9 and abs(r['top']-(80+496*1280.4/1280))<1e-9
s['renderer']['viewportOffsetY']=12.5
assert abs(module.project_actor_regions(s)['face']['rect']['top']-(80+(496+12.5)*1280.4/1280))<1e-9
s=sample();s['canvas']['transforms'][0]['rotate']='10deg';reject(lambda:module.project_actor_regions(s),'CSS transform')
s=sample();s['renderer']['scale']=float('nan');reject(lambda:module.project_actor_regions(s),'non-finite')
`));

test('dialogue checker rejects the observed old central overlap and genuine UI/text clipping',()=>run(String.raw`
s=sample();result=module.validate_dialogue_snapshot(s,True)
assert result['status']=='passed' and result['actorAvoidanceChecked'] and result['geometryIsSameFrameAsScreenshot'] is False
old=sample()
for name in ['bubble','bubbleLines','portrait']:move(old['elements'][name],454,395)
for p in old['speechParagraphs']:move(p,454,395)
reject(lambda:module.validate_dialogue_snapshot(old,True),'projected face')
bad=sample();move(bad['elements']['announcement'],0,-50);reject(lambda:module.validate_dialogue_snapshot(bad),'overlaps')
bad=sample();bad['elements']['bubbleLines']['glyphRects'].append(rect(102,260,50,16));reject(lambda:module.validate_dialogue_snapshot(bad),'clips a text line')
bad=sample();bad['speechParagraphs'][0]['clipAncestors']=[dict(x=False,y=True,rect=rect(0,0,1280,190))];reject(lambda:module.validate_dialogue_snapshot(bad),'ancestor vertically')
bad=sample();bad['speechParagraphs'][0]['fontSize']=9;reject(lambda:module.validate_dialogue_snapshot(bad),'too small')
bad=sample();bad['controls'][0]['centerHits']=False;reject(lambda:module.validate_dialogue_snapshot(bad),'covered at its center')
bad=sample();bad['elements']['bubble']['visible']=False;reject(lambda:module.validate_dialogue_snapshot(bad,True),'naturally triggered dialogue was absent')
bad=sample();bad['mediaReduced']=True;reject(lambda:module.validate_dialogue_snapshot(bad),'reduced motion')
bad['elements']['bubble']['transitionDuration']='0s, 0s';assert module.validate_dialogue_snapshot(bad)['status']=='passed'
`));

test('Canvas and control comparison requires paired actual geometry and rejects movement or buffer changes',()=>run(String.raw`
a=sample();b=copy.deepcopy(a);a['version']='31.0.0'
assert module.compare_surface_geometry(a,b)['status']=='matched'
b['canvas']['height']+=1;reject(lambda:module.compare_surface_geometry(a,b),'Canvas changed height')
b=copy.deepcopy(a);move(b['controls'][0],1,0);reject(lambda:module.compare_surface_geometry(a,b),'changed left')
b=copy.deepcopy(a);b['viewport']['width']=900;reject(lambda:module.compare_surface_geometry(a,b),'viewport differs')
b=copy.deepcopy(a);b['controls'].pop();reject(lambda:module.compare_surface_geometry(a,b),'control set changed')
`));

test('outside scopes remain explicit and failed observations preserve original evidence without replay',()=>run(String.raw`
outside=dict(eligible=False,viewport=dict(width=390,height=844),reason='below-desktop-breakpoint')
assert module.validate_dialogue_snapshot(outside,True)['actorAvoidanceChecked'] is False
excluded=dict(eligible=False,viewport=dict(width=1280,height=800),reason='outside-ordinary-story')
reject(lambda:module.validate_dialogue_snapshot(excluded,True),'outside ordinary story')
with tempfile.TemporaryDirectory() as folder:
 s=sample();s['elements']['bubble']['visible']=False
 reject(lambda:module.capture_dialogue(folder,'greenhouse',s,True),'naturally triggered dialogue was absent')
 raw=json.loads((Path(folder)/'greenhouse-dialogue-layout.json').read_text());assert raw['snapshot']==s and raw['status']=='failed'
 assert raw['surfaceComparison']['status']=='not-compared'
 r=module.capture_dialogue(folder,'station',sample());assert r['surfaceComparison']['status']=='not-compared'
`));

test('natural return evidence rejects early, synthetic or unrefreshed speech and requires observer cleanup',()=>run(String.raw`
before=dict(observedAt=2600,lastShownAt=1000,ageMs=1600,form='soul',capPhase='open',chapterIndex=1,runId=4,
 plantStage=2,deaths=0,body=dict(x=597,y=560,grounded=True),state='playing',text='阿拾叶子探出头了，盖子得给它留点地方。',showClass=True,opacity=1)
after={**before,'observedAt':3300,'lastShownAt':2602,'ageMs':698,'form':'body','capPhase':'closed'}
record=dict(initial=copy.deepcopy(before),inputs=[dict(code='KeyE',isTrusted=True,repeat=False,snapshot=copy.deepcopy(before))],
 count=1,active=False,observerRemoved=True,after=after)
assert module.validate_natural_dialogue_return(record)['actualReturnDialogueAgeMs']==698
bad=copy.deepcopy(record);bad['inputs'][0]['snapshot']['ageMs']=1237.8
reject(lambda:module.validate_natural_dialogue_return(bad),'existing dialogue cooldown')
bad=copy.deepcopy(record);bad['after']['lastShownAt']=1000
reject(lambda:module.validate_natural_dialogue_return(bad),'did not refresh')
bad=copy.deepcopy(record);bad['inputs'][0]['isTrusted']=False
reject(lambda:module.validate_natural_dialogue_return(bad),'trusted E')
bad=copy.deepcopy(record);bad['after']['body']['x']+=1
reject(lambda:module.validate_natural_dialogue_return(bad),'changed body')
bad=copy.deepcopy(record);bad['after']['showClass']=False
reject(lambda:module.validate_natural_dialogue_return(bad),'not visible')
bad=copy.deepcopy(record);bad['observerRemoved']=False
reject(lambda:module.validate_natural_dialogue_return(bad),'not removed')
`));
