"""Earned fifth chapter: real choices, cap input, lamps and body crossings."""
import base64,json,math,time
from pathlib import Path
from urllib.parse import urljoin,urlparse
from browser_library_v26 import (CLOCK_REPLIES,LibraryAbortGate,action,answer_puzzle,
    click_input,open_cap,return_body)

COAST_FILE='coast-painted-v27.webp'
COAST_INTRO=[
    {'page':'01 / 03','speaker':'归先生','file':'portrait-keeper.svg','word':'怀表'},
    {'page':'02 / 03','speaker':'阿拾','file':'portrait-hero-tender.svg','word':'小满'},
    {'page':'03 / 03','speaker':'归先生','file':'portrait-keeper.svg','word':'我的女儿'},
]
COAST_OUTRO=[
    {'page':'01 / 03','speaker':'归先生','file':'portrait-keeper.svg','word':'是我自己'},
    {'page':'02 / 03','speaker':'阿拾','file':'portrait-hero-open.svg','word':'一起送'},
    {'page':'03 / 03','speaker':'拾光','file':'portrait-soul-brave.svg','word':'能迈出去就好'},
]
COAST_NPC=[
    {'page':'01 / 02','speaker':'归先生','file':'portrait-keeper.svg','word':'脉冲暂停它'},
    {'page':'02 / 02','speaker':'拾光','file':'portrait-soul-brave.svg','word':'停住后快归位'},
]

def validate_coast_paint(p,kind='ready'):
    detail=json.dumps({'expected':kind,'actual':p},ensure_ascii=False)
    assert p and p['status']==kind,'wrong actual coast image state; '+detail
    if kind=='ready':
        assert p['frame'] and p['complete'] and (p['width'],p['height'])==(2172,724),'coast image is not loaded and drawn; '+detail
        assert urlparse(p['imageSource'] or '').path.endswith('/'+COAST_FILE),'wrong coast image source; '+detail
    else:
        assert not p['frame'] and not p['complete'] and p['width']==p['height']==0 and p['imageSource'] is None,'unready coast image replaced the procedural fallback; '+detail
    return p

async def assert_coast_paint(page,kind='ready'):
    await page.wait_for_function('kind=>window.__qaRead()?.coastPaint?.status===kind',arg=kind,timeout=12000)
    if kind=='ready':await page.wait_for_function('()=>window.__qaRead()?.coastPaint?.frame===true',timeout=3000)
    return validate_coast_paint((await page.evaluate('window.__qaRead()'))['coastPaint'],kind)

async def restart_coast(page,driver,touch=False,paint='ready'):
    old=await page.evaluate('window.__qaRead()')
    assert old['state']=='playing' and old['chapterIndex']==4
    await action(page,driver,'Escape','[data-shell-action="pause"]',touch)
    await page.locator('#pause-dialog[open]').wait_for()
    await click_input(page,'#stage-restart',driver,touch)
    await page.wait_for_function("id=>{const s=window.__qaRead();return s?.state==='playing'&&s.chapterIndex===4&&s.bodyIdentity!==id;}",arg=old['bodyIdentity'])
    painted=await assert_coast_paint(page,paint)
    assert painted['lampLit']==[False,False] and painted['lightAmounts']==[0,0]
    return painted

