import asyncio,importlib.util,json,sys
from pathlib import Path
p=Path('/workspace/scratch/2b18af2db412/tougaigu-v34-framing-prestudy/scripts/browser_cap_framing_v34.py')
sys.path.insert(0,str(p.parent))
spec=importlib.util.spec_from_file_location('framing_study',p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
m.PROBE=m.PROBE.replace('followBudget:game.capCameraFollow,','followBudget:game.capCameraFollow??null,').replace('framing:view,','framing:view??null,')
async def main():
 from playwright.async_api import async_playwright
 out=Path('/tmp/v34-framing-browser-baseline');out.mkdir(exist_ok=True)
 report={'scope':'separate fresh browser contexts on unchanged v33 candidate1d630; normal inputs; not same-state pixel A/B','source':'1d63072bb9a27690ed14b15d3103c6e8a87fa297','cases':[]}
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,args=['--no-sandbox'])
  try:
   for width,height in [(390,844),(320,680)]:
    folder=out/str(width);folder.mkdir(exist_ok=True)
    context=await browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1,has_touch=True,is_mobile=True)
    try:
     page=await context.new_page();await m.instrument(page);await page.goto('http://127.0.0.1:9346/',wait_until='networkidle');await page.wait_for_timeout(1200)
     await m.api.toggle(page,True);await page.wait_for_timeout(700);await m.steer(page,258,422,True);await page.wait_for_timeout(700)
     report['cases'].append({'width':width,'capture':await m.picture(page,folder,'before-near-open')})
    finally:await context.close()
  finally:await browser.close();m.save(out/'report.json',report)
 print(json.dumps({'cases':len(report['cases']),'status':'passed'}))
asyncio.run(main())
