"""Local bounded v34 framing study using normal keyboard / simulated touch.

The probe only reads the app and its last painted framing bounds. It never
assigns game coordinates, clocks, saves, methods, camera or drawing routines.
"""
import argparse, asyncio, base64, hashlib, importlib.util, json, re, time
from pathlib import Path
HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('original_input_driver',HERE/'browser-smoke.py')
api=importlib.util.module_from_spec(spec);spec.loader.exec_module(api)

PROBE="""
window.__qaFramingRead=()=>{
  if(!game?.body)return null;
  const t=game.options.reducedMotion?0:game.visualTime,p=game.getCharacterPresentation(t),shown=game.getSoulPresentation(p);
  const canvas=game.canvas,r=canvas.getBoundingClientRect(),view=game.capFramingView;
  return {version:document.querySelector('meta[name="application-version"]').content,
    observedAt:performance.now(),time:game.time,visualTime:game.visualTime,state:game.state,form:game.form,
    chapterIndex:game.chapterIndex,mode:game.mode,runId:game.runId,deaths:game.deaths,energy:game.energy,
    body:{...game.body},soul:{...game.soul},companion:{...game.companion},shown,rig:p.rig,
    gripError:Math.hypot(p.arms.left.world.x-p.rig.gripWorld.x,p.arms.left.world.y-p.rig.gripWorld.y),
    cap:{...game.cap},outfit:game.getOutfitId(),camera:game.camera,scale:game.scale,viewWidth:game.viewWidth,
    reducedMotion:game.options.reducedMotion,activityFramed:game.activityFramed,activity:game.capActivity?.getSnapshot(),activityView:game.capActivity?.getView(),
    framing:view,renderViewport:game.capFramingViewport,followBudget:game.capCameraFollow,renderScopeReleased:game.companionRenderScope===null,
    viewport:{width:innerWidth,height:innerHeight},canvas:{width:canvas.width,height:canvas.height,left:r.left,top:r.top,right:r.right,bottom:r.bottom},
    projected:view?Object.fromEntries(Object.entries(view.bounds).filter(([,b])=>b&&typeof b==='object').map(([k,b])=>[k,{left:(b.left-game.camera)*game.scale,right:(b.right-game.camera)*game.scale}])):null,
    memories:game.memories.map(m=>m.collected),lamps:game.lanterns.map(l=>l.lit),firstTicket:{...game.firstTicket},
    backdropCamera:game.getSceneBackdropView().cameraX};
};
window.__qaFramingWatchStart=(label)=>{
  if(window.__qaFramingWatch)throw Error('one observer at a time');
  const samples=[],latches={},pictures={},events=[];let active=true,raf=0;
  const capture=(name,s)=>{if(!latches[name]){latches[name]=s;pictures[name]=game.canvas.toDataURL('image/png');}};
  const observe=e=>{if(e.isTrusted&&(e.type==='keydown'||e.target?.closest?.('button')))events.push({type:e.type,code:e.code||null,target:e.target?.id||e.target?.dataset?.direction||null,isTrusted:e.isTrusted,repeat:e.repeat||false,time:performance.now()});};
  function tick(){if(!active)return;const s=window.__qaFramingRead();if(samples.length<900)samples.push(s);
    if(s.cap.phase==='opening'&&s.cap.openness>.02&&s.cap.openness<.3)capture('opening-early',s);
    if(s.cap.phase==='opening'&&s.cap.openness>=.3&&s.cap.openness<.8)capture('opening-middle',s);
    if(s.cap.phase==='open')capture('open',s);
    if(s.cap.phase==='returning'&&s.shown?.pose==='return')capture('returning',s);
    if(s.cap.phase==='closed')capture('closed',s);
    if(s.activityFramed)capture('activity',s);raf=requestAnimationFrame(tick);
  }
  for(const name of ['keydown','pointerdown','click'])window.addEventListener(name,observe,true);
  const timer=setTimeout(()=>stop(),15000);
  function stop(){if(active){active=false;cancelAnimationFrame(raf);clearTimeout(timer);for(const name of ['keydown','pointerdown','click'])window.removeEventListener(name,observe,true);}return {label,samples,latches,pictures,events};}
  window.__qaFramingWatch={stop};raf=requestAnimationFrame(tick);
};
window.__qaFramingWatchStop=()=>{const result=window.__qaFramingWatch.stop();delete window.__qaFramingWatch;return result;};
window.__qaFramingResizeStart=()=>{
  window.__qaFramingResizeResult=null;
  window.addEventListener('resize',()=>{requestAnimationFrame(()=>{
    const poll=()=>{const s=window.__qaFramingRead();if(s.renderViewport?.width===s.canvas.width){window.__qaFramingResizeResult={snapshot:s,png:game.canvas.toDataURL('image/png')};}else requestAnimationFrame(poll);};poll();
  });},{once:true});
};
"""

