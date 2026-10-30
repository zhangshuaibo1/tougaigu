import ast, collections, hashlib, json, math, pathlib, struct, subprocess

ROOT=pathlib.Path('/workspace/scratch/2b18af2db412/tougaigu-v32-main-release')
OUT=pathlib.Path('/tmp/tougaigu-v32-main-40984854669')
import sys
SCOPE=sys.argv[1]
assert SCOPE in ['candidate','live']
SCOPE_DESCRIPTION='GitHub main '+SCOPE+' complete browser route ('+('local candidate server' if SCOPE=='candidate' else 'real https://tougaigu.com/')+')'

OFFICIAL=json.loads((OUT/'official-metadata.json').read_text())
EXPECTED='93655a7013adb3ecd41f7e1fac6935f7b5464539'
V29='9f372f3910a6141ddb4e5c6a5707438f7c8607d0'
REPORT=OUT/SCOPE/'report.json'
data=json.loads(REPORT.read_text()); main=data['cases'][0]
audit=json.loads((OUT/'artifact-audit.json').read_text())
sha=lambda b:hashlib.sha256(b).hexdigest()

def source(path,ref=EXPECTED):
    return subprocess.check_output(['git','show',ref+':'+path],cwd=ROOT).decode()
def segment(text,name):
    for node in ast.parse(text).body:
        if isinstance(node,(ast.FunctionDef,ast.AsyncFunctionDef)) and node.name==name:
            return ast.get_source_segment(text,node)
        if isinstance(node,ast.Assign) and any(isinstance(n,ast.Name) and n.id==name for n in node.targets):
            return ast.get_source_segment(text,node)
    raise AssertionError(name)
def trusted_local_functions(path,names):
    text=source(path)  # exact primary Git source already matched to all artifact blobs
    nodes=[node for node in ast.parse(text).body if isinstance(node,ast.FunctionDef) and node.name in names]
    assert {node.name for node in nodes}==set(names)
    namespace={'json':json,'math':math}
    exec(compile(ast.Module(body=nodes,type_ignores=[]),str(ROOT/path),'exec'),namespace)
    return namespace
pose_functions=trusted_local_functions('scripts/browser-smoke.py',['traveler_pose_record','validate_traveler_pose'])
validate_pose=pose_functions['validate_traveler_pose']
validate_library=trusted_local_functions('scripts/browser_library_v26.py',['validate_library_rider_trace'])['validate_library_rider_trace']
validate_post=trusted_local_functions('scripts/browser_post_v28.py',['validate_post_rider'])['validate_post_rider']

def walk(obj,path='report'):
    if isinstance(obj,dict):
        yield path,obj
        for key,value in obj.items():yield from walk(value,path+'.'+str(key))
    elif isinstance(obj,list):
        for i,value in enumerate(obj):yield from walk(value,path+'['+str(i)+']')

required={'runId','bodyIdentity','chapterIndex','mode','state','form','time','visualTime','deaths',
          'reducedMotion','body','travelerPerformance','travelerStepSeconds','characterPose','platforms','movers'}
chapters=collections.Counter();phases=collections.Counter();modes=collections.Counter();snapshots=0
max_world_sole_error=0
for path,s in walk(data):
    if not required.issubset(s):continue
    validate_pose(s)
    snapshots+=1;chapters[str(s['chapterIndex'])]+=1;modes[s['mode']]+=1
    v=s['travelerPerformance'];phases[(str(s['chapterIndex']),v['phase'] if v else 'null',s['reducedMotion'])]+=1
    for leg in s['characterPose'].get('legs',[]):
        if s['body']['grounded'] and leg['planted']:
            max_world_sole_error=max(max_world_sole_error,abs(leg['worldFoot']['y']-s['body']['y']))
assert set(chapters)==set('012345')

strict=[]
for name in ['TRAVELER_FRAME_SAMPLER','await_traveler_pose','sample_body_jump']:
    current=segment(source('scripts/browser-smoke.py'),name)
    previous=segment(source('scripts/browser-smoke.py',V29),name)
    assert current==previous,name+' strict original source changed'
    strict.append({'name':name,'sha256':sha(current.encode()),'identicalToV29Candidate':True})

