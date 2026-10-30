import ast,hashlib,json
from pathlib import Path
src=Path('/tmp/review-v32-main-artifact.py');text=src.read_text();changes=[]
def replace(a,b,n=None):
    global text
    count=text.count(a);assert count and (n is None or count==n),(a,count,n)
    text=text.replace(a,b);changes.append({'old':a,'new':b,'occurrences':count})
replace('/tmp/tougaigu-v32-main-40984854669','/tmp/tougaigu-v33-main-40988381550')
replace('/workspace/scratch/2b18af2db412/tougaigu-v32-main-release','/workspace/scratch/2b18af2db412/tougaigu-v33-main-release',1)
replace("COMMIT = '93655a7013adb3ecd41f7e1fac6935f7b5464539'","COMMIT = 'be05769a99a807f9396c03084760f8283ce4195e'",1)
replace("CANDIDATE = 'ce412d1298d0060dec08893f9b44cead9693edcf'","CANDIDATE = '1d63072bb9a27690ed14b15d3103c6e8a87fa297'",1)
replace('91ccef79541f2dd061059462c10d60cbecbed144','d997c58b2a846b2673b8baec500db9697a846d7a',1)
replace('3d5e268bbb8bef91b289097cf34f5012bbc08cd3','5516892f4242d34b052630b5274641d3f8f27a91',1)
replace('321e762d63088910a73b60a9b3cc7fb5344e8f9d','ef9072b947447304f4561855a8db58fb7fc42211',1)
replace('40984854669','40988381550',1)
replace("['75010ca44245e05cf44187768722081d244f39f4','ce412d1298d0060dec08893f9b44cead9693edcf']","['93655a7013adb3ecd41f7e1fac6935f7b5464539','1d63072bb9a27690ed14b15d3103c6e8a87fa297']",1)
replace('== 950','== 1138')
replace("'sourceBlobsExact':950","'sourceBlobsExact':1138",1)
replace('== 143','== 144',1)
replace("'runtimeBlobsExact':143","'runtimeBlobsExact':144",1)
replace('all143RuntimePathsAndModesMatchPages','all144RuntimePathsAndModesMatchPages',1)
replace('protectedScopesIdenticalToCandidateCE412','protectedScopesIdenticalToCandidate1d63072',1)
replace("{'tests':683,'pass':683,'fail':0,'skipped':0,'cancelled':0,'todo':0}","{'tests':691,'pass':691,'fail':0,'skipped':0,'cancelled':0,'todo':0}",1)
replace("accepted_tap=(pathlib.Path('/tmp/tougaigu-v32-second-40982421518')/'tests.txt').read_text()","accepted_tap=(pathlib.Path('/tmp/tougaigu-v33-candidate-40984114609')/'tests.txt').read_text()",1)
replace('sum(new_names.values())==683','sum(new_names.values())==691',1)
anchor='assert len(old_test_entries)==74'
additional="""
v32_tap=(pathlib.Path('/tmp/tougaigu-v32-second-40982421518')/'tests.txt').read_text()
v32_names=Counter(re.findall(pattern,v32_tap,re.M))
assert sum(v32_names.values())==683 and not (v32_names-new_names)
v32_test_entries=[]
for row in git('ls-tree','-rz','ce412d1298d0060dec08893f9b44cead9693edcf','--','tests').split(b'\\0'):
    if not row:continue
    meta,path=row.split(b'\\t',1);mode,kind,h=meta.decode().split();path=path.decode()
    assert kind=='blob' and path in tree and tree[path]['sha']==h and tree[path]['mode']==mode
    v32_test_entries.append(path)
assert len(v32_test_entries)==77 and sum(p.endswith('.test.mjs') for p in v32_test_entries)==76
assert sum(p.startswith(('dist/','scripts/','tests/','.github/')) or p=='package.json' for p in tree)==257
assert sum(p.startswith('tests/') and p.endswith('.test.mjs') for p in tree)==77
assert git('show',COMMIT+':dist/CNAME')==b'tougaigu.com\\n'
"""
replace(anchor,anchor+'\n'+additional,1)
replace("c['version']=='32.0.0'","c['version']=='33.0.0'",1)
anchor="assert dialogue['naturalReturn']['bodyObjectIdentityRecorded'] is False"
extra="""
    companion=json.loads((OUT/(scope+'-companion-evidence-summary.json')).read_text())
    assert companion['status']=='passed' and companion['version']=='33.0.0'
    assert len(companion['cases'])==3 and companion['originalPNGCount']==21
    assert [x['viewport']['width'] for x in companion['cases']]==[1280,390,320]
    assert all(x['status']=='passed' and x['zeroDeathsAndPageHTTPNetworkErrors'] and x['onlyFirstTicketCollected'] and x['noChapterSettled'] for x in companion['cases'])
"""
replace(anchor,anchor+'\n'+extra,1)
replace("'inheritedGateAudit':scope+'-inherited-gates-summary.json'","'inheritedGateAudit':scope+'-inherited-gates-summary.json','companionAudit':scope+'-companion-evidence-summary.json','companionReportSha256':companion['reportSha256'],'companionElapsedSeconds':companion['elapsedSeconds'],'companionCases':companion['cases'],'companionSnapshotOccurrences':companion['snapshotOccurrencesRevalidated'],'companionOriginalPNGCount':21",1)
replace("'all683SubtestNamesExactToAcceptedCandidate':True","'old683SubtestNamesPreserved':True,'all691SubtestNamesExactToAcceptedCandidate':True,'all76V32TestFilesAndFixtureExact':True,'protectedFilesExactToAcceptedCandidate':257",1)
replace("'Public/candidate are separate routes; use their actual dialogue/announcement visibility, never borrow the accepted candidate timing or coexistence values.'","'Public/candidate are separate routes; use their actual dialogue/announcement visibility, never borrow the accepted candidate timing or coexistence values.','Companion JSON records positions and run IDs, not object identity; shared presentedSoul reference identity belongs to the eight exact original unit tests.','Companion pause raw paired Canvas strings were not retained: successful source assertions and identical recorded states are preserved.','Companion sourceFiles are local execution hashes. Public source identity additionally rests on exact Pages/runtime and fetched public HTML, not merely the page version.'",1)
ast.parse(text);target=Path('/tmp/review-v33-main-artifact.py');target.write_text(text)
out=Path('/tmp/tougaigu-v33-main-40988381550');p=out/'auditor-adaptation.json';d=json.loads(p.read_text())
d['reviewAdaptation']={'original':str(src),'originalSha256':hashlib.sha256(src.read_bytes()).hexdigest(),'adapted':str(target),'adaptedSha256':hashlib.sha256(target.read_bytes()).hexdigest(),'changes':changes,'notes':['Require exact main/accepted33 protected source and current Pages/runtime identity.','Preserve original675 and683 TAP names plus exact691 names from accepted33.','All old74/v32 76 test files and fixture exact; current77 test files.','Face PNGs retain all11 required names and validate an actual optional first-lamp freeJoy latch instead of borrowing prior-run count.','Add both exact three-case companion reports and original21 PNG validations.']}
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'target':str(target),'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}))
