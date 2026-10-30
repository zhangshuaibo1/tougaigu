import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

BASE = Path('/tmp/tougaigu-v33-main-40988381550')
sha = lambda data: hashlib.sha256(data).hexdigest()
inventory = {x['path']: x for x in json.loads((BASE / 'original-png-inventory.json').read_text())}
notes = {
    'live/companion/1280/watching-up.png': '已逐张打开原尺寸公网整页：暖光站台、小猫、开盖身体与上方拾光均可见；小猫位于身体左侧，目光朝上。对白与画面、操作区同时清晰可辨。静态图只证明此帧外观，追随轨迹由原报告连续状态与纯验证器证明。',
    'live/companion/320/after-neutral.png': '已逐张打开原尺寸公网320整页：小猫处于开局中立状态；身体、闭盖帽子、小猫与站台NPC可见，触控区及底部文字均在整页范围内。此图不代表所有服装和所有运行位置。',
    'live/companion/390/returned.png': '已逐张打开原尺寸公网390整页：身体已闭盖，小猫在左侧，第一张票已收取，恢复身体的操作提示清晰。小猫此后整页截图中的眼睛已张开；它不是到达眨眼的同帧图。',
    'live/companion/390/return-returning-canvas.png': '已逐张打开原尺寸公网390 Canvas锁存图：拾光在身体上方，帽盖仍打开，小猫与角色完整可见。它是原观察器被动RAF保存的归位早段Canvas，不包含DOM界面。',
    'live/companion/320/return-arrival-blink-canvas.png': '已逐张打开原尺寸公网320 Canvas锁存图：小猫双眼明显收窄至闭合附近，身体头盖正在落回；原同次arrival-blink锁存记录progress与returnBlink分别为0.8101851851851855和0.976296007119934。只把这张Canvas用于实际到达眨眼外观。',
    'live/companion/320/reduced-open.png': '已逐张打开原尺寸公网320减动整页：开盖拾光贴近身体，小猫可见，归位与回声脉冲触控按钮清楚。游戏减动状态与输入来自原报告，不能单凭一张静态图证明不动；本图未被裁切或补绘。',
    'live/1280-greenhouse-leaves-returned.png': '已逐张打开原尺寸公网温室归位整页：左上自然对白“叶子探出头了，盖子得给它留点地方。”可见，身体、小猫、蘑菇与树根可辨。原DOM读取同样为bubble=true、announcement=false，但DOM读取先于PNG，不宣称同帧。',
    'live/1280-full-touch-320-post-book-riding.png': '已逐张打开原尺寸公网320邮局整页：身体和小猫在书本平台上，远景与窄屏触控按钮可见。此静态图佐证当时外观；平台完整周期与连续支撑点误差由独立旧玩法数据复核证明。',
    'candidate/companion/320/return-arrival-blink-canvas.png': '已逐张打开原尺寸候选320 Canvas锁存图：候选独立运行也捕获到小猫眨眼，身体头盖接近闭合。它的字节与时间属于候选，不借用公网数值；与公网同类截图分别保留。',
    'live/1280-greenhouse-root-crossed.png': '已逐张打开原尺寸公网越根整页：左上对白已消失，中央“借一朵蘑菇的力气，跳得比烦恼更高。”公告可见。原DOM读取本次同样bubble=false、announcement=true；不得沿用v32 main公网曾短暂共存的结果。',
}
companion_reports = {
    scope: json.loads((BASE / scope / 'companion/report.json').read_text())
    for scope in ['candidate', 'live']
}
images = []
for path, note in notes.items():
    data = (BASE / path).read_bytes()
    entry = dict(inventory[path])
    assert len(data) == entry['bytes'] and sha(data) == entry['sha256']
    scope = path.split('/')[0]
    entry.update(
        scope='official local candidate' if scope == 'candidate' else 'actual public HTTPS',
        manuallyOpenedAtOriginalSize=True,
        reencodedCroppedOrComposited=False,
        visualNote=note,
    )
    if '/companion/' in path:
        width = int(path.split('/')[2])
        case = next(c for c in companion_reports[scope]['cases'] if c['viewport']['width'] == width)
        filename = path.split('/')[-1]
        if filename.endswith('-canvas.png'):
            kind = filename.removeprefix('return-').removesuffix('-canvas.png')
            pic = next(p for p in case['return']['pictures'] if p['file'] == filename)
            latch = case['return']['latches'][kind]
            assert pic['sha256'] == entry['sha256']
            entry.update(
                frameScope=pic['scope'],
                originalLatch={
                    'kind': kind,
                    'observedAt': latch['observedAt'],
                    'capPhase': latch['cap']['phase'],
                    'capProgress': latch['cap']['progress'],
                    'returnBlink': latch['view']['returnBlink'],
                    'runId': latch['runId'],
                    'body': latch['body'],
                },
            )
        else:
            pic = next(p for p in case['captures'] if p['file'] == filename)
            assert pic['sha256'] == entry['sha256']
            entry['frameScope'] = pic['scope']
    else:
        entry['frameScope'] = 'Original full browser page captured after the geometry/state read; not the same frame.'
    images.append(entry)

