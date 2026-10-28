import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  DREAM_SAVE_KEY, CHAPTERS, CAST, STORY_CHOICES, STORY_ITEMS, PUZZLES, STAMPS,
  createDreamSave, validateDreamSave, loadDreamSave, persistDreamSave,
  getUnlockedChapter, getJourneyStats, completeDreamChapter, chooseStoryReply,
  getEnding, rememberEnding, nextPendingChoice, earnedStampIds,
  getPuzzle, checkPuzzleAnswer, recordPuzzleSolve,
} from '../dist/dream-story.js';

const complete = (save, index, extra = {}) => completeDreamChapter(save, { chapterIndex: index, time: 83.4, memories: 2, deaths: 1, stars: 2, ...extra });
const finishAll = () => {
  const save = createDreamSave();
  for (let i = 0; i < 6; i++) assert.equal(complete(save, i, { memories: 3, deaths: 0, stars: 3 }).ok, true);
  return save;
};
const memoryStore = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
};

test('dream save is independent from survivor progress and from other new saves', () => {
  const storage = memoryStore();
  storage.setItem('tougaigu.save.v1', '{"bones":200,"version":1}');
  const a = createDreamSave();
  const b = createDreamSave();
  a.chapters[0].completed = true;
  a.choices.letter = 'keep';
  a.riddles['platform-0'] = { solved: true, assisted: false };
  assert.equal(b.chapters[0].completed, false);
  assert.equal(b.choices.letter, null);
  assert.deepEqual(b.riddles, {});
  assert.equal(persistDreamSave(b, storage), true);
  assert.equal(storage.getItem('tougaigu.save.v1'), '{"bones":200,"version":1}');
  assert.notEqual(DREAM_SAVE_KEY, 'tougaigu.save.v1');
});

test('chapters unlock sequentially and future completion is rejected', () => {
  const save = createDreamSave();
  assert.equal(getUnlockedChapter(save), 0);
  assert.equal(complete(save, 2).ok, false);
  assert.equal(save.chapters[2].completed, false);
  for (let i = 0; i < 6; i++) {
    assert.equal(getUnlockedChapter(save), i);
    assert.equal(complete(save, i).ok, true);
  }
  assert.equal(getUnlockedChapter(save), 5);
  assert.equal(getJourneyStats(save).completed, 6);
  for (const index of [-1, 6, 1.5, '2']) assert.equal(complete(save, index).ok, false);
});

test('replays preserve better records and previously authored story choices', () => {
  const save = createDreamSave();
  complete(save, 0, { time: 100, memories: 3, stars: 3, deaths: 0 });
  complete(save, 1);
  assert.equal(chooseStoryReply(save, 'letter', 'keep'), true);
  complete(save, 0, { time: 140, memories: 1, stars: 1, deaths: 4 });
  assert.equal(save.chapters[0].bestStars, 3);
  assert.equal(save.chapters[0].bestMemories, 3);
  assert.equal(save.chapters[0].bestTime, 100);
  assert.equal(save.chapters[0].bestDeaths, 0);
  assert.equal(save.chapters[0].runs, 2);
  assert.equal(save.choices.letter, 'keep');
  complete(save, 0, { time: 80 });
  assert.equal(save.chapters[0].bestTime, 80);
});

test('invalid results do not change progress and bounded results remain bounded', () => {
  const save = createDreamSave();
  const before = JSON.stringify(save);
  for (const invalid of [{ time: NaN }, { time: -1 }, { memories: Infinity }, { deaths: NaN }]) {
    assert.equal(complete(save, 0, invalid).ok, false);
    assert.equal(JSON.stringify(save), before);
  }
  assert.equal(complete(save, 0, { time: 999999, memories: 50, deaths: 10000, stars: 10 }).ok, true);
  assert.equal(save.chapters[0].bestTime, 7200);
  assert.equal(save.chapters[0].bestMemories, 3);
  assert.equal(save.chapters[0].bestDeaths, 999);
  assert.equal(save.chapters[0].bestStars, 3);
});

