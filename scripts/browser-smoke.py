"""Real DOM/input smoke test. Run with Playwright installed (test-only dependency).
python scripts/browser-smoke.py --url http://127.0.0.1:8080 --output verification/browser
A test-only read-only coordinate probe is appended in-memory to the app module.
All movement and puzzles still use real keyboard/touch/DOM input: no teleportation,
save injection, direct updates, or engine solving calls.
"""
import argparse,asyncio,json,math,re,shutil,time
from pathlib import Path
from urllib.parse import urljoin, urlparse
from playwright.async_api import async_playwright, expect


PROBE="""
window.__qaRead=()=>{
  if(!game)return null;
  const a=game.form==='soul'?game.soul:game.body,b=game.body,p=game.greenhousePlant;
  const character=game.getCharacterPresentation();
  return {
    form:game.form,state:game.state,chapterIndex:game.chapterIndex,mode:game.mode,festivalId:game.festivalId,controlSource,
    energy:game.energy,maxEnergy:game.maxEnergy,
    hudSample:currentHud?{form:currentHud.form,state:currentHud.state,time:currentHud.time,energy:currentHud.energy,maxEnergy:currentHud.maxEnergy}:null,
    observedAt:performance.now(),fullHudWrittenAt:lastHudAt,
    seals:game.lanterns.filter(l=>l.lit).length,memories:game.memories.filter(m=>m.collected).length,
    firstTicket:game.firstTicket?{...game.firstTicket}:null,
    x:a.x,y:a.y,vx:a.vx,vy:a.vy,time:game.time,visualTime:game.visualTime,deaths:game.deaths,camera:game.camera,
    reducedMotion:game.options.reducedMotion,
    body:{x:b.x,y:b.y,w:b.w,h:b.h,vx:b.vx,vy:b.vy,grounded:b.grounded,platform:b.platform,face:b.face,land:b.land},capPhase:game.cap?.phase,
    travelerPerformance:game.getTravelerPerformanceView(),
    characterPose:{walking:character.walking,step:character.step,hop:character.hop,scaleY:character.scaleY,tilt:character.tilt,
      bodyMatrix:[...character.rig.bodyMatrix],openingWorld:{...character.rig.openingWorld},
      grip:character.grip,clasp:character.clasp,catching:character.catching,
      arms:character.arms,performance:character.performance??null},
    theatrePaint:game.isTheatreFinish()?{
      phase:game.theatreScenes?.getStatus(),frame:game.theatrePaintedFrame,
      decodedWidth:game.getPaintedTheatreImage()?.naturalWidth??0,
      decodedHeight:game.getPaintedTheatreImage()?.naturalHeight??0,
      complete:game.getPaintedTheatreImage()?.complete===true,
      source:game.theatreScenes?.getSource()??null,
      imageSource:game.getPaintedTheatreImage()?.currentSrc||game.getPaintedTheatreImage()?.src||null,
      lampLit:game.lanterns.slice(0,2).map(l=>l.lit===true),
      lightAmounts:[...(game.theatreLight?.amounts||[])],
      encore:game.getTheatreEncoreView()
    }:null,
    nearHint:game.getNearHint(),
    movers:(game.movers||[]).map(p=>({id:p.id,x:p.x,y:p.y,w:p.w,h:p.h,dx:p.dx,dy:p.dy,range:p.range,speed:p.speed})),
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

# Observation only: this evaluates real layout, glyph rectangles, semantics and
# hit targets without changing a DOM attribute or assigning any game state.
HUD_PROBE="""async()=>{
  // Observe after the already queued game frame, then read all values in one
  // synchronous task. This is one passive frame boundary, not a retry loop.
  await new Promise(resolve=>requestAnimationFrame(resolve));
  const selectors={hud:'.stage-hud',chapter:'.stage-hud-left',title:'#stage-chapter-title',
    story:'#stage-story',goals:'.stage-goals',sealGroup:'.stage-goals>span:nth-child(1)',
    memoryGroup:'.stage-goals>span:nth-child(2)',seals:'#stage-seals',memories:'#stage-memories',
    form:'.stage-form',formName:'#stage-form-name',energy:'#stage-energy-meter',
    energyLabel:'#stage-energy-label',objectiveBox:'.stage-objective',objective:'#stage-objective',
    hint:'#stage-near-hint',bubble:'#cap-bubble',bubbleLines:'#cap-bubble-lines',
    activity:'#stage-cap-activity',activityName:'#stage-cap-activity-name',activityCount:'#stage-cap-activity-count',
    festivalBar:'.stage-festival-bar',seasonButton:'#stage-season',backStory:'#stage-back-story'};
  const rect=r=>({left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height});
  function read(el){
    if(!el)return null;
    const style=getComputedStyle(el),box=el.getBoundingClientRect(),range=document.createRange();
    range.selectNodeContents(el);
    return {rect:rect(box),text:el.textContent.trim(),visible:!!el.getClientRects().length&&box.width>0&&box.height>0&&style.display!=='none'&&style.visibility==='visible'&&Number(style.opacity)>0,
      clientWidth:el.clientWidth,clientHeight:el.clientHeight,scrollWidth:el.scrollWidth,scrollHeight:el.scrollHeight,
      whiteSpace:style.whiteSpace,textOverflow:style.textOverflow,lineClamp:style.webkitLineClamp,
      fontSize:parseFloat(style.fontSize),textRects:[...range.getClientRects()].map(rect)};
  }
  const elements=Object.fromEntries(Object.entries(selectors).map(([name,selector])=>[name,read(document.querySelector(selector))]));
  const meter=document.querySelector('#stage-energy-meter'),cap=document.querySelector('#stage-cap-label');
  const buttons=[...document.querySelectorAll('#stage-story,#stage-toggle,#stage-jump,#stage-interact,#stage-season,#stage-back-story,#stage-touch-move>button,.game-shell [data-shell-action="events"]')]
    .map(el=>{const state=read(el),r=state.rect,hit=document.elementFromPoint((r.left+r.right)/2,(r.top+r.bottom)/2);
      return {...state,id:el.id||el.dataset.direction||el.dataset.shellAction,centerHits:hit===el||el.contains(hit)};});
  const game=window.__qaRead();
  return {viewport:{width:innerWidth,height:innerHeight},elements,buttons,
    runtime:{form:game.form,state:game.state,time:game.time,mode:game.mode,festivalId:game.festivalId,energy:game.energy,maxEnergy:game.maxEnergy,seals:game.seals,memories:game.memories,controlSource:game.controlSource},
    hudSample:game.hudSample,timing:{observedAt:game.observedAt,fullHudWrittenAt:game.fullHudWrittenAt},
    meter:{role:meter?.getAttribute('role'),name:meter?.getAttribute('aria-label'),min:meter?.getAttribute('aria-valuemin'),max:meter?.getAttribute('aria-valuemax'),value:meter?.getAttribute('aria-valuenow'),text:meter?.getAttribute('aria-valuetext'),barPercent:parseFloat(document.querySelector('#stage-energy')?.style.width)},
    cap:{text:cap?.textContent.trim(),display:cap?getComputedStyle(cap).display:null,descriptionIds:document.querySelector('#stage-toggle')?.getAttribute('aria-describedby')},
    horizontalOverflow:document.documentElement.scrollWidth>innerWidth};
}"""
HUD_OBSERVATIONS=[]

def rectangles_overlap(a,b,tolerance=1):
    return min(a['right'],b['right'])-max(a['left'],b['left'])>tolerance and min(a['bottom'],b['bottom'])-max(a['top'],b['top'])>tolerance

def rect_contains(outer,inner,tolerance=1.5):
    return inner['left']>=outer['left']-tolerance and inner['right']<=outer['right']+tolerance and inner['top']>=outer['top']-tolerance and inner['bottom']<=outer['bottom']+tolerance

def validate_hud_geometry(snapshot):
    """Pure checks over observed DOM rectangles; fixtures never enter the game."""
    e=snapshot['elements'];phone=snapshot['viewport']['width']<=640
    assert not snapshot['horizontalOverflow'],'page has horizontal overflow'
    required=['hud','chapter','title','story','goals','sealGroup','memoryGroup','seals','memories','form','formName','energy','energyLabel','objectiveBox','objective','hint']
    for name in required:
        assert e.get(name) and e[name]['visible'],name+' is not visibly readable'
        r=e[name]['rect']
        assert r['left']>=-1 and r['right']<=snapshot['viewport']['width']+1,name+' leaves the viewport'
    for names in [('chapter','goals','form'),('title','story'),('sealGroup','memoryGroup'),('formName','energy','energyLabel')]:
        for i,a in enumerate(names):
            for b in names[i+1:]:
                assert not rectangles_overlap(e[a]['rect'],e[b]['rect']),a+' overlaps '+b
    for name in ['objective','hint','energyLabel']:
        item=e[name]
        assert item['text'] and item['textRects'],name+' has no visible text rectangles'
        if phone:
            assert item['fontSize']>=10,name+' was made too small to free space'
            if name!='energyLabel':
                assert item['whiteSpace']!='nowrap' and item['textOverflow']!='ellipsis',name+' still uses single-line truncation'
                assert item['lineClamp'] in ['none','0','',None],name+' still clamps lines'
        if item['clientWidth']:
            assert item['scrollWidth']<=item['clientWidth']+1,name+' hides horizontal text'
        if item['clientHeight']:
            assert item['scrollHeight']<=item['clientHeight']+1,name+' hides vertical text'
        for line in item['textRects']:
            if line['width'] and line['height']:
                assert rect_contains(item['rect'],line),name+' has a clipped text line'
    for name in ['objective','hint']:
        assert rect_contains(e['objectiveBox']['rect'],e[name]['rect']),name+' escapes the objective panel'
    if e.get('activity') and e['activity']['visible']:
        assert e['activityName']['visible'] and e['activityCount']['visible'],'nearby activity lost its name or count'
        assert not rectangles_overlap(e['activityName']['rect'],e['activityCount']['rect']),'activity name overlaps its actual progress'
        assert rect_contains(e['objectiveBox']['rect'],e['activity']['rect']),'activity escaped the reading panel'
    if e.get('festivalBar') and e['festivalBar']['visible']:
        assert rect_contains(e['objectiveBox']['rect'],e['festivalBar']['rect']),'festival return bar escaped the reading panel'
        for name in ['seasonButton','backStory']:
            if e[name]['visible']:
                assert rect_contains(e['festivalBar']['rect'],e[name]['rect']),name+' escaped the festival return bar'
        if e['seasonButton']['visible'] and e['backStory']['visible']:
            assert not rectangles_overlap(e['seasonButton']['rect'],e['backStory']['rect']),'festival story and return buttons overlap'
    gap=e['objectiveBox']['rect']['top']-e['hud']['rect']['bottom']
    if phone:
        assert gap>=5.5,'HUD and objective need at least 6px separation'
    bubble=e.get('bubble')
    bubble_gap=None
    if bubble and bubble['visible']:
        assert not rectangles_overlap(bubble['rect'],e['objectiveBox']['rect']),'speech bubble covers the current instruction'
        if phone:
            bubble_gap=bubble['rect']['top']-e['objectiveBox']['rect']['bottom']
            assert bubble_gap>=5.5,'speech bubble needs at least 6px after the objective'
            # Flavor speech keeps its existing two-line visual limit. Only
            # the current objective and action hint must expose every glyph.
    for button in snapshot['buttons']:
        if not button['visible']:continue
        assert button['centerHits'],button['id']+' is covered at its actual input center'
        if bubble and bubble['visible']:
            assert not rectangles_overlap(button['rect'],bubble['rect']),button['id']+' is covered by the speech bubble'
    return {'hudToObjectivePx':gap,'objectiveToBubblePx':bubble_gap}

def validate_hud_energy(snapshot):
    """Check one atomic observation at the route's settled collection states."""
    runtime=snapshot['runtime'];meter=snapshot['meter'];received=snapshot['hudSample']
    visible=snapshot['elements']['energyLabel']['text']
    facts={'viewport':snapshot['viewport'],'runtime':runtime,'hudSample':received,
           'timing':snapshot.get('timing'),'meter':meter,'visibleLabel':visible}
    detail=json.dumps(facts,ensure_ascii=False)
    assert received and received['maxEnergy']>0 and runtime['maxEnergy']>0,'missing actual energy source; '+detail
    try:value=int(meter['value'])
    except (ValueError,TypeError) as error:raise AssertionError('invalid accessible energy number; '+detail) from error
    actual=max(0,min(100,runtime['energy']/runtime['maxEnergy']*100))
    presented=max(0,min(100,received['energy']/received['maxEnergy']*100))
    assert meter['role']=='progressbar' and meter['name']=='拾光灵光','wrong energy semantics; '+detail
    assert meter['min']=='0' and meter['max']=='100','wrong accessible energy range; '+detail
    assert 0<=value<=100 and abs(value-actual)<=3,'accessible energy differs from live energy by more than 3; '+detail
    assert value==math.ceil(presented),'ARIA energy does not match the actual onHud snapshot; '+detail
    assert meter['barPercent'] is not None and abs(meter['barPercent']-presented)<=.001,'energy fill does not match the actual onHud snapshot; '+detail
    assert received['form']==runtime['form'],'energy source has a stale form; '+detail
    expected_visible=('灵光 ' if received['form']=='soul' else '恢复中 ')+str(value)+'%'
    if received['form']=='body' and presented>=99:expected_visible='灵光充足'
    assert visible==expected_visible,'visible energy label does not match the actual onHud snapshot; '+detail
    expected_text=visible if '%' in visible else visible+' '+str(value)+'%'
    assert meter['text']==expected_text,'accessible energy must retain the visible state and its actual percent; '+detail
    return {'livePercent':actual,'onHudPercent':presented,'ariaPercent':value,'liveDelta':abs(value-actual),
            'simulationAge':runtime['time']-received['time']}