manual = {
    'status': 'reviewed',
    'reviewedAt': datetime.now(timezone.utc).isoformat(),
    'runId': 40988381550,
    'commit': 'be05769a99a807f9396c03084760f8283ce4195e',
    'method': 'Each listed original PNG opened individually with view_image at original detail; no generated replacement or pixel transformation.',
    'imageCount': len(images),
    'images': images,
    'limits': [
        'Only these 10 selected PNGs were manually opened. All 452 original PNGs were structurally and cryptographically verified separately.',
        'A still picture is not a frame-rate or animation-continuity measurement. Motion claims rely on independently revalidated original observations.',
        'Full-page PNGs follow their DOM/state reads. Only original passive RAF Canvas exports carry the corresponding latch scope.',
        'Existing narrow-screen outfit-edge clipping is preserved as a known issue in the exact source docs/QA-v33.md; this selected image review does not close that issue.',
        'No physical phone, Safari, low-end GPU, exhaustive outfit/festival inspection, or raw paused-Canvas-pair recomputation was performed.',
    ],
}
(BASE / 'manual-image-review.json').write_text(json.dumps(manual, ensure_ascii=False, indent=2) + '\n')

baseline = Path('/tmp/tougaigu-v32-second-40982421518/face-evidence-summary.json')
baseline_data = baseline.read_bytes()
required = {x['file'] for x in json.loads(baseline_data)['uniqueCapturedCanvasFiles']}
assert len(required) == 11
rows = []
for scope in ['candidate', 'live']:
    summary = json.loads((BASE / (scope + '-face-evidence-summary.json')).read_text())
    faces = summary['uniqueCapturedCanvasFiles']
    assert {x['file'] for x in faces} == required
    original = BASE / scope / '1280-first-lamp-face-lamp-returned.json'
    raw = original.read_bytes()
    lamp = json.loads(raw)
    assert 'freeJoy' not in lamp['images'] and 'freeJoy' not in lamp['latches']
    closed = lamp['images']['closedJoy']
    latch = lamp['latches']['closedJoy']
    assert closed['sequence'] == latch['sequence']
    rows.append({
        'scope': scope,
        'actualCapturedFacePNGCount': len(faces),
        'allOriginalRequired11NamesPreserved': True,
        'optionalFirstLampFreeJoyImagePresent': False,
        'optionalFirstLampFreeJoyLatchPresent': False,
        'sourceFaceValidatorUnchanged': True,
        'originalLampJSON': {'path': str(original.relative_to(BASE)), 'bytes': len(raw), 'sha256': sha(raw)},
        'firstLampClosedJoySequence': closed['sequence'],
        'faceImages': faces,
    })
note = {
    'status': 'passed',
    'runId': 40988381550,
    'commit': 'be05769a99a807f9396c03084760f8283ce4195e',
    'mandatoryNameBaseline': {'path': str(baseline), 'sha256': sha(baseline_data), 'names': sorted(required)},
    'scopes': rows,
    'auditHistory': 'The main-run audit passed with actual 11/11 counts. No fixed-12 audit failure occurred in this run. The accepted earlier v33 candidate had a valid optional twelfth first-lamp freeJoy capture; that distinct history is preserved in its own archive, not substituted here.',
    'scope': 'This note records actual inventory and existing passive observer latches. It changes no game, validator, threshold, screenshot, or report.',
}
(BASE / 'face-png-count-note.json').write_text(json.dumps(note, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'manualImages': len(images), 'actualFacePNGCounts': [len(x['faceImages']) for x in rows], 'source': str(BASE)}, ensure_ascii=False))
