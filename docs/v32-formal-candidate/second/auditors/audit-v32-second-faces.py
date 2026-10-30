import ast,base64,collections,hashlib,json,math,pathlib,struct,subprocess
ROOT=pathlib.Path('/workspace/scratch/2b18af2db412/tougaigu-v32-formal')
OUT=pathlib.Path('/tmp/tougaigu-v32-second-40982421518')
OFFICIAL=json.loads((OUT/'official-metadata.json').read_text())
EXPECTED='ce412d1298d0060dec08893f9b44cead9693edcf'
source=subprocess.check_output(['git','show',EXPECTED+':scripts/browser_face_v31.py'],cwd=ROOT).decode()
assert source==subprocess.check_output(['git','show',EXPECTED+':scripts/browser_face_v31.py'],cwd=ROOT).decode()
names={'_close','_clamp','validate_face_snapshot','validate_face_record'}
nodes=[n for n in ast.parse(source).body if isinstance(n,ast.FunctionDef) and n.name in names]
assert {n.name for n in nodes}==names
ns={'math':math};exec(compile(ast.Module(body=nodes,type_ignores=[]),str(ROOT/'scripts/browser_face_v31.py'),'exec'),ns)
validate_record=ns['validate_face_record'];validate_snapshot=ns['validate_face_snapshot']
sha=lambda b:hashlib.sha256(b).hexdigest()
raw=(OUT/'candidate/report.json').read_bytes();report=json.loads(raw);audit=json.loads((OUT/'artifact-audit.json').read_text());assert audit['commit']==EXPECTED and len(audit['sourceFiles'])==913
assert len(report['cases'])==3;assert not (OUT/'live/report.json').exists()
zipmap={x['path']:x for x in audit['zipFiles']}
expected_files={
 '1280-face-ticket-collected.json',
 '1280-face-fatigue-soul-low-energy.json','1280-face-fatigue-body-tired-open.json','1280-face-fatigue-phone-low-energy.json','1280-face-fatigue-returned.json',
 '1280-first-lamp-face-lamp-returned.json',
 '390-face-ticket-collected.json','390-face-ticket-returned.json','320-face-ticket-collected.json','320-face-ticket-returned.json'}
# Revalidate actual production face snapshots wherever the complete journey kept them.
full_fields={'facePresentation','mode','chapterIndex','body','energy','maxEnergy','emoteTime','capPhase','capAge','capAmount','memoryFlags','lampFlags','memories','seals','form','visualTime','reducedMotion','characterPose'}
journey_counts=collections.Counter();journey_kinds=collections.Counter();journey_total=0
journey_stack=[report]
while journey_stack:
 obj=journey_stack.pop()
 if isinstance(obj,dict):
  if full_fields.issubset(obj):
   checked=validate_snapshot(obj);journey_total+=1;journey_counts[str(obj['chapterIndex'])]+=1
   journey_kinds[(str(obj['chapterIndex']),str(checked['body']),obj['reducedMotion'])]+=1
  journey_stack.extend(obj.values())
 elif isinstance(obj,list):journey_stack.extend(obj)