async def choose_clock(page,driver,choice,touch=False):
    initial=await page.evaluate('window.__qaRead()')
    assert initial['chapterIndex']==4 and initial['state']=='playing' and initial['form']=='body' and initial['capPhase']=='closed'
    before=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1'))")
    grants=await driver.read_reward_grants(page)
    await click_input(page,'[data-shell-action="profile"]',driver,touch)
    await page.locator('#journal-dialog[open]').wait_for()
    await click_input(page,'#journal-choices [data-reply="clock"]',driver,touch)
    await page.locator('#choice-dialog[open]').wait_for()
    await click_input(page,f'#choice-options [data-choice="{choice}"]',driver,touch)
    reply=await driver.finish_story_from_ui(page,[CLOCK_REPLIES[choice]])
    await page.locator('#journal-dialog[open]').wait_for()
    await click_input(page,'[data-close="journal-dialog"]',driver,touch)
    await page.wait_for_function("()=>window.__qaRead()?.state==='playing'")
    current=await page.evaluate('window.__qaRead()')
    after=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1'))")
    assert current['bodyIdentity']==initial['bodyIdentity'] and current['deaths']==initial['deaths']
    assert after['choices']=={**before['choices'],'clock':choice}
    for key in ['chapters','discoveredEndings','lastChapter']:
        assert after[key]==before[key],'clock reply changed '+key
    assert await driver.read_reward_grants(page)==grants
    expected={'choice':choice,'phase':'settled' if current['reducedMotion'] else 'waiting','elapsed':2.8 if current['reducedMotion'] else 0}
    # A new branch resets only its presentation; an unchanged branch is never
    # used here as a way to manufacture another first-opening performance.
    if initial['clockChoice']!=choice:assert current['clockEcho']==expected
    return {'choice':choice,'replyPortraits':reply['portraits'],'chaptersAndGrantsUnchanged':True}

def validate_clock_echo(snapshot,choice,phase):
    echo=snapshot['clockEcho'];detail=json.dumps(snapshot,ensure_ascii=False)
    assert snapshot['mode']=='story' and snapshot['chapterIndex']==4,'clock echo escaped the fifth chapter; '+detail
    assert snapshot['clockChoice']==choice and echo and echo['choice']==choice and echo['phase']==phase,'wrong saved and visible clock branch; '+detail
    assert math.isfinite(echo['elapsed']) and 0<=echo['elapsed']<=2.8,'clock echo duration is unbounded; '+detail
    if phase=='waiting':assert echo['elapsed']==0
    if phase=='settled':assert echo['elapsed']==2.8
    if phase=='playing':
        assert not snapshot['reducedMotion'] and snapshot['form']=='soul' and snapshot['capPhase']=='open'
        assert snapshot['capAge']>=1.4 and snapshot['capAmount']>=.85,'clock echo began before the real open cap; '+detail
        assert 0<echo['elapsed']<2.8
    return dict(echo)

async def play_clock_echo(page,output,label,driver,choice,touch=False,pause=True,reopen=True):
    start=await page.evaluate('window.__qaRead()')
    assert start['state']=='playing' and start['form']=='body' and start['capPhase']=='closed'
    validate_clock_echo(start,choice,'waiting')
    await open_cap(page,driver,touch)
    await page.wait_for_function("choice=>{const s=window.__qaRead();return s?.clockEcho?.choice===choice&&s.clockEcho.phase==='playing'&&s.clockEcho.elapsed>=.2;}",arg=choice,timeout=8000)
    # Pause before any screenshot, PNG encoding or accessibility work consumes
    # this 2.8-second performance. The unmodified Canvas retains the actual pose.
    if pause:
        await action(page,driver,'Escape','[data-shell-action="pause"]',touch)
        await page.locator('#pause-dialog[open]').wait_for()
    active=await page.evaluate('window.__qaRead()')
    validate_clock_echo(active,choice,'playing')
    assert active['bodyIdentity']==start['bodyIdentity'] and active['deaths']==start['deaths']
    frozen=None
    if pause:
        assert active['state']=='paused'
        pixels=await page.locator('#dream-canvas').evaluate("canvas=>canvas.toDataURL('image/png')")
        await page.evaluate('async()=>{for(let i=0;i<6;i++)await new Promise(resolve=>requestAnimationFrame(resolve));}')
        after=await page.evaluate('window.__qaRead()')
        for key in ['time','visualTime','bodyIdentity','body','capPhase','capAge','capAmount','clockEcho','coastPaint','hazards','storyNPC']:
            assert after[key]==active[key],'paused coast advanced '+key
        assert await page.locator('#dream-canvas').evaluate("canvas=>canvas.toDataURL('image/png')")==pixels,'paused coast canvas changed'
        Path(output,label+'-clock-'+choice+'-playing-paused-canvas.png').write_bytes(base64.b64decode(pixels.split(',',1)[1]))
        frozen={'passiveFrames':6,'stateAndCanvasFrozen':True,'atSeconds':active['clockEcho']['elapsed']}
        await click_input(page,'#stage-resume',driver,touch)
    await page.wait_for_function("()=>window.__qaRead()?.clockEcho?.phase==='settled'",timeout=5000)
    settled=validate_clock_echo(await page.evaluate('window.__qaRead()'),choice,'settled')
    await driver.assert_hud_readable(page,label+'-clock-'+choice,form='soul')
    await page.screenshot(path=str(Path(output)/(label+'-clock-'+choice+'-settled.png')),full_page=True)
    await return_body(page,driver,touch)
    samples=[]
    if reopen:
        await open_cap(page,driver,touch)
        began=(await page.evaluate('window.__qaRead()'))['time']
        deadline=time.monotonic()+5
        while True:
            s=await page.evaluate('window.__qaRead()')
            assert s['clockEcho']==settled,'same-run reopening replayed the clock reply'
            assert s['bodyIdentity']==start['bodyIdentity'] and s['deaths']==start['deaths']
            samples.append({'time':s['time'],'capAge':s['capAge'],'echo':s['clockEcho']})
            if s['time']-began>=1.8:break
            assert time.monotonic()<deadline,'clock reopen observation exceeded its bounded window'
            await page.wait_for_timeout(100)
        await return_body(page,driver,touch)
    return {'choice':choice,'observedPlaying':active['clockEcho'],'pause':frozen,'settled':settled,
            'reopenSamples':samples,'sameRunReopenDoesNotReplay':reopen,'input':'CDP touch' if touch else 'keyboard'}

