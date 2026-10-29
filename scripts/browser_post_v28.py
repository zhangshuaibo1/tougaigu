"""Earned sixth chapter: real post office image, actual book, lights, recall and ending.
No teleport, fixture, save mutation or direct game-solving calls in browser tests.
"""
import base64,json,math,time
from pathlib import Path
from urllib.parse import urljoin,urlparse
from browser_library_v26 import action,open_cap,return_body,answer_puzzle,click_input
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
async def wait_board(page,driver):
 await page.wait_for_function("()=>{const s=window.__qaRead();return s?.movers?.some(p=>p.id==='last-stage'&&p.x<=850&&p.dx>0);}",timeout=15000)
 await page.locator('#dream-canvas').focus()
 await page.keyboard.down('ArrowRight')
 try:
  await page.wait_for_function("()=>window.__qaRead()?.body.platform==='last-stage'",timeout=3800)
 finally:await page.keyboard.up('ArrowRight')
 s=await page.evaluate('window.__qaRead()')
 assert s['form']=='body' and s['body']['grounded'] and s['body']['platform']=='last-stage'
 return s
async def ride_cycle(page):
 first=await page.evaluate('window.__qaRead()')
 initial=next(p for p in first['movers'] if p['id']=='last-stage')
 relative=first['body']['x']-initial['x'];start=first['time'];samples=[];left=right=0
 deadline=time.monotonic()+15
 while True:
  s=await page.evaluate('window.__qaRead()')
  p=next(q for q in s['movers'] if q['id']=='last-stage')
  assert s['body']['platform']=='last-stage' and s['body']['grounded'] and s['deaths']==0
  assert abs(s['body']['y']-p['y'])<.001 and abs(s['body']['x']-p['x']-relative)<1e-5,'book contact or relative carry drifted'
  if p['dx']<0:left+=1
  if p['dx']>0:right+=1
  samples.append({'time':s['time'],'platformX':p['x'],'relativeX':s['body']['x']-p['x']})
  if s['time']-start>=9.05:break
  assert time.monotonic()<deadline,'book full-cycle observation exceeded wall budget'
  await page.wait_for_timeout(50)
 assert left and right and max(p['platformX'] for p in samples)-min(p['platformX'] for p in samples)>365
 return {'elapsed':samples[-1]['time']-start,'samples':len(samples),'relativeDriftBound':1e-5,
         'twoDirections':True,'actualMoverSupport':True}
