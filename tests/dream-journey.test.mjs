import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getJourneyFacts, getGreenhouseStage, getDiscoveredLetter,
  normalizeJourneyContext, resolveChapterStory, getJourneyCapLines,
} from '../dist/dream-journey.js';
import { CHAPTERS, CAST, PUZZLES, STORY_CHOICES, ENDINGS } from '../dist/dream-story.js';
import { STORY_ENCOUNTERS, getStoryEncounter, getStoryEncounterKey } from '../dist/dream-encounters.js';

const text = lines => lines.map(line => line.text).join('');
const frozen = value => {
  assert.ok(Object.isFrozen(value));
  for (const child of Object.values(value)) if (child && typeof child === 'object') frozen(child);
};
const exact = (ticket = true, seed = true, seals = [0, 1]) => getJourneyFacts({
  stationRecord: {memories: ticket ? [0] : [1, 2]},
  greenhouseRecord: {memories: seed ? [1] : [0, 2], seals},
});

test('ticket and seed evidence use their exact chapter-local indexes, never totals or other fragments', () => {
  assert.deepEqual(exact(), {hasTicket: true, hasSeed: true, greenhouseSeals: [0, 1]});
  assert.deepEqual(exact(false, false, [1]), {hasTicket: false, hasSeed: false, greenhouseSeals: [1]});
  assert.deepEqual(getJourneyFacts({
    stationRecord: {memories: [1, 2], bestMemories: 3, completed: true, hasTicket: true},
    greenhouseRecord: {memories: [0, 2], bestMemories: 3, completed: true, hasSeed: true, seals: [1, 1, 2, -1, '0']},
  }), {hasTicket: false, hasSeed: false, greenhouseSeals: [1]});
  const source = Object.freeze({stationRecord: Object.freeze({memories: Object.freeze([2, 0, 0])}),
    greenhouseRecord: Object.freeze({memories: Object.freeze([1]), seals: Object.freeze([1, 0, 1])})});
  const result = getJourneyFacts(source);
  frozen(result); assert.deepEqual(result.greenhouseSeals, [0, 1]);
  assert.deepEqual(source.stationRecord.memories, [2, 0, 0]);
});

test('malformed evidence cannot call accessors, custom iterators or coercion hooks to fabricate discoveries', () => {
  const empty = {hasTicket: false, hasSeed: false, greenhouseSeals: []};
  const hostile = {valueOf() { throw Error('coercion'); }, toString() { throw Error('coercion'); }};
  for (const invalid of [undefined, null, false, 3, '3', [], Symbol('facts'), 0n, hostile, new Date()]) {
    assert.deepEqual(getJourneyFacts(invalid), empty);
  }
  const inherited = Object.create({memories: [0, 1], seals: [0, 1]});
  assert.deepEqual(getJourneyFacts({stationRecord: inherited, greenhouseRecord: inherited}), empty);
  const getter = Object.defineProperty({}, 'memories', {get() { throw Error('getter must not run'); }});
  assert.deepEqual(getJourneyFacts({stationRecord: getter, greenhouseRecord: getter}), empty);
  const array = [1];
  Object.defineProperty(array, '0', {get() { throw Error('element getter must not run'); }});
  array[Symbol.iterator] = () => { throw Error('iterator must not run'); };
  assert.deepEqual(getJourneyFacts({stationRecord: {memories: array}, greenhouseRecord: {memories: array, seals: array}}), empty);
  const nullPrototype = Object.create(null); nullPrototype.memories = [0, 1]; nullPrototype.seals = [0];
  assert.deepEqual(getJourneyFacts({stationRecord: nullPrototype, greenhouseRecord: nullPrototype}), {hasTicket: true, hasSeed: true, greenhouseSeals: [0]});
});

test('growth needs a planted seed and counts either exact lamp once, independent of pickup order', () => {
  for (const seals of [[], [0], [1], [0, 1], [1, 0, 1]]) {
    assert.equal(getGreenhouseStage({seedPlanted: false, seals}), 0);
    assert.equal(getGreenhouseStage({seedPlanted: 'true', seals}), 0);
  }
  assert.equal(getGreenhouseStage({seedPlanted: true, seals: []}), 1);
  assert.equal(getGreenhouseStage({seedPlanted: true, seals: [0]}), 2);
  assert.equal(getGreenhouseStage({seedPlanted: true, seals: [1]}), 2);
  assert.equal(getGreenhouseStage({seedPlanted: true, seals: [1, 0, 1, '1', true]}), 3);
  assert.equal(getGreenhouseStage({seedPlanted: true, seals: [2, -1, NaN, Infinity, '0']}), 1);
  assert.equal(getGreenhouseStage({seedPlanted: true, seals: 2}), 1);
  assert.equal(getGreenhouseStage(null), 0);
});