def sha(data):return hashlib.sha256(data).hexdigest()
def save(path,value):path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
def facts(s):return {k:s[k] for k in ['time','visualTime','state','form','body','soul','companion','cap','energy','deaths','memories','lamps','firstTicket']}
def validate(s):
    assert s['version']=='33.0.0' and s['mode']=='story' and s['chapterIndex']==0 and s['deaths']==0
    assert s['renderScopeReleased'] and s['followBudget'] is None
    assert s['backdropCamera']==s['camera']
    if s['cap']['openness']>.001:assert s['gripError']<1e-8
    return s
def near_clear(s):
    assert s['framing'] and s['framing']['active'] and not s['activityFramed'],s
    for part in ['cap','hat','hands']:
        if s['projected'].get(part):
            assert s['projected'][part]['left']>=7.5,(part,s['projected'],s['camera'])
            assert s['projected'][part]['right']<=s['canvas']['width']-7.5,(part,s['projected'])

async def instrument(page):
    async def route(r):
        response=await r.fetch();await r.fulfill(response=response,body=(await response.text())+api.PROBE+PROBE)
    await page.route(re.compile(r'/dream-app\.js(?:\?[^#]*)?$'),route)

async def picture(page,folder,name):
    # Same-task Canvas capture and readonly state. A separate full page is useful
    # for layout review, but is explicitly not advertised as that same frame.
    capture=await page.evaluate('()=>({snapshot:window.__qaFramingRead(),png:gameCanvas()})'.replace('gameCanvas()','document.querySelector("#dream-canvas").toDataURL("image/png")'))
    s=validate(capture['snapshot']);data=base64.b64decode(capture['png'].split(',')[1]);p=folder/(name+'-canvas.png');p.write_bytes(data)
    await page.screenshot(path=str(folder/(name+'-page.png')),full_page=True)
    return {'snapshot':s,'canvas':{'file':p.name,'sha256':sha(data)},'fullPage':name+'-page.png','scope':'Canvas and read in one task; full page is subsequent'}

async def watch_stop(page,folder,name):
    r=await page.evaluate('window.__qaFramingWatchStop()');pictures=r.pop('pictures');r['pictures']=[]
    for key,png in pictures.items():
        data=base64.b64decode(png.split(',')[1]);p=folder/(name+'-'+key+'.png');p.write_bytes(data);r['pictures'].append({'name':key,'file':p.name,'sha256':sha(data)})
    for s in r['samples']:validate(s)
    assert all(e['isTrusted'] for e in r['events'])
    return r

async def steer(page,x,y,touch,threshold=20):
    async def arrived():
        a=await page.evaluate('window.__qaRead()')
        return abs(a['x']-x)<threshold and (y is None or abs(a['y']-y)<threshold) and abs(a['vx'])<45 and (y is None or abs(a['vy'])<45)
    await api.drive_to(page,x,y,touch=touch,until=arrived,limit=5)

async def resize_paused(page,folder,width,height,name,expected):
    await page.evaluate('window.__qaFramingResizeStart()');await page.set_viewport_size({'width':width,'height':height})
    await page.wait_for_function('()=>window.__qaFramingResizeResult!==null',timeout=3000)
    result=await page.evaluate('window.__qaFramingResizeResult');s=validate(result['snapshot']);assert facts(s)==expected
    near_clear(s);data=base64.b64decode(result.pop('png').split(',')[1]);path=folder/(name+'.png');path.write_bytes(data)
    result['picture']={'file':path.name,'sha256':sha(data)}
    await page.wait_for_timeout(200);after=validate(await page.evaluate('window.__qaFramingRead()'));assert facts(after)==expected and after['camera']==s['camera']
    return result

