import gzip
import hashlib
import io
import json
import pathlib
import re
import struct
import subprocess
import tarfile
import zipfile
from datetime import datetime, timezone

OUT = pathlib.Path('/tmp/tougaigu-v33-main-40988381550')
ZIP = pathlib.Path('/tmp/tougaigu-v33-main-40988381550.zip')
ROOT = pathlib.Path('/workspace/scratch/2b18af2db412/tougaigu-v33-main-release')
COMMIT = 'be05769a99a807f9396c03084760f8283ce4195e'
CANDIDATE = '1d63072bb9a27690ed14b15d3103c6e8a87fa297'
PAGES = 'd997c58b2a846b2673b8baec500db9697a846d7a'
TREE = '5516892f4242d34b052630b5274641d3f8f27a91'
PAGES_TREE = 'ef9072b947447304f4561855a8db58fb7fc42211'
sha = lambda b: hashlib.sha256(b).hexdigest()
blob = lambda b: hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
git = lambda *args: subprocess.check_output(['git', *args], cwd=ROOT)
official = json.loads((OUT/'official-metadata.json').read_text())
run = official['run']
assert run['id'] == 40988381550 and run['head_sha'] == COMMIT
assert run['head_branch'] == 'main' and run['event'] == 'push'
assert run['status'] == 'completed' and run['conclusion'] == 'success'
assert run['run_attempt'] == 1
assert official['commit']['sha'] == COMMIT and official['commit']['tree']['sha'] == TREE
assert [p['sha'] for p in official['commit']['parents']] == ['93655a7013adb3ecd41f7e1fac6935f7b5464539','1d63072bb9a27690ed14b15d3103c6e8a87fa297']
assert official['pages']['object']['sha'] == PAGES
jobs = official['jobs']['jobs']
assert len(jobs) == 1 and jobs[0]['status'] == 'completed' and jobs[0]['conclusion'] == 'success'
steps = {s['name']:s for s in jobs[0]['steps']}
for name in ['Verify game logic and local references','Test candidate with real browser input','Test public deployment','Preserve source snapshot','Run actions/upload-artifact@v4']:
    assert steps[name]['status'] == 'completed' and steps[name]['conclusion'] == 'success', name
assert not git('diff','--name-only',CANDIDATE,COMMIT,'--','dist','scripts','tests','package.json','.github')
assert git('rev-parse',COMMIT+'^{tree}').decode().strip() == TREE
primary = json.loads((OUT/'primary-source-tree.json').read_text())
tree = {x['path']:x for x in primary['entries'] if x['type']=='blob'}
assert len(tree) == 1138 and primary['tree'] == TREE
runtime = {p[5:]:v for p,v in tree.items() if p.startswith('dist/')}
assert len(runtime) == 144
pages = official['pagesTree']
assert pages['sha'] == PAGES_TREE and not pages['truncated']
pageblobs = {x['path']:x for x in pages['tree'] if x['type']=='blob'}
assert set(pageblobs) == set(runtime)|{'.nojekyll'}
assert pageblobs['.nojekyll']['sha'] == blob(b'') and pageblobs['.nojekyll']['mode'] == '100644'
for p,v in runtime.items():
    assert (v['sha'],v['mode']) == (pageblobs[p]['sha'],pageblobs[p]['mode']), p
audit = json.loads((OUT/'artifact-audit.json').read_text())
assert audit['commit'] == COMMIT and len(audit['sourceFiles']) == 1138
assert audit['tests'] == {'tests':691,'pass':691,'fail':0,'skipped':0,'cancelled':0,'todo':0}
assert not audit['failureEvidence']

from collections import Counter
pattern=r'^# Subtest: (.*)$'
old_tap=(pathlib.Path('/tmp/tougaigu-v31-main-40978620156')/'tests.txt').read_text()
accepted_tap=(pathlib.Path('/tmp/tougaigu-v33-candidate-40984114609')/'tests.txt').read_text()
main_tap=(OUT/'tests.txt').read_text()
old_names=Counter(re.findall(pattern,old_tap,re.M));new_names=Counter(re.findall(pattern,main_tap,re.M))
assert sum(old_names.values())==675 and not (old_names-new_names)
assert sum(new_names.values())==691 and new_names==Counter(re.findall(pattern,accepted_tap,re.M))
old_test_tree=git('ls-tree','-rz','75010ca44245e05cf44187768722081d244f39f4','--','tests')
old_test_entries=[]
for row in old_test_tree.split(b'\0'):
    if not row:continue
    meta,path=row.split(b'\t',1);mode,kind,h=meta.decode().split();path=path.decode()
    assert kind=='blob' and path in tree and tree[path]['sha']==h and tree[path]['mode']==mode
    old_test_entries.append(path)
