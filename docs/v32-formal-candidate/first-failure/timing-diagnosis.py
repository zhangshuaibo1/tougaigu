"""Short, real-input v32 route with passive app/DOM timing evidence only."""
import argparse, asyncio, functools, http.server, importlib.util, json, re, sys, threading, traceback
from pathlib import Path
ROOT=Path('/workspace/scratch/2b18af2db412/tougaigu-v32-formal')
sys.path.insert(0,str(ROOT/'scripts'))
spec=importlib.util.spec_from_file_location('smoke',ROOT/'scripts/browser-smoke.py')
api=importlib.util.module_from_spec(spec);spec.loader.exec_module(api)
from playwright.async_api import async_playwright

TIMING="""
window.__qaDialogueTimingRead=()=>({at:performance.now(),lastShownAt:Number.isFinite(lastCapBubbleAt)?lastCapBubbleAt:null,
  ageMs:Number.isFinite(lastCapBubbleAt)?performance.now()-lastCapBubbleAt:null,
  shown:document.querySelector('#cap-bubble')?.classList.contains('show'),
  opacity:getComputedStyle(document.querySelector('#cap-bubble')).opacity,
  text:document.querySelector('#cap-bubble-lines')?.textContent,
  chapterIndex:game?.chapterIndex,state:game?.state,form:game?.form,time:game?.time,
  body:game?{x:game.body.x,y:game.body.y,grounded:game.body.grounded}:null,
  capPhase:game?.cap?.phase,plantStage:game?.greenhousePlant?.stage});
const __qaDialogueTimingEvents=[];
function __qaDialogueTimingRecord(kind,detail=null){if(__qaDialogueTimingEvents.length<200)__qaDialogueTimingEvents.push({kind,detail,...window.__qaDialogueTimingRead()});}
const __qaDialogueTimingObserver=new MutationObserver(records=>__qaDialogueTimingRecord('DOM mutation',records.map(r=>({type:r.type,attribute:r.attributeName,target:r.target.id}))));
__qaDialogueTimingObserver.observe(document.querySelector('#cap-bubble'),{subtree:true,attributes:true,attributeFilter:['class'],childList:true,characterData:true});
window.addEventListener('keydown',event=>{if(event.code==='KeyE')__qaDialogueTimingRecord('before trusted E',{isTrusted:event.isTrusted});},true);
const __qaDialogueTimingOriginal=window.__qaDialogueRead;
window.__qaDialogueRead=()=>({...__qaDialogueTimingOriginal(),diagnosticTiming:window.__qaDialogueTimingRead()});
window.__qaDialogueTimingFinish=()=>{__qaDialogueTimingRecord('finish');__qaDialogueTimingObserver.disconnect();return __qaDialogueTimingEvents;};
"""

async def unlock_station(page):
    # Purpose-limited native navigation, not a substitute for the full suite.
    await page.locator('#stage-chapter-title').filter(has_text='苔灯站台').wait_for()
    await page.wait_for_timeout(500)
    initial=await page.evaluate('window.__qaRead()')
    await api.assert_hud_readable(page,'1280-station-body',form='body',observe_dialogue=True)
    await api.toggle(page,False)
    async def ticket():return bool(re.match(r'1\s*/',await page.locator('#stage-memories').inner_text()))
    await api.drive_to(page,270,420,until=ticket)
    assert await ticket()
    await api.toggle(page,False)
    await page.wait_for_function("()=>window.__qaRead().form==='body'&&window.__qaRead().capPhase==='closed'")
    await api.drive_to(page,420)
    assert '踏板压住了' in await page.locator('#stage-near-hint').inner_text()
    await api.toggle(page,False)
    async def reachable():return await page.locator('#stage-interact-label').inner_text()=='解谜'
    await api.drive_to(page,665,285,until=reachable)
    await api.puzzle(page,'信封')
    await api.toggle(page,False)
    await page.wait_for_function("()=>window.__qaRead().form==='body'&&window.__qaRead().capPhase==='closed'")
    await api.drive_to(page,1110)
    await api.toggle(page,False)
    await api.drive_to(page,1430,315,until=reachable)
    await api.puzzle(page,'各显神通')
    await api.toggle(page,False)
    await page.wait_for_function("()=>window.__qaRead().form==='body'&&window.__qaRead().capPhase==='closed'")
    async def complete():return await page.locator('#result-dialog[open]').is_visible()
    await api.drive_to(page,1890,until=complete,limit=10)
    final=await page.evaluate('window.__qaRead()')
    assert final['state']=='complete' and final['seals']==2 and final['deaths']==initial['deaths']==0
    return {'scope':'native station navigation to unlock greenhouse only, no station face/portrait/fatigue verification',
            'initial':initial,'final':final}

