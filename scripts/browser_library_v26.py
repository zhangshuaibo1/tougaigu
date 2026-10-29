"""Chapter 4 through real input and earned progress; no save or position injection."""
import asyncio,base64,json,math,time
from pathlib import Path
from urllib.parse import urljoin,urlparse

LIBRARY_FILE='library-painted-v26.webp'
LIBRARY_INTRO=[
    {'page':'01 / 03','speaker':'蓝页','file':'portrait-whale.svg','word':'书签'},
    {'page':'02 / 03','speaker':'阿拾','file':'portrait-hero-curious.svg','word':'小满'},
    {'page':'03 / 03','speaker':'蓝页','file':'portrait-whale.svg','word':'藏好'},
]
LIBRARY_OUTRO=[
    {'page':'01 / 03','speaker':'蓝页','file':'portrait-whale.svg','word':'拧停了钟'},
    {'page':'02 / 03','speaker':'阿拾','file':'portrait-hero-tender.svg','word':'边走边读'},
    {'page':'03 / 03','speaker':'拾光','file':'portrait-soul-brave.svg','word':'留一页灯光'},
]
CLOCK_REPLIES={
    'release':{'page':'01 / 01','speaker':'拾光','file':'portrait-soul.svg','word':'把记忆放进钟声'},
    'hold':{'page':'01 / 01','speaker':'拾光','file':'portrait-soul.svg','word':'书页画了扇小窗'},
}

async def click_input(page,target,driver,touch=False):
    locator=page.locator(target) if isinstance(target,str) else target
    if touch:await driver.tap_control(page,locator)
    else:await locator.click()

async def action(page,driver,key,selector,touch=False):
    if touch:await driver.tap_control(page,selector)
    else:
        await page.locator('#dream-canvas').focus()
        await page.keyboard.press(key)

async def open_cap(page,driver,touch=False):
    await action(page,driver,'e','#stage-toggle',touch)
    await page.wait_for_function("()=>window.__qaRead()?.form==='soul'")

async def return_body(page,driver,touch=False,settle=True):
    await action(page,driver,'e','#stage-toggle',touch)
    if settle:
        await page.wait_for_function("()=>{const s=window.__qaRead();return s?.form==='body'&&s.capPhase==='closed';}")

async def answer_puzzle(page,driver,answer,touch=False,portrait='portrait-whale.svg'):
    await action(page,driver,'q','#stage-interact',touch)
    await page.locator('#puzzle-dialog[open]').wait_for()
    await page.wait_for_function("""file=>{const p=document.querySelector('#puzzle-portrait');return p?.complete&&p.naturalWidth>0&&p.currentSrc.split('?')[0].endsWith('/'+file)&&p.getAttribute('src').split('?')[0].endsWith('/'+file);}""",arg=portrait,timeout=6500)
    await page.locator('#puzzle-portrait').evaluate("async p=>{await p.decode();}")
    await click_input(page,page.locator('#puzzle-options button').filter(has_text=answer),driver,touch)
    await click_input(page,'#puzzle-continue',driver,touch)
    await page.locator('#puzzle-dialog[open]').wait_for(state='hidden')

def validate_library_paint(p,kind='ready'):
    detail=json.dumps({'expected':kind,'actual':p},ensure_ascii=False)
    assert p and p['status']==kind,'wrong actual library image state; '+detail
    if kind=='ready':
        assert p['frame'] and p['width']==2172 and p['height']==724 and p['complete'],'library image is not loaded and drawn; '+detail
        assert urlparse(p['imageSource'] or '').path.endswith('/'+LIBRARY_FILE),'library image source differs; '+detail
    else:
        assert not p['frame'] and p['width']==p['height']==0 and not p['complete'] and p['imageSource'] is None,'unready image replaced the procedural fallback; '+detail
    return p

async def assert_library_paint(page,kind='ready'):
    await page.wait_for_function("kind=>window.__qaRead()?.libraryPaint?.status===kind",arg=kind,timeout=12000)
    if kind=='ready':
        await page.wait_for_function("()=>window.__qaRead()?.libraryPaint?.frame===true",timeout=3000)
    return validate_library_paint((await page.evaluate('window.__qaRead()'))['libraryPaint'],kind)

