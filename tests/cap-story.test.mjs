import test from 'node:test';
import assert from 'node:assert/strict';
import { CAP_SCENES, getCapScene } from '../dist/dream-cap-story.js';
import { FESTIVALS } from '../dist/dream-festivals.js';
import {
  CHAPTERS, CAST, PUZZLES, ENDINGS, DREAM_SAVE_KEY,
  validateDreamSave, loadDreamSave, persistDreamSave, getUnlockedChapter,
  getEnding, chooseStoryReply,
} from '../dist/dream-story.js';

const charCount = text => [...text].length;
const moods = {
  ashi: new Set(['curious', 'open', 'joy', 'tender']),
  light: new Set(['peek', 'joy', 'brave', 'sleep']),
};
const feedbackSlots = { opening: 2, reopening: 1, returning: 1, memories: 3, seals: 2 };

test('every existing chapter and festival opens its own miniature scene', () => {
  assert.equal(CAP_SCENES.length, CHAPTERS.length + FESTIVALS.length);
  assert.equal(CAP_SCENES.length, 16);
  assert.equal(new Set(CAP_SCENES.map(scene => scene.id)).size, 16);
  assert.deepEqual(CAP_SCENES.map(scene => scene.motif), [
    'station', 'sprout', 'moon', 'whale', 'clock', 'dawn',
    'pumpkin', 'table', 'bell', 'firework', 'nian', 'rabbit', 'heart', 'boat', 'bridge', 'mooncake',
  ]);
  CHAPTERS.forEach((chapter, chapterIndex) => {
    const scene = getCapScene({ chapterIndex });
    assert.equal(scene.id, `story-${chapterIndex}`);
    assert.equal(scene.chapterIndex, chapterIndex);
    assert.equal(scene.festivalId, null);
    assert.notEqual(scene.title, chapter.title, 'the collection names the miniature, not the level');
  });
  for (const festival of FESTIVALS) {
    const scene = getCapScene({ chapterIndex: 5, festivalId: festival.id });
    assert.equal(scene.id, festival.id);
    assert.equal(scene.festivalId, festival.id);
    assert.equal(scene.chapterIndex, null);
    assert.equal(scene.color, festival.color);
    assert.equal(scene.accent, festival.accent);
  }
});