def validate_hud_aria_energy(aria):
    """The later AX read is its own observation; recovery may finish meanwhile."""
    soul='拾光 · 灵魂' in aria;body='阿拾 · 身体' in aria
    assert soul!=body,'AX observation has no unambiguous current form: '+aria
    if soul:
        assert re.search(r'灵光\s+\d+%',aria),'AX soul has no readable energy percent: '+aria
    else:
        assert '灵光充足' in aria or re.search(r'恢复中\s+\d+%',aria),'AX body has no readable recovery/full state: '+aria

async def assert_hud_readable(page,label,form=None,hint=None,objective=None,cap=None,need_bubble=False):
    if form:
        await page.wait_for_function("form=>window.__qaRead()?.form===form",arg=form)
        await wait_text(page,'#stage-form-name','灵魂' if form=='soul' else '身体')
    if hint:await wait_text(page,'#stage-near-hint',hint)
    if objective:await wait_text(page,'#stage-objective',objective)
    snapshot=await page.evaluate(HUD_PROBE)
    try:gaps=validate_hud_geometry(snapshot)
    except AssertionError as error:raise AssertionError(label+': '+str(error)+'; '+json.dumps(snapshot,ensure_ascii=False)) from error
    e=snapshot['elements'];runtime=snapshot['runtime'];meter=snapshot['meter']
    if need_bubble:assert e['bubble']['visible'],label+': expected the naturally triggered speech bubble'
    try:energy_observation=validate_hud_energy(snapshot)
    except AssertionError as error:raise AssertionError(label+': '+str(error)) from error
    assert ('灵魂' if runtime['form']=='soul' else '身体') in e['formName']['text']
    await expect(page.locator('.stage-goals>span').nth(0)).to_have_accessible_name(re.compile(r'^谜灯\s*'+str(runtime['seals'])+r'\s*/\s*2$'),timeout=1500)
    memory_category='礼物' if runtime['mode']=='festival' else '记忆'
    await expect(page.locator('.stage-goals>span').nth(1)).to_have_accessible_name(re.compile('^'+memory_category+r'\s*'+str(runtime['memories'])+r'\s*/\s*3$'),timeout=1500)
    aria=await page.locator('.stage-hud').aria_snapshot(timeout=1500)
    assert '谜灯' in aria and memory_category in aria and '拾光灵光' in aria
    validate_hud_aria_energy(aria)
    assert 'stage-cap-label' in (snapshot['cap']['descriptionIds'] or '').split()
    assert snapshot['cap']['display']!='none','cap status was removed from the accessible control description'
    if cap:
        assert cap in snapshot['cap']['text']
        await expect(page.locator('#stage-toggle')).to_have_accessible_description(re.compile(re.escape(cap)),timeout=1500)
    if runtime['controlSource']=='buttons':
        assert not re.search(r'\b[EQ]\b|空格|WASD|方向键',e['hint']['text']),'button input left keyboard-only hints'
    record={'label':label,'viewport':snapshot['viewport'],'form':runtime['form'],'mode':runtime['mode'],'memoryCategory':memory_category,'actualEnergy':runtime['energy'],
            'accessibleEnergy':meter,'energyObservation':energy_observation,'onHudSample':snapshot['hudSample'],'energyTiming':snapshot['timing'],'gaps':gaps,'bubbleVisible':e['bubble']['visible'],
            'objective':e['objective']['text'],'nearHint':e['hint']['text'],'capDescription':snapshot['cap']['text'],
            'ariaSnapshot':aria,'objectiveAndHintUnclipped':True,'inputCentersUncovered':True,
            'rects':{name:e[name]['rect'] for name in ['hud','goals','form','objectiveBox','bubble']}}
    HUD_OBSERVATIONS.append(record)
    return record

async def sample_phone_hud(page,output,label,**expectations):
    """Resize a normally reached, stationary state; no coordinate/save mutation."""
    viewport=page.viewport_size
    try:
        for width,height in [(390,844),(320,680)]:
            await page.set_viewport_size({'width':width,'height':height})
            await page.wait_for_timeout(100)
            await assert_hud_readable(page,label+'-'+str(width),**expectations)
            await page.screenshot(path=str(Path(output)/(label+'-hud-'+str(width)+'.png')),full_page=True)
    finally:await page.set_viewport_size(viewport)

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
            # Match the <=12 dead zone used by change(direction) below. At
            # exactly 12px the driver releases input; that stopped point must
            # also count as arrived instead of waiting until the route times out.
            if abs(dx)<=12 and abs(dy)<=12 and abs(a['vx'])<40 and (y is None or abs(a['vy'])<40):return
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

STORY_PORTRAIT_PROBE="""()=>{
  const dialog=document.querySelector('#story-dialog'),image=document.querySelector('#story-portrait');
  const frame=image.closest('.story-portrait-wrap'),style=getComputedStyle(image),neutral=getComputedStyle(frame,'::after');
  const box=frame.getBoundingClientRect();
  return {open:dialog.open,page:document.querySelector('#story-page').textContent.trim(),
    speaker:document.querySelector('#story-dialog-title').textContent.trim(),text:document.querySelector('#story-dialog-text').textContent,
    source:image.getAttribute('src'),currentSrc:image.currentSrc,alt:image.alt,complete:image.complete,
    naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,pending:image.classList.contains('story-portrait-pending'),
    phase:frame.dataset.portrait,visibility:style.visibility,display:style.display,
    placeholder:{content:neutral.content,display:neutral.display,visibility:neutral.visibility,opacity:Number(neutral.opacity),width:box.width,height:box.height}};
}"""