async def enter_chapter(page,driver,index,touch=False):
    await click_input(page,'[data-shell-action="map"]',driver,touch)
    await page.locator('#map-dialog[open]').wait_for()
    target=page.locator(f'#chapter-grid [data-chapter="{index}"]')
    assert await target.is_enabled(),'chapter was not naturally unlocked'
    await click_input(page,target,driver,touch)
    await page.wait_for_function("index=>{const s=window.__qaRead?.();return s?.state==='playing'&&s.mode==='story'&&s.chapterIndex===index;}",arg=index)

async def restart_library(page,driver,paint='ready',touch=False):
    old=await page.evaluate('window.__qaRead()')
    assert old['chapterIndex']==3 and old['state']=='playing'
    await page.keyboard.press('Escape')
    await page.locator('#pause-dialog[open]').wait_for()
    await click_input(page,'#stage-restart',driver,touch)
    await page.wait_for_function("id=>{const s=window.__qaRead();return s?.chapterIndex===3&&s.state==='playing'&&s.bodyIdentity!==id;}",arg=old['bodyIdentity'])
    painted=await assert_library_paint(page,paint)
    assert painted['lampLit']==[False,False] and painted['lightAmounts']==[0,0] and not painted['gateOpen']
    return painted

async def talk_bluepage(page,output,label,driver,touch=False,repeated=False):
    await driver.drive_to(page,120,limit=7,touch=touch)
    actual=await page.evaluate('window.__qaRead()')
    assert actual['libraryPaint']['npcNear']
    lamps=actual['seals']
    if lamps==0 and not repeated:
        expected=[
            {'page':'01 / 02','speaker':'蓝页','file':'portrait-whale.svg','word':'身体踩浮书'},
            {'page':'02 / 02','speaker':'拾光','file':'portrait-soul-brave.svg','word':'风廊会推我'},
        ]
    elif lamps==2 and repeated:
        expected=[{'page':'01 / 01','speaker':'蓝页','file':'portrait-whale.svg','word':'催还章改成路上慢读了'}]
    else:raise AssertionError('unplanned NPC dialogue state')
    await action(page,driver,'q','#stage-interact',touch)
    await page.locator('#story-dialog[open]').wait_for()
    # Do not immediately Next past the current image; this is ordinary reading.
    first=await driver.read_ready_story_portrait(page,expected[0])
    await page.screenshot(path=str(Path(output)/(label+'-library-npc-'+str(lamps)+'-lamps.png')),full_page=True)
    read=await driver.finish_story_from_ui(page,expected)
    return {'lamps':lamps,'repeated':repeated,'firstPortrait':first,'portraits':read['portraits']}

def rider_sample(a,book):
    mover=next((p for p in a['movers'] if p['id']==book),None)
    assert mover,'the authored floating book is missing'
    return {key:a[key] for key in ['runId','bodyIdentity','chapterIndex','mode','state','form','deaths','time','visualTime','body','input']}|{'mover':mover}

def validate_library_rider_trace(samples,book,full_cycle=False):
    assert len(samples)>=2,'a single still cannot prove actual book carry'
    first=samples[0];last=first;ys=[]
    relative=first['body']['x']-first['mover']['x'];drift=0;sole=0
    for s in samples:
        detail=json.dumps(s,ensure_ascii=False)
        assert (s['runId'],s['bodyIdentity'],s['chapterIndex'],s['mode'],s['deaths'])==(first['runId'],first['bodyIdentity'],3,'story',first['deaths']),'library carry changed run, body, scene or deaths; '+detail
        assert s['state']=='playing' and s['form']=='body','library carry was interrupted; '+detail
        assert s['time']>=last['time'] and s['visualTime']>=last['visualTime'],'library carry time reversed; '+detail
        b=s['body'];p=s['mover']
        assert p['id']==book and b['platform']==book and b['grounded'],'body lost actual book attachment; '+detail
        assert abs(b['vx'])<1 and s['input']=={'x':0,'y':0},'carry used held direction input; '+detail
        assert b['x']+b['w']/2>p['x'] and b['x']-b['w']/2<p['x']+p['w'],'book no longer overlaps the body; '+detail
        sole=max(sole,abs(b['y']-p['y']));drift=max(drift,abs((b['x']-p['x'])-relative))
        assert sole<.1 and drift<1,'drawn rider separated from the real support; '+detail
        ys.append(p['y']);last=s
    elapsed=samples[-1]['time']-first['time']
    assert max(ys)-min(ys)>1,'no physical vertical travel was observed'
    if full_cycle:
        period=2*math.pi/abs(first['mover']['speed'])
        assert elapsed>=period,'floating-book observation omitted part of its actual cycle'
        assert min(s['mover']['dy'] for s in samples)<0<max(s['mover']['dy'] for s in samples),'both physical travel directions were not observed'
        assert max(ys)-min(ys)>first['mover']['range']*1.7,'a complete floating-book excursion was not observed'
    return {'support':book,'gameSeconds':elapsed,'samples':samples,'fullCycle':full_cycle,
            'maxSoleError':sole,'maxRelativeHorizontalDrift':drift,'verticalTravel':max(ys)-min(ys)}