def check_jump(name,j,expected_chapter,expected_y):
    a,b,c=j['rise'],j['fall'],j['landed']
    reduced=a['reducedMotion'];end='idle' if reduced else 'land'
    for sample,phase in [(a,'rise'),(b,'fall'),(c,end)]:validate_pose(sample,phase,reduced)
    identity=lambda s:(s['runId'],s['bodyIdentity'],s['chapterIndex'],s['deaths'])
    assert identity(a)==identity(b)==identity(c)
    assert a['chapterIndex']==expected_chapter and a['deaths']==0
    assert a['time']<b['time']<c['time']
    assert a['body']['vy']<-80 and b['body']['vy']>80 and c['body']['grounded']
    assert abs(c['body']['y']-expected_y)<.05
    observation=j['frameObservation'];assert observation['status']=='complete'
    assert observation['activeMs']<3500 and observation['droppedFrames']==0
    capture=observation['input']['capture'];after=observation['input']['after']
    for event in [capture,after]:
        assert event['code']=='Space' and not event['repeat'] and not event['openDialogs']
        assert event['target']['id']=='dream-canvas' and event['focus']['id']=='dream-canvas'
    assert capture['sample']['grounded'] and capture['sample']['vy']==0
    assert after['defaultPrevented'] and after['sample']['vy']==-600 and not after['sample']['grounded']
    cleanup=j['observerCleanup'];assert cleanup=={'pendingFrame':False,'pendingTimer':False,'oldPosesCleared':True,'removed':True}
    pause=j.get('pause')
    if pause:
        assert pause['passiveFrames']==6 and pause['fullPoseFrozen'] and pause['canvasPixelsFrozen']
        assert pause['observed']['state']=='paused' and not pause['observed']['body']['grounded']
        validate_pose(pause['observed'],pause['observed']['travelerPerformance']['phase'],reduced)
    return {'label':name,'chapterIndex':expected_chapter,'oneSpaceOriginalObserverContract':True,
            'runId':a['runId'],'bodyIdentity':a['bodyIdentity'],'deaths':a['deaths'],'reducedMotion':reduced,
            'riseVy':a['body']['vy'],'fallVy':b['body']['vy'],'landingY':c['body']['y'],
            'riseTime':a['time'],'fallTime':b['time'],'landingTime':c['time'],
            'landingPhase':c['travelerPerformance']['phase'],'landingAge':c['travelerPerformance']['landingAge'],
            'observedFrames':len(observation['frames']),'activeMs':observation['activeMs'],
            'elapsedMs':observation['elapsedMs'],'pause':{'passiveFrames':6,'fullPoseAndCanvasFrozen':True} if pause else None,
            'observerCleanup':cleanup}
jumps=[check_jump('station',main['stationBodyJump'],0,560)]
gh=main['greenhouse']['routeEvidence']
greenhouse_jump={**gh['shelfJumpPoses'],**gh['shelfJumpObservation']}
jumps.append(check_jump('greenhouse-shelf',greenhouse_jump,1,445))
jumps.append(check_jump('theatre-normal',main['theatre']['travelerPerformance']['normalJump'],2,560))
jumps.append(check_jump('theatre-reduced',main['theatre']['travelerPerformance']['reducedMotionJump'],2,560))
jumps.append(check_jump('coast-entry',main['coast']['desktopRoute']['entryBodyJump'],4,560))
jumps.append(check_jump('post-entry',main['post']['route']['entryBodyJump'],5,560))

library=[]
for path,carry in walk(main['library'],'library'):
    if not {'support','samples','fullCycle','verticalPoseDirections'}.issubset(carry):continue
    recomputed=validate_library(carry['samples'],carry['support'],carry['fullCycle'])
    assert recomputed==carry,path
    for s in carry['samples']:
        p=s['travelerPose'];validate_pose(p,p['travelerPerformance']['phase'],p['reducedMotion'])
    first=carry['samples'][0]
    library.append({'path':path,**{k:v for k,v in carry.items() if k!='samples'},'sampleCount':len(carry['samples']),
        'actualPeriod':2*math.pi/abs(first['mover']['speed']),'reducedMotion':first['travelerPose']['reducedMotion'],
        'allSoleAndWalkAndSameFrameChecksRevalidated':True})
