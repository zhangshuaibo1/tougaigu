import ast
import hashlib
import json
import math
import re
import struct
import subprocess
from collections import Counter
from pathlib import Path
from datetime import datetime,timezone

ROOT=Path('/workspace/scratch/2b18af2db412/tougaigu-v32-main-release')
OUT=Path('/tmp/tougaigu-v32-main-40984854669')
import sys
SCOPE=sys.argv[1]
assert SCOPE in ['candidate','live']
SCOPE_DESCRIPTION='GitHub main '+SCOPE+' complete browser route ('+('local candidate server' if SCOPE=='candidate' else 'real https://tougaigu.com/')+')'

COMMIT='93655a7013adb3ecd41f7e1fac6935f7b5464539'
BASE='7ba7c5e00a6a32032e5becf5131a527322d03ac3'
EVIDENCE=OUT/SCOPE
sha=lambda b:hashlib.sha256(b).hexdigest()
git=lambda *args:subprocess.check_output(['git',*args],cwd=ROOT)
source=lambda p:git('show',COMMIT+':'+p).decode()
audit=json.loads((OUT/'artifact-audit.json').read_text())
assert audit['commit']==COMMIT and len(audit['sourceFiles'])==950
zipmap={x['path']:x for x in audit['zipFiles']}
report=json.loads((EVIDENCE/'report.json').read_text())
EXPECTED_URL='http://127.0.0.1:8080/' if SCOPE=='candidate' else 'https://tougaigu.com/?qa='+COMMIT
assert report['url']==EXPECTED_URL
APP_URL='http://127.0.0.1:8080/dream-app.js?v=32.0.0' if SCOPE=='candidate' else 'https://tougaigu.com/dream-app.js?v=32.0.0'
matrix=json.loads((EVIDENCE/'dialogue-matrix/report.json').read_text())
assert report['independentDialogueMatrix']==matrix
namespace={'math':math,'json':json,'re':re,'Path':Path,'hashlib':hashlib,'BASE_COMMIT':BASE}
selected={
 'scripts/browser_dialogue_v32.py':['_finite','_rect','_contains','_overlap','project_actor_regions','_validate_text','validate_dialogue_snapshot','compare_surface_geometry','validate_natural_dialogue_return'],
 'scripts/browser_dialogue_matrix_v32.py':['validate_surface','compare_surfaces'],
}
validator_sources=[]
for path,names in selected.items():
    raw=source(path);nodes=[n for n in ast.parse(raw).body if isinstance(n,ast.FunctionDef) and n.name in names]
    assert {n.name for n in nodes}==set(names)
    exec(compile(ast.Module(body=nodes,type_ignores=[]),COMMIT+':'+path,'exec'),namespace)
    validator_sources.append({'path':path,'gitBlob':git('rev-parse',COMMIT+':'+path).decode().strip(),'sha256':sha(raw.encode()),'pureFunctions':names})
def raw_json(relative):
    p=EVIDENCE/relative;b=p.read_bytes()
    assert sha(b)==zipmap[SCOPE+'/'+relative]['sha256']
    return json.loads(b)
def png_record(relative):
    p=EVIDENCE/relative;b=p.read_bytes();assert b[:8]==b'\x89PNG\r\n\x1a\n'
    assert sha(b)==zipmap[SCOPE+'/'+relative]['sha256']
    w,h=struct.unpack('>II',b[16:24]);return {'path':relative,'bytes':len(b),'sha256':sha(b),'width':w,'height':h,'originalArtifactPixels':True,'notSameFrameAsGeometry':True}
