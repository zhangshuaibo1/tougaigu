from pathlib import Path
from collections import Counter
import hashlib, gzip, json, re, shutil, struct

out=Path('/tmp/v34-framing-independent-review')
root=Path('/workspace/scratch/2b18af2db412/tougaigu-v34-framing-prestudy')
original=Path('/workspace/scratch/2b18af2db412/tougaigu-v33-formal')
sha=lambda b:hashlib.sha256(b).hexdigest()
write=lambda p,o:p.write_text(json.dumps(o,ensure_ascii=False,indent=2)+'\n')
expected_module='8cf94b0687b84479a9a9fdc720792d968c9655516950d82e4a561fce14dff485'
assert sha((root/'dist/dream-cap-framing.js').read_bytes())==expected_module

raw_sources={
 'browser-final-report.json.gz':'/tmp/v34-framing-adapted-final/real-browser/cap-framing/report.json',
 'browser-first-failure-report.json.gz':'/tmp/v34-framing-adapted/real-browser/cap-framing/report.json',
 'browser-reentry-failure-report.json.gz':'/tmp/v34-framing-adapted-settled/real-browser/cap-framing/report.json',
 'full-final-tests.tap.gz':'/tmp/v34-final-tests.tap',
 'final-npm-test.txt.gz':'/tmp/v34-final-npm-test.txt',
 'final-check.txt.gz':'/tmp/v34-final-check.txt',
 'new-reentry-tests-red.txt.gz':'/tmp/v34-reentry-regression-red.txt',
}
locators={}
for name,path in raw_sources.items():
 raw=Path(path).read_bytes(); zipped=gzip.compress(raw,compresslevel=9,mtime=0)
 assert gzip.decompress(zipped)==raw
 (out/name).write_bytes(zipped)
 locators[name]={'sourcePath':path,'rawBytes':len(raw),'rawSha256':sha(raw),'gzipBytes':len(zipped),'gzipSha256':sha(zipped),'roundTripExact':True}
for name,path in {
 'browser-adapter-execution.json':'/tmp/v34-framing-adapted-final/adapter-execution.json',
 'browser-adapter-contracts.json':'/tmp/v34-framing-adapted-final/adapter-contracts.json',
}.items():
 shutil.copyfile(path,out/name)
 locators[name]={'sourcePath':path,'rawBytes':(out/name).stat().st_size,'rawSha256':sha((out/name).read_bytes()),'copiedExact':True}

browser=json.loads(gzip.decompress((out/'browser-final-report.json.gz').read_bytes()))
assert sha(gzip.decompress((out/'browser-final-report.json.gz').read_bytes()))=='bfc6892dabc6413f11729ce7cf266d0cd2feb5650e0110fad44477a716a95a27'
assert browser['status']=='passed' and browser['expectedVersion']=='33.0.0'
assert len(browser['sourceFiles'])==77
for name,h in browser['sourceFiles'].items():
 assert (root/name).resolve().is_relative_to(root.resolve())
 assert sha((root/name).read_bytes())==h,name
cases={c['viewport']['width']:c for c in browser['cases']}
assert sorted(cases)==[320,390,1280]
for c in cases.values():
 assert c['status']=='passed'
 for k in ('pageErrors','httpErrors','requestFailures'):assert c[k]==[]

(out/'observed-png').mkdir(exist_ok=True)
selected=[
 ('390-back-near-canvas.png','390/back-near-canvas.png',cases[390]['backNear']['canvas']['sha256']),
 ('320-route-paused-resize-to390-canvas.png','320/paused-resize-first.png',cases[320]['pausedResize']['picture']['sha256']),
]
images=[]
for name,relative,h in selected:
 source=Path('/tmp/v34-framing-adapted-final/real-browser/cap-framing')/relative
 data=source.read_bytes();assert sha(data)==h;assert data[:8]==b'\x89PNG\r\n\x1a\n'
 width,height=struct.unpack('>II',data[16:24]);(out/'observed-png'/name).write_bytes(data)
 images.append({'file':'observed-png/'+name,'originalPath':str(source),'bytes':len(data),'sha256':h,'width':width,'height':height,'viewedByIndependentReviewer':True,'scope':'Original local prestudy Canvas; not public or physical-device evidence'})

