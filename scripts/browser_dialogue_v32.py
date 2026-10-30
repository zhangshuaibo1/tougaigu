"""One-shot, read-only layout evidence at existing safe story-route checkpoints.

No Playwright dependency, input, wait, frame loop, DOM mutation or game update.
The JS is appended to the already instrumented app module, where `game` and the
production rig/motion helpers are in scope. Python validates captured evidence.
"""
import json
import math
import re
from pathlib import Path


DIALOGUE_APP_PROBE = """
window.__qaDialogueRead=()=>{
  const viewport={width:innerWidth,height:innerHeight},classes=[...document.body.classList];
  const excluded=['festival-session','lost-inspecting','moon-playing'].filter(name=>classes.includes(name));
  const eligible=innerWidth>=900&&classes.includes('dream-play')&&!excluded.length&&game?.mode==='story';
  if(!eligible)return {eligible:false,viewport,mode:game?.mode??null,excluded,
    reason:innerWidth<900?'below-desktop-breakpoint':'outside-ordinary-story'};
  const rect=r=>({left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height});
  const read=el=>{
    if(!el)return null;
    const style=getComputedStyle(el),box=el.getBoundingClientRect(),glyphs=[];
    const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let node,truncated=false;
    while(node=walker.nextNode()){
      if(!node.textContent.trim())continue;
      const range=document.createRange();range.selectNodeContents(node);
      for(const r of range.getClientRects()){
        if(!r.width||!r.height)continue;
        if(glyphs.length>=256){truncated=true;break;}
        glyphs.push(rect(r));
      }
      if(truncated)break;
    }
    const clips=[];let ancestor=el;
    for(let depth=0;ancestor&&depth<32;depth++,ancestor=ancestor.parentElement){
      const s=getComputedStyle(ancestor),r=ancestor.getBoundingClientRect();
      const x=['hidden','clip','scroll','auto'].includes(s.overflowX),y=['hidden','clip','scroll','auto'].includes(s.overflowY);
      if(x||y)clips.push({id:ancestor.id||ancestor.tagName,x,y,rect:rect(r)});
    }
    return {rect:rect(box),text:el.textContent.trim(),visible:!!el.getClientRects().length&&box.width>0&&box.height>0&&style.display!=='none'&&style.visibility==='visible'&&Number(style.opacity)>0,
      clientWidth:el.clientWidth,clientHeight:el.clientHeight,scrollWidth:el.scrollWidth,scrollHeight:el.scrollHeight,
      glyphRects:glyphs,glyphsTruncated:truncated,clipAncestors:clips,
      display:style.display,transform:style.transform,pointerEvents:style.pointerEvents,
      whiteSpace:style.whiteSpace,textOverflow:style.textOverflow,lineClamp:style.webkitLineClamp,
      fontSize:parseFloat(style.fontSize),transitionDuration:style.transitionDuration};
  };
  const selectors={communications:'.stage-communications',hud:'.stage-hud',objectiveBox:'.stage-objective',
    objective:'#stage-objective',hint:'#stage-near-hint',announcement:'#stage-announcement',
    bubble:'#cap-bubble',bubbleLines:'#cap-bubble-lines',portrait:'#cap-bubble-portrait'};
  const elements=Object.fromEntries(Object.entries(selectors).map(([key,selector])=>[key,read(document.querySelector(selector))]));
  const controls=[...document.querySelectorAll('#stage-toggle,#stage-jump,#stage-interact,#stage-touch-move,#stage-touch-move>button')].map(el=>{
    const state=read(el),r=state.rect,hit=document.elementFromPoint((r.left+r.right)/2,(r.top+r.bottom)/2);
    return {...state,id:el.id||'direction-'+el.dataset.direction,isButton:el.tagName==='BUTTON',centerHits:hit===el||el.contains(hit)};
  });
  const canvas=game.canvas,canvasBox=canvas.getBoundingClientRect(),canvasTransforms=[];
  for(let el=canvas;el;el=el.parentElement){const style=getComputedStyle(el);canvasTransforms.push({id:el.id||el.tagName,
    transform:style.transform,translate:style.translate,rotate:style.rotate,scale:style.scale});}
  const t=game.options.reducedMotion?0:game.visualTime,pose=game.getCharacterPresentation(t);
  const motion=__qaGetTravelerMotion(game.body,{time:t,hop:pose.hop,reducedMotion:game.options.reducedMotion,performance:pose.performance});
  const bubble=document.querySelector('#cap-bubble'),portrait=document.querySelector('#cap-bubble-portrait');
  return {schema:'desktop-dialogue-v32-1',eligible:true,viewport,mode:game.mode,excluded,
    version:document.querySelector('meta[name="application-version"]')?.content??null,
    observedAt:performance.now(),simulationTime:game.time,visualTime:game.visualTime,
    chapterIndex:game.chapterIndex,runId:game.runId,state:game.state,form:game.form,
    openDialogs:[...document.querySelectorAll('dialog[open]')].map(el=>el.id),
    reducedMotion:game.options.reducedMotion,mediaReduced:matchMedia('(prefers-reduced-motion: reduce)').matches,
    horizontalOverflow:document.documentElement.scrollWidth>innerWidth,elements,controls,
    speechParagraphs:[...document.querySelectorAll('#cap-bubble-lines>p')].map(read),
    semantics:{count:document.querySelectorAll('#cap-bubble').length,role:bubble?.getAttribute('role'),
      live:bubble?.getAttribute('aria-live'),atomic:bubble?.getAttribute('aria-atomic'),portraitAlt:portrait?.getAttribute('alt')},
    portraitLoaded:!!portrait?.complete&&portrait.naturalWidth>0,
    canvas:{rect:rect(canvasBox),width:canvas.width,height:canvas.height,transforms:canvasTransforms,
      cssWidth:game.cssWidth,cssHeight:game.cssHeight},
    renderer:{dpr:game.dpr,scale:game.scale,viewportOffsetY:game.viewportOffsetY,camera:game.camera,
      shakeX:game.options.reducedMotion?0:game.shake*Math.sin(t*65)*3},
    actor:{bodyMatrix:[...pose.rig.bodyMatrix],headMatrix:[...pose.rig.headMatrix],capMatrix:[...pose.rig.capMatrix],
      feet:motion.legs.map(leg=>({...leg.foot})),grounded:game.body.grounded,
      body:{x:game.body.x,y:game.body.y,w:game.body.w,h:game.body.h}},
    projectionScope:'Actual current rig and renderer transform; conservative face/cap/coat/foot regions, not pixel segmentation or the complete outfit silhouette'};
};
"""