async def board_library_book(page,output,label,driver,book,x,low,touch=False,full_cycle=False):
    await driver.drive_to(page,x,limit=13,touch=touch)
    await page.wait_for_function("""({id,low})=>{const s=window.__qaRead();const p=s?.movers.find(m=>m.id===id);return s?.form==='body'&&s.body.grounded&&Math.abs(s.body.vx)<1&&p?.y>=low&&p.dy>0;}""",arg={'id':book,'low':low},timeout=17000)
    await action(page,driver,'Space','#stage-jump',touch)
    await page.wait_for_function("id=>{const s=window.__qaRead();return s?.body.platform===id&&s.body.grounded;}",arg=book,timeout=3000)
    state=await page.evaluate('window.__qaRead()')
    samples=[rider_sample(state,book)]
    duration=2*math.pi/abs(samples[0]['mover']['speed']) if full_cycle else .65
    deadline=time.monotonic()+duration+4
    while samples[-1]['time']-samples[0]['time']<duration:
        assert time.monotonic()<deadline,'floating-book observation exceeded its bounded wall time'
        await page.wait_for_timeout(75)
        samples.append(rider_sample(await page.evaluate('window.__qaRead()'),book))
    carry=validate_library_rider_trace(samples,book,full_cycle)
    await page.screenshot(path=str(Path(output)/(label+'-library-'+book+'-riding.png')),full_page=True)
    return {'support':book,'bodyX':state['body']['x'],'bodyY':state['body']['y'],
            'moverY':samples[0]['mover']['y'],'deaths':state['deaths'],'carry':carry}

async def pause_library(page,output,label,driver,touch=False):
    await page.keyboard.press('Escape')
    await page.locator('#pause-dialog[open]').wait_for()
    before=await page.evaluate('window.__qaRead()')
    assert before['state']=='paused' and before['chapterIndex']==3
    pixels=await page.locator('#dream-canvas').evaluate("canvas=>canvas.toDataURL('image/png')")
    await page.evaluate("async()=>{for(let i=0;i<6;i++)await new Promise(resolve=>requestAnimationFrame(resolve));}")
    after=await page.evaluate('window.__qaRead()')
    for key in ['runId','bodyIdentity','time','visualTime','body','movers','libraryPaint','storyNPC']:
        assert after[key]==before[key],'paused library advanced '+key
    assert await page.locator('#dream-canvas').evaluate("canvas=>canvas.toDataURL('image/png')")==pixels,'paused library canvas changed'
    Path(output,(label+'-library-paused-canvas.png')).write_bytes(base64.b64decode(pixels.split(',',1)[1]))
    await click_input(page,'#stage-resume',driver,touch)
    await page.wait_for_function("()=>window.__qaRead()?.state==='playing'")
    return {'passiveFrames':6,'stateAndCanvasFrozen':True,'bodyPlatform':before['body']['platform']}

