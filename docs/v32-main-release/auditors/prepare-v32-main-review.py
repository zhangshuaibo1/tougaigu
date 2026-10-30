import ast,hashlib,json
from pathlib import Path
src=Path('/tmp/review-v31-main-artifact.py')
text=src.read_text();changes=[]
def replace(a,b,n=None):
    global text
    count=text.count(a)
    assert count and (n is None or count==n),(a,count,n)
    text=text.replace(a,b);changes.append({'old':a,'new':b,'occurrences':count})
replace('/tmp/tougaigu-v31-main-40978620156','/tmp/tougaigu-v32-main-40984854669')
replace('/workspace/scratch/2b18af2db412/tougaigu-v31-release','/workspace/scratch/2b18af2db412/tougaigu-v32-main-release',1)
replace('75010ca44245e05cf44187768722081d244f39f4','93655a7013adb3ecd41f7e1fac6935f7b5464539',1)
replace('7ba7c5e00a6a32032e5becf5131a527322d03ac3','ce412d1298d0060dec08893f9b44cead9693edcf',1)
replace('6e716a8c40e5ad0b917f3b3e85fe86f7b09a9241','91ccef79541f2dd061059462c10d60cbecbed144',1)
replace('f418c649635f0dc3f55679dd9d7b973bb34ef40a','3d5e268bbb8bef91b289097cf34f5012bbc08cd3',1)
replace('89c590e390f02c089b67cfa6f3539c35fa836201','321e762d63088910a73b60a9b3cc7fb5344e8f9d',1)
replace('40978620156','40984854669',1)
replace("['26a3fe6b9b73f597f8107f6f7e80e551f7aee9eb','12f60683c4325a83585d2e07f4c0bf825ba03050']","['75010ca44245e05cf44187768722081d244f39f4','ce412d1298d0060dec08893f9b44cead9693edcf']",1)
replace('== 797','== 950')
replace("'sourceBlobsExact':797","'sourceBlobsExact':950",1)
replace("{'tests':675,'pass':675,'fail':0,'skipped':0,'cancelled':0,'todo':0}","{'tests':683,'pass':683,'fail':0,'skipped':0,'cancelled':0,'todo':0}",1)
replace("c['version']=='31.0.0'","c['version']=='32.0.0'",1)
replace('protectedScopesIdenticalToCandidate7ba','protectedScopesIdenticalToCandidateCE412',1)
replace("assert len(faces['uniqueCapturedCanvasFiles'])==11","""baseline_faces=json.loads((pathlib.Path('/tmp/tougaigu-v32-second-40982421518')/'face-evidence-summary.json').read_text())
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
""",1)
anchor="assert not audit['failureEvidence']"
old_tests="""
from collections import Counter
pattern=r'^# Subtest: (.*)$'
old_tap=(pathlib.Path('/tmp/tougaigu-v31-main-40978620156')/'tests.txt').read_text()
accepted_tap=(pathlib.Path('/tmp/tougaigu-v32-second-40982421518')/'tests.txt').read_text()
main_tap=(OUT/'tests.txt').read_text()
old_names=Counter(re.findall(pattern,old_tap,re.M));new_names=Counter(re.findall(pattern,main_tap,re.M))
assert sum(old_names.values())==675 and not (old_names-new_names)
assert sum(new_names.values())==683 and new_names==Counter(re.findall(pattern,accepted_tap,re.M))
old_test_tree=git('ls-tree','-rz','75010ca44245e05cf44187768722081d244f39f4','--','tests')
old_test_entries=[]
for row in old_test_tree.split(b'\\0'):
    if not row:continue
    meta,path=row.split(b'\\t',1);mode,kind,h=meta.decode().split();path=path.decode()
    assert kind=='blob' and path in tree and tree[path]['sha']==h and tree[path]['mode']==mode
    old_test_entries.append(path)
assert len(old_test_entries)==74
"""
replace(anchor,anchor+'\n'+old_tests,1)
anchor="assert gates['delayedResourcesAndLateIsolationRechecked']"
dialogue="""
    dialogue=json.loads((OUT/(scope+'-dialogue-evidence-summary.json')).read_text())
    assert dialogue['status']=='passed' and dialogue['matrix']['caseCount']==6
    assert dialogue['matrix']['immediateJSONCount']==12 and dialogue['matrix']['originalPNGCount']==12
    assert len(dialogue['greenhouseObservations'])==2
    assert dialogue['naturalReturn']['exactlyOneTrustedE'] and dialogue['naturalReturn']['observerRemoved']
    assert dialogue['naturalReturn']['bodyObjectIdentityRecorded'] is False
"""
replace(anchor,anchor+'\n'+dialogue,1)
anchor="'inheritedGateAudit':scope+'-inherited-gates-summary.json'"
replace(anchor,anchor+",'dialogueAudit':scope+'-dialogue-evidence-summary.json','matrixConfigurations':6,'matrixImmediateJSONs':12,'matrixRawPNGs':12,'matrixMaxCanvasControlDelta':dialogue['matrix']['maxPairedCanvasControlRectDeltaCssPx'],'naturalReturnValidation':dialogue['naturalReturn']['validation'],'greenhouseVisibility':[{'label':x['label'],'bubble':x['actualVisibleDialogue'],'announcement':x['actualAnnouncementVisible']} for x in dialogue['greenhouseObservations']]",1)
replace("'faceCheckpointCount':faces['faceCheckpointCount']","'faceCheckpointCount':faces['faceCheckpointCount'],'actualCapturedFacePNGs':len(actual_face_images),'requiredPrior11FacePNGsAllPresent':True,'additionalSourceValidatedFacePNGs':sorted(optional_face_images)",1)
replace("'originalStrictGatesPreserved':True","'old675SubtestNamesPreserved':True,'all683SubtestNamesExactToAcceptedCandidate':True,'old74TestFilesExact':True,'originalStrictGatesPreserved':True",1)
replace("'Raw PNGs retain original dimensions; manual review is recorded separately after inspecting selected files.'","'Raw PNGs retain original dimensions; manual review is recorded separately after inspecting selected files.','Geometry measurements and later PNGs are not synchronous frames. Old CSS ablation uses current DOM, not an old complete release.','Natural-return sidecar has no bodyIdentity: it proves same run/chapter/deaths and stable coordinates.','Public/candidate are separate routes; use their actual dialogue/announcement visibility, never borrow the accepted candidate timing or coexistence values.'",1)
ast.parse(text)
target=Path('/tmp/review-v32-main-artifact.py');target.write_text(text)
out=Path('/tmp/tougaigu-v32-main-40984854669')
p=out/'auditor-adaptation.json';record=json.loads(p.read_text())
record['reviewAdaptation']={'original':str(src),'originalSha256':hashlib.sha256(src.read_bytes()).hexdigest(),'adapted':str(target),'adaptedSha256':hashlib.sha256(target.read_bytes()).hexdigest(),'changes':changes,'newChecks':['Original 675 names and 74 test files','Exact 683 names to accepted v32','Both v32 six-layout matrix and natural-return summaries','All prior 11 face PNG names required; only an actual source-validated optional first-lamp freeJoy latch may add a twelfth PNG. Dynamic metadata count does not relax any original production validator.'],'optionalImageMetadataReason':'An independently audited v33 run observed a legitimate first-lamp freeJoy RAF before the existing E; the existing sampler can save it, so a prior-run fixed count is not a product contract. This preparation does not assert that the new v32 main actually has that optional image.'}
p.write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'script':str(target),'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}))