async def main(args):
    from playwright.async_api import async_playwright
    out=Path(args.output);out.mkdir(parents=True,exist_ok=True);root=HERE.parent
    sources={str(p.relative_to(root)):sha(p.read_bytes()) for p in sorted((root/'dist').glob('*.js'))}
    report={'schema':'cap-framing-v34-prestudy','version':'33.0.0','scope':'local candidate study, Chromium and simulated touch, not deployed v34 or physical phone','status':'running','sourceFiles':sources,'cases':[]};started=time.monotonic()
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,args=['--no-sandbox'])
        try:
            for width,height,touch in [(1280,800,False),(390,844,True),(320,680,True)]:
                folder=out/str(width);folder.mkdir(exist_ok=True);record={'viewport':{'width':width,'height':height},'input':'CDP simulated touch' if touch else 'keyboard','status':'running'};report['cases'].append(record)
                context=await browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1,has_touch=touch,is_mobile=touch)
                page=await context.new_page();errors=[];http=[];failed=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('response',lambda r:http.append(r.url) if r.status>=400 else None);page.on('requestfailed',lambda r:failed.append(r.url));page.set_default_timeout(5000)
                try:
                    await instrument(page);await page.goto(args.url,wait_until='networkidle');await page.wait_for_timeout(1200);await page.locator('#dream-canvas').focus()
                    initial=validate(await page.evaluate('window.__qaFramingRead()'));record['initial']=initial
                    await page.evaluate('window.__qaFramingWatchStart("open")');await api.toggle(page,touch);await page.wait_for_timeout(700);await steer(page,258,422,touch);await page.wait_for_timeout(700)
                    record['near']=await picture(page,folder,'near-open');record['opening']=await watch_stop(page,folder,'opening')
                    assert record['near']['snapshot']['body']['x']==105 and record['near']['snapshot']['memories']==[True,False,False]
                    assert all(k in record['opening']['latches'] for k in ['opening-early','opening-middle','open'])
                    if touch:near_clear(record['near']['snapshot'])
                    else:assert record['near']['snapshot']['framing'] is None
                    if not touch:
                        await api.toggle(page,False);await page.wait_for_timeout(850);record['desktopReturn']=await picture(page,folder,'desktop-return')
                        record['status']='passed';continue
                    await page.evaluate('window.__qaFramingWatchStart("far-and-near")');await steer(page,480,422,touch);await page.wait_for_timeout(450)
                    far=validate(await page.evaluate('window.__qaFramingRead()'));assert not far['framing']['active'];assert far['camera']>record['near']['snapshot']['camera']+70;record['far']=far
                    await steer(page,258,422,touch);await page.wait_for_timeout(1000);record['backNear']=await picture(page,folder,'back-near');near_clear(record['backNear']['snapshot']);record['travel']=await watch_stop(page,folder,'travel')
                    await page.evaluate('window.__qaFramingWatchStart("return-pause")');await api.toggle(page,touch);await page.wait_for_timeout(95);await page.locator('[data-shell-action="pause"]').tap();await page.locator('#pause-dialog[open]').wait_for()
                    paused=validate(await page.evaluate('window.__qaFramingRead()'));assert paused['state']=='paused' and paused['cap']['phase']=='returning';expected=facts(paused)
                    png=await page.locator('#dream-canvas').evaluate('c=>c.toDataURL()');await page.wait_for_timeout(220);still=validate(await page.evaluate('window.__qaFramingRead()'));assert facts(still)==expected and still['camera']==paused['camera'];assert png==await page.locator('#dream-canvas').evaluate('c=>c.toDataURL()')
                    record['paused']={'snapshot':paused,'sameCanvasBytes':True}
                    other=(320,680) if width==390 else (390,844)
                    record['pausedResize']=await resize_paused(page,folder,*other,'paused-resize-first',expected)
                    record['pausedResizeBack']=await resize_paused(page,folder,width,height,'paused-resize-back',expected)
                    await page.locator('#stage-resume').tap();await page.wait_for_timeout(900);record['return']=await watch_stop(page,folder,'return');assert 'returning' in record['return']['latches'] and 'closed' in record['return']['latches']
                    await api.toggle(page,touch);await page.wait_for_timeout(700);await page.evaluate('window.__qaFramingWatchStart("E-reversal")');await api.toggle(page,touch);await page.wait_for_timeout(120);await api.toggle(page,touch);await page.wait_for_timeout(80)
                    reversal=validate(await page.evaluate('window.__qaFramingRead()'));assert reversal['cap']['phase']=='opening' and reversal['cap']['returnFrom'] is None;record['reversalSnapshot']=reversal;await page.wait_for_timeout(700);record['reversal']=await watch_stop(page,folder,'reversal')
                    await api.toggle(page,touch);await page.wait_for_timeout(800);await steer(page,200,None,touch);await api.hold(page,'left',seconds=.36,touch=touch);await page.wait_for_timeout(250)
                    left=validate(await page.evaluate('window.__qaFramingRead()'));assert left['body']['face']==-1;await api.toggle(page,touch);await page.wait_for_timeout(750);record['leftFacing']=await picture(page,folder,'left-facing-open');near_clear(record['leftFacing']['snapshot'])
                    await api.toggle(page,touch);await page.wait_for_timeout(800);await api.set_reduced_motion_from_ui(page,True);await api.toggle(page,touch);await page.wait_for_timeout(200);record['reduced']=await picture(page,folder,'reduced-open');assert record['reduced']['snapshot']['reducedMotion'];near_clear(record['reduced']['snapshot'])
                    await api.toggle(page,touch);await api.set_reduced_motion_from_ui(page,False)
                    await steer(page,320,None,touch);await api.toggle(page,touch);await page.wait_for_timeout(800)
                    activity=validate(await page.evaluate('window.__qaFramingRead()'));assert activity['activityFramed'] and activity['framing'] is None;record['activity']=await picture(page,folder,'activity-priority')
                    activity_camera=activity['camera'];await api.hold(page,'right',seconds=.2,touch=touch);await page.wait_for_timeout(150);activity_after=validate(await page.evaluate('window.__qaFramingRead()'));assert activity_after['camera']==activity_camera and activity_after['activityFramed'];record['activityAfterTouch']=activity_after
                    await api.toggle(page,touch);await page.wait_for_timeout(800);final=validate(await page.evaluate('window.__qaFramingRead()'));assert not final['activityFramed'] and final['cap']['phase']=='closed';record['final']=final
                    record['save']=await page.evaluate("JSON.parse(localStorage.getItem('tougaigu.dream.v1'))");assert not any(c['completed'] or c['runs'] for c in record['save']['chapters']);assert final['lamps']==[False,False] and final['memories']==[True,False,False]
                    assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not errors and not http and not failed
                    record['status']='passed'
                except Exception as e:
                    record['status']='failed';record['error']=str(e);report['status']='failed'
                    try:record['failureSnapshot']=await page.evaluate('window.__qaFramingRead?.()');await page.screenshot(path=str(folder/'failure.png'),full_page=True)
                    except Exception as ee:record['failureEvidenceError']=str(ee)
                    raise
                finally:
                    record.update(pageErrors=errors,httpErrors=http,requestFailures=failed);save(out/'report.json',report);await context.close()
            assert sources=={str(p.relative_to(root)):sha(p.read_bytes()) for p in sorted((root/'dist').glob('*.js'))};report['status']='passed'
        finally:
            report['elapsedSeconds']=time.monotonic()-started;save(out/'report.json',report);await browser.close()
    print(json.dumps({'status':report['status'],'elapsedSeconds':report['elapsedSeconds'],'cases':[{'viewport':c['viewport'],'status':c['status']} for c in report['cases']]},ensure_ascii=False))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--url',required=True);parser.add_argument('--output',required=True);asyncio.run(main(parser.parse_args()))
