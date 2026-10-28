import test from 'node:test';
import assert from 'node:assert/strict';
import { LOST_CASES, LOST_CASE_TOTALS } from '../dist/dream-lost-cases.js';
import {
  LOST_SAVE_KEY, createLostSave, validateLostSave, loadLostSave, persistLostSave, lostRevision,
  replaceLostSave, getLostRecord, getLostStats, mergeLostSaves, recordLostEvent,
} from '../dist/lost-progress.js';

const station = 'lost-station-01', halloween = 'lost-halloween-01', valentine = 'lost-valentine-01';
const event = (save, type, extra = {}) => {
  const item = LOST_CASES.find(item => item.id === extra.caseId) || LOST_CASES[0];
  const festival = !item.sceneId.startsWith('story-');
  return { type, caseId: item.id, sceneId: item.sceneId, variant: 0, seenClues: [], revision: lostRevision(save),
    chapterIndex: festival ? 0 : Number(item.sceneId.slice(6)), festivalId: festival ? item.sceneId : null, mode: festival ? 'festival' : 'story', ...extra };
};
const readBoth = (save, extra = {}, now = 1000) => {
  assert.equal(recordLostEvent(save, event(save, 'open', extra), { now }).ok, true);
  for (const clueIndex of [0, 1]) assert.equal(recordLostEvent(save, event(save, 'clue', { ...extra, clueIndex })).ok, true);
};
const solve = (save, extra = {}) => {
  const item = LOST_CASES.find(item => item.id === (extra.caseId || station));
  const variant = extra.variant ?? 0;
  return recordLostEvent(save, event(save, 'solve', { ...extra, claimantId: item.variants[variant].answer }));
};
const storageFixture = () => {
  const values = new Map();
  return { values, storage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) } };
};

test('a single inspected side survives a refresh in the selected evidence set', () => {
  const save = createLostSave(), { storage } = storageFixture();
  recordLostEvent(save, event(save, 'open', { variant: 1, seenClues: [0, 1] }), { now: 100 });
  assert.deepEqual(getLostRecord(save, station).seenClues, { 0: [], 1: [] });
  recordLostEvent(save, event(save, 'clue', { variant: 1, clueIndex: 0, seenClues: [0, 1] }));
  assert.equal(persistLostSave(save, storage), true);
  const restored = loadLostSave(storage), record = getLostRecord(restored, station);
  assert.deepEqual(record, { activeVariant: 1, activeAt: 100, seenClues: { 0: [], 1: [0] }, solvedVariants: [] });
  const before = JSON.stringify(restored);
  assert.equal(recordLostEvent(restored, event(restored, 'clue', { variant: 1, clueIndex: 0 })).changed, false);
  assert.equal(JSON.stringify(restored), before);
  recordLostEvent(restored, event(restored, 'clue', { variant: 1, clueIndex: 1 }));
  assert.equal(solve(restored, { variant: 1 }).firstSolve, true);
  assert.deepEqual(getLostStats(restored), { cases: 1, variants: 1, clues: 2 });
  assert.deepEqual(getLostRecord(restored, station).seenClues[0], []);
});

test('a solve requires the actual two clue events and a correct claimant, never a supplied summary', () => {
  const save = createLostSave();
  const correct = event(save, 'solve', { claimantId: 'keeper', seenClues: [0, 1] });
  assert.equal(recordLostEvent(save, correct).reason, 'unseen-clues');
  assert.deepEqual(save, createLostSave());
  recordLostEvent(save, event(save, 'clue', { clueIndex: 0, seenClues: [0, 1] }));
  const halfRead = JSON.stringify(save);
  assert.equal(recordLostEvent(save, correct).ok, false);
  assert.equal(JSON.stringify(save), halfRead);
  recordLostEvent(save, event(save, 'clue', { clueIndex: 1 }));
  for (const claimantId of ['moth', 'ashi', 'missing', '__proto__']) {
    const before = JSON.stringify(save);
    assert.equal(recordLostEvent(save, event(save, 'solve', { claimantId })).reason, 'invalid-claim');
    assert.equal(JSON.stringify(save), before);
  }
  assert.equal(recordLostEvent(save, correct).firstSolve, true);
  assert.deepEqual(getLostRecord(save, station).solvedVariants, [0]);
});