def validate_story_portrait(snapshot,expected,pending=False):
    """A src attribute alone is never evidence that the current pixels are ready."""
    detail=json.dumps({'expected':expected,'pending':pending,'actual':snapshot},ensure_ascii=False)
    assert snapshot['open'] and snapshot['page']==expected['page'],'wrong active story page; '+detail
    assert snapshot['speaker']==expected['speaker'] and snapshot['alt']==expected['speaker'],'speaker and portrait alternative disagree; '+detail
    assert expected['word'] in snapshot['text'],'unexpected current story text; '+detail
    assert urlparse(snapshot['source'] or '').path.endswith('/'+expected['file']),'wrong requested portrait; '+detail
    if pending:
        assert snapshot['pending'] and snapshot['phase']=='loading','new speaker did not enter the loading state; '+detail
        assert snapshot['visibility']=='hidden','previous portrait is visible beside the new speaker; '+detail
        neutral=snapshot['placeholder']
        assert '✧' in neutral['content'] and neutral['display']!='none' and neutral['visibility']=='visible' and neutral['opacity']>0 and neutral['width']>0 and neutral['height']>0,'loading portrait has no visible neutral placeholder; '+detail
    else:
        assert snapshot['complete'] and snapshot['naturalWidth']>0 and snapshot['naturalHeight']>0,'current portrait has no decoded dimensions; '+detail
        assert urlparse(snapshot['currentSrc'] or '').path.endswith('/'+expected['file']),'ready pixels still belong to another speaker; '+detail
        assert not snapshot['pending'] and snapshot['phase']=='ready' and snapshot['visibility']=='visible' and snapshot['display']!='none','decoded portrait was not exposed; '+detail
    return snapshot

async def read_ready_story_portrait(page,expected):
    await page.wait_for_function("""file=>{const p=document.querySelector('#story-portrait');return p?.complete&&p.naturalWidth>0&&p.naturalHeight>0&&p.currentSrc.split('?')[0].endsWith('/'+file)&&p.getAttribute('src').split('?')[0].endsWith('/'+file)&&!p.classList.contains('story-portrait-pending')&&p.closest('.story-portrait-wrap')?.dataset.portrait==='ready';}""",arg=expected['file'],timeout=6500)
    # The real browser decoder must resolve, and the ready image gets a paint
    # opportunity before a screenshot. No wait is used to conceal a mismatch.
    snapshot=await page.evaluate("async()=>{await document.querySelector('#story-portrait').decode();await new Promise(resolve=>requestAnimationFrame(resolve));return ("+STORY_PORTRAIT_PROBE+")();}")
    return validate_story_portrait(snapshot,expected)

def validate_portrait_request(record):
    """Only this exact obsolete image request may be cancelled by Chromium."""
    detail=json.dumps(record,ensure_ascii=False)
    assert record['requestCount']==1,'portrait delay did not intercept exactly one cold request; '+detail
    cancellation=record['failure']=='net::ERR_ABORTED' and record['obsolete'] and record['obsoleteAtFailure']
    assert not record['failure'] or cancellation,'unexpected delayed-portrait network failure; '+detail
    assert not record['handlerError'] or cancellation,'portrait route failed without the exact expected cancellation; '+detail
    assert record['fulfilled'] or cancellation,'portrait response was neither fulfilled nor superseded; '+detail
    return {'url':record['url'],'failure':record['failure']} if cancellation else None

class PortraitRequestGate:
    """Delay one original response; never alter the URL, bytes, DOM or save."""
    def __init__(self,url,label):
        self.url=url;self.label=label;self.request=None;self.request_count=0
        self.obsolete=False;self.obsolete_at_failure=False;self.failure=None;self.handler_error=None;self.fulfilled=False
        self.arrived=asyncio.Event();self.release=asyncio.Event();self.handled=asyncio.Event();self.network_done=asyncio.Event()

    async def route(self,route):
        self.request_count+=1
        if self.request is not None:
            await route.continue_()
            return
        self.request=route.request;self.arrived.set()
        try:
            response=await route.fetch()
            await self.release.wait()
            await route.fulfill(response=response)
            self.fulfilled=True
        except Exception as error:
            # A replaced <img> may cancel its intercepted request. Keep the
            # exact error and request identity; finish() rejects every other
            # failure rather than silently ignoring route errors.
            self.handler_error=str(error)
        finally:self.handled.set()

    def failed(self,request):
        if request is self.request:
            self.failure=request.failure
            self.obsolete_at_failure=self.obsolete
            self.network_done.set()

    def finished(self,request):
        if request is self.request:self.network_done.set()

    def record(self):
        return {'label':self.label,'url':self.url,'requestCount':self.request_count,'obsolete':self.obsolete,
                'obsoleteAtFailure':self.obsolete_at_failure,
                'fulfilled':self.fulfilled,'failure':self.failure,'handlerError':self.handler_error}

    async def finish(self):
        self.release.set()
        await asyncio.wait_for(self.handled.wait(),8)
        try:await asyncio.wait_for(self.network_done.wait(),6)
        except asyncio.TimeoutError as error:
            raise AssertionError('delayed portrait has no terminal network event: '+json.dumps(self.record(),ensure_ascii=False)) from error
        record=self.record()
        return record,validate_portrait_request(record)

async def exercise_portrait_sequence(page,output,label):
    """Exercise real dialogue races once, before the normal chapter-one route."""
    print(label,'observe delayed portraits, rapid next and Escape/reopen',flush=True)
    first={'page':'01 / 03','speaker':'绒绒','word':'阿拾','file':'portrait-moth.svg'}
    second={'page':'02 / 03','speaker':'阿拾','word':'鸣笛','file':'portrait-hero-curious.svg'}
    third={'page':'03 / 03','speaker':'拾光','word':'掀盖看看','file':'portrait-soul-peek.svg'}
    read_save="JSON.parse(localStorage.getItem('tougaigu.dream.v1'))"
    before=await page.evaluate(read_save);rewards=await read_reward_grants(page)
    target=urljoin(page.url,'assets/'+second['file']);cases=[];expected_failures=[]
    for index,mode in enumerate(['slow-current','rapid-next','escape-reopen']):
        gate=PortraitRequestGate(target,mode)
        page.on('requestfailed',gate.failed);page.on('requestfinished',gate.finished)
        await page.route(target,gate.route)
        try:
            # A new real document removes the previous decoded-image instance.
            # Routing disables HTTP caching; the earned save is left intact.
            if index:
                await page.reload(wait_until='networkidle')
                await page.wait_for_function("()=>window.__qaRead?.()?.chapterIndex===0&&window.__qaRead()?.state==='playing'")
            await page.locator('#stage-story').click()
            previous=await read_ready_story_portrait(page,first)
            await page.locator('#story-next').click()
            try:await asyncio.wait_for(gate.arrived.wait(),5)
            except asyncio.TimeoutError as error:
                raise AssertionError('target portrait was not requested: '+json.dumps({'request':gate.record(),'actual':await page.evaluate(STORY_PORTRAIT_PROBE)},ensure_ascii=False)) from error
            pending=validate_story_portrait(await page.evaluate(STORY_PORTRAIT_PROBE),second,pending=True)
            await page.screenshot(path=str(Path(output)/(label+'-portrait-'+mode+'-pending.png')),full_page=True)
            expected=second
            if mode=='rapid-next':
                gate.obsolete=True
                # Next is the existing live control, even while decode waits.
                await page.locator('#story-next').click()
                await read_ready_story_portrait(page,third)
                expected=third
            elif mode=='escape-reopen':
                gate.obsolete=True
                # There is no invented close button: Escape follows the
                # production dialog cancel -> finishStory -> resume path.
                await page.keyboard.press('Escape')
                await page.locator('#story-dialog[open]').wait_for(state='hidden')
                await page.wait_for_function("()=>window.__qaRead()?.state==='playing'")
                await page.locator('#stage-story').click()
                await read_ready_story_portrait(page,first)
                expected=first
            request,cancellation=await gate.finish()
            if cancellation:expected_failures.append(cancellation)
            current=await read_ready_story_portrait(page,expected)
            assert (await page.evaluate('window.__qaRead()'))['state']=='paused'
            await page.screenshot(path=str(Path(output)/(label+'-portrait-'+mode+'-settled.png')),full_page=True)
            cases.append({'case':mode,'before':previous,'whileDelayed':pending,'afterResponse':current,'request':request,
                          'oldImageHiddenWithNewText':True,'neutralPlaceholderVisible':True,'currentImageDecoded':True,
                          'lateResponseOutcome':'browser cancelled obsolete request' if cancellation else 'original response delivered; current page retained'})
            await page.keyboard.press('Escape')
            await page.locator('#story-dialog[open]').wait_for(state='hidden')
            await page.wait_for_function("()=>window.__qaRead()?.state==='playing'")
        finally:
            gate.release.set()
            if gate.request is not None and not gate.handled.is_set():
                await asyncio.wait_for(gate.handled.wait(),8)
            await page.unroute(target,gate.route)
            page.remove_listener('requestfailed',gate.failed);page.remove_listener('requestfinished',gate.finished)
    after=await page.evaluate(read_save)
    for key in ['chapters','choices','discoveredEndings','lastChapter']:
        assert after[key]==before[key],'reading or cancelling a story changed '+key
    assert await read_reward_grants(page)==rewards,'portrait sequencing granted or claimed a reward'
    return {'cases':cases,'expectedRequestFailures':expected_failures,'normalEscapeCancelAndReopen':True,
            'chaptersChoicesAndRewardsUnchanged':True,
            'scope':'real first-chapter dialogue and original delayed image responses; fast Next and normal Escape/reopen; no network bytes, DOM, coordinates or saves replaced'}

def traveler_pose_record(snapshot):
    return {key:snapshot[key] for key in ['chapterIndex','mode','state','form','time','visualTime','deaths','reducedMotion','body','travelerPerformance','characterPose']}