def _finite(value):
    assert isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value), 'non-finite geometry'
    return value


def _rect(value):
    for key in ['left', 'top', 'right', 'bottom', 'width', 'height']:
        _finite(value[key])
    assert value['width'] >= 0 and value['height'] >= 0, 'negative rectangle size'
    assert abs(value['right'] - value['left'] - value['width']) < .01, 'inconsistent rectangle width'
    assert abs(value['bottom'] - value['top'] - value['height']) < .01, 'inconsistent rectangle height'
    return value


def _contains(outer, inner, tolerance=1.5):
    return all(inner[k] >= outer[k] - tolerance for k in ['left', 'top']) and all(inner[k] <= outer[k] + tolerance for k in ['right', 'bottom'])


def _overlap(a, b, tolerance=1):
    return min(a['right'], b['right']) - max(a['left'], b['left']) > tolerance and min(a['bottom'], b['bottom']) - max(a['top'], b['top']) > tolerance


def project_actor_regions(snapshot):
    """Map authored local bounds through the actual rig and drawing-buffer ratio.

    Region bounds cover the base skull/coat/shoe paths including strokes, with
    no claim about hats, scarf, satchel, effects or transparent silhouette edges.
    CSS transforms are rejected: an axis-aligned DOMRect cannot recover rotation.
    """
    canvas = snapshot['canvas']; box = _rect(canvas['rect']); renderer = snapshot['renderer']; actor = snapshot['actor']
    assert all(t[key] == 'none' for t in canvas['transforms'] for key in ['transform', 'translate', 'rotate', 'scale']), 'unsupported Canvas/ancestor CSS transform'
    assert box['width'] > 0 and box['height'] > 0 and canvas['width'] > 0 and canvas['height'] > 0, 'empty Canvas'
    for key in ['dpr', 'scale', 'viewportOffsetY', 'camera', 'shakeX']:
        _finite(renderer[key])
    assert renderer['dpr'] > 0 and renderer['scale'] > 0, 'invalid renderer scale'
    def world_point(matrix, x, y):
        assert len(matrix) == 6 and all(math.isfinite(_finite(n)) for n in matrix), 'invalid rig matrix'
        return matrix[0]*x + matrix[2]*y + matrix[4], matrix[1]*x + matrix[3]*y + matrix[5]
    def region(matrix, bounds, foot=None):
        left, top, right, bottom = bounds; points = []
        for x, y in [(left, top), (right, top), (right, bottom), (left, bottom)]:
            if foot is not None:
                angle = _finite(foot['angle']); co, si = math.cos(angle), math.sin(angle)
                x, y = co*x - si*y + _finite(foot['x']), si*x + co*y + _finite(foot['y'])
            wx, wy = world_point(matrix, x, y)
            points.append({'x': box['left'] + renderer['dpr'] * renderer['scale'] * (wx - renderer['camera'] + renderer['shakeX']) * box['width']/canvas['width'],
                           'y': box['top'] + renderer['dpr'] * (renderer['scale'] * wy + renderer['viewportOffsetY']) * box['height']/canvas['height']})
        xs, ys = [p['x'] for p in points], [p['y'] for p in points]
        return {'points': points, 'rect': {'left': min(xs), 'top': min(ys), 'right': max(xs), 'bottom': max(ys), 'width': max(xs)-min(xs), 'height': max(ys)-min(ys)}}
    regions = {'face': region(actor['headMatrix'], (-27, -15, 27, 28)),
               'cap': region(actor['capMatrix'], (-27, -41, 27, -9)),
               'coat': region(actor['bodyMatrix'], (-18, -48, 18, -10))}
    assert len(actor['feet']) == 2, 'missing actual feet'
    regions.update({f'foot{index}': region(actor['bodyMatrix'], (-8, -9, 11, 1), foot) for index, foot in enumerate(actor['feet'])})
    return regions


