"""Earned sixth chapter: real post office image, actual book, lights, recall and ending.
No teleport, fixture, save mutation or direct game-solving calls in browser tests.
"""
import asyncio,base64,json,math,time
from pathlib import Path
from urllib.parse import urljoin,urlparse
from browser_library_v26 import action,open_cap,return_body,answer_puzzle,click_input,enter_chapter
from browser_coast_v27 import LibraryAbortGate

POST_FILE='post-painted-v28.webp'
POST_INTRO=[
 {'page':'01 / 03','speaker':'阿拾','file':'portrait-hero-joy.svg','word':'寄给自己的信'},
 {'page':'02 / 03','speaker':'拾光','file':'portrait-soul-brave.svg','word':'小满留下的'},
 {'page':'03 / 03','speaker':'归先生','file':'portrait-keeper.svg','word':'还差两盏灯'},
]
POST_NPC=[
 {'page':'01 / 02','speaker':'归先生','file':'portrait-keeper.svg','word':'替这封信留着门'},
 {'page':'02 / 02','speaker':'阿拾','file':'portrait-hero-open.svg','word':'最后一程'},
]
POST_OUTRO=[
 {'page':'01 / 03','speaker':'阿拾','file':'portrait-hero-tender.svg','word':'爸爸'},
 {'page':'02 / 03','speaker':'拾光','file':'portrait-soul-joy.svg','word':'明天可以接着说'},
 {'page':'03 / 03','speaker':'归先生','file':'portrait-keeper.svg','word':'我收到了'},
]
READ_SAVE="JSON.parse(localStorage.getItem('tougaigu.dream.v1'))"

POST_EXIT_INPUT_OBSERVER="""()=>{
 if(window.__qaPostExitInput)throw new Error('previous post-exit observer was not removed');
 const events=[],nativeEvents=[],types=['pointerdown','pointerup','pointercancel','click','gotpointercapture','lostpointercapture'];
 const observe=event=>{
  if(events.length>=24)return;
  const target=event.target?.closest?.('button'),s=window.__qaRead?.();
  const pointerId=Number.isFinite(event.pointerId)?event.pointerId:null;
  const record={type:event.type,pointerType:event.pointerType||null,pointerId,
    detail:event.detail,isPrimary:event.isPrimary??null,isTrusted:event.isTrusted,
    defaultPrevented:event.defaultPrevented,cancelable:event.cancelable,eventPhase:event.eventPhase,
    targetHasPointerCapture:pointerId!==null&&!!target?.hasPointerCapture?.(pointerId),
    targetId:target?.id||null,direction:target?.dataset.direction||null,
    shellAction:target?.dataset.shellAction||null,at:performance.now(),eventTimeStamp:event.timeStamp,
    state:s?.state,form:s?.form,time:s?.time,runId:s?.runId,bodyIdentity:s?.bodyIdentity,
    dialogs:[...document.querySelectorAll('dialog[open]')].map(dialog=>dialog.id)};
  events.push(record);
  nativeEvents.push(event);
  // Window capture sees the native event before the production document guard.
  // The passive microtask takes an intermediate dialog snapshot; read() also
  // retrieves the original Event's eventual defaultPrevented. The caller
  // independently reads the current UI after dispatch. Nothing is cancelled.
  queueMicrotask(()=>{
    record.defaultPreventedAfter=event.defaultPrevented;
    record.dialogsAfter=[...document.querySelectorAll('dialog[open]')].map(dialog=>dialog.id);
  });
 };
 for(const type of types)window.addEventListener(type,observe,true);
 window.__qaPostExitInput={read:()=>events.map((event,index)=>({...event,
     defaultPreventedAfter:nativeEvents[index].defaultPrevented,dialogs:[...event.dialogs]})),
   stop:()=>{for(const type of types)window.removeEventListener(type,observe,true);}};
}"""

POST_EXIT_UI="""()=>{
 const result=document.querySelector('#result-dialog');
 const rect=element=>{const r=element.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
 return {game:window.__qaRead?.(),dialogs:[...document.querySelectorAll('dialog[open]')].map(dialog=>dialog.id),
  result:{open:result?.open,visible:!!result?.open&&result.getBoundingClientRect().width>0&&
    result.getBoundingClientRect().height>0&&getComputedStyle(result).visibility==='visible'},
  buttons:[...document.querySelectorAll('#stage-toggle,#stage-jump,#result-story,#result-map,[data-direction="right"]')]
    .map(button=>({id:button.id,direction:button.dataset.direction||null,rect:rect(button)}))};
}"""

async def stop_post_exit_observer(page):
 return await page.evaluate("""()=>{
  const observer=window.__qaPostExitInput;
  if(!observer)return [];
  const events=observer.read();observer.stop();delete window.__qaPostExitInput;
  return events;
 }""")