def validate_traveler_pose(snapshot,phase=None,reduced_motion=None):
    """Compare the actual drawing view with independently observed physics."""
    body=snapshot['body'];view=snapshot['travelerPerformance'];pose=snapshot['characterPose']
    detail=json.dumps(traveler_pose_record(snapshot),ensure_ascii=False)
    assert all(math.isfinite(n) for n in pose['bodyMatrix']) and len(pose['bodyMatrix'])==6,'invalid character rig; '+detail
    for side in ['left','right']:
        for point in ['shoulder','elbow','wrist','requested','world']:
            assert all(math.isfinite(pose['arms'][side][point][axis]) for axis in ['x','y']),'non-finite actual arm; '+detail
    if snapshot['mode']!='story' or snapshot['chapterIndex']!=2:
        assert view is None and pose['performance'] is None,'third-chapter acting leaked outside its scope; '+detail
    else:
        assert view and pose['performance']==view,'actual drawing presentation lost the production performance view; '+detail
        assert view['reducedMotion']==snapshot['reducedMotion'],'view and real reduced-motion setting disagree; '+detail
        assert view['phase'] in ['idle','rise','fall','land','ride'],'unknown actual performance phase; '+detail
        for key in ['rise','fall','landing','ride']:
            assert 0<=view[key]<=1,'performance amount outside its range; '+detail
        assert -1<=view['balance']<=1 and math.isfinite(view['platformVelocity']),'invalid physical platform balance; '+detail
        if phase:assert view['phase']==phase,'performance phase disagrees with the observed transition; '+detail
        if reduced_motion is not None:assert view['reducedMotion'] is reduced_motion,'wrong actual reduced-motion setting; '+detail
        if view['reducedMotion']:
            assert all(view[key]==0 for key in ['rise','fall','landing','ride','balance']),'reduced motion retained decorative amplitude; '+detail
            assert view['landingAge'] is None and view['freeArms']=={'left':{'x':-16,'y':-16},'right':{'x':17,'y':-16}},'reduced motion retained a free-arm animation; '+detail
        elif phase in ['rise','fall','ride'] and max(pose['grip'],pose['clasp'],pose['catching'])<.001 and abs(body['vx'])<1:
            # This catches a renderer accidentally returning the old base arms
            # while an unused view merely reports the new acting state.
            for side in ['left','right']:
                for axis in ['x','y']:
                    assert abs(pose['arms'][side]['requested'][axis]-view['freeArms'][side][axis])<.001,'actual free arm did not use its performance target; '+detail
    if phase=='rise':assert not body['grounded'] and body['vy']<0,'rise lacks real upward motion; '+detail
    if phase=='fall':assert not body['grounded'] and body['vy']>0,'fall lacks real downward motion; '+detail
    if phase in ['land','idle','ride']:
        assert body['grounded'] and abs(body['vy'])<.01,'ground pose is physically airborne; '+detail
        surfaces=snapshot['platforms']+snapshot['movers']
        assert any(abs(body['y']-surface['y'])<.05 and body['x']+body['w']/2>surface['x']+1 and body['x']-body['w']/2<surface['x']+surface['w']-1 for surface in surfaces),'ground pose has no real support; '+detail
    if view and phase=='land':
        assert 0<=view['landingAge']<view['landingDuration']==.2 and view['landing']>0,'landing is not the short current contact response; '+detail
    if phase=='ride':
        assert body['platform']=='stage' and view['platformId']=='stage','riding pose lacks actual stage attachment; '+detail
    return traveler_pose_record(snapshot)

async def await_traveler_pose(page,phase,reduced_motion=None):
    try:
        handle=await page.wait_for_function("""({phase,reducedMotion})=>{
          const a=window.__qaRead(),b=a?.body,v=a?.travelerPerformance;
          if(!a||a.state!=='playing'||a.form!=='body')return false;
          if(reducedMotion!==null&&a.reducedMotion!==reducedMotion)return false;
          const physical=phase==='rise'?!b.grounded&&b.vy<-80:phase==='fall'?!b.grounded&&b.vy>80:b.grounded&&Math.abs(b.vy)<.01;
          return physical&&(!v||v.phase===phase)?a:false;
        }""",arg={'phase':phase,'reducedMotion':reduced_motion},timeout=3500)
        try:snapshot=await handle.json_value()
        finally:await handle.dispose()
    except Exception as error:
        raise AssertionError('actual body never presented '+phase+'; '+json.dumps(await page.evaluate('window.__qaRead()'),ensure_ascii=False)) from error
    validate_traveler_pose(snapshot,phase,reduced_motion)
    return snapshot

async def sample_body_jump(page,label,pause=False,output=None,reduced_motion=None):
    """One real vertical Space jump from a naturally reached safe floor."""
    before=await page.evaluate('window.__qaRead()')
    assert before['form']=='body' and before['body']['grounded'] and abs(before['body']['vx'])<1
    # Starting a chapter from a button can leave the hidden launcher focused.
    # Keyboard controls intentionally ignore button targets, so put focus on
    # the actual focusable canvas before issuing an ordinary player's jump.
    await page.locator('#dream-canvas').focus()
    await expect(page.locator('#dream-canvas')).to_be_focused()
    # Read the jump on its real Space keydown, before polling can miss a
    # transient airborne phase. No character or save state is injected.
    await page.keyboard.down('Space')
    try:
        rise=await page.evaluate('window.__qaRead()')
        if rise['body']['grounded'] or rise['body']['vy']>=-80:
            active=await page.evaluate("()=>({focused:document.activeElement?.id,openDialogs:[...document.querySelectorAll('dialog[open]')].map(d=>d.id)})")
            raise AssertionError('real Space keydown did not initiate an upward jump: '+json.dumps({'focus':active,'snapshot':traveler_pose_record(rise)},ensure_ascii=False))
        validate_traveler_pose(rise,'rise',reduced_motion)
    finally:
        await page.keyboard.up('Space')
    paused_evidence=None
    if pause:
        await page.keyboard.press('Escape')
        await page.locator('#pause-dialog[open]').wait_for()
        paused=await page.evaluate('window.__qaRead()')
        assert paused['state']=='paused' and not paused['body']['grounded'],'pause did not catch the real airborne pose: '+json.dumps(traveler_pose_record(paused),ensure_ascii=False)
        validate_traveler_pose(paused,paused['travelerPerformance']['phase'],reduced_motion)
        pixels=await page.locator('#dream-canvas').evaluate('(canvas)=>canvas.toDataURL()')
        frozen=await page.evaluate("async()=>{for(let i=0;i<6;i++)await new Promise(resolve=>requestAnimationFrame(resolve));return window.__qaRead();}")
        assert traveler_pose_record(frozen)==traveler_pose_record(paused),'paused body/performance/rig advanced'
        assert await page.locator('#dream-canvas').evaluate('(canvas)=>canvas.toDataURL()')==pixels,'paused character pixels changed'
        paused_evidence={'observed':traveler_pose_record(paused),'passiveFrames':6,'fullPoseFrozen':True,'canvasPixelsFrozen':True}
        if output:await page.screenshot(path=str(Path(output)/(label+'-traveler-airborne-paused.png')),full_page=True)
        await page.locator('#stage-resume').click()
    fall=await await_traveler_pose(page,'fall',reduced_motion)
    end_phase='idle' if reduced_motion else 'land'
    landed=await await_traveler_pose(page,end_phase,reduced_motion)
    for axis in ['x','y']:
        assert abs(landed['body'][axis]-before['body'][axis])<.1,'vertical jump did not return to its real floor'
    assert landed['deaths']==before['deaths'],'pose route respawned'
    return {'label':label,'input':'actual Space key','rise':traveler_pose_record(rise),'fall':traveler_pose_record(fall),
            'landed':traveler_pose_record(landed),'pause':paused_evidence,'noRespawns':True,'samePhysicalFloor':True}

async def set_reduced_motion_from_ui(page,enabled):
    await page.locator('[data-shell-action="settings"]').click()
    await page.locator('#preferences-dialog[open]').wait_for()
    await page.locator('#dream-pref-motion').set_checked(enabled)
    await expect(page.locator('#dream-pref-motion')).to_be_checked(checked=enabled)
    assert await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1')).settings.reducedMotion")==enabled
    assert (await page.evaluate('window.__qaRead()'))['reducedMotion']==enabled
    await page.locator('[data-close="preferences-dialog"]').click()
    await page.wait_for_function("()=>window.__qaRead()?.state==='playing'")

async def exercise_traveler_performance(page,output,label):
    await page.wait_for_function("()=>{const a=window.__qaRead();return a?.form==='body'&&a.capPhase==='closed'&&a.body.grounded&&Math.abs(a.body.vx)<1;}")
    initial=await page.evaluate('window.__qaRead()');original=initial['reducedMotion']
    assert initial['chapterIndex']==2 and initial['body']['x']<200
    rewards=await read_reward_grants(page)
    before=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1'))")
    try:
        if original:await set_reduced_motion_from_ui(page,False)
        normal=await sample_body_jump(page,label,pause=True,output=output,reduced_motion=False)
        await page.wait_for_function("()=>window.__qaRead()?.travelerPerformance?.phase==='idle'")
        await set_reduced_motion_from_ui(page,True)
        reduced=await sample_body_jump(page,label+'-reduced-motion',reduced_motion=True)
    finally:
        if (await page.evaluate('window.__qaRead()'))['reducedMotion']!=original:
            await set_reduced_motion_from_ui(page,original)
    after=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1'))")
    for key in ['chapters','choices','discoveredEndings','lastChapter']:
        assert after[key]==before[key],'body acting verification changed '+key
    assert after['settings']['reducedMotion']==before['settings']['reducedMotion']
    assert await read_reward_grants(page)==rewards
    return {'normalJump':normal,'reducedMotionJump':reduced,'settingChangedAndRestoredThroughUI':True,
            'rewardGrantsAndChapterResultsUnchanged':True,'scope':'actual third-chapter body pose and drawing presentation, physical rise/fall/contact; six paused RAF opportunities; one reduced-motion jump'}