def _validate_text(name, element, viewport):
    assert element and element['visible'], name+' is not visible'
    assert element['text'] and element['glyphRects'] and not element['glyphsTruncated'], name+' has incomplete text evidence'
    assert element['textOverflow'] != 'ellipsis' and element['lineClamp'] in ['none', '0', '', None], name+' is truncated'
    assert element['whiteSpace'] != 'nowrap', name+' cannot wrap'
    assert element['scrollWidth'] <= element['clientWidth'] + 1 and element['scrollHeight'] <= element['clientHeight'] + 1, name+' hides overflowing text'
    for glyph in element['glyphRects']:
        _rect(glyph)
        assert _contains(element['rect'], glyph) and _contains(viewport, glyph), name+' clips a text line'
        for clip in element['clipAncestors']:
            r = clip['rect']
            assert not clip['x'] or glyph['left'] >= r['left']-1.5 and glyph['right'] <= r['right']+1.5, name+' clipped by an ancestor horizontally'
            assert not clip['y'] or glyph['top'] >= r['top']-1.5 and glyph['bottom'] <= r['bottom']+1.5, name+' clipped by an ancestor vertically'


def validate_dialogue_snapshot(snapshot, require_bubble=False):
    if not snapshot['eligible']:
        assert not require_bubble or snapshot['viewport']['width'] < 900, 'required desktop dialogue sampled outside ordinary story'
        return {'status': 'outside-desktop-scope', 'reason': snapshot['reason'], 'actorAvoidanceChecked': False}
    e = snapshot['elements']; view = snapshot['viewport']; viewport = {'left': 0, 'top': 0, 'right': view['width'], 'bottom': view['height']}
    assert view['width'] >= 900 and snapshot['mode'] == 'story' and not snapshot['excluded'], 'wrong desktop scope'
    assert not snapshot['horizontalOverflow'] and not snapshot['openDialogs'], 'stage is overflowed or covered by a dialog'
    assert e['communications'] and e['communications']['display'] == 'grid', 'desktop reading grid is absent'
    assert snapshot['semantics'] == {'count': 1, 'role': 'status', 'live': 'polite', 'atomic': 'true', 'portraitAlt': ''}, 'speech semantics changed'
    assert e['bubble']['pointerEvents'] == 'none' and e['bubbleLines']['pointerEvents'] == 'none', 'speech captures input'
    assert e['bubble']['transform'] == 'none' and e['announcement']['transform'] == 'none', 'old overlay translation remains'
    visible_panels = [name for name in ['hud', 'objectiveBox', 'announcement', 'bubble'] if e[name] and e[name]['visible']]
    assert 'hud' in visible_panels and 'objectiveBox' in visible_panels, 'missing required reading panel'
    for i, name in enumerate(visible_panels):
        _rect(e[name]['rect']); assert _contains(viewport, e[name]['rect']), name+' leaves the viewport'
        for other in visible_panels[i+1:]:
            assert not _overlap(e[name]['rect'], e[other]['rect']), name+' overlaps '+other
    for name in ['hud', 'objective', 'hint'] + (['announcement'] if e['announcement']['visible'] else []):
        _validate_text(name, e[name], viewport)
    bubble_visible = e['bubble']['visible']
    assert not require_bubble or bubble_visible, 'required naturally triggered dialogue was absent'
    regions = project_actor_regions(snapshot)
    if bubble_visible:
        _validate_text('bubbleLines', e['bubbleLines'], viewport)
        assert 1 <= len(snapshot['speechParagraphs']) <= 2, 'missing original speech paragraphs'
        for paragraph in snapshot['speechParagraphs']:
            _validate_text('speech paragraph', paragraph, viewport)
            assert paragraph['fontSize'] >= 12, 'speech became too small'
        assert e['portrait']['rect']['width'] >= 48 and e['portrait']['rect']['height'] >= 48, 'portrait became too small'
        assert snapshot['portraitLoaded'], 'visible portrait not decoded'
        assert _contains(e['bubble']['rect'], e['bubbleLines']['rect']) and _contains(e['bubble']['rect'], e['portrait']['rect']), 'speech content escapes its card'
        for name, region in regions.items():
            assert _contains(snapshot['canvas']['rect'], region['rect']), name+' is outside the Canvas at this checkpoint'
            assert not _overlap(e['bubble']['rect'], region['rect']), 'speech covers the projected '+name
    for control in snapshot['controls']:
        if not control['visible']:
            continue
        _rect(control['rect']); assert _contains(viewport, control['rect']), control['id']+' leaves the viewport'
        if control['isButton']:
            assert control['centerHits'], control['id']+' is covered at its center'
        for name in visible_panels:
            assert not _overlap(control['rect'], e[name]['rect']), name+' overlaps '+control['id']
    if snapshot['reducedMotion'] or snapshot['mediaReduced']:
        assert all(float(s.strip().rstrip('ms')) == 0 for s in e['bubble']['transitionDuration'].split(',')), 'speech still transitions in reduced motion'
    return {'status': 'passed', 'visiblePanels': visible_panels, 'bubbleObserved': bubble_visible,
            'actorAvoidanceChecked': bubble_visible, 'actorRegions': regions,
            'scope': snapshot['projectionScope'], 'geometryIsSameFrameAsScreenshot': False}