async def play_library_route(page,output,label,driver,touch=False,full_cycle=False,complete=True,
                             revisit_npc=False,read_intro=False,paint='ready',pause_check=False):
    output=Path(output)
    initial=await page.evaluate('window.__qaRead()')
    assert initial['chapterIndex']==3 and initial['state']=='playing' and initial['form']=='body' and initial['body']['x']<200
    assert initial['seals']==0 and initial['memories']==0
    await assert_library_paint(page,paint)
    intro=None
    if read_intro:
        await click_input(page,'#stage-story',driver,touch)
        intro=await driver.finish_story_from_ui(page,LIBRARY_INTRO)
    npc=await talk_bluepage(page,output,label,driver,touch)
    await open_cap(page,driver,touch)
    await page.screenshot(path=str(output/(label+'-library-npc-cap.png')),full_page=True)
    await driver.drive_to(page,375,420,limit=8,touch=touch)
    await page.wait_for_function("()=>window.__qaRead()?.memories>=1",timeout=3500)
    await return_body(page,driver,touch)
    book_a=await board_library_book(page,output,label,driver,'book-a',691,478,touch,full_cycle)
    pause=await pause_library(page,output,label,driver,touch) if pause_check else None
    await open_cap(page,driver,touch)
    await driver.drive_to(page,835,235,limit=11,touch=touch)
    await answer_puzzle(page,driver,'更上一层楼',touch)
    await page.wait_for_function("()=>{const p=window.__qaRead()?.libraryPaint;return p?.lampLit[0]&&!p.lampLit[1]&&p.lightAmounts[0]>.5}",timeout=6500)
    lamp1=(await page.evaluate('window.__qaRead()'))['libraryPaint']
    assert lamp1['gateOpen'] and lamp1['lightAmounts'][1]==0
    await page.screenshot(path=str(output/(label+'-library-first-lamp.png')),full_page=True)
    await driver.drive_to(page,990,270,limit=8,touch=touch)
    await page.wait_for_function("()=>window.__qaRead()?.memories>=2",timeout=3500)
    await return_body(page,driver,touch)
    book_b=await board_library_book(page,output,label,driver,'book-b',1439,473,touch,full_cycle)
    await open_cap(page,driver,touch)
    await driver.drive_to(page,1830,215,limit=16,touch=touch)
    await answer_puzzle(page,driver,'一枚书签',touch)
    await page.wait_for_function("()=>{const p=window.__qaRead()?.libraryPaint;return p?.lampLit.every(Boolean)&&p.lightAmounts.every(n=>n>.5)}",timeout=6500)
    lamp2=(await page.evaluate('window.__qaRead()'))['libraryPaint']
    await page.screenshot(path=str(output/(label+'-library-two-lamps.png')),full_page=True)
    if touch:await driver.assert_hud_readable(page,label+'-library-touch-soul',form='soul')
    two_lamp_npc=None
    if revisit_npc:
        await return_body(page,driver,touch)
        two_lamp_npc=await talk_bluepage(page,output,label,driver,touch,repeated=True)
        await driver.drive_to(page,1439,limit=13,touch=touch)
        await open_cap(page,driver,touch)
    if not complete:
        await return_body(page,driver,touch)
        await page.wait_for_function("()=>{const s=window.__qaRead();return s?.form==='body'&&s.capPhase==='closed';}")
        await driver.assert_hud_readable(page,label+'-library-touch-return',form='body')
        stopped=await page.evaluate('window.__qaRead()')
        assert stopped['deaths']==initial['deaths'] and stopped['seals']==2
        return {'bookA':book_a,'bookB':book_b,'firstLamp':lamp1,'secondLamp':lamp2,
                'npc':npc,'realSecondPuzzleSolved':True,'returnedBody':True,'noRespawns':True,
                'chapterCompleted':False,'input':'CDP emulated touch controls' if touch else 'keyboard',
                'scope':'two actual floating books, both puzzles and wind correction, then normal return; no chapter completion'}
    # HOT PATH: do not screenshot or read HUD while the real hazard is frozen.
    await driver.drive_to(page,1600,410,limit=9,touch=touch)
    await action(page,driver,'Space','#stage-jump',touch)
    await page.wait_for_function("()=>window.__qaRead()?.libraryPaint?.hazards.some(h=>h.frozen>3)",timeout=1500)
    await return_body(page,driver,touch,settle=False)
    await driver.drive_to(page,1750,limit=5,touch=touch)
    safe=await page.evaluate('window.__qaRead()')
    assert safe['body']['x']>=1738 and safe['deaths']==initial['deaths']
    await driver.drive_to(page,2010,limit=8,touch=touch)
    await open_cap(page,driver,touch)
    await driver.drive_to(page,2060,390,limit=8,touch=touch)
    await page.wait_for_function("()=>window.__qaRead()?.memories===3",timeout=3500)
    await return_body(page,driver,touch)
    await driver.drive_to(page,2160,until=lambda:page.locator('#result-dialog[open]').is_visible(),limit=8,touch=touch)
    await page.locator('#result-dialog[open]').wait_for()
    completed=await page.evaluate('window.__qaRead()')
    assert completed['chapterIndex']==3 and completed['state']=='complete' and completed['seals']==2 and completed['memories']==3 and completed['deaths']==initial['deaths']
    await page.screenshot(path=str(output/(label+'-library-complete.png')),full_page=True)
    return {'introDecoded':intro['portraits'] if intro else None,'bluepageNearAndTalk':True,
            'npc':npc,'twoLampNPC':two_lamp_npc,'bookA':book_a,'bookB':book_b,'pause':pause,
            'firstLamp':lamp1,'secondLamp':lamp2,'soulPulseRealHazardFreeze':True,
            'zeroDeaths':completed['deaths']==0,'allThreeMemories':True,'realBodyExit':True,
            'chapterCompleted':True,'input':'CDP emulated touch controls' if touch else 'keyboard'}