async def coast_touch_echoes(page,output,label,driver):
    viewport=page.viewport_size;cases={}
    original=(await page.evaluate('window.__qaRead()'))['reducedMotion']
    before=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1'))")
    grants=await driver.read_reward_grants(page)
    try:
        for width,height,choice in [(390,844,'hold'),(320,680,'release')]:
            await page.set_viewport_size({'width':width,'height':height})
            await restart_coast(page,driver,touch=True)
            if (await page.evaluate('window.__qaRead()'))['clockChoice']!=choice:
                await choose_clock(page,driver,choice,touch=True)
            await driver.drive_to(page,145,touch=True,limit=5)
            await page.wait_for_function('()=>Math.abs(window.__qaRead()?.body.vx)<1')
            await driver.assert_hud_readable(page,label+'-coast-entry-'+str(width),form='body')
            await page.screenshot(path=str(Path(output)/(label+'-coast-entry-'+str(width)+'.png')),full_page=True)
            cases[str(width)]=await play_clock_echo(page,output,label+'-touch-'+str(width),driver,choice,touch=True,pause=True,reopen=False)
            cases[str(width)]['scope']='actual safe-entry touch movement, cap opening, branch, pause, return and HUD; no phone pendulum crossing or chapter completion'
            stopped=await page.evaluate('window.__qaRead()')
            assert stopped['body']['x']<200 and stopped['deaths']==0 and stopped['seals']==stopped['memories']==0
        await driver.set_reduced_motion_from_ui(page,True)
        await choose_clock(page,driver,'hold',touch=True)
        reduced=await page.evaluate('window.__qaRead()')
        validate_clock_echo(reduced,'hold','settled')
        await open_cap(page,driver,touch=True)
        await driver.assert_hud_readable(page,label+'-coast-reduced-320',form='soul')
        await page.screenshot(path=str(Path(output)/(label+'-clock-hold-reduced-320.png')),full_page=True)
        assert (await page.evaluate('window.__qaRead()'))['clockEcho']==reduced['clockEcho']
        await return_body(page,driver,touch=True)
        cases['reducedMotion']={'settingAppliedThroughUI':True,'choice':'hold','phase':'settled','elapsed':2.8,'noPlayingPhase':True}
    finally:
        if (await page.evaluate('window.__qaRead()'))['reducedMotion']!=original:
            await driver.set_reduced_motion_from_ui(page,original)
        await page.set_viewport_size(viewport)
    after=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1'))")
    assert after['chapters']==before['chapters'] and after['discoveredEndings']==before['discoveredEndings']
    assert after['choices']=={**before['choices'],'clock':'hold'} and await driver.read_reward_grants(page)==grants
    return cases

