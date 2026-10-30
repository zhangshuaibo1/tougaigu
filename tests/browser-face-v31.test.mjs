import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DreamGame } from '../dist/dream-engine.js';
import { getTravelerMotion } from '../dist/dream-traveler-art.js';
import { transformCapPoint } from '../dist/dream-cap-art.js';
import { getTravelerFaceView, hasSoulJoy } from '../dist/dream-traveler-face.js';
import { FESTIVALS } from '../dist/dream-festivals.js';

const root = new URL('..', import.meta.url), noop = () => {};
const copy = value => JSON.parse(JSON.stringify(value));
const clamp = (v, low, high) => Math.max(low, Math.min(high, v));
const helpers = String.raw`
import asyncio,copy,json,sys,tempfile
from pathlib import Path
sys.path.insert(0,'scripts')
import browser_face_v31 as face
from browser_face_v31 import validate_face_snapshot,validate_face_record,FaceSequence,wait_for_natural_fatigue
payload=json.loads(Path(sys.argv[1]).read_text())
`;
function python(script, payload = {}) {
  const directory=mkdtempSync(join(tmpdir(),'tougaigu-face-fixture-'));
  try{
    const path=join(directory,'records.json');writeFileSync(path,JSON.stringify(payload));
    const result = spawnSync('python3', ['-c', helpers + script,path], {
      cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout:30000,
    });
    assert.equal(result.status, 0, result.stderr || result.error?.message || result.stdout);
    return result.stdout;
  }finally{rmSync(directory,{recursive:true,force:true});}
}
const extracted = spawnSync('python3', ['-c', String.raw`
import ast,json,sys
from pathlib import Path
sys.path.insert(0,'scripts')
from browser_face_v31 import FACE_FRAME_OBSERVER
tree=ast.parse(Path('scripts/browser-smoke.py').read_text())
probe=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='PROBE' for t in n.targets))
print(json.dumps(dict(probe=probe,observer=FACE_FRAME_OBSERVER)))
`], { cwd: root, encoding: 'utf8' });
assert.equal(extracted.status, 0, extracted.stderr);
const sources = JSON.parse(extracted.stdout);
const imports = [
  "import {getTravelerMotion as __qaGetTravelerMotion} from './dream-traveler-art.js';",
  "import {transformCapPoint as __qaTransformCapPoint} from './dream-cap-art.js';",
  "import {getTravelerFaceView as __qaGetTravelerFaceView,hasSoulJoy as __qaHasSoulJoy} from './dream-traveler-face.js';",
];
let probe = sources.probe;
for (const statement of imports) { assert(probe.includes(statement)); probe = probe.replace(statement, ''); }
globalThis.window = { devicePixelRatio: 1, addEventListener: noop, removeEventListener: noop };
globalThis.document = { hidden: false, addEventListener: noop, removeEventListener: noop };
globalThis.requestAnimationFrame = () => 1; globalThis.cancelAnimationFrame = noop;
const context = new Proxy({
  createLinearGradient: () => ({ addColorStop: noop }), createRadialGradient: () => ({ addColorStop: noop }),
  measureText: () => ({ width: 40 }),
}, { get: (object, key) => key in object ? object[key] : noop });
// These are offline callback/Canvas fixtures, not native browser input or
// rendered screenshots. All state snapshots below come from the real engine,
// its actual normal-input methods, and the literal app-module probe.
const fixturePNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
function harness(options = {}, width = 390) {
  let now = 100, next = 1;
  const callbacks = new Map(), timers = new Map(), listeners = new Map();
  const canvas = { width: 1, height: 1, getContext: () => context,
    getBoundingClientRect: () => ({ left: 0, top: 0, width, height: 431 }), toDataURL: () => fixturePNG };
  const game = new DreamGame(canvas, { onPuzzle: noop }); game.start({ chapterIndex: 0, sound: false, ...options });
  const readWindow = {
    addEventListener(type, callback) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(callback); },
    removeEventListener(type, callback) { listeners.get(type)?.delete(callback); },
  };
  const vm = { window: readWindow, document: { querySelector: selector => selector === '#dream-canvas' ? canvas : null },
    game, currentHud: null, lastHudAt: 0, controlSource: 'keyboard', save: { choices: { letter: null } },
    performance: { now: () => now }, innerWidth: width, innerHeight: 844,
    __qaGetTravelerMotion: getTravelerMotion, __qaTransformCapPoint: transformCapPoint,
    __qaGetTravelerFaceView: getTravelerFaceView, __qaHasSoulJoy: hasSoulJoy,
    requestAnimationFrame(callback) { const id = next++; callbacks.set(id, callback); return id; },
    cancelAnimationFrame(id) { callbacks.delete(id); },
    setTimeout(callback, milliseconds) { const id = next++; timers.set(id, { callback, at: now + milliseconds }); return id; },
    clearTimeout(id) { timers.delete(id); },
  };
  runInNewContext(probe, vm);
  const install = runInNewContext('(' + sources.observer + ')', vm);
  const h = {
    game, vm, read: () => copy(readWindow.__qaRead()),
    install(kind) { install({ kind }); },
    record: () => copy(readWindow.__qaFaceFrames.read()),
    has: name => Boolean(readWindow.__qaFaceFrames.read().latches[name]),
    tick(n = 1) {
      for (let i = 0; i < n; i++) {
        game.update(1 / 60); now += 1000 / 60;
        for (const [id, callback] of [...callbacks]) { callbacks.delete(id); callback(now); }
        for (const [id, timer] of [...timers]) if (now >= timer.at) { timers.delete(id); timer.callback(); }
      }
    },
    event(type, id = 'dream-canvas', extra = {}) {
      const target = { id, closest: () => ['stage-toggle', 'puzzle-continue'].includes(id) ? target : null };
      const event = { type, target, code: type === 'keydown' ? 'KeyE' : undefined, isTrusted: true, repeat: false, ...extra };
      for (const callback of listeners.get(type) || []) callback(event);
    },
    toggle(touch = false) {
      if (touch) {
        h.event('pointerdown', 'stage-toggle', { pointerType: 'touch', pointerId: 7 });
        h.event('pointerup', 'stage-toggle', { pointerType: 'touch', pointerId: 7 });
        h.event('click', 'stage-toggle', { pointerType: 'touch', pointerId: 7, detail: 1 });
      } else h.event('keydown');
      assert.equal(game.toggleSoul(), true);
    },
    stop() {
      const record = copy(readWindow.__qaFaceFrames.stop()); delete readWindow.__qaFaceFrames;
      assert.equal(callbacks.size, 0); assert.equal(timers.size, 0);
      assert([...listeners.values()].every(set => set.size === 0));
      return record;
    },
  };
  h.tick(12); return h;
}
function collect(h, touch = false) {
  h.install('ticket'); h.toggle(touch); h.tick(40);
  for (let i = 0; i < 300 && !h.game.memories[0].collected; i++) {
    const target = h.game.memories[0], soul = h.game.soul;
    h.game.setInput({ x: clamp((target.x - soul.x) / 65, -1, 1), y: clamp((target.y - soul.y) / 65, -1, 1) }); h.tick();
  }
  assert.equal(h.game.memories[0].collected, true);
  h.game.setInput({ x: 0, y: 0 }); h.tick(8);
  assert(h.record().latches.freeJoy);
}
function ticketRecords(width = 390) {
  const h = harness({}, width); collect(h, true); const collected = h.record();
  h.toggle(true); h.tick(54); const returned = h.stop(); h.game.destroy(); return { collected, returned };
}
function fatigueRecords() {
  const h = harness({}, 1280); collect(h); h.stop(); h.tick(45); h.install('fatigue');
  for (let i = 0; i < 1260 && !h.has('bodyTiredOpen'); i++) h.tick();
  assert(h.record().latches.bodyTiredOpen, 'actual original drain reaches <20 within one ideal 21s window');
  const low = h.record();
  for (const width of [390, 320]) { h.vm.innerWidth = width; h.tick(8); }
  const phone = h.record();h.toggle();h.tick(54);const returned=h.stop();h.game.destroy();return {low,phone,returned};
}
function lampRecord() {
  const h = harness({}, 1280); collect(h); h.stop(); h.toggle(); h.tick(100);
  for (let i=0;i<600;i++) {
    const b=h.game.body,dx=420-(b.x+b.vx*Math.abs(b.vx)/3300);
    if(Math.abs(420-b.x)<=12&&Math.abs(b.vx)<40)break;
    h.game.setInput({x:Math.abs(dx)>12?Math.sign(dx):0});h.tick(2);
  }
  h.game.setInput({x:0,y:0});h.tick(12);h.toggle();h.tick(40);
  for(let i=0;i<600;i++){
    const s=h.game.soul,target=h.game.lanterns[0];if(Math.hypot(target.x-s.x,target.y-s.y)<80)break;
    h.game.setInput({x:clamp((target.x-s.x)/65,-1,1),y:clamp((target.y-s.y)/65,-1,1)});h.tick();
  }
  h.game.setInput({x:0,y:0});assert.equal(h.game.pulse(),true);assert.equal(h.game.state,'paused');
  h.install('lamp');h.event('click','puzzle-continue',{pointerType:'mouse',pointerId:1,detail:1});
  assert.equal(h.game.resolvePuzzle(true),true);h.tick(2);h.toggle();h.tick(51);
  const record=h.stop();h.game.destroy();return record;
}

