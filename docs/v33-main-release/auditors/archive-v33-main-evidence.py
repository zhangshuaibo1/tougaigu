import gzip,hashlib,io,json,tarfile
from pathlib import Path
from datetime import datetime,timezone

SOURCE=Path('/tmp/tougaigu-v33-main-40988381550')
OUT=Path('/tmp/v33-main-be057-evidence')
assert not OUT.exists(),'Keep frozen evidence immutable; select a new directory for any rerun.'
review=json.loads((SOURCE/'independent-main-review.json').read_text())
manual=json.loads((SOURCE/'manual-image-review.json').read_text())
assert review['status']=='passed' and manual['status']=='reviewed' and manual['images']
OUT.mkdir();sha=lambda b:hashlib.sha256(b).hexdigest();files=[]
def put(name,raw,role,origin=None,uncompressed=None):
    p=OUT/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(raw)
    item={'path':name,'bytes':len(raw),'sha256':sha(raw),'role':role}
    if origin:item['origin']=origin
    if uncompressed is not None:item.update(uncompressedBytes=len(uncompressed),uncompressedSha256=sha(uncompressed))
    files.append(item)
def compress(src,target,role):
    raw=(SOURCE/src).read_bytes();packed=gzip.compress(raw,compresslevel=9,mtime=0)
    assert gzip.decompress(packed)==raw
    put(target,packed,role,str(SOURCE/src),raw)
for name,role in [
 ('official-metadata.json','Official GitHub run, jobs, artifact, commit, Pages state and monitoring timeline'),
 ('independent-main-review.json','Independent complete candidate AND real public HTTPS audit'),
 ('manual-image-review.json','Selected original-size official PNG visual review, with exact source and frame scope'),
 ('auditor-adaptation.json','Exact identity/scope-only adaptation from prior accepted auditors; original validators retained'),
 ('face-png-count-note.json','Actual face PNG inventory for each independent route and original latch identities'),
]:put(name,(SOURCE/name).read_bytes(),role,str(SOURCE/name))
for scope in ['candidate','live']:
    for kind in ['face','inherited-gates','dialogue','companion']:
        name=scope+'-'+kind+('-summary.json' if kind=='inherited-gates' else '-evidence-summary.json')
        put(name,(SOURCE/name).read_bytes(),'Independent '+scope+' '+kind+' data revalidation',str(SOURCE/name))
for scope,target_scope in [('candidate','candidate'),('live','public')]:
    compress(scope+'/report.json',target_scope+'-report.json.gz','Unabridged original complete '+target_scope+' browser report')
    compress(scope+'/dialogue-matrix/report.json',target_scope+'-dialogue-matrix-report.json.gz','Original independent six-config '+target_scope+' dialogue report')
    compress(scope+'/companion/report.json',target_scope+'-companion-report.json.gz','Original independent three-context '+target_scope+' companion report')
for src,target,role in [
 ('browser-candidate.txt','browser-candidate.txt.gz','Unmodified complete candidate browser stdout'),
 ('browser-live.txt','browser-public.txt.gz','Unmodified complete public HTTPS browser stdout'),
 ('tests.txt','tests.txt.gz','Original 691/691 TAP, all old 675 and 683 names preserved'),
 ('references.txt','references.txt.gz','Original local references and 33.0.0 version-map checks'),
 ('source-integrity.json','source-integrity.json.gz','All 1138 source blob contents/modes, 144 runtime identities, exact Pages and public HTML'),
 ('artifact-audit.json','artifact-audit.json.gz','Complete original ZIP path inventory and SHA-256 digests'),
 ('original-png-inventory.json','original-png-inventory.json.gz','Every original official PNG size and digest'),
]:compress(src,target,role)
for name in ['commit.txt','node.txt','public-index.html']:
    put(name,(SOURCE/name).read_bytes(),'Original official source/environment/public HTML marker','official ZIP '+name)