test('each possible cap event has a brief line and a supported expression', () => {
  for (const scene of CAP_SCENES) {
    assert.ok(charCount(scene.title) > 2 && charCount(scene.title) <= 18);
    assert.ok(charCount(scene.tagline) > 4 && charCount(scene.tagline) <= 30);
    assert.match(scene.color, /^#[0-9a-f]{6}$/i);
    assert.match(scene.accent, /^#[0-9a-f]{6}$/i);
    for (const [event, size] of Object.entries(feedbackSlots)) {
      assert.equal(scene[event].length, size, `${scene.id} ${event} must cover every event index`);
      for (const line of scene[event]) {
        assert.ok(Object.hasOwn(moods, line.speaker), `${scene.id}: ${line.speaker}`);
        assert.ok(moods[line.speaker].has(line.mood), `${scene.id}: unsupported ${line.mood}`);
        assert.equal(line.text, line.text.trim());
        assert.ok(charCount(line.text) >= 8);
        assert.ok(charCount(line.text) <= (event === 'opening' ? 26 : 30), `${scene.id}: ${line.text}`);
        assert.doesNotMatch(line.text, /[<>\n]/, 'feedback is plain, single-line text');
      }
    }
    assert.notDeepEqual(scene.opening, scene.reopening, 'reopening is a new reaction, not the tutorial again');
    assert.equal(new Set(scene.memories.map(line => line.text)).size, 3);
    assert.equal(new Set(scene.seals.map(line => line.text)).size, 2);
  }
});

test('seasonal brain scenes speak to the official host and react to the actual three gifts', () => {
  const giftWords = {
    halloween: ['薄荷糖', '糖纸', '软糖'],
    thanksgiving: ['麦穗', '汤勺', '餐巾'],
    christmas: ['手套', '玻璃球', '火柴'],
    newyear: ['齿轮', '再试一次', '铜锤'],
    spring: ['红绸', '鼓槌', '欢迎'],
    lantern: ['灯纸', '银线', '汤圆'],
    valentine: ['邮戳', '羽毛', '信封'],
    dragonboat: ['粽叶', '木桨', '五彩绳'],
    qixi: ['星河针', '云线', '羽毛'],
    midautumn: ['桂花糖', '月饼模', '圆邮票'],
  };
  for (const festival of FESTIVALS) {
    const scene = getCapScene({ festivalId: festival.id });
    assert.ok(scene.opening.some(line => line.text.includes(festival.npc.name)), festival.id);
    for (let i = 0; i < festival.gifts.length; i++) {
      const word = giftWords[festival.id][i];
      assert.ok(festival.gifts[i].includes(word), `${festival.id}: gift vocabulary matches configured order`);
      assert.ok(scene.memories[i].text.includes(word), `${festival.id}: wrong pickup feedback at ${i}`);
    }
  }
});

test('unknown selection keys cannot expose object properties or select a nonexistent chapter', () => {
  assert.equal(getCapScene().id, 'story-0');
  for (const chapterIndex of [-1, 6, 1.5, '2', NaN, Infinity, null]) {
    assert.equal(getCapScene({ chapterIndex }).id, 'story-0');
  }
  for (const festivalId of ['missing', '__proto__', 'constructor', 'story-5', 0, {}, null]) {
    assert.equal(getCapScene({ chapterIndex: 2, festivalId }).id, 'story-2');
  }
  assert.equal(getCapScene({ chapterIndex: -99, festivalId: 'halloween' }).id, 'halloween');
});

test('chapter dialogue stays compact and expresses the skull-window story across all six acts', () => {
  const motifWords = ['小火车', '小芽', '纸月亮', '小鲸', '怀表', '日出'];
  CHAPTERS.forEach((chapter, chapterIndex) => {
    assert.equal(chapter.intro.length, 3);
    assert.equal(chapter.outro.length, 3);
    assert.equal(chapter.memories.length, 3);
    const allText = [...chapter.intro, ...chapter.outro].map(line => line.text).concat(chapter.memories).join('');
    assert.ok(allText.includes(motifWords[chapterIndex]), chapter.id);
    for (const line of [...chapter.intro, ...chapter.outro]) {
      assert.ok(Object.hasOwn(CAST, line.speaker));
      assert.ok(charCount(line.text) >= 13 && charCount(line.text) <= 45, `${chapter.id}: ${line.text}`);
      if (line.mood) assert.ok(moods[line.speaker]?.has(line.mood));
    }
  });
  assert.ok(CHAPTERS[5].intro.some(line => line.speaker === 'light' && /小满.*勇气/.test(line.text)));
  assert.equal(Object.keys(ENDINGS).length, 3);
  for (const ending of Object.values(ENDINGS)) {
    assert.equal(ending.text.length, 3);
    assert.match(ending.lastLine, /明天/);
  }
});

// A real v1-shaped payload: all progress predates miniature scenes and has no new feature keys.
const legacySave = {
  version: 1,
  chapters: [
    { completed: true, bestStars: 3, bestMemories: 3, bestTime: 83, bestDeaths: 0, runs: 4 },
    { completed: true, bestStars: 2, bestMemories: 2, bestTime: 126, bestDeaths: 1, runs: 2 },
    { completed: true, bestStars: 3, bestMemories: 3, bestTime: 104, bestDeaths: 0, runs: 3 },
    { completed: true, bestStars: 1, bestMemories: 1, bestTime: 202, bestDeaths: 4, runs: 1 },
    { completed: true, bestStars: 2, bestMemories: 2, bestTime: 145, bestDeaths: 2, runs: 1 },
    { completed: true, bestStars: 3, bestMemories: 3, bestTime: 169, bestDeaths: 0, runs: 2 },
  ],
  choices: { letter: 'keep', clock: 'hold' },
  lastChapter: 5,
  settings: { sound: false, reducedMotion: true },
  discoveredEndings: ['lanterns', 'tender'],
  riddles: {
    'platform-0': { solved: true, assisted: false },
    'library-1': { solved: true, assisted: true },
    'postoffice-1': { solved: true, assisted: false },
  },
};

test('pre-upgrade saves retain every record, choice and riddle after visiting all miniature scenes', () => {
  const values = new Map([[DREAM_SAVE_KEY, JSON.stringify(legacySave)]]);
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const save = loadDreamSave(storage);
  assert.deepEqual(save, legacySave);
  for (const scene of CAP_SCENES) {
    const selected = getCapScene({ chapterIndex: scene.chapterIndex, festivalId: scene.festivalId });
    assert.equal(selected.id, scene.id);
  }
  assert.equal(getUnlockedChapter(save), 5);
  assert.equal(getEnding(save).id, 'lanterns');
  assert.equal(persistDreamSave(save, storage), true);
  assert.deepEqual(JSON.parse(values.get(DREAM_SAVE_KEY)), legacySave);
  assert.deepEqual(validateDreamSave(save), legacySave);
});

test('all previous decision combinations still select the same collected ending IDs', () => {
  for (const [letter, clock, ending] of [
    ['send', 'release', 'dawn'], ['send', 'hold', 'tender'],
    ['keep', 'release', 'tender'], ['keep', 'hold', 'lanterns'],
  ]) {
    const save = validateDreamSave(legacySave);
    assert.equal(chooseStoryReply(save, 'letter', letter), true);
    assert.equal(chooseStoryReply(save, 'clock', clock), true);
    assert.equal(getEnding(save).id, ending);
    assert.deepEqual(save.discoveredEndings, ['lanterns', 'tender']);
  }
});

test('the 32 already-shipped puzzle IDs and answer positions remain compatible', () => {
  const expected = [
    ['platform-0', 0], ['platform-1', 1], ['greenhouse-0', 2], ['greenhouse-1', 0],
    ['theater-0', 1], ['theater-1', 2], ['library-0', 0], ['library-1', 1],
    ['coast-0', 2], ['coast-1', 0], ['postoffice-0', 1], ['postoffice-1', 2],
    ['halloween-0', 1], ['halloween-1', 3], ['thanksgiving-0', 0], ['thanksgiving-1', 2],
    ['christmas-0', 2], ['christmas-1', 1], ['newyear-0', 1], ['newyear-1', 3],
    ['spring-0', 2], ['spring-1', 0], ['lantern-0', 3], ['lantern-1', 1],
    ['valentine-0', 0], ['valentine-1', 3], ['dragonboat-0', 2], ['dragonboat-1', 0],
    ['qixi-0', 1], ['qixi-1', 3], ['midautumn-0', 2], ['midautumn-1', 0],
  ];
  const puzzles = [...PUZZLES, ...FESTIVALS.flatMap(festival => festival.puzzles)];
  assert.deepEqual(puzzles.map(({ id, answer }) => [id, answer]), expected);
});
