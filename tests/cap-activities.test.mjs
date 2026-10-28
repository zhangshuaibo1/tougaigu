import test from 'node:test';
import assert from 'node:assert/strict';
import { CAP_ACTIVITIES, getCapActivity } from '../dist/dream-cap-activities.js';
import { CAP_SCENES } from '../dist/dream-cap-story.js';
import { CAST, CHAPTERS } from '../dist/dream-story.js';
import { FESTIVALS } from '../dist/dream-festivals.js';

const charCount = value => [...value].length;
const moods = {
  ashi: new Set(['curious', 'open', 'joy', 'tender']),
  light: new Set(['peek', 'joy', 'brave', 'sleep']),
};
const expectedSceneIds = [
  'story-0', 'story-1', 'story-2', 'story-3', 'story-4', 'story-5',
  'halloween', 'thanksgiving', 'christmas', 'newyear', 'spring',
  'lantern', 'valentine', 'dragonboat', 'qixi', 'midautumn',
];

test('all six chapters and ten festivals have uniquely addressed borrowing activities', () => {
  assert.equal(CAP_ACTIVITIES.length, 16);
  assert.deepEqual(CAP_ACTIVITIES.map(activity => activity.id), expectedSceneIds);
  assert.equal(new Set(CAP_ACTIVITIES.map(activity => activity.sceneId)).size, 16);
  assert.equal(new Set(CAP_ACTIVITIES.map(activity => activity.title)).size, 16);
  assert.equal(new Set(CAP_ACTIVITIES.flatMap(activity => activity.destinations.map(destination => destination.id))).size, 48);
  CHAPTERS.forEach((_, chapterIndex) => {
    const activity = getCapActivity({ chapterIndex });
    assert.equal(activity.id, `story-${chapterIndex}`);
    assert.equal(activity.chapterIndex, chapterIndex);
    assert.equal(activity.festivalId, null);
  });
  for (const festival of FESTIVALS) {
    const activity = getCapActivity({ festivalId: festival.id });
    assert.equal(activity.festivalId, festival.id);
    assert.equal(activity.chapterIndex, null);
  }
});