def coast_physical_record(s):
    return {key:s[key] for key in ['runId','bodyIdentity','chapterIndex','mode','state','form','time','deaths','body','hazards']}

def coast_full_sweep_right(hazard,body_width):
    assert hazard['kind']=='pendulum' and hazard['length']>0 and 0<hazard['swing']<math.pi/2
    return hazard['x']+math.sin(hazard['swing'])*hazard['length']+hazard['r']+body_width/2

def validate_coast_crossing(samples,indices):
    assert len(samples)>=2,'one endpoint does not prove an actual pendulum crossing'
    first=samples[0];cleared={};last=first
    for s in samples:
        detail=json.dumps(s,ensure_ascii=False)
        assert (s['runId'],s['bodyIdentity'],s['chapterIndex'],s['mode'],s['deaths'])==(first['runId'],first['bodyIdentity'],4,'story',first['deaths']),'pendulum crossing changed run, body, chapter or deaths; '+detail
        assert s['state']=='playing' and s['form']=='body' and s['body']['grounded'] and abs(s['body']['y']-560)<.1,'pendulum crossing lost the real floor body; '+detail
        assert s['time']>=last['time'],'crossing time reversed; '+detail
        for index in indices:
            h=s['hazards'][index];right=coast_full_sweep_right(h,s['body']['w'])
            if index not in cleared and s['body']['x']>right:
                assert first['body']['x']<right,'observation began after the pendulum crossing'
                assert h['frozen']>0,'body cleared the complete pendulum sweep after its freeze ended; '+detail
                cleared[index]={'index':index,'fullSweepRight':right,'bodyX':s['body']['x'],'remainingFreeze':h['frozen'],'time':s['time']}
        last=s
    assert sorted(cleared)==sorted(indices),'body did not clear every intended actual pendulum'
    return {'crossings':[cleared[i] for i in indices],'samples':samples,'noRespawns':True,'fullSweepClearedWhileFrozen':True}

async def freeze_pendulum(page,driver,index,x,y):
    await driver.drive_to(page,x,y,limit=7)
    before=await page.evaluate('window.__qaRead()')
    assert before['form']=='soul' and before['state']=='playing'
    await action(page,driver,'Space','#stage-jump')
    # Only a synchronous state observation here; no image, HUD or dialog work.
    after=await page.evaluate('window.__qaRead()')
    assert after['hazards'][index]['frozen']>3.8,'actual soul pulse did not freeze the intended pendulum'
    assert after['bodyIdentity']==before['bodyIdentity'] and after['deaths']==before['deaths']
    return {'index':index,'before':coast_physical_record(before),'after':coast_physical_record(after)}

async def cross_frozen_pendulums(page,driver,indices,target):
    samples=[]
    # Body form starts immediately; waiting for the closing animation would
    # spend the 4.5-second safety window before walking.
    await return_body(page,driver,settle=False)
    await driver.drive_to(page,target,limit=6,observe=lambda s:samples.append(coast_physical_record(s)))
    return validate_coast_crossing(samples,indices)

async def coast_resource_failure(page,output,label,driver):
    before=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1'))")
    grants=await driver.read_reward_grants(page)
    target=urljoin(page.url,'assets/'+COAST_FILE);gate=LibraryAbortGate(target)
    page.on('requestfailed',gate.failed);await page.route(target,gate.route)
    try:
        fallback=await restart_coast(page,driver,paint='error')
        start=await page.evaluate('window.__qaRead()')
        await driver.drive_to(page,390,limit=6)
        moved=await page.evaluate('window.__qaRead()')
        assert moved['body']['x']>=378 and moved['bodyIdentity']==start['bodyIdentity'] and moved['deaths']==0
        assert moved['seals']==moved['memories']==0 and moved['state']=='playing'
        validate_coast_paint(moved['coastPaint'],'error')
        await page.screenshot(path=str(Path(output)/(label+'-coast-primary-failed-safe-movement.png')),full_page=True)
        record,failure=await gate.finish()
    finally:
        await page.unroute(target,gate.route);page.remove_listener('requestfailed',gate.failed)
    recovered=await restart_coast(page,driver)
    after=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1'))")
    assert after['chapters']==before['chapters'] and after['choices']==before['choices']
    assert await driver.read_reward_grants(page)==grants
    return {'request':record,'fallback':fallback,'recovered':recovered,'realBodyMovedWithoutImage':True,
            'chaptersChoicesAndRewardsUnchanged':True,'expectedRequestFailures':[failure],
            'scope':'exact primary WebP failure, actual safe-entry body movement, normal UI restart and native image recovery; no failed-image browser completion'}