test('actual production snapshots keep presented-soul gaze and the two real fatigue thresholds distinct', () => {
  const tickets=ticketRecords(),fatigue=fatigueRecords(),lamp=lampRecord();
  const snapshots=[...Object.values(tickets.returned.latches).filter(x=>x.source),...Object.values(fatigue.returned.latches).filter(x=>x.source),lamp.latches.closedJoy];
  for(let chapterIndex=0;chapterIndex<6;chapterIndex++){const h=harness({chapterIndex});snapshots.push(h.read());h.game.destroy();}
  for(const festival of FESTIVALS){const h=harness({festival});snapshots.push(h.read());h.game.destroy();}
  const output=python(String.raw`
for s in payload['snapshots']:validate_face_snapshot(s)
base=payload['return'];assert base['facePresentation']['presentedSoul']['pose']=='return'
changes=[lambda s:s['facePresentation']['body'].update(kind='joy'),
 lambda s:s['facePresentation'].update(soulJoy=True),
 lambda s:s['facePresentation']['presentedSoul'].update(x=s['facePresentation']['rawSoul']['x']),
 lambda s:s['facePresentation']['body'].update(lookX=3),
 lambda s:s['facePresentation'].update(time=s['visualTime']+1),
 lambda s:s['facePresentation']['presentedSoul'].update(layer='world'),
 lambda s:s.update(emoteTime=0),lambda s:s.update(bodyIdentity=None)]
# Body identity belongs to the sequence validator, not the isolated view.
for change in changes[:-1]:
 bad=copy.deepcopy(base);change(bad)
 try:validate_face_snapshot(bad)
 except AssertionError:pass
 else:raise AssertionError('bad actual return/face evidence accepted')
low=payload['low'];assert 20<=low['energy']<=23
bad=copy.deepcopy(low);bad['facePresentation']['body'].update(kind='tired',sleepy=True)
try:validate_face_snapshot(bad)
except AssertionError:pass
else:raise AssertionError('23 was misrepresented as <20 body fatigue')
print('actual scopes, return path and separate fatigue thresholds checked')
`,{snapshots,return:tickets.returned.latches.returning,low:fatigue.returned.latches.soulTired});
  assert.match(output,/separate fatigue thresholds/);
});