tap=gzip.decompress((out/'full-final-tests.tap.gz').read_bytes()).decode()
final_names=re.findall(r'^# Subtest: (.*)$',tap,re.M)
old_bytes=gzip.decompress(Path('/tmp/v33-candidate-1d630-evidence/tests.txt.gz').read_bytes())
old_names=re.findall(r'^# Subtest: (.*)$',old_bytes.decode(),re.M)
new_source=(root/'tests/cap-framing-v34.test.mjs').read_text()
new_names=re.findall(r"^test\('([^']+)'",new_source,re.M)
assert len(final_names)==702 and len(old_names)==691 and len(new_names)==11
assert Counter(final_names)==Counter(old_names)+Counter(new_names)
assert '# pass 702\n' in tap and '# fail 0\n' in tap
old_files=sorted((original/'tests').glob('*.test.mjs'));assert len(old_files)==77
protected={}
for p in old_files:
 assert (root/'tests'/p.name).read_bytes()==p.read_bytes()
 protected['tests/'+p.name]=sha(p.read_bytes())
write(out/'protected-test-sources.json',{'status':'passed','originalCommit':'1d63072bb9a27690ed14b15d3103c6e8a87fa297','oldFiles':77,'eachExact':True,'files':protected})
test_identity={'status':'passed','finalFullTAP':{'file':'full-final-tests.tap.gz','rawSha256':sha(tap.encode()),'tests':702,'pass':702,'fail':0,'skipped':0,'cancelled':0,'todo':0,'durationMs':19284.071176,'executedBy':'v34 developer; original bytes and case set independently verified'},'priorCandidateTAP':{'source':'/tmp/v33-candidate-1d630-evidence/tests.txt.gz','rawSha256':sha(old_bytes),'cases':691,'allNamesAndMultiplicitiesRetained':True},'newCases':new_names,'oldFilesExact':77,'independentNewCases':{'file':'cap-framing-targeted-test-cases-fixed.tap','tests':11,'pass':11,'fail':0,'durationMs':5919.363602},'fileContainerNpmRun':{'file':'final-npm-test.txt.gz','containers':78,'pass':78,'fail':0,'durationMs':9269.547886,'note':'File-container count is distinct from 702 individual cases.'}}
write(out/'test-case-identity.json',test_identity)

paint=json.loads((out/'paint-envelope-report.json').read_text())
counts=dict(Counter(r['label'] for r in paint['records']))
assert counts=={'hat':440,'no-hat':40,'cap-and-fixed-hinge':40,'hands':40,'skull-union':40,'clothing-and-feet':200,'soul':324}
assert sum(counts.values())==1124 and not paint['violations']
budget=json.loads((out/'near-camera-budget-fixed-report.json').read_text())
boundary_old=json.loads((out/'near-reentry-boundary-report.json').read_text())
boundary=json.loads((out/'near-reentry-fixed-report.json').read_text())
assert budget['status']=='passed' and boundary['status']=='passed'
assert budget['sourceHashes']['dist/dream-cap-framing.js']==expected_module
assert boundary['sourceHashes']['dist/dream-cap-framing.js']==expected_module
old_failed=next(c for c in boundary_old['cases'] if c['target']==278 and c['viewport']['width']==390)['final']
assert not old_failed['framing']['active'] and old_failed['framing']['reason']=='body-away'
assert all(c['final']['framing']['active'] and c['final']['leftMarginCss']>=7.99 for c in boundary['cases'])

browser_summary=[]
for width in (1280,390,320):
 c=cases[width];q={'viewport':c['viewport'],'input':c['input'],'status':c['status'],'pageErrors':0,'httpErrors':0,'requestFailures':0}
 if 'backNearSettling' in c:q.update(settlingSeconds=c['backNearSettling']['elapsedSeconds'],settlingTimeoutMs=3000,unchangedThresholdCss=7.5,backNearHatLeftCss=c['backNear']['snapshot']['projected']['hat']['left'])
 if 'paused' in c:q.update(pausedSameCanvasBytes=c['paused']['sameCanvasBytes'],firstResizeFramePhysicalFrozen=True,reversalObserved=c['reversalSnapshot']['cap']['phase']=='opening',chaptersUntouched=all(not x['completed'] and not x['runs'] for x in c['save']['chapters']),deaths=c['final']['deaths'],memories=c['final']['memories'],lamps=c['final']['lamps'])
 browser_summary.append(q)

