from pathlib import Path
from datetime import datetime, timezone
import hashlib, json, re

out = Path('/tmp/v34-formal-local34')
root = Path('/workspace/scratch/2b18af2db412/tougaigu-v34-formal')
execution = json.loads((out / 'execution.json').read_text())
summary = json.loads((out / 'browser.txt').read_text().strip())
assert execution['status'] == 'failed' and execution['error']['type'] == 'FileNotFoundError'
assert len(execution['steps']) == 3 and all(step['exitCode'] == 0 for step in execution['steps'])
assert execution['codeStable'] and execution['beforeCodeHashes'] == execution['afterCodeHashes']
assert len(execution['beforeCodeHashes']) == 260
assert summary['details'] == 'cap-framing/report.json'
path = out / 'browser' / summary['details']
data = path.read_bytes()
report = json.loads(data)
assert summary['status'] == report['status'] == 'passed'
assert summary['expectedVersion'] == report['expectedVersion'] == '34.0.0'
assert hashlib.sha256(data).hexdigest() == summary['reportSha256']
assert report['currentURL'] == execution['url']
assert [case['viewport'] for case in report['cases']] == [{'width': 1280, 'height': 800}, {'width': 390, 'height': 844}, {'width': 320, 'height': 680}]
for case in report['cases']:
    assert case['status'] == 'passed' and case['initial']['version'] == '34.0.0'
    assert not case['pageErrors'] and not case['httpErrors'] and not case['requestFailures']
for name, digest in report['sourceFiles'].items():
    assert hashlib.sha256((root / name).read_bytes()).hexdigest() == digest == execution['beforeCodeHashes'][name]
for name, digest in execution['beforeCodeHashes'].items():
    assert hashlib.sha256((root / name).read_bytes()).hexdigest() == digest

test_text = (out / 'tests.txt').read_text()
counts = {key: int(value) for key, value in re.findall(r'^ℹ (tests|pass|fail|skipped|cancelled|todo) (\d+)$', test_text, re.M)}
assert counts == {'tests': 702, 'pass': 702, 'fail': 0, 'cancelled': 0, 'skipped': 0, 'todo': 0}
references = (out / 'references.txt').read_text()
assert 'Checked 70 JavaScript modules and 173 local references.' in references
assert 'Verified 238 asset references for 34.0.0; 0 files need changes.' in references

review = {
    'status': 'passed', 'reviewedAt': datetime.now(timezone.utc).isoformat(), 'expectedVersion': '34.0.0',
    'actualCommandExitCodes': [step['exitCode'] for step in execution['steps']], 'testSummary': counts,
    'testSummaryUnit': '702 individual cases as actually reported by this execution; do not borrow the prestudy file-container count',
    'reportPathReturnedByDriver': summary['details'], 'reportBytes': len(data),
    'reportSha256': hashlib.sha256(data).hexdigest(), 'reportSourceHashesExact': len(report['sourceFiles']),
    'allProtectedFilesExactBeforeAfterAndNow': 260, 'helperSeconds': report['elapsedSeconds'],
    'browserProcessSeconds': execution['steps'][2]['seconds'], 'cases': summary['cases'],
    'launcherPostprocessingFailure': {
        'preservedExecution': 'execution.json', 'originalError': execution['error'],
        'cause': 'The outer launcher assumed browser/report.json and a version field. The exact tested helper returns details=cap-framing/report.json and expectedVersion; its CLI and all three validation commands exited 0.',
        'followOnReadOnlyProbe': 'An initial read-only review expected TAP # summary lines and raised KeyError(pass). The actual log uses the observed Unicode info prefix and reports 702 cases. No test was rerun or relabelled as 78 containers.',
        'resolution': 'Use the successful driver-returned path; verify original report hash, expected and actual page versions, cases, and all source hashes. Parse the actual observed reporter format. Original execution/error, report, source and clocks remain unchanged.'
    },
    'scope': 'Current 34 local targeted framing browser, standard npm test, and reference commands. Full official candidate and public runs remain pending.'
}
(out / 'review.json').write_text(json.dumps(review, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(review, ensure_ascii=False))