async def complete_post_approach(page,output,label,driver,touch=False):
 """Single pulse, single recall and real walk, with bounded passive evidence."""
 await page.evaluate(POST_EXIT_INPUT_OBSERVER)
 trace={'label':label,'input':'CDP simulated touch' if touch else 'keyboard','walkingSamples':[]}
 try:
  # HOT PATH: no screenshots, AX reads, artificial animation waits or input
  # retries. The observer does not cancel/retarget/prevent any native event.
  await action(page,driver,'Space','#stage-jump',touch)
  frozen=await page.evaluate('window.__qaRead()');trace['frozen']=post_record(frozen)
  assert frozen['hazards'][0]['frozen']>3.8,'actual single pulse did not stop last pendulum'
  await return_body(page,driver,touch,settle=False)
  # A successful recall changes form synchronously. Confirm that this actual
  # input took effect without waiting for the .72-second cap closure.
  await page.wait_for_function("()=>window.__qaRead()?.form==='body'",timeout=500)
  recalled=await page.evaluate('window.__qaRead()');trace['afterRecall']=post_record(recalled)
  assert recalled['bodyIdentity']==frozen['bodyIdentity'] and recalled['deaths']==frozen['deaths'],'single recall replaced the actual body'
  await driver.drive_to(page,2540,until=lambda:page.locator('#result-dialog[open]').is_visible(),
                        limit=5,touch=touch,observe=lambda s:trace['walkingSamples'].append(post_record(s)))
  # Read before any screenshot or long timeout. This distinguishes a missed
  # recall, failed exit, and a result closed/advanced by a native trailing tap.
  current=await page.evaluate(POST_EXIT_UI);trace['afterDrive']=current
  done=current['game']
  assert current['result']['visible'],('post final movement returned without a visible result; state='+str(done['state'])+
       ', form='+str(done['form'])+', body='+str(done['body'])+', dialogs='+str(current['dialogs']))
  assert done['chapterIndex']==5 and done['state']=='complete' and done['seals']==2 and done['memories']==3 and done['deaths']==0
  trace['verifiedExit']=validate_post_exit(trace['frozen'],trace['walkingSamples'],post_record(done))
  trace['inputEvents']=await stop_post_exit_observer(page)
  trace['verifiedExit']['inputBoundary']=validate_post_exit_input(trace['inputEvents'],current,touch)
  return done,trace['verifiedExit'],trace['inputEvents']
 except Exception as error:
  # Failure-only capture runs after the input has already been released. Do not
  # use it to rescue the run, alter the frozen window or synthesize success.
  trace['error']=str(error)
  trace['failureSnapshot']=await page.evaluate(POST_EXIT_UI)
  remaining_events=await stop_post_exit_observer(page)
  if remaining_events:trace['inputEvents']=remaining_events
  else:trace.setdefault('inputEvents',[])
  Path(output,label+'-post-exit-failure.json').write_text(json.dumps(trace,ensure_ascii=False,indent=2))
  print(label,'post exit failure',json.dumps(trace,ensure_ascii=False),flush=True)
  await page.screenshot(path=str(Path(output)/(label+'-post-exit-failure.png')),full_page=True)
  raise
 finally:
  await stop_post_exit_observer(page)

def validate_post_exit_input(events,current,touch=False):
 """A held movement gesture cannot activate a newly opened result button."""
 assert current['result']['visible'] and current['dialogs']==['result-dialog'],'old movement gesture advanced or hid the actual result'
 assert len(events)<=24,'post input observer exceeded its bounded event budget'
 if not touch:
  return {'input':'keyboard','resultRetained':True,'oldGestureBlockedClicks':[]}
 assert events and all(e['isTrusted'] and e['pointerType']=='touch' for e in events),'terminal touch evidence contains synthetic or non-touch events'
 done=current['game']
 assert all((e['runId'],e['bodyIdentity'])==(done['runId'],done['bodyIdentity']) for e in events),'terminal touch input changed run or body'
 for button in ['stage-jump','stage-toggle']:
  clicks=[e for e in events if e['type']=='click' and e['targetId']==button]
  assert len(clicks)==1,'terminal route did not use exactly one native '+button+' activation'
  assert clicks[0]['defaultPreventedAfter'] is False,'an intentional gameplay activation was blocked'
 downs=[e for e in events if e['type']=='pointerdown' and e['direction']=='right']
 ups=[e for e in events if e['type']=='pointerup' and e['direction']=='right']
 assert len(downs)==len(ups)==1,'terminal approach was not one actual held right gesture'
 down,up=downs[0],ups[0]
 assert isinstance(down['pointerId'],int) and down['pointerId']>=0 and down['pointerId']==up['pointerId'],'held touch did not keep its native pointer identity'
 assert down['state']=='playing' and down['form']=='body' and down['dialogs']==[],'terminal movement began outside actual body play'
 assert up['state']=='complete' and up['form']=='body' and up['dialogs']==['result-dialog'],'native release did not follow the real original exit'
 assert up['at']>=down['at'],'native input event time reversed'
 result_clicks=[e for e in events if e['type']=='click' and e['targetId'] in ['result-story','result-map']]
 for event in result_clicks:
  assert event['pointerId']==down['pointerId'],'result click was not attributable to the held movement gesture'
  assert event['defaultPreventedAfter'] is True,'the old movement gesture activated a new result button'
  assert event['dialogsAfter']==['result-dialog'],'blocked old click still advanced the result'
 return {'input':'Chromium CDP simulated touch','resultRetained':True,
         'heldPointerId':down['pointerId'],'releaseAtComplete':True,'oldGestureBlockedClicks':result_clicks}

