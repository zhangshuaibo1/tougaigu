"""V29's postcard, from a genuine sixth-chapter completion and visible diary choices.
No game-state mutation or direct progress API. Phone screenshots resize that
completed desktop run; they are not simulated touch chapter completions.
"""
import json
from pathlib import Path

COMBOS=[('send','release','dawn'),('send','hold','tender'),('keep','release','tender'),('keep','hold','lanterns')]
LABELS={'send':'信已寄出','keep':'信留窗边','release':'钟声向前','hold':'为想念留灯'}
SKIES={'dawn':'晨光正升起','tender':'晨光刚抵达窗沿','lanterns':'长夜的窗灯亮着，太阳尚未升起'}

async def snapshot(page,letter,clock,ending):
 await page.locator('#ending-dialog[open]').wait_for()
 data=await page.evaluate("""()=>{
  const d=document.querySelector('#ending-dialog'),s=document.querySelector('#ending-scene'),b=document.querySelector('#ending-home');
  const box=e=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,height:r.height}};
  return{state:{...s.dataset},description:s.getAttribute('aria-label'),
    labels:[...s.querySelectorAll('.ending-scene-description>*')].map(n=>n.textContent.trim()),
    skyOpacity:getComputedStyle(s.querySelector('.ending-scene-sun')).opacity,
    scene:box(s),button:box(b),dialog:box(d),viewport:{width:innerWidth,height:innerHeight},
    documentWidth:document.documentElement.scrollWidth};
 }""")
 assert data['state']=={'ending':ending,'letter':letter,'clock':clock},json.dumps(data,ensure_ascii=False)
 assert data['labels']==[SKIES[ending],LABELS[letter],LABELS[clock]]
 assert all(t in data['description'] for t in data['labels'])
 assert data['documentWidth']<=data['viewport']['width']+1
 assert data['scene']['left']>=0 and data['scene']['right']<=data['viewport']['width']+1
 assert 0<=data['button']['top']<data['button']['bottom']<=data['viewport']['height']+1
 assert data['scene']['height']>=100
 if ending=='lanterns':assert data['skyOpacity']=='0'
 else:assert float(data['skyOpacity'])>0
 return data

async def open_diary(page):
 if await page.locator('#ending-dialog[open]').count():await page.locator('#ending-home').click()
 if await page.locator('#map-dialog[open]').count():await page.locator('#map-continue').click()
 await page.wait_for_function("()=>window.__qaRead()?.chapterIndex===5&&window.__qaRead()?.state==='playing'",timeout=12000)
 await page.locator('[data-shell-action="profile"]').click()
 await page.locator('#journal-dialog[open]').wait_for()

async def rewrite(page,key,choice):
 saved=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1')).choices")
 if saved[key]==choice:return
 await page.locator('#journal-choices [data-reply="'+key+'"]').click()
 await page.locator('#choice-dialog[open]').wait_for()
 await page.locator('#choice-options [data-choice="'+choice+'"]').click()
 await page.locator('#story-dialog[open]').wait_for()
 await page.wait_for_function("""()=>{
  const img=document.querySelector('#story-portrait'),parent=img?.closest('.story-portrait-wrap');
  return document.querySelector('#story-dialog-title')?.textContent==='拾光'&&
    img?.complete&&img.naturalWidth>0&&img.naturalHeight>0&&
    parent?.dataset.portrait==='ready';
 }""",timeout=7500)
 assert await page.locator('#story-dialog-text').inner_text()
 await page.locator('#story-next').click()
 await page.locator('#journal-dialog[open]').wait_for()
 stored=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1')).choices")
 assert stored[key]==choice

async def exercise_ending(page,output,label,driver):
 print(label,'v29 earned ending / actual diary choice permutations',flush=True)
 before=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1'))")
 assert all(ch['completed'] for ch in before['chapters'])
 assert before['choices']['letter'] in ('send','keep') and before['choices']['clock'] in ('release','hold')
 original=next(x for x in COMBOS if x[:2]==(before['choices']['letter'],before['choices']['clock']))
 grants=await driver.read_reward_grants(page)
 initial=await snapshot(page,*original)
 views=[]
 for letter,clock,ending in COMBOS:
  await open_diary(page)
  await rewrite(page,'letter',letter)
  await rewrite(page,'clock',clock)
  await page.locator('#journal-ending-open').click()
  visual=await snapshot(page,letter,clock,ending)
  await page.screenshot(path=str(Path(output)/(label+'-v29-ending-'+letter+'-'+clock+'.png')),full_page=True)
  stored=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1'))")
  assert stored['chapters']==before['chapters']
  assert len(stored['discoveredEndings'])<=3 and len(stored['discoveredEndings'])==len(set(stored['discoveredEndings']))
  assert await driver.read_reward_grants(page)==grants
  views.append({'choices':[letter,clock],'scene':visual})
 previous=page.viewport_size
 phones={}
 try:
  for width,height in ((390,844),(320,680)):
   await page.set_viewport_size({'width':width,'height':height})
   phones[str(width)]=await snapshot(page,'keep','hold','lanterns')
   await page.screenshot(path=str(Path(output)/(label+'-v29-ending-'+str(width)+'.png')),full_page=True)
 finally:await page.set_viewport_size(previous)
 await page.wait_for_load_state('networkidle')
 await page.reload(wait_until='domcontentloaded')
 await page.wait_for_function("()=>window.__qaRead()?.chapterIndex===5&&window.__qaRead()?.state==='playing'",timeout=12000)
 await page.locator('[data-shell-action="profile"]').click()
 await page.locator('#journal-dialog[open]').wait_for()
 await page.locator('#journal-ending-open').click()
 reloaded=await snapshot(page,'keep','hold','lanterns')
 after=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1'))")
 assert after['chapters']==before['chapters']
 assert after['choices']=={'letter':'keep','clock':'hold'}
 assert set(after['discoveredEndings'])=={'dawn','tender','lanterns'}
 assert await driver.read_reward_grants(page)==grants
 return{'original':initial,'fourCombinations':views,'phoneViewportResizeAfterDesktopCompletion':phones,
        'reloaded':reloaded,'threeExistingEndingsDiscovered':True,'noDuplicateRewards':True}