sidecar_counts={}
for scope in ['candidate','live']:
    for name in ['1280-greenhouse-return-dialogue-event.json','1280-greenhouse-leaves-returned-dialogue-layout.json','1280-greenhouse-root-crossed-dialogue-layout.json']:
        put('raw/'+scope+'/'+name,(SOURCE/scope/name).read_bytes(),'Unmodified actual natural-return event or greenhouse layout sidecar','official ZIP '+scope+'/'+name)
    buffer=io.BytesIO();members=[]
    with tarfile.open(fileobj=buffer,mode='w',format=tarfile.PAX_FORMAT) as tar:
        for p in sorted((SOURCE/scope).rglob('*.json')):
            if p.name=='report.json':continue
            name=str(p.relative_to(SOURCE));raw=p.read_bytes();info=tarfile.TarInfo(name)
            info.size=len(raw);info.mode=0o644;info.mtime=0;info.uid=info.gid=0;info.uname=info.gname=''
            tar.addfile(info,io.BytesIO(raw));members.append({'path':name,'bytes':len(raw),'sha256':sha(raw)})
    raw_tar=buffer.getvalue();packed=gzip.compress(raw_tar,compresslevel=9,mtime=0)
    assert gzip.decompress(packed)==raw_tar
    put(scope+'-immediate-json.tar.gz',packed,'All original immediate JSON sidecars, including nested matrix records','official ZIP '+scope+'/**/*.json except three separately preserved complete reports',raw_tar)
    files[-1]['members']=members;sidecar_counts[scope]=len(members)
for im in manual['images']:
    raw=(SOURCE/im['path']).read_bytes();assert sha(raw)==im['sha256']
    put('png/'+im['path'],raw,'Unmodified original-size image actually opened for visual review','official ZIP '+im['path'])
    files[-1].update(width=im['width'],height=im['height'],unalteredOriginalPNG=True)
for name in ['audit-tougaigu-v29.py','audit-v33-main-faces.py','audit-v33-main-gates.py','audit-v33-main-dialogue.py','audit-v33-main-companion.py','review-v33-main-artifact.py','prepare-v33-main-auditors.py','prepare-v33-main-review.py','finish-v33-main-manual-review.py','archive-v33-main-evidence.py']:
    p=Path('/tmp')/name;put('auditors/'+name,p.read_bytes(),'Independent read-only data auditor; pure validators load from exact primary Git',str(p))
observed=[]
for scope in ['candidate','live']:
    dialogue=json.loads((SOURCE/(scope+'-dialogue-evidence-summary.json')).read_text())
    face=json.loads((SOURCE/(scope+'-face-evidence-summary.json')).read_text())
    companion=json.loads((SOURCE/(scope+'-companion-evidence-summary.json')).read_text())
    observed.append({'scope':scope,'naturalReturn':dialogue['naturalReturn']['validation'],'greenhouse':[{'label':x['label'],'bubbleVisible':x['actualVisibleDialogue'],'announcementVisible':x['actualAnnouncementVisible'],'dialogueAgeMs':x['dialogueClock'].get('ageMs'),'announcementText':x['announcementText']} for x in dialogue['greenhouseObservations']],'firstStationCoexistence':dialogue['matrix']['firstStationNaturalCoexistence'],'faceImageCount':len(face['uniqueCapturedCanvasFiles']),'companionSeconds':companion['elapsedSeconds'],'companionSnapshotOccurrences':companion['snapshotOccurrencesRevalidated'],'companionPNGs':companion['originalPNGCount']})
