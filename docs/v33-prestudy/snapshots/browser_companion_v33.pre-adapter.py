"""Focused local companion study, using original keyboard/touch/UI controls.

Read-only probes are appended to the served app in memory. No saved progress,
actor coordinates, cap phases, game clock or drawing routine is assigned.
The baseline URL serves the exact frozen v32 dist in a separate fresh context.
This is not the full story suite, a public deployment or a physical-device test.
"""
import argparse, asyncio, base64, hashlib, importlib.util, json, re, time
from pathlib import Path
from urllib.parse import urlparse
from playwright.async_api import async_playwright

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('companion_original_driver',HERE/'browser-smoke.py')
api=importlib.util.module_from_spec(spec);spec.loader.exec_module(api)

COMPANION_PROBE="""
import {getCompanionView as __qaCompanionView} from './dream-companion-art.js';
window.__qaCompanionRead=()=>{
  if(!game?.body)return null;
  const t=game.options.reducedMotion?0:game.visualTime;
  const character=game.getCharacterPresentation(t),shown=game.getSoulPresentation(character);
  const companion=game.companion,view=__qaCompanionView(game,companion.x,companion.y,t,shown);
  const canvas=document.querySelector('#dream-canvas'),r=canvas.getBoundingClientRect();
  const x=r.left+(companion.x-game.camera)*game.scale,y=r.top+companion.y*game.scale+game.viewportOffsetY;
  return {version:document.querySelector('meta[name="application-version"]').content,
    observedAt:performance.now(),time:game.time,visualTime:game.visualTime,state:game.state,form:game.form,
    mode:game.mode,chapterIndex:game.chapterIndex,runId:game.runId,deaths:game.deaths,
    body:{x:game.body.x,y:game.body.y},companion:{...companion},rawSoul:{...game.soul},shown,view,
    cap:{phase:game.cap.phase,age:game.cap.age,progress:game.cap.progress,opens:game.cap.opens,returnFrom:game.cap.returnFrom},
    reducedMotion:game.options.reducedMotion,memories:game.memories.map(m=>m.collected),lamps:game.lanterns.map(l=>l.lit),
    firstTicket:{...game.firstTicket},input:{...game.input},painted:game.paintedFrame,
    viewport:{width:innerWidth,height:innerHeight},scale:game.scale,camera:game.camera,canvas:{width:canvas.width,height:canvas.height,left:r.left,top:r.top,right:r.right,bottom:r.bottom},
    companionBounds:{left:x-32*game.scale,right:x+30*game.scale,top:y-62*game.scale,bottom:y+9*game.scale},
    renderScopeReleased:game.companionRenderScope===null};
};
"""

OBSERVER="""({tag,images=true})=>{
  if(window.__qaCompanionObserver)throw Error('observer already exists');
  const samples=[],events=[],latches={},pictures={};let raf=0,timer=0,active=true;
  const initial=window.__qaCompanionRead(),started=performance.now();
  function latch(name,s){
    if(latches[name])return;latches[name]=s;
    if(images)pictures[name]=document.querySelector('#dream-canvas').toDataURL('image/png');
  }
  function read(){return {tag,initial,samples:[...samples],events:[...events],latches:{...latches},pictures:{...pictures},active,elapsedMs:performance.now()-started};}
  function native(e){
    const target=e.target?.closest?.('#stage-toggle,#stage-resume,[data-shell-action="pause"]');
    if(!(e.type==='keydown'&&['KeyE','Escape'].includes(e.code))&&!target)return;
    if(events.length<32)events.push({type:e.type,code:e.code||null,target:target?.id||target?.dataset.shellAction||null,isTrusted:e.isTrusted,repeat:e.repeat||false,pointerType:e.pointerType||null,detail:e.detail??null,snapshot:window.__qaCompanionRead()});
  }
  const types=['keydown','pointerdown','pointerup','click'];
  function stop(){if(active){active=false;cancelAnimationFrame(raf);clearTimeout(timer);for(const type of types)window.removeEventListener(type,native,true);}const result=read();delete window.__qaCompanionObserver;return result;}
  function tick(){
    if(!active)return;const s=window.__qaCompanionRead();samples.push(s);if(samples.length>180)samples.shift();
    if(s.form==='body'&&s.cap.phase==='returning'&&s.shown?.pose==='return'&&s.view?.focus==='return'&&s.shown.alpha>.2)latch('returning',s);
    if(latches.returning&&s.view?.returnBlink>.8)latch('arrival-blink',s);
    if(latches.returning&&s.cap.phase==='closed'&&s.view?.focus==='body')latch('closed',s);
    if(performance.now()-started<5000)raf=requestAnimationFrame(tick);
  }
  for(const type of types)window.addEventListener(type,native,true);
  timer=setTimeout(()=>{active=false;cancelAnimationFrame(raf);for(const type of types)window.removeEventListener(type,native,true);},5200);
  window.__qaCompanionObserver={read,stop};raf=requestAnimationFrame(tick);return initial;
}"""