test('a letter reveals the actual second or third fragment instead of a prefix of its summary count', () => {
  for (let chapter = 0; chapter < 6; chapter++) {
    const second = getDiscoveredLetter(chapter, {record: {memories: [1]}, legacyCount: 1});
    assert.deepEqual(second, {fragments: [{index: 1, text: CHAPTERS[chapter].memories[1]}], missing: [0, 2], legacyOnly: false});
    const sparse = getDiscoveredLetter(chapter, {record: {memories: [2, 0, 2]}, legacyCount: 3});
    assert.deepEqual(sparse.fragments.map(item => item.index), [0, 2]);
    assert.deepEqual(sparse.missing, [1]);
    assert.equal(sparse.legacyOnly, false);
    frozen(sparse);
  }
});

test('legacy totals remain unknown identities and cannot imply a readable ticket, seed or full letter', () => {
  for (const legacyCount of [1, 2, 3]) {
    const letter = getDiscoveredLetter(0, {legacyCount, record: {memories: []}});
    assert.deepEqual(letter, {fragments: [], missing: [0, 1, 2], legacyOnly: true});
  }
  for (const legacyCount of [-1, 0, 4, 1.5, '1', true, Infinity, NaN, {}, [], Symbol('count')]) {
    assert.equal(getDiscoveredLetter(1, {legacyCount}).legacyOnly, false);
  }
  const exactOne = getDiscoveredLetter(1, {legacyCount: 3, record: {memories: [1, '0', -1, 3, NaN]}});
  assert.deepEqual(exactOne.fragments.map(item => item.index), [1]);
  assert.equal(exactOne.legacyOnly, false);
});

test('invalid chapter identifiers and accessor records cannot expose another chapter or unseen prose', () => {
  for (const chapter of [-1, 6, 1.5, '0', true, {}, [], NaN, Infinity, Symbol('chapter'), 0n, null, undefined]) {
    assert.deepEqual(getDiscoveredLetter(chapter, {record: {memories: [0, 1, 2]}, legacyCount: 3}), {fragments: [], missing: [], legacyOnly: false});
    assert.equal(resolveChapterStory(chapter, 'intro', exact()), null);
  }
  const getter = Object.defineProperty({}, 'record', {get() { throw Error('must not run'); }});
  assert.deepEqual(getDiscoveredLetter(0, getter), {fragments: [], missing: [0, 1, 2], legacyOnly: false});
  for (const kind of [null, 'constructor', 'outro ', 0, {}, Symbol('kind')]) assert.equal(resolveChapterStory(0, kind, exact()), null);
});

test('carried and returning seeds cannot be described as planted even with an inconsistent growth value', () => {
  for (const seedPhase of ['missing', 'held', 'returning']) {
    const state = normalizeJourneyContext({hasTicket: true, hasSeed: true, seedPhase, plantStage: 3, greenhouseSeals: [0, 1]});
    assert.equal(state.plantStage, 0);
    assert.equal(state.seedPhase, seedPhase);
    assert.equal(state.hasSeed, seedPhase !== 'missing');
    frozen(state);
  }
  assert.deepEqual(normalizeJourneyContext(exact()), {hasTicket: true, ticketPhase: 'stowed', hasSeed: true, seedPhase: 'planted', plantStage: 3});
  assert.equal(normalizeJourneyContext({seedPhase: 'planted', plantStage: '3'}).plantStage, 1);
  assert.equal(normalizeJourneyContext({seedPhase: 'unexpected', hasSeed: true, plantStage: 3}).plantStage, 0);
  assert.equal(normalizeJourneyContext({hasTicket: 'true', plantStage: 3}).hasTicket, false);
  assert.equal(normalizeJourneyContext({plantStage: 3}).seedPhase, 'missing');
});