def validate_fresh_result_touch(events,after):
 """A new touch that starts on the actual result button must remain usable."""
 selected=[e for e in events if e['targetId']=='result-story' and e['type'] in ['pointerdown','pointerup','click']]
 assert [e['type'] for e in selected]==['pointerdown','pointerup','click'],'result continuation was not a fresh single native touch'
 assert all(e['isTrusted'] and e['pointerType']=='touch' for e in selected),'result continuation did not use actual touch events'
 assert len({e['pointerId'] for e in selected})==1 and isinstance(selected[0]['pointerId'],int),'new result tap did not retain its own pointer identity'
 assert all(e['dialogs']==['result-dialog'] for e in selected),'new result tap did not start and finish inside the current result'
 assert selected[-1]['defaultPreventedAfter'] is False,'the new intentional result tap was blocked'
 assert after['dialogs']==['story-dialog'] and after['game']['state']=='complete','fresh result touch did not open the real outro'
 return {'freshDownUpClick':True,'pointerId':selected[0]['pointerId'],'intentionalClickAllowed':True,'realOutroOpened':True,'events':events}

def post_record(s):
 return {key:s[key] for key in ['runId','bodyIdentity','chapterIndex','mode','state','form','time','deaths','body','hazards','input']}

def validate_post_exit(frozen,samples,done):
 """The actual terminal exit is BEFORE the full authored sweep's right edge.
 Require the same real body to walk to that exit while frozen, not a fictitious
 clearing of the complete sweep or a gameplay mutation to change the exit.
 """
 assert frozen['form']=='soul' and frozen['state']=='playing' and frozen['hazards'][0]['frozen']>3.8
 assert len(samples)>=3,'too few actual walking samples to prove the final exit'
 origin=(frozen['runId'],frozen['bodyIdentity'],5,'story',frozen['deaths'])
 previous=frozen['time']
 for s in [*samples,done]:
  detail=json.dumps(s,ensure_ascii=False)
  assert (s['runId'],s['bodyIdentity'],s['chapterIndex'],s['mode'],s['deaths'])==origin,'final exit changed run, body, chapter or deaths: '+detail
  assert s['form']=='body' and s['state'] in ['playing','complete'],'exit was not walked by the actual body: '+detail
  assert s['time']>=previous,'exit trace time reversed'
  assert s['hazards'][0]['frozen']>0,'last actual pendulum thawed before the original exit: '+detail
  previous=s['time']
 assert done['state']=='complete' and 2488<=done['body']['x']<=2592,'body did not reach the authored exit range'
 assert frozen['body']['x']<2120 and done['body']['x']-frozen['body']['x']>350,'trace omitted the actual final approach'
 assert samples[0]['body']['x']<2200,'walking observation began after the final approach'
 h=done['hazards'][0]
 right=h['x']+math.sin(h['swing'])*h['length']+h['r']+done['body']['w']/2
 assert done['body']['x']<right,'authored sixth-chapter exit relation unexpectedly changed'
 return {'samples':samples,'actualExit':done,'remainingFreezeAtExit':h['frozen'],
         'fullSwingRight':right,'bodyExitBeforeFullSwingRight':True,
         'noRespawns':True,'originalExitReachedWhileFrozen':True}

def validate_post_settlement(before,after,added=1):
 assert len(before['chapters'])==len(after['chapters'])==6
 assert after['chapters'][5]['completed'] and after['chapters'][5]['runs']==before['chapters'][5]['runs']+added,'each actual post-office completion must settle exactly once'
 assert after['chapters'][:5]==before['chapters'][:5],'post replay changed another chapter'
 assert after['choices']==before['choices'],'post replay changed a narrative choice'
 return {'legitimateCompletedRunsAdded':added,'previousChapterResultsAndChoicesUnchanged':True}

def post_rider_record(s):
 p=next(q for q in s['movers'] if q['id']=='last-stage')
 return {**{key:s[key] for key in ['runId','bodyIdentity','chapterIndex','mode','state','form','time','deaths','body','input']},'mover':p}

def validate_post_rider(samples):
 assert len(samples)>=3,'one endpoint is not a complete actual floating-book ride'
 first=samples[0];period=2*math.pi/abs(first['mover']['speed'])
 relative=first['body']['x']-first['mover']['x'];previous=first['time']
 sole=drift=0;left=right=0
 for s in samples:
  p=s['mover'];b=s['body']
  assert (s['runId'],s['bodyIdentity'],s['chapterIndex'],s['mode'],s['deaths'])==(first['runId'],first['bodyIdentity'],5,'story',first['deaths']),'floating-book ride changed run, body, chapter or deaths'
  assert s['state']=='playing' and s['form']=='body','floating-book ride interrupted'
  assert s['time']>=previous,'floating-book time reversed'
  assert b['platform']=='last-stage' and b['grounded'] and p['id']=='last-stage','body lost its actual floating-book attachment'
  assert s['input']=={'x':0,'y':0} and abs(b['vx'])<.001,'rider had held direction input or residual acceleration'
  assert b['x']+b['w']/2>=p['x'] and b['x']-b['w']/2<=p['x']+p['w'],'actual floating book no longer overlaps body'
  sole=max(sole,abs(b['y']-p['y']));drift=max(drift,abs(b['x']-p['x']-relative))
  assert sole<.001 and drift<1e-5,'book contact or relative carry drifted'
  if p['dx']<0:left+=1
  if p['dx']>0:right+=1
  previous=s['time']
 elapsed=samples[-1]['time']-first['time']
 travel=max(s['mover']['x'] for s in samples)-min(s['mover']['x'] for s in samples)
 assert elapsed>=period,'floating-book observation omitted part of the actual period'
 assert left and right and travel>max(365,first['mover']['range']*1.97),'both actual floating-book travel directions and full excursion were not observed'
 return {'elapsed':elapsed,'actualPeriod':period,'sampleCount':len(samples),'samples':samples,
         'maxSoleError':sole,'maxRelativeHorizontalDrift':drift,'horizontalTravel':travel,
         'relativeDriftBound':1e-5,'twoDirections':True,'actualMoverSupport':True,'fullCycle':True}