test('all authored solutions count once; wrong claims and replay solves never write or add rewards', () => {
  const save = createLostSave();
  for (const item of LOST_CASES) {
    for (const variant of item.variants) {
      const meta = { caseId: item.id, variant: variant.index };
      readBoth(save, meta);
      for (const claimant of variant.claimants) {
        if (claimant.id === variant.answer) continue;
        const before = JSON.stringify(save);
        assert.equal(recordLostEvent(save, event(save, 'solve', { ...meta, claimantId: claimant.id })).ok, false);
        const wrong = recordLostEvent(save, event(save, 'wrong', { ...meta, claimantId: claimant.id, seenClues: [0, 1] }));
        assert.equal(wrong.ok, true);
        assert.equal(wrong.changed, false);
        assert.equal(wrong.firstSolve, false);
        assert.equal(JSON.stringify(save), before);
      }
      assert.equal(recordLostEvent(save, event(save, 'wrong', { ...meta, claimantId: variant.answer })).reason, 'invalid-claim');
      const first = solve(save, meta);
      assert.equal(first.ok, true);
      assert.equal(first.changed, true);
      assert.equal(first.firstSolve, true);
      const finished = JSON.stringify(save), replay = solve(save, meta);
      assert.equal(replay.ok, true);
      assert.equal(replay.changed, false);
      assert.equal(replay.firstSolve, false);
      assert.equal(JSON.stringify(save), finished);
    }
  }
  assert.deepEqual(getLostStats(save), LOST_CASE_TOTALS);
  assert.deepEqual(Object.keys(save).sort(), ['cases', 'revision', 'revisionId', 'version']);
  for (const record of Object.values(save.cases)) assert.deepEqual(Object.keys(record).sort(), ['activeAt', 'activeVariant', 'seenClues', 'solvedVariants']);
});

test('v8 three-case saves retain their exact facts and leave all newly added cases naturally empty', () => {
  const legacyIds=[station,halloween,valentine],newCases=LOST_CASES.filter(item=>!legacyIds.includes(item.id));
  const legacy={version:1,revision:0,revisionId:'base',cases:Object.fromEntries(legacyIds.map(id=>[id,{activeVariant:1,activeAt:100,seenClues:{0:[0,1],1:[0,1]},solvedVariants:[0,1]}]))};
  const before=JSON.stringify(legacy),{storage}=storageFixture();assert.equal(persistLostSave(legacy,storage),true);
  const restored=loadLostSave(storage);assert.deepEqual(getLostStats(restored),{cases:3,variants:6,clues:12});assert.equal(newCases.length,LOST_CASE_TOTALS.cases-legacyIds.length);
  for(const item of newCases){assert.equal(Object.hasOwn(restored.cases,item.id),false);assert.deepEqual(getLostRecord(restored,item.id),{activeVariant:0,activeAt:0,seenClues:{0:[],1:[]},solvedVariants:[]});}
  const meta={caseId:newCases[0].id,variant:0};readBoth(restored,meta);assert.equal(solve(restored,meta).firstSolve,true);assert.deepEqual(getLostStats(restored),{cases:4,variants:7,clues:14});
  const merged=mergeLostSaves(legacy,restored);for(const id of legacyIds)assert.deepEqual(getLostRecord(merged,id),legacy.cases[id]);
  for(const item of newCases.slice(1)){assert.deepEqual(getLostRecord(merged,item.id).seenClues,{0:[],1:[]});assert.deepEqual(getLostRecord(merged,item.id).solvedVariants,[]);}
  assert.equal(JSON.stringify(legacy),before);assert.equal(persistLostSave(merged,storage),true);assert.deepEqual(loadLostSave(storage),merged);
});

test('late evidence and solves keep their facts without taking over another tab’s active variant', () => {
  const save = createLostSave();
  readBoth(save, { variant: 0 }, 100);
  recordLostEvent(save, event(save, 'open', { variant: 1 }), { now: 200 });
  const result = solve(save, { variant: 0 });
  assert.equal(result.firstSolve, true);
  assert.equal(result.record.activeVariant, 1);
  assert.equal(result.record.activeAt, 200);
  recordLostEvent(save, event(save, 'clue', { variant: 0, clueIndex: 0 }));
  assert.equal(getLostRecord(save, station).activeAt, 200);
});