assert len([x for x in library if x['fullCycle']])==4
assert all(min(x['verticalPoseDirections'].values())>0 for x in library if x['fullCycle'])
lp=main['library']['pause']
assert lp['passiveFrames']==6 and lp['stateAndCanvasFrozen'] and lp['fullTravelerPoseFrozen']
library_pause={'scope':'desktop book-a only','bodyPlatform':lp['bodyPlatform'],'passiveFrames':lp['passiveFrames'],
               'stateAndCanvasFrozen':lp['stateAndCanvasFrozen'],'fullTravelerPoseFrozen':lp['fullTravelerPoseFrozen']}

post_routes=[('desktop',main['post']['route'])]+[(width,item['route']) for width,item in main['postExtended']['phoneFullRoutes'].items()]
post_routes.append(('desktop-failed-primary',main['postExtended']['failedPrimaryFullRoute']['route']))
post=[]
for label,route in post_routes:
    assert route['fullBodyExit'] and route['realSunStampBeforeDanger'] and route['oneFinalPendulumFrozen'] and route['deaths']==0
    assert route['rootLanding']['grounded'] and abs(route['rootLanding']['y']-390)<.05
    book=route['book'];assert validate_post(book['samples'])==book
    for s in book['samples']:
        p=s['travelerPose'];validate_pose(p,p['travelerPerformance']['phase'],p['reducedMotion'])
    if label!='desktop':assert route['entryBodyJump'] is None
    post.append({'label':label,'input':route['input'],'paint':route['paint'],'wallSeconds':route['wallSeconds'],
        'complete':route['fullBodyExit'],'deaths':route['deaths'],'rootLandingY':route['rootLanding']['y'],
        'book':{k:v for k,v in book.items() if k!='samples'},
        'bookReducedMotion':book['samples'][0]['travelerPose']['reducedMotion'],
        'entryJumpPresent':route['entryBodyJump'] is not None,
        'mushroomStatus':route['mushroomObservation'].get('status'),
        'mushroomObservationKeys':list(route['mushroomObservation']),
        'finalExitSummary':{k:v for k,v in route['finalExit'].items() if k!='samples'}})
assert len(post)==4
ext=main['postExtended'];assert ext['chapterRunsBefore']==1 and ext['chapterRunsAfter']==4
assert ext['totalSettlement']['legitimateCompletedRunsAdded']==3 and ext['rewardGrantsUnchanged']

endings=[]
for width,items in main['endings']['phoneReadings'].items():
    assert {x['ending'] for x in items}=={'dawn','lanterns','tender'}
    for e in items:
        read=e['reading'];clean=e['inputCleanup']
        assert read['fullyReadParagraphs']==[0,1,2] and read['homeFullyVisibleAndUncovered'] and read['finalNoteFullyVisible']
        assert clean['allCreatedGestureSessionsDetached']
        assert clean['gestureSessionsCreated']==clean['gestureSessionsDetached']==clean['touchEndAcknowledged']
        assert e['layoutSamples'][0]['scrollTop']==0
        evidence=OUT/SCOPE/e['readingEvidenceFile'];assert evidence.is_file()
        endings.append({'width':int(width),'ending':e['ending'],'paragraphs':read['fullyReadParagraphs'],
            'initialScrollTop':e['layoutSamples'][0]['scrollTop'],'scrollSamples':read['scrollSamples'],
            'maxScrollTop':read['maxScrollTop'],'gestureAttempts':len(e['gestureAttempts']),
            'createdAndDetachedTouchSessions':clean['gestureSessionsCreated'],
            'homeFullyVisibleAndUncovered':True,'finalNoteFullyVisible':True,'immediateEvidence':str(evidence)})
desktop_endings=[]
for e in main['endings']['desktop']:
    assert e['firstView']['ending']==e['afterRealReload']['ending']==e['ending']
    assert e['repeatReadDidNotDuplicateDiscovery']
    for invariants in [e['invariants'],e['afterReloadInvariants']]:
        for k in ['chaptersAndScoresUnchanged','riddlesAndSettingsUnchanged','collectionsUnchanged','rewardGrantsUnchanged']:assert invariants[k]
    desktop_endings.append({'choices':e['choices'],'ending':e['ending'],'afterReloadSameEnding':True,'noDuplicateRewardsOrDiscovery':True})