async def finish_post_story(page,driver,expected,touch=False):
 if not touch:return await driver.finish_story_from_ui(page,expected)
 await page.locator('#story-dialog[open]').wait_for()
 portraits=[]
 for current in expected:
  portraits.append(await driver.read_ready_story_portrait(page,current))
  await click_input(page,'#story-next',driver,True)
 assert not await page.locator('#story-dialog[open]').is_visible(),'post story has an unexpected extra page'
 return {'portraits':portraits,'pages':[p['page'] for p in portraits]}

async def wait_ending_art_settled(page):
 """Observe the finite CSS entrance naturally; never seek or finish it.
 The sixth-chapter result has already stopped the game, so this visual-only
 wait cannot consume a hazard freeze or change the route's physical evidence.
 """
 await page.wait_for_function("""()=>{
  const dialog=document.querySelector('#ending-dialog');
  if(!dialog?.open)return false;
  const scene=dialog.querySelector('#ending-scene');
  return !scene||scene.getAnimations({subtree:true})
    .every(animation=>animation.playState!=='running'&&!animation.pending);
 }""",timeout=2000)

def validate_post(p,kind='ready'):
 detail=json.dumps({'expected':kind,'actual':p},ensure_ascii=False)
 assert p and p['status']==kind,'wrong sixth-chapter painted state: '+detail
 if kind=='ready':
  assert p['frame'] and p['complete'] and (p['width'],p['height'])==(2172,724),'image not decoded and actually drawn: '+detail
  assert urlparse(p['imageSource'] or '').path.endswith('/'+POST_FILE),'unexpected image: '+detail
 else:
  assert not p['frame'] and not p['complete'] and p['width']==p['height']==0 and p['imageSource'] is None,'fallback painted unready image: '+detail
 assert len(p['lampLit'])==2 and len(p['lightAmounts'])==2
 return p
async def post_paint(page,kind='ready'):
 await page.wait_for_function("kind=>window.__qaRead()?.postPaint?.status===kind",arg=kind,timeout=12000)
 if kind=='ready':await page.wait_for_function("()=>window.__qaRead()?.postPaint?.frame===true",timeout=3500)
 return validate_post((await page.evaluate('window.__qaRead()'))['postPaint'],kind)
async def restart_post(page,driver,touch=False,paint='ready'):
 old=await page.evaluate('window.__qaRead()')
 assert old['chapterIndex']==5 and old['state']=='playing'
 await action(page,driver,'Escape','[data-shell-action="pause"]',touch)
 await page.locator('#pause-dialog[open]').wait_for()
 await click_input(page,'#stage-restart',driver,touch)
 await page.wait_for_function("id=>{const s=window.__qaRead();return s?.chapterIndex===5&&s.state==='playing'&&s.bodyIdentity!==id;}",arg=old['bodyIdentity'])
 r=await post_paint(page,paint)
 assert r['lampLit']==[False,False] and r['lightAmounts']==[0,0]
 assert (await page.evaluate('window.__qaRead()'))['postDelivery']['phase']=='waiting'
 return r
async def touch_entries(page,output,label,driver):
 original=page.viewport_size;cases={}
 try:
  for width,height in [(390,844),(320,680)]:
   await page.set_viewport_size({'width':width,'height':height})
   await restart_post(page,driver,touch=True)
   await driver.drive_to(page,145,touch=True,limit=5)
   await driver.assert_hud_readable(page,label+'-post-entry-'+str(width),form='body')
   await page.screenshot(path=str(Path(output)/(label+'-post-entry-'+str(width)+'.png')),full_page=True)
   await open_cap(page,driver,touch=True)
   await return_body(page,driver,touch=True)
   actual=await page.evaluate('window.__qaRead()')
   assert actual['chapterIndex']==5 and actual['postDelivery']['phase']=='waiting' and actual['deaths']==0
   cases[str(width)]={'input':'Chromium CDP simulated touch','realMoveAndCapReturn':True,
                      'scope':'normal prior unlock and safe sixth-chapter entry, not full mobile chapter completion'}
 finally:await page.set_viewport_size(original)
 return cases
async def failure_case(page,output,label,driver):
 target=urljoin(page.url,'assets/'+POST_FILE)
 gate=LibraryAbortGate(target);page.on('requestfailed',gate.failed)
 await page.route(target,gate.route)
 try:
  fallback=await restart_post(page,driver,paint='error')
  before=await page.evaluate('window.__qaRead()')
  await driver.drive_to(page,155,limit=5)
  moved=await page.evaluate('window.__qaRead()')
  assert moved['body']['x']>135 and moved['deaths']==0 and moved['bodyIdentity']==before['bodyIdentity']
  await page.screenshot(path=str(Path(output)/(label+'-post-fallback-movement.png')),full_page=True)
  record,failure=await gate.finish()
 finally:
  await page.unroute(target,gate.route);page.remove_listener('requestfailed',gate.failed)
 restored=await restart_post(page,driver)
 return {'fallback':fallback,'request':record,'expectedRequestFailures':[failure],
         'recovered':restored,'scope':'failed primary WebP, actual body movement, restart and recovered image; no full failed-image browser route'}