test('story replies unlock with their chapters and skipped replies remain discoverable', () => {
  const save = createDreamSave();
  assert.equal(chooseStoryReply(save, 'letter', 'send'), false);
  assert.equal(chooseStoryReply(save, '__proto__', 'send'), false);
  assert.equal(nextPendingChoice(save), null);
  complete(save, 0);
  complete(save, 1);
  assert.equal(nextPendingChoice(save), 'letter');
  assert.equal(chooseStoryReply(save, 'letter', 'wrong'), false);
  assert.equal(chooseStoryReply(save, 'letter', 'send'), true);
  assert.equal(nextPendingChoice(save), null);
  complete(save, 2);
  complete(save, 3);
  assert.equal(nextPendingChoice(save), 'clock');
  assert.equal(chooseStoryReply(save, 'clock', 'release'), true);
  assert.equal(nextPendingChoice(save), null);
});

test('the two real story decisions produce three distinct endings without duplicate collection', () => {
  const save = finishAll();
  assert.equal(getEnding(save), null);
  chooseStoryReply(save, 'letter', 'send');
  chooseStoryReply(save, 'clock', 'release');
  assert.equal(rememberEnding(save).id, 'dawn');
  assert.equal(rememberEnding(save).id, 'dawn');
  assert.deepEqual(save.discoveredEndings, ['dawn']);
  chooseStoryReply(save, 'clock', 'hold');
  assert.equal(rememberEnding(save).id, 'tender');
  chooseStoryReply(save, 'letter', 'keep');
  assert.equal(rememberEnding(save).id, 'lanterns');
  assert.deepEqual(new Set(save.discoveredEndings), new Set(['dawn', 'tender', 'lanterns']));
  chooseStoryReply(save, 'clock', 'release');
  assert.equal(getEnding(save).id, 'tender');
  assert.equal(save.discoveredEndings.length, 3);
});

test('each of six levels has two independently identified and answerable lantern puzzles', () => {
  assert.equal(PUZZLES.length, 12);
  assert.equal(new Set(PUZZLES.map(puzzle => puzzle.id)).size, 12);
  for (let chapterIndex = 0; chapterIndex < 6; chapterIndex++) {
    for (let sealIndex = 0; sealIndex < 2; sealIndex++) {
      const puzzle = getPuzzle(chapterIndex, sealIndex);
      assert.ok(puzzle);
      assert.equal(new Set(puzzle.options).size, puzzle.options.length);
      assert.equal(puzzle.hints.length, 2);
      assert.ok(puzzle.explanation.length > 30);
      assert.equal(checkPuzzleAnswer(puzzle.id, puzzle.answer), true);
      for (let answer = 0; answer < puzzle.options.length; answer++) assert.equal(checkPuzzleAnswer(puzzle.id, answer), answer === puzzle.answer);
      assert.equal(checkPuzzleAnswer(puzzle.id, String(puzzle.answer)), false);
    }
  }
  assert.equal(getPuzzle(6, 0), null);
  assert.equal(checkPuzzleAnswer('not-a-lantern', 0), false);
});

test('puzzle progress cannot unlock future chapters; an independent solve improves an assisted record', () => {
  const save = createDreamSave();
  assert.equal(recordPuzzleSolve(save, 'greenhouse-0'), false);
  assert.equal(recordPuzzleSolve(save, 'platform-0', true), true);
  assert.deepEqual(save.riddles['platform-0'], { solved: true, assisted: true });
  assert.equal(recordPuzzleSolve(save, 'platform-0', false), true);
  assert.deepEqual(save.riddles['platform-0'], { solved: true, assisted: false });
  recordPuzzleSolve(save, 'platform-0', true);
  assert.equal(save.riddles['platform-0'].assisted, false);
  assert.equal(getJourneyStats(save).riddles, 1);
  assert.equal(getUnlockedChapter(save), 0);
  assert.equal(recordPuzzleSolve(save, '__proto__'), false);
});