def sha(data):return hashlib.sha256(data).hexdigest()
def save_json(path,value):path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
def close(a,b):return abs(a-b)<1e-8
def validate(s):
    assert s['version']=='32.0.0' and s['mode']=='story' and s['chapterIndex']==0 and s['deaths']==0
    assert s['renderScopeReleased'],'render scope escaped the synchronous frame'
    v=s['view'];assert v and v['x']==s['companion']['x'] and v['y']==s['companion']['y']
    if v['focus']=='return':
        assert s['form']=='body' and s['cap']['phase']=='returning' and s['shown']['pose']=='return'
        assert v['target']=={'x':s['shown']['x'],'y':s['shown']['y']},'cat is not following the actual displayed return'
    if v['returnBlink']>0:assert s['form']=='body' and s['cap']['phase']=='returning' and s['cap']['returnFrom'] and s['cap']['progress']>=2/3
    if s['reducedMotion']:assert all(v[k]==0 for k in ['time','returnBlink','bob','tailBend','headTilt'])
    return s

async def capture(page,folder,name,records):
    s=validate(await page.evaluate('window.__qaCompanionRead()'))
    r=s['companionBounds'];c=s['canvas'];assert r['left']>=c['left']-1 and r['right']<=c['right']+1 and r['top']>=c['top']-1 and r['bottom']<=c['bottom']+1,'cat must be visible in this planned picture'
    file=folder/(name+'.png');await page.screenshot(path=str(file),full_page=True)
    records.append({'file':file.name,'sha256':sha(file.read_bytes()),'snapshot':s,'scope':'full browser page; read and subsequent screenshot are not guaranteed the same frame'})
    return s

async def take_observer(page,folder,name):
    result=await page.evaluate('window.__qaCompanionObserver.stop()')
    pictures=result.pop('pictures');result['pictures']=[]
    for label,url in pictures.items():
        data=base64.b64decode(url.split(',',1)[1]);file=folder/(name+'-'+label+'-canvas.png');file.write_bytes(data)
        result['pictures'].append({'file':file.name,'sha256':sha(data),'bytes':len(data),'width':int.from_bytes(data[16:20],'big'),'height':int.from_bytes(data[20:24],'big'),'scope':'unaltered current Canvas pixels latched by passive RAF, no render call'})
    for s in [result['initial'],*result['samples']]:validate(s)
    assert result['events'] and all(e['isTrusted'] for e in result['events'])
    return result

async def instrument(page,after):
    async def route(r):
        response=await r.fetch();await r.fulfill(response=response,body=(await response.text())+api.PROBE+(COMPANION_PROBE if after else ''))
    await page.route(re.compile(r'/dream-app\.js(?:\?[^#]*)?$'),route)