assert len(desktop_endings)==4
assert main['endings']['reducedMotion']['mediaReduced'] and not main['endings']['reducedMotion']['activeAnimations']
network=[]
for c in data['cases']:
    assert c['version']=='32.0.0' and c['noHorizontalOverflow'] and not c['pageErrors'] and not c['httpErrors'] and c['finalImagesLoaded']
    actual=c['networkFailures']['actual'];expected=c['networkFailures']['expected']
    assert collections.Counter((x['url'],x['failure']) for x in actual)==collections.Counter((x['url'],x['failure']) for x in expected)
    assert c['networkFailures']['exactMatch'] and actual==expected
    network.append({'viewport':c['viewport'],'actualFailureCount':len(actual),'expectedFailureCount':len(expected),
                    'exactCounterMatchRecomputed':True,'exactOrderMatchRecomputed':True,'pageErrors':0,'httpErrors':0,'finalImagesLoaded':True})


# Validate exact release maps from the already verified source and actual runtime resource URLs.
import re
from urllib.parse import urlsplit, parse_qs
modules = {('./'+x['path'][5:]) for x in audit['sourceFiles'] if x['path'].startswith('dist/') and x['path'].endswith('.js')}
cache_maps = []
for name in ['index.html', 'dream.html', 'survivor.html']:
    html = source('dist/'+name)
    if name != 'survivor.html':
        assert 'name="application-version" content="32.0.0"' in html
    match = re.search(r'<script type="importmap" id="release-modules">(.*?)</script>', html)
    assert match
    imports = json.loads(match.group(1))['imports']
    assert set(imports) == modules and len(imports) == 68
    assert all(value == key+'?v=32.0.0' for key,value in imports.items())
    cache_maps.append({'file':name,'moduleCount':len(imports),'allVersioned32':True})
cache_resources=[]
for case in data['cases']:
    samples=[]
    for stage in ['resources','finalResources']:
        for resource in case[stage]:
            url=resource['name']; parsed=urlsplit(url)
            if parsed.path.endswith(('.js','.css')):
                assert parse_qs(parsed.query).get('v') == ['32.0.0'],url
                samples.append(url)
    assert samples
    assert all(parse_qs(urlsplit(url).query).get('v')==['32.0.0'] for url in case['instrumentedAppURLs'])
    cache_resources.append({'viewport':case['viewport'],'observedJsCssOccurrences':len(samples),'allObservedJsCssVersioned32':True})
assert len(audit['sourceFiles'])==950
assert len([x for x in audit['sourceFiles'] if x['path'].startswith('dist/')])==143
assert not audit['failureEvidence']
assert (OUT/'candidate/report.json').is_file() and (OUT/'live/report.json').is_file()

png_names=[
 ('1280-touch-390-library-book-a-riding.png','390 normal vertical-book pose with full-cycle data'),
 ('1280-touch-390-library-book-b-riding.png','390 second normal vertical-book pose'),
 ('1280-touch-320-library-book-b-riding.png','320 reduced-motion vertical-book support; not normal-motion proof'),
 ('1280-full-touch-320-post-book-riding.png','320 actual horizontal-book route and planted soles'),
 ('1280-post-entry-traveler-airborne-canvas.png','post safe-entry actual airborne production Canvas'),
 ('1280-greenhouse-root-crossed.png','actual greenhouse traversal; shelf land is temporal JSON evidence, not this still'),
 ('1280-ending-dawn-320-read.png','320 ending complete read, final note and home'),
 ('1280-ending-tender-390-read.png','390 ending fully fits without a manufactured scroll'),
]
pngs=[]
for name,why in png_names:
    p=OUT/SCOPE/name;b=p.read_bytes();assert b[:8]==b'\x89PNG\r\n\x1a\n'
    width,height=struct.unpack('>II',b[16:24])
    recorded=next(x for x in audit['zipFiles'] if x['path']==SCOPE+'/'+name)
    assert sha(b)==recorded['sha256']
    pngs.append({'path':str(p),'width':width,'height':height,'bytes':len(b),'sha256':sha(b),'why':why,
                 'unalteredArtifactPNG':True,'reviewedByThisAudit':False})