def validate_library_abort(record):
    detail=json.dumps(record,ensure_ascii=False)
    assert record['requestCount']==1,'library fallback retried its failed image; '+detail
    assert record['aborted'] and record['failure']=='net::ERR_FAILED','library failure is not the exact deliberately aborted request; '+detail
    return {'url':record['url'],'failure':record['failure']}

class LibraryAbortGate:
    def __init__(self,url):
        self.url=url;self.request=None;self.count=0;self.aborted=False;self.failure=None
        self.done=asyncio.Event()
    async def route(self,route):
        self.count+=1
        if self.request is not None:
            await route.continue_();return
        self.request=route.request
        await route.abort('failed');self.aborted=True
    def failed(self,request):
        if request is self.request:
            self.failure=request.failure;self.done.set()
    async def finish(self):
        await asyncio.wait_for(self.done.wait(),6)
        record={'url':self.url,'requestCount':self.count,'aborted':self.aborted,'failure':self.failure}
        return record,validate_library_abort(record)

async def library_touch_cases(page,output,label,driver):
    viewport=page.viewport_size
    before=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1'))")
    original_motion=before['settings']['reducedMotion']
    grants=await driver.read_reward_grants(page)
    # Real cap openings legitimately increment opens; earned collections must
    # stay unchanged when the same already-collected items are revisited.
    collections=await read_collections(page)
    cases={}
    try:
        await enter_chapter(page,driver,3)
        await assert_library_paint(page)
        for width,height in [(390,844),(320,680)]:
            await page.set_viewport_size({'width':width,'height':height})
            if width==320:
                await driver.set_reduced_motion_from_ui(page,True)
                await restart_library(page,driver,touch=True)
            await driver.assert_hud_readable(page,label+'-library-entry-'+str(width),form='body')
            await page.screenshot(path=str(Path(output)/(label+f'-library-entry-{width}.png')),full_page=True)
            cases[str(width)]=await play_library_route(page,output,label+'-touch-'+str(width),driver,
                                                       touch=True,full_cycle=True,complete=False)
            if width==320:
                actual=await page.evaluate('window.__qaRead()')
                assert actual['reducedMotion'] is True and actual['libraryPaint']['lightAmounts']==[1,1]
                cases[str(width)]['reducedMotion']={'settingAppliedThroughUI':True,'bothRealBooksStillMove':True,'bothRealLampAmounts':[1,1]}
            after=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1'))")
            for key in ['chapters','choices','discoveredEndings']:
                assert after[key]==before[key],'partial touch revisit changed '+key
            assert await driver.read_reward_grants(page)==grants
            assert await read_collections(page)==collections
    finally:
        if (await page.evaluate('window.__qaRead()'))['reducedMotion']!=original_motion:
            await driver.set_reduced_motion_from_ui(page,original_motion)
        await page.set_viewport_size(viewport)
    assert (await page.evaluate('window.__qaRead()'))['reducedMotion']==original_motion
    return cases

async def read_collections(page):
    return await page.evaluate("()=>Object.fromEntries(Object.entries(JSON.parse(localStorage.getItem('tougaigu.capbook.v1')).scenes).map(([id,r])=>[id,{memories:r.memories,seals:r.seals}]))")

