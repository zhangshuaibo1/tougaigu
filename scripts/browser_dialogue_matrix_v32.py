"""Bounded, independent-context layout checks, after every existing route.

Gameplay uses the original UI and input driver. The sole presentation mutation
is a synchronous, finally-restored old-CSS ablation in a new context: it is NOT
an execution of the old full release. No game state, saves or clocks are set.
"""
import hashlib
import json
import re
from pathlib import Path

from browser_dialogue_v32 import DIALOGUE_APP_PROBE, capture_dialogue


BASE_COMMIT = '7ba7c5e00a6a32032e5becf5131a527322d03ac3'
CASES = [
    dict(label='900x800', width=900, height=800, media='no-preference', game_reduce=False),
    dict(label='899x800', width=899, height=800, media='no-preference', game_reduce=False),
    dict(label='1024x640', width=1024, height=640, media='no-preference', game_reduce=False),
    dict(label='900x520', width=900, height=520, media='no-preference', game_reduce=False),
    dict(label='1280x800-os-reduce', width=1280, height=800, media='reduce', game_reduce=False),
    dict(label='1280x800-game-reduce', width=1280, height=800, media='no-preference', game_reduce=True),
]


SURFACE_PROBE = """
window.__qaDialogueSurfaceRead=()=>{
  const rect=r=>({left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height});
  const transforms=el=>{
    const result=[];
    for(;el;el=el.parentElement){const s=getComputedStyle(el);result.push({id:el.id||el.tagName,
      transform:s.transform,translate:s.translate,rotate:s.rotate,scale:s.scale});}
    return result;
  };
  const read=el=>{
    const r=el.getBoundingClientRect(),s=getComputedStyle(el),hit=document.elementFromPoint((r.left+r.right)/2,(r.top+r.bottom)/2);
    return {rect:rect(r),visible:!!el.getClientRects().length&&r.width>0&&r.height>0&&s.display!=='none'&&s.visibility==='visible'&&Number(s.opacity)>0,
      transform:s.transform,centerHits:hit===el||el.contains(hit),isButton:el.tagName==='BUTTON'};
  };
  const canvas=document.querySelector('#dream-canvas'),s=getComputedStyle(canvas);
  const controls=[...document.querySelectorAll('#stage-toggle,#stage-jump,#stage-interact,#stage-touch-move,#stage-touch-move>button')]
    .map(el=>({...read(el),id:el.id||'direction-'+el.dataset.direction}));
  return {viewport:{width:innerWidth,height:innerHeight},dpr:devicePixelRatio,
    version:document.querySelector('meta[name="application-version"]')?.content??null,
    communicationsDisplay:getComputedStyle(document.querySelector('.stage-communications')).display,
    horizontalOverflow:document.documentElement.scrollWidth>innerWidth,
    openDialogs:[...document.querySelectorAll('dialog[open]')].map(el=>el.id),
    canvas:{rect:rect(canvas.getBoundingClientRect()),width:canvas.width,height:canvas.height,
      cssWidth:parseFloat(s.width),cssHeight:parseFloat(s.height),transforms:transforms(canvas)},controls};
};
"""


# No await or animation opportunity occurs inside this evaluation. Layout is
# flushed by getBoundingClientRect; the actual buffer is also read, not inferred.
# Replacement style nodes occupy the original link positions in the cascade.
CSS_ABLATION = """({styles})=>{
  const replacements=[];let neutral=null;
  const before=window.__qaDialogueSurfaceRead();let ablated;
  try{
    for(const entry of styles){
      const links=[...document.querySelectorAll('link[rel="stylesheet"]')]
        .filter(link=>new URL(link.href).pathname.endsWith('/'+entry.path));
      if(links.length!==1||!links[0].sheet||links[0].sheet.disabled)throw new Error('ambiguous or disabled CSS baseline sheet: '+entry.path);
      const link=links[0],sheet=link.sheet,style=document.createElement('style');
      replacements.push({sheet,style,disabled:sheet.disabled});
      style.textContent=entry.content;link.after(style);sheet.disabled=true;
    }
    neutral=document.createElement('style');
    neutral.textContent='.stage-communications{display:contents}';document.head.append(neutral);
    ablated=window.__qaDialogueSurfaceRead();
  }finally{
    for(const item of replacements){item.sheet.disabled=item.disabled;item.style.remove();}
    neutral?.remove();
  }
  const restored=window.__qaDialogueSurfaceRead();
  return {before,ablated,restored};
}"""