test('ticket phases distinguish a held or returning ticket from a stowed ticket and preserve legacy ownership', () => {
  assert.equal(normalizeJourneyContext({hasTicket: true}).ticketPhase, 'stowed');
  assert.equal(normalizeJourneyContext({hasTicket: false}).ticketPhase, 'missing');
  for (const ticketPhase of ['missing', 'held', 'returning', 'stowed']) {
    const input = Object.freeze({ticketPhase, hasTicket: ticketPhase !== 'stowed'});
    const state = normalizeJourneyContext(input);
    assert.equal(state.ticketPhase, ticketPhase);
    assert.equal(state.hasTicket, ticketPhase === 'stowed', 'An explicit phase owns the current location even with a conflicting old flag');
    assert.equal(input.ticketPhase, ticketPhase); frozen(state);
  }
  for (const ticketPhase of ['planted', 'STOWED', null, true, 1, {}, [], Symbol('phase')]) {
    const state = normalizeJourneyContext({hasTicket: true, ticketPhase});
    assert.equal(state.ticketPhase, 'missing'); assert.equal(state.hasTicket, false);
  }
  const getter = Object.defineProperty({hasTicket: false}, 'ticketPhase', {get() { throw Error('getter must not run'); }});
  assert.equal(normalizeJourneyContext(getter).ticketPhase, 'missing');
});

test('station conversations during ticket return acknowledge the actual passenger without claiming arrival', () => {
  const keys = new Set();
  for (const ticketPhase of ['missing', 'held', 'returning', 'stowed']) keys.add(getStoryEncounterKey(0, {journey: {ticketPhase}}));
  assert.equal(keys.size, 4, 'A conversation during return must not consume the later arrival greeting');
  for (const ticketPhase of ['held', 'returning']) for (const seals of [0, 1, 2]) for (const repeated of [false, true]) {
    const journey = {ticketPhase, hasTicket: true};
    const lines = getStoryEncounter(0, {journey, seals, repeated});
    assert.equal(lines.length, repeated ? 1 : 2); frozen(lines);
    assert.match(text(lines), ticketPhase === 'held' ? /拾光怀里/ : /正在回家|正抱着去程票回家/);
    assert.doesNotMatch(text(lines), /票还在站台|票还等在上方|去程票收进|车票也收好了|去程票也在车上|票坐稳了/);
    assert.equal(getStoryEncounterKey(0, {journey, seals, repeated}), getStoryEncounterKey(0, {journey, seals}));
    for (const line of lines) { assert.ok(CAST[line.speaker]); assert.ok([...line.text].length <= 45, line.text); }
  }
  assert.deepEqual(getStoryEncounter(0, {journey: {hasTicket: true}}), getStoryEncounter(0, {journey: {ticketPhase: 'stowed'}}));
  assert.match(text(getStoryEncounter(0, {journey: {ticketPhase: 'stowed'}})), /去程票收进小火车了/);
});

test('chapter letters cannot call an incoming ticket missing or already seated on the train', () => {
  for (const ticketPhase of ['held', 'returning']) for (const kind of ['intro', 'outro']) {
    const lines = resolveChapterStory(0, kind, {hasTicket: true, ticketPhase});
    assert.equal(lines.length, 3); frozen(lines);
    assert.match(text(lines), ticketPhase === 'held' ? /接住去程票|去程票还在我怀里/ : /正抱着去程票回家|去程票正随我回到头顶/);
    assert.doesNotMatch(text(lines), /忘了带车票|还没带回的念头|去程票还在头里|去程票坐进小火车了/);
    for (const line of lines) { assert.ok(CAST[line.speaker]); assert.ok([...line.text].length <= 45, line.text); }
  }
});

test('station intro and outro acknowledge a stowed ticket only when exact facts support it', () => {
  const ownedIntro = resolveChapterStory(0, 'intro', exact(true, false));
  assert.match(text(ownedIntro), /去程票还在/);
  const missingOutro = resolveChapterStory(0, 'outro', exact(false, false));
  assert.match(text(missingOutro), /还没带回的念头/);
  assert.doesNotMatch(text(missingOutro), /去程票坐进|第一片念头带回来/);
  const ownedOutro = resolveChapterStory(0, 'outro', exact(true, false));
  assert.match(text(ownedOutro), /去程票坐进.*种子/);
  frozen(ownedOutro);
  assert.notEqual(ownedOutro, resolveChapterStory(0, 'outro', exact(true, false)));
  assert.notEqual(ownedOutro[0], CHAPTERS[0].outro[0]);
});

