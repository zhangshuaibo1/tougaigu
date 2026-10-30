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

OUT = pathlib.Path('/tmp/tougaigu-v31-main-40978620156')
ZIP = pathlib.Path('/tmp/tougaigu-v31-main-40978620156.zip')
ROOT = pathlib.Path('/workspace/scratch/2b18af2db412/tougaigu-v31-release')
COMMIT = '75010ca44245e05cf44187768722081d244f39f4'
CANDIDATE = '7ba7c5e00a6a32032e5becf5131a527322d03ac3'
PAGES = '6e716a8c40e5ad0b917f3b3e85fe86f7b09a9241'
TREE = 'f418c649635f0dc3f55679dd9d7b973bb34ef40a'
PAGES_TREE = '89c590e390f02c089b67cfa6f3539c35fa836201'
sha = lambda b: hashlib.sha256(b).hexdigest()
blob = lambda b: hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
git = lambda *args: subprocess.check_output(['git', *args], cwd=ROOT)
official = json.loads((OUT/'official-metadata.json').read_text())
run = official['run']
assert run['id'] == 40978620156 and run['head_sha'] == COMMIT
assert run['head_branch'] == 'main' and run['event'] == 'push'
assert run['status'] == 'completed' and run['conclusion'] == 'success'
assert run['run_attempt'] == 1
assert official['commit']['sha'] == COMMIT and official['commit']['tree']['sha'] == TREE
assert [p['sha'] for p in official['commit']['parents']] == ['26a3fe6b9b73f597f8107f6f7e80e551f7aee9eb','12f60683c4325a83585d2e07f4c0bf825ba03050']
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
assert len(tree) == 797 and primary['tree'] == TREE
runtime = {p[5:]:v for p,v in tree.items() if p.startswith('dist/')}
assert len(runtime) == 143
pages = official['pagesTree']
assert pages['sha'] == PAGES_TREE and not pages['truncated']
pageblobs = {x['path']:x for x in pages['tree'] if x['type']=='blob'}
assert set(pageblobs) == set(runtime)|{'.nojekyll'}
assert pageblobs['.nojekyll']['sha'] == blob(b'') and pageblobs['.nojekyll']['mode'] == '100644'
for p,v in runtime.items():
    assert (v['sha'],v['mode']) == (pageblobs[p]['sha'],pageblobs[p]['mode']), p
audit = json.loads((OUT/'artifact-audit.json').read_text())
assert audit['commit'] == COMMIT and len(audit['sourceFiles']) == 797
assert audit['tests'] == {'tests':675,'pass':675,'fail':0,'skipped':0,'cancelled':0,'todo':0}
assert not audit['failureEvidence']
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
source_record={'commit':COMMIT,'tree':TREE,'sourceBlobs':len(tree),'runtimeBlobs':len(runtime),'allArchivePathsUnique':True,'allSourceContentAndExecutableModesMatch':True,'protectedScopesIdenticalToCandidate7ba':True,'pagesHead':PAGES,'pagesTree':PAGES_TREE,'all143RuntimePathsAndModesMatchPages':True,'publicIndex':public_index_record,'sourceFiles':source_integrity}
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
        assert c['version']=='31.0.0' and c['noHorizontalOverflow'] and c['finalImagesLoaded']
        assert not c['pageErrors'] and not c['httpErrors']
        assert len(c['networkFailures']['actual'])==count
        assert c['networkFailures']['actual']==c['networkFailures']['expected']
        assert c['networkFailures']['exactMatch']
    faces=json.loads((OUT/(scope+'-face-evidence-summary.json')).read_text())
    gates=json.loads((OUT/(scope+'-inherited-gates-summary.json')).read_text())
    assert faces['faceCheckpointCount']==10 and faces['uniqueObserverCount']==5
    assert len(faces['uniqueCapturedCanvasFiles'])==11
    assert gates['recordCounts']['maxActualPlantedWorldSoleError']<=1e-6
    assert len(gates['jumps'])==6 and len(gates['postRoutes'])==4
    assert len(gates['phoneEndings'])==6 and len(gates['desktopEndingCombinations'])==4
    assert len(gates['standaloneEvidenceComparisons'])==26
    assert gates['sameBodyContinuousMushroomValidatorsRechecked']==4
    assert gates['delayedResourcesAndLateIsolationRechecked']
    reports.append({'scope':scope,'url':report['url'],'bytes':len(raw),'sha256':sha(raw),'viewports':[c['viewport'] for c in report['cases']],'expectedFailureCounts':[9,0,0],'unexpectedNetworkFailures':0,'pageErrors':0,'httpErrors':0,'faceCheckpointCount':faces['faceCheckpointCount'],'faceSnapshotOccurrences':faces['snapshotsRevalidatedOccurrences'],'poseSnapshotOccurrences':gates['recordCounts']['snapshotOccurrencesRevalidated'],'completePostRoutes':4,'phoneEndingReadings':6,'desktopEndingCombinations':4,'jumpRecords':6,'fatigue':faces['fatigue'],'faceAudit':scope+'-face-evidence-summary.json','inheritedGateAudit':scope+'-inherited-gates-summary.json'})
summary={'reviewedAt':datetime.now(timezone.utc).isoformat(),'status':'passed','runId':run['id'],'runUrl':run['html_url'],'commit':COMMIT,'tree':TREE,'pagesHead':PAGES,'pagesTree':PAGES_TREE,'artifactId':artifact['id'],'artifactZipBytes':audit['zipBytes'],'artifactZipSha256':audit['zipSha256'],'sourceBlobsExact':797,'runtimeBlobsExact':143,'tests':audit['tests'],'artifactPaths':len(audit['zipFiles']),'originalPNGCount':len(png_inventory),'sourceArchiveModesAlsoChecked':True,'publicIndex':public_index_record,'reports':reports,'originalStrictGatesPreserved':True,'artifactProgramCodeExecuted':False,'scope':'Official main GitHub workflow, full local candidate AND public HTTPS browser routes. Independent data validation from exact trusted Git source.','localChromiumFailure':'Earlier local environment Chromium trust failure remains preserved separately at /tmp/v31-live-browser-20261030; it is not counted as a passing test or a product regression.','limits':['No physical handset, Safari or low-end GPU/performance benchmark.','Face checkpoint coverage remains the exact events recorded, not all six chapter faces.','Snapshot counts include repeated report occurrences and are not unique animation frames.','Raw PNGs retain original dimensions; manual review is recorded separately after inspecting selected files.']}
(OUT/'independent-main-review.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:summary[k] for k in ['status','runId','commit','artifactId','artifactZipBytes','artifactZipSha256','sourceBlobsExact','runtimeBlobsExact','tests','artifactPaths','originalPNGCount','reports']},ensure_ascii=False))