test('earned stamps and six story keepsakes correspond to actual completed progress', () => {
  const save = createDreamSave();
  assert.deepEqual(earnedStampIds(save), []);
  const first = complete(save, 0, { deaths: 0, memories: 3, stars: 3 });
  assert.deepEqual(new Set(first.newStamps), new Set(['first', 'gentle']));
  const repeated = complete(save, 0, { deaths: 0 });
  assert.deepEqual(repeated.newStamps, []);
  for (let i = 1; i < 6; i++) complete(save, i, { deaths: 0, memories: 3, stars: 3 });
  assert.equal(earnedStampIds(save).length, STAMPS.length);
  assert.equal(STORY_ITEMS.length, 6);
  assert.deepEqual(STORY_ITEMS.map(item => item.chapterIndex), [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(getJourneyStats(save), { completed: 6, memories: 18, stars: 18, endings: 0, riddles: 0 });
});

test('storage roundtrip preserves story, puzzle assistance, choices and endings', () => {
  const storage = memoryStore();
  const save = finishAll();
  chooseStoryReply(save, 'letter', 'send');
  chooseStoryReply(save, 'clock', 'release');
  rememberEnding(save);
  recordPuzzleSolve(save, 'postoffice-0', true);
  recordPuzzleSolve(save, 'postoffice-1', false);
  save.settings = { sound: false, reducedMotion: true };
  assert.equal(persistDreamSave(save, storage), true);
  assert.deepEqual(loadDreamSave(storage), save);
  storage.setItem(DREAM_SAVE_KEY, '{broken');
  assert.deepEqual(loadDreamSave(storage), createDreamSave());
  assert.equal(persistDreamSave(save, { setItem() { throw new Error('quota'); } }), false);
  assert.deepEqual(loadDreamSave({ getItem() { throw new Error('denied'); } }), createDreamSave());
  assert.equal(persistDreamSave(save, null), false);
});

test('untrusted imports are bounded, whitelisted and cannot skip the route or pollute prototypes', () => {
  const corrupt = JSON.parse('{"version":1,"lastChapter":999,"__proto__":{"polluted":true},"chapters":[{"completed":true,"bestStars":999,"bestMemories":999,"bestTime":-7,"bestDeaths":-6,"runs":9999999},{"completed":false},{"completed":true,"bestStars":3}],"choices":{"letter":"send","clock":"release","__proto__":{"polluted":true}},"riddles":{"platform-0":{"solved":true,"assisted":"false"},"postoffice-0":{"solved":true},"__proto__":{"polluted":true}},"settings":{"sound":"false","reducedMotion":true},"discoveredEndings":["dawn","madeup"]}');
  const clean = validateDreamSave(corrupt);
  assert.equal(clean.chapters[0].bestStars, 3);
  assert.equal(clean.chapters[0].bestMemories, 3);
  assert.equal(clean.chapters[0].bestTime, 1);
  assert.equal(clean.chapters[0].bestDeaths, 0);
  assert.equal(clean.chapters[0].runs, 999999);
  assert.equal(clean.chapters[2].completed, false);
  assert.equal(clean.lastChapter, 1);
  assert.deepEqual(clean.choices, { letter: null, clock: null });
  assert.deepEqual(clean.riddles, { 'platform-0': { solved: true, assisted: false } });
  assert.equal(clean.settings.sound, true);
  assert.equal(clean.settings.reducedMotion, true);
  assert.deepEqual(clean.discoveredEndings, []);
  assert.equal({}.polluted, undefined);
  assert.equal(Object.hasOwn(clean, '__proto__'), false);
  assert.deepEqual(validateDreamSave({ version: 2 }), createDreamSave());
  assert.deepEqual(validateDreamSave([]), createDreamSave());
});

test('authored story has complete chapter dialogues, valid speakers and local portraits', () => {
  assert.equal(CHAPTERS.length, 6);
  assert.equal(new Set(CHAPTERS.map(chapter => chapter.id)).size, 6);
  for (const chapter of CHAPTERS) {
    assert.equal(chapter.memories.length, 3);
    assert.ok(chapter.intro.length >= 3);
    assert.ok(chapter.outro.length >= 3);
    for (const line of [...chapter.intro, ...chapter.outro]) {
      assert.ok(Object.hasOwn(CAST, line.speaker));
      assert.ok(line.text.length > 12);
    }
    if (chapter.choice) assert.ok(Object.hasOwn(STORY_CHOICES, chapter.choice));
  }
  for (const speaker of Object.values(CAST)) {
    const path = fileURLToPath(new URL('../dist/' + speaker.portrait, import.meta.url));
    assert.equal(existsSync(path), true, path);
  }
});
