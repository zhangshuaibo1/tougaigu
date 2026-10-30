from pathlib import Path
from datetime import datetime, timezone
import hashlib, http.server, json, os, re, subprocess, sys, threading, time

ROOT = Path('/workspace/scratch/2b18af2db412/tougaigu-v34-formal')
OUT = Path('/tmp/v34-formal-local34')
OUT.mkdir(exist_ok=False)
PYTHON = '/tmp/tougaigu-v32-browser-venv/bin/python'
environment = os.environ.copy()
environment['PLAYWRIGHT_BROWSERS_PATH'] = '/tmp/tougaigu-v32-browsers'
environment['FONTCONFIG_FILE'] = '/tmp/tougaigu-v32-fonts.conf'

def now():
    return datetime.now(timezone.utc).isoformat()

def hashes():
    paths = []
    for folder in ['dist', 'scripts', 'tests', '.github']:
        paths.extend(p for p in (ROOT / folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.suffix != '.pyc')
    paths.append(ROOT / 'package.json')
    return {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(paths)}

before = hashes()
record = {'version': '34.0.0', 'startedAt': now(), 'beforeCodeHashes': before, 'steps': [], 'status': 'running'}
server = None

def save():
    (OUT / 'execution.json').write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')

def run(command, log):
    start = time.monotonic()
    began = now()
    with (OUT / log).open('wb') as output:
        result = subprocess.run(command, cwd=ROOT, env=environment, stdout=output, stderr=subprocess.STDOUT)
    step = {'command': command, 'log': log, 'startedAt': began, 'completedAt': now(), 'seconds': time.monotonic() - start, 'exitCode': result.returncode}
    record['steps'].append(step)
    save()
    print(json.dumps(step, ensure_ascii=False), flush=True)
    if result.returncode:
        raise RuntimeError('Validation failed: ' + log)

try:
    save()
    run(['npm', 'test'], 'tests.txt')
    run(['npm', 'run', 'check'], 'references.txt')
    assert (ROOT / 'dist/index.html').read_bytes() == (ROOT / 'dist/dream.html').read_bytes()
    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(ROOT / 'dist'), **kwargs)
        def log_message(self, message, *args):
            with (OUT / 'server.txt').open('a') as log:
                log.write((message % args) + '\n')
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    port = server.server_address[1]
    threading.Thread(target=server.serve_forever, daemon=True).start()
    record['url'] = f'http://127.0.0.1:{port}/'
    run([PYTHON, 'scripts/browser_cap_framing_v34.py', '--url', record['url'], '--version', '34.0.0', '--output', str(OUT / 'browser')], 'browser.txt')
    report_path = OUT / 'browser/report.json'
    report = json.loads(report_path.read_text())
    assert report['status'] == 'passed' and report['version'] == '34.0.0' and len(report['cases']) == 3
    for case in report['cases']:
        assert case['status'] == 'passed' and not case['pageErrors'] and not case['httpErrors'] and not case['requestFailures']
    record['reportSha256'] = hashlib.sha256(report_path.read_bytes()).hexdigest()
    record['reportBytes'] = report_path.stat().st_size
    record['helperSeconds'] = report['elapsedSeconds']
    record['testSummary'] = {key: int(value) for key, value in re.findall(r'^# (tests|pass|fail|cancelled|skipped|todo) (\d+)$', (OUT / 'tests.txt').read_text(), re.M)}
    record['status'] = 'passed'
except Exception as error:
    record['status'] = 'failed'
    record['error'] = {'type': type(error).__name__, 'message': str(error)}
    raise
finally:
    if server is not None:
        server.shutdown()
        server.server_close()
    record['afterCodeHashes'] = hashes()
    record['codeStable'] = record['beforeCodeHashes'] == record['afterCodeHashes']
    record['completedAt'] = now()
    save()
    print(json.dumps({k: v for k, v in record.items() if k not in ['beforeCodeHashes', 'afterCodeHashes', 'steps']}, ensure_ascii=False), flush=True)
    if not record['codeStable']:
        raise RuntimeError('Source changed during local validation')
