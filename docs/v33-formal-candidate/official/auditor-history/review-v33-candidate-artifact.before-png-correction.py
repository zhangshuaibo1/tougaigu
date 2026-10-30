import hashlib
import io
import json
import re
import struct
import subprocess
import tarfile
import zipfile
from collections import Counter
from pathlib import Path
from datetime import datetime,timezone

OUT=Path('/tmp/tougaigu-v33-candidate-40984114609')
ZIP=Path('/tmp/tougaigu-v33-candidate-40984114609.zip')
ROOT=Path('/workspace/scratch/2b18af2db412/tougaigu-v33-formal')
COMMIT='1d63072bb9a27690ed14b15d3103c6e8a87fa297'
FIRST='ce412d1298d0060dec08893f9b44cead9693edcf'
V31='75010ca44245e05cf44187768722081d244f39f4'
TREE='4de8f4e351ec2d3aa66f20785df440e702b06007'
sha=lambda b:hashlib.sha256(b).hexdigest()
blob=lambda b:hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
git=lambda *args:subprocess.check_output(['git',*args],cwd=ROOT)
def entries(ref):
    out={}
    for r in git('ls-tree','-rz',ref).split(b'\0'):
        if not r:continue
        meta,path=r.split(b'\t',1);mode,kind,h=meta.decode().split()
        assert kind=='blob'
        out[path.decode()]={'mode':mode,'sha':h}
    return out
official=json.loads((OUT/'official-metadata.json').read_text())
run=official['run'];jobs=official['jobs']['jobs']
assert run['id']==40984114609 and run['head_sha']==COMMIT and run['head_branch']=='iteration-v33-companion-20261030'
assert run['status']=='completed' and run['conclusion']=='success' and run['run_attempt']==1
assert official['commit']['sha']==COMMIT and official['commit']['tree']['sha']==TREE
assert [p['sha'] for p in official['commit']['parents']]==[FIRST]
assert len(jobs)==1 and jobs[0]['status']=='completed' and jobs[0]['conclusion']=='success'
steps={s['name']:s for s in jobs[0]['steps']}
for name in ['Verify game logic and local references','Test candidate with real browser input','Preserve source snapshot','Run actions/upload-artifact@v4']:
    assert steps[name]['conclusion']=='success'
