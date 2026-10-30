"""Test helper ownership/error contracts, then run its real borrowed-browser API.

Synthetic failures below are transport fixtures, never claimed as game/browser
playthroughs. The real final call uses the original trusted input driver.
"""
import argparse,asyncio,ast,copy,hashlib,importlib.util,json,subprocess,sys,time
from datetime import datetime,timezone
from pathlib import Path
from types import SimpleNamespace
ROOT=Path(__file__).resolve().parents[2];SCRIPTS=ROOT/'scripts';sys.path.insert(0,str(SCRIPTS))
def load(name,path):
    spec=importlib.util.spec_from_file_location(name,path);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
helper=load('framing_helper_under_test',SCRIPTS/'browser_cap_framing_v34.py')
assert 'api' not in helper.__dict__

class FakePage:
    def __init__(self):self.url=None;self.focused=False
    def on(self,*a):pass
    def set_default_timeout(self,*a):pass
    async def route(self,*a):pass
    async def goto(self,url,**kw):self.url=url
    async def wait_for_timeout(self,*a):pass
    async def evaluate(self,*a):return {'version':'0.0.0'}
    async def screenshot(self,*a,**kw):pass
    def locator(self,*a):self.focused=True;raise AssertionError('version mismatch must reject before input')
class FakeContext:
    def __init__(self):self.closed=False;self.page=FakePage()
    async def new_page(self):return self.page
    async def close(self):self.closed=True
class FakeBrowser:
    version='synthetic contract fixture, not Chromium'
    def __init__(self,reject=False):self.context=FakeContext();self.close_calls=0;self.reject=reject;self.new_calls=0
    async def new_context(self,**kw):
        self.new_calls+=1
        if self.reject:raise RuntimeError('synthetic context creation error')
        return self.context
    async def close(self):self.close_calls+=1

async def main(args):
    out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
    contracts={};api_fixture=SimpleNamespace(PROBE='');settings=SimpleNamespace(version=args.version,url=args.url)
    missing=FakeBrowser()
    try:await helper.exercise_cap_framing(missing,SimpleNamespace(version=None,url=args.url),out/'missing-version',api_fixture)
    except AssertionError:pass
    else:raise AssertionError('missing expected version accepted')
    assert missing.new_calls==0 and missing.close_calls==0;contracts['explicitVersionBeforeResources']=True
    for name,reject in [('wrong-version',False),('context-error',True)]:
        browser=FakeBrowser(reject)
        try:await helper.exercise_cap_framing(browser,settings,out/name,api_fixture)
        except (AssertionError,RuntimeError):pass
        else:raise AssertionError('synthetic failure swallowed')
        report=json.loads((out/name/'cap-framing/report.json').read_text());assert report['status']=='failed' and report['cases'][0]['status']=='failed'
        assert browser.close_calls==0
        if not reject:assert browser.context.closed and not browser.context.page.focused and browser.context.page.url==args.url
        contracts[name]={'failureReported':True,'failurePropagated':True,'callerBrowserNotClosed':True,'ownedContextClosed':not reject,'scope':'synthetic API ownership fixture'}
    before=ast.parse(subprocess.check_output(['git','-C',str(ROOT),'show','1d63072bb9a27690ed14b15d3103c6e8a87fa297:scripts/browser-smoke.py'],text=True))
    after=ast.parse((SCRIPTS/'browser-smoke.py').read_text());hooks=[]
    class Strip(ast.NodeTransformer):
        def visit_If(self,node):
            if isinstance(node.test,ast.Compare) and any(isinstance(c,ast.Constant) and c.value==34 for c in node.test.comparators):hooks.append(node);return None
            return self.generic_visit(node)
    stripped=Strip().visit(copy.deepcopy(after));assert len(hooks)==1 and ast.dump(before)==ast.dump(stripped)
    contracts['oldSmokeAstExactAfterOnlyNewHook']=True;contracts['hookLines']=hooks[0].end_lineno-hooks[0].lineno+1
    helper.save(out/'adapter-contracts.json',contracts)
    api=load('framing_original_input',SCRIPTS/'browser-smoke.py')
    from playwright.async_api import async_playwright
    start=datetime.now(timezone.utc).isoformat();clock=time.monotonic()
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,args=['--no-sandbox'])
        try:
            summary=await helper.exercise_cap_framing(browser,settings,out/'real-browser',api)
            assert browser.is_connected() and not browser.contexts
            summary['callerBrowserRemainedConnected']=True;summary['ownedContextsClosed']=True
        finally:await browser.close()
    execution={'startedAt':start,'completedAt':datetime.now(timezone.utc).isoformat(),'elapsedSeconds':time.monotonic()-clock,'summary':summary,
      'helperSha256':hashlib.sha256((SCRIPTS/'browser_cap_framing_v34.py').read_bytes()).hexdigest()}
    helper.save(out/'adapter-execution.json',execution);print(json.dumps(execution,ensure_ascii=False))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--url',required=True);parser.add_argument('--version',required=True);parser.add_argument('--output',required=True)
    asyncio.run(main(parser.parse_args()))
