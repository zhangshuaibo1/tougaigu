import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const helpers=String.raw`
import ast,asyncio,copy,json
from pathlib import Path
from urllib.parse import urlparse
tree=ast.parse(Path('scripts/browser-smoke.py').read_text())
names={'validate_story_portrait','validate_portrait_request','PortraitRequestGate'}
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,(ast.FunctionDef,ast.ClassDef)) and n.name in names],type_ignores=[]),'actual-portrait-browser-gates','exec'))
`;
function run(script){
  const result=spawnSync('python3',['-c',helpers+script],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.error?.message||result.stdout);
  return result.stdout;
}

test('portrait evidence rejects old visible pixels, missing neutral state and an undecoded current speaker',()=>{
  const output=run(String.raw`
expected=dict(page='02 / 03',speaker='阿拾',word='鸣笛',file='portrait-hero-curious.svg')
pending=dict(open=True,page='02 / 03',speaker='阿拾',text='我的头顶怎么在鸣笛？',alt='阿拾',
    source='./assets/portrait-hero-curious.svg',currentSrc='https://game.example/assets/portrait-moth.svg',
    complete=False,naturalWidth=200,naturalHeight=200,pending=True,phase='loading',visibility='hidden',display='block',
    placeholder=dict(content='"✧"',display='grid',visibility='visible',opacity=.5,width=200,height=200))
# Browsers can retain the previous decoded resource while changing src. It is
# harmless only while the actual image is hidden and the neutral state exists.
validate_story_portrait(pending,expected,pending=True)
ready=copy.deepcopy(pending)
ready.update(complete=True,currentSrc='https://game.example/assets/portrait-hero-curious.svg',pending=False,phase='ready',visibility='visible')
validate_story_portrait(ready,expected)
def reject(sample,mutate,needle,loading=False):
    bad=copy.deepcopy(sample);mutate(bad)
    try:validate_story_portrait(bad,expected,pending=loading)
    except AssertionError as error:
        assert needle in str(error),str(error)
        assert 'actual' in str(error) and 'portrait-hero-curious.svg' in str(error)
    else:raise AssertionError('invalid portrait evidence was accepted: '+needle)
reject(pending,lambda s:s.update(visibility='visible'),'previous portrait is visible',True)
reject(pending,lambda s:s['placeholder'].update(content='none'),'no visible neutral placeholder',True)
reject(pending,lambda s:s.update(phase='ready'),'loading state',True)
reject(ready,lambda s:s.update(currentSrc='https://game.example/assets/portrait-moth.svg'),'pixels still belong')
reject(ready,lambda s:s.update(naturalWidth=0),'decoded dimensions')
reject(ready,lambda s:s.update(complete=False),'decoded dimensions')
reject(ready,lambda s:s.update(speaker='拾光'),'speaker and portrait alternative disagree')
reject(ready,lambda s:s.update(alt='绒绒'),'speaker and portrait alternative disagree')
reject(ready,lambda s:s.update(page='03 / 03'),'wrong active story page')
reject(ready,lambda s:s.update(open=False),'wrong active story page')
reject(ready,lambda s:s.update(pending=True,visibility='hidden'),'was not exposed')
print('pending old resource may stay hidden; 11 misleading visible/decoded/page states rejected')
`);
  assert.match(output,/11 misleading/);
});

test('delayed portrait responses are unchanged and only an already obsolete exact request may be cancelled',()=>{
  const output=run(String.raw`
class Request:
    failure=None
class Route:
    def __init__(self,gate,cancel=False):
        self.request=Request();self.gate=gate;self.response=object();self.cancel=cancel;self.sent=None
    async def fetch(self):return self.response
    async def fulfill(self,response):
        assert response is self.response,'the original response must be forwarded unchanged'
        self.sent=response
        if self.cancel:
            def failed():
                self.request.failure='net::ERR_ABORTED';self.gate.failed(self.request)
            if self.cancel=='late':asyncio.get_running_loop().call_later(0,failed)
            else:failed()
            raise RuntimeError('the intercepted obsolete request was cancelled')
        self.gate.finished(self.request)
    async def continue_(self):raise AssertionError('a repeated image request was unexpected')
async def exercise(cancel=False):
    gate=PortraitRequestGate('https://game.example/assets/portrait-hero-curious.svg','rapid-next' if cancel else 'slow-current')
    route=Route(gate,cancel);task=asyncio.create_task(gate.route(route))
    await asyncio.wait_for(gate.arrived.wait(),1)
    assert route.sent is None and not gate.handled.is_set(),'response escaped before the gate was released'
    unrelated=Request();unrelated.failure='net::ERR_ABORTED';gate.failed(unrelated)
    assert gate.failure is None and not gate.network_done.is_set(),'another request entered the cancellation budget'
    gate.obsolete=bool(cancel)
    record,allowed=await gate.finish();await task
    assert route.sent is route.response
    assert record['requestCount']==1 and record['obsoleteAtFailure']==bool(cancel)
    if cancel:assert allowed==dict(url=gate.url,failure='net::ERR_ABORTED')
    else:assert allowed is None and record['fulfilled']
    return record
async def run():
    normal=await exercise();cancelled=await exercise(True)
    await exercise('late') # route error may precede the requestfailed event
    for changes in [dict(obsolete=False),dict(obsoleteAtFailure=False),dict(failure='net::ERR_FAILED'),dict(requestCount=2)]:
        bad={**cancelled,**changes}
        try:validate_portrait_request(bad)
        except AssertionError:pass
        else:raise AssertionError('unexpected request failure accepted: '+str(changes))
    for changes in [dict(handlerError='transport error'),dict(fulfilled=False)]:
        try:validate_portrait_request({**normal,**changes})
        except AssertionError:pass
        else:raise AssertionError('unexplained route failure accepted')
    print('real response identity retained; exact obsolete cancellation accepted; six broader failure cases rejected')
asyncio.run(run())
`);
  assert.match(output,/six broader failure cases rejected/);
});