review={
 'status':'passed-prestudy-review',
 'scope':'Read-only independent implementation review and bounded evidence audit; no ref change, deployment, public HTTPS or full browser regression performed by this reviewer.',
 'sourceRoot':str(root),'baselineCommit':'1d63072bb9a27690ed14b15d3103c6e8a87fa297','prestudyVersion':'33.0.0','releaseVersion34NotPublished':True,
 'frozenSources':browser['sourceFiles'],'all77BrowserRecordedSourcesExactAtReview':True,
 'paintEnvelope':{'report':'paint-envelope-report.json','totalScans':1124,'groups':counts,'hatAndNoHatTotal':480,'soulIncludedInTotal':324,'violations':0,'minObservedWorldClearance':paint['minObservedClearance'],'rasterScale':3,'roundingAllowanceWorld':1/3,'sourceIdentity':'final-source-identity.json','scope':'Original Canvas paint on synthetic fixtures; native canvas offline. Bounds/follow code exact across source revisions; no rescan needed for visibility policy change.'},
 'actualCorrectionPhysics':{'report':'near-camera-budget-fixed-report.json','totalComparisons':sum(c['checks'] for c in budget['cases']),'failedComparisons':0,'cases':[{'viewport':c['viewport'],'comparisons':c['checks'],'cameraDeltaGreaterThan10':c['changedCameraChecks'],'maximumCameraDeltaWorld':c['maxCameraDelta'],'stableCameraDeltaWorld':c['stable']['delta'],'physicsHash':c['physicsHash'],'originalPhysicsHash':c['oldPhysicsHash']} for c in budget['cases']],'updateBatchesPerViewport':[1,2,6,12],'samePrimaryPoseObjects':True,'allObservedConsumersUseFinalCamera':True,'oneBudgetConsumption':True,'pausedResizeFirstFrame':True,'scope':'Normal engine method inputs, selected physical fields plus getSnapshot and events; mock2D consumer instrumentation. Not DOM or full chapter proof.'},
 'resolvedFinding':{'id':'near-reentry-visible-body','oldModule':'175b3e45cf2f89fca35b2a1c7aae1a26dd342197055c7a80f1c52076e0cfbe39','beforeReport':'near-reentry-boundary-report.json','old390ReturnTarget':278,'oldActualSoulX':old_failed['soul']['x'],'oldCamera':old_failed['camera'],'oldBodyCenterFromLeftWorld':old_failed['bodyCenterFromLeftWorld'],'oldLeftEnvelopeCss':old_failed['leftMarginCss'],'oldSlackCss':old_failed['framing']['slackCss'],'oldFeasibleCamera':[old_failed['framing']['low'],old_failed['framing']['high']],'fix':'Accept a body center already inside [0, viewWidth] rather than requiring 18 world units of inset. Offscreen center exclusion, geometry feasibility, 24/8 CSS hysteresis and original follow budget remain.','finalModule':expected_module,'afterReport':'near-reentry-fixed-report.json','afterCases':len(boundary['cases']),'allAfterActive':True,'stableMinimumLeftEnvelopeCss':min(c['final']['leftMarginCss'] for c in boundary['cases']),'priorFailureEvidencePreserved':True},
 'sourceReview':{
  'baseDiff':'15 additions and 1 replaced line, plus only new importmap entries in 3 HTML files; physics update expressions unchanged.',
  'drawingGeometry':'Clothing control hull fits body [-50,-60,35,8]. Other outfit backs share Halloween cape geometry or add only internal stars. Hand padding includes 4px arm stroke, 2.8px elbow and rotated thumb. Hat hull/ellipse/stroke bounds and head/cap unions reviewed. Decorative glow/shadows/tether/particles excluded by authored framing policy.',
  'frameOrder':'Follow token removed before computing the existing primary character/soul; final camera assigned before backdrop, world translation, culling, foreground and compass. Companion receives the same shown reference through original v33 render scope.',
  'multiUpdate':'Product of original clamped follow decays reconstructs the weighted original target; one render consumes it once. Exact fallthrough returns the unmodified camera.',
  'repeatNestedException':'11 new-case run covers repeated render, drawBackground reentry and pose exception; no stale budget is replayed. This does not claim arbitrary user-injected mutation during rendering.',
  'pauseResize':'Pause without resize adds no camera animation; resize can clamp first visible frame using prior visible body context without advancing physical state or clocks.',
  'activity':'Existing activity projection has priority and clears pending ordinary framing; input and body/world dimensions remain original.',
  'hysteresisEdges':'24 CSS enter / 8 CSS retain threshold is picture slack, separate from feasible camera interval and world clamping; both body-center sides and impossible world edge tested.'
 },
 'tests':test_identity,
 'developerRealBrowserEvidence':{'rawReport':'browser-final-report.json.gz','rawSha256':locators['browser-final-report.json.gz']['rawSha256'],'elapsedSeconds':browser['elapsedSeconds'],'outerElapsedSeconds':65.18977182700473,'startedAt':'2026-10-30T01:45:14.619367+00:00','completedAt':'2026-10-30T01:46:19.809137+00:00','sourceHashesMatched':77,'cases':browser_summary,'callerBrowserRemainedConnected':True,'ownedContextsClosed':True,'readByIndependentReviewer':True,'selectedImages':images,'notCovered':browser['notCovered']},
 'failureHistory':[
  {'kind':'Initial observation timing failure','evidence':'browser-first-failure-report.json.gz','detail':'Fixed 1000ms screenshot captured active, still-converging hat bound at 6.672841809476801 CSS px. Final helper waits naturally for unchanged 7.5 CSS criterion, capped at 3000ms; game clocks/speed unchanged.'},
  {'kind':'Actual product re-entry defect','evidence':'browser-reentry-failure-report.json.gz','detail':'Bounded 3000ms settling still failed at soul about275, body center10.383 world; available framing interval and >110 CSS slack. Source policy fixed; normal-input independent278 failure preserved and eight post-fix routes pass.'},
  {'kind':'Red/green regression proof','evidence':'new-reentry-tests-red.txt.gz','detail':'Two newly added re-entry cases failed under old18 policy, then pass under final policy; final11 independent and full702 pass.'},
  {'kind':'Read-only harness process permission','detail':'First positive-delta comparison attempt stopped before game assertions because child git rev-parse received local EPERM. Approved read-only execution succeeded. No product assertion relaxed.'}
 ],
 'limits':['Finite paint fixtures complement source hull reasoning; they do not exhaust all arbitrary injected poses.','One primary character/soul read asserted on these open-cap station frames; older NPC/post paths may request additional presentations, and the new module adds none.','Camera formula is verified against each captured final frame geometry; arbitrary render frequencies with moving geometry are not claimed to produce identical camera paths.','Browser driver uses local prestudy version33, Chromium and CDP simulated touch; it does not prove physical phones, Safari, FPS or public release.','Selected Canvas screenshots are original bytes; full browser image set remains with developer browser evidence.','No source/ref/write occurred in development or frozen v33 trees from this reviewer.']
}
write(out/'raw-evidence-locators.json',locators)
write(out/'independent-review.json',review)