assert journey_total>0  # Report pose records are compact; validate only full face snapshots actually retained.
records=[];images={};groups=collections.defaultdict(list);found=set();festival=[]
for case in report['cases']:
 assert case['version']=='32.0.0'
 for entry in case['faceObservations']:
  filename=entry['file'];assert filename in expected_files and filename not in found;found.add(filename)
  path=OUT/'candidate'/filename;record=json.loads(path.read_text());assert record['status']=='passed' and not record['error'];assert not record['violations'];assert not record.get('cleanupError')
  assert record['kind']==entry['kind'] and record['phase']==entry['phase'] and record['validation']==entry['validation']
  assert sha(path.read_bytes())==zipmap['candidate/'+filename]['sha256']
  for name,image in record['images'].items():
   imagefile=image['file'];assert pathlib.PurePosixPath(imagefile).name==imagefile
   pixels=(OUT/'candidate'/imagefile).read_bytes();assert pixels.startswith(b'\x89PNG\r\n\x1a\n');w,h=struct.unpack('>II',pixels[16:24]);assert (w,h)==(image['width'],image['height'])
   assert sha(pixels)==zipmap['candidate/'+imagefile]['sha256']
   assert image['sequence']==record['latches'][name]['sequence'];assert image['viewport']==record['latches'][name]['viewport']
   assert image['source']=='unmodified current Canvas pixels; one RAF observation, no render call'
   image['png']='data:image/png;base64,'+base64.b64encode(pixels).decode()
   im={'file':imagefile,'bytes':len(pixels),'sha256':sha(pixels),'width':w,'height':h,'viewport':image['viewport'],'sequence':image['sequence'],'unmodifiedArtifactCanvas':True,'manuallyViewed':False}
   if imagefile in images:assert images[imagefile]==im
   else:images[imagefile]=im
  checked=validate_record(record,entry['validation']['requiredObserved']);assert checked==entry['validation']
  snaps=[record['initial'],record['last'],*record['samples'],*(e['snapshot'] for e in record['events'])]
  for name,s in record['latches'].items():snaps.extend([s['before'],s['after']] if name=='event' else [s])
  for s in snaps:validate_snapshot(s)
  group=(record['label'],record['kind'],record['startedAt']);groups[group].append(record)
  latches={}
  for name,s in record['latches'].items():
   if name=='event':
    latches[name]={'beforeSequence':s['before']['sequence'],'afterSequence':s['after']['sequence'],'beforeMemory':s['before']['memories'],'afterMemory':s['after']['memories'],'beforeSeals':s['before']['seals'],'afterSeals':s['after']['seals'],'actualEventRemainingSeconds':s['after']['emoteTime']}
   else:
    latches[name]={'sequence':s['sequence'],'observedMsAfterInstall':s['observedAt']-record['startedAt'],'viewport':s['viewport'],'source':s['source'],'form':s['form'],'capPhase':s['capPhase'],'bodyFace':s['facePresentation']['body']['kind'],'soulJoy':s['facePresentation']['soulJoy'],'energy':s['energy'],'emoteRemainingSeconds':s['emoteTime'],'bodyBlink':s['facePresentation']['body']['blink'],'actualSoulPose':s['facePresentation']['presentedSoul']['pose'] if s['facePresentation']['presentedSoul'] else None,'actualSoulLayer':s['facePresentation']['presentedSoul']['layer'] if s['facePresentation']['presentedSoul'] else None}
  actions=[{'action':e['action'],'type':e['type'],'targetId':e['targetId'],'code':e['code'],'sequence':e['sequence'],'isTrusted':e['isTrusted'],'observedMsAfterInstall':e['observedAt']-record['startedAt'],'pointerId':e['pointerId'],'pointerType':e['pointerType']} for e in record['events'] if e['action']]
  records.append({'file':filename,'kind':record['kind'],'phase':record['phase'],'label':record['label'],'status':'passed','sameRunId':record['initial']['runId'],'sameBodyIdentity':record['initial']['bodyIdentity'],'framesObserved':record['frames'],'retainedSnapshots':len(record['samples']),'snapshotOccurrencesRevalidated':len(snaps),'nativeEventCount':len(record['events']),'actualActions':actions,'latches':latches,'cleanup':record['cleanup'],'validationRecomputedExact':True,'rawBytes':path.stat().st_size,'rawSha256':sha(path.read_bytes())})
 width=case['viewport']['width']
 if width in [390,320]:
  filename=str(width)+'-face-festival-exclusion.json';f=json.loads((OUT/'candidate'/filename).read_text());assert f=={'festivalId':'halloween','face':{'eligible':False,'body':None,'soulJoy':False},'scope':'actual existing visit; other nine festivals remain pure coverage'}
  matches=[]
  def walk(o):
   if isinstance(o,dict):
    if 'faceRefinementExcluded' in o:matches.append(o['faceRefinementExcluded'])
    for v in o.values():walk(v)
   elif isinstance(o,list):
    for v in o:walk(v)
  walk(case);assert matches==[f['face']]
  festival.append({'width':width,'file':filename,'festivalId':'halloween','actualExclusionSummaryMatchesReport':True,'rawSnapshotRetained':False,'scope':'actual original browser visit; other nine festivals remain pure checks'})