put('observed-scope-summary.json',(json.dumps(observed,ensure_ascii=False,indent=2)+'\n').encode(),'Actual independent timing, visibility and new companion measurements; no prior-run values substituted')
official=json.loads((SOURCE/'official-metadata.json').read_text());steps={x['name']:x for x in official['jobs']['jobs'][0]['steps']}
cstep=steps['Test candidate with real browser input'];pstep=steps['Test public deployment']
guide=f'''# v33 官方 main 与真实 HTTPS：小旅伴·抬头等你

**状态：完整候选、真实公网与独立原始证据审计已通过。** 本目录对应 main `{review['commit']}`，tree `{review['tree']}`，官方 [run {review['runId']}]({review['runUrl']})。这是 v33 当次验收记录，不宣称官网在后续迭代中的当前版本。

## 源码、部署与完整验证

- main 的两个父提交是已验 v32 main 93655 和 v33 候选 1d63072。1138 个源文件的 Git 内容和执行权限全部匹配官方 source.tar.gz；257 个受保护源码与 1d63072 精确一致，当前77个测试文件保持原样。
- Pages `{review['pagesHead']}`、tree `{review['pagesTree']}`：144 个运行文件的路径／内容／权限精确匹配 main，加空 `.nojekyll`；CNAME 是 `tougaigu.com`。官方实际下载的 public-index.html 与 main/dist/index.html 逐字节一致。
- 候选浏览器：{cstep['started_at']} 至 {cstep['completed_at']}，成功。真实 `https://tougaigu.com/?qa={review['commit']}`：{pstep['started_at']} 至 {pstep['completed_at']}，成功。
- 691/691 单元测试，原675和683个子测试名保留，全部691名称与已验v33候选相同；原v31的74测试文件、v32的76测试文件及夹具精确保留。
- 每套完整报告含1280、390、320视口；原6次跳跃、4个完整书本周期、4条完整邮局路线、6次手机结局阅读、4种桌面结局／重载，以及迟到资源隔离重新核验。末尾网络故意故障9/0/0严格逐项对应，额外网络、页面和HTTP错误均为0。
- 每套随后各运行6个独立对白配置，12份布局JSON／12张原图，成对Canvas与控件几何最大差0px。再运行3个全新小旅伴上下文，独立小猫原PNG各21张。

## 小旅伴范围

两套各自保存三种画面的正常输入、实际 shown 拾光归位路径、归位末段眨眼、闭盖后恢复、可信E／触控反转、暂停冻结、游戏内减少动态。每套独立elapsedSeconds、快照出现次数和全部数值见各自 companion-evidence-summary 与原报告，不能复用先前候选或本地预研的时长、帧数。

三个小猫上下文都从首站新开局进入，只收第一张票，不结算章节或制造奖励。小猫JSON记录身体坐标和run，没有对象身份；每帧共享 presentedSoul 的引用身份由那8个原单元测试与源码覆盖。暂停两份原Canvas字符串未写入报告，成功的原脚本断言和两份冻结状态保留。小猫子集单独操作游戏内减动，系统减动由先前原有矩阵覆盖；不扩大为所有服装、活动或实体设备验证。

companion 报告里的 sourceFiles 是执行机器本地文件的哈希；它们匹配准确 main 源码。公网来源还由准确Pages运行树、官方实际public HTML与版本化资源记录支持，不能仅用页面版本号声称已量到每份远端字节。

## 对白、图像与计数的准确范围

两套路线实际对白／公告可见性、自然归位计时及面部原图数量分别见 `observed-scope-summary.json` 与各自原始JSON。图片在DOM几何读取之后拍摄，不冒称同帧；旧CSS消融是在当前DOM中进行，不是运行完整旧版本。自然归位事件没有bodyIdentity，只证明同run／章节／死亡数、稳定坐标和可信E。

面部必需的原11个PNG名称保持，原观察器还可能保存合法第一灯freeJoy；若存在，按本次原始image／latch序号和哈希核验。各次图片数按实际数据记录，不把历史11或12当成所有后续运行固定值，也不改原face验证器。快照occurrence允许同一快照在报告多个位置出现，不能称为独立动画帧数。

## 原始证据和保留范围

官方 artifact `{review['artifactId']}`，{review['artifactZipBytes']}字节，SHA-256 `{review['artifactZipSha256']}`。共{review['artifactPaths']}个唯一ZIP载荷、{review['originalPNGCount']}张原PNG尺寸／哈希已核验；人工逐张打开{len(manual['images'])}张，具体记录见manual-image-review。

完整两份主报告、两份矩阵报告、两份小猫报告、原浏览器stdout与测试／引用日志均无删节无损压缩。两套即时JSON tar分别保留{sidecar_counts['candidate']}／{sidecar_counts['live']}个原始成员；manifest列出每个载荷、压缩前报告和tar成员的SHA-256。PNG保持原字节和尺寸，没有拼图、重绘或裁切。

完整 ZIP 在 `/tmp/tougaigu-v33-main-40988381550.zip`，全部原图和审计在 `/tmp/tougaigu-v33-main-40988381550`。官方artifact只有三天保留期，后续版本应持久继承本精简证据包。结果不包括实体手机、Safari、低端GPU、FPS基准或全部服装／特殊活动。已知窄屏抬盖帽沿裁切不由本轮小猫细化修复。
'''
put('README.md',guide.encode(),'Exact completed main/public verification and evidence scope')
manifest={'schemaVersion':1,'frozenAt':datetime.now(timezone.utc).isoformat(),'runId':review['runId'],'commit':review['commit'],'tree':review['tree'],'pagesHead':review['pagesHead'],'artifactId':review['artifactId'],'officialZipSha256':review['artifactZipSha256'],'status':'passed','payloadFiles':len(files),'totalPayloadBytes':sum(x['bytes'] for x in files),'files':files}
raw=(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode();(OUT/'manifest.json').write_bytes(raw)
for x in files:assert sha((OUT/x['path']).read_bytes())==x['sha256']
print(json.dumps({'directory':str(OUT),'payloadFiles':len(files),'payloadBytes':manifest['totalPayloadBytes'],'totalIncludingManifestBytes':manifest['totalPayloadBytes']+len(raw),'manifestSha256':sha(raw)},ensure_ascii=False))