summary={'runId':40984854669,'commit':EXPECTED,'productVersion':'32.0.0','scope':SCOPE_DESCRIPTION,
 'artifact':{'zipBytes':audit['zipBytes'],'zipSha256':audit['zipSha256'],'sourceFilesExact':len(audit['sourceFiles']),
             'zipFiles':len(audit['zipFiles']),'tests':audit['tests'],'reportBytes':REPORT.stat().st_size,'reportSha256':sha(REPORT.read_bytes()),
             'liveReportPresent':(OUT/'live/report.json').exists(),'artifactSourceCodeExecuted':False,
             'additionalRevalidation':'Selected pure validators loaded from the trusted local repo only after exact git-source comparison; no extracted program executed'},
 'recordCounts':{'snapshotOccurrencesRevalidated':snapshots,'byChapterIndex':dict(chapters),'byMode':dict(modes),
                 'phaseOccurrences':[{'chapterIndex':int(k[0]),'phase':k[1],'reducedMotion':k[2],'count':v} for k,v in sorted(phases.items())],
                 'maxActualPlantedWorldSoleError':max_world_sole_error,'note':'Counts include repeated saved snapshots at different report paths; they are not unique RAF frames.'},
 'originalStrictDefinitions':strict,'jumps':jumps,'libraryCarries':library,'libraryPause':library_pause,'postRoutes':post,
 'settlement':ext['totalSettlement'],'postRunsBefore':ext['chapterRunsBefore'],'postRunsAfter':ext['chapterRunsAfter'],
 'delayedPostResources':ext['delayedResources'],'phoneEndings':endings,'desktopEndingCombinations':desktop_endings,
 'systemReducedEndingNoRunningAnimation':True,'finalEndingInvariants':main['endings']['finalInvariants'],
 'network':network,'cacheMaps':cache_maps,'observedCacheResources':cache_resources,'suggestedNativePNGs':pngs,
 'limits':['Greenhouse new single-jump capture lands on the actual y445 shelf; it is not evidence that the new observer captured the earlier y385 root landing.',
  'Coast entry jump ran normally but has pause:null. Do not claim an airborne coast pause from this run; separate existing clock-echo pauses have different scope.',
  'Library complete vertical periods are in 390 and 320 touch routes. Desktop book carries are short segments; 320 cycles use real reducedMotion=true, while 390 supplies normal directional acting.',
  'Library full-pose/Canvas pause is desktop book-a only. Phone book cycle records do not contain that pause.',
  'Post entry jump/pause is the normal desktop route only; phone and failed-image routes intentionally contain no extra entry jump.',
  '390 ending pages fit fully without scrolling. 320 has one actual scroll gesture per ending; all note/paragraph/home checks are present.',
  'This is the official main v32 run with 32.0.0 resource versions; scope identifies local candidate or actual public HTTPS. Physical-phone, Safari and low-end-GPU evidence remain outside this result.']}

# Recompare all immediately persisted evidence with its corresponding complete-report records.
standalone=[]
def compare_file(filename, expected):
    actual=json.loads((OUT/SCOPE/filename).read_text())
    assert actual==expected, filename
    standalone.append({'file':filename,'comparison':'entire JSON object','exact':True})
for label,route in post_routes:
    prefix={'desktop':'1280','390':'1280-full-touch-390','320':'1280-full-touch-320','desktop-failed-primary':'1280-full-fallback'}[label]
    compare_file(prefix+'-post-route.json',route)
    compare_file(prefix+'-post-mushroom-crossing.json',route['mushroomObservation'])
for width,whole in ext['phoneFullRoutes'].items():
    compare_file('1280-post-full-touch-'+width+'.json',whole)
for case in main['endings']['desktop']:
    compare_file('1280-ending-'+case['choices']['letter']+'-'+case['choices']['clock']+'.json',case)