assert found==expected_files and len(groups)==5
actual_files={p.name for p in (OUT/'candidate').glob('*-face-*.json')};assert actual_files==expected_files|{'390-face-festival-exclusion.json','320-face-festival-exclusion.json'}
cleanup=[]
for (label,kind,started),group in groups.items():
 finishes=[r for r in group if r['cleanup']['requested']];assert len(finishes)==1
 done=finishes[0];assert done['reason']=='cleanup' and not done['active'];assert done['cleanup']=={'requested':True,'stopped':True,'removed':True}
 for rec in group:
  if rec is done:continue
  assert rec['cleanup']=={'requested':False,'stopped':False,'removed':False} and rec['active'] and rec['reason'] is None
 cleanup.append({'label':label,'kind':kind,'checkpoints':len(group),'finalPhase':done['phase'],'framesObserved':done['frames'],'observerElapsedMs':done['observedAt']-started,'limitMs':done['limitMs'],'stoppedAndRemoved':True,'intermediateCheckpointsCorrectlyLeftObserverRunning':True})
fatigue=next(r for r in records if r['kind']=='fatigue' and r['phase']=='returned');assert fatigue['latches']['bodyTiredOpen']['observedMsAfterInstall']<=21000
summary={'runId':40982421518,'commit':EXPECTED,'version':'32.0.0','scope':'Formal32 corrected second candidate; public release is not part of this run','artifactId':OFFICIAL['artifacts']['artifacts'][0]['id'],'zipBytes':audit['zipBytes'],'zipSha256':audit['zipSha256'],'sourceFilesExact':913,'artifactPaths':len(audit['zipFiles']),'tests':audit['tests'],'rawReportBytes':len(raw),'rawReportSha256':sha(raw),'faceCheckpointCount':len(records),'uniqueObserverCount':len(groups),'snapshotsRevalidatedOccurrences':sum(r['snapshotOccurrencesRevalidated'] for r in records),'journeyFaceSnapshotOccurrences':journey_total,'journeyFaceByChapter':dict(journey_counts),'journeyFaceKinds':[{'chapterIndex':int(k[0]),'bodyFace':k[1],'reducedMotion':k[2],'occurrences':v} for k,v in sorted(journey_kinds.items())],'checkpointRecords':records,'observerCleanup':cleanup,'uniqueCapturedCanvasFiles':list(images.values()),'festivalExclusions':festival,'fatigue':{'sharedDeadlineMs':21000,'actualBodyTiredFirstCaptureMs':fatigue['latches']['bodyTiredOpen']['observedMsAfterInstall'],'actualEnergyAtFirstBodyTired':fatigue['latches']['bodyTiredOpen']['energy'],'observerLifecycleMs':27000,'scope':'form=soul, capPhase=open; not closed-lid fatigue proof','recoveryNeutralEnergy':fatigue['latches']['recovered']['energy']},'artifactCodeExecuted':False,'validatorSource':'exact primary Git scripts/browser_face_v31.py at corrected ce412 commit; original face validators identical to 7ba; pure functions only','limits':['Checkpoint snapshots can repeat across report files; occurrence counts are not distinct animation frames.','Native input captures precede later handlers; actual returning/closed states are validated from later RAF snapshots.','PNG files are original current Canvas exports, not additional rendered fixtures.','Five final observer cleanups are verified; intermediate checkpoints intentionally keep their observer active.','Festival raw snapshot is not saved in the immediate exclusion JSON; production validator output matches the complete report for original Halloween visits.','The six-chapter motion pose records intentionally omit face fields. Additional complete-report face snapshots cover only the chapters listed in journeyFaceByChapter; first-chapter event faces are in standalone records. Do not claim six-chapter browser face coverage from motion counts.','Desktop low-energy/body fatigue remains open-cap evidence; closed fatigue is only older offline evidence.','No physical phone, Safari, low-end GPU, frame-rate benchmark or public/live verification in this run.']}
(OUT/'face-evidence-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'summary':str(OUT/'face-evidence-summary.json'),'faceCheckpoints':len(records),'uniqueObservers':len(groups),'images':len(images),'snapshotOccurrences':summary['snapshotsRevalidatedOccurrences'],'fatigue':summary['fatigue'],'festivals':len(festival),'allPureValidatorsRecomputed':True,'allOriginalCanvasHashesMatchOfficialZIP':True},ensure_ascii=False))
