import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHARACTERS, UPGRADES, META_UPGRADES, ACHIEVEMENTS, SAVE_KEY,
  createDefaultSave, validateSave, loadSave, persistSave, metaCost, buyMeta,
  unlockCharacter, recordRun, getDailyKey, getDailySeed, exportSave, importSave,
} from '../dist/content.js';

const run = (overrides = {}) => ({ mode: 'standard', characterId: 'bone', time: 60, kills: 40, level: 4, score: 500, bosses: 0, won: false, seed: 42, ...overrides });
const memoryStorage = () => {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
};

test('fresh saves never share nested mutable state', () => {
  const a = createDefaultSave(); const b = createDefaultSave();
  a.meta.damage = 2; a.unlockedCharacters.push('witch'); a.history.push({});
  assert.equal(b.meta.damage, 0);
  assert.deepEqual(b.unlockedCharacters, ['bone']);
  assert.deepEqual(b.history, []);
});

test('purchases preserve wallet invariants and enforce maximum levels', () => {
  const save = createDefaultSave();
  const snapshot = exportSave(save);
  assert.equal(buyMeta(save, 'damage').ok, false);
  assert.equal(exportSave(save), snapshot);
  save.bones = 10000;
  for (let level = 0; level < 5; level++) {
    const before = save.bones; const cost = metaCost('damage', level);
    assert.equal(buyMeta(save, 'damage').ok, true);
    assert.equal(save.bones, before - cost);
  }
  const last = save.bones;
  assert.equal(buyMeta(save, 'damage').ok, false);
  assert.equal(save.bones, last);
  assert.equal(save.meta.damage, 5);
  assert.equal(buyMeta(save, '__proto__').ok, false);
});

test('heroes unlock once, with an achievement for the complete collection', () => {
  const save = createDefaultSave(); save.bones = 500;
  assert.equal(unlockCharacter(save, 'witch').ok, true);
  assert.equal(save.bones, 320);
  const result = unlockCharacter(save, 'rogue');
  assert.equal(result.ok, true);
  assert.deepEqual(result.unlockedAchievements, ['allheroes']);
  assert.equal(save.bones, 80);
  assert.equal(unlockCharacter(save, 'rogue').ok, false);
  assert.equal(save.bones, 80);
  assert.equal(save.selectedCharacter, 'bone');
});

test('short or invalid attempts grant no currency or achievement', () => {
  const save = createDefaultSave();
  assert.equal(recordRun(save, run({ time: 14, kills: 100, bosses: 1, level: 12 })).earned, 0);
  assert.equal(save.stats.runs, 0);
  assert.equal(save.bones, 0);
  assert.deepEqual(save.achievements, []);
  assert.equal(recordRun(save, run({ mode: 'evil' })).qualified, false);
  assert.equal(save.history.length, 1);
});

test('achievements and explicit run IDs are awarded only once', () => {
  const save = createDefaultSave();
  const first = recordRun(save, run({ runId: 'run-1', kills: 100, level: 10 }));
  assert.deepEqual(first.unlockedAchievements, ['first_run', 'kill100', 'level10']);
  const previous = save.bones;
  const duplicate = recordRun(save, run({ runId: 'run-1', kills: 100, level: 10 }));
  assert.equal(duplicate.earned, 0);
  assert.equal(save.bones, previous);
  const second = recordRun(save, run({ runId: 'run-2' }));
  assert.deepEqual(second.unlockedAchievements, []);
  assert.equal(save.stats.runs, 2);
  assert.equal(save.stats.kills, 140);
});

test('win achievements require a completed timed run and a boss', () => {
  const save = createDefaultSave();
  recordRun(save, run({ won: true, time: 20 }));
  assert.equal(save.stats.wins, 0);
  const result = recordRun(save, run({ won: true, time: 310, bosses: 3, kills: 200 }));
  assert.equal(save.stats.wins, 1);
  assert.ok(result.unlockedAchievements.includes('win'));
  assert.ok(result.unlockedAchievements.includes('boss1'));
  assert.ok(result.unlockedAchievements.includes('survive180'));
});

