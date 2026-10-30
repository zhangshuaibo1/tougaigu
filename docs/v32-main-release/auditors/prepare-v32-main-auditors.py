import ast,hashlib,json
from pathlib import Path

OUT=Path('/tmp/tougaigu-v32-main-40984854669')
OUT.mkdir(exist_ok=True)
COMMIT='93655a7013adb3ecd41f7e1fac6935f7b5464539'
ROOT='/workspace/scratch/2b18af2db412/tougaigu-v32-main-release'
sha=lambda b:hashlib.sha256(b).hexdigest()
adaptations=[]
for kind in ['faces','gates','dialogue']:
    original_path=Path('/tmp/audit-v32-second-'+kind+'.py')
    original=original_path.read_text();adapted=original;changes=[]
    def replace(old,new,expected=None):
        global adapted
        count=adapted.count(old)
        assert count and (expected is None or count==expected),(kind,old,count,expected)
        adapted=adapted.replace(old,new)
        changes.append({'old':old,'new':new,'occurrences':count})
    replace('/workspace/scratch/2b18af2db412/tougaigu-v32-formal',ROOT,1)
    replace('/tmp/tougaigu-v32-second-40982421518',str(OUT),1)
    anchor="OUT="+('Path' if kind=='dialogue' else 'pathlib.Path')+'('+repr(str(OUT))+')'
    extra="\nimport sys\nSCOPE=sys.argv[1]\nassert SCOPE in ['candidate','live']\nSCOPE_DESCRIPTION='GitHub main '+SCOPE+' complete browser route ('+('local candidate server' if SCOPE=='candidate' else 'real https://tougaigu.com/')+')'\n"
    replace(anchor,anchor+extra,1)
    replace('ce412d1298d0060dec08893f9b44cead9693edcf',COMMIT,1)
    replace("OUT/'candidate/report.json'","OUT/SCOPE/'report.json'",0 if kind=='dialogue' else 1) if kind!='dialogue' else None
    replace("OUT/'candidate'","OUT/SCOPE")
    replace("'candidate/'","SCOPE+'/'")
    replace("len(audit['sourceFiles'])==913","len(audit['sourceFiles'])==950",1)
    replace("'runId':40982421518","'runId':40984854669",1)
    if kind!='dialogue':
        replace("assert not (OUT/'live/report.json').exists()","assert (OUT/'candidate/report.json').is_file() and (OUT/'live/report.json').is_file()",1)
    if kind=='faces':
        replace("'scope':'Formal32 corrected second candidate; public release is not part of this run'","'scope':SCOPE_DESCRIPTION",1)
        replace("'sourceFilesExact':913","'sourceFilesExact':950",1)
        replace('at corrected ce412 commit; original face validators identical to 7ba','at main93655 commit, exact to corrected ce412; original face validators identical to 7ba',1)
        replace('No physical phone, Safari, low-end GPU, frame-rate benchmark or public/live verification in this run.','No physical phone, Safari, low-end GPU or frame-rate benchmark in this run; report scope identifies local candidate versus actual public HTTPS.',1)
        replace("OUT/'face-evidence-summary.json'","OUT/(SCOPE+'-face-evidence-summary.json')")
    elif kind=='gates':
        replace("'scope':'Formal32 corrected second candidate real Chromium browser at localhost; no public/live release in this run'","'scope':SCOPE_DESCRIPTION",1)
        replace('This is the second formal32 candidate CI at localhost with 32.0.0 resource versions. Main/Pages publication, HTTPS run and physical-phone/Safari/low-end-GPU evidence remain outside this result.','This is the official main v32 run with 32.0.0 resource versions; scope identifies local candidate or actual public HTTPS. Physical-phone, Safari and low-end-GPU evidence remain outside this result.',1)
        replace("OUT/'inherited-gates-summary.json'","OUT/(SCOPE+'-inherited-gates-summary.json')")
    else:
        replace("assert report['url']=='http://127.0.0.1:8080/'","EXPECTED_URL='http://127.0.0.1:8080/' if SCOPE=='candidate' else 'https://tougaigu.com/?qa='+COMMIT\nassert report['url']==EXPECTED_URL\nAPP_URL='http://127.0.0.1:8080/dream-app.js?v=32.0.0' if SCOPE=='candidate' else 'https://tougaigu.com/dream-app.js?v=32.0.0'",1)
        replace("['http://127.0.0.1:8080/dream-app.js?v=32.0.0']","[APP_URL]",1)
        replace("'scope':'New official corrected candidate full browser route and its own independent six-configuration matrix; not the earlier local 5445 report or live HTTPS.'","'scope':SCOPE_DESCRIPTION+' and its own independent six-configuration matrix; not the earlier local 5445 report.'",1)
        replace("'eventFile':'candidate/1280-greenhouse-return-dialogue-event.json'","'eventFile':SCOPE+'/1280-greenhouse-return-dialogue-event.json'",1)
        replace('No public HTTPS v32 verification, physical handset, Safari, maximum-font/longest-dialogue/high-platform exhaustiveness or performance benchmark in this candidate.','No physical handset, Safari, maximum-font/longest-dialogue/high-platform exhaustiveness or performance benchmark; report scope identifies candidate versus actual public HTTPS.',1)
        replace("OUT/'dialogue-evidence-summary.json'","OUT/(SCOPE+'-dialogue-evidence-summary.json')")
    ast.parse(adapted)
    target=Path('/tmp/audit-v32-main-'+kind+'.py');target.write_text(adapted)
    adaptations.append({'kind':kind,'original':str(original_path),'originalSha256':sha(original.encode()),'adapted':str(target),'adaptedSha256':sha(adapted.encode()),'changes':changes})
record={'runId':40984854669,'commit':COMMIT,'artifactProgramCodeExecuted':False,'reason':'Apply trusted earlier candidate auditors independently to official main local candidate and real HTTPS reports; retain all geometry, timing, body, movement, input, network and face gates.','scopeOnlyChanges':['path/scope/metadata','source count 913 to main 950','require both complete reports','exact expected public origin instead of localhost in live scope','accurate limits and scope text'],'adaptations':adaptations}
(OUT/'auditor-adaptation.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'out':str(OUT),'auditors':[{'path':a['adapted'],'sha256':a['adaptedSha256']} for a in adaptations]}))
