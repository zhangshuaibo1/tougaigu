import ast,hashlib,json
from pathlib import Path

OUT=Path('/tmp/tougaigu-v33-main-40988381550');OUT.mkdir(exist_ok=True)
ROOT='/workspace/scratch/2b18af2db412/tougaigu-v33-main-release'
COMMIT='be05769a99a807f9396c03084760f8283ce4195e'
sha=lambda b:hashlib.sha256(b).hexdigest();adaptations=[]
for kind in ['faces','gates','dialogue','companion']:
    original_path=Path('/tmp/audit-v33-candidate-'+kind+'.py')
    original=original_path.read_text();adapted=original;changes=[]
    def replace(old,new,expected=None):
        global adapted
        count=adapted.count(old)
        assert count and (expected is None or count==expected),(kind,old,count,expected)
        adapted=adapted.replace(old,new);changes.append({'old':old,'new':new,'occurrences':count})
    replace('/workspace/scratch/2b18af2db412/tougaigu-v33-formal',ROOT,1)
    replace('/tmp/tougaigu-v33-candidate-40984114609',str(OUT),1)
    anchor='OUT='+('pathlib.Path' if kind in ['faces','gates'] else 'Path')+'('+repr(str(OUT))+')'
    extra="\nimport sys\nSCOPE=sys.argv[1]\nassert SCOPE in ['candidate','live']\nSCOPE_DESCRIPTION='GitHub main '+SCOPE+' complete browser route ('+('local candidate server' if SCOPE=='candidate' else 'real https://tougaigu.com/')+')'\n"
    replace(anchor,anchor+extra,1)
    replace('1d63072bb9a27690ed14b15d3103c6e8a87fa297',COMMIT,1)
    replace("len(audit['sourceFiles'])==996","len(audit['sourceFiles'])==1138",1)
    replace("'runId':40984114609","'runId':40988381550",1)
    if kind in ['faces','gates','companion']:
        replace("OUT/'candidate/report.json'","OUT/SCOPE/'report.json'",1)
    if kind in ['faces','gates','dialogue']:
        replace("OUT/'candidate'","OUT/SCOPE")
        replace("'candidate/'","SCOPE+'/'")
    if kind in ['faces','gates']:
        replace("assert not (OUT/'live/report.json').exists()","assert (OUT/'candidate/report.json').is_file() and (OUT/'live/report.json').is_file()",1)
    if kind=='faces':
        replace("'scope':'Formal33 companion candidate; public release is not part of this run'","'scope':SCOPE_DESCRIPTION",1)
        replace("'sourceFilesExact':996","'sourceFilesExact':1138",1)
        replace('at v33 1d63072 commit; original face validators identical to 7ba','at v33 main be05769 commit, exact to accepted 1d63072; original face validators identical to 7ba',1)
        replace('No physical phone, Safari, low-end GPU, frame-rate benchmark or public/live verification in this run.','No physical phone, Safari, low-end GPU or frame-rate benchmark; report scope identifies local candidate versus actual public HTTPS.',1)
        replace("OUT/'face-evidence-summary.json'","OUT/(SCOPE+'-face-evidence-summary.json')")
    elif kind=='gates':
        replace("'scope':'Formal33 companion candidate real Chromium browser at localhost; no public/live release in this run'","'scope':SCOPE_DESCRIPTION",1)
        replace('This is the formal33 companion candidate CI at localhost with 33.0.0 resource versions. Main/Pages publication, HTTPS run and physical-phone/Safari/low-end-GPU evidence remain outside this result.','This is the official main v33 run with 33.0.0 resource versions; scope identifies local candidate or actual public HTTPS. Physical-phone, Safari and low-end-GPU evidence remain outside this result.',1)
        replace("OUT/'inherited-gates-summary.json'","OUT/(SCOPE+'-inherited-gates-summary.json')")
    elif kind=='dialogue':
        replace("assert report['url']=='http://127.0.0.1:8080/'","EXPECTED_URL='http://127.0.0.1:8080/' if SCOPE=='candidate' else 'https://tougaigu.com/?qa='+COMMIT\nassert report['url']==EXPECTED_URL\nAPP_URL='http://127.0.0.1:8080/dream-app.js?v=33.0.0' if SCOPE=='candidate' else 'https://tougaigu.com/dream-app.js?v=33.0.0'",1)
        replace("['http://127.0.0.1:8080/dream-app.js?v=33.0.0']","[APP_URL]",1)
        replace("'scope':'New official v33 companion candidate full browser route and its own independent six-configuration matrix; not the earlier local 5445 report or live HTTPS.'","'scope':SCOPE_DESCRIPTION+' and its own independent six-configuration matrix; not the earlier local 5445 report.'",1)
        replace("'eventFile':'candidate/1280-greenhouse-return-dialogue-event.json'","'eventFile':SCOPE+'/1280-greenhouse-return-dialogue-event.json'",1)
        replace('No public HTTPS v33 verification, physical handset, Safari, maximum-font/longest-dialogue/high-platform exhaustiveness or performance benchmark in this candidate.','No physical handset, Safari, maximum-font/longest-dialogue/high-platform exhaustiveness or performance benchmark; report scope identifies candidate versus actual public HTTPS.',1)
        replace("OUT/'dialogue-evidence-summary.json'","OUT/(SCOPE+'-dialogue-evidence-summary.json')")
    else:
        replace("OUT/'candidate/companion/report.json'","OUT/SCOPE/'companion/report.json'",1)
        replace("zipmap['candidate/companion/report.json']","zipmap[SCOPE+'/companion/report.json']",1)
        replace("assert report['baselineURL'] is None and report['currentURL']==main['url']=='http://127.0.0.1:8080/'","EXPECTED_URL='http://127.0.0.1:8080/' if SCOPE=='candidate' else 'https://tougaigu.com/?qa='+COMMIT\nassert report['baselineURL'] is None and report['currentURL']==main['url']==EXPECTED_URL",1)
        replace('relative=f"candidate/companion/{width}/{item[\'file\']}"','relative=f"{SCOPE}/companion/{width}/{item[\'file\']}"',1)
        replace("n.startswith('candidate/companion/')","n.startswith(SCOPE+'/companion/')",2)
        replace("'version':'33.0.0',\n 'reportBytes'","'version':'33.0.0','scope':SCOPE_DESCRIPTION,\n 'reportBytes'",1)
        replace('No physical handset, Safari, device performance or exhaustive outfit/activity coverage; no public HTTPS in this candidate.','No physical handset, Safari, device performance or exhaustive outfit/activity coverage; report scope identifies candidate versus actual public HTTPS.',1)
        replace("'sourceFilesExactToPrimaryGit':report['sourceFiles']","'sourceFilesExactToPrimaryGit':report['sourceFiles'],'sourceFilesScope':report['sourceFilesScope']",1)
        replace("OUT/'companion-evidence-summary.json'","OUT/(SCOPE+'-companion-evidence-summary.json')")
    ast.parse(adapted)
    target=Path('/tmp/audit-v33-main-'+kind+'.py');target.write_text(adapted)
    adaptations.append({'kind':kind,'original':str(original_path),'originalSha256':sha(original.encode()),'adapted':str(target),'adaptedSha256':sha(adapted.encode()),'changes':changes})
record={'runId':40988381550,'commit':COMMIT,'artifactProgramCodeExecuted':False,'reason':'Apply accepted v33 candidate data auditors independently to main candidate and true public HTTPS; preserve all original face, input, movement, time, geometry, network and companion validators.','scopeOnlyChanges':['path/scope/metadata','source count 996 to main 1138','require both complete reports','exact expected public origin and query SHA for live','accurate coverage limits and local file-hash provenance'],'adaptations':adaptations}
(OUT/'auditor-adaptation.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'out':str(OUT),'auditors':[{'path':a['adapted'],'sha256':a['adaptedSha256']} for a in adaptations]}))