test('greenhouse stories distinguish empty pots, carried seeds, planted seeds, leaves and flowers', () => {
  const emptyPlain = resolveChapterStory(1, 'intro', exact(false, false));
  const emptyTicket = resolveChapterStory(1, 'intro', exact(true, false));
  assert.match(text(emptyPlain), /小盆倒是空着/); assert.doesNotMatch(text(emptyPlain), /旧车票/);
  assert.match(text(emptyTicket), /旧车票折成了小纸盆/);
  for (const seedPhase of ['held', 'returning']) {
    const body = text(resolveChapterStory(1, 'outro', {seedPhase, plantStage: 3}));
    assert.match(body, /种子还在回家的路上/); assert.doesNotMatch(body, /种子在头里开花了/);
  }
  for (const [seals, pattern] of [[[], /种子已经在头里安家/], [[0], /小芽已经长出叶子/], [[1], /小芽已经长出叶子/], [[0, 1], /种子在头里开花了/]]) {
    assert.match(text(resolveChapterStory(1, 'outro', exact(true, true, seals))), pattern);
  }
  assert.match(text(resolveChapterStory(1, 'outro', exact(true, false, [0, 1]))), /小盆还空着/);
});

test('resolved story lines remain compact, use known faces and do not move the later identity reveal', () => {
  const facts = [exact(false, false), exact(true, false), ...[[], [0], [1], [0, 1]].map(seals => exact(true, true, seals)),
    {seedPhase: 'held'}, {seedPhase: 'returning'}];
  for (let chapter = 0; chapter < 6; chapter++) for (const kind of ['intro', 'outro']) for (const state of facts) {
    const lines = resolveChapterStory(chapter, kind, state);
    assert.equal(lines.length, 3); frozen(lines);
    for (const line of lines) {
      assert.ok(CAST[line.speaker]);
      assert.ok([...line.text].length >= 13 && [...line.text].length <= 45, line.text);
      if (chapter < 2) assert.doesNotMatch(line.text, /小满|我的女儿|我就是/);
    }
    if (chapter > 1) assert.deepEqual(lines, CHAPTERS[chapter][kind]);
  }
});

test('default NPC callers keep their shipped branches while precise ticket ownership changes the station response', () => {
  for (let chapter = 0; chapter < 6; chapter++) for (const seals of [0, 1, 2]) {
    assert.equal(getStoryEncounter(chapter, {seals}), STORY_ENCOUNTERS[chapter].lines[seals]);
    assert.equal(getStoryEncounter(chapter, {seals, repeated: true}), STORY_ENCOUNTERS[chapter].repeat[seals]);
  }
  for (const seals of [0, 1, 2]) {
    const absent = getStoryEncounter(0, {seals, journey: {hasTicket: false}});
    const present = getStoryEncounter(0, {seals, journey: {hasTicket: true}});
    assert.notDeepEqual(absent, present);
    assert.match(text(absent), /去程票.*上方|去程票.*留在站台/);
    assert.doesNotMatch(text(absent), /车票也收好了|去程票也在车上|去程票收进/);
    assert.match(text(present), /去程票|车票/);
    frozen(absent); frozen(present);
  }
});

test('NPC reaction keys change for new discoveries or lamp stages and preserve later NPC repeat behavior', () => {
  const state = {seals: 0, journey: {hasTicket: false}};
  assert.notEqual(getStoryEncounterKey(0, state), getStoryEncounterKey(0, {...state, journey: {hasTicket: true}}));
  assert.notEqual(getStoryEncounterKey(0, state), getStoryEncounterKey(0, {...state, seals: 1}));
  assert.equal(getStoryEncounterKey(0, state), getStoryEncounterKey(0, {...state, repeated: true}));
  const seen = new Set();
  for (const journey of [{seedPhase: 'missing'}, {seedPhase: 'held'}, {seedPhase: 'returning'},
    {seedPhase: 'planted', plantStage: 1}, {seedPhase: 'planted', plantStage: 2}, {seedPhase: 'planted', plantStage: 3}]) {
    const key = getStoryEncounterKey(1, {seals: 1, journey});
    assert.equal(seen.has(key), false); seen.add(key);
  }
  for (let chapter = 2; chapter < 6; chapter++) {
    assert.equal(getStoryEncounterKey(chapter, {seals: 0}), STORY_ENCOUNTERS[chapter].id);
    assert.equal(getStoryEncounterKey(chapter, {seals: 2, journey: {plantStage: 3}}), STORY_ENCOUNTERS[chapter].id);
  }
  assert.equal(getStoryEncounterKey('1', state), null);
});