async def watch_from_above(page,touch):
    # This picture needs a real, slowly moving soul above the cat, not a pixel-
    # exact waypoint. The old driver's predicted 12px release can asymptotically
    # stop at 12.0000000003px; accept this explicit visible observation region.
    async def arrived():
        a=await page.evaluate('window.__qaRead()')
        return a['form']=='soul' and 140<=a['x']<=185 and 280<=a['y']<=320 and abs(a['vx'])<40 and abs(a['vy'])<40
    await api.drive_to(page,165,300,touch=touch,until=arrived,limit=4)
    # drive_to releases the held native control in finally. Let the original
    # inertial motion settle before a second observation after that release.
    await page.wait_for_timeout(220)
    assert await arrived(),'soul must remain visibly above its unchanged body/cat'

async def main(args):
    for url in [args.url,args.baseline]:assert urlparse(url).hostname in ['127.0.0.1','localhost'],'This focused runner is local-only'
    out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
    report={'status':'running','version':'32.0.0','study':'v33 companion, not a release','source':'fresh local browser contexts with only read-only app probes; original keyboard/touch/UI controls',
            'baselineCommit':'d113b48f7964dbc3f67ce0e0fee40a39519979d1','baselineURL':args.baseline,'afterURL':args.url,'cases':[],
            'notCovered':['complete chapter/story route','public HTTPS','physical phone','Safari','device performance','all optional activities']}
    report['sourceFiles']={name:sha((HERE.parent/name).read_bytes()) for name in ['dist/dream-companion-art.js','dist/dream-engine.js','dist/dream-engine-base.js','dist/index.html','dist/dream.html','dist/survivor.html','scripts/browser_companion_v33.py']}
    report['visibilityBounds']='Conservative world offsets: left -32 (tail control points -28 minus 3.35 stroke), right +30, top -62, bottom +9; screen position includes the original camera, scale and viewport offset.'
    started=time.monotonic()
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,args=['--no-sandbox'])
        report['chromiumVersion']=browser.version
        try:
            for width,height,touch in [(1280,800,False),(390,844,True),(320,680,True)]:
                record={'viewport':{'width':width,'height':height},'input':'CDP simulated touch' if touch else 'keyboard','status':'running','captures':[]};report['cases'].append(record)
                folder=out/str(width);folder.mkdir(exist_ok=True)
                before=await browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1,has_touch=touch,is_mobile=touch)
                bpage=await before.new_page();await instrument(bpage,False);await bpage.goto(args.baseline,wait_until='networkidle');await bpage.wait_for_timeout(1200)
                record['baselineSnapshot']=await bpage.evaluate('window.__qaRead()');baseline_file=folder/'before-neutral.png';await bpage.screenshot(path=str(baseline_file),full_page=True)
                record['baselinePicture']={'file':baseline_file.name,'sha256':sha(baseline_file.read_bytes()),'scope':'separate fresh frozen-v32 context, not a same-frame pixel A/B'};await before.close()
                context=await browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1,has_touch=touch,is_mobile=touch)
                page=await context.new_page();errors=[];http=[];failed=[]
                page.on('pageerror',lambda e:errors.append(str(e)));page.on('response',lambda r:http.append({'url':r.url,'status':r.status}) if r.status>=400 else None);page.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}))
                try:
                    await instrument(page,True);await page.goto(args.url,wait_until='networkidle');await page.wait_for_timeout(1200)
                    await page.wait_for_function('()=>window.__qaCompanionRead()?.painted===true',timeout=5000)
                    initial=await capture(page,folder,'after-neutral',record['captures'])
                    assert initial['memories']==[False,False,False] and initial['deaths']==0
                    assert initial['body']=={k:record['baselineSnapshot']['body'][k] for k in ['x','y']},'fresh baseline and new body positions differ'
                    await page.locator('#dream-canvas').focus();await api.toggle(page,touch)
                    async def ticket():return (await page.evaluate('window.__qaRead()'))['memoryFlags'][0]
                    await api.drive_to(page,270,420,touch=touch,until=ticket,limit=4);assert await ticket()
                    await watch_from_above(page,touch);await capture(page,folder,'watching-up',record['captures'])
                    await page.evaluate(OBSERVER,{'tag':'return-pause','images':True});await api.toggle(page,touch);await page.wait_for_timeout(100)
                    if touch:await page.locator('[data-shell-action="pause"]').tap()
                    else:await page.keyboard.press('Escape')
                    await page.locator('#pause-dialog[open]').wait_for(timeout=1500)
                    paused=validate(await page.evaluate('window.__qaCompanionRead()'));assert paused['state']=='paused' and paused['cap']['phase']=='returning'
                    image_a=await page.locator('#dream-canvas').evaluate('c=>c.toDataURL("image/png")');await page.wait_for_timeout(280)
                    still=validate(await page.evaluate('window.__qaCompanionRead()'));image_b=await page.locator('#dream-canvas').evaluate('c=>c.toDataURL("image/png")')
                    assert all(paused[k]==still[k] for k in ['time','visualTime','cap','view','body','companion']) and image_a==image_b,'pause did not freeze the existing view and Canvas'
                    record['pause']={'snapshot':paused,'after':still,'canvasBytesEqual':True}
                    if touch:await page.locator('#stage-resume').tap()
                    else:await page.locator('#stage-resume').click()
                    await page.wait_for_timeout(900);record['return']=await take_observer(page,folder,'return')
                    assert all(key in record['return']['latches'] for key in ['returning','arrival-blink','closed'])
                    await capture(page,folder,'returned',record['captures'])
                    await api.toggle(page,touch);await page.wait_for_timeout(700);await watch_from_above(page,touch)
                    await page.evaluate(OBSERVER,{'tag':'E-reversal','images':False});await api.toggle(page,touch)
                    await page.wait_for_function('()=>window.__qaCompanionRead()?.view.returnBlink>.3',timeout=2500);await api.toggle(page,touch)
                    await page.wait_for_timeout(70);reopened=validate(await page.evaluate('window.__qaCompanionRead()'));assert reopened['form']=='soul' and reopened['cap']['phase']=='opening' and reopened['cap']['returnFrom'] is None and reopened['view']['returnBlink']==0
                    record['reversal']=await take_observer(page,folder,'reversal');record['reversal']['after']=reopened
                    await api.toggle(page,touch);await api.set_reduced_motion_from_ui(page,True);await api.toggle(page,touch);await page.wait_for_timeout(150)
                    reduced=await capture(page,folder,'reduced-open',record['captures']);assert reduced['reducedMotion'] and reduced['cap']['phase']=='open'
                    await api.toggle(page,touch);settled=validate(await page.evaluate('window.__qaCompanionRead()'));assert settled['cap']['phase']=='closed' and settled['view']['returnBlink']==0
                    record['reducedRecall']=settled
                    final=validate(await page.evaluate('window.__qaCompanionRead()'));assert final['runId']==initial['runId'] and final['body']==initial['body'] and final['memories']==[True,False,False] and final['lamps']==[False,False]
                    record['storedSave']=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1'))");record['storedCapBook']=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.capbook.v1'))")
                    assert not any(c['completed'] or c['runs'] for c in record['storedSave']['chapters'])
                    assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                    await page.wait_for_load_state('networkidle');assert not errors and not http and not failed,{'page':errors,'http':http,'request':failed}
                    record['status']='passed'
                except Exception as error:
                    record['status']='failed';record['failure']=str(error);report['status']='failed';record['failureSnapshot']=await page.evaluate('window.__qaCompanionRead?.()');await page.screenshot(path=str(folder/'failure.png'),full_page=True);raise
                finally:
                    record.update(pageErrors=errors,httpErrors=http,requestFailures=failed);save_json(out/'report.json',report);await context.close()
            report['status']='passed'
        finally:
            report['elapsedSeconds']=time.monotonic()-started;save_json(out/'report.json',report);await browser.close()
    print(json.dumps({'status':report['status'],'cases':[{'viewport':c['viewport'],'status':c['status'],'input':c['input']} for c in report['cases']],'elapsedSeconds':report['elapsedSeconds']},ensure_ascii=False))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:9333/');parser.add_argument('--baseline',default='http://127.0.0.1:9334/');parser.add_argument('--output',default='/tmp/v33-companion-browser');asyncio.run(main(parser.parse_args()))