test('real event sequences reject late installation, refreshed joy, wrong bodies and added native inputs', () => {
  const records=ticketRecords(320),lamp=lampRecord();
  const output=python(String.raw`
validate_face_record(payload['ticket']['collected'],['event','freeJoy'])
for r in [payload['ticket']['returned'],payload['lamp']]:validate_face_record(r,['event','returning','closedJoy'])
base=payload['ticket']['returned']
changes=[lambda r:r['initial'].update(memories=1),lambda r:r['initial'].update(source='after-input'),
 lambda r:r['latches']['closedJoy'].update(bodyIdentity=999),lambda r:r['latches']['closedJoy'].update(runId=999),
 lambda r:r['latches']['closedJoy'].update(emoteTime=0),lambda r:r['latches']['closedJoy'].update(emoteTime=2.3),
 lambda r:r['latches']['closedJoy'].update(source='native-capture'),
 lambda r:r['events'].append(copy.deepcopy(next(e for e in r['events'] if e['action']))),
 lambda r:next(e for e in r['events'] if e['action']).update(isTrusted=False),
 lambda r:r['latches'].pop('returning'),lambda r:r['latches'].update(closedJoy=copy.deepcopy(r['latches']['freeJoy'])),
 lambda r:r['images']['closedJoy'].update(sequence=-1),lambda r:r.update(violations=['event duration was refreshed'])]
for change in changes:
 bad=copy.deepcopy(base);change(bad)
 try:validate_face_record(bad,['event','freeJoy','returning','closedJoy'])
 except AssertionError:pass
 else:raise AssertionError('bad event/identity/native-input evidence accepted')
print('13 false event records rejected; first ticket and first lamp accepted')
`,{ticket:records,lamp});assert.match(output,/13 false event records rejected/);
});