def load_baseline(path=None):
    path = path or Path(__file__).resolve().parents[1]/'tests/fixtures/v32-layout-v31-css.json'
    source = json.loads(Path(path).read_text())
    assert source['commit'] == BASE_COMMIT, 'unexpected CSS ablation source'
    assert [entry['path'] for entry in source['styles']] == ['dream-play.css', 'cap-play.css'], 'unexpected CSS ablation scope'
    for entry in source['styles']:
        assert hashlib.sha256(entry['content'].encode()).hexdigest() == entry['sha256'], 'CSS baseline digest mismatch'
    return source


def validate_surface(snapshot, expected_grid):
    """Viewport and input checks are current-state checks, not baseline proof."""
    assert snapshot['communicationsDisplay'] == ('grid' if expected_grid else 'contents'), 'wrong desktop breakpoint treatment'
    assert not snapshot['horizontalOverflow'] and not snapshot['openDialogs'], 'independent stage obscured or overflowing'
    width, height = snapshot['viewport']['width'], snapshot['viewport']['height']
    for control in snapshot['controls']:
        if not control['visible']:
            continue
        r = control['rect']
        assert r['left'] >= -1 and r['top'] >= -1 and r['right'] <= width+1 and r['bottom'] <= height+1, control['id']+' outside viewport'
        assert not control['isButton'] or control['centerHits'], control['id']+' has an obscured input center'
    return {'status': 'passed', 'scope': 'Current breakpoint selection and visible input centers; no old/new equivalence is inferred'}


def compare_surfaces(before, after, tolerance=.5):
    """Pair real measurements, including the 899px exclusion side."""
    assert before['viewport'] == after['viewport'] and before['dpr'] == after['dpr'], 'paired view or DPR differs'
    def same_rect(name, a, b):
        for key in ['left', 'top', 'right', 'bottom', 'width', 'height']:
            assert isinstance(a[key], (int, float)) and isinstance(b[key], (int, float)), 'missing measured geometry'
            assert abs(a[key]-b[key]) <= tolerance, name+' changed '+key
    same_rect('Canvas', before['canvas']['rect'], after['canvas']['rect'])
    for key in ['width', 'height', 'cssWidth', 'cssHeight', 'transforms']:
        assert before['canvas'][key] == after['canvas'][key], 'Canvas changed '+key
    a = {c['id']: c for c in before['controls']}; b = {c['id']: c for c in after['controls']}
    assert a.keys() == b.keys(), 'paired control set changed'
    for key in a:
        assert a[key]['visible'] == b[key]['visible'] and a[key]['transform'] == b[key]['transform'], key+' presentation changed'
        same_rect(key, a[key]['rect'], b[key]['rect'])
    return {'status': 'matched', 'toleranceCssPx': tolerance, 'checked': ['Canvas', *a.keys()],
            'scope': 'Only these paired actual Canvas/buffer/control measurements; not a previous complete release or all gameplay states'}