async def main(args):
    output=Path(args.output);output.mkdir(parents=True,exist_ok=True)
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self,*args):pass
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    report={'mode':args.mode,'input':'original station and greenhouse DOM/keyboard route','productionChanges':False,
            'scope':'first station and greenhouse only; not complete browser suite','events':[],'status':'running'}
    try:
        async with async_playwright() as p:
            browser=await p.chromium.launch(headless=True,args=['--no-sandbox'])
            context=await browser.new_context(viewport={'width':1280,'height':800},device_scale_factor=1)
            page=await context.new_page();errors=[];requests=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.on('requestfailed',lambda r:requests.append({'url':r.url,'failure':r.failure}))
            async def instrument(route):
                response=await route.fetch()
                await route.fulfill(response=response,body=(await response.text())+api.PROBE+api.DIALOGUE_APP_PROBE+TIMING)
            await page.route(re.compile(r'/dream-app\.js(?:\?[^#]*)?$'),instrument)
            original_screenshot=page.screenshot
            async def measured_screenshot(*args_,**kwargs):
                if args.mode.startswith('early-') and str(kwargs.get('path','')).endswith('-greenhouse-leaves.png'):
                    report['omittedDiagnosticScreenshot']={'path':str(kwargs['path']),
                        'reason':'Controlled reproducer: remove screenshot wall-time before the existing E; no game/DOM/timer/save mutation and no image is claimed.'}
                    return b''
                return await original_screenshot(*args_,**kwargs)
            page.screenshot=measured_screenshot
            original_toggle=api.toggle
            async def observed_toggle(page,touch):
                if args.mode.endswith('cooldown'):
                    timing=await page.evaluate('window.__qaDialogueTimingRead()')
                    if timing['chapterIndex']==1 and timing['plantStage']==2 and timing['form']=='soul':
                        await page.wait_for_function('()=>window.__qaDialogueTimingRead().ageMs>=1600',timeout=2000)
                await original_toggle(page,touch)
            api.toggle=observed_toggle
            try:
                await page.goto(f'http://127.0.0.1:{server.server_port}/',wait_until='networkidle')
                await page.wait_for_function("typeof window.__qaRead==='function'")
                report['station']=await unlock_station(page)
                report['greenhouse']=await api.exercise_greenhouse(page,output,'1280')
                report['status']='passed'
            except Exception as e:
                report['status']='failed';report['failure']=str(e);report['traceback']=traceback.format_exc()
                await page.screenshot(path=str(output/'failure.png'),full_page=True)
            finally:
                report['events']=await page.evaluate('window.__qaDialogueTimingFinish()')
                report['pageErrors']=errors;report['requestFailures']=requests
                (output/'timing-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
                await browser.close()
                print(json.dumps({key:report.get(key) for key in ['mode','status','failure','pageErrors','requestFailures']},ensure_ascii=False))
    finally:server.shutdown();server.server_close()

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--mode',choices=['original','cooldown','early-original','early-cooldown'],default='original');parser.add_argument('--output',required=True)
    asyncio.run(main(parser.parse_args()))
