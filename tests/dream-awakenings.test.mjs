import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTERS, PUZZLES, STORY_CHOICES, ENDINGS, getPuzzle } from '../dist/dream-story.js';
import { STORY_AWAKENINGS, getStoryAwakening } from '../dist/dream-awakenings.js';

// These expected answers deliberately come from the existing authored story.
// A future riddle change must also reconsider the scenery its solution reveals.
const expected = [
  ['platform-0', 'station-envelope', '信封'],
  ['platform-1', 'station-crossing', '各显神通'],
  ['greenhouse-0', 'greenhouse-willow', '一把剪刀'],
  ['greenhouse-1', 'greenhouse-sesame', '节节高'],
  ['theater-0', 'theatre-homeward', '低头思故乡'],
  ['theater-1', 'theatre-moon', '月亮'],
  ['library-0', 'library-horizon', '更上一层楼'],
  ['library-1', 'library-bookmark', '一枚书签'],
  ['coast-0', 'coast-tide', '一场空'],
  ['coast-1', 'coast-clock', '时间'],
  ['postoffice-0', 'post-windows', '所有愿意继续生活的人'],
  ['postoffice-1', 'post-dawnstamp', '明'],
];

test('all twelve main-story lamps have one distinct awakening tied to their actual riddle', () => {
  assert.equal(CHAPTERS.length, 6);
  assert.equal(STORY_AWAKENINGS.length, 12);
  assert.equal(STORY_AWAKENINGS.length, PUZZLES.length);
  for (const key of ['id', 'puzzleId', 'kind']) {
    assert.equal(new Set(STORY_AWAKENINGS.map(item => item[key])).size, 12, key);
  }
  assert.deepEqual(new Set(STORY_AWAKENINGS.map(item => item.puzzleId)), new Set(PUZZLES.map(puzzle => puzzle.id)));
  expected.forEach(([puzzleId, kind, answer], position) => {
    const chapterIndex = Math.floor(position / 2), sealIndex = position % 2;
    const item = getStoryAwakening(chapterIndex, sealIndex);
    const puzzle = getPuzzle(chapterIndex, sealIndex);
    assert.equal(item, STORY_AWAKENINGS[position]);
    assert.equal(item.id, 'awakening-' + puzzleId);
    assert.equal(item.puzzleId, puzzleId);
    assert.equal(item.kind, kind);
    assert.equal(item.chapterIndex, chapterIndex);
    assert.equal(item.sealIndex, sealIndex);
    assert.equal(puzzle.id, puzzleId);
    assert.equal(puzzle.options[puzzle.answer], answer, 'Reconsider the motif when this answer changes');
  });
});

test('both indices require exact integers in range, without coercion or chapter fallback', () => {
  const hostile = { valueOf() { throw new Error('Do not coerce'); }, toString() { throw new Error('Do not coerce'); } };
  const malformed = [undefined, null, false, true, NaN, Infinity, -Infinity, 0.5, '0', '1', {}, [], [0], hostile, Symbol('index'), 0n, new Number(0)];
  for (const chapter of [...malformed, -1, 6, 99, Number.MAX_SAFE_INTEGER]) {
    for (const seal of [0, 1]) assert.equal(getStoryAwakening(chapter, seal), null);
  }
  for (const seal of [...malformed, -1, 2, 99, Number.MAX_SAFE_INTEGER]) {
    for (let chapter = 0; chapter < 6; chapter++) assert.equal(getStoryAwakening(chapter, seal), null);
  }
  assert.equal(getStoryAwakening(), null);
  for (let chapter = 0; chapter < 6; chapter++) assert.equal(getStoryAwakening(chapter), null);
  for (const scene of ['story-0', 'halloween', 'thanksgiving', 'valentine']) {
    assert.equal(getStoryAwakening(scene, 0), null, 'Festival/scene identifiers cannot borrow a main-story motif');
  }
});

test('individual lamps can be read in either order without fabricating a lit count or persistent progress', () => {
  const before = JSON.stringify(STORY_AWAKENINGS);
  for (const chapter of [5, 0, 4, 1, 3, 2]) {
    const second = getStoryAwakening(chapter, 1);
    const first = getStoryAwakening(chapter, 0);
    assert.notEqual(first, second);
    assert.equal(first.chapterIndex, second.chapterIndex);
    assert.equal(first.sealIndex, 0);
    assert.equal(second.sealIndex, 1);
    assert.equal(getStoryAwakening(chapter, 1), second);
    assert.equal(getStoryAwakening(chapter, 0), first);
  }
  assert.equal(JSON.stringify(STORY_AWAKENINGS), before);
});

test('presentation metadata stays short, bounded and free of an identity reveal or forced ending', () => {
  const fields = ['id', 'puzzleId', 'chapterIndex', 'sealIndex', 'kind', 'title', 'caption', 'accent', 'duration'].sort();
  for (const item of STORY_AWAKENINGS) {
    assert.deepEqual(Object.keys(item).sort(), fields);
    assert.match(item.accent, /^#[0-9a-f]{6}$/);
    assert.equal(item.duration, 1.8);
    assert.ok(Array.from(item.title).length > 0 && Array.from(item.title).length <= 8, item.title);
    assert.ok(Array.from(item.caption).length > 0 && Array.from(item.caption).length <= 28, item.caption);
    assert.doesNotMatch(item.title + item.caption, /小满|女儿|我就是|结局|太阳升起|日出|复活/);
    assert.doesNotMatch(item.caption, /按[ EQ]|奖励|金币|解锁|获得道具|正确答案|谜底是/);
  }
  assert.match(getStoryAwakening(5, 1).caption, /邮票/);
  assert.match(getStoryAwakening(5, 1).caption, /日月/);
});

test('the catalog and every returned record are deeply frozen', () => {
  function assertFrozen(value) {
    assert.ok(Object.isFrozen(value));
    for (const child of Object.values(value)) if (child && typeof child === 'object') assertFrozen(child);
  }
  assertFrozen(STORY_AWAKENINGS);
  assert.throws(() => STORY_AWAKENINGS.push({}), TypeError);
  assert.throws(() => STORY_AWAKENINGS.reverse(), TypeError);
  assert.throws(() => { getStoryAwakening(0, 0).duration = 10; }, TypeError);
  assert.throws(() => { getStoryAwakening(5, 1).caption = '改写'; }, TypeError);
  assert.equal(getStoryAwakening(0, 0).puzzleId, 'platform-0');
});

test('catalog reads leave the established chapters, riddles, choices and endings untouched', () => {
  const before = JSON.stringify({ CHAPTERS, PUZZLES, STORY_CHOICES, ENDINGS });
  for (let pass = 0; pass < 3; pass++) {
    for (const puzzle of PUZZLES) assert.ok(getStoryAwakening(puzzle.chapterIndex, puzzle.sealIndex));
  }
  assert.equal(JSON.stringify({ CHAPTERS, PUZZLES, STORY_CHOICES, ENDINGS }), before);
});
