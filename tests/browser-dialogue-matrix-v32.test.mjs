import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

// Synthetic measurements exercise the evidence validator only. They are never
// fed to the game and do not constitute a browser-layout result.
const setup=String.raw`
import copy,json,sys,tempfile
from pathlib import Path
sys.path.insert(0,'scripts')
import browser_dialogue_matrix_v32 as matrix
def rect(x,y,w,h):return dict(left=x,top=y,right=x+w,bottom=y+h,width=w,height=h)
def surface(width=900):
 return dict(viewport=dict(width=width,height=800),dpr=1,version='32.0.0',
  communicationsDisplay='grid' if width>=900 else 'contents',horizontalOverflow=False,openDialogs=[],
  canvas=dict(rect=rect(0,80,width,640),width=width,height=640,cssWidth=width,cssHeight=640,
   transforms=[dict(id='dream-canvas',transform='none',translate='none',rotate='none',scale='none')]),
  controls=[dict(id='stage-toggle',rect=rect(width-180,650,76,64),visible=True,transform='none',centerHits=True,isButton=True),
   dict(id='stage-jump',rect=rect(width-94,650,76,64),visible=True,transform='none',centerHits=True,isButton=True)])
def reject(fn,expected):
 try:fn()
 except AssertionError as error:assert expected in str(error),(expected,str(error))
 else:raise AssertionError('invalid observation accepted: '+expected)
`;
function run(body){
  const result=spawnSync('python3',['-c',setup+'\n'+body],{cwd:new URL('..',import.meta.url),encoding:'utf8',timeout:30000});
  assert.equal(result.status,0,result.stderr||result.error?.message||result.stdout);
}

test('boundary pairing requires actual matching Canvas buffers and control rectangles even below 900px',()=>run(String.raw`
for width in [899,900]:
 a=surface(width);b=copy.deepcopy(a)
 assert matrix.compare_surfaces(a,b)['status']=='matched'
 b['canvas']['width']+=1;reject(lambda:matrix.compare_surfaces(a,b),'Canvas changed width')
 b=copy.deepcopy(a);b['canvas']['rect']['height']+=2;reject(lambda:matrix.compare_surfaces(a,b),'Canvas changed height')
 b=copy.deepcopy(a);b['controls'][0]['rect']['left']+=1;reject(lambda:matrix.compare_surfaces(a,b),'stage-toggle changed left')
 b=copy.deepcopy(a);b['controls'][0]['visible']=False;reject(lambda:matrix.compare_surfaces(a,b),'presentation changed')
 b=copy.deepcopy(a);b['dpr']=2;reject(lambda:matrix.compare_surfaces(a,b),'DPR differs')
 b=copy.deepcopy(a);b['controls'].pop();reject(lambda:matrix.compare_surfaces(a,b),'control set changed')
`));

test('breakpoint checks reject a desktop grid leaking to 899px and obstructed inputs',()=>run(String.raw`
assert matrix.validate_surface(surface(900),True)['status']=='passed'
assert matrix.validate_surface(surface(899),False)['status']=='passed'
s=surface(899);s['communicationsDisplay']='grid';reject(lambda:matrix.validate_surface(s,False),'breakpoint treatment')
s=surface();s['controls'][0]['centerHits']=False;reject(lambda:matrix.validate_surface(s,True),'obscured input center')
s=surface();s['controls'][0]['rect']['bottom']=810;reject(lambda:matrix.validate_surface(s,True),'outside viewport')
s=surface();s['horizontalOverflow']=True;reject(lambda:matrix.validate_surface(s,True),'overflowing')
s=surface();s['openDialogs']=['pause-dialog'];reject(lambda:matrix.validate_surface(s,True),'obscured')
`));

test('CSS ablation baseline is the exact latest accepted v31 pair and detects corrupted evidence',()=>run(String.raw`
source=matrix.load_baseline()
assert source['commit']=='7ba7c5e00a6a32032e5becf5131a527322d03ac3'
assert [s['sha256'] for s in source['styles']]==[
 'd493a4f215231dae11d71617e1b972fa21c41b7e9cf1303b4ea7cf09412b9fc3',
 'e80091822b14c618a820cdda14f2a56ddfc2f859bf05176b251d03156b288fd1']
assert all('.stage-communications' not in s['content'] for s in source['styles'])
with tempfile.TemporaryDirectory() as folder:
 path=Path(folder)/'baseline.json';source['styles'][0]['content']+='body{zoom:.8}'
 path.write_text(json.dumps(source));reject(lambda:matrix.load_baseline(path),'digest mismatch')
 source['commit']='old-or-unverified';path.write_text(json.dumps(source));reject(lambda:matrix.load_baseline(path),'unexpected CSS ablation source')
`));