assert steps['Test public deployment']['conclusion']=='skipped'
tree=entries(COMMIT);before=entries(FIRST);old=entries(V31)
assert len(tree)==996 and git('rev-parse',COMMIT+'^{tree}').decode().strip()==TREE
runtime={p:v for p,v in tree.items() if p.startswith('dist/')}
assert len(runtime)==144
runtime_delta={p for p in set(tree)|set(before) if p.startswith('dist/') and tree.get(p)!=before.get(p)}
assert runtime_delta=={'dist/dream-companion-art.js','dist/dream-engine.js','dist/index.html','dist/dream.html','dist/survivor.html'}
assert tree['dist/dream-engine-base.js']==before['dist/dream-engine-base.js']
assert len([p for p in runtime if p not in runtime_delta and tree[p]==before[p]])==139
old_tests={p:v for p,v in old.items() if p.startswith('tests/')}
assert len(old_tests)==74
assert all(tree[p]==v for p,v in old_tests.items())
changed_protected={p for p in set(tree)|set(before) if (p.startswith(('dist/','scripts/','tests/','.github/')) or p=='package.json') and tree.get(p)!=before.get(p)}
plan=json.loads(Path('/tmp/v33-formal-candidate-upload.json').read_text())
assert plan['expectedCandidateTree']==TREE and plan['expectedParent']==FIRST
assert changed_protected==set(plan['protectedCodeChanges'])=={'dist/dream-companion-art.js','dist/dream-engine.js','dist/dream.html','dist/index.html','dist/survivor.html','package.json','scripts/browser-smoke.py','scripts/browser_companion_v33.py','tests/companion-art-v33.test.mjs'}
assert sum(p.startswith(('dist/','scripts/','tests/','.github/')) or p=='package.json' for p in tree)==257
v32_tests={p:v for p,v in before.items() if p.startswith('tests/')}
assert len(v32_tests)==77 and sum(p.endswith('.test.mjs') for p in v32_tests)==76 and all(tree[p]==v for p,v in v32_tests.items())
assert tree['scripts/browser_dialogue_v32.py']==before['scripts/browser_dialogue_v32.py']
assert tree['scripts/browser_post_v28.py']==before['scripts/browser_post_v28.py']
assert tree['.github/workflows/iteration-check.yml']==before['.github/workflows/iteration-check.yml']
expected_blobs={f['path']:f['gitBlobSha'] for f in plan['files'] if f['path'] in changed_protected}
for p,h in expected_blobs.items():assert tree[p]['sha']==h
audit=json.loads((OUT/'artifact-audit.json').read_text())
assert audit['commit']==COMMIT and len(audit['sourceFiles'])==996 and not audit['failureEvidence']
assert {x['path'] for x in audit['reports']}=={'candidate/report.json'} and not (OUT/'live/report.json').exists()
assert audit['tests']['tests']==audit['tests']['pass'] and audit['tests']['pass']>=675
assert all(audit['tests'][k]==0 for k in ['fail','skipped','cancelled','todo'])
old_tap=(Path('/tmp/tougaigu-v31-main-40978620156')/'tests.txt').read_text()
new_tap=(OUT/'tests.txt').read_text()
pattern=r'^# Subtest: (.*)$'
old_names=Counter(re.findall(pattern,old_tap,re.M));new_names=Counter(re.findall(pattern,new_tap,re.M))
assert sum(old_names.values())==675 and not(old_names-new_names)
assert sum(new_names.values())==audit['tests']['tests']==691
v32_tap=Path('/tmp/tougaigu-v32-second-40982421518/tests.txt').read_text()
v32_names=Counter(re.findall(pattern,v32_tap,re.M))
assert sum(v32_names.values())==683 and not(v32_names-new_names)
artifacts=official['artifacts']['artifacts'];assert len(artifacts)==1
artifact=artifacts[0]
assert artifact['workflow_run']['id']==run['id'] and artifact['workflow_run']['head_sha']==COMMIT
assert artifact['name']=='game-verification-'+COMMIT and not artifact['expired']
assert artifact['digest']=='sha256:'+audit['zipSha256']
assert artifact['size_in_bytes']==ZIP.stat().st_size==audit['zipBytes']
source_files=[];pngs=[]
with zipfile.ZipFile(ZIP) as z:
    names=z.namelist();assert len(names)==len(set(names))
    assert z.read('commit.txt').decode().strip()==COMMIT
    with tarfile.open(fileobj=io.BytesIO(z.read('source.tar.gz')),mode='r:gz') as t:
        seen=set()
        for m in t:
            if m.isdir():continue
            assert m.isfile() and m.name in tree and m.name not in seen
            seen.add(m.name);d=t.extractfile(m).read();v=tree[m.name]
            assert blob(d)==v['sha']
            archive_mode='100755' if m.mode & 0o111 else '100644';assert archive_mode==v['mode']
            source_files.append({'path':m.name,'bytes':len(d),'gitBlob':v['sha'],'gitMode':v['mode'],'tarMode':oct(m.mode),'sha256':sha(d)})
        assert seen==set(tree)
    for n in names:
        if not n.endswith('.png'):continue
        d=z.read(n);assert d[:8]==b'\x89PNG\r\n\x1a\n'
        w,h=struct.unpack('>II',d[16:24]);assert w>0 and h>0 and (OUT/n).read_bytes()==d
        pngs.append({'path':n,'bytes':len(d),'sha256':sha(d),'width':w,'height':h,'unalteredOriginalArtifact':True})
source_record={'commit':COMMIT,'tree':TREE,'sourceFiles':source_files,'sourceBlobs':996,'runtimeBlobs':144,'runtimeDeltaMatchesApprovedPlan':True,
    'runtimeTree':git('rev-parse',COMMIT+':dist').decode().strip(),'allModesAndContentsExact':True,
    'all74V31TestFilesExact':True,'old675SubtestNamesPreserved':True,'newTestCount':audit['tests']['tests'],
    'onlyNineProtectedCodeChanges':expected_blobs,'all76V32TestFilesExact':True,'old683V32SubtestsAllPresent':True,'candidateOnlyPublicStepSkipped':True}