async def play_coast_route(page,output,label,driver):
    start=await page.evaluate('window.__qaRead()')
    assert start['chapterIndex']==4 and start['state']=='playing' and start['form']=='body' and start['body']['x']<200
    assert start['seals']==start['memories']==start['deaths']==0
    await assert_coast_paint(page)
    await page.locator('#stage-story').click()
    intro=await driver.finish_story_from_ui(page,COAST_INTRO)
    await driver.drive_to(page,120,limit=5)
    await action(page,driver,'q','#stage-interact')
    npc=await driver.finish_story_from_ui(page,COAST_NPC)
    await page.screenshot(path=str(Path(output)/(label+'-coast-npc-before-crossing.png')),full_page=True)
    await driver.drive_to(page,585,limit=7)
    safe_left=await page.evaluate('window.__qaRead()')
    assert safe_left['body']['x']<600
    await open_cap(page,driver)
    await driver.drive_to(page,355,415,limit=7)
    await page.wait_for_function('()=>window.__qaRead()?.memories===1',timeout=2500)
    await driver.drive_to(page,680,220,limit=8)
    await answer_puzzle(page,driver,'一场空',portrait='portrait-keeper.svg')
    await page.wait_for_function('()=>{const p=window.__qaRead()?.coastPaint;return p?.lampLit[0]&&!p.lampLit[1]&&p.lightAmounts[0]>.5&&p.lightAmounts[1]===0;}',timeout=4000)
    lamp1=(await page.evaluate('window.__qaRead()'))['coastPaint']
    await page.screenshot(path=str(Path(output)/(label+'-coast-first-lamp.png')),full_page=True)
    await driver.drive_to(page,1110,320,limit=9)
    await page.wait_for_function('()=>window.__qaRead()?.memories===2',timeout=2500)
    await page.screenshot(path=str(Path(output)/(label+'-coast-wind-memory.png')),full_page=True)
    # HOT PATH. The first two whole-swing danger zones overlap; never wait at
    # x=900. Freeze both with actual pulses, then cross to the safe x=1400 bank.
    freeze1=await freeze_pendulum(page,driver,0,820,420)
    freeze2=await freeze_pendulum(page,driver,1,1100,420)
    first_cross=await cross_frozen_pendulums(page,driver,[0,1],1400)
    await page.screenshot(path=str(Path(output)/(label+'-coast-first-two-pendulums-cleared.png')),full_page=True)
    await open_cap(page,driver)
    await driver.drive_to(page,1750,250,limit=9)
    await answer_puzzle(page,driver,'时间',portrait='portrait-keeper.svg')
    await page.wait_for_function('()=>{const p=window.__qaRead()?.coastPaint;return p?.lampLit.every(Boolean)&&p.lightAmounts.every(n=>n>.5);}',timeout=4000)
    lamp2=(await page.evaluate('window.__qaRead()'))['coastPaint']
    await page.screenshot(path=str(Path(output)/(label+'-coast-two-lamps.png')),full_page=True)
    await driver.drive_to(page,1915,420,limit=9)
    await page.wait_for_function('()=>window.__qaRead()?.memories===3',timeout=2500)
    freeze3=await freeze_pendulum(page,driver,2,1720,410)
    last_cross=await cross_frozen_pendulums(page,driver,[2],1960)
    await page.screenshot(path=str(Path(output)/(label+'-coast-all-pendulums-cleared.png')),full_page=True)
    await driver.assert_hud_readable(page,label+'-coast-body-exit',form='body')
    await driver.drive_to(page,2090,until=lambda:page.locator('#result-dialog[open]').is_visible(),limit=6)
    await page.locator('#result-dialog[open]').wait_for()
    completed=await page.evaluate('window.__qaRead()')
    assert completed['state']=='complete' and completed['chapterIndex']==4 and completed['seals']==2 and completed['memories']==3
    assert completed['deaths']==0 and completed['bodyIdentity']==start['bodyIdentity']
    await page.screenshot(path=str(Path(output)/(label+'-coast-complete.png')),full_page=True)
    return {'scope':'desktop, earned fifth chapter, keyboard and real puzzle DOM, complete body route',
            'introPortraits':intro['portraits'],'npcPortraits':npc['portraits'],'firstLamp':lamp1,'secondLamp':lamp2,
            'freezes':[freeze1,freeze2,freeze3],'firstTwoCrossing':first_cross,'thirdCrossing':last_cross,
            'zeroDeaths':True,'threeRealMemories':True,'twoRealPuzzleLamps':True,'normalBodyExit':True}

