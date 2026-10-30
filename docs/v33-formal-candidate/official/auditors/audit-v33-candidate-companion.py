"""Independent checks of original official v33 companion evidence; no browser."""
import ast,hashlib,json,math,struct,subprocess
from pathlib import Path
from datetime import datetime,timezone

ROOT=Path('/workspace/scratch/2b18af2db412/tougaigu-v33-formal')
OUT=Path('/tmp/tougaigu-v33-candidate-40984114609')
COMMIT='1d63072bb9a27690ed14b15d3103c6e8a87fa297'
BASE='ce412d1298d0060dec08893f9b44cead9693edcf'
sha=lambda b:hashlib.sha256(b).hexdigest()
git=lambda *args:subprocess.check_output(['git',*args],cwd=ROOT)
source=lambda p:git('show',COMMIT+':'+p)
audit=json.loads((OUT/'artifact-audit.json').read_text())
assert audit['commit']==COMMIT and len(audit['sourceFiles'])==996
zipmap={r['path']:r for r in audit['zipFiles']}
main=json.loads((OUT/'candidate/report.json').read_text())
summary=main['independentCompanion'];raw=(OUT/'candidate/companion/report.json').read_bytes();report=json.loads(raw)
assert summary['status']==report['status']=='passed'
assert summary['schema']==report['schema']=='companion-v33-1'
assert summary['expectedVersion']==report['expectedVersion']=='33.0.0'
assert summary['reportSha256']==sha(raw)==zipmap['candidate/companion/report.json']['sha256']
assert summary['details']=='companion/report.json' and summary['baselineCompared'] is False
assert report['baselineURL'] is None and report['currentURL']==main['url']=='http://127.0.0.1:8080/'
assert summary['elapsedSeconds']==report['elapsedSeconds'] and math.isfinite(report['elapsedSeconds']) and report['elapsedSeconds']>0
assert summary['driverSha256']==report['sourceFiles']['scripts/browser_companion_v33.py']==sha(source('scripts/browser_companion_v33.py'))
for path,digest in report['sourceFiles'].items():assert sha(source(path))==digest,path

# Only the small evidence validator is loaded from exact primary Git source.
driver=source('scripts/browser_companion_v33.py').decode();nodes=[n for n in ast.parse(driver).body if isinstance(n,ast.FunctionDef) and n.name=='validate']
assert len(nodes)==1
namespace={};exec(compile(ast.Module(body=nodes,type_ignores=[]),COMMIT+':scripts/browser_companion_v33.py','exec'),namespace)
validate=namespace['validate']
expected=[(1280,800,'keyboard'),(390,844,'CDP simulated touch'),(320,680,'CDP simulated touch')]
assert len(report['cases'])==len(summary['cases'])==3
pngs=[];snapshots=0;cases=[]
def picture(width,item,kind):
    assert Path(item['file']).name==item['file'] and item['file'].endswith('.png')
    relative=f"candidate/companion/{width}/{item['file']}";data=(OUT/relative).read_bytes()
    assert data[:8]==b'\x89PNG\r\n\x1a\n'
    assert sha(data)==item['sha256']==zipmap[relative]['sha256']
    w,h=struct.unpack('>II',data[16:24]);assert w>0 and h>0
    if 'bytes' in item:assert len(data)==item['bytes']
    if kind=='Canvas':assert w==item['width'] and h==item['height']
    record={'path':relative,'bytes':len(data),'sha256':sha(data),'width':w,'height':h,'kind':kind,'originalArtifactPixels':True}
    pngs.append(record);return record
def inspect(s,initial):
    global snapshots
    validate(s,'33.0.0');snapshots+=1
    for key in ['mode','chapterIndex','runId','deaths','body','viewport']:
        assert s[key]==initial[key],('changed stationary companion observation',key)
    assert math.isfinite(s['time']) and math.isfinite(s['visualTime']) and s['time']>=initial['time']
    assert s['renderScopeReleased'] is True
    return s

