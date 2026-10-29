"""Real DOM/input smoke test. Run with Playwright installed (test-only dependency).
python scripts/browser-smoke.py --url http://127.0.0.1:8080 --output verification/browser
A test-only read-only coordinate probe is appended in-memory to the app module.
All movement and puzzles still use real keyboard/touch/DOM input: no teleportation,
save injection, direct updates, or engine solving calls.
"""
import argparse,asyncio,json,re,shutil,time
from pathlib import Path
from playwright.async_api import async_playwright


PROBE="""
window.__qaRead=()=>{const a=game?.form==='soul'?game.soul:game?.body;return game&&{form:game.form,state:game.state,x:a.x,y:a.y,vx:a.vx,vy:a.vy};};
"""
async def drive_to(page,x,y=None,touch=False,until=None,limit=10):
    session=await page.context.new_cdp_session(page) if touch else None
    held=None
    keys={'up':'ArrowUp','down':'ArrowDown','left':'ArrowLeft','right':'ArrowRight'}
    async def change(direction):
        nonlocal held
        if direction==held:return
        if held:
            if touch:await session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
            else:await page.keyboard.up(keys[held])
        held=direction
        if held:
            if touch:
                box=await page.locator(f'[data-direction="{held}"]').bounding_box()
                await session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':box['x']+box['width']/2,'y':box['y']+box['height']/2,'id':1}]})
            else:await page.keyboard.down(keys[held])
    try:
        end=time.monotonic()+limit
        while time.monotonic()<end:
            if until and await until():return
            a=await page.evaluate('window.__qaRead()')
            if a['state']=='complete':return
            dx=x-a['x'];dy=0 if y is None else y-a['y']
            if abs(dx)<12 and abs(dy)<12 and abs(a['vx'])<40 and (y is None or abs(a['vy'])<40):return
            predictedX=a['x']+(a['vx']/7 if a['form']=='soul' else a['vx']*abs(a['vx'])/3300)
            predictedY=a['y']+a['vy']/7
            ex=x-predictedX;ey=0 if y is None else y-predictedY
            direction=None
            if abs(ey)>12 and abs(ey)>abs(ex):direction='down' if ey>0 else 'up'
            elif abs(ex)>12:direction='right' if ex>0 else 'left'
            await change(direction);await page.wait_for_timeout(30)
        raise AssertionError('Could not steer to '+str((x,y))+'; '+str(await page.evaluate('window.__qaRead()')))
    finally:
        await change(None)
        if session:await session.detach()

async def wait_text(page,selector,text,timeout=5000):
    await page.wait_for_function("([s,t])=>document.querySelector(s)?.textContent.includes(t)",arg=[selector,text],timeout=timeout)

async def hold(page,direction,seconds=None,until=None,touch=False,limit=5):
    keys={'up':'ArrowUp','down':'ArrowDown','left':'ArrowLeft','right':'ArrowRight'}
    session=None
    if touch:
        box=await page.locator(f'[data-direction="{direction}"]').bounding_box()
        assert box, f'{direction} control not visible'
        session=await page.context.new_cdp_session(page)
        await session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':box['x']+box['width']/2,'y':box['y']+box['height']/2,'id':1}]})
    else: await page.keyboard.down(keys[direction])
    try:
        if seconds is not None: await page.wait_for_timeout(seconds*1000)
        else:
            end=time.monotonic()+limit
            while time.monotonic()<end:
                if await until():return
                await page.wait_for_timeout(35)
            raise AssertionError('direction hold timed out: '+direction+'; '+await page.locator('#stage-near-hint').inner_text())
    finally:
        if touch:
            await session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});await session.detach()
        else:await page.keyboard.up(keys[direction])

async def toggle(page,touch):
    if touch:await page.locator('#stage-toggle').tap()
    else:await page.keyboard.press('e')

async def puzzle(page,answer,wrong=None,touch=False):
    if touch:await page.locator('#stage-interact').tap()
    else:await page.keyboard.press('q')
    await page.locator('#puzzle-dialog[open]').wait_for()
    if wrong:
        before=await page.locator('#stage-seals').inner_text()
        await page.locator('#puzzle-options button').filter(has_text=wrong).click()
        assert await page.locator('#stage-seals').inner_text()==before
        assert not await page.locator('#puzzle-continue').is_visible()
    await page.locator('#puzzle-options button').filter(has_text=answer).click()
    await page.locator('#puzzle-continue').click()
    await page.locator('#puzzle-dialog[open]').wait_for(state='hidden')