test('same-revision sets merge across tabs and cases in any order without aliasing inputs', () => {
  const a = createLostSave(), b = createLostSave(), c = createLostSave();
  readBoth(a, { variant: 0 }, 100);
  solve(a);
  recordLostEvent(b, event(b, 'open', { variant: 1 }), { now: 200 });
  recordLostEvent(b, event(b, 'clue', { variant: 1, clueIndex: 0 }));
  recordLostEvent(c, event(c, 'open', { caseId: halloween }), { now: 300 });
  recordLostEvent(c, event(c, 'clue', { caseId: halloween, clueIndex: 1 }));
  const originals = [a, b, c].map(value => JSON.stringify(value));
  const merged = mergeLostSaves(mergeLostSaves(a, b), c);
  assert.deepEqual(mergeLostSaves(b, a), mergeLostSaves(a, b));
  assert.deepEqual(mergeLostSaves(a, mergeLostSaves(c, b)), merged);
  assert.deepEqual(mergeLostSaves(merged, merged), merged);
  assert.deepEqual(getLostRecord(merged, station), { activeVariant: 1, activeAt: 200, seenClues: { 0: [0, 1], 1: [0] }, solvedVariants: [0] });
  assert.deepEqual(getLostStats(merged), { cases: 1, variants: 1, clues: 4 });
  // The storage listener can merge local, event.newValue and storage again without losing a contribution.
  const tabA = mergeLostSaves(mergeLostSaves(a, b), c);
  const tabB = mergeLostSaves(mergeLostSaves(b, c), tabA);
  assert.deepEqual(tabA, tabB);
  merged.cases[station].seenClues[0].pop();
  assert.deepEqual([a, b, c].map(value => JSON.stringify(value)), originals);
});

test('equal-time active preferences converge and malformed timestamps cannot win', () => {
  const a = createLostSave(), b = createLostSave();
  recordLostEvent(a, event(a, 'open', { variant: 0 }), { now: 100 });
  recordLostEvent(b, event(b, 'open', { variant: 1 }), { now: 100 });
  const merged = mergeLostSaves(a, b);
  assert.deepEqual(merged, mergeLostSaves(b, a));
  assert.equal(getLostRecord(merged, station).activeVariant, 1);
  const corrupt = structuredClone(b);
  corrupt.cases[station].activeAt = Infinity;
  assert.equal(getLostRecord(mergeLostSaves(a, corrupt), station).activeVariant, 0);
  recordLostEvent(merged, event(merged, 'open', { variant: 0 }), { now: 50 });
  assert.equal(getLostRecord(merged, station).activeAt, 101);
  assert.equal(getLostRecord(mergeLostSaves(b, merged), station).activeVariant, 0);
});

test('a new import revision replaces old facts even after write failure and rejects stale live callbacks', () => {
  const old = createLostSave(), wanted = createLostSave();
  readBoth(old);
  solve(old);
  recordLostEvent(wanted, event(wanted, 'open', { caseId: halloween, variant: 1 }), { now: 100 });
  recordLostEvent(wanted, event(wanted, 'clue', { caseId: halloween, variant: 1, clueIndex: 0 }));
  const stale = event(old, 'solve', { claimantId: 'keeper' });
  const imported = replaceLostSave(wanted, old, old, { now: 1000, id: 'import-a' });
  assert.notEqual(lostRevision(imported), lostRevision(old));
  assert.equal(persistLostSave(imported, { setItem() { throw new Error('quota'); } }), false);
  const importedBefore = JSON.stringify(imported);
  assert.equal(recordLostEvent(imported, stale).reason, 'stale-revision');
  assert.equal(JSON.stringify(imported), importedBefore);
  readBoth(old, { variant: 1 });
  solve(old, { variant: 1 });
  for (const merged of [mergeLostSaves(imported, old), mergeLostSaves(old, imported)]) {
    assert.deepEqual(getLostRecord(merged, station).solvedVariants, []);
    assert.deepEqual(getLostRecord(merged, halloween).seenClues, { 0: [], 1: [0] });
    assert.equal(lostRevision(merged), lostRevision(imported));
  }
  assert.equal(recordLostEvent(imported, event(imported, 'clue', { caseId: halloween, variant: 1, clueIndex: 1 })).changed, true);
});

test('empty replacements and simultaneous imports win as whole revisions rather than mixing generations', () => {
  const current = createLostSave();
  readBoth(current);
  solve(current);
  const first = replaceLostSave(current, current, current, { now: 1000, id: 'first' });
  const empty = replaceLostSave(createLostSave(), first, first, { now: 1000, id: 'second' });
  assert.ok(empty.revision > first.revision);
  assert.deepEqual(mergeLostSaves(first, empty).cases, {});
  assert.deepEqual(mergeLostSaves(empty, current).cases, {});
  const alpha = replaceLostSave(current, current, current, { now: 2000, id: 'alpha' });
  const omega = replaceLostSave(createLostSave(), current, current, { now: 2000, id: 'omega' });
  assert.equal(alpha.revision, omega.revision);
  assert.deepEqual(mergeLostSaves(alpha, omega), omega);
  assert.deepEqual(mergeLostSaves(omega, alpha), omega);
  assert.deepEqual(getLostStats(mergeLostSaves(alpha, omega)), { cases: 0, variants: 0, clues: 0 });
});