for width,cases in main['endings']['phoneReadings'].items():
    for case in cases:
        prefix='1280-ending-'+case['ending']+'-'+width
        compare_file(prefix+'-case.json',case)
        immediate=json.loads((OUT/SCOPE/(prefix+'-reading.json')).read_text())
        assert immediate['status']=='complete'
        fields=['ending','layoutSamples','gestureAttempts','inputCleanup','reading']
        assert all(immediate[k]==case[k] for k in fields),prefix
        standalone.append({'file':prefix+'-reading.json','comparison':'five complete shared reading fields','fields':fields,'exact':True})
assert len(standalone)==26

# Native terminal movement versus a fresh actual result tap: preserve observed pointer IDs only.
phone_boundaries=[]
for width,whole in ext['phoneFullRoutes'].items():
    route=whole['route'];boundary=route['finalExit']['inputBoundary'];events=route['finalInputEvents']
    old=boundary['heldPointerId'];assert boundary['resultRetained'] and boundary['releaseAtComplete']
    downs=[e for e in events if e['type']=='pointerdown' and e['direction']=='right']
    ups=[e for e in events if e['type']=='pointerup' and e['direction']=='right']
    assert len(downs)==len(ups)==1 and downs[0]['pointerId']==ups[0]['pointerId']==old
    assert downs[0]['state']=='playing' and downs[0]['dialogs']==[]
    assert ups[0]['state']=='complete' and ups[0]['dialogs']==['result-dialog']
    clicks=[e for e in events if e['type']=='click' and e['pointerId']==old]
    assert all(e['isTrusted'] and e['defaultPreventedAfter'] and e['dialogsAfter']==['result-dialog'] for e in clicks)
    fresh=whole['outro']['freshResultTouch'];assert fresh['freshDownUpClick'] and fresh['intentionalClickAllowed'] and fresh['realOutroOpened']
    assert fresh['pointerId']!=old
    selected=[e for e in fresh['events'] if e['targetId']=='result-story' and e['type'] in ['pointerdown','pointerup','click']]
    assert [e['type'] for e in selected]==['pointerdown','pointerup','click']
    assert all(e['isTrusted'] and e['pointerType']=='touch' and e['pointerId']==fresh['pointerId'] for e in selected)
    assert selected[-1]['defaultPreventedAfter'] is False
    phone_boundaries.append({'width':int(width),'heldPointerId':old,'oldClicks':[{'targetId':e['targetId'],'defaultPreventedAfter':e['defaultPreventedAfter'],'dialogsAfter':e['dialogsAfter']} for e in clicks],
        'freshPointerId':fresh['pointerId'],'freshClickAllowed':True,'realOutroOpened':True,'nativeEventsRechecked':True})

mushroom_functions=trusted_local_functions('scripts/browser_post_v28.py',['validate_post_mushroom','validate_post_mushroom_crossing'])
for label,route in post_routes:
    assert mushroom_functions['validate_post_mushroom_crossing'](route['mushroomObservation'],label in ['390','320'])==route['mushroomObservation']
delayed=ext['delayedResources'];cases=delayed['cases']
assert cases['delayed-current']['actualMoveWhileLoading'] and cases['delayed-current']['sameBodyAfterNativeResponse']
assert cases['delayed-current']['ready']['status']=='ready'
assert cases['late-after-leaving']['newChapterBodyUnchanged'] and cases['late-after-leaving']['noPostArtOrDeliveryLeak']
assert cases['recoveredAfterLeaving']['status']=='ready' and delayed['chaptersChoicesEndingsAndRewardGrantsUnchanged']
summary['standaloneEvidenceComparisons']=standalone
summary['nativePhoneInputBoundaries']=phone_boundaries
summary['sameBodyContinuousMushroomValidatorsRechecked']=4
summary['delayedResourcesAndLateIsolationRechecked']=True

(OUT/(SCOPE+'-inherited-gates-summary.json')).write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'summary':str(OUT/(SCOPE+'-inherited-gates-summary.json')),'snapshotsRevalidated':snapshots,'chapters':dict(chapters),
 'worldSoleError':max_world_sole_error,'jumpRecords':len(jumps),'libraryCarries':len(library),
 'fullVerticalCycles':len([x for x in library if x['fullCycle']]),'completePostRoutes':len(post),
 'phoneEndingReadings':len(endings),'desktopEndingCombinations':len(desktop_endings),'suggestedPNGs':len(pngs)},ensure_ascii=False))