readme='''# v34 窄屏相机切片：独立预研审阅

**结论：本次冻结源码的预研审阅通过。尚未发布 v34。** 当前页面仍标为 `33.0.0`。本目录只读审查了相机切片与其有针对性的证据；没有发布、修改 ref，也没有改动开发目录或冻结的 v33 证据。

冻结模块 `dist/dream-cap-framing.js` SHA256：
`8cf94b0687b84479a9a9fdc720792d968c9655516950d82e4a561fce14dff485`。
冻结 base SHA256：
`179caecf7467c70319b988b1146b988b04f8d1d980603ff1181a59ba575d1aef`。
原 v33 对照提交：`1d63072bb9a27690ed14b15d3103c6e8a87fa297`。

## 结论依据

- **实际原 Canvas 几何：1,124 次扫描，0 处越界。** 这个总数已经包含 324 次灵魂扫描，不能再相加。帽饰 440、无帽 40、帽盖与固定铰链 40、手 40、头骨与前缘 40、衣服与脚 200、灵魂 324，合计 1,124。帽饰及无帽组合合计 480（11 套帽饰＋无帽，2 朝向，5 开合值，4 姿态）。其中无帽空绘制 40 属于这 480。实际最小观察余量为 0.6666666666666572 world；3 倍离屏栅格的外像素舍入允许量为 1/3 world。
- **实际触发相机纠偏时，最终源码和原 v33 的 1,376 次所列物理状态、getSnapshot、事件比较完全一致。** 320 与 390 各 688 次；camera 差超过 10 world 的比较分别 483/498 次，最大差 48.662933832029644 / 72.60456652799591 world。这个补测确实经历了不同相机位置。
- **每视口 1、2、6、12 次 update 后单次 render 的预算重建通过。** 背景、world translate、场景层、小猫、连线、人物、灵魂与前景使用同一个最终 camera；主角和灵魂原对象直接复用。重复 render 无新预算，暂停不产生新动画，暂停 resize 的首帧既容纳绘制边界又保留物理状态与时钟。
- **一个实质问题被发现、保留证据并修复。** 原来的 18 world 主体内缩判定会使远行回近身的角色无法重新进入保护：390 回 278 时，主体中心还在屏内 7.3675295876423235 world，相机有可行区间 [0,20.48533820676019]、107.24915052760852 CSS 余量，但仍 `body-away`，帽饰保守左界为 −63.72272447239141 CSS。真实浏览器也在回到约 275 时失败。最终改为主体中心在 [0,W] 即可；主体完全离屏仍拒绝，24/8 CSS 几何滞回、世界边界与原跟随速度都保留。
- **修复后 8 条有针对性的正常输入路线通过。** 390 回 258/266/268/270/275/278/282 与 320 回 278 全部重新进入保护，稳定完整保守边界约 8 CSS px。旧失败报告未覆盖。
- **最终 702/702 案例通过，失败 0、跳过 0，19,284.071176 ms。** 原 v33 的 691 个案例名称及次数完整保留，只增加这 11 个新案例；77 个旧测试文件逐字节不变。全例 TAP 由开发者执行，其原字节和案例集合由本审阅者独立核验。另独立直接执行当前 11 个新案例：11/11、失败 0、5,919.363602 ms。`npm test` 默认摘要的 78 是文件容器数，不能代替 702 个案例计数。
- **开发者最终真实浏览器报告 3/3 通过，独立核对了全部 77 个记录源码哈希。** 1280 键盘、390/320 CDP 模拟触屏；page/http/request 错误均 0。主脚本 63.822335271004704 秒，外层 65.18977182700473 秒，UTC 01:45:14.619367→01:46:19.809137。暂停 Canvas 字节相同，首个 resize 帧、E 反转、左右朝向、减少动态、活动投影优先、0 死亡及章节存档未结算均有断言。调用者 browser 保持连接，自建 contexts 全部关闭。

## 源码与绘制覆盖

`final-source-identity.json` 逐字节证明，最初 `03be…` 栅格版本到最终 `8cf94…`，帽饰常量/矩形变换、getCapFramingBounds、累积与消费 follow 的整段代码相同，其他 11 个绘制/引擎文件哈希也相同。因此 guard/comment 与主体可见政策修正无需重扫所有栅格。旧、中间与最终模块字节均在本目录。

衣服控制点包含于 body 的 [-50,-60,35,8] 矩形；其他带披风的衣服和 Halloween 使用同一几何，只改变配色或增加内部星星。手部范围包含线宽、肘部和旋转拇指，帽饰范围包含曲线控制凸包、椭圆及外描边。栅格审计使用原生 Canvas 原绘制函数，涵盖压缩、起跳、下落及左右朝向。灵魂包括普通、探头、归位，持票/持种子、低能量，以及不同速度和时钟。仅原大的装饰发光矩形被明确排除；影子、光线、粒子与连线不强制扩大镜头。没有扫描代码或原生 Canvas 依赖进入产品。

这些是有限的人工姿态几何夹具，不能冒充浏览器正常操作。正常输入与实际纠偏的物理/预算证据另在 `near-camera-budget-fixed-report.json`；真实浏览器证据另在原字节 gzip 内。

## 失败与修复记录

`browser-first-failure-report.json.gz` 保留第一次固定 1000ms 截图的失败：保护已 active，原缓动仍在收敛，帽界为 6.67284 CSS。最终 helper 改为至多 3000ms 等待实际几何达到原 7.5 CSS 门槛，没有修改门槛或游戏时钟。最终真实等待 390 为 0.897661428 秒，320 为 0.676686211 秒。

`browser-reentry-failure-report.json.gz` 保留等待 3000ms 仍无法重入的实质产品问题。`near-reentry-boundary-report.json` 是独立正常输入复现；`near-reentry-fixed-report.json` 是最终修复复验；`new-reentry-tests-red.txt.gz` 保留新增两条回归在旧政策下失败的原日志。没有通过缩小输入终点或放宽画面阈值绕过缺陷。

第一次双引擎脚本在游戏断言开始前遇到子进程 git 的本地 EPERM；获准只读执行后通过。它是审阅工具的运行边界，不是被掩盖的产品失败。

## 文件与复核入口

- `independent-review.json`：结构化最终结论、准确计数、源哈希、边界修复与适用范围。
- `paint-envelope-audit.mjs` / `paint-envelope-report.json`：1,124 个原 Canvas 几何结果。
- `near-camera-budget-fixed-audit.mjs` / `near-camera-budget-fixed-report.json`：最终源码实际相机变化时的 1,376 比较。
- `near-reentry-boundary-*` 与 `near-reentry-fixed-*`：旧失败及修复后输入路线。
- `final-source-identity.json`：原栅格结果对最终几何代码的逐字节对应。
- `test-case-identity.json` / `protected-test-sources.json`：702 案例集合与 77 旧文件的完整性。
- `browser-final-report.json.gz`：28,432,570 原始字节；解压 SHA256 为 `bfc6892dabc6413f11729ce7cf266d0cd2feb5650e0110fad44477a716a95a27`。
- `full-final-tests.tap.gz`：702/702 原始日志；解压 SHA256 为 `a4bdd5dadb5c993279ce9ca75df7c11fcaacc8516037b4a5f9df628de4f57d6b`。
- `observed-png/`：独立审阅者实际查看的两张原尺寸 Canvas；390 回近及 320 路线暂停后 resize 到 390。均为本地预研截图，完整浏览器图片集由开发者证据保存。
- `raw-evidence-locators.json` / `manifest.json`：原证据路径、原字节和 gzip 哈希、最终精确文件清单。所有 gzip 都逐字节解压回验。

## 实际适用范围

单一最终 camera 指每个已观察的绘制帧各消费者共用。物体移动时改变 render 频率可能改变最后取样的几何，不宣称任意渲染频率下镜头路径相同。主角色/灵魂各一次读取针对这些首站开盖帧；旧 NPC、邮局路径有其他 presentation 调用，新模块不增加调用。嵌套与异常测试是限定的真实方法入口情形，不宣称支持任意外部回调同时篡改场景。

本目录不会把本地版本 33 预研、离屏 Canvas、CDP 模拟触屏或 synthetic adapter 夹具写成 v34 已发布、实机、Safari、性能或完整线上章节验收。最终可发布候选及公网步骤仍由 root 单独执行。adapter 的 context-error 夹具在 context 创建前就抛错，所以没有一个已创建的 owned context 可以关闭；正常真实浏览器的 ownedContextsClosed 为 true。
'''
(out/'README.md').write_text(readme)
shutil.copyfile(__file__,out/'build-review-package.py')
manifest={'schema':'v34-independent-review-evidence-1','status':'frozen','scope':'Local prestudy evidence only','files':[]}
for p in sorted(out.rglob('*')):
 if p.is_file() and p.name!='manifest.json':
  b=p.read_bytes();manifest['files'].append({'path':str(p.relative_to(out)),'bytes':len(b),'sha256':sha(b)})
manifest['fileCount']=len(manifest['files']);manifest['bytesExcludingManifest']=sum(x['bytes'] for x in manifest['files'])
write(out/'manifest.json',manifest)
for e in manifest['files']:
 p=out/e['path'];assert p.stat().st_size==e['bytes'] and sha(p.read_bytes())==e['sha256']
print(json.dumps({'directory':str(out),'status':'passed-prestudy-review','manifestSha256':sha((out/'manifest.json').read_bytes()),'manifestFileCount':manifest['fileCount'],'bytesExcludingManifest':manifest['bytesExcludingManifest'],'module':expected_module,'fullTests':702,'newCases':11,'paintScansIncludingSoul':1124,'physicsComparisons':1376,'boundaryPostFixCases':8},ensure_ascii=False))
