import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FESTIVALS, FESTIVAL_SAVE_KEY, getFestival, getFestivalPuzzle,
  getCalendarDate, getActiveFestivals, getFestivalOccurrenceKey,
  createFestivalSave, validateFestivalSave, loadFestivalSave, persistFestivalSave,
  getFestivalStats, getFestivalRecord, recordFestivalComplete, recordFestivalChoice,
  recordFestivalPuzzle, unlockFestivalOutfit, isFestivalOutfitUnlocked, equipFestivalOutfit,
} from '../dist/dream-festivals.js';

const ids = date => getActiveFestivals(date).map(festival => festival.id);
const has = (id, date) => ids(date).includes(id);
const win = { gifts: 3, seals: 2, stars: 3, time: 88.6, deaths: 0 };
const halloweenDate = new Date('2026-10-28T04:00:00Z');
const fakeStorage = () => {
  const values = new Map();
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
};

test('ten authored adventures each provide two fair puzzles, three physical gifts and two epilogues', () => {
  assert.deepEqual(FESTIVALS.map(f => f.id).sort(), ['halloween','thanksgiving','christmas','newyear','spring','lantern','valentine','dragonboat','qixi','midautumn'].sort());
  const puzzleIds = new Set(), questions = new Set(), stories = new Set(), items = new Set();
  for (const festival of FESTIVALS) {
    assert.equal(getFestival(festival.id), festival);
    assert.equal(festival.gifts.length, 3);
    assert.equal(new Set(festival.gifts).size, 3);
    assert.equal(festival.puzzles.length, 2);
    assert.equal(festival.choice.options.length, 2);
    assert.notEqual(festival.choice.options[0].id, festival.choice.options[1].id);
    assert.notEqual(festival.choice.options[0].reply, festival.choice.options[1].reply);
    assert.match(festival.portrait, new RegExp(`festival-hero-${festival.id}\\.svg$`));
    assert.match(festival.npc.portrait, new RegExp(`festival-npc-${festival.id}\\.svg$`));
    for (const section of ['intro','encounters','outro']) {
      assert.ok(festival[section].length >= 2 && festival[section].length <= 3);
      for (const line of festival[section]) {
        assert.ok(['ashi','light','festival'].includes(line.speaker));
        assert.ok(line.text.length > 0 && line.text.length <= 120);
      }
    }
    for (const puzzle of festival.puzzles) {
      puzzleIds.add(puzzle.id); questions.add(puzzle.question);
      assert.equal(getFestivalPuzzle(festival.id, puzzle.sealIndex), puzzle);
      assert.ok(Number.isInteger(puzzle.answer) && puzzle.answer >= 0 && puzzle.answer < puzzle.options.length);
      assert.equal(puzzle.options.length, new Set(puzzle.options).size);
      assert.equal(puzzle.hints.length, 2);
      assert.ok(puzzle.scene && puzzle.explanation);
    }
    items.add(festival.item.id); stories.add(festival.intro[0].text);
  }
  assert.equal(puzzleIds.size, 20); assert.equal(questions.size, 20);
  assert.equal(items.size, 10); assert.equal(stories.size, 10);
  assert.equal(getFestival('__proto__'), null);
  assert.equal(getFestivalPuzzle('halloween', 2), null);
});

test('Shanghai midnight controls Halloween activation and the end of its window', () => {
  assert.equal(has('halloween', '2026-10-23T15:59:59Z'), false);
  assert.equal(has('halloween', '2026-10-23T16:00:00Z'), true);
  assert.deepEqual(ids(halloweenDate), ['halloween']);
  assert.equal(has('halloween', '2026-11-03T15:59:59Z'), true);
  assert.equal(has('halloween', '2026-11-03T16:00:00Z'), false);
  assert.equal(getCalendarDate('2026-10-23T16:00:00Z').dateKey, '2026-10-24');
});

