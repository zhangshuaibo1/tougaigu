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
window.__qaRead=()=>{
  if(!game)return null;
  const a=game.form==='soul'?game.soul:game.body,b=game.body,p=game.greenhousePlant;
  return {
    form:game.form,state:game.state,chapterIndex:game.chapterIndex,
    x:a.x,y:a.y,vx:a.vx,vy:a.vy,time:game.time,deaths:game.deaths,
    body:{x:b.x,y:b.y,w:b.w,h:b.h,vx:b.vx,vy:b.vy,grounded:b.grounded,platform:b.platform},capPhase:game.cap?.phase,
    nearHint:game.getNearHint(),
    movers:(game.movers||[]).map(p=>({id:p.id,x:p.x,y:p.y,w:p.w,h:p.h,dx:p.dx,dy:p.dy})),
    platforms:(game.level?.platforms||[]).map(p=>({x:p.x,y:p.y,w:p.w,h:p.h,kind:p.kind||null})),
    letterChoice:save.choices.letter??null,
    letterEcho:game.letterEcho?{...game.letterEcho}:null,
    greenhousePlant:p?{...p,knownSeals:[...p.knownSeals]}:null,
    seedCollected:game.chapterIndex===1&&game.memories?.[1]?.collected===true,
    mushrooms:(game.pads||[]).map(p=>({x:p.x,y:p.y,w:p.w,boing:p.boing,cooldown:p.cooldown})),
    roots:(game.level?.platforms||[]).filter(p=>p.kind==='root').map(p=>({x:p.x,y:p.y,w:p.w,h:p.h}))
  };
};
"""
async def drive_to(page,x,y=None,touch=False,until=None,limit=10,observe=None):
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
            if observe:observe(a)
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
        plant_before=(await page.evaluate('window.__qaRead()'))['greenhousePlant']
        await page.locator('#puzzle-options button').filter(has_text=wrong).click()
        assert await page.locator('#stage-seals').inner_text()==before
        assert not await page.locator('#puzzle-continue').is_visible()
        if plant_before:
            plant_after=(await page.evaluate('window.__qaRead()'))['greenhousePlant']
            assert plant_after['stage']==plant_before['stage'], 'wrong answer advanced greenhouse growth'
            assert plant_after['knownSeals']==plant_before['knownSeals'], 'wrong answer counted as a greenhouse lamp'
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

async def exercise_greenhouse(page,output,label):
    """Continue the desktop journey through the normal unlocked chapter map."""
    output=Path(output)
    print(label,'enter greenhouse through chapter map',flush=True)
    await page.locator('#result-dialog[open]').wait_for()
    assert (await page.evaluate('window.__qaRead()'))['chapterIndex']==0
    await page.locator('#result-map').click()
    await page.locator('#map-dialog[open]').wait_for()
    chapter=page.locator('#chapter-grid [data-chapter="1"]')
    assert await chapter.is_enabled(), 'completing the station did not unlock greenhouse'
    await chapter.click()
    await wait_text(page,'#stage-chapter-title','倒流温室')
    await page.wait_for_function("()=>{const a=window.__qaRead();return a?.chapterIndex===1&&a.state==='playing';}")
    initial=await page.evaluate('window.__qaRead()')
    assert initial['letterChoice'] is None and initial['letterEcho'] is None, 'an unmade letter choice created an echo'
    assert initial['greenhousePlant']['phase']=='missing' and initial['greenhousePlant']['stage']==0
    assert initial['greenhousePlant']['pot']=='ticket', 'the actual station ticket did not carry into the greenhouse'
    assert not initial['seedCollected']
    assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'greenhouse horizontal overflow'
    await page.screenshot(path=str(output/(label+'-greenhouse-start.png')),full_page=True)
    stages=[0]

    print(label,'fly to the greenhouse seed',flush=True)
    await drive_to(page,600)
    await toggle(page,False)
    async def seed_held():
        a=await page.evaluate('window.__qaRead()')
        return a['greenhousePlant']['phase']=='held' and a['seedCollected']
    await drive_to(page,970,275,until=seed_held)
    assert await seed_held(), 'actual flight did not collect memories[1]'
    held=await page.evaluate('window.__qaRead()')
    assert held['form']=='soul' and held['greenhousePlant']['stage']==0
    await wait_text(page,'#stage-cap-label','种子抱好了')
    seed_count=await page.locator('#stage-memories').inner_text()
    assert re.match(r'1\s*/',seed_count)
    await page.screenshot(path=str(output/(label+'-greenhouse-seed-held.png')),full_page=True)

    # Pause the real return animation before the seed reaches its pot. This
    # checks more than an idle timer without assigning any engine state.
    await toggle(page,False)
    await page.wait_for_function("()=>window.__qaRead()?.greenhousePlant?.phase==='returning'",timeout=3000)
    await page.keyboard.press('Escape')
    await page.locator('#pause-dialog[open]').wait_for()
    paused=await page.evaluate('window.__qaRead()')
    assert paused['greenhousePlant']['phase']=='returning', 'seed arrived before the pause check'
    paused_timer=await page.locator('#stage-time').inner_text()
    await page.wait_for_timeout(350)
    frozen=await page.evaluate('window.__qaRead()')
    assert frozen['state']=='paused' and frozen['time']==paused['time']
    assert frozen['greenhousePlant']==paused['greenhousePlant'], 'paused seed return or growth advanced'
    assert frozen['capPhase']==paused['capPhase']
    assert await page.locator('#stage-time').inner_text()==paused_timer
    await page.locator('#stage-resume').click()
    await page.wait_for_function("()=>{const a=window.__qaRead();return a?.form==='body'&&a.capPhase==='closed'&&a.greenhousePlant.phase==='planted'&&a.greenhousePlant.stage===1;}")
    stages.append(1)
    await toggle(page,False)
    await page.wait_for_function("()=>window.__qaRead()?.greenhousePlant?.growthAge>=1.2")
    assert await page.locator('#stage-memories').inner_text()==seed_count, 'reopening counted the seed twice'
    await page.screenshot(path=str(output/(label+'-greenhouse-seed-planted.png')),full_page=True)

    print(label,'solve first greenhouse lamp',flush=True)
    async def reachable():return await page.locator('#stage-interact-label').inner_text()=='解谜'
    await drive_to(page,630,250,until=reachable)
    await puzzle(page,'一把剪刀',wrong='一盏灯笼')
    assert re.match(r'1\s*/',await page.locator('#stage-seals').inner_text())
    leaves=await page.evaluate('window.__qaRead()')
    assert leaves['greenhousePlant']['stage']==2 and leaves['greenhousePlant']['knownSeals']==[0]
    stages.append(2)
    await page.wait_for_function("()=>window.__qaRead()?.greenhousePlant?.growthAge>=1.2")
    await page.screenshot(path=str(output/(label+'-greenhouse-leaves.png')),full_page=True)
    await toggle(page,False)
    await page.wait_for_function("()=>{const a=window.__qaRead();return a?.form==='body'&&a.capPhase==='closed';}")

    print(label,'ride the real mushroom over the root platform',flush=True)
    route={}
    def observe_root(a):
        body=a['body']
        for mushroom in a['mushrooms']:
            if mushroom['boing']>0 and mushroom['cooldown']>0 and body['vy']<-600:
                route.setdefault('mushroomBounce',{'body':body,'mushroom':mushroom})
        for root in a['roots']:
            if root['x']<body['x']<root['x']+root['w'] and body['y']<=root['y']+2:
                route.setdefault('aboveRoot',{'body':body,'root':root})
    # No jump key is used on this leg: the pad must supply the upward velocity.
    await drive_to(page,1220,observe=observe_root)
    await page.wait_for_function("()=>{const b=window.__qaRead()?.body;return b?.grounded&&Math.abs(b.y-560)<2;}")
    beyond_root=await page.evaluate('window.__qaRead()')
    assert 'mushroomBounce' in route, 'no actual mushroom bounce observed'
    assert 'aboveRoot' in route, 'body never crossed above the solid root platform'
    assert beyond_root['body']['x']>route['aboveRoot']['root']['x']+route['aboveRoot']['root']['w']
    route['landedBeyondRoot']=beyond_root['body']
    await page.screenshot(path=str(output/(label+'-greenhouse-root-crossed.png')),full_page=True)

    # Two player jumps use the existing shelf to cross above the drifting
    # shadow. Stopping on the shelf makes the route independent of its phase.
    await page.keyboard.press('Space')
    await drive_to(page,1390)
    await page.wait_for_function("()=>{const b=window.__qaRead()?.body;return b?.grounded&&Math.abs(b.y-445)<2;}",timeout=5000)
    route['shelfLanding']=(await page.evaluate('window.__qaRead()'))['body']
    await page.keyboard.press('Space')
    await drive_to(page,1610)
    await page.wait_for_function("()=>{const b=window.__qaRead()?.body;return b?.grounded&&b.x>1585&&Math.abs(b.y-560)<2;}",timeout=5000)
    route['pastShadow']=(await page.evaluate('window.__qaRead()'))['body']

    print(label,'solve second greenhouse lamp and reach exit',flush=True)
    await toggle(page,False)
    await drive_to(page,1700,250,until=reachable)
    await puzzle(page,'节节高',wrong='一场空')
    assert re.match(r'2\s*/',await page.locator('#stage-seals').inner_text())
    flower=await page.evaluate('window.__qaRead()')
    assert flower['greenhousePlant']['phase']=='planted'
    assert flower['greenhousePlant']['stage']==3 and flower['greenhousePlant']['knownSeals']==[0,1]
    stages.append(3)
    await page.wait_for_function("()=>window.__qaRead()?.greenhousePlant?.growthAge>=1.2")
    await page.screenshot(path=str(output/(label+'-greenhouse-flower.png')),full_page=True)
    await toggle(page,False)
    await page.wait_for_function("()=>{const a=window.__qaRead();return a?.form==='body'&&a.capPhase==='closed';}")
    async def complete():return await page.locator('#result-dialog[open]').is_visible()
    await drive_to(page,2040,until=complete)
    await page.locator('#result-dialog[open]').wait_for()
    final=await page.evaluate('window.__qaRead()')
    assert final['chapterIndex']==1 and final['state']=='complete' and final['form']=='body'
    assert final['deaths']==initial['deaths'], 'greenhouse route unexpectedly respawned'
    assert '倒流温室' in await page.locator('#result-kicker').inner_text()
    assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'greenhouse result horizontal overflow'
    await page.screenshot(path=str(output/(label+'-greenhouse-complete.png')),full_page=True)
    return {'enteredViaChapterMap':True,'input':'keyboard','seedCollectedAndPlanted':True,
            'seedMemoryIndex':1,'pot':'ticket','observedPlantStages':stages,
            'seedReturnPauseFrozen':True,'wrongAnswersRejected':2,'mushroomBounceObserved':True,
            'rootCrossed':True,'routeEvidence':route,'chapterCompleted':True,
            'noRespawns':True,'noHorizontalOverflow':True}

async def finish_story_from_ui(page):
    """Read every real story page instead of invoking its completion callback."""
    await page.locator('#story-dialog[open]').wait_for()
    pages=[]
    for _ in range(12):
        if not await page.locator('#story-dialog[open]').is_visible():
            return pages
        pages.append(await page.locator('#story-page').inner_text())
        await page.locator('#story-next').click()
    raise AssertionError('story dialogue did not finish through its next-page button')

async def read_reward_grants(page):
    """Normal play time may increase; an echo must never grant or claim items."""
    return await page.evaluate('''()=>{
      const r=JSON.parse(localStorage.getItem('tougaigu.rewards.v1')||'null')||{};
      return {
        stardust:r.stardust||0,
        inventory:r.inventory||{glow_candy:0,star_compass:0,feather_charm:0},
        claimedBase:r.claimedBase||[],supplyClaims:r.supplyClaims||0,
        outfits:r.outfits||[],badges:r.badges||[],
        festivals:Object.fromEntries(Object.entries(r.festivals||{})
          .filter(([,f])=>f.welcomed||(f.claimed||[]).length)
          .map(([key,f])=>[key,{welcomed:f.welcomed,claimed:f.claimed}]))
      };
    }''')

async def read_cap_collections(page):
    return await page.evaluate('''()=>{
      const s=JSON.parse(localStorage.getItem('tougaigu.capbook.v1')).scenes;
      return Object.fromEntries(['story-0','story-1'].map(id=>
        [id,{memories:s[id].memories,seals:s[id].seals}]));
    }''')

async def play_letter_echo(page,output,label,choice):
    """Open the cap, freeze the actual performance, then prove it stays settled."""
    initial=await page.evaluate('window.__qaRead()')
    assert initial['state']=='playing' and initial['form']=='body' and initial['capPhase']=='closed'
    assert initial['letterChoice']==choice
    assert initial['letterEcho']=={'choice':choice,'phase':'waiting','elapsed':0}
    await toggle(page,False)
    await page.wait_for_function("choice=>{const a=window.__qaRead();return a?.letterEcho?.choice===choice&&a.letterEcho.phase==='playing'&&a.letterEcho.elapsed>=.2;}",arg=choice,timeout=8000)
    await page.screenshot(path=str(output/(label+'-letter-'+choice+'-playing.png')),full_page=True)
    await page.keyboard.press('Escape')
    await page.locator('#pause-dialog[open]').wait_for()
    paused=await page.evaluate('window.__qaRead()')
    assert paused['state']=='paused' and paused['letterEcho']['phase']=='playing', 'letter finished before its pause check'
    assert paused['letterEcho']['choice']==choice and paused['letterEcho']['elapsed']>0
    await page.wait_for_timeout(350)
    frozen=await page.evaluate('window.__qaRead()')
    assert frozen['time']==paused['time'] and frozen['letterEcho']==paused['letterEcho'], 'paused letter presentation advanced'
    assert frozen['capPhase']==paused['capPhase']
    await page.locator('#stage-resume').click()
    await page.wait_for_function("choice=>{const e=window.__qaRead()?.letterEcho;return e?.choice===choice&&e.phase==='settled';}",arg=choice,timeout=5000)
    settled=(await page.evaluate('window.__qaRead()'))['letterEcho']
    assert settled=={'choice':choice,'phase':'settled','elapsed':2.8}
    await page.screenshot(path=str(output/(label+'-letter-'+choice+'-settled.png')),full_page=True)

    await toggle(page,False)
    await page.wait_for_function("()=>{const a=window.__qaRead();return a?.form==='body'&&a.capPhase==='closed';}")
    await toggle(page,False)
    await page.wait_for_function("()=>window.__qaRead()?.capPhase==='open'")
    # The performance normally starts after 1.4s of open-cap time. Sample across
    # that threshold so a replay cannot be hidden by checking only its end.
    for _ in range(20):
        await page.wait_for_timeout(100)
        assert (await page.evaluate('window.__qaRead()'))['letterEcho']==settled, 'reopening replayed the same letter choice'
    await toggle(page,False)
    await page.wait_for_function("()=>{const a=window.__qaRead();return a?.form==='body'&&a.capPhase==='closed';}")
    return {'choice':choice,'observedPlaying':True,'pausedAtSeconds':paused['letterEcho']['elapsed'],
            'pauseFrozen':True,'settledSeconds':settled['elapsed'],'reopenDidNotReplay':True}

async def exercise_letter_echo(page,output,label):
    """Choose send after real completion, revisit, and rewrite keep in the diary."""
    output=Path(output)
    print(label,'read the greenhouse outro and choose send',flush=True)
    await page.locator('#result-dialog[open]').wait_for()
    initial=await page.evaluate('window.__qaRead()')
    assert initial['chapterIndex']==1 and initial['state']=='complete'
    assert initial['letterChoice'] is None and initial['letterEcho'] is None
    grants=await read_reward_grants(page)
    collections=await read_cap_collections(page)
    chapters=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1')).chapters")
    assert chapters[1]['completed'] and chapters[1]['runs']==1
    await page.locator('#result-story').click()
    outro_pages=await finish_story_from_ui(page)
    await page.locator('#choice-dialog[open]').wait_for()
    assert await page.locator('#choice-title').inner_text()=='这封信，交给谁？'
    send=page.locator('#choice-options [data-choice="send"]')
    assert '让风把它送出去' in await send.inner_text()
    await send.click()
    await page.locator('#story-dialog[open]').wait_for()
    assert (await page.evaluate('window.__qaRead()'))['letterChoice']=='send'
    assert await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1')).choices.letter")=='send'
    await finish_story_from_ui(page)
    await page.locator('#map-dialog[open]').wait_for()
    chapter=page.locator('#chapter-grid [data-chapter="1"]')
    assert await chapter.is_enabled()
    assert '重新游玩' in await chapter.get_attribute('aria-label')
    await chapter.click()
    await page.wait_for_function("()=>{const a=window.__qaRead();return a?.chapterIndex===1&&a.state==='playing'&&a.letterEcho?.choice==='send';}")
    await wait_text(page,'#stage-chapter-title','倒流温室')
    revisited=await page.evaluate('window.__qaRead()')
    assert revisited['greenhousePlant']['phase']=='planted' and revisited['greenhousePlant']['stage']==3
    assert not revisited['seedCollected'], 'a remembered seed became a current-run pickup'
    assert re.match(r'0\s*/',await page.locator('#stage-seals').inner_text()), 'a saved choice completed current-run lamps'
    sent=await play_letter_echo(page,output,label,'send')
    assert await read_reward_grants(page)==grants, 'send or reopening granted a reward'
    assert await read_cap_collections(page)==collections, 'send or reopening duplicated a collectible'

    print(label,'rewrite the actual diary reply to keep',flush=True)
    await page.locator('[data-shell-action="profile"]').click()
    await page.locator('#journal-dialog[open]').wait_for()
    row=page.locator('#journal-choices .journal-choice').filter(has=page.locator('[data-reply="letter"]'))
    assert '让风把它送出去' in await row.inner_text()
    reply=page.locator('#journal-choices [data-reply="letter"]')
    assert await reply.inner_text()=='重新回信' and await reply.is_enabled()
    await reply.click()
    await page.locator('#choice-dialog[open]').wait_for()
    assert 'selected' in (await page.locator('#choice-options [data-choice="send"]').get_attribute('class') or '')
    keep=page.locator('#choice-options [data-choice="keep"]')
    assert '先替她好好保管' in await keep.inner_text()
    await keep.click()
    await page.locator('#story-dialog[open]').wait_for()
    changed=await page.evaluate('window.__qaRead()')
    assert changed['state']=='paused' and changed['letterChoice']=='keep'
    assert changed['letterEcho']=={'choice':'keep','phase':'waiting','elapsed':0}, 'rewriting retained the previous send performance'
    assert await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1')).choices.letter")=='keep'
    await finish_story_from_ui(page)
    await page.locator('#journal-dialog[open]').wait_for()
    assert '先替她好好保管' in await row.inner_text()
    await page.locator('[data-close="journal-dialog"]').click()
    await page.wait_for_function("()=>window.__qaRead()?.state==='playing'")
    kept=await play_letter_echo(page,output,label,'keep')
    assert await read_reward_grants(page)==grants, 'rewriting keep or reopening granted a reward'
    assert await read_cap_collections(page)==collections, 'rewriting keep changed earned seed, ticket or lamps'
    assert await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1')).chapters")==chapters, 'rewriting a reply completed or rewarded a chapter again'
    assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'letter echo horizontal overflow'
    return {'choiceViaCompletedOutro':True,'outroPagesRead':outro_pages,'revisitedViaChapterMap':True,
            'rewrittenViaDiary':True,'send':sent,'keep':kept,'storedChoice':'keep',
            'rewardGrantsUnchanged':True,'collectiblesUnchanged':True,'chapterResultsUnchanged':True,
            'noHorizontalOverflow':True}

async def tap_control(page,selector):
    """Send actual touch input in the already-earned, resized desktop context."""
    target=page.locator(selector)
    await target.wait_for(state='visible')
    await target.scroll_into_view_if_needed()
    box=await target.bounding_box()
    assert box, 'touch target has no visible bounds: '+selector
    session=await page.context.new_cdp_session(page)
    try:
        await session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[
            {'x':box['x']+box['width']/2,'y':box['y']+box['height']/2,'id':41}]})
        await session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    finally:
        await session.detach()

def theatre_mover(snapshot):
    mover=next((p for p in snapshot['movers'] if p['id']=='stage'),None)
    assert mover, 'the authored travelling stage is missing'
    return mover

def assert_theatre_rider(snapshot):
    body=snapshot['body'];mover=theatre_mover(snapshot)
    assert snapshot['form']=='body' and snapshot['state']=='playing'
    assert body['platform']=='stage' and body['grounded'], 'body did not stand on the real moving stage'
    assert abs(body['y']-mover['y'])<2
    assert mover['x']-body['w']/2<body['x']<mover['x']+mover['w']+body['w']/2

async def theatre_hint(page,phrase):
    await wait_text(page,'#stage-near-hint',phrase)
    snapshot=await page.evaluate('window.__qaRead()')
    assert phrase in snapshot['nearHint'], 'visible platform hint disagrees with the live engine hint'
    return snapshot

async def cross_theatre_stage(page,output,label,touch=False):
    """Walk/jump to the left bank, board on contact, ride without input, alight."""
    output=Path(output)
    await wait_text(page,'#stage-chapter-title','借月剧场')
    await page.wait_for_function("()=>{const a=window.__qaRead();return a?.chapterIndex===2&&a.state==='playing'&&a.form==='body';}")
    initial=await page.evaluate('window.__qaRead()')
    assert initial['body']['x']<200 and initial['deaths']==0
    banks=[p for p in initial['platforms'] if p['y']==465 and p['kind'] is None]
    left=next((p for p in banks if p['x']==565),None)
    right=next((p for p in banks if p['x']==1130),None)
    assert left and right and left['w']==220 and right['w']==225
    assert theatre_mover(initial)['w']==185, 'the test expects the original moving-platform geometry'

    print(label,'jump onto the actual left-bank shelf',flush=True)
    await drive_to(page,490,touch=touch)
    await page.wait_for_function("()=>{const b=window.__qaRead()?.body;return b?.grounded&&Math.abs(b.vx)<1;}")
    if touch:await tap_control(page,'#stage-jump')
    else:await page.keyboard.press('Space')
    await drive_to(page,710,touch=touch)
    await page.wait_for_function("()=>{const b=window.__qaRead()?.body;return b?.grounded&&b.platform===null&&Math.abs(b.y-465)<2&&Math.abs(b.vx)<1;}")
    # Observe a genuinely absent platform, not a canned waiting line at spawn.
    await page.wait_for_function("()=>window.__qaRead()?.movers.find(p=>p.id==='stage')?.x>925",timeout=15000)
    waiting=await theatre_hint(page,'在踏台上等一等')
    wb=waiting['body'];wm=theatre_mover(waiting)
    assert left['x']<wb['x']<left['x']+left['w'] and abs(wb['y']-left['y'])<2
    assert wm['x']>wb['x']+wb['w']/2+100, 'waiting hint was not observed across a real gap'
    await page.screenshot(path=str(output/(label+'-theatre-left-bank.png')),full_page=True)

    print(label,'wait for an outward-moving dock and walk aboard',flush=True)
    await page.wait_for_function("()=>{const p=window.__qaRead()?.movers.find(p=>p.id==='stage');return p&&p.x<=725&&p.dx>0;}",timeout=15000)
    boarding=await theatre_hint(page,'舞台靠近了')
    bm=theatre_mover(boarding)
    assert abs(bm['y']-left['y'])<2 and min(bm['x']+bm['w'],left['x']+left['w'])>max(bm['x'],left['x']), 'boarding hint had no actual same-height dock contact'
    assert bm['dx']>0 and bm['x']<760
    async def aboard():return (await page.evaluate('window.__qaRead()'))['body']['platform']=='stage'
    await hold(page,'right',until=aboard,touch=touch,limit=5)
    await page.wait_for_function("()=>{const b=window.__qaRead()?.body;return b?.platform==='stage'&&b.grounded&&Math.abs(b.vx)<1;}",timeout=3000)
    ride_start=await page.evaluate('window.__qaRead()')
    assert_theatre_rider(ride_start)
    start_mover=theatre_mover(ride_start)
    relative_start=ride_start['body']['x']-start_mover['x']

    # All direction keys/touches have been released by hold(). Only the real
    # platform may carry the player through this interval.
    await page.wait_for_function("()=>window.__qaRead()?.movers.find(p=>p.id==='stage')?.x>=900",timeout=10000)
    riding=await theatre_hint(page,'站稳就好')
    assert_theatre_rider(riding)
    rm=theatre_mover(riding);rb=riding['body']
    assert rm['x']-start_mover['x']>100 and rb['x']-ride_start['body']['x']>100
    assert abs(rb['vx'])<1 and abs((rb['x']-rm['x'])-relative_start)<1, 'standing rider slid relative to the moving stage'
    assert left['x']+left['w']<rb['x']<right['x'], 'midstage evidence was not over the gap'
    await page.screenshot(path=str(output/(label+'-theatre-midstage.png')),full_page=True)

    await page.wait_for_function("()=>{const p=window.__qaRead()?.movers.find(p=>p.id==='stage');return p&&p.x>=1020&&p.dx>0;}",timeout=10000)
    alighting=await theatre_hint(page,'右侧踏台到了')
    assert_theatre_rider(alighting)
    am=theatre_mover(alighting);ab=alighting['body']
    assert abs(am['y']-right['y'])<2 and min(am['x']+am['w'],right['x']+right['w'])>max(am['x'],right['x']), 'alighting hint had no real dock contact'
    assert right['x']-(ab['x']+ab['w']/2)<=55
    async def ashore():
        b=(await page.evaluate('window.__qaRead()'))['body']
        return b['platform'] is None and b['grounded'] and b['x']>1220 and abs(b['y']-right['y'])<2
    await hold(page,'right',until=ashore,touch=touch,limit=5)
    await page.wait_for_function("()=>{const b=window.__qaRead()?.body;return b?.grounded&&b.platform===null&&Math.abs(b.vx)<1;}",timeout=3000)
    landed=await page.evaluate('window.__qaRead()')
    lb=landed['body']
    assert right['x']<lb['x']<right['x']+right['w'] and abs(lb['y']-right['y'])<2
    assert landed['deaths']==initial['deaths'] and landed['state']=='playing'
    assert re.match(r'0\s*/',await page.locator('#stage-seals').inner_text()), 'platform route falsely solved a poem lamp'
    assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'theatre route horizontal overflow'
    await page.screenshot(path=str(output/(label+'-theatre-right-bank.png')),full_page=True)
    return {'viewport':page.viewport_size,'input':'CDP emulated touch controls' if touch else 'keyboard',
            'scope':'first moving-stage crossing only; not chapter completion',
            'leftBankReachedByJump':True,'waitHintMatchedGap':True,'boardHintMatchedContact':True,
            'bodyPlatformObserved':'stage','noInputCarryDistance':rb['x']-ride_start['body']['x'],
            'relativeRideOffsetDrift':(rb['x']-rm['x'])-relative_start,'alightHintMatchedContact':True,
            'rightBankReached':True,'noRespawns':True,'noHorizontalOverflow':True,'chapterCompleted':False,
            'evidence':{'waiting':waiting,'boarding':boarding,'rideStart':ride_start,'riding':riding,'alighting':alighting,'landed':landed}}

async def exercise_theatre(page,output,label):
    """Keep earned progress; resize the same session for a second touch crossing."""
    print(label,'enter the normally unlocked theatre chapter',flush=True)
    chapters=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1')).chapters")
    assert chapters[0]['completed'] and chapters[1]['completed'] and not chapters[2]['completed']
    await page.locator('[data-shell-action="map"]').click()
    await page.locator('#map-dialog[open]').wait_for()
    chapter=page.locator('#chapter-grid [data-chapter="2"]')
    assert await chapter.is_enabled(), 'real greenhouse completion did not unlock the theatre'
    await chapter.click()
    desktop=await cross_theatre_stage(page,output,label+'-keyboard')
    viewport=page.viewport_size
    emulation=await page.context.new_cdp_session(page)
    try:
        await page.set_viewport_size({'width':390,'height':844})
        await emulation.send('Emulation.setTouchEmulationEnabled',{'enabled':True,'maxTouchPoints':5})
        # This is a normal restart in the same actual save. No storage state,
        # progress or body coordinates are injected into a second context.
        if (await page.evaluate('window.__qaRead()'))['state']=='playing':
            await tap_control(page,'[data-shell-action="pause"]')
        await page.locator('#pause-dialog[open]').wait_for()
        await tap_control(page,'#stage-restart')
        await page.locator('#pause-dialog[open]').wait_for(state='hidden')
        touch=await cross_theatre_stage(page,output,label+'-touch-390',touch=True)
    finally:
        await emulation.send('Emulation.setTouchEmulationEnabled',{'enabled':False})
        await emulation.detach()
        await page.set_viewport_size(viewport)
    assert await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1')).chapters")==chapters, 'a stage crossing falsely settled chapter rewards'
    return {'enteredViaUnlockedChapterMap':True,'keyboard':desktop,'touch390':touch,
            'touchScope':'390x844 resized desktop Chromium context, real touch events; chapters 1-2 were earned with keyboard; no physical-phone or full mobile-playthrough claim',
            'chapterResultsUnchanged':True}

async def main(args):
    output=Path(args.output);output.mkdir(parents=True,exist_ok=True)
    report={'url':args.url,'source':'served production HTML; app module has a read-only coordinate probe appended in-memory; all actions use DOM/input','cases':[]}
    async with async_playwright() as p:
        b=await p.chromium.launch(headless=True,executable_path=args.chromium or None,args=['--no-sandbox'])
        for w,h,touch,full in [(1280,800,False,True),(390,844,True,False),(320,680,True,False)]:
            context=await b.new_context(viewport={'width':w,'height':h},has_touch=touch,is_mobile=touch,device_scale_factor=1)
            page=await context.new_page();errors=[];failed=[];instrumented_app_urls=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.on('response',lambda r:failed.append({'url':r.url,'status':r.status}) if r.status>=400 else None)
            async def instrument(route):
                response=await route.fetch()
                await route.fulfill(response=response,body=(await response.text())+PROBE)
                instrumented_app_urls.append(route.request.url)
            await page.route(re.compile(r'/dream-app\.js(?:\?[^#]*)?$'),instrument)
            await page.goto(args.url,wait_until='networkidle',timeout=45000)
            await page.wait_for_function("typeof window.__qaRead === 'function'",timeout=5000)
            assert instrumented_app_urls,'app module was not instrumented'
            version=await page.locator('meta[name="application-version"]').get_attribute('content')
            assert not args.version or version==args.version,(version,args.version)
            result=await exercise(page,output,str(w),touch,full)
            if full:
                station_saved=await page.evaluate("localStorage.getItem('tougaigu.capbook.v1')")
                assert station_saved and 'memories' in station_saved
                station_record=json.loads(station_saved)['scenes']['story-0']
                result['greenhouse']=await exercise_greenhouse(page,output,str(w))
                result['letterEcho']=await exercise_letter_echo(page,output,str(w))
            assert not errors,errors
            assert not failed,failed
            result['pageErrors']=errors;result['httpErrors']=failed
            result['instrumentedAppURLs']=instrumented_app_urls
            result['resources']=await page.evaluate("performance.getEntriesByType('resource').map(e=>({name:e.name.split('/').pop(),duration:e.duration,transferSize:e.transferSize}))")
            result['imagesLoaded']=await page.locator('img').evaluate_all('(els)=>els.filter(e=>e.getBoundingClientRect().width>0).every(e=>e.complete&&e.naturalWidth>0)')
            assert result['imagesLoaded'],'visible image failed to load'
            if full:
                # Read actual saved data, then reload without replacing/injecting it.
                saved=await page.evaluate("localStorage.getItem('tougaigu.capbook.v1')")
                assert saved and 'memories' in saved
                scenes=json.loads(saved)['scenes']
                assert scenes['story-0']==station_record, 'greenhouse play changed the station cap-book record'
                assert 1 in scenes['story-1']['memories'] and scenes['story-1']['seals']==[0,1]
                saved_grants=await read_reward_grants(page)
                assert await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1')).choices.letter")=='keep'
                await page.reload(wait_until='networkidle')
                await page.wait_for_function("typeof window.__qaRead === 'function'",timeout=5000)
                assert await page.evaluate("localStorage.getItem('tougaigu.capbook.v1')")==saved
                restored=await page.evaluate('window.__qaRead()')
                assert restored['chapterIndex']==1 and restored['letterChoice']=='keep'
                assert restored['letterEcho']=={'choice':'keep','phase':'waiting','elapsed':0}
                assert restored['form']=='body' and restored['capPhase']=='closed'
                assert await read_reward_grants(page)==saved_grants, 'reload granted a letter reward'
                await page.screenshot(path=str(output/(str(w)+'-letter-keep-reload.png')),full_page=True)
                result['reloadPreservedCapBook']=True
                result['greenhouse']['stationRecordPreserved']=True
                result['greenhouse']['reloadPreservedSeedAndLamps']=True
                result['letterEcho']['reloadRestoredKeep']=True
                result['theatre']=await exercise_theatre(page,output,str(w))
            assert not errors,errors
            assert not failed,failed
            report['cases'].append(result)
            await context.close()
        await b.close()
    (output/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--url',required=True);parser.add_argument('--output',default='verification/browser');parser.add_argument('--version');parser.add_argument('--chromium');asyncio.run(main(parser.parse_args()))