for (width,height,kind),case,compact in zip(expected,report['cases'],summary['cases']):
    viewport={'width':width,'height':height}
    assert case['viewport']==compact['viewport']==viewport
    assert case['status']==compact['status']=='passed' and case['version']==compact['version']=='33.0.0'
    assert case['input']==compact['input']==kind and case['pageURL']==report['currentURL']
    assert not case['pageErrors'] and not case['httpErrors'] and not case['requestFailures']
    assert compact['pageErrors']==compact['httpErrors']==compact['requestFailures']==0
    assert 'baselineSnapshot' not in case and 'baselinePicture' not in case
    captures=case['captures'];assert [c['file'] for c in captures]==['after-neutral.png','watching-up.png','returned.png','reduced-open.png']
    initial=captures[0]['snapshot'];validate(initial,'33.0.0')
    assert initial['memories']==[False,False,False] and initial['lamps']==[False,False] and initial['deaths']==0
    assert initial['form']=='body' and initial['cap']['phase']=='closed'
    for c in captures:
        s=inspect(c['snapshot'],initial);r=s['companionBounds'];canvas=s['canvas']
        assert r['left']>=canvas['left']-1 and r['right']<=canvas['right']+1 and r['top']>=canvas['top']-1 and r['bottom']<=canvas['bottom']+1
        p=picture(width,c,'full page');assert (p['width'],p['height'])==(width,height)
    watching=captures[1]['snapshot'];assert watching['form']=='soul' and watching['view']['attention']>0 and watching['view']['lookY']<0
    assert watching['shown']['pose']=='free' and watching['view']['target']=={k:watching['shown'][k] for k in ['x','y']}
    pause=case['pause'];before=inspect(pause['snapshot'],initial);after=inspect(pause['after'],initial)
    assert before['state']==after['state']=='paused' and before['cap']['phase']=='returning'
    for key in ['time','visualTime','cap','view','body','companion']:assert before[key]==after[key]
    assert pause['canvasBytesEqual'] is True and compact['pauseCanvasBytesEqual'] is True
    passive=[]
    for label in ['return','reversal']:
        record=case[label];assert record['active'] is False
        assert 0<len(record['samples'])<=180 and 0<len(record['events'])<=32
        assert all(e['isTrusted'] is True for e in record['events'])
        for s in [record['initial'],*record['samples'],*record['latches'].values(),*[e['snapshot'] for e in record['events']]]:
            inspect(s,initial)
        assert record['elapsedMs']>0 and math.isfinite(record['elapsedMs'])
        passive.append({'kind':label,'samples':len(record['samples']),'trustedEventCount':len(record['events']),'elapsedMs':record['elapsedMs'],'inactiveAtCollection':True})
    returned=case['return'];latches=returned['latches']
    assert set(latches)=={'returning','arrival-blink','closed'} and compact['returnPhases']==list(latches)
    a,b,c=[latches[key] for key in ['returning','arrival-blink','closed']]
    assert a['form']=='body' and a['cap']['phase']=='returning' and a['shown']['pose']==a['view']['focus']=='return'
    assert a['view']['target']=={'x':a['shown']['x'],'y':a['shown']['y']}
    assert b['cap']['phase']=='returning' and b['cap']['progress']>=2/3 and b['view']['returnBlink']>.8 and b['cap']['returnFrom']
    assert c['cap']['phase']=='closed' and c['view']['focus']=='body' and c['view']['returnBlink']==0
    assert a['time']<b['time']<c['time']
    distinct=[s for s in returned['samples'] if s['view']['focus']=='return' and s['shown'] and
              (abs(s['view']['target']['x']-s['rawSoul']['x'])>1e-6 or abs(s['view']['target']['y']-s['rawSoul']['y'])>1e-6)]
    assert distinct,'no observed actual return differed from raw idle soul coordinates'
    assert len(returned['pictures'])==3
    assert {p['file'] for p in returned['pictures']}=={'return-returning-canvas.png','return-arrival-blink-canvas.png','return-closed-canvas.png'}
    for p in returned['pictures']:picture(width,p,'Canvas')
    reversal=case['reversal'];assert not reversal['pictures']
    changed=inspect(reversal['after'],initial)
    assert changed['form']=='soul' and changed['cap']['phase']=='opening' and changed['cap']['returnFrom'] is None and changed['view']['returnBlink']==0
    actions=[e for e in reversal['events'] if e['type']=='keydown' and e['code']=='KeyE' or e['type']=='click' and e['target']=='stage-toggle']
    assert len(actions)==2 and all(e['isTrusted'] and not e['repeat'] for e in actions)
    reduced=captures[3]['snapshot'];assert reduced['reducedMotion'] and reduced['form']=='soul' and reduced['cap']['phase']=='open'
    settled=inspect(case['reducedRecall'],initial);assert settled['reducedMotion'] and settled['form']=='body' and settled['cap']['phase']=='closed' and settled['view']['returnBlink']==0
    assert settled['memories']==[True,False,False] and settled['lamps']==[False,False]
    save=case['storedSave'];assert len(save['chapters'])==6 and all(not s['completed'] and not s['runs'] for s in save['chapters'])
    assert save['settings']['reducedMotion'] is True
    cases.append({'viewport':viewport,'version':'33.0.0','input':kind,'status':'passed','zeroDeathsAndPageHTTPNetworkErrors':True,
        'bodyCoordinatesStayedAt':initial['body'],'sameRunWithinThisFreshContext':initial['runId'],
        'strictVisibleCaptureCount':len(captures),'passiveObservations':passive,'actualReturnFocusDistinctFromRawSoulSamples':len(distinct),
        'returnBlinkProgress':b['cap']['progress'],'returnBlinkAmount':b['view']['returnBlink'],
        'pauseStatesRechecked':True,'pauseReportedCanvasBytesEqual':True,'trustedReversalActions':len(actions),
        'gameReducedMotionActualUI':True,'noChapterSettled':True,'onlyFirstTicketCollected':True})