test('each borrowed traveler and palette belong to the matching brain miniature', () => {
  const travelerThemes = {
    station: /火车/, sprout: /芽/, moon: /月/, whale: /鲸/, clock: /表/, dawn: /太阳/,
    pumpkin: /南瓜/, table: /汤勺/, bell: /雪铃/, firework: /火星/, nian: /小年/,
    rabbit: /兔/, heart: /心/, boat: /舟/, bridge: /喜鹊|点点/, mooncake: /月饼/,
  };
  for (const activity of CAP_ACTIVITIES) {
    const scene = CAP_SCENES.find(item => item.id === activity.sceneId);
    assert.ok(scene, activity.id);
    assert.equal(activity.id, scene.id);
    for (const key of ['chapterIndex', 'festivalId', 'motif', 'color', 'accent']) {
      assert.equal(activity[key], scene[key], `${activity.id}: ${key}`);
    }
    assert.match(activity.traveler, travelerThemes[activity.motif]);
    assert.match(activity.color, /^#[0-9a-f]{6}$/i);
    assert.match(activity.accent, /^#[0-9a-f]{6}$/i);
  }
});

test('each seasonal host invites the optional activity with their established name', () => {
  for (const festival of FESTIVALS) {
    const activity = getCapActivity({ festivalId: festival.id });
    assert.ok(activity.start.text.includes(festival.npc.name), `${festival.id}: the invitation names the correct friend`);
  }
});

test('delivery instructions point at three distinct valid destinations', () => {
  for (const activity of CAP_ACTIVITIES) {
    assert.equal(activity.destinations.length, 3);
    assert.equal(activity.steps.length, 3);
    assert.deepEqual(activity.steps.map(step => step.target), [0, 1, 2]);
    assert.equal(new Set(activity.destinations.map(destination => destination.label)).size, 3);
    assert.equal(new Set(activity.steps.map(step => step.text)).size, 3);
    for (const destination of activity.destinations) {
      assert.match(destination.id, /^[a-z][a-z0-9-]+$/);
      assert.ok(destination.id.startsWith(activity.sceneId + '-'));
    }
    for (const step of activity.steps) {
      assert.ok(Number.isInteger(step.target));
      const destination = activity.destinations[step.target];
      assert.ok(destination, `${activity.id}: delivery target must exist`);
      assert.ok(step.label.includes(destination.label), `${activity.id}: visible instructions must name the target`);
    }
  }
});

test('the same three scenes can grow in any replay order without changing their identity', () => {
  const permutations = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  const before = JSON.stringify(CAP_ACTIVITIES);
  for (const activity of CAP_ACTIVITIES) {
    const expected = new Set(activity.destinations.map(destination => destination.id));
    for (const order of permutations) {
      const grown = order.map(target => {
        const step = activity.steps.find(item => item.target === target);
        assert.ok(step, `${activity.id}: every replay target has its own feedback`);
        return activity.destinations[step.target].id;
      });
      assert.deepEqual(new Set(grown), expected);
    }
  }
  assert.equal(JSON.stringify(CAP_ACTIVITIES), before);
});

test('stage labels fit compact controls and every feedback line fits one brief bubble', () => {
  for (const activity of CAP_ACTIVITIES) {
    for (const [key, max] of [['title', 12], ['traveler', 8], ['ringLabel', 5]]) {
      assert.ok(typeof activity[key] === 'string');
      assert.ok(charCount(activity[key]) >= 2 && charCount(activity[key]) <= max, `${activity.id}: ${key}`);
    }
    for (const destination of activity.destinations) {
      assert.ok(charCount(destination.label) >= 2 && charCount(destination.label) <= 6);
    }
    for (const step of activity.steps) assert.ok(charCount(step.label) <= 12);
    for (const line of [...activity.steps, activity.start, activity.wrong, activity.complete, activity.replay]) {
      assert.ok(Object.hasOwn(CAST, line.speaker));
      assert.ok(Object.hasOwn(moods, line.speaker), 'only the two protagonists narrate a borrowing activity');
      assert.ok(moods[line.speaker].has(line.mood), `${activity.id}: unsupported portrait expression`);
      assert.equal(line.text, line.text.trim());
      assert.ok(charCount(line.text) >= 8 && charCount(line.text) <= 28, `${activity.id}: ${line.text}`);
      assert.doesNotMatch(line.text, /[<>\n]/, 'bubbles are plain single-line text');
    }
  }
});

test('activities remain independent of the original collection and riddle completion', () => {
  const before = JSON.stringify(CAP_SCENES);
  for (const activity of CAP_ACTIVITIES) {
    for (const key of ['requires', 'requiredMemories', 'requiredSeals', 'puzzleId', 'giftId']) {
      assert.equal(Object.hasOwn(activity, key), false, `${activity.id}: optional borrowing has no story prerequisite`);
    }
    const narration = [...activity.steps, activity.start, activity.wrong, activity.complete, activity.replay].map(line => line.text).join('');
    assert.doesNotMatch(narration, /灯都亮了|灯全亮了|礼物齐了|已收齐|收齐三|两盏.*亮了/);
    const selected = getCapActivity({ chapterIndex: activity.chapterIndex, festivalId: activity.festivalId });
    assert.equal(selected.id, activity.id);
  }
  assert.equal(JSON.stringify(CAP_SCENES), before, 'reading activities never rewrites the already-shipped scenes');
});

test('selection prefers known festivals and safely falls back for invalid keys', () => {
  assert.equal(getCapActivity().id, 'story-0');
  assert.equal(getCapActivity({}).id, 'story-0');
  assert.equal(getCapActivity({ chapterIndex: 5 }).id, 'story-5');
  assert.equal(getCapActivity({ chapterIndex: 5, festivalId: 'halloween' }).id, 'halloween');
  for (const festivalId of ['missing', '__proto__', 'constructor', 'story-5', 0, {}, null]) {
    assert.equal(getCapActivity({ chapterIndex: 3, festivalId }).id, 'story-3');
  }
  for (const chapterIndex of [-1, 6, 1.5, '2', NaN, Infinity, null, {}]) {
    assert.equal(getCapActivity({ chapterIndex }).id, 'story-0');
    assert.equal(getCapActivity({ chapterIndex, festivalId: 'midautumn' }).id, 'midautumn');
  }
  const input = Object.freeze({ chapterIndex: 2, festivalId: 'unknown' });
  assert.equal(getCapActivity(input).id, 'story-2');
});