async def play_route(page,output,label,driver):
 start=await page.evaluate('window.__qaRead()')
 assert start['chapterIndex']==5 and start['form']=='body' and start['seals']==0 and start['memories']==0 and start['deaths']==0
 await post_paint(page)
 await page.locator('#stage-story').click()
 intro=await driver.finish_story_from_ui(page,POST_INTRO)
 await driver.drive_to(page,120,limit=5)
 await action(page,driver,'q','#stage-interact')
 npc=await driver.finish_story_from_ui(page,POST_NPC)
 await page.screenshot(path=str(Path(output)/(label+'-post-keeper.png')),full_page=True)
 await driver.drive_to(page,430,limit=7)
 pressed=await page.evaluate('window.__qaRead()')
 assert pressed['body']['grounded'] and pressed['body']['x']>=415
 await open_cap(page,driver)
 await driver.drive_to(page,225,420,limit=7)
 await page.wait_for_function('()=>window.__qaRead()?.memories===1',timeout=2500)
 await driver.drive_to(page,700,270,limit=8)
 await answer_puzzle(page,driver,'所有愿意继续生活的人',portrait='portrait-hero.svg')
 await page.wait_for_function("()=>{const s=window.__qaRead();return s?.seals===1&&s.postPaint?.lightAmounts[0]>.5&&s.postPaint.lightAmounts[1]===0;}",timeout=4500)
 lamp1=(await page.evaluate('window.__qaRead()'))['postPaint']
 assert (await page.evaluate('window.__qaRead()'))['postDelivery']['phase']=='waiting'
 await page.screenshot(path=str(Path(output)/(label+'-post-first-lamp.png')),full_page=True)
 await return_body(page,driver)
 await driver.drive_to(page,760,limit=8)
 await action(page,driver,'Space','#stage-jump')
 await page.wait_for_function("()=>{const s=window.__qaRead();return s?.body.grounded&&Math.abs(s.body.y-465)<1;}",timeout=2700)
 await driver.drive_to(page,845,limit=4)
 boarded=await wait_board(page,driver)
 ride=await ride_cycle(page)
 await page.screenshot(path=str(Path(output)/(label+'-post-book-riding.png')),full_page=True)
 await open_cap(page,driver)
 await driver.drive_to(page,1100,305,limit=7)
 await page.wait_for_function('()=>window.__qaRead()?.memories===2',timeout=2500)
 await return_body(page,driver)
 await page.wait_for_function("()=>{const s=window.__qaRead();return s?.movers.some(p=>p.id==='last-stage'&&p.x>=1120&&p.dx>0);}",timeout=15000)
 await action(page,driver,'Space','#stage-jump')
 await driver.drive_to(page,1280,limit=6)
 await page.wait_for_function("()=>{const s=window.__qaRead();return s?.body.grounded&&Math.abs(s.body.y-465)<1;}",timeout=1800)
 landed=await page.evaluate('window.__qaRead()')
 assert landed['body']['grounded'] and abs(landed['body']['y']-465)<1 and landed['body']['platform'] is None
 await driver.drive_to(page,1420,limit=6)
 await driver.drive_to(page,1440,limit=5)
 await page.locator('#dream-canvas').focus()
 await page.keyboard.down('ArrowRight')
 try:await page.wait_for_function('()=>window.__qaRead()?.body.vy<-800',timeout=2800)
 finally:await page.keyboard.up('ArrowRight')
 await driver.drive_to(page,1680,limit=6)
 await page.wait_for_function("()=>{const s=window.__qaRead();return s?.body.grounded&&Math.abs(s.body.y-390)<1;}",timeout=1800)
 root=await page.evaluate('window.__qaRead()')
 assert root['body']['grounded'] and abs(root['body']['y']-390)<1 and root['deaths']==0
 await page.screenshot(path=str(Path(output)/(label+'-post-root-landing.png')),full_page=True)
 await driver.drive_to(page,2110,limit=10)
 safe=await page.evaluate('window.__qaRead()')
 assert safe['body']['x']<2120 and safe['deaths']==0
 await open_cap(page,driver)
 await driver.drive_to(page,2130,260,limit=8)
 await answer_puzzle(page,driver,'明',portrait='portrait-soul.svg')
 await page.wait_for_function("()=>{const p=window.__qaRead()?.postPaint;return p?.lampLit.every(Boolean)&&p.lightAmounts.every(x=>x>.5);}",timeout=4500)
 lamp2=(await page.evaluate('window.__qaRead()'))['postPaint']
 assert (await page.evaluate('window.__qaRead()'))['postDelivery']['phase']=='ready'
 await return_body(page,driver,settle=False)
 await page.wait_for_function("()=>window.__qaRead()?.postDelivery?.phase==='settled'",timeout=2200)
 await open_cap(page,driver)
 await page.wait_for_function("()=>window.__qaRead()?.capPhase==='open'",timeout=1800)
 await page.screenshot(path=str(Path(output)/(label+'-post-two-lamps-sun-stamp.png')),full_page=True)
 await driver.drive_to(page,2350,400,limit=8)
 await page.wait_for_function('()=>window.__qaRead()?.memories===3',timeout=2500)
 await driver.drive_to(page,2350,380,limit=4)
 # Danger HOT PATH. No screenshots, AX or slow waits while frozen.
 await action(page,driver,'Space','#stage-jump')
 frozen=await page.evaluate('window.__qaRead()')
 assert frozen['hazards'][0]['frozen']>3.8,'actual player pulse did not stop last pendulum'
 await return_body(page,driver,settle=False)
 await driver.drive_to(page,2540,until=lambda:page.locator('#result-dialog[open]').is_visible(),limit=5)
 await page.locator('#result-dialog[open]').wait_for()
 done=await page.evaluate('window.__qaRead()')
 assert done['chapterIndex']==5 and done['state']=='complete' and done['seals']==2 and done['memories']==3 and done['deaths']==0
 assert done['bodyIdentity']==start['bodyIdentity']
 await page.screenshot(path=str(Path(output)/(label+'-post-body-exit.png')),full_page=True)
 return {'intro':intro['portraits'],'npc':npc['portraits'],'book':ride,'boarded':boarded['body'],
         'rootLanding':root['body'],'firstLamp':lamp1,'secondLamp':lamp2,'fullBodyExit':True,
         'realSunStampBeforeDanger':True,'oneFinalPendulumFrozen':True,'deaths':0}
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
 await page.screenshot(path=str(Path(output)/(label+'-post-ending.png')),full_page=True)
 after=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1'))")
 assert len(after['discoveredEndings'])>=1
 return {'normalFifthUnlock':True,'painted':image,'phoneEntries':touch,
         'primaryFailure':failure,'route':route,'outro':outro['portraits'],'ending':ending,
         'exactlyOneChapterSettlement':True,'rewardGrantsUnchanged':True,
         'expectedRequestFailures':failure['expectedRequestFailures']}