test('Thanksgiving moves with the fourth Thursday, including a December window end', () => {
  for (const [year, first, last] of [[2024,'11-25','12-01'],[2026,'11-23','11-29'],[2027,'11-22','11-28']]) {
    assert.equal(has('thanksgiving', `${year}-${first}T00:00:00+08:00`), true);
    assert.equal(has('thanksgiving', `${year}-${last}T23:59:59+08:00`), true);
    const before = new Date(`${year}-${first}T00:00:00+08:00`); before.setTime(before.getTime() - 1);
    const after = new Date(`${year}-${last}T23:59:59+08:00`); after.setTime(after.getTime() + 1000);
    assert.equal(has('thanksgiving', before), false);
    assert.equal(has('thanksgiving', after), false);
  }
});

test('Christmas, Valentine and New Year use their explicit game windows', () => {
  for (const [id, start, end] of [
    ['christmas','2026-12-18','2026-12-27'],
    ['valentine','2026-02-10','2026-02-17'],
    ['newyear','2026-12-28','2027-01-04'],
  ]) {
    const begin = new Date(start + 'T00:00:00+08:00'), finish = new Date(end + 'T23:59:59+08:00');
    assert.equal(has(id, begin), true); assert.equal(has(id, finish), true);
    assert.equal(has(id, new Date(begin.getTime() - 1)), false);
    assert.equal(has(id, new Date(finish.getTime() + 1000)), false);
  }
});

test('overlapping holidays remain available with deterministic display priority', () => {
  assert.deepEqual(ids('2026-02-14'), ['spring','valentine']);
  assert.deepEqual(ids('2027-02-16'), ['lantern','valentine']);
  assert.equal(ids('2026-10-28')[0], 'halloween');
  assert.equal(FESTIVALS[0].id, 'halloween');
});

test('official 2026 and 2027 HKO lunar dates override differing host ICU calculations', () => {
  const cases = [
    ['2026-02-17',2026,1,1],['2026-06-19',2026,5,5],['2026-08-19',2026,7,7],['2026-09-25',2026,8,15],
    ['2027-02-01',2026,12,25],['2027-02-06',2027,1,1],['2027-02-20',2027,1,15],
    ['2027-06-09',2027,5,5],['2027-08-08',2027,7,7],['2027-09-15',2027,8,15],
  ];
  for (const [date, year, month, day] of cases) assert.deepEqual(getCalendarDate(date).lunar, {year,month,day,isLeapMonth:false,source:'hko'});
});

test('lunar windows activate only on their configured ordinary-month days', () => {
  const windows = [
    ['spring','2027-02-01','2027-02-13'],['lantern','2027-02-15','2027-02-22'],
    ['dragonboat','2027-06-07','2027-06-11'],['qixi','2027-08-06','2027-08-11'],
    ['midautumn','2027-09-12','2027-09-18'],
  ];
  for (const [id, start, end] of windows) {
    const first = new Date(start + 'T00:00:00+08:00'), last = new Date(end + 'T23:59:59+08:00');
    assert.equal(has(id, first), true, id + ' start'); assert.equal(has(id, last), true, id + ' end');
    assert.equal(has(id, new Date(first.getTime() - 1)), false, id + ' before');
    assert.equal(has(id, new Date(last.getTime() + 1000)), false, id + ' after');
  }
});

test('leap months do not duplicate festivals and unusual 2033 leap month is recognised', () => {
  assert.deepEqual(getCalendarDate('2025-07-25').lunar, {year:2025,month:6,day:1,isLeapMonth:true,source:'hko'});
  assert.equal(getCalendarDate('2028-06-25').lunar.month, 5);
  assert.equal(getCalendarDate('2028-06-25').lunar.isLeapMonth, true);
  assert.equal(has('dragonboat', '2028-06-25'), false);
  assert.equal(has('dragonboat', '2028-05-26'), true);
  assert.deepEqual(getCalendarDate('2033-12-22').lunar, {year:2033,month:11,day:1,isLeapMonth:true,source:'hko'});
  assert.equal(getCalendarDate('2036-01-27').lunar.source, 'hko');
});