assert len(pngs)==len({p['path'] for p in pngs})==21
assert {n for n in zipmap if n.startswith('candidate/companion/') and n.endswith('.png')}=={p['path'] for p in pngs}
assert not any(n.startswith('candidate/companion/') and 'failure' in Path(n).name for n in zipmap)
out={'status':'passed','reviewedAt':datetime.now(timezone.utc).isoformat(),'runId':40984114609,'commit':COMMIT,'version':'33.0.0',
 'reportBytes':len(raw),'reportSha256':sha(raw),'summaryExactToOriginalReport':True,'elapsedSeconds':report['elapsedSeconds'],
 'sourceFilesExactToPrimaryGit':report['sourceFiles'],'originalPNGCount':len(pngs),'originalPNGs':pngs,
 'snapshotOccurrencesRevalidated':snapshots,'cases':cases,'artifactProgramCodeExecuted':False,
 'trustedPureValidator':'validate from exact primary Git scripts/browser_companion_v33.py',
 'limits':['This companion subset is three fresh first-station contexts; full six-chapter proof belongs to the preceding original route audit.',
 'Body positions and run IDs are recorded; these companion browser snapshots do not contain body object identities. Exact per-frame presentedSoul reference identity is established by the eight original unit tests, not inferred from JSON identity.',
 'Canvas PNGs are unmodified passive-RAF latches. Full-page pictures follow their reads and are not claimed as the identical frame.',
 'Pause snapshots are independently compared. Raw paired paused Canvas strings were not retained in the report; their equality was asserted by the exact source in the successful official run.',
 'Game-internal reduced-motion setting was exercised; the companion subset did not separately set OS media preference.',
 'No physical handset, Safari, device performance or exhaustive outfit/activity coverage; no public HTTPS in this candidate.']}
(OUT/'companion-evidence-summary.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:out[k] for k in ['status','commit','version','reportBytes','reportSha256','elapsedSeconds','originalPNGCount','snapshotOccurrencesRevalidated','cases']},ensure_ascii=False))