async def exercise_dialogue_matrix(browser, args, output, api):
    """Run six fresh contexts; use no state or timing from the main route."""
    output = Path(output)/'dialogue-matrix'; output.mkdir(parents=True, exist_ok=True)
    source = load_baseline()
    report = {'schema': 'dialogue-boundary-v32-1', 'status': 'running', 'cases': [],
              'scope': 'Independent real-UI first-station opening/ticket only; original route inputs, waits and gates remain unchanged',
              'ablation': {'kind': 'same-current-DOM-original-v31-CSS', 'sourceCommit': source['commit'],
                           'styles': [{k: entry[k] for k in ['path', 'sha256']} for entry in source['styles']],
                           'neutralWrapper': '.stage-communications{display:contents}',
                           'notOldCompleteRelease': True, 'synchronousFinallyRestored': True},
              'notCovered': ['longest natural theatre dialogue', 'large font preference', 'natural speech plus announcement coexistence',
                             'high platform poses', 'excluded-mode layout comparison', 'physical devices']}
    report_path = output/'report.json'
    for case in CASES:
        record = {'case': case, 'status': 'running', 'dialogues': []}; report['cases'].append(record)
        context = await browser.new_context(viewport={'width': case['width'], 'height': case['height']},
                                            device_scale_factor=1, has_touch=False, is_mobile=False, reduced_motion=case['media'])
        page = await context.new_page(); page.set_default_timeout(5000)
        errors=[]; http_errors=[]; failed=[]; instrumented=[]
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('response', lambda response: http_errors.append({'url': response.url, 'status': response.status}) if response.status >= 400 else None)
        page.on('requestfailed', lambda request: failed.append({'url': request.url, 'failure': request.failure}))
        async def instrument(route):
            response = await route.fetch()
            await route.fulfill(response=response, body=(await response.text())+api.PROBE+DIALOGUE_APP_PROBE+SURFACE_PROBE)
            instrumented.append(route.request.url)
        await page.route(re.compile(r'/dream-app\.js(?:\?[^#]*)?$'), instrument)
        try:
            await page.goto(args.url, wait_until='networkidle', timeout=45000)
            await page.wait_for_function("typeof window.__qaDialogueSurfaceRead==='function'")
            assert instrumented, 'independent app probe not installed'
            version=await page.locator('meta[name="application-version"]').get_attribute('content')
            assert not args.version or version == args.version, 'independent page version mismatch'
            await page.locator('#stage-chapter-title').filter(has_text='苔灯站台').wait_for()
            await page.wait_for_timeout(500)
            initial=await page.evaluate('window.__qaRead()')
            assert initial['chapterIndex'] == 0 and initial['form'] == 'body' and initial['deaths'] == 0, 'independent first station was not fresh'
            assert initial['memories'] == 0 and initial['seals'] == 0, 'independent context contained progress'
            if case['game_reduce']:
                await api.set_reduced_motion_from_ui(page, True)
            actual=await page.evaluate('window.__qaRead()')
            assert actual['reducedMotion'] == (case['game_reduce'] or case['media'] == 'reduce'), 'actual reduced-motion preference mismatch'
            pair=await page.evaluate(CSS_ABLATION, {'styles': source['styles']})
            record['surfacePair']=pair
            record['breakpoint']=validate_surface(pair['before'], case['width'] >= 900)
            record['cssAblationComparison']=compare_surfaces(pair['ablated'], pair['before'])
            record['restorationComparison']=compare_surfaces(pair['before'], pair['restored'])
            assert pair['before']['communicationsDisplay'] == pair['restored']['communicationsDisplay'], 'CSS ablation did not restore layout'
            record['canvasComparisonIsOldCompleteRelease']=False
            # First opening is actual authored dialogue, never text injection.
            await api.toggle(page, False)
            await page.wait_for_timeout(200)
            await page.wait_for_function("()=>{const p=document.querySelector('#cap-bubble-portrait');return p?.complete&&p.naturalWidth>0;}", timeout=1500)
            opening=await page.evaluate('window.__qaDialogueRead()')
            record['dialogues'].append(capture_dialogue(output, case['label']+'-opening', opening, require_bubble=True,
                                                       screenshot=case['label']+'-opening.png'))
            await page.screenshot(path=str(output/(case['label']+'-opening.png')), full_page=True)
            async def ticket():
                return bool(re.match(r'1\s*/', await page.locator('#stage-memories').inner_text()))
            await api.drive_to(page, 270, 420, until=ticket, limit=4)
            await page.wait_for_timeout(120)
            assert await ticket(), 'independent real flight did not collect ticket'
            await page.wait_for_function("()=>{const p=document.querySelector('#cap-bubble-portrait');return p?.complete&&p.naturalWidth>0;}", timeout=1500)
            held=await page.evaluate('window.__qaRead()')
            assert held['deaths'] == 0 and held['runId'] == initial['runId'] and held['bodyIdentity'] == initial['bodyIdentity'], 'independent first-station route reset or died'
            assert held['firstTicket']['phase'] == 'held' and held['form'] == 'soul', 'independent ticket did not remain naturally held'
            snapshot=await page.evaluate('window.__qaDialogueRead()')
            record['dialogues'].append(capture_dialogue(output, case['label']+'-ticket', snapshot, require_bubble=True,
                                                       screenshot=case['label']+'-ticket.png'))
            await page.screenshot(path=str(output/(case['label']+'-ticket.png')), full_page=True)
            record['ticketSurface']=await page.evaluate('window.__qaDialogueSurfaceRead()')
            validate_surface(record['ticketSurface'], case['width'] >= 900)
            await page.wait_for_load_state('networkidle')
            assert not errors and not http_errors and not failed, {'page': errors, 'http': http_errors, 'network': failed}
            record['status']='passed'; record['version']=version
        except Exception as error:
            record['status']='failed'; record['failure']=str(error); report['status']='failed'
            try:
                await page.screenshot(path=str(output/(case['label']+'-failure.png')), full_page=True, timeout=5000)
            except Exception as screenshot_error:
                record['failureScreenshotError']=str(screenshot_error)
            raise
        finally:
            record['pageErrors']=errors; record['httpErrors']=http_errors; record['requestFailures']=failed
            record['instrumentedAppURLs']=instrumented
            report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
            await context.close()
    report['status']='passed'
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
    return report