async def library_resource_cases(page,output,label,driver):
    target=urljoin(page.url,'assets/'+LIBRARY_FILE)
    expected=[];results={}
    before=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1'))")
    grants=await driver.read_reward_grants(page)
    # One exact deliberately failed WebP; there is no second library SVG asset.
    gate=LibraryAbortGate(target)
    page.on('requestfailed',gate.failed)
    await page.route(target,gate.route)
    try:
        await restart_library(page,driver,paint='error')
        route=await play_library_route(page,output,label+'-fallback',driver,paint='error')
        record,failure=await gate.finish();expected.append(failure)
        settled=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1'))")
        assert settled['chapters'][3]['runs']==before['chapters'][3]['runs']+1
        assert settled['choices']==before['choices']
        assert settled['chapters'][:3]==before['chapters'][:3] and settled['chapters'][4:]==before['chapters'][4:]
        assert await driver.read_reward_grants(page)==grants
        results['failedPrimary']={'request':record,'route':route,'settlementExactlyOnce':True,'choicesAndRewardGrantsUnchanged':True}
    finally:
        await page.unroute(target,gate.route)
        page.remove_listener('requestfailed',gate.failed)
    # Finish the result via its actual map button; no completion callback injection.
    await page.locator('#result-map').click()
    await page.locator('#map-dialog[open]').wait_for()
    await page.locator('#chapter-grid [data-chapter="3"]').click()
    restored=await assert_library_paint(page)
    assert restored['lampLit']==[False,False] and restored['lightAmounts']==[0,0]
    results['recoveredAfterUnblocking']=restored

    for mode in ['delayed-current','late-after-leaving']:
        delayed=driver.PortraitRequestGate(target,'library-'+mode)
        page.on('requestfailed',delayed.failed);page.on('requestfinished',delayed.finished)
        await page.route(target,delayed.route)
        try:
            loading=await restart_library(page,driver,paint='loading')
            await asyncio.wait_for(delayed.arrived.wait(),6)
            assert loading['frame'] is False
            await driver.drive_to(page,135,limit=5)
            moved=await page.evaluate('window.__qaRead()')
            assert moved['state']=='playing' and moved['body']['x']>120
            await page.screenshot(path=str(Path(output)/(label+'-library-'+mode+'.png')),full_page=True)
            if mode=='late-after-leaving':
                await page.locator('[data-shell-action="map"]').click()
                await page.locator('#map-dialog[open]').wait_for()
                destination=page.locator('#chapter-grid [data-chapter="2"]')
                assert await destination.is_enabled()
                # Only this next actual chapter selection supersedes the old
                # game; merely opening the map has not made it obsolete yet.
                delayed.obsolete=True
                await destination.click()
                await page.wait_for_function("()=>{const s=window.__qaRead();return s?.chapterIndex===2&&s.state==='playing';}")
                # Await the new scene's real image before leaving it again;
                # this case may only obsolete the deliberately held library.
                await driver.assert_theatre_paint(page)
                left=await page.evaluate('window.__qaRead()')
                assert left['chapterIndex']==2 and left['libraryPaint'] is None
                chapters=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1')).chapters")
                choices=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1')).choices")
            record,cancelled=await delayed.finish()
            if cancelled:expected.append(cancelled)
            if mode=='delayed-current':
                ready=await assert_library_paint(page)
                await page.screenshot(path=str(Path(output)/(label+'-library-delay-ready.png')),full_page=True)
                results[mode]={'request':record,'loading':loading,'movedWhileLoading':True,'ready':ready}
            else:
                await page.evaluate("async()=>{for(let i=0;i<3;i++)await new Promise(r=>requestAnimationFrame(r));}")
                after=await page.evaluate('window.__qaRead()')
                assert after['chapterIndex']==2 and after['libraryPaint'] is None
                assert after['bodyIdentity']==left['bodyIdentity'] and after['deaths']==left['deaths']
                assert await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1')).chapters")==chapters
                assert await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1')).choices")==choices
                results[mode]={'request':record,'newChapter':2,'oldResourceDidNotReplaceScene':True,'choicesAndResultsUnchanged':True}
        finally:
            delayed.release.set()
            if delayed.request is not None and not delayed.handled.is_set():
                await asyncio.wait_for(delayed.handled.wait(),8)
            await page.unroute(target,delayed.route)
            page.remove_listener('requestfailed',delayed.failed);page.remove_listener('requestfinished',delayed.finished)
    await enter_chapter(page,driver,3)
    results['recoveredAfterLeaving']=await assert_library_paint(page)
    assert await driver.read_reward_grants(page)==grants
    return {'cases':results,'expectedRequestFailures':expected}