assert len(old_test_entries)==74

v32_tap=(pathlib.Path('/tmp/tougaigu-v32-second-40982421518')/'tests.txt').read_text()
v32_names=Counter(re.findall(pattern,v32_tap,re.M))
assert sum(v32_names.values())==683 and not (v32_names-new_names)
v32_test_entries=[]
for row in git('ls-tree','-rz','ce412d1298d0060dec08893f9b44cead9693edcf','--','tests').split(b'\0'):
    if not row:continue
    meta,path=row.split(b'\t',1);mode,kind,h=meta.decode().split();path=path.decode()
    assert kind=='blob' and path in tree and tree[path]['sha']==h and tree[path]['mode']==mode
    v32_test_entries.append(path)
assert len(v32_test_entries)==77 and sum(p.endswith('.test.mjs') for p in v32_test_entries)==76
assert sum(p.startswith(('dist/','scripts/','tests/','.github/')) or p=='package.json' for p in tree)==257
assert sum(p.startswith('tests/') and p.endswith('.test.mjs') for p in tree)==77
assert git('show',COMMIT+':dist/CNAME')==b'tougaigu.com\n'


assert {r['path'] for r in audit['reports']} == {'candidate/report.json','live/report.json'}
artifacts = [x for x in official['artifacts']['artifacts'] if x['name']=='game-verification-'+COMMIT]
assert len(artifacts) == 1
artifact = artifacts[0]
assert not artifact['expired'] and artifact['workflow_run']['id'] == run['id'] and artifact['workflow_run']['head_sha'] == COMMIT
assert ZIP.stat().st_size == artifact['size_in_bytes'] == audit['zipBytes']
if artifact.get('digest'):
    assert artifact['digest'] == 'sha256:'+audit['zipSha256']
source_integrity = []
png_inventory = []
with zipfile.ZipFile(ZIP) as z:
    names=z.namelist()
    assert len(names)==len(set(names)), 'duplicate ZIP paths'
    assert z.read('commit.txt').decode().strip() == COMMIT
    with tarfile.open(fileobj=io.BytesIO(z.read('source.tar.gz')), mode='r:gz') as t:
        seen=set()
        for m in t:
            if m.isdir(): continue
            assert m.isfile() and m.name in tree and m.name not in seen
            seen.add(m.name)
            d=t.extractfile(m).read()
            expected=tree[m.name]
            assert blob(d)==expected['sha']
            archive_mode='100755' if m.mode & 0o111 else '100644'
            assert archive_mode==expected['mode'], m.name
            source_integrity.append({'path':m.name,'bytes':len(d),'gitBlob':expected['sha'],'gitMode':expected['mode'],'tarMode':oct(m.mode),'sha256':sha(d)})
        assert seen==set(tree)
    public_index=z.read('public-index.html')
    assert public_index==git('show',COMMIT+':dist/index.html')
    public_index_record={'bytes':len(public_index),'sha256':sha(public_index),'exactMainDistIndex':True}
    (OUT/'public-index.html').write_bytes(public_index)
    for n in names:
        if not n.endswith('.png'): continue
        d=z.read(n)
        assert d[:8]==b'\x89PNG\r\n\x1a\n'
        w,h=struct.unpack('>II',d[16:24])
        assert w>0 and h>0 and (OUT/n).read_bytes()==d
        png_inventory.append({'path':n,'width':w,'height':h,'bytes':len(d),'sha256':sha(d),'unchangedOriginalArtifact':True})