async def hold(page,direction,seconds=None,until=None,touch=False,limit=5):
    # A condition may become true during preceding read-only HUD work. Do not
    # introduce another key/touch pulse when the actor has already arrived.
    if seconds is None and until is not None and await until():return
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
    await assert_hud_readable(page,label+'-station-body',form='body')
    assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'horizontal overflow'
    assert '上海九喵科技有限公司' in await page.locator('.corporate-footer').inner_text()
    await page.screenshot(path=str(output/(label+'-start.png')),full_page=True)
    version=await page.locator('meta[name="application-version"]').get_attribute('content')
    print(label,'sample animation frames',flush=True)
    timings=await page.evaluate('''async()=>{const a=[];let prev=performance.now();for(let i=0;i<61;i++)await new Promise(r=>requestAnimationFrame(t=>{if(i)a.push(t-prev);prev=t;r()}));a.sort((x,y)=>x-y);return {samples:a.length,p50:a[30],p95:a[57]}}''')
    station_pose=await sample_body_jump(page,label+'-station') if full else None
    print(label,'collect ticket',flush=True)
    await toggle(page,touch)
    async def ticket():return bool(re.match(r'1\s*/',await page.locator('#stage-memories').inner_text()))
    await drive_to(page,270,420,touch=touch,until=ticket)
    await page.wait_for_timeout(120)
    assert await ticket(), 'actual flight did not collect ticket'
    await assert_hud_readable(page,label+'-ticket-held',form='soul',objective='去程票抱好了',cap='去程票抱好了',need_bubble=True)
    await page.screenshot(path=str(output/(label+'-ticket.png')),full_page=True)
    if full:
        await sample_phone_hud(page,output,label+'-ticket-held',form='soul',objective='去程票抱好了',cap='去程票抱好了',need_bubble=True)
        # One natural depletion, reused at both phone widths. No assignment to
        # energy and no extra low-energy wait in the independent phone cases.
        await page.wait_for_function("()=>{const a=window.__qaRead();return a?.form==='soul'&&a.energy<=23;}",timeout=21000)
        await sample_phone_hud(page,output,label+'-low-energy',form='soul',hint='灵光快用完了')
    await toggle(page,touch)
    if full:await sample_phone_hud(page,output,label+'-recovering-energy',form='body')
    else:await assert_hud_readable(page,label+'-recovering-energy',form='body')
    await page.wait_for_timeout(900)
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
        await sample_phone_hud(page,output,label+'-plate',form='body',hint='踏板压住了')
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
    return {'viewport':page.viewport_size,'version':version,'ticketCollectedAndReturned':True,'pauseFrozen':True,'noHorizontalOverflow':True,'chapterCompleted':full,'input':'emulated Chromium touch' if touch else 'keyboard','rafIntervalMs':timings,'frameSamplePhase':'initial active idle; not a physical-device benchmark','stationBodyJump':station_pose}

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
    await sample_phone_hud(page,output,label+'-greenhouse-seed-held',form='soul',hint='种子托好了',cap='种子抱好了',need_bubble=True)
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
    jump_poses={}
    def observe_shelf_jump(a):
        b=a['body']
        phase='rise' if not b['grounded'] and b['vy']<-80 else 'fall' if not b['grounded'] and b['vy']>80 else None
        if phase and phase not in jump_poses:jump_poses[phase]=validate_traveler_pose(a,phase)
    await page.keyboard.press('Space')
    await drive_to(page,1390,observe=observe_shelf_jump)
    await page.wait_for_function("()=>{const b=window.__qaRead()?.body;return b?.grounded&&Math.abs(b.y-445)<2;}",timeout=5000)
    shelf=await page.evaluate('window.__qaRead()')
    route['shelfLanding']=shelf['body']
    jump_poses['landed']=validate_traveler_pose(shelf,'land')
    assert 'rise' in jump_poses and 'fall' in jump_poses,'greenhouse jump did not expose both physical directions'
    route['shelfJumpPoses']=jump_poses
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
    await assert_hud_readable(page,'theatre-'+phrase,form='body',hint=phrase)
    # This is evidence at the observed hint, not a current input position:
    # accessibility queries above take time while the real stage keeps moving.
    return snapshot

def theatre_alight_window(snapshot,right):
    """Fresh, read-only walking/braking clearance on the authored real dock."""
    b=snapshot['body'];p=theatre_mover(snapshot)
    if snapshot['form']!='body' or snapshot['state']!='playing':return False
    if not b['grounded'] or b['platform']!='stage' or abs(b['vx'])>=1:return False
    if abs(b['y']-p['y'])>=2 or abs(p['y']-right['y'])>.01 or p['dx']<=0:return False
    if min(p['x']+p['w'],right['x']+right['w'])-max(p['x'],right['x'])<=1:return False
    # Base physics retains the old mover during same-height overlap. The
    # body must clear its RIGHT edge, then brake, before the bank ends. These
    # are the unchanged walk speed / acceleration also used by drive_to().
    walk_speed=240;acceleration=1650;input_budget=.10
    edge=p['x']+p['w']+b['w']/2-1
    distance=max(0,edge-b['x'])
    walk_seconds=distance/walk_speed+walk_speed/(2*acceleration)
    carry_speed=abs(p['range']*p['speed']) # maximum of the actual sine mover
    projected_stop=edge+carry_speed*(walk_seconds+input_budget)+walk_speed*input_budget+walk_speed**2/(2*acceleration)
    return projected_stop<right['x']+right['w']-b['w']/2

async def wait_theatre_alight_window(page,right):
    # An accessibility observation can outlast this departure's safe window.
    # A standing rider may take the NEXT genuine round trip; no state is reset.
    snapshot=await page.evaluate('window.__qaRead()')
    period=6.283185307179586/abs(theatre_mover(snapshot)['speed'])
    end=time.monotonic()+period+1
    while True:
        if theatre_alight_window(snapshot,right):return snapshot
        if time.monotonic()>=end:
            raise AssertionError('no real outward dock with walking/braking room: '+json.dumps({'right':right,'actual':snapshot},ensure_ascii=False))
        await page.wait_for_timeout(30)
        snapshot=await page.evaluate('window.__qaRead()')

async def assert_theatre_paint(page,kind='primary'):
    expected={'primary':['ready',True,2172,724,'theatre-painted-v22.webp'],
              'svg':['ready',True,2400,750,'theatre-painted-v20.svg'],
              'procedural':['failed',False,0,0,None]}[kind]
    await page.wait_for_function("([phase,frame,w,h])=>{const p=window.__qaRead()?.theatrePaint;return p?.phase===phase&&p.frame===frame&&p.decodedWidth===w&&p.decodedHeight===h;}",arg=expected[:4],timeout=12000)
    p=(await page.evaluate('window.__qaRead()'))['theatrePaint']
    if expected[4]:
        assert p['complete'] and urlparse(p['source']).path.endswith('/'+expected[4])
        assert p['imageSource']==p['source'], 'ready cache does not match the actual decoded image'
    else:
        assert p['source'] is None and p['imageSource'] is None and not p['complete']
    return p

