import asyncio,importlib.util,json,sys
from pathlib import Path
from types import SimpleNamespace
from playwright.async_api import async_playwright
project=Path.cwd();sys.path.insert(0,str(project/'scripts'))
import browser_companion_v33 as companion
assert 'companion_original_driver' not in sys.modules,'importing the companion helper loaded the smoke driver'
spec=importlib.util.spec_from_file_location('companion_callsite_driver',project/'scripts/browser-smoke.py')
api=importlib.util.module_from_spec(spec);spec.loader.exec_module(api)
output=Path('/tmp/v33-companion-adapter-validation')
async def run():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,args=['--no-sandbox'])
  try:
   summary=await companion.exercise_companion(browser,SimpleNamespace(url='http://127.0.0.1:9333/',version='32.0.0'),output,api)
   assert browser.is_connected() and len(browser.contexts)==0,'the helper must release only its contexts and leave the caller browser alive'
   assert summary['baselineCompared'] is False and all(c['version']=='32.0.0' and c['status']=='passed' for c in summary['cases'])
   report=json.loads((output/'companion/report.json').read_text())
   assert report['baselineURL'] is None and all('baselinePicture' not in c for c in report['cases'])
   mismatch=False
   try:companion.validate(report['cases'][0]['captures'][0]['snapshot'],'33.0.0')
   except AssertionError as error:
    mismatch='actualVersion' in str(error) and 'expectedVersion' in str(error)
   assert mismatch,'a real32 snapshot must fail an expected33 check'
   contract={'importDidNotLoadDriver':True,'callerBrowserRemainsOpen':True,'ownContextsReleased':True,'oldSiteNotUsed':True,'strictVersionMismatchRejectedUsingReal32Snapshot':True,'summary':summary}
   (output/'caller-contract.json').write_text(json.dumps(contract,ensure_ascii=False,indent=2)+'\n')
   print(json.dumps(contract,ensure_ascii=False))
  finally:await browser.close()
asyncio.run(run())