(OUT/'source-integrity.json').write_text(json.dumps(source_record,ensure_ascii=False,indent=2)+'\n')
(OUT/'original-png-inventory.json').write_text(json.dumps(pngs,ensure_ascii=False,indent=2)+'\n')
faces=json.loads((OUT/'face-evidence-summary.json').read_text())
gates=json.loads((OUT/'inherited-gates-summary.json').read_text())
layout=json.loads((OUT/'dialogue-evidence-summary.json').read_text())
assert faces['faceCheckpointCount']==10 and faces['uniqueObserverCount']==5 and len(faces['uniqueCapturedCanvasFiles'])==11
assert len(gates['jumps'])==6 and len(gates['postRoutes'])==4 and len(gates['phoneEndings'])==6 and len(gates['desktopEndingCombinations'])==4
assert gates['recordCounts']['maxActualPlantedWorldSoleError']==0
assert gates['sameBodyContinuousMushroomValidatorsRechecked']==4 and gates['delayedResourcesAndLateIsolationRechecked']
assert len(gates['standaloneEvidenceComparisons'])==26
assert layout['status']=='passed' and layout['matrix']['caseCount']==6
companion=json.loads((OUT/'companion-evidence-summary.json').read_text())
assert companion['status']=='passed' and len(companion['cases'])==3 and companion['originalPNGCount']==21
report_raw=(OUT/'candidate/report.json').read_bytes();report=json.loads(report_raw)
assert report['url']=='http://127.0.0.1:8080/' and len(report['cases'])==3
for c,count in zip(report['cases'],[9,0,0]):
    assert c['version']=='33.0.0' and c['noHorizontalOverflow'] and c['finalImagesLoaded']
    assert not c['pageErrors'] and not c['httpErrors']
    assert len(c['networkFailures']['actual'])==count and c['networkFailures']['actual']==c['networkFailures']['expected'] and c['networkFailures']['exactMatch']
summary={'status':'passed','reviewedAt':datetime.now(timezone.utc).isoformat(),'runId':run['id'],'runUrl':run['html_url'],'commit':COMMIT,'tree':TREE,
    'artifactId':artifact['id'],'artifactZipBytes':audit['zipBytes'],'artifactZipSha256':audit['zipSha256'],'sourceBlobs':996,'runtimeBlobs':144,
    'tests':audit['tests'],'old675SubtestsAllPresent':True,'old74TestFilesExact':True,'old683V32SubtestsAllPresent':True,'all76V32TestFilesExact':True,'runtimeDeltaMatchesApprovedPlan':True,
    'artifactPaths':len(audit['zipFiles']),'originalPNGCount':len(pngs),'reportBytes':len(report_raw),'reportSha256':sha(report_raw),
    'fullRouteViewports':[c['viewport'] for c in report['cases']],'expectedFailureCounts':[9,0,0],'unexpectedNetworkFailures':0,'pageErrors':0,'httpErrors':0,
    'faceCheckpointCount':10,'faceSnapshotOccurrences':faces['snapshotsRevalidatedOccurrences'],'poseSnapshotOccurrences':gates['recordCounts']['snapshotOccurrencesRevalidated'],
    'completePostRoutes':4,'phoneEndingReadings':6,'desktopEndingCombinations':4,'jumpRecords':6,'originalStrictGatesPreserved':True,
    'naturalReturnEvent':layout['naturalReturn']['validation'],'greenhouseLayoutRecords':2,'matrixConfigurations':6,'matrixDialogueSnapshots':12,
    'matrixExcluded899Snapshots':2,'companion':companion,'matrixZeroPageHTTPNetworkErrors':True,'maxPairedCanvasControlRectDeltaCssPx':layout['matrix']['maxPairedCanvasControlRectDeltaCssPx'],
    'artifactProgramCodeExecuted':False,'publicStep':'skipped','scope':'Official v33 companion candidate, exact 1d63072 Git source, full original browser routes then six independent layout configurations and three fresh companion configurations. Not v33 public HTTPS.',
    'limits':layout['limits']+['Manual original-PNG review is recorded separately.','Face evidence remains event-specific and open-cap fatigue; not complete six-chapter face coverage.']}
(OUT/'independent-candidate-review.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:summary[k] for k in ['status','runId','commit','artifactId','artifactZipBytes','artifactZipSha256','sourceBlobs','runtimeBlobs','tests','old675SubtestsAllPresent','artifactPaths','originalPNGCount','naturalReturnEvent','matrixConfigurations','maxPairedCanvasControlRectDeltaCssPx']},ensure_ascii=False))