async def cross_theatre_stage(page,output,label,touch=False,expected_lamps=None,paint='primary'):
    """Walk/jump to the left bank, board on contact, ride without input, alight."""
    output=Path(output)
    await wait_text(page,'#stage-chapter-title','借月剧场')
    await page.wait_for_function("()=>{const a=window.__qaRead();return a?.chapterIndex===2&&a.state==='playing'&&a.form==='body';}")
    await assert_theatre_paint(page,paint)
    initial=await page.evaluate('window.__qaRead()')
    assert initial['body']['x']<(530 if expected_lamps else 200) and initial['deaths']==0
    assert initial['theatrePaint']['lampLit']==(expected_lamps or [False,False])
    assert (initial['theatrePaint']['lightAmounts'][0]>0 if expected_lamps else initial['theatrePaint']['lightAmounts']==[0,0])
    assert initial['theatrePaint']['frame']==(paint!='procedural'), 'background does not match the explicit expected source'
    banks=[p for p in initial['platforms'] if p['y']==465 and p['kind'] is None]
    left=next((p for p in banks if p['x']==565),None)
    right=next((p for p in banks if p['x']==1130),None)
    assert left and right and left['w']==220 and right['w']==225
    assert theatre_mover(initial)['w']==185, 'the test expects the original moving-platform geometry'

    print(label,'jump onto the actual left-bank shelf',flush=True)
    await drive_to(page,490,touch=touch)
    await page.wait_for_function("()=>{const b=window.__qaRead()?.body;return b?.grounded&&Math.abs(b.vx)<1;}")
    jump_poses={}
    def observe_jump(a):
        b=a['body']
        phase='rise' if not b['grounded'] and b['vy']<-80 else 'fall' if not b['grounded'] and b['vy']>80 else None
        if phase and phase not in jump_poses:jump_poses[phase]=validate_traveler_pose(a,phase)
    if touch:await tap_control(page,'#stage-jump')
    else:await page.keyboard.press('Space')
    await drive_to(page,710,touch=touch,observe=observe_jump)
    await page.wait_for_function("()=>{const b=window.__qaRead()?.body;return b?.grounded&&b.platform===null&&Math.abs(b.y-465)<2&&Math.abs(b.vx)<1;}")
    shelf=await page.evaluate('window.__qaRead()')
    jump_poses['landed']=validate_traveler_pose(shelf,shelf['travelerPerformance']['phase'])
    assert 'rise' in jump_poses and 'fall' in jump_poses,label+': actual shelf jump missed a direction; '+json.dumps(jump_poses,ensure_ascii=False)
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
    # HUD/AX observation above must not consume the window used for INPUT.
    # Re-observe the next real outward contact before pressing a direction.
    await page.wait_for_function("()=>{const a=window.__qaRead(),p=a?.movers.find(p=>p.id==='stage'),b=a?.body;return p&&b?.grounded&&b.platform===null&&Math.abs(b.y-p.y)<2&&p.x<=725&&p.dx>0;}",timeout=15000)
    board_input=await page.evaluate('window.__qaRead()')
    async def aboard():return (await page.evaluate('window.__qaRead()'))['body']['platform']=='stage'
    await hold(page,'right',until=aboard,touch=touch,limit=5)
    await page.wait_for_function("()=>{const b=window.__qaRead()?.body;return b?.platform==='stage'&&b.grounded&&Math.abs(b.vx)<1;}",timeout=3000)
    ride_start=await page.evaluate('window.__qaRead()')
    assert_theatre_rider(ride_start)
    rider_start_pose=validate_traveler_pose(ride_start,'ride')
    start_mover=theatre_mover(ride_start)
    relative_start=ride_start['body']['x']-start_mover['x']

    # All direction keys/touches have been released by hold(). Only the real
    # platform may carry the player through this interval.
    await page.wait_for_function("()=>window.__qaRead()?.movers.find(p=>p.id==='stage')?.x>=900",timeout=10000)
    riding=await theatre_hint(page,'站稳就好')
    assert_theatre_rider(riding)
    rider_pose=validate_traveler_pose(riding,'ride')
    rm=theatre_mover(riding);rb=riding['body']
    assert rm['x']-start_mover['x']>100 and rb['x']-ride_start['body']['x']>100
    assert abs(rb['vx'])<1 and abs((rb['x']-rm['x'])-relative_start)<1, 'standing rider slid relative to the moving stage'
    assert left['x']+left['w']<rb['x']<right['x'], 'midstage evidence was not over the gap'
    await page.screenshot(path=str(output/(label+'-theatre-midstage.png')),full_page=True)

    await page.wait_for_function("()=>{const p=window.__qaRead()?.movers.find(p=>p.id==='stage');return p&&p.x>=970&&p.dx>0;}",timeout=10000)
    alighting=await theatre_hint(page,'右侧踏台到了')
    assert_theatre_rider(alighting)
    am=theatre_mover(alighting);ab=alighting['body']
    assert abs(am['y']-right['y'])<2 and min(am['x']+am['w'],right['x']+right['w'])>max(am['x'],right['x']), 'alighting hint had no real dock contact'
    assert right['x']-(ab['x']+ab['w']/2)<=55
    alight_input=await wait_theatre_alight_window(page,right)
    assert_theatre_rider(alight_input)
    async def ashore():
        b=(await page.evaluate('window.__qaRead()'))['body']
        return b['platform'] is None and b['grounded'] and b['x']>1220 and abs(b['y']-right['y'])<2
    key_release=None
    try:
        await hold(page,'right',until=ashore,touch=touch,limit=5)
        key_release=await page.evaluate('window.__qaRead()')
        await page.wait_for_function("right=>{const b=window.__qaRead()?.body;return b?.grounded&&b.platform===null&&Math.abs(b.vx)<1&&b.x>right.x&&b.x<right.x+right.w&&Math.abs(b.y-right.y)<2;}",arg=right,timeout=3000)
    except Exception as error:
        actual=await page.evaluate('window.__qaRead()')
        raise AssertionError(label+': actual right-bank landing failed; '+json.dumps({'right':right,'hintObservation':alighting,'inputStart':alight_input,'keyRelease':key_release,'actual':actual},ensure_ascii=False)) from error
    landed=await page.evaluate('window.__qaRead()')
    lb=landed['body']
    landing_evidence=json.dumps({'right':right,'hintObservation':alighting,'inputStart':alight_input,'keyRelease':key_release,'actual':landed},ensure_ascii=False)
    assert right['x']<lb['x']<right['x']+right['w'] and abs(lb['y']-right['y'])<2, label+': landed outside the real bank; '+landing_evidence
    assert lb['grounded'] and lb['platform'] is None and abs(lb['vx'])<1, label+': did not stop on the fixed right bank; '+landing_evidence
    assert landed['deaths']==initial['deaths'] and landed['state']=='playing', label+': failed crossing; '+landing_evidence
    expected_seals=1 if expected_lamps else 0
    assert re.match(rf'{expected_seals}\s*/',await page.locator('#stage-seals').inner_text()), 'platform route falsely solved a poem lamp'
    assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'theatre route horizontal overflow'
    await page.wait_for_function("()=>window.__qaRead()?.theatrePaint?.encore?.phase==='active'",timeout=2500)
    bow=await page.evaluate('window.__qaRead()')
    assert bow['theatrePaint']['encore']['age']<2.1, 'first far-bank landing did not trigger the short bow'
    await page.screenshot(path=str(output/(label+'-theatre-right-bank.png')),full_page=True)
    return {'viewport':page.viewport_size,'input':'CDP emulated touch controls' if touch else 'keyboard',
            'scope':'first moving-stage crossing only; not chapter completion',
            'leftBankReachedByJump':True,'waitHintMatchedGap':True,'boardHintMatchedContact':True,
            'bodyPlatformObserved':'stage','noInputCarryDistance':rb['x']-ride_start['body']['x'],
            'relativeRideOffsetDrift':(rb['x']-rm['x'])-relative_start,'alightHintMatchedContact':True,
            'rightBankReached':True,'earnedShortCurtainCall':True,'noRespawns':True,'noHorizontalOverflow':True,'chapterCompleted':False,
            'travelerPoses':{'shelfJump':jump_poses,'rideStart':rider_start_pose,'noInputRide':rider_pose},
            'evidence':{'waiting':waiting,'boarding':boarding,'boardInput':board_input,'rideStart':ride_start,'riding':riding,'alighting':alighting,'alightInput':alight_input,'keyRelease':key_release,'landed':landed}}


async def verify_first_theatre_lamp(page,output,label):
    """Walk normally to the theatre left side and genuinely solve 李白《静夜思》."""
    print(label,'solve first real poem lamp before boarding',flush=True)
    await drive_to(page,445)
    await toggle(page,False)
    await page.wait_for_function("()=>window.__qaRead()?.form==='soul'")
    await drive_to(page,515,285,limit=10)
    near=await page.evaluate('window.__qaRead()')
    assert near['chapterIndex']==2 and near['theatrePaint']['lampLit']==[False,False]
    assert abs(near['x']-515)<35 and abs(near['y']-285)<35
    assert '诗灯' in near['nearHint'], 'first real lamp did not offer an interaction hint'
    await sample_phone_hud(page,output,label+'-first-lamp-reachable',form='soul',hint='诗灯',objective='与眼前的诗灯共鸣')
    await puzzle(page,'低头思故乡')
    await page.wait_for_function("()=>{const a=window.__qaRead()?.theatrePaint;return a?.lampLit?.[0]===true&&a.lightAmounts[0]>.5;}",timeout=4000)
    first=await page.evaluate('window.__qaRead()')
    assert first['theatrePaint']['lampLit']==[True,False]
    assert first['theatrePaint']['lightAmounts'][1]==0
    await page.screenshot(path=str(Path(output)/(label+'-theatre-first-lamp-lit.png')),full_page=True)
    await page.keyboard.press('Escape')
    await page.locator('#pause-dialog[open]').wait_for()
    paused=await page.evaluate('window.__qaRead()')
    await page.wait_for_timeout(260)
    frozen=await page.evaluate('window.__qaRead()')
    assert frozen['theatrePaint']['lightAmounts']==paused['theatrePaint']['lightAmounts']
    assert frozen['time']==paused['time']
    await page.locator('#stage-resume').click()
    await page.wait_for_function("()=>window.__qaRead()?.state==='playing'")
    await toggle(page,False)
    await page.wait_for_function("()=>window.__qaRead()?.form==='body'")
    return {'firstPoemSolvedWithActualSoulAndUI':True,'afterRealPuzzle':first['theatrePaint'],
            'secondZoneStillDark':True,'pauseFrozen':True}

async def verify_theatre_lamp(page,output,label):
    """Solve second lamp using real soul and Q, confirm both separate light pools."""
    print(label,'solve the real second poem lamp and observe both lit areas',flush=True)
    before=await page.evaluate('window.__qaRead()')
    assert before['chapterIndex']==2 and before['theatrePaint']['lampLit']==[True,False]
    await toggle(page,False)
    await page.wait_for_function("()=>window.__qaRead()?.form==='soul'")
    await drive_to(page,1720,275,limit=9)
    await page.wait_for_function("()=>{const a=window.__qaRead();return a?.form==='soul'&&a.theatrePaint?.encore?.phase==='done';}",timeout=4000)
    near=await page.evaluate('window.__qaRead()')
    assert near['theatrePaint']['lampLit']==[True,False]
    assert abs(near['x']-1720)<35 and abs(near['y']-275)<35
    assert '诗灯' in near['nearHint']
    await puzzle(page,'月亮')
    await page.wait_for_function("()=>{const p=window.__qaRead()?.theatrePaint;return p?.lampLit?.[0]===true&&p.lampLit[1]===true&&p.lightAmounts[1]>.5;}",timeout=4000)
    lit=await page.evaluate('window.__qaRead()')
    assert lit['theatrePaint']['lampLit']==[True,True]
    assert lit['theatrePaint']['lightAmounts'][0]>.5 and lit['theatrePaint']['lightAmounts'][1]>.5
    assert lit['theatrePaint']['frame'] is True
    await sample_phone_hud(page,output,label+'-both-lamps',form='soul',objective='两盏诗灯已亮')
    await page.screenshot(path=str(Path(output)/(label+'-theatre-two-lamps-lit.png')),full_page=True)
    await page.keyboard.press('Escape')
    await page.locator('#pause-dialog[open]').wait_for()
    paused=await page.evaluate('window.__qaRead()')
    await page.wait_for_timeout(240)
    frozen=await page.evaluate('window.__qaRead()')
    assert frozen['theatrePaint']['lightAmounts']==paused['theatrePaint']['lightAmounts']
    assert frozen['time']==paused['time']
    await page.locator('#stage-resume').click()
    await page.wait_for_function("()=>window.__qaRead()?.state==='playing'")
    return {'secondPoemSolvedWithActualSoulAndUI':True,'bothLightPoolsLit':True,'curtainCallFinishedDuringSoulFlight':True,
            'afterRealPuzzle':lit['theatrePaint'],'pauseFrozen':True}