async def exercise_library(page,output,label,driver,scene_requests=None):
    output=Path(output)
    print(label,'naturally enter fourth chapter',flush=True)
    saved=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1'))")
    assert all(saved['chapters'][i]['completed'] for i in range(3)) and not saved['chapters'][3]['completed']
    assert saved['choices']['clock'] is None
    grants=await driver.read_reward_grants(page)
    await enter_chapter(page,driver,3)
    first=await assert_library_paint(page)
    assert first['lampLit']==[False,False] and first['lightAmounts']==[0,0] and not first['gateOpen']
    await page.screenshot(path=str(output/(label+'-library-entry.png')),full_page=True)
    route=await play_library_route(page,output,label,driver,read_intro=True,revisit_npc=True,pause_check=True)
    settled=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1'))")
    assert settled['chapters'][3]['completed'] and settled['chapters'][3]['runs']==saved['chapters'][3]['runs']+1
    assert settled['choices']['clock'] is None and settled['choices']['letter']==saved['choices']['letter']
    assert await driver.read_reward_grants(page)==grants
    await page.locator('#result-story').click()
    outro=await driver.finish_story_from_ui(page,LIBRARY_OUTRO)
    await page.locator('#choice-dialog[open]').wait_for()
    await page.keyboard.press('Escape')
    await page.locator('#map-dialog[open]').wait_for()
    await page.locator('#chapter-grid [data-chapter="4"]').click()
    await page.locator('#choice-dialog[open]').wait_for()
    assert (await page.evaluate('window.__qaRead()'))['chapterIndex']==3
    if scene_requests is not None:
        assert not any(urlparse(url).path.endswith('/coast-painted-v27.webp') for url in scene_requests),'coast art was requested before entering the fifth chapter'
    await page.locator('#choice-options [data-choice="release"]').click()
    release=await driver.finish_story_from_ui(page,[CLOCK_REPLIES['release']])
    await page.wait_for_function("()=>window.__qaRead()?.chapterIndex===4",timeout=8000)
    await page.wait_for_function("()=>{const p=window.__qaRead()?.coastPaint;return !p||(p.status==='ready'&&p.frame);}",timeout=12000)
    after=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1'))")
    assert after['choices']['clock']=='release' and after['chapters'][3]==settled['chapters'][3]
    await page.reload(wait_until='networkidle')
    await page.wait_for_function("()=>window.__qaRead?.()?.chapterIndex===4")
    again=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1'))")
    assert again['choices']['clock']=='release' and again['chapters'][3]==settled['chapters'][3]
    await page.locator('[data-shell-action="profile"]').click()
    await page.locator('#journal-dialog[open]').wait_for()
    await page.locator('#journal-choices [data-reply="clock"]').click()
    await page.locator('#choice-dialog[open]').wait_for()
    await page.locator('#choice-options [data-choice="hold"]').click()
    hold=await driver.finish_story_from_ui(page,[CLOCK_REPLIES['hold']])
    await page.locator('#journal-dialog[open]').wait_for()
    await page.locator('[data-close="journal-dialog"]').click()
    await page.reload(wait_until='networkidle')
    await page.wait_for_function("()=>window.__qaRead?.()?.chapterIndex===4")
    kept=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1'))")
    assert kept['choices']['clock']=='hold' and kept['chapters']==settled['chapters'] and kept['choices']['letter']==saved['choices']['letter']
    assert await driver.read_reward_grants(page)==grants
    print(label,'read both actual floating books with touch at 390 and 320',flush=True)
    touches=await library_touch_cases(page,output,label,driver)
    print(label,'verify library failure, original delayed response and late exit',flush=True)
    resources=await library_resource_cases(page,output,label,driver)
    await enter_chapter(page,driver,4)
    await page.wait_for_function("()=>{const p=window.__qaRead()?.coastPaint;return !p||(p.status==='ready'&&p.frame);}",timeout=12000)
    return {**route,'naturalUnlock':True,'paintedReady':first,'settlementExactlyOnce':True,
            'outroDecoded':outro['portraits'],'clockReplyPortraits':{'release':release['portraits'],'hold':hold['portraits']},
            'clockGateBlocksUntilReply':True,'releasePersistedReload':True,
            'journalHoldNoDuplicateRewards':True,'holdPersistedReload':True,
            'coastNotRequestedBeforeFifthChapter':scene_requests is not None,
            'touch390':touches['390'],'touch320':touches['320'],'resourceCases':resources['cases'],
            'expectedRequestFailures':resources['expectedRequestFailures']}