main=report['cases'][0];greenhouse=main['greenhouse']
event=raw_json('1280-greenhouse-return-dialogue-event.json')
assert event==greenhouse['dialogueReturnEvent']
assert namespace['validate_natural_dialogue_return'](event)==event['validation']
assert event['count']==1 and not event['active'] and event['observerRemoved']
before=event['inputs'][0]['snapshot'];after=event['after']
assert 'bodyIdentity' not in before and 'bodyIdentity' not in after
station=next(x for x in main['desktopDialogueObservations'] if x['label']=='1280-station-body')['snapshot']
observations=[]
for label,field,required in [
 ('1280-greenhouse-leaves-returned','desktopDialogueReturnObservation',True),
 ('1280-greenhouse-root-crossed','desktopDialogueObservation',False),
]:
    rec=raw_json(label+'-dialogue-layout.json');assert rec==greenhouse[field]
    snap=rec['snapshot'];assert snap['version']=='32.0.0' and snap['chapterIndex']==1 and snap['runId']==after['runId']
    validation=namespace['validate_dialogue_snapshot'](snap,required);assert rec['validation']==validation and rec['status']=='passed'
    comparison=namespace['compare_surface_geometry'](station,snap)
    assert {k:v for k,v in rec['surfaceComparison'].items() if k!='relationship'}==comparison
    assert rec['surfaceComparison']['relationship']=='same-run original station checkpoint; not a previous release'
    if required:
        clock=snap['dialogueClock']
        assert clock['lastShownAt']==after['lastShownAt'] and clock['text']==after['text']
        assert clock['runId']==after['runId'] and clock['body']==after['body']
    image=png_record(rec['followingExistingScreenshot'])
    observations.append({'label':label,'requiredVisibleDialogue':required,'actualVisibleDialogue':snap['elements']['bubble']['visible'],
        'actualAnnouncementVisible':snap['elements']['announcement']['visible'],'dialogueText':snap['elements']['bubble']['text'],
        'announcementText':snap['elements']['announcement']['text'],'dialogueClock':snap['dialogueClock'],
        'nativeReturnEventSameRefresh':required,'validation':validation,'pairedStationCanvasControls':comparison,
        'immediateJSONExactToCompleteReport':True,'png':image})
fixture=json.loads(source('tests/fixtures/v32-layout-v31-css.json'))
assert fixture['commit']==BASE
assert [x['path'] for x in fixture['styles']]==['dream-play.css','cap-play.css']
for style in fixture['styles']:
    actual=git('show',BASE+':dist/'+style['path']);assert actual==style['content'].encode() and sha(actual)==style['sha256']
assert matrix['status']=='passed'
expected=['900x800','899x800','1024x640','900x520','1280x800-os-reduce','1280x800-game-reduce']
assert [x['case']['label'] for x in matrix['cases']]==expected
assert matrix['ablation']=={'kind':'same-current-DOM-original-v31-CSS','sourceCommit':BASE,'styles':[{k:x[k] for k in ['path','sha256']} for x in fixture['styles']], 'neutralWrapper':'.stage-communications{display:contents}','notOldCompleteRelease':True,'synchronousFinallyRestored':True}
cases=[];coexist=[]
for case in matrix['cases']:
    config=case['case'];view={'width':config['width'],'height':config['height']};eligible=config['width']>=900
    assert case['status']=='passed' and case['version']=='32.0.0'
    assert not case['pageErrors'] and not case['httpErrors'] and not case['requestFailures']
    assert case['instrumentedAppURLs']==[APP_URL]
    pair=case['surfacePair']
    for s in pair.values():assert s['viewport']==view and s['version']=='32.0.0' and s['dpr']==1
    assert namespace['validate_surface'](pair['before'],eligible)==case['breakpoint']
    assert namespace['compare_surfaces'](pair['ablated'],pair['before'])==case['cssAblationComparison']
    assert namespace['compare_surfaces'](pair['before'],pair['restored'])==case['restorationComparison']
    assert pair['before']['communicationsDisplay']==pair['restored']['communicationsDisplay']
    assert pair['ablated']['communicationsDisplay']=='contents'
    assert case['canvasComparisonIsOldCompleteRelease'] is False
    namespace['validate_surface'](case['ticketSurface'],eligible)
    max_delta=0
    for a,b in [(pair['ablated'],pair['before']),(pair['before'],pair['restored'])]:
        rects=[(a['canvas']['rect'],b['canvas']['rect'])]+[(x['rect'],y['rect']) for x,y in zip(a['controls'],b['controls'])]
        max_delta=max(max_delta,*[abs(x[k]-y[k]) for x,y in rects for k in ['left','top','right','bottom','width','height']])
    dialogues=[]
    assert len(case['dialogues'])==2
    for d in case['dialogues']:
        assert raw_json('dialogue-matrix/'+d['label']+'-dialogue-layout.json')==d
        s=d['snapshot'];validation=namespace['validate_dialogue_snapshot'](s,True)
        assert d['validation']==validation and d['status']==('passed' if eligible else 'outside-desktop-scope')
        assert s['eligible']==eligible and s['viewport']==view
        image=png_record('dialogue-matrix/'+d['followingExistingScreenshot'])
        assert (image['width'],image['height'])==(view['width'],view['height'])
        elements=s.get('elements',{});ann=elements.get('announcement',{});bubble=elements.get('bubble',{})
        if eligible:
            assert s['version']=='32.0.0' and s['chapterIndex']==0 and s['mode']=='story'
            assert s['reducedMotion']==(config['game_reduce'] or config['media']=='reduce')
            assert s['mediaReduced']==(config['media']=='reduce')
            if ann['visible'] and bubble['visible']:
                coexist.append({'label':d['label'],'announcement':ann['text'],'dialogue':bubble['text'],'synchronousSnapshot':True,'subsequentPNGNotSameFrame':True})
        dialogues.append({'label':d['label'],'status':d['status'],'actorAvoidanceChecked':validation['actorAvoidanceChecked'],
            'actualReducedMotion':s.get('reducedMotion'),'actualMediaReduced':s.get('mediaReduced'),
            'announcementVisible':ann.get('visible'),'bubbleVisible':bubble.get('visible'),
            'immediateJSONExact':True,'png':image})
    cases.append({'configuration':config,'status':'passed','pageErrors':0,'httpErrors':0,'requestFailures':0,
        'maxPairedCanvasControlRectDeltaCssPx':max_delta,'pairedBuffersAndTransformsExact':True,
        'oldCSSFinallyRestored':True,'dialogues':dialogues})