async def finish_theatre_from_real_exit(page,output,label):
    """The third chapter has three outro pages, but no story-choice dialog."""
    read_save="JSON.parse(localStorage.getItem('tougaigu.dream.v1'))"
    before=await page.evaluate(read_save);grants=await read_reward_grants(page)
    earlier_collections=await read_cap_collections(page)
    assert not before['chapters'][2]['completed']
    assert before['choices']['letter']=='keep' and before['choices']['clock'] is None
    assert (await page.evaluate('window.__qaRead()'))['theatrePaint']['lampLit']==[True,True]
    await toggle(page,False)
    await page.wait_for_function("()=>{const a=window.__qaRead();return a?.form==='body'&&a.capPhase==='closed';}")
    # A normal stop on the route exposes the optional activity row without
    # activating or solving the moon scene, so its nearby priority is genuine.
    await drive_to(page,1460)
    await page.wait_for_function("()=>{const b=window.__qaRead()?.body;return b?.grounded&&Math.abs(b.y-560)<2;}")
    await sample_phone_hud(page,output,label+'-moon-row',form='body',objective='借月追光')
    assert await page.locator('#stage-cap-activity').is_visible()
    await drive_to(page,1995,limit=7)
    await sample_phone_hud(page,output,label+'-exit-instruction',form='body',hint='带着身体走进门',objective='两盏诗灯已亮')
    async def complete():return await page.locator('#result-dialog[open]').is_visible()
    await drive_to(page,2115,until=complete,limit=4)
    await page.locator('#result-dialog[open]').wait_for()
    actual=await page.evaluate('window.__qaRead()')
    assert actual['chapterIndex']==2 and actual['state']=='complete' and actual['deaths']==0
    assert '借月剧场' in await page.locator('#result-kicker').inner_text()
    assert '借月镜' in await page.locator('#result-keepsake').inner_text()
    settled=await page.evaluate(read_save)
    assert settled['chapters'][2]['completed'] and settled['chapters'][2]['runs']==before['chapters'][2]['runs']+1
    for index in [0,1,3,4,5]:assert settled['chapters'][index]==before['chapters'][index],'third-chapter exit changed another result'
    assert settled['lastChapter']==3,'normal completion must unlock the fourth chapter'
    assert settled['choices']==before['choices'] and settled['discoveredEndings']==before['discoveredEndings']
    assert await read_reward_grants(page)==grants,'chapter completion unexpectedly granted or claimed reward items'
    await page.screenshot(path=str(Path(output)/(label+'-theatre-completed.png')),full_page=True)
    await page.locator('#result-story').click()
    await page.locator('#story-dialog[open]').wait_for()
    pages=[]
    for index,word in enumerate(['最后一排','围巾','小满'],1):
        counter=await page.locator('#story-page').inner_text()
        assert counter==f'0{index} / 03'
        text=await page.locator('#story-dialog-text').inner_text()
        assert word in text and '借月剧场' in await page.locator('#story-chapter-label').inner_text()
        # The image must have decoded for the CURRENT speaker, not merely
        # match the src attribute while pixels still belong to the old line.
        expected=['portrait-moth.svg','portrait-hero-tender.svg','portrait-soul-peek.svg'][index-1]
        portrait=await read_ready_story_portrait(page,{'page':counter,'speaker':['绒绒','阿拾','拾光'][index-1],'word':word,'file':expected})
        pages.append({'page':counter,'text':text,'portrait':portrait})
        await page.screenshot(path=str(Path(output)/(label+f'-theatre-outro-{index}-decoded.png')),full_page=True)
        if index==3:
            assert '收好这封信' in await page.locator('#story-next').inner_text()
            await page.screenshot(path=str(Path(output)/(label+'-theatre-outro.png')),full_page=True)
        await page.locator('#story-next').click()
    await page.locator('#map-dialog[open]').wait_for()
    assert not await page.locator('#story-dialog[open],#choice-dialog[open],#ending-dialog[open]').count()
    assert await page.locator('#chapter-grid [data-chapter="3"]').is_enabled()
    assert not await page.locator('#chapter-grid [data-chapter="4"]').is_enabled()
    after_outro=await page.evaluate(read_save)
    assert after_outro['chapters']==settled['chapters'] and after_outro['choices']==settled['choices']
    assert after_outro['discoveredEndings']==settled['discoveredEndings']
    assert await read_reward_grants(page)==grants and await read_cap_collections(page)==earlier_collections
    # A real map revisit sets lastChapter back to 2. Reloading the result
    # directly would correctly start chapter 4, so no save value is replaced.
    await page.locator('#chapter-grid [data-chapter="2"]').click()
    await assert_theatre_paint(page)
    await page.reload(wait_until='networkidle')
    await page.wait_for_function("()=>window.__qaRead?.()?.chapterIndex===2")
    fresh=await assert_theatre_paint(page)
    assert fresh['lampLit']==[False,False] and fresh['lightAmounts']==[0,0]
    reloaded=await page.evaluate(read_save)
    assert reloaded['lastChapter']==2 and reloaded['chapters']==settled['chapters']
    assert reloaded['choices']==settled['choices'] and reloaded['discoveredEndings']==settled['discoveredEndings']
    assert await read_reward_grants(page)==grants and await read_cap_collections(page)==earlier_collections
    return {'actualBodyExitReached':True,'noRespawns':True,'thirdChapterCompleted':True,
            'chapterRunsIncreasedExactlyOnce':True,'fourthChapterUnlocked':True,'fifthChapterStillLocked':True,
            'outroPages':pages,'chapterHasNoChoice':True,'existingLetterChoicePreserved':'keep','clockAndEndingsUnchanged':True,
            'mapRevisitAndReloadPreservedResults':True,'revisitResetBothLightPools':True,
            'rewardGrantsUnchanged':True,'earlierCollectionsUnchanged':True,'settledChapters':settled['chapters']}

async def exercise_theatre(page,output,label):
    """Finish the real chapter, then revisit for two genuine touch crossings."""
    print(label,'enter the normally unlocked theatre chapter',flush=True)
    chapters=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1')).chapters")
    assert chapters[0]['completed'] and chapters[1]['completed'] and not chapters[2]['completed']
    await page.locator('[data-shell-action="map"]').click()
    await page.locator('#map-dialog[open]').wait_for()
    chapter=page.locator('#chapter-grid [data-chapter="2"]')
    assert await chapter.is_enabled(), 'real greenhouse completion did not unlock the theatre'
    await chapter.click()
    await assert_theatre_paint(page)
    assert '绒绒' in await page.locator('#stage-near-hint').inner_text()
    await page.screenshot(path=str(Path(output)/(label+'-theatre-rongrong-body.png')),full_page=True)
    await toggle(page,False)
    await page.wait_for_function("()=>{const a=window.__qaRead();return a?.form==='soul'&&a.capPhase==='open'&&a.chapterIndex===2;}")
    await page.screenshot(path=str(Path(output)/(label+'-theatre-rongrong-invite.png')),full_page=True)
    await toggle(page,False)
    await page.wait_for_function("()=>window.__qaRead()?.form==='body'")
    performance=await exercise_traveler_performance(page,output,label)
    first=await verify_first_theatre_lamp(page,output,label+'-keyboard')
    desktop=await cross_theatre_stage(page,output,label+'-keyboard',expected_lamps=[True,False])
    second=await verify_theatre_lamp(page,output,label+'-keyboard')
    completion=await finish_theatre_from_real_exit(page,output,label+'-keyboard')
    settled_chapters=completion['settledChapters']
    viewport=page.viewport_size
    emulation=await page.context.new_cdp_session(page)
    touch_results={}
    try:
        await emulation.send('Emulation.setTouchEmulationEnabled',{'enabled':True,'maxTouchPoints':5})
        for width,height in [(390,844),(320,680)]:
            await page.set_viewport_size({'width':width,'height':height})
            # Genuine pause/restart on the completed chapter's normal revisit.
            if (await page.evaluate('window.__qaRead()'))['state']=='playing':
                await tap_control(page,'[data-shell-action="pause"]')
            await page.locator('#pause-dialog[open]').wait_for()
            await tap_control(page,'#stage-restart')
            await page.locator('#pause-dialog[open]').wait_for(state='hidden')
            await page.wait_for_function("()=>{const p=window.__qaRead()?.theatrePaint;return p?.lampLit?.every(l=>!l)&&p.lightAmounts.every(l=>l===0);}")
            # A restart clears the painted-frame flag even when the decoded
            # asset is cached. Observe a real ready frame before NPC evidence.
            body_ready=await assert_theatre_paint(page)
            await page.screenshot(path=str(Path(output)/(label+f'-theatre-rongrong-{width}-body.png')),full_page=True)
            await tap_control(page,'#stage-toggle')
            await page.wait_for_function("()=>window.__qaRead()?.form==='soul'&&window.__qaRead()?.capPhase==='open'")
            await page.screenshot(path=str(Path(output)/(label+f'-theatre-rongrong-{width}-invite.png')),full_page=True)
            await tap_control(page,'#stage-toggle')
            await page.wait_for_function("()=>window.__qaRead()?.form==='body'")
            touch_results[str(width)]=await cross_theatre_stage(page,output,label+f'-touch-{width}',touch=True)
            touch_results[str(width)]['npcBodyScreenshotReady']=body_ready
            assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'phone HUD overflow'
    finally:
        await emulation.send('Emulation.setTouchEmulationEnabled',{'enabled':False})
        await emulation.detach()
        await page.set_viewport_size(viewport)
    assert await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1')).chapters")==settled_chapters, 'a revisit crossing falsely settled chapter rewards again'
    return {'enteredViaUnlockedChapterMap':True,'keyboard':desktop,'firstLamp':first,'secondLamp':second,
            'completion':completion,'travelerPerformance':performance,
            'touch390':touch_results['390'],'touch320':touch_results['320'],
            'touchScope':'resized Chromium and CDP touch controls, naturally earned chapter unlock; not a physical phone or full mobile chapter clear',
            'normalRevisitResetBothLightPools':True,'normalRestartKeptBothLightPoolsClear':True,'revisitChapterResultsUnchanged':True}