source_record={'commit':COMMIT,'tree':TREE,'sourceBlobs':len(tree),'runtimeBlobs':len(runtime),'allArchivePathsUnique':True,'allSourceContentAndExecutableModesMatch':True,'protectedScopesIdenticalToCandidate1d63072':True,'pagesHead':PAGES,'pagesTree':PAGES_TREE,'all144RuntimePathsAndModesMatchPages':True,'publicIndex':public_index_record,'sourceFiles':source_integrity}
(OUT/'source-integrity.json').write_text(json.dumps(source_record,ensure_ascii=False,indent=2)+'\n')
(OUT/'original-png-inventory.json').write_text(json.dumps(png_inventory,ensure_ascii=False,indent=2)+'\n')
reports=[]
for scope in ['candidate','live']:
    raw=(OUT/scope/'report.json').read_bytes()
    report=json.loads(raw)
    expected_url='http://127.0.0.1:8080/' if scope=='candidate' else 'https://tougaigu.com/?qa='+COMMIT
    assert report['url']==expected_url, report['url']
    assert len(report['cases'])==3
    assert [c['viewport']['width'] for c in report['cases']]==[1280,390,320]
    for c,count in zip(report['cases'],[9,0,0]):
        assert c['version']=='33.0.0' and c['noHorizontalOverflow'] and c['finalImagesLoaded']
        assert not c['pageErrors'] and not c['httpErrors']
        assert len(c['networkFailures']['actual'])==count
        assert c['networkFailures']['actual']==c['networkFailures']['expected']
        assert c['networkFailures']['exactMatch']
    faces=json.loads((OUT/(scope+'-face-evidence-summary.json')).read_text())
    gates=json.loads((OUT/(scope+'-inherited-gates-summary.json')).read_text())
    assert faces['faceCheckpointCount']==10 and faces['uniqueObserverCount']==5
    baseline_faces=json.loads((pathlib.Path('/tmp/tougaigu-v32-second-40982421518')/'face-evidence-summary.json').read_text())
    required_face_images={x['file'] for x in baseline_faces['uniqueCapturedCanvasFiles']}
    actual_face_images={x['file'] for x in faces['uniqueCapturedCanvasFiles']}
    assert len(required_face_images)==11 and required_face_images<=actual_face_images
    optional_face_images=actual_face_images-required_face_images
    assert optional_face_images<={'1280-first-lamp-face-lamp-freeJoy.png'}
    for optional_name in optional_face_images:
        lamp_record=json.loads((OUT/scope/'1280-first-lamp-face-lamp-returned.json').read_text())
        image=lamp_record['images']['freeJoy'];latch=lamp_record['latches']['freeJoy']
        assert image['file']==optional_name and image['sequence']==latch['sequence']
        assert latch['facePresentation']['soulJoy'] and latch['form']=='soul' and latch['source']=='raf'
        assert latch['facePresentation']['presentedSoul']['pose']=='free'
        assert image['width']>0 and image['height']>0
    # Pure source validators, PNG hashes and exact latch/viewport sequences were all rechecked above.

    assert gates['recordCounts']['maxActualPlantedWorldSoleError']<=1e-6
    assert len(gates['jumps'])==6 and len(gates['postRoutes'])==4
    assert len(gates['phoneEndings'])==6 and len(gates['desktopEndingCombinations'])==4
    assert len(gates['standaloneEvidenceComparisons'])==26
    assert gates['sameBodyContinuousMushroomValidatorsRechecked']==4
    assert gates['delayedResourcesAndLateIsolationRechecked']

    dialogue=json.loads((OUT/(scope+'-dialogue-evidence-summary.json')).read_text())
    assert dialogue['status']=='passed' and dialogue['matrix']['caseCount']==6
    assert dialogue['matrix']['immediateJSONCount']==12 and dialogue['matrix']['originalPNGCount']==12
    assert len(dialogue['greenhouseObservations'])==2
    assert dialogue['naturalReturn']['exactlyOneTrustedE'] and dialogue['naturalReturn']['observerRemoved']
    assert dialogue['naturalReturn']['bodyObjectIdentityRecorded'] is False

    companion=json.loads((OUT/(scope+'-companion-evidence-summary.json')).read_text())
    assert companion['status']=='passed' and companion['version']=='33.0.0'
    assert len(companion['cases'])==3 and companion['originalPNGCount']==21
    assert [x['viewport']['width'] for x in companion['cases']]==[1280,390,320]
    assert all(x['status']=='passed' and x['zeroDeathsAndPageHTTPNetworkErrors'] and x['onlyFirstTicketCollected'] and x['noChapterSettled'] for x in companion['cases'])


    reports.append({'scope':scope,'url':report['url'],'bytes':len(raw),'sha256':sha(raw),'viewports':[c['viewport'] for c in report['cases']],'expectedFailureCounts':[9,0,0],'unexpectedNetworkFailures':0,'pageErrors':0,'httpErrors':0,'faceCheckpointCount':faces['faceCheckpointCount'],'actualCapturedFacePNGs':len(actual_face_images),'requiredPrior11FacePNGsAllPresent':True,'additionalSourceValidatedFacePNGs':sorted(optional_face_images),'faceSnapshotOccurrences':faces['snapshotsRevalidatedOccurrences'],'poseSnapshotOccurrences':gates['recordCounts']['snapshotOccurrencesRevalidated'],'completePostRoutes':4,'phoneEndingReadings':6,'desktopEndingCombinations':4,'jumpRecords':6,'fatigue':faces['fatigue'],'faceAudit':scope+'-face-evidence-summary.json','inheritedGateAudit':scope+'-inherited-gates-summary.json','companionAudit':scope+'-companion-evidence-summary.json','companionReportSha256':companion['reportSha256'],'companionElapsedSeconds':companion['elapsedSeconds'],'companionCases':companion['cases'],'companionSnapshotOccurrences':companion['snapshotOccurrencesRevalidated'],'companionOriginalPNGCount':21,'dialogueAudit':scope+'-dialogue-evidence-summary.json','matrixConfigurations':6,'matrixImmediateJSONs':12,'matrixRawPNGs':12,'matrixMaxCanvasControlDelta':dialogue['matrix']['maxPairedCanvasControlRectDeltaCssPx'],'naturalReturnValidation':dialogue['naturalReturn']['validation'],'greenhouseVisibility':[{'label':x['label'],'bubble':x['actualVisibleDialogue'],'announcement':x['actualAnnouncementVisible']} for x in dialogue['greenhouseObservations']]})