test('unknown identifiers, mismatched contexts and invalid event values leave the save untouched', () => {
  const save = createLostSave(), before = JSON.stringify(save);
  const invalid = [
    null, [], {}, event(save, 'win'),
    event(save, 'open', { caseId: '__proto__' }), event(save, 'open', { caseId: 'constructor' }),
    event(save, 'open', { sceneId: 'halloween' }), event(save, 'open', { mode: 'festival' }),
    event(save, 'open', { festivalId: 'halloween' }), event(save, 'open', { chapterIndex: 1 }),
    event(save, 'open', { caseId: halloween, festivalId: 'valentine' }),
    event(save, 'open', { caseId: halloween, mode: 'story' }),
    event(save, 'open', { caseId: halloween, chapterIndex: 6 }),
    event(save, 'open', { caseId: halloween, chapterIndex: '0' }),
    event(save, 'open', { revision: undefined }), event(save, 'open', { revision: '1:base' }),
    ...[-1, 2, NaN, Infinity, '0', 0.5].map(variant => event(save, 'open', { variant })),
    ...[-1, 2, NaN, Infinity, '0', 0.5, undefined].map(clueIndex => event(save, 'clue', { clueIndex })),
    event(save, 'wrong', { claimantId: '__proto__' }), event(save, 'solve', { claimantId: 'constructor' }),
    Object.create(event(save, 'open')),
  ];
  for (const invalidEvent of invalid) {
    const result = recordLostEvent(save, invalidEvent);
    assert.equal(result.ok, false);
    assert.equal(result.changed, false);
    assert.equal(result.firstSolve, false);
    assert.equal(JSON.stringify(save), before);
  }
  assert.equal(getLostRecord(save, '__proto__'), null);
  assert.equal(getLostRecord(save, 'story-0'), null);
});

test('validation bounds known collections, discards prototype keys, and keeps seen and solved independent', () => {
  const raw = JSON.parse('{"version":1,"revision":0,"revisionId":"base","cases":{"__proto__":{"polluted":true},"constructor":{"solvedVariants":[0]},"unknown":{"solvedVariants":[0]},"lost-station-01":{"activeVariant":1,"activeAt":100,"seenClues":{"0":[0,0,1,2,-1,"0"],"1":[1,1,3],"__proto__":[0,1]},"solvedVariants":[1,1,2,"0"]}}}');
  const clean = validateLostSave(raw);
  assert.deepEqual(Object.keys(clean.cases), [station]);
  assert.equal(Object.getPrototypeOf(clean.cases), Object.prototype);
  assert.equal(Object.hasOwn(clean.cases, '__proto__'), false);
  assert.equal({}.polluted, undefined);
  assert.deepEqual(getLostRecord(clean, station), { activeVariant: 1, activeAt: 100, seenClues: { 0: [0, 1], 1: [1] }, solvedVariants: [1] });
  assert.deepEqual(getLostStats(clean), { cases: 1, variants: 1, clues: 3 });
  const withOnlySolve = validateLostSave({ version: 1, cases: { [station]: { solvedVariants: [0] } } });
  assert.deepEqual(getLostRecord(withOnlySolve, station).seenClues, { 0: [], 1: [] });
  const inherited = { version: 1, cases: Object.create({ [station]: raw.cases[station] }) };
  assert.deepEqual(validateLostSave(inherited), createLostSave());
  const huge = { version: 1, cases: Object.fromEntries(LOST_CASES.map(item => [item.id, {
    activeVariant: 1, activeAt: 100, seenClues: { 0: Array(10000).fill(0), 1: [0, 1] }, solvedVariants: Array(10000).fill(1),
  }])) };
  const bounded = validateLostSave(huge);
  assert.deepEqual(getLostStats(bounded), { cases: LOST_CASE_TOTALS.cases, variants: LOST_CASE_TOTALS.cases, clues: LOST_CASE_TOTALS.cases*3 });
  assert.ok(JSON.stringify(bounded).length < 2048);
  for (const invalid of [null, [], 1, { version: 2, cases: {} }, { version: 1, cases: [] }]) assert.deepEqual(validateLostSave(invalid), createLostSave());
});