test('Gregorian and lunar year boundaries keep one annual occurrence key', () => {
  assert.equal(getFestivalOccurrenceKey('newyear','2026-12-30'), 'newyear:2027');
  assert.equal(getFestivalOccurrenceKey('newyear','2027-01-02'), 'newyear:2027');
  assert.equal(getFestivalOccurrenceKey('newyear','2027-12-30'), 'newyear:2028');
  for (const date of ['2027-02-01','2027-02-06','2027-02-13']) assert.equal(getFestivalOccurrenceKey('spring',date), 'spring:2027');
  assert.equal(getFestivalOccurrenceKey('spring','2026-02-14'), 'spring:2026');
  assert.equal(getFestivalOccurrenceKey('halloween','2027-10-28'), 'halloween:2027');
});

test('invalid dates and unknown IDs safely disable activation and record keys', () => {
  for (const date of [new Date(NaN),'not-a-date',{},'1900-01-01','2201-01-01']) {
    assert.equal(getCalendarDate(date), null); assert.deepEqual(ids(date), []);
    assert.equal(getFestivalOccurrenceKey('halloween',date), null);
  }
  assert.equal(getFestivalOccurrenceKey('__proto__', halloweenDate), null);
});

test('unsupported Intl still uses embedded official dates and never invents a lunar date', () => {
  const previous = globalThis.Intl;
  try {
    globalThis.Intl = {DateTimeFormat: class { constructor() { throw new Error('unsupported'); } }};
    assert.equal(getCalendarDate('2027-02-06').lunar.day, 1);
    assert.equal(getCalendarDate('2027-02-06').lunar.source, 'hko');
    assert.equal(getCalendarDate('2040-02-06').lunar, null);
    assert.equal(getFestivalOccurrenceKey('spring','2040-02-06'), null);
    assert.deepEqual(ids('2040-10-28'), ['halloween']);
  } finally { globalThis.Intl = previous; }
});

test('native Intl Chinese calendar is the safe fallback beyond bundled anchors', () => {
  const calendar = getCalendarDate('2040-05-01');
  assert.ok(calendar.lunar === null || calendar.lunar.source === 'intl');
  if (calendar.lunar) {
    assert.ok(calendar.lunar.month >= 1 && calendar.lunar.month <= 12);
    assert.ok(calendar.lunar.day >= 1 && calendar.lunar.day <= 30);
  }
});

test('a valid completed parcel earns one permanent keepsake and outfit', () => {
  const save = createFestivalSave();
  assert.equal(getFestivalRecord(save,'halloween',halloweenDate), null);
  const result = recordFestivalComplete(save,'halloween',win,halloweenDate);
  assert.equal(result.ok, true); assert.equal(result.firstCompletion, true);
  assert.equal(result.newItem.id, 'keepsake-halloween'); assert.equal(result.newOutfit, 'halloween');
  assert.equal(result.record.bestGifts, 3); assert.equal(result.record.runs, 1);
  assert.equal(isFestivalOutfitUnlocked(save,'halloween'), true);
  assert.equal(equipFestivalOutfit(save,'halloween'), true);
  assert.equal(save.settings.selectedOutfit, 'halloween');
  const stats = getFestivalStats(save);
  assert.equal(stats.completed, 1); assert.equal(stats.gifts, 3); assert.equal(stats.stars, 3);
  assert.equal(stats.items[0].festivalId, 'halloween'); assert.equal(stats.itemCount, 1);
});

test('incomplete or malformed results cannot create a completion or any grant', () => {
  for (const change of [{gifts:2},{gifts:4},{gifts:'3'},{time:NaN},{time:-1},{deaths:-1},{deaths:0.5},{stars:4},{stars:0},{seals:1}]) {
    const save = createFestivalSave();
    assert.equal(recordFestivalComplete(save,'halloween',{...win,...change},halloweenDate).ok, false);
    assert.deepEqual(save, createFestivalSave());
  }
  const save = createFestivalSave();
  assert.equal(recordFestivalComplete(save,'unknown',win,halloweenDate).ok, false);
  assert.equal(recordFestivalComplete(save,'halloween',win,new Date(NaN)).ok, false);
  assert.equal(recordFestivalComplete(null,'halloween',win,halloweenDate).ok, false);
});

