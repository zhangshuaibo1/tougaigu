import argparse, hashlib, io, json, re, stat, subprocess, tarfile, zipfile
from pathlib import Path, PurePosixPath

p=argparse.ArgumentParser()
p.add_argument('zip');p.add_argument('repo');p.add_argument('commit');p.add_argument('output')
a=p.parse_args();output=Path(a.output);output.mkdir(parents=True,exist_ok=True)
sha256=lambda data:hashlib.sha256(data).hexdigest()
blob=lambda data:hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
def safe(name):
    path=PurePosixPath(name)
    assert not path.is_absolute() and '..' not in path.parts and '\\' not in name,name
    return name
tree={}
for entry in subprocess.check_output(['git','ls-tree','-rz',a.commit],cwd=a.repo).split(b'\0'):
    if not entry:continue
    meta,name=entry.split(b'\t',1);mode,kind,h=meta.decode().split()
    if kind=='blob':tree[name.decode()]={'mode':mode,'sha':h}
archive=Path(a.zip);raw=archive.read_bytes()
record={'commit':a.commit,'zipBytes':len(raw),'zipSha256':sha256(raw),'artifactCodeExecuted':False,
        'sourceFiles':[],'zipFiles':[],'reports':[]}
with zipfile.ZipFile(io.BytesIO(raw)) as z:
    assert len(z.infolist())<20000
    assert sum(i.file_size for i in z.infolist())<2_000_000_000
    for i in z.infolist():
        safe(i.filename);assert not stat.S_ISLNK(i.external_attr>>16)
        if i.is_dir():continue
        data=z.read(i.filename)
        record['zipFiles'].append({'path':i.filename,'bytes':len(data),'sha256':sha256(data)})
        partial_trace = i.filename.startswith(('candidate/', 'live/')) and i.filename.endswith('.json')
        if i.filename.endswith('.png') or partial_trace or i.filename in ['commit.txt','tests.txt','references.txt','candidate/report.json','live/report.json','browser-candidate.txt','browser-live.txt']:
            target=output/i.filename;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
    assert z.read('commit.txt').decode().strip()==a.commit
    with tarfile.open(fileobj=io.BytesIO(z.read('source.tar.gz')),mode='r:gz') as t:
        seen=set()
        for member in t:
            safe(member.name)
            if member.isdir():continue
            assert member.isfile(),member.name
            assert member.name in tree,member.name
            data=t.extractfile(member).read()
            assert blob(data)==tree[member.name]['sha'],'source mismatch '+member.name
            seen.add(member.name)
            record['sourceFiles'].append({'path':member.name,'bytes':len(data),'gitBlob':tree[member.name]['sha']})
        assert seen==set(tree),'source archive omitted repository files'
    record['failureEvidence']=[f for f in record['zipFiles'] if f['path'].endswith('-failure.json')]
    record['partialEvidence']=[f for f in record['zipFiles'] if f['path'].startswith(('candidate/', 'live/')) and f['path'].endswith('.json') and not f['path'].endswith('/report.json')]
    for name in ['candidate/report.json','live/report.json']:
        if name not in z.namelist():continue
        data=z.read(name);r=json.loads(data)
        cases=[]
        for c in r['cases']:
            assert not c['pageErrors'] and not c['httpErrors']
            assert c['networkFailures']['exactMatch'] and c['finalImagesLoaded']
            cases.append({'viewport':c['viewport'],'version':c['version'],
              'pageErrors':c['pageErrors'],'httpErrors':c['httpErrors'],
              'networkFailureCount':len(c['networkFailures']['actual']),
              'finalExactNetworkMatch':True,'finalImagesLoaded':True,
              'postExtended':c.get('postExtended'),'endings':c.get('endings')})
        record['reports'].append({'path':name,'bytes':len(data),'sha256':sha256(data),'url':r.get('url'),'cases':cases})
    tests=z.read('tests.txt').decode()
    record['tests']={key:int(re.search(r'^# '+key+r' (\d+)$',tests,re.M).group(1)) for key in ['tests','pass','fail','skipped','cancelled','todo']}
    assert record['tests']['fail']==record['tests']['skipped']==record['tests']['cancelled']==record['tests']['todo']==0
    record['references']=z.read('references.txt').decode()
(output/'artifact-audit.json').write_text(json.dumps(record,ensure_ascii=False,indent=2))
print(json.dumps({'zipBytes':len(raw),'zipSha256':record['zipSha256'],'sourceFiles':len(record['sourceFiles']),
  'zipFiles':len(record['zipFiles']),'tests':record['tests'],
  'reports':[{'path':r['path'],'bytes':r['bytes'],'cases':len(r['cases'])} for r in record['reports']],
  'failureEvidence':record['failureEvidence']},ensure_ascii=False))