async def wait_board(page,driver,touch=False):
 await page.wait_for_function("()=>{const s=window.__qaRead();return s?.movers?.some(p=>p.id==='last-stage'&&p.x<=850&&p.dx>0);}",timeout=15000)
 if not touch:await page.locator('#dream-canvas').focus()
 async def on_book():return (await page.evaluate('window.__qaRead()'))['body']['platform']=='last-stage'
 await driver.hold(page,'right',until=on_book,touch=touch,limit=3.8)
 # A real ArrowRight release does not instantly erase vx. Original physics
 # brakes at 1650 px/s²; recording relative book offset before that decays
 # misclassifies normal player travel as unwanted platform carry drift.
 # Do not weaken the strict no-input drift assertions in ride_cycle().
 await page.wait_for_function("""()=>{
   const s=window.__qaRead();
   return s?.form==='body'&&s.body?.grounded&&
     s.body.platform==='last-stage'&&s.input.x===0&&Math.abs(s.body.vx)<.001;
 }""",timeout=2400)
 s=await page.evaluate('window.__qaRead()')
 assert s['form']=='body' and s['body']['grounded'] and s['body']['platform']=='last-stage'
 assert s['input']['x']==0 and abs(s['body']['vx'])<.001,'input not settled before measuring rider carry'
 return s
async def ride_cycle(page):
 first=await page.evaluate('window.__qaRead()')
 initial=next(p for p in first['movers'] if p['id']=='last-stage')
 duration=max(9.05,2*math.pi/abs(initial['speed'])+.05)
 start=first['time'];samples=[post_rider_record(first)]
 deadline=time.monotonic()+15
 while True:
  s=await page.evaluate('window.__qaRead()')
  samples.append(post_rider_record(s))
  if s['time']-start>=duration:break
  assert time.monotonic()<deadline,'book full-cycle observation exceeded wall budget'
  await page.wait_for_timeout(50)
 return validate_post_rider(samples)