def compare_surface_geometry(before, after, tolerance=.5):
    """Compare two actual observations, without inferring an absent baseline."""
    assert before['eligible'] and after['eligible'], 'surface comparison needs ordinary desktop observations'
    assert before['viewport'] == after['viewport'], 'surface comparison viewport differs'
    checked = []
    def compare_rect(name, a, b):
        _rect(a); _rect(b)
        for key in ['left', 'top', 'right', 'bottom', 'width', 'height']:
            assert abs(a[key]-b[key]) <= tolerance, name+' changed '+key
        checked.append(name)
    compare_rect('Canvas', before['canvas']['rect'], after['canvas']['rect'])
    for key in ['width', 'height', 'cssWidth', 'cssHeight', 'transforms']:
        assert before['canvas'][key] == after['canvas'][key], 'Canvas changed '+key
    a = {c['id']: c for c in before['controls']}; b = {c['id']: c for c in after['controls']}
    assert a.keys() == b.keys(), 'control set changed'
    for key in a:
        assert a[key]['visible'] == b[key]['visible'] and a[key]['transform'] == b[key]['transform'], key+' presentation changed'
        compare_rect(key, a[key]['rect'], b[key]['rect'])
    return {'status': 'matched', 'toleranceCssPx': tolerance, 'checked': checked,
            'beforeVersion': before.get('version'), 'afterVersion': after.get('version'),
            'scope': 'Only these paired viewport/Canvas/control measurements; not all game states or a performance result'}


def capture_dialogue(output, label, snapshot, require_bubble=False, surface_reference=None, screenshot=None):
    assert re.fullmatch(r'[A-Za-z0-9_.-]{1,120}', label), 'unsafe evidence label'
    path = Path(output)/(label+'-dialogue-layout.json')
    record = {'label': label, 'snapshot': snapshot, 'followingExistingScreenshot': screenshot,
              'screenshotRelation': 'The existing screenshot follows this observation; not the same frame, and may be absent on failure.',
              'surfaceComparison': {'status': 'not-compared', 'reason': 'no paired actual baseline supplied'}}
    try:
        record['validation'] = validate_dialogue_snapshot(snapshot, require_bubble)
        if snapshot['eligible'] and surface_reference is not None:
            record['surfaceComparison'] = compare_surface_geometry(surface_reference, snapshot)
            record['surfaceComparison']['relationship'] = 'same-run original station checkpoint; not a previous release'
        record['status'] = record['validation']['status']
    except (AssertionError, KeyError, TypeError, ValueError) as error:
        record['status'] = 'failed'; record['failure'] = str(error)
        path.write_text(json.dumps(record, ensure_ascii=False, indent=2)+'\n')
        raise AssertionError(label+': '+str(error)+'; evidence '+str(path)) from error
    path.write_text(json.dumps(record, ensure_ascii=False, indent=2)+'\n')
    return record