test('engine memories alias works and replays preserve independently best results', () => {
  const save = createFestivalSave();
  recordFestivalComplete(save,'christmas',{memories:3,time:100,deaths:2,stars:2},halloweenDate);
  const replay = recordFestivalComplete(save,'christmas',{...win,time:130,deaths:0},halloweenDate);
  assert.equal(replay.firstCompletion, false); assert.equal(replay.newItem, null); assert.equal(replay.newOutfit, null);
  assert.equal(replay.record.bestTime,100); assert.equal(replay.record.bestDeaths,0); assert.equal(replay.record.bestStars,3);
  recordFestivalComplete(save,'christmas',{...win,time:50,deaths:4,stars:2},halloweenDate);
  const record = getFestivalRecord(save,'christmas',halloweenDate);
  assert.equal(record.bestTime,50); assert.equal(record.bestStars,3); assert.equal(record.runs,3);
});

test('annual replay creates a fresh record while preserving permanent collection totals', () => {
  const save = createFestivalSave();
  recordFestivalComplete(save,'halloween',win,'2026-10-28');
  assert.equal(getFestivalRecord(save,'halloween','2027-10-28'), null);
  const again = recordFestivalComplete(save,'halloween',{...win,stars:2},'2027-10-28');
  assert.equal(again.firstCompletion,true); assert.equal(again.newItem,null); assert.equal(again.newOutfit,null);
  const stats = getFestivalStats(save);
  assert.equal(stats.completed,1); assert.equal(stats.annualCompletions,2); assert.equal(stats.items.length,1); assert.equal(stats.stars,3);
  assert.equal(equipFestivalOutfit(save,'halloween'),true);
});

test('a New Year playthrough across December and January updates the same story', () => {
  const save = createFestivalSave();
  recordFestivalComplete(save,'newyear',win,'2026-12-30');
  recordFestivalComplete(save,'newyear',win,'2027-01-02');
  assert.equal(Object.keys(save.records).length,1);
  assert.equal(save.records['newyear:2027'].runs,2);
});

test('epilogue choices require the matching completed occurrence and valid authored option', () => {
  const save = createFestivalSave(), choice = getFestival('halloween').choice.options[0].id;
  assert.equal(recordFestivalChoice(save,'halloween',choice,halloweenDate),false);
  recordFestivalComplete(save,'halloween',win,halloweenDate);
  assert.equal(recordFestivalChoice(save,'halloween','__proto__',halloweenDate),false);
  assert.equal(recordFestivalChoice(save,'halloween',choice,halloweenDate),true);
  assert.equal(getFestivalRecord(save,'halloween',halloweenDate).choice,choice);
  assert.equal(recordFestivalChoice(save,'halloween',choice,'2027-10-28'),false);
});

test('solved puzzle credit is per annual story and independent solves survive assisted replays', () => {
  const save = createFestivalSave();
  assert.equal(recordFestivalPuzzle(save,'halloween','christmas-0',false,halloweenDate),false);
  assert.equal(recordFestivalPuzzle(save,'halloween','halloween-0','false',halloweenDate),false);
  assert.equal(recordFestivalPuzzle(save,'halloween','halloween-0',true,halloweenDate),true);
  assert.equal(recordFestivalPuzzle(save,'halloween','halloween-0',false,halloweenDate),true);
  recordFestivalPuzzle(save,'halloween','halloween-0',true,halloweenDate);
  assert.equal(getFestivalRecord(save,'halloween',halloweenDate).puzzles['halloween-0'].assisted,false);
  assert.equal(getFestivalStats(save).riddles,1); assert.equal(getFestivalStats(save).completed,0);
  assert.equal(getFestivalRecord(save,'halloween','2027-10-28'),null);
});

test('playtime outfit grants support starlight without awarding any story keepsake', () => {
  const save = createFestivalSave();
  assert.equal(equipFestivalOutfit(save,'halloween'),false);
  assert.equal(unlockFestivalOutfit(save,'unknown'),false);
  assert.equal(unlockFestivalOutfit(save,'starlight'),true);
  assert.equal(unlockFestivalOutfit(save,'starlight'),false);
  assert.equal(unlockFestivalOutfit(save,'halloween'),true);
  assert.equal(equipFestivalOutfit(save,'starlight'),true);
  const clean = validateFestivalSave(save);
  assert.equal(clean.settings.selectedOutfit,'starlight');
  assert.deepEqual(getFestivalStats(clean).items,[]);
  assert.equal(getFestivalStats(clean).outfitCount,2);
  assert.equal(equipFestivalOutfit(clean,'auto'),true);
});

