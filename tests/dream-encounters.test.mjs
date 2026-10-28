import test from 'node:test';
import assert from 'node:assert/strict';
import { CAST, CHAPTERS, PUZZLES, STORY_CHOICES, ENDINGS } from '../dist/dream-story.js';
import { STORY_ENCOUNTERS, getStoryNPC, getStoryEncounter } from '../dist/dream-encounters.js';

const expected = [
  ['moth', '绒绒', 'station-lantern'],
  ['keeper', '归先生', 'greenhouse-can'],
  ['moth', '绒绒', 'theatre-ticket'],
  ['whale', '蓝页', 'library-book'],
  ['keeper', '归先生', 'coast-watch'],
  ['keeper', '归先生', 'post-letter'],
];

test('six main chapters meet the established cast with distinct contextual props and stable anchors', () => {
  assert.equal(STORY_ENCOUNTERS.length, CHAPTERS.length);
  assert.equal(STORY_ENCOUNTERS.length, 6);
  assert.equal(new Set(STORY_ENCOUNTERS.map(npc => npc.id)).size, 6);
  assert.equal(new Set(STORY_ENCOUNTERS.map(npc => npc.prop)).size, 6);
  expected.forEach(([speaker, name, prop], chapterIndex) => {
    const npc = getStoryNPC(chapterIndex);
    assert.equal(npc, STORY_ENCOUNTERS[chapterIndex]);
    assert.equal(npc.id, 'story-npc-' + chapterIndex);
    assert.equal(npc.chapterIndex, chapterIndex);
    assert.equal(npc.sceneId, 'story-' + chapterIndex);
    assert.equal(npc.speaker, speaker);
    assert.equal(npc.motif, speaker);
    assert.equal(npc.name, name);
    assert.equal(CAST[speaker].name, name);
    assert.equal(npc.prop, prop);
    assert.deepEqual([npc.x, npc.y], [190, 560]);
    assert.match(npc.accent, /^#[0-9a-f]{6}$/);
    for (const key of ['reward', 'choices', 'answer', 'save', 'unlock', 'ending']) assert.equal(key in npc, false);
  });
});

test('lamp counts select different first conversations and revisits still respond to changed progress', () => {
  for (let chapter = 0; chapter < 6; chapter++) {
    const npc = getStoryNPC(chapter);
    const seen = new Set();
    for (const seals of [0, 1, 2]) {
      const first = getStoryEncounter(chapter, { seals, repeated: false });
      const repeat = getStoryEncounter(chapter, { seals, repeated: true });
      assert.equal(first, npc.lines[seals]);
      assert.equal(repeat, npc.repeat[seals]);
      assert.equal(first.length, 2);
      assert.equal(repeat.length, 1);
      assert.equal(first[0].speaker, npc.speaker);
      assert.equal(repeat[0].speaker, npc.speaker);
      assert.ok(['ashi', 'light'].includes(first[1].speaker));
      seen.add(JSON.stringify(first)); seen.add(JSON.stringify(repeat));
    }
    assert.equal(seen.size, 6, 'A visit at a new lamp count must not repeat an earlier response');
    assert.equal(getStoryEncounter(chapter), npc.lines[0]);
  }
});

test('unknown chapters cannot silently borrow another character or coerce an identifier', () => {
  const hostile = { valueOf() { throw new Error('No coercion'); }, toString() { throw new Error('No coercion'); } };
  for (const index of [undefined, null, -1, 6, 1.5, NaN, Infinity, '0', '5', true, {}, [], hostile, Symbol('chapter'), 0n]) {
    assert.equal(getStoryNPC(index), null);
    assert.equal(getStoryEncounter(index, { seals: 2, repeated: true }), null);
  }
});

test('missing or malformed state stays at the opening stage instead of inventing lit lamps or repeat visits', () => {
  for (let chapter = 0; chapter < 6; chapter++) {
    const npc = getStoryNPC(chapter);
    for (const options of [undefined, null, false, true, 2, '2', [], Symbol('state')]) {
      assert.equal(getStoryEncounter(chapter, options), npc.lines[0]);
    }
    for (const seals of [undefined, null, -1, 3, 0.5, NaN, Infinity, '1', '2', true, [], {}, Symbol('lamps')]) {
      assert.equal(getStoryEncounter(chapter, { seals }), npc.lines[0]);
      assert.equal(getStoryEncounter(chapter, { seals, repeated: true }), npc.repeat[0]);
    }
    for (const repeated of [undefined, null, 1, 'true', {}, [], Symbol('repeat')]) {
      assert.equal(getStoryEncounter(chapter, { seals: 1, repeated }), npc.lines[1]);
    }
  }
});

test('all 54 lines stay short, use known voices and preserve the main-story identity reveal', () => {
  const lines = STORY_ENCOUNTERS.flatMap(npc => [...npc.lines, ...npc.repeat].flat());
  assert.equal(lines.length, 54);
  assert.equal(new Set(lines.map(line => line.text)).size, 54);
  for (const line of lines) {
    assert.ok(CAST[line.speaker], line.speaker);
    assert.ok(Array.from(line.text).length <= 45, line.text);
    assert.ok(Array.from(line.text).length >= 8, line.text);
    assert.doesNotMatch(line.text, /小满|女儿|我就是|谜底|正确答案|答案是/);
    if (line.mood) assert.ok(['open', 'joy', 'brave', 'tender'].includes(line.mood));
  }
  // The conversations discuss traversal. They do not complete poetry lines or
  // supply any of the multi-character riddle/idiom answers in the authored set.
  for (const puzzle of PUZZLES) {
    const answer = puzzle.options[puzzle.answer];
    if (Array.from(answer).length < 3) continue;
    for (const line of lines) assert.equal(line.text.includes(answer), false, answer + ' leaked into an encounter');
  }
});

test('chapter-specific opening hints teach cooperation and traversal before directing completed journeys onward', () => {
  const requiredActions = [
    [/铜踏板/, /掀盖/, /帘幕/, /站稳/],
    [/嫩芽/, /蘑菇/, /高台/, /身体/],
    [/踏台/, /移动舞台/, /身体/, /追光/],
    [/浮书/, /风廊/, /方向/, /身体/],
    [/钟摆/, /脉冲/, /归位/, /身体/],
    [/两盏灯/, /站稳/, /留着门/, /一起/],
  ];
  requiredActions.forEach((patterns, chapter) => {
    const opening = getStoryEncounter(chapter).map(line => line.text).join('');
    patterns.forEach(pattern => assert.match(opening, pattern));
    const complete = getStoryEncounter(chapter, { seals: 2 }).map(line => line.text).join('');
    assert.match(complete, /两盏|两盏月光/);
    assert.match(complete, /归位|回盖|回到头顶/);
    assert.match(complete, /身体/);
    assert.match(complete, /出口|门|往前走/);
  });
});

test('catalog, branches and individual dialogue lines are deeply frozen', () => {
  function assertFrozen(value) {
    assert.ok(Object.isFrozen(value));
    for (const child of Object.values(value)) if (child && typeof child === 'object') assertFrozen(child);
  }
  assertFrozen(STORY_ENCOUNTERS);
  assert.throws(() => STORY_ENCOUNTERS.push({}), TypeError);
  assert.throws(() => { getStoryNPC(0).x = 999; }, TypeError);
  assert.throws(() => getStoryEncounter(0).pop(), TypeError);
  assert.throws(() => { getStoryEncounter(3, { seals: 2 })[0].text = '改写'; }, TypeError);
});

test('reading dialogue does not mutate caller progress, chapter stories, choices or endings', () => {
  const before = JSON.stringify({ STORY_ENCOUNTERS, CHAPTERS, PUZZLES, STORY_CHOICES, ENDINGS });
  const states = [0, 1, 2].flatMap(seals => [false, true].map(repeated => Object.freeze({ seals, repeated })));
  for (let pass = 0; pass < 3; pass++) for (const chapter of [5, 0, 4, 1, 3, 2]) {
    for (const state of states) {
      const stateBefore = JSON.stringify(state);
      assert.ok(getStoryEncounter(chapter, state));
      assert.equal(JSON.stringify(state), stateBefore);
    }
  }
  assert.equal(JSON.stringify({ STORY_ENCOUNTERS, CHAPTERS, PUZZLES, STORY_CHOICES, ENDINGS }), before);
});