async def play_route(page,output,label,driver,touch=False,paint='ready',full_story=True,compact=False):
 began=time.monotonic()
 print(label,'post full route start',{'input':'CDP touch' if touch else 'keyboard','paint':paint},flush=True)
 start=await page.evaluate('window.__qaRead()')
 assert start['chapterIndex']==5 and start['form']=='body' and start['seals']==0 and start['memories']==0 and start['deaths']==0
 await post_paint(page,paint)
 intro=None;npc=None
 if full_story:
  await click_input(page,'#stage-story',driver,touch)
  intro=await finish_post_story(page,driver,POST_INTRO,touch)
  await driver.drive_to(page,120,limit=5,touch=touch)
  await action(page,driver,'q','#stage-interact',touch)
  npc=await finish_post_story(page,driver,POST_NPC,touch)
  await page.screenshot(path=str(Path(output)/(label+'-post-keeper.png')),full_page=True)
 if touch:await driver.assert_hud_readable(page,label+'-post-start',form='body')
 await driver.drive_to(page,430,limit=7,touch=touch)
 pressed=await page.evaluate('window.__qaRead()')
 assert pressed['body']['grounded'] and pressed['body']['x']>=415
 await open_cap(page,driver,touch)
 await driver.drive_to(page,225,420,limit=7,touch=touch)
 await page.wait_for_function('()=>window.__qaRead()?.memories===1',timeout=2500)
 await driver.drive_to(page,700,270,limit=8,touch=touch)
 await answer_puzzle(page,driver,'所有愿意继续生活的人',touch,portrait='portrait-hero.svg')
 await page.wait_for_function("()=>{const s=window.__qaRead();return s?.seals===1&&s.postPaint?.lightAmounts[0]>.5&&s.postPaint.lightAmounts[1]===0;}",timeout=4500)
 lamp1=(await page.evaluate('window.__qaRead()'))['postPaint']
 assert (await page.evaluate('window.__qaRead()'))['postDelivery']['phase']=='waiting'
 if not compact:await page.screenshot(path=str(Path(output)/(label+'-post-first-lamp.png')),full_page=True)
 await return_body(page,driver,touch)
 await driver.drive_to(page,760,limit=8,touch=touch)
 await action(page,driver,'Space','#stage-jump',touch)
 await page.wait_for_function("()=>{const s=window.__qaRead();return s?.body.grounded&&Math.abs(s.body.y-465)<1;}",timeout=2700)
 await driver.drive_to(page,845,limit=4,touch=touch)
 boarded=await wait_board(page,driver,touch)
 ride=await ride_cycle(page)
 await page.screenshot(path=str(Path(output)/(label+'-post-book-riding.png')),full_page=True)
 await open_cap(page,driver,touch)
 await driver.drive_to(page,1100,305,limit=7,touch=touch)
 await page.wait_for_function('()=>window.__qaRead()?.memories===2',timeout=2500)
 await return_body(page,driver,touch)
 await page.wait_for_function("()=>{const s=window.__qaRead();return s?.movers.some(p=>p.id==='last-stage'&&p.x>=1120&&p.dx>0);}",timeout=15000)
 await action(page,driver,'Space','#stage-jump',touch)
 await driver.drive_to(page,1280,limit=6,touch=touch)
 await page.wait_for_function("()=>{const s=window.__qaRead();return s?.body.grounded&&Math.abs(s.body.y-465)<1;}",timeout=1800)
 landed=await page.evaluate('window.__qaRead()')
 assert landed['body']['grounded'] and abs(landed['body']['y']-465)<1 and landed['body']['platform'] is None
 await driver.drive_to(page,1420,limit=6,touch=touch)
 await driver.drive_to(page,1440,limit=5,touch=touch)
 if not touch:await page.locator('#dream-canvas').focus()
 bounce_samples=[]
 async def mushroom_bounced():
  s=await page.evaluate('window.__qaRead()')
  if s['body']['vy']<-800:bounce_samples.append(s);return True
  return False
 await driver.hold(page,'right',until=mushroom_bounced,touch=touch,limit=2.8)
 bounced=bounce_samples[-1]
 await driver.drive_to(page,1680,limit=6,touch=touch)
 await page.wait_for_function("()=>{const s=window.__qaRead();return s?.body.grounded&&Math.abs(s.body.y-390)<1;}",timeout=1800)
 root=await page.evaluate('window.__qaRead()')
 assert root['body']['grounded'] and abs(root['body']['y']-390)<1 and root['deaths']==0
 if not compact:await page.screenshot(path=str(Path(output)/(label+'-post-root-landing.png')),full_page=True)
 await driver.drive_to(page,2110,limit=10,touch=touch)
 safe=await page.evaluate('window.__qaRead()')
 assert safe['body']['x']<2120 and safe['deaths']==0
 await open_cap(page,driver,touch)
 wind=[]
 await driver.drive_to(page,2130,260,limit=8,touch=touch,observe=lambda s:wind.append({'time':s['time'],'x':s['x'],'y':s['y'],'form':s['form']}))
 assert any(p['form']=='soul' and 1880<=p['x']<=2260 and 100<=p['y']<=430 for p in wind),'actual soul did not traverse the original wind corridor'
 await answer_puzzle(page,driver,'明',touch,portrait='portrait-soul.svg')
 await page.wait_for_function("()=>{const p=window.__qaRead()?.postPaint;return p?.lampLit.every(Boolean)&&p.lightAmounts.every(x=>x>.5);}",timeout=4500)
 lamp2=(await page.evaluate('window.__qaRead()'))['postPaint']
 assert (await page.evaluate('window.__qaRead()'))['postDelivery']['phase']=='ready'
 await return_body(page,driver,touch,settle=False)
 await page.wait_for_function("()=>window.__qaRead()?.postDelivery?.phase==='settled'",timeout=2200)
 await open_cap(page,driver,touch)
 await page.wait_for_function("()=>window.__qaRead()?.capPhase==='open'",timeout=1800)
 await page.screenshot(path=str(Path(output)/(label+'-post-two-lamps-sun-stamp.png')),full_page=True)
 if touch:await driver.assert_hud_readable(page,label+'-post-two-lamps',form='soul')
 await driver.drive_to(page,2350,400,limit=8,touch=touch)
 await page.wait_for_function('()=>window.__qaRead()?.memories===3',timeout=2500)
 await driver.drive_to(page,2350,380,limit=4,touch=touch)
 done,exit_trace,exit_input=await complete_post_approach(page,output,label,driver,touch)
 assert done['bodyIdentity']==start['bodyIdentity']
 validate_post(done['postPaint'],paint)
 await page.screenshot(path=str(Path(output)/(label+'-post-body-exit.png')),full_page=True)
 seconds=round(time.monotonic()-began,3)
 print(label,'post full route complete',{'wallSeconds':seconds,'input':'CDP touch' if touch else 'keyboard','paint':paint},flush=True)
 return {'intro':intro['portraits'] if intro else None,'npc':npc['portraits'] if npc else None,'book':ride,'boarded':boarded['body'],
         'rootLanding':root['body'],'firstLamp':lamp1,'secondLamp':lamp2,'fullBodyExit':True,
         'mushroomBounce':bounced['body'],'windCorridorSamples':wind,'finalExit':exit_trace,'finalInputEvents':exit_input,
         'realSunStampBeforeDanger':True,'oneFinalPendulumFrozen':True,'deaths':0,
         'paint':paint,'input':'Chromium CDP simulated touch' if touch else 'keyboard','wallSeconds':seconds}
async def exercise_post(page,output,label,driver):
 print(label,'verify sixth chapter post office earned from fifth',flush=True)
 start=await page.evaluate('window.__qaRead()')
 assert start['chapterIndex']==5 and start['state']=='playing' and start['mode']=='story'
 before=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1'))")
 assert all(ch['completed'] for ch in before['chapters'][:5]) and not before['chapters'][5]['completed']
 grants=await driver.read_reward_grants(page)
 image=await post_paint(page)
 assert image['lampLit']==[False,False] and image['lightAmounts']==[0,0]
 await page.screenshot(path=str(Path(output)/(label+'-post-intro-entry.png')),full_page=True)
 touch=await touch_entries(page,output,label,driver)
 failure=await failure_case(page,output,label,driver)
 route=await play_route(page,output,label,driver)
 saved=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1'))")
 assert saved['chapters'][5]['completed'] and saved['chapters'][5]['runs']==before['chapters'][5]['runs']+1
 assert saved['chapters'][:5]==before['chapters'][:5] and saved['choices']==before['choices']
 assert await driver.read_reward_grants(page)==grants
 await page.locator('#result-story').click()
 outro=await driver.finish_story_from_ui(page,POST_OUTRO)
 await page.locator('#ending-dialog[open]').wait_for()
 ending={'title':await page.locator('#ending-title').text_content(),
         'text':await page.locator('#ending-text').text_content()}
 assert ending['title'] and '小满' in ending['text']
 await wait_ending_art_settled(page)
 await page.screenshot(path=str(Path(output)/(label+'-post-ending.png')),full_page=True)
 after=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1'))")
 assert len(after['discoveredEndings'])>=1
 return {'normalFifthUnlock':True,'painted':image,'phoneEntries':touch,
         'primaryFailure':failure,'route':route,'outro':outro['portraits'],'ending':ending,
         'exactlyOneChapterSettlement':True,'rewardGrantsUnchanged':True,
         'expectedRequestFailures':failure['expectedRequestFailures']}