summary={'reviewedAt':datetime.now(timezone.utc).isoformat(),'status':'passed','runId':run['id'],'runUrl':run['html_url'],'commit':COMMIT,'tree':TREE,'pagesHead':PAGES,'pagesTree':PAGES_TREE,'artifactId':artifact['id'],'artifactZipBytes':audit['zipBytes'],'artifactZipSha256':audit['zipSha256'],'sourceBlobsExact':1138,'runtimeBlobsExact':144,'tests':audit['tests'],'artifactPaths':len(audit['zipFiles']),'originalPNGCount':len(png_inventory),'sourceArchiveModesAlsoChecked':True,'publicIndex':public_index_record,'reports':reports,'old675SubtestNamesPreserved':True,'old683SubtestNamesPreserved':True,'all691SubtestNamesExactToAcceptedCandidate':True,'all76V32TestFilesAndFixtureExact':True,'protectedFilesExactToAcceptedCandidate':257,'old74TestFilesExact':True,'originalStrictGatesPreserved':True,'artifactProgramCodeExecuted':False,'scope':'Official main GitHub workflow, full local candidate AND public HTTPS browser routes. Independent data validation from exact trusted Git source.','localChromiumFailure':'Earlier local environment Chromium trust failure remains preserved separately at /tmp/v31-live-browser-20261030; it is not counted as a passing test or a product regression.','limits':['No physical handset, Safari or low-end GPU/performance benchmark.','Face checkpoint coverage remains the exact events recorded, not all six chapter faces.','Snapshot counts include repeated report occurrences and are not unique animation frames.','Raw PNGs retain original dimensions; manual review is recorded separately after inspecting selected files.','Geometry measurements and later PNGs are not synchronous frames. Old CSS ablation uses current DOM, not an old complete release.','Natural-return sidecar has no bodyIdentity: it proves same run/chapter/deaths and stable coordinates.','Public/candidate are separate routes; use their actual dialogue/announcement visibility, never borrow the accepted candidate timing or coexistence values.','Companion JSON records positions and run IDs, not object identity; shared presentedSoul reference identity belongs to the eight exact original unit tests.','Companion pause raw paired Canvas strings were not retained: successful source assertions and identical recorded states are preserved.','Companion sourceFiles are local execution hashes. Public source identity additionally rests on exact Pages/runtime and fetched public HTML, not merely the page version.']}
(OUT/'independent-main-review.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:summary[k] for k in ['status','runId','commit','artifactId','artifactZipBytes','artifactZipSha256','sourceBlobsExact','runtimeBlobsExact','tests','artifactPaths','originalPNGCount','reports']},ensure_ascii=False))