test('new NPC responses acknowledge actual plant phases without leaking identities or riddle answers', () => {
  const journeys = [
    {hasTicket: false, seedPhase: 'missing'}, {hasTicket: true, seedPhase: 'missing'},
    {seedPhase: 'held'}, {seedPhase: 'returning'},
    ...[1, 2, 3].map(plantStage => ({seedPhase: 'planted', plantStage})),
  ];
  for (const chapter of [0, 1]) for (const journey of journeys) for (const seals of [0, 1, 2]) for (const repeated of [false, true]) {
    const lines = getStoryEncounter(chapter, {journey, seals, repeated});
    assert.equal(lines.length, repeated ? 1 : 2); frozen(lines);
    for (const line of lines) {
      assert.ok(CAST[line.speaker]);
      assert.ok([...line.text].length >= 8 && [...line.text].length <= 45, line.text);
      assert.doesNotMatch(line.text, /小满|女儿|我就是|谜底|正确答案|答案是/);
      for (const puzzle of PUZZLES) if ([...puzzle.options[puzzle.answer]].length >= 3) {
        assert.equal(line.text.includes(puzzle.options[puzzle.answer]), false, line.text);
      }
    }
  }
  assert.match(text(getStoryEncounter(1, {journey: {seedPhase: 'missing'}})), /旧靴子.*种子.*蘑菇/);
  assert.match(text(getStoryEncounter(1, {journey: {seedPhase: 'held', plantStage: 3}})), /还在拾光手里/);
  assert.match(text(getStoryEncounter(1, {journey: {seedPhase: 'planted', plantStage: 3}})), /真的开花/);
});

test('short cap feedback belongs to the actual seed event and keeps held, returning and grown states distinct', () => {
  assert.equal(getJourneyCapLines(0, {type: 'memory', index: 0}, exact()), null);
  assert.equal(getJourneyCapLines(1, {type: 'memory', index: 0}, exact()), null);
  assert.equal(getJourneyCapLines(1, {type: 'memory', index: 1}, {seedPhase: 'missing'}), null);
  assert.equal(getJourneyCapLines(1, {type: 'seal', index: '0'}, exact()), null);
  assert.equal(getJourneyCapLines(1, 'growth', exact()), null, 'the controller owns growth announcements');
  for (const [facts, expected] of [
    [{seedPhase: 'missing'}, /小盆还空着/],
    [{seedPhase: 'missing', hasTicket: true}, /旧车票折成小纸盆/],
    [{seedPhase: 'held', plantStage: 3}, /种子接住了.*E/],
    [{seedPhase: 'returning', plantStage: 3}, /等拾光把种子轻轻放下/],
    [{seedPhase: 'planted', plantStage: 1}, /种子在小盆里坐好了/],
    [{seedPhase: 'planted', plantStage: 2}, /叶子探出头了/],
    [{seedPhase: 'planted', plantStage: 3}, /这朵小花/],
  ]) {
    const lines = getJourneyCapLines(1, {type: 'return'}, facts);
    assert.match(text(lines), expected); frozen(lines);
    for (const line of lines) assert.ok([...line.text].length <= 30, line.text);
  }
});

test('reading journey feedback cannot mutate imported facts, base stories, choices, endings or NPC catalogs', () => {
  const before = JSON.stringify({CHAPTERS, STORY_CHOICES, ENDINGS, STORY_ENCOUNTERS});
  const state = Object.freeze({hasTicket: true, hasSeed: true, greenhouseSeals: Object.freeze([1, 0]), seedPhase: 'planted', plantStage: 3});
  const options = Object.freeze({seals: 2, repeated: false, journey: state});
  const stateBefore = JSON.stringify({state, options});
  for (let index = 0; index < 3; index++) {
    const chapter = index % 2;
    const lines = resolveChapterStory(chapter, 'outro', state);
    assert.throws(() => { lines[0].text = 'changed'; }, TypeError);
    getStoryEncounter(chapter, options); getStoryEncounterKey(chapter, options);
    getJourneyCapLines(chapter, {type: 'return'}, state);
  }
  assert.equal(JSON.stringify({state, options}), stateBefore);
  assert.equal(JSON.stringify({CHAPTERS, STORY_CHOICES, ENDINGS, STORY_ENCOUNTERS}), before);
  const inheritedJourney = Object.create({hasTicket: true, seedPhase: 'planted', plantStage: 3});
  assert.equal(getStoryEncounter(0, {journey: inheritedJourney}), STORY_ENCOUNTERS[0].lines[0]);
});