async def reenter_completed_post(page,driver,touch=False,paint='ready'):
 """Use the earned ending's real map control; never manufacture a completion."""
 await page.locator('#ending-dialog[open]').wait_for()
 await click_input(page,'#ending-home',driver,touch)
 await page.locator('#map-dialog[open]').wait_for()
 target=page.locator('#chapter-grid [data-chapter="5"]')
 assert await target.is_enabled(),'the completed final chapter was not available in the actual map'
 await click_input(page,target,driver,touch)
 await page.wait_for_function("()=>{const s=window.__qaRead();return s?.chapterIndex===5&&s.state==='playing'&&s.form==='body';}")
 ready=await post_paint(page,paint)
 assert ready['lampLit']==[False,False] and ready['lightAmounts']==[0,0]
 return ready

async def finish_post_ending(page,driver,touch=False):
 await page.locator('#result-dialog[open]').wait_for()
 fresh_input=None
 if touch:
  await page.evaluate(POST_EXIT_INPUT_OBSERVER)
  try:
   await click_input(page,'#result-story',driver,True)
   # This is the user's next, distinct tap. It must still advance immediately
   # after the prior movement gesture was consumed at the result boundary.
   fresh=await page.evaluate(POST_EXIT_UI)
   fresh_events=await stop_post_exit_observer(page)
   try:fresh_input=validate_fresh_result_touch(fresh_events,fresh)
   except AssertionError:
    print('post fresh result touch failure',json.dumps({'events':fresh_events,'after':fresh},ensure_ascii=False),flush=True)
    raise
  finally:await stop_post_exit_observer(page)
 else:await click_input(page,'#result-story',driver)
 outro=await finish_post_story(page,driver,POST_OUTRO,touch)
 await page.locator('#ending-dialog[open]').wait_for()
 return {'portraits':outro['portraits'],'title':await page.locator('#ending-title').text_content(),'freshResultTouch':fresh_input}

async def post_delayed_resources(page,output,label,driver):
 """Hold the original bytes, play meanwhile, then release in/out of the chapter."""
 began=time.monotonic();results={};expected=[]
 before=await page.evaluate(READ_SAVE);grants=await driver.read_reward_grants(page)
 target=urljoin(page.url,'assets/'+POST_FILE)
 for mode in ['delayed-current','late-after-leaving']:
  print(label,'post resource case start',mode,flush=True)
  delayed=driver.PortraitRequestGate(target,'post-'+mode)
  page.on('requestfailed',delayed.failed);page.on('requestfinished',delayed.finished)
  await page.route(target,delayed.route)
  try:
   loading=await restart_post(page,driver,paint='loading')
   await asyncio.wait_for(delayed.arrived.wait(),6)
   await driver.drive_to(page,145,limit=5)
   moved=await page.evaluate('window.__qaRead()')
   assert moved['state']=='playing' and moved['chapterIndex']==5 and moved['body']['x']>130 and moved['deaths']==0
   validate_post(moved['postPaint'],'loading')
   await page.screenshot(path=str(Path(output)/(label+'-post-'+mode+'.png')),full_page=True)
   if mode=='late-after-leaving':
    await click_input(page,'[data-shell-action="map"]',driver)
    await page.locator('#map-dialog[open]').wait_for()
    destination=page.locator('#chapter-grid [data-chapter="4"]')
    assert await destination.is_enabled()
    delayed.obsolete=True
    await destination.click()
    await page.wait_for_function("()=>{const s=window.__qaRead();return s?.chapterIndex===4&&s.state==='playing';}")
    # Do not obsolete a second still-loading scene while proving only the held
    # post-office resource. Observe its real native ready frame first.
    from browser_coast_v27 import assert_coast_paint
    await assert_coast_paint(page)
    left=await page.evaluate('window.__qaRead()')
    assert left['postPaint'] is None and left['postDelivery'] is None
   request,cancelled=await delayed.finish()
   if cancelled:expected.append(cancelled)
   if mode=='delayed-current':
    ready=await post_paint(page)
    actual=await page.evaluate('window.__qaRead()')
    assert actual['bodyIdentity']==moved['bodyIdentity'] and actual['deaths']==0
    await page.screenshot(path=str(Path(output)/(label+'-post-delay-ready.png')),full_page=True)
    results[mode]={'request':request,'loading':loading,'actualMoveWhileLoading':True,'ready':ready,'sameBodyAfterNativeResponse':True}
   else:
    await page.evaluate('async()=>{for(let i=0;i<3;i++)await new Promise(resolve=>requestAnimationFrame(resolve));}')
    actual=await page.evaluate('window.__qaRead()')
    assert actual['chapterIndex']==4 and actual['postPaint'] is None and actual['postDelivery'] is None
    assert actual['bodyIdentity']==left['bodyIdentity'] and actual['deaths']==left['deaths']
    results[mode]={'request':request,'currentChapter':4,'newChapterBodyUnchanged':True,'noPostArtOrDeliveryLeak':True}
   current=await page.evaluate(READ_SAVE)
   for key in ['chapters','choices','discoveredEndings']:
    assert current[key]==before[key],'delayed post resource changed '+key
   assert await driver.read_reward_grants(page)==grants
  finally:
   delayed.release.set()
   if delayed.request is not None and not delayed.handled.is_set():
    await asyncio.wait_for(delayed.handled.wait(),8)
   await page.unroute(target,delayed.route)
   page.remove_listener('requestfailed',delayed.failed);page.remove_listener('requestfinished',delayed.finished)
  print(label,'post resource case complete',mode,flush=True)
 await enter_chapter(page,driver,5)
 results['recoveredAfterLeaving']=await post_paint(page)
 assert results['recoveredAfterLeaving']['lampLit']==[False,False]
 return {'cases':results,'expectedRequestFailures':expected,'chaptersChoicesEndingsAndRewardGrantsUnchanged':True,
         'wallSeconds':round(time.monotonic()-began,3)}