test('timestamps and logical revisions remain bounded through clock rollback and extreme imports', () => {
  const maxTime = 8640000000000000;
  for (const activeAt of [-1, NaN, Infinity, 0.5, '1000', maxTime + 1]) {
    const input = { version: 1, cases: { [station]: { activeVariant: 1, activeAt, seenClues: { 1: [0] } } } };
    const record = getLostRecord(input, station);
    assert.equal(record.activeVariant, 0);
    assert.equal(record.activeAt, 0);
    assert.deepEqual(record.seenClues[1], [0]);
  }
  for (const revision of [-1, NaN, Infinity, 0.5, '1000', Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(lostRevision({ version: 1, revision, revisionId: 'z', cases: {} }), '0:base');
  }
  for (const revisionId of ['', '__proto__', 'constructor', 'x'.repeat(97), 'with:colon']) {
    assert.equal(lostRevision({ version: 1, revision: 1000, revisionId, cases: {} }), '0:base');
  }
  const save = createLostSave();
  recordLostEvent(save, event(save, 'open'), { now: 100 });
  for (const now of [50, NaN, Infinity, -1]) {
    const before = getLostRecord(save, station).activeAt;
    assert.equal(recordLostEvent(save, event(save, 'open', { variant: 1 }), { now }).ok, true);
    assert.equal(getLostRecord(save, station).activeAt, before + 1);
  }
  recordLostEvent(save, event(save, 'open'), { now: maxTime });
  const fullClock = JSON.stringify(save);
  assert.equal(recordLostEvent(save, event(save, 'open', { variant: 1 }), { now: maxTime }).reason, 'clock-exhausted');
  assert.equal(JSON.stringify(save), fullClock);
  assert.equal(recordLostEvent(save, event(save, 'clue', { clueIndex: 0 })).changed, true);
  const future = replaceLostSave(createLostSave(), save, save, { now: maxTime, id: 'future' });
  const next = replaceLostSave(createLostSave(), future, future, { now: maxTime, id: 'next' });
  assert.equal(next.revision, maxTime + 1);
  assert.equal(lostRevision(next), (maxTime + 1) + ':next');
  const exhausted = { version: 1, revision: Number.MAX_SAFE_INTEGER, revisionId: 'last', cases: {} };
  assert.throws(() => replaceLostSave(createLostSave(), exhausted, exhausted, { now: 1 }), RangeError);
  assert.equal(lostRevision(exhausted), Number.MAX_SAFE_INTEGER + ':last');
});

test('storage failures, malformed data and oversized input are isolated to the lost-case key', () => {
  const save = createLostSave(), { values, storage } = storageFixture();
  values.set('tougaigu.rewards.v1', 'untouched rewards');
  values.set('tougaigu.capbook.v1', 'untouched album');
  readBoth(save, { caseId: valentine, variant: 1 });
  solve(save, { caseId: valentine, variant: 1 });
  assert.equal(LOST_SAVE_KEY, 'tougaigu.lostcases.v1');
  assert.equal(persistLostSave(save, storage), true);
  assert.deepEqual(loadLostSave(storage), save);
  assert.equal(values.get('tougaigu.rewards.v1'), 'untouched rewards');
  assert.equal(values.get('tougaigu.capbook.v1'), 'untouched album');
  for (const raw of ['broken', 'null', '[]', '{"version":2,"cases":{}}', JSON.stringify({ ...save, padding: 'x'.repeat(17000) })]) {
    values.set(LOST_SAVE_KEY, raw);
    assert.deepEqual(loadLostSave(storage), createLostSave());
  }
  assert.deepEqual(loadLostSave({ getItem() { throw new Error('blocked'); } }), createLostSave());
  assert.deepEqual(loadLostSave(null), createLostSave());
  assert.equal(persistLostSave(save, null), false);
  assert.equal(persistLostSave(save, {}), false);
  assert.equal(persistLostSave(save, { setItem() { throw new Error('quota'); } }), false);
});

test('validation and getters return detached records and never mutate their input', () => {
  const save = createLostSave();
  readBoth(save);
  solve(save);
  const before = JSON.stringify(save);
  const clean = validateLostSave(save), record = getLostRecord(save, station), missing = getLostRecord(save, halloween);
  clean.cases[station].solvedVariants.length = 0;
  record.seenClues[0].length = 0;
  missing.seenClues[0].push(1);
  assert.equal(JSON.stringify(save), before);
  assert.deepEqual(getLostRecord(save, halloween).seenClues[0], []);
  assert.deepEqual(getLostRecord(save, station).solvedVariants, [0]);
});