test('daily seed uses UTC, is stable for a day, and changes each day', () => {
  const morning = new Date('2026-10-28T00:00:00Z');
  const late = new Date('2026-10-28T23:59:59Z');
  assert.equal(getDailyKey(morning), '2026-10-28');
  assert.equal(getDailySeed(morning), getDailySeed(late));
  assert.notEqual(getDailySeed(late), getDailySeed('2026-10-29T00:00:00Z'));
  assert.equal(getDailyKey('2026-10-27T18:00:00-07:00'), '2026-10-28');
  assert.throws(() => getDailyKey('invalid'));
});

test('daily bests keep best score; history and daily collections are bounded', () => {
  const save = createDefaultSave();
  for (let day = 1; day <= 31; day++) {
    recordRun(save, run({ mode: 'daily', dailyKey: `2026-10-${String(day).padStart(2, '0')}`, score: day * 100 }));
  }
  assert.equal(save.history.length, 20);
  assert.equal(Object.keys(save.dailyBests).length, 30);
  assert.equal(save.dailyBests['2026-10-01'], undefined);
  recordRun(save, run({ mode: 'daily', dailyKey: '2026-10-31', score: 2 }));
  assert.equal(save.dailyBests['2026-10-31'].score, 3100);
});

test('storage errors are nonfatal and valid saves round-trip', () => {
  const storage = memoryStorage();
  const save = createDefaultSave(); save.bones = 53; save.settings.sound = false;
  assert.equal(persistSave(save, storage), true);
  assert.deepEqual(loadSave(storage), save);
  storage.setItem(SAVE_KEY, '{broken');
  assert.deepEqual(loadSave(storage), createDefaultSave());
  assert.equal(persistSave(save, { setItem() { throw new Error('quota'); } }), false);
  assert.deepEqual(loadSave({ getItem() { throw new Error('denied'); } }), createDefaultSave());
  assert.equal(persistSave(save, null), false);
  assert.deepEqual(loadSave(null), createDefaultSave());
});

test('untrusted imports are whitelisted, clamped, fresh, and pollution-safe', () => {
  const imported = importSave('{"version":1,"bones":-100,"__proto__":{"polluted":true},"meta":{"damage":900,"constructor":1},"unlockedCharacters":["rogue","rogue","fake"],"selectedCharacter":"witch","stats":{"maxLevel":900,"wins":999},"dailyBests":{"__proto__":{"polluted":true},"2026-99-99":{"score":4}},"settings":{"sound":"false"}}');
  assert.equal(imported.bones, 0);
  assert.equal(imported.meta.damage, 5);
  assert.equal(imported.stats.maxLevel, 500);
  assert.equal(imported.stats.wins, 0);
  assert.equal(imported.selectedCharacter, 'bone');
  assert.deepEqual(imported.unlockedCharacters, ['bone', 'rogue']);
  assert.deepEqual(imported.dailyBests, {});
  assert.equal(imported.settings.sound, true);
  assert.equal({}.polluted, undefined);
  assert.equal(Object.hasOwn(imported, '__proto__'), false);
  assert.throws(() => importSave('nope'));
  assert.throws(() => importSave('{"version":2}'));
  assert.throws(() => importSave('[]'));
  assert.throws(() => importSave('x'.repeat(256001)));
  const clone = validateSave(imported); clone.meta.damage = 0;
  assert.equal(imported.meta.damage, 5);
});

test('content IDs are complete and unique', () => {
  assert.equal(CHARACTERS.length, 3);
  assert.equal(UPGRADES.length, 18);
  assert.equal(META_UPGRADES.length, 5);
  assert.equal(ACHIEVEMENTS.length, 8);
  for (const values of [CHARACTERS, UPGRADES, META_UPGRADES, ACHIEVEMENTS]) {
    assert.equal(new Set(values.map((item) => item.id)).size, values.length);
  }
});