async def exercise_post_extended(page,output,label,driver):
 """Three additional legitimate full replays after the original earned finish.
 Every completion has its own before/after run count. Re-reading an ending is
 separately checked by the ending UI suite; these actual replays are not
 misreported as one settlement or as a physical mobile-device test.
 """
 began=time.monotonic();viewport=page.viewport_size
 before=await page.evaluate(READ_SAVE);grants=await driver.read_reward_grants(page)
 assert all(ch['completed'] for ch in before['chapters'])
 await page.locator('#ending-dialog[open]').wait_for()
 emulation=await page.context.new_cdp_session(page);phones={}
 try:
  await emulation.send('Emulation.setTouchEmulationEnabled',{'enabled':True,'maxTouchPoints':5})
  for width,height in [(390,844),(320,680)]:
   await page.set_viewport_size({'width':width,'height':height})
   checkpoint=await page.evaluate(READ_SAVE)
   image=await reenter_completed_post(page,driver,touch=True)
   route=await play_route(page,output,label+'-full-touch-'+str(width),driver,touch=True,full_story=False,compact=True)
   settled=await page.evaluate(READ_SAVE)
   settlement=validate_post_settlement(checkpoint,settled)
   assert await driver.read_reward_grants(page)==grants
   outro=await finish_post_ending(page,driver,touch=True)
   await wait_ending_art_settled(page)
   await page.screenshot(path=str(Path(output)/(label+'-post-full-touch-'+str(width)+'-ending.png')),full_page=True)
   phones[str(width)]={'viewport':{'width':width,'height':height},'painted':image,'route':route,'outro':outro,
                      'settlement':settlement,'rewardGrantsUnchanged':True,
                      'scope':'complete earned chapter-six replay using Chromium CDP simulated touch for controls, puzzles, map and dialogue; not a physical device'}
 finally:
  await emulation.send('Emulation.setTouchEmulationEnabled',{'enabled':False})
  await emulation.detach()
  await page.set_viewport_size(viewport)
 target=urljoin(page.url,'assets/'+POST_FILE)
 gate=LibraryAbortGate(target);page.on('requestfailed',gate.failed)
 await page.route(target,gate.route)
 try:
  checkpoint=await page.evaluate(READ_SAVE)
  failed=await reenter_completed_post(page,driver,paint='error')
  route=await play_route(page,output,label+'-full-fallback',driver,paint='error',full_story=False,compact=True)
  request,failure=await gate.finish()
  settled=await page.evaluate(READ_SAVE)
  settlement=validate_post_settlement(checkpoint,settled)
  assert await driver.read_reward_grants(page)==grants
  fallback={'request':request,'painted':failed,'route':route,'settlement':settlement,'rewardGrantsUnchanged':True,
            'scope':'full actual desktop post-office completion while the one exact primary WebP fails'}
 finally:
  await page.unroute(target,gate.route);page.remove_listener('requestfailed',gate.failed)
 fallback['outro']=await finish_post_ending(page,driver)
 recovered=await reenter_completed_post(page,driver)
 resources=await post_delayed_resources(page,output,label,driver)
 # Reopen the already-earned ending through the real diary. The incomplete
 # recovery visit remains a visit: no fourth completion or synthetic callback.
 await click_input(page,'[data-shell-action="profile"]',driver)
 await page.locator('#journal-dialog[open]').wait_for()
 await click_input(page,'#journal-ending-open',driver)
 await page.locator('#ending-dialog[open]').wait_for()
 after=await page.evaluate(READ_SAVE)
 totals=validate_post_settlement(before,after,added=3)
 assert await driver.read_reward_grants(page)==grants
 seconds=round(time.monotonic()-began,3)
 print(label,'post extended verification complete',{'wallSeconds':seconds,'legitimateAdditionalRuns':3},flush=True)
 return {'phoneFullRoutes':phones,'failedPrimaryFullRoute':fallback,'recovered':recovered,
         'delayedResources':resources,'totalSettlement':totals,'rewardGrantsUnchanged':True,
         'chapterRunsBefore':before['chapters'][5]['runs'],'chapterRunsAfter':after['chapters'][5]['runs'],
         'expectedRequestFailures':[failure]+resources['expectedRequestFailures'],
         'wallSeconds':seconds,'endingReopenedThroughDiary':True}