async def exercise_theatre_fallbacks(page,output,label):
    """Fail only the named illustration requests; keep the genuinely earned save."""
    primary=urljoin(page.url,'assets/theatre-painted-v22.webp')
    fallback=urljoin(page.url,'assets/theatre-painted-v20.svg')
    pattern=re.compile(r'/assets/theatre-painted-(?:v22\.webp|v20\.svg)(?:\?[^#]*)?$')
    expected_failures=[];results={}
    chapters=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1')).chapters")
    rewards=await read_reward_grants(page)
    for kind,blocked in [('svg',{primary}),('procedural',{primary,fallback})]:
        attempts=[]
        async def block_art(route):
            url=route.request.url
            if url in blocked:
                attempts.append(url);expected_failures.append(url)
                await route.abort('failed')
            else:await route.continue_()
        await page.route(pattern,block_art)
        try:
            await page.reload(wait_until='networkidle')
            await page.wait_for_function("()=>window.__qaRead?.()?.chapterIndex===2")
            initial=await assert_theatre_paint(page,kind)
            crossing=await cross_theatre_stage(page,output,label+'-fallback-'+kind,paint=kind)
            await toggle(page,False)
            await page.wait_for_function("()=>window.__qaRead()?.form==='soul'")
            await drive_to(page,1720,275,limit=9)
            await puzzle(page,'月亮')
            await page.wait_for_function("()=>window.__qaRead()?.theatrePaint?.lampLit[1]===true")
            lit=await assert_theatre_paint(page,kind)
            assert lit['lampLit']==[False,True], 'resource failure changed the actual puzzle route'
            assert attempts==([primary] if kind=='svg' else [primary,fallback]), 'illustration failure retried during the route'
            assert await read_reward_grants(page)==rewards, 'replaying after resource failure duplicated rewards'
            assert await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1')).chapters")==chapters
            await page.screenshot(path=str(Path(output)/(label+'-fallback-'+kind+'-lamp.png')),full_page=True)
            results[kind]={'background':initial,'crossing':crossing,'actualSecondPuzzleSolved':True,
                           'noRepeatedRequests':True,'unchangedRewardsAndChapterResults':True,'blockedRequests':list(attempts)}
        finally:
            await page.unroute(pattern,block_art)
    await page.reload(wait_until='networkidle')
    await page.wait_for_function("()=>window.__qaRead?.()?.chapterIndex===2")
    restored=await assert_theatre_paint(page)
    assert restored['lampLit']==[False,False] and restored['lightAmounts']==[0,0]
    assert await read_reward_grants(page)==rewards
    return {'cases':results,'primaryRecoveredAfterUnblocking':True,'recovered':restored,
            'deliberatelyAbortedRequests':expected_failures}

async def exercise_festival_hud(page,output,label):
    """A real gift-hub visit at the end of each independent phone case."""
    before=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1'))")
    rewards=await read_reward_grants(page)
    collections=await page.evaluate("(()=>{const r=JSON.parse(localStorage.getItem('tougaigu.capbook.v1')).scenes['story-0'];return {memories:r.memories,seals:r.seals};})()")
    await expect(page.locator('.stage-festival-bar')).to_be_hidden()
    await page.locator('.game-shell [data-shell-action="events"]').tap()
    await page.locator('#festival-hub[open]').wait_for()
    # The same festival is always revisit-able; choosing the actual card makes
    # the route independent of today's active seasonal default.
    await page.locator('[data-festival-select="halloween"]').tap()
    await page.locator('[data-festival-enter="halloween"]').tap()
    await page.locator('#festival-hub[open]').wait_for(state='hidden')
    await page.wait_for_function("()=>{const a=window.__qaRead();return a?.mode==='festival'&&a.festivalId==='halloween'&&a.state==='playing';}")
    await expect(page.locator('#stage-chapter-title')).to_have_text('南瓜夜邮')
    await expect(page.locator('.stage-festival-bar')).to_be_visible()
    await expect(page.locator('#stage-back-story')).to_have_accessible_name('返回主线')
    await expect(page.locator('#stage-back-story')).to_be_visible()
    festival=await assert_hud_readable(page,label+'-festival-hud',form='body')
    bar=await page.evaluate(HUD_PROBE)
    back=next(b for b in bar['buttons'] if b['id']=='stage-back-story')
    assert back['visible'] and back['centerHits'] and back['rect']['height']>=36
    assert bar['runtime']['seals']==0 and bar['runtime']['memories']==0
    await page.screenshot(path=str(Path(output)/(label+'-festival-hud.png')),full_page=True)
    await page.locator('#stage-back-story').tap()
    await page.wait_for_function("index=>{const a=window.__qaRead();return a?.mode==='story'&&a.chapterIndex===index&&a.state==='playing';}",arg=before['lastChapter'])
    await expect(page.locator('.stage-festival-bar')).to_be_hidden()
    await expect(page.locator('#stage-back-story')).to_be_hidden()
    main_hud=await assert_hud_readable(page,label+'-festival-return',form='body')
    after=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1'))")
    for key in ['chapters','choices','discoveredEndings','lastChapter']:
        assert after[key]==before[key],'short festival visit changed '+key
    assert await read_reward_grants(page)==rewards,'opening a festival granted or claimed rewards'
    assert await page.evaluate("(()=>{const r=JSON.parse(localStorage.getItem('tougaigu.capbook.v1')).scenes['story-0'];return {memories:r.memories,seals:r.seals};})()")==collections
    await page.screenshot(path=str(Path(output)/(label+'-festival-return.png')),full_page=True)
    return {'festivalId':'halloween','input':'emulated Chromium touch',
            'festival':festival,'returnedMain':main_hud,'returnButton':back['rect'],
            'giftCategoryAccessible':True,'mainMemoryCategoryRestored':True,
            'returnButtonCenterUncovered':True,'mainFestivalBarHidden':True,
            'chaptersChoicesAndCollectionsUnchanged':True,'rewardGrantsUnchanged':True,
            'scope':'real gift entry and normal return; no festival puzzles, completion, gift claims or purchases'}

async def main(args):
    output=Path(args.output);output.mkdir(parents=True,exist_ok=True)
    report={'url':args.url,'source':'served production HTML; app module has a read-only coordinate probe appended in-memory; all actions use DOM/input','cases':[]}
    async with async_playwright() as p:
        b=await p.chromium.launch(headless=True,executable_path=args.chromium or None,args=['--no-sandbox'])
        for w,h,touch,full in [(1280,800,False,True),(390,844,True,False),(320,680,True,False)]:
            HUD_OBSERVATIONS.clear()
            context=await b.new_context(viewport={'width':w,'height':h},has_touch=touch,is_mobile=touch,device_scale_factor=1)
            page=await context.new_page();errors=[];failed=[];instrumented_app_urls=[];art_requests=[];request_failures=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.on('response',lambda r:failed.append({'url':r.url,'status':r.status}) if r.status>=400 else None)
            page.on('request',lambda r:art_requests.append(r.url) if re.search(r'/assets/theatre-painted-(?:v22\.webp|v20\.svg)(?:\?|$)',r.url) else None)
            page.on('requestfailed',lambda r:request_failures.append({'url':r.url,'failure':r.failure}))
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
            portrait_sequence=await exercise_portrait_sequence(page,output,str(w)) if full else None
            result=await exercise(page,output,str(w),touch,full)
            if full:
                result['portraitSequence']=portrait_sequence
                station_saved=await page.evaluate("localStorage.getItem('tougaigu.capbook.v1')")
                assert station_saved and 'memories' in station_saved
                station_record=json.loads(station_saved)['scenes']['story-0']
                result['greenhouse']=await exercise_greenhouse(page,output,str(w))
                result['letterEcho']=await exercise_letter_echo(page,output,str(w))
            else:
                result['festivalHud']=await exercise_festival_hud(page,output,str(w))
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
                assert art_requests==[], 'theatre artwork was requested during the first two chapters'
                result['theatre']=await exercise_theatre(page,output,str(w))
                assert all(urlparse(url).path.endswith('/theatre-painted-v22.webp') for url in art_requests), 'normal play unexpectedly needed the old SVG'
                result['theatreArt']={'notRequestedBeforeThirdChapter':True,'normalRequests':list(art_requests)}
                result['theatreArt']['fallbacks']=await exercise_theatre_fallbacks(page,output,str(w))
                intentional=result['theatreArt']['fallbacks']['deliberatelyAbortedRequests']
                portrait_failures=result['portraitSequence']['expectedRequestFailures']
                assert request_failures[:len(portrait_failures)]==portrait_failures,'an unplanned request failed during portrait sequencing: '+json.dumps(request_failures,ensure_ascii=False)
                theatre_failures=request_failures[len(portrait_failures):]
                assert [item['url'] for item in theatre_failures]==intentional, 'an unplanned resource request failed: '+json.dumps(request_failures,ensure_ascii=False)
                assert len(theatre_failures)==3 and all(item['failure']=='net::ERR_FAILED' for item in theatre_failures),'theatre faults differ from the three exact deliberate aborts'
                result['theatreArt']['expectedRequestFailures']=theatre_failures
            else:
                assert art_requests==[], 'an independent chapter-one phone run requested the theatre art'
                assert not request_failures,request_failures
            assert not errors,errors
            assert not failed,failed
            result['hudReadability']={'scope':'real DOM rectangles, complete objective/hint text ranges, actual accessible names and energy, uncovered input centers',
                                     'samples':list(HUD_OBSERVATIONS),'minimumPhoneHeightTested':680}
            report['cases'].append(result)
            await context.close()
        await b.close()
    (output/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--url',required=True);parser.add_argument('--output',default='verification/browser');parser.add_argument('--version');parser.add_argument('--chromium');asyncio.run(main(parser.parse_args()))