test('save validation removes poison keys, invalid flags and locked selected outfits', () => {
  const imported = JSON.parse('{"version":1,"records":{"__proto__":{"completed":true},"constructor:2026":{"completed":true},"halloween:9999":{"completed":true},"christmas:2026":{"completed":true,"bestGifts":2,"bestStars":3,"bestTime":10,"choice":"trail"},"halloween:2026":{"completed":true,"bestGifts":3,"bestStars":99,"bestTime":20,"bestDeaths":-3,"runs":999999999,"choice":"bad","puzzles":{"halloween-0":{"solved":true,"assisted":"false"},"christmas-0":{"solved":true}}}},"outfits":["unknown","starlight","starlight","__proto__"],"settings":{"selectedOutfit":"christmas"},"items":["keepsake-christmas"]}');
  const clean = validateFestivalSave(imported);
  assert.deepEqual(Object.keys(clean.records).sort(),['christmas:2026','halloween:2026']);
  assert.equal(clean.records['christmas:2026'].completed,false);
  assert.equal(clean.records['christmas:2026'].choice,null);
  assert.equal(clean.records['halloween:2026'].bestStars,3);
  assert.equal(clean.records['halloween:2026'].bestDeaths,0);
  assert.equal(clean.records['halloween:2026'].runs,999999);
  assert.equal(clean.records['halloween:2026'].choice,null);
  assert.deepEqual(Object.keys(clean.records['halloween:2026'].puzzles),['halloween-0']);
  assert.equal(clean.records['halloween:2026'].puzzles['halloween-0'].assisted,false);
  assert.deepEqual(clean.outfits,['starlight','halloween']);
  assert.equal(clean.settings.selectedOutfit,'auto');
  assert.equal(getFestivalStats(clean).items.length,1);
  assert.equal(Object.prototype.completed,undefined);
  clean.records['halloween:2026'].bestStars=1;
  assert.equal(imported.records['halloween:2026'].bestStars,99);
  assert.deepEqual(validateFestivalSave({version:2}),createFestivalSave());
  assert.deepEqual(validateFestivalSave([]),createFestivalSave());
});

test('festival storage is separate and handles corruption, size limits and unavailable storage', () => {
  const storage = fakeStorage(), save = createFestivalSave();
  storage.setItem('tougaigu.dream.v1','story-kept'); storage.setItem('tougaigu.save.v1','survivor-kept');
  recordFestivalComplete(save,'halloween',win,halloweenDate);
  assert.equal(persistFestivalSave(save,storage),true);
  assert.equal(loadFestivalSave(storage).records['halloween:2026'].completed,true);
  assert.equal(storage.getItem('tougaigu.dream.v1'),'story-kept');
  assert.equal(storage.getItem('tougaigu.save.v1'),'survivor-kept');
  storage.setItem(FESTIVAL_SAVE_KEY,'{bad json');
  assert.deepEqual(loadFestivalSave(storage),createFestivalSave());
  storage.setItem(FESTIVAL_SAVE_KEY,' '.repeat(300001));
  assert.deepEqual(loadFestivalSave(storage),createFestivalSave());
  assert.equal(persistFestivalSave(save,{setItem(){throw new Error('quota');}}),false);
  assert.deepEqual(loadFestivalSave({getItem(){throw new Error('blocked');}}),createFestivalSave());
  assert.equal(persistFestivalSave(save,null),false);
});

test('all ten stories and twenty riddles produce exact permanent collection totals', () => {
  const save = createFestivalSave();
  for (const festival of FESTIVALS) {
    for (const puzzle of festival.puzzles) recordFestivalPuzzle(save,festival.id,puzzle.id,false,halloweenDate);
    assert.equal(recordFestivalComplete(save,festival.id,win,halloweenDate).ok,true);
  }
  const stats = getFestivalStats(save);
  assert.equal(stats.completed,10); assert.equal(stats.gifts,30); assert.equal(stats.stars,30);
  assert.equal(stats.riddles,20); assert.equal(stats.itemCount,10); assert.equal(stats.outfitCount,10);
});