summary={'status':'passed','reviewedAt':datetime.now(timezone.utc).isoformat(),'runId':40984854669,'commit':COMMIT,
 'scope':SCOPE_DESCRIPTION+' and its own independent six-configuration matrix; not the earlier local 5445 report.',
 'validatorSources':validator_sources,'naturalReturn':{'eventFile':SCOPE+'/1280-greenhouse-return-dialogue-event.json',
    'validation':event['validation'],'exactlyOneTrustedE':True,'observerRemoved':True,'initial':event['initial'],
    'before':before,'after':after,'sameRunChapterDeathsAndBodyCoordinates':True,'bodyObjectIdentityRecorded':False,
    'newReadOnlyWait':'up to 2000ms before the existing E, for the existing authored 1600ms cooldown; no clock/text/state mutation'},
 'greenhouseObservations':observations,'matrix':{'cases':cases,'caseCount':6,'immediateJSONCount':12,'originalPNGCount':12,
    'eligibleDesktopSnapshots':10,'exclusion899Snapshots':2,'completeMatrixExactToMainReport':True,
    'exactOldCSSFixtureSource':BASE,'maxPairedCanvasControlRectDeltaCssPx':max(x['maxPairedCanvasControlRectDeltaCssPx'] for x in cases),
    'firstStationNaturalCoexistence':coexist,'originalNotCovered':matrix['notCovered']},
 'artifactProgramCodeExecuted':False,'limits':['The required visible greenhouse speech check moved to natural cap-closure before root traversal; root-crossed still checks actual geometry and any speech that remains visible. Original v31 route/physics assertions remain unchanged.',
    'The new event record proves same run/chapter/deaths and stable body coordinates; it contains no bodyIdentity and is not independent object-identity evidence.',
    'Geometry and screenshots are consecutive, not synchronous frames. Every pair uses the same current DOM with old CSS and a neutral display:contents wrapper; it is not a complete old-release execution.',
    '899px checks exclusion-side Canvas/control geometry and input centers, not desktop actor avoidance. Actor regions are conservative face/cap/coat/feet, not complete outfit pixel silhouettes.',
    'The raw notCovered coexistence phrase is overbroad if the recorded list above is nonempty; use exact observed first-station and greenhouse scopes, not a claim about all announcements.',
    'No physical handset, Safari, maximum-font/longest-dialogue/high-platform exhaustiveness or performance benchmark; report scope identifies candidate versus actual public HTTPS.']}
(OUT/(SCOPE+'-dialogue-evidence-summary.json')).write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'status':'passed','summary':str(OUT/(SCOPE+'-dialogue-evidence-summary.json')),'naturalReturn':event['validation'],
 'greenhouseCheckpoints':[{k:x[k] for k in ['label','requiredVisibleDialogue','actualVisibleDialogue','actualAnnouncementVisible']} for x in observations],
 'matrixCases':6,'immediateJSONCount':12,'originalPNGCount':12,'maxCanvasControlDelta':summary['matrix']['maxPairedCanvasControlRectDeltaCssPx'],
 'naturalFirstStationCoexistenceCount':len(coexist)},ensure_ascii=False))
