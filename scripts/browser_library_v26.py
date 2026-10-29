"""Real browser chapter 4, from previously earned chapter-3 clear (no save or position injection)."""
from pathlib import Path

async def exercise_library(page,output,label,driver):
    output=Path(output)
    print(label,'naturally enter fourth chapter',flush=True)
    saved=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1'))")
    assert all(saved['chapters'][i]['completed'] for i in range(3)) and not saved['chapters'][3]['completed']
    assert saved['choices']['clock'] is None
    grants=await driver.read_reward_grants(page)
    await page.locator('[data-shell-action="map"]').click()
    await page.locator('#map-dialog[open]').wait_for()
    target=page.locator('#chapter-grid [data-chapter="3"]')
    assert await target.is_enabled()
    await target.click()
    await page.wait_for_function("()=>{const s=window.__qaRead?.();return s?.state==='playing'&&s.chapterIndex===3&&s.mode==='story'}")
    await page.wait_for_function("()=>{const p=window.__qaRead()?.libraryPaint;return p?.status==='ready'&&p.frame&&p.width===2172&&p.height===724}",timeout=12000)
    first=await page.evaluate("window.__qaRead()")
    assert first['libraryPaint']['lampLit']==[False,False] and first['libraryPaint']['lightAmounts']==[0,0]
    assert first['libraryPaint']['gateOpen'] is False
    assert await page.evaluate("document.documentElement.scrollWidth<=innerWidth")
    await page.screenshot(path=str(output/(label+'-library-entry.png')),full_page=True)

    # Observe the entire playable page at two realistic narrow viewports;
    # no DOM state, save, stage geometry or gameplay changes.
    desktop=page.viewport_size
    try:
        for width,height in [(390,844),(320,680)]:
            await page.set_viewport_size({'width':width,'height':height})
            await page.wait_for_timeout(100)
            assert await page.evaluate("document.documentElement.scrollWidth<=innerWidth")
            await driver.assert_hud_readable(page,label+'-library-'+str(width),form='body')
            await page.screenshot(path=str(output/(label+f'-library-entry-{width}.png')),full_page=True)
    finally:
        await page.set_viewport_size(desktop)
    intro=[]
    await page.locator('#stage-story').click()
    await page.locator('#story-dialog[open]').wait_for()
    for i,speaker,file,word in [
      (1,'蓝页','portrait-whale.svg','书签'),
      (2,'阿拾','portrait-hero-curious.svg','小满'),
      (3,'蓝页','portrait-whale.svg','藏好')
    ]:
        intro.append(await driver.read_ready_story_portrait(page,{'page':f'{i:02d} / 03','speaker':speaker,'file':file,'word':word}))
        await page.locator('#story-next').click()
    await page.locator('#story-dialog[open]').wait_for(state='hidden')
    await driver.drive_to(page,120,limit=7)
    assert (await page.evaluate("window.__qaRead()"))['libraryPaint']['npcNear']
    await page.locator('#dream-canvas').focus()
    await page.keyboard.press('q')
    await page.locator('#story-dialog[open]').wait_for()
    assert '身体踩浮书' in await page.locator('#story-dialog-text').inner_text()
    await page.screenshot(path=str(output/(label+'-library-npc-talk.png')),full_page=True)
    for _ in range(2):await page.locator('#story-next').click()
    await page.locator('#story-dialog[open]').wait_for(state='hidden')
    await driver.toggle(page,False)
    await page.wait_for_function("()=>window.__qaRead()?.form==='soul'")
    await page.screenshot(path=str(output/(label+'-library-npc-cap.png')),full_page=True)
    await driver.drive_to(page,375,420,limit=8)
    await page.wait_for_function("()=>window.__qaRead()?.memories>=1",timeout=3500)
    await driver.toggle(page,False)
    await page.wait_for_function("()=>window.__qaRead()?.form==='body'")

    async def board(book,x,low):
        await driver.drive_to(page,x,limit=13)
        await page.locator('#dream-canvas').focus()
        await page.wait_for_function("""({id,low})=>{const s=window.__qaRead();const p=s?.movers.find(m=>m.id===id);return s?.form==='body'&&s.body.grounded&&p?.y>=low&&p.dy>0;}""",arg={'id':book,'low':low},timeout=17000)
        await page.keyboard.press('Space')
        await page.wait_for_function("id=>{const s=window.__qaRead();return s?.body.platform===id&&s.body.grounded;}",arg=book,timeout=3000)
        state=await page.evaluate("window.__qaRead()")
        mover=next(p for p in state['movers'] if p['id']==book)
        assert abs(state['body']['y']-mover['y'])<.1
        await page.screenshot(path=str(output/(label+'-library-'+book+'-riding.png')),full_page=True)
        return {'support':book,'bodyX':state['body']['x'],'bodyY':state['body']['y'],'moverY':mover['y'],'deaths':state['deaths']}

    book_a=await board('book-a',691,478)
    await driver.toggle(page,False)
    await driver.drive_to(page,835,235,limit=11)
    await driver.puzzle(page,'更上一层楼')
    await page.wait_for_function("()=>{const p=window.__qaRead()?.libraryPaint;return p?.lampLit[0]&&!p.lampLit[1]&&p.lightAmounts[0]>.5}",timeout=6500)
    lamp1=(await page.evaluate("window.__qaRead()"))['libraryPaint']
    assert lamp1['gateOpen'] and lamp1['lightAmounts'][1]==0
    await page.screenshot(path=str(output/(label+'-library-first-lamp.png')),full_page=True)
    await driver.drive_to(page,990,270,limit=8)
    await page.wait_for_function("()=>window.__qaRead()?.memories>=2",timeout=3500)
    await driver.toggle(page,False)
    book_b=await board('book-b',1439,473)
    await driver.toggle(page,False)
    await driver.drive_to(page,1830,215,limit=16)
    await driver.puzzle(page,'一枚书签')
    await page.wait_for_function("()=>{const p=window.__qaRead()?.libraryPaint;return p?.lampLit.every(Boolean)&&p.lightAmounts.every(n=>n>.5)}",timeout=6500)
    lamp2=(await page.evaluate("window.__qaRead()"))['libraryPaint']
    await page.screenshot(path=str(output/(label+'-library-two-lamps.png')),full_page=True)
    await driver.drive_to(page,1600,410,limit=9)
    await page.locator('#dream-canvas').focus()
    await page.keyboard.press('Space')
    await page.wait_for_function("()=>window.__qaRead()?.libraryPaint?.hazards.some(h=>h.frozen>3)",timeout=1500)
    await driver.toggle(page,False)
    await driver.drive_to(page,1750,limit=5)
    safe=await page.evaluate("window.__qaRead()")
    assert safe['body']['x']>=1738 and safe['deaths']==0
    await driver.drive_to(page,2010,limit=8)
    await driver.toggle(page,False)
    await driver.drive_to(page,2060,390,limit=8)
    await page.wait_for_function("()=>window.__qaRead()?.memories===3",timeout=3500)
    await driver.toggle(page,False)
    await driver.drive_to(page,2160,until=lambda:page.locator('#result-dialog[open]').is_visible(),limit=8)
    await page.locator('#result-dialog[open]').wait_for()
    completed=await page.evaluate("window.__qaRead()")
    assert completed['chapterIndex']==3 and completed['state']=='complete' and completed['seals']==2 and completed['memories']==3 and completed['deaths']==0
    settled=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1'))")
    assert settled['chapters'][3]['completed'] and settled['chapters'][3]['runs']==saved['chapters'][3]['runs']+1
    assert settled['choices']['clock'] is None and settled['choices']['letter']==saved['choices']['letter']
    assert await driver.read_reward_grants(page)==grants
    await page.screenshot(path=str(output/(label+'-library-complete.png')),full_page=True)
    await page.locator('#result-story').click()
    await page.locator('#story-dialog[open]').wait_for()
    outro=[]
    for i,speaker,file,word in [
      (1,'蓝页','portrait-whale.svg','拧停了钟'),
      (2,'阿拾','portrait-hero-tender.svg','边走边读'),
      (3,'拾光','portrait-soul-brave.svg','留一页灯光')
    ]:
        outro.append(await driver.read_ready_story_portrait(page,{'page':f'{i:02d} / 03','speaker':speaker,'file':file,'word':word}))
        await page.screenshot(path=str(output/(label+f'-library-outro-{i}.png')),full_page=True)
        await page.locator('#story-next').click()
    await page.locator('#choice-dialog[open]').wait_for()
    await page.keyboard.press('Escape')
    await page.locator('#map-dialog[open]').wait_for()
    await page.locator('#chapter-grid [data-chapter="4"]').click()
    await page.locator('#choice-dialog[open]').wait_for()
    assert (await page.evaluate("window.__qaRead()"))['chapterIndex']==3
    await page.locator('#choice-options [data-choice="release"]').click()
    await page.locator('#story-dialog[open]').wait_for()
    await page.locator('#story-next').click()
    await page.wait_for_function("()=>window.__qaRead()?.chapterIndex===4",timeout=8000)
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
    await page.locator('#story-dialog[open]').wait_for()
    await page.locator('#story-next').click()
    hold=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1'))")
    assert hold['choices']['clock']=='hold' and hold['chapters'][3]==settled['chapters'][3]
    assert await driver.read_reward_grants(page)==grants
    return {'naturalUnlock':True,'paintedReady':first['libraryPaint'],'introDecoded':intro,
      'bluepageNearAndTalk':True,'bookA':book_a,'bookB':book_b,'firstLamp':lamp1,'secondLamp':lamp2,
      'soulPulseRealHazardFreeze':True,'zeroDeaths':True,'allThreeMemories':True,'realBodyExit':True,
      'settlementExactlyOnce':True,'outroDecoded':outro,'clockGateBlocksUntilReply':True,
      'releasePersistedReload':True,'journalHoldNoDuplicateRewards':True}