async def exercise_coast(page,output,label,driver):
    print(label,'verify clock replies at the naturally unlocked coast',flush=True)
    before=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1'))")
    assert all(c['completed'] for c in before['chapters'][:4]) and not before['chapters'][4]['completed']
    assert before['choices']['clock']=='hold'
    grants=await driver.read_reward_grants(page)
    initial=await assert_coast_paint(page)
    assert initial['lampLit']==[False,False] and initial['lightAmounts']==[0,0]
    release_reply=await choose_clock(page,driver,'release')
    release=await play_clock_echo(page,output,label,driver,'release')
    hold_reply=await choose_clock(page,driver,'hold')
    hold=await play_clock_echo(page,output,label,driver,'hold')
    # Reload the earned hold choice, not a rewritten/injected save fixture.
    await page.reload(wait_until='networkidle')
    await page.wait_for_function("()=>window.__qaRead?.()?.chapterIndex===4")
    await assert_coast_paint(page)
    fresh=await page.evaluate('window.__qaRead()')
    validate_clock_echo(fresh,'hold','waiting')
    assert fresh['form']=='body' and fresh['capPhase']=='closed'
    print(label,'verify safe-entry coast touch and reduced motion',flush=True)
    phones=await coast_touch_echoes(page,output,label,driver)
    failure=await coast_resource_failure(page,output,label,driver)
    print(label,'cross all three actual pendulums with the body',flush=True)
    route=await play_coast_route(page,output,label,driver)
    settled=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1'))")
    assert settled['chapters'][4]['completed'] and settled['chapters'][4]['runs']==before['chapters'][4]['runs']+1
    assert settled['chapters'][:4]==before['chapters'][:4] and settled['chapters'][5:]==before['chapters'][5:]
    assert settled['choices']==before['choices'] and await driver.read_reward_grants(page)==grants
    await page.locator('#result-story').click()
    outro=await driver.finish_story_from_ui(page,COAST_OUTRO)
    await page.locator('#map-dialog[open]').wait_for()
    next_chapter=page.locator('#chapter-grid [data-chapter="5"]')
    assert await next_chapter.is_enabled(),'normal fifth-chapter completion did not unlock the sixth'
    await next_chapter.click()
    await page.wait_for_function("()=>{const s=window.__qaRead();return s?.state==='playing'&&s.chapterIndex===5;}")
    outside=await page.evaluate('window.__qaRead()')
    assert outside['clockEcho'] is None and outside['coastPaint'] is None
    after=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1'))")
    assert after['chapters']==settled['chapters'] and after['choices']==settled['choices']
    return {'naturalUnlock':True,'paintedReady':initial,'releaseReply':release_reply,'holdReply':hold_reply,
            'releaseEcho':release,'holdEcho':hold,'holdReloadRestoresWaiting':True,'touch390':phones['390'],
            'touch320':phones['320'],'reducedMotion':phones['reducedMotion'],'primaryFailure':failure,
            'desktopRoute':route,'settlementExactlyOnce':True,'outroPortraits':outro['portraits'],
            'sixthChapterEnteredWithoutCoastOrClockLeak':True,'rewardGrantsUnchanged':True,
            'expectedRequestFailures':failure['expectedRequestFailures']}