async def exercise(page,output,label,touch=False,full=False):
    output=Path(output);output.mkdir(parents=True,exist_ok=True)
    await page.locator('#stage-chapter-title').filter(has_text='苔灯站台').wait_for()
    await page.wait_for_timeout(500)
    assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'horizontal overflow'
    assert '上海九喵科技有限公司' in await page.locator('.corporate-footer').inner_text()
    await page.screenshot(path=str(output/(label+'-start.png')),full_page=True)
    version=await page.locator('meta[name="application-version"]').get_attribute('content')
    print(label,'sample animation frames',flush=True)
    timings=await page.evaluate('''async()=>{const a=[];let prev=performance.now();for(let i=0;i<61;i++)await new Promise(r=>requestAnimationFrame(t=>{if(i)a.push(t-prev);prev=t;r()}));a.sort((x,y)=>x-y);return {samples:a.length,p50:a[30],p95:a[57]}}''')
    print(label,'collect ticket',flush=True)
    await toggle(page,touch)
    async def ticket():return bool(re.match(r'1\s*/',await page.locator('#stage-memories').inner_text()))
    await drive_to(page,270,420,touch=touch,until=ticket)
    await page.wait_for_timeout(120)
    assert await ticket(), 'actual flight did not collect ticket'
    await page.screenshot(path=str(output/(label+'-ticket.png')),full_page=True)
    await toggle(page,touch);await page.wait_for_timeout(900)
    await toggle(page,touch);await page.wait_for_timeout(750)
    assert await ticket(), 'reopening counted ticket twice'
    await page.screenshot(path=str(output/(label+'-home.png')),full_page=True)
    await toggle(page,touch);await page.wait_for_timeout(800)
    if touch:await page.locator('[data-shell-action="pause"]').tap()
    else:await page.keyboard.press('Escape')
    await page.locator('#pause-dialog[open]').wait_for()
    paused=await page.locator('#stage-time').inner_text();await page.wait_for_timeout(350)
    assert await page.locator('#stage-time').inner_text()==paused
    await page.locator('#stage-resume').click()
    if full:
        print(label,'first lamp route',flush=True)
        async def pressed():return '踏板压住了' in await page.locator('#stage-near-hint').inner_text()
        await drive_to(page,420,touch=touch)
        await page.wait_for_timeout(180)
        assert await pressed(), 'plate did not remain depressed after stopping'
        await page.screenshot(path=str(output/(label+'-plate.png')),full_page=True)
        await toggle(page,touch)
        async def reachable():return await page.locator('#stage-interact-label').inner_text()=='解谜'
        await drive_to(page,665,285,touch=touch,until=reachable)
        await page.screenshot(path=str(output/(label+'-lamp.png')),full_page=True)
        await puzzle(page,'信封',wrong='行李箱',touch=touch)
        assert re.match(r'1\s*/',await page.locator('#stage-seals').inner_text())
        await toggle(page,touch);await page.wait_for_timeout(850)
        await drive_to(page,1110,touch=touch);await page.wait_for_timeout(180)
        await toggle(page,touch)
        await drive_to(page,1430,315,touch=touch,until=reachable)
        print(label,'second puzzle',flush=True)
        await puzzle(page,'各显神通',touch=touch)
        assert re.match(r'2\s*/',await page.locator('#stage-seals').inner_text())
        await page.wait_for_timeout(1500)
        await page.screenshot(path=str(output/(label+'-second-light.png')),full_page=True)
        await toggle(page,touch);await page.wait_for_timeout(850)
        async def complete():return await page.locator('#result-dialog[open]').is_visible()
        print(label,'walk to exit',await page.evaluate('window.__qaRead()'),flush=True)
        await drive_to(page,1890,touch=touch,until=complete,limit=10)
        await page.screenshot(path=str(output/(label+'-complete.png')),full_page=True)
    return {'viewport':page.viewport_size,'version':version,'ticketCollectedAndReturned':True,'pauseFrozen':True,'noHorizontalOverflow':True,'chapterCompleted':full,'input':'emulated Chromium touch' if touch else 'keyboard','rafIntervalMs':timings,'frameSamplePhase':'initial active idle; not a physical-device benchmark'}

async def main(args):
    output=Path(args.output);output.mkdir(parents=True,exist_ok=True)
    report={'url':args.url,'source':'served production HTML; app module has a read-only coordinate probe appended in-memory; all actions use DOM/input','cases':[]}
    async with async_playwright() as p:
        b=await p.chromium.launch(headless=True,executable_path=args.chromium or None,args=['--no-sandbox'])
        for w,h,touch,full in [(1280,800,False,True),(390,844,True,False),(320,680,True,False)]:
            context=await b.new_context(viewport={'width':w,'height':h},has_touch=touch,is_mobile=touch,device_scale_factor=1)
            page=await context.new_page();errors=[];failed=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.on('response',lambda r:failed.append({'url':r.url,'status':r.status}) if r.status>=400 else None)
            async def instrument(route):
                response=await route.fetch()
                await route.fulfill(response=response,body=(await response.text())+PROBE)
            await page.route('**/dream-app.js',instrument)
            await page.goto(args.url,wait_until='networkidle',timeout=45000)
            version=await page.locator('meta[name="application-version"]').get_attribute('content')
            assert not args.version or version==args.version,(version,args.version)
            result=await exercise(page,output,str(w),touch,full)
            assert not errors,errors
            assert not failed,failed
            result['pageErrors']=errors;result['httpErrors']=failed
            result['resources']=await page.evaluate("performance.getEntriesByType('resource').map(e=>({name:e.name.split('/').pop(),duration:e.duration,transferSize:e.transferSize}))")
            result['imagesLoaded']=await page.locator('img').evaluate_all('(els)=>els.filter(e=>e.getBoundingClientRect().width>0).every(e=>e.complete&&e.naturalWidth>0)')
            assert result['imagesLoaded'],'visible image failed to load'
            if full:
                # Read actual saved data, then reload without replacing/injecting it.
                saved=await page.evaluate("localStorage.getItem('tougaigu.capbook.v1')")
                assert saved and 'memories' in saved
                await page.reload(wait_until='networkidle')
                assert await page.evaluate("localStorage.getItem('tougaigu.capbook.v1')")==saved
                result['reloadPreservedCapBook']=True
            report['cases'].append(result)
            await context.close()
        await b.close()
    (output/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--url',required=True);parser.add_argument('--output',default='verification/browser');parser.add_argument('--version');parser.add_argument('--chromium');asyncio.run(main(parser.parse_args()))