test('natural fatigue proves open-lid <20 within the existing total deadline and real recovery', () => {
  const records=fatigueRecords();
  const output=python(String.raw`
validate_face_record(payload['low'],['soulTired','bodyTiredOpen'])
required=['soulTired','bodyTiredOpen','bodyTiredOpen-390','bodyTiredOpen-320','returning','recovered']
validate_face_record(payload['returned'],required)
base=payload['returned']
changes=[lambda r:r['latches']['bodyTiredOpen'].update(observedAt=r['startedAt']+21001),
 lambda r:r['latches']['bodyTiredOpen'].update(capPhase='closed',form='body'),
 lambda r:r['latches']['bodyTiredOpen'].update(energy=23),
 lambda r:r.update(depletionBudgetMs=42000),lambda r:r['latches'].pop('bodyTiredOpen-320'),
 lambda r:r['latches']['recovered'].update(emoteTime=2.3),
 lambda r:r['latches']['bodyTiredOpen-390']['viewport'].update(width=1280)]
for change in changes:
 bad=copy.deepcopy(base);change(bad)
 try:validate_face_record(bad,required)
 except AssertionError:pass
 else:raise AssertionError('false, late or closed-lid fatigue was accepted')
assert validate_face_record(base,required)['bodyFatigueScope'].startswith('open lid')
print('7 false fatigue records rejected; no closed-lid fatigue claim')
`,records);assert.match(output,/7 false fatigue records rejected/);
});

test('the <20 wait cannot restart the original 21-second depletion budget', () => {
  const output=python(String.raw`
class Sequence:
 kind='fatigue';deadline=121
 def __init__(self):self.checkpoints=[]
 async def checkpoint(self,name,**kw):self.checkpoints.append(name);clock[0]+=.2
class Page:
 def __init__(self,late=False):self.calls=[];self.late=late
 async def wait_for_function(self,expression,timeout):
  self.calls.append(dict(expression=expression,timeout=timeout))
  clock[0]+=21.01 if self.late else 18 if len(self.calls)==1 else .8
async def check():
 clock[0]=100;seq=Sequence();page=Page();await wait_for_natural_fatigue(page,seq)
 assert len(page.calls)==2 and page.calls[0]['timeout']==21000
 assert 0<page.calls[1]['timeout']<=2800 and 'energy<=23' in page.calls[0]['expression']
 assert seq.checkpoints==['soul-low-energy','body-tired-open']
 clock[0]=100;page=Page(late=True)
 try:await wait_for_natural_fatigue(page,Sequence())
 except AssertionError:pass
 else:raise AssertionError('late <=23 observation got another 21 seconds')
 assert len(page.calls)==1
clock=[100.0];old=face.time.monotonic;face.time.monotonic=lambda:clock[0]
try:asyncio.run(check())
finally:face.time.monotonic=old
print('one shared deadline, no second full wait and no gameplay inputs')
`);assert.match(output,/one shared deadline/);
});

test('the observer bounds long passive waits and really removes RAF, timer and native listeners', () => {
  const h=harness();collect(h);h.stop();h.install('fatigue');h.tick(1100);
  assert(h.record().frames>=1100);assert.equal(h.record().samples.length,96);
  const stopped=h.stop();assert.equal(stopped.active,false);assert.equal(stopped.reason,'cleanup');
  h.tick(60);assert.equal(h.vm.window.__qaFaceFrames,undefined);h.game.destroy();
  const expired=harness();expired.install('ticket');expired.tick(961);
  assert.equal(expired.record().active,false);assert.equal(expired.record().reason,'expired');
  assert(expired.record().violations.includes('bounded observer expired'));
  expired.stop();expired.game.destroy();
});

test('driver failures write evidence before a failure screenshot and clean the passive observer', () => {
  const record=ticketRecords().collected;
  const output=python(String.raw`
class Page:
 def __init__(self,root):self.root=root;self.active=False;self.stops=0;self.screenshots=0
 async def evaluate(self,script,arg=None):
  if script==face.FACE_FRAME_OBSERVER:self.active=True;return copy.deepcopy(payload)
  if script=='!!window.__qaFaceFrames':return self.active
  assert arg is True;self.active=False;self.stops+=1
  record=copy.deepcopy(payload);record.update(active=False,reason='cleanup',cleanup=dict(requested=True,stopped=True,removed=True));return record
 async def screenshot(self,**kw):
  self.screenshots+=1
  assert list(self.root.glob('*-interrupted.json')),'failure evidence must precede screenshot transport'
  raise RuntimeError('fixture screenshot transport failed')
async def check():
 with tempfile.TemporaryDirectory() as directory:
  root=Path(directory);page=Page(root)
  try:
   async with FaceSequence(page,root,'320') as sequence:
    await sequence.start('ticket')
    raise RuntimeError('original movement failed')
  except RuntimeError as error:assert str(error)=='original movement failed'
  else:raise AssertionError('original failure was swallowed')
  record=json.loads(next(root.glob('*-interrupted.json')).read_text())
  assert page.stops==1 and page.screenshots==1 and page.active is False
  assert record['cleanup']==dict(requested=True,stopped=True,removed=True)
  assert record['status']=='failed' and 'original movement failed' in record['error']
  assert 'transport failed' in record['failureScreenshotError']
asyncio.run(check())
print('immediate partial evidence and cleanup survive a screenshot transport failure')
`,record);assert.match(output,/immediate partial evidence/);
});
